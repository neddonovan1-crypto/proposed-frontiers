const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {propose}=require('../autocomplete.js'),hexes=require('../db/hexes.json');
const byCity=new Map(hexes.filter(c=>c.city).map(c=>[c.city,c]));
const owner=(plan,city)=>plan.territories.find(t=>t.cells.includes(byCity.get(city).i));
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
function proposal(territories){const bytes=new Uint8Array(Math.max(...hexes.map(c=>c.i))+1);territories.forEach((t,j)=>t.cells.forEach(i=>bytes[i]=j+1));return {version:3,assignments:Buffer.from(bytes).toString('base64'),territories:territories.map(({cells,...t})=>t)};}
function applyPlan(existing,plan){return [...existing.map(t=>({...t,cells:[...t.cells,...(plan.extensions.find(e=>e.id===t.id)?.cells||[])]})),...plan.territories];}

test('An empty map receives every canonical playable cell once and deterministically',()=>{
 const input=freeze(structuredClone(hexes)),plan=propose(input,freeze([]));
 assert.equal(plan.count,hexes.length);assert.equal(plan.territoryCount,plan.territories.length);assert.equal(plan.mode,'1916-inspired');
 const assigned=plan.territories.flatMap(t=>t.cells);assert.equal(new Set(assigned).size,hexes.length);
 assert.deepEqual(assigned.toSorted((a,b)=>a-b),hexes.map(c=>c.i).toSorted((a,b)=>a-b));
 assert.deepEqual(propose([...input].reverse(),[]),plan);
 assert.ok(plan.territories.every(t=>Number.isSafeInteger(t.id)&&t.id>0&&t.name.length<=70&&t.cells.length));
 assert.ok(plan.territories.every(t=>t.status==='Imamate'?t.sect==='Ibadi':t.sect===null));
});

test('Partial completion preserves every existing country, property and owned cell',()=>{
 const existing=freeze([{id:1,name:'My border',status:'Protectorate',power:'Persia',relationship:'None',sect:'Shia',color:'#123456',cells:hexes.filter((c,i)=>i%3===0).map(c=>c.i)}]);
 const before=JSON.stringify(existing),owned=new Set(existing[0].cells),plan=propose(freeze(structuredClone(hexes)),existing);
 assert.equal(JSON.stringify(existing),before);assert.equal(plan.count,hexes.length-owned.size);
 assert.ok(plan.territories.every(t=>t.id!==1&&t.cells.every(i=>!owned.has(i))));
 assert.equal(propose(hexes,[...existing,...plan.territories]).count,0);
 assert.deepEqual(propose(hexes,[...existing,...plan.territories]).territories,[]);
});

test('The template uses named French and British protectorates while retaining direct and international zones',()=>{
 const plan=propose(hexes,[]);
 for(const city of ['Aleppo','Damascus','Mosul','Erbil','Kirkuk']){
  assert.equal(owner(plan,city).name,'Syria');assert.equal(owner(plan,city).status,'Protectorate');assert.equal(owner(plan,city).power,'France');assert.equal(owner(plan,city).relationship,'None');
 }
 for(const city of ['Baghdad','Basra','Najaf']){assert.equal(owner(plan,city).power,'Britain');assert.equal(owner(plan,city).status,'Direct colonial administration');}
 assert.equal(owner(plan,'Haifa').name,'Haifa and Acre');assert.equal(owner(plan,'Haifa').power,'Britain');
 assert.equal(owner(plan,'Jerusalem').status,'International administration');assert.equal(owner(plan,'Jerusalem').power,'');
 assert.equal(owner(plan,'Beirut').power,'France');assert.equal(owner(plan,'Beirut').status,'Direct colonial administration');
 for(const city of ['Aqaba','Ma’an']){assert.equal(owner(plan,city).name,'Transjordan');assert.equal(owner(plan,city).status,'Protectorate');assert.equal(owner(plan,city).relationship,'None');assert.equal(owner(plan,city).power,'Britain');}
 assert.ok(plan.territories.every(t=>!/^Arab Area [AB]$/.test(t.name)));
 assert.equal(owner(plan,'Constantinople').name,'Ottoman Sultanate');assert.equal(owner(plan,'Riyadh').name,'Nejd');
});

