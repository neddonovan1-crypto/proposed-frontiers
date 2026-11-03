const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const hexes=require('../db/hexes.json'),source=fs.readFileSync(require.resolve('../map.js'),'utf8'),markup=fs.readFileSync(require.resolve('../game.html'),'utf8');
const holy=c=>['Mecca','Medina','Najaf'].includes(c.city),city=name=>hexes.find(c=>c.city===name);
const territory=(name,status='Independent state',extra={})=>({name,status,power:'',relationship:'None',sect:null,...extra});
function proposal(territories,owner=()=>1){const bytes=new Uint8Array(4000);hexes.forEach((c,i)=>bytes[c.i]=owner(c,i));return {version:3,territories,assignments:Buffer.from(bytes).toString('base64')};}
const between=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
function option(value=''){return {value,textContent:value,dataset:{},disabled:false,remove(){this.owner.options=this.owner.options.filter(o=>o!==this);}};}
function select(values){const el={options:[],current:'',append(o){o.owner=this;this.options.push(o);if(!this.current)this.current=o.value;},focus(){},get value(){return this.current;},set value(v){this.current=this.options.some(o=>o.value===v)?v:'';},get selectedOptions(){return this.options.filter(o=>o.value===this.current);}};values.forEach(v=>el.append(option(v)));return el;}
function ui(){
 const fields={'v2-polity':select([]),'v2-status':select(['Independent state','Imamate','Autonomous territory','Protectorate','Direct colonial administration','International administration','Unsettled frontier / shared rights']),'v2-power':{value:'Britain'},'v2-sect':select(['','Sunni','Shia','Ibadi']),'v2-relationship':{value:'None'},'v2-power-field':{hidden:true},'v2-relationship-field':{hidden:true},'v2-assign':{}};
 const state=vm.createContext({q:id=>fields[id]||(fields[id]={focus(){},scrollIntoView(){}}),document:{createElement:()=>option()},territories:[],selected:new Set(),active:null,inspectedTerritory:null,byId:new Map(hexes.map(c=>[c.i,c])),cells:hexes.map(c=>({...c,land:true})),Date,atob,btoa,evidenceData:{records:[]},theme:'light',evidenceId:null,layer:'none',layers:{none:{}},applyTheme(){},updateBrush(){},unpack(){return[];},ownerFor:(c,owners)=>owners.charCodeAt(c.i)||0,restoredColor:c=>c,countryColor:()=>'',push(){},render(){},save(){},selectionColor:()=> '#000',message(s){state.lastMessage=s;},relationships(){state.syncStatuses();fields['v2-power-field'].hidden=!['Protectorate','Direct colonial administration','Autonomous territory'].includes(fields['v2-status'].value);},missingCells:()=>[],window:{FrontiersChronicle:{build(){throw Error('Invalid map reached history');}}}});
 vm.runInContext(between('const polityDescriptions=','const statusDescriptions=')+between('const sectDescriptions=','const powerLabels=')+between('const externalPowers=','const relationshipDescriptions=')+between('function allowedPowers(','function relationships()')+between('function fillTerritoryForm(','function pack(')+between('function restore(','function oldToHex(')+between('function assignSelection(','function mobileWorkspace()')+between('function territoryIdentityIssue(','function showResults(')+between('function syncMapActions()','function tileFacts(')+between('function showResults()',"window.addEventListener('keydown',e=>{if(e.key==='Escape'"),state);
 for(const name of vm.runInContext('Object.keys(polityDescriptions)',state))fields['v2-polity'].append(option(name));
 state.fields=fields;return state;
}

