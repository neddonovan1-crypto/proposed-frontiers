const test = require('node:test');
const assert = require('node:assert/strict');
const {build, score} = require('../chronicle.js');

const cell = (i, extra = {}) => ({i, area:10, shiaArea:0, neighbours:[], lat:31, lon:40, ...extra});
const territory = (name, status, cells, extra = {}) => ({name, status, cells, power:'', relationship:'None', sect:null, components:1, ...extra});
const event = (history, key) => history.events.find(e => e.key === key);
const outcome = (history, name) => history.outcomes.find(o => o.name === name);
const straitsKey = 'Straits Convention Ratified; Sultan Retains His Capital';

test('Hellenic Anatolia needs an Anatolian grant of at most thirty hexes and a durable protector', () => {
 const land=n=>Array.from({length:n},(_,i)=>cell(i+1,{anatolia:true,lon:27,lat:38.5,...(i?{}:{city:'Smyrna',port:true})}));
 const grant=(cells,status='Protectorate',power='Greece')=>territory('Hellenic Anatolia',status,cells,{power});
 const intact=t=>build([t]).outcomes[0].intact;
 assert.equal(intact(grant(land(30))),true);
 assert.equal(intact(grant(land(31))),false);
 assert.equal(intact(grant([...land(20),cell(99,{anatolia:false,lon:37.17,lat:36.01})])),false);
 assert.equal(intact(grant(land(20),'Independent state','')),false);
 assert.equal(intact(grant(land(20),'Protectorate','Russia')),false);
 for(const power of ['Greece','Britain','France','Italy']){
  const h=build([grant(land(20),'Protectorate',power)]);
  assert.ok(h.events.some(e=>e.affected.includes('Hellenic Anatolia')&&e.year<=1925));
  assert.ok(h.outcomes[0].intact,power);
 }
 const outcomes=['Greece','Britain','France','Italy'].map(power=>build([grant(land(20),'Protectorate',power)]).events.find(e=>e.affected.includes('Hellenic Anatolia')&&e.year<=1925&&e.year>1918).key);
 assert.equal(new Set(outcomes).size,4);
 assert.notEqual(build([grant(land(20),'Direct colonial administration','Greece')]).outcomes[0].fate,build([grant(land(20),'Protectorate','Greece')]).outcomes[0].fate);
});

test('A small Constantinople sultanate earns the Straits compromise at the twenty-cell boundary', () => {
  const cells = Array.from({length:20}, (_, i) => cell(i, {lon:28.9, lat:41, ...(i ? {} : {city:'Constantinople', port:true})}));
  const proposal = [territory('Ottoman Sultanate', 'Independent state', cells)];
  const history = build(proposal);
  assert.equal(event(history, straitsKey)?.kind, 'accord');
  assert.equal(outcome(history, 'Ottoman Sultanate').status, 'Constitutional sultanate');
  assert.equal(outcome(history, 'Ottoman Sultanate').intact, true);
  assert.ok(score(history, proposal).cooperation >= 5);
  for (const extra of [
    {cells:[...cells, cell(20, {lon:28.9, lat:41})]},
    {cells:cells.map((c, i) => i === 19 ? {...c, lon:40} : c)},
    {name:'Turkey'},
    {status:'Direct colonial administration', power:'Britain'},
    {cells:cells.map(c => ({...c, city:undefined}))}
  ]) assert.equal(event(build([{...proposal[0], ...extra}]), straitsKey), undefined);
});

test('Russian National Home protection, influence and treaty ties produce distinct crises without a duplicate guarantee collapse', () => {
  const cases = [
    ['Protectorate', 'None', 'Russian Protection Withdrawn from the National Home'],
    ['Independent state', 'Sphere of influence', 'Russian Credit Fails; National Home Council Takes Charge'],
    ['Independent state', 'Treaty association', 'National Home Seeks New Signatories']
  ];
  const crises = [];
  for (const [status, relationship, key] of cases) {
    const history = build([territory('Jewish National Home', status, [cell(1, {city:'Haifa', port:true})], {power:'Russia', relationship})]);
    const crisis = event(history, key);
    assert.ok(crisis);
    crises.push(crisis.text);
    assert.equal(event(history, 'The Russian guarantee vanishes'), undefined);
    assert.equal(event(history, 'A constitution for everyone inside the line'), undefined);
    assert.ok(event(history, 'National Home Charter Adopted After Russian Withdrawal'));
    const final = outcome(history, 'Jewish National Home');
    assert.equal(final.status, 'Self-governing state');
    assert.equal(final.power, '');
    assert.equal(final.relationship, 'None');
    assert.match(final.originalArrangement, /Russia/);
    assert.doesNotMatch(final.finalArrangement, /Russia/);
  }
  assert.equal(new Set(crises).size, 3);
});

