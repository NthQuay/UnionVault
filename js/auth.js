// AUTH MODAL JS
// ═══════════════════════════════════════
function _togglePw(id,btn){
  const inp=document.getElementById(id);
  if(!inp) return;
  const show=inp.type==='password';
  inp.type=show?'text':'password';
  // swap icon: open eye ↔ eye-off
  const svg=btn.querySelector('svg');
  if(svg) svg.innerHTML=show
    ?'<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    :'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  btn.setAttribute('aria-label',show?'Hide password':'Show password');
}
function openAuthModal(tab){
  _authTab(tab||'in');
  document.getElementById('auth-modal-overlay').classList.remove('hidden');
  setTimeout(()=>{const f=document.getElementById(tab==='up'?'auth-up-email':'auth-in-email');if(f)f.focus();},80);
}
function closeAuthModal(){
  document.getElementById('auth-modal-overlay').classList.add('hidden');
}
function _authTab(t){
  document.getElementById('auth-form-in').style.display=t==='in'?'':'none';
  document.getElementById('auth-form-up').style.display=t==='up'?'':'none';
  document.getElementById('auth-tab-in').style.borderBottomColor=t==='in'?'var(--gold)':'transparent';
  document.getElementById('auth-tab-up').style.borderBottomColor=t==='up'?'var(--gold)':'transparent';
  document.getElementById('auth-tab-in').style.color=t==='in'?'var(--ink)':'var(--muted)';
  document.getElementById('auth-tab-up').style.color=t==='up'?'var(--ink)':'var(--muted)';
  document.getElementById('auth-modal-title').textContent=t==='up'?'Create your account':'Sign in to Union Vault';
}
async function _authSignIn(){
  const email=(document.getElementById('auth-in-email').value||'').trim();
  const pw=document.getElementById('auth-in-pw').value||'';
  const errEl=document.getElementById('auth-in-err');
  const btn=document.getElementById('auth-in-btn');
  errEl.style.display='none';
  if(!email||!pw){errEl.textContent='Please enter your email and password.';errEl.style.display='';return;}
  btn.disabled=true;btn.textContent='Signing in…';
  const r=await _sbSignIn(email,pw);
  btn.disabled=false;btn.textContent='Sign in';
  if(!r.ok){errEl.textContent=r.error;errEl.style.display='';return;}
  // Guard against cross-account data contamination — same logic as _lpSignIn.
  // If local data belongs to a different user, wipe it and reload so the boot
  // path fetches the correct account's cloud data fresh.
  if(alreadySetUp){
    var _amUID=null;
    try{_amUID=localStorage.getItem('uv_uid');}catch(_){}
    if(_amUID!==r.user.id){
      try{localStorage.removeItem(STORAGE_KEY);}catch(_){}
      try{localStorage.setItem('uv_uid',r.user.id);}catch(_){}
      window._uvWipeInProgress = true; // prevent beforeunload saveToStorage() re-writing contaminated STATE
      location.reload();
      return;
    }
  }
  try{localStorage.setItem('uv_uid',r.user.id);}catch(_){}
  closeAuthModal();
  if(typeof _currentPage!=='undefined'&&_currentPage==='settings') navigate('settings');
  _cloudToast('Signed in as '+r.user.email);
}
async function _authSignUp(){
  const email=(document.getElementById('auth-up-email').value||'').trim();
  const pw=document.getElementById('auth-up-pw').value||'';
  const pw2=document.getElementById('auth-up-pw2').value||'';
  const errEl=document.getElementById('auth-up-err');
  const btn=document.getElementById('auth-up-btn');
  errEl.style.display='none';errEl.style.color='#c0392b';
  if(!email||!pw){errEl.textContent='Please fill in all fields.';errEl.style.display='';return;}
  if(pw.length<8){errEl.textContent='Password must be at least 8 characters.';errEl.style.display='';return;}
  if(pw!==pw2){errEl.textContent="Passwords don't match.";errEl.style.display='';return;}
  btn.disabled=true;btn.textContent='Creating account…';
  const r=await _sbSignUp(email,pw);
  btn.disabled=false;btn.textContent='Create account';
  if(!r.ok){errEl.textContent=r.error;errEl.style.display='';return;}
  errEl.style.color='var(--gold-deep,#7d5c1b)';
  errEl.textContent='✓ Account created! Check your email to verify, then sign in.';
  errEl.style.display='';
  btn.disabled=true;
}
function _toggleSignoutPop(){
  const pop=document.getElementById('sidebar-signout-pop');
  const cd=document.getElementById('couple-display-btn');
  if(!pop) return;
  const isOpen=pop.classList.contains('visible');
  if(isOpen){ pop.style.opacity='0';pop.style.transform='translateY(6px)';pop.style.pointerEvents='none';pop.classList.remove('visible');cd.classList.remove('open'); }
  else {
    // populate email
    const emailEl=document.getElementById('sidebar-signout-email');
    if(emailEl&&_sbSession&&_sbSession.user){
      emailEl.style.display='';
      emailEl.innerHTML=`<div style="font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:2px">Signed in as</div><div style="font-size:12px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(_sbSession.user.email||'')}</div>`;
    }
    else if(emailEl) emailEl.style.display='none';
    // A collapsed sidebar is 56px wide and clips overflow, so float the menu over the page instead.
    const sb=document.getElementById('sidebar');
    if(sb&&sb.classList.contains('collapsed')&&cd){
      const r=cd.getBoundingClientRect();
      pop.style.position='fixed'; pop.style.left=(r.left+4)+'px'; pop.style.right='auto';
      pop.style.bottom=(window.innerHeight-r.top+6)+'px'; pop.style.width='230px';
    } else { pop.style.position='absolute'; pop.style.left='0'; pop.style.right='0'; pop.style.bottom='calc(100% + 6px)'; pop.style.width=''; }
    pop.style.opacity='1';pop.style.transform='translateY(0)';pop.style.pointerEvents='auto';pop.classList.add('visible');cd.classList.add('open');
  }
}
function _closeSignoutPop(){
  const pop=document.getElementById('sidebar-signout-pop');
  const cd=document.getElementById('couple-display-btn');
  if(pop){pop.style.opacity='0';pop.style.transform='translateY(6px)';pop.style.pointerEvents='none';pop.classList.remove('visible');}
  if(cd) cd.classList.remove('open');
}
function _showSupportModal(){
  if(document.getElementById('_supp-overlay')) return;
  const userEmail=(typeof _sbSession!=='undefined'&&_sbSession&&_sbSession.user&&_sbSession.user.email)||'';
  const overlay=document.createElement('div');
  overlay.id='_supp-overlay';
  overlay.className='modal-overlay';
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
  overlay.innerHTML=`<div class="modal" style="max-width:520px">
    <div class="modal-header"><div class="modal-title">Contact support</div><button class="modal-close" onclick="document.getElementById('_supp-overlay').remove()">&#x2715;</button></div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;padding-bottom:8px">
      <div style="font-size:13px;color:var(--muted)">Have a question or found a bug? We&#8217;ll get back to you at <strong>support@unionvault.app</strong>.</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <label style="font-size:11px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase">Your email</label>
        <input id="_supp-email" type="email" value="${userEmail}" placeholder="your@email.com" style="padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink);font-family:var(--font-body);font-size:13px;outline:none;width:100%">
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <label style="font-size:11px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase">Subject</label>
        <select id="_supp-subject" style="padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink);font-family:var(--font-body);font-size:13px;outline:none;cursor:pointer;width:100%">
          <option>Bug report</option><option>Feature request</option><option>Question</option><option>Billing</option><option>Other</option>
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <label style="font-size:11px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase">Message</label>
        <textarea id="_supp-msg" placeholder="Describe your issue or question&#x2026;" style="padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--ink);font-family:var(--font-body);font-size:13px;min-height:110px;resize:vertical;outline:none;width:100%"></textarea>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <label style="font-size:11px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase">Screenshots <span style="text-transform:none;font-size:10.5px">(optional, max 4 &#xB7; 5 MB each)</span></label>
        <label id="_supp-file-label" style="display:flex;align-items:center;gap:8px;padding:9px 12px;border:1px dashed var(--border);border-radius:8px;cursor:pointer;color:var(--muted);font-size:13px;transition:border-color .15s" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Attach images
          <input id="_supp-files" type="file" accept="image/*" multiple style="display:none" onchange="_suppFilesChanged(this)">
        </label>
        <div id="_supp-previews" style="display:flex;flex-wrap:wrap;gap:8px"></div>
      </div>
      <div id="_supp-status" style="display:none;font-size:13px;padding:9px 12px;border-radius:8px"></div>
    </div>
    <div class="modal-footer" style="display:flex;flex-direction:column;gap:8px;padding:12px 24px 20px">
      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button onclick="document.getElementById('_supp-overlay').remove()" class="btn btn-outline btn-sm">Cancel</button>
        <button id="_supp-submit-btn" onclick="_submitSupportForm(this)" class="btn btn-primary btn-sm">Send message</button>
      </div>
      <div style="text-align:center;padding-top:2px">
        <button onclick="document.getElementById('_supp-overlay').remove();_openTermsModal()" style="background:none;border:none;padding:0;color:var(--muted);font-family:var(--font-body);font-size:11.5px;cursor:pointer;text-decoration:underline;text-underline-offset:2px">Terms &amp; Privacy</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}
function _suppFilesChanged(input){
  const inp=document.getElementById('_supp-files');
  if(!inp) return;
  const incoming=Array.from(input.files||[]);
  const existing=inp._allFiles||[];
  inp._allFiles=existing.concat(incoming).slice(0,4);
  const dt=new DataTransfer();
  inp._allFiles.forEach(function(f){dt.items.add(f);});
  inp.files=dt.files;
  _suppRenderPreviews();
}
function _suppRenderPreviews(){
  const inp=document.getElementById('_supp-files');
  const prev=document.getElementById('_supp-previews');
  if(!prev||!inp) return;
  prev.innerHTML='';
  (inp._allFiles||[]).forEach(function(file,i){
    const url=URL.createObjectURL(file);
    const w=document.createElement('div');
    w.style.cssText='position:relative;width:72px;height:72px';
    w.innerHTML='<img src="'+url+'" style="width:72px;height:72px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">'
      +'<button onclick="_suppRemoveFile('+i+')" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--ink);color:var(--bg);border:none;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center">&#x2715;</button>';
    prev.appendChild(w);
  });
}
function _suppRemoveFile(idx){
  const inp=document.getElementById('_supp-files');
  if(!inp) return;
  inp._allFiles=(inp._allFiles||[]).filter(function(_,i){return i!==idx;});
  const dt=new DataTransfer();
  inp._allFiles.forEach(function(f){dt.items.add(f);});
  inp.files=dt.files;
  _suppRenderPreviews();
}
async function _submitSupportForm(btn){
  const email=(document.getElementById('_supp-email')||{}).value||'';
  const subject=(document.getElementById('_supp-subject')||{}).value||'Other';
  const msg=(document.getElementById('_supp-msg')||{}).value||'';
  if(!email.trim()||!msg.trim()){_suppStatus('Please fill in your email and message.',false);return;}
  btn.disabled=true; btn.textContent='Sending…';
  try{
    const _suppInp=document.getElementById('_supp-files')||{};
    const files=(_suppInp._allFiles||Array.from(_suppInp.files||[])).slice(0,4);
    files.forEach(function(f){if(f.size>5*1024*1024)throw new Error(f.name+' is over 5 MB');});
    const coupleName=(document.getElementById('sidebar-couple-names')||{}).textContent||'';
    const screenshotUrls=[];
    if(files.length){
      for(const f of files){
        const ext=f.name.split('.').pop()||'jpg';
        const path='bug-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext;
        const r=await fetch(_SB_URL+'/storage/v1/object/support/'+path,{method:'POST',headers:{'apikey':_SB_KEY,'Authorization':_sbAuthHdr(),'Content-Type':f.type,'x-upsert':'true'},body:f});
        if(!r.ok) throw new Error('Screenshot upload failed: '+r.status);
        screenshotUrls.push(_SB_URL+'/storage/v1/object/public/support/'+path);
      }
    }
    const res=await fetch(_SB_URL+'/functions/v1/send-support-email',{method:'POST',headers:{'Content-Type':'application/json','apikey':_SB_KEY,'Authorization':_sbAuthHdr()},body:JSON.stringify({email:email.trim(),coupleName:coupleName||'',subject,message:msg.trim(),screenshotUrls})});
    const data=await res.json();
    if(!res.ok||data.error) throw new Error(data.error||'Submission failed');
    _suppStatus('Message sent ✔ We’ll get back to you shortly.',true);
    btn.textContent='Sent ✔';
    setTimeout(function(){const o=document.getElementById('_supp-overlay');if(o)o.remove();},2200);
  }catch(e){
    _suppStatus(e.message&&e.message.includes('over 5')? e.message:('Something went wrong: '+(e.message||'unknown error')),false);
    btn.disabled=false; btn.textContent='Send message';
  }
}
function _suppStatus(msg,ok){
  const el=document.getElementById('_supp-status');
  if(!el) return;
  el.textContent=msg;
  el.style.cssText='display:block;font-size:13px;padding:9px 12px;border-radius:8px;background:'+(ok?'rgba(100,180,100,.12)':'rgba(180,50,50,.12)')+';color:'+(ok?'#4c4':'#e44');
}
async function _submitLandingContact(btn){
  const name=(document.getElementById('lp-contact-name')||{}).value||'';
  const email=(document.getElementById('lp-contact-email')||{}).value||'';
  const msg=(document.getElementById('lp-contact-msg')||{}).value||'';
  const status=document.getElementById('lp-contact-status');
  if(!name.trim()||!email.trim()||!msg.trim()){
    if(status){status.textContent='Please fill in all fields.';status.style.cssText='display:block;font-size:13px;padding:10px 14px;border-radius:8px;background:rgba(180,50,50,.12);color:#e44';}
    return;
  }
  btn.disabled=true; btn.textContent='Sending…';
  try{
    const res=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({access_key:_W3F_KEY,subject:'Contact from '+name.trim(),from_name:name.trim(),name:name.trim(),email:email.trim(),message:msg.trim(),redirect:'false'})});
    const data=await res.json();
    if(!data.success) throw new Error(data.message||'Failed');
    if(status){status.textContent='Message sent ✔ We’ll get back to you shortly.';status.style.cssText='display:block;font-size:13px;padding:10px 14px;border-radius:8px;background:rgba(100,180,100,.1);color:#4c4';}
    ['lp-contact-name','lp-contact-email','lp-contact-msg'].forEach(function(id){const el=document.getElementById(id);if(el)el.value='';});
    btn.textContent='Sent ✔';
  }catch(e){
    if(status){status.textContent='Something went wrong — please email support@unionvault.app';status.style.cssText='display:block;font-size:13px;padding:10px 14px;border-radius:8px;background:rgba(180,50,50,.12);color:#e44';}
    btn.disabled=false; btn.textContent='Send message';
  }
}
// Close popover on outside click
document.addEventListener('click',function(e){
  const cd=document.getElementById('couple-display-btn');
  const pop=document.getElementById('sidebar-signout-pop');
  if(pop&&pop.classList.contains('visible')&&cd&&!cd.contains(e.target)&&!pop.contains(e.target)){
    _closeSignoutPop();
  }
},true);
async function cloudSignOut(){
  await _sbSignOut();
  // Navigate to the bare pathname (strips any hash) so the boot router doesn't
  // misinterpret a section hash like #website or #checklist as a wedding site slug
  // and show "Wedding site not found" instead of the landing page.
  location.href=location.pathname;
}

function _openDeleteAccountModal(){
  if(!_sbSession){ _cloudToast('Sign in to delete your account',true); return; }
  openModal(
    'Delete Account',
    `<div>
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:18px;padding:12px 14px;background:color-mix(in srgb,var(--red,#c0392b) 8%,transparent 92%);border:1px solid color-mix(in srgb,var(--red,#c0392b) 25%,transparent 75%);border-radius:10px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red,#c0392b)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div style="font-size:12.5px;color:var(--ink);line-height:1.5"><strong>This cannot be undone.</strong> Your account, all planning data, guest lists, photos and backups will be permanently deleted.</div>
      </div>
      <div>
        <label class="form-label">Enter your password to confirm</label>
        <input type="password" id="del-acct-pw" class="form-input" placeholder="Your current password" autocomplete="current-password" onkeydown="if(event.key==='Enter'){var b=document.getElementById('del-acct-confirm-btn');if(b&&!b.disabled)_confirmDeleteAccount(b);}">
        <div id="del-acct-err" style="display:none;font-size:12px;color:var(--red,#c0392b);margin-top:6px"></div>
      </div>
    </div>`,
    `<button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-danger" id="del-acct-confirm-btn" onclick="_confirmDeleteAccount(this)">Delete my account</button>`
  );
  setTimeout(()=>{ const el=document.getElementById('del-acct-pw'); if(el) el.focus(); },120);
}

async function _confirmDeleteAccount(btn){
  if(!_sbSession){ closeModalDirect(); _cloudToast('Not signed in',true); return; }
  const pw=(document.getElementById('del-acct-pw')||{}).value||'';
  const errEl=document.getElementById('del-acct-err');
  if(!pw){
    if(errEl){ errEl.textContent='Please enter your password.'; errEl.style.display=''; }
    return;
  }
  btn.disabled=true; btn.textContent='Deleting…';
  if(errEl) errEl.style.display='none';
  try{
    const email=_sbSession.user.email;
    // Re-verify password before deletion
    const check=await _sbSignIn(email,pw);
    if(check.error){
      if(errEl){ errEl.textContent='Incorrect password. Please try again.'; errEl.style.display=''; }
      btn.disabled=false; btn.textContent='Delete my account';
      return;
    }
    await _sbEnsureFreshToken();
    const r=await fetch(`${_SB_URL}/rest/v1/rpc/delete_own_account`,{
      method:'POST',
      headers:{'apikey':_SB_KEY,'Authorization':_sbAuthHdr(),'Content-Type':'application/json'},
      body:'{}'
    });
    if(!r.ok){
      const eb=await r.json().catch(()=>({}));
      throw new Error(eb.message||eb.hint||eb.error||'Account deletion failed');
    }
    await _sbSignOut();
    closeModalDirect();
    location.href=location.pathname;
  }catch(e){
    if(errEl){ errEl.textContent=e.message||'Something went wrong. Please try again.'; errEl.style.display=''; }
    btn.disabled=false; btn.textContent='Delete my account';
  }
}

function _cloudAccountHtml(){
  const user=_sbSession?_sbSession.user:null;
  if(!user) return `<p style="font-size:13px;color:var(--muted);margin:0 0 14px;line-height:1.5">Create an account or sign in to save your planner to the cloud and access it from any device.</p>`
    +`<div style="display:flex;gap:10px;flex-wrap:wrap">`
    +`<button class="btn btn-primary btn-sm" onclick="openAuthModal('in')" style="display:inline-flex;align-items:center;gap:5px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>Sign in</button>`
    +`<button class="btn btn-outline btn-sm" onclick="openAuthModal('up')" style="display:inline-flex;align-items:center;gap:5px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Create account</button></div>`;

  const _tierLabel=typeof _uvTier!=='undefined'&&_uvTier==='full'?'Full Access':typeof _uvTier!=='undefined'&&_uvTier==='trial'?'Free Trial':'Free Tier';
  const _tierBadgeBg=_uvTier==='full'?'rgba(61,148,84,.12)':_uvTier==='trial'?'rgba(196,168,130,.15)':'rgba(196,168,130,.15)';
  const _tierBadgeColor=_uvTier==='full'?'var(--green,#3D9454)':'var(--gold-deep)';
  const _planShort=typeof _uvCurrentPlan==='function'&&_uvCurrentPlan()?_uvCurrentPlan().label:'';
  const _tierSub=_uvTier==='full'&&_planShort?_planShort:_uvTier==='trial'?(typeof _uvTrialDaysLeft!=='undefined'&&_uvTrialDaysLeft?_uvTrialDaysLeft+' days left':'Trial'):'Upgrade available';

  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding:12px 14px;background:var(--surface);border:.5px solid var(--border);border-radius:10px">`
    +`<div style="width:36px;height:36px;border-radius:50%;background:var(--parchment);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep,#7d5c1b)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`
    +`<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.email}</div><div style="font-size:11px;color:var(--muted)">Signed in</div></div>`
    +`<button class="btn btn-ghost btn-sm" onclick="cloudSignOut()" style="color:var(--muted);font-size:12px;white-space:nowrap">Sign out</button></div>`
    +`<div onclick="_uvOpenSubPage()" style="display:flex;align-items:center;gap:12px;margin-bottom:10px;padding:12px 14px;background:var(--surface);border:.5px solid var(--border);border-radius:10px;cursor:pointer;transition:border-color .15s" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'">`
    +`<div style="width:36px;height:36px;border-radius:50%;background:rgba(196,168,130,.08);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>`
    +`<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500">Subscription</div><div style="font-size:11px;color:var(--muted);display:flex;align-items:center;gap:6px"><span style="font-size:10px;font-weight:700;letter-spacing:.04em;padding:1px 7px;border-radius:6px;background:${_tierBadgeBg};color:${_tierBadgeColor}">${_escHtml(_tierLabel)}</span><span>${_escHtml(_tierSub)}</span></div></div>`
    +`<div style="color:var(--muted);flex-shrink:0;transition:transform .15s"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div></div>`
    +`<div id="auto-sync-row" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding:10px 14px;background:var(--surface);border:.5px solid var(--border);border-radius:10px">`
    +`<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;font-weight:500">Auto-sync</span><span style="font-size:11px;color:var(--muted)">Automatically save & load from cloud</span><div id="sync-status-strip" style="margin-top:4px;font-size:11px;color:var(--muted);display:flex;align-items:center;gap:5px">${_syncStatusHtml()}</div></div>`
    +`<label style="position:relative;display:inline-block;width:38px;height:22px;flex-shrink:0"><input type="checkbox" id="auto-sync-toggle" onchange="_autoSyncToggleChange(this.checked)" style="opacity:0;width:0;height:0;position:absolute"><span onclick="" style="position:absolute;cursor:pointer;inset:0;background:${(typeof STATE!=='undefined'&&STATE.settings&&STATE.settings.autoSync===false)?'var(--muted)':'var(--gold,#c9a84c)'};border-radius:11px;transition:.2s;display:block" id="auto-sync-track"></span><span id="auto-sync-thumb" style="position:absolute;left:${(typeof STATE!=='undefined'&&STATE.settings&&STATE.settings.autoSync===false)?'3px':'19px'};top:3px;width:16px;height:16px;background:#fff;border-radius:50%;transition:.2s;pointer-events:none"></span></label></div>`;
}

// ── CLOUD BACKUPS ────────────────────────────────────────────────────────────
async function _backupNow(btn, silent){
  if(!_sbSession){ if(!silent) _cloudToast('Not signed in',true); return; }
  if(btn){ btn.disabled=true; btn.textContent='Saving…'; }
  try{
    await _sbEnsureFreshToken();
    const uid=_sbSession.user.id;
    // Fetch all sections then bundle into one snapshot object
    const rows=await _sbSelect('planner_data','user_id=eq.'+uid+'&select=section,data');
    if(!rows||!rows.length) throw new Error('No data to back up');
    const snapshot={};
    rows.forEach(row=>{ snapshot[row.section]=row.data; });
    // Insert new backup
    const insR=await fetch(`${_SB_URL}/rest/v1/planner_backups`,{
      method:'POST',
      headers:{'apikey':_SB_KEY,'Authorization':_sbAuthHdr(),'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify({user_id:uid,data:snapshot})
    });
    if(!insR.ok){ const eb=await insR.json().catch(()=>({})); throw new Error(eb.message||eb.error||'Insert failed'); }
    // Prune to 48 most recent — fetch all ids sorted newest-first then delete the tail
    const ids=await _sbSelect('planner_backups','user_id=eq.'+uid+'&select=id&order=created_at.desc');
    if(ids && ids.length>48){
      const toDelete=ids.slice(48).map(r=>r.id);
      await fetch(`${_SB_URL}/rest/v1/planner_backups?id=in.(${toDelete.join(',')})`,{
        method:'DELETE',
        headers:{'apikey':_SB_KEY,'Authorization':_sbAuthHdr(),'Prefer':'return=minimal'}
      });
    }
    if(!silent) _cloudToast('Backup saved ✓');
  }catch(e){
    if(!silent) _cloudToast('Backup failed: '+(e.message||e),true);
  }finally{
    if(btn){ btn.disabled=false; btn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-8.9"/></svg>Back up now'; }
  }
}

async function _openBackupModal(){
  if(!_sbSession){ _cloudToast('Not signed in',true); return; }
  openModal('Backups','<div style="text-align:center;padding:20px;color:var(--muted)">Loading…</div>','<button class="btn btn-primary" onclick="closeModalDirect()">Close</button>');
  try{
    await _sbEnsureFreshToken();
    const uid=_sbSession.user.id;
    const rows=await _sbSelect('planner_backups','user_id=eq.'+uid+'&select=id,created_at&order=created_at.desc&limit=48');
    if(!rows) throw new Error('Failed to load backups');
    const body=document.getElementById('modal-body');
    if(!body) return;
    if(!rows.length){
      body.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center;padding:16px 0">No backups yet. Click "Back up now" to create your first snapshot.</p>';
      return;
    }
    body.innerHTML=`<p style="font-size:12px;color:var(--muted);margin:0 0 12px">Select a backup to restore. Your current data will be replaced.</p>`
      +`<div style="display:flex;flex-direction:column;gap:6px;max-height:360px;overflow-y:auto">`
      +rows.map((row,i)=>{
        const d=new Date(row.created_at);
        const label=d.toLocaleDateString([],{day:'numeric',month:'short',year:'numeric'})+' · '+d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
        const badge=i===0?`<span style="font-size:10px;background:rgba(201,168,100,.2);color:var(--gold-deep);border-radius:9px;padding:2px 7px;font-weight:600;letter-spacing:.03em;flex-shrink:0">Latest</span>`:'';
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--surface);border:1px solid var(--border);border-radius:9px">`
          +`<div style="flex:1;min-width:0"><span style="font-size:12.5px;font-weight:500">${label}</span>${badge?(' '+badge):''}</div>`
          +`<button class="btn btn-outline btn-sm" onclick="_restoreFromBackup('${row.id}',this)" style="font-size:11px;white-space:nowrap">Restore</button>`
          +`</div>`;
      }).join('')
      +`</div>`;
  }catch(e){
    const body=document.getElementById('modal-body');
    if(body) body.innerHTML=`<p style="color:var(--red);font-size:13px">${e.message||'Failed to load backups'}</p>`;
  }
}

async function _restoreFromBackup(backupId, btn){
  if(!confirm('Restore this backup? Your current data will be replaced.')) return;
  if(btn){ btn.disabled=true; btn.textContent='Restoring…'; }
  try{
    await _sbEnsureFreshToken();
    const rows=await _sbSelect('planner_backups','id=eq.'+backupId+'&select=data&limit=1');
    if(!rows||!rows.length) throw new Error('Backup not found');
    const snap=rows[0].data;
    // Write each section back into planner_data
    const uid=_sbSession.user.id;
    const upserts=Object.entries(snap).map(([section,data])=>({user_id:uid,section,data,updated_at:new Date().toISOString()}));
    const ok=await _sbUpsert('planner_data',upserts,'user_id,section');
    if(!ok) throw new Error('Restore write failed');
    // Reload from cloud to update STATE
    await cloudLoadClick(true);
    closeModalDirect();
    _cloudToast('Backup restored ✓');
  }catch(e){
    if(btn){ btn.disabled=false; btn.textContent='Restore'; }
    _cloudToast('Restore failed: '+(e.message||e),true);
  }
}

function _syncStatusHtml(){
  const s=window._autoSyncState||'idle';
  const t=window._autoSyncLastSaved||null;
  if(s==='saving') return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;animation:_syncpulse 1.2s ease-in-out infinite;flex-shrink:0"></span><span>Saving…</span>`;
  if(s==='saved'&&t){
    const d=new Date(t);
    const now=new Date();
    const diff=Math.round((now-d)/60000);
    let lab=diff<1?'Just now':diff===1?'1 min ago':diff<60?diff+' mins ago':d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
    return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0"></span><span>Synced · ${lab}</span>`;
  }
  if(s==='error') return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0"></span><span>Sync failed — check connection</span>`;
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--muted);opacity:.5;flex-shrink:0"></span><span>Not yet synced</span>`;
}

// ── AUTO-SYNC ENGINE ─────────────────────────────────────────────────────────
window._autoSyncState='idle';
window._autoSyncLastSaved=null;
let _autoSyncTimer=null;
const _AUTOSYNC_DEBOUNCE=2000; // 2 s

function _autoSyncEnabled(){
  return _sbSession && (typeof STATE==='undefined' || STATE.settings==null || STATE.settings.autoSync!==false);
}

function _syncStatusRefresh(){
  const el=document.getElementById('sync-status-strip');
  if(el) el.innerHTML=_syncStatusHtml();
  // also keep toggle thumb/track in sync with current STATE
  const on=_autoSyncEnabled();
  const track=document.getElementById('auto-sync-track');
  const thumb=document.getElementById('auto-sync-thumb');
  const chk=document.getElementById('auto-sync-toggle');
  if(track) track.style.background=on?'var(--gold,#c9a84c)':'var(--muted)';
  if(thumb) thumb.style.left=on?'19px':'3px';
  if(chk) chk.checked=on;
  // Show/hide the persistent sync-fail banner
  const banner=document.getElementById('sync-fail-banner');
  if(banner){
    const failed=window._autoSyncState==='error';
    banner.style.display=failed&&!banner._dismissed?'flex':'none';
  }
  // Keep account chip updated
  _updateAccountChip();
}
let _syncFailBannerDismissedUntil=0;
function _syncFailBannerDismiss(){ document.getElementById('sync-fail-banner')._dismissed=true; document.getElementById('sync-fail-banner').style.display='none'; }
async function _syncFailBannerRetry(){
  const banner=document.getElementById('sync-fail-banner');
  if(banner){ banner._dismissed=false; }
  window._autoSyncState='saving'; _syncStatusRefresh();
  const r=await _cloudSave(true);
  if(r&&r.ok){ window._autoSyncState='saved'; window._autoSyncLastSaved=Date.now(); }
  else { window._autoSyncState='error'; }
  _syncStatusRefresh();
}
function _updateAccountChip(){
  const chip=document.getElementById('topbar-account-chip');
  const emailEl=document.getElementById('topbar-account-email');
  if(!chip||!emailEl) return;
  // The login email now lives in the sidebar account menu ("Signed in as …"), not the top bar.
  chip.style.display='none';
}

function _autoSyncToggleChange(on){
  if(!STATE.settings) STATE.settings={};
  STATE.settings.autoSync=on;
  saveToStorage();
  _syncStatusRefresh();
  if(on) _autoSyncSchedule();
}

function _autoSyncSchedule(){
  if(!_autoSyncEnabled()) return;
  if(_autoSyncTimer) clearTimeout(_autoSyncTimer);
  _autoSyncTimer=setTimeout(_autoSyncFlush,_AUTOSYNC_DEBOUNCE);
}

async function _autoSyncFlush(keepalive){
  _autoSyncTimer=null;
  if(!_autoSyncEnabled()) return;
  window._autoSyncState='saving';
  _syncStatusRefresh();
  try{
    const r=await _cloudSave(true,keepalive);
    if(r&&r.ok){ window._autoSyncState='saved'; window._autoSyncLastSaved=Date.now(); }
    else { window._autoSyncState='error'; }
  }catch(e){
    console.warn('Auto-sync flush failed',e);
    window._autoSyncState='error';
  }
  _syncStatusRefresh();
}

// visibilitychange + beforeunload — flush immediately if pending, check cloud on resume
let _lastVisibilitySync=0;
document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='hidden'){
    // Do NOT flush during an account-switch reload — the new session is set but STATE still
    // belongs to the old account; flushing here would write old data to the new account.
    if(_autoSyncTimer && !window._uvWipeInProgress){ clearTimeout(_autoSyncTimer); _autoSyncTimer=null; _autoSyncFlush(true); }
  } else if(document.visibilityState==='visible'){
    // PWA resumed from background — re-check cloud for newer data (throttled to once per 5 min)
    const now=Date.now();
    if(now-_lastVisibilitySync>5*60*1000){
      _lastVisibilitySync=now;
      setTimeout(_autoSyncCheckOnBoot,1500);
    }
  }
});
window.addEventListener('beforeunload',function(){
  // Do NOT flush during an account-switch reload — same reason as visibilitychange above.
  if(_autoSyncTimer && !window._uvWipeInProgress){
    clearTimeout(_autoSyncTimer);
    _autoSyncTimer=null;
    // keepalive:true lets the fetch survive tab close (browser allows up to ~64KB)
    _autoSyncFlush(true);
  }
});

