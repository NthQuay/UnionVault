// EVENTS (additional celebrations — own guest list + RSVP)
// ══════════════════════════════════════════════
// Data: STATE.events = [{ id, name, type, date, time, venueName, venueAddress,
//   venueMapUrl, notes, rsvps:{ guestId:'attending'|'declined'|'pending' } }]
// The main wedding stays separate (STATE.event). Per-event RSVP lives on the
// event so guest records stay clean.

const _EVENT_TYPES = ['Rehearsal Dinner','Welcome Drinks','Recovery Brunch','Ceremony','Reception','After-party','Other'];

function _eventIconSvg(type){
  // A small line icon per type; defaults to a calendar.
  const cal='<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>';
  const map={
    'Rehearsal Dinner':'<path d="M3 11h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>',
    'Recovery Brunch':'<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4zM6 1v3M10 1v3M14 1v3"/>',
    'Welcome Drinks':'<path d="M8 22h8M12 11v11M5 3h14l-1 8a6 6 0 0 1-12 0z"/>',
    'After-party':'<path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>',
    'Ceremony':'<path d="M4 21V8M20 21V8M4 8C4 4.7 7.6 2 12 2s8 2.7 8 6M9 21v-4a3 3 0 0 1 6 0v4"/>',
    'Reception':'<path d="M2 15h20M12 5a8 8 0 0 1 8 8H4a8 8 0 0 1 8-8zM8 19h8M12 5V3"/>'
  };
  return map[type]||cal;
}

function _fmtEventDate(d){
  if(!d) return '';
  const dt=new Date(d+'T00:00:00');
  return dt.toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'});
}
function _fmtEventTime(t){
  if(!t) return '';
  const [h,m]=t.split(':').map(Number);
  if(isNaN(h)) return '';
  const ap=h<12?'am':'pm'; let hh=h%12; if(hh===0)hh=12;
  return `${hh}:${String(m||0).padStart(2,'0')}${ap}`;
}
function _eventRsvpCounts(ev){
  const r=ev.rsvps||{};
  let attending=0,declined=0,pending=0;
  Object.values(r).forEach(v=>{ if(v==='attending')attending++; else if(v==='declined')declined++; else pending++; });
  const invited=Object.keys(r).length;
  return {attending,declined,pending,invited};
}
function _eventMetaLine(ev){
  const parts=[];
  const d=_fmtEventDate(ev.date); if(d) parts.push(d);
  const t=_fmtEventTime(ev.time); if(t) parts.push(t);
  if(ev.venueName) parts.push(_esc(ev.venueName));
  return parts.join(' · ');
}

