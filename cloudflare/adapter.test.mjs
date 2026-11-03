import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import engine from '../chronicle.js';
import worker from './worker.mjs';
import {leagueRound} from '../worker/league.mjs';

test('Cloudflare serves the game and ignores spoofed Sites identity headers',async()=>{
  const page=await worker.fetch(new Request('https://sykespicot.io/'),{});
  assert.equal(page.status,200);
  assert.match(await page.text(),/Proposed Frontiers/);
  const hexes=JSON.parse(await readFile(new URL('../db/hexes.json',import.meta.url)));
  const owners=new Uint8Array(4000);for(const c of hexes)owners[c.i]=1;
  const proposal={version:3,assignments:Buffer.from(owners).toString('base64'),territories:[{name:'Union',status:'Independent state',power:'',relationship:'None'}]};
  let savedKey;
  const DB={prepare(){return {bind(key){savedKey=key;return {async run(){return {meta:{changes:1}};}};},async all(){return {results:[]};}};}};
  const guest='12345678-1234-4234-8234-123456789abc';
  const response=await worker.fetch(new Request('https://sykespicot.io/api/league',{method:'POST',headers:{'content-type':'application/json',origin:'https://sykespicot.io',cookie:'pf_player='+guest,'oai-authenticated-user-id':'untrusted-claim'},body:JSON.stringify({action:'submit',firstName:'Test',proposal})}),{DB});
  assert.equal(response.status,200);
  assert.equal(savedKey,createHash('sha256').update('guest:'+guest+':ruleset:'+engine.ruleset+':round:'+leagueRound().startsAt).digest('hex'));
});
