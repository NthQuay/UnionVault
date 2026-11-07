// EVENT DETAILS
// ══════════════════════════════════════════════
function renderDetails(c, actions){
  const e=STATE.event; const s=STATE.settings;
  actions.innerHTML=`<div id="det-opts-wrap" style="position:relative;display:inline-flex"><button class="btn-icon" id="det-opts-btn" onclick="_openDetOptsMenu(event)" title="Event options" aria-label="Event options" aria-haspopup="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>${_detOptsMenuHtml()}</div>`;

  // Ceremony details (moved here from the Vendors page). Field IDs and save
  // logic are unchanged so the existing handlers keep working.
  const ev=_evNormalize(STATE.event||(STATE.event={}));
  const cerHide=(s&&s.hideCeremonyDetails);
  const hideRel=cerHide||(s&&s.hideReligion);
  const hideOff=cerHide||(s&&s.hideOfficiant);
  const hideVen=cerHide||(s&&s.hideCeremonyVenue);
  const cerFields=[];
  if(!hideRel) cerFields.push(`<div><label class="form-label">Religion</label>${_otherSelectHtml('ven-religion', RELIGION_OPTIONS, ev.religion||'')}</div>`);
  if(!hideOff) cerFields.push(`<div><label class="form-label">Married by a</label>${_otherSelectHtml('ven-officiant', OFFICIANT_OPTIONS, ev.officiant||'')}${_cerLinkHtml('officiant', ev.officiant, ev.officiantVendorId)}</div>`);
  if(!hideVen) cerFields.push(`<div><label class="form-label">Ceremony setting</label>${_otherSelectHtml('ven-cersetting', CEREMONY_VENUE_OPTIONS, ev.ceremonySetting||'')}<div style="font-size:11.5px;color:var(--muted);margin-top:5px">The kind of setting you imagine — for planning and your vendor brief.</div></div>`);
  const anyCer = !hideRel || !hideOff || !hideVen;

  const EVENT_PRESETS = ['Bachelor Party','Bachelorette Party','Engagement Party','Bridal Shower','Rehearsal Dinner','Other…'];

  const eventsHtml = STATE.events.length ? STATE.events.map(ev=>`
    <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:500;color:var(--ink)">${_esc(ev.name||ev.title||'Untitled event')}</div>
        ${ev.date?`<div style="font-size:12px;color:var(--muted);margin-top:3px">${fmtDate(ev.date)}${_fmtEventTime(ev.time)?(' · '+_fmtEventTime(ev.time)):''}</div>`:''}
        ${(ev.venueName||ev.venue)?`<div style="font-size:12px;color:var(--muted);margin-top:2px">${_esc(ev.venueName||ev.venue)}${(ev.venueAddress)?(' · '+_esc(ev.venueAddress)):''}</div>`:''}
        ${ev.notes?`<div style="font-size:12px;color:var(--muted);margin-top:3px;font-style:italic">${_esc(ev.notes)}</div>`:''}
      </div>
      <button class="btn btn-ghost btn-sm" onclick="openEventDetail('${ev.id}')" style="flex-shrink:0;color:var(--gold-deep);font-size:11px">Open</button>
    </div>`).join('') : '<div style="font-size:13px;color:var(--muted);padding:16px 0;text-align:center">No additional events yet</div>';

  c.innerHTML=`
  <div style="margin-bottom:20px">
    <button class="btn btn-ghost btn-sm" onclick="navigate('dashboard')" style="display:inline-flex;align-items:center;gap:6px;color:var(--muted);padding-left:0">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Back to Dashboard
    </button>
  </div>
  <div class="details-two-col" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;align-items:start">
    <div>
      <div class="section-eyebrow" style="margin-bottom:8px">Your Event</div>
      <div class="section-title" style="margin-bottom:24px">Wedding Details</div>
      <div class="card" style="">
        <div style="display:flex;flex-direction:column;gap:18px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="form-group">
            <label class="form-label">${s.partner1Title||'Partner 1'}</label>
            <input class="form-input" value="${e.partner1||''}" placeholder="First name" oninput="STATE.event.partner1=this.value;updateTopbarSub();saveToStorage()"/>
          </div>
          <div class="form-group">
            <label class="form-label">${s.partner2Title||'Partner 2'}</label>
            <input class="form-input" value="${e.partner2||''}" placeholder="First name" oninput="STATE.event.partner2=this.value;updateTopbarSub();saveToStorage()"/>
          </div>
        </div>
        <div class="form-row det-pair">
          <div class="form-group">
            <label class="form-label">Wedding Date</label>
            <input class="form-input" type="date" value="${e.date||''}" onchange="onWeddingDateChange(this.value)"/>
          </div>
          <div class="form-group">
            <label class="form-label">Ceremony time</label>
            ${(!e.time || /^\d{2}:\d{2}$/.test(e.time)) ? `<input class="form-input" type="time" value="${_escHtml(e.time||'')}" oninput="STATE.event.time=this.value;saveToStorage()"/>`
              : `<input class="form-input" value="${_escHtml(e.time)}" placeholder="e.g. 3:00 PM" oninput="STATE.event.time=this.value;saveToStorage()"/>`}
          </div>
        </div>
        <div class="form-row det-pair">
          <div class="form-group">
            <label class="form-label">Estimated guests</label>
            <input class="form-input" type="number" min="0" step="1" inputmode="numeric" value="${Number(e.guestCount)>0?Number(e.guestCount):''}" placeholder="e.g. 120" oninput="STATE.event.guestCount=Math.max(0,parseInt(this.value,10)||0);saveToStorage()"/>
            <div style="font-size:11.5px;color:var(--muted);margin-top:4px">Pre-fills new per-head budget items.</div>
          </div>
          <div class="form-group">
            <label class="form-label">Formality</label>
            <select class="form-input" onchange="STATE.event.formality=this.value;saveToStorage()">
              <option value="" ${!e.formality?'selected':''}>—</option>
              ${EV_FORMALITY.map(f=>`<option value="${f}" ${e.formality===f?'selected':''}>${f}</option>`).join('')}
            </select>
            <div style="font-size:11.5px;color:var(--muted);margin-top:4px">Also on Inspiration → Our style.</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Partner Titles</label>
          <button type="button" class="partner-titles-btn" onclick="openPartnerTitles()" style="display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:8px;border:.5px solid var(--border);background:var(--surface);color:var(--ink);font-size:13px;cursor:pointer;width:fit-content;transition:all .15s">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Partner Titles
          </button>
        </div>
        <div class="form-group" id="details-email-group">
          ${(()=>{
            const loginEmail=(typeof _sbSession!=='undefined'&&_sbSession&&_sbSession.user&&_sbSession.user.email||'').trim();
            if(loginEmail&&!STATE.settings.userEmail){STATE.settings.userEmail=loginEmail;saveToStorage();}
            const stored=(STATE.settings.userEmail||'').trim();
            const synced=loginEmail&&stored&&stored.toLowerCase()===loginEmail.toLowerCase();
            const differs=loginEmail&&stored&&!synced;
            return `<label class="form-label">Your email</label>
          <input class="form-input" type="email" inputmode="email" id="details-user-email" placeholder="you@email.com" value="${_escHtml(stored)}" oninput="_detailsUserEmailChange(this)"/>
          <div id="details-email-note" style="font-size:11.5px;margin-top:4px">${synced?`<span style="color:var(--green)">✓ Synced from your login account.</span>`:differs?`<span style="color:var(--gold-deep)">⚠ Different from your login email (${_escHtml(loginEmail)}). RSVP replies and appointment emails go to this address.</span>`:`<span style="color:var(--muted)">Used when emailing appointments to yourself.</span>`}</div>`;
          })()}
        </div>
        <div class="form-group">
          <label class="form-label">Partner's email</label>
          <input class="form-input" type="email" inputmode="email" id="details-partner-email" placeholder="partner@email.com" value="${_escHtml(STATE.settings.partnerEmail||'')}" oninput="_detailsPartnerEmailChange(this)"/>
          <div style="font-size:11.5px;color:var(--muted);margin-top:4px">Quick-add your partner when emailing appointments, RSVPs, and reminders.</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding-top:4px">
          <button class="btn btn-primary" onclick="saveDetailsAndConfirm(this)">Save Details</button>
          <span id="details-saved-msg" style="font-size:12.5px;color:var(--green);opacity:0;transition:opacity .3s"></span>
        </div>
      </div>
    </div>
    </div>
    <div>
      <div class="section-eyebrow cer-eyebrow-spacer" style="margin-bottom:8px;visibility:hidden" aria-hidden="true">Your Event</div>
    ${anyCer ? `
      <div class="section-title" style="margin-bottom:24px">Ceremony details</div>
      <div class="card">
        <div style="display:flex;flex-direction:column;gap:12px">
          ${cerFields.join('')}
        </div>
        <button class="btn btn-outline btn-sm" onclick="_saveCeremonyDetails()" style="margin-top:12px;display:inline-flex;align-items:center;gap:5px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Save ceremony details</button>
        <span id="ven-cer-saved" style="font-size:11.5px;color:var(--green);margin-left:10px;display:none">Saved.</span>
      </div>` : ''}
      <div class="section-title" style="margin:${anyCer?'28px':'0'} 0 24px">Venues</div>
      <div class="card"><div id="det-venues">${_detVenuesInner()}</div></div>
    </div>
  </div>

  <div class="section-eyebrow" style="margin-bottom:8px;margin-top:8px">Additional</div>
  <div class="section-title" style="margin-bottom:16px">Events</div>
  <div class="card" style="max-width:640px">
    <div onclick="navigate('events')" style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--surface);border:.5px solid #E3D7C4;border-radius:10px;padding:12px 14px;cursor:pointer;margin-bottom:6px">
      <div><div style="font-size:13px;font-weight:600;color:var(--ink)">Manage events</div><div style="font-size:11.5px;color:var(--muted);margin-top:1px">Add or edit events, each with their own guest list &amp; RSVPs</div></div>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
    ${eventsHtml}
  </div>`;
  // Live-update the "+ Add" button while typing a custom (Other) officiant/venue.
  const oOff=document.getElementById('ven-officiant-other'); if(oOff) oOff.addEventListener('input',()=>_cerRefreshLink('officiant','ven-officiant'));

}

