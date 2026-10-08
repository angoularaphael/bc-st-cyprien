/* =====================================================================
   SAINT-CYPRIEN · "LA NOUVELLE GÉNÉRATION" · home.js
   Signature = LE CONFIGURATEUR : tu choisis ta discipline comme on configure
   un produit — la fiche (photo, coach, jours, niveau) swap avec un ressort.
   La home positionne + route : configurateur → /plannings/ · /activites/ ·
   box-plus. Tout est rendu depuis data.js (planning réel rentrée 2026).
   ===================================================================== */
import { DISCIPLINES, COACHES, LINKS, COACH_TBD_SHORT, COACH_TBD_WHY_SHORT } from "./data.js?v=30";
import { STATS } from "./data-home.js?v=23";
import { SCHEDULE } from "./data.js?v=30";

/* Un chiffre de la bande d’accueil est DÉRIVÉ du planning : il ne peut donc
   pas diverger du poster quand le vestiaire publie une grille différente. */
const CHIFFRES_VIVANTS = { cours: () => SCHEDULE.length };

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s);
const nf = new Intl.NumberFormat("fr-FR");
/* les alt sont de vraies phrases (apostrophes, guillemets possibles) : on
   les échappe avant de les poser dans un attribut HTML. */
const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* --------------------------- RENDER ------------------------------- */
function renderStats() {
  /* le bloc est optionnel : toutes les compositions de heros ne le
     portent pas. Absent, on ne rend rien — on ne leve pas. */
  const cible = $("#stats");
  if (!cible) return;
  cible.innerHTML = STATS.map(
    (s0) => { const s = s0.from ? { ...s0, v: CHIFFRES_VIVANTS[s0.from]?.() ?? s0.v } : s0; return `<div class="stat">
      <div class="stat__v"><span data-count="${s.v}" ${s.raw ? "data-raw" : ""}>${s.raw ? s.v : 0}</span>${s.suffix ? `<span class="stat__u">${s.suffix.trim()}</span>` : ""}</div>
      <div class="stat__l">${s.l}</div>
    </div>`; }
  ).join("");
}
function renderTicker() {
  // items inusables (aucune date, aucun "neuf")
  const items = ["Ouvert 6 j/7", "Sans réservation", "Centre-ville", "Anglaise", "Thaï · K1", "Grappling", "Hyrox", "Lady Punch", "Dès 3 ans", "Tram T1 · Fer à Cheval"];
  const row = items.map((i) => `<span>${i}</span>`).join("");
  const t = $("#marquee");
  if (!t) return;                 // meme regle : optionnel, jamais fatal
  t.innerHTML = row + row; t.dataset.speed = "0.6";
}

/* LE CONFIGURATEUR — big list + lit sheet + FULL-BLEED backdrop that follows.
   Fiche allégée : essai → box-plus · créneaux → /plannings/ · détail → /activites/ */
