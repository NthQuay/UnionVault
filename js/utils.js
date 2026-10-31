// UTILS
// ══════════════════════════════════════════════
function uid(){ return 'id'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
// Currency table: code → {label, symbol, locale}. Locale drives digit grouping.
const CURRENCIES = {
  AUD:{label:'Australian dollar', symbol:'$',  locale:'en-AU'},
  USD:{label:'US dollar',         symbol:'$',  locale:'en-US'},
  GBP:{label:'British pound',     symbol:'£',  locale:'en-GB'},
  EUR:{label:'Euro',              symbol:'€',  locale:'en-IE'},
  NZD:{label:'New Zealand dollar',symbol:'$',  locale:'en-NZ'},
  CAD:{label:'Canadian dollar',   symbol:'$',  locale:'en-CA'},
  SGD:{label:'Singapore dollar',  symbol:'$',  locale:'en-SG'},
  ZAR:{label:'South African rand',symbol:'R',  locale:'en-ZA'},
  INR:{label:'Indian rupee',      symbol:'₹',  locale:'en-IN'},
  JPY:{label:'Japanese yen',      symbol:'¥',  locale:'ja-JP'},
  CHF:{label:'Swiss franc',       symbol:'CHF ',locale:'de-CH'},
  AED:{label:'UAE dirham',        symbol:'AED ',locale:'en-AE'}
};
function _curCode(){ const c=STATE.settings && STATE.settings.currencyCode; return (c && CURRENCIES[c]) ? c : 'AUD'; }
function _curMeta(){ return CURRENCIES[_curCode()]; }
function _curSym(){ return _curMeta().symbol; }
function _curLocale(){ return _curMeta().locale; }
function fmt(n){
  const showCents = STATE.settings && STATE.settings.currencyDecimals;
  const num = Number(n)||0;
  const sym = _curSym();
  const loc = _curLocale();
  if(showCents){
    return sym+num.toLocaleString(loc,{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  return sym+Math.round(num).toLocaleString(loc,{minimumFractionDigits:0,maximumFractionDigits:0});
}
function _todayISO(){ const d=new Date(); const o=d.getTimezoneOffset(); const local=new Date(d.getTime()-o*60000); return local.toISOString().slice(0,10); }

// Recommended lead time (in days) before the wedding for each DEFAULT checklist task.
// Used to suggest a due date once a wedding date is set. Keyed by seed task id.
const SEED_CHECKLIST_LEAD_DAYS = {
  cl0:420,  // Research venues — ~14 months
  cl1:390,  // Book venue — ~13 months
  cl8:365,  // Send save the dates — ~12 months
  cl2:300,  // Hire celebrant / officiant — ~10 months
  cl4:300,  // Book photographer — ~10 months
  cl5:300,  // Book videographer — ~10 months
  cl7:270,  // Book caterer — ~9 months
  cl3:240,  // Order wedding attire — ~8 months
  cl15:240, // Book DJ or band — ~8 months
  cl11:180, // Book honeymoon travel — ~6 months
  cl10:180, // Arrange guest accommodation — ~6 months
  cl6:180,  // Arrange florals — ~6 months
  cl9:150,  // Book hair & makeup — ~5 months
  cl17:120, // Arrange wedding transport — ~4 months
  cl12:150, // Purchase rings — ~5 months
  cl13:180, // Send formal invitations — ~6 months
  cl19:56,  // Plan rehearsal dinner — ~8 weeks
  cl18:42,  // Write vows — ~6 weeks
  cl14:42,  // Finalise menu choices — ~6 weeks
  cl16:21,  // Create seating plan — ~3 weeks
  cl20:14   // Collect marriage certificate — ~2 weeks
};

// Add/subtract days from an ISO (yyyy-mm-dd) date, returning ISO.
function _isoShiftDays(iso, days){
  const d=new Date(iso+'T00:00:00');
  if(isNaN(d)) return '';
  d.setDate(d.getDate()+days);
  const o=d.getTimezoneOffset();
  return new Date(d.getTime()-o*60000).toISOString().slice(0,10);
}

// Suggest due dates for UNTOUCHED default checklist tasks based on the wedding date.
// - Only fills a task that is still a recognised seed (id in the lead-time map) AND whose
//   dueDate is either blank or was previously auto-suggested (tracked via _autoDue flag).
// - Never overwrites a date the user set manually (those have _autoDue falsy once edited).
// - If a computed date is already in the past, it falls back to a near-future spread so the
//   user isn't greeted with a wall of overdue items.
function applySuggestedChecklistDueDates(){
  const wedding = STATE.event && STATE.event.date;
  if(!wedding) return;
  const today = _todayISO();
  // Build a fallback ordering: tasks whose ideal date is past get spread out from today,
  // soonest-recommended last, so longer-lead tasks still come first.
  const ids = Object.keys(SEED_CHECKLIST_LEAD_DAYS);
  STATE.checklist.forEach(t=>{
    if(!t || !(t.id in SEED_CHECKLIST_LEAD_DAYS)) return;      // not a default task
    if(t.dueDate && !t._autoDue) return;                       // user set this date — leave it
    const ideal = _isoShiftDays(wedding, -SEED_CHECKLIST_LEAD_DAYS[t.id]);
    if(!ideal) return;
    let due = ideal;
    if(ideal < today){
      // Past — fall back to a near-future date, ordered by remaining lead time.
      // Tasks closest to the wedding get the later fallback dates.
      const idx = ids.indexOf(t.id);
      const rank = ids.length - idx; // longer-lead tasks => smaller offset (sooner)
      due = _isoShiftDays(today, Math.min(rank * 3, 90));
      if(due > wedding) due = wedding;
    }
    t.dueDate = due;
    t._autoDue = true; // mark as auto-suggested so a later date change can refresh it
  });
}

// Handler for the Event Details wedding-date field.
// On a genuine date CHANGE where checklist due dates already exist, offer a two-step
// prompt: (1) adjust or keep, then (2) choose HOW to adjust. Otherwise apply suggestions
// silently (e.g. first time a date is set with only blank/auto dates).
function onWeddingDateChange(val){
  const oldDate = STATE.event.date || '';
  const newDate = val || '';
  STATE.event.date = newDate;

  const hasExistingDueDates = STATE.checklist.some(t=>t && t.dueDate);
  const isRealChange = oldDate && newDate && oldDate!==newDate;

  if(isRealChange && hasExistingDueDates){
    _askAdjustDueDates(oldDate, newDate);
    // updateTopbarSub/save happen inside the flow handlers
    updateTopbarSub();
    saveToStorage();
    return;
  }

  // No prompt needed: fill suggestions for untouched defaults and move on.
  applySuggestedChecklistDueDates();
  updateTopbarSub();
  saveToStorage();
  if(_currentPage==='checklist') navigate('checklist');
}

// Whole-day difference between two ISO dates (newDate - oldDate), in days.
function _dateOffsetDays(oldISO, newISO){
  const a=new Date(oldISO+'T00:00:00'), b=new Date(newISO+'T00:00:00');
  if(isNaN(a)||isNaN(b)) return 0;
  return Math.round((b-a)/86400000);
}

// STEP 1: ask whether to adjust the existing due dates at all.
function _askAdjustDueDates(oldISO, newISO){
  const off = _dateOffsetDays(oldISO, newISO);
  const dir = off>0 ? 'later' : 'earlier';
  const absDays = Math.abs(off);
  const dayWord = absDays===1 ? 'day' : 'days';
  _pendingDateAdjust = {oldISO, newISO, off};
  openModal('Adjust due dates?',
    `<div style="text-align:center;padding:6px 2px">
       <div style="font-family:'Cormorant Garamond',serif;font-size:22px;margin-bottom:8px;color:var(--ink)">Adjust due dates?</div>
       <div style="font-size:13.5px;color:var(--muted);line-height:1.6">Your wedding date moved from <strong style="color:var(--ink)">${fmtBudgetDate(oldISO)}</strong> to <strong style="color:var(--ink)">${fmtBudgetDate(newISO)}</strong> — ${absDays} ${dayWord} ${dir}.<br><br>Would you like to adjust your checklist due dates to match?</div>
     </div>`,
    `<button class="btn btn-outline" onclick="_keepDueDatesAsIs()">Keep as they are</button>
     <button class="btn btn-primary" onclick="_chooseDueDateAdjust()">Auto-adjust dates</button>`);
}

function _keepDueDatesAsIs(){
  _pendingDateAdjust = null;
  closeModalDirect();
  if(_currentPage==='checklist') navigate('checklist');
}

// STEP 2: choose HOW to adjust.
function _chooseDueDateAdjust(){
  if(!_pendingDateAdjust){ closeModalDirect(); return; }
  const off = _pendingDateAdjust.off;
  const absDays = Math.abs(off);
  const dayWord = absDays===1 ? 'day' : 'days';
  const dir = off>0 ? 'later' : 'earlier';
  const optBox = (onclick,title,desc)=>
    `<div onclick="${onclick}" style="border:1px solid var(--border);border-radius:10px;padding:11px 13px;margin-bottom:9px;background:var(--cream);cursor:pointer" onmouseover="this.style.borderColor='var(--gold-deep)'" onmouseout="this.style.borderColor='var(--border)'">
       <div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:2px">${title}</div>
       <div style="font-size:11.5px;color:var(--muted);line-height:1.5">${desc}</div>
     </div>`;
  openModal('How should they adjust?',
    `<div style="padding:2px">
       ${optBox(`_applyDueDateAdjust('shift')`,`Shift everything by ${absDays} ${dayWord}`,`Keep your spacing — move every due date ${dir} by the same amount the wedding moved.`)}
       ${optBox(`_applyDueDateAdjust('recalc-shift')`,`Recalculate from recommended lead times`,`Reset default tasks to their suggested timing; shift your own custom dates by ${absDays} ${dayWord}.`)}
       ${optBox(`_applyDueDateAdjust('recalc-only')`,`Recalculate default tasks only`,`Reset default tasks to suggested timing; leave your custom dates untouched.`)}
     </div>`,
    `<button class="btn btn-outline" onclick="_keepDueDatesAsIs()">Cancel</button>`);
}

// Apply the chosen adjustment mode, then close and re-render.
function _applyDueDateAdjust(mode){
  if(!_pendingDateAdjust){ closeModalDirect(); return; }
  const off = _pendingDateAdjust.off;
  const seedIds = SEED_CHECKLIST_LEAD_DAYS;

  if(mode==='shift'){
    // Move every existing due date by the offset (keeps spacing for all tasks).
    STATE.checklist.forEach(t=>{
      if(t && t.dueDate){ t.dueDate = _isoShiftDays(t.dueDate, off); }
    });
  } else if(mode==='recalc-shift'){
    // Defaults: recalc from lead times. Custom dates: shift by offset.
    STATE.checklist.forEach(t=>{
      if(!t || !t.dueDate) return;
      if((t.id in seedIds) && t._autoDue){ return; } // recalculated below
      if(t.id in seedIds){ /* default but user-edited -> treat as custom: shift */ }
      t.dueDate = _isoShiftDays(t.dueDate, off);
    });
    // Now recalc the auto defaults from the new wedding date.
    STATE.checklist.forEach(t=>{ if(t && (t.id in seedIds) && t._autoDue) t.dueDate=''; });
    applySuggestedChecklistDueDates();
  } else if(mode==='recalc-only'){
    // Only recalc the auto defaults; leave everything else exactly as-is.
    STATE.checklist.forEach(t=>{ if(t && (t.id in seedIds) && t._autoDue) t.dueDate=''; });
    applySuggestedChecklistDueDates();
  }

  _pendingDateAdjust = null;
  closeModalDirect();
  updateTopbarSub();
  saveToStorage();
  if(_currentPage==='checklist') navigate('checklist');
}

// Does a sub-item / item have a due date listed?
function _subHasDue(s){ return !!(s && (s.showDueDate || s.balanceDueDate)); }
function _itemHasDue(b){ return !!(b && b.balanceDueDate); }
// On check: auto-stamp paid date as today ONLY if a due date is listed (otherwise leave blank for manual entry).
// Always preserves any previously-stored date (never overwrites).
function _stampSubPaidDate(s){ if(s && !s.paidDate && _subHasDue(s)) s.paidDate=_todayISO(); }
function _stampItemPaidDate(b){ if(b && !b.balancePaidDate && _itemHasDue(b)) b.balancePaidDate=_todayISO(); }
function _latestSubPaidDate(b,kind){
  const field = kind==='deposit' ? 'depositPaidDate' : 'paidDate';
  const dates = (b.subItems||[]).map(s=>s[field]).filter(Boolean).sort();
  return dates.length ? dates[dates.length-1] : '';
}
function _allSubDepositsPaid(b){
  const withDep = (b.subItems||[]).filter(s=>Number(s.deposit||0)>0 || s.depositDueDate || s.showDeposit);
  if(!withDep.length) return false;
  return withDep.every(s=>s.depositPaid);
}
function paidRelative(dateStr){
  // Returns 'today' | 'yesterday' | '' (absolute) for a YYYY-MM-DD paid date
  if(!dateStr) return '';
  const today=new Date(); today.setHours(0,0,0,0);
  const d=new Date(dateStr+'T00:00:00');
  const diffDays=Math.round((today-d)/86400000);
  if(diffDays===0) return 'today';
  if(diffDays===1) return 'yesterday';
  return '';
}
function fmtDate(d){
  if(!d)return'';
  const dt=new Date(d+'T00:00:00');
  return dt.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
}
function fmtBudgetDate(d){
  if(!d)return'';
  const dt=new Date(d+'T00:00:00');
  const showYear = !(STATE.settings && STATE.settings.budgetHideYear);
  const opts = showYear ? {day:'numeric',month:'short',year:'numeric'} : {day:'numeric',month:'short'};
  return dt.toLocaleDateString('en-AU',opts);
}
function dueDateClass(d,paid){
  if(!d||paid)return'';
  const today=new Date();today.setHours(0,0,0,0);
  const due=new Date(d+'T00:00:00');
  const diff=(due-today)/(86400000);
  if(diff<0)return'date-overdue';
  if(diff<=7)return'date-red';
  return'';
}
function dueDateLabel(d,paid,completedLabel='PAID',fmtFn){
  if(!d)return'';
  const today=new Date();today.setHours(0,0,0,0);
  const due=new Date(d+'T00:00:00');
  const diff=(due-today)/(86400000);
  const label=(fmtFn||fmtDate)(d);
  if(paid)return`<span style="color:var(--muted)">${label} &mdash; <strong>${completedLabel}</strong></span>`;
  if(diff<0)return`<span class="date-overdue">OVERDUE &mdash; ${label}</span>`;
  if(diff<=7)return`<span class="date-red">Due soon &mdash; ${label}</span>`;
  return`<span style="color:var(--muted)">${label}</span>`;
}
function initials(name){
  const n=(name||'?').trim();
  // Special case: +1 (Name) format
  if(n.startsWith('+1')) return '+1';
  return n.split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase()||'?';
}
function coupleDisplayName(name1, name2){
  // Wrap the second name in a nowrap span so, if the header wraps, the break
  // falls after the "&" and the second name stays together on the next line.
  const second = s => `<span style="white-space:nowrap">${s}</span>`;
  if(!name1 || !name2) return `${name1||''} &amp; ${second(name2||'')}`;
  const w1 = name1.trim().split(/\s+/);
  const w2 = name2.trim().split(/\s+/);
  // Longest common word-suffix: handles compound surnames like "De Capra".
  // Requires at least one word remaining as a given name after stripping.
  const minLen = Math.min(w1.length, w2.length);
  let suffixLen = 0;
  for(let s = 1; s < minLen; s++){
    if(w1.slice(-s).join(' ').toLowerCase() === w2.slice(-s).join(' ').toLowerCase()) suffixLen = s;
  }
  if(suffixLen > 0){
    const first1 = w1.slice(0, -suffixLen).join(' ');
    const first2 = w2.slice(0, -suffixLen).join(' ');
    const surname = w1.slice(-suffixLen).join(' ');
    return `${first1} &amp; ${second(first2 + ' ' + surname)}`;
  }
  return `${name1} &amp; ${second(name2)}`;
}

/* ── Dietary vocabulary (v177) — the ONE list. Allergy is a dietary key like the others;
   WHAT they're allergic to lives beside it on the guest: `g.allergens` (keys from ALLERGENS,
   Australia's common allergens, so the RSVP summary can count them for the caterer) and
   `g.allergyNote` (anything else, kept exactly as typed). Unticking Allergy keeps both, so an
   accidental untick loses nothing; every reader shows them only while 'allergy' is ticked. */
const DIET_KEYS=['vegetarian','pescatarian','vegan','halal','kosher','lactose','gluten','allergy','other'];
const DIET_LABELS={vegetarian:'Vegetarian',pescatarian:'Pescatarian',vegan:'Vegan',halal:'Halal',kosher:'Kosher',lactose:'Lactose intolerant',gluten:'Gluten intolerant',allergy:'Allergy',other:'Other'};
const ALLERGENS=[['peanuts','Peanuts'],['treenuts','Tree nuts'],['shellfish','Shellfish'],['fish','Fish'],['eggs','Eggs'],['milk','Milk'],['sesame','Sesame'],['soy','Soy'],['wheat','Wheat']];
/* The muted one-line summary on guest cards keeps its existing lower-case keys; only the
   allergy segment changes — it carries its detail and is red so it doesn't hide in the line. */
function _dietRawHtml(g){
  return (g&&g.dietary||[]).map(d=>d==='allergy'
    ? `<span class="diet-txt-al">${_escHtml(_dietWord(g,d,'paren').replace(/^Allergy/,'allergy'))}</span>`
    : d==='other' ? _escHtml(_dietWord(g,d,'paren').replace(/^Other/,'other'))
    : _escHtml(d)).join(', ');
}
function _allergenLabel(k){ const a=ALLERGENS.find(x=>x[0]===k); return a?a[1]:String(k||''); }
function _hasAllergy(g){ return !!(g && Array.isArray(g.dietary) && g.dietary.includes('allergy')); }
/* "Peanuts, Tree nuts, kiwi fruit" — chips first, then the typed note. '' when unspecified. */
function _allergyText(g){
  if(!g) return '';
  const a=(Array.isArray(g.allergens)?g.allergens:[]).map(_allergenLabel).filter(Boolean);
  const n=String(g.allergyNote||'').trim(); if(n) a.push(n);
  return a.join(', ');
}
/* What "Other" means for this guest — '' when unspecified. Shown only while Other is ticked. */
function _otherText(g){ return String(g&&g.dietOther||'').trim(); }
/* One dietary entry as words. Allergy and Other carry their detail:
   "Allergy · Peanuts" / "Allergy (Peanuts)", "Other · Halal" / "Other (Halal)". */
function _dietWord(g,d,sep){
  const t = d==='allergy' ? _allergyText(g) : d==='other' ? _otherText(g) : '';
  const L = DIET_LABELS[d]||String(d);
  return t ? (sep==='paren' ? L+' ('+t+')' : L+' · '+t) : L;
}
/* Free-typed diet words (CSV import, and older imported guests) → the app's keys.
   Recognised words become their tick-box; allergy mentions become Allergy + detail;
   anything else becomes Other with the words kept verbatim as its detail — so every
   entry lands on a tick-box, an icon and a count, and nothing typed is lost.
   Conservative on purpose: "dairy free" could be lactose or a milk allergy, so it stays
   as Other's words rather than being guessed into either. */
const _DIET_SYNONYMS={vegetarian:'vegetarian',veg:'vegetarian',veggie:'vegetarian',vego:'vegetarian',
  pescatarian:'pescatarian',pescetarian:'pescatarian',pesc:'pescatarian',peskatarian:'pescatarian',
  vegan:'vegan',
  halal:'halal',
  kosher:'kosher',kasher:'kosher',
  lactose:'lactose','lactose free':'lactose','lactose intolerant':'lactose','lactose intolerance':'lactose',
  gluten:'gluten','gluten free':'gluten','gluten intolerant':'gluten','gluten intolerance':'gluten',coeliac:'gluten',celiac:'gluten',
  allergy:'allergy',other:'other'};
function _normaliseDiet(entries){
  const dietary=[], al=[], oth=[];
  const add=k=>{ if(!dietary.includes(k)) dietary.push(k); };
  const strip=t=>t.replace(/\b(severe|mild|allergies|allergy|allergic|anaphylactic|anaphylaxis)\b|\bto\b|[:()]/gi,' ').replace(/\s+/g,' ').trim();
  (entries||[]).map(x=>String(x||'').trim()).filter(Boolean).forEach(t=>{
    const key=t.toLowerCase().replace(/[-_]/g,' ').replace(/\s+/g,' ').trim();
    if(_DIET_SYNONYMS[key]){ add(_DIET_SYNONYMS[key]); return; }
    if(/allerg|anaphyla/i.test(t)){ const d=strip(t); if(d) al.push(d); add('allergy'); return; }
    oth.push(t); add('other');
  });
  const r=_parseAllergyText(al.join(', '));
  // Keep the app's own tick-box order.
  dietary.sort((a,b)=>DIET_KEYS.indexOf(a)-DIET_KEYS.indexOf(b));
  return {dietary, allergens:r.allergens, allergyNote:r.note, dietOther:oth.join(', ')};
}
function _dietText(g){ return (g&&g.dietary||[]).map(d=>_dietWord(g,d,'paren')).join(', '); }
/* Free text → {allergens, note}. Only EXACT allergen names (singular or plural) become chips;
   everything else stays in the note verbatim. Deliberately conservative: guessing that "nuts"
   means tree nuts, or "dairy" means a milk allergy, is a guess about what someone can eat. */
function _parseAllergyText(str){
  const out={allergens:[], note:''}; const rest=[];
  String(str||'').split(/\s*(?:[,;\/&+]|\band\b)\s*/i).map(x=>x.trim()).filter(Boolean).forEach(tok=>{
    const t=tok.toLowerCase().replace(/\s+/g,' ');
    const hit=ALLERGENS.find(([k,l])=>{ const L=l.toLowerCase(); return t===L || t===L.replace(/s$/,'') || t+'s'===L || t===k; });
    if(hit){ if(!out.allergens.includes(hit[0])) out.allergens.push(hit[0]); }
    else rest.push(tok);
  });
  out.note=rest.join(', ');
  return out;
}
function dietIcons(diets){
  const svgMap={
    vegetarian:`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Vegetarian"><path d="M12 2C6 2 3 7 3 12c0 4 2.5 7 6 8"/><path d="M12 2c4 3 7 7 7 10 0 4-2.5 7-6 8"/><line x1="12" y1="22" x2="12" y2="10"/></svg>`,
    pescatarian:`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Pescatarian"><path d="M6 12C6 8.5 10 6 16 6.5C21 7 23 9.5 23 12C23 14.5 21 17 16 17.5C10 18 6 15.5 6 12Z"/><path d="M6 12L2 8M6 12L2 16"/><circle cx="18" cy="10.5" r="1.2" fill="currentColor" stroke="none"/></svg>`,
    halal:`<svg width="12" height="12" viewBox="0 0 24 24" title="Halal"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="2"/><text x="12" y="15.5" font-size="10" text-anchor="middle" fill="currentColor" stroke="none" font-weight="bold" font-family="system-ui,sans-serif">حلال</text></svg>`,
    kosher:`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Kosher"><path d="M12 3L19.8 16.5L4.2 16.5Z"/><path d="M19.8 7.5L12 21L4.2 7.5Z"/></svg>`,
    vegan:`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Vegan"><path d="M3 3c0 10 7 17 17 17-1-9-7-15-17-17z"/><path d="M3 3l8 8"/></svg>`,
    lactose:`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Lactose free"><path d="M2 15 L12 5 L22 15 L2 15 Z"/><path d="M2 15 L22 15 L22 20 L2 20 Z"/><circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="9" cy="17" r="1.5" fill="currentColor" stroke="none"/><line x1="4" y1="4" x2="20" y2="20"/></svg>`,
    gluten:`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Gluten free"><line x1="12" y1="22" x2="12" y2="3"/><path d="M12 7 C10 5 8 6 10 9 M12 7 C14 5 16 6 14 9"/><path d="M12 13 C10 11 8 12 10 15 M12 13 C14 11 16 12 14 15"/><path d="M12 18 C10 16 8 17 10 20 M12 18 C14 16 16 17 14 20"/><line x1="4" y1="4" x2="20" y2="20"/></svg>`,
    allergy:`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" title="Allergy"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    other:`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Other dietary"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  };
  return(diets||[]).map(d=>`<span${d==='allergy'?' class="diet-ico-al"':''} style="display:inline-flex;align-items:center;color:var(--gold-deep)">${svgMap[d]||''}</span>`).join('');
}
function outstandingForItem(budgetId){
  const b=STATE.budget.items.find(x=>x.id===budgetId);
  if(!b)return 0;
  return calcBudgetBalance(b);
}
let openDropdown=null;

// ══════════════════════════════════════════════
