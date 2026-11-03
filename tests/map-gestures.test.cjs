const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../map.js'),'utf8');
function fixture(mode='pan'){
 const controls=new Map(),root={listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}};
 const map={style:{},clientHeight:820,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},setPointerCapture(){},getScreenCTM(){return {a:1,d:1,e:-state.view.x,f:-state.view.y};}},state={map,root,mode,brushWidth:10,inside:true,hoverCell:{i:7,land:true},hoverClips:[{},{}],selectionUpdates:0,active:null,layer:'none',view:{x:50,y:0,w:750},selected:new Set([7]),history:[],drag:null,spacePan:false,cells:[],territories:[],paints:0,renders:0,saves:0,updates:0};
 Object.assign(state,{Math,Map,Set,Path2D:class{},q:id=>{if(!controls.has(id))controls.set(id,{value:state.brushWidth,querySelector:()=>({getAttribute:()=>''})});return controls.get(id);},document:{createElement:()=>({getContext:()=>({isPointInPath:()=>true})})},point:e=>({x:e.clientX,y:e.clientY}),washAt:()=>null,cityHitContext:{isPointInPath:()=>state.inside},nearestHex:()=>state.hoverCell,queueSelection(){state.selectionUpdates++;},draftTerritory:()=>({}),syncNames(){},fillTerritoryForm(){},paint(){state.paints++;state.selected.add(99);},render(){state.renders++;},updateView(){state.updates++;},showMode(){},save(){state.saves++;state.savedSelection=[...state.selected];},message(){},showEvidence(){},edit(){}});
 const context=vm.createContext(state);
 vm.runInContext(source.slice(source.indexOf('function snapshot()'),source.indexOf('function save()')),context);
 vm.runInContext(source.slice(source.indexOf('function eraseHoveredHex(e)'),source.indexOf('function washAt(e)')),context);
 vm.runInContext(source.slice(source.indexOf('const touchPoints=new Map();'),source.indexOf("q('v2-cancel-overlay').onclick")),context);
 vm.runInContext(source.slice(source.indexOf("q('v2-undo').onclick="),source.indexOf("q('v2-reset').onclick=")),context);return state;
}
const event=(id,x,y,extra={})=>({pointerType:'touch',pointerId:id,clientX:x,clientY:y,isPrimary:id===1,button:0,target:{closest:()=>null},preventDefault(){},...extra});
test('A pinch zooms the map around the midpoint and stays inside the map bounds',()=>{
 const s=fixture();s.map.onpointerdown(event(1,250,350));s.map.onpointerdown(event(2,450,350));s.map.onpointermove(event(1,150,350));s.map.onpointermove(event(2,550,350));
 assert.equal(s.view.w,375);assert.equal(s.view.x,225);assert.equal(s.view.y,175);assert.equal(s.paints,0);
 s.map.onpointermove(event(1,-10000,350));assert.equal(s.view.w,280);assert.ok(s.view.x>=50&&s.view.x<=520);
 s.map.onpointermove(event(1,549,350));assert.equal(s.view.w,750);assert.equal(s.view.x,50);assert.equal(s.view.y,0);
});
test('Adding a second finger cancels the tentative paint stroke without losing earlier selections or Undo',()=>{
 const s=fixture('paint');const previous={selected:[2]};s.history.push(previous);
 s.map.onpointerdown(event(1,250,350));assert.ok(s.selected.has(99));assert.equal(s.history.length,2);
 s.map.onpointerdown(event(2,450,350));assert.deepEqual([...s.selected],[7]);assert.equal(s.history.length,1);assert.equal(s.history[0],previous);
 s.map.onpointermove(event(1,150,350));assert.equal(s.paints,1);assert.equal(s.renders,1);
 s.map.onpointerup(event(2,450,350));s.map.onpointermove(event(1,100,350));assert.equal(s.paints,1);
 s.map.onpointerup(event(1,100,350));s.map.onpointerdown(event(1,250,350));assert.equal(s.paints,2);
});
test('Cancelled multi-touch leaves the next single-finger painting gesture usable',()=>{
 const s=fixture('paint');s.map.onpointerdown(event(1,200,300));s.map.onpointerdown(event(2,400,300));s.map.onpointercancel(event(1,200,300));s.map.onpointercancel(event(2,400,300));
 assert.deepEqual([...s.selected],[7]);s.map.onpointerdown(event(1,200,300));assert.equal(s.paints,2);
});
test('Ordinary mouse painting and temporary middle-button pan retain their behavior',()=>{
 const s=fixture('paint');s.map.onpointerdown(event(1,200,300,{pointerType:'mouse'}));s.map.onpointermove(event(1,210,300,{pointerType:'mouse'}));s.map.onpointerup(event(1,210,300,{pointerType:'mouse'}));assert.equal(s.paints,2);
 s.view={x:200,y:100,w:400};s.map.onpointerdown(event(1,200,300,{pointerType:'mouse',button:1}));s.map.onpointermove(event(1,240,320,{pointerType:'mouse',button:1}));assert.equal(s.paints,2);assert.equal(s.view.x,160);assert.equal(s.view.y,80);
});
test('Trackpad pinch zooms at the pointer without painting or intercepting normal page scroll',()=>{
 const s=fixture('paint');let prevented=0;
 const wheel={clientX:350,clientY:400,deltaMode:0,deltaY:-Math.log(2)*100,ctrlKey:true,preventDefault(){prevented++;}};
 s.map.listeners.wheel(wheel);assert.equal(prevented,1);assert.ok(Math.abs(s.view.w-375)<1e-9);assert.ok(Math.abs(s.view.x-200)<1e-9);assert.equal(s.view.y,200);assert.equal(s.mode,'paint');assert.deepEqual([...s.selected],[7]);assert.equal(s.paints,0);
 const before={...s.view};s.map.listeners.wheel({...wheel,ctrlKey:false});assert.equal(prevented,1);assert.deepEqual({...s.view},before);
 s.map.listeners.wheel({...wheel,deltaY:-10000});assert.equal(s.view.w,280);
 s.map.listeners.wheel({...wheel,deltaY:10000});assert.equal(s.view.w,750);assert.equal(s.view.x,50);assert.equal(s.view.y,0);
});
test('Safari trackpad gestures zoom once when gesture and wheel events overlap',()=>{
 const s=fixture(),gesture={clientX:350,clientY:400,scale:2,preventDefault(){}};
 s.map.listeners.gesturestart(gesture);s.map.listeners.gesturechange(gesture);assert.equal(s.view.w,375);
 s.map.listeners.wheel({...gesture,ctrlKey:true,deltaY:-70,deltaMode:0});assert.equal(s.view.w,375);
 s.map.listeners.gesturechange({...gesture,scale:1});assert.equal(s.view.w,750);
 s.map.listeners.gesturechange({...gesture,scale:0});assert.equal(s.view.w,750);
 s.map.listeners.gestureend(gesture);s.map.listeners.wheel({...gesture,ctrlKey:true,deltaY:-Math.log(2)*100,deltaMode:0});assert.ok(Math.abs(s.view.w-375)<1e-9);
});

