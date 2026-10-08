/* =====================================================================
   SAINT-CYPRIEN · data-tarifs.js — les données que SEULE la page tarifs lit.

   Pourquoi à part : data.js est chargé par les 8 pages. Y laisser ce bloc
   revenait à faire descendre PRICING_FAQ à
   quelqu’un qui lit les tarifs. Rien ici n’est surchargeable par le
   vestiaire — la fusion de public/content.json reste entièrement dans
   data.js, à un seul endroit.
   ===================================================================== */

/* FAQ argent — servie sur /tarifs/. Désamorce les malentendus prix. */
export const PRICING_FAQ = [
  { q: "Quelles sont les conditions de l’offre Rentrée à 29€ ?", a: "Le prix est de 29€ par personne et par échéance de 4 semaines, sans engagement. La première échéance est payée par carte, puis un IBAN est demandé pour les prélèvements. Les coordonnées d’un proche sont requises pour débloquer la promotion, même si cette personne ne s’inscrit pas. Le badge est facturé 34,99€ 72 heures après le début." },
  { q: "Comment payer la saison à 259€ ?", a: "Comptant, ou en 4× sans frais — 4 × 64,75€. La boutique propose plusieurs options de paiement en 4× ; tu choisis la tienne au moment de payer." },
  { q: "Le badge est-il compris dans les abonnements classiques ?", a: "Les CGV de la boutique annoncent un badge d’accès de 34,99€ en plus des abonnements sans engagement avec prélèvement toutes les 4 semaines, sauf condition contraire indiquée au moment de la souscription." },
  { q: "Le t-shirt, c’est pour qui ?", a: "Pour chaque enfant inscrit à l’école : le t-shirt Boxing Center est inclus dans l’inscription (295€ l’année, baby 250€)." },
  { q: "Je peux m’entraîner dans les autres salles ?", a: "Oui. La saison donne accès libre aux 5 clubs du réseau : Portet, Minimes, États-Unis, Saint-Cyprien et Ramonville." },
];

/* ------------------------------------------------------------------ *
 *  LA GALERIE, ZONE PAR ZONE — remontée ici depuis galerie.js (le module
 *  la portait en local avec un TODO). Une zone = un intertitre, une SPEC
 *  mono, une ligne d’édito (ce qu’on y fait vraiment) et ses clichés.
 *  `alt` décrit la photo ; `cap` est la pastille mono — les deux ne se
 *  confondent jamais. Aucune photo de banque : le seul fichier de stock qui
 *  traînait encore (salle-2.webp — deux modèles en studio, gants rouges,
 *  zéro signalétique BC) a été SUPPRIMÉ du dépôt, pas seulement décâblé :
 *  un visuel qui ne montre pas cette salle n’a rien à faire dans le build.
 * ------------------------------------------------------------------ */
