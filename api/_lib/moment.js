/* =====================================================================
   api/_lib/moment.js — le bot sait QUAND on lui parle.

   Porté de Ramonville (13/09) sur les trois sites, à la demande d’Eddy du
   09/10/2026 : « the AI doesn’t know date and time and doesn’t know plannings
   and coaches very well. fix that up! ». Le modèle n’a pas d’horloge ; les
   serveurs Vercel tournent en UTC. Ce bloc est recalculé À CHAQUE MESSAGE,
   en heure de Paris, à partir du planning OFFICIEL du site (jamais d’un
   planning écrit à la main dans le prompt).

   Entrée : un planning déjà normalisé —
     { day: "Lun"…"Sam", start: "18h40", end?: "20h15", cours, coach?, enfant?, age? }
   Les coachs ne figurent JAMAIS dans les lignes d’horaires : ils ont leur
   bloc à part, à ne citer que sur demande (règle d’Eddy, 09/10/2026).
   ===================================================================== */
const JOURS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CLES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const NOMS = { Dim: "dimanche", Lun: "lundi", Mar: "mardi", Mer: "mercredi", Jeu: "jeudi", Ven: "vendredi", Sam: "samedi" };
const DUREE = 60; // quand le planning ne donne que le début, un cours dure une heure

const minutes = (h) => { const m = /(\d{1,2})\s*h\s*(\d{2})?/.exec(h || ""); return m ? +m[1] * 60 + +(m[2] || 0) : null; };
const hh = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;

/** « Lundi », « lun », « Lun » → « Lun ». */
export const cleJour = (d) => {
  const s = String(d || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().slice(0, 3);
  return { lun: "Lun", mar: "Mar", mer: "Mer", jeu: "Jeu", ven: "Ven", sam: "Sam", dim: "Dim" }[s] || null;
};

export function parisMaintenant(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map((x) => [x.type, x.value]));
  const i = JOURS_EN.indexOf(p.weekday);
  return {
    cle: CLES[i], index: i, mins: +p.hour * 60 + +p.minute,
    date: new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now),
  };
}

function coursDu(planning, cle) {
  return planning.filter((s) => s.day === cle)
    .map((s) => ({ ...s, debut: minutes(s.start), fin: minutes(s.end) }))
    .filter((s) => s.debut != null)
    .sort((a, b) => a.debut - b.debut);
}

const ligne = (s) => `${hh(s.debut)}${s.fin ? `–${hh(s.fin)}` : ""} ${s.cours}`;

/* Qui encadre quoi — À PART des lignes d’horaires : un prénom collé à chaque
   créneau finit recopié dans des réponses qui ne le demandent pas. */
function quiEncadre(planning) {
  const parCours = new Map();
  for (const s of planning) {
    if (!s.coach) continue;
    const cours = String(s.cours || "").replace(/\s*\(jusqu.?à[^)]*\)/i, "").trim();
    const set = parCours.get(cours) || new Set();
    String(s.coach).split(/\s*(?:,|&|\bet\b|\+)\s*/).filter(Boolean).forEach((c) => set.add(c));
    parCours.set(cours, set);
  }
  if (!parCours.size) return "";
  return "QUI ENCADRE QUOI — À NE CITER QUE SI LE VISITEUR DEMANDE qui encadre un cours, qui donne quoi, ou parle des coachs :\n"
    + [...parCours].map(([c, set]) => `- ${c} : ${[...set].join(", ")}`).join("\n");
}


function tableEnfants(planning, prix) {
  const groupes = new Map();
  for (const s of planning.filter((x) => x.enfant)) {
    const g = groupes.get(s.cours) || { cours: s.cours, age: s.age, creneaux: [] };
    g.creneaux.push(`${NOMS[s.day]} ${s.start}`);
    groupes.set(s.cours, g);
  }
  const ageMin = (g) => +((/(\d+)/.exec(`${g.age || ""} ${g.cours}`) || [0, 99])[1]);
  const lignes = [...groupes.values()].sort((a, b) => ageMin(a) - ageMin(b))
    .map((g) => `- ${g.cours}${g.age ? ` (${g.age})` : ""} : ${g.creneaux.join(" et ")}.`);
  if (!lignes.length) return "";
  return `ÉCOLE ENFANTS — LA TABLE. Quand le visiteur donne l’âge de l’enfant, tu réponds DIRECTEMENT avec la bonne ligne (groupe, jours, heures), sans reposer de question et sans nom de coach, puis le bouton enfants :
${lignes.join("\n")}
${prix ? `- Tarifs : ${prix}` : ""}
- Un âge hors de ces groupes : tu le dis simplement et tu renvoies vers la salle — tu n’inventes aucun groupe.`;
}

