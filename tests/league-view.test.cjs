const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(round,failAt){
 const calls=[],timers=[];
 const node=tag=>({tag,dataset:{},children:[],append(n){this.children.push(n);},setAttribute(){},replaceChildren(){this.children=[];}});
 const window={},document={createElement:node};
 vm.runInNewContext(fs.readFileSync(require.resolve('../league.js'),'utf8'),{window,document,AbortSignal,setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;},clearTimeout:()=>{},fetch:async(url,options)=>{calls.push({url,...options});if(calls.length===failAt)throw new Error("Temporary outage");return {ok:true,json:async()=>({rows:[{rank:1,firstName:'Ned',score:85,peace:35,durability:35,cooperation:15}],...(round?{round,serverTime:round.startsAt}:{})})};}});
 const section=node('section');section.id='v2-public-league';return {calls,window,section,timers};
}
test('Visitors can read the league without a finished map or score submission',async()=>{
 const {calls,window,section}=setup();window.FrontiersLeague.mount(section);await new Promise(setImmediate);
 assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');assert.equal(calls[0].body,undefined);
 assert.equal(section.children.find(n=>n.tag==='form').hidden,true);assert.equal(section.children.find(n=>n.className==='league-score').hidden,true);
 assert.equal(section.children.find(n=>n.className==='league-board').children[0].tag,'table');
});
test('Finished settlements retain score preview and league entry',async()=>{
 const {calls,window,section}=setup(),proposal={version:3};window.FrontiersLeague.mount(section,{proposal});await new Promise(setImmediate);
 assert.equal(calls[0].method,'POST');assert.deepEqual(JSON.parse(calls[0].body),{action:'preview',proposal});assert.equal(section.children.find(n=>n.tag==='form').hidden,false);
});

test('League shows the next reset and refreshes a still-open board at the round boundary',async()=>{
 const round={startsAt:Date.UTC(2026,8,28),endsAt:Date.UTC(2026,9,5),hours:168};
 const {calls,window,section,timers}=setup(round);section.isConnected=true;window.FrontiersLeague.mount(section);await new Promise(setImmediate);
 assert.match(section.children.find(n=>n.className==='league-round').textContent,/7-day round · Next reset/);
 assert.equal(timers[0].delay,7*24*60*60*1000+100);await timers[0].fn();assert.equal(calls.length,2);assert.equal(calls[1].method,'GET');
 section.isConnected=false;await timers[1].fn();assert.equal(calls.length,2);
});

test('An interrupted round refresh retries without posting a score',async()=>{
 const round={startsAt:Date.UTC(2026,8,28),endsAt:Date.UTC(2026,9,5),hours:168};
 const {calls,window,section,timers}=setup(round,2);section.isConnected=true;window.FrontiersLeague.mount(section);await new Promise(setImmediate);
 await timers[0].fn();assert.equal(timers[1].delay,15000);assert.match(section.children.find(n=>n.className==='league-status').textContent,/Temporary outage/);
 await timers[1].fn();assert.equal(calls.length,3);assert.ok(calls.every(c=>c.method==='GET'));assert.match(section.children.find(n=>n.className==='league-status').textContent,/new league round/);
});
