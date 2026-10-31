// GUEST LIST
// ══════════════════════════════════════════════
let reorderMode=false;
// Guest List view mode: 'list' (table) is the new default; 'card' shows the card list.
// Persisted across sessions; defaults to 'list' on first visit, then remembers last choice.
let guestListView=(()=>{
  try{ const v=localStorage.getItem('eternal_guest_list_view'); return (v==='card'||v==='list')?v:'list'; }
  catch(e){ return 'list'; }
})();
function setGuestListView(v){
  guestListView=(v==='card')?'card':'list';
  try{ localStorage.setItem('eternal_guest_list_view', guestListView); }catch(e){}
  if(guestListView==='card'){ bulkMode=false; reorderMode=false; bulkSelected.clear(); }
  _guestHideMenuOpen=false;
  navigate('guests');
}
// Invites view: 'detailed' (full cards) or 'simple' (compact rows); simple sub-mode 'list' or 'grouped'
let inviteViewMode='simple'; // Detailed view retired — Invites always uses Simple
let inviteSimpleGroup=(()=>{ try{ return localStorage.getItem('eternal_invite_simple_group')||'list'; }catch(e){ return 'list'; } })();
function setInviteViewMode(m){ inviteViewMode=m; try{localStorage.setItem('eternal_invite_view',m);}catch(e){} navigate('guests'); }
function setInviteSimpleGroup(m){ inviteSimpleGroup=m; try{localStorage.setItem('eternal_invite_simple_group',m);}catch(e){} navigate('guests'); }
// Session-only memory of which Simple-view invite rows are expanded (resets on reload)
let _inviteExpanded=new Set();
function toggleInviteRowExpand(key){
  if(_inviteExpanded.has(key)) _inviteExpanded.delete(key); else _inviteExpanded.add(key);
}
let bulkMode=false;
let bulkSelected=new Set();
let inviteMode=false;
let inviteReturnPage='guests';
let _editGuestReturnPage='guests'; // tracks which page opened the Edit Guest modal
const _HIDDEN_KEY='eternal_hidden_sections';
let _hiddenGuestSections=(()=>{
  try{ const s=localStorage.getItem(_HIDDEN_KEY); return s?new Set(JSON.parse(s)):new Set(); }
  catch(e){ return new Set(); }
})();
// Group filters and Groups count default to hidden until the user unhides them
(()=>{
  const DEFAULTS=['g_singles','g_couples','g_families','groups'];
  try{
    if(localStorage.getItem('eternal_group_filters_seeded')!=='2'){
      DEFAULTS.forEach(k=>_hiddenGuestSections.add(k));
      localStorage.setItem(_HIDDEN_KEY, JSON.stringify([..._hiddenGuestSections]));
      localStorage.setItem('eternal_group_filters_seeded','2');
    }
  }catch(e){ DEFAULTS.forEach(k=>_hiddenGuestSections.add(k)); }
})();
// Guest card fields: Phone/Email/Address hidden by default; Role/Tags/Dietary shown
(()=>{
  try{
    if(localStorage.getItem('eternal_guest_fields_seeded')!=='1'){
      ['gf_phone','gf_email','gf_address'].forEach(k=>_hiddenGuestSections.add(k));
      localStorage.setItem(_HIDDEN_KEY, JSON.stringify([..._hiddenGuestSections]));
      localStorage.setItem('eternal_guest_fields_seeded','1');
    }
  }catch(e){ ['gf_phone','gf_email','gf_address'].forEach(k=>_hiddenGuestSections.add(k)); }
})();

// Combined search+counts bar: collapsed by default, remembers its state
let guestPanelExpanded=(()=>{
  try{ return localStorage.getItem('eternal_guest_panel_expanded')==='1'; }
  catch(e){ return false; }
})();
function toggleGuestPanel(focusSearch){
  guestPanelExpanded=!guestPanelExpanded;
  try{ localStorage.setItem('eternal_guest_panel_expanded', guestPanelExpanded?'1':'0'); }catch(e){}
  navigate('guests');
  if(guestPanelExpanded&&focusSearch){ setTimeout(()=>{ const el=document.getElementById('guest-search-input'); if(el)el.focus(); },60); }
}
function expandGuestPanelForSearch(){
  if(!guestPanelExpanded){ toggleGuestPanel(true); }
  else { const el=document.getElementById('guest-search-input'); if(el)el.focus(); }
}

