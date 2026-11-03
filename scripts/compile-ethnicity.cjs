/* Compile mapped ethnicity-wash AREA, not population. Run from any directory.
   Requires Playwright and a browser; optional PLAYWRIGHT_MODULE and CHROME_BIN.
   Categories: Arabic, Turkish, Kurdish, Greek, Armenian, Mixed/local, Sparse.
   Uses current map geometry and the renderer's ordered wash polygons. Hatch
   texture is decorative: it does not change the underlying wash category. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const playwright=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const mapSource=read('map.js'),geometryEnd=mapSource.indexOf('function ownerFor(');
assert.ok(geometryEnd>0,'Map geometry initialization marker exists');
const geometry=mapSource.slice(0,geometryEnd)+'return {cells,nearestHex,landPixels};})()';
const data=JSON.parse(read('map-data.json')),canonical=JSON.parse(read('db/hexes.json'));
(async()=>{
 const options={headless:true};
 const executable=process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 if(fs.existsSync(executable))options.executablePath=executable;
 const browser=await playwright.chromium.launch(options);
 try{
  const page=await browser.newPage();await page.setContent(read('game.html'));
  const result=await page.evaluate(async({geometry,data,metrics,canonical})=>{
   window.FrontiersMapData={cityLayout:data.cityLayout,cellMetrics:metrics};window.openai={widgetState:{}};
   const {cells,nearestHex,landPixels}=await eval(geometry),mask=landPixels();
   const palette=[[255,0,0],[0,255,0],[0,0,255],[255,255,0],[255,0,255],[0,255,255],[255,255,255]];
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1600;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.scale(2,2);
   for(const id of ['v2-landclip','v2-playableclip'])ctx.clip(new Path2D(document.querySelector('#'+id+' path').getAttribute('d')));
   for(const wash of data.washData.filter(w=>w.layer==='ethnicity')){
    const shape=new Path2D(wash.d);ctx.fillStyle=ctx.strokeStyle='rgb('+palette[wash.category].join(',')+')';ctx.lineCap=ctx.lineJoin='round';
    if(wash.stroke){ctx.lineWidth=wash.stroke;ctx.stroke(shape);}else ctx.fill(shape);
   }
   const raster=ctx.getImageData(0,0,1600,1600).data,areas=Object.fromEntries(canonical.map(c=>[c.i,Array(7).fill(0)]));
   let maskPixels=0,assignedPixels=0,excludedPixels=0,uncoveredPixels=0,unresolvedPixels=0,maxEdgeRepairPixels=0,blendedPixels=0;
   const unknownIds=new Set();
   for(let y=0;y<1600;y++)for(let x=0;x<1600;x++){
    const p=(y*1600+x)*4;if(!mask[p+3])continue;maskPixels++;
    const c=nearestHex((x+.5)/2,(y+.5)/2);
    if(!c?.land||(x+.5)/2<50){excludedPixels++;continue;}
    if(!areas[c.i]){unknownIds.add(c.i);continue;}
    let category=5,distance=Infinity,colourIndex=p;
    // Very thin coastline antialias gaps inherit their nearest painted pixel.
    // This does not extrapolate across inland areas or create a new category.
    if(!raster[p+3]){
     uncoveredPixels++;let nearest=Infinity;
     for(let dy=-10;dy<=10;dy++)for(let dx=-10;dx<=10;dx++){
      const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=1600||yy>=1600)continue;
      const candidate=(yy*1600+xx)*4,d=dx*dx+dy*dy;
      if(raster[candidate+3]&&d<nearest){nearest=d;colourIndex=candidate;}
     }
     if(nearest===Infinity)unresolvedPixels++;else maxEdgeRepairPixels=Math.max(maxEdgeRepairPixels,Math.sqrt(nearest));
    }
    for(let k=0;k<7;k++){
     const d=(raster[colourIndex]-palette[k][0])**2+(raster[colourIndex+1]-palette[k][1])**2+(raster[colourIndex+2]-palette[k][2])**2;
     if(d<distance){distance=d;category=k;}
    }
    if(distance>0&&distance<Infinity)blendedPixels++;
    areas[c.i][category]+=.25;assignedPixels++;
   }
   const sampleNames=['Angora','Constantinople','Damascus','Baghdad','Jeddah','Diyarbekir','Mosul','Van'];
   const samples=canonical.filter(c=>sampleNames.includes(c.city)).map(c=>({city:c.city,id:c.i,areas:areas[c.i],dominant:areas[c.i].indexOf(Math.max(...areas[c.i]))}));
   const categoryTotals=Array.from({length:7},(_,i)=>Object.values(areas).reduce((n,row)=>n+row[i],0));
   return {areas,report:{canonicalCells:canonical.length,geometryCells:cells.filter(c=>c.land).length,maskPixels,assignedPixels,excludedPixels,uncoveredPixels,unresolvedPixels,maxEdgeRepairPixels,blendedPixels,unknownIds:[...unknownIds],canonicalArea:canonical.reduce((n,c)=>n+c.area,0),premergeArea:metrics.reduce((n,c)=>n+c[1]/4,0),compiledArea:assignedPixels/4,categoryTotals,samples}};
  },{geometry,data,metrics:JSON.parse(read('cell-metrics.json')),canonical});
  console.log(JSON.stringify(result.report,null,2));
  assert.equal(result.report.geometryCells,canonical.length,'Current geometry agrees with canonical registry');
  assert.deepEqual(result.report.unknownIds,[],'Every selected cell belongs to the canonical registry');
  assert.ok(Object.values(result.areas).every(row=>row.some(value=>value>0)),'Every canonical cell receives mapped area');
  assert.equal(result.report.unresolvedPixels,0,'Every playable land pixel receives a mapped category');
  assert.ok(result.report.maxEdgeRepairPixels<=2,'Wash gaps are confined to subpixel map edges');
  assert.ok(result.report.compiledArea>=result.report.canonicalArea,'Compiled area includes absorbed fragments');
  assert.ok(Math.abs(result.report.compiledArea/result.report.premergeArea-1)<.01,'Merged hit geometry remains within one percent of the original raster mask');
  fs.writeFileSync(path.join(root,'ethnicity-metrics.json'),JSON.stringify(result.areas)+'\n');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
