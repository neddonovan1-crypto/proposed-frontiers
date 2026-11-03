const test=require('node:test'),assert=require('node:assert/strict'),{build,score}=require('../chronicle.js');
const cell=i=>({i,area:1,lat:25,lon:43,neighbours:[i-1,i+1]});
const t=(name,start,n,extra={})=>({name,status:'Imamate',sect:'Shia',power:'',relationship:'None',components:1,cells:Array.from({length:n},(_,i)=>cell(i+start)),...extra});
const pressure=h=>h.events.find(e=>/Your imamate has/.test(e.cause));
test('The fourth imamate causes regional failure regardless of sect and external link',()=>{
 for(const sect of ['Sunni','Shia','Ibadi','Sufi'])for(const power of ['','Britain','France','Russia','Italy']){
  const ts=Array.from({length:4},(_,i)=>t(['Syria','Hejaz','Nejd','Zaydistan'][i],i*40,20,{sect,power,relationship:power?'Treaty association':'None'}));
  const h=build(ts);assert.ok(h.failureReason);assert.match(h.title,/War/);assert.equal(score(h,ts).total,0);assert.ok(h.events.some(e=>e.kind==='war'&&e.affected.length===4));
  assert.equal(build(ts.slice(0,3)).failureReason,'');
 }
});
test('Imamate size pressure begins at36, escalates at71/121, and collapses above200',()=>{
 assert.equal(pressure(build([t('Zaydistan',1,35)])),undefined);
 for(const [n,kind] of [[36,'crisis'],[70,'crisis'],[71,'uprising'],[120,'uprising'],[121,'war'],[200,'war'],[201,'war']]){
  const h=build([t('Zaydistan',1,n)]),e=pressure(h);assert.ok(e,String(n));assert.equal(e.kind,kind);assert.deepEqual(e.affected,['Zaydistan']);assert.equal(h.outcomes[0].ended===1931,n>200);
 }
});
test('Imamate succession has adverse alternatives without a sect-specific penalty',()=>{
 const kinds=new Set();for(let start=1;start<=40;start++){
  const matches=[];for(const sect of ['Sunni','Shia','Ibadi','Sufi']){const h=build([t('Zaydistan',start,10,{sect})]);const e=h.events.find(e=>['Who succeeds the imam?','Rival Councils Proclaim Successors to the Imam','District Councils Settle the Imamate’s Revenue Compact'].includes(e.key));assert.ok(e);matches.push(e.kind);kinds.add(e.kind);}
  assert.equal(new Set(matches).size,1);
 }assert.deepEqual([...kinds].sort(),['reform','uprising']);
});
test('Editing another country does not reroll a state’s internal government arc',()=>{
 const own=t('Syria',1,10),other=t('Hejaz',100,10);const a=build([own,other]),b=build([own,{...other,status:'Independent state',power:'Britain',relationship:'Treaty association'}]);
 const arc=h=>h.events.find(e=>e.affected.length===1&&e.affected[0]==='Syria'&&['Who succeeds the imam?','Rival Councils Proclaim Successors to the Imam','District Councils Settle the Imamate’s Revenue Compact'].includes(e.key));assert.deepEqual(arc(a),arc(b));
});
test('British and French treaties do not evade the external funding shock',()=>{
 for(const power of ['Britain','France']){const ts=[t('Zaydistan',1,20,{power,relationship:'Treaty association'})],h=build(ts);assert.ok(h.events.some(e=>/Treaty Credits|Treaty States/.test(e.key)));assert.ok(h.outcomes[0].durability<1);}
});
