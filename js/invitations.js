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
        <div style="border:1.5px solid var(--border);border-radius:10px;padding:10px 13px">
          <div style="display:flex;align-items:center;gap:8px">
            ${_fileThumb}
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
          ${lp?`<div style="position:absolute;top:10px;left:10px;display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:10.5px;font-weight:600;background:var(--card);border:1px solid var(--border);color:var(--ink)">${_escHtml(lp.label)}</div>`:''}
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
        <div style="height:120px;background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center;border-bottom:1px solid var(--border);gap:6px">
          ${hasPreview&&_invIsImg?`<img src="${_escHtml(_invSrc)}" style="max-height:110px;max-width:100%;object-fit:contain" alt=""/>`:
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
    return `
    <div class="card" style="padding:24px">
      <div class="section-eyebrow" style="margin-bottom:4px">Your Invitation</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:18px">Upload your invitation file or link to a design in Canva, Google Drive, or elsewhere.</div>
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
function _invitationSend(channel){ alert('Sending by '+channel+' will be enabled soon.'); }

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

function _vendorLookupOpen(){  _vendorLookupOn = true;  _vluView='browse'; _vluMsgVendorId=null; _vluMsgSrc=null; _vluMsgPick=null; navigate('vendors'); }
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
    return v ? {name:v.business, cat:v.category, email:v.email, phone:v.phone} : null;
  }
  const v = VLU_VENDORS.find(x=>x.id===_vluMsgVendorId);
  return v ? {name:v.name, cat:v.cat, email:v.email, phone:v.phone} : null;
}
function _vluMsgBack(){
  if(_vluMsgSrc === 'saved'){ _vendorLookupOn=false; _vluView='browse'; _vluMsgVendorId=null; _vluMsgSrc=null; _vluMsgPick=null; }
  else if(_vluMsgVendorId){ _vluView='profile'; _vluProfileId=_vluMsgVendorId; }
  else { _vendorLookupOn=false; }
  navigate('vendors');
}

/* ── directory data (mock until a real backend exists — §7 of the brief) ── */
const VLU_CATS = ['Photographers','Videographers','Celebrants','Hair & Makeup','Florists','Caterers','Venues','Musicians/DJs','Stylists/Decor','Cake','Stationery','Transport','Planners','Other'];

const VLU_VENDORS = [
  { id:'v1', name:'Amber Rose Photography', cat:'Photographers', region:'Brisbane', dist:50, rating:4.9, reviews:82, from:3200, verified:true,
    tags:['Documentary','Fine-art','Natural light','Two shooters'],
    about:"Documentary-led wedding photography with a soft, timeless edit. Amber and her second shooter cover full-day weddings across South-East Queensland, capturing the quiet in-between moments as much as the big ones.",
    services:'Full-day & half-day coverage, engagement shoots, albums', covers:'SE Queensland · travels 150km', team:'2 (Amber + second shooter)',
    email:'hello@amberrose.com.au', phone:'0400 000 000',
    packages:[{n:'Half day',p:3200,d:'5 hours · single shooter · 400+ edited images · online gallery'},{n:'Full day',p:4800,d:'10 hours · two shooters · 700+ images · engagement shoot included'}],
    booked:[12,15,18,22], gallery:9, breakdown:[88,10,2,0,0],
    reviews_list:[{n:'Priya & Tom',d:'Mar 2025',r:5,t:'Amber made us feel so at ease. The photos are everything we hoped for — natural, warm, and us.'},{n:'Hayley M.',d:'Feb 2025',r:5,t:'Worth every cent. The second shooter caught moments we never would have seen.'},{n:'Dan & Will',d:'Jan 2025',r:4,t:'Beautiful work and lovely to deal with. Gallery took a little longer than expected.'}],
    refs:[{e:'Spicers Peak Lodge wedding, 2024',c:'Available on request'},{e:'Brookfield garden ceremony, 2024',c:'Available on request'}],
    policies:{Deposit:'25% to secure the date',Cancellation:'Deposit non-refundable within 90 days',Travel:'Free within 50km, then $1.10/km'} },

  { id:'v2', name:'James Lourdes', cat:'Celebrants', region:'Gold Coast', dist:80, rating:5.0, reviews:41, from:890, verified:true,
    tags:['Warm','Modern','Bilingual (EN/PT)','LGBTQ+ friendly'],
    about:"Heartfelt, modern ceremonies with no clichés. James works closely with each couple to write a ceremony that actually sounds like them — funny where it should be, moving where it counts.",
    services:'Legal ceremony, vow writing help, rehearsal', covers:'Gold Coast & Brisbane', team:'Solo',
    email:'james@lourdesceremonies.com.au', phone:'0400 000 000',
    packages:[{n:'Ceremony',p:890,d:'Full legal ceremony · custom script · PA system · rehearsal'},{n:'Elopement',p:650,d:'Intimate elopement package · up to 10 guests'}],
    booked:[11,16,19,25], gallery:6, breakdown:[95,5,0,0,0],
    reviews_list:[{n:'Mei & Jordan',d:'Apr 2025',r:5,t:'James had everyone laughing and crying. Our guests are still talking about the ceremony.'},{n:'Sofia R.',d:'Mar 2025',r:5,t:'He captured us perfectly. Could not recommend more highly.'}],
    refs:[{e:'Burleigh Heads beach ceremony, 2025',c:'Available on request'}],
    policies:{Deposit:'$200 to secure',Cancellation:'Refundable up to 60 days prior',Travel:'Included within 60km'} },

  { id:'v3', name:'Evelyn Veil Florals', cat:'Florists', region:'Brisbane', dist:35, rating:4.8, reviews:57, from:1500, verified:true,
    tags:['Garden-style','Seasonal','Locally grown','Sustainable'],
    about:"Lush, garden-gathered arrangements using seasonal Queensland blooms. Evelyn favours soft, untamed shapes over tight structure — think 'just picked from the garden' rather than florist-perfect.",
    services:'Bouquets, ceremony & reception florals, installations', covers:'Greater Brisbane', team:'3',
    email:'hello@evelynveil.com.au', phone:'0400 000 000',
    packages:[{n:'Essentials',p:1500,d:'Bridal bouquet · 4 buttonholes · 2 arrangements'},{n:'Full styling',p:4200,d:'Full ceremony arch, aisle, 10 centrepieces, bridal party florals'}],
    booked:[13,14,20], gallery:9, breakdown:[80,16,4,0,0],
    reviews_list:[{n:'Aanya & Kel',d:'Feb 2025',r:5,t:'The arch took my breath away. Exactly the wild garden look I dreamed of.'},{n:'Bec T.',d:'Jan 2025',r:4,t:'Gorgeous flowers, slightly over our quote but worth it.'}],
    refs:[{e:'Sirromet Wines reception, 2024',c:'Available on request'}],
    policies:{Deposit:'30% on booking',Cancellation:'50% refundable up to 30 days',Travel:'Delivery from $80'} },

  { id:'v4', name:'Sienna & Co', cat:'Hair & Makeup', region:'Brisbane', dist:40, rating:4.9, reviews:113, from:480, verified:true,
    tags:['Soft glam','Airbrush','On-location','Bridal party'],
    about:"A close-knit team of artists specialising in soft, long-wear bridal looks. They come to you, keep the morning calm, and make sure everyone glows in photos without looking 'done'.",
    services:'Bridal hair & makeup, bridal party, trials', covers:'Brisbane & bayside', team:'5 artists',
    email:'bookings@siennaandco.com.au', phone:'0400 000 000',
    packages:[{n:'Bride only',p:480,d:'Hair & makeup · trial included · on-location'},{n:'Bride + 4',p:1280,d:'Full bridal party · two artists · touch-up kit'}],
    booked:[10,17,21], gallery:9, breakdown:[91,8,1,0,0],
    reviews_list:[{n:'Tara L.',d:'May 2025',r:5,t:'Lasted all day and night through happy tears and dancing. Flawless.'},{n:'Nina & Ash',d:'Apr 2025',r:5,t:'They kept our whole bridal suite calm and laughing. Magic.'}],
    refs:[{e:'Howard Smith Wharves wedding, 2025',c:'Available on request'}],
    policies:{Deposit:'$150 retainer',Cancellation:'Refundable up to 45 days',Travel:'Free within 40km'} },

  { id:'v5', name:'The Long Table', cat:'Caterers', region:'Sunshine Coast', dist:95, rating:4.7, reviews:64, from:95, verified:false,
    tags:['Shared feasting','Seasonal','Vegan-friendly','Local produce'],
    about:"Generous shared-table feasting built around Sunshine Coast hinterland produce. Menus change with the season and there's always a genuinely good vegan option, not an afterthought.",
    services:'Feasting menus, canapés, grazing, staffing', covers:'Sunshine Coast & Noosa', team:'Catering team of 8+',
    email:'eat@thelongtable.com.au', phone:'0400 000 000',
    packages:[{n:'Feast (per head)',p:95,d:'Shared entrée + main + sides · min 40 guests'},{n:'Premium (per head)',p:145,d:'Canapés + 3-course feast + dessert table'}],
    booked:[14,18,24], gallery:6, breakdown:[72,22,5,1,0],
    reviews_list:[{n:'Imogen & Ray',d:'Mar 2025',r:5,t:'Our guests said it was the best food they have had at a wedding. The grazing table was a showstopper.'},{n:'Pat H.',d:'Feb 2025',r:4,t:'Delicious and generous. Service was a touch slow at peak.'}],
    refs:[{e:'Maleny hinterland wedding, 2024',c:'Available on request'}],
    policies:{Deposit:'20% on booking',Cancellation:'Sliding scale from 90 days',Travel:'Quoted per location'} },

  { id:'v6', name:'Marlowe Strings', cat:'Musicians/DJs', region:'Brisbane', dist:30, rating:4.9, reviews:38, from:750, verified:true,
    tags:['String quartet','Ceremony','Acoustic','Pop arrangements'],
    about:"A classically trained string quartet with a modern pop repertoire. They'll play your ceremony processional and then surprise the room with arrangements of songs guests actually know.",
    services:'Ceremony, canapé-hour & reception sets', covers:'Brisbane & surrounds', team:'2–4 musicians',
    email:'play@marlowestrings.com.au', phone:'0400 000 000',
    packages:[{n:'Duo',p:750,d:'Ceremony + canapé hour · violin & cello'},{n:'Quartet',p:1450,d:'Ceremony + 2 reception sets · full quartet'}],
    booked:[12,19,23], gallery:6, breakdown:[89,9,2,0,0],
    reviews_list:[{n:'Olivia & Sam',d:'Apr 2025',r:5,t:'Walking down the aisle to their arrangement of our song — I cried instantly. Perfect.'},{n:'Grace W.',d:'Mar 2025',r:5,t:'Elegant and so professional. The pop covers were a hit.'}],
    refs:[{e:'Customs House ceremony, 2025',c:'Available on request'}],
    policies:{Deposit:'25% to hold',Cancellation:'Deposit non-refundable',Travel:'Free within 40km'} },

  { id:'v7', name:'Hinterland House', cat:'Venues', region:'Gold Coast', dist:70, rating:4.8, reviews:96, from:8500, verified:true,
    tags:['Garden estate','Indoor/outdoor','Accommodation','Exclusive use'],
    about:"A private garden estate in the Gold Coast hinterland with sweeping valley views, a covered pavilion for any weather, and on-site accommodation so the celebration can run late.",
    services:'Exclusive-use venue hire, ceremony & reception sites', covers:'On-site', team:'Venue & events team',
    email:'events@hinterlandhouse.com.au', phone:'0400 000 000',
    packages:[{n:'Venue hire',p:8500,d:'Exclusive use · ceremony lawn + pavilion · 12hr access'},{n:'All-inclusive',p:24000,d:'Venue + catering + styling + coordination · up to 100 guests'}],
    booked:[11,13,20,22], gallery:9, breakdown:[83,13,3,1,0],
    reviews_list:[{n:'Charlotte & Ben',d:'May 2025',r:5,t:'The views did half the styling for us. Having everyone stay over made it feel like a weekend, not a day.'},{n:'Remy D.',d:'Apr 2025',r:4,t:'Stunning grounds. The pavilion saved us when it rained.'}],
    refs:[{e:'200+ weddings hosted since 2018',c:'Portfolio on request'}],
    policies:{Deposit:'$2,000 to secure date',Cancellation:'Tiered from 6 months prior',Travel:'N/A — on-site'} },

  { id:'v8', name:'Paper & Press', cat:'Stationery', region:'Brisbane', dist:25, rating:4.9, reviews:52, from:6, verified:false,
    tags:['Letterpress','Custom','Calligraphy','Day-of signage'],
    about:"Custom letterpress and fine stationery, from save-the-dates to day-of signage. Everything is designed from scratch to match your palette — no templates, real ink, real impression.",
    services:'Invitations, menus, place cards, signage', covers:'Australia-wide (ships)', team:'2',
    email:'studio@paperandpress.com.au', phone:'0400 000 000',
    packages:[{n:'Invitation suite (per set)',p:6,d:'Letterpress invite + RSVP + detail card · min 50'},{n:'Full day-of (from)',p:850,d:'Menus, place cards, table numbers, welcome sign'}],
    booked:[16,24], gallery:6, breakdown:[90,8,2,0,0],
    reviews_list:[{n:'Hana & Lee',d:'Mar 2025',r:5,t:'The impression on the paper made guests gasp. Set the tone before they even arrived.'},{n:'Mara K.',d:'Feb 2025',r:5,t:'Patient through three rounds of changes. Beautiful work.'}],
    refs:[{e:'Featured in local wedding press, 2024',c:'Links on request'}],
    policies:{Deposit:'50% to begin design',Cancellation:'Design fee non-refundable',Travel:'Ships nationally'} }
];

/* Map each directory category to the app's own VENDOR_CATEGORIES value, so a
   vendor saved from Look Up lands in the vendor list under a category the rest
   of the app recognises (grouping, the dashboard coverage widget, etc). */
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

/* ── helpers ─────────────────────────────────────────────── */
function _vluInitials(name){
  const p = String(name||'').trim().split(/\s+/).filter(Boolean);
  if(!p.length) return '–';
  if(p.length===1) return p[0].slice(0,2).toUpperCase();
  return (p[0][0]+p[p.length-1][0]).toUpperCase();
}
/* Is this vendor free on the couple's wedding day? Reads STATE.event.date. */
function _vluEventDay(){
  const d = (STATE.event && STATE.event.date) || '';
  if(!d) return null;
  const n = parseInt(d.slice(8,10),10);
  return isNaN(n) ? null : n;
}
function _vluEventLabel(){
  const d = (STATE.event && STATE.event.date) || '';
  return d ? fmtDate(d) : '';
}
function _vluRegion(){
  return (STATE.event && STATE.event.venue) ? STATE.event.venue : 'your area';
}
function _vluIsAvail(v){
  const day = _vluEventDay();
  if(day===null) return false;              /* no wedding date set → no badge */
  return v.booked.indexOf(day) === -1;
}
/* Already in the couple's real vendor list? Matched on the lookupId we stamp. */
function _vluInPlanner(v){
  return (STATE.vendors||[]).some(x => x.lookupId === v.id);
}
function _vluAlt(id){ return id.charCodeAt(1) % 2 === 1; }

function _vluFiltered(){
  let list = VLU_VENDORS.slice();
  if(_vluCat !== 'All') list = list.filter(v => v.cat === _vluCat);
  if(_vluQ){
    const q = _vluQ.toLowerCase();
    list = list.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.cat.toLowerCase().includes(q) ||
      v.tags.join(' ').toLowerCase().includes(q));
  }
  list.sort((a,b)=>{
    if(_vluSort==='rating')    return b.rating-a.rating || b.reviews-a.reviews;
    if(_vluSort==='priceLow')  return a.from-b.from;
    if(_vluSort==='priceHigh') return b.from-a.from;
    if(_vluSort==='dist')      return a.dist-b.dist;
    return 0;
  });
  return list;
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
    address:v.region||'', website:'',
    notes:`From Vendor Look Up · ★${v.rating} (${v.reviews} reviews) · from ${fmt(v.from)}`,
    fee:Number(v.from)||0,
    lookupId:v.id
  });
  saveToStorage();
  _vendorFlash = `${v.name} added to your vendors.`;
  _vendorLookupOn = false;   /* return to the vendor list so they can see it land */
  navigate('vendors');
}

/* ── controls ────────────────────────────────────────────── */
function _vluSetCat(c){ _vluCat=c; navigate('vendors'); }
function _vluSetSort(s){ _vluSort=s; navigate('vendors'); }
function _vluSetLayout(l){ _vluLayout=l; navigate('vendors'); }
function _vluSearch(q){
  _vluQ=q;
  const wrap=document.getElementById('vlu-results');
  if(wrap) wrap.innerHTML=_vluResultsHtml();
  const cnt=document.getElementById('vlu-count');
  if(cnt) cnt.innerHTML=_vluCountHtml();
}
function _vluOpenProfile(id){ _vluProfileId=id; _vluView='profile'; navigate('vendors'); }
function _vluBackToBrowse(){ _vluView='browse'; navigate('vendors'); }
function _vluJump(secId, el){
  const s=document.getElementById(secId);
  if(!s) return;
  document.querySelectorAll('.vlu-jtab').forEach(t=>t.classList.remove('on'));
  if(el) el.classList.add('on');
  s.scrollIntoView({behavior:'smooth', block:'start'});
}

/* ── browse ──────────────────────────────────────────────── */
function _vluCountHtml(){
  const n=_vluFiltered().length;
  return `<strong>${n}</strong> vendor${n===1?'':'s'} near ${_escHtml(_vluRegion())}`;
}
function _vluCardHtml(v){
  const avail = _vluIsAvail(v) ? `<span class="vlu-avail">Available ${_escHtml(_vluEventLabel())}</span>` : '';
  const inpl  = _vluInPlanner(v) ? `<span class="vlu-inplanner">In your planner</span>` : '';
  return `<div class="vlu-card" onclick="_vluOpenProfile('${v.id}')">
    <div class="vlu-hero${_vluAlt(v.id)?' alt':''}">
      <span class="vlu-mono">${_escHtml(_vluInitials(v.name))}</span>
      <button class="vlu-heart${_vluInPlanner(v)?' saved':''}" title="Add to your vendors" aria-label="Add to your vendors" onclick="event.stopPropagation();_vluSaveAsk('${v.id}')">${_vluInPlanner(v)?'♥':'♡'}</button>
      ${avail}${avail?'':inpl}
    </div>
    <div class="vlu-cbody">
      <p class="vlu-name">${_escHtml(v.name)}</p>
      <p class="vlu-cat">${_escHtml(v.cat)}</p>
      <div class="vlu-meta">
        <span class="vlu-stars">★ ${v.rating.toFixed(1)} <span class="vlu-rc">(${v.reviews})</span></span>
        <span class="vlu-price">${fmt(v.from)}<small>/from</small></span>
      </div>
      <div class="vlu-loc">${_escHtml(v.region)} · ${v.dist}km</div>
    </div>
  </div>`;
}
function _vluRowHtml(v){
  return `<div class="vlu-row" onclick="_vluOpenProfile('${v.id}')">
    <div class="vlu-thumb${_vluAlt(v.id)?' alt':''}"><span class="vlu-mono">${_escHtml(_vluInitials(v.name))}</span></div>
    <div class="vlu-rmain">
      <div class="vlu-rtop"><p class="vlu-name" style="font-size:16px">${_escHtml(v.name)}</p><span class="vlu-rcat">${_escHtml(v.cat)}</span></div>
      <div class="vlu-rsub">
        <span class="vlu-stars">★ ${v.rating.toFixed(1)} (${v.reviews})</span>
        <span>${_escHtml(v.region)} · ${v.dist}km</span>
        <span>from ${fmt(v.from)}</span>
      </div>
    </div>
    <div class="vlu-rright">
      ${_vluIsAvail(v)?`<span class="vlu-ravail">${_escHtml(_vluEventLabel())} ✓</span>`:''}
      <button class="vlu-heart-sm${_vluInPlanner(v)?' saved':''}" title="Add to your vendors" aria-label="Add to your vendors" onclick="event.stopPropagation();_vluSaveAsk('${v.id}')">${_vluInPlanner(v)?'♥':'♡'}</button>
    </div>
  </div>`;
}
function _vluResultsHtml(){
  const list=_vluFiltered();
  if(!list.length){
    return `<div class="vlu-empty"><div style="font-size:28px;opacity:.45">❀</div><p>No vendors match your search yet.<br>Try a different category, or clear the search.</p></div>`;
  }
  if(_vluLayout==='grid') return `<div class="vlu-grid">${list.map(_vluCardHtml).join('')}</div>`;
  return `<div class="vlu-rows">${list.map(_vluRowHtml).join('')}</div>`;
}
function _vluBrowseHtml(){
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 24px;text-align:center;gap:16px">
    <div style="width:52px;height:52px;border-radius:14px;background:var(--panel);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;margin-bottom:4px">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
    </div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:500;color:var(--ink);letter-spacing:.01em">Vendor Lookup coming soon</div>
    <div style="font-size:13px;color:var(--muted);line-height:1.6;max-width:320px">We're building a curated directory of wedding suppliers. In the meantime, use <strong style="color:var(--ink)">My Vendors</strong> to add and manage the suppliers you're already working with.</div>
    <button class="btn btn-outline" onclick="_vluGoMyVendors()" style="margin-top:4px">Go to My Vendors →</button>
  </div>`;
}

