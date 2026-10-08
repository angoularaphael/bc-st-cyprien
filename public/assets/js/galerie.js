/* =====================================================================
   SAINT-CYPRIEN · galerie.js — regardée, pas lue.
   Grille par zone (le plateau · l’anglaise · le pieds-poings · le sol · le
   moteur · Lady Punch · l’école). Le manifeste photo vit désormais dans
   data.js (GALLERY — TODO levé) : zones, édito, captions mono et VRAIS alt.
   L’entrée "développe" chaque photo (du sombre au net) via IntersectionObserver
   — donc insensible au ticker gelé.

   Deux prises en main : l’INDEX des zones (on saute où on veut) et la
   VISIONNEUSE (on regarde une photo en grand, on avance au clavier). Une
   galerie où l’on ne peut pas agrandir une photo n’est pas une galerie.
   ===================================================================== */
import { picture } from "./data.js?v=30";
import { GALLERY } from "./data-galerie.js?v=24";

const $ = (s, r = document) => r.querySelector(s);
const IMG = "/assets/img/sc/";
const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Toutes les photos à plat, dans l’ordre de lecture — c’est la liste que
   la visionneuse parcourt (elle traverse les zones sans buter dessus). */
const FLAT = GALLERY.flatMap((z) => z.shots.map((s) => ({ ...s, zone: z.zone })));

/* Une zone = un intertitre + une ligne d’édito + une grille de figures. */
function figure(s, i) {
  return `<figure class="gitem${s.feat === "wide" ? " gitem--wide" : ""}">
    <button class="gitem__btn" type="button" data-i="${i}" aria-label="Agrandir : ${esc(s.alt)}">
      ${picture(IMG + s.f, `alt="${esc(s.alt)}" loading="lazy" decoding="async"`)}
      <span class="gitem__glow" aria-hidden="true"></span>
      <span class="gitem__zoom" aria-hidden="true">Agrandir</span>
    </button>
    <figcaption class="gitem__cap">${s.cap}</figcaption>
  </figure>`;
}

function renderGallery() {
  const root = $("#galerie");
  if (!root) return;
  let n = -1;
  root.innerHTML = GALLERY.map(
    (z) => `<section class="section gzone" id="zone-${z.id}" aria-label="${z.zone}">
      <div class="wrap">
        <header class="gzone__head" data-reveal>
          <h2 class="gzone__zone">${z.zone}</h2>
          <span class="gzone__spec">${z.spec}</span>
        </header>
        <p class="gzone__lede" data-reveal>${z.lede}</p>
        <div class="ggrid">${z.shots.map((s) => figure(s, ++n)).join("")}</div>
      </div>
    </section>`
  ).join("");
}

/* L’INDEX — une puce par zone, elle emmène à la zone et se surligne quand
   on y est. Même grammaire que les filtres du planning et le plan de la
   visite : sur ce site, une liste de sections se pilote toujours pareil. */
function renderIndex() {
  const el = $("#gindex");
  if (!el) return;
  el.innerHTML = GALLERY.map(
    (z, i) => `<button class="gchip${i === 0 ? " is-on" : ""}" type="button" data-id="${z.id}" aria-current="${i === 0}">
      ${z.zone}<span class="gchip__n">${z.shots.length}</span>
    </button>`
  ).join("");

  const btns = [...el.querySelectorAll(".gchip")];
  /* même règle que le plan de /la-salle/ : on ne bouge que la bande, jamais
     le document (scrollIntoView remonte aux ancêtres et vole le scroll). */
  const keepInStrip = (b) => {
    const br = b.getBoundingClientRect(), pr = el.getBoundingClientRect();
    if (br.left < pr.left) el.scrollLeft += br.left - pr.left - 12;
    else if (br.right > pr.right) el.scrollLeft += br.right - pr.right + 12;
  };
  const mark = (id) => btns.forEach((b) => {
    const on = b.dataset.id === id;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-current", String(on));
    if (on) keepInStrip(b);
  });

  el.addEventListener("click", (e) => {
    const b = e.target.closest(".gchip");
    if (!b) return;
    const t = document.getElementById(`zone-${b.dataset.id}`);
    if (!t) return;
    mark(b.dataset.id);
    window.BC.scrollToEl(t, { offset: -96, block: "start" });
  });

  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (hit) mark(hit.target.id.replace("zone-", ""));
    },
    { threshold: [0.15, 0.4], rootMargin: "-20% 0px -55% 0px" }
  );
  GALLERY.forEach((z) => { const s = document.getElementById(`zone-${z.id}`); if (s) io.observe(s); });
}

/* ------------------------------------------------------------------ *
 * LA VISIONNEUSE — une photo, en grand, sur le noir. Flèches / clic pour
 * naviguer, Échap ou clic hors cadre pour sortir, focus rendu au bouton
 * d’origine. Le focus reste piégé dans la boîte tant qu’elle est ouverte.
 * La légende porte la zone + la caption ; le texte alternatif reste sur
 * l’image (il décrit, il ne décore pas).
 * ------------------------------------------------------------------ */
