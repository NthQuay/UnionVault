// WEDDING TIPS LIBRARY
// ══════════════════════════════════════════════
// Read-only reference content (not a planning tool like the other pages) —
// 13 categories of 5 tips each. A few tips point at a specific UnionVault
// tool; those carry a `link` so the tip can jump straight there instead of
// just naming it in passing text.
const TIPS_ICONS={
  guests:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  seating:'<circle cx="12" cy="12" r="4"/><circle cx="12" cy="3" r="1.5"/><circle cx="12" cy="21" r="1.5"/><circle cx="3" cy="12" r="1.5"/><circle cx="21" cy="12" r="1.5"/><circle cx="5.6" cy="5.6" r="1.5"/><circle cx="18.4" cy="18.4" r="1.5"/><circle cx="18.4" cy="5.6" r="1.5"/><circle cx="5.6" cy="18.4" r="1.5"/>',
  heart:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  budget:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  vendors:'<path d="M2 5h20v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M4 11v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9"/><path d="M9 21v-6h6v6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
  website:'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  moodboard:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  gift:'<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
  couple:'<circle cx="9" cy="7" r="3.5"/><path d="M3 20v-1.5a5 5 0 0 1 5-5h2"/><circle cx="17" cy="7" r="3.5"/><path d="M13 14.5a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5V20"/>',
  checklist:'<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  countdown:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5"/><path d="M9 2h6"/><path d="M12 2v3"/>'
};
const TIPS_LIBRARY=[
  {icon:'guests', title:'Guest List & RSVP Etiquette', tagline:'Plus-ones, A-lists and RSVP deadlines — sorted without the awkwardness.', tips:[
    {lead:'Set clear plus-one rules early.', body:'Decide upfront if plus-ones apply only to married, engaged, or long-term couples to keep your numbers fair and consistent.'},
    {lead:'Create an A-list and B-list.', body:'Send your first round of invites early so you have time to invite B-list guests without them feeling like an afterthought.'},
    {lead:'Set your RSVP deadline 3–4 weeks out.', body:'Your caterer and venue need final headcounts and dietary requirements well before the wedding week.'},
    {lead:'Automate your RSVP tracking.', body:'Ditch paper spreadsheets and track dietary needs, plus-ones, and responses automatically.', link:{page:'rsvp-mgr', label:'Open RSVP & Invites'}},
    {lead:'Follow up firmly after the deadline.', body:'Give late responders 48 hours to confirm before marking them as declined so your seating plan isn’t held up.'}
  ]},
  {icon:'seating', title:'Seating Chart & Floorplan Strategy', tagline:'Seat everyone happily and plan a reception layout that flows.', tips:[
    {lead:'Seat guests by shared interests.', body:'Mix friend groups with similar hobbies or energy levels rather than strictly separating "bride’s side" and "groom’s side."'},
    {lead:'Keep elderly guests away from speakers.', body:'Place grandparents and older relatives at tables far from the DJ booth or dance floor so they can comfortably chat.'},
    {lead:'Don’t create a "singles table".', body:'Seat solo guests alongside familiar faces or mutual friends so nobody feels isolated during dinner.'},
    {lead:'Test your layout digitally first.', body:'Drag and drop tables, check room flow, and map out guest placements stress-free.', link:{page:'seating', label:'Open the floorplan builder'}},
    {lead:'Order extra escort cards.', body:'Always print 10% extra blank place cards for last-minute seating swaps or spelling fixes during wedding week.'}
  ]},
  {icon:'heart', title:'Planning Small & Intimate Weddings', tagline:'Less stress, more meaning, and a celebration that actually feels like you.', tips:[
    {lead:'Be ruthless with your guest list.', body:'Only invite people who are actively part of your life right now. If you haven’t spoken in the last year, they don’t need a seat at a 30-person dinner.'},
    {lead:'Upgrade the guest experience.', body:'With fewer heads to feed, reallocate your budget toward a multi-course dining experience, elevated wines, or custom welcome notes at every place setting.'},
    {lead:'Seat everyone at one long table.', body:'Ditch separated banquet rounds for a single feasting table so every guest feels included in the same conversation and atmosphere.'},
    {lead:'Keep planning simple (and free).', body:'You don’t need bulky enterprise software for an intimate guest list — manage up to 80 guests, your budget, RSVPs, and timeline completely free.', link:{page:'dashboard', label:'Open your Dashboard'}},
    {lead:'Rethink traditional timelines.', body:'Skip the formal bouquet toss, cake cutting, or rigid speeches if they feel awkward in a small room — let the night flow like an unforgettable dinner party.'}
  ]},
  {icon:'budget', title:'Budget & Hidden Fee Prevention', tagline:'Know the real price before you sign — and keep a buffer for surprises.', tips:[
    {lead:'Factor in service charges and GST.', body:'Always ask vendors whether their quoted price includes taxes, delivery fees, and setup surcharges before signing.'},
    {lead:'Budget for post-wedding costs.', body:'Set aside funds for dress dry-cleaning, bouquet preservation, thank-you cards, and marriage certificate fees.'},
    {lead:'Track deposits and due dates in one place.', body:'Avoid late-payment fees and missed instalments by logging every supplier invoice and payment milestone.', link:{page:'budget', label:'Open Budget'}},
    {lead:'Ask about corkage and cake-cutting fees.', body:'Bringing your own alcohol or external wedding cake often triggers per-head venue charges.'},
    {lead:'Keep a 10% emergency buffer.', body:'Unforeseen alterations, extra guest meals, or weather hires almost always pop up in the final month.'}
  ]},
  {icon:'vendors', title:'Vendor Research & Contract Red Flags', tagline:'Compare quotes, check the fine print, and keep every contract in one place.', tips:[
    {lead:'Compare at least three quotes per category.', body:'Reviewing multiple suppliers helps you understand fair market pricing and spot what is missing from basic packages.'},
    {lead:'Check cancellation and postponement clauses.', body:'Know exactly what happens to your deposit if you need to reschedule due to illness or extreme weather.'},
    {lead:'Store all quotes and contracts centrally.', body:'Keep vendor contacts, package notes, and signed PDFs organised in one dashboard instead of buried in emails.', link:{page:'vendors', label:'Open Vendors'}},
    {lead:'Ask who will actually work your wedding.', body:'For larger photography studios or bands, confirm whether the person you meet is the person showing up on the day.'},
    {lead:'Confirm public liability insurance.', body:'Most venues require external vendors like florists, DJs, and photo booths to hold current insurance certificates.'}
  ]},
  {icon:'clock', title:'Stress-Free Day-Of Timeline', tagline:'A run sheet that keeps your wedding day calm, on time and on track.', tips:[
    {lead:'Work backwards from sunset.', body:'Check the exact sunset time for your wedding date with your photographer so you never miss golden hour portraits.'},
    {lead:'Pad hair and makeup by 30 minutes.', body:'Morning prep is the #1 place timelines fall behind — finish getting ready earlier than you think you need to.'},
    {lead:'Share a master timeline with everyone.', body:'Build multiple timelines for your bridal party, vendors, and family — and export them cleanly.', link:{page:'timeline', label:'Open Timelines'}},
    {lead:'Schedule 10 minutes alone after the ceremony.', body:'Sneak away with your partner for a quiet drink and snack before diving into congratulations and family photos.'},
    {lead:'Keep speeches under 5 minutes each.', body:'Cap toasts and place them between courses so guests stay engaged and hot meals don’t go cold.'}
  ]},
  {icon:'website', title:'Website & Guest Communication', tagline:'Make sure guests know exactly what to expect, long before the day.', tips:[
    {lead:'Launch your website before sending invites.', body:'Give out-of-town guests plenty of notice to book flights, accommodation, and time off work.', link:{page:'website', label:'Open your Website'}},
    {lead:'Include clear dress code examples.', body:'Avoid vague terms — spell out what "smart casual" or "cocktail" means for footwear on grass or sand.'},
    {lead:'Password-protect your event details.', body:'Keep your venue address, schedule, and RSVP form private for invited guests only.'},
    {lead:'Add local transport and parking tips.', body:'Mention rideshare availability, shuttle bus pickup times, and overnight parking rules upfront.'},
    {lead:'Share your wishing well note politely.', body:'Use your website FAQ section to let guests know where gifts or wishing well contributions are welcome.'}
  ]},
  {icon:'moodboard', title:'Moodboard, Colour Palette & Styling Cohesion', tagline:'Keep your colours, flowers and styling looking beautifully cohesive.', tips:[
    {lead:'Pick 2 primary colours and 2 accents.', body:'Limiting your palette keeps florals, stationery, bridesmaids’ outfits, and table linens looking cohesive.'},
    {lead:'Match your styling to your venue.', body:'Work with the existing architecture and lighting of your space instead of spending thousands trying to hide it.'},
    {lead:'Save your inspo in one visual board.', body:'Collect colour swatches, floral ideas, and table styling references alongside your budget.', link:{page:'visionboard', label:'Open Vision Board'}},
    {lead:'Repurpose ceremony flowers at the reception.', body:'Move arbour arrangements and aisle meadows to the bridal table or bar area after the ceremony to double your budget.'},
    {lead:'Test your table lighting at night.', body:'Check how candles, fairy lights, or uplighting look after dark so your reception feels warm rather than dim.'}
  ]},
  {icon:'calendar', title:'Multi-Event Weekend Planning', tagline:'Plan the whole celebration without burning out you or your guests.', tips:[
    {lead:'Keep pre-wedding events optional.', body:'Make welcome drinks or recovery brunches casual drop-ins so travelling guests don’t feel over-scheduled.'},
    {lead:'Separate budgets for each celebration.', body:'Track engagement parties, rehearsal dinners, and day-after brunches individually so costs don’t blur together.'},
    {lead:'Manage multi-event RSVPs effortlessly.', body:'Invite specific guest groups to your rehearsal dinner or recovery brunch without cluttering your main list.', link:{page:'events', label:'Open Events'}},
    {lead:'Delegate hosting duties for pre-events.', body:'Let parents, siblings, or your bridal party coordinate the welcome drinks so you can rest before the big day.'},
    {lead:'Plan an easy morning-after recovery.', body:'Book a casual café or park picnic with simple catering so you can say goodbye to guests without hosting stress.'}
  ]},
  {icon:'gift', title:'Gifts, Wishing Well & Registry Etiquette', tagline:'Wishing well, registry and thank-yous — handled with grace.', tips:[
    {lead:'Offer both a wishing well and a small registry.', body:'Some traditional guests love buying a physical gift, while others prefer contributing to your honeymoon fund.'},
    {lead:'Secure your card box at the reception.', body:'Place your wishing well in a visible, high-traffic area near the bridal table — never right next to an unguarded exit.'},
    {lead:'Log gifts as you open them.', body:'Record who gave what and track which thank-you cards have been sent.', link:{page:'wishingwell', label:'Open Wishing Well'}},
    {lead:'Assign someone to take cards home.', body:'Ask a trusted parent or best man to lock your wishing well box in a car boot before the after-party starts.'},
    {lead:'Send thank-you notes within 3 months.', body:'Writing five cards a week together makes thanking everyone feel easy instead of overwhelming.'}
  ]},
  {icon:'couple', title:'Couple Planning for a Burnout-Free Wedding', tagline:'Plan as a team, stay connected, and protect your date nights.', tips:[
    {lead:'Create a shared wedding email address.', body:'Keep every supplier quote, invoice, and booking confirmation out of your personal work inboxes.'},
    {lead:'Divide tasks by personal strengths.', body:'Let the spreadsheet lover handle the budget while the visual thinker leads styling and stationery.'},
    {lead:'Sync your planning across both phones.', body:'Give both partners instant access to checklists, budgets, and guest updates anytime.'},
    {lead:'Hold a 30-minute weekly wedding meeting.', body:'Knock over admin tasks in one focused session each week instead of bringing up wedding stress every night.'},
    {lead:'Protect wedding-free date nights.', body:'Make a rule that wedding talk is off-limits during dinner dates so you stay connected as a couple.'}
  ]},
  {icon:'checklist', title:'Bridal Party & Family Management', tagline:'Give everyone a clear role and keep the drama low.', tips:[
    {lead:'Be transparent about bridal party costs.', body:'Tell bridesmaids and groomsmen upfront what outfits, hair, makeup, or travel expenses they are expected to cover.'},
    {lead:'Assign specific day-of roles early.', body:'Give each wedding party member one clear responsibility — like holding rings, wrangling family for photos, or checking vendor arrivals.'},
    {lead:'Keep bridal party tasks organised.', body:'Add attire fittings, hen’s/buck’s milestones, and rehearsal reminders straight into your shared checklist.', link:{page:'checklist', label:'Open Checklist'}},
    {lead:'Give family members a meaningful job.', body:'Ask parents or siblings to handle readings, cake transport, or guestbook setup so they feel included without micromanaging.'},
    {lead:'Send a morning-of info sheet.', body:'Text your bridal party exact arrival times, addresses, and emergency contact numbers two days before the wedding.'}
  ]},
  {icon:'countdown', title:'Final Month & Week-Of Countdown', tagline:'Your last-month checklist for a calm, prepared wedding week.', tips:[
    {lead:'Confirm final numbers 10 days out.', body:'Send your final guest count, dietary list, and seating chart to your venue and caterer before their cutoff.'},
    {lead:'Break in your wedding shoes indoors.', body:'Wear them around the house with thick socks and scuff the smooth soles so you don’t slip on the dance floor.'},
    {lead:'Export your master wedding binder.', body:'Print or save offline copies of your guest list, seating plan, vendor contacts, and timeline for your coordinator.'},
    {lead:'Pack an overnight and emergency kit.', body:'Include stain remover, safety pins, blister plasters, painkillers, phone chargers, and flat dancing shoes.'},
    {lead:'Hand over your phone on wedding morning.', body:'Put a bridesmaid or groomsman in charge of vendor calls so you can be 100% present from start to finish.'}
  ]}
];
let _tipsOpenCat=null;
let _tipsFocusTip=null;
// Set only inside the standalone public page (_showPublicTipsLibrary) — same data and
// HTML-builders as the signed-in app's Tips page, just routed to a different opener/closer
// so nothing here ever calls navigate() or touches STATE.
let _tipsPublicMode=false;
function renderTips(c,actions){
  actions.innerHTML='';
  if(_tipsOpenCat==null){
    c.innerHTML=_tipsGridHtml();
    return;
  }
  c.innerHTML=_tipsDetailHtml(_tipsOpenCat);
  if(_tipsFocusTip!=null){
    const cat=_tipsOpenCat, idx=_tipsFocusTip;
    _tipsFocusTip=null;
    setTimeout(()=>{
      const row=document.getElementById('tip-row-'+cat+'-'+idx);
      if(!row) return;
      row.scrollIntoView({behavior:'smooth',block:'center'});
      row.classList.add('tip-row-hit');
      setTimeout(()=>row.classList.remove('tip-row-hit'),1800);
    },50);
  }
}
function _tipsGridHtml(){
  const rows=TIPS_LIBRARY.map((cat,i)=>`
    <button class="tip-ed-row" onclick="${_tipsPublicMode?`_pubTipsOpen(${i})`:`_tipsOpen(${i})`}">
      <span class="tip-ed-media">
        <img src="/assets/tips/${cat.icon}.jpg" alt="" loading="lazy" onerror="this.style.display='none'" onload="this.nextElementSibling.style.display='none'">
        <span class="tip-ed-icon-fallback"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${TIPS_ICONS[cat.icon]}</svg></span>
      </span>
      <span class="tip-ed-content">
        <span class="tip-ed-num">${String(i+1).padStart(2,'0')} — ${cat.tips.length} TIPS</span>
        <span class="tip-ed-title">${_escHtml(cat.title)}</span>
        <span class="tip-ed-tagline">${_escHtml(cat.tagline)}</span>
        <span class="tip-ed-meta">Explore tips <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
      </span>
    </button>`).join('');
  return `
  <div class="tip-search-wrap">
    <svg class="tip-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input type="text" id="tips-search" placeholder="Search tips — budget, seating, timeline…" oninput="_tipsSearch(this.value)">
  </div>
  <div id="tips-search-results"></div>
  <div id="tips-ed-rows" class="tip-ed-list">${rows}</div>`;
}
function _tipsSearch(q){
  const query=(q||'').trim().toLowerCase();
  const resultsEl=document.getElementById('tips-search-results');
  const rowsEl=document.getElementById('tips-ed-rows');
  if(!resultsEl||!rowsEl) return;
  if(!query){ resultsEl.style.display='none'; resultsEl.innerHTML=''; rowsEl.style.display=''; return; }
  const hits=[];
  TIPS_LIBRARY.forEach((cat,ci)=>{
    cat.tips.forEach((t,ti)=>{
      if(t.lead.toLowerCase().includes(query)||t.body.toLowerCase().includes(query)||cat.title.toLowerCase().includes(query)) hits.push({ci,ti,cat,t});
    });
  });
  rowsEl.style.display='none';
  resultsEl.style.display='';
  if(!hits.length){ resultsEl.innerHTML=`<div class="tip-search-empty">No tips match "${_escHtml(q)}".</div>`; return; }
  resultsEl.innerHTML=hits.map(h=>`
    <div class="tip-row tip-search-hit" onclick="${_tipsPublicMode?`_pubTipsOpen(${h.ci},${h.ti})`:`_tipsOpen(${h.ci},${h.ti})`}">
      <span class="tip-row-num">${h.ti+1}</span>
      <div class="tip-row-body">
        <span class="tip-search-cat">${_escHtml(h.cat.title)}</span>
        <div class="tip-row-lead">${_escHtml(h.t.lead)}</div>
        <div class="tip-row-text">${_escHtml(h.t.body)}</div>
      </div>
    </div>`).join('');
}
function _tipsDetailHtml(i){
  const cat=TIPS_LIBRARY[i]; if(!cat) return '';
  const rows=cat.tips.map((t,ti)=>`
    <div class="tip-row" id="tip-row-${i}-${ti}">
      <span class="tip-row-num">${ti+1}</span>
      <div class="tip-row-body">
        <div class="tip-row-lead">${_escHtml(t.lead)}</div>
        <div class="tip-row-text">${_escHtml(t.body)}</div>
        ${t.link?`<button class="tip-row-link" onclick="${_tipsPublicMode?`window.location.href='https://unionvault.app/'`:`navigate('${t.link.page}')`}">${_escHtml(t.link.label)} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>`:''}
      </div>
    </div>`).join('');
  return `
  <button class="tip-back" onclick="${_tipsPublicMode?'_pubTipsOpen(null)':'_tipsOpen(null)'}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> All topics</button>
  <div class="tip-detail-hd">
    <span class="tip-cat-icon tip-cat-icon-lg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${TIPS_ICONS[cat.icon]}</svg></span>
    <div>
      <div class="section-title" style="margin-bottom:2px">${_escHtml(cat.title)}</div>
      <div class="section-body" style="margin-bottom:0">${_escHtml(cat.tagline)}</div>
    </div>
  </div>
  <div class="tip-row-list">${rows}</div>
  ${i<TIPS_LIBRARY.length-1?`<button class="tip-next" onclick="${_tipsPublicMode?`_pubTipsOpen(${i+1})`:`_tipsOpen(${i+1})`}">Next: ${_escHtml(TIPS_LIBRARY[i+1].title)} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>`:''}`;
}
function _tipsOpen(i,focusTipIdx){
  _tipsOpenCat=i;
  _tipsFocusTip=(typeof focusTipIdx==='number')?focusTipIdx:null;
  const c=document.getElementById('main-content');
  if(c){ c.scrollTop=0; }
  navigate('tips');
}

