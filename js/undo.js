// UNDO-FOR-DELETES — bottom-right toast with a 6s window to restore.
// _undoableDelete() snapshots the mutable STATE slices, runs the deletion,
// then shows a toast. "Undo" restores the snapshot wholesale, so cascades
// (e.g. a guest's seating assignment, a budget item's sub-items) come back too.
// ═══════════════════════════════════════════════════════════════════════════
const _UNDO_SLICES=['guests','families','seating','tables','vendors','budget','checklist','checklistDrafts','events','timeline','inspo','visionboard','wishingwell','invites','quotes','tagDefs','guestFilter'];
let _undoTimer=null, _undoPending=null, _undoSeq=0;

function _undoSnapshot(){
  const snap={};
  _UNDO_SLICES.forEach(k=>{ if(k in STATE) snap[k]=JSON.parse(JSON.stringify(STATE[k])); });
  return snap;
}
function _undoRestoreSnapshot(snap){
  Object.keys(snap).forEach(k=>{ STATE[k]=JSON.parse(JSON.stringify(snap[k])); });
}

// label: short text after "Deleted " (already escaped-safe plain string).
// mutate: function that performs the actual deletion on STATE.
// navPage: page id to re-render after undo (via navigate). Use null when the
//   delete happens inside a modal/panel that re-renders itself — pass rerenderFn instead.
// rerenderFn (optional): function run after undo instead of navigate(navPage),
//   for in-modal lists (appointments, attachments, quote/draft pickers).
function _undoableDelete(label, mutate, navPage, rerenderFn){
  const snap=_undoSnapshot();
  mutate();
  saveToStorage();
  if(!STATE.settings.disableUndoToast){
    _showUndoToast(label, snap, navPage, rerenderFn);
  }
  // Re-render the page to reflect the deletion (callers with rerenderFn handle their own refresh)
  if(!rerenderFn && navPage) navigate(navPage);
}

function _showUndoToast(label, snap, navPage, rerenderFn){
  // Commit any toast already showing (its window ends as soon as a new delete happens).
  _commitUndoToast();
  const wrap=document.getElementById('undo-toast-wrap');
  if(!wrap){ return; }
  const myId=++_undoSeq;
  _undoPending={ id:myId, snap, navPage, rerenderFn };
  const safe=_escHtml(label||'Item');
  const el=document.createElement('div');
  el.className='undo-toast';
  el.setAttribute('data-uid', String(myId));
  el.innerHTML=
    '<span class="ut-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></span>'+
    '<span class="ut-msg"><b>Deleted</b> '+safe+'</span>'+
    '<span class="ut-div"></span>'+
    '<button class="ut-undo" onclick="_undoLastDelete()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>Undo</button>'+
    '<button class="ut-x" aria-label="Dismiss" onclick="_dismissUndoToast()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
  wrap.appendChild(el);
  requestAnimationFrame(()=>{ el.classList.add('in'); });
  _undoTimer=setTimeout(()=>{ _commitUndoToast(); }, 6000);
}

// Remove the toast element from the DOM (with fade), without restoring.
function _clearUndoToastEl(){
  const wrap=document.getElementById('undo-toast-wrap');
  if(!wrap) return;
  const el=wrap.querySelector('.undo-toast');
  if(el){ el.classList.remove('in'); setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 220); }
}

// The delete becomes permanent: drop the snapshot, clear the toast.
function _commitUndoToast(){
  if(_undoTimer){ clearTimeout(_undoTimer); _undoTimer=null; }
  _undoPending=null;
  // Always remove any visible toast element. Info toasts (send hand-off notes,
  // "Pick a method first", etc.) carry no undo snapshot, so guarding the clear
  // behind _undoPending left them stuck on screen forever — the ✕ and the 6s
  // timer both no-op'd. Clearing unconditionally fixes that; undo toasts are
  // unaffected (their snapshot is already dropped above).
  _clearUndoToastEl();
}

// Manual dismiss (✕) — same as letting it time out.
function _dismissUndoToast(){ _commitUndoToast(); }

// Undo — restore the snapshot and re-render the page the delete happened on.
function _undoLastDelete(){
  if(!_undoPending){ return; }
  const p=_undoPending;
  if(_undoTimer){ clearTimeout(_undoTimer); _undoTimer=null; }
  _undoRestoreSnapshot(p.snap);
  saveToStorage();
  _undoPending=null;
  _clearUndoToastEl();
  if(typeof p.rerenderFn==='function'){ try{ p.rerenderFn(); }catch(e){ if(p.navPage) navigate(p.navPage); } }
  else if(p.navPage){ navigate(p.navPage); }
}

// ═══════════════════════════════════════════════════════════════════════════
