// WISHING WELL
// ══════════════════════════════════════════════
let wwTab = 'tracker';
let wwSort = 'newest'; // 'newest'|'oldest'|'highest'|'lowest'|'name'|'due'|'written'|'sent'
// Which thank-you step a gift is at, for sorting: sent wins, then written, else due.
function _wwStepOf(x){ return x.thanked?'sent':(x.cardWritten?'written':'due'); }
function _wwStepRank(x,order){ return order.indexOf(_wwStepOf(x)); }
let wwCols = 1;
function _wwEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _wwTotal(){ return (STATE.wishingwell.contributions||[]).reduce((t,x)=>t+(Number(x.amount)||0),0); }
// Every contribution is in exactly one state: due (no card yet), written (card written, not yet sent) or sent (sent implies written).
function _wwThanksDue(){ return (STATE.wishingwell.contributions||[]).filter(x=>!x.thanked && !x.cardWritten).length; }
function _wwMethodLabel(m){ return ({payid:'PayID',bank:'Bank transfer',paypal:'PayPal',cash:'Cash',card:'Card',cheque:'Cheque',other:'Other'})[m]||'Other'; }

function setWwTab(t){ wwTab=t; navigate('wishingwell'); }
function setWwSort(s){ wwSort=s; navigate('wishingwell'); }
// Cash gifts search: re-renders the page and puts the caret back in the box.
let wwSearch='';
function setWwSearch(v){
  wwSearch=v; navigate('wishingwell');
  const el=document.getElementById('ww-search'); if(el){ el.focus(); try{ el.setSelectionRange(v.length,v.length); }catch(_){} }
}
function setWwCols(n){ wwCols=n; navigate('wishingwell'); }

// ══════════════════════════════════════════════