test('Religion labels use the requested community wording, and selectable imamates have only three sects',()=>{
 const layers=JSON.parse(source.match(/const layers=(.*);\n/)[1]);
 assert.equal(layers.religion.labels[0],'Largely Sunni Muslim Communities');assert.equal(layers.religion.labels[1],'Largely Shia Muslim Communities');assert.equal(layers.religion.labels[4],'Largely Ibadi Muslim Communities');
 const sectSelect=markup.match(/<select id="v2-sect"[^>]*>(.*?)<\/select>/)[1];assert.doesNotMatch(sectSelect,/Sufi/);assert.match(sectSelect,/value="" disabled>Choose a sect/);
 assert.deepEqual([...sectSelect.matchAll(/<option(?: selected)?>([^<]+)<\/option>/g)].map(m=>m[1]),['Sunni','Shia','Ibadi']);
});

test('Mecca, Medina and Najaf disable Jewish National Home assignment and reject direct saves, for every political status',()=>{
 for(const name of ['Mecca','Medina','Najaf'])for(const status of ['Independent state','Autonomous territory','Protectorate','Direct colonial administration','International administration']){
  const s=ui();s.fields['v2-polity'].value='Jewish National Home';s.fields['v2-status'].value=status;s.selected=new Set([city(name).i]);
  s.updateAssignmentAction();assert.equal(s.fields['v2-assign'].disabled,true);assert.match(s.fields['v2-assignment-note'].textContent,/Mecca, Medina and Najaf/);assert.equal(s.fields['v2-assignment-note'].hidden,false);assert.equal(s.assignSelection(),undefined);assert.equal(s.territories.length,0);assert.match(s.lastMessage,/Mecca, Medina and Najaf/);
 }
});

test('Painting onto an existing national home and renaming an existing holy-city territory are both rejected',()=>{
 for(const name of ['Mecca','Medina','Najaf'])for(const rename of [false,true]){
  const s=ui(),saved={...territory(rename?'Hejaz':'Jewish National Home'),id:1,cells:[city(rename?name:'Jerusalem').i],color:'#000'};
  s.territories=[saved];s.active=1;s.fields['v2-polity'].value='Jewish National Home';s.selected=new Set([...saved.cells,city(name).i]);s.updateAssignmentAction();
  assert.equal(s.fields['v2-map-save'].disabled,true);assert.equal(s.assignSelection(),undefined);assert.equal(s.territories[0],saved);assert.match(s.lastMessage,/Mecca, Medina and Najaf/);
 }
});

test('The holy-city rule uses exact city hexes and does not prohibit nearby Hejaz land or Jerusalem',async()=>{
 const {proposalInput}=await import('../worker/league.mjs');
 for(const c of [city('Jerusalem'),city('Jeddah'),city('Yanbu'),hexes.find(c=>city('Mecca').neighbours.includes(c.i)&&!c.city),hexes.find(c=>city('Najaf').neighbours.includes(c.i)&&!c.city)]){
  assert.ok(c);const s=ui();s.fields['v2-polity'].value='Jewish National Home';s.selected=new Set([c.i]);s.updateAssignmentAction();assert.equal(s.fields['v2-assign'].disabled,false);assert.equal(s.assignSelection(),true);
  assert.equal(proposalInput(proposal([territory('Jewish National Home'),territory('Hejaz')],h=>h.i===c.i?1:2),hexes)[0].cells[0].i,c.i);
 }
});

test('API rejects holy-city national homes despite alias spelling or forged client metadata',async()=>{
 const {proposalInput,leagueRequest}=await import('../worker/league.mjs');
 for(const name of ['Mecca','Medina','Najaf']){
  const p=proposal([territory('  JEWISH   NATIONAL HOME  ', 'Independent state',{cells:[{i:city(name).i,city:'Jerusalem'}]}),territory('Hejaz')],c=>c.i===city(name).i?1:2);
  assert.throws(()=>proposalInput(p,hexes),/Mecca, Medina and Najaf/);
  for(const action of ['preview','submit']){const request=new Request('https://game.test/api/league',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,firstName:'Ned',proposal:p})});const response=await leagueRequest(request,{DB:{prepare(){throw Error('Invalid map reached database');}}},hexes,{ruleset:1,build(){throw Error('Invalid map reached history');}});assert.equal(response.status,400);assert.match((await response.json()).error,/Mecca, Medina and Najaf/);}
 }
});

