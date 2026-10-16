'use client';
import {useEffect,useRef,useState} from 'react';
import type {WalkRoute} from '@/lib/walking';
import type {Point,Stop,Option} from '@/lib/planner';
declare global{interface Window{L:any}}
type Props={locationLabel?:string,sheetMode:string,walkingPaths:WalkRoute[],stops:Stop[],selected:Stop|null,location:Point|null,origin:Point|null,destination:Point|null,accuracy?:number,locationFresh:boolean,follow:boolean,viewRevision:number,onDrag:()=>void,vehicles:any[],route:Option|null,onStop:(s:Stop)=>void,onPin:(p:Point)=>void,pinMode:string|null};
export default function TransitMap({locationLabel,sheetMode,walkingPaths,stops,selected,location,origin,destination,accuracy,locationFresh,follow,viewRevision,onDrag,vehicles,route,onStop,onPin,pinMode}:Props){
 const el=useRef<HTMLDivElement>(null),map=useRef<any>(null),transit=useRef<any>(null),walk=useRef<any>(null),position=useRef<any>(null);
 const [ready,setReady]=useState(false);
 const callbacks=useRef({onStop,onPin,pinMode,onDrag});callbacks.current={onStop,onPin,pinMode,onDrag};
 useEffect(()=>{
  let cancelled=false,resize:ResizeObserver|undefined;
  function init(){
   if(cancelled||!el.current||map.current)return;
   const L=window.L,m=L.map(el.current,{zoomControl:false}).setView([43.685,-79.761],13);map.current=m;
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(m);
   m.createPane('walking-paths');m.getPane('walking-paths').style.zIndex='450';
   m.createPane('gps-position');m.getPane('gps-position').style.zIndex='650';
   L.control.zoom({position:'bottomright'}).addTo(m);
   transit.current=L.layerGroup().addTo(m);walk.current=L.layerGroup().addTo(m);position.current=L.layerGroup().addTo(m);
   m.on('click',(e:any)=>{if(callbacks.current.pinMode)callbacks.current.onPin({name:'Pinned location',lat:e.latlng.lat,lon:e.latlng.lng})});
   m.on('dragstart',()=>callbacks.current.onDrag());
   resize=new ResizeObserver(()=>m.invalidateSize({pan:false}));resize.observe(el.current);setReady(true);
  }
  if(window.L)init();else{
   if(!document.querySelector('link[href="/vendor/leaflet.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/vendor/leaflet.css';document.head.appendChild(css)}
   const script=document.createElement('script');script.src='/vendor/leaflet.js';script.onload=init;document.head.appendChild(script);
  }
  return()=>{cancelled=true;resize?.disconnect();map.current?.remove();map.current=null};
 },[]);
 useEffect(()=>{
  if(!ready||!map.current)return;const L=window.L;transit.current.clearLayers();
  const visible=Array.from(new Map([...stops.slice(0,60),...(selected?[selected]:[]),...(route?route.legs.flatMap(l=>[l.from,l.to]):[])].map(s=>[s.id,s])).values());
  for(const s of visible)L.circleMarker([s.lat,s.lon],{radius:s.id===selected?.id?9:5,color:'#fff',weight:3,fillColor:s.id===selected?.id?'#183e36':'#477b65',fillOpacity:1}).addTo(transit.current).on('click',()=>callbacks.current.onStop(s));
  for(const v of vehicles.filter(v=>v.lat&&v.lon))L.marker([v.lat,v.lon],{icon:L.divIcon({className:'vehicle-marker',html:'<span>▰</span>',iconSize:[30,30]}),title:'Bus '+v.route,keyboard:false}).addTo(transit.current);
  for(const leg of route?.legs||[])L.polyline([[leg.from.lat,leg.from.lon],[leg.to.lat,leg.to.lon]],{color:'#316e58',weight:4,dashArray:'7 9',opacity:.65}).addTo(transit.current);
 },[ready,stops,selected,vehicles,route]);
 useEffect(()=>{
  if(!ready||!map.current)return;const L=window.L;walk.current.clearLayers();
  for(const path of walkingPaths){const points=path.coordinates.map(([lon,lat])=>[lat,lon]);
   L.polyline(points,{pane:'walking-paths',color:'#fff',weight:9,opacity:.95,interactive:false}).addTo(walk.current);
   L.polyline(points,{pane:'walking-paths',color:'#2468b2',weight:5,opacity:1}).addTo(walk.current);
   for(const point of [points[0],points.at(-1)])if(point)L.circleMarker(point,{pane:'walking-paths',radius:5,color:'#2468b2',weight:2,fillColor:'#fff',fillOpacity:1}).addTo(walk.current);
  }
  for(const [point,label,kind] of [[origin,'A','origin'],[destination,'B','destination']] as const)if(point)L.marker([point.lat,point.lon],{icon:L.divIcon({className:'journey-pin '+kind,html:'<span>'+label+'</span>',iconSize:[26,26],iconAnchor:[13,13]}),title:kind==='origin'?'Journey start':'Destination'}).addTo(walk.current);
 },[ready,walkingPaths,origin?.lat,origin?.lon,destination?.lat,destination?.lon]);
 useEffect(()=>{
  if(!ready||!map.current)return;position.current.clearLayers();if(!location)return;const L=window.L,color=locationFresh?'#2468b2':'#858b8a';
  if(accuracy!==undefined)L.circle([location.lat,location.lon],{pane:'gps-position',radius:Math.min(accuracy,1000),color,weight:1,fillColor:color,fillOpacity:.10,interactive:false}).addTo(position.current);
  L.circleMarker([location.lat,location.lon],{pane:'gps-position',radius:8,color:'#fff',weight:3,fillColor:color,fillOpacity:1}).bindTooltip(locationFresh?(locationLabel||'Your GPS position'):'Last known position').addTo(position.current);
 },[ready,location?.lat,location?.lon,accuracy,locationFresh,locationLabel]);
 const bottomInset=()=>{if(!el.current||window.innerWidth>760)return 0;const panel=document.querySelector('.panel');return panel?Math.max(0,el.current.getBoundingClientRect().bottom-panel.getBoundingClientRect().top):0};
 useEffect(()=>{
  if(!ready||!map.current||follow)return;const m=map.current;
  const points=walkingPaths.length?walkingPaths.flatMap(p=>p.coordinates.map(([lon,lat])=>[lat,lon])):route?route.legs.flatMap(l=>[[l.from.lat,l.from.lon],[l.to.lat,l.to.lon]]):[];
  m.stop();m.invalidateSize({pan:false});
  if(points.length&&m.getSize().y-bottomInset()>90)m.fitBounds(points,{paddingTopLeft:[35,35],paddingBottomRight:[35,bottomInset()+25],maxZoom:17,animate:false});
  else{const point=selected||origin||location;if(point)m.setView([point.lat,point.lon],15,{animate:false})}
 },[ready,walkingPaths,route?.id,origin?.lat,origin?.lon,selected?.id,viewRevision,sheetMode]);
 useEffect(()=>{if(ready&&map.current&&follow&&location&&map.current.getSize().y-bottomInset()>90){map.current.stop();map.current.fitBounds([[location.lat,location.lon],[location.lat,location.lon]],{paddingTopLeft:[30,30],paddingBottomRight:[30,bottomInset()+30],maxZoom:17,animate:false})}},[ready,follow,location?.lat,location?.lon,viewRevision,sheetMode]);
 return <div ref={el} className={'map-canvas '+(pinMode?'pinning':'')} aria-label="Interactive map of Brampton bus stops"/>;
}
