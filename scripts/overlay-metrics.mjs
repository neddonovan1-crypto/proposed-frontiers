const layers=[['agriculture',4],['lifestyle',4],['population',4],['religion',5],['oasis',2]];
function shape(d,stroke=0){
 const rings=d.split('M').filter(Boolean).map(r=>[...r.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m=>[+m[1],+m[2]])),points=rings.flat(),pad=stroke/2;
 return {rings,pad,box:[Math.min(...points.map(p=>p[0]))-pad,Math.min(...points.map(p=>p[1]))-pad,Math.max(...points.map(p=>p[0]))+pad,Math.max(...points.map(p=>p[1]))+pad]};
}
function contains(s,x,y){
 if(x<s.box[0]||y<s.box[1]||x>s.box[2]||y>s.box[3])return false;
 let inside=false;
 for(const ring of s.rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[j],b=ring[i];
  if(s.pad){if(i===0)continue;const dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(x-a[0]-u*dx,y-a[1]-u*dy)<=s.pad)return true;}
  else if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
export function overlayMetrics(data,hexes,markup){
 const radius=8.5,width=Math.sqrt(3)*radius,cols=Math.ceil(800/width)+3,custom=new Map(data.cityLayout.shapes.map(s=>[s.id,s.d]));
 const cellShape=id=>{if(custom.has(id))return shape(custom.get(id));const row=Math.floor(id/cols)-1,col=id%cols-1,x=width*(col+(row&1)/2),y=1.5*radius*row;return shape('M'+Array.from({length:6},(_,i)=>[x+radius*Math.cos((60*i-30)*Math.PI/180),y+radius*Math.sin((60*i-30)*Math.PI/180)].join(',')).join('L')+'Z');};
 const land=shape(markup.match(/<clipPath id="v2-landclip"><path[^>]*d="([^"]+)"/)[1]),playable=shape(markup.match(/<clipPath id="v2-playableclip"><path[^>]*d="([^"]+)"/)[1]);
 const fixed=[...markup.matchAll(/<path[^>]*d="([^"]+)"[^>]*data-fixed-name=/g)].map(m=>shape(m[1]));
 const washes=layers.map(([key])=>data.washData.filter(w=>key==='oasis'?w.layer==='agriculture'&&w.id.startsWith('oasis-'):w.layer===key).map(w=>({...shape(w.d,w.stroke),category:key==='oasis'?1:w.category})).reverse());
 const metrics={};
 for(const c of hexes){
  const counts=layers.map(([,n])=>Array(n).fill(0));let samples=0;
  for(const id of [c.i,...c.absorbed||[]]){const s=cellShape(id);
   for(let y=Math.ceil(s.box[1]);y<s.box[3];y++)for(let x=Math.ceil(s.box[0]);x<s.box[2];x++){
    const px=x+.5,py=y+.5;if(px<50||!contains(s,px,py)||!contains(land,px,py)||!contains(playable,px,py)||fixed.some(f=>contains(f,px,py)))continue;
    samples++;washes.forEach((ws,i)=>counts[i][ws.find(w=>contains(w,px,py))?.category??0]++);
   }
  }
  if(!samples)throw new Error('No overlay samples for hex '+c.i);
  metrics[c.i]=counts.map(row=>{const values=row.map(n=>Math.floor(n*100/samples));let spare=100-values.reduce((n,v)=>n+v,0);const order=row.map((n,i)=>({i,remainder:n*100/samples-values[i]})).sort((a,b)=>b.remainder-a.remainder);for(let i=0;i<spare;i++)values[order[i].i]++;return values;});
 }
 return metrics;
}