function _detOptsMenuHtml(){
  const checked=!STATE.settings.hideCeremonyDetails;
  return `<div id="det-opts-menu" style="display:none;position:absolute;top:calc(100% + 6px);right:0;z-index:60;background:var(--cream);border:1px solid var(--border);border-radius:10px;padding:10px 14px;min-width:220px;box-shadow:0 4px 18px rgba(0,0,0,.13)"><div class="dark-toggle-row" style="gap:14px;margin:0"><div style="font-size:13px;font-weight:500">Ceremony Details</div><label class="toggle-switch"><input type="checkbox" ${checked?'checked':''} onchange="STATE.settings.hideCeremonyDetails=!this.checked;saveToStorage();navigate('details')"/><div class="toggle-track"></div></label></div></div>`;
}
let _detOptOpen=false;
function _openDetOptsMenu(e){
  e.stopPropagation();
  const m=document.getElementById('det-opts-menu');
  if(!m) return;
  _detOptOpen=!_detOptOpen;
  m.style.display=_detOptOpen?'block':'none';
  if(_detOptOpen) setTimeout(()=>document.addEventListener('click',_closeDetOptsMenu,{once:true}),0);
}
function _closeDetOptsMenu(){
  _detOptOpen=false;
  const m=document.getElementById('det-opts-menu');
  if(m) m.style.display='none';
}

