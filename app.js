let mode = 'top';
let resultView = 'fill';
let gasOrder = 'o2';
let lastResult = null;

const $ = id => document.getElementById(id);
function clampPct(x){ x=Number(x); return isFinite(x) ? Math.min(Math.max(x,0),100) : 0; }
function frac(p){ return clampPct(p)/100; }
function show(el,on){ el.classList.toggle('hidden',!on); }
function cleanBar(x){ return Math.abs(x)<0.05 ? 0 : x; }
function fmtBar(x){ return cleanBar(x).toFixed(1); }
function isZero(x){ return Math.abs(x)<0.05; }
function togglePair(on,off,first){
  on.classList.toggle('segOn',first); off.classList.toggle('segOn',!first);
  on.setAttribute('aria-pressed',String(first)); off.setAttribute('aria-pressed',String(!first));
}

function setMode(next){
  mode=next;
  togglePair($('modeTop'),$('modeEmpty'),next==='top');
  show($('topupFields'),next==='top'); show($('emptyFields'),next==='empty');
  blend();
}
function setResultView(next){
  resultView=next;
  $('resultToggle').classList.toggle('switchRight', next==='add');
  $('resultToggle').setAttribute('aria-checked', String(next==='fill'));
  renderResults();
}
function setGasOrder(next){
  gasOrder=next;
  $('orderToggle').classList.toggle('switchRight', next==='he');
  $('orderToggle').setAttribute('aria-checked', String(next==='o2'));
  renderResults();
}

function calcAdditions(Ps,sO2,sHe,Pf,tO2,tHe,Ftop){
  const addHe=Pf*tHe-Ps*sHe;
  const denom=1-Ftop;
  const num=Pf*(tO2-Ftop*(1-tHe))-Ps*(sO2-Ftop+Ftop*sHe);
  const addO2=num/denom;
  const addTop=Pf-Ps-addHe-addO2;
  return {addHe,addO2,addTop};
}
function findDrain(Ps,sO2,sHe,Pf,tO2,tHe,Ftop){
  const denom=1-Ftop, A=Pf*(tO2-Ftop*(1-tHe)), B=sO2-Ftop+Ftop*sHe;
  let lo=0, hi=Ps;
  if(sHe>1e-9) hi=Math.min(hi,(Pf*tHe)/sHe);
  if(Math.abs(B)>1e-12){ const bound=A/B; if(B>0) hi=Math.min(hi,bound); else lo=Math.max(lo,bound); }
  else if(A/denom<-1e-9) return null;
  const C0=Pf*(1-tHe)-(A/denom), C1=-(1-sHe)+(B/denom);
  if(Math.abs(C1)>1e-12){ const bound=-C0/C1; if(C1>0) lo=Math.max(lo,bound); else hi=Math.min(hi,bound); }
  else if(C0<-1e-9) return null;
  lo=Math.max(lo,0); hi=Math.min(hi,Ps);
  return hi<lo-1e-6 ? null : hi;
}

function step(label,value,skip=false){
  const row=document.createElement('div'); row.className='result';
  const name=document.createElement('span'); name.textContent=label;
  const amount=document.createElement('strong');
  if(skip){ amount.className='skip'; amount.textContent='SKIP'; }
  else amount.textContent=`${fmtBar(value)} bar`;
  row.append(name,amount); return row;
}

function renderResults(){
  const box=$('resultSteps'); box.replaceChildren();
  if(!lastResult) return;
  const {Pd,Pf,addO2,addHe,addTop,didDrain,usingHe}=lastResult;
  show($('orderControl'),true);
  if(didDrain) box.append(step('Drain to',Pd));

  const gases=gasOrder==='o2'
    ? [{name:'O₂',amount:addO2},{name:'He',amount:addHe}]
    : [{name:'He',amount:addHe},{name:'O₂',amount:addO2}];

  if(resultView==='add'){
    gases.forEach(g=>{ if(g.name==='He' && !usingHe) return; box.append(step(`Add ${g.name}`,g.amount,isZero(g.amount))); });
    box.append(step('Add top-up',addTop,isZero(addTop)));
  }else{
    let gauge=Pd;
    gases.forEach(g=>{
      if(g.name==='He' && !usingHe) return;
      if(isZero(g.amount)) box.append(step(g.name,0,true));
      else { gauge+=g.amount; box.append(step(`${g.name} to`,gauge)); }
    });
    box.append(isZero(addTop) ? step('Top-up',0,true) : step('Top-up to',Pf));
  }
}

