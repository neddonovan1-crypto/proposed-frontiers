const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const engine = require('../chronicle.js');
const {build, score} = engine;

const cell = (i, extra = {}) => ({i, area:100, shiaArea:0, lat:32, lon:44, neighbours:[], ...extra});
const chain = (n, start=1, extra={}) => Array.from({length:n}, (_, j) => cell(start+j, {
  neighbours:[...(j ? [start+j-1] : []), ...(j<n-1 ? [start+j+1] : [])], ...extra
}));
const territory = (name, cells, extra={}) => ({name, cells, status:'Protectorate', power:'Persia', relationship:'None', sect:null, components:1, ...extra});
const linked = (name='Eastern March', n=4, start=1, extra={}) => {
  const cells=chain(n,start); cells[0].nearPersia=true;
  return territory(name,cells,extra);
};
const event = (h,key) => h.events.find(e=>e.key===key);
const outcome = (h,name) => h.outcomes.find(o=>o.name===name);
const clone = value => JSON.parse(JSON.stringify(value));
const key = {
  guarantee:'Persian Guarantee Secures the Eastern Frontier',
  withdrawal:'Tehran Withdraws an Unfunded Guarantee',
  distant:'Distant Persian Treaty Reduced to Commercial Terms',
  abandoned:'Persian Colonial Grant Abandoned',
  revolt:'Persian Governors Driven Out by Provincial Revolt',
  anatolia:'Persian Guarantee Fails in Anatolia',
  autonomy:'Persian Treaty Recognises the Elected Assembly',
  trade:'Persian Frontier Trade Convention Ratified',
  sphere:'Persian Concession Dispute Freezes Treaty Credits',
  kurdish:'Kurdish Assembly Rejects Persian Military Conditions',
  charter:'Kurdish Frontier Charter Limits Tehran’s Powers',
  clergy:'Shia Councils Defend Their Independence from Tehran',
  endowment:'Shrine Schools Secure an Independent Endowment Charter'
};
const pactKey='Tehran Pact Confirms the Eastern Frontiers';
const riverCrisisKey='British and Persian Missions Confront Each Other at Basra';
const navigationKey='Shatt Navigation Convention Opens the Gulf';

test('Persian relationships produce distinct government effects and ignore unused patron fields',()=>{
  const cases=[
    ['Protectorate','None',key.guarantee],
    ['Autonomous territory','Treaty association',key.autonomy],
    ['Independent state','Treaty association',key.trade],
    ['Independent state','Sphere of influence',key.sphere],
    ['Direct colonial administration','None',key.revolt]
  ];
  for(const [status,relationship,expected] of cases){
    const t=linked('Eastern March',4,1,{status,relationship}), h=build([t]);
    assert.ok(event(h,expected),status+' / '+relationship);
    assert.ok(!h.events.some(e=>/^The treaty is rewritten in |revenue revolt|Midnight at the radio station/.test(e.key)), 'generic government arc must not overwrite Persia');
    if(status==='Direct colonial administration'){
      assert.equal(outcome(h,t.name).status,'Republic');
      assert.equal(outcome(h,t.name).power,'');
      assert.equal(outcome(h,t.name).relationship,'None');
    }else assert.equal(outcome(h,t.name).power,'Persia');
  }
  for(const status of ['Independent state','Imamate']){
    const t=linked('Unused patron',4,1,{status,relationship:'None',sect:status==='Imamate'?'Sunni':null});
    assert.ok(!build([t]).events.some(e=>Object.values(key).includes(e.key)),status);
  }
});

test('Persian support follows a contiguous frontier route with a six-hop and three-quarter limit',()=>{
  const near=linked('Eastern March',9),far=linked('Eastern March',10);
  assert.ok(event(build([near]),key.guarantee));
  assert.ok(event(build([far]),key.withdrawal));
  const exact=linked('Eastern March',8);exact.cells[5].neighbours=[5];exact.cells[6].neighbours=[8];
  assert.ok(event(build([exact]),key.guarantee),'six supported of eight cells still qualify');
  const broken=linked('Eastern March',4);broken.cells[0].neighbours=[];broken.cells[1].neighbours=[3];
  assert.ok(event(build([broken]),key.withdrawal));
  const wrongLongitude=linked('Eastern March',4);wrongLongitude.cells.forEach(c=>{c.nearPersia=false;c.lon=49;});
  assert.ok(event(build([wrongLongitude]),key.withdrawal),'eastern longitude alone is not frontier access');
  const basra=linked('River March',4);delete basra.cells[0].nearPersia;basra.cells[0].city='Basra';basra.cells[0].port=true;
  assert.ok(event(build([basra]),key.guarantee));
});

