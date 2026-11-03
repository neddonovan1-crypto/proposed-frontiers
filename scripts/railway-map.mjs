export function projectRailway([lon,lat]) {
  return [400+(lon-43)*Math.PI/180*1110,400-1110*(Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))-Math.log(Math.tan(Math.PI/4+28*Math.PI/360)))];
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export function railwaySVG(network) {
  return '<g id="v2-railways" fill="none" stroke="#53594f" stroke-width=".8" stroke-linecap="butt" stroke-linejoin="round">'+network.routes.map(route=>{
    const id='v2-rail-'+route.id,d=route.points.map((p,i)=>(i?'L':'M')+projectRailway(p).map(n=>+n.toFixed(3)).join(',')).join('');
    const title=escape(route.name+' · '+(route.status==='open'?'In use':route.status==='gap'?'Unfinished':'Interrupted')+' · January 1916. '+route.note);
    return `<g class="v2-rail-route v2-rail-${route.status}" data-railway="${route.id}"><title>${title}</title><path id="${id}" d="${d}"${route.status==='open'?'':' stroke-dasharray="8 4"'}/><use href="#${id}" stroke-width="4.5" stroke-dasharray=".8 5.2"/></g>`;
  }).join('')+'</g>';
}