/** Le bloc « maintenant », recalculé à chaque message. */
export function contexteDuMoment({ planning = [], ouvre = 10 * 60, ferme = 21 * 60 + 30, prixEnfants = "", now = new Date() } = {}) {
  const P = parisMaintenant(now);
  const L = [`MAINTENANT — heure de Paris, recalculée à chaque message ; c’est la SEULE date que tu connais : ${P.date}, ${hh(P.mins)}.`];
  const ouverte = P.cle !== "Dim" && P.mins >= ouvre && P.mins < ferme;
  L.push(ouverte ? `- La salle est OUVERTE en ce moment (${hh(ouvre)} – ${hh(ferme)}).`
    : `- La salle est FERMÉE en ce moment (ouverte du lundi au samedi, ${hh(ouvre)} – ${hh(ferme)}).`);

  const auj = coursDu(planning, P.cle);
  const enCours = auj.filter((s) => P.mins >= s.debut && P.mins < (s.fin ?? s.debut + DUREE));
  const suivant = auj.find((s) => s.debut > P.mins);
  if (enCours.length) L.push(`- En ce moment : ${enCours.map((s) => `${s.cours} (commencé à ${hh(s.debut)})`).join(", ")}.`);
  if (suivant) L.push(`- Prochain cours aujourd’hui : ${ligne(suivant)}.`);
  else if (auj.length) L.push(`- Plus aucun cours aujourd’hui.`);
  L.push(auj.length ? `- Aujourd’hui (${NOMS[P.cle]}) : ${auj.map(ligne).join(", ")}.` : `- Aujourd’hui (${NOMS[P.cle]}) : aucun cours.`);
  const soir = auj.filter((s) => s.debut >= 17 * 60);
  L.push(soir.length ? `- Ce soir (à partir de 17h) : ${soir.map(ligne).join(", ")}.` : `- Ce soir : aucun cours.`);
  for (let k = 1; k <= 7; k++) {
    const cle = CLES[(P.index + k) % 7];
    const jour = coursDu(planning, cle);
    if (!jour.length) { if (k === 1) L.push(`- Demain (${NOMS[cle]}) : salle fermée, aucun cours.`); continue; }
    L.push(`- ${k === 1 ? "Demain" : "Prochain jour de cours"} (${NOMS[cle]}) : ${jour.map(ligne).join(", ")}.`);
    break;
  }
  L.push("", "LE PLANNING OFFICIEL DE LA SEMAINE (la seule source pour un jour, une heure, un cours) :");
  for (const cle of ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]) {
    const jour = coursDu(planning, cle);
    L.push(`- ${NOMS[cle]} : ${jour.length ? jour.map(ligne).join(", ") : "aucun cours"}.`);
  }
  L.push("Quand on te dit « aujourd’hui », « ce soir », « demain », « maintenant », tu réponds avec CE bloc, jamais avec une date devinée.");
  const enfants = tableEnfants(planning, prixEnfants);
  if (enfants) L.push("", enfants);
  const qui = quiEncadre(planning);
  if (qui) L.push("", qui);
  L.push("", COACHS);
  return L.join("\n");
}

/** Règle d’Eddy (09/10/2026) — commune aux trois sites. */
export const COACHS = "COACHS — tu ne cites un coach QUE si le visiteur demande qui encadre un cours, qui donne quoi, ou parle des coachs. Sinon, aucun prénom de coach dans ta réponse. Quand on te le demande, tu réponds avec ce que publie le planning officiel ci-dessus (ou la discipline de chaque coach) — jamais un nom deviné.";
