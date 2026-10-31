// GUEST TAGS — name + colour + optional icon
// ══════════════════════════════════════════════
// Tag definitions live in STATE.tagDefs: { tagName: {color, icon} }.
// Guests still store tag *names* in g.tags (strings), so plain tags keep working.

// Curated icon set (key → SVG inner paths). Drawn to match the app's line style.
const _TAG_ICONS={
  star:'<path d="M12 2l2.4 7.4H22l-6 4.3 2.3 7.3-6.3-4.6L5.7 21l2.3-7.3-6-4.3h7.6z"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  person:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  people:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><path d="M16 5.5a3.2 3.2 0 0 1 0 6"/><path d="M17 15.2c2.3.5 4 2 4 4.8"/>',
  ring:'<circle cx="12" cy="14" r="6"/><path d="M9 6l3-4 3 4"/><path d="M9 6h6"/>',
  gift:'<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
  home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  flower:'<circle cx="12" cy="12" r="3"/><path d="M12 5a2.6 2.6 0 0 1 0 4 2.6 2.6 0 0 1 0-4z"/><path d="M12 15a2.6 2.6 0 0 1 0 4 2.6 2.6 0 0 1 0-4z"/><path d="M5 12a2.6 2.6 0 0 1 4 0 2.6 2.6 0 0 1-4 0z"/><path d="M15 12a2.6 2.6 0 0 1 4 0 2.6 2.6 0 0 1-4 0z"/>',
  crown:'<path d="M3 7l4 4 5-7 5 7 4-4-2 13H5z"/>',
  cake:'<path d="M4 21h16"/><path d="M5 21v-7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v7"/><path d="M4 15c1.5 1.5 3 1.5 4 0s2.5-1.5 4 0 2.5 1.5 4 0 2.5-1.5 4 0"/><line x1="12" y1="4" x2="12" y2="8"/>',
  music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  car:'<path d="M2.5 14v-2.2c0-.4.2-.7.6-.9l2.3-1 2.6-2.6c.4-.4.9-.6 1.4-.6h5.1c.5 0 1 .2 1.4.6l2.2 2.2 2.2.6c.5.1.8.6.8 1.1V14a1 1 0 0 1-1 1h-1.3"/><path d="M9 15H7"/><circle cx="6" cy="16" r="2"/><circle cx="17" cy="16" r="2"/>',
  plane:'<path d="M21.5 12c.6 0 1-.4 1-1s-.4-1-1-1l-7.5-.3-4-7.2c-.2-.3-.5-.5-.9-.5h-1l2 8L5 10l-1.3-2.2c-.2-.2-.4-.3-.7-.3H2l1.2 3.5L2 14.5h1c.3 0 .5-.1.7-.3L5 12l4.6-.2-2 8h1c.4 0 .7-.2.9-.5l4-7.2 7.5-.3z"/>',
  glass:'<path d="M8 22h8"/><path d="M12 15v7"/><path d="M5 3h14l-2 7a5 5 0 0 1-10 0z"/>',
  flag:'<path d="M4 22V4"/><path d="M4 4h13l-2 4 2 4H4"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  pin:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'
};
const _TAG_ICON_KEYS=Object.keys(_TAG_ICONS);

// Curated colour palette (works in both themes; text uses the same hue darker/lighter).
const _TAG_COLORS=['#9A7B2E','#C0653E','#5C8A4E','#4A7C9E','#8E6BA8','#C56B8C','#C99A2E','#3F8E7F','#A2553B','#5A5A57'];

