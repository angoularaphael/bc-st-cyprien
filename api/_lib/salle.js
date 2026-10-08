/* =====================================================================
   LES FAITS DE LA SALLE — la source unique côté serveur.
   Miroir de public/assets/js/data.js (adresse, accès, horaires, coachs,
   disciplines, planning, offres). Les champs éditables au vestiaire sont
   relus depuis public/content.json (écrit par le backoffice, bundlé au
   déploiement) : le bot reste synchronisé avec le site sans jamais
   dépendre du réseau. Lecture impossible ⇒ repli sur les faits figés.
   RÈGLE : aucun fait inventé, jamais. Ce fichier ne contient que ce que
   le poster officiel et la fiche du club affirment.
   ===================================================================== */
import { readFileSync } from "fs";
import { join } from "path";

export const FACTS = {
  nom: "Boxing Center Saint-Cyprien",
  adresse: "11 rue Sainte-Lucie, 31300 Toulouse",
  quartier: "Saint-Cyprien, Toulouse rive gauche",
  acces: "Tram T1 — arrêt Fer à Cheval à 200 m (3 min à pied). Métro ligne A — Saint-Cyprien – République à 600 m (8 min à pied). Parking Saint-Cyprien à proximité.",
  surface: "Sacs de frappe, espace tatamis et ring ; musculation, cardio et cross-training en accès libre. Aucune surface en m² n’est publiée pour Saint-Cyprien par le site officiel du réseau.",
  telephone: "05 62 24 46 82",
  email: "boxingcenter31@gmail.com",
  horaires: "Du lundi au samedi, 10h00 – 21h30. Fermé le dimanche. Le dernier cours se termine à 21h15 selon les jours.",
  disciplines:
    "Boxe anglaise, boxe thaï / K1, grappling, Hyrox & cross-training, Lady Punch (100 % féminin), Boxing Camp, et l’école enfants dès 3 ans (Baby Boxe 3/6, éducative 7/11, ados 12/16, compétiteurs).",
  coachs:
    "Trois coachs : Dadi (anglaise, Lady Punch et toute l’école), Tawee (thaï / K1), Brice (Hyrox, cross, Boxing Camp). RÈGLE : ne JAMAIS dire qui encadre quel créneau, ni quel jour ni à quelle heure — c’est interne au club. Si on te le demande, réponds que le détail se donne à la salle, au 05 62 24 46 82.",
  offres:
    "Dans l’ordre où on les propose : offre RENTRÉE 29€ PAR PERSONNE et par échéance de 4 semaines, cours illimités, sans engagement (au lieu de 44,99€). Conditions publiées par la boutique : première échéance par carte, IBAN pour les prélèvements suivants, coordonnées d’un proche requises pour débloquer la promotion, badge facturé 34,99€ 72 h après le début. Offre Saison : 259€ les 12 mois au lieu de 400€, comptant ou en 4× sans frais (plusieurs options de paiement en 4× sur la boutique) ; accès libre aux 5 clubs. Hors promotion : 44,99€ adulte et 36,99€ étudiant par échéance de 4 semaines ; les CGV annoncent un badge d’accès à 34,99€ en sus des abonnements sans engagement, sauf condition contraire affichée à la souscription. École 295€ / an t-shirt inclus, Baby Boxe 250€. Séance d’essai à 10€, toutes disciplines, gants et matériel prêtés, sans engagement.",
  planning:
    "29 cours sur 6 jours. Lun 12h40 Boxing Camp / 18h20 Boxing Camp / 19h cross / 20h anglaise ; Mar 12h40 thaï / 18h20 Lady Punch / 19h grappling / 20h thaï ; Mer 12h40 anglaise / 15h éducative 7-11, 16h 12-16, 17h compétiteurs / 18h20 Hyrox / 19h cross / 20h anglaise ; Jeu 12h40 thaï / 18h20 Lady Punch / 19h grappling / 20h thaï ; Ven 12h40 anglaise / 18h20 Boxing Camp / 19h thaï / 20h anglaise ; Sam 11h Boxing Camp / 14h15 Baby Boxe / 15h éducative 7-11, 16h 12-16, 17h compétiteurs / 18h pieds-poings.",
  premiere:
    "Pour une première séance, arriver environ 10 minutes avant en tenue de sport et signaler au coach que c’est un essai. Gants et matériel sont prêtés sur place. L’essai coûte 10 €, toutes disciplines, sans engagement. Pour une question précise, la salle répond au 05 62 24 46 82.",
  reseau:
    "Réseau Boxing Center — 5 clubs actuels : Saint-Cyprien, Minimes, Portet-sur-Garonne, États-Unis et Ramonville. Ne pas inventer d’ordre historique entre les salles. L’abonnement saison annonce un accès aux 5 clubs. Site du groupe : boxingcenter.fr.",
};

/** Relit les champs éditables au vestiaire, s’ils existent. */
export function liveFacts() {
  const f = { ...FACTS };
  try {
    const c = JSON.parse(readFileSync(join(process.cwd(), "public/content.json"), "utf8"));
    const s = c.salle || {};
    if (s.address?.full) f.adresse = s.address.full;
    if (s.phone) f.telephone = s.phone;
    if (s.email) f.email = s.email;
    if (s.hours) f.horaires = s.hours;
    if (Array.isArray(c.tarifs) && c.tarifs.length)
      f.offres = c.tarifs.map((t) => `${t.name} ${t.price} ${t.period || ""}`.trim()).join(" ; ") + ".";
    if (Array.isArray(c.coaches) && c.coaches.length)
      f.coachs = c.coaches.map((m) => `${m.name}${m.role ? ` (${m.role})` : ""}`).join(", ") + ".";
    if (Array.isArray(c.schedule) && c.schedule.length)
      f.planning = c.schedule.map((s2) => `${s2.day} ${s2.time} ${s2.name}`).join(" ; ") + ".";
  } catch {
    /* pas de contenu édité (ou illisible) : les faits figés font foi */
  }
  return f;
}

/** Le bloc d’ancrage injecté dans le prompt système. */
export function factsBlock() {
  const f = liveFacts();
  return [
    `- ${f.nom} : ${f.quartier}. Le premier Boxing Center en centre-ville, ouvert le 10 janvier 2022.`,
    `- Équipement : ${f.surface}`,
    `- Adresse : ${f.adresse}. Téléphone : ${f.telephone}. Email : ${f.email}.`,
    `- Accès : ${f.acces}`,
    `- Horaires : ${f.horaires}`,
    `- Disciplines : ${f.disciplines}`,
    `- Encadrement : ${f.coachs}`,
    `- Offres : ${f.offres}`,
    `- Planning de la semaine : ${f.planning}`,
    `- Première séance : ${f.premiere}`,
    `- ${f.reseau}`,
  ].join("\n");
}