function renderEvents(c, actions){
  if(!Array.isArray(STATE.events)) STATE.events=[];
  if(actions){
    actions.innerHTML=`
      <button class="btn btn-primary btn-sm" onclick="openEventForm()" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap">
        ${_plusIcon()}<span>Add Event</span>
      </button>`;
  }
  const events=STATE.events;
  let body;
  if(!events.length){
    body=`<div class="card" style="text-align:center;padding:40px 24px">
      <div style="width:54px;height:54px;border-radius:14px;background:var(--surface);border:.5px solid var(--border);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;color:var(--gold-deep)">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;margin-bottom:4px">No additional events yet</div>
      <div style="font-size:13px;color:var(--muted);max-width:360px;margin:0 auto 18px;line-height:1.5">Add celebrations like a rehearsal dinner, welcome drinks or recovery brunch — each with its own guest list and RSVPs.</div>
      <button class="btn btn-primary btn-sm" onclick="openEventForm()" style="display:inline-flex;align-items:center;gap:5px">
        ${_plusIcon()}<span>Add your first event</span>
      </button>
    </div>`;
  } else {
    // Sort by date (undated last).
    const sorted=[...events].sort((a,b)=>{
      if(!a.date && !b.date) return 0;
      if(!a.date) return 1; if(!b.date) return -1;
      return a.date<b.date?-1:(a.date>b.date?1:0);
    });
    const cards=sorted.map(ev=>{
      const ct=_eventRsvpCounts(ev);
      const meta=_eventMetaLine(ev)||'<span style="color:var(--muted)">No date set</span>';
      return `<div class="card" style="padding:0;overflow:hidden;cursor:pointer" onclick="openEventDetail('${ev.id}')">
        <div style="display:flex;align-items:center;gap:13px;padding:14px 16px">
          <div style="flex-shrink:0;width:42px;height:42px;border-radius:10px;background:var(--surface);border:.5px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--gold-deep)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${_eventIconSvg(ev.type)}</svg>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14.5px;font-weight:600;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(ev.name||'Untitled event')}</div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${meta}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:13px;font-weight:600;color:var(--green)">${ct.attending} <span style="color:var(--muted);font-weight:400">coming</span></div>
            <div style="font-size:10.5px;color:var(--muted)">of ${ct.invited} invited</div>
          </div>
        </div>
      </div>`;
    }).join('');
    body=`<div style="display:flex;flex-direction:column;gap:10px">${cards}
      <div onclick="openEventForm()" style="background:var(--cream);border:1px dashed var(--border);border-radius:12px;padding:13px 16px;display:flex;align-items:center;justify-content:center;gap:7px;color:var(--gold-deep);font-size:12.5px;font-weight:500;cursor:pointer">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        Add another event
      </div>
    </div>`;
  }
  c.innerHTML=`<div style="max-width:680px">${body}</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT DETAIL — guest list with per-event RSVP
// ═══════════════════════════════════════════════════════════════════════════
let _evDetailId = null;
let _evGlFilter = 'all';
let _evGlManage = false;

function openEventDetail(id){
  _evDetailId = id; _evGlFilter='all'; _evGlManage=false;
  _renderEventDetail();
}

function _renderEventDetail(){
  const ev=(STATE.events||[]).find(e=>e.id===_evDetailId); if(!ev) return;
  if(!ev.rsvps || typeof ev.rsvps!=='object') ev.rsvps={};
  const ct=_eventRsvpCounts(ev);
  const c=document.getElementById('main-content');
  const venueLine=[ev.venueName,ev.venueAddress].filter(Boolean).map(_esc).join(', ');
  const mapLink=ev.venueMapUrl?` \u00b7 <a href="${_escAttr(ev.venueMapUrl)}" target="_blank" rel="noopener" style="color:var(--gold-deep);text-decoration:none">Map</a>`:'';
  const dateLine=[_fmtEventDate(ev.date),_fmtEventTime(ev.time)].filter(Boolean).join(' \u00b7 ');

  c.innerHTML=`<div style="max-width:680px;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--gold-deep);cursor:pointer" onclick="navigate('events')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>All events
    </div>
    <div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:4px">
        <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:var(--ink)">${_esc(ev.name||'Untitled event')}</div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-outline btn-sm" onclick="openEventForm('${ev.id}')">Edit details</button>
        </div>
      </div>
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:16px">
        ${ev.type?`<span style="color:var(--gold-deep);font-weight:500">${_esc(ev.type)}</span>`:''}${(ev.type&&(dateLine||venueLine))?' \u00b7 ':''}${dateLine}${(dateLine&&venueLine)?' \u00b7 ':''}${venueLine}${mapLink}
      </div>
      ${ev.notes?`<div style="font-size:12.5px;color:var(--ink);background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:10px 12px;margin-bottom:16px;line-height:1.5">${_esc(ev.notes)}</div>`:''}
      <div style="display:flex;gap:8px;margin-bottom:4px">
        <div style="flex:1;background:var(--surface);border-radius:9px;padding:10px;text-align:center"><div id="ev-stat-att" style="font-size:18px;font-weight:600;color:var(--green)">${ct.attending}</div><div style="font-size:10px;color:var(--muted)">Attending</div></div>
        <div style="flex:1;background:var(--surface);border-radius:9px;padding:10px;text-align:center"><div id="ev-stat-dec" style="font-size:18px;font-weight:600;color:var(--red)">${ct.declined}</div><div style="font-size:10px;color:var(--muted)">Declined</div></div>
        <div style="flex:1;background:var(--surface);border-radius:9px;padding:10px;text-align:center"><div id="ev-stat-pen" style="font-size:18px;font-weight:600;color:var(--muted)">${ct.pending}</div><div style="font-size:10px;color:var(--muted)">Pending</div></div>
        <div style="flex:1;background:var(--surface);border-radius:9px;padding:10px;text-align:center"><div id="ev-stat-inv" style="font-size:18px;font-weight:600;color:var(--ink)">${ct.invited}</div><div style="font-size:10px;color:var(--muted)">Invited</div></div>
      </div>
    </div>
    ${_evGuestListCard(ev)}
  </div>`;
}

// ── Guest list card ──────────────────────────────────────────────────────
function _evGuestListCard(ev){
  const rsvps=ev.rsvps||{};
  const invitedIds=new Set(Object.keys(rsvps));
  const total=invitedIds.size;
  const attending=Object.values(rsvps).filter(v=>v==='attending').length;
  const declined =Object.values(rsvps).filter(v=>v==='declined').length;
  const pending  =total-attending-declined;

  const head=`<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid var(--border);background:var(--surface)">
    <div style="font-size:12px;font-weight:600;color:var(--ink)">Guest List <span id="ev-gl-n" style="color:var(--muted);font-weight:400">${total}</span></div>
    <button onclick="_evOpenPicker('${ev.id}')" style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:var(--gold-deep);background:transparent;border:1px solid var(--border);border-radius:7px;padding:5px 11px;cursor:pointer;font-family:inherit">${_plusIcon(12)} Add guests</button>
  </div>`;

  if(total===0){
    return `<div class="card" style="padding:0;overflow:hidden">${head}
      <div style="padding:28px 20px;text-align:center;color:var(--muted);font-size:13px;line-height:1.6">No guests added yet.<br>Tap <strong style="color:var(--gold-deep)">Add guests</strong> to invite from your guest list.</div>
    </div>`;
  }

  const chip=(k,l,n)=>{const on=_evGlFilter===k;
    return `<button onclick="_evGlFilter='${k}';_renderEventDetail()" style="font-size:11px;padding:4px 11px;border-radius:12px;border:1px solid ${on?'var(--gold)':'var(--border)'};background:${on?'var(--gold)':'transparent'};color:${on?'#fff':'var(--muted)'};cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0">${l} ${n}</button>`;};
  const chips=`<div style="display:flex;gap:5px;padding:10px 16px;border-bottom:.5px solid var(--border);overflow-x:auto">
    ${chip('all','All',total)}${chip('attending','Attending',attending)}${chip('pending','Pending',pending)}${chip('declined','Declined',declined)}
  </div>`;

  const all=STATE.guests||[]; const byId={}; all.forEach(g=>byId[g.id]=g);
  const invited=all.filter(g=>invitedIds.has(g.id));
  const passes=g=>{const st=rsvps[g.id]||'awaiting';
    if(_evGlFilter==='all')return true;
    if(_evGlFilter==='attending')return st==='attending';
    if(_evGlFilter==='declined')return st==='declined';
    return st!=='attending'&&st!=='declined';};
  const visIds=new Set(invited.filter(passes).map(g=>g.id));

  if(!visIds.size){
    return `<div class="card" style="padding:0;overflow:hidden">${head}${chips}
      <div style="padding:18px 16px;text-align:center;font-size:12.5px;color:var(--muted)">No guests match this filter.</div>
    </div>`;
  }

  // Group couples/families
  const used=new Set(); const groups=[];
  invited.forEach(g=>{
    if(used.has(g.id))return;
    const fam=(STATE.families||[]).find(f=>f.memberIds.includes(g.id));
    if(fam){const mem=fam.memberIds.filter(id=>byId[id]&&invitedIds.has(id)).map(id=>byId[id]);
      if(mem.length>1){mem.forEach(x=>used.add(x.id));groups.push({kind:fam.kind==='household'?'household':'family',members:mem});return;}}
    if(g.coupleId&&invitedIds.has(g.coupleId)&&!used.has(g.coupleId)&&byId[g.coupleId]){
      used.add(g.id);used.add(g.coupleId);groups.push({kind:'couple',members:[g,byId[g.coupleId]]});return;}
    if(g.plusOneId&&invitedIds.has(g.plusOneId)&&!used.has(g.plusOneId)&&byId[g.plusOneId]){
      used.add(g.id);used.add(g.plusOneId);groups.push({kind:'plusone',members:[g,byId[g.plusOneId]]});return;}
    used.add(g.id);groups.push({kind:'single',members:[g]});
  });

  const COL={couple:'var(--gt-couple,#9A7B2E)',plusone:'var(--gt-couple,#9A7B2E)',family:'var(--gt-fam,#5B7BA0)',household:'#8A6BA8'};
  const CFG={attending:{bg:'rgba(74,124,89,.14)',fg:'var(--green)',lbl:'Attending'},
             declined:{bg:'rgba(192,57,43,.12)',fg:'var(--red)',lbl:'Declined'},
             awaiting:{bg:'var(--surface)',fg:'var(--muted)',lbl:'Awaiting',bd:'1px solid var(--border)'}};

  let firstRow=true;
  const rows=groups.map(grp=>{
    const vis=grp.members.filter(g=>visIds.has(g.id));
    if(!vis.length)return '';
    const n=vis.length; const isGrp=n>1; const col=COL[grp.kind]||COL.couple;
    return vis.map((g,i)=>{
      const st=rsvps[g.id]||'awaiting'; const m=CFG[st]||CFG.awaiting;
      const bd=m.bd?`border:${m.bd};`:'border:none;';
      const sub=[g.relationship,(g.dietary&&g.dietary.length)?_dietText(g):''].filter(Boolean).map(_esc).join(' \u00b7 ');
      let brk='';
      if(isGrp){
        const t=i===0?`border-top:2px solid ${col};border-top-left-radius:3px;`:'';
        const b=i===n-1?`border-bottom:2px solid ${col};border-bottom-left-radius:3px;`:'';
        brk=`<div style="width:8px;border-left:2px solid ${col};${t}${b}flex-shrink:0;align-self:stretch;margin-right:6px"></div>`;
      } else { brk=`<div style="width:14px;flex-shrink:0"></div>`; }
      const bord=firstRow?'':(i===0?'border-top:.5px solid var(--border)':'border-top:.5px dashed var(--border)');
      firstRow=false;
      const rm=_evGlManage?`<button onclick="event.stopPropagation();_evRemove('${ev.id}','${g.id}','${_escAttr(g.name)}')" title="Remove" style="width:22px;height:22px;border-radius:5px;background:transparent;border:none;cursor:pointer;color:var(--muted);display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`:'';
      return `<div style="display:flex;align-items:center;gap:8px;padding:9px 16px;${bord};min-height:44px">
        ${brk}
        <div style="width:30px;height:30px;border-radius:50%;background:var(--surface);border:.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--gold-deep);flex-shrink:0">${initials(g.name)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;color:var(--ink);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(g.name)}</div>
          ${sub?`<div style="font-size:11px;color:var(--muted);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${sub}</div>`:''}
        </div>
        <button id="evp-${g.id}" onclick="event.stopPropagation();_evCycle('${ev.id}','${g.id}')" title="Tap to change" style="font-size:11px;font-weight:600;padding:3px 9px;border-radius:10px;background:${m.bg};color:${m.fg};${bd}cursor:pointer;font-family:inherit;flex-shrink:0;white-space:nowrap">${m.lbl}</button>
        ${rm}
      </div>`;
    }).join('');
  }).join('');

  const foot=_evGlManage
    ? `<div style="padding:10px 16px;border-top:.5px solid var(--border);text-align:center"><button onclick="_evGlManage=false;_renderEventDetail()" style="font-size:12px;font-weight:600;color:var(--gold-deep);background:none;border:none;cursor:pointer;font-family:inherit">Done</button></div>`
    : `<div style="padding:10px 16px;border-top:.5px solid var(--border);text-align:center"><button onclick="_evGlManage=true;_renderEventDetail()" style="font-size:12px;color:var(--muted);background:none;border:none;cursor:pointer;font-family:inherit">Manage list (remove guests)</button></div>`;

  return `<div class="card" style="padding:0;overflow:hidden">${head}${chips}<div>${rows}</div>${foot}</div>`;
}

// ── Tap-to-cycle RSVP (in-place pill + stat update, no re-render) ─────────
function _evCycle(evId,gid){
  const ev=(STATE.events||[]).find(e=>e.id===evId); if(!ev) return;
  if(!ev.rsvps) ev.rsvps={};
  const NEXT={awaiting:'attending',attending:'declined',declined:'awaiting'};
  const val=NEXT[ev.rsvps[gid]||'awaiting']||'attending';
  ev.rsvps[gid]=val;
  saveToStorage();

  const CFG={attending:{bg:'rgba(74,124,89,.14)',fg:'var(--green)',lbl:'Attending',bd:'none'},
             declined:{bg:'rgba(192,57,43,.12)',fg:'var(--red)',lbl:'Declined',bd:'none'},
             awaiting:{bg:'var(--surface)',fg:'var(--muted)',lbl:'Awaiting',bd:'1px solid var(--border)'}};
  const m=CFG[val];
  const pill=document.getElementById('evp-'+gid);
  if(pill){ pill.style.background=m.bg; pill.style.color=m.fg; pill.style.border=m.bd; pill.textContent=m.lbl; }

  const ct=_eventRsvpCounts(ev);
  const set=(id,v)=>{const el=document.getElementById(id); if(el) el.textContent=v;};
  set('ev-stat-att',ct.attending); set('ev-stat-dec',ct.declined);
  set('ev-stat-pen',ct.pending);   set('ev-stat-inv',ct.invited);
}

// ── Remove guest ─────────────────────────────────────────────────────────
function _evRemove(evId,gid,gname){
  _confirmDeleteDialog({title:'Remove from event',question:'Remove this guest from the event?',name:gname,verb:'Remove',onConfirmJs:`_evRemoveOk('${evId}','${gid}')`});
}
function _evRemoveOk(evId,gid){
  const ev=(STATE.events||[]).find(e=>e.id===evId); if(!ev||!ev.rsvps) return;
  delete ev.rsvps[gid]; saveToStorage(); _renderEventDetail();
}

// ── Add guests picker ────────────────────────────────────────────────────
// Fit-to-content modal (no fixed height) + no list re-render on tick.
let _evPickSel=new Set();
let _evPickEvId=null;
let _evPickSlots=[];
let _evPickFilters={ages:new Set(),groups:new Set(),tags:new Set()};
let _evPickFilterOpen=false;

function _evOpenPicker(evId){
  const ev=(STATE.events||[]).find(e=>e.id===evId); if(!ev) return;
  if(!ev.rsvps) ev.rsvps={};
  _evPickEvId=evId;
  _evPickSel=new Set();
  _evPickFilters={ages:new Set(),groups:new Set(),tags:new Set()};
  _evPickFilterOpen=false;

  const inSet=new Set(Object.keys(ev.rsvps));
  const all=STATE.guests||[]; const byId={}; all.forEach(g=>byId[g.id]=g);
  const used=new Set(); _evPickSlots=[];
  all.forEach(g=>{
    if(used.has(g.id))return;
    const fam=(STATE.families||[]).find(f=>f.memberIds.includes(g.id));
    if(fam){const mem=fam.memberIds.filter(id=>byId[id]).map(id=>byId[id]);
      if(mem.length>1){mem.forEach(x=>used.add(x.id));_evPickSlots.push({kind:fam.kind==='household'?'household':'family',members:mem,famName:fam.name});return;}}
    if(g.coupleId&&byId[g.coupleId]&&!used.has(g.coupleId)){used.add(g.id);used.add(g.coupleId);_evPickSlots.push({kind:'couple',members:[g,byId[g.coupleId]]});return;}
    if(g.plusOneId&&byId[g.plusOneId]&&!used.has(g.plusOneId)){used.add(g.id);used.add(g.plusOneId);_evPickSlots.push({kind:'plusone',members:[g,byId[g.plusOneId]]});return;}
    used.add(g.id); _evPickSlots.push({kind:'single',members:[g]});
  });

  const body=`<div style="display:flex;flex-direction:column;gap:0">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:6px;flex:1;background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:7px 10px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="evp-q" type="search" placeholder="Search guests\u2026" oninput="_evPickSearch(this.value)" style="border:none;background:transparent;font-family:inherit;font-size:13px;color:var(--ink);outline:none;flex:1;min-width:0" autocomplete="off"/>
      </div>
      <button id="evp-filter-btn" onclick="_evPickToggleFilter()" style="display:flex;align-items:center;gap:4px;background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:7px 11px;font-size:12.5px;color:var(--ink);cursor:pointer;white-space:nowrap;flex-shrink:0">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        Filter<span id="evp-filter-badge" style="display:none;margin-left:3px;background:var(--gold-deep);color:#fff;border-radius:8px;padding:0 5px;font-size:10px;font-weight:700">0</span>
      </button>
    </div>
    <div id="evp-filter-panel" style="display:none;margin-bottom:8px;background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:10px 12px"></div>
    <div id="evp-active-chips" style="display:none;flex-wrap:wrap;gap:5px;margin-bottom:8px"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 2px 6px;border-bottom:.5px solid var(--border);margin-bottom:6px">
      <button id="evp-selall" onclick="_evPickSelectAll()" style="display:flex;align-items:center;gap:7px;background:none;border:none;padding:0;cursor:pointer;font-size:12.5px;color:var(--ink)">
        <span id="evp-selall-box" style="width:18px;height:18px;border-radius:5px;border:1.5px solid var(--border);background:var(--cream);display:flex;align-items:center;justify-content:center;flex-shrink:0"></span>
        Select all
      </button>
      <span id="evp-list-count" style="font-size:11.5px;color:var(--muted)"></span>
    </div>
    <div id="evp-list" style="max-height:min(40vh,340px);overflow-y:auto;border:.5px solid var(--border);border-radius:9px">${_evPickListHtml('',inSet)}</div>
  </div>`;

  const foot=`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%">
    <span id="evp-count" style="font-size:12px;color:var(--muted)">0 selected</span>
    <div style="display:flex;gap:8px">
      <button class="btn" onclick="closeModalDirect()">Cancel</button>
      <button class="btn btn-primary" id="evp-go" onclick="_evPickConfirm()" disabled style="opacity:.45">Add guests</button>
    </div>
  </div>`;

  openModal('Add guests', body, foot);
  _evPickUpdateListCount('');
  _evPickUpdateSelAllBtn();
}

function _evPickListHtml(q, inSet){
  const ql=(q||'').toLowerCase();
  const CHK_ON=`<span style="width:18px;height:18px;border-radius:5px;background:var(--gold-deep);border:1.5px solid var(--gold-deep);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>`;
  const av=g=>`<span style="width:26px;height:26px;border-radius:50%;background:var(--surface);border:.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:var(--gold-deep);flex-shrink:0">${initials(g.name)}</span>`;
  const match=g=>!ql||(g.name||'').toLowerCase().includes(ql)||(g.relationship||'').toLowerCase().includes(ql);
  const passAge=g=>{if(!_evPickFilters.ages.size)return true;const b=_guestAgeBand(g);return _evPickFilters.ages.has(b);};
  const passGroup=s=>{if(!_evPickFilters.groups.size)return true;return _evPickFilters.groups.has(s.kind);};
  const passTag=g=>{if(!_evPickFilters.tags.size)return true;return(g.tags||[]).some(t=>_evPickFilters.tags.has(t));};
  const passAll=g=>match(g)&&passAge(g)&&passTag(g);

  const slots=_evPickSlots.filter(s=>passGroup(s)&&s.members.some(passAll));
  if(!slots.length) return `<div style="padding:20px 16px;text-align:center;font-size:12.5px;color:var(--muted)">No guests found.</div>`;

  return slots.map((s,si)=>{
    const isLastSlot=si===slots.length-1;
    const si2=_evPickSlots.indexOf(s);
    if(s.kind==='single'){
      const g=s.members[0];
      if(!passAll(g)) return '';
      const sub=g.relationship?`<div style="font-size:10.5px;color:var(--muted);margin-top:1px">${_esc(g.relationship)}</div>`:'';
      const bb=isLastSlot?'':'border-bottom:.5px solid var(--border)';
      const badge=_ageBandBadge(g);
      if(inSet.has(g.id)){
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 13px;${bb};opacity:.42">${CHK_ON}${av(g)}
          <div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--ink)">${_esc(g.name)}${badge} <span style="font-size:10px;color:var(--muted)">\u2014 already invited</span></div>${sub}</div></div>`;
      }
      return `<div onclick="_evPickToggle('${g.id}')" style="display:flex;align-items:center;gap:10px;padding:9px 13px;${bb};cursor:pointer">
        <span id="evk-${g.id}" style="width:18px;height:18px;border-radius:5px;border:1.5px solid var(--border);background:var(--cream);display:flex;align-items:center;justify-content:center;flex-shrink:0"></span>${av(g)}
        <div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--ink)">${_esc(g.name)}${badge}</div>${sub}</div></div>`;
    }

    // group header + members
    let gl='',gb='';
    if(s.kind==='couple'||s.kind==='plusone'){
      gl=s.members.map(g=>_esc(g.name)).join(' & ');
      gb=`<span style="font-size:10px;font-weight:600;color:var(--gold-deep);background:rgba(196,168,130,.18);border-radius:4px;padding:1px 5px;margin-left:5px">${s.kind==='couple'?'couple':'+1'}</span>`;
    } else {
      gl=_esc(s.famName||s.members.map(g=>g.name).join(', '));
      gb=`<span style="font-size:10px;font-weight:600;color:#5B7BA0;background:rgba(91,123,160,.13);border-radius:4px;padding:1px 5px;margin-left:5px">${s.kind==='household'?'household':'family'} \u00b7 ${s.members.length}</span>`;
    }
    const isFamily=s.kind==='family'||s.kind==='household';
    const btnS='background:none;border:none;padding:0;cursor:pointer;font-size:10.5px;color:var(--gold-deep);white-space:nowrap';
    const groupActions=`<div style="margin-left:auto;display:flex;align-items:center;gap:6px;padding-left:8px">
      <button onclick="event.stopPropagation();_evPickSelectGroup(${si2})" style="${btnS}">Select group</button>
      ${isFamily?`<span style="color:var(--border)">\u00b7</span><button onclick="event.stopPropagation();_evPickSelectHousehold(${si2})" style="${btnS}">Household</button>`:''}
    </div>`;
    const mem=s.members.filter(passAll);
    const rows=mem.map((g,i)=>{
      const isLastMem=i===mem.length-1;
      const bb=(isLastSlot&&isLastMem)?'':'border-bottom:.5px solid var(--border)';
      const sub=g.relationship?`<div style="font-size:10.5px;color:var(--muted);margin-top:1px">${_esc(g.relationship)}</div>`:'';
      const badge=_ageBandBadge(g);
      if(inSet.has(g.id)){
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 13px 8px 30px;${bb};background:var(--surface);opacity:.42">${CHK_ON}${av(g)}
          <div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--ink)">${_esc(g.name)}${badge} <span style="font-size:10px;color:var(--muted)">\u2014 already invited</span></div>${sub}</div></div>`;
      }
      return `<div onclick="_evPickToggle('${g.id}')" style="display:flex;align-items:center;gap:10px;padding:8px 13px 8px 30px;${bb};background:var(--surface);cursor:pointer">
        <span id="evk-${g.id}" style="width:18px;height:18px;border-radius:5px;border:1.5px solid var(--border);background:var(--cream);display:flex;align-items:center;justify-content:center;flex-shrink:0"></span>${av(g)}
        <div style="flex:1;min-width:0"><div style="font-size:13px;color:var(--ink)">${_esc(g.name)}${badge}</div>${sub}</div></div>`;
    }).join('');
    return `<div><div style="display:flex;align-items:center;padding:6px 13px 4px;background:var(--surface);border-bottom:.5px solid var(--border)">
        <span style="font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)">${gl}</span>${gb}${groupActions}
      </div>${rows}</div>`;
  }).join('');
}

