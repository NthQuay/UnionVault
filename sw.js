const CACHE = 'union-vault-v510.0';
const SHELL = [
  '/', '/index.html',
  '/css/fonts.css', '/css/app.css', '/css/landing.css', '/css/setup-wizard.css',
  '/js/wallpaper.js', '/js/state.js', '/js/utils.js', '/js/navigation.js',
  '/js/dashboard.js', '/js/details.js', '/js/guests.js', '/js/timeline.js',
  '/js/send-sheet.js', '/js/colorpicker.js', '/js/rsvp.js', '/js/checklist.js', '/js/vendors.js',
  '/js/budget.js', '/js/seating.js', '/js/supabase.js', '/js/subscription.js', '/js/autocomplete.js',
  '/js/floorplan.js', '/js/inspiration.js', '/js/visionboard.js',
  '/js/wishingwell.js', '/js/website.js', '/js/comms.js', '/js/sent-log.js', '/js/invitations.js', '/js/events.js',
  '/js/settings.js', '/js/import.js', '/js/attachments.js', '/js/export.js',
  '/js/tags.js', '/js/undo.js', '/js/payments.js', '/js/auth.js',
  '/js/storage.js', '/js/media.js', '/js/welcome.js', '/js/dots.js',
  '/js/init.js', '/js/logos.js', '/js/sw-register.js', '/js/landing.js'
];

self.addEventListener('install', e => {
  // Fetch every shell file with {cache:'reload'} instead of a plain c.addAll(SHELL) —
  // addAll's underlying fetches use the browser's normal HTTP cache, which can silently
  // hand back an already-stale copy of a JS file even though this install is building a
  // brand new, differently-named cache. That defeats the entire point of bumping CACHE on
  // every deploy: the "new" cache ends up holding the same old files. {cache:'reload'}
  // forces each request straight to the network, bypassing HTTP cache, so what lands in
  // the new cache is always genuinely current.
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.all(SHELL.map(url =>
      fetch(url, { cache: 'reload' }).then(resp => { if (resp.ok) return c.put(url, resp); })
    ))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.cache === 'reload') {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp.ok) caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        return resp;
      })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
