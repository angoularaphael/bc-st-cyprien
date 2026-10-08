/* =====================================================================
   SAINT-CYPRIEN · contact.js — zéro friction.
   Coordonnées + carte + horaires + FAQ visible. Tout depuis data.js ; pas de formulaire local, l’essai → box-plus,
   la pastille chatbot → tel réel.
   ===================================================================== */
import { SALLE, FAQ, REVIEWS } from "./data.js?v=30";

const $ = (s, r = document) => r.querySelector(s);

function renderCoords() {
  const el = $("#coords");
  if (!el) return;
  const rows = [
    { k: "Adresse", v: SALLE.address.full },
    { k: "Tram", v: "Ligne T1 · Fer à Cheval, 200 m" },
    { k: "Stationnement", v: "Parking Saint-Cyprien à proximité" },
    { k: "Téléphone", v: `<a href="tel:${SALLE.phoneHref}">${SALLE.phone}</a>` },
    { k: "E-mail", v: `<a href="mailto:${SALLE.email}">${SALLE.email}</a>` },
    { k: "Fédérations", v: SALLE.federations.join(" · ") },
  ];
  el.innerHTML = rows.map((r) => `<li><span class="ck">${r.k}</span><span class="cv">${r.v}</span></li>`).join("");
}

function renderHours() {
  const el = $("#hours");
  if (!el) return;
  el.innerHTML = SALLE.hoursData
    .map((h) => `<li><span class="hk">${h.d}</span><span class="hv">${h.h}</span></li>`)
    .join("");
}

function renderReviewsLink() {
  const el = $("#rating");
  if (!el || !REVIEWS?.url) return;
  el.innerHTML = `<a class="reviews__src" href="${REVIEWS.url}" target="_blank" rel="noopener noreferrer">${REVIEWS.label} ↗</a>`;
}

function renderFaq() {
  const el = $("#faq");
  if (!el) return;
  el.innerHTML = FAQ.map(
    (f) => `<details><summary>${f.q}</summary><div class="faq__a">${f.a}</div></details>`
  ).join("");
}

/* ------------------------------ BOOT ------------------------------ */
function boot() {
  renderCoords();
  renderHours();
  renderReviewsLink();
  renderFaq();

  window.BC.reveal(document);
  window.BC.magnetic(document);
  window.BC.spotlight(".phero", ".phero__spot");
  window.BC.touchLife();   // mobile : coordonnées & lignes s’animent au passage

  const start = () => window.BC.refresh();
  window.addEventListener("load", start);
  setTimeout(start, 500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
