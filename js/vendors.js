// CUSTOM TIME PICKER (12-hour, 5-min steps)
// Stores HH:MM (24h) in a hidden input #<id>; shows a styled field + inline panel.
// ══════════════════════════════════════════════
function _tpParse(hhmm){
  if(!hhmm||hhmm.indexOf(':')<0) return null;
  let [h,m]=hhmm.split(':').map(Number);
  if(isNaN(h)||isNaN(m)) return null;
  const ap=h<12?'AM':'PM'; let h12=h%12; if(h12===0) h12=12;
  m=Math.round(m/5)*5; if(m===60){m=0;}
  return {h12,m,ap};
}
function _tpTo24(h12,m,ap){
  let h=h12%12; if(ap==='PM') h+=12;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function _tpDisplay(hhmm){
  const p=_tpParse(hhmm);
  if(!p) return '';
  return `${p.h12}:${String(p.m).padStart(2,'0')} ${p.ap}`;
}
// Build the picker. `id` is the hidden input id used by the rest of the app.
function _timePickerHtml(id, value){
  const disp=_tpDisplay(value);
  return `<div class="tp" data-tp="${id}">
    <input type="hidden" id="${id}" value="${value||''}"/>
    <button type="button" class="form-input tp-field" onclick="_tpToggle('${id}')" style="text-align:left;display:flex;align-items:center;gap:8px;cursor:pointer">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span class="tp-disp" id="${id}-disp" style="${disp?'':'color:var(--muted)'}">${disp||'Set time'}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;color:var(--muted)"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div class="tp-panel" id="${id}-panel" style="display:none">
      <div class="tp-cols">
        <div class="tp-col" id="${id}-col-h"></div>
        <div class="tp-col" id="${id}-col-m"></div>
        <div class="tp-col tp-col-ap" id="${id}-col-ap"></div>
      </div>
    </div>
  </div>`;
}
let _tpOpen=null;
function _tpToggle(id){
  const panel=document.getElementById(id+'-panel'); if(!panel) return;
  const isOpen=panel.style.display!=='none';
  // close any other open picker
  if(_tpOpen && _tpOpen!==id){ const other=document.getElementById(_tpOpen+'-panel'); if(other) other.style.display='none'; }
  if(isOpen){ panel.style.display='none'; _tpOpen=null; return; }
  _tpRender(id);
  panel.style.display='block';
  _tpOpen=id;
  _tpEnsureOutsideCloser();
}
function _tpState(id){
  const cur=document.getElementById(id)?.value||'';
  return _tpParse(cur) || {h12:9,m:0,ap:'AM'};
}
function _tpRender(id){
  const st=_tpState(id);
  const colH=document.getElementById(id+'-col-h');
  const colM=document.getElementById(id+'-col-m');
  const colA=document.getElementById(id+'-col-ap');
  if(!colH||!colM||!colA) return;
  const hours=[]; for(let h=1;h<=12;h++) hours.push(h);
  const mins=[]; for(let m=0;m<60;m+=5) mins.push(m);
  colH.innerHTML=hours.map(h=>`<div class="tp-opt ${h===st.h12?'on':''}" onclick="_tpPick('${id}','h',${h})">${h}</div>`).join('');
  colM.innerHTML=mins.map(m=>`<div class="tp-opt ${m===st.m?'on':''}" onclick="_tpPick('${id}','m',${m})">${String(m).padStart(2,'0')}</div>`).join('');
  colA.innerHTML=['AM','PM'].map(a=>`<div class="tp-opt ${a===st.ap?'on':''}" onclick="_tpPick('${id}','ap','${a}')">${a}</div>`).join('');
  // scroll the selected hour/minute into view within each column
  setTimeout(()=>{ ['-col-h','-col-m'].forEach(sfx=>{ const c=document.getElementById(id+sfx); const on=c&&c.querySelector('.tp-opt.on'); if(on&&on.scrollIntoView) on.scrollIntoView({block:'center'}); }); },0);
}
function _tpPick(id, which, val){
  const st=_tpState(id);
  if(which==='h') st.h12=val;
  else if(which==='m') st.m=val;
  else if(which==='ap') st.ap=val;
  const v=_tpTo24(st.h12,st.m,st.ap);
  const hid=document.getElementById(id); if(hid) hid.value=v;
  const disp=document.getElementById(id+'-disp'); if(disp){ disp.textContent=_tpDisplay(v); disp.style.color='var(--ink)'; }
  // re-highlight without closing, so the user can fine-tune across columns
  _tpRender(id);
  if(_tpHooks[id]) try{ _tpHooks[id](v); }catch(e){}
}
const _tpHooks={};
// Outside-click closer: when a picker is open, a click anywhere outside its own
// .tp wrapper commits the live value (already written on each pick) and closes the
// panel. Clicks on the hour/minute/AM-PM cells stay inside the wrapper, so they
// keep the panel open for fine-tuning. Installed once.
let _tpOutsideBound=false;
function _tpEnsureOutsideCloser(){
  if(_tpOutsideBound) return;
  _tpOutsideBound=true;
  document.addEventListener('mousedown', function(ev){
    if(!_tpOpen) return;
    const wrap=document.querySelector('.tp[data-tp="'+_tpOpen+'"]');
    if(wrap && !wrap.contains(ev.target)){
      const panel=document.getElementById(_tpOpen+'-panel');
      if(panel) panel.style.display='none';
      _tpOpen=null;
    }
  }, true);
}

// ══════════════════════════════════════════════
// APPOINTMENTS v2 — list per task, popup-based add/edit/view/delete/email
// Each task holds task.appointments = [ {id, type, date, time, endTime, virtual,
//   address, link, pass, contact, phone, email, fee, notes, emailMe, recipients[]} ]
// ══════════════════════════════════════════════
const APPT_TYPES = ['Appointment','Fitting','Booking','Rehearsal','Tasting','Tour','Meeting'];
const APPT_TYPES_MORE = ['Consultation','Trial','Showcase'];
let _apptTypeShowMore = false;
// ══════════════════════════════════════════════
// Vendors — business-card list, sourced from appointments or added manually.
// vendor = {id, business, category, status, contact, phone, email, address, website,
//   notes, fee, fromApptId}  ·  status ∈ possible|confirmed|booked
// ══════════════════════════════════════════════
const VENDOR_CATEGORIES = ['Bridal shop','Caterer','Celebrant / Officiant','Ceremony venue','Entertainment','Florist','Hair & makeup artist','MC','Photographer','Reception location','Transport / Transfers','Videographer'];
// Effective vendor category list = built-in defaults + any user-added categories.
// Custom categories live in STATE.vendorCustomCats and persist with the data, so a
// category typed via "Other…" becomes a permanent option for every future vendor.
function vendorCats(){
  const custom=(STATE.vendorCustomCats||[]).filter(c=>c && !VENDOR_CATEGORIES.includes(c));
  return [...VENDOR_CATEGORIES, ...custom];
}
// Register a new custom vendor category (no-op if blank or already present, case-insensitive).
// Returns the canonical name to select.
function addVendorCategory(name){
  const n=(name||'').trim();
  if(!n) return '';
  const existing=vendorCats().find(c=>c.toLowerCase()===n.toLowerCase());
  if(existing) return existing;
  if(!Array.isArray(STATE.vendorCustomCats)) STATE.vendorCustomCats=[];
  STATE.vendorCustomCats.push(n);
  saveToStorage();
  return n;
}
function _deleteVendorCategory(btn){
  const name=btn.dataset.cat;
  if(!Array.isArray(STATE.vendorCustomCats)) return;
  STATE.vendorCustomCats=STATE.vendorCustomCats.filter(c=>c!==name);
  saveToStorage();
  btn.closest('.ven-custom-cat-chip')?.remove();
  const sel=document.getElementById('ven-f-category');
  if(sel) Array.from(sel.options).forEach(o=>{if(o.value===name)o.remove();});
}
const RELIGION_OPTIONS = ['Atheist','Buddhism','Christianity','Hinduism','Islam','Jewish','Non-Religious Ceremony','Sikhism'];
const OFFICIANT_OPTIONS = ['Cantor','Celebrant','Granthi','Imam','Islamic Scholar','Minister','Monk','Pandit','Pastor','Priest','Purohit','Qadi','Rabbi','Vicar'];
const CEREMONY_VENUE_OPTIONS = ['Banquet Hall','Beach','Chapel','Church','Garden','Generic Venue','Hall','Mosque','Synagogue','Temple'];
const VENDOR_STATUSES = ['possible','confirmed','booked','not_suitable'];
function _vendorNewId(){ return 'vd'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
// All appointments across every task, each tagged with its owning task id.
function _allAppointments(){
  const out=[];
  (STATE.checklist||[]).forEach(t=>{ _taskApptList(t).forEach(a=>out.push({appt:a, taskId:t.id})); });
  return out;
}
function _findAppt(taskId, apptId){
  if(taskId){ const t=STATE.checklist.find(x=>x.id===taskId); return t?_taskApptList(t).find(a=>a.id===apptId):null; }
  const hit=_allAppointments().find(x=>x.appt.id===apptId); return hit?hit.appt:null;
}
// A vendor matches an appointment/contact when phone OR email OR contact/business name lines up.
function _norm(s){ return String(s||'').trim().toLowerCase().replace(/\s+/g,' '); }
function _digits(s){ return String(s||'').replace(/[^\d]/g,''); }
function _vendorMatches(v, src){
  if(src && src.vendorId && src.vendorId===v.id) return true;
  const ph=_digits(src.phone), em=_norm(src.email);
  if(ph && _digits(v.phone)===ph) return true;
  if(em && _norm(v.email)===em) return true;
  const names=[_norm(src.business), _norm(src.contact)].filter(Boolean);
  const vnames=[_norm(v.business), _norm(v.contact)].filter(Boolean);
  return names.some(n=>vnames.includes(n));
}
// Why an appointment matched a vendor (for display). Returns '' if no match.
function _vendorApptMatchReason(v, a){
  if(a.vendorId && a.vendorId===v.id) return 'linked to this vendor';
  if(v.fromApptId && a.id===v.fromApptId) return 'created from this vendor';
  const ph=_digits(v.phone); if(ph && _digits(a.phone)===ph) return 'matched by phone';
  const em=_norm(v.email); if(em && _norm(a.email)===em) return 'matched by email';
  const vnames=[_norm(v.business), _norm(v.contact)].filter(Boolean);
  const anames=[_norm(a.business), _norm(a.contact)].filter(Boolean);
  if(anames.some(n=>vnames.includes(n))) return 'matched by name';
  return '';
}
// All appointments that belong to this vendor, each with its task id + reason.
function _vendorAppointments(v){
  const out=[];
  _allAppointments().forEach(({appt,taskId})=>{
    const reason=_vendorApptMatchReason(v, appt);
    if(reason) out.push({appt, taskId, reason});
  });
  return out;
}
// Guess a vendor category from the appointment's business/type/notes text.
function _guessVendorCategory(src){
  const hay=_norm([src.business,src.type,src.notes].join(' '));
  const map=[['florist','Florist'],['floral','Florist'],['flower','Florist'],['photo','Photographer'],['videograph','Videographer'],['video','Videographer'],['cater','Caterer'],['cake','Caterer'],['celebrant','Celebrant / Officiant'],['officiant','Celebrant / Officiant'],['hair','Hair & makeup artist'],['makeup','Hair & makeup artist'],['make-up','Hair & makeup artist'],['beauty','Hair & makeup artist'],['dress','Bridal shop'],['gown','Bridal shop'],['bridal','Bridal shop'],['transfer','Transport / Transfers'],['transport','Transport / Transfers'],['limo','Transport / Transfers'],['car ','Transport / Transfers'],['band','Entertainment'],['dj','Entertainment'],['music','Entertainment'],['mc','MC'],['reception','Reception location'],['venue','Ceremony venue']];
  for(const [k,c] of map){ if(hay.includes(k)) return c; }
  return '';
}
function _vendorFromAppt(a){
  return {
    id:_vendorNewId(),
    business:(a.business||a.contact||a.type||'Vendor').trim(),
    category:_guessVendorCategory(a),
    status:'possible',
    contact:a.contact||'', phone:a.phone||'', email:a.email||'',
    address:a.virtual?'':(a.address||''),
    website:(a.website||'') || (a.virtual&&a.link?'':''),
    notes:a.notes||'', fee:Number(a.fee)||0, fromApptId:a.id
  };
}
// Add a vendor card from an appointment (used by the "+ Add Vendor to List" button).
function _addVendorFromAppt(taskId, apptId){
  const a=_findAppt(taskId, apptId); if(!a) return;
  if(!Array.isArray(STATE.vendors)) STATE.vendors=[];
  const dup=STATE.vendors.find(v=>_vendorMatches(v, a));
  if(typeof _closeConfirm2Direct==='function') _closeConfirm2Direct();
  if(dup){
    _vendorFlash='“'+(dup.business||'This vendor')+'” is already in your vendor list';
  } else {
    const nv=_vendorFromAppt(a);
    STATE.vendors.push(nv);
    a.vendorId=nv.id;
    saveToStorage();
    _vendorFlash='Added to your vendor list';
  }
  navigate('vendors');
}
// A one-shot banner shown at the top of the Vendors page after an action.
let _vendorFlash='';
let _vendorDismissedSuggest = {}; // apptId -> true (dismissed this session)

// ── Select with an "Other → free text" tail ─────────────────────────────────
function _otherSelectHtml(id, options, current){
  const isOther = current && !options.includes(current);
  const opts = options.map(o=>`<option value="${_escHtml(o)}" ${o===current?'selected':''}>${_escHtml(o)}</option>`).join('');
  // A saved custom value appears as its own selected option in the list (not a separate field).
  const customOpt = isOther ? `<option value="${_escHtml(current)}" selected>${_escHtml(current)}</option>` : '';
  return `<select id="${id}" class="form-input" onchange="_otherSelectChange('${id}')" style="font-size:12.5px">
      <option value="" ${!current?'selected':''}>—</option>
      ${opts}
      ${customOpt}
      <option value="__other__">Other…</option>
    </select>
    <input id="${id}-other" class="form-input" placeholder="Type your own" value="" style="font-size:12.5px;margin-top:6px;display:none"/>`;
}
function _otherSelectChange(id){
  const sel=document.getElementById(id); const oth=document.getElementById(id+'-other');
  if(!sel||!oth) return;
  const show = sel.value==='__other__';
  oth.style.display = show?'block':'none';
  if(show) oth.focus();
  // Live-update the ceremony "+ Add" link button as the selection changes.
  if(id==='ven-officiant') _cerRefreshLink('officiant', 'ven-officiant');
  if(id==='ven-cervenue') _cerRefreshLink('venue', 'ven-cervenue');
}
// Rebuild the "+ Add […]" / linked-card block for a ceremony role to reflect the
// current (unsaved) dropdown choice, so the button label tracks the selection live.
// A dropdown change is a fresh choice, so any previously linked vendor is dropped —
// otherwise re-picking "Celebrant" silently brings back an old link.
function _cerRefreshLink(role, selectId, keepLink){
  const host=document.getElementById('cer-link-'+role); if(!host) return;
  const val=_otherSelectValue(selectId);
  const ev=STATE.event||{};
  if(!keepLink && ev[_cerRoleField(role)]){ ev[_cerRoleField(role)]=''; saveToStorage(); }
  host.innerHTML=_cerLinkInner(role, val, ev[_cerRoleField(role)]);
}
function _cerSelectId(role){ return role==='venue' ? 'ven-cervenue' : 'ven-officiant'; }
function _otherSelectValue(id){
  const sel=document.getElementById(id); if(!sel) return '';
  if(sel.value==='__other__'){ return (document.getElementById(id+'-other')?.value||'').trim(); }
  return sel.value;
}
function _vendorStatusMeta(s){
  if(s==='confirmed') return {label:'Confirmed', fg:'var(--green)', bg:'rgba(29,158,117,.16)'};
  if(s==='booked') return {label:'Booked', fg:'var(--gold-deep)', bg:'rgba(156,122,60,.18)'};
  if(s==='not_suitable') return {label:'Not suitable', fg:'var(--red)', bg:'rgba(192,101,62,.14)'};
  return {label:'Possible', fg:'var(--gold-deep)', bg:'rgba(196,168,130,.2)'};
}
function renderVendors(c, actions){
  if(!Array.isArray(STATE.vendors)) STATE.vendors=[];
  // Vendor Look Up takes over the whole page when open (mounted, not modal —
  // its profile view has its own scrolling and would fight a modal body).
  if(_vendorLookupOn){
    // "My vendors" lives in the header actions bar, matching the vendor toolbar buttons.
    // Gold (btn-primary) at every width, so it stays legible once _fitVendorBtns drops labels.
    actions.innerHTML=`<div id="vendor-btn-group" class="gbtn-group" style="display:inline-flex;align-items:center;gap:5px;justify-content:flex-end;min-width:0"><button class="btn btn-sm btn-primary gbtn vendor-tb-btn" onclick="_vendorLookupClose()" title="Back to my vendors" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap;height:30px;box-sizing:border-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg><span class="gbtn-label vendor-tb-label">My vendors</span></button>${_vluView==='messages'?'':`<button class="btn btn-sm gbtn vendor-tb-btn" onclick="_vluOpenMessages(null)" title="Messages" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap;height:30px;box-sizing:border-box"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg><span class="gbtn-label vendor-tb-label">Messages</span></button>`}</div>`;
    setTimeout(()=>{ _ensureVendorBtnObserver(); requestAnimationFrame(_fitVendorBtns); }, 0);
    c.innerHTML=_vendorLookupHtml();
    return;
  }
    actions.innerHTML=`<div id="vendor-btn-group" class="gbtn-group" style="display:inline-flex;align-items:center;gap:5px;justify-content:flex-end;min-width:0"><button class="btn btn-sm btn-primary gbtn vendor-tb-btn" onclick="_vendorOpenForm()" title="New vendor" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap;height:30px;box-sizing:border-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg><span class="gbtn-label vendor-tb-label">New vendor</span></button>
    <button class="btn btn-sm gbtn vendor-tb-btn" onclick="openVendorPaymentTimeline()" title="Payment timeline — what's owed, when" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap;height:30px;box-sizing:border-box"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span class="gbtn-label vendor-tb-label">Payments</span></button>
    <button class="btn btn-sm gbtn vendor-tb-btn" onclick="_vluOpenMessages(null)" title="Messages — coming soon" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap;height:30px;box-sizing:border-box"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg><span class="gbtn-label vendor-tb-label">Messages</span></button>
    <div id="vendor-sections-wrap" style="position:relative;display:inline-flex"><button class="btn-icon vendor-tb-btn" onclick="_vendorToggleSectionsMenu(event)" title="Show / hide sections" aria-label="Show or hide sections" aria-haspopup="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>${_vendorSectionsMenuHtml()}</div></div>`;
  setTimeout(()=>{ _ensureVendorBtnObserver(); requestAnimationFrame(_fitVendorBtns); }, 0);
  const ev=STATE.event||{};
  const sugg=[];
  _allAppointments().forEach(({appt,taskId})=>{
    if(_vendorDismissedSuggest[appt.id]) return;
    if(STATE.vendors.some(v=>v.fromApptId===appt.id || _vendorMatches(v, appt))) return;
    if(!(appt.business||appt.contact||appt.phone||appt.email||appt.address)) return;
    sugg.push({appt, taskId});
  });
  let suggHtml='';
  if(sugg.length){
    suggHtml = `<div style="font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:500;margin:22px 0 10px;padding-bottom:7px;border-bottom:1px solid var(--border)">Suggested from appointments</div>` +
      sugg.map(({appt,taskId})=>{
        const sub=[appt.contact, appt.phone, appt.virtual?'':appt.address].filter(Boolean).join(' · ');
        const title=[appt.business||appt.contact||appt.type||'Appointment', (appt.type&&(appt.business||appt.contact))?('— '+appt.type):''].filter(Boolean).join(' ');
        return `<div style="border:.5px dashed var(--accent-soft,#D8B98C);background:rgba(196,168,130,.08);border-radius:11px;padding:11px 13px;display:flex;align-items:center;gap:11px;margin-bottom:8px">
          <span style="width:30px;height:30px;border-radius:8px;background:rgba(196,168,130,.2);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1z"/></svg></span>
          <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;color:var(--ink)">${_escHtml(title)}</div>${sub?`<div style="font-size:11px;color:var(--muted)">${_escHtml(sub)}</div>`:''}</div>
          <button class="btn btn-sm" style="font-size:12px;color:var(--green);border:.5px solid rgba(29,158,117,.5);background:rgba(29,158,117,.08);display:inline-flex;align-items:center;gap:5px;white-space:nowrap" onclick="_vendorAddSuggestion('${taskId||''}','${appt.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add to list</button>
          <button class="btn btn-sm btn-outline" style="padding:6px 9px;color:var(--muted)" title="Dismiss suggestion" aria-label="Dismiss" onclick="_vendorDismissSuggestion('${appt.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>`;
      }).join('');
  }
  let listHtml;
  const _vq=(_vendorSearch||'').trim().toLowerCase();
  const _vendorMatchesQuery=(v)=>{
    if(!_vq) return true;
    return [v.business,v.category,v.contact,v.phone,v.email,v.address,v.website,v.notes,v.status]
      .filter(Boolean).some(f=>String(f).toLowerCase().includes(_vq));
  };
  const _filteredVendors=STATE.vendors.filter(_vendorMatchesQuery);
  if(!STATE.vendors.length){
    listHtml=`<div style="font-size:13px;color:var(--muted);padding:26px 16px;text-align:center;border:.5px solid var(--border);border-radius:12px">No vendors yet. Add one with <strong>New vendor</strong>, or pull contacts in from your appointments above.</div>`;
  } else if(!_filteredVendors.length){
    listHtml=`<div style="font-size:13px;color:var(--muted);padding:26px 16px;text-align:center;border:.5px solid var(--border);border-radius:12px">No vendors match “${_escHtml(_vendorSearch)}”.</div>`;
  } else {
    const groups={};
    _filteredVendors.forEach(v=>{ const k=v.category||'Other'; (groups[k]=groups[k]||[]).push(v); });
    const cats=Object.keys(groups).sort((a,b)=>{ if(a==='Other')return 1; if(b==='Other')return -1; return a.localeCompare(b); });
    const _vv=_vendorView();
    listHtml=cats.map(cat=>{
      const catHdr=`<div style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:23px;font-weight:500;color:var(--gold-deep);margin:16px 0 9px">${_escHtml(cat)}</div>`;
      if(_vv==='list'){
        const rows=groups[cat].map(v=>_vendorRowHtml(v)).join('');
        return `${catHdr}<div class="vendor-list-rows">${rows}</div>`;
      }
      const cards=groups[cat].map(v=>_vendorCardHtml(v)).join('');
      return `${catHdr}<div class="vendor-card-grid">${cards}</div>`;
    }).join('');
  }
  const flash = _vendorFlash ? `<div style="background:rgba(29,158,117,.1);border:.5px solid rgba(29,158,117,.4);color:var(--green);border-radius:10px;padding:9px 13px;font-size:12.5px;margin-bottom:14px;display:flex;align-items:center;gap:7px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>${_escHtml(_vendorFlash)}</div>` : '';
  _vendorFlash='';
  const hideSugg = STATE.settings && STATE.settings.hideVendorSuggestions;
  c.innerHTML=`
    ${STATE.vendors.length ? `<div class="page-search-sticky">${_searchBarHtml('vendor-search', _vendorSearch, 'setVendorSearch', 'Search vendors…')}</div>` : ''}
    ${flash}
    ${hideSugg ? '' : suggHtml}
    <div style="font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:500;margin:2px 0 4px;padding-bottom:7px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px"><span>Vendor list</span>${STATE.vendors.length?_vendorViewSwitcherHtml():''}</div>
    <div class="vendor-lookup-banner" style="display:flex;align-items:center;gap:13px;border:.5px solid #E3D7C4;background:#FBF8F3;border-radius:11px;padding:12px 14px;margin:10px 0 4px">
      <span style="width:34px;height:34px;border-radius:9px;background:rgba(196,168,130,.2);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:var(--ink)">Find new vendors</div>
        <div style="font-size:11.5px;color:var(--muted)">Search the directory — photographers, celebrants, hair &amp; makeup and more.</div>
      </div>
      <button class="vendor-lookup-btn" onclick="_vendorLookupOpen()" title="Vendor Look Up" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;background:#FBF8F3;border:.5px solid #E3D7C4;color:#8B7355;transition:all .15s">Vendor Look Up<svg class="vendor-lookup-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9B89C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
    </div>
    <div class="vendor-lookup-banner" style="display:flex;align-items:center;gap:13px;border:.5px solid #E3D7C4;background:#FBF8F3;border-radius:11px;padding:12px 14px;margin:8px 0 4px">
      <span style="width:34px;height:34px;border-radius:9px;background:rgba(196,168,130,.2);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="7" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="13"/><path d="M13.8 8.7a1.6 1.6 0 0 0-3 .5c0 1.6 2.7 1.1 2.7 2.7a1.6 1.6 0 0 1-3 .5"/></svg></span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:var(--ink)">Compare quotes${STATE.quotes.length?` <span style="color:var(--muted);font-weight:400">(${STATE.quotes.length})</span>`:''}</div>
        <div style="font-size:11.5px;color:var(--muted)">Add quotes from vendors and compare price &amp; inclusions side by side.</div>
      </div>
      <button class="vendor-lookup-btn" onclick="openQuotes()" title="Compare quotes" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;background:#FBF8F3;border:.5px solid #E3D7C4;color:#8B7355;transition:all .15s">Open quotes<svg class="vendor-lookup-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9B89C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
    </div>
    <div id="vbl-placeholder"></div>
    ${listHtml}`;
  // Asynchronously load brief links into the placeholder (non-blocking)
  if(_sbSession) _renderVblSection();
}
// ── Unified "Planner Links" panel for a vendor card ─────────────
// Visibility helpers (driven by the Show / hide popup):
function _plannerLinksHidden(){ return !!(STATE.settings && STATE.settings.vcHidePlannerLinks); }
function _plannerLinksHidePassed(){ return !!(STATE.settings && STATE.settings.vcHidePlannerPassed); }
function _isPassedISO(d){
  if(!d) return false;
  const today=new Date(); today.setHours(0,0,0,0);
  const dt=new Date(d+'T00:00:00');
  if(isNaN(dt)) return false;
  return dt < today;
}
function _vendorRelationsPanel(v){
  if(_plannerLinksHidden()) return '';
  const esc=_escHtml;
  const hidePassed=_plannerLinksHidePassed();
  const rows=[];
  // Budget lines (item or sub-item) this vendor sits on.
  _budgetTargetsForVendor(v.id).forEach(({bid,sid,b,s})=>{
    if(hidePassed){ const due=sid ? (s.balanceDueDate||b.balanceDueDate) : b.balanceDueDate; if(_isPassedISO(due)) return; }
    const name=sid ? `${b.name} › ${s.name}` : b.name;
    const total=sid ? getSubItemAmount(s) : calcBudgetItemTotal(b);
    const amt=total ? fmt(total) : '';
    rows.push(`<div style="display:flex;align-items:center;gap:7px;padding:5px 0">
      <span style="width:22px;height:22px;border-radius:6px;background:rgba(196,168,130,.18);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;font-weight:600">$</span>
      <button type="button" onclick="event.stopPropagation();_vendorGoBudget('${bid}','${sid||''}')" style="flex:1;min-width:0;text-align:left;background:none;border:none;padding:0;cursor:pointer;font-size:12px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(name)}</button>
      ${amt?`<span style="font-size:10.5px;color:var(--green);font-weight:500;flex-shrink:0">${amt}</span>`:''}</div>`);
  });
  // Tasks directly linked to this vendor.
  _tasksForVendor(v.id).forEach(t=>{
    if(hidePassed && _isPassedISO(t.dueDate)) return;
    rows.push(`<div style="display:flex;align-items:center;gap:7px;padding:5px 0">
      <span style="width:22px;height:22px;border-radius:6px;background:rgba(139,115,85,.14);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      <button type="button" onclick="event.stopPropagation();_vendorGoTask('${t.id}')" style="flex:1;min-width:0;text-align:left;background:none;border:none;padding:0;cursor:pointer;font-size:12px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.text||'Task')}</button>
      <button type="button" onclick="event.stopPropagation();_taskUnlinkVendor('${t.id}','${v.id}');navigate(_currentPage)" title="Unlink task" style="flex-shrink:0;background:none;border:none;cursor:pointer;padding:2px;color:var(--muted);display:inline-flex"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>`);
  });
  // Appointments belonging to this vendor.
  _vendorAppointments(v).forEach(({appt,taskId})=>{
    if(hidePassed && _isPassedISO(appt.date)) return;
    const when=[appt.date?fmtBudgetDate(appt.date):'', appt.time?_fmtApptTime(appt.time):''].filter(Boolean).join(', ');
    const label=[appt.type||appt.business||'Appointment', when].filter(Boolean).join(' · ');
    rows.push(`<div style="display:flex;align-items:center;gap:7px;padding:5px 0">
      <span style="width:22px;height:22px;border-radius:6px;background:rgba(196,168,130,.18);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
      <button type="button" onclick="event.stopPropagation();_vendorHubOpenAppt('${taskId||''}','${appt.id}')" style="flex:1;min-width:0;text-align:left;background:none;border:none;padding:0;cursor:pointer;font-size:12px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(label)}</button></div>`);
  });
  // Timeline moments this vendor is linked to.
  _timelineForVendor(v.id).forEach(t=>{
    const when=[t.time?tlTo12h(t.time):'', t.location||''].filter(Boolean).join(' · ');
    const label=[t.title||'Moment', when].filter(Boolean).join(' — ');
    rows.push(`<div style="display:flex;align-items:center;gap:7px;padding:5px 0">
      <span style="width:22px;height:22px;border-radius:6px;background:rgba(196,168,130,.18);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg></span>
      <button type="button" onclick="event.stopPropagation();_vendorGoTimeline('${t.id}')" style="flex:1;min-width:0;text-align:left;background:none;border:none;padding:0;cursor:pointer;font-size:12px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(label)}</button>
      <button type="button" onclick="event.stopPropagation();_timelineUnlinkVendor('${t.id}');navigate(_currentPage)" title="Unlink moment" style="flex-shrink:0;background:none;border:none;cursor:pointer;padding:2px;color:var(--muted);display:inline-flex"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>`);
  });
  if(!rows.length){
    const msg = hidePassed
      ? 'No upcoming links. Passed-date items are hidden.'
      : 'Nothing linked yet. Use “+ Link task” or attach this vendor to a Payment.';
    return `<div style="margin-top:11px;border-top:.5px solid var(--border);padding-top:9px">
      <div style="font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:5px">Planner Links</div>
      <div style="font-size:11.5px;color:var(--muted);padding:3px 0 2px">${msg}</div>
    </div>`;
  }
  return `<div style="margin-top:11px;border-top:.5px solid var(--border);padding-top:9px">
    <div style="font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:5px">Planner Links</div>
    ${rows.join('')}
  </div>`;
}
// ── Vendor Brief Links ──────────────────────────────────────────────────────
// Cache: { tokens: [...], loading: bool, error: str|null, ts: number }
let _vblCache = null;

// Fetch vendor_tokens for the signed-in couple from Supabase.
async function _fetchVendorTokens(){
  if(!_sbSession) return [];
  const uid = _sbSession.user.id;
  const res = await fetch(`${_SB_URL}/rest/v1/vendor_tokens?couple_id=eq.${encodeURIComponent(uid)}&order=created_at.desc&limit=100`,{
    headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+_sbSession.access_token,'Accept':'application/json'}
  });
  if(!res.ok) return [];
  return await res.json();
}

// Render the "Brief links" collapsible section above the vendor list.
// tokens: array from Supabase (may be empty). Returns HTML string.
function _vblSectionHtml(tokens){
  const now = new Date();
  const activeTokens = tokens.filter(t => !t.expires_at || new Date(t.expires_at) > now);
  const baseUrl = window.location.origin + window.location.pathname;
  const linkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
  const count = tokens.length;
  const countBadge = count > 0 ? `<span style="font-size:11px;background:rgba(196,168,130,.18);color:var(--gold-deep);border-radius:10px;padding:1px 7px;font-weight:600;margin-left:4px">${count}</span>` : '';

  let linksHtml = '';
  if(tokens.length){
    linksHtml = `<div class="vbl-links-list">` + tokens.map(t=>{
      const expired = t.expires_at && new Date(t.expires_at) <= now;
      const badge = expired
        ? `<span class="vbl-badge vbl-badge-expired">Expired</span>`
        : `<span class="vbl-badge vbl-badge-active">Active</span>`;
      const link = `${baseUrl}?vendor=${encodeURIComponent(t.token)}`;
      const expNote = t.expires_at
        ? `<span style="font-size:10.5px;color:var(--muted);flex-shrink:0">exp ${fmtBudgetDate(t.expires_at.slice(0,10))}</span>`
        : '';
      return `<div class="vbl-link-row">
        ${badge}
        <span class="vbl-link-name" title="${_escHtml(t.vendor_name)}">${_escHtml(t.vendor_name)}</span>
        <span class="vbl-link-url" title="${_escHtml(link)}">${_escHtml(link)}</span>
        ${expNote}
        <button class="vbl-action-btn" onclick="_copyVendorLink('${_escHtml(t.token)}',this)" title="Copy link">${linkIcon} Copy</button>
        <button class="vbl-action-btn danger" onclick="_revokeVendorToken('${_escHtml(t.token)}',this)" title="Revoke this link"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Revoke</button>
      </div>`;
    }).join('') + `</div>`;
  }

  return `<div class="vbl-section" id="vbl-section">
    <div class="vbl-header">
      <span class="vbl-header-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>
      <div class="vbl-header-text">
        <div class="vbl-title">Vendor brief links${countBadge}</div>
        <div class="vbl-sub">Share a secure read-only portal with any vendor — no login needed.</div>
      </div>
      <button class="vbl-gen-btn" onclick="_openVendorBriefModal(null)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> New brief</button>
    </div>
    ${linksHtml}
  </div>`;
}

// Open the generate-brief modal. vendorName is pre-filled if coming from a card button.
function _openVendorBriefModal(vendorName){
  // Remove any existing overlay
  const existing = document.getElementById('vbm-overlay');
  if(existing) existing.remove();

  const esc = _escHtml;
  const prefill = vendorName || '';
  const sections = [
    {id:'timeline', label:'Day timeline'},
    {id:'budget', label:'Budget summary'},
    {id:'checklist', label:'Checklist'},
    {id:'contacts', label:'Contact details'},
    {id:'notes', label:'Notes / brief'}
  ];
  // Default: unselected; restore last session's selections if saved
  const _lastSecs = (STATE.settings&&STATE.settings.vendorBriefLastSections)||[];
  const chipsHtml = sections.map(s =>
    `<button type="button" class="vbm-chip${_lastSecs.includes(s.id)?' sel':''}" data-section="${esc(s.id)}" onclick="this.classList.toggle('sel')">${esc(s.label)}</button>`
  ).join('');

  // Default expiry: 30 days from today
  const def30 = (()=>{ const d=new Date(); d.setDate(d.getDate()+30); return d.toISOString().slice(0,10); })();

  const overlay = document.createElement('div');
  overlay.className = 'vbm-overlay';
  overlay.id = 'vbm-overlay';
  overlay.innerHTML = `
    <div class="vbm-panel" role="dialog" aria-modal="true" aria-label="Create vendor brief link">
      <div id="vbm-body">
        <div class="vbm-title">Create vendor brief</div>
        <div class="vbm-sub">Generate a secure, shareable link for your vendor — no account needed.</div>
        <div class="vbm-label">Vendor name</div>
        <input id="vbm-vendor-name" type="text" class="input" placeholder="e.g. Bloom &amp; Co." value="${esc(prefill)}"
          style="width:100%;box-sizing:border-box;margin-bottom:16px;font-size:13px;padding:9px 11px;border:.5px solid var(--border);border-radius:8px;background:var(--cream);color:var(--ink);font-family:'Inter',sans-serif">
        <div class="vbm-label">Sections to share</div>
        <div class="vbm-chips">${chipsHtml}</div>
        <div class="vbm-label">Expiry (optional)</div>
        <div class="vbm-expiry-row">
          <label><input type="checkbox" id="vbm-use-expiry" checked onchange="_vbmToggleExpiry()"> Set expiry date</label>
          <input type="date" id="vbm-expiry-date" value="${def30}" style="flex:1;min-width:0">
        </div>
        <div id="vbm-error" style="display:none;font-size:12px;color:#D9534F;margin-bottom:10px"></div>
        <div class="vbm-footer">
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('vbm-overlay').remove()">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="_generateVendorToken()" id="vbm-gen-btn">Generate link</button>
        </div>
      </div>
    </div>`;

  // Close on backdrop click
  overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  setTimeout(()=>{ const el=document.getElementById('vbm-vendor-name'); if(el){ if(!prefill) el.focus(); else { el.focus(); el.select(); } } }, 50);
}

function _vbmToggleExpiry(){
  const chk = document.getElementById('vbm-use-expiry');
  const inp = document.getElementById('vbm-expiry-date');
  if(inp) inp.disabled = !chk.checked;
}

// Generate a vendor token and POST it to Supabase.
async function _generateVendorToken(){
  if(!_sbSession){ alert('Please sign in first.'); return; }
  const nameEl = document.getElementById('vbm-vendor-name');
  const errEl = document.getElementById('vbm-error');
  const genBtn = document.getElementById('vbm-gen-btn');
  const name = (nameEl && nameEl.value.trim()) || '';
  if(!name){ if(errEl){ errEl.textContent='Please enter a vendor name.'; errEl.style.display=''; } return; }
  if(errEl) errEl.style.display='none';

  // Collect selected sections
  const chips = document.querySelectorAll('#vbm-overlay .vbm-chip.sel');
  const sections = Array.from(chips).map(c => c.dataset.section).filter(Boolean);
  // Remember for next brief
  if(!STATE.settings) STATE.settings={};
  STATE.settings.vendorBriefLastSections = sections;
  saveToStorage();

  // Expiry
  const useExpiry = document.getElementById('vbm-use-expiry');
  const expiryDate = document.getElementById('vbm-expiry-date');
  let expiresAt = null;
  if(useExpiry && useExpiry.checked && expiryDate && expiryDate.value){
    expiresAt = expiryDate.value + 'T23:59:59Z';
  }

  // Generate a 32-hex-char token
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  const token = Array.from(arr).map(b=>b.toString(16).padStart(2,'0')).join('');

  if(genBtn){ genBtn.disabled=true; genBtn.textContent='Generating…'; }

  try{
    const payload = { token, couple_id: _sbSession.user.id, vendor_name: name, sections };
    if(expiresAt) payload.expires_at = expiresAt;

    const res = await fetch(`${_SB_URL}/rest/v1/vendor_tokens`,{
      method:'POST',
      headers:{
        'apikey':_SB_KEY,
        'Authorization':'Bearer '+_sbSession.access_token,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      },
      body: JSON.stringify(payload)
    });
    if(!res.ok){ const t=await res.text(); throw new Error(t||res.statusText); }

    // Show success state in modal
    const baseUrl = window.location.origin + window.location.pathname;
    const fullLink = `${baseUrl}?vendor=${token}`;
    const expiryDisplay = expiresAt ? (()=>{
      const d=new Date(expiresAt); return isNaN(d)?expiresAt:d.toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'});
    })() : null;
    // Find vendor email for mailto pre-fill
    const _vobj=(STATE.vendors||[]).find(v=>v.business===name||v.contact===name);
    const _vemail=_vobj?.email||'';
    const _ev=STATE.event||{};
    const _couple=[_ev.partner1,_ev.partner2].filter(Boolean).join(' & ')||'us';
    const _emailSubj=encodeURIComponent(`Vendor brief — ${name}`);
    const _emailBody=encodeURIComponent(`Hi ${name},\n\nPlease find your vendor brief for our wedding below.\n\nBrief link: ${fullLink}${expiryDisplay?`\nExpiry: ${expiryDisplay}`:''}\n\nLet us know if you have any questions.\n\nWarm regards,\n${_couple}`);
    const _mailto=`mailto:${_vemail}?subject=${_emailSubj}&body=${_emailBody}`;
    const body = document.getElementById('vbm-body');
    if(body) body.innerHTML = `
      <div class="vbm-title">Link created ✓</div>
      <div class="vbm-sub">Share this link with <strong>${_escHtml(name)}</strong>. They won't need to log in.</div>
      <div class="vbm-success">
        <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:4px">Vendor brief link</div>
        <div class="vbm-link-display" id="vbm-result-link">${_escHtml(fullLink)}</div>
        ${expiryDisplay?`<div style="font-size:11px;color:var(--muted);margin-top:4px;margin-bottom:2px">Expires: <strong style="color:var(--ink)">${_escHtml(expiryDisplay)}</strong></div>`:''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="btn btn-primary btn-sm" onclick="_copyVendorLink('${token}',this)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy link</button>
          <a class="btn btn-outline btn-sm" href="${_mailto}" style="text-decoration:none"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg> Email vendor</a>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('vbm-overlay').remove();_openVendorBriefModal(null)">Create another</button>
        </div>
      </div>
      <div class="vbm-footer" style="margin-top:14px">
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('vbm-overlay').remove();_refreshVendorsPage()">Done</button>
      </div>`;

    // Invalidate cache so next render re-fetches
    _vblCache = null;

  } catch(err){
    if(genBtn){ genBtn.disabled=false; genBtn.textContent='Generate link'; }
    if(errEl){ errEl.textContent='Error: '+err.message; errEl.style.display=''; }
  }
}

// Revoke (delete) a vendor token.
async function _revokeVendorToken(token, btn){
  if(!_sbSession) return;
  if(!confirm('Revoke this brief link? The vendor will no longer be able to access it.')) return;
  if(btn){ btn.disabled=true; btn.textContent='Revoking…'; }
  try{
    const res = await fetch(`${_SB_URL}/rest/v1/vendor_tokens?token=eq.${encodeURIComponent(token)}&couple_id=eq.${encodeURIComponent(_sbSession.user.id)}`,{
      method:'DELETE',
      headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+_sbSession.access_token}
    });
    if(!res.ok){ const t=await res.text(); throw new Error(t||res.statusText); }
    _vblCache = null;
    _refreshVendorsPage();
  } catch(err){
    if(btn){ btn.disabled=false; btn.textContent='Revoke'; }
    alert('Could not revoke: '+err.message);
  }
}

