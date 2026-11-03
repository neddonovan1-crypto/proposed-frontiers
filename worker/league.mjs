const statuses=new Set(['Independent state','Imamate','Autonomous territory','Protectorate','Direct colonial administration','International administration','Unsettled frontier / shared rights']);
const powers=new Set(['Britain','France','Russia','Italy','Persia']);
const colonialPowers=new Set([...powers,'Greece']);
const rules={'Jewish National Home':['Independent state','Autonomous territory','Direct colonial administration','Protectorate','International administration'],'International City':['International administration'],'Free Port':['International administration'],'Shared Grazing Territory':['Unsettled frontier / shared rights','Direct colonial administration'],'Arab Federation':['Independent state','Autonomous territory','Imamate','Protectorate'],'Zaydistan':['Imamate'],'Hellenic Anatolia':['Independent state','Autonomous territory','Protectorate','Direct colonial administration','International administration','Unsettled frontier / shared rights']};
const presetNames=['Turkey','Ottoman Sultanate','Izmir','Hellenic Anatolia','Jewish National Home','Syria','Mesopotamia','Iranshahr','Palestine','Transjordan','Mount Lebanon','Armenia','Kurdistan','Hejaz','Nejd','Jebel Shammar','Asir','Hadhramaut','Oman','Arab Federation','International City','Free Port','Shared Grazing Territory','Zaydistan'];
const presetLookup=new Map(presetNames.map(name=>[polityNameKey(name),name]));
presetLookup.set('imamate of iraq','Zaydistan');presetLookup.set('jerusalem international city','International City');
const nameLookalikes={'а':'a','α':'a','с':'c','ϲ':'c','е':'e','ε':'e','і':'i','ι':'i','ј':'j','κ':'k','о':'o','ο':'o','р':'p','ρ':'p','ѕ':'s','τ':'t','υ':'u','х':'x','χ':'x','у':'y','ν':'v'};
export function leagueName(value){
 const name=typeof value==='string'?value.normalize('NFKC').trim():'';
 if(!name||name.length>10||!/^\p{L}[\p{L}\p{M}]*(?:[ '\u2019-]\p{L}[\p{L}\p{M}]*)*$/u.test(name))return {error:'Enter a first name of up to 10 characters.'};
 const key=name.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[аαсϲеεіιјκоοрρѕτυхχуν]/g,c=>nameLookalikes[c]).replace(/[ '\u2019-]/g,'');
 const obscene=/(?:f+u+c+k+|c+u+n+t+|n+i+g+g+(?:e+r+|a+)|motherfuc|bullshit|heilhitler|whitepower)/.test(key)||/^(?:sh+i+t+(?:head|face|bag|ty|e)?|fuk(?:you|off)?|ass(?:hole|wipe|hat)|arse(?:hole)?|bitch(?:es)?|bastard|cock|dickhead|wanker|twat|pussy|whore|slut|fag(?:got)?|retard|spic|kike|chink|paki|hitler|nazi|kkk|stfu|wtf|idiot|moron)$/.test(key);
 return obscene?{error:'Please choose a different first name.'}:{name};
}
export function polityNameKey(value){return String(value??'').trim().replace(/\s+/g,' ').toLowerCase();}
export function normalizePolityName(value){const name=String(value??'').trim();return presetLookup.get(polityNameKey(name))||name;}
function normalizePower(value,territories){const key=polityNameKey(normalizePolityName(value));return [...colonialPowers,...territories.map(t=>t.name)].find(name=>polityNameKey(name)===key)||normalizePolityName(value);}
export function proposalInput(proposal,hexes){
 if(!proposal||proposal.version!==3||!Array.isArray(proposal.territories)||!proposal.territories.length||proposal.territories.length>255||typeof proposal.assignments!=='string'||proposal.assignments.length>10000)throw new Error('Finish assigning the whole map before joining the league.');
 let bytes;try{bytes=Uint8Array.from(atob(proposal.assignments),c=>c.charCodeAt(0));}catch{throw new Error('The saved map could not be read.');}
 const ts=proposal.territories.map(t=>({name:normalizePolityName(t.name),status:t.status,power:t.power||'',relationship:t.relationship||'None',sect:t.sect||null,cells:[]}));
 ts.forEach(t=>t.power=normalizePower(t.power,ts));
 if(ts.some(t=>!t.name||t.name.length>70||!statuses.has(t.status)||Object.hasOwn(rules,t.name)&&!rules[t.name].includes(t.status))||new Set(ts.map(t=>polityNameKey(t.name))).size!==ts.length)throw new Error('Some territorial assignments need to be checked.');
 for(const t of ts){if(t.status==='Imamate'&&!['Sunni','Shia','Ibadi'].includes(t.sect))throw new Error('Choose Sunni, Shia or Ibadi for each imamate.');if(['Direct colonial administration','Protectorate'].includes(t.status)&&!colonialPowers.has(t.power))throw new Error('Choose a colonial power.');if(t.status==='Autonomous territory'&&(t.relationship!=='Treaty association'||!powers.has(t.power)&&!ts.some(p=>p!==t&&p.name===t.power&&['Independent state','Imamate','Protectorate'].includes(p.status))))throw new Error('Choose an eligible treaty partner.');if(['Independent state','Imamate'].includes(t.status)&&t.relationship!=='None'&&(!powers.has(t.power)||!['Treaty association','Sphere of influence'].includes(t.relationship)))throw new Error('Choose a valid external relationship.');}
 for(const c of hexes){const owner=bytes[c.i]||(c.absorbed||[]).map(i=>bytes[i]).find(Boolean);if(!owner||!ts[owner-1])throw new Error('Every hex needs an assignment before your score can be recorded.');ts[owner-1].cells.push(c);}
 if(ts.some(t=>t.name==='Jewish National Home'&&t.cells.some(c=>['Mecca','Medina','Najaf'].includes(c.city))))throw new Error('Mecca, Medina and Najaf cannot be part of a Jewish National Home. Edit their assignment before continuing.');
 if(ts.some(t=>t.name==='Free Port'&&!t.cells.some(c=>c.port)))throw new Error('Free Port must include a marked port. Add a port to its territory or choose another name.');
 if(ts.some(t=>!t.cells.length))throw new Error('An empty territory remains in the proposal. Save the map and try again.');
 for(const t of ts){const ids=new Map(t.cells.map(c=>[c.i,c])),left=new Set(ids.keys());let count=0;while(left.size){count++;const queue=[left.values().next().value];left.delete(queue[0]);for(let i=0;i<queue.length;i++)for(const n of ids.get(queue[i]).neighbours)if(left.has(n)){left.delete(n);queue.push(n);}}t.components=count;}
 return ts;
}
const leagueRoundMs=7*24*60*60*1000;
export function leagueRound(now=Date.now()){const startsAt=Math.floor(now/leagueRoundMs)*leagueRoundMs;return {startsAt,endsAt:startsAt+leagueRoundMs,hours:168};}
export async function leagueRequest(request,env,hexes,engine){
 const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 const url=new URL(request.url),origin=request.headers.get('origin');if(request.method==='POST'&&((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site'||!request.headers.get('content-type')?.startsWith('application/json')))return json({error:'Open the game to submit your score.'},403);
 if(!env.DB)return json({error:'The league table is temporarily unavailable. Please try again.'},503);
 let guest=request.headers.get('cookie')?.match(/(?:^|;\s*)pf_player=([a-f0-9-]{36})(?:;|$)/)?.[1];const headers={};
 if(!guest){guest=crypto.randomUUID();headers['set-cookie']=`pf_player=${guest}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`;}
 const ruleset=Math.max(1,Math.floor(Number(engine.ruleset)||1)),now=Date.now(),round=leagueRound(now);
 const identity='guest:'+guest+':ruleset:'+ruleset+':round:'+round.startsAt;
 const playerKey=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity)))).map(n=>n.toString(16).padStart(2,'0')).join('');
 try{
  let score,improved=false;
  if(request.method==='POST'){
   if(Number(request.headers.get('content-length')||0)>70000)return json({error:'The submitted proposal is too large.'},413,headers);
   const raw=await request.text();if(raw.length>70000)return json({error:'The submitted proposal is too large.'},413,headers);
   let body;try{body=JSON.parse(raw);}catch{return json({error:'The proposal could not be read.'},400,headers);}
   if(!['preview','submit'].includes(body.action))return json({error:'Unknown league action.'},400,headers);
   const checkedName=body.action==='submit'?leagueName(body.firstName):null;if(checkedName?.error)return json({error:checkedName.error},400,headers);
   let input;try{input=proposalInput(body.proposal,hexes);}catch(error){return json({error:error.message},400,headers);}
   const history=engine.build(input);score=engine.score(history,input);
   if(body.action==='submit'){
    const name=checkedName.name;
    const result=await env.DB.prepare('INSERT INTO league (player_key,first_name,score,peace,durability,cooperation,edition,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(player_key) DO UPDATE SET first_name=excluded.first_name,score=excluded.score,peace=excluded.peace,durability=excluded.durability,cooperation=excluded.cooperation,edition=excluded.edition,updated_at=excluded.updated_at WHERE excluded.score >= league.score').bind(playerKey,name,score.total,score.peace,score.durability,score.cooperation,history.signature+':round:'+round.startsAt,now,now).run();improved=Number(result.meta?.changes)>0;
   }
  }
  const {results}=await env.DB.prepare(`SELECT player_key, first_name, score, peace, durability, cooperation FROM league WHERE edition LIKE '${ruleset}-%:round:${round.startsAt}' AND created_at >= ${round.startsAt} AND created_at < ${round.endsAt} ORDER BY score DESC, peace DESC, durability DESC, created_at ASC LIMIT 100`).all();
  const rows=(results||[]).filter(r=>!leagueName(r.first_name).error).map((r,i)=>({rank:i+1,firstName:r.first_name,score:r.score,peace:r.peace,durability:r.durability,cooperation:r.cooperation,mine:r.player_key===playerKey}));
  return json({rows,score,improved,round,serverTime:now},200,headers);
 }catch(error){console.error('League request failed',error.message);return json({error:'The league table could not be reached. Your map is safe; please try again.'},503,headers);}
}
