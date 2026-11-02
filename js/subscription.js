// SUBSCRIPTION & FEATURE GATING
// ═══════════════════════════════════════
// Client-side tier state, upgrade modal, and Stripe checkout integration.
// Depends on: supabase.js (_SB_URL, _SB_KEY, _sbAuthHdr, _sbSession, _sbOnAuthChange, _sbEnsureFreshToken)

let _uvTier = 'free';
let _uvTrialDaysLeft = 0;
let _uvSubLoaded = false;
let _uvSubDetails = null;
let _uvSelectedSettingsMonths = 1;

// ── Feature map ─────────────────────────────────────────────────────────────
const _UV_PAID_PAGES = new Set(['seating','calendar','events','inspo','visionboard','wishingwell']);

const _UV_PAID_FEATURES = new Set([
  'mealChoices','childrenMeal','highChair','dietary',
  'budgetSubItems','budgetDocs','budgetPayments','perHead','perItem',
  'printExport','brandOff','unlimitedGuests',
]);

const _UV_FEATURE_LABELS = {
  seating:'Seating Plan', calendar:'Calendar', events:'Multi-Event Planning',
  inspo:'Inspiration', visionboard:'Vision Board', wishingwell:'Wishing Well',
  mealChoices:'Meal Choices', childrenMeal:"Children's Meals", highChair:'High-Chair Tracking',
  dietary:'Dietary Requirements', budgetSubItems:'Budget Sub-Items',
  budgetDocs:'Budget Documents', budgetPayments:'Payment Plans',
  perHead:'Per-Head Pricing', perItem:'Per-Item Pricing',
  printExport:'Print & Export', brandOff:'Remove Union Vault Badge',
  unlimitedGuests:'Unlimited Guests',
};

function _uvIsPaid(){ return _uvTier === 'full' || _uvTier === 'trial'; }
function _uvIsFree(){ return _uvTier === 'free'; }

function _uvGuestLimitReached(){
  return !_uvIsPaid() && _sbSession && STATE.guests && STATE.guests.length >= 50;
}

function _uvRequirePaid(feature){
  if(_uvIsPaid()) return true;
  if(!_sbSession) return true; // offline users aren't gated
  _uvShowUpgradeModal(feature);
  return false;
}

// ── Load subscription state from Supabase ───────────────────────────────────

const _uvAdminBypass = new URLSearchParams(location.search).get('bypass') === 'uvadmin';

async function _uvLoadSubscription(){
  if(_uvAdminBypass){ _uvTier='full'; _uvTrialDaysLeft=0; _uvSubLoaded=true; _uvSubDetails={tier:'full',subStatus:'active'}; _uvUpdateSidebarLocks(); return; }
  if(!_sbSession){ _uvTier='free'; _uvTrialDaysLeft=0; _uvSubLoaded=true; return; }

  // Check sessionStorage cache (5 min TTL)
  try{
    const cached = sessionStorage.getItem('uv_sub');
    if(cached){
      const c = JSON.parse(cached);
      if(c._ts && Date.now() - c._ts < 300000){
        _applySubData(c);
        return;
      }
    }
  }catch(_){}

  await _sbEnsureFreshToken();
  try{
    const r = await fetch(_SB_URL+'/rest/v1/rpc/get_my_subscription',{
      method:'POST',
      headers:{'apikey':_SB_KEY,'Authorization':_sbAuthHdr(),'Content-Type':'application/json'},
      body:'{}',
    });
    if(r.ok){
      const data = await r.json();
      data._ts = Date.now();
      try{ sessionStorage.setItem('uv_sub', JSON.stringify(data)); }catch(_){}
      _applySubData(data);
    } else {
      _uvTier='free'; _uvSubLoaded=true;
    }
  }catch(e){
    console.warn('[UV sub] fetch failed', e);
    _uvTier='free'; _uvSubLoaded=true;
  }
}

function _applySubData(d){
  _uvTier = d.tier || 'free';
  _uvTrialDaysLeft = d.trialDaysLeft || 0;
  _uvSubDetails = d;
  _uvSubLoaded = true;
  _uvUpdateSidebarLocks();
}