test('The Ibadi neighbour article requires both Ibadi government and a cell near Oman', () => {
  const key = 'Nizwa Invites the New Imamate to Talks';
  const neighbour = territory('Hadhramaut', 'Imamate', [cell(1, {nearOman:true})], {sect:'Ibadi'});
  const history = build([neighbour]);
  assert.equal(event(history, key)?.kind, 'accord');
  assert.ok(history.people.some(p => p.name === 'Sulayman al-Baruni' && p.historical === true));
  assert.equal(event(build([{...neighbour, cells:[cell(1, {nearOman:false})]}]), key), undefined);
  assert.equal(event(build([{...neighbour, sect:'Shia'}]), key), undefined);
  assert.equal(event(build([{...neighbour, status:'Independent state'}]), key), undefined);
});

test('Every kind of Italian connection receives the post-1922 Mussolini article', () => {
  const cases = [
    ['Direct colonial administration', 'None'],
    ['Protectorate', 'None'],
    ['Autonomous territory', 'Treaty association'],
    ['Independent state', 'Sphere of influence'],
    ['Independent state', 'Treaty association'],
    ['Imamate', 'Sphere of influence']
  ];
  const ts = cases.map(([status, relationship], i) => territory('Italian connection ' + i, status, [cell(i + 1)], {power:'Italy', relationship, sect:status === 'Imamate' ? 'Sunni' : null}));
  const history = build(ts);
  const revision = event(history, 'Mussolini Calls for Revision of Italy’s Eastern Agreements');
  assert.ok(revision && revision.year > 1922);
  assert.deepEqual(new Set(revision.affected), new Set(ts.map(t => t.name)));
  assert.match(revision.text, /Mussolini/);
  assert.ok(history.events.filter(e => /Mussolini/.test(e.title + e.text)).every(e => e.year > 1922));
  assert.equal(event(build([{...ts[0], power:'France'}]), revision.key), undefined);
});

test('The Russian Smyrna republic depends on direct control of the port hex, not a name', () => {
  const key = 'Russian Administration at Smyrna Dissolved';
  const proposal = territory('Aegean district', 'Direct colonial administration', [cell(1, {city:'Smyrna', port:true})], {power:'Russia'});
  const history = build([proposal]);
  assert.ok(event(history, key));
  assert.ok(event(history, 'Refugee Ships Admitted to Smyrna; Harbour Convention Signed'));
  assert.equal(event(history, 'The Russian guarantee vanishes'), undefined);
  assert.equal(outcome(history, proposal.name).status, 'Republic');
  for (const extra of [
    {name:'Smyrna', cells:[cell(1, {city:'Beirut', port:true})]},
    {status:'Protectorate'},
    {power:'Italy'}
  ]) assert.equal(event(build([{...proposal, ...extra}]), key), undefined);
});

for (const city of ['Mecca', 'Medina']) {
  test('A National Home over ' + city + ' collapses and cannot receive a later success arc', () => {
    const proposal = [territory('Jewish National Home', 'Protectorate', [cell(1, {city}), cell(2, {city:'Jerusalem'})], {power:'Russia'})];
    const history = build(proposal);
    const final = outcome(history, 'Jewish National Home');
    assert.equal(final.intact, false);
    assert.equal(final.sovereign, false);
    assert.equal(final.status, 'Dissolved');
    assert.equal(final.power, '');
    assert.ok(event(history, 'Holy Cities Reject the National Home Administration'));
    const collapse = event(history, 'National Home Charter Revoked; Emergency Evacuation Ordered');
    assert.equal(collapse?.kind, 'dissolution');
    assert.ok(history.highlights.some(e => e.key === collapse.key));
    assert.ok(!history.events.some(e => e.affected.includes('Jewish National Home') && ['accord', 'prosperity', 'reform'].includes(e.kind)));
    assert.equal(history.stats.created, 1);
    assert.equal(history.stats.surviving, 0);
    assert.equal(score(history, proposal).durability, 0);
    assert.match(history.title, /Falls/);
    assert.ok(history.people.some(p => p.name === 'Chaim Weizmann' && p.historical === true));
  });
}