function openPartnerTitles(){
  const s=STATE.settings;
  const titles=['Partner','Bride','Groom','Spouse','Fiancé','Fiancée','Husband','Wife','Person 1','Person 2'];
  const sel=(which,cur)=>{
    const isCustom = cur && !titles.includes(cur);
    const opts = titles.map(t=>`<option value="${_escHtml(t)}" ${cur===t?'selected':''}>${_escHtml(t)}</option>`).join('');
    // A saved custom title appears as its own selected option (so it persists in the list).
    const customOpt = isCustom ? `<option value="${_escHtml(cur)}" selected>${_escHtml(cur)}</option>` : '';
    return `
    <div style="position:relative">
      <select id="pt-sel-${which}" class="form-input" style="appearance:none;-webkit-appearance:none;padding-right:34px" onchange="_partnerTitleChange(${which})">
        ${opts}
        ${customOpt}
        <option value="__custom__">Custom…</option>
      </select>
      <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted);display:flex;align-items:center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </span>
    </div>
    <input id="pt-other-${which}" class="form-input" placeholder="Type your own" value="" style="margin-top:6px;display:none" oninput="_partnerTitleCustomInput(${which})"/>`;
  };
  const body=`
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px">Choose how each partner is referred to throughout the app.</div>
    <div class="form-group" style="margin-bottom:14px">
      <label class="form-label">${STATE.event.partner1||'Partner 1'}</label>
      ${sel(1,s.partner1Title)}
    </div>
    <div class="form-group">
      <label class="form-label">${STATE.event.partner2||'Partner 2'}</label>
      ${sel(2,s.partner2Title)}
    </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="closeModalDirect();if(_currentPage==='details')navigate('details')">Close</button>`;
  openModal('Partner Titles', body, footer);
}
function _setPartnerTitle(which, val, rerender=true){
  STATE.settings['partner'+which+'Title']=val;
  STATE.event['title'+which]=val;
  saveToStorage();
  if(rerender && _currentPage==='details') navigate('details');
}
function _partnerTitleChange(which){
  const selEl=document.getElementById('pt-sel-'+which), oth=document.getElementById('pt-other-'+which);
  if(!selEl) return;
  if(selEl.value==='__custom__'){
    if(oth){ oth.style.display='block'; oth.value=''; oth.focus(); }
    // Don't commit yet — wait for the user to type a custom value.
    return;
  }
  if(oth) oth.style.display='none';
  _setPartnerTitle(which, selEl.value);
}
function _partnerTitleCustomInput(which){
  const oth=document.getElementById('pt-other-'+which);
  const v=(oth?.value||'').trim();
  // Save live but DON'T re-render the details page (that would tear down this modal
  // on every keystroke); the details page picks up the new title when the modal closes.
  if(v) _setPartnerTitle(which, v, false);
}

