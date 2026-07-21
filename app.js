
const PEOPLE=["Augusto","Lucas","Nicolas"];
const COLORS={"Augusto":"#ff5a3c","Lucas":"#3b82f6","Nicolas":"#2ea043"};
const FLAG_BR='<svg class="flag" viewBox="0 0 28 20"><rect width="28" height="20" fill="#009c3b"/><path d="M14 3 25 10 14 17 3 10Z" fill="#ffdf00"/><circle cx="14" cy="10" r="4" fill="#002776"/></svg>';
const FLAG_ES='<svg class="flag" viewBox="0 0 28 20"><rect width="28" height="20" fill="#c60b1e"/><rect y="5.5" width="28" height="9" fill="#ffc400"/></svg>';
const ROT=[[3,2,2],[2,3,2],[2,2,3]];
// dias: nome curto, foco, label
const DAYS=[
  {d:"Seg",f:"prod",w:"vídeos"},{d:"Ter",f:"prod",w:"vídeos"},
  {d:"Qua",f:"tool",w:"ferramenta"},{d:"Qui",f:"tool",w:"ferramenta"},
  {d:"Sex",f:"tool",w:"ferramenta"},{d:"Sáb",f:"",w:"opcional"},{d:"Dom",f:"",w:"opcional"}
];
const FULL=["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
const COURSE_TOTAL=134;

const KEY="top10-app";
let db=load();
// tempo do curso guardado em MINUTOS (7h já feitas = 420)
if(db.courseMinutes==null) db.courseMinutes = db.courseHours!=null ? Math.round(db.courseHours*60) : 420;

// dia de hoje (0=Seg ... 6=Dom); JS getDay: Dom=0
const jsDay=new Date().getDay();
const todayIdx=(jsDay+6)%7;
let selDay=todayIdx;   // dia que está sendo visualizado

// calendário / observações do dia
const MES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const DOW=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const _now=new Date();
const todayYMD=_now.getFullYear()+"-"+String(_now.getMonth()+1).padStart(2,"0")+"-"+String(_now.getDate()).padStart(2,"0");
let calYear=_now.getFullYear(), calMonth=_now.getMonth();
const minY=_now.getFullYear(), minM=_now.getMonth();   // não voltar antes deste mês/ano

// semana automática pela data
function ymd(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function mondayOf(d){const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
const thisMonday=mondayOf(new Date());
if(!db.startDate) db.startDate=ymd(thisMonday);
const startMon=mondayOf(new Date(db.startDate+"T00:00:00"));
const curWeekNum=Math.max(1,Math.round((thisMonday-startMon)/(7*86400000))+1);
let curWeek=curWeekNum;   // abre sempre na semana certa
function weekRange(wn){const s=new Date(startMon);s.setDate(s.getDate()+(wn-1)*7);const e=new Date(s);e.setDate(e.getDate()+6);const f=d=>String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0");return f(s)+" – "+f(e);}
function escapeHtml(s){return (s+"").replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return{}}}
function save(){
  localStorage.setItem(KEY,JSON.stringify(db));
  syncPush();
  const s=document.getElementById("saved");s.textContent="salvo ✓";
  setTimeout(()=>s.textContent="",1200);
}
function wk(){db.weeks=db.weeks||{};db.weeks[curWeek]=db.weeks[curWeek]||{byPerson:{}};if(!db.weeks[curWeek].byPerson)db.weeks[curWeek].byPerson={};return db.weeks[curWeek];}

// minutos -> "Xh YYmin"
function fmt(min){min=Math.round(min);const h=Math.floor(min/60),m=min%60;if(h&&m)return h+"h "+m+"min";if(h)return h+"h";return m+"min";}
// dias desde uma data "YYYY-MM-DD" (Infinity se nunca)
function daysSince(s){if(!s)return Infinity;const d=new Date(s+"T00:00:00");const n=new Date();n.setHours(0,0,0,0);return Math.round((n-d)/86400000);}
// texto ("1h30", "45min", "2h", "1:30", "90") -> minutos (0 se inválido)
function parseTime(s){
  s=(s||"").trim().toLowerCase().replace(",",".");
  if(!s)return 0;
  let m;
  if(m=s.match(/^(\d+):(\d{1,2})$/))return (+m[1])*60+(+m[2]);
  if(m=s.match(/^(\d+(?:\.\d+)?)\s*h\s*(\d+)?\s*(?:m(?:in)?)?$/))return Math.round((+m[1])*60+(m[2]?+m[2]:0));
  if(m=s.match(/^(\d+)\s*m(?:in)?$/))return +m[1];
  if(m=s.match(/^(\d+(?:\.\d+)?)$/))return Math.round(+m[1]); // número sozinho = minutos
  return 0;
}

function render(){
  const cyc=(curWeek-1)%3;
  document.getElementById("weekLbl").textContent="Semana "+curWeek;
  const isCur=curWeek===curWeekNum;
  document.getElementById("cycleInfo").innerHTML=
    `${weekRange(curWeek)} · vez extra: <b style="color:${COLORS[PEOPLE[cyc]]}">${PEOPLE[cyc]}</b>`+
    (isCur?` · <b style="color:var(--accent)">semana atual</b>`:` · <span class="backhoje" id="goCur">ir pra semana atual</span>`);
  const w=wk();

  // dia visualizado (hoje por padrão, ou o que foi clicado)
  const sd=DAYS[selDay];
  const dc=sd.f==="prod"?"#ff5a3c":sd.f==="tool"?"#3b82f6":"#e3b341"; // cor do dia (livre/opcional = amarelo)
  const focusTxt=sd.f==="prod"?"produzir vídeos":sd.f==="tool"?"trabalhar na ferramenta":sd.w;
  const isToday=selDay===todayIdx;
  const tEl=document.getElementById("today");
  tEl.style.borderColor=dc;
  tEl.style.background=`linear-gradient(90deg, ${dc}28, transparent)`;
  tEl.innerHTML=isToday
    ? `<span class="em">📍</span> Hoje é <b style="color:${dc}">${FULL[selDay]}</b> — dia de <b style="color:${dc}">${focusTxt}</b>`
    : `<span class="em">👁️</span> Vendo <b style="color:${dc}">${FULL[selDay]}</b> — dia de <b style="color:${dc}">${focusTxt}</b><span class="backhoje" id="backHoje">voltar pra hoje</span>`;

  // blocos do dia: dia de semana = rotina; sábado/domingo = tudo "livre"
  const wb=document.getElementById("workBlock");
  // a borda do bloco de trabalho é controlada por highlightNow (só acende no horário atual)
  if(sd.f){
    ["blk1n","blk3n","blk4n"].forEach(id=>document.getElementById(id).style.color="");
    document.getElementById("blk1n").textContent="Chegada e almoço";
    document.getElementById("blk3n").textContent="Pausa";
    document.getElementById("blk4n").textContent="Curso de IA";
    const wt=sd.f==="prod"?"Produção de vídeos":"Ferramenta";
    document.getElementById("workText").innerHTML=`Trabalho · 5h &nbsp;→&nbsp; <span style="color:${dc}">${wt}</span>`;
  }else{
    ["blk1n","blk3n","blk4n","workText"].forEach(id=>{const el=document.getElementById(id);el.textContent="opcional";el.style.color="#e3b341";});
  }

  // faixa da semana (clicável)
  document.getElementById("week").innerHTML=DAYS.map((x,i)=>
    `<div class="wd ${x.f||"free"} ${i===selDay?"on":""}" data-day="${i}"><div class="d">${x.d}</div><div class="w">${x.w}</div>${i===todayIdx?'<span class="hj">HOJE</span>':''}</div>`
  ).join("");

  // vídeos da semana = soma do rodízio (PT e ES separados)
  let wpt=0,wes=0;
  PEOPLE.forEach(p=>{const bp=w.byPerson[p]||{};wpt+=bp.pt||0;wes+=bp.es||0;});
  document.getElementById("ptTxt").textContent=wpt;
  document.getElementById("esTxt").textContent=wes;
  document.getElementById("ptBar").style.width=Math.min(100,wpt/7*100)+"%";
  document.getElementById("esBar").style.width=Math.min(100,wes/7*100)+"%";
  const wok=document.getElementById("weekOk"); if(wok) wok.style.display=(wpt>=7&&wes>=7)?"inline-block":"none";

  // rodízio (cada pessoa anota PT e ES)
  const q=ROT[cyc];
  document.getElementById("rodizio").innerHTML=PEOPLE.map((p,i)=>{
    const bp=w.byPerson[p]||{pt:0,es:0};
    const cnt=(ch,v)=>`<div class="counter"><button data-person="${p}" data-ch="${ch}" data-d="1">+</button><span class="val">${v||0}</span><button data-person="${p}" data-ch="${ch}" data-d="-1">−</button></div>`;
    return `<tr>
      <td><span class="dot" style="background:${COLORS[p]}"></span>${p}</td>
      <td>${q[i]}</td>
      <td>${cnt("pt",bp.pt)}</td>
      <td>${cnt("es",bp.es)}</td></tr>`;
  }).join("");

  // curso (em minutos)
  const tot=COURSE_TOTAL*60;
  const min=db.courseMinutes;
  const pct=Math.min(100,min/tot*100);
  document.getElementById("cHrs").textContent=fmt(min);
  const rg=document.getElementById("cRange");
  rg.value=Math.floor(min/60);
  rg.style.background=`linear-gradient(90deg, var(--accent) ${pct}%, var(--panel2) ${pct}%)`;
  document.getElementById("cPct").textContent=Math.round(pct)+"%";
  document.getElementById("cLeft").textContent=fmt(Math.max(0,tot-min));

  // visão geral (soma de todas as semanas)
  let sPt=0,sEs=0;const per={};PEOPLE.forEach(p=>per[p]=0);
  Object.values(db.weeks||{}).forEach(x=>{
    PEOPLE.forEach(p=>{const bp=(x.byPerson&&x.byPerson[p])||{};per[p]+=(bp.pt||0)+(bp.es||0);sPt+=bp.pt||0;sEs+=bp.es||0;});
  });
  const tile=(k,v,c)=>`<div class="tile"><div class="k">${k}</div><div class="v"${c?` style="color:${c}"`:""}>${v}</div></div>`;
  document.getElementById("summary").innerHTML=
    tile(FLAG_BR+"Publicados PT",sPt)+tile(FLAG_ES+"Publicados ES",sEs)+
    PEOPLE.map(p=>tile("Feitos · "+p,per[p],COLORS[p])).join("")+
    tile("Curso de IA",fmt(db.courseMinutes))+tile("Total (PT+ES)",sPt+sEs,"var(--accent)");

  renderDay();
  renderCal();

  // aviso de backup
  const warnEl=document.getElementById("backupWarn");
  const d=daysSince(db.lastBackup);
  if(d>=7){
    warnEl.style.display="flex";
    warnEl.innerHTML=`<span>💾</span><span>${db.lastBackup?("Último backup há <b>"+d+" dia"+(d>1?"s":"")+"</b>. Faça uma cópia pra não perder nada."):"Você <b>ainda não fez backup</b>. Faça uma cópia pra proteger os dados."}</span><button id="doBackup">Fazer backup agora</button>`;
  }else{ warnEl.style.display="none"; }
}

document.getElementById("prevW").onclick=()=>{if(curWeek>1){curWeek--;save();render()}};
document.getElementById("nextW").onclick=()=>{curWeek++;save();render()};
document.getElementById("dayNote").addEventListener("input",e=>{db.days=db.days||{};db.days[todayYMD]=db.days[todayYMD]||{};db.days[todayYMD].note=e.target.value;save();});
document.getElementById("calPrev").onclick=()=>{if(calYear<minY||(calYear===minY&&calMonth<=minM))return;calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCal();};
document.getElementById("calNext").onclick=()=>{calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCal();};
document.getElementById("calToggle").onclick=()=>{
  const b=document.getElementById("calBody"),btn=document.getElementById("calToggle");
  if(b.style.display==="none"){b.style.display="block";btn.textContent="📅 Fechar calendário";renderCal();}
  else{b.style.display="none";btn.textContent="📅 Abrir calendário";}
};

function addTime(){
  const inp=document.getElementById("addTime");
  const v=parseTime(inp.value);
  if(!v){alert("Não entendi o tempo. Tente algo como: 1h30, 45min, 2h, 1:30 ou 90 (minutos).");return;}
  db.courseMinutesPrev=db.courseMinutes;
  db.courseMinutes=Math.min(COURSE_TOTAL*60,db.courseMinutes+v);
  inp.value="";save();render();
}
document.getElementById("addBtn").onclick=addTime;
document.getElementById("addTime").addEventListener("keydown",e=>{if(e.key==="Enter")addTime();});
// slider define as HORAS (mantém os minutos que já estavam)
document.getElementById("cRange").addEventListener("pointerdown",()=>{db.courseMinutesPrev=db.courseMinutes;});
document.getElementById("cRange").addEventListener("input",e=>{
  db.courseMinutes=(+e.target.value)*60 + (db.courseMinutes%60);
  render();
});
document.getElementById("cRange").addEventListener("change",save);
// "Voltar": desfaz a última mudança (restaura o valor anterior, guardado nos dados = sobrevive ao F5). Clicar de novo alterna.
document.getElementById("resetBtn").onclick=()=>{
  if(db.courseMinutesPrev==null)return;
  const atual=db.courseMinutes; db.courseMinutes=db.courseMinutesPrev; db.courseMinutesPrev=atual;
  save();render();
};
document.body.addEventListener("click",e=>{
  const per=e.target.closest("[data-person]");
  if(per){const w=wk();const p=per.dataset.person,ch=per.dataset.ch;w.byPerson[p]=w.byPerson[p]||{pt:0,es:0};w.byPerson[p][ch]=Math.max(0,(w.byPerson[p][ch]||0)+ +per.dataset.d);save();render();return;}
  const day=e.target.closest("[data-day]");
  if(day){selDay=+day.dataset.day;render();highlightNow();return;}
  if(e.target.id==="backHoje"){selDay=todayIdx;render();highlightNow();return;}
  if(e.target.id==="goCur"){curWeek=curWeekNum;render();return;}
  if(e.target.id==="doBackup"){doExport();return;}
  if(e.target.id==="saveDay"){saveDay();return;}
  const cal=e.target.closest("[data-cal]");
  if(cal){showDay(cal.dataset.cal);return;}
  if(e.target.id==="createBtn"){groupCreate();return;}
  if(e.target.id==="joinBtn"){groupJoin(document.getElementById("joinCode").value);return;}
  if(e.target.id==="copyCode"){if(navigator.clipboard)navigator.clipboard.writeText(groupCode);e.target.textContent="Copiado!";setTimeout(()=>e.target.textContent="Copiar código",1200);return;}
  if(e.target.id==="leaveGroup"){if(confirm("Sair do grupo? Este PC volta a contar sozinho."))groupLeave();return;}
});

function doExport(){
  db.lastBackup=ymd(new Date());
  const json=JSON.stringify(db,null,2);
  const name="top10-backup-"+db.lastBackup+".json";
  const url="data:application/json;charset=utf-8,"+encodeURIComponent(json);
  if(typeof chrome!=="undefined" && chrome.downloads && chrome.downloads.download){
    chrome.downloads.download({url:url, filename:"Backup Cronograma/"+name, conflictAction:"uniquify", saveAs:false});
  }else{
    const a=document.createElement("a");a.href=url;a.download=name;a.click();
  }
  save();render();
}
document.getElementById("exportBtn").onclick=doExport;
document.getElementById("importBtn").onclick=()=>document.getElementById("importFile").click();
document.getElementById("importFile").onchange=e=>{
  const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const novo=JSON.parse(r.result);if(!confirm("Importar vai SUBSTITUIR os dados atuais — e como sincroniza, muda pros três. Continuar?"))return;db=novo;if(db.courseMinutes==null)db.courseMinutes=db.courseHours!=null?Math.round(db.courseHours*60):420;save();render();alert("Backup importado ✓")}catch(x){alert("Arquivo inválido")}};
  r.readAsText(f);
};

// rede de segurança: grava também ao fechar/atualizar a aba
window.addEventListener("beforeunload",()=>{
  autoSaveDay();   // salva o registro do dia automaticamente ao fechar
  try{localStorage.setItem(KEY,JSON.stringify(db));}catch(e){}
  try{ if(groupCode) fetch(JB+"/"+groupCode,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(db),keepalive:true}); }catch(e){}
});

