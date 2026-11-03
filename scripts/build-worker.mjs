import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,brotliCompressSync} from 'node:zlib';
import {transformSync} from 'esbuild';
import {railwaySVG} from './railway-map.mjs';
import {overlayMetrics} from './overlay-metrics.mjs';
const minJS=s=>transformSync(s,{loader:'js',minify:true,target:'es2022',legalComments:'inline'}).code;
const minCSS=s=>transformSync(s,{loader:'css',minify:true,target:'es2022',legalComments:'inline'}).code;
const base=resolve(import.meta.dirname,'..'),read=p=>readFile(resolve(base,p),'utf8');
const inline=s=>s.replaceAll('</script','<\\/script');
const [template,css,chronicleCSS,bootstrap,data,engine,league,map,api,registry,metrics,ethnicity,railwaySource,railwayMetrics,share,autocomplete]=await Promise.all(['game.html','game.css','chronicle.css','bootstrap.js','map-data.json','chronicle.js','league.js','map.js','worker/league.mjs','db/hexes.json','cell-metrics.json','ethnicity-metrics.json','railways.json','railway-metrics.json','share.js','autocomplete.js'].map(read));
const markup=template.replace('<!-- railway-network -->',railwaySVG(JSON.parse(railwaySource)));
const railCells=JSON.parse(railwayMetrics);
const assets={};
const asset=(name,body,type='text/javascript; charset=utf-8')=>{const hash=createHash('sha256').update(body).digest('hex').slice(0,12),url=`/assets/${name.replace('.',`.${hash}.`)}`;assets[url]={body,type};return url;};
const hexes=JSON.parse(registry),ethnicAreas=JSON.parse(ethnicity);
for(const c of hexes){c.ethnicity=ethnicAreas[c.i];c.railways=railCells[c.i]?.railways||[];c.railJunctions=railCells[c.i]?.railJunctions||[];}
const fixedPaths=new Map([...markup.matchAll(/<path d="([^"]+)"[^>]+data-fixed-name="([^"]+)"/g)].map(m=>[m[2],m[1]]));
const pathEdges=path=>path.split('M').filter(Boolean).flatMap(r=>{const pts=[...r.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m=>[+m[1],+m[2]]);return pts.map((p,i)=>[p,pts[(i+1)%pts.length]]);});
const borderEdges=name=>{const path=fixedPaths.get(name);if(!path)throw new Error('Missing fixed frontier geometry: '+name);return pathEdges(path);};
const omanEdges=borderEdges('Muscat and Oman'),persiaEdges=borderEdges('Persia');
const distance=(x,y,[a,b])=>{const dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-u*dx,y-a[1]-u*dy);};
const mapData=JSON.parse(data),oldCells=mapData.oldCells;delete mapData.oldCells;
const cellEdges=new Map(mapData.cityLayout.shapes.map(s=>[s.id,pathEdges(s.d)]));
// Match map.js's regular cells where a frontier fragment has no adjusted polygon.
const R=8.5,W=Math.sqrt(3)*R,step=1.5*R;let regularId=0;
for(let row=-1;row<=Math.ceil(800/step)+1;row++)for(let col=-1;col<=Math.ceil(800/W)+1;col++){
 const id=regularId++;if(cellEdges.has(id))continue;
 const x=W*(col+(row&1)/2),y=step*row,pts=Array.from({length:6},(_,k)=>[+(x+R*Math.cos((60*k-30)*Math.PI/180)).toFixed(3),+(y+R*Math.sin((60*k-30)*Math.PI/180)).toFixed(3)]);
 cellEdges.set(id,pts.map((p,i)=>[p,pts[(i+1)%pts.length]]));
}
const orientation=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const touches=([a,b],[c,d])=>orientation(a,b,c)*orientation(a,b,d)<0&&orientation(c,d,a)*orientation(c,d,b)<0||Math.min(distance(...a,[c,d]),distance(...b,[c,d]),distance(...c,[a,b]),distance(...d,[a,b]))<=1.501;
for(const c of hexes){
 const x=400+(c.lon-43)*Math.PI/180*1110,y=400-1110*(Math.log(Math.tan(Math.PI/4+c.lat*Math.PI/360))-Math.log(Math.tan(Math.PI/4+28*Math.PI/360)));
 c.nearOman=omanEdges.some(e=>distance(x,y,e)<=18);
 // Border contact, not centroid proximity: a foreign-owned frontier hex must block inland supply.
 // The 3px fixed-country stroke removes 1.5px of playable land; allow its half-width and rounding.
 c.nearPersia=[c.i,...(c.absorbed||[])].some(id=>cellEdges.get(id).some(edge=>persiaEdges.some(border=>touches(edge,border))));
}
mapData.omanBorderCells=hexes.filter(c=>c.nearOman).map(c=>c.i);
mapData.persiaBorderCells=hexes.filter(c=>c.nearPersia).map(c=>c.i);
mapData.anatoliaCells=hexes.filter(c=>c.anatolia).map(c=>c.i);
const cityIds=new Set(mapData.cityLayout.centres.map(c=>c.id));
mapData.cellMetrics=JSON.parse(metrics).map(([id,a,x,y])=>{if(cityIds.has(id))return [id,a];const qx=Math.round(x*a*4),qy=Math.round(y*a*4);if(qx/4/a!==x||qy/4/a!==y)throw new Error('Lossless centroid encoding failed for '+id);return [id,a,qx,qy];});
mapData.ethnicity=ethnicAreas;mapData.railwayCells=railCells;
mapData.environment=overlayMetrics(mapData,hexes,markup);
for(const c of hexes)c.environment=mapData.environment[c.i];
for(const key of ['version','baseline','coverage','coordinateSource'])delete mapData.evidenceData[key];
for(const record of mapData.evidenceData.records)for(const key of ['anchor','coordinates','xy'])delete record[key];
for(const source of Object.values(mapData.evidenceData.sources))delete source.published;
const playablePath=markup.match(/<clipPath id="v2-playableclip"><path[^>]*d="([^"]+)"/)[1];
const washPaths=[null],pathIndex=new Map([[playablePath,0]]);
mapData.washData=mapData.washData.map(w=>{if(!pathIndex.has(w.d)){pathIndex.set(w.d,washPaths.length);washPaths.push(w.d);}return {...w,d:pathIndex.get(w.d)};});
mapData.washPaths=washPaths;mapData.shiaMetrics=JSON.parse(registry).map(c=>[c.i,c.shiaArea,c.absorbed||[]]);
const legacy=asset('legacy-cells.json',JSON.stringify(oldCells),'application/json; charset=utf-8');
const runtimeData=minJS(`(()=>{const d=window.FrontiersMapData=${JSON.stringify(mapData)};const p=d.washPaths.map(s=>s??document.querySelector('#v2-playableclip path').getAttribute('d'));for(const w of d.washData)w.d=p[w.d];delete d.washPaths;d.cellMetrics=d.cellMetrics.map(([id,a,x=0,y=0])=>[id,a,x/4/a,y/4/a]);window.FrontiersLegacyURL=${JSON.stringify(legacy)};})();`);
const scripts=[asset('map-data.js',runtimeData),asset('chronicle.js',minJS(engine)),asset('league.js',minJS(league)),asset('share.js',minJS(share)),asset('autocomplete.js',minJS(autocomplete)),asset('map.js',minJS(map))];
const page=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'self'"><title>Proposed Frontiers · January 1916</title><meta name="description" content="Draw the frontiers of a different century. A January 1916 historical strategy game."><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath fill='%23739da8' d='M16 1L30 9v14L16 31 2 23V9Z'/%3E%3C/svg%3E"><style>${minCSS(css+"\nhtml,body{margin:0;padding:0;min-height:100%;background:#f5f1e6}body{overflow-x:hidden}button,input,select{font:inherit}\n"+chronicleCSS)}</style>${scripts.map(url=>`<script defer src="${url}"></script>`).join('')}</head><body><script>${inline(minJS(bootstrap))}</script>${markup}</body></html>`;
await mkdir(resolve(base,'dist/server'),{recursive:true});
await rm(resolve(base,'dist/assets'),{recursive:true,force:true});await mkdir(resolve(base,'dist/assets'),{recursive:true});
await Promise.all(Object.entries(assets).map(([url,a])=>writeFile(resolve(base,'dist'+url),a.body)));
await writeFile(resolve(base,'dist/index.html'),page);
await Promise.all([['page.mjs',page],['assets.mjs',assets],['hexes.mjs',hexes]].map(([name,value])=>writeFile(resolve(base,'dist/server/'+name),'export default '+JSON.stringify(value)+';\n')));
const worker=`import PAGE from './page.mjs';import ASSETS from './assets.mjs';import HEXES from './hexes.mjs';\n${engine}\n${api.replaceAll('export ','')}\nexport default {async fetch(request,env){const path=new URL(request.url).pathname;if(path==='/api/league')return leagueRequest(request,env,HEXES,globalThis.FrontiersChronicle);if(['GET','HEAD'].includes(request.method)){const a=ASSETS[path];if(a)return new Response(request.method==='HEAD'?null:a.body,{headers:{'content-type':a.type,'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff'}});if(path==='/'||path==='/index.html')return new Response(request.method==='HEAD'?null:PAGE,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff'}});}return new Response('Not found',{status:404});}};`;
const compiledWorker=transformSync(worker,{loader:'js',minify:true,target:'es2022',format:'esm',legalComments:'inline'}).code;
await writeFile(resolve(base,'dist/server/index.js'),compiledWorker);
await import(pathToFileURL(resolve(base,'dist/server/index.js')).href);
const cold=[page,...scripts.map(url=>assets[url].body)],sum=fn=>cold.reduce((n,s)=>n+fn(Buffer.from(s)),0);
console.log(JSON.stringify({pageBytes:Buffer.byteLength(page),coldBytes:sum(b=>b.length),gzipBytes:sum(b=>gzipSync(b,{level:9}).length),brotliBytes:sum(b=>brotliCompressSync(b).length),legacyOnlyBytes:Buffer.byteLength(assets[legacy].body),numberedHexes:JSON.parse(registry).length}));
