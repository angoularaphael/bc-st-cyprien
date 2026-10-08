/* =====================================================================
   L’ASSISTANT — Boxing Center Saint-Cyprien.

   Philosophie (≠ formulaire) : le bot se présente, demande ton prénom,
   puis RÉPOND. L’IA (/api/chat, ancrée sur les faits de la salle) rend la
   conversation humaine pendant que le widget capte AU VOL les coordonnées
   que le visiteur donne de lui-même — prénom, email, téléphone. Dès qu’on
   a un prénom ET un moyen de rappel, le contact part vers /api/lead.
   On n’interroge jamais de force : une seule relance douce, puis silence.

   AMÉLIORATION PROGRESSIVE : la pastille du HTML reste un vrai lien tel:.
   Ce module la REMPLACE par un bouton qui ouvre le panneau. Script mort ou
   bloqué ⇒ la pastille d’origine appelle la salle. Rien ne régresse.
   ===================================================================== */
import { QUICKS, fallbackAnswer, GENERIC } from "./chatbot-kb.js?v=23";
import { SALLE } from "./data.js?v=30";

/* ---------------------------- constantes -------------------------- */
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
/* numéro FR : +33 ou 0, puis 9 chiffres groupés librement */
const PHONE_RE = /(?:\+33|0)\s?[1-9](?:[\s.\-]?\d{2}){4}/;
/* déclencheurs SPÉCIFIQUES d’un prénom — pas de « c’est » nu, qui capterait
   « c’est ouvert » ou « c’est combien » */
const NAME_RE = /(?:je m['’ ]?appelle|moi c['’ ]?est|mon nom est|mon pr[ée]nom (?:est|c['’ ]?est)|je me nomme|ici c['’ ]?est)\s+([a-zà-öø-ÿ][a-zà-öø-ÿ'’-]+)/i;

/* ------------------- CE QUI N’EST PAS UN PRÉNOM -------------------- *
 * Un prénom écrit dans le carnet de la salle est un FAIT sur un être
 * humain. On ne l’invente jamais. Un mot n’est retenu que s’il a la
 * forme d’un prénom ET qu’il n’est dans aucune de ces familles :
 * interrogatifs, pronoms, politesses, jours, mots du site. Au moindre
 * doute on ne capture RIEN — aucun prénom vaut mieux qu’un faux. */
const STOP_NAMES = new RegExp("^(" + [
  /* interrogatifs — la cause du défaut : « Quels sont vos tarifs ? » */
  "quel", "quelle", "quels", "quelles", "comment", "ou", "où", "quand", "pourquoi",
  "combien", "qui", "quoi", "est", "puis", "peut", "peux", "faut", "y",
  /* pronoms et personnes */
  "je", "j", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
  "moi", "toi", "lui", "eux", "me", "te", "se", "mon", "ma", "mes", "ton", "ta",
  "votre", "vos", "notre", "nos", "son", "sa", "ses", "ce", "cet", "cette", "ces",
  /* politesses et acquiescements */
  "bonjour", "bonsoir", "salut", "coucou", "hello", "hey", "yo", "merci", "svp",
  "oui", "ouais", "non", "nan", "ok", "okay", "d’accord", "d’accord", "bien",
  "super", "cool", "bof", "rien", "voir", "sais", "aucune", "aucun",
  /* articles, liaisons, négations */
  "le", "la", "les", "un", "une", "des", "du", "de", "au", "aux",
  "et", "pas", "plus", "avec", "sans", "pour", "par", "sur", "dans", "chez", "vers",
  /* mots du site — ce qu’on tape quand on pose une question, pas quand on se présente */
  "tarif", "tarifs", "prix", "horaire", "horaires", "planning", "plannings",
  "cours", "boxe", "boxing", "salle", "essai", "adresse", "acces", "accès",
  "inscription", "abonnement", "abonnements", "coach", "coachs", "enfant",
  "enfants", "ado", "ados", "femme", "femmes", "debutant", "débutant", "sauna",
  "parking", "metro", "métro", "ouvert", "ouverte", "ferme", "fermé", "fermée",
  "dispo", "disponible", "info", "infos", "renseignement", "renseignements",
  /* jours et repères de temps */
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
  "matin", "midi", "soir", "aujourd’hui", "aujourd’hui", "demain", "week",
].join("|") + ")$", "i");
/* La FORME d’un prénom : un seul mot, lettres (accents et traits d’union
   admis), 2 à 20 signes. Ni chiffre, ni ponctuation, ni espace. */
const NAME_SHAPE = /^[a-zà-öø-ÿ][a-zà-öø-ÿ'’-]{1,19}$/i;
const looksLikeFirstName = (w) =>
  Boolean(w) && NAME_SHAPE.test(w) && !STOP_NAMES.test(w);

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const delay = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
const titleCase = (s) => s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

function sessionId() {
  const key = "bcsc-chat-session";
  try {
    let id = sessionStorage.getItem(key);
    if (!id) { id = (crypto.randomUUID?.() || String(Date.now())); sessionStorage.setItem(key, id); }
    return id;
  } catch { return String(Date.now()); }
}

/* ------------------------------- API ------------------------------ */
async function askAi(message, history, context) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, context }),
  });
  if (!res.ok) throw new Error("IA indisponible");
  const data = await res.json();
  if (!data.reply) throw new Error("IA vide");
  return data.reply;
}

