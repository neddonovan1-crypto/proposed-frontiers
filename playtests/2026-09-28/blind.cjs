const fs=require('node:fs');
const {hexes,names,statuses,rules,powers,territory,rng,play,summarize}=require('./common.cjs');
const seedBase=0x19160928;
const protocol={engineCommit:'c2ca839',seedBase,n:200,modes:{coherent:100,haphazard:100},description:'Score-blind simulated completed maps, not browser clicks. All 200 proposals are generated and written before any engine result is examined.',politics:'4–12 unique presets; names uniform without replacement subject only to marked-port legality; status uniform among legal statuses; all four imamate sects equally likely; independent/imamate relationships 50% None, 25% Treaty association, 25% Sphere of influence; colonial power uniform; autonomy partner uniform among colonial powers and previously created eligible states.',geometry:{coherent:'Random distinct seed hexes, Euclidean Voronoi ownership using longitude scaled by cos(30 degrees).',haphazard:'600–1,000 random dabs: randomly selected polity and center, brush radii 0–3 adjacency steps, overwriting prior paint. Unpainted gaps completed by nearest painted cell. Any extinct polity is restored on its original seed hex.'},selection:'Exactly 100 seeds per mode. No score-based rejection, optimization, rerolls or early stopping.'};
const byId=new Map(hexes.map((c,i)=>[c.i,i]));
const neighbours=hexes.map(c=>c.neighbours.map(id=>byId.get(id)).filter(i=>i!==undefined));
const points=hexes.map(c=>[c.lon*Math.cos(Math.PI/6),c.lat]);
const distance=(i,j)=>(points[i][0]-points[j][0])**2+(points[i][1]-points[j][1])**2;
function generate(mode,index){
 const seed=(seedBase+index+(mode==='haphazard'?10000:0))>>>0,r=rng(seed),int=n=>Math.floor(r()*n),pick=a=>a[int(a.length)],n=4+int(9),anchors=[];
 while(anchors.length<n){const i=int(hexes.length);if(!anchors.includes(i))anchors.push(i);}
 let owners=new Array(hexes.length).fill(0),dabs=0,coverageRepairs=0,emptyRepairs=0;
 if(mode==='coherent')owners=hexes.map((c,i)=>{let best=0;for(let j=1;j<n;j++)if(distance(i,anchors[j])<distance(i,anchors[best]))best=j;return best+1;});
 else{
  dabs=600+int(401);
  for(let k=0;k<dabs;k++){
   const owner=1+int(n),center=int(hexes.length),radius=int(4),seen=new Set([center]);let front=[center];
   for(let step=0;step<radius;step++){const next=[];for(const c of front)for(const neighbour of neighbours[c])if(!seen.has(neighbour)){seen.add(neighbour);next.push(neighbour);}front=next;}
   for(const c of seen)owners[c]=owner;
  }
  const painted=owners.flatMap((v,i)=>v?[i]:[]);
  for(let i=0;i<owners.length;i++)if(!owners[i]){coverageRepairs++;let nearest=painted[0];for(const j of painted)if(distance(i,j)<distance(i,nearest))nearest=j;owners[i]=owners[nearest];}
  const counts=new Array(n).fill(0);owners.forEach(v=>counts[v-1]++);
  for(let j=0;j<n;j++)if(!counts[j]){emptyRepairs++;let at=anchors[j];if(counts[owners[at]-1]===1)at=owners.findIndex(v=>counts[v-1]>1);counts[owners[at]-1]--;owners[at]=j+1;counts[j]++;}
 }
 const available=names.slice(),ts=[],rejections={inlandFreePort:0};
 for(let j=0;j<n;j++){
  let name;
  for(;;){name=pick(available);if(name!=='Free Port'||hexes.some((c,i)=>owners[i]===j+1&&c.port))break;rejections.inlandFreePort++;}
  available.splice(available.indexOf(name),1);
  const status=pick(rules[name]||statuses),t=territory(name,status);
  if(status==='Imamate')t.sect=pick(['Sunni','Shia','Ibadi','Sufi']);
  if(['Protectorate','Direct colonial administration'].includes(status))t.power=pick(powers);
  if(['Independent state','Imamate'].includes(status)){const relation=r();if(relation>=.5){t.relationship=relation<.75?'Treaty association':'Sphere of influence';t.power=pick(powers);}}
  if(status==='Autonomous territory'){t.relationship='Treaty association';t.power=pick([...powers,...ts.filter(p=>['Independent state','Imamate','Protectorate'].includes(p.status)).map(p=>p.name)]);}
  ts.push(t);
 }
 return {label:`blind-${mode}-${String(index+1).padStart(3,'0')}`,mode,seed,territories:ts,owners,generation:{territories:n,dabs,coverageRepairs,emptyRepairs,rejections}};
}
(async()=>{
 const generated=['coherent','haphazard'].flatMap(mode=>Array.from({length:100},(_,i)=>generate(mode,i)));
 const out={protocol,generatedAt:new Date().toISOString(),proposals:generated};
 fs.writeFileSync(__dirname+'/blind-results.json',JSON.stringify(out));
 const runs=[],failures=[];
 for(const p of generated){try{runs.push({...await play(p.label,p.territories,p.owners),mode:p.mode,seed:p.seed,generation:p.generation});}catch(e){failures.push({label:p.label,mode:p.mode,seed:p.seed,error:e.message});}}
 const groups=Object.fromEntries(['all','coherent','haphazard'].map(mode=>[mode,summarize(mode==='all'?runs:runs.filter(r=>r.mode===mode))]));
 const most=runs.slice().sort((a,b)=>b.score.total-a.score.total).slice(0,5),least=runs.slice().sort((a,b)=>a.score.total-b.score.total).slice(0,5);
 const rejectionCounts={inlandFreePort:generated.reduce((n,p)=>n+p.generation.rejections.inlandFreePort,0),engine:failures.length};
 const report={protocol,generatedAt:out.generatedAt,finishedAt:new Date().toISOString(),groups,rejectionCounts,failures,runs};
 fs.writeFileSync(__dirname+'/blind-results.json',JSON.stringify(report,null,2));
 const lines=['# Blind playtests — frozen engine c2ca839','',protocol.description,'',`All 200 maps were completed before scoring. There were ${failures.length} rejected engine proposals. ${rejectionCounts.inlandFreePort} inland Free Port name choices were redrawn without consulting a score. No outcomes were discarded.`, '', '| Map geometry | Runs | Mean | Median | Range | P10 | P90 | Zero scores | 80+ |','|---|---:|---:|---:|---:|---:|---:|---:|---:|',...Object.entries(groups).map(([name,s])=>`| ${name} | ${s.n} | ${s.mean.toFixed(2)} | ${s.median} | ${s.min}–${s.max} | ${s.p10} | ${s.p90} | ${s.zero} | ${s.atLeast80} |`),'','## Highest blind scores','',...most.map(r=>`- ${r.label}: ${r.score.total}/100; ${r.stats.surviving}/${r.stats.created} states survive; ${r.stats.wars} wars; ${r.title}.`),'','## Lowest blind scores','',...least.map(r=>`- ${r.label}: ${r.score.total}/100; ${r.stats.surviving}/${r.stats.created} states survive; ${r.stats.wars} wars; ${r.title}.`),'','## Method','',protocol.politics,'',`Coherent: ${protocol.geometry.coherent}`,'',`Haphazard: ${protocol.geometry.haphazard}`,'','These tests estimate the stated random-input protocols, not a population average of real novice players. Both cohorts use the same political probabilities, but the port constraint can change the available names according to geography. They use actual server validation and enriched canonical map data, including all 763 selectable hexes, railway and ethnicity metrics, and Oman-border flags.'];
 fs.writeFileSync(__dirname+'/blind-report.md',lines.join('\n')+'\n');
 console.log(JSON.stringify({groups,rejectionCounts,failures,highest:most.map(r=>({label:r.label,score:r.score,stats:r.stats,title:r.title,components:r.components})),lowest:least.map(r=>({label:r.label,score:r.score,stats:r.stats,title:r.title}))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
