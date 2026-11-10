/* ── Referral links ───────────────────────────────────────────────────────────────────────────────
   A vendor's link looks like  https://unionvault.app/?ref=storyline . We remember the code (and the time of the click)
   in this browser for 90 days, tidy it out of the address bar, and — once the person has a new account — ask the
   database to attach it (claim_referral). The database makes every real decision: it accepts only genuine partner
   codes, only brand-new accounts, never the partner themselves, and never overwrites an earlier referral.
   Disclosed in the Terms & Privacy Policy (sections 1–3). */
(function(){
  const KEY = 'uv_ref', WINDOW_DAYS = 90, RE = /^[a-z0-9][a-z0-9_-]{2,39}$/;
  function read(){
    try{
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if(v && RE.test(v.code) && Date.now() - Date.parse(v.at) < WINDOW_DAYS*86400000) return v;
    }catch(_){}
    return null;
  }
  function capture(){
    try{
      const u = new URL(location.href), code = (u.searchParams.get('ref') || '').trim().toLowerCase();
      if(!u.searchParams.has('ref')) return;
      u.searchParams.delete('ref');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
      if(RE.test(code)) localStorage.setItem(KEY, JSON.stringify({ code, at: new Date().toISOString() }));   // newest link wins
    }catch(_){}
  }
  async function claim(){
    const ref = read();
    if(!ref || typeof _sbSession === 'undefined' || !_sbSession || !_sbSession.access_token) return;
    try{
      const r = await fetch(_SB_URL + '/rest/v1/rpc/claim_referral', {
        method:'POST',
        headers:{ 'apikey':_SB_KEY, 'Authorization':'Bearer ' + _sbSession.access_token, 'Content-Type':'application/json' },
        body: JSON.stringify({ p_code: ref.code, p_clicked_at: ref.at })
      });
      if(!r.ok) return;                                   // try again next time
      const d = await r.json();
      // Done, or can never succeed (not a real code / not a new account / too old): stop remembering it.
      if(d && (d.ok || ['invalid_code','existing_account','expired'].includes(d.error))) localStorage.removeItem(KEY);
    }catch(_){}
  }
  capture();
  window._refClaim = claim;
  if(typeof _sbOnAuthChange === 'function') _sbOnAuthChange(function(user){ if(user) setTimeout(claim, 800); });
  setTimeout(claim, 2500);
})();
