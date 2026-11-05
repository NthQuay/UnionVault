// ════════════════════════════════════════════════════════════════════════
// SENT EMAILS — Communications → Sent, the details window, and each guest's history
// ════════════════════════════════════════════════════════════════════════
// Rows live in the email_log table. The email edge functions write one row per recipient
// as they send (service role); resend-webhook moves a row to delivered / bounced /
// complained. Couples can only read their own rows (RLS). The stored email HTML is
// fetched only when "View email" is tapped, never with the list.

const _SL_KINDS={
  savedate:'Save the date', invite:'Invite', reminder:'RSVP reminder', vendor:'Vendor brief',
  appointment:'Appointment', confirm:'RSVP confirmation', ww:'Wishing Well details', other:'Email',
};
// Filter chips on the Sent tab. Vendors covers briefs and appointments together.
const _SL_FILTERS=[
  {key:'all', label:'All'}, {key:'savedate', label:'Save the date'}, {key:'invite', label:'Invite'},
  {key:'reminder', label:'Reminder'}, {key:'vendors', label:'Vendors'}, {key:'auto', label:'Automatic'},
];
const _SL_COLS='id,created_at,kind,automatic,subject,to_name,to_email,guest_id,from_name,status,status_at,status_reason';
let _slRows=null, _slLoading=false, _slErr='', _slQ='', _slKind='all', _slGuest='', _slLimit=60;

function _slSignedIn(){ return !!(typeof _sbSession!=='undefined'&&_sbSession&&_sbSession.access_token); }
async function _slLoad(force){
  if(!_slSignedIn()){ _slRows=[]; return; }
  if(_slLoading || (_slRows && !force)) return;
  _slLoading=true; _slErr='';
  try{
    if(typeof _sbEnsureFreshToken==='function') await _sbEnsureFreshToken();
    const r=await _sbSelect('email_log','select='+_SL_COLS+'&order=created_at.desc&limit=1000');
    if(Array.isArray(r)) _slRows=r; else { _slErr='Couldn\'t load your sent emails. Check your connection and try again.'; if(!_slRows) _slRows=[]; }
  }catch(_){ _slErr='Couldn\'t load your sent emails. Check your connection and try again.'; if(!_slRows) _slRows=[]; }
  _slLoading=false;
}

// ── Formatting ───────────────────────────────────────────────────────────
function _slDayLabel(d){
  const today=new Date(); today.setHours(0,0,0,0);
  const day=new Date(d); day.setHours(0,0,0,0);
  const diff=Math.round((today-day)/864e5);
  const opts={weekday:'short', day:'numeric', month:'short'};
  if(day.getFullYear()!==today.getFullYear()) opts.year='numeric';
  const full=d.toLocaleDateString('en-AU',opts).replace(/,/g,'');
  return diff===0?'Today · '+full:diff===1?'Yesterday · '+full:full;
}
function _slTime(d){ return d.toLocaleTimeString('en-AU',{hour:'numeric',minute:'2-digit'}).replace(/\s?([ap])\.?m\.?/i,(m,p)=>' '+p.toLowerCase()+'m'); }
function _slFull(d){ return d.toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).replace(/,/g,'')+', '+_slTime(d); }
function _slStatusHtml(st){
  const m={delivered:['ok','Delivered'], bounced:['bad','Bounced'], complained:['bad','Marked as spam'], sent:['wait','Sent']}[st]||['wait','Sent'];
  return `<span class="sl-st sl-st-${m[0]}"><i></i>${m[1]}</span>`;
}
function _slKindHtml(r){
  const lbl=r.automatic?'Automatic':(_SL_KINDS[r.kind]||'Email');
  return `<span class="sl-kind${r.automatic?' sl-kind-auto':''}">${_escHtml(lbl)}</span>`;
}
function _slWho(r){ return r.to_name||r.to_email||''; }