function toggleBulkMode(){
  bulkMode=!bulkMode;
  if(!bulkMode){ bulkSelected.clear(); reorderMode=false; }
  _guestHideMenuOpen=false;
  navigate('guests');
}
function toggleGroupSelect(ids){
  const allSelected=ids.every(id=>bulkSelected.has(id));
  if(allSelected){ ids.forEach(id=>bulkSelected.delete(id)); }
  else { ids.forEach(id=>bulkSelected.add(id)); }
  renderGuestList();
  updateBulkBar();
}
function toggleBulkSelect(id){
  if(bulkSelected.has(id)) bulkSelected.delete(id);
  else bulkSelected.add(id);
  renderGuestList();
  updateBulkBar();
}
function bulkSelectAll(){
  // Compute every visible guest id from the data model (DOM can't hold duplicate data-bulk-id on group rows)
  const visibleIds=STATE.guests.filter(guestPassesFilter).map(g=>g.id);
  const allSelected=visibleIds.length>0 && visibleIds.every(id=>bulkSelected.has(id));
  if(allSelected) visibleIds.forEach(id=>bulkSelected.delete(id));
  else visibleIds.forEach(id=>bulkSelected.add(id));
  renderGuestList();
  updateBulkBar();
}
function updateBulkBar(){
  const bar=document.getElementById('bulk-action-bar');
  const countEl=document.getElementById('bulk-count');
  const linkBtn=document.getElementById('bulk-link-btn');
  const familyBtn=document.getElementById('bulk-family-btn');
  if(bar) bar.style.display=bulkSelected.size>0?'flex':'none';
  if(countEl) countEl.textContent=`${bulkSelected.size} selected`;
  if(linkBtn){
    const exactly2=bulkSelected.size===2;
    linkBtn.style.display=exactly2?'inline-flex':'none';
    if(exactly2){
      const _bids=[...bulkSelected];
      const _bg1=STATE.guests.find(x=>x.id===_bids[0]), _bg2=STATE.guests.find(x=>x.id===_bids[1]);
      const _alreadyLinked=_bg1&&_bg2&&_bg1.coupleId===_bg2.id;
      const _lbl=linkBtn.querySelector('.gbtn-label');
      if(_lbl) _lbl.textContent=_alreadyLinked?'Unlink Couple':'Link as Couple';
      linkBtn.title=_alreadyLinked?'Unlink Couple':'Link as Couple';
    }
  }
  if(familyBtn){ familyBtn.style.display=bulkSelected.size>=2?'inline-flex':'none'; }
  // Context-aware list buttons: hide the list a selection already belongs to.
  // All A-list → hide "A Primary List"; all B-list → hide "B List"; mixed → show both.
  const listAbtn=document.getElementById('bulk-listA-btn');
  const listBbtn=document.getElementById('bulk-listB-btn');
  if(listAbtn&&listBbtn){
    const sel=[...bulkSelected].map(id=>STATE.guests.find(g=>g.id===id)).filter(Boolean);
    const hasA=sel.some(g=>(g.listType||'A')==='A');
    const hasB=sel.some(g=>(g.listType||'A')==='B');
    // Show "A Primary List" only if some selected guest is NOT already on A (i.e. some B present)
    listAbtn.style.display=hasB?'inline-flex':'none';
    // Show "B List" only if some selected guest is NOT already on B (i.e. some A present)
    listBbtn.style.display=hasA?'inline-flex':'none';
  }
  // The bulk bars' visible contents just changed (action bar shown/hidden, link &
  // list buttons toggled), so re-measure to collapse/expand labels as needed.
  if(typeof _fitGuestBtns==='function') requestAnimationFrame(_fitGuestBtns);
}

