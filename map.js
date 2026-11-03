(async()=>{const root=document.getElementById('frontiers-v2'),q=id=>root.querySelector('#'+id),map=q('v2-map'),NS='http://www.w3.org/2000/svg';let oldCells=null;async function loadLegacy(){if(!oldCells){const r=await fetch(window.FrontiersLegacyURL);if(!r.ok)throw new Error('Saved-map converter unavailable');oldCells=await r.json();}}if(window.FrontiersStore.state?.modelContent?.version===2)await loadLegacy();const R=8.5,W=Math.sqrt(3)*R,step=1.5*R,cells=[],grid=new Map();let adjustedCells=[];
for(let row=-1;row<=Math.ceil(800/step)+1;row++)for(let col=-1;col<=Math.ceil(800/W)+1;col++){const x=W*(col+(row&1)/2),y=step*row,verts=Array.from({length:6},(_,k)=>[+(x+R*Math.cos((60*k-30)*Math.PI/180)).toFixed(3),+(y+R*Math.sin((60*k-30)*Math.PI/180)).toFixed(3)]),i=cells.length;const lat=(2*Math.atan(Math.exp((400-y)/1110+Math.log(Math.tan(Math.PI/4+28*Math.PI/360))))-Math.PI/2)*180/Math.PI;const c={i,x,y,lon:43+(x-400)/1110*180/Math.PI,lat,land:false,row,col,verts,d:'M'+verts.map(v=>v.join(',')).join('L')+'Z'};cells.push(c);grid.set(row+','+col,c);}
function nearestHex(x,y){for(const c of adjustedCells)if(c.hitPath&&x>=c.bounds[0]&&y>=c.bounds[1]&&x<=c.bounds[2]&&y<=c.bounds[3]&&c.hitContext.isPointInPath(c.hitPath,x,y))return c.mergeTarget!==undefined?cells[c.mergeTarget]:c;const row=Math.round(y/step),col=Math.round(x/W-(row&1)/2);let best=null,dist=Infinity;for(let rr=row-1;rr<=row+1;rr++)for(let cc=col-1;cc<=col+1;cc++){const c=grid.get(rr+','+cc);if(c){const d=(c.x-x)**2+(c.y-y)**2;if(d<dist){best=c;dist=d;}}}return best?.mergeTarget!==undefined?cells[best.mergeTarget]:best;}
const cityLayout=window.FrontiersMapData.cityLayout,cityHitContext=document.createElement('canvas').getContext('2d');
for(const shape of cityLayout.shapes){const c=cells[shape.id];c.d=shape.d;c.x=shape.x;c.y=shape.y;c.hitPath=new Path2D(c.d);c.hitContext=cityHitContext;c.neighbours=shape.neighbours;}
adjustedCells=cityLayout.shapes.map(shape=>cells[shape.id]);
for(const c of adjustedCells){const points=[...c.d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m=>[+m[1],+m[2]]);c.bounds=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];}
for(const [id,areaPixels,pickX,pickY] of window.FrontiersMapData.cellMetrics){Object.assign(cells[id],{land:true,areaPixels,pickX,pickY});}
for(const city of cityLayout.centres){const c=cells[city.id];c.city=city.name;c.pickX=city.x;c.pickY=city.y;}
let pixels=null;
function landPixels(){if(pixels)return pixels;const mask=document.createElement('canvas');mask.width=mask.height=1600;const ctx=mask.getContext('2d',{willReadFrequently:true});ctx.scale(2,2);ctx.clip(new Path2D(q('v2-playableclip').querySelector('path').getAttribute('d')));ctx.fill(new Path2D(q('v2-landclip').querySelector('path').getAttribute('d')));ctx.globalCompositeOperation='destination-out';ctx.lineWidth=3;for(const path of q('v2-fixed-territories').querySelectorAll('path')){const shape=new Path2D(path.getAttribute('d'));ctx.fill(shape);ctx.stroke(shape);}return pixels=ctx.getImageData(0,0,1600,1600).data;}
let initialOwners='';try{initialOwners=atob(window.FrontiersStore.state?.modelContent?.assignments||'');}catch{}
const fragments=cells.filter(c=>c.land&&!c.city&&c.areaPixels<260).sort((a,b)=>a.areaPixels-b.areaPixels);
for(const fragment of fragments){
 const originalOwner=initialOwners.charCodeAt(fragment.i)||0;
 const neighbours=cells.filter(c=>c.land&&!c.city&&c!==fragment&&c.areaPixels>=260&&(fragment.neighbours?fragment.neighbours.includes(c.i):Math.hypot(c.x-fragment.x,c.y-fragment.y)<W+1)&&(!originalOwner||!(initialOwners.charCodeAt(c.i)||0)||initialOwners.charCodeAt(c.i)===originalOwner));
 neighbours.sort((a,b)=>b.areaPixels-a.areaPixels);const target=neighbours[0];if(!target)continue;
 target.d+=fragment.d;if(target.hitPath){target.hitPath=new Path2D(target.d);const points=[...fragment.d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m=>[+m[1],+m[2]]);target.bounds=[Math.min(target.bounds[0],...points.map(p=>p[0])),Math.min(target.bounds[1],...points.map(p=>p[1])),Math.max(target.bounds[2],...points.map(p=>p[0])),Math.max(target.bounds[3],...points.map(p=>p[1]))];}target.absorbed=(target.absorbed||[]).concat(fragment.i);fragment.mergeTarget=target.i;fragment.land=false;
}
function ownerFor(c,owners){return owners.charCodeAt(c.i)||c.absorbed?.map(i=>owners.charCodeAt(i)||0).find(Boolean)||0;}
const byId=new Map(cells.map(c=>[c.i,c]));let selected=new Set(),territories=[],layer='none',mode='paint',history=[],active=null,inspectedTerritory=null,drag=null,view={x:50,y:0,w:750};
const layers={"none":{"labels":["Assigned territory","Selected land","Direct administration: hatched"],"colors":["#dba68d","#c5785b","#886453"]},"ethnicity":{"title":"Ethnicity & language","labels":["Arabic-speaking regions","Turkish-speaking regions","Kurdish communities","Greek communities","Armenian communities","Mixed ethnic and language communities","Sparsely populated"],"colors":["#dfb84e","#ce8764","#62a18b","#649ebc","#ae80b6","#aea593","#eadbb4"]},"population":{"title":"Population concentration","labels":["Sparse / dispersed settlement","Settled countryside / river belts","Denser Levant coast","Town concentrations · enlarged"],"colors":["#e4d7b4","#c39c63","#9e6d45","#704634"]},"religion":{"title":"Religious communities","labels":["Largely Sunni Muslim Communities","Largely Shia Muslim Communities","Christian & Druze communities","Jewish, Christian & Muslim towns","Largely Ibadi Muslim Communities"],"colors":["#91af72","#48a4ad","#ad7bb9","#e4b54a","#d4865d"]},"lifestyle":{"title":"Livelihoods","labels":["Pastoral / seasonal mobility","Farming / village settlement","Mixed farming & grazing","Urban / trade centres"],"colors":["#d6b67c","#6eac80","#aaad65","#a67dae"]},"agriculture":{"title":"Agriculture & grazing","labels":["Limited cultivation / grazing","Crops / pasture mosaic","Orchards / field crops","Irrigation / oasis cultivation"],"colors":["#dbc084","#b8ae69","#80ab5f","#4b9f8e"]}};
const evidenceData=window.FrontiersMapData.evidenceData;
const washData=window.FrontiersMapData.washData;
function el(tag,attrs){const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;}cells.filter(c=>c.land||c.mergeTarget!==undefined).forEach(c=>{const e=el('path',{d:c.d,'data-cell':c.i,'data-merged-into':c.mergeTarget??'','data-city':c.city||'',class:'v2-cell',fill:'transparent'});q('v2-cells').appendChild(e);c.node=e;if(c.mergeTarget!==undefined)e.style.display='none';if(c.city)e.setAttribute('aria-label',c.city+' city cell');});
for(const o of q('v2-polity').options)o.value=o.textContent;
function safeText(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const polityDescriptions={
'Zaydistan':'An Iraqi imamate joining river towns, agricultural districts and centres of religious learning under an imam. Clerical councils and local notables form the pillars of its government.',
'Turkey':'A secular Turkish republic centred on Anatolia, with sovereignty vested in republican institutions rather than the Ottoman dynasty.',
'Ottoman Sultanate':'A surviving Ottoman monarchy under the House of Osman. The sultan retains the throne and the prestige of the imperial court within a reduced realm.',
'Jewish National Home':'A territory for Jewish national life and settlement, with Hebrew cultural institutions and a public home for communities arriving from the diaspora alongside existing residents.',
'Izmir':'An Aegean harbour state centred on Smyrna, with merchant houses, busy quays and trade routes into the Anatolian interior.',
'Hellenic Anatolia':'A Greek-governed territory on the Anatolian coast and its hinterland, with the port of Smyrna and its mixed communities at the centre of its political life.',
'Syria':'A Levantine country linking the merchant cities of Damascus and Aleppo with Mediterranean ports and an agricultural hinterland.',
'Iranshahr':'A hypothetical Persian-oriented frontier state, reviving an old name for the Iranian realm.',
'Mesopotamia':'A river country along the Tigris and Euphrates, drawing its strength from irrigated farmland, the markets of Baghdad and Basra, and trade with the Gulf.',
'Palestine':'A country of Mediterranean ports, inland market towns and holy places, home to Muslim, Christian and Jewish communities.',
'Transjordan':'A country east of the Jordan, spanning upland farming districts, desert grazing lands and the caravan routes towards Arabia.',
'Mount Lebanon':'A mountain territory of terraced farms, silk-growing villages and strong local communities, closely tied to the trade of Beirut.',
'Armenia':'An Armenian homeland in the eastern highlands, with church, village and merchant networks at the heart of its national life.',
'Kurdistan':'A Kurdish homeland across the mountain districts between Anatolia, Persia and Mesopotamia, linking highland towns, farming valleys and pastoral communities.',
'Hejaz':'A western Arabian realm of pilgrimage cities and Red Sea ports. The holy places and the annual pilgrimage give its rulers influence far beyond its frontiers.',
'Nejd':'A central Arabian realm of oasis towns, pastoral communities and desert routes, with Riyadh as a centre of political power.',
'Jebel Shammar':'A northern Arabian emirate centred on Ha’il, associated with the Rashidi dynasty and the caravan roads between Mesopotamia and the Hejaz.',
'Asir':'A southwestern Arabian highland realm of terraced agriculture and tribal communities, connected to the Red Sea through its coastal plain.',
'Hadhramaut':'A southern Arabian country of wadi towns, farming settlements and ports, sustained by commerce and family connections across the Indian Ocean.',
'Oman':'An Omani realm of oasis settlements and desert communities, with a strong Ibadi religious tradition.',
'Arab Federation':'A union of Arab territories with a common government for shared affairs and regional institutions for its constituent lands.',
'International City':'A city governed by an international authority, with protected access for visitors and safeguards for its residents and holy places.',
'Free Port':'An internationally administered harbour territory open to merchant shipping of every flag, with guaranteed commercial access and common customs rules.',
'Shared Grazing Territory':'Common pasture and caravan country, with shared rights to wells, seasonal grazing and passage across the land.'};
const presetNames=new Map(Object.keys(polityDescriptions).map(name=>[polityNameKey(name),name]));
presetNames.set('imamate of iraq','Zaydistan');presetNames.set('jerusalem international city','International City');
function polityNameKey(value){return String(value??'').trim().replace(/\s+/g,' ').toLowerCase();}
function normalizePolityName(value){const name=String(value??'').trim();return presetNames.get(polityNameKey(name))||name;}
function normalizePower(value){const key=polityNameKey(normalizePolityName(value));return [...colonialPowers,...territories.map(t=>t.name)].find(name=>polityNameKey(name)===key)||normalizePolityName(value);}
function selectedPolityName(){return normalizePolityName(q('v2-polity').value);}
const statusDescriptions={
'Independent state':'A sovereign government responsible for its own laws, defence and foreign affairs.',
'Autonomous territory':'A self-governing territory within a treaty association, with local institutions and a partner responsible for wider affairs.',
'Direct colonial administration':'A territory governed directly by an imperial power through its own officials.',
'Protectorate':'A territory retaining its own government under the protection of a foreign power, which directs its defence and foreign relations.',
'International administration':'A territory governed jointly by an international authority representing several powers.',
'Imamate':'A state led by an imam who combines religious leadership with political authority, supported by clerics and local councils.',
'Unsettled frontier / shared rights':'Land held under shared grazing, passage and access rights, without a final division of sovereignty.'};
const legacyPalette=['#739da8','#c69d50','#869c68','#a88aaa','#c5806d','#719c91','#a9a460','#8393b6','#b88298','#a88f6a','#5f9ea9','#a48bbf','#bcaf78','#7eaa82','#bb8870','#90a5bc','#bd9bad','#7ba499','#b89e5c','#9a927f'];
const palette=['#3f8fc4','#dfac36','#5da35a','#ae72be','#de725f','#2e9c91','#c781b0','#7a85c2','#a79545','#a86543','#74b9c4','#d3803f','#6e9b82','#b35378','#83a5db','#b3b256','#84725a','#bb98d9','#519568','#da9f82'];
function countryColor(i){return palette[i]||`hsl(${(i*137.5)%360} 52% 54%)`;}
function restoredColor(color,i){return legacyPalette.includes(String(color).toLowerCase())?countryColor(i):color||countryColor(i);}
function colorRGB(c){
 if(/^#[0-9a-f]{6}$/i.test(c))return [1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
 const hsl=c.match(/^hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)$/);if(!hsl)return null;
 const h=Number(hsl[1])/30,s=Number(hsl[2])/100,l=Number(hsl[3])/100,a=s*Math.min(l,1-l);
 return [0,8,4].map(n=>{const k=(n+h)%12;return 255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)));});
}
function colorDistance(a,b){const x=colorRGB(a),y=colorRGB(b);return x&&y?Math.sqrt(x.reduce((n,v,i)=>n+(v-y[i])**2,0)):0;}
function availableColor(){
 const used=new Set(territories.map(t=>t.color)),candidates=Array.from({length:Math.max(palette.length,territories.length+12)},(_,i)=>countryColor(i)).filter(c=>!used.has(c));
 if(!candidates.length){let i=palette.length;while(used.has(countryColor(i)))i++;return countryColor(i);}
 const points=[...selected].map(i=>byId.get(i)).filter(Boolean);
 if(!points.length||!territories.length)return candidates[0];
 const neighbours=territories.map(t=>({color:t.color,distance:Math.min(...t.cells.filter(i=>!selected.has(i)).map(i=>{const c=byId.get(i);return Math.min(...points.map(p=>Math.hypot(c.x-p.x,c.y-p.y)));}))})).filter(t=>Number.isFinite(t.distance)).sort((a,b)=>a.distance-b.distance).slice(0,4);
 const merit=color=>neighbours.length?Math.min(...neighbours.map(t=>colorDistance(color,t.color)*(1+t.distance/100))):0;
 return candidates.reduce((best,c)=>merit(c)>merit(best)?c:best,candidates[0]);
}
let draftColor=null;
function selectionColor(){return territories.find(t=>t.id===active)?.color||(draftColor??=availableColor());}
function draftTerritory(){return {name:selectedPolityName(),status:q('v2-status').value,sect:q('v2-sect').value,relationship:q('v2-relationship').value,power:q('v2-power').value};}
function fillTerritoryForm(t){
 t={...t,name:normalizePolityName(t.name),power:normalizePower(t.power)};
 const select=q('v2-polity');
 if(!presetNames.has(polityNameKey(t.name))&&territories.some(saved=>saved.id===active&&saved.name===t.name)&&![...select.options].some(o=>o.value===t.name)){const option=document.createElement('option');option.value=t.name;option.dataset.legacyName='true';option.textContent=t.name+' · saved name';select.append(option);}
 if([...select.options].some(o=>o.value===t.name))select.value=t.name;
 q('v2-status').value=t.status;q('v2-sect').value=Object.hasOwn(sectDescriptions,t.sect)?t.sect:t.status==='Imamate'?'':'Sunni';q('v2-relationship').value=t.relationship||'None';relationships();q('v2-power').value=t.power||'';
}
function syncNames(){
 const select=q('v2-polity'),current=territories.find(t=>t.id===active),used=new Set(territories.filter(t=>t.id!==active).map(t=>polityNameKey(t.name)));
 for(const o of [...select.options]){if(o.dataset.legacyName&&o.value!==current?.name){o.remove();continue;}o.disabled=used.has(polityNameKey(o.value));o.textContent=o.value+(o.disabled?' · already assigned':o.dataset.legacyName?' · saved name':'');}
 if(!select.value||select.selectedOptions[0]?.disabled)select.value=[...select.options].find(o=>!o.disabled)?.value||'';
}
function pack(ids){const a=new Uint8Array(Math.ceil(cells.length/8));ids.forEach(i=>{if(byId.has(i))a[i>>3]|=1<<(i&7);});return btoa(String.fromCharCode(...a));}
function unpack(s){try{const a=atob(s||'');return [...new Set(cells.filter(c=>(c.land||c.mergeTarget!==undefined)&&((a.charCodeAt(c.i>>3)||0)&(1<<(c.i&7)))).map(c=>c.mergeTarget??c.i))];}catch{return[];}}
function updateBrush(){const n=Number(q('v2-brush').value),text=n===1?'1 hex':n+' hexes';q('v2-brush-value').textContent=text;q('v2-brush').setAttribute('aria-valuetext',text+' wide');refreshHover();}q('v2-brush').oninput=updateBrush;q('v2-brush').onchange=()=>{updateBrush();save();};
function snapshot(){return {layer,selected:[...selected],territories:territories.map(t=>({...t,cells:[...t.cells]})),active,draft:draftTerritory()};}
function push(){history.push(snapshot());if(history.length>20)history.shift();}
function save(){const owners=new Uint8Array(cells.length);territories.forEach((t,j)=>t.cells.forEach(i=>owners[i]=j+1));window.FrontiersStore.save({modelContent:{version:3,layer,selected:pack([...selected]),assignments:btoa(String.fromCharCode(...owners)),territories:territories.map(({cells,...t})=>t),active,draft:draftTerritory()},privateContent:{theme,brushWidth:Number(q('v2-brush').value),evidenceId}});}
function restore(s){if(['light','dark'].includes(s?.privateContent?.theme))theme=s.privateContent.theme;applyTheme();evidenceId=evidenceData.records.some(r=>r.id===s?.privateContent?.evidenceId)?s.privateContent.evidenceId:null;if(s?.privateContent?.brushWidth){q('v2-brush').value=Math.max(1,Math.min(10,Number(s.privateContent.brushWidth)||3));}updateBrush();const a=s?.modelContent;if(a?.version!==3&&a?.version!==2)return;
const decode=a.version===3?unpack:oldToHex;
let owners='';try{owners=atob(a.assignments||'');}catch{}selected=new Set(decode(a.selected));territories=(a.territories||[]).slice(0,255).map((t,i)=>{const name=normalizePolityName(t.name||'Territory');return {...t,name,cells:owners?cells.filter(c=>c.land&&ownerFor(c,owners)===i+1).map(c=>c.i):decode(t.cells),color:a.version===3?restoredColor(t.color,i):countryColor(i)};}).filter(t=>t.cells.length);territories.forEach(t=>t.power=normalizePower(t.power));
layer=layers[a.layer]?a.layer:'none';active=territories.some(t=>t.id===a.active)?a.active:null;syncNames();const draft=a.draft||territories.find(t=>t.id===active);if(draft)fillTerritoryForm(draft);}
function oldToHex(ids){const set=new Set(ids||[]),polys=oldCells.filter(c=>set.has(c.i)).map(c=>c.d.slice(1,-1).split('L').map(s=>s.split(',').map(Number)));function inside(x,y,p){let on=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if(((p[i][1]>y)!==(p[j][1]>y))&&(x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0]))on=!on;}return on;}return cells.filter(c=>c.land&&polys.some(p=>inside(c.x,c.y,p))).map(c=>c.i);}
const sectDescriptions={
 Sunni:'Recognises the first four caliphs as legitimate successors to Muhammad, with authority shaped by Sunni legal traditions.',
 Shia:'Emphasises the religious leadership of Ali and his descendants; different Shia traditions understand the imamate differently.',
 Ibadi:'A distinct Islamic tradition strongly associated with Oman, with an imamate traditionally based on selecting a qualified leader.'
};
const powerLabels={Britain:'Great Britain',France:'France',Russia:'Russia',Italy:'Italy',Greece:'Greece',Persia:'Persia'};
const colonialAdjectives={Britain:'British',France:'French',Russia:'Russian',Italy:'Italian',Greece:'Greek',Persia:'Persian'};
function territoryLabel(t){if(t.status==='Direct colonial administration'&&t.power)return (colonialAdjectives[t.power]||t.power)+' '+t.name;if(['Protectorate','Autonomous territory'].includes(t.status)&&t.power)return t.name+' ('+(powerLabels[t.power]||t.power)+')';return t.name;}
const externalPowers=['Britain','France','Russia','Italy','Persia'];
const colonialPowers=[...externalPowers,'Greece'];
const markedPorts=new Set(['Constantinople','Smyrna','Trebizond','Beirut','Haifa','Aqaba','Basra','Jeddah','Yanbu']);
function hasMarkedPort(ids){return [...ids].some(i=>markedPorts.has(byId.get(i)?.city));}
function holyCityIssue(name,ids){return normalizePolityName(name)==='Jewish National Home'&&[...ids].some(i=>['Mecca','Medina','Najaf'].includes(byId.get(i)?.city))?'Mecca, Medina and Najaf cannot be part of a Jewish National Home. Remove their city hexes from this selection or choose another territory name.':'';}
function updateAssignmentAction(){
 const name=selectedPolityName(),inland=name==='Free Port'&&!hasMarkedPort(selected),unsupportedSect=q('v2-status').value==='Imamate'&&!['Sunni','Shia','Ibadi'].includes(q('v2-sect').value);
 const issue=holyCityIssue(name,selected)||(unsupportedSect?'Choose Sunni, Shia or Ibadi before saving this imamate.':inland?'Include a marked port in the selected land before assigning a Free Port.':'');
 q('v2-assign').disabled=!selected.size||!name||!!issue||(q('v2-status').value==='Autonomous territory'&&!q('v2-power').value);q('v2-assign').title=issue;q('v2-assignment-note').hidden=!issue;q('v2-assignment-note').textContent=issue;syncMapActions();
}
const relationshipDescriptions={
 'None':'No special relationship with an outside power.',
 'Sphere of influence':'An outside power enjoys privileged political and commercial influence while the territory retains its own government.',
 'Treaty association':'A formal partnership with defined obligations in defence, trade or foreign affairs and guarantees for local government.'
};
function allowedPowers(status){return [...new Set([...(['Protectorate','Direct colonial administration'].includes(status)?colonialPowers:externalPowers),...(status==='Autonomous territory'?territories.filter(t=>t.id!==active&&t.cells.length&&['Independent state','Imamate','Protectorate'].includes(t.status)).map(t=>t.name):[])])];}
const statusRules={
 'Jewish National Home':['Independent state','Autonomous territory','Direct colonial administration','Protectorate','International administration'],
 'International City':['International administration'],
 'Free Port':['International administration'],
 'Shared Grazing Territory':['Unsettled frontier / shared rights','Direct colonial administration'],
 'Arab Federation':['Independent state','Autonomous territory','Imamate','Protectorate'],
 'Zaydistan':['Imamate'],'Hellenic Anatolia':['Independent state','Autonomous territory','Protectorate','Direct colonial administration','International administration','Unsettled frontier / shared rights']
};
function syncStatuses(){const select=q('v2-status'),name=selectedPolityName(),allowed=Object.hasOwn(statusRules,name)?statusRules[name]:null;for(const o of select.options){o.disabled=!!allowed&&!allowed.includes(o.value);o.hidden=o.disabled;}if(select.selectedOptions[0]?.disabled)select.value=allowed[0];}
function relationships(){syncStatuses();
 q('v2-polity-description').textContent=Object.hasOwn(polityDescriptions,selectedPolityName())?polityDescriptions[selectedPolityName()]:'A name retained from your saved map. You can keep this territory or choose one of the listed period names.';
 const status=q('v2-status').value,direct=['Direct colonial administration','Protectorate'].includes(status),autonomous=status==='Autonomous territory',international=status==='International administration',unsettled=status==='Unsettled frontier / shared rights';
 q('v2-status-description').textContent=statusDescriptions[status]||'';
 q('v2-sect-field').hidden=status!=='Imamate';q('v2-sect-description').hidden=status!=='Imamate';q('v2-sect-description').textContent=sectDescriptions[q('v2-sect').value]||'Choose Sunni, Shia or Ibadi to continue. Existing saved land is kept until you save your correction.';
 const relation=q('v2-relationship'),power=q('v2-power'),previous=power.value;
 if(autonomous)relation.value='Treaty association';
 if(direct||international||unsettled)relation.value='None';
 relation.disabled=autonomous;
 q('v2-relationship-field').hidden=direct||international||unsettled;
 power.replaceChildren();
 if(autonomous){const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a treaty partner';placeholder.disabled=true;power.append(placeholder);}
 const choices=allowedPowers(status);
 choices.forEach(name=>{const option=document.createElement('option');option.value=name;option.textContent=name;power.append(option);});
 power.value=choices.includes(previous)?previous:(autonomous?'':'Britain');
 power.required=autonomous;
 q('v2-power-field').hidden=international||unsettled||(!direct&&relation.value==='None');
 if(q('v2-power-field').hidden)power.value='';
 q('v2-power-label').textContent=autonomous?'External power / treaty partner':direct?(status==='Protectorate'?'Protecting power':'Administering power'):'External power';
 q('v2-terms').hidden=direct||unsettled;
 q('v2-terms').textContent=international?'Joint government by an international authority.':relationshipDescriptions[relation.value];
 updateAssignmentAction();
}

let evidenceId=null,theme='dark';
function applyTheme(){root.dataset.theme=theme;q('v2-theme').setAttribute('aria-checked',String(theme==='dark'));q('v2-theme').title=theme==='dark'?'Switch to light mode':'Switch to dark mode';}
q('v2-theme').onclick=()=>{theme=theme==='dark'?'light':'dark';applyTheme();save();};applyTheme();
function evidenceRecords(){return evidenceData.records.filter(r=>r.layer===layer);}
function evidenceLink(key){const s=evidenceData.sources[key],a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=s.title;return a;}
function showEvidence(id){

 const records=evidenceRecords(),r=records.find(r=>r.id===id)||records[0];evidenceId=r?.id||null;
 q('v2-evidence-detail').replaceChildren();if(!r)return;
 q('v2-evidence-place').value=r.id;
 const detail=q('v2-evidence-detail');
 for(const [tag,cls,txt]of[['h3','',r.location],['p','v2-evidence-date',r.date],['p','',r.finding]]){
  const n=document.createElement(tag);n.className=cls;n.textContent=txt;detail.append(n);
 }
 const sourceBox=document.createElement('div');sourceBox.className='v2-evidence-sources';
 r.sources.forEach(key=>{const p=document.createElement('p');p.append(evidenceLink(key));sourceBox.append(p);});detail.append(sourceBox);
 if(r.war){const note=evidenceData.wartimeNotes[r.war],box=document.createElement('div');box.className='v2-evidence-war';const h=document.createElement('strong'),p=document.createElement('p');h.textContent=note.title;p.textContent=note.text;box.append(h,p,evidenceLink(note.source));detail.append(box);}
 drawEvidenceMarkers();
}
let drawnLayer=null;
function drawEvidenceMarkers(){
 let group=q('v2-evidence-marks');if(!group){group=el('g',{id:'v2-evidence-marks','clip-path':'url(#v2-landclip)'});q('v2-negotiating-land').after(group);}
 if(drawnLayer===layer)return;drawnLayer=layer;group.replaceChildren();if(layer==='none')return;
 const bounds=el('g',{'clip-path':'url(#v2-playableclip)'});group.append(bounds);
 washData.filter(w=>w.layer===layer).forEach(w=>{
  const attrs={d:w.d,'data-evidence-id':w.id,'aria-label':evidenceData.records.find(r=>r.id===w.id)?.location||'Regional tint',fill:w.stroke?'none':layers[layer].colors[w.category],stroke:w.stroke?layers[layer].colors[w.category]:'none','stroke-width':w.stroke||0,'stroke-linecap':'round','stroke-linejoin':'round','pointer-events':w.stroke?'stroke':'fill'};
  bounds.append(el('path',attrs));
  if(w.mixed)bounds.append(el('path',{d:w.d,fill:w.stroke?'none':'url(#v2-mixed-wash)',stroke:w.stroke?'url(#v2-mixed-wash)':'none','stroke-width':w.stroke||0,'stroke-linecap':'round','pointer-events':'none'}));
 });
}
function syncMapActions(){
 const current=territories.find(t=>t.id===active);
 q('v2-edit-context').textContent=current?'Editing '+current.name+' · '+selected.size+' hexes':selected.size?'New territory · '+selected.size+' hexes selected':'New territory · paint to select land';
 q('v2-map-save').hidden=!current;q('v2-map-save').disabled=q('v2-assign').disabled;
 q('v2-new-territory').textContent='Clear Selection';
 q('v2-new-territory').disabled=!current&&!selected.size&&inspectedTerritory===null;
}
function startNewTerritory(){push();selected.clear();active=null;inspectedTerritory=null;layer='none';render();setMode('paint');save();message('New territory. Paint land, then assign it. Existing countries have not changed.');}
function tileFacts(c){
 const data=window.FrontiersMapData,env=data.environment[c.i]||[],ethnic=data.ethnicity[c.i]||[];
 const describe=(values,labels)=>values.map((n,i)=>({n,label:labels[i]})).filter(v=>v.n>0).sort((a,b)=>b.n-a.n).map(v=>v.label).join('; ')||'Not mapped';
 return [['Ethnicity & language',describe(ethnic,layers.ethnicity.labels)],['Population',describe(env[2]||[],layers.population.labels)],['Religion',describe(env[3]||[],layers.religion.labels)],['Livelihoods',describe(env[1]||[],layers.lifestyle.labels)],['Agriculture',describe(env[0]||[],layers.agriculture.labels)],['Connections',[markedPorts.has(c.city)?'Port':null,(data.railwayCells[c.i]?.railways||[]).length?'Operating railway':null].filter(Boolean).join(' · ')||'No marked port or operating railway']];
}
function inspectTile(c){
 const card=q('v2-tile-card');card.hidden=false;inspectedTerritory=null;syncMapActions();
 if(!c?.land){q('v2-tile-title').textContent='Outside the negotiating area';q('v2-tile-facts').replaceChildren();q('v2-tile-owner').textContent='Protected territory or water.';q('v2-tile-edit').hidden=true;return;}
 const owner=territories.find(t=>t.cells.includes(c.i));inspectedTerritory=owner?.id??null;syncMapActions();
 if(owner)message('Selected '+owner.name+'. Choose Paint to add land, or Clear Selection to start a new territory.');
 q('v2-tile-title').textContent=(c.city||'Map tile')+' · at a glance';q('v2-tile-owner').textContent=owner?territoryLabel(owner)+' · '+owner.status:'Unassigned land';
 q('v2-tile-facts').innerHTML=tileFacts(c).map(([label,value])=>'<div><dt>'+safeText(label)+'</dt><dd>'+safeText(value)+'</dd></div>').join('');
 q('v2-tile-edit').hidden=!owner;q('v2-tile-edit').textContent=owner?'Edit '+owner.name:'';
 q('v2-tile-edit').onclick=()=>{if(owner){layer='none';if(active!==owner.id)edit(owner);else render();inspectedTerritory=null;setMode('paint');card.hidden=true;}};
}
q('v2-tile-close').onclick=()=>{q('v2-tile-card').hidden=true;};
q('v2-new-territory').onclick=startNewTerritory;
q('v2-map-save').onclick=()=>assignSelection();
function syncDossier(){const inspect=layer!=='none'&&mode==='pan';q('v2-proposal-dossier').hidden=inspect;q('v2-evidence-panel').hidden=!inspect;}
function renderEvidence(){
 const enabled=layer!=='none';root.dataset.overlay=String(enabled);syncDossier();
 q('v2-territory-labels').style.opacity=enabled?'.3':'1';q('v2-hatches').style.opacity=enabled?'0':'1';
 if(!enabled){drawEvidenceMarkers();return;}
 const records=evidenceRecords();q('v2-evidence-title').textContent=layers[layer].title;
 q('v2-evidence-coverage').textContent='Pre-war · select a region';
 const select=q('v2-evidence-place');select.replaceChildren();records.forEach(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=r.location;select.append(o);});
 select.onchange=()=>{showEvidence(select.value);save();};
 q('v2-legend').innerHTML=layers[layer].labels.map((label,i)=>`<div class="v2-key-row"><span class="v2-swatch" style="background:${layers[layer].colors[i]}"></span>${safeText(label)}</div>`).join('');
 const hatchLabel=['ethnicity','religion'].includes(layer)?'Hatching: overlapping communities':'Hatching: mixed local patterns';
 q('v2-legend').insertAdjacentHTML('beforeend','<div class="v2-key-row"><span class="v2-swatch v2-mixed-key"></span>'+hatchLabel+'</div>');
 showEvidence(evidenceId);
}
q('v2-back-proposal').onclick=()=>{layer='none';render();save();};

