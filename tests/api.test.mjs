import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
const headers={Origin:base,'Content-Type':'application/json',Cookie:'__sites_local_auth=1'};
const req=(path,body,extra={})=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...headers,...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
assert.equal((await fetch(base+'/api/saved')).status,401);
assert.equal((await req('/api/saved',['00000020'],{Origin:'https://invalid.example'})).status,403);
assert.equal((await req('/api/saved',['00000020'])).status,200);
assert.deepEqual(await (await req('/api/saved')).json(),['00000020']);
const r=await req('/api/journey',{destination:'Synthetic QA journey',lat:43.685,lon:-79.761});assert.equal(r.status,200);const {id}=await r.json();
await req('/api/journey',{id,active:false},{Cookie:''});
assert.equal((await (await req('/api/journey?id='+id)).json()).active,1,'Anonymous visitor cannot end a journey');
await req('/api/journey',{id,active:false});
assert.equal((await (await req('/api/journey?id='+id)).json()).active,0);
await req('/api/journey',{id,lat:43.685,lon:-79.761});
const ended=await (await req('/api/journey?id='+id)).json();assert.equal(ended.active,0,'Late GPS update must not restart sharing');assert.equal(ended.lat,undefined,'Ended links must not disclose location');
console.log('8 local API authentication, ownership, sync and sharing checks passed.');

