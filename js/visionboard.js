// VISION BOARD
// ══════════════════════════════════════════════
let vbLayout = STATE.settings.vbLayout || 'scrapbook';
let vbDragId = null;

function setVbLayout(l){ vbLayout=l; STATE.settings.vbLayout=l; saveToStorage(); navigate('visionboard'); }
function setVbBackground(bg){ if(!STATE.settings)STATE.settings={}; STATE.settings.vbBackground=bg; saveToStorage(); navigate(_currentPage||'visionboard'); }
function setVbDensity(d){ if(!STATE.settings) STATE.settings={}; STATE.settings.vbDensity=d; saveToStorage(); navigate('visionboard'); }
function setVbSize(sz){ if(!['xsmall','small','medium','large'].includes(sz)) sz='small'; try{localStorage.setItem('uv-vb-size',sz);}catch(e){} navigate(_currentPage||'visionboard'); }
function setVbImagesOnly(v){ if(!STATE.settings) STATE.settings={}; STATE.settings.vbDashImagesOnly=!!v; saveToStorage(); navigate(_currentPage||'dashboard'); }
function setVbPageImagesOnly(v){ if(!STATE.settings) STATE.settings={}; STATE.settings.vbPageImagesOnly=!!v; saveToStorage(); navigate('visionboard'); }
function setVbGrouped(v){ if(!STATE.settings) STATE.settings={}; STATE.settings.vbGrouped=!!v; saveToStorage(); navigate('visionboard'); }
function setVbDashCount(n){ if(!STATE.settings) STATE.settings={}; STATE.settings.vbDashCount = (n==='all'?'all':parseInt(n,10)); saveToStorage(); navigate(_currentPage||'dashboard'); }

function setVbDashPinned(ids){ if(!STATE.settings) STATE.settings={}; STATE.settings.vbDashPinned=(Array.isArray(ids)&&ids.length)?[...ids]:null; saveToStorage(); navigate(_currentPage||'dashboard'); }

function openVbDashPicker(){
  const allItems=STATE.visionboard.map(id=>STATE.inspo.items.find(i=>i.id===id)).filter(Boolean);
  let _dc=STATE.settings.vbDashCount; if(_dc===undefined||_dc===null) _dc=12;
  const maxSel=_dc==='all'?allItems.length:_dc;
  const isDark=document.body.classList.contains('dark');
  const goldDeep=getComputedStyle(document.documentElement).getPropertyValue('--gold-deep').trim()||'#B89A6A';
  const inkColor=isDark?'#C8BFB0':'#3A2E20';
  const mutedInk=isDark?'#6A6070':'#8A7A65';
  const cardBg=isDark?'#1E1B26':'#FFFDF8';
  const borderC=isDark?'rgba(255,255,255,.1)':'rgba(60,40,20,.12)';
  // Start with current pinned set (or default first-N)
  const currentPinned=Array.isArray(STATE.settings.vbDashPinned)&&STATE.settings.vbDashPinned.length
    ? [...STATE.settings.vbDashPinned]
    : allItems.slice(0,_dc==='all'?allItems.length:_dc).map(i=>i.id);
  // Render picker overlay
  const ov=document.createElement('div');
  ov.id='vb-dash-picker-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(20,16,12,.6);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px';
  const maxLabel=_dc==='all'?'all':maxSel;
  ov.innerHTML=`<div style="background:${isDark?'#18151F':'#FFFDF8'};border-radius:16px;width:min(580px,100%);max-height:90vh;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,.4);overflow:hidden">
    <div style="padding:18px 20px 14px;border-bottom:1px solid ${borderC};flex-shrink:0">
      <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:500;color:${inkColor};margin-bottom:4px">Choose ideas for dashboard</div>
      <div style="font-size:13px;color:${mutedInk}">Select up to <strong id="vbdp-max-lbl">${maxLabel}</strong> ideas · <span id="vbdp-count-lbl" style="color:${goldDeep};font-weight:600">0 selected</span> · <button type="button" onclick="document.querySelectorAll('.vbdp-card.vbdp-on').forEach(c=>c.click())" style="border:none;background:transparent;color:${mutedInk};font-size:13px;cursor:pointer;padding:0;text-decoration:underline">Clear all</button></div>
    </div>
    <div id="vbdp-grid" style="padding:16px;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px">
      ${allItems.map(item=>{
        const imgUrl=_mediaUrl(item.image);
        const sel=currentPinned.includes(item.id);
        return`<div class="vbdp-card${sel?' vbdp-on':''}" data-id="${item.id}" onclick="_vbdpToggle(this)" style="position:relative;border-radius:10px;overflow:hidden;background:${cardBg};border:2px solid ${sel?goldDeep:borderC};cursor:pointer;transition:border-color .15s,box-shadow .15s;box-shadow:${sel?`0 0 0 2px ${goldDeep}40`:'none'}">
          ${imgUrl?`<img src="${imgUrl}" style="width:100%;height:90px;object-fit:cover;display:block" onerror="this.style.display='none'"/>`:
            `<div style="width:100%;height:90px;display:flex;align-items:center;justify-content:center;background:${isDark?'#2A2535':'#F3EDE3'}"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="${mutedInk}" stroke-width="1.4"><rect x="3" y="3" width="16" height="16" rx="3"/><path d="M3 15l4-4 4 4 3-5 5 5"/></svg></div>`}
          <div style="padding:5px 7px 7px"><div style="font-size:11.5px;color:${inkColor};line-height:1.3;font-family:'Cormorant Garamond',serif">${_escHtml(item.title)}</div>${item.category?`<div style="font-size:9.5px;color:${mutedInk};font-style:italic;margin-top:1px">${_escHtml(item.category)}</div>`:''}</div>
          ${sel?`<div style="position:absolute;top:5px;right:5px;width:20px;height:20px;border-radius:50%;background:${goldDeep};display:flex;align-items:center;justify-content:center"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg></div>`:''}
        </div>`;
      }).join('')}
    </div>
    <div style="padding:14px 20px;border-top:1px solid ${borderC};display:flex;gap:10px;flex-shrink:0">
      <button type="button" onclick="document.getElementById('vb-dash-picker-overlay').remove()" style="flex:1;padding:10px;border-radius:10px;border:1px solid ${borderC};background:transparent;color:${mutedInk};font-size:14px;cursor:pointer;font-family:inherit">Cancel</button>
      <button type="button" id="vbdp-done-btn" onclick="_vbdpConfirm()" style="flex:2;padding:10px;border-radius:10px;border:none;background:${goldDeep};color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Done</button>
    </div>
  </div>`;
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  document.body.appendChild(ov);
  _vbdpUpdateCount();
}

