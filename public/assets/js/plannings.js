/* =====================================================================
   SAINT-CYPRIEN · plannings.js — la semaine, au cordeau.
   Grille HTML utilisable : filtre par jour · discipline · coach, rendue
   depuis SCHEDULE (reconstruit du poster officiel rentrée 2026). Le poster
   couleur, plus bas dans la page, reste la source de vérité.
   Deep-link : /plannings/#<discipline> pré-sélectionne la discipline.
   ===================================================================== */
import { SCHEDULE, DAYS, DISCIPLINES, SEASON_LABEL, COACH_TBD, COACH_TBD_SHORT } from "./data.js?v=30";

const $ = (s, r = document) => r.querySelector(s);
const byKey = Object.fromEntries(DISCIPLINES.map((d) => [d.key, d]));
const state = { day: "", key: "", coach: "" };
/* pas un vrai nom de coach → jamais une puce de filtre (le grappling n’a pas
   encore son encadrant nommé ; roster.json fait foi). */
const NON_COACH = new Set([COACH_TBD]);

/* ------------------------------------------------------------------ *
 * LA SEMAINE EN CHIFFRES — la page affichait une grille sans jamais dire
 * ce qu’elle pèse. Tout est COMPTÉ sur SCHEDULE au chargement : aucun de
 * ces nombres n’est saisi, donc aucun ne peut vieillir. L’heure sert de
 * frontière midi/soir (12h40 vs ≥18h) — c’est la lecture du poster.
 * ------------------------------------------------------------------ */
const hourOf = (t) => parseInt(t, 10);
function renderPulse() {
  const el = $("#pl-pulse");
  if (!el) return;
  const midi = SCHEDULE.filter((s) => hourOf(s.time) >= 11 && hourOf(s.time) < 16).length;
  const soir = SCHEDULE.filter((s) => hourOf(s.time) >= 18).length;
  const jours = new Set(SCHEDULE.map((s) => s.day)).size;
  const disc = new Set(SCHEDULE.map((s) => s.key)).size;
  const cells = [
    { v: SCHEDULE.length, l: "cours dans la semaine" },
    { v: jours, l: "jours ouverts · dimanche fermé" },
    { v: midi, l: "cours en journée" },
    { v: soir, l: "cours du soir, dès 18h" },
    { v: disc, l: "disciplines au planning" },
  ];
  el.innerHTML = cells
    .map((c) => `<div class="pulse"><span class="pulse__v">${c.v}</span><span class="pulse__l">${c.l}</span></div>`)
    .join("");
}

/* --------------------------- RENDER ------------------------------- */
function renderFilters() {
  const box = $("#filters");
  if (!box) return;
  /* Le filtre par coach a ete retire : il publiait qui encadre quoi, ce
     que le club garde pour lui. La grille se filtre par jour et par
     discipline — c'est ce qu'un visiteur cherche de toute facon. */
  const coaches = [];
  const chip = (f, v, label, on) =>
    `<button class="chip${on ? " is-on" : ""}" type="button" data-f="${f}" data-v="${v}" aria-pressed="${on}">${label}</button>`;
  box.innerHTML = `
    <div class="fgroup">
      <span class="fgroup__k">Jour</span>
      <div class="chips">
        ${chip("day", "", "Tous", true)}
        ${DAYS.map((d) => chip("day", d.k, d.long, false)).join("")}
      </div>
    </div>
    <div class="fgroup">
      <span class="fgroup__k">Discipline</span>
      <div class="chips">
        ${chip("key", "", "Toutes", true)}
        ${DISCIPLINES.map((d) => chip("key", d.key, d.name, false)).join("")}
      </div>
    </div>
    <div class="fgroup">
      <span class="fgroup__k">Coach</span>
      <div class="chips">
        ${chip("coach", "", "Tous", true)}
        ${coaches.map((c) => chip("coach", c, c, false)).join("")}
      </div>
    </div>`;
}

