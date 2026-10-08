/* =====================================================================
   SAINT-CYPRIEN · data-galerie.js — les données que SEULE la page galerie lit.

   Pourquoi à part : data.js est chargé par les 8 pages. Y laisser ce bloc
   revenait à faire descendre GALLERY à
   quelqu’un qui lit les tarifs. Rien ici n’est surchargeable par le
   vestiaire — la fusion de public/content.json reste entièrement dans
   data.js, à un seul endroit.
   ===================================================================== */

/* ------------------------------------------------------------------ *
 *  LA GALERIE, ZONE PAR ZONE. Une zone = un intertitre, une SPEC mono, une
 *  ligne d’édito (ce qu’on y fait vraiment) et ses clichés. `alt` décrit la
 *  photo ; `cap` est la pastille mono — les deux ne se confondent jamais.
 *
 *  RÈGLE (08/10/2026) : une photo n’apparaît qu’UNE fois sur le site. La
 *  galerie ne remontre donc aucune image déjà posée sur l’accueil, la salle
 *  ou les activités. Les vues du LIEU sont toutes de Saint-Cyprien ; les
 *  scènes d’entraînement cadrées serré sur les personnes viennent aussi des
 *  autres clubs du réseau (consigne d’Eddy) — leur `alt` décrit ce qu’on
 *  voit et ne prétend jamais situer la scène rue Sainte-Lucie.
 * ------------------------------------------------------------------ */
export const GALLERY = [
  {
    id: "plateau", zone: "Le plateau", spec: "Sacs, tatamis et ring",
    lede: "Un seul niveau : depuis la porte tu vois déjà les sacs et le ring. Rien n’est planqué derrière une cloison, aucune mezzanine à monter — c’est tout l’argument.",
    shots: [
      { f: "salle-contrejour.webp", feat: "wide", cap: "Le ring", alt: "Le ring Boxing Center vu entre deux sacs de frappe, un pratiquant à la corde au premier plan" },
    ],
  },
  {
    id: "anglaise", zone: "L’anglaise", spec: "Le noble art · le ring",
    lede: "Cinq créneaux par semaine : deux midis, trois soirs. C’est le poste de Dadi, du premier jab au sparring encadré.",
    shots: [
      { f: "cours-garde.webp", feat: "wide", cap: "En garde", alt: "Un cours de boxe anglaise : des pratiquantes en garde travaillent aux boucliers sur le tapis bleu et rouge" },
      { f: "boxe-anglaise-sacs.webp", cap: "Aux sacs", alt: "Un boxeur en maillot vert, garde haute, déplace ses appuis entre deux sacs de frappe" },
    ],
  },
  {
    id: "pieds-poings", zone: "Le pieds-poings", spec: "Thaï · K1",
    lede: "Les tibias et les genoux entrent dans le jeu, la technique ne baisse pas d’un cran. Cinq créneaux encadrés par semaine — le sixième, samedi 18h, attend son encadrant.",
    shots: [
      { f: "thai-genou.webp", feat: "wide", cap: "Genoux", alt: "Un cours pieds-poings : au premier plan un jeune en garde, derrière lui un pratiquant lance un coup de pied haut" },
      { f: "cage-coup-de-pied.webp", cap: "Dans la cage", alt: "Dans la cage, un pratiquant arme un coup de pied sur les paos que tient son partenaire" },
      { f: "pieds-poings-binome.webp", cap: "En binôme", alt: "Une pratiquante monte le genou sur les paos que tient son partenaire, protège-tibias aux jambes" },
    ],
  },
  {
    id: "sol", zone: "Le sol", spec: "Grappling · mardi & jeudi",
    lede: "Une heure au sol, deux soirs par semaine : projections, contrôle, soumissions. On apprend à tomber avant d’apprendre à faire tomber.",
    shots: [
      { f: "grappling-kimono-controle.webp", feat: "wide", cap: "Contrôle", alt: "Deux pratiquants en kimono, l’un en blanc l’autre en bleu, se disputent un contrôle au sol" },
      { f: "grappling-kimono-sol.webp", cap: "Au sol", alt: "Un pratiquant en kimono bleu maintient son partenaire au sol sous lui, appuis bien écartés" },
    ],
  },
  {
    id: "moteur", zone: "Le moteur", spec: "Hyrox · cross · muscu",
    lede: "La zone qui porte tout le reste : charges, kettlebells, gainage, circuits. C’est ici que le souffle du troisième round se construit.",
    shots: [
      { f: "kettlebells.webp", feat: "wide", cap: "Kettlebells", alt: "Une rangée de kettlebells noirs et jaunes posés au sol devant la cage" },
      { f: "kettlebell-swing.webp", cap: "Swing", alt: "Une pratiquante en t-shirt jaune lève un kettlebell à bout de bras devant une fresque noire et blanche" },
      { f: "gainage-binome.webp", cap: "Gainage", alt: "Deux pratiquantes enchaînent un exercice de gainage à quatre pattes sur les dalles noires" },
    ],
  },
  {
    id: "lady", zone: "Lady Punch", spec: "100 % féminin · mar. & jeu.",
    lede: "Mardi et jeudi à 18h20, le créneau est à elles. Zéro prérequis, zéro galerie qui regarde : la boxe pour la forme, le cardio et la confiance.",
    shots: [
      { f: "lady-cage.webp", feat: "wide", cap: "100 % féminin", alt: "Un cours Lady Punch dans la cage : deux pratiquantes travaillent en binôme, gants aux mains" },
      { f: "lady-garde.webp", cap: "En garde", alt: "Une pratiquante en sweat vert, mains bandées, garde haute et regard fixé devant elle" },
      { f: "lady-sac.webp", cap: "Au sac", alt: "Une pratiquante frappe le sac Metal, gants noirs, sur le tapis bleu et rouge" },
    ],
  },
  {
    id: "ecole", zone: "L’école", spec: "Dès 3 ans → compétiteurs",
    lede: "Baby Boxe le samedi, éducative 7/11 et ados 12/16 le mercredi et le samedi, compétiteurs dans la foulée. Le même coach du premier déplacement au premier combat.",
    shots: [
      { f: "ados-pattes.webp", cap: "Ados 12/16", alt: "Un adolescent, mains bandées, en garde face à son coach au bord du ring" },
    ],
  },
];

/* Les paliers de l’école — remontés ici depuis activites.js (TODO levé).
   Sous-niveaux de la discipline `kids` ; jours = poster officiel. */
