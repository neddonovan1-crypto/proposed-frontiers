const test=require('node:test'),assert=require('node:assert/strict');
const cells=require('../db/hexes.json'),ethnicity=require('../ethnicity-metrics.json'),rails=require('../railways.json'),railCells=require('../railway-metrics.json');
test('Compiled area and railway metadata cover canonical land without tagging unbuilt rails',()=>{
 const ids=new Set(cells.map(c=>String(c.i))),open=new Set(rails.routes.filter(r=>r.status==='open').map(r=>r.id));
 assert.equal(Object.keys(ethnicity).length,cells.length);
 for(const [id,areas] of Object.entries(ethnicity)){assert.ok(ids.has(id));assert.equal(areas.length,7);assert.ok(areas.every(n=>Number.isFinite(n)&&n>=0));assert.ok(areas.some(n=>n>0));}
 for(const [id,value] of Object.entries(railCells)){assert.ok(ids.has(id));assert.ok(value.railways.every(route=>open.has(route)));}
 const rayak=Object.values(railCells).filter(c=>c.railJunctions.includes('Rayak'));assert.equal(rayak.length,1);
 assert.ok(rayak[0].railways.includes('levant-north')&&rayak[0].railways.includes('beirut-damascus'));
 const medina=cells.find(c=>c.city==='Medina');assert.ok(railCells[medina.i].railways.includes('hejaz-main'));
 assert.ok(!cells.filter(c=>['Mecca','Jeddah'].includes(c.city)).some(c=>railCells[c.i]?.railways.includes('hejaz-main')));
 assert.equal(rails.routes.find(r=>r.id==='taurus-gap').status,'gap');
 assert.equal(rails.routes.find(r=>r.id==='amanus-gap').status,'gap');
});
test('Anatolian hex tag is complete and keeps Levant and Mesopotamia outside',async()=>{
 const {inAnatolia}=await import('../scripts/compile-anatolia.mjs');
 assert.ok(cells.every(c=>c.anatolia===inAnatolia(c.lon,c.lat)));
 for(const name of ['Smyrna','Angora','Konya','Van','Trebizond'])assert.equal(cells.find(c=>c.city===name).anatolia,true,name);
 for(const name of ['Aleppo','Mosul','Beirut','Erbil'])assert.equal(cells.find(c=>c.city===name).anatolia,false,name);
 assert.ok(cells.filter(c=>c.anatolia).length>150);
});
test('Persia is a valid external power for each supported relationship and keeps canonical cell metadata',async()=>{
 const {proposalInput}=await import('../worker/league.mjs');
 const hexes=[{i:0,area:1,nearPersia:true,neighbours:[1]},{i:1,area:1,nearPersia:false,neighbours:[0]}],assignments=Buffer.from([1,1]).toString('base64');
 for(const [status,relationship,sect] of [['Direct colonial administration','None'],['Protectorate','None'],['Autonomous territory','Treaty association'],['Independent state','Treaty association'],['Independent state','Sphere of influence'],['Imamate','Treaty association','Shia'],['Imamate','Sphere of influence','Sunni']]){
  const input=proposalInput({version:3,assignments,territories:[{name:'Mesopotamia',status,relationship,sect,power:' pErSiA ',cells:[{i:1,nearPersia:true}]}]},hexes);
  assert.equal(input[0].power,'Persia');assert.deepEqual(input[0].cells.map(c=>c.nearPersia),[true,false]);assert.equal(input[0].components,1);
 }
 const proposal={version:3,assignments,territories:[{name:'Mesopotamia',status:'Protectorate',power:'Atlantis'}]};
 assert.throws(()=>proposalInput(proposal,hexes),/Choose a colonial power/);
});
test('Built Persian frontier requires polygon contact and shares exact browser/server flags',async()=>{
 const [{default:hexes},{default:assets}]=await Promise.all([import('../dist/server/hexes.mjs'),import('../dist/server/assets.mjs')]);
 const byId=new Map(hexes.map(c=>[c.i,c]));
 assert.equal(byId.get(724).nearPersia,false,'inland hex cannot bypass the frontier hex');
 assert.equal(byId.get(725).nearPersia,true,'the intervening frontier hex directly touches Persia');
 assert.equal(byId.get(1306).nearPersia,false);assert.equal(byId.get(1307).nearPersia,true);
 assert.equal(byId.get(783).nearPersia,false,'Van is nearby but its city polygon does not touch Persia');
 assert.equal(byId.get(1074).nearPersia,true,'absorbed frontier fragments preserve boundary contact');
 assert.ok(byId.get(1074).absorbed.includes(1075));
 assert.ok(hexes.every(c=>typeof c.nearPersia==='boolean'));
 const sandbox={window:{},document:{querySelector:()=>({getAttribute:()=>''})}};
 require('node:vm').runInNewContext(Object.entries(assets).find(([url])=>url.startsWith('/assets/map-data.'))[1].body,sandbox);
 assert.deepEqual(Array.from(sandbox.window.FrontiersMapData.persiaBorderCells),hexes.filter(c=>c.nearPersia).map(c=>c.i));
});
