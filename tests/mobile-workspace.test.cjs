const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../map.js'),'utf8');
test('Mobile Assign opens the form on the first activation, including a repeated fragment',()=>{
 const frames=[],events={},nodes=new Map(),links=[{hash:'#v2-map-workspace'},{hash:'#v2-territory-workspace'}];let mode;
 const root={dataset:{},querySelectorAll:()=>links},window={location:{hash:'#v2-map-workspace'},matchMedia:()=>({matches:true}),addEventListener:(key,fn)=>events[key]=fn};
 const q=id=>{if(!nodes.has(id))nodes.set(id,{scrollIntoView(){this.scrolled=true;},focus(){this.focused=true;}});return nodes.get(id);};
 vm.runInNewContext(source.slice(source.indexOf('function mobileWorkspace()'),source.indexOf("q('v2-assign').onclick")),{root,window,q,setMode:m=>mode=m,requestAnimationFrame:fn=>frames.push(fn)});
 q('v2-mobile-review').onclick();assert.equal(root.dataset.workspace,'territory');assert.equal(mode,'paint');assert.equal(window.location.hash,'v2-territory-workspace');frames.shift()();assert.ok(q('v2-territory-workspace').focused);
 root.dataset.workspace='map';q('v2-mobile-review').onclick();assert.equal(root.dataset.workspace,'territory');
 q('v2-mobile-back').onclick();assert.equal(root.dataset.workspace,'map');assert.equal(window.location.hash,'v2-map-workspace');
 window.location.hash='#v2-territory-workspace';events.hashchange();assert.equal(root.dataset.workspace,'territory');
 links[0].onclick({preventDefault(){}});assert.equal(root.dataset.workspace,'map');
});