// ── Standalone public page: no app shell, reached via the #library hash (see js/init.js).
// Content (TIPS_LIBRARY, _tipsDetailHtml) is still single-sourced with the signed-in app's
// Tips page — only the grid/home view gets its own marketing-page layout (_pubLibraryGridHtml),
// since the signed-in app's plain utility list (_tipsGridHtml) isn't meant for this funnel.
// Gated behind a free account: _showPublicTipsLibrary() shows the signup gate when there's
// no session, or the unlocked library once there is one.
let _pubTipsOpenCat=null;
let _pubTipsFocusTip=null;
let _pubTipsJustUnlocked=false; // one-time "you're in!" banner right after signup/sign-in

// One hero photo per day of the week so the owner can swap tomorrow's photo any time
// without touching code — see assets/hero/ (hero-01.jpg=Monday … hero-07.jpg=Sunday).
function _pubHeroImage(){
  const day=new Date().getDay(); // 0=Sun..6=Sat
  const idx=((day+6)%7)+1; // Mon=1..Sun=7
  return `/assets/hero/hero-${String(idx).padStart(2,'0')}.jpg`;
}

function _showPublicTipsLibrary(){
  document.body.style.visibility='hidden';
  document.body.style.background='var(--cream,#FBF8F3)';
  _tipsPublicMode=true;
  _pubTipsOpenCat=null;
  if(_sbSession) _renderUnlockedLibrary(); else _renderLibraryGate();
  document.body.style.visibility='visible';
}