function _uvInvalidateCache(){
  try{ sessionStorage.removeItem('uv_sub'); }catch(_){}
}

// Re-load when auth state changes
_sbOnAuthChange(function(user){
  _uvInvalidateCache();
  if(user) _uvLoadSubscription();
  else { _uvTier='free'; _uvTrialDaysLeft=0; _uvSubLoaded=true; _uvSubDetails=null; }
});

// ── Sidebar lock icons ──────────────────────────────────────────────────────

function _uvUpdateSidebarLocks(){
  document.querySelectorAll('[data-nav]').forEach(function(btn){
    const page = btn.getAttribute('data-nav');
    if(_UV_PAID_PAGES.has(page)){
      const locked = _sbSession && !_uvIsPaid();
      btn.classList.toggle('nav-locked', locked);
    }
  });
}

// ── Upgrade modal ───────────────────────────────────────────────────────────

function _uvShowUpgradeModal(feature){
  const existing = document.getElementById('uv-upgrade-overlay');
  if(existing) existing.remove();

  const label = _UV_FEATURE_LABELS[feature] || feature || 'Full Access';
  const isTrialEligible = !_uvSubDetails?.subStatus;

  const overlay = document.createElement('div');
  overlay.id = 'uv-upgrade-overlay';
  overlay.className = 'uv-upgrade-overlay';
  overlay.innerHTML = `
    <div class="uv-upgrade-card">
      <button class="uv-upgrade-close" onclick="this.closest('.uv-upgrade-overlay').remove()">&times;</button>
      <div class="uv-upgrade-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold,#B8965A)" stroke-width="1.5">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
      </div>
      <div class="uv-upgrade-title">Unlock ${_escH(label)}</div>
      <div class="uv-upgrade-sub">This feature is available with Full Access.${
        isTrialEligible ? ' Start your 14-day free trial — no payment required upfront.' : ''
      }</div>
      <div class="uv-upgrade-feats">
        <div class="uv-upgrade-feat">&#10003; Unlimited guests with dietary &amp; meal tracking</div>
        <div class="uv-upgrade-feat">&#10003; Seating plan, calendar &amp; multi-event planning</div>
        <div class="uv-upgrade-feat">&#10003; Full budget with documents &amp; payment plans</div>
        <div class="uv-upgrade-feat">&#10003; Vision board, wishing well &amp; inspiration</div>
        <div class="uv-upgrade-feat">&#10003; Print &amp; export everything</div>
        <div class="uv-upgrade-feat">&#10003; Remove Union Vault branding</div>
      </div>
      <button class="uv-upgrade-cta" onclick="this.closest('.uv-upgrade-overlay').remove();_uvOpenSubPage()">${
        isTrialEligible ? 'Get full access - Start 14-day free trial' : 'Upgrade to Full Access'
      }</button>
      <button class="uv-upgrade-dismiss" onclick="this.closest('.uv-upgrade-overlay').remove()">Continue with free limited access plan</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function _escH(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Checkout redirect ───────────────────────────────────────────────────────

async function _uvGoCheckout(priceId){
  const pid = priceId || _uvGetDefaultPriceId();
  if(!pid){
    _uvOpenSubPage();
    return;
  }

  const plan = _uvPlanByPrice(pid);
  const planLabel = plan ? plan.label + ' of Full Access — Union Vault' : 'Full Access — Union Vault';

  try{
    await _sbEnsureFreshToken();
    const r = await fetch(_SB_URL+'/functions/v1/create-checkout-session',{
      method:'POST',
      headers:{'Authorization':_sbAuthHdr(),'apikey':_SB_KEY,'Content-Type':'application/json'},
      body: JSON.stringify({priceId: pid, planLabel: planLabel}),
    });
    const data = await r.json();
    if(data.url) window.location.href = data.url;
    else _cloudToast(data.error || 'Could not start checkout — please try again.', true);
  }catch(e){
    console.error('Checkout error:', e);
    _cloudToast('Could not connect — please try again.', true);
  }
}

function _uvGetDefaultPriceId(){
  return _UV_PLANS[0]?.priceId || '';
}

// ── Plan definitions ───────────────────────────────────────────────────────
// Each plan: { months, label, priceId, monthly (AUD cents), discount }
// Price IDs are filled once Stripe products are created.
const _UV_PLANS = [
  { months:1,  label:'Monthly',     short:'1 mo',  priceId:'price_1UX9FTBK4MlrXpHgK17oYLx5', monthly:1299, discount:0 },
  { months:3,  label:'3 months',    short:'3 mo',  priceId:'price_1UX9FTBK4MlrXpHg1FirJDO2', monthly:1039, discount:20 },
  { months:6,  label:'6 months',    short:'6 mo',  priceId:'price_1UX9FTBK4MlrXpHgk8QJRQyv', monthly:909,  discount:30 },
  { months:12, label:'12 months',   short:'12 mo', priceId:'price_1UX9FTBK4MlrXpHgL8ZGtiFA', monthly:650,  discount:50 },
];

function _uvPlanByPrice(priceId){
  if(!priceId) return null;
  return _UV_PLANS.find(p=>p.priceId && p.priceId===priceId) || null;
}

function _uvCurrentPlan(){
  if(!_uvSubDetails || !_uvSubDetails.priceId) return null;
  return _uvPlanByPrice(_uvSubDetails.priceId);
}

function _uvFormatMoney(cents){
  if(!cents) return '—';
  return '$'+(cents/100).toFixed(cents%100?2:0);
}

// ── Subscription page (opened from Account & Cloud button) ────────────────

async function _uvOpenSubPage(){
  _uvInvalidateCache();
  await _uvLoadSubscription();
  const c=document.getElementById('main-content');
  if(!c) return;
  const d=_uvSubDetails;
  const plan=_uvCurrentPlan();
  const isFull=_uvTier==='full';
  const isTrial=_uvTier==='trial';
  const isFree=!isFull&&!isTrial;

  const isGranted=d&&d.grantedAccess;
  let statusHtml='';
  if(isGranted){
    const grantEnd=d.grantedUntil?new Date(d.grantedUntil).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}):'';
    statusHtml=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:var(--ink)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green,#3D9454)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Full Access</span>
      <span style="font-size:12px;color:var(--gold-deep);background:rgba(196,168,130,.15);padding:2px 8px;border-radius:6px;font-weight:600">Beta Access</span>
    </div>
    <div style="font-size:12px;color:var(--muted)">All features unlocked.${grantEnd?' Access until '+grantEnd+'.':''}</div>`;
  } else if(isFull){
    const planLabel=plan?plan.label:'Full Access';
    const periodEnd=d&&d.currentPeriodEnd?new Date(d.currentPeriodEnd).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}):'';
    const monthlyStr=plan&&plan.monthly?_uvFormatMoney(plan.monthly)+'/mo':'';
    statusHtml=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:var(--ink)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green,#3D9454)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Full Access</span>
      <span style="font-size:12px;color:var(--gold-deep);background:rgba(196,168,130,.15);padding:2px 8px;border-radius:6px;font-weight:600">${_escH(planLabel)}</span>
      ${!d?.cancelAtPeriodEnd?'<button class="btn btn-sm btn-outline" onclick="_uvOpenPortal()" style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:5px 10px;font-size:11px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>Manage billing</button>':''}
    </div>
    <div style="font-size:12px;color:var(--muted)">${monthlyStr?monthlyStr+' · ':''}${periodEnd?'Renews '+periodEnd:''}</div>`;
  } else if(isTrial){
    const daysLeft=_uvTrialDaysLeft||0;
    statusHtml=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:var(--ink)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold,#B8965A)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Free Trial</span>
      <span style="font-size:12px;color:var(--gold-deep);background:rgba(196,168,130,.15);padding:2px 8px;border-radius:6px;font-weight:600">${daysLeft} day${daysLeft===1?'':'s'} left</span>
    </div>
    <div style="font-size:12px;color:var(--muted)">All features unlocked during your trial.</div>`;
  } else {
    statusHtml=`<div style="display:flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:var(--ink);margin-bottom:4px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Free Tier</div>
    <div style="font-size:12px;color:var(--muted)">Upgrade for unlimited guests, seating plans, print &amp; more.</div>`;
  }

  let cancelBanner='';
  if(d&&d.cancelAtPeriodEnd){
    const endDate=d.currentPeriodEnd?new Date(d.currentPeriodEnd).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}):'the end of your billing period';
    cancelBanner=`<div style="font-size:12.5px;color:var(--red);padding:10px 14px;background:rgba(192,57,43,.06);border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px"><span>Your subscription ends ${_escH(endDate)}.</span><button class="btn btn-sm btn-outline" onclick="_uvReactivateSub().then(function(){_uvOpenSubPage()})">Reactivate</button></div>`;
  }

  const showPlans=!isGranted&&(isFree||isTrial||(isFull&&!d?.cancelAtPeriodEnd));
  let plansHtml='';
  if(showPlans){
    const currentMonths=plan?plan.months:0;
    const monthly=_UV_PLANS.find(p=>p.months===1);
    const longer=_UV_PLANS.filter(p=>p.months>1);
    const _pc=function(p){
      const isCur=isFull&&currentMonths===p.months;
      const isSel=!isFull&&_uvSelectedSettingsMonths===p.months;
      const isPopular=!isFull&&p.months===12;
      const border=isCur||isSel?'var(--gold)':isPopular?'var(--gold)':'var(--border)';
      const bg=isCur||isSel?'rgba(196,168,130,.12)':isPopular?'rgba(196,168,130,.05)':'transparent';
      const ms=p.monthly?_uvFormatMoney(p.monthly)+'/mo':'';
      const ts=p.monthly&&p.months>1?_uvFormatMoney(p.monthly*p.months):'';
      return `<div data-plan-months="${p.months}" style="border:1.5px solid ${border};background:${bg};border-radius:10px;padding:12px;cursor:${isCur?'default':'pointer'};transition:all .15s;position:relative"
        ${isCur?'':`onclick="_uvSelectSettingsPlan(${p.months})" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='${isSel?'var(--gold)':'var(--border)'}'" `}>
        ${isCur?'<div style="position:absolute;top:-8px;right:8px;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gold-deep);background:var(--cream);padding:0 6px">Current</div>':''}
        ${isSel&&!isCur?'<div style="position:absolute;top:-8px;right:8px;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gold-deep);background:var(--cream);padding:0 6px">Selected</div>':''}
        ${isPopular&&!isCur&&!isSel?'<div style="position:absolute;top:-8px;right:8px;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gold-deep);background:var(--cream);padding:0 6px">Popular</div>':''}
        ${p.discount?`<div style="font-size:10px;font-weight:700;color:var(--green,#3D9454);margin-bottom:4px">Save ${p.discount}%</div>`:''}
        <div style="font-size:13px;font-weight:600;color:var(--ink)">${_escH(p.label)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${ms||'Price TBC'}</div>
        ${p.months>1&&ts?`<div style="font-size:11px;color:var(--muted);margin-top:1px">${ts} total</div>`:''}
      </div>`;
    };
    plansHtml=`<div style="margin-top:4px">
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="font-size:12px;font-weight:600;color:var(--muted);letter-spacing:.06em;text-transform:uppercase">Month-to-month flexibility</div>
        ${monthly?_pc(monthly):''}
        <div style="font-size:12px;font-weight:600;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-top:12px">Upfront multi-month packages</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${longer.map(_pc).join('')}
        </div>
      </div>
    </div>`;
  }

  let actionsHtml='';
  if(isGranted){
    actionsHtml='';
  } else if(isFull&&!d?.cancelAtPeriodEnd){
    actionsHtml='';
  } else if(isFree||isTrial){
    var selPlan=_UV_PLANS.find(function(p){return p.months===_uvSelectedSettingsMonths;})||_UV_PLANS[0];
    var selMs=selPlan&&selPlan.monthly?_uvFormatMoney(selPlan.monthly)+'/mo':'';
    actionsHtml=`<div style="margin-top:8px"><button class="btn btn-primary" onclick="_uvGoCheckout((_UV_PLANS.find(function(p){return p.months===_uvSelectedSettingsMonths;})||_UV_PLANS[0]).priceId)" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;font-size:14px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>Upgrade — ${_escH(selPlan.label)}${selMs?' ('+selMs+')':''}</button></div>`;
  }

  const te=document.getElementById('topbar-title');
  if(te) te.textContent='Subscription';
  const eb=document.getElementById('topbar-eyebrow');
  if(eb) eb.textContent='Account';
  const actions=document.getElementById('topbar-actions');
  if(actions) actions.innerHTML='';

  c.innerHTML=`<div class="card settings-card layout-cards" style="display:flex;flex-direction:column;gap:8px;max-width:520px">
    <button onclick="navigate('settings')" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--gold-deep);background:none;border:none;cursor:pointer;font-family:inherit;font-weight:500;padding:0;margin-bottom:8px;align-self:flex-start">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Back to Settings
    </button>
    <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:500;margin-bottom:8px;padding-bottom:10px;border-bottom:1px solid var(--border)">Subscription</div>
    <div style="padding:16px;background:var(--surface);border:.5px solid var(--border);border-radius:12px;margin-bottom:8px">${statusHtml}</div>
    ${cancelBanner}
    ${plansHtml}
    ${actionsHtml}
    ${!isGranted?`<div style="display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      ${isFree||isTrial?'<div style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:5px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--green,#3D9454)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Cancel anytime on month-to-month plans. Save up to 50% on upfront terms.</div>':''}
      <div style="font-size:11px;color:var(--muted)"><a href="#" onclick="event.preventDefault();_openTermsModal()" style="color:var(--gold-deep);text-decoration:none">Terms &amp; Privacy</a></div>
    </div>`:''}
  </div>`;
  c.scrollTop=0;
}

function _uvSelectSettingsPlan(months){
  const plan=_UV_PLANS.find(p=>p.months===months);
  if(!plan) return;
  if(_uvTier==='full'){
    if(plan.priceId) _uvOpenPortal();
    return;
  }
  _uvSelectedSettingsMonths=months;
  document.querySelectorAll('[data-plan-months]').forEach(function(el){
    const m=parseInt(el.dataset.planMonths);
    const sel=m===months;
    el.style.borderColor=sel?'var(--gold)':'var(--border)';
    el.style.background=sel?'rgba(196,168,130,.12)':'transparent';
    var badge=el.querySelector('div[style*="position:absolute"]');
    if(badge&&badge.textContent.trim()!=='Current'){
      badge.textContent=sel?'Selected':(_UV_PLANS.find(function(p){return p.months===m&&!_uvTier.match(/full/)&&p.months===12;})?'Popular':'');
      badge.style.display=sel||(m===12)?'block':'none';
    }
  });
  var cta=document.querySelector('.btn-primary[onclick*="_uvGoCheckout"]');
  if(cta){
    var ms=plan.monthly?_uvFormatMoney(plan.monthly)+'/mo':'';
    cta.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>Upgrade — '+_escH(plan.label)+(ms?' ('+ms+')':'');
  }
}

function _uvConfirmCancel(){
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
  overlay.innerHTML=`<div style="background:var(--cream);color:var(--ink);border-radius:14px;padding:28px;max-width:380px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.2);text-align:center">
    <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;margin-bottom:8px">Cancel subscription?</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.5">You'll keep Full Access until the end of your current billing period. You can reactivate anytime before then.</div>
    <div style="display:flex;gap:10px;justify-content:center">
      <button class="btn btn-sm btn-outline" onclick="this.closest('div[style*=fixed]').remove()">Keep my plan</button>
      <button class="btn btn-sm" style="background:var(--red,#C05840);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;cursor:pointer" onclick="this.textContent='Cancelling…';this.disabled=true;_uvCancelSub().then(function(){navigate('settings')}).finally(function(){var o=document.querySelector('div[style*=fixed]');if(o)o.remove();})">Yes, cancel</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

// ── Landing page pricing pills ──────────────────────────────────────────────

function _uvSelectPricePill(btn){
  document.querySelectorAll('.price-pill').forEach(function(p){ p.classList.remove('active'); });
  btn.classList.add('active');
  const months=parseInt(btn.dataset.months)||1;
  const plan=_UV_PLANS.find(p=>p.months===months);
  const valEl=document.getElementById('price-value');
  if(valEl) valEl.textContent=plan&&plan.monthly?_uvFormatMoney(plan.monthly).replace('$',''):'—';
  var dsp=document.getElementById('price-display');
  if(dsp){dsp.style.fontSize='48px';dsp.style.lineHeight='1';dsp.style.marginBottom='0';}
  if(valEl){valEl.style.fontSize='inherit';valEl.style.color='inherit';valEl.style.verticalAlign='baseline';}
  var tl=dsp&&dsp.previousElementSibling;
  if(tl&&tl.classList.contains('price-tagline')) tl.style.marginBottom='4px';
  var cy=document.getElementById('price-cycle-label');
  if(cy) cy.style.marginBottom='6px';
}

function _uvPricingCTA(){
  if(_sbSession){
    const active=document.querySelector('.price-pill.active');
    const months=active?parseInt(active.dataset.months)||1:1;
    const plan=_UV_PLANS.find(p=>p.months===months);
    _uvGoCheckout(plan&&plan.priceId?plan.priceId:'');
  } else {
    var a=document.getElementById('auth');
    if(a){a.scrollIntoView({behavior:'smooth'});setTimeout(function(){document.querySelectorAll('.tab')[1].click();var e=document.getElementById('auth-up-email');if(e)e.focus();},400);}
  }
}

// ── Manage subscription (Settings page helpers) ─────────────────────────────

async function _uvOpenPortal(){
  await _sbEnsureFreshToken();
  const r = await fetch(_SB_URL+'/functions/v1/manage-subscription',{
    method:'POST',
    headers:{'Authorization':_sbAuthHdr(),'apikey':_SB_KEY,'Content-Type':'application/json'},
    body: JSON.stringify({action:'portal'}),
  });
  const data = await r.json();
  if(data.url) window.location.href = data.url;
}

async function _uvCancelSub(){
  await _sbEnsureFreshToken();
  await fetch(_SB_URL+'/functions/v1/manage-subscription',{
    method:'POST',
    headers:{'Authorization':_sbAuthHdr(),'apikey':_SB_KEY,'Content-Type':'application/json'},
    body: JSON.stringify({action:'cancel'}),
  });
  _uvInvalidateCache();
  await _uvLoadSubscription();
}

async function _uvReactivateSub(){
  await _sbEnsureFreshToken();
  await fetch(_SB_URL+'/functions/v1/manage-subscription',{
    method:'POST',
    headers:{'Authorization':_sbAuthHdr(),'apikey':_SB_KEY,'Content-Type':'application/json'},
    body: JSON.stringify({action:'reactivate'}),
  });
  _uvInvalidateCache();
  await _uvLoadSubscription();
}

// ── Checkout return detection ───────────────────────────────────────────────

function _uvCheckReturn(){
  const p = new URLSearchParams(location.search);
  if(p.get('checkout') === 'success'){
    history.replaceState(null,'',location.pathname + location.hash);
    _uvInvalidateCache();
    setTimeout(function(){
      _uvLoadSubscription().then(function(){
        if(typeof showToast === 'function') showToast('Welcome to Full Access!','success');
      });
    }, 1500);
  }
  if(p.get('portal') === 'return'){
    history.replaceState(null,'',location.pathname + location.hash);
    _uvInvalidateCache();
    _uvLoadSubscription();
  }
}

document.addEventListener('DOMContentLoaded', function(){
  var pill = document.querySelector('.price-pill.active');
  if(pill) _uvSelectPricePill(pill);
});