test('Adjoining Syria and Transjordan absorb completion land without changing any existing metadata',async()=>{
 const existing=freeze([{id:1001,name:'Syria',status:'Independent state',power:'Persia',relationship:'Treaty association',sect:null,color:'#123456',cells:[byCity.get('Damascus').i]},{id:1002,name:'Transjordan',status:'Independent state',power:'',relationship:'None',sect:null,color:'#abcdef',cells:[byCity.get('Aqaba').i]}]);
 const before=structuredClone(existing),plan=propose(hexes,existing);
 assert.deepEqual(existing,before);
 for(const t of existing){
  const extension=plan.extensions.find(e=>e.id===t.id);assert.ok(extension?.cells.length);assert.ok(extension.cells.every(i=>!t.cells.includes(i)));
  assert.ok(!plan.territories.some(addition=>addition.name===t.name||addition.name.startsWith(t.name+' —')));
 }
 const combined=applyPlan(existing,plan),{proposalInput}=await import('../worker/league.mjs');
 for(let i=0;i<existing.length;i++)assert.deepEqual({...combined[i],cells:existing[i].cells},existing[i]);
 assert.equal(plan.count,hexes.length-2);assert.equal(plan.territoryCount,plan.territories.length);
 assert.equal(proposalInput(proposal(combined),hexes).flatMap(t=>t.cells).length,hexes.length);
 assert.equal(propose(hexes,combined).count,0);
});

test('Owned strips split components: extensions never jump another country or consume a different template region',()=>{
 const cells=[1,2,3,4,5,6].map(i=>({i,lon:37,lat:34,neighbours:[i-1,i+1].filter(n=>n>=1&&n<=6)}));
 cells[5]={...cells[5],lon:39,lat:25};
 const existing=freeze([{id:10,name:'  sYrIa  ',status:'Independent state',power:'Persia',relationship:'Treaty association',color:'#123456',cells:[1]},{id:20,name:'A protected strip',cells:[4]}]);
 const plan=propose(cells,existing);assert.deepEqual(plan.extensions,[{id:10,cells:[2,3]}]);
 const remote=plan.territories.find(t=>t.cells.includes(5));assert.equal(remote.name,'Syrian Interior');assert.equal(remote.status,'Protectorate');assert.equal(remote.power,'France');
 assert.ok(plan.territories.some(t=>t.cells.includes(6)&&t.name==='Hejaz'));
 assert.equal(plan.count,4);assert.equal(new Set([...plan.extensions.flatMap(e=>e.cells),...plan.territories.flatMap(t=>t.cells)]).size,4);
});

test('Disconnected areas use regional names, without duplicate Syria or Transjordan remainders',()=>{
 const cells=[{i:1,lon:40,lat:25,neighbours:[]},{i:2,city:'Mosul',lon:43,lat:36,neighbours:[3]},{i:3,lon:43,lat:36.1,neighbours:[2]},{i:4,lon:43,lat:36.2,neighbours:[]},{i:5,lon:40,lat:25,neighbours:[]},{i:6,city:'Ma’an',lon:35.7,lat:30.5,neighbours:[]},{i:7,lon:40,lat:31,neighbours:[]}];
 const existing=[{id:1,name:'Syria',cells:[1]},{id:2,name:'Transjordan',cells:[5]},{id:3,name:'Upper Mesopotamia',cells:[]}],plan=propose(cells,existing);
 assert.deepEqual(plan.extensions,[]);
 assert.deepEqual(plan.territories.map(t=>t.name),['Jazira Territory','Tigris Highlands','East Bank','Northern Arabian Territory']);
 assert.ok(plan.territories.every(t=>!t.name.includes('conference remainder')&&!['Syria','Transjordan'].includes(t.name)));
 assert.equal(plan.count,5);assert.equal(plan.territoryCount,4);
 assert.deepEqual(propose([...cells].reverse(),existing),plan);
});

test('Canonical absorbed-fragment adjacency permits touching extensions and absent edges never imply adjacency',()=>{
 const cells=[{i:1,lon:37,lat:34,absorbed:[9],neighbours:[]},{i:9,lon:37,lat:34,land:false,mergeTarget:1,neighbours:[2]},{i:2,lon:37,lat:34,neighbours:[9]}];
 const existing=[{id:7,name:'Syria',cells:[9]}],plan=propose(cells,existing);assert.deepEqual(plan.extensions,[{id:7,cells:[2]}]);assert.deepEqual(plan.territories,[]);
 const noEdge=cells.map(c=>({...c,neighbours:[]})),separate=propose(noEdge,existing);assert.deepEqual(separate.extensions,[]);assert.equal(separate.territories[0].name,'Syrian Interior');
});

test('Extension-only completion is permitted at the 255-territory limit',()=>{
 const cells=[{i:1,lon:37,lat:34,neighbours:[2]},{i:2,lon:37,lat:34,neighbours:[1]}],existing=Array.from({length:255},(_,i)=>({id:i+1,name:i?'Country '+i:'Syria',cells:i?[]:[1]}));
 const plan=propose(cells,existing);assert.equal(plan.territoryCount,0);assert.deepEqual(plan.territories,[]);assert.deepEqual(plan.extensions,[{id:1,cells:[2]}]);assert.equal(plan.count,1);
});