document.addEventListener("visibilitychange",()=>{
  if(document.hidden){ autoSaveDay(); save(); return; }   // trocou de aba/minimizou = salva o dia
  const n=new Date();
  const nowYMD=n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0");
  if(nowYMD!==todayYMD) location.reload();   // virou o dia: recarrega pra semana/dia certos
});

// ---- Sincronização em GRUPO (sem cadastro) — os 3 veem os mesmos números ----
const JB="https://jsonblob.com/api/jsonBlob";
const GKEY="top10-group";
const NUM={Augusto:1,Nicolas:2,Lucas:3};
// cofre dos 3: fica em config.js (local, fora do GitHub) pra não vazar no repositório público
const SHARED_GROUP=(typeof window!=="undefined"&&window.TOP10_GROUP)?window.TOP10_GROUP:"";
let groupCode=SHARED_GROUP;
let pollTimer=null,pushTimer=null,applyingRemote=false,pendingPush=false;

function syncStatus(t){const e=document.getElementById("syncTxt");if(e)e.textContent=t;}
function startPoll(){if(pollTimer)clearInterval(pollTimer);pollTimer=setInterval(groupPull,8000);}
async function groupPull(){
  if(!groupCode||pendingPush)return;   // não puxa enquanto há marcação local ainda não enviada
  try{
    const r=await fetch(JB+"/"+groupCode,{cache:"no-store",headers:{"Accept":"application/json"}});
    if(r.ok){const v=await r.json();if(v&&typeof v==="object"){applyingRemote=true;db=v;if(db.courseMinutes==null)db.courseMinutes=420;localStorage.setItem(KEY,JSON.stringify(db));render();renderSync();applyingRemote=false;}}
    syncStatus("● sincronizado — os 3 veem igual");
  }catch(e){syncStatus("● sem conexão (tentando de novo)");}
}
async function groupPush(force){
  if(!groupCode||(applyingRemote&&!force))return;
  try{await fetch(JB+"/"+groupCode,{method:"PUT",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(db)});}catch(e){}
}
function syncPush(){if(!groupCode||applyingRemote)return;pendingPush=true;clearTimeout(pushTimer);pushTimer=setTimeout(async()=>{await groupPush(true);pendingPush=false;},400);}
async function groupCreate(){
  syncStatus("● criando grupo…");
  try{
    const r=await fetch(JB,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(db)});
    let b=r.headers.get("X-jsonblob-id");
    if(!b){const loc=r.headers.get("Location")||"";b=loc.split("/").pop();}
    if(!b)throw 0;
    groupCode=b;localStorage.setItem(GKEY,b);
    startPoll();renderSync();
    syncStatus("● grupo criado — copie o código");
  }catch(e){syncStatus("● erro ao criar (tente de novo)");}
}
async function groupJoin(code){
  code=(code||"").trim();
  if(!code){alert("Cole o código do grupo primeiro.");return;}
  groupCode=code;localStorage.setItem(GKEY,code);
  await groupPull();startPoll();renderSync();
}
function groupLeave(){groupCode="";localStorage.removeItem(GKEY);if(pollTimer)clearInterval(pollTimer);renderSync();syncStatus("● fora do grupo (só neste PC)");}

