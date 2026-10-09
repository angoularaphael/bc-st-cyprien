/* =====================================================================
   api/_lib/repli-planning.js — le filet local connaît l’heure et le planning.

   Quand aucun fournisseur d’IA ne répond (quota, clé morte), le visiteur
   tombait sur des réponses figées : « Mon fils a 8 ans, il peut venir
   quand ? » rendait l’adresse (à cause de « venir »), « What classes are
   on tomorrow? » un message générique (vu en local le 09/10/2026). Ce
   module répond aux questions de TEMPS (ce soir, aujourd’hui, demain, un
   jour nommé) et d’ÂGE avec le planning officiel, en heure de Paris, en
   français ou en anglais. Il rend null pour toute autre question : le
   routeur du site prend alors le relais.

   Aucun nom de coach ici (règle d’Eddy, 09/10/2026). Fichier identique
   sur Saint-Cyprien, Minimes et Ramonville ; même planning normalisé que
   moment.js : { day: "Lun"…"Sam", start: "18h40", cours, enfant?, age? }.
   ===================================================================== */
const JOURS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CLES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const FR = { Dim: "dimanche", Lun: "lundi", Mar: "mardi", Mer: "mercredi", Jeu: "jeudi", Ven: "vendredi", Sam: "samedi" };
const EN = { Dim: "Sunday", Lun: "Monday", Mar: "Tuesday", Mer: "Wednesday", Jeu: "Thursday", Ven: "Friday", Sam: "Saturday" };
const JOURS_NOMMES = [
  [/\blundi\b|\bmonday\b/, "Lun"], [/\bmardi\b|\btuesday\b/, "Mar"], [/\bmercredi\b|\bwednesday\b/, "Mer"],
  [/\bjeudi\b|\bthursday\b/, "Jeu"], [/\bvendredi\b|\bfriday\b/, "Ven"], [/\bsamedi\b|\bsaturday\b/, "Sam"],
  [/\bdimanche\b|\bsunday\b/, "Dim"],
];

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ");
const minutes = (h) => { const m = /(\d{1,2})\s*h\s*(\d{2})?/.exec(h || ""); return m ? +m[1] * 60 + +(m[2] || 0) : null; };
const hh = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
const hhEn = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function paris(now) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map((x) => [x.type, x.value]));
  const index = JOURS_EN.indexOf(p.weekday);
  const date = (loc) => new Intl.DateTimeFormat(loc, { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  return { index, cle: CLES[index], mins: +p.hour * 60 + +p.minute, fr: date("fr-FR"), en: date("en-GB") };
}

function coursDu(planning, cle) {
  return planning.filter((s) => s.day === cle)
    .map((s) => ({ ...s, debut: minutes(s.start) }))
    .filter((s) => s.debut != null)
    .sort((a, b) => a.debut - b.debut);
}

/** Une réponse ancrée dans le planning, ou null si la question n’est ni de temps ni d’âge. */
export function reponseDuPlanning(message, { planning = [], prixEnfants = "", now = new Date() } = {}) {
  if (!Array.isArray(planning) || !planning.length) return null;
  const q = norm(message);
  const anglais = /\b(what|when|which|class|classes|tomorrow|today|tonight|son|daughter|kid|kids|child|years old|schedule|is there|are there|open)\b/.test(q)
    && !/\b(le|la|les|des|est|quel|quels|quelle|cours|demain|soir|ans|aujourd hui|il y a)\b/.test(q);
  const P = paris(now);

  // 1) l’âge d’un enfant → son groupe, ses jours, ses heures
  const age = /\b(\d{1,2})\s*(?:ans\b|an\b|years?\b|yo\b|y\.o\.?)/.exec(q);
  const motEnfant = /\b(fils|fille|enfant|enfants|gamin|gamine|petit|petite|gosse|ado|son|daughter|kid|child|boy|girl)\b/.test(q);
  if (age && (motEnfant || +age[1] < 17)) {
    const a = +age[1];
    const groupes = new Map();
    for (const s of planning.filter((x) => x.enfant)) {
      const r = /(\d{1,2})\s*(?:\/|à|a|-|–)\s*(\d{1,2})/.exec(`${s.age || ""} ${s.cours}`);
      if (!r) continue;
      const g = groupes.get(s.cours) || { cours: s.cours, min: +r[1], max: +r[2], creneaux: [] };
      g.creneaux.push(s);
      groupes.set(s.cours, g);
    }
    const g = [...groupes.values()].find((x) => a >= x.min && a <= x.max);
    if (!g) {
      return anglais
        ? `At ${a}, no kids group on the schedule matches exactly: the club will tell you where your child fits. [boutons: contact:Contact the club, enfants:Kids classes]`
        : `À ${a} ans, aucun groupe enfants du planning ne correspond exactement : la salle te dira où le placer. [boutons: contact, enfants]`;
    }
    // « Éducative 7/11 » porte déjà ses âges : on ne les répète pas
    const dejaDit = new RegExp(`${g.min}\\s*/\\s*${g.max}`).test(g.cours);
    const quand = g.creneaux.map((s) => anglais ? `${EN[s.day]} at ${hhEn(minutes(s.start))}` : `le ${FR[s.day]} à ${hh(minutes(s.start))}`);
    return anglais
      ? `At ${a}, it’s ${g.cours}${dejaDit ? "" : ` (${g.min}–${g.max} years old)`}: ${quand.join(" and ")}. [boutons: enfants:Kids classes, planning:See the schedule]`
      : `À ${a} ans, c’est ${g.cours}${dejaDit ? "" : ` (${g.min}/${g.max} ans)`} : ${quand.join(" et ")}.${prixEnfants ? ` Tarifs de l’école : ${prixEnfants}.` : ""} [boutons: enfants, planning]`;
  }

  // 2) un moment : ce soir, aujourd’hui, demain, après-demain, un jour nommé
  let cle = null, soir = false;
  if (/\bce soir\b|\btonight\b|\bthis evening\b/.test(q)) { cle = P.cle; soir = true; }
  else if (/\baujourd hui\b|\btoday\b|\ben ce moment\b|\bright now\b|\bquel jour\b|\bwhat day\b/.test(q)) cle = P.cle;
  else if (/\bapres.?demain\b/.test(q)) cle = CLES[(P.index + 2) % 7];
  else if (/\bdemain\b|\btomorrow\b/.test(q)) cle = CLES[(P.index + 1) % 7];
  else for (const [re, c] of JOURS_NOMMES) if (re.test(q)) { cle = c; break; }
  if (!cle) return null;

  const demain = CLES[(P.index + 1) % 7];
  const jour = anglais ? EN[cle] : FR[cle];
  const etiquette = soir ? (anglais ? "Tonight" : "Ce soir")
    : cle === P.cle ? (anglais ? "Today" : "Aujourd’hui")
    : cle === demain ? (anglais ? `Tomorrow (${jour})` : `Demain (${jour})`)
    : (anglais ? `On ${jour}` : `Le ${jour}`);
  const date = cle === P.cle || cle === demain ? (anglais ? `Today is ${P.en}. ` : `On est le ${P.fr}. `) : "";
  if (cle === "Dim") {
    return anglais
      ? `${date}${etiquette}: the club is closed on Sundays — open Monday to Saturday. [boutons: planning:See the schedule]`
      : `${date}${etiquette} : la salle est fermée le dimanche — ouverte du lundi au samedi. [boutons: planning]`;
  }
  let liste = coursDu(planning, cle);
  if (soir) liste = liste.filter((s) => s.debut >= 17 * 60);
  if (!liste.length) {
    return anglais
      ? `${date}${etiquette}: no class on the schedule. [boutons: planning:See the schedule]`
      : `${date}${etiquette} : aucun cours au planning. [boutons: planning]`;
  }
  const lignes = liste.map((s) => anglais ? `${hhEn(s.debut)} ${s.cours}` : `${hh(s.debut)} ${s.cours}`);
  return anglais
    ? `${date}${etiquette}: ${lignes.join(", ")}. [boutons: planning:See the schedule, essai:Book a trial]`
    : `${date}${etiquette} : ${lignes.join(", ")}. [boutons: planning, essai]`;
}
