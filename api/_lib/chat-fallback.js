/* =====================================================================
   RÉPONSE LOCALE DU CHAT — aucun fournisseur, aucune clé, aucun réseau.

   Ce n'est pas un faux modèle : c'est un routeur déterministe qui répond
   uniquement avec les faits validés de api/_lib/salle.js. Il garantit que
   POST /api/chat reste utile même si une clé expire, qu'un quota tombe à
   zéro ou qu'un fournisseur est momentanément indisponible.
   ===================================================================== */
import { liveFacts } from "./salle.js";

const normalise = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function localChatReply(message) {
  const q = normalise(message);
  const f = liveFacts();

  if (/horaire|ouvert|ferme|heure|dimanche|samedi|soir|midi/.test(q)) {
    return `${f.horaires} [boutons: planning, contact]`;
  }
  if (/adresse|ou se trouve|acces|tram|metro|parking|venir|itineraire|rue/.test(q)) {
    return `${f.adresse}. ${f.acces} [boutons: contact, salle]`;
  }
  if (/tarif|prix|combien|abonn|offre|promo|29|259|paiement|payer/.test(q)) {
    return `${f.offres} [boutons: offre, saison, tarifs]`;
  }
  if (/essai|tester|essayer|premiere seance|debuter|debutant|commencer/.test(q)) {
    return `${f.premiere} [boutons: essai, planning, contact]`;
  }
  if (/enfant|baby|educative|ado|jeune/.test(q)) {
    return "L’école accueille les enfants dès 3 ans : Baby Boxe 3/6 ans, éducative 7/11 ans, ados 12/16 ans et compétiteurs. Dis-moi l’âge de ton enfant, je te donne son créneau. [boutons: enfants, planning]";
  }
  if (/coach|entraineur|prof|dadi|tawee|brice|encadr/.test(q)) {
    return `${f.coachs} [boutons: coachs, contact]`;
  }
  if (/discipline|cours|anglaise|thai|k1|kick|grappling|hyrox|cross|lady|camp/.test(q)) {
    return `${f.disciplines} Dis-moi ton objectif, je te dis par quel cours commencer. [boutons: disciplines, planning]`;
  }

  return `Je peux te renseigner sur les cours, les coachs, le planning, les tarifs et l’accès à ${f.nom}. Pour une information non publiée, appelle le ${f.telephone} : je préfère te le dire plutôt que d’inventer. [boutons: disciplines, planning, contact]`;
}

