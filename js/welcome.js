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
  wzSelPalIdx = idx;
  document.querySelectorAll('#pal-grid .pal-swatch').forEach((s,i)=>s.classList.toggle('on',i===idx));
  wzApplyAccent(WZ_PALETTES[idx].hex);
  const cp = document.getElementById('pal-custom');
  if(cp) cp.value = WZ_PALETTES[idx].hex;
}
function wzSelectPalette2(idx){
  wzSelPalIdx2 = idx;
  document.querySelectorAll('#pal-grid2 .pal-swatch2').forEach((s,i)=>s.classList.toggle('on',i===idx));
  wzApplyAccent2(WZ_PALETTES2[idx].hex);
  const cp = document.getElementById('pal-custom2');
  if(cp) cp.value = WZ_PALETTES2[idx].hex;
}
function wzSelectCustomPalette(hex){
  wzSelPalIdx = -1;
  document.querySelectorAll('#pal-grid .pal-swatch').forEach(s=>s.classList.remove('on'));
  wzApplyAccent(hex);
}
function wzSelectCustomPalette2(hex){
  wzSelPalIdx2 = -1;
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
  {cat:'Venue',           tasks:['Book ceremony venue','Book reception venue','Venue site visit','Confirm AV & sound system','Venue layout walkthrough']},
  {cat:'Stationery',      tasks:['Send save the dates','Design and order invitations','Send formal invitations','Print ceremony programs','Design menus & place cards','Send RSVP reminders','Order thank you cards']},
  {cat:'Ceremony',        tasks:['Hire celebrant / officiant','Lodge notice of intended marriage','Write personal vows','Plan ceremony music','Plan processional order','Organise rehearsal']},
  {cat:'Attire',          tasks:['Order bridal gown','Dress alterations & fittings','Order groom\'s suit / attire','Bridesmaid dresses','Groomswear','Wedding shoes','Flower girl outfits','Purchase accessories']},
  {cat:'Beauty',          tasks:['Book hair & makeup artist','Hair & makeup trial','Book spray tan','Nail appointment','Prepare day-of emergency kit']},
  {cat:'Media',           tasks:['Book photographer','Book videographer','Plan photo shot list','Book photo booth','Book drone footage','Arrange engagement shoot']},
  {cat:'Catering',        tasks:['Book caterer','Schedule menu tasting','Book cake tasting','Finalise menu & dietary notes','Order wedding cake','Confirm bar package','Arrange grazing table']},
  {cat:'Decor & Florals', tasks:['Hire florist','Bridal & bridesmaid bouquets','Ceremony arch / backdrop','Reception centrepieces','Candles & ambient lighting','Confetti or petal toss','Signage & table stationery']},
  {cat:'Entertainment',   tasks:['Book DJ or band','Plan first dance song','Organise speeches order','Book photo booth props','Guest lawn games / activities','Book kids\' entertainer']},
  {cat:'Logistics',       tasks:['Finalise guest list','Arrange guest transport','Book wedding party transport','Block accommodation for guests','Hire on-the-day coordinator','Create seating plan','Finalise floorplan','Finalise run sheet / timeline','Finalise day-of timeline']},
  {cat:'Rings',           tasks:['Purchase wedding rings','Ring engraving','Ring box & presentation']},
  {cat:'Honeymoon',       tasks:['Book honeymoon flights','Book honeymoon accommodation','Purchase travel insurance','Plan honeymoon activities','Organise travel wallet & currency']},
  {cat:'Legal',           tasks:['Collect marriage certificate','Name change — passport','Name change — driver\'s licence','Name change — bank accounts']},
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
  Object.keys(wzTs).forEach(k=>wzTs[k] = nv);
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
  if(wzCur === 6) wzRenderCL();
  wzRenderBar();
  wzUpdateUI();
}

