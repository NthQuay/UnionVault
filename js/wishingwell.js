// WISHING WELL
// ══════════════════════════════════════════════
let wwTab = 'tracker';
let wwSort = 'newest'; // 'newest'|'oldest'|'highest'|'lowest'|'name'
let wwCols = 1;
function _wwEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _wwTotal(){ return (STATE.wishingwell.contributions||[]).reduce((t,x)=>t+(Number(x.amount)||0),0); }
function _wwThanksDue(){ return (STATE.wishingwell.contributions||[]).filter(x=>!x.thanked).length; }
function _wwMethodLabel(m){ return ({payid:'PayID',bank:'Bank transfer',paypal:'PayPal',cash:'Cash',card:'Card',cheque:'Cheque',other:'Other'})[m]||'Other'; }

function setWwTab(t){ wwTab=t; navigate('wishingwell'); }
function setWwSort(s){ wwSort=s; navigate('wishingwell'); }
function setWwCols(n){ wwCols=n; navigate('wishingwell'); }

// ══════════════════════════════════════════════
