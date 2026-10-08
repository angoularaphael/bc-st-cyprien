/* =====================================================================
   SAINT-CYPRIEN · data-activites.js — les données que SEULE la page activités lit.

   Pourquoi à part : data.js est chargé par les 8 pages. Y laisser ce bloc
   revenait à faire descendre ECOLE_LEVELS + PARCOURS + PARCOURS_NOTE + SEMAINES à
   quelqu’un qui lit les tarifs. Rien ici n’est surchargeable par le
   vestiaire — la fusion de public/content.json reste entièrement dans
   data.js, à un seul endroit.
   ===================================================================== */

export const ECOLE_LEVELS = [
  { age: "3 → 6 ans",   name: "Baby Boxe",         jours: "Samedi 14h15",          d: "Le samedi : coordination, jeu, premiers déplacements. On apprend à bouger avant d’apprendre à frapper." },
  { age: "7 → 11 ans",  name: "Éducative enfants", jours: "Mercredi & samedi 15h", d: "La technique par le jeu, le cadre par le respect. La vraie boxe, à leur échelle." },
  { age: "12 → 16 ans", name: "Éducative ados",    jours: "Mercredi & samedi 16h", d: "Gestuelle propre, intensité qui monte, premiers assauts encadrés." },
  { age: "Compétition", name: "Compétiteurs",      jours: "Mercredi & samedi",     d: "Le créneau de ceux qui montent sur le ring : préparation, sparring, corner." },
];

/* ------------------------------------------------------------------ *
 *  L’AIGUILLAGE — /activites/ listait sept disciplines et laissait le
 *  visiteur choisir tout seul : un catalogue, pas un conseil. Ici on prend
 *  position. Cinq intentions réelles → une discipline réelle (`key` mappe
 *  DISCIPLINES, donc l’ancre existe forcément). On n’aiguille PAS vers la
 *  thaï ni le grappling : qui les cherche sait déjà pourquoi — le dire vaut
 *  mieux que fabriquer une raison.
 * ------------------------------------------------------------------ */
export const PARCOURS = [
  {
    want: "Je n’ai jamais mis de gants",
    key: "camp",
    why: "Le camp ne demande aucun acquis : on t’apprend à te tenir, à respirer, à frapper un sac sans te faire mal au poignet. Quatre créneaux dans la semaine, personne ne regarde le nouveau.",
  },
  {
    want: "Je veux une technique, pas une séance de fitness",
    key: "anglaise",
    why: "Cinq passages par semaine sur le même ring, le même œil au bord des cordes. Le jab avant la sueur : c’est le poste où l’on te corrige un détail jusqu’à ce qu’il tienne.",
  },
  {
    want: "Je veux d’abord construire le souffle",
    key: "hyrox",
    why: "Hyrox et cross : la zone moteur, charges et circuits. Tu n’y apprends pas à boxer, tu y construis la caisse qui te permet de boxer une troisième reprise.",
  },
  {
    want: "Je préfère commencer sans galerie derrière moi",
    key: "lady",
    why: "Mardi et jeudi à 18h20, le créneau ne s’ouvre qu’aux femmes. Aucun prérequis, aucun public — juste les sacs et le cardio.",
  },
  {
    want: "C’est pour mon enfant",
    key: "kids",
    why: "Dès trois ans au Baby Boxe du samedi, puis 7/11, 12/16, compétiteurs. Le même coach à chaque palier : il n’y a personne à qui réexpliquer ton gamin.",
  },
];

/* La ligne qui assume ce qu’on n’aiguille pas (affichée sous l’aiguillage). */
export const PARCOURS_NOTE =
  "La thaï et le grappling ne sont pas dans cette liste : on n’a jamais vu quelqu’un arriver au grappling par hasard. Si tu les cherches, ils t’attendent plus bas, aux mêmes conditions.";

/* ------------------------------------------------------------------ *
 *  LES SEMAINES-TYPES — la question qui reste après le catalogue : « ça
 *  ressemble à quoi, concrètement, une semaine ici ? » Chaque ligne est un
 *  POINTEUR {day,time} vers SCHEDULE : rien n’est recopié, donc rien ne peut
 *  diverger du poster. Un pointeur qui ne retrouve pas son créneau est
 *  simplement omis à l’affichage — jamais rendu en dur.
 *  Ce sont des exemples, pas des formules vendues : le rendu le dit.
 * ------------------------------------------------------------------ */
export const SEMAINES = [
  {
    n: "2×",
    t: "Deux fois, sans se mentir",
    d: "Le minimum qui produit quelque chose. En dessous, on ne progresse pas, on entretient.",
    slots: [
      { day: "Lun", time: "18h20" },
      { day: "Mer", time: "20h00" },
    ],
  },
  {
    n: "3×",
    t: "Trois fois, debout puis au sol",
    d: "Les poings, les tibias, le tapis. La semaine de qui veut être complet plutôt que spécialiste.",
    slots: [
      { day: "Lun", time: "20h00" },
      { day: "Mar", time: "20h00" },
      { day: "Jeu", time: "19h00" },
    ],
  },
  {
    n: "4×",
    t: "Quatre fois, moteur compris",
    d: "Deux séances qui construisent le souffle, deux qui construisent le geste. C’est là que la caisse commence à se voir.",
    slots: [
      { day: "Lun", time: "19h00" },
      { day: "Mar", time: "20h00" },
      { day: "Mer", time: "18h20" },
      { day: "Ven", time: "18h20" },
    ],
  },
];