async function submitLead(payload) {
  const res = await fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: "st-cyprien", ...payload }),
  });
  if (!res.ok) throw new Error("Envoi refusé");
  return res.json().catch(() => ({}));
}

/* ------------------------------ WIDGET ---------------------------- */

/* ------------------------ LA MESURE DE LA VENTE -------------------- *
 * Jusqu’ici, on ne pouvait PAS prouver que l’assistant vendait : ses
 * boutons partaient vers la boutique par la même porte que tous les autres
 * liens du site. On marque donc CHAQUE sortie box-plus de l’assistant.
 *
 * Deux pièges, évités ici :
 *   1) l’ancre reste EN DERNIER (…?utm…#promo). Écrite avant, la boutique
 *      recevrait « #promo?utm… » comme fragment et n’ouvrirait pas l’onglet ;
 *   2) le marquage est posé À L’AFFICHAGE, pas dans le catalogue. parseReply
 *      compare les URL écrites par le modèle aux href du catalogue pour les
 *      transformer en boutons : des href marqués ne matcheraient plus, et le
 *      bot recracherait des URL nues dans ses bulles.
 */
const UTM_CAMPAGNE = "st-cyprien";
function tracke(href) {
  if (!/^https?:\/\/box-plus\.vercel\.app/i.test(href || "")) return href;
  const [avant, ...reste] = href.split("#");
  const ancre = reste.join("#");
  const sep = avant.includes("?") ? "&" : "?";
  const marque = `${avant}${sep}utm_source=chatbot&utm_medium=bouton&utm_campaign=${UTM_CAMPAGNE}`;
  return ancre ? `${marque}#${ancre}` : marque;
}

/* La pensée Portet émulée : clés fermées → vrais boutons sous les messages.
   Les href restent NUS ici — c’est la clé de comparaison de parseReply. */