// Copy a vendor portal link to clipboard.
async function _copyVendorLink(token, btn){
  const baseUrl = window.location.origin + window.location.pathname;
  const link = `${baseUrl}?vendor=${token}`;
  const origText = btn ? btn.innerHTML : '';
  try{
    await navigator.clipboard.writeText(link);
    if(btn){ btn.innerHTML='✓ Copied!'; setTimeout(()=>{ if(btn) btn.innerHTML=origText; },2000); }
  } catch(_){
    // Fallback: select a temp input
    const tmp = document.createElement('input');
    tmp.value = link;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand('copy');
    tmp.remove();
    if(btn){ btn.innerHTML='✓ Copied!'; setTimeout(()=>{ if(btn) btn.innerHTML=origText; },2000); }
  }
}

// Re-render the vendors page (used after token create/revoke).
function _refreshVendorsPage(){
  const c=document.getElementById('main-content'), a=document.getElementById('topbar-actions');
  if(c&&a) renderVendors(c,a);
}

// Render the Brief links section by fetching fresh data then injecting HTML.
async function _renderVblSection(){
  const placeholder = document.getElementById('vbl-placeholder');
  if(!placeholder) return;
  if(!_sbSession){ placeholder.innerHTML=''; return; }

  // Show loading shimmer
  placeholder.innerHTML = `<div class="vbl-section" style="opacity:.6;pointer-events:none">
    <div class="vbl-header">
      <span class="vbl-header-icon"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>
      <div class="vbl-header-text"><div class="vbl-title">Vendor brief links</div><div class="vbl-sub">Loading…</div></div>
    </div>
  </div>`;

  try{
    // Use cache if fresh (< 30 s)
    let tokens;
    if(_vblCache && (Date.now()-_vblCache.ts < 30000)){
      tokens = _vblCache.tokens;
    } else {
      tokens = await _fetchVendorTokens();
      _vblCache = { tokens, ts: Date.now() };
    }
    if(placeholder.isConnected) placeholder.innerHTML = _vblSectionHtml(tokens);
  } catch(e){
    if(placeholder.isConnected) placeholder.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:6px 0">Could not load brief links.</div>`;
  }
}

// ── Active token helpers ─────────────────────────────────────────────────────
// Return the first active token for a given vendor name (case-insensitive).
function _vendorActiveToken(vendorName){
  if(!_vblCache || !_vblCache.tokens) return null;
  const nm = String(vendorName||'').toLowerCase().trim();
  const now = new Date();
  return _vblCache.tokens.find(t =>
    t.vendor_name.toLowerCase().trim() === nm &&
    (!t.expires_at || new Date(t.expires_at) > now)
  ) || null;
}

