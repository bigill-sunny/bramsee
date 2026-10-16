export type LocationFix={lat:number,lon:number,accuracy:number,updated:number};
export function positionFix(position:GeolocationPosition):LocationFix{
 const {latitude:lat,longitude:lon,accuracy}=position.coords;
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||!Number.isFinite(accuracy)||accuracy<0||!Number.isFinite(position.timestamp))throw Error('Your device returned an invalid location.');
 return {lat,lon,accuracy,updated:position.timestamp};
}
export function locationStatus(fix:LocationFix|null,enabled:boolean,now=Date.now()){
 const age=fix?Math.max(0,Math.floor((now-fix.updated)/1000)):null;
 return {age,fresh:!!(enabled&&fix&&age!==null&&age<=30),label:!enabled?'Location tracking off':!fix?'Waiting for your location':age!==null&&age>30?'Location updates paused · last known position':'Live location · accuracy about '+Math.round(fix.accuracy)+' m'};
}
export function watchLocation(geo:Pick<Geolocation,'watchPosition'|'clearWatch'>,onFix:(fix:LocationFix)=>void,onError:(message:string,denied:boolean)=>void){
 let stopped=false;
 let id:number;
 try{id=geo.watchPosition(p=>{if(stopped)return;try{onFix(positionFix(p))}catch{onError('Your device returned an invalid location.',false)}},e=>{if(!stopped)onError(e.code===1?'Location permission was denied. Allow location access in your browser to follow your journey.':'Location updates paused. Your last known position is shown.',e.code===1)},{enableHighAccuracy:true,maximumAge:5000,timeout:20000})}catch{onError('Location access is blocked by this browser. Use a secure page and allow location access.',true);return()=>{stopped=true}}
 return ()=>{if(!stopped){stopped=true;geo.clearWatch(id)}};
}
