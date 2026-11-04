// COMMUNICATIONS — "Templates" page
// ════════════════════════════════════════════════════════════════════════
// Every message UnionVault can send to a guest or vendor, previewed and edited in one
// place. Reached from Settings → General & App-wide → "Edit communications", and as the
// destination of the old "RSVP date & templates" button (js/rsvp.js).
// Deliberately absent: RSVP notification (guest attending / declined), Wishing Well
// contribution alert, guest-contact message, support/bug-report email — those go TO the
// couple or TO support, not to a guest or vendor, so they aren't shown here.
// Free tier can view every preview; the Edit button is gated to full access via
// _uvRequirePaid('editComms'), since editing changes what guests/vendors actually receive.
// Previews never show a made-up guest name — {guest} always renders as the literal
// "[guest name]" placeholder (see _commsTokenFill below), never a real/sample person.

const _COMMS_TOKEN_HELP='Tokens: {guest} {names} {date} {rsvp_by} {link}. {guest} always shows as "[guest name]" here in the preview — on a real send it fills in with the actual guest or household name.';
// Design settings resolve per email: a custom design set via the "Design" button
// (STATE.settings.commsDesign[itemKey]) wins; otherwise every branded email shares the
// one app-wide STATE.settings.emailDesign.
function _commsDesignFor(itemKey){
  const universal=(STATE.settings&&STATE.settings.emailDesign)||{};
  const override=itemKey&&STATE.settings&&STATE.settings.commsDesign&&STATE.settings.commsDesign[itemKey];
  return override||universal;
}

const _COMMS_ITEMS=[
  {key:'sd-email', group:'Email', title:'Save the date', sub:'Sent by you, via UnionVault · to guests', kind:'tpl', tplKind:'savedate', channel:'email', branded:true},
  {key:'inv-email', group:'Email', title:'Invite', sub:'Sent by you, via UnionVault · to guests', kind:'tpl', tplKind:'invite', channel:'email', branded:true},
  {key:'rem-email', group:'Email', title:'RSVP reminder', sub:'Sent by you, via UnionVault · to guests awaiting a reply', kind:'tpl', tplKind:'reminder', channel:'email', branded:true},
  {key:'sd-sms', group:'SMS', title:'Save the date', sub:'Text, WhatsApp, Messenger, Instagram & more · to guests', kind:'tpl', tplKind:'savedate', channel:'sms', branded:false},
  {key:'inv-sms', group:'SMS', title:'Invite', sub:'Text, WhatsApp, Messenger, Instagram & more · to guests', kind:'tpl', tplKind:'invite', channel:'sms', branded:false},
  {key:'rem-sms', group:'SMS', title:'RSVP reminder', sub:'Text, WhatsApp, Messenger, Instagram & more · to guests awaiting a reply', kind:'tpl', tplKind:'reminder', channel:'sms', branded:false},
  {key:'confirm', group:'After they RSVP', title:'RSVP confirmation', sub:'Sent automatically · to the guest, right after they RSVP online', kind:'fixed', branded:true},
  {key:'ww', group:'After they RSVP', title:'Wishing Well details', sub:'Sent on request · to a guest who asks to be emailed your gift details', kind:'fixed', branded:true},
  {key:'appt', group:'Vendors', title:'Appointment email', sub:'Sent by you, via UnionVault · to a vendor, about a booked appointment', kind:'fixed', branded:true},
  {key:'vbrief', group:'Vendors', title:'Vendor brief', sub:'Sent by you, via UnionVault · to a vendor, with their secure brief link', kind:'fixed', branded:true},
];
const _COMMS_GROUP_ORDER=['Email','SMS','After they RSVP','Vendors'];

let _commsSel='sd-email';
function _commsItem(key){ return _COMMS_ITEMS.find(i=>i.key===key); }
function _commsSetOrdinal(on){
  if(!STATE.settings) STATE.settings={};
  STATE.settings.commsOrdinalDates=!!on;
  saveToStorage();
  _commsRefresh();
}

