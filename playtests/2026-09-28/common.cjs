const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),engine=require(root+'/chronicle.js');
const ethnic=require(root+'/ethnicity-metrics.json'),rails=require(root+'/railway-metrics.json');
const hexes=require(root+'/db/hexes.json').map(c=>({...c,ethnicity:ethnic[c.i],railways:rails[c.i]?.railways||[],railJunctions:rails[c.i]?.railJunctions||[]}));
const markup=fs.readFileSync(root+'/game.html','utf8'),oman=markup.match(/<path d="([^"]+)"[^>]+data-fixed-name="Muscat and Oman"/)[1];
const edges=oman.split('M').filter(Boolean).flatMap(r=>{const p=[...r.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m=>[+m[1],+m[2]]);return p.map((v,i)=>[v,p[(i+1)%p.length]]);});
for(const c of hexes){const x=400+(c.lon-43)*Math.PI/180*1110,y=400-1110*(Math.log(Math.tan(Math.PI/4+c.lat*Math.PI/360))-Math.log(Math.tan(Math.PI/4+28*Math.PI/360)));c.nearOman=edges.some(([a,b])=>{const dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-u*dx,y-a[1]-u*dy)<=18;});}
const names=['Turkey','Ottoman Sultanate','Syria','Mesopotamia','Zaydistan','Palestine','Transjordan','Mount Lebanon','Armenia','Kurdistan','Hejaz','Nejd','Jebel Shammar','Asir','Hadhramaut','Jewish National Home','Arab Federation','International City','Free Port','Shared Grazing Territory'];
const statuses=['Independent state','Autonomous territory','Direct colonial administration','Protectorate','International administration','Imamate','Unsettled frontier / shared rights'];
const rules={'Jewish National Home':['Independent state','Autonomous territory','Direct colonial administration','Protectorate','International administration'],'International City':['International administration'],'Free Port':['International administration'],'Shared Grazing Territory':['Unsettled frontier / shared rights','Direct colonial administration'],'Arab Federation':['Independent state','Autonomous territory','Imamate','Protectorate'],'Zaydistan':['Imamate']};
const powers=['Britain','France','Russia','Italy'];
const territory=(name,status='Independent state',extra={})=>({name,status,power:'',relationship:'None',sect:null,...extra});
function rng(seed){let n=seed>>>0;return ()=>{n+=0x6D2B79F5;let t=Math.imul(n^n>>>15,1|n);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
function proposal(territories,owners){const bytes=new Uint8Array(4000);hexes.forEach((c,i)=>bytes[c.i]=typeof owners==='function'?owners(c,i):owners[i]);return {version:3,territories,assignments:Buffer.from(bytes).toString('base64')};}
async function play(label,territories,owners){
 for(const t of territories){if(!names.includes(t.name))throw Error('Not a current UI preset: '+t.name);if(!(rules[t.name]||statuses).includes(t.status))throw Error('Illegal status for '+t.name);}
 const p=proposal(territories,owners),{proposalInput}=await import(root+'/worker/league.mjs'),input=proposalInput(p,hexes),history=engine.build(input),score=engine.score(history,input);
 return {label,proposal:p,score,signature:history.signature,stats:history.stats,title:history.title,events:history.events.map(e=>({year:e.year,key:e.key,kind:e.kind,affected:e.affected})),outcomes:history.outcomes,components:input.map(t=>({name:t.name,n:t.cells.length,components:t.components}))};
}
function summarize(runs){const nums=k=>runs.map(r=>r.score[k]).sort((a,b)=>a-b),mean=v=>v.reduce((a,b)=>a+b,0)/v.length,quant=(v,q)=>{const i=(v.length-1)*q,j=Math.floor(i);return v[j]+(v[Math.ceil(i)]-v[j])*(i-j);},v=nums('total'),avg=mean(v);return {n:runs.length,mean:avg,median:quant(v,.5),min:v[0],max:v[v.length-1],p10:quant(v,.1),p90:quant(v,.9),sd:Math.sqrt(mean(v.map(x=>(x-avg)**2))),zero:v.filter(x=>x===0).length,atLeast80:v.filter(x=>x>=80).length,meanPeace:mean(nums('peace')),meanDurability:mean(nums('durability')),meanCooperation:mean(nums('cooperation')),meanWars:mean(runs.map(r=>r.stats.wars)),meanCreated:mean(runs.map(r=>r.stats.created)),meanSurviving:mean(runs.map(r=>r.stats.surviving))};}
module.exports={root,hexes,names,statuses,rules,powers,territory,rng,play,summarize,proposal};