function bulkLinkCouple(){
  const ids=[...bulkSelected];
  if(ids.length!==2){ alert('Please select exactly 2 guests to link as a couple.'); return; }
  const [g1,g2]=[STATE.guests.find(x=>x.id===ids[0]), STATE.guests.find(x=>x.id===ids[1])];
  if(!g1||!g2) return;
  openModal('Link as Couple',`
    <div style="text-align:center;padding:8px 0">
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;margin-bottom:12px;color:var(--ink)">Link as a couple?</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:12px">
        <div style="background:var(--parchment);border-radius:10px;padding:10px 16px;font-size:14px;font-weight:500;color:var(--ink)">${g1.name}</div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/></svg>
        <div style="background:var(--parchment);border-radius:10px;padding:10px 16px;font-size:14px;font-weight:500;color:var(--ink)">${g2.name}</div>
      </div>
      <div style="font-size:13px;color:var(--muted);line-height:1.5">They'll be grouped together on the guest list as a couple.</div>
      ${(g1.coupleId||g2.coupleId)?`<div style="font-size:12px;color:var(--red-deep);margin-top:8px;background:rgba(180,60,60,.07);border-radius:6px;padding:6px 10px">Note: one or both guests already have a partner linked. Their existing link will be removed.</div>`:''}
    </div>`,
    `<button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-primary" onclick="confirmBulkLinkCouple('${ids[0]}','${ids[1]}')">Link as Couple</button>`);
}

function confirmBulkLinkCouple(id1,id2){
  const g1=STATE.guests.find(x=>x.id===id1);
  const g2=STATE.guests.find(x=>x.id===id2);
  if(!g1||!g2){ closeModalDirect(); return; }
  // Unlink any existing partners
  [g1,g2].forEach(g=>{
    if(g.coupleId){ const old=STATE.guests.find(x=>x.id===g.coupleId); _preservePairInvite(g.id, g.coupleId); if(old){ old.coupleId=null; old.plusOneId=null; } }
    if(g.plusOneId){ const old=STATE.guests.find(x=>x.id===g.plusOneId); _preservePairInvite(g.id, g.plusOneId); if(old){ old.coupleId=null; old.plusOneId=null; } }
    g.coupleId=null; g.plusOneId=null;
  });
  // Link them — preserve any existing role rather than overwriting with 'Couple'
  g1.coupleId=g2.id; if(!g1.relationship||g1.relationship==='Guest') g1.relationship='Couple';
  g2.coupleId=g1.id; if(!g2.relationship||g2.relationship==='Guest') g2.relationship='Couple';
  bulkSelected.clear();
  saveToStorage(); closeModalDirect(); navigate('guests');
}
function bulkLinkOrUnlink(){
  const ids=[...bulkSelected];
  if(ids.length!==2) return;
  const g1=STATE.guests.find(x=>x.id===ids[0]), g2=STATE.guests.find(x=>x.id===ids[1]);
  if(g1&&g2&&g1.coupleId===g2.id) bulkUnlinkCouple();
  else bulkLinkCouple();
}
function bulkUnlinkCouple(){
  const ids=[...bulkSelected];
  if(ids.length!==2){ alert('Please select exactly 2 guests.'); return; }
  const [g1,g2]=[STATE.guests.find(x=>x.id===ids[0]), STATE.guests.find(x=>x.id===ids[1])];
  if(!g1||!g2||g1.coupleId!==g2.id){ alert('Those guests are not linked as a couple.'); return; }
  openModal('Unlink Couple',`
    <div style="text-align:center;padding:8px 0">
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;margin-bottom:12px;color:var(--ink)">Unlink this couple?</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:12px">
        <div style="background:var(--parchment);border-radius:10px;padding:10px 16px;font-size:14px;font-weight:500;color:var(--ink)">${_escHtml(g1.name)}</div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="12" r="4"/><line x1="14" y1="12" x2="16" y2="12" stroke-dasharray="2 2"/><circle cx="16" cy="12" r="4"/></svg>
        <div style="background:var(--parchment);border-radius:10px;padding:10px 16px;font-size:14px;font-weight:500;color:var(--ink)">${_escHtml(g2.name)}</div>
      </div>
      <div style="font-size:13px;color:var(--muted);line-height:1.5">They'll each appear as individual guests on the list.</div>
    </div>`,
    `<button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-primary" onclick="confirmBulkUnlinkCouple('${ids[0]}','${ids[1]}')">Unlink</button>`);
}
function confirmBulkUnlinkCouple(id1,id2){
  const g1=STATE.guests.find(x=>x.id===id1);
  const g2=STATE.guests.find(x=>x.id===id2);
  if(!g1||!g2){ closeModalDirect(); return; }
  _preservePairInvite(g1.id, g2.id);
  g1.coupleId=null; g2.coupleId=null;
  bulkSelected.clear();
  saveToStorage(); closeModalDirect(); navigate('guests');
}
function toggleInviteMode(){
  if(inviteMode){
    inviteMode=false;
    navigate(inviteReturnPage||'guests');
  } else {
    inviteReturnPage='guests';
    inviteMode=true;
    navigate('guests');
  }
}
function openInvitesView(){
  inviteReturnPage='rsvp-mgr';
  inviteMode=true;
  navigate('guests');
}
function showWelcomeScreen(){
  // Legacy: shows setup modal (landing is only for unauthenticated entry)
  _showSetupModal();
}