// Tick a guest — updates ONLY that checkbox + the footer. No list re-render.
function _evPickToggle(gid){
  const box=document.getElementById('evk-'+gid); if(!box) return;
  if(_evPickSel.has(gid)){
    _evPickSel.delete(gid);
    box.style.background='var(--cream)'; box.style.borderColor='var(--border)'; box.innerHTML='';
  } else {
    _evPickSel.add(gid);
    box.style.background='var(--gold-deep)'; box.style.borderColor='var(--gold-deep)';
    box.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
  }
  const n=_evPickSel.size;
  const cEl=document.getElementById('evp-count'); if(cEl) cEl.textContent=n?`${n} selected`:'0 selected';
  const gEl=document.getElementById('evp-go');
  if(gEl){
    gEl.disabled=!n; gEl.style.opacity=n?'1':'.45';
    gEl.textContent=n?`Add ${n} guest${n!==1?'s':''}`:'Add guests';
  }
  _evPickUpdateSelAllBtn();
}

function _evPickSearch(q){
  _evPickRebuildAll(q);
}

function _evPickConfirm(){
  const ev=(STATE.events||[]).find(e=>e.id===_evPickEvId); if(!ev) return;
  if(!ev.rsvps) ev.rsvps={};
  _evPickSel.forEach(gid=>{ if(!ev.rsvps[gid]) ev.rsvps[gid]='awaiting'; });
  saveToStorage();
  closeModalDirect();
  _renderEventDetail();
}

