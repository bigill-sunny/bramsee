import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadServiceTrips,plan,localClock} from '../lib/planner.ts';
const directory=resolve(process.argv[2]||'public/data');
const catalog=JSON.parse(await readFile(resolve(directory,'catalog.json'),'utf8'));
const stopIds=new Set(catalog.stops.map(s=>s.id));
assert.equal(stopIds.size,catalog.stops.length,'Unique stop IDs');
const services=[...new Set(Object.values(catalog.calendar).flat())];
assert.ok(services.length>5);
const data=new Map();
for(const key of services){
 assert.match(key,/^(BT|GO)-[a-f0-9]{24}$/);
 const rows=JSON.parse(await readFile(resolve(directory,key+'.json'),'utf8'));
 assert.ok(rows.length);
 for(const t of rows){assert.ok(catalog.routes[t.route]);assert.ok(t.stops.length>=2);for(const s of t.stops){assert.ok(stopIds.has(s[0]));assert.ok(Number.isFinite(s[1]));assert.ok(Number.isFinite(s[5]));assert.ok(s[5]<=s[1])}}
 data.set(key,rows);
}
const today=localClock().date;
for(const agency of ['BT','GO']){
 const c=catalog.coverage[agency];assert.ok(c.from<=today&&c.until>=today,agency+' covers today');
 // Plan actual direct journeys from sampled current trip instances, independent of historical IDs.
 const clock=Date.now();const trips=await loadServiceTrips(catalog,async key=>data.get(key)||[],clock);
 const samples=trips.filter(t=>t.agency===agency&&t.stops[0][3]===0&&t.stops.at(-1)[4]===0).slice(0,3);
 assert.ok(samples.length,agency+' has current trip instances');
 const byId=new Map(catalog.stops.map(s=>[s.id,s]));
 for(const t of samples){const at=(t.serviceMidnight+t.stops[0][1]-120)*1000;const result=plan(byId.get(t.stops[0][0]),byId.get(t.stops.at(-1)[0]),catalog,[t],null,500,at);assert.ok(result.some(o=>o.legs[0].trip.id===t.id),agency+' sample can be routed')}
}
console.log(JSON.stringify({checkedServices:services.length,stops:catalog.stops.length,coverage:catalog.coverage}));