test('The survival fraction counts original political territories, excludes shared land and subtracts dissolved states', () => {
  const proposal = [
    territory('Jewish National Home', 'Independent state', [cell(1, {city:'Mecca'})]),
    territory('International City', 'International administration', [cell(2, {city:'Jerusalem'})]),
    territory('Armenia', 'Autonomous territory', [cell(3)], {power:'Russia', relationship:'Treaty association'}),
    territory('Shared Grazing Territory', 'Unsettled frontier / shared rights', [cell(4)])
  ];
  const history = build(proposal);
  assert.equal(history.stats.created, 3);
  assert.equal(history.stats.surviving, 2);
  assert.equal(history.stats.surviving, history.outcomes.filter(o => o.originalStatus !== 'Unsettled frontier / shared rights' && o.intact).length);
  assert.match(history.deck, /2 of 3 states/);
  assert.equal(score(history, proposal).created, 3);
  assert.equal(score(history, proposal).surviving, 2);
});

test('Government transitions preserve the original association but remove a fallen Russian guarantor from the final form', () => {
  const ts = [
    territory('Armenia', 'Autonomous territory', [cell(1)], {power:'Russia', relationship:'Treaty association'}),
    territory('Cilicia', 'Protectorate', [cell(2)], {power:'Russia'}),
    territory('Mesopotamia', 'Direct colonial administration', [cell(3)], {power:'Russia'})
  ];
  const history = build(ts);
  for (const final of history.outcomes) {
    assert.match(final.originalArrangement, /Russia|Russian/);
    assert.equal(final.finalArrangement, 'Republic');
    assert.equal(final.power, '');
    assert.equal(final.relationship, 'None');
    assert.notEqual(final.originalArrangement, final.finalArrangement);
  }
});

test('Lives Changed contains at most four real figures, selected across years and tied to the map', () => {
  const ts = [
    territory('Ottoman Sultanate', 'Independent state', [cell(1, {city:'Constantinople', lat:41, lon:29})]),
    territory('Turkey', 'Independent state', [cell(2, {city:'Angora'})]),
    territory('Jewish National Home', 'Protectorate', [cell(3, {city:'Haifa', port:true})], {power:'Russia'}),
    territory('Hadhramaut', 'Imamate', [cell(4, {nearOman:true})], {sect:'Ibadi'}),
    territory('Syria', 'Independent state', [cell(5, {city:'Damascus'})]),
    territory('Iraq', 'Protectorate', [cell(6, {city:'Baghdad'})], {power:'Britain'})
  ];
  const history = build(ts);
  const names = new Set(['Mehmed VI', 'Mustafa Kemal', 'Faisal ibn Hussein', 'Gertrude Bell', 'Chaim Weizmann', 'Sulayman al-Baruni', 'Halide Edib', 'Sabiha Gökçen', 'Mary Ajami', 'Celadet Bedirkhan', 'Sati al-Husri', 'Karimeh Abbud']);
  assert.equal(history.people.length, 4);
  assert.ok(history.people.every(p => names.has(p.name) && p.historical === true));
  assert.ok(history.people.every(p => ts.some(t => t.name === p.territory)));
  assert.equal(new Set(history.people.map(p => p.name)).size, 4);
  assert.ok(history.people.every(p => p.year >= 1918 && p.year <= 1939));
  assert.ok(history.people.every(p => p.story[1].startsWith('In your settlement,')));
  assert.ok(history.people.every(p => p.story.length === 2 && p.story.every(paragraph => paragraph.length > 120)));
  assert.deepEqual(history.people, build([...ts].reverse()).people);
  assert.equal(build([territory('Unrelated inland territory', 'Independent state', [cell(80)])]).people.length, 0);
});
