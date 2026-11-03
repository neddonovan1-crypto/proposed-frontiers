const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../map.js'),'utf8'),markup=fs.readFileSync(require.resolve('../game.html'),'utf8'),css=fs.readFileSync(require.resolve('../game.css'),'utf8');
const between=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const territory=(id,name,cells,extra={})=>({id,name,cells,status:'Independent state',power:'',relationship:'None',sect:null,color:'#old',...extra});
function fixture(){
 const fields=new Map(),frames=[];let state;
 function element(){return {hidden:false,disabled:false,textContent:'',value:'',classList:{toggle(){}},focus(){state.focused=this;},showModal(){this.open=true;},close(){this.open=false;}};}
 const cells=Array.from({length:4},(_,i)=>({i:i+1,land:true,neighbours:[i,i+2].filter(n=>n>=1&&n<=4),node:element()}));cells.push({i:5,land:false,node:element()});
 const proposal=(land,assigned)=>{const used=new Set(assigned.flatMap(t=>t.cells)),empty=land.filter(c=>c.land&&!used.has(c.i)).map(c=>c.i);return {territories:empty.length?[territory(20,'Conference remainder',empty,{color:undefined,status:'Direct colonial administration',power:'France'})]:[],count:empty.length,territoryCount:empty.length?1:0};};
 state=vm.createContext({q(id){if(!fields.has(id))fields.set(id,element());return fields.get(id);},window:{FrontiersAutocomplete:{propose:proposal}},cells,byId:new Map(cells.map(c=>[c.i,c])),territories:[territory(1,'Player country',[1])],selected:new Set(),active:null,inspectedTerritory:null,layer:'religion',history:[],root:{dataset:{}},completionShown:false,completionDialog:element(),countryColor:i=>'#new'+i,fields,saveCount:0,renderCount:0,formOpened:0,focused:null,selectionColor:()=>state.territories.find(t=>t.id===state.active)?.color||'#draft',fillTerritoryForm(t){for(const [field,key] of [['v2-polity','name'],['v2-status','status'],['v2-sect','sect'],['v2-power','power'],['v2-relationship','relationship']])state.q(field).value=t[key];},syncNames(){},relationships(){},message(text){state.lastMessage=text;},openTerritoryWorkspace(){state.formOpened++;},hostScreen(screen){state.hostScreenName=screen;},closeResults(){},requestAnimationFrame(fn){frames.push(fn);},save(){state.saveCount++;},render(){state.renderCount++;state.renderCompletion();}});
 vm.runInContext(between('const polityDescriptions=','const statusDescriptions=')+between('const externalPowers=','const relationshipDescriptions=')+between('function allowedPowers(','function relationships()')+between('function territoryIdentityIssue(','function showResults(')+between('function draftTerritory()','function fillTerritoryForm(')+between('function snapshot()','function save()')+between('function assignSelection()','function mobileWorkspace()')+between('function canonicalCellGraph()','function chronicleInput()')+between('function validateAutocompleteProposal(','let gapIndex=')+between('function missingCells()','function focusCell(')+between("q('v2-undo').onclick=",";q('v2-reset').onclick=")+';',state);
 state.q('v2-polity').value='Syria';state.q('v2-status').value='Independent state';state.q('v2-sect').value='Sunni';state.q('v2-power').value='';state.q('v2-relationship').value='None';state.q('v2-power-field').hidden=true;state.q('v2-relationship-field').hidden=false;
 state.flush=()=>{while(frames.length)frames.shift()();};state.stateKey=()=>JSON.stringify(state.snapshot());return state;
}

test('Autocomplete keeps the exact direct-action label and no preview screen, controls or styles',()=>{
 assert.match(markup,/<button id="v2-autocomplete">Auto-Complete: Let Sykes &amp; Picot Finish<\/button>/);
 for(const text of [markup,source,css])assert.doesNotMatch(text,/v2-autocomplete-(?:dialog|preview|apply|cancel|message|map|title|summary|territories)|autocompletePreview|renderAutocompletePreview/);
 const s=fixture();s.renderCompletion();assert.equal(s.q('v2-autocomplete').disabled,false);s.territories=[territory(1,'Complete',[1,2,3,4])];s.renderCompletion();assert.equal(s.q('v2-autocomplete').disabled,true);const before=s.stateKey();s.applyAutocomplete();assert.equal(s.stateKey(),before);assert.equal(s.saveCount,0);assert.equal(s.history.length,0);
});

