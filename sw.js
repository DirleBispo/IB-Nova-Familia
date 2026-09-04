const CACHE='ibnf-v21';
const ASSETS=[
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './members-admin.css',
  './members-admin.js',
  './cadastro-permissoes.css',
  './cadastro-acesso.js',
  './admin-permissoes.js',
  './birthdays.css',
  './birthday-share.css',
  './birthdays.js',
  './push-notifications.js',
  './community-data.css',
  './community-data.js',
  './avisos-admin.css',
  './avisos-admin.js',
  './agenda-admin.css',
  './agenda-admin.js',
  './estudos-admin.css',
  './estudos-admin.js',
  './departamentos-admin.css',
  './departamentos-admin.js',
  './app-history.js',
  './pastoral-dashboard.css',
  './pastoral-dashboard.js',
  './access-control.js',
  './pastoral-home.css',
  './pastoral-home.js',
  './financeiro.css',
  './financeiro.js',
  './acolhimento.css',
  './acolhimento.js',
  './navigation-behavior.js',
  './menu-functional.css',
  './menu-functional.js',
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

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?.json()||{}}catch(_){data={title:'IB Nova Família',body:event.data?.text()||'Você tem uma nova notificação.'}}
  event.waitUntil(self.registration.showNotification(data.title||'IB Nova Família',{
    body:data.body||'Você tem uma nova notificação.',
    icon:'./photo_5143638454599093943_y.jpg',
    badge:'./photo_5143638454599093943_y.jpg',
    tag:data.tag||'ibnf-notificacao',
    data:{url:data.url||'./'},
    vibrate:[200,100,200]
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'./',self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(client=>client.url.startsWith(self.location.origin));
    if(existing){await existing.focus();if('navigate'in existing)await existing.navigate(target);return}
    await self.clients.openWindow(target);
  })());
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
      if(fresh.ok||fresh.type==='opaque'){
        const cache=await caches.open(CACHE);
        cache.put(event.request,fresh.clone());
      }
      return fresh;
    }catch(error){
      const cached=await caches.match(event.request);
      if(cached)return cached;
      if(event.request.mode==='navigate')return caches.match('./index.html');
      return Response.error();
    }
  })());
});
