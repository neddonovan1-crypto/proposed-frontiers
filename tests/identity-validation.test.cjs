const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const hexes=require('../db/hexes.json'),mapSource=fs.readFileSync(require.resolve('../map.js'),'utf8');
const statusList=['Independent state','Imamate','Autonomous territory','Protectorate','Direct colonial administration','International administration','Unsettled frontier / shared rights'];
const restrictions={'Jewish National Home':['Independent state','Autonomous territory','Protectorate','Direct colonial administration','International administration'],'International City':['International administration'],'Free Port':['International administration'],'Shared Grazing Territory':['Unsettled frontier / shared rights','Direct colonial administration'],'Arab Federation':['Independent state','Autonomous territory','Imamate','Protectorate'],'Zaydistan':['Imamate'],'Hellenic Anatolia':['Independent state','Autonomous territory','Protectorate','Direct colonial administration','International administration','Unsettled frontier / shared rights']};
const territory=(name,status='Independent state',extra={})=>({name,status,relationship:status==='Autonomous territory'?'Treaty association':'None',power:['Autonomous territory','Protectorate','Direct colonial administration'].includes(status)?'Britain':'',sect:status==='Imamate'?'Shia':null,...extra});
function proposal(territories,owner=c=>1){const bytes=new Uint8Array(4000);hexes.forEach((c,i)=>bytes[c.i]=owner(c,i));return {version:3,territories,assignments:Buffer.from(bytes).toString('base64')};}
function presetProposal(t){return /jewish\s+national\s+home/i.test(t.name)?proposal([t,territory('Hejaz')],c=>['Mecca','Medina','Najaf'].includes(c.city)?2:1):proposal([t]);}
const between=(a,b)=>mapSource.slice(mapSource.indexOf(a),mapSource.indexOf(b,mapSource.indexOf(a)));
function select(values){const el={options:[],current:'',append(o){o.owner=this;this.options.push(o);if(!this.current)this.current=o.value;},focus(){},get value(){return this.current;},set value(v){this.current=this.options.some(o=>o.value===v)?v:'';},get selectedOptions(){return this.options.filter(o=>o.value===this.current);}};for(const value of values)el.append(option(value));return el;}
function option(value=''){return {value,textContent:value,dataset:{},disabled:false,remove(){this.owner.options=this.owner.options.filter(o=>o!==this);if(this.owner.current===this.value)this.owner.current=this.owner.options[0]?.value||'';}};}
function ui(){
 const fields={'v2-polity':select([]),'v2-status':select(statusList),'v2-power':{value:'Britain'},'v2-sect':{value:'Sunni'},'v2-relationship':{value:'None'},'v2-power-field':{hidden:true},'v2-relationship-field':{hidden:true},'v2-assign':{}};
 const context=vm.createContext({q:id=>fields[id]||(fields[id]={focus(){}}),document:{createElement:()=>option()},territories:[],selected:new Set(),active:null,inspectedTerritory:null,byId:new Map(hexes.map(c=>[c.i,c])),cells:hexes.map(c=>({...c,land:true})),Date,atob,btoa,evidenceData:{records:[]},theme:'light',evidenceId:null,layer:'none',layers:{none:{}},applyTheme(){},updateBrush(){},unpack(){return[];},ownerFor:(c,owners)=>owners.charCodeAt(c.i)||0,restoredColor:c=>c,countryColor:()=>'',sectDescriptions:{Sunni:'',Shia:'',Ibadi:''},push(){},render(){},save(){},selectionColor:()=> '#000',message(s){context.lastMessage=s;},relationships(){context.syncStatuses();fields['v2-power-field'].hidden=!['Protectorate','Direct colonial administration','Autonomous territory'].includes(fields['v2-status'].value);}});
 vm.runInContext(between('const polityDescriptions=','const statusDescriptions=')+between("const externalPowers=",'const relationshipDescriptions=')+between('function allowedPowers(','function relationships()')+between('function fillTerritoryForm(', 'function pack(')+between('function restore(', 'function oldToHex(')+between('function assignSelection(', 'function mobileWorkspace()')+between('function territoryIdentityIssue(', 'function showResults(')+between('function syncMapActions()', 'function tileFacts('),context);
 for(const name of vm.runInContext('Object.keys(polityDescriptions)',context))fields['v2-polity'].append(option(name));
 context.fields=fields;return context;
}

