// INIT — load storage FIRST, then render
// ══════════════════════════════════════════════

// Save on page close/refresh as a safety net
window.addEventListener('beforeunload', saveToStorage);

// Periodic autosave every 30 seconds
setInterval(saveToStorage, 30000);

// Refresh Settings panel on auth state change
_sbOnAuthChange(function(){ if(typeof _currentPage!=='undefined'&&_currentPage==='settings') navigate('settings'); });

// Load persisted data before first render
const alreadySetUp = loadFromStorage();

// On a fresh device with no saved preference, honour the OS dark-mode setting
if(!alreadySetUp && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
  document.body.classList.add('dark');
  // No need to set data-theme — when OS dark mode is the preference we let
  // the media query apply naturally (data-theme is only set to 'light' to
  // block that query when the user has explicitly chosen light mode).
} else if(!alreadySetUp){
  // Fresh device, OS is light mode — mark explicitly so the guard holds
  // even before any preference is saved.
  document.documentElement.setAttribute('data-theme','light');
}

// Sidebar mode — device-aware defaults, each device type remembers its own state
(function _initSidebarMode(){
  const isMobile=window.innerWidth<=900;
  const sidebar=document.getElementById('sidebar');
  const overlay=document.getElementById('sidebar-overlay');
  if(isMobile){
    // Mobile: hamburger drawer — ensure icon-sidebar mode from a synced desktop setting is never applied here
    document.body.classList.remove('icon-sidebar');
    const saved=localStorage.getItem('uv_sb_mobile')||'closed';
    sidebar.classList.toggle('collapsed',saved!=='open');
    if(overlay) overlay.classList.toggle('visible',saved==='open');
  } else {
    // Desktop: icon-strip sidebar by default (collapsed=icon-only), remembers full vs icon
    document.body.classList.add('icon-sidebar');
    const saved=localStorage.getItem('uv_sb_desktop')||'icon';
    sidebar.classList.toggle('collapsed',saved!=='full');
  }
})();
// Switch sidebar mode when window crosses the mobile/desktop breakpoint
window.addEventListener('resize',(function(){
  let wasDesktop=window.innerWidth>900;
  return function(){
    const isDesktop=window.innerWidth>900;
    if(isDesktop===wasDesktop) return;
    wasDesktop=isDesktop;
    const sidebar=document.getElementById('sidebar');
    const overlay=document.getElementById('sidebar-overlay');
    if(isDesktop){
      document.body.classList.add('icon-sidebar');
      const saved=localStorage.getItem('uv_sb_desktop')||'icon';
      sidebar.classList.toggle('collapsed',saved!=='full');
      if(overlay){overlay.classList.remove('visible');}
    } else {
      document.body.classList.remove('icon-sidebar');
      const saved=localStorage.getItem('uv_sb_mobile')||'closed';
      sidebar.classList.toggle('collapsed',saved!=='open');
      if(overlay) overlay.classList.toggle('visible',saved==='open');
    }
  };
})());

// Auto-mark any past-due installments on load (when enabled) so totals are correct
// from the dashboard onward.
try{ if(_autoCheckPassedInstallments()) saveToStorage(); }catch(e){}

// Load subscription tier state and detect checkout return
if(typeof _uvLoadSubscription==='function') _uvLoadSubscription();
if(typeof _uvCheckReturn==='function') _uvCheckReturn();

/* ══════════════════════════════════════════════════════════════════════════
   STAGE 5 — PUBLIC PAGES (RSVP form + Vendor portal)
   These functions render a full-page experience that replaces the normal
   app shell. They are called from boot() when URL params are detected,
   and they never touch localStorage, STATE, or any planner internals.

   SQL required in Supabase dashboard (run once):
   ────────────────────────────────────────────────
   CREATE TABLE rsvp_responses (
     id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     couple_id   uuid NOT NULL REFERENCES auth.users(id),
     guest_name  text NOT NULL,
     email       text,
     phone       text,
     address     text,
     attending   text CHECK (attending IN ('yes','no')),
     dietary     text[],
     message     text,
     created_at  timestamptz DEFAULT now()
   );
   ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "couple reads own rsvps" ON rsvp_responses
     FOR SELECT USING (auth.uid() = couple_id);
   CREATE POLICY "public can submit rsvp" ON rsvp_responses
     FOR INSERT WITH CHECK (true);

   CREATE TABLE vendor_tokens (
     token       text PRIMARY KEY DEFAULT encode(gen_random_bytes(24),'hex'),
     couple_id   uuid NOT NULL REFERENCES auth.users(id),
     vendor_name text,
     sections    text[],
     expires_at  timestamptz,
     created_at  timestamptz DEFAULT now()
   );
   ALTER TABLE vendor_tokens ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "couple manages tokens" ON vendor_tokens
     USING (auth.uid() = couple_id);
   CREATE POLICY "public reads by token" ON vendor_tokens
     FOR SELECT USING (true);
   ──────────────────────────────────────────────── */

// ── Helpers shared by public pages ──────────────────────────────────────────

function _publicPageShell(innerHtml){
  document.body.innerHTML = innerHtml;
  document.documentElement.style.overflow = 'auto';
  document.documentElement.style.height = 'auto';
  document.body.style.overflow = 'auto';
  document.body.style.height = 'auto';
}

