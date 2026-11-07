// SETUP WIZARD
// ══════════════════════════════════════════════

// ── Constants ───────────────────────────────────────────────────────
const WZ_TOTAL = 7;
const WZ_LBLS  = ['Couple','The Day','Style','Prefs','Party','Checklist','Done'];
let wzCur = 1;

// ── Palette swatches ────────────────────────────────────────────────
const WZ_PALETTES = [
  {name:'Champagne',  hex:'#B8963E'},
  {name:'Blush',      hex:'#C06A7A'},
  {name:'Sage',       hex:'#5C8A6A'},
  {name:'Dusty Blue', hex:'#6B88B0'},
  {name:'Burgundy',   hex:'#8B3A58'},
  {name:'Terracotta', hex:'#B05A3A'},
  {name:'Slate',      hex:'#5A7A8A'},
  {name:'Midnight',   hex:'#4A4E7A'},
];
const WZ_PALETTES2 = [
  {name:'Ivory',      hex:'#D4C9A8'},
  {name:'Soft Rose',  hex:'#C9908C'},
  {name:'Sage Light', hex:'#8CAE8C'},
  {name:'Sky Blue',   hex:'#8AAAC4'},
  {name:'Mauve',      hex:'#C090A8'},
  {name:'Peach',      hex:'#C4907C'},
  {name:'Stone',      hex:'#9AABAB'},
  {name:'Lavender',   hex:'#9A90B8'},
];
let wzSelPalIdx = -1, wzSelPalIdx2 = -1;
let wzPalSet = false, wzPalSet2 = false;   // the couple actually picked a colour

function wzBuildPalette(){
  const g = document.getElementById('pal-grid');
  if(!g) return;
  g.innerHTML = WZ_PALETTES.map((p,i)=>
    `<div class="pal-swatch" style="background:${p.hex}" title="${p.name}" data-idx="${i}" onclick="wzSelectPalette(${i})"></div>`
  ).join('');
  const g2 = document.getElementById('pal-grid2');
  if(!g2) return;
  g2.innerHTML = WZ_PALETTES2.map((p,i)=>
    `<div class="pal-swatch pal-swatch2" style="background:${p.hex}" title="${p.name}" data-idx="${i}" onclick="wzSelectPalette2(${i})"></div>`
  ).join('');
}

function wzSelectPalette(idx){
  wzSelPalIdx = idx; wzPalSet = true;
  document.querySelectorAll('#pal-grid .pal-swatch').forEach((s,i)=>s.classList.toggle('on',i===idx));
  wzApplyAccent(WZ_PALETTES[idx].hex);
  const cp = document.getElementById('pal-custom');
  if(cp) cp.value = WZ_PALETTES[idx].hex;
}
function wzSelectPalette2(idx){
  wzSelPalIdx2 = idx; wzPalSet2 = true;
  document.querySelectorAll('#pal-grid2 .pal-swatch2').forEach((s,i)=>s.classList.toggle('on',i===idx));
  wzApplyAccent2(WZ_PALETTES2[idx].hex);
  const cp = document.getElementById('pal-custom2');
  if(cp) cp.value = WZ_PALETTES2[idx].hex;
}
function wzSelectCustomPalette(hex){
  wzSelPalIdx = -1; wzPalSet = true;
  document.querySelectorAll('#pal-grid .pal-swatch').forEach(s=>s.classList.remove('on'));
  wzApplyAccent(hex);
}
function wzSelectCustomPalette2(hex){
  wzSelPalIdx2 = -1; wzPalSet2 = true;
  document.querySelectorAll('#pal-grid2 .pal-swatch2').forEach(s=>s.classList.remove('on'));
  wzApplyAccent2(hex);
}
function wzApplyAccent(hex){
  const wz = document.querySelector('.wz-wrap');
  if(wz) wz.style.setProperty('--accent', hex);
  const d = document.getElementById('pal-dot1');
  if(d) d.style.background = hex;
}
function wzApplyAccent2(hex){
  const wz = document.querySelector('.wz-wrap');
  if(wz) wz.style.setProperty('--accent2', hex);
  const d = document.getElementById('pal-dot2');
  if(d) d.style.background = hex;
}

// ── Referred to as: Custom free-text ─────────────────────────────────
function wzOnTitleChange(id){
  const sel = document.getElementById('i-'+id);
  const inp = document.getElementById('i-'+id+'-custom');
  if(!sel || !inp) return;
  const show = sel.value === 'custom';
  inp.style.display = show ? 'block' : 'none';
  if(show) inp.focus();
}

// ── Pronoun pills (single-select per column) ──────────────────────────
function wzPronounPill(el, col){
  document.querySelectorAll(`[data-pr="${col}"]`).forEach(p=>p.classList.remove('on'));
  el.classList.add('on');
}

// ── Checklist data ──────────────────────────────────────────────────
const WZ_CATS = [
  {cat:'Getting Started', tasks:['Pick your wedding date','Agree on a rough budget','Research & visit venues','Create a vision board','Choose your colour scheme']},
  {cat:'Venue',           tasks:['Book ceremony venue','Book reception venue','Venue site visit','Confirm AV & sound system','Venue layout walkthrough','Arrange wet-weather backup']},
  {cat:'Stationery',      tasks:['Send save the dates','Design and order invitations','Send formal invitations','Print ceremony programs','Design menus & place cards','Send RSVP reminders','Order thank you cards']},
  {cat:'Ceremony',        tasks:['Hire celebrant / officiant','Lodge notice of intended marriage','Write personal vows','Plan ceremony music','Plan processional order','Organise rehearsal']},
  {cat:'Attire',          tasks:['Order bridal gown','Dress alterations & fittings','Order groom\'s suit / attire','Bridesmaid dresses','Groomswear','Wedding shoes','Flower girl outfits','Page boy outfits','Purchase accessories']},
  {cat:'Beauty',          tasks:['Book hair & makeup artist','Hair & makeup trial','Book spray tan','Nail appointment','Prepare day-of emergency kit']},
  {cat:'Media',           tasks:['Book photographer','Book videographer','Plan photo shot list','Book photo booth','Book drone footage','Arrange engagement shoot']},
  {cat:'Catering',        tasks:['Book caterer','Schedule menu tasting','Book cake tasting','Finalise menu & dietary notes','Order wedding cake','Confirm bar package','Arrange grazing table']},
  {cat:'Decor & Florals', tasks:['Hire florist','Bridal & bridesmaid bouquets','Ceremony arch / backdrop','Reception centrepieces','Candles & ambient lighting','Confetti or petal toss','Signage & table stationery']},
  {cat:'Entertainment',   tasks:['Book DJ or band','Plan first dance song','Organise speeches order','Book photo booth props','Guest lawn games / activities','Book kids\' entertainer']},
  {cat:'Logistics',       tasks:['Finalise guest list','Arrange guest transport','Book wedding party transport','Block accommodation for guests','Hire on-the-day coordinator','Create seating plan','Finalise floorplan','Finalise run sheet / timeline','Finalise day-of timeline']},
  {cat:'Rings',           tasks:['Purchase wedding rings','Ring engraving','Ring box & presentation']},
  {cat:'Honeymoon',       tasks:['Book honeymoon flights','Book honeymoon accommodation','Purchase travel insurance','Plan honeymoon activities','Organise travel wallet & currency']},
  {cat:'Legal',           tasks:['Check destination marriage requirements','Collect marriage certificate','Name change — passport','Name change — driver\'s licence','Name change — bank accounts']},
  {cat:'Pre-Wedding',     tasks:['Plan hen\'s party','Plan buck\'s party','Plan rehearsal dinner','Plan engagement party','Plan day-after brunch']},
  {cat:'Website & Digital',tasks:['Set up wedding website','Configure RSVP form','Share wedding website with guests','Create gift registry link']},
  {cat:'Gifts',           tasks:['Set up physical gift registry','Configure wishing well','Write & send thank you notes','Assign gift tracking']},
];