function styleCell(c,t,sel){
 if(t?.id===active&&!sel)t=null;
 const fill=sel?selectionColor():t?.color||'transparent';
 c.node.setAttribute('fill',fill);c.node.setAttribute('fill-opacity',layer==='none'?'.84':sel?'.14':'0');
 c.node.style.stroke=fill;c.node.style.strokeWidth='.35';c.node.classList.toggle('v2-unassigned',!sel&&!t);
}
// A separate outline stays visible above both proposal colours and evidence washes.
const hoverLand=el('g',{'clip-path':'url(#v2-landclip)','pointer-events':'none','aria-hidden':'true'}),hoverArea=el('g',{'clip-path':'url(#v2-playableclip)'}),hoverOutline=el('path',{id:'v2-hover-outline',fill:'none','vector-effect':'non-scaling-stroke'});
hoverArea.append(hoverOutline);hoverLand.append(hoverArea);map.append(hoverLand);
const hoverClips=['v2-playableclip','v2-landclip'].map(id=>new Path2D(q(id).querySelector('path').getAttribute('d')));
let hoverPoint=null;
function clearHover(){hoverPoint=null;hoverOutline.removeAttribute('d');hoverOutline.removeAttribute('data-cell');hoverOutline.removeAttribute('data-cells');}
function refreshHover(){
 if(!hoverPoint)return;
 const pt=hoverPoint,inside=hoverClips.every(path=>cityHitContext.isPointInPath(path,pt.x,pt.y)),cell=inside?nearestHex(pt.x,pt.y):null;
 if(!cell?.land){clearHover();return;}
 const footprint=mode==='paint'&&!spacePan?brushCells(pt):[cell],key=footprint.map(c=>c.i).join(',');
 if(hoverOutline.getAttribute('data-cells')===key)return;
 hoverOutline.setAttribute('d',footprint.map(c=>c.d).join(''));hoverOutline.setAttribute('data-cell',cell.i);hoverOutline.setAttribute('data-cells',key);
}
map.addEventListener('pointermove',e=>{
 if(e.pointerType==='touch'){clearHover();return;}
 hoverPoint=point(e);refreshHover();
});
for(const event of ['pointerleave','pointercancel','wheel','gesturestart'])map.addEventListener(event,clearHover);
map.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')clearHover();});
window.addEventListener('blur',clearHover);
function drawSelectionOutline(){
 drawTerritoryBorders();
 for(const path of q('v2-hatches')?.children||[]){const owner=Number(path.dataset.owner),id=Number(path.dataset.cell);path.style.display=owner===active&&!selected.has(id)||owner!==active&&selected.has(id)?'none':'';}
 let group=q('v2-selection-outline');
 if(!group){
  const filter=el('filter',{id:'v2-selection-glow',x:'-10%',y:'-10%',width:'120%',height:'120%',class:'v2-selection-halo'});
  filter.append(el('feMorphology',{in:'SourceAlpha',operator:'erode',radius:'1.5',result:'inside'}),el('feComposite',{in:'SourceAlpha',in2:'inside',operator:'out',result:'edge'}),el('feGaussianBlur',{in:'edge',stdDeviation:'.75',result:'soft'}),el('feFlood',{'flood-color':'#fff0a6',result:'light'}),el('feComposite',{in:'light',in2:'soft',operator:'in',result:'glow'}),el('feComposite',{in:'light',in2:'edge',operator:'in',result:'line'}));
  const merge=el('feMerge',{});merge.append(el('feMergeNode',{in:'glow'}),el('feMergeNode',{in:'line'}));filter.append(merge);map.querySelector('defs').append(filter);
  group=el('g',{id:'v2-selection-outline','pointer-events':'none',filter:'url(#v2-selection-glow)'});const land=el('g',{'clip-path':'url(#v2-landclip)'}),playable=el('g',{'clip-path':'url(#v2-playableclip)'});playable.append(el('path',{fill:'#fff',stroke:'none'}));land.append(playable);group.append(land);q('v2-cells').parentNode.append(group);
 }
 group.querySelector('path').setAttribute('d',[...selected].map(i=>byId.get(i)?.d||'').join(''));group.style.display=selected.size?'':'none';
}
function drawTerritoryBorders(){
 let group=q('v2-territory-borders');
 if(!group){
  const filter=el('filter',{id:'v2-territory-edge',x:'-2%',y:'-2%',width:'104%',height:'104%'});
  filter.append(el('feMorphology',{in:'SourceAlpha',operator:'erode',radius:'2.2',result:'inside'}),el('feComposite',{in:'SourceAlpha',in2:'inside',operator:'out',result:'edge'}),el('feMorphology',{in:'edge',operator:'dilate',radius:'.8',result:'wide'}),el('feFlood',{'flood-color':'#172b2f',result:'dark'}),el('feComposite',{in:'dark',in2:'wide',operator:'in',result:'halo'}),el('feComposite',{in:'SourceGraphic',in2:'edge',operator:'in',result:'colour'}));
  const merge=el('feMerge',{});merge.append(el('feMergeNode',{in:'halo'}),el('feMergeNode',{in:'colour'}));filter.append(merge);map.querySelector('defs').append(filter);
  group=el('g',{id:'v2-territory-borders','clip-path':'url(#v2-playableclip)','pointer-events':'none','aria-hidden':'true'});q('v2-cells').parentNode.append(group);
 }
 const live=new Set(territories.map(t=>String(t.id)));for(const path of [...group.children])if(!live.has(path.dataset.owner))path.remove();
 for(const t of territories){let path=[...group.children].find(p=>p.dataset.owner===String(t.id));if(!path){path=el('path',{'data-owner':t.id,stroke:'none',filter:'url(#v2-territory-edge)'});group.append(path);}const d=t.id===active?'':t.cells.filter(i=>!selected.has(i)).map(i=>byId.get(i)?.d||'').join('');if(path.getAttribute('d')!==d)path.setAttribute('d',d);path.setAttribute('fill',t.color);}
}
function countryLabel(t){
 const pts=t.cells.map(i=>byId.get(i)),cx=pts.reduce((n,c)=>n+c.pickX,0)/pts.length,cy=pts.reduce((n,c)=>n+c.pickY,0)/pts.length;
 const ranked=[...pts].sort((a,b)=>(a.pickX-cx)**2+(a.pickY-cy)**2-((b.pickX-cx)**2+(b.pickY-cy)**2)),centre=ranked[0];
 const label=el('text',{x:centre.pickX,y:centre.pickY,'text-anchor':'middle',class:'v2-assigned-name','aria-label':territoryLabel(t),'data-active':String(t.id===active),'data-size':pts.length});
 label._anchors=ranked.filter((_,i)=>i===0||i%Math.max(1,Math.floor(ranked.length/12))===0).slice(0,13).map(c=>[c.pickX,c.pickY]);
 const associated=['Autonomous territory','Protectorate'].includes(t.status)&&t.power,main=(associated?t.name:territoryLabel(t)).toUpperCase(),words=main.split(' ');
 const lines=main.length>17&&words.length>1?[words.slice(0,Math.ceil(words.length/2)).join(' '),words.slice(Math.ceil(words.length/2)).join(' ')]:[main];
 lines.forEach((line,i)=>{const span=el('tspan',{x:centre.pickX,'data-label-line':'name',...(i?{dy:13}:{})});span.textContent=line;label.append(span);});
 if(associated){const span=el('tspan',{x:centre.pickX,dy:13,'data-label-line':'patron'});span.textContent='('+(powerLabels[t.power]||t.power)+')';label.append(span);}
 const title=el('title',{});title.textContent=territoryLabel(t);label.append(title);return label;
}
function render(){draftColor=null;if(selectionFrame){cancelAnimationFrame(selectionFrame);selectionFrame=0;}lastSelection=new Set(selected);scheduleMapLabels();selected=new Set([...selected].filter(i=>byId.get(i)?.land));territories=territories.map(t=>({...t,cells:t.cells.filter(i=>byId.get(i)?.land)})).filter(t=>t.cells.length);if(active!==null&&!territories.some(t=>t.id===active))active=null;syncNames();const owner=new Map();territories.forEach(t=>t.cells.forEach(i=>owner.set(i,t)));cells.forEach(c=>{if(c.node)styleCell(c,owner.get(c.i),selected.has(c.i));});
q('v2-territory-labels').replaceChildren();let patternLayer=q('v2-hatches');if(!patternLayer){patternLayer=el('g',{'clip-path':'url(#v2-playableclip)','pointer-events':'none',id:'v2-hatches'});q('v2-cells').after(patternLayer);}patternLayer.replaceChildren();territories.forEach(t=>{const pattern={'Direct colonial administration':'v2-colonial','Protectorate':'v2-protectorate','Autonomous territory':'v2-autonomous'}[t.status];if(pattern)t.cells.forEach(i=>patternLayer.appendChild(el('path',{d:byId.get(i).d,fill:'url(#'+pattern+')','data-cell':i,'data-owner':t.id})));if(t.cells.length)q('v2-territory-labels').append(countryLabel(t));});drawSelectionOutline();
q('v2-cancel-overlay').hidden=layer==='none';q('v2-overlay-title').textContent=layer==='none'?'Map Legend':({ethnicity:'Ethnicity',population:'Population',religion:'Religion',lifestyle:'Livelihood',agriculture:'Agriculture'}[layer]);q('v2-count').textContent=selected.size?selected.size+(selected.size===1?' hex selected':' hexes selected'):'No land selected';q('v2-assign').disabled=!selected.size;q('v2-clear').disabled=!selected.size;q('v2-undo').disabled=!history.length;q('v2-assign').textContent=active===null?'Assign selected land →':'Save territory changes →';q('v2-legend').innerHTML=(layer==='none'?['Selected hexes','Fixed territory · locked','Direct control: coloured hatch',...territories.map(t=>territoryLabel(t))]:layers[layer].labels).map((n,i)=>`<div class="v2-key-row"><span class="v2-swatch" style="background:${layer==='none'?([selectionColor(),'#d9d8ce','#886453',...territories.map(t=>t.color)][i]):layers[layer].colors[i]}"></span>${safeText(n)}</div>`).join('')+'<div class="v2-key-row"><span style="display:inline-block;width:14px;border-top:1px dashed #676f62;margin-right:5px"></span>Broken lines: approximate game limits</div>';root.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layer===layer)));q('v2-territories').replaceChildren();if(!territories.length){const p=document.createElement('p');p.className='v2-small';p.style.marginTop='10px';p.textContent='Your territories will appear here.';q('v2-territories').appendChild(p);}territories.forEach(t=>{const b=document.createElement('button'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=territoryLabel(t);b.style.borderLeft='5px solid '+t.color;small.textContent=t.status+(t.status==='Imamate'&&t.sect?' · '+t.sect:'')+(t.power?' · '+t.power:'')+(t.relationship!=='None'?' · '+t.relationship:'');const action=document.createElement('span');action.textContent='Edit territory / add land →';action.style.cssText='display:block;margin-top:7px;font-size:12px;text-decoration:underline';b.append(strong,small,action);b.setAttribute('aria-label','Edit '+t.name+' / add land');b.onclick=()=>{setMode('paint');edit(t);};q('v2-territories').appendChild(b);});relationships();renderEvidence();if(layer==='none')q('v2-legend').insertAdjacentHTML('beforeend','<div class="v2-key-row"><span class="v2-swatch v2-protectorate-key"></span>Protectorate · dots</div><div class="v2-key-row"><span class="v2-swatch v2-autonomous-key"></span>Autonomy · horizontal lines</div>');renderCompletion();}
function edit(t){push();inspectedTerritory=null;active=t.id;syncNames();selected=new Set(t.cells);fillTerritoryForm(t);render();save();message('Editing '+t.name+'. Paint missed hexes or paint over another territory to transfer land. Erase to trim, then save territory changes.');}
function message(s){q('v2-map-message').textContent=s;}let spacePan=false,mapHovered=false;
function showMode(){refreshHover();syncDossier();if(mode!=='pan')q('v2-tile-card').hidden=true;const effective=spacePan?'pan':mode;root.dataset.mode=effective;['paint','erase','pan'].forEach(v=>q('v2-'+v).setAttribute('aria-pressed',String(v===effective)));map.style.cursor=effective==='pan'?(drag&&!drag.painting?'grabbing':'grab'):'crosshair';}
function setMode(m){mode=m;showMode();message(m==='pan'?'Pan / inspect: drag to move; pinch to zoom. Click any tile for all its information. No overlay needed. Select Paint to draw.':m==='paint'?'Paint mode: drag to select hexes. Right-click a hex to erase it. Hold Space while dragging to pan.':'Erase mode: drag to remove selected hexes. Hold Space while dragging to pan.');}
function chooseMode(m){
 const owner=m==='paint'&&mode==='pan'?territories.find(t=>t.id===inspectedTerritory):null;
 if(m!=='pan')inspectedTerritory=null;
 setMode(m);
 if(owner){layer='none';if(active!==owner.id)edit(owner);else{render();message('Editing '+owner.name+'. Paint to add land, then save territory changes.');}}
}
['paint','erase','pan'].forEach(m=>q('v2-'+m).onclick=()=>chooseMode(m));
map.onpointerenter=()=>{mapHovered=true;};map.onpointerleave=()=>{mapHovered=false;};
window.addEventListener('keydown',e=>{if(e.code!=='Space'||e.repeat||(!mapHovered&&!drag)||e.target.closest?.('input,select,textarea,[contenteditable=true]'))return;e.preventDefault();spacePan=true;if(drag?.painting){drag=null;save();}showMode();});
window.addEventListener('keyup',e=>{if(e.code==='Space'&&spacePan){e.preventDefault();spacePan=false;showMode();}});
window.addEventListener('blur',()=>{spacePan=false;drag=null;touchPoints.clear();pinch=null;ignoreTouchUntilUp=false;trackpadGesture=null;showMode();});
let selectionFrame=0,lastSelection=new Set();
function refreshSelection(){draftColor=null;
 selectionFrame=0;const owner=new Map();territories.forEach(t=>t.cells.forEach(i=>owner.set(i,t)));
 for(const i of new Set([...lastSelection,...selected])){const c=byId.get(i);if(c?.node)styleCell(c,owner.get(i),selected.has(i));}drawSelectionOutline();
 lastSelection=new Set(selected);q('v2-count').textContent=selected.size?selected.size+(selected.size===1?' hex selected':' hexes selected'):'No land selected';q('v2-clear').disabled=!selected.size;updateAssignmentAction();q('v2-undo').disabled=!history.length;renderCompletion();
}
function queueSelection(){if(!selectionFrame)selectionFrame=requestAnimationFrame(refreshSelection);}
function point(e){const pt=map.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;return pt.matrixTransform(map.getScreenCTM().inverse());}function brushCells(pt){
 const r=(Number(q('v2-brush').value)-1)*W/2,nearest=nearestHex(pt.x,pt.y);
 return cells.filter(c=>c.land&&(c===nearest||(r&&Math.hypot(c.x-pt.x,c.y-pt.y)<r+W*.2)));
}
function paint(e){
 const pt=point(e),last=drag?.last||pt,steps=Math.max(1,Math.ceil(Math.hypot(pt.x-last.x,pt.y-last.y)/4));
 for(let n=0;n<=steps;n++)for(const c of brushCells({x:last.x+(pt.x-last.x)*n/steps,y:last.y+(pt.y-last.y)*n/steps})){
  if(mode==='erase')selected.delete(c.i);else selected.add(c.i);
 }
 if(drag)drag.last={x:pt.x,y:pt.y};queueSelection();
}