function _vbdpToggle(card){
  const ov=document.getElementById('vb-dash-picker-overlay');
  if(!ov) return;
  const isDark=document.body.classList.contains('dark');
  const goldDeep=getComputedStyle(document.documentElement).getPropertyValue('--gold-deep').trim()||'#B89A6A';
  const borderC=isDark?'rgba(255,255,255,.1)':'rgba(60,40,20,.12)';
  let _dc=STATE.settings.vbDashCount; if(_dc===undefined||_dc===null) _dc=12;
  const allItems=STATE.visionboard.map(id=>STATE.inspo.items.find(i=>i.id===id)).filter(Boolean);
  const maxSel=_dc==='all'?allItems.length:_dc;
  const selected=ov.querySelectorAll('.vbdp-card.vbdp-on');
  if(card.classList.contains('vbdp-on')){
    card.classList.remove('vbdp-on');
    card.style.borderColor=borderC;
    card.style.boxShadow='none';
    const chk=card.querySelector('div[style*="position:absolute"]');
    if(chk) chk.remove();
  } else {
    if(selected.length>=maxSel){ return; }
    card.classList.add('vbdp-on');
    card.style.borderColor=goldDeep;
    card.style.boxShadow=`0 0 0 2px ${goldDeep}40`;
    const chk=document.createElement('div');
    chk.style.cssText=`position:absolute;top:5px;right:5px;width:20px;height:20px;border-radius:50%;background:${goldDeep};display:flex;align-items:center;justify-content:center`;
    chk.innerHTML=`<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg>`;
    card.appendChild(chk);
  }
  _vbdpUpdateCount();
}

function _vbdpUpdateCount(){
  const ov=document.getElementById('vb-dash-picker-overlay');
  if(!ov) return;
  const n=ov.querySelectorAll('.vbdp-card.vbdp-on').length;
  let _dc=STATE.settings.vbDashCount; if(_dc===undefined||_dc===null) _dc=12;
  const allItems=STATE.visionboard.map(id=>STATE.inspo.items.find(i=>i.id===id)).filter(Boolean);
  const maxSel=_dc==='all'?allItems.length:_dc;
  const lbl=ov.querySelector('#vbdp-count-lbl');
  if(lbl) lbl.textContent=`${n} selected`;
  const done=ov.querySelector('#vbdp-done-btn');
  if(done){ done.disabled=n===0; done.style.opacity=n===0?'.5':'1'; }
  // Dim unchosen cards when at max
  ov.querySelectorAll('.vbdp-card:not(.vbdp-on)').forEach(c=>{ c.style.opacity=(n>=maxSel&&maxSel>0&&_dc!=='all')?'.45':'1'; c.style.pointerEvents=(n>=maxSel&&maxSel>0&&_dc!=='all')?'none':''; });
  ov.querySelectorAll('.vbdp-card.vbdp-on').forEach(c=>{ c.style.opacity='1'; c.style.pointerEvents=''; });
}

