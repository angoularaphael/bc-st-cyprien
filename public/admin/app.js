/* =====================================================================
   LE VESTIAIRE — l'application du backoffice Saint-Cyprien.

   Ce que le staff modifie ici part dans public/content.json (commit
   GitHub via /api/admin/content, protégé par ADMIN_TOKEN), puis le
   pré-build le fusionne dans les données du site. On lit aussi les
   contacts laissés à l'assistant (/api/admin/leads).

   Principes tenus :
     · aucun secret dans le front — le mot de passe ne quitte jamais
       l'en-tête x-admin-token, et n'est gardé que le temps de l'onglet ;
     · aucun bouton mort — chaque action a un état de chargement, un
       résultat visible, et une erreur lisible en français ;
     · aucun écran vide qui a l'air cassé — les états « rien ici » sont
       écrits, expliqués, et ont l'air VOULUS.

   Sommaire :  1. état & helpers   4. sections (formulaires)
               2. schéma           5. les contacts
               3. brouillon        6. charger / publier / démarrage
   ===================================================================== */

/* ---------- 1. état & helpers ---------- */
let TOKEN = sessionStorage.getItem("bcsc_admin") || "";
let DATA = {};              // le contenu publié + le brouillon en cours
let CURRENT = "dashboard";
let LEADS = null;           // null = pas encore chargé
let CAPS = {};              // ce que le serveur sait faire (cf. /api/admin/ping)

const el = (t, a = {}, ...kids) => {
  const n = document.createElement(t);
  for (const k in a) {
    if (a[k] == null) continue;
    if (k === "class") n.className = a[k];
    else if (k === "html") n.innerHTML = a[k];
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), a[k]);
    else n.setAttribute(k, a[k]);
  }
  for (const c of kids) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
};
const $ = (s) => document.querySelector(s);
function setStatus(msg, cls = "") {
  const s = $("#status");
  s.textContent = msg;
  s.className = "status " + cls;
}
const I = (p) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICONS = {
  dashboard: I('<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>'),
  salle: I('<path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11Z"/><circle cx="12" cy="10" r="2.6"/>'),
  tarifs: I('<path d="M3.5 11.5v-8h8l9 9-8 8-9-9Z"/><circle cx="8.2" cy="8.2" r="1.5"/>'),
  coaches: I('<circle cx="12" cy="14.5" r="5"/><path d="M9.4 10.3 6.5 3.5"/><path d="M14.6 10.3l2.9-6.8"/>'),
  schedule: I('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/>'),
  leads: I('<path d="M4 6.5h16v11H4z"/><path d="m4.5 7 7.5 6 7.5-6"/>'),
  club: I('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="8.6" cy="10" r="1.6"/><path d="m4.5 17 5-5 3.5 3.5L16 13l3.5 4"/>'),
};

