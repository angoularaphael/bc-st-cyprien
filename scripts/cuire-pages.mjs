/* =====================================================================
   SAINT-CYPRIEN · scripts/cuire-pages.mjs — le texte entre dans le HTML

   LE PROBLÈME, MESURÉ EN LIGNE (20/08/2026). Les pages servaient beaucoup
   de HTML et presque aucun contenu :

       page          html servi   texte une fois les <script> retirés
       /coachs         24 632 o     1 606 o
       /plannings      31 567 o     1 883 o
       /tarifs         25 196 o     2 076 o
       /activites      24 100 o     1 462 o

   Autrement dit : entre 85 et 95 % de ce que lit un visiteur n'existait
   que dans le JavaScript. Google finit par exécuter le JS, avec retard et
   dans la limite d'un budget ; les robots des assistants — GPTBot,
   ClaudeBot, PerplexityBot — ne l'exécutent pas du tout. Les coachs, les
   créneaux, les tarifs et les disciplines étaient donc invisibles pour
   exactement les moteurs que l'on cherche à séduire.

   CE QUE FAIT CE SCRIPT. Après le build, il écrit dans les creux le même
   contenu que le JS peindra ensuite, tiré des MÊMES fichiers de données.
   Le balisage est volontairement sobre (h2/h3/p/dl) plutôt qu'une copie
   du rendu riche : c'est le TEXTE qui doit être lisible, et une copie
   fidèle du markup dériverait au premier changement de style. Chaque
   module fait `el.innerHTML = …` au chargement : le visiteur voit le
   rendu complet, à l'identique, et rien n'apparaît deux fois.

   Effet de bord assumé : sans JavaScript, les pages restent lisibles.

   GARDE-FOU. Si un creux n'est plus vide ou a changé de nom, le script
   s'arrête en erreur au lieu de cuire à côté — on veut le savoir tout de
   suite, pas découvrir six mois plus tard que la page était vide.

   Usage : appelé par `npm run postbuild`, après cuire-galerie.mjs.
   ===================================================================== */
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = (f) => pathToFileURL(join(ROOT, "public", "assets", "js", f)).href;
const {
  COACHES,
  SCHEDULE,
  DAYS,
  DISCIPLINES,
  FAQ,
  SALLE,
  PROMOS,
  TARIFS,
  REVIEWS,
  LINKS,
  NETWORK,
} = await import(url("data.js"));
const { ECOLE_LEVELS, PARCOURS } = await import(url("data-activites.js"));
const { VISITE, VALUES } = await import(url("data-la-salle.js"));
const { PRICING_FAQ } = await import(url("data-tarifs.js"));

const e = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Les URLs peuvent venir du vestiaire. L'échappement HTML empêche de
   casser l'attribut, mais seul ce filtre interdit un protocole exécutable. */
const href = (value) => {
  const brut = String(value ?? "").trim();
  if (/^\/(?!\/)/.test(brut)) return e(brut);
  try {
    const protocole = new URL(brut).protocol;
    if (["https:", "tel:", "mailto:"].includes(protocole)) return e(brut);
  } catch { /* l'erreur explicite ci-dessous donne la valeur fautive */ }
  throw new Error(`[pages] URL refusee dans le contenu : ${brut || "(vide)"}`);
};

/* Le même jeu de données alimente aussi le rendu JavaScript. En validant
   toutes ses destinations au build, on protège les liens qui ne sont pas
   eux-mêmes cuits dans un creux HTML. */
for (const destination of Object.values(LINKS)) href(destination);
for (const tarif of TARIFS) href(tarif.href);
for (const destination of [SALLE.mapsLink, SALLE.mapsUrl]) href(destination);

/* ------------------------------------------------------------------ */
/* /coachs — qui enseigne quoi. JAMAIS a quelle heure : le planning     */
/* des encadrants est interne au club.                                 */
/* ------------------------------------------------------------------ */
const roster = COACHES.map(
  (c) =>
    `<article><h3>${e(c.name)}</h3><p><b>${e(c.role)}</b>${
      c.tag ? ` · ${e(c.tag)}` : ""
    }</p></article>`
).join("");

