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

/* Les champs `offres` et `coachs` de salle.js sont écrits POUR LE MODÈLE
   (« Dans l’ordre où on les propose… », « RÈGLE : ne jamais… ») : recopiés
   tels quels, ils montraient des consignes internes aux visiteurs (vu en
   production le 09/10/2026). Le repli parle donc avec ses propres phrases. */
const OFFRES = "L’offre Rentrée : 29€ par personne toutes les 4 semaines au lieu de 44,99€, cours illimités, sans engagement. La Saison : 259€ les 12 mois au lieu de 400€, comptant ou en 4× sans frais, avec l’accès aux 5 clubs du réseau. Et la séance d’essai à 10€, toutes disciplines.";
const COACHS = "Trois coachs encadrent Saint-Cyprien : Dadi pour la boxe anglaise, le Lady Punch et l’école enfants, Tawee pour la boxe thaï et le K1, Brice pour l’Hyrox, le cross-training et le Boxing Camp.";
const EN = /\b(the|you|your|do|does|have|is|are|how|what|when|where|much|price|classes?|beginners?|hello|hi|open)\b/;

function englishReply(q, f) {
  if (/price|cost|much|membership|offer|pay/.test(q)) return "The back-to-school offer is €29 per person every 4 weeks (instead of €44.99), unlimited classes, no commitment. The Season is €259 for 12 months (instead of €400), paid at once or in 4 interest-free instalments, with access to all 5 clubs. A trial session costs €10. [boutons: offre:See the €29 offer, saison:See the season]";
  if (/open|hour|time|when|sunday|saturday/.test(q)) return "We are open Monday to Saturday, 10:00 – 21:30, closed on Sunday. [boutons: planning:See the schedule]";
  if (/where|address|tram|metro|parking|get there/.test(q)) return `${f.adresse} — tram T1, Fer à Cheval stop, 200 m away; metro line A, Saint-Cyprien – République, 600 m away. [boutons: contact:Find us]`;
  if (/beginner|first|trial|start|never/.test(q)) return "Yes — most classes are open to all levels. Come 10 minutes early in sportswear and tell the coach it is your first time: gloves and gear are lent on site, and the trial session costs €10. [boutons: essai:Book a trial, planning:See the schedule]";
  return `I can help with classes, schedule, prices and how to get to ${f.nom}. For anything else, call ${f.telephone}. [boutons: disciplines:See the classes, contact:Contact]`;
}

export function localChatReply(message) {
  const q = normalise(message);
  const f = liveFacts();
  if (EN.test(q) && !/\b(le|la|les|des|est|vous|tu|je|pour|combien|quel|cours|bonjour|salut)\b/.test(q)) return englishReply(q, f);

  if (/horaire|ouvert|ferme|heure|dimanche|samedi|soir|midi/.test(q)) {
    return `${f.horaires} [boutons: planning, contact]`;
  }
  if (/adresse|ou se trouve|acces|tram|metro|parking|venir|itineraire|rue/.test(q)) {
    return `${f.adresse}. ${f.acces} [boutons: contact, salle]`;
  }
  if (/tarif|prix|combien|abonn|offre|promo|29|259|paiement|payer/.test(q)) {
    return `${OFFRES} [boutons: offre, saison, tarifs]`;
  }
  if (/essai|tester|essayer|premiere seance|debuter|debutant|commencer/.test(q)) {
    return `${f.premiere} [boutons: essai, planning, contact]`;
  }
  if (/enfant|baby|educative|ado|jeune/.test(q)) {
    return "L’école accueille les enfants dès 3 ans : Baby Boxe 3/6 ans, éducative 7/11 ans, ados 12/16 ans et compétiteurs. Dis-moi l’âge de ton enfant, je te donne son créneau. [boutons: enfants, planning]";
  }
  if (/coach|entraineur|prof|dadi|tawee|brice|encadr/.test(q)) {
    return `${COACHS} [boutons: coachs, contact]`;
  }
  if (/discipline|cours|anglaise|thai|k1|kick|grappling|hyrox|cross|lady|camp/.test(q)) {
    return `${f.disciplines} Dis-moi ton objectif, je te dis par quel cours commencer. [boutons: disciplines, planning]`;
  }

  return `Je peux te renseigner sur les cours, les coachs, le planning, les tarifs et l’accès à ${f.nom}. Pour une information non publiée, appelle le ${f.telephone} : je préfère te le dire plutôt que d’inventer. [boutons: disciplines, planning, contact]`;
}

