const fs=require('node:fs'),zlib=require('node:zlib');
const {hexes,play}=require('./common.cjs');
(async()=>{
 const cohort=JSON.parse(zlib.gunzipSync(fs.readFileSync(__dirname+'/rules4-results.json.gz'))).sets.adapted.runs;
 let best=cohort.slice().sort((a,b)=>b.score.total-a.score.total)[0];const runs=[],seen=new Set();
 const options=[{status:'Independent state',power:'',relationship:'None'},{status:'Independent state',power:'Britain',relationship:'Treaty association'},{status:'Protectorate',power:'Britain',relationship:'None'},{status:'Autonomous territory',power:'Britain',relationship:'Treaty association'},{status:'Autonomous territory',power:'Turkey',relationship:'Treaty association'},{status:'Autonomous territory',power:'Syria',relationship:'Treaty association'},{status:'Autonomous territory',power:'Nejd',relationship:'Treaty association'},{status:'Imamate',sect:'Ibadi',power:'Britain',relationship:'Treaty association'}];
 const seeds=cohort.slice().sort((a,b)=>b.score.total-a.score.total).slice(0,5);
 for(const seed of seeds){let current=seed;for(const name of ['Syria','Mesopotamia','Hejaz','Nejd','Jebel Shammar','Asir','Hadhramaut','Palestine','Transjordan'])for(const option of options){
  const p=structuredClone(current.proposal),t=p.territories.find(t=>t.name===name);Object.assign(t,{sect:null},option);if(t.name===t.power)continue;
  const fingerprint=JSON.stringify(p);if(seen.has(fingerprint))continue;seen.add(fingerprint);
  const bytes=Buffer.from(p.assignments,'base64');try{const r=await play('search-'+(runs.length+1),p.territories,hexes.map(c=>bytes[c.i]));const accepted=r.score.total>current.score.total;runs.push({label:r.label,from:current.label,change:{name,...option},accepted,score:r.score,stats:r.stats,proposal:r.proposal,signature:r.signature});if(accepted)current=r;if(r.score.total>best.score.total)best=r;}catch(e){if(!/eligible treaty partner/.test(e.message))throw e;}
 }}
 const result={ruleset:4,method:'Bounded greedy policy search on the five highest-scoring unchanged adapted geographical maps. No map coordinates changed and no reload reroll. Each candidate changes one legal status or partner; only score improvements are retained for subsequent steps. Invalid self-associations or ineligible parent assignments are excluded before scoring. This is an optimisation run, not a representative player cohort or proof of a global optimum.',evaluated:runs.length,best,runs};
 fs.writeFileSync(__dirname+'/rules4-search-results.json.gz',zlib.gzipSync(JSON.stringify(result))); 
 console.log(JSON.stringify({evaluated:runs.length,best:{score:best.score,stats:best.stats,signature:best.signature,territories:best.proposal.territories,components:best.components,negative:best.events.filter(e=>['war','uprising','crisis','dissolution','annexation'].includes(e.kind))}},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
