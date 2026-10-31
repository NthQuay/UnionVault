// INSPIRATION
// ══════════════════════════════════════════════
const WEDDING_COLORS=[
  // Neutrals & Whites
  {name:'Pure White',hex:'#FEFEFE',group:'Neutrals & Whites'},
  {name:'Soft Ivory',hex:'#F8F4EC',group:'Neutrals & Whites'},
  {name:'Warm Cream',hex:'#F5EDD8',group:'Neutrals & Whites'},
  {name:'Champagne',hex:'#EDD9A3',group:'Neutrals & Whites'},
  {name:'Linen',hex:'#E8DCC8',group:'Neutrals & Whites'},
  {name:'Parchment',hex:'#DDD0B3',group:'Neutrals & Whites'},
  // Blushes & Pinks
  {name:'Petal',hex:'#F7D9D9',group:'Blushes & Pinks'},
  {name:'Blush',hex:'#F2C4C4',group:'Blushes & Pinks'},
  {name:'Dusty Rose',hex:'#D4A0A0',group:'Blushes & Pinks'},
  {name:'Antique Pink',hex:'#C9847A',group:'Blushes & Pinks'},
  {name:'Rose Mauve',hex:'#B07080',group:'Blushes & Pinks'},
  {name:'Mulberry',hex:'#8B3A62',group:'Blushes & Pinks'},
  // Reds & Burgundy
  {name:'Soft Coral',hex:'#E8967A',group:'Reds & Burgundy'},
  {name:'Terracotta',hex:'#C97B5A',group:'Reds & Burgundy'},
  {name:'Deep Rose',hex:'#A0404A',group:'Reds & Burgundy'},
  {name:'Burgundy',hex:'#7B2D3E',group:'Reds & Burgundy'},
  {name:'Merlot',hex:'#5C1A2A',group:'Reds & Burgundy'},
  // Greens
  {name:'Mint',hex:'#C8DDD0',group:'Greens'},
  {name:'Sage',hex:'#A8C0A4',group:'Greens'},
  {name:'Muted Sage',hex:'#8BA888',group:'Greens'},
  {name:'Eucalyptus',hex:'#6B9E7A',group:'Greens'},
  {name:'Fern',hex:'#4E7A58',group:'Greens'},
  {name:'Forest',hex:'#2E5C3A',group:'Greens'},
  // Blues
  {name:'Powder Blue',hex:'#C8D8E8',group:'Blues'},
  {name:'Dusty Blue',hex:'#8AAABB',group:'Blues'},
  {name:'Steel Blue',hex:'#6080A0',group:'Blues'},
  {name:'Slate',hex:'#4A6070',group:'Blues'},
  {name:'Navy',hex:'#4A6080',group:'Blues'},
  // Purples & Lavender
  {name:'Whisper Lilac',hex:'#E8DCEF',group:'Purples & Lavender'},
  {name:'Soft Lavender',hex:'#C8B4D8',group:'Purples & Lavender'},
  {name:'Dusty Lilac',hex:'#A888BB',group:'Purples & Lavender'},
  {name:'Wisteria',hex:'#8860A0',group:'Purples & Lavender'},
  {name:'Plum',hex:'#5A3070',group:'Purples & Lavender'},
  // Golds & Metallics
  {name:'Butter',hex:'#F5E8B0',group:'Golds & Metallics'},
  {name:'Soft Gold',hex:'#D4B86A',group:'Golds & Metallics'},
  {name:'Antique Gold',hex:'#C4A050',group:'Golds & Metallics'},
  {name:'Copper',hex:'#B87048',group:'Golds & Metallics'},
  {name:'Bronze',hex:'#8C5E38',group:'Golds & Metallics'},
  // Moody & Deep
  {name:'Charcoal',hex:'#4A4A48',group:'Moody & Deep'},
  {name:'Ink',hex:'#2A2A28',group:'Moody & Deep'},
];
const INSPO_CATS=['Florals','Decor','Dresses & Attire','Shoes','Hair & Beauty','Cakes & Sweets','Venues','Invitations','Other'];
// Effective category list = built-in defaults + any user-added categories, with "Other"
// kept last. Custom categories live in STATE.inspoCustomCats and persist with the data.
function inspoCats(){
  const custom=(STATE.inspoCustomCats||[]).filter(c=>c && !INSPO_CATS.includes(c));
  const base=INSPO_CATS.filter(c=>c!=='Other');
  return [...base, ...custom, 'Other'];
}
// Register a new custom category (no-op if blank or already present). Returns the
// canonical name to select.
function addInspoCategory(name){
  const n=(name||'').trim();
  if(!n) return '';
  const all=inspoCats();
  const existing=all.find(c=>c.toLowerCase()===n.toLowerCase());
  if(existing) return existing;
  if(!STATE.inspoCustomCats) STATE.inspoCustomCats=[];
  STATE.inspoCustomCats.push(n);
  saveToStorage();
  return n;
}
// Build the category <select> for the inspo Add/Edit forms, including a trailing
// "+ Add new category…" option that reveals an inline name field.
const _INSPO_NEWCAT='__newcat__';
function _inspoCatSelectHtml(id, selected){
  const cats=inspoCats();
  // Ensure the currently-selected value (which may be a custom one) is present.
  const opts=cats.includes(selected)?cats:[...cats, selected].filter(Boolean);
  return `<select class="form-input" id="${id}" onchange="_inspoCatChanged('${id}')">
    ${opts.map(c=>`<option value="${c.replace(/"/g,'&quot;')}" ${c===selected?'selected':''}>${c}</option>`).join('')}
    <option value="${_INSPO_NEWCAT}">+ Add new category…</option>
  </select>
  <div id="${id}-newrow" style="display:none;gap:8px;margin-top:8px">
    <input class="form-input" id="${id}-newname" placeholder="New category name" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();_inspoCatAdd('${id}');}"/>
    <button type="button" class="btn btn-primary btn-sm" onclick="_inspoCatAdd('${id}')" style="white-space:nowrap">Add</button>
  </div>`;
}
// Remember the last real (non-"add new") selection per select, so cancelling the
// new-category flow can revert to it.
const _inspoCatPrev={};
function _inspoCatChanged(id){
  const sel=document.getElementById(id); if(!sel) return;
  const row=document.getElementById(id+'-newrow');
  if(sel.value===_INSPO_NEWCAT){
    if(row){ row.style.display='flex'; const inp=document.getElementById(id+'-newname'); if(inp){ inp.value=''; inp.focus(); } }
  } else {
    _inspoCatPrev[id]=sel.value;
    if(row) row.style.display='none';
  }
}
function _inspoCatAdd(id){
  const inp=document.getElementById(id+'-newname'); const sel=document.getElementById(id);
  if(!inp||!sel) return;
  const name=addInspoCategory(inp.value);
  if(!name){ // blank → revert to previous selection
    const prev=_inspoCatPrev[id]||inspoCats()[0];
    _rebuildInspoCatSelect(id, prev);
    return;
  }
  _rebuildInspoCatSelect(id, name);
}
// Rebuild a category select in place with the latest list and a chosen value.
function _rebuildInspoCatSelect(id, selectValue){
  const sel=document.getElementById(id); if(!sel) return;
  const cats=inspoCats();
  const opts=cats.includes(selectValue)?cats:[...cats, selectValue].filter(Boolean);
  sel.innerHTML=opts.map(c=>`<option value="${c.replace(/"/g,'&quot;')}" ${c===selectValue?'selected':''}>${c}</option>`).join('')
    +`<option value="${_INSPO_NEWCAT}">+ Add new category…</option>`;
  sel.value=selectValue;
  _inspoCatPrev[id]=selectValue;
  const row=document.getElementById(id+'-newrow'); if(row) row.style.display='none';
}
let inspoTempImage='';

