/* =====================================================================
   PRÉ-BUILD — le sitemap se date tout seul.

   Avant, <lastmod> était écrit à la main dans public/sitemap.xml : au
   premier contenu publié depuis le vestiaire, la date mentait. Une date
   en dur dans un fichier inerte est une copie périssable — interdit.

   Ici, chaque URL est datée par le DERNIER COMMIT qui a touché ses
   sources réelles (la page .astro, ses données, sa feuille, son script).
   Pas de dépôt git accessible ⇒ on retombe sur la date de modification
   du fichier. Le sitemap ne peut donc plus vieillir tout seul.

   Usage : node scripts/build-sitemap.mjs
   ===================================================================== */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const ROOT = process.cwd();
const SITE = "https://club-boxe-toulouse.com";
const OUT = path.join(ROOT, "public/sitemap.xml");

/* Le contenu éditorial du sitemap reste écrit à la main — les titres
   d'images sont de la copie, pas des données. Seule la DATE est calculée. */
const COMMON = ["public/assets/js/data.js", "public/content.json", "public/assets/js/site.js"];

/* ---------------------------------------------------------------------
   L'INVENTAIRE DES PHOTOS — pourquoi il vaut la peine d'être écrit.

   Les visuels du site sont posés en fonds CSS et en grilles rendues par le
   JavaScript. Google Images n'indexe que ce qu'il VOIT dans le HTML : une
   photo en `background-image` ne rapporte pas un clic. Le sitemap d'images
   est la seule déclaration qui les rattrape — mais il n'en portait qu'UNE
   par page, et six pages sur neuf montraient la même.

   Chaque photo reçoit donc son titre et sa légende, écrits avec les mots
   de Saint-Cyprien quand elle montre réellement la salle. Les scènes
   d'entraînement venues d'un club sœur (cadrées sur les personnes) gardent
   une légende qui décrit le geste, sans jamais les situer rue Sainte-Lucie.

   Une seule taille déclarée par visuel : `planning-2026-1600` et
   `planning-2026-800` sont la même affiche, en concurrence l'une de
   l'autre si on les déclarait toutes les deux.
   --------------------------------------------------------------------- */
