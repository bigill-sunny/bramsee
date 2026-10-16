'use client';
import {useEffect,useRef,useState} from 'react';
import type {WalkPoint,WalkRoute} from '@/lib/walking';
export type WalkPart={label:string,from:WalkPoint,to:WalkPoint,maxDistance?:number,startTime?:number,boardBy?:number,buffer?:number};
export default function WalkingPanel({parts,now,onPaths,onFeasible}:{parts:WalkPart[],now:number,onPaths:(routes:WalkRoute[])=>void,onFeasible:(value:boolean|null)=>void}){
 const [routes,setRoutes]=useState<WalkRoute[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),cache=useRef(new Map<string,WalkRoute>());
 const signature=JSON.stringify(parts.map(p=>[p.from.lat,p.from.lon,p.to.lat,p.to.lon]));
 useEffect(()=>{generation.current++;setRoutes([]);setBusy(false);setError('');onPaths([]);onFeasible(null);return()=>{generation.current++}},[signature]);
 const warnings=routes.flatMap((route,i)=>{const part=parts[i];if(!part)return [];const messages:string[]=[];if(part.maxDistance!==undefined&&route.distance>part.maxDistance)messages.push(part.label+' exceeds your walking limit ('+Math.ceil(route.distance)+' m).');if(part.boardBy!==undefined&&(part.startTime??now/1000)+route.duration+(part.buffer??90)>part.boardBy)messages.push(part.label+': there may not be enough time to catch this bus. Choose another journey.');return messages});
 const feasible=routes.length===parts.length&&routes.length>0?warnings.length===0:null;
 useEffect(()=>{onFeasible(feasible)},[feasible,onFeasible]);
 async function request(){const run=++generation.current;setBusy(true);setError('');setRoutes([]);onPaths([]);onFeasible(null);try{
  const result:WalkRoute[]=[];
  for(const part of parts){
   const key=JSON.stringify([part.from.lat,part.from.lon,part.to.lat,part.to.lon]);let route=cache.current.get(key);
   if(!route){if(part.from.lat===part.to.lat&&part.from.lon===part.to.lon){route={distance:0,duration:0,coordinates:[[part.from.lon,part.from.lat],[part.to.lon,part.to.lat]],steps:[{instruction:'You are at this location.',distance:0,duration:0}],provider:'Bramsee'}}else{const r=await fetch('/api/walk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({from:part.from,to:part.to})});const data:any=await r.json();if(!r.ok)throw Error(data.error||'Walking directions are unavailable.');route=data as WalkRoute}if(cache.current.size>=32)cache.current.clear();cache.current.set(key,route)}
   if(run!==generation.current)return;result.push(route);
  }
  if(run===generation.current){setRoutes(result);onPaths(result)}
 }catch(e){if(run===generation.current)setError(e instanceof Error?e.message:'Walking directions are unavailable.')}finally{if(run===generation.current)setBusy(false)}}
 return <section className="walking-panel card" aria-label="Walking directions"><h2>Every walk, right here</h2><p className="caption">Get pedestrian paths, walking times and steps for this journey. Requesting directions sends these walking endpoints to openrouteservice. Crossings and accessibility still need checking.</p><button className="secondary full" disabled={busy} onClick={request}>{busy?'Finding pedestrian paths…':routes.length?'Refresh walking directions':'Get walking directions'}</button>{error&&<p className="notice" role="status">{error}</p>}{warnings.map(w=><p className="notice" role="status" key={w}>{w}</p>)}{routes.map((route,i)=><details key={i} open={i===0}><summary>{parts[i]?.label} · {Math.ceil(route.duration/60)} min · {Math.round(route.distance)} m</summary><ol>{route.steps.map((step,j)=><li key={j}>{step.instruction}{step.distance>0&&<small> · {Math.round(step.distance)} m</small>}</li>)}</ol></details>)}{routes.length>0&&<><p className="caption">These pedestrian times check the selected journey; other journey cards still use estimates.</p><p className="caption">Directions: <a href="https://openrouteservice.org/" target="_blank" rel="noreferrer">openrouteservice</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></p></>}</section>;
}