/* ---------- 2. le schéma : il pilote la génération des formulaires ---------- */
const SCHEMA = {
  dashboard: { label: "Accueil", type: "dashboard" },

  salle: {
    label: "Coordonnées & horaires", type: "object",
    intro: "L'adresse, le téléphone, l'e-mail et les horaires. Ces informations s'affichent dans le pied de page de chaque page, sur la page Contact — et l'assistant du site s'en sert pour répondre aux visiteurs.",
    fields: [
      { k: "phone", label: "Téléphone (affiché)" },
      { k: "phoneHref", label: "Téléphone (lien)", hint: "Format international, ex. +33562244682" },
      { k: "email", label: "E-mail" },
      { k: "hours", label: "Horaires (phrase affichée)", hint: "Ex. Lun – Sam · 10h00 – 21h30" },
      { k: "address", label: "Adresse", type: "object", fields: [
        { k: "street", label: "Rue" }, { k: "zip", label: "Code postal" }, { k: "city", label: "Ville" },
      ] },
    ],
  },

  tarifs: {
    label: "Tarifs", type: "list", singular: "tarif",
    intro: "Les cartes de la page Tarifs. Le prix que tu écris ici est celui que le visiteur lit — et celui que l'assistant annonce. Vérifie-le deux fois.",
    item: [
      { k: "name", label: "Nom de l'offre" },
      { k: "price", label: "Prix", hint: "Écris-le comme il doit s'afficher, ex. 259€" },
      { k: "period", label: "Période", hint: "Ex. les 12 mois, la séance, / an" },
      { k: "feature", label: "Ligne de mise en avant" },
      { k: "cta", label: "Texte du bouton" },
      { k: "href", label: "Lien du bouton" },
      { k: "items", label: "Ce que comprend l'offre", type: "strlist" },
      { k: "highlight", label: "Mettre cette carte en avant", type: "bool" },
    ],
  },

  coaches: {
    label: "Coachs", type: "list", singular: "coach",
    intro: "L'équipe affichée sur la page Coachs et sur l'accueil. RÈGLE DE LA MAISON : une photo n'apparaît sous un nom que si la source officielle associe les deux. Laisse le champ photo vide plutôt que d'y mettre le visage de quelqu'un d'autre — la tuile stylée est prévue pour ça.",
    item: [
      { k: "name", label: "Nom" },
      { k: "role", label: "Ce qu'il encadre", hint: "Ex. Anglaise · Lady Punch · École" },
      { k: "tag", label: "Étiquette courte", hint: "Ex. Le pilier" },
      { k: "note", label: "Une phrase sur lui", ml: true },
      { k: "img", label: "Photo (chemin)", hint: "Ex. /assets/img/sc/coach-dadi.webp — vide = tuile stylée, pas de visage emprunté" },
      { k: "alt", label: "Description de la photo", ml: true, hint: "Ce qu'on VOIT sur le cliché (pour les lecteurs d'écran et Google). À remplir seulement s'il y a une photo." },
    ],
  },

  schedule: {
    label: "Planning", type: "list", singular: "créneau",
    intro: "La semaine, créneau par créneau. Elle alimente la page Planning, les filtres, les fiches coachs — et les réponses de l'assistant. Le jour s'écrit en trois lettres : Lun, Mar, Mer, Jeu, Ven, Sam.",
    item: [
      { k: "day", label: "Jour", type: "select", options: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] },
      { k: "time", label: "Heure", hint: "Ex. 18h20" },
      { k: "key", label: "Discipline (code)", type: "select", options: ["anglaise", "thai", "grappling", "hyrox", "lady", "kids", "camp"] },
      { k: "name", label: "Nom affiché du cours" },
      { k: "coach", label: "Coach" },
      { k: "lvl", label: "Niveau" },
    ],
  },

  club: { label: "La galerie du club", type: "club" },

  leads: { label: "Les contacts", type: "leads" },
};

/* ---------- 3. brouillon local ---------- */
const DRAFT_KEY = "bcsc:draft";
let DIRTY = false, draftT;

function saveDraft() {
  clearTimeout(draftT);
  draftT = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(DATA)); } catch { /* quota */ } }, 350);
}
function markDirty() {
  DIRTY = true;
  saveDraft();
  setStatus("Modifications non publiées — le site en ligne n'a pas encore bougé.", "work");
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch { /* rien */ } DIRTY = false; }