async function _autoSyncCheckOnBoot(){
  if(!_sbSession) return;
  // If we just reloaded after a JSON import, push local data UP — don't load from cloud.
  var _importFlag = null;
  try{ _importFlag = sessionStorage.getItem('uv_import_pending'); }catch(_){}
  if(_importFlag){
    try{ sessionStorage.removeItem('uv_import_pending'); }catch(_){}
    // Stamp a recent _lastCloudSave so the conflict checker treats local as up-to-date
    // and does NOT pull old cloud data over the freshly imported data.
    // We do NOT auto-cloud-save here: the user should verify the import looks right first.
    // The regular auto-sync schedule will push it up after the next manual save or auto-push interval.
    if(!STATE.settings._lastCloudSave){
      STATE.settings._lastCloudSave = new Date().toISOString();
      saveToStorage();
      // Cancel the auto-sync that saveToStorage() just scheduled.
      // Imported data must be pushed to cloud ONLY when the user explicitly clicks "Save to Cloud".
      if(_autoSyncTimer){ clearTimeout(_autoSyncTimer); _autoSyncTimer=null; }
    }
    if(typeof _cloudToast !== 'undefined') _cloudToast('Data imported ✓ — click Save to Cloud to back it up');
    return;
  }
  await _sbEnsureFreshToken();
  // If token refresh failed (expired refresh token), clear session and prompt re-login
  if(_sbTokenExpired()){
    _sbPersist(null);
    const ol=document.getElementById('welcome-overlay');
    if(ol) ol.classList.remove('hidden');
    return;
  }
  try{
    const res=await fetch(`${_SB_URL}/rest/v1/planner_data?user_id=eq.${_sbSession.user.id}&select=updated_at`,{
      headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+_sbSession.access_token}
    });
    if(!res.ok){
      // 401 = token was rejected; clear session and show login prompt
      if(res.status===401){ _sbPersist(null); const ol=document.getElementById('welcome-overlay'); if(ol) ol.classList.remove('hidden'); }
      return;
    }
    const rows=await res.json();
    if(!rows||!rows.length) return;
    const localTsRaw=STATE.settings&&STATE.settings._lastCloudSave;
    const maxTs=Math.max(...rows.map(r=>r.updated_at?new Date(r.updated_at).getTime():0));
    if(!maxTs) return;
    const cloudTs=maxTs;
    if(!localTsRaw){
      // Never cloud-synced on this device
      // If there's existing local data, ask first — don't silently overwrite it
      const hasLocal=!!(STATE.guests&&STATE.guests.length)||!!(STATE.event&&(STATE.event.names||STATE.event.date));
      if(hasLocal){
        const _sup=(function(){try{var v=localStorage.getItem('uv-suppress-conflict');return v==='0'?false:true;}catch(e){}return STATE.settings?.suppressVersionMismatch!==false;})();
        if(_sup){ await cloudLoadClick(true); return; }
        _showConflictDialog(cloudTs,0);
        return;
      }
      // No local data — safe to restore silently
      cloudLoadClick(false);
      return;
    }
    const localTs=new Date(localTsRaw).getTime();
    if(cloudTs-localTs>5000){
      // Cloud is newer — show dialog so user can choose to keep local changes
      const _sup=(function(){try{var v=localStorage.getItem('uv-suppress-conflict');return v==='0'?false:true;}catch(e){}return STATE.settings?.suppressVersionMismatch!==false;})();
      if(_sup){ await cloudLoadClick(true); return; }
      _showConflictDialog(cloudTs,localTs);
    } else {
      // Cloud is same age or older — push local up if auto-sync is on
      if(_autoSyncEnabled()) _autoSyncSchedule();
    }
  }catch(e){ console.warn('Boot conflict check failed',e); }
}
// Poll for cloud updates every 5 minutes while a session is active
setInterval(function(){ if(_sbSession) _autoSyncCheckOnBoot(); }, 5*60*1000);

