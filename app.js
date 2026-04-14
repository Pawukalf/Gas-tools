let mode='top';

function clampPct(x){x=Number(x);if(!isFinite(x))return 0;return Math.min(Math.max(x,0),100)}
function frac(p){return clampPct(p)/100}
function show(el, on){el.classList.toggle('hidden', !on)}
function cleanBar(x){return (Math.abs(x) < 0.05) ? 0 : x}
function fmtBar(x){return cleanBar(x).toFixed(1)}

function setMode(m){
  mode=m;
  modeTop.classList.toggle('segOn', m==='top');
  modeEmpty.classList.toggle('segOn', m==='empty');
  show(topupFields, m==='top');
  show(emptyFields, m==='empty');
  blend();
}

function calcAdditions(Ps, sO2, sHe, Pf, tO2, tHe, Ftop){
  const addHe = Pf*tHe - Ps*sHe;
  const denom = (1 - Ftop);
  const num = Pf*(tO2 - Ftop*(1 - tHe)) - Ps*(sO2 - Ftop + Ftop*sHe);
  const addO2 = num/denom;
  const addTop = Pf - Ps - addHe - addO2;
  return {addHe, addO2, addTop};
}

function findDrain(Ps, sO2, sHe, Pf, tO2, tHe, Ftop){
  const denom = (1 - Ftop);
  const A = Pf*(tO2 - Ftop*(1 - tHe));
  const B = (sO2 - Ftop + Ftop*sHe);

  let lo = 0;
  let hi = Ps;

  if (sHe > 1e-9){
    hi = Math.min(hi, (Pf*tHe)/sHe);
  }

  if (Math.abs(B) > 1e-12){
    const bound = A/B;
    if (B > 0) hi = Math.min(hi, bound);
    else lo = Math.max(lo, bound);
  } else {
    if (A/denom < -1e-9) return null;
  }

  const C0 = Pf*(1 - tHe) - (A/denom);
  const C1 = -(1 - sHe) + (B/denom);
  if (Math.abs(C1) > 1e-12){
    const bound = -C0/C1;
    if (C1 > 0) lo = Math.max(lo, bound);
    else hi = Math.min(hi, bound);
  } else {
    if (C0 < -1e-9) return null;
  }

  lo = Math.max(lo, 0);
  hi = Math.min(hi, Ps);
  if (hi < lo - 1e-6) return null;

  return hi;
}

function blend(){
  b_error.textContent='';

  const Ftop = frac(b_topO2.value);
  if(Ftop>=1-1e-9){b_error.textContent='Top-up gas O₂ must be less than 100.';return}

  let Ps, Pf, sO2, sHe, tO2, tHe;

  if(mode==='top'){
    Ps = Number(b_startBar.value);
    Pf = Number(b_finalBar.value);
    sO2 = frac(b_startO2.value);
    sHe = frac(b_startHe.value);
    tO2 = frac(b_targetO2.value);
    tHe = frac(b_targetHe.value);
  } else {
    Ps = 0;
    Pf = Number(b_finalBar2.value);
    sO2 = 0; sHe = 0;
    tO2 = frac(b_targetO2_2.value);
    tHe = frac(b_targetHe_2.value);
  }

  if(!isFinite(Pf) || Pf<=0){b_error.textContent='Check final pressure.';return}
  if(!isFinite(Ps) || Ps<0){b_error.textContent='Check start pressure.';return}
  if(mode==='top' && Ps>Pf){b_error.textContent='Start pressure cannot be higher than final pressure.';return}
  if(sO2+sHe>1+1e-9){b_error.textContent='Start mix: O₂ + He must be ≤ 100.';return}
  if(tO2+tHe>1+1e-9){b_error.textContent='Target mix: O₂ + He must be ≤ 100.';return}

  let Pd = Ps;
  let add = calcAdditions(Pd, sO2, sHe, Pf, tO2, tHe, Ftop);

  if(mode==='top' && (add.addHe < -1e-6 || add.addO2 < -1e-6 || add.addTop < -1e-6)){
    const found = findDrain(Ps, sO2, sHe, Pf, tO2, tHe, Ftop);
    if(found === null){
      b_error.textContent='Target not achievable with selected top-up gas. Try a different top-up gas or adjust target.';
      return;
    }
    Pd = Math.max(0, Math.min(Ps, found));
    add = calcAdditions(Pd, sO2, sHe, Pf, tO2, tHe, Ftop);
  }

  if(add.addHe < -1e-5 || add.addO2 < -1e-5 || add.addTop < -1e-5){
    b_error.textContent='Target not achievable with selected top-up gas at this starting pressure.';
    return;
  }

  const didDrain = (mode==='top' && Pd < Ps - 0.05);
  show(row_drain, didDrain);
  if(didDrain) b_drain.textContent = fmtBar(Pd);

  b_addHe.textContent = fmtBar(add.addHe);
  b_addO2.textContent = fmtBar(add.addO2);
  b_addTop.textContent = fmtBar(add.addTop);

  const finalO2 = Math.round(tO2*100);
  const finalHe = Math.round(tHe*100);
  const usingHe = finalHe>0 || Math.round(clampPct((mode==='top')?b_startHe.value:0))>0;

  show(row_addHe, usingHe);
  show(row_finalTrimix, usingHe);
  show(row_finalNitrox, !usingHe);

  if(usingHe){
    b_finalO2_2_out.textContent = finalO2;
    b_finalHe.textContent = finalHe;
  } else {
    b_finalO2.textContent = finalO2;
  }
}

function plan(){
  const fo2 = frac(p_mix.value);
  const depth = Number(p_depth.value);
  const ppo2 = Number(p_ppo2.value);
  if(!isFinite(fo2)||!isFinite(depth)||!isFinite(ppo2)||fo2<=0||ppo2<=0||depth<0){return}

  const amb = 1 + depth/10;
  const mod = 10 * (ppo2/fo2 - 1);
  const best = (ppo2/amb)*100;
  const ead = ((depth+10)*((1-fo2)/0.79)) - 10;

  p_mod.textContent = Math.max(0,mod).toFixed(1);
  p_best.textContent = Math.round(best);
  p_ead.textContent = Math.max(0,ead).toFixed(1);
}

function copyToPlan(){
  const val = (mode==='top') ? b_targetO2.value : b_targetO2_2.value;
  p_mix.value = Math.round(clampPct(val));
  plan();
  p_mix.scrollIntoView({behavior:'smooth', block:'center'});
}

howBtn.addEventListener('click', ()=>{
  const open = howBox.classList.contains('hidden');
  show(howBox, open);
  howBtn.setAttribute('aria-expanded', open ? 'true':'false');
  howBtn.textContent = open ? 'Back' : 'How to use';
});

modeTop.addEventListener('click', ()=>setMode('top'));
modeEmpty.addEventListener('click', ()=>setMode('empty'));

['p_mix','p_depth','p_ppo2'].forEach(id => document.getElementById(id).addEventListener('input', plan));
plan();
blend();