function blend(){
  $('b_error').textContent=''; lastResult=null;
  const Ftop=frac($('b_topO2').value);
  if(Ftop>=1-1e-9){ $('b_error').textContent='Top-up gas O₂ must be less than 100.'; renderResults(); return; }
  let Ps,Pf,sO2,sHe,tO2,tHe;
  if(mode==='top'){
    Ps=Number($('b_startBar').value); Pf=Number($('b_finalBar').value);
    sO2=frac($('b_startO2').value); sHe=frac($('b_startHe').value);
    tO2=frac($('b_targetO2').value); tHe=frac($('b_targetHe').value);
  }else{
    Ps=0; Pf=Number($('b_finalBar2').value); sO2=0; sHe=0;
    tO2=frac($('b_targetO2_2').value); tHe=frac($('b_targetHe_2').value);
  }
  if(!isFinite(Pf)||Pf<=0){ $('b_error').textContent='Check final pressure.'; renderResults(); return; }
  if(!isFinite(Ps)||Ps<0){ $('b_error').textContent='Check start pressure.'; renderResults(); return; }
  if(mode==='top'&&Ps>Pf){ $('b_error').textContent='Start pressure cannot be higher than final pressure.'; renderResults(); return; }
  if(sO2+sHe>1+1e-9){ $('b_error').textContent='Start mix: O₂ + He must be ≤ 100.'; renderResults(); return; }
  if(tO2+tHe>1+1e-9){ $('b_error').textContent='Target mix: O₂ + He must be ≤ 100.'; renderResults(); return; }

  let Pd=Ps, add=calcAdditions(Pd,sO2,sHe,Pf,tO2,tHe,Ftop);
  if(mode==='top'&&(add.addHe<-1e-6||add.addO2<-1e-6||add.addTop<-1e-6)){
    const found=findDrain(Ps,sO2,sHe,Pf,tO2,tHe,Ftop);
    if(found===null){ $('b_error').textContent='Target not achievable with selected top-up gas. Try a different top-up gas or adjust target.'; renderResults(); return; }
    Pd=Math.max(0,Math.min(Ps,found)); add=calcAdditions(Pd,sO2,sHe,Pf,tO2,tHe,Ftop);
  }
  if(add.addHe<-1e-5||add.addO2<-1e-5||add.addTop<-1e-5){ $('b_error').textContent='Target not achievable with selected top-up gas at this starting pressure.'; renderResults(); return; }

  const finalO2=Math.round(tO2*100), finalHe=Math.round(tHe*100);
  $('b_finalO2_out').textContent=finalO2; $('b_finalHe_out').textContent=finalHe;
  const usingHe=finalHe>0||Math.round(clampPct(mode==='top'?$('b_startHe').value:0))>0||!isZero(add.addHe);
  lastResult={Pd,Pf,addO2:cleanBar(add.addO2),addHe:cleanBar(add.addHe),addTop:cleanBar(add.addTop),didDrain:mode==='top'&&Pd<Ps-0.05,usingHe};
  renderResults();
}

$('howBtn').addEventListener('click',()=>{
  const open=$('howBox').classList.contains('hidden'); show($('howBox'),open);
  $('howBtn').setAttribute('aria-expanded',String(open)); $('howBtn').textContent=open?'Back':'How to use';
});
$('modeTop').addEventListener('click',()=>setMode('top'));
$('modeEmpty').addEventListener('click',()=>setMode('empty'));
$('resultToggle').addEventListener('click',()=>setResultView(resultView==='fill'?'add':'fill'));
$('orderToggle').addEventListener('click',()=>setGasOrder(gasOrder==='o2'?'he':'o2'));
$('btnBlend').addEventListener('click',blend);
document.querySelectorAll('input').forEach(input=>input.addEventListener('input',blend));
blend();
