// INVITATIONS
// ══════════════════════════════════════════════
// Scaffold page. The actual invitation builder/preview is a separate HTML file
// to be mounted into #invitation-mount later. STATE.invitation holds saved data:
//   { html: '<the invitation markup/data URL>', name: 'My Invitation', updated: <ts> }
function renderInvitation(c, actions){
  // Invitations are now part of the combined RSVP & Invites page.
  navigate('rsvp-mgr');
}

// Returns ONE of the two invitation-tool cards as HTML, for embedding in the combined
// RSVP & Invites page grid. `which` is 'invitation' (create/upload + preview mount) or
// 'sendguests' (contact-coverage stats + send buttons). They are now independent sections
// so each can be moved / hidden on its own.
function _invitationSectionHtml(which){
  if(!STATE.invitation) STATE.invitation = {};
  const inv = STATE.invitation;
  const hasInvite = !!(inv.html || inv.fileName || inv.link || inv.file);

  const guests = Array.isArray(STATE.guests) ? STATE.guests : [];
  const withEmail = guests.filter(g => (g.email||'').trim()).length;
  const withPhone = guests.filter(g => (g.phone||'').trim()).length;
  const missingBoth = guests.filter(g => !(g.email||'').trim() && !(g.phone||'').trim()).length;

  if(which==='invitation'){
    const hasLink=!!(inv.link&&inv.link.url);
    const hasFile=!!(inv.file&&inv.file.name);
    const _fileInput=`<input type="file" id="inv-file-input" accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.gif" style="display:none" onchange="_invFileSelected(event)"/>`;
    const _greenCheck=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    let content='';
    if(!hasLink&&!hasFile){
      content=`${_fileInput}
      <div style="border:1.5px dashed var(--border);border-radius:12px;padding:26px 20px 20px;text-align:center;background:var(--surface)">
        <div style="margin-bottom:12px;opacity:.45"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><polyline points="2 7 12 13 22 7"/></svg></div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:500;color:var(--ink);margin-bottom:5px">No invitation yet</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:16px">Upload your invitation file or link to a design in Canva, Google Drive, or elsewhere.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:10px">
          <button class="btn btn-primary btn-sm" onclick="_invTriggerUpload()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload file</button>
          <button class="btn btn-outline btn-sm" onclick="_invOpenAddLink()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Add link</button>
        </div>
        <div><button onclick="_invComingSoon()" style="background:none;border:none;padding:4px 8px;font-size:11.5px;color:var(--muted);cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-family:inherit"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Create invitation</button></div>
      </div>`;
    } else if(hasLink&&hasFile){
      const lp=_invPlatformInfo(inv.link.url);
      const utrun=inv.link.url.length>50?inv.link.url.slice(0,48)+'…':inv.link.url;
      const ftrun=inv.file.name.length>40?inv.file.name.slice(0,38)+'…':inv.file.name;
      const _invSrc2=_mediaUrl(inv.file.mediaId||inv.file.dataUrl||'');
      const _invIsImg2=/^image\//.test(inv.file.type||'')||/^data:image/.test(inv.file.dataUrl||'')||/\.(png|jpe?g|gif|webp)$/i.test(inv.file.name||'');
      const _fext2=(inv.file.name.match(/\.(\w+)$/)||['','file'])[1].toUpperCase();
      const _fileThumb=_invSrc2&&_invIsImg2?`<div style="width:48px;height:48px;border-radius:6px;overflow:hidden;border:1px solid var(--border);flex-shrink:0;background:var(--surface)"><img src="${_escHtml(_invSrc2)}" style="width:100%;height:100%;object-fit:cover" alt=""/></div>`:`<div style="width:48px;height:48px;border-radius:6px;background:var(--surface);border:1px solid var(--border);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;flex-shrink:0"><svg width="18" height="22" viewBox="0 0 40 48" fill="none" opacity=".35"><path d="M4 4C4 1.79 5.79 0 8 0H28L40 12V44C40 46.21 38.21 48 36 48H8C5.79 48 4 46.21 4 44V4Z" fill="var(--muted)"/><path d="M28 0L40 12H32C29.79 12 28 10.21 28 8V0Z" fill="rgba(0,0,0,.15)"/></svg><span style="font-size:7.5px;font-weight:700;letter-spacing:.06em;color:var(--muted)">${_escHtml(_fext2)}</span></div>`;
      content=`${_fileInput}
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="border:1.5px solid var(--border);border-radius:10px;padding:10px 13px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:6px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
            <div style="flex:1;min-width:0">${lp?`<div style="font-size:11px;font-weight:600;color:var(--gold);text-transform:uppercase;letter-spacing:.05em">${_escHtml(lp.label)}</div>`:''}<div style="font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(utrun)}</div></div>
            <a href="${_escHtml(inv.link.url)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="flex-shrink:0">Open</a>
            <button class="btn btn-sm" onclick="_invRemoveLink()" style="flex-shrink:0;background:transparent;border:1.5px solid var(--border);color:var(--muted)" title="Remove link"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
        <div style="border:1.5px solid var(--border);border-radius:10px;overflow:hidden">
          ${_invSrc2&&_invIsImg2?`<div style="background:var(--surface);display:flex;align-items:center;justify-content:center;padding:10px;border-bottom:1px solid var(--border)"><img src="${_escHtml(_invSrc2)}" style="max-width:100%;max-height:200px;border-radius:6px;object-fit:contain" alt=""/></div>`:''}
          <div style="display:flex;align-items:center;gap:8px;padding:10px 13px">
            ${!(_invSrc2&&_invIsImg2)?_fileThumb:''}
            <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(ftrun)}</div><div style="font-size:11.5px;color:var(--muted)">${_escHtml(inv.file.sizeLabel||'')}</div></div>
            <button type="button" onclick="_invPreviewFile()" class="btn btn-outline btn-sm" style="flex-shrink:0"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Preview</button>
            <button class="btn btn-sm" onclick="_invRemoveFile()" style="flex-shrink:0;background:transparent;border:1.5px solid var(--border);color:var(--muted)" title="Remove file"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:10px 0 0;border-top:1px solid var(--border);margin-top:12px;font-size:12px;color:var(--green)">${_greenCheck} 1 link · 1 file<button onclick="_invOpenAddLink()" style="margin-left:auto;background:none;border:none;font-size:11.5px;color:var(--muted);cursor:pointer;font-family:inherit;padding:0">+ Change link</button></div>`;
    } else if(hasLink){
      const lp=_invPlatformInfo(inv.link.url);
      const ldate=inv.link.addedAt?new Date(inv.link.addedAt).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}):'';
      const utrun=inv.link.url.length>60?inv.link.url.slice(0,58)+'…':inv.link.url;
      content=`${_fileInput}
      <div style="border:1.5px solid var(--border);border-radius:12px;overflow:hidden">
        <div style="height:120px;background:var(--surface);display:flex;align-items:center;justify-content:center;border-bottom:1px solid var(--border);position:relative">
          <svg width="56" height="56" viewBox="0 0 60 60" fill="none" opacity=".2"><rect x="8" y="10" width="44" height="40" rx="4" stroke="var(--gold)" stroke-width="1.5"/><line x1="15" y1="22" x2="45" y2="22" stroke="var(--gold)" stroke-width="1"/><line x1="20" y1="28" x2="40" y2="28" stroke="var(--gold)" stroke-width="1"/><line x1="18" y1="34" x2="42" y2="34" stroke="var(--gold)" stroke-width="1"/><line x1="22" y1="40" x2="38" y2="40" stroke="var(--gold)" stroke-width="1"/></svg>
          ${lp?`<div style="position:absolute;top:10px;left:10px;display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:10.5px;font-weight:600;background:var(--cream);border:1px solid var(--border);color:var(--ink)">${_escHtml(lp.label)}</div>`:''}
          <div style="position:absolute;bottom:8px;right:10px;font-size:11px;color:var(--muted);font-style:italic">Opens externally</div>
        </div>
        <div style="padding:12px 14px">
          <div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:10px">${_escHtml(utrun)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <a href="${_escHtml(inv.link.url)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Open</a>
            <button class="btn btn-outline btn-sm" onclick="_invCopyLink(this)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy link</button>
            <button class="btn btn-outline btn-sm" onclick="_invTriggerUpload()" style="margin-left:auto"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Add file too</button>
            <button class="btn btn-sm" onclick="_invOpenAddLink()" style="background:transparent;border:1.5px solid var(--border);color:var(--muted)" title="Change link"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn btn-sm" onclick="_invRemoveLink()" style="background:transparent;border:1.5px solid var(--border);color:var(--muted)" title="Remove"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:10px 0 0;border-top:1px solid var(--border);margin-top:12px;font-size:12px;color:var(--green)">${_greenCheck} Linked${ldate?' · Added '+ldate:''}</div>`;
    } else {
      const fdate=inv.file.addedAt?new Date(inv.file.addedAt).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}):'';
      const ftrun=inv.file.name.length>40?inv.file.name.slice(0,38)+'…':inv.file.name;
      const fext=(inv.file.name.match(/\.(\w+)$/)||['','file'])[1].toUpperCase();
      const _invSrc=_mediaUrl(inv.file.mediaId||inv.file.dataUrl||'');
      const _invIsImg=/^image\//.test(inv.file.type||'') || /^data:image/.test(inv.file.dataUrl||'') || /\.(png|jpe?g|gif|webp)$/i.test(inv.file.name||'');
      const hasPreview=!!_invSrc;
      content=`${_fileInput}
      <div style="border:1.5px solid var(--border);border-radius:12px;overflow:hidden">
        <div style="${hasPreview&&_invIsImg?'min-height:120px;padding:10px':'height:120px'};background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center;border-bottom:1px solid var(--border);gap:6px">
          ${hasPreview&&_invIsImg?`<img src="${_escHtml(_invSrc)}" style="max-width:100%;max-height:200px;object-fit:contain;border-radius:6px" alt=""/>`:
          `<svg width="36" height="44" viewBox="0 0 40 48" fill="none" opacity=".3"><path d="M4 4C4 1.79 5.79 0 8 0H28L40 12V44C40 46.21 38.21 48 36 48H8C5.79 48 4 46.21 4 44V4Z" fill="var(--muted)"/><path d="M28 0L40 12H32C29.79 12 28 10.21 28 8V0Z" fill="rgba(0,0,0,.15)"/></svg>
          <span style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#fff;background:var(--muted);padding:2px 8px;border-radius:4px">${_escHtml(fext)}</span>`}
        </div>
        <div style="padding:12px 14px">
          <div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(ftrun)}</div>
          <div style="font-size:11.5px;color:var(--muted);margin-bottom:10px">${_escHtml(inv.file.sizeLabel||'')}${fdate?' · '+fdate:''}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${hasPreview?`<button type="button" onclick="_invPreviewFile()" class="btn btn-primary btn-sm"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Preview</button>`:''}
            <button class="btn btn-outline btn-sm" onclick="_invOpenAddLink()"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Add link too</button>
            <button class="btn btn-sm" onclick="_invRemoveFile()" style="margin-left:auto;background:transparent;border:1.5px solid var(--border);color:var(--muted)" title="Remove"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:10px 0 0;border-top:1px solid var(--border);margin-top:12px;font-size:12px;color:var(--green)">${_greenCheck} Uploaded · ${_escHtml(inv.file.sizeLabel||'')}${fdate?' · '+fdate:''}</div>`;
    }
    const _invTip=_escAttr('Upload your invitation file or link to a design in Canva, Google Drive, or elsewhere.');
    return `
    <div class="card" style="padding:24px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:18px">
        <div class="section-eyebrow" style="margin:0">Your Invitation</div>
        <button type="button" class="lbl-tip" aria-label="${_invTip}" title="${_invTip}" data-tip="${_invTip}" onclick="event.stopPropagation();_lblToggleTip(event,this)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></button>
      </div>
      ${content}
    </div>`;
  }

  // which === 'sendguests'
  const statCard = (n, label) => `<div style="flex:1;min-width:140px;background:var(--surface);border:.5px solid #E3D7C4;border-radius:11px;padding:14px 16px">
      <div style="font-family:'Cormorant Garamond',serif;font-size:28px;color:var(--gold-deep);line-height:1">${n}</div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:4px">${label}</div>
    </div>`;

  const canSend = hasInvite && (withEmail + withPhone) > 0;
  const sendBtn = (icon, label, channel, on) => `<button class="btn ${on?'btn-primary':'btn-outline'} btn-sm" ${on?`onclick="_invitationSend('${channel}')"`:'disabled style="opacity:.5;cursor:not-allowed"'} style="display:inline-flex;align-items:center;gap:8px">${icon}${label}</button>`;
  const mailIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>`;
  const textIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

  return `
    <div class="card" style="padding:24px">
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;margin-bottom:4px">Send to guests</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:18px">Your invitation will be delivered using the contact details on each guest's entry.</div>
      ${guests.length ? `
        <div style="display:flex;gap:14px;flex-wrap:wrap">
          ${statCard(withEmail, 'guests with an email address')}
          ${statCard(withPhone, 'guests with a mobile number')}
          ${statCard(missingBoth, 'guests missing both')}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
          ${sendBtn(mailIcon, 'Send by email', 'email', canSend && withEmail>0)}
          ${sendBtn(textIcon, 'Send by text', 'text', canSend && withPhone>0)}
        </div>
        ${!hasInvite ? `<div style="font-size:12px;color:var(--muted);margin-top:12px">Add an invitation above to enable sending.</div>` : ''}
        ${missingBoth>0 ? `<div style="font-size:12px;color:var(--muted);margin-top:8px">${missingBoth} guest${missingBoth===1?'':'s'} ${missingBoth===1?'has':'have'} no email or mobile — <button class="btn-link" style="background:none;border:none;color:var(--gold-deep);cursor:pointer;font-family:inherit;font-size:12px;padding:0;text-decoration:underline" onclick="navigate('guests')">add their details</button> to include them.</div>` : ''}
      ` : `<div style="font-size:13px;color:var(--muted)">No guests added yet — <button class="btn-link" style="background:none;border:none;color:var(--gold-deep);cursor:pointer;font-family:inherit;font-size:13px;padding:0;text-decoration:underline" onclick="navigate('guests')">add your guest list</button> first.</div>`}
    </div>`;
}

function _invitationCreate(){ _invComingSoon(); }
function _invitationUpload(){ _invTriggerUpload(); }
function _invitationSend(channel){
  if(channel==='email'){ openBulkSend('invite'); return; }
  if(channel==='text'){
    if(typeof _showInfoToast==='function') _showInfoToast('Text messages are sent per-guest from the RSVP tracker.',null,null);
    return;
  }
  // Skip anyone whose address has already bounced or been marked as spam — see the same
  // guard in _invBatchSend. Computed here too so the confirmation count and the progress
  // bar's denominator (built from this same count) match what actually gets sent.
  const allWithEmail=(STATE.guests||[]).filter(g=>(g.email||'').trim());
  const guests=allWithEmail.filter(g=>!g.emailIssue);
  const skipped=allWithEmail.length-guests.length;
  if(!guests.length){
    if(typeof _showInfoToast==='function') _showInfoToast(skipped?'Every guest with an email has a previous bounce — nothing to send.':'No guests have email addresses.',null,null);
    return;
  }
  const names=_ssCoupleNames();
  const count=guests.length;
  openConfirm2('Send invitations by email',
    `<div style="display:flex;flex-direction:column;gap:14px">
      <div style="font-size:14px;color:var(--ink)">Send your invitation to <strong>${count}</strong> guest${count===1?'':'s'} with an email address?</div>
      <div style="font-size:12.5px;color:var(--muted);line-height:1.5">Each guest receives a personalised email from <strong>invites@unionvault.app</strong> as "${_escHtml(names||'UnionVault')}" using their template message.${(STATE.invitation&&STATE.invitation.file&&STATE.invitation.file.mediaId)?' Your uploaded invitation will be attached.':''}</div>
      ${skipped?`<div style="font-size:12px;color:var(--red)">${skipped} guest${skipped===1?'':'s'} skipped — a previous email bounced or was marked as spam.</div>`:''}
      <div id="inv-batch-progress" style="display:none">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Sending… <span id="inv-batch-count">0</span> / ${count}</div>
        <div style="height:6px;border-radius:3px;background:var(--border);overflow:hidden"><div id="inv-batch-bar" style="height:100%;width:0;background:var(--gold);border-radius:3px;transition:width .3s"></div></div>
      </div>
    </div>`,
    `<button class="btn btn-outline btn-sm" onclick="_closeConfirm2Direct()">Cancel</button>
     <button class="btn btn-primary btn-sm" id="inv-batch-go" onclick="_invBatchSend()">Send all</button>`);
}
async function _invBatchSend(){
  const btn=document.getElementById('inv-batch-go'); if(btn) btn.disabled=true;
  const prog=document.getElementById('inv-batch-progress'); if(prog) prog.style.display='';
  const countEl=document.getElementById('inv-batch-count');
  const bar=document.getElementById('inv-batch-bar');
  // Skip anyone whose address has already bounced or been marked as spam (synced in by
  // _loadOnlineRsvps' email_issues merge) — resending to a known-bad address is what
  // actually drags the whole sending domain's deliverability down for everyone else.
  const allWithEmail=(STATE.guests||[]).filter(g=>(g.email||'').trim());
  const guests=allWithEmail.filter(g=>!g.emailIssue);
  const skipped=allWithEmail.length-guests.length;
  const total=guests.length; let sent=0; let failed=0;
  const asset=_ssInviteAsset();
  const kind='invite';
  await _sbEnsureFreshToken();
  for(let i=0;i<guests.length;i++){
    const g=guests[i];
    const grp={kind:'solo',members:[g]};
    const msg=_fillTemplate(_inviteTpl(kind, 'email'), grp);
    const ed=(typeof _commsDesignFor==='function'?_commsDesignFor('inv-email'):((STATE.settings&&STATE.settings.emailDesign)||{}));
    const names=_ssCoupleNames();
    const payload={ to:[(g.email||'').trim()], subject:'You\'re invited'+(names?' — '+names:''), body:msg,
      fromName:names||'UnionVault', kicker:names?names+'\'s wedding':'', title:'You\'re invited',
      replyTo:(STATE.settings&&STATE.settings.userEmail)||(_sbSession&&_sbSession.user&&_sbSession.user.email)||'',
      templateId:_emailTplId(ed.templateId), issue:_emailIssue(), guestId:g.id, logKind:'invite', toNames:[g.name||''],
      designOpts:{ accentColor:ed.accentColor||'#8a6a2c', fontFamily:ed.fontFamily||'serif', bodyFont:ed.bodyFont||'sans-serif', showLogo:ed.showLogo!==false, bgColor:ed.bgColor||'', boxColor:ed.boxColor||'', panelColor:ed.panelColor||'',
        headerImage:_emailHeaderUrl(ed.headerImage,(_sbSession&&_sbSession.user&&_sbSession.user.id)) },
      ctaLinks:_ctaLinks() };
    if(_tplHasBtn(msg,'rsvp')||_tplHasBtn(msg,'website')){ payload.htmlText=msg; payload.body=_ctaPlain(msg); }
    if(asset.file && asset.publicUrl) payload.attachment={ filename:asset.file.name||'invitation', path:asset.publicUrl };
    try{
      const r=await fetch(_SB_URL+'/functions/v1/send-guest-email',{ method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+_sbSession.access_token,'apikey':_SB_KEY},
        body:JSON.stringify(payload) });
      const data=await r.json();
      if(data.ok){
        sent++;
        const slotKey='solo:'+g.id;
        _trackerRecordSend(kind, slotKey, 'email', '__deferred__');
      } else { failed++; }
    }catch(_){ failed++; }
    if(countEl) countEl.textContent=sent+failed;
    if(bar) bar.style.width=((sent+failed)/total*100)+'%';
  }
  _closeConfirm2Direct();
  const note=sent+' invitation'+(sent===1?'':'s')+' sent by email.'+(failed?' '+failed+' failed.':'')+(skipped?' '+skipped+' skipped — email bounced previously.':'');
  if(typeof _showInfoToast==='function') _showInfoToast(note,null,null);
  if(typeof rsvpRerenderList==='function') rsvpRerenderList();
}

function _invPlatformInfo(url){
  if(!url) return null;
  const v=url.toLowerCase();
  if(v.includes('canva.com')) return {key:'canva',label:'Canva'};
  if(v.includes('drive.google')||v.includes('docs.google')||v.includes('slides.google')||v.includes('sheets.google')) return {key:'google',label:'Google Drive'};
  if(v.includes('dropbox.com')) return {key:'dropbox',label:'Dropbox'};
  if(v.match(/\.pdf($|\?)/)) return {key:'pdf',label:'PDF'};
  if(v.startsWith('http')) return {key:'link',label:'Link'};
  return null;
}
function _invComingSoon(){
  openModal('Invite Builder',
    `<div style="text-align:center;padding:8px 0 16px">
      <div style="width:52px;height:52px;border-radius:14px;background:var(--gold-lt);border:1.5px solid var(--gold-med);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.6" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      </div>
      <div style="display:inline-flex;align-items:center;gap:5px;padding:3px 11px;border-radius:20px;font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;background:var(--gold-lt);color:var(--gold);border:1px solid var(--gold-med);margin-bottom:12px">Coming soon</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:500;color:var(--ink);margin-bottom:8px">Invite Builder</div>
      <div style="font-size:13px;color:var(--muted);line-height:1.6">Design beautiful animated invitations directly in UnionVault — no external tools needed. This feature is on its way.</div>
    </div>`,
    `<button class="btn btn-primary" onclick="closeModalDirect()" style="width:100%;justify-content:center">Got it</button>`
  );
}
function _invOpenAddLink(){
  openModal('Add invitation link',
    `<div style="padding:4px 0 0">
      <div style="border:1.5px solid var(--border);border-radius:8px;overflow:hidden;display:flex;margin-bottom:14px">
        <button id="inv-tab-link" class="btn btn-sm" style="flex:1;justify-content:center;border-radius:0;border:none;background:var(--gold);color:#fff;gap:6px" onclick="_invSwitchTab('link')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Paste link</button>
        <button id="inv-tab-upload" class="btn btn-sm" style="flex:1;justify-content:center;border-radius:0;border:none;border-left:1px solid var(--border);background:var(--surface);color:var(--muted);gap:6px" onclick="_invSwitchTab('upload')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload file</button>
      </div>
      <div id="inv-tab-link-panel">
        <div style="position:relative;margin-bottom:10px">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>
          <input id="inv-link-input" type="url" placeholder="Paste your link here…" autocomplete="off" style="width:100%;padding:9px 12px 9px 36px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--ink);background:var(--surface);font-family:inherit;outline:none" oninput="_invLinkDetect(this.value)" onfocus="this.style.borderColor='var(--gold)'" onblur="this.style.borderColor='var(--border)'"/>
        </div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px">${['Canva','PDF','Google Drive','Dropbox','Any URL'].map(p=>`<span style="display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:500;color:var(--muted);background:var(--surface);border:1px solid var(--border)">${p}</span>`).join('')}</div>
        <div id="inv-platform-detected" style="display:none;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:7px;padding:7px 11px;background:var(--gold-lt);border:1px solid var(--gold-med);border-radius:8px;font-size:12px;color:var(--gold)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg><span id="inv-platform-label"></span></div>
        </div>
      </div>
      <div id="inv-tab-upload-panel" style="display:none;text-align:center;padding:12px 0">
        <div style="font-size:13px;color:var(--muted);margin-bottom:12px">Choose a file from your device</div>
        <button class="btn btn-primary btn-sm" onclick="closeModalDirect();setTimeout(_invTriggerUpload,100)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Choose file</button>
        <div style="font-size:11.5px;color:var(--muted);margin-top:8px">JPG, PNG, PDF or GIF · max 20 MB</div>
      </div>
    </div>`,
    `<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-primary btn-sm" onclick="_invSaveLink()">Save link</button>`
  );
}
function _invSwitchTab(t){
  const lp=document.getElementById('inv-tab-link-panel');
  const up=document.getElementById('inv-tab-upload-panel');
  const lt=document.getElementById('inv-tab-link');
  const ut=document.getElementById('inv-tab-upload');
  const ft=document.getElementById('modal-footer');
  if(t==='link'){
    lp.style.display=''; up.style.display='none';
    lt.style.background='var(--gold)'; lt.style.color='#fff';
    ut.style.background='var(--surface)'; ut.style.color='var(--muted)';
    if(ft) ft.style.display='';
  } else {
    lp.style.display='none'; up.style.display='';
    lt.style.background='var(--surface)'; lt.style.color='var(--muted)';
    ut.style.background='var(--gold)'; ut.style.color='#fff';
    if(ft) ft.style.display='none';
  }
}
function _invLinkDetect(val){
  const pd=document.getElementById('inv-platform-detected');
  const pl=document.getElementById('inv-platform-label');
  if(!pd||!pl) return;
  const info=_invPlatformInfo(val);
  if(info&&val.trim()){ pl.textContent=info.label+' link detected'; pd.style.display='block'; }
  else { pd.style.display='none'; }
}
function _invSaveLink(){
  const inp=document.getElementById('inv-link-input');
  if(!inp) return;
  const url=inp.value.trim();
  if(!url){ inp.focus(); return; }
  if(!STATE.invitation) STATE.invitation={};
  const info=_invPlatformInfo(url);
  STATE.invitation.link={ url, platform:info?info.key:'link', addedAt:Date.now() };
  saveToStorage(); closeModalDirect(); navigate('rsvp-mgr');
}
function _invRemoveLink(){
  if(!STATE.invitation) return;
  delete STATE.invitation.link;
  saveToStorage(); navigate('rsvp-mgr');
}
function _invTriggerUpload(){
  const inp=document.getElementById('inv-file-input');
  if(inp) inp.click();
}
function _invFileSelected(e){
  const file=e&&e.target&&e.target.files?e.target.files[0]:null;
  if(!file) return;
  if(e.target) e.target.value='';   // allow re-picking the same file
  if(file.size>20*1024*1024){ alert('That file is over 20 MB — please choose a smaller one.'); return; }
  const sizeLabel=file.size<1024*1024?Math.round(file.size/1024)+' KB':(file.size/1024/1024).toFixed(1)+' MB';
  if(!STATE.invitation) STATE.invitation={};
  // The file itself goes to the media store (IndexedDB + Supabase Storage, like Vision Board
  // photos); STATE keeps only its id, so it survives reloads and syncs across devices.
  const reader=new FileReader();
  reader.onload=async function(ev){
    let mediaId='';
    try{ mediaId=await _mediaPut(ev.target.result, file.name, file.type); }catch(err){ console.warn('Invitation store failed', err); }
    if(!mediaId){ alert('Sorry — the invitation could not be saved on this device. Please try again.'); return; }
    const oldId=STATE.invitation.file&&STATE.invitation.file.mediaId;
    STATE.invitation.file={ name:file.name, sizeLabel, type:file.type||'', addedAt:Date.now(), mediaId };
    saveToStorage();
    _cloudSave().catch(e=>console.warn('Invite cloud save failed',e));
    navigate('rsvp-mgr');
    if(oldId && oldId!==mediaId) _mediaDelete(oldId);
  };
  reader.readAsDataURL(file);
}
// Open the uploaded invitation in a new tab. Uses a blob: URL — browsers show a blank page
// for a top-level data: URL, which is why the old Preview link opened empty.
function _invPreviewFile(){
  const f=STATE.invitation&&STATE.invitation.file; if(!f) return;
  let url=_mediaUrl(f.mediaId||f.dataUrl||'');
  if(url && url.startsWith('data:')){ try{ url=URL.createObjectURL(_dataUrlToBlob(url)); }catch(_){} }
  if(!url){ alert('This invitation isn\'t available on this device yet — it may still be syncing. Try again shortly.'); return; }
  const w=window.open(url,'_blank'); if(!w) location.href=url;
}
function _invRemoveFile(){
  if(!STATE.invitation) return;
  _confirmDeleteDialog({title:'Remove invitation file',question:'Remove this uploaded invitation file?',verb:'Remove',noteVerb:'permanently removed',onConfirmJs:'_doInvRemoveFile()'});
}
function _doInvRemoveFile(){
  if(!STATE.invitation) return;
  const oldId=STATE.invitation.file&&STATE.invitation.file.mediaId;
  delete STATE.invitation.file;
  if(oldId) _mediaDelete(oldId);
  saveToStorage();
  _cloudSave().catch(e=>console.warn('Invite delete cloud save failed',e));
  navigate('rsvp-mgr');
}
function _invCopyLink(btn){
  const url=STATE.invitation&&STATE.invitation.link&&STATE.invitation.link.url;
  if(!url) return;
  navigator.clipboard.writeText(url).then(()=>{
    if(btn){ const orig=btn.innerHTML; btn.innerHTML='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Copied'; setTimeout(()=>{btn.innerHTML=orig;},1800); }
  }).catch(()=>{});
}
/* ═══════════════════════════════════════════════════════════════
   VENDOR LOOK UP  —  couple-facing vendor directory
   Mounted into the Vendors page. Opened by the "Find new vendors"
   banner (_vendorLookupOpen), closed by the back link.
   All classes are vlu- prefixed to avoid collisions with the
   34k-line app stylesheet. Reuses the app's own helpers:
   _escHtml, fmt, openConfirm2, saveToStorage, navigate.
   ═══════════════════════════════════════════════════════════════ */