test('Right-click erases only the hovered selection hex, saves it and supports Undo without changing the Paint brush',()=>{
 const s=fixture('paint');s.selected=new Set([7,8,9]);s.territories=[{id:1,cells:[7,8,9]},{id:2,cells:[12]}];s.active=1;
 const territoryBefore=JSON.stringify(s.territories),viewBefore={...s.view};let prevented=0;
 const right=event(1,200,300,{pointerType:'mouse',button:2,preventDefault(){prevented++;}});
 s.map.onpointerdown(right);
 assert.equal(prevented,1);assert.deepEqual([...s.selected],[8,9]);assert.deepEqual(s.savedSelection,[8,9]);assert.equal(s.saves,1);assert.equal(s.selectionUpdates,1);
 assert.equal(s.history.length,1);assert.deepEqual(Array.from(s.history[0].selected),[7,8,9]);
 assert.equal(s.mode,'paint');assert.equal(s.q('v2-brush').value,10);assert.equal(s.drag,null);assert.equal(s.paints,0);assert.equal(s.active,1);assert.equal(JSON.stringify(s.territories),territoryBefore);
 s.map.onpointermove({...right,clientX:240});s.map.onpointerup(right);
 assert.deepEqual([...s.selected],[8,9]);assert.deepEqual({...s.view},viewBefore);assert.equal(s.paints,0);
 s.q('v2-undo').onclick();assert.deepEqual([...s.selected],[7,8,9]);assert.deepEqual(s.savedSelection,[7,8,9]);assert.equal(s.history.length,0);assert.equal(JSON.stringify(s.territories),territoryBefore);
});
test('Right-click cannot erase protected land, empty selection, or another committed country',()=>{
 for(const scenario of ['outside','protected','unselected','committed']){
  const s=fixture('paint');s.territories=[{id:2,cells:[8]}];
  if(scenario==='outside')s.inside=false;
  if(scenario==='protected')s.hoverCell={i:7,land:false};
  if(scenario==='unselected')s.hoverCell={i:8,land:true};
  if(scenario==='committed'){s.selected.clear();s.hoverCell={i:8,land:true};}
  const before=[...s.selected],territoryBefore=JSON.stringify(s.territories);
  s.map.onpointerdown(event(1,200,300,{pointerType:'mouse',button:2}));
  assert.deepEqual([...s.selected],before,scenario);assert.equal(JSON.stringify(s.territories),territoryBefore,scenario);
  assert.equal(s.history.length,0,scenario);assert.equal(s.saves,0,scenario);assert.equal(s.paints,0,scenario);assert.equal(s.drag,null,scenario);
 }
});
test('Right-click is ignored outside idle Paint and the game context menu is suppressed in every mode',()=>{
 for(const mode of ['paint','erase','pan']){
  const s=fixture(mode);let prevented=0;
  s.root.listeners.contextmenu({preventDefault(){prevented++;}});assert.equal(prevented,1);
  if(mode==='paint')s.spacePan=true;
  s.map.onpointerdown(event(1,200,300,{pointerType:'mouse',button:2}));
  assert.deepEqual([...s.selected],[7]);assert.equal(s.history.length,0);assert.equal(s.paints,0);assert.equal(s.drag,null);
 }
 const s=fixture('paint');s.drag={painting:true};
 s.map.onpointerdown(event(1,200,300,{pointerType:'mouse',button:2}));assert.deepEqual([...s.selected],[7]);assert.equal(s.history.length,0);
});