const WZ_DEFAULT_ON = new Set([
  'Pick your wedding date','Research & visit venues',
  'Book ceremony venue',
  'Send save the dates','Design and order invitations','Send formal invitations',
  'Hire celebrant / officiant','Write personal vows',
  'Order bridal gown','Order groom\'s suit / attire',
  'Book hair & makeup artist',
  'Book photographer','Book videographer',
  'Book caterer','Finalise menu & dietary notes','Order wedding cake','Book cake tasting',
  'Hire florist','Bridal & bridesmaid bouquets','Reception centrepieces',
  'Book DJ or band','Plan first dance song',
  'Finalise guest list','Arrange guest transport','Create seating plan',
  'Purchase wedding rings',
  'Collect marriage certificate',
  'Set up wedding website',
]);

// Maps wizard task text → {id, cat, budgetId} for tasks that have STATE.checklist seed entries
const WZ_SEED_MAP = {
  'Pick your wedding date':         {id:'cl21', cat:'Planning',     budgetId:''},
  'Research & visit venues':        {id:'cl0',  cat:'Venue',        budgetId:''},
  'Book ceremony venue':            {id:'cl1',  cat:'Venue',        budgetId:'b-venue'},
  'Hire celebrant / officiant':     {id:'cl2',  cat:'Ceremony',     budgetId:'b-celebrant'},
  'Book photographer':              {id:'cl4',  cat:'Media',        budgetId:'b-photo'},
  'Book videographer':              {id:'cl5',  cat:'Media',        budgetId:''},
  'Book caterer':                   {id:'cl7',  cat:'Catering',     budgetId:'b-catering'},
  'Send save the dates':            {id:'cl8',  cat:'Stationery',   budgetId:''},
  'Order bridal gown':              {id:'cl3',  cat:'Attire',       budgetId:'b-gown'},
  'Hire florist':                   {id:'cl6',  cat:'Decor',        budgetId:'b-florals'},
  'Book hair & makeup artist':      {id:'cl9',  cat:'Beauty',       budgetId:'b-beauty'},
  'Block accommodation for guests': {id:'cl10', cat:'Logistics',    budgetId:''},
  'Book honeymoon flights':         {id:'cl11', cat:'Honeymoon',    budgetId:'b-honeymoon'},
  'Purchase wedding rings':         {id:'cl12', cat:'Rings',        budgetId:'b-rings'},
  'Send formal invitations':        {id:'cl13', cat:'Stationery',   budgetId:''},
  'Finalise menu & dietary notes':  {id:'cl14', cat:'Catering',     budgetId:''},
  'Book DJ or band':                {id:'cl15', cat:'Entertainment', budgetId:'b-music'},
  'Create seating plan':            {id:'cl16', cat:'Logistics',    budgetId:''},
  'Arrange guest transport':        {id:'cl17', cat:'Transport',    budgetId:'b-transport'},
  'Write personal vows':            {id:'cl18', cat:'Ceremony',     budgetId:''},
  'Plan rehearsal dinner':          {id:'cl19', cat:'Events',       budgetId:''},
  'Collect marriage certificate':   {id:'cl20', cat:'Legal',        budgetId:''},
};

// Maps wizard category name → app checklist category name
const WZ_CAT_MAP = {
  'Getting Started': 'Planning',
  'Venue':           'Venue',
  'Stationery':      'Stationery',
  'Ceremony':        'Ceremony',
  'Attire':          'Attire',
  'Beauty':          'Beauty',
  'Media':           'Media',
  'Catering':        'Catering',
  'Decor & Florals': 'Decor',
  'Entertainment':   'Entertainment',
  'Logistics':       'Logistics',
  'Rings':           'Rings',
  'Honeymoon':       'Honeymoon',
  'Legal':           'Legal',
  'Pre-Wedding':     'Events',
  'Website & Digital':'Digital',
  'Gifts':           'Gifts',
};

