// SEATING — FLOORPLAN LAYOUT
// Builds on the list view: same STATE.tables / STATE.seating, plus per-table
// x/y/shape and STATE.settings.floorDecor (auto-persisted). List view unchanged.
// ══════════════════════════════════════════════
const DECOR_ICONS={
  dance:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  stage:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="1"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  entrance:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M10 21v-5a2 2 0 0 1 4 0v5"/></svg>',
  bar:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4l7 7 7-7z"/><path d="M12 11v8"/><path d="M8 19h8"/></svg>',
  lectern:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10l-2 9H9z"/><path d="M12 13v6"/><path d="M8 21h8"/></svg>',
  cake:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 9c0-2 3-3 8-3s8 1 8 3"/><path d="M12 6V3"/><path d="M10 3h4"/></svg>',
  gift:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8"/><rect x="2" y="7" width="20" height="5" rx="1"/><line x1="12" y1="7" x2="12" y2="21"/><path d="M12 7C12 7 12 2 9 2a2 2 0 0 0 0 4z"/><path d="M12 7C12 7 12 2 15 2a2 2 0 0 1 0 4z"/></svg>',
  photo:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 6l1.5-2h5L16 6"/></svg>',
  buffet:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18"/><path d="M5 11V8a7 7 0 0 1 14 0v3"/><path d="M4 11l1 9h14l1-9"/></svg>',
  restroom:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="4.5" r="1.8"/><path d="M7 7v0a2.2 2.2 0 0 1 2.2 2.2v4.3H8v6.5H6V13.5H4.8V9.2A2.2 2.2 0 0 1 7 7z"/><line x1="12" y1="3" x2="12" y2="21"/><circle cx="17" cy="4.5" r="1.8"/><path d="M17 7a2.2 2.2 0 0 1 2.1 1.5L20.6 13h-1.4l-1 7.5h-2.4L14.8 13h-1.4l1.5-4.5A2.2 2.2 0 0 1 17 7z"/></svg>',
  door:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17"/><path d="M2 21h18"/><circle cx="11.5" cy="12.5" r="1" fill="currentColor" stroke="none"/></svg>',
  doubledoor:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M4 21V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v17"/><path d="M2 21h20"/><circle cx="9.5" cy="12.5" r="0.9" fill="currentColor" stroke="none"/><circle cx="14.5" cy="12.5" r="0.9" fill="currentColor" stroke="none"/></svg>',
  threshold:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 17h5"/><path d="M17 17h5"/><path d="M7 12v10"/><path d="M17 12v10"/></svg>',
  text:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M9 19h6"/></svg>',
};
const DECOR_DEFS={
  dance:{label:'Dance Floor',w:160,h:84},
  stage:{label:'Stage / Band',w:130,h:56},
  entrance:{label:'Entrance',w:96,h:44},
  bar:{label:'Bar',w:140,h:54},
  lectern:{label:'Lectern',w:90,h:50},
  cake:{label:'Cake Table',w:96,h:52},
  gift:{label:'Gift Table',w:110,h:52},
  photo:{label:'Photo Booth',w:104,h:54},
  buffet:{label:'Buffet',w:150,h:50},
  restroom:{label:'Restrooms',w:96,h:46},
  // Doorways mark a point on a wall rather than enclose an area, so they are wide and
  // short and draw as line work (see _doorSvg) instead of a dashed zone.
  door:{label:'Doorway',w:120,h:74,glyph:'door'},
  doubledoor:{label:'Double Doors',w:150,h:64,glyph:'doubledoor'},
  threshold:{label:'Open Threshold',w:130,h:40,glyph:'threshold'},
  // A text label carries the words the user typed in `label`, and a `tstyle`.
  text:{label:'Text',w:150,h:40,isText:true}
};
// Text label styles. `size` is the font size at the item's DEFAULT height (40px); the
// renderer scales it with the item's actual height so the resize grip changes the text
// size, which is the only kind of "resize" a bare label can sensibly mean.
const FTEXT_STYLES={
  caps:{label:'Zone caps', cls:'ftxt-caps',    size:11},
  heading:{label:'Heading', cls:'ftxt-heading', size:17},
  note:{label:'Italic note', cls:'ftxt-note',   size:15},
  boxed:{label:'Boxed note', cls:'ftxt-boxed',  size:11.5}
};
// Doorway line work. Drawn in a 0..W x 0..H viewBox so it stretches with the item.
// Stroke widths are kept constant via vector-effect so a wide doorway does not get
// fat walls. Colours come from the same tokens the zones use, so dark mode follows.
function _doorSvg(kind,w,h){
  // Drawn in a viewBox that MATCHES the item's pixel size, so nothing is distorted. The
  // first attempt used a fixed 100x100 box stretched to fit, which squashed the swing arc
  // into a flat ellipse and made the door read as broken rather than stylised.
  //
  // The swing is a TRUE quarter circle: its radius equals the door's opening, which is what
  // makes it read as an architectural door. The opening is therefore capped by the item's
  // height as well as its width — a quarter circle of radius r needs r of headroom — so a
  // short, wide doorway opens narrower rather than drawing an arc that escapes the box.
  const wall='var(--gold-deep)', swing='var(--gold)';
  const pad=4, wy=h-6;                       // wall line sits just above the bottom edge
  const head=Math.max(10, h-14);             // vertical room available for a swing
  const vb=`0 0 ${w} ${h}`;
  const open=(frac)=>Math.max(12, Math.min(w*frac, head));
  if(kind==='doubledoor'){
    const leaf=Math.max(10, Math.min(w*0.3, head));
    const gap=leaf*2, xa=(w-gap)/2, xb=xa+gap;
    return `<svg viewBox="${vb}" preserveAspectRatio="none">
      <g fill="none" stroke-linecap="round">
        <line x1="${pad}" y1="${wy}" x2="${xa}" y2="${wy}" stroke="${wall}" stroke-width="4"/>
        <line x1="${xb}" y1="${wy}" x2="${w-pad}" y2="${wy}" stroke="${wall}" stroke-width="4"/>
        <path d="M ${xa+leaf} ${wy} A ${leaf} ${leaf} 0 0 0 ${xa} ${wy-leaf}" stroke="${swing}" stroke-width="1.3" stroke-dasharray="4 4"/>
        <path d="M ${xb-leaf} ${wy} A ${leaf} ${leaf} 0 0 1 ${xb} ${wy-leaf}" stroke="${swing}" stroke-width="1.3" stroke-dasharray="4 4"/>
        <line x1="${xa}" y1="${wy}" x2="${xa}" y2="${wy-leaf}" stroke="${wall}" stroke-width="3"/>
        <line x1="${xb}" y1="${wy}" x2="${xb}" y2="${wy-leaf}" stroke="${wall}" stroke-width="3"/>
      </g></svg>`;
  }
  if(kind==='threshold'){
    // No swing and deliberately no arrow — just a gap in the wall with two jambs.
    const gap=Math.max(16, w*0.42), x1=(w-gap)/2, x2=x1+gap, j=Math.max(6, Math.min(11, h*0.3));
    return `<svg viewBox="${vb}" preserveAspectRatio="none">
      <g fill="none" stroke-linecap="round">
        <line x1="${pad}" y1="${wy}" x2="${x1}" y2="${wy}" stroke="${wall}" stroke-width="4"/>
        <line x1="${x2}" y1="${wy}" x2="${w-pad}" y2="${wy}" stroke="${wall}" stroke-width="4"/>
        <line x1="${x1}" y1="${wy-j}" x2="${x1}" y2="${wy+j}" stroke="${wall}" stroke-width="2.2"/>
        <line x1="${x2}" y1="${wy-j}" x2="${x2}" y2="${wy+j}" stroke="${wall}" stroke-width="2.2"/>
      </g></svg>`;
  }
  const leaf=open(0.5), x1=(w-leaf)/2, x2=x1+leaf;
  return `<svg viewBox="${vb}" preserveAspectRatio="none">
      <g fill="none" stroke-linecap="round">
        <line x1="${pad}" y1="${wy}" x2="${x1}" y2="${wy}" stroke="${wall}" stroke-width="4"/>
        <line x1="${x2}" y1="${wy}" x2="${w-pad}" y2="${wy}" stroke="${wall}" stroke-width="4"/>
        <path d="M ${x2} ${wy} A ${leaf} ${leaf} 0 0 0 ${x1} ${wy-leaf}" stroke="${swing}" stroke-width="1.3" stroke-dasharray="4 4"/>
        <line x1="${x1}" y1="${wy}" x2="${x1}" y2="${wy-leaf}" stroke="${wall}" stroke-width="3"/>
      </g></svg>`;
}
let _floorDrag=null, _floorDocWired=false, _floorFitScale=1, _floorCW=0, _floorCH=0, _floorFitWired=false;
// User zoom (multiplier on top of the fit-to-width scale) + pan offset in viewport px.
let _floorUserZoom=1, _floorPanX=0, _floorPanY=0, _floorBaseFit=1;
let _floorZoomSettle=null; // debounce: drops the .zooming GPU hint after a gesture settles
const FLOOR_ZOOM_MIN=1, FLOOR_ZOOM_MAX=4;

function setSeatingLayout(v){ STATE.settings.seatingLayout=v; saveToStorage(); navigate('seating'); }
function setSeatingTableStyle(v){ STATE.settings.seatingTableStyle=v; saveToStorage(); navigate('seating'); setTimeout(()=>{ const m=document.getElementById('seat-cog-menu'); if(m){ m.style.display='block'; _seatAttachCogCloser(); } }, 40); }

// ── Compact sticky key/search bar (shared by List + Floorplan) ──
function toggleSeatTools(){ STATE.settings.seatingToolsCollapsed=!STATE.settings.seatingToolsCollapsed; saveToStorage(); navigate('seating'); }
// Four-state guest-name display on tables: 'off' (initials only), 'first' (first name
// only), 'firstinitial' (first name + last initial, e.g. "Linden S."), 'last' (full
// name). Migrates the legacy boolean seatingShowNames (true→'last', false→'off') and the
// old three-state 'first' (which meant "first + last initial") → 'firstinitial' so plans
// saved before this change look identical.
function _seatNameMode(){
  const s=STATE.settings||{};
  const m=s.seatingNameMode;
  if(m==='off'||m==='first'||m==='firstinitial'||m==='last') return m;
  return s.seatingShowNames ? 'last' : 'off';
}
function setSeatNameMode(mode){
  if(mode!=='off'&&mode!=='first'&&mode!=='firstinitial'&&mode!=='last') return;
  STATE.settings.seatingNameMode=mode;
  // Keep the legacy flag in sync so any other reader still behaves.
  STATE.settings.seatingShowNames=(mode!=='off');
  saveToStorage(); navigate('seating'); _seatReopenCog();
}
// Format a guest's name for the floorplan according to the active mode.
function _seatDisplayName(name,mode){
  if(!name) return '';
  if(mode==='last') return name;
  if(mode==='first'){
    const parts=String(name).trim().split(/\s+/);
    return parts[0]||'';
  }
  if(mode==='firstinitial'){
    const parts=String(name).trim().split(/\s+/);
    if(parts.length<2) return parts[0]||'';
    const last=parts[parts.length-1];
    return parts[0]+' '+last.charAt(0).toUpperCase()+'.';
  }
  return '';
}
// Floorplan name-pill text for a seated guest. A plus-one that hasn't been named
// yet (its name is still the "+1 (Host)" placeholder) reads "+1 [host initials]"
// so you can tell whose guest it is. But once a real name has been entered — in the
// Edit dialog or later via RSVP — that name IS the guest, so it shows plainly like
// anyone else, with no +1 marker. `_plusOnePlaceholderHost` returns '' for a real
// name and the host name for the placeholder, so it doubles as the "still unnamed?"
// test — and shares the placeholder's canonical shape with `_plusOneHostLabel`, so
// the two can't drift.
function _seatPillName(g,mode){
  if(!g) return '';
  const nm=String(g.name||'');
  if(_plusOnePlaceholderHost(nm)){
    // Unnamed +1 — substitute the host-initials label.
    const host = STATE.guests && STATE.guests.find(x=>x.plusOneId===g.id);
    const hostInit = host ? initials(host.name) : '';
    return hostInit ? '+1 '+hostInit : '+1';
  }
  // Named +1 (or anyone else) — normal mode-aware display name, no marker.
  return _seatDisplayName(nm,mode);
}
// Back-compat: old callers that flipped names on/off now cycle off→last→off.
function toggleSeatNames(){ setSeatNameMode(_seatNameMode()==='off'?'last':'off'); }
function toggleSeatDietKey(){ STATE.settings.seatingHideDietKey=!STATE.settings.seatingHideDietKey; saveToStorage(); navigate('seating'); _seatReopenCog(); }
function _seatStickyBar(layout){
  const sw=_seatLayoutSwitchHtml(layout);
  const search=`<div style="position:relative;flex:1;min-width:160px;max-width:300px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="seating-lookup" class="form-input" placeholder="Find a guest's table…" style="padding:5px 10px 5px 28px;font-size:12px;height:30px" oninput="lookupSeatTable(this.value)" onkeydown="if(event.key==='Escape'){this.value='';lookupSeatTable('')}"/>
    </div>`;
  const result=`<div id="seating-lookup-result" style="font-size:12.5px;color:var(--ink);flex:0 1 auto;min-width:0"></div>`;
  const keyHidden=!!STATE.settings.seatingHideDietKey;
  const key=keyHidden?'':`<div class="seat-stickybar-key">
    <strong style="font-size:11px;color:var(--ink);margin-right:2px">Key:</strong>
    <span class="dk"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6 2 3 7 3 12c0 4 2.5 7 6 8"/><path d="M12 2c4 3 7 7 7 10 0 4-2.5 7-6 8"/><line x1="12" y1="22" x2="12" y2="10"/></svg>Vegetarian</span>
    <span class="dk"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3c0 10 7 17 17 17-1-9-7-15-17-17z"/><path d="M3 3l8 8"/></svg>Vegan</span>
    <span class="dk"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15 L12 5 L22 15 L2 15 Z"/><path d="M2 15 L22 15 L22 20 L2 20 Z"/><circle cx="16" cy="12" r="1.5" fill="var(--gold-deep)" stroke="none"/><circle cx="9" cy="17" r="1.5" fill="var(--gold-deep)" stroke="none"/><line x1="4" y1="4" x2="20" y2="20"/></svg>Lactose free</span>
    <span class="dk"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 22 Q11 15 12 3 M12 18 Q9 17 9.5 14.5 Q12 13.5 12.5 16 Q12.5 17.5 12 18 M12 14.5 Q9 13.5 9.5 11 Q12 10 12.5 12.5 Q12.5 14 12 14.5 M12 11 Q9 10 9.5 7.5 Q12 6.5 12.5 9 Q12.5 10.5 12 11 M12 7.5 Q9.5 6.5 10 5 Q12 4 12.5 6 Q12.5 7 12 7.5 M12.5 16 L16 14.5 M12.5 12.5 L16 11 M12.5 9 L16 7.5 M12.5 6 L15 4.5 M9.5 14.5 L6 13 M9.5 11 L6 9.5 M9.5 7.5 L6 6 M10 5 L7.5 3.5 M4 4 L20 20"/></svg>Gluten-free</span>
    <span class="dk"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Other</span>
    <span class="dk"><span class="diet-ico-al" style="display:inline-flex"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" title="Allergy"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>Allergy</span>
  </div>`;
  const row=`<div class="seat-stickybar-row">
    ${search}
    ${result}
    <div style="margin-left:auto">${sw}</div>
  </div>`;
  return `<div class="seat-stickybar">${row}${key}</div>`;
}


function _seatLayoutSwitchHtml(active){
  const listSvg='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';
  const gridSvg='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><circle cx="17.5" cy="6.5" r="3.5"/><circle cx="6.5" cy="17.5" r="3.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
  return `<div class="seat-seg seat-layout-seg" style="margin-right:2px">
    <button class="${active==='list'?'on':''}" onclick="setSeatingLayout('list')" title="List view">${listSvg} <span class="seat-seg-label">List</span></button>
    <button class="${active==='floorplan'?'on':''}" onclick="setSeatingLayout('floorplan')" title="Floorplan view">${gridSvg} <span class="seat-seg-label">Floorplan</span></button>
  </div>`;
}

const SEAT_PIP=28;        // seat-marker diameter (px) — Option C: Generous
const _PB=SEAT_PIP+4;     // pip-band thickness around a table edge
// Inline pill styling for the floor name tag — mirrors the .floor-name-tag class but is
// inlined so it also renders in the print/download document (which has its own isolated
// stylesheet without that class). High z-index keeps pills above all tables.
const _SEAT_NAME_PILL_CSS="font-family:'Inter',sans-serif;font-size:8.5px;font-weight:600;line-height:1.1;color:#3A352F;white-space:nowrap;background:#fff;border:.5px solid #E7DECF;border-radius:5px;padding:1px 5px;box-shadow:0 1px 4px rgba(0,0,0,.12);pointer-events:none;z-index:40";
function _tableBaseSize(t){
  const shape=(t&&t.shape)||'round';
  if(shape==='round')   return {w:112,h:112};
  if(shape==='square')  return {w:104,h:104};
  if(shape==='theatre'){ const n=Math.max(1,Number(t&&t.seats)||1); return {w:Math.max(150, Math.round(n*(SEAT_PIP+11))+2*_PB), h:54}; }
  return {w:200,h:74};    // long
}
function _tableSize(t){ const b=_tableBaseSize(t), s=(t&&t.scale)||1; return {w:Math.round(b.w*s), h:Math.round(b.h*s)}; }