function lightbox() {
  const box = $("#glight");
  if (!box || !FLAT.length) return;

  box.innerHTML = `
    <div class="glight__scrim" data-close></div>
    <div class="glight__inner" role="dialog" aria-modal="true" aria-label="Visionneuse photo" aria-describedby="glight-cap">
      <figure class="glight__fig">
        <!-- pas de src="" ici : un src vide fait re-télécharger la PAGE elle-même
             comme si c’était une image (requête inutile + image cassée au DOM).
             La source n’est posée qu’à la première ouverture, dans paint(). -->
        <img id="glight-img" alt="" decoding="async" />
        <figcaption class="glight__cap" id="glight-cap">
          <span class="glight__zone"></span>
          <span class="glight__label"></span>
          <span class="glight__count"></span>
        </figcaption>
      </figure>
      <button class="glight__nav glight__nav--prev" type="button" data-step="-1" aria-label="Photo précédente">‹</button>
      <button class="glight__nav glight__nav--next" type="button" data-step="1" aria-label="Photo suivante">›</button>
      <button class="glight__close" type="button" data-close aria-label="Fermer la visionneuse">Fermer <span aria-hidden="true">✕</span></button>
    </div>`;

  const img = $("#glight-img", box);
  const zone = $(".glight__zone", box);
  const label = $(".glight__label", box);
  const count = $(".glight__count", box);
  const focusables = () => [...box.querySelectorAll("button")].filter((b) => b.offsetParent !== null);
  let i = 0, opener = null;

  const paint = (n) => {
    i = (n + FLAT.length) % FLAT.length;
    const s = FLAT[i];
    img.src = IMG + s.f;
    img.alt = s.alt;
    zone.textContent = s.zone;
    label.textContent = s.cap;
    count.textContent = `${i + 1} / ${FLAT.length}`;
  };

  const open = (n, from) => {
    opener = from || null;
    paint(n);
    box.classList.add("is-open");
    box.removeAttribute("hidden");
    document.documentElement.classList.add("is-locked");
    window.BC?.lenis?.stop?.();
    $(".glight__close", box).focus();
  };

  const close = () => {
    box.classList.remove("is-open");
    box.setAttribute("hidden", "");
    document.documentElement.classList.remove("is-locked");
    window.BC?.lenis?.start?.();
    opener?.focus();
    opener = null;
  };

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".gitem__btn");
    if (trigger) { open(+trigger.dataset.i, trigger); return; }
  });

  box.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) { close(); return; }
    const nav = e.target.closest(".glight__nav");
    if (nav) paint(i + +nav.dataset.step);
  });

  document.addEventListener("keydown", (e) => {
    if (!box.classList.contains("is-open")) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); paint(i + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); paint(i - 1); }
    else if (e.key === "Tab") {
      // piège à focus : la visionneuse est modale, on ne s’en échappe pas au clavier
      const f = focusables();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

/* "Développer" — chaque photo passe du sombre au net quand elle entre dans
   le cadre. Pur IO ; en reduced-motion ou sans IO, tout est net d’emblée. */
function develop() {
  const items = [...document.querySelectorAll(".gitem")];
  const revealAll = () => items.forEach((it) => it.classList.add("is-in"));
  if (reduce || !("IntersectionObserver" in window)) { revealAll(); return; }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }),
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );
  items.forEach((it) => io.observe(it));

  // Dead-man net (loi n°1) : si le ticker gsap est gelé (rAF mort → scroll
  // Lenis bloqué, l’IO ne verra jamais les photos entrer), on développe tout
  // pour ne JAMAIS laisser une photo illisible. Sur un vrai navigateur le
  // ticker avance → ce filet ne se déclenche pas, l’IO fait le développé.
  const g = window.gsap;
  if (g) { const f0 = g.ticker.frame; setTimeout(() => { if (g.ticker.frame === f0) revealAll(); }, 3500); }
  else { setTimeout(revealAll, 3500); }
}

/* Le compteur du héros — le nombre de clichés, calculé, jamais saisi. */
function stampCount() {
  const el = $("#gcount");
  if (el) el.textContent = `${FLAT.length} clichés · ${GALLERY.length} zones`;
}

/* ------------------------------------------------------------------ *
 * LE MUR DU CLUB, EN CHARGEMENT PARESSEUX. Le module communautaire (et le
 * réseau qui va avec) ne descend QUE lorsque la section approche du cadre.
 * Un visiteur qui vient voir les photos de la salle et repart n’aura donc
 * téléchargé ni le mur, ni — a fortiori — le formulaire (lui, c’est encore
 * un cran plus loin : au clic). Sans IntersectionObserver, on charge au
 * premier défilement : jamais au premier rendu, jamais jamais non plus.
 * ------------------------------------------------------------------ */
function armCommunity() {
  const sec = document.getElementById("club");
  if (!sec) return;
  let parti = false;
  const go = () => {
    if (parti) return;
    parti = true;
    import("./community.js?v=22").then((m) => m.initCommunity()).catch(() => { /* le reste de la page vit sa vie */ });
  };
  if (!("IntersectionObserver" in window)) {
    window.addEventListener("scroll", go, { once: true, passive: true });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); go(); }
  }, { rootMargin: "600px 0px" });
  io.observe(sec);
}

/* ------------------------------ BOOT ------------------------------ */
function boot() {
  renderGallery();
  develop(); // rend les photos visibles en premier — indépendant de BC/gsap
  renderIndex();
  stampCount();
  lightbox();
  armCommunity();

  window.BC.reveal(document);
  window.BC.magnetic(document);
  window.BC.spotlight(".phero", ".phero__spot");
  window.BC.touchLife();

  const start = () => window.BC.refresh();
  window.addEventListener("load", start);
  setTimeout(start, 500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