/* ---------- 4. les champs ---------- */
function fieldFor(obj, def) {
  const wrap = el("div", { class: "field" });
  const id = "f-" + Math.random().toString(36).slice(2, 8);
  wrap.append(el("label", { for: id }, def.label));

  if (def.type === "bool") {
    const cb = el("input", { type: "checkbox", id, style: "width:auto;min-height:auto" });
    cb.checked = Boolean(obj[def.k]);
    cb.addEventListener("change", () => { obj[def.k] = cb.checked; markDirty(); });
    wrap.append(cb);
  } else if (def.type === "select") {
    const sel = el("select", { id });
    for (const o of def.options) sel.append(el("option", { value: o, selected: obj[def.k] === o ? "selected" : null }, o));
    sel.value = obj[def.k] ?? def.options[0];
    sel.addEventListener("change", () => { obj[def.k] = sel.value; markDirty(); });
    wrap.append(sel);
  } else if (def.type === "strlist") {
    const ta = el("textarea", { id, rows: 4 });
    ta.value = (obj[def.k] || []).join("\n");
    ta.addEventListener("input", () => { obj[def.k] = ta.value.split("\n").map((s) => s.trim()).filter(Boolean); markDirty(); });
    wrap.append(ta, el("span", { class: "hint" }, "Une ligne = un élément de la liste."));
  } else if (def.ml) {
    const ta = el("textarea", { id });
    ta.value = obj[def.k] ?? "";
    ta.addEventListener("input", () => { obj[def.k] = ta.value; markDirty(); });
    wrap.append(ta);
  } else {
    const inp = el("input", { type: "text", id });
    inp.value = obj[def.k] ?? "";
    inp.addEventListener("input", () => { obj[def.k] = inp.value; markDirty(); });
    wrap.append(inp);
  }
  if (def.hint && def.type !== "strlist") wrap.append(el("span", { class: "hint" }, def.hint));
  return wrap;
}

function objectFields(obj, fields, into) {
  for (const f of fields) {
    if (f.type === "object") {
      obj[f.k] = obj[f.k] || {};
      const card = el("div", { class: "card" });
      card.append(el("div", { class: "card__head" }, el("h3", {}, f.label)));
      const g = el("div", { class: "grid2" });
      objectFields(obj[f.k], f.fields, g);
      card.append(g);
      into.append(card);
    } else into.append(fieldFor(obj, f));
  }
}

function renderObject(key, def) {
  const pane = $("#pane");
  DATA[key] = DATA[key] || {};
  pane.append(el("p", { class: "intro" }, def.intro));
  const card = el("div", { class: "card" });
  const g = el("div", { class: "grid2" });
  objectFields(DATA[key], def.fields, g);
  card.append(g);
  pane.append(card);
}

function renderList(key, def) {
  const pane = $("#pane");
  DATA[key] = Array.isArray(DATA[key]) ? DATA[key] : [];
  pane.append(el("p", { class: "intro" }, def.intro));

  const host = el("div", {});
  const draw = () => {
    host.innerHTML = "";
    if (!DATA[key].length) {
      host.append(el("div", { class: "empty" },
        el("b", {}, "Cette liste est vide"),
        el("p", {}, `Rien n'est encore surchargé ici : le site affiche ce qui a été livré à l'ouverture. Ajoute un ${def.singular} pour reprendre la main — attention, dès que tu ajoutes une entrée, c'est TA liste qui remplace celle d'origine.`)
      ));
    }
    DATA[key].forEach((row, i) => {
      const card = el("div", { class: "card" });
      const head = el("div", { class: "card__head" },
        el("span", { class: "n" }, String(i + 1).padStart(2, "0")),
        el("h3", {}, row.name || row.time || `${def.singular} ${i + 1}`),
        el("button", { class: "btn ghost sm danger rowdel", type: "button",
          onclick: () => { if (confirm(`Supprimer ce ${def.singular} ?`)) { DATA[key].splice(i, 1); markDirty(); draw(); } } }, "Supprimer")
      );
      const g = el("div", { class: "grid2" });
      objectFields(row, def.item, g);
      card.append(head, g);
      host.append(card);
    });
    host.append(el("button", { class: "btn", type: "button", id: "addRow",
      onclick: () => { DATA[key].push({}); markDirty(); draw(); } }, `+ Ajouter un ${def.singular}`));
  };
  draw();
  pane.append(host);
}

