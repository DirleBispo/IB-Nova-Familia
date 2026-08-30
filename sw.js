const CACHE='ibnf-v5';
const ASSETS=[
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './members-admin.css',
  './birthdays.css',
  './community-data.css',
  './pastoral-dashboard.css',
  './financeiro.css',
  './financeiro.js',
  './home-organizada.css',
  './home-organizada.js',
  './campaign.css',
  './oracao.html',
  './oracao.css',
  './oracao.js',
  './config.js',
  './photo_5143638454599093943_y.jpg'
];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith((async()=>{
    try{
      const fresh=await fetch(event.request);
      const cache=await caches.open(CACHE);
      cache.put(event.request,fresh.clone());
      return fresh;
    }catch(error){
      return (await caches.match(event.request)) || (await caches.match('./index.html'));
    }
  })());
});
