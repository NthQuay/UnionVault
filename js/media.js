// MEDIA STORE (IndexedDB) — v114
// ══════════════════════════════════════════════
/* WHY THIS EXISTS
   localStorage caps at ~5MB. One raw phone photo is ~5.3MB as base64. The
   planner was never going to hold 20-200 receipts. IndexedDB gives hundreds
   of MB on the same device, no server, and takes PDFs at full size.

   THE ASYNC PROBLEM, AND THE FIX
   IndexedDB reads return Promises. Every image render site in this app builds
   an HTML string: `<img src="${item.image}">`. You cannot await inside a
   template literal. So instead of making 10 render sites async, we read every
   blob ONCE at boot, createObjectURL each, and hold a synchronous id->blob:
   map. Render sites change from `item.image` to `_mediaUrl(item.image)` — a
   one-line, synchronous swap. All async is confined to boot and save. */

const MEDIA_DB   = 'uv_media';
// One-time IDB migration: copy blobs from ea_media → uv_media then delete old DB
(function(){
  try{
    const probe=indexedDB.open('ea_media',1);
    probe.onsuccess=function(e){
      const old=e.target.result;
      const tx=old.transaction('files','readonly');
      const req=tx.objectStore('files').getAll();
      req.onsuccess=function(ev){
        const rows=ev.target.result||[];
        old.close();
        if(!rows.length){ indexedDB.deleteDatabase('ea_media'); return; }
        const newReq=indexedDB.open('uv_media',1);
        newReq.onupgradeneeded=function(ev2){
          const db2=ev2.target.result;
          if(!db2.objectStoreNames.contains('files')) db2.createObjectStore('files',{keyPath:'id'});
        };
        newReq.onsuccess=function(ev2){
          const db2=ev2.target.result;
          const tx2=db2.transaction('files','readwrite');
          rows.forEach(r=>tx2.objectStore('files').put(r));
          tx2.oncomplete=function(){ db2.close(); indexedDB.deleteDatabase('ea_media'); };
        };
      };
      probe.onerror=function(){};
    };
    probe.onupgradeneeded=function(e){ e.target.transaction.abort(); };
  }catch(_){}
})();
const MEDIA_STORE= 'files';
let   _mediaDB   = null;
const MEDIA      = {};      /* id -> blob: URL  (the synchronous cache) */
const MEDIA_META = {};      /* id -> {size,type,name} for the storage meter */

function _mediaOpen(){
  if(_mediaDB) return Promise.resolve(_mediaDB);
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(MEDIA_DB, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE, {keyPath:'id'});
    };
    req.onsuccess = e => { _mediaDB = e.target.result; resolve(_mediaDB); };
    req.onerror   = e => reject(e.target.error);
  });
}

/* dataURL -> Blob. Used at write time and during migration. */
function _dataUrlToBlob(dataUrl){
  const parts = String(dataUrl).split(',');
  const mime  = (parts[0].match(/:(.*?);/)||[])[1] || 'application/octet-stream';
  const bin   = atob(parts[1]||'');
  const arr   = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
  return new Blob([arr], {type:mime});
}

/* WRITE. Returns the id to store in STATE. STATE never holds bytes again. */
/* ── WHERE MEDIA LIVES. ONE description, not three. ────────────────────────
   Export, import and the v114 migration each used to hand-enumerate the
   structures that hold media refs. THREE lists that had to agree — and they
   drifted: `website` was added to the app in v125 and to NONE of them, so
   every website image exported as a bare id with no bytes, and imported as an
   id pointing at a blob that was never stored. Silently. Into the one code
   path a user reaches for AFTER losing their data.

   So the walk is derived, once, here. A new feature that stores an image in
   any of the field shapes below is carried by all three callers for free —
   nobody has to remember to update a list.

   Field shapes, and they are the only ones:
     image / mediaId / dataUrl / poster  -> a single ref on an object
     ids[]                               -> an array of refs

   `mode` is what we're hunting:
     'id'   -> refs that are media IDS   (export: swap id -> bytes)
     'data' -> refs that are data: URLs  (import + migration: bytes -> id)

   Returns {get,set,name,type} handles — the shape all three callers already
   consumed, so they collapse to one line each. */
const _MEDIA_SINGLE = ['image','mediaId','dataUrl','poster'];

function _mediaIsId(v){
  return typeof v==='string' && !!v && !/^(https?:|data:|blob:)/.test(v);
}
function _mediaIsData(v){
  return typeof v==='string' && v.startsWith('data:');
}

