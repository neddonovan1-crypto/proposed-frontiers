(()=>{
 const key='codex:visualization-widget-state-v2:'+JSON.stringify([location.pathname,location.search]);
 let state=null;try{state=JSON.parse(localStorage.getItem(key)||'null');}catch{}
 window.FrontiersStore={state,save(next){this.state=next;try{localStorage.setItem(key,JSON.stringify(next));}catch{}}};
})();