function eraseHoveredHex(e){
 const pt=point(e);
 if(!hoverClips.every(path=>cityHitContext.isPointInPath(path,pt.x,pt.y)))return;
 const cell=nearestHex(pt.x,pt.y);
 if(!cell?.land||!selected.has(cell.i))return;
 push();selected.delete(cell.i);queueSelection();save();
 message('Hex erased from the selection. Use Undo to restore it.');
}

function washAt(e){
 if(layer==='none')return null;
 const pt=point(e),ctx=document.createElement('canvas').getContext('2d');
 if(!ctx.isPointInPath(new Path2D(q('v2-playableclip').querySelector('path').getAttribute('d')),pt.x,pt.y)||!ctx.isPointInPath(new Path2D(q('v2-landclip').querySelector('path').getAttribute('d')),pt.x,pt.y))return null;
 for(const w of washData.filter(w=>w.layer===layer).reverse()){const path=new Path2D(w.d);ctx.lineWidth=w.stroke||0;ctx.lineCap='round';ctx.lineJoin='round';if(w.stroke?ctx.isPointInStroke(path,pt.x,pt.y):ctx.isPointInPath(path,pt.x,pt.y))return w.id;}
 return washData.find(w=>w.layer===layer)?.id||null;
}
const touchPoints=new Map();let pinch=null,ignoreTouchUntilUp=false,trackpadGesture=null;
function zoomAt(factor,e){
 if(!Number.isFinite(factor)||factor<=0)return;
 const anchor=point(e),w=Math.max(280,Math.min(750,view.w*factor)),ratio=w/view.w;
 drag=null;
 view={x:Math.max(50,Math.min(800-w,anchor.x-(anchor.x-view.x)*ratio)),y:Math.max(0,Math.min(820-w*(820/750),anchor.y-(anchor.y-view.y)*ratio)),w};
 updateView();
}
map.addEventListener('wheel',e=>{
 if(!e.ctrlKey)return;
 e.preventDefault();if(trackpadGesture)return;
 const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?map.clientHeight:1);
 zoomAt(Math.exp(Math.max(-1,Math.min(1,delta*.01))),e);
},{passive:false});
map.addEventListener('gesturestart',e=>{
 if(touchPoints.size)return;
 e.preventDefault();trackpadGesture={scale:1};drag=null;
},{passive:false});
map.addEventListener('gesturechange',e=>{
 if(!trackpadGesture)return;
 e.preventDefault();if(!Number.isFinite(e.scale)||e.scale<=0)return;
 zoomAt(trackpadGesture.scale/e.scale,e);trackpadGesture.scale=e.scale;
},{passive:false});
map.addEventListener('gestureend',e=>{if(trackpadGesture){e.preventDefault();trackpadGesture=null;}},{passive:false});
function pinchView(start,points){
 const [a,b]=points,mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
 const distance=Math.max(1,Math.hypot(b.x-a.x,b.y-a.y));
 const w=Math.max(280,Math.min(750,start.view.w*start.distance/distance)),ratio=w/start.view.w;
 return {x:Math.max(50,Math.min(800-w,start.anchor.x-(mid.x-start.origin.x)/start.scale.x*ratio)),y:Math.max(0,Math.min(820-w*(820/750),start.anchor.y-(mid.y-start.origin.y)/start.scale.y*ratio)),w};
}
function beginPinch(){
 if(drag?.painting){selected=new Set(drag.selectionBefore);if(history[history.length-1]===drag.undoState)history.pop();render();}
 drag=null;ignoreTouchUntilUp=true;
 const [a,b]=[...touchPoints.values()],matrix=map.getScreenCTM(),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
 const origin={x:matrix.e+matrix.a*view.x,y:matrix.f+matrix.d*view.y};
 pinch={view:{...view},distance:Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),origin,scale:{x:matrix.a,y:matrix.d},anchor:{x:view.x+(mid.x-origin.x)/matrix.a,y:view.y+(mid.y-origin.y)/matrix.d}};
 map.style.cursor='grabbing';
}
function finishTouch(e){
 touchPoints.delete(e.pointerId);
 if(!ignoreTouchUntilUp)return false;
 if(touchPoints.size>=2)beginPinch();else pinch=null;
 if(!touchPoints.size){ignoreTouchUntilUp=false;showMode();save();}
 return true;
}
root.addEventListener('contextmenu',e=>e.preventDefault());
map.onpointerdown=e=>{
 if(e.button===2){
  e.preventDefault();
  if(e.isPrimary&&mode==='paint'&&!spacePan&&!drag)eraseHoveredHex(e);
  return;
 }
 if(e.pointerType==='touch'){
  touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});e.preventDefault();map.setPointerCapture(e.pointerId);
  if(touchPoints.size>=2){beginPinch();return;}
  if(ignoreTouchUntilUp)return;
 }
 const record=e.target.closest?.('[data-evidence-id]');if(!e.isPrimary||![0,1].includes(e.button))return;e.preventDefault();map.setPointerCapture(e.pointerId);
 if(mode==='pan'||spacePan||e.button===1){drag={clientX:e.clientX,clientY:e.clientY,x:view.x,y:view.y,moved:false,temporary:spacePan||e.button===1,evidenceId:washAt(e)||record?.dataset.evidenceId};map.style.cursor='grabbing';}
 else{
  const pt=point(e),pc=new Path2D(q('v2-playableclip').querySelector('path').getAttribute('d')),test=document.createElement('canvas').getContext('2d');
  if(!test.isPointInPath(pc,pt.x,pt.y)||!test.isPointInPath(new Path2D(q('v2-landclip').querySelector('path').getAttribute('d')),pt.x,pt.y)){message('Outside the negotiating area. This territory is protected and cannot be painted.');drag=null;return;}
  const selectionBefore=[...selected];push();drag={painting:true,selectionBefore,undoState:history[history.length-1]};paint(e);
 }
};
map.onpointermove=e=>{
 if(touchPoints.has(e.pointerId))touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(ignoreTouchUntilUp){if(pinch&&touchPoints.size>=2){view=pinchView(pinch,[...touchPoints.values()]);updateView();}return;}
 if(!drag)return;if(drag.painting)paint(e);else{const transform=map.getScreenCTM();view.x=Math.max(50,Math.min(800-view.w,drag.x-(e.clientX-drag.clientX)/transform.a));view.y=Math.max(0,Math.min(820-view.w*(820/750),drag.y-(e.clientY-drag.clientY)/transform.d));drag.moved=Math.abs(e.clientX-drag.clientX)+Math.abs(e.clientY-drag.clientY)>5;updateView();}
};
map.onpointerup=e=>{
 if(finishTouch(e))return;
 if(drag&&!drag.painting&&!drag.moved&&!drag.temporary){const pt=point(e),inside=['v2-playableclip','v2-landclip'].every(id=>cityHitContext.isPointInPath(new Path2D(q(id).querySelector('path').getAttribute('d')),pt.x,pt.y));inspectTile(inside?nearestHex(pt.x,pt.y):null);if(inside&&drag.evidenceId)showEvidence(drag.evidenceId);}
 drag=null;showMode();save();
};
map.onpointercancel=e=>{if(finishTouch(e))return;drag=null;showMode();save();};
q('v2-cancel-overlay').onclick=()=>{layer='none';render();save();};root.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>{layer=b.dataset.layer;if(layer!=='none')setMode('pan');render();save();});q('v2-undo').onclick=()=>{const s=history.pop();if(s){selected=new Set(s.selected);territories=s.territories;active=s.active;layer=s.layer||'none';syncNames();fillTerritoryForm(s.draft);render();save();message('Previous map restored.');}};q('v2-reset').onclick=()=>{push();peopleSeed=createPeopleSeed();selected.clear();territories=[];active=null;inspectedTerritory=null;layer='none';drag=null;view={x:50,y:0,w:750};updateView();setMode('pan');q('v2-polity').value='Syria';q('v2-status').value='Independent state';q('v2-sect').value='Sunni';q('v2-relationship').value='None';q('v2-power').value='Britain';render();save();message('Map reset. All territories and selections cleared. Use Undo to restore them.');};q('v2-clear').onclick=startNewTerritory;
function assignSelection(){
 relationships();if(!selected.size)return;
 const candidate=prepareAssignment();if(candidate.error){message(candidate.error);if(candidate.field)q(candidate.field).focus();return;}
 candidate.territories.find(t=>t.id===candidate.id).color=selectionColor();
 push();territories=candidate.territories;selected.clear();active=null;render();save();message(candidate.name+' assigned. Click its dossier entry to extend, trim or reassign it.');return true;
}
function prepareAssignment(){
 const name=selectedPolityName();
 if(!name||!presetNames.has(polityNameKey(name))&&!territories.some(t=>t.id===active&&t.name===name))return {error:'Choose an available territory name, or edit an existing territory to extend it.',field:'v2-polity'};
 if(!selected.size)return {error:'Your current territory has no selected land. Restore its selection or clear it before continuing.',field:'v2-clear'};
 const status=q('v2-status').value,power=q('v2-power-field').hidden?'':q('v2-power').value,relationship=status==='Autonomous territory'?'Treaty association':q('v2-relationship-field').hidden?'None':q('v2-relationship').value;
 if(!q('v2-power-field').hidden&&!allowedPowers(status).includes(power))return {error:'Choose an eligible external power or treaty partner.',field:'v2-power'};
 if(territories.some(t=>t.id!==active&&polityNameKey(t.name)===polityNameKey(name)))return {error:'That polity already exists. Select it in the dossier to extend it, or choose a different name.',field:'v2-polity'};
 if(active===null&&territories.length>=255)return {error:'The map already has 255 territories. Edit an existing assignment to continue.',field:'v2-polity'};
 const id=active??Math.max(Date.now(),...territories.map(t=>(Number(t.id)||0)+1)),old=territories.find(t=>t.id===id);
 const next=territories.filter(t=>t.id!==id).map(t=>({...t,cells:t.cells.filter(i=>!selected.has(i))})).filter(t=>t.cells.length);
 next.push({id,name,status,sect:status==='Imamate'?q('v2-sect').value:null,power,relationship,cells:[...selected],color:old?.color});
 const issue=territoryIdentityIssue(next,true);if(issue)return {error:issue,field:status==='Imamate'&&!['Sunni','Shia','Ibadi'].includes(q('v2-sect').value)?'v2-sect':'v2-polity'};
 if(old&&old.name!==name)next.forEach(t=>{if(t.id!==id&&t.power===old.name&&!externalPowers.includes(old.name))t.power=name;});
 const orphan=next.find(t=>t.status==='Autonomous territory'&&t.power&&!externalPowers.includes(t.power)&&!next.some(parent=>parent.id!==t.id&&parent.name===t.power&&['Independent state','Imamate','Protectorate'].includes(parent.status)));
 if(orphan)return {error:'The treaty partner of '+orphan.name+' must remain an assigned independent state, imamate or protectorate. Change its treaty partner before removing or changing '+orphan.power+'.',field:'v2-power'};
 return {territories:next,name,id};
}
function mobileWorkspace(){return window.matchMedia('(max-width:900px),(max-height:599px)').matches;}
function syncWorkspace(){root.dataset.workspace=window.location.hash==='#v2-territory-workspace'?'territory':'map';}
function showWorkspace(target){
 const territory=target==='v2-territory-workspace';root.dataset.workspace=territory?'territory':'map';
 if(mobileWorkspace())window.location.hash=target;
 requestAnimationFrame(()=>{q(target).scrollIntoView({block:'start'});q(territory?target:'v2-paint').focus({preventScroll:true});});
}
function openTerritoryWorkspace(){
 setMode('paint');
 showWorkspace('v2-territory-workspace');
}
function returnToMapWorkspace(){
 if(!mobileWorkspace())return;
 showWorkspace('v2-map-workspace');
}
syncWorkspace();window.addEventListener('hashchange',syncWorkspace);
root.querySelectorAll('.v2-workspace-nav a').forEach(a=>a.onclick=e=>{if(mobileWorkspace()){e.preventDefault();showWorkspace(a.hash.slice(1));}});
q('v2-mobile-review').onclick=openTerritoryWorkspace;
q('v2-mobile-back').onclick=returnToMapWorkspace;
q('v2-assign').onclick=()=>{if(assignSelection())returnToMapWorkspace();};
['v2-polity','v2-status','v2-sect','v2-relationship','v2-power'].forEach(id=>q(id).onchange=()=>{relationships();save();});