// ═══ CHAIR GEOMETRY & ADJACENCY (v141) ═══════════════════════════════════
// ⚠️ ADJACENT INDEX IS NOT ADJACENT CHAIR. This is the whole reason this exists.
//
//   ROUND: the indices WRAP. Chair 7 and chair 0 are physically side by side, and
//     `i+1` would REFUSE a couple who could happily sit together.
//   LONG / SQUARE: FALSE NEIGHBOURS AT THE CORNERS. On a long 8-seater, chairs 3
//     and 4 are consecutive indices sitting at OPPOSITE ENDS of the table — `i+1`
//     would SEAT A COUPLE WHO CANNOT SEE EACH OTHER.
//   THEATRE: the only shape where `i+1` happens to be honest.
//
// So adjacency is DERIVED FROM THE GEOMETRY, never from the subscripts. We compute
// the chair centres with the SAME formulas the pip renderers use, and call two
// chairs neighbours when they are physically close. Hand-writing a rule per shape
// would be a SECOND description of the geometry, free to drift from the first; this
// cannot disagree with the renderer, because it is the renderer's own maths.
//
// If you change a _pipsX() placer, CHANGE THE MATCHING BRANCH HERE.
function _seatChairXY(t){
  const shape=(t&&t.shape)||'round';
  const n=Math.max(0,Number(t&&t.seats)||0);
  const sz=_tableBaseSize(t), PR=SEAT_PIP/2, out=[];
  if(shape==='round'){
    const c=sz.w/2, r=sz.w/2-10+PR;                                  // mirrors _pipsRound
    for(let i=0;i<n;i++){ const a=(-90+i*360/n)*Math.PI/180; out[i]={x:c+r*Math.cos(a), y:c+r*Math.sin(a)}; }
  } else if(shape==='theatre'){
    const LM=Math.max(_PB,20), GAP=-8;                               // mirrors _pipsTheatre
    const BY=(_seatSide(t)==='above') ? (-PR-GAP) : (sz.h+PR+GAP);   // ...including the side
    const xAt=i=>LM+(n>1?i*(sz.w-2*LM)/(n-1):(sz.w-2*LM)/2);
    for(let i=0;i<n;i++) out[i]={x:xAt(i), y:BY};
  } else if(shape==='square'){
    const GAP=-9, b=Math.floor(n/4), ex=n%4, cnt=[b,b,b,b];          // mirrors _pipsSquare
    for(let i=0;i<ex;i++) cnt[i]++;
    const at=f=>_PB+f*(sz.w-2*_PB);
    let k=0;
    const place=(c,fn)=>{ for(let i=0;i<c;i++){ const f=c>1?i/(c-1):0.5; out[k]=fn(f); k++; } };
    place(cnt[0], f=>({x:at(f),          y:-PR-GAP}));               // top
    place(cnt[1], f=>({x:sz.w+PR+GAP,    y:at(f)}));                 // right
    place(cnt[2], f=>({x:at(f),          y:sz.h+PR+GAP}));           // bottom
    place(cnt[3], f=>({x:-PR-GAP,        y:at(f)}));                 // left
  } else {                                                            // mirrors _pipsLong
    const LM=40, GAP=-9, TY=-PR-GAP, BY=sz.h+PR+GAP;
    const hasL=!!(t&&t.headLeft!==undefined), hasR=!!(t&&t.headRight!==undefined);
    const longN=n-(hasL?1:0)-(hasR?1:0);
    const per=Math.ceil(longN/2), m=longN-per;
    const xAt=(i,c)=>LM+(c>1?i*(sz.w-2*LM)/(c-1):(sz.w-2*LM)/2);
    for(let i=0;i<per;i++) out[i]={x:xAt(i,per), y:TY};
    for(let i=0;i<m;i++)   out[per+i]={x:xAt(i,m), y:BY};
    // Head seats live OUTSIDE the array (t.headLeft/headRight) and are not chair
    // indices, so they are deliberately absent here.
  }
  return out;
}
// Chairs whose centres are within 1.35x the SMALLEST gap on this table. The scale is
// taken from the table itself, so it holds for any seat count and any shape.
function _seatNeighbours(t,i){
  const P=_seatChairXY(t), n=P.length;
  if(i<0||i>=n||!P[i]) return [];
  const d=(a,b)=>Math.hypot(P[a].x-P[b].x, P[a].y-P[b].y);
  let min=Infinity;
  for(let a=0;a<n;a++) for(let b=a+1;b<n;b++){ const v=d(a,b); if(v<min) min=v; }
  if(!isFinite(min)||min<=0) return [];
  const tol=min*1.35, out=[];
  for(let j=0;j<n;j++) if(j!==i && d(i,j)<=tol) out.push(j);
  return out;
}
// A pair of FREE chairs that are physically side by side. null if there is none —
// which is a real state: a long 8-seater with only chairs 3 and 4 free has two empty
// seats and NOWHERE for a couple.
function _seatFreeAdjacentPair(tid){
  const t=(STATE.tables||[]).find(x=>x.id===tid); if(!t) return null;
  const free=new Set(_seatFreeIdx(tid));
  for(const i of free){
    for(const j of _seatNeighbours(t,i)){
      if(free.has(j)) return [i,j];
    }
  }
  return null;
}
function _tableCenter(t){ const s=_tableSize(t); return {x:(t.x||0)+s.w/2, y:(t.y||0)+s.h/2}; }
// Axis-aligned bounding box of a w×h box rotated by deg about its centre.
// Returns the rotated width/height. (Tables rotate about centre via transform-origin.)
function _rotatedAABB(w,h,deg){
  const r=((deg||0)*Math.PI)/180, c=Math.abs(Math.cos(r)), s=Math.abs(Math.sin(r));
  return { w: w*c + h*s, h: w*s + h*c };
}

// ── Snap-to-grid (Seating floorplan) ──────────────────────────────────────────
// Two independent settings: snap on/off and grid-visibility on/off. The grid cell
// is FLOOR_GRID px; an element's CENTRE snaps to the nearest cell intersection
// while dragging (rotation untouched). Grid dots are drawn on .floor-canvas via the
// .grid-on class and mark the same intersections that centres land on.
const FLOOR_GRID=32;
function _floorSnapCenter(cx,cy){
  return { cx: Math.round(cx/FLOOR_GRID)*FLOOR_GRID, cy: Math.round(cy/FLOOR_GRID)*FLOOR_GRID };
}
function toggleFloorSnap(){ STATE.settings.floorSnap=!STATE.settings.floorSnap; saveToStorage(); navigate('seating'); }
function toggleFloorGrid(){ STATE.settings.floorGrid=!STATE.settings.floorGrid; saveToStorage(); navigate('seating'); }
// ── Floorplan lock (3-state) ─────────────────────────────────────────────────
// 'none'   → fully editable.
// 'layout' → tables & areas frozen (move/resize/rotate disabled); guests still seatable.
// 'all'    → everything frozen, including guest seat dragging.
// Persisted on STATE.settings.floorLock. Cycles none → layout → all → none.
function _floorLockState(){
  const s=(STATE.settings&&STATE.settings.floorLock)||'none';
  return (s==='layout'||s==='all')?s:'none';
}
function _floorLayoutLocked(){ return _floorLockState()!=='none'; }   // tables/areas frozen
function _floorAllLocked(){ return _floorLockState()==='all'; }       // guests frozen too
function cycleFloorLock(){
  if(!STATE.settings) STATE.settings={};
  const cur=_floorLockState();
  STATE.settings.floorLock = cur==='none' ? 'layout' : (cur==='layout' ? 'all' : 'none');
  saveToStorage(); navigate('seating');
}
function _floorLockBtnHtml(){
  const st=_floorLockState();
  const openSvg='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
  const closedSvg='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  const gridBadge='<span class="floor-lock-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/></svg></span>';
  const personBadge='<span class="floor-lock-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 16 0v1"/></svg></span>';
  let cls='snap-toggle floor-lock-btn', icon=openSvg, label='Lock', badge='', title='Floorplan unlocked — tap to lock tables &amp; areas';
  if(st==='layout'){ cls+=' on'; icon=closedSvg; label='Layout'; badge=gridBadge; title='Tables &amp; areas locked — tap to lock guests too'; }
  else if(st==='all'){ cls+=' floor-lock-full'; icon=closedSvg; label='Locked'; badge=personBadge; title='Everything locked — tap to unlock'; }
  return `<button class="${cls}" onclick="cycleFloorLock()" title="${title}" aria-label="${title.replace(/&amp;/g,'and')}">${icon} ${label}${badge}</button>`;
}
function toggleFloorZoomBtns(){ if(!STATE.settings) STATE.settings={}; STATE.settings.floorHideZoomBtns=!STATE.settings.floorHideZoomBtns; saveToStorage(); navigate('seating'); _seatReopenCog(); }

function _autoLayoutTables(){
  let changed=false, slot=0;
  const cols=4, cw=215, rh=175, ox=20, oy=20;
  (STATE.tables||[]).forEach(t=>{
    if(!Number.isFinite(t.x)||!Number.isFinite(t.y)){
      const col=slot%cols, row=Math.floor(slot/cols);
      t.x=ox+col*cw; t.y=oy+row*rh; slot++; changed=true;
    }
  });
  if(changed) saveToStorage();
}

// Proximity-based conflicts: same table, table centres within a SIZE-RELATIVE gap,
// or adjacent in the table order. The proximity gap scales with the two tables'
// actual sizes (so resizing tables scales the trigger), out to N table-widths where
// N is the "conflict range" setting (1 or 2, default 1).
function _floorConflictRange(){ const n=Number(STATE.settings&&STATE.settings.floorConflictTables); return (n===2)?2:1; }
function _floorConflicts(){
  const out={conflicts:[], ignoredConflicts:[], tableHas:new Set(), chipFlag:new Set()};
  const ign=(STATE.settings&&STATE.settings.conflictIgnored)||{};
  const pos={};
  // Table-order index (list-adjacency, used only at the "2 tables" range) and a
  // per-table bounding box {cx,cy,hw,hh} = centre + half-width/height (rotation-aware),
  // so proximity can use TRUE edge-to-edge clearance rather than a circular reach. This
  // stops wide/short tables (e.g. the long Bridal Table) from falsely reading as "near"
  // tables far above/below them.
  const orderIdx={}; const boxOf={};
  (STATE.tables||[]).forEach((t,i)=>{
    orderIdx[t.id]=i;
    const s=_tableSize(t), ab=_rotatedAABB(s.w,s.h,t.rotation||0), c=_tableCenter(t);
    boxOf[t.id]={cx:c.x, cy:c.y, hw:ab.w/2, hh:ab.h/2};
  });
  (STATE.tables||[]).forEach(t=>{ _seatIds(t.id).forEach(gid=>{ pos[gid]={tid:t.id}; }); });
  const nTables=_floorConflictRange();
  const seen=new Set();
  STATE.guests.forEach(g=>{
    (g.keepApart||[]).forEach(oid=>{
      const key=[g.id,oid].sort().join('|'); if(seen.has(key)) return; seen.add(key);
      const pa=pos[g.id], pb=pos[oid]; if(!pa||!pb) return;
      const o=STATE.guests.find(x=>x.id===oid); if(!o) return;
      const ba=boxOf[pa.tid], bb=boxOf[pb.tid]; if(!ba||!bb) return;
      // True edge-to-edge gap between the two table boxes: 0 if overlapping/touching,
      // otherwise the straight-line clearance (horizontal gap if side-by-side, vertical
      // if stacked, diagonal if offset). Size-relative allowance = N table-widths, using
      // each table's own smaller dimension so the unit reflects real table size and
      // shape. "1 table" flags when the clearance is within ~1 table-width; "2 tables"
      // within ~2. Scales with resize; long tables no longer over-reach.
      const gapX=Math.max(0, Math.abs(ba.cx-bb.cx) - (ba.hw+bb.hw));
      const gapY=Math.max(0, Math.abs(ba.cy-bb.cy) - (ba.hh+bb.hh));
      const gap=Math.hypot(gapX, gapY);
      const unitA=Math.min(ba.hw,ba.hh)*2, unitB=Math.min(bb.hw,bb.hh)*2;
      const allowance=nTables*Math.max(unitA,unitB);
      let kind=null;
      if(pa.tid===pb.tid) kind='same';
      else if(gap<allowance) kind='near';
      // Table-order adjacency (matching the list view) only contributes at the wider
      // "2 tables" range — at "1 table" the proximity gap alone decides, so a
      // list-adjacent pair placed far apart on the canvas won't falsely flag.
      else if(nTables>=2 && Math.abs((orderIdx[pa.tid]||0)-(orderIdx[pb.tid]||0))===1) kind='adjacent';
      if(!kind) return;
      const conf={a:g,b:o,tableIds:[pa.tid,pb.tid],kind,key};
      if(ign[key]){ out.ignoredConflicts.push(conf); return; }
      out.conflicts.push(conf);
      out.tableHas.add(pa.tid); out.tableHas.add(pb.tid);
      out.chipFlag.add(pa.tid+'|'+g.id); out.chipFlag.add(pb.tid+'|'+oid);
    });
  });
  return out;
}

// Separated groups: a couple (mutual coupleId) OR — when the "Flag separated families"
// toggle is on — a family (STATE.families) whose seated members span 2+ tables. A group
// with only one member seated is NOT separated (just incomplete), so it's skipped.
// Returns {pairs:[...], ignoredPairs:[...], tableHas:Set(tid)}. Each pair carries a
// `groupKind` of 'couple' or 'family' and a stable `key`.
function _floorSeparatedCouples(){
  const out={pairs:[], ignoredPairs:[], tableHas:new Set()};
  const ign=(STATE.settings&&STATE.settings.sepIgnored)||{};
  const tableOf={};
  (STATE.tables||[]).forEach(t=>{ _seatIds(t.id).forEach(gid=>{ tableOf[gid]=t.id; }); });
  // Couples (always flagged) ──────────────────────────────────────────────
  const seen=new Set();
  (STATE.guests||[]).forEach(g=>{
    if(!g.coupleId) return;
    const key=[g.id,g.coupleId].sort().join('|'); if(seen.has(key)) return; seen.add(key);
    const partner=STATE.guests.find(x=>x.id===g.coupleId); if(!partner) return;
    const ta=tableOf[g.id], tb=tableOf[partner.id];
    if(!ta||!tb) return;           // one (or both) unassigned → not "separated"
    if(ta===tb) return;            // together → fine
    const pair={groupKind:'couple', a:g, b:partner, names:[g.name,partner.name], tableIds:[ta,tb], key};
    if(ign[key]){ out.ignoredPairs.push(pair); return; }
    out.pairs.push(pair);
    out.tableHas.add(ta); out.tableHas.add(tb);
  });
  // Families (only when the toggle is on) ─────────────────────────────────
  if(_seatFamilySepOn() && Array.isArray(STATE.families)){
    STATE.families.forEach(fam=>{
      const ids=(fam.memberIds||[]).filter(id=>STATE.guests.find(x=>x.id===id));
      const seated=ids.filter(id=>tableOf[id]);
      if(seated.length<2) return;                 // fewer than 2 seated → not separated
      const tids=[...new Set(seated.map(id=>tableOf[id]))];
      if(tids.length<2) return;                   // all on one table → together
      const key='fam:'+fam.id;
      const nm=(fam.name && String(fam.name).trim()) ? fam.name : 'Family';
      const members=seated.map(id=>STATE.guests.find(x=>x.id===id)).filter(Boolean);
      const pair={groupKind:'family', famId:fam.id, famName:nm, members, tableIds:tids, key};
      if(ign[key]){ out.ignoredPairs.push(pair); return; }
      out.pairs.push(pair);
      tids.forEach(t=>out.tableHas.add(t));
    });
  }
  return out;
}
// Toggle: flag families split across tables (couples are always flagged). Off by default.
function _seatFamilySepOn(){ return !!(STATE.settings && STATE.settings.flagSeparatedFamilies); }
function _toggleFamilySep(){
  if(!STATE.settings) STATE.settings={};
  STATE.settings.flagSeparatedFamilies=!_seatFamilySepOn();
  saveToStorage();
  navigate('seating');
  _seatReopenCog();
}
// Set the floorplan conflict proximity range (1 or 2 tables apart, size-relative).
function _setFloorConflictTables(n){
  if(!STATE.settings) STATE.settings={};
  STATE.settings.floorConflictTables=(Number(n)===2)?2:1;
  saveToStorage();
  navigate('seating');
  _seatReopenCog();
}
function _seatingSeparatedBanner(sep){
  if(!sep.pairs.length) return '';
  const esc=_escHtml;
  const nCouple=sep.pairs.filter(p=>p.groupKind!=='family').length;
  const nFamily=sep.pairs.filter(p=>p.groupKind==='family').length;
  const parts=[];
  if(nCouple) parts.push(`${nCouple} couple${nCouple>1?'s':''}`);
  if(nFamily) parts.push(nFamily>1?`${nFamily} families`:`1 family`);
  const heading=`${parts.join(', ')} separated`;
  const ignoreBtn=(key)=>`<button onclick="event.stopPropagation();_seatIgnoreSeparation('${key}')" title="Ignore this flag — hides it from the banner and removes the table markers" style="display:inline-flex;align-items:center;gap:4px;background:none;border:.5px solid rgba(154,79,149,.4);color:var(--sep-ink);font-size:11px;font-weight:600;font-family:inherit;border-radius:7px;padding:4px 9px;cursor:pointer;flex-shrink:0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>Ignore</button>`;
  const tn=(tid,fb)=>{ const t=STATE.tables.find(x=>x.id===tid); return esc(t?t.name:fb); };
  const rows=sep.pairs.map(p=>{
    let label;
    if(p.groupKind==='family'){
      const tables=p.tableIds.map(t=>tn(t,'?')).join(', ');
      label=`<b>${esc(p.famName)}</b> — split across ${tables}`;
    } else {
      label=`<b>${esc(p.a.name)}</b> &amp; <b>${esc(p.b.name)}</b> — ${tn(p.tableIds[0],'?')} &amp; ${tn(p.tableIds[1],'?')}`;
    }
    return `<div class="sep-row" onclick="_seatFocusCouple('${p.key}')" title="Click to find these tables on the floorplan" style="display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:8px;background:rgba(154,79,149,.06);border:.5px solid transparent;cursor:pointer">
      <span style="flex:1">${label}</span>${ignoreBtn(p.key)}
    </div>`;
  }).join('');
  return `<div style="background:rgba(154,79,149,.09);border:.5px solid rgba(154,79,149,.38);color:var(--ink);border-radius:10px;padding:11px 13px;margin-bottom:16px;font-size:12.5px;line-height:1.5">
    <div style="display:flex;gap:9px;align-items:center;margin-bottom:9px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sep-ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/></svg>
      <b>${heading}</b>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">${rows}</div>
  </div>`;
}
// Ignore a separation flag: persist the couple's pair-key, re-render so the banner row
// and both table badges drop. The seating cog offers a "Restore ignored flags" reset.
function _seatIgnoreSeparation(key){
  if(!STATE.settings.sepIgnored) STATE.settings.sepIgnored={};
  STATE.settings.sepIgnored[key]=true;
  saveToStorage();
  navigate('seating');
}
function _seatResetIgnoredSeparations(){
  STATE.settings.sepIgnored={};
  saveToStorage();
  navigate('seating');
}
// Scroll the tables of a separated couple/family into view and pulse them briefly.
function _seatFocusCouple(key){
  const tableOf={};
  (STATE.tables||[]).forEach(t=>{ _seatIds(t.id).forEach(gid=>{ tableOf[gid]=t.id; }); });
  let tids=[];
  if(String(key).indexOf('fam:')===0){
    const fam=(STATE.families||[]).find(f=>('fam:'+f.id)===key);
    if(fam) tids=[...new Set((fam.memberIds||[]).map(gid=>tableOf[gid]).filter(Boolean))];
  } else {
    const ids=String(key).split('|');
    tids=[...new Set(ids.map(gid=>tableOf[gid]).filter(Boolean))];
  }
  if(!tids.length) return;
  const els=tids.map(tid=>document.getElementById('ftab-'+tid)).filter(Boolean);
  if(!els.length) return;
  try{ els[0].scrollIntoView({behavior:'smooth',block:'center',inline:'center'}); }catch(_){ try{ els[0].scrollIntoView(); }catch(__){} }
  els.forEach(el=>{ el.classList.remove('sep-pulse'); void el.offsetWidth; el.classList.add('sep-pulse'); setTimeout(()=>el.classList.remove('sep-pulse'),1800); });
}