function _pubTipsOpen(i,focusTipIdx){
  _pubTipsOpenCat=i;
  _pubTipsFocusTip=(typeof focusTipIdx==='number')?focusTipIdx:null;
  _renderUnlockedLibrary();
  window.scrollTo(0,0);
}

function _pubLibraryLogoHtml(cls){
  return `<img class="${cls}" src="${window.location.origin}/logos/Black%20logo%20(Light%20mode).png" alt="Union Vault">`;
}

// ── Gate: hero + locked preview + founder story + real signup/sign-in form ─────────────
function _renderLibraryGate(){
  _publicPageShell(`
    <div class="pub-hero">
      <img class="pub-hero-bg" src="${_pubHeroImage()}" alt=""/>
      <div class="pub-hero-inner">
        <img class="pub-hero-crest" src="${window.location.origin}/logos/White%20text%20(Dark%20mode).png" alt="Union Vault">
        <div class="pub-hero-title">Your Free Wedding Tips Library Is Ready</div>
        <div class="pub-hero-sub">65 practical, no-fluff tips from real weddings — budget, guests, vendors, timelines and more. Create a free account to unlock them all.</div>
        <a class="pub-hero-cta" href="#pub-gate-form">Create free account ↓</a>
      </div>
    </div>
    <div class="pub-gate-wrap">
      <div class="pub-gate-preview">
        <div class="pub-gate-chip"><img src="/assets/tips/guests.jpg" alt=""/><div class="pub-gate-lock"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div></div>
        <div class="pub-gate-chip"><img src="/assets/tips/budget.jpg" alt=""/><div class="pub-gate-lock"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div></div>
        <div class="pub-gate-chip"><img src="/assets/tips/moodboard.jpg" alt=""/><div class="pub-gate-lock"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div></div>
      </div>
      <div class="pub-gate-preview-note">13 topics waiting inside →</div>

      <div class="pub-founder-note">
        <div class="pub-founder-eyebrow"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${TIPS_ICONS.heart}</svg> Why we built this</div>
        <div class="pub-founder-line">"Built by a bride, for brides — created from real wedding-planning experience. We built the tool we wished existed, and we've kept improving it since."</div>
      </div>

      <div class="pub-gate-form-card" id="pub-gate-form">
        <div class="tabs">
          <button class="tab active" onclick="switchTab(this,'create')">Create account</button>
          <button class="tab" onclick="switchTab(this,'sign-in')">Sign in</button>
        </div>
        <div id="create">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" id="auth-up-email" placeholder="you@email.com" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="pw-wrap">
              <input class="form-input" type="password" id="auth-up-pw" placeholder="Choose a password" autocomplete="new-password">
              <button class="pw-toggle" tabindex="-1" onclick="togglePw('auth-up-pw',this)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            </div>
          </div>
          <div id="lp-up-err" style="display:none;font-size:12px;color:#c0392b;margin-bottom:8px;padding:8px 10px;background:rgba(192,57,43,0.08);border-radius:6px"></div>
          <button class="btn-gold" id="lp-up-btn" onclick="_lpSignUp()">Create free account</button>
          <div class="trust-row">
            <span>✓ Free to start, no card required</span>
            <span>✓ Private by design</span>
          </div>
          <div class="auth-links">
            <div class="auth-legal">By creating an account you agree to our <a href="https://unionvault.app/#terms" target="_blank" rel="noopener">Terms &amp; Privacy</a></div>
            <div class="auth-disclosure">You'll also get occasional planning tips and offers by email — unsubscribe anytime.</div>
          </div>
        </div>
        <div id="sign-in" style="display:none">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" id="auth-in-email" placeholder="you@email.com" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="pw-wrap">
              <input class="form-input" type="password" id="auth-in-pw" placeholder="Your password" autocomplete="current-password">
              <button class="pw-toggle" tabindex="-1" onclick="togglePw('auth-in-pw',this)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            </div>
          </div>
          <div id="lp-in-err" style="display:none;font-size:12px;color:#c0392b;margin-bottom:8px;padding:8px 10px;background:rgba(192,57,43,0.08);border-radius:6px"></div>
          <div id="lp-in-ok" style="display:none;font-size:12px;color:#27ae60;margin-bottom:8px;padding:8px 10px;background:rgba(39,174,96,0.08);border-radius:6px"></div>
          <button class="btn-gold" id="lp-in-btn" onclick="_pubLibrarySignIn()">Sign in</button>
          <div class="auth-links">
            <button id="lp-forgot-btn" onclick="_lpForgotPassword()" style="background:none;border:none;font-size:12px;color:var(--gold-deep,#b8923a);cursor:pointer;padding:0;font-family:inherit;text-decoration:underline;margin-top:6px">Forgot password?</button>
          </div>
        </div>
      </div>
    </div>
    <div class="pub-tips-brand"><a href="https://unionvault.app/" target="_blank" rel="noopener">Wedding Tips Library by Union Vault — unionvault.app</a></div>`);
}

