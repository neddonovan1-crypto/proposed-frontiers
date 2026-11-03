const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../map.js'),'utf8');
function fixture(width=10){
 const cells=[{i:1,x:0,y:0,land:true},{i:2,x:20,y:10,land:true,city:'Angora'},{i:3,x:40,y:0,land:true},{i:4,x:50,y:10,land:false,city:'Protected port'},{i:5,x:70,y:0,land:true,city:'Konya'},{i:6,x:100,y:0,land:true},{i:7,x:0,y:100,land:true}];
 const state={cells,selected:new Set(),mode:'paint',drag:{},W:10,q:()=>({value:width}),point:e=>e,queueSelection(){},nearestHex:(x,y)=>cells.reduce((a,c)=>Math.hypot(c.x-x,c.y-y)<Math.hypot(a.x-x,a.y-y)?c:a,cells[0])};
 vm.runInNewContext(source.slice(source.indexOf('function brushCells(pt)'),source.indexOf('function washAt(e)')),state);return state;
}
test('A wide stroke includes city cells off its centreline on the first pass, but excludes protected land',()=>{
 const s=fixture();s.paint({x:0,y:0});s.paint({x:100,y:0});
 assert.deepEqual([...s.selected].sort(),[1,2,3,5,6]);
 s.mode='erase';s.drag={};s.paint({x:0,y:0});s.paint({x:100,y:0});assert.equal(s.selected.size,0);
});
test('Starting a wide brush over a city retains its full footprint and a continuous stroke',()=>{
 const s=fixture();s.paint({x:20,y:10});assert.deepEqual([...s.selected].sort(),[1,2,3]);
 s.paint({x:100,y:0});assert.ok(s.selected.has(5));assert.ok(s.selected.has(6));assert.ok(!s.selected.has(4));
});
test('A one-hex brush selects a city alone and does not skip cities during a fast drag',()=>{
 const s=fixture(1);s.paint({x:20,y:10});assert.deepEqual([...s.selected],[2]);
 s.mode='erase';s.paint({x:20,y:10});assert.equal(s.selected.size,0);
 s.mode='paint';s.drag={};s.paint({x:40,y:0});s.paint({x:100,y:0});assert.ok(s.selected.has(5));assert.ok(!s.selected.has(4));
});

test('Paint preview matches the first stamp at every width and updates within the same hex',()=>{
 for(let width=1;width<=10;width++)for(const pt of [{x:0,y:0},{x:5,y:0},{x:20,y:10},{x:70,y:0}]){
  const s=fixture(width),preview=Array.from(s.brushCells(pt),c=>c.i);
  s.paint(pt);assert.deepEqual([...s.selected],preview);assert.ok(!preview.includes(4));
  if(width===1)assert.equal(preview.length,1);
 }
 const s=fixture(8);assert.notDeepEqual(Array.from(s.brushCells({x:0,y:0}),c=>c.i),Array.from(s.brushCells({x:5,y:0}),c=>c.i));
});
test('Hover follows the moving brush footprint, width and temporary pan without selecting land',()=>{
 const s=fixture(8),attributes=new Map();let move;
 Object.assign(s,{spacePan:false,hoverClips:[],hoverOutline:{getAttribute:k=>attributes.get(k),setAttribute:(k,v)=>attributes.set(k,String(v)),removeAttribute:k=>attributes.delete(k)},map:{addEventListener:(event,handler)=>{if(event==='pointermove')move=handler;}}});
 vm.runInNewContext(source.slice(source.indexOf('let hoverPoint=null;'),source.indexOf("for(const event of ['pointerleave'")),s);
 move({x:0,y:0});const first=attributes.get('data-cells');move({x:5,y:0});assert.notEqual(attributes.get('data-cells'),first);
 s.q=()=>({value:1});s.refreshHover();assert.equal(attributes.get('data-cells'),'1');
 s.q=()=>({value:10});s.refreshHover();assert.ok(attributes.get('data-cells').includes(','));
 s.spacePan=true;s.refreshHover();assert.equal(attributes.get('data-cells'),'1');
 s.spacePan=false;s.mode='pan';s.refreshHover();assert.equal(attributes.get('data-cells'),'1');
 s.mode='paint';s.refreshHover();assert.ok(attributes.get('data-cells').includes(','));assert.equal(s.selected.size,0);
 move({pointerType:'touch',x:5,y:0});assert.equal(attributes.has('d'),false);s.refreshHover();assert.equal(attributes.has('d'),false);
});
