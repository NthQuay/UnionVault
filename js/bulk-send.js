// Bulk email from UnionVault: save the dates, invitations and RSVP nudges to many guests at once.
// Every email goes out through the send-guest-email edge function (invites@unionvault.app, replies
// to the couple) — one per household, the same message the per-guest send sheet would produce.
// Never opens the user's own mail app. Needs a signed-in account; otherwise it says so.
let _bs=null; // {kind, rows:[{slotKey,name,addrs:[{email,name,guestId,on}],sent,checked}], skipped:{noEmail,bounced}, running, failed:[]}

const _BS_KIND={
  savedate:{noun:'save the date', title:'Send save the dates', plural:'save the dates'},
  invite:{noun:'invitation', title:'Send invitations', plural:'invitations'},
  reminder:{noun:'RSVP reminder', title:'Send RSVP reminders', plural:'RSVP reminders'},
};

// Every household / couple / solo guest on the A list, as the slot keys the tracker uses.
function _bsAllSlotKeys(){
  const gs=(STATE.guests||[]).filter(g=>(g.listType||'A')!=='B');
  const ids=new Set(gs.map(g=>g.id));
  const used=new Set(), keys=[];
  (STATE.families||[]).forEach(fam=>{
    const mem=(fam.memberIds||[]).filter(id=>ids.has(id));
    if(!mem.length) return;
    mem.forEach(id=>used.add(id)); keys.push('fam:'+fam.id);
  });
  gs.forEach(g=>{
    if(used.has(g.id)) return;
    if(g.coupleId){
      const p=gs.find(x=>x.id===g.coupleId);
      if(p&&!used.has(p.id)){ used.add(g.id); used.add(p.id); keys.push('couple:'+g.id); return; }
    }
    if(g.plusOneId){
      const p=gs.find(x=>x.id===g.plusOneId);
      if(p&&!used.has(p.id)){ used.add(g.id); used.add(p.id); keys.push('plusone:'+g.id); return; }
    }
    used.add(g.id); keys.push('solo:'+g.id);
  });
  return keys;
}
// The slot a single guest belongs to (so one nudge goes to their household, not per person).
function _bsSlotKeyForGuest(gid){
  const fam=(STATE.families||[]).find(f=>(f.memberIds||[]).includes(gid));
  if(fam) return 'fam:'+fam.id;
  const g=(STATE.guests||[]).find(x=>x.id===gid); if(!g) return null;
  if(g.coupleId && (STATE.guests||[]).some(x=>x.id===g.coupleId)){
    // couple keys are anchored on whichever member _bsAllSlotKeys met first
    const k=_bsAllSlotKeys().find(k=>k==='couple:'+g.id||k==='couple:'+g.coupleId); if(k) return k;
  }
  if(g.plusOneId && (STATE.guests||[]).some(x=>x.id===g.plusOneId)){
    const k=_bsAllSlotKeys().find(k=>k==='plusone:'+g.id||k==='plusone:'+g.plusOneId); if(k) return k;
  }
  return 'solo:'+g.id;
}
function _bsRowFor(kind, slotKey, wantSent){
  const grp=_groupFromSlotKey(slotKey); if(!grp) return null;
  const withEmail=grp.members.filter(m=>(m.email||'').trim());
  const ok=withEmail.filter(m=>!m.emailIssue);
  const name=grp.members.map(m=>m.name).filter(Boolean).join(' & ')||'Guest';
  const sent=_isSentFor(kind, slotKey);
  if(!withEmail.length) return {slotKey,name,reason:'noEmail'};
  if(!ok.length) return {slotKey,name,reason:'bounced'};
  // every usable address in the household (deduped); all start selected, the user can untick any
  const seen=new Set(), addrs=[];
  ok.forEach(m=>{ const e=m.email.trim(), k=e.toLowerCase(); if(seen.has(k)) return; seen.add(k); addrs.push({email:e,name:m.name||'',guestId:m.id,on:!sent}); });
  return {slotKey,name,addrs,sent,checked:!sent};
}

