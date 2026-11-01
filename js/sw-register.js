(function(){
  if(!('serviceWorker' in navigator)) return;
  if(location.protocol!=='https:' && location.hostname!=='localhost' && location.hostname!=='127.0.0.1') return;
  window.addEventListener('load', function(){
    navigator.serviceWorker.getRegistrations().then(function(regs){
      return Promise.all(regs.map(function(r){ return r.unregister(); }));
    }).then(function(){
      return caches.keys();
    }).then(function(keys){
      return Promise.all(keys.map(function(k){ return caches.delete(k); }));
    }).then(function(){
      navigator.serviceWorker.register('/sw.js', {updateViaCache:'none'}).catch(function(e){
        console.info('Service worker not registered (app still works):', e && e.message);
      });
    });
  });
})();
