const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),engine=require('../chronicle.js');
const ethnic=require('../ethnicity-metrics.json'),rails=require('../railway-metrics.json');
const hexes=require('../db/hexes.json').map(c=>({...c,ethnicity:ethnic[c.i],railways:rails[c.i]?.railways||[],railJunctions:rails[c.i]?.railJunctions||[]}));
const markup=fs.readFileSync(require.resolve('../game.html'),'utf8'),oman=markup.match(/<path d="([^"]+)"[^>]+data-fixed-name="Muscat and Oman"/)[1];
const edges=oman.split('M').filter(Boolean).flatMap(r=>{const p=[...r.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m=>[+m[1],+m[2]]);return p.map((v,i)=>[v,p[(i+1)%p.length]]);});
for(const c of hexes){const x=400+(c.lon-43)*Math.PI/180*1110,y=400-1110*(Math.log(Math.tan(Math.PI/4+c.lat*Math.PI/360))-Math.log(Math.tan(Math.PI/4+28*Math.PI/360)));c.nearOman=edges.some(([a,b])=>{const dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-u*dx,y-a[1]-u*dy)<=18;});}
const territory=(name,status,extra={})=>({name,status,power:'',relationship:'None',sect:null,...extra});
async function play(territories,owner=()=>1){
 const {proposalInput}=await import('../worker/league.mjs'),bytes=new Uint8Array(4000);
 hexes.forEach((c,i)=>{bytes[c.i]=owner(c,i);});
 const input=proposalInput({version:3,territories,assignments:Buffer.from(bytes).toString('base64')},hexes),history=engine.build(input);
 return {input,history,score:engine.score(history,input)};
}
const positive=e=>['accord','prosperity','reform'].includes(e.kind);

test('Painting every canonical hex as grazing land cannot win or claim zero-of-zero survival',async()=>{
 const {history,score}=await play([territory('Shared Grazing Territory','Unsettled frontier / shared rights')]);
 assert.equal(score.total,0);assert.equal(score.durability,0);assert.equal(score.cooperation,0);
 assert.notEqual(history.title,'The Settlement Endures');assert.doesNotMatch(history.deck,/0 of 0/);
 assert.equal(history.stats.gains,0);assert.ok(history.events.some(e=>e.year===1939));
 assert.ok(history.outcomes.every(o=>!o.intact));
});

test('A world-sized city or free port cannot inherit local charter immunity',async()=>{
 for(const name of ['Free Port','International City','Global Commission']){
  const {history,score}=await play([territory(name,'International administration')]);
  assert.equal(history.stats.surviving,0,name);assert.equal(score.durability,0,name);assert.equal(score.cooperation,0,name);
  assert.ok(score.total<40,name);assert.notEqual(history.title,'The Settlement Endures');
  const end=history.outcomes[0];assert.ok(!end.intact,name);
  assert.ok(!history.events.some(e=>positive(e)&&e.year>=end.ended&&e.affected.includes(name)),name);
 }
});

test('The depression reaches British and French protectorates and their large dependencies',async()=>{
 for(const [power,year] of [['Britain',1931],['France',1932]]){
  const cases=[
   [[territory('Arab Federation','Protectorate',{power})],()=>1],
   [[territory('Small Patron','Protectorate',{power}),territory('Large Dependency','Autonomous territory',{power:'Small Patron',relationship:'Treaty association'})],(c,i)=>i===0?1:2]
  ];
  for(const [territories,owner] of cases){
   const {history,score}=await play(territories,owner);
   const shock=history.events.find(e=>e.year===year&&/Protectorate Grants Cut|Credit Retrenchment/.test(e.key));
   assert.ok(shock,`${power}: no financial crash event`);
   assert.deepEqual(new Set(shock.affected),new Set(territories.map(t=>t.name)));
   assert.ok(score.durability<40,`${power}: crash has no durability cost`);
   assert.ok(history.outcomes.every(o=>(o.durability??1)<1));
  }
 }
});