/* ── profile ─────────────────────────────────────────────── */
function _vluProfileHtml(){
  const v = VLU_VENDORS.find(x=>x.id===_vluProfileId);
  if(!v){ _vluView='browse'; return _vluBrowseHtml(); }

  let gal='';
  for(let i=0;i<Math.min(v.gallery,5);i++) gal += `<div class="vlu-gcell${i%2?' alt':''}">❀</div>`;
  if(v.gallery>5) gal += `<div class="vlu-gcell gmore">+${v.gallery-5}</div>`;

  const pkgs = v.packages.map(p=>
    `<div class="vlu-pkg"><div class="vlu-pkgh"><span class="vlu-pkgn">${_escHtml(p.n)}</span><span class="vlu-pkgp">${fmt(p.p)}</span></div><p class="vlu-pkgd">${_escHtml(p.d)}</p></div>`).join('');

  const day = _vluEventDay();
  let cal = ['M','T','W','T','F','S','S'].map(d=>`<div class="vlu-cd hdr">${d}</div>`).join('');
  for(let d=10; d<=23; d++){
    let cls = v.booked.includes(d) ? 'book' : 'open';
    if(day!==null && d===day) cls='your';
    cal += `<div class="vlu-cd ${cls}">${d}</div>`;
  }

  const total = v.breakdown.reduce((a,b)=>a+b,0)||1;
  const bars = v.breakdown.map((c,i)=>
    `<div class="vlu-rbar">${5-i}<div class="vlu-rtrack"><div class="vlu-rfill" style="width:${Math.round(c/total*100)}%"></div></div></div>`).join('');

  const revs = v.reviews_list.map(r=>
    `<div class="vlu-rvw"><div class="vlu-rvwh"><span class="vlu-rvwn">${_escHtml(r.n)}</span><span class="vlu-rvwd">${_escHtml(r.d)}</span></div>
     <div class="vlu-rvws">${'★'.repeat(r.r)}${'☆'.repeat(5-r.r)}</div>
     <p class="vlu-rvwt">${_escHtml(r.t)}</p></div>`).join('');

  const refs = v.refs.map(r=>`<div class="vlu-refitem"><strong>${_escHtml(r.e)}</strong> — <span>${_escHtml(r.c)}</span></div>`).join('');
  const pol  = Object.keys(v.policies).map(k=>
    `<div><dt>${_escHtml(k)}</dt><dd>${_escHtml(v.policies[k])}</dd></div>`).join('');

  return `
    <button class="vlu-back" onclick="_vluBackToBrowse()">‹ Back to results</button>
    <div class="vlu-phead">
      <div class="vlu-pmono">${_escHtml(_vluInitials(v.name))}</div>
      <div class="vlu-phinfo">
        <p class="vlu-pname">${_escHtml(v.name)}${v.verified?`<span class="vlu-verif">✓ Verified</span>`:''}</p>
        <p class="vlu-pcat">${_escHtml(v.cat)}</p>
        <p class="vlu-pmeta"><span class="vlu-stars">★ ${v.rating.toFixed(1)}</span> · ${v.reviews} reviews · ${_escHtml(v.region)} · ${_escHtml(v.covers)}</p>
      </div>
    </div>
    <div class="vlu-pacts">
      <button class="btn btn-sm btn-primary" style="flex:1;min-width:140px;height:38px" onclick="_vluSaveAsk('${v.id}')">${_vluInPlanner(v)?'✓ In your vendors':'＋ Add to my vendors'}</button>
      ${v.email?`<a class="btn btn-sm btn-outline" style="flex:1;min-width:140px;height:38px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none" href="mailto:${_escHtml(v.email)}">✉ Email</a>`:''}
      ${v.phone?`<a class="btn btn-sm btn-outline" style="flex:1;min-width:120px;height:38px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none" href="tel:${_escHtml(v.phone.replace(/\s/g,''))}">Call</a>`:''}
      <button class="btn btn-sm btn-outline" style="flex:1;min-width:130px;height:38px;display:inline-flex;align-items:center;justify-content:center;gap:6px" onclick="_vluOpenMessages('${v.id}','dir')" title="Message this vendor"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>Message</button>
    </div>
    <div class="vlu-jtabs">
      <button class="vlu-jtab on" onclick="_vluJump('vlu-s-port',this)">Portfolio</button>
      <button class="vlu-jtab" onclick="_vluJump('vlu-s-about',this)">About</button>
      <button class="vlu-jtab" onclick="_vluJump('vlu-s-pkg',this)">Packages</button>
      <button class="vlu-jtab" onclick="_vluJump('vlu-s-avail',this)">Availability</button>
      <button class="vlu-jtab" onclick="_vluJump('vlu-s-rev',this)">Reviews</button>
      <button class="vlu-jtab" onclick="_vluJump('vlu-s-ref',this)">References</button>
      <button class="vlu-jtab" onclick="_vluJump('vlu-s-pol',this)">Policies</button>
    </div>
    <div class="vlu-psect" id="vlu-s-port"><h3>Portfolio</h3><div class="vlu-gal">${gal}</div></div>
    <div class="vlu-psect" id="vlu-s-about"><h3>About</h3>
      <p class="vlu-about">${_escHtml(v.about)}</p>
      <div class="vlu-tagrow">${v.tags.map(t=>`<span class="vlu-tg">${_escHtml(t)}</span>`).join('')}</div>
      <dl class="vlu-deflist">
        <div><dt>Services</dt><dd>${_escHtml(v.services)}</dd></div>
        <div><dt>Areas covered</dt><dd>${_escHtml(v.covers)}</dd></div>
        <div><dt>Team size</dt><dd>${_escHtml(v.team)}</dd></div>
      </dl>
    </div>
    <div class="vlu-psect" id="vlu-s-pkg"><h3>Price list &amp; packages</h3>${pkgs}</div>
    <div class="vlu-psect" id="vlu-s-avail"><h3>Availability</h3>
      <div class="vlu-cal">${cal}</div>
      <div class="vlu-callleg">
        <span><span class="vlu-lgdot" style="background:rgba(74,124,89,.4)"></span>Open</span>
        <span><span class="vlu-lgdot" style="background:var(--border)"></span>Booked</span>
        ${day!==null?`<span><span class="vlu-lgdot" style="background:var(--gold-deep)"></span>Your date (${_escHtml(_vluEventLabel())})</span>`:''}
      </div>
    </div>
    <div class="vlu-psect" id="vlu-s-rev"><h3>Reviews</h3>
      <div class="vlu-rsum"><div class="vlu-rbig">${v.rating.toFixed(1)}<small>${v.reviews} reviews</small></div><div class="vlu-rbars">${bars}</div></div>
      ${revs}
    </div>
    <div class="vlu-psect" id="vlu-s-ref"><h3>References &amp; past work</h3>${refs}</div>
    <div class="vlu-psect" id="vlu-s-pol"><h3>FAQ &amp; policies</h3><dl class="vlu-deflist">${pol}</dl></div>`;
}