function _mediaRefs(root, mode){
  const want = (mode==='data') ? _mediaIsData : _mediaIsId;
  const out  = [];
  const seen = new Set();

  /* Tag the legacy image slots by their KNOWN PATH, so the generic walk can
     recognise them without guessing at every `ids[]` it meets. */
  const legacy = (root && root.website && root.website.images) || null;
  if(legacy && typeof legacy==='object'){
    Object.keys(legacy).forEach(k=>{
      const sec = legacy[k];
      if(!sec || typeof sec!=='object') return;
      ['top','bottom'].forEach(sl=>{
        if(sec[sl] && Array.isArray(sec[sl].ids)) sec[sl].__legacyImgSlot = true;
      });
    });
  }

  (function walk(node){
    if(!node || typeof node!=='object') return;
    if(seen.has(node)) return;          /* cycles, and shared objects, once only */
    seen.add(node);

    if(Array.isArray(node)){ node.forEach(walk); return; }

    /* A hint for the file name/type, if this object carries one. */
    const nm = node.name || node.title || node.label || '';
    const ty = node.type || '';

    _MEDIA_SINGLE.forEach(f=>{
      if(want(node[f])){
        out.push({
          get : ()=>node[f],
          set : v=>{
            /* dataUrl and mediaId are the SAME slot in two shapes: a stored
               file is {mediaId}, an in-flight/exported one is {dataUrl}. So
               writing one must clear the other, or a payload carries both and
               the next reader picks whichever it happens to look at first. */
            if(f==='dataUrl'){ node.mediaId = v; node.dataUrl = ''; }
            else if(f==='mediaId' && mode==='id'){ node.dataUrl = v; delete node.mediaId; }
            else { node[f] = v; }
          },
          name: nm, type: ty
        });
      }
    });

    /* `ids[]` IS AMBIGUOUS IN THIS APP. Website image blocks use it for media
       ids — but guest groups, seating slots and invite slots use it for GUEST
       ids, and there are ~50 such sites. A walker that treated every `ids[]`
       as media would ask the store for guest "g1", get nothing, and report it
       as a LOST IMAGE. False alarms in the one dialog that must be trusted.

       So an `ids[]` is media only where it is DECLARED to be: on a website
       image block, which carries type:'img'. Nothing else in STATE does. */
    if(Array.isArray(node.ids) && node.type==='img'){
      node.ids.forEach((v,i)=>{
        if(want(v)) out.push({
          get : ()=>node.ids[i],
          set : nv=>{ node.ids[i] = nv; },
          name: nm, type: ty
        });
      });
    }

    /* The LEGACY website.images[key] = {top:{ids:[]}, bottom:{ids:[]}} shape.
       Kept as the downgrade path, so it must still round-trip. It has no
       type:'img' marker, so it is named explicitly rather than guessed. */
    if(node.__legacyImgSlot && Array.isArray(node.ids)){
      node.ids.forEach((v,i)=>{
        if(want(v)) out.push({
          get : ()=>node.ids[i],
          set : nv=>{ node.ids[i] = nv; },
          name: nm, type: ty
        });
      });
    }

    Object.keys(node).forEach(k=>{
      if(k==='ids') return;                       /* handled above */
      if(_MEDIA_SINGLE.indexOf(k)>=0) return;     /* a ref, not a container */
      walk(node[k]);
    });
  })(root);

  return out;
}