// ── Seating cog popover (shared pattern, mirrors the calendar cog) ──
// Holds the Seats/Fill table-style switcher (default Seats) and the Reset-all action.
function _seatCogIcon(){
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
}
function _seatCogMenuHtml(style, layout){
  const seatsOn=(style||'pips')==='pips';
  const isList=(layout==='list');
  const arranging=isList&&arrangeTablesMode;
  const ignN=Object.keys((STATE.settings&&STATE.settings.sepIgnored)||{}).length;
  const ignConfN=Object.keys((STATE.settings&&STATE.settings.conflictIgnored)||{}).length;
  const keyHidden=!!STATE.settings.seatingHideDietKey;
  const restoreRow=ignN?`<div style="height:1px;background:var(--border);margin:4px 0"></div>
    <button onclick="_seatResetIgnoredSeparations()" title="Bring back every separated couple/family flag you've ignored" style="display:flex;align-items:center;gap:7px;width:100%;background:none;border:none;color:var(--sep-ink);font-size:12.5px;font-weight:600;font-family:inherit;cursor:pointer;padding:6px 2px;text-align:left">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      Restore ignored separations (${ignN})
    </button>`:'';
  const restoreConfRow=ignConfN?`<div style="height:1px;background:var(--border);margin:4px 0"></div>
    <button onclick="_seatResetIgnoredConflicts()" title="Bring back every seating conflict you've ignored" style="display:flex;align-items:center;gap:7px;width:100%;background:none;border:none;color:var(--red);font-size:12.5px;font-weight:600;font-family:inherit;cursor:pointer;padding:6px 2px;text-align:left">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      Restore ignored conflicts (${ignConfN})
    </button>`:'';
  // Flag separated families toggle (couples are always flagged).
  const famSepOn=_seatFamilySepOn();
  const famSepToggle=`<label style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:var(--ink);margin-bottom:11px;cursor:pointer;user-select:none" title="Also flag families split across tables (couples are always flagged)">Flag separated families
    <div onclick="event.preventDefault();_toggleFamilySep()" style="width:32px;height:18px;border-radius:9px;background:${famSepOn?'var(--gold)':'var(--border)'};position:relative;transition:background .2s;flex-shrink:0;cursor:pointer">
      <div style="position:absolute;width:13px;height:13px;border-radius:50%;background:#fff;top:2.5px;left:${famSepOn?'16px':'2.5px'};transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
    </div>
  </label>`;
  // Conflict proximity range (floorplan only) — how far apart two keep-apart guests'
  // tables can be and still flag. Size-relative: scales with the tables' actual size.
  const confRange=_floorConflictRange();
  const confRangeSeg=isList?'':`<div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-deep);margin:9px 0 7px" title="How close two keep-apart guests' tables must be to flag a conflict. Scales with table size.">Conflict range</div>
    <div class="seat-seg" style="display:flex;width:100%;margin-bottom:11px">
      <button class="${confRange===1?'on':''}" style="flex:1;justify-content:center;font-size:11px" onclick="_setFloorConflictTables(1)" title="Flag when tables are within ~1 table apart">1 table</button>
      <button class="${confRange===2?'on':''}" style="flex:1;justify-content:center;font-size:11px" onclick="_setFloorConflictTables(2)" title="Flag when tables are within ~2 tables apart">2 tables</button>
    </div>`;
  // Display section — Show attending-only toggle (filters the pool/seating to attending guests).
  const attendingToggle=`<label style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:var(--ink);margin-bottom:11px;cursor:pointer;user-select:none" title="Only show guests marked as attending in the unassigned pool and warnings">Show attending only
    <div onclick="event.preventDefault();_toggleSeatingAttending()" style="width:32px;height:18px;border-radius:9px;background:${seatingAttendingOnly?'var(--gold)':'var(--border)'};position:relative;transition:background .2s;flex-shrink:0;cursor:pointer">
      <div style="position:absolute;width:13px;height:13px;border-radius:50%;background:#fff;top:2.5px;left:${seatingAttendingOnly?'16px':'2.5px'};transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
    </div>
  </label>`;
  // Unassigned pool — group by couple/family toggle
  const groupPoolOn=!(STATE.settings&&STATE.settings.seatFlatPool);
  const groupPoolToggle=`<label style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:var(--ink);margin-bottom:11px;cursor:pointer;user-select:none" title="Group couples and families together in the unassigned guests panel">Group couples &amp; families
    <div onclick="event.preventDefault();toggleSeatFlatPool()" style="width:32px;height:18px;border-radius:9px;background:${groupPoolOn?'var(--gold)':'var(--border)'};position:relative;transition:background .2s;flex-shrink:0;cursor:pointer">
      <div style="position:absolute;width:13px;height:13px;border-radius:50%;background:#fff;top:2.5px;left:${groupPoolOn?'16px':'2.5px'};transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
    </div>
  </label>`;
  // Unassigned pool — show children & infants toggle
  const showKidsOn=!(STATE.settings&&STATE.settings.seatHideChildren);
  const showKidsToggle=`<label style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:var(--ink);margin-bottom:11px;cursor:pointer;user-select:none" title="Show or hide children and infants in the unassigned guests panel">Show children &amp; infants
    <div onclick="event.preventDefault();toggleSeatShowChildren()" style="width:32px;height:18px;border-radius:9px;background:${showKidsOn?'var(--gold)':'var(--border)'};position:relative;transition:background .2s;flex-shrink:0;cursor:pointer">
      <div style="position:absolute;width:13px;height:13px;border-radius:50%;background:#fff;top:2.5px;left:${showKidsOn?'16px':'2.5px'};transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
    </div>
  </label>`;
  // Display section — Show dietary key toggle (both views).
  const dietToggle=`<label style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:var(--ink);margin-bottom:11px;cursor:pointer;user-select:none" title="Show or hide the dietary requirements key in the toolbar">Show dietary key
    <div onclick="event.preventDefault();toggleSeatDietKey()" style="width:32px;height:18px;border-radius:9px;background:${!keyHidden?'var(--gold)':'var(--border)'};position:relative;transition:background .2s;flex-shrink:0;cursor:pointer">
      <div style="position:absolute;width:13px;height:13px;border-radius:50%;background:#fff;top:2.5px;left:${!keyHidden?'16px':'2.5px'};transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
    </div>
  </label>`;
  // Zoom-buttons toggle (floorplan only). Gestures (pinch / Ctrl+scroll) always work;
  // this just shows or hides the on-screen +/−/reset control.
  const zoomOn=!(STATE.settings&&STATE.settings.floorHideZoomBtns);
  const zoomToggle=isList?'':`<label style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:var(--ink);margin-bottom:11px;cursor:pointer;user-select:none" title="Show or hide the on-screen zoom buttons (pinch &amp; Ctrl+scroll still work)">Show zoom buttons
    <div onclick="event.preventDefault();toggleFloorZoomBtns()" style="width:32px;height:18px;border-radius:9px;background:${zoomOn?'var(--gold)':'var(--border)'};position:relative;transition:background .2s;flex-shrink:0;cursor:pointer">
      <div style="position:absolute;width:13px;height:13px;border-radius:50%;background:#fff;top:2.5px;left:${zoomOn?'16px':'2.5px'};transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
    </div>
  </label>`;
  // Guest-name display: four-state segmented control (off / first / first+initial / last).
  const _nm=_seatNameMode();
  const nameModeSeg=`<div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-deep);margin:9px 0 7px">Guest names on tables</div>
    <div class="seat-seg" style="display:flex;width:100%;margin-bottom:11px">
      <button class="${_nm==='off'?'on':''}" style="flex:1;justify-content:center;padding-left:0;padding-right:0;font-size:11px" onclick="setSeatNameMode('off')" title="Show initials only">Off</button>
      <button class="${_nm==='first'?'on':''}" style="flex:1;justify-content:center;padding-left:0;padding-right:0;font-size:11px" onclick="setSeatNameMode('first')" title="Show first name only">First</button>
      <button class="${_nm==='firstinitial'?'on':''}" style="flex:1.25;justify-content:center;padding-left:0;padding-right:0;font-size:11px;white-space:nowrap" onclick="setSeatNameMode('firstinitial')" title="Show first name + last initial (e.g. Linden S.)">First #.</button>
      <button class="${_nm==='last'?'on':''}" style="flex:1;justify-content:center;padding-left:0;padding-right:0;font-size:11px" onclick="setSeatNameMode('last')" title="Show full names">Last</button>
    </div>`;
  // Table-style switcher (floorplan only — it controls pip vs ring canvas rendering).
  const styleSeg=isList?'':`<div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-deep);margin:9px 0 7px">Table style</div>
    <div class="seat-seg" style="display:flex;width:100%;margin-bottom:11px">
      <button class="${seatsOn?'on':''}" style="flex:1;justify-content:center" onclick="setSeatingTableStyle('pips')"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="4" r="2"/><circle cx="12" cy="20" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="20" cy="12" r="2"/><circle cx="6.5" cy="6.5" r="2"/><circle cx="17.5" cy="6.5" r="2"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/></svg> Seats</button>
      <button class="${!seatsOn?'on':''}" style="flex:1;justify-content:center" onclick="setSeatingTableStyle('ring')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3a9 9 0 1 1-9 9" /></svg> Fill</button>
    </div>`;
  // Arrange tables (list view only). In arrange mode the cog just shows it as active;
  // the Done button lives in the page-body helper banner, not here.
  const arrangeRow=isList?`<button onclick="toggleArrangeTables()" title="Reorder your tables by dragging" style="display:flex;align-items:center;gap:7px;width:100%;background:${arranging?'var(--surface)':'none'};border:none;color:${arranging?'var(--gold-deep)':'var(--ink)'};font-size:12.5px;font-weight:600;font-family:inherit;cursor:pointer;padding:6px 2px;text-align:left;border-radius:6px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      Arrange tables${arranging?' (on)':''}
    </button>
    <div style="height:1px;background:var(--border);margin:6px 0"></div>`:'';
  const dis=arranging?'disabled':'';
  return `<div id="seat-cog-menu" style="display:none;position:absolute;top:calc(100% + 6px);right:0;z-index:60;width:225px;background:var(--cream);border:1px solid var(--border);border-radius:11px;box-shadow:0 4px 24px rgba(26,26,24,.12);padding:13px 15px;text-align:left">
    <div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:8px">Display</div>
    ${attendingToggle}
    ${groupPoolToggle}
    ${showKidsToggle}
    ${dietToggle}
    ${famSepToggle}
    ${zoomToggle}
    ${confRangeSeg}
    ${nameModeSeg}
    ${styleSeg}
    <div style="height:1px;background:var(--border);margin:2px 0 6px"></div>
    ${arrangeRow}
    <button class="seat-cog-action" ${dis} onclick="randomFillSeating()" title="Randomly seat unassigned attending guests into free seats (keeps couples together)" style="display:flex;align-items:center;gap:7px;width:100%;background:none;border:none;color:var(--gold-deep);font-size:12.5px;font-weight:600;font-family:inherit;cursor:pointer;padding:6px 2px;text-align:left">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
      Random fill empty seats
    </button>
    <div style="height:1px;background:var(--border);margin:6px 0 4px"></div>
    <button class="seat-cog-action" ${dis} onclick="resetSeating()" style="display:flex;align-items:center;gap:7px;width:100%;background:none;border:none;color:var(--red-deep);font-size:12.5px;font-weight:600;font-family:inherit;cursor:pointer;padding:6px 2px;text-align:left">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
      Reset all seating
    </button>${restoreRow}${restoreConfRow}
  </div>`;
}
function _seatToggleCog(e){
  if(e) e.stopPropagation();
  const m=document.getElementById('seat-cog-menu');
  if(!m) return;
  const showing=m.style.display!=='none' && m.style.display!=='';
  if(!showing) _closeFloatingMenus('seat-cog-menu');
  m.style.display=showing?'none':'block';
  if(!showing) _seatAttachCogCloser();
}
function _seatAttachCogCloser(){
  const close=(ev)=>{
    const menu=document.getElementById('seat-cog-menu');
    const wrap=document.getElementById('seat-cog-wrap');
    if(menu && wrap && !wrap.contains(ev.target)){ menu.style.display='none'; document.removeEventListener('click',close); }
  };
  setTimeout(()=>document.addEventListener('click',close),0);
}
// Reopen the cog popover after an action triggered a navigate() re-render (which rebuilds
// the menu closed). Mirrors the setSeatingTableStyle reopen pattern.
function _seatReopenCog(){
  setTimeout(()=>{ const m=document.getElementById('seat-cog-menu'); if(m){ m.style.display='block'; _seatAttachCogCloser(); } }, 40);
}
// Name-tag overlay collector. When active, _pip pushes its name pill HTML (already
// positioned in CANVAS coordinates, accounting for the table's translate+rotate) into
// this array instead of emitting it inline. The caller then renders them all in one
// layer on top of every table, so a pill from one table can never be hidden behind a
// neighbouring table. _pip uses table-local coords, so callers set the current table
// offset via _seatNameTagOrigin before rendering that table's pips.
let _seatNameTagSink=null;     // null = inline (default); array = collect
let _seatNameTagOrigin=null;   // {x,y,rot,w,h,scale} of the table currently rendering
function _pip(x,y,on,init,gid,rot,stagger,tid,si,up){
  const fs=Math.max(8,Math.round(SEAT_PIP*0.35));
  // Keep guest initials upright regardless of table rotation: the pip lives inside the
  // rotated .ftbl-rot wrapper, so counter-rotate the text span by -rot to cancel it out.
  const cr=(rot? `transform:rotate(${-rot}deg);`:'');
  // RSVP flag: when the Attending-only toggle is on, a seated guest who isn't attending
  // is shown tinted + dashed (gold for awaiting, red for declined) so the floorplan
  // matches the list view. Computed once and reused for the pip, initials, and name tag.
  let _rsvpWarn=null; // null | 'awaiting' | 'declined'
  if(on&&gid&&seatingAttendingOnly){
    const _wg=STATE.guests&&STATE.guests.find(x=>x.id===gid);
    if(_wg && _wg.rsvp!=='attending') _rsvpWarn=(_wg.rsvp==='declined')?'declined':'awaiting';
  }
  const _initColor = _rsvpWarn==='declined' ? '#8B0000' : (_rsvpWarn==='awaiting' ? '#7A6230' : '#fff');
  // PRINT path: render the initial in the flat name-overlay (upright, positioned by rotating
  // the pip centre around the table centre) so it behaves exactly like the name pills —
  // correct in both portrait and the 90°-rotated landscape page. EDITOR path keeps the
  // initial inside the rotated pip with a -rot counter-rotation.
  const _printInit = on && init && _seatNameTagSink && _seatNameTagOrigin;
  const inner = (on && init && !_printInit)
    ? `<span class="sp-pip-init" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-size:${fs}px;font-weight:700;color:${_initColor};letter-spacing:-0.5px;line-height:1;${cr}">${init}</span>`
    : '';
  if(_printInit){
    const o=_seatNameTagOrigin, sc=o.scale||1;
    let ipx=(x+SEAT_PIP/2)*sc, ipy=(y+SEAT_PIP/2)*sc; // pip CENTRE in scaled table space
    const ir=(o.rot||0)*Math.PI/180;
    if(ir){ const cx=o.w/2, cy=o.h/2, dx=ipx-cx, dy=ipy-cy; ipx=cx+dx*Math.cos(ir)-dy*Math.sin(ir); ipy=cy+dx*Math.sin(ir)+dy*Math.cos(ir); }
    const icax=o.x+ipx, icay=o.y+ipy; // canvas-space pip centre
    _seatNameTagSink.push(`<span class="sp-pip-init" style="position:absolute;left:${icax.toFixed(1)}px;top:${icay.toFixed(1)}px;transform:translate(-50%,-50%);font-family:Inter,sans-serif;font-size:${(fs*sc).toFixed(1)}px;font-weight:700;color:${_initColor};letter-spacing:-0.5px;line-height:1;pointer-events:none">${init}</span>`);
  }
  // EMPTY CHAIRS ARE DROP TARGETS TOO (v139). An occupied chair carries data-gid
  // (drag source, and drop-on-it to swap/replace). An empty chair carries data-seat
  // but NO data-gid — that absence is how _seatTargetAt() tells the two apart.
  // Head seats on long tables live OUTSIDE the array (t.headLeft/headRight) and are
  // not chair indices, so they pass tid/si undefined and stay non-droppable.
  const _isChair = (tid!==undefined && si!==undefined);
  // HTML5 drop handlers, for the POOL-CHIP drag (a separate system from the pointer
  // drag used by seated pips). Without these the chair is not a drop zone and the
  // event bubbles to the whole table, which is what made an unassigned guest land in
  // "the next free seat" instead of the chair you aimed at.
  const _dz = _isChair
    ? ` ondragover="_chairDragOver(event,'${tid}',${si})" ondragleave="_chairDragLeave(event)" ondrop="_chairDrop(event,'${tid}',${si})"`
    : '';
  const drag=(on&&gid) ? ` class="floor-seat" data-gid="${gid}"${_isChair?` data-tid="${tid}" data-seat="${si}"`:''}${_dz} title="Drag to move guest"`
           : (_isChair ? ` class="floor-seat floor-seat-empty" data-tid="${tid}" data-seat="${si}"${_dz}` : '');
  const cur=(on&&gid)?'cursor:grab;':'';
  // Full-name overlay: a small tag centred just under the pip, upright regardless of
  // table rotation. Anchored at the pip's CENTRE (the same anchor the print initial above
  // uses) and dropped straight down AFTER rotation, so it never swings around the pip.
  let nameTag='';
  const _nameMode=_seatNameMode();
  if(on&&gid&&_nameMode!=='off'){
    const g=STATE.guests&&STATE.guests.find(x=>x.id===gid);
    const nm=g?_seatPillName(g,_nameMode):'';
    if(nm){
      // ANCHOR AT THE PIP CENTRE, NOT ITS BOTTOM EDGE.
      // The old code anchored at (x+PIP/2, y+PIP) — the pip's bottom edge in TABLE-LOCAL
      // space — and then let the table's rotation carry that anchor around with everything
      // else. So "below the pip" rotated too: at 90 deg the pill sat to the pip's LEFT, at
      // 180 deg ABOVE it. Pills swung around their pips like clock hands and piled into each
      // other. Both the editor and the print path made the same mistake by different routes.
      // The offset must be applied AFTER rotation, in SCREEN space, so it always points down.
      const ax=x+SEAT_PIP/2, ay=y+SEAT_PIP/2; // pip CENTRE in table-local space
      // `up` = this chair sits ABOVE its table (bridal "Seats: Above"), so the pill has to
      // go above the chair, not below it — otherwise it lands on the table body. That was
      // exactly the overlap seen when the table was rotated 180 to fake a top table: the
      // chairs moved, the pill offset did not. DROP flips sign to reach the pip's TOP edge,
      // and the pill is then lifted by its own full height via translateY(-100%), so the
      // spacing works out identical to the downward case without measuring the pill.
      const DROP=(up?-1:1)*SEAT_PIP/2;        // centre -> near edge, applied post-rotation
      const trot=rot?`rotate(${-rot}deg) `:'';
      // Warning class + small badge appended to the name when the guest isn't attending.
      const _wcls=_rsvpWarn?` fnt-${_rsvpWarn}`:'';
      const _wbadge=_rsvpWarn?`<span class="fnt-badge">${_rsvpWarn==='declined'?'DECLINED':'AWAITING'}</span>`:'';
      // Stagger: on a horizontal row (bridal / long tables) alternate pills drop down a
      // row so long names clear their neighbours. Only needed in 'last' (full-name) mode —
      // 'first' (name + initial) is short enough to stay on one line.
      const dropY=(stagger&&_nameMode==='last')?14:3;
      // Gap is the SAME 3px (or 14px staggered) either way — above and below must look like
      // one design, not two. Upwards it is applied as a negative offset on top of the -100%.
      const _pillShift = up ? `translateY(calc(-100% - ${dropY}px))` : `translateY(${dropY}px)`;
      if(_seatNameTagSink && _seatNameTagOrigin){
        // PRINT path: inline the pill styling (print doc has no .floor-name-tag class)
        // and convert the pip's table-local anchor into CANVAS coordinates so the overlay
        // (which lives at the canvas root) places it correctly. Apply the table's scale,
        // then rotation about the table centre, then the table translate.
        const o=_seatNameTagOrigin;
        const sc=o.scale||1;
        let px=ax*sc, py=ay*sc;             // pip CENTRE, into scaled table space
        const r=(o.rot||0)*Math.PI/180;
        if(r){
          const cx=o.w/2, cy=o.h/2;
          const dx=px-cx, dy=py-cy;
          px=cx+dx*Math.cos(r)-dy*Math.sin(r);
          py=cy+dx*Math.sin(r)+dy*Math.cos(r);
        }
        // The drop is added AFTER the rotation, in canvas (screen) space, and scaled with
        // the table so it tracks the pip's rendered size.
        const cax=o.x+px, cay=o.y+py+DROP*sc;
        // The print tags live in a NON-rotated overlay layer, so they must NOT carry the
        // editor's -rot counter-rotation (which only cancels the rotated .ftbl-rot wrapper
        // the editor tags sit inside). Render them upright so every name reads horizontally
        // regardless of the table's rotation.
        _seatNameTagSink.push(`<span class="floor-name-tag${_wcls}" style="position:absolute;${_SEAT_NAME_PILL_CSS};left:${cax.toFixed(1)}px;top:${cay.toFixed(1)}px;transform:translateX(-50%) ${_pillShift};transform-origin:top center">${_escHtml(nm)}${_wbadge}</span>`);
      } else {
        // EDITOR path: keep the tag inline (moves with its table during drag) and let
        // the theme-aware .floor-name-tag class supply colours for light/dark mode.
        //
        // ⚠️ TWO SPANS, AND IT MUST BE TWO. A single span cannot do this job.
        // The pill needs `translateX(-50%)` to centre itself on its anchor, which forces
        // transform-origin to sit at the pill's own top-CENTRE — i.e. half the pill's WIDTH
        // across. Put `rotate(-rot)` on that same span and it pivots around the pill's box,
        // not around the anchor, so the counter-rotation MOVES the pill — by an amount that
        // depends on how long the guest's name is. (Measured in a real browser: 58px of drift
        // at 180°, and at 270° the pill lands ABOVE its pip.)
        //
        // So: an OUTER span of zero size, pinned at the pip centre, carries the rotation —
        // it has no width, so its origin and its anchor are the same point, and the rotation
        // can only un-tilt, never translate. The INNER span carries the pill and does the
        // centring and the drop, in the now-upright frame.
        const inner=`<span class="floor-name-tag${_wcls}" style="position:absolute;left:0;top:0;transform:translateX(-50%) translateY(${DROP.toFixed(1)}px) ${_pillShift};transform-origin:top center">${_escHtml(nm)}${_wbadge}</span>`;
        nameTag=`<span style="position:absolute;left:${ax.toFixed(1)}px;top:${ay.toFixed(1)}px;width:0;height:0;transform:${trot||''};transform-origin:center center;pointer-events:none;z-index:40">${inner}</span>`;
      }
    }
  }
  const _pipFill = !on ? 'background:transparent;border:1.5px solid var(--border)'
    : (_rsvpWarn==='declined' ? 'background:rgba(180,60,60,.20);border:1.5px dashed rgba(180,60,60,.55)'
      : _rsvpWarn==='awaiting' ? 'background:rgba(160,130,70,.32);border:1.5px dashed #A08246'
      : 'background:var(--gold-deep);border:1.5px solid var(--border)');
  return `<span${drag} style="position:absolute;left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${SEAT_PIP}px;height:${SEAT_PIP}px;border-radius:50%;${cur}${_pipFill}"${on?' data-pipon="1"':''}>${inner}</span>${nameTag}`;
}
function _pipC(cx,cy,on,init,gid,rot,stagger,tid,si,up){ const h=SEAT_PIP/2; return _pip(cx-h,cy-h,on,init,gid,rot,stagger,tid,si,up); }
function _pipsRound(n,filled,S,inits,gids,rot,tid){
  const c=S/2, PR=SEAT_PIP/2, r=S/2-10+PR, out=[]; // chairs touching the visible table edge (10px body inset)
  // Occupancy is gids[i] — NOT i<filled. The array is sparse: chair 5 can be full
  // while 0-4 are empty. `filled` is now only a count, for the label.
  for(let i=0;i<n;i++){ const a=(-90+i*360/n)*Math.PI/180; out.push(_pipC(c+r*Math.cos(a), c+r*Math.sin(a), !!(gids&&gids[i]), inits&&inits[i]||null, gids&&gids[i]||null, rot, false, tid, i)); }
  return out.join('');
}
function _pipsLong(n,filled,W,H,inits,t,gids,rot,tid){
  const PR=SEAT_PIP/2, LM=40, GAP=-9; // chairs touching the visible table edge (9px body inset)
  const TY=-PR-GAP, BY=H+PR+GAP; // outside top/bottom
  const hasL=!!(t&&t.headLeft!==undefined);
  const hasR=!!(t&&t.headRight!==undefined);
  const longN=n-(hasL?1:0)-(hasR?1:0);
  const per=Math.ceil(longN/2), m=longN-per, out=[];
  const getInit=gid=>{ if(!gid) return null; const g=STATE&&STATE.guests&&STATE.guests.find(x=>x.id===gid); return g?initials(g.name):null; };
  const xAt=(i,cnt)=>LM+(cnt>1?i*(W-2*LM)/(cnt-1):(W-2*LM)/2);
  if(hasL) out.push(_pipC(-PR-GAP, H/2, !!t.headLeft, getInit(t.headLeft), t.headLeft||null, rot, 0));
  for(let i=0;i<per;i++) out.push(_pipC(xAt(i,per), TY, !!(gids&&gids[i]), inits&&inits[i]||null, (gids&&gids[i])||null, rot, i%2, tid, i));
  for(let i=0;i<m;i++) out.push(_pipC(xAt(i,m), BY, !!(gids&&gids[per+i]), inits&&inits[per+i]||null, (gids&&gids[per+i])||null, rot, i%2, tid, per+i));
  if(hasR) out.push(_pipC(W+PR+GAP, H/2, !!t.headRight, getInit(t.headRight), t.headRight||null, rot, 0));
  return out.join('');
}
// Theatre: every seat along ONE side (front/bottom edge) — chairs outside below table.
// Which side a one-sided (bridal/theatre) table seats its party. 'below' is the default
// and the pre-existing behaviour, so every plan built before this option keeps its exact
// layout — only a table explicitly switched to 'above' moves.
function _seatSide(t){ return (t && t.seatSide === 'above') ? 'above' : 'below'; }
function _pipsTheatre(n,filled,W,H,inits,gids,rot,tid,t){
  const PR=SEAT_PIP/2, LM=Math.max(_PB,20), GAP=-8; // chairs touching the visible table edge (8px inset)
  const up=_seatSide(t)==='above';
  const BY=up ? (-PR-GAP) : (H+PR+GAP); // outside above / outside below
  const out=[]; const xAt=(i)=>LM+(n>1?i*(W-2*LM)/(n-1):(W-2*LM)/2);
  for(let i=0;i<n;i++){ out.push(_pipC(xAt(i), BY, !!(gids&&gids[i]), inits&&inits[i]||null, (gids&&gids[i])||null, rot, i%2, tid, i, up)); }
  return out.join('');
}
function _pipsSquare(n,filled,S,inits,gids,rot,tid){
  const PR=SEAT_PIP/2, GAP=-9; // chairs touching the visible table edge (9px body inset)
  const base=Math.floor(n/4), extra=n%4, cnt=[base,base,base,base];
  for(let i=0;i<extra;i++) cnt[i]++;
  let out=[], k=0;
  const at=(f)=> _PB + f*(S-2*_PB);
  const place=(count,fn)=>{ for(let i=0;i<count;i++){ const f=count>1?i/(count-1):0.5; fn(f,!!(gids&&gids[k]),inits&&inits[k]||null,(gids&&gids[k])||null,k); k++; } };
  place(cnt[0],(f,on,ini,gid,si)=>out.push(_pipC(at(f), -PR-GAP, on, ini, gid, rot, false, tid, si)));   // top outside
  place(cnt[1],(f,on,ini,gid,si)=>out.push(_pipC(S+PR+GAP, at(f), on, ini, gid, rot, false, tid, si)));  // right outside
  place(cnt[2],(f,on,ini,gid,si)=>out.push(_pipC(at(f), S+PR+GAP, on, ini, gid, rot, false, tid, si)));  // bottom outside
  place(cnt[3],(f,on,ini,gid,si)=>out.push(_pipC(-PR-GAP, at(f), on, ini, gid, rot, false, tid, si)));   // left outside
  return out.join('');
}
function _conflictBadge(){
  return `<span style="position:absolute;top:-6px;right:-6px;width:17px;height:17px;border-radius:50%;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;z-index:2">!</span>`;
}
function _separationBadge(){
  return `<span title="A couple is split across tables" style="position:absolute;top:-8px;left:-8px;width:20px;height:20px;border-radius:50%;background:var(--cream);border:1.5px solid var(--sep-ink);color:var(--sep-ink);display:flex;align-items:center;justify-content:center;z-index:2"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/><path d="M2 20v-1a4 4 0 0 1 4-4h4"/><circle cx="8" cy="8" r="3.4"/></svg></span>`;
}
function _floorLabel(t,filled){
  const full=filled>=t.seats;
  const rot=((t&&t.rotation)||0);
  const norm=((rot%360)+360)%360;
  const isBar=(t&&(t.shape==='long'||t.shape==='theatre'));
  let counter;
  if(isBar){
    // Long/bridal: the label rotates WITH the table (it lives inside the rotated
    // wrapper, so no counter-rotation needed). The only correction is a 180° flip
    // when the table is in the upside-down half (90°–270°) so the text stays upright.
    counter = (norm>90 && norm<270) ? 180 : 0;
  } else {
    // Round/square: counter-rotate fully so the label is always horizontally upright.
    counter = -rot;
  }
  const lblTransform = counter ? `transform:rotate(${counter}deg);` : '';
  // Counts are hidden only when rendering FOR PRINT and the option is off. `_seatNameTagSink`
  // is the print marker already used by the name pills — reusing it means the two can never
  // disagree about which pass is running. The on-screen editor is untouched: the counts are
  // the whole point there. With the line gone the name is the only child, so the flex
  // centring already in the wrapper keeps it optically centred — the table does not resize.
  const hideCount = (_seatNameTagSink !== null) && !_seatingCounts;
  const countLine = hideCount ? '' :
    `<div class="fp-count" style="font-size:9.5px;font-weight:500;margin-top:1px;color:${full?'var(--green)':'var(--muted)'}">${filled}/${t.seats}${full?' ✓':''}</div>`;
  return `<div style="text-align:center;line-height:1.12;padding:0 4px;${lblTransform}">
    <div style="font-family:'Cormorant Garamond',serif;font-size:12.5px;font-weight:600;color:var(--ink)">${_escHtml(t.name||'Table')}</div>
    ${countLine}
  </div>`;
}
function _floorPips(t,shape,filled,conflict){
  const ring=conflict?'var(--red)':'var(--border)';
  const sz=_tableBaseSize(t);
  // Build initials array from seating order
  // SPARSE: gids may contain holes. map() preserves them (hole -> '' initial), so
  // index === chair number all the way down into the pip renderers.
  const gids=_seatArr(t.id);
  const inits=gids.map(gid=>{ if(!gid) return ''; const g=STATE.guests.find(x=>x.id===gid); return g?initials(g.name):''; });
  let pips, inset, radius;
  const _rot=t.rotation||0;
  if(shape==='long'){ pips=_pipsLong(t.seats,filled,sz.w,sz.h,inits,t,gids,_rot,t.id); inset='9px'; radius='12px'; }
  else if(shape==='square'){ pips=_pipsSquare(t.seats,filled,sz.w,inits,gids,_rot,t.id); inset='9px'; radius='14px'; }
  else if(shape==='theatre'){ pips=_pipsTheatre(t.seats,filled,sz.w,sz.h,inits,gids,_rot,t.id,t); inset='9px 9px 8px 9px'; radius='12px'; }
  else { pips=_pipsRound(t.seats,filled,sz.w,inits,gids,_rot,t.id); inset='10px'; radius='50%'; }
  return pips+
    `<div style="position:absolute;inset:${inset};background:var(--cream);border:1.5px solid ${ring};border-radius:${radius};display:flex;align-items:center;justify-content:center;overflow:hidden">${_floorLabel(t,filled)}</div>`;
}
function _ringBar(t,shape,filled,conflict){
  const pct=Math.round((filled/Math.max(1,t.seats))*100);
  const radius=shape==='square'?'14px':'12px';
  const col=conflict?'var(--red)':'var(--gold-deep)';
  return `<div style="position:absolute;inset:0;background:var(--cream);border:1.5px solid ${conflict?'var(--red)':'var(--border)'};border-radius:${radius};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 10px;overflow:hidden">
      ${_floorLabel(t,filled)}
      <div style="width:78%;height:4px;border-radius:2px;background:var(--border);overflow:hidden;margin-top:4px"><div style="width:${pct}%;height:100%;background:${col}"></div></div>
    </div>`;
}
function _floorRing(t,shape,filled,conflict){
  if(shape!=='round') return _ringBar(t,shape,filled,conflict);
  const deg=Math.round((filled/Math.max(1,t.seats))*360);
  const ring=conflict?'var(--red)':'var(--gold-deep)';
  return `<div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(${ring} ${deg}deg,var(--border) ${deg}deg)"></div>
    <div style="position:absolute;inset:7px;border-radius:50%;background:var(--cream);border:1px solid ${conflict?'var(--red)':'var(--border)'};display:flex;align-items:center;justify-content:center;overflow:hidden">${_floorLabel(t,filled)}</div>`;
}
function _floorTableHtml(t,style,cf,sep){
  const base=_tableBaseSize(t), s=(t.scale||1);
  const w=Math.round(base.w*s), h=Math.round(base.h*s);
  const shape=t.shape||'round';
  const filled=_seatCount(t.id);
  const conflict=cf.tableHas.has(t.id);
  const separated=!!(sep&&sep.tableHas.has(t.id));
  const inner=(style==='ring')?_floorRing(t,shape,filled,conflict):_floorPips(t,shape,filled,conflict);
  const rot=t.rotation||0;
  // The handle normally floats above the table on a short stalk. A bridal table seating
  // its party ABOVE puts chairs and name pills in exactly that space, so the handle landed
  // on top of the names. Flip it to the empty side instead — the side the seats are not on
  // is always free, which is the whole point of a one-sided table.
  const _handleBelow = (shape==='theatre' && _seatSide(t)==='above');
  const _hTop = _handleBelow ? (h+14) : -34;      // handle box top
  const _sTop = _handleBelow ? (h+6)  : -26;      // stalk top
  const rotHandle=`<span class="floor-rotate" data-id="${t.id}" title="Drag to rotate" style="position:absolute;left:${Math.round(w/2)-10}px;top:${_hTop}px;width:20px;height:20px;border-radius:50%;background:var(--cream);border:1.5px solid var(--gold-deep);display:flex;align-items:center;justify-content:center;cursor:grab;font-size:12px;color:var(--gold-deep);user-select:none;z-index:3">↺</span><span style="position:absolute;left:${Math.round(w/2)-0.5}px;top:${_sTop}px;width:1px;height:20px;background:var(--border);opacity:.5;pointer-events:none"></span>`;
  /* ftbl-rot is a separate inner wrapper that carries the rotation transform.
     floor-table itself stays transform-free so left/top drag never fights GPU compositing. */
  return `<div class="floor-table" data-kind="table" data-id="${t.id}" id="ftab-${t.id}"
    style="left:${t.x||0}px;top:${t.y||0}px;width:${w}px;height:${h}px"
    ondragover="event.preventDefault()" ondrop="_floorDropOnTable(event,'${t.id}')">
    <div class="ftbl-rot" style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform:rotate(${rot}deg);transform-origin:center center">
      <div class="ftbl-scale" style="position:absolute;left:0;top:0;width:${base.w}px;height:${base.h}px;transform:scale(${s});transform-origin:0 0">${inner}</div>
      ${rotHandle}
    </div>
    ${conflict?_conflictBadge():''}
    ${separated?_separationBadge():''}
    <span class="floor-resize" data-id="${t.id}" data-kind="table" title="Drag to resize"><svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M9 3 L3 9 M9 6.5 L6.5 9"/></svg></span>
  </div>`;
}
// A decor item renders as one of three things. Zones (dance floor, bar…) keep the dashed
// hatched box. Doorways draw line work — they mark a point on a wall, so a filled area
// would misrepresent them. Text is bare words with no box at all, because a label that
// comes with a border is a zone, not a label.
function _decorBody(d,def,w,h,icon,lblTransform){
  if(def.isText){
    const st=FTEXT_STYLES[d.tstyle]||FTEXT_STYLES.caps;
    // Scale the type with the item's height so the resize grip resizes the TEXT. 40 is the
    // default height the sizes above are quoted at.
    const fs=Math.max(7, st.size*(h/40));
    const txt=(d.label==null||d.label==='')?'Double-tap to edit':d.label;
    const dim=(d.label==null||d.label==='')?'opacity:.45;':'';
    return `<div class="ftxt-wrap" style="${lblTransform}">
      <span class="ftxt ${st.cls}" style="font-size:${fs.toFixed(1)}px;${dim}">${_escHtml(txt)}</span></div>`;
  }
  if(def.glyph) return `<div class="fdoor">${_doorSvg(def.glyph,w,h)}</div>`;
  return `<div class="decor-zone"><div class="decor-inner" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;${lblTransform}">${icon}<span class="decor-lbl">${_escHtml(def.label)}</span></div></div>`;
}
// Everything about how a decor item LOOKS, in one place. The print document used to carry
// its own hardcoded copy of this — a dashed hatched box with `def.label` inside — which is
// why doorways printed as boxes reading "DOORWAY" and a text label printed the literal word
// "TEXT" instead of the user's words, while the editor and the PNG showed them correctly.
// Three renderers, two of them right. Both callers now go through here, so a new decor kind
// cannot be added to one and forgotten in the other.
function _decorGeom(d){
  const def=DECOR_DEFS[d.type]||{label:d.label||'Area',w:120,h:56};
  const w=d.w||def.w, h=d.h||def.h;
  const icon=(h>=46)?(DECOR_ICONS[d.type]||''):'';
  const rot=d.rotation||0;
  // Area label rotates WITH the zone (it's inside the rotated wrapper). Only flip 180°
  // when the zone is in the upside-down half (90°–270°) so the text stays upright.
  const norm=((rot%360)+360)%360;
  const counter = (norm>90 && norm<270) ? 180 : 0;
  const lblTransform = counter ? `transform:rotate(${counter}deg);` : '';
  return {def,w,h,icon,rot,lblTransform};
}
function _floorDecorHtml(d){
  const g=_decorGeom(d), def=g.def, w=g.w, h=g.h, icon=g.icon, rot=g.rot, lblTransform=g.lblTransform;
  const rotHandle=`<span class="floor-rotate" data-id="${d.id}" data-kind="decor" title="Drag to rotate" style="position:absolute;left:${Math.round(w/2)-10}px;top:-34px;width:20px;height:20px;border-radius:50%;background:var(--cream);border:1.5px solid var(--gold-deep);display:flex;align-items:center;justify-content:center;cursor:grab;font-size:12px;color:var(--gold-deep);user-select:none;z-index:4">↺</span><span style="position:absolute;left:${Math.round(w/2)-0.5}px;top:-26px;width:1px;height:20px;background:var(--border);opacity:.5;pointer-events:none"></span>`;
  return `<div class="floor-decor" data-kind="decor" data-id="${d.id}" id="fdec-${d.id}"
    style="left:${d.x||0}px;top:${d.y||0}px;width:${w}px;height:${h}px">
    <div class="fdec-rot" style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform:rotate(${rot}deg);transform-origin:center center">
      ${_decorBody(d,def,w,h,icon,lblTransform)}
      ${rotHandle}
    </div>
    ${def.isText?`<span class="decor-edit" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();openFloorTextEditor('${d.id}')" title="Edit text" style="position:absolute;top:-7px;right:13px;width:16px;height:16px;border-radius:50%;background:var(--panel,var(--cream));border:1px solid var(--border);color:var(--gold-deep);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:5"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></span>`:''}
    <span class="decor-x" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();removeDecor('${d.id}')" style="position:absolute;top:-7px;right:-7px;width:16px;height:16px;border-radius:50%;background:var(--panel,var(--cream));border:1px solid var(--border);color:var(--muted);display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;z-index:5">×</span>
    <span class="floor-resize" data-id="${d.id}" data-kind="decor" title="Drag to resize"><svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M9 3 L3 9 M9 6.5 L6.5 9"/></svg></span>
  </div>`;
}

function _floorDropOnTable(e,id){ e.preventDefault(); e.stopPropagation(); if(dragGroupIds||dragSeatId) dropOnTable(e,id); }

// ═══ POOL CHIP -> A SPECIFIC CHAIR (v140) ═══════════════════════════════════
// Pool chips are HTML5-draggable (`ondragstart="dragSeat(...)"`), which is a wholly
// separate mechanism from the pointer-event drag that moves a SEATED pip. v139 taught
// the pointer system about chairs and left this one behind: the only drop zone was the
// table as a whole, so a chip aimed at chair 6 landed in whatever chair happened to be
// free, and on a full table it silently went nowhere.
function _chairDragOver(e,tid,si){
  if(!dragSeatId&&!dragGroupIds) return;  // not a seat drag — leave it alone
  e.preventDefault(); e.stopPropagation();
  const el=e.currentTarget;
  document.querySelectorAll('.floor-seat.seat-drop-hot').forEach(x=>x.classList.remove('seat-drop-hot'));
  el.classList.add('seat-drop-hot');
  const c=document.getElementById('floor-canvas');
  if(c) c.classList.add('seat-dragging');
}
function _chairDragLeave(e){
  if(e.currentTarget) e.currentTarget.classList.remove('seat-drop-hot');
}
// Drop onto a chair. If someone is already sitting there they are REPLACED and go to
// the Unassigned pool — including on a full table, where that is the only way to get a
// guest in at all. A guest dropped onto their own chair is a no-op.
function _chairDrop(e,tid,si){
  if(dragGroupIds){
    e.preventDefault(); e.stopPropagation(); _floorSeatHighlightOff();
    // Seat lead member at the target chair, rest fill free seats
    const [lead,...rest]=dragGroupIds;
    const arr=_seatArr(tid); const occupant=arr[si]||null;
    if(occupant&&occupant!==lead){ _seatClear(tid,occupant); }
    _seatClearAll(lead); _seatAt(tid,si,lead);
    rest.forEach(gid=>{ if(!_seatIds(tid).includes(gid)) _seatFirstFree(tid,gid); });
    dragGroupIds=null; dragSeatId=null; dragFromTable=null; saveToStorage(); navigate('seating'); return;
  }
  if(!dragSeatId) return;
  e.preventDefault(); e.stopPropagation();
  _floorSeatHighlightOff();
  const gid=dragSeatId, from=dragFromTable;
  const arr=_seatArr(tid);
  const occupant=arr[si]||null;
  if(occupant===gid){ dragSeatId=null; dragFromTable=null; navigate('seating'); return; }
  // Evict the occupant to the pool (their chair is about to be taken).
  if(occupant){
    const tt=STATE.tables.find(x=>x.id===tid);
    if(tt){ if(tt.headLeft===occupant) tt.headLeft=null; if(tt.headRight===occupant) tt.headRight=null; }
    _seatClear(tid,occupant);
  }
  // Lift the incoming guest out of wherever they were (pool = nowhere).
  if(from){
    const ft=STATE.tables.find(x=>x.id===from);
    if(ft){ if(ft.headLeft===gid) ft.headLeft=null; if(ft.headRight===gid) ft.headRight=null; }
  }
  _seatClearAll(gid);
  const b=_seatArr(tid);
  while(b.length<=si) b.push(null);
  b[si]=gid;
  STATE.seating[tid]=b;
  if(from) _seatTrim(from);
  dragSeatId=null; dragFromTable=null;
  saveToStorage(); navigate('seating');
}

function addDecor(type){
  if(!Array.isArray(STATE.settings.floorDecor)) STATE.settings.floorDecor=[];
  const def=DECOR_DEFS[type]||{w:120,h:56};
  const n=STATE.settings.floorDecor.length;
  const item={id:'d'+Date.now(),type,x:24+n*18,y:24+n*18,w:def.w,h:def.h};
  if(def.isText){ item.label=''; item.tstyle='caps'; }
  STATE.settings.floorDecor.push(item);
  saveToStorage(); closeModalDirect(); navigate('seating');
}
// ── Floorplan text labels: add / edit ───────────────────────────────────────
// `id` null = creating a new label, otherwise editing an existing one. Both go through
// the same dialog so the words and the style are always changed the same way, and a
// label can never exist on the plan without a way to fix its text.
function openFloorTextEditor(id){
  const d = id ? (STATE.settings.floorDecor||[]).find(x=>x.id===id) : null;
  const cur = d ? (d.label||'') : '';
  const curStyle = (d && d.tstyle) || 'caps';
  const styleBtns = Object.keys(FTEXT_STYLES).map(k=>{
    const st=FTEXT_STYLES[k];
    return `<button type="button" class="ftxt-pick${k===curStyle?' on':''}" data-style="${k}"
      onclick="_floorTextPick('${k}')"
      style="flex:1;min-width:104px;padding:9px 10px;border-radius:9px;border:2px solid ${k===curStyle?'var(--gold)':'var(--border)'};background:transparent;cursor:pointer;text-align:center">
      <span class="ftxt ${st.cls}" style="font-size:${Math.min(15,st.size)}px">Aa</span>
      <div style="font-size:10.5px;color:var(--muted);margin-top:4px">${st.label}</div>
    </button>`;
  }).join('');
  openModal(id?'Edit text':'Add text to the floorplan',
    `<div class="form-label">Text</div>
     <input class="form-input" id="ftxt-input" maxlength="120" value="${_escAttr(cur)}" placeholder="e.g. Ceremony lawn"/>
     <div class="form-label" style="margin-top:12px">Style</div>
     <div id="ftxt-styles" style="display:flex;gap:8px;flex-wrap:wrap">${styleBtns}</div>`,
    `<button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-primary" onclick="_floorTextSave(${id?`'${id}'`:'null'})">${id?'Save':'Add'}</button>`);
  setTimeout(()=>{ const i=document.getElementById('ftxt-input'); if(i){ i.focus(); i.select(); } }, 60);
}
let _floorTextStyle='caps';
function _floorTextPick(k){
  _floorTextStyle=k;
  document.querySelectorAll('#ftxt-styles .ftxt-pick').forEach(b=>{
    const on=b.dataset.style===k;
    b.classList.toggle('on',on);
    b.style.borderColor = on ? 'var(--gold)' : 'var(--border)';
  });
}
function _floorTextSave(id){
  const inp=document.getElementById('ftxt-input');
  const txt=(inp&&inp.value||'').trim();
  // An empty label would be an invisible object on the plan that still catches drags —
  // refuse rather than create something the user cannot see to delete.
  if(!txt){ _showInfoToast('Type some text first.', null, null); if(inp) inp.focus(); return; }
  if(!Array.isArray(STATE.settings.floorDecor)) STATE.settings.floorDecor=[];
  if(id){
    const d=STATE.settings.floorDecor.find(x=>x.id===id);
    if(d){ d.label=txt; d.tstyle=_floorTextStyle; }
  } else {
    const def=DECOR_DEFS.text, n=STATE.settings.floorDecor.length;
    STATE.settings.floorDecor.push({id:'d'+Date.now(),type:'text',label:txt,tstyle:_floorTextStyle,
      x:24+n*18,y:24+n*18,w:def.w,h:def.h});
  }
  saveToStorage(); closeModalDirect(); navigate('seating');
}
// Opening the editor must start from the label's OWN style, not whatever was picked last.
const _openFloorTextEditorBase=openFloorTextEditor;
openFloorTextEditor=function(id){
  const d = id ? (STATE.settings.floorDecor||[]).find(x=>x.id===id) : null;
  _floorTextStyle = (d && d.tstyle) || 'caps';
  return _openFloorTextEditorBase(id);
};