const CLUB = "Boxing Center Saint-Cyprien";
const I = {
  hero:      ["/assets/img/sc/hero-salle.webp", `Club de boxe à Toulouse Saint-Cyprien — ${CLUB}`, "Le plateau de boxe du Boxing Center Saint-Cyprien, présenté sur la page d’accueil."],
  salle:     ["/assets/img/sc/salle-1.webp", `Le plateau, vu depuis la porte — ${CLUB}`, "La salle du Boxing Center Saint-Cyprien vue depuis la porte : les sacs et le ring au fond."],
  plateau:   ["/assets/img/sc/plateau-large.webp", `Le plateau de boxe — ${CLUB}`, "Vue large du plateau avec les sacs suspendus, les tapis et le ring du Boxing Center Saint-Cyprien."],
  sacs:      ["/assets/img/sc/sacs-rangee-2.webp", `La rangée de sacs — ${CLUB}`, "Les sacs de frappe suspendus à la charpente du Boxing Center Saint-Cyprien."],
  ring:      ["/assets/img/sc/ring-boxing.webp", `Le ring — ${CLUB}`, "Le ring aux cordes rouges et blanches au fond du plateau de Saint-Cyprien."],
  salleCross:["/assets/img/sc/salle-cross.webp", `La zone cross-training — ${CLUB}`, "La zone cross-training avec cages et box de saut au Boxing Center Saint-Cyprien."],
  anglaise:  ["/assets/img/sc/anglaise-header.webp", `Boxe anglaise, le noble art — ${CLUB}`, "Cours de boxe anglaise au Boxing Center Saint-Cyprien, rive gauche de Toulouse."],
  anglaise2: ["/assets/img/sc/anglaise.webp", `Sur le ring en boxe anglaise — ${CLUB}`, "Travail au ring pendant un cours de boxe anglaise, 11 rue Sainte-Lucie à Toulouse."],
  thai:      ["/assets/img/sc/thai.webp", `Boxe thaï — ${CLUB}`, "Cours de boxe thaï au Boxing Center Saint-Cyprien : coudes, genoux, tibias."],
  thai1:     ["/assets/img/sc/thai-1.webp", `Coup de pied haut en boxe thaï — ${CLUB}`, "Travail pieds-poings en boxe thaï au Boxing Center Saint-Cyprien."],
  thai2:     ["/assets/img/sc/thai-2.webp", `Clinch et genoux en boxe thaï — ${CLUB}`, "Boxe thaï au Boxing Center Saint-Cyprien, tous niveaux, débutants inclus."],
  grappling: ["/assets/img/sc/grappling.webp", `Grappling au sol — ${CLUB}`, "Travail de contrôle au sol pendant un cours de grappling au Boxing Center Saint-Cyprien."],
  cross:     ["/assets/img/sc/cross.webp", `Cross training — ${CLUB}`, "Cours de cross training au Boxing Center Saint-Cyprien, rive gauche."],
  hyrox:     ["/assets/img/sc/hyrox.webp", `Préparation Hyrox — ${CLUB}`, "Préparation Hyrox au Boxing Center Saint-Cyprien : course, force, endurance."],
  k1:        ["/assets/img/sc/k1-coup-pied.webp", `Travail pieds-poings — ${CLUB}`, "Un pratiquant travaille un coup de genou avec son coach devant le ring de Saint-Cyprien."],
  k1Duo:     ["/assets/img/sc/k1-duo.webp", `Technique K1 en binôme — ${CLUB}`, "Un coach montre la garde et la distance pendant un cours pieds-poings à Saint-Cyprien."],
  crossGroup:["/assets/img/sc/cross-groupe.webp", `Boxing Camp en groupe — ${CLUB}`, "Plusieurs binômes s’entraînent sur les tapis entre les sacs et le ring."],
  crossCircuit:["/assets/img/sc/cross-circuit.webp", `Circuit collectif — ${CLUB}`, "Un groupe réalise des squats en deux lignes pendant un circuit au Boxing Center Saint-Cyprien."],
  lady:      ["/assets/img/sc/lady.webp", `Lady Boxing, le cours 100 % femmes — ${CLUB}`, "Le cours Lady Boxing du Boxing Center Saint-Cyprien, réservé aux femmes."],
  lady2:     ["/assets/img/sc/lady-2.webp", `En garde au cours Lady Punch — ${CLUB}`, "Cours Lady Punch, 100 % féminin, au Boxing Center Saint-Cyprien, 11 rue Sainte-Lucie."],
  educative: ["/assets/img/sc/educative.webp", `Boxe éducative pour les enfants — ${CLUB}`, "La boxe éducative du Boxing Center Saint-Cyprien : apprendre à boxer sans prendre de coups."],
  educative1:["/assets/img/sc/educative-1.webp", `L'école de boxe des enfants — ${CLUB}`, "Cours de boxe éducative encadré au Boxing Center Saint-Cyprien."],
  muscu:     ["/assets/img/sc/muscu.webp", `L'espace musculation — ${CLUB}`, "L'espace musculation du Boxing Center Saint-Cyprien, compris dans l'abonnement."],
  training:  ["/assets/img/sc/training.webp", `Travail technique aux pattes d'ours — ${CLUB}`, "Le coach corrige la garde pendant un entraînement au Boxing Center Saint-Cyprien."],
  niveaux:   ["/assets/img/sc/tous-niveaux.webp", `Tous les niveaux sur le même plateau — ${CLUB}`, "Débutants et confirmés s'entraînent ensemble au Boxing Center Saint-Cyprien."],
  pattesOurs: ["/assets/img/sc/pattes-ours-combinaison.webp", "Travail aux pattes d'ours — Boxing Center", "Un coach tient les pattes d'ours, un jeune boxeur enchaîne sa combinaison."],
  charpente: ["/assets/img/sc/charpente-contrejour.webp", `Le cours collectif sous la charpente — ${CLUB}`, "Un cours collectif sous la charpente du Boxing Center Saint-Cyprien, pratiquantes en garde."],
  coursLarge: ["/assets/img/sc/cours-large.webp", `Boxing Camp, le cours collectif — ${CLUB}`, "Un cours collectif sur tout le plateau de Saint-Cyprien : binômes en garde, sacs et ring au fond."],
  circuit: ["/assets/img/sc/circuit-halteres.webp", "Circuit Hyrox et cross-training — Boxing Center", "Trois pratiquantes enchaînent swing, développé et fentes autour d'un box en bois."],
  salleRingLarge: ["/assets/img/sc/salle-ring-large.webp", `Le plateau d'un seul tenant — ${CLUB}`, "Le plateau de Saint-Cyprien : tapis bleu et rouge au premier plan, ring Boxing Center au fond."],
  ringSeul: ["/assets/img/sc/ring-seul.webp", `Le ring de boxe anglaise — ${CLUB}`, "Le ring de boxe anglaise du Boxing Center Saint-Cyprien devant les fresques de boxeurs."],
  salleTapis: ["/assets/img/sc/salle-tapis.webp", `Le tapis pieds-poings — ${CLUB}`, "Le tapis pieds-poings rouge, la rangée de sacs Metal et le ring de Saint-Cyprien."],
  muscuMachines: ["/assets/img/sc/muscu-machines.webp", `La zone musculation — ${CLUB}`, "Machines guidées, rameurs et racks de la zone musculation de Saint-Cyprien."],
  salleTapis2: ["/assets/img/sc/salle-tapis-2.webp", `Le tapis de l'école — ${CLUB}`, "Le grand tapis bleu et rouge où se tient l'école de boxe de Saint-Cyprien."],
  coursPlateau: ["/assets/img/sc/cours-plateau.webp", `Un cours sur le plateau — ${CLUB}`, "Binômes en garde sur les tapis bleu et rouge pendant un cours à Saint-Cyprien."],
  salleContrejour: ["/assets/img/sc/salle-contrejour.webp", `Le ring entre deux sacs — ${CLUB}`, "Le ring Boxing Center de Saint-Cyprien vu entre deux sacs de frappe."],
  coursGarde: ["/assets/img/sc/cours-garde.webp", `Boxe anglaise : en garde — ${CLUB}`, "Des pratiquantes en garde travaillent aux boucliers sur le tapis de Saint-Cyprien."],
  boxeSacs: ["/assets/img/sc/boxe-anglaise-sacs.webp", "Boxe anglaise aux sacs — Boxing Center", "Un boxeur en maillot vert, garde haute, déplace ses appuis entre deux sacs de frappe."],
  thaiGenou: ["/assets/img/sc/thai-genou.webp", `Boxe thaï et K1 — ${CLUB}`, "Un cours pieds-poings à Saint-Cyprien : un jeune en garde, un coup de pied haut derrière lui."],
  cageKick: ["/assets/img/sc/cage-coup-de-pied.webp", "Coup de pied dans la cage — Boxing Center", "Un pratiquant arme un coup de pied sur les paos que tient son partenaire, dans la cage."],
  ppBinome: ["/assets/img/sc/pieds-poings-binome.webp", "Pieds-poings en binôme — Boxing Center", "Une pratiquante monte le genou sur les paos que tient son partenaire, protège-tibias aux jambes."],
  grapplingControle: ["/assets/img/sc/grappling-kimono-controle.webp", "Grappling : le contrôle — Boxing Center", "Deux pratiquants en kimono se disputent un contrôle au sol."],
  grapplingSol: ["/assets/img/sc/grappling-kimono-sol.webp", "Grappling au sol — Boxing Center", "Un pratiquant en kimono bleu maintient son partenaire au sol."],
  kettlebells: ["/assets/img/sc/kettlebells.webp", `Les kettlebells — ${CLUB}`, "Une rangée de kettlebells devant la cage du Boxing Center Saint-Cyprien."],
  swing: ["/assets/img/sc/kettlebell-swing.webp", "Swing au kettlebell — Boxing Center", "Une pratiquante lève un kettlebell à bout de bras devant une fresque noire et blanche."],
  gainage: ["/assets/img/sc/gainage-binome.webp", "Gainage en binôme — Boxing Center", "Deux pratiquantes enchaînent un exercice de gainage sur les dalles noires."],
  ladyCage: ["/assets/img/sc/lady-cage.webp", `Lady Punch, 100 % féminin — ${CLUB}`, "Un cours Lady Punch dans la cage de Saint-Cyprien, travail en binôme."],
  ladyGarde: ["/assets/img/sc/lady-garde.webp", `En garde au cours Lady Punch — ${CLUB}`, "Une pratiquante en garde, mains bandées, pendant un cours Lady Punch à Saint-Cyprien."],
  ladySac: ["/assets/img/sc/lady-sac.webp", `Lady Punch au sac — ${CLUB}`, "Une pratiquante frappe le sac Metal sur le tapis de Saint-Cyprien."],
  adosPattes: ["/assets/img/sc/ados-pattes.webp", "L'école de boxe : les ados — Boxing Center", "Un adolescent, mains bandées, en garde face à son coach au bord du ring."],
  sacsTapis: ["/assets/img/sc/salle-sacs-tapis.webp", `Les sacs et le ring — ${CLUB}`, "La rangée de sacs et le ring Boxing Center au fond du plateau de Saint-Cyprien."],
  dadi:      ["/assets/img/sc/coach-dadi.webp", `Coach Dadi — ${CLUB}`, "Dadi encadre les cours du Boxing Center Saint-Cyprien, rive gauche de Toulouse."],
  tawee:     ["/assets/img/sc/coach-tawee.webp", `Coach Tawee — ${CLUB}`, "Portrait de Tawee, coach de boxe thaï et K1 au Boxing Center Saint-Cyprien."],
  brice:     ["/assets/img/sc/coach-brice.webp", `Coach Brice — ${CLUB}`, "Portrait de Brice, coach Hyrox, cross-training et Boxing Camp à Saint-Cyprien."],
  coachHeader:["/assets/img/sc/coachs-header.webp", `Encadrement sur le plateau — ${CLUB}`, "Un coach tient le sac pendant qu’une pratiquante travaille ses coups."],
  planning:  ["/assets/img/sc/planning-2026-1600.webp", `Planning officiel des cours — ${CLUB}`, "Le planning 2026 des cours du Boxing Center Saint-Cyprien, 11 rue Sainte-Lucie."],
};

