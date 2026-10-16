import type {WalkPoint,WalkRoute} from './walking';
const cache=new Map<string,{at:number,route:WalkRoute}>(),pending=new Map<string,Promise<WalkRoute>>();
export async function pedestrianRoute(from:WalkPoint,to:WalkPoint):Promise<WalkRoute>{
 const key=JSON.stringify([from.lat,from.lon,to.lat,to.lon]),cached=cache.get(key);if(cached&&Date.now()-cached.at<600000)return cached.route;if(pending.has(key))return pending.get(key)!;
 if(from.lat===to.lat&&from.lon===to.lon)return {distance:0,duration:0,coordinates:[[from.lon,from.lat],[to.lon,to.lat]],steps:[],provider:'Bramsee'};
 const request=(async()=>{const r=await fetch('/api/walk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({from,to})});const data:any=await r.json();if(!r.ok)throw Error(data.error||'Walking directions unavailable. Please retry.');if(cache.size>=128)cache.clear();cache.set(key,{at:Date.now(),route:data});return data as WalkRoute})();pending.set(key,request);try{return await request}finally{pending.delete(key)}
}