async function _mediaPut(dataUrl, name, type){
  const db   = await _mediaOpen();
  const blob = _dataUrlToBlob(dataUrl);
  const id   = 'm'+Date.now()+Math.floor(Math.random()*100000);
  await new Promise((resolve,reject)=>{
    const tx = db.transaction(MEDIA_STORE,'readwrite');
    tx.objectStore(MEDIA_STORE).put({ id, blob, name:name||'', type:type||blob.type, size:blob.size, addedAt:new Date().toISOString() });
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
  MEDIA[id]      = URL.createObjectURL(blob);
  MEDIA_META[id] = { size:blob.size, type:type||blob.type, name:name||'' };
  // Stage 4: upload to Supabase Storage in background (non-blocking)
  if(_sbSession) _sbPhotoUpload(id, blob).then(ok=>{ if(ok) _MEDIA_UPLOADED.add(id); }).catch(e=>console.warn('Photo upload failed',id,e));
  return id;
}

async function _mediaDelete(id){
  if(!id) return;
  try{
    const db = await _mediaOpen();
    await new Promise((resolve,reject)=>{
      const tx = db.transaction(MEDIA_STORE,'readwrite');
      tx.objectStore(MEDIA_STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  }catch(_){}
  if(MEDIA[id]) URL.revokeObjectURL(MEDIA[id]);
  delete MEDIA[id]; delete MEDIA_META[id];
  delete _sbSignedCache[id];
  // Stage 4: delete from Supabase Storage in background
  if(_sbSession) _sbPhotoDelete(id).catch(e=>console.warn('Photo delete failed',id,e));
}

/* BOOT: read every blob, mint a blob: URL for each. After this, all reads
   are synchronous. This is the single await the whole app depends on. */
async function _mediaLoadAll(){
  const db = await _mediaOpen();
  const rows = await new Promise((resolve,reject)=>{
    const tx  = db.transaction(MEDIA_STORE,'readonly');
    const req = tx.objectStore(MEDIA_STORE).getAll();
    req.onsuccess = e => resolve(e.target.result||[]);
    req.onerror   = e => reject(e.target.error);
  });
  rows.forEach(r=>{
    if(!r || !r.blob) return;
    MEDIA[r.id]      = URL.createObjectURL(r.blob);
    MEDIA_META[r.id] = { size:r.size||r.blob.size||0, type:r.type||'', name:r.name||'' };
  });
  return rows.length;
}

/* THE SYNCHRONOUS READ. Every render site calls this.
   - http(s) URL  -> passed straight through (inspo items can hold a web URL)
   - media id     -> blob: URL from the cache
   - missing      -> '' , and the caller shows the "not saved" state
   A leftover data: URL (pre-migration, or a migration that failed) also
   passes through, so nothing breaks if a record was somehow missed. */
function _mediaUrl(ref){
  if(!ref) return '';
  const s = String(ref);
  if(s.startsWith('http://')||s.startsWith('https://')||s.startsWith('data:')||s.startsWith('blob:')) return s;
  if(MEDIA[s]) return MEDIA[s];
  // Stage 4: if blob isn't local, return cached signed URL if available
  // (async fetch is triggered separately by _mediaCloudSync after cloud load)
  const cached = _sbSignedCache[s];
  if(cached && cached.expires - Date.now() > 0) return cached.url;
  // Public wedding website context: use the public storage URL.
  // Requires the 'photos' Supabase bucket to have public access enabled.
  if(_wbPublicOwnerUid){
    return `${_SB_URL}/storage/v1/object/public/${_SB_BUCKET}/${_wbPublicOwnerUid}/${s}`;
  }
  return '';
}

// ── SUPABASE STORAGE HELPERS (Stage 4) ──────────────────────────────────────
const _SB_BUCKET = 'photos';
// Signed URL cache: id → { url, expires }
const _sbSignedCache = {};
// Media IDs confirmed uploaded to Storage this session
const _MEDIA_UPLOADED = new Set();
// Guard so _mediaEnsureUploaded() only does the bulk re-check once per session
let _mediaEnsureRan = false;

async function _sbPhotoUpload(id, blob){
  if(!_sbSession) return false;
  const uid = _sbSession.user.id;
  const path = `${uid}/${id}`;
  const r = await fetch(
    `${_SB_URL}/storage/v1/object/${_SB_BUCKET}/${path}`,
    { method:'POST',
      headers:{ 'apikey':_SB_KEY, 'Authorization':'Bearer '+_sbSession.access_token,
                'Content-Type': blob.type||'application/octet-stream',
                'x-upsert':'true' },
      body: blob }
  );
  return r.ok;
}

async function _sbPhotoSignedUrl(id){
  if(!_sbSession) return null;
  // Return cached URL if still valid (>5 min remaining)
  const cached = _sbSignedCache[id];
  if(cached && cached.expires - Date.now() > 300000) return cached.url;
  const uid = _sbSession.user.id;
  const path = `${uid}/${id}`;
  const r = await fetch(
    `${_SB_URL}/storage/v1/object/sign/${_SB_BUCKET}/${path}`,
    { method:'POST',
      headers:{ 'apikey':_SB_KEY, 'Authorization':'Bearer '+_sbSession.access_token,
                'Content-Type':'application/json' },
      body: JSON.stringify({ expiresIn: 3600 }) }
  );
  if(!r.ok) return null;
  const j = await r.json();
  const url = j.signedURL ? `${_SB_URL}/storage/v1${j.signedURL}` : (j.signedUrl||null);
  if(url) _sbSignedCache[id] = { url, expires: Date.now() + 3600000 };
  return url;
}

async function _sbPhotoDelete(id){
  if(!_sbSession) return;
  const uid = _sbSession.user.id;
  await fetch(
    `${_SB_URL}/storage/v1/object/${_SB_BUCKET}`,
    { method:'DELETE',
      headers:{ 'apikey':_SB_KEY, 'Authorization':'Bearer '+_sbSession.access_token,
                'Content-Type':'application/json' },
      body: JSON.stringify({ prefixes: [`${uid}/${id}`] }) }
  );
}

// Fetch a photo from Supabase Storage → store in IDB + MEDIA cache
async function _sbPhotoFetch(id){
  const url = await _sbPhotoSignedUrl(id);
  if(!url) return false;
  try{
    const r = await fetch(url);
    if(!r.ok) return false;
    const blob = await r.blob();
    // Store in IDB
    const db = await _mediaOpen();
    await new Promise((resolve,reject)=>{
      const tx = db.transaction(MEDIA_STORE,'readwrite');
      tx.objectStore(MEDIA_STORE).put({ id, blob, name:'', type:blob.type, size:blob.size, addedAt:new Date().toISOString() });
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
    if(MEDIA[id]) URL.revokeObjectURL(MEDIA[id]);
    MEDIA[id]      = URL.createObjectURL(blob);
    MEDIA_META[id] = { size:blob.size, type:blob.type, name:'' };
    return true;
  }catch(e){ console.warn('_sbPhotoFetch failed',id,e); return false; }
}

// Before a cloud save, ensure all locally-available images are in Storage.
// Runs once per session (guarded by _mediaEnsureRan). Re-uploads any blobs
// present in the local MEDIA cache that weren't confirmed uploaded this session.
// Uses fetch(blobUrl) to recover the raw Blob from the blob: URL stored in MEDIA[].
async function _mediaEnsureUploaded(){
  if(!_sbSession || _mediaEnsureRan) return;
  _mediaEnsureRan = true;
  const refs = new Set();
  _mediaRefs(STATE,'id').forEach(h=>{ const v=h.get(); if(v) refs.add(v); });
  const toSync = [...refs].filter(id => MEDIA[id] && !_MEDIA_UPLOADED.has(id));
  if(!toSync.length) return;
  console.log(`[Stage4] Ensuring ${toSync.length} image(s) are in cloud storage…`);
  for(const id of toSync){
    try{
      const blob = await fetch(MEDIA[id]).then(r=>r.blob());
      const ok = await _sbPhotoUpload(id, blob);
      if(ok) _MEDIA_UPLOADED.add(id);
    }catch(e){ console.warn('[Stage4] re-upload failed',id,e); }
  }
}

// After a cloud data load, queue background fetch for any media IDs missing locally
async function _mediaCloudSync(){
  if(!_sbSession) return;
  // Ensure the access token is fresh before making signed-URL requests
  await _sbEnsureFreshToken();
  // Collect all media IDs referenced in STATE
  const refs = new Set();
  _mediaRefs(STATE,'id').forEach(h=>{ const v=h.get(); if(v) refs.add(v); });
  const missing = [...refs].filter(id => !MEDIA[id]);
  if(!missing.length) return;
  console.log(`[Stage4] Fetching ${missing.length} missing photo(s) from cloud…`);
  for(const id of missing){
    await _sbPhotoFetch(id);
    // Re-render current page each time a photo lands so images appear progressively
    if(typeof renderPage==='function') try{ renderPage(); }catch(_){}
    if(typeof _wbLivePaint==='function' && document.getElementById('wb-live')) try{ _wbLivePaint(); }catch(_){}
  }
}

/* Is this ref a media id whose blob is gone? (the receipts already lost) */
function _mediaMissing(ref){
  if(!ref) return false;
  const s = String(ref);
  if(s.startsWith('http')||s.startsWith('data:')||s.startsWith('blob:')) return false;
  // On the public wedding site images are served from Supabase Storage directly — not from local IDB
  if(_wbPublicOwnerUid) return false;
  return !MEDIA[s];
}

// ── Migration ─────────────────────────────────────────────────────────────
/* Walks STATE, moves every embedded data: URL into IndexedDB, and replaces it
   with an id. Runs ONCE, before the first render, guarded by a flag. If a file
   was already stripped by the old quota bug, there is nothing to move — it is
   counted as lost and skipped, not silently repaired. */
/* The third copy of the same list, now derived like the other two. */
function _mediaMigrationTargets(){ return _mediaRefs(STATE, 'data'); }

function _migrateDialogHtml(done, total){
  const pct = total ? Math.round(done/total*100) : 100;
  return `
  <div id="mig-overlay" style="position:fixed;inset:0;z-index:3000;background:rgba(26,26,24,.45);display:flex;align-items:center;justify-content:center">
    <div style="background:var(--cream);border:1px solid var(--border);border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.18);width:330px;overflow:hidden">
      <div style="padding:16px 18px 6px">
        <div style="font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600;color:var(--ink)">Moving your files</div>
        <div style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.7">
          Your photos and receipts are being moved into proper storage. This happens once and takes a few seconds.
        </div>
      </div>
      <div style="padding:12px 18px 16px">
        <div style="height:5px;border-radius:3px;background:var(--parchment);overflow:hidden">
          <div id="mig-bar" style="width:${pct}%;height:100%;background:var(--gold);transition:width .2s"></div>
        </div>
        <div id="mig-count" style="font-size:11.5px;color:var(--muted);margin-top:7px">${done} of ${total} file${total===1?'':'s'}</div>
      </div>
    </div>
  </div>`;
}

async function _mediaMigrate(){
  if(STATE.settings && STATE.settings._mediaMigratedV114) return;
  const targets = _mediaMigrationTargets();
  if(!targets.length){
    if(!STATE.settings) STATE.settings={};
    STATE.settings._mediaMigratedV114 = true;
    return;
  }
  const host = document.createElement('div');
  host.innerHTML = _migrateDialogHtml(0, targets.length);
  document.body.appendChild(host);
  const bar = document.getElementById('mig-bar');
  const cnt = document.getElementById('mig-count');

  let done = 0;
  for(const t of targets){
    try{
      const id = await _mediaPut(t.get(), t.name, t.type);
      t.set(id);
    }catch(e){
      /* A file that can't be moved is a file that was already gone. Blank the
         ref so the card shows "Image not saved" rather than a broken <img>. */
      try{ t.set(''); }catch(_){}
      console.warn('Media migration skipped one file', e);
    }
    done++;
    if(bar) bar.style.width = Math.round(done/targets.length*100)+'%';
    if(cnt) cnt.textContent = `${done} of ${targets.length} file${targets.length===1?'':'s'}`;
    await new Promise(r=>setTimeout(r,0));   /* let the bar actually paint */
  }

  if(!STATE.settings) STATE.settings={};
  STATE.settings._mediaMigratedV114 = true;
  saveToStorage();
  host.remove();
}

/* ── Storage meter ─────────────────────────────────────────────────────────
   Reads the REAL browser quota via navigator.storage.estimate(), not a
   hardcoded 5MB. IndexedDB typically gets hundreds of MB. The old meter
   measured the wrong thing against the wrong cap. */
let _storageEst = null;   /* {usage, quota} — refreshed on Settings open */

async function _refreshStorageEstimate(){
  try{
    if(navigator.storage && navigator.storage.estimate){
      const e = await navigator.storage.estimate();
      _storageEst = { usage: e.usage||0, quota: e.quota||0 };
      return _storageEst;
    }
  }catch(_){}
  _storageEst = null;
  return null;
}

function _storageUsage(){
  /* Bytes actually held by our media, from the meta we cached at boot. */
  let mediaBytes = 0, files = 0;
  Object.keys(MEDIA_META).forEach(id=>{ mediaBytes += (MEDIA_META[id].size||0); files++; });

  let lsBytes = 0;
  try{ lsBytes = (localStorage.getItem(STORAGE_KEY)||'').length * 2; }catch(_){}

  const bytes = mediaBytes + lsBytes;
  const quota = (_storageEst && _storageEst.quota) ? _storageEst.quota : 0;
  const pct   = quota ? Math.min(100, Math.round(bytes/quota*100)) : 0;
  return { bytes, quota, pct, files, mediaBytes, lsBytes };
}

/* Settings shows the storage card; refresh in place after uploads. */
function _refreshStorageMeter(){
  const card=document.getElementById('stor-card-host');
  if(!card) return;
  if(_sbSession){
    card.innerHTML=_cloudStorageCardHtml();
  } else {
    _refreshStorageEstimate().then(()=>{
      const host=document.getElementById('stor-meter-host');
      if(host) host.innerHTML=_storageMeterHtml();
    }).catch(()=>{});
  }
}

/* ── Backup age ────────────────────────────────────────────────────────────
   Photos live in THIS browser's IndexedDB, on a file:// origin that never gets
   persistent storage — Chrome may evict it under pressure, without warning. An
   export is the only copy that leaves. So the one thing the app can honestly do
   is TELL HER HOW OLD HER LAST ONE IS, and never pretend not to know.

   Stale = 7 days. Green under that, amber over, red if she has never exported.
   The pill reads the stamp; nothing else depends on it. */
const _BACKUP_STALE_DAYS = 7;

function _backupAgeDays(){
  const at = STATE.settings && STATE.settings.lastBackupAt;
  if(!at) return null;                       /* never backed up — not "0 days" */
  const t = Date.parse(at);
  if(isNaN(t)) return null;                  /* junk stamp reads as never */
  return Math.floor((Date.now() - t) / 86400000);
}

function _backupAgeLabel(d){
  if(d === null) return 'Never backed up';
  if(d <= 0)     return 'Backed up today';
  if(d === 1)    return 'Backed up yesterday';
  if(d < _BACKUP_STALE_DAYS) return `Backed up ${d} days ago`;
  return `${d} days ago`;                    /* stale: lead with the number */
}

function _backupAgePillHtml(){
  const d = _backupAgeDays();
  const cls = d === null ? 'never' : (d >= _BACKUP_STALE_DAYS ? 'stale' : 'ok');
  return `<span class="backup-pill backup-pill-${cls}">${_esc(_backupAgeLabel(d))}</span>`;
}

/* Settings may not be on screen. Repaint only if the host is actually there. */
function _refreshBackupAgePill(){
  const host = document.getElementById('backup-age-pill');
  if(host) host.innerHTML = _backupAgePillHtml();
}

function _storageMeterHtml(){
  const u  = _storageUsage();
  const hi = u.quota && u.pct >= 85;
  const mid= u.quota && u.pct >= 60 && !hi;
  const mb = n => (n/1024/1024).toFixed(1);
  const gb = n => (n/1024/1024/1024).toFixed(1);
  const capTxt = !u.quota ? 'Your browser hasn\'t reported a limit.'
    : `Your browser allows roughly <b style="color:var(--ink);font-weight:500">${u.quota > 1073741824 ? gb(u.quota)+' GB' : Math.round(u.quota/1024/1024)+' MB'}</b> for this planner.`;
  const msg = hi
    ? `<b style="color:var(--red)">Nearly full.</b> New photos and files may not save.`
    : mid
      ? `Filling up. Consider removing older attachments.`
      : `Plenty of room.`;
  return `
    <div class="stor-meter">
      <div class="stor-top"><b>Local storage</b><span>${mb(u.bytes)} MB used</span></div>
      <div class="stor-bar${hi?' hi':(mid?' mid':'')}"><div style="width:${Math.max(u.pct,1)}%"></div></div>
      <div class="stor-note">${msg} <span style="color:var(--ink)">${u.files} file${u.files===1?'':'s'}</span> stored — photos, receipts and quotes.</div>
      <div class="stor-cap">${capTxt}</div>
    </div>`;
}

function _cloudStorageCardHtml(){
  const _CLOUD_LIMIT_BYTES = 1.5 * 1024 * 1024 * 1024; // 1.5 GB per user
  const u = _storageUsage();
  const usedBytes = u.mediaBytes || 0;
  const files = u.files || 0;
  const pct = Math.min(100, Math.round(usedBytes / _CLOUD_LIMIT_BYTES * 100));
  const hi  = pct >= 85;
  const mid = pct >= 60 && !hi;
  const fmtSize = n => {
    const mb = n / 1024 / 1024;
    if(mb < 0.1) return (n/1024).toFixed(0)+' KB';
    if(mb < 1000) return mb.toFixed(1)+' MB';
    return (n/1024/1024/1024).toFixed(2)+' GB';
  };
  const statusMsg = hi
    ? `<span style="color:var(--red);font-weight:500">Nearly full.</span> Consider removing older photos and receipts.`
    : mid
      ? `Getting full. Consider removing older attachments to free space.`
      : `Plenty of room.`;
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <div style="width:34px;height:34px;border-radius:8px;background:var(--parchment);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--gold-deep)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
      </div>
      <div>
        <div style="font-size:13px;font-weight:600;margin-bottom:2px">Cloud Storage</div>
        <div style="font-size:11.5px;color:var(--muted);line-height:1.4">Photos, receipts and files stored securely in the cloud.</div>
      </div>
    </div>
    <div style="display:flex;gap:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:12px">
      <div style="flex:1;padding:10px 14px;border-right:1px solid var(--border);text-align:center">
        <div style="font-size:14px;font-weight:600;color:var(--ink)">${files}</div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:1px">Files stored</div>
      </div>
      <div style="flex:1;padding:10px 14px;border-right:1px solid var(--border);text-align:center">
        <div style="font-size:14px;font-weight:600;color:var(--ink)">${fmtSize(usedBytes)}</div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:1px">Used</div>
      </div>
      <div style="flex:1;padding:10px 14px;text-align:center">
        <div style="font-size:14px;font-weight:600;color:var(--ink)">1.5 GB</div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:1px">Limit</div>
      </div>
    </div>
    <div style="height:5px;border-radius:3px;background:var(--border);overflow:hidden;margin-bottom:8px">
      <div style="height:100%;border-radius:3px;background:${hi?'var(--red)':mid?'#C9933A':'var(--gold)'};width:${Math.max(pct,pct>0?1:0)}%;transition:width .4s"></div>
    </div>
    <div style="font-size:11.5px;color:var(--muted);line-height:1.5;margin-bottom:10px">${statusMsg}</div>
    <div style="padding-top:10px;border-top:1px solid var(--border)">
      <div style="font-size:11.5px;color:var(--muted);line-height:1.5;margin-bottom:8px">Deleting attachments can leave unused files behind. Check for and clear any that aren't linked to anything.</div>
      <button onclick="openOrphanSweep()" style="font-family:'Inter',sans-serif;font-size:12px;font-weight:600;border:1px solid var(--sw-idle,#C9B89C);background:var(--sw-bg,#FBF8F3);color:var(--gold-deep,#8B7355);border-radius:7px;padding:7px 13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
        Check for unused files
      </button>
    </div>`;
}

/* ── Orphaned-blob sweep ────────────────────────────────────────────────────
   Every media blob in IndexedDB should be reachable from STATE through some
   ref (an `image`/`mediaId`/`poster`, a website image block's `ids[]`, etc).
   Deleting an attachment or a gallery upload removes the REF but deliberately
   leaves the blob — line-noted at the delete site as "left to the orphan sweep".
   This is that sweep: stored IDs − reachable IDs = orphans. The reachable set
   comes from the SAME walker export/import/migration trust (`_mediaRefs`), so
   an id is only ever an orphan if NO field shape anywhere in STATE points at it.
   Nothing is deleted without the preview dialog. */
function _mediaReachableSet(){
  const set = new Set();
  _mediaRefs(STATE, 'id').forEach(h=>{
    const v = h.get();
    if(typeof v==='string' && v) set.add(v);
  });
  return set;
}

/* Returns {ids:[...], bytes:N}. An orphan is a STORED id (MEDIA_META has every
   id we hold) that no ref reaches. */
function _mediaOrphans(){
  const reachable = _mediaReachableSet();
  const ids = [];
  let bytes = 0;
  Object.keys(MEDIA_META).forEach(id=>{
    if(!reachable.has(id)){
      ids.push(id);
      bytes += (MEDIA_META[id] && MEDIA_META[id].size) || 0;
    }
  });
  return { ids, bytes };
}

function _fmtMB(n){
  const mb = n/1024/1024;
  if(mb < 0.1) return (n/1024).toFixed(0)+' KB';
  return mb.toFixed(1)+' MB';
}

/* The Settings button calls this. Runs the diff, then routes: nothing → toast;
   stale backup → guard dialog; otherwise → clear dialog. */
function openOrphanSweep(){
  const { ids, bytes } = _mediaOrphans();
  if(!ids.length){
    if(typeof _showInfoToast==='function') _showInfoToast('No unused files — storage is tidy.', null, null);
    return;
  }
  const n = ids.length;
  const nLabel = n+' unused file'+(n===1?'':'s');
  const szLabel = _fmtMB(bytes);
  const days = (typeof _backupAgeDays==='function') ? _backupAgeDays() : null;
  const stale = (days===null) || (days >= _BACKUP_STALE_DAYS);

  if(stale){
    const ageTxt = (days===null) ? 'you haven’t backed up yet'
                 : ('your last backup was '+days+' day'+(days===1?'':'s')+' ago');
    const body = `<div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;align-items:center;gap:9px">
        <span style="width:26px;height:26px;border-radius:50%;background:rgba(192,101,62,.14);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--red)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
        <div style="font-size:13.5px;color:var(--ink);font-weight:500">Back up first</div>
      </div>
      <div style="font-size:12.5px;color:var(--muted);line-height:1.55">Found <b style="color:var(--ink)">${nLabel}</b> (${szLabel}), but ${ageTxt}. Export a fresh copy before clearing, so nothing’s lost if a file turns out to matter.</div>
    </div>`;
    const footer = `<button class="btn btn-outline btn-sm" onclick="closeModalDirect();exportDataJson()">Export first</button>
      <button class="btn btn-sm" onclick="_doOrphanSweep()" style="background:var(--sw-bg,#FBF8F3);color:var(--gold-deep,#8B7355);border:1px solid var(--sw-idle,#C9B89C)">Clear anyway</button>`;
    openModal('Unused files', body, footer);
    return;
  }

  const body = `<div style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;align-items:center;gap:9px">
      <span style="width:26px;height:26px;border-radius:50%;background:rgba(196,168,130,.22);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--gold-deep)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span>
      <div style="font-size:13.5px;color:var(--ink);font-weight:500">Clear unused files?</div>
    </div>
    <div style="font-size:12.5px;color:var(--muted);line-height:1.55">Found <b style="color:var(--ink)">${nLabel}</b> taking <b style="color:var(--ink)">${szLabel}</b>. These aren’t linked to any photo, receipt or website image. Clearing them frees the space and can’t affect anything you can see.</div>
  </div>`;
  const footer = `<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Cancel</button>
    <button class="btn btn-sm" onclick="_doOrphanSweep()" style="background:var(--gold-deep);color:#fff;border:1px solid var(--gold-deep)">Clear ${n} file${n===1?'':'s'}</button>`;
  openModal('Unused files', body, footer);
}

/* Recompute at delete time (state may have changed while the dialog was open),
   delete each orphan's blob, close, toast, and repaint the meter. */
async function _doOrphanSweep(){
  closeModalDirect();
  const { ids, bytes } = _mediaOrphans();
  if(!ids.length){
    if(typeof _showInfoToast==='function') _showInfoToast('No unused files — storage is tidy.', null, null);
    return;
  }
  for(const id of ids){
    try{ await _mediaDelete(id); }catch(_){}
  }
  const n = ids.length;
  if(typeof _showInfoToast==='function')
    _showInfoToast('Reclaimed '+n+' file'+(n===1?'':'s')+' — '+_fmtMB(bytes)+' freed.', null, null);
  if(typeof _refreshStorageMeter==='function') _refreshStorageMeter();
}



function loadFromStorage(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    const saved = JSON.parse(raw);
    if(!saved.hasSetup) return false;
    if(saved.event)      Object.assign(STATE.event, saved.event);
    if(saved.settings)   Object.assign(STATE.settings, saved.settings);
    // One-time migration: the old three-state name switcher used 'first' to mean
    // "first name + last initial". The four-state switcher repurposes 'first' as
    // first-name-only and adds 'firstinitial' for "Linden S.". Rewrite any pre-migration
    // 'first' to 'firstinitial' once, guarded by a flag, so existing plans look identical.
    if(STATE.settings && !STATE.settings._seatNameModeV2){
      if(STATE.settings.seatingNameMode==='first') STATE.settings.seatingNameMode='firstinitial';
      STATE.settings._seatNameModeV2=true;
    }
    if(saved.guests)     STATE.guests = saved.guests;
    // Backfill: the single handle field was IG-leaning historically, so any guest
    // that has a handle but no platform tag defaults to Instagram. Guests without a
    // handle get no tag (nothing to route). Idempotent.
    (STATE.guests||[]).forEach(g=>{
      if(g && (g.handle||'').trim() && !g.handlePlatform) g.handlePlatform='instagram';
    });
    // Backfill: guests tagged "Child" or "Infant" (and variants) with no explicit
    // ageBand get their band set automatically. Idempotent — skips guests that
    // already have an explicit ageBand so manual overrides are never disturbed.
    if(typeof _ageBandFromTags==='function'&&typeof _setGuestAgeBand==='function'){
      (STATE.guests||[]).forEach(g=>{
        if(g && !g.ageBand){ const b=_ageBandFromTags(g.tags); if(b) _setGuestAgeBand(g,b); }
      });
    }
    // v177: dietary entries that aren't app keys (raw text from older CSV imports) are
    // normalised once — recognised words to their tick-box, the rest to Other + its words,
    // merged with anything already there. Guests holding only app keys are untouched, so
    // this is idempotent.
    if(typeof _normaliseDiet==='function') (STATE.guests||[]).forEach(g=>{
      if(!g || !Array.isArray(g.dietary) || g.dietary.every(d=>DIET_KEYS.includes(d))) return;
      const keep=g.dietary.filter(d=>DIET_KEYS.includes(d));
      const n=_normaliseDiet(g.dietary.filter(d=>!DIET_KEYS.includes(d)));
      g.dietary=[...new Set(keep.concat(n.dietary))].sort((a,b)=>DIET_KEYS.indexOf(a)-DIET_KEYS.indexOf(b));
      if(n.allergens.length) g.allergens=[...new Set((g.allergens||[]).concat(n.allergens))];
      if(n.allergyNote) g.allergyNote=[g.allergyNote,n.allergyNote].filter(Boolean).join(', ');
      if(n.dietOther) g.dietOther=[g.dietOther,n.dietOther].filter(Boolean).join(', ');
    });
    if(saved.checklist)  STATE.checklist = saved.checklist;
    if(saved.vendors)    STATE.vendors = saved.vendors;
    if(!Array.isArray(STATE.vendors)) STATE.vendors = [];
    if(saved.quotes)     STATE.quotes = saved.quotes;
    if(!Array.isArray(STATE.quotes)) STATE.quotes = [];
    if(typeof _migrateAppointments==='function') _migrateAppointments();
    if(saved.checklistCategories) STATE.checklistCategories = saved.checklistCategories;
    if(saved.checklistDrafts) STATE.checklistDrafts = saved.checklistDrafts;
    if(saved.checklistCatOrder) STATE.checklistCatOrder = saved.checklistCatOrder;
    if(saved.budget)     STATE.budget = saved.budget;
    // Migrate the legacy single vendor.budgetItemId into budget-side vendorIds[] lists.
    (STATE.vendors||[]).forEach(v=>{
      if(v.budgetItemId){
        const b=(STATE.budget && STATE.budget.items||[]).find(x=>x.id===v.budgetItemId);
        if(b){ if(!Array.isArray(b.vendorIds)) b.vendorIds=[]; if(!b.vendorIds.includes(v.id)) b.vendorIds.push(v.id); }
        delete v.budgetItemId;
      }
    });
    if(saved.tables)     STATE.tables = saved.tables;
    if(saved.seating){
      STATE.seating = saved.seating;
      // v139: seating arrays are now SPARSE (index === chair). A v138 dense array is
      // already a valid sparse array with no holes, so there is nothing to convert —
      // every guest keeps the chair they were rendered in. We only normalise: coerce
      // non-arrays, and drop any guest sitting beyond the table's seat count (possible
      // in old data if `seats` was reduced), which would otherwise be invisible and
      // uncounted.
      Object.keys(STATE.seating).forEach(tid=>{
        let a=STATE.seating[tid];
        if(!Array.isArray(a)){ STATE.seating[tid]=[]; return; }
        const t=(saved.tables||[]).find(x=>x.id===tid);
        const cap=t?(t.seats||0):a.length;
        if(a.length>cap) a=a.slice(0,cap);
        while(a.length && !a[a.length-1]) a.pop();
        STATE.seating[tid]=a;
      });
    }
    if(saved.inspo)      STATE.inspo = saved.inspo;
    if(saved.visionboard)STATE.visionboard = saved.visionboard;
    if(saved.wishingwell)Object.assign(STATE.wishingwell, saved.wishingwell);
    if(saved.website)    STATE.website = saved.website;
    if(saved.timeline)   STATE.timeline = saved.timeline;
    if(saved.events)STATE.events = saved.events;
    if(!Array.isArray(STATE.events)) STATE.events = [];
    // Migrate any legacy events (old Details-page shape: title/venue, no rsvps)
    // into the new Events-section shape (name/venueName + rsvps). Idempotent.
    STATE.events.forEach(ev=>{
      if(ev && ev.name===undefined && ev.title!==undefined){ ev.name=ev.title; }
      if(ev && ev.venueName===undefined && ev.venue!==undefined){ ev.venueName=ev.venue; }
      if(ev && !ev.type){ ev.type = (ev.title && _EVENT_TYPES && _EVENT_TYPES.includes(ev.title)) ? ev.title : (ev.name||'Other'); }
      if(ev && (ev.rsvps===undefined || ev.rsvps===null || typeof ev.rsvps!=='object')){ ev.rsvps={}; }
    });
    if(saved.families)STATE.families = saved.families;
    if(saved.tagDefs && typeof saved.tagDefs==='object') STATE.tagDefs = saved.tagDefs;
    if(!STATE.tagDefs || typeof STATE.tagDefs!=='object') STATE.tagDefs = {};
    if(saved.invites)STATE.invites = saved.invites;
    if(saved.inviteMeta && typeof saved.inviteMeta==='object') STATE.inviteMeta = saved.inviteMeta;
    if(saved.invitation && typeof saved.invitation==='object') STATE.invitation = saved.invitation;
    if(saved.dashWidgetOrder)STATE.dashWidgetOrder = saved.dashWidgetOrder;
    if(saved.dashLayout)STATE.dashLayout = saved.dashLayout;
    if(saved.dashHiddenWidgets)STATE.dashHiddenWidgets = saved.dashHiddenWidgets;
    if(Array.isArray(saved.pendingGroups) && saved.pendingGroups.length){
      _groupSuggestions = saved.pendingGroups;
      _groupBannerDismissed = !!saved.pendingGroupsBannerDismissed;
    }
    _groupSuggestionsSeeded = !!saved.pendingGroupsSeeded;
    if(!_groupSuggestionsSeeded && STATE.guests && STATE.guests.length >= 2){
      const allIds=STATE.guests.map(g=>g.id);
      _groupSuggestions=_buildGroupSuggestions(allIds);
      _groupSuggestionsSeeded=true;
    }
    document.body.classList.toggle('dark', !!saved.darkMode);
    // Sync data-theme on <html> so OS dark-mode media queries don't override
    // CSS variables when the user's saved preference is light mode.
    if(saved.darkMode){
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme','light');
    }
    document.body.classList.toggle('cl-no-fade', STATE.settings.checklistCompletedFade===false);
    if(saved.sidebarMode==='icon' && window.innerWidth>900) document.body.classList.add('icon-sidebar');

    // Data integrity: clean up any stale couple/plus-one links pointing to non-existent guests
    const guestIds=new Set(STATE.guests.map(g=>g.id));
    STATE.guests.forEach(g=>{
      if(g.coupleId&&!guestIds.has(g.coupleId)) g.coupleId=null;
      if(g.plusOneId&&!guestIds.has(g.plusOneId)) g.plusOneId=null;
    });
    // Remove orphaned plus-one guests (plusOne relationship but their primary no longer exists or doesn't reference them)
    STATE.guests=STATE.guests.filter(g=>{
      if(g.relationship==='Plus One'&&g.coupleId){
        const primary=STATE.guests.find(x=>x.id===g.coupleId);
        if(!primary) return false; // primary was deleted
      }
      return true;
    });
    // Clean up family memberIds that point to deleted guests
    if(STATE.families){
      STATE.families.forEach(f=>{ f.memberIds=f.memberIds.filter(id=>guestIds.has(id)); });
      STATE.families=STATE.families.filter(f=>f.memberIds.length>0);
    }

    // Data integrity: repair "stuck" category deposits. Older versions left
    // depositFromSubs=true on a category even after a category-level deposit was
    // entered, so calcBudgetDeposit read the (empty) sub-rollup and the deposit
    // never displayed or deducted. If a real category deposit exists (amount or
    // due date) but the rollup flag is still on, switch it to an explicit item
    // deposit and guard it so a later sub-item edit can't re-stick it. Genuine
    // rollup deposits (no category amount/due date) are left untouched.
    if(STATE.budget && Array.isArray(STATE.budget.items)){
      let _depRepaired=false;
      STATE.budget.items.forEach(b=>{
        if((Number(b.deposit||0)>0 || b.depositDueDate) && b.depositFromSubs){
          b.depositFromSubs=false;
          b.depositFromSubsManualOff=true;
          _depRepaired=true;
        }
      });
      // Make the repair durable immediately (don't wait for the next user edit).
      if(_depRepaired){ try{ saveToStorage(); }catch(_e){} }
    }

    return true;
  } catch(e){ return false; }
}

function setSidebarMode(mode){
  STATE.settings.sidebarMode = mode;
  const sidebar=document.getElementById('sidebar');
  if(mode==='icon'){
    document.body.classList.add('icon-sidebar');
    // Start fully expanded — user collapses to icons if they want
    sidebar.classList.remove('collapsed','expanded');
    document.getElementById('sidebar-overlay').classList.remove('visible');
  } else {
    document.body.classList.remove('icon-sidebar');
    sidebar.classList.remove('collapsed','expanded');
    if(window.innerWidth<=900) sidebar.classList.add('collapsed');
  }
  saveToStorage();
  navigate('settings');
}

function setSettingsLayout(mode){
  // Layout switcher removed — settings now use a single fixed card layout.
}

function setCountdownUnit(unit){
  STATE.settings.countdownUnit=unit;
  saveToStorage();
  navigate('settings');
}
function setDueWindow(which, days){
  if(!STATE.settings) STATE.settings={};
  if(which==='checklist') STATE.settings.checklistDueWindow=days;
  else STATE.settings.budgetDueWindow=days;
  saveToStorage();
  navigate('settings');
}

function setCurrencyDecimals(on){
  STATE.settings.currencyDecimals=!!on;
  saveToStorage();
  navigate('settings');
}
function setCurrency(code){
  if(!STATE.settings) STATE.settings={};
  STATE.settings.currencyCode = CURRENCIES[code] ? code : 'AUD';
  saveToStorage();
  navigate(_currentPage||'settings');
}

function toggleDarkMode(on){
  document.body.classList.toggle('dark', on);
  // Keep data-theme="light" on <html> when light mode is active so the
  // @media(prefers-color-scheme:dark) :root:not([data-theme="light"]) rules
  // don't override CSS variables on phones/browsers whose OS is in dark mode
  // but whose app preference is light mode.
  if(on){
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme','light');
  }
  saveToStorage();
  if(typeof _updateBudgetNavBadge==='function') _updateBudgetNavBadge();
  if(typeof _updateChecklistNavBadge==='function') _updateChecklistNavBadge();
  if(typeof _updateSeatingNavBadge==='function') _updateSeatingNavBadge();
}

// ══════════════════════════════════════════════
