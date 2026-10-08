/* =====================================================================
   SAINT-CYPRIEN · la-salle.js — la visite privée.
   La visite du showroom au noir : six postes (VISITE), chacun ALLUMÉ quand
   tu l’atteins (IO light-up, indépendant de gsap → survit au ticker gelé).
   Puis LE CODE (4 valeurs durables), LE RÉSEAU (les 4 sœurs + sa place, la
   preuve du titre) et les infos pratiques. Tout depuis data.js.
   ===================================================================== */
import { NETWORK, SALLE, LINKS, picture } from "./data.js?v=30";
import { VISITE, VALUES } from "./data-la-salle.js?v=26";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* LA VISITE — six postes, en split alterné, photo lit-under-spot. L’alt
   vient de data.js et décrit le cliché ; la pastille mono garde `tag`. */
function renderVisite() {
  const el = $("#visite");
  if (!el) return;
  el.innerHTML = VISITE.map(
    (v, i) => `<article class="station" id="poste-${v.n}" data-i="${i}" data-reveal>
      <div class="station__media media" data-label="${v.tag}">
        <span class="station__glow" aria-hidden="true"></span>
        ${picture(v.img, `alt="${esc(v.alt)}" loading="lazy" decoding="async"`)}
      </div>
      <div class="station__body">
        <span class="station__n">${v.n}</span>
        <span class="station__tag">${v.tag}</span>
        <h3 class="station__t">${v.t}</h3>
        <p class="station__d">${v.d}</p>
        <ul class="station__specs">${v.specs.map((s) => `<li>${s}</li>`).join("")}</ul>
      </div>
    </article>`
  ).join("");
}

/* LE PLAN — l’index des six postes, collant sous le titre. Clic = on descend
   au poste et on l’allume ; le scroll renvoie l’ascenseur en surlignant le
   poste courant. C’est la seule vraie prise en main de la page : sans lui la
   visite se subissait, avec lui elle se pilote. Purs IO + scrollIntoView →
   aucune dépendance à gsap (le ticker peut geler, ça marche encore). */
function renderPlan() {
  const el = $("#plan");
  if (!el) return;
  el.innerHTML = VISITE.map(
    (v, i) => `<button class="planbtn${i === 0 ? " is-on" : ""}" type="button" data-n="${v.n}" aria-current="${i === 0}">
      <span class="planbtn__n">${v.n}</span>
      <span class="planbtn__t">${v.t}</span>
    </button>`
  ).join("");
}

function wirePlan() {
  const bar = $("#plan");
  if (!bar) return;
  const btns = [...bar.querySelectorAll(".planbtn")];
  const stations = VISITE.map((v) => document.getElementById(`poste-${v.n}`)).filter(Boolean);
  if (!btns.length || !stations.length) return;

  /* On ne fait défiler QUE la barre, jamais la page. scrollIntoView, même en
     block:"nearest", remonte la chaîne des ancêtres scrollables et repositionne
     le document : la barre étant sticky, chaque surlignage rappelait le scroll
     à sa hauteur (mesuré : la page revenait sans cesse à 1 099 px et aucun
     saut d’ancre n’aboutissait). On pilote donc scrollLeft à la main. */
  const keepInStrip = (b) => {
    const br = b.getBoundingClientRect(), pr = bar.getBoundingClientRect();
    if (br.left < pr.left) bar.scrollLeft += br.left - pr.left - 12;
    else if (br.right > pr.right) bar.scrollLeft += br.right - pr.right + 12;
  };
  const mark = (n) => btns.forEach((b) => {
    const on = b.dataset.n === n;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-current", String(on));
    if (on) keepInStrip(b);
  });

  bar.addEventListener("click", (e) => {
    const b = e.target.closest(".planbtn");
    if (!b) return;
    const target = document.getElementById(`poste-${b.dataset.n}`);
    if (!target) return;
    mark(b.dataset.n);
    target.classList.add("is-lit", "is-target");
    setTimeout(() => target.classList.remove("is-target"), 2000);
    // via BC.scrollToEl : Lenis écrase un scrollIntoView natif en cours de route
    window.BC.scrollToEl(target, { offset: -120 });
  });

  // le poste le plus proche du centre du cadre pilote la barre
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (hit) mark(hit.target.id.replace("poste-", ""));
    },
    { threshold: [0.25, 0.55, 0.8], rootMargin: "-25% 0px -25% 0px" }
  );
  stations.forEach((s) => io.observe(s));
}

