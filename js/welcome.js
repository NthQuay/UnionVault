// WELCOME PAGE
// ══════════════════════════════════════════════
function welcomeFinish(){
  const p1 = document.getElementById('w-p1').value.trim();
  const p2 = document.getElementById('w-p2').value.trim();
  const p1El = document.getElementById('w-p1');
  const p2El = document.getElementById('w-p2');
  p1El.style.borderColor = p1 ? '' : 'var(--red)';
  p2El.style.borderColor = p2 ? '' : 'var(--red)';
  if(!p1 || !p2) return;

  const t1 = document.getElementById('w-t1').value;
  const t2 = document.getElementById('w-t2').value;

  STATE.event.partner1 = p1;
  STATE.event.partner2 = p2;
  STATE.settings.partner1Title = t1; STATE.event.title1 = t1;
  STATE.settings.partner2Title = t2; STATE.event.title2 = t2;
  STATE.event.date = document.getElementById('w-date').value || '';
  STATE.event.venue = document.getElementById('w-venue').value.trim() || '';
  STATE.budget.total = Number(document.getElementById('w-budget').value) || 0;
  applySuggestedChecklistDueDates();
  saveToStorage();
  document.getElementById('setup-modal-overlay').classList.add('hidden');
  updateTopbarSub();
  navigate('dashboard');
}

// ══════════════════════════════════════════════
