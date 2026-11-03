import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Approximate limits of the Anatolian peninsula at the scale of the playable hexes.
// The southern edge follows the Mediterranean coast and stays north of Aleppo and Mosul.
const outline=[[26,41.4],[29,41.4],[31,42.2],[38,42.2],[42,41.7],[44.8,40.7],[45,38.1],[43.5,37.4],[41,37.35],[39,37],[37,36.45],[36,36],[34,35.75],[31,35.75],[29,36],[26,37]];
export function inAnatolia(lon,lat){
 let inside=false;
 for(let i=0,j=outline.length-1;i<outline.length;j=i++){
  const [ax,ay]=outline[i],[bx,by]=outline[j];
  if((ay>lat)!==(by>lat)&&lon<(bx-ax)*(lat-ay)/(by-ay)+ax)inside=!inside;
 }
 return inside;
}

if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname){
 const path=resolve(import.meta.dirname,'../db/hexes.json');
 const hexes=JSON.parse(await readFile(path,'utf8'));
 for(const cell of hexes)cell.anatolia=inAnatolia(cell.lon,cell.lat);
 await writeFile(path,JSON.stringify(hexes));
 console.log(`Tagged ${hexes.filter(cell=>cell.anatolia).length} Anatolian hexes.`);
}
