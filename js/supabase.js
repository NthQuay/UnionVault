// SUPABASE LIGHTWEIGHT CLIENT (inline)
// ═══════════════════════════════════════
const _SB_URL  = 'https://hzafdlfprtzfxtyaebmc.supabase.co';
const _SB_KEY  = 'sb_publishable_hWMFKVxJTRH3UqcC9GN_WA_gJ2GNX5T';
const _SB_SK   = 'uv_sb_session';
const _W3F_KEY = '4a1fd2ee-df65-4513-b07c-2de79bf07506';
// One-time migration: carry over any existing session from the old key
(function(){ try{ const old=localStorage.getItem('ea_sb_session'); if(old&&!localStorage.getItem('uv_sb_session')){ localStorage.setItem('uv_sb_session',old); localStorage.removeItem('ea_sb_session'); } }catch(_){} })();
let _sbSession = null;

async function _sbAuthPost(path, payload){
  const r = await fetch(_SB_URL+'/auth/v1'+path,{
    method:'POST',
    headers:{'apikey':_SB_KEY,'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  const ct=r.headers.get('content-type')||'';
  const b = ct.includes('json') ? await r.json() : await r.text();
  return {ok:r.ok,b};
}
function _sbPersist(s){
  _sbSession=s;
  try{ localStorage.setItem(_SB_SK,JSON.stringify(s)); }catch(_){}
  // When clearing the session, remove data-uv-auth so the CSS overlay guard lifts immediately.
  // Without this, html[data-uv-auth]#welcome-overlay{display:none!important} keeps the landing
  // page hidden after token expiry, leaving the Settings sign-in modal as the only auth path —
  // which has historically been a cross-account contamination vector.
  if(!s){ try{ document.documentElement.removeAttribute('data-uv-auth'); }catch(_){} }
  _sbListeners.forEach(fn=>{ try{fn(s?s.user:null);}catch(_){} });
}
function _sbLoadSession(){
  try{ const r=localStorage.getItem(_SB_SK); if(r){_sbSession=JSON.parse(r);return true;} }catch(_){}
  return false;
}
const _sbListeners=[];
function _sbOnAuthChange(fn){ _sbListeners.push(fn); }
function _sbAuthHdr(){ return _sbSession?'Bearer '+_sbSession.access_token:'Bearer '+_SB_KEY; }

async function _sbSignUp(email,pw){
  const r=await _sbAuthPost('/signup',{email,password:pw});
  if(!r.ok){
    const msg=r.b.msg||r.b.error_description||r.b.message||r.b.error||JSON.stringify(r.b);
    console.error('[EAP signup error]',r.b);
    return {error:msg};
  }
  return {ok:true};
}
async function _sbSignIn(email,pw){
  const r=await _sbAuthPost('/token?grant_type=password',{email,password:pw});
  if(!r.ok) return {error:r.b.error_description||r.b.msg||r.b.message||'Sign-in failed'};
  const s={access_token:r.b.access_token,refresh_token:r.b.refresh_token,user:{id:r.b.user.id,email:r.b.user.email}};
  _sbPersist(s); return {ok:true,user:s.user};
}
async function _sbSignOut(){
  if(_sbSession){
    try{ await fetch(_SB_URL+'/auth/v1/logout',{method:'POST',headers:{'apikey':_SB_KEY,'Authorization':_sbAuthHdr()}}); }catch(_){}
  }
  _sbPersist(null);
  try{ localStorage.removeItem(_SB_SK); }catch(_){}
  // Clear app data so a different user signing in on the same device starts clean
  try{ localStorage.removeItem(STORAGE_KEY); }catch(_){}
}
async function _sbResetPassword(email){
  const r=await _sbAuthPost('/recover',{email});
  if(!r.ok) return {error:r.b.msg||r.b.error_description||r.b.message||r.b.error||'Reset failed'};
  return {ok:true};
}
async function _sbUpdatePassword(accessToken, newPassword){
  const r=await fetch(_SB_URL+'/auth/v1/user',{
    method:'PUT',
    headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'},
    body:JSON.stringify({password:newPassword})
  });
  const b=await r.json().catch(()=>({}));
  if(!r.ok) return {error:b.msg||b.error_description||b.message||b.error||'Update failed'};
  return {ok:true};
}
function _showResetPasswordModal(token){
  const overlay=document.createElement('div');
  overlay.id='pw-reset-overlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;background:var(--cream,#f5f0e8);font-family:var(--font-serif,Georgia,serif)';
  overlay.innerHTML=`
    <div style="background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.14);padding:40px 36px;width:100%;max-width:400px;margin:20px">
      <div style="text-align:center;margin-bottom:28px">
        <img src="/logos/Black%20full%20(Light%20mode).png" alt="Union Vault" style="max-width:160px;max-height:70px;display:block;margin:0 auto 16px">
        <h2 style="margin:0;font-size:22px;font-weight:normal;color:#2c2416;letter-spacing:0.03em">Choose a new password</h2>
      </div>
      <div id="pw-reset-err" style="display:none;font-size:12px;color:#c0392b;margin-bottom:14px;padding:8px 10px;background:rgba(192,57,43,0.08);border-radius:6px"></div>
      <div id="pw-reset-ok" style="display:none;font-size:13px;color:#27ae60;margin-bottom:14px;padding:10px 12px;background:rgba(39,174,96,0.08);border-radius:6px;text-align:center"></div>
      <div style="margin-bottom:14px">
        <label style="display:block;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a5a;margin-bottom:6px">New password</label>
        <div style="position:relative">
          <input id="pw-reset-pw1" type="password" placeholder="At least 8 characters" autocomplete="new-password"
            style="width:100%;box-sizing:border-box;padding:11px 44px 11px 14px;border:1px solid #ddd;border-radius:8px;font-size:15px;font-family:inherit;outline:none">
          <button type="button" onclick="_togglePw('pw-reset-pw1',this)" tabindex="-1" aria-label="Show password"
            style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:4px;color:var(--muted,#9a8a6a);line-height:1;display:flex;align-items:center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
      <div style="margin-bottom:24px">
        <label style="display:block;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8a7a5a;margin-bottom:6px">Confirm password</label>
        <div style="position:relative">
          <input id="pw-reset-pw2" type="password" placeholder="Same password again" autocomplete="new-password"
            style="width:100%;box-sizing:border-box;padding:11px 44px 11px 14px;border:1px solid #ddd;border-radius:8px;font-size:15px;font-family:inherit;outline:none">
          <button type="button" onclick="_togglePw('pw-reset-pw2',this)" tabindex="-1" aria-label="Show password"
            style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:4px;color:var(--muted,#9a8a6a);line-height:1;display:flex;align-items:center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
      <button id="pw-reset-btn" onclick="_doResetPassword('${token}')"
        style="width:100%;padding:13px;background:var(--gold-deep,#b8923a);color:#fff;border:none;border-radius:8px;font-size:15px;font-family:inherit;letter-spacing:0.06em;cursor:pointer;font-weight:600">
        Set new password
      </button>
    </div>`;
  document.body.appendChild(overlay);
}
async function _doResetPassword(token){
  const pw1=(document.getElementById('pw-reset-pw1').value||'').trim();
  const pw2=(document.getElementById('pw-reset-pw2').value||'').trim();
  const errEl=document.getElementById('pw-reset-err');
  const okEl=document.getElementById('pw-reset-ok');
  const btn=document.getElementById('pw-reset-btn');
  errEl.style.display='none'; okEl.style.display='none';
  if(pw1.length<8){errEl.textContent='Password must be at least 8 characters.';errEl.style.display='';return;}
  if(pw1!==pw2){errEl.textContent='Passwords do not match.';errEl.style.display='';return;}
  btn.disabled=true; btn.textContent='Saving…';
  const r=await _sbUpdatePassword(token,pw1);
  btn.disabled=false; btn.textContent='Set new password';
  if(!r.ok){errEl.textContent=r.error;errEl.style.display='';return;}
  okEl.textContent='Password updated! Signing you in…';
  okEl.style.display='';
  // Wait a beat then remove overlay and boot the app normally
  setTimeout(()=>{
    const el=document.getElementById('pw-reset-overlay');
    if(el) el.remove();
    location.reload();
  },1800);
}
setInterval(async()=>{
  if(!_sbSession||!_sbSession.refresh_token) return;
  const r=await _sbAuthPost('/token?grant_type=refresh_token',{refresh_token:_sbSession.refresh_token});
  if(r.ok) _sbPersist({access_token:r.b.access_token,refresh_token:r.b.refresh_token,user:{id:r.b.user.id,email:r.b.user.email}});
},55*60*1000);

function _sbTokenExpired(){
  if(!_sbSession||!_sbSession.access_token) return true;
  try{
    const payload=JSON.parse(atob(_sbSession.access_token.split('.')[1]));
    return payload.exp*1000-Date.now()<5*60*1000; // refresh if <5 min remaining
  }catch(_){ return false; }
}
async function _sbEnsureFreshToken(){
  if(!_sbTokenExpired()) return;
  if(!_sbSession||!_sbSession.refresh_token) return;
  const r=await _sbAuthPost('/token?grant_type=refresh_token',{refresh_token:_sbSession.refresh_token});
  if(r.ok) _sbPersist({access_token:r.b.access_token,refresh_token:r.b.refresh_token,user:{id:r.b.user.id,email:r.b.user.email}});
}

async function _sbUpsert(table,rows,conflict,keepalive){
  const url=conflict?`${_SB_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`:`${_SB_URL}/rest/v1/${table}`;
  const body=JSON.stringify(rows);
  // keepalive keeps the request alive through tab close (browser limit ~64KB)
  const opts={method:'POST',headers:{'apikey':_SB_KEY,'Authorization':_sbAuthHdr(),'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body};
  if(keepalive && body.length<60000) opts.keepalive=true;
  const r=await fetch(url,opts);
  return r.ok;
}
async function _sbSelect(table,filter){
  const r=await fetch(`${_SB_URL}/rest/v1/${table}?${filter}`,{
    headers:{'apikey':_SB_KEY,'Authorization':_sbAuthHdr(),'Content-Type':'application/json'}
  });
  if(!r.ok) return null; return r.json();
}

// ── Cloud save / load ──────────────────────────────────────
const _CS=['event','settings','guests','checklist','vendors','quotes',
  'checklistCategories','checklistDrafts','checklistCatOrder',
  'budget','tables','seating','inspo','visionboard','wishingwell',
  'website','timeline','events','tagDefs','families',
  'invites','inviteMeta','invitation','dashWidgetOrder','dashLayout','dashHiddenWidgets'];

async function _cloudSave(silent,keepalive){
  if(!_sbSession) return {error:'Not signed in'};
  await _sbEnsureFreshToken();
  const uid=_sbSession.user.id;
  // Stamp the last-save timestamp so conflict check can compare
  if(!STATE.settings) STATE.settings={};
  STATE.settings._lastCloudSave=new Date().toISOString();
  const pay={
    event:STATE.event, settings:Object.assign({},STATE.settings,{_ownerUid:uid}), guests:STATE.guests,
    checklist:STATE.checklist, vendors:STATE.vendors||[], quotes:STATE.quotes||[],
    checklistCategories:STATE.checklistCategories||[],
    checklistDrafts:STATE.checklistDrafts||[],
    checklistCatOrder:STATE.checklistCatOrder||[],
    budget:STATE.budget, tables:STATE.tables, seating:STATE.seating,
    inspo:STATE.inspo, visionboard:STATE.visionboard,
    wishingwell:STATE.wishingwell, website:STATE.website,
    timeline:STATE.timeline||[], events:STATE.events,
    tagDefs:STATE.tagDefs||{}, families:STATE.families||[],
    invites:STATE.invites||[], inviteMeta:STATE.inviteMeta||{}, invitation:STATE.invitation||{},
    dashWidgetOrder:STATE.dashWidgetOrder,
    dashLayout:STATE.dashLayout, dashHiddenWidgets:STATE.dashHiddenWidgets
  };
  // Ensure all locally-available images have been uploaded to Storage before
  // persisting the media IDs to the database (runs once per session).
  if(!keepalive) await _mediaEnsureUploaded();
  const rows=_CS.map(s=>({user_id:uid,section:s,data:pay[s]??{},updated_at:STATE.settings._lastCloudSave}));
  const ok=await _sbUpsert('planner_data',rows,'user_id,section',keepalive);
  if(ok){
    // Persist the updated _lastCloudSave timestamp to localStorage directly
    // (avoids recursion since saveToStorage → _autoSyncSchedule → flush loop)
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      const stored=raw?JSON.parse(raw):{};
      if(!stored.settings) stored.settings={};
      stored.settings._lastCloudSave=STATE.settings._lastCloudSave;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(stored));
    }catch(e){ console.warn('Could not persist _lastCloudSave',e); }
  }
  return ok?{ok:true,silent}:{error:'Save failed — check your connection.'};
}

async function _cloudLoad(){
  if(!_sbSession) return {error:'Not signed in'};
  const uid=_sbSession.user.id;
  const rows=await _sbSelect('planner_data',`user_id=eq.${uid}&select=section,data`);
  if(!rows) return {error:'Load failed — check your connection.'};
  if(!rows.length) return {ok:true,empty:true};
  const saved={hasSetup:true};
  rows.forEach(r=>{saved[r.section]=r.data;});
  // Sanity check: if data was stamped with a different owner UID, it's contaminated — treat as empty.
  // _ownerUid is written by _cloudSave; old data without it passes through unchecked.
  if(saved.settings&&saved.settings._ownerUid&&saved.settings._ownerUid!==uid){
    return {ok:true,empty:true};
  }
  return {ok:true,saved};
}

let _cldSaving=false;
async function cloudSaveClick(){
  if(_cldSaving) return; _cldSaving=true;
  const btn=document.getElementById('cloud-save-btn');
  if(btn){btn.disabled=true;btn.innerHTML='Saving…';}
  window._autoSyncState='saving'; _syncStatusRefresh();
  const r=await _cloudSave(); _cldSaving=false;
  if(btn){btn.disabled=false;btn.innerHTML=_csvBtnHtml();}
  if(r.ok){
    window._autoSyncState='saved';
    window._autoSyncLastSaved=Date.now();
  } else {
    window._autoSyncState='error';
  }
  _syncStatusRefresh();
  _cloudToast(r.ok?'Saved to cloud ✓':(r.error||'Save failed'),!r.ok);
}
async function cloudLoadClick(silent){
  const btn=document.getElementById('cloud-load-btn');
  if(btn){btn.disabled=true;btn.innerHTML='Loading…';}
  const r=await _cloudLoad();
  if(btn){btn.disabled=false;btn.innerHTML=_cldBtnHtml();}
  if(!r.ok){if(!silent)_cloudToast(r.error||'Load failed',true);return;}
  if(r.empty){if(!silent)_cloudToast('No cloud data yet — save from this device first.');return;}
  // Snapshot local families before cloud data overwrites them — families not yet
  // uploaded (created on this device since last cloud save) must be preserved
  const _localFamiliesBeforeLoad = STATE.families ? STATE.families.slice() : [];
  if(r.saved.event)    Object.assign(STATE.event,r.saved.event);
  if(r.saved.settings) Object.assign(STATE.settings,r.saved.settings);
  ['guests','checklist','vendors','quotes','checklistCategories','checklistDrafts','checklistCatOrder','tables','timeline','families','invites'].forEach(k=>{if(r.saved[k])STATE[k]=r.saved[k];});
  ['budget','seating','inspo','visionboard','wishingwell','website','events','tagDefs','inviteMeta','invitation','dashWidgetOrder','dashLayout','dashHiddenWidgets'].forEach(k=>{if(r.saved[k])STATE[k]=r.saved[k];});
  // Re-add any local-only families (not present in cloud) whose members still
  // exist in the cloud-loaded guest list — this is why couple links survive but
  // family groups were clearing: couples live on guest objects, families don't
  { const gids=new Set((STATE.guests||[]).map(g=>g.id));
    const cids=new Set((STATE.families||[]).map(f=>f.id));
    const extras=_localFamiliesBeforeLoad.filter(f=>!cids.has(f.id)&&f.memberIds.filter(id=>gids.has(id)).length>=2);
    if(extras.length) STATE.families=(STATE.families||[]).concat(extras); }
  saveToStorage();
  // Cancel the auto-sync push-back that saveToStorage just scheduled — data came FROM the cloud
  // so there is nothing to push; the next real user edit will reschedule it naturally
  if(typeof _autoSyncTimer!=='undefined' && _autoSyncTimer){ clearTimeout(_autoSyncTimer); _autoSyncTimer=null; }
  if(typeof updateTopbarSub==='function') updateTopbarSub();
  navigate(_currentPage||'dashboard');
  if(!silent) _cloudToast('Loaded from cloud ✓');
  // Mark sync status as fresh after load
  window._autoSyncState='saved';
  window._autoSyncLastSaved=Date.now();
  _syncStatusRefresh();
  // Stage 4: background-fetch any photos missing on this device
  setTimeout(_mediaCloudSync, 500);
}

// Called by the manual "Load from cloud" button — silently backs up local state first
// so the user can always recover if they accidentally overwrite the wrong version.
async function cloudLoadManual(){
  await _backupNow(null,true); // silent — errors don't block the load
  await cloudLoadClick();
}
function _csvBtnHtml(){return'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Save to cloud';}
function _cldBtnHtml(){return'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Load from cloud';}

function _cloudToast(msg,isErr=false){
  let t=document.getElementById('cloud-toast');
  if(!t){t=document.createElement('div');t.id='cloud-toast';t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9000;background:var(--ink);color:var(--cream);padding:10px 18px;border-radius:20px;font-size:13px;pointer-events:none;opacity:0;transition:opacity .2s;white-space:nowrap;max-width:90vw;text-align:center';document.body.appendChild(t);}
  t.textContent=msg; t.style.background=isErr?'#c0392b':'var(--ink)'; t.style.opacity='1';
  clearTimeout(t._to); t._to=setTimeout(()=>{t.style.opacity='0';},3200);
}


// ══════════════════════════════════════════════
