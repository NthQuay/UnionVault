// ══════════════════════════════════════════════
// COLOUR PICKER — the app's own, replacing the browser/phone one everywhere
// ══════════════════════════════════════════════
// Every <input type="color"> in the app (Email Design, Inspiration, tags, website
// builder, setup wizard — and any added later) opens this picker instead of the
// browser's native dialog (Android's is a grid of 8 primary colours). The native
// input stays in the markup as the value holder: clicking it is intercepted, and a
// picked colour is written back to it and fires its own `input` + `change` handlers,
// so existing code (`onchange="…this.value…"`) keeps working unchanged.
(function(){
  const PRESETS = [
    '#FFFFFF','#F5F0E8','#E8DDD0','#C9A227','#B8963E','#8A6A2C','#4A3F35','#1D1916',
    '#F2D4D7','#D4A0A7','#C06A7A','#8B3A58','#E8B4A0','#C4907C','#B05A3A','#7A3B2E',
    '#DCE5D3','#A3B899','#5C8A6A','#3E5C45','#D5E1EA','#8AAAC4','#6B88B0','#40506B',
    '#E6DDF0','#B6A6CF','#9A90B8','#5E4A7A','#F3E5C3','#D9C089','#9AABAB','#5A7A8A'
  ];
  let st = null;   // {input, h, s, v, orig}

  const clamp = (n,a,b)=>Math.min(b,Math.max(a,n));
  const hex2rgb = h=>{ h=String(h||'').replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h,16); return isNaN(n)?{r:0,g:0,b:0}:{r:(n>>16)&255,g:(n>>8)&255,b:n&255}; };
  const rgb2hex = (r,g,b)=>'#'+[r,g,b].map(x=>clamp(Math.round(x),0,255).toString(16).padStart(2,'0')).join('').toUpperCase();
  function rgb2hsv(r,g,b){ r/=255; g/=255; b/=255; const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn; let h=0;
    if(d){ if(mx===r) h=((g-b)/d)%6; else if(mx===g) h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; if(h<0) h+=360; }
    return {h, s:mx?d/mx:0, v:mx}; }
  function hsv2rgb(h,s,v){ const c=v*s, x=c*(1-Math.abs((h/60)%2-1)), m=v-c; let r=0,g=0,b=0;
    if(h<60){r=c;g=x;} else if(h<120){r=x;g=c;} else if(h<180){g=c;b=x;} else if(h<240){g=x;b=c;} else if(h<300){r=x;b=c;} else {r=c;b=x;}
    return {r:(r+m)*255, g:(g+m)*255, b:(b+m)*255}; }
  const curHex = ()=>{ const c=hsv2rgb(st.h,st.s,st.v); return rgb2hex(c.r,c.g,c.b); };
  const isHex = v=>/^#?[0-9a-fA-F]{6}$/.test(String(v||'').trim());
  const norm = v=>{ v=String(v||'').trim(); return (v[0]==='#'?v:'#'+v).toUpperCase(); };

  function yourPalette(){
    try{ const c=(typeof STATE!=='undefined'&&STATE.inspo&&Array.isArray(STATE.inspo.colors))?STATE.inspo.colors:[]; return c.filter(isHex).map(norm).slice(0,16); }catch(_){ return []; }
  }

  function build(){
    let el=document.getElementById('uvcp');
    if(el) return el;
    el=document.createElement('div');
    el.id='uvcp'; el.className='uvcp-back'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','Choose a colour');
    el.innerHTML=`<div class="uvcp">
      <div class="uvcp-head"><span>Choose a colour</span><button type="button" class="uvcp-x" aria-label="Close" data-act="cancel">&times;</button></div>
      <div class="uvcp-sv" id="uvcp-sv"><div class="uvcp-sv-w"></div><div class="uvcp-sv-b"></div><div class="uvcp-knob" id="uvcp-knob"></div></div>
      <div class="uvcp-hue" id="uvcp-hue"><div class="uvcp-hue-knob" id="uvcp-hue-knob"></div></div>
      <div class="uvcp-row">
        <span class="uvcp-prev" id="uvcp-prev"></span>
        <label class="uvcp-hex"><span>#</span><input id="uvcp-hex" maxlength="7" spellcheck="false" autocomplete="off" inputmode="text" aria-label="Hex colour"></label>
      </div>
      <div id="uvcp-yours"></div>
      <div class="uvcp-lbl">Wedding tones</div>
      <div class="uvcp-sw">${PRESETS.map(c=>`<button type="button" style="background:${c}" data-hex="${c}" title="${c}" aria-label="${c}"></button>`).join('')}</div>
      <div class="uvcp-foot"><button type="button" class="btn btn-outline btn-sm" data-act="cancel">Cancel</button><button type="button" class="btn btn-primary btn-sm" data-act="done">Use colour</button></div>
    </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e=>{
      const act=e.target.closest('[data-act]'); if(act){ act.dataset.act==='done'?done():close(); return; }
      const sw=e.target.closest('[data-hex]'); if(sw){ setHex(sw.dataset.hex); return; }
      if(e.target===el) close();
    });
    const hexIn=el.querySelector('#uvcp-hex');
    hexIn.addEventListener('input', ()=>{ if(isHex(hexIn.value)) setHex(hexIn.value, true); });
    hexIn.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); if(isHex(hexIn.value)) setHex(hexIn.value); done(); } });
    drag(el.querySelector('#uvcp-sv'), (x,y)=>{ st.s=x; st.v=1-y; paint(); });
    drag(el.querySelector('#uvcp-hue'), (x)=>{ st.h=Math.min(359.9,x*360); paint(); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && el.classList.contains('open')) close(); });
    return el;
  }
  function drag(area, fn){
    const at=e=>{ const r=area.getBoundingClientRect(); const p=e.touches?e.touches[0]:e; fn(clamp((p.clientX-r.left)/r.width,0,1), clamp((p.clientY-r.top)/r.height,0,1)); };
    area.addEventListener('pointerdown', e=>{ e.preventDefault(); area.setPointerCapture&&area.setPointerCapture(e.pointerId); at(e);
      const mv=ev=>at(ev), up=()=>{ area.removeEventListener('pointermove',mv); area.removeEventListener('pointerup',up); area.removeEventListener('pointercancel',up); };
      area.addEventListener('pointermove',mv); area.addEventListener('pointerup',up); area.addEventListener('pointercancel',up); });
  }
  function setHex(h, fromTyping){
    const c=hex2rgb(norm(h)); const v=rgb2hsv(c.r,c.g,c.b);
    // keep the hue when the colour is grey (s=0) so the slider doesn't jump to red
    st.h = v.s ? v.h : st.h; st.s=v.s; st.v=v.v;
    paint(fromTyping);
  }
  function paint(fromTyping){
    const el=document.getElementById('uvcp'); if(!el||!st) return;
    const hex=curHex();
    const hue=hsv2rgb(st.h,1,1);
    el.querySelector('#uvcp-sv').style.background=rgb2hex(hue.r,hue.g,hue.b);
    const k=el.querySelector('#uvcp-knob'); k.style.left=(st.s*100)+'%'; k.style.top=((1-st.v)*100)+'%'; k.style.background=hex;
    const hk=el.querySelector('#uvcp-hue-knob'); hk.style.left=(st.h/360*100)+'%'; hk.style.background=rgb2hex(hue.r,hue.g,hue.b);
    el.querySelector('#uvcp-prev').style.background=hex;
    if(!fromTyping) el.querySelector('#uvcp-hex').value=hex.slice(1);
    el.querySelectorAll('.uvcp-sw button,.uvcp-yours button').forEach(b=>b.classList.toggle('on', b.dataset.hex.toUpperCase()===hex));
  }
  function open(input){
    const el=build();
    const start=isHex(input.value)?norm(input.value):'#B8963E';
    st={input, h:0, s:0, v:0, orig:start};
    const yours=yourPalette();
    el.querySelector('#uvcp-yours').innerHTML = yours.length
      ? `<div class="uvcp-lbl">Your palette</div><div class="uvcp-sw uvcp-yours">${yours.map(c=>`<button type="button" style="background:${c}" data-hex="${c}" title="${c}" aria-label="${c}"></button>`).join('')}</div>` : '';
    setHex(start);
    el.classList.add('open');
    document.documentElement.classList.add('uvcp-lock');
  }
  function close(){
    const el=document.getElementById('uvcp'); if(el) el.classList.remove('open');
    document.documentElement.classList.remove('uvcp-lock');
    st=null;
  }
  function done(){
    if(!st) return close();
    const input=st.input, hex=curHex().toLowerCase();
    close();
    if(!input || !document.contains(input)) return;
    input.value=hex;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  // Intercept every native colour input (capture phase, so it runs before the browser opens its dialog).
  function intercept(e){
    const t=e.target;
    if(!(t instanceof HTMLInputElement) || t.type!=='color' || t.disabled) return;
    if(e.type==='keydown' && e.key!=='Enter' && e.key!==' ') return;   // Tab etc. still move focus
    e.preventDefault(); e.stopPropagation();
    open(t);
  }
  document.addEventListener('click', intercept, true);
  document.addEventListener('keydown', intercept, true);
  window.uvColorPicker={open, close};
})();