test('A Persian treaty corridor supplies a neighbour, while a foreign corridor does not',()=>{
  const corridor=linked('Frontier corridor',2,1,{status:'Independent state',relationship:'Treaty association'});
  const interior=territory('Interior',chain(3,3));
  corridor.cells[1].neighbours.push(3);interior.cells[0].neighbours.push(2);
  const proposal=[corridor,interior],before=clone(proposal);
  const h=build(proposal);
  assert.ok(event(h,key.guarantee)?.affected.includes('Interior'));
  assert.deepEqual(proposal,before,'building a history does not mutate source cells or proposals');
  assert.deepEqual(h.events,build([interior,corridor]).events);
  corridor.power='France';
  assert.ok(event(build([corridor,interior]),key.withdrawal)?.affected.includes('Interior'));
});

test('A colonial corridor lost in 1924 cannot supply a new Persian guarantee in 1926',()=>{
  const corridor=linked('Frontier colony',2,1,{status:'Direct colonial administration'});
  const interior=territory('Interior',chain(3,3));
  corridor.cells[1].neighbours.push(3);interior.cells[0].neighbours.push(2);
  const h=build([corridor,interior]);
  assert.ok(event(h,key.revolt));
  assert.ok(!h.events.some(e=>e.key===key.guarantee&&e.affected.includes(interior.name)));
  assert.equal(outcome(h,interior.name).power,'');
  assert.equal(event(h,pactKey),undefined);
});

test('Remote Persian commitments dissolve colonies but leave withdrawn local governments alive',()=>{
  for(const status of ['Protectorate','Autonomous territory','Independent state','Imamate']){
    const relationship=['Protectorate'].includes(status)?'None':'Treaty association';
    const t=territory('Remote state',chain(4),{status,relationship,sect:status==='Imamate'?'Sunni':null}),h=build([t]);
    assert.ok(event(h,['Independent state','Imamate'].includes(status)?key.distant:key.withdrawal));
    const end=outcome(h,t.name);
    assert.equal(end.intact,true);assert.equal(end.power,'');assert.equal(end.relationship,'None');
    assert.equal(end.status,status==='Imamate'?'Imamate':'Independent state');
    assert.match(end.originalArrangement,/Persia/);assert.doesNotMatch(end.finalArrangement,/Persia/);
  }
  const colony=territory('Remote colony',chain(4),{status:'Direct colonial administration'}),h=build([colony]);
  assert.equal(event(h,key.abandoned)?.kind,'dissolution');
  assert.equal(outcome(h,colony.name).ended,1921);
  assert.equal(outcome(h,colony.name).intact,false);
  assert.equal(score(h,[colony]).total,0);
});

test('A failed Persian colonial grant cannot be restored by a later city-specific government arc',()=>{
  for(const city of ['Angora','Jerusalem','Baghdad','Kirkuk']){
    const t=territory('Remote colony',chain(4),{status:'Direct colonial administration'});t.cells[0].city=city;
    const h=build([t]),end=outcome(h,t.name);
    assert.equal(end.intact,false,city);assert.equal(end.status,'Dissolved',city);assert.equal(end.sovereign,false,city);
    assert.equal(end.ended,1921,city);assert.equal(end.power,'',city);
    assert.ok(!h.events.some(e=>e.year>end.ended&&e.affected.includes(t.name)),city);
  }
});

test('Withdrawn Persian guarantees cannot manufacture an Arabian accord or cooperation points',()=>{
  const ts=[territory('Hejaz',[cell(1,{city:'Mecca'})]),territory('Nejd',[cell(2,{city:'Riyadh'})])],h=build(ts);
  assert.ok(h.outcomes.every(o=>o.power===''));
  assert.equal(event(h,'The wells before the crowns'),undefined);
  assert.ok(event(h,'The War of the Wells'));
  assert.equal(score(h,ts).cooperation,0);
});

test('A National Home whose Persian autonomy ends cannot later adopt a dual charter with Persia',()=>{
  const t=territory('Jewish National Home',[cell(1,{city:'Jerusalem'})],{status:'Autonomous territory',relationship:'Treaty association'}),h=build([t]);
  const end=outcome(h,t.name);
  assert.ok(event(h,key.withdrawal));assert.equal(end.status,'Independent state');assert.equal(end.power,'');
  assert.equal(event(h,'The dual charter'),undefined);
  assert.notEqual(end.fate,'Autonomous home endures');
  assert.ok(event(h,'A constitution for everyone inside the line'));
  assert.equal(score(h,[t]).cooperation,0);
});