test('A single click fills a blank map immediately, keeps Results ready, and never opens a completion modal',()=>{
 const s=fixture();s.territories=[];s.q('v2-autocomplete').onclick();s.flush();assert.equal(s.territories.length,1);assert.deepEqual(Array.from(s.territories[0].cells),[1,2,3,4]);assert.equal(s.saveCount,1);assert.equal(s.history.length,1);assert.equal(s.q('v2-results').disabled,false);assert.equal(s.q('v2-autocomplete').disabled,true);assert.notEqual(s.completionDialog.open,true);assert.equal(s.root.dataset.screen,undefined);assert.equal(s.focused,s.q('v2-results'));
});

test('Direct completion preserves saved player arrangements and one Undo restores the prior map',()=>{
 const s=fixture(),original=s.stateKey(),saved=s.territories[0];s.q('v2-autocomplete').onclick();assert.equal(s.territories[0],saved);assert.equal(s.territories.length,2);assert.deepEqual(Array.from(s.territories[1].cells),[2,3,4]);assert.equal(s.saveCount,1);assert.equal(s.history.length,1);assert.equal(s.layer,'none');assert.ok(s.territories[1].color);
 s.q('v2-undo').onclick();assert.equal(s.stateKey(),original);assert.equal(s.history.length,0);
});

test('A new or edited draft and all remaining land commit as one operation, and one Undo restores the exact draft and form',()=>{
 for(const active of [null,1]){
  const s=fixture();s.active=active;s.selected=new Set(active?[1,2]:[2]);s.q('v2-polity').value=active?'Player country':'Syria';s.q('v2-status').value='Protectorate';s.q('v2-power').value='Persia';s.q('v2-power-field').hidden=false;s.q('v2-relationship').value='None';const original=s.stateKey();
  s.q('v2-autocomplete').onclick();assert.equal(s.saveCount,1);assert.equal(s.history.length,1);assert.equal(s.active,null);assert.equal(s.selected.size,0);const draft=s.territories.find(t=>t.name===(active?'Player country':'Syria'));assert.equal(draft.status,'Protectorate');assert.equal(draft.power,'Persia');assert.deepEqual(Array.from(draft.cells),active?[1,2]:[2]);assert.equal(s.territories.flatMap(t=>t.cells).length,4);s.flush();assert.notEqual(s.completionDialog.open,true);
  s.q('v2-undo').onclick();assert.equal(s.stateKey(),original);assert.equal(s.history.length,0);
 }
});

test('A draft covering the last gaps saves directly with no additions, one Undo, and no completion prompt',()=>{
 const s=fixture();s.selected=new Set([2,3,4]);const original=s.stateKey();s.renderCompletion();assert.equal(s.q('v2-autocomplete').disabled,false);s.applyAutocomplete();s.flush();assert.equal(s.territories.length,2);assert.equal(s.territories.find(t=>t.name==='Syria').cells.length,3);assert.equal(s.saveCount,1);assert.equal(s.history.length,1);assert.notEqual(s.completionDialog.open,true);assert.equal(s.q('v2-results').disabled,false);s.q('v2-undo').onclick();assert.equal(s.stateKey(),original);
});

test('Invalid drafts use ordinary assignment rules, remain intact, and focus a correction without invoking the planner',()=>{
 const cases=[
  s=>{s.q('v2-polity').value='Jewish National Home';s.cells[1].city='Mecca';s.selected=new Set([2]);},
  s=>{s.q('v2-polity').value='Zaydistan';s.q('v2-status').value='Imamate';s.q('v2-sect').value='Sufi';s.selected=new Set([2]);},
  s=>{s.q('v2-status').value='Autonomous territory';s.q('v2-power-field').hidden=false;s.q('v2-power').value='Missing partner';s.selected=new Set([2]);},
  s=>{s.active=1;s.q('v2-polity').value='Player country';s.selected.clear();}
 ];
 for(const setup of cases){const s=fixture();setup(s);const original=s.stateKey();let planned=false;s.window.FrontiersAutocomplete.propose=()=>{planned=true;throw Error('Planner should not run');};s.applyAutocomplete();assert.equal(s.stateKey(),original);assert.equal(s.saveCount,0);assert.equal(s.history.length,0);assert.equal(planned,false);assert.equal(s.formOpened,1);assert.ok(s.focused);assert.ok(s.lastMessage);}
});

test('Planner failure after a valid draft does not partially save, mutate history, or alter form and selection',()=>{
 for(const active of [null,1]){
  const s=fixture();s.active=active;s.selected=new Set(active?[1,2]:[2]);s.q('v2-polity').value=active?'Player country':'Syria';const original=s.stateKey();s.window.FrontiersAutocomplete.propose=(_,base)=>{assert.ok(base.some(t=>t.cells.includes(2)));throw Error('Capacity exceeded.');};s.applyAutocomplete();assert.equal(s.stateKey(),original);assert.equal(s.saveCount,0);assert.equal(s.history.length,0);assert.equal(s.renderCount,0);assert.equal(s.lastMessage,'Capacity exceeded.');
 }
});

