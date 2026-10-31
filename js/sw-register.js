/* Service worker registration. Deliberately fire-and-forget and wrapped in every guard
   that matters: unsupported browser, file:// (workers need https or localhost), or a
   registration error all fall through silently to the normal, fully-functional app.
   The app must never depend on the worker — it is an enhancement, not a requirement. */
(function(){
  if(!('serviceWorker' in navigator)) return;
  if(location.protocol!=='https:' && location.hostname!=='localhost' && location.hostname!=='127.0.0.1') return;
  window.addEventListener('load', function(){
    if('serviceWorker' in navigator){
      // Unregister all old service workers and clear all caches first (v184 rebrand)
      navigator.serviceWorker.getRegistrations().then(function(regs){
        regs.forEach(function(reg){ reg.unregister(); });
      });
      caches.keys().then(function(keys){
        keys.forEach(function(key){ caches.delete(key); });
      });
      // Re-register fresh
      navigator.serviceWorker.register('sw.js').catch(function(e){
        console.info('Service worker not registered (app still works):', e && e.message);
      });
    }
  });
})();
