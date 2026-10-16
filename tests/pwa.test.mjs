import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const root=new URL('../public/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',root),'utf8'));
assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'/');
for(const icon of manifest.icons){const file=await readFile(new URL(icon.src.slice(1),root));assert.equal(file.readUInt32BE(16),+icon.sizes.split('x')[0]);assert.equal(file.readUInt32BE(20),+icon.sizes.split('x')[1])}
assert.ok(manifest.icons.some(i=>i.purpose==='maskable'));
const handlers={},stored=new Map(),deleted=[];let offline=false,puts=0,claimed=false,skipped=false;
const origin='https://bramsee.example';
const context={URL,Response,fetch:async req=>{if(offline)throw Error('offline');const response=new Response(typeof req==='string'&&req==='/offline.html'?'Offline fallback':'Personalized live response');Object.defineProperty(response,'redirected',{value:true});return response},caches:{open:async()=>({put:async(url,response)=>{stored.set(url,response);puts++}}),keys:async()=>['bramsee-static-v0','bramsee-static-v2','unrelated-app'],delete:async key=>{deleted.push(key)},match:async key=>stored.get(key)?.clone()},self:{location:{origin},clients:{claim:async()=>{claimed=true}},skipWaiting:()=>{skipped=true},addEventListener:(name,handler)=>{handlers[name]=handler}}};
runInNewContext(await readFile(new URL('sw.js',root),'utf8'),context);
let pending;handlers.install({waitUntil:promise=>{pending=promise}});await pending;
assert.deepEqual([...stored.keys()],['/offline.html','/favicon.svg','/brand/icon-192.png']);assert.equal(stored.get('/offline.html').redirected,false,'Redirected host assets are normalized before being cached');
handlers.activate({waitUntil:promise=>{pending=promise}});await pending;assert.deepEqual(deleted,['bramsee-static-v0']);assert.equal(claimed,true);
async function request(path,mode='cors',method='GET'){let result;handlers.fetch({request:{url:new URL(path,origin).href,method,mode},respondWith:promise=>{result=promise}});return result?await result:undefined}
for(const path of ['/api/live?kind=trips','/api/me','/api/journey?id=private','/api/saved','/api/walk','/data/catalog.json','/signin-with-chatgpt','https://tiles.example/map.png'])assert.equal(await request(path),undefined,'No SW cache interception: '+path);
assert.equal(await request('/','cors'),undefined,'RSC fetches bypass SW');assert.equal(await request('/offline.html','cors','POST'),undefined);
assert.equal(await (await request('/','navigate')).text(),'Personalized live response');assert.equal(puts,3,'Personalized page never written to cache');
offline=true;assert.equal(await (await request('/?journey=private','navigate')).text(),'Offline fallback','Offline journey link receives generic, non-personalized fallback');
assert.equal(await request('/api/live'),undefined,'No live feed is replayed offline');
handlers.message({data:{type:'unrelated'}});assert.equal(skipped,false);handlers.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(skipped,true);
console.log('PWA checks passed: icon sizes, install manifest, offline fallback, explicit updates, cache isolation and no API/personalized page caching.');