// (Legacy Details-page event functions removed — superseded by the Events section.
//  openEventForm / saveEvent / deleteEvent / confirmDeleteEvent now live in the
//  Events module further down. Old data is migrated on load.)

function _detailsUserEmailChange(el){
  STATE.settings.userEmail=el.value.trim(); saveToStorage();
  const loginEmail=(typeof _sbSession!=='undefined'&&_sbSession&&_sbSession.user&&_sbSession.user.email||'').trim();
  const stored=STATE.settings.userEmail;
  const note=document.getElementById('details-email-note'); if(!note) return;
  if(!loginEmail){ note.innerHTML=`<span style="color:var(--muted)">Used when emailing appointments to yourself.</span>`; return; }
  if(!stored||stored.toLowerCase()===loginEmail.toLowerCase()) note.innerHTML=`<span style="color:var(--green)">✓ Synced from your login account.</span>`;
  else note.innerHTML=`<span style="color:var(--gold-deep)">⚠ Different from your login email (${_escHtml(loginEmail)}). RSVP replies and appointment emails go to this address.</span>`;
}
function _detailsPartnerEmailChange(el){ STATE.settings.partnerEmail=el.value.trim(); saveToStorage(); }

function saveDetailsAndConfirm(btn){
  saveToStorage();
  updateTopbarSub();
  const msg=document.getElementById('details-saved-msg');
  if(msg){
    msg.textContent='Saved';
    msg.style.opacity='1';
    setTimeout(()=>{ msg.style.opacity='0'; }, 2000);
  }
}

// ══════════════════════════════════════════════

