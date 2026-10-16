import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const base=process.env.BRAMSEE_TEST_URL;
if(base!=='http://127.0.0.1:4174')throw Error('Use the isolated local test Worker on port 4174.');
const nonce=randomBytes(8).toString('hex'),ip='192.0.2.'+(1+randomBytes(1)[0]%254);
async function post(path,body,cookie,origin=base){return fetch(base+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':ip,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)})}
async function account(label){const r=await post('/api/auth',{action:'register',name:'Test sharing '+label,email:label+nonce+'@example.invalid',password:'isolated-only-'+randomBytes(20).toString('hex')});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]}
const a=await account('a'),b=await account('b');const send=(body,cookie=a,origin=base)=>post('/api/journey',body,cookie,origin);
assert.equal((await send({lat:43.7,lon:-79.8},null)).status,401);
for(const body of [null,[],{lat:91,lon:0},{lat:43.7},{lat:'43.7',lon:-79.8},{id:'invalid',active:false}])assert.equal((await send(body)).status,400);
assert.equal((await send({lat:43.7,lon:-79.8},a,'https://evil.example')).status,403);
let r=await send({destination:'TEST ONLY journey',lat:43.7,lon:-79.8});assert.equal(r.status,200);const {id}=await r.json();
const read=async()=>{const r=await fetch(base+'/api/journey?id='+id);assert.equal(r.headers.get('cache-control'),'private, no-store');return r.json()};
assert.equal((await read()).lat,43.7,'Anonymous recipient can open link');
assert.equal((await send({id,lat:43.71,lon:-79.81})).status,200);assert.equal((await read()).lat,43.71);
assert.equal((await send({id,lat:44,lon:-80},b)).status,404,'Wrong account gets a real failure');
assert.equal((await send({id,active:false},b)).status,404);assert.equal((await read()).active,1);
assert.equal((await send({id,active:false})).status,200);assert.deepEqual(Object.keys(await read()).sort(),['active','updated']);
assert.equal((await send({id,active:false})).status,200,'Stopping is idempotent');
assert.equal((await send({id,lat:43.72,lon:-79.82})).status,409,'Ended journey cannot restart through an update');
assert.equal((await read()).active,0);
const race=await send({destination:'TEST ONLY race',lat:43.7,lon:-79.8});const raced=await race.json();
await Promise.all([send({id:raced.id,active:false}),send({id:raced.id,lat:43.72,lon:-79.82})]);
assert.equal((await (await fetch(base+'/api/journey?id='+raced.id)).json()).active,0,'Stop wins over an in-flight update');
const fixture=await (await send({destination:'TEST ONLY viewer',lat:43.7,lon:-79.8})).json();
writeFileSync('.sites-runtime/sharing-browser.json',JSON.stringify({id:fixture.id,cookie:a}));
console.log('Sharing integration passed: validation, authentication, anonymous reads, updates, ownership errors, stop/revoke, no reactivation and concurrent stop/update. Browser fixture: '+fixture.id);