function openBulkSend(kind, onlySlots){
  if(!_BS_KIND[kind]) return;
  if(!(_sbSession&&_sbSession.access_token)){
    if(typeof _showInfoToast==='function') _showInfoToast('Sign in to send emails from UnionVault.', null, null);
    return;
  }
  if(kind==='invite' && !((STATE.invitation&&STATE.invitation.file&&STATE.invitation.file.mediaId)||(STATE.invitation&&STATE.invitation.link&&STATE.invitation.link.url))){
    if(typeof _showInfoToast==='function') _showInfoToast('Add your invitation first (Invitations page) so the email has something to show.', null, null);
    return;
  }
  const keys=onlySlots||_bsAllSlotKeys();
  const rows=[], skipped={noEmail:[],bounced:[]};
  keys.forEach(k=>{
    const r=_bsRowFor(kind,k); if(!r) return;
    if(r.reason==='noEmail') skipped.noEmail.push(r.name);
    else if(r.reason==='bounced') skipped.bounced.push(r.name);
    else rows.push(r);
  });
  _bs={kind, rows, skipped, running:false, failed:[], onlySlots:onlySlots||null};
  _bsRender();
}
function _bsSelected(){ return _bs?_bs.rows.filter(r=>r.checked):[]; }
function _bsToggle(i){ if(!_bs||_bs.running) return; const r=_bs.rows[i]; r.checked=!r.checked; r.addrs.forEach(a=>{ a.on=r.checked; }); _bsRender(); }
function _bsToggleAddr(i,j){ if(!_bs||_bs.running) return; const r=_bs.rows[i]; r.addrs[j].on=!r.addrs[j].on; r.checked=r.addrs.some(a=>a.on); _bsRender(); }
function _bsSetAll(v){ if(!_bs||_bs.running) return; _bs.rows.forEach(r=>{ r.checked=v; r.addrs.forEach(a=>{ a.on=v; }); }); _bsRender(); }
function _bsRender(){
  const s=_bs; if(!s) return;
  const k=_BS_KIND[s.kind], esc=_escHtml;
  const sel=_bsSelected().length;
  const names=_ssCoupleNames()||'UnionVault';
  const rowsHtml=s.rows.map((r,i)=>`<div style="padding:8px 10px;border:.5px solid var(--border);border-radius:10px;margin-bottom:6px">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
        <input type="checkbox" ${r.checked?'checked':''} onchange="_bsToggle(${i})" style="flex-shrink:0"/>
        <span style="flex:1;min-width:0"><span style="display:block;font-size:13px;color:var(--ink);overflow-wrap:anywhere">${esc(r.name)}</span>${r.addrs.length===1?`<span style="display:block;font-size:11px;color:var(--muted);overflow-wrap:anywhere">${esc(r.addrs[0].email)}</span>`:''}</span>
        ${r.sent?'<span style="font-size:10.5px;color:var(--muted);border:.5px solid var(--border);border-radius:20px;padding:2px 8px;flex-shrink:0">Already sent</span>':''}
      </label>
      ${r.addrs.length>1?`<div style="margin:6px 0 0 26px;display:flex;flex-direction:column;gap:5px">${r.addrs.map((a,j)=>`<label style="display:flex;align-items:flex-start;gap:8px;font-size:11.5px;color:var(--muted);cursor:pointer"><input type="checkbox" ${a.on?'checked':''} onchange="_bsToggleAddr(${i},${j})" style="flex-shrink:0;margin-top:1px"/><span style="overflow-wrap:anywhere">${esc(a.name?a.name+' · ':'')}${esc(a.email)}</span></label>`).join('')}</div>`:''}
    </div>`).join('');
  const skipNote=(arr,why)=>arr.length?`<div style="font-size:11.5px;color:var(--muted);margin-top:8px;line-height:1.5"><strong style="color:var(--ink)">${arr.length} skipped</strong> — ${why}: ${esc(arr.slice(0,6).join(', '))}${arr.length>6?' and '+(arr.length-6)+' more':''}.</div>`:'';
  const body=`<div style="display:flex;flex-direction:column;gap:10px">
    <div style="font-size:12.5px;color:var(--muted);line-height:1.5">Sent from <strong>invites@unionvault.app</strong> as "${esc(names)}" — replies come to you. One email per household — where a household has more than one address, tick who it goes to.${s.kind==='invite'&&STATE.invitation&&STATE.invitation.file?' Your invitation is attached.':''}</div>
    ${s.rows.length?`<div style="display:flex;gap:12px;font-size:12px"><button type="button" class="btn-link" onclick="_bsSetAll(true)" style="background:none;border:none;color:var(--gold-deep);cursor:pointer;padding:0;font-family:inherit;text-decoration:underline">Select all</button><button type="button" class="btn-link" onclick="_bsSetAll(false)" style="background:none;border:none;color:var(--gold-deep);cursor:pointer;padding:0;font-family:inherit;text-decoration:underline">Select none</button><span style="margin-left:auto;color:var(--muted)">${sel} of ${s.rows.length} selected</span></div>
      <div id="bs-list" style="max-height:min(46vh,360px);overflow:auto">${rowsHtml}</div>`
      :`<div style="text-align:center;color:var(--muted);padding:22px 8px;font-size:13px">No guests with an email address to send to.</div>`}
    ${skipNote(s.skipped.noEmail,'no email address on file')}
    ${skipNote(s.skipped.bounced,'a previous email bounced or was marked as spam')}
    <div id="bs-progress" style="display:none">
      <div style="font-size:12px;color:var(--muted);margin-bottom:4px" id="bs-status"></div>
      <div style="height:6px;border-radius:3px;background:var(--border);overflow:hidden"><div id="bs-bar" style="height:100%;width:0;background:var(--gold);border-radius:3px;transition:width .3s"></div></div>
    </div>
    <div id="bs-result"></div>
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" id="bs-cancel" onclick="_bsClose()">Close</button>
    <button class="btn btn-primary btn-sm" id="bs-go" onclick="_bsRun()" ${sel?'':'disabled'}>${sel?`Send to ${sel} household${sel===1?'':'s'}`:'Nothing selected'}</button>`;
  const oldList=document.getElementById('bs-list'); const top=oldList?oldList.scrollTop:0;
  openModal(k.title, body, footer);
  const nl=document.getElementById('bs-list'); if(nl&&top) nl.scrollTop=top;
}
function _bsClose(){ if(_bs&&_bs.running) return; _bs=null; closeModalDirect(); }

