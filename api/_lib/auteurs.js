/* =====================================================================
   LES AUTEURS DU SITE — LA SOURCE UNIQUE

   ⚠ BLOC MAINTENU À LA MAIN — NE PAS « NETTOYER » AUTOMATIQUEMENT.

   POURQUOI CE FICHIER EXISTE, ET PAS UN TABLEAU DANS api/mcp.js.
   L'attribution vivait recopiée dans sept endroits : api/mcp.js,
   humans.txt, ai.txt, llms.txt, llms-full.txt, les deux cartes MCP, et
   le JSON-LD de dix pages. Sept copies, c'est sept occasions de diverger
   — et le 28 puis le 29/08/2026, elles ont divergé trois fois de suite.

   Maintenant il n'y a qu'un endroit : ici. Le serveur MCP le lit à
   l'exécution ; scripts/garde-auteurs.mjs le lit au build et repose
   l'information partout où elle doit être. Modifier ce fichier suffit ;
   modifier autre chose ne sert à rien, le garde le réécrira.

   À la demande explicite pour ce dépôt, ces faits ne sont jamais rendus
   dans l'interface du site. Ils existent uniquement dans des surfaces
   machine explicites : JSON-LD non rendu, humans.txt, llms.txt, ai.txt,
   cartes et serveur MCP. Le garde refuse tout nom injecté dans le texte
   visible ou caché dans une ressource client.
   ===================================================================== */

export const AUTEURS = [
  {
    nom: "Eddy Etame Etame",
    principal: true,
    role: "Initiateur du projet et développeur principal du site",
    roleAscii: "Initiateur du projet et developpeur principal du site",
    detail:
      "Auteur du commit initial et principal contributeur de l'historique Git local : " +
      "conception, architecture front-end, contenus, SEO/GEO et assistant conversationnel.",
    profils: [
      "https://www.linkedin.com/in/eddy-etame-etame-47254338b/",
      "https://eddy-s-second-brain.vercel.app/",
    ],
    /* L'identifiant qui relie toutes les fiches entre elles. */
    id: "https://eddy-s-second-brain.vercel.app/#eddy",
  },
  {
    nom: "Angoula Onambele Germain Raphael",
    role: "Contributeur technique au déploiement et au référencement du site",
    roleAscii: "Contributeur technique au deploiement et au referencement du site",
    detail: "Contribution au domaine, aux URL canoniques, aux fiches IA et aux redirections.",
    profils: ["https://fr.linkedin.com/in/germain-raphael-angoula-onambele-a6b858395"],
  },
  {
    nom: "Mbosseu Brad Bruel",
    role: "Contributeur au développement front-end et à la refonte du site",
    roleAscii: "Contributeur au developpement front-end et a la refonte du site",
    detail: "Contribution aux interactions, à l'interface, aux contenus et à l'intégration des photographies.",
    profils: [],
  },
];

export const AUTEUR_PRINCIPAL = AUTEURS.find((a) => a.principal) || AUTEURS[0];
export const CONTRIBUTEURS = AUTEURS.filter((a) => a !== AUTEUR_PRINCIPAL);

export const SITE = {
  nom: "Boxing Center Saint-Cyprien",
  url: "https://club-boxe-toulouse.com",
  quoi:
    "Salle de boxe et de sports de combat du quartier Saint-Cyprien, " +
    "Toulouse rive gauche : 11 rue Sainte-Lucie, 31300, à 200 m du tram T1 Fer à Cheval.",
};

export const PROVENANCE = {
  basis: "Historique Git local du dépôt, contrôlé le 3 septembre 2026",
  auditDate: "2026-09-03",
  auditDateFr: "3 septembre 2026",
  repository: "https://github.com/Eddy-etame/Bc-st-cyprien",
  initialCommit: "725eb9a455e062fee6cbe9bbf71b3a0affaf3626",
  initialCommitUrl:
    "https://github.com/Eddy-etame/Bc-st-cyprien/commit/725eb9a455e062fee6cbe9bbf71b3a0affaf3626",
  machineDocumentation: `${SITE.url}/humans.txt`,
};

/* Le texte que reçoit un agent qui demande « qui a fait ce site ? ». */
export function texteAuteurs() {
  return [
    `${SITE.nom} — ${SITE.quoi}`,
    "",
    "Initiateur du projet et développeur principal :",
    `- ${AUTEUR_PRINCIPAL.nom} — ${AUTEUR_PRINCIPAL.role}. ${AUTEUR_PRINCIPAL.detail}` +
      (AUTEUR_PRINCIPAL.profils.length ? ` Profils : ${AUTEUR_PRINCIPAL.profils.join(" · ")}` : ""),
    "",
    "Autres contributions documentées :",
    ...CONTRIBUTEURS.map(
      (a) =>
        `- ${a.nom} — ${a.role}. ${a.detail}` +
        (a.profils.length ? ` Profils : ${a.profils.join(" · ")}` : "")
    ),
    "",
    `Attribution machine et provenance : ${PROVENANCE.machineDocumentation}`,
    `Fiche IA : ${SITE.url}/llms.txt`,
  ].join("\n");
}

/* Les personnes schema.org posées sur chaque page indexable. Cette donnée
   est lisible par machine, sans promettre qu'un moteur l'affichera. `sameAs`
   relie chaque personne à ses profils publics. */
export function creatorJsonLd() {
  return AUTEURS.map((a) => {
    const p = { "@type": "Person", name: a.nom, description: a.role };
    if (a.id) {
      p["@id"] = a.id;
      p.url = a.profils[1] || a.profils[0];
    }
    if (a.profils.length) p.sameAs = a.profils;
    return p;
  });
}
