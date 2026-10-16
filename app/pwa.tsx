'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
type InstallEvent=Event&{prompt:()=>Promise<void>,userChoice:Promise<{outcome:string}>};
type State={online:boolean,installed:boolean,install:InstallEvent|null,registration:ServiceWorkerRegistration|null,waiting:boolean,status:string};
const Context=createContext<State>({online:true,installed:false,install:null,registration:null,waiting:false,status:''});
export const usePwa=()=>useContext(Context);
export function PwaProvider({children}:{children:ReactNode}){
 const [online,setOnline]=useState(true),[installed,setInstalled]=useState(false),[install,setInstall]=useState<InstallEvent|null>(null),[registration,setRegistration]=useState<ServiceWorkerRegistration|null>(null),[waiting,setWaiting]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>{
  const connection=()=>setOnline(navigator.onLine),display=window.matchMedia('(display-mode: standalone)'),checkInstalled=()=>setInstalled(display.matches||!!(navigator as Navigator&{standalone?:boolean}).standalone);
  const capture=(e:Event)=>{e.preventDefault();setInstall(e as InstallEvent)},done=()=>{setInstalled(true);setInstall(null)};
  connection();checkInstalled();window.addEventListener('online',connection);window.addEventListener('offline',connection);window.addEventListener('beforeinstallprompt',capture);window.addEventListener('appinstalled',done);display.addEventListener('change',checkInstalled);
  return()=>{window.removeEventListener('online',connection);window.removeEventListener('offline',connection);window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',done);display.removeEventListener('change',checkInstalled)};
 },[]);
 useEffect(()=>{
  if(process.env.NODE_ENV!=='production'){setStatus('Installation and offline support are enabled in the production build.');return}
  if(!('serviceWorker' in navigator)||!window.isSecureContext){setStatus('Open Bramsee over HTTPS to enable app installation and offline support.');return}
  let cancelled=false,reg:ServiceWorkerRegistration|undefined;
  const inspect=()=>{if(!cancelled&&reg)setWaiting(!!reg.waiting)};
  const update=()=>{const worker=reg?.installing;if(worker)worker.addEventListener('statechange',inspect)};
  navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(r=>{reg=r;if(cancelled)return;setRegistration(r);inspect();r.addEventListener('updatefound',update);return navigator.serviceWorker.ready}).then(ready=>{if(ready&&!cancelled)setStatus('Offline connection screen ready. Live departures still require internet.')}).catch(()=>{if(!cancelled)setStatus('Offline support could not start. Online journey planning is still available.')});
  return()=>{cancelled=true;reg?.removeEventListener('updatefound',update)};
 },[]);
 return <Context.Provider value={{online,installed,install,registration,waiting,status}}>{children}</Context.Provider>;
}
export function ConnectionNotice(){const {online}=usePwa();return online?null:<div className="notice" role="alert">You’re offline. Live arrivals and journey-sharing updates are unavailable. Displayed times may be out of date.</div>}
export function InstallApp({journeyActive}:{journeyActive:boolean}){
 const pwa=usePwa(),[message,setMessage]=useState(''),[installing,setInstalling]=useState(false),reloading=useRef(false);
 useEffect(()=>{if(!('serviceWorker' in navigator))return;const reload=()=>{if(reloading.current)window.location.reload()};navigator.serviceWorker.addEventListener('controllerchange',reload);return()=>navigator.serviceWorker.removeEventListener('controllerchange',reload)},[]);
 async function install(){if(!pwa.install)return;setInstalling(true);try{await pwa.install.prompt();const result=await pwa.install.userChoice;setMessage(result.outcome==='accepted'?'Installation requested.':'You can install later from your browser menu.')}catch{setMessage('Use your browser menu to install Bramsee.')}finally{setInstalling(false)}}
 return <section className="profile-section" aria-labelledby="install-title"><h3 id="install-title">Bramsee on your phone</h3>{pwa.installed?<p className="caption">You’re using Bramsee as an app.</p>:pwa.install?<button className="secondary full" disabled={installing} onClick={install}>{installing?'Opening installation…':'Install Bramsee'}</button>:<p className="caption">On iPhone: open Bramsee in Safari, tap Share, then Add to Home Screen. On Android: use your browser menu and choose Install app or Add to Home screen. Availability depends on your browser.</p>}<p className="caption" role="status">{pwa.status}</p>{pwa.waiting&&<><p className="caption">An app update is ready. {journeyActive?'Finish your trip and stop sharing before updating.':'Reloading will reset your current search.'}</p><button className="secondary full" disabled={journeyActive} onClick={()=>{const worker=pwa.registration?.waiting;if(worker){reloading.current=true;worker.postMessage({type:'ACTIVATE_UPDATE'})}else setMessage('Update is no longer waiting. Reopen the app to check again.')}}>Update and reload</button></>}{message&&<p className="caption" role="status">{message}</p>}<p className="caption">Keep the app open for location and sharing updates. Installing does not enable background GPS.</p></section>;
}