/* ---------- 5. les contacts laissés à l'assistant ---------- */
async function renderLeads() {
  const pane = $("#pane");
  pane.append(el("p", { class: "intro" },
    "Chaque fois qu'un visiteur laisse son prénom et un moyen de le rappeler à l'assistant du site, il atterrit ici. Le plus récent en premier. Rappelle-les : ce sont des gens qui ont déjà tapé leur numéro."));
  const host = el("div", { class: "leads" });
  pane.append(host);
  host.append(el("div", { class: "skel" }), el("div", { class: "skel" }));

  let res;
  try { res = await api("/api/admin/leads"); }
  catch (e) {
    host.innerHTML = "";
    host.append(el("div", { class: "empty" },
      el("b", {}, "Le carnet n'a pas répondu"),
      el("p", {}, e.message)));
    return;
  }
  host.innerHTML = "";
  LEADS = res.leads || [];
  paintNav();

  if (!res.configured) {
    host.append(el("div", { class: "empty" },
      el("b", {}, "Le carnet n'est pas encore branché"),
      el("p", { html: "L'assistant capte déjà les coordonnées et les envoie ; il manque juste un endroit où les ranger. Sur Vercel, ajoute les deux variables <code>UPSTASH_REDIS_REST_URL</code> et <code>UPSTASH_REDIS_REST_TOKEN</code>, puis redéploie. Les contacts s'afficheront ici automatiquement. (En attendant, si <code>RESEND_API_KEY</code> est configurée, chaque contact part par e-mail — rien n'est perdu.)" })));
    return;
  }
  if (!LEADS.length) {
    host.append(el("div", { class: "empty" },
      el("b", {}, "Aucun contact pour l'instant"),
      el("p", {}, "Le carnet est branché et il attend. Le premier visiteur qui laisse son numéro à l'assistant apparaîtra ici, sans que tu aies rien à faire.")));
    return;
  }
  for (const l of LEADS) {
    const when = new Date(l.at);
    host.append(el("div", { class: "lead" },
      el("div", {},
        el("div", { class: "lead__who" }, [l.prenom, l.nom].filter(Boolean).join(" ") || "Visiteur sans prénom"),
        el("span", { class: "lead__tag" },
          l.event === "callback_request" ? "Demande de rappel"
          : l.event === "upload_contributor" ? "A posté sur le mur du club"
          : "Coordonnées laissées")),
      el("div", { class: "lead__contact" },
        l.phone ? el("a", { href: "tel:" + l.phone.replace(/\s/g, "") }, l.phone) : null,
        l.email ? el("a", { href: "mailto:" + l.email }, l.email) : null),
      el("div", { class: "lead__meta" },
        isNaN(when) ? "" : when.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
        el("br"),
        isNaN(when) ? "" : when.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }))
    ));
  }
}

/* ---------- 5 bis. LA GALERIE DU CLUB — la file de modération ---------- *
 * Ce que les visiteurs déposent sur /galerie/ atterrit ici, et NULLE PART
 * ailleurs tant que personne n'a cliqué. Deux gestes, deux conséquences,
 * annoncées avant d'être faites :
 *   · « Publier »  → le média rejoint le mur public ;
 *   · « Refuser »  → le fichier est SUPPRIMÉ chez l'hébergeur, définitivement.
 * Le second demande confirmation : on ne détruit pas le souvenir de
 * quelqu'un sur un clic distrait.
 * --------------------------------------------------------------------- */
let CLUB = null;

