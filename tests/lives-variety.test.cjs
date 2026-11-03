const test = require('node:test');
const assert = require('node:assert/strict');
const {build, score} = require('../chronicle.js');

const territory = (name, city, i, extra = {}) => ({
  id: i, name, status: 'Independent state', power: '', relationship: 'None',
  sect: null, color: '#739da8', components: 1,
  cells: [{i, city, neighbours: [], area: 1, lat: 33, lon: 38, port: ['Haifa', 'Beirut', 'Basra', 'Jeddah'].includes(city)}],
  ...extra
});
const proposal = () => [
  territory('Ottoman Sultanate', 'Constantinople', 1, {cells: [{i: 1, city: 'Constantinople', neighbours: [], lat: 41, lon: 29}]}),
  territory('Turkey', 'Angora', 2),
  territory('Jewish National Home', 'Haifa', 3, {status: 'Protectorate', power: 'Britain'}),
  territory('Oman', '', 4, {status: 'Imamate', sect: 'Ibadi', cells: [{i: 4, neighbours: [], nearOman: true}]}),
  territory('Syria', 'Damascus', 5),
  territory('Mesopotamia', 'Baghdad', 6, {status: 'Protectorate', power: 'Britain'}),
  territory('Mount Lebanon', 'Beirut', 7),
  territory('International City', 'Jerusalem', 8, {status: 'International administration'}),
  territory('Armenia', 'Van', 9, {cells: [{i: 9, city: 'Van', neighbours: [], ethnicity: [0, 0, 0, 0, 1], area: 1}]}),
  territory('Iranshahr', 'Basra', 10, {power: 'Persia', relationship: 'Treaty association'}),
  territory('Hejaz', 'Jeddah', 11)
];
const died = {
  'Reza Shah Pahlavi': 1944, 'Mehmed VI': 1926, 'Mustafa Kemal': 1938,
  'Faisal ibn Hussein': 1933, 'Gertrude Bell': 1926, 'Chaim Weizmann': 1952,
  'Sulayman al-Baruni': 1940, 'Khalil al-Sakakini': 1953, 'Wasif Jawhariyyeh': 1973,
  'Tawfiq Canaan': 1964, 'Karimeh Abbud': 1940, 'Mary Ajami': 1965,
  'Celadet Bedirkhan': 1951, 'Julia Tu’mah Dimashqiyya': 1954, 'Anbara Salam Khalidi': 1986,
  'Halide Edib': 1964, 'Sabiha Gökçen': 2001, 'Zabel Yesayan': 1943,
  'Mohammad-Taqi Bahar': 1951, 'Parvin Etesami': 1941, 'Ameen Rihani': 1940, 'Sati al-Husri': 1968
};
const withoutPeople = ({people, ...history}) => history;

test('Session seeds rotate the full eligible pool, keep four unique cards and preserve politics and scores', () => {
  const input = proposal(), baseline = build(input), seen = new Set(), selections = new Set();
  for (let i = 0; i < 128; i++) {
    const history = build(input, {peopleSeed: `session-${i}`});
    assert.equal(history.people.length, 4);
    assert.equal(new Set(history.people.map(p => p.name)).size, 4);
    assert.deepEqual(withoutPeople(history), withoutPeople(baseline));
    assert.deepEqual(score(history, input), score(baseline, input));
    selections.add(history.people.map(p => p.name).join('|'));
    for (const p of history.people) {
      seen.add(p.name);
      assert.ok(died[p.name], p.name);
      assert.ok(p.year >= 1918 && p.year <= 1939 && p.year < died[p.name], `${p.name}: ${p.year}`);
      assert.equal(p.historical, true);
      assert.equal(p.story.length, 2);
      assert.match(p.story[1], /^In your settlement,/);
      assert.ok(p.story.every(paragraph => paragraph.length > 120));
      assert.ok(input.some(t => t.name === p.territory));
    }
  }
  assert.equal(seen.size, 22, [...seen].join(', '));
  assert.ok(selections.size > 40, 'sessions should draw materially different combinations');
});