// ── Brush-stroke swatch (silhouette traced from reference image) ──
const BRUSH_PATH="M3655 1853 c-49 -8 -110 -14 -135 -14 -48 -1 -474 -61 -556 -79 -27 -6 -55 -18 -61 -27 -8 -10 -13 -12 -13 -5 0 18 -16 16 -322 -38 -369 -64 -365 -64 -296 -40 67 22 246 59 445 92 80 13 141 27 140 33 -4 11 -51 8 -154 -9 -62 -11 -70 -11 -65 2 4 13 -4 14 -54 8 -154 -18 -717 -145 -1109 -251 -129 -35 -444 -105 -472 -105 -26 0 -380 -75 -431 -91 -21 -7 -32 -16 -28 -24 3 -10 -8 -16 -42 -21 -26 -3 -67 -15 -91 -25 -24 -10 -57 -19 -74 -19 -78 0 -187 -49 -187 -84 0 -7 -25 -23 -56 -35 -36 -15 -53 -28 -50 -36 3 -8 -2 -19 -10 -25 -27 -23 -17 -43 17 -36 27 5 30 4 19 -9 -11 -13 -7 -15 25 -15 l37 0 -16 -25 c-16 -24 -16 -25 6 -25 21 -1 21 -2 6 -11 -28 -16 -21 -29 15 -30 l32 0 -42 -19 c-44 -20 -60 -47 -22 -37 20 5 20 5 3 -14 -14 -15 -15 -22 -6 -28 7 -4 10 -15 6 -24 -4 -13 -1 -17 15 -17 27 0 27 -13 0 -49 -25 -34 -19 -51 19 -52 26 -1 26 -1 -6 -10 -17 -5 -32 -14 -32 -19 0 -6 -7 -10 -15 -10 -8 0 -15 -5 -15 -11 0 -8 17 -10 55 -5 46 5 54 4 49 -9 -4 -11 0 -15 16 -15 22 0 22 -1 7 -18 -31 -34 -22 -52 24 -52 34 0 39 -2 30 -14 -12 -15 -49 -31 -93 -40 -17 -4 -28 -13 -28 -23 0 -13 9 -15 56 -10 43 4 54 3 45 -6 -20 -20 -12 -27 32 -27 l42 -1 -30 -24 c-29 -24 -29 -25 -10 -38 18 -14 17 -15 -13 -31 -34 -17 -42 -36 -17 -36 8 0 15 -9 15 -20 0 -13 7 -20 18 -20 29 0 25 -65 -5 -81 -25 -13 -30 -29 -10 -29 6 0 4 -5 -5 -11 -22 -12 -23 -29 -3 -29 8 0 15 -5 15 -11 0 -9 23 -10 80 -6 77 5 79 4 77 -16 -1 -12 3 -21 8 -20 6 1 27 4 48 8 32 6 36 5 31 -9 -10 -25 34 -20 196 23 80 21 289 77 465 124 621 166 951 242 1580 367 143 28 296 62 340 75 44 12 114 28 155 35 41 7 83 16 93 22 23 12 22 37 -4 46 -19 8 42 24 224 58 15 3 27 10 27 16 0 8 -32 9 -102 4 l-102 -6 22 23 c12 13 20 26 17 29 -13 13 28 28 125 48 58 12 122 26 143 31 37 10 48 23 25 32 -7 2 4 11 25 20 50 21 40 38 -15 26 -29 -7 -43 -6 -48 1 -5 8 -35 4 -101 -14 -89 -25 -139 -33 -127 -20 3 3 63 18 133 34 69 15 129 31 132 34 17 16 -15 17 -105 2 -202 -33 -185 -11 26 35 159 34 190 45 174 61 -10 10 -104 -2 -150 -19 -10 -4 -13 -2 -8 5 10 17 -5 20 -57 12 -52 -8 -73 4 -35 20 13 5 82 21 153 35 165 32 205 43 205 57 0 10 -107 6 -152 -5 -7 -2 -10 -2 -5 0 4 3 7 9 7 14 0 12 -57 12 -65 -1 -9 -15 -25 -12 -25 4 0 8 -15 19 -32 26 l-33 11 25 13 c14 8 58 22 98 32 115 29 173 92 61 66 -62 -15 -192 -16 -144 -1 16 5 55 11 86 15 65 7 91 19 71 32 -9 6 -6 12 13 20 50 23 26 31 -77 28 -57 -2 -161 -16 -233 -30 -139 -28 -185 -32 -185 -16 0 11 -4 9 165 45 66 14 124 30 129 35 13 13 -64 13 -119 1 -22 -5 -80 -12 -129 -16 -170 -13 -62 31 205 85 84 16 155 32 157 35 15 14 -17 17 -95 7 -49 -6 -133 -13 -188 -16 -99 -5 -100 -5 -55 10 32 11 311 64 338 64 1 0 2 5 2 11 0 12 -114 8 -190 -7 -70 -14 -17 12 88 41 102 30 143 55 87 55 -36 0 -14 22 38 39 20 7 37 17 37 22 0 12 -34 10 -145 -8z";
const BRUSH_TF="translate(0.000000,189.000000) scale(0.100000,-0.100000)";
// Subtle per-index variety so strokes don't look stamped from one mould
const BRUSH_VARIANTS=[
  'scaleX(1) rotate(-1.5deg)',
  'scaleX(1) rotate(1deg) scale(1.02)',
  'scaleX(1) rotate(-.5deg)',
  'scaleX(1) rotate(1.5deg) scale(.98)',
  'scaleX(1) rotate(-1deg) scale(1.03)',
  'scaleX(1) rotate(.5deg) scale(1.02)'
];
function brushSwatchHtml(hex, name, idx){
  const v=BRUSH_VARIANTS[idx % BRUSH_VARIANTS.length];
  const w=118, h=Math.round(w*189/393);
  return `<div class="brush-swatch" title="${name}">
    <button class="brush-x" onclick="toggleColor('${hex}')" title="Remove">\u00d7</button>
    <svg class="brush-stroke-svg" width="${w}" height="${h}" viewBox="0 0 393 189" preserveAspectRatio="xMidYMid meet" style="transform:${v}">
      <g transform="${BRUSH_TF}" fill="${hex}" stroke="none"><path d="${BRUSH_PATH}"/></g>
    </svg>
    <div class="brush-name">${name}</div>
  </div>`;
}