let _vendorLookupOn = false;
let _vluView   = 'browse';   /* browse | profile | messages */
/* Messages is a PLACEHOLDER — there is no backend and nothing is ever sent.
   It exists so the entry points are where they'll eventually be, and it says so
   plainly rather than faking an inbox. _vluMsgVendorId is the vendor in context
   when it's opened from a profile; null when opened from the vendors toolbar. */
let _vluMsgVendorId = null;
let _vluMsgSrc = null;   /* 'dir' = VLU_VENDORS | 'saved' = STATE.vendors */
let _vluMsgPick = null;  /* index into the rail — which vendor's contact the panel shows */
let _vluCat    = 'All';
let _vluQ      = '';
let _vluSort   = 'rating';
let _vluLayout = 'grid';
let _vluProfileId = null;

// Vendor Look Up is not live yet: every entry point (Vendors card, dashboard widget) lands here.
const _VLU_COMING_SOON = false;
function _vluSoonToast(){ if(typeof _showInfoToast==='function') _showInfoToast('Vendor Look Up is coming soon.',null,null); }
function _vendorLookupOpen(){  if(_VLU_COMING_SOON){ _vluSoonToast(); return; }  _vendorLookupOn = true;  _vluView='browse'; _vluMsgVendorId=null; _vluMsgSrc=null; _vluMsgPick=null; navigate('vendors'); }
function _vendorLookupClose(){ _vendorLookupOn = false; _vluView='browse'; _vluMsgVendorId=null; _vluMsgSrc=null; _vluMsgPick=null; navigate('vendors'); }
function _vluGoMyVendors(){ _vendorLookupClose(); }

