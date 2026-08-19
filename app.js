const LS_KEY="skolbladet-v1-nlv3";
const defaults=()=>({id:"blad-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),school:"NLV Bergnäset",title:"Veckobrev Vecka 34",subtitle:"Information från rektor till alla vårdnadshavare",date:new Date().toLocaleDateString("sv-SE",{day:"numeric",month:"long",year:"numeric"}),issue:"Nr 34 • 2026",className:"Åk F–6",author:"Rektor Anna Lind",ingress:"Hej alla familjer på NLV Bergnäset! Första veckan efter sommarlovet har varit varm, trygg och full av skratt. Här kommer det viktigaste inför veckan som kommer.",footer:"NLV Bergnäset • Bergnäsvägen 12, 972 53 Luleå • 0920-45 30 00 • bergnaset@skolalulea.se",color:"#0B2A4A",template:"modern",articles:[
{id:"a1",title:"En trygg start på terminen",text:"Vi har ägnat första dagarna åt att bygga gemenskap. Alla klasser har vandrat runt Bergnäset, satt upp trivselregler och haft värdegrundssamtal.\n\nPå fredagen samlades hela skolan för utedag vid skogen – kojbygge, allemansrätt och korvgrillning. Tack till alla föräldrar som kom och hjälpte till!",image:"https://picsum.photos/seed/nlv-trygg/900/650",tag:"Nyhet",caption:"Utedag med hela skolan – fredag vid skogen."},
{id:"a2",title:"Praktisk information",text:"• Läxor startar v.35. Information kommer via SchoolSoft.\n• Utvecklingssamtal v.36–37 – boka tid i appen.\n• Fritids stängt för planering fre 29/8 (jourfritids för anmälda).",image:"",tag:"Info"},
{id:"a3",title:"Matsedel v.34",text:"Mån: Köttbullar, potatismos & lingon\nTis: Fiskgratäng med potatis\nOns: Kycklinggryta med ris\nTor: Vegetarisk lasagne\nFre: Tacos – sallad, bröd & tillbehör",image:"https://picsum.photos/seed/nlv-mat/800/600",tag:"Matsedel",caption:"All mat lagas från grunden i vårt kök."}
],createdAt:Date.now(),updatedAt:Date.now()});

