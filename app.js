const LS_KEY = "skolbladet-v1-nlv2";

const defaults = () => ({
  id: "blad-" + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
  school: "NLV Bergnäset",
  title: "Veckobrev",
  subtitle: "Nyheter från skolan",
  date: new Date().toLocaleDateString("sv-SE", { day:"numeric", month:"long", year:"numeric"}),
  issue: "Nr " + Math.floor(Math.random()*40+1),
  className: "Åk F–6",
  author: "Rektor",
  ingress: "Hej alla elever och vårdnadshavare på NLV Bergnäset! Här kommer veckans nyheter – tack för en fantastisk vecka tillsammans! 🏔️",
  footer: "NLV Bergnäset • Bergnäset, Luleå • 0920-45 30 00 • bergnaset@skolalulea.se • www.lulea.se/bergnaset",
  color: "#0b5cff",
  template: "modern",
  articles: [
    { id: "a1", title: "Veckans höjdpunkt på NLV", text: "I fredags hade vi friluftsdag vid fjället! Eleverna byggde vindskydd, lärde sig om allemansrätten och grillade tillsammans. Tack till alla föräldrar som hjälpte till – ni är guld! ✨", image: "https://picsum.photos/seed/nlv1/800/500", tag:"Höjdpunkt" },
    { id: "a2", title: "Kommande händelser", text: "• Föräldramöte tis 26/8 kl 18:00 i aulan\n• Skolfoto ons 27/8 – ta med leendet! 📸\n• Studiedag fre 29/8 – fritids öppet för anmälda.", image: "", tag:"Kalender" },
    { id: "a3", title: "Matsedel & utflykt", text: "Nästa vecka: tacos, lasagne och pannkaksbuffé! På torsdag går Åk 3 till skogen – matsäck ordnas av skolan.", image: "https://picsum.photos/seed/nlv2/800/500", tag:"Info" }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
});

const examples = {
  veckobrev: {
    school:"NLV Bergnäset", title:"Veckobrev Vecka 34", subtitle:"Första skolveckan avklarad!", date:"18–22 augusti 2026", issue:"Nr 34 • 2026", className:"Åk F–3", author:"Anna Lind, rektor",
    ingress:"Välkomna tillbaka efter sommarlovet! Det pirrar i hela NLV Bergnäset – nya kompisar, nya äventyr och massor av skratt i korridoren.",
    color:"#0b5cff", template:"modern",
    articles:[
      {id:"a1", title:"Så var första veckan", text:"Vi har fokuserat på trygghet, vänskap och rutiner. Alla klasser har gjort kompispromenader runt Bergnäset och skapat egna trivselregler tillsammans. Det har varit magiskt att se alla leenden!", image:"https://picsum.photos/seed/bergnaset1/900/600", tag:"Tillbaka i skolan"},
      {id:"a2", title:"Läxor & utvecklingssamtal", text:"Läxor startar v.35. Inbjudan till utvecklingssamtal kommer via SchoolSoft 2–12 september. Boka tid direkt i appen.", image:"", tag:"Viktigt"},
      {id:"a3", title:"Matsedel v.34 på NLV", text:"Mån: Köttbullar & potatismos\nTis: Fiskgratäng\nOns: Kycklinggryta med ris\nTor: Vegolasagne\nFre: Tacos 🌮 – allas favorit!", image:"https://picsum.photos/seed/food1/800/500", tag:"Matsedel"}
    ],
    footer:"NLV Bergnäset • 0920-45 30 00 • bergnaset@skolalulea.se"
  },
  event:{
    school:"NLV Bergnäset", title:"Höstfesten 2026", subtitle:"Save the Date – årets mysigaste dag!", date:"Lördag 13 september kl 11–15", issue:"Special • Höst", className:"Alla familjer välkomna!", author:"Festkommittén NLV",
    ingress:"Årets mysigaste dag på Bergnäset! Loppis, fika, uppträdanden och tävlingar – ta med hela familjen och grannarna!",
    color:"#f59e0b", template:"colorful",
    articles:[
      {id:"a1", title:"Program för dagen", text:"11:00 Invigning med rektor\n11:30 Skolkörens show\n12:00 Chokladhjul & fiskdamm 🎣\n13:00 Match elever vs föräldrar ⚽\n14:30 Stora lottdragningen!", image:"https://picsum.photos/seed/fest1/900/600", tag:"Program"},
      {id:"a2", title:"Vill du hjälpa till?", text:"Vi behöver bagare, cafévärdar och bygghjälp. Anmäl dig via SchoolSoft – alla händer behövs och vi bjuder på fika!", image:"", tag:"Engagera dig"},
      {id:"a3", title:"Loppis – boka bord", text:"Boka bord för 100 kr. Swisha till 123 123 45 67 märk 'NLV Loppis + namn'. Först till kvarn – 40 bord finns!", image:"https://picsum.photos/seed/loppis/800/500", tag:"Loppis"}
    ],
    footer:"Frågor? fest@nlvbergnaset.se • Följ oss på Instagram @nlvbergnaset"
  },
  matsedel:{
    school:"NLV Bergnäset", title:"Matsedel September", subtitle:"NLV:s kök lagar allt från grunden", date:"September 2026", issue:"Köket • Sept", className:"Kök & Matsal", author:"Köket / Maria",
    ingress:"All mat lagas från grunden i vårt eget kök på Bergnäset! Här är månadens favoriter och info om specialkost.",
    color:"#10b981", template:"classic",
    articles:[
      {id:"a1", title:"Matsedel v.36–39", text:"v.36: Korv stroganoff, Broccoligratäng, Pannkaksbuffé\nv.37: Lasagne, Fiskburgare, Kycklingcurry\nv.38: Köttfärssås & spaghetti, Rotfruktslåda, Tacos\nv.39: Ärtsoppa & pannkakor, Hamburgare, Ugnsfisk", image:"https://picsum.photos/seed/food2/800/500", tag:"Matsedel"},
      {id:"a2", title:"Specialkost", text:"Anmäl specialkost via blanketten på hemsidan senast 1 sept. Kontakt: maria@nlvbergnaset.se – vi löser allt!", image:"", tag:"Allergi & kost"},
    ],
    footer:"Köket 07:30–14:00 • Tel köket: 0920-45 30 10"
  },
  norrsken:{
    school:"NLV Bergnäset", title:"Norrskensveckan", subtitle:"När himlen dansar över Bergnäset", date:"Vecka 38 • 15–19 sept", issue:"Tema • Rymden", className:"Hela skolan", author:"NO-lärarna",
    ingress:"Vi tittar mot himlen! En hel vecka om rymden, norrsken och vår plats i universum – med pyssel, experiment och kvällsvisning!",
    color:"#8b5cf6", template:"dark",
    articles:[
      {id:"a1", title:"Rymdexperiment i klassrummet", text:"Bygg din egen raket, testa norrskensslime och lär dig varför himlen dansar i grönt och lila. Våra NO-lärare har förberett magiska stationer!", image:"https://picsum.photos/seed/rymd/900/600", tag:"Experiment"},
      {id:"a2", title:"Kvällsvisning för familjer", text:"Torsdag 18 sept kl 19:00 samlas vi på skolgården. Ta med varm choklad och filt – vi spanar norrsken tillsammans! Teleskop finns på plats. 🌌", image:"", tag:"18 sept 19:00"},
      {id:"a3", title:"Tävling: Rita ditt norrsken", text:"Lämna in din teckning senast 19 sept. Vinnaren får sitt konstverk på nästa skols blad – och biobiljetter!", image:"https://picsum.photos/seed/art/800/500", tag:"Tävling"}
    ],
    footer:"NLV Bergnäset – Där nyfikenheten lyser som norrsken ✨"
  }
};

let state = load();
let currentId = state[0]?.id || null;
let currentTab = "editor";
let zoom = 100;

const $ = s => document.querySelector(s);
const listEl = $("#list");
const emptyListEl = $("#emptyList");
const countBadge = $("#countBadge");
const searchInput = $("#searchInput");
const miniPreview = $("#miniPreview");
const fullPreview = $("#fullPreview");
const articlesEditor = $("#articlesEditor");
const viewEditor = $("#viewEditor");
const viewPreview = $("#viewPreview");
const viewWelcome = $("#viewWelcome");

function load(){
  try{
    let raw = localStorage.getItem(LS_KEY);
    if(!raw){
      for(const k of ["skolbladet-v1-nlv","skolbladet-v1"]){
        const old = localStorage.getItem(k);
        if(old){ raw = old; break; }
      }
      if(raw) localStorage.setItem(LS_KEY, raw);
    }
    if(raw){ const arr = JSON.parse(raw); if(Array.isArray(arr) && arr.length) return arr.map(o=>({ issue:o.issue||"Nr 1", subtitle:o.subtitle||"Nyheter från NLV Bergnäset", school: o.school?.includes("Solbacka") ? "NLV Bergnäset" : o.school, color:o.color||"#0b5cff", articles: (o.articles||[]).map(a=>({ tag:a.tag||"Nyhet", ...a })), ...o })); }
  }catch(e){}
  return [];
}
function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function getCurrent(){ return state.find(s=>s.id===currentId) || null; }
function setCurrent(id){ currentId = id; confettiBurst(); render(); }
function confettiBurst(){
  const c = document.getElementById("confetti");
  if(!c) return;
  const colors = ["#0b5cff","#06b6d4","#f59e0b","#ef4444","#8b5cf6","#10b981"];
  for(let i=0;i<22;i++){
    const d=document.createElement("div");
    d.className="confetti-piece";
    d.style.left=Math.random()*100+"vw";
    d.style.background=colors[Math.floor(Math.random()*colors.length)];
    d.style.animationDuration=(1.2+Math.random()*1.2)+"s";
    d.style.animationDelay=(Math.random()*0.25)+"s";
    d.style.transform=`rotate(${Math.random()*360}deg)`;
    d.style.borderRadius=Math.random()>0.5?"50%":"4px";
    c.appendChild(d);
    setTimeout(()=>d.remove(),2200);
  }
}
function createNew(patch=null){
  const d = defaults();
  if(patch) Object.assign(d, patch, { id: d.id, createdAt: Date.now(), updatedAt: Date.now() });
  d.articles = d.articles.map(a=> ({...a, id: a.id || "a"+Math.random().toString(36).slice(2,6), tag:a.tag||"Nyhet"}));
  state.unshift(d);
  save();
  setCurrent(d.id);
}
function duplicateCurrent(){
  const c = getCurrent(); if(!c) return;
  const copy = JSON.parse(JSON.stringify(c));
  copy.id = "blad-" + Date.now().toString(36);
  copy.title = copy.title + " (kopia)";
  copy.createdAt = Date.now(); copy.updatedAt = Date.now();
  state.unshift(copy);
  save(); render(); setCurrent(copy.id);
}
function deleteCurrent(){
  if(!confirm("Radera detta NLV-blad? Går inte att ångra.")) return;
  state = state.filter(s=>s.id!==currentId);
  save();
  currentId = state[0]?.id || null;
  render();
}
function renderList(){
  const q = (searchInput.value||"").toLowerCase();
  const filtered = state.filter(s=> !q || (s.title+s.school+s.date).toLowerCase().includes(q));
  countBadge.textContent = state.length;
  listEl.innerHTML = "";
  if(state.length===0){ emptyListEl.style.display="block"; return; }
  emptyListEl.style.display="none";
  filtered.forEach(s=>{
    const btn = document.createElement("button");
    btn.className = "news-item" + (s.id===currentId ? " active":"");
    btn.innerHTML = `<h4>${esc(s.title)}</h4><p>${esc(s.school)} • ${esc(s.date)} • ${esc(s.issue)}</p><small>${new Date(s.updatedAt).toLocaleDateString("sv-SE")}</small>`;
    btn.onclick = ()=> setCurrent(s.id);
    listEl.appendChild(btn);
  });
  if(filtered.length===0) listEl.innerHTML = `<p style="padding:12px;color:var(--muted);text-align:center">Inga träffar för “${esc(q)}”</p>`;
}
function esc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") }
function renderEditor(){
  const c = getCurrent();
  if(!c){ viewEditor.classList.add("hidden"); viewPreview.classList.add("hidden"); viewWelcome.classList.remove("hidden"); return; }
  viewWelcome.classList.add("hidden");
  if(currentTab==="editor"){ viewEditor.classList.remove("hidden"); viewPreview.classList.add("hidden"); } else { viewEditor.classList.add("hidden"); viewPreview.classList.remove("hidden"); }
  const map = { inpSchool: c.school, inpTitle: c.title, inpDate: c.date, inpClass: c.className, inpAuthor: c.author, inpIngress: c.ingress, inpFooter: c.footer, inpTemplate: c.template };
  for(const [id,val] of Object.entries(map)){
    const el = document.getElementById(id);
    if(document.activeElement !== el) el.value = val;
  }
  // extra field issue/subtitle if exists
  const extraIssue = document.getElementById("inpIssue");
  const extraSub = document.getElementById("inpSubtitle");
  if(extraIssue && document.activeElement!==extraIssue) extraIssue.value = c.issue||"";
  if(extraSub && document.activeElement!==extraSub) extraSub.value = c.subtitle||"";
  document.querySelectorAll(".color-dot").forEach(d=> d.classList.toggle("active", d.dataset.color===c.color));
  articlesEditor.innerHTML = "";
  c.articles.forEach((a, idx)=>{
    const div = document.createElement("div");
    div.className = "article-edit";
    div.style.animationDelay = (idx*0.06)+"s";
    div.innerHTML = `
      <div class="article-edit-head">
        <strong>Artikel ${idx+1} ${idx===0?'<span style="background:var(--accent);color:white;padding:2px 6px;border-radius:999px;font-size:10px;margin-left:6px">STOR</span>':''}</strong>
        <div class="article-actions">
          <button data-act="up" ${idx===0?"disabled":""}>↑</button>
          <button data-act="down" ${idx===c.articles.length-1?"disabled":""}>↓</button>
          <button data-act="del" class="btn-danger">Ta bort</button>
        </div>
      </div>
      <div class="row2">
        <label>Rubrik<input data-field="title" value="${esc(a.title)}" placeholder="T.ex. Viktig info"></label>
        <label>Tagg / Kategori<input data-field="tag" value="${esc(a.tag||'')}" placeholder="T.ex. Viktigt, Matsedel"></label>
      </div>
      <label>Text<textarea data-field="text" placeholder="Skriv artikelns text här...">${esc(a.text)}</textarea></label>
      <label>Bild (valfri – blir snygg även utan)
        <div class="upload-row">
          <input data-field="image" type="text" value="${esc(a.image)}" placeholder="Klistra in bild-URL eller ladda upp">
          <label class="btn btn-ghost btn-small">Ladda upp<input type="file" accept="image/*" data-upload hidden></label>
        </div>
        <img class="image-preview" ${a.image?`src="${a.image}" style="display:block"`:``}>
      </label>
    `;
    div.querySelectorAll("[data-field]").forEach(inp=>{
      inp.addEventListener("input", e=>{
        const field = e.target.dataset.field; a[field] = e.target.value; c.updatedAt = Date.now(); saveDebounced(); renderPreview();
      });
    });
    div.querySelector("[data-upload]")?.addEventListener("change", e=>{
      const file = e.target.files[0]; if(!file) return;
      const reader = new FileReader(); reader.onload = ()=>{ a.image = reader.result; c.updatedAt=Date.now(); save(); render(); }; reader.readAsDataURL(file);
    });
    div.querySelector('[data-act="up"]')?.addEventListener("click", ()=>{ if(idx>0){ c.articles.splice(idx-1,0,c.articles.splice(idx,1)[0]); c.updatedAt=Date.now(); save(); render(); }});
    div.querySelector('[data-act="down"]')?.addEventListener("click", ()=>{ if(idx<c.articles.length-1){ c.articles.splice(idx+1,0,c.articles.splice(idx,1)[0]); c.updatedAt=Date.now(); save(); render(); }});
    div.querySelector('[data-act="del"]')?.addEventListener("click", ()=>{ if(c.articles.length===1){ alert("Minst en artikel måste finnas."); return; } if(!confirm("Ta bort artikeln?")) return; c.articles.splice(idx,1); c.updatedAt=Date.now(); save(); render(); });
    articlesEditor.appendChild(div);
  });
  renderPreview();
}
function paperHTML(c){
  const d = new Date(c.updatedAt||Date.now());
  const day = d.getDate();
  const month = d.toLocaleDateString("sv-SE",{month:"short"}).toUpperCase().replace(".","");
  const year = d.getFullYear();
  const articles = c.articles || [];
  // first article featured
  const toArticle = (a,i,isFeatured)=>{
    const hasImg = !!a.image;
    return `
    <article class="paper-article ${isFeatured?'featured':''} ${!hasImg && i%2===0 ? 'quote':''}" style="animation-delay:${i*0.07}s">
      <div class="article-media" ${isFeatured?'':'style="height:170px"'}>
        ${hasImg ? `<img src="${a.image}" alt="" loading="lazy"><div class="article-media-gradient"></div>` : `<div class="article-media-placeholder"> ${["📚","🎉","🌲","🏔️","✨","🎨","⚽","🌌"][i%8]} <span>NLV BERGNÄSET</span></div>`}
        <span class="article-tag">${esc(a.tag||'Nyhet')}</span>
        <span class="article-number">${i+1}</span>
      </div>
      <div class="article-content">
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.text)}</p>
        <div class="article-footer"><span class="dot"></span> NLV Bergnäset <span style="margin-left:auto;opacity:.6">${esc(c.className)}</span></div>
      </div>
    </article>
    `;
  };
  let bodyGridClass = articles.length===1 ? "single" : "";
  let bodyHTML = "";
  if(articles.length>0){
    bodyHTML += toArticle(articles[0],0,true);
    for(let i=1;i<articles.length;i++) bodyHTML += toArticle(articles[i],i,false);
  }
  return `
  <div class="paper-inner" style="--accent:${c.color}">
    <div class="paper-topline"></div>
    <div class="paper-topbar"><span>🏔️ ${esc(c.school).toUpperCase()}</span><span>${esc(c.issue)} • ${esc(c.date)}</span><span>LULEÅ • BERGNÄSET</span></div>
    <header class="paper-header">
      <div>
        <div class="header-kicker"><i>✦</i> ${esc(c.className)} • ${esc(c.author)}</div>
        <h1>${esc(c.title)}</h1>
        ${c.subtitle?`<div style="color:#475569;font-weight:600;margin:-4px 0 6px;font-size:14px">${esc(c.subtitle)}</div>`:``}
        <div class="title-underline"></div>
        <div class="paper-meta">
          <span class="meta-pill">📅 <b>${esc(c.date)}</b></span>
          <span class="meta-pill">🏫 <b>${esc(c.school)}</b></span>
          <span class="meta-pill">✍️ <b>${esc(c.author)}</b></span>
        </div>
      </div>
      <div class="date-card">
        <div class="date-card-day">${day}</div>
        <div class="date-card-month">${month}</div>
        <div class="date-card-year">${year}</div>
        <div style="margin-top:8px;font-size:10px;letter-spacing:.1em;opacity:.7">${esc(c.issue)}</div>
      </div>
    </header>
    ${c.ingress ? `<div class="paper-ingress-wrap"><div class="paper-ingress"><span class="paper-ingress-label">HÄLSNING FRÅN NLV</span>${esc(c.ingress)}</div></div>` : ``}
    <div class="paper-body ${bodyGridClass}">
      ${bodyHTML}
    </div>
    <footer class="paper-footer">
      <div class="footer-left"><b>${esc(c.school)}</b><br>${esc(c.footer)}</div>
      <div class="footer-right">
        <div class="footer-badge">✦ Tryckt med kärlek på Bergnäset</div>
        <div class="qr-placeholder">◧</div>
      </div>
    </footer>
  </div>
  `;
}
function renderPreview(){
  const c = getCurrent(); if(!c) return;
  const html = paperHTML(c);
  const cls = `paper ${c.template}`;
  miniPreview.className = cls + " mini"; miniPreview.style.setProperty("--accent", c.color); miniPreview.innerHTML = html;
  fullPreview.className = cls; fullPreview.style.setProperty("--accent", c.color); fullPreview.innerHTML = html;
  document.getElementById("printContainer").innerHTML = `<div class="${cls}" style="--accent:${c.color};max-width:794px;margin:0 auto">${html}</div>`;
  document.getElementById("previewWrap").style.transform = `scale(${zoom/100})`;
  document.getElementById("previewWrap").style.transformOrigin = "top center";
  document.getElementById("zoomLabel").textContent = zoom + "%";
}
let saveTimer=null;
function saveDebounced(){ clearTimeout(saveTimer); saveTimer = setTimeout(()=>{ save(); renderList(); }, 300); }
function render(){ renderList(); renderEditor(); }

["inpSchool","inpTitle","inpDate","inpClass","inpAuthor","inpIngress","inpFooter"].forEach(id=>{
  const el=document.getElementById(id); if(!el) return;
  el.addEventListener("input", e=>{
    const c=getCurrent(); if(!c) return;
    const map={inpSchool:"school",inpTitle:"title",inpDate:"date",inpClass:"className",inpAuthor:"author",inpIngress:"ingress",inpFooter:"footer"};
    c[map[id]] = e.target.value; c.updatedAt = Date.now(); saveDebounced(); renderPreview();
  });
});
["inpIssue","inpSubtitle"].forEach(id=>{
  const el=document.getElementById(id); if(!el) return;
  el.addEventListener("input", e=>{
    const c=getCurrent(); if(!c) return;
    if(id==="inpIssue") c.issue=e.target.value;
    if(id==="inpSubtitle") c.subtitle=e.target.value;
    c.updatedAt=Date.now(); saveDebounced(); renderPreview();
  });
});
document.getElementById("inpTemplate").addEventListener("change", e=>{ const c=getCurrent(); c.template=e.target.value; c.updatedAt=Date.now(); save(); render(); });
document.querySelectorAll(".color-dot").forEach(d=> d.addEventListener("click", ()=>{ const c=getCurrent(); c.color=d.dataset.color; c.updatedAt=Date.now(); save(); render(); confettiBurst(); }));
document.getElementById("btnAddArticle").addEventListener("click", ()=>{ const c=getCurrent(); c.articles.push({id:"a"+Date.now(), title:"Ny rubrik", text:"Skriv text här...", image:"", tag:"Nyhet"}); c.updatedAt=Date.now(); save(); render(); });
document.querySelectorAll(".tab").forEach(t=> t.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); t.classList.add("active"); currentTab = t.dataset.tab; render();
}));
document.getElementById("btnNew").addEventListener("click", ()=> createNew());
document.getElementById("btnWelcomeNew").addEventListener("click", ()=> createNew());
document.getElementById("btnDuplicate").addEventListener("click", duplicateCurrent);
document.getElementById("btnDelete").addEventListener("click", deleteCurrent);
document.getElementById("btnPrint").addEventListener("click", ()=> { confettiBurst(); setTimeout(()=>window.print(), 300); });
document.getElementById("btnHtml").addEventListener("click", ()=>{
  const c=getCurrent(); if(!c) return;
  const fullHtml = `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.title)} – ${esc(c.school)}</title><link rel="stylesheet" href="style.css"></head><body style="background:#f0f4ff;padding:20px;display:flex;justify-content:center"><div class="paper ${c.template}" style="max-width:794px;width:100%;--accent:${c.color}">${paperHTML(c)}</div></body></html>`;
  const blob = new Blob([fullHtml], {type:"text/html"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download = (c.title||"nlv-bergnaset-blad").replace(/[^a-z0-9åäö\- ]/gi,"")+".html"; a.click(); URL.revokeObjectURL(a.href);
});
document.getElementById("zoomIn").addEventListener("click", ()=>{ zoom=Math.min(150, zoom+10); renderPreview(); });
document.getElementById("zoomOut").addEventListener("click", ()=>{ zoom=Math.max(60, zoom-10); renderPreview(); });
document.getElementById("searchInput").addEventListener("input", renderList);
document.getElementById("btnMenu").addEventListener("click", ()=> document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("btnExportAll").addEventListener("click", ()=>{
  if(state.length===0) return alert("Inga blad att exportera.");
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="nlv-bergnaset-export.json"; a.click(); URL.revokeObjectURL(a.href);
});
document.getElementById("importAll").addEventListener("change", e=>{
  const file=e.target.files[0]; if(!file) return;
  const r=new FileReader(); r.onload=()=>{
    try{ const arr=JSON.parse(r.result); if(!Array.isArray(arr)) throw new Error(); state=arr; save(); currentId=state[0]?.id||null; render(); confettiBurst(); alert("Importerade "+arr.length+" blad till NLV Bergnäset!"); }catch{ alert("Kunde inte läsa filen."); }
  }; r.readAsText(file);
});
document.querySelectorAll(".example-btn").forEach(b=> b.addEventListener("click", ()=>{ const ex = examples[b.dataset.example]; createNew(ex); }));
if(state.length===0) render(); else render();
listEl.addEventListener("click", ()=>{ if(window.innerWidth<=760) document.getElementById("sidebar").classList.remove("open"); });