function _evPickVisibleSelectableIds(q,inSet){
  const ql=(q||'').toLowerCase();
  const match=g=>!ql||(g.name||'').toLowerCase().includes(ql)||(g.relationship||'').toLowerCase().includes(ql);
  const passAge=g=>{if(!_evPickFilters.ages.size)return true;const b=_guestAgeBand(g);return _evPickFilters.ages.has(b);};
  const passGroup=s=>{if(!_evPickFilters.groups.size)return true;return _evPickFilters.groups.has(s.kind);};
  const passTag=g=>{if(!_evPickFilters.tags.size)return true;return(g.tags||[]).some(t=>_evPickFilters.tags.has(t));};
  const passAll=g=>match(g)&&passAge(g)&&passTag(g);
  const ids=[];
  _evPickSlots.filter(s=>passGroup(s)&&s.members.some(passAll)).forEach(s=>{
    s.members.filter(passAll).forEach(g=>{if(!inSet.has(g.id))ids.push(g.id);});
  });
  return ids;
}

function _evPickSelectAll(){
  const ev=(STATE.events||[]).find(e=>e.id===_evPickEvId); if(!ev) return;
  const inSet=new Set(Object.keys(ev.rsvps||{}));
  const q=document.getElementById('evp-q')?document.getElementById('evp-q').value:'';
  const visible=_evPickVisibleSelectableIds(q,inSet);
  const allSel=visible.length>0&&visible.every(id=>_evPickSel.has(id));
  if(allSel){visible.forEach(id=>_evPickSel.delete(id));}
  else{visible.forEach(id=>_evPickSel.add(id));}
  _evPickRebuildAll(q);
}

