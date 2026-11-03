const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {propose}=require('../autocomplete.js'),engine=require('../chronicle.js'),hexes=require('../db/hexes.json');
const source=fs.readFileSync(require.resolve('../map.js'),'utf8');
const between=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const copy=value=>JSON.parse(JSON.stringify(value));
function option(value=''){return {value,textContent:value,dataset:{},disabled:false,remove(){this.owner.options=this.owner.options.filter(o=>o!==this);}};}
function select(values){const el={options:[],current:'',append(o){o.owner=this;this.options.push(o);if(!this.current)this.current=o.value;},focus(){},get value(){return this.current;},set value(v){this.current=this.options.some(o=>o.value===v)?v:'';},get selectedOptions(){return this.options.filter(o=>o.value===this.current);}};values.forEach(v=>el.append(option(v)));return el;}
function editor(){
 const live=Array.from({length:Math.max(...hexes.flatMap(c=>[c.i,...c.absorbed||[]]))+1},(_,i)=>({i,land:false}));hexes.forEach(c=>live[c.i]={...c,land:true});
 hexes.forEach(c=>(c.absorbed||[]).forEach(i=>{if(!live[i].land)live[i].mergeTarget=c.i;}));
 const fields={'v2-polity':select([]),'v2-status':select(['Independent state','Imamate','Autonomous territory','Protectorate','Direct colonial administration','International administration','Unsettled frontier / shared rights']),'v2-power':{value:'Britain'},'v2-sect':{value:'Sunni'},'v2-relationship':{value:'None'},'v2-power-field':{hidden:true},'v2-relationship-field':{hidden:true},'v2-brush':{value:'3'}};
 const s=vm.createContext({q:id=>fields[id]||(fields[id]={focus(){}}),document:{createElement:()=>option()},territories:[],selected:new Set(),active:null,inspectedTerritory:null,history:[],completionShown:false,saveCount:0,byId:new Map(live.map(c=>[c.i,c])),cells:live,grid:new Map(),Date,atob,btoa,evidenceData:{records:[]},theme:'light',evidenceId:null,layer:'none',layers:{none:{}},applyTheme(){},updateBrush(){},pack:()=>'',unpack:()=>[],ownerFor:(c,owners)=>owners.charCodeAt(c.i)||0,restoredColor:c=>c,countryColor:()=> '#000',sectDescriptions:{Sunni:'',Shia:'',Ibadi:''},render(){},openTerritoryWorkspace(){},selectionColor:()=> '#123456',message(text){s.lastMessage=text;},window:{FrontiersAutocomplete:{propose},FrontiersStore:{save(value){s.saved=copy(value);s.saveCount++;}}},relationships(){s.syncStatuses();const status=fields['v2-status'].value;fields['v2-power-field'].hidden=!['Protectorate','Direct colonial administration','Autonomous territory'].includes(status)&&fields['v2-relationship'].value==='None';fields['v2-relationship-field'].hidden=['Protectorate','Direct colonial administration','International administration','Unsettled frontier / shared rights'].includes(status);}});
 vm.runInContext(between('const polityDescriptions=','const statusDescriptions=')+between('const externalPowers=','const relationshipDescriptions=')+between('function allowedPowers(','function relationships()')+between('function draftTerritory(','function pack(')+between('function snapshot()','function oldToHex(')+between('function assignSelection(','function mobileWorkspace()')+between('function territoryIdentityIssue(','function showResults(')+between('function canonicalCellGraph()','function chronicleInput()')+between('function validateAutocompleteProposal(','let gapIndex=')+between("q('v2-undo').onclick=",";q('v2-reset').onclick=")+';',s);
 for(const name of vm.runInContext('Object.keys(polityDescriptions)',s))fields['v2-polity'].append(option(name));
 s.fields=fields;return s;
}

