import {decodeFeed} from './realtime.ts';
const names:Record<string,string>={trips:'TripUpdates',vehicles:'VehiclePosition',alerts:'Alerts'};
const cache=new Map<string,{at:number,data:any}>();
export function namespaceGO(data:ReturnType<typeof decodeFeed>,kind:string){return {...data,items:data.items.map((item:any)=>kind==='trips'?{...item,trip:'GO:'+item.trip,timestamp:item.timestamp||data.timestamp,stops:item.stops.map((s:any)=>({...s,id:s.id?'GO:'+s.id:s.id}))}:kind==='vehicles'?{...item,trip:'GO:'+item.trip,route:'GO:'+item.route,timestamp:item.timestamp||data.timestamp}:{...item,id:'GO:'+item.id,routes:item.routes.map((r:string)=>'GO:'+r)})}}
export async function goFeed(kind:string,key:string){
 if(!names[kind])throw Error('Unknown feed');const found=cache.get(kind);if(found&&Date.now()-found.at<30000)return found.data;
 const url=new URL('https://api.openmetrolinx.com/OpenDataAPI/api/V1/Gtfs/Feed/'+names[kind]+'.proto');url.searchParams.set('key',key);
 const r=await fetch(url,{headers:{Accept:'application/x-protobuf'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('GO live updates unavailable');const b=await r.arrayBuffer();if(b.byteLength>12000000)throw Error('Feed too large');const data=namespaceGO(decodeFeed(new Uint8Array(b),kind),kind);cache.set(kind,{at:Date.now(),data});return data;
}
// Preserve each agency's timestamp: a fresh GO feed must never revive stale BT data.
export function mergeAgencyFeeds(feeds:{timestamp:number,items:any[]}[],kind:string,at=Date.now()){
 const valid=feeds.filter(f=>f.timestamp>at/1000-120&&f.timestamp<=at/1000+30);
 if(!valid.length)throw Error('No fresh transit feed');return {timestamp:Math.max(...valid.map(f=>f.timestamp)),items:valid.flatMap(f=>f.items.map(item=>kind==='trips'||kind==='vehicles'?{...item,timestamp:item.timestamp||f.timestamp}:item))};
}