let wzTs = {};
function wzInitTS(){
  wzTs = {};
  WZ_CATS.forEach(({cat,tasks})=>tasks.forEach(t=>{ wzTs[cat+'||'+t] = WZ_DEFAULT_ON.has(t); }));
}
// Checklist tailoring: answers from earlier steps tick (or untick) the tasks they make
// relevant. A chip the couple has tapped themselves is never changed again.
const wzClManual = new Set();
function wzTailorChecklist(){
  const pill = grp => { const e=document.querySelector(`[data-grp="${grp}"].on`); return e ? e.textContent.trim() : ''; };
  const cer = pill('cer'), loc = pill('loc');
  const want = {};   // task text → true (tick) / false (untick)
  const on  = (...t)=>t.forEach(x=>want[x]=true);
  const off = (...t)=>t.forEach(x=>want[x]=false);
  if(loc==='Outdoor only' || loc==='Both') on('Arrange wet-weather backup');
  if(loc==='Destination') on('Block accommodation for guests','Arrange guest transport','Check destination marriage requirements');
  if(wzVenueMode==='different') on('Book reception venue','Book wedding party transport');
  if(cer==='Civil / Celebrant' || cer==='Religious') on('Lodge notice of intended marriage');
  if(cer==='Religious') on('Organise rehearsal');
  if(cer==='Symbolic') off('Lodge notice of intended marriage','Collect marriage certificate');
  if(cer==='Elopement') off('Send save the dates','Design and order invitations','Send formal invitations','Send RSVP reminders','Create seating plan','Book DJ or band','Reception centrepieces','Arrange guest transport','Print ceremony programs','Design menus & place cards');
  const has = k => !wzUnknowns[k] && wzStepVals[k] > 0;
  if(has('bm')) on('Bridesmaid dresses');
  if(has('gm')) on('Groomswear');
  if(has('fg')) on('Flower girl outfits');
  if(has('pb')) on('Page boy outfits');
  const PRE = {"Hen's party":"Plan hen's party","Buck's party":"Plan buck's party","Rehearsal dinner":"Plan rehearsal dinner","Engagement party":"Plan engagement party","Day-after brunch":"Plan day-after brunch"};
  document.querySelectorAll('#p5 .pill.on').forEach(p=>{ const t=PRE[p.textContent.trim()]; if(t) on(t); });
  WZ_CATS.forEach(({cat,tasks})=>tasks.forEach(t=>{
    const key = cat+'||'+t;
    if(t in want && !wzClManual.has(key)) wzTs[key] = want[t];
  }));
}
function wzSelCount(){ return Object.values(wzTs).filter(Boolean).length; }
function wzTotCount(){ return Object.keys(wzTs).length; }

// ── Checklist render ─────────────────────────────────────────────────
let wzClQ = '';
function wzRenderCL(){
  const q = wzClQ.toLowerCase().trim();
  let html = '';
  WZ_CATS.forEach(({cat,tasks})=>{
    const vis = tasks.filter(t=>!q||(cat+' '+t).toLowerCase().includes(q));
    if(!vis.length) return;
    html += `<div class="cl-cat"><div class="cl-cat-lbl">${cat}</div><div class="cl-items">`;
    vis.forEach(t=>{
      const key = cat+'||'+t;
      const on  = wzTs[key] ? ' on' : '';
      html += `<div class="cl-chip${on}" data-key="${key.replace(/'/g,'&#39;')}"><div class="cl-chk"></div><span>${t}</span></div>`;
    });
    html += `</div></div>`;
  });
  const scroll = document.getElementById('cl-scroll');
  if(scroll) scroll.innerHTML = html;
  wzUpdCLStats();
}
function wzUpdCLStats(){
  const n = wzSelCount(), tot = wzTotCount();
  const nEl  = document.getElementById('cl-n');
  const tEl  = document.getElementById('cl-tot');
  const snEl = document.getElementById('sum-cl-n');
  const aBtn = document.querySelector('.cl-all');
  if(nEl)  nEl.textContent  = n;
  if(tEl)  tEl.textContent  = tot;
  if(snEl) snEl.textContent = n;
  if(aBtn) aBtn.textContent = n < tot ? 'Select all' : 'Deselect all';
}
function wzFilterCL(v){ wzClQ = v; wzRenderCL(); }
function wzToggleAll(){
  const nv = wzSelCount() < wzTotCount();
  Object.keys(wzTs).forEach(k=>{ wzTs[k] = nv; wzClManual.add(k); });
  wzRenderCL();
}

// ── Step bar ─────────────────────────────────────────────────────────
function wzRenderBar(){
  const bar = document.getElementById('step-bar');
  if(!bar) return;
  const CHECK = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  let h = '';
  for(let i=1; i<=WZ_TOTAL; i++){
    const done = i < wzCur, active = i === wzCur;
    h += `<div class="step-node"><div class="step-dot-col">`;
    h += `<div class="step-dot${done?' done':active?' active':''}">${done?CHECK:`<span>${i}</span>`}</div>`;
    h += `<div class="step-lbl${active?' active':''}">${WZ_LBLS[i-1]}</div>`;
    h += `</div>`;
    if(i < WZ_TOTAL) h += `<div class="step-line${i<wzCur?' done':''}"></div>`;
    h += `</div>`;
  }
  bar.innerHTML = h;
}

// ── Navigation ────────────────────────────────────────────────────────
function wzNav(dir){
  if(wzCur === WZ_TOTAL && dir === 1){ wizardFinish(); return; }
  const next = wzCur + dir;
  if(next < 1 || next > WZ_TOTAL) return;
  if(dir === 1 && wzCur === 1){
    // Validate partner names on step 1
    const p1 = (document.getElementById('i-p1')||{}).value||'';
    const p2 = (document.getElementById('i-p2')||{}).value||'';
    const p1El = document.getElementById('i-p1');
    const p2El = document.getElementById('i-p2');
    if(p1El) p1El.style.borderColor = p1.trim() ? '' : 'var(--red)';
    if(p2El) p2El.style.borderColor = p2.trim() ? '' : 'var(--red)';
    if(!p1.trim() || !p2.trim()) return;
  }
  const outPanel = document.getElementById('p'+wzCur);
  if(outPanel) outPanel.classList.remove('visible');
  wzCur = next;
  const inPanel = document.getElementById('p'+wzCur);
  if(inPanel){
    inPanel.style.animation = 'none';
    void inPanel.offsetWidth;
    inPanel.style.animation = dir < 0
      ? 'wzSlideBack .22s cubic-bezier(.22,.61,.36,1)'
      : 'wzSlideIn .22s cubic-bezier(.22,.61,.36,1)';
    inPanel.classList.add('visible');
  }
  if(wzCur === 6){ wzTailorChecklist(); wzRenderCL(); }
  wzRenderBar();
  wzUpdateUI();
}

