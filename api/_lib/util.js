/* =====================================================================
   Helpers partagés des fonctions serverless (Vercel) — Saint-Cyprien.
   Zéro dépendance npm : uniquement fetch + crypto natifs.
   ===================================================================== */
import { createHash, createHmac, timingSafeEqual } from "crypto";

export function allowCors(res, origin) {
  const autorisée = origin || process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", autorisée);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, x-admin-token"
  );
  res.setHeader("Access-Control-Expose-Headers", "MCP-Protocol-Version, MCP-Session-Id");
  if (autorisée !== "*") res.setHeader("Vary", "Origin");
}

/** Comparaison à temps constant du mot de passe staff (jamais dans le front). */
export function isAdmin(req) {
  if (!process.env.ADMIN_TOKEN) return false;
  const given = createHash("sha256").update(String(req.headers["x-admin-token"] || "")).digest();
  const good = createHash("sha256").update(process.env.ADMIN_TOKEN).digest();
  return timingSafeEqual(given, good);
}

/** L’IP de l’appelant — la clé du garde-fou anti-spam de la galerie. */
export function ipOf(req) {
  return (
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "0.0.0.0"
  );
}

/* ------------------------------------------------------------------ *
 *  LE FILTRE À INJURES — un prénom ou une légende passe par ici avant
 *  d’aller où que ce soit. Il coupe trois choses : les insultes (FR + EN),
 *  le martèlement de caractères (aaaaaaa), et les liens (un mur du club
 *  n’est pas un panneau publicitaire). Les caractères = | < > sont retirés :
 *  ce sont eux qui séparent les champs du contexte Cloudinary, on ne laisse
 *  personne écrire dans un champ voisin.
 *  Renvoie { value, bad } — jamais une exception, jamais un texte modifié
 *  en douce : soit on accepte, soit on refuse en le disant.
 * ------------------------------------------------------------------ */
const INJURES = [
  "merde", "putain", "connard", "connasse", "salope", "encule", "pute", "bite", "couille", "nique",
  "ntm", "pd", "pede", "tapette", "bougnoule", "negro", "negre", "youpin", "salaud", "batard",
  "fuck", "shit", "bitch", "cunt", "nigger", "faggot", "whore", "rape", "nazi", "kys", "porn", "sex",
];

export function cleanName(s, max = 40) {
  const value = String(s ?? "").trim().slice(0, max).replace(/[=|<>]/g, "");
  const norm = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
  const bad =
    /(.)\1{6,}/.test(norm) ||
    /https?:|www\.|\.[a-z]{2,}\/?/i.test(value) ||
    INJURES.some((w) => new RegExp(`\\b${w}`, "i").test(norm));
  return { value, bad };
}

/** Corps de requête, que Vercel l’ait parsé ou non. */
export function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body || "{}"); } catch { return {}; } }
  return req.body;
}

/* ------------------------------------------------------------------ *
 *  LE POOL GEMINI — les clés ne s’appellent pas toutes GEMINI_API_KEY.
 *  Dans ce dépôt elles sont numérotées (GEMINI_API_KEY_1 … _11) pour
 *  répartir le quota. Qui lit une seule variable ne trouve donc RIEN et
 *  croit qu’il n’y a pas de clé. Ce ramassage est la seule lecture
 *  autorisée : l’assistant et le coup d'œil de la galerie partagent le
 *  même pool, mélangé pour ne pas brûler toujours la première.
 * ------------------------------------------------------------------ */
export function geminiKeys() {
  const keys = Object.keys(process.env)
    .filter((k) => /^GEMINI_API_KEY/.test(k))
    .map((k) => process.env[k])
    .filter(Boolean);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys;
}

/* ------------------------------------------------------------------ *
 *  STOCKAGE DES LEADS — Upstash Redis via son API REST (fetch simple,
 *  aucune dépendance, palier gratuit). Configuré par deux variables :
 *  UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 *  Non configuré ⇒ `kvReady()` est faux et l’appelant le dit honnêtement.
 * ------------------------------------------------------------------ */
const KV_URL = () => (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const KV_TOKEN = () => process.env.UPSTASH_REDIS_REST_TOKEN || "";
export const kvReady = () => Boolean(KV_URL() && KV_TOKEN());

/** Exécute une commande Redis (tableau d’arguments) via l’API REST. */
export async function kv(cmd) {
  if (!kvReady()) throw new Error("kv non configuré");
  const r = await fetch(KV_URL(), {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN()}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error("kv " + r.status);
  const j = await r.json();
  return j.result;
}

export const LEADS_KEY = "bcsc:leads";

/* ---------- Preuve de travail (anti-bot, cout ~un clignement d’oeil) ----------
   Meme mecanique que Portet et Minimes : defi signe HMAC (aucun etat serveur),
   le client trouve un nonce tel que sha256("challenge:nonce") commence par
   N zeros ; le serveur verifie signature, fraicheur et preuve. */
const POW_DIFFICULTY = +(process.env.POW_DIFFICULTY || 4);
const POW_TTL_MS = 10 * 60 * 1000;
const powSecret = () => (process.env.CLOUDINARY_URL || process.env.ADMIN_TOKEN || "bc");

export function issuePow() {
  const ts = Date.now();
  const challenge = createHash("sha256").update(`${ts}:${Math.random()}`).digest("hex").slice(0, 32);
  const sig = createHmac("sha256", powSecret()).update(`${challenge}.${ts}`).digest("hex");
  return { challenge, ts, sig, difficulty: POW_DIFFICULTY };
}

export function verifyPow({ challenge, ts, sig, nonce } = {}) {
  if (!challenge || !ts || !sig || nonce === undefined) return false;
  if (Date.now() - Number(ts) > POW_TTL_MS) return false;
  const expect = createHmac("sha256", powSecret()).update(`${challenge}.${ts}`).digest("hex");
  const a = Buffer.from(String(sig)), b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const h = createHash("sha256").update(`${challenge}:${nonce}`).digest("hex");
  return h.startsWith("0".repeat(POW_DIFFICULTY));
}