function renderComms(c, actions){
  actions.innerHTML='';
  if(!_commsItem(_commsSel)) _commsSel=_COMMS_ITEMS[0].key;
  const navHtml=_COMMS_GROUP_ORDER.map(g=>{
    const items=_COMMS_ITEMS.filter(i=>i.group===g);
    return `<div style="margin-bottom:16px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:0 4px 7px">${_escHtml(g)}</div>
      ${items.map(i=>_commsNavBtnHtml(i)).join('')}
    </div>`;
  }).join('');
  // Narrow viewports get a dropdown instead of the nav list — a long list of 10 items
  // above the preview meant scrolling straight past all of them just to see one email.
  const mobileOptions=_COMMS_GROUP_ORDER.map(g=>`<optgroup label="${_escHtml(g)}">${_COMMS_ITEMS.filter(i=>i.group===g)
    .map(i=>`<option value="${i.key}" ${i.key===_commsSel?'selected':''}>${_escHtml(i.title)}</option>`).join('')}</optgroup>`).join('');
  const ordinalOn=!!(STATE.settings&&STATE.settings.commsOrdinalDates);
  c.innerHTML=`<div style="margin-bottom:10px;font-size:12.5px;color:var(--muted);line-height:1.5;max-width:760px">Every message UnionVault can send to a guest or vendor, in one place. RSVP alerts and gift notifications aren't here — those come to you, not your guests.</div>
  <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:14px;font-size:12px;color:var(--ink)">
    <input type="checkbox" ${ordinalOn?'checked':''} onchange="_commsSetOrdinal(this.checked)" style="width:14px;height:14px;accent-color:var(--gold);cursor:pointer;flex-shrink:0"/>
    Use ordinal dates (4th, 21st, 22nd…) instead of plain numbers (4, 21, 22…)
  </label>
  <div class="card comms-mobile-nav" style="margin-bottom:14px;padding:12px">
    <select class="form-input" onchange="_commsSelect(this.value)" style="font-size:13px">${mobileOptions}</select>
  </div>
  <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
    <div class="card comms-nav-card" style="flex:0 0 240px;min-width:220px;padding:16px 10px">
      ${navHtml}
      <button type="button" onclick="_openEmailDesignModal()" style="display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:10px 10px;border-radius:9px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:inherit;margin-top:4px">
        <span style="color:var(--gold-deep);flex-shrink:0;display:inline-flex"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg></span>
        <span style="min-width:0;flex:1"><span style="display:block;font-size:12px;color:var(--ink);font-weight:500;line-height:1.3">Email design</span><span style="display:block;font-size:10px;color:var(--muted);margin-top:1px;line-height:1.3">Branding &amp; header image — applies to every email below</span></span>
      </button>
    </div>
    <div class="card" style="flex:1;min-width:320px" id="comms-detail">${_commsDetailHtml()}</div>
  </div>`;
  _commsLoadPreview();
}
function _commsNavBtnHtml(i){
  const on=_commsSel===i.key;
  return `<button type="button" data-comms-key="${i.key}" onclick="_commsSelect('${i.key}')" style="display:block;width:100%;text-align:left;padding:9px 11px;border-radius:9px;border:1px solid ${on?'var(--gold-deep)':'transparent'};background:${on?'var(--parchment)':'transparent'};cursor:pointer;font-family:inherit;margin-bottom:3px">
    <div style="font-size:13px;font-weight:500;color:${on?'var(--gold-deep)':'var(--ink)'}">${_escHtml(i.title)}</div>
  </button>`;
}
function _commsSelect(key){
  if(_commsSel===key) return;
  _commsSel=key;
  document.querySelectorAll('[data-comms-key]').forEach(b=>{
    const on=b.getAttribute('data-comms-key')===key;
    b.style.borderColor=on?'var(--gold-deep)':'transparent';
    b.style.background=on?'var(--parchment)':'transparent';
    const lbl=b.querySelector('div'); if(lbl) lbl.style.color=on?'var(--gold-deep)':'var(--ink)';
  });
  const mob=document.querySelector('.comms-mobile-nav select'); if(mob) mob.value=key;
  _commsRefresh();
}
function _commsRefresh(){
  const detail=document.getElementById('comms-detail');
  if(detail) detail.innerHTML=_commsDetailHtml();
  _commsLoadPreview();
}
function _commsDetailHtml(){
  const item=_commsItem(_commsSel); if(!item) return '';
  // "Design" (header image/colour/font just for this one email) only makes sense for
  // branded items — SMS has no HTML to style.
  const designBtn=item.branded
    ? `<button type="button" class="btn btn-outline btn-sm" onclick="_commsDesignClick('${item.key}')" style="flex-shrink:0">Design</button>`
    : '';
  return `<div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:21px;font-weight:600;line-height:1.2">${_escHtml(item.title)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">${_escHtml(item.sub)}</div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        ${designBtn}
        <button type="button" class="btn btn-outline btn-sm" onclick="_commsEditClick('${item.key}')" style="flex-shrink:0">Edit</button>
      </div>
    </div>
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)" id="comms-preview-box"></div>
  </div>`;
}

