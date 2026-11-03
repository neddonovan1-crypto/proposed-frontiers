const fs=require('node:fs');
const {hexes,play,summarize}=require('./common.cjs'),{make}=require('./deliberate.cjs');
const byId=new Map(hexes.map((c,i)=>[c.i,{...c,index:i}]));
function adapted(i){
 const d=make(61000+i,'linked_autonomy'),z=d.territories.findIndex(t=>t.name==='Zaydistan')+1,m=d.territories.findIndex(t=>t.name==='Mesopotamia')+1;
 const allowable=new Set(hexes.filter((c,j)=>d.owners[j]===z).map(c=>c.i)),start=hexes.find(c=>c.city==='Najaf');
 const kept=new Set([start.i]),count=20+(i%11);
 while(kept.size<count){
  const candidates=new Set([...kept].flatMap(id=>byId.get(id).neighbours).filter(id=>allowable.has(id)&&!kept.has(id)));
  const next=[...candidates].map(id=>byId.get(id)).sort((a,b)=>(b.shiaArea-a.shiaArea)||((Math.hypot(a.lon-start.lon,a.lat-start.lat))-(Math.hypot(b.lon-start.lon,b.lat-start.lat)))||a.i-b.i)[0];
  if(!next)throw Error('Cannot grow connected imamate');kept.add(next.i);
 }
 hexes.forEach((c,j)=>{if(d.owners[j]===z&&!kept.has(c.i))d.owners[j]=m;});
 const tr=d.territories.find(t=>t.name==='Transjordan');Object.assign(tr,{status:'Autonomous territory',power:'Britain',relationship:'Treaty association'});
 const h=d.territories.find(t=>t.name==='Hadhramaut');Object.assign(h,{status:'Independent state',power:'',relationship:'None',sect:null});
 const fraction=hexes.filter(c=>kept.has(c.i)).reduce((s,c)=>s+c.shiaArea,0)/hexes.reduce((s,c)=>s+c.shiaArea,0);
 if(fraction<.5||kept.size>35)throw Error('Compact Shia design failed stated objective');
 return {...d,imamateHexes:kept.size,shiaRepresentation:fraction};
}
(async()=>{
 // Generate and validate all 25 geographic/policy designs before any score is inspected.
 const designs=Array.from({length:25},(_,i)=>adapted(i)),runs=[];
 for(const d of designs){const r=await play('adapted-'+d.seed,d.territories,d.owners);runs.push({...r,seed:d.seed,imamateHexes:d.imamateHexes,shiaRepresentation:d.shiaRepresentation});}
 const summary=summarize(runs),data={method:'Separate adapted rules-3 cohort, not part of the paired before/after comparison. All 25 new designs prepared before scoring. Linked autonomy and transit plan with a connected 20–30-hex Shia imamate grown from Najaf by neighbouring mapped Shia area. Former imamate outskirts pass to Mesopotamia. Hadhramaut is independent. Transjordan receives a direct British treaty association to coordinate the Hejaz railway. No outcome-based selection.',generatedAt:new Date().toISOString(),summary,runs};
 fs.writeFileSync(__dirname+'/deliberate-adapted-results.json',JSON.stringify(data,null,2));
 fs.writeFileSync(__dirname+'/deliberate-adapted-report.md',`# Adapted deliberate playtests\n\n${data.method}\n\n25-run mean: **${summary.mean.toFixed(2)}/100**. Median ${summary.median}; range ${summary.min}–${summary.max}; p10 ${summary.p10}, p90 ${summary.p90}. Score components average: peace ${summary.meanPeace.toFixed(2)}/40, durability ${summary.meanDurability.toFixed(2)}/40, cooperation ${summary.meanCooperation.toFixed(2)}/20.\n\nAll proposals are valid complete maps. Every Shia imamate is one connected territory of 20–30 hexes and controls at least ${(100*Math.min(...runs.map(r=>r.shiaRepresentation))).toFixed(1)}% of mapped Iraqi Shia land. There is only one imamate per map. No current size or imamate-count limit is exceeded.\n\n|Seed|Score|Shia hexes|Shia coverage|Survive|\n|---:|---:|---:|---:|---:|\n${runs.map(r=>`|${r.seed}|${r.score.total}|${r.imamateHexes}|${(r.shiaRepresentation*100).toFixed(1)}%|${r.stats.surviving}/${r.stats.created}|`).join('\n')}\n`);
 console.log(JSON.stringify({summary,allScores:runs.map(r=>r.score.total),minimumShia:Math.min(...runs.map(r=>r.shiaRepresentation)),components:[...new Set(runs.map(r=>r.components.find(t=>t.name==='Zaydistan').components))]},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