function _vbdpConfirm(){
  const ov=document.getElementById('vb-dash-picker-overlay');
  if(!ov) return;
  const ids=[...ov.querySelectorAll('.vbdp-card.vbdp-on')].map(c=>c.dataset.id);
  ov.remove();
  setVbDashPinned(ids);
}
// ── Vision board background tint ─────────────────────────────
// 'original' = neutral cream/dark veil; 'palette' = tint built from chosen palette colours.
function setVbBgTint(mode){ if(!STATE.settings) STATE.settings={}; STATE.settings.vbBgTint = (mode==='palette'?'palette':'original'); saveToStorage(); navigate(_currentPage||'dashboard'); }
// Toggle a palette colour in/out of the ordered tint list (appended in tap order).
function toggleVbTintColor(hex){
  if(!STATE.settings) STATE.settings={};
  let arr = Array.isArray(STATE.settings.vbTintColors) ? STATE.settings.vbTintColors.slice() : [];
  const i = arr.indexOf(hex);
  if(i>=0) arr.splice(i,1); else arr.push(hex);
  STATE.settings.vbTintColors = arr;
  saveToStorage(); navigate(_currentPage||'dashboard');
}
// Move a tint colour earlier/later in the order (dir = -1 or +1).
function moveVbTintColor(hex, dir){
  if(!STATE.settings) STATE.settings={};
  let arr = Array.isArray(STATE.settings.vbTintColors) ? STATE.settings.vbTintColors.slice() : [];
  const i = arr.indexOf(hex);
  const j = i + dir;
  if(i<0 || j<0 || j>=arr.length) return;
  const t = arr[i]; arr[i]=arr[j]; arr[j]=t;
  STATE.settings.vbTintColors = arr;
  saveToStorage(); navigate(_currentPage||'dashboard');
}
// Returns the ordered list of tint colours actually usable (selected in palette & still valid hex).
function _vbTintColorList(){
  const sel = (STATE.inspo && Array.isArray(STATE.inspo.colors)) ? STATE.inspo.colors : [];
  const chosen = Array.isArray(STATE.settings.vbTintColors) ? STATE.settings.vbTintColors : [];
  // Keep only chosen colours that are still in the palette, preserving chosen order.
  return chosen.filter(h => sel.includes(h));
}
// Build the gradient layer string + blend mode for the scrapbook background.
// Returns { veil: '<comma gradient stops>', blend: '<blend list>' }.
// isDark only affects the fallback (Original) veil.
function _vbTintLayers(isDark){
  const mode = STATE.settings.vbBgTint || 'original';
  if(mode!=='palette'){
    const v = isDark ? 'rgba(20,16,22,.34)' : 'rgba(255,250,247,.30)';
    return { grad:`linear-gradient(${v},${v})`, blend:'normal' };
  }
  const cols = _vbTintColorList();
  if(!cols.length){
    // Palette mode chosen but nothing usable → fall back to neutral veil.
    const v = isDark ? 'rgba(20,16,22,.34)' : 'rgba(255,250,247,.30)';
    return { grad:`linear-gradient(${v},${v})`, blend:'normal' };
  }
  // First colour strongest, falling off for later colours.
  const alphas = cols.length===1 ? [isDark?0.5:0.42]
    : cols.map((_,i)=> (isDark?0.46:0.42) - i*(isDark?0.07:0.07));
  const stops = cols.map((hex,i)=>{
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    const a = Math.max(0.18, alphas[i]);
    return `rgba(${r},${g},${b},${a.toFixed(2)})`;
  }).join(',');
  return { grad:`linear-gradient(${stops})`, blend:'multiply' };
}
function toggleVbSizeMenu(e){
  e.stopPropagation();
  const sel=document.getElementById('vb-size-select');
  const menu=document.getElementById('vb-size-menu');
  if(!menu||!sel) return;
  const showing=menu.style.display!=='none';
  menu.style.display=showing?'none':'block';
  sel.classList.toggle('open',!showing);
  if(!showing){
    const close=(ev)=>{ if(!sel.contains(ev.target)){ menu.style.display='none'; sel.classList.remove('open'); document.removeEventListener('click',close); } };
    setTimeout(()=>document.addEventListener('click',close),0);
  }
}

function toggleVbLayoutMenu(e){
  e.stopPropagation();
  const sel=document.getElementById('vb-layout-select');
  const menu=document.getElementById('vb-layout-menu');
  if(!menu||!sel) return;
  const showing=menu.style.display!=='none';
  menu.style.display=showing?'none':'block';
  sel.classList.toggle('open',!showing);
  if(!showing){
    const close=(ev)=>{ if(!sel.contains(ev.target)){ menu.style.display='none'; sel.classList.remove('open'); document.removeEventListener('click',close); } };
    setTimeout(()=>document.addEventListener('click',close),0);
  }
}

function toggleVbBgMenu(e){
  e.stopPropagation();
  const sel=document.getElementById('vb-bg-select');
  const menu=document.getElementById('vb-bg-menu');
  if(!menu||!sel) return;
  const showing=menu.style.display!=='none';
  menu.style.display=showing?'none':'block';
  sel.classList.toggle('open',!showing);
  if(!showing){
    const close=(ev)=>{ if(!sel.contains(ev.target)){ menu.style.display='none'; sel.classList.remove('open'); document.removeEventListener('click',close); } };
    setTimeout(()=>document.addEventListener('click',close),0);
  }
}

// ══════════════════════════════════════════════
