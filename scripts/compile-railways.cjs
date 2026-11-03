const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{
 const {projectRailway}=await import('./railway-map.mjs'),data=JSON.parse(read('map-data.json')),canonical=JSON.parse(read('db/hexes.json'));
 const source=read('map.js'),end=source.indexOf('function ownerFor(');assert.ok(end>0);
 const geometry=source.slice(0,end)+'return {cells,nearestHex,landPixels};})()';
 const routes=JSON.parse(read('railways.json')).routes.filter(r=>r.status==='open').map(r=>({id:r.id,points:r.points.map(projectRailway)}));
 const junctions=[{name:'Rayak',point:projectRailway([35.986,33.85])}];
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
 try{
  const page=await browser.newPage();await page.setContent(read('game.html'));
  const result=await page.evaluate(async({geometry,data,metrics,routes,junctions,ids})=>{
   window.FrontiersMapData={cityLayout:data.cityLayout,cellMetrics:metrics};window.openai={widgetState:{}};
   const {cells,nearestHex,landPixels}=await eval(geometry),mask=landPixels(),out={},counts={};
   const hexAt=([x,y])=>{if(x<50||x>=800||y<0||y>=800)return null;const pixel=(Math.floor(y*2)*1600+Math.floor(x*2))*4+3;if(!mask[pixel])return null;const c=nearestHex(x,y);return c?.land&&ids.includes(c.i)?c:null;};
   for(const route of routes){const hits=new Set();
    for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2);
     for(let j=0;j<=steps;j++){const u=j/steps,c=hexAt([a[0]+u*(b[0]-a[0]),a[1]+u*(b[1]-a[1])]);if(c)hits.add(c.i);}
    }
    counts[route.id]=hits.size;for(const id of hits)(out[id]??={railways:[],railJunctions:[]}).railways.push(route.id);
   }
   for(const j of junctions){const c=hexAt(j.point);if(!c)throw new Error('Junction not in playable land: '+j.name);(out[c.i]??={railways:[],railJunctions:[]}).railJunctions.push(j.name);}
   return {out,counts,playable:cells.filter(c=>c.land).length};
  },{geometry,data,metrics:JSON.parse(read('cell-metrics.json')),routes,junctions,ids:canonical.map(c=>c.i)});
  assert.equal(result.playable,canonical.length);assert.ok(result.counts['hejaz-main']>0);assert.ok(result.counts['anatolian-main']>0);
  fs.writeFileSync(path.join(root,'railway-metrics.json'),JSON.stringify(result.out)+'\n');
  console.log(JSON.stringify({taggedHexes:Object.keys(result.out).length,routeCells:result.counts,junctions:Object.entries(result.out).filter(([,v])=>v.railJunctions.length)},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