function _showConflictDialog(cloudTs,localTs){
  try{if(localStorage.getItem('uv-suppress-conflict')!=='0') return;}catch(e){}
  if(STATE.settings?.suppressVersionMismatch!==false) return;
  const fmt=ts=>ts?new Date(ts).toLocaleString([],{dateStyle:'medium',timeStyle:'short'}):'Unknown';
  const overlay=document.createElement('div');
  overlay.id='conflict-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML=`
    <div style="background:var(--canvas);border-radius:16px;padding:24px;max-width:420px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.3)">
      <h3 style="margin:0 0 6px;font-size:17px;font-weight:600">Version mismatch detected</h3>
      <p style="font-size:13px;color:var(--muted);margin:0 0 18px;line-height:1.5">Your cloud version is newer than this device. Which version would you like to use?</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px">
        <label id="cv-card" onclick="_conflictSelect('cloud')" style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:10px;border:2px solid var(--gold,#c9a84c);cursor:pointer;background:var(--surface)">
          <input type="radio" name="cv" value="cloud" checked style="margin-top:2px;accent-color:var(--gold,#c9a84c)">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;display:flex;align-items:center;gap:6px">Cloud version <span style="font-size:10px;background:var(--gold,#c9a84c);color:#fff;padding:1px 7px;border-radius:20px;font-weight:600">Newer</span></div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${fmt(cloudTs)}</div>
          </div>
        </label>
        <label id="lv-card" onclick="_conflictSelect('local')" style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:10px;border:2px solid var(--border);cursor:pointer;background:var(--surface)">
          <input type="radio" name="cv" value="local" style="margin-top:2px;accent-color:var(--gold,#c9a84c)">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;display:flex;align-items:center;gap:6px">This device <span style="font-size:10px;background:var(--muted);color:#fff;padding:1px 7px;border-radius:20px;font-weight:600">Older</span></div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${fmt(localTs)}</div>
          </div>
        </label>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" onclick="_conflictDismiss()" style="font-size:13px">Decide later</button>
        <button class="btn btn-primary btn-sm" id="conflict-use-btn" onclick="_conflictApply()" style="font-size:13px">Use selected version</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  // Add pulse keyframe if not already present
  if(!document.getElementById('_syncpulse-style')){
    const s=document.createElement('style');
    s.id='_syncpulse-style';
    s.textContent='@keyframes _syncpulse{0%,100%{opacity:1}50%{opacity:.35}}';
    document.head.appendChild(s);
  }
  window._conflictChoice='cloud';
}

function _conflictSelect(choice){
  window._conflictChoice=choice;
  const cc=document.getElementById('cv-card');
  const lc=document.getElementById('lv-card');
  if(cc) cc.style.borderColor=choice==='cloud'?'var(--gold,#c9a84c)':'var(--border)';
  if(lc) lc.style.borderColor=choice==='local'?'var(--gold,#c9a84c)':'var(--border)';
  // update radio
  const radios=document.querySelectorAll('input[name="cv"]');
  radios.forEach(r=>{ r.checked=(r.value===choice); });
}

function _conflictDismiss(){
  const el=document.getElementById('conflict-overlay');
  if(el) el.remove();
}

async function _conflictApply(){
  const btn=document.getElementById('conflict-use-btn');
  if(btn){ btn.disabled=true; btn.textContent='Loading…'; }
  if(window._conflictChoice==='cloud'){
    // Silently snapshot local state before overwriting — recoverable from View Backups
    await _backupNow(null,true);
    await cloudLoadClick(true); // silent=true
  }
  _conflictDismiss();
}