// Minimal sign-in for the gate — can't reuse the main app's _lpSignIn() since that one
// assumes the full app shell exists (#welcome-overlay, navigate(), etc.), which this
// standalone page has replaced entirely.
async function _pubLibrarySignIn(){
  const email=(document.getElementById('auth-in-email').value||'').trim();
  const pw=document.getElementById('auth-in-pw').value||'';
  const errEl=document.getElementById('lp-in-err');
  const btn=document.getElementById('lp-in-btn');
  errEl.style.display='none';
  if(!email||!pw){ errEl.textContent='Please enter your email and password.'; errEl.style.display=''; return; }
  btn.disabled=true; btn.textContent='Signing in…';
  let r;
  try{ r=await _sbSignIn(email,pw); }
  catch(e){
    btn.disabled=false; btn.textContent='Sign in';
    errEl.textContent='Connection error — please check your connection and try again.';
    errEl.style.display=''; return;
  }
  btn.disabled=false; btn.textContent='Sign in';
  if(!r.ok){ errEl.textContent=r.error; errEl.style.display=''; return; }
  // Same cross-account guard as the main app's sign-in: don't trust local data left by
  // a different account on a shared device.
  if(alreadySetUp){
    let storedUID=null; try{ storedUID=localStorage.getItem('uv_uid'); }catch(_){}
    if(storedUID!==r.user.id){
      try{ localStorage.removeItem(STORAGE_KEY); }catch(_){}
      try{ localStorage.setItem('uv_uid',r.user.id); }catch(_){}
      window._uvWipeInProgress=true;
      location.reload();
      return;
    }
  }
  try{ localStorage.setItem('uv_uid',r.user.id); }catch(_){}
  _pubTipsJustUnlocked=true;
  _renderUnlockedLibrary();
}

