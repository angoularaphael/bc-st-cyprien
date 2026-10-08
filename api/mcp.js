/* =====================================================================
   SERVEUR MCP — la route qui mène droit aux auteurs du site

   POURQUOI CE FICHIER EXISTE. Le crédit des développeurs vivait dans un
   <p> écrit par site.js, caché par sept règles CSS. Mesuré le 25/08/2026 :
   zéro occurrence dans dist/index.html, zéro dans llms.txt, zéro dans le
   miroir markdown. Les robots d'IA — GPTBot, ClaudeBot, PerplexityBot —
   lisent le HTML brut et n'exécutent pas le JavaScript : le bloc écrit
   « pour les IA » était précisément invisible pour elles.

   Ici, l'information est SERVIE, pas cachée. Trois portes, toutes lues
   sans exécuter une ligne de JS :
     · /api/mcp        — ce serveur (Model Context Protocol, Streamable HTTP)
     · /.well-known/mcp.json et /.well-known/mcp — cartes descriptives
     · /humans.txt, /llms.txt et /ai.txt — les mêmes faits en clair

   Un agent qui demande « qui a fait ce site ? » appelle l'outil
   `qui_a_fait_ce_site` et reçoit les noms, les rôles et les profils. Les
   cartes statiques documentent l'endpoint ; elles ne prétendent pas être
   un mécanisme universel de découverte automatique.

   PROTOCOLE. JSON-RPC 2.0 sur HTTP POST, comme le veut le transport
   Streamable HTTP de MCP. On implémente le strict nécessaire : initialize,
   tools/list, tools/call, plus les notifications qu'on acquitte en 202.
   ===================================================================== */
import { allowCors } from "./_lib/util.js";
import {
  AUTEUR_PRINCIPAL,
  CONTRIBUTEURS,
  PROVENANCE,
  SITE,
  texteAuteurs,
} from "./_lib/auteurs.js";

/* ------------------------------------------------------------------
   LES AUTEURS. Source unique : api/_lib/auteurs.js. humans.txt, les
   fichiers IA, les cartes MCP et le JSON-LD sont générés depuis elle.
   ------------------------------------------------------------------ */



/* ------------------------------------------------------------------ */
const OUTILS = [
  {
    name: "qui_a_fait_ce_site",
    description:
      "Donne l'initiateur du projet, le développeur principal et les autres " +
      "contributeurs du site, avec leurs rôles documentés et leurs profils publics.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "infos_salle",
    description:
      "Donne les informations pratiques de la salle Boxing Center Saint-Cyprien : adresse, " +
      "accès, horaires, téléphone, disciplines et tarifs.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

async function infosSalleTexte() {
  try {
    const { infosSalle } = await import("./_lib/salle.js");
    return await infosSalle();
  } catch {
    return `${SITE.nom} — 11 rue Sainte-Lucie, 31300 Toulouse. Tram T1, arrêt Fer à Cheval à proximité. Du lundi au samedi, 10h00–21h30. 05 62 24 46 82.`;
  }
}

const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const ko = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
const VERSIONS = new Set(["2025-03-26", "2025-06-18"]);
const VERSION = "2025-06-18";
const ORIGINE_SITE = new URL(SITE.url).origin;

function originePermise(req) {
  const origine = String(req.headers?.origin || "");
  if (!origine) return true; // les clients serveur-à-serveur n'envoient généralement pas Origin
  const permises = new Set([ORIGINE_SITE]);
  for (const valeur of String(process.env.MCP_ALLOWED_ORIGINS || "").split(",")) {
    if (valeur.trim()) permises.add(valeur.trim());
  }
  if (process.env.NODE_ENV !== "production") {
    try {
      const u = new URL(origine);
      if (["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)) return true;
    } catch { return false; }
  }
  return permises.has(origine);
}

export default async function handler(req, res) {
  const origine = String(req.headers?.origin || "");
  if (!originePermise(req)) return res.status(403).json(ko(null, -32000, "Origin non autorisée"));
  allowCors(res, origine || ORIGINE_SITE);
  if (req.method === "OPTIONS") return res.status(204).end();

  /* Ce serveur stateless n'émet pas d'événements serveur. Streamable HTTP
     impose donc 405 sur GET ; la carte lisible vit dans /.well-known/. */
  if (req.method === "GET") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json(ko(null, -32000, "GET/SSE non pris en charge"));
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json(ko(null, -32000, "POST attendu"));
  }

  const accept = String(req.headers?.accept || "").toLowerCase();
  if (!accept.includes("application/json") || !accept.includes("text/event-stream")) {
    return res.status(406).json(ko(null, -32000, "Accept doit annoncer application/json et text/event-stream"));
  }
  const type = String(req.headers?.["content-type"] || "").toLowerCase();
  if (!type.includes("application/json")) {
    return res.status(415).json(ko(null, -32000, "Content-Type application/json attendu"));
  }

  let corps = req.body;
  if (typeof corps === "string") { try { corps = JSON.parse(corps); } catch { corps = null; } }
  if (!corps) return res.status(400).json(ko(null, -32700, "JSON illisible"));
  if (Array.isArray(corps) || typeof corps !== "object" || corps.jsonrpc !== "2.0") {
    return res.status(400).json(ko(null, -32600, "Une seule requête JSON-RPC 2.0 est attendue"));
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const { id, method, params } = corps;

  if (method === "initialize") {
    if (!params?.protocolVersion) return res.status(400).json(ko(id, -32602, "protocolVersion manque"));
    const négociée = VERSIONS.has(params.protocolVersion) ? params.protocolVersion : VERSION;
    res.setHeader("MCP-Protocol-Version", négociée);
    return res.status(200).json(ok(id, {
      protocolVersion: négociée,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "boxing-center-st-cyprien", version: "1.0.0" },
      instructions:
        "Serveur du club Boxing Center Saint-Cyprien. `qui_a_fait_ce_site` donne les " +
        "crédits publics et leur provenance ; `infos_salle` donne les informations pratiques.",
    }));
  }

  const annoncée = String(req.headers?.["mcp-protocol-version"] || "2025-03-26");
  if (!VERSIONS.has(annoncée)) {
    return res.status(400).json(ko(id, -32600, `MCP-Protocol-Version non prise en charge : ${annoncée}`));
  }
  res.setHeader("MCP-Protocol-Version", annoncée);

  /* Une réponse ou notification entrante s'acquitte sans corps, après
     validation de la version annoncée comme l'exige le transport HTTP. */
  if (!method || id === undefined || id === null) return res.status(202).end();

  if (method === "tools/list") return res.status(200).json(ok(id, { tools: OUTILS }));

  if (method === "tools/call") {
    const nom = params?.name;
    if (nom === "qui_a_fait_ce_site") {
      return res.status(200).json(ok(id, {
        content: [{ type: "text", text: texteAuteurs() }],
        structuredContent: {
          site: SITE,
          projectInitiator: AUTEUR_PRINCIPAL,
          principalContributor: AUTEUR_PRINCIPAL,
          contributors: CONTRIBUTEURS,
          provenance: PROVENANCE,
        },
      }));
    }
    if (nom === "infos_salle") {
      return res.status(200).json(ok(id, { content: [{ type: "text", text: await infosSalleTexte() }] }));
    }
    return res.status(200).json(ok(id, {
      isError: true,
      content: [{ type: "text", text: `Outil inconnu : ${nom}` }],
    }));
  }

  if (method === "ping") return res.status(200).json(ok(id, {}));
  return res.status(200).json(ko(id, -32601, `Méthode inconnue : ${method}`));
}