function _evPickSelectGroup(si){
  const s=_evPickSlots[si]; if(!s) return;
  const ev=(STATE.events||[]).find(e=>e.id===_evPickEvId); if(!ev) return;
  const inSet=new Set(Object.keys(ev.rsvps||{}));
  s.members.forEach(g=>{if(!inSet.has(g.id))_evPickSel.add(g.id);});
  const q=document.getElementById('evp-q')?document.getElementById('evp-q').value:'';
  _evPickRebuildAll(q);
}

function _evPickSelectHousehold(si){
  const s=_evPickSlots[si]; if(!s) return;
  const ev=(STATE.events||[]).find(e=>e.id===_evPickEvId); if(!ev) return;
  const inSet=new Set(Object.keys(ev.rsvps||{}));
  s.members.filter(g=>_guestAgeBand(g)==='adult').forEach(g=>{if(!inSet.has(g.id))_evPickSel.add(g.id);});
  const q=document.getElementById('evp-q')?document.getElementById('evp-q').value:'';
  _evPickRebuildAll(q);
}

function _evPickUpdateSelectionUi(){
  const n=_evPickSel.size;
  const cEl=document.getElementById('evp-count'); if(cEl) cEl.textContent=n?`${n} selected`:'0 selected';
  const gEl=document.getElementById('evp-go');
  if(gEl){gEl.disabled=!n;gEl.style.opacity=n?'1':'.45';gEl.textContent=n?`Add ${n} guest${n!==1?'s':''}`:'Add guests';}
  _evPickUpdateSelAllBtn();
}

