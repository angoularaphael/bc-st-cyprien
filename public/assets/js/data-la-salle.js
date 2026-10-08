/* =====================================================================
   SAINT-CYPRIEN · data-la-salle.js — les données que SEULE la page la salle lit.

   Pourquoi à part : data.js est chargé par les 8 pages. Y laisser ce bloc
   revenait à faire descendre VISITE + VALUES à
   quelqu’un qui lit les tarifs. Rien ici n’est surchargeable par le
   vestiaire — la fusion de public/content.json reste entièrement dans
   data.js, à un seul endroit.
   ===================================================================== */

/* ------------------------------------------------------------------ *
 *  LA VISITE — la signature de /la-salle/. La visite du showroom, au noir :
 *  six postes, chacun allumé quand tu l’atteins. La lumière isole le geste,
 *  pas le neuf. Photos = vrais clichés BC ; specs factuelles (rien d’inventé).
 * ------------------------------------------------------------------ */
export const VISITE = [
  {
    n: "01",
    t: "Le plateau",
    tag: "Centre-ville · rive gauche",
    d: "Un seul niveau, en plein centre-ville, rive gauche. Tu entres et tu vois déjà où tu vas travailler : le ring au fond, les sacs à droite, rien de planqué.",
    img: "/assets/img/sc/salle-ring-large.webp",
    alt: "Le plateau d’un seul tenant : tapis bleu et rouge au premier plan, ring Boxing Center au fond sous la charpente",
    specs: ["Centre-ville", "Accès libre 6 j/7"],
  },
  {
    n: "02",
    t: "L’anglaise",
    tag: "Le noble art",
    d: "Ring, cordes tendues, coin bleu, coin rouge. C’est le poste de Dadi : le jab, la garde, le déplacement, cinq fois par semaine.",
    img: "/assets/img/sc/ring-seul.webp",
    alt: "Le ring de boxe anglaise, tablier Boxing Center, devant les fresques de boxeurs peintes au mur",
    specs: ["Coach · Dadi", "5 créneaux / sem."],
  },
  {
    n: "03",
    t: "Le pieds-poings",
    tag: "Thaï · K1",
    d: "Le tapis pieds-poings, sous son propre faisceau. Les coachs y passent cinq fois par semaine ; le sixième créneau, samedi 18h, attend son encadrant.",
    img: "/assets/img/sc/salle-tapis.webp",
    alt: "Le tapis pieds-poings rouge, la rangée de sacs Metal et le ring au fond",
    specs: ["Boxe thaï · K1", "Tous niveaux"],
  },
  {
    n: "04",
    t: "La zone cross & muscu",
    tag: "Le moteur",
    d: "Machines, charges, sacs : la salle des moteurs. Hyrox, cross-training et HIIT — la caisse derrière chaque discipline.",
    img: "/assets/img/sc/muscu-machines.webp",
    alt: "La zone musculation : machines guidées, rameurs et racks sous la bannière Boxing",
    specs: ["Coach · Brice", "Hyrox · Cross · HIIT"],
  },
  {
    n: "05",
    t: "L’école",
    tag: "Dès 3 ans",
    d: "Baby Boxe le samedi, éducative 7/11, ados 12/16, compétiteurs : l’école complète tient son propre créneau, encadrée par Dadi du plus petit au ring.",
    img: "/assets/img/sc/salle-tapis-2.webp",
    alt: "Le grand tapis bleu et rouge où se tient l’école, du Baby Boxe aux compétiteurs",
    specs: ["Baby 3/6 · 7/11 · 12/16", "Coach · Dadi"],
  },
  {
    n: "06",
    t: "Le collectif",
    tag: "Tous niveaux",
    d: "Lady Punch le mardi et le jeudi, boxing camp quatre fois par semaine : les créneaux où l’on transpire ensemble, tous niveaux confondus.",
    img: "/assets/img/sc/charpente-contrejour.webp",
    alt: "Un cours collectif sous la charpente : des pratiquantes en garde sur le tapis rose et bleu",
    specs: ["Lady Punch · 100 % féminin", "Camp · 4 créneaux"],
  },
];

/* Le code de la salle — quatre valeurs DURABLES (le geste / l’école /
   le quartier / le choix). Aucune n’expire. */

export const VALUES = [
  { n: "01", t: "Le geste", d: "Chaque cours éclaire une chose : ta garde, ton souffle, tes appuis. Le reste attend son tour." },
  { n: "02", t: "L’école", d: "Du Baby Boxe 3/6 aux compétiteurs : une lignée complète, tenue par le même coach d’un âge à l’autre." },
  { n: "03", t: "Le quartier", d: "Tu vois le ring depuis la porte. Premier Boxing Center rive gauche, à 200 m du tram T1 Fer à Cheval." },
  { n: "04", t: "Le choix", d: "Sept disciplines et vingt-neuf cours par semaine sur un seul plancher : tu règles ta semaine comme TU la veux." },
];

/* L’encadrement — noms = le planning officiel rentrée 2026. Photo seulement
   quand la source prouve le nom↔visage (Dadi) ; les autres = tuile stylée
   (roster.json fait foi — jamais de stock, jamais de nom croisé). */