/* ── dashboard widget: category coverage ─────────────────
   Reads the couple's real vendor list and shows which key categories are
   filled and which are still open. Each open row routes into Look Up
   pre-filtered to that category. Shrinks as the wedding comes together.
   ──────────────────────────────────────────────────────── */

/* The key categories a wedding needs, in the order they usually get booked.
   Keys are the app's own VENDOR_CATEGORIES values so they match STATE.vendors;
   `lu` maps each to the directory's category label for the filter. */
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
    return `<div class="vlu-dw-row">
      <span class="vlu-dw-ic open">${_vluIconSvg(k.icon)}</span>
      <span class="vlu-dw-name open">${esc(cat)}</span>
      <button class="vlu-dw-tag need" onclick="event.stopPropagation();_vluOpenCat('${jq(k.lu)}')" title="Find a ${esc(cat.toLowerCase())} in the directory">Find →</button>
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
        ${_dwVendEdit?'':`<button class="vlu-dw-link" onclick="event.stopPropagation();_vendorLookupOpen()">Look Up
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
  if(v.email) acts.push(`<a class="btn btn-sm btn-primary" style="height:34px;display:inline-flex;align-items:center;gap:5px;text-decoration:none" href="mailto:${_escHtml(v.email)}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>Email</a>`);
  if(v.phone) acts.push(`<a class="btn btn-sm btn-outline" style="height:34px;display:inline-flex;align-items:center;text-decoration:none" href="tel:${_escHtml(String(v.phone).replace(/[^+\d]/g,''))}">Call</a>`);

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
      <div class="vlu-title">${isMsg?'Messages':'Vendor Look Up'}</div>
      <div class="vlu-sub">${isMsg?'Talk to your vendors in one place.':'Find, compare and shortlist vendors for your day.'}</div>
    </div>
    ${isMsg ? _vluMessagesHtml() : (_vluView==='profile' ? _vluProfileHtml() : _vluBrowseHtml())}
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
    : `<div style="font-size:11.5px;color:var(--muted);margin-top:6px">You have no Payments yet — create one first by choosing “New Payment”.</div>`;
  const body=`<div style="display:flex;flex-direction:column;gap:4px">
    ${linked?`<div style="font-size:11.5px;color:var(--gold-deep);background:rgba(156,122,60,.08);border:.5px solid var(--gold-deep);border-radius:8px;padding:8px 10px;margin-bottom:6px">Already linked to “${_escHtml(linked.name||'a Payment')}”. Adding again will create a new entry.</div>`:''}
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${_escHtml(q.vendor||'Vendor')} · ${price>0?fmt(price):'no price'} — how should this be added?</div>
    <label style="display:flex;align-items:center;gap:10px;border:.5px solid var(--border);border-radius:10px;padding:11px 13px;margin-bottom:8px;cursor:pointer;background:var(--surface)">
      <input type="radio" name="qb-mode" value="new" checked onchange="_qbModeChange()" style="accent-color:var(--gold-deep)"/>
      <span><span style="display:block;font-size:13px;font-weight:600;color:var(--ink)">New Payment</span><span style="display:block;font-size:11px;color:var(--muted)">Creates “${_escHtml([q.vendor||'Vendor',q.category||''].filter(Boolean).join(' — '))}”</span></span>
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