// One household's email: reuse the send sheet's own builder so the message is identical.
async function _bsSendOne(row, kind){
  const grp=_groupFromSlotKey(row.slotKey); if(!grp) return {ok:false,error:'Guest not found'};
  const asset=kind==='invite'?_ssInviteAsset():{file:null,publicUrl:'',viewUrl:'',link:''};
  const prev=_ss;
  const picked=row.addrs.filter(a=>a.on);
  if(!picked.length) return {ok:false,error:'No address selected'};
  const s={kind, slotKey:row.slotKey, method:'email', grp, asset, file:null, signedIn:true, emails:[], blockedEmails:[], to:picked[0].email,
           attach:!!asset.file, addLink:!asset.file};
  s.base=_fillTemplate(_inviteTpl(kind,'email'), grp, 'email');
  _ss=s;
  let payload;
  try{ payload=_ssBuildPayload(s, _ssMessage()); } finally { _ss=prev; }
  payload.to=picked.map(a=>a.email); payload.toNames=picked.map(a=>a.name||''); if(picked[0].guestId) payload.guestId=picked[0].guestId;
  for(let attempt=0; attempt<2; attempt++){
    try{
      const r=await fetch(_SB_URL+'/functions/v1/send-guest-email',{ method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+_sbSession.access_token,'apikey':_SB_KEY},
        body:JSON.stringify(payload) });
      let d={}; try{ d=await r.json(); }catch(_){}
      if(r.ok && d.ok===true) return {ok:true};
      if(r.status===401) return {ok:false,auth:true,error:'Signed out — sign in again'};
      if((r.status===429||r.status===502||r.status===503) && attempt===0){ await new Promise(z=>setTimeout(z,1500)); continue; }
      return {ok:false,error:d.error||('Send failed ('+r.status+')')};
    }catch(_){ if(attempt===0){ await new Promise(z=>setTimeout(z,1200)); continue; } return {ok:false,error:'No connection'}; }
  }
  return {ok:false,error:'Send failed'};
}
// Stamp "sent today" without the per-send toast / re-render the single send uses.
function _bsRecord(kind, slotKey){
  const meta=_inviteMeta(slotKey), field=_kindField(kind);
  if(kind==='invite'){ meta[field]={method:'email',date:_todayIso()}; _markSlotInvited(slotKey); }
  else meta[field]={method:'email',date:_todayIso(),sent:true};
}
async function _bsRun(retryOnly){
  const s=_bs; if(!s||s.running) return;
  const list=retryOnly?s.failed.map(f=>f.row):_bsSelected();
  if(!list.length) return;
  s.running=true; s.failed=[];
  const go=document.getElementById('bs-go'), cancel=document.getElementById('bs-cancel');
  if(go){ go.disabled=true; go.innerHTML='<span class="uv-spin" style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:uvbs 0.7s linear infinite;vertical-align:-2px;margin-right:6px"></span>Sending…'; }
  if(cancel) cancel.disabled=true;
  if(!document.getElementById('uvbs-style')){ const st=document.createElement('style'); st.id='uvbs-style'; st.textContent='@keyframes uvbs{to{transform:rotate(360deg)}}'; document.head.appendChild(st); }
  const prog=document.getElementById('bs-progress'), status=document.getElementById('bs-status'), bar=document.getElementById('bs-bar');
  if(prog) prog.style.display='';
  const res=document.getElementById('bs-result'); if(res) res.innerHTML='';
  document.querySelectorAll('#bs-list input').forEach(i=>i.disabled=true);
  try{ await _sbEnsureFreshToken(); }catch(_){}
  if(s.kind==='invite'){ const f=_ssInviteAsset().file; if(f){ const prev=_ss; _ss={asset:{file:f}}; try{ await _ssEnsureUploaded(); } finally { _ss=prev; } } }
  let sent=0, authFail=false;
  for(let i=0;i<list.length;i++){
    const row=list[i];
    if(status) status.textContent='Sending '+(i+1)+' of '+list.length+' — '+row.name;
    if(bar) bar.style.width=(i/list.length*100)+'%';
    const r=await _bsSendOne(row, s.kind);
    if(r.ok){ sent++; _bsRecord(s.kind,row.slotKey); row.sent=true; row.checked=false; }
    else { s.failed.push({row,error:r.error}); if(r.auth){ authFail=true; list.slice(i+1).forEach(x=>s.failed.push({row:x,error:'Not sent'})); break; } }
    await new Promise(z=>setTimeout(z,450)); // stay under Resend's rate limit
  }
  if(bar) bar.style.width='100%';
  if(typeof saveToStorage==='function') saveToStorage();
  if(typeof rsvpRerenderList==='function') rsvpRerenderList();
  s.running=false;
  const k=_BS_KIND[s.kind];
  const failHtml=s.failed.length?`<div style="margin-top:8px;font-size:12.5px;color:var(--red);line-height:1.5"><strong>${s.failed.length} couldn't be sent</strong> — ${authFail?'you were signed out. Sign in again and retry.':'check your connection and try again.'}<div style="color:var(--muted);font-size:11.5px;margin-top:3px">${s.failed.slice(0,8).map(f=>_escHtml(f.row.name)+(f.error?' ('+_escHtml(f.error)+')':'')).join('<br>')}</div></div>`:'';
  const resNow=document.getElementById('bs-result');
  if(resNow) resNow.innerHTML=`<div style="font-size:13px;color:var(--ink);margin-top:6px"><strong>${sent}</strong> ${sent===1?k.noun:k.plural} sent.</div>${failHtml}`;
  if(status) status.textContent='Done';
  const go2=document.getElementById('bs-go'), c2=document.getElementById('bs-cancel');
  if(c2) c2.disabled=false;
  if(go2){
    if(s.failed.length){ go2.disabled=false; go2.textContent='Retry '+s.failed.length+' failed'; go2.onclick=()=>_bsRun(true); }
    else { go2.disabled=true; go2.textContent='Done'; }
  }
  if(sent && typeof _showInfoToast==='function') _showInfoToast(sent+' '+(sent===1?k.noun:k.plural)+' sent from UnionVault.'+(s.failed.length?' '+s.failed.length+' failed.':''), null, null);
}