function isInvited(key){ return (STATE.invites||[]).includes(key); }

function toggleInvite(key){
  if(!STATE.invites) STATE.invites=[];
  const idx=STATE.invites.indexOf(key);
  // Only remove if already checked (user explicitly unchecking); add if not present
  if(idx>=0) STATE.invites.splice(idx,1);
  else STATE.invites.push(key);
  saveToStorage();
  navigate('guests');
}
// Tracker-only variant: mutates STATE.invites + saves, then re-renders the tracker
// in place without navigating (prevents the scroll-to-top jump).
function _trackerToggleInvite(key){
  if(!STATE.invites) STATE.invites=[];
  const idx=STATE.invites.indexOf(key);
  if(idx>=0) STATE.invites.splice(idx,1);
  else STATE.invites.push(key);
  saveToStorage();
  rsvpRerenderList();
}

function checkAllInvites(){
  // Count A-list invites that would be marked sent (B-list-only slots are skipped).
  const slots=buildSlots();
  let total=0;
  slots.forEach(slot=>{
    const slotGuests=slot.ids.map(id=>STATE.guests.find(g=>g.id===id)).filter(Boolean);
    const allBList=slotGuests.length>0&&slotGuests.every(g=>(g.listType||'A')==='B');
    if(!allBList) total++;
  });
  const body=`<div style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;align-items:center;gap:9px">
      <span style="width:26px;height:26px;border-radius:50%;background:rgba(92,143,114,.16);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--green)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      <div style="font-size:13.5px;color:var(--ink);font-weight:500">Mark every A-list invite as sent?</div>
    </div>
    <div style="font-size:12.5px;color:var(--muted);line-height:1.5">This marks all <strong>${total}</strong> invite${total!==1?'s':''} as sent. B-list guests are skipped.</div>
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Cancel</button>
    <button class="btn btn-sm" onclick="_doCheckAllInvites()" style="background:var(--green);color:#fff;border:1px solid var(--green)">Check All</button>`;
  openModal('Mark all invites sent?', body, footer);
}
function _doCheckAllInvites(){
  closeModalDirect();
  if(!STATE.invites) STATE.invites=[];
  const slots=buildSlots();
  slots.forEach(slot=>{
    // Skip any slot that contains only B list guests
    const slotGuests=slot.ids.map(id=>STATE.guests.find(g=>g.id===id)).filter(Boolean);
    const allBList=slotGuests.length>0&&slotGuests.every(g=>(g.listType||'A')==='B');
    if(allBList) return;
    if(!STATE.invites.includes(slot.key)) STATE.invites.push(slot.key);
  });
  saveToStorage(); navigate('guests');
}

function uncheckAllInvites(){
  const total=(STATE.invites||[]).length;
  const body=`<div style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;align-items:center;gap:9px">
      <span style="width:26px;height:26px;border-radius:50%;background:rgba(192,57,43,.14);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--red)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
      <div style="font-size:13.5px;color:var(--ink);font-weight:500">Clear every &ldquo;invite sent&rdquo; mark?</div>
    </div>
    <div style="font-size:12.5px;color:var(--muted);line-height:1.5">This unmarks all <strong>${total}</strong> invite${total!==1?'s':''} currently sent. You can re-check them individually or with Check All.</div>
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Cancel</button>
    <button class="btn btn-sm" onclick="_doUncheckAllInvites()" style="background:var(--red);color:#fff;border:1px solid var(--red)">Uncheck All</button>`;
  openModal('Clear all invites sent?', body, footer);
}
function _doUncheckAllInvites(){
  closeModalDirect();
  STATE.invites=[];
  saveToStorage(); navigate('guests');
}