test('Persian capacity is shared across hard guarantees at eighty cells and four dependencies',()=>{
  const grants=(sizes)=>sizes.map((n,i)=>territory('Grant '+i,chain(n,i*100+1,{nearPersia:true})));
  for(const [sizes,withdraw] of [[[40,40],false],[[40,41],true],[[1,1,1,1],false],[[1,1,1,1,1],true]]){
    const ts=grants(sizes),h=build(ts);
    assert.equal(!!event(h,key.withdrawal),withdraw,sizes.join(','));
    for(const t of ts){
      assert.ok(h.events.some(e=>e.key===(withdraw?key.withdrawal:key.guarantee)&&e.affected.includes(t.name)),t.name);
      if(outcome(h,t.name).intact)assert.equal(outcome(h,t.name).power,withdraw?'':'Persia');
    }
  }
  const protector=linked('One guarantee'),commercial=Array.from({length:5},(_,i)=>linked('Commercial '+i,20,100+i*100,{status:'Independent state',relationship:'Treaty association'}));
  commercial.forEach(t=>t.cells.forEach(c=>c.nearPersia=true));
  assert.equal(event(build([protector,...commercial]),key.withdrawal),undefined,'commercial treaties do not consume the garrison budget');
});

test('Kurdish frontier conditions follow known mapped ethnicity at the thirty-five-percent boundary',()=>{
  const t=linked('Eastern March');t.cells.forEach(c=>c.ethnicity=[65,0,35,0,0,0,0]);
  let h=build([t]);assert.equal(event(h,key.kurdish)?.kind,'crisis');
  assert.equal(outcome(h,t.name).status,'Independent state');assert.equal(outcome(h,t.name).power,'');
  t.cells.forEach(c=>c.ethnicity=[65.01,0,35,0,0,0,0]);
  assert.equal(event(build([t]),key.kurdish),undefined);
  t.cells.forEach(c=>c.ethnicity=[65,0,35,0,0,1e6,1e6]);
  assert.ok(event(build([t]),key.kurdish),'mixed/unknown metadata does not erase known Kurdish area');
  for(const [status,relationship] of [['Autonomous territory','Treaty association'],['Independent state','Treaty association']]){
    h=build([{...t,status,relationship}]);assert.ok(event(h,key.charter));assert.equal(outcome(h,t.name).power,'Persia');
  }
  const nameOnly=linked('Kurdistan');nameOnly.cells.forEach(c=>c.ethnicity=[100,0,0,0,0,0,0]);
  assert.equal(event(build([nameOnly]),key.kurdish),undefined,'a name cannot substitute for Kurdish districts');
});

test('Shia clerical institutions retain independence through a treaty and resist political interference',()=>{
  const t=linked('Zaydistan',4,1,{status:'Imamate',sect:'Shia',relationship:'Treaty association'});
  const treaty=build([t]);assert.equal(event(treaty,key.endowment)?.kind,'accord');
  assert.equal(outcome(treaty,t.name).status,'Imamate');assert.equal(outcome(treaty,t.name).power,'Persia');
  const sphere=build([{...t,relationship:'Sphere of influence'}]);
  assert.equal(event(sphere,key.clergy)?.kind,'crisis');
  assert.equal(outcome(sphere,t.name).status,'Imamate');assert.equal(outcome(sphere,t.name).power,'');
  assert.equal(outcome(sphere,t.name).relationship,'None');
  assert.ok(score(treaty,[t]).peace>score(sphere,[{...t,relationship:'Sphere of influence'}]).peace);
  for(const sect of ['Sunni','Ibadi','Sufi'])assert.equal(event(build([{...t,sect}]),key.endowment),undefined);
  assert.equal(event(build([{...t,name:'Eastern March',status:'Independent state'}]),key.endowment),undefined);
});

test('Persian Anatolian failure remains terminal and leads the newspaper',()=>{
  const t=territory('Hellenic Anatolia',chain(4,1,{anatolia:true}));
  const h=build([t]),end=outcome(h,t.name);
  assert.equal(event(h,key.anatolia)?.kind,'dissolution');assert.equal(end.ended,1922);assert.equal(end.intact,false);
  assert.ok(!h.events.some(e=>e.year>end.ended&&e.affected.includes(t.name)));
  assert.ok(!h.events.some(e=>['accord','prosperity','reform'].includes(e.kind)&&e.affected.includes(t.name)));
  assert.equal(h.highlights[0].key,key.anatolia);assert.match(h.title,/Dissolves/);
});

