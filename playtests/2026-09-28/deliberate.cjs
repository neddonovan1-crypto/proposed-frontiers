const fs=require('node:fs');
const {hexes,territory,rng,play,summarize}=require('./common.cjs');
const sourceRevision='c2ca839';
const strategies=[
 {key:'regional_independence',name:'Regional independence',description:'Independent regional states, a Shia imamate in lower Iraq, internationally administered Jerusalem and Jeddah, no common foreign guarantor. Broad geographic regions with modest boundary variations.'},
 {key:'linked_autonomy',name:'Linked autonomy and transit treaties',description:'Armenia and Kurdistan autonomous with Turkey; Palestine and Transjordan autonomous with Syria. Syria, Hejaz, Nejd, Jebel Shammar and the Iraqi administrations use British treaty associations to keep divided routes open; lower Iraq is a Shia imamate.'},
 {key:'limited_protection',name:'Limited British and French protection',description:'A French-protected Syria and British-protected Hejaz and Nejd, with nearby Palestinian and Transjordanian autonomy linked to Syria. Turkey retains Armenian and Kurdish autonomies; lower Iraq is a Shia imamate.'},
 {key:'rules_aware_imamates',name:'Rules-aware religious and treaty settlement',description:'A secular Turkey with Armenian and Kurdish autonomies, Sunni imamates for the Arab regional governments, Shia lower Iraq and an Ibadi imamate toward Oman. British treaty associations coordinate routes without protectorate subsidies. This deliberately tests the favourable generic imamate branch.'}
];
function make(seed,strategy,options={}){
 const rand=rng(seed),vary=(base,spread)=>base+(rand()-.5)*spread;
 const b={anatolia:vary(36.8,.35),caucasus:vary(38.3,.35),east:vary(39.4,.35),kurd:vary(35.0,.35),iraq:vary(41.2,.4),shia:vary(33.55,.2),northArabia:vary(29.15,.3),levant:vary(32.9,.25),jordan:vary(35.65,.2),hejaz:vary(41.05,.5),shammar:vary(26.5,.5),shammarEast:vary(44,.5),south:vary(20.3,.4),asirEast:vary(43.4,.4),oman:vary(47.5,.5),omanNorth:vary(24,.4)};
 const ts=['Turkey','Armenia','Kurdistan','Syria','Mesopotamia','Zaydistan','Palestine','Transjordan','Hejaz','Nejd','Jebel Shammar','Asir','Hadhramaut','International City','Free Port'].map(n=>territory(n));
 const map=new Map(ts.map(t=>[t.name,t]));
 Object.assign(map.get('Zaydistan'),{status:'Imamate',sect:'Shia'});
 Object.assign(map.get('International City'),{status:'International administration'});
 Object.assign(map.get('Free Port'),{status:'International administration'});
 const relation=(name,power,status='Independent state')=>Object.assign(map.get(name),{status,power,relationship:'Treaty association'});
 if(strategy!=='regional_independence'){
  for(const n of ['Armenia','Kurdistan'])relation(n,'Turkey','Autonomous territory');
  for(const n of ['Palestine','Transjordan'])relation(n,'Syria','Autonomous territory');
  for(const n of ['Syria','Mesopotamia','Hejaz','Nejd','Jebel Shammar'])relation(n,'Britain');
  Object.assign(map.get('Zaydistan'),{power:'Britain',relationship:'Treaty association'});
 }
 if(strategy==='limited_protection'){
  relation('Syria','France','Protectorate');
  for(const n of ['Hejaz','Nejd'])relation(n,'Britain','Protectorate');
 }
 if(strategy==='rules_aware_imamates'){
  for(const n of ['Syria','Mesopotamia','Hejaz','Nejd','Jebel Shammar','Asir','Hadhramaut'])Object.assign(map.get(n),{status:'Imamate',sect:n==='Hadhramaut'?'Ibadi':'Sunni',power:'Britain',relationship:'Treaty association'});
  Object.assign(map.get('Turkey'),{power:'Britain',relationship:'Treaty association'});
 }
 const owners=hexes.map(c=>{
  if(c.city==='Jerusalem')return 'International City';
  if(c.city==='Jeddah')return 'Free Port';
  if(c.lat>=b.caucasus&&c.lon>=b.east)return 'Armenia';
  if(c.lat>=b.anatolia&&c.lon<b.east)return 'Turkey';
  if(c.lat>=b.kurd&&c.lon>=b.east)return 'Kurdistan';
  if(c.lat>=b.northArabia){
   if(c.lon>=b.iraq)return c.lat<b.shia?'Zaydistan':'Mesopotamia';
   if(c.lat>=b.levant)return 'Syria';
   return c.lon<b.jordan?'Palestine':'Transjordan';
  }
  if(c.lat<b.south&&c.lon<b.asirEast)return 'Asir';
  if(c.lon>b.oman&&c.lat<b.omanNorth)return 'Hadhramaut';
  if(c.lon<b.hejaz)return 'Hejaz';
  if(c.lat>b.shammar&&c.lon<b.shammarEast)return 'Jebel Shammar';
  return 'Nejd';
 });
 // The marked sacred sites and regional capitals anchor each arrangement.
 const anchors={Constantinople:'Turkey',Angora:'Turkey',Konya:'Turkey',Smyrna:'Turkey',Erzurum:'Armenia',Van:'Armenia',Diyarbekir:'Kurdistan',Mosul:'Kurdistan',Erbil:'Kurdistan',Kirkuk:'Kurdistan',Aleppo:'Syria',Beirut:'Syria',Damascus:'Syria',Baghdad:'Zaydistan',Najaf:'Zaydistan',Basra:'Zaydistan','Ma’an':'Transjordan',Haifa:'Palestine',Aqaba:'Transjordan','Ha’il':'Jebel Shammar',Medina:'Hejaz',Mecca:'Hejaz',Taif:'Hejaz',Riyadh:'Nejd'};
 hexes.forEach((c,i)=>{if(anchors[c.city])owners[i]=anchors[c.city];});
 if(options.mutate)options.mutate(ts,owners,b);
 const used=new Set(owners),filtered=ts.filter(t=>used.has(t.name));
 return {seed,boundaries:b,strategy,territories:filtered,owners:owners.map(n=>filtered.findIndex(t=>t.name===n)+1)};
}
async function run(){
 const designs=[];
 // The complete 100-proposal cohort is generated before the first score is inspected.
 for(let s=0;s<strategies.length;s++)for(let i=0;i<25;i++)designs.push(make(51000+s*1000+i,strategies[s].key));
 const results=[];
 for(const d of designs){const r=await play(d.strategy+'-'+d.seed,d.territories,d.owners);results.push({...r,seed:d.seed,strategy:d.strategy,boundaries:d.boundaries});}
 const groups=Object.fromEntries(strategies.map(s=>[s.key,summarize(results.filter(r=>r.strategy===s.key))]));
 const overall=summarize(results);
 const output={sourceRevision,method:'Automated complete-map playthroughs through the current UI rules and canonical map metadata, then the same validation and results engine as the live game. Not physical mouse-click sessions. Rules-aware designs; exactly 25 pre-generated variants per strategy; no cohort selection by score.',generatedAt:new Date().toISOString(),strategies,overall,groups,runs:results};
 fs.writeFileSync(__dirname+'/deliberate-results.json',JSON.stringify(output,null,2));
 const table=['|Strategy|n|Mean|Median|Min–max|P10–P90|Peace /40|Durability /40|Cooperation /20|','|---|---:|---:|---:|---:|---:|---:|---:|---:|',...strategies.map(s=>{const a=groups[s.key],f=n=>n.toFixed(1);return `|${s.name}|${a.n}|${f(a.mean)}|${f(a.median)}|${a.min}–${a.max}|${f(a.p10)}–${f(a.p90)}|${f(a.meanPeace)}|${f(a.meanDurability)}|${f(a.meanCooperation)}|`;})];
 const report=`# Deliberate playtests\n\nRevision: ${sourceRevision}. Full proposals and seeds: deliberate-results.json.\n\n${output.method}\n\n${table.join('\n')}\n\nOverall mean: **${overall.mean.toFixed(2)}/100**; median ${overall.median}, range ${overall.min}–${overall.max}; p10 ${overall.p10}, p90 ${overall.p90}. All 100 proposals are included.\n\n## Strategies\n\n${strategies.map(s=>`- **${s.name}:** ${s.description}`).join('\n')}\n\n## Reproducible examples\n\n${strategies.map(s=>{const rs=results.filter(r=>r.strategy===s.key).sort((a,b)=>b.score.total-a.score.total);const best=rs[0],middle=rs[Math.floor(rs.length/2)];return `- ${s.name}: median example ${middle.label}, score ${middle.score.total}, edition ${middle.signature}; best ${best.label}, score ${best.score.total}, edition ${best.signature}.`;}).join('\n')}\n`;
 fs.writeFileSync(__dirname+'/deliberate-report.md',report);
 await learning(results);
 console.log(JSON.stringify({overall,groups,examples:strategies.map(s=>{const a=results.filter(r=>r.strategy===s.key);return {strategy:s.key,best:a.sort((a,b)=>b.score.total-a.score.total)[0].label};})},null,2));
}