const PAGES = [
  {
    loc: "/", src: ["src/pages/index.astro", "public/assets/js/home.js", "public/assets/css/home.css"],
    changefreq: "weekly", priority: "1.0",
    imgs: [I.hero],
  },
  {
    loc: "/la-salle/", src: ["src/pages/la-salle/index.astro", "public/assets/js/la-salle.js"],
    changefreq: "monthly", priority: "0.8",
    imgs: [I.plateau, I.salleRingLarge, I.ringSeul, I.salleTapis, I.muscuMachines, I.salleTapis2, I.charpente, I.coursPlateau, I.sacs, I.ring, I.salleCross],
  },
  {
    loc: "/activites/", src: ["src/pages/activites/index.astro", "public/assets/js/activites.js"],
    changefreq: "monthly", priority: "0.8",
    imgs: [I.crossGroup, I.anglaise2, I.thai, I.k1, I.k1Duo, I.pattesOurs, I.lady, I.educative, I.niveaux, I.coursLarge, I.crossCircuit, I.circuit],
  },
  {
    loc: "/coachs/", src: ["src/pages/coachs/index.astro", "public/assets/js/coachs.js"],
    changefreq: "monthly", priority: "0.8",
    imgs: [I.coachHeader, I.dadi, I.tawee, I.brice],
  },
  {
    loc: "/galerie/", src: ["src/pages/galerie/index.astro", "public/assets/js/galerie.js"],
    changefreq: "monthly", priority: "0.8",
    imgs: [I.salleContrejour, I.coursGarde, I.boxeSacs, I.thaiGenou, I.cageKick, I.ppBinome, I.grapplingControle, I.grapplingSol, I.kettlebells, I.swing, I.gainage, I.ladyCage, I.ladyGarde, I.ladySac, I.adosPattes],
  },
  {
    loc: "/plannings/", src: ["src/pages/plannings/index.astro", "public/assets/js/plannings.js"],
    changefreq: "weekly", priority: "0.8",
    imgs: [I.planning],
  },
  {
    loc: "/tarifs/", src: ["src/pages/tarifs/index.astro", "public/assets/js/tarifs.js"],
    changefreq: "monthly", priority: "0.8",
    imgs: [I.sacsTapis],
  },
  {
    loc: "/contact/", src: ["src/pages/contact/index.astro", "public/assets/js/contact.js"],
    changefreq: "monthly", priority: "0.8",
    imgs: [I.salle],
  },
];