function inviteCheckbox(key){
  if(!inviteMode) return '';
  // Don't show invite checkbox for B list solo guests
  if(key.startsWith('solo:')){
    const gid=key.slice(5);
    const g=STATE.guests.find(x=>x.id===gid);
    if(g&&(g.listType||'A')==='B') return '';
  }
  const checked=isInvited(key);
  return `<label onclick="event.stopPropagation();toggleInvite('${key}')" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:4px 8px;background:${checked?'rgba(92,143,114,.1)':'var(--surface)'};border:1px solid ${checked?'rgba(92,143,114,.4)':'var(--border)'};border-radius:6px;font-size:11.5px;color:${checked?'var(--green)':'var(--muted)'};white-space:nowrap;user-select:none">
    <div style="width:14px;height:14px;border-radius:3px;border:1.5px solid ${checked?'var(--green)':'var(--border)'};background:${checked?'var(--green)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
      ${checked?'<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':''}
    </div>
    Invite sent
  </label>`;
}

function invitedBadge(key){
  if(inviteMode||!isInvited(key)) return '';
  return `<span style="font-size:9.5px;font-weight:600;padding:2px 6px;border-radius:4px;background:rgba(92,143,114,.12);color:var(--green);letter-spacing:.04em;text-transform:uppercase;flex-shrink:0">Invited</span>`;
}

function bulkSetRsvp(val){
  bulkSelected.forEach(id=>{
    const g=STATE.guests.find(x=>x.id===id);
    if(g){ g.rsvp=val; if(typeof _stampRsvpDate==='function') _stampRsvpDate(g,val); }
  });
  bulkSelected.clear();
  saveToStorage(); navigate('guests');
}
function bulkSetList(val){
  bulkSelected.forEach(id=>{
    const g=STATE.guests.find(x=>x.id===id);
    if(g) g.listType=val;
  });
  saveToStorage(); navigate('guests');
}
function bulkAddTag(){
  const tag=prompt('Tag to add to selected guests:');
  if(!tag||!tag.trim()) return;
  const t=tag.trim();
  bulkSelected.forEach(id=>{
    const g=STATE.guests.find(x=>x.id===id);
    if(g&&!(g.tags||[]).includes(t)){ if(!g.tags)g.tags=[]; g.tags.push(t); }
  });
  saveToStorage(); navigate('guests');
}
function bulkDeleteGuests(){
  if(!bulkSelected.size) return;
  openModal('Delete Guests',`
    <div style="display:flex;flex-direction:column;gap:8px;padding:2px 0">
      <div style="display:flex;align-items:center;gap:11px">
        <span style="width:26px;height:26px;border-radius:50%;background:rgba(192,57,43,.14);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--red)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
        <div style="font-family:'Cormorant Garamond',serif;font-size:22px;color:var(--ink)">Delete ${bulkSelected.size} guest${bulkSelected.size!==1?'s':''}?</div>
      </div>
      <div style="font-size:13px;color:var(--muted);line-height:1.55">This will permanently remove the selected guests. This cannot be undone.</div>
    </div>`,
    `<button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-danger" onclick="confirmBulkDelete()">Delete ${bulkSelected.size}</button>`);
}
function confirmBulkDelete(){
  const idsToDelete=new Set(bulkSelected);
  // Also collect plus-ones of deleted guests
  bulkSelected.forEach(id=>{
    const g=STATE.guests.find(x=>x.id===id);
    if(g?.plusOneId) idsToDelete.add(g.plusOneId);
  });
  // Clear stale links on surviving guests
  STATE.guests.forEach(g=>{
    if(idsToDelete.has(g.coupleId)) g.coupleId=null;
    if(idsToDelete.has(g.plusOneId)) g.plusOneId=null;
  });
  // Clean family groups
  (STATE.families||[]).forEach(f=>{ f.memberIds=f.memberIds.filter(id=>!idsToDelete.has(id)); });
  STATE.families=(STATE.families||[]).filter(f=>f.memberIds.length>0);
  // Clean seating
  Object.keys(STATE.seating).forEach(tid=>{
    STATE.seating[tid]=(STATE.seating[tid]||[]).map(x=>idsToDelete.has(x)?null:x);
  });
  STATE.guests=STATE.guests.filter(g=>!idsToDelete.has(g.id));
  bulkSelected.clear();
  saveToStorage(); closeModalDirect(); navigate('guests');
}

// ══════════════════════════════════════════════