test('A session is repeatable, default server builds stay deterministic and proposal ordering is irrelevant', () => {
  const input = proposal();
  assert.deepEqual(build(input), build(input));
  assert.deepEqual(build(input, {peopleSeed: 'same-session'}), build(input, {peopleSeed: 'same-session'}));
  assert.deepEqual(build(input, {peopleSeed: 'same-session'}), build([...input].reverse(), {peopleSeed: 'same-session'}));
  assert.deepEqual(build(input, {peopleSeed: 0}), build(input, {peopleSeed: '0'}));
});

test('Local lives require the relevant city, community or political connection', () => {
  assert.equal(build([territory('Unrelated inland territory', 'Konya', 80)]).people.length, 0);
  const jerusalem = build([territory('Neutral city', 'Jerusalem', 81, {status: 'International administration'})]);
  assert.deepEqual(new Set(jerusalem.people.map(p => p.name)), new Set(['Khalil al-Sakakini', 'Wasif Jawhariyyeh', 'Tawfiq Canaan']));
  const beirut = build([territory('Port district', 'Beirut', 82)]);
  assert.deepEqual(new Set(beirut.people.map(p => p.name)), new Set(['Julia Tu’mah Dimashqiyya', 'Anbara Salam Khalidi']));
  assert.equal(build([territory('Armenia', 'Konya', 83)]).people.some(p => p.name === 'Zabel Yesayan'), false);
  assert.equal(build([territory('Iranshahr', 'Konya', 84)]).people.some(p => /Bahar|Etesami|Pahlavi/.test(p.name)), false);
  const coast = build([territory('Turkey', 'Smyrna', 85, {cells: [{i: 85, city: 'Smyrna', neighbours: [], anatolia: true}]})]);
  assert.doesNotMatch(coast.people.find(p => p.name === 'Mustafa Kemal').story[1], /Angora/);
});

test('Collapsed grants are described through successors at or after their actual end, without posthumous cards', () => {
  const cities = ['Damascus', 'Beirut', 'Angora', 'Jerusalem', 'Haifa', 'Jeddah'];
  for (const city of cities) {
    const t = territory('Hellenic Anatolia', city, 91, {status: 'Protectorate', power: 'Greece'});
    const history = build([t]);
    assert.equal(history.outcomes[0].intact, false);
    for (const p of history.people.filter(p => p.year >= history.outcomes[0].ended)) {
      assert.match(p.story[1], /fallen|disappeared|collapse|ceased|failed/);
      assert.doesNotMatch(p.story[1], /surviving dissolved|surviving annexed|surviving province/);
      assert.ok(p.year < died[p.name]);
    }
  }
});

test('Iranshahr is a canonical selectable name with ordinary political behavior', () => {
  const t = territory('  iranshahr  ', 'Konya', 101);
  const history = build([t]);
  assert.equal(history.outcomes[0].name, 'Iranshahr');
  assert.equal(history.outcomes[0].originalPower, '');
  assert.ok(!history.events.some(e => /Persian|Tehran/.test(e.key)));
});


test('A living Persian partner cannot appear to lose its relationship before the recorded withdrawal', () => {
  const t = territory('Shrine State', 'Najaf', 103, {
    status: 'Imamate', sect: 'Shia', power: 'Persia', relationship: 'Sphere of influence',
    cells: Array.from({length: 16}, (_, i) => ({i: 103 + i, city: i ? '' : 'Najaf', neighbours: [], nearPersia: true}))
  });
  const history = build([t]);
  const withdrawal = history.events.find(e => e.key === 'Shia Councils Defend Their Independence from Tehran');
  assert.equal(withdrawal.year, 1927);
  assert.equal(history.outcomes[0].intact, true);
  assert.equal(history.outcomes[0].power, '');
  const bahar = history.people.find(p => p.name === 'Mohammad-Taqi Bahar');
  const parvin = history.people.find(p => p.name === 'Parvin Etesami');
  assert.equal(bahar.year, withdrawal.year);
  assert.match(bahar.story[1], /has been withdrawn/);
  assert.ok(parvin.year >= withdrawal.year);
  assert.match(parvin.story[1], /has ended its Persian political connection/);
});
