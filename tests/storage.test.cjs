const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../bootstrap.js'),'utf8');
const key='codex:visualization-widget-state-v2:'+JSON.stringify(['/','']);
function store(storage){const context={window:{},location:{pathname:'/',search:''},localStorage:storage};vm.runInNewContext(source,context);return context.window.FrontiersStore;}
test('Standalone storage reads existing proposals and keeps selections and theme through a reload',()=>{
 const old={modelContent:{version:3,assignments:'AQID',selected:'AAE=',territories:[{name:'Syria'}]},privateContent:{theme:'light'}};
 const data=new Map([[key,JSON.stringify(old)]]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const s=store(storage);assert.equal(JSON.stringify(s.state),JSON.stringify(old));
 const next={...old,privateContent:{theme:'dark'},modelContent:{...old.modelContent,selected:'AwQ='}};s.save(next);
 assert.equal(data.size,1);assert.equal(JSON.stringify(store(storage).state),JSON.stringify(next));
});
test('Unavailable or corrupt local storage leaves an in-memory game usable',()=>{
 const unavailable=store({getItem(){throw Error('Unavailable');},setItem(){throw Error('Quota');}});
 assert.equal(unavailable.state,null);const draft={modelContent:{version:3}};unavailable.save(draft);assert.equal(unavailable.state,draft);
 assert.equal(store({getItem:()=>'{bad json'}).state,null);
});
