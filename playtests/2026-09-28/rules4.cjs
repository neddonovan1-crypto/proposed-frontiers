const fs=require('node:fs'),zlib=require('node:zlib');
const {hexes,play,summarize}=require('./common.cjs');
async function evaluate(r){const bytes=Buffer.from(r.proposal.assignments,'base64');return {...await play(r.label,r.proposal.territories,hexes.map(c=>bytes[c.i])),beforeScore:r.score,beforeStats:r.stats};}
(async()=>{
 const sets={blind:'blind-after-results.json',adapted:'deliberate-adapted-results.json'},output={ruleset:4,method:'Exact saved 200 blind and 25 adapted deliberate proposals, rescored without selecting or modifying maps. Automated canonical full-map engine trials, not physical clicks.',sets:{}};
 for(const [key,file]of Object.entries(sets)){const old=JSON.parse(fs.readFileSync(__dirname+'/'+file)),runs=[];for(const r of old.runs)runs.push(await evaluate(r));output.sets[key]={summary:summarize(runs),withWars:runs.filter(r=>r.stats.wars).length,withLosses:runs.filter(r=>r.stats.surviving<r.stats.created).length,runs};}
 fs.writeFileSync(__dirname+'/rules4-results.json.gz',zlib.gzipSync(JSON.stringify(output))); 
 console.log(JSON.stringify(Object.fromEntries(Object.entries(output.sets).map(([k,v])=>[k,{...v.summary,withWars:v.withWars,withLosses:v.withLosses}])),null,2));
})().catch(e=>{console.error(e);process.exit(1)});