function renderInspo(c,actions){
  actions.innerHTML=`<button class="btn btn-outline btn-sm inspo-vb-btn" onclick="navigate('visionboard')" style="display:inline-flex;align-items:center;gap:5px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg><span class="inspo-btn-long">Vision Board</span><span class="inspo-btn-short">Board</span></button><button class="btn btn-primary btn-sm inspo-add-btn" onclick="openAddInspo()" style="display:inline-flex;align-items:center;gap:5px">${_plusIcon()}<span class="inspo-btn-long">Add Idea</span><span class="inspo-btn-short">Add</span></button>`;

  const _inspoCollapsed=(()=>{try{return new Set(JSON.parse(localStorage.getItem('uv_inspo_collapsed')||'[]'));}catch(_){return new Set();}})();

  // Build grouped colour palette
  const groups=[...new Set(WEDDING_COLORS.map(c=>c.group))];
  const allCustom=STATE.inspo.customColors||[];
  const allSelected=STATE.inspo.colors||[];

  // Jump-to items
  const jumpItems=[{id:'inspo-palette',label:'Colours'},...inspoCats().map(cat=>({id:'inspo-'+cat.replace(/[^a-zA-Z0-9]/g,'-'),label:cat}))];

  let html=`
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:24px;padding:12px 14px;background:var(--surface);border-radius:12px;border:1px solid var(--border);align-items:center">
    <span style="font-size:10.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-right:4px">Jump to</span>
    ${jumpItems.map(j=>`<button onclick="document.getElementById('${j.id}')?.scrollIntoView({behavior:'smooth',block:'start'})" style="padding:4px 12px;border-radius:20px;border:1px solid var(--border);background:var(--cream);color:var(--ink);font-family:'Inter',sans-serif;font-size:12px;cursor:pointer;transition:all .15s;white-space:nowrap" onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--gold-deep)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--ink)'">${j.label}</button>`).join('')}
  </div>`;

  html+=`<div id="inspo-palette" style="scroll-margin-top:20px"><div class="palette-section">
    <button type="button" class="toggle-section-btn${_inspoCollapsed.has('inspo-palette')?'':' open'}" onclick="_toggleInspoSection(this,'inspo-palette')" style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:500">
      <span>Colour Palette</span><span class="arrow">▼</span>
    </button>
    <div style="padding-top:16px"${_inspoCollapsed.has('inspo-palette')?' class="hidden"':''}>
    <div style="font-size:13px;color:var(--muted);margin-bottom:18px">Choose the colours that speak to your day</div>

    ${groups.map(group=>{
      const cols=WEDDING_COLORS.filter(c=>c.group===group);
      return`<div class="palette-group-label">${group}</div>
      <div class="palette-swatches">
        ${cols.map(col=>{
          const sel=allSelected.includes(col.hex);
          const isLight=isLightColor(col.hex);
          return`<div class="pal-swatch ${sel?'selected':''}" onclick="toggleColor('${col.hex}')" title="${col.name}">
            <div class="pal-swatch-circle" style="background:${col.hex};${isLight?'border-color:#e0d8cf;':''}"></div>
            <div class="pal-swatch-tick">
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="pal-swatch-name">${col.name}</span>
          </div>`;
        }).join('')}
      </div>`;
    }).join('')}

    ${allCustom.length?`<div class="palette-group-label">Custom Colours</div>
    <div class="palette-swatches">
      ${allCustom.map(col=>{
        const sel=allSelected.includes(col.hex);
        const isLight=isLightColor(col.hex);
        return`<div class="pal-swatch ${sel?'selected':''}" onclick="toggleColor('${col.hex}')" title="${col.name}">
          <div class="pal-swatch-circle" style="background:${col.hex};${isLight?'border-color:#e0d8cf;':''}"></div>
          <div class="pal-swatch-tick">
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <span class="pal-swatch-name">${col.name}</span>
        </div>`;
      }).join('')}
    </div>`:'' }

    <!-- Custom colour add row -->
    <div class="custom-colour-row">
      <input type="color" class="colour-spectrum" id="custom-colour-picker" value="#C4A882" onchange="syncHexFromPicker(this.value)" title="Pick from colour wheel"/>
      <div class="hex-input-wrap">
        <span class="hex-prefix">#</span>
        <input class="hex-text-input" id="custom-hex-input" maxlength="6" placeholder="e.g. C4A882" oninput="syncPickerFromHex(this.value)" onkeydown="if(event.key==='Enter')addCustomColor()"/>
      </div>
      <input class="form-input" id="custom-colour-name" placeholder="Name (optional)" style="flex:1;min-width:120px;max-width:180px;height:42px"/>
      <button class="btn btn-outline btn-sm add-custom-btn" onclick="addCustomColor()" style="display:inline-flex;align-items:center;gap:5px">${_plusIcon()}Add</button>
    </div>
    <div style="font-size:11.5px;color:var(--muted);margin-top:8px">Use the colour wheel or type a hex code to add a custom colour to your palette</div>
  </div>
    ${allSelected.length?`<div class="selected-strip" style="margin-top:18px">
      <span class="your-palette-label">Your palette</span>
      <div class="brush-strokes">
        ${allSelected.map((hex,idx)=>{
          const col=[...WEDDING_COLORS,...allCustom].find(x=>x.hex===hex);
          return brushSwatchHtml(hex, col?col.name:hex, idx);
        }).join('')}
      </div>
    </div>`:`<div style="margin-top:20px;padding-top:18px;border-top:1px solid var(--border);font-size:13px;color:var(--muted)">No colours selected yet — tap a swatch above to build your palette</div>`}
  </div></div>`;

  // Category sections (collapsible)
  const grouped={};
  STATE.inspo.items.forEach(i=>{ if(!grouped[i.category])grouped[i.category]=[]; grouped[i.category].push(i); });
  // Render built-in + custom categories, plus any category present on an item but not
  // in the list (defensive, so no idea is ever hidden), keeping "Other" last.
  const _catList=inspoCats();
  const _extra=Object.keys(grouped).filter(c=>c && !_catList.includes(c));
  const _renderCats=[..._catList.filter(c=>c!=='Other'), ..._extra, 'Other'];
  _renderCats.forEach(cat=>{
    const anchorId='inspo-'+cat.replace(/[^a-zA-Z0-9]/g,'-');
    const items=grouped[cat]||[];
    html+=`<div id="${anchorId}" style="scroll-margin-top:20px" class="card" style="margin-bottom:14px">
      <button type="button" class="toggle-section-btn${_inspoCollapsed.has(anchorId)?'':' open'}" onclick="_toggleInspoSection(this,'${anchorId}')">
        <span style="font-size:17px">${cat}</span><span class="arrow">▼</span>
      </button>
      <div style="padding-top:12px"${_inspoCollapsed.has(anchorId)?' class="hidden"':''}>
        ${items.length?`<div class="grid-3">${items.map(i=>inspoCardHtml(i)).join('')}</div>`:`<div class="empty-state" style="padding:20px"><div class="empty-state-text">No ${cat.toLowerCase()} ideas yet</div></div>`}
        <button class="btn btn-ghost btn-sm" onclick="openAddInspo('${cat}')" style="margin-top:10px;display:inline-flex;align-items:center;gap:5px">${_plusIcon()}Add ${cat} Idea</button>
      </div>
    </div>`;
  });
  c.innerHTML=html;
  // Restore picker value from last hex input
  const picker=document.getElementById('custom-colour-picker');
  const hexIn=document.getElementById('custom-hex-input');
  if(picker&&hexIn){ hexIn.value='C4A882'; }
}

function _toggleInspoSection(btn, id){
  btn.classList.toggle('open');
  const nowCollapsed=!btn.classList.contains('open');
  btn.nextElementSibling.classList.toggle('hidden', nowCollapsed);
  try{
    const s=new Set(JSON.parse(localStorage.getItem('uv_inspo_collapsed')||'[]'));
    if(nowCollapsed)s.add(id);else s.delete(id);
    localStorage.setItem('uv_inspo_collapsed',JSON.stringify([...s]));
  }catch(_){}
}

function isLightColor(hex){
  const r=parseInt(hex.slice(1,3),16);
  const g=parseInt(hex.slice(3,5),16);
  const b=parseInt(hex.slice(5,7),16);
  return(r*299+g*587+b*114)/1000>210;
}

function toggleColor(hex){
  if(!STATE.inspo.colors)STATE.inspo.colors=[];
  const i=STATE.inspo.colors.indexOf(hex);
  if(i>=0)STATE.inspo.colors.splice(i,1); else STATE.inspo.colors.push(hex);
  saveToStorage();
  navigate('inspo');
}

function syncHexFromPicker(val){
  const el=document.getElementById('custom-hex-input');
  if(el)el.value=val.replace('#','').toUpperCase();
}

function syncPickerFromHex(val){
  const clean=val.replace(/[^0-9a-fA-F]/g,'');
  if(clean.length===6){
    const picker=document.getElementById('custom-colour-picker');
    if(picker)picker.value='#'+clean;
  }
}

function addCustomColor(){
  if(!STATE.inspo.customColors)STATE.inspo.customColors=[];
  const hexRaw=(document.getElementById('custom-hex-input')?.value||'').replace(/[^0-9a-fA-F]/g,'');
  if(hexRaw.length!==6){alert('Please enter a valid 6-character hex code.');return;}
  const hex='#'+hexRaw.toUpperCase();
  const name=(document.getElementById('custom-colour-name')?.value.trim())||hex;
  // Don't add duplicates
  const allHexes=[...WEDDING_COLORS,...STATE.inspo.customColors].map(c=>c.hex.toUpperCase());
  if(allHexes.includes(hex.toUpperCase())){
    // Just select it
    if(!STATE.inspo.colors.includes(hex))STATE.inspo.colors.push(hex);
    navigate('inspo'); return;
  }
  STATE.inspo.customColors.push({name,hex});
  STATE.inspo.colors.push(hex);
  navigate('inspo');
}

function inspoCardHtml(item){
  const onVb=STATE.visionboard.includes(item.id);
  return`<div class="inspo-card" id="inspocard-${item.id}" style="position:relative">
    <!-- ··· menu pinned to top-right corner -->
    <div class="dots-menu" style="position:absolute;top:8px;right:8px;z-index:10">
      <button class="dots-btn" onclick="toggleDots(event,'idots-${item.id}')" style="background:rgba(255,255,255,.85);backdrop-filter:blur(4px);border-radius:6px;padding:4px 8px;font-size:16px;border:1px solid rgba(0,0,0,.08)">···</button>
      <div class="dots-dropdown hidden" id="idots-${item.id}">
        <button onclick="closeDots();openEditInspo('${item.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</button>
        <button class="danger" onclick="closeDots();deleteInspo('${item.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Delete</button>
      </div>
    </div>
    <div class="inspo-img-wrap">${_mediaMissing(item.image)?'<span style="color:var(--red)">Image not saved</span>':(_mediaUrl(item.image)?`<img src="${_mediaUrl(item.image)}" alt="${item.title}" onerror="this.parentElement.innerHTML='<span>No image</span>'"/>`:'<span>No image</span>')}</div>
    <div class="inspo-body">
      <div style="font-size:13.5px;font-weight:500;margin-bottom:4px">${item.title}</div>
      ${item.notes?`<div style="font-size:12px;color:var(--muted);margin-bottom:8px">${item.notes}</div>`:''}
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-sm ${onVb?'btn-primary':'btn-outline'}" onclick="toggleVisionboard('${item.id}')">${onVb?'★ On Board':'☆ Add to Board'}</button>
        ${item.link?`<a href="${item.link}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:5px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> ${_escHtml(_urlDomain(item.link))}</a>`:''}
      </div>
      ${inspoBudgetChip(item)}
    </div>
  </div>`;
}

function openAddInspo(cat){
  inspoTempImage='';
  openModal('Add Inspiration',`
  <div style="display:flex;flex-direction:column;gap:10px">
    <div class="form-row">
      <div class="form-group" style="gap:4px"><label class="form-label">Title</label><input class="form-input" id="ii-title" placeholder="What's this idea?"/></div>
      <div class="form-group" style="gap:4px"><label class="form-label">Category</label>${_inspoCatSelectHtml('ii-cat', cat)}</div>
    </div>
    <div class="form-group" style="gap:4px">
      <label class="form-label">Image</label>
      <div style="display:flex;background:var(--input-bg);border:1px solid var(--border);border-radius:7px;overflow:hidden;margin-bottom:4px">
        <button id="ii-tab-upload" onclick="_inspoImgTab('upload')" style="flex:1;padding:6px 10px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;background:transparent;border:none;border-right:1px solid var(--border);cursor:pointer;color:var(--muted);transition:background .15s,color .15s">Upload</button>
        <button id="ii-tab-url" onclick="_inspoImgTab('url')" style="flex:1;padding:6px 10px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;background:rgba(200,164,90,.08);border:none;border-bottom:1.5px solid var(--gold);cursor:pointer;color:var(--gold);transition:background .15s,color .15s">URL</button>
      </div>
      <div id="ii-panel-upload" style="display:none"><input type="file" accept="image/*" class="form-input" onchange="handleInspoUpload(event)" style="padding:5px 8px;font-size:12px"/></div>
      <div id="ii-panel-url" style="display:flex;flex-direction:column;gap:6px"><input class="form-input" id="ii-url" placeholder="https://…" oninput="previewInspoImg(this.value)"/></div>
      <div id="ii-preview" style="display:none;margin-top:4px"><img id="ii-preview-img" style="width:100%;max-height:110px;object-fit:cover;border-radius:7px;border:1px solid var(--border)"/></div>
    </div>
    <div class="form-group" style="gap:4px"><label class="form-label">Link URL</label><input class="form-input" id="ii-link" placeholder="https://…"/></div>
    <div class="form-group" style="gap:4px"><label class="form-label">Link to budget</label>${inspoBudgetLinkHtml('','')}</div>
    <div class="form-group" style="gap:4px"><label class="form-label">Notes</label><textarea class="form-input" id="ii-notes" rows="3" placeholder="Notes or inspiration…" style="resize:vertical;min-height:80px;white-space:pre-wrap;line-height:1.5"></textarea></div>
    <div>
      <button onclick="_inspoTogglePrice()" id="ii-price-btn" style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--gold-dim,#9c7c3f);background:none;border:none;cursor:pointer;padding:0;transition:color .15s">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="transition:transform .2s"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
        Add price
      </button>
      <div id="ii-price-panel" style="overflow:hidden;max-height:0;opacity:0;transition:max-height .25s ease,opacity .2s">
        <div style="padding-top:8px;display:flex;flex-direction:column;gap:4px">
          <label class="form-label" style="font-size:10px">Price or range</label>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px">
            <div style="display:flex;align-items:center;background:var(--input-bg);border:1px solid var(--border);border-radius:7px;overflow:hidden" onfocusin="this.style.borderColor='var(--gold-dim)'" onfocusout="this.style.borderColor='var(--border)'">
              <span style="padding:7px 0 7px 10px;font-size:13px;color:var(--muted);white-space:nowrap;user-select:none;flex-shrink:0">${_curSym()}</span>
              <input class="form-input" id="ii-price-from" placeholder="3,800" inputmode="decimal" style="background:transparent;border:none;border-radius:0;padding-left:4px"/>
            </div>
            <span style="font-size:11px;color:var(--muted);white-space:nowrap">to</span>
            <div style="display:flex;align-items:center;background:var(--input-bg);border:1px solid var(--border);border-radius:7px;overflow:hidden" onfocusin="this.style.borderColor='var(--gold-dim)'" onfocusout="this.style.borderColor='var(--border)'">
              <span style="padding:7px 0 7px 10px;font-size:13px;color:var(--muted);white-space:nowrap;user-select:none;flex-shrink:0">${_curSym()}</span>
              <input class="form-input" id="ii-price-to" placeholder="optional max" inputmode="decimal" style="background:transparent;border:none;border-radius:0;padding-left:4px"/>
            </div>
          </div>
          <span style="font-size:11px;color:var(--muted)">Leave "to" empty for a single price.</span>
        </div>
      </div>
    </div>
  </div>`,
  `<button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
   <button class="btn btn-primary" onclick="saveInspo()">Add Idea</button>`);
}

function previewInspoImg(url){
  const prev=document.getElementById('ii-preview'); const img=document.getElementById('ii-preview-img');
  if(url&&prev&&img){ prev.style.display='block'; img.src=url; inspoTempImage=url; }
  else if(prev){ prev.style.display='none'; }
}
function _inspoImgTab(t){
  ['upload','url'].forEach(function(tab){
    const btn=document.getElementById('ii-tab-'+tab);
    const panel=document.getElementById('ii-panel-'+tab);
    const on=tab===t;
    if(btn){btn.style.background=on?'rgba(200,164,90,.08)':'transparent';btn.style.color=on?'var(--gold)':'var(--muted)';btn.style.borderBottom=on?'1.5px solid var(--gold)':'none';}
    if(panel) panel.style.display=on?'flex':'none';
  });
}
function _inspoTogglePrice(){
  const panel=document.getElementById('ii-price-panel');
  const btn=document.getElementById('ii-price-btn');
  if(!panel||!btn) return;
  const open=panel.dataset.open==='1';
  if(!open){
    panel.dataset.open='1';panel.style.maxHeight='120px';panel.style.opacity='1';
    btn.querySelector('svg').style.transform='rotate(45deg)';
    setTimeout(function(){const f=document.getElementById('ii-price-from');if(f)f.focus();},250);
  } else {
    panel.dataset.open='';panel.style.maxHeight='0';panel.style.opacity='0';
    btn.querySelector('svg').style.transform='';
  }
}
/* ── Media prep — ONE place that decides how an uploaded file is stored ──────
   Was: four upload sites, only one of which compressed. A 4MB phone photo went
   in raw (~5.3MB as base64) and blew the whole localStorage budget on its own.
   Now every upload goes through here.
   Images are compressed. PDFs and everything else pass through untouched —
   they CAN'T be compressed, which is exactly why localStorage was never going
   to hold this and why IndexedDB is the real fix. This just buys time. */
function _prepMedia(dataUrl, type){
  const isImg = (type||'').startsWith('image/') || /^data:image\//.test(dataUrl||'');
  if(!isImg) return Promise.resolve(dataUrl);        // PDF, doc, anything else
  return compressImage(dataUrl);                     // 800px, JPEG q0.72
}

// Does this canvas have any pixel that is not fully opaque? Sampled, not exhaustive —
// a 4000x3000 photo is 12 million pixels and reading every alpha byte would jank the
// upload for no gain. A logo, a monogram, a cut-out has transparency in LARGE regions,
// so a grid sample finds it. A photo has none anywhere, so any sample proves it.
function _hasAlpha(canvas){
  try{
    const ctx=canvas.getContext('2d');
    const {width:w, height:h}=canvas;
    const step=Math.max(1, Math.floor(Math.min(w,h)/64));   // ~64x64 grid of probes
    for(let y=0; y<h; y+=step){
      const row=ctx.getImageData(0, y, w, 1).data;
      for(let x=0; x<w; x+=step){
        if(row[x*4+3] < 250) return true;   // <250, not <255: PNG edges are antialiased
      }
    }
    // Corners specifically. A cut-out on a transparent background is transparent exactly
    // there, and a coarse grid can stride straight past a thin border.
    const cs=ctx.getImageData(0,0,1,1).data, ce=ctx.getImageData(w-1,0,1,1).data,
          bs=ctx.getImageData(0,h-1,1,1).data, be=ctx.getImageData(w-1,h-1,1,1).data;
    if(cs[3]<250 || ce[3]<250 || bs[3]<250 || be[3]<250) return true;
  }catch(e){
    // getImageData throws on a tainted canvas (cross-origin image). We only ever draw
    // images the user just picked off their own disk, so this shouldn't fire — but if it
    // does, assume alpha. A slightly bigger PNG is a far cheaper mistake than a black box.
    return true;
  }
  return false;
}

// v125: this used to ALWAYS return JPEG. JPEG has no alpha channel — and a <canvas> starts
// out transparent BLACK (rgba(0,0,0,0)), so every transparent pixel of a PNG was encoded
// as solid black. A cut-out monogram uploaded as a hero came back as a black rectangle.
//
// It was not a rendering bug. The bytes were destroyed AT UPLOAD, in the one function every
// upload path in the app goes through. Anything already uploaded is already ruined and has
// to be re-uploaded — this fix cannot undo it.
//
// Photos still become JPEG (small). Only an image with ACTUAL transparent pixels pays the
// PNG size cost — tested for, not guessed from the file extension, because a PNG photo with
// no transparency would otherwise balloon for nothing.
function compressImage(dataUrl, maxSize=800, quality=0.72){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      let {width:w,height:h}=img;
      if(w>maxSize||h>maxSize){
        if(w>h){ h=Math.round(h*maxSize/w); w=maxSize; }
        else { w=Math.round(w*maxSize/h); h=maxSize; }
      }
      const canvas=document.createElement('canvas');
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      resolve(_hasAlpha(canvas)
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg',quality));
    };
    img.onerror=()=>resolve(dataUrl);
    img.src=dataUrl;
  });
}
function handleInspoUpload(e){
  const file=e.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=async ev=>{
    const compressed=await compressImage(ev.target.result);
    const id=await _mediaPut(compressed, file.name, 'image/jpeg');
    inspoTempImage=id;                      /* an id, not 5MB of base64 */
    const p=document.getElementById('ii-preview');
    const i=document.getElementById('ii-preview-img');
    if(p)p.style.display='block';
    if(i)i.src=_mediaUrl(id);
  };
  reader.readAsDataURL(file);
}
// Resolve the linked budget label for an inspo item
function inspoBudgetLabel(item){
  if(!item.budgetId) return '';
  const b=STATE.budget.items.find(x=>x.id===item.budgetId);
  if(!b) return '';
  if(item.budgetSubId){
    const s=(b.subItems||[]).find(x=>x.id===item.budgetSubId);
    if(s){ const a=getSubItemAmount(s); return a?`${b.name} › ${s.name} — ${fmt(a)}`:`${b.name} › ${s.name}`; }
  }
  const t=calcBudgetItemTotal(b);
  return t?`${b.name} — ${fmt(t)}`:b.name;
}

// Clickable budget chip shown on an inspo card
function inspoBudgetChip(item){
  const label=inspoBudgetLabel(item);
  if(!label) return '';
  return `<div style="margin-top:7px">
    <span onclick="event.stopPropagation();jumpToBudget('${item.budgetId}')" title="Go to budget item"
      style="font-size:10px;padding:2px 7px;border-radius:11px;background:var(--parchment);color:var(--gold-deep);display:inline-flex;align-items:center;gap:4px;cursor:pointer;border:1px solid var(--border)">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14.8 9.5a3 3 0 0 0-5.6 1.2c0 2.5 4 1.8 4 4a3 3 0 0 1-5.6 1.2"/><line x1="12" y1="6.5" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="17.5"/></svg>
      ${label}
    </span>
  </div>`;
}

// Navigate to the budget page and highlight a linked item
function jumpToBudget(budgetId){
  navigate('budget');
  setTimeout(()=>{
    const el=document.getElementById('bi-'+budgetId);
    if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); _flashHighlight(el); }
  },140);
}

// Clickable inspiration chip shown on a Payment (reciprocal of inspoBudgetChip)
function budgetInspoChip(b){
  if(!b.inspoId) return '';
  const item=STATE.inspo.items.find(i=>i.id===b.inspoId);
  if(!item) return '';
  return `<div style="margin-top:4px">
    <span onclick="event.stopPropagation();openInspoPreview('${item.id}',event.currentTarget,{unlinkBudgetId:'${b.id}'})" title="View inspiration idea"
      style="font-size:10px;padding:2px 7px;border-radius:11px;background:rgba(153,53,86,.10);color:#993556;display:inline-flex;align-items:center;gap:4px;cursor:pointer">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1z"/></svg>
      ${item.title}
    </span>
  </div>`;
}

// Navigate to inspiration page and scroll/highlight the linked idea
function jumpToInspo(inspoId){
  navigate('inspo');
  setTimeout(()=>{
    const el=document.getElementById('inspocard-'+inspoId);
    if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); _flashHighlight(el); }
  },140);
}


function inspoBudgetLinkHtml(selectedId='', selectedSubId=''){
  const allItems=STATE.budget.items.filter(b=>b.name&&b.name.trim());
  let opts='';
  allItems.forEach(b=>{
    const bSel=b.id===selectedId&&!selectedSubId;
    opts+=`<option value="${b.id}|" ${bSel?'selected':''}>${b.name}${calcBudgetItemTotal(b)?` — ${fmt(calcBudgetItemTotal(b))}`:''}</option>`;
    if(b.subItems&&b.subItems.length){
      b.subItems.forEach(s=>{
        const sSel=b.id===selectedId&&s.id===selectedSubId;
        const a=getSubItemAmount(s);
        opts+=`<option value="${b.id}|${s.id}" ${sSel?'selected':''}>\u00a0\u00a0\u00a0↳ ${s.name}${a?` — ${fmt(a)}`:''}</option>`;
      });
    }
  });
  return `<div style="position:relative">
    <select class="form-input" id="ii-budget" style="appearance:none;-webkit-appearance:none;padding-right:32px">
      <option value="">— No link —</option>
      ${opts}
    </select>
    
  </div>`;
}

// Apply a one-per-item Inspiration↔Budget link with reciprocal sync
function applyInspoBudgetLink(item, rawVal){
  const prevBudgetId=item.budgetId||'';
  let newBudgetId='', newSubId='';
  if(rawVal){ const [bid,sid]=rawVal.split('|'); newBudgetId=bid||''; newSubId=sid||''; }
  // Clear reciprocal pointer on a previously-linked Payment if it changed
  if(prevBudgetId && prevBudgetId!==newBudgetId){
    const prevB=STATE.budget.items.find(b=>b.id===prevBudgetId);
    if(prevB && prevB.inspoId===item.id){ delete prevB.inspoId; }
  }
  item.budgetId=newBudgetId; item.budgetSubId=newSubId;
  if(newBudgetId){
    const b=STATE.budget.items.find(x=>x.id===newBudgetId);
    if(b){
      // If that Payment was linked to a different inspo, clear that inspo's pointer
      if(b.inspoId && b.inspoId!==item.id){
        const other=STATE.inspo.items.find(i=>i.id===b.inspoId);
        if(other){ delete other.budgetId; delete other.budgetSubId; }
      }
      b.inspoId=item.id;
    }
  }
}

function saveInspo(editId){
  const title=document.getElementById('ii-title')?.value.trim(); if(!title)return;
  let cat=document.getElementById('ii-cat')?.value||'Other';
  // If the user left the "+ Add new category…" option selected, finalise it: use any
  // typed name (registering it), otherwise fall back to a sensible default.
  if(cat===_INSPO_NEWCAT){
    const typed=document.getElementById('ii-cat-newname')?.value;
    const added=addInspoCategory(typed);
    cat = added || _inspoCatPrev['ii-cat'] || 'Other';
  }
  const url=document.getElementById('ii-url')?.value.trim()||'';
  const link=document.getElementById('ii-link')?.value.trim()||'';
  const notes=document.getElementById('ii-notes')?.value||'';
  const budgetVal=document.getElementById('ii-budget')?.value||'';
  const priceFrom=document.getElementById('ii-price-from')?.value.trim()||'';
  const priceTo=document.getElementById('ii-price-to')?.value.trim()||'';
  const image=inspoTempImage||url||'';
  inspoTempImage='';
  let item;
  if(editId){ item=STATE.inspo.items.find(x=>x.id===editId); if(item){item.title=title;item.category=cat;if(image)item.image=image;item.notes=notes;item.link=link;item.priceFrom=priceFrom;item.priceTo=priceTo;} }
  else { item={id:'i'+Date.now(),title,category:cat,image,notes,link,priceFrom,priceTo}; STATE.inspo.items.push(item); }
  if(item) applyInspoBudgetLink(item, budgetVal);
  saveToStorage(); closeModalDirect(); navigate('inspo');
}
// Enlarged "lightbox" preview of a vision-board idea in its current state.
// Opened by clicking a card on the full board or the dashboard widget. The footer
// carries an Edit button (bottom-right) that switches to the editor.
function openInspoPreview(id, originEl, opts){
  opts=opts||{};
  const item=STATE.inspo.items.find(x=>x.id===id); if(!item) return;
  const isDark=document.body.classList.contains('dark');
  const muted='var(--muted)';
  const imgHtml = _mediaUrl(item.image)
    ? `<img src="${_mediaUrl(item.image)}" alt="${_escHtml(item.title||'')}" style="width:100%;display:block;object-fit:cover;max-height:340px;border-radius:10px" onerror="this.style.display='none'"/>`
    : `<div style="width:100%;height:170px;border-radius:10px;background:var(--surface);display:flex;align-items:center;justify-content:center"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${muted}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
  const catHtml = item.category ? `<div style="font-size:12px;color:${muted};font-style:italic;margin-top:2px">${_escHtml(item.category)}</div>` : '';
  const chipHtml = inspoBudgetChip(item);
  const notesHtml = item.notes ? `<div style="font-size:13px;color:var(--ink);margin-top:11px;line-height:1.6;white-space:pre-wrap">${_escHtml(item.notes)}</div>` : '';
  const linkHtml = item.link ? `<div style="margin-top:11px"><a href="${item.link}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:${muted};text-decoration:underline;font-style:italic;max-width:100%;overflow:hidden"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0">${_escHtml(_urlDomain(item.link))}</span></a></div>` : '';
  const body = `<div style="display:flex;flex-direction:column">
    ${imgHtml}
    <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--ink);margin-top:12px;line-height:1.2">${_escHtml(item.title||'Untitled idea')}</div>
    ${catHtml}
    ${chipHtml}
    ${notesHtml}
    ${linkHtml}
  </div>`;
  const _unlinkBtn = opts.unlinkBudgetId
    ? `<button class="btn btn-outline" style="margin-right:auto;color:var(--red);border-color:rgba(192,57,43,.4)" onclick="_unlinkInspoFromBudget('${id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><path d="M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"/><path d="M5.17 11.75l-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"/><line x1="8" y1="2" x2="8" y2="5"/><line x1="2" y1="8" x2="5" y2="8"/><line x1="16" y1="19" x2="16" y2="22"/><line x1="19" y1="16" x2="22" y2="16"/></svg>Unlink</button>`
    : '';
  openModal('Idea', body,
    `${_unlinkBtn}<button class="btn btn-primary" onclick="openEditInspo('${id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>`);
  _liftOffModalFrom(originEl);
}
// Unlink an inspo idea from its linked Payment (clears both reciprocal pointers),
// close the popup, and refresh the budget page.
function _unlinkInspoFromBudget(inspoId){
  const item=STATE.inspo.items.find(x=>x.id===inspoId);
  if(item){
    const bId=item.budgetId;
    if(bId){ const b=STATE.budget.items.find(x=>x.id===bId); if(b && b.inspoId===inspoId) delete b.inspoId; }
    delete item.budgetId; delete item.budgetSubId;
  }
  saveToStorage();
  closeModalDirect();
  if((_currentPage||'')==='budget') navigate('budget');
  else if((_currentPage||'')==='inspo') navigate('inspo');
}
// Animate #modal-box so it appears to lift off the clicked card: scale up from the
// card's position and settle toward centre. Falls back to no animation (the normal
// appearance) when there's no origin element or motion is reduced.
function _liftOffModalFrom(originEl){
  const box=document.getElementById('modal-box');
  if(!box) return;
  // Clear any stale lift-off state from a previous open first.
  box.classList.remove('idea-liftoff');
  box.style.removeProperty('--lo-x'); box.style.removeProperty('--lo-y'); box.style.removeProperty('--lo-s');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!originEl || reduce){ return; }
  const r=originEl.getBoundingClientRect();
  if(!r || !r.width || !r.height) return;
  // Measure the modal's final (centred) rect, then compute the translate + scale
  // that would place it onto the origin card — the animation runs from there to rest.
  const m=box.getBoundingClientRect();
  if(!m.width || !m.height) return;
  const ox=(r.left+r.width/2)-(m.left+m.width/2);
  const oy=(r.top+r.height/2)-(m.top+m.height/2);
  const os=Math.max(.12, Math.min(r.width/m.width, .5));
  box.style.setProperty('--lo-x', ox+'px');
  box.style.setProperty('--lo-y', oy+'px');
  box.style.setProperty('--lo-s', String(os));
  box.classList.remove('idea-liftoff');
  void box.offsetWidth; // restart the animation if one was mid-flight
  box.classList.add('idea-liftoff');
  const done=()=>{ box.classList.remove('idea-liftoff'); box.style.removeProperty('--lo-x'); box.style.removeProperty('--lo-y'); box.style.removeProperty('--lo-s'); box.removeEventListener('animationend', done); };
  box.addEventListener('animationend', done);
}
function openEditInspo(id){
  const item=STATE.inspo.items.find(x=>x.id===id); if(!item)return;
  inspoTempImage=item.image||'';   /* now a media id or an http URL, never bytes */
  openModal('Edit Idea',`
  <div style="display:flex;flex-direction:column;gap:10px">
    <div class="form-row">
      <div class="form-group" style="gap:4px"><label class="form-label">Title</label><input class="form-input" id="ii-title" value="${item.title}"/></div>
      <div class="form-group" style="gap:4px"><label class="form-label">Category</label>${_inspoCatSelectHtml('ii-cat', item.category)}</div>
    </div>
    <div class="form-group" style="gap:4px">
      <label class="form-label">Image</label>
      <div style="display:flex;background:var(--input-bg);border:1px solid var(--border);border-radius:7px;overflow:hidden;margin-bottom:4px">
        <button id="ii-tab-upload" onclick="_inspoImgTab('upload')" style="flex:1;padding:6px 10px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;${item.image&&!String(item.image).startsWith('http')?'background:rgba(200,164,90,.08);color:var(--gold);border-bottom:1.5px solid var(--gold);':'background:transparent;color:var(--muted);'}border:none;border-right:1px solid var(--border);cursor:pointer;transition:background .15s,color .15s">Upload</button>
        <button id="ii-tab-url" onclick="_inspoImgTab('url')" style="flex:1;padding:6px 10px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;${!item.image||String(item.image).startsWith('http')?'background:rgba(200,164,90,.08);color:var(--gold);border-bottom:1.5px solid var(--gold);':'background:transparent;color:var(--muted);'}border:none;cursor:pointer;transition:background .15s,color .15s">URL</button>
      </div>
      <div id="ii-panel-upload" style="display:${item.image&&!String(item.image).startsWith('http')?'flex':'none'}"><input type="file" accept="image/*" class="form-input" onchange="handleInspoUpload(event)" style="padding:5px 8px;font-size:12px"/></div>
      <div id="ii-panel-url" style="display:${!item.image||String(item.image).startsWith('http')?'flex':'none'};flex-direction:column;gap:6px"><input class="form-input" id="ii-url" value="${item.image&&String(item.image).startsWith('http')?item.image:''}" placeholder="https://…" oninput="previewInspoImg(this.value)"/></div>
      ${_mediaUrl(item.image)?`<div id="ii-preview" style="display:block;margin-top:4px"><img id="ii-preview-img" src="${_mediaUrl(item.image)}" style="width:100%;max-height:110px;object-fit:cover;border-radius:7px;border:1px solid var(--border)"/></div>`:`<div id="ii-preview" style="display:none;margin-top:4px"><img id="ii-preview-img" style="width:100%;max-height:110px;object-fit:cover;border-radius:7px;border:1px solid var(--border)"/></div>`}
    </div>
    <div class="form-group" style="gap:4px"><label class="form-label">Link URL</label><input class="form-input" id="ii-link" value="${item.link||''}" placeholder="https://…"/></div>
    <div class="form-group" style="gap:4px"><label class="form-label">Link to budget</label>${inspoBudgetLinkHtml(item.budgetId||'', item.budgetSubId||'')}</div>
    <div class="form-group" style="gap:4px"><label class="form-label">Notes</label><textarea class="form-input" id="ii-notes" rows="3" style="resize:vertical;min-height:80px;white-space:pre-wrap;line-height:1.5">${item.notes||''}</textarea></div>
    <div>
      <button onclick="_inspoTogglePrice()" id="ii-price-btn" style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--gold-dim,#9c7c3f);background:none;border:none;cursor:pointer;padding:0;transition:color .15s">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="transition:transform .2s${item.priceFrom||item.priceTo?';transform:rotate(45deg)':''}"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
        ${item.priceFrom||item.priceTo?'Price':'Add price'}
      </button>
      <div id="ii-price-panel" data-open="${item.priceFrom||item.priceTo?'1':''}" style="overflow:hidden;max-height:${item.priceFrom||item.priceTo?'120px':'0'};opacity:${item.priceFrom||item.priceTo?'1':'0'};transition:max-height .25s ease,opacity .2s">
        <div style="padding-top:8px;display:flex;flex-direction:column;gap:4px">
          <label class="form-label" style="font-size:10px">Price or range</label>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px">
            <div style="display:flex;align-items:center;background:var(--input-bg);border:1px solid var(--border);border-radius:7px;overflow:hidden" onfocusin="this.style.borderColor='var(--gold-dim)'" onfocusout="this.style.borderColor='var(--border)'">
              <span style="padding:7px 0 7px 10px;font-size:13px;color:var(--muted);white-space:nowrap;user-select:none;flex-shrink:0">${_curSym()}</span>
              <input class="form-input" id="ii-price-from" value="${item.priceFrom||''}" placeholder="3,800" inputmode="decimal" style="background:transparent;border:none;border-radius:0;padding-left:4px"/>
            </div>
            <span style="font-size:11px;color:var(--muted);white-space:nowrap">to</span>
            <div style="display:flex;align-items:center;background:var(--input-bg);border:1px solid var(--border);border-radius:7px;overflow:hidden" onfocusin="this.style.borderColor='var(--gold-dim)'" onfocusout="this.style.borderColor='var(--border)'">
              <span style="padding:7px 0 7px 10px;font-size:13px;color:var(--muted);white-space:nowrap;user-select:none;flex-shrink:0">${_curSym()}</span>
              <input class="form-input" id="ii-price-to" value="${item.priceTo||''}" placeholder="optional max" inputmode="decimal" style="background:transparent;border:none;border-radius:0;padding-left:4px"/>
            </div>
          </div>
          <span style="font-size:11px;color:var(--muted)">Leave "to" empty for a single price.</span>
        </div>
      </div>
    </div>
  </div>`,
  `<button class="btn btn-danger" style="margin-right:auto" onclick="deleteInspo('${id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>Delete</button>
   <button class="btn btn-outline" onclick="closeModalDirect()">Cancel</button>
   <button class="btn btn-primary" onclick="saveInspo('${id}')">Save</button>`);
}
function deleteInspo(id){
  const it=(STATE.inspo.items||[]).find(x=>x.id===id);
  _confirmDeleteDialog({title:'Remove Idea', question:'Remove this idea?', name:it?(it.title||it.name||it.note||''):'', verb:'Remove', onConfirmJs:`confirmDeleteInspo('${id}')`});
}
function confirmDeleteInspo(id){
  const _i0=(STATE.inspo.items||[]).find(x=>x.id===id);
  const _label=_i0?(_i0.title||_i0.name||_i0.note||'idea'):'idea';
  closeModalDirect();
  _undoableDelete(_label, ()=>{
    STATE.inspo.items=STATE.inspo.items.filter(x=>x.id!==id);
    STATE.visionboard=STATE.visionboard.filter(x=>x!==id);
  }, 'inspo');
}
function setVisionOnDash(on){
  STATE.settings.showVisionOnDash = !!on;
  saveToStorage();
  // Keep the Settings checkbox in lockstep even when Settings isn't being re-rendered.
  const cb=document.getElementById('set-vision-dash');
  if(cb) cb.checked = !!on;
  // Only the Dashboard visibly changes (the widget appears/disappears), so re-render
  // just that page — and only when it's the one on screen, so toggling from Settings
  // or the Vision Board page doesn't jump the scroll position.
  if((_currentPage||'')==='dashboard'){
    navigate('dashboard');
  } else if((_currentPage||'')==='visionboard'){
    // Refresh the Vision Board page's own On/Add-to-Dashboard button in place.
    if(typeof _syncVisionDashBtn==='function') _syncVisionDashBtn();
  }
}
function _syncVisionDashBtn(){
  const btn=document.getElementById('vb-dash-btn'); if(!btn) return;
  const on=!!STATE.settings.showVisionOnDash;
  btn.className='btn btn-sm '+(on?'btn-primary':'btn-outline');
  const ic=btn.querySelector('svg'); if(ic) ic.setAttribute('fill', on?'currentColor':'none');
  const lbl=btn.querySelector('.vb-dash-btn-label'); if(lbl) lbl.textContent = on?'On Dashboard':'Add to Dashboard';
}
function toggleVisionOnDash(){
  setVisionOnDash(!STATE.settings.showVisionOnDash);
}

function toggleVisionboard(id){
  const i=STATE.visionboard.indexOf(id);
  if(i>=0)STATE.visionboard.splice(i,1); else STATE.visionboard.push(id);
  saveToStorage();
  navigate('inspo');
}

// ══════════════════════════════════════════════