test('The Persian non-aggression pact needs a retained, peaceful frontier relationship',()=>{
  const t=linked('Eastern March',4,1,{status:'Independent state',relationship:'Treaty association'});
  const h=build([t]);assert.equal(event(h,pactKey)?.year,1937);assert.equal(event(h,pactKey)?.kind,'accord');
  for(const variant of [
    {...t,relationship:'Sphere of influence'},
    {...t,cells:t.cells.map(c=>({...c,nearPersia:false}))},
    {...t,status:'Direct colonial administration',relationship:'None'}
  ])assert.equal(event(build([variant]),pactKey),undefined);
  const disconnected=territory('Interior partner',chain(3,100),{status:'Independent state',relationship:'Treaty association'});
  assert.ok(!event(build([t,disconnected]),pactKey)?.affected.includes(disconnected.name));
});

test('Persian diplomatic achievements share one cooperation award instead of stacking by event',()=>{
  const ts=[
    linked('Eastern March',4,1,{status:'Independent state',relationship:'Treaty association'}),
    linked('Kurdish council',4,100,{status:'Autonomous territory',relationship:'Treaty association'}),
    linked('Zaydistan',4,200,{status:'Imamate',sect:'Shia',relationship:'Treaty association'})
  ];
  ts[1].cells.forEach(c=>c.ethnicity=[0,0,100,0,0,0,0]);
  const h=build(ts);
  assert.ok(h.events.filter(e=>[key.trade,key.charter,key.endowment,pactKey].includes(e.key)).length>=3);
  assert.equal(score(h,ts).cooperation,5);
  const stripped={...h,events:h.events.filter(e=>![key.trade,key.charter,key.endowment,pactKey].includes(e.key))};
  assert.equal(score(stripped,ts).cooperation,0);
});

function riverPair(start=1, british=true, adjacent=true){
  const basra=linked('Lower river',4,start);basra.cells[0].city='Basra';basra.cells[0].port=true;
  const neighbour=linked('River neighbour',4,start+100,{status:'Independent state',power:british?'Britain':'France',relationship:'Treaty association'});
  if(adjacent)for(let i=0;i<4;i++){basra.cells[i].neighbours.push(neighbour.cells[i].i);neighbour.cells[i].neighbours.push(basra.cells[i].i);}
  return [basra,neighbour];
}

test('British-Persian river rivalry requires Basra and an actual British river connection',()=>{
  assert.equal(event(build(riverPair()),riverCrisisKey)?.kind,'crisis');
  assert.equal(event(build(riverPair(1,false)),riverCrisisKey),undefined);
  assert.equal(event(build(riverPair(1,true,false)),riverCrisisKey),undefined);
  const noBasra=riverPair();noBasra[0].cells[0].city='Beirut';
  assert.equal(event(build(noBasra),riverCrisisKey),undefined);
  const colony=riverPair();colony[0].status='Direct colonial administration';
  assert.equal(event(build(colony),riverCrisisKey),undefined,'a former Persian colony is not an ongoing Persian interest');
  const upstream=riverPair(1,true,false);upstream[1].cells[0].city='Baghdad';
  assert.ok(event(build(upstream),riverCrisisKey),'British Baghdad is relevant even without a shared boundary hex');
});

test('The navigation settlement and Persian pact are withheld after an actual late river war',()=>{
  let settled,war;
  for(let n=0;n<100&&(!settled||!war);n++){
    const ts=riverPair(1+n*200),h=build(ts);
    const lateWar=h.events.find(e=>e.kind==='war'&&e.year>=1930&&e.year<=1937&&e.affected.includes('Lower river'));
    if(lateWar){war=h;assert.equal(event(h,navigationKey),undefined);assert.equal(event(h,pactKey),undefined);}
    else if(h.outcomes.every(o=>o.intact)&&event(h,navigationKey))settled=h;
  }
  assert.ok(settled,'a peaceful river dispute can reach a navigation settlement');
  assert.ok(war,'some exposed river arrangements must encounter the existing late-war branch');
  assert.equal(event(settled,navigationKey).year,1937);assert.equal(event(settled,navigationKey).kind,'accord');
  assert.ok(['war','dissolution','annexation'].includes(war.highlights[0].kind),'actual war leads diplomatic newspaper stories');
});