async function renderClub() {
  const pane = $("#pane");
  pane.append(el("p", { class: "intro" },
    "Les photos et les vidéos déposées par les membres sur la page Galerie attendent ici. Rien n'est visible sur le site tant que tu n'as pas cliqué sur « Publier ». Regarde, puis tranche : ce mur porte le nom du club."));
  const host = el("div", { class: "clubq" });
  pane.append(host);
  host.append(el("div", { class: "skel" }), el("div", { class: "skel" }));

  let res;
  try { res = await api("/api/community/pending"); }
  catch (e) {
    host.innerHTML = "";
    host.append(el("div", { class: "empty" }, el("b", {}, "La file n'a pas répondu"), el("p", {}, e.message)));
    return;
  }
  host.innerHTML = "";
  CLUB = res.items || [];
  paintNav();

  if (res.branche === false) {
    host.append(el("div", { class: "empty" },
      el("b", {}, "Le mur n'est pas encore branché"),
      el("p", { html: "La page Galerie affiche déjà l'invitation à déposer, mais il manque l'endroit où ranger les fichiers. Sur Vercel, ajoute la variable <code>CLOUDINARY_URL</code> (elle se copie depuis le tableau de bord Cloudinary), puis redéploie. Les dépôts arriveront ici tout seuls." })));
    return;
  }
  if (!CLUB.length) {
    host.append(el("div", { class: "empty" },
      el("b", {}, "Rien à regarder pour l'instant"),
      el("p", {}, "La file est vide : tout ce qui a été déposé a déjà été traité. Le prochain dépôt apparaîtra ici, sans que tu aies rien à faire.")));
    return;
  }

  if (res.vision === false) {
    host.append(el("div", { class: "empty", style: "margin-bottom:16px" },
      el("b", {}, "Le coup d'œil automatique est éteint"),
      el("p", { html: "Sans clé de vision (<code>GEMINI_API_KEY</code>), aucun média n'est pré-trié : tout arrive ici et c'est toi qui juges. Rien n'est moins sûr pour autant — de toute façon, rien ne se publie sans ton clic." })));
  }

  for (const it of CLUB) {
    const carte = el("div", { class: "clubcard" });
    const vue = el("div", { class: "clubcard__media" });
    if (it.type === "video") {
      const v = el("video", { src: it.src, poster: it.poster || null, controls: "", preload: "none", playsinline: "" });
      vue.append(v);
    } else {
      vue.append(el("img", { src: it.src, alt: it.legende || "Média déposé par un visiteur", loading: "lazy", decoding: "async" }));
    }
    const meta = el("div", { class: "clubcard__meta" },
      el("div", { class: "clubcard__who" }, it.auteur || "Sans prénom"),
      el("div", { class: "clubcard__cap" }, it.legende || "Pas de légende"),
      /* Le moyen de rappel du déposant : cliquable, pour prévenir en deux
         gestes quand la photo passe — c'est ce qu'on lui a promis. */
      it.contact
        ? el("a", {
            class: "clubcard__contact",
            href: it.contact.includes("@") ? `mailto:${it.contact}` : `tel:${it.contact.replace(/[^\d+]/g, "")}`,
          }, it.contact)
        : el("div", { class: "clubcard__tech" }, "Pas de contact enregistré"),
      el("div", { class: "clubcard__tech" },
        `${it.type === "video" ? "Vidéo" : "Photo"}${it.duree ? ` · ${it.duree}s` : ""}${it.largeur ? ` · ${it.largeur}×${it.hauteur}` : ""}`));
    if (it.horsSujet === true) {
      meta.append(el("div", { class: "clubcard__flag" }, "À regarder de près : ce cliché n'a probablement rien à voir avec la salle."));
    }

    const agir = async (action, btn) => {
      if (action === "reject" && !confirm(`Refuser ce média de ${it.auteur || "ce visiteur"} ? Le fichier sera supprimé définitivement.`)) return;
      btn.disabled = true;
      const avant = btn.textContent;
      btn.textContent = action === "approve" ? "Publication…" : "Suppression…";
      try {
        await api("/api/community/moderate", { method: "POST", body: JSON.stringify({ id: it.id, type: it.type, action }) });
        carte.remove();
        CLUB = CLUB.filter((x) => x.id !== it.id);
        paintNav();
        setStatus(action === "approve" ? "Publié sur le mur du club." : "Refusé et supprimé.", "ok");
        if (!CLUB.length) renderSection("club");
      } catch (e) {
        btn.disabled = false; btn.textContent = avant;
        setStatus("Action refusée : " + e.message, "bad");
      }
    };

    const actions = el("div", { class: "clubcard__actions" },
      el("button", { class: "btn btn--light sm", type: "button", onclick: (e) => agir("approve", e.currentTarget) }, "Publier"),
      el("button", { class: "btn ghost sm danger", type: "button", onclick: (e) => agir("reject", e.currentTarget) }, "Refuser"));

    carte.append(vue, meta, actions);
    host.append(carte);
  }
}

