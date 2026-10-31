// SEATING CHART
// ══════════════════════════════════════════════
let dragSeatId=null, dragFromTable=null;
let dragGroupIds=null; // array of gids when dragging a whole couple/family group
let arrangeTablesMode=false;
let dragTableId=null;

let seatingAttendingOnly=false;

// Remembers the seating toolbar's last collapse decision (full vs icon-only) so each
// re-render can stamp the group with the correct class BEFORE first paint. Without this,
// every navigate('seating') paints full labels then snaps to icons a frame later (the
// fitter runs post-render via rAF) — a visible flicker on every button/toggle click.
let _seatIconsOnly=false;

// Detect "keep apart" violations: flagged pairs at the same table or neighbouring
// tables (adjacent in STATE.tables order). Returns {conflicts:[{a,b,tableIds,kind}], tableHas:Set, chipFlag:Set('tid|gid')}.
function _seatingConflicts(){
  const out={conflicts:[], ignoredConflicts:[], tableHas:new Set(), chipFlag:new Set()};
  const ign=(STATE.settings&&STATE.settings.conflictIgnored)||{};
  const order=STATE.tables.map(t=>t.id);
  const tableOfGuest={};
  order.forEach((tid,idx)=>{ _seatIds(tid).forEach(gid=>{ tableOfGuest[gid]={tid,idx}; }); });
  const seen=new Set();
  STATE.guests.forEach(g=>{
    (g.keepApart||[]).forEach(oid=>{
      const key=[g.id,oid].sort().join('|'); if(seen.has(key)) return; seen.add(key);
      const pa=tableOfGuest[g.id], pb=tableOfGuest[oid];
      if(!pa||!pb) return; // both must be seated
      const o=STATE.guests.find(x=>x.id===oid); if(!o) return;
      let kind=null;
      if(pa.tid===pb.tid) kind='same';
      else if(Math.abs(pa.idx-pb.idx)===1) kind='adjacent';
      if(!kind) return;
      const conf={ a:g, b:o, tableIds:[pa.tid,pb.tid], kind, key };
      if(ign[key]){ out.ignoredConflicts.push(conf); return; } // dismissed → no banner row, no badge
      out.conflicts.push(conf);
      out.tableHas.add(pa.tid); out.tableHas.add(pb.tid);
      out.chipFlag.add(pa.tid+'|'+g.id); out.chipFlag.add(pb.tid+'|'+oid);
    });
  });
  return out;
}
function _seatingConflictBanner(cf){
  if(!cf.conflicts.length) return '';
  const esc=_escHtml;
  const n=cf.conflicts.length;
  const rows=cf.conflicts.map(c=>{
    const ta=STATE.tables.find(t=>t.id===c.tableIds[0]);
    const tb=STATE.tables.find(t=>t.id===c.tableIds[1]);
    const txt = c.kind==='same'
      ? `<b>${esc(c.a.name)}</b> &amp; <b>${esc(c.b.name)}</b> are at the same table (${esc(ta?ta.name:'?')}).`
      : `<b>${esc(c.a.name)}</b> &amp; <b>${esc(c.b.name)}</b> are at neighbouring tables (${esc(ta?ta.name:'?')} &amp; ${esc(tb?tb.name:'?')}).`;
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:8px;background:rgba(192,101,62,.06)">
      <span style="flex:1">${txt}</span>
      <button onclick="event.stopPropagation();_seatIgnoreConflict('${c.key}')" title="Ignore this conflict — hides it from the banner and removes the table markers" style="display:inline-flex;align-items:center;gap:4px;background:none;border:.5px solid rgba(192,101,62,.4);color:var(--red);font-size:11px;font-weight:600;font-family:inherit;border-radius:7px;padding:4px 9px;cursor:pointer;flex-shrink:0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>Ignore</button>
    </div>`;
  }).join('');
  return `<div style="background:rgba(192,101,62,.1);border:.5px solid rgba(192,101,62,.4);color:var(--ink);border-radius:10px;padding:11px 13px;margin-bottom:16px;font-size:12.5px;line-height:1.5">
    <div style="display:flex;gap:9px;align-items:center;margin-bottom:9px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <b>${n} seating conflict${n>1?'s':''}</b>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">${rows}</div>
  </div>`;
}
// Ignore a keep-apart conflict: persist the pair-key, re-render so the banner row +
// both table warning badges drop. The seating cog offers a "Restore ignored conflicts" reset.
function _seatIgnoreConflict(key){
  if(!STATE.settings.conflictIgnored) STATE.settings.conflictIgnored={};
  STATE.settings.conflictIgnored[key]=true;
  saveToStorage();
  navigate('seating');
}
function _seatResetIgnoredConflicts(){
  STATE.settings.conflictIgnored={};
  saveToStorage();
  navigate('seating');
}
// ═══ SPARSE SEATING (v139) ═══════════════════════════════════════════════
// STATE.seating[tid] is a SPARSE array: index === chair number, and a hole
// (null/undefined) is an EMPTY CHAIR that keeps its place.
//
// It used to be DENSE — guests appended, position meaningless. That made two
// things impossible: dropping someone into a specific chair, and holding a
// chair empty. It also made removal DESTRUCTIVE in a way nobody could see:
// .filter() closed the gap, so removing one guest silently slid everyone
// after them up a seat. Harmless when position means nothing. Ruinous the
// moment it does.
//
// EVERY read of an occupancy count must go through _seatCount(), and every
// removal must go through _seatClear() (which writes a hole, never splices).
// A raw .length on STATE.seating[tid] is now a BUG: a lone guest in chair 8
// reports a table as 8/10 full.
function _seatArr(tid){ const a=STATE.seating[tid]; return Array.isArray(a)?a:[]; }
function _seatCount(tid){ let n=0; const a=_seatArr(tid); for(let i=0;i<a.length;i++) if(a[i]) n++; return n; }
function _seatIds(tid){ return _seatArr(tid).filter(Boolean); }
// Remove a guest from a table, LEAVING THE CHAIR EMPTY. Never re-indexes.
function _seatClear(tid,gid){
  const a=_seatArr(tid);
  for(let i=0;i<a.length;i++) if(a[i]===gid) a[i]=null;
  STATE.seating[tid]=a;
}
// Remove a guest from EVERY table (used before seating them somewhere new).
function _seatClearAll(gid){ Object.keys(STATE.seating||{}).forEach(tid=>_seatClear(tid,gid)); }
// Seat a guest at a SPECIFIC chair. Returns false if that chair is taken by
// someone else. Pads the array so the index exists.
function _seatAt(tid,idx,gid){
  const a=_seatArr(tid);
  if(a[idx] && a[idx]!==gid) return false;
  _seatClearAll(gid);
  const b=_seatArr(tid);
  while(b.length<=idx) b.push(null);
  b[idx]=gid;
  STATE.seating[tid]=b;
  return true;
}
// Seat a guest in the FIRST empty chair (the old append behaviour, but
// hole-aware: it now fills a gap rather than stepping over it).
function _seatFirstFree(tid,gid){
  const t=(STATE.tables||[]).find(x=>x.id===tid); if(!t) return false;
  const a=_seatArr(tid);
  for(let i=0;i<t.seats;i++){ if(!a[i]) return _seatAt(tid,i,gid); }
  return false; // table genuinely full
}
// Free chair indices, in order. Length === real remaining capacity.
function _seatFreeIdx(tid){
  const t=(STATE.tables||[]).find(x=>x.id===tid); if(!t) return [];
  const a=_seatArr(tid), out=[];
  for(let i=0;i<t.seats;i++) if(!a[i]) out.push(i);
  return out;
}
// Trailing holes carry no meaning — trim so `seats` shrinking can't strand a guest.
function _seatTrim(tid){
  const a=_seatArr(tid);
  while(a.length && !a[a.length-1]) a.pop();
  STATE.seating[tid]=a;
}

function renderSeating(c,actions){
  if((STATE.settings.seatingLayout||'list')==='floorplan'){ renderSeatingFloor(c,actions); return; }
  actions.innerHTML=`
    <div id="seating-btn-group" class="gbtn-group${_seatIconsOnly?' icons-only':''}" style="display:inline-flex;align-items:center;justify-content:flex-end;gap:5px">
    <button class="btn btn-outline btn-sm gbtn" onclick="openAddTable()" title="Add Table" style="white-space:nowrap;display:inline-flex;align-items:center;gap:5px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      <span class="gbtn-label gbtn-label-long">Add Table</span><span class="gbtn-label gbtn-label-short">+ Table</span>
    </button>
    <button class="btn btn-outline btn-sm gbtn" onclick="openSeatingPrintPreview()" title="Export or print the seating plan — PDF, PNG image, CSV spreadsheet, or send to a printer" style="white-space:nowrap;display:inline-flex;align-items:center;gap:5px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span class="gbtn-label gbtn-label-long">Export</span>
    </button>
      <span id="seat-cog-wrap" style="position:relative;display:inline-flex;align-items:center">
        <button class="btn-icon" onclick="_seatToggleCog(event)" aria-label="Seating display options" title="Display options, arrange &amp; reset">${_seatCogIcon()}</button>
        ${_seatCogMenuHtml(null, 'list')}
      </span>
    </div>
    </div>`;

  const guestPool=seatingAttendingOnly
    ? STATE.guests.filter(g=>g.rsvp==='attending'&&(g.listType||'A')==='A')
    : STATE.guests.filter(g=>g.rsvp!=='declined'&&(g.listType||'A')==='A');
  const allSeated=Object.values(STATE.seating).flat().filter(Boolean);
  const unseated=guestPool.filter(g=>!allSeated.includes(g.id));
  const _cf=_seatingConflicts();
  const _sep=_floorSeparatedCouples();

  c.innerHTML=`
  ${_seatStickyBar('list')}
  ${_unseatedBannerHtml()}
  ${arrangeTablesMode?`<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:10px 12px 10px 14px;background:var(--parchment);border-radius:8px;font-size:13px;color:var(--gold-deep)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l3-3-3-3"/><path d="M19 9l3 3-3 3"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
    <span style="flex:1">Drag tables to reorder them. Click <strong>Done</strong> when finished.</span>
    <button onclick="toggleArrangeTables()" title="Finish arranging" style="display:inline-flex;align-items:center;gap:6px;background:var(--gold-deep);border:none;color:#fff;font-size:12.5px;font-weight:600;font-family:inherit;cursor:pointer;padding:7px 14px;border-radius:8px;flex-shrink:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Done</button>
  </div>`:''}
  ${_seatingConflictBanner(_cf)}
  ${_seatingSeparatedBanner(_sep)}
  <div class="grid-2" style="margin-bottom:20px" id="tables-grid">
    ${STATE.tables.map(t=>`
    <div class="table-card ${arrangeTablesMode?'table-arrange-mode':''}"
      id="tcard-${t.id}"
      ${arrangeTablesMode?`draggable="true" ondragstart="dragTableStart(event,'${t.id}')" ondragover="dragTableOver(event,'${t.id}')" ondrop="dropTable(event,'${t.id}')" ondragleave="dragTableLeave(event,'${t.id}')"`:
      `ondragover="event.preventDefault()" ondrop="dropOnTable(event,'${t.id}')"`}>
      <div class="table-title">
        ${arrangeTablesMode?`<span class="table-drag-handle" style="cursor:grab;color:var(--muted);margin-right:6px;display:flex;align-items:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/></svg></span>`:''}
        <span>${t.name}</span>${_cf.tableHas.has(t.id)?`<span title="Keep-apart conflict at or beside this table" style="display:inline-flex;align-items:center;margin-left:6px;color:var(--red)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>`:''}${_sep.tableHas.has(t.id)?`<span title="A couple or family is split across tables" style="display:inline-flex;align-items:center;margin-left:6px;color:var(--sep-ink)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/></svg></span>`:''}
        <div style="display:flex;align-items:center;gap:8px;margin-left:auto">
          <span style="font-size:11.5px;color:var(--muted)">${_seatCount(t.id)}/${t.seats} seats</span>
          ${!arrangeTablesMode?`<div class="dots-menu">
            <button class="dots-btn" onclick="toggleDots(event,'tdots-${t.id}')">···</button>
            <div class="dots-dropdown hidden" id="tdots-${t.id}">
              <button onclick="closeDots();renameTable('${t.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Rename</button>
              <button onclick="closeDots();editTableSeats('${t.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> Edit Seats</button>
              <button class="danger" onclick="closeDots();deleteTable('${t.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Remove</button>
            </div>
          </div>`:''}
        </div>
      </div>
      ${!arrangeTablesMode?`<div id="seats-${t.id}" style="display:flex;flex-wrap:wrap;min-height:36px">
        ${_seatIds(t.id).map(gid=>{
          const g=STATE.guests.find(x=>x.id===gid); if(!g)return'';
          const isConflict=_cf.chipFlag.has(t.id+'|'+gid);
          const rsvpWarning=seatingAttendingOnly&&g.rsvp!=='attending';
          let chipStyle=rsvpWarning
            ? (g.rsvp==='declined'
                ? 'background:rgba(180,60,60,.13);border:1px solid rgba(180,60,60,.35);color:var(--red-deep)'
                : 'background:rgba(160,130,70,.1);border:1px solid rgba(160,130,70,.35);color:var(--gold-deep)')
            : '';
          if(isConflict) chipStyle='background:rgba(192,101,62,.14);border:1px solid var(--red);color:var(--red)';
          const rsvpBadge=rsvpWarning
            ? `<span style="font-size:9px;font-weight:600;padding:1px 4px;border-radius:3px;margin-left:3px;letter-spacing:.04em;background:${g.rsvp==='declined'?'rgba(180,60,60,.15)':'rgba(160,130,70,.15)'}">${g.rsvp==='declined'?'DECLINED':'AWAITING'}</span>`
            : '';
          return`<span class="seat-chip" draggable="true" ondragstart="dragSeat(event,'${gid}','${t.id}')" style="${chipStyle}">${dietIcons(g.dietary)} ${g.name}${rsvpBadge} <span onclick="removeSeat('${gid}','${t.id}')" style="cursor:pointer;color:var(--muted);margin-left:3px;font-size:11px">×</span></span>`;
        }).join('')}
      </div>`:`<div style="font-size:12px;color:var(--muted);margin-top:6px;padding:6px 0">${_seatCount(t.id)} guest${_seatCount(t.id)!==1?'s':''} seated</div>`}
    </div>`).join('')}
  </div>
  ${!arrangeTablesMode?`<div class="card">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      <div class="section-eyebrow" style="margin-bottom:0">Unassigned Guests</div>
      <div style="position:relative;flex:1;min-width:140px;max-width:260px;margin-left:auto">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="seating-search" class="form-input" placeholder="Search…" style="padding:5px 36px 5px 28px;font-size:12px;height:30px"
          oninput="filterSeatingPool(this.value)"
          onkeydown="if(event.key==='Escape'){this.value='';filterSeatingPool('')}"/>
        <button type="button" onclick="filterSeatingPool('');const _se=document.getElementById('seating-search');if(_se){_se.value='';_se.focus()}" title="Clear" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:0;line-height:0;display:flex;align-items:center"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    </div>
    <div id="seating-pool" ondragover="event.preventDefault()" ondrop="returnToPool(event)" style="min-height:44px;display:flex;flex-wrap:wrap;gap:6px;padding:4px">
      ${_poolGroupsHtml(unseated)}
    </div>
  </div>`:''}`;
  // Collapse the seating action buttons (Arrange/Add/Reset) to icons only when the
  // topbar genuinely lacks room for their labels. Measures the group's natural
  // (labels-shown) width against the topbar's free space (total minus the
  // any topbar siblings), so it stays labelled whenever there's room.
  setTimeout(()=>{ _ensureSeatingBtnObserver(); requestAnimationFrame(_fitSeatingBtns); }, 0);
}
function _fitSeatingBtns(){
  const group=document.getElementById('seating-btn-group');
  const tb=document.getElementById('topbar-actions');
  if(!group||!tb||!group.isConnected) return;
  const header=tb.parentElement; // .topbar
  if(!header) return;
  // Measure the group's natural (labels-shown) width by temporarily un-collapsing it.
  // Doing this every call (rather than caching) is what lets the bar RE-EXPAND when the
  // window widens: the old code cached a width and measured available space against the
  // actions container, which itself shrinks to the collapsed group — a feedback trap that
  // pinned it to icons-only forever once collapsed.
  // Measure the group's natural (labels-shown) width WITHOUT mutating the live group.
  // The old code removed .icons-only to read scrollWidth then re-added it; reading layout
  // in between forced the browser to paint the expanded state for one frame — a visible
  // full→icon snap on every re-render at narrow widths. Instead, measure on an offscreen
  // clone that is always label-shown, leaving the live group untouched.
  const wasIcons=group.classList.contains('icons-only');
  const wasShort=group.classList.contains('short-labels');
  const cs=getComputedStyle(group);
  const gap=parseFloat(cs.columnGap||cs.gap)||8;
  // Measure full-label width
  const cloneFull=group.cloneNode(true);
  cloneFull.classList.remove('icons-only','short-labels');
  cloneFull.removeAttribute('id');
  cloneFull.style.cssText += ';position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;display:inline-flex';
  group.parentElement.appendChild(cloneFull);
  let naturalFull=0; const btnsFull=Array.from(cloneFull.children);
  btnsFull.forEach(b=>naturalFull+=b.scrollWidth);
  naturalFull+=gap*Math.max(0,btnsFull.length-1);
  // Measure short-label width (if any short-label spans exist)
  let naturalShort=naturalFull;
  if(cloneFull.querySelector('.gbtn-label-short')){
    const cloneShort=cloneFull.cloneNode(true);
    cloneShort.classList.add('short-labels');
    group.parentElement.appendChild(cloneShort);
    let sw=0; const bS=Array.from(cloneShort.children);
    bS.forEach(b=>sw+=b.scrollWidth);
    sw+=gap*Math.max(0,bS.length-1);
    naturalShort=sw;
    cloneShort.remove();
  }
  cloneFull.remove();
  // Available width = header inner width minus the toggle button, the title's MINIMUM
  // width (it's flex:1 with min-width:150 and will shrink to give the actions room), and
  // the header gaps/padding. Using min-width (not the title's content width) is what makes
  // this independent of the group's own width — no feedback trap.
  const hcs=getComputedStyle(header);
  const hGap=parseFloat(hcs.columnGap||hcs.gap)||12;
  const padX=(parseFloat(hcs.paddingLeft)||0)+(parseFloat(hcs.paddingRight)||0);
  let used=0, kids=Array.from(header.children);
  kids.forEach(ch=>{
    if(ch===tb) return;
    const mw=parseFloat(getComputedStyle(ch).minWidth)||0;
    // Flexible siblings (the title block) contribute only their min-width; rigid ones
    // (the toggle) contribute their rendered width.
    used+= mw>0 ? mw : ch.getBoundingClientRect().width;
  });
  const free=header.clientWidth - padX - used - hGap*Math.max(0,kids.length-1);
  // 3-tier with hysteresis: full → short-labels → icons-only.
  // Re-expanding from a collapsed state requires 10px more room to avoid flicker.
  const expandMargin=(wasIcons||wasShort)?10:0;
  if(naturalFull<=free-expandMargin+1){
    group.classList.remove('short-labels','icons-only');
    _seatIconsOnly=false;
  } else if(naturalShort<=free+1){
    group.classList.add('short-labels');
    group.classList.remove('icons-only');
    _seatIconsOnly=false;
  } else {
    group.classList.add('icons-only');
    group.classList.remove('short-labels');
    _seatIconsOnly=true;
  }
}
let _seatingBtnRO=null;
let _seatingRoLastW=new WeakMap();
let _fitSeatingPending=null;   // cancellable pending-rAF token
let _fitSeatingSettling=false; // settle window: ignore RO callbacks caused by our own class write
function _fitSeatingBtnsScheduled(){
  // Wrap _fitSeatingBtns so the observer-driven path runs inside a settle window.
  // The fitter toggles .icons-only, which changes the group's size and would re-fire
  // the ResizeObserver — without this guard that's an endless collapse/expand loop.
  if(_fitSeatingPending) return;
  _fitSeatingPending=requestAnimationFrame(()=>{
    _fitSeatingPending=null;
    _fitSeatingSettling=true;
    try{ _fitSeatingBtns(); }
    finally{
      // Clear the settle flag in the NEXT task (setTimeout 0), not via rAF. rAF runs
      // before layout/RO within a frame, so an rAF clear fires too early and the RO
      // (seeing the flag already cleared) re-triggers the loop. A 0ms timeout lands
      // after the RO callback. (Same reasoning as the guest/budget fitters.)
      setTimeout(()=>{ _fitSeatingSettling=false; }, 0);
    }
  });
}
function _ensureSeatingBtnObserver(){
  if(typeof ResizeObserver!=='function') return;
  if(_seatingBtnRO){ _seatingBtnRO.disconnect(); }
  _seatingBtnRO=new ResizeObserver((entries)=>{
    if(!document.getElementById('seating-btn-group')) return;
    // Ignore notifications caused by our own fit pass (settle window).
    if(_fitSeatingSettling || _fitSeatingPending) return;
    // Noise threshold: flex layout emits a few px of sub-pixel width jitter each frame
    // even when nothing meaningful changed. Only re-fit when an observed width moved by
    // a real amount (≥6px) since the last pass, so noise can't drive the oscillation.
    let meaningful=false;
    for(const e of entries){
      const w=e.contentRect.width;
      const prev=_seatingRoLastW.get(e.target);
      if(prev===undefined || Math.abs(w-prev)>=6){ meaningful=true; }
      _seatingRoLastW.set(e.target, w);
    }
    if(!meaningful) return;
    _fitSeatingBtnsScheduled();
  });
  const tb=document.getElementById('topbar-actions');
  // Observe ONLY the stable header (.topbar), whose width tracks the viewport. Observing
  // the actions container too fed the loop — it shrinks/grows as the group collapses, so
  // its own resize re-triggered the fitter. The header alone reports the real free space.
  const header=tb&&tb.parentElement;
  if(header) _seatingBtnRO.observe(header);
}
window.addEventListener('resize', ()=>{ if(document.getElementById('seating-btn-group')) _fitSeatingBtns(); });

// ── Vendor top-bar button fitter (collapse labels → icons when narrow) ──
// Mirrors the seating fitter: measure the group's natural label-shown width on an
// offscreen clone, compare to the free header space, and toggle .icons-only with
// hysteresis + a settle window so it can't flicker. Lets the Vendors top bar shrink to
// icon-only buttons on mobile and re-expand on wider screens.
function _fitVendorBtns(){
  const group=document.getElementById('vendor-btn-group');
  const tb=document.getElementById('topbar-actions');
  if(!group||!tb||!group.isConnected) return;
  const header=tb.parentElement;
  if(!header) return;
  const wasIcons=group.classList.contains('icons-only');
  const cs=getComputedStyle(group);
  const gap=parseFloat(cs.columnGap||cs.gap)||5;
  const clone=group.cloneNode(true);
  clone.classList.remove('icons-only');
  clone.removeAttribute('id');
  clone.style.cssText += ';position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;display:inline-flex';
  group.parentElement.appendChild(clone);
  let natural=0; const btns=Array.from(clone.children);
  btns.forEach(b=>natural+=b.scrollWidth);
  natural+=gap*Math.max(0,btns.length-1);
  clone.remove();
  const hcs=getComputedStyle(header);
  const hGap=parseFloat(hcs.columnGap||hcs.gap)||12;
  const padX=(parseFloat(hcs.paddingLeft)||0)+(parseFloat(hcs.paddingRight)||0);
  let used=0, kids=Array.from(header.children);
  kids.forEach(ch=>{
    if(ch===tb) return;
    let mw=parseFloat(getComputedStyle(ch).minWidth)||0;
    // The title block is flex:1 with a tiny 40px min-width, so the raw min lets the
    // fitter think there's room while the title is actually crushed to an ellipsis
    // behind the buttons. Reserve a readable floor (~120px) for the flexible title so
    // the buttons collapse to icons before they crowd it.
    const flexible=/topbar-title|topbar-eyebrow/.test(ch.innerHTML||'') || (getComputedStyle(ch).flexGrow!=='0');
    if(flexible && mw<120) mw=120;
    used+= mw>0 ? mw : ch.getBoundingClientRect().width;
  });
  const free=header.clientWidth - padX - used - hGap*Math.max(0,kids.length-1);
  let want;
  if(wasIcons){ want = natural > free - 10 + 1; }
  else { want = natural > free + 1; }
  group.classList.toggle('icons-only', want);
}
let _vendorBtnRO=null, _vendorRoLastW=new WeakMap(), _fitVendorPending=null, _fitVendorSettling=false;
function _fitVendorBtnsScheduled(){
  if(_fitVendorPending) return;
  _fitVendorPending=requestAnimationFrame(()=>{
    _fitVendorPending=null;
    _fitVendorSettling=true;
    try{ _fitVendorBtns(); }
    finally{ setTimeout(()=>{ _fitVendorSettling=false; }, 0); }
  });
}
function _ensureVendorBtnObserver(){
  if(typeof ResizeObserver!=='function') return;
  if(_vendorBtnRO){ _vendorBtnRO.disconnect(); }
  _vendorBtnRO=new ResizeObserver((entries)=>{
    if(!document.getElementById('vendor-btn-group')) return;
    if(_fitVendorSettling || _fitVendorPending) return;
    let meaningful=false;
    for(const e of entries){
      const w=e.contentRect.width;
      const prev=_vendorRoLastW.get(e.target);
      if(prev===undefined || Math.abs(w-prev)>=6){ meaningful=true; }
      _vendorRoLastW.set(e.target, w);
    }
    if(!meaningful) return;
    _fitVendorBtnsScheduled();
  });
  const tb=document.getElementById('topbar-actions');
  const header=tb&&tb.parentElement;
  if(header) _vendorBtnRO.observe(header);
}
window.addEventListener('resize', ()=>{ if(document.getElementById('vendor-btn-group')) _fitVendorBtns(); });

function lookupSeatTable(val){
  const el=document.getElementById('seating-lookup-result');
  // Clear any prior floorplan highlight first
  _clearSeatFindHighlight();
  if(!el){ return; }
  const q=(val||'').toLowerCase().trim();
  if(!q||q.length<2){ el.innerHTML=''; return; }

  // Find all matching guests
  const matches=STATE.guests.filter(g=>g.name.toLowerCase().includes(q));
  if(!matches.length){
    el.innerHTML=`<span style="color:var(--muted)">No guests found matching "${val}"</span>`;
    return;
  }

  // For each match, find their table
  const results=matches.map(g=>{
    let tableName=null, tid=null;
    for(const [t,ids] of Object.entries(STATE.seating)){
      if((ids||[]).filter(Boolean).includes(g.id)){
        const to=STATE.tables.find(x=>x.id===t);
        tableName=to?to.name:null; tid=t;
        break;
      }
    }
    return{g,tableName,tid};
  });

  el.innerHTML=results.map(({g,tableName})=>`
    <span style="display:inline-flex;align-items:center;gap:6px;margin-right:12px;margin-bottom:4px">
      <span style="font-weight:500;color:var(--ink)">${g.name}</span>
      <span style="font-size:12px;color:${tableName?'var(--gold-deep)':'var(--muted)'};background:${tableName?'var(--parchment)':'var(--surface)'};border:1px solid ${tableName?'rgba(196,168,130,.4)':'var(--border)'};padding:2px 8px;border-radius:5px;white-space:nowrap">
        ${tableName?`📍 ${tableName}`:'Unassigned'}
      </span>
    </span>`).join('');

  // On the floorplan, highlight + scroll to the first match (seated seat, else pool chip)
  if((STATE.settings.seatingLayout||'list')==='floorplan'){
    const seated=results.find(r=>r.tid);
    if(seated){ _highlightSeatOnFloor(seated.g.id, seated.tid); }
    else {
      const firstUnseated=results.find(r=>!r.tid);
      if(firstUnseated) _highlightChipInPool(firstUnseated.g.id);
    }
  }
}

// Pulse the matched guest's seat-pip (and their table) and scroll it into view.
let _seatFindTimer=null;
function _clearSeatFindHighlight(){
  document.querySelectorAll('.floor-seat.seat-found').forEach(s=>s.classList.remove('seat-found'));
  document.querySelectorAll('.floor-table.table-found').forEach(t=>t.classList.remove('table-found'));
  document.querySelectorAll('.seat-chip.chip-found').forEach(c=>c.classList.remove('chip-found'));
  if(_seatFindTimer){ clearTimeout(_seatFindTimer); _seatFindTimer=null; }
}
function _highlightSeatOnFloor(gid,tid){
  const tableEl=document.getElementById('ftab-'+tid);
  if(tableEl) tableEl.classList.add('table-found');
  const seatEl=document.querySelector('.floor-seat[data-gid="'+gid+'"]');
  if(seatEl) seatEl.classList.add('seat-found');
  const target=seatEl||tableEl;
  if(target&&target.scrollIntoView){
    try{ target.scrollIntoView({behavior:'smooth',block:'center',inline:'center'}); }catch(e){ target.scrollIntoView(); }
  }
}
// Pulse an unassigned guest's chip in the pool and scroll the pool into view.
function _highlightChipInPool(gid){
  const chip=document.querySelector('#seating-pool .seat-chip[data-gid="'+gid+'"]');
  if(!chip) return;
  chip.classList.add('chip-found');
  if(chip.scrollIntoView){
    try{ chip.scrollIntoView({behavior:'smooth',block:'center'}); }catch(e){ chip.scrollIntoView(); }
  }
}

// ── Printable seating plan: floorplan map + table-by-table guest list.
let _seatingBW=false; // when true, the preview/print/download render in black & white (outline pips)
let _seatingPages=1;  // 1 = plan + list on one page (portrait); 2 = landscape floorplan page, then list page
// Seat counts ("8/8", "7/10") are working numbers — useful while arranging, noise on a plan
// handed to a venue or printed for the day. Preview/print/download only; the on-screen
// editor always shows them, because that is where they are actually needed.
let _seatingCounts=true;


// ═══════════════════════════════════════
