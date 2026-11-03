const test=require('node:test'),assert=require('node:assert/strict'),{build}=require('../chronicle.js'),hexes=require('../db/hexes.json');
const free=cells=>({name:'Free Port',status:'International administration',power:'',relationship:'None',components:cells.length,cells});
const refused=h=>h.events.some(e=>e.key==='International Commission Refuses the Territorial Grant');
test('Aqaba and Jeddah form a viable free-port network and keep the Jeddah success',()=>{
 const t=free(hexes.filter(c=>['Aqaba','Jeddah'].includes(c.city))),h=build([t]);assert.equal(t.cells.length,2);assert.equal(refused(h),false);assert.ok(h.outcomes[0].intact);assert.ok(h.events.some(e=>e.key==='Jeddah opens the gates of the Hejaz'));
});
test('A network of marked ports is not limited to four towns or adjacent harbours',()=>{const ports=hexes.filter(c=>c.port);assert.ok(ports.length>4);const h=build([free(ports)]);assert.equal(refused(h),false);assert.ok(h.outcomes[0].intact);});
test('Free-port network exception excludes unrelated inland enclaves and country-sized grants',()=>{
 const ports=hexes.filter(c=>['Aqaba','Jeddah'].includes(c.city)),inland=hexes.find(c=>c.city==='Angora');
 assert.ok(refused(build([free([...ports,inland])])));assert.ok(refused(build([free(hexes)])));
 assert.ok(refused(build([{...free(ports),name:'International City'}])));
});