/* ------------------------------------------------------------------ */
/* / — l'état initial du configurateur et le teaser des coachs.        */
/* Le JavaScript les remplace ensuite avec le même jeu de données.     */
/* ------------------------------------------------------------------ */
const configList = DISCIPLINES.map(
  (d, i) => `<button class="cfg${i === 0 ? " is-active" : ""}" type="button" role="tab" aria-selected="${
    i === 0
  }" tabindex="${i === 0 ? 0 : -1}" aria-controls="config-panel" id="cfg-${e(d.key)}" data-i="${i}">
    <span class="cfg__n">${String(i + 1).padStart(2, "0")}</span>
    <span class="cfg__name">${e(d.name)}</span>
    <span class="cfg__tag">${e(d.tag)}</span>
  </button>`
).join("");

const premièreDiscipline = DISCIPLINES[0];
const configBody = `<div class="config__facts">
  <span><b>Jours</b> ${e(premièreDiscipline.jours)}</span>
  <span><b>Niveau</b> ${e(premièreDiscipline.niveau)}</span>
</div>
<p class="config__desc">${e(premièreDiscipline.teaser)}</p>
<div class="config__cta">
  <a class="btn btn--primary" href="${href(LINKS.essai)}"><span>Essayer · 10€</span></a>
  <a class="btn" href="/plannings/#${e(premièreDiscipline.key)}"><span>Voir les créneaux</span></a>
  <a class="btn config__link" href="/activites/#${e(premièreDiscipline.key)}"><span>En détail</span></a>
</div>`;

const coachrow = COACHES.map(
  (c) => `<article class="coachcard"><div class="coachcard__body">
    <span class="coachcard__tag">${e(c.tag)}</span>
    <h3 class="coachcard__name">${e(c.name)}</h3>
    <p class="coachcard__role">${e(c.role)}</p>
  </div></article>`
).join("");

/* ------------------------------------------------------------------ */
/* /activites — les disciplines, l'école, et par quoi commencer        */
/* ------------------------------------------------------------------ */
const catalogue =
  DISCIPLINES.map(
    (d) => `<article><h3>${e(d.name)}</h3><p><b>${e(d.tag)}</b>${
      ""
    }</p><p>${e(d.desc)}</p><p>${e(d.jours)}${d.niveau ? ` · ${e(d.niveau)}` : ""}</p></article>`
  ).join("") +
  `<section><h3>L'école, par âge</h3>${ECOLE_LEVELS.map(
    (l) => `<article><h4>${e(l.name)} — ${e(l.age)}</h4><p>${e(l.jours)}</p><p>${e(l.d)}</p></article>`
  ).join("")}</section>` +
  `<section><h3>Par où commencer</h3>${PARCOURS.map(
    (p) => `<article><h4>${e(p.want)}</h4><p>${e(p.why)}</p></article>`
  ).join("")}</section>`;

/* ------------------------------------------------------------------ */
/* /plannings — la semaine, jour par jour                              */
/* ------------------------------------------------------------------ */
const grid = DAYS.map((d) => {
  const cours = SCHEDULE.filter((s) => s.day === d.k);
  if (!cours.length) return "";
  return `<section><h3>${e(d.long)}</h3><ul>${cours
    .map(
      (s) =>
        `<li>${e(s.time)} — ${e(s.name)}${s.lvl ? ` · ${e(s.lvl)}` : ""}</li>`
    )
    .join("")}</ul></section>`;
}).join("");

/* ------------------------------------------------------------------ */
/* /contact — coordonnées, horaires, note et réponses utiles.          */
/* ------------------------------------------------------------------ */
const coords = [
  ["Adresse", e(SALLE.address.full)],
  ["Tram", "Ligne T1 · Fer à Cheval, 200 m"],
  ["Stationnement", "Parking Saint-Cyprien à proximité"],
  ["Téléphone", `<a href="${href(`tel:${SALLE.phoneHref}`)}">${e(SALLE.phone)}</a>`],
  ["E-mail", `<a href="${href(`mailto:${SALLE.email}`)}">${e(SALLE.email)}</a>`],
  ["Fédérations", e(SALLE.federations.join(" · "))],
]
  .map(([k, v]) => `<li><span class="ck">${e(k)}</span><span class="cv">${v}</span></li>`)
  .join("");