test('Legacy Sufi saves keep land and sect metadata, demand explicit correction, and cannot produce Results',async()=>{
 const {proposalInput}=await import('../worker/league.mjs'),s=ui(),p=proposal([{...territory('Zaydistan','Imamate',{sect:'Sufi'}),id:1}]);p.active=1;s.restore({modelContent:p});
 assert.equal(s.territories[0].cells.length,hexes.length);assert.equal(s.territories[0].sect,'Sufi');assert.equal(s.fields['v2-sect'].value,'');s.showResults();assert.match(s.lastMessage,/Sunni, Shia or Ibadi/);
 s.selected=new Set(s.territories[0].cells);s.updateAssignmentAction();assert.equal(s.fields['v2-assign'].disabled,true);assert.equal(s.assignSelection(),undefined);assert.equal(s.territories[0].sect,'Sufi');assert.throws(()=>proposalInput(p,hexes),/Sunni, Shia or Ibadi/);
 s.fields['v2-sect'].value='Shia';assert.equal(s.assignSelection(),true);assert.equal(s.territories[0].sect,'Shia');assert.equal(s.territories[0].cells.length,hexes.length);assert.equal(s.territoryIdentityIssue(s.territories),'');
});

test('Several invalid legacy territories can be repaired separately without losing assignments',()=>{
 for(const holySecond of [false,true]){
  const s=ui(),p=proposal([{...territory('Zaydistan','Imamate',{sect:'Sufi'}),id:1},{...territory(holySecond?'Jewish National Home':'Oman',holySecond?'Independent state':'Imamate',{sect:holySecond?null:'Sufi'}),id:2}],c=>holy(c)?2:1);p.active=1;s.restore({modelContent:p});
  s.selected=new Set(s.territories.find(t=>t.id===1).cells);s.fields['v2-sect'].value='Shia';assert.equal(s.assignSelection(),true);assert.equal(s.territories.reduce((n,t)=>n+t.cells.length,0),hexes.length);assert.ok(s.territoryIdentityIssue(s.territories));
  const second=s.territories.find(t=>t.id===2);s.active=2;s.selected=new Set(second.cells);s.fillTerritoryForm(second);if(holySecond)s.fields['v2-polity'].value='Hejaz';else s.fields['v2-sect'].value='Ibadi';assert.equal(s.assignSelection(),true);assert.equal(s.territories.reduce((n,t)=>n+t.cells.length,0),hexes.length);assert.equal(s.territoryIdentityIssue(s.territories),'');
 }
});

test('Legacy holy-city national homes remain editable but Results reject them until corrected',()=>{
 const s=ui(),p=proposal([{...territory('Jewish National Home'),id:1}]);s.restore({modelContent:p});assert.equal(s.territories[0].cells.length,hexes.length);s.showResults();assert.match(s.lastMessage,/Mecca, Medina and Najaf/);
 s.active=1;s.selected=new Set(s.territories[0].cells.filter(i=>!holy(s.byId.get(i))));s.fillTerritoryForm(s.territories[0]);assert.equal(s.assignSelection(),true);assert.equal(s.territories[0].cells.length,hexes.length-3);assert.equal(s.territoryIdentityIssue(s.territories),'');
});

test('Iranshahr is a canonical Persian-style name without an automatic external power',async()=>{
 const {proposalInput,normalizePolityName}=await import('../worker/league.mjs'),s=ui();assert.match(markup,/<option>Iranshahr<\/option>/);assert.equal(normalizePolityName('  IRANSHAHR '),'Iranshahr');assert.equal(s.normalizePolityName(' iranshahr '),'Iranshahr');
 s.fields['v2-polity'].value='Iranshahr';s.selected=new Set([city('Basra').i]);assert.equal(s.assignSelection(),true);assert.equal(s.territories[0].power,'');const t=proposalInput(proposal([territory(' iranshahr ')]),hexes)[0];assert.equal(t.name,'Iranshahr');assert.equal(t.power,'');
});