test('Every special preset retains its status restrictions across casing and whitespace',async()=>{
 const {proposalInput}=await import('../worker/league.mjs');let checked=0;
 for(const [name,allowed] of Object.entries(restrictions))for(const status of statusList)for(const alias of [name,`  ${name.toLowerCase().replaceAll(' ','   ')}  `,name.toUpperCase()]){
  const run=()=>proposalInput(presetProposal(territory(alias,status)),hexes);
  if(allowed.includes(status))assert.equal(run()[0].name,name);else assert.throws(run,/assignments need to be checked/);checked++;
 }
 assert.equal(checked,147);
});
test('Preset aliases and treaty partner names normalize, while legitimate legacy custom spelling survives',async()=>{
 const {proposalInput,normalizePolityName}=await import('../worker/league.mjs');
 assert.equal(normalizePolityName('  IMAMATE   OF IRAQ '),'Zaydistan');assert.equal(normalizePolityName('jerusalem international city'),'International City');
 assert.equal(normalizePolityName('  League of Al-Qamar  '),'League of Al-Qamar');
 const p=proposal([territory('  turkey '),territory('armenia','Autonomous territory',{power:'  TURKEY '})],(_,i)=>i%2+1);
 const ts=proposalInput(p,hexes);assert.equal(ts[0].name,'Turkey');assert.equal(ts[1].power,'Turkey');
 p.territories[0].name='League of Al-Qamar';p.territories[1].power=' league  OF al-qamar ';assert.equal(proposalInput(p,hexes)[1].power,'League of Al-Qamar');
 p.territories[0]=territory('arab federation','Protectorate',{power:'  BRITAIN '});p.territories[1].power='ARAB  FEDERATION';assert.equal(proposalInput(p,hexes)[0].power,'Britain');assert.equal(proposalInput(p,hexes)[1].power,'Arab Federation');
});
test('Hellenic Anatolia and Greek protection are accepted for colonies and protectorates',async()=>{
 const {proposalInput}=await import('../worker/league.mjs'),smyrna=hexes.find(c=>c.city==='Smyrna');
 assert.ok(smyrna.anatolia);
 for(const status of ['Protectorate','Direct colonial administration']){
  const p=proposal([territory('  HELLENIC   ANATOLIA  ',status,{power:' greece '}),territory('Turkey')],c=>c.i===smyrna.i?1:2);
  const ts=proposalInput(p,hexes);
  assert.equal(ts[0].name,'Hellenic Anatolia');assert.equal(ts[0].power,'Greece');assert.equal(ts[0].cells[0].i,smyrna.i);
 }
 assert.throws(()=>proposalInput(proposal([territory('Hellenic Anatolia','Independent state',{power:'Greece',relationship:'Treaty association'})]),hexes),/valid external relationship/);
 const u=ui();assert.ok(u.fields['v2-polity'].options.some(o=>o.value==='Hellenic Anatolia'));
 assert.ok(u.allowedPowers('Protectorate').includes('Greece'));
 assert.ok(u.allowedPowers('Direct colonial administration').includes('Greece'));
 assert.ok(!u.allowedPowers('Independent state').includes('Greece'));
});
test('Duplicate identity spellings cannot create extra preset territories or ambiguous legacy treaty partners',async()=>{
 const {proposalInput}=await import('../worker/league.mjs');
 for(const names of [['Turkey','  TURKEY '],['Jewish National Home','jewish  national home'],['League of Al-Qamar','league  OF al-qamar']])assert.throws(()=>proposalInput(proposal(names.map(name=>territory(name)),(_,i)=>i%2+1),hexes),/assignments need to be checked/);
 for(const name of ['__proto__','constructor'])assert.equal(proposalInput(proposal([territory(name)]),hexes)[0].name,name);
});
test('A Free Port needs a marked port; a coastal or inland hex alone does not qualify',async()=>{
 const {proposalInput}=await import('../worker/league.mjs'),free=territory('FREE   PORT','International administration');
 for(const city of ['Angora','Jerusalem','Medina']){const cell=hexes.find(c=>c.city===city);assert.ok(cell);assert.throws(()=>proposalInput(proposal([free,territory('Syria')],c=>c.i===cell.i?1:2),hexes),/Free Port must include a marked port/);}
 for(const cell of hexes.filter(c=>c.port)){const result=proposalInput(proposal([free,territory('Syria')],c=>c.i===cell.i?1:2),hexes);assert.equal(result[0].cells.length,1);assert.ok(result[0].cells[0].port);}
});
test('New UI assignments are preset-only, with restrictions identical to the API',async()=>{
 const {proposalInput,normalizePolityName}=await import('../worker/league.mjs'),u=ui();
 assert.ok(!fs.readFileSync(require.resolve('../game.html'),'utf8').includes('v2-custom'));assert.ok(!mapSource.includes('v2-custom'));
 for(const name of Object.keys(restrictions))for(const status of statusList){u.active=null;u.territories=[];u.selected=new Set(hexes.filter(c=>name!=='Jewish National Home'||!['Mecca','Medina','Najaf'].includes(c.city)).map(c=>c.i));u.fields['v2-polity'].value=name;u.fields['v2-status'].value=status;assert.equal(u.assignSelection(),true);const saved=u.territories[0];assert.ok(restrictions[name].includes(saved.status));assert.equal(proposalInput(presetProposal(saved),hexes)[0].name,saved.name);}
 for(const name of ['  TURKEY','jewish  national home','League of Al-Qamar'])assert.equal(u.normalizePolityName(name),normalizePolityName(name));
 u.active=null;u.territories=[];u.selected=new Set(hexes.map(c=>c.i));u.fields['v2-polity'].append(option('Invented New Empire'));u.fields['v2-polity'].value='Invented New Empire';assert.equal(u.assignSelection(),undefined);assert.match(u.lastMessage,/Choose an available territory name/);
});
test('UI blocks inland Free Port assignment and removing its last port through a transfer',()=>{
 const u=ui(),port=hexes.find(c=>c.city==='Jeddah'),inland=hexes.find(c=>c.city==='Medina');
 u.fields['v2-polity'].value='Free Port';u.selected=new Set([inland.i]);u.updateAssignmentAction();assert.equal(u.fields['v2-assign'].disabled,true);assert.match(u.fields['v2-assign'].title,/marked port/);assert.equal(u.fields['v2-assignment-note'].hidden,false);assert.match(u.fields['v2-assignment-note'].textContent,/marked port/);assert.equal(u.assignSelection(),undefined);assert.match(u.lastMessage,/Free Port must include/);
 u.selected.add(port.i);u.updateAssignmentAction();assert.equal(u.fields['v2-assign'].disabled,false);assert.equal(u.assignSelection(),true);
 const saved=u.territories[0];u.selected=new Set([port.i]);u.fields['v2-polity'].value='Hejaz';u.fields['v2-status'].value='Independent state';assert.equal(u.assignSelection(),undefined);assert.equal(u.territories[0],saved);assert.match(u.lastMessage,/Free Port must include/);
});
test('Legacy restore preserves custom names, cells and partners, permits editing, and offers no new custom name',()=>{
 const u=ui(),p=proposal([territory('League of Al-Qamar'),territory('armenia','Autonomous territory',{power:'league  OF al-qamar'})],(_,i)=>i%2+1);p.territories.forEach((t,i)=>t.id=i+1);p.active=1;
 u.restore({modelContent:p});assert.equal(u.territories[0].name,'League of Al-Qamar');assert.equal(u.territories[1].name,'Armenia');assert.equal(u.territories[1].power,'League of Al-Qamar');assert.equal(u.territories.reduce((n,t)=>n+t.cells.length,0),hexes.length);assert.equal(u.fields['v2-polity'].value,'League of Al-Qamar');
 u.selected=new Set(u.territories[0].cells);assert.equal(u.assignSelection(),true);assert.equal(u.territories.find(t=>t.id===1).name,'League of Al-Qamar');u.syncNames();assert.ok(!u.fields['v2-polity'].options.some(o=>o.value==='League of Al-Qamar'));
});
test('Invalid old duplicates and statuses keep their land but cannot produce local Results',()=>{
 const u=ui(),p=proposal([territory('Turkey'),territory('  TURKEY ')],(_,i)=>i%2+1);p.territories.forEach((t,i)=>t.id=i+1);u.restore({modelContent:p});assert.equal(u.territories.reduce((n,t)=>n+t.cells.length,0),hexes.length);assert.match(u.territoryIdentityIssue(u.territories),/assigned twice/);
 const invalid=[{...territory('International City'),cells:hexes.map(c=>c.i)}];assert.match(u.territoryIdentityIssue(invalid),/cannot have independent state/);
 assert.match(u.territoryIdentityIssue([{...territory('Free Port','International administration'),cells:[hexes.find(c=>c.city==='Medina').i]}]),/marked port/);
});

test('Starting a new territory selects an unused name and retains the saved country',()=>{
 const u=ui(),saved={...territory('Turkey'),id:1,cells:[hexes[0].i]};u.territories=[saved];u.active=1;u.selected=new Set(saved.cells);u.fields['v2-polity'].value='Turkey';
 u.render=()=>u.syncNames();u.setMode=m=>u.mode=m;u.startNewTerritory();
 assert.equal(u.active,null);assert.equal(u.selected.size,0);assert.equal(u.mode,'paint');assert.equal(u.territories[0],saved);assert.notEqual(u.fields['v2-polity'].value,'Turkey');assert.ok(u.fields['v2-polity'].options.find(o=>o.value==='Turkey').disabled);
});