// ══════════════════════════════════════════════
// VENUES & ROOMS / SPACES
// ══════════════════════════════════════════════
// STATE.event holds:
//   venueMode            'same' (one venue for the day) | 'different' (separate ceremony venue)
//   venue / venueAddress the reception venue, or THE venue when it's all in one place
//   ceremonyVenue / ceremonyVenueAddress   the ceremony venue's real name (different venues only)
//   ceremonySetting      the kind of setting imagined for the ceremony (Garden, Church…)
//   spaces               [{id, part:'ceremony'|'cocktail'|'reception'|'other', name}]
// Spaces are the rooms within a venue ("Courtyard Garden", "Rosewood Room"); they are the
// locations offered in the Timeline and shown on the website, run sheet and vendor brief.
const EV_FORMALITY=['Relaxed','Smart Casual','Semi-Formal','Black Tie'];
const EV_SETTINGS=['Indoor only','Outdoor only','Both','Destination'];
const EV_VIBES=['Romantic','Rustic','Boho','Elegant','Garden Party','Modern Minimalist','Vintage','Beach / Coastal','Whimsical','Classic','Industrial','Luxe'];
const EV_SPACE_PARTS=[
  {part:'ceremony',  label:'Ceremony',      ph:'e.g. Courtyard Garden'},
  {part:'cocktail',  label:'Cocktail hour', ph:'e.g. Terrace'},
  {part:'reception', label:'Reception',     ph:'e.g. Ballroom'}
];
// Older accounts: "Ceremony venue" was a dropdown of venue TYPES (Church, Garden…).
// A type moves to ceremonySetting; anything typed in ("Other…") is a real venue name.
function _evNormalize(ev){
  ev = ev || STATE.event; if(!ev) return ev;
  if(!Array.isArray(ev.spaces)) ev.spaces=[];
  const types = (typeof CEREMONY_VENUE_OPTIONS!=='undefined') ? CEREMONY_VENUE_OPTIONS : [];
  if(ev.ceremonyVenue && types.includes(ev.ceremonyVenue)){
    if(!ev.ceremonySetting) ev.ceremonySetting = ev.ceremonyVenue;
    ev.ceremonyVenue = '';
  }
  if(ev.venueMode!=='same' && ev.venueMode!=='different') ev.venueMode = ev.ceremonyVenue ? 'different' : 'same';
  return ev;
}
function _evDiff(ev){ ev=ev||STATE.event||{}; return ev.venueMode==='different'; }
function _evSpace(part, ev){
  ev=ev||STATE.event||{};
  const s=(Array.isArray(ev.spaces)?ev.spaces:[]).find(x=>x&&x.part===part);
  return s ? String(s.name||'').trim() : '';
}
// The venue each part of the day is at — cocktail hour follows the reception.
function _evPartVenue(part, ev){
  ev=ev||STATE.event||{};
  if(part==='ceremony' && _evDiff(ev)) return String(ev.ceremonyVenue||'').trim();
  return String(ev.venue||'').trim();
}
function _evPartAddress(part, ev){
  ev=ev||STATE.event||{};
  if(part==='ceremony' && _evDiff(ev)) return String(ev.ceremonyVenueAddress||'').trim();
  return String(ev.venueAddress||'').trim();
}
// "Courtyard Garden, Stonefields Estate" — whichever of space / venue are set.
function _evPlace(part, ev){ return [_evSpace(part,ev), _evPartVenue(part,ev)].filter(Boolean).join(', '); }
// Short "where": the venue, or "Ceremony venue & Reception venue".
function _evVenueLine(ev){
  ev=ev||STATE.event||{};
  const r=String(ev.venue||'').trim();
  if(!_evDiff(ev)) return r;
  const c=String(ev.ceremonyVenue||'').trim();
  return [c,r].filter(Boolean).join(' & ');
}
// Timeline location choices: every named space, then the venue(s).
function _evLocationOptions(ev){
  ev=ev||STATE.event||{};
  const out=[]; const add=n=>{ n=String(n||'').trim(); if(n && !out.includes(n)) out.push(n); };
  (Array.isArray(ev.spaces)?ev.spaces:[]).forEach(s=>add(s&&s.name));
  if(_evDiff(ev)) add(ev.ceremonyVenue);
  add(ev.venue);
  return out;
}