// Jump helpers from the panel.
function _vendorGoBudget(bid, sid){
  navigate('budget');
  setTimeout(()=>{ const el=document.querySelector('[data-bid="'+bid+'"]'); if(el&&el.scrollIntoView) el.scrollIntoView({behavior:'smooth',block:'center'}); }, 90);
}
function _vendorGoTask(taskId){
  navigate('checklist');
  setTimeout(()=>{ const el=document.getElementById('cl-'+taskId); if(el&&el.scrollIntoView) el.scrollIntoView({behavior:'smooth',block:'center'}); }, 90);
}
function _vendorGoTimeline(itemId){
  navigate('timeline');
  setTimeout(()=>{ openEditTimelineItem(itemId); }, 90);
}
function _timelineUnlinkVendor(itemId){
  const it=(STATE.timeline||[]).find(x=>x.id===itemId);
  if(it){ it.vendorId=''; saveToStorage(); }
}
// Small vendor pills shown on a checklist task for each directly-linked vendor.
function _taskVendorBadges(t){
  const ids=_taskVendorIds(t);
  if(!ids.length) return '';
  const pills=ids.map(id=>{
    const v=(STATE.vendors||[]).find(x=>x.id===id); if(!v) return '';
    const sm=_vendorStatusMeta(v.status);
    return `<button type="button" onclick="event.stopPropagation();_goToVendor('${id}')" title="${_escHtml(v.business||'Vendor')}" style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;border-radius:7px;padding:2px 8px;background:${sm.bg};color:${sm.fg};border:.5px solid ${sm.fg};cursor:pointer;max-width:150px;vertical-align:middle">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M2 5h20v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M4 11v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9"/><path d="M9 21v-6h6v6"/></svg>
      <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(v.business||'Vendor')}</span></button>`;
  }).filter(Boolean).join('');
  if(!pills) return '';
  return `<div style="margin-top:4px;display:inline-flex;flex-wrap:wrap;gap:4px;vertical-align:middle">${pills}</div>`;
}
// Avatar initial for a vendor: skip a leading article ("The", "A", "An") and use
// the first letter of the next meaningful word instead. Falls back to 'V'.
function _vendorInitial(name){
  const raw=String(name||'').trim();
  if(!raw) return 'V';
  const words=raw.split(/\s+/);
  const articles=new Set(['the','a','an']);
  let pick=words[0];
  if(words.length>1 && articles.has(words[0].toLowerCase())) pick=words[1];
  // First letter/number of the chosen word (accept accented letters too).
  const m=pick.match(/[\p{L}\p{N}]/u);
  return (m?m[0]:raw.charAt(0)).toUpperCase();
}
function _vendorCardHtml(v){
  const sm=_vendorStatusMeta(v.status);
  const esc=_escHtml;
  const st=STATE.settings||{};
  const lines=[];
  if(v.contact) lines.push(`<div style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink);margin-top:6px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${esc(v.contact)}</div>`);
  if(v.phone && !st.vcHidePhone){ const tel=String(v.phone).replace(/[^+\d]/g,''); lines.push(`<div style="display:flex;align-items:center;gap:7px;font-size:12px;margin-top:6px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg><a href="tel:${esc(tel)}" style="color:var(--gold-deep);text-decoration:underline;word-break:break-all">${esc(v.phone)}</a></div>`); }
  if(v.email && !st.vcHideEmail) lines.push(`<div style="display:flex;align-items:center;gap:7px;font-size:12px;margin-top:6px;word-break:break-all"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg><a href="mailto:${esc(v.email)}" style="color:var(--gold-deep);text-decoration:underline">${esc(v.email)}</a></div>`);
  if(v.address && !st.vcHideAddress) lines.push(`<div style="display:flex;align-items:center;gap:7px;font-size:12px;margin-top:6px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><a href="${esc(_mapsUrl(v.address))}" target="_blank" rel="noopener noreferrer" style="color:var(--gold-deep);text-decoration:underline;word-break:break-word">${esc(v.address)}</a></div>`);
  if(v.website && !st.vcHideWebsite){ const url=esc(_normalizeUrl(v.website)); lines.push(`<div style="display:flex;align-items:center;gap:7px;font-size:12px;margin-top:6px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--gold-deep);text-decoration:underline;word-break:break-all">${esc(_urlDomain(v.website))}</a></div>`); }
  if(v.hours && !st.vcHideHours) lines.push(`<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;margin-top:6px;color:var(--ink)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span style="white-space:pre-line">${esc(v.hours)}</span></div>`);
  // Google rating (stars + value + review count).
  const ratingHtml = (v.rating && !st.vcHideReview) ? (()=>{
    const r=parseFloat(v.rating)||0; const full=Math.round(r);
    const stars=Array.from({length:5},(_,i)=>`<svg width="11" height="11" viewBox="0 0 24 24" fill="${i<full?'#F5A623':'none'}" stroke="#F5A623" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`).join('');
    const rc=v.reviewCount?` · ${esc(String(v.reviewCount))} review${String(v.reviewCount)==='1'?'':'s'}`:'';
    return `<div style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted);margin-top:5px"><span style="display:inline-flex;gap:1px">${stars}</span><span style="color:var(--ink);font-weight:500">${esc(String(v.rating))}</span>${rc}</div>`;
  })() : '';
  return `<div data-vendor-id="${v.id}" class="vendor-card" style="border-width:2px;border-style:solid;border-radius:12px;padding:13px 14px;background:var(--panel);min-width:0;overflow:hidden">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
      <div style="min-width:0"><div style="font-size:14px;font-weight:600;color:var(--ink);word-break:break-word">${esc(v.business||'Untitled vendor')}</div>${v.category?`<div style="font-size:10.5px;color:var(--gold-deep);text-transform:uppercase;letter-spacing:.05em;margin-top:1px">${esc(v.category)}</div>`:''}${ratingHtml}</div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
        <button onclick="_vendorCycleStatus('${v.id}')" title="Tap to change status" style="cursor:pointer;border:none;font-size:10px;font-weight:600;border-radius:6px;padding:2px 8px;text-transform:uppercase;letter-spacing:.04em;background:${sm.bg};color:${sm.fg}">${sm.label}</button>
        <div class="dots-menu">
          <button class="dots-btn" title="More" aria-label="More" onclick="event.stopPropagation();toggleDots(event,'vdots-${v.id}')">···</button>
          <div class="dots-dropdown hidden" id="vdots-${v.id}">
            <button onclick="event.stopPropagation();closeDots();_vendorOpenForm('${v.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button>
            <button class="danger" onclick="event.stopPropagation();closeDots();_vendorDelete('${v.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Delete</button>
          </div>
        </div>
      </div>
    </div>
    ${lines.join('')}
    ${v.notes?`<div style="font-size:11.5px;color:var(--muted);font-style:italic;margin-top:7px">“${esc(v.notes)}”</div>`:''}
    ${_vendorRelationsPanel(v)}
    ${(()=>{ const _op=_vendorOwedPillHtml(v.id); return _op?`<div style="margin-top:9px;padding-top:9px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">${_op}</div>`:''; })()}
    <div style="display:flex;gap:6px;margin-top:11px;flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 9px;display:inline-flex;align-items:center;gap:4px" onclick="_vendorOpenHub('${v.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>Hub</button>
      <button class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 9px;display:inline-flex;align-items:center;gap:4px" onclick="_vendorApplyToAppt('${v.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>Appointments</button>
      <button class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 9px;display:inline-flex;align-items:center;gap:4px" onclick="_vendorLinkTaskPicker('${v.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Link task</button>
      <button class="btn btn-outline btn-sm" style="font-size:11px;padding:4px 9px;display:inline-flex;align-items:center;gap:4px" onclick="_vluOpenMessages('${v.id}','saved')" title="Message this vendor — coming soon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>Message</button>
      ${(()=>{ const at=_vendorActiveToken(v.business); return at
        ? `<button class="vbtn-brief" onclick="_copyVendorLink('${at.token}',this)" title="Copy active brief link"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy brief link</button>`
        : `<button class="vbtn-brief" onclick="_openVendorBriefModal('${_escHtml(v.business||'')}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Share brief</button>`; })()}
    </div>
  </div>`;
}
// ── Vendor list-view: compact one-row-per-vendor variant ────────────────────
function _vendorView(){ return (STATE.settings && STATE.settings.vendorView==='list') ? 'list' : 'card'; }
function setVendorView(mode){
  if(!STATE.settings) STATE.settings={};
  STATE.settings.vendorView = (mode==='list') ? 'list' : 'card';
  saveToStorage();
  const c=document.getElementById('main-content'), a=document.getElementById('topbar-actions');
  if(c&&a) renderVendors(c,a);
}
function _vendorViewSwitcherHtml(){
  const v=_vendorView();
  const cardIco='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';
  const listIco='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';
  return `<span class="vview-seg" role="group" aria-label="Vendor view">
    <button class="${v==='card'?'active':''}" onclick="setVendorView('card')" title="Card view" aria-label="Card view" aria-pressed="${v==='card'}">${cardIco}Card</button>
    <button class="${v==='list'?'active':''}" onclick="setVendorView('list')" title="List view" aria-label="List view" aria-pressed="${v==='list'}">${listIco}List</button>
  </span>`;
}
function _vendorRowHtml(v){
  const sm=_vendorStatusMeta(v.status);
  const esc=_escHtml;
  const st=STATE.settings||{};
  // Sub-line: contact · phone · email/address, then linked budget/task counts.
  const bits=[];
  if(v.contact) bits.push(esc(v.contact));
  if(v.phone && !st.vcHidePhone) bits.push(esc(v.phone));
  if(v.email && !st.vcHideEmail) bits.push(esc(v.email));
  else if(v.address && !st.vcHideAddress) bits.push(esc(v.address));
  const bCount=_budgetTargetsForVendor(v.id).length;
  const tCount=_tasksForVendor(v.id).length;
  if(bCount) bits.push(`${bCount} budget`);
  if(tCount) bits.push(`${tCount} task${tCount===1?'':'s'}`);
  const sub=bits.join(' · ');
  return `<div data-vendor-id="${v.id}" class="vrow">
    <div class="vrow-main" onclick="_vendorOpenHub('${v.id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();_vendorOpenHub('${v.id}')}" title="Open vendor hub">
      <div class="vrow-top">
        <span class="vrow-name">${esc(v.business||'Untitled vendor')}</span>
        ${v.category?`<span class="vrow-cat">${esc(v.category)}</span>`:''}
        <button onclick="event.stopPropagation();_vendorCycleStatus('${v.id}')" title="Tap to change status" style="cursor:pointer;border:none;font-size:10px;font-weight:600;border-radius:6px;padding:2px 8px;text-transform:uppercase;letter-spacing:.04em;background:${sm.bg};color:${sm.fg}">${sm.label}</button>
      </div>
      ${sub?`<div class="vrow-sub">${sub}</div>`:''}
    </div>
    <div class="vrow-right">
      ${_vendorOwedPillHtml(v.id)}
      ${(()=>{ const at=_vendorActiveToken(v.business); return at
        ? `<button class="vrow-hub vbtn-brief" onclick="event.stopPropagation();_copyVendorLink('${at.token}',this)" title="Copy active brief link" aria-label="Copy brief link" style="padding:0 8px;width:auto"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>`
        : `<button class="vrow-hub vbtn-brief" onclick="event.stopPropagation();_openVendorBriefModal('${_escHtml(v.business||'')}')" title="Share vendor brief" aria-label="Share vendor brief" style="padding:0 8px;width:auto"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>`; })()}
      <button class="vrow-hub" onclick="event.stopPropagation();_vluOpenMessages('${v.id}','saved')" title="Message this vendor — coming soon" aria-label="Message this vendor"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg></button>
      <button class="vrow-hub" onclick="event.stopPropagation();_vendorOpenHub('${v.id}')" title="Open vendor hub" aria-label="Open vendor hub"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></button>
      <div class="dots-menu">
        <button class="dots-btn" title="More" aria-label="More" onclick="event.stopPropagation();toggleDots(event,'vrowdots-${v.id}')">···</button>
        <div class="dots-dropdown hidden" id="vrowdots-${v.id}">
          <button onclick="event.stopPropagation();closeDots();_vendorOpenForm('${v.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button>
          <button class="danger" onclick="event.stopPropagation();closeDots();_vendorDelete('${v.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Delete</button>
        </div>
      </div>
    </div>
  </div>`;
}
// ── Vendor badges on budget items / sub-items (many-to-many) ────────────────
function _budgetVendorIds(target){ return (target && Array.isArray(target.vendorIds)) ? target.vendorIds : []; }
function _budgetTargetsForVendor(vendorId){
  const out=[];
  (STATE.budget.items||[]).forEach(b=>{
    if(_budgetVendorIds(b).includes(vendorId)) out.push({bid:b.id, sid:null, b, s:null});
    (b.subItems||[]).forEach(s=>{ if(_budgetVendorIds(s).includes(vendorId)) out.push({bid:b.id, sid:s.id, b, s}); });
  });
  return out;
}
// ── Direct vendor ↔ task link (independent of budget) ──────────────────────
function _taskVendorIds(t){ return (t && Array.isArray(t.vendorIds)) ? t.vendorIds : []; }
function _tasksForVendor(vendorId){
  return (STATE.checklist||[]).filter(t=>_taskVendorIds(t).includes(vendorId));
}
function _timelineForVendor(vendorId){
  return (STATE.timeline||[]).filter(t=>t.vendorId===vendorId);
}
// Budget targets a given task touches (its own budgetId, plus any reverse-linked item).
function _budgetTargetsForTask(t){
  const out=[];
  if(t.budgetId){ const b=STATE.budget.items.find(x=>x.id===t.budgetId); if(b){
    if(t.budgetSubId){ const s=(b.subItems||[]).find(x=>x.id===t.budgetSubId); if(s) out.push({bid:b.id, sid:s.id, b, s}); else out.push({bid:b.id, sid:null, b, s:null}); }
    else out.push({bid:b.id, sid:null, b, s:null});
  }}
  if(!out.length){ const rb=STATE.budget.items.find(x=>x.checklistId===t.id); if(rb) out.push({bid:rb.id, sid:null, b:rb, s:null}); }
  return out;
}
// Link a vendor to a task; then, if the task also sits on a budget line that the
// vendor isn't on yet, offer to mirror the link (keeps the triangle closed).
function _taskLinkVendor(taskId, vendorId, opts){
  const t=STATE.checklist.find(x=>x.id===taskId); if(!t) return;
  if(!Array.isArray(t.vendorIds)) t.vendorIds=[];
  if(!t.vendorIds.includes(vendorId)) t.vendorIds.push(vendorId);
  saveToStorage();
  if(!(opts&&opts.skipMirror)) _maybeMirrorVendorToBudget(taskId, vendorId);
}
function _taskUnlinkVendor(taskId, vendorId){
  const t=STATE.checklist.find(x=>x.id===taskId); if(!t) return;
  t.vendorIds=_taskVendorIds(t).filter(id=>id!==vendorId);
  saveToStorage();
}
// Picker: choose a task to link this vendor to (searchable list of all tasks).
function _vendorLinkTaskPicker(vendorId){
  const v=(STATE.vendors||[]).find(x=>x.id===vendorId); if(!v) return;
  const esc=_escHtml;
  const tasks=(STATE.checklist||[]).filter(t=>!t.archived);
  const rowsHtml=tasks.map(t=>{
    const linked=_taskVendorIds(t).includes(vendorId);
    const cat=t.category?`<span style="font-size:9.5px;color:var(--muted)">${esc(t.category)}</span>`:'';
    const done=t.done?'opacity:.55;':'';
    return `<button type="button" class="vlt-row" data-text="${esc((t.text||'').toLowerCase())}" ${linked?'disabled':''} onclick="_vendorLinkTaskPick('${vendorId}','${t.id}')" style="${done}display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;border-bottom:.5px solid var(--border);padding:10px 12px;cursor:${linked?'default':'pointer'}">
      <span style="width:26px;height:26px;border-radius:7px;background:rgba(139,115,85,.12);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;pointer-events:none"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      <span style="flex:1;min-width:0;pointer-events:none"><span style="display:block;font-size:12.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.text||'Task')}</span>${cat}</span>
      ${linked?'<span style="font-size:10px;color:var(--green);font-weight:600;flex-shrink:0;pointer-events:none">Linked</span>':'<span style="color:var(--muted);flex-shrink:0;pointer-events:none"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>'}
    </button>`;
  }).join('') || `<div style="font-size:12px;color:var(--muted);padding:14px 4px">No tasks yet. Add a checklist task first.</div>`;
  const body=`<div>
    <div style="position:relative;margin-bottom:8px"><input id="vlt-search" type="text" class="form-input" placeholder="Search tasks…" oninput="_vendorLinkTaskFilter()" onkeydown="if(event.key==='Escape'){this.value='';_vendorLinkTaskFilter()}" style="height:34px;font-size:12.5px;padding-right:28px"/><button type="button" onclick="document.getElementById('vlt-search').value='';_vendorLinkTaskFilter()" title="Clear" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:0;line-height:0;display:flex;align-items:center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
    <div id="vlt-list" style="max-height:340px;overflow-y:auto;border:.5px solid var(--border);border-radius:9px">${rowsHtml}</div>
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Done</button>`;
  openModal('Link “'+(v.business||'vendor')+'” to a task', body, footer);
}
function _vendorLinkTaskFilter(){
  const q=(document.getElementById('vlt-search')?.value||'').trim().toLowerCase();
  document.querySelectorAll('#vlt-list .vlt-row').forEach(r=>{
    const hay=r.getAttribute('data-text')||'';
    r.style.display = (!q || hay.includes(q)) ? '' : 'none';
  });
}
function _vendorLinkTaskPick(vendorId, taskId){
  _taskLinkVendor(taskId, vendorId);
  closeModalDirect();
  navigate(_currentPage||'vendors');
}
// Cross-link auto-prompt: vendor just linked to a task that has a budget line
// the vendor isn't on — ask before mirroring.
function _maybeMirrorVendorToBudget(taskId, vendorId){
  const t=STATE.checklist.find(x=>x.id===taskId); if(!t) return;
  const v=(STATE.vendors||[]).find(x=>x.id===vendorId); if(!v) return;
  const targets=_budgetTargetsForTask(t).filter(tg=>!_budgetVendorIds(tg.sid? tg.s : tg.b).includes(vendorId));
  if(!targets.length) return;
  const tg=targets[0];
  const name=tg.sid ? `${tg.b.name} › ${tg.s.name}` : tg.b.name;
  const body=`<div style="font-size:13px;color:var(--ink);line-height:1.5">
      “${_escHtml(v.business||'This vendor')}” is now linked to this task, which is also tied to the Payment <b>${_escHtml(name)}</b>.<br><br>Link the vendor to that Payment too?
    </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_closeConfirm2Direct&&_closeConfirm2Direct()">Skip</button>
    <button class="btn btn-primary btn-sm" onclick="_mirrorVendorToBudgetDo('${vendorId}','${tg.bid}','${tg.sid||''}')">Link it</button>`;
  if(typeof openConfirm2==='function') openConfirm2('Also link the Payment?', body, footer);
  else if(typeof openModal==='function') openModal('Also link the Payment?', body, footer);
}
function _mirrorVendorToBudgetDo(vendorId, bid, sid){
  const tgt=_budgetResolveTarget(bid, sid||'');
  if(tgt){ if(!Array.isArray(tgt.vendorIds)) tgt.vendorIds=[]; if(!tgt.vendorIds.includes(vendorId)) tgt.vendorIds.push(vendorId); }
  saveToStorage();
  if(_closeConfirm2Direct) _closeConfirm2Direct();
  if(typeof navigate==='function') navigate(_currentPage||'vendors');
}
// Vendor badge display style: 'name' (status-coloured name pill, default), 'avatar' (status avatar + name), 'off'.
function _vendorBadgeStyle(){ return (STATE.settings && STATE.settings.vendorBadgeStyle) || 'name'; }
// Style-A pill that collapses to icon-only under the narrow breakpoint.
function _vendorBadgeHtml(vendorId, bid, sid){
  const v=(STATE.vendors||[]).find(x=>x.id===vendorId); if(!v) return '';
  const sm=_vendorStatusMeta(v.status);
  const arg=`'${vendorId}','${bid}','${sid||''}'`;
  const name=_escHtml(v.business||'Vendor');
  if(_vendorBadgeStyle()==='avatar'){
    const initial=_escHtml(_vendorInitial(v.business));
    return `<button type="button" class="ven-badge ven-badge-avatar" onclick="event.stopPropagation();_budgetVendorBadgePopup(${arg})" title="${name}" style="display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:600;border-radius:13px;padding:2px 10px 2px 2px;background:var(--surface);color:var(--ink);border:.5px solid var(--border);cursor:pointer;max-width:170px;vertical-align:middle;text-align:left">
      <span style="width:20px;height:20px;border-radius:50%;background:${sm.bg};color:${sm.fg};display:inline-flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:700;flex-shrink:0">${initial}</span>
      <span class="ven-badge-label" style="white-space:normal;line-height:1.2;word-break:break-word">${name}</span>
    </button>`;
  }
  return `<button type="button" class="ven-badge" onclick="event.stopPropagation();_budgetVendorBadgePopup(${arg})" title="${name}" style="display:inline-flex;align-items:flex-start;gap:4px;font-size:10px;font-weight:600;border-radius:7px;padding:2px 8px;background:${sm.bg};color:${sm.fg};border:.5px solid ${sm.fg};cursor:pointer;max-width:170px;vertical-align:middle;text-align:left">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><path d="M2 5h20v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M4 11v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9"/><path d="M9 21v-6h6v6"/></svg>
    <span class="ven-badge-label" style="white-space:normal;line-height:1.25;word-break:break-word">${name}</span>
  </button>`;
}
// All badges for a target + a small "+ vendor" add button.
function _budgetVendorBadges(target, bid, sid){
  if(_vendorBadgeStyle()==='off') return '';
  const ids=_budgetVendorIds(target);
  if(!ids.length) return '';
  const badges=ids.map(id=>_vendorBadgeHtml(id, bid, sid)).join('');
  return `<span class="ven-badge-wrap" style="display:inline-flex;flex-wrap:wrap;gap:4px;align-items:center">${badges}</span>`;
}
// Popup: vendor info + Go to vendor (flash) + Unlink from this target.
function _budgetVendorBadgePopup(vendorId, bid, sid){
  const v=(STATE.vendors||[]).find(x=>x.id===vendorId); if(!v) return;
  const sm=_vendorStatusMeta(v.status); const esc=_escHtml;
  const line=(icon,val,href)=>val?`<div style="font-size:12px;color:var(--ink);display:flex;align-items:center;gap:7px;margin-top:6px">${icon}${href?`<a href="${href}" target="_blank" rel="noopener noreferrer" style="color:var(--gold-deep);text-decoration:underline;word-break:break-word">${esc(val)}</a>`:`<span style="word-break:break-word">${esc(val)}</span>`}</div>`:'';
  const phoneIcon='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
  const pinIcon='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  const mailIcon='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>';
  const webIcon='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  const starIcon='<svg width="13" height="13" viewBox="0 0 24 24" fill="#F5A623" stroke="#F5A623" stroke-width="1.5" style="flex-shrink:0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  const ratingTxt = v.rating ? (v.rating + (v.reviewCount?` · ${v.reviewCount} review${String(v.reviewCount)==='1'?'':'s'}`:'')) : '';
  const body=`<div style="display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
      <span style="width:34px;height:34px;border-radius:9px;background:${sm.bg};color:${sm.fg};display:inline-flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0">${esc(_vendorInitial(v.business))}</span>
      <div style="min-width:0"><div style="font-size:14px;font-weight:600;color:var(--ink);word-break:break-word">${esc(v.business||'Vendor')}</div><div style="font-size:10.5px;color:var(--gold-deep);text-transform:uppercase;letter-spacing:.04em">${[esc(v.category||''), sm.label].filter(Boolean).join(' · ')}</div></div>
    </div>
    ${v.contact?`<div style="font-size:12px;color:var(--ink);display:flex;align-items:center;gap:7px;margin-top:6px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${esc(v.contact)}</div>`:''}
    ${line(phoneIcon, v.phone, v.phone?('tel:'+String(v.phone).replace(/[^+\d]/g,'')):'')}
    ${line(mailIcon, v.email, v.email?('mailto:'+v.email):'')}
    ${line(pinIcon, v.address, v.address?_mapsUrl(v.address):'')}
    ${line(webIcon, v.website?_urlDomain(v.website):'', v.website?_normalizeUrl(v.website):'')}
    ${ratingTxt?`<div style="font-size:12px;color:var(--ink);display:flex;align-items:center;gap:7px;margin-top:6px">${starIcon}${esc(ratingTxt)}</div>`:''}
    <div style="display:flex;gap:7px;margin-top:14px">
      <button class="btn btn-primary btn-sm" style="flex:1;justify-content:center;gap:5px" onclick="_goToVendor('${vendorId}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>Go to vendor</button>
      <button class="btn btn-outline btn-sm" style="color:var(--red);border-color:rgba(192,57,43,.4)" onclick="_budgetUnlinkVendor('${vendorId}','${bid}','${sid||''}')">Unlink</button>
    </div>
  </div>`;
  openModal(v.business||'Vendor', body, '');
}
let _pendingVendorFlash='';
function _goToVendor(vendorId){
  closeModalDirect();
  _pendingVendorFlash=vendorId;
  navigate('vendors');
  setTimeout(()=>_flashVendorCard(vendorId), 80);
}
function _flashVendorCard(vendorId){
  const el=document.querySelector('.ven-card-flash'); if(el) el.classList.remove('ven-card-flash');
  const card=document.querySelector('[data-vendor-id="'+vendorId+'"]');
  if(card){
    try{ card.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ }
    card.classList.add('ven-card-flash');
    setTimeout(()=>{ try{ card.classList.remove('ven-card-flash'); }catch(_){} }, 1700);
  }
  _pendingVendorFlash='';
}
// Add a vendor to a budget target — pick existing or add new.
function _budgetAddVendor(bid, sid){
  const vendors=(STATE.vendors||[]);
  const target=_budgetResolveTarget(bid, sid);
  const has=new Set(_budgetVendorIds(target));
  const pool=vendors.filter(v=>!has.has(v.id));
  const rows = pool.length ? pool.map(v=>{
    const sm=_vendorStatusMeta(v.status);
    return `<button type="button" onclick="_budgetLinkVendor('${v.id}','${bid}','${sid||''}')" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;border-bottom:.5px solid var(--border);padding:10px 11px;cursor:pointer">
      <span style="width:26px;height:26px;border-radius:7px;background:${sm.bg};color:${sm.fg};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;pointer-events:none;font-size:11px;font-weight:600">${_escHtml(_vendorInitial(v.business))}</span>
      <span style="flex:1;min-width:0;pointer-events:none"><span style="display:block;font-size:12.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(v.business||'Untitled vendor')}</span><span style="display:block;font-size:10px;color:var(--muted)">${_escHtml(v.category||'No category')} · ${sm.label}</span></span>
    </button>`;
  }).join('') : `<div style="font-size:12px;color:var(--muted);text-align:center;padding:14px">${vendors.length?'All vendors are already linked here.':'No vendors yet.'}</div>`;
  const body=`<div style="padding:2px">
    <button class="btn btn-primary btn-sm" onclick="_budgetAddNewVendor('${bid}','${sid||''}')" style="width:100%;justify-content:center;gap:5px;margin-bottom:12px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add a new vendor</button>
    ${vendors.length?`<div style="font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:0 4px 6px">Or link an existing vendor</div><div style="border:.5px solid var(--border);border-radius:11px;overflow:hidden;max-height:280px;overflow-y:auto">${rows}</div>`:''}
  </div>`;
  openModal('Add a vendor', body, '');
}
function _budgetResolveTarget(bid, sid){
  const b=(STATE.budget.items||[]).find(x=>x.id===bid); if(!b) return null;
  if(sid){ const s=(b.subItems||[]).find(x=>x.id===sid); return s||null; }
  return b;
}
function _budgetLinkVendor(vendorId, bid, sid){
  const target=_budgetResolveTarget(bid, sid); if(!target){ closeModalDirect(); return; }
  if(!Array.isArray(target.vendorIds)) target.vendorIds=[];
  if(!target.vendorIds.includes(vendorId)) target.vendorIds.push(vendorId);
  saveToStorage();
  closeModalDirect();
  navigate('budget');
}
function _budgetUnlinkVendor(vendorId, bid, sid){
  const target=_budgetResolveTarget(bid, sid); if(!target){ closeModalDirect(); return; }
  target.vendorIds=_budgetVendorIds(target).filter(id=>id!==vendorId);
  saveToStorage();
  closeModalDirect();
  navigate(_currentPage==='vendors'?'vendors':'budget');
}
let _budgetAddVendorCtx=null;
function _budgetAddNewVendor(bid, sid){
  _budgetAddVendorCtx={bid, sid:sid||''};
  closeModalDirect();
  _popupBackPending=()=>_budgetAddVendor(bid, sid);
  _vendorOpenForm(null, {budgetLink:{bid, sid:sid||''}});
}
function _saveCeremonyDetails(){
  if(!STATE.event) STATE.event={};
  STATE.event.religion=_otherSelectValue('ven-religion');
  STATE.event.officiant=_otherSelectValue('ven-officiant');
  STATE.event.ceremonyVenue=_otherSelectValue('ven-cervenue');
  saveToStorage();
  const m=document.getElementById('ven-cer-saved'); if(m){ m.style.display='inline'; setTimeout(()=>{ try{m.style.display='none';}catch(_){} },1600); }
}
// "+ Add [selected]" link control + a linked-vendor card under Married-by / Venue.
function _cerLinkHtml(role, selectedValue, linkedId){
  return `<div id="cer-link-${role}">${_cerLinkInner(role, selectedValue, linkedId)}</div>`;
}
function _cerLinkInner(role, selectedValue, linkedId){
  if(!selectedValue) return '';
  const v = linkedId ? (STATE.vendors||[]).find(x=>x.id===linkedId) : null;
  if(v){
    const sm=_vendorStatusMeta(v.status);
    return `<div style="display:flex;align-items:center;gap:8px;border:.5px solid var(--border);background:var(--surface);border-radius:9px;padding:8px 10px;margin-top:7px">
      <span style="width:26px;height:26px;border-radius:7px;background:rgba(29,158,117,.16);color:var(--green);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg></span>
      <div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(v.business||'Vendor')}</div><div style="font-size:10.5px;color:var(--muted)">${_escHtml(v.category||'')}${v.category?' · ':''}${_vendorStatusMeta(v.status).label}</div></div>
      <button onclick="_cerUnlink('${role}')" title="Unlink" aria-label="Unlink vendor" style="background:none;border:none;color:var(--red);cursor:pointer;flex-shrink:0;display:inline-flex"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>`;
  }
  return `<button class="btn btn-sm" onclick="_cerLinkOpen('${role}')" style="margin-top:7px;font-size:11.5px;border:.5px dashed var(--gold-deep);color:var(--gold-deep);background:none;display:inline-flex;align-items:center;gap:5px;padding:5px 10px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add ${_escHtml(selectedValue)}</button>`;
}
function _cerRoleCategory(role){ return role==='venue' ? 'Ceremony venue' : 'Celebrant / Officiant'; }
function _cerRoleField(role){ return role==='venue' ? 'venueVendorId' : 'officiantVendorId'; }
// Open a picker: link an existing vendor card or add a new one for this ceremony role.
function _cerLinkOpen(role){
  // Linking a vendor confirms the dropdown choice — keep it so it survives re-renders.
  if(!STATE.event) STATE.event={};
  const _sel=_otherSelectValue(_cerSelectId(role));
  if(_sel){ STATE.event[role==='venue'?'ceremonyVenue':'officiant']=_sel; saveToStorage(); }
  const cat=_cerRoleCategory(role);
  const matches=(STATE.vendors||[]).filter(v=>!v.category || v.category===cat);
  const list=(STATE.vendors||[]);
  const rowsArr = list.length ? list : [];
  const rows = rowsArr.map(v=>{
    const sm=_vendorStatusMeta(v.status);
    return `<button type="button" onclick="_cerLinkPick('${role}','${v.id}')" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;border-bottom:.5px solid var(--border);padding:11px 12px;cursor:pointer">
      <span style="width:28px;height:28px;border-radius:7px;background:${sm.bg};color:${sm.fg};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;pointer-events:none;font-size:11px;font-weight:600">${_escHtml(_vendorInitial(v.business))}</span>
      <span style="flex:1;min-width:0;pointer-events:none"><span style="display:block;font-size:13px;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(v.business||'Untitled vendor')}</span><span style="display:block;font-size:10.5px;color:var(--muted)">${_escHtml(v.category||'No category')} · ${sm.label}</span></span>
    </button>`;
  }).join('');
  const body=`<div style="padding:2px">
    <button class="btn btn-primary btn-sm" onclick="_cerLinkAddNew('${role}')" style="width:100%;justify-content:center;gap:5px;margin-bottom:12px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add a new vendor</button>
    ${list.length?`<div style="font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:0 4px 6px">Or link an existing vendor</div><div style="border:.5px solid var(--border);border-radius:11px;overflow:hidden">${rows}</div>`:`<div style="font-size:12px;color:var(--muted);text-align:center;padding:14px">No vendors yet — add a new one above.</div>`}
  </div>`;
  openModal('Link a vendor', body, '');
}
function _cerLinkPick(role, vendorId){
  if(!STATE.event) STATE.event={};
  STATE.event[_cerRoleField(role)]=vendorId;
  saveToStorage();
  closeModalDirect();
  if(document.getElementById('cer-link-'+role)) _cerRefreshLink(role, _cerSelectId(role), true);
  else navigate(_currentPage||'details');
}
function _cerLinkAddNew(role){
  closeModalDirect();
  _popupBackPending=()=>_cerLinkOpen(role);
  _vendorOpenForm(null, {category:_cerRoleCategory(role), linkRole:role});
}
function _cerUnlink(role){
  if(STATE.event) STATE.event[_cerRoleField(role)]='';
  saveToStorage();
  // Refresh in place so the (possibly unsaved) dropdown choice isn't reset to "—".
  if(document.getElementById('cer-link-'+role)) _cerRefreshLink(role, _cerSelectId(role), true);
  else navigate(_currentPage||'details');
}
// ── Hide / show popup (matches the Guest List "Show / hide items" format) ─────
const _VENDOR_HIDE_SECTIONS=[
  {group:'Other', key:'hideVendorSuggestions', label:'Suggested from appointments'},
  {group:'Planner links', key:'vcHidePlannerLinks', label:'Planner links (all)'},
  {group:'Planner links', key:'vcHidePlannerPassed', label:'Passed dates'},
  {group:'Vendor card fields', key:'vcHideReview', label:'Google review'},
  {group:'Vendor card fields', key:'vcHideHours', label:'Opening hours'},
  {group:'Vendor card fields', key:'vcHidePhone', label:'Phone number'},
  {group:'Vendor card fields', key:'vcHideEmail', label:'Email'},
  {group:'Vendor card fields', key:'vcHideAddress', label:'Address'},
  {group:'Vendor card fields', key:'vcHideWebsite', label:'Website'}
];
function _vendorSectionShown(key){
  return !(STATE.settings&&STATE.settings[key]);
}
function _vendorRowDisabled(key){
  // "Passed dates" is meaningless when the whole Planner Links panel is hidden.
  return key==='vcHidePlannerPassed' && _plannerLinksHidden();
}
function _vendorEyeRow(s, last){
  const shown=_vendorSectionShown(s.key);
  const indent = (s.key!=='__all_cer__' && s.group==='Ceremony details') || s.key==='vcHidePlannerPassed';
  const isMaster = (s.key==='__all_cer__' || s.key==='vcHidePlannerLinks');
  const disabled=_vendorRowDisabled(s.key);
  const dim = disabled ? '.35' : (shown?'1':'.55');
  return `<div onclick="${disabled?'':`_vendorToggleSection('${s.key}')`}" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 2px;${last?'':'border-bottom:1px solid var(--border);'}cursor:${disabled?'default':'pointer'};${indent?'padding-left:22px;':''}opacity:${dim}">
    <span style="font-size:12.5px;color:var(--ink);white-space:nowrap;${isMaster?'font-weight:500':''}">${s.label}</span>
    ${disabled ? _toggleSwitch(shown, '') : _toggleSwitch(shown, `_vendorToggleSection('${s.key}')`)}
  </div>`;
}
function _eyeSvg(shown){
  return shown
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}
function _vendorSectionsMenuHtml(){
  const heading=g=>`<div style="font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:9px 0 2px">${g}</div>`;
  const groupOrder=['Planner links','Other','Vendor card fields'];
  const rowFor=(s)=>{
    const shown=_vendorSectionShown(s.key);
    const disabled=_vendorRowDisabled(s.key);
    const indent = (s.key==='vcHidePlannerPassed');
    return `<label onclick="event.stopPropagation()" style="display:flex;align-items:center;gap:9px;font-size:12.5px;color:${shown?'var(--ink)':'var(--muted)'};padding:5px 2px;${indent?'padding-left:22px;':''}cursor:${disabled?'default':'pointer'};opacity:${disabled?'.4':'1'}">
      <input type="checkbox" ${shown?'checked':''} ${disabled?'disabled':''} onchange="_vendorToggleSection('${s.key}')" style="width:15px;height:15px;accent-color:var(--gold-deep);cursor:${disabled?'default':'pointer'}"/>
      ${s.label}
    </label>`;
  };
  let groupsHtml='';
  groupOrder.forEach((g,gi)=>{
    const rows=_VENDOR_HIDE_SECTIONS.filter(s=>s.group===g);
    if(!rows.length) return;
    groupsHtml+=(gi===0?'':'')+heading(g)+rows.map(rowFor).join('');
  });
  return `<div id="vendor-sections-menu" style="display:none;position:absolute;top:calc(100% + 6px);right:0;z-index:60;width:250px;background:var(--cream);border:1px solid var(--border);border-radius:11px;box-shadow:0 4px 24px rgba(26,26,24,.12);padding:13px 15px;text-align:left">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
      <div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-deep)">Show items</div>
      <button onclick="_vendorSectionsReset()" style="background:none;border:none;color:var(--gold-deep);cursor:pointer;font-size:10px;text-decoration:underline;font-family:inherit;padding:0">Reset</button>
    </div>
    ${groupsHtml}
  </div>`;
}
function _vendorSectionsReset(){ _vendorSetAllSections(true); }
function _vendorAttachSectionsCloser(){
  const close=(ev)=>{
    const menu=document.getElementById('vendor-sections-menu');
    const wrap=document.getElementById('vendor-sections-wrap');
    if(menu && wrap && !wrap.contains(ev.target)){ menu.style.display='none'; document.removeEventListener('click',close); }
  };
  setTimeout(()=>document.addEventListener('click',close),0);
}
function _vendorToggleSectionsMenu(e){
  if(e) e.stopPropagation();
  const m=document.getElementById('vendor-sections-menu');
  if(!m) return;
  const showing=m.style.display!=='none' && m.style.display!=='';
  m.style.display=showing?'none':'block';
  if(!showing) _vendorAttachSectionsCloser();
}
function _vendorReopenSectionsMenu(){ const m=document.getElementById('vendor-sections-menu'); if(m){ m.style.display='block'; _vendorAttachSectionsCloser(); } }
function _refreshVendorEyeIcons(){
  _VENDOR_HIDE_SECTIONS.forEach(s=>{
    const shown=_vendorSectionShown(s.key);
    const cell=document.querySelector('.vhb[data-k="'+s.key+'"]');
    if(!cell) return;
    cell.style.color=shown?'var(--gold-deep)':'var(--muted)';
    cell.innerHTML=_eyeSvg(shown);
    const row=cell.parentElement;
    if(row) row.style.opacity=_vendorRowDisabled(s.key)?'.35':(shown?'1':'.55');
  });
}
function _vendorToggleSection(key){
  if(!STATE.settings) STATE.settings={};
  STATE.settings[key]=!STATE.settings[key];
  saveToStorage();
  const c=document.getElementById('main-content'); const a=document.getElementById('topbar-actions');
  if(c&&a && _currentPage==='vendors'){
    renderVendors(c,a);
  }
  // Re-render rebuilt the topbar (and the popover) — reopen it so toggling is fluid.
  setTimeout(_vendorReopenSectionsMenu, 40);
}
function _vendorSetAllSections(show){
  if(!STATE.settings) STATE.settings={};
  ['hideVendorSuggestions','vcHidePlannerLinks','vcHidePlannerPassed','vcHideReview','vcHideHours','vcHidePhone','vcHideEmail','vcHideAddress','vcHideWebsite'].forEach(k=>{ STATE.settings[k]=!show; });
  saveToStorage();
  const c=document.getElementById('main-content'); const a=document.getElementById('topbar-actions');
  if(c&&a && _currentPage==='vendors') renderVendors(c,a);
  setTimeout(_vendorReopenSectionsMenu, 40);
}
function _vendorAddSuggestion(taskId, apptId){
  const a=_findAppt(taskId, apptId); if(!a) return;
  if(!Array.isArray(STATE.vendors)) STATE.vendors=[];
  if(!STATE.vendors.some(v=>_vendorMatches(v, a))) STATE.vendors.push(_vendorFromAppt(a));
  saveToStorage();
  navigate('vendors');
}
function _vendorDismissSuggestion(apptId){ _vendorDismissedSuggest[apptId]=true; navigate('vendors'); }
function _vendorCycleStatus(id){
  const v=STATE.vendors.find(x=>x.id===id); if(!v) return;
  const i=VENDOR_STATUSES.indexOf(v.status||'possible');
  v.status=VENDOR_STATUSES[(i+1)%VENDOR_STATUSES.length];
  saveToStorage();
  navigate('vendors');
}
function _vendorDelete(id){
  const v=STATE.vendors.find(x=>x.id===id); if(!v) return;
  _confirmDeleteDialog({title:'Delete vendor', question:'Delete this vendor?', name:v.business, verb:'Delete', onConfirmJs:`_vendorConfirmDelete('${id}')`});
}
function _vendorConfirmDelete(id){
  const _v0=STATE.vendors.find(x=>x.id===id);
  const _label=_v0?(_v0.business||'vendor'):'vendor';
  closeModalDirect();
  _undoableDelete(_label, ()=>{
    STATE.vendors=STATE.vendors.filter(x=>x.id!==id);
  }, 'vendors');
}
let _vendorFormStatus='possible';
let _vendorFormLinkRole='';
let _vendorFormBudgetLink=null;
function _vendorOpenForm(id, opts){
  opts=opts||{};
  _adoptPopupBack();
  const v = id ? STATE.vendors.find(x=>x.id===id) : null;
  const isEdit=!!v;
  const d=v||{business:'',category:opts.category||'',status:'possible',contact:'',phone:'',email:'',address:'',website:'',notes:'',fee:0,hours:'',setupTime:'',abn:'',bsb:'',acctNumber:'',acctName:'',rating:'',reviewCount:''};
  _vendorFormLinkRole = opts.linkRole || '';
  _vendorFormBudgetLink = opts.budgetLink || null;
  const statusBtns=VENDOR_STATUSES.map(s=>{ const sm=_vendorStatusMeta(s); const on=(d.status||'possible')===s; return `<button type="button" class="ven-status-chip" data-s="${s}" onclick="_vendorFormSetStatus('${s}')" style="flex:1;font-size:12px;padding:7px;border-radius:8px;border:.5px solid ${on?sm.fg:'var(--border)'};background:${on?sm.bg:'var(--surface)'};color:${sm.fg};font-weight:500;cursor:pointer">${sm.label}</button>`; }).join('');
  const body=`<div style="display:flex;flex-direction:column;gap:11px">
    <div style="border:.5px dashed var(--gold-deep);background:rgba(156,122,60,.06);border-radius:9px;padding:9px 10px">
      <div style="font-size:11px;font-weight:500;color:var(--gold-deep);display:flex;align-items:center;gap:5px;margin-bottom:5px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Paste Google business info</div>
      <textarea id="ven-f-paste" rows="2" placeholder="Copy the business details from its Google listing (name, address, phone, hours…) and paste here" style="width:100%;font-size:11.5px;border:.5px solid var(--border);border-radius:7px;padding:7px;background:var(--panel);color:var(--ink);resize:vertical;box-sizing:border-box"></textarea>
      <button type="button" class="btn btn-sm" onclick="_vendorAutofillFromPaste()" style="margin-top:7px;font-size:11.5px;border:.5px solid var(--gold-deep);color:var(--gold-deep);background:none;display:inline-flex;align-items:center;gap:5px;padding:5px 11px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M15 9h0M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5"/></svg>Autofill from paste</button>
      <div id="ven-f-paste-msg" style="font-size:10.5px;color:var(--green);margin-top:6px;display:none"></div>
    </div>
    <div><label class="form-label">Business name</label><input id="ven-f-business" class="form-input" placeholder="e.g. Rosewood Florals" value="${_escHtml(d.business)}" style="font-size:12.5px"/></div>
    <div><label class="form-label">Category</label>${_otherSelectHtml('ven-f-category', vendorCats(), d.category)}${(STATE.vendorCustomCats||[]).length?`<div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:4px">${(STATE.vendorCustomCats||[]).map(c=>`<span class="ven-custom-cat-chip" style="display:inline-flex;align-items:center;gap:3px;background:var(--surface);border:.5px solid var(--border);border-radius:10px;padding:2px 6px 2px 8px;font-size:10.5px;color:var(--muted)">${_escHtml(c)}<button type="button" onclick="_deleteVendorCategory(this)" data-cat="${_escHtml(c)}" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:11px;line-height:1;padding:0 2px" title="Remove category">✕</button></span>`).join('')}</div>`:''}</div>
    <div><label class="form-label">Status</label><div style="display:flex;gap:6px;flex-wrap:wrap">${statusBtns}</div></div>
    <div class="form-row" style="gap:10px">
      <div style="flex:1"><label class="form-label">Contact name</label><input id="ven-f-contact" class="form-input" value="${_escHtml(d.contact)}" style="font-size:12.5px"/></div>
      <div style="flex:1"><label class="form-label">Phone</label><input id="ven-f-phone" class="form-input" type="tel" value="${_escHtml(d.phone)}" style="font-size:12.5px"/></div>
    </div>
    <div><label class="form-label">Email</label><input id="ven-f-email" class="form-input" type="email" value="${_escHtml(d.email)}" style="font-size:12.5px"/></div>
    <div><label class="form-label">Address</label><input id="ven-f-address" class="form-input" value="${_escHtml(d.address)}" style="font-size:12.5px"/></div>
    <div><label class="form-label">Website</label><input id="ven-f-website" class="form-input" placeholder="e.g. rosewood.com" value="${_escHtml(d.website)}" style="font-size:12.5px"/></div>
    <div class="form-row" style="gap:10px">
      <div style="flex:1.4"><label class="form-label">Google rating</label><input id="ven-f-rating" class="form-input" inputmode="decimal" placeholder="e.g. 4.8" value="${_escHtml(d.rating||'')}" style="font-size:12.5px"/></div>
      <div style="flex:1"><label class="form-label">Reviews</label><input id="ven-f-reviewcount" class="form-input" inputmode="numeric" placeholder="e.g. 120" value="${_escHtml(d.reviewCount||'')}" style="font-size:12.5px"/></div>
    </div>
    <div><label class="form-label">Opening hours</label><textarea id="ven-f-hours" class="form-input" rows="2" placeholder="e.g. Mon–Fri 9 am–5 pm" style="font-size:12.5px;resize:vertical">${_escHtml(d.hours||'')}</textarea></div>
    <div><label class="form-label">Setup time</label><input id="ven-f-setuptime" class="form-input" type="text" placeholder="e.g. 2 hours before ceremony" value="${_escHtml(d.setupTime||'')}" style="font-size:12.5px"/></div>
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--gold-deep);font-weight:600;border-top:.5px solid var(--border);padding-top:11px">Billing &amp; payment</div>
    <div><label class="form-label">ABN</label><input id="ven-f-abn" class="form-input" inputmode="numeric" placeholder="e.g. 12 345 678 901" value="${_escHtml(d.abn||'')}" style="font-size:12.5px"/></div>
    <div class="form-row" style="gap:10px">
      <div style="flex:1"><label class="form-label">BSB</label><input id="ven-f-bsb" class="form-input" inputmode="numeric" placeholder="e.g. 062-000" value="${_escHtml(d.bsb||'')}" style="font-size:12.5px"/></div>
      <div style="flex:1.3"><label class="form-label">Account number</label><input id="ven-f-acctnumber" class="form-input" inputmode="numeric" value="${_escHtml(d.acctNumber||'')}" style="font-size:12.5px"/></div>
    </div>
    <div><label class="form-label">Account name</label><input id="ven-f-acctname" class="form-input" value="${_escHtml(d.acctName||'')}" style="font-size:12.5px"/></div>
    <div><label class="form-label">Notes</label><textarea id="ven-f-notes" class="form-input" rows="2" style="font-size:12.5px;resize:vertical">${_escHtml(d.notes)}</textarea></div>
  </div>`;
  const footer=`${_popupBackBtnHtml()}<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="_vendorSaveForm(${isEdit?`'${id}'`:'null'})">${isEdit?'Save changes':'Add vendor'}</button>`;
  _vendorFormStatus=d.status||'possible';
  openModal(isEdit?'Edit vendor':'New vendor', body, footer);
}
function _vendorFormSetStatus(s){
  _vendorFormStatus=s;
  document.querySelectorAll('.ven-status-chip').forEach(el=>{ const sm=_vendorStatusMeta(el.getAttribute('data-s')); const on=el.getAttribute('data-s')===s; el.style.borderColor=on?sm.fg:'var(--border)'; el.style.background=on?sm.bg:'var(--surface)'; });
}
// Best-effort parser for text copied from a Google business listing. Fills only the
// fields it can confidently recognise; leaves the rest untouched.
function _vendorAutofillFromPaste(){
  const raw=(document.getElementById('ven-f-paste')?.value||'').trim();
  const msg=document.getElementById('ven-f-paste-msg');
  if(!raw){ if(msg){ msg.style.color='var(--muted)'; msg.style.display='block'; msg.textContent='Paste some text first.'; } return; }
  const lines=raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const setIf=(id,val)=>{ if(!val) return false; const el=document.getElementById(id); if(el){ el.value=val; return true; } return false; };
  const filled=[];
  // Rating + review count. Handle three Google formats:
  // "4.8 ★★★★★ 7 Google reviews" (separated by stars)
  // "4.8 (1,234)" (parenthesised count)
  // "4.87 Google reviews" (count runs straight onto rating — no separator)
  let rating='', reviews='';
  const rCombined=raw.match(/\b([0-5]\.\d)(\d+)\s+(?:\w+\s+)*reviews?/i);
  if(rCombined){ rating=rCombined[1]; reviews=rCombined[2]; }
  else {
    const rm=raw.match(/\b([0-5](?:\.\d)?)\s*(?:★+|stars?|\/\s*5)/i)||raw.match(/^\s*([0-5]\.\d)\b/m);
    if(rm) rating=rm[1];
    const rc=raw.match(/\(([\d,]+)\)/)||raw.match(/([\d,]+)\s+(?:\w+\s+)*reviews?/i);
    if(rc) reviews=rc[1].replace(/,/g,'');
  }
  // Phone — AU/intl patterns.
  let phone='';
  const pm = raw.match(/(\+?\d[\d\s().-]{7,}\d)/);
  if(pm){ const cand=pm[1].trim(); if((cand.replace(/\D/g,'').length>=8)) phone=cand; }
  // Website — a domain or URL (skip google.com map links).
  let website='';
  const wm = raw.match(/\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?(?:\/[^\s]*)?)/i);
  if(wm && !/google\.|maps\.|goo\.gl|\.png|\.jpg/i.test(wm[1])) website=wm[1];
  // Address — a line with a street number + street word, optionally state/postcode.
  let address='';
  for(const l of lines){
    if(/\d+[a-zA-Z]?[\/\- ].*(St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Hwy|Highway|Ln|Lane|Ct|Court|Pl|Place|Way|Blvd|Boulevard|Tce|Terrace|Cres|Crescent|Pde|Parade)\b/i.test(l)
       || /\b(QLD|NSW|VIC|SA|WA|TAS|NT|ACT)\b\s*\d{4}/i.test(l)){
      address=l.replace(/^(Address:?\s*)/i,''); break;
    }
  }
  // Opening hours — lines mentioning a weekday + a time, gathered together.
  const hourLines=lines.filter(l=>/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(l) && /(\d{1,2}(:\d{2})?\s*(am|pm)|24 hours|closed|open)/i.test(l));
  const hours=hourLines.join('\n');
  // Business name — first line that isn't rating/category/button chrome.
  let name='';
  for(const l of lines){
    if(/^[0-5]\.\d/.test(l)) continue;
    if(/^(directions|save|nearby|website|call|share|menu|order|reviews?|overview|about|photos?)\b/i.test(l)) continue;
    if(l===address) continue;
    if(/^\+?\d[\d\s().-]{7,}$/.test(l)) continue;
    if(/^[★☆\s\d.,()]+$/.test(l)) continue;
    name=l; break;
  }
  if(name && setIf('ven-f-business', name)) filled.push('name');
  if(phone && setIf('ven-f-phone', phone)) filled.push('phone');
  if(website && setIf('ven-f-website', website)) filled.push('website');
  if(address && setIf('ven-f-address', address)) filled.push('address');
  if(hours && setIf('ven-f-hours', hours)) filled.push('hours');
  if(rating && setIf('ven-f-rating', rating)) filled.push('rating');
  if(reviews && setIf('ven-f-reviewcount', reviews)) filled.push('reviews');
  // Category — guess from paste text (use name + full raw for broadest coverage).
  const sel=document.getElementById('ven-f-category');
  if(sel && (sel.value===''||sel.value==='—')){
    const guessedCat=_guessVendorCategory({business:name,type:raw,notes:''});
    if(guessedCat && [...sel.options].some(o=>o.value===guessedCat)){
      sel.value=guessedCat; filled.push('category');
    }
  }
  if(msg){
    msg.style.display='block';
    if(filled.length){ msg.style.color='var(--green)'; msg.textContent='Filled: '+filled.join(', ')+'. Check the fields before saving.'; }
    else { msg.style.color='var(--muted)'; msg.textContent='Couldn’t recognise any fields — please enter them manually.'; }
  }
}
function _vendorSaveForm(id){
  const get=x=>(document.getElementById(x)?.value||'').trim();
  const rec={
    business:get('ven-f-business')||'Untitled vendor',
    category:addVendorCategory(_otherSelectValue('ven-f-category')),
    status:_vendorFormStatus||'possible',
    contact:get('ven-f-contact'), phone:get('ven-f-phone'), email:get('ven-f-email'),
    address:get('ven-f-address'), website:get('ven-f-website'), notes:get('ven-f-notes'),
    hours:get('ven-f-hours'), setupTime:get('ven-f-setuptime'), abn:get('ven-f-abn'), bsb:get('ven-f-bsb'),
    acctNumber:get('ven-f-acctnumber'), acctName:get('ven-f-acctname'),
    rating:get('ven-f-rating'), reviewCount:get('ven-f-reviewcount')
  };
  if(id){
    const v=STATE.vendors.find(x=>x.id===id); if(v) Object.assign(v, rec);
  } else {
    const nv=Object.assign({id:_vendorNewId(), fee:0, fromApptId:''}, rec);
    STATE.vendors.push(nv);
    if(_vendorFormLinkRole){
      if(!STATE.event) STATE.event={};
      STATE.event[_cerRoleField(_vendorFormLinkRole)]=nv.id;
      _vendorFormLinkRole='';
    }
    if(_vendorFormBudgetLink){
      const tgt=_budgetResolveTarget(_vendorFormBudgetLink.bid, _vendorFormBudgetLink.sid);
      if(tgt){ if(!Array.isArray(tgt.vendorIds)) tgt.vendorIds=[]; if(!tgt.vendorIds.includes(nv.id)) tgt.vendorIds.push(nv.id); }
      _vendorFormBudgetLink=null;
    }
  }
  saveToStorage();
  closeModalDirect();
  navigate('vendors');
}
function _vendorApplyToAppt(id){
  const v=STATE.vendors.find(x=>x.id===id); if(!v) return;
  const all=_allAppointments();
  const rows=all.map(({appt,taskId})=>{
    const t=STATE.checklist.find(x=>x.id===taskId);
    const when=[appt.date?fmtBudgetDate(appt.date):'', appt.time?_fmtApptTime(appt.time):''].filter(Boolean).join(' · ');
    const label=appt.business||appt.contact||appt.type||'Appointment';
    const sub=[t?t.text:'', when].filter(Boolean).join(' — ');
    return `<button type="button" onclick="_vendorApplyToApptPick('${id}','${taskId||''}','${appt.id}')" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;border-bottom:.5px solid var(--border);padding:11px 12px;cursor:pointer">
      <span style="width:28px;height:28px;border-radius:7px;background:rgba(196,168,130,.16);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;pointer-events:none"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
      <span style="flex:1;min-width:0;pointer-events:none"><span style="display:block;font-size:13px;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(label)}</span>${sub?`<span style="display:block;font-size:10.5px;color:var(--muted)">${_escHtml(sub)}</span>`:''}</span>
    </button>`;
  }).join('');
  const newBtn=`<button type="button" class="btn btn-primary btn-sm" onclick="_vendorNewApptTask('${id}')" style="width:100%;justify-content:center;gap:6px;margin-bottom:12px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Create a new appointment</button>`;
  const existing = all.length
    ? `<div style="font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:0 4px 6px">Or apply to an existing appointment</div><div style="font-size:12px;color:var(--muted);line-height:1.5;margin:0 4px 9px">Fill an appointment with <strong>${_escHtml(v.business||'this vendor')}</strong>’s details (you’ll preview first).</div><div style="border:.5px solid var(--border);border-radius:11px;overflow:hidden">${rows}</div>`
    : `<div style="font-size:12px;color:var(--muted);text-align:center;padding:6px 4px">No appointments yet — create one above.</div>`;
  const body=`<div style="padding:2px">${newBtn}${existing}</div>`;
  openModal('Appointments', body, '');
}
// Create a fresh task + appointment pre-filled with this vendor's details.
function _vendorNewApptTask(vendorId){
  const v=STATE.vendors.find(x=>x.id===vendorId); if(v===undefined){ closeModalDirect(); return; }
  if(!v){ closeModalDirect(); return; }
  const cat=(typeof _resolveTaskCategory==='function')?_resolveTaskCategory((v.business||'')+' '+(v.category||''), [v.notes||'']):'';
  const task={id:'cl'+Date.now()+Math.floor(Math.random()*1000), text:(v.business?(v.business+' appointment'):'Vendor appointment'), done:false, dueDate:'', category:cat, notes:'', url:(v.website||''), pinned:false, budgetId:'', budgetSubId:'', appointments:[]};
  STATE.checklist.push(task);
  saveToStorage();
  closeModalDirect();
  // Pre-fill the appointment form from the vendor.
  const seed={ id:_apptNewId(), type:'Appointment', virtual:false,
    business:v.business||'', contact:v.contact||'', phone:v.phone||'', email:v.email||'',
    address:v.address||'', website:v.website||'', notes:v.notes||'' };
  _apptOpenForm({taskId:task.id}, seed);
}
function _vendorApplyToApptPick(vendorId, taskId, apptId){
  const v=STATE.vendors.find(x=>x.id===vendorId); const a=_findAppt(taskId, apptId);
  if(!v||!a){ closeModalDirect(); return; }
  _vendorApplyShowPreview(vendorId, taskId, apptId);
}
// Compute the merged result (vendor over appointment) without writing it.
function _vendorApplyMerge(v, a){
  const next=Object.assign({}, a);
  const changed={};
  const apply=(field, val, allow)=>{ if(val && (allow===undefined||allow) && String(val)!==String(a[field]||'')){ next[field]=val; changed[field]=true; } };
  apply('business', v.business);
  apply('contact', v.contact);
  apply('phone', v.phone);
  apply('email', v.email);
  apply('address', v.address, !a.virtual);
  apply('website', v.website);
  apply('notes', v.notes);
  return {next, changed};
}
function _vendorApplyShowPreview(vendorId, taskId, apptId){
  const v=STATE.vendors.find(x=>x.id===vendorId); const a=_findAppt(taskId, apptId);
  if(!v||!a){ closeModalDirect(); return; }
  const {next, changed}=_vendorApplyMerge(v, a);
  const esc=_escHtml;
  const when=[next.date?fmtBudgetDate(next.date):'', next.time?(_fmtApptTime(next.time)+(next.endTime?(' – '+_fmtApptTime(next.endTime)):'')):''].filter(Boolean).join(' · ');
  const tag=`<span style="font-size:8.5px;font-weight:600;border-radius:5px;padding:1px 5px;margin-left:5px;text-transform:uppercase;letter-spacing:.03em;background:rgba(196,168,130,.18);color:var(--gold-deep)">changed</span>`;
  const row=(k, val, isChanged, last)=>`<div style="display:flex;gap:8px;font-size:12.5px;padding:5px 0;${last?'':'border-bottom:.5px solid var(--border);'}align-items:baseline">
    <span style="width:80px;flex-shrink:0;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)">${k}</span>
    <span style="flex:1;word-break:break-word;color:${val?'var(--ink)':'var(--muted)'};${isChanged?'font-weight:500':''}">${val?esc(val):'—'}${isChanged?tag:''}</span>
  </div>`;
  const locVal = next.virtual ? (next.link?('Virtual · '+next.link):'Virtual') : (next.address||'');
  const rows=[
    row('Type', next.type||'Appointment', false),
    row('When', when, false),
    row('Business', next.business, changed.business),
    row('Contact', next.contact, changed.contact),
    row('Phone', next.phone, changed.phone),
    row('Email', next.email, changed.email),
    row(next.virtual?'Location':'Address', locVal, changed.address),
    row('Website', next.website, changed.website),
    Number(next.fee)>0 ? row('Fee', fmt(Number(next.fee)), false) : '',
    row('Notes', next.notes, changed.notes, true)
  ].filter(Boolean).join('');
  const nChanges=Object.keys(changed).length;
  const t=STATE.checklist.find(x=>_taskApptList(x).some(ap=>ap.id===apptId));
  const apptLabel=[next.type||'Appointment', next.date?fmtBudgetDate(next.date):''].filter(Boolean).join(' · ');
  const body=`<div style="padding:1px">
    <div style="font-size:12px;color:var(--muted);line-height:1.5;margin:2px 2px 11px">Applying <strong style="color:var(--ink)">${esc(v.business||'this vendor')}</strong> to the <strong style="color:var(--ink)">${esc(apptLabel)}</strong> appointment. ${nChanges?'Highlighted fields will change:':'No fields will change — the appointment already matches.'}</div>
    <div>${rows}</div>
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_vendorApplyToAppt('${vendorId}')">Cancel</button>
    <button class="btn btn-outline btn-sm" onclick="_vendorApplyEdit('${vendorId}','${taskId||''}','${apptId}')">Edit</button>
    <button class="btn btn-primary btn-sm" onclick="_vendorApplySave('${vendorId}','${taskId||''}','${apptId}')"${nChanges?'':' disabled style="opacity:.5"'}>Save</button>`;
  openModal('Apply to appointment', body, footer);
}
function _vendorApplySave(vendorId, taskId, apptId){
  const v=STATE.vendors.find(x=>x.id===vendorId); const a=_findAppt(taskId, apptId);
  if(!v||!a){ closeModalDirect(); return; }
  const {next}=_vendorApplyMerge(v, a);
  ['business','contact','phone','email','address','website','notes'].forEach(f=>{ a[f]=next[f]; });
  a.vendorId=v.id;
  saveToStorage();
  closeModalDirect();
  _vendorFlash='Applied “'+(v.business||'vendor')+'” to the appointment';
  navigate('vendors');
}
function _vendorApplyEdit(vendorId, taskId, apptId){
  const v=STATE.vendors.find(x=>x.id===vendorId); const a=_findAppt(taskId, apptId);
  if(!v||!a){ closeModalDirect(); return; }
  const {next}=_vendorApplyMerge(v, a);
  closeModalDirect();
  // Open the appointment editor pre-filled with the merged values for fine-tuning.
  _apptOpenForm({taskId: taskId||null, apptId: apptId, from:'details'}, next);
}
// ── Vendor hub: appointments, documents, linked Payment ─────────────────
let _vendorHubId='';
function _vendorOpenHub(vendorId){
  const v=(STATE.vendors||[]).find(x=>x.id===vendorId); if(!v) return;
  _vendorHubId=vendorId;
  if(!v.attachments) v.attachments=[];
  openModal((v.business||'Vendor'), _vendorHubBody(v), '');
}
function _vendorHubBody(v){
  const esc=_escHtml;
  // Appointments
  const appts=_vendorAppointments(v);
  const apptHtml = appts.length ? appts.map(({appt,taskId,reason})=>{
    const t=STATE.checklist.find(x=>x.id===taskId);
    const when=[appt.date?fmtBudgetDate(appt.date):'', appt.time?_fmtApptTime(appt.time):''].filter(Boolean).join(', ');
    const head=[appt.type||'Appointment', when].filter(Boolean).join(' · ');
    const sub=[t?t.text:'', reason].filter(Boolean).join(' — ');
    return `<button type="button" onclick="_vendorHubOpenAppt('${taskId||''}','${appt.id}')" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:.5px solid var(--border);border-radius:9px;padding:9px 11px;margin-bottom:7px;cursor:pointer">
      <span style="width:28px;height:28px;border-radius:7px;background:rgba(196,168,130,.18);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;pointer-events:none"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
      <span style="flex:1;min-width:0;pointer-events:none"><span style="display:block;font-size:12.5px;font-weight:500;color:var(--ink)">${esc(head)}</span>${sub?`<span style="display:block;font-size:10.5px;color:var(--muted)">${esc(sub)}</span>`:''}</span>
      <span style="color:var(--muted);flex-shrink:0;pointer-events:none"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
    </button>`;
  }).join('') : `<div style="font-size:12px;color:var(--muted);padding:10px 2px">No matching appointments yet.</div>`;
  // Documents
  const docHtml = _vendorHubDocsHtml(v);
  // Quotes for this vendor
  const quoteHtml = _vendorHubQuotesHtml(v);
  // Payment
  const budHtml = _vendorHubBudgetHtml(v);
  const sec=t=>`<div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--gold-deep);font-weight:600;margin:16px 0 8px">${t}</div>`;
  return `<div style="display:flex;flex-direction:column">
    ${sec('Appointments with this vendor')}${apptHtml}
    ${sec('Documents')}<div id="vhub-docs">${docHtml}</div>
    <div style="display:flex;gap:7px;margin-top:9px;flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" style="font-size:11.5px;display:inline-flex;align-items:center;gap:5px" onclick="_vendorHubAttachNew()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Attach new</button>
      <button class="btn btn-outline btn-sm" style="font-size:11.5px;display:inline-flex;align-items:center;gap:5px" onclick="_vendorHubPullExisting()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>Pull existing</button>
    </div>
    <input type="file" id="vhub-file-input" accept="image/*,application/pdf" style="display:none" onchange="_vendorHubHandleFile(event)"/>
    ${sec('Quotes')}<div id="vhub-quotes">${quoteHtml}</div>
    <div style="margin-top:9px">
      <button class="btn btn-outline btn-sm" style="font-size:11.5px;display:inline-flex;align-items:center;gap:5px" onclick="_vendorHubAddQuote()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add quote for this vendor</button>
    </div>
    ${sec('Payment')}<div id="vhub-budget">${budHtml}</div>
  </div>`;
}
function _vendorHubRefresh(){
  const v=(STATE.vendors||[]).find(x=>x.id===_vendorHubId); if(!v) return;
  const d=document.getElementById('vhub-docs'); if(d) d.innerHTML=_vendorHubDocsHtml(v);
  const q=document.getElementById('vhub-quotes'); if(q) q.innerHTML=_vendorHubQuotesHtml(v);
  const b=document.getElementById('vhub-budget'); if(b) b.innerHTML=_vendorHubBudgetHtml(v);
}
function _vendorHubQuotesHtml(v){
  const esc=_escHtml;
  const list=(STATE.quotes||[]).filter(q=>q.vendorId===v.id);
  if(!list.length){
    return `<div style="font-size:12px;color:var(--muted);padding:8px 2px">No quotes for this vendor yet.</div>`;
  }
  return list.map(q=>{
    const p=Number(q.price)||0;
    const file=(q.file&&(q.file.mediaId||q.file.dataUrl))
      ? `<button onclick="_quoteOpenFile('${q.id}')" title="View file" style="background:none;border:.5px solid var(--border);border-radius:7px;cursor:pointer;padding:5px 8px;color:var(--gold-deep);flex-shrink:0;display:inline-flex"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>`
      : `<span style="font-size:10px;color:var(--muted);flex-shrink:0">No file</span>`;
    return `<div style="display:flex;align-items:center;gap:10px;border:.5px solid var(--border);border-radius:9px;padding:9px 11px;margin-bottom:7px">
      <span style="width:28px;height:28px;border-radius:7px;background:rgba(156,122,60,.16);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="7" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="13"/><path d="M13.8 8.7a1.6 1.6 0 0 0-3 .5c0 1.6 2.7 1.1 2.7 2.7a1.6 1.6 0 0 1-3 .5"/></svg></span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:baseline;gap:8px"><span style="font-family:'Cormorant Garamond',serif;font-size:17px;color:var(--ink)">${p>0?fmt(p):'—'}</span>${q.category?`<span style="font-size:10px;color:var(--gold-deep)">${esc(q.category)}</span>`:''}</div>
        ${q.notes?`<div style="font-size:11px;color:var(--muted);line-height:1.4;white-space:pre-wrap;word-break:break-word">${esc(q.notes)}</div>`:''}
        <div style="display:flex;gap:10px;margin-top:4px;flex-wrap:wrap"><span onclick="_quoteToBudget('${q.id}')" style="font-size:10.5px;color:var(--gold-deep);font-weight:600;cursor:pointer">＋ Budget</span><span onclick="_vendorHubEditQuote('${q.id}')" style="font-size:10.5px;color:var(--gold-deep);cursor:pointer">Edit</span><span onclick="_vendorHubDeleteQuote('${q.id}')" style="font-size:10.5px;color:var(--red);cursor:pointer">Delete</span></div>
      </div>
      ${file}
    </div>`;
  }).join('');
}
function _vendorHubAddQuote(){
  const v=(STATE.vendors||[]).find(x=>x.id===_vendorHubId); if(!v) return;
  _quoteForm(null, {vendorId:v.id, category:v.category||'', _fromHub:v.id});
}
function _vendorHubEditQuote(id){
  const v=(STATE.vendors||[]).find(x=>x.id===_vendorHubId);
  _quoteForm(id, {_fromHub:v?v.id:null});
}
function _vendorHubDeleteQuote(id){
  const _q0=(STATE.quotes||[]).find(x=>x.id===id);
  const _label=_q0?(_q0.business||_q0.name||_q0.vendor||'quote'):'quote';
  _undoableDelete(_label, ()=>{
    STATE.quotes=(STATE.quotes||[]).filter(x=>x.id!==id);
  }, null, ()=>{ if(typeof _vendorHubRefresh==='function') _vendorHubRefresh(); });
  _vendorHubRefresh();
}
function _vendorHubOpenAppt(taskId, apptId){
  const a=_findAppt(taskId, apptId); if(!a) return;
  _apptShowDetails({taskId: taskId||null}, a);
}
// Documents list (copied uploads + linked references)
function _vendorHubDocsHtml(v){
  const esc=_escHtml;
  const own=(v.attachments||[]);
  const links=(v.docLinks||[]);
  const auto=_vendorAutoBudgetDocs(v);
  const manualIds=new Set(links.map(l=>l.attId));
  const autoShown=auto.filter(x=>!manualIds.has(x.f.id));
  if(!own.length && !links.length && !autoShown.length){
    return `<div style="font-size:12px;color:var(--muted);padding:8px 2px">No documents yet. Attach a new file, or pull one already uploaded in your budget.</div>`;
  }
  // Auto-pulled from a linked Payment (Option D: gold source line, no delete — follows the link).
  const autoHtml=autoShown.map(({f,source})=>`<div style="display:flex;align-items:center;gap:10px;border:.5px solid var(--border);border-radius:9px;padding:8px 11px;margin-bottom:7px">
    <span style="width:28px;height:28px;border-radius:7px;background:rgba(156,122,60,.16);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${_fileKindIcon(f)}</svg></span>
    <div style="flex:1;min-width:0"><div style="font-size:12.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.name)}</div><div style="font-size:10.5px;color:var(--gold-deep);display:inline-flex;align-items:center;gap:4px"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>From ${esc(source)}</div></div>
    <button onclick="_vendorHubViewLink('${f.id}')" title="View" style="background:none;border:.5px solid var(--border);border-radius:7px;cursor:pointer;padding:5px 8px;color:var(--gold-deep);flex-shrink:0;display:inline-flex"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
  </div>`).join('');
  const ownHtml=own.map(f=>`<div style="display:flex;align-items:center;gap:10px;border:.5px solid var(--border);border-radius:9px;padding:8px 11px;margin-bottom:7px">
    <span style="width:28px;height:28px;border-radius:7px;background:rgba(29,158,117,.14);color:var(--green);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${_fileKindIcon(f)}</svg></span>
    <div style="flex:1;min-width:0"><div style="font-size:12.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.name)} <span style="font-size:9px;font-weight:600;color:var(--green);background:rgba(29,158,117,.16);border-radius:5px;padding:1px 5px">copied</span></div><div style="font-size:10.5px;color:var(--muted)">${f.size?_fmtBytes(f.size):'file'} · uploaded here</div></div>
    <button onclick="_vendorHubViewOwn('${f.id}')" title="View" style="background:none;border:.5px solid var(--border);border-radius:7px;cursor:pointer;padding:5px 8px;color:var(--gold-deep);flex-shrink:0;display:inline-flex"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
    <button onclick="_vendorHubRemoveOwn('${f.id}')" title="Remove" style="background:none;border:none;cursor:pointer;padding:5px;color:var(--muted);flex-shrink:0;display:flex"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
  </div>`).join('');
  const linkHtml=links.map(l=>`<div style="display:flex;align-items:center;gap:10px;border:.5px solid var(--border);border-radius:9px;padding:8px 11px;margin-bottom:7px">
    <span style="width:28px;height:28px;border-radius:7px;background:rgba(55,138,221,.14);color:#185fa5;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>
    <div style="flex:1;min-width:0"><div style="font-size:12.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(l.name)} <span style="font-size:9px;font-weight:600;color:#185fa5;background:rgba(55,138,221,.16);border-radius:5px;padding:1px 5px">linked</span></div><div style="font-size:10.5px;color:var(--muted)">from ${esc(l.source||'budget')}</div></div>
    <button onclick="_vendorHubViewLink('${l.attId}')" title="View" style="background:none;border:.5px solid var(--border);border-radius:7px;cursor:pointer;padding:5px 8px;color:var(--gold-deep);flex-shrink:0;display:inline-flex"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
    <button onclick="_vendorHubUnlinkDoc('${l.attId}')" title="Remove link" style="background:none;border:none;cursor:pointer;padding:5px;color:var(--muted);flex-shrink:0;display:flex"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  </div>`).join('');
  return autoHtml+ownHtml+linkHtml;
}
// All invoices/receipts on Payments linked to this vendor — derived live from the link.
function _vendorAutoBudgetDocs(v){
  const out=[];
  if(!v) return out;
  _budgetTargetsForVendor(v.id).forEach(({b,s})=>{
    if(s){ (s.attachments||[]).forEach(f=>out.push({f, source:`${b.name} › ${s.name}`})); }
    else { (b.attachments||[]).forEach(f=>out.push({f, source:b.name})); }
  });
  return out;
}
function _vendorHubAttachNew(){
  const inp=document.getElementById('vhub-file-input'); if(inp){ inp.value=''; inp.click(); }
}
function _vendorHubHandleFile(e){
  const file=e.target.files&&e.target.files[0]; if(!file) return;
  if(file.size>ATTACH_MAX_BYTES){ alert(`"${file.name}" is ${_fmtBytes(file.size)}. Please choose a file under 4MB.`); return; }
  const v=(STATE.vendors||[]).find(x=>x.id===_vendorHubId); if(!v) return;
  const reader=new FileReader();
  reader.onload=async function(ev){
    if(!v.attachments) v.attachments=[];
    const data = await _prepMedia(ev.target.result, file.type);
    const mid  = await _mediaPut(data, file.name, file.type);
    v.attachments.push({ id:'att'+Date.now()+Math.floor(Math.random()*1000), name:file.name, type:file.type||'application/octet-stream', size:file.size, kind:'document', mediaId:mid, addedAt:new Date().toISOString() });
    saveToStorage();
    _vendorHubRefresh();
  };
  reader.readAsDataURL(file);
}
function _vendorHubViewOwn(attId){
  const v=(STATE.vendors||[]).find(x=>x.id===_vendorHubId); if(!v) return;
  _attachCtx={vendorId:v.id}; _viewAttach(attId);
}
function _vendorHubRemoveOwn(attId){
  const v=(STATE.vendors||[]).find(x=>x.id===_vendorHubId); if(!v) return;
  v.attachments=(v.attachments||[]).filter(x=>x.id!==attId);
  saveToStorage(); _vendorHubRefresh();
}
// Pull existing — list every attachment already uploaded across the budget, link (not copy).
function _vendorHubPullExisting(){
  const all=[];
  (STATE.budget.items||[]).forEach(b=>{
    (b.attachments||[]).forEach(f=>all.push({f, source:'Budget › '+b.name}));
    (b.subItems||[]).forEach(s=>(s.attachments||[]).forEach(f=>all.push({f, source:'Budget › '+b.name+' · '+s.name})));
  });
  const v=(STATE.vendors||[]).find(x=>x.id===_vendorHubId);
  const linkedIds=new Set((v&&v.docLinks||[]).map(l=>l.attId));
  _vendorAutoBudgetDocs(v).forEach(x=>linkedIds.add(x.f.id));
  const pool=all.filter(x=>!linkedIds.has(x.f.id));
  const rows = pool.length ? pool.map(({f,source})=>`<button type="button" onclick="_vendorHubLinkDoc('${f.id}')" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;border-bottom:.5px solid var(--border);padding:10px 11px;cursor:pointer">
      <span style="width:26px;height:26px;border-radius:7px;background:var(--surface);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;pointer-events:none"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${_fileKindIcon(f)}</svg></span>
      <span style="flex:1;min-width:0;pointer-events:none"><span style="display:block;font-size:12.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(f.name)}</span><span style="display:block;font-size:10px;color:var(--muted)">${_escHtml(source)}</span></span>
    </button>`).join('') : `<div style="font-size:12px;color:var(--muted);text-align:center;padding:16px">No uploaded documents found. Upload files on a Payment first, or use “Attach new”.</div>`;
  const body=`<div style="padding:2px"><div style="font-size:12px;color:var(--muted);margin:2px 4px 10px">Pick a file already uploaded elsewhere to reference here. It stays where it is — only a link is added.</div><div style="border:.5px solid var(--border);border-radius:11px;overflow:hidden;max-height:300px;overflow-y:auto">${rows}</div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-outline btn-sm" onclick="_vendorReopenHub()">Back</button></div></div>`;
  openModal('Pull a document', body, '');
}
function _vendorHubLinkDoc(attId){
  let found=null;
  (STATE.budget.items||[]).forEach(b=>{
    (b.attachments||[]).forEach(f=>{ if(f.id===attId) found={f, source:'Budget › '+b.name}; });
    (b.subItems||[]).forEach(s=>(s.attachments||[]).forEach(f=>{ if(f.id===attId) found={f, source:'Budget › '+b.name+' · '+s.name}; }));
  });
  const v=(STATE.vendors||[]).find(x=>x.id===_vendorHubId);
  if(found && v){ if(!v.docLinks) v.docLinks=[]; if(!v.docLinks.some(l=>l.attId===attId)){ v.docLinks.push({attId, name:found.f.name, source:found.source}); saveToStorage(); } }
  _vendorReopenHub();
}
function _vendorHubUnlinkDoc(attId){
  const v=(STATE.vendors||[]).find(x=>x.id===_vendorHubId); if(!v) return;
  v.docLinks=(v.docLinks||[]).filter(l=>l.attId!==attId);
  saveToStorage(); _vendorHubRefresh();
}
function _vendorHubViewLink(attId){
  // Locate the original attachment + its budget target, then reuse the budget viewer.
  let ctx=null;
  (STATE.budget.items||[]).forEach(b=>{
    if((b.attachments||[]).some(f=>f.id===attId)) ctx={bid:b.id, sid:null};
    (b.subItems||[]).forEach(s=>{ if((s.attachments||[]).some(f=>f.id===attId)) ctx={bid:b.id, sid:s.id}; });
  });
  if(ctx){ _attachCtx=ctx; _viewAttach(attId); }
  else alert('The original file was removed from the budget.');
}
function _vendorReopenHub(){
  const v=(STATE.vendors||[]).find(x=>x.id===_vendorHubId); if(!v){ closeModalDirect(); return; }
  openModal((v.business||'Vendor'), _vendorHubBody(v), '');
}
// Payment link + live summary
function _vendorHubBudgetHtml(v){
  const targets=_budgetTargetsForVendor(v.id);
  const pullBtn=`<button class="btn btn-outline btn-sm" style="font-size:11.5px;display:inline-flex;align-items:center;gap:5px" onclick="_vendorHubPullBudget()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Pull a Payment</button>`;
  if(!targets.length){
    return `<div style="font-size:12px;color:var(--muted);padding:4px 2px 9px">No Payments linked yet.</div><div style="display:flex;gap:7px">${pullBtn}</div>`;
  }
  const rows=targets.map(({bid,sid,b,s})=>{
    const tgt=s||b;
    const total = s ? (Number(s.amount)||0) : calcBudgetItemTotal(b);
    const dep = Number(tgt.deposit||0);
    const depPaid = !!tgt.depositPaid;
    const paid = !!tgt.paid;
    const paidAmt = paid?total:(depPaid?dep:0);
    const owing = Math.max(0, total - paidAmt);
    const parts=[`Total ${fmt(total)}`];
    if(dep>0) parts.push(`Deposit ${fmt(dep)}${depPaid?' paid':''}`);
    parts.push(paid?'paid in full':`${fmt(owing)} owing`);
    const name = s ? `${_escHtml(b.name)} › ${_escHtml(s.name)}` : _escHtml(b.name);
    return `<div style="display:flex;align-items:center;gap:10px;border:.5px solid var(--border);border-radius:9px;padding:10px 11px;flex-wrap:wrap;margin-bottom:7px">
      <span style="width:28px;height:28px;border-radius:7px;background:rgba(156,122,60,.16);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
      <div style="flex:1;min-width:130px"><div style="font-size:12.5px;font-weight:500;color:var(--ink)">${name}</div><div style="font-size:10.5px;color:var(--muted)">${_escHtml(parts.join(' · '))}</div></div>
      <button onclick="_vendorHubGoBudget('${bid}','${sid||''}')" title="Open in budget" style="background:none;border:.5px solid var(--border);border-radius:7px;cursor:pointer;padding:5px 8px;color:var(--gold-deep);flex-shrink:0;display:inline-flex"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button>
      <button onclick="_vendorHubUnlinkBudget('${bid}','${sid||''}')" title="Unlink" style="background:none;border:none;cursor:pointer;padding:5px;color:var(--muted);flex-shrink:0;display:flex"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>`;
  }).join('');
  return rows+`<div style="display:flex;gap:7px;margin-top:2px">${pullBtn}</div>`;
}
function _vendorHubPullBudgetRows(q){
  const needle=String(q||'').trim().toLowerCase();
  const rows=[];
  (STATE.budget.items||[]).forEach(b=>{
    const subs=(b.subItems||[]);
    const itemMatch = !needle || _norm(b.name).includes(needle);
    const matchingSubs = subs.filter(s=>!needle || _norm(s.name).includes(needle));
    // Show the item row if the item itself matches, or to parent any matching sub-items.
    if(!(itemMatch || matchingSubs.length)) return;
    const linkedB=_budgetVendorIds(b).includes(_vendorHubId);
    rows.push(`<button type="button" ${linkedB?'disabled':''} onclick="${linkedB?'':`_vendorHubLinkBudget('${b.id}','')`}" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;border-bottom:.5px solid var(--border);padding:10px 11px;cursor:${linkedB?'default':'pointer'};opacity:${linkedB?'.5':'1'}">
      <span style="width:26px;height:26px;border-radius:7px;background:rgba(156,122,60,.16);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;pointer-events:none"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
      <span style="flex:1;min-width:0;pointer-events:none"><span style="display:block;font-size:12.5px;color:var(--ink)">${_escHtml(b.name)}</span><span style="display:block;font-size:10px;color:var(--muted)">${_escHtml('Total '+fmt(calcBudgetItemTotal(b)))}${linkedB?' · already linked':''}</span></span>
    </button>`);
    // If the item name matches, show all its sub-items; otherwise only matching subs.
    (itemMatch ? subs : matchingSubs).forEach(s=>{
      const linkedS=_budgetVendorIds(s).includes(_vendorHubId);
      rows.push(`<button type="button" ${linkedS?'disabled':''} onclick="${linkedS?'':`_vendorHubLinkBudget('${b.id}','${s.id}')`}" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;border-bottom:.5px solid var(--border);padding:9px 11px 9px 24px;cursor:${linkedS?'default':'pointer'};opacity:${linkedS?'.5':'1'}">
        <span style="width:22px;height:22px;border-radius:6px;background:rgba(196,168,130,.16);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;pointer-events:none;font-size:11px">›</span>
        <span style="flex:1;min-width:0;pointer-events:none"><span style="display:block;font-size:12px;color:var(--ink)">${_escHtml(s.name)}</span><span style="display:block;font-size:10px;color:var(--muted)">${_escHtml(fmt(Number(s.amount)||0))}${linkedS?' · already linked':''}</span></span>
      </button>`);
    });
  });
  const anyBudget=(STATE.budget.items||[]).length>0;
  return rows.length ? rows.join('') : `<div style="font-size:12px;color:var(--muted);text-align:center;padding:16px">${anyBudget?'No Payments match.':'No Payments yet.'}</div>`;
}
function _vendorHubPullBudgetFilter(q){
  const el=document.getElementById('vhub-budget-list'); if(el) el.innerHTML=_vendorHubPullBudgetRows(q);
}
function _vendorHubPullBudget(){
  const body=`<div style="padding:2px">
    <div style="font-size:12px;color:var(--muted);margin:2px 4px 10px">Pick a budget item or sub-item. It links both ways — a vendor badge appears on the budget side too.</div>
    <div style="display:flex;align-items:center;gap:7px;height:34px;border:.5px solid var(--border);border-radius:8px;padding:0 9px;background:var(--panel);margin-bottom:9px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="vhub-budget-search" oninput="_vendorHubPullBudgetFilter(this.value)" onkeydown="if(event.key==='Escape'){this.value='';_vendorHubPullBudgetFilter('')}" placeholder="Search budget items…" style="flex:1;border:none;background:none;outline:none;font-size:12.5px;color:var(--ink);min-width:0"/><button type="button" onclick="document.getElementById('vhub-budget-search').value='';_vendorHubPullBudgetFilter('')" title="Clear" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:0;flex-shrink:0;display:flex;align-items:center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div id="vhub-budget-list" style="border:.5px solid var(--border);border-radius:11px;overflow:hidden;max-height:300px;overflow-y:auto">${_vendorHubPullBudgetRows('')}</div>
    <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-outline btn-sm" onclick="_vendorReopenHub()">Back</button></div>
  </div>`;
  openModal('Pull a Payment', body, '');
  setTimeout(()=>{ const s=document.getElementById('vhub-budget-search'); if(s) s.focus(); }, 30);
}
function _vendorHubLinkBudget(bid, sid){
  const target=_budgetResolveTarget(bid, sid);
  if(target){ if(!Array.isArray(target.vendorIds)) target.vendorIds=[]; if(!target.vendorIds.includes(_vendorHubId)) target.vendorIds.push(_vendorHubId); saveToStorage(); }
  _vendorReopenHub();
}
function _vendorHubUnlinkBudget(bid, sid){
  const target=_budgetResolveTarget(bid, sid);
  if(target){ target.vendorIds=_budgetVendorIds(target).filter(id=>id!==_vendorHubId); saveToStorage(); }
  _vendorHubRefresh();
}
function _vendorHubGoBudget(bid, sid){
  closeModalDirect();
  navigate('budget');
  if(typeof _focusBudgetRow==='function') setTimeout(()=>{ try{_focusBudgetRow(bid, sid||'', '');}catch(_){} }, 80);
}
function _apptKeywordText(t){
  return /\b(appointment|appt|fitting|re[\s-]?fitting|booking|book(?:ed|ing)?[\s-]?in|trial|rehearsal|consult(?:ation)?|tasting|viewing|session|sitting|meet(?:ing|\s+with)?|catch[\s-]?up|hair\s+trial|makeup\s+trial|make[\s-]?up\s+trial|dress\s+fitting|cake\s+tasting|menu\s+tasting|venue\s+visit|site\s+visit|walk[\s-]?through|dance\s+lesson)\b/i.test(t||'');
}
function _taskApptKeyword(t){ return _apptKeywordText(t && t.text) || _apptKeywordText(t && t.notes); }
function _taskHasAppts(t){ return !!(t && Array.isArray(t.appointments) && t.appointments.length); }
function _taskApptList(t){ return (t && Array.isArray(t.appointments)) ? t.appointments : []; }
// One-time migration: fold a legacy single task.appointment into task.appointments[].
function _migrateAppointments(){
  (STATE.checklist||[]).forEach(t=>{
    if(t.appointment && !Array.isArray(t.appointments)){
      const a=t.appointment; if(!a.id) a.id='ap'+Math.random().toString(36).slice(2,9);
      t.appointments=[a];
    }
    if(t.appointment) delete t.appointment;
    if(!Array.isArray(t.appointments)) return;
    // Ensure every appointment has an id.
    t.appointments.forEach(a=>{ if(a && !a.id) a.id='ap'+Math.random().toString(36).slice(2,9); });
  });
}
function _apptNewId(){ return 'ap'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function _apptTypeChipsHtml(){
  const chip=(t)=>`<button type="button" class="appt-type-chip ${_apptFormType===t?'on':'off'}" onclick="_apptFormSetType('${t}')">${t}</button>`;
  const moreBtn=`<button type="button" class="appt-type-chip off" onclick="_apptToggleMore()" style="opacity:.7">${_apptTypeShowMore?'Less ▲':'More ▾'}</button>`;
  const more=_apptTypeShowMore?APPT_TYPES_MORE.map(chip).join(''):'';
  return APPT_TYPES.map(chip).join('')+moreBtn+more;
}
function _apptToggleMore(){
  _apptTypeShowMore=!_apptTypeShowMore;
  const wrap=document.querySelector('.appt-type-wrap');
  if(wrap) wrap.innerHTML=_apptTypeChipsHtml();
}
function _fmtApptTime(hhmm){
  if(!hhmm||hhmm.indexOf(':')<0) return hhmm||'';
  let [h,m]=hhmm.split(':').map(Number);
  const ap=h<12?'AM':'PM'; let h12=h%12; if(h12===0) h12=12;
  return `${h12}:${String(m).padStart(2,'0')} ${ap}`;
}
// Compact "Type · date, time" descriptor.
function _apptWhenLabel(a){
  const bits=[];
  if(a.date) bits.push(fmtBudgetDate(a.date));
  if(a.time) bits.push(_fmtApptTime(a.time)+(a.endTime?('–'+_fmtApptTime(a.endTime)):''));
  return [a.type||'Appointment', bits.join(', ')].filter(Boolean).join(' · ');
}
// Secondary line for a chip: location / contact, whichever reads best.
function _apptSubLabel(a){
  if(a.virtual) return a.link ? 'Virtual' : (a.contact||'Virtual');
  return a.address || a.contact || '';
}
const _apptCalSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

// ── Checklist-row chip (clickable → details popup) ──
function _apptRowChip(t){
  const list=_taskApptList(t); if(!list.length) return '';
  return list.map(a=>{
    const sub=_apptSubLabel(a);
    const label=_apptWhenLabel(a)+(sub?` - ${sub}`:'');
    return `<span role="button" tabindex="0" onclick="event.stopPropagation();_apptOpenDetails('${t.id}','${a.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();_apptOpenDetails('${t.id}','${a.id}')}" title="View appointment" style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--gold-deep);background:rgba(196,168,130,.14);border-radius:14px;padding:3px 10px;cursor:pointer">${_apptCalSvg}${_escHtml(label)}</span>`;
  }).join('');
}

// ── In-task-modal appointments section (chips + add button) ──
// Renders into #ci-appt-list. Reads from the owner task (edit) or the staged list (add).
function _ciApptCurrentList(){
  const owner=window._ciApptOwnerTaskId;
  if(owner){ const t=STATE.checklist.find(x=>x.id===owner); return (t&&Array.isArray(t.appointments))?t.appointments:[]; }
  return window._ciApptStage||[];
}
function _ciApptRenderList(){
  const wrap=document.getElementById('ci-appt-list'); if(!wrap) return;
  const owner=window._ciApptOwnerTaskId;
  const list=_ciApptCurrentList();
  const chips=list.map(a=>{
    const sub=_apptSubLabel(a);
    const openJs = owner ? `_apptOpenDetails('${owner}','${a.id}')` : `_apptOpenDetailsStaged('${a.id}')`;
    return `<div role="button" tabindex="0" onclick="${openJs}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${openJs}}" style="display:flex;align-items:center;gap:9px;background:rgba(196,168,130,.12);border:.5px solid var(--border);border-radius:9px;padding:9px 11px;margin-bottom:7px;cursor:pointer">
      <span style="color:var(--gold-deep);display:inline-flex">${_apptCalSvg}</span>
      <span style="flex:1;min-width:0"><span style="display:block;font-size:12.5px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(_apptWhenLabel(a))}</span>${sub?`<span style="display:block;font-size:10.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(sub)}</span>`:''}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }).join('');
  const addJs = owner ? `_apptOpenForm({taskId:'${owner}'}, null)` : `_apptOpenFormStaged()`;
  wrap.innerHTML = chips + `<button type="button" onclick="${addJs}" style="display:flex;align-items:center;justify-content:center;gap:7px;width:100%;font-size:12.5px;color:var(--gold-deep);border:1px dashed var(--border);border-radius:9px;padding:9px;background:none;cursor:pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add appointment</button>`;
}
// The section shell placed in the task modal.
function _ciApptSectionHtml(){
  return `<div style="border-top:1px solid var(--border);margin:2px 0"></div>
    <div><div class="form-label" style="margin-bottom:6px">Appointments</div><div id="ci-appt-list"></div></div>`;
}

// ── Form popup (add or edit). `ctx` = {taskId|null, apptId|null} ──
// When taskId is set, save writes straight to the task. When null (new task being
// composed), save writes to the staged list (window._ciApptStage).
let _apptFormCtx=null, _apptFormType='Appointment', _apptFormLoc='inperson', _apptFormRecips=[], _apptVendorMode=null;
let _apptEndMode='duration', _apptDurMin=null; // 'duration' | 'finish'; _apptDurMin = chosen length in minutes
const _apptDurChips=[15,30,45,60];
function _apptDurLabel(min){
  if(min==null) return '';
  if(min<60) return `${min} min`;
  const h=Math.floor(min/60), m=min%60;
  if(m===0) return `${h} hr`;
  if(m===30) return `${h}.5 hr`;
  return `${h} hr ${m} min`;
}
// Minutes between two HH:MM times (end assumed same or next-ish day; negative => null).
function _apptDiffMin(start, end){
  if(!start||!end) return null;
  const [sh,sm]=start.split(':').map(Number), [eh,em]=end.split(':').map(Number);
  if([sh,sm,eh,em].some(isNaN)) return null;
  let d=(eh*60+em)-(sh*60+sm);
  return d>0?d:null;
}
// Add minutes to an HH:MM, returns HH:MM (clamped within the day).
function _apptAddMin(start, min){
  if(!start||min==null) return '';
  let [h,m]=start.split(':').map(Number); if(isNaN(h)) return '';
  let total=h*60+m+min;
  if(total>=24*60) total=24*60-5; // clamp to 23:55 rather than rolling to next day
  const nh=Math.floor(total/60), nm=total%60;
  return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;
}
function _apptOpenForm(ctx, existing){
  _apptFormCtx=ctx||{};
  const a=existing||{};
  _apptFormType=a.type||'Appointment';
  _apptFormLoc=a.virtual?'virtual':'inperson';
  // End-mode init: if the existing appointment has start+end, show Duration with the
  // computed length (snapping to a chip when it matches); otherwise default Duration.
  const existDur=_apptDiffMin(a.time, a.endTime);
  _apptEndMode='duration';
  _apptDurMin=existDur!=null?existDur:null;
  _apptVendorMode=(a.business||a.contact||a.phone||a.email)?'new':null;
  const seedEmail=(STATE.settings && STATE.settings.userEmail||'').trim();
  _apptFormRecips=(a.recipients&&a.recipients.length)?a.recipients.slice():(a.emailMe&&seedEmail?[seedEmail]:(seedEmail?[]:[]));
  _apptTypeShowMore=APPT_TYPES_MORE.includes(_apptFormType);
  const typeChips=_apptTypeChipsHtml();
  const taskDate=_apptFormTaskDate();
  const body=`<div style="display:flex;flex-direction:column;gap:11px">
    <div><label class="form-label" style="margin-bottom:5px">Type</label><div class="appt-type-wrap" style="display:flex;flex-wrap:wrap;gap:6px">${typeChips}</div></div>
    <div class="form-row" style="gap:10px">
      <div class="form-group" style="margin:0;flex:1.3"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px"><label class="form-label" style="margin:0">Date</label>${taskDate?`<span id="af-copydate" onclick="_apptFormCopyDate()" style="font-size:11px;color:var(--gold-deep);cursor:pointer;display:inline-flex;align-items:center;gap:4px;white-space:nowrap"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Copy from task (${fmtBudgetDate(taskDate)})</span>`:''}</div><input class="form-input" type="date" id="af-date" value="${a.date||''}"/></div>
      <div class="form-group" style="margin:0;flex:1"><label class="form-label">Start</label>${_timePickerHtml('af-time', a.time||'')}</div>
    </div>
    <input type="hidden" id="af-end" value="${a.endTime||''}"/>
    <div class="form-group" style="margin:0">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px;flex-wrap:wrap">
        <label class="form-label" style="margin:0">End by</label>
        <div class="appt-end-seg" style="display:inline-flex;background:var(--surface);border:.5px solid var(--border);border-radius:8px;padding:2px">
          <button type="button" id="af-endmode-duration" class="appt-end-seg-btn ${_apptEndMode==='duration'?'on':''}" onclick="_apptSetEndMode('duration')">Duration</button>
          <button type="button" id="af-endmode-finish" class="appt-end-seg-btn ${_apptEndMode==='finish'?'on':''}" onclick="_apptSetEndMode('finish')">Finish time</button>
        </div>
      </div>
      <div id="af-dur-wrap" style="display:${_apptEndMode==='duration'?'block':'none'}">
        <div id="af-dur-chips" style="display:flex;gap:6px;flex-wrap:wrap"></div>
        <div id="af-dur-custom-wrap" style="display:none;margin-top:8px;align-items:center;gap:8px">
          <input class="form-input" id="af-dur-custom" type="number" min="5" step="5" placeholder="e.g. 90" style="width:110px"/>
          <span style="font-size:12px;color:var(--muted)">minutes</span>
          <button type="button" class="btn btn-outline btn-sm" style="font-size:11.5px;padding:5px 11px" onclick="_apptApplyCustomDur()">Set</button>
        </div>
      </div>
      <div id="af-finish-wrap" style="display:${_apptEndMode==='finish'?'block':'none'}">
        ${_timePickerHtml('af-finish', a.endTime||'')}
      </div>
      <div id="af-end-summary" style="margin-top:9px"></div>
    </div>
    <div>
      <label class="form-label" style="margin-bottom:5px">Location</label>
      <div style="display:flex;gap:7px;margin-bottom:8px">
        <button type="button" id="af-loc-inperson" class="appt-loc-chip ${_apptFormLoc==='inperson'?'on':'off'}" onclick="_apptFormSetLoc('inperson')">In person</button>
        <button type="button" id="af-loc-virtual" class="appt-loc-chip ${_apptFormLoc==='virtual'?'on':'off'}" onclick="_apptFormSetLoc('virtual')">Virtual</button>
      </div>
      <div id="af-virtual" style="display:${_apptFormLoc==='virtual'?'flex':'none'};flex-direction:column;gap:8px">
        <input class="form-input" id="af-link" type="url" inputmode="url" placeholder="Meeting link (https://…)" value="${_escHtml(a.link||'')}"/>
        <input class="form-input" id="af-pass" placeholder="Password / passcode (optional)" value="${_escHtml(a.pass||'')}"/>
      </div>
    </div>
    <div>
      <label class="form-label" style="margin-bottom:5px">Vendor</label>
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <button type="button" id="af-vchip-exist" class="appt-loc-chip ${_apptVendorMode==='existing'?'on':'off'}" onclick="_apptSetVendorMode('existing')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="10" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6"/><circle cx="18" cy="16" r="3"/><line x1="22" y1="20" x2="20.1" y2="18.1"/></svg>Use existing vendor</button>
        <button type="button" id="af-vchip-new" class="appt-loc-chip ${_apptVendorMode==='new'?'on':'off'}" onclick="_apptSetVendorMode('new')">+ New vendor</button>
      </div>
      <div id="af-vendor-panel" style="display:${_apptVendorMode==='existing'?'block':'none'};border:.5px solid var(--border);border-radius:10px;padding:10px;background:var(--surface)"></div>
      <div id="af-new-vendor-fields" style="display:${_apptVendorMode==='new'?'flex':'none'};flex-direction:column;gap:11px;padding:12px;border:.5px solid var(--border);border-radius:10px;background:var(--surface)">
        <div class="form-group" style="margin:0"><label class="form-label">Business name <span style="color:var(--muted);font-weight:400">(for your vendor list)</span></label><input class="form-input" id="af-business" placeholder="e.g. Rosewood Florals" value="${_escHtml(a.business||'')}"/></div>
        <div class="form-row" style="gap:10px">
          <div class="form-group" style="margin:0;flex:1"><label class="form-label">Contact name</label><input class="form-input" id="af-contact" placeholder="e.g. Sarah at boutique" value="${_escHtml(a.contact||'')}"/></div>
          <div class="form-group" style="margin:0;flex:1"><label class="form-label">Phone</label><input class="form-input" id="af-phone" type="tel" inputmode="tel" placeholder="Number" value="${_escHtml(a.phone||'')}"/></div>
        </div>
        <div class="form-group" style="margin:0"><label class="form-label">Contact email <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="form-input" id="af-email" type="email" inputmode="email" placeholder="e.g. hello@boutique.com" value="${_escHtml(a.email||'')}"/></div>
        <div class="form-group" style="margin:0"><label class="form-label">Address <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="form-input" id="af-address" placeholder="e.g. 12 Main St, Melbourne" value="${_escHtml(a.address||'')}"/></div>
        <div class="form-group" style="margin:0"><label class="form-label">Website <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="form-input" id="af-website" placeholder="e.g. boutique.com" value="${_escHtml(a.website||'')}"/></div>
        <label id="af-vendor-save-row" style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink);cursor:pointer;padding-top:2px"><input type="checkbox" id="af-vendor-save" style="width:14px;height:14px;cursor:pointer;accent-color:var(--gold);flex-shrink:0"/> Save to my vendor list</label>
        <div id="af-vendor-known" style="display:none;align-items:center;gap:6px;font-size:12px;color:var(--green);padding-top:2px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Already in your vendor list</div>
      </div>
    </div>
    <div class="form-group" style="margin:0"><label class="form-label">Fee <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="form-input" id="af-fee" type="number" min="0" step="0.01" placeholder="0" value="${a.fee!=null&&a.fee!==''?a.fee:''}"/><div style="font-size:10.5px;color:var(--gold-deep);margin-top:4px">If a fee is entered, we'll offer to add it to your budget on save.</div></div>
    <div class="form-group" style="margin:0"><label class="form-label">Appointment notes</label><textarea class="form-input" id="af-notes" rows="2" placeholder="e.g. bring swatches, park at rear" style="resize:vertical">${_escHtml(a.notes||'')}</textarea></div>
    <div style="border-top:.5px solid var(--border);margin-top:2px;padding-top:11px">
      <label for="af-emailme" style="display:flex;align-items:center;gap:12px;cursor:pointer">
        <span style="flex:1;min-width:0"><span style="display:block;font-size:13px;font-weight:600;color:var(--ink)">Email a calendar invite</span><span style="display:block;font-size:11.5px;color:var(--muted)">You'll choose who gets it next</span></span>
        <span class="toggle-switch"><input type="checkbox" id="af-emailme" ${a.emailMe?'checked':''}/><span class="toggle-track"></span></span>
      </label>
    </div>
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_apptFormBack()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="_apptFormSave()">${(existing&&existing.id)?'Save appointment':'Add appointment'}</button>`;
  openConfirm2((existing&&existing.id)?'Edit appointment':'Add appointment', body, footer);
  if(document.getElementById('af-emailme')?.checked) _apptFormRenderRecips();
  ['af-business','af-contact','af-phone','af-email'].forEach(id=>document.getElementById(id)?.addEventListener('input', _apptVendorSaveSync));
  _apptVendorSaveSync();
  // Recompute the end whenever Start changes (duration mode) or recompute the duration
  // when the Finish picker changes (finish mode).
  _tpHooks['af-time']=()=>{ _apptRecalcEnd(); };
  _tpHooks['af-finish']=()=>{ if(_apptEndMode==='finish') _apptRecalcEnd(); };
  _apptRenderDurChips();
  _apptRecalcEnd();
}
// Render the quick-duration chips, highlighting the selected length.
function _apptRenderDurChips(){
  const wrap=document.getElementById('af-dur-chips'); if(!wrap) return;
  const chips=_apptDurChips.map(min=>{
    const on=_apptDurMin===min;
    return `<button type="button" class="appt-dur-chip ${on?'on':''}" onclick="_apptPickDur(${min})">${_apptDurLabel(min)}</button>`;
  }).join('');
  // Custom chip: highlighted when a non-standard duration is active.
  const customOn=_apptDurMin!=null && !_apptDurChips.includes(_apptDurMin);
  const customLabel=customOn?_apptDurLabel(_apptDurMin):'Custom';
  wrap.innerHTML=chips+`<button type="button" class="appt-dur-chip dashed ${customOn?'on':''}" onclick="_apptShowCustomDur()">${customLabel}</button>`;
}
function _apptSetEndMode(mode){
  _apptEndMode=mode;
  document.getElementById('af-endmode-duration')?.classList.toggle('on',mode==='duration');
  document.getElementById('af-endmode-finish')?.classList.toggle('on',mode==='finish');
  const dw=document.getElementById('af-dur-wrap'), fw=document.getElementById('af-finish-wrap');
  if(dw) dw.style.display=mode==='duration'?'block':'none';
  if(fw) fw.style.display=mode==='finish'?'block':'none';
  // Switching to finish mode: seed the finish picker from the current end value.
  if(mode==='finish'){
    const end=document.getElementById('af-end')?.value||'';
    const fin=document.getElementById('af-finish'); if(fin){ fin.value=end; const d=document.getElementById('af-finish-disp'); if(d){ d.textContent=_tpDisplay(end)||'Set time'; d.style.color=end?'var(--ink)':'var(--muted)'; } }
  }
  _apptRecalcEnd();
}
function _apptPickDur(min){ _apptDurMin=min; const cw=document.getElementById('af-dur-custom-wrap'); if(cw) cw.style.display='none'; _apptRenderDurChips(); _apptRecalcEnd(); }
function _apptShowCustomDur(){
  const cw=document.getElementById('af-dur-custom-wrap'); if(cw){ cw.style.display='flex'; }
  const inp=document.getElementById('af-dur-custom'); if(inp){ if(_apptDurMin!=null && !_apptDurChips.includes(_apptDurMin)) inp.value=_apptDurMin; setTimeout(()=>inp.focus(),0); }
}
function _apptApplyCustomDur(){
  const inp=document.getElementById('af-dur-custom'); if(!inp) return;
  let v=parseInt(inp.value,10);
  if(isNaN(v)||v<5){ inp.focus(); return; }
  v=Math.round(v/5)*5; // snap to 5-min steps for tidy times
  _apptDurMin=v;
  _apptRenderDurChips(); _apptRecalcEnd();
}
// Recompute and write the hidden af-end value + summary line, based on the active mode.
function _apptRecalcEnd(){
  const start=document.getElementById('af-time')?.value||'';
  const endHid=document.getElementById('af-end');
  const summary=document.getElementById('af-end-summary');
  const clock='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  const hour='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/></svg>';
  const pill=(icon,html)=>`<div style="font-size:11.5px;color:var(--appt-virtual-ink,#3F7A6A);background:rgba(93,202,165,.14);border-radius:8px;padding:7px 11px;display:inline-flex;align-items:center;gap:6px">${icon}${html}</div>`;
  const note=(html)=>`<div style="font-size:11.5px;color:var(--muted);display:inline-flex;align-items:center;gap:6px">${html}</div>`;
  if(_apptEndMode==='duration'){
    if(!start){ if(endHid) endHid.value=''; if(summary) summary.innerHTML=note('Set a start time, then choose a length'); return; }
    if(_apptDurMin==null){ if(endHid) endHid.value=''; if(summary) summary.innerHTML=note('Choose how long it lasts'); return; }
    const end=_apptAddMin(start,_apptDurMin); if(endHid) endHid.value=end;
    if(summary) summary.innerHTML=pill(clock,`Finishes at <strong>${_tpDisplay(end)}</strong>`);
  } else {
    const end=document.getElementById('af-finish')?.value||'';
    if(endHid) endHid.value=end;
    if(!start||!end){ if(summary) summary.innerHTML=note('Pick a finish time'); return; }
    const diff=_apptDiffMin(start,end);
    if(diff==null){ if(summary) summary.innerHTML=note('Finish time should be after the start'); return; }
    _apptDurMin=diff; // keep duration in sync so switching modes is seamless
    if(summary) summary.innerHTML=pill(hour,`Lasts <strong>${_apptDurLabel(diff)}</strong>`);
  }
}
function _apptFormTaskDate(){
  const c=_apptFormCtx||{};
  if(c.taskId){ const t=STATE.checklist.find(x=>x.id===c.taskId); if(t&&t.dueDate) return t.dueDate; }
  // composing a new task: read the open task modal's due field
  return document.getElementById('ci-due')?.value||'';
}
function _apptFormCopyDate(){ const d=_apptFormTaskDate(); const el=document.getElementById('af-date'); if(el&&d) el.value=d; }
function _apptFormSetType(t){ _apptFormType=t; document.querySelectorAll('.appt-type-chip').forEach(el=>{const on=el.textContent===t;el.classList.toggle('on',on);el.classList.toggle('off',!on);}); }
function _apptFormSetLoc(mode){
  _apptFormLoc=mode;
  const vt=document.getElementById('af-virtual');
  if(vt) vt.style.display=mode==='virtual'?'flex':'none';
  const bi=document.getElementById('af-loc-inperson'),bv=document.getElementById('af-loc-virtual');
  if(bi){bi.classList.toggle('on',mode==='inperson');bi.classList.toggle('off',mode!=='inperson');}
  if(bv){bv.classList.toggle('on',mode==='virtual');bv.classList.toggle('off',mode!=='virtual');}
}
function _apptFormEmailMeToggle(){
  const on=document.getElementById('af-emailme')?.checked;
  const box=document.getElementById('af-emailme-box');
  if(box) box.style.display=on?'block':'none';
}
function _apptFormRenderRecips(){
  const wrap=document.getElementById('af-recips'); if(!wrap) return;
  const chips=_apptFormRecips.map((e,i)=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;background:var(--surface);color:var(--gold-deep);border:.5px solid var(--border);border-radius:14px;padding:3px 5px 3px 10px">${_escHtml(e)}<button type="button" onclick="_apptFormRemoveRecip(${i})" aria-label="Remove" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:0 2px;font-size:13px;line-height:1">&times;</button></span>`).join('');
  wrap.innerHTML=chips+`<button type="button" onclick="_apptFormAddRecip()" style="font-size:11.5px;color:var(--gold-deep);border:1px dashed var(--border);border-radius:14px;padding:3px 10px;background:none;cursor:pointer">+ add email</button>`;
}
function _apptFormRemoveRecip(i){ _apptFormRecips.splice(i,1); _apptFormRenderRecips(); }
function _apptFormAddRecip(){
  const wrap=document.getElementById('af-recips'); if(!wrap||document.getElementById('af-recip-input')){document.getElementById('af-recip-input')?.focus();return;}
  const span=document.createElement('span');
  span.innerHTML=`<input id="af-recip-input" type="email" class="form-input" placeholder="email@example.com" style="font-size:11.5px;padding:4px 8px;height:auto;width:170px" onkeydown="if(event.key==='Enter'){event.preventDefault();_apptFormCommitRecip();}" onblur="_apptFormCommitRecip()"/>`;
  wrap.appendChild(span); setTimeout(()=>document.getElementById('af-recip-input')?.focus(),0);
}
function _apptFormCommitRecip(){
  const inp=document.getElementById('af-recip-input'); if(!inp) return;
  const v=(inp.value||'').trim();
  if(v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && !_apptFormRecips.includes(v)) _apptFormRecips.push(v);
  _apptFormRenderRecips();
}
// Read the form into an appointment object (keeps the editing id when present).
// ── Vendor mode toggle inside the appointment form ────────────────────────────
function _apptSetVendorMode(mode){
  _apptVendorMode=mode;
  const panel=document.getElementById('af-vendor-panel');
  const newFields=document.getElementById('af-new-vendor-fields');
  const chipExist=document.getElementById('af-vchip-exist');
  const chipNew=document.getElementById('af-vchip-new');
  const setChip=(el,on)=>{ if(!el) return; el.className=el.className.replace(/\bon\b/g,'').replace(/\boff\b/g,'').trim()+(on?' on':' off'); };
  setChip(chipExist, mode==='existing');
  setChip(chipNew,   mode==='new');
  if(panel)   panel.style.display   = mode==='existing'?'block':'none';
  if(newFields) newFields.style.display = mode==='new'?'flex':'none';
  if(mode==='existing'){ if(panel&&!panel.innerHTML.trim()) _apptRenderVendorPicker(''); const s=document.getElementById('af-vendor-search'); if(s) s.focus(); }
  if(mode==='new'){ const b=document.getElementById('af-business'); if(b&&!b.value) b.focus(); }
}
// ── "Use existing vendor" inline picker inside the appointment form ──────────
function _apptUseVendorToggle(){
  const panel=document.getElementById('af-vendor-panel'); if(!panel) return;
  if(panel.style.display==='none'){ panel.style.display='block'; _apptRenderVendorPicker(''); const s=document.getElementById('af-vendor-search'); if(s) s.focus(); }
  else { panel.style.display='none'; panel.innerHTML=''; }
}
function _apptVendorSearch(q){ _apptRenderVendorPicker(q); }
function _apptRenderVendorPicker(q){
  const panel=document.getElementById('af-vendor-panel'); if(!panel) return;
  const vendors=(STATE.vendors||[]);
  const needle=String(q||'').trim().toLowerCase();
  const filtered=vendors.filter(v=>{
    if(!needle) return true;
    return [v.business,v.category,v.contact,v.phone,v.email,v.website,v.notes].filter(Boolean).join(' ').toLowerCase().includes(needle);
  });
  const rowsHtml = filtered.length ? filtered.map(v=>{
    const sm=_vendorStatusMeta(v.status);
    const hint=[v.category, sm.label, v.phone||v.email||v.website].filter(Boolean).join(' · ');
    return `<button type="button" onclick="_apptUseVendorPick('${v.id}')" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;border-bottom:.5px solid var(--border);padding:9px 8px;cursor:pointer">
      <span style="width:26px;height:26px;border-radius:7px;background:${sm.bg};color:${sm.fg};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;pointer-events:none;font-size:11px;font-weight:600">${_escHtml(_vendorInitial(v.business))}</span>
      <span style="flex:1;min-width:0;pointer-events:none"><span style="display:block;font-size:12.5px;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(v.business||'Untitled vendor')}</span>${hint?`<span style="display:block;font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(hint)}</span>`:''}</span>
    </button>`;
  }).join('') : `<div style="font-size:12px;color:var(--muted);text-align:center;padding:14px">${vendors.length?'No vendors match.':'No vendors yet. Add some on the Vendors page.'}</div>`;
  panel.innerHTML=`
    <div style="display:flex;align-items:center;gap:7px;height:32px;border:.5px solid var(--border);border-radius:8px;padding:0 9px;background:var(--panel);margin-bottom:8px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="af-vendor-search" oninput="_apptVendorSearch(this.value)" onkeydown="if(event.key==='Escape'){this.value='';_apptVendorSearch('')}" value="${_escHtml(q||'')}" placeholder="Search vendors…" style="flex:1;border:none;background:none;outline:none;font-size:12.5px;color:var(--ink);min-width:0"/><button type="button" onclick="document.getElementById('af-vendor-search').value='';_apptVendorSearch('')" title="Clear" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:0;flex-shrink:0;display:flex;align-items:center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div style="max-height:200px;overflow-y:auto;border:.5px solid var(--border);border-radius:9px">${rowsHtml}</div>`;
  const s=document.getElementById('af-vendor-search'); if(s){ const v=s.value.length; try{s.setSelectionRange(v,v);}catch(_){} }
}
// Hide "Save to my vendor list" when the vendor fields match one already on the list.
function _apptVendorSaveSync(){
  const row=document.getElementById('af-vendor-save-row'), known=document.getElementById('af-vendor-known');
  if(!row||!known) return;
  const g=id=>(document.getElementById(id)?.value||'').trim();
  const src={business:g('af-business'), contact:g('af-contact'), phone:g('af-phone'), email:g('af-email')};
  const has=!!(src.business||src.phone||src.email) && (STATE.vendors||[]).some(v=>_vendorMatches(v, src));
  row.style.display=has?'none':'flex'; known.style.display=has?'flex':'none';
  if(has){ const cb=document.getElementById('af-vendor-save'); if(cb) cb.checked=false; }
}
function _apptUseVendorPick(vendorId){
  const v=(STATE.vendors||[]).find(x=>x.id===vendorId); if(!v) return;
  const set=(id,val)=>{ const el=document.getElementById(id); if(el && val) el.value=val; };
  set('af-business', v.business);
  set('af-contact', v.contact);
  set('af-phone', v.phone);
  set('af-email', v.email);
  set('af-website', v.website);
  set('af-address', v.address);
  // Append vendor notes to any existing appointment notes (don't clobber).
  if(v.notes){ const n=document.getElementById('af-notes'); if(n){ n.value = n.value.trim() ? (n.value.trim()+'\n'+v.notes) : v.notes; } }
  // Switch to 'new' mode so vendor fields are visible/editable after picking.
  _apptSetVendorMode('new');
  _apptVendorSaveSync();
}
function _apptFormRead(){
  const c=_apptFormCtx||{};
  // Flush a pending custom-duration entry (typed but not "Set") so the end is current.
  const cw=document.getElementById('af-dur-custom-wrap');
  if(_apptEndMode==='duration' && cw && cw.style.display!=='none'){
    const inp=document.getElementById('af-dur-custom'); const v=inp?parseInt(inp.value,10):NaN;
    if(!isNaN(v)&&v>=5){ _apptDurMin=Math.round(v/5)*5; _apptRecalcEnd(); }
  }
  const virtual=_apptFormLoc==='virtual';
  const pend=document.getElementById('af-recip-input');
  if(pend){ const v=(pend.value||'').trim(); if(v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && !_apptFormRecips.includes(v)) _apptFormRecips.push(v); }
  const emailMe=!!document.getElementById('af-emailme')?.checked;
  return {
    id: c.apptId || _apptNewId(),
    type:_apptFormType,
    business:(document.getElementById('af-business')?.value||'').trim(),
    date:document.getElementById('af-date')?.value||'',
    time:document.getElementById('af-time')?.value||'',
    endTime:document.getElementById('af-end')?.value||'',
    virtual,
    address:virtual?'':(document.getElementById('af-address')?.value||'').trim(),
    link:virtual?(document.getElementById('af-link')?.value||'').trim():'',
    pass:virtual?(document.getElementById('af-pass')?.value||'').trim():'',
    contact:(document.getElementById('af-contact')?.value||'').trim(),
    phone:(document.getElementById('af-phone')?.value||'').trim(),
    email:(document.getElementById('af-email')?.value||'').trim(),
    website:(document.getElementById('af-website')?.value||'').trim(),
    fee:parseFloat(document.getElementById('af-fee')?.value)||0,
    notes:(document.getElementById('af-notes')?.value||'').trim(),
    emailMe,
    recipients: emailMe ? _apptFormRecips.slice() : []
  };
}
// Cancel the form: if it was opened from a details popup, go back to it; else just close.
function _apptFormBack(){
  const c=_apptFormCtx||{};
  if(c.from==='details' && c.apptId){
    if(c.taskId) _apptOpenDetails(c.taskId, c.apptId, true);
    else _apptOpenDetailsStaged(c.apptId, true);
  } else {
    _cleanupAutoApptHost(c.taskId);
    _closeConfirm2Direct();
  }
}
// Remove an auto-created host task (from the calendar "Add appointment") if it was
// abandoned without saving an appointment — so cancelling never leaves an empty task.
function _cleanupAutoApptHost(taskId){
  if(!taskId) return;
  const i=(STATE.checklist||[]).findIndex(t=>t.id===taskId);
  if(i<0) return;
  const t=STATE.checklist[i];
  if(t._apptHostAuto && !(t.appointments&&t.appointments.length)){
    STATE.checklist.splice(i,1);
    saveToStorage();
    if(_currentPage==='checklist'||_currentPage==='calendar') navigate(_currentPage);
  }
}
function _apptFormSave(){
  const appt=_apptFormRead();
  if(document.getElementById('af-vendor-save')?.checked && appt.business){
    if(!Array.isArray(STATE.vendors)) STATE.vendors=[];
    STATE.vendors.push({id:'v'+Date.now()+Math.random().toString(36).slice(2,5),business:appt.business,contact:appt.contact||'',phone:appt.phone||'',email:appt.email||'',website:appt.website||'',address:appt.address||'',status:'enquiry',notes:'',category:'',created:Date.now()});
  }
  const c=_apptFormCtx||{};
  // Is the task add/edit modal open behind this form? Then refresh its list instead of navigating.
  const inTaskModal = !!document.getElementById('ci-appt-list');
  if(c.taskId){
    const t=STATE.checklist.find(x=>x.id===c.taskId); if(!t){ _closeConfirm2Direct(); return; }
    if(!Array.isArray(t.appointments)) t.appointments=[];
    const idx=t.appointments.findIndex(a=>a.id===appt.id);
    if(idx>=0) t.appointments[idx]=appt; else t.appointments.push(appt);
    // Best-fit category: only fill when the task has none or is still "General".
    const _curCat=(t.category||'').trim();
    if(!_curCat || _curCat.toLowerCase()==='general'){
      const _cat=_resolveTaskCategory((appt.business||'')+' '+(appt.type||''), [appt.notes||'', t.text||'']);
      if(_cat && _cat.toLowerCase()!=='general') t.category=_cat;
    }
    // Auto-host (from calendar "Add appointment") still on its placeholder title:
    // name it from the appointment so the calendar/checklist read sensibly.
    if(t._apptHostAuto && (!(t.text||'').trim() || t.text==='Appointment')){
      const nm=(appt.business||'').trim() || (appt.type||'').trim();
      if(nm) t.text=nm;
      t._apptHostAuto=false;
    }
    saveToStorage();
    const done=()=>{ _closeConfirm2Direct(); if(inTaskModal) _ciApptRenderList(); else _apptRefreshPage(); };
    // If the appointment has a date that differs from the task's due date, ask before changing it.
    if(appt.date && appt.date!==(t.dueDate||'')){
      _apptDateTaskId=t.id; _apptDateNewDate=appt.date; _apptDateNext=()=>_apptAfterSaveFlow(t, appt, done);
      setTimeout(()=>_askCopyApptDateToTask(t, appt), 50);
      return;
    }
    _apptAfterSaveFlow(t, appt, done);
  } else {
    // Staged (new task being composed in the still-open Add modal).
    if(!Array.isArray(window._ciApptStage)) window._ciApptStage=[];
    const idx=window._ciApptStage.findIndex(a=>a.id===appt.id);
    if(idx>=0) window._ciApptStage[idx]=appt; else window._ciApptStage.push(appt);
    _closeConfirm2Direct();
    _ciApptRenderList();
    _apptAfterSaveFlow({id:'__staged__', text:document.getElementById('ci-text')?.value||'Appointment', appointments:window._ciApptStage}, appt, null);
  }
}
// Redraw whichever page shows appointments (checklist, calendar, vendor cards, dashboard)
// so a just-saved appointment appears without navigating away and back.
function _apptRefreshPage(){
  if(['checklist','calendar','vendors','dashboard'].includes(_currentPage)) navigate(_currentPage);
}
// Post-save offers: email confirm (if ticked) and fee→budget. Mirrors old behaviour
// but scoped to a single appointment. `done` runs when no popup is shown.
function _apptAfterSaveFlow(task, appt, done){
  if(appt.emailMe){
    _apptEmailConfirm(task, appt, true);
    return;
  }
  if(Number(appt.fee)>0 && task.id!=='__staged__' && !task.budgetId){
    _popupOrigin=_currentPage;
    _apptFeeTaskId=task.id; _apptFeeApptId=appt.id;
    setTimeout(()=>_askAddApptFeeToBudget(task, appt), 50);
    return;
  }
  if(typeof done==='function') done();
}

// Staged-form helpers (new task).
function _apptOpenFormStaged(){
  // If this Add dialog was opened as a follow-up and the original task had an
  // appointment, prefill the form from that template the first time. Its date mirrors
  // the follow-up's current due date; a virtual one keeps its link but no passcode.
  const seed=window._ciFollowUpApptSeed;
  if(seed){
    const pre=Object.assign({}, seed);
    pre.date=document.getElementById('ci-due')?.value||'';
    window._ciFollowUpApptSeed=null; // consume — only prefill once
    _apptOpenForm({taskId:null}, pre);
    return;
  }
  _apptOpenForm({taskId:null}, null);
}
function _apptOpenDetailsStaged(apptId, fromBack){
  const a=(window._ciApptStage||[]).find(x=>x.id===apptId); if(!a) return;
  _apptShowDetails({taskId:null}, a);
}

// ── Details popup (view + Edit / Email / Delete) ──
function _apptOpenDetails(taskId, apptId){
  const t=STATE.checklist.find(x=>x.id===taskId); if(!t) return;
  const a=_taskApptList(t).find(x=>x.id===apptId); if(!a) return;
  _apptShowDetails({taskId}, a);
}
function _apptShowDetails(ctx, a){
  const esc=s=>_escHtml(s);
  const globe='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  const copyIcon='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const rowHtml=[];
  const labelSpan=t=>`<span style="color:var(--muted)">${t}</span>`;
  if(a.virtual){
    if(a.link){
      const href=_escHtml(_normalizeUrl(a.link));
      rowHtml.push(`<div style="display:flex;gap:6px">${labelSpan('Location')} · <a href="${href}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:var(--gold-deep);text-decoration:underline;display:inline-flex;align-items:center;gap:4px;word-break:break-all">${globe}${esc(_urlDomain(a.link))}</a></div>`);
    } else {
      rowHtml.push(`<div>${labelSpan('Location')} · Virtual</div>`);
    }
    if(a.pass){
      rowHtml.push(`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${labelSpan('Pass code')} · <span style="font-family:monospace;font-size:12.5px;color:var(--ink)">${esc(a.pass)}</span><button type="button" onclick="_apptCopyPass(this,'${esc(a.pass).replace(/'/g,"\\'")}')" style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;color:var(--gold-deep);border:.5px solid var(--border);border-radius:7px;padding:3px 8px;background:var(--surface);cursor:pointer">${copyIcon}Copy</button></div>`);
    }
  } else if(a.address){
    const pin='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    const mapsHref=_escHtml(_mapsUrl(a.address));
    rowHtml.push(`<div style="display:flex;gap:6px">${labelSpan('Location')} · <a href="${mapsHref}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="Open in Maps" style="color:var(--gold-deep);text-decoration:underline;display:inline-flex;align-items:center;gap:4px;word-break:break-word">${pin}${esc(a.address)}</a></div>`);
  }
  if(a.contact) rowHtml.push(`<div>${labelSpan('Contact')} · ${esc(a.contact)}</div>`);
  if(a.phone){
    const tel=String(a.phone).replace(/[^+\d]/g,'');
    rowHtml.push(`<div>${labelSpan('Phone')} · <a href="tel:${esc(tel)}" onclick="event.stopPropagation()" style="color:var(--gold-deep);text-decoration:underline">${esc(a.phone)}</a></div>`);
  }
  if(a.email) rowHtml.push(`<div style="word-break:break-all">${labelSpan('Email')} · <a href="mailto:${esc(a.email)}" onclick="event.stopPropagation()" style="color:var(--gold-deep);text-decoration:underline">${esc(a.email)}</a></div>`);
  if(a.website) rowHtml.push(`<div style="word-break:break-all">${labelSpan('Website')} · <a href="${esc(_normalizeUrl(a.website))}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:var(--gold-deep);text-decoration:underline">${esc(_urlDomain(a.website))}</a></div>`);
  if(Number(a.fee)>0) rowHtml.push(`<div>${labelSpan('Fee')} · ${esc(fmt(Number(a.fee)))}</div>`);
  const detailRows=rowHtml.join('');
  const when=[a.date?fmtBudgetDate(a.date):'', a.time?(_fmtApptTime(a.time)+(a.endTime?(' – '+_fmtApptTime(a.endTime)):'')):''].filter(Boolean).join(' · ');
  const idArg = ctx.taskId ? `'${ctx.taskId}'` : 'null';
  // Only offer "Add Vendor to List" when this appointment's vendor isn't already there.
  const _inVendorList=(STATE.vendors||[]).some(v=>_vendorMatches(v, a));
  const virtualPill = a.virtual ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;color:var(--appt-virtual-ink,#3F7A6A);background:rgba(93,202,165,.18);border-radius:10px;padding:2px 8px"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>Virtual</span>` : '';
  const body=`<div style="display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:11px">
      <span style="width:30px;height:30px;border-radius:8px;background:rgba(196,168,130,.16);display:inline-flex;align-items:center;justify-content:center;color:var(--gold-deep)">${_apptCalSvg}</span>
      <div><div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap"><span style="font-size:14px;font-weight:600;color:var(--ink)">${esc(a.business||a.type||'Appointment')}</span>${virtualPill}</div>${(a.business&&a.type)?`<div style="font-size:11px;color:var(--gold-deep)">${esc(a.type)}</div>`:''}${when?`<div style="font-size:11.5px;color:var(--muted)">${esc(when)}</div>`:''}</div>
    </div>
    <div style="font-size:12.5px;color:var(--ink);line-height:1.9;${detailRows?'border-top:.5px solid var(--border);padding-top:9px':''}">${detailRows}</div>
    ${a.notes?`<div style="font-size:12px;color:var(--muted);font-style:italic;margin-top:6px">“${esc(a.notes)}”</div>`:''}
    ${_inVendorList?'':`<button class="btn btn-outline btn-sm" style="width:100%;justify-content:center;gap:5px;margin-top:12px;color:var(--green);border-color:rgba(29,158,117,.4)" onclick="_addVendorFromAppt(${idArg},'${a.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>Add Vendor to List</button>`}
    <div style="display:flex;gap:7px;margin-top:14px">
      <button class="btn btn-outline btn-sm" style="flex:1;justify-content:center;gap:5px" onclick="_apptEditFromDetails(${idArg},'${a.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>
      <button class="btn btn-primary btn-sm" style="flex:1;justify-content:center;gap:5px" onclick="_apptEmailFromDetails(${idArg},'${a.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>Email</button>
      <button class="btn btn-outline btn-sm" style="padding:8px 11px;color:var(--red);border-color:rgba(192,57,43,.4)" title="Delete appointment" aria-label="Delete appointment" onclick="_apptDeleteFromDetails(${idArg},'${a.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>
    </div>
  </div>`;
  openConfirm2('Appointment', body, '');
}
// Copy the pass code to the clipboard and briefly confirm on the button.
function _apptCopyPass(btn, code){
  const done=()=>{ if(!btn) return; const html=btn.innerHTML; btn.innerHTML='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied'; setTimeout(()=>{ try{btn.innerHTML=html;}catch(_){}}, 1400); };
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(code).then(done).catch(()=>done()); }
    else { const ta=document.createElement('textarea'); ta.value=code; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(_){} document.body.removeChild(ta); done(); }
  }catch(e){ done(); }
}
function _apptEditFromDetails(taskId, apptId){
  if(taskId){
    const t=STATE.checklist.find(x=>x.id===taskId); const a=_taskApptList(t).find(x=>x.id===apptId);
    if(a) _apptOpenForm({taskId, apptId, from:'details'}, a);
  } else {
    const a=(window._ciApptStage||[]).find(x=>x.id===apptId);
    if(a) _apptOpenForm({taskId:null, apptId, from:'details'}, a);
  }
}
function _apptEmailFromDetails(taskId, apptId){
  let task, a;
  if(taskId){ task=STATE.checklist.find(x=>x.id===taskId); a=_taskApptList(task).find(x=>x.id===apptId); }
  else { task={id:'__staged__', text:document.getElementById('ci-text')?.value||'Appointment', appointments:window._ciApptStage||[]}; a=(window._ciApptStage||[]).find(x=>x.id===apptId); }
  if(task && a) _apptEmailConfirm(task, a);
}
function _apptDeleteFromDetails(taskId, apptId){
  let name='this appointment';
  if(taskId){ const t=STATE.checklist.find(x=>x.id===taskId); const a=_taskApptList(t).find(x=>x.id===apptId); if(a) name=_apptWhenLabel(a); }
  else { const a=(window._ciApptStage||[]).find(x=>x.id===apptId); if(a) name=_apptWhenLabel(a); }
  // Swap the confirm2 popup to the standard delete warning (red triangle).
  const idArg = taskId ? `'${taskId}'` : 'null';
  const body=`<div style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;align-items:center;gap:9px">
      <span style="width:26px;height:26px;border-radius:50%;background:rgba(192,57,43,.14);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--red)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
      <div style="font-size:13.5px;color:var(--ink);font-weight:500">Delete this appointment?</div>
    </div>
    <div style="font-size:12.5px;color:var(--muted);line-height:1.5">“${_escHtml(name)}” will be permanently removed. This can’t be undone.</div>
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_apptOpenDetailsAfterCancelDelete(${idArg},'${apptId}')">Cancel</button>
    <button class="btn btn-sm" onclick="_apptConfirmDelete(${idArg},'${apptId}')" style="background:var(--red);color:#fff;border:1px solid var(--red)">Delete</button>`;
  openConfirm2('Delete appointment', body, footer);
}
function _apptOpenDetailsAfterCancelDelete(taskId, apptId){
  if(taskId) _apptOpenDetails(taskId, apptId); else _apptOpenDetailsStaged(apptId);
}
function _apptConfirmDelete(taskId, apptId){
  const inTaskModal = !!document.getElementById('ci-appt-list');
  if(taskId){
    const t=STATE.checklist.find(x=>x.id===taskId);
    const _a0=t&&Array.isArray(t.appointments)?t.appointments.find(a=>a.id===apptId):null;
    const _label=_a0?(_a0.business||'appointment'):'appointment';
    _closeConfirm2Direct();
    _undoableDelete(_label, ()=>{
      const tt=STATE.checklist.find(x=>x.id===taskId);
      if(tt && Array.isArray(tt.appointments)){ tt.appointments=tt.appointments.filter(a=>a.id!==apptId); }
    }, inTaskModal?null:'checklist', inTaskModal?(()=>{ if(typeof _ciApptRenderList==='function') _ciApptRenderList(); }):null);
  } else {
    window._ciApptStage=(window._ciApptStage||[]).filter(a=>a.id!==apptId);
    _closeConfirm2Direct();
    _ciApptRenderList();
  }
}

// ── Calendar (.ics) + email-to-self (per appointment) ───────────────────────
function _icsEscape(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n'); }
function _icsDateTime(dateStr, timeStr){
  const d=(dateStr||'').replace(/-/g,'');
  let t=(timeStr||'').replace(':','');
  if(t.length===4) t+='00'; else t='090000';
  return d ? `${d}T${t}` : '';
}
function _icsAddHour(dateStr, timeStr){
  if(!dateStr) return '';
  let [h,m]=(timeStr||'09:00').split(':').map(Number);
  if(isNaN(h)) h=9; if(isNaN(m)) m=0;
  const dt=new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
  dt.setHours(dt.getHours()+1);
  const pad=n=>String(n).padStart(2,'0');
  return `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}
// "Appointment: Storyline Ceremonies" — drops the type word from the task name when it's
// already there, so it doesn't read "Appointment: Storyline Ceremonies appointment".
function _apptTitle(task, a){
  const type=((a&&a.type)||'Appointment').trim();
  const t=type.toLowerCase();
  let name=((task&&task.text)||'').trim();
  // Drop the type word and a generic "appointment" from either end of the task name.
  [t,'appointment'].forEach(w=>{
    const low=name.toLowerCase();
    if(low===w) name='';
    else if(low.endsWith(' '+w)) name=name.slice(0, -(w.length+1)).trim();
    else if(low.startsWith(w+' ')) name=name.slice(w.length+1).trim();
  });
  return name ? `${type}: ${name}` : type;
}
// Build an .ics for a specific appointment of a task.
function _apptBuildIcs(task, a){
  a=a||{};
  const title=_apptTitle(task, a);
  // No start time → an all-day event rather than a made-up 9am slot.
  const allDay=!!a.date && !a.time;
  const _nextDay=(d)=>{ const x=new Date(d+'T00:00:00'); x.setDate(x.getDate()+1); const pad=n=>String(n).padStart(2,'0'); return `${x.getFullYear()}${pad(x.getMonth()+1)}${pad(x.getDate())}`; };
  const dtStart=allDay ? `;VALUE=DATE:${a.date.replace(/-/g,'')}` : _icsDateTime(a.date, a.time);
  const dtEnd = allDay ? `;VALUE=DATE:${_nextDay(a.date)}` : ((a.date && a.endTime) ? _icsDateTime(a.date, a.endTime) : (a.date ? _icsAddHour(a.date, a.time) : ''));
  const loc = a.virtual ? (a.link||'Virtual') : (a.address||'');
  const descParts=[];
  if(a.virtual && a.link) descParts.push(`Link: ${a.link}`);
  if(a.virtual && a.pass) descParts.push(`Password: ${a.pass}`);
  if(a.contact) descParts.push(`Contact: ${a.contact}`);
  if(a.phone) descParts.push(`Phone: ${a.phone}`);
  if(a.email) descParts.push(`Email: ${a.email}`);
  if(Number(a.fee)>0) descParts.push(`Fee: ${fmt(Number(a.fee))}`);
  if(a.notes) descParts.push(a.notes);
  if(_apptCoupleNames()) descParts.unshift(`For ${_apptCoupleNames()}'s wedding`);
  const uid=`${task.id||'appt'}-${a.id||Date.now()}@unionvault`;
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const lines=[
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Union Vault//Appointment//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',
    'BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${stamp}`,
    dtStart?(allDay?`DTSTART${dtStart}`:`DTSTART:${dtStart}`):'', dtEnd?(allDay?`DTEND${dtEnd}`:`DTEND:${dtEnd}`):'',
    `SUMMARY:${_icsEscape(title)}`,
    loc?`LOCATION:${_icsEscape(loc)}`:'',
    descParts.length?`DESCRIPTION:${_icsEscape(descParts.join('\n'))}`:'',
    'BEGIN:VALARM','TRIGGER:-PT1H','ACTION:DISPLAY',`DESCRIPTION:${_icsEscape(title)}`,'END:VALARM',
    'END:VEVENT','END:VCALENDAR'
  ].filter(Boolean);
  return lines.join('\r\n');
}
function _apptDownloadIcs(task, a){
  try{
    const ics=_apptBuildIcs(task, a);
    const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const el=document.createElement('a');
    const safe=(task.text||'appointment').replace(/[^a-z0-9]+/gi,'-').toLowerCase().slice(0,40);
    el.href=url; el.download=`${safe}.ics`;
    document.body.appendChild(el); el.click();
    setTimeout(()=>{ try{document.body.removeChild(el);}catch(_){} URL.revokeObjectURL(url); }, 100);
  }catch(e){}
}
// `attached` = the .ics goes with the email (edge send) rather than downloaded separately.
function _apptCoupleNames(){ const ev=STATE.event||{}; return [ev.partner1,ev.partner2].filter(Boolean).join(' & '); }
function _apptBuildMailto(task, a, recipients, attached){
  a=a||{};
  const couple=_apptCoupleNames();
  const wedding=couple?`${couple}'s wedding`:'';
  const subject=_apptTitle(task, a)+(wedding?` — ${wedding}`:'');
  const when=[a.date?fmtBudgetDate(a.date):'', a.time?(_fmtApptTime(a.time)+(a.endTime?('–'+_fmtApptTime(a.endTime)):'')):''].filter(Boolean).join(', ');
  const bodyLines=[];
  // Context first, so anyone it's forwarded to (bridal party, family, the vendor) knows what it is.
  const what=[(a.type||'Appointment'), a.business?`with ${a.business}`:''].filter(Boolean).join(' ');
  bodyLines.push(wedding?`${what} for ${wedding}.`:`${what}.`, '');
  const ctxLines=bodyLines.length; // the branded HTML shows these as heading + title instead
  if(when) bodyLines.push(`When: ${when}`);
  if(a.virtual){ if(a.link) bodyLines.push(`Link: ${a.link}`); if(a.pass) bodyLines.push(`Password: ${a.pass}`); }
  else if(a.address) bodyLines.push(`Where: ${a.address}`);
  if(a.contact) bodyLines.push(`Contact: ${a.contact}`);
  if(a.phone) bodyLines.push(`Phone: ${a.phone}`);
  if(a.email) bodyLines.push(`Email: ${a.email}`);
  if(Number(a.fee)>0) bodyLines.push(`Fee: ${fmt(Number(a.fee))}`);
  if(a.notes) bodyLines.push('', a.notes);
  bodyLines.push('', attached ? 'The calendar invite (.ics) is attached — open it to add this to your calendar.' : 'Calendar file (.ics) downloaded separately — open it to add this to your calendar.');
  if(couple) bodyLines.push('', `Sent by ${couple} via UnionVault — reply to this email to reach them.`);
  const to=(recipients||[]).map(e=>encodeURIComponent(e)).join(',');
  const url=`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
  return {subject, body:bodyLines.join('\n'), to:(recipients||[]).join(', '), url,
    kicker:wedding, title:what, htmlText:bodyLines.slice(ctxLines).join('\n')};
}
function _apptOpenEmailDraft(task, a, recipients){
  const m=_apptBuildMailto(task, a, recipients);
  try{
    const el=document.createElement('a');
    el.href=m.url; el.target='_blank'; el.rel='noopener'; el.style.display='none';
    document.body.appendChild(el); el.click();
    setTimeout(()=>{ try{document.body.removeChild(el);}catch(_){} }, 100);
  }catch(e){
    try{ const win=window.open(m.url,'_blank'); if(!win) window.location.href=m.url; }
    catch(_){ try{ window.location.href=m.url; }catch(__){} }
  }
}
// Email confirm box (recipients editable) → send. `task` may be a real task or the
// synthetic staged task; `appt` is the specific appointment.
let _apptEmailTask=null, _apptEmailAppt=null, _apptEmailRecips=[];
function _apptEmailNamedRecips(){
  const a=_apptEmailAppt||{};
  const loginEmail=(typeof _sbSession!=='undefined'&&_sbSession&&_sbSession.user&&_sbSession.user.email||'').trim();
  const youEmail=((STATE.settings&&STATE.settings.userEmail)||loginEmail||'').trim();
  const partnerEmail=((STATE.settings&&STATE.settings.partnerEmail)||'').trim();
  let vendorEmail=(a.email||'').trim();
  if(!vendorEmail){
    const lv=(STATE.vendors||[]).find(v=>(a.vendorId&&v.id===a.vendorId) || _vendorMatches(v, a));
    if(lv) vendorEmail=(lv.email||'').trim();
  }
  const rows=[];
  if(youEmail) rows.push({label:'You',email:youEmail,kind:'you'});
  if(partnerEmail) rows.push({label:'Partner',email:partnerEmail,kind:'partner'});
  if(vendorEmail){
    const vn=(a.business||'').trim() || ((STATE.vendors||[]).find(v=>(v.email||'').trim().toLowerCase()===vendorEmail.toLowerCase())||{}).business || '';
    rows.push({label:vn?('Vendor · '+vn):'Vendor',email:vendorEmail,kind:'vendor'});
  }
  return rows;
}
// `afterSave` = opened straight after saving the appointment form (dismiss reads "Skip").
let _apptEmailAfterSave=false;
function _apptEmailConfirm(task, a, afterSave){
  _apptEmailTask=task; _apptEmailAppt=a; _apptEmailAfterSave=!!afterSave;
  if(a.recipients&&a.recipients.length){
    _apptEmailRecips=a.recipients.slice();
  } else {
    // You + partner on by default; the vendor is opt-in.
    _apptEmailRecips=_apptEmailNamedRecips().filter(r=>r.kind!=='vendor').map(r=>r.email);
  }
  _apptEmailOpenMain();
}
function _apptEmailOpenMain(){
  openConfirm2('Email appointment', _apptEmailConfirmBody(),
    `<button class="btn btn-outline btn-sm" onclick="_apptEmailCancel()">${_apptEmailAfterSave?'Skip':'Cancel'}</button>
     <button class="btn btn-primary btn-sm" id="appt-email-send-btn" onclick="_apptEmailSend()">${_apptEmailSendLabel()}</button>`);
}
// Who an address belongs to (guest or vendor), for the "Also send to" chips.
function _apptEmailWho(email){
  const e=String(email||'').trim().toLowerCase();
  const g=(STATE.guests||[]).find(x=>(x.email||'').trim().toLowerCase()===e);
  if(g){ const r=(g.relationship&&!['Couple','Guest','Plus One'].includes(g.relationship))?g.relationship:''; return {name:g.name||email, role:r}; }
  const v=(STATE.vendors||[]).find(x=>(x.email||'').trim().toLowerCase()===e);
  if(v) return {name:v.business||email, role:v.category||'Vendor'};
  return {name:email, role:''};
}
// ── Add guests or vendors (picker inside the Email appointment dialog) ──
let _apptPick=null; // {tab:'guests'|'vendors', q, filter:'all'|'sel'|'tag:<name>'|'fam:<id>', sel:Set<email>}
function _apptPickOpen(){
  _apptPick={tab:'guests', q:'', filter:'all', sel:new Set()};
  _apptPickRender(true);
}
function _apptPickBack(){ _apptPick=null; _apptEmailOpenMain(); }
function _apptPickItems(){
  const p=_apptPick, q=p.q.trim().toLowerCase();
  const already=new Set(_apptEmailRecips.map(e=>e.toLowerCase()));
  let items;
  if(p.tab==='vendors'){
    items=(STATE.vendors||[]).map(v=>({key:'v:'+v.id, name:v.business||'Untitled vendor', sub:[v.category,(v.email||'').trim()||'no email on file'].filter(Boolean).join(' · '), email:(v.email||'').trim(), tags:[], famIds:[]}));
  } else {
    const famOf={}; (STATE.families||[]).forEach(f=>(f.memberIds||[]).forEach(id=>{ (famOf[id]=famOf[id]||[]).push(f.id); }));
    items=(STATE.guests||[]).map(g=>{
      const role=(g.relationship&&!['Couple','Guest','Plus One'].includes(g.relationship))?g.relationship:'';
      const em=(g.email||'').trim();
      return {key:'g:'+g.id, name:g.name||'Guest', sub:[role, em||'no email on file'].filter(Boolean).join(' · '), email:em, tags:g.tags||[], famIds:famOf[g.id]||[]};
    });
  }
  items=items.filter(it=>!already.has(it.email.toLowerCase())||!it.email);
  if(q) items=items.filter(it=>(it.name+' '+it.sub).toLowerCase().includes(q));
  if(p.filter==='sel') items=items.filter(it=>it.email&&p.sel.has(it.email));
  else if(p.filter.startsWith('tag:')){ const t=p.filter.slice(4); items=items.filter(it=>it.tags.includes(t)); }
  else if(p.filter.startsWith('fam:')){ const f=p.filter.slice(4); items=items.filter(it=>it.famIds.includes(f)); }
  return items;
}
function _apptPickRender(open){
  const p=_apptPick; if(!p) return;
  const esc=_escHtml, jq=s=>String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const chip=(label,val)=>{ const on=p.filter===val; return `<button type="button" onclick="_apptPickSet('filter','${jq(val)}')" style="font-size:12px;padding:5px 11px;border-radius:14px;border:1px solid ${on?'var(--gold)':'var(--border)'};background:${on?'rgba(191,155,88,.18)':'var(--surface)'};color:${on?'var(--gold-deep)':'var(--ink)'};cursor:pointer;font-family:inherit">${esc(label)}</button>`; };
  let filters='';
  if(p.tab==='guests'){
    const tags=[...new Set((STATE.guests||[]).flatMap(g=>g.tags||[]))].sort((a,b)=>a.localeCompare(b));
    const fams=(STATE.families||[]).filter(f=>(f.memberIds||[]).length>1);
    const famSel=fams.length?`<select class="form-input" aria-label="Family" onchange="_apptPickSet('filter',this.value?'fam:'+this.value:'all')" style="font-size:12px;padding:4px 8px;height:auto;width:auto;max-width:170px;border-radius:14px${p.filter.startsWith('fam:')?';border-color:var(--gold)':''}"><option value="">Family…</option>${fams.map(f=>`<option value="${esc(f.id)}" ${p.filter==='fam:'+f.id?'selected':''}>${esc(f.name||'Family')}</option>`).join('')}</select>`:'';
    filters=chip('All','all')+tags.map(t=>chip(t,'tag:'+t)).join('')+famSel+(p.sel.size?chip('Selected ('+p.sel.size+')','sel'):'');
  } else {
    filters=chip('All','all')+(p.sel.size?chip('Selected ('+p.sel.size+')','sel'):'');
  }
  const items=_apptPickItems();
  const withEmail=items.filter(it=>it.email);
  const allOn=withEmail.length&&withEmail.every(it=>p.sel.has(it.email));
  const rows=items.length?items.map(it=>{
    const has=!!it.email, on=has&&p.sel.has(it.email);
    return `<label style="display:flex;align-items:center;gap:11px;padding:9px 12px;border-bottom:.5px solid var(--border);${has?'cursor:pointer':'opacity:.5'}">
      <input type="checkbox" ${on?'checked':''} ${has?'':'disabled'} onchange="_apptPickToggle('${jq(it.email)}')" style="width:17px;height:17px;accent-color:var(--gold);flex-shrink:0;cursor:pointer"/>
      <span style="flex:1;min-width:0"><span style="display:block;font-size:13px;font-weight:600;color:var(--ink)">${esc(it.name)}</span><span style="display:block;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(it.sub)}</span></span>
    </label>`;}).join(''):`<div style="padding:16px;text-align:center;font-size:12.5px;color:var(--muted)">No matches.</div>`;
  const body=`<div style="display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;border:.5px solid var(--border);border-radius:10px;overflow:hidden">
      <button type="button" aria-pressed="${p.tab==='guests'}" onclick="_apptPickSet('tab','guests')" style="flex:1;font-family:inherit;font-size:13px;padding:8px;border:none;cursor:pointer;${p.tab==='guests'?'background:var(--gold);color:#fff;font-weight:600':'background:var(--surface);color:var(--muted)'}">Guests</button>
      <button type="button" aria-pressed="${p.tab==='vendors'}" onclick="_apptPickSet('tab','vendors')" style="flex:1;font-family:inherit;font-size:13px;padding:8px;border:none;cursor:pointer;${p.tab==='vendors'?'background:var(--gold);color:#fff;font-weight:600':'background:var(--surface);color:var(--muted)'}">Vendors</button>
    </div>
    <input id="appt-pick-q" type="search" class="form-input" placeholder="Search ${p.tab}…" value="${esc(p.q)}" oninput="_apptPickSearch(this.value)" style="font-size:13px"/>
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${filters}</div>
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--muted)"><span id="appt-pick-count">${items.length} ${p.tab==='guests'?'guest':'vendor'}${items.length===1?'':'s'}</span>${withEmail.length?`<button type="button" onclick="_apptPickAll()" style="font-family:inherit;font-size:12px;font-weight:700;color:var(--gold-deep);background:none;border:none;cursor:pointer">${allOn?'Clear these':'Select all with email'}</button>`:''}</div>
    <div id="appt-pick-list" style="border:.5px solid var(--border);border-radius:11px;overflow:auto;max-height:46vh;background:var(--surface)">${rows}</div>
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_apptPickBack()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="_apptPickAdd()" ${p.sel.size?'':'disabled style="opacity:.5"'}>${p.sel.size?'Add '+p.sel.size:'Add'}</button>`;
  if(open || !document.getElementById('appt-pick-list')) openConfirm2('Add recipients', body, footer);
  else {
    const b=document.getElementById('confirm2-body'); if(b) b.innerHTML=body;
    const f=document.getElementById('confirm2-footer'); if(f) f.innerHTML=footer; else openConfirm2('Add recipients', body, footer);
    const qi=document.getElementById('appt-pick-q'); if(qi&&document.activeElement!==qi&&p._focusQ){ qi.focus(); qi.setSelectionRange(qi.value.length,qi.value.length); }
  }
}
function _apptPickSet(k,v){ if(!_apptPick) return; _apptPick[k]=v; if(k==='tab'){ _apptPick.filter='all'; _apptPick.q=''; } _apptPick._focusQ=false; _apptPickRender(); }
function _apptPickSearch(v){ if(!_apptPick) return; _apptPick.q=v; _apptPick._focusQ=true; _apptPickRender(); }
function _apptPickToggle(email){ const s=_apptPick&&_apptPick.sel; if(!s||!email) return; s.has(email)?s.delete(email):s.add(email); _apptPick._focusQ=false; _apptPickRender(); }
function _apptPickAll(){
  const p=_apptPick; if(!p) return;
  const em=_apptPickItems().map(it=>it.email).filter(Boolean);
  const allOn=em.every(e=>p.sel.has(e));
  em.forEach(e=>allOn?p.sel.delete(e):p.sel.add(e));
  p._focusQ=false; _apptPickRender();
}
function _apptPickAdd(){
  const p=_apptPick; if(!p) return;
  p.sel.forEach(e=>{ if(!_apptEmailRecips.some(x=>x.toLowerCase()===e.toLowerCase())) _apptEmailRecips.push(e); });
  _apptPickBack();
}
function _apptEmailSendLabel(){ const n=_apptEmailRecips.filter(Boolean).length; return n?('Send to '+n):'Send'; }
function _apptEmailConfirmBody(){
  const named=_apptEmailNamedRecips();
  const namedEmails=named.map(r=>r.email);
  const avStyle={you:'background:rgba(196,168,130,.18);color:var(--gold-deep)',partner:'background:rgba(90,130,190,.18);color:#5a82be',vendor:'background:rgba(90,160,100,.18);color:var(--green,#5C8A4E)'};
  const namedRows=named.map(r=>{
    const on=_apptEmailRecips.includes(r.email);
    return `<div style="display:flex;align-items:center;gap:9px;padding:5px 0">
      <div style="width:26px;height:26px;border-radius:50%;${avStyle[r.kind]||''};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${r.label[0]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;color:var(--ink)">${_escHtml(r.label)}</div>
        <div style="font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_escHtml(r.email)}</div>
      </div>
      <div onclick="_apptCEmToggle('${r.email.replace(/'/g,"\\'")}')" style="width:28px;height:16px;border-radius:8px;background:${on?'var(--gold)':'var(--border-strong,#c8c3ba)'};cursor:pointer;flex-shrink:0;position:relative;transition:background .15s">
        <div style="width:12px;height:12px;border-radius:50%;background:white;position:absolute;top:2px;${on?'right:2px':'left:2px'};transition:all .15s"></div>
      </div>
    </div>`;
  }).join('');
  const extras=_apptEmailRecips.filter(e=>!namedEmails.includes(e));
  const extraChips=extras.map((e,i)=>{ const w=_apptEmailWho(e); return `<span title="${_escHtml(e)}" style="display:inline-flex;align-items:center;gap:5px;font-size:12px;background:var(--surface);color:var(--ink);border:.5px solid var(--border);border-radius:14px;padding:4px 6px 4px 11px">${_escHtml(w.name)}${w.role?`<span style="color:var(--muted);font-size:11px">${_escHtml(w.role)}</span>`:''}<button type="button" onclick="_apptCEmRemoveExtra(${i})" aria-label="Remove" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:14px;line-height:1;padding:0 2px">&times;</button></span>`; }).join('');
  return `${namedRows}
    ${extras.length?`<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:8px">Also send to</div><div id="ci-cem-extra" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px">${extraChips}</div>`:''}
    <div id="ci-cem-recips" style="margin-top:7px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">
      <button type="button" onclick="_apptPickOpen()" style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--gold-deep);border:1px solid var(--gold-med,rgba(191,155,88,.5));border-radius:14px;padding:4px 12px;background:none;cursor:pointer"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>Add guests or vendors</button>
      <button type="button" onclick="_apptCEmAddPrompt()" style="font-size:12px;color:var(--gold-deep);border:1px dashed var(--border);border-radius:14px;padding:4px 12px;background:none;cursor:pointer">+ add email</button>
    </div>
    <div style="font-size:11.5px;color:var(--muted);line-height:1.5;margin-top:9px;padding-top:9px;border-top:1px solid var(--border)">Each person gets their own email with a .ics calendar file attached.</div>`;
}
function _apptCEmToggle(email){
  const idx=_apptEmailRecips.indexOf(email);
  if(idx>=0) _apptEmailRecips.splice(idx,1); else _apptEmailRecips.push(email);
  _apptCEmRefresh();
}
function _apptCEmRefresh(){ const b=document.getElementById('confirm2-body'); if(b) b.innerHTML=_apptEmailConfirmBody(); const sb=document.getElementById('appt-email-send-btn'); if(sb) sb.textContent=_apptEmailSendLabel(); }
function _apptCEmRemove(i){ _apptEmailRecips.splice(i,1); _apptCEmRefresh(); }
function _apptCEmRemoveExtra(i){
  const named=_apptEmailNamedRecips().map(r=>r.email);
  const extras=_apptEmailRecips.filter(e=>!named.includes(e));
  const toRemove=extras[i]; if(!toRemove) return;
  const idx=_apptEmailRecips.indexOf(toRemove); if(idx>=0) _apptEmailRecips.splice(idx,1);
  _apptCEmRefresh();
}
function _apptCEmAddPrompt(){
  const wrap=document.getElementById('ci-cem-recips'); if(!wrap||document.getElementById('ci-cem-input')){document.getElementById('ci-cem-input')?.focus();return;}
  const span=document.createElement('span');
  span.innerHTML=`<input id="ci-cem-input" type="email" class="form-input" placeholder="email@example.com" style="font-size:12px;padding:5px 9px;height:auto;width:180px" onkeydown="if(event.key==='Enter'){event.preventDefault();_apptCEmCommit();}" onblur="_apptCEmCommit()"/>`;
  wrap.appendChild(span); setTimeout(()=>document.getElementById('ci-cem-input')?.focus(),0);
}
function _apptCEmCommit(){
  const inp=document.getElementById('ci-cem-input'); if(!inp) return;
  const v=(inp.value||'').trim();
  if(v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && !_apptEmailRecips.includes(v)) _apptEmailRecips.push(v);
  _apptCEmRefresh();
}
function _apptEmailCancel(){
  const inp=document.getElementById('ci-cem-input');
  if(inp){ const v=(inp.value||'').trim(); if(v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && !_apptEmailRecips.includes(v)) _apptEmailRecips.push(v); }
  const task=_apptEmailTask, a=_apptEmailAppt;
  if(task && a){
    a.recipients=_apptEmailRecips.slice();
    if(task.id!=='__staged__') saveToStorage();
  }
  _closeConfirm2Direct();
  if(document.getElementById('ci-appt-list')){ _ciApptRenderList(); }
  else _apptRefreshPage();
}
// One email per recipient, so guests and vendors never see each other's addresses.
// Resolves to the recipients that could NOT be sent (empty = all sent).
async function _apptEmailSendViaEdge(task, a, recipients){
  const m=_apptBuildMailto(task,a,recipients,true);
  const ics=btoa(unescape(encodeURIComponent(_apptBuildIcs(task,a))));
  const token=(typeof _sbSession!=='undefined'&&_sbSession&&_sbSession.access_token)||'';
  const one=async(to)=>{
    try{
      const r=await fetch(_SB_URL+'/functions/v1/send-appointment-email',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+(token||_SB_KEY),'apikey':_SB_KEY},
        body:JSON.stringify({to:[to],subject:m.subject,body:m.body,ics,kicker:m.kicker,title:m.title,htmlText:m.htmlText,
          fromName:_apptCoupleNames()||'', replyTo:(STATE.settings&&STATE.settings.userEmail)||(_sbSession&&_sbSession.user&&_sbSession.user.email)||''})
      });
      return r.ok && (await r.json()).ok===true;
    }catch(_){ return false; }
  };
  const res=await Promise.all(recipients.map(one));
  return recipients.filter((_,i)=>!res[i]);
}
function _apptEmailSend(){
  const inp=document.getElementById('ci-cem-input'); if(inp){ const v=(inp.value||'').trim(); if(v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && !_apptEmailRecips.includes(v)) _apptEmailRecips.push(v); }
  const task=_apptEmailTask, a=_apptEmailAppt;
  const recips=_apptEmailRecips.filter(e=>e);
  if(task && a){
    a.emailMe=true; a.recipients=recips.slice();
    if(task.id!=='__staged__') saveToStorage();
  }
  if(!recips.length){ _closeConfirm2Direct(); if(document.getElementById('ci-appt-list')){_ciApptRenderList();}else{_apptRefreshPage();} return; }
  const list=recips.map(e=>_escHtml(e)).join(', ');
  const doneFooter=`<button class="btn btn-primary btn-sm" onclick="_closeConfirm2Direct();if(document.getElementById('ci-appt-list')){_ciApptRenderList();}else{_apptRefreshPage();}">Done</button>`;
  // Show a sending indicator, then call the edge function
  openConfirm2('Sending…', `<div style="display:flex;align-items:center;gap:10px;padding:4px 0"><span style="font-size:20px">✉</span><span style="font-size:13.5px;color:var(--ink)">Sending to ${list}…</span></div>`, '');
  _apptEmailSendViaEdge(task, a, recips).then(failed=>{
    if(!failed.length){
      openConfirm2('Email sent!', `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:4px 0;text-align:center">
        <span style="font-size:28px;line-height:1">✉</span>
        <div style="font-size:13.5px;color:var(--ink);font-weight:600">Sent!</div>
        <div style="font-size:12px;color:var(--muted)">${list}</div>
      </div>`, doneFooter);
    } else {
      // Fallback: open mailto + download ics
      // Fallback for whoever couldn't be emailed directly: mail-app draft + .ics download.
      const flist=failed.map(e=>_escHtml(e)).join(', ');
      if(task&&a){ _apptDownloadIcs(task,a); _apptOpenEmailDraft(task,a,failed); }
      openConfirm2('Invite ready', `<div style="display:flex;align-items:flex-start;gap:10px">
        <span style="width:30px;height:30px;border-radius:50%;background:rgba(92,138,78,.16);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--green,#5C8A4E)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
        <div style="font-size:13.5px;color:var(--ink);line-height:1.5">${failed.length<recips.length?`Sent to ${recips.length-failed.length} of ${recips.length}. `:''}Email draft opened for <strong>${flist}</strong>. Open the downloaded .ics file to add the appointment to your calendar.</div>
      </div>`, doneFooter);
    }
  });
}
// ── Appointment fee → budget offer (per appointment) ──
let _apptFeeTaskId=null, _apptFeeApptId=null;
let _apptDateTaskId=null, _apptDateNewDate='', _apptDateNext=null;
// Ask before copying the appointment's date onto the task's due date.
function _askCopyApptDateToTask(task, a){
  if(!task || !a || !a.date){ if(typeof _apptDateNext==='function'){ const n=_apptDateNext; _apptDateNext=null; n(); } return; }
  _apptDateTaskId=task.id; _apptDateNewDate=a.date;
  const hasCurrent=!!(task.dueDate||'').trim();
  const newLabel=fmtBudgetDate(a.date);
  const body=`<div style="display:flex;flex-direction:column;gap:12px">
    <div style="font-size:13.5px;color:var(--ink);line-height:1.5">${hasCurrent
      ? `Set this task's due date to the appointment date, <strong>${newLabel}</strong>? It's currently <strong>${fmtBudgetDate(task.dueDate)}</strong>.`
      : `Set this task's due date to the appointment date, <strong>${newLabel}</strong>?`}</div>
    <div style="display:flex;gap:7px">
      <button class="btn btn-outline btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="_apptDateSkip()">${hasCurrent?'Keep current':'Skip'}</button>
      <button class="btn btn-primary btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="_apptDateApply()">Set to ${newLabel}</button>
    </div>
  </div>`;
  openConfirm2(hasCurrent?'Update task due date?':'Set task due date?', body, '');
}
function _apptDateApply(){
  const t=STATE.checklist.find(x=>x.id===_apptDateTaskId);
  if(t && _apptDateNewDate){ t.dueDate=_apptDateNewDate; saveToStorage(); }
  _apptDateTaskId=null; _apptDateNewDate='';
  const n=_apptDateNext; _apptDateNext=null;
  if(typeof n==='function') n(); else _closeConfirm2Direct();
}
function _apptDateSkip(){
  _apptDateTaskId=null; _apptDateNewDate='';
  const n=_apptDateNext; _apptDateNext=null;
  if(typeof n==='function') n(); else _closeConfirm2Direct();
}
function _askAddApptFeeToBudget(task, a){
  if(!task || !a) return;
  const fee=Number(a.fee)||0; if(fee<=0) return;
  _apptFeeTaskId=task.id; _apptFeeApptId=a.id;
  const body=`<div style="display:flex;flex-direction:column;gap:12px">
    <div style="font-size:13.5px;color:var(--ink);line-height:1.5">This appointment has a fee of <strong>${fmt(fee)}</strong>. Add it to your budget so it's tracked?</div>
    <div style="font-size:12px;color:var(--muted);line-height:1.5">Creates a Payment named after the task and links them together.</div>
    <div style="display:flex;gap:7px">
      <button class="btn btn-outline btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="_apptFeeSkip()">Skip</button>
      <button class="btn btn-primary btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="_apptFeeAdd()">Add to budget</button>
    </div>
  </div>`;
  openConfirm2('Add appointment fee to budget?', body, '');
}
function _apptFeeSkip(){ _apptFeeTaskId=null; _apptFeeApptId=null; _closeConfirm2Direct(); _apptRefreshPage(); }
function _apptFeeAdd(){
  const t=STATE.checklist.find(x=>x.id===_apptFeeTaskId);
  const a=t?_taskApptList(t).find(x=>x.id===_apptFeeApptId):null;
  _apptFeeTaskId=null; _apptFeeApptId=null;
  if(t && a){
    const fee=Number(a.fee)||0;
    const item={id:'b'+Date.now(),name:t.text||'Appointment',total:fee,deposit:0,paid:false,dueDate:'',balanceDueDate:(a.date||t.dueDate||''),checklistId:t.id,note:'',expanded:true,subItems:[]};
    STATE.budget.items.push(item);
    t.budgetId=item.id; t.budgetSubId='';
    saveToStorage();
  }
  _closeConfirm2Direct();
  _apptRefreshPage();
}
// ── Missed-appointment nudge (task keyword, but no appointment added) ──
let _apptPromptTaskId=null;
function _askIsAppointment(task){
  if(!task) return;
  _apptPromptTaskId=task.id;
  const body=`<div style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <span style="width:28px;height:28px;border-radius:50%;background:rgba(196,168,130,.18);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--gold-deep)">${_apptCalSvg}</span>
      <div style="font-size:13.5px;color:var(--ink);font-weight:500;line-height:1.4">“${(task.text||'').replace(/</g,'&lt;')}” looks like an appointment</div>
    </div>
    <div style="font-size:12.5px;color:var(--muted);line-height:1.55">Add appointment details like date, time, location and contact?</div>
    <div style="display:flex;gap:7px">
      <button class="btn btn-outline btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="_apptPromptDismiss()">Not an appointment</button>
      <button class="btn btn-primary btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="_apptPromptAddDetails()">Add details</button>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);cursor:pointer;padding-top:1px"><input type="checkbox" id="appt-prompt-dontask" style="width:15px;height:15px;accent-color:var(--gold);cursor:pointer"/> Don't ask again</label>
  </div>`;
  openModal('Is this an appointment?', body, '');
}
function _apptPromptPersistDontAsk(){ if(document.getElementById('appt-prompt-dontask')?.checked){ if(!STATE.settings) STATE.settings={}; STATE.settings.hideApptPrompt=true; saveToStorage(); } }
// ── Follow-up task prompt (shown when a task is checked off) ──────────────────
let _followUpTaskId=null;
function _askFollowUp(task){
  if(!task) return;
  _followUpTaskId=task.id;
  const safe=(task.text||'').replace(/</g,'&lt;');
  const body=`<div style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <span style="width:28px;height:28px;border-radius:50%;background:rgba(196,168,130,.18);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--gold-deep)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg></span>
      <div style="font-size:13.5px;color:var(--ink);font-weight:500;line-height:1.4">“${safe}” is done — add a follow-up task?</div>
    </div>
    <div style="font-size:12.5px;color:var(--muted);line-height:1.55">e.g. confirm details, pay the balance, or send final numbers.</div>
    <div><label class="form-label" style="margin-bottom:5px">Due date <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="form-input" type="date" id="followup-date" value=""/></div>
    <div style="display:flex;gap:7px">
      <button class="btn btn-outline btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="_followUpDismiss()">No thanks</button>
      <button class="btn btn-outline btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center;display:inline-flex;align-items:center;gap:5px" onclick="_followUpEdit()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>
      <button class="btn btn-primary btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="_followUpCreate()">Create</button>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);cursor:pointer;padding-top:1px"><input type="checkbox" id="followup-dontask" style="width:15px;height:15px;accent-color:var(--gold);cursor:pointer"/> Don't ask again</label>
  </div>`;
  openModal('Create a follow-up?', body, '');
}
function _followUpPersistDontAsk(){ if(document.getElementById('followup-dontask')?.checked){ if(!STATE.settings) STATE.settings={}; STATE.settings.suggestFollowUp=false; saveToStorage(); } }
function _followUpDismiss(){ _followUpPersistDontAsk(); _followUpTaskId=null; _escapeRevert=null; _checkSnapshot=null; closeModalDirect(); if(_flushUnpin()) return; navigate('checklist'); }
function _followUpCreate(){
  _followUpPersistDontAsk();
  const id=_followUpTaskId; _followUpTaskId=null;
  _escapeRevert=null; _checkSnapshot=null;
  const _dueDate=(document.getElementById('followup-date')?.value||'').trim();
  closeModalDirect();
  // Quick path: create the follow-up immediately with the default name, no editor.
  const src=id?STATE.checklist.find(x=>x.id===id):null;
  if(src){
    const base=(src.text||'').trim();
    STATE.checklist.push({
      id:'cl'+Date.now(),
      text: base ? `Follow up: ${base}` : 'Follow up',
      done:false, dueDate:_dueDate, category:src.category||'',
      notes: src.notes||'', url: src.url||'',
      pinned:false, budgetId:'', budgetSubId:''
    });
    saveToStorage();
  }
  if(_flushUnpin()) return;
  navigate('checklist');
}
function _followUpEdit(){
  _followUpPersistDontAsk();
  _pendingUnpin=null;
  const id=_followUpTaskId; _followUpTaskId=null;
  _escapeRevert=null; _checkSnapshot=null;
  closeModalDirect();
  // Edit path: open the editable add-form pre-filled with the follow-up name.
  if(id) createFollowUpTask(id);
}
function _apptPromptDismiss(){ _apptPromptPersistDontAsk(); _apptPromptTaskId=null; closeModalDirect(); navigate('checklist'); }
function _apptPromptAddDetails(){
  _apptPromptPersistDontAsk();
  const id=_apptPromptTaskId; _apptPromptTaskId=null;
  closeModalDirect();
  if(id){ const t=STATE.checklist.find(x=>x.id===id); if(t){ openEditCheckitem(id); setTimeout(()=>_apptOpenForm({taskId:id}, null), 60); } }
}
// ── Dev/test preview ──
let _apptPreviewTask=null, _apptPreviewAppt=null;
function _apptBuildPreviewTask(){
  const today=new Date(); const pad=n=>String(n).padStart(2,'0');
  const dstr=`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const a={ id:'preview', type:'Fitting', date:dstr, time:'14:30', endTime:'15:15', virtual:false,
      address:'12 Boutique Lane, St Lucia', link:'', pass:'',
      contact:'Hannah Stock', phone:'07 3870 3433', email:'hannah@boutique.com',
      fee:120, notes:'Bring shoes and veil. Park at rear.',
      emailMe:true, recipients:[ (STATE.settings&&STATE.settings.userEmail||'').trim() || 'you@email.com' ] };
  return { task:{id:'preview', text:'Dress fitting at boutique', appointments:[a]}, appt:a };
}
function _openApptEmailPreview(){ const p=_apptBuildPreviewTask(); _apptPreviewTask=p.task; _apptPreviewAppt=p.appt; _renderApptEmailPreview(); }
function _renderApptEmailPreview(){
  const t=_apptPreviewTask, a=_apptPreviewAppt;
  const recips=a.recipients.slice();
  const ics=_apptBuildIcs(t, a);
  const mail=_apptBuildMailto(t, a, recips);
  const box=(label,content,mono)=>`<div style="margin-bottom:12px"><div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--gold-deep);margin-bottom:5px">${label}</div><pre style="background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:10px 12px;margin:0;${mono?'font-family:monospace;':''}font-size:11.5px;color:var(--ink);white-space:pre-wrap;word-break:break-word;line-height:1.5">${_escHtml(content)}</pre></div>`;
  const body=`<div style="display:flex;flex-direction:column">
    <div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:13px">A sample appointment, with the exact calendar file and email draft it would produce on Send. Edit any field and tap Update.</div>
    <div style="background:var(--cream);border:.5px solid var(--border);border-radius:10px;padding:12px;margin-bottom:14px;display:flex;flex-direction:column;gap:9px">
      <div style="display:flex;gap:9px;flex-wrap:wrap">
        <div style="flex:1;min-width:120px"><div style="font-size:10px;text-transform:uppercase;color:var(--muted);margin-bottom:3px">Title</div><input id="apv-text" class="form-input" value="${_escHtml(t.text)}" style="font-size:12px;height:32px"/></div>
        <div style="width:110px"><div style="font-size:10px;text-transform:uppercase;color:var(--muted);margin-bottom:3px">Type</div><input id="apv-type" class="form-input" value="${_escHtml(a.type)}" style="font-size:12px;height:32px"/></div>
      </div>
      <div style="display:flex;gap:9px;flex-wrap:wrap">
        <div style="width:140px"><div style="font-size:10px;text-transform:uppercase;color:var(--muted);margin-bottom:3px">Date</div><input id="apv-date" type="date" class="form-input" value="${a.date}" style="font-size:12px;height:32px"/></div>
        <div style="width:90px"><div style="font-size:10px;text-transform:uppercase;color:var(--muted);margin-bottom:3px">Start</div><input id="apv-time" type="time" class="form-input" value="${a.time}" style="font-size:12px;height:32px"/></div>
        <div style="width:90px"><div style="font-size:10px;text-transform:uppercase;color:var(--muted);margin-bottom:3px">End</div><input id="apv-end" type="time" class="form-input" value="${a.endTime}" style="font-size:12px;height:32px"/></div>
      </div>
      <div style="display:flex;gap:9px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px"><div style="font-size:10px;text-transform:uppercase;color:var(--muted);margin-bottom:3px">Address</div><input id="apv-address" class="form-input" value="${_escHtml(a.address)}" style="font-size:12px;height:32px"/></div>
        <div style="width:90px"><div style="font-size:10px;text-transform:uppercase;color:var(--muted);margin-bottom:3px">Fee</div><input id="apv-fee" type="number" class="form-input" value="${a.fee}" style="font-size:12px;height:32px"/></div>
      </div>
      <div><div style="font-size:10px;text-transform:uppercase;color:var(--muted);margin-bottom:3px">Recipients (comma-separated)</div><input id="apv-recips" class="form-input" value="${_escHtml(recips.join(', '))}" style="font-size:12px;height:32px"/></div>
      <label style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink);cursor:pointer"><input type="checkbox" id="apv-virtual" ${a.virtual?'checked':''} style="width:15px;height:15px;accent-color:var(--gold)"/> Virtual (use a link instead of address)</label>
      <button class="btn btn-outline btn-sm" style="align-self:flex-start;font-size:12px" onclick="_apptPreviewRefresh()">Update preview</button>
    </div>
    <div style="font-size:11.5px;font-weight:600;color:var(--ink);margin-bottom:8px">Email draft</div>
    ${box('To', mail.to||'(no recipients)')}
    ${box('Subject', mail.subject)}
    ${box('Body', mail.body)}
    <div style="font-size:11.5px;font-weight:600;color:var(--ink);margin:6px 0 8px">Calendar file (.ics)</div>
    ${box('appointment.ics', ics, true)}
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Close</button>
    <button class="btn btn-outline btn-sm" onclick="_apptDownloadIcs(_apptPreviewTask,_apptPreviewAppt)">Download .ics</button>
    <button class="btn btn-primary btn-sm" onclick="_apptOpenEmailDraft(_apptPreviewTask,_apptPreviewAppt,_apptPreviewAppt.recipients)">Open email draft</button>`;
  openModal('Appointment email preview', body, footer);
}
function _apptPreviewRefresh(){
  const t=_apptPreviewTask, a=_apptPreviewAppt; if(!t) return;
  const g=id=>document.getElementById(id);
  t.text=g('apv-text')?.value||t.text;
  a.type=g('apv-type')?.value||a.type;
  a.date=g('apv-date')?.value||a.date;
  a.time=g('apv-time')?.value||'';
  a.endTime=g('apv-end')?.value||'';
  a.virtual=!!g('apv-virtual')?.checked;
  if(a.virtual){ a.link=a.link||'https://meet.example.com/abc'; a.pass=a.pass||'1234'; a.address=''; }
  else { a.address=g('apv-address')?.value||''; }
  a.fee=Number(g('apv-fee')?.value)||0;
  a.recipients=(g('apv-recips')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
  _renderApptEmailPreview();
}
// ── Save-time "email this appointment to yourself?" nudge ──
let _apptEmailAskTaskId=null, _apptEmailAskApptId=null;
function _askEmailAppointment(task, a){
  if(!task||!a) return;
  _apptEmailAskTaskId=task.id; _apptEmailAskApptId=a.id;
  const mail=`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>`;
  const body=`<div style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <span style="width:28px;height:28px;border-radius:50%;background:rgba(196,168,130,.18);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--gold-deep)">${mail}</span>
      <div style="font-size:13.5px;color:var(--ink);font-weight:500;line-height:1.4">Email this appointment to yourself?</div>
    </div>
    <div style="font-size:12.5px;color:var(--muted);line-height:1.55">You'll get a calendar invite you can add to your personal calendar.</div>
    <div style="display:flex;gap:7px">
      <button class="btn btn-outline btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="_apptEmailAskDismiss()">No thanks</button>
      <button class="btn btn-primary btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="_apptEmailAskYes()">Yes, email it</button>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);cursor:pointer;padding-top:1px"><input type="checkbox" id="appt-email-dontask" style="width:15px;height:15px;accent-color:var(--gold);cursor:pointer"/> Don't ask again</label>
  </div>`;
  openConfirm2('Email appointment?', body, '');
}
function _apptEmailAskPersistDontAsk(){ if(document.getElementById('appt-email-dontask')?.checked){ if(!STATE.settings) STATE.settings={}; STATE.settings.suggestEmailAppointment=false; saveToStorage(); } }
function _apptEmailAskDismiss(){ _apptEmailAskPersistDontAsk(); _apptEmailAskTaskId=null; _apptEmailAskApptId=null; _closeConfirm2Direct(); }
function _apptEmailAskYes(){
  _apptEmailAskPersistDontAsk();
  const t=STATE.checklist.find(x=>x.id===_apptEmailAskTaskId);
  const a=t?_taskApptList(t).find(x=>x.id===_apptEmailAskApptId):null;
  _apptEmailAskTaskId=null; _apptEmailAskApptId=null;
  if(t&&a) _apptEmailConfirm(t, a); else _closeConfirm2Direct();
}

let _suppressSaveDepositPrompt=false;
function saveCheckitem(editId){
  const text=document.getElementById('ci-text').value.trim(); if(!text)return;
  let _ciSaveNewSub=false;
  // Appointments now save immediately via their own popup. For a NEW task we attach
  // any staged appointments below; for edit they already live on the task.
  const _stagedAppts = (!editId && Array.isArray(window._ciApptStage)) ? window._ciApptStage.slice() : null;
  const catSel=document.getElementById('ci-cat');
  let cat=catSel?catSel.value:'';
  // "+ Add Category" → read the inline name; required if that option is chosen.
  if(cat==='__addcat__'){
    const newCatEl=document.getElementById('ci-newcat');
    const newCat=(newCatEl?.value||'').trim();
    if(!newCat){ _flashError(newCatEl); return; }
    if(!STATE.checklistCategories) STATE.checklistCategories=[];
    if(!STATE.checklistCategories.includes(newCat)) STATE.checklistCategories.push(newCat);
    cat=newCat;
  }
  // "None" → empty category (value is already '').
  const due=document.getElementById('ci-due').value;
  const notes=document.getElementById('ci-notes')?.value.trim()||'';
  const url=_normalizeUrl(document.getElementById('ci-url')?.value||'');
  const rawBudget=document.getElementById('ci-budget')?.value||'';
  let budgetId='', budgetSubId='';
  if(rawBudget && rawBudget!=='__new__|'){
    const [bid,sid]=rawBudget.split('|');
    budgetId=bid||'';
    budgetSubId=sid||'';
  }

  // Handle new budget category creation
  if(rawBudget==='__new__|'){
    const newNameEl=document.getElementById('ci-budget-newname');
    const newName=(newNameEl?.value||'').trim();
    const newTotal=Number(document.getElementById('ci-budget-newtotal')?.value)||0;
    const newDue=document.getElementById('ci-budget-newdue')?.value||'';
    const addSub=document.getElementById('ci-budget-addsub')?.checked;
    const subNameEl=document.getElementById('ci-budget-subname');
    const subName=(subNameEl?.value||'').trim();
    const subAmt=Number(document.getElementById('ci-budget-subamt')?.value)||0;
    const subDue=document.getElementById('ci-budget-subdue')?.value||'';
    const fromSubs=document.getElementById('ci-budget-fromsubs')?.checked;
    // Category name is required — flash the field and block the add if blank.
    if(!newName){ _flashError(newNameEl); return; }
    // Sub-item name is required when adding a sub-item.
    if(addSub && !subName){ _flashError(subNameEl); return; }
    const newBItem={id:'b'+Date.now(),name:newName,total:newTotal,deposit:0,paid:false,dueDate:'',balanceDueDate:newDue,checklistId:'',note:'',expanded:true,subItems:[]};
    if(addSub && subName){
      const sub={id:'bs'+Date.now(),name:subName,amount:subAmt,balanceDueDate:subDue,deposit:0,depositPaid:false,paid:false,showDeposit:false};
      newBItem.subItems.push(sub);
      if(fromSubs) newBItem.totalFromSubs=true; // category total rolls up from sub-items
      budgetId=newBItem.id; budgetSubId=sub.id; // link the task to the SUB-ITEM
      _ciSaveNewSub=true;
    } else {
      budgetId=newBItem.id;
    }
    // "Add a deposit to this category" — independent of the sub-item choice. Writes
    // the deposit directly to the new item (the task still links per the rule above).
    if(document.getElementById('ci-budget-newdep-add')?.checked){
      newBItem.deposit=Number(document.getElementById('ci-budget-newdep-amt')?.value)||0;
      newBItem.depositFromSubs=false;
      newBItem.depositDueDate=document.getElementById('ci-budget-newdep-due')?.value||'';
      newBItem.depositPaid=false;
    }
    STATE.budget.items.push(newBItem);
  }

  // Handle "create a new sub-item under this" for an existing item-level link.
  if(rawBudget && rawBudget!=='__new__|' && rawBudget.endsWith('|')){
    const addExistSub=document.getElementById('ci-existsub-add')?.checked;
    const existSubNameEl=document.getElementById('ci-existsub-name');
    const existSubName=(existSubNameEl?.value||'').trim();
    const existSubAmt=Number(document.getElementById('ci-existsub-amt')?.value)||0;
    const existSubDue=document.getElementById('ci-existsub-due')?.value||'';
    // Sub-item name is required when the box is ticked.
    if(addExistSub && !existSubName){ _flashError(existSubNameEl); return; }
    if(addExistSub && existSubName){
      const parent=STATE.budget.items.find(x=>x.id===budgetId);
      if(parent){
        if(!parent.subItems) parent.subItems=[];
        const sub={id:'bs'+Date.now(),name:existSubName,amount:existSubAmt,balanceDueDate:existSubDue,deposit:0,depositPaid:false,paid:false,showDeposit:false};
        parent.subItems.push(sub);
        parent.expanded=true;
        budgetSubId=sub.id; // re-point the task's link to the new sub-item
        _ciSaveNewSub=true;
      }
    }
    // "Add a deposit to this item" — write the deposit directly to the item.
    const addExistDep=document.getElementById('ci-existdep-add')?.checked;
    if(addExistDep && !addExistSub){
      const parent=STATE.budget.items.find(x=>x.id===budgetId);
      if(parent){
        parent.deposit=Number(document.getElementById('ci-existdep-amt')?.value)||0;
        parent.depositFromSubs=false;
        parent.depositDueDate=document.getElementById('ci-existdep-due')?.value||'';
        if(parent.depositPaid===undefined) parent.depositPaid=false;
        parent.expanded=true;
        budgetSubId=''; // task links to the item itself
      }
    }
  }
  // Buy-keyword reminder: if the task looks like a purchase but isn't linked to a
  // Payment, remind the user (once they haven't dismissed it). The guard passes
  // a flag through so re-entry after confirming doesn't loop.
  const _hasBudgetLink = !!(budgetId || (rawBudget && rawBudget!=='' && rawBudget!=='__new__|') || rawBudget==='__new__|');
  // Trigger the budget-link prompt when the task looks money-related: a payment/buy
  // keyword, a deposit keyword, OR a bare $amount (e.g. "Slippers $480") in title/notes.
  const _hasMoneyCue = _taskBuyKeywordText(text) || _taskBuyKeywordText(notes)
    || _depositKeywordText(text) || _depositKeywordText(notes)
    || _hasDollarAmount(text) || _hasDollarAmount(notes);
  // Also suggest when the task shares a distinctive word (e.g. a vendor name like
  // "Hillstone") with an existing Payment, even without a money cue.
  const _hasWordMatch = !!_suggestBudgetMatch(`${text||''} ${notes||''}`);
  const _suggestOn = !(STATE.settings && STATE.settings.suggestBudgetLinks===false);
  // v179: no link pop-up on save — an unlinked money task is offered the budget when it's ticked.
  window._buyPromptBypass=false;
  if(editId){
    const i=STATE.checklist.find(x=>x.id===editId);
    if(i){ i.text=text; i.category=cat; i.dueDate=due; i.notes=notes; i.url=url; i.budgetId=budgetId; i.budgetSubId=budgetSubId; i._autoDue=false; }
    savedTask=i;
  } else {
    savedTask={id:'cl'+Date.now(),text,done:false,dueDate:due,category:cat,notes,url,pinned:false,budgetId,budgetSubId};
    if(_stagedAppts && _stagedAppts.length) savedTask.appointments=_stagedAppts;
    STATE.checklist.push(savedTask);
  }
  // A successful add finalises any resumed draft and ends the add-dialog session.
  if(_ciDraftId && STATE.checklistDrafts){ STATE.checklistDrafts=STATE.checklistDrafts.filter(d=>d.id!==_ciDraftId); }
  _ciDraftId=null; _ciAddDialogOpen=false; window._ciApptStage=null; window._ciApptOwnerTaskId=null;
  closeModalDirect(); navigate('checklist');
  // Missed-appointment nudge: keyword present, but no appointment was added. Honour the
  // per-app "don't ask again" flag.
  if(savedTask && !_taskHasAppts(savedTask) && _taskApptKeyword(savedTask)
     && !(STATE.settings && STATE.settings.hideApptPrompt) && !window._apptPromptBypass){
    _popupOrigin=_currentPage;
    setTimeout(()=>_askIsAppointment(savedTask), 60);
    return;
  }
  window._apptPromptBypass=false;
  // v179: no deposit pop-up on save. A deposit is recorded from the item, or from the tick sheet.
}
// Buy-keyword reminder prompt — stacks over the open Add Item dialog.
// ── Unified link-prompt body builder (Streamline 03) ────────────────────────
// The buy prompt (fires on save) and the complete prompt (fires on completion)
// were near-identical. They now share this one builder; only the opening line,
// the no-match fallback, and the four action handlers differ per context.
//   ctx.title    : headline sentence
//   ctx.matchHtml: pre-rendered suggested-match card(s) (may be '')
//   ctx.noMatch  : fallback body sentence when there is no match
//   ctx.skip/createNew/chooseAnother : onclick handler strings for the footer
//   ctx.matchHtml already carries its own tap handler, built by the caller.
// Per-arm prompt copy. The budget-link gate fires on any of three independent arms
// (money cue / booked keyword / name similarity), but every arm used to show the same
// "Looks money-related" line — so when the name-similarity arm fired the prompt asserted
// a reason that was simply untrue, and every false positive arrived as a misleading bug
// report. Each arm now says something that actually holds for it. `matchCopy` is shown
// when suggested matches are rendered, `noMatch` when none cleared the threshold.
// Precedence at the call sites is money > booked > match: the strongest TRUE claim wins.
const _LINK_PROMPT_COPY={
  money:{
    saveTitle:'This task mentions a cost — track it in your budget?',
    completeTitle:'Nicely done — track this cost in your budget?',
    matchCopy:'It mentions a cost but isn\u2019t linked yet. Pick the suggested match, or choose another option below.',
    noMatch:'It looks money-related, but isn\u2019t linked to your budget yet. Link it to an existing budget item, or create a new one so the cost is tracked — or skip if it isn\u2019t a budget expense.'
  },
  booked:{
    saveTitle:'Booked — should this cost go in your budget?',
    completeTitle:'Booked — should this cost go in your budget?',
    matchCopy:'Booking usually means paying for it, and this isn\u2019t linked yet. Pick the suggested match, or choose another below.',
    noMatch:'This looks like a booking, but it isn\u2019t linked to your budget. Link it to an existing item, or create a new one so the cost is tracked — or skip if there\u2019s nothing to pay.'
  },
  match:{
    saveTitle:'Is this the same as a budget item?',
    completeTitle:'Is this the same as a budget item?',
    matchCopy:'The name matches something in your budget, though nothing here mentions a cost. Link them if they\u2019re the same thing.',
    noMatch:'This resembles something already in your budget but isn\u2019t linked to it. Link it to an existing item, or create a new one — or skip if they\u2019re unrelated.'
  }
};
function _linkPromptCopy(reason){ return _LINK_PROMPT_COPY[reason]||_LINK_PROMPT_COPY.money; }
function _buildLinkPromptBody(ctx){
  const bodyCopy = ctx.matchHtml
    ? (ctx.matchCopy || _LINK_PROMPT_COPY.money.matchCopy)
    : ctx.noMatch;
  return `<div style="display:flex;flex-direction:column;gap:11px">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <span style="width:28px;height:28px;border-radius:50%;background:rgba(196,168,130,.18);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--gold-deep)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span>
      <div style="font-size:13.5px;color:var(--ink);font-weight:500;line-height:1.4">${ctx.title}</div>
    </div>
    <div style="font-size:12.5px;color:var(--muted);line-height:1.55">${bodyCopy}</div>
    ${ctx.matchHtml}
    <div style="display:flex;gap:7px;margin-top:2px">
      <button class="btn btn-outline btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="${ctx.skip}">Skip</button>
      <button class="btn btn-outline btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="${ctx.createNew}">Create new</button>
      <button class="btn btn-outline btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="${ctx.chooseAnother}">Choose another…</button>
    </div>
    <div style="font-size:11.5px;color:var(--gold-deep);line-height:1.5;display:flex;align-items:flex-start;gap:5px;margin-top:1px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>You can also set up a deposit or payment plan in the next step.</div>
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);cursor:pointer;padding-top:3px"><input type="checkbox" id="buyprompt-dontshow" style="width:15px;height:15px;accent-color:var(--gold);cursor:pointer"/> Don't show this message again</label>
  </div>`;
}
// `reason` is supplied by the caller rather than re-derived here: the save gate tests the
// title AND the notes, while this function only has the title field to hand, so deriving
// locally would mislabel a task whose money cue lives in its notes.
function _showBuyLinkPrompt(editId, reason){
  const _c=_linkPromptCopy(reason);
  const _txt=(typeof _ciTaskText==='function'?_ciTaskText():'')||document.getElementById('ci-text')?.value||'';
  const _matches=_suggestBudgetMatches(_txt, 3);
  const _matchHtml=_renderMatchCards(_matches, m=>`_buyPromptLinkMatch('${m.bid}','${m.sid}')`, m=>`_buyPromptAddSubMatch('${m.bid}')`);
  const eid = editId ? `'${editId}'` : 'null';
  const body=_buildLinkPromptBody({
    title:_c.saveTitle,
    matchHtml:_matchHtml,
    matchCopy:_c.matchCopy,
    noMatch:_c.noMatch,
    skip:`_buyPromptSkip(${eid})`,
    createNew:`_buyPromptCreateNew(${eid})`,
    chooseAnother:`_buyPromptLink(${eid})`
  });
  openConfirm2('Link to your budget?', body, '');
}
// One-tap match from the buy-prompt: the task isn't saved yet, so set the dropdown in
// the still-open Add dialog and re-run save (which persists the task + link).
function _buyPromptLinkMatch(bid, sid){
  _buyPromptPersistDismiss();
  if(typeof _closeConfirm2Direct==='function') _closeConfirm2Direct();
  const cb=document.getElementById('ci-link-toggle');
  if(cb){ cb.checked=true; if(typeof onBudgetLinkToggle==='function') onBudgetLinkToggle(); }
  const sel=document.getElementById('ci-budget');
  const val=`${bid}|${sid||''}`;
  if(sel){ sel.value=val; if(typeof onBudgetLinkChange==='function') onBudgetLinkChange(val); }
  window._buyPromptBypass=true; // don't re-trigger this prompt on the resave
  _suppressSaveDepositPrompt=true; // the status prompt below covers deposit setup
  const _eid=_ciEditId||undefined;
  if(typeof saveCheckitem==='function') saveCheckitem(_eid);
  _suppressSaveDepositPrompt=false;
  // Find the saved task id to thread into the status prompt (edit keeps its id; a new
  // task is the most recently pushed one).
  const tid = _eid || (STATE.checklist.length ? STATE.checklist[STATE.checklist.length-1].id : '');
  setTimeout(()=>_askLinkedBudgetStatus(bid, sid, tid), 70);
}
// "Add as a sub-item under [category]" from the buy prompt. Creates a new sub-item
// named after the task under the matched category, then links the task to it (via the
// same dropdown + resave path used for a direct match).
function _buyPromptAddSubMatch(bid){
  _buyPromptPersistDismiss();
  if(typeof _closeConfirm2Direct==='function') _closeConfirm2Direct();
  const b=STATE.budget.items.find(x=>x.id===bid);
  if(!b){ return; }
  if(!b.subItems) b.subItems=[];
  const nm=(_linkPromptSubName()||b.name||'New item');
  const sub={id:'bs'+Date.now(),name:nm,amount:0,balanceDueDate:b.balanceDueDate||'',deposit:0,depositPaid:false,paid:false,showDeposit:false};
  // Seed the sub-item amount from a $ figure in the task text/notes, if any.
  try{
    const txt=(typeof _ciTaskText==='function'?_ciTaskText():'')||document.getElementById('ci-text')?.value||'';
    const notes=(typeof _ciTaskNotes==='function'?_ciTaskNotes():'')||document.getElementById('ci-notes')?.value||'';
    const amt=Math.max(Number(_extractDollarAmount(txt)||0), Number(_extractDollarAmount(notes)||0));
    if(amt>0) sub.amount=amt;
  }catch(e){}
  b.subItems.push(sub); b.expanded=true;
  if(typeof applyAutoFromSubs==='function') applyAutoFromSubs(b);
  // Point the open Add/Edit dialog's link at the new sub-item and re-save.
  const cb=document.getElementById('ci-link-toggle');
  if(cb){ cb.checked=true; if(typeof onBudgetLinkToggle==='function') onBudgetLinkToggle(); }
  const sel=document.getElementById('ci-budget');
  const val=`${bid}|${sub.id}`;
  if(sel){
    // The dropdown may not contain the brand-new sub-item as an <option>; add one so
    // the value sticks, then fire the change handler.
    if(![...sel.options].some(o=>o.value===val)){ const o=document.createElement('option'); o.value=val; o.textContent=`${b.name} › ${nm}`; sel.appendChild(o); }
    sel.value=val; if(typeof onBudgetLinkChange==='function') onBudgetLinkChange(val);
  }
  window._buyPromptBypass=true;
  _suppressSaveDepositPrompt=true;
  const _eid=_ciEditId||undefined;
  if(typeof saveCheckitem==='function') saveCheckitem(_eid);
  _suppressSaveDepositPrompt=false;
  const tid = _eid || (STATE.checklist.length ? STATE.checklist[STATE.checklist.length-1].id : '');
  setTimeout(()=>_askLinkedBudgetStatus(bid, sub.id, tid), 70);
}
function _buyPromptPersistDismiss(){
  if(document.getElementById('buyprompt-dontshow')?.checked){
    if(!STATE.settings) STATE.settings={};
    STATE.settings.hideBuyLinkPrompt=true;
    saveToStorage();
  }
}
function _buyPromptLink(editId){
  _buyPromptPersistDismiss();
  if(typeof _closeConfirm2Direct==='function') _closeConfirm2Direct();
  // Turn linking on in the still-open Add Item dialog, on the existing-item path.
  const cb=document.getElementById('ci-link-toggle');
  if(cb){ cb.checked=true; if(typeof onBudgetLinkToggle==='function') onBudgetLinkToggle(); }
  const sel=document.getElementById('ci-budget');
  if(sel){ sel.value=''; if(typeof onBudgetLinkChange==='function') onBudgetLinkChange(''); sel.focus(); }
}
// Create-new path: open the link section and pre-select the "+ New category" option,
// which reveals (and autofills) the new-item fields via onBudgetLinkChange.
function _buyPromptCreateNew(editId){
  _buyPromptPersistDismiss();
  if(typeof _closeConfirm2Direct==='function') _closeConfirm2Direct();
  const cb=document.getElementById('ci-link-toggle');
  if(cb){ cb.checked=true; if(typeof onBudgetLinkToggle==='function') onBudgetLinkToggle(); }
  const sel=document.getElementById('ci-budget');
  if(sel){ sel.value='__new__|'; if(typeof onBudgetLinkChange==='function') onBudgetLinkChange('__new__|'); }
}
function _buyPromptSkip(editId){
  _buyPromptPersistDismiss();
  if(typeof _closeConfirm2Direct==='function') _closeConfirm2Direct();
  // Proceed with the original save, bypassing the reminder this time.
  window._buyPromptBypass=true;
  saveCheckitem(editId);
}
// Shared money-cue test: a payment/buy keyword, a deposit keyword, or a bare
// $amount in the task title or notes (mirrors the save-time trigger).
function _isMoneyCueTask(i){
  if(!i) return false;
  const text=i.text||'', notes=i.notes||'';
  return _taskBuyKeywordText(text) || _taskBuyKeywordText(notes)
    || _depositKeywordText(text) || _depositKeywordText(notes)
    || _hasDollarAmount(text) || _hasDollarAmount(notes);
}
// Completion-flow link prompt: shown when an unlinked, money-related task is
// ticked complete. Mirrors the save prompt, but its actions open the task's
// editor first (the link controls live there), then enter the chosen path.
function _showCompleteLinkPrompt(taskId){
  const _task=STATE.checklist.find(x=>x.id===taskId);
  // Same three tests the completion gate just evaluated, in the same order, so the copy
  // can never disagree with the reason the prompt actually opened.
  const _reason = _isMoneyCueTask(_task) ? 'money'
                : _taskBookedKeywordTask(_task) ? 'booked'
                : 'match';
  const _c=_linkPromptCopy(_reason);
  const _mb=_promptMatchBlock(`${_task?.text||''} ${_task?.notes||''}`, taskId);
  const tid = `'${taskId}'`;
  const body=_buildLinkPromptBody({
    title:_c.completeTitle,
    matchHtml:_mb.html,
    matchCopy:_c.matchCopy,
    noMatch:_c.noMatch,
    skip:`_completeLinkSkip(${tid})`,
    createNew:`_completeLinkCreateNew(${tid})`,
    chooseAnother:`_completeLinkExisting(${tid})`
  });
  openConfirm2('Link to your budget?', body, '');
}
function _completeLinkSkip(taskId){
  _buyPromptPersistDismiss();
  _checkSnapshot=null; // deliberate action — keep the tick, don't revert later
  if(typeof _closeConfirm2Direct==='function') _closeConfirm2Direct();
  _flushFollowUp();
}
// Open the task editor, then drive its link UI into the existing-item path.
function _completeLinkExisting(taskId){
  _buyPromptPersistDismiss();
  _checkSnapshot=null; // deliberate action — keep the tick, don't revert later
  if(typeof _closeConfirm2Direct==='function') _closeConfirm2Direct();
  openEditCheckitem(taskId);
  setTimeout(()=>{
    const cb=document.getElementById('ci-link-toggle');
    if(cb){ cb.checked=true; if(typeof onBudgetLinkToggle==='function') onBudgetLinkToggle(); }
    const sel=document.getElementById('ci-budget');
    if(sel){ sel.value=''; if(typeof onBudgetLinkChange==='function') onBudgetLinkChange(''); sel.focus(); }
  }, 40);
}
// Open the task editor, then drive its link UI into the create-new path.
function _completeLinkCreateNew(taskId){
  _buyPromptPersistDismiss();
  _checkSnapshot=null; // deliberate action — keep the tick, don't revert later
  if(typeof _closeConfirm2Direct==='function') _closeConfirm2Direct();
  openEditCheckitem(taskId);
  setTimeout(()=>{
    const cb=document.getElementById('ci-link-toggle');
    if(cb){ cb.checked=true; if(typeof onBudgetLinkToggle==='function') onBudgetLinkToggle(); }
    const sel=document.getElementById('ci-budget');
    if(sel){ sel.value='__new__|'; if(typeof onBudgetLinkChange==='function') onBudgetLinkChange('__new__|'); }
  }, 40);
}
// ── Shared smart-match block for the link prompts ───────────────────────────
// Builds the in-prompt suggestion as a tappable card (single clear match → a gold
// primary card; near-ties → a short stack of outline cards). Returns {html} only —
// the action lives in the card, so the footer stays a tidy set of small buttons.
// ── Shared match-card renderer (single source of truth for all link prompts) ──
// Builds the suggested-match UI used by every link prompt and chip. Callers pass:
//   matches : array from _suggestBudgetMatches (0–3 items)
//   tapAttr : (m) => string  — the onclick handler body for each card
// Returns an HTML string ('' when there are no matches). One clear match → a gold
// primary card; near-ties → a short stack of outline cards. Keeping this in one place
// means the buy prompt, complete prompt, and any future surface stay pixel-identical.
function _renderMatchCards(matches, tapAttr, subTapAttr){
  if(!matches || !matches.length) return '';
  const esc=s=>String(s).replace(/</g,'&lt;');
  const linkIcon=(stroke)=>`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
  const plusIcon=(stroke)=>`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  const chev=(stroke)=>`<span style="color:${stroke};flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>`;
  if(matches.length===1){
    const m=matches[0];
    // Card builder for a compact gold action card (eyebrow + bold label).
    const goldCard=(bg, icon, eyebrow, label, onclick)=>`<div onclick="${onclick}" style="display:flex;align-items:center;gap:10px;background:${bg};border-radius:11px;padding:9px 11px;cursor:pointer;margin-top:2px">
        <span style="width:28px;height:28px;border-radius:7px;background:rgba(255,255,255,.22);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff">${icon}</span>
        <span style="flex:1;min-width:0">
          <span style="display:block;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:#fff;opacity:.85">${eyebrow}</span>
          <span style="display:block;font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(label)}</span>
        </span>
        ${chev('#fff')}
      </div>`;
    // For a CATEGORY match (no sub-item) with an add-sub-item handler available, show
    // the prominent "add as a sub-item" card on top, then the "link to category" card.
    if(!m.sid && typeof subTapAttr==='function'){
      const subLabel=`${m.label} \u203a ${(_linkPromptSubName()||m.label)}`;
      return `<div style="display:flex;flex-direction:column;gap:7px;margin-top:2px">
        ${goldCard('var(--gold-deep)', plusIcon('#fff'), 'Add as a sub-item under', subLabel, subTapAttr(m))}
        ${goldCard('var(--gold)', linkIcon('#fff'), 'Link to category', m.label, tapAttr(m))}
      </div>`;
    }
    // Otherwise (sub-item match, or no sub handler): the single link card as before.
    return goldCard('var(--gold)', linkIcon('#fff'), 'Link to suggested match', m.label, tapAttr(m));
  }
  const cards=matches.map(m=>`<div onclick="${tapAttr(m)}" style="display:flex;align-items:center;gap:11px;background:var(--surface);border:.5px solid var(--border);border-radius:11px;padding:11px 12px;cursor:pointer">
      <span style="width:30px;height:30px;border-radius:8px;background:rgba(201,161,74,.16);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--gold-deep)">${linkIcon('var(--gold-deep)')}</span>
      <span style="flex:1;min-width:0;font-size:13px;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.label)}</span>
      <span style="color:var(--muted);flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
    </div>`).join('');
  return `<div style="margin-top:2px">
      <div style="font-size:11.5px;color:var(--gold-deep);margin-bottom:7px;display:flex;align-items:center;gap:5px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>A few possible matches — tap one to link:</div>
      <div style="display:flex;flex-direction:column;gap:7px">${cards}</div>
    </div>`;
}
// Best-guess name for a new sub-item created from the prompt: the current task text.
function _linkPromptSubName(){
  const fromField = (typeof _ciTaskText==='function' ? _ciTaskText() : '') || document.getElementById('ci-text')?.value || '';
  if(fromField && fromField.trim()) return fromField.trim();
  if(window._linkPromptTaskName) return window._linkPromptTaskName;
  return '';
}
function _promptMatchBlock(taskText, taskId){
  const matches=_suggestBudgetMatches(taskText, 3);
  // The edit field isn't open in the complete flow; stash the task name so the
  // "Add as a sub-item" card can label the new sub-item.
  const _t=STATE.checklist.find(x=>x.id===taskId);
  window._linkPromptTaskName=(_t&&_t.text)?_t.text.trim():'';
  const html=_renderMatchCards(matches, m=>`_promptLinkMatch('${taskId}','${m.bid}','${m.sid}')`, m=>`_promptAddSubMatch('${taskId}','${m.bid}')`);
  return {html, primaryHtml:''};
}
// Link a task directly to the chosen budget item/sub-item from a prompt, then close.
function _promptLinkMatch(taskId, bid, sid){
  _buyPromptPersistDismiss();
  const t=STATE.checklist.find(x=>x.id===taskId);
  if(t){
    // Clear any prior reverse-link, then wire both sides.
    STATE.budget.items.forEach(b=>{ if(b.checklistId===t.id) b.checklistId=''; });
    t.budgetId=bid; t.budgetSubId=sid||'';
    const b=STATE.budget.items.find(x=>x.id===bid);
    if(b && !sid) b.checklistId=t.id; // item-level link keeps the reverse pointer
    saveToStorage();
  }
  if(typeof _closeConfirm2Direct==='function') _closeConfirm2Direct();
  navigate('checklist');
  // Offer to set the linked target's budget status (mark paid / deposit / installments).
  setTimeout(()=>_askLinkedBudgetStatus(bid, sid, taskId), 60);
}
// "Add as a sub-item under [category]" from the complete prompt. Creates a new sub-item
// named after the task under the matched category and links the task to it.
function _promptAddSubMatch(taskId, bid){
  _buyPromptPersistDismiss();
  const t=STATE.checklist.find(x=>x.id===taskId);
  const b=STATE.budget.items.find(x=>x.id===bid);
  let newSid='';
  if(t && b){
    if(!b.subItems) b.subItems=[];
    const nm=(t.text&&t.text.trim())||b.name||'New item';
    const sub={id:'bs'+Date.now(),name:nm,amount:0,balanceDueDate:b.balanceDueDate||'',deposit:0,depositPaid:false,paid:false,showDeposit:false};
    try{
      const amt=Math.max(Number(_extractDollarAmount(t.text||'')||0), Number(_extractDollarAmount(t.notes||'')||0));
      if(amt>0) sub.amount=amt;
    }catch(e){}
    b.subItems.push(sub); b.expanded=true; newSid=sub.id;
    if(typeof applyAutoFromSubs==='function') applyAutoFromSubs(b);
    // Clear any prior reverse-link, then wire the task to the new sub-item.
    STATE.budget.items.forEach(x=>{ if(x.checklistId===t.id) x.checklistId=''; });
    t.budgetId=bid; t.budgetSubId=newSid;
    saveToStorage();
  }
  _checkSnapshot=null; // deliberate action — keep the completion tick
  if(typeof _closeConfirm2Direct==='function') _closeConfirm2Direct();
  navigate('checklist');
  setTimeout(()=>_askLinkedBudgetStatus(bid, newSid, taskId), 60);
}
// Follow-up after linking: lets the user mark the target paid, add a deposit, or set up
// installments — in one tap. Shown every time a link is made via the prompt.
function _askLinkedBudgetStatus(bid, sid, taskId){
  const b=STATE.budget.items.find(x=>x.id===bid); if(!b) return;
  const s=sid ? b.subItems?.find(x=>x.id===sid) : null;
  if(sid && !s) return;
  const alreadyPaid = s ? !!s.paid : !!b.paid;
  const hasDep = s ? _targetHasDeposit(b, s) : (Number(b.deposit||0)>0 || b.depositDueDate || b.depositFromSubs);
  const name = s ? `${b.name} › ${s.name}` : b.name;
  const esc=x=>String(x).replace(/</g,'&lt;');
  // Build the option rows that apply.
  let rows='';
  if(!alreadyPaid){
    rows+=`<div onclick="_linkedStatusPaid('${bid}','${sid||''}')" style="display:flex;align-items:center;gap:11px;border:.5px solid var(--border);background:var(--surface);border-radius:10px;padding:11px 12px;margin-bottom:8px;cursor:pointer">
      <span style="width:30px;height:30px;border-radius:8px;background:rgba(46,125,50,.14);color:var(--green,#2E7D32);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      <span style="flex:1"><span style="font-size:13px;font-weight:500;color:var(--ink)">Mark as paid</span><br><span style="font-size:10.5px;color:var(--muted)">${s?'Tick the sub-item\u2019s balance as fully paid':'Mark this category as fully paid'}</span></span>
      <span style="color:var(--muted);flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
    </div>`;
  }
  {
    const task = STATE.checklist.find(x=>x.id===taskId);
    const seedAmt = task ? (_suggestDepositAmount(task.text, task.notes) || _extractDollarAmount(task.text) || _extractDollarAmount(task.notes) || 0) : 0;
    const bookedMention = task ? (_taskBookedKeyword(task.text) || _taskBookedKeyword(task.notes)) : false;
    const fromBooked = !!(bookedMention && task && task.dueDate);
    const defaultDue = fromBooked ? task.dueDate : _todayISO();
    const ai = _targetAmountInfo(b, s);
    const targetLabel = s ? s.name : b.name;
    const esc2=x=>String(x||'').replace(/</g,'&lt;');
    // Item / sub-item fields: editable amount when flat, else a note + Open in budget.
    // Balance due date is always editable.
    const itemFields = `
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--gold-deep);margin:2px 0 7px">Item / sub-item</div>
        ${ai.computed
          ? `<div style="font-size:11px;line-height:1.45;border-radius:8px;padding:8px 10px;margin-bottom:9px;display:flex;gap:7px;align-items:flex-start;background:rgba(201,168,130,.12);color:var(--gold-deep)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg><span>This amount is ${ai.reason}. Edit the amount on the budget page.</span></div>
             <button type="button" class="btn btn-outline btn-sm" style="font-size:11.5px;margin-bottom:10px;display:inline-flex;align-items:center;gap:5px" onclick="_linkedStatusOpenInBudget('${bid}','${sid||''}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Open in budget</button>`
          : `<div style="font-size:11px;color:var(--muted);margin-bottom:3px">${esc2(targetLabel)} — total amount</div>
             <input id="lsd-item-amount" class="form-input" inputmode="decimal" value="${ai.amount?(_curSym()+ai.amount):''}" placeholder="${_curSym()}0" style="font-size:12.5px;height:34px;margin-bottom:10px"/>`}
        <div style="font-size:11px;color:var(--muted);margin-bottom:3px">Balance due date</div>
        <input id="lsd-item-due" class="form-input" type="date" value="${ai.balanceDue||''}" style="font-size:12.5px;height:34px;margin-bottom:11px"/>`;
    const depFields = `
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--gold-deep);border-top:.5px solid var(--border);padding-top:9px;margin:2px 0 7px">Deposit</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:3px">Deposit amount</div>
        <input id="lsd-amount" class="form-input" inputmode="decimal" value="${hasDep?(_curSym()+(s?Number(s.deposit||0):Number(b.deposit||0))):(seedAmt?(_curSym()+seedAmt):'')}" placeholder="${_curSym()}0" style="font-size:12.5px;height:34px;margin-bottom:10px"/>
        <div style="font-size:11px;color:var(--muted);margin-bottom:3px">Deposit due date</div>
        <input id="lsd-date" class="form-input" type="date" value="${hasDep?((s?s.depositDueDate:b.depositDueDate)||''):defaultDue}" style="font-size:12.5px;height:34px;margin-bottom:${(!hasDep&&fromBooked)?'4px':'8px'}"/>
        ${(!hasDep&&fromBooked)?`<div style="font-size:10.5px;color:var(--gold-deep);margin-bottom:8px;display:flex;align-items:center;gap:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><path d="M9 15l2 2 4-4"/></svg>Prefilled from the task’s booked date</div>`:''}
        <label style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink);cursor:pointer;margin-bottom:11px"><input type="checkbox" id="lsd-nodate" onchange="_linkedStatusDepNoDate()" style="width:15px;height:15px;cursor:pointer"/> No deposit due date</label>
        ${hasDep && !_targetDepositPaid(b,s) ? `<label style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink);cursor:pointer;margin-bottom:11px"><input type="checkbox" id="lsd-markpaid" style="width:15px;height:15px;cursor:pointer"/> Mark deposit as paid</label>` : ''}
        <button class="btn btn-primary btn-sm" style="width:100%;font-size:12.5px" onclick="_linkedStatusDepositSave('${bid}','${sid||''}','${taskId||''}')">${hasDep?'Save changes':'Save deposit'}</button>`;
    if(!hasDep){
      // No deposit yet: tap-to-expand "Add a deposit" row (existing behaviour) now also
      // carrying the item/sub-item amount + balance due fields.
      rows+=`<div id="lsd-row" style="border:.5px solid var(--border);background:var(--surface);border-radius:10px;margin-bottom:8px;overflow:hidden">
        <div onclick="_linkedStatusDepositToggle()" style="display:flex;align-items:center;gap:11px;padding:11px 12px;cursor:pointer">
          <span style="width:30px;height:30px;border-radius:8px;background:rgba(201,168,130,.18);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="15" x2="9" y2="15"/></svg></span>
          <span style="flex:1"><span style="font-size:13px;font-weight:500;color:var(--ink)">Add a deposit</span><br><span style="font-size:10.5px;color:var(--muted)">Record a deposit amount &amp; due date</span></span>
          <span id="lsd-chev" style="color:var(--muted);flex-shrink:0;transition:transform .15s"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>
        <div id="lsd-fields" style="display:none;padding:0 12px 12px 53px">${itemFields}${depFields}</div>
      </div>`;
    } else {
      // Deposit exists: show its summary, with an "Adjust amounts" sub-toggle revealing
      // the item/sub-item + deposit fields (incl. mark-paid).
      const depAmtNow = s?Number(s.deposit||0):Number(b.deposit||0);
      const depDueNow = (s?s.depositDueDate:b.depositDueDate)||'';
      const paidNow = _targetDepositPaid(b,s);
      const summary = `${fmt(depAmtNow)}${depDueNow?` · due ${fmtBudgetDate(depDueNow)}`:''} · ${paidNow?'paid':'unpaid'}`;
      rows+=`<div id="lsd-row" style="border:.5px solid var(--border);background:var(--surface);border-radius:10px;margin-bottom:8px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:11px;padding:11px 12px">
          <span style="width:30px;height:30px;border-radius:8px;background:rgba(201,168,130,.18);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="15" x2="9" y2="15"/></svg></span>
          <span style="flex:1"><span style="font-size:13px;font-weight:500;color:var(--ink)">Deposit</span><br><span style="font-size:10.5px;color:var(--muted)">${summary}</span></span>
        </div>
        <div onclick="_linkedStatusDepositToggle()" style="display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:500;color:var(--gold-deep);padding:9px 12px 9px 53px;cursor:pointer;border-top:.5px solid var(--border)"><span id="lsd-chev" style="display:inline-flex;transition:transform .15s"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>Adjust amounts</div>
        <div id="lsd-fields" style="display:none;padding:0 12px 12px 53px">${itemFields}${depFields}</div>
      </div>`;
    }
  }
  // Installments always create / use a sub-item holder — offer in both cases.
  rows+=`<div onclick="_linkedStatusInstallments('${bid}','${sid||''}','${taskId||''}')" style="display:flex;align-items:center;gap:11px;border:.5px solid var(--border);background:var(--surface);border-radius:10px;padding:11px 12px;cursor:pointer">
      <span style="width:30px;height:30px;border-radius:8px;background:rgba(201,168,130,.18);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="15" x2="9" y2="15"/><line x1="12" y1="15" x2="14" y2="15"/></svg></span>
      <span style="flex:1"><span style="font-size:13px;font-weight:500;color:var(--ink)">Set up installments</span><br><span style="font-size:10.5px;color:var(--muted)">Create a payment plan with due dates</span></span>
      <span style="color:var(--muted);flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
    </div>`;
  const body=`<div style="padding:1px">
    <div style="font-size:12.5px;color:var(--muted);line-height:1.5;margin-bottom:13px">Linked to <strong style="color:var(--ink)">${esc(name)}</strong>. Want to update its budget status now?</div>
    ${rows}
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Skip</button>`;
  openModal('Update its budget status?', body, footer);
}
function _linkedStatusPaid(bid, sid){
  closeModalDirect();
  if(sid){ if(typeof toggleSubPaid==='function') toggleSubPaid(bid, sid); }
  else { if(typeof toggleBudgetPaid==='function') toggleBudgetPaid(bid); }
}
function _linkedStatusDeposit(bid, sid, taskId){
  closeModalDirect();
  const b=STATE.budget.items.find(x=>x.id===bid); if(!b) return;
  const s=sid ? b.subItems?.find(x=>x.id===sid) : null;
  const task=STATE.checklist.find(x=>x.id===taskId) || {text:'',notes:'',id:taskId};
  _popupOrigin=_currentPage;
  setTimeout(()=>_askAddSubDeposit(b, s, task), 50);
}
// Streamline 01 inline deposit — expand/collapse the form within the status modal.
function _linkedStatusDepositToggle(){
  const f=document.getElementById('lsd-fields'); if(!f) return;
  const open = f.style.display!=='none';
  f.style.display = open ? 'none' : 'block';
  const chev=document.getElementById('lsd-chev');
  if(chev) chev.style.transform = open ? 'none' : 'rotate(90deg)';
  if(!open){ const a=document.getElementById('lsd-amount'); if(a) setTimeout(()=>a.focus(),30); }
}
function _linkedStatusDepNoDate(){
  const off=document.getElementById('lsd-nodate')?.checked;
  const d=document.getElementById('lsd-date'); if(!d) return;
  d.disabled=!!off; d.style.opacity=off?'.4':'1';
}
// Save the inline deposit, then continue to the SAME mark-paid / balance follow-up
// the old separate "Add a deposit?" modal used — so no behaviour downstream is lost.
function _linkedStatusDepositSave(bid, sid, taskId){
  const b=STATE.budget.items.find(x=>x.id===bid); if(!b){ closeModalDirect(); return; }
  const s=sid ? b.subItems?.find(x=>x.id===sid) : null;
  const hadDep = _targetHasDeposit(b, s);
  // Item / sub-item amount (only when the flat field is present) + balance due date.
  const itemAmtEl=document.getElementById('lsd-item-amount');
  if(itemAmtEl){
    const itemAmt=Number((itemAmtEl.value||'').replace(/[^0-9.-]/g,''))||0;
    if(s) s.amount=itemAmt; else { b.total=itemAmt; b.totalFromSubs=false; }
  }
  const itemDueEl=document.getElementById('lsd-item-due');
  if(itemDueEl){
    const itemDue=itemDueEl.value||'';
    if(s){ s.balanceDueDate=itemDue; if(itemDue) s.showDueDate=true; }
    else b.balanceDueDate=itemDue;
  }
  // Deposit amount + deposit due date.
  const rawAmt=(document.getElementById('lsd-amount')?.value||'').replace(/[^0-9.-]/g,'');
  const noDate=document.getElementById('lsd-nodate')?.checked;
  const dueVal = noDate ? '' : (document.getElementById('lsd-date')?.value||'');
  if(s){
    s.deposit=Number(rawAmt)||0;
    s.showDeposit=true;
    s.depositDueDate=dueVal;
  } else {
    b.deposit=Number(rawAmt)||0;
    b.depositFromSubs=false;
    b.depositDueDate=dueVal;
  }
  // Existing-deposit flow: honour the inline "Mark deposit as paid" checkbox.
  const markPaid=document.getElementById('lsd-markpaid')?.checked;
  if(markPaid){
    if(s){ s.depositPaid=true; if(!s.depositPaidDate) s.depositPaidDate=_todayISO(); }
    else { b.depositPaid=true; if(!b.depositPaidDate) b.depositPaidDate=_todayISO(); }
  }
  _bookedFallbackBalance=null;
  saveToStorage();
  closeModalDirect();
  _popupOrigin=_currentPage;
  if(hadDep){
    // Adjusting an existing deposit — changes are saved; return to where we were.
    navigate(_popupReturn());
  } else {
    // New deposit just added — same continuation as before: offer mark-deposit-paid,
    // then the balance task.
    setTimeout(()=>_askMarkDepositPaid(bid, sid, taskId), 50);
  }
}
// Computed amount → send the user to the budget page to edit it there.
function _linkedStatusOpenInBudget(bid, sid){
  closeModalDirect();
  _focusBudgetRow(bid, sid||'', sid?'balance':'');
}
function _linkedStatusInstallments(bid, sid, taskId){
  closeModalDirect();
  const b=STATE.budget.items.find(x=>x.id===bid); if(!b) return;
  _popupOrigin=_currentPage;
  if(sid){
    // Sub-item already exists — open its payments editor directly.
    setTimeout(()=>openPaymentsEditor(bid, sid, 0, {forceInstallments:true}), 50);
  } else {
    // Item-level: create a holder sub-item for the plan (shared helper), seeded from
    // any $ amount in the task title.
    const task=STATE.checklist.find(x=>x.id===taskId);
    const seed = task ? (_extractDollarAmount(task.text)||0) : 0;
    // _openInstallmentsForItem reads the task title from the ci-text field if present;
    // pass the seed and no due date.
    setTimeout(()=>_openInstallmentsForItem(bid, seed, ''), 50);
  }
}
function deleteCheckitem(id){
  closeDots();
  const i = STATE.checklist.find(x=>x.id===id);
  if(!i) return;
  _confirmDeleteDialog({title:'Delete Task', question:'Delete this task?', name:i.text, verb:'Delete', onConfirmJs:`confirmDeleteCheckitem('${id}')`});
}
function confirmDeleteCheckitem(id){
  const _c0=STATE.checklist.find(x=>x.id===id);
  const _label=_c0?(_c0.text||'task'):'task';
  closeModalDirect();
  _undoableDelete(_label, ()=>{
    STATE.checklist = STATE.checklist.filter(x=>x.id!==id);
  }, 'checklist');
}

// ══════════════════════════════════════════════