// ── _showPublicWeddingSite: full wedding website rendered from a slug ──────────
async function _showPublicWeddingSite(slug){
  document.body.style.background='var(--cream,#FBF8F3)';
  // Look up which couple owns this slug
  let uid=null;
  try{
    const r1=await fetch(`${_SB_URL}/rest/v1/planner_data?select=user_id&section=eq.website&data->>slug=eq.${encodeURIComponent(slug)}&limit=1`,{
      headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+_SB_KEY}
    });
    if(r1.ok){ const rows=await r1.json(); if(rows&&rows[0]) uid=rows[0].user_id; }
  }catch(e){ console.warn('Slug lookup failed',e); }

  if(!uid){
    document.body.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'Inter',sans-serif;color:#999;flex-direction:column;gap:12px;text-align:center;padding:40px"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".4"><circle cx="12" cy="12" r="9"/><path d="M12 9v4"/><circle cx="12" cy="16.5" r=".5" fill="currentColor"/></svg><div style="font-size:15px;font-weight:500">Wedding site not found</div><div style="font-size:12.5px;color:#bbb">The link may have changed or the site is not yet published.</div></div>`;
    document.body.style.visibility='visible';
    return;
  }

  // Preserve full guest data before public RPC may overwrite it
  const _fullGuests = STATE.guests;

  // Fetch the sections needed to build the site
  try{
    const [r2, _ex]=await Promise.all([
      fetch(`${_SB_URL}/rest/v1/planner_data?select=section,data&user_id=eq.${encodeURIComponent(uid)}&section=in.(website,event,timeline,inspo)`,{
        headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+_SB_KEY}
      }),
      _publicWeddingExtras(uid)
    ]);
    if(Array.isArray(_ex.guests)) STATE.guests=_ex.guests;
    if(Array.isArray(_ex.families)) STATE.families=_ex.families;
    if(_ex.settings && typeof _ex.settings==='object') STATE.settings=Object.assign(STATE.settings||{},_ex.settings);
    if(_ex.wishingwell && typeof _ex.wishingwell==='object') STATE.wishingwell=_ex.wishingwell;
    if(r2.ok){
      const rows=await r2.json();
      rows.forEach(r=>{
        if(r.section==='website')    STATE.website=r.data||{};
        if(r.section==='event')      STATE.event=r.data||{};
        if(r.section==='timeline')   STATE.timeline=r.data||[];
        if(r.section==='guests')     STATE.guests=r.data||[];
        if(r.section==='wishingwell')STATE.wishingwell=r.data||{};
        if(r.section==='inspo')      STATE.inspo=r.data||{};
      });
    }
  }catch(e){ console.warn('Site data fetch failed',e); }

  // Check publish gate — unpublished sites are private to the owner
  const _isOwner = _sbSession && _sbSession.user && _sbSession.user.id === uid;
  _wbSite(); // normalise STATE.website (ensures w.published defaults to false)
  if(!STATE.website.published && !_isOwner){
    const ev=STATE.event||{};
    const names=[ev.partner1,ev.partner2].filter(Boolean).join(' & ')||'This wedding site';
    document.body.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'Inter',sans-serif;flex-direction:column;gap:18px;text-align:center;padding:40px;background:#FBF8F3">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="1.2" stroke-linecap="round" opacity=".7"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      <div style="font-size:17px;font-weight:500;color:#4A3F35">${_escHtml(names)}</div>
      <div style="font-size:13.5px;color:#9A8C7A;max-width:280px;line-height:1.6">This site is coming soon. Check back later!</div>
    </div>`;
    STATE.guests = _fullGuests;
    document.body.style.visibility='visible';
    return;
  }

  _wbPublicOwnerUid = uid;

  // If the owner is viewing their own site (session is loaded and UID matches),
  // pre-generate signed URLs for all website media so images resolve without
  // needing the bucket to be public.
  if(_sbSession && _sbSession.user && _sbSession.user.id === uid){
    await _sbEnsureFreshToken();
    const _collectIds = (obj, out) => {
      if(!obj || typeof obj !== 'object') return;
      if(Array.isArray(obj)){ obj.forEach(v=>_collectIds(v,out)); return; }
      Object.entries(obj).forEach(([k,v])=>{
        if(k==='mediaId' && v && typeof v==='string' && !v.startsWith('http') && !v.startsWith('data:')) out.add(v);
        else if(typeof v==='object') _collectIds(v,out);
      });
    };
    const ids = new Set();
    _collectIds(STATE.website, ids);
    _collectIds(STATE.inspo, ids);
    await Promise.all([...ids].map(id=>_sbPhotoSignedUrl(id)));
  }

  const html=_wbBuildSite();
  _wbPublicOwnerUid = null;
  STATE.guests = _fullGuests; // restore before document.open() can trigger beforeunload auto-sync
  document.open();
  document.write(html);
  document.close();
}

function _publicCss(accentHex, pageHex, bandHex, inkHex, textHex, headFont, bodyFont){
  // Returns a <style> block injecting the couple's wedding website palette
  // so the public RSVP/vendor pages feel on-brand.
  const a = accentHex||'#C9A227';
  const pg= pageHex ||'#E8DDD0';
  const bd= bandHex ||'#DDD3C4';
  const ink=inkHex  ||'#4A3F35';
  const txt=textHex ||'#5A5148';
  const hf= headFont||"'Cormorant Garamond',serif";
  const bf= bodyFont||"'Inter',sans-serif";
  return `<style>
    *,*::before,*::after{box-sizing:border-box}
    :root{
      --pub-page:${pg};--pub-band:${bd};--pub-accent:${a};
      --pub-ink:${ink};--pub-text:${txt};
      --pub-surface:color-mix(in srgb,${pg} 60%,#fff 40%);
      --pub-border:color-mix(in srgb,${a} 25%,#ccc 75%);
      --pub-btn:${a};--pub-btn-fg:#fff;
      --pub-radius:11px;
    }
    @media(prefers-color-scheme:dark){
      :root:not([data-theme="light"]){
        --pub-page:#1C1C22;--pub-band:#26252B;--pub-accent:#B0A085;
        --pub-ink:#D2CEC6;--pub-text:#9A9389;
        --pub-surface:#1E1E24;--pub-border:#2E2D33;
        --pub-btn:#B0A085;--pub-btn-fg:#1C1C22;
        color-scheme:dark;
      }
    }
    :root[data-theme="dark"]{
      --pub-page:#1C1C22;--pub-band:#26252B;--pub-accent:#B0A085;
      --pub-ink:#D2CEC6;--pub-text:#9A9389;
      --pub-surface:#1E1E24;--pub-border:#2E2D33;
      --pub-btn:#B0A085;--pub-btn-fg:#1C1C22;
      color-scheme:dark;
    }
    :root[data-theme="light"]{
      --pub-page:#E8DDD0;--pub-band:#DDD3C4;--pub-accent:${a};
      --pub-ink:#4A3F35;--pub-text:#5A5148;
      --pub-surface:color-mix(in srgb,#E8DDD0 60%,#fff 40%);
      --pub-border:color-mix(in srgb,${a} 25%,#ccc 75%);
      color-scheme:light;
    }
    body{margin:0;background:var(--pub-page);color:var(--pub-ink);font-family:${bf};font-size:14px;min-height:100vh}
    .pub-theme-btn{position:fixed;top:14px;right:14px;z-index:999;display:inline-flex;align-items:center;gap:5px;padding:6px 11px;font-size:11.5px;font-weight:500;font-family:${bf};border:1px solid var(--pub-border);border-radius:8px;background:var(--pub-surface);color:var(--pub-text);cursor:pointer;transition:all .15s}
    .pub-theme-btn:hover{color:var(--pub-ink);border-color:var(--pub-accent)}
    .pub-header{background:var(--pub-band);padding:40px 24px 32px;text-align:center;border-bottom:1px solid var(--pub-border)}
    .pub-eyebrow{font-size:10.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--pub-accent);margin-bottom:10px}
    .pub-couple{font-family:${hf};font-size:32px;font-weight:500;color:var(--pub-ink);line-height:1.15;margin-bottom:8px}
    .pub-dateline{font-size:12.5px;color:var(--pub-text);letter-spacing:.03em}
    .pub-divider{width:44px;height:1px;background:var(--pub-accent);opacity:.6;margin:14px auto 0}
    .pub-body{padding:28px 24px;max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
    .pub-label{font-size:11px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--pub-accent);margin-bottom:6px}
    .pub-label .opt{color:var(--pub-text);font-weight:400;text-transform:none;letter-spacing:0;font-size:11px}
    .pub-input,.pub-select,.pub-textarea{width:100%;padding:11px 14px;font-size:13.5px;font-family:${bf};color:var(--pub-ink);background:var(--pub-surface);border:1px solid var(--pub-border);border-radius:9px;outline:none;transition:border-color .15s,box-shadow .15s}
    .pub-input:focus,.pub-select:focus,.pub-textarea:focus{border-color:var(--pub-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--pub-accent) 20%,transparent 80%)}
    .pub-input::placeholder,.pub-textarea::placeholder{color:var(--pub-text);opacity:.7}
    .pub-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239A9389' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:calc(100% - 12px) center;padding-right:32px;cursor:pointer}
    .pub-textarea{resize:vertical;min-height:80px}
    .pub-attend-pills{display:flex;gap:8px;flex-wrap:wrap}
    .pub-attend-pill{flex:1;min-width:120px;padding:10px 12px;border:1px solid var(--pub-border);border-radius:9px;background:var(--pub-surface);font-size:12.5px;font-weight:500;color:var(--pub-text);cursor:pointer;text-align:center;transition:all .15s;font-family:${bf};user-select:none}
    .pub-attend-pill:hover{border-color:var(--pub-accent);color:var(--pub-ink)}
    .pub-attend-pill.yes{border-color:#4A7C59;background:rgba(74,124,89,.1);color:#4A7C59;font-weight:600}
    .pub-attend-pill.no{border-color:#C0392B;background:rgba(192,57,43,.08);color:#C0392B;font-weight:600}
    .pub-diet-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    .pub-diet-chip{display:flex;align-items:center;gap:8px;padding:9px 11px;border:1px solid var(--pub-border);border-radius:8px;background:var(--pub-surface);font-size:12.5px;color:var(--pub-text);cursor:pointer;transition:all .15s;user-select:none}
    .pub-diet-chip:hover{border-color:var(--pub-accent);color:var(--pub-ink)}
    .pub-diet-chip.on{border-color:var(--pub-accent);background:color-mix(in srgb,var(--pub-accent) 12%,transparent 88%);color:var(--pub-ink)}
    .pub-diet-check{width:14px;height:14px;border:1.5px solid var(--pub-border);border-radius:4px;background:var(--pub-page);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
    .pub-diet-chip.on .pub-diet-check{background:var(--pub-accent);border-color:var(--pub-accent)}
    .pub-diet-check svg{opacity:0;transition:opacity .15s}
    .pub-diet-chip.on .pub-diet-check svg{opacity:1}
    .pub-submit{width:100%;padding:14px;background:var(--pub-btn);color:var(--pub-btn-fg);border:none;border-radius:10px;font-size:14px;font-weight:600;font-family:${bf};letter-spacing:.02em;cursor:pointer;transition:opacity .15s,transform .1s}
    .pub-submit:hover:not(:disabled){opacity:.88}
    .pub-submit:disabled{opacity:.55;cursor:not-allowed}
    .pub-footer{text-align:center;font-size:11.5px;color:var(--pub-text);padding-bottom:8px}
    .pub-addr-row{display:grid;grid-template-columns:1fr 70px 90px;gap:7px;margin-top:7px}
    .pub-addr-hint{font-size:11px;color:var(--pub-text);margin-top:5px}
    .pub-msg-box{padding:16px;border-radius:12px;text-align:center;font-size:14px;line-height:1.6}
    .pub-msg-box.success{background:rgba(74,124,89,.12);border:1px solid rgba(74,124,89,.3);color:#4A7C59}
    .pub-msg-box.expired{background:var(--pub-surface);border:1px solid var(--pub-border);color:var(--pub-text)}
    .pub-ring{width:56px;height:56px;border-radius:50%;border:1.5px solid var(--pub-accent);opacity:.7;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:var(--pub-accent)}
    @media(max-width:480px){.pub-addr-row{grid-template-columns:1fr 60px 75px}.pub-couple{font-size:26px}.pub-body{padding:20px 16px}}
    .pub-ac-wrap{position:relative}
    .pub-ac-list{display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--pub-page);border:1px solid var(--pub-accent);border-radius:9px;box-shadow:0 6px 22px rgba(0,0,0,.12);list-style:none;margin:0;padding:4px 0;z-index:99;max-height:200px;overflow-y:auto}
    .pub-ac-item{padding:10px 14px;font-size:13px;color:var(--pub-ink);cursor:pointer;transition:background .1s;font-family:${bf}}
    .pub-ac-item:hover,.pub-ac-item.focused{background:color-mix(in srgb,var(--pub-accent) 15%,transparent 85%)}
    .pub-ac-none{padding:10px 14px;font-size:12.5px;color:var(--pub-text);font-style:italic;font-family:${bf}}
  </style>`;
}

function _pubToggleTheme(){
  const r=document.documentElement;
  r.setAttribute('data-theme', r.getAttribute('data-theme')==='dark'?'light':'dark');
}

// ── _showRsvpExpired: legacy ?rsvp=true link ─────────────────────────────────
function _showRsvpExpired(){
  _publicPageShell(`
    ${_publicCss()}
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 24px">
      <div style="max-width:400px;width:100%;text-align:center">
        <div class="pub-ring">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="pub-eyebrow">This link has been updated</div>
        <div class="pub-couple" style="font-size:22px;margin-bottom:10px">RSVP link expired</div>
        <div style="font-size:13.5px;color:var(--pub-text);line-height:1.6;margin-bottom:20px">
          This RSVP link is no longer valid. The couple may have regenerated a new link.<br>
          Please contact them directly to receive the updated link.
        </div>
        <div class="pub-footer" style="margin-top:8px">Powered by <strong style="color:var(--pub-ink)">Union Vault</strong></div>
      </div>
    </div>`);
}

// ── _showRsvpForm: renders the wedding website + auto-opens RSVP modal ──────
const _RSVP_PALS={
  sage:    {bg:'#E8EDEA',surf:'#D2DDD7',accent:'#5C7D6B',ink:'#2D3D35'},
  ivory:   {bg:'#F5F0E8',surf:'#EDE6D8',accent:'#A08050',ink:'#3A3020'},
  blush:   {bg:'#F5EDE9',surf:'#EDD9D2',accent:'#C0745A',ink:'#3D2820'},
  midnight:{bg:'#1A1E2A',surf:'#252A38',accent:'#7B95C8',ink:'#D0D8E8'},
  slate:   {bg:'#1E2226',surf:'#272D32',accent:'#8AA4A8',ink:'#CAD3D6'},
};
function _isDarkHex(hex){
  const h=(hex||'').replace('#',''); if(h.length<6) return false;
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return (r*0.299+g*0.587+b*0.114)<128;
}
async function _showRsvpForm(coupleId){
  // Render the full wedding website then auto-open the RSVP modal.
  // This reuses _wbBuildSite() so the RSVP modal stays in sync with
  // the website RSVP button — one code path for both entry points.
  const _fullGuests = STATE.guests;
  try{
    const [r2, _ex]=await Promise.all([
      fetch(`${_SB_URL}/rest/v1/planner_data?select=section,data&user_id=eq.${encodeURIComponent(coupleId)}&section=in.(website,event,timeline,inspo)`,{
        headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+_SB_KEY}
      }),
      _publicWeddingExtras(coupleId)
    ]);
    if(Array.isArray(_ex.guests)) STATE.guests=_ex.guests;
    if(Array.isArray(_ex.families)) STATE.families=_ex.families;
    if(_ex.settings && typeof _ex.settings==='object') STATE.settings=Object.assign(STATE.settings||{},_ex.settings);
    if(_ex.wishingwell && typeof _ex.wishingwell==='object') STATE.wishingwell=_ex.wishingwell;
    if(r2.ok){
      const rows=await r2.json();
      rows.forEach(r=>{
        if(r.section==='website')    STATE.website=r.data||{};
        if(r.section==='event')      STATE.event=r.data||{};
        if(r.section==='timeline')   STATE.timeline=r.data||[];
        if(r.section==='inspo')      STATE.inspo=r.data||{};
      });
    }
  }catch(e){ console.warn('RSVP data fetch failed',e); }

  _wbSite();
  _wbPublicOwnerUid = coupleId;
  const html=_wbBuildSite();
  _wbPublicOwnerUid = null;
  STATE.guests = _fullGuests;
  document.open();
  document.write(html);
  document.close();
  if(typeof _uvOpenRsvp==='function') _uvOpenRsvp();
}

// Public pages get guest names/groupings, meal settings and the wishing well (minus
// contributions) through this RPC — the raw guests/settings/families rows are not
// readable without signing in, so no contact details ever reach a public page.
async function _publicWeddingExtras(uid){
  try{
    const r=await fetch(`${_SB_URL}/rest/v1/rpc/public_wedding_extras`,{
      method:'POST',
      headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+_SB_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({uid})
    });
    if(r.ok){ const d=await r.json(); if(d&&typeof d==='object') return d; }
  }catch(e){ console.warn('Public data fetch failed',e); }
  return {};
}
// ── _showVendorPortal: read-only vendor brief (Option B style) ───────────────
async function _showVendorPortal(token){
  let vendor={}, couple={}, theme={}, expired=false;
  try{
    // One RPC returns just this token's brief (the token table itself isn't publicly listable).
    const res = await fetch(`${_SB_URL}/rest/v1/rpc/vendor_brief`,{
      method:'POST',
      headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+_SB_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({t:token})
    });
    if(res.ok){
      const b = await res.json();
      if(!b||!b.vendor){ _showVendorError('not-found'); return; }
      vendor = b.vendor;
      // Check expiry
      if(vendor.expires_at && new Date(vendor.expires_at) < new Date()){ expired=true; }
      // Shape it like the planner data the portal renders from.
      const vc = b.vendorCard||{};
      couple = { event:b.event||{}, guestCount:b.guestCount||0,
                 vendors:[Object.assign({business:vendor.vendor_name}, vc)] };
      theme = b.theme||{};
      const sectionData = b.sectionData||{};
    } else { _showVendorError('not-found'); return; }
  }catch(e){ console.warn('Vendor portal error',e); _showVendorError('error'); return; }

  if(expired){ _showVendorExpired(vendor, couple, theme); return; }

  const ev = couple.event||{};
  const p1 = ev.partner1||'', p2 = ev.partner2||'';
  const coupleName = (p1&&p2)?`${p1} & ${p2}`:(p1||p2||'');
  const dateStr = ev.date ? (()=>{
    const d=new Date(ev.date+'T00:00:00'); if(isNaN(d)) return ev.date;
    return d.toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'});
  })() : '';

  // Build booking rows from vendors list matching this token's vendor_name
  const matchedVendor = (couple.vendors||[]).find(v=>v.business===vendor.vendor_name||v.contact===vendor.vendor_name)||{};
  const _gc=couple.guestCount;
  const _gcVal=(_gc&&typeof _gc==='object')?_gc.total:_gc;
  const bookingRows=[
    ['Event date', dateStr||'TBC'],
    ['Venue', ev.venue||'TBC'],
    ['Service', matchedVendor.category||vendor.vendor_name||'—'],
    ['Setup time', matchedVendor.setupTime||'TBC'],
    ['Guest count', _gcVal||'TBC']
  ].filter(([,v])=>v);

  const sections = Array.isArray(vendor.sections)&&vendor.sections.length ? vendor.sections : [];
  const _sectionLabels={timeline:'Day-of Timeline',checklist:'Checklist',contacts:'Other Contacts',budget:'Budget',notes:'Notes'};
  const _chev='<svg class="vpb-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  const sectionAccordions=sections.map(key=>{
    const label=_sectionLabels[key]||key;
    const data=sectionData[key];
    if(!data) return '';
    let rows='';
    if(key==='timeline'){
      const arr=Array.isArray(data)?data:[];
      if(!arr.length) return '';
      rows=arr.slice().sort((a,b)=>(a.time||'').localeCompare(b.time||'')).map(r=>`<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--pub-border)"><span style="font-size:12px;color:var(--pub-accent);min-width:52px;flex-shrink:0;font-weight:500">${_escHtml(r.time||'')}</span><div><div style="font-size:12.5px;font-weight:500;color:var(--pub-ink)">${_escHtml(r.title||'')}${r.location?`<span style="font-weight:400;color:var(--pub-text)"> · ${_escHtml(r.location)}</span>`:''}</div>${r.notes?`<div style="font-size:11.5px;color:var(--pub-text);margin-top:2px">${_escHtml(r.notes)}</div>`:''}</div></div>`).join('');
    } else if(key==='checklist'){
      const arr=Array.isArray(data)?data:[];
      if(!arr.length) return '';
      rows=arr.map(r=>{const done=r.done||r.completed;return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid var(--pub-border)"><span style="font-size:14px;color:${done?'var(--pub-accent)':'var(--pub-border)'};line-height:1.3">${done?'✓':'○'}</span><span style="font-size:12.5px;color:var(--pub-ink)${done?';text-decoration:line-through;opacity:.6':''}">${_escHtml(r.task||r.title||r.name||'')}</span></div>`;}).join('');
    } else if(key==='contacts'){
      const arr=Array.isArray(data)?data:[];
      if(!arr.length) return '';
      rows=arr.map(r=>`<div style="padding:9px 0;border-bottom:1px solid var(--pub-border)"><div style="font-size:12.5px;font-weight:500;color:var(--pub-ink)">${_escHtml(r.business||r.contact||'')}</div>${r.contact&&r.business?`<div style="font-size:11.5px;color:var(--pub-text)">${_escHtml(r.contact)}</div>`:''}${r.phone?`<div style="font-size:11.5px;color:var(--pub-text)">${_escHtml(r.phone)}</div>`:''}${r.email?`<div style="font-size:11.5px;color:var(--pub-text)">${_escHtml(r.email)}</div>`:''}</div>`).join('');
    } else if(key==='budget'){
      const arr=Array.isArray(data)?data:[];
      if(!arr.length) return '';
      rows=arr.map(r=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--pub-border)"><span style="font-size:12.5px;color:var(--pub-ink)">${_escHtml(r.item||r.description||r.name||'')}</span><span style="font-size:12.5px;font-weight:500;color:var(--pub-ink)">${r.amount!=null?'$'+Number(r.amount).toLocaleString('en-AU'):''}</span></div>`).join('');
    } else if(key==='notes'){
      const text=((data.brief||'')+(data.brief&&data.notes?'\n\n':'')+(data.notes||'')).trim();
      if(!text) return '';
      rows=`<pre style="white-space:pre-wrap;font-size:12.5px;color:var(--pub-ink);margin:0;font-family:inherit;line-height:1.5">${_escHtml(text)}</pre>`;
    }
    if(!rows) return '';
    return `<details class="vpb-acc"><summary>${label}${_chev}</summary><div class="vpb-body">${rows}</div></details>`;
  }).filter(Boolean).join('');

  _publicPageShell(`
    ${_publicCss(theme.accent,theme.page,theme.band,theme.heading,theme.text,theme.headFont,theme.bodyFont)}
    <button class="pub-theme-btn" onclick="_pubToggleTheme()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      Theme
    </button>
    <div class="pub-header">
      <div class="pub-eyebrow" style="font-size:10px;letter-spacing:.13em;display:inline-block;background:color-mix(in srgb,var(--pub-accent) 20%,transparent 80%);border:1px solid color-mix(in srgb,var(--pub-accent) 40%,transparent 60%);border-radius:16px;padding:3px 10px;margin-bottom:12px">Vendor brief</div>
      <div class="pub-couple">${coupleName||'Wedding'}</div>
      ${vendor.vendor_name?`<div class="pub-dateline">Shared with: ${vendor.vendor_name}</div>`:''}
      <div class="pub-divider"></div>
    </div>
    <div class="pub-body">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 13px;background:color-mix(in srgb,var(--pub-accent) 10%,transparent 90%);border:1px solid color-mix(in srgb,var(--pub-accent) 30%,transparent 70%);border-radius:8px;font-size:12px;color:var(--pub-text)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Read-only view
      </div>
      <div style="background:var(--pub-surface);border:1px solid var(--pub-border);border-radius:12px;overflow:hidden">
        <div style="padding:12px 16px;background:color-mix(in srgb,var(--pub-accent) 12%,transparent 88%);border-bottom:1px solid var(--pub-border);display:flex;align-items:center;gap:8px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--pub-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span style="font-size:13px;font-weight:600;color:var(--pub-ink)">Your booking</span>
        </div>
        ${bookingRows.map(([k,v],i)=>`<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:9px 16px;gap:12px${i?';border-top:1px solid var(--pub-border)':''}">
          <span style="font-size:12px;color:var(--pub-text);flex-shrink:0">${k}</span>
          <span style="font-size:13px;color:var(--pub-ink);font-weight:500;text-align:right">${k==='Guest count'?`<span style="font-size:17px;font-family:'Cormorant Garamond',serif">${v}</span>`:v}</span>
        </div>`).join('')}
      </div>
      ${sectionAccordions?`<div>
        <style>.vpb-acc{background:var(--pub-surface);border:1px solid var(--pub-border);border-radius:12px;overflow:hidden;margin-bottom:0}.vpb-acc summary{list-style:none;padding:12px 16px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:600;color:var(--pub-ink)}.vpb-acc summary::-webkit-details-marker{display:none}.vpb-chev{transition:transform .2s;flex-shrink:0}.vpb-acc[open] .vpb-chev{transform:rotate(180deg)}.vpb-body{padding:0 16px 14px;border-top:1px solid var(--pub-border)}</style>
        <div style="font-size:10.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--pub-accent);padding-bottom:8px;border-bottom:1px solid var(--pub-border);margin-bottom:10px">Also shared with you</div>
        <div style="display:flex;flex-direction:column;gap:8px">${sectionAccordions}</div>
      </div>`:''}
      <div>
        <div style="font-size:10.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--pub-accent);padding-bottom:8px;border-bottom:1px solid var(--pub-border);margin-bottom:10px">Contact</div>
        <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--pub-surface);border:1px solid var(--pub-border);border-radius:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--pub-accent);display:flex;align-items:center;justify-content:center;color:#fff;font-family:'Cormorant Garamond',serif;font-size:17px;flex-shrink:0">${(matchedVendor.contact||'?')[0]}</div>
          <div>
            <div style="font-size:13px;font-weight:500;color:var(--pub-ink)">${matchedVendor.contact||'—'}</div>
            ${matchedVendor.email?`<div style="font-size:11.5px;color:var(--pub-text);margin-top:1px">${matchedVendor.email}</div>`:''}
          </div>
        </div>
      </div>
    </div>
    <style>
      .vb-footer{padding:16px 24px 24px;display:flex;flex-direction:column;align-items:center;gap:4px}
      .vb-ft-lbl{font-size:9px;letter-spacing:.1em;color:var(--pub-text);opacity:.5;text-transform:uppercase;line-height:1}
      .vb-ft-lock a{display:inline-flex;align-items:center;gap:6px;text-decoration:none;opacity:.5;transition:opacity .15s}
      .vb-ft-lock a:hover{opacity:.85}
      .vb-ft-crest{height:20px;width:auto;display:block;flex-shrink:0}
      .vb-ft-crest-light{display:block}.vb-ft-crest-dark{display:none}
      .vb-ft-txt{display:flex;flex-direction:column;align-items:flex-start;line-height:1.05;font-family:'Cinzel',serif;font-weight:400}
      .vb-ft-txt b{font-size:11px;letter-spacing:.1em;font-weight:400;color:var(--pub-ink)}
      .vb-ft-txt i{font-size:7.5px;letter-spacing:.18em;font-style:normal;color:var(--pub-text)}
      @media(prefers-color-scheme:dark){.vb-footer:not([data-scheme="light"]) .vb-ft-crest-light{display:none}.vb-footer:not([data-scheme="light"]) .vb-ft-crest-dark{display:block}}
      [data-theme="dark"] .vb-ft-crest-light{display:none}[data-theme="dark"] .vb-ft-crest-dark{display:block}
      [data-theme="light"] .vb-ft-crest-dark{display:none}[data-theme="light"] .vb-ft-crest-light{display:block}
    </style>
    <div class="vb-footer">
      <span class="vb-ft-lbl">Powered by</span>
      <div class="vb-ft-lock">
        <a href="https://unionvault.app" target="_blank" rel="noopener" aria-label="Union Vault">
          <img class="vb-ft-crest vb-ft-crest-light" src="${window.location.origin}/logos/Black%20logo%20(Light%20mode).png" alt="Union Vault" height="20">
          <img class="vb-ft-crest vb-ft-crest-dark" src="${window.location.origin}/logos/White%20logo%20(Dark%20mode).png" alt="Union Vault" height="20">
          <span class="vb-ft-txt"><b>UNION</b><i>VAULT</i></span>
        </a>
      </div>
    </div>
  `);
}

function _showVendorExpired(vendor, couple, theme){
  const ev=(couple&&couple.event)||{};
  const p1=ev.partner1||'', p2=ev.partner2||'';
  const coupleName=(p1&&p2)?`${p1} & ${p2}`:(p1||p2||'the couple');
  _publicPageShell(`
    ${_publicCss((theme&&theme.accent),(theme&&theme.page),(theme&&theme.band))}
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 24px">
      <div style="max-width:400px;width:100%;text-align:center">
        <div class="pub-ring">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div class="pub-eyebrow">Access expired</div>
        <div class="pub-couple" style="font-size:22px;margin-bottom:10px">This link has expired</div>
        <div style="font-size:13.5px;color:var(--pub-text);line-height:1.6">
          Your vendor access link for ${coupleName} has passed its expiry date.<br>
          Please contact them directly to request a new link.
        </div>
        <div class="pub-footer" style="margin-top:20px">Powered by <strong>Union Vault</strong></div>
      </div>
    </div>`);
}

function _showVendorError(type){
  _publicPageShell(`
    ${_publicCss()}
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 24px">
      <div style="max-width:400px;width:100%;text-align:center">
        <div class="pub-ring" style="opacity:.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="pub-eyebrow">${type==='not-found'?'Link not found':'Something went wrong'}</div>
        <div class="pub-couple" style="font-size:22px;margin-bottom:10px">${type==='not-found'?'Vendor link not found':'Error loading page'}</div>
        <div style="font-size:13.5px;color:var(--pub-text);line-height:1.6">${type==='not-found'?'This vendor link doesn\'t exist or has been removed. Please contact the couple for a new link.':'There was a problem loading this page. Please try again or contact the couple directly.'}</div>
      </div>
    </div>`);
}

/* ══ END STAGE 5 PUBLIC PAGES ══════════════════════════════════════════════ */

/* ── BOOT ──────────────────────────────────────────────────────────────────
   The ONE async step the whole app depends on. Every render site reads images
   synchronously via _mediaUrl(), which needs the blob cache populated. So we
   read every blob out of IndexedDB, mint the URLs, migrate any leftover data:
   URLs from the old build, and only THEN render.

   If IndexedDB fails outright (private mode, ancient browser), we still render
   — the planner works, images just show as missing rather than the whole app
   refusing to load. */
(async function boot(){
  // ── Stage 5: intercept public URL params BEFORE the normal app boot ────────
  const _bootParams = new URLSearchParams(window.location.search);
  const _rsvpParam     = _bootParams.get('rsvp');
  const _vendorParam   = _bootParams.get('vendor');
  const _runsheetParam = _bootParams.get('runsheet');
  const _inviteParam   = _bootParams.get('invite');

  if(_rsvpParam){
    // Hide the app shell entirely — this is a public-facing page
    document.body.style.visibility='hidden';
    if(_rsvpParam==='true'){
      // Legacy link — show polite "link has expired / been updated" message
      _showRsvpExpired();
    } else {
      // Valid UID-based link
      await _showRsvpForm(_rsvpParam);
    }
    document.documentElement.style.visibility='';
    document.body.style.visibility='visible';
    return; // do NOT boot the planner app
  }

  if(_vendorParam){
    document.body.style.visibility='hidden';
    await _showVendorPortal(_vendorParam);
    document.body.style.visibility='visible';
    return; // do NOT boot the planner app
  }

  if(_inviteParam){
    // Public "View your invitation" page — the couple's uploaded invitation + RSVP button.
    _showPublicInvite(_inviteParam, _bootParams.get('t')==='pdf');
    return; // do NOT boot the planner app
  }

  if(_runsheetParam){
    // Public run sheet — no login required; fetch couple's public moments from Supabase
    await _showPublicRunSheet(_runsheetParam);
    return; // do NOT boot the planner app
  }

  // Recovery token from password-reset email: #access_token=...&type=recovery
  const _hashParams=new URLSearchParams(window.location.hash.slice(1));
  if(_hashParams.get('type')==='recovery'){
    const _recoveryToken=_hashParams.get('access_token');
    history.replaceState(null,'',window.location.pathname+window.location.search);
    _showResetPasswordModal(_recoveryToken);
    return; // do NOT boot the planner app
  }

  // Load session before public site render so the owner can generate signed URLs for their own photos
  _sbLoadSession();

  const _hashSlug=window.location.hash.slice(1);
  // Reserved landing-page anchors that must never be treated as wedding site slugs
  const _lpAnchors=new Set(['auth','faq','contact','signup','login','register','pricing','features','hero','about']);
  if(_hashSlug && !_lpAnchors.has(_hashSlug) && /^[a-z0-9][a-z0-9-]{0,59}$/.test(_hashSlug)){
    // Hash matches a wedding site slug — render the public wedding website
    document.body.style.visibility='hidden';
    await _showPublicWeddingSite(_hashSlug);
    return; // do NOT boot the planner app
  }
  // ── End Stage 5 URL intercept ───────────────────────────────────────────────
  try{
    await _mediaLoadAll();
    await _mediaMigrate();
    await _refreshStorageEstimate();
  }catch(e){
    console.warn('Media store unavailable', e);
  }

  if(alreadySetUp && _sbSession){
    // Safety: verify local data belongs to the signed-in user before trusting it.
    // This catches stale localStorage left by a different account (e.g. previous session on shared device).
    var _bootUID = null;
    try{ _bootUID = localStorage.getItem('uv_uid'); }catch(_){}
    if(_bootUID && _bootUID !== _sbSession.user.id){
      // Local data belongs to a different user — wipe it and reload so we fetch our own cloud data.
      try{ localStorage.removeItem(STORAGE_KEY); }catch(_){}
      try{ localStorage.setItem('uv_uid', _sbSession.user.id); }catch(_){}
      location.reload();
      return;
    }
    // Fully set up + signed in → go straight to app, then check for cloud conflict
    document.getElementById('welcome-overlay').classList.add('hidden');
    updateTopbarSub();
    if(typeof _updateAccountChip !== 'undefined') _updateAccountChip();
    navigate('dashboard');
    // Stage 3: async conflict check (runs after UI is visible, non-blocking)
    setTimeout(_autoSyncCheckOnBoot, 800);
    // Stage 4: fetch any photos missing locally (runs after conflict check)
    setTimeout(_mediaCloudSync, 2000);
  } else if(!alreadySetUp && _sbSession){
    // Signed in but no local data: triggered by sign-in on a device that had another account's data
    // (the mismatch handler in _lpSignIn cleared localStorage and reloaded). Auto-load from cloud.
    var _bootCloud = await _cloudLoad();
    if(_bootCloud.ok && !_bootCloud.empty){
      if(_bootCloud.saved.event)    Object.assign(STATE.event, _bootCloud.saved.event);
      if(_bootCloud.saved.settings) Object.assign(STATE.settings, _bootCloud.saved.settings);
      ['guests','checklist','vendors','quotes','checklistCategories','checklistDrafts','checklistCatOrder','tables','timeline','families','invites'].forEach(function(k){ if(_bootCloud.saved[k]) STATE[k]=_bootCloud.saved[k]; });
      ['budget','seating','inspo','visionboard','wishingwell','website','events','tagDefs','inviteMeta','invitation','dashWidgetOrder','dashLayout','dashHiddenWidgets'].forEach(function(k){ if(_bootCloud.saved[k]) STATE[k]=_bootCloud.saved[k]; });
      saveToStorage();
      document.getElementById('welcome-overlay').classList.add('hidden');
      updateTopbarSub();
      navigate('dashboard');
      // Only skip setup if partner names were actually entered
      if(STATE.event.partner1 || STATE.event.partner2){
        if(typeof _cloudToast !== 'undefined') _cloudToast('Your data has been restored from the cloud ✓');
        window._autoSyncState='saved'; window._autoSyncLastSaved=Date.now();
        if(typeof _syncStatusRefresh !== 'undefined') _syncStatusRefresh();
        setTimeout(_mediaCloudSync, 800);
      } else {
        _showSetupModal();
      }
    } else {
      // No cloud data for this account → show setup
      document.getElementById('welcome-overlay').classList.add('hidden');
      updateTopbarSub();
      navigate('dashboard');
      _showSetupModal();
    }
  } else if(alreadySetUp && !_sbSession){
    // Has local data but not signed in → show landing (auth prompt)
    updateTopbarSub();
    navigate('dashboard');
    document.getElementById('welcome-overlay').classList.remove('hidden');
  } else {
    // First-time visitor → show landing first; after auth/_lpContinueOffline the setup modal appears
    updateTopbarSub();
    navigate('dashboard');
    document.getElementById('welcome-overlay').classList.remove('hidden');
  }
})();