/* ---------- 6. l'accueil ---------- */
function renderDashboard() {
  const pane = $("#pane");
  pane.append(el("div", { class: "hello" },
    el("h3", {}, "Bienvenue dans le vestiaire."),
    el("p", {}, "D'ici tu changes ce que les visiteurs lisent : les coordonnées, les tarifs, les coachs, le planning. Tu peux aussi voir qui a laissé son numéro à l'assistant du site. Rien n'est en ligne tant que tu n'as pas cliqué sur « Publier » — tu peux donc tout essayer sans risque.")));

  if (CAPS.publication === false) {
    pane.append(el("div", { class: "empty", style: "margin-bottom:20px" },
      el("b", {}, "La publication n'est pas encore branchée"),
      el("p", { html: "Tu peux tout modifier et tout préparer ici — mais le bouton « Publier » ne pourra pas écrire tant que <code>GITHUB_TOKEN</code> et <code>GITHUB_REPO</code> ne sont pas configurés sur Vercel. Mieux vaut te le dire maintenant qu'au moment de publier." })));
  }
  pane.append(el("p", { class: "intro" }, "Tu ne sais pas par où commencer ? Choisis ce que tu veux faire : je te prends par la main, étape par étape."));
  const grid = el("div", { class: "wizards" });
  const wiz = [
    ["editContact", "Changer le téléphone ou les horaires", "Les coordonnées du club, partout à la fois."],
    ["editTarif", "Modifier un tarif", "Un prix, un nom d'offre, une mention."],
    ["editCoach", "Ajouter ou modifier un coach", "Avec la règle photo de la maison."],
    ["editPlanning", "Retoucher le planning", "Un créneau, une heure, un coach."],
    ["seeLeads", "Voir qui a laissé son numéro", "Les contacts captés par l'assistant."],
    ["moderClub", "Valider les photos des membres", "Ce qui attend sur le mur du club."],
    ["howPublish", "Comprendre « Publier »", "Ce qui part en ligne, et quand."],
  ];
  for (const [k, title, sub] of wiz) {
    grid.append(el("button", { class: "wiz", type: "button", "data-wiz": k, onclick: () => runFlow(FLOWS[k]) },
      el("i", {}, "Assistant"), el("b", {}, title), el("span", {}, sub)));
  }
  pane.append(grid);
}

/* ---------- 7. navigation & rendu ---------- */
function paintNav() {
  const nav = $("#nav");
  nav.innerHTML = "";
  for (const [k, def] of Object.entries(SCHEMA)) {
    const b = el("button", { class: "navbtn" + (k === CURRENT ? " on" : ""), type: "button", "data-k": k,
      onclick: () => renderSection(k) });
    b.insertAdjacentHTML("afterbegin", ICONS[k] || ICONS.dashboard);
    b.append(document.createTextNode(def.label));
    if (k === "leads" && LEADS && LEADS.length) b.append(el("span", { class: "badge" }, String(LEADS.length)));
    if (k === "club" && CLUB && CLUB.length) b.append(el("span", { class: "badge" }, String(CLUB.length)));
    nav.append(b);
  }
}

function renderSection(key) {
  CURRENT = key;
  const def = SCHEMA[key];
  $("#paneTitle").textContent = def.label;
  $("#pane").innerHTML = "";
  paintNav();
  if (def.type === "dashboard") renderDashboard();
  else if (def.type === "club") renderClub();
  else if (def.type === "leads") renderLeads();
  else if (def.type === "object") renderObject(key, def);
  else if (def.type === "list") renderList(key, def);
}
window.renderSection = renderSection; // les assistants pilotent l'écran

/* ---------- 8. l'API ---------- */
async function api(path, init = {}) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", "x-admin-token": TOKEN, ...(init.headers || {}) },
  });
  let body = {};
  try { body = await res.json(); } catch { /* réponse non JSON */ }
  if (!res.ok) throw new Error(body.error || `Le serveur a répondu ${res.status}.`);
  return body;
}