const hours = SALLE.hoursData
  .map((h) => `<li><span class="hk">${e(h.d)}</span><span class="hv">${e(h.h)}</span></li>`)
  .join("");

const rating = `<a class="reviews__src" href="${href(
  REVIEWS.url
)}" target="_blank" rel="noopener noreferrer">${e(REVIEWS.label)} ↗</a>`;

const faqMarkup = (items) => items.map(
  (f) => `<details><summary>${e(f.q)}</summary><div class="faq__a">${e(f.a)}</div></details>`
).join("");
const contactFaq = faqMarkup(FAQ);

/* ------------------------------------------------------------------ */
/* /la-salle — la visite, les valeurs, le réseau et les infos.         */
/* ------------------------------------------------------------------ */
const visite = VISITE.map(
  (v) => `<article><span>${e(v.n)}</span><h3>${e(v.t)}</h3><p><b>${e(v.tag)}</b></p><p>${e(v.d)}</p>
    <ul>${v.specs.map((s) => `<li>${e(s)}</li>`).join("")}</ul></article>`
).join("");

const code = VALUES.map(
  (v) => `<article><span>${e(v.n)}</span><h3>${e(v.t)}</h3><p>${e(v.d)}</p></article>`
).join("");

const lineage =
  NETWORK.map(
    (n, i) => `<li><span>0${i + 1}</span><h3>${e(n.name)}</h3><p><b>${e(n.tag)}</b> · ${e(
      n.feat
    )}</p><a href="${href(n.url)}" rel="noopener">Découvrir ${e(n.name)}</a></li>`
  ).join("") +
  `<li><span>05</span><h3>Saint-Cyprien</h3><p><b>Toulouse rive gauche</b> · Club de boxe et de sports de combat.</p></li>`;

const infos = [
  ["Adresse", e(SALLE.address.full)],
  ["Tram", "Ligne T1 · Fer à Cheval, 200 m"],
  ["Horaires", e(SALLE.hours)],
  ["Stationnement", "Parking Saint-Cyprien à proximité"],
  ["Téléphone", `<a href="${href(`tel:${SALLE.phoneHref}`)}">${e(SALLE.phone)}</a>`],
  ["Fédérations", e(SALLE.federations.join(" · "))],
]
  .map(([k, v]) => `<li><span class="qk">${e(k)}</span><span class="qv">${v}</span></li>`)
  .join("");

/* ------------------------------------------------------------------ */
/* /tarifs — offres, tarifs permanents, essai et avis.                 */
/* ------------------------------------------------------------------ */
const promoCard = (o) => `<article><h3>${e(o.name)}</h3><p><b>${e(o.price)}</b> ${e(
  o.unit
)}</p>${o.was ? `<p>Au lieu de ${e(o.was)}</p>` : ""}<p>${e(o.detail)}</p><a href="${href(o.href)}">${e(
  o.cta
)}</a></article>`;
const promos = promoCard(PROMOS.duo) + promoCard(PROMOS.saisonOffer);

const carteTarif = (t) => `<article><h3>${e(t.name)}</h3>${
  t.price ? `<p><b>${e(t.price)}</b> ${e(t.period)}</p>` : ""
}<p>${e(t.feature)}</p><ul>${t.items.map((i) => `<li>${e(i)}</li>`).join("")}</ul><a href="${href(
  t.href
)}">${e(t.cta)}</a></article>`;

const classique = TARIFS.find((t) => t.name.toLowerCase().startsWith("les classiques"));
if (!classique) throw new Error("[pages] tarif critique « Les classiques » introuvable");
const classiques = carteTarif(classique);
const école = TARIFS.find((t) => t.name.startsWith("École"));
const more =
  (école ? carteTarif(école) : "") +
  carteTarif({
    name: "Coaching privé",
    feature: "En tête-à-tête, ton geste sous une seule paire d’yeux",
    items: ["Sur rendez-vous", "On casse un défaut précis", "Avec un coach de la salle"],
    cta: "Voir les coachings",
    href: LINKS.coachings,
  }) +
  carteTarif({
    name: "Matériel",
    feature: "Gants, protections, textile",
    items: ["Équipe-toi pour durer", "Conseil à la salle", "Boutique en ligne"],
    cta: "La boutique",
    href: LINKS.materiel,
  });

