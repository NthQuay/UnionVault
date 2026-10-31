
// ── Landing page helpers ────────────────────────────────────────────────
function _openTermsModal(){
  var m=document.getElementById('lp-terms-modal');
  if(!m) return;
  if(m.parentNode!==document.body) document.body.appendChild(m);
  m.style.display='';
  m.scrollTop=0;
}
function _closeTermsModal(){
  var m=document.getElementById('lp-terms-modal');
  if(m)m.style.display='none';
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')_closeTermsModal();});

function switchTab(btn, panel) {
  document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
  btn.classList.add('active');
  var si = document.getElementById('sign-in');
  var ca = document.getElementById('create');
  if(si) si.style.display = panel === 'sign-in' ? '' : 'none';
  if(ca) ca.style.display = panel === 'create' ? '' : 'none';
}

function togglePw(id, btn) {
  var inp = document.getElementById(id);
  if(!inp) return;
  var show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  var svg = btn.querySelector('svg');
  if(svg) svg.innerHTML = show
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
}

function toggleFaq(btn) {
  var answer = btn.nextElementSibling;
  var isOpen = btn.classList.contains('open');
  document.querySelectorAll('.faq-q').forEach(function(q){
    q.classList.remove('open');
    if(q.nextElementSibling) q.nextElementSibling.classList.remove('open');
  });
  if(!isOpen){ btn.classList.add('open'); answer.classList.add('open'); }
}

async function _lpForgotPassword() {
  var email = (document.getElementById('auth-in-email').value || '').trim();
  var errEl = document.getElementById('lp-in-err');
  var okEl  = document.getElementById('lp-in-ok');
  var btn   = document.getElementById('lp-in-btn');
  var fpBtn = document.getElementById('lp-forgot-btn');
  errEl.style.display = 'none'; okEl.style.display = 'none';
  if(!email){ errEl.textContent = 'Enter your email address above, then click "Forgot password?".'; errEl.style.display = ''; return; }
  btn.disabled = true;
  fpBtn.disabled = true;
  fpBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:5px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:lp-spin 0.8s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Sending…</span>';
  var r = await _sbResetPassword(email);
  btn.disabled = false;
  fpBtn.disabled = false;
  fpBtn.innerHTML = 'Forgot password?';
  if(!r.ok){ errEl.textContent = r.error; errEl.style.display = ''; return; }
  okEl.textContent = 'Password reset email sent to ' + email + '. Check your inbox — if you can\'t find it, check your junk or spam folder.';
  okEl.style.display = '';
}

async function _lpSignIn() {
  var email = (document.getElementById('auth-in-email').value || '').trim();
  var pw = document.getElementById('auth-in-pw').value || '';
  var errEl = document.getElementById('lp-in-err');
  var okEl  = document.getElementById('lp-in-ok');
  var btn = document.getElementById('lp-in-btn');
  errEl.style.display = 'none';
  if(!email || !pw){ errEl.textContent = 'Please enter your email and password.'; errEl.style.display = ''; return; }
  btn.disabled = true; btn.textContent = 'Signing in…';
  var r;
  try { r = await _sbSignIn(email, pw); }
  catch(e) {
    btn.disabled = false; btn.textContent = 'Sign in';
    errEl.style.color='#c0392b';
    errEl.textContent = 'Connection error — please check your connection and try again.';
    errEl.style.display = ''; return;
  }
  btn.disabled = false; btn.textContent = 'Sign in';
  if(!r.ok){ errEl.style.color='#c0392b'; errEl.textContent = r.error; errEl.style.display = ''; return; }
  // Success — guard against cross-account data contamination.
  // Only check when alreadySetUp=true: there's local data that might belong to a different user.
  // On a clean device (alreadySetUp=false) there is nothing to contaminate, so skip the reload.
  if(alreadySetUp){
    var _storedUID = null;
    try{ _storedUID = localStorage.getItem('uv_uid'); }catch(_){}
    if(_storedUID !== r.user.id){
      // Different user (or pre-fix data with no uv_uid) — wipe local data and reload.
      // The boot sequence will detect _sbSession + !alreadySetUp and auto-load from cloud.
      try{ localStorage.removeItem(STORAGE_KEY); }catch(_){}
      try{ localStorage.setItem('uv_uid', r.user.id); }catch(_){}
      window._uvWipeInProgress = true; // prevent beforeunload saveToStorage() re-writing contaminated STATE
      location.reload();
      return;
    }
  }
  // Stamp uv_uid now (covers first sign-in on a clean device).
  try{ localStorage.setItem('uv_uid', r.user.id); }catch(_){}
  document.getElementById('welcome-overlay').classList.add('hidden');
  if(typeof updateTopbarSub !== 'undefined') updateTopbarSub();
  if(typeof _updateAccountChip !== 'undefined') _updateAccountChip();
  if(typeof _cloudToast !== 'undefined') _cloudToast('Signed in as ' + r.user.email);
  // New device (no localStorage) — check cloud for existing data before showing setup
  if(!alreadySetUp) {
    var cloudChk = await _cloudLoad();
    if(cloudChk.ok && !cloudChk.empty) {
      // Cloud data exists — load it into STATE
      if(cloudChk.saved.event)    Object.assign(STATE.event, cloudChk.saved.event);
      if(cloudChk.saved.settings) Object.assign(STATE.settings, cloudChk.saved.settings);
      ['guests','checklist','vendors','quotes','checklistCategories','checklistDrafts','checklistCatOrder','tables','timeline','families','invites'].forEach(function(k){ if(cloudChk.saved[k]) STATE[k]=cloudChk.saved[k]; });
      ['budget','seating','inspo','visionboard','wishingwell','website','events','tagDefs','inviteMeta','invitation','dashWidgetOrder','dashLayout','dashHiddenWidgets'].forEach(function(k){ if(cloudChk.saved[k]) STATE[k]=cloudChk.saved[k]; });
      saveToStorage();
      if(typeof updateTopbarSub !== 'undefined') updateTopbarSub();
      if(typeof navigate !== 'undefined') navigate('dashboard');
      // Only skip setup if partner names were actually entered (guards against blank auto-saved state)
      if(STATE.event.partner1 || STATE.event.partner2){
        if(typeof _cloudToast !== 'undefined') _cloudToast('Your data has been restored from the cloud ✓');
        window._autoSyncState='saved'; window._autoSyncLastSaved=Date.now();
        if(typeof _syncStatusRefresh !== 'undefined') _syncStatusRefresh();
        setTimeout(_mediaCloudSync, 800);
      } else {
        _showSetupModal();
      }
    } else {
      // No cloud data — show setup
      if(typeof navigate !== 'undefined') navigate('dashboard');
      _showSetupModal();
    }
  } else {
    // alreadySetUp=true and uv_uid matched: same user, local data is valid.
    if(typeof navigate !== 'undefined') navigate('dashboard');
    setTimeout(_autoSyncCheckOnBoot, 800);
  }
}

async function _lpSignUp() {
  var email = (document.getElementById('auth-up-email').value || '').trim();
  var pw = document.getElementById('auth-up-pw').value || '';
  var pw2 = document.getElementById('auth-up-pw2').value || '';
  var errEl = document.getElementById('lp-up-err');
  var btn = document.getElementById('lp-up-btn');
  errEl.style.display = 'none'; errEl.style.color = '#c0392b';
  if(!email || !pw){ errEl.textContent = 'Please fill in all fields.'; errEl.style.display = ''; return; }
  if(pw.length < 8){ errEl.textContent = 'Password must be at least 8 characters.'; errEl.style.display = ''; return; }
  if(pw !== pw2){ errEl.textContent = "Passwords don't match."; errEl.style.display = ''; return; }
  btn.disabled = true; btn.textContent = 'Creating account…';
  var r = await _sbSignUp(email, pw);
  btn.disabled = false; btn.textContent = 'Create free account';
  if(!r.ok){ errEl.textContent = r.error; errEl.style.display = ''; return; }
  errEl.style.color = 'var(--gold-deep,#8B6E3A)';
  errEl.textContent = '✓ Account created! Check your email to verify, then sign in.';
  errEl.style.display = '';
  btn.disabled = true;
}

function _lpContinueOffline() {
  document.getElementById('welcome-overlay').classList.add('hidden');
  if(typeof updateTopbarSub !== 'undefined') updateTopbarSub();
  if(typeof navigate !== 'undefined') navigate('dashboard');
  // First-time user (no setup data yet) → show setup modal
  if(!alreadySetUp) _showSetupModal();
}

function _showSetupModal() {
  var m = document.getElementById('setup-modal-overlay');
  if(m) m.classList.remove('hidden');
}

// Enter key submits active form
document.addEventListener('keydown', function(e){
  if(e.key !== 'Enter') return;
  var wo = document.getElementById('welcome-overlay');
  if(!wo || wo.classList.contains('hidden')) return;
  var si = document.getElementById('sign-in');
  if(si && si.style.display !== 'none'){ _lpSignIn(); }
  else { _lpSignUp(); }
});

// Hero canvas
(function() {
  var c = document.getElementById('heroCanvas');
  if(!c) return;
  var ctx = c.getContext('2d');
  function resize() {
    c.width = c.offsetWidth * devicePixelRatio;
    c.height = c.offsetHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    draw();
  }
  function draw() {
    var w = c.offsetWidth, h = c.offsetHeight;
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='#B8965A'; ctx.lineWidth=.5; ctx.globalAlpha=.12;
    for(var x=-h;x<w+h;x+=44){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+h,h);ctx.stroke();}
    ctx.globalAlpha=.09; ctx.lineWidth=.8;
    for(var rx=100;rx<800;rx+=100){ctx.beginPath();ctx.arc(w,h,rx,Math.PI,Math.PI*1.5);ctx.stroke();}
    ctx.globalAlpha=1;
  }
  if(typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(c);
  else resize();
})();

// Contact canvas
(function() {
  var c = document.getElementById('contactCanvas');
  if(!c) return;
  var ctx = c.getContext('2d');
  function resize() {
    c.width = c.offsetWidth * devicePixelRatio;
    c.height = c.offsetHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    draw();
  }
  function draw() {
    var w = c.offsetWidth, h = c.offsetHeight;
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='#B8965A'; ctx.lineWidth=.5; ctx.globalAlpha=.1;
    for(var x=-h;x<w+h;x+=44){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+h,h);ctx.stroke();}
    ctx.globalAlpha=1;
  }
  if(typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(c);
  else resize();
})();

