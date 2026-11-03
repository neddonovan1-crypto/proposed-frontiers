const test = require('node:test');
const assert = require('node:assert/strict');
const {build, score} = require('../chronicle.js');

const cell = (i, extra={}) => ({i, area:10, neighbours:[], lon:29, lat:41, ...extra});
const cells = (n, start=0, extra={}) => Array.from({length:n}, (_, i) => cell(start+i, extra));
const territory = (name, cs, extra={}) => ({name, cells:cs, status:'Independent state', power:'', relationship:'None', components:1, ...extra});
const event = (h, key) => h.events.find(e => e.key === key);
const outcome = (h, name) => h.outcomes.find(o => o.name === name);
const largeKey = 'Provincial Congresses Reject Imperial Restoration';
const regionalKey = 'Turkey’s Provincial Assemblies Reject Central Rule';
const warKey = 'War of the Rival Turkish Governments';
const straitsKey = 'Straits Convention Ratified; Sultan Retains His Capital';

test('The enlarged Sultanate has a concrete negative at 21 cells; the 20-cell Constantinople compromise survives', () => {
  const t = territory('Ottoman Sultanate', cells(20));
  t.cells[0].city = 'Constantinople';
  const small = build([t]);
  assert.ok(event(small, straitsKey));
  assert.equal(event(small, largeKey), undefined);
  const big = {...t, cells:[...t.cells, cell(20)]}, h = build([big]);
  assert.equal(event(h, largeKey).kind, 'uprising');
  assert.deepEqual(event(h, largeKey).affected, ['Ottoman Sultanate']);
  assert.equal(event(h, straitsKey), undefined);
  assert.equal(outcome(h, t.name).fate, 'Dynasty overthrown');
  assert.ok(score(h, [big]).peace < score(small, [t]).peace);
  for (const status of ['Protectorate','Direct colonial administration','Autonomous territory']) {
    assert.ok(event(build([{...big,status,power:'France'}]), largeKey), status);
  }
});

const regional = () => territory('Turkey', [
  ...cells(10, 0, {ethnicity:[3,3,0,0,0,0,0]}),
  ...cells(4, 10, {ethnicity:[0,10,0,0,0,0,0]})
]);
test('Turkey regional rule includes exactly 30% known area and ten qualifying cells, excluding mixed and sparse area', () => {
  const t = regional(), h = build([t]), e = event(h, regionalKey);
  assert.equal(e.kind, 'uprising');
  assert.deepEqual(e.affected, ['Turkey']);
  assert.doesNotMatch(e.cause, /threshold|mapped area units|population counts/);
  assert.match(e.text, /central ministry|regional councils/);
  assert.equal(outcome(h,'Turkey').status, 'Federation');
  const mixed = {...t, cells:t.cells.map(c => ({...c, ethnicity:[...c.ethnicity.slice(0,5),1e6,1e6]}))};
  assert.ok(event(build([mixed]), regionalKey));
  for (const category of [0,2,3,4]) {
    const clone = regional();
    clone.cells.slice(0,10).forEach(c => {c.ethnicity=[0,3,0,0,0,0,0];c.ethnicity[category]=3;});
    assert.ok(event(build([clone]), regionalKey), 'category '+category);
  }
});
test('Turkey regional rule excludes subthreshold area, nine cells, unknown land and separately assigned autonomies', () => {
  const below = regional();below.cells[10].ethnicity[1] += .01;
  const nine = territory('Turkey', [...cells(9,0,{ethnicity:[3,3,0,0,0,0,0]}),cell(9,{ethnicity:[0,36,0,0,0,0,0]})]);
  const unknown = territory('Turkey', cells(30,0,{ethnicity:[0,0,0,0,0,999,999]}));
  const small = territory('Turkey', cells(9,0,{ethnicity:[99,0,0,0,0,0,0]}));
  for (const t of [below,nine,unknown,small,territory('Turkey',cells(30))]) assert.equal(event(build([t]), regionalKey),undefined);
  const turkish = territory('Turkey', cells(30,0,{ethnicity:[0,10,0,0,0,0,0]}));
  const autonomy = territory('Kurdistan',cells(30,100,{ethnicity:[0,0,10,0,0,0,0]}),{status:'Autonomous territory',power:'Turkey'});
  assert.equal(event(build([turkish,autonomy]),regionalKey),undefined);
});

