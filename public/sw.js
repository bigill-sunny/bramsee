/* Keep live feeds, locations, accounts, shared journeys and app HTML off disk. */
const CACHE='bramsee-static-v2';
const OFFLINE='/offline.html';
const STATIC=[OFFLINE,'/favicon.svg','/brand/icon-192.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 for(const url of STATIC){const response=await fetch(url,{cache:'reload'});if(!response.ok)throw Error('Offline asset unavailable');
  // Hosts may redirect offline.html to /offline. Remove redirect metadata so
  // a cached response can safely satisfy a later document navigation.
  await cache.put(url,new Response(await response.arrayBuffer(),{status:response.status,statusText:response.statusText,headers:response.headers}));
 }
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('bramsee-static-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
// Update only when the user chooses to reload; do not interrupt an active trip.
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'&&url.pathname==='/'){
  event.respondWith(fetch(request).catch(async()=>await caches.match(OFFLINE)||new Response('Bramsee is offline. Reconnect to check departures.',{status:503,headers:{'Content-Type':'text/plain'}})));return;
 }
 if(!STATIC.includes(url.pathname)||url.search)return;
 event.respondWith(fetch(request).catch(async()=>await caches.match(url.pathname)||Response.error()));
});