test('Unsafe or incomplete planner output cannot mutate a map or valid pending draft',()=>{
 const cases=[()=>({territories:[territory(20,'Overlap',[1,2,3,4])]}),()=>({territories:[territory(20,'Protected',[3,4,5])]}),()=>({territories:[territory(20,'Incomplete',[3])]}),()=>({territories:[territory(1,'Duplicate ID',[3,4])]}),()=>({territories:Array.from({length:255},(_,i)=>territory(i+2,'Many'+i,[3]))})];
 for(const propose of cases){const s=fixture();s.selected=new Set([2]);const original=s.stateKey();s.window.FrontiersAutocomplete.propose=propose;s.applyAutocomplete();assert.equal(s.stateKey(),original);assert.equal(s.saveCount,0);assert.equal(s.history.length,0);assert.ok(s.lastMessage);}
});

test('An exhausted colour palette falls back after a bounded search instead of freezing',()=>{
 const s=fixture();let calls=0;s.countryColor=()=>{if(++calls>256)throw Error('Unbounded colour loop');return '#old';};s.applyAutocomplete();assert.equal(calls,256);assert.equal(s.saveCount,1);assert.match(s.territories[1].color,/^hsl\(/);assert.notEqual(s.territories[1].color,s.territories[0].color);
});

test('Manual final assignment retains its ordinary completion prompt',()=>{
 const s=fixture();s.selected=new Set([2,3,4]);assert.equal(s.assignSelection(),true);s.flush();assert.equal(s.completionDialog.open,true);assert.equal(s.saveCount,1);
});

test('Adjacent extensions preserve the existing country metadata and original cells, and Undo restores its boundaries',()=>{
 const s=fixture(),saved=territory(1,'Syria',[1],{status:'Imamate',sect:'Ibadi',power:'Persia',relationship:'Sphere of influence',color:'#456789',customNote:'Keep this'});s.territories=[saved];const original=s.stateKey();
 s.window.FrontiersAutocomplete.propose=(land)=>{assert.deepEqual(Array.from(land.find(c=>c.i===2).neighbours),[1,3]);return {territories:[territory(20,'Nejd',[4])],extensions:[{id:1,cells:[2,3],power:'France',status:'Protectorate'}]};};
 s.applyAutocomplete();assert.equal(s.saveCount,1);assert.equal(s.history.length,1);assert.deepEqual(saved.cells,[1]);const enlarged=s.territories.find(t=>t.id===1);assert.notEqual(enlarged,saved);assert.deepEqual(Array.from(enlarged.cells),[1,2,3]);const {cells:ignored,...metadata}=enlarged,{cells:originalCells,...originalMetadata}=saved;assert.deepEqual(JSON.parse(JSON.stringify(metadata)),originalMetadata);assert.equal(enlarged.status,'Imamate');assert.equal(enlarged.power,'Persia');assert.equal(enlarged.customNote,'Keep this');
 s.q('v2-undo').onclick();assert.equal(s.stateKey(),original);
});

test('Extensions reject missing targets, overlap, protected cells, disconnection and duplicate targets without changing a draft',()=>{
 const cases=[
  {territories:[],extensions:[{id:99,cells:[2,3,4]}]},
  {territories:[],extensions:[{id:1,cells:[1,2,3,4]}]},
  {territories:[],extensions:[{id:1,cells:[2,3,4,5]}]},
  {territories:[territory(20,'Other',[2,3])],extensions:[{id:1,cells:[4]}]},
  {territories:[territory(20,'Other',[2,4])],extensions:[{id:1,cells:[2,3]}]},
  {territories:[],extensions:[{id:1,cells:[2,3]},{id:1,cells:[4]}]}
 ];
 for(const proposal of cases){const s=fixture();s.territories=[territory(1,'Syria',[1])];s.active=1;s.selected=new Set([1]);s.q('v2-polity').value='Syria';const original=s.stateKey();s.window.FrontiersAutocomplete.propose=()=>proposal;s.applyAutocomplete();assert.equal(s.stateKey(),original);assert.equal(s.saveCount,0);assert.equal(s.history.length,0);assert.ok(s.lastMessage);}
});

test('Planner graph uses the same canonical merged-cell adjacency as the chronicle',()=>{
 const s=fixture();s.cells[1].absorbed=[6];s.cells[3].neighbours=[];const fragment={i:6,land:false,mergeTarget:2,neighbours:[4]};s.cells.push(fragment);s.byId.set(6,fragment);const graph=s.canonicalCellGraph();assert.deepEqual(Array.from(graph.land,c=>c.i),[1,2,3,4]);assert.ok(graph.edges.get(2).has(4));assert.ok(graph.edges.get(4).has(2));assert.equal(graph.edges.has(6),false);
});