function createPeopleSeed(){
 if(window.crypto?.getRandomValues){const words=new Uint32Array(4);window.crypto.getRandomValues(words);return Array.from(words,n=>n.toString(36)).join('-');}
 return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
}
let peopleSeed=createPeopleSeed();
function validateAutocompleteProposal(proposal,baseTerritories=territories,edges=canonicalCellGraph().edges){
 if(!proposal||!Array.isArray(proposal.territories)||proposal.extensions!==undefined&&!Array.isArray(proposal.extensions))throw new Error('The automatic settlement could not be prepared. Your map is unchanged.');
 if(baseTerritories.length+proposal.territories.length>255)throw new Error('The map has too many territories to add this settlement. Combine some territories first.');
 const assigned=new Set(baseTerritories.flatMap(t=>t.cells)),remaining=cells.filter(c=>c.land&&!assigned.has(c.i)),added=new Set(),ids=new Set(baseTerritories.map(t=>t.id)),extensions=new Map();
 const addCells=extra=>{for(const i of extra){if(!byId.get(i)?.land||assigned.has(i)||added.has(i))throw new Error('The automatic settlement overlaps assigned or protected land. Your map is unchanged.');added.add(i);}};
 for(const extension of proposal.extensions||[]){
  const target=baseTerritories.find(t=>t.id===extension.id);
  if(!target||!['Syria','Transjordan'].includes(normalizePolityName(target.name))||extensions.has(extension.id)||!Array.isArray(extension.cells)||!extension.cells.length)throw new Error('The automatic extension has no eligible existing territory. Your map is unchanged.');
  addCells(extension.cells);
  const pending=new Set(extension.cells),queue=[...target.cells];for(let j=0;j<queue.length;j++)for(const i of edges.get(queue[j])||[])if(pending.has(i)){pending.delete(i);queue.push(i);}
  if(pending.size)throw new Error('An automatic extension is not connected to its existing territory. Your map is unchanged.');
  extensions.set(extension.id,extension.cells);
 }
 for(const t of proposal.territories){
  if(ids.has(t.id)||!Array.isArray(t.cells)||!t.cells.length)throw new Error('The automatic territories need to be checked. Your map is unchanged.');ids.add(t.id);addCells(t.cells);
 }
 if(added.size!==remaining.length||remaining.some(c=>!added.has(c.i)))throw new Error('The settlement did not cover every unassigned hex. Your map is unchanged.');
 const completed=baseTerritories.map(t=>extensions.has(t.id)?{...t,cells:[...t.cells,...extensions.get(t.id)]}:t);
 const issue=territoryIdentityIssue([...completed,...proposal.territories],true);if(issue)throw new Error(issue);
 return {count:added.size,territoryCount:proposal.territories.length,territories:completed};
}
function applyAutocomplete(){
 const hasDraft=selected.size>0||active!==null,candidate=hasDraft?prepareAssignment():{territories};
 if(candidate.error){openTerritoryWorkspace();message(candidate.error);q('v2-assignment-note').hidden=false;q('v2-assignment-note').textContent=candidate.error;q(candidate.field||'v2-polity').focus();return;}
 let proposal,counts;
 try{const {land,edges}=canonicalCellGraph();proposal=window.FrontiersAutocomplete.propose(land.map(c=>({...c,neighbours:[...edges.get(c.i)]})),candidate.territories);counts=validateAutocompleteProposal(proposal,candidate.territories,edges);}
 catch(error){message(error.message||'The automatic settlement could not be prepared. Your map is unchanged.');return;}
 if(!counts.count&&!hasDraft){message('Every hex is already assigned.');return;}
 if(hasDraft)counts.territories.find(t=>t.id===candidate.id).color=selectionColor();
 const usedColors=new Set(counts.territories.map(t=>t.color));let colorIndex=0;
 const additions=proposal.territories.map(t=>{let color;for(let attempt=0;attempt<256;attempt++){color=countryColor(colorIndex++);if(!usedColors.has(color))break;}if(usedColors.has(color))color=`hsl(${(colorIndex*137.508)%360} 52% 54%)`;usedColors.add(color);return {...t,cells:[...t.cells],color};});
 push();territories=[...counts.territories,...additions];selected.clear();active=null;inspectedTerritory=null;layer='none';completionShown=true;render();save();
 message((hasDraft?'Your current territory was saved. ':'')+'Sykes and Picot assigned '+counts.count+' remaining hexes. Edit any territory, choose Results, or use Undo to reverse this step.');q('v2-results').focus({preventScroll:true});
}
q('v2-autocomplete').onclick=applyAutocomplete;
let gapIndex=0,completionShown=false,returnScroll=0;
const resultsPanel=q('v2-results-panel'),completionDialog=q('v2-complete-dialog');
function hostScreen(screen){document.documentElement.dataset.frontiersScreen=screen;}
completionDialog.addEventListener('close',()=>hostScreen(root.dataset.screen==='results'?'results':'editor'));
function missingCells(){const owners=new Set(territories.filter(t=>t.id!==active).flatMap(t=>t.cells));for(const i of selected)owners.add(i);return cells.filter(c=>c.land&&!owners.has(c.i));}
function renderCompletion(){
 const missing=missingCells(),missingIds=new Set(missing.map(c=>c.i)),pending=selected.size>0;
 q('v2-mobile-action').hidden=!pending;q('v2-mobile-review').textContent=active===null?'Assign '+selected.size+(selected.size===1?' hex':' hexes')+' →':'Review changes →';
 cells.filter(c=>c.node).forEach(c=>c.node.classList.toggle('v2-unassigned',missingIds.has(c.i)&&!selected.has(c.i)));
 root.dataset.fewGaps=String(missing.length<60);q('v2-remaining').textContent=missing.length?missing.length+(missing.length===1?' hex':' hexes')+' still unpainted · glowing outlines mark remaining land':pending?'Every hex is covered. Save your current territory and see the results.':'Every hex assigned · your alternate history is ready';
 const ready=!missing.length&&(pending||territories.length>0);
 q('v2-results').textContent=pending?'Save & see results':'Results';q('v2-complete-see').textContent=pending?'SAVE & SEE RESULTS':'SEE RESULTS';
 q('v2-results').disabled=!ready;q('v2-find-gap').disabled=!missing.length;q('v2-autocomplete').disabled=!missing.length&&!pending&&active===null;
 if(!ready||pending){if(missing.length||pending)completionShown=false;if(completionDialog.open)completionDialog.close();if(root.dataset.screen==='results')closeResults();}
 else if(!completionShown&&!['results','intro'].includes(root.dataset.screen)){requestAnimationFrame(()=>{if(!completionShown&&!root.dataset.screen&&!completionDialog.open&&!selected.size&&territories.length&&!missingCells().length){completionShown=true;hostScreen('prompt');completionDialog.showModal();q('v2-complete-see').focus();}});}
}
function focusCell(c){view.w=280;view.x=Math.max(50,Math.min(520,c.pickX-view.w/2));view.y=Math.max(0,Math.min(820-view.w*(820/750),c.pickY-view.w*(820/750)/2));updateView();}
q('v2-find-gap').onclick=()=>{const missing=missingCells();if(!missing.length)return;const c=missing[gapIndex++%missing.length];focusCell(c);setMode('paint');message('Unpainted hex centred. Paint it to include it in your current territory.');};
q('v2-complete-edit').onclick=()=>{completionDialog.close();q('v2-results').focus();};
function openResults(){if(missingCells().length)return;completionDialog.close();if(selected.size&&!assignSelection()){openTerritoryWorkspace();return;}showResults();}
q('v2-complete-see').onclick=openResults;q('v2-results').onclick=openResults;
completionDialog.addEventListener('cancel',()=>{completionShown=true;});
function closeResults(){resultsPanel.hidden=true;delete root.dataset.screen;hostScreen('editor');q('v2-results').focus({preventScroll:true});requestAnimationFrame(()=>{window.scrollTo(0,returnScroll);layoutMapLabels();});}
q('v2-close-results').onclick=closeResults;
const leagueDialog=q('v2-league-dialog');
function openLeague(){const board=q('v2-public-league');board.replaceChildren();delete board.dataset.loaded;window.FrontiersLeague.mount(board);hostScreen('prompt');leagueDialog.showModal();leagueDialog.scrollTop=0;q('v2-close-league').focus();}
q('v2-intro-league').onclick=q('v2-map-league').onclick=openLeague;
q('v2-close-league').onclick=()=>leagueDialog.close();
leagueDialog.addEventListener('close',()=>hostScreen(root.dataset.screen==='intro'?'intro':'editor'));
q('v2-begin').onclick=()=>{q('v2-intro').hidden=true;delete root.dataset.screen;hostScreen('editor');window.scrollTo(0,0);setMode('paint');renderCompletion();q('v2-paint').focus({preventScroll:true});};
function canonicalCellGraph(){
 const land=cells.filter(c=>c.land),edges=new Map(land.map(c=>[c.i,new Set()]));
 const idFor=i=>{const c=byId.get(i);return c?.mergeTarget??c?.i;};
 for(const c of land){for(const source of [c,...(c.absorbed||[]).map(i=>byId.get(i))]){
  const parity=source.row&1;
  const nearby=source.neighbours||[[source.row,source.col-1],[source.row,source.col+1],[source.row-1,source.col+parity-1],[source.row-1,source.col+parity],[source.row+1,source.col+parity-1],[source.row+1,source.col+parity]].map(([r,k])=>grid.get(r+','+k)?.i).filter(i=>i!==undefined);
  for(const original of nearby){const id=idFor(original);if(id!==c.i&&edges.has(id)){edges.get(c.i).add(id);edges.get(id).add(c.i);}}
 }}
 return {land,edges};
}
function chronicleInput(){
 const {land,edges}=canonicalCellGraph();
 const cachedShia=new Map(window.FrontiersMapData.shiaMetrics.map(([id,area,absorbed])=>[id,{area,absorbed}]));
 for(const c of land){const cached=cachedShia.get(c.i);if(cached&&JSON.stringify(c.absorbed||[])===JSON.stringify(cached.absorbed))c.shiaArea=cached.area;}
 const shiaWash=washData.find(w=>w.id==='wash-shia'),shiaPath=new Path2D(shiaWash.d),shiaCtx=document.createElement('canvas').getContext('2d');shiaCtx.lineWidth=shiaWash.stroke;shiaCtx.lineCap='round';
 for(const c of land)if(c.shiaArea===undefined){c.shiaArea=0;if(c.lat>28&&c.lat<34.5&&c.lon>42&&c.lon<49){const path=new Path2D(c.d),box=c.node.getBBox();for(let y=box.y;y<box.y+box.height;y+=1)for(let x=box.x;x<box.x+box.width;x+=1){const pi=(Math.floor(y*2)*1600+Math.floor(x*2))*4+3;if(landPixels()[pi]&&shiaCtx.isPointInPath(path,x,y)&&shiaCtx.isPointInStroke(shiaPath,x,y))c.shiaArea++;}}}
 return territories.map(t=>{const remaining=new Set(t.cells);let components=0;while(remaining.size){components++;const queue=[remaining.values().next().value];remaining.delete(queue[0]);for(let j=0;j<queue.length;j++)for(const n of edges.get(queue[j])||[])if(remaining.has(n)){remaining.delete(n);queue.push(n);}}
 return {...t,components,cells:t.cells.map(i=>{const c=byId.get(i);return {i,area:c.areaPixels/4,shiaArea:c.shiaArea,absorbed:c.absorbed||[],city:c.city||null,port:markedPorts.has(c.city),nearOman:window.FrontiersMapData.omanBorderCells.includes(i),nearPersia:window.FrontiersMapData.persiaBorderCells.includes(i),anatolia:window.FrontiersMapData.anatoliaCells.includes(i),ethnicity:window.FrontiersMapData.ethnicity[i]||[],environment:window.FrontiersMapData.environment[i],railways:window.FrontiersMapData.railwayCells[i]?.railways||[],railJunctions:window.FrontiersMapData.railwayCells[i]?.railJunctions||[],lon:c.lon,lat:c.lat,neighbours:[...edges.get(i)]};})};});
}
const reading=[
 ['Britain and the 1931 sterling crisis · Bank of England','https://www.bankofengland.co.uk/about/history'],
 ['French banking contraction, 1930–31 · Banque de France','https://www.banque-france.fr/en/publications-and-statistics/publications/flight-safety-and-credit-crunch-new-history-banking-crisis-france-during-great-depression'],
 ['Ottoman railway map, 1916: operating and projected lines','https://www.loc.gov/item/2013593013/'],
 ['Contemporary account of the Taurus and Amanus railway gaps','https://www.gutenberg.org/files/66221/66221-h/66221-h.htm'],
 ['Palestine railways: archival research on wartime construction and dismantling','https://publications.dainst.org/journals/aa/article/view/4366/8635'],
 ['Sykes–Picot, 1916: international administration, ports, railways and river rights','https://avalon.law.yale.edu/20th_century/sykes.asp'],
 ['Iraq and the revolt against British rule','https://www.nam.ac.uk/explore/mesopotamia-campaign'],
 ['Turkish resistance and the Lausanne settlement: contemporary diplomatic account','https://history.state.gov/historicaldocuments/frus1924v02/d624'],
 ['Damascus, 1925: contemporary diplomatic reporting','https://history.state.gov/historicaldocuments/frus1925v02/d77'],
 ['Iraq’s oil industry and Mediterranean pipelines · Library of Congress','https://tile.loc.gov/storage-services/master/frd/frdcstdy/ir/iraqcountrystudy00metz_0/iraqcountrystudy00metz_0.pdf'],
 ['Dammam’s commercial oil discovery, 1938 · Aramco','https://www.aramco.com/en/about-us/our-history'],
 ['Kuwait’s oil discovery and later exports · Kuwait Oil Company','https://www.kockw.com/sites/AR/Pages/Profile/whoAreWe/KOC-History.aspx'],
 ['The Armenian genocide, 1915–16 · United States Holocaust Memorial Museum','https://www.ushmm.org/genocide/armenia'],
 ['Omani trade during the Depression · British administration report','https://www.qdl.qa/en/archive/81055/vdc_100107848351.0x00004c'],
 ['Persia and Iraq: frontier disputes, shrine cities and the 1937 settlement · Encyclopaedia Iranica','https://www.iranicaonline.org/articles/iraq-vi-pahlavi-period-1921-79/'],
 ['Britain and Persia under Reza Shah, 1921–41 · Encyclopaedia Iranica','https://www.iranicaonline.org/articles/great-britain/great-britain-iv/'],
 ['Armenian frontiers, sea access and railway routes: Wilson’s 1920 decision','https://history.state.gov/historicaldocuments/frus1920v03/d949'],
 ['Ottoman parliamentary constitution, 1909','https://history.state.gov/historicaldocuments/frus1909/d565'],
 ['Constantinople and the Straits: Allied reply of April 1920','https://history.state.gov/historicaldocuments/frus1920v03/d916'],
 ['Russian refugee evacuation, 1920: contemporary diplomatic reports','https://history.state.gov/historicaldocuments/frus1920v03/d725'],
 ['Seeb agreement, 1920: British archival copy','https://qdl.qa/en/archive/81055/vdc_100070535087.0x00007f'],
 ['Sulayman al-Baruni: British Library research and archives','https://qdl.qa/sulayman-al-baruni-life-ibadhi-scholar-and-statesman-north-africa-and-oman-1872-1940'],
 ['Italy’s September 1938 school decree: original text','https://www.normattiva.it/atto/caricaDettaglioAtto?atto.codiceRedazionale=038U1390&atto.dataPubblicazioneGazzetta=1938-09-13&tipoDettaglio=originario'],
 ['Jerusalem relief work, 1918–1922: Library of Congress archives','https://www.loc.gov/exhibits/americancolony/amcolony-relief.html'],
 ['Pilgrim shipping: International Sanitary Convention, 1926','https://history.state.gov/historicaldocuments/frus1926v01/d116'],
 ['King–Crane Commission, 1919: government, partition and access to the sea','https://history.state.gov/historicaldocuments/frus1919Parisv12/d381']
];
function territoryIdentityIssue(items,allowUnchangedLegacy=false){
 const seen=new Set();for(const t of items){
  const name=normalizePolityName(t.name),key=polityNameKey(name);
  if(!name||name.length>70)return 'Give every territory a name of up to 70 characters.';
  if(seen.has(key))return name+' is assigned twice. Edit one of these territories to give it a distinct name.';seen.add(key);
  if(Object.hasOwn(statusRules,name)&&!statusRules[name].includes(t.status))return name+' cannot have '+t.status.toLowerCase()+' status. Edit that territory before seeing Results.';
  if(name==='Free Port'&&!hasMarkedPort(t.cells))return 'Free Port must include a marked port. Add a port to its territory or choose another name before continuing.';
  // Let old invalid territories be repaired one at a time without accepting a new invalid assignment.
  const unchangedLegacy=allowUnchangedLegacy&&t.id!==active&&territories.some(old=>old.id===t.id&&old.name===t.name&&old.status===t.status&&old.sect===t.sect&&old.cells.length===t.cells.length&&old.cells.every(i=>t.cells.includes(i)));
  if(!unchangedLegacy){
   if(t.status==='Imamate'&&!['Sunni','Shia','Ibadi'].includes(t.sect))return name+' needs a Sunni, Shia or Ibadi sect. Edit that territory and choose one before continuing.';
   const holyIssue=holyCityIssue(name,t.cells);if(holyIssue)return holyIssue;
  }
 }
 return '';
}
function showResults(){
 if(missingCells().length||selected.size)return;
 const issue=territoryIdentityIssue(territories);if(issue){message(issue);q('v2-proposal-dossier').scrollIntoView({block:'start'});return;}
 returnScroll=window.scrollY;const input=chronicleInput(),history=window.FrontiersChronicle.build(input,{peopleSeed}),score=window.FrontiersChronicle.score(history,input),box=q('v2-results-content');box.replaceChildren();
 q('v2-share-results').onclick=()=>window.FrontiersShare.open({map,territories,history,score,theme,label:territoryLabel});
 const node=(tag,cls,text,parent)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;parent?.append(n);return n;};
 const dateline=node('div','chronicle-dateline',undefined,box);node('span','', 'Your alternate history · 1918—1939',dateline);node('span','', 'Edition '+history.signature,dateline);
 const heading=node('div','chronicle-heading',undefined,box),title=node('h1','chronicle-title',history.title,heading);title.id='v2-chronicle-title';title.tabIndex=-1;
 const topLeague=node('button','v2-primary chronicle-league-link','League table →',heading);topLeague.setAttribute('aria-controls','chronicle-league');
 node('p','chronicle-deck',history.deck,box);
 const resultScore=node('div','chronicle-result-score',undefined,box);node('strong','',score.total+' / 100',resultScore);node('span','','Settlement score',resultScore);
 const stats=node('div','chronicle-stats',undefined,box);for(const [value,label]of[[history.stats.wars,'regional wars'],[history.stats.revolutions,'revolutions & risings'],[history.stats.created?history.stats.surviving+' of '+history.stats.created:'None','states survive · 1939'],[history.stats.gains,'lasting gains']]){const card=node('div','chronicle-stat',undefined,stats);node('strong','',String(value),card);node('span','',label,card);}
 const highlights=node('section','chronicle-highlights',undefined,box);highlights.setAttribute('aria-label','Leading reports');
 history.highlights.forEach((e,i)=>{
  const card=node('article','chronicle-highlight'+(i===0?' chronicle-highlight-lead':''),undefined,highlights);
  const dateline=node('div','chronicle-highlight-dateline',undefined,card);node('span','chronicle-highlight-year',String(e.year),dateline);node('span','',e.affected.length?e.affected.join(' · '):'Near East',dateline);
  const link=node('a','chronicle-highlight-link',undefined,card);link.href='#chronicle-event-'+history.events.indexOf(e);link.setAttribute('aria-label','Read report: '+e.title);node('h3','',e.title,link);
  const sentences=e.text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)||[e.text];node('p','chronicle-highlight-excerpt',sentences.slice(0,i===0?2:1).join('').trim(),link);node('span','chronicle-read-report','Read report →',link);
 });
 const jumps=node('nav','chronicle-jumps',undefined,box);jumps.setAttribute('aria-label','Chronicle sections');for(const [id,text]of[['chronicle-timeline','Read the years'],['chronicle-world','Who survives in 1939'],...(history.people.length?[['chronicle-people','Lives changed']]:[])]){const a=node('a','',text,jumps);a.href='#'+id;}
 const timeline=node('section','',undefined,box);timeline.id='chronicle-timeline';node('h2','chronicle-section-title','The years your map set in motion',timeline);
 history.events.forEach((e,i)=>{const article=node('article','chronicle-event',undefined,timeline);article.id='chronicle-event-'+i;article.dataset.kind=e.kind;const year=node('div','chronicle-year',String(e.year),article);node('small','',e.kind,year);const content=node('div','',undefined,article);node('h3','',e.title,content);node('p','',e.text,content);const cause=node('div','chronicle-cause',undefined,content);node('strong','','From your map',cause);cause.append(document.createTextNode(e.cause));});
 const world=node('section','',undefined,box);world.id='chronicle-world';node('h2','chronicle-section-title','The world in 1939',world);const roll=node('div','chronicle-rollcall',undefined,world);
 history.outcomes.forEach(t=>{
  const card=node('article','chronicle-country',undefined,roll);card.style.setProperty('--country-color',t.color||'#739da8');card.dataset.intact=String(t.intact);node('div','chronicle-kicker',t.fate,card);
  const name=node('h3','',t.intact?t.name:undefined,card);if(!t.intact)node('del','',t.name,name);
  if(t.originalArrangement&&t.finalArrangement){
   const arrangement=node('p','chronicle-arrangement',undefined,card);
   if(t.originalArrangement===t.finalArrangement)arrangement.textContent=t.finalArrangement;
   else{node('span','chronicle-arrangement-before',t.originalArrangement,arrangement);const arrow=node('span','chronicle-arrangement-arrow',' → ',arrangement);arrow.setAttribute('aria-hidden','true');node('span','chronicle-sr-only',' became ',arrangement);node('strong','',t.finalArrangement,arrangement);}
  }
  if(!t.intact)node('p','chronicle-country-ended','Dissolved by 1939',card);
  node('p','',t.detail,card);
 });
 if(history.people.length){
  const people=node('section','',undefined,box);people.id='chronicle-people';node('h2','chronicle-section-title','Lives changed',people);const cards=node('div','chronicle-people',undefined,people);
  history.people.forEach(p=>{const card=node('article','chronicle-person',undefined,cards);node('div','chronicle-kicker',p.year+' · '+p.territory,card);node('h3','',p.name,card);if(p.role)node('p','chronicle-person-role',p.role,card);const story=Array.isArray(p.story)?p.story.filter(Boolean):p.story?[p.story]:[];for(const paragraph of story.length?story:[p.end])if(paragraph)node('p','chronicle-person-story',paragraph,card);});
 }
 const sources=node('details','chronicle-sources',undefined,box);node('summary','','Historical reading',sources);const list=node('ul','',undefined,sources);reading.forEach(([title,url])=>{const li=node('li','',undefined,list),a=node('a','',title,li);a.href=url;a.target='_blank';a.rel='noopener noreferrer';});
 const bottom=node('div','chronicle-bottom',undefined,box);node('p','','A different line. A different century.',bottom);const enter=node('button','v2-primary','Enter the league table →',bottom);const back=node('button','','Return to the drawing table',bottom);back.onclick=closeResults;const league=document.createElement('section');league.id='chronicle-league';league.hidden=true;box.append(league);topLeague.onclick=enter.onclick=()=>{league.hidden=false;window.FrontiersLeague.mount(league,{history,proposal:window.FrontiersStore.state?.modelContent});const heading=league.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});league.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});};
 root.dataset.screen='results';hostScreen('results');resultsPanel.hidden=false;title.focus({preventScroll:true});resultsPanel.scrollIntoView({block:'start'});window.scrollTo(0,0);
 box.querySelectorAll('a[href^="#"]').forEach(a=>a.onclick=e=>{e.preventDefault();q(a.getAttribute('href').slice(1))?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});
}
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.dataset.screen==='results'&&!root.querySelector('dialog[open]')){e.preventDefault();closeResults();}});