function rivals(tn=21,sn=20,extra={}) {
  const s=territory('Ottoman Sultanate',cells(sn,100),extra);s.cells[0].city='Constantinople';
  return [territory('Turkey',cells(tn)),s];
}
test('Rival-government war uses strict Turkey >20 and Sultanate >=20 boundaries', () => {
  for (const [tn,sn,war] of [[20,20,false],[21,19,false],[21,20,true],[21,21,true]]) {
    const h=build(rivals(tn,sn));assert.equal(!!event(h,warKey),war,`${tn}/${sn}`);
    if(war){assert.equal(outcome(h,'Ottoman Sultanate').intact,false);assert.equal(outcome(h,'Turkey').intact,true);assert.equal(event(h,straitsKey),undefined);}
  }
});
test('Only British or French spheres and treaty associations reverse the civil-war winner', () => {
  for(const power of ['Britain','France','Russia','Italy'])for(const relationship of ['None','Sphere of influence','Treaty association']){
    const ts=rivals(21,20,{power,relationship,status:'Protectorate'}),h=build(ts);
    const backed=['Britain','France'].includes(power)&&relationship!=='None';
    const winner=backed?'Ottoman Sultanate':'Turkey',loser=backed?'Turkey':'Ottoman Sultanate';
    assert.equal(outcome(h,loser).intact,false,`${power}/${relationship}`);
    assert.equal(outcome(h,loser).status,'Annexed');
    assert.equal(outcome(h,loser).successor,'Province of '+winner);
    assert.equal(outcome(h,loser).annexedBy,winner);
    assert.deepEqual(outcome(h,winner).annexed,[loser]);
    assert.equal(h.stats.surviving,1);
    assert.ok(!h.events.some(e=>e.year>1922&&e.affected.includes(loser)));
  }
});
test('The victor inherits autonomous associations and the loser’s marked ports for 1939 dispatches', () => {
  const ts=rivals();ts[1].cells[0].port=true;
  ts.push(territory('Kurdistan',cells(2,200),{status:'Autonomous territory',power:'Ottoman Sultanate',relationship:'Treaty association'}));
  const h=build(ts),autonomy=outcome(h,'Kurdistan');
  assert.equal(autonomy.power,'Turkey');
  assert.match(autonomy.finalArrangement,/Turkey/);
  assert.match(autonomy.originalArrangement,/Ottoman Sultanate/);
  assert.ok(event(h,'Autonomous Charter Confirmed After the Civil War'));
  const freight=event(h,'Winter Freight Agreement Saves the Grain Sailings');
  assert.ok(freight);assert.deepEqual(freight.affected,['Turkey']);assert.match(freight.text,/Constantinople/);
});