test('A 255-country scattered map cannot buy a high score with one shared patron',async()=>{
 const territories=Array.from({length:255},(_,i)=>territory('District '+i,'Protectorate',{power:'Britain'}));
 const {history,score}=await play(territories,(c,i)=>i%255+1);
 assert.ok(score.total<40,JSON.stringify(score));assert.ok(history.stats.surviving<40);
 assert.ok(history.events.some(e=>e.kind==='dissolution'));
 for(const outcome of history.outcomes.filter(o=>!o.intact))assert.ok(!history.events.some(e=>positive(e)&&e.year>=outcome.ended&&e.affected.includes(outcome.name)),outcome.name);
});

test('A legacy autonomous territory replaces a protectorate that loses its government',async()=>{
 const territories=[territory('Jewish National Home','Protectorate',{power:'Britain'}),territory('Associated Provinces','Autonomous territory',{power:'Jewish National Home',relationship:'Treaty association'}),territory('Syria','Independent state')];
 // Invalid legacy geography remains supported by the history engine even though new submissions reject it.
 const input=territories.map(t=>({...t,cells:[],components:1}));for(const c of hexes)input[['Mecca','Medina','Najaf'].includes(c.city)?0:c.city==='Jerusalem'?1:2].cells.push(c);
 const history=engine.build(input);
 const parent=history.outcomes.find(o=>o.name==='Jewish National Home'),child=history.outcomes.find(o=>o.name==='Associated Provinces');
 assert.equal(parent.intact,false);assert.equal(child.intact,true);
 assert.equal(child.power,'');assert.equal(child.relationship,'None');assert.equal(child.status,'Independent state');
 assert.ok(history.events.some(e=>e.key==='Autonomous Assembly Takes Over the Lapsed Treaty'&&e.affected.includes(child.name)));
 assert.ok(!history.events.some(e=>positive(e)&&e.year>=parent.ended&&e.affected.includes(parent.name)));
});

test('Custom display names cannot reroll the generic government or score',async()=>{
 let first;
 for(let i=0;i<20;i++){
  const r=await play([territory('Custom Republic '+i,'Independent state')]);
  if(!first)first=r;
  assert.equal(r.history.seed,first.history.seed);assert.deepEqual(r.score,first.score);
  assert.equal(r.history.outcomes[0].status,first.history.outcomes[0].status);
 }
});

test('Case and spacing variants cannot evade a named historical rule',async()=>{
 for(const names of [['Turkey','TURKEY'],['Ottoman Sultanate','  ottoman   sultanate  '],['Jewish National Home','jewish national home']]){
  const companion=names[0]==='Jewish National Home'?[territory('Hejaz','Independent state')]:[],owner=c=>companion.length&&['Mecca','Medina','Najaf'].includes(c.city)?2:1;
  const a=await play([territory(names[0],'Protectorate',{power:'Britain'}),...companion],owner),b=await play([territory(names[1],'Protectorate',{power:'Britain'}),...companion],owner);
  assert.deepEqual(a.score,b.score);assert.equal(a.history.seed,b.history.seed);assert.deepEqual(a.history.stats,b.history.stats);
 }
});

test('A single Shia imamate over the whole map still faces general administrative limits',async()=>{
 const {history,score}=await play([territory('Zaydistan','Imamate',{sect:'Shia'})]);
 assert.ok(history.events.some(e=>e.key==='The Lower Rivers Compact'));
 assert.ok(history.events.some(e=>e.kind==='war'));
 assert.ok(score.durability<40);assert.ok(score.total<75,JSON.stringify(score));
});


test('Scattered international commissions cannot evade administrative viability',async()=>{for(const n of [20,255]){const territories=Array.from({length:n},(_,i)=>territory('Commission '+i,'International administration'));const {history,score}=await play(territories,(c,i)=>i%n+1);assert.equal(history.stats.surviving,0);assert.equal(score.total,0);}});
