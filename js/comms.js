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
  {key:'sd-email', section:'Email', group:'The details', title:'Save the date', sub:'Sent by you, via UnionVault · to guests', kind:'tpl', tplKind:'savedate', channel:'email', branded:true},
  {key:'inv-email', section:'Email', group:'The details', title:'Invite', sub:'Sent by you, via UnionVault · to guests', kind:'tpl', tplKind:'invite', channel:'email', branded:true},
  {key:'rem-email', section:'Email', group:'The details', title:'RSVP reminder', sub:'Sent by you, via UnionVault · to guests awaiting a reply', kind:'tpl', tplKind:'reminder', channel:'email', branded:true},
  {key:'sd-sms', section:'SMS', group:'The details', title:'Save the date', sub:'Text, WhatsApp, Messenger, Instagram & more · to guests', kind:'tpl', tplKind:'savedate', channel:'sms', branded:false},
  {key:'inv-sms', section:'SMS', group:'The details', title:'Invite', sub:'Text, WhatsApp, Messenger, Instagram & more · to guests', kind:'tpl', tplKind:'invite', channel:'sms', branded:false},
  {key:'rem-sms', section:'SMS', group:'The details', title:'RSVP reminder', sub:'Text, WhatsApp, Messenger, Instagram & more · to guests awaiting a reply', kind:'tpl', tplKind:'reminder', channel:'sms', branded:false},
  {key:'confirm', section:'Email', group:'After they RSVP', title:'RSVP confirmation', sub:'Sent automatically · to the guest, right after they RSVP online', kind:'fixed', branded:true},
  {key:'ww', section:'Email', group:'After they RSVP', title:'Wishing Well details', sub:'Sent on request · to a guest who asks to be emailed your gift details', kind:'fixed', branded:true},
  {key:'appt', section:'Email', group:'Vendors', title:'Appointment details', sub:'Sent by you, via UnionVault · to a vendor, about a booked appointment', kind:'fixed', branded:true},
  {key:'vbrief', section:'Email', group:'Vendors', title:'Vendor brief', sub:'Sent by you, via UnionVault · to a vendor, with their secure brief link', kind:'fixed', branded:true},
];
// Two top-level sections (SMS first), each split into sub-groups. Email design sits at
// the end of the Email section since it applies to every email above it.
const _COMMS_SECTIONS=[
  {name:'SMS', groups:['The details']},
  {name:'Email', groups:['The details','After they RSVP','Vendors']},
];
const _commsItemsIn=(sec,grp)=>_COMMS_ITEMS.filter(i=>i.section===sec&&i.group===grp);

let _commsSel='sd-sms';
function _commsItem(key){ return _COMMS_ITEMS.find(i=>i.key===key); }
function _commsSetOrdinal(on){
  if(!STATE.settings) STATE.settings={};
  STATE.settings.commsOrdinalDates=!!on;
  saveToStorage();
  _commsRefresh();
}