const essai = `<div class="essai__body"><span class="eyebrow">La séance d’essai</span>
  <h2 class="display essai__title">Rien de tout ça ?<br><span class="tint">Alors viens voir. Dix euros.</span></h2>
  <p class="lead essai__lead">${e(PROMOS.essai.detail)}</p></div>
  <div class="essai__cta"><a class="btn btn--primary" href="${href(PROMOS.essai.href)}"><span>${e(
    PROMOS.essai.cta
  )} · ${e(PROMOS.essai.price)}</span></a>
  <a class="btn" href="${href(`tel:${SALLE.phoneHref}`)}"><span>${e(SALLE.phone)}</span></a></div>`;

const reviews = `<div class="reviews__bar"><a class="reviews__src" href="${href(
  REVIEWS.url
)}" target="_blank" rel="noopener noreferrer">${e(REVIEWS.source)} · ${e(REVIEWS.label)} ↗</a></div><div class="reviews__grid">${REVIEWS.quotes
  .map((q) => `<blockquote class="review"><p class="review__text">« ${e(q.text)} »</p><cite class="review__author">— ${e(q.author)}</cite></blockquote>`)
  .join("")}</div>`;

/* ------------------------------------------------------------------ */
/* /tarifs — les questions d'argent, répondues                         */
/* ------------------------------------------------------------------ */
const pricingFaq = faqMarkup(PRICING_FAQ);

/* ------------------------------------------------------------------ */
const FOURNEES = [
  ["", "config-list", configList, DISCIPLINES.length + " disciplines"],
  ["", "config-body", configBody, "fiche initiale du configurateur"],
  ["", "coachrow", coachrow, COACHES.length + " coachs"],
  ["coachs", "roster", roster, COACHES.length + " coachs"],
  ["plannings", "grid", grid, SCHEDULE.length + " creneaux"],
  ["contact", "coords", coords, "coordonnees"],
  ["contact", "hours", hours, SALLE.hoursData.length + " plages horaires"],
  ["contact", "rating", rating, "lien vers les avis Google actuels"],
  ["contact", "faq", contactFaq, FAQ.length + " questions"],
  ["la-salle", "visite", visite, VISITE.length + " postes"],
  ["la-salle", "code", code, VALUES.length + " valeurs"],
  ["la-salle", "lineage", lineage, NETWORK.length + 1 + " salles"],
  ["la-salle", "infos", infos, "informations pratiques"],
  ["tarifs", "promos", promos, "offres promotionnelles"],
  ["tarifs", "classiques", classiques, "tarif permanent"],
  ["tarifs", "more", more, "ecole, coaching et materiel"],
  ["tarifs", "essai", essai, "seance d'essai"],
  ["tarifs", "reviews", reviews, "source des avis actuels"],
  ["tarifs", "faq", pricingFaq, PRICING_FAQ.length + " questions"],
];

const pages = new Map();
const manques = [];
for (const [page, id, contenu, quoi] of FOURNEES) {
  const f = join(ROOT, "dist", page, "index.html");
  if (!pages.has(f)) pages.set(f, await readFile(f, "utf8"));
  const creux = new RegExp(`(<(?:div|section|ul|ol)[^>]*\\s+id="${id}"[^>]*>)\\s*(</(?:div|section|ul|ol)>)`);
  const html = pages.get(f);
  if (!creux.test(html)) {
    console.error(`[pages] #${id} de /${page}/ n'est plus vide ou a change de forme — rien de cuit`);
    manques.push(`#${id} de /${page}/`);
    continue;
  }
  pages.set(f, html.replace(creux, (_match, ouverture, fermeture) => ouverture + contenu + fermeture));
  console.log(`[pages] /${page}/ #${id} : ${quoi}`);
}
for (const [f, html] of pages) await writeFile(f, html);
console.log(`[pages] contenu cuit — ${pages.size} page(s) lisibles sans JavaScript`);
if (manques.length) {
  console.error(`[pages] ${manques.length} creux introuvable(s) : ${manques.join(", ")}`);
  process.exit(1);
}