const ACTIONS = {
  offre:       { label: "Je prends ma place — 29€", href: "https://boutique.boxingcenter.fr/offre/29" },
  saison:      { label: "Je réserve ma saison · 259€", href: "https://boutique.boxingcenter.fr/offre/259" },
  essai:       { label: "Je viens essayer · 10€", href: "https://boutique.boxingcenter.fr/seance-essai" },
  enfants:     { label: "J’inscris mon enfant", href: "https://boutique.boxingcenter.fr/abonnements" },
  abonnements: { label: "Voir les abonnements", href: "https://boutique.boxingcenter.fr/abonnements" },
  boutique:    { label: "La boutique du club", href: "https://boutique.boxingcenter.fr/" },
  tarifs:      { label: "Les tarifs en détail", href: "/tarifs/" },
  /* la clé « premiere » a été retirée avec la page /premiere-seance/ :
     l’assistant enverrait vers une page morte. Le prompt système ne doit
     donc plus la citer — voir api/chat.js. */
  planning:    { label: "Voir le planning", href: "/plannings/" },
  disciplines: { label: "Découvrir les cours", href: "/activites/" },
  salle:       { label: "Visiter la salle", href: "/la-salle/" },
  coachs:      { label: "Rencontrer les coachs", href: "/coachs/" },
  galerie:     { label: "Voir la galerie", href: "/galerie/" },
  contact:     { label: "Adresse & contact", href: "/contact/" },
  appeler:     { label: "Appeler la salle", href: "tel:+33562244682" },
  offert:      { label: "Je réserve ma séance offerte", href: "/seance-offerte/" },
  rappel:      { label: "Être rappelé par un coach", act: "rappel" },
};
function resolveActions(keys) {
  const out = [];
  for (const k of keys) {
    const [key, ...rest] = String(k).split(":");
    const def = ACTIONS[key.trim()];
    if (!def) continue;
    const label = rest.join(":").trim();
    if (!out.some((a) => (a.href || a.act) === (def.href || def.act))) out.push(label ? { ...def, label } : def);
    if (out.length >= 3) break;
  }
  return out;
}
function parseReply(rawText) {
  let text = String(rawText);
  const keys = [];
  text = text.replace(/\[\s*(?:boutons|buttons)\s*:\s*([^\]]+)\]/gi, (_, list) => {
    keys.push(...list.split(",").map((s) => s.trim()).filter(Boolean));
    return "";
  });
  text = text.replace(/(?:https?:\/\/)?box-plus\.vercel\.app[\w\/#-]*/gi, (u) => {
    const href = (u.startsWith("http") ? u : "https://" + u).replace(/\/$/, "");
    const hit = Object.entries(ACTIONS).find(([, d]) => (d.href || "").replace(/\/$/, "") === href);
    if (hit && !keys.some((k) => k.split(":")[0] === hit[0])) keys.push(hit[0]);
    return hit ? "la boutique en ligne" : u;
  });
  text = text.replace(/\s{2,}/g, " ").replace(/\s+([.,!?])/g, "$1").trim();
  return { text, actions: resolveActions(keys) };
}