// ── Filtering ────────────────────────────────────────────────────────────
function _slGuestMatch(r, g){
  if(!g) return false;
  if(r.guest_id && r.guest_id===g.id) return true;
  const em=(g.email||'').trim().toLowerCase();
  return !!em && (r.to_email||'').toLowerCase()===em;
}
function _slFiltered(){
  const q=_slQ.trim().toLowerCase();
  const g=_slGuest?(STATE.guests||[]).find(x=>x.id===_slGuest):null;
  return (_slRows||[]).filter(r=>{
    if(_slGuest && !_slGuestMatch(r,g)) return false;
    if(_slKind==='auto' && !r.automatic) return false;
    if(_slKind==='vendors' && !(r.kind==='vendor'||r.kind==='appointment')) return false;
    if(['savedate','invite','reminder'].includes(_slKind) && r.kind!==_slKind) return false;
    if(q && !((r.to_name||'')+' '+(r.to_email||'')+' '+(r.subject||'')).toLowerCase().includes(q)) return false;
    return true;
  });
}

// ── Sent tab ─────────────────────────────────────────────────────────────
function _slTabHtml(){
  return `<div id="sl-root" class="sl-root">${_slBodyHtml()}</div>`;
}
function _slBodyHtml(){
  if(!_slSignedIn()) return `<div class="sl-empty"><b>Sign in to see your sent emails</b><span>Emails UnionVault sends for you are listed here once you're signed in.</span></div>`;
  if(!_slRows) return `<div class="sl-empty"><span>Loading sent emails…</span></div>`;
  const g=_slGuest?(STATE.guests||[]).find(x=>x.id===_slGuest):null;
  const all=_slRows.length;
  const chips=_SL_FILTERS.map(f=>`<button type="button" class="sl-chip${_slKind===f.key?' on':''}" onclick="_slSetKind('${f.key}')">${f.label}${f.key==='all'&&all?' · '+all:''}</button>`).join('');
  const guestPill=g?`<div class="sl-guestpill">Showing emails to <b>${_escHtml(g.name||g.email||'this guest')}</b><button type="button" onclick="_slSetGuest('')" aria-label="Show all guests">×</button></div>`:'';
  const rows=_slFiltered();
  let list='';
  if(!all){
    list=`<div class="sl-empty"><b>No emails sent yet</b><span>Save-the-dates, invites, reminders, vendor emails and the automatic RSVP confirmations will appear here as they're sent.</span></div>`;
  } else if(!rows.length){
    list=`<div class="sl-empty"><span>No sent emails match.</span></div>`;
  } else {
    const shown=rows.slice(0,_slLimit); let lastDay='', out='', open=false;
    shown.forEach(r=>{
      const d=new Date(r.created_at); const day=_slDayLabel(d);
      if(day!==lastDay){ if(open) out+='</div>'; out+=`<div class="sl-day">${_escHtml(day)}</div><div class="sl-list">`; open=true; lastDay=day; }
      const sub=r.automatic?(_SL_KINDS[r.kind]||''):(r.to_name?r.to_email:'');
      out+=`<button type="button" class="sl-row" onclick="_slOpen('${r.id}')">
        <span class="sl-who">${_escHtml(_slWho(r))}</span><span class="sl-time">${_escHtml(_slTime(d))}</span>
        <span class="sl-what">${_slKindHtml(r)}${sub?`<em>${_escHtml(sub)}</em>`:''}</span>${_slStatusHtml(r.status)}
      </button>`;
    });
    if(open) out+='</div>';
    if(rows.length>_slLimit) out+=`<button type="button" class="sl-more" onclick="_slMore()">Show earlier</button>`;
    list=out;
  }
  return `<div class="sl-tools">
      <div class="sl-search"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="sl-q" class="form-input" placeholder="Search name or email" value="${_escHtml(_slQ)}" oninput="_slSetQ(this.value)" autocomplete="off"/></div>
      <div class="sl-chips">${chips}</div>
      ${guestPill}
    </div>
    ${_slErr?`<div class="sl-err">${_escHtml(_slErr)} <button type="button" onclick="_slRefresh(true)">Try again</button></div>`:''}
    <div id="sl-list-wrap">${list}</div>
    <div class="sl-foot">Lists emails sent through UnionVault. Texts and messages sent from your own phone or mail app aren't included.</div>`;
}
function _slRender(){ const el=document.getElementById('sl-root'); if(el) el.innerHTML=_slBodyHtml(); }
// Re-render just the list, so typing in the search box keeps its focus.
function _slRenderList(){
  const root=document.getElementById('sl-root'); if(!root) return;
  const tmp=document.createElement('div'); tmp.innerHTML=_slBodyHtml();
  const nw=tmp.querySelector('#sl-list-wrap'), old=root.querySelector('#sl-list-wrap');
  if(nw&&old) old.replaceWith(nw); else _slRender();
}
async function _slRefresh(force){ await _slLoad(force); _slRender(); }
function _slSetQ(v){ _slQ=v; _slLimit=60; _slRenderList(); }
function _slSetKind(k){ _slKind=k; _slLimit=60; _slRender(); }
function _slSetGuest(id){ _slGuest=id; _slLimit=60; _slRender(); }
function _slMore(){ _slLimit+=100; _slRenderList(); }

