(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.FrontiersAutocomplete=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const MODE='1916-inspired';
 const NOTE='A 1916-inspired settlement with French and British protectorates inland, direct administration on the coast and lower rivers, and international Palestine. Other lands use regional defaults.';
 // Broad game-scale outlines, not a digitisation of an agreed modern frontier.
 // See docs/autocomplete.md for the original agreement and the extrapolations.
 const blueCoast=[[34.5,33.05],[35.85,33.05],[36.25,34.3],[36.45,35.3],[36.35,36.3],[35.7,36.8],[34.1,36.5],[34.0,35.0]];
 const blueAnatolia=[[33.9,36.1],[35.5,36.3],[36.9,36.75],[38.2,36.65],[41.7,37.15],[42.0,38.2],[39.3,39.2],[37.1,40.1],[35.75,39.5],[34.1,38.5]];
 const brown=[[34.0,31.15],[35.4,31.15],[35.7,31.9],[35.7,33.05],[35.0,33.05],[34.4,32.6]];
 const red=[[42.3,34.5],[45.1,34.6],[46.5,32.8],[48.9,30.7],[48.5,29.6],[46.7,29.7],[44.0,31.3],[42.3,33.0]];
 const definitions=[
  ['blue','Levant Coast and Cilicia','Direct colonial administration','France','None','Sunni'],
  ['red','Lower Mesopotamia','Direct colonial administration','Britain','None','Sunni'],
  ['ports','Haifa and Acre','Direct colonial administration','Britain','None','Sunni'],
  ['a','Syria','Protectorate','France','None','Sunni'],
  ['b','Transjordan','Protectorate','Britain','None','Sunni'],
  ['brown','Palestine','International administration','','None','Sunni'],
  ['ottoman','Ottoman Sultanate','Independent state','','None','Sunni'],
  ['hejaz','Hejaz','Independent state','','None','Sunni'],
  ['shammar','Jebel Shammar','Independent state','','None','Sunni'],
  ['nejd','Nejd','Independent state','','None','Sunni'],
  ['asir','Asir','Independent state','','None','Sunni'],
  ['hadhramaut','Hadhramaut','Independent state','','None','Sunni'],
  ['oman','Oman','Imamate','','None','Ibadi']
 ];
 // City cells are deliberately enlarged and their grid centres may differ from
 // the real city coordinates. Keep these historical anchors on the right side.
 const cityZones=new Map([
  ...['Haifa','Acre'].map(city=>[city,'ports']),
  ...['Jerusalem','Nablus','Bethlehem'].map(city=>[city,'brown']),
  ...['Beirut','Sidon','Tyre','Tripoli','Alexandretta','Adana','Diyarbekir'].map(city=>[city,'blue']),
  ...['Damascus','Aleppo','Mosul','Erbil','Kirkuk'].map(city=>[city,'a']),
  ...['Baghdad','Basra','Najaf','Karbala'].map(city=>[city,'red']),
  ...['Ma’an','Maan','Aqaba'].map(city=>[city,'b']),
  ...['Constantinople','Trebizond','Angora','Erzurum','Smyrna','Van','Konya'].map(city=>[city,'ottoman']),
  ...['Mecca','Medina','Jeddah','Yanbu','Taif'].map(city=>[city,'hejaz']),
  ['Ha’il','shammar'],['Hail','shammar'],['Riyadh','nejd']
 ]);
 function inside(lon,lat,polygon){
  let yes=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
   const [x,y]=polygon[i],[xx,yy]=polygon[j];
   if((y>lat)!==(yy>lat)&&lon<(xx-x)*(lat-y)/(yy-y)+x)yes=!yes;
  }
  return yes;
 }
 function zoneFor(cell){
  const anchor=cityZones.get(cell.city);if(anchor)return anchor;
  const {lon,lat}=cell;
  if(inside(lon,lat,blueCoast)||inside(lon,lat,blueAnatolia))return 'blue';
  if(inside(lon,lat,brown))return 'brown';
  if(inside(lon,lat,red))return 'red';
  if(lat>=36.9)return 'ottoman';
  // Approximate Acre–Kirkuk division of the inland A/B areas. This is not
  // a claim that these coarse vertices reproduce the signed map exactly.
  if(lat>=32.9+(lon-35.1)*2.65/9.3)return 'a';
  if(lat>=29.2)return 'b';
  // Local defaults for Arabia beyond the agreement's precise allocations.
  if(lon>=51.5&&lat>=20)return 'oman';
  if(lat<20.7&&lon<43.5)return 'asir';
  if(lat<20.5&&lon>=43.5)return 'hadhramaut';
  if(lon<42.0-(lat-20.7)*0.47)return 'hejaz';
  if(lat>=26&&lon<44.8)return 'shammar';
  return 'nejd';
 }
 const nameKey=value=>String(value??'').trim().replace(/\s+/g,' ').toLowerCase();
 function uniqueName(base,used){
  let name=base,n=1;
  while(used.has(nameKey(name))){
   const suffix=' — conference remainder'+(n===1?'':' '+n);
   name=base.slice(0,70-suffix.length)+suffix;n++;
  }
  used.add(nameKey(name));return name;
 }
 function components(ids,edges){
  const left=new Set(ids),parts=[];
  while(left.size){
   const part=[left.values().next().value];left.delete(part[0]);
   for(let n=0;n<part.length;n++)for(const adjacent of edges.get(part[n]))if(left.delete(adjacent))part.push(adjacent);
   part.sort((a,b)=>a-b);parts.push(part);
  }
  return parts;
 }
 function regionalName(key,ids,byId,used){
  const places=ids.map(i=>byId.get(i)),lon=places.reduce((sum,c)=>sum+c.lon,0)/places.length,lat=places.reduce((sum,c)=>sum+c.lat,0)/places.length;
  let names;
  if(key==='a'){
   if(places.some(c=>['Mosul','Erbil','Kirkuk'].includes(c.city))||lon>=41)names=['Upper Mesopotamia','Jazira Territory','Tigris Highlands'];
   else if(places.some(c=>c.city==='Aleppo')||lat>=35.1)names=['Aleppo Territory','Northern Levant','Syrian Interior'];
   else names=['Syrian Interior','Damascus Territory','Central Levant'];
  }else names=lon<37.5?['East Bank','Jordan Valley Territory','Moab Territory']:['Northern Arabian Territory','Syrian Desert','Desert Marches'];
  let name=names.find(candidate=>!used.has(nameKey(candidate)));
  if(!name){let n=2;do{name=names[0]+' '+n++;}while(used.has(nameKey(name)));}
  used.add(nameKey(name));return name;
 }
 function propose(cells,territories){
  if(!Array.isArray(cells)||!Array.isArray(territories))throw new Error('The map could not be read. Return to the drawing table and try again.');
  const playable=cells.filter(c=>c&&c.land!==false&&c.playable!==false&&!c.fixed&&!c.locked&&c.mergeTarget==null).sort((a,b)=>a.i-b.i);
  const byId=new Map(),aliases=new Map();
  for(const c of playable){
   if(!Number.isSafeInteger(c.i)||c.i<0||byId.has(c.i)||!Number.isFinite(c.lon)||!Number.isFinite(c.lat))throw new Error('Some map cells could not be read. Reload the game before completing the map.');
   byId.set(c.i,c);aliases.set(c.i,c.i);
  }
  for(const c of playable)for(const i of c.absorbed||[])if(!byId.has(i))aliases.set(i,c.i);
  for(const c of cells)if(c&&c.mergeTarget!=null&&byId.has(c.mergeTarget))aliases.set(c.i,c.mergeTarget);
  // Browser callers supply the same canonical graph used by chronicleInput.
  // Database cells already contain it. Never infer a connection from proximity:
  // an omitted edge must not let completion jump a fixed or player-owned strip.
  const edges=new Map(playable.map(c=>[c.i,new Set()]));
  for(const c of cells){
   const from=aliases.get(c?.i);if(from===undefined)continue;
   for(const adjacent of c.neighbours||[]){
    const to=aliases.get(adjacent);if(to===undefined||to===from)continue;
    edges.get(from).add(to);edges.get(to).add(from);
   }
  }
  const owners=new Map();
  for(const [index,t] of territories.entries()){
   if(!t||!Array.isArray(t.cells))throw new Error('Save your current territory before completing the map.');
   for(const value of t.cells){
    const i=typeof value==='object'&&value?value.i:value;
    if(!Number.isSafeInteger(i)||i<0)throw new Error('Some territorial assignments could not be read. Save the map and try again.');
    const canonical=aliases.get(i);if(canonical===undefined)continue;
    if(owners.has(canonical)&&owners.get(canonical)!==index)throw new Error('Two territories overlap. Save their boundaries before completing the map.');
    owners.set(canonical,index);
   }
  }
  const groups=new Map();let count=0;
  for(const c of playable){
   if(owners.has(c.i))continue;
   const key=zoneFor(c);if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(c.i);count++;
  }
  const usedNames=new Set(territories.map(t=>nameKey(t.name))),usedIds=new Set(territories.map(t=>String(t.id)));
  let nextId=1;
  const additions=[],extensions=[];
  for(const [key,base,status,power,relationship,sect] of definitions){
   if(!groups.has(key))continue;
   const extendable=key==='a'||key==='b',ownerIndex=extendable?territories.findIndex(t=>nameKey(t.name)===nameKey(base)):-1;
   // Keep the ordinary template grouping unless the player already created its
   // matching state. Only that case needs adjoining versus separated pieces.
   const parts=ownerIndex>=0?components(groups.get(key),edges):[groups.get(key)],extension=[];
   for(const part of parts){
    if(ownerIndex>=0&&part.some(i=>[...edges.get(i)].some(n=>owners.get(n)===ownerIndex))){extension.push(...part);continue;}
    const name=ownerIndex>=0?regionalName(key,part,byId,usedNames):uniqueName(base,usedNames);
    while(usedIds.has(String(nextId)))nextId++;
    additions.push({id:nextId,name,status,sect:status==='Imamate'?sect:null,power,relationship,cells:part});
    usedIds.add(String(nextId));nextId++;
   }
   if(extension.length)extensions.push({id:territories[ownerIndex].id,cells:extension.sort((a,b)=>a-b)});
  }
  if(territories.length+additions.length>255)throw new Error('There is not enough room for the remaining states: the map supports 255 territories. Combine some territories and try again.');
  return {territories:additions,extensions,count,territoryCount:additions.length,mode:MODE,note:NOTE};
 }
 return Object.freeze({propose});
});