const examples={
veckobrev:{school:"NLV Bergnäset",title:"Veckobrev Vecka 34",subtitle:"Första skolveckan avklarad – tack för en fin start!",date:"18–22 augusti 2026",issue:"Nr 34 • 2026",className:"Åk F–3",author:"Anna Lind, rektor",ingress:"Det har varit en varm och trygg första vecka. Tack till alla elever, vårdnadshavare och pedagoger som burit tillsammans.",color:"#0B2A4A",template:"modern",articles:[
{id:"a1",title:"Så var första veckan",text:"Vi har fokuserat på relationer och rutiner. Kompispromenader, trivselregler och trygghetsvandringar har stått i fokus.\n\nGlädjen har varit stor att ses igen.",image:"https://picsum.photos/seed/bergnaset1/900/650",tag:"Tillbaka i skolan",caption:"Kompispromenad runt Bergnäset, Åk 2."},
{id:"a2",title:"Läxor & samtal",text:"Läxor drar igång v.35. Inbjudan till utvecklingssamtal skickas via SchoolSoft 2–12 september.",image:"",tag:"Viktigt"},
{id:"a3",title:"Matsedel",text:"Mån: Köttbullar\nTis: Fiskgratäng\nOns: Kycklinggryta\nTor: Vegolasagne\nFre: Tacos",image:"https://picsum.photos/seed/food1/800/600",tag:"Matsedel",caption:"Salladsbuffé varje dag."}
],footer:"NLV Bergnäset • 0920-45 30 00 • bergnaset@skolalulea.se"},
event:{school:"NLV Bergnäset",title:"Höstfesten 2026",subtitle:"Lördag 13 september kl 11–15 • Hela familjen välkommen",date:"Lördag 13 september 2026",issue:"Special • Höst",className:"Festkommittén",author:"NLV Bergnäset",ingress:"Dags för årets mysigaste dag! Loppis, café, körsång, chokladhjul och matchen elever mot föräldrar.",color:"#7A3A2E",template:"colorful",articles:[
{id:"a1",title:"Program",text:"11:00 Invigning med rektor\n11:30 Skolkörens uppträdande\n12:00 Chokladhjul & fiskdamm\n13:00 Fotboll: elever–föräldrar\n14:30 Lottdragning",image:"https://picsum.photos/seed/fest1/900/650",tag:"Program",caption:"Skolkörens uppträdande i aulan."},
{id:"a2",title:"Hjälp oss",text:"Vi behöver bagare, cafévärdar och bärare. Anmäl dig via SchoolSoft senast 5/9. Alla bidrag räknas.",image:"",tag:"Engagera dig"},
{id:"a3",title:"Loppis",text:"Boka bord 100 kr. Swisha 123 123 45 67 (märk NLV Loppis + namn). 40 platser – först till kvarn.",image:"",tag:"Loppis"}
],footer:"Frågor? fest@nlvbergnaset.se • @nlvbergnaset"},
matsedel:{school:"NLV Bergnäset",title:"Matsedel September",subtitle:"All mat lagas från grunden i vårt eget kök",date:"September 2026",issue:"Köket • Sept",className:"Kök & Matsal",author:"Köket / Maria",ingress:"Här är höstens matsedel. Vi lagar varierat, näringsrikt och med salladsbuffé varje dag.",color:"#1A6B4A",template:"classic",articles:[
{id:"a1",title:"Vecka 36–39",text:"v.36: Korv stroganoff, broccoligratäng, pannkaksbuffé\nv.37: Lasagne, fiskburgare, kycklingcurry\nv.38: Köttfärssås, rotfruktslåda, tacos\nv.39: Ärtsoppa & pannkakor, hamburgare, ugnsfisk",image:"https://picsum.photos/seed/food2/800/600",tag:"Matsedel",caption:"Sallad, knäckebröd och mjölk varje dag."},
{id:"a2",title:"Specialkost",text:"Anmäl via blanketten på hemsidan senast 1/9. Vid frågor: maria@nlvbergnaset.se",image:"",tag:"Specialkost"}
],footer:"Köket 07:30–14:00 • 0920-45 30 10"},
norrsken:{school:"NLV Bergnäset",title:"Norrskensveckan",subtitle:"När himlen dansar över Bergnäset – tema rymden",date:"15–19 september 2026",issue:"Tema • Rymden",className:"NO-lärarna",author:"NLV Bergnäset",ingress:"En vecka om rymden, norrsken och vår plats i universum. Experiment, pyssel och kvällsvisning för familjer.",color:"#3C3A6B",template:"dark",articles:[
{id:"a1",title:"Experiment i klassrummet",text:"Bygg raket, testa norrskensslime och lär dig varför himlen lyser. Stationer i alla klassrum.",image:"https://picsum.photos/seed/rymd/900/650",tag:"Experiment",caption:"Raketbygge i Åk 4."},
{id:"a2",title:"Kvällsvisning",text:"Torsdag 18/9 kl 19:00 på skolgården. Ta med filt och varm choklad – vi spanar norrsken med teleskop.",image:"",tag:"18 sept 19:00"},
{id:"a3",title:"Tävling",text:"Rita ditt norrsken – lämna in senast 19/9. Vinnaren får sin bild på nästa blad.",image:"",tag:"Tävling"}
],footer:"NLV Bergnäset – där nyfikenheten lyser ✨"}
};