// ── UI update ────────────────────────────────────────────────────────
function wzUpdateUI(){
  const nxt  = document.getElementById('btn-next');
  const back = document.getElementById('btn-back');
  const txt  = document.getElementById('step-txt');
  if(back) back.style.visibility = wzCur > 1 ? 'visible' : 'hidden';
  if(txt)  txt.textContent = `Step ${wzCur} of ${WZ_TOTAL}`;

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

    // Venue + setting + time of day
    const venueVal = ((document.getElementById('i-venue')||{}).value||'').trim();
    const svEl = document.getElementById('sum-venue');
    const ssEl = document.getElementById('sum-setting-disp');
    if(svEl) svEl.textContent = venueVal || 'Not set';
    const settingPill = document.querySelector('[data-grp="loc"].on');
    const todSel = document.getElementById('i-tod');
    const todMap = {'Morning (before noon)':'Morning','Afternoon (12pm – 4pm)':'Afternoon','Evening (after 4pm)':'Evening'};
    const todTxt = todSel ? (todMap[todSel.value] || todSel.value) : '';
    const settingTxt = settingPill ? settingPill.textContent : '';
    if(ssEl) ssEl.textContent = [settingTxt,todTxt].filter(Boolean).join(' · ') || '—';

    // Ceremony + formality
    const cerPill = document.querySelector('[data-grp="cer"].on');
    const fmPill  = document.querySelector('[data-grp="fm"].on');
    const scerEl  = document.getElementById('sum-ceremony');
    const sfmEl   = document.getElementById('sum-formality-disp');
    if(scerEl) scerEl.textContent = cerPill ? cerPill.textContent : '—';
    if(sfmEl)  sfmEl.textContent  = fmPill  ? fmPill.textContent  : '—';

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
    if(spbEl){
      let partySub = 'Bridesmaids & Groomsmen';
      if((fv!==0&&fv!=='0')||(pv!==0&&pv!=='0'))
        partySub += ` · ${fv} flower girl${fv!==1?'s':''}, ${pv} page boy${pv!==1?'s':''}`;
      spbEl.textContent = partySub;
    }

    // Vibe tags
    const vibes = [...document.querySelectorAll('#p3 .pill.on:not([data-grp])')].map(p=>p.textContent.trim()).filter(Boolean);
    const tagsEl = document.getElementById('sum-tags');
    if(tagsEl){
      if(vibes.length){
        tagsEl.innerHTML = '<span style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);align-self:center">Vibe&nbsp;</span>'+
          vibes.map(v=>`<span class="sum-tag">${wzEscH(v)}</span>`).join('');
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
        `<div class="sum-pal-info"><strong>Wedding palette</strong><small>${wzEscH(pn1)} &amp; ${wzEscH(pn2)}</small></div>`;

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
function wzToggleCerVenue(show){
  const g = document.getElementById('cer-venue-group');
  if(g) g.style.display = show ? 'flex' : 'none';
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
}

// ── Checklist chip click (delegated) ─────────────────────────────────
document.addEventListener('click', function(e){
  const chip = e.target.closest('.cl-chip');
  if(!chip) return;
  const key = chip.dataset.key;
  if(key && key in wzTs){ wzTs[key] = !wzTs[key]; wzRenderCL(); }
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

  // Step 2
  const dateVal     = (document.getElementById('i-date')||{}).value||'';
  const todEl       = document.getElementById('i-tod');
  const timeOfDay   = todEl ? todEl.value : '';
  const venue       = ((document.getElementById('i-venue')||{}).value||'').trim();
  const cerVenueEl  = document.getElementById('i-cer-venue');
  const cerVenueGrp = document.getElementById('cer-venue-group');
  const cerVenueSep = cerVenueGrp && cerVenueGrp.style.display !== 'none';
  const cerVenue    = cerVenueSep ? ((cerVenueEl||{}).value||'').trim() : '';
  const cerPill     = document.querySelector('[data-grp="cer"].on');
  const locPill     = document.querySelector('[data-grp="loc"].on');
  const ceremonyType = cerPill ? cerPill.textContent.trim() : '';
  const setting      = locPill ? locPill.textContent.trim() : '';

  // Step 3
  const gcSlider  = document.getElementById('i-guest-count');
  const guestCount = gcSlider ? parseInt(gcSlider.value)||0 : 0;
  const fmPill    = document.querySelector('[data-grp="fm"].on');
  const formality = fmPill ? fmPill.textContent.trim() : '';
  const vibe      = [...document.querySelectorAll('#p3 .pill.on:not([data-grp])')].map(p=>p.textContent.trim()).filter(Boolean);

  // Palette
  const wz = document.querySelector('.wz-wrap');
  const accentColor  = (wz&&wz.style.getPropertyValue('--accent'))  || '';
  const accentColor2 = (wz&&wz.style.getPropertyValue('--accent2')) || '';

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
  STATE.event.venue        = venue;
  if(cerVenueSep) STATE.event.ceremonyVenue = cerVenue;
  STATE.event.timeOfDay    = timeOfDay;
  STATE.event.ceremonyType = ceremonyType;
  STATE.event.setting      = setting;
  STATE.event.formality    = formality;
  STATE.event.vibe         = vibe;
  STATE.event.guestCount   = guestCount;
  STATE.event.partyBridesmaids = bmVal;
  STATE.event.partyGroomsmen   = gmVal;
  STATE.event.partyFlowerGirls = fgVal;
  STATE.event.partyPageBoys    = pbVal;

  STATE.settings.partner1Title = t1;
  STATE.settings.partner2Title = t2;
  STATE.settings.currency      = currency;
  if(accentColor)  STATE.settings.accentColor  = accentColor;
  if(accentColor2) STATE.settings.accentColor2 = accentColor2;

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

  // ── Finalise ───────────────────────────────────────────────────────
  if(typeof applySuggestedChecklistDueDates === 'function') applySuggestedChecklistDueDates();
  saveToStorage();
  document.getElementById('setup-modal-overlay').classList.add('hidden');
  if(typeof updateTopbarSub !== 'undefined') updateTopbarSub();
  if(typeof navigate !== 'undefined') navigate('dashboard');
}

// Alias kept for any legacy references
function welcomeFinish(){ wizardFinish(); }

// ── Boot ──────────────────────────────────────────────────────────────
wzInitTS();
wzBuildPalette();
wzRenderBar();
wzUpdateUI();