// Shared "Rooms & spaces" block (wizard + Event Details). o = {
//   spaces, open, venueOf(part)→name, inputCls, ns (handler prefix, e.g. 'wzSp' / '_detSp') }
// Handlers called: <ns>Toggle(), <ns>Set(key,value), <ns>Rename(key,input), <ns>Add(), <ns>Del(id)
function _evSpacesBlockHtml(o){
  const sp=Array.isArray(o.spaces)?o.spaces:[];
  const named=sp.filter(s=>s&&String(s.name||'').trim()).map(s=>String(s.name).trim());
  const summary = o.open ? 'Ceremony, cocktail hour, reception — and any others'
    : (named.length ? named.join(' · ') : 'e.g. Courtyard Garden, Library Bar, Rosewood Room');
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const row=(key,label,sub,val,ph,del,part)=>`<div class="uv-sp-row">
      <div class="uv-sp-lbl">${esc(label)}<small data-part="${part}">${esc(sub)}</small></div>
      <input class="${o.inputCls}" value="${esc(val)}" placeholder="${esc(ph)}" maxlength="80"
        onfocus="this.dataset.old=this.value" oninput="${o.ns}Set('${key}',this.value)" onchange="${o.ns}Rename('${key}',this)">
      ${del?`<button type="button" class="uv-sp-del" onclick="${o.ns}Del('${key}')" title="Remove" aria-label="Remove space">&times;</button>`:'<span></span>'}
    </div>`;
  const body = o.open ? `<div class="uv-sp-body">
      ${EV_SPACE_PARTS.map(p=>{ const s=sp.find(x=>x&&x.part===p.part); return row(p.part,p.label,o.venueOf(p.part),s?s.name:'',p.ph,false,p.part); }).join('')}
      ${sp.filter(s=>s&&s.part==='other').map(s=>row(s.id,'Other space',o.venueOf('reception'),s.name,'e.g. Bridal Suite',true,'reception')).join('')}
      <button type="button" class="uv-sp-add" onclick="${o.ns}Add()">+ Add another space</button>
      <div class="uv-sp-hint">Used as locations in your Timeline, and shown on your website, run sheet and vendor briefs.</div>
    </div>` : '';
  return `<div class="uv-sp${o.open?' open':''}">
    <button type="button" class="uv-sp-head" onclick="${o.ns}Toggle()" aria-expanded="${o.open?'true':'false'}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="12" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
      <span class="uv-sp-title"><b>Rooms &amp; spaces</b> <i>(optional)</i><small>${esc(summary)}</small></span>
      <span class="uv-sp-chev">${o.open?'Hide':(named.length?'Edit':'Add')} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="${o.open?'18 15 12 9 6 15':'6 9 12 15 18 9'}"/></svg></span>
    </button>${body}
  </div>`;
}
// Update a spaces array in place: key is a part ('ceremony'…) or an 'other' space's id.
function _evSpacesSet(arr, key, value){
  const v=String(value||'').slice(0,80);
  let s=arr.find(x=>x&&(x.part===key&&key!=='other'||x.id===key));
  if(!s){ if(!EV_SPACE_PARTS.some(p=>p.part===key)) return; s={id:uid(), part:key, name:''}; arr.push(s); }
  s.name=v;
}
// A space was renamed: Timeline moments using the old name follow it.
function _evRenameTimelineLocation(oldName, newName){
  oldName=String(oldName||'').trim(); newName=String(newName||'').trim();
  if(!oldName || !newName || oldName===newName) return 0;
  let n=0; const seen=new Set();
  const lists=[STATE.timeline].concat((STATE.timelines||[]).map(t=>t&&t.items));
  lists.forEach(items=>(Array.isArray(items)?items:[]).forEach(it=>{
    if(!it || seen.has(it)) return; seen.add(it);
    if(String(it.location||'').trim()===oldName){ it.location=newName; n++; }
  }));
  return n;
}