function removeDecor(id){
  if(_floorLayoutLocked()) return;
  STATE.settings.floorDecor=(STATE.settings.floorDecor||[]).filter(d=>d.id!==id);
  saveToStorage(); navigate('seating');
}
function openAddDecor(){
  const order=['text','door','doubledoor','threshold','dance','stage','entrance','bar','lectern','cake','gift','photo','buffet','restroom'];
  const btns=order.filter(k=>DECOR_DEFS[k]).map(k=>{
    const def=DECOR_DEFS[k];
    // Text can't be dropped blind — an empty label is invisible on the plan — so it opens
    // its editor first and only lands once there are words to show.
    const act = (k==='text') ? `openFloorTextEditor(null)` : `addDecor('${k}')`;
    return `<button class="btn btn-outline" onclick="${act}" style="display:flex;align-items:center;gap:8px;justify-content:flex-start;text-align:left;padding:10px 12px">
      <span style="display:inline-flex;color:var(--gold-deep);flex-shrink:0">${DECOR_ICONS[k]||''}</span>
      <span style="font-size:13px">${_escHtml(def.label)}</span>
    </button>`;
  }).join('');
  openModal('Add to Floor',
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:2px 0">${btns}</div>`,
    `<button class="btn btn-outline" onclick="closeModalDirect()">Close</button>`);
}