// ── Unlocked: welcome banner + wizard nudge + trust strip + the tip library itself ─────
function _renderUnlockedLibrary(){
  const justUnlocked=_pubTipsJustUnlocked;
  _pubTipsJustUnlocked=false;
  const atHome=_pubTipsOpenCat==null;
  const inner=atHome?_pubLibraryGridHtml():_tipsDetailHtml(_pubTipsOpenCat);
  _publicPageShell(`
    <div class="pub-lib-minihead">
      <a href="#library" onclick="_pubTipsOpen(null);return false;"><img class="pub-lib-mini-crest" src="${window.location.origin}/logos/Black%20text%20(Light%20mode).png" alt="Union Vault"></a>
      <div class="pub-lib-mini-wordmark">Wedding Tips Library</div>
    </div>
    ${atHome?`
    ${justUnlocked?`<div class="pub-welcome-banner"><div class="pub-welcome-pill">🎉 You're in — your Wedding Tips Library is fully unlocked.</div></div>`:''}
    <div class="pub-wizard-cta">
      <div class="pub-wizard-cta-inner">
        <div class="pub-wizard-cta-txt">
          <div class="pub-wizard-cta-eyebrow">Ready for more?</div>
          <div class="pub-wizard-cta-title">Turn these tips into your actual plan</div>
          <div class="pub-wizard-cta-sub">Jump into the Setup Wizard — guest list, budget, vendors and your timeline, tailored to your wedding in under 2 minutes.</div>
        </div>
        <div class="pub-wizard-cta-actions">
          <a class="pub-wizard-cta-btn" href="/">Start Setup Wizard →</a>
        </div>
      </div>
    </div>
    <div class="pub-lib-trust-strip">
      <div class="pub-lib-trust-item"><div class="pub-lib-trust-num">By a Bride</div><div class="pub-lib-trust-lbl">For Brides</div></div>
      <div class="pub-lib-trust-item"><div class="pub-lib-trust-num">65+</div><div class="pub-lib-trust-lbl">Wedding Tips</div></div>
      <div class="pub-lib-trust-item"><div class="pub-lib-trust-num">13</div><div class="pub-lib-trust-lbl">Topics Covered</div></div>
      <div class="pub-lib-trust-item"><div class="pub-lib-trust-num">Private</div><div class="pub-lib-trust-lbl">By Design</div></div>
    </div>
    <div class="pub-lib-section-head">
      <div class="pub-lib-section-eyebrow">Browse by topic</div>
      <div class="pub-lib-section-title">Everything you need, sorted</div>
      <div class="pub-lib-section-sub">Short, practical ideas from real weddings — tap a topic or search for what you need.</div>
    </div>`:''}
    <div class="pub-lib-body">${inner}</div>
    <div class="pub-tips-brand"><a href="https://unionvault.app/" target="_blank" rel="noopener">Wedding Tips Library by Union Vault — unionvault.app</a></div>`);
  if(_pubTipsOpenCat!=null && _pubTipsFocusTip!=null){
    const cat=_pubTipsOpenCat, idx=_pubTipsFocusTip;
    _pubTipsFocusTip=null;
    setTimeout(()=>{
      const row=document.getElementById('tip-row-'+cat+'-'+idx);
      if(!row) return;
      row.scrollIntoView({behavior:'smooth',block:'center'});
      row.classList.add('tip-row-hit');
      setTimeout(()=>row.classList.remove('tip-row-hit'),1800);
    },50);
  }
}

