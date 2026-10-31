// DOTS DROPDOWN
// ══════════════════════════════════════════════
function toggleDots(e,id){
  e.stopPropagation();
  // True toggle: if this menu is already the open one, close it and stop.
  const already = (openDropdown===id);
  closeDots(); // always close any/every open menu first — never two at once
  if(already) return;
  const el=document.getElementById(id);
  if(!el) return;
  el.classList.remove('hidden');
  openDropdown=id;
  // Portal the dropdown to <body> while open so it's never trapped behind a
  // sibling's native control (e.g. the next row's RSVP <select>) — a fixed
  // z-index only wins within its own stacking context. Remember where it came
  // from so closeDots can put it back.
  if(el.parentNode!==document.body){
    el._dotsHome=el.parentNode;
    el._dotsNext=el.nextSibling;
    document.body.appendChild(el);
  }
  el._dotsPortaled=true;
  // Position using fixed coords so it's never clipped by overflow:hidden parents
  const btn=e.currentTarget||e.target;
  const rect=btn.getBoundingClientRect();
  const menuW=160;
  const menuH=el.scrollHeight||200;
  // Prefer opening below, flip above if not enough space
  const spaceBelow=window.innerHeight-rect.bottom;
  const top=spaceBelow>menuH+8 ? rect.bottom+4 : rect.top-menuH-4;
  // Align to right edge of button, but keep on screen
  const right=window.innerWidth-rect.right;
  el.style.top=top+'px';
  el.style.right=''; // clear any old right
  el.style.left='';
  // Set right or left depending on space
  const leftPos=rect.right-menuW;
  if(leftPos<8){ el.style.left='8px'; }
  else { el.style.left=leftPos+'px'; }
}
// Put a portaled dropdown back where it came from, or just hide it if its
// original home was removed from the DOM by a re-render (prevents orphans).
function _restoreDots(el){
  if(!el) return;
  el.classList.add('hidden');
  if(el._dotsHome){
    const home=el._dotsHome, next=el._dotsNext;
    if(home && home.isConnected){
      try{ home.insertBefore(el, (next&&next.isConnected)?next:null); }
      catch(_){ try{ home.appendChild(el); }catch(__){} }
    }
    // If home is gone (row re-rendered away), leave el hidden on <body>; it will
    // be cleaned up below. Either way, clear the portal bookkeeping.
    el._dotsHome=null; el._dotsNext=null;
  }
  el._dotsPortaled=false;
}
function closeDots(){
  // Restore/hide the tracked menu…
  if(openDropdown){ _restoreDots(document.getElementById(openDropdown)); openDropdown=null; }
  // …then sweep ANY stray dropdown left portaled directly on <body>, so a lost
  // reference (e.g. after a list re-render) can never strand a visible menu.
  document.querySelectorAll('body > .dots-dropdown').forEach(el=>{
    if(el._dotsHome || el._dotsPortaled || !el.classList.contains('hidden')) _restoreDots(el);
  });
}
document.addEventListener('click',closeDots);
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){
  const fv=document.getElementById('fileview-overlay');
  if(fv&&!fv.classList.contains('hidden')){ closeFileViewDirect(); return; }
  const modalOpen=!document.getElementById('modal-overlay').classList.contains('hidden');
  if(!modalOpen){ closeModalDirect(); return; }
  if(_lkSheetCtx){ _lkAskKeep(); return; }
  // Budget paid/booked batch confirm open → revert that toggle (mirrors Cancel).
  if(_batchRevertCtx || _batchDateCtx){ _batchCancel(); return; }
  // Any other armed confirm (task tick, deposit-paid, etc.) → run its revert closure.
  const snap=_checkSnapshot;
  const pending=_escapeRevert;
  closeModalDirect();
  if(snap){ _checkSnapshot=snap; _restoreCheckSnapshot(); return; }
  if(pending){ _escapeRevert=pending; _revertCheckFromEscape(); }
} });

// ══════════════════════════════════════════════
