// EVENT DETAILS
// ══════════════════════════════════════════════
function renderDetails(c, actions){
  const e=STATE.event; const s=STATE.settings;
  actions.innerHTML=`<div id="det-opts-wrap" style="position:relative;display:inline-flex"><button class="btn-icon" id="det-opts-btn" onclick="_openDetOptsMenu(event)" title="Event options" aria-label="Event options" aria-haspopup="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>${_detOptsMenuHtml()}</div>`;

  // Ceremony details (moved here from the Vendors page). Field IDs and save
  // logic are unchanged so the existing handlers keep working.
  const ev=STATE.event||{};
  const cerHide=(s&&s.hideCeremonyDetails);
  const hideRel=cerHide||(s&&s.hideReligion);
  const hideOff=cerHide||(s&&s.hideOfficiant);
  const hideVen=cerHide||(s&&s.hideCeremonyVenue);
  const cerFields=[];
  if(!hideRel) cerFields.push(`<div><label class="form-label">Religion</label>${_otherSelectHtml('ven-religion', RELIGION_OPTIONS, ev.religion||'')}</div>`);
  if(!hideOff) cerFields.push(`<div><label class="form-label">Married by a</label>${_otherSelectHtml('ven-officiant', OFFICIANT_OPTIONS, ev.officiant||'')}${_cerLinkHtml('officiant', ev.officiant, ev.officiantVendorId)}</div>`);
  if(!hideVen) cerFields.push(`<div><label class="form-label">Ceremony venue</label>${_otherSelectHtml('ven-cervenue', CEREMONY_VENUE_OPTIONS, ev.ceremonyVenue||'')}${_cerLinkHtml('venue', ev.ceremonyVenue, ev.venueVendorId)}</div>`);
  const anyCer = !hideRel || !hideOff || !hideVen;
  const cerBlock = anyCer ? `
  <div class="section-eyebrow" style="margin-bottom:8px;margin-top:8px">Your Event</div>
  <div class="section-title" style="margin-bottom:16px">Ceremony details</div>
  <div class="card" style="max-width:640px;margin-bottom:24px">
    <div style="display:flex;flex-direction:column;gap:12px">
      ${cerFields.join('')}
    </div>
    <button class="btn btn-outline btn-sm" onclick="_saveCeremonyDetails()" style="margin-top:12px;display:inline-flex;align-items:center;gap:5px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Save ceremony details</button>
    <span id="ven-cer-saved" style="font-size:11.5px;color:var(--green);margin-left:10px;display:none">Saved.</span>
  </div>` : '';

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
  <div class="details-two-col" style="display:grid;grid-template-columns:${anyCer?'1fr 1fr':'1fr'};gap:24px;margin-bottom:24px;align-items:start">
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
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Wedding Date</label>
            <input class="form-input" type="date" value="${e.date||''}" onchange="onWeddingDateChange(this.value)"/>
          </div>
          <div class="form-group">
            <label class="form-label">Venue Name</label>
            <input class="form-input" value="${e.venue||''}" placeholder="Venue name" oninput="STATE.event.venue=this.value;saveToStorage()"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Venue Address</label>
          <input class="form-input" value="${e.venueAddress||''}" placeholder="Street, suburb, state" oninput="STATE.event.venueAddress=this.value;saveToStorage()"/>
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
    ${anyCer ? `<div>
      <div class="section-eyebrow cer-eyebrow-spacer" style="margin-bottom:8px;visibility:hidden" aria-hidden="true">Your Event</div>
      <div class="section-title" style="margin-bottom:24px">Ceremony details</div>
      <div class="card">
        <div style="display:flex;flex-direction:column;gap:12px">
          ${cerFields.join('')}
        </div>
        <button class="btn btn-outline btn-sm" onclick="_saveCeremonyDetails()" style="margin-top:12px;display:inline-flex;align-items:center;gap:5px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Save ceremony details</button>
        <span id="ven-cer-saved" style="font-size:11.5px;color:var(--green);margin-left:10px;display:none">Saved.</span>
      </div>
    </div>` : ''}
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
  const oVen=document.getElementById('ven-cervenue-other'); if(oVen) oVen.addEventListener('input',()=>_cerRefreshLink('venue','ven-cervenue'));
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