test('Generated descriptive names remain editable after save and restore without rerolling the visible settlement',async()=>{
 const {proposalInput}=await import('../worker/league.mjs');
 const baseline=propose(hexes,[]).territories[0];
 const original={id:901,name:baseline.name,status:'Independent state',power:'',relationship:'None',sect:null,color:'#112233',cells:[baseline.cells[0]]};
 const additions=propose(hexes,[original]).territories.map(t=>({...t,color:'#123456'})),remainder=additions.find(t=>t.name!==original.name&&t.cells.some(i=>baseline.cells.includes(i)));
 assert.ok(remainder,'a collision must produce a distinct descriptive remainder');
 const s=editor();s.territories=[copy(original),...copy(additions)];s.active=remainder.id;s.selected=new Set(remainder.cells);s.fillTerritoryForm(remainder);
 assert.equal(s.fields['v2-polity'].value,remainder.name);assert.equal(s.territoryIdentityIssue(s.territories),'');
 s.save();const initial=proposalInput(s.saved.modelContent,hexes),initialHistory=engine.build(initial);
 const restored=editor();restored.restore(s.saved);
 assert.equal(restored.fields['v2-polity'].value,remainder.name);
 assert.equal(restored.territories.reduce((n,t)=>n+t.cells.length,0),hexes.length);
 const editing=restored.territories.find(t=>t.id===remainder.id);restored.selected=new Set(editing.cells);restored.fillTerritoryForm(editing);
 assert.equal(restored.assignSelection(),true,restored.lastMessage);
 assert.deepEqual(copy(restored.territories.find(t=>t.id===original.id)),original,'editing a generated country preserves the original saved country');
 const final=proposalInput(restored.saved.modelContent,hexes),finalHistory=engine.build(final);
 assert.equal(finalHistory.seed,initialHistory.seed,'saving the unchanged visible arrangement cannot alter its political seed');
 assert.equal(finalHistory.signature,initialHistory.signature);assert.deepEqual(engine.score(finalHistory,final),engine.score(initialHistory,initial));
 assert.ok(final.some(t=>t.name===remainder.name));
 restored.active=null;restored.syncNames();assert.ok(!restored.fields['v2-polity'].options.some(o=>o.value===remainder.name),'generated names are editable existing countries, not new arbitrary-name choices');
});

test('Exactly 255 territories survive auto-completion storage and API parsing without assignment-byte overflow',async()=>{
 const {proposalInput}=await import('../worker/league.mjs'),remaining=hexes.find(c=>c.city==='Jerusalem'),assigned=hexes.filter(c=>c.i!==remaining.i);
 const existing=Array.from({length:254},(_,i)=>({id:i+1000,name:'Saved district '+i,status:'Independent state',power:'',relationship:'None',sect:null,color:'#123456',cells:[]}));
 assigned.forEach((c,i)=>existing[i%existing.length].cells.push(c.i));
 const before=copy(existing),proposal=propose(hexes,existing);assert.deepEqual(existing,before);assert.equal(proposal.territories.length,1);
 const s=editor();s.territories=[...existing,...proposal.territories.map(t=>({...t,color:'#abcdef'}))];s.save();
 assert.equal(s.saved.modelContent.territories.length,255);
 assert.equal(atob(s.saved.modelContent.assignments).charCodeAt(remaining.i),255);
 const parsed=proposalInput(s.saved.modelContent,hexes);assert.equal(parsed.length,255);assert.equal(parsed.reduce((n,t)=>n+t.cells.length,0),hexes.length);
 const restored=editor();restored.restore(s.saved);assert.equal(restored.territories.length,255);assert.deepEqual(copy(restored.territories.find(t=>t.cells.includes(remaining.i)).cells),[remaining.i]);
 assert.throws(()=>propose(hexes,[...existing,{id:9999,name:'One more saved district',status:'Independent state',power:'',relationship:'None',sect:null,cells:[]}]),/255/);
});

test('Direct completion uses the real pending-assignment helper atomically and one Undo restores the unsaved edit',async()=>{
 const {proposalInput}=await import('../worker/league.mjs'),s=editor();
 const original={id:901,name:'Syria',status:'Independent state',power:'',relationship:'None',sect:null,color:'#123456',cells:[hexes.find(c=>c.city==='Damascus').i]},other={...original,id:902,name:'Palestine',cells:[hexes.find(c=>c.city==='Jerusalem').i],color:'#abcdef'};
 s.territories=[copy(original),copy(other)];s.active=original.id;s.selected=new Set([...original.cells,hexes.find(c=>c.city==='Aleppo').i]);
 s.fillTerritoryForm({...original,status:'Protectorate',power:'France'});s.layer='religion';const before=copy(s.snapshot());
 const candidate=s.prepareAssignment();assert.equal(candidate.error,undefined);assert.deepEqual(copy(s.snapshot()),before);
 s.window.FrontiersAutocomplete.propose=()=>{throw Error('Planner unavailable');};s.applyAutocomplete();
 assert.deepEqual(copy(s.snapshot()),before);assert.equal(s.history.length,0);assert.equal(s.saveCount,0);assert.match(s.lastMessage,/Planner unavailable/);
 s.window.FrontiersAutocomplete.propose=propose;s.applyAutocomplete();
 assert.equal(s.history.length,1);assert.equal(s.saveCount,1);assert.equal(s.selected.size,0);assert.equal(s.active,null);
 assert.deepEqual(copy(s.history[0]),before);assert.deepEqual(copy(s.territories.find(t=>t.id===other.id)),other);
 assert.equal(s.territories.find(t=>t.id===original.id).power,'France');assert.equal(s.territories.find(t=>t.id===original.id).status,'Protectorate');
 assert.equal(proposalInput(s.saved.modelContent,hexes).reduce((n,t)=>n+t.cells.length,0),hexes.length);
 s.q('v2-undo').onclick();assert.equal(s.history.length,0);assert.deepEqual(copy(s.snapshot()),before,'Undo restores saved countries, pending selection, edited form, active country and overlay together');
 assert.equal(s.assignSelection(),true);assert.equal(s.territories.length,2,'normal Save still commits only the pending territory');assert.equal(s.territories.find(t=>t.id===original.id).power,'France');assert.equal(s.history.length,1);
});

