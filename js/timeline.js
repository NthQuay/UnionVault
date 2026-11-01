// DAY-OF TIMELINE
// ══════════════════════════════════════════════
const TL_CATS = {
  prep:      { label:'Getting Ready', color:'#B08D9E', dot:'#B08D9E' },
  ceremony:  { label:'Ceremony',      color:'var(--gold-deep)', dot:'#8B7355' },
  photos:    { label:'Photos',        color:'#6B8E9E', dot:'#6B8E9E' },
  reception: { label:'Reception',     color:'#4A7C59', dot:'#4A7C59' },
  travel:    { label:'Travel',        color:'#9E8B6B', dot:'#9E8B6B' },
  other:     { label:'Other',         color:'var(--muted)', dot:'#8A8A88' }
};

// Which timeline view is showing: 'run' (run-sheet) or 'music' (DJ/band sheet).
let _tlView = 'run';
function tlSetView(v){ if(v==='music'&&typeof _uvRequirePaid==='function'&&!_uvRequirePaid('timeline')) return; _tlView = (v==='music'?'music':'run'); const c=document.getElementById('main-content'); const a=document.getElementById('topbar-actions'); if(c) renderTimeline(c, a||document.createElement('div')); }

function tlTo12h(t){
  if(!t) return '';
  const [hRaw,m]=t.split(':');
  let h=parseInt(hRaw,10);
  const ap=h>=12?'PM':'AM';
  h=h%12; if(h===0)h=12;
  return `${h}:${m} ${ap}`;
}
function tlMinutes(t){
  if(!t) return null;
  const [h,m]=t.split(':').map(Number);
  return h*60+m;
}
function tlSorted(){
  return [...STATE.timeline].sort((a,b)=>{
    const ma=tlMinutes(a.time), mb=tlMinutes(b.time);
    if(ma===null) return 1;
    if(mb===null) return -1;
    return ma-mb;
  });
}
function tlGapLabel(mins){
  if(mins===null||mins<=0) return '';
  const h=Math.floor(mins/60), m=mins%60;
  if(h&&m) return `${h}h ${m}m`;
  if(h) return `${h}h`;
  return `${m} min`;
}

// A safe href for song links (only http/https; blank otherwise so we don't render javascript: etc.)
function tlSafeLink(u){
  u=String(u||'').trim(); if(!u) return '';
  if(/^https?:\/\//i.test(u)) return u;
  if(/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(u)) return 'https://'+u; // bare domain
  return '';
}
const _TL_NOTE_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
const _TL_PLAY_SVG='<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

// Song chip shown on a run-sheet row. Shows the first song; "+ N more" when there are others.
function tlSongChipHtml(it){
  const songs=Array.isArray(it.songs)?it.songs.filter(s=>s&&(s.title||s.artist)):[];
  if(!songs.length) return '';
  const s=songs[0];
  const link=tlSafeLink(s.link);
  const title=_escHtml(s.title||'Untitled');
  const artist=s.artist?` <span class="sc-artist">· ${_escHtml(s.artist)}</span>`:'';
  const start=s.start?`<span class="sc-start">from ${_escHtml(s.start)}</span>`:'';
  const play=link?`<a class="sc-play" href="${_escHtml(link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Open link">${_TL_PLAY_SVG}</a>`:'';
  const more=songs.length>1?`<div class="song-multi">+ ${songs.length-1} more song${songs.length-1!==1?'s':''} tagged</div>`:'';
  return `<div class="song-chip"><span class="sc-note">${_TL_NOTE_SVG}</span><span class="sc-txt"><span class="sc-title">${title}</span>${artist}</span>${start}${play}</div>${more}`;
}

// Flatten every tagged song across the day into running order, carrying its moment context.
function tlAllSongs(){
  const out=[];
  tlSorted().forEach(it=>{
    (Array.isArray(it.songs)?it.songs:[]).forEach(s=>{
      if(s&&(s.title||s.artist||s.cue||s.link||s.notes||s.start)){
        out.push({ song:s, time:it.time, moment:it.title||'Untitled', cat:it.cat });
      }
    });
  });
  return out;
}

// Music view — the DJ/band hand-off sheet.
function tlRenderMusicView(){
  const all=tlAllSongs();
  if(!all.length){
    return `<div class="empty-state">
      <div class="empty-state-icon">🎵</div>
      <div class="empty-state-text">No songs tagged yet. Open a moment and add songs to build your music sheet.</div>
    </div>`;
  }
  const cards=all.map(e=>{
    const s=e.song, link=tlSafeLink(s.link);
    const linkLabel=(()=>{ if(!link) return ''; if(/spotify/i.test(link))return'Spotify'; if(/youtu/i.test(link))return'YouTube'; if(/music\.apple/i.test(link))return'Apple Music'; return'Open link'; })();
    return `<div class="music-card">
      <div class="mc-when"><div class="mc-time">${tlTo12h(e.time)||'—'}</div><div class="mc-moment">${_escHtml(e.moment)}</div></div>
      <div>
        ${s.cue?`<div class="mc-cue">${_escHtml(s.cue)}</div>`:''}
        <div class="mc-song">${_escHtml(s.title||'Untitled')}</div>
        ${s.artist?`<div class="mc-artist">${_escHtml(s.artist)}</div>`:''}
        ${(link||s.start)?`<div class="mc-row">
          ${link?`<a class="mc-link" href="${_escHtml(link)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>${linkLabel}</a>`:''}
          ${s.start?`<span class="mc-start"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>Start at ${_escHtml(s.start)}</span>`:''}
        </div>`:''}
        ${s.notes?`<div class="mc-notes">${_escHtml(s.notes)}</div>`:''}
      </div>
    </div>`;
  }).join('');
  const moments=new Set(all.map(e=>e.moment)).size;
  return `<p class="music-intro">Every tagged song across the day, in running order — hand this to your DJ or band.</p>
    ${cards}
    <div class="music-count">${all.length} song${all.length!==1?'s':''} tagged · across ${moments} moment${moments!==1?'s':''}</div>`;
}

function renderTimeline(c, actions){
  const _pubCount = (STATE.timeline||[]).filter(x=>x.pub).length;
  actions.innerHTML = `
    <button class="btn btn-outline btn-sm tl-tb-btn" onclick="printTimeline(_tlView==='music'?'music':'')" title="${_tlView==='music'?'Print the music sheet':'Print or save as PDF'}" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="flex-shrink:0"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg><span class="tl-tb-label">Print${_tlView==='music'?' music':''}</span>
    </button>
    ${_sbSession && _pubCount > 0 ? `<button class="btn btn-outline btn-sm tl-tb-btn" onclick="_shareRunSheet()" title="Share run sheet link" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="flex-shrink:0"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg><span class="tl-tb-label">Share</span></button>` : ''}
    <button class="btn btn-primary btn-sm tl-tb-btn" onclick="openAddTimelineItem()" title="Add Moment" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg><span class="tl-tb-label">Add Moment</span></button>`;

  const items = tlSorted();
  const dateLine = STATE.event.date ? fmtDate(STATE.event.date) : '';
  const venueLine = STATE.event.venue || '';

  const hasSongs = items.some(i=>Array.isArray(i.songs)&&i.songs.some(s=>s&&(s.title||s.artist)));
  // View switcher — only shown once there's at least one moment (music view needs songs to be useful).
  const switcher = items.length ? `<div style="margin-bottom:20px"><span class="tl-view-seg">
    <button class="${_tlView!=='music'?'active':''}" onclick="tlSetView('run')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>Run-sheet</button>
    <button class="${_tlView==='music'?'active':''}" onclick="tlSetView('music')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>Music</button>
  </span></div>` : '';

  let header = `<div style="color:var(--muted);font-size:14px;margin-bottom:24px">${[dateLine,venueLine].filter(Boolean).join(' &nbsp;·&nbsp; ')||'Plan the running order of your wedding day'}</div>${switcher}`;

  // Music view is a fully separate body; short-circuit here.
  if(_tlView==='music'){
    c.innerHTML = header + tlRenderMusicView();
    return;
  }

  // Category legend (run-sheet only)
  const usedCats = [...new Set(items.map(i=>i.cat||'other'))];
  let legend = '';
  if(items.length){
    legend = `<div style="display:flex;flex-wrap:wrap;gap:14px;margin-bottom:26px">
      ${usedCats.map(k=>{const cat=TL_CATS[k]||TL_CATS.other;return`<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)"><span style="width:9px;height:9px;border-radius:50%;background:${cat.dot};display:inline-block"></span>${cat.label}</span>`;}).join('')}
    </div>`;
  }

  let body;
  if(!items.length){
    body = `<div class="empty-state">
      <div class="empty-state-icon">🕐</div>
      <div class="empty-state-text">No moments yet. Add your first one to start building the day.</div>
      <button class="btn btn-primary btn-sm" style="margin-top:18px;display:inline-flex;align-items:center;gap:5px" onclick="openAddTimelineItem()">${_plusIcon()}Add Moment</button>
    </div>`;
  } else {
    let rows = '';
    items.forEach((it,idx)=>{
      const cat = TL_CATS[it.cat] || TL_CATS.other;
      const next = items[idx+1];
      let gapHtml = '';
      if(next){
        const gap = tlMinutes(next.time)!==null && tlMinutes(it.time)!==null ? tlMinutes(next.time)-tlMinutes(it.time) : null;
        const gl = tlGapLabel(gap);
        if(gl) gapHtml = `<div style="display:flex;align-items:center;gap:8px;padding:2px 0 2px 0;margin-left:92px"><span style="font-size:10.5px;color:var(--muted);font-style:italic;letter-spacing:.02em">${gl} later</span></div>`;
      }
      const meta = [it.location, it.who].filter(Boolean);
      rows += `
      <div class="tl-row" style="display:grid;grid-template-columns:64px 1fr;gap:14px;align-items:start;cursor:pointer" onclick="openEditTimelineItem('${it.id}')">
        <div style="text-align:right;padding-top:2px">
          <div style="font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap">${tlTo12h(it.time)||'—'}</div>
        </div>
        <div style="position:relative;padding-left:24px;padding-bottom:${next?'4px':'0'}">
          <span style="position:absolute;left:0;top:5px;width:13px;height:13px;border-radius:50%;background:${cat.dot};box-shadow:0 0 0 3px var(--cream),0 0 0 4px ${cat.dot}33;z-index:2"></span>
          ${next?`<span style="position:absolute;left:6px;top:18px;bottom:-22px;width:1.5px;background:var(--border)"></span>`:''}
          <div style="background:var(--cream);border:1px solid var(--border);border-radius:12px;padding:13px 15px;transition:border-color .15s,box-shadow .15s" onmouseover="this.style.borderColor='${cat.dot}';this.style.boxShadow='var(--shadow)'" onmouseout="this.style.borderColor='var(--border)';this.style.boxShadow='none'">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
              <div style="display:flex;align-items:center;gap:6px;min-width:0">
                <span style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:500;color:var(--ink);line-height:1.2">${it.title||'Untitled'}</span>
                ${it.pub?'':`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><title>Hidden from guests</title><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`}
              </div>
              <span style="flex-shrink:0;font-size:9.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${cat.color};background:${cat.dot}1A;padding:3px 8px;border-radius:20px;white-space:nowrap">${cat.label}</span>
            </div>
            ${meta.length?`<div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:6px;font-size:12.5px;color:var(--muted)">
              ${it.location?`<span style="display:inline-flex;align-items:center;gap:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${it.location}</span>`:''}
              ${it.who?`<span style="display:inline-flex;align-items:center;gap:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${it.who}</span>`:''}
            </div>`:''}
            ${(()=>{ const lv=it.vendorId&&(STATE.vendors||[]).find(x=>x.id===it.vendorId); if(!lv) return ''; const sm=_vendorStatusMeta(lv.status); return `<div style="margin-top:7px"><button type="button" onclick="event.stopPropagation();_goToVendor('${lv.id}')" title="${_escHtml(lv.business||'Vendor')}" style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;border-radius:7px;padding:2px 8px;background:${sm.bg};color:${sm.fg};border:.5px solid ${sm.fg};cursor:pointer;max-width:100%"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M2 5h20v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M4 11v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9"/><path d="M9 21v-6h6v6"/></svg><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escHtml(lv.business||'Vendor')}</span></button></div>`; })()}
            ${it.notes?`<div style="margin-top:8px;font-size:13px;color:var(--muted);line-height:1.45">${it.notes.replace(/</g,'&lt;')}</div>`:''}
            ${tlSongChipHtml(it)}
          </div>
        </div>
      </div>
      ${gapHtml}`;
    });

    // Summary footer
    const first = items.find(i=>tlMinutes(i.time)!==null);
    const lastWithTime = [...items].reverse().find(i=>tlMinutes(i.time)!==null);
    let span = '';
    if(first && lastWithTime && first!==lastWithTime){
      const total = tlMinutes(lastWithTime.time)-tlMinutes(first.time);
      span = `Spans ${tlGapLabel(total)} · ${tlTo12h(first.time)} – ${tlTo12h(lastWithTime.time)}`;
    }

    body = `<div style="display:flex;flex-direction:column;gap:0;max-width:620px">${rows}</div>
      ${span?`<div style="max-width:620px;margin-top:22px;padding-top:16px;border-top:1px solid var(--border);font-size:12.5px;color:var(--muted);text-align:center">${span} · ${items.length} moment${items.length!==1?'s':''}</div>`:''}`;
  }

  c.innerHTML = header + legend + body;
}

function tlCatOptions(sel){
  return Object.entries(TL_CATS).map(([k,v])=>`<option value="${k}" ${k===sel?'selected':''}>${v.label}</option>`).join('');
}

function timelineFormBody(it){
  it = it || { time:'', title:'', location:'', who:'', notes:'', cat:'reception' };
  return `
  <div style="display:flex;flex-direction:column;gap:14px">
    <div class="form-row">
      <div class="form-group"><label class="form-label">Time</label><input class="form-input" type="time" id="tl-time" value="${it.time||''}"/></div>
      <div class="form-group"><label class="form-label">Category</label>
        <div style="position:relative">
          <select class="form-input" id="tl-cat" style="appearance:none;-webkit-appearance:none;padding-right:32px">${tlCatOptions(it.cat||'reception')}</select>
          
        </div>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Moment</label><input class="form-input" id="tl-title" placeholder="e.g. First Dance" value="${(it.title||'').replace(/"/g,'&quot;')}"/></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Location</label><input class="form-input" id="tl-loc" placeholder="e.g. Ballroom" value="${(it.location||'').replace(/"/g,'&quot;')}"/></div>
      <div class="form-group"><label class="form-label">Who / Vendor</label><input class="form-input" id="tl-who" placeholder="e.g. Photographer" value="${(it.who||'').replace(/"/g,'&quot;')}"/></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" id="tl-notes" rows="2" placeholder="Optional details…" style="resize:vertical">${(it.notes||'').replace(/</g,'&lt;')}</textarea></div>
    <div class="form-group"><label class="form-label">Link a vendor</label>
      <div style="position:relative">
        <select class="form-input" id="tl-vendor" style="appearance:none;-webkit-appearance:none;padding-right:32px">
          <option value="">— None —</option>
          ${(STATE.vendors||[]).slice().sort((a,b)=>String(a.business||'').localeCompare(String(b.business||''))).map(v=>`<option value="${v.id}" ${it.vendorId===v.id?'selected':''}>${_escHtml(v.business||'Untitled vendor')}${v.category?' · '+_escHtml(v.category):''}</option>`).join('')}
        </select>
        
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Songs for this moment</label>
      <div id="tl-song-list">${(Array.isArray(it.songs)?it.songs:[]).map((s,i)=>tlSongBlockHtml(s,i+1)).join('')}</div>
      <button type="button" class="add-song-btn" onclick="tlAddSongBlock()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>Add ${(Array.isArray(it.songs)&&it.songs.length)?'another ':''}song</button>
    </div>
    <label class="tl-pub-row" for="tl-pub">
      <span>
        <span class="tl-pub-title">Guests can see this</span>
        <span class="tl-pub-sub">Shows on your wedding website schedule</span>
      </span>
      <span class="toggle-switch"><input type="checkbox" id="tl-pub" ${it.pub?'checked':''}/><span class="toggle-track"></span></span>
    </label>
  </div>`;
}

// One editable song block. `i` is only used for the visible "Song N" label (recomputed on add/remove).
function tlSongBlockHtml(s, i){
  s = s || {};
  const v = x => String(x||'').replace(/"/g,'&quot;');
  return `<div class="song-block" data-song-block>
    <div class="song-block-head">
      <span class="song-block-title"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span class="song-block-num">Song${i?' '+i:''}</span></span>
      <button type="button" class="song-rm" title="Remove song" onclick="tlRemoveSongBlock(this)">✕</button>
    </div>
    <div class="fr2" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div><label class="form-label">Title</label><input class="form-input tl-song-title" placeholder="e.g. At Last" value="${v(s.title)}"/></div>
      <div><label class="form-label">Artist</label><input class="form-input tl-song-artist" placeholder="e.g. Etta James" value="${v(s.artist)}"/></div>
    </div>
    <div class="fr2" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div><label class="form-label">Cue / when</label><input class="form-input tl-song-cue" placeholder="e.g. Processional" value="${v(s.cue)}"/></div>
      <div><label class="form-label">Start at (m:ss)</label><input class="form-input tl-song-start" placeholder="optional" value="${v(s.start)}"/></div>
    </div>
    <div style="margin-bottom:12px"><label class="form-label">Link (Spotify / YouTube)</label><input class="form-input tl-song-link" placeholder="optional" value="${v(s.link)}"/></div>
    <div><label class="form-label">Notes for DJ / band</label><input class="form-input tl-song-notes" placeholder="optional" value="${v(s.notes)}"/></div>
  </div>`;
}
function tlRenumberSongs(){
  const list=document.getElementById('tl-song-list'); if(!list) return;
  list.querySelectorAll('[data-song-block] .song-block-num').forEach((el,i)=>{ el.textContent='Song '+(i+1); });
  const btn=list.parentElement.querySelector('.add-song-btn');
  if(btn){ const has=list.querySelector('[data-song-block]'); btn.lastChild.textContent = has?'Add another song':'Add song'; }
}
function tlAddSongBlock(){
  if(typeof _uvRequirePaid==='function'&&!_uvRequirePaid('timeline')) return;
  const list=document.getElementById('tl-song-list'); if(!list) return;
  const tmp=document.createElement('div'); tmp.innerHTML=tlSongBlockHtml({}, 0);
  list.appendChild(tmp.firstElementChild); tlRenumberSongs();
}
function tlRemoveSongBlock(btn){
  const block=btn.closest('[data-song-block]'); if(block){ block.remove(); tlRenumberSongs(); }
}
function tlCollectSongs(){
  const out=[];
  document.querySelectorAll('#tl-song-list [data-song-block]').forEach(b=>{
    const g=cl=>{ const el=b.querySelector('.'+cl); return el?el.value.trim():''; };
    const title=g('tl-song-title'), artist=g('tl-song-artist'), cue=g('tl-song-cue'),
          start=g('tl-song-start'), link=g('tl-song-link'), notes=g('tl-song-notes');
    if(title||artist||cue||start||link||notes){ out.push({title,artist,cue,start,link,notes}); }
  });
  return out;
}

function openAddTimelineItem(){
  openModal('Add Moment', timelineFormBody(),
    `<button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-primary" onclick="saveTimelineItem()">Add Moment</button>`);
}
function openEditTimelineItem(id){
  const it = STATE.timeline.find(x=>x.id===id); if(!it) return;
  openModal('Edit Moment', timelineFormBody(it),
    `<button class="btn btn-danger" onclick="confirmDeleteTimelineItem('${id}')" style="margin-right:auto">Delete</button>
     <button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
     <button class="btn btn-primary" onclick="saveTimelineItem('${id}')">Save</button>`);
}
function saveTimelineItem(editId){
  const time=document.getElementById('tl-time').value;
  const title=document.getElementById('tl-title').value.trim();
  const cat=document.getElementById('tl-cat').value;
  const location=document.getElementById('tl-loc').value.trim();
  const who=document.getElementById('tl-who').value.trim();
  const notes=document.getElementById('tl-notes').value.trim();
  const vendorId=(document.getElementById('tl-vendor')||{}).value||'';
  const songs=tlCollectSongs();
  // Guest visibility. Defaults to FALSE for new moments: the timeline carries vendor
  // load-ins and supplier notes, so a moment that is public by accident is a silent
  // leak, while a moment that is private by accident is visibly missing from the site.
  // The safe default is the one whose mistake you can see.
  const pub=!!(document.getElementById('tl-pub')||{}).checked;
  if(!title && !time){ return; }
  if(editId){
    const it=STATE.timeline.find(x=>x.id===editId);
    if(it){ Object.assign(it,{time,title,cat,location,who,notes,vendorId,songs,pub}); }
  } else {
    STATE.timeline.push({ id:uid(), time, title, cat, location, who, notes, vendorId, songs, pub });
  }
  saveToStorage(); closeModalDirect(); navigate('timeline');
}
function deleteTimelineItem(id){
  const _t0=STATE.timeline.find(x=>x.id===id);
  const _label=_t0?(_t0.title||_t0.time||'moment'):'moment';
  closeModalDirect();
  _undoableDelete(_label, ()=>{
    STATE.timeline = STATE.timeline.filter(x=>x.id!==id);
  }, 'timeline');
}
function confirmDeleteTimelineItem(id){
  const it=STATE.timeline.find(x=>x.id===id);
  _confirmDeleteDialog({title:'Delete Moment', question:'Delete this moment?', name:it?(it.title||it.time||''):'', verb:'Delete', onConfirmJs:`deleteTimelineItem('${id}')`});
}

// ── Run sheet sharing ─────────────────────────────────────────────────────────
// Builds the public ?runsheet= URL and shows a share sheet modal.
function _shareRunSheet(){
  if(!_sbSession) return;
  const uid = _sbSession.user.id;
  const url = window.location.origin + window.location.pathname + '?runsheet=' + encodeURIComponent(uid);
  const pubItems = (STATE.timeline||[]).filter(x=>x.pub);
  const existing = document.getElementById('_prs-share-overlay');
  if(existing) existing.remove();

  const ov = document.createElement('div');
  ov.id = '_prs-share-overlay';
  ov.className = 'prs-overlay';
  ov.innerHTML = `
    <div class="prs-panel" role="dialog" aria-modal="true" aria-label="Share run sheet">
      <div class="prs-head">
        <button class="prs-close" onclick="document.getElementById('_prs-share-overlay').remove()" aria-label="Close">×</button>
        <div class="prs-names" style="font-size:18px">Share your run sheet</div>
        <div class="prs-sub">${pubItems.length} moment${pubItems.length!==1?'s':''} marked as visible · anyone with the link can view</div>
      </div>
      <div style="padding:18px 22px">
        <div style="background:var(--soft,var(--cream));border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:14px">
          <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Link</div>
          <div style="font-size:13px;color:var(--gold-deep);word-break:break-all;line-height:1.5" id="_prs-url-display">${_escHtml(url)}</div>
        </div>
        ${pubItems.length === 0 ? `<div style="background:rgba(180,90,60,.08);border:.5px solid rgba(180,90,60,.3);border-radius:9px;padding:11px 14px;font-size:13px;color:var(--muted);margin-bottom:14px">⚠ No moments are marked visible yet. Edit each moment you want to share and turn on <strong>"Guests can see this"</strong>.</div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="prs-copy-btn" id="_prs-copy-btn" onclick="_prsDoCopy('${_escHtml(url)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy link
          </button>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('_prs-share-overlay').remove()" style="flex:1;min-width:80px">Done</button>
        </div>
        <div style="margin-top:14px;font-size:12px;color:var(--muted);line-height:1.6">
          The link shows only moments with <strong>"Guests can see this"</strong> turned on. Private moments (vendor load-ins, photographer schedule etc.) stay hidden.
        </div>
      </div>
    </div>`;
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  document.body.appendChild(ov);
}

function _prsDoCopy(url, btn){
  const el = btn || document.getElementById('_prs-copy-btn');
  const doIt = async ()=>{
    try{ await navigator.clipboard.writeText(url); }
    catch(e){ const ta=document.createElement('textarea'); ta.value=url; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.focus(); ta.select(); try{document.execCommand('copy');}catch(_){} document.body.removeChild(ta); }
    if(el){ const orig=el.innerHTML; el.innerHTML='✓ Copied!'; el.style.background='rgba(29,158,117,.15)'; el.style.borderColor='var(--green,#1D9E75)'; el.style.color='var(--green,#1D9E75)'; setTimeout(()=>{ el.innerHTML=orig; el.style.background=''; el.style.borderColor=''; el.style.color=''; },2000); }
  };
  doIt();
}

// ── Public run sheet page ─────────────────────────────────────────────────────
// Called at boot when ?invite=<uid>.<mediaId> is detected (the link added to invite
// messages). Shows the file straight from the public photos bucket — no planner data
// is read, so nothing but the invitation itself is exposed.
function _showPublicInvite(param, isPdf){
  const m=String(param||'').match(/^([0-9a-f-]{36})\.([A-Za-z0-9_-]{1,64})$/i);
  document.body.style.background='#FBF8F3';
  const shell=(inner)=>`<div style="min-height:100vh;box-sizing:border-box;padding:28px 16px 40px;display:flex;flex-direction:column;align-items:center;gap:18px;font-family:'Lato','Inter',sans-serif;color:#2C2222;background:#FBF8F3">${inner}</div>`;
  if(!m){
    document.body.innerHTML=shell(`<div style="margin-top:20vh;font-family:'Cormorant Garamond',serif;font-size:24px">This invitation link isn't valid.</div>`);
    document.body.style.visibility='visible'; return;
  }
  const uid=m[1], id=m[2];
  const src=`${_SB_URL}/storage/v1/object/public/${_SB_BUCKET}/${uid}/${id}`;
  const rsvp=window.location.origin+window.location.pathname+'?rsvp='+encodeURIComponent(uid);
  const btn='display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 22px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none';
  const view = isPdf
    ? `<iframe src="${src}" title="Invitation" style="width:100%;max-width:720px;height:75vh;border:1px solid rgba(0,0,0,.1);border-radius:12px;background:#fff"></iframe>`
    : `<img src="${src}" alt="Wedding invitation" style="max-width:100%;width:auto;max-height:80vh;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.12)" onerror="this.replaceWith(Object.assign(document.createElement('div'),{textContent:'This invitation is no longer available.',style:'margin-top:10vh;font-size:15px;color:#6E6259'}))"/>`;
  document.body.innerHTML=shell(`
    <div style="font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600">You're invited</div>
    ${view}
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
      <a href="${rsvp}" style="${btn};background:#BF9B58;color:#1f1a14">RSVP</a>
      <a href="${src}" target="_blank" rel="noopener" style="${btn};border:1px solid rgba(0,0,0,.15);color:#2C2222;background:#fff">Open full size</a>
    </div>`);
  document.title="You're invited";
  document.body.style.visibility='visible';
}
// Called at boot when ?runsheet=<couple_id> is detected.
// Fetches the couple's cloud-saved timeline (pub moments only) from Supabase and renders a clean read-only page.
async function _showPublicRunSheet(coupleId){
  document.body.style.visibility='hidden';
  // Clear the default app background so our page can paint
  document.body.style.background='var(--cream,#FBF8F3)';

  let partner1='', partner2='', date='', venue='', timeline=[];
  try{
    // Fetch couple's saved state from Supabase cloud_saves table
    const r = await fetch(`${_SB_URL}/rest/v1/cloud_saves?couple_id=eq.${encodeURIComponent(coupleId)}&order=saved_at.desc&limit=1`, {
      headers:{ 'apikey':_SB_KEY, 'Authorization':'Bearer '+_SB_KEY }
    });
    if(r.ok){
      const rows = await r.json();
      if(rows && rows.length){
        const data = rows[0].data || {};
        const ev = data.event || {};
        partner1 = ev.partner1||''; partner2 = ev.partner2||'';
        date = ev.date||''; venue = ev.venue||'';
        timeline = (data.timeline||[]).filter(x=>x&&x.pub);
      }
    }
  } catch(e){ /* show empty state */ }

  // Sort by time
  timeline.sort((a,b)=>{
    const ma=tlMinutes(a.time), mb=tlMinutes(b.time);
    if(ma===null) return 1; if(mb===null) return -1; return ma-mb;
  });

  const names = (partner1||partner2) ? `${_escHtml(partner1)}${partner1&&partner2?' & ':''}${_escHtml(partner2)}` : 'Our Wedding';
  const dateLine = date ? (()=>{ try{ const d=new Date(date+'T12:00:00'); return d.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }catch(e){return date;} })() : '';
  const subLine = [dateLine, venue ? _escHtml(venue) : ''].filter(Boolean).join(' &nbsp;·&nbsp; ');

  // Group by category
  const catOrder = ['prep','ceremony','photos','reception','travel','other'];
  const groups = {};
  timeline.forEach(it=>{ const k=it.cat||'other'; if(!groups[k]) groups[k]=[]; groups[k].push(it); });

  let bodyHtml = '';
  if(!timeline.length){
    bodyHtml = `<div class="prs-empty">No schedule shared yet — check back closer to the date.</div>`;
  } else {
    catOrder.forEach(k=>{
      if(!groups[k]||!groups[k].length) return;
      const cat = TL_CATS[k]||TL_CATS.other;
      bodyHtml += `<div class="prs-sect">
        <div class="prs-sect-hd"><span class="prs-sect-dot" style="background:${cat.dot}"></span><span class="prs-sect-name">${cat.label}</span></div>`;
      groups[k].forEach((it,idx)=>{
        const meta=[];
        if(it.location) meta.push(`<span class="prs-meta-item"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${_escHtml(it.location)}</span>`);
        if(it.who) meta.push(`<span class="prs-meta-item"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${_escHtml(it.who)}</span>`);
        const next = groups[k][idx+1];
        let gapHtml = '';
        if(next){ const gap=tlMinutes(next.time)!==null&&tlMinutes(it.time)!==null?tlMinutes(next.time)-tlMinutes(it.time):null; const gl=tlGapLabel(gap); if(gl) gapHtml=`<div class="prs-gap">${gl} later</div>`; }
        bodyHtml += `<div class="prs-row" style="border-top-color:${idx===0?'transparent':'var(--border)'}">
          <div class="prs-time">${tlTo12h(it.time)||'—'}</div>
          <div>
            <div class="prs-event">${_escHtml(it.title||'Untitled')}</div>
            ${meta.length?`<div class="prs-meta">${meta.join('')}</div>`:''}
            ${it.notes?`<div class="prs-notes">${_escHtml(it.notes)}</div>`:''}
          </div>
        </div>${gapHtml}`;
      });
      bodyHtml += `</div>`;
    });
    // Day summary
    const first=timeline.find(x=>tlMinutes(x.time)!==null), last=[...timeline].reverse().find(x=>tlMinutes(x.time)!==null);
    if(first&&last&&first!==last){
      const span=tlGapLabel(tlMinutes(last.time)-tlMinutes(first.time));
      bodyHtml += `<div style="margin-top:24px;padding-top:14px;border-top:1px solid var(--border);font-size:12px;color:var(--muted);text-align:center">${tlTo12h(first.time)} – ${tlTo12h(last.time)} · ${span} · ${timeline.length} moment${timeline.length!==1?'s':''}</div>`;
    }
  }

  document.body.innerHTML = `
    <div class="prs-page">
      <div class="prs-page-inner">
        <div class="prs-page-head">
          <div class="prs-page-names">${names}</div>
          ${subLine?`<div class="prs-page-sub">${subLine}</div>`:''}
        </div>
        ${bodyHtml}
        <div class="prs-page-brand"><a href="https://unionvault.app" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;display:inline-flex;align-items:center;gap:6px"><img src="${WB_CREST_DARK}" alt="" width="20" height="18" style="vertical-align:middle">Created with <strong>Union Vault</strong></a></div>
      </div>
    </div>`;
  document.body.style.visibility='visible';
}