/* LE CODE — quatre valeurs durables (le geste / l’école / le quartier / le choix). */
function renderCode() {
  const el = $("#code");
  if (!el) return;
  el.innerHTML = VALUES.map(
    (v) => `<article class="codecard">
      <span class="codecard__n">${v.n}</span>
      <h3 class="codecard__t">${v.t}</h3>
      <p class="codecard__d">${v.d}</p>
    </article>`
  ).join("");
}

/* LE RÉSEAU — les quatre autres salles, puis Saint-Cyprien. La liste ne
   prétend pas donner un ordre historique. */
function renderLineage() {
  const el = $("#lineage");
  if (!el) return;
  const sisters = NETWORK.map(
    (n, i) => `<li class="sister" data-reveal>
      <span class="sister__i">0${i + 1}</span>
      <div class="sister__body">
        <span class="sister__tag">${n.tag}</span>
        <h3 class="sister__name">${n.name}</h3>
        <p class="sister__feat">${n.feat}</p>
      </div>
      <a class="sister__link" href="${n.url}" target="_blank" rel="noopener" aria-label="${n.name} ↗">↗</a>
    </li>`
  ).join("");
  const self = `<li class="sister sister--self" data-reveal>
      <span class="sister__i">05</span>
      <div class="sister__body">
        <span class="sister__tag">Toulouse rive gauche</span>
        <h3 class="sister__name">Saint-Cyprien</h3>
        <p class="sister__feat">Centre-ville · rive gauche · toutes les disciplines</p>
      </div>
      <span class="sister__here" aria-hidden="true">Tu es ici</span>
    </li>`;
  el.innerHTML = sisters + self;
}

/* INFOS PRATIQUES — depuis SALLE (adresse, accès, horaires, tél, fédérations). */
function renderInfos() {
  const el = $("#infos");
  if (!el) return;
  const rows = [
    { k: "Adresse", v: SALLE.address.full },
    { k: "Tram", v: "Ligne T1 · Fer à Cheval, 200 m" },
    { k: "Horaires", v: SALLE.hours },
    { k: "Stationnement", v: "Parking Saint-Cyprien à proximité" },
    { k: "Téléphone", v: `<a href="tel:${SALLE.phoneHref}">${SALLE.phone}</a>` },
    { k: "Fédérations", v: SALLE.federations.join(" · ") },
  ];
  el.innerHTML = rows.map((r) => `<li><span class="qk">${r.k}</span><span class="qv">${r.v}</span></li>`).join("");
}

/* IO LIGHT-UP — le faisceau s’allume sur le poste qui entre dans le cadre.
   Pur IntersectionObserver : aucune dépendance à gsap, donc insensible au
   ticker gelé. Le texte reste lisible en permanence — seule la lumière bouge. */
function lightUp() {
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".station").forEach((s) => s.classList.add("is-lit"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("is-lit"); }),
    { threshold: 0.35, rootMargin: "0px 0px -12% 0px" }
  );
  document.querySelectorAll(".station").forEach((s) => io.observe(s));
}

/* ------------------------------ BOOT ------------------------------ */
function boot() {
  renderVisite();
  renderPlan();
  renderCode();
  renderLineage();
  renderInfos();
  wirePlan();

  window.BC.reveal(document);
  window.BC.magnetic(document);
  window.BC.spotlight(".phero", ".phero__spot");
  window.BC.touchLife();   // mobile : postes/valeurs/sœurs s’animent au passage
  lightUp();

  const start = () => window.BC.refresh();
  window.addEventListener("load", start);
  setTimeout(start, 500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