// "Send all" chooser on the RSVP & Invites page.
function openBulkSendMenu(){
  const opt=(kind,label,sub)=>`<button type="button" class="btn btn-outline" onclick="openBulkSend('${kind}')" style="display:block;width:100%;text-align:left;padding:12px 14px;margin-bottom:8px"><span style="display:block;font-size:14px;color:var(--ink)">${label}</span><span style="display:block;font-size:11.5px;color:var(--muted);margin-top:2px;font-weight:400">${sub}</span></button>`;
  openModal('Email all guests',
    `<div style="font-size:12.5px;color:var(--muted);margin-bottom:12px;line-height:1.5">Pick what to send. You'll choose exactly who gets it before anything goes out.</div>`
    +opt('savedate','Save the dates','Includes a calendar invite for the wedding date')
    +opt('invite','Invitations','With your invitation and an RSVP button')
    +opt('reminder','RSVP reminders','A nudge with an RSVP button')
    , `<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Close</button>`);
}

// ── Message a vendor / contact from UnionVault ───────────────────────────────
// Replaces the plain mailto: "Email" links. Sends a branded email from the app
// (send-appointment-email: replies go to the couple) and shows it in Communications → Sent.
let _vm=null;
function openVendorMessageFrom(el){
  const email=el.getAttribute('data-vm-email')||'', name=el.getAttribute('data-vm-name')||'', ping=el.getAttribute('data-vm-ping')||'';
  if(ping && typeof _vluPing==='function'){ try{ _vluPing(ping,'email'); }catch(_){} }
  openVendorMessage(email, name);
}
function openVendorMessage(email, name){
  email=String(email||'').trim();
  if(!email) return;
  if(!(_sbSession&&_sbSession.access_token)){ if(typeof _showInfoToast==='function') _showInfoToast('Sign in to send emails from UnionVault.',null,null); return; }
  const couple=_ssCoupleNames();
  _vm={email,name:String(name||'').trim(),sending:false};
  const greet=_vm.name?'Hi '+_vm.name.split(/\s+/)[0]+',':'Hi,';
  const esc=_escHtml;
  const body=`<div style="display:flex;flex-direction:column;gap:10px">
    <div style="font-size:12.5px;color:var(--muted)">To <strong style="color:var(--ink)">${esc(_vm.name||email)}</strong>${_vm.name?' · '+esc(email):''}</div>
    <div><label class="form-label" style="margin-bottom:4px">Subject</label><input id="vm-subject" class="form-input" maxlength="150" value="${esc('Wedding enquiry'+(couple?' — '+couple:''))}"/></div>
    <div><label class="form-label" style="margin-bottom:4px">Message</label><textarea id="vm-body" class="form-input" rows="9" maxlength="5000" style="resize:vertical;line-height:1.5"></textarea></div>
    <div style="font-size:11.5px;color:var(--muted);line-height:1.5">Sent from UnionVault${couple?' as "'+esc(couple)+'"':''} — replies come straight to you.</div>
    <div id="vm-err" style="display:none;font-size:12.5px;color:var(--red)">Couldn't send. Nothing was delivered — tap Try again.</div>
  </div>`;
  openModal('Message '+(_vm.name||'vendor'), body,
    `<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Cancel</button><button class="btn btn-primary btn-sm" id="vm-send" onclick="_vmSend()">Send message</button>`);
  const ta=document.getElementById('vm-body');
  if(ta){ ta.value=greet+'\n\n\n'+(couple?'Kind regards,\n'+couple:'Kind regards'); setTimeout(()=>{ try{ ta.focus(); ta.setSelectionRange(greet.length+2,greet.length+2); }catch(_){} },60); }
}
async function _vmSend(){
  const s=_vm; if(!s||s.sending) return;
  const subject=(document.getElementById('vm-subject').value||'').trim();
  const text=(document.getElementById('vm-body').value||'').trim();
  const err=document.getElementById('vm-err'); if(err) err.style.display='none';
  if(!subject||!text){ if(typeof _showInfoToast==='function') _showInfoToast('Add a subject and a message first.',null,null); return; }
  const btn=document.getElementById('vm-send'); s.sending=true;
  if(btn){ btn.disabled=true; btn.textContent='Sending…'; }
  const couple=_ssCoupleNames();
  const ed=(typeof _commsDesignFor==='function'?_commsDesignFor('appt'):((STATE.settings&&STATE.settings.emailDesign)||{}));
  let sig=couple?['Sent by '+couple+' via UnionVault.','Reply to this email to reach '+couple+'.']:[];
  if(typeof _apptSigFilter==='function') sig=_apptSigFilter(sig);
  let ok=false;
  try{
    await _sbEnsureFreshToken();
    const r=await fetch(_SB_URL+'/functions/v1/send-appointment-email',{ method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+_sbSession.access_token,'apikey':_SB_KEY},
      body:JSON.stringify({ to:[s.email], subject, body:text, htmlText:text, title:'A message from '+(couple||'UnionVault'), kicker:couple?couple+'\'s wedding':'',
        signature:sig, fromName:couple||'', replyTo:(STATE.settings&&STATE.settings.userEmail)||(_sbSession.user&&_sbSession.user.email)||'',
        toNames:[s.name||''], logKind:'other',
        designOpts:{ accentColor:ed.accentColor||'#8a6a2c', fontFamily:ed.fontFamily||'serif', bodyFont:ed.bodyFont||'sans-serif', showLogo:ed.showLogo!==false,
          headerImage:_emailHeaderUrl(ed.headerImage,(_sbSession.user&&_sbSession.user.id)) } }) });
    ok=r.ok && (await r.json()).ok===true;
  }catch(_){ ok=false; }
  s.sending=false;
  if(ok){ _vm=null; closeModalDirect(); if(typeof _showInfoToast==='function') _showInfoToast('Message sent to '+(s.name||s.email)+'.',null,null); return; }
  if(btn){ btn.disabled=false; btn.textContent='Try again'; }
  if(err) err.style.display='';
}