async function learning(cohort){
 const baseline=make(51000,'regional_independence');
 let best={territories:structuredClone(baseline.territories),owners:[...baseline.owners]},bestScore=-1;
 const relation=(ts,n,power,status='Independent state')=>Object.assign(ts.find(t=>t.name===n),{status,power,relationship:'Treaty association',sect:status==='Imamate'?'Sunni':null});
 const imam=(ts,n,sect='Sunni')=>Object.assign(ts.find(t=>t.name===n),{status:'Imamate',sect,power:'Britain',relationship:'Treaty association'});
 const steps=[
  ['Initial regional proposal',()=>{}],
  ['Link Syria to British transit treaties',ts=>relation(ts,'Syria','Britain')],
  ['Link Transjordan to British transit treaties',ts=>relation(ts,'Transjordan','Britain')],
  ['Link Hejaz to British transit treaties',ts=>relation(ts,'Hejaz','Britain')],
  ['Link Nejd to British transit treaties',ts=>relation(ts,'Nejd','Britain')],
  ['Link Jebel Shammar to British transit treaties',ts=>relation(ts,'Jebel Shammar','Britain')],
  ['Link Mesopotamia to British transit treaties',ts=>relation(ts,'Mesopotamia','Britain')],
  ['Link the Shia imamate to the same transit treaty',ts=>Object.assign(ts.find(t=>t.name==='Zaydistan'),{power:'Britain',relationship:'Treaty association'})],
  ['Armenian autonomy with Turkey',ts=>relation(ts,'Armenia','Turkey','Autonomous territory')],
  ['Kurdish autonomy with Turkey',ts=>relation(ts,'Kurdistan','Turkey','Autonomous territory')],
  ['Palestinian autonomy with Syria',ts=>relation(ts,'Palestine','Syria','Autonomous territory')],
  ['Asir as Sunni imamate',ts=>imam(ts,'Asir')],
  ['Hadhramaut as Ibadi imamate',ts=>imam(ts,'Hadhramaut','Ibadi')],
  ['Syria as Sunni imamate',ts=>imam(ts,'Syria')],
  ['Mesopotamia as Sunni imamate',ts=>imam(ts,'Mesopotamia')],
  ['Hejaz as Sunni imamate',ts=>imam(ts,'Hejaz')],
  ['Nejd as Sunni imamate',ts=>imam(ts,'Nejd')],
  ['Jebel Shammar as Sunni imamate',ts=>imam(ts,'Jebel Shammar')],
  ['Transjordan as Sunni imamate',ts=>imam(ts,'Transjordan')],
  ['Palestinian autonomy directly associated with Britain',ts=>relation(ts,'Palestine','Britain','Autonomous territory')],
  ['Turkey in British treaty association',ts=>relation(ts,'Turkey','Britain')],
  ['Compare French protectorate in Syria',ts=>relation(ts,'Syria','France','Protectorate')],
  ['Compare Armenian independent Russian treaty',ts=>relation(ts,'Armenia','Russia')],
  ['Compare Kurdish independent British treaty',ts=>relation(ts,'Kurdistan','Britain')],
  ['Try fully coordinated religious and treaty arrangement',ts=>{const target=make(54000,'rules_aware_imamates');ts.splice(0,ts.length,...target.territories);return target.owners;}],
  ['Remove the railway treaty mismatch through Transjordan',ts=>relation(ts,'Transjordan','Britain','Autonomous territory')],
  ['Compare protectorate in Hejaz',ts=>relation(ts,'Hejaz','Britain','Protectorate')],
  ['Compare Sufi imamate in Hejaz',ts=>imam(ts,'Hejaz','Sufi')],
  ['Compare independent Hadhramaut',ts=>relation(ts,'Hadhramaut','Britain')],
  ['Retain a reduced Ottoman capital', (ts,owners)=>{ts.push(territory('Ottoman Sultanate'));const idx=ts.length;const capital=hexes.find(c=>c.city==='Constantinople');const target=new Set([capital.i,...capital.neighbours]);hexes.forEach((c,i)=>{if(target.has(c.i)&&ts[owners[i]-1]?.name==='Turkey')owners[i]=idx;});}]
 ];
 const runs=[];
 for(let i=0;i<steps.length;i++){
  const [action,mutate]=steps[i],candidate=structuredClone(best),replacement=mutate(candidate.territories,candidate.owners);if(Array.isArray(replacement))candidate.owners=replacement;
  const r=await play('learning-'+String(i+1).padStart(2,'0'),candidate.territories,candidate.owners),accepted=r.score.total>=bestScore;
  if(accepted){best=candidate;bestScore=r.score.total;}
  runs.push({...r,step:i+1,action,accepted,bestSoFar:bestScore});
 }
 const file=__dirname+'/deliberate-results.json',data=JSON.parse(fs.readFileSync(file));
 data.learning={method:'Separate 30-attempt score-seeking sequence. Each change is applied to the best-so-far valid proposal; non-improving proposals remain in the record but are not retained. Attempt25 tests the previously discovered imamate strategy. Not included in the 100-run cohort mean.',n:runs.length,summary:summarize(runs),best:bestScore,runs};fs.writeFileSync(file,JSON.stringify(data,null,2));
 fs.appendFileSync(__dirname+'/deliberate-report.md',`
## Separate learning sequence

${data.learning.method}

All attempted scores: ${runs.map(r=>r.score.total).join(', ')}. Best after30 attempts: **${bestScore}/100**.

|Attempt|Action|Score|Retained|Best so far|
|---:|---|---:|---|---:|
${runs.map(r=>`|${r.step}|${r.action}|${r.score.total}|${r.accepted?'Yes':'No'}|${r.bestSoFar}|`).join('\n')}
`);
 console.log(JSON.stringify({learning:data.learning.summary,best:bestScore,allScores:runs.map(r=>r.score.total)}));
}

