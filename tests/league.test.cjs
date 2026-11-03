const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{DatabaseSync}=require('node:sqlite'),engine=require('../chronicle.js');
const hexes=JSON.parse(fs.readFileSync(require.resolve('../db/hexes.json'),'utf8'));
function DB(){const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(require.resolve('../drizzle/0000_complete_black_cat.sql'),'utf8'));return {prepare(sql){return {bind(...args){return {async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}};}};},async all(){return {results:db.prepare(sql).all()};}};}};}
const guestCookie=(who='first')=>'pf_player='+({'first':'11111111-1111-4111-8111-111111111111','second':'22222222-2222-4222-8222-222222222222','same-player':'33333333-3333-4333-8333-333333333333','legacy-player':'44444444-4444-4444-8444-444444444444'}[who]);
function proposal(){const a=new Uint8Array(4000);for(const c of hexes)a[c.i]=1;return {version:3,assignments:Buffer.from(a).toString('base64'),territories:[{name:'Union',status:'Independent state',power:'',relationship:'None'}]};}
test('Shared league recalculates score, validates completeness, preserves best and returns safe fields',async()=>{const {leagueRequest}=await import('../worker/league.mjs'),env={DB:DB()},call=(action,p=proposal(),name='Ned',who='first')=>leagueRequest(new Request('https://game.test/api/league',{method:'POST',headers:{'origin':'https://game.test','content-type':'application/json',cookie:guestCookie(who)},body:JSON.stringify({action,firstName:name,proposal:p,score:9999})}),env,hexes,engine);const preview=await (await call('preview')).json();assert.ok(preview.score.total<=100);assert.equal(preview.rows.length,0);const submit=await (await call('submit')).json();assert.equal(submit.rows.length,1);assert.equal(submit.rows[0].firstName,'Ned');assert.equal(submit.rows[0].score,preview.score.total);assert.equal(submit.rows[0].mine,true);assert.ok(!('player_key' in submit.rows[0]));const second=await (await call('submit',proposal(),'Sara','second')).json();assert.equal(second.rows.length,2);const again=await (await call('submit')).json();assert.equal(again.rows.length,2);const bad=proposal();bad.assignments='';assert.equal((await call('submit',bad)).status,400);assert.equal((await call('submit',proposal(),'<script>')).status,400);});
test('Cross-origin and malformed writes are rejected without touching data',async()=>{const {leagueRequest}=await import('../worker/league.mjs');const r=await leagueRequest(new Request('https://game.test/api/league',{method:'POST',headers:{origin:'https://other.test','content-type':'application/json'},body:'{}'}),{DB:DB()},hexes,engine);assert.equal(r.status,403);});
test('League identity uses the existing guest cookie and ignores obsolete hosting headers',async()=>{
 const {leagueRequest,leagueRound}=await import('../worker/league.mjs'),env={DB:DB()};
 const call=async(who,header)=>{
  const request=new Request('https://game.test/api/league',{method:'POST',headers:{'content-type':'application/json',cookie:guestCookie(who),'oai-authenticated-user-id':header},body:JSON.stringify({action:'submit',firstName:'Ned',proposal:proposal()})});
  const response=await leagueRequest(request,env,hexes,engine);assert.equal(response.status,200);return response.json();
 };
 await call('first','former-host-user');const repeated=await call('first','another-claimed-user');assert.equal(repeated.rows.length,1);assert.equal(repeated.rows[0].mine,true);
 const another=await call('second','former-host-user');assert.equal(another.rows.length,2);assert.equal(another.rows.filter(r=>r.mine).length,1);
 const expected=require('node:crypto').createHash('sha256').update('guest:'+guestCookie('first').slice('pf_player='.length)+':ruleset:'+engine.ruleset+':round:'+leagueRound().startsAt).digest('hex');
 assert.ok((await env.DB.prepare('SELECT player_key FROM league').all()).results.some(r=>r.player_key===expected));
});
test('League names allow ten characters and real names without accepting profanity or common disguises',async()=>{
 const {leagueName}=await import('../worker/league.mjs');
 for(const name of ['Ned','Alexandria','José','محمد','李明','Anne-Marie','O’Neil','Dick','Fanny','Anas','Shital','Yoshito','Fukuda','Cockburn'])assert.equal(leagueName(name).name,name,name);
 assert.equal(leagueName('  José  ').name,'José');
 for(const name of ['Christopher','','<script>','Name123','fuck','F U C K','f-ú-c-k','ＦＵＣＫ','fuсk','shithead','cunt','NIGGER','n i g g a','bitch','HeilHitler','asshole','dickhead','twat','fag','slut','name\u200b','-Anne','Anne-'])assert.ok(leagueName(name).error,name);
});
test('League API rejects offensive or long names before storing and hides old invalid entries',async()=>{
 const {leagueRequest}=await import('../worker/league.mjs'),env={DB:DB()};
 for(const name of ['F U C K','Christopher']){
  const response=await leagueRequest(new Request('https://game.test/api/league',{method:'POST',headers:{origin:'https://game.test','content-type':'application/json'},body:JSON.stringify({action:'submit',firstName:name,proposal:proposal()})}),env,hexes,engine);
  assert.equal(response.status,400);assert.ok((await response.json()).error);
 }
 assert.equal((await env.DB.prepare('SELECT first_name FROM league').all()).results.length,0);
 for(const [i,name] of ['fuck','Ned','Christopher','Sara'].entries())await env.DB.prepare('INSERT INTO league (player_key,first_name,score,peace,durability,cooperation,edition,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind('player-'+i,name,90-i,35,35,20,engine.ruleset+'-TEST:round:'+(Math.floor(Date.now()/(7*24*60*60*1000))*7*24*60*60*1000),Date.now(),Date.now()).run();
 const data=await (await leagueRequest(new Request('https://game.test/api/league'),env,hexes,engine)).json();
 assert.deepEqual(data.rows.map(r=>[r.rank,r.firstName]),[[1,'Ned'],[2,'Sara']]);
});
test('A new rule edition preserves old scores without ranking them against current proposals',async()=>{const {leagueRequest}=await import('../worker/league.mjs'),env={DB:DB()};await env.DB.prepare('INSERT INTO league (player_key,first_name,score,peace,durability,cooperation,edition,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind('old-player','Earlier',100,40,40,20,'OLD-EDITION',1,1).run();const response=await leagueRequest(new Request('https://game.test/api/league'),env,hexes,engine),data=await response.json();assert.deepEqual(data.rows,[]);const stored=await env.DB.prepare('SELECT first_name FROM league').all();assert.equal(stored.results[0].first_name,'Earlier');});

test('League rounds reset exactly every 7 days and retain earlier rounds and each round’s best',async t=>{
 const {leagueRequest,leagueRound}=await import('../worker/league.mjs'),env={DB:DB()},duration=7*24*60*60*1000;
 let now=Date.UTC(2026,8,28,12),points=80;t.mock.method(Date,'now',()=>now);
 const firstRound=leagueRound();assert.equal(firstRound.endsAt-firstRound.startsAt,duration);assert.equal(leagueRound(firstRound.endsAt-1).startsAt,firstRound.startsAt);assert.equal(leagueRound(firstRound.endsAt).startsAt,firstRound.endsAt);
 const scoring={ruleset:engine.ruleset,build:()=>({signature:engine.ruleset+'-ROUND'}),score:()=>({total:points,peace:30,durability:30,cooperation:20})};
 const call=async(submit=false)=>{const request=new Request('https://game.test/api/league',{method:submit?'POST':'GET',headers:{'content-type':'application/json',cookie:guestCookie('same-player')},...(submit?{body:JSON.stringify({action:'submit',firstName:'Ned',proposal:proposal()})}:{})});return (await leagueRequest(request,env,hexes,scoring)).json();};
 let data=await call(true);assert.equal(data.rows[0].score,80);assert.equal(data.round.endsAt,firstRound.endsAt);
 points=50;data=await call(true);assert.equal(data.improved,false);assert.equal(data.rows[0].score,80);
 now=firstRound.endsAt;data=await call();assert.deepEqual(data.rows,[]);assert.equal(data.round.startsAt,firstRound.endsAt);
 data=await call(true);assert.equal(data.rows.length,1);assert.equal(data.rows[0].score,50);assert.equal(data.rows[0].mine,true);
 const stored=(await env.DB.prepare('SELECT score FROM league ORDER BY score DESC').all()).results;assert.deepEqual(stored.map(r=>r.score),[80,50]);
});

test('Introducing rounds preserves legacy scores but never lists a player twice',async()=>{
 const {leagueRequest}=await import('../worker/league.mjs'),env={DB:DB()},who='legacy-player';
 const oldKey=require('node:crypto').createHash('sha256').update('guest:'+guestCookie(who).slice('pf_player='.length)+':ruleset:'+engine.ruleset).digest('hex');
 await env.DB.prepare('INSERT INTO league (player_key,first_name,score,peace,durability,cooperation,edition,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(oldKey,'Ned',100,40,40,20,engine.ruleset+'-LEGACY',Date.now(),Date.now()).run();
 const request=new Request('https://game.test/api/league',{method:'POST',headers:{'content-type':'application/json',cookie:guestCookie(who)},body:JSON.stringify({action:'submit',firstName:'Ned',proposal:proposal()})});
 const data=await (await leagueRequest(request,env,hexes,engine)).json();assert.equal(data.rows.length,1);assert.equal(data.rows[0].mine,true);
 const stored=(await env.DB.prepare('SELECT player_key, score FROM league').all()).results;assert.equal(stored.length,2);assert.equal(stored.find(r=>r.player_key===oldKey).score,100);
});
