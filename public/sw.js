const CACHE = 'forma-offline-v2'
const OFFLINE = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('forma-offline-') && key !== CACHE).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()))
})

// Never cache account pages, API responses, or authentication data.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return
  if (new URL(event.request.url).origin !== self.location.origin) return
  event.respondWith(fetch(event.request).catch(async () =>
    (await caches.match(OFFLINE)) || new Response('Connection unavailable', { status: 503 })
  ))
})

self.addEventListener('push',event=>{let data={};try{data=event.data?.json()||{}}catch{}event.waitUntil(self.registration.showNotification(data.title||'Forma',{body:data.body||'Час перевірити сімейні фінанси.',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',tag:data.tag||'forma-import',data:{url:'/transactions/import'}}))})
self.addEventListener('notificationclick',event=>{event.notification.close();const target=new URL('/transactions/import',self.location.origin).href;event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{for(const client of clients){if(new URL(client.url).origin===self.location.origin){await client.navigate(target);return client.focus()}}return self.clients.openWindow(target)}))})