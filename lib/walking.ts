export type WalkPoint={lat:number,lon:number,name?:string};
export type WalkRoute={distance:number,duration:number,coordinates:[number,number][],steps:{instruction:string,distance:number,duration:number}[],provider:string};
export class WalkingError extends Error{status:number;constructor(message:string,status=503){super(message);this.status=status}}
export function validateWalk(body:any):{from:WalkPoint,to:WalkPoint}{
 const valid=(p:any)=>p&&typeof p.lat==='number'&&typeof p.lon==='number'&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=42&&p.lat<=46&&p.lon>=-82&&p.lon<=-76;
 if(!valid(body?.from)||!valid(body?.to))throw new WalkingError('Choose two locations within the southern Ontario transit area.',400);
 return {from:{lat:body.from.lat,lon:body.from.lon},to:{lat:body.to.lat,lon:body.to.lon}};
}
export function decodeWalk(data:any):WalkRoute{
 const feature=data?.features?.[0],summary=feature?.properties?.summary,coordinates=feature?.geometry?.coordinates;
 const finite=(v:any)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 if(!finite(summary?.distance)||!finite(summary?.duration)||feature?.geometry?.type!=='LineString'||!Array.isArray(coordinates)||coordinates.length<2||coordinates.length>50000||coordinates.some((p:any)=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>90))throw new WalkingError('Walking directions returned an invalid route.');
 const steps=(feature.properties.segments||[]).flatMap((s:any)=>s.steps||[]).map((s:any)=>({instruction:String(s.instruction||'Continue along the path').slice(0,500),distance:finite(s.distance)?s.distance:0,duration:finite(s.duration)?s.duration:0}));
 return {distance:summary.distance,duration:summary.duration,coordinates:coordinates.map((p:number[])=>[p[0],p[1]]),steps,provider:'openrouteservice / OpenStreetMap contributors'};
}
export function createWalkingService(){
 const cache=new Map<string,{expires:number,route:WalkRoute}>(),pending=new Map<string,Promise<WalkRoute>>();
 let minute=0,count=0,day=0,daily=0;
 return async (body:any,key:string,fetcher:typeof fetch=fetch,at=Date.now())=>{
  const {from,to}=validateWalk(body);
  if(!key?.trim())throw new WalkingError('Walking directions are not configured yet. The site owner needs to enable the walking service.');
  const id=[from.lon,from.lat,to.lon,to.lat].map(n=>n.toFixed(6)).join(',');
  for(const [id,c] of cache)if(c.expires<=at)cache.delete(id);
  const hit=cache.get(id);if(hit)return hit.route;
  const ongoing=pending.get(id);if(ongoing)return ongoing;
  if(minute!==Math.floor(at/60000)){minute=Math.floor(at/60000);count=0}if(day!==Math.floor(at/86400000)){day=Math.floor(at/86400000);daily=0}
  if(count>=30||daily>=1500)throw new WalkingError('Walking request allowance reached. Please try again later.',429);
  count++;daily++;
  const job=(async()=>{
   let r:Response;try{r=await fetcher('https://api.openrouteservice.org/v2/directions/foot-walking/geojson',{method:'POST',headers:{Authorization:key.trim(),'Content-Type':'application/json'},body:JSON.stringify({coordinates:[[from.lon,from.lat],[to.lon,to.lat]],instructions:true,language:'en',units:'m',radiuses:[50,50]}),signal:AbortSignal.timeout(12000)})}catch{throw new WalkingError('Walking service could not be reached. Please retry.')}
   if(r.status===401||r.status===403)throw new WalkingError('The walking key was rejected. Check its Directions V2 access.');
   if(r.status===429)throw new WalkingError('The walking provider request limit was reached. Please try again later.',429);
   if(!r.ok)throw new WalkingError('No pedestrian route was returned for these locations. Try a nearby public path.');
   let route:WalkRoute;try{route=decodeWalk(await r.json())}catch{throw new WalkingError('Walking directions were unavailable or invalid.')}
   if(cache.size>=128)cache.delete(cache.keys().next().value!);cache.set(id,{expires:at+600000,route});return route;
  })();
  pending.set(id,job);try{return await job}finally{pending.delete(id)}
 };
}