function _evPickUpdateSelAllBtn(){
  const ev=(STATE.events||[]).find(e=>e.id===_evPickEvId); if(!ev) return;
  const inSet=new Set(Object.keys(ev.rsvps||{}));
  const q=document.getElementById('evp-q')?document.getElementById('evp-q').value:'';
  const visible=_evPickVisibleSelectableIds(q,inSet);
  const box=document.getElementById('evp-selall-box'); if(!box) return;
  if(!visible.length){box.style.borderColor='var(--border)';box.style.background='var(--cream)';box.innerHTML='';return;}
  const selCount=visible.filter(id=>_evPickSel.has(id)).length;
  if(selCount===0){box.style.borderColor='var(--border)';box.style.background='var(--cream)';box.innerHTML='';}
  else if(selCount===visible.length){box.style.background='var(--gold-deep)';box.style.borderColor='var(--gold-deep)';box.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';}
  else{box.style.background='var(--gold-deep)';box.style.borderColor='var(--gold-deep)';box.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>';}
}

function _evPickUpdateListCount(q){
  const ev=(STATE.events||[]).find(e=>e.id===_evPickEvId); if(!ev) return;
  const inSet=new Set(Object.keys(ev.rsvps||{}));
  const visible=_evPickVisibleSelectableIds(q,inSet);
  const el=document.getElementById('evp-list-count'); if(!el) return;
  el.textContent=visible.length?`${visible.length} guest${visible.length!==1?'s':''}` :'';
}

function _evPickRebuildAll(q){
  const ev=(STATE.events||[]).find(e=>e.id===_evPickEvId); if(!ev) return;
  const inSet=new Set(Object.keys(ev.rsvps||{}));
  const listEl=document.getElementById('evp-list');
  if(listEl) listEl.innerHTML=_evPickListHtml(q||'',inSet);
  _evPickSel.forEach(gid=>{
    const box=document.getElementById('evk-'+gid);
    if(box){box.style.background='var(--gold-deep)';box.style.borderColor='var(--gold-deep)';
      box.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';}
  });
  _evPickUpdateSelectionUi();
  _evPickUpdateListCount(q||'');
  _evPickUpdateActiveChips();
}

function _evPickUpdateActiveChips(){
  const el=document.getElementById('evp-active-chips'); if(!el) return;
  const chips=[];
  const AGE_LABELS={adult:'Adults',child:'Children',infant:'Infants'};
  const GRP_LABELS={single:'Singles',couple:'Couples',plusone:'Plus ones',family:'Families',household:'Households'};
  _evPickFilters.ages.forEach(v=>chips.push({label:AGE_LABELS[v]||v,remove:`_evPickToggleAgeFilter(${JSON.stringify(v)})`}));
  _evPickFilters.groups.forEach(v=>chips.push({label:GRP_LABELS[v]||v,remove:`_evPickToggleGroupFilter(${JSON.stringify(v)})`}));
  _evPickFilters.tags.forEach(v=>chips.push({label:v,remove:`_evPickToggleTagFilter(${JSON.stringify(v)})`}));
  if(!chips.length){el.style.display='none';el.innerHTML='';return;}
  el.style.display='flex';
  el.innerHTML=chips.map(c=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--surface);border:.5px solid var(--gold-deep);border-radius:12px;padding:3px 8px;font-size:11.5px;color:var(--gold-deep)">${_esc(c.label)}<button onclick="${c.remove}" style="background:none;border:none;padding:0;cursor:pointer;font-size:13px;color:var(--gold-deep);line-height:1">×</button></span>`).join('');
}

function _evPickToggleFilter(){
  _evPickFilterOpen=!_evPickFilterOpen;
  const panel=document.getElementById('evp-filter-panel'); if(!panel) return;
  const btn=document.getElementById('evp-filter-btn');
  if(_evPickFilterOpen){
    panel.style.display='block';
    panel.innerHTML=_evPickFilterPanelHtml();
    if(btn) btn.style.borderColor='var(--gold-deep)';
  } else {
    panel.style.display='none';
    if(btn) btn.style.borderColor='var(--border)';
  }
  _evPickRebuildFilterBadge();
}

function _evPickRebuildFilterBadge(){
  const n=_evPickFilters.ages.size+_evPickFilters.groups.size+_evPickFilters.tags.size;
  const badge=document.getElementById('evp-filter-badge'); if(!badge) return;
  badge.style.display=n?'inline':'none'; badge.textContent=n;
  const btn=document.getElementById('evp-filter-btn');
  if(btn) btn.style.color=n?'var(--gold-deep)':'var(--ink)';
}

function _evPickFilterPanelHtml(){
  const all=STATE.guests||[];
  const allTags=[...new Set(all.flatMap(g=>g.tags||[]))].sort();
  const chip=(label,active,onclick)=>`<button onclick="${onclick}" style="background:${active?'var(--gold-deep)':'var(--surface)'};color:${active?'#fff':'var(--ink)'};border:.5px solid ${active?'var(--gold-deep)':'var(--border)'};border-radius:12px;padding:4px 10px;font-size:11.5px;cursor:pointer">${_esc(label)}</button>`;
  const AGE=[['adult','Adults'],['child','Children'],['infant','Infants']];
  const GRP=[['single','Singles'],['couple','Couples'],['plusone','Plus ones'],['family','Families'],['household','Households']];
  const ageChips=AGE.map(([v,l])=>chip(l,_evPickFilters.ages.has(v),`_evPickToggleAgeFilter(${JSON.stringify(v)})`)).join('');
  const grpChips=GRP.map(([v,l])=>chip(l,_evPickFilters.groups.has(v),`_evPickToggleGroupFilter(${JSON.stringify(v)})`)).join('');
  const tagChips=allTags.map(t=>chip(t,_evPickFilters.tags.has(t),`_evPickToggleTagFilter(${JSON.stringify(t)})`)).join('');
  const hasAny=_evPickFilters.ages.size+_evPickFilters.groups.size+_evPickFilters.tags.size>0;
  let html=`<div style="display:flex;flex-direction:column;gap:10px">`;
  html+=`<div style="display:flex;flex-direction:column;gap:5px"><div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Age group</div><div style="display:flex;flex-wrap:wrap;gap:5px">${ageChips}</div></div>`;
  html+=`<div style="display:flex;flex-direction:column;gap:5px"><div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Group type</div><div style="display:flex;flex-wrap:wrap;gap:5px">${grpChips}</div></div>`;
  if(allTags.length) html+=`<div style="display:flex;flex-direction:column;gap:5px"><div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Tags</div><div style="display:flex;flex-wrap:wrap;gap:5px">${tagChips}</div></div>`;
  if(hasAny) html+=`<div style="text-align:right"><button onclick="_evPickClearFilter()" style="background:none;border:none;padding:0;cursor:pointer;font-size:11.5px;color:var(--muted)">Clear all</button></div>`;
  html+=`</div>`;
  return html;
}

function _evPickToggleAgeFilter(v){
  if(_evPickFilters.ages.has(v))_evPickFilters.ages.delete(v);else _evPickFilters.ages.add(v);
  _evPickApplyFilter();
}
function _evPickToggleGroupFilter(v){
  if(_evPickFilters.groups.has(v))_evPickFilters.groups.delete(v);else _evPickFilters.groups.add(v);
  _evPickApplyFilter();
}
function _evPickToggleTagFilter(v){
  if(_evPickFilters.tags.has(v))_evPickFilters.tags.delete(v);else _evPickFilters.tags.add(v);
  _evPickApplyFilter();
}
function _evPickClearFilter(){
  _evPickFilters={ages:new Set(),groups:new Set(),tags:new Set()};
  _evPickApplyFilter();
}
function _evPickApplyFilter(){
  if(_evPickFilterOpen){
    const panel=document.getElementById('evp-filter-panel');
    if(panel) panel.innerHTML=_evPickFilterPanelHtml();
  }
  const q=document.getElementById('evp-q')?document.getElementById('evp-q').value:'';
  _evPickRebuildFilterBadge();
  _evPickRebuildAll(q);
}

function openEventForm(id){
  const ev=id?(STATE.events||[]).find(e=>e.id===id):null;
  const isEdit=!!ev;
  const typeOpts=_EVENT_TYPES.map(t=>`<option value="${_escAttr(t)}" ${ev&&ev.type===t?'selected':''}>${_esc(t)}</option>`).join('');
  // Custom type handling: if the saved type isn't a preset, preselect "Other" and show its text.
  const isCustom = ev && ev.type && !_EVENT_TYPES.includes(ev.type);
  openModal(isEdit?'Edit Event':'Add Event',`
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="form-group"><label class="form-label">Event name</label>
        <input class="form-input" id="ev-name" placeholder="e.g. Rehearsal Dinner" value="${ev?_escAttr(ev.name||''):''}"/></div>
      <div class="form-group"><label class="form-label">Type</label>
        <select class="form-input" id="ev-type" onchange="_evTypeChange()">
          ${typeOpts}
        </select>
        <input class="form-input" id="ev-type-custom" placeholder="Custom type…" value="${isCustom?_escAttr(ev.type):''}" style="margin-top:8px;display:${isCustom?'block':'none'}"/>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" id="ev-date" value="${ev?_escAttr(ev.date||''):''}"/></div>
        <div class="form-group"><label class="form-label">Time</label><input class="form-input" type="time" id="ev-time" value="${ev?_escAttr(ev.time||''):''}"/></div>
      </div>
      <div class="form-group"><label class="form-label">Venue name</label><input class="form-input" id="ev-venue" placeholder="e.g. The Boathouse" value="${ev?_escAttr(ev.venueName||''):''}"/></div>
      <div class="form-group"><label class="form-label">Venue address</label><input class="form-input" id="ev-addr" placeholder="Optional" value="${ev?_escAttr(ev.venueAddress||''):''}"/></div>
      <div class="form-group"><label class="form-label">Map link</label><input class="form-input" id="ev-map" placeholder="Optional — paste a Google Maps URL" value="${ev?_escAttr(ev.venueMapUrl||''):''}"/></div>
      <div class="form-group"><label class="form-label">Notes</label><input class="form-input" id="ev-notes" placeholder="Optional" value="${ev?_escAttr(ev.notes||''):''}"/></div>
    </div>`,
    `${isEdit?`<button class="btn btn-outline" style="margin-right:auto;color:var(--red)" onclick="deleteEvent('${ev.id}')">Delete</button>`:''}
     <button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-primary" onclick="saveEvent(${isEdit?`'${ev.id}'`:'null'})">${isEdit?'Save':'Add'}</button>`);
  // If editing a preset type, the custom box stays hidden; if "Other" selected, reveal.
  setTimeout(_evTypeChange,0);
}
function _evTypeChange(){
  const sel=document.getElementById('ev-type'); const cust=document.getElementById('ev-type-custom');
  if(!sel||!cust) return;
  cust.style.display = (sel.value==='Other')?'block':'none';
}
function saveEvent(id){
  const name=(document.getElementById('ev-name').value||'').trim();
  if(!name){ const n=document.getElementById('ev-name'); if(n){ n.focus(); } return; }
  const sel=document.getElementById('ev-type').value;
  const custom=(document.getElementById('ev-type-custom').value||'').trim();
  const type = (sel==='Other' && custom) ? custom : sel;
  const fields={
    name,
    type,
    date:document.getElementById('ev-date').value||'',
    time:document.getElementById('ev-time').value||'',
    venueName:(document.getElementById('ev-venue').value||'').trim(),
    venueAddress:(document.getElementById('ev-addr').value||'').trim(),
    venueMapUrl:(typeof _normalizeUrl==='function'?_normalizeUrl(document.getElementById('ev-map').value||''):(document.getElementById('ev-map').value||'').trim()),
    notes:(document.getElementById('ev-notes').value||'').trim()
  };
  if(!Array.isArray(STATE.events)) STATE.events=[];
  let savedId=id;
  if(id){
    const ev=STATE.events.find(e=>e.id===id);
    if(ev) Object.assign(ev, fields);
  } else {
    savedId=uid();
    STATE.events.push(Object.assign({id:savedId, rsvps:{}}, fields));
  }
  saveToStorage();
  closeModalDirect();
  // Return to detail if we were editing an existing event, else the list.
  if(id) openEventDetail(savedId); else navigate('events');
}
function deleteEvent(id){
  const ev=(STATE.events||[]).find(e=>e.id===id); if(!ev) return;
  const nm=ev.name||'this event';
  if(typeof _confirmDeleteDialog==='function'){
    _confirmDeleteDialog({title:'Delete Event', question:'Delete this event and its guest list?', name:nm, verb:'Delete', onConfirmJs:`confirmDeleteEvent('${id}')`});
  } else if(confirm('Delete '+nm+'?')){ confirmDeleteEvent(id); }
}
function confirmDeleteEvent(id){
  closeModalDirect();
  const run=()=>{ STATE.events=(STATE.events||[]).filter(e=>e.id!==id); navigate('events'); };
  if(typeof _undoableDelete==='function'){
    const ev=(STATE.events||[]).find(e=>e.id===id); const nm=ev?(ev.name||'event'):'event';
    _undoableDelete(nm, ()=>{ STATE.events=(STATE.events||[]).filter(e=>e.id!==id); }, 'events');
  } else { run(); }
}

// ══════════════════════════════════════════════