// Two tabs: Templates (what each message says) and Sent (what's actually gone out).
let _commsTab='templates';
function _commsTabsHtml(){
  return `<div class="comms-tabs" role="tablist">
    <button type="button" role="tab" aria-selected="${_commsTab==='templates'}" class="${_commsTab==='templates'?'on':''}" onclick="_commsSetTab('templates')">Templates</button>
    <button type="button" role="tab" aria-selected="${_commsTab==='sent'}" class="${_commsTab==='sent'?'on':''}" onclick="_commsSetTab('sent')">Sent</button>
  </div>`;
}
function _commsSetTab(t, nav){
  _commsTab=t==='sent'?'sent':'templates';
  navigate('comms');
}
// "Back" to wherever Communications was opened from (Settings or RSVP & Invites).
function _commsBackBtnHtml(){
  let from=window._commsBackTo;
  if(!from){ try{ from=sessionStorage.getItem('uv_comms_back'); }catch(_){} }
  if(!from || from==='comms') from='settings';
  const names={settings:'Settings','rsvp-mgr':'RSVP & Invites',dashboard:'Dashboard',guests:'Guest List',website:'Website',vendors:'Vendors'};
  const label=names[from]||'previous page';
  return `<button type="button" class="btn btn-outline btn-sm" onclick="navigate('${from}')" aria-label="Back to ${_escHtml(label)}" title="Back to ${_escHtml(label)}" style="display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Back</button>`;
}
function renderComms(c, actions){
  actions.innerHTML=_commsBackBtnHtml();
  if(_commsTab==='sent'){
    c.innerHTML=_commsTabsHtml()+_slTabHtml();
    _slRefresh(true);
    return;
  }
  if(!_commsItem(_commsSel)) _commsSel=_COMMS_ITEMS[0].key;
  const designBtnHtml=`<button type="button" onclick="_openEmailDesignModal()" style="display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:10px 10px;border-radius:9px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:inherit;margin-top:2px">
        <span style="color:var(--gold-deep);flex-shrink:0;display:inline-flex"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg></span>
        <span style="min-width:0;flex:1"><span style="display:block;font-size:12px;color:var(--ink);font-weight:500;line-height:1.3">Email design</span><span style="display:block;font-size:10px;color:var(--muted);margin-top:1px;line-height:1.3">Branding &amp; header image — applies to all emails above</span></span>
      </button>`;
  const navHtml=_COMMS_SECTIONS.map((sec,si)=>`<div style="${si?'margin-top:6px;padding-top:14px;border-top:1px solid var(--border);':''}">
      <div style="font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600;color:var(--ink);padding:0 4px 8px;line-height:1.1">${_escHtml(sec.name)}</div>
      ${sec.groups.map(g=>`<div style="margin-bottom:12px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:0 4px 6px">${_escHtml(g)}</div>
        ${_commsItemsIn(sec.name,g).map(i=>_commsNavBtnHtml(i)).join('')}
      </div>`).join('')}
      ${sec.name==='Email'?designBtnHtml:''}
    </div>`).join('');
  // Narrow viewports get a dropdown instead of the nav list — a long list of 10 items
  // above the preview meant scrolling straight past all of them just to see one email.
  // Phones: an in-app dropdown with the same sections/groups/rows as the desktop list
  // (not the system <select> picker). The Email design shortcut sits at the end too.
  const mobileNavHtml=_COMMS_SECTIONS.map((sec,si)=>`<div class="comms-mnav-sec"${si?' style="border-top:1px solid var(--border);margin-top:4px;padding-top:10px"':''}>
      <div class="comms-mnav-sec-h">${_escHtml(sec.name)}</div>
      ${sec.groups.map(g=>`<div class="comms-mnav-grp">${_escHtml(g)}</div>${_commsItemsIn(sec.name,g).map(i=>_commsNavBtnHtml(i)).join('')}`).join('')}
      ${sec.name==='Email'?`<div style="margin-top:6px" onclick="_commsMnavClose()">${designBtnHtml}</div>`:''}
    </div>`).join('');
  const ordinalOn=_commsOrdinalOn();
  c.innerHTML=_commsTabsHtml()+`<div style="margin-bottom:10px;font-size:12.5px;color:var(--muted);line-height:1.5;max-width:760px">Every message UnionVault can send to a guest or vendor, in one place. RSVP alerts and gift notifications aren't here — those come to you, not your guests.</div>
  <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:14px;font-size:12px;color:var(--ink)">
    <input type="checkbox" ${ordinalOn?'checked':''} onchange="_commsSetOrdinal(this.checked)" style="width:14px;height:14px;accent-color:var(--gold);cursor:pointer;flex-shrink:0"/>
    Use ordinal dates (4th, 21st, 22nd…) instead of plain numbers (4, 21, 22…)
  </label>
  <div class="card comms-mobile-nav" style="margin-bottom:14px;padding:10px">
    <button type="button" id="comms-mnav-btn" class="comms-mnav-btn" onclick="_commsMnavToggle(event)" aria-haspopup="listbox" aria-expanded="false">${_commsMnavLabelHtml()}</button>
    <div id="comms-mnav-panel" class="comms-mnav-panel" hidden onclick="if(event.target.closest('[data-comms-key]')) _commsMnavClose()">${mobileNavHtml}</div>
  </div>
  <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
    <div class="card comms-nav-card" style="flex:0 0 240px;min-width:220px;padding:16px 10px">
      ${navHtml}
    </div>
    <div class="card" style="flex:1;min-width:320px" id="comms-detail">${_commsDetailHtml()}</div>
  </div>`;
  _commsLoadPreview();
}
function _commsMnavLabelHtml(){
  const i=_commsItem(_commsSel)||_COMMS_ITEMS[0];
  return `<span class="comms-mnav-cur"><span class="comms-mnav-ctx">${_escHtml(i.section+' · '+i.group)}</span><span class="comms-mnav-title">${_escHtml(i.title)}</span></span>
    <svg class="comms-mnav-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
}
function _commsMnavToggle(e){
  if(e) e.stopPropagation();
  const p=document.getElementById('comms-mnav-panel'), b=document.getElementById('comms-mnav-btn'); if(!p) return;
  const open=p.hidden; p.hidden=!open; if(b){ b.setAttribute('aria-expanded',String(open)); b.classList.toggle('open',open); }
  if(open){ const on=p.querySelector('[data-comms-key="'+_commsSel+'"]'); if(on) on.scrollIntoView({block:'nearest'}); }
}
function _commsMnavClose(){
  const p=document.getElementById('comms-mnav-panel'), b=document.getElementById('comms-mnav-btn');
  if(p) p.hidden=true; if(b){ b.setAttribute('aria-expanded','false'); b.classList.remove('open'); }
}
// Tap anywhere outside the open dropdown closes it.
document.addEventListener('click',e=>{ const p=document.getElementById('comms-mnav-panel'); if(p&&!p.hidden&&!e.target.closest('.comms-mobile-nav')) _commsMnavClose(); });
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
  const mb=document.getElementById('comms-mnav-btn'); if(mb) mb.innerHTML=_commsMnavLabelHtml();
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
    '{date}':_commsLongDate(ev.date)||_commsOrdinalize('Saturday, 1 January 2028'),
    '{rsvp_by}':_commsLongDate((STATE.settings||{}).rsvpBy)||'your earliest convenience',
    '{link}':_rsvpLink(),
    '{website}':_ctaLinks().website,
  };
  return _tplGreetingBreak(tpl||'').replace(/\{guest\}|\{names\}|\{date\}|\{rsvp_by\}|\{link\}|\{website\}/g, m=>map[m]!=null?map[m]:m);
}
// Mechanical RSVP CTA / sign-off appended after the editable template text — mirrors
// _ssMessage()'s `extra` array in send-sheet.js, with sample data only (preview, not a
// real send).
function _commsCtaLines(tplKind){
  const by=_commsLongDate((STATE.settings||{}).rsvpBy)||'your earliest convenience';
  if(tplKind==='invite'){
    const out=['Kindly RSVP by '+by+' via '+_rsvpLink()+'.'];
    try{ const w=typeof _wbSite==='function'&&_wbSite(); if(w&&w.published&&w.slug) out.push('For further wedding details, please check out our wedding website: '+_wbSiteUrl()); }catch(_){}
    out.push('With love.');
    return out;
  }
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
function _commsBaseText(tplKind, channel, includeCta, tplOverride){
  const raw=tplOverride!=null?tplOverride:_inviteTpl(tplKind, channel);
  let msg=_commsTokenFill(raw);
  if(includeCta && !(channel==='email' && (tplKind==='invite'||tplKind==='reminder') && (tplOverride!=null||_tplFullBody(tplKind)))){
    // Same rule as a real send: a button the couple placed replaces the automatic line.
    const ownRsvp=_tplHasBtn(raw,'rsvp')||/\{link\}/.test(raw), ownWeb=_tplHasBtn(raw,'website');
    const extra=_commsCtaLines(tplKind).filter(l=>!(ownRsvp&&/^Kindly RSVP/.test(l))&&!(ownWeb&&/website|^Details:/.test(l)));
    if(extra.length) msg=msg.replace(/\s+$/,'')+'\n\n'+extra.join('\n\n');
  }
  if(_sbSession && typeof _uvIsPaid==='function' && !_uvIsPaid()) msg+='\n\nSent via unionvault.app';
  // Email keeps button markers for the email to draw; text-only gets plain links.
  return channel==='sms'||includeCta?_ctaPlain(channel==='sms'?_stripMd(msg):msg):msg;
}
function _commsTplSettingsKey(tplKind, channel){
  const ch=channel==='email'?'Email':'Sms';
  if(tplKind==='reminder') return 'reminderTemplate'+ch;
  if(tplKind==='savedate') return 'saveDateTemplate'+ch;
  return 'inviteTemplate'+ch;
}
function _commsSmsPreviewHtml(item, tplOverride){
  const text=_commsBaseText(item.tplKind,'sms', true, tplOverride);
  return `<div style="max-width:380px;margin:0 auto;padding:6px 0">
    <div style="background:var(--parchment);border:1px solid var(--border);border-radius:16px 16px 16px 4px;padding:14px 16px;font-size:13.5px;line-height:1.55;white-space:pre-wrap">${_escHtml(text)}</div>
  </div>`;
}
// Payload for the Email channel of Save the date / Invite / RSVP reminder — built the
// same way _ssBuildPayload() builds a real send, so the preview can never drift from
// what actually goes out.
function _commsEmailPreviewPayload(item, tplOverride){
  const ed=_commsDesignFor(item.key);
  const names=_ssCoupleNames();
  const raw=tplOverride!=null?tplOverride:_inviteTpl(item.tplKind,'email');
  const designOpts={ accentColor:ed.accentColor||'#8a6a2c', fontFamily:ed.fontFamily||'serif', bodyFont:ed.bodyFont||'sans-serif', showLogo:ed.showLogo!==false,
    headerImage:_emailHeaderUrl(ed.headerImage,(_sbSession&&_sbSession.user&&_sbSession.user.id)) };
  const titleMap={savedate:'Save the date', invite:'You\'re invited', reminder:'RSVP reminder'};
  const title=titleMap[item.tplKind];
  const payload={ preview:true, subject:title+(names?' — '+names:''), fromName:names||'UnionVault',
    kicker:names?names+'\'s wedding':'', title, templateId:_emailTplId(ed.templateId), designOpts, ctaLinks:_ctaLinks() };
  if(item.tplKind==='savedate'){
    payload.body=_commsBaseText('savedate','email', true, raw);
    if(_tplHasBtn(raw,'rsvp')||_tplHasBtn(raw,'website')){
      // Buttons the couple placed: the email draws them, so keep the markers.
      payload.htmlText=_commsBaseText('savedate','email', false, raw);
      const w=_ctaLinks().website;
      if(w && !_tplHasBtn(raw,'website')) payload.htmlText=payload.htmlText.replace(/\s+$/,'')+'\n\nDetails: '+w;
    }
  } else if(tplOverride!=null || _tplFullBody(item.tplKind)){
    // Fully editable body (a draft in the editor is always the new form): the text is the email.
    let hasImg=false; const block={};
    if(item.tplKind==='invite'){
      const asset=_ssInviteAsset(); const f=asset.file;
      const isImg=f&&(/^image\//.test(f.type||'')||/\.(png|jpe?g|gif|webp)$/i.test(f.name||''));
      if(isImg && asset.publicUrl){ block.imageSrc=asset.publicUrl; block.imageHref=asset.viewUrl||asset.publicUrl; hasImg=true; }
      else if(asset.viewUrl){ block.fallbackLinkLabel='View your invitation'; block.fallbackLinkUrl=asset.viewUrl; hasImg=true; }
    }
    payload.htmlText=_tplCleanFull(_commsBaseText(item.tplKind,'email', false, raw), hasImg, !!_ctaLinks().website);
    if(hasImg && /\{invitation_image\}/.test(payload.htmlText)) payload.inviteBlock=block;
  } else {
    payload.htmlText=_commsBaseText(item.tplKind,'email', false, raw);
    const rsvpBy=_commsLongDate((STATE.settings||{}).rsvpBy)||'your earliest convenience';
    const block={ rsvpUrl:_rsvpLink(), rsvpByText:rsvpBy, rsvpButtonLabel:'RSVP',
      closingText:item.tplKind==='invite'?'With love.':'Thank you, we hope you can make it!' };
    if(item.tplKind==='invite'){
      const asset=_ssInviteAsset();
      const f=asset.file;
      const isImg=f&&(/^image\//.test(f.type||'')||/\.(png|jpe?g|gif|webp)$/i.test(f.name||''));
      if(isImg && asset.publicUrl){ block.imageSrc=asset.publicUrl; block.imageHref=asset.viewUrl||asset.publicUrl; block.imageCaption='Click on invite to open in new page.'; }
      else if(asset.viewUrl){ block.fallbackLinkLabel='View your invitation'; block.fallbackLinkUrl=asset.viewUrl; }
      block.rsvpLeadText='Kindly RSVP by '+rsvpBy+' by clicking the button below.';
      const w=typeof _wbSite==='function'&&_wbSite();
      if(w && w.published && w.slug) block.websiteUrl=_wbSiteUrl();
    } else if(item.tplKind==='reminder'){
      block.rsvpLeadText='Please submit your RSVP by '+rsvpBy+' so we can ensure you\'re catered for. If you cannot make it, please still submit your RSVP to let us know.';
    }
    payload.inviteBlock=_ctaDropPlaced(block, raw);
  }
  return {endpoint:'send-guest-email', payload};
}
// Payloads for the 4 "fixed copy" items — real editable overrides + real Design settings,
// sample data standing in for anything that's normally filled in from the guest's/vendor's
// own details at send time.
function _commsFixedPreviewPayload(key){
  const ed=_commsDesignFor(key);
  const ownerUid=_sbSession&&_sbSession.user&&_sbSession.user.id;
  const designOpts={ accentColor:ed.accentColor||'#8a6a2c', fontFamily:ed.fontFamily||'serif', bodyFont:ed.bodyFont||'sans-serif', showLogo:ed.showLogo!==false,
    headerImage:_emailHeaderUrl(ed.headerImage,ownerUid) };
  const names=_ssCoupleNames();
  const ct=(STATE.settings&&STATE.settings.commsText)||{};
  if(key==='confirm'){
    const t=ct.confirm||{};
    return {endpoint:'rsvp-confirm-email', payload:{ preview:true, couple_id:ownerUid||'', couple_names:names,
      wedding_date:(STATE.event&&STATE.event.date)||'', wedding_time:(STATE.event&&STATE.event.time)||'',
      venue:[STATE.event&&STATE.event.venue, STATE.event&&STATE.event.venueAddress].filter(Boolean).join(', '),
      title_override:t.title||null, intro_override:t.intro||null, closing_override:t.closing||null, design_opts:designOpts,
      ordinal_dates:typeof _commsOrdinalOn==='function'?_commsOrdinalOn():true }};
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
      : (names?[`Sent by ${names} via UnionVault.`,`Reply to this email to reach ${names}.`]:[]);
    const sigShown=typeof _apptSigFilter==='function'?_apptSigFilter(signature):signature;
    return {endpoint:'send-appointment-email', payload:{ preview:true,
      kicker:names?names+"'s wedding":'', title:'Vendor meeting',
      htmlText:'Vendor meeting with [vendor name].\n\nWhen: '+_commsOrdinalize('Saturday, 1 January 2028')+', 10:00am\nWhere: 123 Example Street',
      signature:sigShown, designOpts }};
  }
  // vbrief
  const t=ct.vendorBrief||{};
  const edFull={ accentColor:ed.accentColor||'#8a6a2c', fontFamily:ed.fontFamily||'serif', bodyFont:ed.bodyFont||'sans-serif', showLogo:ed.showLogo!==false, headerImage:designOpts.headerImage };
  return {endpoint:'send-vendor-brief-email', payload:{ preview:true, fromName:names||'',
    intro_override:t.intro||null, button_label_override:t.buttonLabel||null, closing_override:t.closing||null,
    templateId:_emailTplId(ed.templateId), designOpts:edFull }};
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
  await _commsRenderEmail(box, endpoint, payload, ()=>_commsSel===item.key, 'comms-preview-frame');
}
// Fetches the branded HTML from the email function in preview mode and shows it in an
// iframe sized to fit. `stillWanted()` guards against a newer request having replaced it.
async function _commsRenderEmail(box, endpoint, payload, stillWanted, frameId){
  try{
    await _sbEnsureFreshToken();
    const r=await fetch(_SB_URL+'/functions/v1/'+endpoint,{ method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+_sbSession.access_token,'apikey':_SB_KEY},
      body:JSON.stringify(payload) });
    const data=await r.json();
    if(!stillWanted()) return;
    if(!data.ok || !data.html){ box.innerHTML=`<div style="padding:30px 10px;text-align:center;color:var(--muted);font-size:12.5px">Preview unavailable.</div>`; return; }
    // Phones: use the full width of the box (the old innerWidth-80 left a wide dark gutter either side).
    const narrow=window.innerWidth<=600;
    const w=narrow?Math.max(240,box.clientWidth||window.innerWidth-48):Math.min(560, window.innerWidth-80);
    box.innerHTML=`<div style="display:flex;justify-content:center"><iframe id="${frameId}" srcdoc="${_escHtml(data.html)}" sandbox="allow-same-origin" scrolling="no" style="width:100%;max-width:${w}px;height:200px;border:1px solid var(--border);border-radius:10px;background:#fff;display:block"></iframe></div>`;
    // The preview reads with the page's own scroll, not a boxed-in scroll area of its own —
    // grow the iframe to exactly fit the email instead of a fixed height.
    const frame=document.getElementById(frameId);
    if(frame) frame.onload=()=>{
      try{
        const doc=frame.contentDocument;
        if(narrow&&doc&&doc.body) doc.body.style.padding='12px 4px';
        const h=doc&&doc.documentElement?doc.documentElement.scrollHeight:0;
        if(h) frame.style.height=(h+2)+'px';
      }catch(_){}
    };
  }catch(_){
    if(!stillWanted()) return;
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
  window._ssReturn=null;
  if(!_uvRequirePaid('editComms')) return;
  _commsOpenEditModal(key);
}
// Design is open to every plan (free plan just can't turn the footer logo off — see
// _emailLogoLocked); Edit stays gated.
function _commsDesignClick(key){
  _openEmailDesignModal(key);
}
// Edit window shell: Edit / Preview tabs, the editor pane, folded Tips, the email's font
// pickers, and a quiet "Reset to default" link.
let _commsEditKey=null;
function _commsEditShell(key, editHtml, tips){
  const item=_commsItem(key);
  const fonts=item&&item.branded?_commsFontRowsHtml(key):'';
  return `<div class="comms-ed">
    <div class="comms-ed-seg" role="group" aria-label="Edit or preview">
      <button type="button" id="comms-ed-tab-edit" aria-pressed="true" onclick="_commsEditTab(false)">Edit</button>
      <button type="button" id="comms-ed-tab-prev" aria-pressed="false" onclick="_commsEditTab(true)">Preview</button>
    </div>
    <div id="comms-ed-pane-edit" class="comms-ed-pane">
      ${editHtml}
      <details class="comms-ed-tips"><summary>Tips</summary>${tips}</details>
      ${fonts}
    </div>
    <div id="comms-ed-pane-prev" class="comms-ed-pane" hidden><div id="comms-ed-prev"></div></div>
  </div>`;
}
function _commsEditFooter(resetFn, saveFn){
  return `<button type="button" class="comms-ed-reset" onclick="${resetFn}">Reset to default</button>
    <button class="btn btn-outline btn-sm" onclick="closeModalDirect();if(typeof _ssReturnToSend==='function')_ssReturnToSend()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="${saveFn}">Save</button>`;
}
const _COMMS_TIPS_EMAIL='Gold tags fill in for each guest when the email is sent. Select words and tap <b>B</b>, <i>I</i> or <u>U</u> to style them. <b>Aa Size</b> sets the size of the paragraph you\'re in: small, normal, large or intro (larger italic), and the align buttons set left, centre or right. Email only. Enter starts a new paragraph; Shift+Enter starts a new line in the same paragraph.';
const _COMMS_TIPS_SMS='Gold tags fill in for each guest when the message is sent. Text messages are plain text, so bold, italic and underline show as normal words. Enter starts a new paragraph; Shift+Enter starts a new line.';
function _commsFontRowsHtml(key){
  const ed=_commsDesignFor(key);
  return `<div class="comms-ed-fonts">
    <div><div class="comms-ed-lbl">Header font</div>${_emailFontPickerHtml('fontFamily', ed.fontFamily||'serif', key, true)}</div>
    <div><div class="comms-ed-lbl">Body font</div>${_emailFontPickerHtml('bodyFont', ed.bodyFont||'sans-serif', key, true)}</div>
  </div>`;
}
function _commsEditTab(prev){
  const e=document.getElementById('comms-ed-tab-edit'), p=document.getElementById('comms-ed-tab-prev');
  if(e) e.setAttribute('aria-pressed',String(!prev)); if(p) p.setAttribute('aria-pressed',String(prev));
  const pe=document.getElementById('comms-ed-pane-edit'), pp=document.getElementById('comms-ed-pane-prev');
  if(pe) pe.hidden=prev; if(pp) pp.hidden=!prev;
  if(prev) _commsEditPreview();
}
// Preview of the UNSAVED draft: same builders as the page preview, fed the editor's text.
function _commsEditPreview(){
  const key=_commsEditKey, item=_commsItem(key), box=document.getElementById('comms-ed-prev');
  if(!item||!box) return;
  let built;
  if(item.kind==='tpl'){
    const md=_rteGet('comms-edit-ta');
    if(item.channel==='sms'){ box.innerHTML=_commsSmsPreviewHtml(item, md); return; }
    built=_commsEmailPreviewPayload(item, md);
  } else {
    const sub=_COMMS_FIXED_TEXT_KEY[key], ct=_commsEnsureCommsText(), was=ct[sub];
    ct[sub]=_commsCollectFixed(key);
    try{ built=_commsFixedPreviewPayload(key); } finally { if(was===undefined) delete ct[sub]; else ct[sub]=was; }
  }
  if(!_sbSession || !_sbSession.access_token){
    box.innerHTML=`<div style="padding:20px 4px;text-align:center;color:var(--muted);font-size:12px">Sign in to preview this email.</div>`;
    return;
  }
  box.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;height:240px;color:var(--muted);font-size:12.5px">Loading preview…</div>`;
  const stamp=(_commsEditPreview._n=(_commsEditPreview._n||0)+1);
  _commsRenderEmail(box, built.endpoint, built.payload, ()=>stamp===_commsEditPreview._n && !!document.getElementById('comms-ed-prev'), 'comms-ed-frame');
}
function _commsOpenEditModal(key){
  const item=_commsItem(key); if(!item) return;
  _commsEditKey=key;
  if(item.kind==='tpl'){
    let cur=_inviteTpl(item.tplKind, item.channel);
    const email=item.channel==='email';
    // Invite / Reminder email: an older saved text is shown with everything that was being added
    // after it written out, so the whole email is visible and editable. Saving makes it the new form.
    if(email && (item.tplKind==='invite'||item.tplKind==='reminder') && !_tplFullBody(item.tplKind)) cur=_tplExpandLegacy(item.tplKind, cur);
    const editor=_rteHtml('comms-edit-ta', cur, {
      toks: email?['guest','names','date','rsvp_by']:['guest','names','date','rsvp_by','link','website'],
      btns: email, invite: email&&item.tplKind==='invite', intro: email, fmt: email, minH:email?240:170 });
    const body=_commsEditShell(key, editor, email?_COMMS_TIPS_EMAIL:_COMMS_TIPS_SMS);
    openModal(item.title+' · '+(email?'Email':'SMS'), body, _commsEditFooter(`_commsResetTpl('${key}')`, `_commsSaveTpl('${key}')`));
    _rteInitAll();
    return;
  }
  _commsOpenFixedEditModal(key);
}
function _commsSaveTpl(key){
  const item=_commsItem(key); if(!item) return;
  if(!document.getElementById('comms-edit-ta')) return;
  if(!STATE.settings) STATE.settings={};
  STATE.settings[_commsTplSettingsKey(item.tplKind, item.channel)]=_rteGet('comms-edit-ta');
  if(item.channel==='email' && (item.tplKind==='invite'||item.tplKind==='reminder')){
    STATE.settings.commsFullBody=Object.assign({},STATE.settings.commsFullBody,{[item.tplKind]:true});
  }
  saveToStorage();
  closeModalDirect();
  _commsRefresh();
  if(typeof _ssReturnToSend==='function') _ssReturnToSend();
}
function _commsResetTpl(key){
  const item=_commsItem(key); if(!item) return;
  if(STATE.settings){
    delete STATE.settings[_commsTplSettingsKey(item.tplKind, item.channel)];
    if(STATE.settings.commsFullBody) delete STATE.settings.commsFullBody[item.tplKind];
    // SMS also falls back to the old pre-channel-split key — clear it too, or Reset
    // would just bring the old saved text back.
    if(item.channel!=='email'){
      const legacy=item.tplKind==='reminder'?'reminderTemplate':item.tplKind==='savedate'?'saveDateTemplate':'inviteTemplate';
      delete STATE.settings[legacy];
    }
  }
  saveToStorage();
  closeModalDirect();
  _commsRefresh();
  if(typeof _ssReturnToSend==='function') _ssReturnToSend();
}
function _commsFieldHtml(id,label,val,ph,multiline,toks){
  const esc=_escHtml;
  return `<div>
    <div style="font-size:11.5px;font-weight:600;color:var(--ink);margin-bottom:5px">${esc(label)}</div>
    ${multiline
      ? _rteHtml(id, val, {toks:toks||['names'], btns:false, intro:true, minH:90,
          // the grey default wording, with tags written the way the editor shows them
          ph:ph.replace(/\n+/g,' ').replace(/\{(\w+)\}/g,(m,k)=>_RTE_TOKENS[k]?'['+_RTE_TOKENS[k]+']':m)})
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
      _commsFieldHtml('ww-intro','Intro',t.intro||'',"We can't wait to celebrate with you! You can find our payment info below.",true,['names','amount']),
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
    fieldsHtml=_commsFieldHtml('appt-sig','Sign-off',t.signature||'','Sent by {names} via UnionVault.\nReply to this email to reach {names}.',true);
    note=_commsLockedNote('The appointment type, vendor, date, time &amp; location.');
    saveFn='_commsSaveAppt()';
  } else if(key==='vbrief'){
    const t=ct.vendorBrief||{};
    title='Vendor brief';
    fieldsHtml=[
      _commsFieldHtml('vb-intro','Intro',t.intro||'',"Hi {vendor_name},\n\nPlease find your vendor brief for our wedding below. You won't need an account to view it.",true,['names','vendor_name']),
      _commsFieldHtml('vb-btn','Button label',t.buttonLabel||'','View your brief',false),
      _commsFieldHtml('vb-closing','Closing',t.closing||'',"Let us know if you have any questions.\n\nWarm regards,\n{names}",true,['names','vendor_name']),
    ].join('');
    note=_commsLockedNote("The vendor's name and their secure brief link.");
    saveFn='_commsSaveVbrief()';
  } else return;
  _commsEditKey=key;
  const body=_commsEditShell(key, `<div style="display:flex;flex-direction:column;gap:14px">${note}${fieldsHtml}</div>`,
    'Leave a box empty to use the wording shown in grey. '+_COMMS_TIPS_EMAIL);
  openModal(title, body, _commsEditFooter(`_commsResetFixed('${key}')`, saveFn));
  _rteInitAll();
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
function _commsFieldVal(id){ const el=document.getElementById(id); if(!el) return ''; return el.classList.contains('rte-ed')?_rteGet(id):el.value; }
function _commsCollectFixed(key){
  const v=_commsFieldVal;
  if(key==='confirm') return { title:v('cf-title'), intro:v('cf-intro'), closing:v('cf-closing') };
  if(key==='ww') return { title:v('ww-title'), intro:v('ww-intro'), digitalNote:v('ww-digital'), physicalNote:v('ww-physical'), closing:v('ww-closing') };
  if(key==='appt') return { signature:v('appt-sig') };
  if(key==='vbrief') return { intro:v('vb-intro'), buttonLabel:v('vb-btn'), closing:v('vb-closing') };
  return {};
}
function _commsSaveFixed(key){
  _commsEnsureCommsText()[_COMMS_FIXED_TEXT_KEY[key]]=_commsCollectFixed(key);
  saveToStorage(); closeModalDirect(); _commsRefresh();
}
function _commsSaveConfirm(){ _commsSaveFixed('confirm'); }
function _commsSaveWw(){ _commsSaveFixed('ww'); }
function _commsSaveAppt(){ _commsSaveFixed('appt'); }
function _commsSaveVbrief(){ _commsSaveFixed('vbrief'); }

// ════════════════════════════════════════════════════════════════════════
// Rich text editor for Communications templates
// ════════════════════════════════════════════════════════════════════════
// Edits the words the way they'll look: bold / italic / underline show as styled text,
// "Aa Intro" makes the larger italic opener, and tokens appear as gold tags instead of
// {curly} codes. Saved back in the same markup the senders already read (**bold**,
// *italic*, __underline__, "## " intro lines, {tokens}, and {rsvp_button} /
// {website_button} on their own line), so nothing downstream changes format.
const _RTE_TOKENS={guest:'Guest name',names:"Couple's names",date:'Wedding date',rsvp_by:'RSVP-by date',link:'RSVP link',website:'Website link',vendor_name:'Vendor name',amount:'Gift amount'};
const _RTE_TOKEN_EG={guest:'Olivia & James',names:'',date:'',rsvp_by:'',link:'',website:'',vendor_name:'Bloom Florals',amount:'$100.00'};
const _RTE_BTNS={rsvp:'RSVP',website:'Visit our website',invitation:'Invitation image'};
function _rteTokHtml(k){ return `<span class="rte-tok" contenteditable="false" data-tok="${k}">${_escHtml(_RTE_TOKENS[k]||k)}</span>`; }
function _rteBtnRowHtml(k){
  return `<p class="rte-btnrow" contenteditable="false"><span class="rte-btn" data-btn="${k}">${_escHtml(_RTE_BTNS[k])}<button type="button" class="rte-btn-x" onclick="_rteRemoveBtn(this)" aria-label="Remove button">×</button></span></p>`;
}
function _rteMdToHtml(md){
  const paras=String(md||'').replace(/\r/g,'').split(/\n{2,}/);
  const html=paras.map(p=>{
    const bm=p.trim().match(/^\{(rsvp|website)_button\}$/);
    if(bm) return _rteBtnRowHtml(bm[1]);
    if(/^\{invitation_image\}$/.test(p.trim())) return _rteBtnRowHtml('invitation');
    let cls='', body=p;
    const alm=body.match(/^~([cr])\s+/);
    if(alm){ cls=alm[1]==='c'?'rte-center':'rte-right'; body=body.slice(alm[0].length); }
    const szm=body.match(/^(###|##|-#)\s+/);
    if(szm){ cls=(cls?cls+' ':'')+{'##':'rte-intro','###':'rte-large','-#':'rte-small'}[szm[1]]; body=body.slice(szm[0].length); }
    let h=_escHtml(body)
      .replace(/\{(\w+)\}/g,(m,k)=>_RTE_TOKENS[k]?_rteTokHtml(k):m)
      .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/__(.+?)__/g,'<u>$1</u>').replace(/\*(.+?)\*/g,'<i>$1</i>')
      .replace(/\n/g,'<br>');
    return `<p${cls?' class="'+cls+'"':''}>${h||'<br>'}</p>`;
  }).join('');
  return html||'<p><br></p>';
}
function _rteHtmlToMd(root){
  // Markers hug the words: "**word** " not "**word **", and never span a line break.
  const wrap=(inner,mk)=>inner.split('\n').map(line=>{
    const m=line.match(/^(\s*)([\s\S]*?)(\s*)$/);
    return m[2]?m[1]+mk+m[2]+mk+m[3]:line;
  }).join('\n');
  const inline=n=>{
    if(n.nodeType===3) return n.nodeValue.replace(/ /g,' ');
    if(n.nodeType!==1) return '';
    if(n.classList.contains('rte-tok')) return '{'+n.dataset.tok+'}';
    if(n.classList.contains('rte-btn-x')) return '';
    const tag=n.nodeName;
    if(tag==='BR') return '\n';
    const inner=[...n.childNodes].map(inline).join('');
    if(tag==='B'||tag==='STRONG') return wrap(inner,'**');
    if(tag==='I'||tag==='EM') return wrap(inner,'*');
    if(tag==='U') return wrap(inner,'__');
    if(tag==='SPAN'){
      const st=n.style||{}; let out=inner;
      if(st.textDecorationLine==='underline'||st.textDecoration==='underline') out=wrap(out,'__');
      if(st.fontStyle==='italic') out=wrap(out,'*');
      if(st.fontWeight==='bold'||+st.fontWeight>=600) out=wrap(out,'**');
      return out;
    }
    if(tag==='DIV'||tag==='P') return '\n'+inner;
    return inner;
  };
  const blocks=[]; let loose='';
  const flush=()=>{ if(loose.trim()) blocks.push(loose); loose=''; };
  [...root.childNodes].forEach(n=>{
    if(n.nodeType===1 && (n.nodeName==='P'||n.nodeName==='DIV')){
      flush();
      if(n.classList.contains('rte-btnrow')){ const b=n.querySelector('[data-btn]'); if(b) blocks.push(b.dataset.btn==='invitation'?'{invitation_image}':'{'+b.dataset.btn+'_button}'); return; }
      const txt=[...n.childNodes].map(inline).join('').replace(/^\n+|\n+$/g,'');
      if(!txt.trim()) return;
      blocks.push((n.classList.contains('rte-center')?'~c ':n.classList.contains('rte-right')?'~r ':'')+(n.classList.contains('rte-intro')?'## ':n.classList.contains('rte-large')?'### ':n.classList.contains('rte-small')?'-# ':'')+txt);
    } else loose+=inline(n);
  });
  flush();
  return blocks.map(b=>b.replace(/[ \t]+$/gm,'').replace(/\*\*\*\*|____/g,'')).join('\n\n').trim();
}
// opts: {toks:[keys], btns:bool, intro:bool, ph:'placeholder', minH:px}
function _rteHtml(id, md, opts){
  opts=opts||{};
  const tb=(cmd,label,title)=>`<button type="button" class="rte-tb" data-cmd="${cmd}" title="${title}" aria-label="${title}" onmousedown="event.preventDefault()" onclick="_rteCmd('${id}','${cmd}')">${label}</button>`;
  const toks=(opts.toks||[]).filter(k=>_RTE_TOKENS[k]);
  const menu=(toks.length||opts.btns)?`<div class="rte-menu" id="${id}-menu" hidden>
      ${toks.map(k=>`<button type="button" onmousedown="event.preventDefault()" onclick="_rteInsertTok('${id}','${k}')">${_escHtml(_RTE_TOKENS[k])}<small>${_escHtml(_rteTokExample(k))}</small></button>`).join('')}
      ${opts.btns?`${toks.length?'<div class="rte-menu-sep"></div>':''}
        <button type="button" onmousedown="event.preventDefault()" onclick="_rteInsertBtn('${id}','rsvp')">RSVP button<small>Guests tap to reply</small></button>
        <button type="button" onmousedown="event.preventDefault()" onclick="_rteInsertBtn('${id}','website')">Website button<small>Your wedding website</small></button>
        ${opts.invite?`<button type="button" onmousedown="event.preventDefault()" onclick="_rteInsertBtn('${id}','invitation')">Invitation image<small>Your invitation</small></button>`:''}`:''}
    </div>`:'';
  return `<div class="rte" data-rte="${id}">
    <div class="rte-bar" role="toolbar" aria-label="Formatting">
      ${opts.fmt!==false?tb('bold','<b>B</b>','Bold')+tb('italic','<i>I</i>','Italic')+tb('underline','<u>U</u>','Underline'):''}
      ${opts.intro!==false?`${opts.fmt!==false?'<span class="rte-sep"></span>':''}<span class="rte-szwrap"><button type="button" class="rte-tb rte-tb-wide rte-szb" data-cmd="size" id="${id}-szb" title="Text size for this paragraph" aria-haspopup="true" aria-expanded="false" onmousedown="_rteSaveSel('${id}');event.preventDefault()" aria-label="Text size" onclick="_rteToggleSize('${id}',event)">Aa<span class="rte-lbl"> Size</span> ▾</button><div class="rte-menu rte-sizemenu" id="${id}-sizemenu" hidden>
        ${[['small','Small','rte-sz-small'],['normal','Normal',''],['large','Large','rte-sz-large'],['intro','Intro','rte-sz-intro']].map(([k,l,c])=>`<button type="button" class="${c}" onmousedown="event.preventDefault()" onclick="_rteSize('${id}','${k}')">${l}</button>`).join('')}
      </div></span><span class="rte-algn">${[['left','Align left'],['center','Centre'],['right','Align right']].map(([a,l])=>`<button type="button" class="rte-tb" data-cmd="align-${a}" title="${l}" aria-label="${l}" onmousedown="event.preventDefault()" onclick="_rteAlign('${id}','${a}')">${_rteAlignIcon(a)}</button>`).join('')}</span>`:''}
      ${menu?`<button type="button" class="rte-tb rte-tb-wide rte-ins" id="${id}-ins" aria-haspopup="true" aria-expanded="false" onmousedown="_rteSaveSel('${id}');event.preventDefault()" aria-label="Insert" onclick="_rteToggleMenu('${id}',event)">＋<span class="rte-lbl"> Insert</span></button>${menu}`:''}
    </div>
    <div id="${id}" class="rte-ed form-input" contenteditable="true" spellcheck="true" data-ph="${_escAttr(opts.ph||'')}" style="min-height:${opts.minH||70}px"
      onfocus="_rteFocus(this)" oninput="_rteEmptyCheck(this)" onpaste="_rtePaste(event)">${md?_rteMdToHtml(md):'<p><br></p>'}</div>
  </div>`;
}
function _rteTokExample(k){
  const ev=STATE.event||{}; const p1=ev.partner1||'', p2=ev.partner2||'';
  if(k==='names') return (p1&&p2)?p1+' & '+p2:(p1||p2||'');
  if(k==='date') return _commsLongDate(ev.date)||'';
  if(k==='rsvp_by') return _commsLongDate((STATE.settings||{}).rsvpBy)||'';
  if(k==='link') return 'Your RSVP page';
  if(k==='website') return 'Your wedding website';
  return _RTE_TOKEN_EG[k]||'';
}
const _rteSel={};
function _rteSaveSel(id){
  const ed=document.getElementById(id), s=window.getSelection();
  if(ed&&s.rangeCount&&ed.contains(s.anchorNode)) _rteSel[id]=s.getRangeAt(0).cloneRange();
}
function _rteRestoreSel(id){
  const ed=document.getElementById(id); if(!ed) return null;
  ed.focus();
  const s=window.getSelection(); let r=_rteSel[id];
  if(!r||!ed.contains(r.startContainer)){ r=document.createRange(); r.selectNodeContents(ed.lastElementChild||ed); r.collapse(false); }
  s.removeAllRanges(); s.addRange(r); return r;
}
function _rteFocus(ed){ try{ document.execCommand('defaultParagraphSeparator',false,'p'); }catch(_){} _rteSync(ed); }
function _rteEmptyCheck(ed){ ed.classList.toggle('is-empty', !ed.textContent.trim() && !ed.querySelector('.rte-tok,.rte-btn')); }
function _rtePaste(e){
  // Plain text only: pasted web/email formatting would smuggle in styles the email can't show.
  e.preventDefault();
  const t=(e.clipboardData||window.clipboardData).getData('text/plain')||'';
  try{ document.execCommand('insertText',false,t); }catch(_){}
}
function _rteCmd(id,cmd){ const ed=document.getElementById(id); if(!ed) return; ed.focus(); try{ document.execCommand(cmd,false,null); }catch(_){} _rteSync(ed); }
function _rteBlock(ed){
  const s=window.getSelection(); if(!s.rangeCount) return null;
  let n=s.anchorNode; while(n&&n.parentNode!==ed) n=n.parentNode;
  if(!n||n===ed) return null;
  if(n.nodeType!==1||!(n.nodeName==='P'||n.nodeName==='DIV')){ try{ document.execCommand('formatBlock',false,'p'); }catch(_){} return _rteBlock(ed); }
  return n;
}
function _rteToggleSize(id,e){
  if(e) e.stopPropagation();
  const m=document.getElementById(id+'-sizemenu'), b=document.getElementById(id+'-szb'); if(!m) return;
  const open=m.hidden; _rteCloseMenus();
  m.hidden=!open; if(b) b.setAttribute('aria-expanded',String(open));
}
// Size applies to the whole paragraph the cursor is in: small / normal / large / intro (larger italic).
function _rteSize(id,sz){
  const ed=document.getElementById(id); if(!ed) return;
  _rteSelBlocks(id).forEach(p=>{
    p.classList.remove('rte-small','rte-large','rte-intro');
    if(sz!=='normal') p.classList.add('rte-'+sz);
  });
  _rteCloseMenus(); _rteSync(ed);
}
function _rteAlignIcon(a){
  const lines=[[3,12],[8,6],[13,9]];
  const x=l=>a==='left'?2:a==='center'?(16-l)/2:14-l;
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">${lines.map(([y,l])=>`<line x1="${x(l)}" y1="${y}" x2="${x(l)+l}" y2="${y}"/>`).join('')}</svg>`;
}
// The paragraphs the cursor is in, or that the highlighted text touches (not RSVP/website/invitation block rows).
// Uses the live selection; falls back to the last one saved from the toolbar menus. Never "the last line".
function _rteSelBlocks(id){
  const ed=document.getElementById(id); if(!ed) return [];
  const s=window.getSelection(); let r=null;
  if(s.rangeCount && ed.contains(s.anchorNode) && ed.contains(s.focusNode)) r=s.getRangeAt(0);
  else if(_rteSel[id] && ed.contains(_rteSel[id].startContainer)) r=_rteSel[id];
  if(!r) return [];
  const top=(n)=>{ while(n&&n.parentNode!==ed) n=n.parentNode; return n; };
  let first=top(r.startContainer), last=top(r.endContainer);
  // Selection sitting directly in the editor (between paragraphs): use the paragraph at that offset.
  if(r.startContainer===ed) first=ed.childNodes[Math.min(r.startOffset,ed.childNodes.length-1)];
  if(r.endContainer===ed) last=ed.childNodes[Math.max(0,Math.min(r.endOffset,ed.childNodes.length)-1)];
  if(!first||!last) return [];
  // A highlight that ends at the very start of the next paragraph (e.g. triple-click) doesn't include that paragraph.
  if(first!==last){
    const pre=document.createRange(); pre.selectNodeContents(last); pre.setEnd(r.endContainer,r.endOffset);
    if(pre.toString()==='' && last.previousSibling) last=last.previousSibling;
  }
  const out=[]; let n=first;
  while(n){
    if(n.nodeType===1 && (n.nodeName==='P'||n.nodeName==='DIV') && !n.classList.contains('rte-btnrow')) out.push(n);
    if(n===last) break;
    n=n.nextSibling;
  }
  return out;
}
// Alignment is per paragraph, like size: left (default), centre or right.
function _rteAlign(id,a){
  const ed=document.getElementById(id); if(!ed) return;
  _rteSelBlocks(id).forEach(p=>{
    p.classList.remove('rte-center','rte-right');
    if(a==='center') p.classList.add('rte-center'); else if(a==='right') p.classList.add('rte-right');
  });
  _rteSync(ed);
}
function _rteIntro(id){
  const ed=document.getElementById(id); if(!ed) return; ed.focus();
  const p=_rteBlock(ed)||ed.querySelector('p'); if(p&&!p.classList.contains('rte-btnrow')) p.classList.toggle('rte-intro');
  _rteSync(ed);
}
function _rteToggleMenu(id,e){
  if(e) e.stopPropagation();
  const m=document.getElementById(id+'-menu'), b=document.getElementById(id+'-ins'); if(!m) return;
  document.querySelectorAll('.rte-menu').forEach(x=>{ if(x!==m) x.hidden=true; });
  m.hidden=!m.hidden; if(b) b.setAttribute('aria-expanded',String(!m.hidden));
}
function _rteCloseMenus(){ document.querySelectorAll('.rte-menu').forEach(m=>m.hidden=true); document.querySelectorAll('.rte-ins,.rte-szb').forEach(b=>b.setAttribute('aria-expanded','false')); }
document.addEventListener('click',e=>{ if(!e.target.closest('.rte-menu')&&!e.target.closest('.rte-ins')&&!e.target.closest('.rte-szb')) _rteCloseMenus(); });
function _rteInsertTok(id,k){
  const ed=document.getElementById(id); if(!ed) return;
  const r=_rteRestoreSel(id); if(!r) return;
  const tmp=document.createElement('span'); tmp.innerHTML=_rteTokHtml(k); const tok=tmp.firstChild;
  r.deleteContents();
  const pre=document.createRange(); pre.setStart(ed,0); pre.setEnd(r.startContainer,r.startOffset);
  const before=pre.toString();
  r.insertNode(document.createTextNode(' ')); r.insertNode(tok);
  if(before && !/\s$/.test(before)) tok.before(document.createTextNode(' '));
  const s=window.getSelection(), after=document.createRange(); after.setStartAfter(tok.nextSibling); after.collapse(true); s.removeAllRanges(); s.addRange(after);
  _rteCloseMenus(); _rteEmptyCheck(ed); _rteSaveSel(id);
}
function _rteInsertBtn(id,k){
  const ed=document.getElementById(id); if(!ed) return;
  // One of each: a second RSVP button would just repeat itself.
  const ex=ed.querySelector('.rte-btn[data-btn="'+k+'"]'); if(ex){ _rteCloseMenus(); ex.closest('.rte-btnrow').scrollIntoView({block:'nearest'}); return; }
  _rteRestoreSel(id);
  const tmp=document.createElement('div'); tmp.innerHTML=_rteBtnRowHtml(k); const row=tmp.firstChild;
  const blk=_rteBlock(ed);
  if(blk&&blk.nextSibling) ed.insertBefore(row,blk.nextSibling); else ed.appendChild(row);
  if(!row.nextSibling){ const p=document.createElement('p'); p.innerHTML='<br>'; ed.appendChild(p); }
  _rteCloseMenus(); _rteEmptyCheck(ed);
}
function _rteRemoveBtn(x){ const row=x.closest('.rte-btnrow'); const ed=row&&row.closest('.rte-ed'); if(row) row.remove(); if(ed) _rteEmptyCheck(ed); }
function _rteSync(ed){
  const wrap=ed&&ed.closest('.rte'); if(!wrap) return;
  wrap.querySelectorAll('.rte-tb[data-cmd]').forEach(b=>{
    const c=b.dataset.cmd; let on=false;
    if(c==='size'){ const s=window.getSelection(); let n=s.rangeCount?s.anchorNode:null; while(n&&n.parentNode!==ed) n=n.parentNode; on=!!(n&&n.classList&&(n.classList.contains('rte-intro')||n.classList.contains('rte-small')||n.classList.contains('rte-large'))); }
    else if(c.indexOf('align-')===0){ const s=window.getSelection(); let n=s.rangeCount?s.anchorNode:null; while(n&&n.parentNode!==ed) n=n.parentNode; const cl=n&&n.classList; const cur=cl&&cl.contains('rte-center')?'center':cl&&cl.contains('rte-right')?'right':'left'; on=(c==='align-'+cur); }
    else { try{ on=document.queryCommandState(c); }catch(_){} }
    b.classList.toggle('on',on);
  });
}
document.addEventListener('selectionchange',()=>{ const a=document.activeElement; if(a&&a.classList&&a.classList.contains('rte-ed')) _rteSync(a); });
function _rteInitAll(){ document.querySelectorAll('.rte-ed').forEach(_rteEmptyCheck); }
function _rteGet(id){ const ed=document.getElementById(id); return ed?_rteHtmlToMd(ed):''; }
