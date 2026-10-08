/* =====================================================================
   SAINT-CYPRIEN · coachs.js — trois coachs, trois surfaces.
   Une carte par coach et rien de plus : le visage, ce qu'il enseigne, et
   un bouton qui ouvre le planning de SA discipline (/plannings/#<clé>,
   la page pré-sélectionne le filtre). Les clés viennent de COACHES.keys ;
   aucune n'est saisie ici.

   CE QU'ON NE PUBLIE PAS : la semaine d'un coach, et qui tient quel
   créneau. C'est interne au club — ça se demande au 05 62 24 46 82. La
   grille de /plannings/ ne porte d'ailleurs plus aucun nom.
   ===================================================================== */
import { COACHES, picture } from "./data.js?v=30";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");


/* ------------------------------------------------------------------ *
 * L'ÉQUIPE — une carte par coach : son cliché, la discipline qu'il
 * enseigne, et l'accès direct au planning de cette discipline. Pas de
 * biographie, pas de compteur de créneaux : la page répond à « qui
 * enseigne quoi », le planning répond à « quand ».
 * ------------------------------------------------------------------ */
function renderRoster() {
  const el = $("#roster");
  if (!el) return;

  el.innerHTML = COACHES.map((c, i) => {
    /* Le rôle s'écrit « Anglaise · Lady Punch · École » : une puce par
       discipline, dans l'ordre où le club les annonce. */
    const chips = c.role.split("·").map((d) => `<li>${esc(d.trim())}</li>`).join("");
    /* Le bouton ouvre la grille filtrée sur sa discipline principale ;
       sans clé connue, il ouvre le planning entier plutôt qu'une ancre
       morte. */
    const key = (c.keys || [])[0];
    const href = key ? `/plannings/#${key}` : "/plannings/";
    const initial = c.name.trim().charAt(0).toUpperCase();

    return `<article class="rostercard ${c.img ? "rostercard--photo" : ""}" data-i="${i}" data-reveal>
      <div class="rostercard__media"${c.img ? "" : ' aria-hidden="true"'}>
        <span class="rostercard__beam" aria-hidden="true"></span>
        ${c.img
          ? picture(c.img, `alt="${esc(c.alt || "")}" loading="${i === 0 ? "eager" : "lazy"}" decoding="async"`)
          : `<span class="rostercard__initial">${initial}</span>`}
      </div>
      <div class="rostercard__body">
        <h3 class="rostercard__name">${esc(c.name)}</h3>
        <div class="rostercard__foot">
          <ul class="rostercard__chips" aria-label="Ce que ${esc(c.name)} enseigne">${chips}</ul>
          <a class="btn rostercard__btn" data-magnetic href="${href}">
            <span>Voir le planning</span>
          </a>
        </div>
      </div>
    </article>`;
  }).join("");
}



/* LE FAISCEAU — il passe d’un coach à l’autre. Interval sobre ; il se cale
   sur la tuile survolée et repart quand le curseur s’en va. CSS-only visual,
   donc insensible au ticker gelé (la lisibilité ne dépend jamais de ça). */
function beam() {
  const cards = [...document.querySelectorAll(".rostercard")];
  if (cards.length < 2) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let curr = 0, timer = null, hovering = false;
  const light = (i) => {
    curr = (i + cards.length) % cards.length;
    cards.forEach((c, k) => c.classList.toggle("is-active", k === curr));
  };
  const tick = () => { if (!hovering) light(curr + 1); };
  const play = () => { if (reduce) return; stop(); timer = setInterval(tick, 2600); };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
  cards.forEach((c, i) => {
    c.addEventListener("pointerenter", () => { hovering = true; light(i); });
    c.addEventListener("pointerleave", () => { hovering = false; });
  });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : play()));
  play();
}

/* ------------------------------ BOOT ------------------------------ */
function boot() {
  renderRoster();

  window.BC.reveal(document);
  window.BC.magnetic(document);
  window.BC.spotlight(".phero", ".phero__spot");
  window.BC.touchLife();   // mobile : les tuiles roster s’animent au passage
  beam();

  const start = () => window.BC.refresh();
  window.addEventListener("load", start);
  setTimeout(start, 500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