/* Messages — opened with a vendor in context, or without.
   The id may be a DIRECTORY vendor (VLU_VENDORS, from a Look Up profile) or a
   SAVED vendor (STATE.vendors, from a vendor card or list row). _vluMsgResolve
   normalises either into one shape so the shell doesn't care where it came from.
   A saved vendor added by hand has no lookupId — it must still work. */
function _vluOpenMessages(id, src){ _vluMsgVendorId = id || null; _vluMsgSrc = src || (id?'dir':null); _vluMsgPick = null; _vendorLookupOn = true; _vluView='messages'; navigate('vendors'); }
function _vluMsgResolve(){
  if(!_vluMsgVendorId) return null;
  if(_vluMsgSrc === 'saved'){
    const v = (STATE.vendors||[]).find(x=>x.id===_vluMsgVendorId);
    return v ? {name:v.business, cat:v.category, email:v.email, phone:v.phone, pingId:v.lookupId||''} : null;
  }
  const v = VLU_VENDORS.find(x=>x.id===_vluMsgVendorId);
  return v ? {name:v.name, cat:v.cat, email:v.email, phone:v.phone, pingId:v.id} : null;
}
function _vluMsgBack(){
  if(_vluMsgSrc === 'saved'){ _vendorLookupOn=false; _vluView='browse'; _vluMsgVendorId=null; _vluMsgSrc=null; _vluMsgPick=null; }
  else if(_vluMsgVendorId){ _vluView='profile'; _vluProfileId=_vluMsgVendorId; }
  else { _vendorLookupOn=false; }
  navigate('vendors');
}

