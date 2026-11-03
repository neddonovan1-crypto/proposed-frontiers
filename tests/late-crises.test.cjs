const test=require('node:test'),assert=require('node:assert/strict'),{build}=require('../chronicle.js');
const pair=(start,linked=true,adjacent=true)=>['Syria','Mesopotamia'].map((name,k)=>({name,status:'Independent state',power:k&&!linked?'France':'Britain',relationship:'Treaty association',components:1,cells:Array.from({length:30},(_,i)=>({i:start+k*30+i,lon:40+k,lat:30,area:1,railways:['test-rail'],neighbours:[...(i?[start+k*30+i-1]:[]),...(i<29?[start+k*30+i+1]:[]),...(adjacent?[start+(1-k)*30+i]:[])]}))}));
const wars=h=>h.events.filter(e=>e.kind==='war'&&e.key.includes('Customs Posts'));
test('Late customs wars require a shared frontier; treaties reduce but do not abolish them',()=>{
 let linked=0,rivals=0;
 for(let n=0;n<100;n++){const start=1+n*100;linked+=wars(build(pair(start))).length;rivals+=wars(build(pair(start,false))).length;assert.equal(wars(build(pair(start,false,false))).length,0);}
 assert.ok(linked>0);assert.ok(rivals>linked*2,`${linked} linked wars, ${rivals} rival wars`);
});
test('Late border crises are stable when an unrelated polity is edited, recoloured or reordered',()=>{
 const ts=pair(1),extra={name:'Hadhramaut',status:'Independent state',power:'',relationship:'None',components:1,cells:[{i:9999,area:1,lat:20,lon:50,neighbours:[]}]};
 const a=wars(build([...ts,extra])),b=wars(build([{...extra,status:'Imamate',sect:'Ibadi'},...ts.reverse().map(t=>({...t,color:'red',id:999}))]));assert.deepEqual(a,b);
});
test('A late fiscal failure ends a state and prevents post-dissolution participation',()=>{
 let found;
 for(let n=0;n<100&&!found;n++){const ts=pair(1+n*100),h=build(ts);if(h.outcomes.some(o=>o.ended===1938))found=h;}
 assert.ok(found,'At least one weakened state must lose its government');
 for(const o of found.outcomes.filter(o=>!o.intact)){assert.ok(found.events.some(e=>['dissolution','annexation'].includes(e.kind)&&e.year===o.ended&&e.affected.includes(o.name)));assert.ok(!found.events.some(e=>e.year>o.ended&&e.affected.includes(o.name)));}
});