// Shared print header bits.
function _tlPrintNames(){ const p1=STATE.event.partner1||'', p2=STATE.event.partner2||''; return (p1||p2)?`${_escHtml(p1)} &amp; ${_escHtml(p2)}`:'Our Wedding'; }
function _tlPrintSubLine(){ const d=STATE.event.date?fmtDate(STATE.event.date):''; const v=STATE.event.venue||''; return [d,v].filter(Boolean).join(' · '); }

function printTimeline(mode){
  if(mode==='music'){ return printTimelineMusic(); }
  const items = tlSorted();
  const rows = items.map(it=>{
    const cat=TL_CATS[it.cat]||TL_CATS.other;
    const meta=[it.location,it.who].filter(Boolean).join(' · ');
    const songs=(Array.isArray(it.songs)?it.songs:[]).filter(s=>s&&(s.title||s.artist));
    const songHtml = songs.length ? `<div style="margin-top:5px">${songs.map(s=>{
      const bits=[s.cue?_escHtml(s.cue)+':':'', `<b>${_escHtml(s.title||'Untitled')}</b>`, s.artist?'— '+_escHtml(s.artist):'', s.start?'(from '+_escHtml(s.start)+')':''].filter(Boolean).join(' ');
      const note=s.notes?`<div style="font-size:11px;color:#999;margin-left:14px">${_escHtml(s.notes)}</div>`:'';
      return `<div style="font-size:12px;color:#555;margin-top:1px">♪ ${bits}</div>${note}`;
    }).join('')}</div>` : '';
    return `<tr>
      <td style="padding:10px 14px 10px 0;white-space:nowrap;vertical-align:top;font-weight:600;font-size:13px;border-bottom:1px solid #eee">${tlTo12h(it.time)||'—'}</td>
      <td style="padding:10px 0;vertical-align:top;border-bottom:1px solid #eee">
        <div style="font-size:15px;font-weight:600;margin-bottom:2px">${(it.title||'').replace(/</g,'&lt;')} <span style="font-size:10px;font-weight:600;color:${cat.color};text-transform:uppercase;letter-spacing:.05em;margin-left:6px">${cat.label}</span></div>
        ${meta?`<div style="font-size:12px;color:#666">${meta.replace(/</g,'&lt;')}</div>`:''}
        ${it.notes?`<div style="font-size:12px;color:#888;margin-top:2px">${it.notes.replace(/</g,'&lt;')}</div>`:''}
        ${songHtml}
      </td>
    </tr>`;
  }).join('');
  const win=window.open('','_blank');
  if(!win){ alert('Please allow pop-ups to print the timeline.'); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>Day-of Timeline</title>
    <style>
      @media print{@page{margin:18mm}}
      body{font-family:Georgia,'Times New Roman',serif;color:#1a1a18;max-width:640px;margin:30px auto;padding:0 20px}
      h1{font-size:30px;font-weight:500;text-align:center;margin:0 0 4px;letter-spacing:.02em}
      .sub{text-align:center;color:#777;font-size:13px;margin-bottom:6px}
      .eyebrow{text-align:center;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#b08d5b;margin-bottom:24px}
      table{width:100%;border-collapse:collapse}
    </style></head><body>
    <div class="eyebrow">Day-of Timeline</div>
    <h1>${_tlPrintNames()}</h1>
    <div class="sub">${_tlPrintSubLine()}</div>
    <table>${rows||'<tr><td style="padding:20px;text-align:center;color:#999">No moments added yet.</td></tr>'}</table>
    <div style="margin-top:24px;padding-top:14px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#999"><a href="https://unionvault.app" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;display:inline-flex;align-items:center;gap:6px"><img src="${WB_CREST_DARK}" alt="" width="20" height="18" style="vertical-align:middle">Created with <strong>Union Vault</strong></a></div>
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>{ win.print(); }, 350);
}

// Music-only print — the DJ/band hand-off sheet in running order.
function printTimelineMusic(){
  const all=tlAllSongs();
  const rows=all.map(e=>{
    const s=e.song, link=tlSafeLink(s.link);
    return `<tr>
      <td style="padding:11px 14px 11px 0;white-space:nowrap;vertical-align:top;border-bottom:1px solid #eee">
        <div style="font-weight:700;font-size:13px">${tlTo12h(e.time)||'—'}</div>
        <div style="font-size:11px;color:#888;margin-top:1px">${_escHtml(e.moment)}</div>
      </td>
      <td style="padding:11px 0;vertical-align:top;border-bottom:1px solid #eee">
        ${s.cue?`<div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#b08d5b;margin-bottom:2px">${_escHtml(s.cue)}</div>`:''}
        <div style="font-size:16px;font-weight:600">${_escHtml(s.title||'Untitled')}</div>
        ${s.artist?`<div style="font-size:12.5px;color:#666">${_escHtml(s.artist)}</div>`:''}
        ${s.start?`<div style="font-size:12px;color:#555;margin-top:3px">▶ Start at ${_escHtml(s.start)}</div>`:''}
        ${link?`<div style="font-size:11px;color:#777;margin-top:2px;word-break:break-all">${_escHtml(link)}</div>`:''}
        ${s.notes?`<div style="font-size:12px;color:#555;margin-top:4px;padding-left:10px;border-left:2px solid #ddc9a0">${_escHtml(s.notes)}</div>`:''}
      </td>
    </tr>`;
  }).join('');
  const win=window.open('','_blank');
  if(!win){ alert('Please allow pop-ups to print the music sheet.'); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>Music Sheet</title>
    <style>
      @media print{@page{margin:18mm}}
      body{font-family:Georgia,'Times New Roman',serif;color:#1a1a18;max-width:640px;margin:30px auto;padding:0 20px}
      h1{font-size:30px;font-weight:500;text-align:center;margin:0 0 4px;letter-spacing:.02em}
      .sub{text-align:center;color:#777;font-size:13px;margin-bottom:6px}
      .eyebrow{text-align:center;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#b08d5b;margin-bottom:24px}
      table{width:100%;border-collapse:collapse}
    </style></head><body>
    <div class="eyebrow">Music Sheet · DJ / Band Hand-off</div>
    <h1>${_tlPrintNames()}</h1>
    <div class="sub">${_tlPrintSubLine()}</div>
    <table>${rows||'<tr><td style="padding:20px;text-align:center;color:#999">No songs tagged yet.</td></tr>'}</table>
    <div style="margin-top:24px;padding-top:14px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#999"><a href="https://unionvault.app" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;display:inline-flex;align-items:center;gap:6px"><img src="${WB_CREST_DARK}" alt="" width="20" height="18" style="vertical-align:middle">Created with <strong>Union Vault</strong></a></div>
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>{ win.print(); }, 350);
}


function renderGuests(c,actions){
  // The card-view cog menu is rebuilt on every render; ensure its state starts closed
  // so a stale open flag doesn't leave it showing without a click-away closer.
  _cardCogOpen=false;
  _guestFilterMenuOpen=false; _guestFilterSubOpen=false;
  _guestEditMenuOpen=false; _guestEditSubOpen=false;
  // Top panel title reflects mode (Invites vs Guest List); eyebrow stays "Guests"
  const _tt=document.getElementById('topbar-title'); if(_tt) _tt.textContent=inviteMode?'Invites':'Guest List';
  // Purge phantom data before rendering — catches any stale guests left by old deletion bugs
  const guestIds=new Set(STATE.guests.map(g=>g.id));
  STATE.guests.forEach(g=>{
    if(g.coupleId&&!guestIds.has(g.coupleId)) g.coupleId=null;
    if(g.plusOneId&&!guestIds.has(g.plusOneId)) g.plusOneId=null;
  });
  // Reciprocity reconcile — recover guests orphaned by an asymmetric link
  // (e.g. the old Link Guest bug left X->Y but Y no longer pointed back to X).
  (function _reconcileCoupleLinks(){
    const byId=Object.fromEntries(STATE.guests.map(g=>[g.id,g]));
    let healed=false;
    STATE.guests.forEach(g=>{
      // Couple link: g points at a partner who doesn't point back
      if(g.coupleId){
        const p=byId[g.coupleId];
        if(p && p.coupleId!==g.id && p.plusOneId!==g.id){
          if(!p.coupleId && !p.plusOneId){
            // Partner is free -> re-pair (heals the broken couple)
            p.coupleId=g.id; if(!p.relationship||p.relationship==='Guest') p.relationship=g.relationship||'Couple'; healed=true;
          } else {
            // Partner has since linked to someone else -> drop our stale link
            g.coupleId=null; healed=true;
          }
        }
      }
      // Plus-one link: g claims a plus-one who doesn't point back
      if(g.plusOneId){
        const p=byId[g.plusOneId];
        if(p && p.coupleId!==g.id){
          if(!p.coupleId){ p.coupleId=g.id; if(p.relationship!=='Plus One') p.relationship='Plus One'; healed=true; }
          else { g.plusOneId=null; healed=true; }
        }
      }
    });
    if(healed) saveToStorage();
  })();
  // One-time migration: Sibling pair-links → 2-person Household groups.
  // (Sibling was removed as a relationship; existing ones become Households.)
  (function _migrateSiblingsToHouseholds(){
    if(!STATE.families) STATE.families=[];
    const byId=Object.fromEntries(STATE.guests.map(g=>[g.id,g]));
    const done=new Set();
    let changed=false;
    STATE.guests.forEach(g=>{
      if(done.has(g.id)) return;
      if(g.relationship==='Sibling'){
        const p=g.coupleId?byId[g.coupleId]:null;
        if(p && p.coupleId===g.id){
          // Break the pair link and form a household group of the two.
          const ids=[g.id,p.id];
          g.coupleId=null; p.coupleId=null;
          if(g.relationship==='Sibling') g.relationship='Guest';
          if(p.relationship==='Sibling') p.relationship='Guest';
          // Remove from any existing groups, then create the household.
          STATE.families.forEach(f=>{ f.memberIds=f.memberIds.filter(id=>!ids.includes(id)); });
          const surname=(nm)=>{ const a=(nm||'').trim().split(/\s+/); return a.length>1?a[a.length-1]:''; };
          const s1=surname(g.name), nm=(s1&&s1===surname(p.name))?`${s1} Household`:`${(g.name||'').split(/\s+/)[0]} & ${(p.name||'').split(/\s+/)[0]}`;
          STATE.families.push({ id:'fam'+Date.now()+Math.random().toString(36).slice(2,5), name:nm, kind:'household', memberIds:ids });
          done.add(g.id); done.add(p.id); changed=true;
        } else {
          // Dangling sibling with no valid partner → just clear the role.
          g.coupleId=null; g.relationship='Guest'; done.add(g.id); changed=true;
        }
      }
    });
    if(changed){ STATE.families=STATE.families.filter(f=>f.memberIds.length>0); saveToStorage(); }
  })();
  // Migrate retired category-header styles to their closest replacements: the old
  // 'minimal' line → 'stack' (compact stack), the old 'ring' → 'splitbar' (spend bar).
  (function _migrateCatHeaderStyle(){
    if(!STATE.settings) return;
    const map={minimal:'stack', ring:'splitbar'};
    const cur=STATE.settings.catHeaderStyle;
    if(cur && map[cur]){ STATE.settings.catHeaderStyle=map[cur]; saveToStorage(); }
  })();
  // Build the set of IDs that are referenced as a plusOne by a real guest
  const referencedPlusOneIds=new Set(STATE.guests.map(g=>g.plusOneId).filter(Boolean));
  // Remove orphaned plus-ones: guests whose primary no longer exists or no longer references them
  const before=STATE.guests.length;
  STATE.guests=STATE.guests.filter(g=>{
    if(g.relationship==='Plus One'){
      // Keep only if a living primary has plusOneId pointing to this guest
      return referencedPlusOneIds.has(g.id);
    }
    return true;
  });
  if(STATE.guests.length!==before) saveToStorage();
  // Topbar: stacked Invites (top) + Select (below), right-aligned
  actions.style.flexWrap='';
  actions.style.alignItems='';
  actions.innerHTML=`<div id="guest-topbar-group" class="gbtn-group" style="display:flex;flex:0 1 auto;min-width:0;flex-direction:row;gap:5px;align-items:center;justify-content:flex-end">
    ${reorderMode?`<span class="gt-reorder-hint" style="font-size:10.5px;line-height:1.15;color:var(--muted);display:inline-flex;align-items:flex-start;gap:4px;text-align:left;flex-shrink:1;min-width:0;margin-right:2px">
      <svg width="12" height="12" viewBox="3 3 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.55;flex-shrink:0;margin-top:1px"><polyline points="17 11 21 7 17 3"/><line x1="21" y1="7" x2="9" y2="7"/><polyline points="7 13 3 17 7 21"/><line x1="3" y1="17" x2="15" y2="17"/></svg>
      <span class="gt-reorder-hint-txt" style="width:max-content;max-width:96px;white-space:normal;text-align:left">Drag a card to move it</span>
    </span><button class="btn btn-sm gbtn btn-primary" onclick="exitReorderToBulk()" title="Done reordering" style="white-space:nowrap;display:inline-flex;align-items:center;gap:5px;flex-shrink:0">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      <span class="gbtn-label gbtn-label-keep">Done</span>
    </button>`:''}
    ${inviteMode&&!bulkMode&&!reorderMode?`<button class="btn btn-sm gbtn btn-primary" onclick="toggleInviteMode()" title="Go back" style="white-space:nowrap;display:inline-flex;align-items:center;gap:5px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      <span class="gbtn-label">Go Back</span>
    </button>`:''}
    ${!inviteMode&&!reorderMode&&guestListView==='card'?`<button class="btn btn-sm gbtn btn-outline gbtn-viewtoggle" onclick="setGuestListView('list')" title="List view" style="white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:5px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="4" height="4" rx="1"/><rect x="3" y="12" width="4" height="4" rx="1"/><rect x="3" y="19" width="4" height="4" rx="1"/><line x1="10" y1="7" x2="21" y2="7"/><line x1="10" y1="14" x2="21" y2="14"/><line x1="10" y1="21" x2="21" y2="21"/></svg>
      <span class="gbtn-label"><span class="gbtn-label-long">List view</span><span class="gbtn-label-short">List</span></span>
    </button>`:''}
    ${!inviteMode&&guestListView==='list'&&!bulkMode&&!reorderMode?`<button class="btn btn-sm gbtn btn-outline gbtn-viewtoggle" onclick="setGuestListView('card')" title="Card view" style="white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:5px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="6" rx="1.5"/><rect x="2" y="14" width="20" height="6" rx="1.5"/></svg>
      <span class="gbtn-label"><span class="gbtn-label-long">Card view</span><span class="gbtn-label-short">Card</span></span>
    </button>`:''}
    ${!inviteMode&&guestListView==='list'&&bulkMode&&!reorderMode?`<button class="btn btn-sm gbtn btn-primary" onclick="toggleBulkMode()" title="Done" style="white-space:nowrap;display:inline-flex;align-items:center;gap:5px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      <span class="gbtn-label gbtn-label-keep">Done</span>
    </button><div id="guest-edit-wrap" style="position:relative;display:inline-flex;flex-shrink:0"><button class="btn-icon" onclick="_guestEditMenuToggle(event)" title="Edit options" aria-label="Edit options" aria-haspopup="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>${_guestEditMenuHtml()}</div>`:''}
    ${!inviteMode&&guestListView==='list'&&!bulkMode&&!reorderMode?`<div id="guest-filter-wrap" style="position:relative;display:inline-flex;flex-shrink:0"><button class="btn-icon" onclick="_guestFilterMenuToggle(event)" title="Filters" aria-label="Filters" aria-haspopup="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>${_guestFilterMenuHtml()}</div>`:''}
    ${!inviteMode&&!bulkMode&&!reorderMode&&guestListView==='card'?`<div id="card-cog-wrap" style="position:relative;display:inline-flex;flex-shrink:0"><button class="btn-icon" onclick="_cardCogToggle(event)" title="View options" aria-label="View options" aria-haspopup="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>${_cardCogMenuHtml()}</div>`:''}
  </div>`;

  const allTags=[...new Set(STATE.guests.flatMap(g=>g.tags||[]))];
  const sf=STATE.guestFilter;
  const bulkBarHtml = (bulkMode && !reorderMode)?`
    <div id="bulk-bar-wrap" style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:7px 10px;margin-top:6px;margin-bottom:5px;display:flex;flex-direction:column;gap:7px">
      <div id="bulk-top-group" class="gbtn-group" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm gbtn" onclick="bulkSelectAll()" title="Select all" style="display:inline-flex;align-items:center;gap:4px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="gbtn-label">Select All</span>
        </button>
        <button class="btn btn-outline btn-sm gbtn" onclick="enterReorderFromBulk()" title="Reorder guests" style="display:inline-flex;align-items:center;gap:4px;flex-shrink:0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 11 21 7 17 3"/><line x1="21" y1="7" x2="9" y2="7"/><polyline points="7 13 3 17 7 21"/><line x1="3" y1="17" x2="15" y2="17"/></svg>
          <span class="gbtn-label">Reorder</span>
        </button>
        <span id="bulk-count" style="font-size:12.5px;color:var(--muted);font-weight:500">0 selected</span>
        <div style="margin-left:auto;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <button id="bulk-link-btn" class="btn btn-outline btn-sm gbtn" onclick="bulkLinkOrUnlink()" title="Link as Couple" style="display:none;align-items:center;gap:3px;padding:4px 6px">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/></svg>
            <span class="gbtn-label">Link as Couple</span>
          </button>
          <button id="bulk-family-btn" class="btn btn-outline btn-sm gbtn" onclick="bulkLinkFamily()" title="Link as Family" style="display:none;align-items:center;gap:3px;padding:4px 6px">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><line x1="12" y1="6" x2="12" y2="11"/><line x1="12" y1="11" x2="7" y2="14"/><line x1="12" y1="11" x2="17" y2="14"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/></svg>
            <span class="gbtn-label">Link as Family</span>
          </button>
        </div>
      </div>
      <div id="bulk-action-bar" class="gbtn-group" style="display:none;align-items:center;gap:6px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:7px">
        <button class="btn btn-outline btn-sm gbtn" onclick="bulkSetRsvp('attending')" title="Mark Attending" style="display:inline-flex;align-items:center;gap:4px;color:var(--green)">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="gbtn-label">Attending</span>
        </button>
        <button class="btn btn-outline btn-sm gbtn" onclick="bulkSetRsvp('declined')" title="Mark Declined" style="display:inline-flex;align-items:center;gap:4px">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="22" y2="13"/><line x1="22" y1="8" x2="17" y2="13"/></svg>
          <span class="gbtn-label">Declined</span>
        </button>
        <button class="btn btn-outline btn-sm gbtn" onclick="bulkSetRsvp('awaiting')" title="Mark Awaiting" style="display:inline-flex;align-items:center;gap:4px">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
          <span class="gbtn-label">Awaiting</span>
        </button>
        <div style="width:1px;height:20px;background:var(--border);margin:0 2px"></div>
        <button id="bulk-listA-btn" class="btn btn-outline btn-sm gbtn" onclick="bulkSetList('A')" title="Primary List" style="display:inline-flex;align-items:center;gap:4px">
          <span style="font-size:9.5px;font-weight:700;background:var(--gold);color:#fff;padding:1px 5px;border-radius:3px">A</span> <span class="gbtn-label">Primary List</span>
        </button>
        <button id="bulk-listB-btn" class="btn btn-outline btn-sm gbtn" onclick="bulkSetList('B')" title="B List" style="display:inline-flex;align-items:center;gap:4px">
          <span style="font-size:9.5px;font-weight:700;background:var(--muted);color:#fff;padding:1px 5px;border-radius:3px">B</span> <span class="gbtn-label">B List</span>
        </button>
        <div style="width:1px;height:20px;background:var(--border);margin:0 2px"></div>
        <button class="btn btn-outline btn-sm gbtn" onclick="bulkAddTag()" title="Add Tag" style="display:inline-flex;align-items:center;gap:4px">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          <span class="gbtn-label">Add Tag</span>
        </button>
        <div style="width:1px;height:20px;background:var(--border);margin:0 2px"></div>
        <button class="btn btn-sm gbtn" onclick="bulkDeleteGuests()" title="Delete" style="background:rgba(180,60,60,.1);color:var(--red-deep);border:1px solid rgba(180,60,60,.2);display:inline-flex;align-items:center;gap:4px">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          <span class="gbtn-label">Delete</span>
        </button>
      </div>
    </div>`:'';
  c.innerHTML=`
  <div id="guest-sticky-panel" class="fullbleed-banner${bulkMode?' guest-bulk':''}" style="position:sticky;top:-32px;z-index:50;margin:-32px -28px 0;padding:14px 28px 14px;background:var(--cream);border-bottom:1px solid var(--border);box-shadow:0 2px 8px rgba(0,0,0,.04)">
    ${!inviteMode&&!reorderMode?`<div id="guest-action-group" class="gbtn-group" style="display:flex;align-items:center;gap:5px;margin-bottom:10px;flex-wrap:nowrap">
      <button class="btn btn-outline btn-sm gbtn" onclick="openAddGuest('couple')" title="Add Couple" style="white-space:nowrap;display:inline-flex;align-items:center;gap:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="color:var(--gold-deep)"><path d="M12 21.593c-.425-.396-8.743-7.88-8.743-12.093C3.257 5.428 5.623 3 8.743 3c1.677 0 3.115.82 3.257.97.142-.15 1.58-.97 3.257-.97 3.12 0 5.486 2.428 5.486 6.5 0 4.213-8.318 11.697-8.743 12.093z"/></svg><span class="gbtn-label">Couple</span></button>
      <button class="btn btn-primary btn-sm gbtn" onclick="openAddGuest('single')" title="Add Guest" style="white-space:nowrap;display:inline-flex;align-items:center;gap:4px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg><span class="gbtn-label">Guest</span></button>
      <button class="btn btn-outline btn-sm gbtn" onclick="openGuestImport()" title="Import" style="white-space:nowrap;display:inline-flex;align-items:center;gap:4px">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
        <span class="gbtn-label">Import</span>
      </button>
      ${guestListView==='list'&&!bulkMode?`<span style="flex:1 1 auto"></span><button class="btn btn-outline btn-sm gbtn" onclick="toggleBulkMode()" title="Edit" style="white-space:nowrap;display:inline-flex;align-items:center;gap:4px;flex-shrink:0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg><span class="gbtn-label">Edit</span></button>`:''}
    </div>`:''}

    ${inviteMode?`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
      <div class="inv-seg">
        <button class="${inviteSimpleGroup==='grouped'?'active':''}" onclick="setInviteSimpleGroup('grouped')">Grouped</button>
        <button class="${inviteSimpleGroup==='list'?'active':''}" onclick="setInviteSimpleGroup('list')">List</button>
      </div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 12px;margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" onclick="checkAllInvites()" style="display:inline-flex;align-items:center;gap:5px;color:var(--green)">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Check All
      </button>
      <button class="btn btn-outline btn-sm" onclick="uncheckAllInvites()" style="display:inline-flex;align-items:center;gap:5px;color:var(--muted)">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Uncheck All
      </button>
      <span style="font-size:12px;color:var(--ink)"><strong>${(()=>{const s=new Set();STATE.invites&&STATE.invites.forEach(k=>{ const [type,id]=k.split(':'); if(type==='solo'){s.add(id);}else if(type==='couple'||type==='plusone'){const g=STATE.guests.find(x=>x.id===id);if(g){s.add(g.id);if(g.coupleId)s.add(g.coupleId);if(g.plusOneId)s.add(g.plusOneId);}}else if(type==='fam'){const f=(STATE.families||[]).find(x=>x.id===id);if(f)f.memberIds.forEach(x=>s.add(x));}});return s.size;})()}</strong> of <strong>${STATE.guests.filter(g=>(g.listType||'A')==='A').length}</strong> invites sent</span>
    </div>`:''}


    ${(()=>{
      const all=STATE.guests;
      const aList=all.filter(g=>(g.listType||'A')==='A');
      const bList=all.filter(g=>(g.listType||'A')==='B');
      const attending=all.filter(g=>g.rsvp==='attending'&&(g.listType||'A')==='A').length;
      const declined=all.filter(g=>g.rsvp==='declined'&&(g.listType||'A')==='A').length;
      const awaiting=all.filter(g=>g.rsvp==='awaiting'&&(g.listType||'A')==='A').length;
      const isA=g=>(g.listType||'A')==='A';
      const couples=STATE.guests.filter(g=>g.coupleId&&STATE.guests.find(x=>x.id===g.coupleId)&&g.id<g.coupleId
        &&isA(g)&&isA(STATE.guests.find(x=>x.id===g.coupleId))).length;
      const _grpHasA=f=>{ const members=f.memberIds.map(id=>STATE.guests.find(x=>x.id===id)).filter(Boolean); return members.length>0 && members.some(isA); };
      const families=(STATE.families||[]).filter(f=>f.kind!=='household' && _grpHasA(f)).length;
      const households=(STATE.families||[]).filter(f=>f.kind==='household' && _grpHasA(f)).length;
      // Count actual +1 guest records (not host pointers, which can be stale/duplicated).
      // A +1 guest is a non-main, A-list guest that another guest hosts via plusOneId.
      const validHostedPlusOneIds=new Set();
      all.forEach(h=>{ if(h.plusOneId && all.find(x=>x.id===h.plusOneId)) validHostedPlusOneIds.add(h.plusOneId); });
      const plusOnes=all.filter(g=>
        g.isMain===false && isA(g) &&
        (g.relationship==='Plus One' || (g.tags||[]).includes('+1')) &&
        validHostedPlusOneIds.has(g.id)
      ).length;

      // COLLAPSED — slim summary bar (search icon + live counts + chevron)
      if(!guestPanelExpanded){
        const filterNote = sf.query||sf.status!=='all'||sf.list==='B'||sf.tags.length
          ? `<span style="font-size:10px;color:var(--gold-deep);background:var(--parchment);border-radius:10px;padding:1px 7px;flex-shrink:0">filtered</span>` : '';
        return `<div onclick="toggleGuestPanel()" title="Show search, filters & counts" class="guest-collapsed-bar" style="display:flex;align-items:center;gap:9px;border:1px solid var(--border);border-radius:8px;padding:7px 11px;cursor:pointer;flex-wrap:wrap">
          <span onclick="event.stopPropagation();expandGuestPanelForSearch()" title="Search guests" style="display:inline-flex;align-items:center;color:var(--gold-deep);flex-shrink:0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          ${inviteMode?`<span style="font-size:12px;color:var(--muted)">Search guests</span>`:`<span class="gcb-count" style="font-size:12px;color:var(--ink)"><strong>${aList.length}</strong> guests</span>
          <span class="gcb-count" style="font-size:12px;color:var(--green)"><strong>${attending}</strong> <span class="gcb-w-full">attending</span><span class="gcb-w-short">att.</span></span>
          <span class="gcb-count" style="font-size:12px;color:var(--red-deep)"><strong>${declined}</strong> <span class="gcb-w-full">declined</span><span class="gcb-w-short">dec.</span></span>
          <span class="gcb-count" style="font-size:12px;color:var(--muted)"><strong>${awaiting}</strong> <span class="gcb-w-full">awaiting</span><span class="gcb-w-short">awa.</span></span>`}
          ${filterNote}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;color:var(--muted);flex-shrink:0"><polyline points="6 9 12 15 18 9"/></svg>
        </div>`;
      }

      // EXPANDED — full search + filters + tags + detailed counts
      const hideBtn=(key,label)=>{
        if(!bulkMode) return '';
        const isHidden=_hiddenGuestSections.has(key);
        const eyeIcon=isHidden
          ? `<svg width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/></svg>`
          : `<svg width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24'/><line x1='1' y1='1' x2='23' y2='23'/></svg>`;
        return `<button onclick="toggleGuestSectionHide('${key}')"
          style="background:none;border:1px solid var(--border);border-radius:5px;cursor:pointer;color:${isHidden?'var(--gold-deep)':'var(--muted)'};padding:1px 6px;font-size:10px;font-family:Inter,sans-serif;display:inline-flex;align-items:center;gap:3px;flex-shrink:0">${eyeIcon}${isHidden?'Show':'Hide'}</button>`;
      };

      return `<div style="display:flex;flex-direction:column;gap:7px">
        <div style="position:relative">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="guest-search-input" class="form-input" placeholder="Search guests…" value="${sf.query||''}"
            style="padding:6px 60px 6px 30px;font-size:12.5px;height:32px;width:100%"
            oninput="setGuestSearch(this.value)"
            onkeydown="if(event.key==='Escape'){setGuestSearch('');this.value='';}"
          />
          ${sf.query?`<button onclick="setGuestSearch('');document.getElementById('guest-search-input').value=''" style="position:absolute;right:34px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:0;display:flex;align-items:center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>`:''}
          ${!inviteMode?`<button onclick="toggleGuestPanel()" title="Collapse" style="position:absolute;right:7px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:2px;display:flex;align-items:center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          </button>`:''}
        </div>

        <div class="gft-row" style="display:flex;flex-wrap:wrap;gap:6px 18px;align-items:flex-start">
        ${(()=>{
          if(inviteMode) return ''; // Filters not shown in Invites view
          const statusChips=[
            {key:'f_all',v:'all',label:'All'},
            {key:'f_attending',v:'attending',label:'Attending'},
            {key:'f_declined',v:'declined',label:'Declined'},
            {key:'f_awaiting',v:'awaiting',label:'Awaiting'}
          ].filter(c=>!_hiddenGuestSections.has(c.key));
          const showBList=!_hiddenGuestSections.has('blistfilter');
          const visibleGroupChips=[
            {key:'g_singles',v:'singles',label:'Singles'},
            {key:'g_couples',v:'couples',label:'Couples'},
            {key:'g_families',v:'families',label:'Families'}
          ].filter(c=>_guestGroupFilterShown(c.key));
          const visibleCount=statusChips.length+(showBList?1:0)+visibleGroupChips.length;
          if(visibleCount===0) return '';
          const label=visibleCount===1?'Filter:':'Filters:';
          const _ic={
            all:'<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
            attending:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
            declined:'<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
            awaiting:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
            singles:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
            couples:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
            families:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
          };
          const _gsvg=(p)=>`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none">${p}</svg>`;
          return `<div class="gfilter-group" style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
          <span class="gfilter-bar-label" style="font-size:11.5px;color:var(--muted);font-weight:500;flex-shrink:0">${label}</span>
          ${statusChips.map(c=>`<button class="btn gfilter-chip ${sf.status===c.v?'btn-primary':'btn-outline'}" onclick="setGuestFilter('${c.v}')" title="${c.label}" aria-label="${c.label}" style="font-size:10.5px;padding:3px 7px;border-radius:5px;white-space:nowrap;display:inline-flex;align-items:center;gap:3px">${_gsvg(_ic[c.v]||'')}<span class="gfilter-label">${c.label}</span></button>`).join('')}
          ${showBList?`<button class="btn gfilter-chip ${sf.list==='B'?'btn-primary':'btn-outline'}" onclick="toggleBListFilter()" title="B List" aria-label="B List" style="font-size:10.5px;padding:3px 7px;border-radius:5px;white-space:nowrap;display:inline-flex;align-items:center;gap:3px">
            <span style="font-size:8px;font-weight:700;background:${sf.list==='B'?'rgba(255,255,255,.3)':'var(--muted)'};color:#fff;padding:0 3px;border-radius:3px;flex:none">B</span>
            <span class="gfilter-label">List</span>
          </button>`:''}
          ${visibleGroupChips.length?`<span style="width:1px;height:16px;background:var(--border);margin:0 2px;align-self:center"></span>`:''}
          ${visibleGroupChips.map(c=>`<button class="btn gfilter-chip ${sf.group===c.v?'btn-primary':'btn-outline'}" onclick="setGuestGroupFilter('${c.v}')" title="${c.label}" aria-label="${c.label}" style="font-size:10.5px;padding:3px 7px;border-radius:5px;white-space:nowrap;display:inline-flex;align-items:center;gap:3px">${_gsvg(_ic[c.v]||'')}<span class="gfilter-label">${c.label}</span></button>`).join('')}
        </div>`;
        })()}

        ${!inviteMode&&allTags.length&&!_hiddenGuestSections.has('tags')?`<div class="gtags-group" style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
          <span style="font-size:11.5px;color:var(--muted);font-weight:500;flex-shrink:0">Tags:</span>
          ${(()=>{
            // Count each tag against the OTHER active filters (status/group/B-list/search)
            // while ignoring the current tag selection — so each number previews how many
            // guests selecting that tag would yield under the present filters. We build the
            // base set without mutating shared filter state.
            const q=(sf.query||'');
            const _passNonTag=g=>{
              if(q){ const hay=[g.name,g.phone||'',g.email||'',g.address||'',g.relationship||'',...(g.tags||[])].join(' ').toLowerCase(); if(!hay.includes(q)) return false; }
              const gList=g.listType||'A';
              if(sf.list==='B'){ if(gList!=='B') return false; } else { if(gList==='B') return false; }
              if(!(sf.status==='all'||g.rsvp===sf.status)) return false;
              if(sf.group&&sf.group!=='all'&&!guestInGroup(g, sf.group)) return false;
              return true;
            };
            const _base=STATE.guests.filter(_passNonTag);
            return allTags.map(t=>{
              const cnt=_base.filter(g=>(g.tags||[]).includes(t)).length;
              const active=sf.tags.includes(t);
              return _tagChipHtml(t, {active:active, count:cnt, click:`toggleTagFilter('${_escSQ(t)}')`});
            }).join('');
          })()}
        </div>`:''}
        </div>

        ${(()=>{
          const showGuests=!_hiddenGuestSections.has('guestsgrp');
          const showBlist=!_hiddenGuestSections.has('blist')&&bList.length;
          const showRsvp=!_hiddenGuestSections.has('rsvp');
          const showGroups=!_hiddenGuestSections.has('groups')&&(couples||families||households||plusOnes);
          const segs=[];
          if(showGuests){
            segs.push(`<div style="display:flex;flex-wrap:wrap;gap:4px 7px;align-items:center">
              <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Guests</span>
              <span style="font-size:12px;color:var(--ink)"><strong>${aList.length}</strong></span>
              ${showBlist?`<span style="font-size:12px;color:var(--muted)"><strong>${bList.length}</strong> B list</span>
              <span style="font-size:12px;color:var(--muted)">(<strong>${all.length}</strong> total)</span>`:''}
            </div>`);
          }
          if(showRsvp){
            segs.push(`<div style="display:flex;flex-wrap:wrap;gap:2px 7px;align-items:center">
              <span class="gcount-rsvp-eyebrow" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">RSVP</span>
              <span style="font-size:12px;color:var(--green)"><strong>${attending}</strong> attending</span>
              <span style="font-size:12px;color:var(--red-deep)"><strong>${declined}</strong> declined</span>
              <span style="font-size:12px;color:var(--muted)"><strong>${awaiting}</strong> awaiting</span>
            </div>`);
          }
          if(showGroups){
            segs.push(`<div style="display:flex;flex-wrap:wrap;gap:4px 7px;align-items:center">
              <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Groups</span>
              ${couples?`<span style="font-size:12px;color:var(--ink)"><strong>${couples}</strong> couple${couples!==1?'s':''}</span>`:''}
              ${plusOnes?`<span style="font-size:12px;color:var(--muted)"><strong>${plusOnes}</strong> +1${plusOnes!==1?'s':''}</span>`:''}
              ${families?`<span style="font-size:12px;color:var(--ink)"><strong>${families}</strong> famil${families!==1?'ies':'y'}</span>`:''}
              ${households?`<span style="font-size:12px;color:var(--ink)"><strong>${households}</strong> household${households!==1?'s':''}</span>`:''}
            </div>`);
          }
          const divider=`<div style="width:1px;background:var(--border);align-self:stretch"></div>`;
          if(inviteMode) return ''; // counts line not shown in Invites mode
          const countsRow = segs.length
            ? `<div style="display:flex;flex-wrap:wrap;gap:7px 11px;align-items:center">${segs.join(divider)}</div>`
            : `<span style="font-size:11.5px;color:var(--muted);font-style:italic">All counts hidden</span>`;
          return `<div style="border-top:1px solid var(--border);margin-top:3px;padding-top:7px">${countsRow}</div>`;
        })()}
      </div>`;
    })()}
    ${bulkBarHtml}
  </div>
  <div id="guest-list-container" style="margin-top:16px"></div>`;
  renderGuestList();
  if(bulkMode && !reorderMode) updateBulkBar();
  setTimeout(()=>{ _ensureGuestBtnObserver(); requestAnimationFrame(_fitGuestBtns); if(typeof _positionGuestSuggestBar==='function') requestAnimationFrame(_positionGuestSuggestBar); }, 0);
}

// ── Auto-fit guest toolbar buttons: collapse labels to icon-only when narrow ──
// For each .gbtn-group, measure the natural one-line width (labels shown). If it
// exceeds the available width, add .icons-only (CSS hides .gbtn-label). Mirrors
// the budget toolbar's measurement approach; works per-group independently.
function _fitGuestBtns(){
  // Coalesce calls into a single pending animation frame. A raw re-entrancy boolean
  // could get stuck true (and starve the clear), leaving the fitter permanently
  // disabled; a cancellable rAF token can't. While a fit is scheduled or settling,
  // observer callbacks are ignored so our own layout writes don't re-trigger a pass.
  if(_fitGuestPending) return;
  _fitGuestPending=requestAnimationFrame(()=>{
    _fitGuestPending=0;
    _fitGuestSettling=true;
    try{ _fitGuestBtnsImpl(); }
    finally{
      // Clear the settle flag AFTER this frame's ResizeObserver callback has fired,
      // not before. rAF runs before layout/RO within a frame, so a single rAF would
      // clear the flag too early and the RO (seeing settling=false) would re-trigger
      // the loop. A 0ms timeout lands in the next task, safely after the RO callback.
      setTimeout(()=>{ _fitGuestSettling=false; }, 0);
    }
  });
}
let _fitGuestPending=0;
let _fitGuestSettling=false;
function _fitGuestBtnsImpl(){
  document.querySelectorAll('.gbtn-group').forEach(group=>{
    if(!group.isConnected) return;
    // Available width = the space the group is allowed to occupy. The group and its
    // immediate parent are flex children that shrink to content, so their clientWidth
    // can already be collapsed (icon-only) from a previous pass. Walk up to the topbar
    // and use (topbar inner width − the width of the group's left-siblings, e.g. the
    // page title) so labels can re-expand whenever there's genuinely room.
    let avail=group.clientWidth;
    const topbar=group.closest('.topbar');
    const actionsHost=group.closest('.topbar-actions')||group.parentElement;
    if(topbar && actionsHost){
      // Sum the left-siblings' MINIMUM widths rather than their current (greedy) widths.
      // The title block is flex:1 and can shrink to its min-width/content, yielding space
      // to the actions; using its live width would wrongly report almost no room.
      let used=0;
      Array.from(topbar.children).forEach(ch=>{
        if(ch.contains(actionsHost)) return;
        const r=ch.getBoundingClientRect();
        const cs2=getComputedStyle(ch);
        const flexGrows=parseFloat(cs2.flexGrow)>0;
        const minW=parseFloat(cs2.minWidth);
        // For a growable sibling (the title), credit only its min-width; otherwise its real width.
        used += (flexGrows && !isNaN(minW)) ? minW : r.width;
      });
      const cs=getComputedStyle(topbar);
      const padX=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0);
      const free=topbar.clientWidth - padX - used - 12; // 12px breathing gap
      if(free>avail) avail=free;
    } else {
      const par=group.parentElement;
      if(par){
        const pcs=getComputedStyle(par);
        const pPad=(parseFloat(pcs.paddingLeft)||0)+(parseFloat(pcs.paddingRight)||0);
        avail=Math.max(avail, par.clientWidth - pPad);
      }
    }
    if(!avail) return;
    // Measure natural width with labels shown by summing the real widths of the
    // group's buttons + any inline non-button items (counts, dividers) + gaps.
    // Summing (rather than scrollWidth) is robust to margin-left:auto spacers.
    // Hysteresis: re-expanding requires clearly more room than the point at which
    // we collapsed. Without this, a width sitting within ~1px of the threshold flips
    // between labelled and icon-only on each pass (the visible flicker).
    const wasIconsOnly=group.classList.contains('icons-only');
    const expandMargin=wasIconsOnly?10:1; // need 10px clear room to re-expand
    group.classList.remove('icons-only');
    group.classList.remove('reorder-collapsed');
    group.classList.remove('short-labels');
    const cs=getComputedStyle(group);
    const gap=parseFloat(cs.columnGap||cs.gap)||6;
    const measureWidth=()=>{ let w=0, n=0;
      const measure=el=>{ Array.from(el.children).forEach(ch=>{
        // Skip flex-grow spacers (e.g. the <span style="flex:1 1 auto"> between Import and Edit)
        // — their scrollWidth grows to fill available space and would falsely inflate the total.
        if(parseFloat(getComputedStyle(ch).flexGrow)>0) return;
        if(ch.classList && ch.classList.contains('gbtn')){ w+=ch.scrollWidth; n++; }
        else if(ch.children && ch.children.length){ measure(ch); }
        else { w+=ch.scrollWidth; n++; }
      }); };
      measure(group);
      return w + gap*Math.max(0,n-1);
    };
    if(measureWidth()<=avail-expandMargin+1){ group.classList.remove('short-labels'); return; }    // full labels fit (with hysteresis)
    // Stage 2: collapse only the low-priority (Reorder) label, if this group has one.
    if(group.querySelector('.gbtn-label-low')){
      group.classList.add('reorder-collapsed');
      if(measureWidth()<=avail+1){ group.classList.remove('short-labels'); return; }               // fits with just Reorder as icon
      group.classList.remove('reorder-collapsed');
    }
    // Stage 3: swap long→short labels (e.g. "Card view"→"Card") if the group has a
    // short tier — keeps a text label rather than dropping straight to an icon.
    if(group.querySelector('.gbtn-label-short')){
      group.classList.add('short-labels');
      if(measureWidth()<=avail+1) return;               // fits with short labels
      group.classList.remove('short-labels');
    }
    // Stage 4: fall back to all-icons.
    group.classList.add('icons-only');
  });
  // Same measurement for the guest filter chip row (label span + chips + divider).
  document.querySelectorAll('.gfilter-group').forEach(group=>{
    if(!group.isConnected) return;
    // Derive available width from the parent container (not the group itself, which may
    // already be collapsed to a small clientWidth in icons-only state).
    const par=group.parentElement;
    let avail=group.clientWidth;
    if(par){
      const pcs=getComputedStyle(par);
      const pPad=(parseFloat(pcs.paddingLeft)||0)+(parseFloat(pcs.paddingRight)||0);
      const parW=par.clientWidth - pPad;
      if(parW>avail) avail=parW;
    }
    if(!avail) return;
    const wasIconsOnly=group.classList.contains('icons-only');
    const expandMargin=wasIconsOnly?10:1;
    group.classList.remove('icons-only');
    const cs=getComputedStyle(group);
    const gap=parseFloat(cs.columnGap||cs.gap)||5;
    let w=0, n=0;
    Array.from(group.children).forEach(ch=>{ w+=ch.scrollWidth; n++; });
    const natural=w + gap*Math.max(0,n-1);
    if(natural>avail-expandMargin+1) group.classList.add('icons-only');
  });
}
let _guestBtnRO=null;
let _guestRoLastW=new WeakMap();
function _ensureGuestBtnObserver(){
  if(typeof ResizeObserver!=='function') return;
  if(_guestBtnRO){ _guestBtnRO.disconnect(); }
  _guestBtnRO=new ResizeObserver((entries)=>{
    // Ignore resize notifications caused by our own fit pass (settle window).
    if(_fitGuestSettling || _fitGuestPending) return;
    // Flex layout produces a few px of sub-pixel width jitter frame-to-frame even
    // when nothing meaningful changed. Only re-fit when an observed width has moved
    // by a real amount since the last pass, so noise can't drive a collapse/expand
    // oscillation (the flicker).
    let meaningful=false;
    for(const e of entries){
      const w=e.contentRect.width;
      const prev=_guestRoLastW.get(e.target);
      if(prev===undefined || Math.abs(w-prev)>=6){ meaningful=true; }
      _guestRoLastW.set(e.target, w);
    }
    if(!meaningful) return;
    if(document.querySelector('.gbtn-group,.gfilter-group')) _fitGuestBtns();
    if(typeof _positionGuestSuggestBar==='function') requestAnimationFrame(_positionGuestSuggestBar);
  });
  _guestRoLastW=new WeakMap();
  document.querySelectorAll('.gbtn-group').forEach(g=>_guestBtnRO.observe(g));
  document.querySelectorAll('.gfilter-group').forEach(g=>_guestBtnRO.observe(g));
  // Also observe the panel/topbar containers so width changes propagate.
  const panel=document.getElementById('guest-sticky-panel'); if(panel) _guestBtnRO.observe(panel);
  const tb=document.getElementById('topbar-actions'); if(tb) _guestBtnRO.observe(tb);
}
window.addEventListener('resize', ()=>{ if(document.querySelector('.gbtn-group,.gfilter-group')) _fitGuestBtns(); if(typeof _positionGuestSuggestBar==='function') _positionGuestSuggestBar(); });

function toggleGuestSectionHide(key){
  if(_hiddenGuestSections.has(key)) _hiddenGuestSections.delete(key);
  else _hiddenGuestSections.add(key);
  try{ localStorage.setItem(_HIDDEN_KEY, JSON.stringify([..._hiddenGuestSections])); }catch(e){}
  const c=document.getElementById('main-content');
  const actions=document.getElementById('topbar-actions');
  if(c&&actions) renderGuests(c,actions);
}

// Popup to choose which count sections are visible (select mode)
const _GUEST_COUNT_SECTIONS=[
  {key:'guestsgrp',  label:'Guests',          group:'Counts'},
  {key:'blist',      label:'B List & (total)',labelHtml:'<span style="white-space:nowrap">B List</span> <span style="white-space:nowrap">&amp; (total)</span>',group:'Counts'},
  {key:'rsvp',       label:'RSVP',            group:'Counts'},
  {key:'groups',     label:'Groups',          group:'Counts'},
  {key:'f_all',      label:'All guests',      group:'Filter'},
  {key:'f_attending',label:'Attending',       group:'Filter'},
  {key:'f_declined', label:'Declined',        group:'Filter'},
  {key:'f_awaiting', label:'Awaiting',        group:'Filter'},
  {key:'blistfilter',label:'B List',           group:'Filter'},
  {key:'g_singles',  label:'Singles',           group:'Filter'},
  {key:'g_couples',  label:'Couples',           group:'Filter'},
  {key:'g_families', label:'Families',          group:'Filter'},
  {key:'tags',       label:'Tags',              group:'Filter'},
  {key:'gf_role',    label:'Role',              group:'Fields'},
  {key:'gf_phone',   label:'Phone',             group:'Fields'},
  {key:'gf_email',   label:'Email',             group:'Fields'},
  {key:'gf_handle',  label:'IG / Messenger',    group:'Fields'},
  {key:'gf_address', label:'Address',           group:'Fields'},
  {key:'gf_tags',    label:'Tags',              group:'Fields'},
  {key:'gf_dietary', label:'Dietary',           group:'Fields'}
];

// ── Editable guest table (the bulk/Edit view) ──
// Each column: key, label, type. 'name' is fixed first and not in this list.
const _GUEST_TBL_COLS=[
  {key:'role',    label:'Role',    type:'text'},
  {key:'rsvp',    label:'RSVP',    type:'rsvp'},
  {key:'tags',    label:'Tags',    type:'tags'},
  {key:'dietary', label:'Dietary', type:'diet'},
  {key:'phone',   label:'Phone',   type:'text'},
  {key:'email',   label:'Email',   type:'text'},
  {key:'handle',  label:'IG / Messenger', type:'text'},
  {key:'address', label:'Address', type:'text'},
  {key:'list',    label:'List',    type:'list'}
];
const _GUEST_TBL_KEYS=_GUEST_TBL_COLS.map(c=>c.key);
const _GUEST_TBL_DEFAULT_SHOWN={role:true,rsvp:true,tags:true,dietary:true,phone:true,email:false,handle:true,address:false,list:false};
// Which columns are shown (persisted). Missing key → default.
function _guestTblCols(){
  const saved=(STATE.settings&&STATE.settings.guestTableCols)||null;
  const out={};
  _GUEST_TBL_KEYS.forEach(k=>{ out[k]=saved&&typeof saved[k]==='boolean'?saved[k]:!!_GUEST_TBL_DEFAULT_SHOWN[k]; });
  return out;
}
// Column order (persisted), validated against known keys.
function _guestTblColOrder(){
  let ord=(STATE.settings&&Array.isArray(STATE.settings.guestTableColOrder))?STATE.settings.guestTableColOrder.slice():[];
  ord=ord.filter(k=>_GUEST_TBL_KEYS.indexOf(k)>=0);
  _GUEST_TBL_KEYS.forEach(k=>{ if(ord.indexOf(k)<0) ord.push(k); });
  return ord;
}
function _guestTblSetCol(key,on){
  if(!STATE.settings.guestTableCols) STATE.settings.guestTableCols={};
  STATE.settings.guestTableCols[key]=!!on;
  saveToStorage();
  _guestCaptureHideScroll();
  renderGuestList();
  _guestReopenHideMenu();
}
function _guestTblMoveCol(dragKey,targetKey,after){
  if(dragKey===targetKey) return;
  let ord=_guestTblColOrder();
  const from=ord.indexOf(dragKey);
  if(from<0) return;
  ord.splice(from,1);
  let ti=ord.indexOf(targetKey);
  if(ti<0) ti=ord.length-1;
  ord.splice(after?ti+1:ti, 0, dragKey);
  STATE.settings.guestTableColOrder=ord;
  saveToStorage();
  _guestCaptureHideScroll();
  renderGuestList();
  _guestReopenHideMenu();
}
// Drag handlers for the column-reorder rows in the cog menu.
let _gtDragCol=null;
function _gtColDragStart(e,key){ _gtDragCol=key; try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',key);}catch(_){} e.stopPropagation(); }
function _gtColDragOver(e,key){
  e.preventDefault(); const row=e.currentTarget; const r=row.getBoundingClientRect();
  const after=(e.clientY-r.top)>r.height/2;
  row.style.borderTop=after?'':'2px solid var(--gold-deep)';
  row.style.borderBottom=after?'2px solid var(--gold-deep)':'';
}
function _gtColDragLeave(e){ const row=e.currentTarget; row.style.borderTop=''; row.style.borderBottom=''; }
function _gtColDrop(e,key){
  e.preventDefault(); const row=e.currentTarget; const r=row.getBoundingClientRect();
  const after=(e.clientY-r.top)>r.height/2;
  row.style.borderTop=''; row.style.borderBottom='';
  if(_gtDragCol) _guestTblMoveCol(_gtDragCol,key,after);
  _gtDragCol=null;
}

function _guestEyeRow(s,last){
  const shown=!_hiddenGuestSections.has(s.key);
  return `<div class="gcb-row" data-k="${s.key}" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 2px;${last?'':'border-bottom:1px solid var(--border);'}">
    <span class="gcb-lbl" style="font-size:12.5px;color:${shown?'var(--ink)':'var(--muted)'};white-space:normal">${s.labelHtml||s.label}</span>
    ${_toggleSwitch(shown, `toggleGuestCountDraft('${s.key}')`)}
  </div>`;
}
function openGuestCountsPopup(){
  const heading=g=>`<div style="font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:0 0 2px">${g}</div>`;
  const counts=_GUEST_COUNT_SECTIONS.filter(s=>s.group==='Counts');
  const filters=_GUEST_COUNT_SECTIONS.filter(s=>s.group==='Filter');
  const countsRows=counts.map((s,i)=>_guestEyeRow(s,i===counts.length-1)).join('');
  const filterRows=filters.map((s,i)=>_guestEyeRow(s,i===filters.length-1)).join('');
  const body=`<div style="width:max-content;max-width:100%">
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
      <button onclick="setAllGuestCounts(true)" style="background:none;border:none;color:var(--gold-deep);cursor:pointer;font-size:10.5px;text-decoration:underline;font-family:inherit;padding:0">Reset</button>
    </div>
    <div style="display:flex;gap:22px">
      <div>${heading('Counts')}<div id="gcb-counts">${countsRows}</div></div>
      <div style="border-left:1px solid var(--border);padding-left:20px">
        ${heading('Filter')}
        <div id="gcb-filter-toggle-row">${_guestFilterToggleAllRow()}</div>
        <div id="gcb-filters">${filterRows}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:16px"><button onclick="closeModalDirect()" class="btn btn-primary btn-sm" style="font-size:11.5px;padding:4px 16px">Done</button></div>
  </div>`;
  openModal('Show / hide items', body, '');
  const mb=document.getElementById('modal-box'); if(mb) mb.classList.add('modal-fit');
}
// Card-only "Card fields" popup — controls which fields appear on each guest card.
// Reuses the same Fields toggles (gf_*) and _hiddenGuestSections store.
function openCardFieldsPopup(){
  const fields=_GUEST_COUNT_SECTIONS.filter(s=>s.group==='Fields');
  const fieldRows=fields.map((s,i)=>_guestEyeRow(s,i===fields.length-1)).join('');
  const body=`<div class="card-fields-body" style="width:max-content;max-width:100%;min-width:150px">
    <div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px">Choose which details show on each guest card.</div>
    <div id="gcb-fields">${fieldRows}</div>
    <div style="display:flex;justify-content:flex-end;margin-top:16px"><button onclick="closeModalDirect()" class="btn btn-primary btn-sm" style="font-size:11.5px;padding:4px 16px">Done</button></div>
  </div>`;
  openModal('Card fields', body, '');
  const mb=document.getElementById('modal-box'); if(mb) mb.classList.add('modal-fit');
}
// "Toggle ALL off/on" row for the Filter column.
// ON = all filters currently visible (clicking will hide all).
// OFF = one or more filters hidden (clicking will show all).
function _guestFilterToggleAllRow(){
  const filters=_GUEST_COUNT_SECTIONS.filter(s=>s.group==='Filter');
  const allOn=filters.every(s=>!_hiddenGuestSections.has(s.key));
  return `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 2px;margin-bottom:4px;border-bottom:1.5px solid var(--border)">
    <span style="font-size:12px;color:var(--gold-deep);font-weight:600;white-space:normal"><span style="white-space:nowrap">Toggle ALL</span> <span style="white-space:nowrap">off/on</span></span>
    ${_toggleSwitch(allOn, 'toggleAllGuestFilters()')}
  </div>`;
}
function toggleAllGuestFilters(){
  _guestCaptureHideScroll();
  const filters=_GUEST_COUNT_SECTIONS.filter(s=>s.group==='Filter');
  const allOn=filters.every(s=>!_hiddenGuestSections.has(s.key));
  // If all on → hide all. If any hidden → show all.
  filters.forEach(s=>{
    if(allOn) _hiddenGuestSections.add(s.key);
    else _hiddenGuestSections.delete(s.key);
  });
  try{ localStorage.setItem(_HIDDEN_KEY, JSON.stringify([..._hiddenGuestSections])); }catch(e){}
  const c=document.getElementById('main-content'); const a=document.getElementById('topbar-actions');
  if(c&&a) renderGuests(c,a);
  // Refresh the popup rows in place
  const toggleRow=document.getElementById('gcb-filter-toggle-row');
  if(toggleRow) toggleRow.innerHTML=_guestFilterToggleAllRow();
  _refreshGuestEyeIcons();
}
function _refreshGuestEyeIcons(){
  // Rebuild the toggle rows in place so each pill reflects current shown/hidden state.
  const counts=_GUEST_COUNT_SECTIONS.filter(s=>s.group==='Counts');
  const fields=_GUEST_COUNT_SECTIONS.filter(s=>s.group==='Fields');
  const filters=_GUEST_COUNT_SECTIONS.filter(s=>s.group==='Filter');
  const set=(id,rows)=>{ const el=document.getElementById(id); if(el) el.innerHTML=rows.map((s,i)=>_guestEyeRow(s,i===rows.length-1)).join(''); };
  set('gcb-counts',counts); set('gcb-fields',fields); set('gcb-filters',filters);
  // Also refresh the toggle-all row so its ON/OFF state stays in sync
  const toggleRow=document.getElementById('gcb-filter-toggle-row');
  if(toggleRow) toggleRow.innerHTML=_guestFilterToggleAllRow();
}
function toggleGuestCountDraft(key){
  _guestCaptureHideScroll();
  const willHide=!_hiddenGuestSections.has(key); // about to hide if currently shown
  toggleGuestSectionHide(key); // persists + re-renders the page (incl. topbar) live
  // Hiding the B list filter also hides the B list count
  if(key==='blistfilter' && willHide && !_hiddenGuestSections.has('blist')){ toggleGuestSectionHide('blist'); }
  // Re-showing the B list filter re-shows the B list count
  if(key==='blistfilter' && !willHide && _hiddenGuestSections.has('blist')){ toggleGuestSectionHide('blist'); }
  // The topbar (and this dropdown) were just rebuilt — reopen it so it stays put.
  if(_guestHideMenuOpen) _guestReopenHideMenu();
  else _refreshGuestEyeIcons();
}
function setAllGuestCounts(show){
  _guestCaptureHideScroll();
  _GUEST_COUNT_SECTIONS.forEach(s=>{ if(show)_hiddenGuestSections.delete(s.key); else _hiddenGuestSections.add(s.key); });
  try{ localStorage.setItem(_HIDDEN_KEY, JSON.stringify([..._hiddenGuestSections])); }catch(e){}
  const c=document.getElementById('main-content'); const a=document.getElementById('topbar-actions'); if(c&&a) renderGuests(c,a);
  if(_guestHideMenuOpen) _guestReopenHideMenu(); else _refreshGuestEyeIcons();
}

// ── Anchored "Columns" dropdown (edit mode): Table columns chooser only ──
let _guestHideMenuOpen=false;
function _guestHideMenuHtml(){
  // Re-entry to the import suggestions (couples/families/plus-ones), shown only
  // while a suggestion set still exists this session.
  const liveN=_groupSuggestions.filter(s=>_grIsLive(s)).length;
  // Always shown when suggestions exist: restores the banner if dismissed, otherwise banner is already visible.
  const reviewRow=liveN?`<div onclick="event.stopPropagation();_showGroupBanner()" style="display:flex;align-items:center;gap:8px;padding:8px 9px;margin:-3px -5px 9px;background:rgba(196,168,130,.14);border:.5px solid var(--gold);border-radius:8px;cursor:pointer">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" style="flex-shrink:0"><circle cx="9" cy="12" r="5.2"/><circle cx="15" cy="12" r="5.2"/></svg>
      <span style="font-size:12px;font-weight:600;color:var(--ink);flex:1">Show suggested groups</span>
      <span style="font-size:10px;font-weight:700;color:var(--gold-deep);background:rgba(196,168,130,.25);border-radius:9px;padding:1px 6px">${liveN}</span>
    </div>`:'';
  return `<div id="guest-hide-menu" style="display:${_guestHideMenuOpen?'block':'none'};position:absolute;top:calc(100% + 6px);right:0;z-index:60;width:236px;max-height:70vh;overflow-y:auto;background:var(--cream);border:1px solid var(--border);border-radius:11px;box-shadow:0 4px 24px rgba(26,26,24,.12);padding:13px 15px;text-align:left">
    ${reviewRow}
    ${_guestTblColMenuSection()}
  </div>`;
}
// The Table-columns chooser (shown at the top of the bulk cog menu). Tick to show,
// drag to reorder. Name is always the fixed first column.
function _guestTblColMenuSection(){
  const c=_guestTblCols();
  const order=_guestTblColOrder();
  const labels={}; _GUEST_TBL_COLS.forEach(x=>labels[x.key]=x.label);
  const grip=`<svg class="dragrow-grip" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--muted);cursor:grab;flex-shrink:0;pointer-events:none"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg>`;
  const rows=order.map(key=>`
    <div draggable="true" class="dragrow"
      ondragstart="_gtColDragStart(event,'${key}')"
      ondragover="_gtColDragOver(event,'${key}')"
      ondragleave="_gtColDragLeave(event)"
      ondrop="_gtColDrop(event,'${key}')"
      style="display:flex;align-items:center;gap:8px;font-size:12px;color:${c[key]?'var(--ink)':'var(--muted)'};padding:5px 2px;border-radius:6px">
      ${grip}
      <label onclick="event.stopPropagation()" style="display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;min-width:0;pointer-events:none">
        <input type="checkbox" ${c[key]?'checked':''} onchange="_guestTblSetCol('${key}',this.checked)" style="width:15px;height:15px;accent-color:var(--gold-deep);cursor:pointer;flex-shrink:0;pointer-events:auto"/>
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${labels[key]}</span>
      </label>
    </div>`).join('');
  return `<div style="margin:-3px -5px 10px;padding:9px 10px;background:rgba(196,168,130,.08);border:.5px solid var(--border);border-radius:8px">
    <div style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:2px">Table columns</div>
    <div style="font-size:9.5px;color:var(--muted);margin-bottom:6px">Tick to show · drag to reorder</div>
    <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);padding:4px 2px;opacity:.8">
      <span style="width:11px;flex-shrink:0"></span>
      <input type="checkbox" checked disabled style="width:15px;height:15px;accent-color:var(--muted);flex-shrink:0"/>
      <span style="flex:1">Name</span><span style="font-size:9px">always 1st</span>
    </div>
    ${rows}
  </div>`;
}
// ── Anchored "Filters" cog dropdown (normal list view): Hide / show filters ──
function _guestToggleHideMenu(e){
  if(e) e.stopPropagation();
  const m=document.getElementById('guest-hide-menu');
  if(!m) return;
  const showing=m.style.display!=='none' && m.style.display!=='';
  m.style.display=showing?'none':'block';
  _guestHideMenuOpen=!showing;
  if(_guestHideMenuOpen) _guestAttachHideCloser();
}
let _guestFilterMenuOpen=false;
let _guestFilterCloser=null;
// Shared "Go to B List" / "Back to Primary list" cog row. Toggles the B-list
// filter and closes whichever cog menu invoked it.
function _bListCogRowHtml(closeFn){
  const onB = (STATE.guestFilter && STATE.guestFilter.list==='B');
  const label = onB ? 'Back to Primary list' : 'Go to B List';
  const badge = onB ? 'A' : 'B';
  return `<div style="height:1px;background:var(--border);margin:5px 4px"></div>
    <div onclick="event.stopPropagation();${closeFn};toggleBListFilter()" style="display:flex;align-items:center;gap:9px;padding:9px 8px;border-radius:7px;font-size:13px;font-weight:500;color:var(--gold-deep);cursor:pointer" onmouseover="this.style.background='rgba(196,168,130,.1)'" onmouseout="this.style.background=''"><span style="font-size:9px;font-weight:700;background:var(--muted);color:#fff;padding:1px 5px;border-radius:3px;flex-shrink:0">${badge}</span>${label}</div>`;
}
let _guestFilterSubOpen=false; // 'columns' submenu visible in the filter cog
function _guestFilterMenuHtml(){
  const tagsIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const eyeIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const colsIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>';
  const chevron='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:.5"><polyline points="9 18 15 12 9 6"/></svg>';
  const backIcon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="15 18 9 12 15 6"/></svg>';
  const liveN=_groupSuggestions.filter(s=>_grIsLive(s)).length;
  const groupsIcon2='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" style="flex-shrink:0"><circle cx="9" cy="12" r="5.2"/><circle cx="15" cy="12" r="5.2"/></svg>';
  const groupsRow2=liveN?`<div onclick="event.stopPropagation();_guestFilterMenuClose();_showGroupBanner()" style="display:flex;align-items:center;gap:9px;padding:8px 9px;margin:0 0 6px;background:rgba(196,168,130,.14);border:.5px solid var(--gold);border-radius:8px;cursor:pointer">
      ${groupsIcon2}<span style="font-size:13px;font-weight:600;color:var(--ink);flex:1">Show suggested groups</span>
      <span style="font-size:10px;font-weight:700;color:var(--gold-deep);background:rgba(196,168,130,.25);border-radius:9px;padding:1px 6px">${liveN}</span>
    </div>`:'';
  const mainView=`
    ${groupsRow2}
    <div onclick="event.stopPropagation();_guestFilterMenuClose();openManageTags()" style="display:flex;align-items:center;gap:9px;padding:9px 8px;border-radius:7px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer" onmouseover="this.style.background='rgba(196,168,130,.1)'" onmouseout="this.style.background=''">${tagsIcon}Manage tags</div>
    <div onclick="event.stopPropagation();_guestFilterMenuClose();openGuestCountsPopup()" style="display:flex;align-items:center;justify-content:space-between;padding:9px 8px;border-radius:7px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer" onmouseover="this.style.background='rgba(196,168,130,.1)'" onmouseout="this.style.background=''">
      <span style="display:inline-flex;align-items:center;gap:8px">${eyeIcon}Hide / show filters</span>${chevron}
    </div>
    <div onclick="event.stopPropagation();_guestFilterSubToggle(true)" style="display:flex;align-items:center;justify-content:space-between;padding:9px 8px;border-radius:7px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer" onmouseover="this.style.background='rgba(196,168,130,.1)'" onmouseout="this.style.background=''">
      <span style="display:inline-flex;align-items:center;gap:8px">${colsIcon}Columns</span>${chevron}
    </div>
    <div style="height:1px;background:var(--border);margin:5px 4px"></div>
    <div onclick="event.stopPropagation();_toggleAgeBadges()" style="display:flex;align-items:center;justify-content:space-between;padding:9px 8px;border-radius:7px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer" onmouseover="this.style.background='rgba(196,168,130,.1)'" onmouseout="this.style.background=''">
      <span style="display:inline-flex;align-items:center;gap:8px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>Show age badges</span>
      <span style="position:relative;display:inline-flex;align-items:center;width:34px;height:20px;border-radius:10px;background:${(STATE.settings&&STATE.settings.showAgeBadges!==false)?'var(--green)':'var(--border)'};flex-shrink:0"><span style="position:absolute;left:${(STATE.settings&&STATE.settings.showAgeBadges!==false)?'16px':'2px'};width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span></span>
    </div>
    ${_bListCogRowHtml('_guestFilterMenuClose()')}`;
  const colsView=`
    <div onclick="event.stopPropagation();_guestFilterSubToggle(false)" style="display:flex;align-items:center;gap:8px;padding:7px 8px 9px;border-radius:7px;font-size:12px;font-weight:600;color:var(--gold-deep);cursor:pointer">${backIcon}Back</div>
    ${_guestTblColMenuSection()}`;
  return `<div id="guest-filter-menu" style="display:${_guestFilterMenuOpen?'block':'none'};position:absolute;top:calc(100% + 6px);right:0;z-index:60;width:236px;max-height:70vh;overflow-y:auto;background:var(--cream);border:1px solid var(--border);border-radius:11px;box-shadow:0 4px 24px rgba(26,26,24,.12);padding:6px;text-align:left">
    ${_guestFilterSubOpen?colsView:mainView}
  </div>`;
}
function _guestFilterSubToggle(show){
  _guestFilterSubOpen=!!show;
  const m=document.getElementById('guest-filter-menu');
  if(m && _guestFilterMenuOpen){ m.innerHTML=_guestFilterMenuTmpInner(); }
}
function _guestFilterMenuTmpInner(){
  const tmp=document.createElement('div');
  tmp.innerHTML=_guestFilterMenuHtml();
  const inner=tmp.firstElementChild;
  return inner?inner.innerHTML:'';
}
function _guestFilterMenuToggle(e){
  if(e) e.stopPropagation();
  const m=document.getElementById('guest-filter-menu');
  if(!m) return;
  const showing=m.style.display!=='none' && m.style.display!=='';
  if(showing){ _guestFilterMenuClose(); return; }
  _guestFilterSubOpen=false;
  m.innerHTML=_guestFilterMenuTmpInner();
  m.style.display='block';
  _guestFilterMenuOpen=true;
  _guestFilterAttachCloser();
}
function _guestFilterMenuClose(){
  const m=document.getElementById('guest-filter-menu');
  if(m) m.style.display='none';
  _guestFilterMenuOpen=false; _guestFilterSubOpen=false;
  if(_guestFilterCloser){ document.removeEventListener('click',_guestFilterCloser); _guestFilterCloser=null; }
}
function _guestFilterAttachCloser(){
  if(_guestFilterCloser) document.removeEventListener('click',_guestFilterCloser);
  _guestFilterCloser=(ev)=>{
    const menu=document.getElementById('guest-filter-menu');
    const wrap=document.getElementById('guest-filter-wrap');
    if(menu && wrap && !wrap.contains(ev.target)){ menu.style.display='none'; _guestFilterMenuOpen=false; document.removeEventListener('click',_guestFilterCloser); _guestFilterCloser=null; }
  };
  const c=_guestFilterCloser;
  setTimeout(()=>document.addEventListener('click',c),0);
}

// ── Edit-mode "Edit options" cog menu: Manage tags / Hide-show filters / Columns ▸ ──
// Columns is a secondary submenu holding the table-columns chooser (checkboxes +
// drag-reorder). The chooser reads _guestTblColOrder() fresh on each open so its order
// always matches the rendered table.
let _guestEditMenuOpen=false;
let _guestEditSubOpen=false; // 'columns' submenu visible
let _guestEditCloser=null;
function _guestEditMenuHtml(){
  const row=(label,iconSvg,onclick,trailing)=>`<div onclick="event.stopPropagation();${onclick}" style="display:flex;align-items:center;justify-content:space-between;gap:9px;padding:9px 8px;border-radius:7px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer" onmouseover="this.style.background='rgba(196,168,130,.1)'" onmouseout="this.style.background=''"><span style="display:inline-flex;align-items:center;gap:8px">${iconSvg}${label}</span>${trailing||''}</div>`;
  const tagsIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const eyeIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const colsIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>';
  const chevron='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:.5"><polyline points="9 18 15 12 9 6"/></svg>';
  const backIcon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="15 18 9 12 15 6"/></svg>';
  const liveN=_groupSuggestions.filter(s=>_grIsLive(s)).length;
  const groupsIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" style="flex-shrink:0"><circle cx="9" cy="12" r="5.2"/><circle cx="15" cy="12" r="5.2"/></svg>';
  const groupsRow=liveN?`<div onclick="event.stopPropagation();_guestEditMenuClose();_showGroupBanner()" style="display:flex;align-items:center;gap:9px;padding:8px 9px;margin:0 0 6px;background:rgba(196,168,130,.14);border:.5px solid var(--gold);border-radius:8px;cursor:pointer">
      ${groupsIcon}<span style="font-size:13px;font-weight:600;color:var(--ink);flex:1">Show suggested groups</span>
      <span style="font-size:10px;font-weight:700;color:var(--gold-deep);background:rgba(196,168,130,.25);border-radius:9px;padding:1px 6px">${liveN}</span>
    </div>`:'';
  const mainView=`
    ${groupsRow}
    ${row('Manage tags',tagsIcon,'_guestEditMenuClose();openManageTags()')}
    ${row('Hide / show filters',eyeIcon,'_guestEditMenuClose();openGuestCountsPopup()')}
    ${row('Columns',colsIcon,'_guestEditSubToggle(true)',chevron)}
    ${_bListCogRowHtml('_guestEditMenuClose()')}`;
  const colsView=`
    <div onclick="event.stopPropagation();_guestEditSubToggle(false)" style="display:flex;align-items:center;gap:8px;padding:7px 8px 9px;border-radius:7px;font-size:12px;font-weight:600;color:var(--gold-deep);cursor:pointer">${backIcon}Back</div>
    ${_guestTblColMenuSection()}`;
  return `<div id="guest-edit-menu" style="display:${_guestEditMenuOpen?'block':'none'};position:absolute;top:calc(100% + 6px);right:0;z-index:60;width:236px;max-height:70vh;overflow-y:auto;background:var(--cream);border:1px solid var(--border);border-radius:11px;box-shadow:0 4px 24px rgba(26,26,24,.12);padding:6px;text-align:left">
    ${_guestEditSubOpen?colsView:mainView}
  </div>`;
}
function _guestEditMenuToggle(e){
  if(e) e.stopPropagation();
  const m=document.getElementById('guest-edit-menu');
  if(!m) return;
  const showing=m.style.display!=='none' && m.style.display!=='';
  if(showing){ _guestEditMenuClose(); return; }
  _guestEditSubOpen=false;
  m.style.display='block';
  _guestEditMenuOpen=true;
  _guestEditAttachCloser();
}
function _guestEditSubToggle(show){
  _guestEditSubOpen=!!show;
  const m=document.getElementById('guest-edit-menu');
  if(m && _guestEditMenuOpen){ m.innerHTML=_guestEditMenuTmpInner(); }
}
// Re-render just the inner content of the open edit menu (keeps it open).
function _guestEditMenuTmpInner(){
  const tmp=document.createElement('div');
  tmp.innerHTML=_guestEditMenuHtml();
  const inner=tmp.firstElementChild;
  return inner?inner.innerHTML:'';
}
function _guestEditMenuClose(){
  const m=document.getElementById('guest-edit-menu');
  if(m) m.style.display='none';
  _guestEditMenuOpen=false; _guestEditSubOpen=false;
  if(_guestEditCloser){ document.removeEventListener('click',_guestEditCloser); _guestEditCloser=null; }
}
function _guestEditAttachCloser(){
  if(_guestEditCloser) document.removeEventListener('click',_guestEditCloser);
  _guestEditCloser=(ev)=>{
    const menu=document.getElementById('guest-edit-menu');
    const wrap=document.getElementById('guest-edit-wrap');
    if(menu && wrap && !wrap.contains(ev.target)){ menu.style.display='none'; _guestEditMenuOpen=false; _guestEditSubOpen=false; document.removeEventListener('click',_guestEditCloser); _guestEditCloser=null; }
  };
  const c=_guestEditCloser;
  setTimeout(()=>document.addEventListener('click',c),0);
}
let _guestHideMenuScroll=0;
function _guestCaptureHideScroll(){
  const fm=document.getElementById('guest-filter-menu');
  if(fm && _guestFilterMenuOpen && _guestFilterSubOpen){ _guestHideMenuScroll=fm.scrollTop; return; }
  const em=document.getElementById('guest-edit-menu');
  if(em && _guestEditMenuOpen){ _guestHideMenuScroll=em.scrollTop; return; }
  const m=document.getElementById('guest-hide-menu');
  _guestHideMenuScroll = (m && _guestHideMenuOpen) ? m.scrollTop : 0;
}
function _guestReopenHideMenu(){
  // Legacy name kept because the column chooser calls it after a toggle/reorder.
  // The chooser lives in both the edit menu's and the filter menu's Columns submenu;
  // re-render whichever is open in place so it stays open and reflects the new state.
  const fm=document.getElementById('guest-filter-menu');
  if(fm && _guestFilterMenuOpen && _guestFilterSubOpen){
    fm.innerHTML=_guestFilterMenuTmpInner();
    fm.style.display='block';
    if(_guestHideMenuScroll) fm.scrollTop=_guestHideMenuScroll;
    _guestFilterAttachCloser();
    return;
  }
  const em=document.getElementById('guest-edit-menu');
  if(em && _guestEditMenuOpen){
    _guestEditSubOpen=true;
    em.innerHTML=_guestEditMenuTmpInner();
    em.style.display='block';
    _guestEditAttachCloser();
    return;
  }
  const m=document.getElementById('guest-hide-menu');
  if(m){ m.style.display='block'; _guestHideMenuOpen=true; if(_guestHideMenuScroll) m.scrollTop=_guestHideMenuScroll; _guestAttachHideCloser(); }
}
function _guestCloseHideMenu(){
  const m=document.getElementById('guest-hide-menu');
  if(m) m.style.display='none';
  _guestHideMenuOpen=false;
  if(_guestHideCloser){ document.removeEventListener('click',_guestHideCloser); _guestHideCloser=null; }
}
function _guestAttachHideCloser(){
  if(_guestHideCloser) document.removeEventListener('click',_guestHideCloser);
  _guestHideCloser=(ev)=>{
    const menu=document.getElementById('guest-hide-menu');
    const wrap=document.getElementById('guest-hide-wrap');
    if(menu && wrap && !wrap.contains(ev.target)){ menu.style.display='none'; _guestHideMenuOpen=false; document.removeEventListener('click',_guestHideCloser); _guestHideCloser=null; }
  };
  const c=_guestHideCloser;
  setTimeout(()=>document.addEventListener('click',c),0);
}
let _guestHideCloser=null;

// ── Card-view "View options" cog menu (Card fields… + Show / hide items…) ──
let _cardCogOpen=false;
let _cardCogCloser=null;
function _cardCogMenuHtml(){
  const item=(label,iconSvg,onclick)=>`<div onclick="event.stopPropagation();_cardCogClose();${onclick}" style="display:flex;align-items:center;gap:9px;padding:9px 8px;border-radius:7px;font-size:13px;color:var(--ink);cursor:pointer" onmouseover="this.style.background='rgba(196,168,130,.1)'" onmouseout="this.style.background=''">${iconSvg}<span>${label}</span></div>`;
  const fieldsIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';
  const eyeIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const tagsIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const liveN=_groupSuggestions.filter(s=>_grIsLive(s)).length;
  const groupsIcon='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" style="flex-shrink:0"><circle cx="9" cy="12" r="5.2"/><circle cx="15" cy="12" r="5.2"/></svg>';
  const groupsRow=liveN?`<div onclick="event.stopPropagation();_cardCogClose();_showGroupBanner()" style="display:flex;align-items:center;gap:9px;padding:8px 9px;margin:3px 0 3px;background:rgba(196,168,130,.14);border:.5px solid var(--gold);border-radius:8px;cursor:pointer">
      ${groupsIcon}<span style="font-size:13px;font-weight:600;color:var(--ink);flex:1">Show suggested groups</span>
      <span style="font-size:10px;font-weight:700;color:var(--gold-deep);background:rgba(196,168,130,.25);border-radius:9px;padding:1px 6px">${liveN}</span>
    </div>
    <div style="height:1px;background:var(--border);margin:3px 0"></div>`:'';
  return `<div id="card-cog-menu" style="display:${_cardCogOpen?'block':'none'};position:absolute;top:calc(100% + 6px);right:0;z-index:60;width:220px;background:var(--cream);border:1px solid var(--border);border-radius:11px;box-shadow:0 4px 24px rgba(26,26,24,.12);padding:6px;text-align:left">
    ${groupsRow}
    ${item('Manage tags',tagsIcon,'openManageTags()')}
    ${item('Hide / show filters…',eyeIcon,'openGuestCountsPopup()')}
    ${item('Card fields…',fieldsIcon,'openCardFieldsPopup()')}
    <div style="height:1px;background:var(--border);margin:5px 4px"></div>
    <div onclick="event.stopPropagation();_toggleAgeBadges()" style="display:flex;align-items:center;justify-content:space-between;padding:9px 8px;border-radius:7px;font-size:13px;font-weight:500;color:var(--ink);cursor:pointer" onmouseover="this.style.background='rgba(196,168,130,.1)'" onmouseout="this.style.background=''">
      <span style="display:inline-flex;align-items:center;gap:8px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>Show age badges</span>
      <span style="position:relative;display:inline-flex;align-items:center;width:34px;height:20px;border-radius:10px;background:${(STATE.settings&&STATE.settings.showAgeBadges!==false)?'var(--green)':'var(--border)'};flex-shrink:0"><span style="position:absolute;left:${(STATE.settings&&STATE.settings.showAgeBadges!==false)?'16px':'2px'};width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span></span>
    </div>
    ${_bListCogRowHtml('_cardCogClose()')}
  </div>`;
}
function _cardCogToggle(e){
  if(e) e.stopPropagation();
  const m=document.getElementById('card-cog-menu');
  if(!m) return;
  const showing=m.style.display!=='none' && m.style.display!=='';
  if(!showing) _closeFloatingMenus('card-cog-menu');
  m.style.display=showing?'none':'block';
  _cardCogOpen=!showing;
  if(_cardCogOpen) _cardCogAttachCloser();
}
function _cardCogClose(){
  const m=document.getElementById('card-cog-menu');
  if(m) m.style.display='none';
  _cardCogOpen=false;
  if(_cardCogCloser){ document.removeEventListener('click',_cardCogCloser); _cardCogCloser=null; }
}
function _cardCogAttachCloser(){
  if(_cardCogCloser) document.removeEventListener('click',_cardCogCloser);
  _cardCogCloser=(ev)=>{
    const menu=document.getElementById('card-cog-menu');
    const wrap=document.getElementById('card-cog-wrap');
    if(menu && wrap && !wrap.contains(ev.target)){ menu.style.display='none'; _cardCogOpen=false; document.removeEventListener('click',_cardCogCloser); _cardCogCloser=null; }
  };
  const c=_cardCogCloser;
  setTimeout(()=>document.addEventListener('click',c),0);
}

function _toggleAgeBadges(){
  if(!STATE.settings) return;
  STATE.settings.showAgeBadges=STATE.settings.showAgeBadges===false?true:false;
  saveToStorage();
  renderGuestList();
}

function setGuestSearch(val){
  STATE.guestFilter.query=val.toLowerCase().trim();
  renderGuestList();
}
function _guestGroupFilterShown(key){ return !_hiddenGuestSections.has(key); }
function setGuestFilter(val){ STATE.guestFilter.status=val; navigate('guests'); }
function setGuestGroupFilter(val){
  // single-select: clicking the active one clears back to all
  STATE.guestFilter.group = STATE.guestFilter.group===val ? 'all' : val;
  navigate('guests');
}
function guestGroupOf(g){
  if(g.coupleId) return 'couples';
  if((STATE.families||[]).some(f=>f.memberIds.includes(g.id))) return 'families';
  return 'singles';
}
// A guest can belong to more than one group at once (e.g. a couple who are also part
// of a family). This tests membership of a specific group independently, so the
// Families filter includes couples-within-families, and vice-versa.
function guestInGroup(g, group){
  if(group==='all') return true;
  if(group==='couples'){
    // Primary host of a +1 pair: has plusOneId
    if(g.plusOneId) return true;
    // Member of a proper couple: mutual coupleId links (both point to each other)
    if(g.coupleId){
      const partner=(STATE.guests||[]).find(x=>x.id===g.coupleId);
      // Mutual link → proper couple member
      if(partner && partner.coupleId===g.id) return true;
      // This guest IS the +1 of their partner — include so both show in couples view
      if(partner && partner.plusOneId===g.id) return true;
    }
    return false;
  }
  if(group==='families') return (STATE.families||[]).some(f=>f.memberIds.includes(g.id));
  // Singles: truly solo — not coupled, not hosting a +1, not a +1 themselves, not in a family.
  if(group==='singles') return !g.coupleId && !g.plusOneId && g.isMain!==false && !(STATE.families||[]).some(f=>f.memberIds.includes(g.id));
  return guestGroupOf(g)===group;
}
function toggleBListFilter(){
  STATE.guestFilter.list = STATE.guestFilter.list==='B' ? 'all' : 'B';
  navigate('guests');
}
function toggleTagFilter(tag){
  const i=STATE.guestFilter.tags.indexOf(tag);
  if(i>=0)STATE.guestFilter.tags.splice(i,1); else STATE.guestFilter.tags.push(tag);
  navigate('guests');
}
function toggleReorder(){ reorderMode=!reorderMode; navigate('guests'); }
// Reorder now lives inside bulk (Edit) mode: the Reorder button sits beside the
// bulk cog. Reorder is now a sub-mode of the bulk TABLE view: bulkMode stays ON
// (the table renders), reorderMode just adds the per-group drag handles. The table's
// checkbox is its own cell, so there's no row click/drag conflict to avoid.
let _reorderFromBulk=false;
function enterReorderFromBulk(){
  _reorderFromBulk=true;
  _guestHideMenuOpen=false;
  reorderMode=true;            // bulkMode stays true so the table keeps rendering
  navigate('guests');
}
function exitReorderToBulk(){
  reorderMode=false;
  _reorderFromBulk=false;      // bulkMode already true; just drop the handles
  navigate('guests');
}

function guestPassesFilter(g){
  const sf=STATE.guestFilter;
  const q=sf.query||'';
  if(q){
    const _byId=(STATE.guests||[]).reduce((m,x)=>{m[x.id]=x;return m;},{});
    const linkedNames=[];
    const fam=(STATE.families||[]).find(f=>f.memberIds&&f.memberIds.includes(g.id));
    if(fam) fam.memberIds.forEach(id=>{if(id!==g.id&&_byId[id])linkedNames.push(_byId[id].name||'');});
    if(g.coupleId&&_byId[g.coupleId]) linkedNames.push(_byId[g.coupleId].name||'');
    if(g.plusOneId&&_byId[g.plusOneId]) linkedNames.push(_byId[g.plusOneId].name||'');
    const host=(STATE.guests||[]).find(x=>x.plusOneId===g.id);
    if(host) linkedNames.push(host.name||'');
    const hay=[g.name,g.phone||'',g.email||'',g.address||'',g.relationship||'',...(g.tags||[]),...linkedNames].join(' ').toLowerCase();
    if(!hay.includes(q)) return false;
  }
  const gList=g.listType||'A';
  if(sf.list==='B'){ if(gList!=='B') return false; }
  else { if(gList==='B') return false; }
  if(!(sf.status==='all'||g.rsvp===sf.status)) return false;
  if(sf.group&&sf.group!=='all'){
    // Special case: status+singles — a coupled/plusone guest whose partner has a different
    // RSVP status passes through so they can appear solo with a partner note.
    if(sf.group==='singles'&&sf.status!=='all'&&(g.coupleId||g.plusOneId)){
      const partnerId=g.coupleId||g.plusOneId;
      const partner=STATE.guests.find(x=>x.id===partnerId);
      const partnerRsvp=partner?(partner.rsvp||'awaiting'):'';
      if((g.rsvp||'awaiting')===partnerRsvp) return false; // same status → not a special case
      // falls through — different RSVP, show solo with note
    } else if(!guestInGroup(g, sf.group)){
      return false;
    }
  }
  if(sf.tags.length&&!sf.tags.every(t=>(g.tags||[]).includes(t))) return false;
  return true;
}
function _couplePartnerNote(partner){
  const status=partner.rsvp||'awaiting';
  const color=status==='attending'?'var(--green)':status==='declined'?'#c0392b':'var(--muted)';
  const verb=status==='attending'?'is attending':status==='declined'?'has declined':'is awaiting';
  return `<div style="font-size:11px;color:var(--muted);padding:3px 14px 9px;display:flex;align-items:center;gap:5px;margin-top:-3px">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="9" cy="12" r="5.2"/><circle cx="15" cy="12" r="5.2"/></svg>
    <span>Linked: <strong style="font-weight:600">${_escHtml(partner.name)}</strong> <span style="color:${color}">${verb}</span></span>
  </div>`;
}
// ── Editable guest table (rendered in bulk/Edit mode) ──────────────────────
// Sortable columns (phone/email/address deliberately excluded). 'name' is sortable
// via the fixed Name header.
const _GT_SORTABLE=new Set(['name','role','rsvp','tags','dietary','handle','list']);
const _RSVP_RANK={awaiting:0,attending:1,declined:2};
// Value used to sort a group by one of its members (the first). Returns a number
// for rsvp (rank) or a lowercased string otherwise; blanks become '' (sort last asc).
function _gtSortValue(g, key){
  if(!g) return '';
  switch(key){
    case 'name': return String(g.name||'').toLowerCase();
    case 'role': {
      const r=(g.relationship&&g.relationship!=='Couple'&&g.relationship!=='Guest'&&g.relationship!=='Plus One')?g.relationship:'';
      return String(r||'~~~').toLowerCase(); // blanks last
    }
    case 'rsvp': return _RSVP_RANK[g.rsvp||'awaiting'] ?? 0;
    case 'tags': return ((g.tags||[]).map(t=>String(t).toLowerCase()).sort().join('|'))||'~~~';
    case 'dietary': return ((g.dietary||[]).map(d=>String(d).toLowerCase()).sort().join('|'))||'~~~';
    case 'handle': return String(g.handle||'~~~').toLowerCase();
    case 'list': return (g.listType||'A')==='B'?1:0;
    default: return String(g[key]||'').toLowerCase();
  }
}
// Cycle a table's sort for a column: asc → desc → off. Shared shape {key,dir}.
function _cycleSort(stateKey, colKey){
  const cur=STATE[stateKey];
  let next;
  if(!cur || cur.key!==colKey) next={key:colKey, dir:'asc'};
  else if(cur.dir==='asc') next={key:colKey, dir:'desc'};
  else next=null; // off
  STATE[stateKey]=next;
  if(typeof saveToStorage==='function') saveToStorage();
}
// Small caret/indicator for a sortable header given the active sort state.
function _sortCaret(active, dir){
  if(!active) return `<svg class="sort-ind" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="opacity:.32;margin-left:4px"><polyline points="8 9 12 5 16 9"/><polyline points="8 15 12 19 16 15"/></svg>`;
  return dir==='desc'
    ? `<svg class="sort-ind on" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-left:4px;color:var(--gold-deep)"><polyline points="6 15 12 21 18 15"/></svg>`
    : `<svg class="sort-ind on" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-left:4px;color:var(--gold-deep)"><polyline points="6 9 12 3 18 9"/></svg>`;
}
function _gtSortClick(colKey){ _cycleSort('guestTableSort', colKey); renderGuestList(); }

function guestTableHtml(list){
  const cShow=_guestTblCols();
  // When viewing the B List (filter active), always show the List column — render-only
  // override that does NOT change the saved guestTableCols, so returning to the Primary
  // list restores whatever the user had toggled.
  if(STATE.guestFilter && STATE.guestFilter.list==='B') cShow.list=true;
  const order=_guestTblColOrder().filter(k=>cShow[k]);
  const labels={}; _GUEST_TBL_COLS.forEach(x=>labels[x.key]=x.label);
  const typeOf={}; _GUEST_TBL_COLS.forEach(x=>typeOf[x.key]=x.type);
  const statusMeta={
    attending:{label:'Attending',bg:'rgba(74,124,89,.14)',fg:'var(--green)'},
    declined:{label:'Declined',bg:'rgba(192,57,43,.12)',fg:'var(--red)'},
    awaiting:{label:'Awaiting',bg:'var(--surface)',fg:'var(--muted)'}
  };
  const dietLabels=DIET_LABELS;

  if(!list.length) return `<div style="font-size:13px;color:var(--muted);padding:18px 0;text-align:center">No guests match this filter.</div>`;

  // Group the visible guests via the shared slot model (couples/families/plus-ones),
  // filtered to those passing the current filter. Order matches the card view.
  const visibleIds=new Set(list.map(g=>g.id));
  const allSlots=buildSlots();
  // Each render slot: {key,type,members:[guest,...], couples:[[startIdx,endIdx],...]}.
  // For families we reorder members (display only) so any couple within sits adjacently,
  // and record the index ranges of those couples so the connector can draw inner brackets.
  const slots=[];
  allSlots.forEach(s=>{
    let members=s.ids.map(id=>STATE.guests.find(g=>g.id===id)).filter(g=>g&&visibleIds.has(g.id));
    if(!members.length) return;
    let couples=[];
    if(s.type==='family'){
      const arranged=_gtArrangeFamily(members); // {members, couples}
      members=arranged.members; couples=arranged.couples;
    }
    slots.push({key:s.key, type:s.type, kind:s.kind, famId:s.famId, members, couples});
  });

  // Click-to-sort: order whole groups by the first member's value for the active
  // sort column. Off (no sort) keeps the natural buildSlots order. Phone/email/
  // address are intentionally not sortable.
  const gtSort=reorderMode?null:STATE.guestTableSort;
  if(gtSort && gtSort.key && _GT_SORTABLE.has(gtSort.key)){
    const dir=gtSort.dir==='desc'?-1:1;
    slots.map((s,i)=>s._i=i);
    slots.sort((a,b)=>{
      const va=_gtSortValue(a.members[0], gtSort.key);
      const vb=_gtSortValue(b.members[0], gtSort.key);
      let c;
      if(typeof va==='number' && typeof vb==='number') c=va-vb;
      else c=String(va).localeCompare(String(vb), undefined, {numeric:true, sensitivity:'base'});
      if(c===0) c=(a._i-b._i); // stable
      return c*dir;
    });
  }

  const th=`padding:8px 11px;font-size:9.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);text-align:left;white-space:nowrap;background:var(--surface)`;
  const gtS=STATE.guestTableSort;
  const sortDisabled=reorderMode; // drag-reorder takes precedence over sort
  const sortableTh=(key,label)=>{
    if(sortDisabled) return `<th style="${th}">${label}</th>`;
    const active=!!(gtS && gtS.key===key);
    return `<th style="${th};cursor:pointer;user-select:none" class="sort-th" onclick="_gtSortClick('${key}')" title="Sort by ${label}"><span style="display:inline-flex;align-items:center">${label}${_sortCaret(active, active?gtS.dir:null)}</span></th>`;
  };
  const plainOrSortTh=(k)=>_GT_SORTABLE.has(k)?sortableTh(k,labels[k]):`<th style="${th}">${labels[k]}</th>`;
  // Leading connector column (always present; carries the group bracket + icon, and
  // the drag handle when reorderMode is on).
  const headCells=`${reorderMode?'':`<th style="${th};width:28px;padding-left:4px;padding-right:4px"></th>`}<th style="${th};width:30px;padding-left:6px;padding-right:6px"></th>${bulkMode?`<th style="${th};width:34px"></th>`:''}${sortableTh('name','Name')}`+order.map(k=>plainOrSortTh(k)).join('');

  const td=`padding:6px 11px;font-size:12px;vertical-align:middle`;
  const editable=`border-radius:5px;cursor:text`;

  const textCellHtml=(g,key,val)=>{
    const v=(val||'').trim();
    // Email can wrap before the @ on narrow screens: allow wrapping, cap width, and put a
    // zero-width break opportunity right before the @ so the whole @domain wraps together.
    const isEmail = key==='email';
    const isRole = key==='role';
    const tdExtra = isEmail ? ';white-space:normal;max-width:200px' : (isRole ? ';white-space:normal;max-width:120px' : '');
    const dispExtra = isEmail ? ';white-space:normal;word-break:break-word' : (isRole ? ';white-space:normal;word-break:break-word' : '');
    let shown;
    if(v){
      shown = _escHtml(v);
      if(isEmail){ const at=shown.indexOf('@'); if(at>=0) shown = shown.slice(0,at)+'<wbr>'+shown.slice(at); }
    } else {
      shown = '<span style="font-style:italic;opacity:.22">add</span>';
    }
    if(key==='handle'){
      // Handle uses the popup editor (handle + platform), not inline text edit.
      const disp = v ? `${_escHtml(_bareHandle(v))}` : '<span style="font-style:italic;opacity:.22">add</span>';
      const plat=_guestHandlePlatform(g);
      const icon = v ? `<span style="color:var(--gold-deep);display:inline-flex;vertical-align:-2px;margin-right:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${_platformIconSvg(plat)}</svg></span>` : '';
      return `<td style="${td}${tdExtra}" class="gt-td" data-gid="${g.id}" data-key="${key}" onclick="_openHandleEditor('${g.id}','renderGuestList')" title="Click to edit handle">
        <span class="gt-disp" style="display:inline-block;min-width:36px;padding:3px 6px;margin:-3px -6px;color:${v?'var(--ink)':'var(--muted)'}">${icon}${disp}</span></td>`;
    }
    return `<td style="${td}${tdExtra}" class="gt-td" data-gid="${g.id}" data-key="${key}" onclick="_gtEditText(this)" title="Click to edit">
      <span class="gt-disp" style="${editable};display:inline-block;min-width:36px;padding:3px 6px;margin:-3px -6px${dispExtra};color:${v?'var(--ink)':'var(--muted)'}">${shown}</span></td>`;
  };

  const cellFor=(g,key,st)=>{
    const type=typeOf[key];
    if(type==='text') return textCellHtml(g,key, key==='role'? ((g.relationship&&g.relationship!=='Couple'&&g.relationship!=='Guest'&&g.relationship!=='Plus One')?g.relationship:'') : g[key]);
    if(type==='rsvp'){
      const m=statusMeta[st];
      return `<td style="${td};white-space:nowrap"><span style="display:inline-flex;align-items:center;font-size:11px;padding:4px 10px;border-radius:13px;background-color:${m.bg};color:${m.fg};font-weight:500;white-space:nowrap">${m.label}</span></td>`;
    }
    if(type==='list'){
      const lt=(g.listType||'A');
      return `<td style="${td};white-space:nowrap"><select onchange="_gtSetList('${g.id}',this.value)" class="form-input"
        style="width:auto;min-width:74px;font-size:11px;padding:4px 22px 4px 9px;border-radius:8px;cursor:pointer">
        <option value="A"${lt==='A'?' selected':''}>Primary</option>
        <option value="B"${lt==='B'?' selected':''}>B List</option>
      </select></td>`;
    }
    if(type==='tags'){
      const tags=(g.tags||[]);
      return `<td style="${td}" class="gt-td" data-gid="${g.id}" data-key="tags" onclick="_gtEditTags(this)" title="Click to edit tags">
        <span class="gt-disp" style="${editable};display:inline-flex;flex-wrap:wrap;gap:3px;padding:2px 4px;margin:-2px -4px;min-width:40px">${
          tags.length?tags.map(t=>_tagChipHtml(t)).join(''):'<span style="color:var(--muted);font-style:italic;font-size:11px;opacity:.22">add</span>'
        }</span></td>`;
    }
    if(type==='diet'){
      const diets=(g.dietary||[]);
      return `<td style="${td}" class="gt-td" data-gid="${g.id}" data-key="dietary" onclick="_gtEditDiet(this)" title="Click to edit dietary">
        <span class="gt-disp" style="${editable};display:inline-flex;flex-wrap:wrap;gap:3px;padding:2px 4px;margin:-2px -4px;min-width:40px">${
          diets.length?diets.map(d=>`<span class="tag${d==='allergy'?' diet-tag-al':''}" style="font-size:9.5px;display:inline-flex;align-items:center;gap:3px"><span style="display:inline-flex;color:var(--gold-deep)">${dietIcons([d])}</span>${_escHtml(_dietWord(g,d))}</span>`).join(''):'<span style="color:var(--muted);font-style:italic;font-size:11px;opacity:.22">add</span>'
        }</span></td>`;
    }
    return `<td style="${td}">—</td>`;
  };

  const colCount = 3 + order.length; // connector + checkbox + name + data cols

  const rowsHtml = slots.map(slot=>{
    const n=slot.members.length;
    const isGroup = slot.type!=='solo' && n>1;
    return slot.members.map((g,i)=>{
      const st=(!g.rsvp||g.rsvp==='awaiting')?'awaiting':g.rsvp;
      const sel=bulkSelected.has(g.id);
      // Name extra note for solo links that didn't expand into multi-rows
      const note = (slot.type==='plusone' && i===1) ? '<span style="color:var(--muted);font-size:11px"> +1</span>' : '';

      const cb=bulkMode?`<td style="${td};text-align:center;padding-left:1px;padding-right:6px" onclick="event.stopPropagation();toggleBulkSelect('${g.id}')">
        <span style="display:inline-flex;width:18px;height:18px;border-radius:5px;border:1.5px solid ${sel?'var(--gold)':'var(--border)'};background:${sel?'var(--gold)':'transparent'};align-items:center;justify-content:center;cursor:pointer">
          ${sel?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':''}
        </span></td>`:'';

      const nameCell=`<td style="${td};white-space:normal;max-width:200px" class="gt-td" data-gid="${g.id}" data-key="name" onclick="_gtEditText(this)" title="Click to edit">
        <span class="gt-disp" style="${editable};display:inline-block;padding:3px 6px;margin:-3px -6px;font-size:13px;color:var(--ink);white-space:normal;word-break:break-word">${_escHtml(g.name)}${note}</span>${_ageBandBadge(g)}</td>`;

      // Connector cell: only on the first row of a slot, spanning all members.
      let connCell='';
      let editCell='';
      if(i===0){
        const shift = reorderMode ? 18 : 0; // drag handle room (matches baseShiftX)
        const cw = ((slot.type==='family' && slot.couples && slot.couples.length) ? 32 : 18) + shift;
        connCell=`<td rowspan="${n}" style="padding:0;width:${cw}px;vertical-align:middle;position:relative" class="gt-conn gt-conn-band">${_gtConnectorHtml(slot, n)}</td>`;
        // Leading edit pencil — one per group, centered via rowspan. Solo guests
        // open the edit form directly; couples/families open a member picker so any
        // member can be reached (not just the lead). Suppressed in reorder mode.
        if(!reorderMode){
          const memberIds=slot.members.map(m=>m.id);
          const editAction = memberIds.length>1
            ? `_gtEditGuestSlot(['${memberIds.join("','")}'])`
            : `openEditGuest('${g.id}')`;
          const aria = memberIds.length>1 ? `Edit ${_escHtml(slot.members.map(m=>m.name).join(' and '))}` : `Edit ${_escHtml(g.name)}`;
          editCell=`<td rowspan="${n}" class="gt-edit-cell gt-conn-band"><button type="button" class="gt-edit-btn" title="Edit details" aria-label="${aria}" onclick="event.stopPropagation();${editAction}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></td>`;
        }
      }

      const cells=editCell+connCell+cb+nameCell+order.map(k=>cellFor(g,k,st)).join('');
      // Top border on the first row of each slot; dashed between members within a group.
      const rowBorder = i===0 ? 'border-top:0.5px solid var(--border)' : (isGroup?'border-top:0.5px dashed var(--border)':'border-top:0.5px solid var(--border)');
      const rowDrop = reorderMode ? ` ondragover="groupDragOver(event,'${slot.key}')" ondragleave="groupDragLeave(event,'${slot.key}')" ondrop="groupDrop(event,'${slot.key}')"` : '';
      return `<tr data-gtrow="${g.id}" data-slot="${slot.key}"${rowDrop} style="${sel?'background:var(--parchment);':''}${rowBorder}">${cells}</tr>`;
    }).join('');
  }).join('');

  return `<div id="gt-scroll" class="gt-scroll" style="overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%;margin-top:0">
    <table style="border-collapse:collapse;border:1px solid var(--border);border-radius:10px;overflow:hidden;width:max-content;max-width:none">
      <thead><tr>${headCells}</tr></thead><tbody>${rowsHtml}</tbody>
    </table>
  </div>`;
}

// Arrange a family's members so any couple within sits adjacently (display order only,
// does not mutate STATE). Returns {members:[...], couples:[[startIdx,endIdx],...]} where
// each range marks a 2-member couple block within the returned members array.
function _gtArrangeFamily(members){
  const byId={}; members.forEach(g=>byId[g.id]=g);
  const used=new Set();
  const out=[]; const couples=[];
  members.forEach(g=>{
    if(used.has(g.id)) return;
    const partner = g.coupleId && byId[g.coupleId] && !used.has(g.coupleId) ? byId[g.coupleId] : null;
    if(partner){
      const start=out.length;
      out.push(g); out.push(partner);
      used.add(g.id); used.add(partner.id);
      couples.push([start, start+1]);
    } else {
      out.push(g); used.add(g.id);
    }
  });
  return {members:out, couples};
}

// SVG path for a rounded bracket "[" that BREAKS in the middle so an icon can sit on the
// line. `x` = vertical-line x; `t`/`b` = top/bottom y of the bracket; `gapTop`/`gapBot`
// bound the break. arm = horizontal arm length toward the rows.
function _gtBracketPath(x,t,b,gapTop,gapBot,arm){
  const r=3, ax=x+arm;
  return `<path d="M${ax} ${t} H${x+r} Q${x} ${t} ${x} ${t+r} L${x} ${gapTop}" fill="none" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`
       + `<path d="M${x} ${gapBot} L${x} ${b-r} Q${x} ${b} ${x+r} ${b} H${ax}" fill="none" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`;
}

// The left connector cell content for a slot. Couples/plus-ones get a single gold bracket;
// families get an outer slate bracket plus inner gold brackets for any nested couple. The
// type icon sits centred ON the vertical line, with the line broken around it. In reorder
// mode a drag handle is added at the far left.
function _gtConnectorHtml(slot, n){
  const isGroup = slot.type!=='solo' && n>1;
  const goldCol='var(--gt-couple, #9A7B2E)';
  const famCol='var(--gt-fam, #5B7BA0)';
  const handle = reorderMode ? `<div draggable="true" data-slot-key="${slot.key}"
      ondragstart="groupDragStart(event,'${slot.key}')" ondragend="groupDragEnd()"
      ondragover="groupDragOver(event,'${slot.key}')" ondragleave="groupDragLeave(event,'${slot.key}')"
      ondrop="groupDrop(event,'${slot.key}')"
      title="Drag to reorder" style="position:absolute;left:0;top:50%;transform:translateY(-50%);cursor:grab;color:var(--muted);display:flex;align-items:center;justify-content:center;width:18px;height:30px;z-index:2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="1.4" fill="currentColor"/><circle cx="9" cy="12" r="1.4" fill="currentColor"/><circle cx="9" cy="18" r="1.4" fill="currentColor"/><circle cx="15" cy="6" r="1.4" fill="currentColor"/><circle cx="15" cy="12" r="1.4" fill="currentColor"/><circle cx="15" cy="18" r="1.4" fill="currentColor"/></svg>
    </div>` : '';
  if(!isGroup) return handle; // solo: just the handle (if reordering)

  const coupleIcon='<circle cx="9" cy="12" r="5.2"/><circle cx="15" cy="12" r="5.2"/>';
  const famIcon='<circle cx="6.8" cy="7.5" r="2.7"/><path d="M2.5 20v-2a4 4 0 0 1 4-4 4 4 0 0 1 .6 0"/><circle cx="17.2" cy="7.5" r="2.7"/><path d="M21.5 20v-2a4 4 0 0 0-4-4 4 4 0 0 0-.6 0"/><circle cx="12" cy="11" r="2.1"/><path d="M8.4 20v-1.4a3.6 3.6 0 0 1 7.2 0V20"/>';
  const houseIcon='<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9.5a.5.5 0 0 0 .5.5H10v-5h4v5h4.5a.5.5 0 0 0 .5-.5V10"/>';
  const houseCol='var(--gt-house, #8A6BA8)';
  const isHousehold = slot.type==='family' && slot.kind==='household';
  const groupCol = isHousehold ? houseCol : famCol;   // outer/group bracket colour
  const groupIcon = isHousehold ? houseIcon : famIcon; // outer/group icon

  // Each member occupies an equal vertical band; centre y of band k = (k+0.5)/n.
  // We work in a 0..100 viewBox stretched to the cell height via preserveAspectRatio:none.
  const H=100;
  const bandCenter=k=>((k+0.5)/n)*H;
  const baseShiftX = reorderMode ? 18 : 0; // make room for the drag handle

  // Icon HTML helper: an absolutely-positioned icon centred on a vertical line at pixel X,
  // at vertical fraction `yFrac` (0..1) of the cell. A small disc of cell bg sits behind it.
  const iconAt=(xPx,yFrac,inner,col,sz)=>`<span style="position:absolute;left:${xPx}px;top:${yFrac*100}%;transform:translate(-50%,-50%);width:${sz+4}px;height:${sz+4}px;display:inline-flex;align-items:center;justify-content:center;color:${col};z-index:1">
      <svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg></span>`;

  const isFamily = slot.type==='family';
  const hasInner = isFamily && slot.couples && slot.couples.length;

  if(!isFamily || !hasInner){
    // Single bracket (plain couple/plus-one, OR a family/household with no inner couples).
    const col = isFamily ? groupCol : goldCol;
    const icon = isFamily ? groupIcon : coupleIcon;
    const lineX = 8 + baseShiftX;        // px position of the vertical line
    const lineVB = lineX;                // viewBox x (1:1 horizontally, width matches px)
    const W = lineX + 9;
    // gap around the icon centred at H/2
    const gapH = 16;
    const path = _gtBracketPath(lineVB, 14, H-14, H/2-gapH/2, H/2+gapH/2, 6);
    return `${handle}
      <svg width="${W}" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="position:absolute;left:0;top:0;height:100%;stroke:${col}">${path}</svg>
      ${iconAt(lineX, 0.5, icon, col, 13)}`;
  }

  // Family WITH nested couple(s): outer slate bracket + inner gold bracket(s).
  const outerX = 8 + baseShiftX;
  const innerX = 20 + baseShiftX;
  const W = innerX + 9;
  const gapH = 15;
  // Outer family/household bracket, broken at mid-height for the group icon.
  const outerSvg = `<svg width="${W}" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="position:absolute;left:0;top:0;height:100%;stroke:${groupCol}">${_gtBracketPath(outerX,12,H-12,H/2-gapH/2,H/2+gapH/2,6)}</svg>`;
  // Inner couple brackets (gold) — one per couple range, broken for the couple icon.
  let innerPaths='';
  slot.couples.forEach(rng=>{
    const top=bandCenter(rng[0]) - (H/n)*0.32;
    const bot=bandCenter(rng[1]) + (H/n)*0.32;
    const mid=(top+bot)/2;
    innerPaths += _gtBracketPath(innerX, top, bot, mid-gapH/2, mid+gapH/2, 6);
  });
  const innerSvg = `<svg width="${W}" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="position:absolute;left:0;top:0;height:100%;stroke:${goldCol}">${innerPaths}</svg>`;

  let icons = iconAt(outerX, 0.5, groupIcon, groupCol, 13);
  slot.couples.forEach(rng=>{
    const top=bandCenter(rng[0]) - (H/n)*0.32;
    const bot=bandCenter(rng[1]) + (H/n)*0.32;
    const mid=(top+bot)/2;
    icons += iconAt(innerX, mid/H, coupleIcon, goldCol, 11);
  });

  return `${handle}${outerSvg}${innerSvg}${icons}`;
}

// Inline text editing: swap the cell's display span for an input, commit on Enter/blur.
function _gtEditText(td){
  if(td.querySelector('input')) return; // already editing
  const gid=td.getAttribute('data-gid'), key=td.getAttribute('data-key');
  const g=STATE.guests.find(x=>x.id===gid); if(!g) return;
  let cur = key==='name' ? (g.name||'')
          : key==='role' ? ((g.relationship&&g.relationship!=='Couple'&&g.relationship!=='Guest'&&g.relationship!=='Plus One')?g.relationship:'')
          : (g[key]||'');
  const disp=td.querySelector('.gt-disp');
  td.dataset.prev = disp?disp.outerHTML:'';
  const inp=document.createElement('input');
  inp.type = key==='email'?'email':(key==='phone'?'tel':'text');
  inp.value=cur;
  inp.className='form-input';
  inp.style.cssText='width:100%;min-width:120px;font-size:12px;padding:4px 8px';
  if(disp) disp.replaceWith(inp); else td.appendChild(inp);
  inp.focus(); inp.select();
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){ e.preventDefault(); inp.blur(); }
    else if(e.key==='Escape'){ e.preventDefault(); _gtCancelText(td); }
  });
  inp.addEventListener('blur',()=>_gtSaveText(td,gid,key,inp.value),{once:true});
}
function _gtCancelText(td){
  const inp=td.querySelector('input'); if(!inp) return;
  const prev=td.dataset.prev||'';
  const tmp=document.createElement('div'); tmp.innerHTML=prev;
  inp.replaceWith(tmp.firstChild||document.createTextNode(''));
}
function _gtSaveText(td,gid,key,val){
  const g=STATE.guests.find(x=>x.id===gid); if(!g) return;
  val=(val||'').trim();
  if(key==='name'){ if(val) g.name=val; }
  else if(key==='role'){ if(val) g.relationship=val; else if(g.relationship && g.relationship!=='Couple' && g.relationship!=='Plus One') g.relationship='Guest'; }
  else { g[key]=val; }
  saveToStorage();
  renderGuestList();
}
function _gtSetRsvp(gid,val){
  const g=STATE.guests.find(x=>x.id===gid); if(!g) return;
  g.rsvp=val; if(typeof _stampRsvpDate==='function') _stampRsvpDate(g,val);
  saveToStorage(); renderGuestList();
}
function _gtSetList(gid,val){
  const g=STATE.guests.find(x=>x.id===gid); if(!g) return;
  g.listType=val; saveToStorage(); renderGuestList();
}

// Inline tag editor: a small popup anchored at the cell with the existing chip picker.
let _gtTagPop=null, _gtTagPopGid=null;
function _gtEditTags(td){
  const gid=td.getAttribute('data-gid');
  _gtCloseTagPop();
  const g=STATE.guests.find(x=>x.id===gid); if(!g) return;
  _gtTagPopGid=gid;
  const names=_allTagNames();
  const cur=(g.tags||[]);
  const curKeys=cur.map(t=>t.toLowerCase());
  const chips=names.length?names.map(name=>{
    const on=curKeys.includes(name.toLowerCase());
    return _tagChipHtml(name,{active:on,click:`_gtTagToggle('${_escSQ(name)}')`});
  }).join(''):'<span style="font-size:11.5px;color:var(--muted)">No tags yet — create some in Manage tags.</span>';
  const pop=document.createElement('div');
  pop.id='gt-tag-pop';
  pop.style.cssText='position:absolute;z-index:1200;width:248px;background:var(--cream);border:1px solid var(--border);border-radius:11px;box-shadow:0 8px 28px rgba(26,26,24,.18);padding:12px 14px';
  pop.innerHTML=`<div style="font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:7px">Tags</div>
    <div id="gt-tag-chips" style="display:flex;flex-wrap:wrap;gap:6px">${chips}</div>
    <div style="display:flex;gap:6px;margin-top:9px">
      <input id="gt-tag-new" class="form-input" placeholder="New tag…" style="flex:1;font-size:12px;padding:5px 8px" onkeydown="if(event.key==='Enter'){event.preventDefault();_gtTagAddNew();}"/>
      <button class="btn btn-sm btn-primary" onclick="_gtTagAddNew()" style="flex-shrink:0">Add</button>
    </div>
    <div style="text-align:right;margin-top:8px"><button class="btn btn-sm btn-outline" onclick="_gtCloseTagPop(true)">Done</button></div>`;
  document.body.appendChild(pop);
  const r=td.getBoundingClientRect();
  let top=r.bottom+window.scrollY+4, left=r.left+window.scrollX;
  if(left+248>window.scrollX+document.documentElement.clientWidth-8) left=window.scrollX+document.documentElement.clientWidth-248-8;
  pop.style.top=top+'px'; pop.style.left=Math.max(8,left)+'px';
  _gtTagPop=pop;
  setTimeout(()=>document.addEventListener('click',_gtTagPopCloser),0);
}
function _gtTagPopCloser(ev){
  const pop=document.getElementById('gt-tag-pop');
  if(pop && !pop.contains(ev.target) && document.documentElement.contains(ev.target)){ _gtCloseTagPop(true); }
}
function _gtTagToggle(name){
  const g=STATE.guests.find(x=>x.id===_gtTagPopGid); if(!g) return;
  if(!g.tags) g.tags=[];
  const i=g.tags.findIndex(t=>t.toLowerCase()===name.toLowerCase());
  if(i>=0) g.tags.splice(i,1); else g.tags.push(name);
  _gtRefreshTagChips(g);
}
function _gtTagAddNew(){
  const inp=document.getElementById('gt-tag-new'); if(!inp) return;
  const name=(inp.value||'').trim(); if(!name) return;
  const g=STATE.guests.find(x=>x.id===_gtTagPopGid); if(!g) return;
  if(!g.tags) g.tags=[];
  if(!g.tags.some(t=>t.toLowerCase()===name.toLowerCase())) g.tags.push(name);
  // Register as a defined tag so it persists in the known-tags list with a default look.
  if(!STATE.tagDefs) STATE.tagDefs={};
  if(!STATE.tagDefs[name] && !_allTagNames().some(n=>n.toLowerCase()===name.toLowerCase())){ /* plain tag, no def needed */ }
  inp.value='';
  _gtRefreshTagChips(g);
}
function _gtRefreshTagChips(g){
  const wrap=document.getElementById('gt-tag-chips'); if(!wrap) return;
  const names=_allTagNames();
  const curKeys=(g.tags||[]).map(t=>t.toLowerCase());
  wrap.innerHTML=names.length?names.map(name=>{
    const on=curKeys.includes(name.toLowerCase());
    return _tagChipHtml(name,{active:on,click:`_gtTagToggle('${_escSQ(name)}')`});
  }).join(''):'<span style="font-size:11.5px;color:var(--muted)">No tags yet.</span>';
}
function _gtCloseTagPop(rerender){
  document.removeEventListener('click',_gtTagPopCloser);
  const pop=document.getElementById('gt-tag-pop'); if(pop) pop.remove();
  _gtTagPop=null; _gtTagPopGid=null;
  if(rerender){ saveToStorage(); renderGuestList(); }
}

// Inline dietary editor: a small popup with the five diet toggles.
function _gtEditDiet(td){
  const gid=td.getAttribute('data-gid');
  _gtCloseDietPop();
  const g=STATE.guests.find(x=>x.id===gid); if(!g) return;
  // A GUEST-GIVEN value is not hers to edit on a stray click. Warn, name them, quote what
  // they actually said — then let her through if she means it. A dialog that just says
  // "Overwrite this value?" is one you dismiss on autopilot; the safeguard has to COST
  // something or it is theatre. See _confirmOverwriteGuestValue().
  if(_isGuestGiven(g,'dietary')){ _confirmOverwriteGuestValue(g,'dietary'); return; }
  _gtDietGid=gid;
  const diets=DIET_KEYS;
  const labels=DIET_LABELS;
  const cur=new Set(g.dietary||[]);
  // Allergy gets a single "Allergic to" box here — no room for the allergen chips, so the
  // text is parsed back into chips + note on the way in (see _parseAllergyText).
  const othBox=`<input id="gt-oth-txt" class="form-input" value="${_escHtml(_otherText(g))}" placeholder="Please specify…" oninput="_gtOthInput(this.value)" style="display:${cur.has('other')?'block':'none'};font-size:12px;padding:6px 8px;height:auto;margin:2px 0 4px 23px;width:calc(100% - 23px)"/>`;
  const alBox=`<input id="gt-al-txt" class="form-input" value="${_escHtml(_allergyText(g))}" placeholder="Allergic to…" oninput="_gtAlInput(this.value)" style="display:${cur.has('allergy')?'block':'none'};font-size:12px;padding:6px 8px;height:auto;margin:2px 0 4px 23px;width:calc(100% - 23px)"/>`;
  const pop=document.createElement('div');
  pop.id='gt-diet-pop';
  pop.style.cssText='position:absolute;z-index:1200;width:210px;background:var(--cream);border:1px solid var(--border);border-radius:11px;box-shadow:0 8px 28px rgba(26,26,24,.18);padding:12px 14px';
  pop.innerHTML=`<div style="font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--gold-deep);margin-bottom:7px">Dietary</div>
    ${diets.map(d=>`<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:4px 0;cursor:pointer"><input type="checkbox" ${cur.has(d)?'checked':''} onchange="_gtDietToggle('${d}',this.checked)" style="width:15px;height:15px;accent-color:var(--gold)"/>${labels[d]}</label>${d==='allergy'?alBox:d==='other'?othBox:''}`).join('')}
    <div style="text-align:right;margin-top:6px"><button class="btn btn-sm btn-outline" onclick="_gtCloseDietPop(true)">Done</button></div>`;
  document.body.appendChild(pop);
  const r=td.getBoundingClientRect();
  let left=r.left+window.scrollX;
  if(left+210>window.scrollX+document.documentElement.clientWidth-8) left=window.scrollX+document.documentElement.clientWidth-210-8;
  pop.style.top=(r.bottom+window.scrollY+4)+'px'; pop.style.left=Math.max(8,left)+'px';
  setTimeout(()=>document.addEventListener('click',_gtDietPopCloser),0);
}
let _gtDietGid=null;
function _gtDietPopCloser(ev){
  const pop=document.getElementById('gt-diet-pop');
  if(pop && !pop.contains(ev.target)) _gtCloseDietPop(true);
}
function _gtDietToggle(d,on){
  const g=STATE.guests.find(x=>x.id===_gtDietGid); if(!g) return;
  if(!g.dietary) g.dietary=[];
  const i=g.dietary.indexOf(d);
  if(on && i<0) g.dietary.push(d);
  else if(!on && i>=0) g.dietary.splice(i,1);
  if(d==='allergy'||d==='other'){ const box=document.getElementById(d==='allergy'?'gt-al-txt':'gt-oth-txt'); if(box){ box.style.display=on?'block':'none'; if(on) box.focus(); } }
  saveToStorage();
}
function _gtOthInput(v){
  const g=STATE.guests.find(x=>x.id===_gtDietGid); if(!g) return;
  g.dietOther=String(v||'').trim(); saveToStorage();
}
function _gtAlInput(v){
  const g=STATE.guests.find(x=>x.id===_gtDietGid); if(!g) return;
  const r=_parseAllergyText(v); g.allergens=r.allergens; g.allergyNote=r.note;
  saveToStorage();
}
function _gtCloseDietPop(rerender){
  document.removeEventListener('click',_gtDietPopCloser);
  const pop=document.getElementById('gt-diet-pop'); if(pop) pop.remove();
  _gtDietGid=null;
  if(rerender) renderGuestList();
}

function renderGuestList(){
  const container=document.getElementById('guest-list-container');
  if(!container)return;
  // If a dots menu is open (and possibly portaled to <body>), close it first so
  // its node is restored and doesn't linger after the list is rebuilt.
  if(typeof closeDots==='function' && openDropdown) closeDots();
  const sf=STATE.guestFilter;

  const passesFilt = inviteMode
    ? (g=>guestPassesFilter(g) && (g.listType||'A')!=='B')
    : guestPassesFilter;

  function familyHtml(fam){
    const members=fam.memberIds.map(id=>STATE.guests.find(g=>g.id===id)).filter(Boolean);
    const visibleMembers=members.filter(passesFilt);
    if(!visibleMembers.length) return '';
    const bulkIds=visibleMembers.map(g=>`data-bulk-id="${g.id}"`).join(' ');
    const dragAttrs=reorderMode?`draggable="true"
      ondragstart="groupDragStart(event,'fam:${fam.id}')" ondragend="groupDragEnd()"
      ondragover="groupDragOver(event,'fam:${fam.id}')"
      ondragleave="groupDragLeave(event,'fam:${fam.id}')"
      ondrop="groupDrop(event,'fam:${fam.id}')"`:''
    const inner=(()=>{
      const seen=new Set();
      return visibleMembers.map(g=>{
        if(seen.has(g.id)) return '';
        if(g.coupleId){
          const partner=visibleMembers.find(m=>m.id===g.coupleId);
          if(partner&&!seen.has(partner.id)){
            seen.add(g.id); seen.add(partner.id);
            return `<div class="fam-couple" style="margin:4px 8px;border-radius:8px;overflow:hidden;opacity:.95">
              <div class="fam-couple-header" style="padding:5px 10px;font-size:11px;font-weight:500;display:flex;align-items:center;gap:5px">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="5.2"/><circle cx="15" cy="12" r="5.2"/></svg>Couple
              </div>
              <div>${(inviteMode?inviteCardHtml:g=>guestCardHtml(g,true))(g)}${(inviteMode?inviteCardHtml:g=>guestCardHtml(g,true))(partner)}</div>
            </div>`;
          }
        }
        seen.add(g.id);
        return inviteMode?inviteCardHtml(g):guestCardHtml(g,true);
      }).join('');
    })();
    const allIds=visibleMembers.map(g=>g.id);
    const allSelected=allIds.length>0&&allIds.every(id=>bulkSelected.has(id));
    const someSelected=allIds.some(id=>bulkSelected.has(id));
    const groupCheckbox=bulkMode?`<div onclick="event.stopPropagation();toggleGroupSelect(${JSON.stringify(allIds).replace(/"/g,"'")})"
      style="flex-shrink:0;width:18px;height:18px;border-radius:4px;border:2px solid ${allSelected?'var(--gold)':someSelected?'var(--gold)':'var(--border)'};background:${allSelected?'var(--gold)':someSelected?'var(--parchment)':'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;margin-right:2px">
      ${allSelected?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':someSelected?'<div style="width:8px;height:2px;background:var(--gold);border-radius:1px"></div>':''}
    </div>`:''
    const _isHouse=fam.kind==='household';
    const _grpIconSvg=_isHouse
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9.5a.5.5 0 0 0 .5.5H10v-5h4v5h4.5a.5.5 0 0 0 .5-.5V10"/></svg>'
      : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.8" cy="7.5" r="2.7"/><path d="M2.5 20v-2a4 4 0 0 1 4-4 4 4 0 0 1 .6 0"/><circle cx="17.2" cy="7.5" r="2.7"/><path d="M21.5 20v-2a4 4 0 0 0-4-4 4 4 0 0 0-.6 0"/><circle cx="12" cy="11" r="2.1"/><path d="M8.4 20v-1.4a3.6 3.6 0 0 1 7.2 0V20"/></svg>';
    return `<div class="family-bracket${_isHouse?' household-bracket':''}" data-slot-key="fam:${fam.id}" ${bulkIds} ${dragAttrs}>
      <div class="family-bracket-header" style="${reorderMode?'cursor:grab':''}${bulkMode?';cursor:default':''}">
        ${reorderMode?`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="opacity:.4;flex-shrink:0"><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/></svg>`:''}
        ${groupCheckbox}
        ${_grpIconSvg}
        <span style="font-weight:600">${fam.name}</span>
        <span style="margin-left:auto;font-size:10px;opacity:.7">${visibleMembers.length} member${visibleMembers.length!==1?'s':''}</span>
        <button onclick="event.stopPropagation();openEditFamily('${fam.id}')" style="background:none;border:none;cursor:pointer;color:currentColor;opacity:.6;padding:0 4px;display:flex;align-items:center">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        ${invitedBadge('fam:'+fam.id)}
        ${inviteCheckbox('fam:'+fam.id)}
      </div>
      <div class="family-inner">${inner}</div>
    </div>`;
  }

  function coupleHtml(g, partner){
    const dragAttrs=reorderMode?`draggable="true"
      ondragstart="groupDragStart(event,'couple:${g.id}')" ondragend="groupDragEnd()"
      ondragover="groupDragOver(event,'couple:${g.id}')"
      ondragleave="groupDragLeave(event,'couple:${g.id}')"
      ondrop="groupDrop(event,'couple:${g.id}')"`:''
    const allIds=[g.id,partner.id];
    const allSelected=allIds.every(id=>bulkSelected.has(id));
    const someSelected=allIds.some(id=>bulkSelected.has(id));
    const groupCheckbox=bulkMode?`<div onclick="event.stopPropagation();toggleGroupSelect(['${g.id}','${partner.id}'])"
      style="flex-shrink:0;width:18px;height:18px;border-radius:4px;border:2px solid ${allSelected?'var(--gold)':someSelected?'var(--gold)':'var(--border)'};background:${allSelected?'var(--gold)':someSelected?'var(--parchment)':'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;margin-right:2px">
      ${allSelected?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':someSelected?'<div style="width:8px;height:2px;background:var(--gold);border-radius:1px"></div>':''}
    </div>`:''
    return `<div class="couple-bracket" data-slot-key="couple:${g.id}" ${dragAttrs}>
      <div class="couple-bracket-header" style="${reorderMode?'cursor:grab':''}">
        ${reorderMode?`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="opacity:.4;flex-shrink:0"><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/></svg>`:''}
        ${groupCheckbox}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="5.2"/><circle cx="15" cy="12" r="5.2"/></svg>
        <span style="font-weight:600">${coupleDisplayName(g.name, partner.name)}</span>
        <span style="margin-left:auto;font-size:10px;opacity:.7">Couple</span>
        <button onclick="event.stopPropagation();openEditCouple('${g.id}','${partner.id}')" style="background:none;border:none;cursor:pointer;color:currentColor;opacity:.6;padding:0 4px;display:flex;align-items:center">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        ${invitedBadge('couple:'+g.id)}
        ${inviteCheckbox('couple:'+g.id)}
      </div>
      <div class="couple-inner">${(inviteMode?inviteCardHtml:g=>guestCardHtml(g,true))(g)}${(inviteMode?inviteCardHtml:g=>guestCardHtml(g,true))(partner)}</div>
    </div>`;
  }

  function plusOneHtml(g, plusGuest){
    const dragAttrs=reorderMode?`draggable="true"
      ondragstart="groupDragStart(event,'plusone:${g.id}')" ondragend="groupDragEnd()"
      ondragover="groupDragOver(event,'plusone:${g.id}')"
      ondragleave="groupDragLeave(event,'plusone:${g.id}')"
      ondrop="groupDrop(event,'plusone:${g.id}')"`:''
    const allIds=[g.id,plusGuest.id];
    const allSelected=allIds.every(id=>bulkSelected.has(id));
    const someSelected=allIds.some(id=>bulkSelected.has(id));
    const groupCheckbox=bulkMode?`<div onclick="event.stopPropagation();toggleGroupSelect(['${g.id}','${plusGuest.id}'])"
      style="flex-shrink:0;width:18px;height:18px;border-radius:4px;border:2px solid ${allSelected?'var(--gold)':someSelected?'var(--gold)':'var(--border)'};background:${allSelected?'var(--gold)':someSelected?'var(--parchment)':'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;margin-right:2px">
      ${allSelected?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':someSelected?'<div style="width:8px;height:2px;background:var(--gold);border-radius:1px"></div>':''}
    </div>`:''
    return `<div class="couple-bracket" data-bulk-id="${g.id}" data-bulk-id2="${plusGuest.id}" data-slot-key="plusone:${g.id}" ${dragAttrs}>
      <div class="couple-bracket-header" style="${reorderMode?'cursor:grab':''}">
        ${reorderMode?`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="opacity:.4;flex-shrink:0"><circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="17" r="1" fill="currentColor"/><circle cx="15" cy="17" r="1" fill="currentColor"/></svg>`:''}
        ${groupCheckbox}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
        <span style="font-weight:600">${g.name} Plus One</span>
        <span style="margin-left:auto;font-size:10px;opacity:.7">+1</span>
        <button onclick="event.stopPropagation();openEditCouple('${g.id}','${plusGuest.id}')" style="background:none;border:none;cursor:pointer;color:currentColor;opacity:.6;padding:0 4px;display:flex;align-items:center" title="Edit / unlink plus one">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        ${invitedBadge('plusone:'+g.id)}
        ${inviteCheckbox('plusone:'+g.id)}
      </div>
      <div class="couple-inner">${(inviteMode?inviteCardHtml:g=>guestCardHtml(g,true))(g)}${(inviteMode?inviteCardHtml:g=>guestCardHtml(g,true))(plusGuest)}</div>
    </div>`;
  }

  // Build slots in order, then render each slot in that order
  let slots=buildSlots();
  // Float slots containing a newly-imported guest to the top (stable), so fresh
  // imports surface with their NEW badge. Skipped while manually reordering.
  if(_newlyImportedIds.size && !reorderMode){
    const isNew=s=>(s.ids||[s.leadId]).some(id=>_newlyImportedIds.has(id));
    const fresh=slots.filter(isNew), rest=slots.filter(s=>!isNew(s));
    slots=[...fresh,...rest];
  }
  let html='';

  // SIMPLE invite view: compact rows, optionally grouped by sent status
  if(inviteMode && inviteViewMode==='simple'){
    const rowsFor=arr=>arr.map(inviteSimpleRowHtml).join('');
    if(inviteSimpleGroup==='grouped'){
      const toSend=[], sent=[];
      slots.forEach(s=>{ const info=_inviteSlotInfo(s); if(!info) return; (isInvited(info.key)?sent:toSend).push(s); });
      const sectionHead=(label,color,n)=>`<div style="font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${color};margin:4px 2px 6px">${label} · ${n}</div>`;
      if(toSend.length) html+=sectionHead('To send','var(--gold-deep)',toSend.length)+rowsFor(toSend);
      if(sent.length) html+=`<div style="margin-top:${toSend.length?'12px':'0'}">`+sectionHead('Sent','var(--green)',sent.length)+rowsFor(sent)+`</div>`;
    } else {
      html=rowsFor(slots);
    }
    if(!html) html=`<div class="empty-state"><div class="empty-state-text">No invites to show.</div></div>`;
    container.innerHTML=html;
    return;
  }

  slots.forEach(slot=>{
    if(slot.type==='family'){
      const fam=(STATE.families||[]).find(f=>f.id===slot.famId);
      if(fam) html+=familyHtml(fam);
    } else if(slot.type==='couple'){
      const g=STATE.guests.find(x=>x.id===slot.ids[0]);
      const partner=STATE.guests.find(x=>x.id===slot.ids[1]);
      if(!g||!partner) return;
      const gPass=passesFilt(g), pPass=passesFilt(partner);
      if(!gPass&&!pPass) return;
      // When RSVP filter is active and members have different statuses, show individually.
      // When also in singles mode the partner note explains the linked person's status.
      if(sf.status!=='all'&&(!gPass||!pPass)){
        if(gPass) html+=`<div class="solo-bracket" data-bulk-id="${g.id}" ${reorderDraggable(g.id)}>${guestCardHtml(g)}${sf.group==='singles'?_couplePartnerNote(partner):''}</div>`;
        if(pPass) html+=`<div class="solo-bracket" data-bulk-id="${partner.id}" ${reorderDraggable(partner.id)}>${guestCardHtml(partner)}${sf.group==='singles'?_couplePartnerNote(g):''}</div>`;
      } else {
        html+=coupleHtml(g,partner);
      }
    } else if(slot.type==='plusone'){
      const g=STATE.guests.find(x=>x.id===slot.ids[0]);
      const plusGuest=STATE.guests.find(x=>x.id===slot.ids[1]);
      if(!g||!plusGuest) return;
      const gPass=passesFilt(g), pPass=passesFilt(plusGuest);
      if(!gPass&&!pPass) return;
      // When RSVP filter active and statuses differ, show individually
      if(sf.status!=='all'&&(!gPass||!pPass)){
        if(gPass) html+=`<div class="solo-bracket" data-bulk-id="${g.id}" ${reorderDraggable(g.id)}>${guestCardHtml(g)}${sf.group==='singles'?_couplePartnerNote(plusGuest):''}</div>`;
        if(pPass) html+=`<div class="solo-bracket" data-bulk-id="${plusGuest.id}" ${reorderDraggable(plusGuest.id)}>${guestCardHtml(plusGuest)}${sf.group==='singles'?_couplePartnerNote(g):''}</div>`;
      } else {
        html+=plusOneHtml(g,plusGuest);
      }
    } else {
      // solo
      const g=STATE.guests.find(x=>x.id===slot.leadId);
      if(!g||!passesFilt(g)) return;
      html+=`<div class="solo-bracket" data-bulk-id="${g.id}" ${reorderDraggable(g.id)} style="position:relative">
        ${invitedBadge('solo:'+g.id)||inviteCheckbox('solo:'+g.id)?`<div style="display:flex;justify-content:flex-end;padding:4px 8px 0;gap:6px">${invitedBadge('solo:'+g.id)}${inviteCheckbox('solo:'+g.id)}</div>`:''}
        ${inviteMode?inviteCardHtml(g):guestCardHtml(g)}
      </div>`;
    }
  });

  if(!html) html=`<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">No guests yet. Add your first guest to get started.</div></div>`;
  // List view shows the editable columns table instead of the card list.
  // Edit mode (bulkMode) is a sub-mode of list view that adds checkboxes + the bulk
  // bar; reorder (drag handles) is part of edit. The table renders for the whole
  // list view regardless of edit state.
  if(guestListView==='list' && !inviteMode){
    const tlist=STATE.guests.filter(passesFilt);
    html=guestTableHtml(tlist);
  }
  // Marker for wide-screen breakout: the list-view table is allowed to expand past the
  // centred content band; card/invite views stay centred. Read by the @media(min-width)
  // rule keyed on #main-content[data-gview="list"].
  { const _mc=document.getElementById('main-content');
    if(_mc) _mc.setAttribute('data-gview', (guestListView==='list' && !inviteMode) ? 'list' : 'card'); }
  // Normal-view re-entry chip: only in the plain guest list (not bulk/invite/reorder),
  // only while suggestions still exist this session, and only once the floating banner
  // is no longer showing (so the two don't duplicate). Bulk view uses the cog menu.
  let suggestChip='';
  if(!bulkMode && !inviteMode && !reorderMode
     && typeof _hasLiveSuggestions==='function' && _hasLiveSuggestions()
     && !(typeof _groupBannerActive==='function' && _groupBannerActive())){
    const n=_groupSuggestions.filter(s=>_grIsLive(s)).length;
    suggestChip=`<div onclick="_openGroupReview()" title="Reopen suggested couples, households and plus-ones" style="display:inline-flex;align-items:center;gap:7px;background:rgba(196,168,130,.12);border:.5px solid var(--gold);border-radius:8px;padding:5px 11px;cursor:pointer;margin-bottom:12px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" stroke-width="2" style="flex-shrink:0"><circle cx="9" cy="12" r="5.2"/><circle cx="15" cy="12" r="5.2"/></svg>
      <span style="font-size:11.5px;font-weight:600;color:var(--gold-deep)">Review ${n} import suggestion${n!==1?'s':''}</span>
    </div>`;
  }
  container.innerHTML=suggestChip+html;
  // Post-import suggestion bar — inserted as a direct child of the scrolling
  // .content container (right after the sticky panel), NOT inside a small wrapper.
  // A position:sticky element only sticks within its parent's bounds, so its parent
  // must be the tall scroll area; wrapping it in a short slot div would stop it
  // sticking. It floats just beneath the panel whether expanded/collapsed, in normal
  // or bulk mode.
  const panelEl=document.getElementById('guest-sticky-panel');
  const existingBar=document.getElementById('group-suggest-bar');
  if(existingBar) existingBar.remove();
  const barHtml=(typeof _groupSuggestBannerHtml==='function')?_groupSuggestBannerHtml():'';
  if(barHtml && panelEl && panelEl.parentNode){
    const tmp=document.createElement('div');
    tmp.innerHTML=barHtml;
    const barEl=tmp.firstElementChild;
    if(barEl){
      panelEl.insertAdjacentElement('afterend', barEl);
      if(typeof _positionGuestSuggestBar==='function') _positionGuestSuggestBar();
    }
  }
  if(bulkMode && !reorderMode) updateBulkBar();
  if(guestListView==='list' && !inviteMode) _gtAttachPan();
}
// Pin the suggestion bar's sticky `top` just below the guest sticky panel, which
// has a variable height (expanded vs collapsed). The panel sticks at top:-32px
// (desktop) / -10px (mobile), so the bar's top = panelHeight + that offset.
function _positionGuestSuggestBar(){
  const bar=document.getElementById('group-suggest-bar');
  const panel=document.getElementById('guest-sticky-panel');
  if(!bar||!panel) return;
  // Read the panel's actual sticky `top` (negative) so the bar always sticks flush at the
  // panel's stuck bottom: barTop = panelHeight + panelStickyTop. Reading it live avoids drift
  // if the panel's top is ever retuned (desktop -32 / mobile -10 via media query).
  const cs=getComputedStyle(panel);
  let panelTop=parseFloat(cs.top); if(isNaN(panelTop)) panelTop=0;
  const h=panel.getBoundingClientRect().height;
  bar.style.top=Math.max(0, Math.round(h+panelTop))+'px';
}

// Grab-and-drag horizontal panning for the bulk guest table (desktop / fine-pointer only).
// Disabled in reorderMode so the native HTML5 row-drag isn't hijacked. Ignores presses that
// start on interactive cell content (inputs/selects/buttons/links/drag handles). A drag that
// actually moved suppresses the trailing click so panning doesn't trigger an inline edit.
function _gtAttachPan(){
  const w=document.getElementById('gt-scroll');
  if(!w) return;
  if(window.matchMedia && !window.matchMedia('(pointer:fine)').matches){ w.classList.remove('gt-pannable'); return; }
  if(typeof reorderMode!=='undefined' && reorderMode){ w.classList.remove('gt-pannable'); return; }
  w.classList.add('gt-pannable');
  let down=false, sx=0, sl=0, moved=false, pid=null;
  // Suppress text selection while panning — fires before the selection starts
  w.addEventListener('selectstart',function(e){ if(down) e.preventDefault(); });
  w.addEventListener('pointerdown',function(e){
    if(e.button!==0) return;
    if(e.target.closest('input,select,textarea,button,a,[contenteditable="true"],[draggable="true"],.gt-handle')) return;
    down=true; moved=false; sx=e.clientX; sl=w.scrollLeft; pid=e.pointerId;
    // Suppress selection immediately on mousedown so text never highlights during drag
    w.style.userSelect='none'; w.style.webkitUserSelect='none';
    // Do NOT setPointerCapture or add gt-grabbing here — wait until movement starts.
    // Capturing on every pointerdown suppresses click events on child elements.
  });
  w.addEventListener('pointermove',function(e){
    if(!down) return;
    const dx=e.clientX-sx;
    if(Math.abs(dx)>4 && !moved){
      // Only capture and show grab cursor once real horizontal movement begins
      moved=true;
      w.classList.add('gt-grabbing');
      try{ w.setPointerCapture(pid); }catch(_){}
    }
    if(moved) w.scrollLeft=sl-dx;
  });
  let panEndTime=0;
  const end=function(e){
    if(!down) return; down=false; w.classList.remove('gt-grabbing');
    w.style.userSelect=''; w.style.webkitUserSelect='';
    try{ if(pid!=null) w.releasePointerCapture(pid); }catch(_){}
    if(moved) panEndTime=Date.now();
    moved=false; pid=null;
  };
  w.addEventListener('pointerup',end);
  w.addEventListener('pointercancel',end);
  // Suppress click only within 150ms of a real pan ending
  w.addEventListener('click',function(e){
    if(Date.now()-panEndTime<150){ e.stopPropagation(); e.preventDefault(); panEndTime=0; }
  },true);
}

function reorderDraggable(id){
  if(!reorderMode) return '';
  const slotKey='solo:'+id;
  return `draggable="true" data-slot-key="${slotKey}"
    ondragstart="groupDragStart(event,'${slotKey}')" ondragend="groupDragEnd()"
    ondragover="groupDragOver(event,'${slotKey}')"
    ondragleave="groupDragLeave(event,'${slotKey}')"
    ondrop="groupDrop(event,'${slotKey}')"`;
}

function inviteCardHtml(g){
  const rel=g.relationship&&g.relationship!=='Couple'&&g.relationship!=='Plus One'&&g.relationship!=='Guest'?g.relationship:'';
  const hasDetails=!!(rel||g.phone||g.email||g.address||g.notes||(g.dietary&&g.dietary.length));
  const detailId='inv-det-'+g.id;
  return`<div class="guest-card" style="align-items:flex-start;flex-direction:column;gap:0;padding:10px 12px">
    <div style="display:flex;align-items:center;gap:10px;width:100%">
      <div class="guest-avatar" style="flex-shrink:0">${initials(g.name)}</div>
      <div style="flex:1;min-width:0">
        <div class="guest-name">${g.name}</div>
        ${rel?`<div style="font-size:12px;color:var(--muted);margin-top:1px">${rel}</div>`:''}
      </div>
      ${hasDetails?`<button onclick="event.stopPropagation();(function(){const el=document.getElementById('${detailId}');const btn=document.getElementById('${detailId}-btn');const open=el.style.display!=='none';el.style.display=open?'none':'block';btn.style.transform=open?'rotate(0)':'rotate(180deg)'})()" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:2px;display:flex;align-items:center;flex-shrink:0">
        <svg id="${detailId}-btn" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition:transform .2s"><polyline points="6 9 12 15 18 9"/></svg>
      </button>`:''}
    </div>
    ${hasDetails?`<div id="${detailId}" style="display:none;margin-top:8px;padding-top:8px;border-top:1px solid var(--border);width:100%">
      <div style="display:flex;flex-direction:column;gap:5px">
        ${g.phone?`<div style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--muted);flex-shrink:0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.61 4.9 2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.13.96.38 1.9.72 2.81a2 2 0 0 1-.45 2.11L7.91 10.3a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.91.34 1.85.59 2.81.72A2 2 0 0 1 22 17.73z"/></svg>${g.phone}</div>`:''}
        ${g.email?`<div style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--muted);flex-shrink:0"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${g.email}</div>`:''}
        ${g.address?`<div style="display:flex;align-items:flex-start;gap:7px;font-size:12.5px;color:var(--ink)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--muted);flex-shrink:0;margin-top:2px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${g.address}</div>`:''}
        ${g.dietary&&g.dietary.length?`<div style="font-size:12px;color:var(--muted)">${dietIcons(g.dietary)} ${_dietRawHtml(g)}</div>`:''}
        ${g.notes?`<div style="font-size:12px;color:var(--muted);font-style:italic">${g.notes}</div>`:''}
      </div>
    </div>`:''}
  </div>`;
}

// Resolve a slot to its members, lead guest, invite key, and display name for the Simple invite view
function _inviteSlotInfo(slot){
  const isA=g=>(g.listType||'A')!=='B';
  if(slot.type==='family'){
    const fam=(STATE.families||[]).find(f=>f.id===slot.famId);
    if(!fam) return null;
    const members=fam.memberIds.map(id=>STATE.guests.find(g=>g.id===id)).filter(Boolean).filter(isA);
    if(!members.length) return null;
    return { key:'fam:'+fam.id, lead:members[0], members, name:fam.name, sub:`Family · ${members.length}`, icon:'family' };
  }
  if(slot.type==='couple'){
    const g=STATE.guests.find(x=>x.id===slot.ids[0]);
    const p=STATE.guests.find(x=>x.id===slot.ids[1]);
    if(!g||!p) return null;
    if(!isA(g)&&!isA(p)) return null;
    const members=[g,p].filter(isA);
    return { key:'couple:'+g.id, lead:members[0], members, name:members.length>1?coupleDisplayName(members[0].name,members[1].name):members[0].name, sub:members.length>1?'Couple':'Guest', icon:'couple' };
  }
  if(slot.type==='plusone'){
    const g=STATE.guests.find(x=>x.id===slot.ids[0]);
    const p=STATE.guests.find(x=>x.id===slot.ids[1]);
    if(!g||!p) return null;
    if(!isA(g)&&!isA(p)) return null;
    const members=[g,p].filter(isA);
    return { key:'plusone:'+g.id, lead:members[0], members, name:members.length>1?`${g.name} +1`:members[0].name, sub:members.length>1?'+1':'Guest', icon:'plus' };
  }
  // solo
  const g=STATE.guests.find(x=>x.id===slot.leadId);
  if(!g||!isA(g)) return null;
  return { key:'solo:'+g.id, lead:g, members:[g], name:g.name, sub:'Guest', icon:'solo' };
}

function _inviteEditOnclick(slot,info){
  if(slot.type==='couple') return `openEditCouple('${slot.ids[0]}','${slot.ids[1]}')`;
  if(slot.type==='family') return `openEditFamily('${slot.famId}')`;
  if(slot.type==='plusone') return `openEditCouple('${slot.ids[0]}','${slot.ids[1]}')`;
  return `openEditGuest('${info.lead.id}')`;
}
// ── Invite / reminder method tracking (Stage 1: record + pills) ──────────────
// Channel definitions. `send:true` marks channels that (in Stage 2) will open a
// pre-filled message; for now every channel simply records. Reminder set adds Call.
const INVITE_CHANNELS=[
  {key:'post', label:'Post', pill:'Posted', send:false, svg:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>'},
  {key:'email', label:'Email', pill:'Email', send:true, svg:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>'},
  {key:'text', label:'Text', pill:'Text', send:true, svg:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'},
  {key:'whatsapp', label:'WhatsApp', pill:'WhatsApp', send:true, svg:'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>'},
  {key:'messenger', label:'Messenger', pill:'Messenger', send:true, svg:'<circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/>'},
  {key:'instagram', label:'Instagram', pill:'Instagram', send:true, svg:'<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>'},
  {key:'inperson', label:'In person', pill:'In person', send:false, svg:'<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="10" r="1"/>'},
  {key:'other', label:'Other', pill:'Other', send:false, svg:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'}
];
const REMINDER_CHANNELS=INVITE_CHANNELS.slice(0,6).concat([
  {key:'call', label:'Call', pill:'Call', send:false, svg:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 4.18 2 2 0 0 1 5 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'},
  INVITE_CHANNELS[6], INVITE_CHANNELS[7] // In person, Other
]);
function _chanDef(list,key){ return list.find(c=>c.key===key)||null; }
// ── Tracker "kind" model ─────────────────────────────────────────────────────
// Three tracker kinds share one machinery (send control, method pill, channel
// menu): 'savedate' (Save the Date), 'invite', 'reminder'. Each maps to a field
// on STATE.inviteMeta[slotKey] and a channel list. Helpers below centralise that
// mapping so call sites don't hard-code reminder-vs-invite ternaries.
function _kindField(kind){ return kind==='reminder'?'reminder':(kind==='savedate'?'savedate':'invite'); }
function _kindChannels(kind){ return kind==='reminder'?REMINDER_CHANNELS:INVITE_CHANNELS; }
function _kindHeading(kind){ return kind==='reminder'?'RSVP reminder':(kind==='savedate'?'Save the Date':'Invited by'); }
function _kindNoun(kind){ return kind==='reminder'?'Reminder':(kind==='savedate'?'Save the Date':'Invite'); }
// Per-slot method store lives on STATE.inviteMeta, keyed by the same slot key used
// by STATE.invites. Shape: { invite:{method,date}, reminder:{method,date} }.
function _inviteMeta(key){
  if(!STATE.inviteMeta) STATE.inviteMeta={};
  if(!STATE.inviteMeta[key]) STATE.inviteMeta[key]={};
  return STATE.inviteMeta[key];
}
// ── Preserve invite tracking when a group is separated ───────────────────────
// A group's invite (sent status in STATE.invites + method/date in STATE.inviteMeta)
// is stored under the GROUP slot key: `couple:<lead>`, `plusone:<lead>`, or `fam:<id>`.
// When the link breaks, each freed guest becomes its own `solo:<id>` slot with a fresh
// (empty) key — so without this, the sent tick + method icon vanish even though the
// invite really was sent. This copies the group's status + method onto each separating
// guest's solo slot, so both keep the tick and the how-it-was-sent icon.
//
// Call this with the freed guests BEFORE their group key stops resolving. It:
//   • finds whichever group key actually holds invite data (tries both partners' ids
//     as lead, since either could have anchored the key, plus any family key),
//   • for each freed guest whose solo slot has no invite data yet, copies status+meta,
//   • never overwrites a solo slot that already has its own data (idempotent, safe to
//     call from multiple break sites without double-applying).
function _preserveInviteOnSeparate(freedIds, oldGroupKeys){
  if(!Array.isArray(freedIds)||!freedIds.length) return;
  if(!STATE.invites) STATE.invites=[];
  if(!STATE.inviteMeta) STATE.inviteMeta={};
  // Find the first supplied group key that actually carries invite status or meta.
  const src=(oldGroupKeys||[]).find(k=>k && (STATE.invites.includes(k) || STATE.inviteMeta[k]));
  if(!src) return;                       // nothing was ever sent for this group
  const wasSent=STATE.invites.includes(src);
  const srcMeta=STATE.inviteMeta[src]||null;
  freedIds.forEach(id=>{
    const soloKey='solo:'+id;
    if(wasSent && !STATE.invites.includes(soloKey)) STATE.invites.push(soloKey);
    // Only seed meta if this solo slot has none of its own — don't clobber later edits.
    if(srcMeta && !STATE.inviteMeta[soloKey]){
      STATE.inviteMeta[soloKey]=JSON.parse(JSON.stringify(srcMeta));
    }
  });
}
// Convenience: derive the candidate group keys for a pair (couple or plus-one) and
// migrate. Pass the two guest ids; both orderings are tried so it doesn't matter which
// was the stored lead.
function _preservePairInvite(id1, id2){
  _preserveInviteOnSeparate([id1,id2].filter(Boolean),
    ['couple:'+id1,'couple:'+id2,'plusone:'+id1,'plusone:'+id2]);
}
// ── "Match reminder method to invite" ────────────────────────────────────────
// When the cog toggle is on, a slot with no manually-set reminder method inherits
// its invite method for reminders. A manually-picked reminder method overrides it.
// Resolved at read time (display + send) so it always tracks the current invite
// method; never mutates storage, so clearing the reminder returns it to mirror.
function _mirrorReminderOn(){ return !!(STATE.settings && STATE.settings.mirrorReminderToInvite); }
function _mirrorSavedateOn(){ return !!(STATE.settings && STATE.settings.mirrorSavedateToInvite); }
// Effective method per kind: stored value → mirrored value → null.
// Chain: savedate → invite (when mirrorSavedate) → reminder (when mirrorReminder).
function _effectiveSavedateMethod(slotKey){
  const meta=(STATE.inviteMeta&&STATE.inviteMeta[slotKey])||{};
  if(meta.savedate && meta.savedate.method) return meta.savedate.method;
  return null;
}
function _effectiveInviteMethod(slotKey){
  const meta=(STATE.inviteMeta&&STATE.inviteMeta[slotKey])||{};
  if(meta.invite && meta.invite.method) return meta.invite.method;
  if(_mirrorSavedateOn()){
    const sd=_effectiveSavedateMethod(slotKey);
    if(sd) return sd;
  }
  return null;
}
function _effectiveReminderMethod(slotKey){
  const meta=(STATE.inviteMeta&&STATE.inviteMeta[slotKey])||{};
  if(meta.reminder && meta.reminder.method) return meta.reminder.method;
  if(_mirrorReminderOn()){
    const inv=_effectiveInviteMethod(slotKey);
    if(inv) return inv;
  }
  return null;
}
function _todayIso(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
// Toggle a channel for invite|reminder on a slot. Tapping the active one clears it.
function setInviteMethod(kind, slotKey, chanKey){
  const meta=_inviteMeta(slotKey);
  const field = _kindField(kind);
  const cur = meta[field];
  if(cur && cur.method===chanKey){ delete meta[field]; }
  else { meta[field]={ method:chanKey, date:_todayIso() }; }
  if(typeof saveToStorage==='function') saveToStorage();
  // The invite tracker rows live on the Guests page in invite mode. Re-render it,
  // preserving which rows are expanded (handled by _inviteExpanded).
  const c=document.getElementById('main-content'); const a=document.getElementById('topbar-actions');
  if(c && typeof renderGuests==='function') renderGuests(c, a||document.createElement('div'));
}
// Short "20 Jun" style date for pills/labels.
function _shortDate(iso){
  if(!iso) return '';
  const d=new Date(iso+'T00:00:00'); if(isNaN(d)) return '';
  return d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
}
// Collapsed-row summary pills: invite method + reminder status.
function _inviteMethodPills(slotKey, sent){
  const meta=(STATE.inviteMeta&&STATE.inviteMeta[slotKey])||{};
  const pills=[];
  const icon=svg=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${svg}</svg>`;
  if(meta.savedate){
    const d=_chanDef(INVITE_CHANNELS, meta.savedate.method);
    if(d) pills.push(`<span class="inv-pill">${icon(d.svg)}STD · ${d.pill}</span>`);
  }
  const _effInv=_effectiveInviteMethod(slotKey);
  if(_effInv){
    const d=_chanDef(INVITE_CHANNELS, _effInv);
    if(d) pills.push(`<span class="inv-pill">${icon(d.svg)}${d.pill}</span>`);
  } else if(sent){
    pills.push(`<span class="inv-pill inv-pill-none">Sent · method?</span>`);
  } else {
    pills.push(`<span class="inv-pill inv-pill-none">Not sent</span>`);
  }
  const _effRem=_effectiveReminderMethod(slotKey);
  if(_effRem){
    const d=_chanDef(REMINDER_CHANNELS, _effRem);
    if(d) pills.push(`<span class="inv-pill inv-pill-rem">${icon(d.svg)}Reminded · ${d.label.toLowerCase()}</span>`);
  } else if(_effInv||sent){
    pills.push(`<span class="inv-pill inv-pill-none">No reminder yet</span>`);
  }
  return `<div class="inv-pill-row">${pills.join('')}</div>`;
}
// The expanded chip picker for one kind (savedate|invite|reminder).
function _inviteChipRow(kind, slotKey){
  const list = _kindChannels(kind);
  const meta=(STATE.inviteMeta&&STATE.inviteMeta[slotKey])||{};
  const cur = meta[_kindField(kind)]||null;
  const label = _kindHeading(kind);
  const chips = list.map(c=>{
    const on = cur && cur.method===c.key;
    const avail=_chanContactAvail(c.key,slotKey);
    if(!avail) return `<button type="button" class="inv-chip unavail" disabled title="Not recorded">${_svgIcon(c.svg)}${c.label}</button>`;
    return `<button type="button" class="inv-chip${on?(kind==='reminder'?' on green':' on'):''}" onclick="event.stopPropagation();setInviteMethod('${kind}','${slotKey}','${c.key}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${c.svg}</svg>${c.label}</button>`;
  }).join('');
  const dateLine = cur && cur.date ? `<div class="inv-date-line">${_kindNoun(kind)} recorded ${_shortDate(cur.date)}</div>` : '';
  return `<div class="inv-field"><div class="inv-field-label">${label}</div><div class="inv-chips">${chips}</div>${dateLine}</div>`;
}

// ── Shared channel list controlling BOTH the tracker's Invite and Reminder menus ──
// One saved order + hidden-set governs both. INVITE_CHANNELS is the master list;
// "Call" (reminder-only) is appended so it can be ordered/toggled here too.
const _ALL_TRACKER_CHANNELS=(()=>{
  const call=REMINDER_CHANNELS.find(c=>c.key==='call');
  // Master order: post, email, text, whatsapp, messenger, instagram, call, inperson, other
  const base=INVITE_CHANNELS.slice(0,6).concat(call?[call]:[], INVITE_CHANNELS.slice(6));
  return base;
})();
function _trackerChanDef(key){ return _ALL_TRACKER_CHANNELS.find(c=>c.key===key)||null; }
// Which channels apply to a given kind. Invite and Save the Date exclude "call";
// reminder includes all.
function _chanAppliesTo(kind, key){
  if(kind==='invite'||kind==='savedate') return key!=='call';
  return true; // reminder: everything
}
// Saved order (validated; appends any new keys). Falls back to master order.
function _inviteChannelOrder(){
  const keys=_ALL_TRACKER_CHANNELS.map(c=>c.key);
  let ord=(STATE.settings&&Array.isArray(STATE.settings.inviteChanOrder))?STATE.settings.inviteChanOrder.slice():[];
  ord=ord.filter(k=>keys.indexOf(k)>=0);
  keys.forEach(k=>{ if(ord.indexOf(k)<0) ord.push(k); });
  return ord;
}
function _inviteChanHidden(){
  const h=(STATE.settings&&STATE.settings.inviteChanHidden)||{};
  return h;
}
// Ordered, visible channel defs for a kind.
function _visibleInviteChannels(kind){
  const hidden=_inviteChanHidden();
  return _inviteChannelOrder()
    .filter(k=>_chanAppliesTo(kind,k) && !hidden[k])
    .map(k=>_trackerChanDef(k))
    .filter(Boolean);
}

// ── Clickable method pill + popup channel menu (self-contained in the tracker) ──
let _trackerMenuState=null; // {kind, slotKey} while a menu is open
function _svgIcon(svg){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${svg}</svg>`; }
// The pill button shown under the tick. kind: 'savedate' | 'invite' | 'reminder'.
function _trackerMethodPill(kind, slotKey){
  const meta=(STATE.inviteMeta&&STATE.inviteMeta[slotKey])||{};
  const curMethod = kind==='reminder'
    ? _effectiveReminderMethod(slotKey)
    : kind==='invite'
    ? _effectiveInviteMethod(slotKey)
    : _effectiveSavedateMethod(slotKey);
  const d=curMethod?_trackerChanDef(curMethod):null;
  const remCls=kind==='reminder'?' rem':'';
  const key=slotKey.replace(/'/g,"\\'");
  if(d){
    return `<button type="button" class="tmethod-pill${remCls}" onclick="event.stopPropagation();openTrackerMethodMenu(event,'${kind}','${key}')" title="${d.label} — tap to change">${_svgIcon(d.svg)}${d.label}</button>`;
  }
  return `<button type="button" class="tmethod-pill none" onclick="event.stopPropagation();openTrackerMethodMenu(event,'${kind}','${key}')" title="Set method">Set…</button>`;
}
// Resolve guest member objects for a slot key (used for contact-field availability).
function _slotContactMembers(slotKey){
  const all=STATE.guests||[];
  if(!slotKey) return [];
  if(slotKey.startsWith('solo:')){
    const g=all.find(x=>x.id===slotKey.slice(5)); return g?[g]:[];
  }
  if(slotKey.startsWith('couple:')){
    const lead=all.find(x=>x.id===slotKey.slice(7)); if(!lead) return [];
    const partner=all.find(x=>x.id===lead.coupleId); return [lead,partner].filter(Boolean);
  }
  if(slotKey.startsWith('plusone:')){
    const lead=all.find(x=>x.id===slotKey.slice(8)); if(!lead) return [];
    const plus=all.find(x=>x.id===lead.plusOneId)||all.find(x=>x.plusOneId===lead.id);
    return [lead,plus].filter(Boolean);
  }
  if(slotKey.startsWith('fam:')){
    const fam=(STATE.families||[]).find(f=>f.id===slotKey.slice(4));
    return fam?fam.memberIds.map(id=>all.find(x=>x.id===id)).filter(Boolean):[];
  }
  return [];
}
// Returns true when any slot member has the contact field this channel requires.
// Always returns true for channels with no contact requirement (inperson, other).
function _chanContactAvail(chanKey, slotKey){
  if(chanKey==='inperson'||chanKey==='other') return true;
  const members=_slotContactMembers(slotKey);
  if(!members.length) return true;
  if(chanKey==='post')    return members.some(g=>!!(g.address||'').trim());
  if(chanKey==='email')   return members.some(g=>!!(g.email||'').trim());
  if(chanKey==='text'||chanKey==='whatsapp'||chanKey==='call')
    return members.some(g=>!!(g.phone||'').trim());
  if(chanKey==='messenger'||chanKey==='instagram')
    return members.some(g=>!!(g.handle||'').trim());
  return true;
}

// Build the popup menu markup for a kind+slot (positioned by the opener).
function _trackerMethodMenuHtml(kind, slotKey, sendAfter){
  const meta=(STATE.inviteMeta&&STATE.inviteMeta[slotKey])||{};
  const manualCur=meta[_kindField(kind)]||null;
  const activeMethod = kind==='reminder' ? _effectiveReminderMethod(slotKey) : kind==='invite' ? _effectiveInviteMethod(slotKey) : _effectiveSavedateMethod(slotKey);
  const mirrored = (kind==='reminder'||kind==='invite') && !(manualCur&&manualCur.method) && !!activeMethod;
  const heading=_kindHeading(kind);
  const key=slotKey.replace(/'/g,"\\'");
  const items=_visibleInviteChannels(kind).map(c=>{
    const on=activeMethod===c.key;
    const avail=_chanContactAvail(c.key,slotKey);
    if(!avail) return `<button type="button" class="tchan-item unavail" disabled>
      ${_svgIcon(c.svg)}<span class="tchan-label">${c.label}</span>
      <span class="tchan-unavail-tag">Not recorded</span>
    </button>`;
    return `<button type="button" class="tchan-item${on?' on':''}" onclick="event.stopPropagation();_trackerPickMethod('${kind}','${key}','${c.key}')">
      ${_svgIcon(c.svg)}<span class="tchan-label">${c.label}</span>
      <span class="tchan-tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
    </button>`;
  }).join('');
  // "Matches invite" hint when the shown method is inherited, not manually chosen.
  const mirrorNote = mirrored
    ? `<div class="tchan-sep"></div><div class="tchan-mirror-note" style="font-size:10px;color:var(--muted);padding:6px 12px 2px;line-height:1.35">${kind==='invite'?'Matching the save-the-date method.':'Matching the invite method.'} Pick one to override.</div>`
    : '';
  // Clear only removes a *manually* set reminder (or any invite) — nothing to clear
  // when the reminder is merely mirrored.
  const clear=(manualCur&&manualCur.method)?`<div class="tchan-sep"></div>
    <button type="button" class="tchan-item tchan-clear" onclick="event.stopPropagation();_trackerPickMethod('${kind}','${key}','')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span class="tchan-label">${kind==='reminder'?'Clear override':'Clear'}</span></button>`:'';
  // From the Send control: keep the old one-tap "mark sent" as the last option.
  const markOnly = sendAfter ? `<div class="tchan-sep"></div>
    <button type="button" class="tchan-item" onclick="event.stopPropagation();_closeTrackerMenu();_markSentQuick('${kind}','${key}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span class="tchan-label">Just mark as sent</span></button>` : '';
  return `<div class="tchan-head">${sendAfter?'Send by…':heading}</div>${items}${mirrorNote}${sendAfter?'':clear}${markOnly}`;
}
// Toggle-open a menu anchored to the tapped pill.
// `sendAfter` = opened from the Send control with no method set: picking a method then sends.
function openTrackerMethodMenu(ev, kind, slotKey, sendAfter){
  if(ev) ev.stopPropagation();
  const already=_trackerMenuState && _trackerMenuState.kind===kind && _trackerMenuState.slotKey===slotKey && !!_trackerMenuState.sendAfter===!!sendAfter;
  _closeTrackerMenu();
  if(already) return;
  const anchor=ev&&ev.currentTarget?ev.currentTarget:null;
  if(!anchor) return;
  const menu=document.createElement('div');
  menu.className='tchan-menu';
  menu.id='tracker-method-menu';
  menu.innerHTML=_trackerMethodMenuHtml(kind, slotKey, sendAfter);
  document.body.appendChild(menu);
  // Position under the pill, kept on-screen.
  const r=anchor.getBoundingClientRect();
  const mw=menu.offsetWidth||168, mh=menu.offsetHeight||240;
  let left=r.left+window.scrollX; let top=r.bottom+window.scrollY+6;
  const vw=document.documentElement.clientWidth;
  if(left+mw>vw-8) left=Math.max(8, vw-mw-8);
  // Flip above if it would overflow the viewport bottom.
  if(r.bottom+mh>document.documentElement.clientHeight-8 && r.top-mh>8){ top=r.top+window.scrollY-mh-6; }
  menu.style.left=left+'px';
  menu.style.top=top+'px';
  _trackerMenuState={kind, slotKey, sendAfter:!!sendAfter};
  setTimeout(()=>{
    document.addEventListener('click', _trackerMenuOutside, true);
    document.addEventListener('keydown', _trackerMenuEsc, true);
    window.addEventListener('resize', _closeTrackerMenu);
    const sc=document.getElementById('rsvp-scroll'); if(sc) sc.addEventListener('scroll', _closeTrackerMenu, {passive:true});
  },0);
}
function _trackerMenuOutside(e){
  const m=document.getElementById('tracker-method-menu');
  if(m && !m.contains(e.target)) _closeTrackerMenu();
}
function _trackerMenuEsc(e){ if(e.key==='Escape') _closeTrackerMenu(); }
function _closeTrackerMenu(){
  const m=document.getElementById('tracker-method-menu');
  if(m && m.parentNode) m.parentNode.removeChild(m);
  document.removeEventListener('click', _trackerMenuOutside, true);
  document.removeEventListener('keydown', _trackerMenuEsc, true);
  window.removeEventListener('resize', _closeTrackerMenu);
  const sc=document.getElementById('rsvp-scroll'); if(sc) sc.removeEventListener('scroll', _closeTrackerMenu);
  _trackerMenuState=null;
}
// Pick (or clear, when chanKey==='') a method, stamp today, re-render the tracker only.
// Picking a method does NOT mark invited — that happens on send (or via the tick).
function _trackerPickMethod(kind, slotKey, chanKey){
  const sendAfter=!!(chanKey && _trackerMenuState && _trackerMenuState.sendAfter && _trackerMenuState.kind===kind && _trackerMenuState.slotKey===slotKey);
  const meta=_inviteMeta(slotKey);
  const field=_kindField(kind);
  if(!chanKey){ delete meta[field]; }
  else {
    // Preserve any existing sent-date + sent flag; only (re)set the method.
    const prev=meta[field]||{};
    meta[field]={ method:chanKey, date:prev.date||_todayIso() };
    if(prev.sent) meta[field].sent=true;
  }
  if(typeof saveToStorage==='function') saveToStorage();
  _closeTrackerMenu();
  if(sendAfter){ trackerSend(kind, slotKey); return; }
  rsvpRerenderList();
}

// ════════════════════════════════════════════════════════════════════════