/* ── Recommended vendors ─────────────────────────────────────────────────────────
   Suppliers the founders used at their own wedding. Real businesses only — no invented
   ratings, prices or reviews. The Google rating is typed in by hand with the month it was
   taken ("as of"), so it never claims to be live. Links open as "sponsored" (affiliate). */
/* This list is only the OFFLINE FALLBACK. The live list comes from the database (recommended_vendors(), see
   _vluLoadRemote below), so vendors edit their own listing in the vendor portal and nothing here needs changing. */
let VLU_VENDORS = [
  { id:'storyline', mono:'SC', name:'Storyline Ceremonies', cat:'Celebrants', catLabel:'Marriage Celebrant & MC', tag:'Preferred vendor',
    area:'Ceremony at a location of your choice. $2 per km outside a 40km radius of Brisbane\u2019s CBD.',
    rating:{ score:5.0, count:9, asOf:'2026-11' }, phone:'0475 296 057', hours:'Open daily 9:30am\u20134:30pm',
    note:'Warm from our very first conversation. Ben was our celebrant and MC \u2014 joyful, perfectly on time and incredibly organised. We can\u2019t recommend him highly enough.',
    byline:'\u2014 Liam & Mandy',
    siteUrl:'https://storylineceremonies.com.au/',
    links:{ website:true, contact:true },
    email:'ben@storylineceremonies.com.au' },
  { id:'jordanleef', mono:'JL', name:'Jordan Leef Photography', cat:'Photographers', catLabel:'Photographer', tag:'Preferred vendor',
    area:'Brisbane, Gold Coast & Sunshine Coast',
    rating:null, phone:'', hours:'',
    note:'Jordan put us completely at ease \u2014 it felt like being photographed by a close friend. Seamless guidance on the day and photos that are a true work of art. Stop hesitating, you won\u2019t regret it.',
    byline:'\u2014 Liam & Mandy',
    siteUrl:'https://www.instagram.com/jordan_leef_photography/',
    links:{ instagram:true } }
];
const VLU_CAT_TO_APP = {
  'Photographers':'Photographer',
  'Videographers':'Videographer',
  'Celebrants':'Celebrant / Officiant',
  'Hair & Makeup':'Hair & makeup artist',
  'Florists':'Florist',
  'Caterers':'Caterer',
  'Venues':'Ceremony venue',
  'Musicians/DJs':'Entertainment',
  'Stylists/Decor':'',
  'Cake':'Caterer',
  'Stationery':'',
  'Transport':'Transport / Transfers',
  'Planners':'',
  'Other':''
};
function _vluAppCat(luCat){ return VLU_CAT_TO_APP[luCat] || luCat; }

/* Outbound links go through Union Vault's click endpoint (logs the click, then forwards to the vendor),
   so referrals can be counted. The real destinations live in the vendor_links table, not here. */
const _VLU_CLICK_URL = 'https://hzafdlfprtzfxtyaebmc.supabase.co/functions/v1/vendor-click';
/* Flip to true ONLY after the vendor_links/vendor_clicks tables exist and the vendor-click function is deployed;
   until then links go straight to the vendor so nobody is sent to the wrong place. */
const _VLU_TRACKING_LIVE = true;
/* Signed-in couples get a short-lived click token so the admin can see which account clicked. It is NOT their login
   (a login token must never sit in a link) and only lets the click function note the account. Guests send nothing. */
let _vluCt = null, _vluCtBusy = false;
function _vluEnsureToken(){
  try{
    if(_vluCtBusy || (_vluCt && _vluCt.exp*1000 > Date.now()+300000)) return;
    if(typeof _sbSession==='undefined' || !_sbSession || !_sbSession.access_token) return;
    _vluCtBusy = true;
    fetch(_VLU_CLICK_URL+'?mint=1',{method:'POST',headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+_sbSession.access_token}})
      .then(r=>r.ok?r.json():null).then(d=>{ if(d && d.t) _vluCt=d; }).catch(()=>{}).then(()=>{ _vluCtBusy=false; });
  }catch(_){ _vluCtBusy=false; }
}
function _vluTrackUrl(vendorId, link){
  _vluEnsureToken();
  return _VLU_CLICK_URL + '?v=' + encodeURIComponent(vendorId) + '&l=' + encodeURIComponent(link) + ((_vluCt && _vluCt.exp*1000 > Date.now()) ? '&ct=' + encodeURIComponent(_vluCt.t) : '');
}
/* Phone and email taps cannot be redirected, so they send a tiny "ping" and then carry on as normal. */
function _vluPing(vendorId, link){
  if(!_VLU_TRACKING_LIVE) return;
  try{ const u=_vluTrackUrl(vendorId, link); if(navigator.sendBeacon) navigator.sendBeacon(u); else fetch(u,{method:'POST',keepalive:true,mode:'no-cors'}); }catch(_){}
}

/* A vendor saved to the couple's own list keeps its lookupId, so contact taps made from the vendor card
   (call, email, website) are counted exactly like taps on the Recommended vendors page. */
function _vluPreferredFor(v){ return (v && v.lookupId) ? VLU_VENDORS.find(x=>x.id===v.lookupId) : null; }
function _vluSavedPingAttr(v, link){ return _vluPreferredFor(v) ? ` onclick="_vluPing('${v.lookupId}','${link}')"` : ''; }
function _vluSavedWebHref(v, direct){
  const p=_vluPreferredFor(v);
  if(!p || !_VLU_TRACKING_LIVE) return direct;
  try{                                   /* only when the saved address is still the vendor's own site */
    const host=u=>new URL(u).host.replace(/^www\./,'');
    if(host(direct)!==host(p.siteUrl)) return direct;
  }catch(_){ return direct; }
  return _vluTrackUrl(p.id, (p.links&&p.links.website)?'website':'instagram');
}
/* Vendors saved by an earlier build were saved without rating, hours, email or the services note.
   Fill those in (blank fields only — anything the couple typed is left alone). */
function _vluEnrichSaved(){
  let changed=false;
  (STATE.vendors||[]).forEach(sv=>{
    const p=_vluPreferredFor(sv); if(!p) return;
    const set=(k,val)=>{ if(val && !String(sv[k]||'').trim()){ sv[k]=val; changed=true; } };
    set('email', p.email||''); set('hours', p.hours||'');
    if(p.rating){ set('rating', Number(p.rating.score).toFixed(1)); set('reviewCount', String(p.rating.count)); }
    if(!sv.notes || /^Recommended vendor/.test(sv.notes)){ const n=_vluSavedNotes(p); if(sv.notes!==n){ sv.notes=n; changed=true; } }
  });
  if(changed) saveToStorage();
}
function _vluSavedNotes(p){ return 'Preferred vendor.'+(p.area?' Services: '+p.area:''); }

/* ── helpers ─────────────────────────────────────────────── */
function _vluInitials(name){
  const p = String(name||'').trim().split(/\s+/).filter(Boolean);
  if(!p.length) return '–';
  if(p.length===1) return p[0].slice(0,2).toUpperCase();
  return (p[0][0]+p[p.length-1][0]).toUpperCase();
}
/* Already in the couple's real vendor list? Matched on the lookupId we stamp. */
function _vluInPlanner(v){
  return (STATE.vendors||[]).some(x => x.lookupId === v.id);
}
function _vluAlt(id){ return id.charCodeAt(1) % 2 === 1; }
/* ── live list from the database ─────────────────────────────────────────────────────────
   Only vendors you have published are returned. The last good answer is kept on this device so the page still works
   offline; if the very first load fails the built-in list above is used. */
const _VLU_CACHE_KEY = 'uv_vlu_cache_v1';
function _vluMedia(path){ return !path ? '' : /^https?:/.test(path) ? path : _SB_URL + '/storage/v1/object/public/vendor-media/' + path; }
function _vluNormalise(r){
  return { id:r.id, mono:r.mono||String(r.name||'').trim().slice(0,2).toUpperCase(), name:r.name, cat:r.cat, catLabel:r.catLabel||r.cat,
    tag:r.tag||'Preferred vendor', area:r.area||'', rating:r.rating||null, phone:r.phone||'', hours:r.hours||'', email:r.email||'',
    note:r.note||'', byline:r.byline||'', siteUrl:r.siteUrl||'', links:r.links||{},
    bio:r.bio||'', logo:_vluMedia(r.logo), photos:(r.photos||[]).map(_vluMedia), packages:r.packages||[] };
}
function _vluApplyList(arr){
  const next = arr.map(_vluNormalise), same = JSON.stringify(next) === JSON.stringify(VLU_VENDORS);
  VLU_VENDORS = next;
  if(!same && typeof _currentPage!=='undefined' && _currentPage==='vendors' && typeof navigate==='function' && !document.querySelector('.modal-overlay:not(.hidden)')) navigate('vendors');
}
async function _vluLoadRemote(){
  try{ const c = JSON.parse(localStorage.getItem(_VLU_CACHE_KEY)||'null'); if(c && Array.isArray(c.list) && Date.now()-c.at < 30*86400000) _vluApplyList(c.list); }catch(_){}
  try{
    const ctl = new AbortController(), t = setTimeout(()=>ctl.abort(), 8000);
    const r = await fetch(_SB_URL+'/rest/v1/rpc/recommended_vendors',{method:'POST',signal:ctl.signal,
      headers:{'apikey':_SB_KEY,'Authorization':'Bearer '+_SB_KEY,'Content-Type':'application/json'},body:'{}'});
    clearTimeout(t);
    if(!r.ok) return;
    const list = await r.json();
    if(!Array.isArray(list)) return;
    try{ localStorage.setItem(_VLU_CACHE_KEY, JSON.stringify({at:Date.now(), list})); }catch(_){}
    _vluApplyList(list);
  }catch(e){ console.warn('Recommended vendors: using saved list', e); }
}
setTimeout(_vluLoadRemote, 0);