test('Autofill gives the unowned holy cities to Hejaz and never creates or extends a National Home',()=>{
 const existing=[{id:1,name:'Jewish National Home',status:'Independent state',sect:'Sunni',power:'',relationship:'None',cells:[byCity.get('Jerusalem').i]}];
 const plan=propose(hexes,existing);
 assert.ok(plan.territories.every(t=>t.name!=='Jewish National Home'));
 for(const city of ['Mecca','Medina']){assert.equal(owner(plan,city).name,'Hejaz');assert.equal(owner(plan,city).status,'Independent state');}
 assert.deepEqual(existing[0].cells,[byCity.get('Jerusalem').i]);
});

test('Names and IDs are unique without changing conflicting existing countries',()=>{
 const cities=['Constantinople','Smyrna','Angora'],names=['  HEJAZ  ','Hejaz — conference remainder','HEJAZ — conference remainder 2'];
 const existing=names.map((name,i)=>({id:i===0?'1':i+1,name,status:'Independent state',power:'',relationship:'None',cells:[byCity.get(cities[i]).i]}));
 const original=structuredClone(existing),plan=propose(hexes,existing);
 assert.equal(owner(plan,'Mecca').name,'Hejaz — conference remainder 3');assert.deepEqual(existing,original);
 const combined=[...existing,...plan.territories];
 assert.equal(new Set(combined.map(t=>String(t.id))).size,combined.length);
 assert.equal(new Set(combined.map(t=>t.name.trim().replace(/\s+/g,' ').toLowerCase())).size,combined.length);
 assert.ok(plan.territories.every(t=>t.name.length<=70));
});

test('Fixed land, water and merged fragments are excluded; absorbed ownership protects its canonical cell',()=>{
 const cells=[{i:1,lon:40,lat:25,land:true,absorbed:[2]},{i:2,lon:40,lat:25,land:false,mergeTarget:1},{i:3,lon:40,lat:25,land:false},{i:4,lon:40,lat:25,fixed:true},{i:5,lon:40,lat:25,locked:true},{i:6,lon:40,lat:25,playable:false},{i:7,lon:40,lat:25}];
 const plan=propose(cells,[{id:8,name:'Existing',cells:[2]}]);assert.equal(plan.count,1);assert.deepEqual(plan.territories.flatMap(t=>t.cells),[7]);
 assert.deepEqual(propose(cells,[]).territories.flatMap(t=>t.cells),[1,7]);
 assert.equal(propose([{i:1,lon:40,lat:25,absorbed:[2]}],[{id:9,name:'Saved fragment',cells:[2]}]).count,0);
});

test('The 255-territory cap is atomic and a completed map at the cap remains a no-op',()=>{
 const one=[{i:1,lon:40,lat:25}],existing=Array.from({length:255},(_,i)=>({id:i+1,name:'Existing '+i,cells:[]})),before=JSON.stringify(existing);
 assert.throws(()=>propose(one,existing),/255 territories/);assert.equal(JSON.stringify(existing),before);
 const atLimit=structuredClone(existing.slice(0,254));assert.equal(propose(one,atLimit).territories.length,1);
 existing[0].cells=[1];assert.equal(propose(one,existing).count,0);
 const two=[...one,{i:2,lon:36,lat:32}];assert.throws(()=>propose(two,atLimit),/255 territories/);
});

test('Malformed cells and overlapping saved assignments fail without partial results',()=>{
 assert.throws(()=>propose([{i:1,lat:25,lon:40},{i:1,lat:26,lon:41}],[]),/map cells/);
 assert.throws(()=>propose([{i:1,lat:NaN,lon:40}],[]),/map cells/);
 assert.throws(()=>propose([{i:1,lat:25,lon:40}],[{id:1,name:'A',cells:[1]},{id:2,name:'B',cells:[1]}]),/overlap/);
 assert.throws(()=>propose(hexes,[{id:1,name:'Unsaved'}]),/Save your current territory/);
});

test('A completed generated map is accepted by the league proposal validator',async()=>{
 const {proposalInput}=await import('../worker/league.mjs'),plan=propose(hexes,[]),decoded=proposalInput(proposal(plan.territories),hexes);
 assert.equal(decoded.length,plan.territories.length);assert.equal(decoded.flatMap(t=>t.cells).length,hexes.length);
 for(const t of decoded){assert.ok(t.cells.length);assert.notEqual(t.name,'Free Port');assert.notEqual(t.name,'Hellenic Anatolia');assert.notEqual(t.name,'Jewish National Home');}
});

test('Browser script exposes the same pure API without requiring module globals',()=>{
 const context={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../autocomplete.js'),'utf8'),context);
 assert.equal(typeof context.window.FrontiersAutocomplete.propose,'function');
 const result=context.window.FrontiersAutocomplete.propose([{i:1,lon:40,lat:25}],[]);assert.equal(result.count,1);assert.equal(result.territoryCount,1);
});