function _tagIconSvg(key,size){
  size=size||11;
  const inner=_TAG_ICONS[key];
  if(!inner) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// Convert a hex colour to a translucent rgba background.
function _hexToRgba(hex,a){
  let h=String(hex||'').replace('#','');
  if(h.length===3) h=h.split('').map(c=>c+c).join('');
  if(h.length!==6) return 'var(--parchment)';
  const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}
// In dark mode a deep colour is hard to read on the dark chip; lighten if needed.
function _tagInkColor(hex){
  // Return the same hue; dark theme styling is handled via opacity-based bg so the
  // hex itself stays legible against the translucent fill in both modes.
  return hex;
}

// Render a single tag as a styled chip. Falls back to the default .tag look
// when the tag has no definition. `opts.click` adds an onclick; `opts.active`
// renders the selected (gold) filter state; `opts.count` appends a small count.
function _tagChipHtml(name, opts){
  opts=opts||{};
  const def=(STATE.tagDefs||{})[name];
  const icon=def&&def.icon?_tagIconSvg(def.icon,11):'';
  const countHtml=(opts.count!=null)?`<span style="font-weight:400;opacity:.75">${opts.count}</span>`:'';
  const clickAttr=opts.click?` onclick="${opts.click}"`:'';
  const cursor=opts.click?'cursor:pointer;':'';
  if(opts.active){
    // Selected filter state — solid gold regardless of colour.
    return `<span class="tag"${clickAttr} style="${cursor}background:var(--gold);color:#fff">${icon?`<span style="display:inline-flex">${icon}</span>`:''}${_escHtml(name)}${countHtml}</span>`;
  }
  if(def&&def.color){
    const bg=_hexToRgba(def.color,0.16);
    const fg=_tagInkColor(def.color);
    return `<span class="tag"${clickAttr} style="${cursor}background:${bg};color:${fg}">${icon?`<span style="display:inline-flex">${icon}</span>`:''}${_escHtml(name)}${countHtml}</span>`;
  }
  // Plain/legacy tag — default chip style.
  return `<span class="tag"${clickAttr} style="${cursor}">${_escHtml(name)}${countHtml}</span>`;
}

// ── Manage Tags modal ──
let _tagEditKey=null;        // name of tag being edited (null = creating new)
let _tagDraft={name:'',color:_TAG_COLORS[0],icon:''};

function openManageTags(){
  _tagEditKey=null;
  _renderManageTagsList();
}

// How many guests carry a given tag.
function _tagGuestCount(name){
  return (STATE.guests||[]).filter(g=>(g.tags||[]).includes(name)).length;
}
// All known tag names: defined ones + any used on guests.
function _allTagNames(){
  const set=new Set(Object.keys(STATE.tagDefs||{}));
  (STATE.guests||[]).forEach(g=>(g.tags||[]).forEach(t=>set.add(t)));
  return [...set].sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
}

// ── Existing-tag chip picker for the Add/Edit Guest & Add Couple forms ──
// Renders all already-created tags as tappable chips beneath a tags <input>.
// Tapping a chip toggles that tag name in/out of the comma-separated field.
// `inputId` is the field the chips drive (gf-tags or eg-tags). Returns '' (the
// whole block is hidden) when there are no tags yet, so the form stays clean.
// ── Tag dropdown (used in Edit Guest / Add Guest More Details) ──
function _tagDropdownAppliedHtml(inputId){
  const cur=_tagPickerCurrent(inputId);
  if(!cur.length) return '<span style="font-size:11.5px;color:var(--muted)">No tags added yet</span>';
  return cur.map(name=>{
    const def=(STATE.tagDefs||{})[name];
    const bg=def&&def.color?_hexToRgba(def.color,0.14):'rgba(154,123,46,.12)';
    const fg=def&&def.color?_tagInkColor(def.color):'#7A6230';
    return `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:10px;font-size:11.5px;font-weight:500;background:${bg};color:${fg};border:1px solid ${fg}33">
      ${_escHtml(name)}
      <span onclick="_tagDropdownRemove('${_escSQ(inputId)}','${_escSQ(name)}')" style="cursor:pointer;font-weight:700;font-size:10px;opacity:.7">×</span>
    </span>`;
  }).join('');
}
function _tagDropdownListHtml(inputId, query){
  const q=(query||'').toLowerCase().trim();
  const all=_allTagNames();
  const cur=_tagPickerCurrent(inputId).map(t=>t.toLowerCase());
  const filtered=q?all.filter(n=>n.toLowerCase().includes(q)):all;
  const rows=filtered.map((name,i)=>{
    const def=(STATE.tagDefs||{})[name];
    const dot=def&&def.color?`<span style="width:8px;height:8px;border-radius:50%;background:${def.color};flex-shrink:0;display:inline-block"></span>`:'<span style="width:8px;height:8px;border-radius:50%;background:var(--gold);flex-shrink:0;display:inline-block"></span>';
    const active=cur.includes(name.toLowerCase());
    const tick=active?`<span style="font-size:11px;color:var(--gold-deep);font-weight:600;margin-left:auto">✓</span>`:'';
    return `<div onclick="_tagDropdownToggle('${_escSQ(inputId)}','${_escSQ(name)}')" style="display:flex;align-items:center;gap:9px;padding:8px 12px;cursor:pointer;border-bottom:.5px solid var(--border);${active?'background:var(--surface)':''}">
      ${dot}<span style="font-size:13px;color:${active?'var(--gold-deep)':'var(--ink)'};font-weight:${active?600:400};flex:1">${_escHtml(name)}</span>${tick}
    </div>`;
  });
  const newTagRow=q&&!all.some(n=>n.toLowerCase()===q)
    ?`<div onclick="_tagDropdownCreate('${_escSQ(inputId)}','${_escSQ(query)}')" style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;color:var(--gold-deep);font-weight:600;font-size:12.5px;border-top:.5px solid var(--border)"><svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>Create "${_escHtml(query)}"</div>`
    :'';
  const manageRow=`<div onclick="openManageTags()" style="display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;color:var(--muted);font-size:11.5px;border-top:.5px solid var(--border)"><svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>Manage tags…</div>`;
  if(!rows.length&&!newTagRow) return `<div style="font-size:12.5px;color:var(--muted);padding:10px 12px">No tags yet. Type a name to create one.</div>`+manageRow;
  return rows.join('')+newTagRow+manageRow;
}
function _tagDropdownToggle(inputId, name){
  _tagPickerToggle(inputId, name);
  // Re-render applied chips and list
  const chips=document.getElementById(inputId+'-dd-chips');
  if(chips) chips.innerHTML=_tagDropdownAppliedHtml(inputId);
  const list=document.getElementById(inputId+'-dd-list');
  const search=document.getElementById(inputId+'-dd-search');
  if(list) list.innerHTML=_tagDropdownListHtml(inputId, search?search.value:'');
}
function _tagDropdownRemove(inputId, name){
  _tagPickerToggle(inputId, name); // same toggle fn removes if present
  const chips=document.getElementById(inputId+'-dd-chips');
  if(chips) chips.innerHTML=_tagDropdownAppliedHtml(inputId);
  const list=document.getElementById(inputId+'-dd-list');
  const search=document.getElementById(inputId+'-dd-search');
  if(list) list.innerHTML=_tagDropdownListHtml(inputId, search?search.value:'');
}
function _tagDropdownSearch(inputId, query){
  const list=document.getElementById(inputId+'-dd-list');
  if(list) list.innerHTML=_tagDropdownListHtml(inputId, query);
}
function _tagDropdownCreate(inputId, name){
  if(!name.trim()) return;
  // Add to tagDefs with a default colour, then add to guest
  if(!STATE.tagDefs) STATE.tagDefs={};
  if(!STATE.tagDefs[name]) STATE.tagDefs[name]={color:_TAG_COLORS[Object.keys(STATE.tagDefs).length%_TAG_COLORS.length],icon:''};
  saveToStorage();
  _tagDropdownToggle(inputId, name);
  const search=document.getElementById(inputId+'-dd-search');
  if(search) search.value='';
}
function _tagDropdownOpen(inputId){
  const panel=document.getElementById(inputId+'-dd-panel');
  if(!panel) return;
  panel.style.display='block';
  const search=document.getElementById(inputId+'-dd-search');
  if(search) search.focus();
  const list=document.getElementById(inputId+'-dd-list');
  if(list) list.innerHTML=_tagDropdownListHtml(inputId,'');
  // Close on outside click
  setTimeout(()=>{
    function _outsideClose(e){
      const wrap=document.getElementById(inputId+'-dd-wrap');
      if(wrap&&!wrap.contains(e.target)){ panel.style.display='none'; document.removeEventListener('mousedown',_outsideClose); }
    }
    document.addEventListener('mousedown',_outsideClose);
  },10);
}
function _tagDropdownHtml(inputId, currentTags){
  return `<div id="${inputId}-dd-wrap" style="position:relative">
    <!-- Applied chips -->
    <div id="${inputId}-dd-chips" style="display:flex;flex-wrap:wrap;gap:5px;min-height:22px;margin-bottom:7px">${_tagDropdownAppliedHtml(inputId)}</div>
    <!-- Trigger -->
    <div onclick="_tagDropdownOpen('${inputId}')" style="display:flex;align-items:center;justify-content:space-between;border:1px solid var(--border);border-radius:7px;padding:8px 11px;background:var(--cream);cursor:pointer;font-size:13px;color:var(--muted);user-select:none">
      Add a tag…
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <!-- Dropdown panel -->
    <div id="${inputId}-dd-panel" style="display:none;position:absolute;left:0;right:0;z-index:200;margin-top:3px;border:1px solid var(--border);border-radius:8px;background:var(--cream);box-shadow:0 4px 18px rgba(0,0,0,.1);overflow:hidden">
      <div style="padding:7px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:7px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--muted);flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="${inputId}-dd-search" placeholder="Search tags…" autocomplete="off" oninput="_tagDropdownSearch('${inputId}',this.value)" style="border:none;outline:none;font-size:12.5px;font-family:inherit;color:var(--ink);background:transparent;width:100%;padding-right:20px"/><button type="button" onclick="const _ti=document.getElementById('${inputId}-dd-search');if(_ti){_ti.value=''};_tagDropdownSearch('${inputId}','')" title="Clear" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:0;flex-shrink:0;display:flex;align-items:center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div id="${inputId}-dd-list" style="max-height:200px;overflow-y:auto"></div>
    </div>
  </div>`;
}

function _tagPickerHtml(inputId){
  const names=_allTagNames();
  if(!names.length) return '';
  return `<div class="tag-picker" data-for="${inputId}" style="margin-top:7px">
    <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Tap an existing tag to add or remove it</div>
    <div id="${inputId}-chips" style="display:flex;flex-wrap:wrap;gap:7px">${_tagPickerChips(inputId, names)}</div>
  </div>`;
}
// Read the current tag names out of a comma-separated input.
function _tagPickerCurrent(inputId){
  const el=document.getElementById(inputId);
  return el ? el.value.split(',').map(t=>t.trim()).filter(Boolean) : [];
}
function _tagPickerChips(inputId, names){
  names = names || _allTagNames();
  const cur = _tagPickerCurrent(inputId).map(t=>t.toLowerCase());
  return names.map(name=>{
    const on = cur.includes(name.toLowerCase());
    return _tagChipHtml(name, {active:on, click:`_tagPickerToggle('${_escSQ(inputId)}','${_escSQ(name)}')`});
  }).join('');
}
// Toggle a tag in/out of the field, then re-render the chips to reflect state.
function _tagPickerToggle(inputId, name){
  const el=document.getElementById(inputId);
  if(!el) return;
  const cur=_tagPickerCurrent(inputId);
  const i=cur.findIndex(t=>t.toLowerCase()===name.toLowerCase());
  if(i>=0) cur.splice(i,1); else cur.push(name);
  el.value=cur.join(', ');
  const wrap=document.getElementById(inputId+'-chips');
  if(wrap) wrap.innerHTML=_tagPickerChips(inputId);
}
// Re-sync chips when the user types in the field directly (so manual edits to an
// existing tag name reflect the ticked state). Cheap; only fires on that input.
function _tagPickerSync(inputId){
  const wrap=document.getElementById(inputId+'-chips');
  if(wrap) wrap.innerHTML=_tagPickerChips(inputId);
}

function _renderManageTagsList(){
  const names=_allTagNames();
  const rows = names.length ? names.map(name=>{
    const cnt=_tagGuestCount(name);
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
      ${_tagChipHtml(name)}
      <span style="margin-left:auto;font-size:11px;color:var(--muted);white-space:nowrap">${cnt} guest${cnt===1?'':'s'}</span>
      <button class="btn-icon" title="Edit tag" onclick="_openTagEditor('${_escSQ(name)}')" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;display:inline-flex">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
      </button>
      <button class="btn-icon" title="Delete tag" onclick="_deleteTag('${_escSQ(name)}')" style="background:none;border:none;cursor:pointer;color:var(--red);padding:4px;display:inline-flex">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
      </button>
    </div>`;
  }).join('') : `<div style="font-size:13px;color:var(--muted);padding:18px 0;text-align:center">No tags yet. Create one to colour-code your guests.</div>`;

  const body=`<div style="min-width:min(300px,100%)">
    <div style="display:flex;justify-content:flex-end;margin-bottom:6px">
      <button class="btn btn-primary btn-sm" onclick="_openTagEditor(null)" style="display:inline-flex;align-items:center;gap:5px"><span aria-hidden="true">+</span> New tag</button>
    </div>
    ${rows}
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_closeConfirm2Direct()">Done</button>`;
  openConfirm2('Manage tags', body, footer);
}

function _openTagEditor(name){
  _tagEditKey=name;
  if(name){
    const def=(STATE.tagDefs||{})[name]||{};
    _tagDraft={name:name, color:def.color||_TAG_COLORS[0], icon:def.icon||''};
  } else {
    _tagDraft={name:'', color:_TAG_COLORS[0], icon:''};
  }
  _renderTagEditor();
}

function _renderTagEditor(){
  const d=_tagDraft;
  const swatches=_TAG_COLORS.map(c=>`<button type="button" onclick="_tagPickColor('${c}')" title="${c}" style="width:26px;height:26px;border-radius:50%;background:${c};border:none;cursor:pointer;outline:${d.color&&d.color.toLowerCase()===c.toLowerCase()?'2px solid var(--gold-deep);outline-offset:2px':'none'};padding:0"></button>`).join('');
  const icons=`<button type="button" onclick="_tagPickIcon('')" title="No icon" style="height:30px;padding:0 9px;border-radius:7px;border:1px solid ${!d.icon?'var(--gold-deep)':'var(--border)'};background:var(--surface);cursor:pointer;font-size:11px;color:var(--muted)">None</button>`
    + _TAG_ICON_KEYS.map(k=>`<button type="button" onclick="_tagPickIcon('${k}')" title="${k}" style="width:30px;height:30px;border-radius:7px;border:1px solid ${d.icon===k?'var(--gold-deep)':'var(--border)'};background:${d.icon===k?'var(--surface)':'var(--cream)'};cursor:pointer;color:${d.icon===k?'var(--gold-deep)':'var(--muted)'};display:inline-flex;align-items:center;justify-content:center;padding:0">${_tagIconSvg(k,14)}</button>`).join('');

  const body=`<div style="min-width:300px">
    <div class="form-group" style="margin-bottom:14px">
      <label class="form-label">Name <span style="color:var(--muted);font-weight:400">(optional)</span></label>
      <input class="form-input" id="tag-name-input" value="${_escAttr(d.name)}" placeholder="e.g. Bridal party" oninput="_tagDraft.name=this.value;_tagUpdatePreview()" maxlength="40"/>
    </div>
    <div class="form-group" style="margin-bottom:14px">
      <label class="form-label">Colour</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        ${swatches}
        <label title="Custom colour" style="width:26px;height:26px;border-radius:50%;border:1px dashed var(--border);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;position:relative;color:var(--muted);font-size:14px">+
          <input type="color" value="${/^#[0-9a-fA-F]{6}$/.test(d.color)?d.color:'#9A7B2E'}" onchange="_tagPickColor(this.value)" style="position:absolute;inset:0;opacity:0;cursor:pointer"/>
        </label>
      </div>
    </div>
    <div class="form-group" style="margin-bottom:14px">
      <label class="form-label">Icon <span style="color:var(--muted);font-weight:400">(optional)</span></label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${icons}</div>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:12px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:7px">Preview</div>
      <div id="tag-preview">${_tagPreviewChip()}</div>
    </div>
  </div>`;
  const footer=`<button class="btn btn-outline btn-sm" onclick="_renderManageTagsList()">Back</button>
    <button class="btn btn-primary" onclick="_saveTag()">${_tagEditKey?'Save changes':'Create tag'}</button>`;
  openConfirm2(_tagEditKey?'Edit tag':'New tag', body, footer);
}

function _tagPreviewChip(){
  const d=_tagDraft;
  const label=(d.name||'').trim()||'Tag preview';
  const icon=d.icon?`<span style="display:inline-flex">${_tagIconSvg(d.icon,11)}</span>`:'';
  const bg=_hexToRgba(d.color,0.16);
  return `<span class="tag" style="background:${bg};color:${d.color}">${icon}${_escHtml(label)}</span>`;
}
function _tagUpdatePreview(){ const el=document.getElementById('tag-preview'); if(el) el.innerHTML=_tagPreviewChip(); }
function _tagPickColor(c){ _tagDraft.color=c; _renderTagEditor(); }
function _tagPickIcon(k){ _tagDraft.icon=k; _renderTagEditor(); }

function _saveTag(){
  const d=_tagDraft;
  const name=(d.name||'').trim();
  if(!name){ alert('Please give the tag a name so it can be added to guests.'); return; }
  if(!STATE.tagDefs) STATE.tagDefs={};
  // Renaming an existing tag: migrate the name across all guests + the def map.
  if(_tagEditKey && _tagEditKey!==name){
    if(STATE.tagDefs[name]){ alert('A tag with that name already exists.'); return; }
    (STATE.guests||[]).forEach(g=>{ if(g.tags){ g.tags=g.tags.map(t=>t===_tagEditKey?name:t); } });
    delete STATE.tagDefs[_tagEditKey];
  }
  STATE.tagDefs[name]={color:d.color||_TAG_COLORS[0], icon:d.icon||''};
  saveToStorage();
  _tagEditKey=null;
  _renderManageTagsList();
  if(_currentPage==='guests') renderGuestList();
}

function _deleteTag(name){
  _undoableDelete('tag "'+name+'"', ()=>{
    if(STATE.tagDefs) delete STATE.tagDefs[name];
    (STATE.guests||[]).forEach(g=>{ if(g.tags) g.tags=g.tags.filter(t=>t!==name); });
    // Also drop it from any active filter selection.
    if(STATE.guestFilter && Array.isArray(STATE.guestFilter.tags)){
      STATE.guestFilter.tags=STATE.guestFilter.tags.filter(t=>t!==name);
    }
  }, null, ()=>{
    if(typeof _renderManageTagsList==='function') _renderManageTagsList();
    if(_currentPage==='guests' && typeof renderGuestList==='function') renderGuestList();
  });
  _renderManageTagsList();
  if(_currentPage==='guests') renderGuestList();
}

// Escape a value for safe use inside a single-quoted JS string argument (e.g. onclick="fn('${_escSQ(v)}')" ).
function _escSQ(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

function openModal(title,body,footer){
  // Any modal that isn't the just-armed confirm popup invalidates a pending revert.
  if(!_escapeRevertArm) _escapeRevert=null;
  const _rha=document.getElementById('budget-report-header-actions'); if(_rha) _rha.remove();
  document.getElementById('modal-title').textContent=title;
  const mb=document.getElementById('modal-box'); if(mb){ mb.classList.remove('modal-fit'); mb.classList.remove('seat-mgr-compact'); mb.classList.remove('modal-wide'); }
  const _mo=document.getElementById('modal-overlay'); if(_mo){ _mo.classList.remove('budget-summary-overlay'); _mo.classList.remove('print-hub-overlay'); _mo.classList.remove('seating-preview-overlay'); _mo.classList.remove('export-prev-guests','export-prev-timeline','export-prev-budget','export-prev-seating'); }
  document.getElementById('modal-body').innerHTML=body;
  document.getElementById('modal-footer').innerHTML=footer||'';
  const _mbx=document.getElementById('modal-box'); if(_mbx) _mbx.scrollTop=0;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal(e){ /* Outside-click close disabled — use the × or Cancel button to close. */ }
function closeModalDirect(){ if(_groupReviewOpen){ _groupReviewOpen=false; _resumeGroupBannerTimer(); } _escapeRevert=null; _checkSnapshot=null; _plusOneNewMode=false; _popupBack=null; _popupBackPending=null; _ciAddDialogOpen=false; if(_wbLiveFocus!==null){ _wbLiveFocusOff(); document.getElementById('modal-overlay')?.classList.remove('wb-edit-overlay'); _wbLivePaint(); } const mb=document.getElementById('modal-box'); if(mb){ mb.classList.remove('modal-fit'); mb.classList.remove('seat-mgr-compact'); mb.classList.remove('modal-wide'); } const _mo=document.getElementById('modal-overlay'); if(_mo){ _mo.classList.remove('budget-summary-overlay'); _mo.classList.remove('print-hub-overlay'); _mo.classList.remove('seating-preview-overlay'); _mo.classList.remove('export-prev-guests','export-prev-timeline','export-prev-budget','export-prev-seating'); } document.getElementById('modal-overlay').classList.add('hidden'); }

// ═══════════════════════════════════════════════════════════════════════════