// ── Token fill for previews — {guest} is ALWAYS the literal placeholder below, never a
// real or made-up guest name. {names}/{date}/{rsvp_by}/{link} use real data when set.
function _commsTokenFill(tpl){
  const ev=STATE.event||{};
  const p1=ev.partner1||'', p2=ev.partner2||'';
  const names=(p1&&p2)?`${p1} & ${p2}`:(p1||p2||'The Happy Couple');
  const map={
    '{guest}':'[guest name]',
    '{names}':names,
    '{date}':_commsLongDate(ev.date)||'Saturday, 1 January 2028',
    '{rsvp_by}':_commsLongDate((STATE.settings||{}).rsvpBy)||'your earliest convenience',
    '{link}':_rsvpLink(),
  };
  return _tplGreetingBreak(tpl||'').replace(/\{guest\}|\{names\}|\{date\}|\{rsvp_by\}|\{link\}/g, m=>map[m]!=null?map[m]:m);
}
// Mechanical RSVP CTA / sign-off appended after the editable template text — mirrors
// _ssMessage()'s `extra` array in send-sheet.js, with sample data only (preview, not a
// real send).
function _commsCtaLines(tplKind){
  const by=_commsLongDate((STATE.settings||{}).rsvpBy)||'your earliest convenience';
  if(tplKind==='invite') return ['Kindly RSVP by '+by+' via '+_rsvpLink()+'.', 'With love.'];
  if(tplKind==='reminder') return ['Kindly RSVP by '+by+' via '+_rsvpLink()+'.', 'Thank you!'];
  if(tplKind==='savedate'){
    try{ const w=typeof _wbSite==='function'&&_wbSite(); if(w&&w.published&&w.slug) return ['Details: '+_wbSiteUrl()]; }catch(_){}
  }
  return [];
}
// Full plain-text message as it would actually send. `includeCta` is false for the Email
// channel of invite/reminder, where the CTA becomes a separate structured block instead
// of plain text (see _commsEmailPreviewPayload) — true everywhere else, matching
// _ssBuildPayload's real behaviour.
function _commsBaseText(tplKind, channel, includeCta){
  let msg=_commsTokenFill(_inviteTpl(tplKind, channel));
  if(includeCta){
    const extra=_commsCtaLines(tplKind);
    if(extra.length) msg=msg.replace(/\s+$/,'')+'\n\n'+extra.join('\n\n');
  }
  if(_sbSession && typeof _uvIsPaid==='function' && !_uvIsPaid()) msg+='\n\nSent via unionvault.app';
  return msg;
}
function _commsTplSettingsKey(tplKind, channel){
  const ch=channel==='email'?'Email':'Sms';
  if(tplKind==='reminder') return 'reminderTemplate'+ch;
  if(tplKind==='savedate') return 'saveDateTemplate'+ch;
  return 'inviteTemplate'+ch;
}
function _commsSmsPreviewHtml(item){
  const text=_commsBaseText(item.tplKind,'sms', true);
  return `<div style="max-width:380px;margin:0 auto;padding:6px 0">
    <div style="background:var(--parchment);border:1px solid var(--border);border-radius:16px 16px 16px 4px;padding:14px 16px;font-size:13.5px;line-height:1.55;white-space:pre-wrap">${_escHtml(text)}</div>
  </div>`;
}
// Payload for the Email channel of Save the date / Invite / RSVP reminder — built the
// same way _ssBuildPayload() builds a real send, so the preview can never drift from
// what actually goes out.
function _commsEmailPreviewPayload(item){
  const ed=_commsDesignFor(item.key);
  const names=_ssCoupleNames();
  const designOpts={ accentColor:ed.accentColor||'#8a6a2c', fontFamily:ed.fontFamily||'serif', showLogo:ed.showLogo!==false,
    headerImage:ed.headerImage&&_sbSession&&_sbSession.user?_SB_URL+'/storage/v1/object/public/'+_SB_BUCKET+'/'+_sbSession.user.id+'/'+ed.headerImage:'' };
  const titleMap={savedate:'Save the date', invite:'You\'re invited', reminder:'RSVP reminder'};
  const title=titleMap[item.tplKind];
  const payload={ preview:true, subject:title+(names?' — '+names:''), fromName:names||'UnionVault',
    kicker:names?names+'\'s wedding':'', title, templateId:ed.templateId||'classic', designOpts };
  if(item.tplKind==='savedate'){
    payload.body=_commsBaseText('savedate','email', true);
  } else {
    payload.htmlText=_commsBaseText(item.tplKind,'email', false);
    const block={ rsvpUrl:_rsvpLink(), rsvpByText:_commsLongDate((STATE.settings||{}).rsvpBy)||'', closingText:item.tplKind==='invite'?'With love.':'Thank you!' };
    if(item.tplKind==='invite'){
      const asset=_ssInviteAsset();
      const f=asset.file;
      const isImg=f&&(/^image\//.test(f.type||'')||/\.(png|jpe?g|gif|webp)$/i.test(f.name||''));
      if(isImg && asset.publicUrl){ block.imageSrc=asset.publicUrl; block.imageHref=asset.viewUrl||asset.publicUrl; block.imageCaption='Click on invite to open in new page.'; }
      else if(asset.viewUrl){ block.fallbackLinkLabel='View your invitation'; block.fallbackLinkUrl=asset.viewUrl; }
    }
    payload.inviteBlock=block;
  }
  return {endpoint:'send-guest-email', payload};
}
// Payloads for the 4 "fixed copy" items — real editable overrides + real Design settings,
// sample data standing in for anything that's normally filled in from the guest's/vendor's
// own details at send time.
function _commsFixedPreviewPayload(key){
  const ed=_commsDesignFor(key);
  const ownerUid=_sbSession&&_sbSession.user&&_sbSession.user.id;
  const designOpts={ accentColor:ed.accentColor||'#8a6a2c', showLogo:ed.showLogo!==false,
    headerImage:ed.headerImage&&ownerUid?_SB_URL+'/storage/v1/object/public/'+_SB_BUCKET+'/'+ownerUid+'/'+ed.headerImage:'' };
  const names=_ssCoupleNames();
  const ct=(STATE.settings&&STATE.settings.commsText)||{};
  if(key==='confirm'){
    const t=ct.confirm||{};
    return {endpoint:'rsvp-confirm-email', payload:{ preview:true, couple_id:ownerUid||'', couple_names:names,
      wedding_date:(STATE.event&&STATE.event.date)||'', wedding_time:(STATE.event&&STATE.event.time)||'',
      venue:[STATE.event&&STATE.event.venue, STATE.event&&STATE.event.venueAddress].filter(Boolean).join(', '),
      title_override:t.title||null, intro_override:t.intro||null, closing_override:t.closing||null, design_opts:designOpts }};
  }
  if(key==='ww'){
    const t=ct.ww||{};
    const ww=STATE.wishingwell||{};
    const digital=[ ww.payId?{icon:'payid',label:'PayID',lines:[ww.payId]}:null,
      ww.paypal?{icon:'paypal',label:'PayPal',lines:[ww.paypal]}:null,
      (ww.bankBsb&&ww.bankAcc)?{icon:'bank',label:'Bank transfer',lines:['BSB: '+ww.bankBsb,'Acc no: '+ww.bankAcc].concat(ww.accountName?['Acc name: '+ww.accountName]:[])}:null ].filter(Boolean);
    const physical=[ ww.acceptCash?{icon:'cash',label:'Cash',lines:[]}:null,
      ww.acceptCheque?{icon:'cheque',label:'Cheque',lines:['Make out to '+(ww.chequeTo||'the couple')+'.']}:null ].filter(Boolean);
    return {endpoint:'ww-email-details', payload:{ preview:true, couple_id:ownerUid||'', couple_names:names, digital, physical,
      referenceNote:names,
      title_override:t.title||null, intro_override:t.intro||null, digital_note_override:t.digitalNote||null,
      physical_note_override:t.physicalNote||null, closing_override:t.closing||null, design_opts:designOpts }};
  }
  if(key==='appt'){
    const t=ct.appt||{};
    const signature=names&&t.signature&&t.signature.trim()
      ? t.signature.trim().replace(/\{names\}/g,names).split('\n').filter(Boolean)
      : (names?[`Sent by ${names} via UnionVault.`,'Reply to this email to reach them.']:[]);
    return {endpoint:'send-appointment-email', payload:{ preview:true,
      kicker:names?names+"'s wedding":'', title:'Vendor meeting',
      htmlText:'Vendor meeting with [vendor name].\n\nWhen: Saturday, 1 January 2028, 10:00am\nWhere: 123 Example Street',
      signature, designOpts }};
  }
  // vbrief
  const t=ct.vendorBrief||{};
  const edFull={ accentColor:ed.accentColor||'#8a6a2c', fontFamily:ed.fontFamily||'serif', showLogo:ed.showLogo!==false, headerImage:designOpts.headerImage };
  return {endpoint:'send-vendor-brief-email', payload:{ preview:true, fromName:names||'',
    intro_override:t.intro||null, button_label_override:t.buttonLabel||null, closing_override:t.closing||null,
    templateId:ed.templateId||'classic', designOpts:edFull }};
}
async function _commsLoadPreview(){
  const item=_commsItem(_commsSel); if(!item) return;
  const box=document.getElementById('comms-preview-box'); if(!box) return;
  if(item.kind==='tpl' && item.channel==='sms'){
    box.innerHTML=_commsSmsPreviewHtml(item);
    return;
  }
  box.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;height:360px;color:var(--muted);font-size:12.5px">Loading preview…</div>`;
  const built=item.kind==='tpl' ? _commsEmailPreviewPayload(item) : _commsFixedPreviewPayload(item.key);
  const {endpoint, payload}=built;
  if(!_sbSession || !_sbSession.access_token){
    const plain=payload.htmlText||payload.body||'';
    const plainBox=plain?`<div style="white-space:pre-wrap;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;font-size:12.5px;color:var(--ink);max-width:460px;margin:0 auto">${_escHtml(plain)}</div>`:'';
    box.innerHTML=`<div style="padding:20px 4px;text-align:center;color:var(--muted);font-size:12px">Sign in to preview this email.</div>${plainBox}`;
    return;
  }
  try{
    await _sbEnsureFreshToken();
    const r=await fetch(_SB_URL+'/functions/v1/'+endpoint,{ method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+_sbSession.access_token,'apikey':_SB_KEY},
      body:JSON.stringify(payload) });
    const data=await r.json();
    if(_commsSel!==item.key) return; // selection changed while this was loading
    if(!data.ok || !data.html){ box.innerHTML=`<div style="padding:30px 10px;text-align:center;color:var(--muted);font-size:12.5px">Preview unavailable.</div>`; return; }
    const w=Math.min(560, window.innerWidth-80);
    const frameId='comms-preview-frame';
    box.innerHTML=`<div style="display:flex;justify-content:center"><iframe id="${frameId}" srcdoc="${_escHtml(data.html)}" sandbox="allow-same-origin" scrolling="no" style="width:100%;max-width:${w}px;height:200px;border:1px solid var(--border);border-radius:10px;background:#fff;display:block"></iframe></div>`;
    // The preview reads with the page's own scroll, not a boxed-in scroll area of its own —
    // grow the iframe to exactly fit the email instead of a fixed height.
    const frame=document.getElementById(frameId);
    if(frame) frame.onload=()=>{
      try{
        const doc=frame.contentDocument;
        const h=doc&&doc.documentElement?doc.documentElement.scrollHeight:0;
        if(h) frame.style.height=(h+2)+'px';
      }catch(_){}
    };
  }catch(_){
    if(_commsSel!==item.key) return;
    box.innerHTML=`<div style="padding:30px 10px;text-align:center;color:var(--muted);font-size:12.5px">Preview failed — check your connection.</div>`;
  }
}