let state=load();let currentId=state[0]?.id||null;let currentTab="editor";let zoom=100;
const $=s=>document.querySelector(s);
const listEl=$("#list"),emptyListEl=$("#emptyList"),countBadge=$("#countBadge"),searchInput=$("#searchInput"),miniPreview=$("#miniPreview"),fullPreview=$("#fullPreview"),articlesEditor=$("#articlesEditor"),viewEditor=$("#viewEditor"),viewPreview=$("#viewPreview"),viewWelcome=$("#viewWelcome");
function load(){try{let raw=localStorage.getItem(LS_KEY);if(!raw){for(const k of["skolbladet-v1-nlv3","skolbladet-v1-nlv2","skolbladet-v1-nlv","skolbladet-v1"]){const o=localStorage.getItem(k);if(o){raw=o;break}} if(raw) localStorage.setItem(LS_KEY,raw)} if(raw){const arr=JSON.parse(raw);if(Array.isArray(arr)&&arr.length) return arr.map(o=>({issue:o.issue||"Nr 1",subtitle:o.subtitle||"",color:o.color||"#0B2A4A",...o,articles:(o.articles||[]).map(a=>({tag:a.tag||"Nyhet",caption:a.caption||"",...a}))}))}}catch(e){}return[]}
function save(){localStorage.setItem(LS_KEY,JSON.stringify(state))}
function getCurrent(){return state.find(s=>s.id===currentId)||null}
function setCurrent(id){currentId=id;render()}
function createNew(patch=null){const d=defaults();if(patch) Object.assign(d,patch,{id:d.id,createdAt:Date.now(),updatedAt:Date.now()});d.articles=d.articles.map(a=>({...a,id:a.id||"a"+Math.random().toString(36).slice(2,6)}));state.unshift(d);save();setCurrent(d.id)}
function duplicateCurrent(){const c=getCurrent();if(!c) return;const copy=JSON.parse(JSON.stringify(c));copy.id="blad-"+Date.now().toString(36);copy.title+=" (kopia)";copy.createdAt=copy.updatedAt=Date.now();state.unshift(copy);save();render();setCurrent(copy.id)}
function deleteCurrent(){if(!confirm("Radera detta blad?")) return;state=state.filter(s=>s.id!==currentId);save();currentId=state[0]?.id||null;render()}
function renderList(){const q=(searchInput.value||"").toLowerCase();const f=state.filter(s=>!q||(s.title+s.date+s.issue).toLowerCase().includes(q));countBadge.textContent=state.length;listEl.innerHTML="";if(!state.length){emptyListEl.style.display="block";return}emptyListEl.style.display="none";f.forEach(s=>{const b=document.createElement("button");b.className="news-item"+(s.id===currentId?" active":"");b.innerHTML=`<h4>${esc(s.title)}</h4><p>${esc(s.subtitle||s.school)} • ${esc(s.date)}</p>`;b.onclick=()=>setCurrent(s.id);listEl.appendChild(b)});if(!f.length) listEl.innerHTML=`<p style="padding:12px;color:#6B7280;text-align:center">Inga träffar för “${esc(q)}”</p>`}
function esc(s){return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function renderEditor(){
 const c=getCurrent();if(!c){viewEditor.classList.add("hidden");viewPreview.classList.add("hidden");viewWelcome.classList.remove("hidden");return}
 viewWelcome.classList.add("hidden");if(currentTab==="editor"){viewEditor.classList.remove("hidden");viewPreview.classList.add("hidden")}else{viewEditor.classList.add("hidden");viewPreview.classList.remove("hidden")}
 const map={inpSchool:c.school,inpTitle:c.title,inpSubtitle:c.subtitle,inpDate:c.date,inpIssue:c.issue,inpClass:c.className,inpAuthor:c.author,inpIngress:c.ingress,inpFooter:c.footer,inpTemplate:c.template};
 for(const [id,val] of Object.entries(map)){const el=document.getElementById(id);if(el&&document.activeElement!==el) el.value=val}
 document.querySelectorAll(".color-dot").forEach(d=>d.classList.toggle("active",d.dataset.color===c.color));
 articlesEditor.innerHTML="";c.articles.forEach((a,idx)=>{
  const div=document.createElement("div");div.className="article-edit";
  div.innerHTML=`<div class="article-edit-head"><strong>Artikel ${idx+1}</strong><div class="article-actions"><button data-act="up" ${idx===0?"disabled":""}>↑</button><button data-act="down" ${idx===c.articles.length-1?"disabled":""}>↓</button><button data-act="del" style="color:#9F1239">Ta bort</button></div></div>
  <div class="row2"><label>Rubrik<input data-field="title" value="${esc(a.title)}"></label><label>Tagg<input data-field="tag" value="${esc(a.tag)}" placeholder="T.ex. Info"></label></div>
  <label>Text<textarea data-field="text" rows="4">${esc(a.text)}</textarea></label>
  <label>Bild-URL (valfri)<div class="upload-row"><input data-field="image" type="text" value="${esc(a.image)}" placeholder="https://..."><label class="btn btn-ghost btn-small">Ladda upp<input type="file" accept="image/*" data-upload hidden></label></div><img class="image-preview" ${a.image?`src="${a.image}" style="display:block"`:``}></label>
  <label>Bildtext<input data-field="caption" value="${esc(a.caption||'')}" placeholder="Valfri bildtext"></label>`;
  div.querySelectorAll("[data-field]").forEach(inp=>inp.addEventListener("input",e=>{a[e.target.dataset.field]=e.target.value;c.updatedAt=Date.now();saveDebounced();renderPreview()}));
  const up=div.querySelector('[data-upload]'); if(up) up.addEventListener("change",e=>{const f=e.target.files[0];if(!f) return;const r=new FileReader();r.onload=()=>{a.image=r.result;c.updatedAt=Date.now();save();render()};r.readAsDataURL(f)});
  div.querySelector('[data-act="up"]')?.addEventListener("click",()=>{if(idx>0){c.articles.splice(idx-1,0,c.articles.splice(idx,1)[0]);c.updatedAt=Date.now();save();render()}});
  div.querySelector('[data-act="down"]')?.addEventListener("click",()=>{if(idx<c.articles.length-1){c.articles.splice(idx+1,0,c.articles.splice(idx,1)[0]);c.updatedAt=Date.now();save();render()}});
  div.querySelector('[data-act="del"]')?.addEventListener("click",()=>{if(c.articles.length===1){alert("Minst en artikel krävs");return}if(!confirm("Ta bort?"))return;c.articles.splice(idx,1);c.updatedAt=Date.now();save();render()});
  articlesEditor.appendChild(div);
 });
 renderPreview();
}
function paperHTML(c){
 const d=new Date(c.updatedAt||Date.now());const day=d.getDate();const mon=d.toLocaleDateString("sv-SE",{month:"short"}).toUpperCase().replace(".","");
 return `<div class="paper-inner" style="--accent:${c.color}">
  <div class="paper-topline"></div>
  <div class="paper-topbar"><span>NLV BERGNÄSET • LULEÅ</span><span>${esc(c.issue)} — ${esc(c.date)}</span><span>${esc(c.className).toUpperCase()}</span></div>
  <header class="paper-header">
    <div>
      <div class="eyebrow">${esc(c.school).toUpperCase()} &nbsp;·&nbsp; ${esc(c.author)}</div>
      <h1>${esc(c.title)}</h1>
      ${c.subtitle?`<p class="paper-subtitle">${esc(c.subtitle)}</p>`:``}
      <div class="rule accent"></div>
      <div class="meta-row"><span>Utgivning <b>${esc(c.date)}</b></span><span>•</span><span>Avdelning <b>${esc(c.className)}</b></span><span>•</span><span>Ansvarig <b>${esc(c.author)}</b></span></div>
    </div>
    <div class="date-box"><div class="d">${day}</div><div class="m">${mon}</div><div style="font-size:11px;color:#6B7280;margin-top:4px">${esc(c.issue)}</div></div>
  </header>
  ${c.ingress?`<div class="paper-ingress-wrap"><div class="paper-ingress">${esc(c.ingress)}</div></div>`:``}
  <div class="paper-body">
    ${c.articles.map((a,i)=>`
      <article class="paper-article">
        <div class="article-kicker">${esc(a.tag||"Nyhet")} — ${String(i+1).padStart(2,"0")}</div>
        <h3>${esc(a.title)}</h3>
        <div class="article-grid ${a.image?'':'no-img'}">
          <div class="article-text">${esc(a.text)}</div>
          ${a.image?`<div class="article-media"><img src="${a.image}" alt=""><div class="caption">${esc(a.caption||a.tag||"NLV Bergnäset")}</div></div>`:`<div></div>`}
        </div>
      </article>
    `).join("")}
  </div>
  <footer class="paper-footer">
    <div><b>${esc(c.school)}</b> <small>— ${esc(c.footer)}</small></div>
    <div style="display:flex;gap:10px;align-items:center"><span style="font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:.12em;opacity:.7">TRYCKFÄRDIG PDF • A4</span><div class="footer-qr">◫</div></div>
  </footer>
 </div>`;
}
function renderPreview(){const c=getCurrent();if(!c) return;const html=paperHTML(c);const cls=`paper ${c.template}`;miniPreview.className=cls+" mini";miniPreview.style.setProperty("--accent",c.color);miniPreview.innerHTML=html;fullPreview.className=cls;fullPreview.style.setProperty("--accent",c.color);fullPreview.innerHTML=html;document.getElementById("printContainer").innerHTML=`<div class="${cls}" style="--accent:${c.color};max-width:760px;margin:0 auto">${html}</div>`;document.getElementById("previewWrap").style.transform=`scale(${zoom/100})`;document.getElementById("previewWrap").style.transformOrigin="top center";document.getElementById("zoomLabel").textContent=zoom+"%";}
let t=null;function saveDebounced(){clearTimeout(t);t=setTimeout(()=>{save();renderList()},300)}
function render(){renderList();renderEditor()}
for(const id of["inpSchool","inpTitle","inpSubtitle","inpDate","inpIssue","inpClass","inpAuthor","inpIngress","inpFooter"]){const el=document.getElementById(id);if(el) el.addEventListener("input",e=>{const c=getCurrent();if(!c) return;const m={inpSchool:"school",inpTitle:"title",inpSubtitle:"subtitle",inpDate:"date",inpIssue:"issue",inpClass:"className",inpAuthor:"author",inpIngress:"ingress",inpFooter:"footer"};c[m[id]]=e.target.value;c.updatedAt=Date.now();saveDebounced();renderPreview()})}
document.getElementById("inpTemplate").addEventListener("change",e=>{const c=getCurrent();c.template=e.target.value;c.updatedAt=Date.now();save();render()});
document.querySelectorAll(".color-dot").forEach(d=>d.addEventListener("click",()=>{const c=getCurrent();c.color=d.dataset.color;c.updatedAt=Date.now();save();render()}));
document.getElementById("btnAddArticle").addEventListener("click",()=>{const c=getCurrent();c.articles.push({id:"a"+Date.now(),title:"Ny rubrik",text:"Skriv text här...",image:"",tag:"Nyhet",caption:""});c.updatedAt=Date.now();save();render()});
document.querySelectorAll(".tab").forEach(x=>x.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(y=>y.classList.remove("active"));x.classList.add("active");currentTab=x.dataset.tab;render()}));
document.getElementById("btnNew").addEventListener("click",()=>createNew());
document.getElementById("btnWelcomeNew").addEventListener("click",()=>createNew());
document.getElementById("btnDuplicate").addEventListener("click",duplicateCurrent);
document.getElementById("btnDelete").addEventListener("click",deleteCurrent);
document.getElementById("btnPrint").addEventListener("click",()=>window.print());
document.getElementById("btnHtml").addEventListener("click",()=>{
 const c=getCurrent();if(!c) return;const html=`<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.title)}</title><link rel="stylesheet" href="style.css"></head><body style="background:#F6F7F8;padding:20px;display:flex;justify-content:center"><div class="paper ${c.template}" style="max-width:760px;width:100%;--accent:${c.color}">${paperHTML(c)}</div></body></html>`;
 const b=new Blob([html],{type:"text/html"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=(c.title||"nlv").replace(/[^a-z0-9åäö\- ]/gi,"")+".html";a.click();URL.revokeObjectURL(a.href);
});
document.getElementById("zoomIn").addEventListener("click",()=>{zoom=Math.min(140,zoom+10);renderPreview()});
document.getElementById("zoomOut").addEventListener("click",()=>{zoom=Math.max(70,zoom-10);renderPreview()});
document.getElementById("searchInput").addEventListener("input",renderList);
document.getElementById("btnMenu").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("btnExportAll").addEventListener("click",()=>{if(!state.length) return alert("Inga blad");const b=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="nlv-bergnaset.json";a.click();URL.revokeObjectURL(a.href)});
document.getElementById("importAll").addEventListener("change",e=>{const f=e.target.files[0];if(!f) return;const r=new FileReader();r.onload=()=>{try{const arr=JSON.parse(r.result);if(!Array.isArray(arr)) throw new Error();state=arr;save();currentId=state[0]?.id||null;render()}catch{alert("Kunde inte läsa filen")}};r.readAsText(f)});
document.querySelectorAll(".example-btn").forEach(b=>b.addEventListener("click",()=>createNew(examples[b.dataset.example])));
if(state.length===0) render(); else render();
listEl.addEventListener("click",()=>{if(innerWidth<=760) document.getElementById("sidebar").classList.remove("open")});