// ── Pointer drag (tables & décor) ──
// Number of fingers currently on the floorplan viewport. Updated by the viewport's
// touchstart/touchend listeners (wired in _wireFloorZoom). Used to suppress table/area/
// seat dragging during a two-finger pinch/pan gesture.
let _floorTouchCount=0;
function _floorActiveTouches(){ return _floorTouchCount; }
// Abort an in-progress single-pointer drag WITHOUT committing it: revert the element to
// where it started and discard the pending drag. Called when a second finger lands, so a
// pinch/pan can't accidentally relocate a table or area.
function _floorAbortDrag(){
  const d=_floorDrag; if(!d){ return; }
  _floorDrag=null;
  _floorSeatHighlightOff();   // pinch/pointercancel must not leave the chairs lit
  // Seat drag: remove the floating ghost and restore the source pip.
  if(d.mode==='seat'){
    if(d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
    if(d.pip) d.pip.style.opacity='';
    const _pool=document.getElementById('seating-pool'); if(_pool) _pool.classList.remove('pool-drop-active');
    return;
  }
  // Move/scale/resize/rotate: revert the element's inline style to its pre-drag values
  // directly (no navigate/re-render, which would rebuild the viewport and break the
  // active pinch gesture). Nothing was saved to the model, so this fully undoes the drag.
  const el=d.el;
  if(el){
    if(d.mode==='move'){
      if(d.origLeft!=null) el.style.left=d.origLeft+'px';
      if(d.origTop!=null) el.style.top=d.origTop+'px';
    } else if(d.mode==='resize'){
      if(d.origW!=null) el.style.width=d.origW+'px';
      if(d.origH!=null) el.style.height=d.origH+'px';
      if(d.rot){ if(d.origW!=null) d.rot.style.width=d.origW+'px'; if(d.origH!=null) d.rot.style.height=d.origH+'px'; }
    } else if(d.mode==='tscale'){
      const s=d.origScale!=null?d.origScale:1;
      if(d.baseW!=null) el.style.width=Math.round(d.baseW*s)+'px';
      if(d.baseH!=null) el.style.height=Math.round(d.baseH*s)+'px';
      if(d.wrap) d.wrap.style.transform='scale('+s+')';
      if(d.rot){ if(d.baseW!=null) d.rot.style.width=Math.round(d.baseW*s)+'px'; if(d.baseH!=null) d.rot.style.height=Math.round(d.baseH*s)+'px'; }
    } else if(d.mode==='rotate'){
      const rotEl=d.rotEl||el;
      if(rotEl) rotEl.style.transform=`rotate(${d.origRot||0}deg)`;
    }
  }
}
function _floorPointerDown(e){
  // When Ctrl/⌘ is held, the gesture is a canvas pan — don't start moving the table/area.
  if(e.ctrlKey||e.metaKey) return;
  const _kindNow=e.currentTarget&&e.currentTarget.dataset?e.currentTarget.dataset.kind:'';
  // Locked handling for tables & areas:
  //  - Layout locked: a TABLE can still be tapped to open its seat manager (you can
  //    still seat guests in layout-lock), but it can't be dragged. Areas (décor) do
  //    nothing. Fully locked: nothing at all.
  if(_floorLayoutLocked()){
    if(_kindNow==='table' && !_floorAllLocked()){
      _floorDrag={ mode:'move', el:e.currentTarget, kind:'table', id:e.currentTarget.dataset.id,
        startX:e.clientX, startY:e.clientY, moved:false, locked:true };
      try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(_){}
      return;
    }
    return;
  }
  // Multi-touch: if a second finger is already down, this is a pinch/pan gesture, not a
  // table move — don't start dragging (and abort any drag the first finger began).
  if(_floorActiveTouches()>=2 && e.pointerType==='touch'){ _floorAbortDrag(); return; }
  const el=e.currentTarget;
  const canvas=document.getElementById('floor-canvas'); if(!canvas) return;
  const cr=canvas.getBoundingClientRect();
  const kind=el.dataset.kind, id=el.dataset.id;
  let rotation=0;
  if(kind==='decor'){ const dc=(STATE.settings.floorDecor||[]).find(x=>x.id===id); rotation=(dc&&dc.rotation)||0; }
  else { const t=(STATE.tables||[]).find(x=>x.id===id); rotation=(t&&t.rotation)||0; }
  _floorDrag={ mode:'move', el, kind, id,
    startX:e.clientX, startY:e.clientY,
    origLeft:parseFloat(el.style.left)||0, origTop:parseFloat(el.style.top)||0,
    rotation,
    cw:_floorCW||cr.width, ch:_floorCH||cr.height, moved:false };
  try{ el.setPointerCapture(e.pointerId); }catch(_){}
  e.preventDefault();
}
// Resize handle — décor (free w/h) or tables (uniform scale).
function _floorResizeDown(e){
  e.stopPropagation();
  if(_floorLayoutLocked()) return;
  if(_floorActiveTouches()>=2 && e.pointerType==='touch'){ _floorAbortDrag(); return; }
  const handle=e.currentTarget, id=handle.dataset.id, kind=handle.dataset.kind;
  const el=document.getElementById((kind==='table'?'ftab-':'fdec-')+id);
  const canvas=document.getElementById('floor-canvas'); if(!el||!canvas) return;
  const cr=canvas.getBoundingClientRect();
  _floorDrag={ mode:(kind==='table'?'tscale':'resize'), el, kind, id,
    startX:e.clientX, startY:e.clientY,
    origW:el.offsetWidth, origH:el.offsetHeight,
    left:parseFloat(el.style.left)||0, top:parseFloat(el.style.top)||0,
    cw:_floorCW||cr.width, ch:_floorCH||cr.height };
  if(kind==='table'){
    const t=STATE.tables.find(x=>x.id===id)||{}; const base=_tableBaseSize(t);
    _floorDrag.baseW=base.w; _floorDrag.baseH=base.h; _floorDrag.origScale=(t.scale||1);
    _floorDrag.wrap=el.querySelector('.ftbl-scale');
    _floorDrag.rot=el.querySelector('.ftbl-rot');
    _floorDrag.s=_floorDrag.origScale;
  } else {
    _floorDrag.rot=el.querySelector('.fdec-rot');
  }
  try{ handle.setPointerCapture(e.pointerId); }catch(_){}
  e.preventDefault();
}
function _floorPointerMove(e){
  if(!_floorDrag) return;
  const d=_floorDrag;
  if(d.mode==='seat'){
    if(d.locked) return; // fully locked: a locked seat "drag" never moves
    if(Math.abs(e.clientX-d.startX)>3||Math.abs(e.clientY-d.startY)>3){
      if(!d.moved) _floorSeatHighlightOn();   // first real movement wakes the empty chairs
      d.moved=true;
    }
    if(d.ghost){ d.ghost.style.left=(e.clientX-SEAT_PIP/2)+'px'; d.ghost.style.top=(e.clientY-SEAT_PIP/2)+'px'; }
    // Light up the Unassigned pool when the pointer hovers it, so it reads as a drop target.
    if(d.moved){
      const pool=document.getElementById('seating-pool');
      if(pool){
        const overPool=!!(d.ghost? (function(){ d.ghost.style.display='none'; const el=document.elementFromPoint(e.clientX,e.clientY); d.ghost.style.display=''; return el&&el.closest&&el.closest('#seating-pool'); })() : pool.contains(document.elementFromPoint(e.clientX,e.clientY)));
        pool.classList.toggle('pool-drop-active', !!overPool);
      }
      // Mark the chair under the cursor — empty (place here) or occupied (swap/replace).
      const tgt=_seatTargetAt(e.clientX,e.clientY,null);
      document.querySelectorAll('.floor-seat.seat-drop-hot').forEach(el=>el.classList.remove('seat-drop-hot'));
      if(tgt&&(tgt.kind==='emptySeat'||(tgt.kind==='seat'&&tgt.gid&&tgt.gid!==d.gid))){
        const sel = tgt.kind==='emptySeat'
          ? `.floor-seat-empty[data-tid="${tgt.tid}"][data-seat="${tgt.idx}"]`
          : `.floor-seat[data-gid="${tgt.gid}"]`;
        const el=document.querySelector(sel);
        if(el) el.classList.add('seat-drop-hot');
      }
    }
    return;
  }
  if(d.mode==='rotate'){
    const ang=Math.atan2(e.clientY-d.centerY, e.clientX-d.centerX)*180/Math.PI;
    let rot=d.origRot+(ang-d.startAngle);
    if(e.shiftKey) rot=Math.round(rot/15)*15;
    rot=((rot%360)+360)%360;
    const rotEl=d.rotEl||d.el;
    rotEl.style.transform=`rotate(${rot}deg)`;
    d.currentRot=rot;
    return;
  }
  const fs=_floorFitScale||1;
  const dx=(e.clientX-d.startX)/fs, dy=(e.clientY-d.startY)/fs;
  if(d.mode==='tscale'){
    const diag=Math.hypot(d.baseW,d.baseH);
    const proj=(dx*d.baseW + dy*d.baseH)/diag;       // movement along the table's diagonal
    let s=Math.max(0.6, Math.min(2.6, d.origScale + proj/diag));
    d.s=s;
    d.el.style.width=Math.round(d.baseW*s)+'px';
    d.el.style.height=Math.round(d.baseH*s)+'px';
    if(d.wrap) d.wrap.style.transform='scale('+s+')';
    if(d.rot){ d.rot.style.width=Math.round(d.baseW*s)+'px'; d.rot.style.height=Math.round(d.baseH*s)+'px'; }
    return;
  }
  if(d.mode==='resize'){
    let nw=Math.max(70, Math.min(d.origW+dx, d.cw-d.left));
    let nh=Math.max(40, Math.min(d.origH+dy, d.ch-d.top));
    d.el.style.width=nw+'px'; d.el.style.height=nh+'px';
    if(d.rot){ d.rot.style.width=nw+'px'; d.rot.style.height=nh+'px'; }
    return;
  }
  if(d.locked) return; // layout-locked table: tap-to-open only, never moves
  if(Math.abs(dx)>3||Math.abs(dy)>3) d.moved=true;
  const w=d.el.offsetWidth, h=d.el.offsetHeight;
  // Rotation-aware clamp: a rotated table's visual footprint is its rotated AABB,
  // centred on (left+w/2, top+h/2). Tables also have chairs (pips) sitting OUTSIDE the
  // body, so for tables we expand the footprint by the pip overhang — this keeps chairs
  // inside the canvas and matches how the canvas auto-sizes, so a rotated bridal can sit
  // with its chairs nearly touching the edge without the floorplan jumping bigger.
  const over=(d.kind==='decor')?0:(SEAT_PIP+2);
  const ab=_rotatedAABB(w+2*over, h+2*over, d.rotation||0);
  const minL=ab.w/2 - w/2, maxL=d.cw - ab.w/2 - w/2;
  const minT=ab.h/2 - h/2, maxT=d.ch - ab.h/2 - h/2;
  let nl=Math.max(minL, Math.min(d.origLeft+dx, maxL));
  let nt=Math.max(minT, Math.min(d.origTop+dy, maxT));
  // Guard against negative ranges (table bigger than canvas in an axis): centre it.
  if(maxL<minL) nl=(d.cw-w)/2;
  if(maxT<minT) nt=(d.ch-h)/2;
  // Snap-to-grid: snap the element's CENTRE to the nearest cell, then convert back to
  // top-left and re-clamp so a snapped centre can't push the footprint off-canvas.
  if(STATE.settings.floorSnap && maxL>=minL && maxT>=minT){
    const snapped=_floorSnapCenter(nl+w/2, nt+h/2);
    nl=Math.max(minL, Math.min(snapped.cx-w/2, maxL));
    nt=Math.max(minT, Math.min(snapped.cy-h/2, maxT));
  }
  d.el.style.left=nl+'px'; d.el.style.top=nt+'px';
}
// ── Guest seat drag (move/swap a guest between chairs on the floorplan) ──
// Free placement (v139): while a guest is in flight, wake the empty chairs.
// _floorSeatHighlightOff() must be called from EVERY exit path — drop, abort,
// pointercancel — or the floorplan is left permanently lit.
function _floorSeatHighlightOn(){
  const c=document.getElementById('floor-canvas');
  if(c) c.classList.add('seat-dragging');
}
function _floorSeatHighlightOff(){
  const c=document.getElementById('floor-canvas');
  if(c) c.classList.remove('seat-dragging');
  document.querySelectorAll('.floor-seat.seat-drop-hot').forEach(el=>el.classList.remove('seat-drop-hot'));
}
function _floorSeatDown(e){
  // When Ctrl/⌘ is held, the gesture is a canvas pan — don't start moving the guest.
  if(e.ctrlKey||e.metaKey) return;
  // Multi-touch: a second finger means pinch/pan, not a seat move.
  if(_floorActiveTouches()>=2 && e.pointerType==='touch'){ _floorAbortDrag(); return; }
  e.stopPropagation();
  const pip=e.currentTarget;
  const gid=pip.dataset.gid; if(!gid) return;
  const tableEl=pip.closest('.floor-table'); if(!tableEl) return;
  const fromTid=tableEl.dataset.id;
  // Fully locked → guests are completely frozen: no dragging AND no tap-to-open
  // (the table manager edits seating, which the lock is meant to prevent).
  if(_floorAllLocked()){ e.stopPropagation(); return; }
  const r=pip.getBoundingClientRect();
  // floating ghost that follows the pointer
  const ghost=document.createElement('div');
  ghost.className='floor-seat-ghost';
  const g=STATE.guests.find(x=>x.id===gid);
  ghost.textContent=g?initials(g.name):'';
  ghost.style.cssText='position:fixed;z-index:4000;width:'+SEAT_PIP+'px;height:'+SEAT_PIP+'px;border-radius:50%;background:var(--gold-deep);color:#fff;display:flex;align-items:center;justify-content:center;font-size:'+Math.max(8,Math.round(SEAT_PIP*0.35))+'px;font-weight:700;font-family:Inter,sans-serif;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.3);opacity:.92';
  ghost.style.left=(e.clientX-SEAT_PIP/2)+'px';
  ghost.style.top=(e.clientY-SEAT_PIP/2)+'px';
  document.body.appendChild(ghost);
  pip.style.opacity='0.3';
  _floorDrag={mode:'seat',gid,fromTid,pip,ghost,startX:e.clientX,startY:e.clientY,moved:false};
  try{ pip.setPointerCapture(e.pointerId); }catch(_){}
  e.preventDefault();
}
// Remove any orphaned seat-drag ghost(s) from <body> and reset an in-progress seat
// drag, so a half-finished drag can't leave a stuck pip behind (e.g. after a page change
// interrupts the gesture). Safe to call anytime — does nothing if there's nothing to clear.
function _floorClearStrayGhosts(){
  document.querySelectorAll('.floor-seat-ghost').forEach(el=>{ if(el.parentNode) el.parentNode.removeChild(el); });
  if(_floorDrag && _floorDrag.mode==='seat'){
    if(_floorDrag.pip) _floorDrag.pip.style.opacity='';
    _floorDrag=null;
  }
}
function _seatTargetAt(clientX,clientY,ghost){
  if(ghost) ghost.style.display='none';
  const elt=document.elementFromPoint(clientX,clientY);
  if(ghost) ghost.style.display='';
  if(!elt) return null;
  if(elt.closest&&elt.closest('#seating-pool')) return {kind:'pool'};
  const seat=elt.closest&&elt.closest('.floor-seat');
  if(seat&&seat.dataset.gid){ const tEl=seat.closest('.floor-table'); return {kind:'seat',gid:seat.dataset.gid,tid:tEl&&tEl.dataset.id,idx:seat.dataset.seat!==undefined?+seat.dataset.seat:undefined}; }
  // EMPTY CHAIR: has data-seat but no data-gid. Drop here to place in THAT chair.
  if(seat&&seat.dataset.seat!==undefined&&seat.dataset.tid){ return {kind:'emptySeat',tid:seat.dataset.tid,idx:+seat.dataset.seat}; }
  const tbl=elt.closest&&elt.closest('.floor-table');
  if(tbl) return {kind:'table',tid:tbl.dataset.id};
  return null;
}
function _floorSeatUp(d,e){
  _floorSeatHighlightOff();
  const ghost=d.ghost; if(ghost&&ghost.parentNode) ghost.parentNode.removeChild(ghost);
  if(d.pip) d.pip.style.opacity='';
  const _pool=document.getElementById('seating-pool'); if(_pool) _pool.classList.remove('pool-drop-active');
  if(!d.moved){ // treated as a click → open the table manager
    if(d.fromTid) openTableSeatManager(d.fromTid);
    return;
  }
  const tgt=_seatTargetAt(e.clientX,e.clientY,null);
  if(!tgt){ navigate('seating'); return; } // dropped on empty canvas → no change
  const gid=d.gid, fromTid=d.fromTid;
  // Helper: is this guest a head-seat marker on its source table?
  const _clearHeadIf=(tid,g)=>{ const tt=STATE.tables.find(x=>x.id===tid); if(!tt) return; if(tt.headLeft===g) tt.headLeft=null; if(tt.headRight===g) tt.headRight=null; };
  if(tgt.kind==='pool'){
    // Dropped on the Unassigned box → remove the guest, LEAVING THE CHAIR EMPTY.
    _clearHeadIf(fromTid,gid);
    _seatClear(fromTid,gid); _seatTrim(fromTid);
    saveToStorage(); navigate('seating'); return;
  }
  if(tgt.kind==='emptySeat'){
    // FREE PLACEMENT (v139): drop into a specific empty chair. This is the whole
    // point of the sparse array — the guest goes where you put them, and the chair
    // they left stays empty.
    _clearHeadIf(fromTid,gid);
    if(fromTid) _seatClear(fromTid,gid);
    _seatAt(tgt.tid,tgt.idx,gid);
    if(fromTid) _seatTrim(fromTid);
    saveToStorage(); navigate('seating'); return;
  }
  if(tgt.kind==='seat'&&tgt.gid&&tgt.gid!==gid){
    // SWAP the two guests between their chairs (and tables). Index-based, so it is
    // already correct with holes — each guest lands in the other's exact chair.
    const otherGid=tgt.gid, otherTid=tgt.tid||fromTid;
    const aArr=_seatArr(fromTid); const bArr=_seatArr(otherTid);
    const ai=aArr.indexOf(gid), bi=bArr.indexOf(otherGid);
    if(ai>-1&&bi>-1){
      if(fromTid===otherTid){ const arr=_seatArr(fromTid); const tmp=arr[ai]; arr[ai]=arr[bi]; arr[bi]=tmp; STATE.seating[fromTid]=arr; }
      else { aArr[ai]=otherGid; bArr[bi]=gid; STATE.seating[fromTid]=aArr; STATE.seating[otherTid]=bArr; }
      // swap any head-seat markers too
      const swapHead=(tid,oldG,newG)=>{ const tt=STATE.tables.find(x=>x.id===tid); if(!tt) return; if(tt.headLeft===oldG) tt.headLeft=newG; if(tt.headRight===oldG) tt.headRight=newG; };
      swapHead(fromTid,gid,otherGid); swapHead(otherTid,otherGid,gid);
    }
  } else {
    const toTid=tgt.tid;
    if(!toTid||toTid===fromTid){ navigate('seating'); return; } // same table, body → no chair chosen
    const tt=STATE.tables.find(x=>x.id===toTid);
    const cap=tt?tt.seats:0;
    if(_seatCount(toTid)>=cap){ // target full → bounce back
      navigate('seating'); return;
    }
    // Dropped on the table BODY rather than a chair → first free chair (fills a hole
    // if there is one, rather than stepping over it).
    _clearHeadIf(fromTid,gid);
    if(fromTid) _seatClear(fromTid,gid);
    _seatFirstFree(toTid,gid);
    if(fromTid) _seatTrim(fromTid);
  }
  saveToStorage(); navigate('seating');
}
function _floorRotateDown(e){
  e.stopPropagation();
  if(_floorLayoutLocked()) return;
  if(_floorActiveTouches()>=2 && e.pointerType==='touch'){ _floorAbortDrag(); return; }
  const id=e.currentTarget.dataset.id;
  const kind=e.currentTarget.dataset.kind||'table';
  const el=document.getElementById((kind==='decor'?'fdec-':'ftab-')+id);
  const canvas=document.getElementById('floor-canvas'); if(!el||!canvas) return;
  // Use the rotation wrapper's bounding rect for accurate visual center (accounts for current rotation)
  const rotEl=el.querySelector(kind==='decor'?'.fdec-rot':'.ftbl-rot')||el;
  const er=rotEl.getBoundingClientRect();
  const centerX=er.left+er.width/2, centerY=er.top+er.height/2;
  const startAngle=Math.atan2(e.clientY-centerY, e.clientX-centerX)*180/Math.PI;
  const obj=(kind==='decor'?(STATE.settings.floorDecor||[]):STATE.tables).find(x=>x.id===id)||{};
  _floorDrag={mode:'rotate',kind,id,el,rotEl,startAngle,origRot:obj.rotation||0,centerX,centerY,currentRot:obj.rotation||0};
  try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(_){}
  e.preventDefault();
}
function _floorPointerUp(e){
  if(!_floorDrag) return;
  const d=_floorDrag; _floorDrag=null;
  if(d.mode==='seat'){ _floorSeatUp(d,e||{clientX:d.startX,clientY:d.startY}); return; }
  if(d.mode==='rotate'){
    if(d.kind==='decor'){
      const dec=(STATE.settings.floorDecor||[]).find(x=>x.id===d.id);
      if(dec) dec.rotation=Math.round(d.currentRot||0);
    } else {
      const t=STATE.tables.find(x=>x.id===d.id);
      if(t) t.rotation=Math.round(d.currentRot||0);
    }
    saveToStorage(); navigate('seating'); return;
  }
  if(d.mode==='tscale'){
    const t=STATE.tables.find(x=>x.id===d.id);
    if(t){ t.scale=Math.round((d.s||d.origScale)*100)/100; }
    saveToStorage(); navigate('seating');
    return;
  }
  if(d.mode==='resize'){
    const nw=Math.round(parseFloat(d.el.style.width)||d.origW);
    const nh=Math.round(parseFloat(d.el.style.height)||d.origH);
    const dec=(STATE.settings.floorDecor||[]).find(x=>x.id===d.id);
    if(dec){ dec.w=nw; dec.h=nh; }
    saveToStorage();
    return;
  }
  const nl=Math.round(parseFloat(d.el.style.left)||0), nt=Math.round(parseFloat(d.el.style.top)||0);
  if(d.moved){
    if(d.kind==='table'){ const t=STATE.tables.find(x=>x.id===d.id); if(t){ t.x=nl; t.y=nt; } saveToStorage(); navigate('seating'); }
    else { const dec=(STATE.settings.floorDecor||[]).find(x=>x.id===d.id); if(dec){ dec.x=nl; dec.y=nt; } saveToStorage(); }
  } else if(d.kind==='table'){
    openTableSeatManager(d.id);
  }
}
function _wireFloor(){
  document.querySelectorAll('#floor-canvas .floor-table, #floor-canvas .floor-decor').forEach(el=>{
    el.addEventListener('pointerdown',_floorPointerDown);
  });
  document.querySelectorAll('#floor-canvas .floor-resize').forEach(h=>{
    h.addEventListener('pointerdown',_floorResizeDown);
  });
  document.querySelectorAll('#floor-canvas .floor-rotate').forEach(h=>{
    h.addEventListener('pointerdown',_floorRotateDown);
  });
  document.querySelectorAll('#floor-canvas .floor-seat').forEach(p=>{
    p.addEventListener('pointerdown',_floorSeatDown);
  });
  if(!_floorDocWired){
    document.addEventListener('pointermove',_floorPointerMove);
    document.addEventListener('pointerup',_floorPointerUp);
    // pointercancel (browser took over the gesture, e.g. scroll/zoom) must also tidy up,
    // otherwise a seat-drag ghost can be orphaned and appear stuck on screen.
    document.addEventListener('pointercancel',function(e){
      if(_floorDrag && _floorDrag.mode==='seat'){ _floorAbortDrag(); }
      else { _floorClearStrayGhosts(); }
    });
    _floorDocWired=true;
  }
  _applyFloorFit();
  if(!_floorFitWired){
    window.addEventListener('resize', ()=>{ if(document.getElementById('floor-canvas')) _applyFloorFit(); });
    _floorFitWired=true;
  }
  _wireFloorZoom();
}
// Zoom gestures: Ctrl+wheel / trackpad-pinch (desktop) and two-finger pinch (mobile).
// Wired to the current viewport each render; single-finger drag is left to the existing
// pointer handlers (we only intercept multi-touch / ctrl-wheel).
let _floorPinch=null;
function _wireFloorZoom(){
  const vp=document.getElementById('floor-viewport'); if(!vp || vp._zoomWired) return;
  vp._zoomWired=true;
  // Desktop: Ctrl+wheel (and trackpad pinch, which fires wheel with ctrlKey).
  vp.addEventListener('wheel', (e)=>{
    if(!e.ctrlKey) return; // plain scroll = page scroll; only zoom on ctrl/pinch
    e.preventDefault();
    const r=vp.getBoundingClientRect();
    const factor=Math.exp(-e.deltaY*0.0015);
    _floorZoomAt(factor, e.clientX-r.left, e.clientY-r.top);
  }, {passive:false});
  // Mobile: two-finger pinch to zoom AND two-finger drag to pan around when zoomed.
  vp.addEventListener('touchstart', (e)=>{
    _floorTouchCount=e.touches.length;
    // A second finger landing turns this into a pinch/pan — abort any single-finger
    // table/area/seat drag the first finger started so nothing moves with the gesture.
    if(e.touches.length>=2) _floorAbortDrag();
    if(e.touches.length===2){
      const r=vp.getBoundingClientRect();
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      _floorPinch={ dist:Math.hypot(dx,dy),
        cx:((e.touches[0].clientX+e.touches[1].clientX)/2)-r.left,
        cy:((e.touches[0].clientY+e.touches[1].clientY)/2)-r.top,
        // Track the raw midpoint so we can pan by how far the two fingers slide.
        mx:(e.touches[0].clientX+e.touches[1].clientX)/2,
        my:(e.touches[0].clientY+e.touches[1].clientY)/2 };
    }
  }, {passive:true});
  vp.addEventListener('touchmove', (e)=>{
    if(_floorPinch && e.touches.length===2){
      e.preventDefault();
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      const dist=Math.hypot(dx,dy);
      const r=vp.getBoundingClientRect();
      const mx=(e.touches[0].clientX+e.touches[1].clientX)/2;
      const my=(e.touches[0].clientY+e.touches[1].clientY)/2;
      // Pinch zoom around the current focal point.
      if(_floorPinch.dist>0){
        _floorZoomAt(dist/_floorPinch.dist, mx-r.left, my-r.top);
      }
      // Pan: shift the canvas by how far the midpoint moved (only has visible effect
      // when zoomed, since pan is clamped to 0 at 1×).
      const panDX=mx-_floorPinch.mx, panDY=my-_floorPinch.my;
      if(panDX||panDY) _floorPanBy(panDX, panDY);
      _floorPinch.dist=dist;
      _floorPinch.mx=mx; _floorPinch.my=my;
    }
  }, {passive:false});
  const endPinch=(e)=>{ _floorTouchCount=(e.touches?e.touches.length:0); if(!e.touches || e.touches.length<2) _floorPinch=null; };
  vp.addEventListener('touchend', endPinch, {passive:true});
  vp.addEventListener('touchcancel', endPinch, {passive:true});

  // Desktop: Ctrl/⌘ + click-drag to pan the canvas (when zoomed). While Ctrl is held,
  // tables/guests/areas don't move (suppressed in _floorPointerDown), so this is a clean pan.
  let _panDrag=null;
  vp.addEventListener('pointerdown', (e)=>{
    if(!(e.ctrlKey||e.metaKey)) return;
    if(e.button!==0) return;
    _panDrag={ x:e.clientX, y:e.clientY };
    vp.style.cursor='grabbing';
    try{ vp.setPointerCapture(e.pointerId); }catch(_){}
    e.preventDefault();
  });
  vp.addEventListener('pointermove', (e)=>{
    if(!_panDrag) return;
    const dx=e.clientX-_panDrag.x, dy=e.clientY-_panDrag.y;
    _panDrag.x=e.clientX; _panDrag.y=e.clientY;
    _floorPanBy(dx, dy);
    e.preventDefault();
  });
  const endPan=(e)=>{ if(_panDrag){ _panDrag=null; vp.style.cursor=''; try{ vp.releasePointerCapture(e.pointerId); }catch(_){} } };
  vp.addEventListener('pointerup', endPan);
  vp.addEventListener('pointercancel', endPan);
  // Show a grab cursor whenever Ctrl/⌘ is held over the floorplan, to hint panning.
  vp.addEventListener('pointermove', (e)=>{ if(!_panDrag) vp.style.cursor=(e.ctrlKey||e.metaKey)?'grab':''; });
}
// Fit the floorplan to the viewport width (scales down on narrow / mobile screens),
// then apply any user zoom + pan on top.
function _applyFloorFit(){
  const vp=document.getElementById('floor-viewport');
  const canvas=document.getElementById('floor-canvas');
  if(!vp||!canvas) return;
  const cw=parseFloat(canvas.dataset.cw)||canvas.offsetWidth;
  const ch=parseFloat(canvas.dataset.ch)||canvas.offsetHeight;
  const availW=vp.clientWidth;
  // Base fit scale: 1 if the canvas fits, else shrink to width.
  _floorBaseFit = (availW>=cw) ? 1 : (availW/cw);
  _floorCW=cw; _floorCH=ch;
  // Canvas is laid out at its natural pixel size; all scaling is via transform so zoom
  // composes cleanly with the fit scale.
  canvas.style.width=cw+'px';
  canvas.style.transformOrigin='0 0';
  // Viewport height tracks the *fit* (un-zoomed) height so the page layout is stable;
  // zooming expands the canvas within the viewport, panned into view.
  vp.style.height=Math.round(ch*_floorBaseFit)+'px';
  vp.style.overflow='hidden';
  _applyFloorTransform();
}
// Pan the floorplan by a screen-pixel delta (used by two-finger drag). Pan is in the
// same screen-pixel space as the canvas translate, so deltas map 1:1. Clamping is
// handled by _applyFloorTransform (which keeps the canvas from leaving the frame).
function _floorPanBy(dx, dy){
  if(_floorUserZoom<=1.001) return; // nothing to pan when not zoomed
  _floorPanX += dx;
  _floorPanY += dy;
  _applyFloorTransform();
}
// Combine fit × user-zoom + pan into the canvas transform. Also keeps _floorFitScale as
// the TOTAL applied scale so the existing drag math (which divides screen deltas by it)
// stays correct while zoomed.
function _applyFloorTransform(){
  const vp=document.getElementById('floor-viewport');
  const canvas=document.getElementById('floor-canvas');
  if(!vp||!canvas) return;
  const total=_floorBaseFit*_floorUserZoom;
  _floorFitScale=total;
  // Clamp pan so the canvas can't be dragged entirely out of view.
  const scaledW=_floorCW*total, scaledH=_floorCH*total;
  const vpW=vp.clientWidth, vpH=Math.round(_floorCH*_floorBaseFit);
  const minX=Math.min(0, vpW-scaledW), minY=Math.min(0, vpH-scaledH);
  _floorPanX=Math.max(minX, Math.min(0, _floorPanX));
  _floorPanY=Math.max(minY, Math.min(0, _floorPanY));
  if(_floorUserZoom<=1.001){ _floorPanX=0; _floorPanY=0; }
  canvas.style.transform=`translate(${_floorPanX}px,${_floorPanY}px) scale(${total})`;
  // GPU layer hint ONLY during active pan/zoom: keeps gestures smooth, then drops the
  // hint shortly after so the browser re-rasterizes text/shapes crisply at the new scale
  // (a permanent will-change caches a bitmap and blurs when zoomed in).
  canvas.classList.add('zooming');
  if(_floorZoomSettle) clearTimeout(_floorZoomSettle);
  _floorZoomSettle=setTimeout(()=>{
    const c=document.getElementById('floor-canvas');
    if(c) c.classList.remove('zooming');
  }, 200);
  const lbl=document.getElementById('floor-zoom-pct');
  if(lbl) lbl.textContent=Math.round(_floorUserZoom*100)+'%';
}
// Zoom around a focal point (vx,vy = coordinates within the viewport).
function _floorZoomAt(factor, vx, vy){
  const vp=document.getElementById('floor-viewport'); if(!vp) return;
  const prev=_floorUserZoom;
  let next=Math.max(FLOOR_ZOOM_MIN, Math.min(FLOOR_ZOOM_MAX, prev*factor));
  if(Math.abs(next-prev)<0.0001) return;
  // Keep the canvas point under the focus stationary: solve for new pan.
  const totalPrev=_floorBaseFit*prev, totalNext=_floorBaseFit*next;
  const cx=(vx-_floorPanX)/totalPrev, cy=(vy-_floorPanY)/totalPrev;
  _floorPanX=vx-cx*totalNext; _floorPanY=vy-cy*totalNext;
  _floorUserZoom=next;
  _applyFloorTransform();
}
function _floorZoomBtn(dir){
  const vp=document.getElementById('floor-viewport'); if(!vp) return;
  _floorZoomAt(dir>0?1.25:1/1.25, vp.clientWidth/2, vp.clientHeight/2);
}
function _floorZoomReset(){
  _floorUserZoom=1; _floorPanX=0; _floorPanY=0; _applyFloorTransform();
}

// ── Table seat manager (click a table) ──
function openTableSeatManager(id){
  const t=STATE.tables.find(x=>x.id===id); if(!t) return;
  const filledIds=_seatIds(t.id);
  const filled=filledIds.length;
  const shape=t.shape||'round';
  const seatedChips=filledIds.map((gid,idx)=>{
    const g=STATE.guests.find(x=>x.id===gid); if(!g) return '';
    return `<span class="seat-chip seat-chip-drag" draggable="true" data-tid="${t.id}" data-gid="${gid}" data-idx="${idx}"
      ondragstart="_mgrChipDragStart(event)" ondragover="_mgrChipDragOver(event)" ondrop="_mgrChipDrop(event)" ondragend="_mgrChipDragEnd(event)"
      title="Drag to reorder"><span class="seat-chip-grip" aria-hidden="true">⠿</span>${dietIcons(g.dietary)} ${_escHtml(g.name)} <span onclick="_mgrRemoveGuest('${t.id}','${gid}')" style="cursor:pointer;color:var(--muted);margin-left:3px;font-size:11px">×</span></span>`;
  }).join('')||'<span style="font-size:12.5px;color:var(--muted)">No one seated yet.</span>';
  const _shpLbl={round:'Round',long:'Long',square:'Square',theatre:'Bridal'};
  const shapeSeg=['round','long','square','theatre'].map(s=>`<button class="${shape===s?'on':''}" onclick="setTableShape('${t.id}','${s}')">${_shpLbl[s]}</button>`).join('');
  // "Resize all to match" — shown when this table has a custom scale and other same-shape tables exist
  const tScale=t.scale||1;
  const sameShapeOthers=STATE.tables.filter(x=>x.id!==t.id&&(x.shape||'round')===shape);
  const matchSizeBtn=tScale!==1&&sameShapeOthers.length>0
    ?`<div style="margin-top:12px"><button class="btn btn-outline btn-sm" onclick="_mgrMatchAllScale('${t.id}')" style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        Resize all ${_shpLbl[shape]||shape} tables to match</button></div>`
    :'';
  // Head-of-table section (long tables only) — compact single-line
  const headSection=shape==='long'?(`<div class="form-label" style="margin-top:8px;margin-bottom:3px">Head of Table <span style="font-weight:400;color:var(--muted);font-size:11px">(optional)</span></div>
    <div style="display:flex;gap:8px;margin-bottom:2px">
      ${['left','right'].map(side=>{
        const key=side==='left'?'headLeft':'headRight';
        const hGid=t[key];
        const hasSlot=hGid!==undefined;
        if(!hasSlot) return `<button class="btn btn-outline btn-sm" onclick="_mgrToggleHead('${t.id}','${side}',true)" style="flex:1;font-size:11px;padding:5px 8px">+ ${side.charAt(0).toUpperCase()+side.slice(1)} head seat</button>`;
        const opts=filledIds.map(gid=>{ const g=STATE.guests.find(x=>x.id===gid); return g?`<option value="${gid}" ${gid===hGid?'selected':''}>${_escHtml(g.name)}</option>`:''; }).join('');
        return `<div style="flex:1;display:flex;gap:4px;align-items:center">
            <select class="form-input" style="font-size:12px;padding:4px 6px;flex:1" onchange="_mgrSetHead('${t.id}','${side}',this.value)" title="${side.charAt(0).toUpperCase()+side.slice(1)} end">
              <option value="">${side.charAt(0).toUpperCase()+side.slice(1)}: — empty —</option>${opts}
            </select>
            <button class="btn btn-outline btn-sm" onclick="_mgrToggleHead('${t.id}','${side}',false)" title="Remove head slot" style="padding:4px 8px;color:var(--red-deep)">×</button>
          </div>`;
      }).join('')}
    </div>`):'';
  // Bridal seats one side only, so which side is a real choice. Long seats BOTH sides and
  // round/square seat all the way round, so the control is meaningless for them and is not
  // shown — same reasoning as Head of Table being long-only.
  const sideSection=shape==='theatre'?(`<div><div class="form-label">Party sits</div>
      <div class="seat-seg">
        <button class="${_seatSide(t)==='below'?'on':''}" onclick="setTableSeatSide('${t.id}','below')">Below</button>
        <button class="${_seatSide(t)==='above'?'on':''}" onclick="setTableSeatSide('${t.id}','above')">Above</button>
      </div></div>`):'';
  const curRot=(((t.rotation||0)%360)+360)%360;
  const body=`
    <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:6px">
      <div><div class="form-label">Shape</div><div class="seat-seg">${shapeSeg}</div></div>
      ${sideSection}
      <div><div class="form-label">Seats</div>
        <div style="display:inline-flex;align-items:center;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="_mgrSetSeats('${t.id}',-1)">−</button>
          <span style="font-weight:600;min-width:40px;text-align:center">${filled}/${t.seats}</span>
          <button class="btn btn-outline btn-sm" onclick="_mgrSetSeats('${t.id}',1)">+</button>
        </div>
      </div>
      <div><div class="form-label">Rotation</div>
        <div style="display:inline-flex;align-items:center;gap:7px">
          <button class="btn btn-sm" onclick="_mgrRotate45('${t.id}')" title="Tap to rotate 45°"
            style="display:inline-flex;align-items:center;gap:7px;font-weight:600;border:1px solid var(--gold-deep);color:var(--gold-deep);background:rgba(201,161,74,.10)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            ${curRot}°
          </button>
          <button class="btn btn-outline btn-sm mgr-rot-reset" onclick="_mgrResetRotation('${t.id}')" title="Reset rotation to 0°" aria-label="Reset rotation to 0°"
            style="display:inline-flex;align-items:center;justify-content:center;padding:0;width:31px;height:31px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.36 2.64L3 8"/><line x1="3" y1="3" x2="3" y2="8"/><line x1="3" y1="8" x2="8" y2="8"/></svg>
          </button>
        </div>
      </div>
    </div>
    ${matchSizeBtn}
    ${headSection}
    <div class="form-label" style="margin-top:6px;margin-bottom:3px">Seated (${filled})${filled>1?' <span style="font-weight:400;text-transform:none;color:var(--muted);font-size:11px">— drag to reorder</span>':''}</div>
    <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:2px">${seatedChips}</div>`;
  const footer=`<button class="btn btn-outline btn-sm" style="color:var(--red-deep);border-color:var(--red-deep)" onclick="closeModalDirect();deleteTable('${t.id}')">Delete Table</button>
    <button class="btn btn-primary" onclick="closeModalDirect()">Done</button>`;
  openModal(_escHtml(t.name||'Table')+' — Seating', body, footer);
  const mb=document.getElementById('modal-box'); if(mb) mb.classList.add('seat-mgr-compact');
}
// ── Seated-chip reorder (drag chips within the manager to reorder seating) ──
let _mgrChipDrag=null;
function _mgrChipDragStart(e){
  const el=e.currentTarget;
  _mgrChipDrag={tid:el.dataset.tid, gid:el.dataset.gid, idx:Number(el.dataset.idx)};
  el.style.opacity='0.4';
  try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', el.dataset.gid); }catch(_){}
}
function _mgrChipDragOver(e){
  if(!_mgrChipDrag) return;
  e.preventDefault();
  try{ e.dataTransfer.dropEffect='move'; }catch(_){}
}
function _mgrChipDrop(e){
  if(!_mgrChipDrag) return;
  e.preventDefault(); e.stopPropagation();
  const targetEl=e.currentTarget;
  const tid=_mgrChipDrag.tid;
  if(targetEl.dataset.tid!==tid){ _mgrChipDrag=null; return; }
  const arr=_seatArr(tid); if(!arr.length) { _mgrChipDrag=null; return; }
  const from=arr.indexOf(_mgrChipDrag.gid);
  const to=arr.indexOf(targetEl.dataset.gid);
  if(from<0||to<0||from===to){ _mgrChipDrag=null; return; }
  // SWAP, NOT SPLICE. splice() re-indexes everything after the move — which with a
  // sparse array SHIFTS EVERY EMPTY CHAIR, silently moving guests nobody touched.
  // A swap exchanges exactly two chairs and leaves every hole where it is.
  const tmp=arr[from]; arr[from]=arr[to]; arr[to]=tmp;
  STATE.seating[tid]=arr;
  _mgrChipDrag=null;
  saveToStorage(); navigate('seating'); openTableSeatManager(tid);
}
function _mgrChipDragEnd(e){ try{ e.currentTarget.style.opacity=''; }catch(_){} _mgrChipDrag=null; }
function _mgrRotate45(tid){
  const t=STATE.tables.find(x=>x.id===tid); if(!t) return;
  t.rotation=(((t.rotation||0)+45)%360+360)%360;
  saveToStorage(); navigate('seating'); openTableSeatManager(tid);
}
function _mgrResetRotation(tid){
  const t=STATE.tables.find(x=>x.id===tid); if(!t) return;
  if((t.rotation||0)===0) return;
  t.rotation=0;
  saveToStorage(); navigate('seating'); openTableSeatManager(tid);
}
function _mgrAddGuest(tid,gid){
  const t=STATE.tables.find(x=>x.id===tid); if(!t) return;
  if(_seatCount(tid)>=t.seats) return;
  _seatFirstFree(tid,gid);   // fills a hole if there is one (was: append)
  saveToStorage(); navigate('seating'); openTableSeatManager(tid);
}
function _mgrRemoveGuest(tid,gid){
  _seatClear(tid,gid); _seatTrim(tid);
  const t=STATE.tables.find(x=>x.id===tid);
  if(t){ if(t.headLeft===gid) t.headLeft=null; if(t.headRight===gid) t.headRight=null; }
  saveToStorage(); navigate('seating'); openTableSeatManager(tid);
}
function _mgrSetSeats(tid,delta){
  const t=STATE.tables.find(x=>x.id===tid); if(!t) return;
  const v=(Number(t.seats)||0)+delta;
  if(v<1) return;
  // Was: silently refuse to drop below the filled count. Now: compact, and if it
  // still doesn't fit, the picker lets the user choose who leaves — consistent
  // with the Edit Seats dialog.
  _applySeatCount(tid, v, ()=>{ navigate('seating'); openTableSeatManager(tid); });
}
function _mgrMatchAllScale(tid){
  const t=STATE.tables.find(x=>x.id===tid); if(!t) return;
  const s=t.scale||1, shape=t.shape||'round';
  STATE.tables.forEach(x=>{ if(x.id!==tid&&(x.shape||'round')===shape) x.scale=s; });
  saveToStorage(); navigate('seating'); openTableSeatManager(tid);
}
function _mgrSetHead(tid,side,gid){
  const t=STATE.tables.find(x=>x.id===tid); if(!t) return;
  if(side==='left') t.headLeft=gid||null;
  else t.headRight=gid||null;
  saveToStorage(); navigate('seating'); openTableSeatManager(tid);
}
function _mgrToggleHead(tid,side,enable){
  const t=STATE.tables.find(x=>x.id===tid); if(!t) return;
  if(side==='left') t.headLeft=enable?null:undefined;
  else t.headRight=enable?null:undefined;
  saveToStorage(); navigate('seating'); openTableSeatManager(tid);
}
function setTableShape(id,shape){
  const t=STATE.tables.find(x=>x.id===id); if(!t) return;
  t.shape=shape; saveToStorage(); navigate('seating'); openTableSeatManager(id);
}
// Which side a bridal table's party sits. Chairs sit OUTSIDE the table body and their name
// pills sit outside them again, so switching to 'above' needs roughly 44px of clear space
// over the table. The canvas only grows right and down, so a table already near the top
// would push its own party off the edge. Nudge it down rather than let that happen — the
// alternative is a control that silently does nothing visible.
const _SEAT_ABOVE_HEADROOM=44;
function setTableSeatSide(id,side){
  const t=STATE.tables.find(x=>x.id===id); if(!t) return;
  t.seatSide=(side==='above')?'above':'below';
  if(t.seatSide==='above' && (t.y||0)<_SEAT_ABOVE_HEADROOM) t.y=_SEAT_ABOVE_HEADROOM;
  saveToStorage(); navigate('seating'); openTableSeatManager(id);
}

function renderSeatingFloor(c,actions){
  _autoLayoutTables();
  const style=(STATE.settings.seatingTableStyle||'pips');
  const guestPool=seatingAttendingOnly
    ? STATE.guests.filter(g=>g.rsvp==='attending'&&(g.listType||'A')==='A')
    : STATE.guests.filter(g=>g.rsvp!=='declined'&&(g.listType||'A')==='A');
  const allSeated=Object.values(STATE.seating).flat().filter(Boolean);
  const unseated=guestPool.filter(g=>!allSeated.includes(g.id));
  const cf=_floorConflicts();
  const sep=_floorSeparatedCouples();

  actions.innerHTML=`<div id="seating-btn-group" class="gbtn-group${_seatIconsOnly?' icons-only':''}" style="display:inline-flex;align-items:center;justify-content:flex-end;gap:5px">
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
          ${_seatCogMenuHtml(style, 'floorplan')}
        </span>
      </div>
    </div>`;

  let maxB=300, maxR=320;
  // Pip chairs sit OUTSIDE the table body, so include that overhang in the rotated
  // footprint — otherwise a rotated bridal's chairs clip the canvas edge. Using the
  // pip-inclusive AABB lets us keep only a small bottom margin (chairs nearly touch the
  // bottom) before the floorplan grows, instead of the previous generous +90 gap.
  const PIP_OVER=SEAT_PIP+2; // chair radius overhang beyond the body edge
  (STATE.tables||[]).forEach(t=>{
    const s=_tableSize(t), ab=_rotatedAABB(s.w+2*PIP_OVER, s.h+2*PIP_OVER, t.rotation||0);
    const cx=(t.x||0)+s.w/2, cy=(t.y||0)+s.h/2;
    maxR=Math.max(maxR, cx+ab.w/2); maxB=Math.max(maxB, cy+ab.h/2);
  });
  (STATE.settings.floorDecor||[]).forEach(d=>{
    const def=DECOR_DEFS[d.type]||{w:120,h:56}; const w=d.w||def.w, h=d.h||def.h;
    const ab=_rotatedAABB(w,h,d.rotation||0); const cx=(d.x||0)+w/2, cy=(d.y||0)+h/2;
    maxR=Math.max(maxR, cx+ab.w/2); maxB=Math.max(maxB, cy+ab.h/2);
  });
  // Guest name badges hang below the bottom row of chairs; add room so they aren't
  // clipped at the canvas bottom edge (the pip overhang above covers the chairs, not
  // the name tags beneath them).
  const NAME_TAG_BAND=24;
  const canvasH=Math.max(480, maxB+16+NAME_TAG_BAND);
  const canvasW=Math.max(560, maxR+24);

  // Pre-compute the fit scale SYNCHRONOUSLY so the very first paint is already at the
  // right size (otherwise the canvas paints once at full width then _applyFloorFit()
  // rescales it a frame later — a visible "flash bigger then snap" on narrow screens).
  // IMPORTANT: the floor viewport's usable width = c.clientWidth MINUS c's horizontal
  // padding (the .content box is padded). Measuring c.clientWidth alone over-estimates
  // the width, producing a slightly-too-large first paint that then snaps smaller.
  let _initAvailW=0;
  try{
    const cs=getComputedStyle(c);
    const padX=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0);
    _initAvailW=Math.max(0,((c&&c.clientWidth)||0)-padX);
  }catch(_){}
  const _showPoolSidebar=(!arrangeTablesMode)&&(_initAvailW>=700);
  // When sidebar shown, canvas takes at most 62% so the sidebar gets the rest
  const _vpAvailW=_showPoolSidebar?Math.max(300,Math.min(canvasW,Math.round(_initAvailW*0.62))):_initAvailW;
  let _initCanvasStyle, _initVpStyle;
  if(_vpAvailW && _vpAvailW < canvasW){
    const s=_vpAvailW/canvasW;
    _initCanvasStyle=`width:${canvasW}px;height:${canvasH}px;transform:scale(${s});transform-origin:0 0`;
    _initVpStyle=`width:100%;overflow:hidden;margin-bottom:20px;height:${Math.round(canvasH*s)}px`;
  } else {
    _initCanvasStyle=`width:100%;height:${canvasH}px`;
    _initVpStyle=`width:100%;overflow:hidden;margin-bottom:20px${_vpAvailW?`;height:${canvasH}px`:''}`;
  }

  c.innerHTML=`
  ${_seatStickyBar('floorplan')}
  ${_unseatedBannerHtml()}
  ${_seatingConflictBanner(cf)}
  ${_seatingSeparatedBanner(sep)}
  <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:12px">
    <button class="btn btn-outline btn-sm" onclick="openAddDecor()" ${_floorLayoutLocked()?'disabled style="display:inline-flex;align-items:center;gap:5px;opacity:.45;cursor:not-allowed"':'style="display:inline-flex;align-items:center;gap:5px"'}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      Add Area
    </button>
    <button class="snap-toggle ${STATE.settings.floorSnap?'on':''}" onclick="toggleFloorSnap()" title="Snap tables &amp; areas to the grid while dragging" ${_floorLayoutLocked()?'disabled style="opacity:.45;cursor:not-allowed"':''}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v16a2 2 0 0 0 2 2h16"/><path d="M5 7h4"/><path d="M5 11h4"/><path d="M5 15h4"/><path d="M11 19v-4"/><path d="M15 19v-4"/><path d="M19 19v-4"/></svg>
      Snap
    </button>
    <button class="snap-toggle ${STATE.settings.floorGrid?'on':''}" onclick="toggleFloorGrid()" title="Show or hide the alignment grid">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
      Grid
    </button>
    ${_floorLockBtnHtml()}
    <span style="font-size:11.5px;color:var(--muted);margin-left:auto;text-align:right">${_floorLayoutLocked()?(_floorAllLocked()?'Locked — nothing can be moved · zoom &amp; pan still work':'Tables &amp; areas locked · guests can still be seated'):'<span class="floor-hint-full">Drag tables to arrange · Ctrl + scroll to zoom · Ctrl + drag to move the plan</span><span class="floor-hint-short">Drag tables to arrange</span>'}</span>
  </div>
  <div id="floor-and-pool" style="display:flex;gap:16px;align-items:flex-start">
    <div style="${_showPoolSidebar?`flex:0 0 ${_vpAvailW}px;width:${_vpAvailW}px`:'flex:1 1 0%'};min-width:0">
      <div id="floor-viewport" style="${_initVpStyle};position:relative">
        <div id="floor-canvas" class="floor-canvas${STATE.settings.floorGrid?' grid-on':''}${_floorLayoutLocked()?' floor-locked':''}${_floorAllLocked()?' floor-locked-all':''}" data-cw="${canvasW}" data-ch="${canvasH}" style="${_initCanvasStyle}" ondragover="event.preventDefault()">
          ${(STATE.settings.floorDecor||[]).map(_floorDecorHtml).join('')}
          ${(STATE.tables||[]).map(t=>_floorTableHtml(t,style,cf,sep)).join('')}
          ${!STATE.tables||!STATE.tables.length?`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px">No tables yet — use <span style="color:var(--gold-deep);margin:0 4px">Add Table</span> to begin.</div>`:''}
        </div>
        ${(STATE.tables&&STATE.tables.length&&!(STATE.settings&&STATE.settings.floorHideZoomBtns))?`<div class="floor-zoom-ctrl" aria-label="Zoom controls">
          <button type="button" onclick="_floorZoomBtn(1)" title="Zoom in" aria-label="Zoom in"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <div id="floor-zoom-pct" class="floor-zoom-pct">100%</div>
          <button type="button" onclick="_floorZoomBtn(-1)" title="Zoom out" aria-label="Zoom out"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          <button type="button" onclick="_floorZoomReset()" title="Reset zoom" aria-label="Reset zoom"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9"/><polyline points="3 4 3 9 8 9"/></svg></button>
        </div>`:''}
      </div>
    </div>
    ${_showPoolSidebar?`<div id="floor-pool-sidebar" style="flex:1 1 0%;min-width:200px;position:sticky;top:56px;max-height:calc(100vh - 80px);overflow-y:auto">
      <div class="card" style="margin-bottom:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div class="section-eyebrow" style="margin-bottom:0;font-size:11px">Unassigned Guests</div>
          <div style="position:relative;flex:1;min-width:0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:7px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="seating-search" class="form-input" placeholder="Search…" style="padding:4px 28px 4px 24px;font-size:11.5px;height:27px;width:100%"
              oninput="filterSeatingPool(this.value)" onkeydown="if(event.key==='Escape'){this.value='';filterSeatingPool('')}"/>
            <button type="button" onclick="filterSeatingPool('');const _se=document.getElementById('seating-search');if(_se){_se.value='';_se.focus()}" title="Clear" style="position:absolute;right:5px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:0;line-height:0;display:flex;align-items:center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
        <div id="seating-pool" ondragover="event.preventDefault()" ondrop="returnToPool(event)" style="min-height:44px;display:flex;flex-wrap:wrap;gap:6px;padding:2px">
          ${_poolGroupsHtml(unseated)}
        </div>
      </div>
    </div>`:''}
  </div>
  ${!_showPoolSidebar?`<div class="card">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      <div class="section-eyebrow" style="margin-bottom:0">Unassigned Guests</div>
      <div style="position:relative;flex:1;min-width:140px;max-width:260px;margin-left:auto">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="seating-search" class="form-input" placeholder="Search…" style="padding:5px 36px 5px 28px;font-size:12px;height:30px"
          oninput="filterSeatingPool(this.value)" onkeydown="if(event.key==='Escape'){this.value='';filterSeatingPool('')}"/>
        <button type="button" onclick="filterSeatingPool('');const _se=document.getElementById('seating-search');if(_se){_se.value='';_se.focus()}" title="Clear" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:0;line-height:0;display:flex;align-items:center"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    </div>
    <div id="seating-pool" ondragover="event.preventDefault()" ondrop="returnToPool(event)" style="min-height:44px;display:flex;flex-wrap:wrap;gap:6px;padding:4px">
      ${_poolGroupsHtml(unseated)}
    </div>
  </div>`:''}` ;

  // Apply the authoritative fit synchronously (canvas is already in the DOM) so the
  // browser only ever paints the correctly-scaled state — no second rescale frame.
  _applyFloorFit();
  setTimeout(()=>{ _ensureSeatingBtnObserver(); requestAnimationFrame(_fitSeatingBtns); _wireFloor(); }, 0);
}


// ══════════════════════════════════════════════