// ── Details window ───────────────────────────────────────────────────────
function _slFind(id){ return (_slRows||[]).find(r=>r.id===id); }
function _slReason(r){
  if(r.status==='complained') return 'This guest marked the email as spam, so UnionVault won\'t email them again. Reach them another way.';
  const why=String(r.status_reason||'').toLowerCase();
  if(/mailbox.*full|quota/.test(why)) return `<b>${_escHtml(r.to_email)}</b>'s mailbox is full. Try again later or reach them another way.`;
  return `This email didn't arrive. The address <b>${_escHtml(r.to_email)}</b> may be misspelled or no longer in use. Check it and send again.`;
}
function _slOpen(id, overGuest){
  const r=_slFind(id); if(!r) return;
  const d=new Date(r.created_at), sd=r.status_at?new Date(r.status_at):null;
  const bad=r.status==='bounced'||r.status==='complained';
  const stepLbl={delivered:'Delivered', bounced:'Bounced', complained:'Marked as spam'}[r.status];
  const track=`<div class="sl-track"><div class="ok">Sent<small>${_escHtml(_slTime(d))}</small></div>${stepLbl?`<div class="${bad?'bad':'ok'}">${stepLbl}${sd?`<small>${_escHtml(sd.toDateString()===d.toDateString()?_slTime(sd):_slFull(sd))}</small>`:''}</div>`:`<div class="wait">Waiting for delivery</div>`}</div>`;
  const g=(STATE.guests||[]).find(x=>_slGuestMatch(r,x))||null;
  const canResend=!r.automatic && g && ['savedate','invite','reminder'].includes(r.kind);
  const fix=bad && g && r.status==='bounced';
  const title=(_SL_KINDS[r.kind]||'Email')+' · '+_slWho(r);
  const body=`<div class="sl-detail">
    ${bad?`<div class="sl-warn">${_slReason(r)}</div>`:''}
    <dl class="sl-kv">
      <dt>Subject</dt><dd>${_escHtml(r.subject||'—')}</dd>
      <dt>To</dt><dd>${_escHtml(r.to_name?r.to_name+' · '+r.to_email:r.to_email)}</dd>
      <dt>From</dt><dd>${_escHtml((r.from_name||'UnionVault')+' · '+(r.kind==='appointment'||r.kind==='vendor'?'appointments':r.automatic?'notifications':'invites')+'@unionvault.app')}</dd>
      <dt>Sent</dt><dd>${_escHtml(_slFull(d))}</dd>
      ${r.automatic?`<dt>Type</dt><dd>Sent automatically</dd>`:''}
    </dl>
    ${track}
  </div>`;
  if(overGuest){
    // Opened from a guest's own details: shown on top so the guest form stays open underneath.
    openConfirm2(title, body, `<button class="btn btn-outline btn-sm" onclick="_closeConfirm2Direct()">Close</button>
      <button class="btn btn-primary btn-sm" onclick="_slView('${r.id}')">View email</button>`);
    return;
  }
  const footer=`<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;width:100%">
    ${canResend&&!fix?`<button class="btn btn-outline btn-sm" onclick="_slResend('${r.id}')">Send again</button>`:''}
    <button class="btn ${fix?'btn-outline':'btn-primary'} btn-sm" onclick="_slView('${r.id}')">View email</button>
    ${fix?`<button class="btn btn-primary btn-sm" onclick="closeModalDirect();openEditGuest('${g.id}')">Fix address</button>`:''}
  </div>`;
  openModal(title, body, footer);
}
async function _slView(id){
  if(typeof _showInfoToast==='function') _showInfoToast('Loading email…',null,null);
  try{
    const r=await _sbSelect('email_log','select=html&id=eq.'+encodeURIComponent(id));
    if(typeof _dismissUndoToast==='function') _dismissUndoToast();
    const html=Array.isArray(r)&&r[0]&&r[0].html;
    if(!html){ if(typeof _showInfoToast==='function') _showInfoToast('This email\'s copy isn\'t available.',null,null); return; }
    _ssShowPreview(html);
  }catch(_){ if(typeof _showInfoToast==='function') _showInfoToast('Couldn\'t load the email — check your connection.',null,null); }
}
function _slResend(id){
  const r=_slFind(id); if(!r) return;
  const g=(STATE.guests||[]).find(x=>_slGuestMatch(r,x));
  const slot=g&&(typeof buildSlots==='function'?buildSlots():[]).find(s=>(s.ids||[]).includes(g.id));
  if(!slot){ if(typeof _showInfoToast==='function') _showInfoToast('This guest is no longer on your list.',null,null); return; }
  closeModalDirect();
  _ssOpen(r.kind, slot.key, 'email');
}