// ── UI update ────────────────────────────────────────────────────────
function wzUpdateUI(){
  const nxt  = document.getElementById('btn-next');
  const back = document.getElementById('btn-back');
  const txt  = document.getElementById('step-txt');
  if(back) back.style.visibility = wzCur > 1 ? 'visible' : 'hidden';
  if(txt)  txt.innerHTML = `<span class="wz-st-word">Step </span>${wzCur} of ${WZ_TOTAL}`;

  // Dynamic heading
  if(wzCur === 2){
    const n1 = ((document.getElementById('i-p1')||{}).value||'').trim();
    const n2 = ((document.getElementById('i-p2')||{}).value||'').trim();
    const titleEl = document.getElementById('wz-title');
    const subEl   = document.getElementById('wz-sub');
    if(n1 && n2){
      if(titleEl) titleEl.innerHTML = `Congratulations <em>${wzEscH(n1)} &amp; ${wzEscH(n2)}!</em>`;
      if(subEl)   subEl.textContent = "Let's plan your perfect day. If you haven't locked in a date or venue yet, that's completely fine — you can fill those in any time.";
    } else {
      if(titleEl) titleEl.innerHTML = "Plan <em>the day.</em>";
      if(subEl)   subEl.textContent = "Date, venue, and ceremony details. Not locked in yet? No problem — add these later.";
    }
  } else {
    const TITLES = [
      ['Meet <em>the couple.</em>','Start with the most important detail — you two.'],
      null,
      ['Size <em>&amp; style.</em>','How many guests, and what\'s the vibe?'],
      ['Your <em>preferences.</em>','Budget, currency, and which features you want turned on.'],
      ['The <em>wedding party.</em>','Who\'s standing beside you on the day?'],
      ['Build <em>your checklist.</em>','Pick every task that applies to your wedding.'],
      null,
    ];
    const m = TITLES[wzCur-1];
    if(m){
      const t = document.getElementById('wz-title');
      const s = document.getElementById('wz-sub');
      if(t) t.innerHTML   = m[0];
      if(s) s.textContent = m[1];
    }
  }

  // Update summary page (step 7)
  if(wzCur === 7){
    const n1 = ((document.getElementById('i-p1')||{}).value||'Partner 1').trim();
    const n2 = ((document.getElementById('i-p2')||{}).value||'Partner 2').trim();
    const t1sel = document.getElementById('i-t1');
    const t2sel = document.getElementById('i-t2');
    const t1 = t1sel&&t1sel.value==='custom' ? ((document.getElementById('i-t1-custom')||{}).value||'Partner').trim() : (t1sel?t1sel.value:'Partner');
    const t2 = t2sel&&t2sel.value==='custom' ? ((document.getElementById('i-t2-custom')||{}).value||'Partner').trim() : (t2sel?t2sel.value:'Partner');

    // Header title
    const sumTitleEl = document.getElementById('wz-title');
    if(sumTitleEl) sumTitleEl.innerHTML = `All <em>set!</em>`;
    const sumSubEl = document.getElementById('wz-sub');
    if(sumSubEl) sumSubEl.textContent = "Here's your wedding at a glance — everything is editable from Event Details and Settings.";

    // Couple summary
    const stEl = document.getElementById('sum-title');
    const scEl = document.getElementById('sum-couple');
    const srEl = document.getElementById('sum-roles');
    if(stEl) stEl.textContent = `${n1} & ${n2}, let the planning begin!`;
    if(scEl) scEl.textContent = `${n1} & ${n2}`;
    if(srEl) srEl.textContent = `${t1} & ${t2}`;

    // Date + countdown
    const dateRaw = (document.getElementById('i-date')||{}).value||'';
    const sdEl = document.getElementById('sum-date');
    const scnEl = document.getElementById('sum-countdown');
    if(dateRaw){
      const d = new Date(dateRaw+'T12:00:00');
      if(sdEl) sdEl.textContent = d.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
      const today = new Date(); today.setHours(0,0,0,0);
      const diff  = Math.round((d-today)/864e5);
      if(scnEl) scnEl.textContent = diff>0 ? `${diff.toLocaleString()} days to go` : diff===0 ? 'Today!' : '';
    } else {
      if(sdEl) sdEl.textContent = 'Not set';
      if(scnEl) scnEl.textContent = '';
    }

    // Venue(s) + spaces
    const venueVal = ((document.getElementById('i-venue')||{}).value||'').trim();
    const cerVenueVal = ((document.getElementById('i-cer-venue')||{}).value||'').trim();
    const svEl = document.getElementById('sum-venue');
    const ssEl = document.getElementById('sum-setting-disp');
    const vLine = wzVenueMode==='different' ? [cerVenueVal, venueVal].filter(Boolean).join(' & ') : venueVal;
    if(svEl) svEl.textContent = vLine || 'Not set';
    const spNames = wzSpaces.map(x=>String(x.name||'').trim()).filter(Boolean);
    const settingPill = document.querySelector('[data-grp="loc"].on');
    const timeVal = (document.getElementById('i-time')||{}).value||'';
    const timeTxt = timeVal && typeof tlTo12h==='function' ? tlTo12h(timeVal) : timeVal;
    if(ssEl) ssEl.textContent = spNames.length ? spNames.join(' · ') : ([settingPill?settingPill.textContent:'', timeTxt].filter(Boolean).join(' · ') || '—');
    const sdv = document.getElementById('sum-dest-venue');
    if(sdv) sdv.textContent = spNames.length ? '\u2192 Event Details \u2192 Venues \u00b7 Timeline locations' : '\u2192 Event Details \u2192 Venues';
    if(scnEl && timeTxt) scnEl.textContent = [scnEl.textContent, 'Ceremony '+timeTxt].filter(Boolean).join(' \u00b7 ');

    // Ceremony: type · setting imagined, then religion / officiant / venue name
    const cerPill = document.querySelector('[data-grp="cer"].on');
    const csetPill = document.querySelector('[data-grp="cset"].on');
    const scerEl  = document.getElementById('sum-ceremony');
    const sfmEl   = document.getElementById('sum-formality-disp');
    if(scerEl) scerEl.textContent = [cerPill?cerPill.textContent.trim():'', csetPill?csetPill.textContent.trim():''].filter(Boolean).join(' \u00b7 ') || '—';
    const relV = cerPill && cerPill.textContent.trim()==='Religious' ? ((document.getElementById('i-religion')||{}).value||'') : '';
    const offV = cerPill && cerPill.textContent.trim()==='Religious' ? ((document.getElementById('i-officiant')||{}).value||'')
               : (cerPill && cerPill.textContent.trim()==='Civil / Celebrant' ? 'Celebrant' : '');
    if(sfmEl) sfmEl.textContent = [relV, offV, wzVenueMode==='different'?cerVenueVal:''].filter(Boolean).join(' \u00b7 ') || '—';

    // Budget + guests
    const budgetAmt = parseFloat((document.getElementById('i-budget-wz')||{}).value)||0;
    const currencyEl = document.getElementById('i-currency');
    const currency   = currencyEl ? currencyEl.value : 'AUD';
    const sbEl = document.getElementById('sum-budget');
    if(sbEl) sbEl.textContent = budgetAmt > 0 ? '$'+budgetAmt.toLocaleString()+' '+currency : '—';
    const gcSlider = document.getElementById('i-guest-count');
    const sgEl = document.getElementById('sum-guests');
    if(sgEl) sgEl.textContent = gcSlider ? `~${gcSlider.value} guests` : '';

    // Wedding party
    const bv = wzUnknowns.bm ? '?' : wzStepVals.bm;
    const gv = wzUnknowns.gm ? '?' : wzStepVals.gm;
    const fv = wzUnknowns.fg ? '?' : wzStepVals.fg;
    const pv = wzUnknowns.pb ? '?' : wzStepVals.pb;
    const spEl  = document.getElementById('sum-party');
    const spbEl = document.getElementById('sum-party-sub');
    if(spEl) spEl.textContent = `${bv} + ${gv}`;
    const namedN = ['bm','gm','fg','pb'].reduce((n,k)=>n+wzNames[k].filter(x=>x&&x.trim()).length,0);
    const sdp = document.getElementById('sum-dest-party');
    if(sdp) sdp.textContent = namedN ? `\u2192 Guests (${namedN} named, tagged Bridal Party) \u00b7 Checklist` : '\u2192 Checklist attire tasks';
    if(spbEl){
      let partySub = 'Bridesmaids & Groomsmen';
      if((fv!==0&&fv!=='0')||(pv!==0&&pv!=='0'))
        partySub += ` · ${fv} flower girl${fv!==1?'s':''}, ${pv} page boy${pv!==1?'s':''}`;
      spbEl.textContent = partySub;
    }

    // Vibe tags
    const vibes = [...document.querySelectorAll('#p3 .pill.on:not([data-grp])')].map(p=>p.textContent.trim()).filter(Boolean);
    const fmOn = document.querySelector('[data-grp="fm"].on');
    if(fmOn) vibes.push(fmOn.textContent.trim());
    const tagsEl = document.getElementById('sum-tags');
    if(tagsEl){
      if(vibes.length){
        tagsEl.innerHTML = '<span style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);align-self:center">Style&nbsp;</span>'+
          vibes.map(v=>`<span class="sum-tag">${wzEscH(v)}</span>`).join('')+
          '<span class="sum-dest" style="margin:0 0 0 4px;align-self:center">\u2192 Inspiration \u00b7 Event Details \u00b7 Website dress code</span>';
        tagsEl.style.display = 'flex';
      } else {
        tagsEl.style.display = 'none';
      }
    }

    // Palette
    const wz   = document.querySelector('.wz-wrap');
    const c1   = (wz&&wz.style.getPropertyValue('--accent')) || WZ_PALETTES[0].hex;
    const c2   = (wz&&wz.style.getPropertyValue('--accent2')) || WZ_PALETTES2[0].hex;
    const pn1  = wzSelPalIdx>=0 ? WZ_PALETTES[wzSelPalIdx].name : 'Custom';
    const pn2  = wzSelPalIdx2>=0 ? WZ_PALETTES2[wzSelPalIdx2].name : 'Custom';
    const palEl = document.getElementById('sum-pal');
    if(palEl)
      palEl.innerHTML = `<div class="sum-pal-dots"><div class="sum-pal-dot" style="background:${c1}"></div><div class="sum-pal-dot" style="background:${c2}"></div></div>`+
        `<div class="sum-pal-info"><strong>Wedding palette</strong><small>${wzEscH(pn1)} &amp; ${wzEscH(pn2)}</small><div class="sum-dest">\u2192 Inspiration palette \u00b7 email colour</div></div>`;

    wzUpdCLStats();
  }

  if(nxt){
    if(wzCur === WZ_TOTAL){
      nxt.innerHTML = 'Start planning <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
      nxt.classList.add('finish');
    } else {
      nxt.innerHTML = 'Continue <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
      nxt.classList.remove('finish');
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────
function wzEscH(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function wzTogglePill(el){ el.classList.toggle('on'); }
function wzSinglePill(el){
  const grp = el.dataset.grp;
  document.querySelectorAll(`[data-grp="${grp}"]`).forEach(p=>p.classList.remove('on'));
  el.classList.add('on');
}
// ── The Day: ceremony type → religion / officiant ─────────────────────
function wzCerTypeChanged(){
  const on = document.querySelector('[data-grp="cer"].on');
  const t  = on ? on.textContent.trim() : '';
  const g  = document.getElementById('wz-rel-group');
  if(g) g.style.display = t === 'Religious' ? '' : 'none';
}
function wzFillSelect(id, options){
  const sel = document.getElementById(id);
  if(!sel || sel.options.length > 1) return;
  options.forEach(o=>sel.add(new Option(o, o)));
}

// ── The Day: venues + rooms & spaces ───────────────────────────────────
let wzVenueMode = 'same';
let wzSpaces = [];       // same shape as STATE.event.spaces
let wzSpOpen = false;
function wzSetVenueMode(mode){
  wzVenueMode = mode === 'different' ? 'different' : 'same';
  const diff = wzVenueMode === 'different';
  const cg = document.getElementById('cer-venue-group');
  const rg = document.getElementById('rec-venue-group');
  const lb = document.getElementById('i-venue-lbl');
  if(cg) cg.style.display = diff ? '' : 'none';
  if(rg) rg.style.gridColumn = diff ? '' : '1/-1';
  if(lb) lb.textContent = diff ? 'Reception venue' : 'Venue';
  wzRenderSpaces();
}
function wzVenueOf(part){
  const rec = ((document.getElementById('i-venue')||{}).value||'').trim();
  const cer = ((document.getElementById('i-cer-venue')||{}).value||'').trim();
  if(part === 'ceremony' && wzVenueMode === 'different') return cer || 'Ceremony venue';
  return rec || (wzVenueMode === 'different' ? 'Reception venue' : 'Your venue');
}
function wzRenderSpaces(){
  const host = document.getElementById('wz-spaces');
  if(!host || typeof _evSpacesBlockHtml !== 'function') return;
  host.innerHTML = _evSpacesBlockHtml({spaces:wzSpaces, open:wzSpOpen, venueOf:wzVenueOf, inputCls:'inp', ns:'wzSp'});
}
function wzSpToggle(){ wzSpOpen = !wzSpOpen; wzRenderSpaces(); }
function wzSpSet(key, value){ _evSpacesSet(wzSpaces, key, value); }
function wzSpRename(){ /* nothing to follow yet during setup */ }
function wzSpAdd(){ wzSpaces.push({id:uid(), part:'other', name:''}); wzSpOpen = true; wzRenderSpaces(); }
function wzSpDel(id){ wzSpaces = wzSpaces.filter(s=>s.id !== id); wzRenderSpaces(); }

// ── Style: ceremony setting you imagine (single, tap again to clear) ────
function wzBuildCerSetting(){
  const g = document.getElementById('wz-cer-setting');
  if(!g || typeof CEREMONY_VENUE_OPTIONS === 'undefined') return;
  g.innerHTML = CEREMONY_VENUE_OPTIONS.map(o=>`<div class="pill" data-grp="cset" onclick="wzCerSettingPill(this)">${wzEscH(o)}</div>`).join('');
}
function wzCerSettingPill(el){
  const was = el.classList.contains('on');
  document.querySelectorAll('[data-grp="cset"]').forEach(p=>p.classList.remove('on'));
  if(!was) el.classList.add('on');
}

// ── Wedding party names ─────────────────────────────────────────────────
const wzNames  = {bm:[], gm:[], fg:[], pb:[]};
const wzNmOpen = {bm:false, gm:false, fg:false, pb:false};
function wzToggleNames(k){
  wzNmOpen[k] = !wzNmOpen[k];
  wzRenderNames(k);
}
function wzRenderNames(k){
  const box = document.getElementById('nm-'+k);
  const tog = document.getElementById('nmt-'+k);
  const row = document.getElementById('sr-'+k);
  if(!box) return;
  const open = wzNmOpen[k];
  box.classList.toggle('open', open);
  if(row) row.classList.toggle('nm-open', open);
  if(tog) tog.textContent = open ? '\u2212 Hide names' : (wzNames[k].some(n=>n&&n.trim()) ? 'Edit names' : '+ Add names');
  if(!open){ box.innerHTML=''; return; }
  const n = Math.max(wzUnknowns[k] ? 1 : wzStepVals[k], wzNames[k].filter(x=>x&&x.trim()).length, 1);
  let h = '';
  for(let i=0;i<n;i++) h += `<input class="inp" maxlength="80" placeholder="Name (optional)" value="${wzEscH(wzNames[k][i]||'').replace(/"/g,'&quot;')}" oninput="wzNames['${k}'][${i}]=this.value">`;
  box.innerHTML = h;
}
function wzTogglePronouns(){
  const panel = document.getElementById('pr-panel');
  const chev  = document.getElementById('pr-chev');
  if(!panel) return;
  const open = panel.classList.toggle('open');
  if(chev) chev.classList.toggle('open', open);
}

// ── Steppers ─────────────────────────────────────────────────────────
const wzStepVals = {bm:4, gm:4, fg:1, pb:0};
const wzUnknowns = {bm:false, gm:false, fg:false, pb:false};
function wzAdj(k, d){
  if(wzUnknowns[k]) return;
  wzStepVals[k] = Math.max(0, wzStepVals[k]+d);
  const sv = document.getElementById('sv-'+k);
  if(sv) sv.textContent = wzStepVals[k];
  if(wzNmOpen[k]) wzRenderNames(k);
}
function wzToggleUnk(k){
  wzUnknowns[k] = !wzUnknowns[k];
  const sv = document.getElementById('sv-'+k);
  const ub = document.getElementById('unk-'+k);
  if(sv) sv.textContent = wzUnknowns[k] ? '?' : wzStepVals[k];
  if(ub) ub.classList.toggle('on', wzUnknowns[k]);
  document.querySelectorAll(`#sr-${k} .step-btn`).forEach(b=>{
    b.style.opacity       = wzUnknowns[k] ? '0.3' : '1';
    b.style.pointerEvents = wzUnknowns[k] ? 'none' : '';
  });
  if(wzNmOpen[k]) wzRenderNames(k);
}

// ── Checklist chip click (delegated) ─────────────────────────────────
document.addEventListener('click', function(e){
  const chip = e.target.closest('.cl-chip');
  if(!chip) return;
  const key = chip.dataset.key;
  if(key && key in wzTs){ wzTs[key] = !wzTs[key]; wzClManual.add(key); wzRenderCL(); }
});

// ── Finish ────────────────────────────────────────────────────────────
function wizardFinish(){
  const p1 = ((document.getElementById('i-p1')||{}).value||'').trim();
  const p2 = ((document.getElementById('i-p2')||{}).value||'').trim();
  if(!p1 || !p2){ wzCur=1; wzRenderBar(); wzUpdateUI(); return; }

  // Titles
  const t1sel = document.getElementById('i-t1');
  const t2sel = document.getElementById('i-t2');
  const t1 = t1sel&&t1sel.value==='custom' ? ((document.getElementById('i-t1-custom')||{}).value||'Partner').trim() : (t1sel?t1sel.value:'Partner');
  const t2 = t2sel&&t2sel.value==='custom' ? ((document.getElementById('i-t2-custom')||{}).value||'Partner').trim() : (t2sel?t2sel.value:'Partner');

  // Pronouns (custom overrides pill)
  const pr1Custom = ((document.getElementById('i-pr1-custom')||{}).value||'').trim();
  const pr2Custom = ((document.getElementById('i-pr2-custom')||{}).value||'').trim();
  const pr1Pill   = document.querySelector('[data-pr="p1"].on');
  const pr2Pill   = document.querySelector('[data-pr="p2"].on');
  const pr1 = pr1Custom || (pr1Pill ? pr1Pill.textContent.trim() : '');
  const pr2 = pr2Custom || (pr2Pill ? pr2Pill.textContent.trim() : '');

  // Step 2 — the day, ceremony, venues
  const dateVal     = (document.getElementById('i-date')||{}).value||'';
  const timeVal     = (document.getElementById('i-time')||{}).value||'';
  const venue       = ((document.getElementById('i-venue')||{}).value||'').trim();
  const cerVenue    = wzVenueMode==='different' ? ((document.getElementById('i-cer-venue')||{}).value||'').trim() : '';
  const cerPill     = document.querySelector('[data-grp="cer"].on');
  const locPill     = document.querySelector('[data-grp="loc"].on');
  const ceremonyType = cerPill ? cerPill.textContent.trim() : '';
  const setting      = locPill ? locPill.textContent.trim() : '';
  const religion  = ceremonyType==='Religious' ? ((document.getElementById('i-religion')||{}).value||'') : '';
  const officiant = ceremonyType==='Religious' ? ((document.getElementById('i-officiant')||{}).value||'')
                  : (ceremonyType==='Civil / Celebrant' ? 'Celebrant' : '');
  const spaces = wzSpaces.map(x=>({id:x.id||uid(), part:x.part, name:String(x.name||'').trim()})).filter(x=>x.name);

  // Step 3
  const gcSlider  = document.getElementById('i-guest-count');
  const guestCount = gcSlider ? parseInt(gcSlider.value)||0 : 0;
  const fmPill    = document.querySelector('[data-grp="fm"].on');
  const formality = fmPill ? fmPill.textContent.trim() : '';
  const csetPill  = document.querySelector('[data-grp="cset"].on');
  const ceremonySetting = csetPill ? csetPill.textContent.trim() : '';
  const vibe      = [...document.querySelectorAll('#p3 .pill.on:not([data-grp])')].map(p=>p.textContent.trim()).filter(Boolean);

  // Palette (only what the couple actually picked)
  const wz = document.querySelector('.wz-wrap');
  const accentColor  = wzPalSet  ? ((wz&&wz.style.getPropertyValue('--accent'))  || '').trim() : '';
  const accentColor2 = wzPalSet2 ? ((wz&&wz.style.getPropertyValue('--accent2')) || '').trim() : '';

  // Step 4
  const budgetAmt  = parseFloat((document.getElementById('i-budget-wz')||{}).value)||0;
  const currencyEl = document.getElementById('i-currency');
  const currency   = currencyEl ? currencyEl.value : 'AUD';
  const unpluggedEl = document.getElementById('tog-unplugged');
  const unplugged   = !!(unpluggedEl && unpluggedEl.classList.contains('on'));

  // Step 5
  const bmVal = wzUnknowns.bm ? null : wzStepVals.bm;
  const gmVal = wzUnknowns.gm ? null : wzStepVals.gm;
  const fgVal = wzUnknowns.fg ? null : wzStepVals.fg;
  const pbVal = wzUnknowns.pb ? null : wzStepVals.pb;

  // ── Write to STATE ─────────────────────────────────────────────────
  STATE.event.partner1     = p1;
  STATE.event.partner2     = p2;
  STATE.event.title1       = t1;
  STATE.event.title2       = t2;
  STATE.event.pronouns1    = pr1;
  STATE.event.pronouns2    = pr2;
  STATE.event.date         = dateVal;
  STATE.event.time         = timeVal;
  STATE.event.venue        = venue;
  STATE.event.venueMode    = wzVenueMode;
  STATE.event.ceremonyVenue = cerVenue;
  STATE.event.spaces       = spaces;
  STATE.event.ceremonyType = ceremonyType;
  if(religion)  STATE.event.religion  = religion;
  if(officiant) STATE.event.officiant = officiant;
  STATE.event.ceremonySetting = ceremonySetting;
  STATE.event.setting      = setting;
  STATE.event.formality    = formality;
  STATE.event.vibe         = vibe;
  STATE.event.guestCount   = guestCount;
  STATE.event.partyBridesmaids = bmVal;
  STATE.event.partyGroomsmen   = gmVal;
  STATE.event.partyFlowerGirls = fgVal;
  STATE.event.partyPageBoys    = pbVal;
  delete STATE.event.timeOfDay;

  STATE.settings.partner1Title = t1;
  STATE.settings.partner2Title = t2;
  STATE.settings.currency      = currency;

  // Palette → the Inspiration palette (what the dashboard tint and vision board use)
  // and the default accent for emails, unless the couple already chose one there.
  if(accentColor || accentColor2){
    if(!STATE.inspo || typeof STATE.inspo!=='object') STATE.inspo = {colors:[], items:[]};
    if(!Array.isArray(STATE.inspo.colors)) STATE.inspo.colors = [];
    if(!Array.isArray(STATE.inspo.customColors)) STATE.inspo.customColors = [];
    const known = (typeof WEDDING_COLORS!=='undefined') ? WEDDING_COLORS.map(c=>String(c.hex).toLowerCase()) : [];
    [[accentColor, wzSelPalIdx>=0?WZ_PALETTES[wzSelPalIdx].name:'Wedding colour'],
     [accentColor2, wzSelPalIdx2>=0?WZ_PALETTES2[wzSelPalIdx2].name:'Wedding accent']].forEach(([hex,name])=>{
      if(!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
      // Use the swatch's own spelling when it's one of the Inspiration colours (selection matches exactly).
      const sw = (typeof WEDDING_COLORS!=='undefined') ? WEDDING_COLORS.find(c=>String(c.hex).toLowerCase()===hex.toLowerCase()) : null;
      hex = sw ? sw.hex : hex.toUpperCase();
      if(!STATE.inspo.colors.some(c=>String(c).toUpperCase()===hex)) STATE.inspo.colors.push(hex);
      // A colour that isn't one of the Inspiration swatches is listed as a custom colour so it shows (selected).
      if(!known.includes(hex.toLowerCase()) && !STATE.inspo.customColors.some(c=>String(c.hex).toUpperCase()===hex))
        STATE.inspo.customColors.push({hex, name});
    });
    STATE.settings.accentColor  = accentColor;
    STATE.settings.accentColor2 = accentColor2;
    if(/^#[0-9a-fA-F]{6}$/.test(accentColor)){
      if(!STATE.settings.emailDesign) STATE.settings.emailDesign = {templateId:'classic', accentColor:'#8a6a2c', fontFamily:'serif', showLogo:true, headerImage:''};
      const cur = String(STATE.settings.emailDesign.accentColor||'').toLowerCase();
      if(!cur || cur==='#8a6a2c') STATE.settings.emailDesign.accentColor = accentColor;
    }
  }

  STATE.budget.total = budgetAmt;

  // ── Build checklist from wizard selections ─────────────────────────
  const newChecklist = [];
  const usedIds      = new Set();
  WZ_CATS.forEach(({cat,tasks})=>{
    tasks.forEach(task=>{
      const key = cat+'||'+task;
      if(!wzTs[key]) return;
      const seed = WZ_SEED_MAP[task];
      if(seed && !usedIds.has(seed.id)){
        newChecklist.push({id:seed.id, text:task, done:false, dueDate:'', category:seed.cat, notes:'', pinned:false, budgetId:seed.budgetId});
        usedIds.add(seed.id);
      } else if(!seed || usedIds.has(seed.id)){
        const catMapped = WZ_CAT_MAP[cat] || cat;
        newChecklist.push({id:uid(), text:task, done:false, dueDate:'', category:catMapped, notes:'', pinned:false, budgetId:''});
      }
    });
  });
  if(unplugged){
    newChecklist.push({id:uid(), text:'Set up unplugged ceremony sign', done:false, dueDate:'', category:'Ceremony', notes:'', pinned:false, budgetId:''});
  }
  STATE.checklist = newChecklist;

  // ── Pre-wedding events → Events page ───────────────────────────────
  // Created for every tier (free accounts can't open Events yet, but the
  // events are waiting there if they upgrade). Skips names that already exist
  // so re-running the wizard never duplicates.
  const WZ_PRE_EVENTS = {
    "Hen's party":      {name:"Hen's Party",      type:"Hen's Party"},
    "Buck's party":     {name:"Buck's Party",     type:"Buck's Party"},
    "Rehearsal dinner": {name:"Rehearsal Dinner", type:"Rehearsal Dinner"},
    "Engagement party": {name:"Engagement Party", type:"Engagement Party"},
    "Day-after brunch": {name:"Day-after Brunch", type:"Recovery Brunch"}
  };
  if(!Array.isArray(STATE.events)) STATE.events = [];
  [...document.querySelectorAll('#p5 .pill.on')].forEach(p=>{
    const def = WZ_PRE_EVENTS[p.textContent.trim()];
    if(!def) return;
    const exists = STATE.events.some(e=>(e.name||'').trim().toLowerCase()===def.name.toLowerCase());
    if(exists) return;
    STATE.events.push({id:uid(), rsvps:{}, name:def.name, type:def.type, date:'', time:'', venueName:'', venueAddress:'', venueMapUrl:'', notes:''});
  });

  // ── Guest entries for the couple ───────────────────────────────────
  if(!STATE.guests.length){
    const id1 = uid(), id2 = uid(), goh = "Guest's of Honour";
    STATE.guests.push(
      {id:id1, name:p1, rsvp:'attending', dietary:[], tags:[goh], phone:'', email:'', address:'', coupleId:id2, plusOneId:null, plusOne:false, relationship:t1, isMain:true, listType:'A', ageBand:'adult'},
      {id:id2, name:p2, rsvp:'attending', dietary:[], tags:[goh], phone:'', email:'', address:'', coupleId:id1, plusOneId:null, plusOne:false, relationship:t2, isMain:false, listType:'A', ageBand:'adult'}
    );
    if(!STATE.tagDefs) STATE.tagDefs = {};
    if(!STATE.tagDefs[goh]) STATE.tagDefs[goh] = {color:'#B8963E', icon:'sparkle'};
  }

  // ── Wedding party names → Guests, tagged Bridal Party ─────────────
  const PARTY_ROLES = {bm:['Bridesmaid','adult'], gm:['Groomsman','adult'], fg:['Flower girl','child'], pb:['Page boy','child']};
  const bp = 'Bridal Party';
  let addedParty = 0;
  Object.keys(PARTY_ROLES).forEach(k=>{
    const [role, band] = PARTY_ROLES[k];
    wzNames[k].map(n=>String(n||'').trim().slice(0,80)).filter(Boolean).forEach(name=>{
      if(STATE.guests.some(g=>String(g.name||'').trim().toLowerCase()===name.toLowerCase())) return;
      STATE.guests.push({id:uid(), name, prefix:'', rsvp:'awaiting', dietary:[], tags:[bp], phone:'', email:'', address:'',
        coupleId:null, plusOneId:null, plusOne:false, relationship:role, isMain:true, listType:'A', ageBand:band});
      addedParty++;
    });
  });
  if(addedParty){
    if(!STATE.tagDefs) STATE.tagDefs = {};
    if(!STATE.tagDefs[bp]) STATE.tagDefs[bp] = {color:'#5C8A4E', icon:'star'};
  }

  // ── Starter Timeline → the couple's own places and ceremony time ──
  wzFitStarterTimeline();

  // ── Finalise ───────────────────────────────────────────────────────
  if(typeof applySuggestedChecklistDueDates === 'function') applySuggestedChecklistDueDates();
  saveToStorage();
  document.getElementById('setup-modal-overlay').classList.add('hidden');
  if(typeof updateTopbarSub !== 'undefined') updateTopbarSub();
  if(typeof navigate !== 'undefined') navigate('dashboard');
}

// The starter Timeline (Guests Arrive … Last Dance) comes with placeholder locations
// ("Ceremony lawn", "Ballroom") and a 3pm ceremony. Swap in the couple's own spaces —
// or the venue, when no space is named — and move the whole day so "Ceremony Begins"
// sits at their ceremony time. Only moments still exactly as shipped are touched.
const WZ_TL_STARTER = {
  tl1:{time:'14:30', loc:'Ceremony lawn',  part:'ceremony'},
  tl2:{time:'15:00', loc:'Ceremony lawn',  part:'ceremony'},
  tl3:{time:'15:30', loc:'Garden terrace', part:'cocktail'},
  tl4:{time:'16:00', loc:'Garden',         part:'ceremony'},
  tl5:{time:'17:00', loc:'Ballroom',       part:'reception'},
  tl6:{time:'17:30', loc:'Ballroom',       part:'reception'},
  tl7:{time:'18:45', loc:'Ballroom',       part:'reception'},
  tl8:{time:'19:30', loc:'Dance floor',    part:'reception'},
  tl9:{time:'23:00', loc:'Ballroom',       part:'reception'}
};
function wzFitStarterTimeline(){
  const seen = new Set(), items = [];
  [STATE.timeline].concat((STATE.timelines||[]).map(t=>t&&t.items)).forEach(list=>(Array.isArray(list)?list:[]).forEach(it=>{
    if(it && WZ_TL_STARTER[it.id] && !seen.has(it)){ seen.add(it); items.push(it); }
  }));
  if(!items.length) return;
  items.forEach(it=>{
    const d = WZ_TL_STARTER[it.id];
    if(it.location !== d.loc) return;
    const place = (typeof _evSpace==='function' && _evSpace(d.part)) || (typeof _evPartVenue==='function' && _evPartVenue(d.part)) || '';
    if(place) it.location = place;
  });
  const T = String(STATE.event.time||'');
  const untouched = items.every(it=>it.time===WZ_TL_STARTER[it.id].time);
  if(!/^\d{2}:\d{2}$/.test(T) || !untouched) return;
  const mins = t => { const [h,m]=t.split(':').map(Number); return h*60+m; };
  const shift = mins(T) - mins('15:00');
  if(!shift) return;
  items.forEach(it=>{
    const m = Math.min(23*60+59, Math.max(0, mins(it.time)+shift));
    it.time = String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  });
}

// Alias kept for any legacy references
function welcomeFinish(){ wizardFinish(); }

// ── Boot ──────────────────────────────────────────────────────────────
wzInitTS();
wzBuildPalette();
wzBuildCerSetting();
if(typeof RELIGION_OPTIONS !== 'undefined') wzFillSelect('i-religion', RELIGION_OPTIONS);
if(typeof OFFICIANT_OPTIONS !== 'undefined') wzFillSelect('i-officiant', OFFICIANT_OPTIONS);
wzRenderSpaces();
wzRenderBar();
wzUpdateUI();