test('An invalid holy-city draft is rejected by direct completion before the planner or saved state changes',()=>{
 for(const city of ['Mecca','Medina','Najaf']){
  const s=editor();s.selected=new Set([hexes.find(c=>c.city===city).i]);s.fields['v2-polity'].value='Jewish National Home';s.relationships();
  const before=copy(s.snapshot());s.window.FrontiersAutocomplete.propose=()=>{throw Error('Invalid draft reached planner');};s.applyAutocomplete();
  assert.match(s.lastMessage,/Mecca, Medina and Najaf/);assert.deepEqual(copy(s.snapshot()),before);assert.equal(s.history.length,0);assert.equal(s.saveCount,0);
 }
});

test('A real-map draft, adjacent extensions and new states preserve player arrangements and undo together',async()=>{
 const {proposalInput}=await import('../worker/league.mjs'),s=editor(),at=name=>hexes.find(c=>c.city===name).i;
 const originals=[
  {id:701,name:'Syria',status:'Imamate',sect:'Shia',power:'Persia',relationship:'Treaty association',color:'#123456',cells:[at('Damascus')]},
  {id:702,name:'Transjordan',status:'Independent state',sect:null,power:'',relationship:'None',color:'#abcdef',cells:[at('Aqaba')]}
 ];
 s.territories=copy(originals);const savedReferences=[...s.territories];
 s.selected=new Set([at('Basra')]);s.fillTerritoryForm({name:'Iranshahr',status:'Independent state',sect:null,power:'',relationship:'None'});s.layer='ethnicity';
 const before=copy(s.snapshot()),candidate=s.prepareAssignment(),graph=s.canonicalCellGraph();
 const proposal=propose(graph.land.map(c=>({...c,neighbours:[...graph.edges.get(c.i)]})),candidate.territories);
 assert.deepEqual(proposal.extensions.map(e=>e.id).sort(),[701,702]);assert.ok(proposal.territories.length>0);assert.deepEqual(copy(s.snapshot()),before);
 s.applyAutocomplete();assert.equal(s.saveCount,1);assert.equal(s.history.length,1);assert.ok(s.territories.some(t=>t.name==='Iranshahr'&&t.cells.includes(at('Basra'))));
 for(const original of originals){
  const extended=s.territories.find(t=>t.id===original.id),{cells:oldCells,...oldMetadata}=original,{cells:nowCells,...newMetadata}=copy(extended);
  assert.deepEqual(newMetadata,oldMetadata);assert.ok(nowCells.length>oldCells.length);assert.ok(oldCells.every(i=>nowCells.includes(i)));
  const allowed=new Set(nowCells),seen=new Set(oldCells),queue=[...oldCells];
  for(let j=0;j<queue.length;j++)for(const i of graph.edges.get(queue[j])||[])if(allowed.has(i)&&!seen.has(i)){seen.add(i);queue.push(i);}
  assert.equal(seen.size,nowCells.length,'an extension stays connected to the player’s original country');
 }
 assert.deepEqual(copy(savedReferences),originals,'the original objects retained by the undo snapshot are never mutated');
 assert.equal(new Set(s.territories.flatMap(t=>t.cells)).size,hexes.length);assert.equal(proposalInput(s.saved.modelContent,hexes).reduce((n,t)=>n+t.cells.length,0),hexes.length);
 s.q('v2-undo').onclick();assert.deepEqual(copy(s.snapshot()),before);assert.equal(s.history.length,0);
});