// ── Formatting toolbar — wraps the current textarea selection in the markup send-sheet.js's
// _stripMd/buildParas understand (**bold** *italic* __underline__). Shown above every
// multi-line editable field.
function _commsToolbarHtml(taId){
  const btn=(label,title,before,after,style)=>`<button type="button" title="${title}" onclick="_commsWrapSelection('${taId}','${before}','${after}')" style="width:26px;height:26px;border:1px solid var(--border);border-radius:6px;background:var(--surface);cursor:pointer;font-size:12px;color:var(--ink);${style||''}">${label}</button>`;
  return `<div style="display:flex;gap:4px">
    ${btn('B','Bold','**','**','font-weight:700')}
    ${btn('I','Italic','*','*','font-style:italic')}
    ${btn('U','Underline','__','__','text-decoration:underline')}
  </div>`;
}
function _commsWrapSelection(id, before, after){
  const ta=document.getElementById(id); if(!ta) return;
  const start=ta.selectionStart||0, end=ta.selectionEnd||0;
  const val=ta.value||'';
  const sel=end>start?val.slice(start,end):'text';
  ta.value=val.slice(0,start)+before+sel+after+val.slice(end);
  ta.focus();
  ta.selectionStart=start+before.length;
  ta.selectionEnd=start+before.length+sel.length;
}