let labelFrame=0;function scheduleMapLabels(){if(!labelFrame)labelFrame=requestAnimationFrame(()=>{labelFrame=0;layoutMapLabels();});}
function layoutMapLabels(){
 drawEvidenceMarkers();
 const rect=map.getBoundingClientRect(),matrix=map.getScreenCTM();if(!matrix||!rect.width)return;
 const u=1/Math.hypot(matrix.a,matrix.b),pad=5;
 const occupied=[...root.querySelectorAll('.v2-inset,.v2-zoom')].map(n=>n.getBoundingClientRect());
 const overlaps=(a,b)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
 const normalName=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^\p{L}\p{N}]+/gu,' ').trim(),visibleCountryNames=new Set();
 const countryGroupStyle=getComputedStyle(q('v2-territory-labels')),countryNamesShown=countryGroupStyle.display!=='none'&&countryGroupStyle.visibility!=='hidden'&&Number(countryGroupStyle.opacity)>0;
 let leaders=q('v2-label-leaders');if(!leaders){leaders=el('g',{id:'v2-label-leaders','pointer-events':'none'});q('v2-territory-labels').before(leaders);}leaders.replaceChildren();
 const labels=[...map.querySelectorAll('text')];
 const rank=t=>t.dataset.priority==='true'?-1:t.classList.contains('v2-assigned-name')?0:t.closest('.v2-city')?1:t.closest('.v2-gulf-label')?2:t.classList.contains('v2-fixed-name')?3:4;
 labels.sort((a,b)=>rank(a)-rank(b)||(a.dataset.active==='true'?-1:b.dataset.active==='true'?1:0)||Number(a.dataset.size||0)-Number(b.dataset.size||0));
 for(const t of labels){
  const parent=t.closest('.v2-gulf-label');if(parent)parent.style.visibility='';
  t.style.visibility='';t.removeAttribute('transform');
  const assigned=t.classList.contains('v2-assigned-name'),city=t.closest('.v2-city'),gulf=!!parent;
  if(assigned&&!countryNamesShown)continue;
  if(!assigned&&!city&&visibleCountryNames.has(normalName(t.textContent))){t.style.visibility='hidden';if(parent)parent.style.visibility='hidden';continue;}
  const size=assigned?(Number(t.dataset.size)<8?11.5:13):city?12.5:t.classList.contains('v2-fixed-name')?12:gulf?10.5:11;
  t.style.fontSize=(size*u)+'px';t.style.letterSpacing=((city?0:assigned?.55:.6)*u)+'px';t.style.strokeWidth=((assigned?1.5:1.8)*u)+'px';
  t.querySelectorAll('tspan').forEach(n=>{if(n.hasAttribute('dy'))n.setAttribute('dy',(n.dataset.labelLine==='patron'?12:13)*u);if(n.dataset.labelLine==='patron'){n.style.fontSize=(10*u)+'px';n.style.letterSpacing='0';}});
  if(!t.getClientRects().length||getComputedStyle(t).display==='none')continue;
  const original=t.getBoundingClientRect();if(!original.width||!original.height)continue;
  const bx=Number(t.getAttribute('x')),by=Number(t.getAttribute('y'));
  const anchors=assigned?(t._anchors||[[bx,by]]).filter(([x,y])=>{const sx=matrix.a*x+matrix.c*y+matrix.e,sy=matrix.b*x+matrix.d*y+matrix.f;return sx>=rect.left&&sx<=rect.right&&sy>=rect.top&&sy<=rect.bottom;}):[[bx,by]];
  const offsets=assigned?[[0,0],[0,-18],[0,18],[-28,0],[28,0],[0,-36],[0,36],[-42,-20],[42,20],[-42,20],[42,-20]]:city?[[0,0],[0,-10],[0,10],[0,-20],[0,20]]:[[0,0]];
  const trials=anchors.slice(0,7).flatMap(([x,y])=>offsets.map(([dx,dy])=>({x,y,dx:dx+(x-bx)/u,dy:dy+(y-by)/u})));
  let placed=false;
  for(const scale of assigned?[1,.86]:[1]){
   t.style.fontSize=(size*scale*u)+'px';
   for(const {x,y,dx,dy}of trials){
    t.setAttribute('transform',`translate(${dx*u},${dy*u})`);
    const b=t.getBoundingClientRect();
    if(b.left<rect.left+5||b.right>rect.right-5||b.top<rect.top+5||b.bottom>rect.bottom-5||occupied.some(a=>overlaps(a,b)))continue;
    occupied.push(b);placed=true;
    if(assigned&&Math.hypot(bx+dx*u-x,by+dy*u-y)>12*u)leaders.append(el('line',{x1:x,y1:y,x2:bx+dx*u,y2:by+dy*u,'stroke-width':.65*u}));
    break;
   }
   if(placed)break;
  }
  if(!placed){t.style.visibility='hidden';if(parent)parent.style.visibility='hidden';}
  else if(assigned&&countryNamesShown){const name=territories.find(p=>territoryLabel(p)===t.getAttribute('aria-label'))?.name||t.getAttribute('aria-label');visibleCountryNames.add(normalName(name));}
 }
}
new ResizeObserver(()=>scheduleMapLabels()).observe(map);
const mapLegend=root.querySelector('.v2-inset');
mapLegend.open=!mobileWorkspace();
mapLegend.addEventListener('toggle',()=>scheduleMapLabels());
document.fonts?.ready.then(()=>scheduleMapLabels());