// ---- Observações do dia + Calendário ----
function renderDay(){
  const t=document.getElementById("dayNote");if(!t)return;
  const e=(db.days&&db.days[todayYMD])||{};
  if(document.activeElement!==t) t.value=e.note||"";
  const ds=document.getElementById("daySaved");
  if(ds) ds.textContent=e.savedAt?("Salvo hoje às "+e.savedAt):"";
}
// grava o registro do dia (usado pelo botão e pelo save automático ao fechar)
function gravarDia(){
  db.days=db.days||{};
  const bp=(db.weeks&&db.weeks[curWeek]&&db.weeks[curWeek].byPerson)?JSON.parse(JSON.stringify(db.weeks[curWeek].byPerson)):{};
  const n=new Date(), hh=String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0");
  const t=document.getElementById("dayNote");
  const cur=db.days[todayYMD]||{};
  db.days[todayYMD]={note:t?t.value:(cur.note||""), snapshot:bp, week:curWeek, courseMinutes:db.courseMinutes, savedAt:hh};
}
function saveDay(){
  gravarDia();
  save(); renderDay(); renderCal();
  const ds=document.getElementById("daySaved"); if(ds) ds.textContent="Tudo salvo ✓ — aparece pros três";
}
function autoSaveDay(){ try{ gravarDia(); localStorage.setItem(KEY,JSON.stringify(db)); }catch(e){} }
function renderCal(){
  const host=document.getElementById("calGrid");if(!host)return;
  document.getElementById("calLbl").textContent=MES[calMonth]+" "+calYear;
  const pv=document.getElementById("calPrev"), atMin=(calYear<minY)||(calYear===minY&&calMonth<=minM);
  if(pv){pv.disabled=atMin;pv.style.opacity=atMin?"0.3":"1";pv.style.cursor=atMin?"default":"pointer";}
  const offset=new Date(calYear,calMonth,1).getDay();
  const days=new Date(calYear,calMonth+1,0).getDate();
  let html='<table class="caltbl"><thead><tr>'+DOW.map(d=>`<th>${d}</th>`).join("")+'</tr></thead><tbody><tr>';
  let col=0;
  for(let i=0;i<offset;i++){html+='<td></td>';col++;}
  for(let d=1;d<=days;d++){
    const key=calYear+"-"+String(calMonth+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    const e=db.days&&db.days[key];
    const has=e&&(((e.note||"").trim())||e.savedAt);
    html+=`<td><div class="cd ${has?"has":""} ${key===todayYMD?"today":""}" ${has?`data-cal="${key}"`:""}>${d}${has?'<span class="cdot"></span>':''}</div></td>`;
    col++;
    if(col===7 && d<days){html+='</tr><tr>';col=0;}
  }
  while(col>0 && col<7){html+='<td></td>';col++;}
  html+='</tr></tbody></table>';
  host.innerHTML=html;
}
function showDay(key){
  const e=db.days&&db.days[key]; const det=document.getElementById("calDetail");
  const parts=key.split("-");
  if(!e){det.className="caldetail muted";det.textContent="Sem registro nesse dia.";return;}
  let snap="";
  if(e.snapshot){snap="<div style='margin-top:10px'>"+PEOPLE.map(p=>{const bp=e.snapshot[p]||{};return `<b style="color:${COLORS[p]}">${p}</b>: PT ${bp.pt||0} · ES ${bp.es||0}`;}).join("<br>")+"</div>";}
  if(e.courseMinutes!=null) snap+=`<div style='margin-top:8px'>Curso nesse dia: <b>${fmt(e.courseMinutes)}</b></div>`;
  det.className="caldetail";
  det.innerHTML=`<b>${parts[2]}/${parts[1]}/${parts[0]}</b>${e.savedAt?` · salvo às ${e.savedAt}`:""}${e.note&&e.note.trim()?`<div class="cnote">${escapeHtml(e.note)}</div>`:""}${snap}`;
}

function renderSync(){
  const box=document.getElementById("syncBox");if(!box)return;
  box.innerHTML=`<div class="syncrow"><span>✅ Tudo conectado — os 3 anotam e veem os mesmos números.</span></div>`;
}

// brilho no bloco do horário atual
function highlightNow(){
  const n=new Date(), mins=n.getHours()*60+n.getMinutes();
  const f=(DAYS[selDay]||{}).f; // prod=laranja(padrão), tool=azul, fim de semana(vazio)=amarelo
  let g="", bc="var(--accent)";
  if(f==="tool"){g="gblue"; bc="var(--blue)";}
  else if(!f){g="gyellow"; bc="#e3b341";}
  const isToday = (selDay===todayIdx); // só apaga horários passados quando vê o dia de hoje
  document.querySelectorAll(".block[data-start]").forEach(b=>{
    const on = mins>=(+b.dataset.start) && mins<(+b.dataset.end);
    const past = isToday && mins>=(+b.dataset.end); // já terminou hoje
    b.classList.toggle("nowglow", on);
    b.classList.toggle("past", past); // fica apagadinho; volta ao normal ao passar o mouse
    b.classList.remove("gblue","gyellow");
    if(on && g) b.classList.add(g);
    // borda de destaque do bloco de trabalho: só acende no horário atual, senão normaliza
    if(b.classList.contains("work")) b.style.borderColor = on ? bc : "";
  });
}
setInterval(highlightNow,30000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)highlightNow();});

// backup automático toda sexta (uma vez por sexta)
function autoBackupFriday(){
  try{ if(new Date().getDay()===5 && daysSince(db.lastBackup)>=1) doExport(); }catch(e){}
}

render();
renderSync();
highlightNow();
if(groupCode){startPoll();groupPull().then(autoBackupFriday);}else{syncStatus("● só neste PC (fora de grupo)");autoBackupFriday();}