export function initChatbot() {
  if (document.getElementById("scchat")) return;
  const pill = document.querySelector("a.chatbot");
  if (!pill) return; // pas de point d’accroche sur cette page

  /* LE PANNEAU EST HORS FLUX DÈS LA PREMIÈRE IMAGE.
     La feuille du widget est chargée par JS pour ne jamais bloquer le rendu de
     la page. Mesuré sur le rendu : entre l’ajout du panneau et l’application de
     cette feuille, .scchat était un bloc STATIQUE en fin de <body> — le focus
     du champ projetait alors le visiteur tout en bas (scrollY 0 → 6326, le
     maximum). On pose donc AVANT tout un noyau de style en ligne, appliqué
     dans la même image : le panneau est fixe avant même d’exister à l’écran.
     La feuille complète est chargée juste après, elle a le dernier mot. */
  if (!document.getElementById("scchat-core")) {
    const core = document.createElement("style");
    core.id = "scchat-core";
    core.textContent = ".scchat{position:fixed;right:0;bottom:0;z-index:8600;pointer-events:none}";
    document.head.appendChild(core);
  }
  if (!document.getElementById("scchat-css")) {
    const link = document.createElement("link");
    link.id = "scchat-css"; link.rel = "stylesheet"; link.href = "/assets/css/chatbot.css?v=1";
    document.head.appendChild(link);
  }
  /* Troisième ceinture : on n’ouvre pas avant que la feuille soit réellement
     appliquée — et on n’attend jamais indéfiniment, le noyau suffit déjà. */
  const cssReady = new Promise((resolve) => {
    const link = document.getElementById("scchat-css");
    if (!link || link.sheet) return resolve();
    link.addEventListener("load", resolve, { once: true });
    link.addEventListener("error", resolve, { once: true });
    setTimeout(resolve, 1200);
  });

  const sid = sessionId();
  const profile = { prenom: "", nom: "", email: "", phone: "", salle: "Saint-Cyprien" };
  /* Le profil survit à la navigation (même session) : le bot ne redemande
     jamais, et les formulaires du site se préremplissent avec. */
  const PROFIL_KEY = "bcs-chat-profil";
  try { Object.assign(profile, JSON.parse(sessionStorage.getItem(PROFIL_KEY) || "{}")); } catch { /* profil vierge */ }
  const memoriserProfil = () => { try { sessionStorage.setItem(PROFIL_KEY, JSON.stringify(profile)); } catch { /* stockage indispo */ } };
  const aiHistory = [];
  const messages = [];
  let opened = false, typing = false, exchanges = 0;
  let nudged = false;      // la relance douce a-t-elle déjà été faite ?
  let expectName = false;  // le bot vient de demander le prénom
  let leadSig = "";        // signature du dernier lead envoyé (anti-doublon)
  let callbackAsked = false;

  /* --- la pastille devient un vrai bouton (le lien tel: était le repli) --- */
  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = pill.className;
  launcher.id = "scchat-launcher";
  launcher.innerHTML = pill.innerHTML;
  launcher.setAttribute("aria-haspopup", "dialog");
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "scchat-panel");
  launcher.setAttribute("aria-label", "Ouvrir l’assistant du Boxing Center Saint-Cyprien");
  const label = launcher.querySelector(".chatbot__label");
  if (label) label.innerHTML = "Une question&nbsp;? On te répond";
  pill.replaceWith(launcher);

  /* ------------------------------ le panneau ------------------------------ */
  const root = document.createElement("div");
  root.id = "scchat";
  root.className = "scchat";
  root.innerHTML = `
    <section class="scchat__panel" id="scchat-panel" data-lenis-prevent role="dialog" aria-modal="true"
             aria-labelledby="scchat-title" hidden>
      <header class="scchat__head">
        <span class="scchat__beam" aria-hidden="true"></span>
        <div class="scchat__ident">
          <span class="scchat__kicker">Boxing Center · rive gauche</span>
          <strong id="scchat-title">L’assistant de Saint-Cyprien</strong>
        </div>
        <button type="button" class="scchat__close" id="scchat-close" aria-label="Fermer l’assistant">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          </svg>
        </button>
      </header>
      <div class="scchat__body">
        <div class="scchat__messages" id="scchat-messages" role="log" aria-live="polite" aria-atomic="false"></div>
      </div>
      <div class="scchat__foot">
        <div class="scchat__chips" id="scchat-chips" hidden></div>
        <form class="scchat__form" id="scchat-form">
          <label class="sr-only" for="scchat-input">Ton message</label>
          <input class="scchat__input" id="scchat-input" type="text" autocomplete="off"
                 placeholder="Écris ta question…" maxlength="500" />
          <button class="scchat__send" type="submit" aria-label="Envoyer le message">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 12h14M14 6l6 6-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </form>
        <a class="scchat__tel" href="tel:${SALLE.phoneHref}">Ou appelle la salle · ${SALLE.phone}</a>
      </div>
    </section>`;
  document.body.appendChild(root);

  const panel = root.querySelector("#scchat-panel");
  const closeBtn = root.querySelector("#scchat-close");
  const messagesEl = root.querySelector("#scchat-messages");
  const chipsEl = root.querySelector("#scchat-chips");
  const form = root.querySelector("#scchat-form");
  const input = root.querySelector("#scchat-input");

  /* ------------------------------ rendu ------------------------------ */
  const esc = (s) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/\n/g, "<br>");

  function render() {
    messagesEl.innerHTML = messages
      .map((m) => {
        const actions = m.actions && m.actions.length ? `<div class="scchat__actions">${m.actions.map((a) => {
          if (a.act) return `<button type="button" class="scchat__action scchat__action--ext" data-act="${a.act}">${esc(a.label)}</button>`;
          const ext = /^https?:/i.test(a.href);
          /* c’est ICI que la sortie boutique est marquée — nulle part ailleurs */
          const href = tracke(a.href);
          return `<a class="scchat__action${ext ? " scchat__action--ext" : ""}" href="${href.replace(/"/g, "&quot;")}"${ext ? ` target="_blank" rel="noopener"` : ""}>${esc(a.label)}</a>`;
        }).join("")}</div>` : "";
        return `<div class="scchat__msg scchat__msg--${m.role}"><div class="scchat__stack"><div class="scchat__bubble">${esc(m.text)}</div>${actions}</div></div>`;
      })
      .join("");
    if (typing) {
      messagesEl.insertAdjacentHTML("beforeend",
        `<div class="scchat__msg scchat__msg--bot scchat__msg--typing"><div class="scchat__bubble">
           <span class="scchat__dots" aria-label="L’assistant écrit"><i></i><i></i><i></i></span>
         </div></div>`);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  async function botSay(text, pause = 550, actions) {
    typing = true; render();
    await delay(pause);
    typing = false;
    messages.push({ role: "bot", text, actions });
    render();
  }
  const userSay = (text) => { messages.push({ role: "user", text }); render(); };

  function showChips() {
    chipsEl.innerHTML =
      QUICKS.slice(0, 5).map((q) => `<button type="button" data-q="${esc(q.q)}">${esc(q.label)}</button>`).join("") +
      `<button type="button" class="scchat__chip--cta" data-callback>Être rappelé</button>`;
    chipsEl.hidden = false;
  }
  const hideChips = () => { chipsEl.hidden = true; chipsEl.innerHTML = ""; };
  messagesEl.addEventListener("click", (e) => {
    const act = e.target.closest("button[data-act]");
    if (act && act.dataset.act === "rappel") startCallback();
    /* Le laissez-passer de la seance offerte : sans ce jeton depose par le
       bot au moment ou il l'offre, l'URL rend une 404. */
    const lien = e.target.closest('a[href^="/seance-offerte"]');
    if (lien) { try { sessionStorage.setItem("bcs-offert-pass", String(Date.now())); } catch (_) {} }
  });

  /* ------------------- capture des coordonnées au fil de l’eau ------------------- */
  function contextString() {
    const bits = [];
    if (profile.prenom) bits.push(`Prénom : ${profile.prenom}`);
    if (profile.email) bits.push("Email déjà donné");
    if (profile.phone) bits.push("Téléphone déjà donné");
    return bits.join(". ");
  }

  /** Envoie le contact — seulement s’il est joignable, et jamais deux fois pareil. */
  function maybeSubmitLead(event) {
    if (!profile.email && !profile.phone) return false;
    const sig = JSON.stringify(profile);
    if (sig === leadSig) return false;
    leadSig = sig;
    const payload = {
      event, sessionId: sid,
      prenom: profile.prenom, nom: profile.nom,
      name: [profile.prenom, profile.nom].filter(Boolean).join(" ").trim(),
      email: profile.email, phone: profile.phone, salle: profile.salle,
    };
    window.__scchatLastLead = payload; // témoin vérifiable sur le rendu
    submitLead(payload).catch(() => { /* silencieux : ne bloque jamais la conversation */ });
    return true;
  }

  /** Extrait prénom / email / téléphone du message. true si du neuf a été capté.
   *  `fromChip` : le message vient d’une puce préécrite — ce n’est JAMAIS une
   *  présentation, c’est une question toute faite. On n’y cherche pas de prénom. */
  function extract(text, fromChip = false) {
    let found = false;
    const email = text.match(EMAIL_RE);
    if (email && !profile.email) { profile.email = email[0]; found = true; }
    const phone = text.match(PHONE_RE);
    if (phone && !profile.phone) { profile.phone = phone[0].replace(/\s+/g, " ").trim(); found = true; }
    if (!profile.prenom && !fromChip) {
      /* VOIE 1 — le visiteur se présente explicitement (« moi c’est Karim »).
         La tournure porte l’intention : c’est la voie la plus sûre. */
      const m = text.match(NAME_RE);
      let name = m && m[1] ? m[1].trim() : "";

      /* VOIE 2 — le bot VIENT de demander le prénom, à l’instant, et la réponse
         est un mot unique qui a la forme d’un prénom. Toute autre réponse —
         une question, une phrase, un mot de la liste STOP — ne donne RIEN.
         C’est cette voie qui écrivait « Quels » dans le carnet client. */
      if (!name && expectName) {
        const seul = text.trim();
        if (!/\s/.test(seul) && looksLikeFirstName(seul)) name = seul;
      }
      if (looksLikeFirstName(name)) { profile.prenom = titleCase(name); found = true; }
    }
    /* La fenêtre du prénom ne dure qu’un tour de parole : elle se referme ici,
       qu’on ait capté quelque chose ou non. */
    expectName = false;
    if (found) memoriserProfil();
    return found;
  }

  /* ------------------------------ conversation ------------------------------ */
  async function answer(text, fromChip = false) {
    const avaitPrenom = Boolean(profile.prenom);
    const avaitContact = Boolean(profile.email || profile.phone);
    const gotNew = extract(text, fromChip);
    const gotName = !avaitPrenom && Boolean(profile.prenom);
    const gotContact = !avaitContact && Boolean(profile.email || profile.phone);
    if (gotNew) maybeSubmitLead(callbackAsked ? "callback_request" : "lead_collected");

    hideChips();
    let reply = null;
    let replyActions = [];
    try {
      const parsed = parseReply(await askAi(text, aiHistory.slice(-6), contextString()));
      reply = parsed.text; replyActions = parsed.actions;
    } catch {
      /* Pas d’IA (aucune clé configurée, réseau coupé) : on compose depuis la
         base locale. L’IA sait accuser réception d’un prénom ou d’un numéro ;
         la base, non — c’est donc ICI qu’on le fait, sinon le bot répond une
         généralité à quelqu’un qui vient de taper son téléphone, et il a l’air
         de ne pas avoir écouté. */
      const kb = fallbackAnswer(text);
      const bits = [];
      if (gotName) bits.push(`Enchanté, ${profile.prenom} !`);
      if (kb) bits.push(kb);
      // rien de reconnu ET rien de neuf à saluer : la phrase de dernier recours
      if (!bits.length && !gotContact) bits.push(GENERIC);
      reply = bits.join(" ") || null;
    }

    if (reply) {
      aiHistory.push({ role: "user", content: text }, { role: "assistant", content: reply });
      await botSay(reply, 550, replyActions);
      exchanges++;
    }

    if (gotContact) {
      // On accuse TOUJOURS réception d’un moyen de rappel — pas seulement après
      // un « être rappelé ». C’est le moment où le visiteur se demande si ça
      // a servi à quelque chose.
      const suite = callbackAsked
        ? "un coach te rappelle très vite."
        : "si tu veux qu’on te cale un créneau, un coach te rappelle.";
      callbackAsked = false;
      await botSay(`C’est noté${profile.prenom ? `, ${profile.prenom}` : ""} — ${suite}`, 450);
    } else if (!nudged && exchanges >= 2 && !profile.email && !profile.phone) {
      nudged = true;
      await botSay("Au fait — si tu veux qu’un coach te rappelle ou te cale un créneau, laisse-moi un numéro ou un email quand tu veux. Sans pression.", 450);
    }
    showChips();
  }

  async function startCallback() {
    callbackAsked = true;
    hideChips();
    if (profile.email || profile.phone) {
      maybeSubmitLead("callback_request");
      await botSay(`C’est parti${profile.prenom ? `, ${profile.prenom}` : ""} — je transmets, un coach te rappelle. Autre chose en attendant ?`);
      callbackAsked = false;
      showChips();
      return;
    }
    await botSay(profile.prenom
      ? `Volontiers ${profile.prenom} : laisse-moi un numéro ou un email, et un coach te rappelle.`
      : "Volontiers. Dis-moi ton prénom et un numéro (ou un email), et un coach te rappelle.");
    /* Après la demande, jamais avant : la fenêtre du prénom s’ouvre ici. */
    expectName = !profile.prenom;
    input.placeholder = "Ton prénom et ton numéro…";
  }

  /* ------------------------------ ouverture ------------------------------ */
  const FOCUSABLE = 'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';

  function trapFocus(e) {
    if (e.key !== "Tab" || panel.hidden) return;
    const els = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  async function openPanel() {
    panel.hidden = false;
    root.classList.add("is-open");
    launcher.setAttribute("aria-expanded", "true");
    launcher.setAttribute("aria-label", "Fermer l’assistant du Boxing Center Saint-Cyprien");
    /* Le focus ne déplace JAMAIS la page : ni maintenant, ni si la feuille du
       widget arrivait en retard. Le noyau de style en ligne a déjà sorti le
       panneau du flux ; `preventScroll` est la seconde ceinture. */
    await cssReady;
    input.focus({ preventScroll: true });
    if (!opened) {
      opened = true;
      /* Bonjour d'abord. Le message ouvrait sur la surface et le prix puis
         demandait le prenom dans la foulee : trois demandes en une phrase. */
      /* Trois temps, jamais plus : bonjour + je vois ou vous etes, UN
         fait vrai sur cette page, une question ouverte. Le fait est ce
         qui separe un assistant d'un pop-up. Chiffres verifies dans
         data.js, un par un. */
      /* TUTOIEMENT. api/chat.js impose « Français, tutoiement, ton de
         coach » ; ces messages vouvoyaient. Le visiteur recevait donc un
         bonjour au « vous » puis une réponse au « tu » — deux voix dans
         la même conversation.
         UNE SEULE CLÉ PAR PAGE : « /activites/ » était écrite DEUX fois.
         En JavaScript la seconde écrase la première sans un mot, et le
         message sur les disciplines n'a jamais été affiché à personne.
         Les deux sont fondus ici en un seul. */
      const ACCUEILS = {
        "/tarifs/": ["Bonjour \u{1F44B} Tu es sur les tarifs.", "La rentrée à 29€ par personne est la formule la plus prise. Je t’aide à choisir ?"],
        "/activites/": ["Bonjour \u{1F44B} Tu regardes les disciplines.", "Sept, de l’anglaise au grappling, gants prêtés et aucun niveau demandé. Dis-moi ton objectif, je t’oriente."],
        "/plannings/": ["Bonjour \u{1F44B} Tu cherches un créneau.", "Ouvert du lundi au samedi, 10h–21h30. Donne-moi tes dispos, je te dis lequel prendre."],
        "/coachs/": ["Bonjour \u{1F44B} Tu regardes l’équipe.", "Trois coachs : Dadi, Tawee et Brice. Une question sur l’un d’eux ?"],
        "/la-salle/": ["Bonjour \u{1F44B} Tu découvres la salle.", "Sacs, tatamis et ring, plus la muscu et le cardio en accès libre. Envie de passer ?"],
        "/galerie/": ["Bonjour \u{1F44B} Tu parcours la galerie.", "Les clichés de la salle, zone par zone. Une question sur l’une d’elles ?"],
        "/contact/": ["Bonjour \u{1F44B} Tu cherches à nous joindre.", "11 rue Sainte-Lucie, à 200 m du tram T1 Fer à Cheval. Ou laisse-moi ton numéro."],
      };
      const _page = location.pathname.replace(/index\.html$/, "");
      const [_b, _s] = ACCUEILS[_page] || ["Bonjour \u{1F44B} Je suis l’assistant de Boxing Center Saint-Cyprien.", "Les cours, les créneaux, les tarifs — dis-moi ce que tu cherches."];
      await botSay(_b, 450);
      /* LE 29 EUR SEUL A L'ACCUEIL. Le bouton « Je viens essayer · 10€ »
           était posé ici, dans le deuxième message : l'essai était offert
           avant même que l'offre ait été proposée. Le réseau vend le 29 €
           d'abord ; le 10 € reste dans la grille tarifs et ne sort qu'après
           un refus — c'est le prompt serveur qui choisit ce moment-là, pas
           l'accueil. */
        await botSay(_s, 620, resolveActions(["offre", "saison"]));
      /* Le prenom en TROISIEME bulle, apres deux messages qui ont deja
         rendu service. `expectName` etait armee sans que la question soit
         posee : un mot unique etait lu comme un prenom alors que personne
         n'avait rien demande. Maintenant elle est posee pour de bon. */
      expectName = true;
      await botSay("Et toi, comment tu t’appelles ?", 420);
      showChips();
    }
  }
  function closePanel() {
    panel.hidden = true;
    root.classList.remove("is-open");
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-label", "Ouvrir l’assistant du Boxing Center Saint-Cyprien");
    // le focus revient sur la pastille — c’est d’elle qu’on est parti
    launcher.focus();
  }

  /* ------------------------------ événements ------------------------------ */
  launcher.addEventListener("click", () => (root.classList.contains("is-open") ? closePanel() : openPanel()));
  closeBtn.addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) { e.stopPropagation(); closePanel(); }
    else trapFocus(e);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || typing) return;
    input.value = "";
    userSay(text);
    await answer(text);
  });

  chipsEl.addEventListener("click", async (e) => {
    const cb = e.target.closest("button[data-callback]");
    if (cb) { await startCallback(); return; }
    const q = e.target.closest("button[data-q]");
    if (q) { const text = q.dataset.q; userSay(text); await answer(text, true); }
  });

  /* Poignée de test / de preuve : rejouer une conversation SUR LE RENDU. */
  window.__scchat = {
    open: openPanel, close: closePanel,
    say: async (t) => { userSay(t); await answer(t); },
    callback: startCallback,
    profile, messages,
    get lastLead() { return window.__scchatLastLead || null; },
  };


}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initChatbot);
else initChatbot();
