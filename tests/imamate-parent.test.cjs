const test=require('node:test'),assert=require('node:assert/strict'),engine=require('../chronicle.js');
const ethnic=require('../ethnicity-metrics.json'),rails=require('../railway-metrics.json');
const hexes=require('../db/hexes.json').map(c=>({...c,ethnicity:ethnic[c.i],railways:rails[c.i]?.railways||[],railJunctions:rails[c.i]?.railJunctions||[]}));

test('An autonomy replaces its treaty when its oversized imamate parent dissolves in 1931',async()=>{
 const {proposalInput}=await import('../worker/league.mjs');
 const parentCells=new Set(hexes.filter(c=>c.city!=='Jerusalem').slice(0,201).map(c=>c.i));
 const bytes=new Uint8Array(4000);
 for(const c of hexes)bytes[c.i]=parentCells.has(c.i)?1:c.city==='Jerusalem'?2:3;
 const input=proposalInput({version:3,territories:[
  {name:'Zaydistan',status:'Imamate',sect:'Shia',power:'',relationship:'None'},
  {name:'Armenia',status:'Autonomous territory',power:'Zaydistan',relationship:'Treaty association'},
  {name:'Syria',status:'Independent state',power:'',relationship:'None'}
 ],assignments:Buffer.from(bytes).toString('base64')},hexes);
 const history=engine.build(input),parent=history.outcomes.find(t=>t.name==='Zaydistan'),child=history.outcomes.find(t=>t.name==='Armenia');
 assert.equal(parent.ended,1931);assert.equal(parent.intact,false);
 assert.equal(child.intact,true);assert.equal(child.status,'Independent state');
 assert.equal(child.power,'');assert.equal(child.relationship,'None');
 assert.ok(history.events.some(e=>e.key==='Autonomous Assembly Takes Over the Lapsed Treaty'&&e.affected.includes('Armenia')));
 assert.ok(!history.events.some(e=>['accord','prosperity','reform'].includes(e.kind)&&e.year>=parent.ended&&e.affected.includes('Zaydistan')));
});
