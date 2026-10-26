const REF=[
{id:'rice',th:'ข้าวสวย',en:'Steamed rice',k:130,g:160},
{id:'basil',th:'กะเพราหมูสับ',en:'Stir-fried basil pork',k:165,g:180},
{id:'egg',th:'ไข่ดาว',en:'Fried egg',k:196,g:50},
{id:'somtam',th:'ส้มตำ',en:'Papaya salad',k:60,g:200},
{id:'padthai',th:'ผัดไทย',en:'Pad thai',k:190,g:250},
{id:'kmk',th:'ข้าวมันไก่',en:'Hainanese chicken rice',k:185,g:330},
{id:'tomyum',th:'ต้มยำกุ้ง',en:'Tom yum goong',k:45,g:350},
{id:'green',th:'แกงเขียวหวานไก่',en:'Green curry chicken',k:120,g:250},
{id:'friedrice',th:'ข้าวผัด',en:'Fried rice',k:175,g:250},
{id:'noodle',th:'ก๋วยเตี๋ยวเรือ',en:'Boat noodles',k:95,g:350},
{id:'moo',th:'หมูปิ้ง',en:'Grilled pork skewers',k:260,g:90},
{id:'sticky',th:'ข้าวเหนียว',en:'Sticky rice',k:170,g:100},
{id:'chicken',th:'ไก่ทอด',en:'Fried chicken',k:270,g:120},
{id:'jok',th:'โจ๊กหมู',en:'Pork congee',k:60,g:350},
{id:'morning',th:'ผัดผักบุ้ง',en:'Stir-fried morning glory',k:90,g:150},
{id:'banana',th:'กล้วยหอม',en:'Banana',k:89,g:120}];
const MEALS=[{id:'b',th:'มื้อเช้า',en:'Breakfast'},{id:'l',th:'มื้อกลางวัน',en:'Lunch'},{id:'d',th:'มื้อเย็น',en:'Dinner'},{id:'s',th:'ของว่าง',en:'Snack'}];
const STEPS=['กำลังย่อรูป…','AI กำลังดูจาน…','คำนวณแคลอรี่…'];
const ls={get(k,d){try{const v=localStorage.getItem('cc_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('cc_'+k,JSON.stringify(v))}catch(e){}}};
let uidN=1;const uid=()=>'s'+(uidN++);
const refById=id=>REF.find(r=>r.id===id);
const mkItem=(r,f=1,conf=.9)=>({ref:r.id,th:r.th,en:r.en,k:r.k,base:r.g,g:Math.round(r.g*f),conf,est:false});
const kc=it=>Math.round(it.g*it.k/100);
const scanK=sc=>sc.items.reduce((a,i)=>a+kc(i),0);
const fmt=n=>Math.round(n).toLocaleString('en-US');
const ic=n=>`<i data-lucide="${n}"></i>`;
const dkey=d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const TODAY=new Date();const TK=dkey(TODAY);
const mealOf=id=>MEALS.find(m=>m.id===id);
function guessMeal(h=new Date().getHours()+new Date().getMinutes()/60){return h<10.5?'b':h<14.5?'l':h<17?'s':h<21?'d':'s'}

const S={tab:'today',screen:null,sheet:null,sheetMeal:null,picker:null,draft:null,waitStep:0,weekOffset:0,selDay:TK,
goal:ls.get('goal',2000),goalSet:ls.get('goalSet',false),goalDraft:null,model:ls.get('model','qwen2.5vl:3b'),theme:ls.get('theme','auto'),
simError:false,ollamaOk:true,testing:false,toast:null,expanded:{},days:{}};

(function seed(){
const P={b:[['jok'],['moo','sticky'],['egg','rice'],['banana'],['jok','egg']],l:[['kmk'],['padthai'],['basil','rice','egg'],['noodle'],['friedrice','egg']],d:[['green','rice'],['somtam','sticky','chicken'],['tomyum','rice'],['morning','rice','egg'],['padthai','chicken']],s:[[],['banana'],[],['moo'],[]]};
for(let i=1;i<=20;i++){const day={};MEALS.forEach((m,mi)=>{const p=P[m.id][(i*3+mi*2)%P[m.id].length];if(p.length)day[m.id]=[{id:uid(),photo:null,items:p.map((r,j)=>mkItem(refById(r),(i+j)%4===0?1.5:1))}]});S.days[dkey(addDays(TODAY,-i))]=day}
S.days[TK]={b:[{id:uid(),photo:null,items:[mkItem(refById('jok')),mkItem(refById('egg'))]}],l:[{id:uid(),photo:'sample',items:[mkItem(refById('kmk'))]}]};
})();

function sampleItems(){const t=mkItem(refById('basil'),1,.86),r=mkItem(refById('rice'),1,.92),e=mkItem(refById('egg'),1,.45);
return [t,r,e,{ref:null,th:'ชาเย็น',en:'Thai iced tea',k:67,base:300,g:300,conf:.62,est:true}]}
const dayTotal=key=>{const d=S.days[key]||{};return MEALS.reduce((a,m)=>a+(d[m.id]||[]).reduce((b,s)=>b+scanK(s),0),0)};
function frequent(){const c={};const lim=dkey(addDays(TODAY,-30));Object.values(S.days).forEach(d=>MEALS.forEach(m=>(d[m.id]||[]).forEach(s=>s.items.forEach(i=>{if(i.ref)c[i.ref]=(c[i.ref]||0)+1}))));return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,6).map(e=>refById(e[0]))}

function thumb(sc,big){if(sc.photo&&sc.photo!=='sample')return `<img class="washed" src="${sc.photo}" alt="">`;
if(sc.photo==='sample')return `<div class="ph">${big?'รูปอาหาร':''}</div>`;return `<div class="ph ph-icon">${ic('utensils')}</div>`}

/* ---------- views ---------- */
function ring(eaten,goal){const r=84,c=2*Math.PI*r,over=eaten>goal,p=Math.min(eaten/goal,1);
return `<div class="ring ${over?'is-over':''}"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="${r}" class="ring-track"></circle><circle cx="100" cy="100" r="${r}" class="ring-val" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-p)}" transform="rotate(-90 100 100)"></circle></svg><div class="ring-c"><span class="ring-lbl">${over?'เกินเป้า':'เหลืออีก'}</span><span class="ring-num">${fmt(Math.abs(goal-eaten))}</span><span class="ring-unit">kcal</span></div></div>`}
function mealCard(key,m){const sc=(S.days[key]||{})[m.id]||[];const t=sc.reduce((a,s)=>a+scanK(s),0);
return `<div class="card meal"><div class="meal-h"><div><div class="mt">${m.th}</div><div class="en">${m.en}</div></div>${sc.length?`<div class="meal-k">${fmt(t)} <small>kcal</small></div><button class="btn-soft" style="display:grid;place-items:center" data-a="add" data-meal="${m.id}" aria-label="เพิ่ม${m.th}">${ic('plus')}</button>`:`<button class="pill-add" data-a="add" data-meal="${m.id}">+ เพิ่ม</button>`}</div>${sc.length?`<div class="thumbs">${sc.map(s=>`<button class="thumb" data-a="edit" data-day="${key}" data-meal="${m.id}" data-id="${s.id}"><div class="tb">${thumb(s)}</div>${fmt(scanK(s))}</button>`).join('')}</div>`:''}</div>`}
function vToday(){const h=TODAY.getHours();const g=h<12?'อรุณสวัสดิ์':h<17?'สวัสดีตอนบ่าย':'สวัสดีตอนเย็น';const eaten=dayTotal(TK);
return `<div class="hello"><div class="brand">Calorie&amp;Check</div><h1>${g}</h1><p class="muted">${TODAY.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p></div>
${S.goalSet?'':`<button class="banner" data-a="tab" data-tab="settings">${ic('target')}ตั้งเป้าแคลอรี่ของคุณ${ic('chevron-right')}</button>`}
<div class="card ring-card">${ring(eaten,S.goal)}<div class="ring-sub">กินไป <b>${fmt(eaten)}</b> / เป้า <b>${fmt(S.goal)}</b> kcal</div></div>
<div class="sec-h"><h4>บันทึกด่วน</h4><span class="en">Quick log</span></div>
<div class="chips scroll">${frequent().map(r=>`<button class="chip" data-a="quick" data-ref="${r.id}">${ic('plus')}${r.th}</button>`).join('')}</div>
<div class="sec-h"><h4>มื้อวันนี้</h4><span class="en">Meals</span></div>
<div class="meals">${MEALS.map(m=>mealCard(TK,m)).join('')}</div>`}
function vHistory(){const end=addDays(TODAY,S.weekOffset*7);const days=[...Array(7)].map((_,i)=>addDays(end,i-6));const max=S.goal*1.45;
const f=d=>d.toLocaleDateString('th-TH',{day:'numeric',month:'short'});
const sel=S.selDay;const selD=days.find(d=>dkey(d)===sel)||new Date(sel);const tot=dayTotal(sel);const dd=S.days[sel]||{};
const meals=MEALS.map(m=>{const sc=dd[m.id]||[];if(!sc.length)return'';return `<div class="h-meal"><div class="h-mh"><span>${m.th}</span><span>${fmt(sc.reduce((a,s)=>a+scanK(s),0))} kcal</span></div>${sc.map(s=>`<button class="h-scan" data-a="edit" data-day="${sel}" data-meal="${m.id}" data-id="${s.id}"><div class="tb">${thumb(s)}</div><span class="names">${s.items.map(i=>i.th).join(' · ')}</span><b>${fmt(scanK(s))}</b>${ic('chevron-right')}</button>`).join('')}</div>`}).join('');
return `<div class="hello"><h1>ประวัติ</h1><p class="muted">History</p></div>
<div class="card" style="padding:14px 12px;gap:12px"><div class="week-nav"><button class="btn btn-icon" data-a="week" data-d="-1" aria-label="สัปดาห์ก่อน">${ic('chevron-left')}</button><div class="range-l">${f(days[0])} – ${f(days[6])}</div><button class="btn btn-icon" data-a="week" data-d="1" aria-label="สัปดาห์ถัดไป" ${S.weekOffset>=0?'disabled':''}>${ic('chevron-right')}</button></div>
<div class="week">${days.map(d=>{const k=dkey(d),t=dayTotal(k);return `<button class="wd ${k===sel?'on':''}" data-a="day" data-k="${k}"><span>${d.toLocaleDateString('th-TH',{weekday:'short'})}</span><div class="bar"><span class="${t>S.goal?'over':''}" style="height:${Math.min(t/max,1)*100}%"></span><i style="bottom:${S.goal/max*100}%"></i></div><b>${d.getDate()}</b></button>`}).join('')}</div>
<div class="legend"><span><i></i>ไม่เกินเป้า</span><span><i class="o"></i>เกินเป้า</span><span>— เป้า ${fmt(S.goal)}</span></div></div>
<div class="card" style="padding:18px;gap:14px"><div><div class="muted" style="font-size:14px">${selD.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long'})}</div><div class="day-sum"><span class="big">${fmt(tot)}</span><span class="muted">/ ${fmt(S.goal)} kcal</span>${tot>S.goal?`<span class="over-t">เกินเป้า ${fmt(tot-S.goal)} kcal</span>`:''}</div></div>${meals||'<div class="empty">ยังไม่มีบันทึกในวันนี้</div>'}</div>`}
function vSettings(){const gd=S.goalDraft??S.goal;const st=S.testing?['wait','กำลังทดสอบ…']:S.ollamaOk?['','เชื่อมต่อได้']:['bad','เชื่อมต่อไม่ได้'];
const seg=(name,opts,cur)=>`<div class="seg">${opts.map(o=>`<label class="seg-opt"><input type="radio" name="${name}" value="${o[0]}" ${cur===o[0]?'checked':''}>${o[1]}</label>`).join('')}</div>`;
return `<div class="hello"><h1>ตั้งค่า</h1><p class="muted">Settings</p></div>
<div class="card set"><div class="set-h"><span class="mt">เป้าแคลอรี่ต่อวัน</span><span class="en">Daily goal</span></div><div class="goal-row"><input class="input" id="goalIn" type="number" inputmode="numeric" min="800" max="5000" step="50" value="${gd}"><span class="unit">kcal</span></div>
<div class="chips">${[1500,1800,2000,2500].map(v=>`<button class="chip ${+gd===v?'on':''}" data-a="goalChip" data-v="${v}">${fmt(v)}</button>`).join('')}</div>
<button class="btn btn-primary btn-wide" data-a="saveGoal">บันทึกเป้า</button></div>
<div class="card set"><div class="set-h"><span class="mt">โมเดล AI</span><span class="en">Vision model</span></div>${seg('model',[['qwen2.5vl:3b','qwen2.5vl:3b'],['gemma3:4b','gemma3:4b']],S.model)}</div>
<div class="card set"><div class="set-h"><span class="mt">สถานะ Ollama</span><span class="en">http://192.168.1.10:11434</span></div><div class="status"><span class="sdot ${st[0]}"></span><div class="t"><b>${st[1]}</b><span class="en">${S.model}</span></div><button class="btn btn-secondary" data-a="test" ${S.testing?'disabled':''}>ทดสอบ</button></div>
<div class="sw-row"><div><div>จำลอง error</div><div class="en">Prototype only — การสแกนครั้งถัดไปจะล้มเหลว</div></div><label class="switch"><input type="checkbox" id="simErr" ${S.simError?'checked':''} aria-label="จำลอง error"><span></span></label></div></div>
<div class="card set"><div class="set-h"><span class="mt">ธีม</span><span class="en">Appearance</span></div>${seg('theme',[['auto','อัตโนมัติ'],['light','สว่าง'],['dark','มืด']],S.theme)}</div>`}
function itemCard(it,i){const low=it.conf<.5;
const chips=[[.5,'½'],[1,'1'],[1.5,'1½']].map(([f,l])=>`<button class="chip ${Math.round(it.base*f)===it.g?'on':''}" data-a="portion" data-i="${i}" data-f="${f}">${l} จาน</button>`).join('');
return `<div class="card item ${low?'is-low':''}"><div class="item-h"><button class="item-name" data-a="pick" data-mode="rename" data-i="${i}"><span class="mt">${it.th}</span><span class="en">${it.en}</span></button><div class="item-k"><b data-k="${i}">${fmt(kc(it))}</b> kcal</div></div>
${it.est||low?`<div class="item-tags">${it.est?'<span class="tag tag-neutral">ประมาณการ</span>':''}${low?`<span class="warn-msg">${ic('triangle-alert')}ลองตรวจดูอีกที</span>`:''}</div>`:''}
<div class="item-row">${chips}<button class="link" data-a="grams" data-i="${i}">${S.expanded[i]?'ซ่อนกรัม':'ปรับกรัม'}</button><button class="btn-del" style="display:grid;place-items:center" data-a="delItem" data-i="${i}" aria-label="ลบรายการ">${ic('trash-2')}</button></div>
${S.expanded[i]?`<div class="grams"><input class="range" type="range" min="0" max="${Math.max(600,it.base*2)}" step="5" value="${it.g}" data-i="${i}" aria-label="กรัม"><span><b data-g="${i}">${it.g}</b> ก.</span></div>`:''}</div>`}
function vResult(){const d=S.draft;const tot=d.items.reduce((a,i)=>a+kc(i),0);
return `<div class="topbar"><button class="btn btn-icon" data-a="closeResult" aria-label="ปิด">${ic('x')}</button><div class="tb-title">${d.editing?'แก้ไขการสแกน':'ตรวจรายการ'}</div></div>
<div class="res-head">${d.photo?`<div class="res-photo">${thumb(d,true)}</div>`:''}<div style="flex:1"><div class="lbl">${d.editing?'ย้ายไปมื้อ':'บันทึกลงมื้อ'}</div><div class="chips">${MEALS.map(m=>`<button class="chip ${d.meal===m.id?'on':''}" data-a="setMeal" data-meal="${m.id}">${m.th}</button>`).join('')}</div></div></div>
<div class="items">${d.items.map(itemCard).join('')||'<div class="empty">ยังไม่มีรายการ</div>'}</div>
<button class="btn btn-secondary btn-wide" data-a="pick" data-mode="add">${ic('plus')}เพิ่มรายการเอง</button>
<p class="note">ค่าแคลอรี่เป็นค่าประมาณ อาจคลาดเคลื่อน ±20–30%</p>
${d.editing?`<button class="danger" data-a="delScan">${ic('trash-2')}ลบการสแกนนี้</button>`:''}
<div class="savebar"><div><div class="tot"><div class="en">รวม · Total</div><b id="total">${fmt(tot)}</b> kcal</div><button class="btn btn-primary btn-lg" data-a="save" ${d.items.length||d.editing?'':'disabled'}>บันทึก</button></div></div>`}
function vWait(){return `<div class="wait-photo">${thumb(S.draft,true)}<div class="scanline"></div></div><div class="wait-step" id="wstep">${STEPS[S.waitStep]}</div><div class="dots" id="wdots">${STEPS.map((_,i)=>`<span class="${i<=S.waitStep?'on':''}"></span>`).join('')}</div><div class="wait-time" id="wtime">0 วินาที</div><button class="btn btn-secondary btn-lg" data-a="cancelWait">ยกเลิก</button>`}
function vError(){return `<div class="err-ic">${ic('wifi-off')}</div><h2>เชื่อมต่อ AI ไม่ได้</h2><p class="muted" style="margin:0">แอปติดต่อ Ollama บนคอมพิวเตอร์ไม่ได้ ลองตรวจตามนี้</p><ol><li>เปิดโปรแกรม Ollama บนคอมพิวเตอร์</li><li>ตรวจว่ามือถืออยู่ใน Wi‑Fi เดียวกับคอมพิวเตอร์</li></ol><div class="acts"><button class="btn btn-primary" data-a="retry">${ic('refresh-cw')}ลองใหม่</button><button class="btn btn-secondary" data-a="home">กลับหน้าหลัก</button></div>`}
function vSheet(){const m=mealOf(S.sheetMeal);
return `<div class="backdrop" data-a="closeSheet"></div><div class="sheet" role="dialog" aria-label="บันทึกอาหาร"><div class="grab"></div><h3>บันทึกอาหาร</h3><p class="sheet-sub">ลง${m.th}</p>
<div class="opts"><label class="opt">${ic('camera')}<span><b>ถ่ายรูป</b><small>Take photo</small></span><input type="file" accept="image/*" capture="environment" data-file></label>
<label class="opt">${ic('image')}<span><b>เลือกรูปจากคลัง</b><small>Photo library</small></span><input type="file" accept="image/*" data-file></label>
<button class="opt" data-a="pick" data-mode="new">${ic('search')}<span><b>ค้นหาเมนู</b><small>ไม่ต้องถ่ายรูป</small></span></button>
<button class="opt" data-a="sample">${ic('sparkles')}<span><b>ใช้รูปตัวอย่าง</b><small>Prototype only</small></span></button></div>
<div><div class="lbl">กินบ่อย · แตะครั้งเดียวบันทึกเลย</div><div class="chips">${frequent().map(r=>`<button class="chip" data-a="quick" data-ref="${r.id}">${r.th}</button>`).join('')}</div></div></div>`}
function plist(q){q=(q||'').trim().toLowerCase();const r=REF.filter(x=>!q||x.th.includes(q)||x.en.toLowerCase().includes(q));
return r.map(x=>`<button class="prow" data-a="pickRef" data-ref="${x.id}"><span><span class="mt" style="font-size:16px">${x.th}</span><br><span class="en">${x.en}</span></span><span class="k">${fmt(x.k*x.g/100)} kcal / จาน</span></button>`).join('')||'<div class="empty">ไม่พบเมนูนี้ในเมนูอ้างอิง</div>'}
function vPicker(){const t={rename:'เปลี่ยนเมนู',add:'เพิ่มรายการ',new:'ค้นหาเมนู'}[S.picker.mode];
return `<div class="backdrop top" data-a="closePicker"></div><div class="sheet top" role="dialog" aria-label="${t}"><div class="grab"></div><h3>${t}</h3><input class="input" id="pq" placeholder="ค้นหา เช่น ข้าวผัด หรือ pad thai" autocomplete="off"><div class="plist" id="plist">${plist('')}</div></div>`}
function vNav(){const t=[['today','วันนี้','Today','sun'],['history','ประวัติ','History','calendar-days'],['settings','ตั้งค่า','Settings','settings']];
return `${S.tab!=='settings'?`<button class="btn btn-primary fab" data-a="add">${ic('plus')}บันทึกอาหาร</button>`:''}<nav class="nav-b"><div>${t.map(x=>`<button class="${S.tab===x[0]?'on':''}" data-a="tab" data-tab="${x[0]}" ${S.tab===x[0]?'aria-current="page"':''}>${ic(x[3])}<span>${x[1]}</span><span class="en">${x[2]}</span></button>`).join('')}</div></nav>`}

function render(){const root=document.getElementById('root');let body,cls='app',label;
if(S.screen==='wait'){body=vWait();cls+=' full wait';label='รอ AI'}
else if(S.screen==='result'){body=vResult();cls+=' full';label='ผลลัพธ์'}
else if(S.screen==='error'){body=vError();cls+=' full err';label='Error'}
else{body={today:vToday,history:vHistory,settings:vSettings}[S.tab]();label={today:'วันนี้',history:'ประวัติ',settings:'ตั้งค่า'}[S.tab]}
const y=window.scrollY;
root.innerHTML=`<main class="${cls}" data-screen-label="${label}">${body}</main>${S.screen?'':vNav()}${S.sheet?vSheet():''}${S.picker?vPicker():''}${S.toast?`<div class="toast ${S.screen||S.tab==='settings'?'low':''}" role="status"><span>${S.toast.msg}</span>${S.toast.undo?'<button data-a="undo">เลิกทำ</button>':''}</div>`:''}`;
window.scrollTo(0,S._keepScroll?y:0);S._keepScroll=true;
if(window.lucide)lucide.createIcons({attrs:{'stroke-width':2.75}});
if(S.picker&&S._focusPicker){S._focusPicker=false;document.getElementById('pq').focus()}}
const go=()=>{S._keepScroll=false;render()};
function applyTheme(){document.documentElement.dataset.theme=S.theme==='auto'?'':S.theme}

/* ---------- actions ---------- */
let toastT;function toast(msg,undo){clearTimeout(toastT);S.toast={msg,undo};toastT=setTimeout(()=>{S.toast=null;render()},5000)}
const snap=()=>JSON.stringify(S.days);
let waitTimers=[];
function startScan(photo,meal){S.draft={id:uid(),editing:false,day:TK,meal:meal||S.sheetMeal||guessMeal(),photo,items:[]};S.sheet=null;S.screen='wait';S.waitStep=0;S.expanded={};go();
const t0=Date.now();clearWait();
waitTimers.push(setInterval(()=>{const e=document.getElementById('wtime');if(e)e.textContent=Math.floor((Date.now()-t0)/1000)+' วินาที'},250));
const step=i=>{S.waitStep=i;const w=document.getElementById('wstep');if(w)w.textContent=STEPS[i];document.querySelectorAll('#wdots span').forEach((s,j)=>s.classList.toggle('on',j<=i))};
waitTimers.push(setTimeout(()=>step(1),1300),setTimeout(()=>step(2),2700));
waitTimers.push(setTimeout(()=>{clearWait();if(S.simError){S.ollamaOk=false;S.screen='error'}else{S.ollamaOk=true;S.draft.items=sampleItems();S.screen='result'}go()},S.simError?2200:4000))}
function clearWait(){waitTimers.forEach(t=>{clearTimeout(t);clearInterval(t)});waitTimers=[]}
function findScan(day,meal,id){return ((S.days[day]||{})[meal]||[]).find(s=>s.id===id)}
function removeScan(day,meal,id){const a=(S.days[day]||{})[meal];if(a){const i=a.findIndex(s=>s.id===id);if(i>-1)a.splice(i,1)}}
function putScan(day,meal,sc){S.days[day]=S.days[day]||{};(S.days[day][meal]=S.days[day][meal]||[]).push(sc)}
function closeResult(){S.screen=null;S.draft=null;S.expanded={}}
function refreshTotal(){const t=document.getElementById('total');if(t)t.textContent=fmt(S.draft.items.reduce((a,i)=>a+kc(i),0))}

const A={
tab(el){S.tab=el.dataset.tab;S.goalDraft=null;if(S.tab==='history'){S.weekOffset=0;S.selDay=TK}go()},
add(el){S.sheetMeal=el.dataset.meal||guessMeal();S.sheet='add';render()},
closeSheet(){S.sheet=null;render()},
sample(){startScan('sample')},
quick(el){const r=refById(el.dataset.ref);const meal=S.sheet?S.sheetMeal:guessMeal();const s=snap();putScan(TK,meal,{id:uid(),photo:null,items:[mkItem(r)]});S.sheet=null;toast(`บันทึก${r.th}ลง${mealOf(meal).th}แล้ว`,s);render()},
edit(el){const sc=findScan(el.dataset.day,el.dataset.meal,el.dataset.id);if(!sc)return;S.draft={...JSON.parse(JSON.stringify(sc)),editing:true,origDay:el.dataset.day,origMeal:el.dataset.meal,day:el.dataset.day,meal:el.dataset.meal};S.expanded={};S.screen='result';go()},
closeResult(){closeResult();go()},
cancelWait(){clearWait();closeResult();go()},
retry(){startScan(S.draft.photo,S.draft.meal)},
home(){closeResult();S.tab='today';go()},
setMeal(el){S.draft.meal=el.dataset.meal;render()},
portion(el){const it=S.draft.items[+el.dataset.i];it.g=Math.round(it.base*+el.dataset.f);render()},
grams(el){const i=+el.dataset.i;S.expanded[i]=!S.expanded[i];render()},
delItem(el){const i=+el.dataset.i;S.draft.items.splice(i,1);const ex={};Object.keys(S.expanded).forEach(k=>{k=+k;if(k<i)ex[k]=S.expanded[k];else if(k>i)ex[k-1]=S.expanded[k]});S.expanded=ex;render()},
pick(el){S.picker={mode:el.dataset.mode,i:+el.dataset.i};S._focusPicker=true;render()},
closePicker(){S.picker=null;render()},
pickRef(el){const r=refById(el.dataset.ref),p=S.picker;S.picker=null;
if(p.mode==='rename'){const old=S.draft.items[p.i];const f=old.g/old.base;S.draft.items[p.i]=mkItem(r,[.5,1,1.5].includes(+f.toFixed(2))?f:1)}
else if(p.mode==='add'){S.draft.items.push(mkItem(r))}
else{S.sheet=null;S.draft={id:uid(),editing:false,day:TK,meal:S.sheetMeal||guessMeal(),photo:null,items:[mkItem(r)]};S.expanded={};S.screen='result';return go()}
render()},
save(){const d=S.draft,s=snap();if(d.editing)removeScan(d.origDay,d.origMeal,d.id);
if(d.items.length)putScan(d.day,d.meal,{id:d.id,photo:d.photo,items:d.items});
const msg=!d.items.length?'ลบการสแกนแล้ว':d.editing?(d.meal!==d.origMeal?`ย้ายไป${mealOf(d.meal).th}แล้ว`:'แก้ไขแล้ว'):`บันทึกลง${mealOf(d.meal).th}แล้ว · ${fmt(scanK(d))} kcal`;
if(d.editing&&S.tab==='history')S.selDay=d.day;closeResult();toast(msg,s);go()},
delScan(){const d=S.draft,s=snap();removeScan(d.origDay,d.origMeal,d.id);closeResult();toast('ลบการสแกนแล้ว',s);go()},
undo(){if(S.toast&&S.toast.undo)S.days=JSON.parse(S.toast.undo);clearTimeout(toastT);S.toast=null;render()},
week(el){S.weekOffset=Math.min(0,S.weekOffset+ +el.dataset.d);S.selDay=dkey(addDays(TODAY,S.weekOffset*7));render()},
day(el){S.selDay=el.dataset.k;render()},
goalChip(el){S.goalDraft=+el.dataset.v;render()},
saveGoal(){const v=+(document.getElementById('goalIn').value);if(!(v>=800&&v<=5000)){toast('กรอกเป้าระหว่าง 800–5,000 kcal');return render()}
S.goal=Math.round(v);S.goalSet=true;S.goalDraft=null;ls.set('goal',S.goal);ls.set('goalSet',true);toast(`ตั้งเป้า ${fmt(S.goal)} kcal แล้ว`);render()},
test(){S.testing=true;render();setTimeout(()=>{S.testing=false;S.ollamaOk=!S.simError;toast(S.ollamaOk?'เชื่อมต่อ Ollama ได้':'เชื่อมต่อ Ollama ไม่ได้');render()},1200)}};

document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el||el.disabled)return;const f=A[el.dataset.a];if(f){e.preventDefault();f(el)}});
document.addEventListener('input',e=>{const t=e.target;
if(t.id==='pq'){document.getElementById('plist').innerHTML=plist(t.value)}
else if(t.classList.contains('range')){const i=+t.dataset.i,it=S.draft.items[i];it.g=+t.value;document.querySelector(`[data-k="${i}"]`).textContent=fmt(kc(it));document.querySelector(`[data-g="${i}"]`).textContent=it.g;
document.querySelectorAll(`[data-a="portion"][data-i="${i}"]`).forEach(c=>c.classList.toggle('on',Math.round(it.base*+c.dataset.f)===it.g));refreshTotal()}
else if(t.id==='goalIn'){S.goalDraft=t.value;document.querySelectorAll('[data-a="goalChip"]').forEach(c=>c.classList.toggle('on',+c.dataset.v===+t.value))}});
document.addEventListener('change',e=>{const t=e.target;
if(t.matches('[data-file]')&&t.files[0]){const img=new Image();img.onload=()=>{const s=240/Math.max(img.width,img.height);const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(img.src);startScan(c.toDataURL('image/jpeg',.8))};img.src=URL.createObjectURL(t.files[0])}
else if(t.name==='model'){S.model=t.value;ls.set('model',t.value);render()}
else if(t.name==='theme'){S.theme=t.value;ls.set('theme',t.value);applyTheme()}
else if(t.id==='simErr'){S.simError=t.checked;if(!t.checked)S.ollamaOk=true;render()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(S.picker)A.closePicker();else if(S.sheet)A.closeSheet()}});
window.CC={setTheme(t){S.theme=t;ls.set('theme',t);applyTheme();render()}};
applyTheme();render();
