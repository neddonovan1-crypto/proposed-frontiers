const test=require('node:test'),assert=require('node:assert/strict'),{build,score}=require('../chronicle.js');
const hex=(i,extra={})=>({i,area:100,lat:30,lon:40,neighbours:[],environment:[[100,0,0,0],[100,0,0,0],[100,0,0,0],[100,0,0,0,0]],...extra});
const t=(name,cells,extra={})=>({name,cells,status:'Independent state',power:'',relationship:'None',components:1,...extra});
const event=(h,key)=>h.events.find(e=>e.key===key),farm=()=>[[0,0,0,100],[0,100,0,0],[0,100,0,0],[0,100,0,0,0]];
test('Agricultural depression follows the land, not the imamate sect or generic branch',()=>{
 for(const status of ['Imamate','Independent state'])for(const sect of ['Sunni','Shia','Ibadi','Sufi']){
  const desert=t('Zaydistan',[hex(1)],{status,sect}),fields={...desert,cells:[hex(1,{environment:farm()})]};
  assert.equal(event(build([desert]),'Zaydistan: Treasury Suspends Irrigation Repairs'),undefined);
  const h=build([fields]);assert.ok(event(h,'Zaydistan: Treasury Suspends Irrigation Repairs'));assert.ok(h.outcomes[0].durability<=.8);
 }
});
test('Urban trade cushions farming losses; changing the overlay changes the event',()=>{
 const mixed=farm();mixed[1]=[0,70,0,30];const state=t('Syria',[hex(1,{environment:mixed,port:true,city:'Beirut'})]);
 assert.ok(event(build([state]),'Syria: Town Revenues Keep Rural Works Open'));
 state.cells[0].environment[1]=[0,100,0,0];assert.ok(event(build([state]),'Syria: Treasury Suspends Irrigation Repairs'));
});
test('Oasis outcomes distinguish isolated trade from connected market access',()=>{
 const a=hex(1,{environment:[[0,0,0,100],[0,100,0,0],[0,100,0,0],[100,0,0,0,0],[0,100]],city:'Riyadh'}),b=hex(2,{area:200});
 const state=t('Nejd',[a,b]);assert.ok(event(build([state]),'Caravan Tolls Leave the Oasis Harvest Unsold'));
 a.railways=['route'];assert.ok(event(build([state]),'Oasis Markets Secure Water and Caravan Passage'));
});
test('A dense inland town can obtain food through an associated farming neighbour',()=>{
 const town=hex(1,{city:'Town',neighbours:[2],environment:[[100,0,0,0],[0,0,0,100],[0,0,0,100],[100,0,0,0,0]]}),field=hex(2,{neighbours:[1],environment:farm()});
 const a=t('Town',[town]),b=t('Farm',[field]);assert.ok(event(build([a,b]),'Grain Queues Form Beyond the Customs Gates'));
 a.power=b.power='Britain';a.relationship=b.relationship='Treaty association';assert.ok(event(build([a,b]),'Food Convention Keeps the Towns Supplied'));
});
const buffer=()=>[t('Shared Grazing Territory',[hex(1,{neighbours:[2,3]})],{status:'Unsettled frontier / shared rights'}),t('Zaydistan',[hex(2,{neighbours:[1]})],{status:'Imamate',sect:'Shia'}),t('Nejd',[hex(3,{neighbours:[1]})],{status:'Imamate',sect:'Sunni'})];
test('A genuine pastoral buffer between Sunni and Shia governments earns cooperation',()=>{
 const input=buffer(),h=build(input),key='Shared Pastures Keep Rival Patrols Apart';assert.ok(event(h,key));
 const without={...h,events:h.events.filter(e=>e.key!==key)};assert.ok(score(h,input).cooperation>score(without,input).cooperation);
});
test('Unrelated, disconnected or urban grazing grants cannot fake the buffer benefit',()=>{
 const key='Shared Pastures Keep Rival Patrols Apart';
 const far=buffer();far[0].cells[0].neighbours=[2];assert.equal(event(build(far),key),undefined);
 const split=buffer();split[0].cells=[hex(1,{neighbours:[2]}),hex(4,{neighbours:[3]})];assert.equal(event(build(split),key),undefined);
 const urban=buffer();urban[0].cells[0].city='Town';assert.equal(event(build(urban),key),undefined);
 const touching=buffer();touching[1].cells[0].neighbours.push(3);touching[2].cells[0].neighbours.push(2);assert.equal(event(build(touching),key),undefined);
});
const armenian=(i,area)=>hex(i,{ethnicity:[0,0,0,0,area,0,0]});
test('Meaningful Armenian autonomy under Turkey or the Sultanate protects survivors',()=>{
 for(const name of ['Turkey','Ottoman Sultanate']){
  const parent=t(name,[hex(1)]),arm=t('Armenia',[armenian(2,100)],{status:'Autonomous territory',power:name,relationship:'Treaty association'}),h=build([parent,arm]);
  assert.ok(event(h,'Armenian Charter Opens the Road Home'));assert.equal(event(h,'Armenian Relief Crisis Draws the Frontier into War'),undefined);
 }
});
test('A majority of Armenian mapped area under direct rule triggers continued persecution and war',()=>{
 const key='Armenian Relief Crisis Draws the Frontier into War',a=t('Turkey',[armenian(1,51)]),b=t('Armenia',[armenian(2,49)],{status:'Autonomous territory',power:'Turkey',relationship:'Treaty association'});
 assert.ok(event(build([a,b]),key));a.cells[0].ethnicity[4]=50;b.cells[0].ethnicity[4]=50;assert.equal(event(build([a,b]),key),undefined);
 a.cells[0].ethnicity[4]=30;b.cells[0].ethnicity[4]=40;const s=t('Ottoman Sultanate',[armenian(3,30)]);assert.ok(event(build([a,b,s]),key));
});
test('An Armenian name on unrelated or token land does not cancel the persecution event',()=>{
 const a=t('Turkey',[armenian(1,100)]),arm=t('Armenia',[hex(2)],{status:'Autonomous territory',power:'Turkey',relationship:'Treaty association'});let h=build([a,arm]);assert.equal(event(h,'Armenian Charter Opens the Road Home'),undefined);assert.ok(event(h,'Armenian Relief Crisis Draws the Frontier into War'));
 arm.cells=[armenian(2,1)];h=build([a,arm]);assert.equal(event(h,'Armenian Charter Opens the Road Home'),undefined);assert.ok(event(h,'Armenian Relief Crisis Draws the Frontier into War'));
});
test('Five distinct harbour components form the league; four or five contiguous ports do not',()=>{
 const ports=Array.from({length:5},(_,i)=>hex(i+1,{city:'Port '+i,port:true})),network=t('Free Port',ports,{status:'International administration',components:5}),key='Free Ports Form a New Hanseatic League';
 const h=build([network]);assert.ok(event(h,key));assert.equal(h.outcomes[0].fate,'Commercial league flourishes');assert.ok(score(h,[network]).cooperation>0);
 assert.equal(event(build([{...network,cells:ports.slice(0,4),components:4}]),key),undefined);
 ports.forEach(c=>c.neighbours=ports.filter(v=>v!==c).map(v=>v.i));assert.equal(event(build([{...network,components:1}]),key),undefined);
});
test('Oman receives an Omani council compact rather than an envoy to itself',()=>{
 const h=build([t('Oman',[hex(1,{nearOman:true})],{status:'Imamate',sect:'Ibadi'})]),e=event(h,'Nizwa Invites the New Imamate to Talks');assert.ok(e);assert.match(e.title,/Omani Councils/);assert.doesNotMatch(e.text,/interior to Oman|two imamates/);
});
test('United Kirkuk and Mosul still receive the oil discovery',()=>{
 const h=build([t('Mesopotamia',[hex(1,{city:'Kirkuk'}),hex(2,{city:'Mosul'})])]);assert.ok(event(h,'Great Oil Strike at Baba Gurgur'));
});
test('The pipeline needs a continuous agreed corridor, not just ownership of both ends',()=>{
 const a=t('Mesopotamia',[hex(1,{city:'Kirkuk',neighbours:[2]})]),b=t('Syria',[hex(2,{neighbours:[1,3]})]),c=t('Palestine',[hex(3,{city:'Haifa',port:true,neighbours:[2]})]);
 assert.ok(event(build([a,b,c]),'Pipeline Negotiations Founder at the New Frontiers'));
 for(const state of [a,b,c]){state.power='Britain';state.relationship='Treaty association';}
 assert.ok(event(build([a,b,c]),'Kirkuk Oil Reaches the Mediterranean'));
 b.power='France';assert.equal(event(build([a,b,c]),'Kirkuk Oil Reaches the Mediterranean'),undefined);
});
test('Gulf oil news depends on eastern Arabian land and does not award Kuwaiti exports',()=>{
 const a=t('Nejd',[hex(1,{lon:48,lat:26})]);const e=event(build([a]),'Dammam Oil Strike Sets the Gulf Courts Abuzz');assert.ok(e);assert.equal(e.year,1938);assert.match(e.text,/protected Kuwait/);
 a.cells[0].lon=35;assert.equal(event(build([a]),'Dammam Oil Strike Sets the Gulf Courts Abuzz'),undefined);
});
test('Compiled overlay profiles cover every real hex and preserve the displayed oasis and religion washes',async()=>{
 const fs=require('node:fs'),{overlayMetrics}=await import('../scripts/overlay-metrics.mjs'),hexes=require('../db/hexes.json'),data=require('../map-data.json'),metrics=overlayMetrics(data,hexes,fs.readFileSync(require.resolve('../game.html'),'utf8'));
 assert.equal(Object.keys(metrics).length,hexes.length);
 for(const c of hexes){assert.deepEqual(metrics[c.i].map(a=>a.length),[4,4,4,5,2]);for(const row of metrics[c.i])assert.equal(row.reduce((n,v)=>n+v,0),100);}
 for(const name of ['Ha’il','Medina','Riyadh']){const c=hexes.find(c=>c.city===name);assert.ok(metrics[c.i][4][1]>0,name+' has oasis cultivation');}
 const jeddah=hexes.find(c=>c.city==='Jeddah');assert.equal(metrics[jeddah.i][4][1],0);
 const baghdad=hexes.find(c=>c.city==='Baghdad');assert.ok(metrics[baghdad.i][0][3]>80);
 const ibadi=Object.values(metrics).filter(a=>a[3][4]>0);assert.ok(ibadi.length>0);
});