function _vluFiltered(){
  _vluEnsureToken();
  return _vluCat === 'All' ? VLU_VENDORS.slice() : VLU_VENDORS.filter(v => v.cat === _vluCat);
}
function _vluRatingHtml(v){
  if(!v.rating) return '';
  const [y,m]=String(v.rating.asOf||'').split('-').map(Number);
  const when=(y&&m)?new Date(y,m-1,1).toLocaleDateString('en-AU',{month:'short',year:'numeric'}):'';
  return `<div style="font-size:12px;color:var(--ink);margin:6px 0 2px"><span style="color:#E7A400">\u2605</span> <b>${Number(v.rating.score).toFixed(1)}</b> \u00b7 ${v.rating.count} Google reviews${when?` <span style="color:var(--muted)">(${_escHtml(when)})</span>`:''}</div>`;
}

/* ── saving to the planner — always asks first ───────────── */
function _vluSaveAsk(id){
  const v = VLU_VENDORS.find(x=>x.id===id);
  if(!v) return;
  if(_vluInPlanner(v)){
    openConfirm2('Already in your planner',
      `<div style="font-size:13px;color:var(--ink);line-height:1.6"><strong>${_escHtml(v.name)}</strong> is already on your vendor list.</div>`,
      `<button class="btn btn-sm btn-outline" onclick="_confirm2CloseX()">Close</button>`);
    return;
  }
  const appCat = _vluAppCat(v.cat);
  openConfirm2('Add to your vendors?',
    `<div style="font-size:13px;color:var(--ink);line-height:1.6">Add <strong>${_escHtml(v.name)}</strong> to your vendor list?</div>
     <div style="font-size:12px;color:var(--muted);margin-top:7px;line-height:1.55">They'll appear under <em>${_escHtml(appCat||'Other')}</em> with the status <em>Possible</em>, along with their contact details. You can edit or remove them any time.</div>`,
    `<button class="btn btn-sm btn-outline" onclick="_confirm2CloseX()">Cancel</button>
     <button class="btn btn-sm btn-primary" onclick="_vluSaveConfirm('${v.id}')">Add vendor</button>`);
}
function _vluSaveConfirm(id){
  const v = VLU_VENDORS.find(x=>x.id===id);
  _closeConfirm2Direct();
  if(!v) return;
  if(!Array.isArray(STATE.vendors)) STATE.vendors=[];
  STATE.vendors.push({
    id:_vendorNewId(),
    business:v.name,
    category:_vluAppCat(v.cat),
    status:'possible',
    contact:'', phone:v.phone||'', email:v.email||'',
    address:'', website:v.siteUrl||'',
    hours:v.hours||'',
    rating:v.rating?Number(v.rating.score).toFixed(1):'', reviewCount:v.rating?String(v.rating.count):'',
    notes:_vluSavedNotes(v),
    fee:0,
    lookupId:v.id
  });
  saveToStorage();
  _vendorFlash = `${v.name} added to your vendors.`;
  _vendorLookupOn = false;   /* return to the vendor list so they can see it land */
  navigate('vendors');
}

/* ── controls ────────────────────────────────────────────── */
function _vluSetCat(c){ _vluCat=c; navigate('vendors'); }
function _vluBackToBrowse(){ _vluView='browse'; navigate('vendors'); }

/* ── browse ──────────────────────────────────────────────── */
function _vluCardHtml(v){
  const L=v.links||{}, rel='target="_blank" rel="sponsored noopener noreferrer"';
  const btn=(label,key,primary)=>L[key]?`<a class="btn ${primary?'btn-primary':'btn-outline'} btn-sm" style="font-size:11.5px;text-decoration:none" href="${_escHtml(_VLU_TRACKING_LIVE?_vluTrackUrl(v.id,key):(v.siteUrl||''))}" ${rel}>${label}</a>`:'';
  const first=L.website?'website':(L.instagram?'instagram':'');
  const saved=_vluInPlanner(v);
  return `<div class="vlu-card" style="cursor:default">
    <div class="vlu-hero${_vluAlt(v.id)?' alt':''}" style="height:96px">
      <span class="vlu-mono">${_escHtml(v.mono||_vluInitials(v.name))}</span>
      <span class="vlu-tag" style="position:absolute;top:8px;left:8px;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;background:rgba(255,255,255,.9);color:var(--gold-deep);border-radius:9px;padding:2px 8px;font-weight:600">${_escHtml(v.tag)}</span>
      <button type="button" class="vlu-save${saved?' saved':''}" title="${saved?'In your vendor list':'Save to your vendor list'}" aria-label="${saved?'In your vendor list':'Save to your vendor list'}" onclick="_vluSaveAsk('${v.id}')">${saved?'\u2665 Saved':'\u2661 Save'}</button>
    </div>
    <div class="vlu-cbody">
      <p class="vlu-name">${_escHtml(v.name)}</p>
      <p class="vlu-cat">${_escHtml(v.catLabel)}</p>
      ${v.area?`<div style="font-size:12px;color:var(--ink);margin:6px 0 2px;display:flex;align-items:flex-start;gap:5px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span><span style="color:var(--muted)">Services:</span> ${_escHtml(v.area)}</span></div>`:''}
      ${_vluRatingHtml(v)}
      ${(v.hours||v.phone)?`<div style="font-size:11.5px;color:var(--muted);line-height:1.5">${[v.hours,v.phone].filter(Boolean).map(_escHtml).join(' \u00b7 ')}</div>`:''}
      <p style="font-size:12.5px;color:var(--ink);line-height:1.5;margin:10px 0 0">\u201c${_escHtml(v.note)}\u201d<span style="display:block;font-size:11.5px;color:var(--muted);margin-top:4px">${_escHtml(v.byline)}</span></p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
        ${btn('Website','website',first==='website')}${btn('Instagram','instagram',first==='instagram')}${btn('Contact form','contact',false)}${btn('Book online','book',false)}
        ${v.phone?`<a class="btn btn-outline btn-sm" style="font-size:11.5px;text-decoration:none" href="tel:${_escHtml(v.phone.replace(/\s+/g,''))}" onclick="_vluPing('${v.id}','call')">Call</a>`:''}${v.email?`<a class="btn btn-outline btn-sm" style="font-size:11.5px;text-decoration:none" href="#" data-vm-email="${_escHtml(v.email)}" data-vm-name="${_escHtml(v.business||v.contact||'')}" data-vm-ping="${v.id}" onclick="event.preventDefault();openVendorMessageFrom(this)">Email</a>`:''}
      </div>
    </div>
  </div>`;
}
function _vluBrowseHtml(){
  const cats=[...new Set(VLU_VENDORS.map(v=>v.cat))];
  const chip=(k,l,n)=>`<button type="button" onclick="_vluSetCat('${k}')" style="padding:5px 12px;border-radius:16px;border:1px solid ${_vluCat===k?'var(--gold)':'var(--border)'};background:${_vluCat===k?'var(--gold)':'var(--surface)'};color:${_vluCat===k?'#fff':'var(--ink)'};font:inherit;font-size:12.5px;font-weight:${_vluCat===k?'600':'400'};cursor:pointer">${l}${n!=null?' '+n:''}</button>`;
  const list=_vluFiltered();
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px">${chip('All','All',VLU_VENDORS.length)}${cats.map(c=>chip(c,c,null)).join('')}</div>
    <div style="display:flex;flex-direction:column;gap:12px;max-width:560px">${list.map(_vluCardHtml).join('')}</div>
    <div style="font-size:11px;color:var(--muted);line-height:1.5;margin-top:16px;padding-top:10px;border-top:1px solid var(--border);max-width:560px"><b style="color:var(--ink)">Disclosure:</b> these are suppliers we used and recommend. If you book through our links, UnionVault may earn a commission at no extra cost to you. ${_VLU_TRACKING_LIVE?'Links open through Union Vault so we can count referrals, and we note which account used them. ':''}Google ratings are copied by hand and may be out of date.</div>`;
}

const VLU_KEY_CATS = [
  { cat:'Ceremony venue',        lu:'Venues',        icon:'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6' },
  { cat:'Photographer',          lu:'Photographers', icon:'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z|circle:12,13,4' },
  { cat:'Celebrant / Officiant', lu:'Celebrants',    icon:'M12 3v18M8 7h8M6 21h12' },
  { cat:'Caterer',               lu:'Caterers',      icon:'M3 2v7a3 3 0 0 0 6 0V2M6 9v13M18 2c-1.5 2-2 4-2 7v4h4V9c0-3-.5-5-2-7zM18 15v7' },
  { cat:'Florist',               lu:'Florists',      icon:'M12 22V12|circle:12,8,3' },
  { cat:'Hair & makeup artist',  lu:'Hair & Makeup', icon:'M4 20l6-6M14 4l6 6-10 10H4v-6z' },
  { cat:'Entertainment',         lu:'Musicians/DJs', icon:'M9 18V5l12-2v13|circle:6,18,3|circle:18,16,3' },
  { cat:'Videographer',          lu:'Videographers', icon:'M23 7l-7 5 7 5V7z|rect:1,5,15,14' }
];