test('Kirkuk concession conflicts follow the actual oilfield and the surviving Persian relationship',()=>{
  const t=linked('Oil district');t.cells[0].city='Kirkuk';
  assert.equal(event(build([t]),'Tehran’s Oil Demands Divide the Kirkuk Cabinet')?.kind,'crisis');
  const treaty={...t,status:'Independent state',relationship:'Treaty association'};
  assert.equal(event(build([treaty]),'Kirkuk Assembly Reserves the Oil Royalties')?.kind,'accord');
  const nameOnly={...t,name:'Kirkuk',cells:t.cells.map(c=>({...c,city:undefined}))};
  assert.equal(event(build([nameOnly]),'Tehran’s Oil Demands Divide the Kirkuk Cabinet'),undefined);
  assert.equal(event(build([{...t,status:'Direct colonial administration'}]),'Tehran’s Oil Demands Divide the Kirkuk Cabinet'),undefined);
});

test('Persian newspaper dispatches respect the 1925 accession and stop at 1939 neutrality',()=>{
  const t=linked('Eastern March',4,1,{status:'Independent state',relationship:'Treaty association'}),h=build([t]);
  const accession=event(h,'Pahlavi Accession Brings a Review of Persia’s Foreign Agreements');
  assert.equal(accession?.year,1925);assert.match(accession.text,/Reza Khan becomes shah/);
  const neutrality=event(h,'Iran Declares Neutrality; Treaty Partners Review Military Passage');
  assert.equal(neutrality?.year,1939);assert.equal(neutrality.kind,'dispatch');
  assert.ok(h.events.every(e=>e.year>=1918&&e.year<=1939));
  assert.ok(!h.events.some(e=>/1941|Anglo-Soviet invasion/.test(e.text)));
  const remote={...t,cells:t.cells.map(c=>({...c,nearPersia:false}))};
  assert.equal(event(build([remote]),neutrality.key),undefined);
  assert.deepEqual(score(h,[t]),score({...h,events:h.events.filter(e=>e.kind!=='dispatch')},[t]));
});

test('Persian histories are deterministic despite list order, save IDs and map colours',()=>{
  const ts=[linked('Eastern March'),linked('Commercial partner',3,100,{status:'Independent state',relationship:'Treaty association'})];
  const a=build(ts),b=build([...ts].reverse().map((t,i)=>({...t,id:900+i,color:'red',cells:[...t.cells].reverse()})));
  assert.equal(a.seed,b.seed);assert.deepEqual(a.events,b.events);assert.deepEqual(a.highlights,b.highlights);assert.deepEqual(score(a,ts),score(b,ts));
  const extra=territory('Unrelated coast',[cell(9999)],{status:'Independent state',power:'',relationship:'None'});
  const arc=h=>h.events.filter(e=>Object.values(key).includes(e.key)&&e.affected.includes('Eastern March'));
  assert.deepEqual(arc(a),arc(build([extra,...ts])));
});

test('Browser engine and server league preview compute the same Persia outcomes and score',async()=>{
  const {proposalInput,leagueRequest}=await import('../worker/league.mjs');
  const ts=[linked('Eastern March'),linked('Commercial partner',3,100,{status:'Independent state',relationship:'Treaty association'})];
  const hexes=ts.flatMap(t=>t.cells),bytes=new Uint8Array(200);
  ts.forEach((t,i)=>t.cells.forEach(c=>bytes[c.i]=i+1));
  const proposal={version:3,territories:ts.map(({cells,components,...t})=>t),assignments:Buffer.from(bytes).toString('base64')};
  const input=proposalInput(proposal,hexes),sandbox={window:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../chronicle.js'),'utf8'),sandbox);
  const browser=sandbox.window.FrontiersChronicle,history=browser.build(input),expected=clone(browser.score(history,input));
  assert.deepEqual(clone(history),clone(build(input)));
  const env={DB:{prepare(sql){assert.match(sql,/^SELECT /,'preview cannot write the league');return {async all(){return {results:[]};}};}}};
  const request=new Request('https://game.test/api/league',{method:'POST',headers:{origin:'https://game.test','content-type':'application/json'},body:JSON.stringify({action:'preview',proposal,score:999})});
  const response=await leagueRequest(request,env,hexes,engine);
  assert.equal(response.status,200);const result=await response.json();
  assert.deepEqual(result.score,expected);assert.deepEqual(result.rows,[]);assert.ok(expected.total<=100);
});
