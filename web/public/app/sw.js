// Lets the client app open without a connection, as in a gym with no signal. The page itself
// always comes from the network when there is one, so a new version shows on the next open; the
// scripts, styles and fonts it names never change once built, so they come from the cache.

const CACHE = 'workout-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

async function fromNetwork(request, key) {
  const response = await fetch(request)
  // An opaque response is a font or stylesheet from another site, which can't be inspected.
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(CACHE)
    await cache.put(key, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  const ours = url.origin === self.location.origin && !url.pathname.startsWith('/api/')
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
  // Everything else, such as Google's sign-in script, is left to the browser.
  if (request.method !== 'GET' || !(ours || fonts)) return
  if (request.mode === 'navigate') {
    // Every screen is the same page.
    event.respondWith(fromNetwork(request, '/app/').catch(() => caches.match('/app/')))
  } else {
    event.respondWith(caches.match(request).then((cached) => cached ?? fromNetwork(request, request)))
  }
})