// Event Details handlers
let _detSpOpen=false;
function _detSpToggle(){ _detSpOpen=!_detSpOpen; _detRenderVenues(); }
function _detSpSet(key, value){ _evNormalize(); _evSpacesSet(STATE.event.spaces, key, value); saveToStorage(); }
function _detSpRename(key, input){
  const n=_evRenameTimelineLocation(input.dataset.old, input.value);
  input.dataset.old=input.value;
  if(n){ saveToStorage(); if(typeof _showInfoToast==='function') _showInfoToast(`Updated ${n} Timeline moment${n===1?'':'s'}.`, null, null); }
}
function _detSpAdd(){ _evNormalize(); STATE.event.spaces.push({id:uid(), part:'other', name:''}); saveToStorage(); _detSpOpen=true; _detRenderVenues(); }
function _detSpDel(id){ _evNormalize(); STATE.event.spaces=STATE.event.spaces.filter(s=>s.id!==id); saveToStorage(); _detRenderVenues(); }
function _detSetVenueMode(mode){ _evNormalize(); STATE.event.venueMode=mode; saveToStorage(); _detRenderVenues(); }
function _detVenueField(key, el){
  _evNormalize();
  STATE.event[key]=el.value;
  saveToStorage();
  if(key==='ceremonyVenue' && typeof _cerRefreshLink==='function') _cerRefreshLink('venue','ven-cervenue',true);
  // Keep each space's "at <venue>" caption in step, without redrawing the inputs.
  document.querySelectorAll('#det-venues .uv-sp-lbl small[data-part]').forEach(sm=>{ sm.textContent=_detVenueOf(sm.dataset.part); });
}
function _detVenueOf(part){
  const diff=_evDiff();
  return _evPartVenue(part)||(part==='ceremony'&&diff?'Ceremony venue':diff?'Reception venue':'Your venue');
}
function _detVenuesInner(){
  const ev=_evNormalize();
  const diff=_evDiff(ev);
  const esc=_escHtml;
  const venueOf=_detVenueOf;
  return `
    <label class="form-label">Ceremony &amp; reception</label>
    <div class="uv-seg" role="group" aria-label="Ceremony and reception venues">
      <button type="button" class="${diff?'':'on'}" onclick="_detSetVenueMode('same')">Same venue</button>
      <button type="button" class="${diff?'on':''}" onclick="_detSetVenueMode('different')">Different venues</button>
    </div>
    ${diff?`
    <div class="form-group" style="margin-top:14px">
      <label class="form-label">Ceremony venue</label>
      <input class="form-input" id="ven-cervenue" value="${esc(ev.ceremonyVenue||'')}" placeholder="e.g. St Paul's Cathedral" oninput="_detVenueField('ceremonyVenue',this)"/>
      ${typeof _cerLinkHtml==='function'?_cerLinkHtml('venue', ev.ceremonyVenue, ev.venueVendorId):''}
    </div>
    <div class="form-group" style="margin-top:10px">
      <label class="form-label">Ceremony venue address</label>
      <input class="form-input" value="${esc(ev.ceremonyVenueAddress||'')}" placeholder="Street, suburb, state" oninput="_detVenueField('ceremonyVenueAddress',this)"/>
    </div>`:''}
    <div class="form-group" style="margin-top:14px">
      <label class="form-label">${diff?'Reception venue':'Venue name'}</label>
      <input class="form-input" value="${esc(ev.venue||'')}" placeholder="${diff?'e.g. The Grand Pavilion':'Venue name'}" oninput="_detVenueField('venue',this)"/>
    </div>
    <div class="form-group" style="margin-top:10px">
      <label class="form-label">${diff?'Reception venue address':'Venue address'}</label>
      <input class="form-input" value="${esc(ev.venueAddress||'')}" placeholder="Street, suburb, state" oninput="_detVenueField('venueAddress',this)"/>
    </div>
    <div style="margin-top:14px">${_evSpacesBlockHtml({spaces:ev.spaces, open:_detSpOpen, venueOf, inputCls:'form-input', ns:'_detSp'})}</div>`;
}
function _detRenderVenues(){
  const host=document.getElementById('det-venues'); if(!host) return;
  host.innerHTML=_detVenuesInner();
}