test('The 1939 dispatches use final surviving governments and preserve the score', () => {
  const ts=[territory('Italian partner',[cell(1)],{status:'Protectorate',power:'Italy'}),territory('Russian grant',[cell(2)],{status:'Protectorate',power:'Russia'}),territory('City',[cell(3,{city:'Jerusalem'})],{status:'International administration'})];
  const h=build(ts),dispatches=h.events.filter(e=>e.kind==='dispatch');
  assert.ok(dispatches.length>=3&&dispatches.length<=4);
  assert.ok(dispatches.every(e=>e.year===1939&&e.affected.every(n=>outcome(h,n).intact)));
  assert.ok(dispatches.some(e=>/Italy remains outside/.test(e.text)));
  assert.ok(dispatches.some(e=>/1 September; Britain and France enter the war on 3 September/.test(e.text)));
  assert.ok(!dispatches.some(e=>/Russian (guarantor|governor|patron)/.test(e.text)));
  assert.deepEqual(score(h,ts),score({...h,events:h.events.filter(e=>e.kind!=='dispatch')},ts));
  assert.deepEqual(h.events,build([...ts].reverse()).events);
});
test('Headlines put wars and the loss of states before incidental reports', () => {
  const ts=rivals();ts.push(territory('International City',[cell(500,{city:'Jerusalem'})],{status:'International administration'}));
  const h=build(ts);
  assert.equal(h.highlights[0].key,warKey);
  const major=e=>['war','dissolution','annexation'].includes(e.kind);
  const majorReports=h.events.filter(major);
  assert.equal(h.highlights.filter(major).length,Math.min(3,majorReports.length));
  const firstMinor=h.highlights.findIndex(e=>!major(e));
  assert.ok(firstMinor<0||h.highlights.slice(firstMinor).every(e=>!major(e)));
  const peaceful=build([territory('International City',[cell(500,{city:'Jerusalem'})],{status:'International administration'})]);
  assert.ok(peaceful.highlights.length);
  assert.ok(peaceful.highlights.every(e=>!major(e)));
  const collapsed=build([territory('Hellenic Anatolia',[cell(700,{anatolia:true})]),...ts]);
  assert.ok(collapsed.highlights.some(e=>e.kind==='dissolution'));
  assert.ok(collapsed.highlights.filter(major).length>=2);
  assert.match(collapsed.title,/War/);
  const grant=territory('Hellenic Anatolia',[cell(700,{anatolia:true})]);
  assert.equal(build([grant]).title,'Hellenic Anatolia Dissolves');
  const commission=territory('Continental Commission',cells(41,800),{status:'International administration'});
  assert.equal(build([grant,commission]).title,'2 States Dissolve as the Settlement Breaks Apart');
  assert.ok(new Set(h.highlights.flatMap(e=>e.affected)).size>1);
  assert.deepEqual(h.highlights,build([...ts].reverse()).highlights);
  assert.deepEqual(score(h,ts),score({...h,events:h.events.map(e=>({...e,title:'A different display headline'}))},ts));
});

test('Arabian accord explains the actual owners and the exact shared connection', () => {
  const m=territory('Western court',[cell(1,{city:'Mecca',neighbours:[3]})],{power:'Britain'}),r=territory('Interior court',[cell(2,{city:'Riyadh',neighbours:[3]})],{power:'Britain'});
  const key='The wells before the crowns';
  assert.match(event(build([m,r]),key).cause,/Western court owns Mecca.*Interior court owns Riyadh.*Great Britain/);
  assert.match(event(build([{...m,power:r.name},{...r,power:''}]),key).cause,/directly associated/);
  const shared=territory('Shared Wells',[cell(3,{neighbours:[1,2]})],{status:'Unsettled frontier / shared rights'});
  assert.match(event(build([{...m,power:''},{...r,power:''},shared]),key).cause,/connected Shared Wells.*border with both/);
  assert.equal(event(build([{...m,power:''},{...r,power:''},{...shared,components:2}]),key),undefined);
});
test('Rail dispatches follow section tags, treaty connections and the actual Rayak junction', () => {
  const a=territory('Rail A',[cell(1,{railways:['anatolian-main','baghdad-samarra']})],{power:'Britain'}),b=territory('Rail B',[cell(2,{railways:['anatolian-main','baghdad-samarra']})],{power:'Britain'});
  const good=build([a,b]);
  assert.ok(event(good,'Anatolian Rail Offices Adopt a Common Freight Seal'));
  const samarra=event(good,'Samarra Grain Trains Receive a Regular Timetable');assert.match(samarra.text,/rails still end at Samarra/);
  assert.deepEqual(samarra.affected,['Rail A','Rail B']);
  assert.ok(event(build([a,{...b,power:'France'}]),'Anatolian Freight Held at the New Customs Posts'));
  assert.equal(event(build([a]),'Anatolian Rail Offices Adopt a Common Freight Seal'),undefined,'one tagged hex cannot assert control of the line');
  const ra=territory('Beirut office',[cell(3,{railways:['beirut-damascus'],railJunctions:['Rayak']})]),rb=territory('Northern office',[cell(4,{railways:['levant-north']})]);
  assert.ok(event(build([ra,rb]),'Rayak Transshipment Dispute Delays the Harvest'));
  assert.equal(event(build([{...ra,cells:ra.cells.map(c=>({...c,railJunctions:[]}))},rb]),'Rayak Transshipment Dispute Delays the Harvest'),undefined);
  const renamed=build([territory('Samarra railway',[cell(7)])]);
  assert.ok(!renamed.events.some(e=>/Samarra Grain Trains/.test(e.key)));
});
