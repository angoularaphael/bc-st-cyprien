/* =====================================================================
   LA BASE LOCALE DE L’ASSISTANT — Saint-Cyprien.
   Sert deux choses : les puces de démarrage (réponse instantanée, zéro
   requête) et le REPLI quand /api/chat ne répond pas (pas de clé IA
   configurée, réseau coupé, dev local). Le bot reste donc utile en toutes
   circonstances : jamais une bulle vide, jamais une page morte.
   Tous les faits ci-dessous sont ceux de data.js — rien d’inventé.
   ===================================================================== */

export const QUICKS = [
  {
    /* AJOUTÉE LE 30/08. En production, « il y a t il des clims a la salle ? »
       tombait sur la phrase générique : le bot listait ce qu'il savait faire
       au lieu de répondre. Un trou dans la base ne produit pas un « je ne
       sais pas » utile, il produit une esquive — et le visiteur repart.
       PAS DE `label` : ce n'est pas une question qu'on suggère, c'est un
       fait que le bot doit connaître. */
    q: "Il y a la clim ?",
    a: "Non — aucune de nos salles n’est climatisée, ni chauffée. Elles sont en revanche correctement isolées. On te dit les choses comme elles sont : tu viens en tenue légère l’été, tu t’échauffes moins longtemps l’hiver. [boutons: premiere, offre]",
  },
  {
    label: "La séance d’essai",
    q: "Comment se passe la séance d’essai ?",
    a: "La séance d’essai coûte 10€, toutes disciplines, gants et matériel prêtés, sans engagement. Tu arrives 10 minutes avant en tenue de sport, tu dis que c’est ta première fois — c’est tout. [boutons: essai, contact]",
  },
  {
    label: "Les tarifs",
    q: "Quels sont les tarifs ?",
    a: "L’offre Rentrée : 29€ par personne toutes les 4 semaines, avec première échéance carte, IBAN pour la suite, coordonnées d’un proche requises et badge à 34,99€ facturé après 72 h. La Saison : 259€ les 12 mois au lieu de 400€, comptant ou en 4× sans frais, accès aux 5 clubs. Hors promo : 44,99€ adulte / 36,99€ étudiant toutes les 4 semaines, avec badge 34,99€ en sus sauf condition contraire à la souscription. École : 295€ l’année, baby 250€. [boutons: offre, saison, tarifs]",
  },
  {
    label: "Les horaires",
    q: "Quels sont les horaires ?",
    a: "Du lundi au samedi, 10h00 – 21h30. Fermé le dimanche. Le dernier cours se termine à 21h15 selon les jours.",
  },
  {
    label: "Où c’est ?",
    q: "Où se trouve la salle ?",
    a: "11 rue Sainte-Lucie, 31300 Toulouse — quartier Saint-Cyprien, rive gauche. Tram T1, arrêt Fer à Cheval à 200 m (3 min à pied). Métro A, station Saint-Cyprien – République à 600 m (8 min à pied). Parking Saint-Cyprien à proximité.",
  },
  {
    label: "Les disciplines",
    q: "Quelles disciplines proposez-vous ?",
    a: "Boxe anglaise, thaï / K1, grappling, Hyrox et cross-training, Lady Punch (100 % féminin), Boxing Camp, et toute l’école enfants dès 3 ans. Tout est sur le même plancher.",
  },
  {
    label: "Pour les enfants",
    q: "Y a-t-il des cours pour les enfants ?",
    a: "Oui, dès 3 ans. Baby Boxe le samedi à 14h15, éducative 7/11 à 15h et ados 12/16 à 16h le mercredi et le samedi, puis un créneau compétiteurs. Dadi tient toute l’école, du premier déplacement au premier combat.",
  },
  {
    label: "Les coachs",
    q: "Qui sont les coachs ?",
    a: "Dadi enseigne l’anglaise, la Lady Punch et toute l’école. Tawee la boxe thaï et le K1, Brice le cross, l’Hyrox et le Boxing Camp. Qui encadre quel créneau ne s’annonce pas en ligne : demande-le à la salle, on te répond tout de suite.",
  },
  {
    label: "Débuter",
    q: "Je n’ai jamais boxé, je peux venir ?",
    a: "Oui, et c’est même le cas le plus courant. Commence par le Boxing Camp — technique, cardio, sacs, à ton rythme. Aucun acquis demandé, personne ne regarde le nouveau, et aucun sparring n’est imposé le premier soir. [boutons: essai]",
  },
];

const RULES = [
  /* EN TÊTE, et c'est voulu : « clim » et « il fait chaud » tombaient
     sinon sur la règle des horaires (« heure », « midi ») ou sur celle
     de l'accès. La question la plus précise passe en premier. */
  [/clim|climatis|air.?conditionn|ventil|il fait (chaud|froid)|temp[ée]rature|canicule|chauff/i, 0],
  [/essai|d[ée]couvr|tester|essayer|premi[èe]re s[ée]ance|1re/i, 1],
  [/tarif|prix|co[ûu]te|combien|abonn|duo|saison|mensuel|annuel|offre|promo|formule|rentr[ée]e|29|259|payer|paiement/i, 2],
  [/horaire|ouvert|ferm|heure|dimanche|samedi|lundi|semaine|week.?end|midi|soir|matin|tard|t[ôo]t/i, 3],
  /* « \b » compte en ASCII : après le « ù » de « où » il n’y a PAS de frontière
     de mot, et « Où se trouve la salle ? » retombait sur la phrase générique
     alors que l’adresse est juste là. On borne à la main sur les lettres
     accentuées — même famille que le « où » de la liste STOP des prénoms. */
  [/adresse|o[ùu](?![a-zà-öø-ÿ])|se trouve|situ|acc[èe]s|m[ée]tro|parking|venir|plan|rue|quartier|bus|v[ée]lo|garer/i, 4],
  [/discipline|thai|tha[ïi]|k1|kick|mma|grappling|cross|hyrox|lady|camp|anglaise|cours/i, 5],
  [/enfant|gosse|fils|fille|baby|[ée]ducative|ado|3 ans|jeune/i, 6],
  [/coach|entra[îi]neur|prof|encadr|[ée]quipe|dadi|tawee|hicham|victor/i, 7],
  [/d[ée]butant|jamais|niveau|commenc|nul|peur|timide|inscri|adh[ée]r|s.inscrire|dossier|certificat|licence/i, 8],
];

/** La phrase de dernier recours — quand la question ne ressemble à rien de connu. */
export const GENERIC =
  "Je peux te renseigner sur les horaires, les tarifs, les disciplines, l’école enfants ou la séance d’essai à 10€. Pose ta question — ou appelle la salle au 05 62 24 46 82.";

/** Repli hors-ligne. Renvoie `null` si RIEN ne correspond : c’est au widget de
    décider quoi dire, parce qu’il sait, lui, si le visiteur vient de donner son
    prénom ou son numéro. Servir la phrase générique à quelqu’un qui vient de
    taper son téléphone donne l’impression qu’on ne l’a pas écouté. */
export function fallbackAnswer(msg) {
  for (const [re, i] of RULES) if (re.test(msg)) return QUICKS[i].a;
  return null;
}