function renderConfig() {
  const list = $("#config-list"), mediaBox = $("#config-media"), body = $("#config-body");
  const bg = $("#config-bg");
  if (!list) return;
  // Le backdrop plein cadre est DÉCORATIF (le panneau porte déjà la photo
  // décrite) → alt="" explicite, jamais le libellé de la pastille.
  if (bg) bg.innerHTML = DISCIPLINES.map((d, i) => `<div class="media ${i === 0 ? "is-active" : ""}" data-img="${d.img}" data-alt="" data-label=""></div>`).join("");
  list.innerHTML = DISCIPLINES.map((d, i) => `
    <button class="cfg ${i === 0 ? "is-active" : ""}" type="button" role="tab" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" aria-controls="config-panel" id="cfg-${d.key}" data-i="${i}">
      <span class="cfg__n">${String(i + 1).padStart(2, "0")}</span>
      <span class="cfg__name">${d.name}</span>
      <span class="cfg__tag">${d.tag}</span>
    </button>`).join("");
  // data-label = la pastille mono (le NOM). data-alt = le vrai texte
  // alternatif, écrit d’après le cliché. Les deux ne se confondent plus.
  mediaBox.innerHTML = DISCIPLINES.map((d, i) => `<div class="media ${i === 0 ? "is-active" : ""}" data-img="${d.img}" data-alt="${esc(d.alt)}" data-label="${d.name}"></div>`).join("");
  const sheet = (d) => `
    <div class="config__facts">
      <span><b>Jours</b> ${d.jours}</span>
      <span><b>Niveau</b> ${d.niveau}</span>
    </div>
    <p class="config__desc">${d.teaser}</p>
    ${d.coachTbd ? `<p class="config__tbd">${COACH_TBD_WHY_SHORT}</p>` : ""}
    <div class="config__cta">
      <a class="btn btn--primary" data-magnetic href="${LINKS.essai}"><span>Essayer · 10€</span></a>
      <a class="btn" data-magnetic href="/plannings/#${d.key}"><span>Voir les créneaux</span></a>
      <a class="btn config__link" data-magnetic href="/activites/#${d.key}"><span>En détail</span></a>
    </div>`;
  body.innerHTML = sheet(DISCIPLINES[0]);
  /* Il y avait ici un préchauffage `new Image(); im.src = d.img` pour que le
     changement d’onglet soit instantané. Depuis que certains clichés sont
     servis en AVIF, ce raccourci téléchargeait le WebP pendant que le <picture>
     du rendu prenait l’AVIF : mesuré, DEUX fichiers pour la même photo et
     +50 Ko sur l’accueil. Les sept médias sont de toute façon montés juste en
     dessous par BC.media() — la même image, une seule fois, dans le format que
     le navigateur a choisi. On laisse donc le navigateur décider seul. */

  let curr = 0;
  /* Le jeton du dernier échange : le corps de la fiche est repeint APRÈS un
     délai (le temps que l’ancien texte s’efface). Au survol on peut traverser
     trois disciplines pendant ce délai — sans jeton, trois repeints s’empilent
     et le dernier arrivé n’est pas forcément le bon. Seul le plus récent peint. */
  let swapSeq = 0;
  let hoverT = 0;               // l’échange au survol en attente (cf. plus bas)
  const select = (i) => {
    if (i === curr || !DISCIPLINES[i]) return;
    curr = i;
    const seq = ++swapSeq;
    const d = DISCIPLINES[i];
    [...list.children].forEach((b, k) => { b.classList.toggle("is-active", k === i); b.setAttribute("aria-selected", String(k === i)); b.setAttribute("tabindex", k === i ? "0" : "-1"); });
    const panel = document.getElementById("config-panel");
    if (panel) panel.setAttribute("aria-labelledby", `cfg-${d.key}`);
    [...mediaBox.children].forEach((m, k) => m.classList.toggle("is-active", k === i));
    if (bg) [...bg.children].forEach((m, k) => m.classList.toggle("is-active", k === i));
    body.classList.add("is-swapping");
    setTimeout(() => {
      if (seq !== swapSeq) return;   // un survol plus récent a pris la main
      body.innerHTML = sheet(d);
      window.BC.magnetic(body);
      body.classList.remove("is-swapping");
    }, reduce ? 0 : 180);
  };
  list.addEventListener("click", (e) => {
    const b = e.target.closest(".cfg");
    if (b) { clearTimeout(hoverT); select(+b.dataset.i); }
  });

  /* ---------------------------------------------------------------- *
   *  LE SURVOL PILOTE LA FICHE — il ne faut plus cliquer pour voir.
   *  Passe le curseur d’Anglaise à Boxing Camp : la photo, le coach, les
   *  jours et le niveau suivent, en direct. Le clic marche toujours (et
   *  reste le SEUL mode au doigt, où le survol n’existe pas : on exige
   *  (hover:hover) ET un pointeur fin, et on ignore les événements de
   *  type "touch" que certains navigateurs émettent quand même).
   *  Anti-scintillement : 90 ms de temporisation. Traverser une entrée
   *  pour aller à la suivante ne la fait donc pas clignoter au passage —
   *  seule celle où le curseur se POSE est jouée.
   * ---------------------------------------------------------------- */
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  list.addEventListener("pointerover", (e) => {
    if (!fine.matches || e.pointerType === "touch") return;
    const b = e.target.closest(".cfg");
    if (!b || +b.dataset.i === curr) return;
    clearTimeout(hoverT);
    hoverT = setTimeout(() => select(+b.dataset.i), 90);
  });
  /* Le curseur quitte la liste : on annule l’échange en attente, mais on ne
     revient PAS en arrière — la dernière discipline regardée reste allumée.
     Une fiche qui se réinitialise dès qu’on s’en éloigne est une fiche qu’on
     ne peut pas lire. */
  list.addEventListener("pointerout", (e) => {
    if (!e.relatedTarget || !list.contains(e.relatedTarget)) clearTimeout(hoverT);
  });
  /* Au clavier, le focus fait exactement ce que fait le survol : immédiat,
     sans temporisation (on ne « traverse » pas une entrée au clavier). */
  list.addEventListener("focusin", (e) => {
    const b = e.target.closest(".cfg");
    if (b) { clearTimeout(hoverT); select(+b.dataset.i); }
  });

  list.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const next = (curr + (e.key === "ArrowDown" ? 1 : DISCIPLINES.length - 1)) % DISCIPLINES.length;
    select(next);
    list.children[next].focus();
  });
}