function _vluIconSvg(spec){
  const parts = String(spec).split('|');
  let inner = '';
  parts.forEach(p=>{
    if(p.startsWith('circle:')){
      const [cx,cy,r]=p.slice(7).split(',');
      inner += `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
    } else if(p.startsWith('rect:')){
      const [x,y,w,h]=p.slice(5).split(',');
      inner += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`;
    } else {
      inner += `<path d="${p}"/>`;
    }
  });
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

/* Open Look Up already filtered to a category. */
function _vluOpenCat(luCat){
  if(_VLU_COMING_SOON){ _vluSoonToast(); return; }
  _vluCat = luCat || 'All';
  _vluQ = '';
  _vluView = 'browse';
  _vendorLookupOn = true;
  navigate('vendors');
}

/* Categories the widget tracks: the user's own list (Edit list), else the eight key ones. */
const _VLU_EXTRA_CATS = [
  { cat:'Reception location',    lu:'Venues',        icon:'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6' },
  { cat:'MC',                    lu:'All',           icon:'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4' },
  { cat:'Bridal shop',           lu:'All',           icon:'M6 2l3 4-3 3 6 13 6-13-3-3 3-4' },
  { cat:'Transport / Transfers', lu:'All',           icon:'M5 17h14M6 17V9l2-4h8l2 4v8|circle:8,17,2|circle:16,17,2' }
];
const _VLU_GENERIC_ICON='M3 9l1-5h16l1 5M4 9v11h16V9M9 20v-6h6v6';
let _dwVendEdit=false;
function _dwVendCatMeta(cat){
  return VLU_KEY_CATS.concat(_VLU_EXTRA_CATS).find(k=>k.cat===cat) || {cat, lu:'All', icon:_VLU_GENERIC_ICON};
}
function _dwVendCats(){
  const saved=STATE.settings&&STATE.settings.dashVendorCats;
  return Array.isArray(saved) ? saved.slice() : VLU_KEY_CATS.map(k=>k.cat);
}
function _dwVendSetCats(list){ if(!STATE.settings) STATE.settings={}; STATE.settings.dashVendorCats=list; saveToStorage(); navigate('dashboard'); }
function _dwVendToggleEdit(){ _dwVendEdit=!_dwVendEdit; navigate('dashboard'); }
function _dwVendRemove(cat){ _dwVendSetCats(_dwVendCats().filter(c=>c!==cat)); }
function _dwVendAdd(cat){ const l=_dwVendCats(); if(!l.includes(cat)) l.push(cat); _dwVendSetCats(l); }

function buildDashVendorLookupHtml(){
  const vendors = STATE.vendors || [];
  const esc=_escHtml, jq=s=>String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  /* Booked or confirmed = covered. Possible = shortlisted (not covered). Ruled out = ignored. */
  const isBooked = v => v.status==='booked' || v.status==='confirmed';
  const byCat = {};
  vendors.forEach(v=>{
    if(!v.category) return;
    if(v.status==='declined' || v.status==='passed' || v.status==='not_suitable') return;
    const b = byCat[v.category] || (byCat[v.category] = {booked:null, short:0});
    if(isBooked(v)){ if(!b.booked || (v.status==='confirmed' && b.booked.status!=='confirmed')) b.booked=v; }
    else b.short++;
  });
  const cats=_dwVendCats();
  const rows = cats.map(cat=>{
    const k=_dwVendCatMeta(cat), b=byCat[cat];
    if(_dwVendEdit){
      return `<div class="vlu-dw-row">
        <span class="vlu-dw-ic">${_vluIconSvg(k.icon)}</span>
        <span class="vlu-dw-name">${esc(cat)}</span>
        <button class="vlu-dw-rm" onclick="event.stopPropagation();_dwVendRemove('${jq(cat)}')" aria-label="Remove ${esc(cat)} from this list" title="Remove from this list">−</button>
      </div>`;
    }
    if(b && b.booked){
      const v=b.booked;
      return `<div class="vlu-dw-row">
        <span class="vlu-dw-ic">${_vluIconSvg(k.icon)}</span>
        <span class="vlu-dw-name">${esc(cat)}</span>
        <span class="vlu-dw-tag have booked" title="${v.status==='confirmed'?'Confirmed':'Booked'}">✓ ${esc(v.business||'Booked')}</span>
      </div>`;
    }
    if(b && b.short){
      return `<div class="vlu-dw-row">
        <span class="vlu-dw-ic open">${_vluIconSvg(k.icon)}</span>
        <span class="vlu-dw-name open">${esc(cat)}</span>
        <button class="vlu-dw-tag short" onclick="event.stopPropagation();navigate('vendors')" title="On your vendor list as possible — not booked yet">${b.short} shortlisted · Compare →</button>
      </div>`;
    }
    if(VLU_VENDORS.some(x=>x.cat===k.lu)){
      return `<div class="vlu-dw-row">
      <span class="vlu-dw-ic open">${_vluIconSvg(k.icon)}</span>
      <span class="vlu-dw-name open">${esc(cat)}</span>
      <button class="vlu-dw-tag need" onclick="event.stopPropagation();_vluOpenCat('${jq(k.lu)}')" title="A preferred vendor we recommend">Preferred vendor \u2192</button>
    </div>`;
    }
    return `<div class="vlu-dw-row">
      <span class="vlu-dw-ic open">${_vluIconSvg(k.icon)}</span>
      <span class="vlu-dw-name open">${esc(cat)}</span>
      <button class="vlu-dw-tag need vlu-dw-soon" disabled aria-disabled="true" onclick="event.stopPropagation()" title="Finding vendors in the directory is coming soon">Coming soon</button>
    </div>`;
  }).join('');

  const nBooked = cats.filter(c=>byCat[c]&&byCat[c].booked).length;
  const nShort  = cats.filter(c=>byCat[c]&&!byCat[c].booked&&byCat[c].short).length;
  const left = cats.length - nBooked - nShort;
  /* Edit mode: every category the user could add — built-in ones plus their own vendor categories. */
  let addHtml='';
  if(_dwVendEdit){
    const pool=[...new Set([...(typeof VENDOR_CATEGORIES!=='undefined'?VENDOR_CATEGORIES:[]), ...VLU_KEY_CATS.map(k=>k.cat), ..._VLU_EXTRA_CATS.map(k=>k.cat), ...vendors.map(v=>v.category).filter(Boolean)])]
      .filter(c=>!cats.includes(c)).sort((a,b)=>a.localeCompare(b));
    addHtml=`<div class="vlu-dw-add">
      <div class="vlu-dw-add-lbl">Add to this list</div>
      <div class="vlu-dw-add-chips">${pool.length?pool.map(c=>`<button class="vlu-dw-addchip" onclick="event.stopPropagation();_dwVendAdd('${jq(c)}')">+ ${esc(c)}</button>`).join(''):'<span class="vlu-dw-add-none">Every category is already on the list.</span>'}</div>
      <div class="vlu-dw-add-note">Removing a category only hides it here — your vendors are untouched.</div>
    </div>`;
  }

  return `
    <div class="db-widget-header" style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px">
      <span style="font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:500;color:var(--ink)">Vendors</span>
      <span style="display:inline-flex;align-items:center;gap:10px">
        ${_dwVendEdit?'':`<button class="vlu-dw-link" title="Recommended vendors" onclick="event.stopPropagation();_vendorLookupOpen()">Preferred vendors
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>`}
        <button class="vlu-dw-edit${_dwVendEdit?' on':''}" onclick="event.stopPropagation();_dwVendToggleEdit()" aria-pressed="${_dwVendEdit}">${_dwVendEdit?'Done':'Edit list'}</button>
      </span>
    </div>
    <div class="vlu-dw-sum">
      ${cats.length && nBooked===cats.length
        ? `<strong>All ${cats.length} booked.</strong> Nothing left to find.`
        : `<strong>${nBooked} of ${cats.length}</strong> booked${nShort?` · ${nShort} shortlisted`:''} · ${left} still to find`}
    </div>
    <div class="vlu-dw-list">${rows||'<div style="font-size:12.5px;color:var(--muted);padding:10px 0">No categories — tap Edit list to add some.</div>'}</div>${addHtml}`;
}

/* ── Messages — a placeholder, not an inbox ────────────────
   Nothing is sent, nothing is stored. The shell exists so the entry points sit
   where they'll eventually sit, and the empty state says plainly that messaging
   isn't live — with a working email / phone route inside it rather than behind
   a dialog. When opened from a profile the rail shows that one vendor; when
   opened from the vendors toolbar it lists the couple's saved vendors so Email
   and Call still work from there. */
/* Is this vendor reachable through the planner itself?
   NOTHING is connected today — messaging has no backend. The stub exists so the
   panel already branches in the right place: the day a real thread exists, a
   connected vendor renders one here and an unconnected vendor keeps the email /
   phone fallback. The fallback won't have to move. */
function _vluVendorConnected(){ return false; }

function _vluMsgRailHtml(list){
  if(!list.length) return `<div class="rl">Your vendors</div><div class="vlu-msgnone">No vendors saved yet. Find some in Look Up and they'll appear here.</div>`;
  return `<div class="rl">${_vluMsgSrc==='dir'?'This vendor':'Your vendors'}</div>` + list.map((v,i)=>
    `<button class="vlu-msgv${_vluMsgPick===i?' on':''}" onclick="_vluMsgPickVendor(${i})">
       <div class="vlu-msgvn">${_escHtml(v.name||'Unnamed vendor')}</div>
       ${v.cat?`<div class="vlu-msgvc">${_escHtml(v.cat)}</div>`:''}
     </button>`).join('');
}

function _vluMsgPanelHtml(v){
  const bubble = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>`;

  /* nothing picked — say why there's no inbox, don't fake one */
  if(!v) return `${bubble}
    <h4>Messaging isn't live yet</h4>
    <p>Talking to vendors inside the planner needs a live connection to them — it isn't built yet. Choose a vendor to reach them directly.</p>`;

  /* picked, and reachable through the planner — a real thread would render here.
     Unreachable today for everyone; this branch is the seam the backend plugs into. */
  if(_vluVendorConnected(v)) return `${bubble}
    <div class="vlu-msgvname">${_escHtml(v.name||'This vendor')}</div>
    <p style="margin-top:7px">No messages yet. Say hello.</p>`;

  /* picked, but not reachable through the planner — offer the real routes */
  const acts=[];
  if(v.email) acts.push(`<a class="btn btn-sm btn-primary" style="height:34px;display:inline-flex;align-items:center;gap:5px;text-decoration:none" href="#" data-vm-email="${_escHtml(v.email)}" data-vm-name="${_escHtml(v.business||v.name||v.contact||'')}" data-vm-ping="${v.pingId||''}" onclick="event.preventDefault();openVendorMessageFrom(this)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>Email</a>`);
  if(v.phone) acts.push(`<a class="btn btn-sm btn-outline" style="height:34px;display:inline-flex;align-items:center;text-decoration:none" href="tel:${_escHtml(String(v.phone).replace(/[^+\d]/g,''))}"${v.pingId?` onclick="_vluPing('${v.pingId}','call')"`:''}>Call</a>`);

  return `${bubble}
    <div class="vlu-msgvname">${_escHtml(v.name||'This vendor')}</div>
    ${v.cat?`<div class="vlu-msgvcat">${_escHtml(v.cat)}</div>`:''}
    <p style="margin-top:7px">Not connected to the planner yet — reach them directly for now.</p>
    ${acts.length
      ? `<div class="vlu-msgacts">${acts.join('')}</div>`
      : `<div class="vlu-msgnolink">No email or phone saved for this vendor. Add one on their vendor card and it'll show up here.</div>`}`;
}

function _vluMsgPickVendor(i){
  _vluMsgPick = (_vluMsgPick===i ? null : i);
  renderVendors();
}

function _vluMessagesHtml(){
  /* One list, whichever way we got here. A vendor opened from a Look Up profile is a
     rail of one; the toolbar routes list the couple's saved vendors. */
  let list;
  if(_vluMsgVendorId){
    const v = _vluMsgResolve();
    list = v ? [v] : [];
    if(list.length && _vluMsgPick===null) _vluMsgPick = 0;   /* came here for THIS vendor — preselect */
  } else {
    list = (STATE.vendors||[]).map(x=>({name:x.business, cat:x.category, email:x.email, phone:x.phone}));
  }
  const picked = (_vluMsgPick!==null && list[_vluMsgPick]) ? list[_vluMsgPick] : null;

  return `
    ${(_vluMsgVendorId && _vluMsgSrc==='dir') ? `<button class="vlu-back" onclick="_vluMsgBack()">‹ Back to profile</button>` : ''}
    <div class="vlu-msg">
      <div class="vlu-msgtop"><b>Messages</b><span class="vlu-msgsoon">Coming soon</span></div>
      <div class="vlu-msgbody">
        <div class="vlu-msgrail">${_vluMsgRailHtml(list)}</div>
        <div class="vlu-msgmain">${_vluMsgPanelHtml(picked)}</div>
      </div>
      <div class="vlu-msgcomp" aria-hidden="true">
        <div class="fake">Write a message…</div>
        <div class="snd">Send</div>
      </div>
    </div>`;
}

/* ── the page body, rendered by renderVendors() ──────────── */
function _vendorLookupHtml(){
  const isMsg = _vluView==='messages';
  return `<div class="vlu-wrap">
    <div class="vlu-top">
      <div class="vlu-title">${isMsg?'Messages':'Recommended vendors'}</div>
      <div class="vlu-sub">${isMsg?'Talk to your vendors in one place.':'Preferred vendors we’ve used ourselves and recommend.'}</div>
    </div>
    ${isMsg ? _vluMessagesHtml() : _vluBrowseHtml()}
  </div>`;
}


// ── Vendor quotes: add quotes (details + optional file) and compare them ──────
let _quoteEditId=null, _quotePendingFile=null, _quoteBackToHub=null, _quoteToBudgetId=null;
function _quoteGroupKey(q){ return (q.budgetId ? ('b:'+q.budgetId) : ('c:'+(q.category||'Other'))); }
function _quoteGroupLabel(q){
  if(q.budgetId){ const b=STATE.budget.items.find(x=>x.id===q.budgetId); if(b) return b.name||'Payment'; }
  return q.category||'Other';
}
function openQuotes(){
  closeModalDirect();
  const quotes=STATE.quotes||[];
  // Group quotes
  const groups={};
  quotes.forEach(q=>{ const k=_quoteGroupKey(q); (groups[k]=groups[k]||{label:_quoteGroupLabel(q),items:[]}).items.push(q); });
  const keys=Object.keys(groups).sort((a,b)=>groups[a].label.localeCompare(groups[b].label));
  let body;
  if(!quotes.length){
    body=`<div style="text-align:center;padding:24px 10px;color:var(--muted)">
      <div style="font-size:13px;line-height:1.6">No quotes yet. Add a vendor's quote — its price, what's included, and optionally attach the quote document — then compare them side by side.</div>
    </div>`;
  } else {
    body=keys.map(k=>{
      const g=groups[k];
      const prices=g.items.map(q=>Number(q.price)||0).filter(p=>p>0);
      const lowest=prices.length?Math.min(...prices):null;
      const cols=g.items.map(q=>{
        const p=Number(q.price)||0;
        const isBest=lowest!=null && p>0 && p===lowest && g.items.length>1;
        const att=(q.file&&(q.file.mediaId||q.file.dataUrl))?`<div style="font-size:10.5px;color:var(--green);margin-top:6px;display:flex;align-items:center;gap:4px;cursor:pointer" onclick="_quoteOpenFile('${q.id}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>${_escHtml(q.file.name||'Attachment')}</div>`:`<div style="font-size:10.5px;color:var(--muted);margin-top:6px">No file</div>`;
        return `<div style="border:.5px solid ${isBest?'var(--gold-deep)':'var(--border)'};border-radius:10px;padding:11px;background:var(--panel);${isBest?'box-shadow:0 0 0 1px var(--gold-deep) inset;':''}position:relative">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--gold-deep);font-weight:700;min-height:12px">${isBest?'Best price':''}</div>
          <div style="font-size:13px;font-weight:600;color:var(--ink);margin-top:2px;word-break:break-word">${_escHtml(q.vendor||'Vendor')}</div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--ink);margin:3px 0">${p>0?fmt(p):'—'}</div>
          ${q.notes?`<div style="font-size:11px;color:var(--muted);line-height:1.5;white-space:pre-wrap;word-break:break-word">${_escHtml(q.notes)}</div>`:''}
          ${att}
          <div style="display:flex;gap:10px;margin-top:9px;flex-wrap:wrap">
            <span onclick="_quoteToBudget('${q.id}')" style="font-size:11px;color:var(--gold-deep);font-weight:600;cursor:pointer">＋ Add to budget</span>
            <span onclick="_quoteForm('${q.id}')" style="font-size:11px;color:var(--gold-deep);cursor:pointer">Edit</span>
            <span onclick="_quoteDelete('${q.id}')" style="font-size:11px;color:var(--red);cursor:pointer">Delete</span>
          </div>
        </div>`;
      }).join('');
      return `<div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--ink)">${_escHtml(g.label)} · ${g.items.length} quote${g.items.length>1?'s':''}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px">${cols}</div>
      </div>`;
    }).join('');
  }
  const footer=`<button class="btn btn-outline btn-sm" onclick="closeModalDirect()">Close</button>
    <button class="btn btn-primary btn-sm" onclick="_quoteForm(null)" style="display:inline-flex;align-items:center;gap:5px">${_plusIcon()}Add quote</button>`;
  openModal('Compare quotes', body, footer);
}
function _quoteForm(id, prefill){
  _quoteEditId=id; _quotePendingFile=null;
  prefill=prefill||{};
  _quoteBackToHub=prefill._fromHub||null;
  const q=id?(STATE.quotes||[]).find(x=>x.id===id):null;
  const d=q||{vendor:'',category:prefill.category||'',budgetId:'',price:'',notes:'',file:null,vendorId:prefill.vendorId||''};
  const _qCatList=vendorCats();
  if(d.category && !_qCatList.includes(d.category)) _qCatList.push(d.category);
  const catOpts=['<option value="">— Category —</option>'].concat(_qCatList.map(c=>`<option value="${_escHtml(c)}"${d.category===c?' selected':''}>${_escHtml(c)}</option>`)).join('');
  const budgetItems=(STATE.budget&&STATE.budget.items)||[];
  const budgetOpts=['<option value="">— Not linked —</option>'].concat(budgetItems.map(b=>`<option value="${b.id}"${d.budgetId===b.id?' selected':''}>${_escHtml(b.name||'Payment')}</option>`)).join('');
  const existingFile=(d.file&&(d.file.mediaId||d.file.dataUrl))?`<div id="quote-file-name" style="font-size:11.5px;color:var(--green);margin-top:6px">${_escHtml(d.file.name)}</div>`:`<div id="quote-file-name" style="font-size:11.5px;color:var(--muted);margin-top:6px">No file attached</div>`;
  const vendors=(STATE.vendors||[]).slice().sort((a,b)=>(a.business||'').localeCompare(b.business||''));
  // Determine current selection: matched existing vendor, or "new" (typed name), or none.
  let selVal='';
  if(d.vendorId && vendors.some(v=>v.id===d.vendorId)) selVal=d.vendorId;
  else if(d.vendor) selVal='__new__';
  const vendorOpts=['<option value="">— Choose a vendor —</option>']
    .concat(vendors.map(v=>`<option value="${v.id}"${selVal===v.id?' selected':''}>${_escHtml(v.business||'Untitled vendor')}${v.category?` (${_escHtml(v.category)})`:''}</option>`))
    .concat([`<option value="__new__"${selVal==='__new__'?' selected':''}>＋ Add a new vendor…</option>`]).join('');
  const showNew=selVal==='__new__';
  const body=`<div style="display:flex;flex-direction:column;gap:12px">
    <div><label class="form-label">Vendor</label><select id="quote-vendor-sel" class="form-input" onchange="_quoteVendorPick()">${vendorOpts}</select>
      <div style="font-size:11px;color:var(--muted);margin-top:5px">Pick one of your saved vendors, or add a new one.</div>
    </div>
    <div id="quote-new-vendor" style="border-left:2px solid var(--gold-deep);padding-left:11px;${showNew?'':'display:none'}">
      <div style="font-size:11px;color:var(--gold-deep);font-weight:600;margin:2px 0 8px">New vendor</div>
      <div style="margin-bottom:10px"><label class="form-label">Vendor name</label><input id="quote-vendor" class="form-input" value="${_escHtml(d.vendor)}" placeholder="e.g. Golden Hour Studio"/></div>
      <div><label class="form-label">Add to my vendor list <span style="color:var(--muted);font-weight:400">(saves it for next time)</span></label>
        <select id="quote-savevendor" class="form-input"><option value="1">Yes — save as a new vendor</option><option value="0">No — just use the name here</option></select>
      </div>
    </div>
    <div class="form-row" style="gap:10px">
      <div class="form-group" style="margin:0;flex:1"><label class="form-label">Category</label><select id="quote-category" class="form-input">${catOpts}</select></div>
      <div class="form-group" style="margin:0;flex:1"><label class="form-label">Total price</label><input id="quote-price" class="form-input" type="number" min="0" step="0.01" value="${d.price||''}" placeholder="0"/></div>
    </div>
    <div><label class="form-label">Link to Payment <span style="color:var(--muted);font-weight:400">(optional — groups the quote here)</span></label><select id="quote-budget" class="form-input">${budgetOpts}</select></div>
    <div><label class="form-label">What's included / notes</label><textarea id="quote-notes" class="form-input" rows="3" style="resize:vertical" placeholder="e.g. 8 hours, 2 albums, travel included">${_escHtml(d.notes)}</textarea></div>
    <div>
      <label class="form-label">Attach quote file <span style="color:var(--muted);font-weight:400">(PDF or image, optional)</span></label>
      <input type="file" id="quote-file" accept=".pdf,image/*" onchange="_quoteFilePick(event)" style="display:none"/>
      <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('quote-file').click()" style="display:inline-flex;align-items:center;gap:6px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Choose file…</button>
      ${existingFile}
    </div>
  </div>`;
  _popupBackPending=()=>{ if(_quoteBackToHub){ _vendorOpenHub(_quoteBackToHub); } else { openQuotes(); } };
  _adoptPopupBack();
  openModal(id?'Edit quote':'Add quote', body,
    `${_popupBackBtnHtml()}<button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-primary" onclick="_quoteSave()">${id?'Save changes':'Add quote'}</button>`);
}
function _quoteVendorPick(){
  const sel=document.getElementById('quote-vendor-sel'); if(!sel) return;
  const val=sel.value;
  const nv=document.getElementById('quote-new-vendor');
  if(nv) nv.style.display = (val==='__new__') ? '' : 'none';
  // Auto-fill category from the chosen existing vendor.
  if(val && val!=='__new__'){
    const v=(STATE.vendors||[]).find(x=>x.id===val);
    const cat=document.getElementById('quote-category');
    if(v && v.category && cat){ const has=Array.from(cat.options).some(o=>o.value===v.category); if(has) cat.value=v.category; }
  }
}
function _quoteFilePick(ev){
  const file=ev.target.files&&ev.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=async e=>{
    const data = await _prepMedia(e.target.result, file.type);
    const mid  = await _mediaPut(data, file.name, file.type);
    _quotePendingFile={ name:file.name, type:file.type||'application/octet-stream', size:file.size, mediaId:mid };
    const el=document.getElementById('quote-file-name'); if(el){ el.textContent=file.name; el.style.color='var(--green)'; }
  };
  reader.readAsDataURL(file);
}
function _quoteSave(){
  const sel=document.getElementById('quote-vendor-sel');
  const selVal=sel?sel.value:'';
  let vendor='', vendorId='';
  let category=document.getElementById('quote-category')?.value||'';
  if(selVal && selVal!=='__new__'){
    const v=(STATE.vendors||[]).find(x=>x.id===selVal);
    if(!v){ alert('Please choose a vendor.'); return; }
    vendor=v.business||'Vendor'; vendorId=v.id;
  } else if(selVal==='__new__'){
    vendor=(document.getElementById('quote-vendor')?.value||'').trim();
    if(!vendor){ alert('Please enter a vendor name.'); return; }
    const save=(document.getElementById('quote-savevendor')?.value||'1')==='1';
    if(save){
      const nv={ id:_vendorNewId(), business:vendor, category:category||'', status:'possible', fee:0, fromApptId:'',
        contact:'', phone:'', email:'', address:'', website:'', notes:'', hours:'', abn:'', bsb:'', acctNumber:'', acctName:'', rating:'', reviewCount:'' };
      if(!Array.isArray(STATE.vendors)) STATE.vendors=[];
      STATE.vendors.push(nv); vendorId=nv.id;
    }
  } else {
    alert('Please choose a vendor or add a new one.'); return;
  }
  const budgetId=document.getElementById('quote-budget')?.value||'';
  const price=document.getElementById('quote-price')?.value||'';
  const notes=(document.getElementById('quote-notes')?.value||'').trim();
  if(!STATE.quotes) STATE.quotes=[];
  if(_quoteEditId){
    const q=STATE.quotes.find(x=>x.id===_quoteEditId);
    if(q){ q.vendor=vendor; q.vendorId=vendorId; q.category=category; q.budgetId=budgetId; q.price=price; q.notes=notes; if(_quotePendingFile) q.file=_quotePendingFile; }
  } else {
    STATE.quotes.push({ id:'qt'+Date.now()+Math.floor(Math.random()*1000), vendor, vendorId, category, budgetId, price, notes, file:_quotePendingFile||null, addedAt:new Date().toISOString() });
  }
  _quoteEditId=null; _quotePendingFile=null;
  saveToStorage();
  if(_currentPage==='vendors'){ const c=document.getElementById('main-content'); const a=document.getElementById('topbar-actions'); if(c&&a&&typeof renderVendors==='function') renderVendors(c,a); }
  if(_quoteBackToHub){ const hub=_quoteBackToHub; _quoteBackToHub=null; _vendorOpenHub(hub); }
  else openQuotes();
}
function _quoteDelete(id){
  const _q0=(STATE.quotes||[]).find(x=>x.id===id);
  const _label=_q0?(_q0.business||_q0.name||_q0.vendor||'quote'):'quote';
  _undoableDelete(_label, ()=>{
    STATE.quotes=(STATE.quotes||[]).filter(x=>x.id!==id);
  }, null, ()=>{
    if(_currentPage==='vendors'){ const c=document.getElementById('main-content'); const a=document.getElementById('topbar-actions'); if(c&&a&&typeof renderVendors==='function') renderVendors(c,a); }
    if(typeof openQuotes==='function' && document.getElementById('modal-overlay') && !document.getElementById('modal-overlay').classList.contains('hidden')) openQuotes();
  });
  if(_currentPage==='vendors'){ const c=document.getElementById('main-content'); const a=document.getElementById('topbar-actions'); if(c&&a&&typeof renderVendors==='function') renderVendors(c,a); }
  openQuotes();
}
function _quoteOpenFile(id){
  const q=(STATE.quotes||[]).find(x=>x.id===id);
  if(!q||!q.file) return;
  const _qu = _mediaUrl(q.file.mediaId||q.file.dataUrl); if(!_qu) return;
  const w=window.open(); if(w){ w.document.write(`<iframe src="${_qu}" style="border:0;width:100%;height:100%;position:absolute;top:0;left:0"></iframe>`); }
}
function _quoteToBudget(id){
  const q=(STATE.quotes||[]).find(x=>x.id===id); if(!q) return;
  if(!STATE.budget) STATE.budget={items:[]};
  if(!Array.isArray(STATE.budget.items)) STATE.budget.items=[];
  const price=Number(q.price)||0;
  const items=STATE.budget.items;
  const linked=q.budgetId ? items.find(b=>b.id===q.budgetId) : null;
  const itemOpts=items.length
    ? items.map(b=>`<option value="${b.id}">${_escHtml(b.name||'Payment')}</option>`).join('')
    : '';
  const subBlock=items.length
    ? `<label class="form-label" style="margin-top:10px">Under which item?</label><select id="qb-parent" class="form-input">${itemOpts}</select>`
    : `<div style="font-size:11.5px;color:var(--muted);margin-top:6px">You have no Payments yet — create one first by choosing "New Payment".</div>`;
  const body=`<div style="display:flex;flex-direction:column;gap:4px">
    ${linked?`<div style="font-size:11.5px;color:var(--gold-deep);background:rgba(156,122,60,.08);border:.5px solid var(--gold-deep);border-radius:8px;padding:8px 10px;margin-bottom:6px">Already linked to "${_escHtml(linked.name||'a Payment')}". Adding again will create a new entry.</div>`:''}
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${_escHtml(q.vendor||'Vendor')} · ${price>0?fmt(price):'no price'} — how should this be added?</div>
    <label style="display:flex;align-items:center;gap:10px;border:.5px solid var(--border);border-radius:10px;padding:11px 13px;margin-bottom:8px;cursor:pointer;background:var(--surface)">
      <input type="radio" name="qb-mode" value="new" checked onchange="_qbModeChange()" style="accent-color:var(--gold-deep)"/>
      <span><span style="display:block;font-size:13px;font-weight:600;color:var(--ink)">New Payment</span><span style="display:block;font-size:11px;color:var(--muted)">Creates "${_escHtml([q.vendor||'Vendor',q.category||''].filter(Boolean).join(' — '))}"</span></span>
    </label>
    <label style="display:flex;align-items:center;gap:10px;border:.5px solid var(--border);border-radius:10px;padding:11px 13px;cursor:pointer;background:var(--surface);${items.length?'':'opacity:.55'}">
      <input type="radio" name="qb-mode" value="sub" onchange="_qbModeChange()" ${items.length?'':'disabled'} style="accent-color:var(--gold-deep)"/>
      <span style="flex:1"><span style="display:block;font-size:13px;font-weight:600;color:var(--ink)">As a sub-item</span><span style="display:block;font-size:11px;color:var(--muted)">Nest it under an existing Payment</span></span>
    </label>
    <div id="qb-subwrap" style="display:none">${subBlock}</div>
  </div>`;
  _quoteToBudgetId=id;
  openModal('Add to budget', body,
    `<button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-primary" onclick="_qbCommit()">Add</button>`);
}
function _qbModeChange(){
  const mode=document.querySelector('input[name="qb-mode"]:checked')?.value;
  const wrap=document.getElementById('qb-subwrap');
  if(wrap) wrap.style.display = (mode==='sub') ? '' : 'none';
}
function _qbCommit(){
  const id=_quoteToBudgetId;
  const q=(STATE.quotes||[]).find(x=>x.id===id); if(!q) return;
  const price=Number(q.price)||0;
  const mode=document.querySelector('input[name="qb-mode"]:checked')?.value||'new';
  const linkVendor=item=>{ if(q.vendorId){ if(!Array.isArray(item.vendorIds)) item.vendorIds=[]; if(!item.vendorIds.includes(q.vendorId)) item.vendorIds.push(q.vendorId); } };
  if(mode==='sub'){
    const pid=document.getElementById('qb-parent')?.value;
    const parent=(STATE.budget.items||[]).find(b=>b.id===pid);
    if(!parent){ alert('Please choose a budget item to nest under.'); return; }
    if(!Array.isArray(parent.subItems)) parent.subItems=[];
    const subName=[q.vendor||'Vendor', q.category||''].filter(Boolean).join(' — ');
    parent.subItems.push({ id:'bs'+Date.now(), name:subName, amount:price, balanceDueDate:'', deposit:0, depositPaid:false, paid:false, showDeposit:false });
    parent.expanded=true;
    linkVendor(parent);
    if(!q.budgetId) q.budgetId=parent.id;
    saveToStorage();
    _quoteToBudgetDone(parent.id);
    return;
  }
  // New item
  const name=[q.vendor||'Vendor', q.category||''].filter(Boolean).join(' — ');
  const item={id:'b'+Date.now(),name,total:price,deposit:0,paid:false,dueDate:'',balanceDueDate:'',checklistId:'',note:q.notes?('From quote: '+q.notes):'From quote',expanded:true,subItems:[]};
  linkVendor(item);
  STATE.budget.items.push(item);
  q.budgetId=item.id;
  saveToStorage();
  _quoteToBudgetDone(item.id);
}
function _quoteToBudgetDone(budgetId){
  // Refresh whichever quote surface is open, then offer to jump to Budget.
  if(document.getElementById('vhub-quotes') && _vendorHubId){ _vendorHubRefresh(); }
  else { try{ openQuotes(); }catch(e){} }
  if(_currentPage==='vendors'){ const c=document.getElementById('main-content'); const a=document.getElementById('topbar-actions'); if(c&&a&&typeof renderVendors==='function') renderVendors(c,a); }
  if(confirm('Added to your budget. Go to Budget now?')){ closeModalDirect(); navigate('budget'); }
}


// ══════════════════════════════════════════════