function renderGrid() {
  const grid = $("#grid");
  if (!grid) return;
  grid.innerHTML = DAYS.map((day) => {
    const rows = SCHEDULE.filter((s) => s.day === day.k);
    return `<section class="pday" data-day="${day.k}">
      <h3 class="pday__h">${day.long}</h3>
      <ul class="pday__list" data-reveal-group>
        ${rows
          .map((s) => {
            // le créneau sans encadrant nommé porte sa marque : c’est un état
            // assumé, pas une ligne oubliée (cf. COACH_TBD dans data.js).
            const tbd = s.coach === COACH_TBD;
            /* plus de nom d encadrant sur le creneau : seul le niveau reste */
            const meta = s.lvl;
            return `<li class="slot${tbd ? " slot--tbd" : ""}" data-day="${s.day}" data-key="${s.key}" data-coach="${s.coach}">
          <span class="slot__t">${s.time}</span>
          <span class="slot__body"><b class="slot__name">${s.name}</b><span class="slot__meta">${meta}</span></span>
        </li>`;
          })
          .join("")}
      </ul>
    </section>`;
  }).join("");
}

/* --------------------------- FILTER ------------------------------- *
 * Un filtre qui ne dit pas combien il a gardé est un bouton muet : on
 * comptait les créneaux visibles sans jamais l’écrire. Le compteur annonce
 * le résultat (et le lit à voix haute — aria-live), et la remise à zéro
 * n’apparaît QUE lorsqu’il y a quelque chose à remettre à zéro. */
function apply() {
  let shown = 0;
  document.querySelectorAll(".slot").forEach((sl) => {
    const ok =
      (!state.day || sl.dataset.day === state.day) &&
      (!state.key || sl.dataset.key === state.key) &&
      (!state.coach || sl.dataset.coach === state.coach);
    sl.hidden = !ok;
    if (ok) shown++;
  });
  let anyVisible = false;
  document.querySelectorAll(".pday").forEach((d) => {
    const vis = [...d.querySelectorAll(".slot")].some((s) => !s.hidden);
    d.hidden = !vis;
    if (vis) anyVisible = true;
  });
  const empty = $("#pl-empty");
  if (empty) empty.hidden = anyVisible;

  const filtered = !!(state.day || state.key || state.coach);
  const count = $("#pl-count");
  if (count) {
    count.textContent = filtered
      ? `${shown} créneau${shown > 1 ? "x" : ""} sur ${SCHEDULE.length}`
      : `Les ${SCHEDULE.length} cours de la semaine`;
  }
  const reset = $("#pl-reset");
  if (reset) reset.hidden = !filtered;
}

/* Remise à zéro — remet les trois familles sur "Tous/Toutes". */
function resetAll() {
  setActive("day", "");
  setActive("key", "");
  setActive("coach", "");
  apply();
}

function setActive(f, v) {
  state[f] = v;
  document.querySelectorAll(`.chip[data-f="${f}"]`).forEach((c) => {
    const on = c.dataset.v === v;
    c.classList.toggle("is-on", on);
    c.setAttribute("aria-pressed", String(on));
  });
}

function wire() {
  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    setActive(b.dataset.f, b.dataset.v);
    apply();
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest("#pl-reset, .pl-empty__reset")) resetAll();
  });
}

function fromHash() {
  const k = decodeURIComponent(location.hash.slice(1));
  if (k && byKey[k]) { setActive("key", k); apply(); }
}

/* ------------------------------ BOOT ------------------------------ */
function boot() {
  // une seule source de vérité pour le libellé de saison (data.js SEASON_LABEL)
  const seasonEl = document.getElementById("pl-season");
  if (seasonEl) seasonEl.textContent = `${SEASON_LABEL} · Rive gauche`;

  renderPulse();
  renderFilters();
  renderGrid();
  wire();
  fromHash();
  apply();   // le compteur affiche l’état réel dès l’arrivée, filtre ou pas

  window.BC.reveal(document);
  window.BC.magnetic(document);
  window.BC.spotlight(".phero", ".phero__spot");
  window.BC.touchLife();   // mobile : les créneaux s’allument au passage

  const start = () => window.BC.refresh();
  window.addEventListener("load", start);
  setTimeout(start, 500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