function updateView(){const clip=q('v2-viewrect');clip.setAttribute('x',view.x);clip.setAttribute('y',view.y);clip.setAttribute('width',view.w);clip.setAttribute('height',view.w*(820/750));map.classList.toggle('v2-gulf-focus',view.w<420&&view.x>400);map.setAttribute('viewBox',[view.x,view.y,view.w,view.w*(820/750)].join(' '));map.classList.toggle('v2-zoomed',view.w<600);scheduleMapLabels();}function zoom(f){drag=null;spacePan=false;setMode('pan');const old=view.w;view.w=Math.max(280,Math.min(750,old*f));view.x=Math.max(50,Math.min(800-view.w,view.x+(old-view.w)/2));view.y=Math.max(0,Math.min(820-view.w*(820/750),view.y+(old-view.w)*(820/750)/2));updateView();}q('v2-zoom-in').onclick=()=>zoom(.7);q('v2-zoom-out').onclick=()=>zoom(1/.7);q('v2-fit').onclick=()=>{view={x:50,y:0,w:750};updateView();};restore(window.FrontiersStore.state);render();q('v2-begin').disabled=false;q('v2-begin').textContent='BEGIN';performance.mark('frontiers-ready');
})().catch(error=>{console.error(error);const b=document.getElementById('v2-begin');b.disabled=false;b.textContent='RETRY LOADING';b.onclick=()=>location.reload();});
