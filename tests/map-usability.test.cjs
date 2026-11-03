const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../map.js'),'utf8');
test('New territory colours contrast with the nearest assigned land and keep existing colours',()=>{
 const context={territories:[{id:1,color:'#dfac36',cells:[2]}],selected:new Set([1]),byId:new Map([[1,{x:0,y:0}],[2,{x:15,y:0}]]),active:null};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('const palette='),source.indexOf('function draftTerritory()')),context);
 assert.notEqual(vm.runInContext('availableColor()',context),'#dfac36');assert.ok(vm.runInContext("colorDistance(availableColor(),'#dfac36')>=colorDistance(palette[0],'#dfac36')",context));
 assert.ok(vm.runInContext("colorDistance('hsl(0 52% 54%)','hsl(180 52% 54%)')>150",context));
 context.active=1;assert.equal(vm.runInContext('selectionColor()',context),'#dfac36');
});
test('Tile summary returns all five overlays without choosing an overlay',()=>{
 const context={window:{FrontiersMapData:{environment:{1:[[0,0,0,100],[0,100,0,0],[0,0,100,0],[0,100,0,0,0]]},ethnicity:{1:[0,0,100,0,0,0,0]},railwayCells:{1:{railways:['route']}}}},markedPorts:new Set(['Basra'])};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('const layers='),source.indexOf('const evidenceData='))+source.slice(source.indexOf('function tileFacts('),source.indexOf('function inspectTile(')),context);
 const facts=vm.runInContext("tileFacts({i:1,city:'Basra'})",context);assert.equal(facts.length,6);assert.match(facts[0][1],/Kurdish/);assert.match(facts[1][1],/Levant/);assert.match(facts[2][1],/Shia/);assert.match(facts[3][1],/Farming/);assert.match(facts[4][1],/Irrigation/);assert.match(facts[5][1],/Port.*railway/);
});
test('Starting a new territory leaves saved countries untouched and exits editing',()=>{
 const countries=[{id:1,name:'Syria',cells:[1,2]}],context={selected:new Set([1,2,3]),active:1,inspectedTerritory:1,layer:'religion',territories:countries,push(){},render(){},setMode(m){context.mode=m;},save(){},message(){}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function startNewTerritory()'),source.indexOf('function tileFacts('))+'startNewTerritory();',context);
 assert.equal(context.active,null);assert.equal(context.inspectedTerritory,null);assert.equal(context.selected.size,0);assert.equal(context.mode,'paint');assert.equal(context.layer,'none');assert.deepEqual(countries,[{id:1,name:'Syria',cells:[1,2]}]);
});
test('Pan inspection selects the country for Paint without resetting brush or same-country drafts',()=>{
 const country={id:7,name:'Syria',cells:[1,2]},elements=new Map();
 const q=id=>{if(!elements.has(id))elements.set(id,{replaceChildren(){}});return elements.get(id);};
 let edits=0;
 const context={q,territories:[country],mode:'pan',active:null,inspectedTerritory:null,layer:'religion',selected:new Set(),brushWidth:3,syncMapActions(){},tileFacts(){return[];},territoryLabel:t=>t.name,safeText:t=>t,message(){},render(){},setMode(m){context.mode=m;},edit(t){edits++;context.active=t.id;context.selected=new Set(t.cells);}};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('function inspectTile('),source.indexOf("q('v2-tile-close')"))+source.slice(source.indexOf('function chooseMode('),source.indexOf("['paint','erase','pan'].forEach(m=>q('v2-'+m).onclick")),context);
 vm.runInContext('inspectTile({i:1,land:true});chooseMode("paint");',context);
 assert.equal(context.active,7);assert.deepEqual([...context.selected],[1,2]);assert.equal(edits,1);assert.equal(context.layer,'none');assert.equal(context.brushWidth,3);
 context.mode='pan';context.selected.add(3);
 vm.runInContext('inspectTile({i:2,land:true});chooseMode("paint");',context);
 assert.equal(edits,1);assert.deepEqual([...context.selected],[1,2,3]);
 for(const cell of ['{i:99,land:true}','null']){
  context.active=null;context.mode='pan';context.selected=new Set();
  vm.runInContext('inspectTile({i:1,land:true});inspectTile('+cell+');chooseMode("paint");',context);
  assert.equal(context.active,null);assert.equal(edits,1);
 }
 context.mode='pan';context.active=null;
 vm.runInContext('inspectTile({i:1,land:true});',context);q('v2-tile-edit').onclick();
 assert.equal(edits,2);assert.equal(context.mode,'paint');assert.equal(context.inspectedTerritory,null);
});