// ── Edit (gated to full access) ─────────────────────────────────────────────
function _commsEditClick(key){
  if(!_uvRequirePaid('editComms')) return;
  _commsOpenEditModal(key);
}
function _commsDesignClick(key){
  if(!_uvRequirePaid('editComms')) return;
  _openEmailDesignModal(key);
}
function _commsOpenEditModal(key){
  const item=_commsItem(key); if(!item) return;
  if(item.kind==='tpl'){
    const cur=_inviteTpl(item.tplKind, item.channel);
    const body=`<div style="display:flex;flex-direction:column;gap:12px">
      <div style="font-size:12px;color:var(--muted);line-height:1.5">${_escHtml(_COMMS_TOKEN_HELP)}${item.channel==='email'?' '+_escHtml(_COMMS_MARKUP_HELP):''}</div>
      ${item.channel==='email'?_commsToolbarHtml('comms-edit-ta'):''}
      <textarea id="comms-edit-ta" class="form-input" style="min-height:160px;font-size:13px;line-height:1.5;resize:vertical">${_escHtml(cur)}</textarea>
    </div>`;
    const footer=`<button class="btn btn-outline btn-sm" onclick="_commsResetTpl('${key}')" style="margin-right:auto">Reset to default</button>
      <button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="_commsSaveTpl('${key}')">Save</button>`;
    openModal(item.title+' · '+(item.channel==='email'?'Email':'SMS'), body, footer);
    return;
  }
  _commsOpenFixedEditModal(key);
}
function _commsSaveTpl(key){
  const item=_commsItem(key); if(!item) return;
  const ta=document.getElementById('comms-edit-ta'); if(!ta) return;
  if(!STATE.settings) STATE.settings={};
  STATE.settings[_commsTplSettingsKey(item.tplKind, item.channel)]=ta.value;
  saveToStorage();
  closeModalDirect();
  _commsRefresh();
}
function _commsResetTpl(key){
  const item=_commsItem(key); if(!item) return;
  if(STATE.settings) delete STATE.settings[_commsTplSettingsKey(item.tplKind, item.channel)];
  saveToStorage();
  closeModalDirect();
  _commsRefresh();
}
function _commsFieldHtml(id,label,val,ph,multiline){
  const esc=_escHtml;
  return `<div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:5px">
      <div style="font-size:11.5px;font-weight:600;color:var(--ink)">${esc(label)}</div>
      ${multiline?_commsToolbarHtml(id):''}
    </div>
    ${multiline
      ? `<textarea id="${id}" class="form-input" placeholder="${_escAttr(ph)}" style="min-height:70px;font-size:13px;line-height:1.5;resize:vertical">${esc(val)}</textarea>`
      : `<input id="${id}" class="form-input" value="${esc(val)}" placeholder="${_escAttr(ph)}" style="font-size:13px"/>`}
  </div>`;
}
function _commsLockedNote(text){
  return `<div style="font-size:11px;color:var(--muted);background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px 11px;line-height:1.5"><strong style="color:var(--ink)">Filled in automatically:</strong> ${_escHtml(text)}</div>`;
}
// key → the sub-object this item's overrides live under in STATE.settings.commsText,
// shared by the save/reset functions below.
const _COMMS_FIXED_TEXT_KEY={confirm:'confirm', ww:'ww', appt:'appt', vbrief:'vendorBrief'};
function _commsOpenFixedEditModal(key){
  const ct=(STATE.settings&&STATE.settings.commsText)||{};
  let title='', fieldsHtml='', note='', saveFn='';
  if(key==='confirm'){
    const t=ct.confirm||{};
    title='RSVP confirmation';
    fieldsHtml=[
      _commsFieldHtml('cf-title','Title',t.title||'','{names} have received your reply.',false),
      _commsFieldHtml('cf-intro','Intro',t.intro||'',"Thanks for RSVPing to {names}'s wedding! Here's what we've got:",true),
      _commsFieldHtml('cf-closing','Closing',t.closing||'',"If anything above isn't right, just reply to this email and let them know.",true),
    ].join('');
    note=_commsLockedNote("Who's attending, dietary notes, and the wedding date & venue.");
    saveFn='_commsSaveConfirm()';
  } else if(key==='ww'){
    const t=ct.ww||{};
    title='Wishing Well details';
    fieldsHtml=[
      _commsFieldHtml('ww-title','Title',t.title||'',"{names}'s gift details",false),
      _commsFieldHtml('ww-intro','Intro',t.intro||'',"We can't wait to celebrate with you! You can find our payment info below.",true),
      _commsFieldHtml('ww-digital','Digital gifting note',t.digitalNote||'','Be sure to write your name/s in the reference so we know who to thank.',true),
      _commsFieldHtml('ww-physical','Physical gifting note',t.physicalNote||'','Place in a card and/or envelope with your name and drop it into the wishing well box on the wedding day.',true),
      _commsFieldHtml('ww-closing','Closing',t.closing||'','Thanks so much for your generosity!',true),
    ].join('');
    note=_commsLockedNote('Your payment details (PayID, bank, PayPal, cash, cheque).')
      +`<div style="font-size:11px;color:var(--ink);background:var(--parchment);border:1px solid var(--gold-med,var(--border));border-radius:8px;padding:9px 11px;line-height:1.5">This page only edits the wording — to add or change your actual PayID, bank details, PayPal, cash or cheque options, go to <button type="button" onclick="closeModalDirect();navigate('wishingwell')" style="background:none;border:none;color:var(--gold-deep);text-decoration:underline;cursor:pointer;font-family:inherit;font-size:11px;padding:0">Wishing Well &rsaquo; Settings</button>.</div>`;
    saveFn='_commsSaveWw()';
  } else if(key==='appt'){
    const t=ct.appt||{};
    title='Appointment email';
    fieldsHtml=_commsFieldHtml('appt-sig','Sign-off',t.signature||'','Sent by {names} via UnionVault.\nReply to this email to reach them.',true);
    note=_commsLockedNote('The appointment type, vendor, date, time &amp; location.');
    saveFn='_commsSaveAppt()';
  } else if(key==='vbrief'){
    const t=ct.vendorBrief||{};
    title='Vendor brief';
    fieldsHtml=[
      _commsFieldHtml('vb-intro','Intro',t.intro||'',"Hi {vendor_name},\n\nPlease find your vendor brief for our wedding below. You won't need an account to view it.",true),
      _commsFieldHtml('vb-btn','Button label',t.buttonLabel||'','View your brief',false),
      _commsFieldHtml('vb-closing','Closing',t.closing||'',"Let us know if you have any questions.\n\nWarm regards,\n{names}",true),
    ].join('');
    note=_commsLockedNote("The vendor's name and their secure brief link.");
    saveFn='_commsSaveVbrief()';
  } else return;
  const body=`<div style="display:flex;flex-direction:column;gap:14px">
    <div style="font-size:12px;color:var(--muted);line-height:1.5">${_escHtml(_COMMS_MARKUP_HELP)}</div>
    ${note}${fieldsHtml}
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_commsResetFixed('${key}')" style="margin-right:auto">Reset to default</button>
    <button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="${saveFn}">Save</button>`;
  openModal(title, body, footer);
}
function _commsResetFixed(key){
  const sub=_COMMS_FIXED_TEXT_KEY[key]; if(!sub) return;
  if(STATE.settings && STATE.settings.commsText) delete STATE.settings.commsText[sub];
  saveToStorage();
  closeModalDirect();
  _commsRefresh();
}
function _commsEnsureCommsText(){
  if(!STATE.settings) STATE.settings={};
  if(!STATE.settings.commsText) STATE.settings.commsText={};
  return STATE.settings.commsText;
}
function _commsFieldVal(id){ const el=document.getElementById(id); return el?el.value:''; }
function _commsSaveConfirm(){
  const ct=_commsEnsureCommsText();
  ct.confirm={ title:_commsFieldVal('cf-title'), intro:_commsFieldVal('cf-intro'), closing:_commsFieldVal('cf-closing') };
  saveToStorage(); closeModalDirect(); _commsRefresh();
}
function _commsSaveWw(){
  const ct=_commsEnsureCommsText();
  ct.ww={ title:_commsFieldVal('ww-title'), intro:_commsFieldVal('ww-intro'), digitalNote:_commsFieldVal('ww-digital'),
    physicalNote:_commsFieldVal('ww-physical'), closing:_commsFieldVal('ww-closing') };
  saveToStorage(); closeModalDirect(); _commsRefresh();
}
function _commsSaveAppt(){
  const ct=_commsEnsureCommsText();
  ct.appt={ signature:_commsFieldVal('appt-sig') };
  saveToStorage(); closeModalDirect(); _commsRefresh();
}
function _commsSaveVbrief(){
  const ct=_commsEnsureCommsText();
  ct.vendorBrief={ intro:_commsFieldVal('vb-intro'), buttonLabel:_commsFieldVal('vb-btn'), closing:_commsFieldVal('vb-closing') };
  saveToStorage(); closeModalDirect(); _commsRefresh();
}
