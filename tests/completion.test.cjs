const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../map.js'),'utf8');
function fixture(){
 const fields=new Map(),frames=[],state={territories:[],selected:new Set(),active:null,completionShown:false,root:{dataset:{}},cells:[1,2].map(i=>({i,land:true,node:{classList:{toggle(){}}}})),q(id){if(!fields.has(id))fields.set(id,{focus(){}});return fields.get(id);},hostScreen(){},closeResults(){},requestAnimationFrame(fn){frames.push(fn);},completionDialog:{open:false,showModal(){this.open=true;},close(){this.open=false;}}};
 vm.runInNewContext(source.slice(source.indexOf('function missingCells()'),source.indexOf('function focusCell(')),state);state.flush=()=>{while(frames.length)frames.shift()();};return state;
}
test('Painting the final cells waits for an explicit assignment before opening completion',()=>{
 const s=fixture();s.selected=new Set([1,2]);s.renderCompletion();s.flush();assert.equal(s.completionDialog.open,false);assert.equal(s.completionShown,false);
 s.territories=[{id:1,cells:[1,2]}];s.selected.clear();s.renderCompletion();s.flush();assert.equal(s.completionDialog.open,true);assert.equal(s.completionShown,true);
});
test('A queued completion cannot interrupt a new draft, and saving that draft prompts again',()=>{
 const s=fixture();s.territories=[{id:1,cells:[1,2]}];s.renderCompletion();s.active=1;s.selected=new Set([1,2]);s.renderCompletion();s.flush();assert.equal(s.completionDialog.open,false);
 s.selected.clear();s.active=null;s.renderCompletion();s.flush();assert.equal(s.completionDialog.open,true);
 s.completionDialog.close();s.renderCompletion();s.flush();assert.equal(s.completionDialog.open,false);
 s.active=1;s.selected=new Set([1,2]);s.renderCompletion();s.active=null;s.selected.clear();s.renderCompletion();s.flush();assert.equal(s.completionDialog.open,true);
});
test('An unassigned cell keeps the completion prompt closed',()=>{const s=fixture();s.territories=[{id:1,cells:[1]}];s.renderCompletion();s.flush();assert.equal(s.completionDialog.open,false);assert.equal(s.q('v2-results').disabled,true);});
