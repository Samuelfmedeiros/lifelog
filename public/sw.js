const CACHE = 'lifelog-v2'
const STATIC_CACHE = 'lifelog-static-v2'

// Assets pré-cacheados na instalação — tudo que é estático e muda pouco
const PRECACHE = [
  '/',
  '/en/',
  '/manifest.json',
  '/favicon.svg',
]

// Cache-First: arquivos estáticos (nunca mudam sem novo deploy)
// Network-First: páginas HTML (posts podem ser lidos offline depois)
self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      // Assets estáticos principais — o build do Astro gera com hash
      // mas não temos como listar todos aqui; cacheamos na navegação
      return cache.addAll(PRECACHE).catch(() => {
        // Falha em um asset não impede o resto
        console.warn('[SW] Precache partial failure')
      })
    })
  )
})

self.addEventListener('activate', event => {
  // Limpa caches antigos
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      )
    })
  )
  // Controla todas as abas abertas imediatamente
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Só intercepta requests do próprio origin
  if (url.origin !== self.location.origin) return

  const isPage = request.mode === 'navigate'
  const isAsset = !isPage && (
    url.pathname.match(/\.(css|js|mjs|woff2?|ttf|svg|png|webp|jpg|ico)$/) ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/covers/') ||
    url.pathname.startsWith('/patterns/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.svg'
  )

  if (isAsset) {
    // Cache-First: assets estáticos
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone))
          }
          return response
        })
      })
    )
  } else if (isPage) {
    // Network-First: páginas HTML (se falhar, tenta cache)
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, clone))
        }
        return response
      }).catch(() => {
        // Offline: tenta cache, senão mostra fallback
        return caches.match(request).then(cached => {
          if (cached) return cached
          return caches.match('/')  // fallback pra home
        })
      })
    )
  }
  // XML/Sitemap/etc: pass-through (não cacheia)
})