async function rescore(){
 const frozen=JSON.parse(fs.readFileSync(__dirname+'/deliberate-results.json','utf8'));
 const evaluate=async r=>{const bytes=Buffer.from(r.proposal.assignments,'base64');const next=await play(r.label,r.proposal.territories,hexes.map(c=>bytes[c.i]));return {...next,seed:r.seed,strategy:r.strategy,step:r.step,action:r.action,beforeScore:r.score,delta:next.score.total-r.score.total};};
 const runs=[];for(const r of frozen.runs)runs.push(await evaluate(r));
 const learning=[];for(const r of frozen.learning.runs)learning.push(await evaluate(r));
 const groups=Object.fromEntries(frozen.strategies.map(s=>[s.key,summarize(runs.filter(r=>r.strategy===s.key))]));
 const output={method:'Paired rescoring of the exact saved 100 cohort proposals and 30 learning proposals. No map, status, partner, name or boundary changes; no new optimization. Baseline remains in deliberate-results.json.',generatedAt:new Date().toISOString(),originalRevision:frozen.sourceRevision,overall:summarize(runs),groups,nonExploitStrategies:summarize(runs.filter(r=>r.strategy!=='rules_aware_imamates')),runs,learning:{summary:summarize(learning),runs:learning}};
 fs.writeFileSync(__dirname+'/deliberate-postfix-results.json',JSON.stringify(output,null,2));
 const table=['|Strategy|n|Before mean|After mean|Change|After range|','|---|---:|---:|---:|---:|---:|',...frozen.strategies.map(s=>{const a=groups[s.key],b=frozen.groups[s.key];return `|${s.name}|${a.n}|${b.mean.toFixed(2)}|${a.mean.toFixed(2)}|${(a.mean-b.mean).toFixed(2)}|${a.min}–${a.max}|`;})];
 fs.writeFileSync(__dirname+'/deliberate-postfix-report.md',`# Paired deliberate playtest results\n\n${output.method}\n\n${table.join('\n')}\n\nOverall: ${frozen.overall.mean.toFixed(2)} → ${output.overall.mean.toFixed(2)}. Conventional strategies: ${output.nonExploitStrategies.mean.toFixed(2)}.\n\nThe exact proposal that first scored 100 in the learning sequence now scores ${learning.find(r=>r.step===26).score.total}. All 30 original learning attempts were rescored; their after-fix mean is ${output.learning.summary.mean.toFixed(2)} and range ${output.learning.summary.min}–${output.learning.summary.max}. No post-fix search is included.\n`.replace(/\\n/g,'\n'));
 console.log(JSON.stringify({overall:output.overall,groups,learning:output.learning.summary,original100Now:learning.find(r=>r.step===26).score},null,2));
}
if(require.main===module)(process.argv.includes('--rescore')?rescore():run()).catch(e=>{console.error(e);process.exit(1)});
module.exports={make,strategies};
