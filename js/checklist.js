// CHECKLIST
// ══════════════════════════════════════════════
let checklistView = (STATE.settings && STATE.settings.checklistView) || 'date'; // 'date' | 'category'
let checklistDoneMode = (STATE.settings && STATE.settings.checklistDoneMode) || 'move'; // 'move' | 'cross'
let checklistCatOrderMode = (STATE.settings && STATE.settings.checklistCatOrderMode) || 'custom'; // 'custom' | 'alpha'
let checklistCatReorder = false; // whether custom-mode drag handles are active
// "Due soon" windows (days). Default 14; user-settable per area in Settings.
function _clDueWindow(){ return (STATE.settings && STATE.settings.checklistDueWindow===7) ? 7 : 14; }
function _budgetDueWindow(){ return (STATE.settings && STATE.settings.budgetDueWindow===7) ? 7 : 14; }

// ── Page search (checklist + budget) ─────────────────────────────────────────
let _checklistSearch='';
let _budgetSearch='';
let _vendorSearch='';
function _searchNorm(s){ return String(s||'').toLowerCase().trim(); }
// Highlight occurrences of the query within text (HTML-escaped), wrapping matches.
function _highlight(text, query){
  const t=String(text==null?'':text);
  const q=_searchNorm(query);
  if(!q) return _escHtml(t);
  const lower=t.toLowerCase();
  let out='', i=0;
  while(i<t.length){
    const idx=lower.indexOf(q, i);
    if(idx<0){ out+=_escHtml(t.slice(i)); break; }
    out+=_escHtml(t.slice(i, idx));
    out+=`<span style="background:rgba(196,168,130,.30);border-radius:3px;padding:0 1px">${_escHtml(t.slice(idx, idx+q.length))}</span>`;
    i=idx+q.length;
  }
  return out;
}
// Does a checklist task match the query? (text, notes, category, linked budget names)
function _taskMatchesSearch(i, q){
  q=_searchNorm(q); if(!q) return true;
  if(_searchNorm(i.text).includes(q)) return true;
  if(_searchNorm(i.notes).includes(q)) return true;
  if(_searchNorm(i.category).includes(q)) return true;
  if(i.budgetId){
    const b=STATE.budget.items.find(x=>x.id===i.budgetId);
    if(b){
      if(_searchNorm(b.name).includes(q)) return true;
      if(i.budgetSubId){ const s=b.subItems?.find(x=>x.id===i.budgetSubId); if(s && _searchNorm(s.name).includes(q)) return true; }
    }
  }
  return false;
}
// A reusable search-bar component.
function _searchBarHtml(inputId, value, oninputFn, placeholder){
  const v=String(value||'');
  return `<div style="position:relative;margin-bottom:10px">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input id="${inputId}" class="form-input" placeholder="${placeholder}" value="${v.replace(/"/g,'&quot;')}" style="padding:6px 30px 6px 30px;font-size:12.5px;height:32px;width:100%" oninput="${oninputFn}(this.value)" onkeydown="if(event.key==='Escape'){event.stopPropagation();${oninputFn}('');this.value='';}"/>
    <button type="button" onclick="${oninputFn}('');const _el=document.getElementById('${inputId}');if(_el){_el.value='';_el.focus();}" title="Clear" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:0;display:flex;align-items:center;opacity:${v?1:0};pointer-events:${v?'auto':'none'}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  </div>`;
}
function setChecklistSearch(v){
  _checklistSearch=v||'';
  navigate('checklist');
  // Refocus synchronously in the same gesture tick so the mobile keyboard
  // doesn't dismiss and re-open (a deferred setTimeout focus causes the flash).
  const el=document.getElementById('checklist-search');
  if(el){ el.focus({preventScroll:true}); const n=el.value.length; try{el.setSelectionRange(n,n);}catch(_){} }
}
function setBudgetSearch(v){
  _budgetSearch=v||'';
  navigate('budget');
  const el=document.getElementById('budget-search');
  if(el){ el.focus({preventScroll:true}); const n=el.value.length; try{el.setSelectionRange(n,n);}catch(_){} }
}
function setVendorSearch(v){
  _vendorSearch=v||'';
  navigate('vendors');
  const el=document.getElementById('vendor-search');
  if(el){ el.focus({preventScroll:true}); const n=el.value.length; try{el.setSelectionRange(n,n);}catch(_){} }
}
// Fluid checklist header buttons: shrink labels through 3 stages to fit the top bar.
//   Add Task:  "+ Add Task" → "+ Task" → "+"
//   By Date:   "By Date"    → "Date"   → (icon only)
//   By Category:"By Category"→ "Category"→ (icon only)
// All three step down together, driven by real available width.
const _CL_STAGES={
  add:['Add Task','Task',''],
  date:['By Date','Date',''],
  cat:['By Category','Category','']
};
let _clStage=0; // remembered across re-renders so we can apply it before paint
function _applyClStage(stage){
  const addL=document.getElementById('cl-add-btn')?.querySelector('.cl-add-label');
  const dateBtn=document.getElementById('cl-date-btn');
  const catBtn=document.getElementById('cl-cat-btn');
  const dateL=dateBtn?.querySelector('.cl-view-label');
  const catL=catBtn?.querySelector('.cl-view-label');
  if(addL){ const t=_CL_STAGES.add[stage]; addL.textContent=t; addL.style.display = t?'inline':'none'; }
  if(dateL) dateL.textContent=_CL_STAGES.date[stage];
  if(catL) catL.textContent=_CL_STAGES.cat[stage];
  // In the icon-only stage, drop the gap so the button hugs its icon.
  const iconOnly = stage===2;
  if(dateBtn) dateBtn.style.gap = iconOnly?'0':'6px';
  if(catBtn) catBtn.style.gap = iconOnly?'0':'6px';
}
function _fitChecklistAddBtn(){
  const actions=document.getElementById('topbar-actions');
  const header=actions?actions.closest('.topbar'):null;
  if(!actions||!header||!document.getElementById('cl-add-btn')) return;

  // Available width for the actions = header inner − title's MINIMUM width − gap.
  const cs=getComputedStyle(header);
  const padL=parseFloat(cs.paddingLeft)||0, padR=parseFloat(cs.paddingRight)||0, gap=parseFloat(cs.columnGap||cs.gap)||12;
  const headerInner=header.clientWidth - padL - padR;
  const titleMin=150;
  const avail = headerInner - titleMin - gap;

  // Natural width of the actions row = sum of children content widths + gaps.
  const acs=getComputedStyle(actions);
  const aGap=parseFloat(acs.columnGap||acs.gap)||8;
  function actionsNaturalWidth(){
    const kids=Array.from(actions.children);
    let w=0; kids.forEach(k=>{ w+=k.scrollWidth; });
    w += aGap*Math.max(0, kids.length-1);
    return w;
  }
  // Try stages fullest→shortest; keep the first whose natural width fits.
  let chosen=2;
  for(let s=0;s<3;s++){
    _applyClStage(s);
    if(actionsNaturalWidth()<=avail){ chosen=s; break; }
  }
  _clStage=chosen;
  _applyClStage(chosen);
}
// Keep it responsive as the window/sidebar changes.
let _clAddRO=null;
function _ensureChecklistAddObserver(){
  const header=document.querySelector('.topbar');
  if(!header || _clAddRO) return;
  if(typeof ResizeObserver!=='function') return; // graceful fallback: stays at full label
  _clAddRO=new ResizeObserver(()=>{ if(document.getElementById('cl-add-btn')) requestAnimationFrame(_fitChecklistAddBtn); });
  _clAddRO.observe(header);
}
window.addEventListener('resize', ()=>{ if(document.getElementById('cl-add-btn')) _fitChecklistAddBtn(); });

// ── Checklist archive ────────────────────────────────────────────────────────
// Archived tasks are set aside: hidden from the normal By Date / By Category
// views, from search, and from the dashboard progress count, but kept in
// STATE.checklist so budget links etc. still resolve. They live on their own
// sub-page reachable from the Archived button.
let _clArchivedView = false;
function _activeChecklist(){ return STATE.checklist.filter(i=>!i.archived); }
function _archivedChecklist(){ return STATE.checklist.filter(i=>i.archived); }
function archiveCheckitem(id){
  const t=STATE.checklist.find(x=>x.id===id); if(!t) return;
  t.archived=true; t.pinned=false; // archived items shouldn't stay pinned to the dashboard
  saveToStorage();
  navigate('checklist');
}
function unarchiveCheckitem(id){
  const t=STATE.checklist.find(x=>x.id===id); if(!t) return;
  t.archived=false;
  saveToStorage();
  navigate('checklist');
}
// Permanently delete every archived task (active checklist is untouched).
function _deleteAllArchived(){
  const n=_archivedChecklist().length; if(!n) return;
  _confirmDeleteDialog({
    title:'Delete all archived',
    question:`Delete all ${n} archived item${n!==1?'s':''}?`,
    verb:'Delete all',
    noteVerb:'permanently removed',
    onConfirmJs:'_confirmDeleteAllArchived()'
  });
}
function _confirmDeleteAllArchived(){
  const _n=STATE.checklist.filter(x=>x.archived).length;
  const _label=_n+' archived task'+(_n===1?'':'s');
  closeModalDirect();
  _undoableDelete(_label, ()=>{
    STATE.checklist = STATE.checklist.filter(x=>!x.archived);
  }, 'checklist');
}
function openChecklistArchived(){ _clArchivedView=true; navigate('checklist'); }
function closeChecklistArchived(){ _clArchivedView=false; navigate('checklist'); }
function _archivedBtnHtml(){
  const n=_archivedChecklist().length;
  return `<button class="btn btn-outline btn-sm archived-btn" onclick="openChecklistArchived()" title="View archived items" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap;height:32px;padding:0 11px;flex-shrink:0">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><line x1="10" y1="13" x2="14" y2="13"/></svg>
    <span class="archived-label">Archived</span>${n?` <span style="font-size:11px;font-weight:600;color:var(--gold-deep);background:rgba(196,168,130,.18);border-radius:9px;padding:0 6px;margin-left:1px">${n}</span>`:''}
  </button>`;
}
function renderChecklistArchived(c, actions){
  actions.innerHTML=`<button class="btn btn-sm gbtn btn-primary" onclick="closeChecklistArchived()" title="Go back" style="white-space:nowrap;display:inline-flex;align-items:center;gap:5px">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
    <span class="gbtn-label">Go Back</span>
  </button>`;
  const items=_archivedChecklist();
  const cnt=items.length;
  let rows;
  if(!cnt){
    rows=`<div style="font-size:13px;color:var(--muted);padding:26px 16px;text-align:center">No archived items. Use the ··· menu on any task and choose <strong>Archive</strong> to set it aside here.</div>`;
  } else {
    rows=items.map(i=>checkItemHtml(i,'archived')).join('');
  }
  c.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:2px">
    <div class="section-title" style="margin-bottom:0">Archived</div>
    ${cnt?`<button class="btn btn-sm archived-deleteall-btn" onclick="_deleteAllArchived()" title="Delete all archived items" style="display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 11px;white-space:nowrap;background:none;border:.5px solid var(--red);color:var(--red)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Delete all</button>`:''}
  </div>
  <div style="font-size:12px;color:var(--muted);margin-bottom:16px">${cnt?`${cnt} archived item${cnt!==1?'s':''} — restore to return ${cnt!==1?'them':'it'} to your checklist`:'Items you set aside will appear here'}</div>
  <div class="card checklist-compact">
    ${rows}
  </div>`;
}
function renderChecklist(c,actions){
  if(typeof closeDots==='function') closeDots(); // sweep any portaled ··· menu before rebuilding rows
  if(_clArchivedView){ renderChecklistArchived(c, actions); return; }
  actions.innerHTML=`
    <div style="display:flex;gap:6px;align-items:center">
      <button class="btn btn-sm ${checklistView==='date'?'btn-primary':'btn-outline'}" id="cl-date-btn" onclick="onByDateClick()" title="${checklistDoneMode==='cross'?'Completed items stay in place, crossed out':'Completed items move to Done'}" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap">${checklistDoneMode==='cross'?`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="12" cy="16" r="2.4"/><line x1="12" y1="18.4" x2="12" y2="21"/></svg>`:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4h10M11 8h7M11 12h10M11 16h7"/><path d="M3 6l2 2 3-3"/><path d="M5 14v6M2 17l3 3 3-3"/></svg>`}<span class="cl-view-label" style="white-space:nowrap">By Date</span></button>
      <button class="btn btn-sm ${checklistView==='category'?'btn-primary':'btn-outline'}" id="cl-cat-btn" onclick="onByCategoryClick()" title="${checklistCatOrderMode==='custom'?'Custom order — drag categories to arrange':'Alphabetical order'}" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap">${checklistCatOrderMode==='custom'?`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`:`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11M3 12h8M3 17h5"/><path d="M19 5v14M19 5l-2.5 2.5M19 5l2.5 2.5"/></svg>`}<span class="cl-view-label" style="white-space:nowrap">By Category</span></button>
    </div>
    <button class="btn btn-primary btn-sm" id="cl-add-btn" onclick="openAddCheckitem()" style="white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:5px">${_plusIcon()}<span class="cl-add-label" style="white-space:nowrap">Add Task</span></button>`;
  // Apply the last-known stage immediately (before paint) to avoid a full-label
  // flash on view switches, then re-measure on the next frame.
  _applyClStage(_clStage);
  setTimeout(()=>{ _ensureChecklistAddObserver(); requestAnimationFrame(_fitChecklistAddBtn); _positionPinnedAlerts('checklist'); }, 0);

  const today = new Date(); today.setHours(0,0,0,0);
  const MS_PER_MONTH = 30.4375 * 86400000;

  function monthsUntil(dateStr){
    if(!dateStr) return null;
    const due = new Date(dateStr+'T00:00:00');
    return (due - today) / MS_PER_MONTH;
  }

  let html = `<div class="checklist-compact">`;
  html += `<div class="page-search-sticky"><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;min-width:0">${_searchBarHtml('checklist-search', _checklistSearch, 'setChecklistSearch', 'Search tasks…')}</div>${_archivedBtnHtml()}</div></div>`;
  html += _renderChecklistAlertsBar();

  if(checklistView === 'date'){
    // Build dynamic date groups based on months until wedding
    const weddingDate = STATE.event.date ? new Date(STATE.event.date+'T00:00:00') : null;
    const monthsToWedding = weddingDate ? (weddingDate - today) / MS_PER_MONTH : null;

    // monthsBeforeWedding: how many months before the wedding is this item due?
    // positive = before wedding, 0 = at wedding, negative = after wedding
    function monthsBeforeWedding(dateStr){
      if(!dateStr || !weddingDate) return null;
      const due = new Date(dateStr+'T00:00:00');
      return (weddingDate - due) / MS_PER_MONTH;
    }

    let DATE_GROUPS;
    if(monthsToWedding !== null && monthsToWedding > 0){
      const w = Math.ceil(monthsToWedding);
      // Build bands from furthest-from-wedding to closest, then overdue, then after wedding
      // Each band: [mbwLo, mbwHi, label, color]
      // mbw = months before wedding (item due this many months before the wedding)
      const bands = [];
      if(w > 12){
        bands.push([12, w,  `${Math.round(w)} – 12 months before wedding`, 'var(--muted)']);
        bands.push([9,  12, '9 – 12 months before wedding',                'var(--muted)']);
        bands.push([6,  9,  '6 – 9 months before wedding',                 'var(--muted)']);
        bands.push([3,  6,  '3 – 6 months before wedding',                 'var(--gold)']);
        bands.push([1,  3,  '1 – 3 months before wedding',                 'var(--gold-deep)']);
        bands.push([0,  1,  'Less than 1 month before wedding',            'var(--red)']);
      } else if(w > 6){
        bands.push([6,  w,  `6 – ${Math.round(w)} months before wedding`,  'var(--muted)']);
        bands.push([3,  6,  '3 – 6 months before wedding',                 'var(--gold)']);
        bands.push([1,  3,  '1 – 3 months before wedding',                 'var(--gold-deep)']);
        bands.push([0,  1,  'Less than 1 month before wedding',            'var(--red)']);
      } else if(w > 3){
        bands.push([3,  w,  `3 – ${Math.round(w)} months before wedding`,  'var(--gold)']);
        bands.push([1,  3,  '1 – 3 months before wedding',                 'var(--gold-deep)']);
        bands.push([0,  1,  'Less than 1 month before wedding',            'var(--red)']);
      } else if(w > 1){
        bands.push([1,  w,  `1 – ${Math.round(w)} months before wedding`,  'var(--gold-deep)']);
        bands.push([0,  1,  'Less than 1 month before wedding',            'var(--red)']);
      } else {
        bands.push([0,  w,  'Wedding soon!',                               'var(--red)']);
      }

      // Group test uses monthsBeforeWedding (mbw)
      DATE_GROUPS = [
        ...bands.map(([lo,hi,label,color],idx)=>({
          key:`band${idx}`, label, color,
          test:(m,done,mbw)=>!done&&mbw!==null&&mbw>=lo&&mbw<hi&&monthsUntil(null)===null// placeholder — replaced below
        })),
        { key:'overdue',      label:'Overdue',            color:'var(--red-deep)', test:(m,done)=>!done&&m!==null&&m<0 },
        { key:'afterwedding', label:`After ${fmtDate(STATE.event.date)}`, color:'var(--muted)', test:(m,done,mbw)=>!done&&mbw!==null&&mbw<0 },
        { key:'nodate',       label:'No due date',        color:'var(--muted)',    test:(m,done)=>!done&&m===null },
        { key:'done',         label:'Completed',          color:'var(--green)',    test:(m,done)=>done },
      ];

      // Rebuild with proper mbw-based tests
      DATE_GROUPS = [
        { key:'overdue',      label:'Overdue',                          color:'var(--red-deep)', testFn:(item)=>!item.done&&item.dueDate&&monthsUntil(item.dueDate)<0 },
        ...bands.map(([lo,hi,label,color],idx)=>({
          key:`band${idx}`, label, color,
          testFn:(item)=>{
            if(item.done||!item.dueDate) return false;
            const m=monthsUntil(item.dueDate);
            if(m===null||m<0) return false;
            const mbw=monthsBeforeWedding(item.dueDate);
            return mbw!==null && mbw>=lo && mbw<hi;
          }
        })),
        { key:'afterwedding', label:`After ${fmtDate(STATE.event.date)}`, color:'var(--muted)', testFn:(item)=>!item.done&&item.dueDate&&monthsBeforeWedding(item.dueDate)<0&&monthsUntil(item.dueDate)>=0 },
        { key:'nodate',       label:'No due date',                      color:'var(--muted)',    testFn:(item)=>!item.done&&!item.dueDate },
        { key:'done',         label:'Completed',                        color:'var(--green)',    testFn:(item)=>!!item.done },
      ];
    } else {
      // No wedding date or already past — use fixed ranges
      DATE_GROUPS = [
        { key:'overdue',label:'Overdue', color:'var(--red-deep)',    testFn:(item)=>!item.done&&item.dueDate&&monthsUntil(item.dueDate)<0 },
        { key:'12plus', label:'12+ months', color:'var(--muted)',    testFn:(item)=>!item.done&&item.dueDate&&monthsUntil(item.dueDate)>=12 },
        { key:'9to12m', label:'9 – 12 months', color:'var(--muted)',testFn:(item)=>!item.done&&item.dueDate&&monthsUntil(item.dueDate)>=9&&monthsUntil(item.dueDate)<12 },
        { key:'6to9m',  label:'6 – 9 months', color:'var(--muted)', testFn:(item)=>!item.done&&item.dueDate&&monthsUntil(item.dueDate)>=6&&monthsUntil(item.dueDate)<9 },
        { key:'3to6m',  label:'3 – 6 months', color:'var(--gold)',  testFn:(item)=>!item.done&&item.dueDate&&monthsUntil(item.dueDate)>=3&&monthsUntil(item.dueDate)<6 },
        { key:'1to3m',  label:'1 – 3 months', color:'var(--gold-deep)', testFn:(item)=>!item.done&&item.dueDate&&monthsUntil(item.dueDate)>=1&&monthsUntil(item.dueDate)<3 },
        { key:'lt1m',   label:'Less than 1 month', color:'var(--red)', testFn:(item)=>!item.done&&item.dueDate&&monthsUntil(item.dueDate)>=0&&monthsUntil(item.dueDate)<1 },
        { key:'nodate', label:'No due date', color:'var(--muted)',   testFn:(item)=>!item.done&&!item.dueDate },
        { key:'done',   label:'Completed', color:'var(--green)',     testFn:(item)=>!!item.done },
      ];
    }

    // Sort items: incomplete first by due date asc, then completed by due date asc, no-date last
    const sorted = _activeChecklist().filter(i=>_taskMatchesSearch(i,_checklistSearch)).sort((a,b)=>{
      // Done items always sink below undone within same group
      if(a.done !== b.done) return a.done ? 1 : -1;
      if(!a.dueDate && !b.dueDate) return 0;
      if(!a.dueDate) return 1;
      if(!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    DATE_GROUPS.forEach(grp => {
      const crossMode = checklistDoneMode==='cross';
      if(crossMode && grp.key==='done') return; // no separate Completed group in cross mode
      let items;
      if(crossMode){
        // Place items (done or not) into their date band by due-date logic.
        items = sorted.filter(i => grp.testFn(i.done ? {...i, done:false} : i));
      } else {
        items = sorted.filter(i => grp.testFn(i));
      }
      if(!items.length) return;
      const doneCnt = items.filter(i=>i.done).length;
      const isCompletedGroup = grp.key === 'done';
      const grpCollapsed = _clGroupCollapsed('date:'+grp.key);
      html += `<div class="card" style="margin-bottom:14px${isCompletedGroup?';opacity:.75':''}">
        <button type="button" class="toggle-section-btn${grpCollapsed?'':' open'}" onclick="_toggleChecklistGroup(this,'date:${grp.key}')">
          <span style="display:flex;align-items:center;gap:8px">
            <span style="width:8px;height:8px;border-radius:50%;background:${grp.color};flex-shrink:0;display:inline-block"></span>
            <span style="font-size:16px">${grp.label}</span>
            <span style="font-size:11px;color:var(--muted);font-family:'Inter',sans-serif;font-weight:400">${doneCnt}/${items.length} done</span>
          </span>
          <span class="arrow">▼</span>
        </button>
        <div class="${grpCollapsed?'hidden':''}" style="padding-top:4px">
          ${items.map(it=>checkItemHtml(it)).join('')}
        </div>
      </div>`;
    });
  } else {
    // Category view. Empty category (None) is grouped under "Uncategorised".
    const UNCAT='Uncategorised';
    const cats=_orderedCategories([...new Set(_activeChecklist().map(i=>i.category||UNCAT))]);
    const reordering = checklistCatOrderMode==='custom' && checklistCatReorder;
    html += `<div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:12px">
      ${checklistCatOrderMode==='custom'&&cats.length>1?`<button class="btn btn-outline btn-sm" onclick="toggleCatReorder()" style="display:inline-flex;align-items:center;gap:5px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        ${reordering?'Done':'Reorder'}
      </button>`:''}
      <button class="btn btn-outline btn-sm" onclick="openAddCategory()" style="display:inline-flex;align-items:center;gap:5px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        Add Category
      </button>
    </div>`;
    if(reordering){
      html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:6px 11px;background:rgba(196,168,130,.10);border-radius:8px;border:1px solid var(--border)">
        <span style="font-size:12px;color:var(--gold-deep)">Drag categories to reorder</span>
        <button class="btn btn-sm btn-primary" onclick="toggleCatReorder()">Done</button>
      </div>`;
    }
    html += `<div class="card">`;
    cats.forEach(cat=>{
      const items = _activeChecklist().filter(i=>(i.category||UNCAT)===cat).filter(i=>_taskMatchesSearch(i,_checklistSearch));
      if(_checklistSearch && !items.length) return; // hide categories with no matches during search
      const doneCnt = items.filter(i=>i.done).length;
      const catCollapsed = _clGroupCollapsed('cat:'+cat);
      const catEsc=(cat||'').replace(/'/g,"\\'");
      if(reordering){
        html+=`<div draggable="true" ondragstart="catDragStart(event,'${catEsc}')" ondragover="catDragOver(event)" ondrop="catDrop(event,'${catEsc}')" ondragend="if(_catScrollRaf){cancelAnimationFrame(_catScrollRaf);_catScrollRaf=null;}" style="margin-bottom:4px;cursor:grab;border-radius:8px;border:1.5px dashed rgba(196,168,130,.5)">
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px">
            <span style="color:var(--gold);flex-shrink:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
            <span style="font-family:'Cormorant Garamond',serif;font-size:24px;color:var(--ink)">${cat}</span>
            <span style="font-size:11px;color:var(--muted)">${doneCnt}/${items.length}</span>
          </div>
        </div>`;
        return;
      }
      html+=`<div style="margin-bottom:4px">
        <button type="button" class="toggle-section-btn${catCollapsed?'':' open'}" onclick="_toggleChecklistGroup(this,'cat:${catEsc}')">
          <span style="display:flex;align-items:center;gap:8px">
            <span style="font-size:24px">${cat}</span>
            <span style="font-size:11px;color:var(--muted);font-family:'Inter',sans-serif;font-weight:400">${doneCnt}/${items.length}</span>
            <span role="button" tabindex="0" class="cat-add-btn" title="Add an item to ${(cat||'').replace(/"/g,'&quot;').replace(/'/g,"\\'")}" onclick="event.stopPropagation();openAddCheckitem('${(cat===UNCAT?'':(cat||'')).replace(/'/g,"\\'")}')" style="width:24px;height:24px;border-radius:6px;border:1px solid var(--gold);background:var(--surface);color:var(--gold-deep);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </span>
          </span>
          <span class="arrow">▼</span>
        </button>
        <div class="${catCollapsed?'hidden':''}" style="padding-top:4px">${items.map(checkItemHtml).join('')}</div>
      </div>`;
    });
    html += `</div>`;
  }

  if(!_activeChecklist().length){
    html += `<div class="empty-state"><div class="empty-state-text">No tasks yet — add your first item to get started</div></div>`;
  } else if(_checklistSearch && !_activeChecklist().some(i=>_taskMatchesSearch(i,_checklistSearch))){
    html += `<div class="empty-state"><div class="empty-state-text">No tasks match “${_escHtml(_checklistSearch)}”</div></div>`;
  }

  html += `</div>`;
  c.innerHTML = html;
}


// ══════════════════════════════════════════════════════════════════════════
// Calendar page — month grid pulling from tasks, appointments & budget dates.
// Each type toggles via the shared cog popover; state in STATE.settings.calShow.
// "compact" (crowded-day collapse) is a 4th cog toggle, default off.
// ══════════════════════════════════════════════════════════════════════════
let _calCursor = null; // {y, m} (m = 0-based month) — the month currently shown

// ── Month / Week view state ──
function _calView(){
  if(!STATE.settings) STATE.settings={};
  if(STATE.settings.calView!=='week') STATE.settings.calView='month';
  return STATE.settings.calView;
}
function _calSetView(v){
  if(!STATE.settings) STATE.settings={};
  STATE.settings.calView = (v==='week')?'week':'month';
  // Keep the week anchor in sync with the month cursor on first switch.
  if(STATE.settings.calView==='week' && !_calWeekAnchor){
    const cur=_calCursorOrToday();
    const today=new Date();
    _calWeekAnchor = (today.getFullYear()===cur.y && today.getMonth()===cur.m)
      ? _calMonday(today)
      : _calMonday(new Date(cur.y, cur.m, 1));
  }
  saveToStorage();
  navigate('calendar');
}
let _calWeekAnchor = null; // Date = the first day of the week currently shown
// First-day-of-week preference: 'mon' (default) or 'sun'. Affects the month grid
// column order, the week-view day order, and which day each week starts on.
function _calWeekStartMode(){ return STATE.settings.calWeekStart==='sun' ? 'sun' : 'mon'; }
// How far the active first-day is from Sunday (JS getDay 0=Sun): Mon-start=1, Sun-start=0.
function _calFirstDow(){ return _calWeekStartMode()==='sun' ? 0 : 1; }
// Index of a date within the week (0 = the chosen first day .. 6 = last day).
function _calDowIndex(d){ return (d.getDay() - _calFirstDow() + 7) % 7; }
function _calMonday(d){
  // Despite the name, returns the start of d's week honoring the first-day setting.
  const x=new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate()-_calDowIndex(x));
  return x;
}
function _calWeekStart(){
  if(!(_calWeekAnchor instanceof Date)) _calWeekAnchor=_calMonday(new Date());
  return _calWeekAnchor;
}
function _calShiftWeek(delta){
  const s=_calWeekStart();
  _calWeekAnchor=new Date(s.getFullYear(), s.getMonth(), s.getDate()+delta*7);
  // Keep month cursor roughly aligned so switching back to month makes sense.
  _calCursor={y:_calWeekAnchor.getFullYear(), m:_calWeekAnchor.getMonth()};
  navigate('calendar');
}
function _calGoThisWeek(){
  _calWeekAnchor=_calMonday(new Date());
  _calCursor={y:_calWeekAnchor.getFullYear(), m:_calWeekAnchor.getMonth()};
  navigate('calendar');
}

// ── Add-on-a-date helpers (calendar "Add" menu + day-popup quick-add) ──
// Each opens the relevant editor, optionally pre-seeding the date.
function _calAddTask(iso){
  closeModalDirect();
  if(typeof openAddCheckitem==='function'){
    openAddCheckitem('');
    if(iso) setTimeout(()=>{ const due=document.getElementById('ci-due'); if(due) due.value=iso; },30);
  }
}
function _calAddAppt(iso){
  closeModalDirect();
  // Appointments belong to a task in this app. Rather than route through the
  // Add-checklist-item dialog, create a lightweight host task immediately (flagged so
  // its title can be filled in from the appointment on save) and open the appointment
  // form bound to it — so the user lands straight on "Add appointment".
  if(typeof _apptOpenForm!=='function'){ if(typeof openAddCheckitem==='function') openAddCheckitem(''); return; }
  const host={ id:'cl'+Date.now()+Math.random().toString(36).slice(2,5),
    text:'Appointment', done:false, dueDate:iso||'', category:'',
    notes:'', url:'', pinned:false, budgetId:'', budgetSubId:'', appointments:[],
    _apptHostAuto:true };
  STATE.checklist.push(host);
  saveToStorage();
  _apptOpenForm({taskId:host.id}, iso?{date:iso}:null);
}
function _calAddPayment(iso){
  closeModalDirect();
  // Ask first: add a payment as a sub-item under an existing category, or
  // create a brand-new category. (Replaces the old jump straight to budget.)
  const optBtn=(onclick,iconSvg,title,sub)=>`
    <div onclick="${onclick}" style="display:flex;align-items:flex-start;gap:12px;padding:13px 14px;border:1px solid var(--border);border-radius:11px;background:var(--surface);cursor:pointer">
      <div style="flex-shrink:0;width:34px;height:34px;border-radius:8px;background:var(--cream);border:.5px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--gold-deep)">${iconSvg}</div>
      <div style="flex:1">
        <div style="font-size:13.5px;font-weight:600;color:var(--ink)">${title}</div>
        <div style="font-size:11.5px;color:var(--muted);line-height:1.45;margin-top:2px">${sub}</div>
      </div>
      <div style="color:var(--muted);align-self:center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>
    </div>`;
  const plusSvg='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const catSvg='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/><path d="M2 11h20"/></svg>';
  openModal('Add a payment',`
    <div style="font-size:12.5px;color:var(--muted);line-height:1.5;margin-bottom:14px">Would you like to add a sub-item to an existing category, or create a new category?</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${optBtn(`_calPaymentPickCategory(${iso?`'${iso}'`:'null'})`,plusSvg,'Add to an existing category','Add a sub-item (a payment) under a category you already have')}
      ${optBtn("openAddBudgetItem()",catSvg,'Create a new category','Add a brand-new budget category with its own payment')}
    </div>`,
    `${iso?`<button class="btn btn-outline" onclick="_calOpenDay('${iso}')">Back</button>`:''}
     <button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>`);
}
function _calPaymentPickCategory(iso){
  const items=(STATE.budget&&STATE.budget.items)||[];
  if(!items.length){
    // No categories yet — go straight to creating one.
    openAddBudgetItem();
    return;
  }
  const rows=items.map(b=>{
    const n=(b.subItems||[]).length;
    const meta=n?`${n} sub-item${n>1?'s':''}`:'No sub-items yet';
    return `<div onclick="closeModalDirect();addSubItem('${b.id}')" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:var(--surface);cursor:pointer">
      <div style="min-width:0">
        <div style="font-size:13.5px;font-weight:600;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(b.name||'Untitled')}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:1px">${meta}</div>
      </div>
      <div style="color:var(--muted);flex-shrink:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>
    </div>`;
  }).join('');
  openModal('Choose a category',`
    <div style="font-size:12.5px;color:var(--muted);line-height:1.5;margin-bottom:14px">Pick the category to add this payment (sub-item) to.</div>
    <div style="display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto">${rows}</div>`,
    `<button class="btn btn-outline" onclick="_calAddPayment(${iso?`'${iso}'`:'null'})">Back</button>`);
}
let _calAddMenuOpen=false;
function _calToggleAddMenu(ev){
  if(ev) ev.stopPropagation();
  const m=document.getElementById('cal-add-menu'); if(!m) return;
  _calAddMenuOpen=!_calAddMenuOpen;
  m.style.display=_calAddMenuOpen?'block':'none';
  if(_calAddMenuOpen){
    setTimeout(()=>{
      const closer=(e)=>{ const wrap=document.getElementById('cal-add-wrap'); if(wrap&&!wrap.contains(e.target)){ _calAddMenuOpen=false; if(m) m.style.display='none'; document.removeEventListener('click',closer); } };
      document.addEventListener('click',closer);
    },0);
  }
}
function _calAddMenuPick(kind){
  _calAddMenuOpen=false;
  const m=document.getElementById('cal-add-menu'); if(m) m.style.display='none';
  if(kind==='task') _calAddTask(null);
  else if(kind==='appt') _calAddAppt(null);
  else if(kind==='payment') _calAddPayment(null);
}


function _calState(){
  if(!STATE.settings) STATE.settings={};
  if(!STATE.settings.calShow || typeof STATE.settings.calShow!=='object'){
    STATE.settings.calShow={tasks:true, appts:true, budget:true, wedding:true, events:true, compact:false};
  }
  const s=STATE.settings.calShow;
  if(typeof s.tasks!=='boolean') s.tasks=true;
  if(typeof s.appts!=='boolean') s.appts=true;
  if(typeof s.budget!=='boolean') s.budget=true;
  if(typeof s.wedding!=='boolean') s.wedding=true;
  if(typeof s.events!=='boolean') s.events=true;
  if(typeof s.compact!=='boolean') s.compact=false;
  return s;
}
function _calShown(key){ return !!_calState()[key]; }

// Collect every dated event, regardless of show/hide (filtering happens at render).
// Returns map: { 'YYYY-MM-DD': [ {type, title, sub, done, _eid} ] }
// Events are also stored in _calEvMap keyed by _eid so onclick can pass a
// plain integer — avoiding JSON inside HTML attribute double-quotes.
let _calEvMap={};
let _calEvSeq=0;
function _calEvClick(eid, fromIso){ _calPopupFromIso=fromIso||null; const ev=_calEvMap[eid]; if(ev) _calEventPopup(ev); }
let _calPopupFromIso=null;
function _calIsMobile(){ return window.innerWidth<=900; }
// Calendar-cell event tap: on mobile open the day popup (so the day is the entry point);
// on desktop open the entry detail directly.
function _calCellEvClick(eid, iso){
  if(_calIsMobile()) _calOpenDay(iso);
  else _calEvClick(eid, null);
}

// ── Vendor payment timeline: collect every deposit/balance payment across the
// budget into a normalized, sortable list. Each record carries its date, kind
// (deposit/balance), amount, paid flag, the owning category/sub-item, and the
// linked vendor (first vendorId on the target, if any). Reused by the Budget-page
// timeline view and the Vendors page (button + per-vendor "owed" pills).
function _paymentVendorFor(target){
  const ids=_budgetVendorIds(target);
  if(!ids.length) return null;
  return (STATE.vendors||[]).find(v=>v.id===ids[0]) || null;
}
function _collectVendorPayments(){
  const today=new Date(); today.setHours(0,0,0,0);
  const out=[];
  const SOON=14; // days → "due soon"
  const push=(rec)=>{
    // Skip zero-amount noise unless it's explicitly paid (keep paid history meaningful).
    if(!rec.amount && !rec.paid) return;
    let status;
    if(rec.paid) status='paid';
    else if(rec.date){
      const d=new Date(rec.date+'T00:00:00');
      const diff=(d-today)/86400000;
      status = diff<0 ? 'overdue' : (diff<=SOON ? 'soon' : 'upcoming');
      rec.diff=diff;
    } else { status='undated'; }
    rec.status=status;
    out.push(rec);
  };
  (STATE.budget.items||[]).forEach(b=>{
    const vCat=_paymentVendorFor(b);
    const realSubs=(b.subItems||[]).filter(s=>!s._planHolder);
    const hasSubs=realSubs.length>0;
    // Category deposit: emit unless it's rolled up from sub-items. (A category can
    // carry its own deposit even when it has sub-items.)
    if(!b.depositFromSubs && (Number(b.deposit||0)>0 || b.depositDueDate || b.depositPaid)){
      push({ kind:'deposit', scope:'category', bid:b.id, sid:'', label:b.name,
        vendor:vCat, amount:Number(b.deposit||0), date:b.depositDueDate||'',
        paid:!!b.depositPaid, paidDate:b.depositPaidDate||'' });
    }
    // Category balance ONLY when there are no real sub-items — otherwise the
    // sub-items carry the real balances and a category row would double-count.
    if(!hasSubs){
      const catBal=calcBudgetBalance(b);
      if(b.balanceDueDate || b.paid || catBal>0){
        push({ kind:'balance', scope:'category', bid:b.id, sid:'', label:b.name,
          vendor:vCat, amount:b.paid?calcBudgetItemTotal(b):catBal, date:b.balanceDueDate||'',
          paid:!!b.paid, paidDate:b.paidDate||'' });
      }
    }
    (b.subItems||[]).forEach(s=>{
      if(s._planHolder) return; // payment vehicle, not its own cost line
      const vSub=_paymentVendorFor(s)||vCat;
      // Sub-item deposit
      if(Number(s.deposit||0)>0 || s.depositDueDate || s.depositPaid){
        push({ kind:'deposit', scope:'sub', bid:b.id, sid:s.id, label:`${b.name}: ${s.name}`,
          vendor:vSub, amount:Number(s.deposit||0), date:s.depositDueDate||'',
          paid:!!s.depositPaid, paidDate:s.depositPaidDate||'' });
      }
      // Sub-item balance (amount minus paid deposit)
      const sAmt=getSubItemAmount(s);
      const sRemain=Math.max(0, sAmt - (s.depositPaid?Number(s.deposit||0):0));
      if(s.balanceDueDate || s.paid || sRemain>0){
        push({ kind:'balance', scope:'sub', bid:b.id, sid:s.id, label:`${b.name}: ${s.name}`,
          vendor:vSub, amount:s.paid?sAmt:sRemain, date:s.balanceDueDate||b.balanceDueDate||'',
          paid:!!s.paid, paidDate:s.paidDate||'' });
      }
    });
  });
  return out;
}
// Sort a payment list chronologically: undated last, otherwise by date asc.
function _sortVendorPayments(list){
  return list.slice().sort((a,b)=>{
    if(!a.date && !b.date) return 0;
    if(!a.date) return 1;
    if(!b.date) return -1;
    return a.date<b.date?-1:(a.date>b.date?1:0);
  });
}
function _calCollectEvents(){
  _calEvMap={}; _calEvSeq=0;
  const byDay={};
  const add=(iso, ev)=>{
    if(!iso) return;
    const eid=_calEvSeq++;
    _calEvMap[eid]=ev;
    ev._eid=eid;
    (byDay[iso]=byDay[iso]||[]).push(ev);
  };
  // Tasks — skip if the task has a linked appointment on the same date (avoids double-up)
  (STATE.checklist||[]).forEach(t=>{
    if(!t || !t.dueDate) return;
    const apptDates=new Set((_taskApptList(t)||[]).map(a=>a&&a.date).filter(Boolean));
    if(apptDates.has(t.dueDate)) return;
    add(t.dueDate, {
      type:'tasks',
      title:t.text||'Task',
      sub:t.category||'',
      done:!!t.done,
      taskId:t.id
    });
  });
  // Appointments (across all tasks)
  (STATE.checklist||[]).forEach(t=>{
    (_taskApptList(t)||[]).forEach(a=>{
      if(!a || !a.date) return;
      const time=a.time?_fmtCalTime(a.time):'';
      const typeLbl=a.type||'Appointment';
      const bizLbl=a.business||'';
      add(a.date, {
        type:'appts',
        title:typeLbl,
        sub:[time, bizLbl, typeLbl, (a.virtual?'Virtual':'In person')].filter(Boolean).join(' · '),
        time:time,
        done:false,
        taskId:t.id, apptId:a.id
      });
    });
  });
  // Budget dates (item deposit + balance, and each sub-item deposit + balance)
  (STATE.budget.items||[]).forEach(b=>{
    if(!b.depositFromSubs && b.depositDueDate){
      add(b.depositDueDate, {type:'budget', title:b.name, sub:'Deposit due', done:!!b.depositPaid,
        amount:calcBudgetDeposit(b)||0, budgetId:b.id, budgetSubId:'', kind:'deposit'});
    }
    if(b.balanceDueDate){
      add(b.balanceDueDate, {type:'budget', title:b.name, sub:'Balance due', done:!!b.paid,
        amount:calcBudgetBalance(b)||0, budgetId:b.id, budgetSubId:'', kind:'balance'});
    }
    (b.subItems||[]).forEach(s=>{
      if(s.depositDueDate){
        add(s.depositDueDate, {type:'budget', title:`${b.name}: ${s.name}`, sub:'Deposit due', done:!!s.depositPaid,
          amount:Number(s.deposit||0)||0, budgetId:b.id, budgetSubId:s.id, kind:'deposit'});
      }
      if(s.balanceDueDate){
        add(s.balanceDueDate, {type:'budget', title:`${b.name}: ${s.name}`, sub:s.depositPaid?'Balance owing':'Balance due', done:!!s.paid,
          amount:_subItemBalance(s)||0, budgetId:b.id, budgetSubId:s.id, kind:'balance'});
      }
    });
  });
  // Wedding day (its own type/toggle)
  if(STATE.event && STATE.event.date){
    const names=[STATE.event.partner1,STATE.event.partner2].filter(Boolean).join(' & ');
    add(STATE.event.date, {type:'wedding', title:'Wedding Day', sub:(STATE.event.venue||names||'The main event'), done:false, isWedding:true});
  }
  // Additional events (each with its own date)
  (STATE.events||[]).forEach(ev=>{
    if(!ev || !ev.date) return;
    const time=ev.time?_fmtCalTime(ev.time):'';
    add(ev.date, {type:'events', title:(ev.name||'Event'), sub:[time, ev.venueName||''].filter(Boolean).join(' · '), done:false, eventId:ev.id});
  });
  return byDay;
}

function _fmtCalTime(t){
  // t is "HH:MM" 24h — render as compact 12h, e.g. "9:30am"
  if(!t || !/^\d{1,2}:\d{2}$/.test(t)) return t||'';
  let [h,m]=t.split(':').map(Number);
  const ap=h<12?'am':'pm'; let hh=h%12; if(hh===0) hh=12;
  return m===0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2,'0')}${ap}`;
}

const _CAL_MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const _CAL_DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
// DOW header labels in the order dictated by the first-day-of-week setting.
function _calDowLabels(){
  return _calWeekStartMode()==='sun' ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] : _CAL_DOW;
}
// Short label for a specific date, mode-independent (always correct for that date).
function _calDowLabel(d){ return _CAL_DOW[(d.getDay()+6)%7]; }
// Per-type colour + label meta (uses theme tokens so dark mode follows automatically).
const _CAL_TYPE_META={
  tasks:{label:'Tasks & due dates', sw:'var(--green)', cls:'cal-ev-task'},
  appts:{label:'Appointments',      sw:'var(--gold)', cls:'cal-ev-appt'},
  budget:{label:'Budget dates',     sw:'var(--gold-deep)', cls:'cal-ev-bud'},
  wedding:{label:'Wedding day',     sw:'#B0568A', cls:'cal-ev-wed'},
  events:{label:'Events',           sw:'#B0568A', cls:'cal-ev-evt'}
};

function _calCursorOrToday(){
  if(_calCursor && Number.isInteger(_calCursor.y) && Number.isInteger(_calCursor.m)) return _calCursor;
  const today=new Date();
  _calCursor={y:today.getFullYear(), m:today.getMonth()};
  return _calCursor;
}
function _calShiftMonth(delta){
  const c=_calCursorOrToday();
  let m=c.m+delta, y=c.y;
  while(m<0){ m+=12; y--; } while(m>11){ m-=12; y++; }
  _calCursor={y, m};
  navigate('calendar');
}
function _calGoToday(){
  const today=new Date();
  _calCursor={y:today.getFullYear(), m:today.getMonth()};
  navigate('calendar');
}

// Topbar (hero bar) actions for the calendar: Add menu + cog, pinned top-right.
function _calTopbarActionsHtml(){
  return `<div style="display:flex;align-items:center;gap:7px;justify-content:flex-end">
      <div id="cal-add-wrap" style="position:relative">
        <button class="cal-addbtn" onclick="_calToggleAddMenu(event)" aria-haspopup="true" title="Add to calendar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg><span class="cal-addbtn-label">Add</span></button>
        <div id="cal-add-menu" class="cal-add-menu" style="display:none">
          <div class="cal-add-item" onclick="_calAddMenuPick('task')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Add task</div>
          <div class="cal-add-item" onclick="_calAddMenuPick('appt')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Add appointment</div>
          <div class="cal-add-item" onclick="_calAddMenuPick('payment')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Add payment</div>
        </div>
      </div>
      <div id="cal-cog-wrap" style="position:relative">
        <button class="btn-icon" onclick="_calToggleCog(event)" aria-label="Calendar display options" title="Show / hide event types">${_calCogIcon()}</button>
        ${_calCogMenuHtml()}
      </div>
    </div>`;
}
function _calToolbarHtml(centerLabel, prevAction, nextAction, todayAction){
  const view=_calView();
  const viewSeg=`<div class="cal-view-seg">
      <button class="cal-view-btn ${view==='month'?'on':''}" onclick="_calSetView('month')">Month</button>
      <button class="cal-view-btn ${view==='week'?'on':''}" onclick="_calSetView('week')">Week</button>
    </div>`;
  // Nav group (tighter), narrow Today, then the Month/Week switcher to the right of Today.
  return `<div class="cal-toolbar">
      <div class="cal-navgroup">
        <button class="cal-navbtn" onclick="${prevAction}" aria-label="Previous" title="Previous">${_calChevron('left')}</button>
        <div class="cal-monthlabel">${centerLabel}</div>
        <button class="cal-navbtn" onclick="${nextAction}" aria-label="Next" title="Next">${_calChevron('right')}</button>
        <button class="cal-todaybtn cal-todaybtn-narrow" onclick="${todayAction}">Today</button>
        ${viewSeg}
      </div>
    </div>`;
}

function renderCalendar(c, actions){
  if(_calView()==='week') return _renderCalendarWeek(c, actions);
  if(actions) actions.innerHTML=_calTopbarActionsHtml();
  const cur=_calCursorOrToday();
  const {y, m}=cur;
  const todayISO=_todayISO();
  const events=_calCollectEvents();
  const show=_calState();

  // Build a 6-row grid starting on the chosen first day of the week.
  const first=new Date(y, m, 1);
  let lead=_calDowIndex(first);     // days before the 1st to fill
  const gridStart=new Date(y, m, 1-lead);

  const cellsHtml=[];
  for(let i=0;i<42;i++){
    const d=new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate()+i);
    const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const inMonth=d.getMonth()===m;
    const isToday=iso===todayISO;
    const dayEvents=(events[iso]||[]).filter(e=>show[e.type]);
    cellsHtml.push(_calCellHtml(iso, d.getDate(), inMonth, isToday, dayEvents, show.compact));
  }

  const html=`
    <div class="cal-page">
      ${_calToolbarHtml(`${_CAL_MONTHS[m]} ${y}`, '_calShiftMonth(-1)', '_calShiftMonth(1)', '_calGoToday()')}
      ${_calLegendHtml(show)}
      <div class="cal-dow">${_calDowLabels().map(d=>`<span>${d}</span>`).join('')}</div>
      <div class="cal-grid">${cellsHtml.join('')}</div>
    </div>`;
  c.innerHTML=html;
}

function _renderCalendarWeek(c, actions){
  if(actions) actions.innerHTML=_calTopbarActionsHtml();
  const todayISO=_todayISO();
  const events=_calCollectEvents();
  const show=_calState();
  const start=_calWeekStart();
  const days=[];
  for(let i=0;i<7;i++){
    const d=new Date(start.getFullYear(), start.getMonth(), start.getDate()+i);
    days.push(d);
  }
  const last=days[6];
  const sameMonth=days[0].getMonth()===last.getMonth();
  const sameYear=days[0].getFullYear()===last.getFullYear();
  const _mon=(d)=>_CAL_MONTHS[d.getMonth()].slice(0,3);
  let rangeLabel;
  if(sameMonth&&sameYear) rangeLabel=`${days[0].getDate()}–${last.getDate()} ${_mon(last)} ${last.getFullYear()}`;
  else if(sameYear) rangeLabel=`${days[0].getDate()} ${_mon(days[0])} – ${last.getDate()} ${_mon(last)} ${last.getFullYear()}`;
  else rangeLabel=`${days[0].getDate()} ${_mon(days[0])} ${days[0].getFullYear()} – ${last.getDate()} ${_mon(last)} ${last.getFullYear()}`;

  // Return the formatted time for an appointment (stored in e.time); tasks/budget have no time.
  const _timeOf=(e)=>{
    if(e.type!=='appts') return '';
    return e.time||'';
  };
  const _mins=(t)=>{ if(!t) return 9999; const m=t.match(/(\d{1,2})(?::(\d{2}))?(am|pm)/i); if(!m) return 9999; let h=+m[1]%12; if(/pm/i.test(m[3])) h+=12; return h*60+(+(m[2]||0)); };

  let anyEvents=false;
  const sections=days.map((d)=>{
    const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const isToday=iso===todayISO;
    const dowLbl=_calDowLabel(d);
    const head=`<div class="cal-list-dayhdr">
        <span class="cal-list-dow ${isToday?'is-today':''}">${dowLbl} ${d.getDate()} ${_mon(d)}${isToday?' · Today':''}</span>
      </div>`;
    let dayEvents=(events[iso]||[]).filter(e=>show[e.type]);
    if(!dayEvents.length){
      // Show every day of the week. Empty days get a quiet, tappable line so they can
      // still be opened to add an entry.
      return `<div class="cal-list-day">${head}<div class="cal-list-empty-day" onclick="_calOpenDay('${iso}')">Nothing scheduled</div></div>`;
    }
    anyEvents=true;
    // Sort: timed appointments first (by time), then untimed entries.
    dayEvents=dayEvents.slice().sort((a,b)=>_mins(_timeOf(a))-_mins(_timeOf(b)));
    const rows=dayEvents.map(e=>{
      const mta=_CAL_TYPE_META[e.type];
      const doneStyle=e.done?'text-decoration:line-through;opacity:.6':'';
      const tm=_timeOf(e);
      const subRest=e.sub||'';
      return `<div class="cal-list-row" onclick="_calCellEvClick(${e._eid},'${iso}')">
          <span class="cal-list-time">${tm||'<span style=\"opacity:.4\">—</span>'}</span>
          <span class="cal-list-dot" style="background:${mta.sw}"></span>
          <div class="cal-list-body">
            <div class="cal-list-title" style="${doneStyle}">${_escHtml(e.title)}</div>
            ${subRest?`<div class="cal-list-sub">${_escHtml(subRest)}</div>`:''}
          </div>
        </div>`;
    }).join('');
    return `<div class="cal-list-day">${head}${rows}</div>`;
  }).join('');

  const emptyHint = anyEvents ? ''
    : `<div class="cal-list-empty">Nothing scheduled this week. Tap a day or use <strong>Add</strong> to create a task, appointment or payment.</div>`;
  const listHtml = `${emptyHint}<div class="cal-list">${sections}</div>`;

  const html=`
    <div class="cal-page">
      ${_calToolbarHtml(rangeLabel, '_calShiftWeek(-1)', '_calShiftWeek(1)', '_calGoThisWeek()')}
      ${_calLegendHtml(show)}
      ${listHtml}
    </div>`;
  c.innerHTML=html;
}

function _calLegendHtml(show){
  const chips=Object.keys(_CAL_TYPE_META).filter(k=>show[k]).map(k=>{
    const mta=_CAL_TYPE_META[k];
    return `<span class="cal-legend-chip"><span class="cal-legend-dot" style="background:${mta.sw}"></span>${mta.label}</span>`;
  });
  if(!chips.length) return `<div class="cal-legend cal-legend-empty">All event types hidden — open the cog to show them.</div>`;
  return `<div class="cal-legend">${chips.join('')}</div>`;
}

function _calCellHtml(iso, dayNum, inMonth, isToday, dayEvents, compact){
  let inner='';
  if(compact && dayEvents.length){
    // One summary pill per type present, with a count.
    const counts={};
    dayEvents.forEach(e=>{ counts[e.type]=(counts[e.type]||0)+1; });
    inner=Object.keys(_CAL_TYPE_META).filter(k=>counts[k]).map(k=>{
      const mta=_CAL_TYPE_META[k];
      const n=counts[k];
      const label=n>1?`${n} ${mta.label.split(' ')[0].toLowerCase()}`:_calFirstTitleOfType(dayEvents,k);
      return `<div class="cal-ev ${mta.cls}" onclick="event.stopPropagation();_calOpenDay('${iso}')" title="${_escAttr(mta.label)}: ${n}"><span class="cal-ev-dot" style="background:${mta.sw}"></span><span class="cal-ev-txt">${_escHtml(label)}</span></div>`;
    }).join('');
  } else {
    const MAX=3;
    const shownEv=dayEvents.slice(0,MAX);
    inner=shownEv.map(e=>{
      const mta=_CAL_TYPE_META[e.type];
      const doneStyle=e.done?'text-decoration:line-through;opacity:.6':'';
      return `<div class="cal-ev ${mta.cls}" style="${doneStyle}" onclick="event.stopPropagation();_calCellEvClick(${e._eid},'${iso}')" title="${_escAttr(e.title)}${e.sub?(' · '+_escAttr(e.sub)):''}"><span class="cal-ev-dot" style="background:${mta.sw}"></span><span class="cal-ev-txt">${_escHtml(e.title)}</span></div>`;
    }).join('');
    if(dayEvents.length>MAX){
      inner+=`<div class="cal-ev-more" onclick="event.stopPropagation();_calOpenDay('${iso}')">+${dayEvents.length-MAX} more</div>`;
    }
  }
  const cls=['cal-cell'];
  if(!inMonth) cls.push('cal-out');
  if(isToday) cls.push('cal-today');
  const numLbl=isToday?`<span class="cal-todaytag">${dayNum}</span>`:`${dayNum}`;
  return `<div class="${cls.join(' ')}" onclick="_calOpenDay('${iso}')" style="cursor:pointer"><div class="cal-daynum">${numLbl}</div>${inner}</div>`;
}

function _calFirstTitleOfType(dayEvents, type){
  const e=dayEvents.find(x=>x.type===type);
  return e?e.title:_CAL_TYPE_META[type].label;
}

// Day detail popup — lists every event on a date (used by "+N more" and compact pills).
// Day-popup row click: on mobile, layer the entry detail over the day popup (so Back
// returns here); on desktop, keep the existing behaviour (close the day, open the entry).
function _calDayRowClick(eid, iso){
  if(_calIsMobile()){
    _calEvClick(eid, iso); // day modal stays open underneath; entry uses confirm2 on top
  } else {
    closeModalDirect();
    _calEvClick(eid, null);
  }
}

function _calOpenDay(iso){
  const events=_calCollectEvents();
  const show=_calState();
  const list=(events[iso]||[]).filter(e=>show[e.type]);
  const d=new Date(iso+'T00:00:00');
  const heading=`${_calDowLabel(d)} ${d.getDate()} ${_CAL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  // Status pill for tasks
  const _dayStatusPill=(e)=>{
    if(e.done) return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:600;background:#EAF1E8;color:#3B6D11;border-radius:20px;padding:1.5px 7px">✓ Completed</span>`;
    if(e.type!=='tasks'&&e.type!=='budget') return '';
    const diff=e._dateIso?(new Date(e._dateIso+'T00:00:00')-new Date(new Date().toDateString()))/86400000:0;
    if(diff<0) return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:600;background:rgba(192,57,43,.1);color:#C0653E;border-radius:20px;padding:1.5px 7px">● Overdue</span>`;
    if(diff===0) return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:600;background:#F3EBDC;color:#9A7B2E;border-radius:20px;padding:1.5px 7px">● Due today</span>`;
    return '';
  };
  // Detect linked task↔budget pairs for merged card rendering.
  // Map: budgetEvent._eid → taskEvent for pairs found on this day.
  const _linkedBudEids=new Map(); // budgetEvent._eid → taskEvent
  const _linkedTaskEids=new Set(); // taskEvent._eid already paired (skip solo render)
  list.filter(e=>e.type==='tasks'&&e.taskId).forEach(te=>{
    const ti=STATE.checklist.find(x=>x.id===te.taskId);
    if(!ti||!ti.budgetId) return;
    // Find a matching budget event on this day
    const be=list.find(e=>e.type==='budget'&&e.budgetId===ti.budgetId&&(ti.budgetSubId?e.budgetSubId===ti.budgetSubId:!e.budgetSubId));
    if(be){ _linkedBudEids.set(be._eid,te); _linkedTaskEids.add(te._eid); }
  });

  // Link chain icon SVG
  const _linkIco=`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:4px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;

  const rows=list.length?list.map(e=>{
    e._dateIso=iso;
    // Budget events that are paired → skip (rendered inside their task's merged card)
    if(e.type==='budget'&&_linkedBudEids.has(e._eid)) return '';

    const mta=_CAL_TYPE_META[e.type];
    const doneStyle=e.done?'text-decoration:line-through;opacity:.55':'';
    const doneOpacity=e.done?'opacity:.55':'';

    // Meta line builder
    const _buildMeta=(ev)=>{
      let mp=[];
      if(ev.sub) mp.push(`<span style="font-size:11px;color:var(--muted)">${_escHtml(ev.sub)}</span>`);
      if(ev.type==='appts'&&ev.time) mp.unshift(`<span style="font-size:11px;font-weight:600;color:var(--gold-deep)">${_escHtml(ev.time)}</span>`);
      if(ev.type==='budget'&&ev.amount!=null) mp.push(`<span style="font-size:11px;font-weight:600;color:var(--gold-deep)">${fmt(ev.amount)}</span>`);
      if(ev.type==='budget') mp.push(ev.done?`<span style="display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:600;background:#EAF1E8;color:#3B6D11;border-radius:20px;padding:1.5px 7px">✓ Paid</span>`:`<span style="display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:600;background:#F3EBDC;color:#9A7B2E;border-radius:20px;padding:1.5px 7px">Pending</span>`);
      if(ev.type==='tasks') mp.push(_dayStatusPill(ev));
      return mp.length?`<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:3px">${mp.join('<span style="color:var(--border);font-size:10px">·</span>')}</div>`:'';
    };

    // Task paired with a budget event → merged card (Option A)
    if(e.type==='tasks'&&_linkedTaskEids.has(e._eid)){
      const be=list.find(b=>b.type==='budget'&&_linkedBudEids.get(b._eid)===e);
      const payMeta=be?_buildMeta(be):'';
      const payEid=be?be._eid:null;
      return `<div style="border:.5px solid var(--gold);border-radius:9px;margin-bottom:7px;overflow:hidden;background:var(--surface)">
        <div onclick="_calDayRowClick(${e._eid},'${iso}')" style="display:flex;align-items:flex-start;gap:9px;padding:9px 10px;cursor:pointer">
          <span style="width:9px;height:9px;border-radius:50%;background:${mta.sw};margin-top:5px;flex-shrink:0;${doneOpacity}"></span>
          <div style="min-width:0;flex:1">
            <div style="font-size:13px;color:var(--ink);line-height:1.3;${doneStyle}">${_escHtml(e.title)}</div>
            ${_buildMeta(e)}
          </div>
          ${_linkIco}
        </div>
        ${be?`<div onclick="_calDayRowClick(${payEid},'${iso}')" style="display:flex;align-items:flex-start;gap:9px;padding:6px 10px;border-top:.5px solid var(--gold-deep);background:rgba(196,168,130,.09);cursor:pointer">
          <span style="width:7px;height:7px;border-radius:50%;background:var(--gold-deep);margin-top:5px;flex-shrink:0"></span>
          <div style="min-width:0;flex:1">
            <div style="font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:2px">Payment due</div>
            ${payMeta}
          </div>
        </div>`:''}
      </div>`;
    }

    // Standard card
    const metaLine=_buildMeta(e);
    return `<div onclick="_calDayRowClick(${e._eid},'${iso}')" style="display:flex;align-items:flex-start;gap:9px;padding:9px 10px;border:.5px solid var(--border);border-radius:9px;margin-bottom:7px;cursor:pointer;background:var(--surface)">
      <span style="width:9px;height:9px;border-radius:50%;background:${mta.sw};margin-top:5px;flex-shrink:0;${doneOpacity}"></span>
      <div style="min-width:0;flex:1">
        <div style="font-size:13px;color:var(--ink);line-height:1.3;${doneStyle}">${_escHtml(e.title)}</div>
        ${metaLine}
      </div>
    </div>`;
  }).join(''):`<div style="font-size:12.5px;color:var(--muted);text-align:center;padding:16px 8px">Nothing scheduled.</div>`;
  // Total bar: sum of pending (unpaid) budget amounts for this day
  const _budgetItems=list.filter(e=>e.type==='budget'&&!e.done&&e.amount!=null&&e.amount>0);
  const _dayTotal=_budgetItems.reduce((s,e)=>s+e.amount,0);
  const _pendingCount=_budgetItems.length;
  const totalBar=_dayTotal>0?`<div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border);padding-top:10px;margin-top:8px;margin-bottom:8px">
    <div>
      <div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)">Due today</div>
      <div style="font-size:10px;color:var(--muted);margin-top:1px">${_pendingCount} payment${_pendingCount!==1?'s':''} pending</div>
    </div>
    <div style="font-size:17px;font-weight:700;color:var(--gold-deep);font-family:'Inter',sans-serif">${fmt(_dayTotal)}</div>
  </div>`:'<div style="margin-top:8px"></div>';
  const quickAdd=`<div style="display:flex;gap:6px;border-top:1px solid var(--border);padding-top:11px">
      <button class="btn btn-outline btn-sm" style="flex:1;justify-content:center;gap:5px" onclick="_calAddTask('${iso}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Task</button>
      <button class="btn btn-outline btn-sm" style="flex:1;justify-content:center;gap:5px" onclick="_calAddAppt('${iso}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Appt</button>
      <button class="btn btn-outline btn-sm" style="flex:1;justify-content:center;gap:5px" onclick="_calAddPayment('${iso}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Payment</button>
    </div>`;
  const body=`<div style="padding:2px">${rows}${totalBar}${quickAdd}</div>`;
  const footer='';
  openModal(heading, body, footer);
}

// ── Calendar event info popups ──────────────────────────────────────────────
// Central dispatcher — called from every calendar event click and day-list row.
// `ev` is a plain object: {type, taskId?, apptId?, budgetId?, budgetSubId?, kind?}
function _calEventPopup(ev){
  if(!ev) return;
  if(ev.type==='tasks')  return _calTaskPopup(ev.taskId);
  if(ev.type==='appts')  return _calApptPopup(ev.taskId, ev.apptId);
  if(ev.type==='budget') return _calBudgetPopup(ev.budgetId, ev.budgetSubId||'', ev.kind||'');
  if(ev.type==='events') { _calPopupClose(); if(typeof openEventDetail==='function') openEventDetail(ev.eventId); else navigate('events'); return; }
  if(ev.type==='wedding'){ _calPopupClose(); navigate('details'); return; }
}

// Shared helpers
function _calStatusTag(done, dateIso){
  if(done) return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;background:#EAF1E8;color:#3B6D11;border-radius:20px;padding:2px 9px">✓ Completed</span>`;
  if(!dateIso) return '';
  const diff=(new Date(dateIso+'T00:00:00')-new Date(new Date().toDateString()))/86400000;
  if(diff<0)  return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;background:rgba(192,57,43,.1);color:#C0653E;border-radius:20px;padding:2px 9px">● Overdue</span>`;
  if(diff===0) return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;background:#F3EBDC;color:#9A7B2E;border-radius:20px;padding:2px 9px">● Due today</span>`;
  return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;background:#F3EBDC;color:#9A7B2E;border-radius:20px;padding:2px 9px">● Pending</span>`;
}
function _calPopupRow(label, val){
  if(!val && val!==0) return '';
  return `<div style="display:flex;gap:8px;font-size:12.5px;color:var(--ink);margin-bottom:7px;align-items:flex-start">
    <span style="color:var(--muted);flex-shrink:0;min-width:82px">${label}</span>
    <span style="color:var(--ink);flex:1;min-width:0;word-break:break-word">${val}</span>
  </div>`;
}
function _calPopupWrap(iconSvg, eyebrow, title, sub, rows, editLabel, editAction, deleteAction, goToAction, goToLabel){
  // When opened from a day popup on mobile, offer a Back button (returns to the day) and
  // hide the × so the flow is day → entry → back.
  const fromIso=_calPopupFromIso;
  const showBack=!!fromIso && _calIsMobile();
  const backBtn=showBack?`<button class="btn btn-outline btn-sm" style="justify-content:center;gap:5px;white-space:nowrap" onclick="_calPopupBack('${fromIso}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back</button>`:'';
  const deleteBtn=deleteAction?`<button class="btn btn-danger btn-sm" style="justify-content:center;gap:5px;white-space:nowrap;margin-right:auto" onclick="_calPopupClose();${deleteAction}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Delete</button>`:'';
  const _goToLabel=goToLabel||'Go to';
  const goToBtn=goToAction?`<button class="btn btn-outline btn-sm" style="justify-content:center;gap:5px;white-space:nowrap" onclick="_calPopupClose();closeModalDirect();${goToAction}">${_escHtml(_goToLabel)}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>`:'';
  const body=`<div class="cal-popup-body" style="display:flex;flex-direction:column">
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
      <span style="width:30px;height:30px;border-radius:8px;background:rgba(196,168,130,.16);display:inline-flex;align-items:center;justify-content:center;color:var(--gold-deep);flex-shrink:0">${iconSvg}</span>
      <div>
        <div style="font-size:9px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:3px">${_escHtml(eyebrow)}</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:var(--ink);line-height:1.2">${_escHtml(title)}</div>
        ${sub?`<div style="font-size:11.5px;color:var(--muted);margin-top:2px">${_escHtml(sub)}</div>`:''}
      </div>
    </div>
    <div style="height:.5px;background:var(--border);margin:4px 0 11px"></div>
    ${rows}
    ${_calIsMobile()?`
      <div style="display:flex;gap:6px;margin-top:14px;align-items:center">
        ${deleteAction?`<button class="btn btn-danger btn-sm" style="justify-content:center;gap:4px;padding:6px 10px;font-size:11.5px;white-space:nowrap;margin-right:auto" onclick="_calPopupClose();${deleteAction}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Delete</button>`:''}
        ${goToAction?`<button class="btn btn-outline btn-sm" style="justify-content:center;gap:4px;padding:6px 10px;font-size:11.5px;white-space:nowrap" onclick="_calPopupClose();closeModalDirect();${goToAction}">${_escHtml(_goToLabel)}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>`:''}
        <button class="btn btn-primary btn-sm" style="justify-content:center;gap:4px;padding:6px 12px;font-size:11.5px;white-space:nowrap" onclick="_calPopupClose();${editAction}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>
      </div>
    `:`
      <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;align-items:center">
        ${deleteBtn}
        ${backBtn}
        ${goToBtn}
        <button class="btn btn-primary btn-sm" style="justify-content:center;gap:5px;white-space:nowrap" onclick="_calPopupClose();${editAction}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>
      </div>
    `}
  </div>`;
  openConfirm2('', body, '');
  const box=document.getElementById('confirm2-box');
  if(box) box.style.width=_calIsMobile()?'':'360px';
  // On mobile in the day→entry flow: × acts as Back (returns to day popup).
  // On desktop or direct-open: × closes as normal.
  const xbtn=document.querySelector('#confirm2-box .modal-close');
  if(xbtn){
    xbtn.style.display=''; // always visible now
    if(showBack){
      xbtn.onclick=(e)=>{ e.stopPropagation(); _calPopupBack(fromIso); };
      xbtn.title='Back to day';
    } else {
      xbtn.onclick=_confirm2CloseX; // restore default confirm2 close behaviour
      xbtn.title='';
    }
  }
}
function _calPopupBack(iso){
  // Restore the × for future popups, close the entry, reopen the day popup.
  const x=document.querySelector('#confirm2-box .modal-close'); if(x) x.style.display='';
  _calPopupClose();
  _calPopupFromIso=null;
  if(iso) _calOpenDay(iso);
}
function _calPopupClose(){
  const box=document.getElementById('confirm2-box');
  if(box) box.style.width='';
  _closeConfirm2Direct();
}

// ── Task popup ──
function _calTaskPopup(taskId){
  const t=STATE.checklist.find(x=>x.id===taskId); if(!t) return;
  const iconSvg=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
  const sub=[t.category, t.dueDate?('Due '+fmtBudgetDate(t.dueDate)):''].filter(Boolean).join(' · ');
  const rows=[
    _calPopupRow('Status', _calStatusTag(!!t.done, t.dueDate)),
    _calPopupRow('Due date', t.dueDate?fmtBudgetDate(t.dueDate):''),
    t.category?_calPopupRow('Category', _escHtml(t.category)):'',
    (t.notes&&t.notes.trim())?`<div style="font-size:12px;color:var(--muted);font-style:italic;margin-bottom:7px;line-height:1.5">"${_escHtml(t.notes.trim())}"</div>`:''
  ].join('');
  _calPopupWrap(iconSvg, 'Task', t.text||'Task', sub, rows, 'Edit task', `openEditCheckitem('${taskId}')`, `deleteCheckitem('${taskId}')`, `_focusChecklistTask('${taskId}')`, 'Go to Checklist');
}

// ── Appointment popup ──
function _calApptPopup(taskId, apptId){
  const t=STATE.checklist.find(x=>x.id===taskId); if(!t) return;
  const a=_taskApptList(t).find(x=>x.id===apptId); if(!a) return;
  const iconSvg=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  const timeStr=a.time?(_fmtApptTime(a.time)+(a.endTime?' – '+_fmtApptTime(a.endTime):'')):'';
  const virtualPill=a.virtual?`<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;color:var(--appt-virtual-ink,#3F7A6A);background:rgba(93,202,165,.18);border-radius:10px;padding:2px 8px">Virtual</span>`:'';
  const sub=[a.date?fmtBudgetDate(a.date):'', timeStr].filter(Boolean).join(' · ');
  let locVal='';
  if(a.virtual && a.link){ const href=_escHtml(_normalizeUrl(a.link)); locVal=`<a href="${href}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:var(--gold-deep);text-decoration:underline">${_escHtml(_urlDomain(a.link))}</a>`; }
  else if(a.virtual){ locVal='Virtual'; }
  else if(a.address){ const mh=_escHtml(_mapsUrl(a.address)); locVal=`<a href="${mh}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:var(--gold-deep);text-decoration:underline">${_escHtml(a.address)}</a>`; }
  const telVal=a.phone?`<a href="tel:${_escHtml(String(a.phone).replace(/[^+\d]/g,''))}" onclick="event.stopPropagation()" style="color:var(--gold-deep);text-decoration:underline">${_escHtml(a.phone)}</a>`:'';
  const emailVal=a.email?`<a href="mailto:${_escHtml(a.email)}" onclick="event.stopPropagation()" style="color:var(--gold-deep);text-decoration:underline">${_escHtml(a.email)}</a>`:'';
  const rows=[
    _calPopupRow('Task', _escHtml(t.text||'')),
    a.type?_calPopupRow('Type', _escHtml(a.type)+(virtualPill?' '+virtualPill:'')):'',
    locVal?_calPopupRow('Location', locVal):'',
    a.pass?_calPopupRow('Pass code', `<span style="font-family:monospace;font-size:12px">${_escHtml(a.pass)}</span>`):'',
    a.contact?_calPopupRow('Contact', _escHtml(a.contact)):'',
    telVal?_calPopupRow('Phone', telVal):'',
    emailVal?_calPopupRow('Email', emailVal):'',
    Number(a.fee)>0?_calPopupRow('Fee', _escHtml(fmt(Number(a.fee)))):'',
    (a.notes&&a.notes.trim())?`<div style="font-size:12px;color:var(--muted);font-style:italic;margin-bottom:7px;line-height:1.5">"${_escHtml(a.notes.trim())}"</div>`:''
  ].join('');
  _calPopupWrap(iconSvg, 'Appointment', a.business||a.type||'Appointment', sub, rows, 'Edit appointment', `_apptEditFromDetails('${taskId}','${apptId}')`, `deleteCheckitem('${taskId}')`, `_focusChecklistTask('${taskId}')`, 'Go to Checklist');
}

// ── Budget date popup ──
function _calBudgetPopup(budgetId, budgetSubId, kind){
  const b=STATE.budget.items.find(x=>x.id===budgetId); if(!b) return;
  const s=budgetSubId?b.subItems?.find(x=>x.id===budgetSubId):null;
  const iconSvg=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  const isDeposit=kind==='deposit';
  const title=s?`${b.name}: ${s.name}`:b.name;
  const eyebrow=`Budget · ${isDeposit?'Deposit':'Balance'} due`;
  // Resolve the relevant date, amount, paid flag, and the complementary date
  let dueDate='', amount=0, paid=false, otherLabel='', otherDate='';
  if(s){
    dueDate=isDeposit?(s.depositDueDate||''):(s.balanceDueDate||'');
    amount=isDeposit?Number(s.deposit||0):_subItemBalance(s);
    paid=isDeposit?!!s.depositPaid:!!s.paid;
    otherLabel=isDeposit?'Balance due':'Deposit due';
    otherDate=isDeposit?(s.balanceDueDate||''):(s.depositDueDate||'');
  } else {
    dueDate=isDeposit?(b.depositDueDate||''):(b.balanceDueDate||'');
    amount=isDeposit?calcBudgetDeposit(b):calcBudgetItemTotal(b);
    paid=isDeposit?!!b.depositPaid:!!b.paid;
    otherLabel=isDeposit?'Balance due':'Deposit due';
    otherDate=isDeposit?(b.balanceDueDate||''):(b.depositFromSubs?'':(b.depositDueDate||''));
  }
  const sub=dueDate?('Due '+fmtBudgetDate(dueDate)):'';
  // Deposit details for the breakdown (balance view only)
  const _depAmt=s?Number(s.deposit||0):calcBudgetDeposit(b);
  const _depPaid=s?!!s.depositPaid:!!b.depositPaid;
  const _depPaidDate=s?(s.depositPaidDate||''):(b.depositPaidDate||'');
  const _depDueDate=s?(s.depositDueDate||''):(b.depositDueDate||'');
  const _fullTotal=s?getSubItemAmount(s):calcBudgetItemTotal(b);
  const _showBreakdown=!isDeposit&&_depAmt>0&&(_depPaid||_depDueDate);
  const rows=[
    _calPopupRow('Status', _calStatusTag(paid, dueDate)),
    dueDate?_calPopupRow('Due date', fmtBudgetDate(dueDate)):'',
    // Option C breakdown: total struck, deposit row, balance owing
    _showBreakdown?`
      <div style="display:flex;gap:8px;font-size:12.5px;color:var(--ink);margin-bottom:7px;align-items:flex-start">
        <span style="color:var(--muted);flex-shrink:0;min-width:82px">Total cost</span>
        <span style="opacity:.45;font-weight:500">${fmt(_fullTotal)}</span>
      </div>
      <div style="display:flex;gap:8px;font-size:12px;color:var(--ink);margin-bottom:7px;align-items:flex-start">
        <span style="color:var(--muted);flex-shrink:0;min-width:82px;font-size:11px">${_depPaid?'− Deposit paid':'− Deposit due'}</span>
        <span style="color:${_depPaid?'var(--green)':'var(--muted)'};font-weight:500">${fmt(_depAmt)}${_depPaid&&_depPaidDate?' <span style="font-size:10px;opacity:.75">· '+fmtBudgetDate(_depPaidDate)+'</span>':_depDueDate?' <span style="font-size:10px;opacity:.6">due '+fmtBudgetDate(_depDueDate)+'</span>':''}</span>
      </div>
      <div style="display:flex;gap:8px;font-size:12.5px;color:var(--ink);margin-bottom:7px;align-items:flex-start;border-top:.5px solid var(--border);padding-top:7px;margin-top:2px">
        <span style="color:var(--muted);flex-shrink:0;min-width:82px;font-weight:600">Balance owing</span>
        <span style="font-weight:700;font-size:15px;color:var(--ink);line-height:1">${fmt(amount)}</span>
      </div>`
    :amount>0?_calPopupRow('Amount', _escHtml(fmt(amount))):'',
    (!_showBreakdown&&otherDate&&otherLabel)?_calPopupRow(otherLabel, fmtBudgetDate(otherDate)):'',
    b.note?`<div style="font-size:12px;color:var(--muted);font-style:italic;margin-bottom:7px;line-height:1.5">"${_escHtml(b.note)}"</div>`:''
  ].join('');
  _calPopupWrap(iconSvg, eyebrow, title, sub, rows, 'Edit Payment', `openEditBudgetItem('${budgetId}')`, `deleteBudgetItem('${budgetId}')`, `_focusBudgetRow('${budgetId}','${budgetSubId||''}','${kind||''}')`, 'Go to Budget');
}

// ── Cog popover (shared pattern) ──
function _calCogMenuHtml(){
  const show=_calState();
  const row=(key, label, sw)=>{
    const on=!!show[key];
    return `<label onclick="event.stopPropagation()" style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:${on?'var(--ink)':'var(--muted)'};padding:6px 2px;cursor:pointer">
      <input type="checkbox" ${on?'checked':''} onchange="_calToggleShow('${key}')" style="accent-color:var(--gold-deep);width:15px;height:15px;cursor:pointer">
      ${sw?`<span style="width:9px;height:9px;border-radius:50%;background:${sw};flex-shrink:0"></span>`:''}
      <span>${label}</span>
    </label>`;
  };
  return `<div id="cal-cog-menu" style="display:none;position:absolute;top:calc(100% + 6px);right:0;z-index:60;width:230px;background:var(--cream);border:1px solid var(--border);border-radius:11px;box-shadow:0 4px 24px rgba(26,26,24,.12);padding:13px 15px;text-align:left">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">
      <div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-deep)">Show on calendar</div>
      <button onclick="_calCogReset()" style="background:none;border:none;color:var(--gold-deep);cursor:pointer;font-size:10px;text-decoration:underline;font-family:inherit;padding:0">Reset</button>
    </div>
    ${row('tasks', _CAL_TYPE_META.tasks.label, _CAL_TYPE_META.tasks.sw)}
    ${row('appts', _CAL_TYPE_META.appts.label, _CAL_TYPE_META.appts.sw)}
    ${row('budget', _CAL_TYPE_META.budget.label, _CAL_TYPE_META.budget.sw)}
    ${row('wedding', _CAL_TYPE_META.wedding.label, _CAL_TYPE_META.wedding.sw)}
    ${row('events', _CAL_TYPE_META.events.label, _CAL_TYPE_META.events.sw)}
    <div style="height:1px;background:var(--border);margin:8px 0"></div>
    <div style="font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:2px 0 2px">Display</div>
    ${row('compact', 'Compact crowded days', '')}
    <div style="font-size:10px;color:var(--muted);margin-top:3px;line-height:1.45;padding-left:23px">Collapse same-type events into one dot &amp; count.</div>
    <div style="height:1px;background:var(--border);margin:10px 0 8px"></div>
    <div style="font-size:12.5px;color:var(--ink);margin-bottom:7px">First day of the week</div>
    ${(()=>{ const mode=_calWeekStartMode();
      const seg=(val,lbl)=>`<button onclick="event.stopPropagation();_calSetWeekStart('${val}')" style="flex:1;text-align:center;font-size:12px;font-weight:${mode===val?'600':'500'};font-family:inherit;cursor:pointer;padding:5px 0;border:${mode===val?'.5px solid #E3D7C4':'.5px solid transparent'};border-radius:6px;background:${mode===val?'#FBF8F3':'transparent'};color:${mode===val?'var(--gold-deep)':'var(--muted)'}">${lbl}</button>`;
      return `<div style="display:flex;width:100%;background:var(--surface);border:.5px solid var(--border);border-radius:8px;padding:3px;gap:3px">${seg('mon','Mon')}${seg('sun','Sun')}</div>`;
    })()}
  </div>`;
}
function _calToggleCog(e){
  if(e) e.stopPropagation();
  const m=document.getElementById('cal-cog-menu');
  if(!m) return;
  const showing=m.style.display!=='none' && m.style.display!=='';
  if(!showing) _closeFloatingMenus('cal-cog-menu');
  m.style.display=showing?'none':'block';
  if(!showing) _calAttachCogCloser();
}
function _calAttachCogCloser(){
  const close=(ev)=>{
    const menu=document.getElementById('cal-cog-menu');
    const wrap=document.getElementById('cal-cog-wrap');
    if(menu && wrap && !wrap.contains(ev.target)){ menu.style.display='none'; document.removeEventListener('click',close); }
  };
  setTimeout(()=>document.addEventListener('click',close),0);
}
function _calReopenCogMenu(){ const m=document.getElementById('cal-cog-menu'); if(m){ m.style.display='block'; _calAttachCogCloser(); } }
function _calToggleShow(key){
  const s=_calState();
  s[key]=!s[key];
  saveToStorage();
  navigate('calendar');
  setTimeout(_calReopenCogMenu, 40);
}
function _calSetWeekStart(mode){
  if(mode!=='mon'&&mode!=='sun') return;
  if(_calWeekStartMode()===mode){ setTimeout(_calReopenCogMenu, 40); return; }
  STATE.settings.calWeekStart=mode;
  // Re-anchor the currently shown week to the new first-day so week view stays put.
  if(_calWeekAnchor instanceof Date) _calWeekAnchor=_calMonday(_calWeekAnchor);
  saveToStorage();
  navigate('calendar');
  setTimeout(_calReopenCogMenu, 40);
}
function _calCogReset(){
  STATE.settings.calShow={tasks:true, appts:true, budget:true, wedding:true, events:true, compact:false};
  saveToStorage();
  navigate('calendar');
  setTimeout(_calReopenCogMenu, 40);
}

// ── Icons ──
function _calChevron(dir){
  const pts=dir==='left'?'15 18 9 12 15 6':'9 18 15 12 9 6';
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="${pts}"/></svg>`;
}
function _calCogIcon(){
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
}

function setChecklistView(v){ checklistView=v; if(!STATE.settings) STATE.settings={}; STATE.settings.checklistView=v; saveToStorage(); navigate('checklist'); }
// Remember per-group expand/collapse state in the checklist
function _clGroupCollapsed(key){ return !!(STATE.settings && STATE.settings.checklistCollapsed && STATE.settings.checklistCollapsed[key]); }
function _toggleChecklistGroup(btn, key){
  btn.classList.toggle('open');
  const nowCollapsed = !btn.classList.contains('open');
  btn.nextElementSibling.classList.toggle('hidden', nowCollapsed);
  if(!STATE.settings) STATE.settings={};
  if(!STATE.settings.checklistCollapsed) STATE.settings.checklistCollapsed={};
  STATE.settings.checklistCollapsed[key]=nowCollapsed;
  saveToStorage();
}
function onByDateClick(){
  if(checklistView!=='date'){ checklistView='date'; if(!STATE.settings) STATE.settings={}; STATE.settings.checklistView='date'; saveToStorage(); navigate('checklist'); return; }
  checklistDoneMode = checklistDoneMode==='move' ? 'cross' : 'move';
  if(!STATE.settings) STATE.settings={};
  STATE.settings.checklistDoneMode = checklistDoneMode;
  saveToStorage();
  navigate('checklist');
}
// Enter Category view; if already there, toggle Alphabetical ↔ Custom order.
function onByCategoryClick(){
  if(checklistView!=='category'){ checklistView='category'; if(!STATE.settings) STATE.settings={}; STATE.settings.checklistView='category'; saveToStorage(); navigate('checklist'); return; }
  checklistCatOrderMode = checklistCatOrderMode==='custom' ? 'alpha' : 'custom';
  if(checklistCatOrderMode!=='custom') checklistCatReorder=false; // leaving custom ends reordering
  if(!STATE.settings) STATE.settings={};
  STATE.settings.checklistCatOrderMode = checklistCatOrderMode;
  saveToStorage();
  navigate('checklist');
}
// Order a list of category names according to the current mode + saved custom order.
function _orderedCategories(cats){
  if(checklistCatOrderMode==='alpha'){
    return [...cats].sort((a,b)=>a.localeCompare(b, undefined, {sensitivity:'base'}));
  }
  // Custom: follow saved order; unseen categories append in first-seen order.
  const saved=(STATE.checklistCatOrder||[]).filter(c=>cats.includes(c));
  const extras=cats.filter(c=>!saved.includes(c));
  return [...saved, ...extras];
}
function toggleCatReorder(){
  checklistCatReorder=!checklistCatReorder;
  navigate('checklist');
}
let _dragCat=null, _catScrollRaf=null;
function _catAutoScroll(e){
  // Auto-scroll the .content pane when dragging near top/bottom edges
  const scroller=document.querySelector('.content');
  if(!scroller) return;
  const rect=scroller.getBoundingClientRect();
  const zone=80, speed=12;
  const distTop=e.clientY-rect.top;
  const distBot=rect.bottom-e.clientY;
  if(_catScrollRaf) cancelAnimationFrame(_catScrollRaf);
  if(distTop<zone && distTop>0){
    const step=()=>{ scroller.scrollTop-=speed*(1-(distTop/zone)); _catScrollRaf=requestAnimationFrame(step); };
    _catScrollRaf=requestAnimationFrame(step);
  } else if(distBot<zone && distBot>0){
    const step=()=>{ scroller.scrollTop+=speed*(1-(distBot/zone)); _catScrollRaf=requestAnimationFrame(step); };
    _catScrollRaf=requestAnimationFrame(step);
  }
}
function catDragStart(e, cat){ _dragCat=cat; e.dataTransfer.effectAllowed='move'; }
function catDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; _catAutoScroll(e); }
function catDrop(e, targetCat){
  e.preventDefault();
  if(_catScrollRaf){ cancelAnimationFrame(_catScrollRaf); _catScrollRaf=null; }
  if(_dragCat==null || _dragCat===targetCat) return;
  const UNCAT='Uncategorised';
  const allCats=[...new Set(STATE.checklist.map(i=>i.category||UNCAT))];
  let order=_orderedCategories(allCats);
  order=order.filter(c=>c!==_dragCat);
  const ti=order.indexOf(targetCat);
  order.splice(ti<0?order.length:ti, 0, _dragCat);
  STATE.checklistCatOrder=order;
  _dragCat=null;
  saveToStorage(); navigate('checklist');
}
function toggleCheckDetails(id){
  const d=document.getElementById('cdet-'+id);
  const c=document.getElementById('cchev-'+id);
  if(!d) return;
  const open=d.style.display!=='none';
  d.style.display=open?'none':'block';
  if(c) c.style.transform=open?'rotate(0deg)':'rotate(180deg)';
  // Remember the choice per task so it persists across renders/sessions.
  const t=STATE.checklist.find(x=>x.id===id);
  if(t){ t.detailsCollapsed = open; saveToStorage(); }
}

function checkItemHtml(i, mode){
  const budgetItem=i.budgetId?STATE.budget.items.find(b=>b.id===i.budgetId):null;
  const budgetSubItem=budgetItem&&i.budgetSubId?budgetItem.subItems?.find(s=>s.id===i.budgetSubId):null;
  const outstanding=i.budgetId?outstandingForItem(i.budgetId):0;

  // Budget due date urgency: use balance due date of linked item, 14-day window
  let budgetDueBadge='';
  if(budgetItem && !i.done){
    // When the task is linked to a specific sub-item, use ONLY that sub-item's
    // due date — never fall back to the parent item's date (that would show a
    // payment-due badge for a sub-item that has no due date of its own).
    const dueDate = i.budgetSubId ? (budgetSubItem?.balanceDueDate) : budgetItem.balanceDueDate;
    if(dueDate){
      const today=new Date(); today.setHours(0,0,0,0);
      const due=new Date(dueDate+'T00:00:00');
      const diff=(due-today)/86400000;
      if(diff<0) budgetDueBadge=`<span class="date-overdue" style="font-size:11px">Payment overdue · ${fmtBudgetDate(dueDate)}</span>`;
      else if(diff<=_budgetDueWindow()) budgetDueBadge=`<span class="date-red" style="font-size:11px">Payment due ${fmtBudgetDate(dueDate)}</span>`;
    }
  }

  const budgetBadge = budgetItem ? (() => {
    const name = budgetSubItem ? `${budgetItem.name} › ${budgetSubItem.name}` : budgetItem.name;
    const total = budgetSubItem ? getSubItemAmount(budgetSubItem) : calcBudgetItemTotal(budgetItem);
    const isPaid = budgetSubItem ? !!budgetSubItem.paid : !!budgetItem.paid;
    // For sub-items: remaining = amount minus deposit if deposit is paid
    const remaining = budgetSubItem
      ? Math.max(0, getSubItemAmount(budgetSubItem) - (budgetSubItem.depositPaid ? Number(budgetSubItem.deposit||0) : 0))
      : outstanding;
    const icon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
    if(!total) return `<span style="font-size:11px;color:var(--muted);display:inline-flex;align-items:center;gap:3px">${icon}${name}</span>`;
    if(isPaid) return `<span style="font-size:11.5px;color:var(--green);font-weight:500;display:inline-flex;align-items:center;gap:3px">${icon}${name} — ${fmt(total)} paid</span>`;
    return `<span style="font-size:11.5px;color:var(--gold-deep);font-weight:500;display:inline-flex;align-items:center;gap:3px">${icon}${name} — ${fmt(remaining)} remaining of ${fmt(total)}</span>`;
  })() : (() => {
    // Reverse link (Payment references this task via checklistId, task has no budgetId):
    // still show a clickable link-info chip so the affordance isn't lost.
    if(!_taskIsLinked(i)) return '';
    const partner = _resolveLinkPartnerName('task', i.id);
    const icon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
    return `<span style="font-size:11px;color:var(--gold-deep);font-weight:500;display:inline-flex;align-items:center;gap:3px">${icon}${partner||'Linked to budget'}</span>`;
  })();
  const vendorBadges = _taskVendorBadges(i);
  const crossCollapsed = (checklistView==='date' && checklistDoneMode==='cross' && i.done);
  if(mode==='archived'){
    const cat=(i.category||'').trim();
    return `<div class="check-item" id="cl-arch-${i.id}" style="align-items:flex-start">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <div class="check-label ${i.done?'done':''}">${_escHtml(i.text||'')}</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:3px;align-items:center">
          ${cat?`<span class="check-meta">${_escHtml(cat)}</span>`:''}
          ${i.dueDate?`<span class="check-meta">${dueDateLabel(i.dueDate,i.done,'COMPLETE')}</span>`:''}
          ${budgetDueBadge}
        </div>
        ${_taskHasAppts(i)?`<div class="cl-detail-wide" style="margin-top:4px;display:flex;flex-wrap:wrap;gap:5px">${_apptRowChip(i)}</div>`:''}
        ${i.notes?`<div class="cl-detail-wide" style="font-size:12px;color:var(--muted);margin-top:3px;font-style:italic">${_escHtml(i.notes)}</div>`:''}
        ${i.url?`<div class="cl-detail-wide" style="margin-top:4px">${_urlChipHtml(i.url)}</div>`:''}
        ${budgetBadge?`<div class="cl-link-chip cl-detail-wide" style="margin-top:4px;display:inline-block;border-radius:6px;padding:2px 5px;margin-left:-5px">${budgetBadge}</div>`:''}${vendorBadges}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
        <button class="btn btn-outline btn-sm" onclick="unarchiveCheckitem('${i.id}')" title="Restore to checklist" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 0 1 0 8h-1"/></svg>
          Restore
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteCheckitem('${i.id}')" title="Delete permanently" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          Delete
        </button>
      </div>
    </div>`;
  }
  const detailsBlock = `${i.dueDate?`<span class="check-meta">${dueDateLabel(i.dueDate,i.done,'COMPLETE')}</span>`:''}
        ${budgetDueBadge}`;
  if(crossCollapsed){
    const hasDetails = !!(i.dueDate || budgetDueBadge || i.notes || i.url || budgetBadge || _taskHasAppts(i));
    const _collapsed = !!i.detailsCollapsed; // remembered per task; default expanded
    return`<div class="check-item" id="cl-${i.id}">
    <div class="custom-checkbox ${i.done?'checked':''}" onclick="toggleCheck('${i.id}')"></div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:6px">
        <div class="check-label done">${_highlight(i.text,_checklistSearch)}</div>
      </div>
      <div id="cdet-${i.id}" style="display:${_collapsed?'none':'block'}">
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:3px;align-items:center">
          ${i.dueDate?`<span class="check-meta">${dueDateLabel(i.dueDate,i.done,'COMPLETE')}</span>`:''}
          ${budgetDueBadge}
        </div>
        ${_taskHasAppts(i)?`<div class="cl-detail-wide" style="margin-top:4px;display:flex;flex-wrap:wrap;gap:5px">${_apptRowChip(i)}</div>`:''}
        ${i.notes?`<div class="cl-detail-wide" style="font-size:12px;color:var(--muted);margin-top:3px;font-style:italic">${i.notes}</div>`:''}
        ${i.url?`<div class="cl-detail-wide" style="margin-top:4px">${_urlChipHtml(i.url)}</div>`:''}
        ${_lkChipHtml(i)}${budgetBadge?`<div id="cllink-${i.id}" class="cl-link-chip cl-detail-wide" onclick="event.stopPropagation();_openLinkMenu('task','${i.id}')" title="Linked · click to manage" style="margin-top:4px;display:inline-block;border-radius:6px;cursor:pointer;padding:2px 5px;margin-left:-5px">${budgetBadge}</div>`:''}${vendorBadges}
      </div>
    </div>
    ${hasDetails?`<button onclick="toggleCheckDetails('${i.id}')" title="Show details" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--muted);display:flex;align-items:center">
      <svg id="cchev-${i.id}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition:transform .15s;transform:${_collapsed?'rotate(0deg)':'rotate(180deg)'}"><polyline points="6 9 12 15 18 9"/></svg>
    </button>`:''}
    <button onclick="togglePin('${i.id}')" style="background:none;border:none;cursor:pointer;padding:4px;color:${i.pinned?'var(--gold-deep)':'var(--muted)'};display:flex;align-items:center" title="${i.pinned?'Unpin from dashboard':'Pin to dashboard'}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="${i.pinned?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg>
    </button>
    <div class="dots-menu">
      <button class="dots-btn" onclick="toggleDots(event,'cdots-${i.id}')">···</button>
      <div class="dots-dropdown hidden" id="cdots-${i.id}">
        <button onclick="closeDots();openEditCheckitem('${i.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button>
        <button onclick="closeDots();createFollowUpTask('${i.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg> Create follow-up task</button>
        <button onclick="closeDots();archiveCheckitem('${i.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><line x1="10" y1="13" x2="14" y2="13"/></svg> Archive</button>
        <button class="danger" onclick="deleteCheckitem('${i.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Delete</button>
      </div>
    </div>
  </div>`;
  }
  return`<div class="check-item" id="cl-${i.id}">
    <div class="custom-checkbox ${i.done?'checked':''}" onclick="toggleCheck('${i.id}')"></div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:6px">
        <div class="check-label ${i.done?'done':''}">${_highlight(i.text,_checklistSearch)}</div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:3px;align-items:center">
        ${i.dueDate?`<span class="check-meta">${dueDateLabel(i.dueDate,i.done,'COMPLETE')}</span>`:''}
        ${budgetDueBadge}
      </div>
      ${_taskHasAppts(i)?`<div class="cl-detail-wide" style="margin-top:4px;display:flex;flex-wrap:wrap;gap:5px">${_apptRowChip(i)}</div>`:''}
      ${i.notes?`<div class="cl-detail-wide" style="font-size:12px;color:var(--muted);margin-top:3px;font-style:italic">${i.notes}</div>`:''}
      ${i.url?`<div class="cl-detail-wide" style="margin-top:4px">${_urlChipHtml(i.url)}</div>`:''}
      ${_lkChipHtml(i)}${budgetBadge?`<div id="cllink-${i.id}" class="cl-link-chip cl-detail-wide" onclick="event.stopPropagation();_openLinkMenu('task','${i.id}')" title="Linked · click to manage" style="margin-top:4px;display:inline-block;border-radius:6px;cursor:pointer;padding:2px 5px;margin-left:-5px">${budgetBadge}</div>`:''}${vendorBadges}
    </div>
    <button onclick="togglePin('${i.id}')" style="background:none;border:none;cursor:pointer;padding:4px;color:${i.pinned?'var(--gold-deep)':'var(--muted)'};display:flex;align-items:center" title="${i.pinned?'Unpin from dashboard':'Pin to dashboard'}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="${i.pinned?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg>
    </button>
    <div class="dots-menu">
      <button class="dots-btn" onclick="toggleDots(event,'cdots-${i.id}')">···</button>
      <div class="dots-dropdown hidden" id="cdots-${i.id}">
        <button onclick="closeDots();openEditCheckitem('${i.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button>
        <button onclick="closeDots();createFollowUpTask('${i.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg> Create follow-up task</button>
        <button onclick="closeDots();archiveCheckitem('${i.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><line x1="10" y1="13" x2="14" y2="13"/></svg> Archive</button>
        <button class="danger" onclick="deleteCheckitem('${i.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Delete</button>
      </div>
    </div>
  </div>`;
}

// Unified "Escape cancels the action" mechanism. Any toggle that opens a
// secondary confirm popup sets _escapeRevert to a closure that undoes its change.
// Escape runs it; ×/Skip/Done clear it (closeModalDirect) so they don't revert.
let _escapeRevert=null;
let _escapeRevertArm=false;
// Master snapshot of pre-check state for full popup-chain revert (see toggleCheck).
// Set when a check opens a popup; cleared by closeModalDirect (so Done/Skip/Save keep
// changes). × / Escape restore it wholesale, undoing every change in the chain.
let _checkSnapshot=null;
function _restoreCheckSnapshot(){
  const snap=_checkSnapshot; _checkSnapshot=null;
  if(!snap) return false;
  const t=STATE.checklist.find(x=>x.id===snap.taskId);
  if(t) t.done=snap.taskDone;
  if(snap.bid && snap.bSnap){
    const b=STATE.budget.items.find(x=>x.id===snap.bid);
    if(b){ Object.keys(b).forEach(k=>delete b[k]); Object.assign(b, JSON.parse(JSON.stringify(snap.bSnap))); }
  }
  saveToStorage();
  if(typeof updateBudgetSummary==='function') updateBudgetSummary();
  navigate(_popupReturn());
  return true;
}
function _armEscapeRevert(fn){ _escapeRevert=fn; _escapeRevertArm=true; }
function toggleCheck(id, silent){
  const i=STATE.checklist.find(x=>x.id===id);
  if(!i)return; _popupOrigin=_currentPage;
  // Master snapshot for full-chain revert: when a (non-silent) check opens a popup,
  // the × / Escape on ANY popup in the chain restores this exact pre-check state —
  // the task's done-flag and the whole linked budget item (sub-items, deposits,
  // installments). Captured before we mutate anything. Silent re-toggles (used by
  // reverts) never capture, so they can't clobber the snapshot mid-revert.
  let _preCheck=null;
  if(!silent){
    const linkB = i.budgetId ? STATE.budget.items.find(x=>x.id===i.budgetId)
                             : STATE.budget.items.find(x=>x.checklistId===i.id);
    _preCheck={ taskId:id, taskDone:i.done,
      bid: linkB?linkB.id:null,
      bSnap: linkB?JSON.parse(JSON.stringify(linkB)):null };
  }
  i.done=!i.done;
  let _depTarget=null;
  if(i.budgetId){
    const b=STATE.budget.items.find(x=>x.id===i.budgetId);
    if(b){
      const isBook=_taskBookedKeyword(i.text);
      if(i.budgetSubId){
        const s=b.subItems?.find(x=>x.id===i.budgetSubId);
        if(s){
          if(isBook) s.booked=i.done;
          else s.taskDone=i.done;
          _depTarget={b, s};
        }
      } else {
        if(isBook) b.booked=i.done;
        else b.taskDone=i.done;
        _depTarget={b, s:null};
      }
    }
  }
  // Reverse link: a budget item may reference this checklist task via b.checklistId
  if(!_depTarget){
    const rb=STATE.budget.items.find(x=>x.checklistId===i.id);
    if(rb) _depTarget={b:rb, s:null};
  }
  saveToStorage();
  navigate('checklist');
  // In silent mode (used by the Escape revert) we never open a secondary popup.
  if(silent) return;
  // v179: one setting decides what follows a tick (_linkedMode). No pop-up chains.
  _escapeRevert=null; _checkSnapshot=null; _escapeRevertArm=false;
  if(!i.done) delete i._lkChip;
  let _lkHandled=false;
  if(_depTarget){
    _lkHandled=true;
    // Booked badge always sits on the item (or its linked sub-item) — no placement question.
    if(i.done && _taskBookedKeywordTask(i) && i.budgetId && i.bookedBadgePlacement===undefined
       && _bookedPlacementOptions(_depTarget.b, _depTarget.s).length>1) i.bookedBadgePlacement=_depTarget.s?'sub':'item';
    _linkedTaskTicked(i, _depTarget.b, _depTarget.s);
  } else if(i.done && !i.notCost && (_isMoneyCueTask(i) || _taskBookedKeywordTask(i) || _suggestBudgetMatch(`${i.text||''} ${i.notes||''}`))
            && !(STATE.settings && STATE.settings.hideBuyLinkPrompt) && !(STATE.settings && STATE.settings.suggestBudgetLinks===false)){
    _lkHandled=true;
    _unlinkedMoneyTicked(i);
  }
  // Follow-up and unpin are lines in the sheet for these ticks, never pop-ups after it.
  if(_lkHandled) return;
  // Catch-all: a task was just completed → offer to create a follow-up task
  // (gated by the Suggest Follow-up Tasks setting). If another prompt opened first,
  // defer the follow-up so it runs once that prompt is dismissed (chained, never stacked).
  if(i.done && !(STATE.settings && STATE.settings.suggestFollowUp===false)){
    const _modalOpen=!document.getElementById('modal-overlay').classList.contains('hidden');
    const _c2Open=!document.getElementById('confirm2-overlay').classList.contains('hidden');
    if(!_modalOpen && !_c2Open){
      _armEscapeRevert(()=>toggleCheck(id, true));
      _askFollowUp(i);
      _escapeRevertArm=false;
      if(document.getElementById('modal-overlay').classList.contains('hidden')){
        _escapeRevert=null;
      } else {
        _checkSnapshot=_preCheck;
      }
    } else {
      // Another prompt is showing — chain the follow-up to run after it closes.
      _pendingFollowUp=id;
    }
  }
  // Pinned-task completion → offer to unpin from the dashboard. Always the LAST
  // link in the chain: defer it, then flush only if nothing else opened a popup.
  if(i.done && i.pinned && !(STATE.settings && STATE.settings.askUnpinOnComplete===false)){
    _pendingUnpin=id;
    const _modalOpen=!document.getElementById('modal-overlay').classList.contains('hidden');
    const _c2Open=!document.getElementById('confirm2-overlay').classList.contains('hidden');
    if(!_modalOpen && !_c2Open) _flushUnpin();
  } else {
    _pendingUnpin=null;
  }
}
// If a booked-placement prompt was deferred because another popup opened first,
// run it now (called from the terminal handlers of those preceding popups).
let _pendingBookedPlacement=null;
function _flushBookedPlacement(){
  const id=_pendingBookedPlacement; _pendingBookedPlacement=null;
  if(!id) return false;
  const i=STATE.checklist.find(x=>x.id===id);
  if(!i || i.bookedBadgePlacement!==undefined) return false;
  _askBookedPlacement(id);
  return true;
}
// Deferred follow-up prompt: when a task completes but another prompt opened first,
// stash the task id and fire the follow-up once that prompt's terminal handler runs.
let _pendingFollowUp=null;
function _flushFollowUp(){
  const id=_pendingFollowUp; _pendingFollowUp=null;
  // No deferred follow-up, or it can't show → fall through to the unpin prompt.
  if(!id) return _flushUnpin();
  if(STATE.settings && STATE.settings.suggestFollowUp===false) return _flushUnpin();
  const i=STATE.checklist.find(x=>x.id===id);
  if(!i || !i.done) return _flushUnpin();
  // Only show if nothing else is currently on screen.
  if(!document.getElementById('modal-overlay').classList.contains('hidden')) return false;
  if(!document.getElementById('confirm2-overlay').classList.contains('hidden')) return false;
  _askFollowUp(i);
  return true;
}
// Unpin-on-complete: when a PINNED task is marked done, offer to remove it from
// the dashboard. Runs last in the completion-prompt chain so it never stacks.
let _pendingUnpin=null;
let _unpinTaskId=null;
function _flushUnpin(){
  const id=_pendingUnpin; _pendingUnpin=null;
  if(!id) return false;
  if(STATE.settings && STATE.settings.askUnpinOnComplete===false) return false;
  const i=STATE.checklist.find(x=>x.id===id);
  if(!i || !i.done || !i.pinned) return false;
  // Only show if nothing else is currently on screen.
  if(!document.getElementById('modal-overlay').classList.contains('hidden')) return false;
  if(!document.getElementById('confirm2-overlay').classList.contains('hidden')) return false;
  _askUnpin(i);
  return true;
}
function _askUnpin(task){
  if(!task) return;
  _unpinTaskId=task.id;
  const safe=(task.text||'').replace(/</g,'&lt;');
  const body=`<div style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <span style="width:28px;height:28px;border-radius:50%;background:rgba(196,168,130,.18);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--gold-deep)"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg></span>
      <div style="font-size:13.5px;color:var(--ink);font-weight:500;line-height:1.4">“${safe}” is done — remove it from the dashboard?</div>
    </div>
    <div style="font-size:12.5px;color:var(--muted);line-height:1.55">It's pinned to your dashboard. Completed tasks usually don't need to stay pinned.</div>
    <div style="display:flex;gap:7px">
      <button class="btn btn-outline btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center" onclick="_unpinKeep()">Keep pinned</button>
      <button class="btn btn-primary btn-sm" style="flex:1;padding:8px 6px;font-size:12px;justify-content:center;display:inline-flex;align-items:center;gap:5px" onclick="_unpinDo()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><line x1="12" y1="17" x2="12" y2="22"/><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h11"/><path d="M15 9.34V6h1a2 2 0 0 0 0-4H7.89"/></svg>Unpin</button>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);cursor:pointer;padding-top:1px"><input type="checkbox" id="unpin-dontask" style="width:15px;height:15px;accent-color:var(--gold);cursor:pointer"/> Don't ask again</label>
  </div>`;
  openModal('Unpin from dashboard?', body, '');
}
function _unpinPersistDontAsk(){
  const cb=document.getElementById('unpin-dontask');
  if(cb && cb.checked){ if(!STATE.settings) STATE.settings={}; STATE.settings.askUnpinOnComplete=false; saveToStorage(); }
}
function _unpinKeep(){ _unpinPersistDontAsk(); _unpinTaskId=null; _escapeRevert=null; _checkSnapshot=null; closeModalDirect(); navigate('checklist'); }
function _unpinDo(){
  _unpinPersistDontAsk();
  const id=_unpinTaskId; _unpinTaskId=null;
  _escapeRevert=null; _checkSnapshot=null;
  const i=id?STATE.checklist.find(x=>x.id===id):null;
  if(i) i.pinned=false;
  saveToStorage();
  closeModalDirect();
  navigate('checklist');
}
// Skip handler for the intermediate mark-paid/deposit prompts: close, then run a
// deferred booked-placement prompt if one is pending.
function _skipThenPlacement(){
  closeModalDirect();
  if(_flushBookedPlacement()) return;
  if(_flushFollowUp()) return;
  navigate(_popupReturn());
}
// When a booked task with NO deposit declines the "add a deposit" prompt, fall
// through to the balance "mark item paid?" prompt. Set while routing; consumed once.
let _bookedFallbackBalance=null;
function _flushBookedFallbackBalance(){
  const ctx=_bookedFallbackBalance; _bookedFallbackBalance=null;
  if(!ctx) return false;
  const b=STATE.budget.items.find(x=>x.id===ctx.bid); if(!b) return false;
  const s=ctx.sid?b.subItems?.find(x=>x.id===ctx.sid):null;
  _maybeAskMarkBudget(b, s, true);
  return !document.getElementById('modal-overlay').classList.contains('hidden');
}
// Ask where a booked task's BOOKED badge should appear on its linked Payment.
let _bpCtx=null;       // {taskId, bid, sid}
let _bpChoice='item';  // selected value
function _askBookedPlacement(taskId){
  const i=STATE.checklist.find(x=>x.id===taskId); if(!i || !i.budgetId) return;
  const b=STATE.budget.items.find(x=>x.id===i.budgetId); if(!b) return;
  const s=i.budgetSubId?b.subItems?.find(x=>x.id===i.budgetSubId):null;
  const opts=_bookedPlacementOptions(b, s);
  if(opts.length<2) return;
  _bpCtx={taskId, bid:b.id, sid:s?s.id:''};
  // Default selection: 'item' for item-linked, 'sub' for sub-linked.
  _bpChoice = s ? 'sub' : 'item';
  const bookedBadge=`<span style="font-size:9px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--gold-deep);background:rgba(201,184,156,.22);padding:1px 6px;border-radius:8px;vertical-align:middle">BOOKED</span>`;
  const rows=opts.map(o=>{
    const sel=o.value===_bpChoice;
    const extra=o.subId?` data-subid="${o.subId}"`:'';
    return `<label onclick="_bpSelect('${o.value}')"${extra} id="bp-opt-${o.value}" style="display:flex;align-items:center;gap:9px;padding:9px 11px;border:.5px solid ${sel?'var(--gold)':'var(--border)'};background:${sel?'var(--parchment)':'var(--surface)'};border-radius:9px;cursor:pointer">
      <span class="bp-radio" style="width:15px;height:15px;border-radius:50%;border:${sel?'4px solid var(--gold)':'1.5px solid var(--muted)'};flex-shrink:0;box-sizing:border-box"></span>
      <span><span style="font-size:12.5px;color:var(--ink);font-weight:500">${o.label}</span> <span style="font-size:10.5px;color:var(--muted)">— ${_escHtml(o.detail||'')}${o.value===(s?'sub':'item')?' (default)':''}</span></span>
    </label>`;
  }).join('');
  const targetName = s ? s.name : b.name;
  const body=`<div style="padding:2px">
    <div style="font-size:13px;color:var(--ink);line-height:1.55;margin-bottom:13px">“${_escHtml(i.text)}” is done. Which part of <strong>${_escHtml(b.name)}</strong> should carry the ${bookedBadge} badge?</div>
    <div style="display:flex;flex-direction:column;gap:7px">${rows}</div>
    <label style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--muted);margin-top:12px;cursor:pointer"><input type="checkbox" id="bp-always-item" style="width:14px;height:14px;cursor:pointer;accent-color:var(--gold)"/> Always use the item — don’t ask again</label>
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_bpCancel()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="_bpApply()">Place badge</button>`;
  openModal('Where should “Booked” appear?', body, footer);
}
function _bpSelect(val){
  _bpChoice=val;
  ['item','sub','deposit'].forEach(v=>{
    const el=document.getElementById('bp-opt-'+v); if(!el) return;
    const sel=v===val;
    el.style.border = sel?'.5px solid var(--gold)':'.5px solid var(--border)';
    el.style.background = sel?'var(--parchment)':'var(--surface)';
    const r=el.querySelector('.bp-radio'); if(r) r.style.border = sel?'4px solid var(--gold)':'1.5px solid var(--muted)';
  });
}
function _bpCancel(){ _bpCtx=null; closeModalDirect(); if(_flushFollowUp()) return; navigate(_popupReturn()); }
function _bpApply(){
  const c=_bpCtx; if(!c){ closeModalDirect(); return; }
  const i=STATE.checklist.find(x=>x.id===c.taskId);
  const alwaysItem=document.getElementById('bp-always-item')?.checked;
  if(alwaysItem){ if(!STATE.settings) STATE.settings={}; STATE.settings.alwaysBookedOnItem=true; }
  if(i){
    if(alwaysItem){
      i.bookedBadgePlacement='item';
    } else {
      i.bookedBadgePlacement=_bpChoice;
      // If the user picked "a sub-item" on an item-linked task, remember which sub.
      if(_bpChoice==='sub' && !c.sid){
        const el=document.getElementById('bp-opt-sub');
        i.bookedBadgeSubId = el?.getAttribute('data-subid') || '';
      } else {
        delete i.bookedBadgeSubId;
      }
    }
  }
  _bpCtx=null;
  saveToStorage();
  closeModalDirect();
  if(_flushFollowUp()) return;
  navigate(_popupReturn());
}
// (legacy name kept) — revert invoked by Escape / ×. Prefers the master snapshot
// (restores the whole popup chain to before the box was checked); falls back to the
// per-popup closure when there's no snapshot (popups not triggered by a checkbox).
function _revertCheckFromEscape(){
  if(_checkSnapshot){ _escapeRevert=null; _restoreCheckSnapshot(); return; }
  if(typeof _escapeRevert!=='function') return;
  const fn=_escapeRevert; _escapeRevert=null;
  fn();
}
// True when text mentions both "pay" and "deposit" (any order)
function _payDepositText(t){ return /\bpay\b/i.test(t||'') && /\bdeposit\b/i.test(t||''); }
let _depReturnPage='budget';
// The page the user was on when a popup chain began. All chained popups return here,
// so an intermediate re-render can't drift the return page (navigate() mutates _currentPage).
let _popupOrigin='budget';
let _popupChainDepth=0;
function _beginPopupChain(){ if(_popupChainDepth===0) _popupOrigin=_currentPage; _popupChainDepth++; _depReturnPage=_popupOrigin; }
function _endPopupChain(){ _popupChainDepth=Math.max(0,_popupChainDepth-1); }
function _popupReturn(){ return _popupOrigin||_depReturnPage||'budget'; }
// "< Back" support for the deposit / payments popups. A caller that chains INTO one
// of these from another popup stages _popupBackPending with a callback that re-opens
// the prior popup; the popup opener adopts it into _popupBack. Direct openers stage
// nothing, so no Back button shows. Consumed once on click.
let _popupBack=null;
let _popupBackPending=null;
// Called at the top of each popup opener: adopt any staged back callback (set by a
// chaining caller), then clear the staging slot so the next opener starts clean.
function _adoptPopupBack(){ _popupBack=_popupBackPending; _popupBackPending=null; }
function _popupBackBtnHtml(){
  return _popupBack ? `<button class="btn btn-outline btn-sm" onclick="_popupGoBack()" style="margin-right:auto">&lsaquo; Back</button>` : '';
}
function _popupGoBack(){
  const cb=_popupBack; _popupBack=null;
  closeModalDirect();
  if(typeof cb==='function') cb();
}
// Chain link icon (size px); inherits currentColor
function _chainIcon(sz){ return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`; }
// Standard "+" glyph for all Add buttons (consistent stroke, sizable). Default 13px.
function _plusIcon(sz){ sz=sz||14; return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`; }
// Reusable toggle switch (32×18 pill, gold when on). `onclickJs` fires on tap.
// Matches the Seating cog toggles so all menu show/hide controls look identical.
function _toggleSwitch(on, onclickJs){
  return `<div onclick="event.preventDefault();event.stopPropagation();${onclickJs}" style="width:32px;height:18px;border-radius:9px;background:${on?'var(--gold)':'var(--border)'};position:relative;transition:background .2s;flex-shrink:0;cursor:pointer">
    <div style="position:absolute;width:13px;height:13px;border-radius:50%;background:#fff;top:2.5px;left:${on?'16px':'2.5px'};transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
  </div>`;
}
function _unlinkIcon(sz){ return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M5.17 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`; }

// Build a clickable chain-icon span. `side` is 'task' or 'budget'; the remaining
// args identify the row the icon sits on. The title (hover) names the partner;
// clicking opens the link-management menu.
function _chainSpan(side, sz, id1, id2){
  const partner = _resolveLinkPartnerName(side, id1, id2);
  const title = partner ? `Linked to “${partner}” · click to manage` : 'Linked · click to manage';
  const args = id2!==undefined && id2!==null && id2!=='' ? `'${side}','${id1}','${id2}'` : `'${side}','${id1}'`;
  return `<span onclick="event.stopPropagation();_openLinkMenu(${args})" style="color:var(--gold-deep);display:inline-flex;align-items:center;flex-shrink:0;cursor:pointer" title="${title}">${_chainIcon(sz)}</span>`;
}

// Resolve the name of whatever a given row is linked to (the OTHER side).
function _resolveLinkPartnerName(side, id1, id2){
  if(side==='task'){
    const i=STATE.checklist.find(x=>x.id===id1); if(!i) return '';
    if(i.budgetId){ const b=STATE.budget.items.find(x=>x.id===i.budgetId); if(b){
      if(i.budgetSubId){ const s=b.subItems?.find(x=>x.id===i.budgetSubId); if(s) return `${b.name} › ${s.name}`; }
      return b.name; } }
    const rb=STATE.budget.items.find(x=>x.checklistId===i.id); if(rb) return rb.name;
    return '';
  } else {
    const b=STATE.budget.items.find(x=>x.id===id1); if(!b) return '';
    const s=id2?b.subItems?.find(x=>x.id===id2):null;
    const t=s?_subLinkedTask(b,s):_itemLinkedTask(b);
    return t?t.text:'';
  }
}

// Open the link-management menu for a chain icon.
let _linkMenuCtx=null;
function _openLinkMenu(side, id1, id2){
  _popupOrigin=_currentPage;
  _linkMenuCtx={side, id1, id2:id2||''};
  const partner=_resolveLinkPartnerName(side, id1, id2);
  const esc=s=>String(s||'').replace(/</g,'&lt;');
  // How many tasks are linked on the budget side (item or sub-item)?
  let _linkedTasks=[];
  if(side!=='task'){
    const b=STATE.budget.items.find(x=>x.id===id1);
    const s=b&&id2?b.subItems?.find(x=>x.id===id2):null;
    _linkedTasks=_tasksLinkedToTarget(b, s);
  }
  const _multi = side!=='task' && _linkedTasks.length>1;
  // The "Go to" destination: from a task it's the Payment; from a Payment
  // it's the checklist task. Name it on the row so you can see where it leads.
  const destPrefix = side==='task' ? 'in budget' : 'in checklist';
  let goLabel='Go to linked item', goDesc;
  if(_multi){
    goLabel='Go to linked task';
    goDesc=`${_linkedTasks.length} tasks linked — pick one`;
  } else {
    goDesc = partner ? `${destPrefix}: <strong style="color:var(--gold-deep)">${esc(partner)}</strong>` : destPrefix;
  }
  const _goOnclick = _multi ? '_linkMenuGoToPicker()' : '_linkMenuGoTo()';
  const goIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  const editIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  const chev='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  // Settings-style list row: icon tile, label + one-line description, chevron.
  const row=(onclick,icon,label,desc,danger,last)=>
    `<button type="button" onclick="${onclick}" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;font-family:inherit;background:none;border:none;${last?'':'border-bottom:.5px solid var(--border);'}padding:12px 13px;cursor:pointer">
       <span style="width:30px;height:30px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;background:${danger?'rgba(192,57,43,.12)':'rgba(166,134,78,.13)'};color:${danger?'var(--red)':'var(--gold-deep)'};pointer-events:none">${icon}</span>
       <span style="flex:1;min-width:0;pointer-events:none">
         <span style="display:block;font-size:13px;font-weight:500;color:${danger?'var(--red-deep)':'var(--ink)'}">${label}</span>
         <span style="display:block;font-size:10.5px;color:var(--muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${desc}</span>
       </span>
       <span style="color:var(--muted);flex-shrink:0;pointer-events:none">${chev}</span>
     </button>`;
  const body=`<div style="padding:2px">
    <div style="border:.5px solid var(--border);border-radius:11px;overflow:hidden">
      ${row(_goOnclick,goIcon,goLabel,goDesc,false,false)}
      ${row('_linkMenuAdjust()',editIcon,'Adjust link',_multi?'Change what points here':'Change what it points to',false,false)}
      ${row('_linkMenuUnlink()',_unlinkIcon(15),'Unlink',_multi?'Choose which to disconnect':'Disconnect the two',true,true)}
    </div>
  </div>`;
  openModal('Linked Payment', body, '');
}

// Go to the linked partner on the other side (navigate + highlight, no edit dialog).
function _linkMenuGoTo(){
  const c=_linkMenuCtx; if(!c){ closeModalDirect(); return; }
  closeModalDirect();
  if(c.side==='task'){
    const i=STATE.checklist.find(x=>x.id===c.id1); if(!i) return;
    let bid=i.budgetId, sid=i.budgetSubId;
    if(!bid){ const rb=STATE.budget.items.find(x=>x.checklistId===i.id); if(rb) bid=rb.id; }
    if(bid) _focusBudgetRow(bid, sid||'', sid?'balance':'');
  } else {
    const b=STATE.budget.items.find(x=>x.id===c.id1); if(!b) return;
    const s=c.id2?b.subItems?.find(x=>x.id===c.id2):null;
    const t=s?_subLinkedTask(b,s):_itemLinkedTask(b);
    if(t) _focusChecklistTask(t.id);
  }
}
// Shared row renderer for the link sub-pickers (Go-to list, Unlink list).
function _linkPickRow(onclick, label, sub, danger, last){
  const chev='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  return `<button type="button" onclick="${onclick}" style="display:flex;align-items:center;gap:11px;width:100%;text-align:left;font-family:inherit;background:none;border:none;${last?'':'border-bottom:.5px solid var(--border);'}padding:11px 12px;cursor:pointer">
    <span style="width:29px;height:29px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;background:${danger?'rgba(192,57,43,.12)':'rgba(166,134,78,.13)'};color:${danger?'var(--red)':'var(--gold-deep)'};pointer-events:none">${danger?_unlinkIcon(15):'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'}</span>
    <span style="flex:1;min-width:0;pointer-events:none"><span style="display:block;font-size:12.5px;font-weight:500;color:${danger?'var(--red-deep)':'var(--ink)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</span>${sub?`<span style="display:block;font-size:10px;color:var(--muted);margin-top:1px">${sub}</span>`:''}</span>
    <span style="color:var(--muted);flex-shrink:0;pointer-events:none">${chev}</span>
  </button>`;
}
// Multiple tasks link here → show a picker of all linked tasks; tapping one navigates.
function _linkMenuGoToPicker(){
  const c=_linkMenuCtx; if(!c) return;
  _popupBackPending=()=>_openLinkMenu(c.side,c.id1,c.id2);
  _adoptPopupBack();
  const b=STATE.budget.items.find(x=>x.id===c.id1); if(!b){ closeModalDirect(); return; }
  const s=c.id2?b.subItems?.find(x=>x.id===c.id2):null;
  const tasks=_tasksLinkedToTarget(b, s);
  const esc=x=>String(x||'').replace(/</g,'&lt;');
  const rows=tasks.map((t,i)=>_linkPickRow(`_linkMenuGoToTask('${t.id}')`, esc(t.text||'Untitled task'), t.done?'Completed':(t.category||''), false, i===tasks.length-1)).join('');
  const body=`<div style="padding:2px"><div style="border:.5px solid var(--border);border-radius:11px;overflow:hidden">${rows}</div></div>`;
  openModal('Go to linked task', body, _popupBackBtnHtml());
}
function _linkMenuGoToTask(taskId){ closeModalDirect(); _focusChecklistTask(taskId); }
// Multiple tasks link here → choose which one to disconnect from this item/sub-item.
function _linkMenuUnlinkPicker(){
  const c=_linkMenuCtx; if(!c) return;
  _popupBackPending=()=>_openLinkMenu(c.side,c.id1,c.id2);
  _adoptPopupBack();
  const b=STATE.budget.items.find(x=>x.id===c.id1); if(!b){ closeModalDirect(); return; }
  const s=c.id2?b.subItems?.find(x=>x.id===c.id2):null;
  const tasks=_tasksLinkedToTarget(b, s);
  const esc=x=>String(x||'').replace(/</g,'&lt;');
  const rows=tasks.map((t,i)=>_linkPickRow(`_linkMenuUnlinkTask('${t.id}')`, esc(t.text||'Untitled task'), 'Tap to disconnect', true, i===tasks.length-1)).join('');
  const body=`<div style="padding:2px"><div style="font-size:12px;color:var(--muted);line-height:1.5;margin:2px 4px 10px">Choose which task to unlink. Nothing is deleted — only the link is removed.</div><div style="border:.5px solid var(--border);border-radius:11px;overflow:hidden">${rows}</div></div>`;
  openModal('Unlink a task', body, _popupBackBtnHtml());
}
function _linkMenuUnlinkTask(taskId){
  const c=_linkMenuCtx;
  const t=STATE.checklist.find(x=>x.id===taskId);
  if(t){
    t.budgetId=''; t.budgetSubId='';
    // If this task was also the reverse link target, clear that pointer too.
    STATE.budget.items.forEach(b=>{ if(b.checklistId===taskId) b.checklistId=''; });
  }
  _linkMenuCtx=null;
  closeModalDirect();
  saveToStorage();
  navigate(_popupReturn());
}
// Navigate to the budget page and flash the linked item/sub-item row directly.
// (Used by "Go to linked item" — distinct from focusBudgetAlert, which prefers
// redirecting to the linked checklist task.)
function _focusBudgetRow(itemId, subId, kind){
  const b=STATE.budget.items.find(x=>x.id===itemId); if(!b) return;
  if(subId){
    b.expanded=true;
    const s=(b.subItems||[]).find(x=>x.id===subId);
    if(s){
      if(kind==='deposit' && !(s.showDeposit||s.deposit||s.depositDueDate)) s.showDeposit=true;
      try{ subCalcExpanded.add(subId); }catch(e){}
    }
  } else {
    b.expanded=true;
  }
  saveToStorage();
  navigate('budget');
  setTimeout(()=>{
    const el = subId ? document.getElementById('bsub-'+subId) : document.getElementById('bi-'+itemId);
    if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); _flashHighlight(el); }
    else { const fb=document.getElementById('bi-'+itemId); if(fb){ fb.scrollIntoView({behavior:'smooth',block:'center'}); _flashHighlight(fb); } }
  }, 80);
}
// Navigate to the checklist and briefly highlight a task row (3 pulses).
function _focusChecklistTask(taskId){
  navigate('checklist');
  setTimeout(()=>{
    const el=document.getElementById('cl-'+taskId);
    if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); _flashHighlight(el); }
  }, 80);
}

// Open a focused dialog with ONLY the link controls.
let _adjustLinkTaskId=null;
function _linkMenuAdjust(){
  const c=_linkMenuCtx; if(!c){ closeModalDirect(); return; }
  // Resolve the checklist task that owns the link (links live on the task).
  let task=null;
  if(c.side==='task'){
    task=STATE.checklist.find(x=>x.id===c.id1)||null;
  } else {
    const b=STATE.budget.items.find(x=>x.id===c.id1);
    const s=c.id2?b?.subItems?.find(x=>x.id===c.id2):null;
    task=s?_subLinkedTask(b,s):_itemLinkedTask(b);
  }
  if(!task){ closeModalDirect(); return; }
  _adjustLinkTaskId=task.id;
  _popupBackPending=()=>_openLinkMenu(c.side,c.id1,c.id2);
  _adoptPopupBack();
  const body=`<div style="display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12.5px;color:var(--muted);line-height:1.5">Linking <strong style="color:var(--ink)">“${task.text}”</strong> to a budget item or sub-item.</div>
    ${budgetLinkHtml(task.budgetId||'', task.budgetSubId||'')}
  </div>`;
  openModal('Adjust link', body,
    `${_popupBackBtnHtml()}<button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-primary" onclick="_saveAdjustLink()">Save link</button>`);
}
function _saveAdjustLink(){
  const t=STATE.checklist.find(x=>x.id===_adjustLinkTaskId);
  if(!t){ closeModalDirect(); return; }
  let _ciNewSubCreated=false;
  const raw=document.getElementById('ci-budget')?.value||'';
  let budgetId='', budgetSubId='';
  if(raw && raw!=='__new__|'){ const [bid,sid]=raw.split('|'); budgetId=bid||''; budgetSubId=sid||''; }
  // Handle "add new category" inline option if chosen here too.
  if(raw==='__new__|'){
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
    if(!newName){ _flashError(newNameEl); return; }
    if(addSub && !subName){ _flashError(subNameEl); return; }
    const nb={id:'b'+Date.now(),name:newName,total:newTotal,deposit:0,paid:false,dueDate:'',balanceDueDate:newDue,checklistId:'',note:'',expanded:true,subItems:[]};
    if(addSub && subName){ const sub={id:'bs'+Date.now(),name:subName,amount:subAmt,balanceDueDate:subDue,deposit:0,depositPaid:false,paid:false,showDeposit:false}; nb.subItems.push(sub); if(fromSubs) nb.totalFromSubs=true; budgetId=nb.id; budgetSubId=sub.id; _ciNewSubCreated=true; }
    else budgetId=nb.id;
    if(document.getElementById('ci-budget-newdep-add')?.checked){
      nb.deposit=Number(document.getElementById('ci-budget-newdep-amt')?.value)||0;
      nb.depositFromSubs=false;
      nb.depositDueDate=document.getElementById('ci-budget-newdep-due')?.value||'';
      nb.depositPaid=false;
    }
    STATE.budget.items.push(nb);
  }
  // Handle "create a new sub-item under this" for an existing item-level link.
  if(raw && raw!=='__new__|' && raw.endsWith('|')){
    const addExistSub=document.getElementById('ci-existsub-add')?.checked;
    const existSubNameEl=document.getElementById('ci-existsub-name');
    const existSubName=(existSubNameEl?.value||'').trim();
    const existSubAmt=Number(document.getElementById('ci-existsub-amt')?.value)||0;
    const existSubDue=document.getElementById('ci-existsub-due')?.value||'';
    if(addExistSub && !existSubName){ _flashError(existSubNameEl); return; }
    if(addExistSub && existSubName){
      const parent=STATE.budget.items.find(x=>x.id===budgetId);
      if(parent){
        if(!parent.subItems) parent.subItems=[];
        const sub={id:'bs'+Date.now(),name:existSubName,amount:existSubAmt,balanceDueDate:existSubDue,deposit:0,depositPaid:false,paid:false,showDeposit:false};
        parent.subItems.push(sub); parent.expanded=true; budgetSubId=sub.id; _ciNewSubCreated=true;
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
        parent.expanded=true; budgetSubId='';
      }
    }
  }
  // Clear any reverse links pointing at this task, then set the new link.
  STATE.budget.items.forEach(b=>{ if(b.checklistId===t.id) b.checklistId=''; });
  t.budgetId=budgetId; t.budgetSubId=budgetSubId;
  _adjustLinkTaskId=null;
  closeModalDirect();
  saveToStorage();
  // If a brand-new sub-item was just created, offer the deposit / status prompt
  // (same "Update its budget status?" surface used on task completion).
  if(_ciNewSubCreated && budgetId && budgetSubId){
    const _bid=budgetId, _sid=budgetSubId, _tid=t.id;
    navigate(_popupReturn());
    setTimeout(()=>{ try{ _askLinkedBudgetStatus(_bid, _sid, _tid); }catch(_){} }, 70);
    return;
  }
  navigate(_popupReturn());
}

// Confirm, then remove the link from BOTH sides so it fully clears.
function _linkMenuUnlink(){
  const c=_linkMenuCtx; if(!c) return;
  // Budget side with more than one linked task → choose which to disconnect.
  if(c.side!=='task'){
    const b=STATE.budget.items.find(x=>x.id===c.id1);
    const s=b&&c.id2?b.subItems?.find(x=>x.id===c.id2):null;
    if(_tasksLinkedToTarget(b, s).length>1){ _linkMenuUnlinkPicker(); return; }
  }
  const partner=_resolveLinkPartnerName(c.side, c.id1, c.id2);
  const body=`<div style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;align-items:center;gap:9px">
      <span style="width:26px;height:26px;border-radius:50%;background:rgba(192,57,43,.14);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--red)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
      <div style="font-size:13.5px;color:var(--ink);font-weight:500">Remove this link?</div>
    </div>
    <div style="font-size:12.5px;color:var(--muted);line-height:1.5">This will unlink it from <strong style="color:var(--ink)">${partner||'the linked item'}</strong>. Nothing is deleted — only the link is removed.</div>
  </div>`;
  openModal('Unlink', body,
    `<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-sm" onclick="_applyUnlink()" style="background:var(--red);color:#fff;border:1px solid var(--red)">Unlink</button>`);
}
function _applyUnlink(){
  const c=_linkMenuCtx; if(!c){ closeModalDirect(); return; }
  if(c.side==='task'){
    const i=STATE.checklist.find(x=>x.id===c.id1);
    if(i){
      // Clear reverse links pointing at this task, then clear this task's own link.
      if(i.budgetId){ const b=STATE.budget.items.find(x=>x.id===i.budgetId); if(b && b.checklistId===i.id) b.checklistId=''; }
      STATE.budget.items.forEach(b=>{ if(b.checklistId===i.id) b.checklistId=''; });
      i.budgetId=''; i.budgetSubId='';
    }
  } else {
    const b=STATE.budget.items.find(x=>x.id===c.id1); if(b){
      const s=c.id2?b.subItems?.find(x=>x.id===c.id2):null;
      const t=s?_subLinkedTask(b,s):_itemLinkedTask(b);
      if(t){ t.budgetId=''; t.budgetSubId=''; }
      if(!s && b.checklistId) b.checklistId='';
    }
  }
  _linkMenuCtx=null;
  closeModalDirect();
  saveToStorage();
  navigate(_popupReturn());
}

// ── Link a budget item / sub-item to a checklist task (initiated from budget) ──
let _linkToCtx=null;
function _openLinkToChecklist(bid, sid){
  const b=STATE.budget.items.find(x=>x.id===bid); if(!b) return;
  const s=sid?b.subItems?.find(x=>x.id===sid):null;
  if(sid && !s) return;
  _popupOrigin=_currentPage;
  _linkToCtx={bid, sid:sid||'', mode:'existing'};
  _ltForcedCategory='';
  const targetName = s ? `${b.name} › ${s.name}` : b.name;
  const hasDep = s ? (s.showDeposit||Number(s.deposit||0)>0||!!s.depositDueDate)
                   : (Number(calcBudgetDeposit(b)||0)>0 || !!b.depositDueDate || !!b.depositFromSubs);
  // Tasks available to link (exclude ones already linked to THIS exact target).
  const taskOpts = STATE.checklist
    .filter(t=>!(t.budgetId===bid && (t.budgetSubId||'')===(sid||'')))
    .map(t=>`<option value="${t.id}">${t.text.replace(/"/g,'&quot;')}</option>`).join('');
  // ── Smart suggestions (same engine as the budget forms) ──
  const suggestHtml=_ltSuggestHtml(b, s);
  // Date the new task inherits: the target's Balance Due (sub-item's own, else parent's).
  const _ltInheritDate = (s && s.balanceDueDate) ? s.balanceDueDate : (b.balanceDueDate||'');
  const _ltDateLbl = _ltInheritDate ? `Use the item's date (${fmtBudgetDate(_ltInheritDate)})` : "Use the item's date (none set yet)";
  const body = `<div style="display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:4px">${targetName}</div>
    ${suggestHtml}
    <div id="lt-existing" style="display:flex;flex-direction:column;gap:6px">
      <label class="form-label">${suggestHtml?'Or choose any task':'Choose a task'}</label>
      <div style="position:relative">
        <select class="form-input" id="lt-task" style="appearance:none;-webkit-appearance:none;padding-right:32px">
          ${taskOpts||'<option value="">— No tasks yet —</option>'}
        </select>
        
      </div>
      <div onclick="_ltSetMode('new')" style="font-size:12px;color:var(--gold-deep);cursor:pointer;display:inline-flex;align-items:center;gap:5px;margin-top:2px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Create a new task instead</div>
    </div>
    <div id="lt-new" style="display:none;flex-direction:column;gap:6px">
      <label class="form-label">New task name</label>
      <input class="form-input" id="lt-newname" placeholder="e.g. Pay cake deposit"/>
      <div id="lt-new-cat-hint" style="font-size:10.5px;color:var(--gold-deep)"></div>
      <label style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--ink);cursor:pointer;margin-top:2px">
        <input type="checkbox" id="lt-usedate" checked onchange="_ltDateToggle()" style="width:14px;height:14px;cursor:pointer;accent-color:var(--gold)"/>
        <span id="lt-usedate-lbl">${_ltDateLbl}</span>
      </label>
      <div class="form-group" id="lt-date-row" style="margin:0;display:none"><label class="form-label">Task due date</label><input class="form-input" type="date" id="lt-date" value="${_ltInheritDate}"/></div>
      <div onclick="_ltSetMode('existing')" style="font-size:12px;color:var(--gold-deep);cursor:pointer;display:inline-flex;align-items:center;gap:5px;margin-top:2px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>Pick an existing task instead</div>
    </div>
    ${hasDep?`<label style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink);cursor:pointer;margin-top:6px"><input type="checkbox" id="lt-deposit" style="width:15px;height:15px;cursor:pointer"/> Link to the deposit (not the balance)</label>`:''}
  </div>`;
  openModal('Link to a checklist task', body,
    `<button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-primary" onclick="_saveLinkToChecklist()">Link</button>`);
}
// Build the suggestion chip for the Link popup. `b` is the Payment, `s` the
// sub-item (or null). Two sections: word matches, then tasks in a matching category,
// then a "New task in [cat]" action. Honours the suggestBudgetLinks setting.
let _ltForcedCategory='';
function _ltSuggestHtml(b, s){
  if(STATE.settings && STATE.settings.suggestBudgetLinks===false) return '';
  const name = s ? s.name : b.name;
  // Context for wider matching: a sub-item also feeds on its parent's name+notes.
  const ctx = s ? {parentName:b.name||'', parentNote:b.note||'', subNote:s.note||''} : null;
  const wordMatches=_suggestTaskMatches(name, 3, ctx).filter(m=>!(m && _taskLinkedToThis(m.tid, b.id, s?s.id:'')));
  // Category from name + notes (+ parent for subs).
  const catTexts=[name, s?(s.note||''):(b.note||'')];
  if(s){ catTexts.push(b.name||'', b.note||''); }
  const matchedCat=_matchTaskCategory(catTexts);
  const excludeIds=wordMatches.map(m=>m.tid);
  const catTasks = matchedCat ? _tasksInCategory(matchedCat, excludeIds).slice(0,4) : [];
  if(!wordMatches.length && !catTasks.length && !matchedCat) return '';
  const parentName = s ? (b.name||'') : '';

  const row=(label,tid,tag)=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-top:.5px solid var(--border)">
      <span style="flex:1;font-size:11.5px;color:var(--ink)">${label.replace(/</g,'&lt;')}</span>
      ${tag||''}
      <button type="button" onclick="_ltLinkSuggested('${tid}')" style="font-size:11px;padding:4px 12px;border:none;border-radius:7px;background:var(--gold);color:#fff;font-weight:500;cursor:pointer;flex:none">Link</button>
    </div>`;
  const secLbl=(t)=>`<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:7px 0 1px">${t}</div>`;

  let wordSec='';
  if(wordMatches.length){
    const rows=wordMatches.map(m=>{
      const tag=(m.viaParent && parentName)
        ? `<span style="font-size:10px;color:var(--gold-deep);background:rgba(201,184,156,.18);padding:1px 7px;border-radius:9px;flex:none;white-space:nowrap">via ${parentName.replace(/</g,'&lt;')}</span>`
        : (m.category?`<span style="font-size:10.5px;color:var(--muted);flex:none">${m.category.replace(/</g,'&lt;')}</span>`:'');
      return row(m.label, m.tid, tag);
    }).join('');
    wordSec=`${secLbl('By wording')}${rows}`;
  }
  let catSec='';
  if(matchedCat && catTasks.length){
    const pill=`<span style="font-size:9.5px;color:var(--gold-deep);background:rgba(201,184,156,.2);padding:1px 7px;border-radius:9px;flex:none;white-space:nowrap">${matchedCat.replace(/</g,'&lt;')}</span>`;
    catSec=`${secLbl('In matching category · '+matchedCat.replace(/</g,'&lt;'))}${catTasks.map(m=>row(m.label,m.tid,pill)).join('')}`;
  }
  let newSec='';
  if(matchedCat){
    newSec=`<div style="height:.5px;background:var(--border);margin:9px 0 2px"></div>
      <button type="button" onclick="_ltNewTaskInCategory('${matchedCat.replace(/'/g,"\\'")}')" style="font-size:11px;padding:5px 0;border:none;background:none;color:var(--gold-deep);font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New task in “${matchedCat.replace(/</g,'&lt;')}”…
      </button>`;
  }
  return `<div style="background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:9px 11px;margin-bottom:2px">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:2px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
      <span style="font-size:11px;color:var(--muted)">Suggested tasks</span>
    </div>
    ${wordSec}${catSec}${newSec}
  </div>`;
}
// True if task `tid` is already linked to this exact budget target.
function _taskLinkedToThis(tid, bid, sid){
  const t=STATE.checklist.find(x=>x.id===tid);
  return !!t && t.budgetId===bid && (t.budgetSubId||'')===(sid||'');
}
// A suggested task tapped: route through the existing select + save flow so the
// re-link confirmation and date reconciliation apply.
function _ltLinkSuggested(tid){
  const sel=document.getElementById('lt-task');
  if(sel){ sel.value=tid; }
  if(_linkToCtx){ _linkToCtx.mode='existing'; }
  _saveLinkToChecklist();
}
// "New task in [category]" → switch to new-task mode, prefill, stash the category.
function _ltNewTaskInCategory(cat){
  _ltForcedCategory=cat||'';
  _ltSetMode('new');
  const b=_linkToCtx?STATE.budget.items.find(x=>x.id===_linkToCtx.bid):null;
  const s=(b&&_linkToCtx.sid)?b.subItems?.find(x=>x.id===_linkToCtx.sid):null;
  const nm=s?s.name:(b?b.name:'');
  const inp=document.getElementById('lt-newname');
  if(inp){ if(!inp.value.trim()) inp.value=_taskTitleFromBudget(nm)||nm; inp.focus(); }
  const hint=document.getElementById('lt-new-cat-hint');
  if(hint) hint.textContent = cat ? `Will be filed under “${cat}”.` : '';
}
function _ltSetMode(mode){
  if(_linkToCtx) _linkToCtx.mode=mode;
  const ex=document.getElementById('lt-existing'), nw=document.getElementById('lt-new');
  if(ex) ex.style.display = mode==='existing' ? 'flex' : 'none';
  if(nw) nw.style.display = mode==='new' ? 'flex' : 'none';
  // Switching to "new task": prefill a "Purchase …" title from the target if blank.
  if(mode==='new'){
    const c=_linkToCtx;
    const b=c?STATE.budget.items.find(x=>x.id===c.bid):null;
    const s=(b&&c.sid)?b.subItems?.find(x=>x.id===c.sid):null;
    const nm=s?s.name:(b?b.name:'');
    const inp=document.getElementById('lt-newname');
    if(inp && !inp.value.trim()){ inp.value=_taskTitleFromBudget(nm)||''; }
  }
}
// "Use the item's date" toggle in the new-task block: ticked hides the picker
// (the task inherits the target's balance-due date); unticked reveals it for a
// custom or blank date.
function _ltDateToggle(){
  const use=document.getElementById('lt-usedate')?.checked;
  const row=document.getElementById('lt-date-row');
  if(row) row.style.display = use ? 'none' : 'block';
}
function _saveLinkToChecklist(){
  const c=_linkToCtx; if(!c){ closeModalDirect(); return; }
  const b=STATE.budget.items.find(x=>x.id===c.bid); if(!b){ closeModalDirect(); return; }
  c.wantsDeposit = !!document.getElementById('lt-deposit')?.checked; // capture before any modal swap
  let task=null;
  if(c.mode==='new'){
    const name=(document.getElementById('lt-newname')?.value||'').trim();
    if(!name){ document.getElementById('lt-newname')?.focus(); return; }
    // File under the chosen category (from "New task in [cat]"), else resolve from the
    // target's name/notes, else General. Inherit the target's Balance Due as the date.
    const s2=c.sid?b.subItems?.find(x=>x.id===c.sid):null;
    const tgt=s2||b;
    const cat=_ltForcedCategory || _resolveTaskCategory(tgt.name||'', [tgt.note||'', b.name||'', b.note||'']);
    // Date: inherit the target's Balance Due when "use item's date" is ticked,
    // otherwise honour the custom date the user picked (which may be blank).
    const _ltUseDate=document.getElementById('lt-usedate')?.checked;
    const _ltCustom=document.getElementById('lt-date')?.value||'';
    const _ltInherit=(s2&&s2.balanceDueDate)?s2.balanceDueDate:(b.balanceDueDate||'');
    const _due = _ltUseDate ? _ltInherit : _ltCustom;
    task={id:'cl'+Date.now(),text:name,done:false,dueDate:_due,category:cat,notes:'',pinned:false,budgetId:'',budgetSubId:''};
    STATE.checklist.push(task);
  } else {
    const tid=document.getElementById('lt-task')?.value||'';
    task=STATE.checklist.find(t=>t.id===tid)||null;
    if(!task){ closeModalDirect(); return; }
    // Warn if this task is already linked elsewhere, then reassign on confirm.
    if(_taskIsLinked(task) && !(task.budgetId===c.bid && (task.budgetSubId||'')===(c.sid||''))){
      _pendingLinkTaskId=task.id;
      const cur=_resolveLinkPartnerName('task', task.id, '');
      const body=`<div style="font-size:13px;line-height:1.55;color:var(--ink)">“<strong>${task.text}</strong>” is already linked to <strong>${cur||'another Payment'}</strong>. Re-link it to this one instead?</div>`;
      openModal('Re-link task?', body,
        `<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Cancel</button>
         <button class="btn btn-primary btn-sm" onclick="_confirmReLink()">Re-link</button>`);
      return;
    }
  }
  _applyLinkToTask(task);
}
let _pendingLinkTaskId=null;
function _confirmReLink(){
  const task=STATE.checklist.find(t=>t.id===_pendingLinkTaskId);
  _pendingLinkTaskId=null;
  if(task) _applyLinkToTask(task);
  else { closeModalDirect(); }
}
function _applyLinkToTask(task){
  const c=_linkToCtx; if(!c||!task){ closeModalDirect(); return; }
  // Clear any prior link this task had (both directions).
  if(task.budgetId){ const ob=STATE.budget.items.find(x=>x.id===task.budgetId); if(ob && ob.checklistId===task.id) ob.checklistId=''; }
  STATE.budget.items.forEach(x=>{ if(x.checklistId===task.id) x.checklistId=''; });
  // Set the new link.
  task.budgetId=c.bid;
  task.budgetSubId=c.sid||'';
  // If linking to a deposit, make sure the task carries a deposit keyword so the
  // chain sits on the deposit row. Add a gentle marker to the notes if needed.
  const wantsDeposit = !!c.wantsDeposit;
  if(wantsDeposit && !_taskDepositKeyword(task)){
    task.notes = (task.notes ? task.notes+' ' : '') + '(deposit)';
  }
  _linkToCtx=null;
  closeModalDirect();
  saveToStorage();
  navigate(_popupReturn());
}

// ════════════════════════════════════════════════════════════════════════════
// Reverse suggestion: while adding/editing a Payment, surface matching tasks.
// Pending links are collected by task id and applied once the item exists (Add) or
// immediately against the known id (Edit). Mirrors the checklist→budget chip.
// ════════════════════════════════════════════════════════════════════════════
let _bePendingTaskLinks=[];   // task ids queued to link when the item is saved (Add flow)
let _beEditTarget=null;       // {bid, sid} when editing an existing item/sub (immediate apply)
let _beSubParent=null;        // parent item id when adding a sub-item (Add-sub flow)
let _beSubCtx=null;           // {parentName, parentNote, subNote} for wider sub-item matching
let _beAddTaskInheritDate=''; // parent category Balance Due, used by the sub-item add-task date
let _beForcedTaskCategory=''; // category chosen via "New task in [cat]"; overrides auto-resolve

// Build the suggestion chip HTML for the current name field. `nameVal` is the typed
// name. Skips tasks already queued. Honours the global suggestBudgetLinks setting.
// Layout A: a "By wording" section (text matches), then an "In matching category"
// section (unlinked tasks already filed under a category the budget maps to), then a
// "New task in [category]" action.
function _beTaskSuggestHtml(nameVal){
  if(STATE.settings && STATE.settings.suggestBudgetLinks===false) return '';
  // Word-match tasks against the sub-item/category name only.
  // Exclude viaParent matches: those only cleared the bar through the parent
  // category text, not the item name being typed, producing noisy suggestions.
  const wordMatches=_suggestTaskMatches(nameVal, 3, _beSubCtx)
    .filter(m=>!_bePendingTaskLinks.includes(m.tid) && !m.viaParent);
  // "In matching category" section removed: sweeping all tasks from a loosely
  // matched parent category fires too broadly (e.g. "Chino (Natural)" pulling
  // "Wedding Gown Alterations" via the Attire parent). The matched category is
  // kept solely for the "+ New task in [cat]" action.
  const noteVal=document.getElementById('be-note')?.value || document.getElementById('si-note')?.value || '';
  const catTexts=[nameVal, noteVal];
  if(_beSubCtx){ catTexts.push(_beSubCtx.parentName||'', _beSubCtx.parentNote||'', _beSubCtx.subNote||''); }
  const matchedCat=_matchTaskCategory(catTexts);
  // Nothing to show at all: no chip.
  if(!wordMatches.length && !matchedCat) return '';

  const taskRow=(label, tid, tagHtml)=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-top:.5px solid var(--border)">
      <span style="flex:1;font-size:11.5px;color:var(--ink)">${label.replace(/</g,'&lt;')}</span>
      ${tagHtml||''}
      <button type="button" onclick="_beQueueTaskLink('${tid}')" style="font-size:11px;padding:4px 12px;border:none;border-radius:7px;background:var(--gold);color:#fff;font-weight:500;cursor:pointer;flex:none">Link</button>
    </div>`;
  const secLbl=(txt)=>`<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:7px 0 1px">${txt}</div>`;

  // Section 1: by wording (name-only matches, no viaParent).
  let wordSec='';
  if(wordMatches.length){
    const rows=wordMatches.map(m=>{
      const tag=m.category?`<span style="font-size:10.5px;color:var(--muted);flex:none">${m.category.replace(/</g,'&lt;')}</span>`:'';
      return taskRow(m.label, m.tid, tag);
    }).join('');
    wordSec=`${secLbl('By wording')}${rows}`;
  }
  // New-task action (only when we have a category to file it under).
  let newSec='';
  if(matchedCat){
    newSec=`<div style="height:.5px;background:var(--border);margin:9px 0 2px"></div>
      <button type="button" onclick="_beNewTaskInCategory('${matchedCat.replace(/'/g,"\\'")}')" style="font-size:11px;padding:5px 0;border:none;background:none;color:var(--gold-deep);font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New task in "${matchedCat.replace(/</g,'&lt;')}"...
      </button>`;
  }

  return `<div id="be-task-suggest" style="background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:9px 11px;margin-top:-4px">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:2px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
      <span style="font-size:11px;color:var(--muted)">Checklist tasks that may relate</span>
    </div>
    ${wordSec}${newSec}
  </div>`;
}


// A small "linked tasks" confirmation strip listing what's queued so far.
function _bePendingChipHtml(){
  if(!_bePendingTaskLinks.length) return '';
  const names=_bePendingTaskLinks.map(id=>{
    const t=STATE.checklist.find(x=>x.id===id); return t?t.text.replace(/</g,'&lt;'):'';
  }).filter(Boolean);
  if(!names.length) return '';
  const rows=names.map((n,i)=>`<div style="display:flex;align-items:center;gap:7px;padding:3px 0">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    <span style="flex:1;font-size:11.5px;color:var(--gold-deep);font-weight:500">${n}</span>
    <button type="button" onclick="_beUnqueueTaskLink(${i})" title="Remove" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:2px;flex:none"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  </div>`).join('');
  return `<div id="be-pending-links" style="background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:9px 11px;margin-top:-4px">
    <div style="font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Will link on save</div>
    ${rows}
  </div>`;
}

// Re-render both the suggestion chip and the pending strip inside the budget form.
// `nameFieldId` defaults to 'be-name'; the sub-item form passes 'si-name'.
function _beRefreshTaskSuggest(nameFieldId){
  const host=document.getElementById('be-suggest-host');
  if(!host) return;
  const fid=nameFieldId||'be-name';
  const nameVal=document.getElementById(fid)?.value||'';
  host.innerHTML=_bePendingChipHtml()+_beTaskSuggestHtml(nameVal);
}

function _beQueueTaskLink(tid){
  if(!_bePendingTaskLinks.includes(tid)) _bePendingTaskLinks.push(tid);
  // Edit flow: the item already exists, so apply (with reconciliation) immediately.
  if(_beEditTarget){
    const t=STATE.checklist.find(x=>x.id===tid);
    if(t) _linkTaskToBudgetWithDates(t, _beEditTarget.bid, _beEditTarget.sid, ()=>{
      // pop it back off the queue (it's applied, not pending) and refresh
      _bePendingTaskLinks=_bePendingTaskLinks.filter(x=>x!==tid);
      _beRefreshTaskSuggest();
    });
    return;
  }
  _beRefreshTaskSuggest();
}
function _beUnqueueTaskLink(i){ _bePendingTaskLinks.splice(i,1); _beRefreshTaskSuggest(); }

// ── Feature 2: "Also add a checklist task" while creating a Payment/sub ──
// Renders a checkbox that reveals an editable, prefilled task name and a date line
// that inherits the item's Balance Due (adjustable). The block lives in its own host
// so it can be toggled without re-rendering the whole form. `nameFieldId` is the
// budget name field to derive a suggested task name from.
function _beAddTaskBlockHtml(nameFieldId, opts){
  opts=opts||{};
  // Source fields this task should pull from: the budget item's own due-date input and
  // its URL input. Stashed on a hidden host so the toggle/save helpers can read them
  // regardless of which modal (item / sub add / sub edit) hosts the block.
  const dateSrc=opts.dateField||'';
  const urlSrc=opts.urlField||'';
  return `<div id="be-addtask-wrap" data-date-src="${dateSrc}" data-url-src="${urlSrc}" style="display:flex;flex-direction:column;gap:0">
    <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink);cursor:pointer">
      <input type="checkbox" id="be-addtask-on" onchange="_beToggleAddTask('${nameFieldId||'be-name'}')" style="width:15px;height:15px;cursor:pointer;accent-color:var(--gold)"/>
      Also add a checklist task
    </label>
    <div id="be-addtask-body" style="display:none;flex-direction:column;gap:8px;background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:11px;margin-top:8px;position:relative">
      <button type="button" onclick="_beCollapseAddTask()" title="Remove" aria-label="Remove new task" style="position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;color:var(--muted);padding:2px;line-height:0" onmouseover="this.style.color='var(--ink)'" onmouseout="this.style.color='var(--muted)'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      <div class="form-group" style="margin:0"><label class="form-label">Task name</label><input class="form-input" id="be-addtask-name" placeholder="e.g. Arrange florals" style="padding-right:28px"/></div>
      <div id="be-addtask-cat-hint" style="font-size:10.5px;color:var(--gold-deep)"></div>
      <label style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--ink);cursor:pointer">
        <input type="checkbox" id="be-addtask-usedate" checked onchange="_beAddTaskDateToggle()" style="width:14px;height:14px;cursor:pointer;accent-color:var(--gold)"/>
        <span id="be-addtask-usedate-lbl">Use the item's date</span>
      </label>
      <div class="form-group" id="be-addtask-date-row" style="margin:0;display:none"><label class="form-label">Task due date</label><input class="form-input" type="date" id="be-addtask-date"/></div>
      <label id="be-addtask-copyurl-row" style="display:none;align-items:center;gap:7px;font-size:11.5px;color:var(--ink);cursor:pointer">
        <input type="checkbox" id="be-addtask-copyurl" checked style="width:14px;height:14px;cursor:pointer;accent-color:var(--gold)"/>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--gold-deep)"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <span>Copy link to task</span><span id="be-addtask-copyurl-dom" style="color:var(--muted)"></span>
      </label>
      <div id="be-addtask-notes-link"><button type="button" onclick="document.getElementById('be-addtask-notes-panel').style.display='block';this.parentElement.style.display='none';document.getElementById('be-addtask-notes')?.focus()" style="border:none;background:none;color:var(--gold-deep);font-size:11.5px;cursor:pointer;padding:0;font-family:inherit">+ Add notes</button></div>
      <div class="form-group" id="be-addtask-notes-panel" style="margin:0;display:none"><label class="form-label">Notes <span style="color:var(--muted);font-weight:400">(optional)</span></label><textarea class="form-input" id="be-addtask-notes" rows="2" placeholder="Any details for this task" style="resize:vertical;min-height:48px"></textarea></div>
    </div>
  </div>`;
}
// Collapse the "Also add a checklist task" block and uncheck its trigger —
// called by the X Remove button inside the task-name box (green box).
function _beCollapseAddTask(){
  const on=document.getElementById('be-addtask-on');
  if(on) on.checked=false;
  const body=document.getElementById('be-addtask-body');
  if(body) body.style.display='none';
  _beForcedTaskCategory='';
}
function _beToggleAddTask(nameFieldId){
  const on=document.getElementById('be-addtask-on')?.checked;
  const body=document.getElementById('be-addtask-body');
  if(body) body.style.display = on ? 'flex' : 'none';
  if(on){
    // Manual tick → auto-resolve the category (clear any forced one from the chip).
    _beForcedTaskCategory='';
    // Prefill the task name from the budget name, cleaned up.
    const nm=document.getElementById(nameFieldId||'be-name')?.value||'';
    const inp=document.getElementById('be-addtask-name');
    if(inp && !inp.value.trim()){ inp.value=_taskTitleFromBudget(nm)||nm; }
    const noteVal=document.getElementById('be-note')?.value || document.getElementById('si-note')?.value || '';
    const extra=[noteVal];
    if(_beSubCtx){ extra.push(_beSubCtx.parentName||'', _beSubCtx.parentNote||'', _beSubCtx.subNote||''); }
    const cat=_resolveTaskCategory(nm, extra);
    const hint=document.getElementById('be-addtask-cat-hint');
    if(hint) hint.textContent = (cat && cat!=='General') ? `Will be filed under “${cat}”.` : 'Will be filed under “General”.';
    _beAddTaskRefreshUrlRow();
    _beAddTaskDateToggle();
  }
}
// Show the "Copy link to task" row only when the budget item's URL field has a value.
// Reads the URL field id stashed on the wrap (data-url-src).
function _beAddTaskRefreshUrlRow(){
  const wrap=document.getElementById('be-addtask-wrap');
  const row=document.getElementById('be-addtask-copyurl-row');
  if(!wrap||!row) return;
  const urlId=wrap.getAttribute('data-url-src')||'';
  const raw=urlId?(document.getElementById(urlId)?.value||'').trim():'';
  if(raw){
    row.style.display='flex';
    const dom=document.getElementById('be-addtask-copyurl-dom');
    if(dom){ try{ dom.textContent='('+_urlDomain(raw)+')'; }catch(e){ dom.textContent=''; } }
  } else {
    row.style.display='none';
  }
}
// Reflect the item's current Balance Due into the date helper. When "use item's date"
// is ticked, the manual date row hides; unticking reveals it for a custom/blank date.
// Sub-items have no balance field in their Add form, so they fall back to the parent
// category's Balance Due, stashed in _beAddTaskInheritDate.
function _beAddTaskDateToggle(){
  const use=document.getElementById('be-addtask-usedate')?.checked;
  const row=document.getElementById('be-addtask-date-row');
  if(row) row.style.display = use ? 'none' : 'block';
  const lbl=document.getElementById('be-addtask-usedate-lbl');
  if(lbl){
    const d=_beAddTaskResolveItemDate();
    lbl.textContent = d ? `Use the item's date (${fmtBudgetDate(d)})` : "Use the item's date (none set yet)";
  }
}
// Resolve the budget item's current due date for the task block, reading live from the
// host modal's own date field (data-date-src on the wrap) so a date typed AFTER the box
// was ticked is reflected. Falls back to the category modal's Balance Due, then the
// inherited parent date stashed for sub-items.
function _beAddTaskResolveItemDate(){
  const wrap=document.getElementById('be-addtask-wrap');
  const srcId=wrap?wrap.getAttribute('data-date-src'):'';
  const live=srcId?(document.getElementById(srcId)?.value||''):'';
  return live || document.getElementById('be-bal-due')?.value || _beAddTaskInheritDate || '';
}
// Read the add-task block and, if active, create + link a task to the just-saved item.
// `bid`/`sid` identify the new budget target; `balanceDue` is the item's balance date
// (fallback only — the live source field on the block wins so a date typed after ticking
// the box still carries over).
function _beCreateTaskIfRequested(bid, sid, balanceDue, budgetName){
  if(!document.getElementById('be-addtask-on')?.checked) return;
  const name=(document.getElementById('be-addtask-name')?.value||'').trim();
  if(!name) return;
  const useItemDate=document.getElementById('be-addtask-usedate')?.checked;
  const customDate=document.getElementById('be-addtask-date')?.value||'';
  const itemDate=_beAddTaskResolveItemDate() || (balanceDue||'');
  const due = useItemDate ? itemDate : customDate;
  // Category: a category explicitly chosen via "New task in [cat]" wins; otherwise
  // resolve from the budget name + notes (+ sub/parent context).
  const noteVal=document.getElementById('be-note')?.value || document.getElementById('si-note')?.value || '';
  const extra=[noteVal];
  if(_beSubCtx){ extra.push(_beSubCtx.parentName||'', _beSubCtx.parentNote||'', _beSubCtx.subNote||''); }
  const cat=_beForcedTaskCategory || _resolveTaskCategory(budgetName, extra);
  // Notes the user typed into the task block.
  const notes=(document.getElementById('be-addtask-notes')?.value||'').trim();
  // Optionally copy the budget item's URL across (row only present when a URL exists
  // and the copy box is ticked). Reads the URL field id stashed on the wrap.
  let taskUrl='';
  const copyRow=document.getElementById('be-addtask-copyurl-row');
  const copyOn=document.getElementById('be-addtask-copyurl')?.checked;
  if(copyRow && copyRow.style.display!=='none' && copyOn){
    const wrap=document.getElementById('be-addtask-wrap');
    const urlId=wrap?wrap.getAttribute('data-url-src'):'';
    const rawUrl=urlId?(document.getElementById(urlId)?.value||'').trim():'';
    if(rawUrl) taskUrl=_normalizeUrl(rawUrl);
  }
  const task={id:'cl'+Date.now()+Math.floor(Math.random()*1000),text:name,done:false,dueDate:due,category:cat,notes:notes,pinned:false,budgetId:bid,budgetSubId:sid||''};
  if(taskUrl) task.url=taskUrl;
  STATE.checklist.push(task);
  saveToStorage();
}
// "New task in [category]" → activate the add-task block, prefill, and file under cat.
function _beNewTaskInCategory(cat){
  _beForcedTaskCategory=cat||'';
  const on=document.getElementById('be-addtask-on');
  if(on){ on.checked=true; }
  const body=document.getElementById('be-addtask-body');
  if(body) body.style.display='flex';
  // Prefill the name from whichever budget name field is present.
  const nm=document.getElementById('be-name')?.value || document.getElementById('si-name')?.value || '';
  const inp=document.getElementById('be-addtask-name');
  if(inp){ if(!inp.value.trim()) inp.value=_taskTitleFromBudget(nm)||nm; inp.focus(); }
  // Show which category it'll file under.
  const hint=document.getElementById('be-addtask-cat-hint');
  if(hint) hint.textContent = cat ? `Will be filed under “${cat}”.` : '';
  _beAddTaskRefreshUrlRow();
  _beAddTaskDateToggle();
}

// Apply queued links after an Add creates the item. Runs them one at a time so each
// date-conflict prompt resolves before the next. `done` fires when all are applied.
function _beApplyQueuedLinks(bid, sid, done){
  const queue=_bePendingTaskLinks.slice();
  _bePendingTaskLinks=[];
  let idx=0;
  const next=()=>{
    if(idx>=queue.length){ if(done) done(); return; }
    const t=STATE.checklist.find(x=>x.id===queue[idx]); idx++;
    if(!t){ next(); return; }
    _linkTaskToBudgetWithDates(t, bid, sid||'', next);
  };
  next();
}

// ── The core: link a task to a Payment/sub, then reconcile dates (5 cases) ──
// task.dueDate  ↔  item.balanceDueDate (or sub.balanceDueDate). cb() runs when settled.
function _linkTaskToBudgetWithDates(task, bid, sid, cb){
  const b=STATE.budget.items.find(x=>x.id===bid);
  if(!b || !task){ if(cb)cb(); return; }
  const s=sid?(b.subItems||[]).find(x=>x.id===sid):null;
  // Clear any prior link this task had, then set the new one.
  STATE.budget.items.forEach(x=>{ if(x.checklistId===task.id) x.checklistId=''; });
  task.budgetId=bid; task.budgetSubId=sid||'';
  const target=s||b;
  const taskDate=task.dueDate||'';
  const budDate=target.balanceDueDate||'';
  const finish=()=>{ saveToStorage(); if(cb)cb(); };
  // Case 3: neither set → nothing to do.
  if(!taskDate && !budDate){ finish(); return; }
  // Case 4: identical → nothing to do.
  if(taskDate && budDate && taskDate===budDate){ finish(); return; }
  // Case 1: task has a date, budget doesn't → copy task → budget.
  if(taskDate && !budDate){ target.balanceDueDate=taskDate; finish(); return; }
  // Case 2: budget has a date, task doesn't → copy budget → task.
  if(!taskDate && budDate){ task.dueDate=budDate; finish(); return; }
  // Case 5: both set, different → ASK which to keep.
  _openDateConflict(task, target, taskDate, budDate, finish);
}

// Conflict modal (case 5): three choices — use task date, use budget date, keep apart.
let _dateConflictCtx=null;
function _openDateConflict(task, target, taskDate, budDate, cb){
  _dateConflictCtx={task, target, taskDate, budDate, cb, choice:'task'};
  const tName=(task.text||'task').replace(/</g,'&lt;');
  const gName=(target.name||'Payment').replace(/</g,'&lt;');
  const opt=(val,label)=>`<div onclick="_dcPick('${val}')" id="dc-opt-${val}" style="display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--ink);cursor:pointer;background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:10px 12px">
      <span class="dc-radio" data-v="${val}" style="width:14px;height:14px;border-radius:50%;border:1.5px solid var(--gold);flex:none;display:inline-flex;align-items:center;justify-content:center"></span>
      <span>${label}</span>
    </div>`;
  const body=`<div style="display:flex;flex-direction:column;gap:12px">
    <div style="font-size:12.5px;color:var(--muted);line-height:1.5">“<strong style="color:var(--ink)">${tName}</strong>” and <strong style="color:var(--ink)">${gName}</strong> have different dates. Which would you like to keep?</div>
    <div style="display:flex;gap:10px">
      <div style="flex:1;background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:9px;text-align:center">
        <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin-bottom:3px">Task</div>
        <div style="font-size:12.5px;font-weight:500;color:var(--ink)">${fmtBudgetDate(taskDate)}</div>
      </div>
      <div style="flex:1;background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:9px;text-align:center">
        <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin-bottom:3px">Budget balance due</div>
        <div style="font-size:12.5px;font-weight:500;color:var(--ink)">${fmtBudgetDate(budDate)}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:7px">
      ${opt('task','Use the task\u2019s date ('+fmtBudgetDate(taskDate)+') for both')}
      ${opt('budget','Use the budget\u2019s date ('+fmtBudgetDate(budDate)+') for both')}
      ${opt('keep','Keep them different')}
    </div>
  </div>`;
  openModal('Match dates?', body,
    `<button class="btn btn-primary" onclick="_dcConfirm()" style="width:100%">Apply</button>`);
  _dcPick('task');
}
function _dcPick(val){
  if(_dateConflictCtx) _dateConflictCtx.choice=val;
  ['task','budget','keep'].forEach(v=>{
    const opt=document.getElementById('dc-opt-'+v);
    const radio=opt?opt.querySelector('.dc-radio'):null;
    if(!opt||!radio) return;
    if(v===val){ opt.style.borderColor='var(--gold)'; opt.style.background='var(--parchment)'; radio.innerHTML='<span style="width:7px;height:7px;border-radius:50%;background:var(--gold)"></span>'; }
    else { opt.style.borderColor='var(--border)'; opt.style.background='var(--surface)'; radio.innerHTML=''; }
  });
}
function _dcConfirm(){
  const c=_dateConflictCtx; _dateConflictCtx=null;
  if(c){
    if(c.choice==='task'){ c.target.balanceDueDate=c.taskDate; }
    else if(c.choice==='budget'){ c.task.dueDate=c.budDate; }
    // 'keep' → leave both as-is
  }
  closeModalDirect();
  if(c && c.cb) c.cb();
}

function _taskIsLinked(i){ if(!i) return false; if(i.budgetId && STATE.budget.items.some(b=>b.id===i.budgetId)) return true; return STATE.budget.items.some(b=>b.checklistId===i.id); }
// Is a budget item linked to a checklist task at the ITEM level (not via a sub-item)?
function _itemIsLinked(b){ if(!b) return false; if(b.checklistId && STATE.checklist.some(c=>c.id===b.checklistId)) return true; return STATE.checklist.some(c=>c.budgetId===b.id && !c.budgetSubId); }
// Is a specific sub-item linked to a checklist task?
function _subIsLinked(b, s){ if(!b||!s) return false; return STATE.checklist.some(c=>c.budgetId===b.id && c.budgetSubId===s.id); }
// Task title/note mentions a deposit-type keyword (case-insensitive)
function _depositKeywordText(t){ return /\b(deposit|down\s*payment|instal{1,2}ment|retainer|minimum|initial\s+payment|up[\s-]?front\s+payment|after[\s-]?pay|pay[\s-]?in[\s-]?4|pay[\s-]?in[\s-]?four|buy[\s-]?now[\s-]?pay[\s-]?later|bnpl)\b/i.test(t||''); }
// "Soft" deposit synonyms — these ASK whether to act on the deposit or the
// balance when the task is ticked, rather than going straight to the deposit.
function _softDepositKeywordText(t){ return /\b(booking\s+fee|booking\s+deposit|security\s+deposit|bond|holding\s+fee|hold\s+fee|reservation\s+fee|save\s+the\s+date\s+fee|pre[\s-]?payment|earnest\s+money|part(?:ial)?[\s-]?payment|first\s+payment|first\s+instal{1,2}ment|advance\s+payment)\b/i.test(t||''); }
function _taskSoftDepositKeyword(c){ return !!c && _scanTaskCues(c).softDeposit; }
// Whether a task's text marks the linked item as "booked". Matches whole words:
// book, appointment, pencil in / pencil-in, pencilled/penciled in, schedule, scheduled.
function _taskBookedKeyword(t){ return /\b(book|appointment|pencil(?:led|ed)?[\s-]?in|schedule[d]?|hire[ds]?|hiring|arrange[ds]?|arranging)\b/i.test(t||''); }
// Task-object form: a "booked" keyword in the title OR the notes (mirrors the
// deposit/soft-deposit wrappers). Use this for completion-flow decisions.
function _taskBookedKeywordTask(c){ return !!c && _scanTaskCues(c).booked; }
// Whether a budget item/sub-item has a deposit configured (for badge placement).
function _placementHasItemDeposit(b){ return Number(calcBudgetDeposit(b)||0)>0 || (!b.depositFromSubs && !!b.depositDueDate) || !!b.depositFromSubs; }
function _placementHasSubDeposit(s){ return s.showDeposit || Number(s.deposit||0)>0 || !!s.depositDueDate; }
// The valid placement options for a booked task's badge, given what it links to.
// Returns an array of {value,label,sub} where value is 'item' | 'sub' | 'deposit'.
// A task links to EITHER an item (no sub) or a specific sub-item.
function _bookedPlacementOptions(b, s){
  const out=[];
  if(s){
    out.push({value:'sub', label:'The sub-item', detail:s.name});
    if(_placementHasSubDeposit(s)) out.push({value:'deposit', label:'The deposit', detail:`${s.name} deposit`});
  } else {
    out.push({value:'item', label:'The item', detail:b.name});
    if(b.subItems && b.subItems.length) out.push({value:'sub', label:'A sub-item', detail:b.subItems[0].name, subId:b.subItems[0].id});
    if(_placementHasItemDeposit(b)) out.push({value:'deposit', label:'The deposit', detail:'item deposit'});
  }
  return out;
}
// Resolve where a booked task's badge should sit: stored choice if valid, else default.
// Returns 'item' | 'sub' | 'deposit'. For sub-linked tasks the default is 'sub';
// for item-linked tasks the default is 'item'. A stored 'deposit' only applies when
// the relevant deposit exists; otherwise we fall back to the default.
function _resolveBookedPlacement(task, b, s){
  const stored = task && task.bookedBadgePlacement;
  if(s){
    if(stored==='deposit' && _placementHasSubDeposit(s)) return 'deposit';
    return 'sub';
  }
  if(stored==='deposit' && _placementHasItemDeposit(b)) return 'deposit';
  if(stored==='sub' && b.subItems && b.subItems.length) return 'sub';
  return 'item';
}
// "Buy"/purchase keywords — used to remind the user to link a task to the budget.
// Whole-word match, so every inflection a real task actually uses has to be listed
// explicitly: "pay" does NOT cover "payment"/"payments"/"paid"/"paying", which is why
// "Final payment" and "Outstanding balance" registered no money cue at all and only ever
// reached the budget prompt by resembling an item's NAME (v166). Longer forms come first
// purely for readability — \b anchors make the order behaviourally irrelevant.
// Deliberately absent: "bill", "charge", "quote". "Call Bill about the cars" and "Bill and
// Mary dietary needs" are ordinary tasks in an app full of guest names, and "Charge the
// camera batteries" is not a cost. "quote" adds nothing while "get" is already listed.
function _taskBuyKeywordText(t){ return /\b(buy|buying|purchase|order|payments|payment|paying|paid|pays|pay\s+for|pay|balance|owing|owed|fees|fee|refund|hire|rent|book|reserve|get|shop\s+for|splurge\s+on|deposit\s+for|put\s+down\s+for|invoice)\b/i.test(t||''); }
function _taskBuyKeyword(c){ return !!c && _scanTaskCues(c).buy; }
function _taskDepositKeyword(c){ return !!c && _scanTaskCues(c).deposit; }
// Strong OR soft deposit keyword — used for chain placement (both move the chain
// to the deposit row); the tick routing distinguishes the two separately.
function _taskAnyDepositKeyword(c){ return _taskDepositKeyword(c) || _taskSoftDepositKeyword(c); }
// ── Unified cue scan (Streamline 04) ────────────────────────────────────────
// Classifies a task's title + notes ONCE into a tag set, instead of each helper
// re-running its own regex over both fields. The text-level *KeywordText helpers
// above remain the single regex source of truth (so matching is byte-identical
// to before); this just calls each once and caches the result on the task object
// via a non-enumerable key, keyed to the current text+notes so edits invalidate it.
// Overlaps ("book" is both buy and booked; "hire" too) are intentional here —
// one word can legitimately light up two tags.
function _scanTaskCues(task){
  if(!task) return {buy:false,booked:false,deposit:false,softDeposit:false,anyDeposit:false};
  const sig=`${task.text||''}\u0000${task.notes||''}`;
  const cached=task.__cueCache;
  if(cached && cached.sig===sig) return cached.cues;
  const buy=_taskBuyKeywordText(task.text)||_taskBuyKeywordText(task.notes);
  const booked=_taskBookedKeyword(task.text)||_taskBookedKeyword(task.notes);
  const deposit=_depositKeywordText(task.text)||_depositKeywordText(task.notes);
  const softDeposit=_softDepositKeywordText(task.text)||_softDepositKeywordText(task.notes);
  const cues={buy,booked,deposit,softDeposit,anyDeposit:deposit||softDeposit};
  try{ Object.defineProperty(task,'__cueCache',{value:{sig,cues},writable:true,configurable:true,enumerable:false}); }
  catch(e){ /* frozen object — fall through, still returns correct cues */ }
  return cues;
}
// "Already a deposit" test for a SUB-ITEM NAME — used only to skip the
// add-a-deposit prompt. Matches strong + soft deposit synonyms, but deliberately
// EXCLUDES the installment and BNPL families so those can be built as their own
// multi-payment sub-items (an installment/BNPL option alongside deposits).
function _nameIsDepositForAddPrompt(name){
  const t=String(name||'');
  if(!t.trim()) return false;
  // Strong deposit words, minus installment + BNPL families.
  const strong=/\b(deposit|down\s*payment|retainer|minimum|initial\s+payment|up[\s-]?front\s+payment)\b/i;
  // Soft deposit synonyms (same set used elsewhere).
  const soft=/\b(booking\s+fee|booking\s+deposit|security\s+deposit|bond|holding\s+fee|hold\s+fee|reservation\s+fee|save\s+the\s+date\s+fee|pre[\s-]?payment|earnest\s+money|part(?:ial)?[\s-]?payment|first\s+payment|advance\s+payment)\b/i;
  return strong.test(t) || soft.test(t);
}
// Find the checklist task linked to an ITEM (item-level link, either direction)
function _itemLinkedTask(b){ if(!b) return null; let t=b.checklistId?STATE.checklist.find(c=>c.id===b.checklistId):null; if(!t) t=STATE.checklist.find(c=>c.budgetId===b.id && !c.budgetSubId); return t||null; }
// Find the checklist task linked to a specific SUB-ITEM
function _subLinkedTask(b, s){ if(!b||!s) return null; return STATE.checklist.find(c=>c.budgetId===b.id && c.budgetSubId===s.id)||null; }
// All checklist tasks linked to a target (item-level or a specific sub-item). Item-level
// includes both the reverse link (b.checklistId) and any tasks whose budgetId points at
// the item with no sub-id. De-duplicated, in checklist order.
function _tasksLinkedToTarget(b, s){
  if(!b) return [];
  let ids=new Set();
  if(s){
    STATE.checklist.forEach(c=>{ if(c.budgetId===b.id && c.budgetSubId===s.id) ids.add(c.id); });
  } else {
    if(b.checklistId) ids.add(b.checklistId);
    STATE.checklist.forEach(c=>{ if(c.budgetId===b.id && !c.budgetSubId) ids.add(c.id); });
  }
  return STATE.checklist.filter(c=>ids.has(c.id));
}
// Whether the chain for an item should sit on its deposit row instead of the name
function _itemChainOnDeposit(b){ const t=_itemLinkedTask(b); if(!t||!_taskAnyDepositKeyword(t)) return false; const dep=calcBudgetDeposit(b); return (Number(dep||0)>0) || (!b.depositFromSubs && !!b.depositDueDate) || !!b.depositFromSubs; }
// Whether the chain for a sub-item should sit on its deposit row instead of the name
function _subChainOnDeposit(b, s){ const t=_subLinkedTask(b, s); if(!t||!_taskAnyDepositKeyword(t)) return false; return s.showDeposit || Number(s.deposit||0)>0 || !!s.depositDueDate; }
// Does the target item/sub-item have a deposit at all?
function _targetHasDeposit(b, s){
  if(s) return s.showDeposit || Number(s.deposit||0)>0 || !!s.depositDueDate;
  return Number(calcBudgetDeposit(b)||0)>0 || (!b.depositFromSubs && !!b.depositDueDate) || !!b.depositFromSubs;
}
function _targetDepositPaid(b, s){ return s ? !!s.depositPaid : !!b.depositPaid; }
// Classify the linked target's amount as a flat (editable) number or a computed one
// (per-head / per-item / rolled-up from sub-items). Returns the current amount, the
// balance due date, and a reason string when computed.
function _targetAmountInfo(b, s){
  if(s){
    if(s.perHead) return {computed:true, reason:'calculated per head', amount:getSubItemAmount(s), balanceDue:s.balanceDueDate||''};
    if(s.perItem) return {computed:true, reason:'calculated per item', amount:getSubItemAmount(s), balanceDue:s.balanceDueDate||''};
    return {computed:false, reason:'', amount:Number(s.amount||0), balanceDue:s.balanceDueDate||''};
  }
  if(b.totalFromSubs) return {computed:true, reason:'rolled up from sub-items', amount:calcBudgetItemTotal(b), balanceDue:b.balanceDueDate||''};
  return {computed:false, reason:'', amount:Number(b.total||0), balanceDue:b.balanceDueDate||''};
}
// Build a small detail box (due date + amount + category/notes) for a budget item/sub-item
function _budgetDetailBox(b, s){
  const cal='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const cash='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></svg>';
  const rows=[];
  const due = s ? (s.balanceDueDate||'') : (b.balanceDueDate||'');
  if(due) rows.push(`<span>${cal}Due ${fmtBudgetDate(due)}</span>`);
  const amt = s ? getSubItemAmount(s) : calcBudgetItemTotal(b);
  if(Number(amt)>0) rows.push(`<span>${cash}${fmt(amt)}</span>`);
  const note = s ? (s.note||'') : (b.note||'');
  if(!rows.length && !note) return '';
  const metaLine = rows.length?`<div style="font-size:11.5px;color:var(--muted);display:flex;flex-wrap:wrap;gap:5px 14px;align-items:center">${rows.join('')}</div>`:'';
  const noteLine = note?`<div style="font-size:11.5px;color:var(--muted);font-style:italic;margin-top:3px">“${note}”</div>`:'';
  return `<div style="background:var(--surface);border-radius:8px;padding:9px 11px;margin:8px 0 0">${metaLine}${noteLine}</div>`;
}
// Build a small detail box for a checklist task (due date + linked budget amount + category/notes)
function _taskDetailBox(t){
  if(!t) return '';
  const cal='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const cash='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></svg>';
  const tag='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const rows=[];
  if(t.dueDate) rows.push(`<span>${cal}Due ${fmtBudgetDate(t.dueDate)}</span>`);
  let amt=0;
  if(t.budgetId){ const lb=STATE.budget.items.find(x=>x.id===t.budgetId); if(lb){ const ls=t.budgetSubId?lb.subItems?.find(x=>x.id===t.budgetSubId):null; amt= ls?getSubItemAmount(ls):calcBudgetItemTotal(lb); } }
  if(Number(amt)>0) rows.push(`<span>${cash}${fmt(amt)}</span>`);
  if(t.category) rows.push(`<span>${tag}${t.category}</span>`);
  if(!rows.length && !t.notes) return '';
  const metaLine = rows.length?`<div style="font-size:11.5px;color:var(--muted);display:flex;flex-wrap:wrap;gap:5px 14px;align-items:center">${rows.join('')}</div>`:'';
  const noteLine = t.notes?`<div style="font-size:11.5px;color:var(--muted);font-style:italic;margin-top:3px">“${t.notes}”</div>`:'';
  return `<div style="background:var(--surface);border-radius:8px;padding:9px 11px;margin:8px 0 0">${metaLine}${noteLine}</div>`;
}
// ── Visual row previews for link pop-ups ─────────────────────────────────────
// Replicate how the row appears in its native view, reflecting live state.
function _cbMini(checked, sz, animId){
  const s=sz||16;
  const idAttr = animId ? ` id="${animId}"` : '';
  const onCls = checked ? ' cbm-on' : '';
  // Always render the box + checkmark; unchecked hides the tick via dashoffset (set in CSS),
  // checked shows it. The cbm class lets the confirm animation tick it on.
  const border = checked ? `background:var(--gold);border:1.5px solid var(--gold)` : `border:1.5px solid var(--gold)`;
  return `<span${idAttr} class="cbm${onCls}" style="width:${s}px;height:${s}px;border-radius:5px;${border};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="${Math.round(s*0.62)}" height="${Math.round(s*0.62)}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="${checked?'':'opacity:1'}"><polyline class="cbm-line" points="20 6 9 17 4 12"/></svg></span>`;
}
function _dueMini(dateStr, paid){
  if(!dateStr) return '';
  const cls=dueDateClass(dateStr, paid);
  const lbl=cls==='date-overdue'?'Overdue ':'Due ';
  return `<span class="${cls}" style="font-size:10px;white-space:nowrap">${lbl}${fmtBudgetDate(dateStr)}</span>`;
}
// Preview of a checklist task row, as it looks in the checklist.
function _taskPreviewCard(t, animate){
  if(!t) return '';
  const rowId = animate ? ' id="cbm-target-row"' : '';
  const cbId = animate ? 'cbm-target' : '';
  return `<div style="margin:8px 0 0">
    <div style="font-size:10px;color:var(--gold-deep);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">In your checklist</div>
    <div${rowId} style="background:var(--cream);border:1px solid var(--border);border-radius:9px;padding:9px 11px;display:flex;align-items:center;gap:9px">
      ${_cbMini(!!t.done,16,cbId)}
      <span style="flex:1;min-width:0;font-size:13px;color:var(--ink);${t.done?'text-decoration:line-through;opacity:.6':''}">${t.text}</span>
      ${_dueMini(t.dueDate, !!t.done)}
    </div>
  </div>`;
}
// Richer preview that mirrors how the task actually appears in the checklist:
// text + chain icon, due-date label, italic notes, and the budget badge.
function _taskChecklistPreview(t){
  if(!t) return '';
  const budgetItem = t.budgetId ? STATE.budget.items.find(b=>b.id===t.budgetId) : null;
  const budgetSubItem = (budgetItem && t.budgetSubId) ? budgetItem.subItems?.find(s=>s.id===t.budgetSubId) : null;
  // Budget badge — same logic as checkItemHtml.
  let budgetBadge='';
  if(budgetItem){
    const name = budgetSubItem ? `${budgetItem.name} › ${budgetSubItem.name}` : budgetItem.name;
    const total = budgetSubItem ? getSubItemAmount(budgetSubItem) : calcBudgetItemTotal(budgetItem);
    const isPaid = budgetSubItem ? !!budgetSubItem.paid : !!budgetItem.paid;
    const remaining = budgetSubItem
      ? Math.max(0, getSubItemAmount(budgetSubItem) - (budgetSubItem.depositPaid ? Number(budgetSubItem.deposit||0) : 0))
      : (t.budgetId ? outstandingForItem(t.budgetId) : 0);
    const icon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
    if(!total) budgetBadge = `<span style="font-size:11px;color:var(--muted);display:inline-flex;align-items:center;gap:3px">${icon}${name}</span>`;
    else if(isPaid) budgetBadge = `<span style="font-size:11.5px;color:var(--green);font-weight:500;display:inline-flex;align-items:center;gap:3px">${icon}${name} — ${fmt(total)} paid</span>`;
    else budgetBadge = `<span style="font-size:11.5px;color:var(--gold-deep);font-weight:500;display:inline-flex;align-items:center;gap:3px">${icon}${name} — ${fmt(remaining)} remaining of ${fmt(total)}</span>`;
  }
  // Budget due-date urgency badge (only when not done).
  let budgetDueBadge='';
  if(budgetItem && !t.done){
    // Linked to a specific sub-item → use only its due date, no parent fallback.
    const dueDate = t.budgetSubId ? (budgetSubItem?.balanceDueDate) : budgetItem.balanceDueDate;
    if(dueDate){
      const today=new Date(); today.setHours(0,0,0,0);
      const due=new Date(dueDate+'T00:00:00');
      const diff=(due-today)/86400000;
      if(diff<0) budgetDueBadge=`<span class="date-overdue" style="font-size:11px">Payment overdue · ${fmtBudgetDate(dueDate)}</span>`;
      else if(diff<=_budgetDueWindow()) budgetDueBadge=`<span class="date-red" style="font-size:11px">Payment due ${fmtBudgetDate(dueDate)}</span>`;
    }
  }
  const linkIcon = _taskIsLinked(t) ? _chainSpan('task',12,t.id) : '';
  const dueLine = (t.dueDate || budgetDueBadge)
    ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:3px;align-items:center">${t.dueDate?`<span class="check-meta">${dueDateLabel(t.dueDate,t.done,'COMPLETE')}</span>`:''}${budgetDueBadge}</div>`
    : '';
  const notesLine = t.notes ? `<div style="font-size:12px;color:var(--muted);margin-top:3px;font-style:italic">${t.notes}</div>` : '';
  const badgeLine = budgetBadge ? `<div style="margin-top:4px">${budgetBadge}</div>` : '';
  return `<div style="margin:8px 0 0">
    <div style="font-size:10px;color:var(--gold-deep);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">In your checklist</div>
    <div style="background:var(--cream);border:1px solid var(--border);border-radius:9px;padding:10px 12px;display:flex;align-items:flex-start;gap:9px">
      ${_cbMini(!!t.done,18)}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:13.5px;color:var(--ink);font-weight:500;${t.done?'text-decoration:line-through;opacity:.6':''}">${t.text}</span>
          ${linkIcon}
        </div>
        ${dueLine}
        ${notesLine}
        ${badgeLine}
      </div>
    </div>
  </div>`;
}
// Preview of a budget item / sub-item / sub-item+deposit row, as it looks in budget.
function _budgetPreviewCard(b, s, kind){
  if(!b) return '';
  const head=`<div style="font-size:10px;color:var(--gold-deep);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">In your budget</div>`;
  if(s){
    const sAmt=getSubItemAmount(s);
    const sDep=Number(s.deposit||0);
    const isDep = kind==='deposit';
    const depUnpaidTag = kind==='depUnpaid' ? `<span style="font-size:9.5px;font-weight:600;color:var(--gold-deep);background:var(--chip);border-radius:20px;padding:2px 7px;letter-spacing:.02em">unpaid</span>` : '';
    const showDep = isDep || kind==='depUnpaid' || s.showDeposit || sDep>0 || !!s.depositDueDate;
    const depRow = showDep ? `<div style="display:flex;align-items:center;gap:8px;margin-top:6px;padding-top:6px;border-top:1px dashed var(--border)">
        ${_cbMini(!!s.depositPaid,13, isDep?'cbm-target':'')}
        <span style="font-size:11px;color:var(--gold-deep)">Deposit</span>${depUnpaidTag}
        ${_dueMini(s.depositDueDate, !!s.depositPaid)}
        <span style="margin-left:auto;font-size:12px;font-weight:600;color:var(--gold-deep);font-family:'Inter',sans-serif">${sDep?fmt(sDep):'—'}</span>
      </div>`:'';
    return `<div style="margin:8px 0 0">${head}
      <div style="background:var(--parchment);border:1px solid var(--border);border-radius:9px;padding:6px 11px;display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="font-size:12px;font-weight:700;color:#5C3D2E;text-transform:uppercase;letter-spacing:.06em">${b.name}</span>
      </div>
      <div id="cbm-target-row" style="background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:8px 11px;margin-left:14px">
        <div style="display:flex;align-items:center;gap:8px">
          ${_cbMini(!!s.paid,13, isDep?'':'cbm-target')}
          <span style="font-size:12px;font-weight:500;color:var(--ink)">${s.name}</span>
          ${_dueMini(s.balanceDueDate, !!s.paid)}
          <span style="margin-left:auto;font-size:12px;font-weight:600;color:var(--gold-deep);font-family:'Inter',sans-serif">${sAmt?fmt(sAmt):'—'}</span>
        </div>
        ${depRow}
      </div>
    </div>`;
  }
  // Item-level
  const total=calcBudgetItemTotal(b);
  const dep=calcBudgetDeposit(b);
  const isDep = kind==='deposit';
  const depUnpaidTag = kind==='depUnpaid' ? `<span style="font-size:9.5px;font-weight:600;color:var(--gold-deep);background:var(--chip);border-radius:20px;padding:2px 7px;letter-spacing:.02em">unpaid</span>` : '';
  const showDep = isDep || kind==='depUnpaid' || dep>0 || !!b.depositDueDate;
  const depRow = showDep ? `<div style="display:flex;align-items:center;gap:8px;margin-top:6px;padding-top:6px;border-top:1px dashed var(--border)">
      ${_cbMini(!!b.depositPaid,13, isDep?'cbm-target':'')}
      <span style="font-size:11px;color:var(--gold-deep)">Deposit</span>${depUnpaidTag}
      ${_dueMini(b.depositFromSubs?'':b.depositDueDate, !!b.depositPaid)}
      <span style="margin-left:auto;font-size:12px;font-weight:600;color:var(--gold-deep);font-family:'Inter',sans-serif">${dep?fmt(dep):'—'}</span>
    </div>`:'';
  return `<div style="margin:8px 0 0">${head}
    <div id="cbm-target-row" style="background:var(--parchment);border:1px solid var(--border);border-radius:9px;padding:8px 11px">
      <div style="display:flex;align-items:center;gap:8px">
        ${_cbMini(!!b.paid,14, isDep?'':'cbm-target')}
        <span style="font-size:12px;font-weight:700;color:#5C3D2E;text-transform:uppercase;letter-spacing:.06em">${b.name}</span>
        ${_dueMini(b.balanceDueDate, !!b.paid)}
        <span style="margin-left:auto;font-size:13px;font-weight:600;color:var(--gold-deep);font-family:'Inter',sans-serif">${total?fmt(total):'—'}</span>
      </div>
      ${depRow}
    </div>
  </div>`;
}
let _mbDateMode='today'; // 'today' | 'prev' | 'custom' — shared date state for mark popups
let _mbPrevDate='';
let _mbCustomDate=''; // ISO date chosen via "Choose another date…"
// Builds the "Record date as" control: Today / [prev] segments plus a
// "Choose another date…" link that, once used, appears as a third selected chip.
// `prevDate` may be '' (then only Today shows, plus the custom-date link).
function _recordDateToggleHtml(prevDate){
  const fmtPrev = prevDate ? fmtBudgetDate(prevDate) : '';
  const seg = `<span id="mb-seg" style="display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <button type="button" id="mbseg-today" onclick="_setMbDateMode('today')" style="font-size:12px;padding:6px 13px;border:none;cursor:pointer;background:var(--gold);color:#fff">Today</button>
      ${prevDate?`<button type="button" id="mbseg-prev" onclick="_setMbDateMode('prev')" style="font-size:12px;padding:6px 13px;border:none;cursor:pointer;border-left:1px solid var(--border);background:transparent;color:var(--muted)">${fmtPrev}</button>`:''}
    </span>`;
  return `<div style="background:var(--surface);border-radius:8px;padding:8px 11px;margin-top:10px;display:flex;flex-direction:column;gap:9px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <span style="font-size:12px;color:var(--ink)">Record date as</span>${seg}
      </div>
      <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end">
        <span id="mb-custom-lead" style="font-size:11.5px;color:var(--muted)">Or pick a date</span>
        <input type="date" id="mb-custom-input" class="form-input" style="width:auto;font-size:12px;padding:5px 9px;height:auto" onchange="_setMbCustomDate(this.value)"/>
      </div>
    </div>`;
}
function _setMbCustomDate(val){
  if(!val){ // cleared → fall back to today
    _mbCustomDate=''; if(_mbDateMode==='custom') _mbDateMode='today';
    _refreshMbSeg(); return;
  }
  _mbCustomDate=val; _mbDateMode='custom';
  const inp=document.getElementById('mb-custom-input'); if(inp && inp.value!==val) inp.value=val;
  _refreshMbSeg();
}
function _refreshMbSeg(){
  const on='background:var(--gold);color:#fff', off='background:transparent;color:var(--muted)';
  const t=document.getElementById('mbseg-today'), p=document.getElementById('mbseg-prev');
  if(t) t.style.cssText=`font-size:12px;padding:6px 13px;border:none;cursor:pointer;${_mbDateMode==='today'?on:off}`;
  if(p) p.style.cssText=`font-size:12px;padding:6px 13px;border:none;cursor:pointer;border-left:1px solid var(--border);${_mbDateMode==='prev'?on:off}`;
  // Highlight the lead text when the picked date is the active choice.
  const lead=document.getElementById('mb-custom-lead');
  const inp=document.getElementById('mb-custom-input');
  if(_mbDateMode==='custom' && _mbCustomDate){
    if(lead){ lead.textContent='Using this date →'; lead.style.color='var(--gold-deep)'; lead.style.fontWeight='600'; }
    if(inp){ inp.style.borderColor='var(--gold)'; }
  } else {
    if(lead){ lead.textContent='Or pick a date'; lead.style.color='var(--muted)'; lead.style.fontWeight='400'; }
    if(inp){ inp.style.borderColor='var(--border)'; }
  }
}
function _maybeAskDeposit(b, s, nowDone, task){
  if(!_targetHasDeposit(b, s)){
    // No deposit set up yet. If a deposit-keyword task is being checked done,
    // offer to add a deposit — for a sub-item, or now also at item level.
    if(nowDone && task && !task._noAskAddDeposit && !(STATE.settings && STATE.settings.hideAddDepositPrompt)){
      if(s && !_nameIsDepositForAddPrompt(s.name)) _askAddSubDeposit(b, s, task);
      else if(!s && !_nameIsDepositForAddPrompt(b.name) && !b.depositFromSubs) _askAddSubDeposit(b, null, task);
    }
    return;
  }
  if(_targetDepositPaid(b, s)===nowDone) return; // already in the desired state
  _depReturnPage=_popupOrigin;
  const name = s ? `${b.name} › ${s.name}` : b.name;
  const verb = nowDone ? 'mark the deposit as paid' : 'un-mark the deposit';
  // Date toggle when marking paid and a previous deposit paid date is remembered
  const prevDate = s ? (s.depositPaidDate||'') : (b.depositPaidDate||'');
  const today=_todayISO();
  const showDateToggle = nowDone;
  _mbPrevDate = (prevDate && prevDate!==today) ? prevDate : '';
  _mbDateMode = 'today'; _mbCustomDate='';
  let dateToggle = showDateToggle ? _recordDateToggleHtml(_mbPrevDate) : '';
  const body = `<div style="font-size:13px;line-height:1.5;color:var(--ink)">Do you also want to ${verb} for <strong>${name}</strong>?</div>${_budgetPreviewCard(b, s, 'deposit')}${dateToggle}`;
  const yesLabel = nowDone ? 'Mark deposit paid' : 'Un-mark deposit';
  const footer = `<button class="btn btn-outline btn-sm" onclick="_skipThenPlacement()">Skip</button>
    <button class="btn btn-primary btn-sm" onclick="${nowDone?`_animConfirmThenApply(()=>_applyDepositSync('${b.id}','${s?s.id:''}',true),'on')`:`_animConfirmThenApply(()=>_applyDepositSync('${b.id}','${s?s.id:''}',false),'off')`}">${yesLabel}</button>`;
  openModal(nowDone?'Also mark deposit paid?':'Also un-mark deposit?', body, footer);
}

// ── Add-a-deposit prompt for a sub-item that has none ────────────────────────
// Fired when a deposit-keyword task is checked and its linked sub-item has no
// deposit. A toggle (default No) greys the fields; flipping to Yes makes them
// live and prepopulated (today's date + any $amount found in the task).
let _addDepCtx=null;
// Pull the first $amount out of a string (e.g. "Pay cake minimum $200" → 200).
function _extractDollarAmount(str){
  if(!str) return 0;
  const m=String(str).match(/\$\s?([\d,]+(?:\.\d{1,2})?)/);
  if(!m) return 0;
  return Number(m[1].replace(/,/g,''))||0;
}
// True if the string contains a $amount of at least 1 (ignores a bare "$" with no digits).
function _hasDollarAmount(str){ return _extractDollarAmount(str) >= 1; }
// Find every $amount in a string with the word that immediately precedes/follows it,
// so we can tell a "deposit" amount apart from a "balance" amount.
function _extractLabeledAmounts(str){
  const out=[]; if(!str) return out;
  const re=/(\w+[\s-]?)?\$\s?([\d,]+(?:\.\d{1,2})?)(\s+\w+)?/gi;
  let m;
  while((m=re.exec(String(str)))!==null){
    const before=(m[1]||'').toLowerCase();
    const after=(m[3]||'').toLowerCase();
    const ctx=before+' '+after;
    const amt=Number(m[2].replace(/,/g,''))||0;
    let kind='plain';
    if(/\b(deposit|down\s*payment|instal{1,2}ment|retainer|minimum|initial|up[\s-]?front)\b/.test(ctx)) kind='deposit';
    else if(/\b(balance|remainder|remaining|final|rest|outstanding)\b/.test(ctx)) kind='balance';
    out.push({amount:amt, kind});
  }
  return out;
}
// The balance/total amount to suggest: a "balance"-labelled amount wins; otherwise
// the first non-deposit amount. A deposit-labelled amount is never used as the balance.
function _suggestBalanceAmount(text, notes){
  const all=[..._extractLabeledAmounts(text), ..._extractLabeledAmounts(notes)];
  if(!all.length) return 0;
  const bal=all.find(a=>a.kind==='balance'); if(bal) return bal.amount;
  const plain=all.find(a=>a.kind==='plain'); if(plain) return plain.amount;
  return 0;
}
// The deposit amount to suggest: a "deposit"-labelled amount, else 0.
function _suggestDepositAmount(text, notes){
  const all=[..._extractLabeledAmounts(text), ..._extractLabeledAmounts(notes)];
  const dep=all.find(a=>a.kind==='deposit');
  return dep?dep.amount:0;
}
// Suggest a budget item / sub-item name from a task title by stripping a leading
// action verb (Order, Book, Buy, Pay, Get…) and any trailing $amount/keyword tail.
function _suggestNameFromTask(text){
  let t=String(text||'').trim();
  if(!t) return '';
  // Drop everything from the first $amount onward (e.g. "Slippers $480 balance").
  t=t.replace(/\s*\$\s?[\d,]+(?:\.\d{1,2})?.*$/,'').trim();
  // Strip a leading action verb + optional article.
  t=t.replace(/^(order|book|buy|purchase|pay|pay\s+for|get|arrange|organise|organize|hire|reserve|schedule|confirm|finalise|finalize|send|choose|pick|select|find|sort\s+out)\s+(the\s+|a\s+|an\s+|our\s+|my\s+)?/i,'');
  // Trim trailing punctuation/connectors.
  t=t.replace(/[\s,;:–—-]+$/,'').replace(/^[\s,;:]+/,'').trim();
  // Capitalize the first letter for a tidy suggestion.
  if(t) t=t.charAt(0).toUpperCase()+t.slice(1);
  return t;
}
// Build a checklist-task title from a budget item/sub-item NAME for the link flows.
// Prepends "Purchase" so e.g. "Personalised gift boxes" → "Purchase personalised gift
// boxes". If the name already begins with a recognised action verb (Book, Order, Pay,
// Hire…), it's left as-is so we don't get "Purchase book venue".
const _TASK_LEAD_VERB=/^(purchase|buy|order|book|pay|get|arrange|organise|organize|hire|reserve|schedule|confirm|finalise|finalize|send|choose|pick|select|find|sort\s+out|set\s+up|sort|plan|design|build|make|prepare|sign|review|email|call|contact|research|compare|sample|fit|trial|collect|return|cancel|deposit)\b/i;
// Hire-family trigger words: if the name contains one of these (as a whole word), the
// task is prefixed "Hire" instead of "Purchase" (e.g. "Linen rental" → "Hire linen").
const _TASK_HIRE_WORDS=/\b(hire|rent|rental|lease|loan)\b/i;
// A trailing hire-word (optionally bracketed/punctuated) is stripped so the prefix reads
// cleanly: "...Speaker Hire" → "Hire ...Speaker"; "Cocktail glasses (rental)" → "Hire cocktail glasses".
const _TASK_HIRE_TRAIL=/[\s,;:.\-–—]*\(?\s*(hire|rent|rental|lease|loan)\s*\)?[\s,;:.\-–—]*$/i;
function _taskTitleFromBudget(name){
  let t=String(name||'').trim();
  if(!t) return '';
  // Tidy trailing punctuation.
  t=t.replace(/[\s,;:–—-]+$/,'').trim();
  // Lower-case the first letter for a natural sentence ("...personalised gift boxes"),
  // but leave acronyms / all-caps starts intact ("JBL ...", "DJ ..." stay as written).
  const _lcFirst=s=>{
    if(!s) return s;
    const first=s.charAt(0), second=s.charAt(1);
    // Keep as-is when the leading token looks like an acronym (e.g. "JBL", "PA", "DJ"):
    // first char is a letter and the second char is also upper-case.
    if(/[A-Z]/.test(first) && /[A-Z]/.test(second)) return s;
    return first.toLowerCase()+s.slice(1);
  };
  if(_TASK_LEAD_VERB.test(t)){
    // Already action-led — keep wording, just ensure a tidy leading capital.
    return t.charAt(0).toUpperCase()+t.slice(1);
  }
  if(_TASK_HIRE_WORDS.test(t)){
    // It's a hire/rental — prefix "Hire" and strip any trailing hire-word.
    let core=t.replace(_TASK_HIRE_TRAIL,'').trim();
    if(!core) core=t; // safety: name was nothing but a hire-word
    return 'Hire '+_lcFirst(core);
  }
  // Prepend "Purchase " with the item text lower-cased at the front so it reads as a
  // natural sentence ("Purchase personalised gift boxes").
  return 'Purchase '+_lcFirst(t);
}
// ── Smart budget-link suggestion ─────────────────────────────────────────────
// Scores budget items and sub-items against a task's text by shared meaningful
// words. Action verbs and stopwords are ignored; light stemming lets "flowers"
// match "florals" and "cater" match "catering". Returns the best match (or null).
const _BL_STOP=new Set(['the','a','an','and','or','for','to','of','our','my','with','in','on','at','by','from','this','that','these','those','is','are','be','book','order','buy','purchase','pay','get','arrange','organise','organize','hire','reserve','schedule','confirm','finalise','finalize','send','choose','pick','select','find','sort','out','deposit','balance','final','remaining','payment','fee','cost','price','amount','due','date','day']);
// Domain synonym clusters: each listed word normalises to a shared canonical token
// so related words match each other (e.g. "suite"/"hotel"/"room" → "accom", which
// "accommodation" also stems to). Whole-word exact matches only, applied before the
// prefix/suffix rules. Conflicts resolved deliberately: "band" → rings (wedding band),
// not music; "suit" → attire stays distinct from "suite" → accommodation.
const _BL_SYN={
  // Accommodation
  accommodation:'accom', accom:'accom', suite:'accom', hotel:'accom', room:'accom',
  rooms:'accom', lodging:'accom', lodgings:'accom', airbnb:'accom', villa:'accom',
  resort:'accom', motel:'accom', cabin:'accom', stay:'accom',
  // Venue
  venue:'venue', reception:'venue', hall:'venue', ballroom:'venue', location:'venue', site:'venue',
  // Catering / food
  catering:'cater', caterer:'cater', cater:'cater', food:'cater', meal:'cater',
  meals:'cater', menu:'cater', dinner:'cater', banquet:'cater',
  // Cake / dessert
  cake:'cake', cakes:'cake', dessert:'cake', desserts:'cake', patisserie:'cake', baker:'cake', bakery:'cake',
  // Flowers
  flowers:'flower', flower:'flower', floral:'flower', florals:'flower', florist:'flower',
  bouquet:'flower', bouquets:'flower', posy:'flower', centrepiece:'flower', centerpiece:'flower',
  // Music / entertainment
  music:'music', dj:'music', entertainment:'music', musician:'music', musicians:'music',
  // Photo
  photography:'photo', photographer:'photo', photo:'photo', photos:'photo',
  // Video
  videography:'video', videographer:'video', video:'video', film:'video', cinematography:'video',
  // Attire
  dress:'attire', gown:'attire', suit:'attire', tuxedo:'attire', tux:'attire', attire:'attire', outfit:'attire',
  // Rings / jewellery (band kept here, not music)
  ring:'ring', rings:'ring', band:'ring', bands:'ring', jeweller:'ring', jeweler:'ring',
  jewellery:'ring', jewelry:'ring',
  // Transport
  transport:'transport', car:'transport', cars:'transport', limo:'transport',
  limousine:'transport', shuttle:'transport',
  // Invitations / stationery
  invitations:'invite', invitation:'invite', invites:'invite', invite:'invite', stationery:'invite', stationer:'invite',
  // Hair & makeup / beauty
  makeup:'beauty', hair:'beauty', beauty:'beauty', stylist:'beauty', glam:'beauty'
};
function _blStem(w){
  w=w.toLowerCase().replace(/[^a-z0-9]/g,'');
  if(!w) return w;
  // Synonym normalisation first (whole-word). Falls through to the rules below when
  // the word isn't a known synonym.
  if(_BL_SYN[w]) return _BL_SYN[w];
  if(w.length<4) return w;
  // Normalise a few wedding-domain pairs, then strip common suffixes.
  w=w.replace(/^floral.*$/,'flower').replace(/^flori.*$/,'flower');
  w=w.replace(/^cater.*$/,'cater');
  w=w.replace(/^photograph.*$/,'photo').replace(/^photog.*$/,'photo');
  w=w.replace(/^videograph.*$/,'video').replace(/^cinematograph.*$/,'video');
  w=w.replace(/^stationer.*$/,'station').replace(/^invitation.*$/,'invite').replace(/^invit.*$/,'invite');
  w=w.replace(/^beaut.*$/,'beauty').replace(/^makeup$/,'makeup').replace(/^make$/,'makeup');
  w=w.replace(/^accomm.*$/,'accom').replace(/^transport.*$/,'transport');
  w=w.replace(/^ring.*$/,'ring').replace(/^band.*$/,'ring').replace(/^gift.*$/,'gift').replace(/^favour.*$/,'favour').replace(/^favor.*$/,'favour');
  // Plurals first ("rings"→"ring", "dresses"→"dress"), then -ing/-ed only when the
  // remaining stem stays long enough to be meaningful (so "ring" isn't gutted to "r").
  w=w.replace(/(ies)$/,'y').replace(/(ses)$/,'s').replace(/([^s])s$/,'$1');
  if(w.length>=6) w=w.replace(/(ing)$/,'');
  if(w.length>=5) w=w.replace(/(ed)$/,'');
  return w;
}
function _blTokens(text){
  return String(text||'')
    .replace(/\$\s?[\d,]+(?:\.\d{1,2})?/g,' ') // drop $amounts
    .toLowerCase().split(/[^a-z0-9]+/)
    .map(_blStem).filter(w=>w && w.length>=2 && !_BL_STOP.has(w));
}
// Generic wedding words that shouldn't carry a match on their own — they help rank
// once a real word matches, but never qualify a match by themselves.
const _BL_WEAK=new Set(['wedding','bride','brides','bridal','groom','grooms','mr','mrs','his','her','hers']);
// Both guard sets are tested against tokens that have ALREADY been stemmed, so every
// entry has to be present in its stemmed form too or it silently never matches. Derive
// those forms here rather than hand-listing them: a word added to either set above can
// then never become inert. This is not cosmetic — "wedding" stems to "wedd" (>=6 chars
// loses "ing"), which was absent, so the one word the weak list exists to neutralise was
// the one word it never caught, and a single "wedding" anywhere in a task qualified a
// budget match on its own. Same class in _BL_STOP ("this"->"thi", "remaining"->"remain").
// Runs here, after _BL_SYN / _blStem / _BL_WEAK are all initialised — _blStem reads
// _BL_SYN, so deriving any earlier would hit its temporal dead zone.
[_BL_STOP, _BL_WEAK].forEach(set=>{ Array.from(set).forEach(w=>{ const st=_blStem(w); if(st) set.add(st); }); });
// Score = shared distinctive tokens, weighted so an exact full-name hit wins. A match
// requires at least one STRONG shared word (not just a generic one like "wedding").
function _blScore(taskTokens, name){
  const nameTokens=_blTokens(name);
  if(!nameTokens.length || !taskTokens.length) return 0;
  const tset=new Set(taskTokens);
  let shared=0, strong=0, strongName=0;
  nameTokens.forEach(w=>{
    const weak=_BL_WEAK.has(w);
    if(!weak) strongName++;            // count of distinctive words in the name
    if(tset.has(w)){ shared++; if(!weak) strong++; }
  });
  if(!shared || !strong) return 0;     // need a real word in common, not just "wedding"
  // Precision toward the name's DISTINCTIVE words (generic words don't dilute it),
  // plus a small bonus per shared word so multi-word matches outrank single ones.
  const denom = strongName || nameTokens.length;
  return strong/denom + shared*0.15;
}
// Find the best budget item / sub-item match for a task title. Returns
// {bid, sid, label, score} or null when nothing clears the confidence threshold.
function _suggestBudgetMatch(taskText){
  const taskTokens=_blTokens(taskText);
  if(!taskTokens.length) return null;
  let best=null;
  (STATE.budget.items||[]).forEach(b=>{
    if(b.name && b.name.trim()){
      // Score against the name, and against name+note (vendor) — take the stronger,
      // so a distinctive word in the note (e.g. "Hillstone") still matches.
      const sc=Math.max(_blScore(taskTokens, b.name), b.note?_blScore(taskTokens, `${b.name} ${b.note}`):0);
      if(sc>0 && (!best||sc>best.score)) best={bid:b.id, sid:'', label:b.name, score:sc};
    }
    (b.subItems||[]).forEach(s=>{
      if(s.name && s.name.trim()){
        const sc=Math.max(_blScore(taskTokens, s.name), s.note?_blScore(taskTokens, `${s.name} ${s.note}`):0);
        if(sc>0 && (!best||sc>best.score)) best={bid:b.id, sid:s.id, label:`${b.name} › ${s.name}`, score:sc};
      }
    });
  });
  // Require a reasonable confidence: at least half a budget name's words matched.
  return (best && best.score>=0.5) ? best : null;
}
// Multi-match variant: returns up to 3 candidates that are within a small margin of
// the top score (a "near-tie"), each {bid, sid, label, score}. Empty when nothing
// clears the confidence threshold. Used by the link prompts to offer a pick list.
function _suggestBudgetMatches(taskText, limit){
  const taskTokens=_blTokens(taskText);
  if(!taskTokens.length) return [];
  const all=[];
  (STATE.budget.items||[]).forEach(b=>{
    if(b.name && b.name.trim()){
      const sc=Math.max(_blScore(taskTokens, b.name), b.note?_blScore(taskTokens, `${b.name} ${b.note}`):0);
      if(sc>=0.5) all.push({bid:b.id, sid:'', label:b.name, score:sc});
    }
    (b.subItems||[]).forEach(s=>{
      if(s.name && s.name.trim()){
        const sc=Math.max(_blScore(taskTokens, s.name), s.note?_blScore(taskTokens, `${s.name} ${s.note}`):0);
        if(sc>=0.5) all.push({bid:b.id, sid:s.id, label:`${b.name} › ${s.name}`, score:sc});
      }
    });
  });
  if(!all.length) return [];
  all.sort((a,b)=>b.score-a.score);
  const top=all[0].score;
  // "Near-tie" = within 0.2 of the best; anything further is treated as a clear loser.
  return all.filter(m=>m.score>=top-0.2).slice(0, limit||3);
}
// ── Reverse matcher: given a budget item/sub-item NAME being typed, find checklist
// tasks that resemble it. Mirrors _suggestBudgetMatches but scores the other way.
// Excludes tasks already linked to a Payment (so we never duplicate or steal a
// link). `ctx` (optional) supplies extra match text from a sub-item's parent category
// (name + notes) and the sub-item's own notes, so matches can be caught through the
// parent even when the sub-item name alone wouldn't. Returns up to `limit` near-tie
// candidates: [{tid, label, category, dueDate, score, viaParent}].
function _suggestTaskMatches(budgetName, limit, ctx){
  const nameTokens=_blTokens(budgetName);
  const ctxText=ctx?[ctx.parentName||'', ctx.parentNote||'', ctx.subNote||''].join(' ').trim():'';
  const ctxTokens=ctxText?_blTokens(ctxText):[];
  if(!nameTokens.length && !ctxTokens.length) return [];
  const nameSet=new Set(nameTokens);
  const all=[];
  (STATE.checklist||[]).forEach(t=>{
    if(!t || !t.text || !t.text.trim()) return;
    if(_taskIsLinked(t)) return;                 // skip already-linked tasks
    const taskTokens=_blTokens(`${t.text||''} ${t.notes||''}`);
    if(!taskTokens.length) return;
    // Primary score: the sub-item / item name itself (this dominates).
    const nameScore = nameTokens.length
      ? Math.max(_blScore(taskTokens, budgetName), _blScore([...nameSet], t.text))
      : 0;
    // Secondary score: the parent category context, weighted down so it broadens
    // matches without overpowering a real name hit.
    const ctxScore = ctxTokens.length ? _blScore(taskTokens, ctxText)*0.6 : 0;
    const sc = Math.max(nameScore, ctxScore);
    if(sc>=0.5){
      // "viaParent" = it only cleared the bar through the parent context, not the name.
      const viaParent = (nameScore<0.5 && ctxScore>=0.5);
      all.push({tid:t.id, label:t.text, category:t.category||'', dueDate:t.dueDate||'', score:sc, viaParent});
    }
  });
  if(!all.length) return [];
  all.sort((a,b)=>b.score-a.score);
  const top=all[0].score;
  return all.filter(m=>m.score>=top-0.2).slice(0, limit||3);
}
// Find an existing checklist category that a Payment maps to, or null if none.
// `texts` is an array of strings (name, notes, parent name/notes, sub-name/notes).
// Tries an exact (case-insensitive) full-string match first, then a fuzzy token match:
// any distinctive word in the texts whose stem equals a category's stem (folds
// synonyms, e.g. florals↔flowers, photo↔photography). Returns the category label.
function _matchTaskCategory(texts){
  const arr=(Array.isArray(texts)?texts:[texts]).map(t=>String(t||'').trim()).filter(Boolean);
  if(!arr.length) return null;
  const cats=[...new Set([
    ...(STATE.checklistCategories||[]),
    ...STATE.checklist.map(i=>i.category).filter(Boolean)
  ])].filter(Boolean).filter(c=>c.toLowerCase()!=='general');
  if(!cats.length) return null;
  // 1) Exact full-string match against any text.
  for(const txt of arr){
    const exact=cats.find(c=>c.toLowerCase()===txt.toLowerCase());
    if(exact) return exact;
  }
  // 2) Fuzzy: stem each category to a single canonical form, then look for a token in
  //    the combined text whose stem matches. Category stems use the first word.
  const catStems=cats.map(c=>({c, stem:_blStem(c.toLowerCase().replace(/[^a-z0-9]/g,''))})).filter(x=>x.stem);
  const tokens=_blTokens(arr.join(' '));
  for(const tok of tokens){
    const hit=catStems.find(cs=>cs.stem===tok);
    if(hit) return hit.c;
  }
  return null;
}
// Resolve the best checklist category label for a budget name (for filing an auto-
// created task): a real match wins; otherwise 'General'.
function _resolveTaskCategory(budgetName, extraTexts){
  const texts=[budgetName, ...(extraTexts||[])];
  return _matchTaskCategory(texts) || 'General';
}
// Unlinked tasks already filed under `cat`, excluding ids in `excludeIds` (the
// word-match list and anything queued). Returns [{tid, label, category, dueDate}].
function _tasksInCategory(cat, excludeIds){
  if(!cat || cat.toLowerCase()==='general') return [];
  const ex=new Set(excludeIds||[]);
  return (STATE.checklist||[])
    .filter(t=>t && t.text && t.text.trim())
    .filter(t=>(t.category||'').toLowerCase()===cat.toLowerCase())
    .filter(t=>!_taskIsLinked(t))
    .filter(t=>!ex.has(t.id))
    .map(t=>({tid:t.id, label:t.text, category:t.category||'', dueDate:t.dueDate||''}));
}
function _askAddSubDeposit(b, s, task){
  _adoptPopupBack();
  _depReturnPage=_popupOrigin;
  // Prefer a "deposit"-labelled $amount; fall back to any $amount in the task.
  const amt=_suggestDepositAmount(task.text, task.notes) || _extractDollarAmount(task.text) || _extractDollarAmount(task.notes) || 0;
  _addDepCtx={bid:b.id, sid:s?s.id:'', taskId:task.id, amount:amt};
  const name=s?`${b.name} › ${s.name}`:b.name;
  const today=_todayISO();
  // If the task mentions "booked" (or a synonym) in its title OR notes AND has a
  // recorded date, prefill the deposit Due date with that date instead of today.
  const bookedMention = _taskBookedKeyword(task.text) || _taskBookedKeyword(task.notes);
  const fromBooked = !!(bookedMention && task.dueDate);
  const defaultDue = fromBooked ? task.dueDate : today;
  const body=`<div style="padding:2px">
    <div style="font-size:12.5px;color:var(--muted);line-height:1.5;margin-bottom:14px">“${task.text}” mentions a deposit, but <strong style="color:var(--ink)">${name}</strong> has none set.</div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--cream);border:.5px solid var(--border);border-radius:9px;margin-bottom:14px">
      <span style="font-size:12.5px;color:var(--ink)">Add a deposit</span>
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span id="adep-toggle-label" style="font-size:11px;color:var(--muted)">No</span>
        <button type="button" id="adep-toggle" role="switch" aria-checked="false" onclick="_adepToggle()" style="width:34px;height:19px;background:var(--border);border:none;border-radius:10px;position:relative;cursor:pointer;padding:0">
          <span id="adep-knob" style="position:absolute;top:2px;left:2px;width:15px;height:15px;background:#fff;border-radius:50%;transition:left .15s"></span>
        </button>
      </span>
    </div>
    <div id="adep-fields" style="opacity:.4;pointer-events:none;transition:opacity .15s">
      <div style="font-size:11px;color:var(--muted);margin-bottom:3px">Deposit amount</div>
      <input id="adep-amount" class="form-input" inputmode="decimal" value="${amt?(_curSym()+amt):''}" placeholder="${_curSym()}0" style="font-size:12.5px;height:34px;margin-bottom:10px"/>
      <div style="font-size:11px;color:var(--muted);margin-bottom:3px">Due date</div>
      <input id="adep-date" class="form-input" type="date" value="${defaultDue}" style="font-size:12.5px;height:34px;margin-bottom:${fromBooked?'4px':'8px'}"/>
      ${fromBooked?`<div style="font-size:10.5px;color:var(--gold-deep);margin-bottom:8px;display:flex;align-items:center;gap:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><path d="M9 15l2 2 4-4"/></svg>Prefilled from the task’s booked date</div>`:''}
      <label style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink);cursor:pointer"><input type="checkbox" id="adep-nodate" onchange="_adepNoDate()" style="width:15px;height:15px;cursor:pointer"/> No due date</label>
    </div>
    ${s?`<div style="border-top:.5px dashed var(--border);margin:13px 0 11px"></div>
    <div onclick="_adepOpenInstallments()" style="display:flex;align-items:center;gap:9px;padding:9px 11px;border:.5px solid var(--border);background:var(--surface);border-radius:9px;cursor:pointer" title="Set up a payment plan instead of a single deposit">
      <span style="width:26px;height:26px;border-radius:7px;background:rgba(201,168,130,.16);display:inline-flex;align-items:center;justify-content:center;color:var(--gold-deep);flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="15" x2="9" y2="15"/><line x1="12" y1="15" x2="14" y2="15"/></svg></span>
      <span style="flex:1;min-width:0"><span style="font-size:12.5px;color:var(--ink);font-weight:500">Pay in installments instead</span><br><span style="font-size:10.5px;color:var(--muted)">Set up a payment plan with due dates</span></span>
      <span style="color:var(--muted);flex-shrink:0"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
    </div>`:''}
    <label id="adep-noask-row" style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--muted);margin-top:14px;cursor:pointer"><input type="checkbox" id="adep-noask" style="width:15px;height:15px;cursor:pointer"/> Don’t ask again</label>
  </div>`;
  const footer=`${_popupBackBtnHtml()}<button class="btn btn-outline btn-sm" onclick="_adepCancel()">Skip</button>
    <button class="btn btn-primary btn-sm" onclick="_adepSave()">Save</button>`;
  openModal('Add a deposit?', body, footer);
}
function _adepToggle(){
  const btn=document.getElementById('adep-toggle'); if(!btn) return;
  const on = btn.getAttribute('aria-checked')!=='true';
  btn.setAttribute('aria-checked', on?'true':'false');
  document.getElementById('adep-knob').style.left = on?'17px':'2px';
  btn.style.background = on?'var(--gold)':'var(--border)';
  document.getElementById('adep-toggle-label').textContent = on?'Yes':'No';
  const fields=document.getElementById('adep-fields');
  fields.style.opacity = on?'1':'.4';
  fields.style.pointerEvents = on?'auto':'none';
  // "Don't ask again" only relevant when NOT adding a deposit
  document.getElementById('adep-noask-row').style.display = on?'none':'flex';
}
function _adepNoDate(){
  const off=document.getElementById('adep-nodate').checked;
  const d=document.getElementById('adep-date');
  d.disabled=off; d.style.opacity=off?'.4':'1';
}
// "Pay in installments instead" → close this prompt and open the Payments editor
// for the sub-item, seeding the deposit with the suggested amount from this prompt.
function _adepOpenInstallments(){
  const c=_addDepCtx; if(!c || !c.sid){ return; }
  const raw=(document.getElementById('adep-amount')?.value||'').replace(/[^0-9.-]/g,'');
  const seed=Number(raw)||Number(c.amount||0)||0;
  // Capture the deposit-prompt context so Payments' "< Back" can re-open it.
  const b=STATE.budget.items.find(x=>x.id===c.bid);
  const s=c.sid?b?.subItems?.find(x=>x.id===c.sid):null;
  const task=STATE.checklist.find(x=>x.id===c.taskId);
  _addDepCtx=null;
  _bookedFallbackBalance=null; // setting up payments supersedes the balance fallback
  closeModalDirect();
  _popupBackPending = (b && task) ? (()=>_askAddSubDeposit(b, s, task)) : null;
  openPaymentsEditor(c.bid, c.sid, seed, {forceInstallments:true});
}
function _adepSave(){
  const c=_addDepCtx; if(!c){ closeModalDirect(); return; }
  const b=STATE.budget.items.find(x=>x.id===c.bid);
  const s=c.sid?b?.subItems?.find(x=>x.id===c.sid):null;
  const toggle=document.getElementById('adep-toggle');
  const adding = toggle && toggle.getAttribute('aria-checked')==='true';
  if(adding && (s || (!c.sid && b))){
    const rawAmt=(document.getElementById('adep-amount')?.value||'').replace(/[^0-9.-]/g,'');
    const noDate=document.getElementById('adep-nodate')?.checked;
    const dueVal = noDate ? '' : (document.getElementById('adep-date')?.value||'');
    if(s){
      s.deposit=Number(rawAmt)||0;
      s.showDeposit=true;
      s.depositDueDate=dueVal;
    } else {
      // Item-level deposit.
      b.deposit=Number(rawAmt)||0;
      b.depositFromSubs=false;
      b.depositDueDate=dueVal;
    }
    _addDepCtx=null;
    _bookedFallbackBalance=null; // deposit added → don't also fall through to balance
    saveToStorage();
    // A deposit was just added — first ask whether to mark it paid, then (either way)
    // continue to the "add a Balance paid task" offer.
    _askMarkDepositPaid(c.bid, c.sid, c.taskId);
    return;
  }
  // Not adding — honour "don't ask again" globally if ticked.
  const noask=document.getElementById('adep-noask')?.checked;
  if(noask){ if(!STATE.settings) STATE.settings={}; STATE.settings.hideAddDepositPrompt=true; }
  _addDepCtx=null;
  closeModalDirect();
  saveToStorage();
  // Booked task declined adding a deposit → fall through to the balance prompt.
  if(_flushBookedFallbackBalance()) return;
  navigate(_popupReturn());
}
// Cancel from the add-deposit prompt: same fall-through behaviour as declining.
function _adepCancel(){
  _addDepCtx=null;
  closeModalDirect();
  if(_flushBookedFallbackBalance()) return;
  navigate(_popupReturn());
}
// After a deposit is added via checklist linking, ask whether to mark it paid.
// Either choice then continues to the "add a Balance paid task" offer.
let _mdpDateMode='today';
let _mdpDueDate='';
function _askMarkDepositPaid(bid, sid, taskId){
  const b=STATE.budget.items.find(x=>x.id===bid);
  const s=sid?b?.subItems?.find(x=>x.id===sid):null;
  if(!b || (sid && !s)){ closeModalDirect(); navigate(_popupReturn()); return; }
  const path=s?`${b.name} › ${s.name}`:b.name;
  const depAmt=s?Number(s.deposit||0):Number(b.deposit||0);
  _mdpDateMode='today';
  _mdpDueDate = (s?s.depositDueDate:b.depositDueDate)||'';
  const today=_todayISO();
  // Offer a date choice only when the deposit has a due date that differs from today.
  const showDateToggle = _mdpDueDate && _mdpDueDate!==today;
  const on='background:var(--gold);color:#fff', off='background:transparent;color:var(--muted)';
  const dateToggle = showDateToggle ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--surface);border-radius:8px;padding:8px 11px;margin-top:12px">
      <span style="font-size:12px;color:var(--ink)">Record paid date as</span>
      <span style="display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <button type="button" id="mdpseg-today" onclick="_setMdpDateMode('today')" style="font-size:12px;padding:6px 13px;border:none;cursor:pointer;${on}">Today</button>
        <button type="button" id="mdpseg-due" onclick="_setMdpDateMode('due')" style="font-size:12px;padding:6px 13px;border:none;cursor:pointer;${off}">${fmtBudgetDate(_mdpDueDate)}</button>
      </span>
    </div>`:'';
  const body=`<div style="padding:2px">
    <div style="font-size:13px;color:var(--ink);line-height:1.55;margin-bottom:12px">You added a ${depAmt?`<strong>${fmt(depAmt)}</strong> `:''}deposit for <strong>${_escHtml(path)}</strong>. Has it already been paid?</div>
    ${_budgetPreviewCard(b, s, 'deposit')}
    ${dateToggle}
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_markDepositPaidSkip('${bid}','${sid}','${taskId}')">Not yet</button>
    <button class="btn btn-primary btn-sm" onclick="_animConfirmThenApply(()=>_markDepositPaidConfirm('${bid}','${sid}','${taskId}'),'on')">Mark deposit paid</button>`;
  openModal('Mark deposit as paid?', body, footer);
}
function _setMdpDateMode(mode){
  _mdpDateMode=mode;
  const t=document.getElementById('mdpseg-today'), d=document.getElementById('mdpseg-due');
  if(t&&d){
    const on='background:var(--gold);color:#fff', off='background:transparent;color:var(--muted)';
    t.style.cssText=`font-size:12px;padding:6px 13px;border:none;cursor:pointer;${mode==='today'?on:off}`;
    d.style.cssText=`font-size:12px;padding:6px 13px;border:none;cursor:pointer;${mode==='due'?on:off}`;
  }
}
function _markDepositPaidConfirm(bid, sid, taskId){
  const b=STATE.budget.items.find(x=>x.id===bid);
  const s=sid?b?.subItems?.find(x=>x.id===sid):null;
  const chosen=(_mdpDateMode==='due' && _mdpDueDate) ? _mdpDueDate : _todayISO();
  if(s){
    s.depositPaid=true; s.depositPaidDate=chosen;
  } else if(b){
    b.depositPaid=true; b.depositPaidDate=chosen;
  }
  saveToStorage();
  _mdpDateMode='today'; _mdpDueDate='';
  closeModalDirect();
  // Continue to the balance-task offer.
  _askAddBalanceTask(bid, sid, taskId);
}
function _markDepositPaidSkip(bid, sid, taskId){
  _mdpDateMode='today'; _mdpDueDate='';
  closeModalDirect();
  _askAddBalanceTask(bid, sid, taskId);
}
// Offer to create a separate "Balance paid" checklist task linked to the item/sub-item.
function _askAddBalanceTask(bid, sid, taskId){
  const b=STATE.budget.items.find(x=>x.id===bid);
  const s=sid?b?.subItems?.find(x=>x.id===sid):null;
  if(!b || (sid && !s)){ closeModalDirect(); navigate(_popupReturn()); return; }
  const path=s?`${b.name} › ${s.name}`:b.name;
  const targetName=s?s.name:b.name;
  const linkNoun=s?'sub-item':'item';
  const newTitle=`Pay balance — ${targetName}`;
  const body=`<div style="padding:2px">
    <div style="font-size:13px;color:var(--ink);line-height:1.55;margin-bottom:12px">You added a deposit for <strong>${_escHtml(path)}</strong>. Would you like a separate checklist task to track paying the remaining balance? It’ll link to the same ${linkNoun}.</div>
    <div style="background:var(--cream);border:.5px solid var(--border);border-radius:9px;padding:9px 11px">
      <div style="display:flex;align-items:center;gap:7px;font-size:13px;color:var(--ink);margin-bottom:5px"><span style="width:15px;height:15px;border:1.5px solid var(--gold);border-radius:4px;flex-shrink:0"></span>${_escHtml(newTitle)}</div>
      <div style="font-size:10.5px;color:var(--gold-deep);display:flex;align-items:center;gap:4px;padding-left:22px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Links to ${_escHtml(path)}</div>
    </div>
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_balanceTaskSkip()">No thanks</button>
    <button class="btn btn-primary btn-sm" onclick="_createBalanceTask('${bid}','${sid}','${taskId}')">Add task</button>`;
  openModal('Add a “Balance paid” task?', body, footer);
}
function _balanceTaskSkip(){ closeModalDirect(); if(_flushFollowUp()) return; navigate(_popupReturn()); }
function _createBalanceTask(bid, sid, taskId){
  const b=STATE.budget.items.find(x=>x.id===bid);
  const s=sid?b?.subItems?.find(x=>x.id===sid):null;
  if(b && (s || !sid)){
    const orig=STATE.checklist.find(x=>x.id===taskId);
    const cat=(orig&&orig.category)||'';
    const due=(s?s.balanceDueDate:b.balanceDueDate)||'';
    const targetName=s?s.name:b.name;
    STATE.checklist.push({id:'cl'+Date.now(),text:`Pay balance — ${targetName}`,done:false,dueDate:due,category:cat,notes:'',pinned:false,budgetId:bid,budgetSubId:sid||''});
  }
  saveToStorage(); closeModalDirect(); if(_flushFollowUp()) return; navigate(_popupReturn());
}

// Part 2: when re-checking something that has a remembered paid date, ask keep-previous vs today
let _pdcCallback=null;
function _askPaidDateChoice(name, prevDate, cb){
  _pdcCallback=cb;
  const today=_todayISO();
  if(!prevDate || prevDate===today){ // nothing meaningful to choose
    cb(today); _pdcCallback=null; return;
  }
  // If the user already opted into "always today", skip the popup entirely.
  if(STATE.settings && STATE.settings.alwaysMarkPaidToday){ cb(today); _pdcCallback=null; return; }
  _depReturnPage=_popupOrigin;
  _mbPrevDate=prevDate; _mbDateMode='today'; _mbCustomDate='';
  const body=`<div style="font-size:13px;line-height:1.5;color:var(--ink)"><strong>${name}</strong> was previously paid on <strong>${fmtBudgetDate(prevDate)}</strong>. Which date should be recorded?</div>
    ${_recordDateToggleHtml(prevDate)}${_renderAlwaysTodayCheckbox()}`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_cancelPaidDateChoice()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="_savePaidDateChoice()">Save</button>`;
  openModal('Set payment date', body, footer);
}
function _cancelPaidDateChoice(){
  _pdcCallback=null; _mbPrevDate=''; _mbDateMode='today';
  closeModalDirect();
}
function _savePaidDateChoice(){
  const cb=_pdcCallback; _pdcCallback=null;
  // Apply the "always mark paid today" opt-in if the box was ticked.
  if(_batchAlwaysToday){ if(!STATE.settings) STATE.settings={}; STATE.settings.alwaysMarkPaidToday=true; saveToStorage(); }
  const chosen = _batchAlwaysToday ? _todayISO() : (_mbDateMode==='custom'&&_mbCustomDate ? _mbCustomDate : (_mbDateMode==='prev'&&_mbPrevDate ? _mbPrevDate : _todayISO()));
  _mbPrevDate=''; _mbDateMode='today'; _mbCustomDate='';
  closeModalDirect();
  if(cb) cb(chosen);
}
function _resolvePaidDateChoice(dateStr){
  const cb=_pdcCallback; _pdcCallback=null;
  closeModalDirect();
  if(cb) cb(dateStr);
}
function _applyDepositSync(bid, sid, makePaid){
  const b=STATE.budget.items.find(x=>x.id===bid); if(!b){ closeModalDirect(); return; }
  const _rd=_resolveMbDate(); const chosenDate=_rd.date; const usingExplicit=_rd.explicit;
  if(sid){
    const s=b.subItems?.find(x=>x.id===sid);
    if(s){ s.depositPaid=makePaid; if(makePaid){ if(usingExplicit) s.depositPaidDate=chosenDate; else if(!s.depositPaidDate) s.depositPaidDate=_todayISO(); } }
  } else {
    b.depositPaid=makePaid; if(makePaid){ if(usingExplicit) b.depositPaidDate=chosenDate; else if(!b.depositPaidDate) b.depositPaidDate=_todayISO(); }
  }
  _mbPrevDate=''; _mbDateMode='today'; _mbCustomDate='';
  closeModalDirect();
  saveToStorage();
  updateBudgetSummary();
  if(_flushBookedPlacement()) return;
  if(_flushFollowUp()) return;
  navigate(_popupReturn());
}
// True when the linked item/sub-item has a deposit that exists but isn't yet paid.
// Mirrors the preview card's showDep logic so the two always agree.
function _budgetDepositUnpaid(b, s){
  if(s){
    if(s.depositPaid) return false;
    const sDep=Number(s.deposit||0);
    return s.showDeposit || sDep>0 || !!s.depositDueDate;
  }
  if(!b) return false;
  if(b.depositPaid) return false;
  // A subs-sourced deposit can't be marked from here in one tick — only flag a
  // genuine item-level deposit amount / due date as actionable.
  if(b.depositFromSubs) return false;
  const dep=Number(b.deposit||0);
  return dep>0 || !!b.depositDueDate;
}
// Prompt to mark the linked budget item/sub-item paid/unpaid from the checklist side
function _maybeAskMarkBudget(b, s, taskDone){
  if(!b) return;
  const curPaid = s ? !!s.paid : !!b.paid;
  if(curPaid===taskDone) return; // already in the desired state
  _depReturnPage=_popupOrigin;
  const name = s ? `${b.name} › ${s.name}` : b.name;
  const verb = taskDone ? 'mark' : 'un-mark';
  // Part 3: when marking paid, offer a date toggle (Today / previous / custom).
  const prevDate = s ? (s.paidDate||'') : (b.balancePaidDate||'');
  const today=_todayISO();
  const showDateToggle = taskDone;
  _mbPrevDate = (prevDate && prevDate!==today) ? prevDate : '';
  _mbDateMode = 'today'; _mbCustomDate='';
  let dateToggle = showDateToggle ? _recordDateToggleHtml(_mbPrevDate) : '';
  // When marking paid, surface a deposit action if the linked item/sub-item has an
  // unpaid deposit. depUnpaid drives both the "unpaid" tag in the preview card and
  // the extra footer buttons (Deposit only / Mark both paid).
  const depUnpaid = taskDone && _budgetDepositUnpaid(b, s);
  const body = `<div style="font-size:13px;line-height:1.5;color:var(--ink)">Do you also want to ${verb} the linked budget ${s?'sub-item':'item'} <strong>${name}</strong> as ${taskDone?'paid':'unpaid'}?</div>${_budgetPreviewCard(b, s, depUnpaid?'depUnpaid':'')}${dateToggle}`;
  const yesLabel = taskDone ? (depUnpaid ? 'Mark both paid' : 'Mark paid') : 'Un-mark';
  const sidArg = s?s.id:'';
  const depBtn = depUnpaid ? `<button class="btn btn-outline btn-sm" onclick="_animConfirmThenApply(()=>_applyMarkBudget('${b.id}','${sidArg}',true,true),'on')" title="Mark only the deposit as paid; leave the balance unpaid">Deposit only</button>` : '';
  const primaryAction = taskDone
    ? `_animConfirmThenApply(()=>_applyMarkBudget('${b.id}','${sidArg}',true,${depUnpaid?'true':'false'}),'on')`
    : `_animConfirmThenApply(()=>_applyMarkBudget('${b.id}','${sidArg}',false),'off')`;
  const footer = `<button class="btn btn-outline btn-sm" onclick="_markBudgetUnlink('${b.id}','${sidArg}')" style="margin-right:auto;display:inline-flex;align-items:center;gap:5px;color:var(--red);border-color:var(--border)" title="Unlink this task from the budget item">${_unlinkIcon(13)}Unlink</button>
    <button class="btn btn-outline btn-sm" onclick="_skipThenPlacement()">Skip</button>
    ${depBtn}
    <button class="btn btn-primary btn-sm" onclick="${primaryAction}">${yesLabel}</button>`;
  openModal(taskDone?'Also mark Payment paid?':'Also un-check Payment?', body, footer);
}
// Unlink from the mark-budget prompt: set the link context for this Payment
// (and optional sub-item), then show the existing unlink warning before removing it.
function _markBudgetUnlink(bid, sid){
  _linkMenuCtx={side:'budget', id1:bid, id2:sid||''};
  _linkMenuUnlink();
}
// ── Soft-keyword prompt: ask whether to act on the deposit or the balance ──────
let _dobCtx=null;
function _askDepositOrBalance(b, s, nowDone, task){
  if(!b){ return; }
  _depReturnPage=_popupOrigin;
  _dobCtx={bid:b.id, sid:s?s.id:'', nowDone:!!nowDone, taskId:task?task.id:''};
  const name = s ? `${b.name} › ${s.name}` : b.name;
  const hasDep = _targetHasDeposit(b, s);
  const kw = task ? (task.text||'') : '';
  const verb = nowDone ? 'mark paid' : 'un-mark';
  const intro = `“${kw}” might mean a deposit. For <strong>${name}</strong>, which would you like to ${verb}?`;
  const body = `<div style="font-size:13px;line-height:1.55;color:var(--ink)">${intro}</div>${_budgetPreviewCard(b, s, 'deposit')}`;
  // Deposit button: if a deposit exists → mark it; if not (sub-item) → add one.
  const depLabel = nowDone
    ? (hasDep ? 'Deposit' : (s ? 'Add a deposit' : 'Deposit'))
    : 'Deposit';
  const footer = `<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Cancel</button>
    <button class="btn btn-outline btn-sm" onclick="_dobChoose('balance')">Balance</button>
    <button class="btn btn-primary btn-sm" onclick="_dobChoose('deposit')">${depLabel}</button>`;
  openModal(nowDone?'Deposit or balance?':'Un-mark deposit or balance?', body, footer);
}
function _dobChoose(which){
  const c=_dobCtx; _dobCtx=null;
  if(!c){ closeModalDirect(); return; }
  const b=STATE.budget.items.find(x=>x.id===c.bid); if(!b){ closeModalDirect(); return; }
  const s=c.sid?b.subItems?.find(x=>x.id===c.sid):null;
  const task=c.taskId?STATE.checklist.find(x=>x.id===c.taskId):null;
  closeModalDirect();
  if(which==='deposit'){
    _maybeAskDeposit(b, s, c.nowDone, task);
  } else {
    _maybeAskMarkBudget(b, s, c.nowDone);
  }
}
function _setMbDateMode(mode){
  _mbDateMode=mode;
  _refreshMbSeg();
}
// Resolves the date the user chose in the Record-date toggle.
// Returns { date, explicit } — explicit=true when a specific (non-today) date
// was actively chosen (prev or custom), so callers write it verbatim.
function _resolveMbDate(){
  if(_mbDateMode==='custom' && _mbCustomDate) return { date:_mbCustomDate, explicit:true };
  if(_mbDateMode==='prev' && _mbPrevDate) return { date:_mbPrevDate, explicit:true };
  return { date:_todayISO(), explicit:false };
}
// Animate the linked preview item ticking on, then run the real apply + close.
// applyFn: the function to run after the animation (does the state change + closeModalDirect).
// If the target checkbox isn't present (or already on), it just runs applyFn immediately.
// dir: 'on' (default) ticks the box on with a gold pulse; 'off' draws it out with a neutral pulse.
function _animConfirmThenApply(applyFn, dir){
  const cb=document.getElementById('cbm-target');
  const row=document.getElementById('cbm-target-row');
  const cb2=document.getElementById('cbm-target2');
  const row2=document.getElementById('cbm-target2-row');
  const box=document.getElementById('modal-box');
  // Respect reduced-motion and graceful fallback
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if((!cb && !cb2) || reduce){ applyFn(); return; }
  const flash = dir==='off' ? 'cbm-flash-neutral' : 'cbm-flash';
  const tick = dir==='off' ? 'cbm-off' : 'cbm-on';
  if(cb){ cb.classList.add(tick,'cbm-pop'); if(row) row.classList.add(flash); }
  if(cb2){ cb2.classList.add(tick,'cbm-pop'); if(row2) row2.classList.add(flash); }
  if(box) box.classList.add('modal-confirming');
  setTimeout(()=>{ if(box) box.classList.add('modal-closing'); }, 430);
  setTimeout(()=>{ if(box){ box.classList.remove('modal-confirming','modal-closing'); } applyFn(); }, 640);
}
function _applyMarkBudget(bid, sid, makePaid, alsoDeposit){
  const b=STATE.budget.items.find(x=>x.id===bid); if(!b){ closeModalDirect(); return; }
  // Resolve the chosen paid date (Part 3 toggle). Falls back to gated stamp.
  const _rd=_resolveMbDate(); const chosenDate=_rd.date; const usingExplicitDate=_rd.explicit;
  const depDate = usingExplicitDate ? chosenDate : _todayISO();
  if(sid){
    const s=b.subItems?.find(x=>x.id===sid);
    if(s){
      // "Deposit only" path: makePaid stays false for the balance, but the deposit is marked.
      if(alsoDeposit && !s.depositPaid){ s.depositPaid=true; if(!s.depositPaidDate) s.depositPaidDate=depDate; }
      if(makePaid){
        s.paid=true; s.manualPaid=true;
        if(usingExplicitDate) s.paidDate=chosenDate; else _stampSubPaidDate(s);
        // Auto-check the sub deposit when marking the balance paid (never auto-uncheck)
        const subHasDep = s.showDeposit || Number(s.deposit||0)>0 || s.depositDueDate;
        if(subHasDep && !s.depositPaid){ s.depositPaid=true; if(!s.depositPaidDate) s.depositPaidDate=_todayISO(); }
      } else if(!alsoDeposit){
        // Plain un-mark (not the Deposit-only path).
        s.paid=false; s.manualPaid=false;
      }
      // Recompute item balance from sub-items
      const amountBearing=b.subItems.filter(x=>getSubItemAmount(x)>0);
      b.paid = amountBearing.length>0 && amountBearing.every(x=>x.paid);
      if(b.paid) _stampItemPaidDate(b);
    }
  } else {
    if(alsoDeposit && !b.depositPaid){ b.depositPaid=true; if(!b.depositPaidDate) b.depositPaidDate=depDate; }
    if(makePaid){
      b.paid=true;
      if(usingExplicitDate) b.balancePaidDate=chosenDate; else _stampItemPaidDate(b);
    } else if(!alsoDeposit){
      b.paid=false;
    }
  }
  _mbPrevDate=''; _mbDateMode='today'; _mbCustomDate='';
  closeModalDirect();
  saveToStorage();
  updateBudgetSummary();
  if(_flushBookedPlacement()) return;
  if(_flushFollowUp()) return;
  navigate(_popupReturn());
}
// Find the linked "pay"+"deposit" checklist task for an item/sub-item (either link direction)
function _findPayDepositTask(b, s){
  let t=null;
  if(s){
    t=STATE.checklist.find(ci=>ci.budgetId===b.id&&ci.budgetSubId===s.id);
  } else {
    if(b.checklistId) t=STATE.checklist.find(ci=>ci.id===b.checklistId);
    if(!t) t=STATE.checklist.find(ci=>ci.budgetId===b.id&&!ci.budgetSubId);
  }
  return (t && _taskDepositKeyword(t)) ? t : null;
}
// Shared linked-task preview (icon meta line + note) used by the batch popup and
// the single deposit sync popup so they look identical.
function _taskPreviewMeta(t){
  const cal='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const cash='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></svg>';
  const tag='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const parts=[];
  if(t.dueDate) parts.push(`${cal}Due ${fmtBudgetDate(t.dueDate)}`);
  let amt=0; if(t.budgetId){ const lb=STATE.budget.items.find(x=>x.id===t.budgetId); if(lb){ const ls=t.budgetSubId?lb.subItems?.find(x=>x.id===t.budgetSubId):null; amt=ls?getSubItemAmount(ls):calcBudgetItemTotal(lb);} }
  if(Number(amt)>0) parts.push(`${cash}${fmt(amt)}`);
  if(t.category) parts.push(`${tag}${t.category}`);
  const metaLine = parts.length?`<div style="font-size:11px;color:var(--muted);display:flex;flex-wrap:wrap;gap:3px 12px;margin-top:2px">${parts.map(p=>`<span>${p}</span>`).join('')}</div>`:'';
  const noteLine = t.notes?`<div style="font-size:11px;color:var(--muted);font-style:italic;margin-top:2px">“${t.notes}”</div>`:'';
  return metaLine+noteLine;
}
// When a deposit is marked paid and the target has NO linked task, but an unlinked
// checklist task matches by wording (item name + note/vendor + "deposit"), offer to
// link it and mark it done. Returns true if a prompt was shown.
let _depLinkCtx=null;
function _maybeSuggestDepositLink(b, s){
  // Only when nothing is linked to this exact target.
  if(s){ if(STATE.checklist.some(t=>t.budgetId===b.id&&t.budgetSubId===s.id)) return false; }
  else { if(b.checklistId || STATE.checklist.some(t=>t.budgetId===b.id&&!t.budgetSubId)) return false; }
  // Build a match seed: the item/sub name, the vendor/note, and the word "deposit".
  const seedName = s ? s.name : b.name;
  const ctx = { parentName: (s? b.name : (b.note||'')), parentNote: (s? (b.note||'') : 'deposit'), subNote: (s? (s.note||'')+' deposit' : '') };
  let matches=_suggestTaskMatches(`${seedName} deposit`, 3, ctx);
  // Prefer tasks that actually look like a deposit/payment task.
  const depFirst=matches.filter(m=>{ const t=STATE.checklist.find(x=>x.id===m.tid); return t && _taskDepositKeyword(t); });
  if(depFirst.length) matches=depFirst;
  if(!matches.length) return false;
  _depReturnPage=_popupOrigin;
  _depLinkCtx={bid:b.id, sid:s?s.id:''};
  const name = s ? `${b.name} › ${s.name}` : b.name;
  const cards=_renderMatchCards(matches, m=>`_depLinkMatch('${m.tid}')`);
  const body=`<div style="font-size:13px;line-height:1.5;color:var(--ink)">You marked the deposit paid for <strong>${name.replace(/</g,'&lt;')}</strong>. A checklist task looks related — link it and mark it done?</div>${cards}`;
  openModal('Link a checklist task?', body, `<button class="btn btn-outline btn-sm" onclick="_skipDepLink()">Skip</button>`);
  return true;
}
function _depLinkMatch(tid){
  const c=_depLinkCtx; if(!c){ closeModalDirect(); return; }
  const t=STATE.checklist.find(x=>x.id===tid);
  const b=STATE.budget.items.find(x=>x.id===c.bid);
  if(t && b){
    // Clear any prior reverse-link, then wire both sides + mark done.
    STATE.budget.items.forEach(x=>{ if(x.checklistId===t.id) x.checklistId=''; });
    t.budgetId=c.bid; t.budgetSubId=c.sid||'';
    if(!c.sid) b.checklistId=t.id;
    t.done=true;
    saveToStorage();
  }
  _depLinkCtx=null;
  closeModalDirect();
  if(_maybeFireInvoicePrompt()) return;
  navigate(_popupReturn());
}
function _skipDepLink(){
  _depLinkCtx=null;
  closeModalDirect();
  if(_maybeFireInvoicePrompt()) return;
  navigate(_popupReturn());
}
// When a BALANCE is marked paid and the target has NO linked task, but an unlinked
// checklist task matches by wording (item name + note/vendor + "pay/balance"), offer to
// link it and mark it done. Mirrors _maybeSuggestDepositLink. Returns true if shown.
let _balLinkCtx=null;
function _maybeSuggestBalanceLink(b, s){
  // Only when nothing is linked to this exact target.
  if(s){ if(STATE.checklist.some(t=>t.budgetId===b.id&&t.budgetSubId===s.id)) return false; }
  else { if(b.checklistId || STATE.checklist.some(t=>t.budgetId===b.id&&!t.budgetSubId)) return false; }
  const seedName = s ? s.name : b.name;
  const ctx = { parentName: (s? b.name : (b.note||'')), parentNote: (s? (b.note||'') : 'pay'), subNote: (s? (s.note||'')+' pay' : '') };
  let matches=_suggestTaskMatches(`${seedName} pay`, 3, ctx);
  // Exclude deposit-specific tasks — those are the deposit flow's job, not the balance's.
  matches=matches.filter(m=>{ const t=STATE.checklist.find(x=>x.id===m.tid); return !(t && _taskDepositKeyword(t)); });
  if(!matches.length) return false;
  _depReturnPage=_popupOrigin;
  _balLinkCtx={bid:b.id, sid:s?s.id:''};
  const name = s ? `${b.name} › ${s.name}` : b.name;
  const cards=_renderMatchCards(matches, m=>`_balLinkMatch('${m.tid}')`);
  const body=`<div style="font-size:13px;line-height:1.5;color:var(--ink)">You marked the balance paid for <strong>${name.replace(/</g,'&lt;')}</strong>. A checklist task looks related — link it and mark it done?</div>${cards}`;
  openModal('Link a checklist task?', body, `<button class="btn btn-outline btn-sm" onclick="_skipBalLink()">Skip</button>`);
  return true;
}
function _balLinkMatch(tid){
  const c=_balLinkCtx; if(!c){ closeModalDirect(); return; }
  const t=STATE.checklist.find(x=>x.id===tid);
  const b=STATE.budget.items.find(x=>x.id===c.bid);
  if(t && b){
    STATE.budget.items.forEach(x=>{ if(x.checklistId===t.id) x.checklistId=''; });
    t.budgetId=c.bid; t.budgetSubId=c.sid||'';
    if(!c.sid) b.checklistId=t.id;
    t.done=true;
    saveToStorage();
  }
  _balLinkCtx=null;
  closeModalDirect();
  if(_maybeFireInvoicePrompt()) return;
  navigate(_popupReturn());
}
function _skipBalLink(){
  _balLinkCtx=null;
  closeModalDirect();
  if(_maybeFireInvoicePrompt()) return;
  navigate(_popupReturn());
}
// Prompt to sync the linked checklist task's done-state when a deposit checkbox is toggled
function _maybeAskTaskDone(b, s, depositNowPaid){
  const t=_findPayDepositTask(b, s);
  if(!t) return;
  if(!!t.done===depositNowPaid) return; // already in the desired state
  _depReturnPage=_popupOrigin;
  const name = s ? `${b.name} › ${s.name}` : b.name;
  const verb = depositNowPaid ? 'mark' : 'un-mark';
  const body = `<div style="font-size:13px;line-height:1.5;color:var(--ink)">You ${depositNowPaid?'marked the deposit paid':'un-marked the deposit'} for <strong>${name}</strong>. Do you also want to ${verb} the linked checklist task as ${depositNowPaid?'done':'not done'}?</div>${_taskPreviewCard(t, true)}`;
  const yesLabel = depositNowPaid ? 'Mark task done' : 'Un-mark task';
  const footer = `<button class="btn btn-outline btn-sm" onclick="_skipThenPlacement()">Skip</button>
    <button class="btn btn-primary btn-sm" onclick="_animConfirmThenApply(()=>_applyTaskDoneSync('${t.id}',${depositNowPaid?'true':'false'}),'${depositNowPaid?'on':'off'}')">${yesLabel}</button>`;
  openModal(depositNowPaid?'Also mark task done?':'Also un-mark task?', body, footer);
}
function _applyTaskDoneSync(taskId, makeDone){
  const t=STATE.checklist.find(x=>x.id===taskId);
  if(t) t.done=makeDone;
  closeModalDirect();
  saveToStorage();
  if(_flushBookedPlacement()) return;
  if(_maybeFireInvoicePrompt()) return;
  if(_flushFollowUp()) return;
  navigate(_popupReturn());
}
function _skipTaskDoneSingle(){
  closeModalDirect();
  if(_flushBookedPlacement()) return;
  if(_maybeFireInvoicePrompt()) return;
  if(_flushFollowUp()) return;
  navigate(_popupReturn());
}
// Combined pop-up: offer to sync several linked checklist tasks at once
let _batchTasks=[]; let _batchMakeDone=true; let _batchTitle='';
// ── "Upload an invoice or receipt?" prompt after a Payment is checked paid ──
// A pending request is set when paying; it fires once any linked-task pop-up chain
// has finished (or immediately if there was none).
let _pendingInvoicePrompt=null;
function _maybeFireInvoicePrompt(){
  const p=_pendingInvoicePrompt; _pendingInvoicePrompt=null;
  if(!p) return false;
  if(!_budgetShown('invoicePrompt')) return false;
  _askUploadInvoice(p.bid, p.sid);
  return true;
}
function _askUploadInvoice(bid, sid){
  const b=STATE.budget.items.find(x=>x.id===bid); if(!b){ return; }
  const s=sid?b.subItems?.find(x=>x.id===sid):null;
  const name = s ? `${b.name} › ${s.name}` : b.name;
  _depReturnPage=_popupOrigin;
  _invoiceDontAsk=false;
  const body=`<div style="font-size:13px;line-height:1.55;color:var(--ink)">You marked <strong>${name}</strong> as paid. Would you like to upload an invoice or receipt for it?</div>
    <label id="inv-dontask" onclick="_toggleInvoiceDontAsk()" style="display:flex;align-items:center;gap:9px;padding:9px 11px;border:.5px solid var(--border);border-radius:9px;background:var(--cream);margin-top:14px;cursor:pointer">
      <span id="inv-dontask-box" style="width:17px;height:17px;border-radius:4px;border:1.5px solid var(--gold-soft, #C9B89C);flex-shrink:0;display:flex;align-items:center;justify-content:center;background:transparent;transition:all .12s"></span>
      <span style="font-size:12.5px;color:var(--muted)">Don't ask me this again</span>
    </label>`;
  const openFn = sid ? `openSubAttachments('${bid}','${sid}')` : `openBudgetAttachments('${bid}')`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_applyInvoiceDontAsk();closeModalDirect()">Skip</button>
    <button class="btn btn-primary btn-sm" onclick="_applyInvoiceDontAsk();closeModalDirect();${openFn}">Upload</button>`;
  openModal('Add an invoice or receipt?', body, footer);
}
// "Don't ask me this again" opt-out for the invoice prompt. Ticking it (then
// pressing either button) hides the prompt via the same setting the budget
// show/hide popup controls, so the two stay in sync.
let _invoiceDontAsk=false;
function _toggleInvoiceDontAsk(){
  _invoiceDontAsk=!_invoiceDontAsk;
  const box=document.getElementById('inv-dontask-box');
  if(box){
    box.style.background=_invoiceDontAsk?'var(--gold)':'transparent';
    box.style.borderColor=_invoiceDontAsk?'var(--gold)':'var(--gold-soft, #C9B89C)';
    box.innerHTML=_invoiceDontAsk?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':'';
  }
}
function _applyInvoiceDontAsk(){
  if(_invoiceDontAsk){ _budgetHideMap().invoicePrompt=true; saveToStorage(); }
  _invoiceDontAsk=false;
}
let _batchDateCtx=null; // {prevDate, today, mode:'today'|'prev', applyDate(iso), revert(), previewB, previewS, previewKind}
let _batchRevertCtx=null; // {revert()} — used by Cancel to undo the whole paid/unpaid toggle
/* ══ v179 Linked checklist ↔ budget: one setting, three behaviours ══════════════
   STATE.settings.linkedMode
     1 = Automatic + Undo   — linked items update themselves; a toast says what changed
                              (Undo / Change). Unlinked money tasks get an "Add to budget" chip.
     2 = One sheet (default)— at most ONE pop-up per tick, every knock-on change as a
                              tick-box, the likely ones pre-ticked.
     3 = Automatic, ask about new costs — as 1 for linked items; an unlinked money task
                              opens one short "Add to budget?" sheet.
   Replaces the chain of up to five pop-ups per tick (deposit → balance task → booked
   placement → invoice → follow-up). Only explicit pay/deposit tasks change money on
   their own: ticking "Choose flowers" never marks Florals paid without asking. */
function _linkedMode(){ const m=STATE.settings&&STATE.settings.linkedMode; return (m===1||m===3)?m:2; }
function setLinkedMode(n){ if(!STATE.settings) STATE.settings={}; STATE.settings.linkedMode=n; saveToStorage(); navigate('settings'); }

// ── Toast (same look as the undo-delete toast) ──────────────────────────────
let _lkToastTimer=null, _lkUndoFn=null, _lkActFn=null;
const _LK_TICK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
function _lkToast(msgHtml, opts){
  opts=opts||{};
  _lkCloseToast(true);
  const wrap=document.getElementById('undo-toast-wrap'); if(!wrap) return;
  _lkUndoFn=opts.undo||null; _lkActFn=opts.action?opts.action.fn:null;
  const el=document.createElement('div');
  el.className='undo-toast lk-toast'; el.id='lk-toast'; el.setAttribute('role','status');
  el.innerHTML='<span class="ut-ico ok">'+_LK_TICK+'</span><span class="ut-msg">'+msgHtml+'</span>'
    +(_lkActFn?'<span class="ut-div"></span><button class="ut-undo" onclick="_lkToastAct()">'+_escHtml(opts.action.label)+'</button>':'')
    +(_lkUndoFn?'<span class="ut-div"></span><button class="ut-undo" onclick="_lkToastUndo()">Undo</button>':'')
    +'<button class="ut-x" aria-label="Dismiss" onclick="_lkCloseToast()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
  wrap.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('in'));
  _lkToastTimer=setTimeout(()=>_lkCloseToast(), 7000);
}
function _lkCloseToast(now){
  clearTimeout(_lkToastTimer);
  const el=document.getElementById('lk-toast'); if(!el) return;
  el.id=''; el.classList.remove('in');
  if(now) el.remove(); else setTimeout(()=>{ if(el.parentNode) el.remove(); }, 220);
}
function _lkToastUndo(){ const f=_lkUndoFn; _lkUndoFn=null; _lkCloseToast(); if(f) f(); }
function _lkToastAct(){ const f=_lkActFn; _lkActFn=null; _lkCloseToast(); if(f) f(); }

// ── Snapshot / restore for Undo ─────────────────────────────────────────────
function _lkSnap(b, tasks){
  return { bid:b?b.id:'', b:b?JSON.parse(JSON.stringify(b)):null,
           tasks:(tasks||[]).filter(Boolean).map(t=>JSON.parse(JSON.stringify(t))) };
}
function _lkRestore(sn){
  if(sn.b){ const b=STATE.budget.items.find(x=>x.id===sn.bid); if(b){ Object.keys(b).forEach(k=>delete b[k]); Object.assign(b, JSON.parse(JSON.stringify(sn.b))); } }
  sn.tasks.forEach(ts=>{ const t=STATE.checklist.find(x=>x.id===ts.id); if(t){ Object.keys(t).forEach(k=>delete t[k]); Object.assign(t, JSON.parse(JSON.stringify(ts))); } });
  saveToStorage(); if(typeof updateBudgetSummary==='function') updateBudgetSummary(); navigate(_currentPage);
}

// ── What a ticked linked task means for its payment ─────────────────────────
// kind: 'deposit' | 'paid' | 'nodeposit' (a deposit task, but no deposit set up) | 'none'
// auto: whether this change is clearly intended (an explicit pay/deposit/booked task).
function _lkTaskPlan(task, b, s){
  const done=!!task.done;
  const hasDep=_targetHasDeposit(b, s);
  const depPaid=hasDep ? !!_targetDepositPaid(b, s) : false;
  const paid = s ? !!s.paid : !!b.paid;
  const depWord=_taskDepositKeyword(task), soft=_taskSoftDepositKeyword(task), booked=_taskBookedKeywordTask(task);
  const payTask=depWord || _isMoneyCueTask(task);
  let kind='paid', auto=payTask;
  if(depWord || soft){
    if(hasDep) kind='deposit'; else if(depWord) kind=done?'nodeposit':'none';
  } else if(booked){
    // Booking means the deposit was paid — never the whole amount. Checked before the
    // money test because "book" also counts as a buying word.
    if(hasDep){ kind='deposit'; auto=true; } else { kind='none'; }
  }
  if(kind==='deposit' && depPaid===done) kind='none';
  if(kind==='paid' && paid===done) kind='none';
  const name = s ? `${b.name} › ${s.name}` : b.name;
  const depAmt = s ? Number(s.deposit||0) : calcBudgetDeposit(b);
  const owed = s ? Math.max(0, getSubItemAmount(s)-(s.depositPaid?Number(s.deposit||0):0)-calcSubInstallmentsPaid(s)) : calcBudgetBalance(b);
  return { kind, auto, done, name, depAmt, owed, hasDep, payTask };
}
function _lkApplyPayment(b, s, kind, makePaid, date){
  date=date||_todayISO();
  if(kind==='deposit'){
    const t=s||b; t.depositPaid=makePaid; if(makePaid) t.depositPaidDate=date;
  } else if(kind==='paid'){
    if(s){
      s.paid=makePaid; s.manualPaid=makePaid;
      if(makePaid){ s.paidDate=date; if(_budgetDepositUnpaid(b, s)){ s.depositPaid=true; if(!s.depositPaidDate) s.depositPaidDate=date; } }
      const ab=(b.subItems||[]).filter(x=>getSubItemAmount(x)>0);
      b.paid = ab.length>0 && ab.every(x=>x.paid);
      if(b.paid && !b.balancePaidDate) b.balancePaidDate=date;
    } else {
      b.paid=makePaid;
      if(makePaid){ b.balancePaidDate=date; if(_budgetDepositUnpaid(b, null)){ b.depositPaid=true; if(!b.depositPaidDate) b.depositPaidDate=date; } }
    }
  }
}
function _lkPayWords(P, makePaid){
  const n=_escHtml(P.name);
  if(P.kind==='deposit') return makePaid ? `<b>${n}</b> deposit marked paid` : `<b>${n}</b> deposit marked not paid`;
  return makePaid ? `<b>${n}</b> marked paid` : `<b>${n}</b> marked not paid`;
}

// ── Entry point: a linked checklist task was ticked or unticked ─────────────
function _linkedTaskTicked(task, b, s){
  const P=_lkTaskPlan(task, b, s);
  if(_linkedMode()===2) return _lkTaskSheet(task, b, s, P);
  if(P.kind==='nodeposit'){
    _lkToast(`<b>${_escHtml(P.name)}</b> has no deposit set up`, {action:{label:'Add deposit', fn:()=>{ _popupOrigin=_currentPage; _askAddSubDeposit(b, s, task); }}});
    return;
  }
  if(P.kind==='none' || !P.auto) return;
  const sn=_lkSnap(b, []);
  _lkApplyPayment(b, s, P.kind, P.done, _todayISO());
  saveToStorage(); updateBudgetSummary(); navigate(_currentPage);
  _lkToast(_lkPayWords(P, P.done)+(P.done?' · today':''), {
    undo:()=>_lkRestore(sn),
    action: P.done ? {label:'Change', fn:()=>_lkChangeDialog(task.id, b.id, s?s.id:'', P.kind, sn)} : null });
}

// Change (from the toast): which payment, and the paid date.
let _lkChg=null;
function _lkChangeDialog(taskId, bid, sid, kind, sn){
  const b=STATE.budget.items.find(x=>x.id===bid); if(!b) return;
  const s=sid?b.subItems?.find(x=>x.id===sid):null;
  _lkChg={taskId,bid,sid,sn};
  const hasDep=_targetHasDeposit(b, s);
  const name=_escHtml(s?`${b.name} › ${s.name}`:b.name);
  const radio=(v,l,on)=>`<label class="lk-opt"><input type="radio" name="lk-chg-kind" value="${v}" ${on?'checked':''}/><span><span class="lk-ot">${l}</span></span></label>`;
  const body=`<div class="lk-sheet">
    ${hasDep?`<div class="lk-lbl">Which payment for ${name}?</div>${radio('deposit','The deposit',kind==='deposit')}${radio('paid','Paid in full',kind!=='deposit')}`:''}
    <div class="lk-lbl" style="margin-top:${hasDep?'12px':'0'}">Paid on</div>
    <input type="date" class="form-input" id="lk-chg-date" value="${_todayISO()}" style="max-width:190px"/>
  </div>`;
  openModal('Change payment', body, `<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Cancel</button><button class="btn btn-primary btn-sm" onclick="_lkChangeSave()">Save</button>`);
}
function _lkChangeSave(){
  const c=_lkChg; _lkChg=null; if(!c){ closeModalDirect(); return; }
  const k=(document.querySelector('input[name="lk-chg-kind"]:checked')||{}).value||'paid';
  const d=(document.getElementById('lk-chg-date')||{}).value||_todayISO();
  _lkRestore(c.sn);
  const b=STATE.budget.items.find(x=>x.id===c.bid); const s=c.sid?b?.subItems?.find(x=>x.id===c.sid):null;
  if(b) _lkApplyPayment(b, s, k, true, d);
  saveToStorage(); updateBudgetSummary(); closeModalDirect(); navigate(_currentPage);
}

// ── The one sheet (mode 2) ──────────────────────────────────────────────────
let _lkSheetCtx=null;
function _lkLine(id, checked, title, sub, extraHtml){
  return `<label class="lk-opt"><input type="checkbox" id="${id}" ${checked?'checked':''}/><span><span class="lk-ot">${title}</span>${sub?`<br><span class="lk-os">${sub}</span>`:''}${extraHtml||''}</span></label>`;
}
function _lkExtras(task){
  const out=[];
  if(task && task.done && !(STATE.settings && STATE.settings.suggestFollowUp===false))
    out.push(_lkLine('lk-x-follow', false, 'Add a follow-up task', `“Follow up: ${_escHtml(task.text||'')}”`));
  if(task && task.done && task.pinned && !(STATE.settings && STATE.settings.askUnpinOnComplete===false))
    out.push(_lkLine('lk-x-unpin', true, 'Remove from the dashboard', 'It’s pinned there'));
  return out;
}
function _lkApplyExtras(task){
  if(!task) return;
  if(document.getElementById('lk-x-follow')?.checked){
    STATE.checklist.push({ id:'cl'+Date.now()+'f', text:`Follow up: ${(task.text||'').trim()}`, done:false, dueDate:'',
      category:task.category||'', notes:'', pinned:false });
  }
  if(document.getElementById('lk-x-unpin')?.checked) task.pinned=false;
}
function _lkTaskSheet(task, b, s, P){
  const lines=[];
  if(P.kind==='deposit' || P.kind==='paid'){
    const amt = P.kind==='deposit' ? P.depAmt : P.owed;
    const title = P.done
      ? (P.kind==='deposit' ? `Mark the deposit paid — ${fmt(amt)}` : `Mark ${_escHtml(s?s.name:b.name)} paid — ${fmt(amt)}`)
      : (P.kind==='deposit' ? 'Mark the deposit as not paid' : `Mark ${_escHtml(s?s.name:b.name)} as not paid`);
    const dateHtml = P.done ? `<span class="lk-date">Paid on <input type="date" id="lk-pay-date" value="${_todayISO()}"/></span>` : '';
    lines.push(_lkLine('lk-pay', P.auto, title, P.auto?'':'This task doesn’t say it’s a payment, so it’s not ticked', dateHtml));
  }
  if(P.kind==='nodeposit') lines.push(_lkLine('lk-adddep', false, `Record a deposit for ${_escHtml(P.name)}`, 'No deposit is set up yet'));
  if(P.done && P.kind==='deposit'){
    const balOwed=Math.max(0, P.owed-P.depAmt);
    const hasBalTask=STATE.checklist.some(t=>t.id!==task.id && t.budgetId===b.id && (t.budgetSubId||'')===(s?s.id:'') && !_taskDepositKeyword(t));
    if(balOwed>0 && !hasBalTask) lines.push(_lkLine('lk-baltask', false, `Add a task to pay the balance — ${fmt(balOwed)}`, (s?s.balanceDueDate:b.balanceDueDate)?`Due ${fmtDate(s?s.balanceDueDate:b.balanceDueDate)}`:''));
  }
  if(P.done && (P.kind==='deposit' || P.kind==='paid')) lines.push(_lkLine('lk-invoice', false, 'Attach an invoice or receipt', 'Opens the item’s documents'));
  _lkExtras(task).forEach(x=>lines.push(x));
  if(!lines.length) return;
  _lkSheetCtx={type:'task', taskId:task.id, bid:b.id, sid:s?s.id:'', kind:P.kind, done:!!task.done, label:task.text||''};
  openModal(`${_escHtml(P.name)} — also update?`, `<div class="lk-sheet">${lines.join('')}</div>`,
    `<button class="btn btn-primary btn-sm" onclick="_lkSheetSave()">Save</button>`);
}
/* × or Escape on a sheet asks whether to keep the tick (Mandy's choice, v179): the sheet
   closes, then one small question — Undo the tick / Keep it. Nothing on the sheet is
   applied either way. × on the question itself keeps the tick (the least destructive). */
let _lkKeepCtx=null;
function _lkAskKeep(){
  const c=_lkSheetCtx; _lkSheetCtx=null; closeModalDirect(); navigate(_currentPage);
  if(!c) return;
  _lkKeepCtx=c;
  const isPay=c.type==='pay';
  const title = isPay ? 'Keep the payment change?' : (c.done ? 'Keep the task ticked?' : 'Keep the task unticked?');
  const what = isPay
    ? `<b>${_escHtml(c.label)}</b> is marked ${c.makeDone?'paid':'not paid'}.`
    : `“${_escHtml(c.label)}” is ${c.done?'ticked':'unticked'}.`;
  openModal(title, `<div style="font-size:13px;color:var(--ink);line-height:1.5">${what} Nothing else has changed.</div>`,
    `<button class="btn btn-outline btn-sm" onclick="_lkKeepUndo()">${isPay?'Undo it':'Undo the tick'}</button><button class="btn btn-primary btn-sm" onclick="_lkKeepYes()">${isPay?'Keep it':(c.done?'Keep it ticked':'Keep it unticked')}</button>`);
}
function _lkKeepYes(){ _lkKeepCtx=null; closeModalDirect(); navigate(_currentPage); }
function _lkKeepUndo(){
  const c=_lkKeepCtx; _lkKeepCtx=null; closeModalDirect();
  if(!c){ navigate(_currentPage); return; }
  if(c.type==='pay'){
    if(typeof c.revert==='function') c.revert();
    saveToStorage(); if(typeof updateBudgetSummary==='function') updateBudgetSummary(); navigate(_currentPage);
  } else {
    // A silent re-toggle restores the task and the linked flags it set, and opens nothing.
    toggleCheck(c.taskId, true);
  }
}
function _lkSheetSkip(){ _lkSheetCtx=null; closeModalDirect(); navigate(_currentPage); }
function _lkSheetSave(){
  const c=_lkSheetCtx; _lkSheetCtx=null; if(!c){ closeModalDirect(); return; }
  let after=null;
  if(c.type==='task'){
    const task=STATE.checklist.find(x=>x.id===c.taskId);
    const b=STATE.budget.items.find(x=>x.id===c.bid); const s=c.sid?b?.subItems?.find(x=>x.id===c.sid):null;
    if(task && b){
      if(document.getElementById('lk-pay')?.checked){
        const d=(document.getElementById('lk-pay-date')||{}).value||_todayISO();
        _lkApplyPayment(b, s, c.kind, !!task.done, d);
      }
      if(document.getElementById('lk-baltask')?.checked){
        const targetName=s?s.name:b.name;
        STATE.checklist.push({id:'cl'+Date.now()+'b', text:`Pay balance — ${targetName}`, done:false,
          dueDate:(s?s.balanceDueDate:b.balanceDueDate)||'', category:task.category||'', notes:'', pinned:false, budgetId:b.id, budgetSubId:s?s.id:''});
      }
      if(document.getElementById('lk-adddep')?.checked) after=()=>{ _popupOrigin=_currentPage; _askAddSubDeposit(b, s, task); };
      if(document.getElementById('lk-invoice')?.checked) after=()=>{ s?openSubAttachments(b.id, s.id):openBudgetAttachments(b.id); };
      _lkApplyExtras(task);
    }
  } else if(c.type==='pay'){
    c.tasks.forEach((tid,ix)=>{ if(document.getElementById('lk-t-'+ix)?.checked){ const t=STATE.checklist.find(x=>x.id===tid); if(t) t.done=c.makeDone; } });
    if(c.invoice && document.getElementById('lk-invoice')?.checked) after=()=>{ c.invoice.sid?openSubAttachments(c.invoice.bid, c.invoice.sid):openBudgetAttachments(c.invoice.bid); };
  } else if(c.type==='unlinked'){
    const task=STATE.checklist.find(x=>x.id===c.taskId);
    const v=(document.querySelector('input[name="lk-u"]:checked')||{}).value||'';
    if(task){
      _lkApplyExtras(task);
      if(v.startsWith('m')){
        const m=c.matches[+v.slice(1)];
        if(m){ STATE.budget.items.forEach(bb=>{ if(bb.checklistId===task.id) bb.checklistId=''; });
               task.budgetId=m.bid; task.budgetSubId=m.sid||''; delete task._lkChip;
               after=()=>_lkToast(`Linked to <b>${_escHtml(m.label)}</b>`); }
      } else if(v==='pick'){ delete task._lkChip; after=()=>_completeLinkExisting(task.id); }
      else if(v==='notcost'){ task.notCost=true; delete task._lkChip; }
    }
  }
  saveToStorage(); if(typeof updateBudgetSummary==='function') updateBudgetSummary();
  closeModalDirect(); navigate(_currentPage);
  if(after) setTimeout(after, 60);
}

// ── Entry point: an unlinked task that sounds like a cost was ticked done ───
function _unlinkedMoneyTicked(task){
  if(_linkedMode()===1){ task._lkChip=true; saveToStorage(); navigate(_currentPage); return; }
  _lkUnlinkedSheet(task.id);
}
function _lkUnlinkedSheet(taskId){
  const task=STATE.checklist.find(x=>x.id===taskId); if(!task) return;
  const matches=(typeof _suggestBudgetMatches==='function' ? _suggestBudgetMatches(`${task.text||''} ${task.notes||''}`, 2) : [])||[];
  const radio=(v,t,sub,on)=>`<label class="lk-opt"><input type="radio" name="lk-u" value="${v}" ${on?'checked':''}/><span><span class="lk-ot">${t}</span>${sub?`<br><span class="lk-os">${sub}</span>`:''}</span></label>`;
  const rows=matches.map((m,i)=>radio('m'+i, `Link to ${_escHtml(m.label)}`, i===0?'Suggested match':'', i===0)).join('')
    + radio('pick', matches.length?'Choose another budget item…':'Choose a budget item…', 'Opens the task so you can pick or create one', !matches.length)
    + radio('notcost', 'Not a cost', 'Stop suggesting this for this task', false);
  const extras=_lkExtras(task).join('');
  _lkSheetCtx={type:'unlinked', taskId, matches, done:true, label:task.text||''};
  openModal('Add this to your budget?', `<div class="lk-sheet"><div class="lk-intro">“${_escHtml(task.text||'')}” sounds like a cost.</div>${rows}${extras?`<div class="lk-sep"></div>${extras}`:''}</div>`,
    `<button class="btn btn-outline btn-sm" onclick="_lkSheetSkip()">Skip</button><button class="btn btn-primary btn-sm" onclick="_lkSheetSave()">Save</button>`);
}
function _lkChipHtml(i){
  if(!i || !i._lkChip || i.budgetId || i.notCost) return '';
  return `<button type="button" class="lk-chip cl-detail-wide" onclick="event.stopPropagation();_lkUnlinkedSheet('${i.id}')">+ Add to budget</button>`;
}

// ── Entry point: a payment was ticked/unticked in the Budget ────────────────
// tasks: linked checklist tasks that may need to follow. Payment date is already set
// by the caller (today); it can be changed on the payment row.
function _lkPaymentChanged(tasks, makeDone, contextName, revertFn){
  const invoice=_pendingInvoicePrompt; _pendingInvoicePrompt=null;
  const seen=new Set();
  const pending=(tasks||[]).filter(t=>t && !!t.done!==makeDone && !seen.has(t.id) && seen.add(t.id));
  if(!pending.length) return;
  if(_linkedMode()===2){
    const lines=pending.map((t,ix)=>_lkLine('lk-t-'+ix, true, `${makeDone?'Tick':'Untick'} “${_escHtml(t.text||'')}”`, 'The linked checklist task'));
    if(makeDone && invoice) lines.push(_lkLine('lk-invoice', false, 'Attach an invoice or receipt', 'Opens the item’s documents'));
    _lkSheetCtx={type:'pay', tasks:pending.map(t=>t.id), makeDone, invoice, revert:revertFn||null, label:contextName||'Payment'};
    openModal(`${_escHtml(contextName||'Payment')} — also update?`, `<div class="lk-sheet">${lines.join('')}</div>`,
      `<button class="btn btn-primary btn-sm" onclick="_lkSheetSave()">Save</button>`);
    return;
  }
  const sn=_lkSnap(null, pending);
  pending.forEach(t=>{ t.done=makeDone; });
  saveToStorage(); navigate(_currentPage);
  const what = pending.length===1 ? `“${_escHtml(pending[0].text||'')}”` : `${pending.length} linked tasks`;
  _lkToast(`Also ${makeDone?'ticked':'unticked'} ${what}`, {undo:()=>_lkRestore(sn)});
}

// ── Budget item ⋯ menu: Add balance task (replaces the pop-up that offered it) ──
function _itemMenuAddBalanceTask(bid){
  const b=STATE.budget.items.find(x=>x.id===bid); if(!b) return;
  const text=`Pay balance — ${b.name}`;
  if(STATE.checklist.some(t=>t.budgetId===bid && !t.budgetSubId && (t.text||'')===text)){ _lkToast(`“${_escHtml(text)}” is already on your checklist`); return; }
  const t={id:'cl'+Date.now(), text, done:false, dueDate:b.balanceDueDate||'', category:'', notes:'', pinned:false, budgetId:bid, budgetSubId:''};
  STATE.checklist.push(t); saveToStorage(); navigate(_currentPage);
  _lkToast(`Added “${_escHtml(text)}” to your checklist`, {undo:()=>{ STATE.checklist=STATE.checklist.filter(x=>x.id!==t.id); saveToStorage(); navigate(_currentPage); }});
}

// v179: budget-side ticks now go through _lkPaymentChanged (one sheet / auto + Undo).
function _askTaskDoneBatch(tasks, makeDone, contextName, dateCtx, revertCtx){
  if(makeDone && dateCtx && typeof dateCtx.applyDate==='function') dateCtx.applyDate(_todayISO());
  return _lkPaymentChanged(tasks, makeDone, contextName, (dateCtx&&dateCtx.revert)||(revertCtx&&revertCtx.revert)||null);
}
function _askTaskDoneBatch_LEGACY(tasks, makeDone, contextName, dateCtx, revertCtx){
  // Only tasks whose done-state differs from the target
  const pending=(tasks||[]).filter(t=>t && !!t.done!==makeDone);
  // De-dupe by id
  const seen=new Set(); _batchTasks=pending.filter(t=>{ if(seen.has(t.id))return false; seen.add(t.id); return true; });
  _batchDateCtx = dateCtx || null;
  _batchRevertCtx = revertCtx || null;
  // Nothing to ask AND no date to record → finish silently.
  if(!_batchTasks.length && !_batchDateCtx){ _maybeFireInvoicePrompt(); return; }
  // Date context but no meaningful date choice (no/cleared previous date) AND no
  // linked task to confirm → the "Mark as paid" pop-up adds nothing. Apply the
  // already-set (today's) date silently and skip straight to the invoice prompt.
  if(_batchDateCtx && !_batchTasks.length){
    const _today=_todayISO();
    const _hasChoice = _batchDateCtx.prevDate && _batchDateCtx.prevDate!==_today;
    // "Always mark paid today" setting: suppress the date pop-up entirely and
    // always record today's date, even if a different previous date is remembered.
    const _alwaysToday = !!(STATE.settings && STATE.settings.alwaysMarkPaidToday);
    if(!_hasChoice || _alwaysToday){
      if(typeof _batchDateCtx.applyDate==='function') _batchDateCtx.applyDate(_today);
      _batchDateCtx=null;
      saveToStorage();
      _maybeFireInvoicePrompt();
      return;
    }
  }
  _batchMakeDone=makeDone; _depReturnPage=_popupOrigin;
  if(_batchDateCtx){ _batchDateCtx.today=_todayISO(); _batchDateCtx.mode='today'; _batchDateCtx.customDate=''; }
  _batchTitle = _batchDateCtx ? 'Set payment date'
              : (makeDone ? 'Also mark linked tasks done?' : 'Also un-check linked tasks?');
  openModal(_batchTitle, _renderBatchBody(contextName||''), _renderBatchFooter());
}
// The date-recorder block (only when a different previous paid date is remembered).
function _renderBatchDateBlock(){
  const d=_batchDateCtx; if(!d) return '';
  const preview = d.previewB ? _budgetPreviewCard(d.previewB, d.previewS||null, d.previewKind||'') : '';
  const hasChoice = d.prevDate && d.prevDate!==d.today;
  if(!hasChoice){
    return `${preview}<div style="font-size:11.5px;color:var(--muted);margin:8px 0 2px">Paid date recorded as <strong style="color:var(--ink)">today</strong>.</div>`;
  }
  return `${preview}<div style="background:var(--surface);border-radius:8px;padding:8px 11px;margin-top:10px;display:flex;flex-direction:column;gap:9px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <span style="font-size:12px;color:var(--ink)">Record paid date as</span>
        <span style="display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <button type="button" id="bdseg-today" onclick="_setBatchDateMode('today')" style="font-size:12px;padding:6px 13px;border:none;cursor:pointer;background:var(--gold);color:#fff">Today</button>
          <button type="button" id="bdseg-prev" onclick="_setBatchDateMode('prev')" style="font-size:12px;padding:6px 13px;border:none;cursor:pointer;border-left:1px solid var(--border);background:transparent;color:var(--muted)">${fmtBudgetDate(d.prevDate)}</button>
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end">
        <span id="bd-custom-lead" style="font-size:11.5px;color:var(--muted)">Or pick a date</span>
        <input type="date" id="bd-custom-input" class="form-input" style="width:auto;font-size:12px;padding:5px 9px;height:auto" onchange="_setBatchCustomDate(this.value)"/>
      </div>
    </div>${_renderAlwaysTodayCheckbox()}`;
}
// "Always mark paid today" opt-out checkbox (soft outline box). Saves to settings
// on toggle so future date pop-ups are suppressed and always default to today.
let _batchAlwaysToday=false;
function _renderAlwaysTodayCheckbox(){
  _batchAlwaysToday=false;
  return `<label id="batch-always-today" onclick="_toggleAlwaysToday()" style="display:flex;align-items:center;gap:9px;padding:11px 11px 9px;border-top:.5px solid var(--border);margin-top:10px;cursor:pointer">
      <span id="bat-box" style="width:17px;height:17px;border-radius:4px;border:1.5px solid var(--gold-soft, #C9B89C);flex-shrink:0;display:flex;align-items:center;justify-content:center;background:transparent;transition:all .12s"></span>
      <span style="font-size:12.5px;color:var(--muted)">Always mark paid today</span>
    </label>`;
}
function _toggleAlwaysToday(){
  _batchAlwaysToday=!_batchAlwaysToday;
  const box=document.getElementById('bat-box');
  if(box){
    box.style.background=_batchAlwaysToday?'var(--gold)':'transparent';
    box.style.borderColor=_batchAlwaysToday?'var(--gold)':'var(--gold-soft, #C9B89C)';
    box.innerHTML=_batchAlwaysToday?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':'';
  }
}
function _setBatchDateMode(mode){
  if(!_batchDateCtx) return;
  _batchDateCtx.mode=mode;
  const today=document.getElementById('bdseg-today'), prev=document.getElementById('bdseg-prev');
  if(today){ today.style.background = mode==='today'?'var(--gold)':'transparent'; today.style.color = mode==='today'?'#fff':'var(--muted)'; }
  if(prev){ prev.style.background = mode==='prev'?'var(--gold)':'transparent'; prev.style.color = mode==='prev'?'#fff':'var(--muted)'; }
  // Highlight the picked-date field when it's the active choice.
  const lead=document.getElementById('bd-custom-lead'), inp=document.getElementById('bd-custom-input');
  if(mode==='custom' && _batchDateCtx.customDate){
    if(lead){ lead.textContent='Using this date →'; lead.style.color='var(--gold-deep)'; lead.style.fontWeight='600'; }
    if(inp){ inp.style.borderColor='var(--gold)'; }
  } else {
    if(lead){ lead.textContent='Or pick a date'; lead.style.color='var(--muted)'; lead.style.fontWeight='400'; }
    if(inp){ inp.style.borderColor='var(--border)'; }
  }
}
// Custom date chosen in the batch modal: reveal the custom segment, hide the link,
// store the date, and select it. Uses the label-wrapped input (iframe-safe).
function _setBatchCustomDate(val){
  if(!_batchDateCtx) return;
  if(!val){ _batchDateCtx.customDate=''; if(_batchDateCtx.mode==='custom') _batchDateCtx.mode='today'; _setBatchDateMode(_batchDateCtx.mode); return; }
  _batchDateCtx.customDate=val;
  const inp=document.getElementById('bd-custom-input'); if(inp && inp.value!==val) inp.value=val;
  _setBatchDateMode('custom');
}
// Resolve the chosen batch paid date from the current mode.
function _resolveBatchDate(){
  if(!_batchDateCtx) return _todayISO();
  if(_batchDateCtx.mode==='custom' && _batchDateCtx.customDate) return _batchDateCtx.customDate;
  if(_batchDateCtx.mode==='prev') return _batchDateCtx.prevDate;
  return _batchDateCtx.today;
}
function _renderBatchBody(contextName){
  const dateBlock = _renderBatchDateBlock();
  const tasksHeading = (_batchDateCtx && _batchTasks.length)
    ? `<div style="font-size:12.5px;color:var(--ink);line-height:1.5;margin:12px 0 4px">Also ${_batchMakeDone?'mark':'un-check'} the linked checklist ${_batchTasks.length>1?'tasks':'task'}?</div>`
    : (!_batchDateCtx && contextName ? `<div style="font-size:13px;line-height:1.5;color:var(--ink);margin-bottom:4px">${_batchMakeDone?'Marking':'Un-checking'} <strong>${contextName}</strong> ${_batchTasks.length>1?'affects these linked checklist tasks:':'affects this linked checklist task:'}</div>` : '');
  const intro = dateBlock + tasksHeading;
  // Animated all-or-nothing preview rows. The first row carries the cbm-target
  // hooks so the confirm animation ticks/un-ticks it; the others are static
  // previews and follow the same direction.
  const eyebrow = _batchTasks.length ? `<div style="font-size:10px;color:var(--gold-deep);text-transform:uppercase;letter-spacing:.06em;margin:8px 0 4px">In your checklist</div>` : '';
  const rows = _batchTasks.map((t,i)=>{
    // In the pure task popup the first row owns the primary cbm-target. In the
    // date flow the budget preview owns cbm-target, so the first task row gets a
    // secondary hook (cbm-target2) that the confirm animation also drives.
    const primaryAnim = !_batchDateCtx && i===0;
    const secondaryAnim = !!_batchDateCtx && i===0;
    const rowIdAttr = primaryAnim ? ' id="cbm-target-row"' : (secondaryAnim ? ' id="cbm-target2-row"' : '');
    const cbId = primaryAnim ? 'cbm-target' : (secondaryAnim ? 'cbm-target2' : '');
    return `<div${rowIdAttr} style="background:var(--cream);border:1px solid var(--border);border-radius:9px;padding:9px 11px;display:flex;align-items:flex-start;gap:9px;margin-bottom:6px">
      ${_cbMini(!!t.done,16,cbId)}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--ink);${t.done?'text-decoration:line-through;opacity:.6':''}">${t.text}</div>
        ${_taskPreviewMeta(t)}
      </div>
    </div>`;
  }).join('');
  return intro+eyebrow+rows;
}
// Remove orphaned select-all helpers (no longer used in the animated style),
// keeping no-op stubs in case any inline handler still references them.
function _toggleBatchSelectAll(on){}
function _syncBatchSelectAll(){}
function _renderBatchFooter(){
  // Red "Cancel" pinned bottom-left in every variant — reverts the whole paid/unpaid
  // toggle so the checkbox returns to its prior state (the × does the same). "Skip" keeps
  // the box checked but records no date / doesn't sync linked tasks.
  const cancelBtn = `<button class="btn btn-danger btn-sm" style="margin-right:auto" onclick="_batchCancel()">Cancel</button>`;
  if(_batchDateCtx){
    // Date popup: animate the budget (and linked-task) checkbox on confirm, like
    // the other linked-task popups. Skip records the date but leaves the task.
    const dir = _batchMakeDone ? 'on' : 'off';
    const hasTask = _batchTasks.length>0;
    const confirmLabel = hasTask
      ? (_batchTasks.length>1
          ? (_batchMakeDone ? 'Save & mark all done' : 'Save & un-check all')
          : (_batchMakeDone ? 'Save & mark task done' : 'Save & un-check task'))
      : 'Save';
    if(!hasTask){
      return `${cancelBtn}
        <button class="btn btn-primary btn-sm" onclick="_animConfirmThenApply(_batchApplyChecked,'${dir}')">Save</button>`;
    }
    return `${cancelBtn}
      <button class="btn btn-outline btn-sm" onclick="_batchSkipKeepDate()">Skip</button>
      <button class="btn btn-primary btn-sm" onclick="_animConfirmThenApply(_batchApplyChecked,'${dir}')">${confirmLabel}</button>`;
  }
  // Pure task-sync popup: Skip leaves tasks unchanged; confirm animates then applies to all.
  const dir = _batchMakeDone ? 'on' : 'off';
  const confirmLabel = _batchTasks.length>1
    ? (_batchMakeDone ? 'Mark all done' : 'Un-check all')
    : (_batchMakeDone ? 'Mark task done' : 'Un-check task');
  return `${cancelBtn}
    <button class="btn btn-outline btn-sm" onclick="_batchSkip()">Skip</button>
    <button class="btn btn-primary btn-sm" onclick="_animConfirmThenApply(_batchApplyChecked,'${dir}')">${confirmLabel}</button>`;
}
// Skip in the date flow: keep the item checked/paid, but record NO paid date (clear any
// auto-stamped date) and leave the linked task as-is.
function _batchSkipKeepDate(){
  if(_batchAlwaysToday){
    if(!STATE.settings) STATE.settings={};
    STATE.settings.alwaysMarkPaidToday=true;
    if(_batchDateCtx){ _batchDateCtx.mode='today'; }
  }
  // Clear the paid date rather than applying one — Skip means "paid, no date".
  if(_batchDateCtx && typeof _batchDateCtx.applyDate==='function'){
    _batchDateCtx.applyDate('');
  }
  _batchTasks=[]; _batchDateCtx=null; _batchRevertCtx=null;
  closeModalDirect(); saveToStorage();
  if(_maybeFireInvoicePrompt()) return;
  navigate(_popupReturn());
}
// Skip the task-sync without changing any task done-states.
function _batchSkip(){
  _batchTasks=[]; _batchDateCtx=null; _batchRevertCtx=null;
  closeModalDirect(); saveToStorage();
  if(_maybeFireInvoicePrompt()) return;
  navigate(_popupReturn());
}
function _batchCancel(){
  // Cancel reverts the whole paid/unpaid toggle so the Payment returns to
  // its state before being checked/unchecked, and no tasks are changed.
  if(_batchDateCtx && typeof _batchDateCtx.revert==='function'){ _batchDateCtx.revert(); }
  else if(_batchRevertCtx && typeof _batchRevertCtx.revert==='function'){ _batchRevertCtx.revert(); }
  _batchTasks=[]; _batchDateCtx=null; _batchRevertCtx=null; _pendingInvoicePrompt=null;
  closeModalDirect();
  saveToStorage();
  navigate(_popupReturn());
}
function _batchApplyChecked(){
  // Persist the "always mark paid today" opt-out if it was ticked.
  if(_batchAlwaysToday){
    if(!STATE.settings) STATE.settings={};
    STATE.settings.alwaysMarkPaidToday=true;
    // Force today's date when opting out, regardless of the segmented choice.
    if(_batchDateCtx){ _batchDateCtx.mode='today'; }
  }
  // Record the paid date if a date context is present.
  if(_batchDateCtx && typeof _batchDateCtx.applyDate==='function'){
    const iso = _resolveBatchDate();
    _batchDateCtx.applyDate(iso);
  }
  // Apply the new done-state to all linked tasks (all-or-nothing).
  _batchTasks.forEach(t=>{ const c=STATE.checklist.find(x=>x.id===t.id); if(c) c.done=_batchMakeDone; });
  _batchTasks=[]; _batchDateCtx=null; _batchRevertCtx=null;
  closeModalDirect(); saveToStorage();
  if(_maybeFireInvoicePrompt()) return;
  navigate(_popupReturn());
}
function _batchResolveOne(taskId, apply){
  if(apply){ const t=STATE.checklist.find(x=>x.id===taskId); if(t) t.done=_batchMakeDone; }
  _batchTasks=_batchTasks.filter(t=>t.id!==taskId);
  if(!_batchTasks.length){ closeModalDirect(); saveToStorage(); if(_maybeFireInvoicePrompt()) return; navigate(_popupReturn()); return; }
  // Re-render remaining rows in place
  document.getElementById('modal-body').innerHTML=_renderBatchBody('');
  document.getElementById('modal-footer').innerHTML=_renderBatchFooter();
}
function _batchResolveAll(apply){
  if(apply){ _batchTasks.forEach(t=>{ const c=STATE.checklist.find(x=>x.id===t.id); if(c) c.done=_batchMakeDone; }); }
  _batchTasks=[];
  closeModalDirect(); saveToStorage();
  if(_maybeFireInvoicePrompt()) return;
  navigate(_popupReturn());
}

// ── Generic merged question-set pop-up ───────────────────────────────────────
// Presents several independent yes/no questions in ONE modal, each with its own
// Skip / confirm buttons, plus a Skip all / Apply footer. Collapses to a simple
// single-question pop-up when only one question applies. Each question is:
//   { id, text, yesLabel, noLabel, apply: fn }
let _qsQuestions=[]; let _qsTitle=''; let _qsIntro=''; let _qsApplyAllLabel='Apply';
function _askQuestionSet(title, intro, questions, applyAllLabel){
  _qsQuestions = (questions||[]).filter(Boolean);
  if(!_qsQuestions.length) return;
  _qsTitle = title; _qsIntro = intro||''; _qsApplyAllLabel = applyAllLabel||'Apply';
  _depReturnPage = _popupOrigin;
  if(_qsQuestions.length===1){
    const q=_qsQuestions[0];
    const body=`<div style="font-size:13px;line-height:1.5;color:var(--ink)">${q.text}</div>`;
    const footer=`<button class="btn btn-outline btn-sm" onclick="_qsResolveAll(false)">${q.noLabel||'Skip'}</button>
      <button class="btn btn-primary btn-sm" onclick="_qsResolveOne('${q.id}',true)">${q.yesLabel||'Yes'}</button>`;
    openModal(title, body, footer);
    return;
  }
  openModal(title, _renderQsBody(), _renderQsFooter());
}
function _renderQsBody(){
  const intro = _qsIntro?`<div style="font-size:13px;line-height:1.5;color:var(--ink);margin-bottom:10px">${_qsIntro}</div>`:'';
  const rows = _qsQuestions.map(q=>`<div id="qrow-${q.id}" style="border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:9px;background:var(--surface)">
    <div style="font-size:12.5px;color:var(--ink);margin-bottom:8px">${q.text}</div>
    <div style="display:flex;gap:6px">
      <button class="btn btn-outline btn-sm" style="flex:1;font-size:11.5px;padding:6px" onclick="_qsResolveOne('${q.id}',false)">${q.noLabel||'Skip'}</button>
      <button class="btn btn-primary btn-sm" style="flex:1;font-size:11.5px;padding:6px" onclick="_qsResolveOne('${q.id}',true)">${q.yesLabel||'Yes'}</button>
    </div>
  </div>`).join('');
  return intro+rows;
}
function _renderQsFooter(){
  return `<button class="btn btn-outline btn-sm" onclick="_qsResolveAll(false)">Skip all</button>
    <button class="btn btn-primary btn-sm" onclick="_qsResolveAll(true)">${_qsApplyAllLabel}</button>`;
}
function _qsResolveOne(id, apply){
  const q=_qsQuestions.find(x=>x.id===id);
  if(q && apply){ try{ q.apply(); }catch(e){} }
  _qsQuestions=_qsQuestions.filter(x=>x.id!==id);
  if(!_qsQuestions.length){ closeModalDirect(); saveToStorage(); navigate(_popupReturn()); return; }
  document.getElementById('modal-body').innerHTML=_renderQsBody();
  document.getElementById('modal-footer').innerHTML=_renderQsFooter();
}
function _qsResolveAll(apply){
  if(apply){ _qsQuestions.forEach(q=>{ try{ q.apply(); }catch(e){} }); }
  _qsQuestions=[];
  closeModalDirect(); saveToStorage(); navigate(_popupReturn());
}

// When a deposit is UNCHECKED, offer (in one merged pop-up) to also uncheck the
// related balance/sub-item, and the linked checklist task — only for things that
// are currently checked/done so there's never a redundant question.
function _askDepositUncheckCascade(b, s){
  const questions=[];
  const targetName = s ? `${b.name} › ${s.name}` : b.name;
  if(s){
    // Sub-item deposit unchecked → offer to uncheck the sub-item itself.
    if(s.paid){
      questions.push({
        id:'subpaid', text:'Also uncheck the remaining balance for this item?',
        yesLabel:'Uncheck', noLabel:'Leave checked',
        apply:()=>{ s.paid=false; s.manualPaid=false;
          // Cascading off a sub-item may flip the parent item's paid state.
          if(b.subItems && b.subItems.length){
            const amountBearing=b.subItems.filter(x=>getSubItemAmount(x)>0);
            b.paid = amountBearing.length>0 && amountBearing.every(x=>x.paid);
          }
        }
      });
    }
  } else {
    // Item deposit unchecked → offer to uncheck the item's remaining balance.
    if(b.paid){
      questions.push({
        id:'balpaid', text:'Also uncheck the remaining balance?',
        yesLabel:'Uncheck', noLabel:'Leave checked',
        apply:()=>{ b.paid=false; }
      });
    }
  }
  // Linked checklist task currently done → offer to uncheck it too.
  const lt=_findPayDepositTask(b, s);
  if(lt && lt.done){
    questions.push({
      id:'task', text:`Also uncheck linked task “${lt.text}”?`,
      yesLabel:'Uncheck', noLabel:'Keep checked',
      apply:()=>{ const t=STATE.checklist.find(x=>x.id===lt.id); if(t) t.done=false; }
    });
  }
  if(!questions.length) return false;
  const lt2=_findPayDepositTask(b, s);
  const previews = _budgetPreviewCard(b, s, 'deposit') + (lt2 ? _taskChecklistPreview(lt2) : '');
  const intro = `You unchecked the deposit for <strong>${targetName}</strong>.${previews}`;
  _askQuestionSet('Deposit unchecked', questions.length>1?intro+' A few related things — choose for each:':intro, questions, 'Apply');
  return true;
}
function togglePin(id){
  const i=STATE.checklist.find(x=>x.id===id); if(i)i.pinned=!i.pinned; navigate('checklist');
}
function getCategoryOptions(selected=''){
  const cats=[...new Set([
    ...(STATE.checklistCategories||[]),
    ...STATE.checklist.map(i=>i.category).filter(Boolean)
  ])].filter(Boolean).sort();
  const noneSel = (!selected || selected==='None') ? 'selected' : '';
  const noneOpt = `<option value="" ${noneSel}>None</option>`;
  const catOpts = cats.map(c=>`<option value="${c}" ${c===selected?'selected':''}>${c}</option>`).join('');
  const addOpt = `<option value="__addcat__">+ Add Category</option>`;
  return noneOpt + catOpts + addOpt;
}
// Show the inline "new category name" input when "+ Add Category" is chosen.
function onCatChange(){
  const sel=document.getElementById('ci-cat');
  const row=document.getElementById('ci-newcat-row');
  if(!sel||!row) return;
  const adding = sel.value==='__addcat__';
  row.style.display = adding ? 'block' : 'none';
  if(adding){ const inp=document.getElementById('ci-newcat'); if(inp) inp.focus(); }
}
// Show/hide the Payment Link section behind its checkbox.
function onBudgetLinkToggle(){
  const on=document.getElementById('ci-link-toggle')?.checked;
  const sec=document.getElementById('ci-link-section');
  if(sec) sec.style.display = on ? 'block' : 'none';
  // When hidden, reset the select to "no link" so an unticked toggle saves no link.
  if(!on){ const sel=document.getElementById('ci-budget'); if(sel){ sel.value=''; if(typeof onBudgetLinkChange==='function') onBudgetLinkChange(''); } }
  // Surface (or clear) the smart suggestion for the current task text.
  if(typeof _ciRefreshSuggest==='function') _ciRefreshSuggest();
}

function openAddCategory(){
  openModal('Add Category',`
  <div class="form-group"><label class="form-label">Category Name</label><input class="form-input" id="new-cat-name" placeholder="e.g. Beauty, Catering, Flowers"/></div>`,
  `<button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
   <button class="btn btn-primary" onclick="saveNewCategory()">Add</button>`);
}
function saveNewCategory(){
  const name=document.getElementById('new-cat-name').value.trim(); if(!name)return;
  if(!STATE.checklistCategories) STATE.checklistCategories=[];
  if(!STATE.checklistCategories.includes(name)) STATE.checklistCategories.push(name);
  saveToStorage(); closeModalDirect(); navigate('checklist');
}

function getBudgetOptions(selectedId=''){
  const opts = STATE.budget.items
    .filter(b => b.name && b.name.trim())
    .map(b => `<option value="${b.id}" ${b.id===selectedId?'selected':''}>${b.name}${b.total?` (${fmt(b.total)})`:''}`)
    .join('');
  return `<option value="">— No link —</option>${opts}`;
}

function budgetLinkHtml(selectedId='', selectedSubId=''){
  const allItems = STATE.budget.items.filter(b=>b.name&&b.name.trim());

  // Build option list: category items + indented sub-items
  let itemsHtml = '';
  allItems.forEach(b=>{
    const bSelected = b.id===selectedId && !selectedSubId;
    itemsHtml += `<option value="${b.id}|" ${bSelected?'selected':''}>${b.name}${calcBudgetItemTotal(b)?` — ${fmt(calcBudgetItemTotal(b))}`:''}</option>`;
    if(b.subItems&&b.subItems.length){
      b.subItems.forEach(s=>{
        const sSelected = b.id===selectedId && s.id===selectedSubId;
        const sAmt = getSubItemAmount(s);
        itemsHtml += `<option value="${b.id}|${s.id}" ${sSelected?'selected':''}>\u00a0\u00a0\u00a0↳ ${s.name}${sAmt?` — ${fmt(sAmt)}`:''}</option>`;
      });
    }
  });

  // Resolve selected item display
  let linkedLabel = '';
  let linkedAutoCalc = false; // item-level link whose total rolls up from sub-items
  if(selectedId && selectedId!=='__new__'){
    const b=allItems.find(x=>x.id===selectedId);
    if(b){
      if(selectedSubId){
        const s=b.subItems?.find(x=>x.id===selectedSubId);
        if(s){ const a=getSubItemAmount(s); linkedLabel=a?`${b.name} › ${s.name} — ${fmt(a)}`:`${b.name} › ${s.name}`; }
      } else {
        const t=calcBudgetItemTotal(b);
        linkedLabel=t?`${b.name} — ${fmt(t)}`:b.name;
        linkedAutoCalc = !!b.totalFromSubs;
      }
    }
  }

  const currentVal = selectedSubId ? `${selectedId}|${selectedSubId}` : (selectedId ? `${selectedId}|` : '');

  return `<div id="budget-link-section" style="display:flex;flex-direction:column;gap:10px">
    <div style="position:relative">
      <select class="form-input" id="ci-budget" style="appearance:none;-webkit-appearance:none;padding-right:32px" onchange="onBudgetLinkChange(this.value)">
        <option value="">— No link —</option>
        ${itemsHtml}
        <option value="__new__|">+ Add new budget category…</option>
      </select>
      
    </div>
    ${(()=>{
      // Smart suggestion: only when nothing is linked yet and the task text resembles
      // a budget item / sub-item name. Tapping the chip selects it in the dropdown.
      if(currentVal) return '';
      if(STATE.settings && STATE.settings.suggestBudgetLinks===false) return '';
      const taskText=(typeof _ciTaskText==='function'?_ciTaskText():'')||document.getElementById('ci-text')?.value||'';
      const m=_suggestBudgetMatch(taskText);
      if(!m) return '';
      const val=`${m.bid}|${m.sid}`;
      return `<div id="ci-budget-suggest" style="display:flex;align-items:center;gap:8px;background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:8px 10px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
        <span style="flex:1;font-size:11.5px;color:var(--muted)">Possible match: <strong style="color:var(--ink)">${m.label.replace(/</g,'&lt;')}</strong></span>
        <button type="button" onclick="_ciApplySuggest('${val}')" style="font-size:11px;padding:4px 12px;border:none;border-radius:7px;background:var(--gold);color:#fff;font-weight:500;cursor:pointer;flex-shrink:0">Link</button>
      </div>`;
    })()}
    <div id="budget-link-newitem" style="display:${currentVal==='__new__|'?'flex':'none'};flex-direction:column;gap:8px;background:var(--surface);border-radius:10px;padding:12px;border:1px solid var(--border)">
      <div style="font-size:11.5px;font-weight:500;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">New Budget Category</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Category Name</label><input class="form-input" id="ci-budget-newname" placeholder="e.g. Flowers"/></div>
        <div class="form-group"><label class="form-label">Total Cost <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="form-input" type="number" id="ci-budget-newtotal" placeholder="0" min="0" step="0.01"/></div>
      </div>
      <div class="form-group"><label class="form-label">Due Date <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="form-input" type="date" id="ci-budget-newdue"/>
        <label style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--ink);cursor:pointer;margin-top:5px"><input type="checkbox" id="ci-budget-newdue-same" onchange="_useTaskDate('ci-budget-newdue',this.checked)" style="width:14px;height:14px;cursor:pointer;accent-color:var(--gold)"/> Use the same date as this task</label>
      </div>
      <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink);cursor:pointer;margin-top:2px"><input type="checkbox" id="ci-budget-addsub" onchange="onAddSubToggle()" style="width:15px;height:15px;cursor:pointer;accent-color:var(--gold)"/> Add a sub-item</label>
      <div id="ci-budget-subrow" style="display:none;flex-direction:column;gap:8px">
        <div class="form-group"><label class="form-label">Sub-item Name</label><input class="form-input" id="ci-budget-subname" placeholder="e.g. Wedding cake"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Amount <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="form-input" type="number" id="ci-budget-subamt" placeholder="0" min="0" step="0.01"/></div>
          <div class="form-group"><label class="form-label">Due Date <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="form-input" type="date" id="ci-budget-subdue"/></div>
        </div>
        <label style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--ink);cursor:pointer;margin-top:-2px"><input type="checkbox" id="ci-budget-subdue-same" onchange="_useTaskDate('ci-budget-subdue',this.checked)" style="width:14px;height:14px;cursor:pointer;accent-color:var(--gold)"/> Use the same date as this task</label>
        <label style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink);cursor:pointer"><input type="checkbox" id="ci-budget-fromsubs" onchange="onFromSubsToggle()" style="width:15px;height:15px;cursor:pointer;accent-color:var(--gold)"/> Auto-calc category total from sub-items</label>
        <div style="font-size:11px;color:var(--gold-deep);display:flex;align-items:center;gap:5px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>This task will link to the sub-item.</div>
      </div>
      <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink);cursor:pointer;margin-top:2px"><input type="checkbox" id="ci-budget-newdep-add" onchange="onNewDepToggle()" style="width:15px;height:15px;cursor:pointer;accent-color:var(--gold)"/> Add a deposit to this category</label>
      <div id="ci-budget-newdep-row" style="display:none;flex-direction:column;gap:8px">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Deposit amount</label><input class="form-input" type="number" id="ci-budget-newdep-amt" placeholder="0" min="0" step="0.01"/></div>
          <div class="form-group"><label class="form-label">Due Date <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="form-input" type="date" id="ci-budget-newdep-due"/></div>
        </div>
        <label style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--ink);cursor:pointer;margin-top:-2px"><input type="checkbox" id="ci-budget-newdep-due-same" onchange="_useTaskDate('ci-budget-newdep-due',this.checked)" style="width:14px;height:14px;cursor:pointer;accent-color:var(--gold)"/> Use the same date as this task</label>
        <div style="border-top:.5px dashed var(--border);margin:2px 0 0;padding-top:8px">
          <div onclick="_newDepInstallments()" style="display:flex;align-items:center;gap:7px;cursor:pointer" title="Items don't hold installment plans — this creates the category with a sub-item to hold them and opens the payments editor">
            <span style="color:var(--gold-deep);flex-shrink:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="15" x2="9" y2="15"/></svg></span>
            <span style="font-size:11.5px;color:var(--gold-deep);font-weight:500">Set up installments instead</span>
            <span style="margin-left:auto;color:var(--muted)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
          </div>
          <div style="font-size:10.5px;color:var(--muted);margin-top:4px;line-height:1.4">Creates the category with a sub-item to hold the plan, then opens the payments editor.</div>
        </div>
      </div>
    </div>
    <div id="budget-link-existsub" style="display:${(currentVal && currentVal!=='__new__|' && currentVal.endsWith('|'))?'flex':'none'};flex-direction:column;gap:6px">
      <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink);cursor:pointer"><input type="checkbox" id="ci-existsub-add" onchange="onExistSubToggle()" style="width:15px;height:15px;cursor:pointer;accent-color:var(--gold)"/> Create a new sub-item under this</label>
      <div id="ci-existsub-row" style="display:none;flex-direction:column;gap:8px">
        <div class="form-group"><label class="form-label">Sub-item Name</label><input class="form-input" id="ci-existsub-name" placeholder="e.g. Wedding cake"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Amount <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="form-input" type="number" id="ci-existsub-amt" placeholder="0" min="0" step="0.01"/></div>
          <div class="form-group"><label class="form-label">Due Date <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="form-input" type="date" id="ci-existsub-due"/></div>
        </div>
        <label style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--ink);cursor:pointer;margin-top:-2px"><input type="checkbox" id="ci-existsub-due-same" onchange="_useTaskDate('ci-existsub-due',this.checked)" style="width:14px;height:14px;cursor:pointer;accent-color:var(--gold)"/> Use the same date as this task</label>
        <div style="font-size:11px;color:var(--gold-deep);display:flex;align-items:center;gap:5px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>This task will link to the new sub-item.</div>
      </div>
      <label style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink);cursor:pointer"><input type="checkbox" id="ci-existdep-add" onchange="onExistDepToggle()" style="width:15px;height:15px;cursor:pointer;accent-color:var(--gold)"/> Add a deposit to this item</label>
      <div id="ci-existdep-row" style="display:none;flex-direction:column;gap:8px">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Deposit amount</label><input class="form-input" type="number" id="ci-existdep-amt" placeholder="0" min="0" step="0.01"/></div>
          <div class="form-group"><label class="form-label">Due Date <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="form-input" type="date" id="ci-existdep-due"/></div>
        </div>
        <label style="display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--ink);cursor:pointer;margin-top:-2px"><input type="checkbox" id="ci-existdep-due-same" onchange="_useTaskDate('ci-existdep-due',this.checked)" style="width:14px;height:14px;cursor:pointer;accent-color:var(--gold)"/> Use the same date as this task</label>
        <div style="border-top:.5px dashed var(--border);margin:2px 0 0;padding-top:8px">
          <div onclick="_existDepInstallments()" style="display:flex;align-items:center;gap:7px;cursor:pointer" title="Items don't hold installment plans — this creates a sub-item to hold them and opens the payments editor">
            <span style="color:var(--gold-deep);flex-shrink:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="7" y1="15" x2="9" y2="15"/></svg></span>
            <span style="font-size:11.5px;color:var(--gold-deep);font-weight:500">Set up installments instead</span>
            <span style="margin-left:auto;color:var(--muted)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
          </div>
          <div style="font-size:10.5px;color:var(--muted);margin-top:4px;line-height:1.4">Creates a sub-item to hold the plan, then opens the payments editor.</div>
        </div>
      </div>
    </div>
    ${linkedLabel?`<div style="font-size:12px;color:var(--gold-deep);font-weight:500;display:flex;align-items:center;gap:5px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Linked: ${linkedLabel}</div>`:''}
    ${linkedAutoCalc?`<div style="font-size:11px;color:var(--gold-deep);display:flex;align-items:center;gap:5px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 3 5-6"/></svg>Total auto-calculated from sub-items</div>`:''}
    <div style="font-size:11px;color:var(--muted)">Completing this task will also mark the linked Payment as paid.</div>
  </div>`;
}

// Apply a smart suggestion: select it in the dropdown, run the normal change flow,
// then hide the chip (the selection now drives everything).
function _ciApplySuggest(val){
  const sel=document.getElementById('ci-budget');
  if(sel){ sel.value=val; onBudgetLinkChange(val); }
  const chip=document.getElementById('ci-budget-suggest'); if(chip) chip.remove();
}
// Recompute the suggestion chip as the task text changes (Add dialog). Only acts when
// the link section is visible and nothing is selected yet; never overrides a choice.
function _ciRefreshSuggest(){
  const linkOn=document.getElementById('ci-link-toggle')?.checked;
  const sel=document.getElementById('ci-budget');
  const existing=document.getElementById('ci-budget-suggest');
  // No suggestion while hidden, or once the user has picked something.
  if(!linkOn || (sel && sel.value)){ if(existing) existing.remove(); return; }
  if(STATE.settings && STATE.settings.suggestBudgetLinks===false){ if(existing) existing.remove(); return; }
  const taskText=document.getElementById('ci-text')?.value||'';
  const m=_suggestBudgetMatch(taskText);
  if(!m){ if(existing) existing.remove(); return; }
  const val=`${m.bid}|${m.sid}`;
  const html=`<div id="ci-budget-suggest" style="display:flex;align-items:center;gap:8px;background:var(--surface);border:.5px solid var(--border);border-radius:9px;padding:8px 10px">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
    <span style="flex:1;font-size:11.5px;color:var(--muted)">Possible match: <strong style="color:var(--ink)">${m.label.replace(/</g,'&lt;')}</strong></span>
    <button type="button" onclick="_ciApplySuggest('${val}')" style="font-size:11px;padding:4px 12px;border:none;border-radius:7px;background:var(--gold);color:#fff;font-weight:500;cursor:pointer;flex-shrink:0">Link</button>
  </div>`;
  const tmp=document.createElement('div'); tmp.innerHTML=html;
  const node=tmp.firstElementChild;
  if(existing){ existing.replaceWith(node); }
  else {
    // Insert just after the select wrapper inside the link section.
    const selWrap=sel?sel.closest('div'):null;
    if(selWrap && selWrap.parentNode){ selWrap.parentNode.insertBefore(node, selWrap.nextSibling); }
  }
}

function onBudgetLinkChange(val){
  const newSection = document.getElementById('budget-link-newitem');
  if(newSection) newSection.style.display = val==='__new__|' ? 'flex' : 'none';
  // Show "create a new sub-item under this" only for an item-level selection
  // (value like "b1|" with an empty sub-id) — not no-link, an existing sub, or add-new.
  const existSection = document.getElementById('budget-link-existsub');
  const isItemLevel = !!val && val!=='__new__|' && val.endsWith('|');
  if(existSection){
    existSection.style.display = isItemLevel ? 'flex' : 'none';
    if(!isItemLevel){
      const cb=document.getElementById('ci-existsub-add'); if(cb) cb.checked=false;
      const row=document.getElementById('ci-existsub-row'); if(row) row.style.display='none';
      const dcb=document.getElementById('ci-existdep-add'); if(dcb) dcb.checked=false;
      const drow=document.getElementById('ci-existdep-row'); if(drow) drow.style.display='none';
    } else {
      // Pre-tick "Add a deposit to this item" when the task's own words mention a
      // deposit — only once per fresh item selection, and not if the user already
      // chose the sub-item path or ticked it themselves.
      const taskObj={text:_ciTaskText(), notes:_ciTaskNotes()};
      const subOn=document.getElementById('ci-existsub-add')?.checked;
      const depBox=document.getElementById('ci-existdep-add');
      if(depBox && !depBox.checked && !subOn && _taskDepositKeyword(taskObj) && _existDepAutoVal!==val){
        _existDepAutoVal=val; // remember we auto-ticked for this selection
        depBox.checked=true;
        onExistDepToggle(); // reveals the row + pre-fills the amount from the task
      }
    }
  }
  if(val==='__new__|') _autofillNewCategory();
  // Keep the suggestion chip in sync: clear it on a real pick, restore on no-link.
  if(typeof _ciRefreshSuggest==='function') _ciRefreshSuggest();
}
// Tracks the budget value we last auto-ticked the deposit for, so re-renders don't
// re-tick after the user deliberately unticks it.
let _existDepAutoVal=null;
// Read the current Task title + Notes for suggestions.
function _ciTaskText(){ return document.getElementById('ci-text')?.value||''; }
function _ciTaskNotes(){ return document.getElementById('ci-notes')?.value||''; }
// ── URL field helpers (shared by task + budget dialogs) ──────────────────────
// Normalise a user-entered URL: add https:// if no scheme, trim. Empty stays empty.
function _normalizeUrl(u){
  let s=String(u||'').trim();
  if(!s) return '';
  if(!/^https?:\/\//i.test(s)) s='https://'+s;
  return s;
}
// Build a maps search URL for an address. Uses Apple Maps on Apple devices, Google Maps
// elsewhere — both open in the native map app on mobile and the website on desktop.
function _mapsUrl(addr){
  const q=encodeURIComponent(String(addr||'').trim());
  if(!q) return '';
  const ua=(navigator.userAgent||navigator.platform||'');
  const isApple=/iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(ua);
  return isApple ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
}
// Show just the domain (e.g. "sweetcakes.com") for display.
function _urlDomain(u){
  try{ const h=new URL(_normalizeUrl(u)).hostname; return h.replace(/^www\./,''); }
  catch(e){ return String(u||'').replace(/^https?:\/\//i,'').replace(/^www\./,'').split('/')[0]; }
}
// A complete "Link (URL)" form group + parked autofill prompt, given a field id and value.
function _urlFieldHtml(fieldId, value){
  return `<div class="form-group"><label class="form-label">Link (URL) <span style="color:var(--muted);font-weight:400">(optional)</span></label>
    <div style="position:relative">
      <span style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--gold-deep);pointer-events:none"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>
      <input class="form-input" id="${fieldId}" type="url" inputmode="url" placeholder="https://…" value="${_escHtml(value||'')}" style="padding-left:28px" oninput="if(typeof _beAddTaskRefreshUrlRow==='function')_beAddTaskRefreshUrlRow()"/>
    </div>
    <div title="Coming soon" style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--muted);background:var(--surface);border:.5px dashed var(--border);border-radius:8px;padding:8px 10px;margin-top:6px;cursor:not-allowed;opacity:.85">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--gold-deep)"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
      Paste details to autofill name &amp; price<span style="margin-left:auto;font-size:9.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--gold-deep);background:rgba(196,168,130,.16);padding:2px 7px;border-radius:20px">Soon</span>
    </div>
  </div>`;
}
// A small clickable domain chip for display on a row.
function _urlChipHtml(u){
  if(!u) return '';
  const safe=_normalizeUrl(u);
  return `<a href="${_escHtml(safe)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--gold-deep);text-decoration:underline"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>${_escHtml(_urlDomain(u))}</a>`;
}
// Only fill a field if the user hasn't already put something there.
function _fillIfEmpty(id, val){ const el=document.getElementById(id); if(el && !el.value && val) el.value=val; }
// Prefill new-category Name + Total from the task (suggestions, overwritable).
function _autofillNewCategory(){
  const text=_ciTaskText(), notes=_ciTaskNotes();
  _fillIfEmpty('ci-budget-newname', _suggestNameFromTask(text));
  const bal=_suggestBalanceAmount(text,notes);
  if(bal) _fillIfEmpty('ci-budget-newtotal', String(bal));
}
// Prefill a sub-item Name + Amount from the task (used by both add-sub flows).
function _autofillSubItem(nameId, amtId){
  const text=_ciTaskText(), notes=_ciTaskNotes();
  _fillIfEmpty(nameId, _suggestNameFromTask(text));
  const bal=_suggestBalanceAmount(text,notes);
  if(bal) _fillIfEmpty(amtId, String(bal));
}
// "Use the same date as this task" — copy the task's Due date into the target field
// when ticked; clear it again when unticked.
function _useTaskDate(targetId, on){
  const el=document.getElementById(targetId); if(!el) return;
  if(on){ el.value = document.getElementById('ci-due')?.value||''; }
  else { el.value=''; }
}
function onExistSubToggle(){
  const on = document.getElementById('ci-existsub-add')?.checked;
  const row = document.getElementById('ci-existsub-row');
  if(row) row.style.display = on ? 'flex' : 'none';
  if(on){
    _autofillSubItem('ci-existsub-name','ci-existsub-amt');
    // Mutually exclusive with "Add a deposit to this item".
    const dep=document.getElementById('ci-existdep-add');
    if(dep && dep.checked){ dep.checked=false; const dr=document.getElementById('ci-existdep-row'); if(dr) dr.style.display='none'; }
  }
}
// "Add a deposit to this item" — reveals deposit fields; exclusive with the sub-item choice.
function onExistDepToggle(){
  const on = document.getElementById('ci-existdep-add')?.checked;
  const row = document.getElementById('ci-existdep-row');
  if(row) row.style.display = on ? 'flex' : 'none';
  if(on){
    // Seed the deposit amount: prefer a "deposit"-labelled figure, else any $ amount,
    // from the task title or notes.
    const amtEl=document.getElementById('ci-existdep-amt');
    if(amtEl && !amtEl.value){
      const text=_ciTaskText(), notes=_ciTaskNotes();
      const guess=_suggestDepositAmount(text,notes) || _extractDollarAmount(text) || _extractDollarAmount(notes) || 0;
      if(guess>0) amtEl.value=guess;
    }
    const sub=document.getElementById('ci-existsub-add');
    if(sub && sub.checked){ sub.checked=false; const sr=document.getElementById('ci-existsub-row'); if(sr) sr.style.display='none'; }
  }
}
// Shared installment setup: create a holder sub-item under the given budget item,
// re-point the task being edited to it, and open the Payments editor (seeded amount).
// Used by every "Set up installments instead" entry point for identical behaviour.
function _openInstallmentsForItem(bid, seed, due){
  const parent=STATE.budget.items.find(x=>x.id===bid);
  if(!parent) return;
  const taskName=(document.getElementById('ci-text')?.value||'').trim();
  const subName=_suggestNameFromTask(taskName) || taskName || 'Payments';
  if(!parent.subItems) parent.subItems=[];
  const sub={id:'bs'+Date.now(),name:subName,amount:0,balanceDueDate:due||'',deposit:0,depositPaid:false,paid:false,showDeposit:false};
  parent.subItems.push(sub); parent.expanded=true;
  const tid=_ciEditId||_adjustLinkTaskId;
  if(tid){ const t=STATE.checklist.find(x=>x.id===tid); if(t){ STATE.budget.items.forEach(b=>{ if(b.checklistId===t.id) b.checklistId=''; }); t.budgetId=bid; t.budgetSubId=sub.id; } }
  saveToStorage();
  closeModalDirect();
  openPaymentsEditor(bid, sub.id, Number(seed)||0, {forceInstallments:true});
}
// Item ⋯-menu entry: set up an installment plan for a budget ITEM. Items don't hold
// plans directly, so this creates a clearly-named "Payment plan" holder sub-item under
// the item (Build B). If a holder already exists, it reuses it. Seeds the plan with the
// item's current total so the editor pre-fills sensible amounts.
function _itemMenuInstallments(bid){
  if(typeof _uvRequirePaid==='function'&&!_uvRequirePaid('budgetPayments')) return;
  const parent=STATE.budget.items.find(x=>x.id===bid);
  if(!parent) return;
  if(typeof closeDots==='function') closeDots();
  if(!parent.subItems) parent.subItems=[];
  // Reuse an existing plan holder if the item already has one.
  let holder=parent.subItems.find(s=>s._planHolder);
  // Seed from the item's own total (only meaningful when it has no real sub-items;
  // when it does, those carry the cost and the plan seeds from 0).
  const hasRealSubs = parent.subItems.some(s=>!s._planHolder);
  const seed = hasRealSubs ? 0 : Number(parent.total||0);
  if(!holder){
    holder={id:'bs'+Date.now(),name:'Payment plan',amount:seed,balanceDueDate:parent.balanceDueDate||'',deposit:0,depositPaid:false,paid:false,showDeposit:false,_planHolder:true};
    parent.subItems.push(holder);
    parent.expanded=true;
    saveToStorage();
  }
  openPaymentsEditor(bid, holder.id, seed, {forceInstallments:true, seedAmount:seed});
}
// "Set up installments instead" — items can't hold installments, so create a sub-item
// to hold the plan, link the task to it, and open the Payments editor (seeded amount).
function _existDepInstallments(){
  const raw=document.getElementById('ci-budget')?.value||'';
  if(!raw || !raw.endsWith('|') || raw==='__new__|') return;
  const bid=raw.split('|')[0];
  const seed=Number(document.getElementById('ci-existdep-amt')?.value)||0;
  const due=document.getElementById('ci-existdep-due')?.value||'';
  _openInstallmentsForItem(bid, seed, due);
}
function onAddSubToggle(){
  const on = document.getElementById('ci-budget-addsub')?.checked;
  const row = document.getElementById('ci-budget-subrow');
  if(row) row.style.display = on ? 'flex' : 'none';
  // If sub-item creation is turned off, also clear auto-calc so Total Cost is usable.
  if(!on){
    const fs=document.getElementById('ci-budget-fromsubs'); if(fs) fs.checked=false;
    onFromSubsToggle();
  } else {
    _autofillSubItem('ci-budget-subname','ci-budget-subamt');
  }
}
// New-category deposit choice — independent of "Add a sub-item" (both may be on).
function onNewDepToggle(){
  const on = document.getElementById('ci-budget-newdep-add')?.checked;
  const row = document.getElementById('ci-budget-newdep-row');
  if(row) row.style.display = on ? 'flex' : 'none';
  if(on){
    const amtEl=document.getElementById('ci-budget-newdep-amt');
    if(amtEl && !amtEl.value){
      const guess=_extractDollarAmount(document.getElementById('ci-text')?.value||'');
      if(guess>0) amtEl.value=guess;
    }
  }
}
// "Set up installments instead" for a NEW category — the category doesn't exist yet,
// so create it first (carrying any entered total/due/sub-item), then route through the
// shared installment helper (always creates a holder sub-item for the plan).
function _newDepInstallments(){
  const newNameEl=document.getElementById('ci-budget-newname');
  const newName=(newNameEl?.value||'').trim();
  if(!newName){ _flashError(newNameEl); return; }
  const newTotal=Number(document.getElementById('ci-budget-newtotal')?.value)||0;
  const newDue=document.getElementById('ci-budget-newdue')?.value||'';
  const addSub=document.getElementById('ci-budget-addsub')?.checked;
  const subName=(document.getElementById('ci-budget-subname')?.value||'').trim();
  const subAmt=Number(document.getElementById('ci-budget-subamt')?.value)||0;
  const subDue=document.getElementById('ci-budget-subdue')?.value||'';
  const fromSubs=document.getElementById('ci-budget-fromsubs')?.checked;
  const seed=Number(document.getElementById('ci-budget-newdep-amt')?.value)||0;
  const depDue=document.getElementById('ci-budget-newdep-due')?.value||'';
  if(addSub && !subName){ _flashError(document.getElementById('ci-budget-subname')); return; }
  const nb={id:'b'+Date.now(),name:newName,total:newTotal,deposit:0,paid:false,dueDate:'',balanceDueDate:newDue,checklistId:'',note:'',expanded:true,subItems:[]};
  if(addSub && subName){
    const sub={id:'bs'+Date.now(),name:subName,amount:subAmt,balanceDueDate:subDue,deposit:0,depositPaid:false,paid:false,showDeposit:false};
    nb.subItems.push(sub);
    if(fromSubs) nb.totalFromSubs=true;
  }
  STATE.budget.items.push(nb);
  // Holder sub-item for the installment plan is created by the shared helper.
  _openInstallmentsForItem(nb.id, seed, depDue);
}
// Auto-calc category total from sub-items → grey out / disable the Total Cost field.
function onFromSubsToggle(){
  const on = document.getElementById('ci-budget-fromsubs')?.checked;
  const totalEl = document.getElementById('ci-budget-newtotal');
  if(totalEl){
    totalEl.disabled = !!on;
    totalEl.style.opacity = on ? '.5' : '';
    totalEl.style.cursor = on ? 'not-allowed' : '';
    if(on) totalEl.value='';
  }
}

let _ciEditId=null;
// Tracks the draft currently loaded into the Add dialog (when resumed), so finishing
// or re-saving updates that same draft rather than duplicating it.
let _ciDraftId=null;
// Read the Add-dialog fields into a plain object (used for drafts and the started check).
function _ciReadFields(){
  return {
    text:(document.getElementById('ci-text')?.value||'').trim(),
    category:document.getElementById('ci-cat')?.value||'',
    newcat:(document.getElementById('ci-newcat')?.value||'').trim(),
    dueDate:document.getElementById('ci-due')?.value||'',
    notes:(document.getElementById('ci-notes')?.value||'').trim(),
    url:(document.getElementById('ci-url')?.value||'').trim(),
    linkOn:!!document.getElementById('ci-link-toggle')?.checked,
    budgetVal:document.getElementById('ci-budget')?.value||''
  };
}
// "Started" = any meaningful field filled in (category 'None'/'' and an unchecked link
// don't count on their own).
function _ciHasContent(){
  const f=_ciReadFields();
  const catMeaningful = f.category && f.category!=='' && f.category!=='None' && f.category!=='__addcat__';
  const budgetMeaningful = f.linkOn && f.budgetVal && f.budgetVal!=='';
  return !!(f.text || f.newcat || f.dueDate || f.notes || f.url || catMeaningful || budgetMeaningful);
}
// True only while the "Add Checklist Task" dialog is open, so the shared × knows to
// offer the draft prompt instead of closing outright.
let _ciAddDialogOpen=false;
// The shared modal × routes here: defer to the draft-aware close for the Add dialog,
// otherwise close normally (every other modal is unaffected).
function _modalCloseX(){
  if(_lkSheetCtx){ _lkAskKeep(); return; }
  if(_ciAddDialogOpen){ _ciMaybeDraftClose(); return; }
  // If the mark-paid / mark-done batch popup is open and carries a revert closure,
  // the × should undo the checkbox toggle just like Cancel does (otherwise checking an
  // item then closing with × would leave it marked).
  if((_batchDateCtx && typeof _batchDateCtx.revert==='function') ||
     (_batchRevertCtx && typeof _batchRevertCtx.revert==='function')){
    _batchCancel();
    return;
  }
  // If a checkbox opened this popup chain, × restores the full pre-check snapshot.
  // Capture before closing (closeModalDirect clears both contexts).
  const snap=_checkSnapshot;
  const pending=_escapeRevert;
  closeModalDirect();
  if(snap){ _checkSnapshot=snap; _restoreCheckSnapshot(); return; }
  if(pending){ _escapeRevert=pending; _revertCheckFromEscape(); }
}
// Close the Add dialog, offering to keep a draft if anything was typed (unless the
// user has opted out). Closing for any reason clears the active-dialog flag.
function _ciMaybeDraftClose(){
  if(_ciAddDialogOpen && _ciHasContent() && !(STATE.settings && STATE.settings.hideDraftPrompt)){
    _ciOfferDraft();
    return;
  }
  _ciAddDialogOpen=false;
  closeModalDirect();
}
// Stacked prompt over the open Add dialog: Discard / Save draft, with a "don't ask
// again" opt-out.
function _ciOfferDraft(){
  const body=`<div style="display:flex;flex-direction:column;gap:11px">
    <div style="font-size:13px;color:var(--ink);line-height:1.5">You've started a checklist task but haven't added it yet. Keep it as a draft to finish later?</div>
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="ci-draft-noask" style="width:15px;height:15px;accent-color:var(--gold);cursor:pointer"/> Don't ask again</label>
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_ciDraftDiscard()">Discard</button>
    <button class="btn btn-primary btn-sm" onclick="_ciDraftSave()">Save draft</button>`;
  openConfirm2('Save as draft?', body, footer);
}
function _ciDraftPersistNoAsk(){
  if(document.getElementById('ci-draft-noask')?.checked){
    if(!STATE.settings) STATE.settings={};
    STATE.settings.hideDraftPrompt=true;
  }
}
// Snapshot the dialog fields into _ciDraftPending so the values survive the confirm
// popup replacing the dialog body. Called before opening the prompt is unnecessary —
// the prompt stacks over the dialog, so fields are still in the DOM here.
function _ciDraftSave(){
  _ciDraftPersistNoAsk();
  const f=_ciReadFields();
  if(!STATE.checklistDrafts) STATE.checklistDrafts=[];
  // Resolve a "+ Add category" choice to its typed name for the stored draft.
  const category = (f.category==='__addcat__' && f.newcat) ? f.newcat : f.category;
  const draft={
    id:_ciDraftId||('cld'+Date.now()),
    text:f.text, category, dueDate:f.dueDate, notes:f.notes, url:f.url,
    linkOn:f.linkOn, budgetVal:f.budgetVal, savedAt:Date.now()
  };
  // Update in place if resuming an existing draft, else add a new one.
  const idx=STATE.checklistDrafts.findIndex(d=>d.id===draft.id);
  if(idx>=0) STATE.checklistDrafts[idx]=draft; else STATE.checklistDrafts.push(draft);
  _ciDraftId=null; _ciAddDialogOpen=false;
  if(typeof _closeConfirm2Direct==='function') _closeConfirm2Direct();
  saveToStorage();
  closeModalDirect();
}
function _ciDraftDiscard(){
  _ciDraftPersistNoAsk();
  _ciDraftId=null; _ciAddDialogOpen=false;
  if(typeof _closeConfirm2Direct==='function') _closeConfirm2Direct();
  if(STATE.settings && STATE.settings.hideDraftPrompt) saveToStorage();
  closeModalDirect();
}
// The "Resume a draft" strip at the top of the Add dialog — shown only when drafts
// exist. Each row loads the draft back into the form; the × deletes that draft.
function _ciDraftPickerHtml(){
  const drafts=(STATE.checklistDrafts||[]);
  if(!drafts.length) return '';
  const rows=drafts.slice().sort((a,b)=>(b.savedAt||0)-(a.savedAt||0)).map(d=>{
    const label=(d.text||d.category||'Untitled draft').replace(/</g,'&lt;');
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--surface);border:.5px solid var(--border);border-radius:7px;margin-bottom:5px;cursor:pointer" onclick="_ciResumeDraft('${d.id}')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span style="flex:1;font-size:12px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span>
      <span title="Delete draft" onclick="event.stopPropagation();_ciDeleteDraft('${d.id}')" style="color:var(--muted);display:inline-flex;padding:2px;cursor:pointer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
    </div>`;
  }).join('');
  return `<div id="ci-draft-picker" style="border:.5px solid var(--border);border-radius:9px;background:var(--parchment);padding:9px 10px">
    <div style="font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:6px">Resume a draft</div>
    ${rows}
  </div>`;
}
// Load a draft's values into the open Add dialog. Keeps the draft (per the chosen
// behaviour) until the user clicks Add Item; _ciDraftId tracks which one is loaded.
function _ciResumeDraft(id){
  const d=(STATE.checklistDrafts||[]).find(x=>x.id===id); if(!d) return;
  _ciDraftId=id;
  const setVal=(el,v)=>{ const e=document.getElementById(el); if(e) e.value=v||''; };
  setVal('ci-text', d.text);
  setVal('ci-due', d.dueDate);
  setVal('ci-notes', d.notes);
  setVal('ci-url', d.url);
  // Category: if the draft's category isn't in the list, treat it as a new category.
  const catSel=document.getElementById('ci-cat');
  if(catSel){
    const has=Array.from(catSel.options).some(o=>o.value===d.category);
    if(d.category && !has){
      catSel.value='__addcat__'; if(typeof onCatChange==='function') onCatChange();
      setVal('ci-newcat', d.category);
    } else { catSel.value=d.category||''; if(typeof onCatChange==='function') onCatChange(); }
  }
  // Budget link.
  const linkCb=document.getElementById('ci-link-toggle');
  if(linkCb){ linkCb.checked=!!d.linkOn; if(typeof onBudgetLinkToggle==='function') onBudgetLinkToggle(); }
  if(d.linkOn){ const sel=document.getElementById('ci-budget'); if(sel){ sel.value=d.budgetVal||''; if(typeof onBudgetLinkChange==='function') onBudgetLinkChange(d.budgetVal||''); } }
  // Refresh the picker (the loaded draft stays listed until Add Item is clicked).
  _ciRefreshDraftPicker();
}
// Re-render the "Resume a draft" strip in place (or remove it when no drafts remain).
function _ciRefreshDraftPicker(){
  const existing=document.getElementById('ci-draft-picker');
  const html=_ciDraftPickerHtml();
  if(existing){
    if(html){ const tmp=document.createElement('div'); tmp.innerHTML=html; existing.replaceWith(tmp.firstElementChild); }
    else existing.remove();
  } else if(html){
    // None shown yet but drafts now exist — insert at the top of the dialog body.
    const body=document.getElementById('modal-body');
    const wrap=body?body.firstElementChild:null;
    if(wrap){ const tmp=document.createElement('div'); tmp.innerHTML=html; wrap.insertBefore(tmp.firstElementChild, wrap.firstChild); }
  }
}
function _ciDeleteDraft(id){
  if(!STATE.checklistDrafts) return;
  const _d0=STATE.checklistDrafts.find(d=>d.id===id);
  const _label=_d0?(_d0.name||_d0.title||'draft'):'draft';
  const _wasActive=(_ciDraftId===id);
  _undoableDelete(_label, ()=>{
    STATE.checklistDrafts=STATE.checklistDrafts.filter(d=>d.id!==id);
    if(_ciDraftId===id) _ciDraftId=null;
  }, null, ()=>{
    if(_wasActive) _ciDraftId=null;
    if(typeof _ciRefreshDraftPicker==='function') _ciRefreshDraftPicker();
  });
  _ciRefreshDraftPicker();
}
function openAddCheckitem(presetCat){
  _ciEditId=null;
  _ciDraftId=null;
  _ciAddDialogOpen=true;
  openModal('Add Checklist Task',`
  <div style="display:flex;flex-direction:column;gap:14px">
    ${_ciDraftPickerHtml()}
    <div class="form-group"><label class="form-label">Task</label><input class="form-input" id="ci-text" placeholder="What needs to be done?" oninput="_ciRefreshSuggest()"/></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Category</label>
        <div style="position:relative">
          <select class="form-input" id="ci-cat" onchange="onCatChange()" style="appearance:none;-webkit-appearance:none;padding-right:32px">
            ${getCategoryOptions(presetCat||'')}
          </select>
          
        </div>
        <div id="ci-newcat-row" style="display:none;margin-top:8px">
          <label class="form-label">New category name</label>
          <input class="form-input" id="ci-newcat" placeholder="e.g. Beauty, Catering, Flowers"/>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Due Date</label><input class="form-input" type="date" id="ci-due"/></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" id="ci-notes" rows="2" placeholder="Optional notes…" style="resize:vertical"></textarea></div>
    ${_urlFieldHtml('ci-url','')}
    <div style="border-top:1px solid var(--border);margin:2px 0"></div>
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink);cursor:pointer"><input type="checkbox" id="ci-link-toggle" onchange="onBudgetLinkToggle()" style="width:16px;height:16px;cursor:pointer;accent-color:var(--gold)"/> Link to a Payment</label>
    <div id="ci-link-section" style="display:none">
      <div class="form-group"><label class="form-label">Payment Link</label>${budgetLinkHtml('','')}</div>
    </div>
    ${_ciApptSectionHtml()}
  </div>`,
  `<button class="btn btn-outline" onclick="_ciMaybeDraftClose()">Cancel</button>
   <button class="btn btn-primary" onclick="saveCheckitem()">Add Task</button>`);
  window._ciApptStage=[];
  window._ciApptOwnerTaskId=null;
  window._ciFollowUpBaseDate=null;
  window._ciFollowUpApptSeed=null;
  _ciApptRenderList();
}
// Open the Add dialog pre-filled as a follow-up to an existing task: same category,
// title seeded with "Follow up: <task>" (editable). Used by the ··· menu and the
// task-completion prompt.
function createFollowUpTask(id){
  const t=STATE.checklist.find(x=>x.id===id); if(!t) return;
  closeDots();
  openAddCheckitem(t.category||'');
  _ciSetupFollowUp(t);
  const txt=document.getElementById('ci-text');
  if(txt){
    const base=(t.text||'').trim();
    txt.value = base ? `Follow up: ${base}` : 'Follow up: ';
    if(typeof _ciRefreshSuggest==='function') _ciRefreshSuggest();
    txt.focus();
    // Place caret at the end so the user can keep typing or edit.
    try{ const v=txt.value.length; txt.setSelectionRange(v,v); }catch(e){}
  }
}
// ── Follow-up carry-over ─────────────────────────────────────────────────────
// Date math: add days / months to an ISO date (YYYY-MM-DD), returning ISO.
function _isoAddDays(iso, n){ const d=new Date(iso+'T00:00:00'); if(isNaN(d)) return ''; d.setDate(d.getDate()+n); return _localISO(d); }
function _isoAddMonths(iso, n){ const d=new Date(iso+'T00:00:00'); if(isNaN(d)) return ''; const day=d.getDate(); d.setMonth(d.getMonth()+n); if(d.getDate()<day) d.setDate(0); return _localISO(d); }
function _localISO(d){ const o=d.getTimezoneOffset(); return new Date(d.getTime()-o*60000).toISOString().slice(0,10); }
// Pick the appointment to carry: the one with the latest date (falls back to last in list).
function _latestAppt(t){
  const list=(t && Array.isArray(t.appointments))?t.appointments:[];
  if(!list.length) return null;
  let best=list[0];
  for(const a of list){ if((a.date||'') >= (best.date||'')) best=a; }
  return best;
}
// Carry notes + URL onto the open Add dialog, set the date base for chips, and stash
// an appointment template (date cleared; virtual passcode cleared) for if the user
// chooses to add an appointment. Nothing is auto-added to the appointment list.
function _ciSetupFollowUp(src){
  if(!src) return;
  const notes=document.getElementById('ci-notes'); if(notes && src.notes) notes.value=src.notes;
  const url=document.getElementById('ci-url'); if(url && src.url) url.value=src.url;
  // Base date for the suggested chips: original task's due date, else today.
  window._ciFollowUpBaseDate = (src.dueDate||'') || _todayISO();
  // Appointment template held in reserve (not staged). Cleared of date; virtual keeps
  // link but clears passcode; in-person address carries over as normal.
  const a=_latestAppt(src);
  if(a){
    const seed=Object.assign({}, a);
    seed.id='';            // force a NEW appointment on save
    seed.date='';          // date will mirror the follow-up's due date when added
    if(seed.virtual){ seed.pass=''; }  // keep link, clear passcode (address already '')
    window._ciFollowUpApptSeed=seed;
  } else {
    window._ciFollowUpApptSeed=null;
  }
  _ciRenderDueChips();
}
// Inject the +1 week / +2 weeks / +1 month chips under the Due Date field.
function _ciRenderDueChips(){
  const due=document.getElementById('ci-due'); if(!due) return;
  const base=window._ciFollowUpBaseDate; if(!base) return;
  if(document.getElementById('ci-due-chips')) return; // already added
  const opts=[['+1 week', _isoAddDays(base,7)], ['+2 weeks', _isoAddDays(base,14)], ['+1 month', _isoAddMonths(base,1)]];
  const wrap=document.createElement('div');
  wrap.id='ci-due-chips';
  wrap.style.cssText='display:flex;gap:6px;margin-top:6px;flex-wrap:wrap';
  wrap.innerHTML=opts.map(([lbl,iso])=>`<button type="button" class="ci-due-chip" data-iso="${iso}" onclick="_ciPickDueChip('${iso}')" style="font-size:11px;border-radius:7px;border:.5px solid var(--border);background:var(--surface);color:var(--gold-deep);padding:4px 9px;cursor:pointer;white-space:nowrap">${lbl}</button>`).join('');
  due.parentNode.appendChild(wrap);
}
function _ciPickDueChip(iso){
  const due=document.getElementById('ci-due'); if(due){ due.value=iso; }
  document.querySelectorAll('#ci-due-chips .ci-due-chip').forEach(b=>{
    const on=b.getAttribute('data-iso')===iso;
    b.style.background=on?'var(--gold-deep)':'var(--surface)';
    b.style.color=on?'#fff':'var(--gold-deep)';
    b.style.borderColor=on?'var(--gold-deep)':'var(--border)';
  });
}
function openEditCheckitem(id){
  const i=STATE.checklist.find(x=>x.id===id); if(!i)return;
  _ciEditId=id;
  openModal('Edit Task',`
  <div style="display:flex;flex-direction:column;gap:14px">
    <div class="form-group"><label class="form-label">Task</label><input class="form-input" id="ci-text" value="${i.text}"/></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Category</label>
        <div style="position:relative">
          <select class="form-input" id="ci-cat" onchange="onCatChange()" style="appearance:none;-webkit-appearance:none;padding-right:32px">
            ${getCategoryOptions(i.category)}
          </select>
          
        </div>
        <div id="ci-newcat-row" style="display:none;margin-top:8px">
          <label class="form-label">New category name</label>
          <input class="form-input" id="ci-newcat" placeholder="e.g. Beauty, Catering, Flowers"/>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Due Date</label><input class="form-input" type="date" id="ci-due" value="${i.dueDate}"/></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" id="ci-notes" rows="2" style="resize:vertical">${i.notes||''}</textarea></div>
    ${_urlFieldHtml('ci-url', i.url||'')}
    <div style="border-top:1px solid var(--border);margin:2px 0"></div>
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink);cursor:pointer"><input type="checkbox" id="ci-link-toggle" onchange="onBudgetLinkToggle()" ${i.budgetId?'checked':''} style="width:16px;height:16px;cursor:pointer;accent-color:var(--gold)"/> Link to a Payment</label>
    <div id="ci-link-section" style="display:${i.budgetId?'block':'none'}">
      <div class="form-group"><label class="form-label">Payment Link</label>${budgetLinkHtml(i.budgetId||'',i.budgetSubId||'')}</div>
    </div>
    ${_ciApptSectionHtml()}
  </div>`,
  `<button class="btn btn-danger btn-sm" onclick="closeModalDirect();deleteCheckitem('${id}')" style="margin-right:auto;display:inline-flex;align-items:center;gap:5px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Delete</button>
   <button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
   <button class="btn btn-primary" onclick="saveCheckitem('${id}')">Save</button>`);
  window._ciApptOwnerTaskId=id;
  _ciApptRenderList();
}
// ══════════════════════════════════════════════
// (Appointments v2 module is spliced in below — see _migrateAppointments etc.)
// ══════════════════════════════════════════════