/** Date ISO (AAAA-MM-JJ) du dernier commit touchant l'un de ces fichiers. */
function lastmod(files) {
  let best = 0;
  for (const f of files) {
    const abs = path.join(ROOT, f);
    if (!fs.existsSync(abs)) continue;
    let stamp = 0;
    try {
      const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", f], {
        cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (out) stamp = Number(out) * 1000;
    } catch { /* pas de git : on prendra le mtime */ }
    if (!stamp) stamp = fs.statSync(abs).mtimeMs;
    if (stamp > best) best = stamp;
  }
  return new Date(best || Date.now()).toISOString().slice(0, 10);
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const body = PAGES.map((p) => `  <url>
    <loc>${SITE}${p.loc}</loc>
    <lastmod>${lastmod([...p.src, ...COMMON])}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
${p.imgs.map(([src, titre, legende]) => `    <image:image>
      <image:loc>${SITE}${src}</image:loc>
      <image:title>${esc(titre)}</image:title>
      <image:caption>${esc(legende)}</image:caption>
    </image:image>`).join("\n")}
  </url>`).join("\n");

fs.writeFileSync(OUT, `<?xml version="1.0" encoding="UTF-8"?>
<!-- Généré par scripts/build-sitemap.mjs — ne pas éditer à la main.
     <lastmod> vient du dernier commit qui a touché les sources de chaque page. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>
`);

const photos = PAGES.reduce((n, p) => n + p.imgs.length, 0);
const imageUrls = PAGES.flatMap((p) => p.imgs.map(([src]) => src));
const duplicates = imageUrls.filter((src, index) => imageUrls.indexOf(src) !== index);
if (duplicates.length) {
  console.error(`sitemap.xml : images répétées entre pages : ${[...new Set(duplicates)].join(", ")}`);
  process.exit(1);
}
console.log(`sitemap.xml : ${PAGES.length} URL datées depuis git · ${photos} images visibles et non répétées`);