// ── A guest's own history (Edit Guest) ───────────────────────────────────
function _slGuestBoxHtml(g){
  if(!_slSignedIn()) return '';
  return `<div class="sl-gbox"><div class="sl-gbox-h">Emails sent</div><div id="sl-gbox-list" data-guest="${_escHtml(g.id)}"><div class="sl-gbox-none">Loading…</div></div></div>`;
}
async function _slGuestBoxFill(){
  const box=document.getElementById('sl-gbox-list'); if(!box) return;
  await _slLoad(false);
  const el=document.getElementById('sl-gbox-list'); if(!el) return;
  const g=(STATE.guests||[]).find(x=>x.id===el.dataset.guest); if(!g) return;
  const rows=(_slRows||[]).filter(r=>_slGuestMatch(r,g));
  if(!rows.length){ el.innerHTML=`<div class="sl-gbox-none">No emails sent to ${_escHtml((g.name||'this guest').split(' ')[0])} through UnionVault yet.</div>`; return; }
  el.innerHTML=rows.slice(0,5).map(r=>{ const d=new Date(r.created_at);
    return `<button type="button" class="sl-gbox-row" onclick="_slOpen('${r.id}',true)">${_slKindHtml(Object.assign({},r,{automatic:false}))}${_slStatusHtml(r.status)}<span class="sl-gbox-d">${_escHtml(d.toLocaleDateString('en-AU',{day:'numeric',month:'short'})+', '+_slTime(d))}</span></button>`; }).join('')
    +`<button type="button" class="sl-gbox-all" onclick="_slShowForGuest('${g.id}')">See all for ${_escHtml((g.name||'this guest').split(' ')[0])}</button>`;
}
function _slShowForGuest(id){
  _slGuest=id; _slKind='all'; _slQ='';
  closeModalDirect();
  if(typeof _commsSetTab==='function') _commsSetTab('sent', true);
}