async function loadContent() {
  const res = await api("/api/admin/content");
  DATA = res.content && typeof res.content === "object" ? res.content : {};
  // un brouillon local plus récent reprend la main (rien ne se perd jamais)
  try {
    const d = localStorage.getItem(DRAFT_KEY);
    if (d) {
      DATA = JSON.parse(d);
      DIRTY = true;
      setStatus("Brouillon retrouvé — tes modifications t'attendaient. Rien n'est encore en ligne.", "work");
      return;
    }
  } catch { /* brouillon illisible : on garde la version publiée */ }
  setStatus("À jour avec le site en ligne.", "ok");
}

async function publish() {
  const btn = $("#publish");
  if (CAPS.publication === false) {
    setStatus("Publication impossible : le serveur n'a pas encore GITHUB_TOKEN et GITHUB_REPO. Tes modifications restent gardées ici.", "bad");
    return;
  }
  btn.disabled = true;
  setStatus("Publication en cours…", "work");
  try {
    const res = await api("/api/admin/content", { method: "POST", body: JSON.stringify({ content: DATA }) });
    clearDraft();
    setStatus(res.rebuild
      ? "Publié. Le site se met à jour tout seul — compte une minute, puis rafraîchis-le."
      : "Publié (enregistré). Le site se mettra à jour au prochain déploiement.", "ok");
  } catch (e) {
    setStatus("Publication refusée : " + e.message, "bad");
  } finally {
    btn.disabled = false;
  }
}

async function reloadPublished() {
  if (DIRTY && !confirm("Jeter toutes tes modifications non publiées et revenir à ce qui est en ligne ?")) return;
  clearDraft();
  setStatus("Rechargement…", "work");
  try { await loadContent(); renderSection(CURRENT); }
  catch (e) { setStatus("Rechargement impossible : " + e.message, "bad"); }
}

/* ---------- 9. connexion & démarrage ---------- */
async function enter() {
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");
  try { await loadContent(); }
  catch (e) { setStatus("Contenu non chargé : " + e.message, "bad"); }
  renderSection("dashboard");
  try { if (!localStorage.getItem(TOUR_KEY)) setTimeout(startTour, 450); } catch { /* rien */ }
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#loginBtn"), err = $("#loginErr");
  const val = $("#token").value.trim();
  if (!val) return;
  btn.disabled = true; btn.textContent = "Vérification…"; err.textContent = "";
  TOKEN = val;
  try {
    // on ne valide QUE le mot de passe ici (cf. api/admin/ping.js) : un
    // GITHUB_TOKEN manquant ne doit pas ressembler à un mauvais mot de passe.
    CAPS = (await api("/api/admin/ping")).capacites || {};
    sessionStorage.setItem("bcsc_admin", TOKEN);
    await enter();
  } catch (ex) {
    TOKEN = "";
    err.textContent = ex.message;
  } finally {
    btn.disabled = false; btn.textContent = "Entrer";
  }
});

$("#publish").addEventListener("click", publish);
$("#reload").addEventListener("click", reloadPublished);
$("#tourBtn").addEventListener("click", () => { renderSection("dashboard"); setTimeout(startTour, 120); });
$("#logout").addEventListener("click", () => {
  if (DIRTY && !confirm("Tu as des modifications non publiées. Elles resteront dans ce navigateur. Se déconnecter ?")) return;
  sessionStorage.removeItem("bcsc_admin");
  location.reload();
});
addEventListener("beforeunload", (e) => { if (DIRTY) { e.preventDefault(); e.returnValue = ""; } });

/* session encore ouverte : on rentre directement */
if (TOKEN) {
  api("/api/admin/ping")
    .then((r) => { CAPS = r.capacites || {}; return enter(); })
    .catch(() => { sessionStorage.removeItem("bcsc_admin"); TOKEN = ""; });
}