// Marketing-page grid for the unlocked home — same TIPS_LIBRARY data as the signed-in
// app's Tips page, different (photo-card) presentation. The search bar/results reuse the
// exact ids _tipsSearch() already targets, so that shared function needs no changes.
function _pubLibraryGridHtml(){
  const cards=TIPS_LIBRARY.map((cat,i)=>`
    <button class="pub-lib-card" onclick="_pubTipsOpen(${i})">
      <span class="pub-lib-card-img-wrap">
        <img src="/assets/tips/${cat.icon}.jpg" alt="" loading="lazy" onerror="this.style.display='none'" onload="this.nextElementSibling.style.display='none'">
        <span class="pub-lib-card-icon-fallback"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${TIPS_ICONS[cat.icon]}</svg></span>
        <span class="pub-lib-card-count">${cat.tips.length} tips</span>
      </span>
      <span class="pub-lib-card-body">
        <span class="pub-lib-card-title">${_escHtml(cat.title)}</span>
        <span class="pub-lib-card-sub">${_escHtml(cat.tagline)}</span>
        <span class="pub-lib-card-link">Explore tips <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
      </span>
    </button>`).join('');
  return `
  <div class="tip-search-wrap">
    <svg class="tip-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input type="text" id="tips-search" placeholder="Search tips — budget, seating, timeline…" oninput="_tipsSearch(this.value)">
  </div>
  <div id="tips-search-results"></div>
  <div id="tips-ed-rows" class="pub-lib-grid">${cards}</div>`;
}