/* TEASER COACHS — 4 visages → /coachs/. Dadi = photo réelle, les autres =
   tuile initiale stylée showroom (jamais de stock, roster.json fait foi). */
function renderCoaches() {
  const row = $("#coachrow");
  if (!row) return;
  row.innerHTML = COACHES.map((c) => {
    const initial = c.name.trim().charAt(0).toUpperCase();
    // photo seulement si roster.json prouve nom↔visage ; l’alt décrit le
    // cliché (data.js), il ne recopie plus le nom ni le rôle.
    const face = c.img
      ? `<div class="media coachcard__media" data-img="${c.img}" data-label="" data-alt="${esc(c.alt || "")}"></div>`
      : `<div class="coachcard__media coachcard__media--tile" aria-hidden="true"><span>${initial}</span></div>`;
    return `<article class="coachcard">
      ${face}
      <div class="coachcard__body">
        <span class="coachcard__tag">${c.tag}</span>
        <h3 class="coachcard__name">${c.name}</h3>
        <p class="coachcard__role">${c.role}</p>
      </div>
    </article>`;
  }).join("");
}

/* ------------------------- CHOREOGRAPHY --------------------------- */
function countUp() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    if (el.hasAttribute("data-raw")) return;
    const end = +el.dataset.count;
    // Dead-man #1 : no plugin / reduced-motion → paint the REAL number immediately
    // (never leave the "preuves du titre" stuck on 0). Also guards the create() call below.
    if (reduce || !window.ScrollTrigger || !window.gsap) { el.textContent = nf.format(end); return; }
    ScrollTrigger.create({
      trigger: el, start: "top 92%", once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, { v: end, duration: 1.5, ease: "power2.out", onUpdate: () => (el.textContent = nf.format(Math.round(o.v))) });
      },
    });
  });
}

/* ------------------------------ BOOT ------------------------------ */
/* --------------------------- LA SEMAINE ---------------------------
   La semaine est cuite dans le HTML (#semaine). On y marque le jour et le
   PROCHAIN cours, à l’heure de Paris — jamais un « en cours » deviné. */
function marquerSemaine() {
  const box = document.getElementById("semaine");
  const live = document.getElementById("semaine-live");
  if (!box || !live) return;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  const jours = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
  const idx = jours.indexOf(String(parts.weekday || "").slice(0, 3).toLowerCase());
  const maintenant = Number(parts.hour) * 60 + Number(parts.minute);
  const minutes = (t) => { const m = String(t).match(/(\d{1,2})h(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
  const cols = [...box.querySelectorAll(".semaine__jour")];
  const dire = (li, quand) => `${quand} : ${li.querySelector("span")?.textContent || ""} à ${li.dataset.start}`;
  let annonce = "";
  if (idx >= 0 && idx < 6 && cols[idx]) {
    const col = cols[idx]; col.classList.add("is-today"); let prochain = null;
    col.querySelectorAll("li[data-start]").forEach((li) => { if (minutes(li.dataset.start) <= maintenant) li.classList.add("is-past"); else if (!prochain) prochain = li; });
    if (prochain) { prochain.classList.add("is-next"); annonce = dire(prochain, "Prochain cours aujourd’hui"); }
  }
  if (!annonce) {
    for (let k = 1; k <= 7; k++) {
      const col = cols[(Math.max(idx, 0) + k) % 7]; const li = col && col.querySelector("li[data-start]");
      if (li) { annonce = dire(li, `Prochain cours ${col.querySelector(".semaine__nom")?.textContent || ""}`); break; }
    }
  }
  if (annonce) { live.textContent = annonce; live.hidden = false; }
}

function boot() {
  renderStats(); renderTicker(); renderConfig(); renderCoaches(); marquerSemaine();

  window.BC.media(document);
  window.BC.reveal(document);
  window.BC.magnetic(document);
  window.BC.spotlight(".hero", ".hero__spot");   // la lumière suit le curseur
  window.BC.spotlight(".essai", ".essai__spot"); // et éclaire la carte essai
  countUp();
  window.BC.touchLife();   // de la vie sur mobile (hover:none) — cartes + configurateur

  const start = () => { window.BC.refresh(); window.BC.initKinetics(); };
  window.addEventListener("load", start);
  setTimeout(start, 500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
