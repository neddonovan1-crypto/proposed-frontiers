(()=>{
 const ns='http://www.w3.org/2000/svg';
 const properties=['fill','fill-opacity','stroke','stroke-opacity','stroke-width','stroke-dasharray','stroke-linecap','stroke-linejoin','opacity','paint-order','clip-path','text-anchor'];
 function mapImage({map,territories,theme}){
  const svg=map.cloneNode(true),original=[map,...map.querySelectorAll('*')],copy=[svg,...svg.querySelectorAll('*')];
  original.forEach((source,i)=>{if(source.closest('defs'))return;const style=getComputedStyle(source);copy[i].removeAttribute('style');for(const key of properties)copy[i].style.setProperty(key,style.getPropertyValue(key).replace(/url\(["']?[^#)]*#([^"')]+)["']?\)/g,'url(#$1)'));});
  svg.setAttribute('xmlns',ns);svg.setAttribute('viewBox','50 0 750 820');svg.setAttribute('width','1000');svg.setAttribute('height','1093.333');svg.style.display='block';
  svg.querySelectorAll('#v2-evidence-marks,#v2-selection-outline,#v2-territory-borders,#v2-label-leaders,.v2-detail,.v2-gulf-detail,filter,title').forEach(n=>n.remove());
  const clip=svg.querySelector('#v2-viewrect');if(clip)for(const [key,value]of Object.entries({x:50,y:0,width:750,height:820}))clip.setAttribute(key,value);
  const owners=new Map(territories.flatMap(t=>t.cells.map(i=>[i,t])));
  svg.querySelectorAll('.v2-cell').forEach(n=>{const t=owners.get(Number(n.dataset.cell));if(!t){n.remove();return;}n.style.fill=t.color;n.style.fillOpacity='1';n.style.stroke=theme==='dark'?'#dfdfcb':'#34453e';n.style.strokeOpacity='.18';n.style.strokeWidth='.3';});
  for(const id of ['v2-territory-labels','v2-hatches']){const g=svg.querySelector('#'+id);if(g)g.style.opacity='1';}
  const ink=theme==='dark'?'#f0ead7':'#2c3b35',halo=theme==='dark'?'#233332':'#f4eedf';
  const texts=[...svg.querySelectorAll('text')];
  texts.forEach(t=>{t.removeAttribute('transform');t.style.visibility='visible';t.style.fontFamily='Georgia,serif';t.style.fill=ink;t.style.stroke=halo;t.style.strokeWidth='1.6';t.style.paintOrder='stroke';t.style.letterSpacing=t.classList.contains('v2-assigned-name')?'.3':'0';t.style.fontSize=t.classList.contains('v2-assigned-name')?'12px':t.closest('.v2-city')?'10px':'11px';t.querySelectorAll('tspan').forEach(n=>{if(n.hasAttribute('dy'))n.setAttribute('dy','12');n.style.fontSize=n.dataset.labelLine==='patron'?'9px':'inherit';});});
  for(const use of svg.querySelectorAll('use')){const ref=svg.querySelector(use.getAttribute('href')||use.getAttribute('xlink:href'));if(ref?.tagName.toLowerCase()!=='path')continue;const path=ref.cloneNode(true);path.removeAttribute('id');for(const a of [...use.attributes])if(a.localName!=='href')path.setAttribute(a.name,a.value);use.replaceWith(path);}
  const ids=new Map([...svg.querySelectorAll('[id]'),svg].map(n=>[n.id,'share-'+n.id]));
  for(const n of [svg,...svg.querySelectorAll('*')])for(const attr of [...n.attributes]){
   if(attr.name==='id')n.setAttribute('id',ids.get(attr.value));
   else if(attr.name==='href'||attr.localName==='href'){if(attr.value.startsWith('#'))n.setAttributeNS(attr.namespaceURI,attr.name,'#'+ids.get(attr.value.slice(1)));}
   else if(attr.value.includes('url('))n.setAttribute(attr.name,attr.value.replace(/url\(["']?#([^"')]+)["']?\)/g,(_,id)=>'url(#'+(ids.get(id)||id)+')'));
  }
  const mount=document.createElement('div');mount.style.cssText='position:fixed;left:-10000px;top:0;width:1000px;pointer-events:none';mount.setAttribute('aria-hidden','true');mount.append(svg);document.body.append(mount);
  try{
   const occupied=[],overlap=(a,b)=>a.x<b.x+b.width+3&&a.x+a.width>b.x-3&&a.y<b.y+b.height+3&&a.y+a.height>b.y-3;
   const rank=t=>t.dataset.priority==='true'?0:t.classList.contains('v2-assigned-name')?1:t.closest('.v2-city')?2:3;
   texts.sort((a,b)=>rank(a)-rank(b));
   for(const t of texts){
    const b=t.getBBox(),assigned=t.classList.contains('v2-assigned-name'),offsets=assigned?[[0,0],[0,-15],[0,15],[-20,0],[20,0],[0,-30],[0,30]]:[[0,0],[0,-9],[0,9]];
    let found=false;
    for(const [dx,dy]of offsets){const box={x:b.x+dx,y:b.y+dy,width:b.width,height:b.height};if(box.x<54||box.x+box.width>796||box.y<4||box.y+box.height>816||occupied.some(a=>overlap(a,box)))continue;t.setAttribute('transform',`translate(${dx},${dy})`);occupied.push(box);found=true;break;}
    if(!found)t.style.visibility='hidden';
   }
   return new XMLSerializer().serializeToString(svg);
  }finally{mount.remove();}
 }
 function wrap(ctx,text,width){const lines=[];let line='';for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>width){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}
 async function card(options){
  const {history,score,territories,theme,label}=options,xml=mapImage(options),picture=new Image();
  await new Promise((resolve,reject)=>{picture.onload=resolve;picture.onerror=()=>reject(new Error('The map image could not be created.'));picture.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml);});
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),dark=theme==='dark',paper=dark?'#202e2f':'#f5f0e3',ink=dark?'#f0ead7':'#293b35',accent=dark?'#f2b28d':'#9b462f';
  canvas.width=1200;canvas.height=1624+Math.ceil(territories.length/3)*34;
  ctx.fillStyle=paper;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=ink;
  ctx.font='22px Arial';ctx.fillText('PROPOSED FRONTIERS',60,60);ctx.font='17px Arial';ctx.fillText('MY SETTLEMENT · 1918—1939',60,92);
  ctx.font='42px Georgia';const headlines=wrap(ctx,history.title,840);headlines.forEach((line,i)=>ctx.fillText(line,60,155+i*47));
  ctx.textAlign='right';ctx.fillStyle=accent;ctx.font='bold 84px Georgia';ctx.fillText(String(score.total),1140,126);ctx.font='23px Arial';ctx.fillText('OUT OF 100',1140,163);ctx.textAlign='left';
  ctx.strokeStyle=ink;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(60,220);ctx.lineTo(1140,220);ctx.stroke();
  ctx.drawImage(picture,100,242,1000,1093.333);
  ctx.fillStyle=ink;ctx.font='18px Arial';ctx.fillText('THE MAP YOU DREW',60,1369);
  const stats=[`Peace ${score.peace}/40`,`Durability ${score.durability}/40`,`Cooperation ${score.cooperation}/20`];
  ctx.font='23px Georgia';stats.forEach((text,i)=>ctx.fillText(text,60+i*365,1412));
  ctx.font='20px Georgia';ctx.fillText(`${history.stats.surviving} of ${history.stats.created} states survive · ${history.stats.wars} regional war${history.stats.wars===1?'':'s'}`,60,1450);
  territories.forEach((t,i)=>{const x=60+(i%3)*365,y=1494+Math.floor(i/3)*34;ctx.fillStyle=t.color;ctx.fillRect(x,y,16,16);ctx.fillStyle=ink;let size=18;do{ctx.font=size+'px Arial';size--;}while(ctx.measureText(label(t)).width>317&&size>10);ctx.fillText(label(t),x+25,y+15);});
  const y=canvas.height-64;ctx.font='20px Arial';ctx.fillText('sykespicot.io',60,y);ctx.font='12px Arial';ctx.fillText('Basemap: Natural Earth · A. Ourednik & contributors (GPL-3.0)',60,y+30);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('The image could not be saved.');
  return {file:new File([blob],`proposed-frontiers-${score.total}-${history.signature}.png`,{type:'image/png'}),url:canvas.toDataURL('image/png')};
 }
 window.FrontiersShare={open(options){
  const root=document.getElementById('frontiers-v2'),dialog=document.createElement('dialog');dialog.className='chronicle-share';dialog.setAttribute('aria-labelledby','share-title');
  const heading=document.createElement('h2');heading.id='share-title';heading.textContent='Share your settlement';
  const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Preparing your map…';
  const preview=document.createElement('img');preview.alt=`Your proposed map · ${options.score.total} out of 100`;preview.hidden=true;
  const actions=document.createElement('div');actions.className='chronicle-share-actions';
  const share=document.createElement('button');share.textContent='Share image';share.hidden=true;
  const save=document.createElement('button');save.textContent='Save image';save.disabled=true;
  const close=document.createElement('button');close.textContent='Close';close.onclick=()=>dialog.close();actions.append(share,save,close);dialog.append(heading,status,preview,actions);root.append(dialog);
  let file=null;dialog.addEventListener('close',()=>{file=null;preview.removeAttribute('src');dialog.remove();});dialog.showModal();close.focus();
  save.onclick=()=>{if(!file)return;const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);};
  share.onclick=async()=>{if(!file)return;try{await navigator.share({files:[file],title:'Proposed Frontiers',text:`My settlement scored ${options.score.total}/100. Draw yours at https://sykespicot.io/`});status.textContent='Shared.';}catch(e){if(e.name!=='AbortError')status.textContent='Sharing is unavailable here. Save the image instead.';}};
  card(options).then(result=>{if(!dialog.open)return;file=result.file;preview.src=result.url;preview.hidden=false;save.disabled=false;share.hidden=!(navigator.canShare?.({files:[file]}));status.textContent=`${options.score.total} / 100 · Your map and result are ready.`;}).catch(()=>{if(dialog.open)status.textContent='The image could not be prepared. Close this window and try again.';});
 }};
})();
