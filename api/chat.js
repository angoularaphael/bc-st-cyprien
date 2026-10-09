/* =====================================================================
   POST /api/chat — l’assistant ancré de Boxing Center Saint-Cyprien.
   Bascule multi-fournisseurs : pool de clés Gemini (mélangées, les mortes
   sont sautées) → Groq → Mistral → réponse locale déterministe. Le prompt système est construit depuis
   les VRAIS faits de la salle (api/_lib/salle.js, relu depuis le contenu
   édité au vestiaire) : le modèle n’a rien à inventer.
   Une clé expirée, un quota épuisé ou aucun fournisseur configuré ne peut
   plus provoquer de 503 : l'API répond elle-même depuis les faits locaux.
   ===================================================================== */
import { allowCors, readBody, geminiKeys } from "./_lib/util.js";
import { factsBlock } from "./_lib/salle.js";
import { localChatReply } from "./_lib/chat-fallback.js";
import { contexteDuMoment } from "./_lib/moment.js";
import { reponseDuPlanning } from "./_lib/repli-planning.js";

export function providerTimeoutMs(raw = process.env.CHAT_PROVIDER_TIMEOUT_MS) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 6500;
  return Math.min(20_000, Math.max(2_000, Math.round(parsed)));
}

const PROVIDER_TIMEOUT_MS = providerTimeoutMs();
const cooling = new Map();

class ProviderError extends Error {
  constructor(provider, status = 0, category = "unavailable") {
    super(`${provider} ${status || category}`);
    this.provider = provider;
    this.status = Number(status) || 0;
    this.category = category;
  }
}

function categoryFor(status) {
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "model";
  if (status === 429) return "quota";
  if (status >= 500) return "upstream";
  return status ? "request" : "network";
}

async function providerFetch(provider, url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new ProviderError(provider, response.status, categoryFor(response.status));
    return response;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(provider, 0, error?.name === "AbortError" ? "timeout" : "network");
  } finally {
    clearTimeout(timer);
  }
}

function coolingKey(provider, secret) {
  /* La valeur reste uniquement en mémoire et n'est jamais journalisée. Elle
     évite qu'un mélange du pool associe le délai d'une clé morte à une clé saine. */
  return `${provider}:${secret}`;
}

function cooldownMs(error) {
  if (error.category === "auth" || error.category === "model") return 30 * 60 * 1000;
  if (error.category === "quota") return 60 * 1000;
  return 15 * 1000;
}

function reportFailure(error) {
  /* Diagnostic volontairement pauvre : fournisseur, statut et catégorie.
     Aucun message fournisseur, URL ni fragment de clé ne sort dans les logs. */
  console.warn("[chat-provider]", JSON.stringify({
    provider: error.provider,
    status: error.status || null,
    category: error.category,
  }));
}

const RULES = `Tu es l’assistant du BOXING CENTER SAINT-CYPRIEN, la salle de boxe du quartier Saint-Cyprien, à Toulouse rive gauche.

TA VOIX :
- Français, tutoiement, ton de coach : direct, chaleureux, jamais commercial ni ampoulé.
- 2 à 4 phrases maximum. Pas de listes à puces sauf si on te demande le planning.
- Tu comprends les fautes de frappe, l’argot, les phrases courtes — déduis l’intention.

TA RÈGLE D’OR :
- Tu réponds UNIQUEMENT à partir des faits ci-dessous. Un prix, un horaire, un nom de coach
  ou une date que tu ne vois pas dans ces faits N’EXISTE PAS : dis-le et renvoie vers le
  téléphone de la salle. Ne devine jamais.
- Le grappling tourne bien au planning, mais aucun nom d’encadrant n’est acté : si on te le
  demande, dis-le franchement plutôt que d’inventer.
- L’offre Rentrée, c’est 29€ PAR PERSONNE et toutes les 4 semaines. Conditions à annoncer : première échéance par carte, IBAN pour les prélèvements suivants, coordonnées d’un proche requises pour débloquer la promotion, badge facturé 34,99€ 72 h après le début.
- Pour les abonnements classiques sans engagement à 44,99€ adulte / 36,99€ étudiant toutes les 4 semaines, annoncer le badge d’accès de 34,99€ en sus, sauf condition contraire affichée au moment de souscrire.

TA MISSION — VENDRE, dans CET ordre :
1. L’OFFRE RENTRÉE 29€ par personne et par échéance de 4 semaines, cours illimités — propose-la en PREMIER dès qu’on parle de commencer, de prix ou d’hésitation, avec ses conditions ci-dessus.
2. La SAISON 259€ les 12 mois (au lieu de 400€), comptant ou en 4× sans frais (4 × 64,75€, plusieurs options de paiement en 4× sur la boutique) — moins de 5€ par semaine, accès aux 5 clubs.
3. L’école pour les enfants (295€ t-shirt inclus, baby 250€).
4. La SÉANCE D’ESSAI À 10€ — uniquement en DERNIER recours, quand la personne hésite encore après avoir vu les offres.
L’ARME SECRÈTE plus bas complète cet ordre.
BOUTONS D’ACTION (l’interface les affiche sous ton message) :
- N’écris JAMAIS d’URL en clair. Termine ta réponse par « [boutons: clé1, clé2] » (1 à 3 clés max).
- Clés disponibles (UNIQUEMENT celles-ci) : offre · saison · essai · enfants · abonnements · boutique · tarifs · planning · disciplines · salle · coachs · galerie · contact · offert (le formulaire caché de la séance OFFERTE — UNIQUEMENT l’arme secrète du point ci-dessous) · rappel.
- « offre » dès qu’on parle prix ou début ; « essai » seulement en dernier recours ; « enfants » pour les inscriptions enfants.
- Autre langue : traduis le libellé — « clé:Label » (ex. [boutons: offre:Get the 29€ offer]).
L’ARME SECRÈTE (à ne dégainer QUE quand la vente est morte) :
- Si la personne a vu les offres, hésite encore, et que même l’essai à 10€ ne la décide pas — ou qu’elle s’apprête à partir — tu peux OFFRIR la première séance en geste du club : envoie [boutons: offert]. Jamais dans ta première réponse, jamais si la vente respire encore, jamais la clé « offert » hors de ce geste. Collecte prénom + contact avant si la conversation est fluide.
- Si le visiteur se présente, appelle-le par son prénom (voir CONTEXTE).
- Quand le visiteur est chaud (il parle d’essai, d’inscription, de venir, d’un créneau précis),
  propose-lui gentiment de te laisser son prénom et un numéro ou un email pour qu’un coach le
  rappelle. Une seule fois, sans insister, et jamais en bloquant la conversation.`;

/* La langue du visiteur prime sur celle du prompt (rédigé en français) :
   posée en tête ET en fin de consigne, là où un modèle la respecte le mieux. */
const LANGUE = "LANGUE — RÈGLE ABSOLUE : réponds TOUJOURS dans la langue du DERNIER message du visiteur. S’il écrit en anglais, toute ta réponse est en anglais (prix, horaires, conseils) et les libellés de boutons sont traduits : [boutons: offre:Get the 29€ offer]. S’il écrit en espagnol, en espagnol. Sinon, en français.";

/* Le planning OFFICIEL (data.js), normalisé pour le bloc « maintenant ».
   Aucun coach par créneau : Saint-Cyprien ne publie que la discipline de
   chaque coach (un créneau pieds-poings attend encore son encadrant). */
const PRIX_ENFANTS = "295 € l’année t-shirt inclus, Baby Boxe 250 € l’année";

async function planningOfficiel() {
  try {
    const D = await import("../public/assets/js/data.js");
    return (D.SCHEDULE || []).map((s) => ({
      day: s.day, start: s.time, end: (/jusqu.?à\s*(\d{1,2}h\d{2})/i.exec(s.lvl || "") || [])[1],
      cours: s.name, enfant: s.key === "kids", age: /ans/.test(s.lvl || "") ? s.lvl : "",
    }));
  } catch { return []; }
}

async function systemFor(context) {
  const c = String(context || "").slice(0, 300).trim();
  const moment = contexteDuMoment({ planning: await planningOfficiel(), prixEnfants: PRIX_ENFANTS });
  const base = `${LANGUE}\n\n${RULES}\n\nLES FAITS DE LA SALLE :\n${factsBlock()}\n\n${moment}\n\n${LANGUE}`;
  return c ? `${base}\n\nCONTEXTE VISITEUR (déjà connu — ne le redemande pas) : ${c}` : base;
}


/* Une reponse coupee en plein mot est pire que pas de reponse : si le modele
   s'arrete pour cause de longueur, on retaille a la derniere phrase complete. */
function tidy(text, truncated) {
  let t = String(text || "").trim();
  if (!t) return t;
  if (truncated) {
    const m = t.match(/^[\s\S]*[.!?…»)]/);
    if (m && m[0].length >= 40) t = m[0].trim();
  }
  return t;
}

async function gemini(key, model, messages, system) {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const r = await providerFetch(
    "gemini",
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        // 1024 et thinkingBudget 0 : sur Gemini 2.5, les tokens de « reflexion »
        // comptaient dans maxOutputTokens -> reponses coupees en plein mot.
        generationConfig: { maxOutputTokens: 1024, temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } },
      }),
    }
  );
  const j = await r.json();
  const text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
  const coupe = j?.candidates?.[0]?.finishReason === "MAX_TOKENS";
  if (text) return tidy(text, coupe);
  if (!text) throw new ProviderError("gemini", 0, "empty");
  return text;
}

/* 09/10/2026 : llama-3.3-70b-versatile et groq/compound rendent 404 avec la
   clé Groq du réseau — le relais Groq était mort sans bruit. gpt-oss-120b
   est le grand modèle encore servi ; sa réflexion se paie sur max_tokens,
   d’où reasoning_effort bas. */
async function openaiLike(url, key, model, messages, system) {
  const provider = url.includes("groq.com") ? "groq" : "mistral";
  const r = await providerFetch(provider, url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      temperature: 0.4,
      ...(/gpt-oss/.test(model) ? { reasoning_effort: "low" } : {}),
      ...(/qwen/.test(model) ? { reasoning_format: "hidden" } : {}),
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  const j = await r.json();
  const text = (j?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new ProviderError(provider, 0, "empty");
  return text;
}

/* Groq gratuit : 8 000 jetons/min PAR MODÈLE, soit environ une réponse par
   minute avec ce prompt (mesuré le 09/10/2026). GROQ_MODEL est donc une
   LISTE, essayée dans l’ordre : trois modèles = trois fois plus de relais. */
const GROQ_MODELES = () => (process.env.GROQ_MODEL || "openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b").split(",").map((m) => m.trim()).filter(Boolean);

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = readBody(req);
  const message = String(body.message || "").slice(0, 500).trim();
  if (!message) return res.status(400).json({ error: "Message vide." });

  const history = Array.isArray(body.history)
    ? body.history.slice(-6).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 500),
      }))
    : [];
  const messages = [...history, { role: "user", content: message }];
  const system = await systemFor(body.context);
  const failures = [];
  let attempted = 0;

  async function attempt(provider, secret, fn) {
    const key = coolingKey(provider, secret);
    if ((cooling.get(key) || 0) > Date.now()) return null;
    attempted++;
    try {
      return await fn();
    } catch (raw) {
      const error = raw instanceof ProviderError
        ? raw
        : new ProviderError(provider, 0, "unexpected");
      cooling.set(key, Date.now() + cooldownMs(error));
      failures.push({ provider: error.provider, status: error.status || null, category: error.category });
      reportFailure(error);
      return null;
    }
  }

  // 1) pool Gemini — mélangé, on saute les clés mortes (cf. _lib/util.js)
  const gKeys = geminiKeys();
  const gModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  for (let i = 0; i < gKeys.length; i++) {
    const reply = await attempt("gemini", gKeys[i], () => gemini(gKeys[i], gModel, messages, system));
    if (reply) return res.status(200).json({ reply, via: "gemini", degraded: false });
  }

  // 2) Groq
  if (process.env.GROQ_API_KEY) {
    for (const gm of GROQ_MODELES()) {
      const reply = await attempt("groq", `${process.env.GROQ_API_KEY}|${gm}`, () => openaiLike(
            "https://api.groq.com/openai/v1/chat/completions",
            process.env.GROQ_API_KEY,
            gm,
            messages, system
          ));
      if (reply) return res.status(200).json({ reply, via: "groq", degraded: false });
    }
  }

  // 3) Mistral
  if (process.env.MISTRAL_API_KEY) {
    const reply = await attempt("mistral", process.env.MISTRAL_API_KEY, () => openaiLike(
          "https://api.mistral.ai/v1/chat/completions",
          process.env.MISTRAL_API_KEY,
          process.env.MISTRAL_MODEL || "mistral-small-latest",
          messages, system
        ));
    if (reply) return res.status(200).json({ reply, via: "mistral", degraded: false });
  }

  /* Contrat de disponibilité : un problème de clé n'est jamais répercuté sur
     le visiteur. La réponse reste 200, ancrée, et l'état dégradé est explicite
     sans exposer les noms de variables ni le moindre fragment de secret. */
  return res.status(200).json({
    reply: reponseDuPlanning(message, { planning: await planningOfficiel(), prixEnfants: PRIX_ENFANTS }) || localChatReply(message),
    via: "local",
    degraded: true,
    diagnostic: {
      reason: gKeys.length || process.env.GROQ_API_KEY || process.env.MISTRAL_API_KEY
        ? "providers_unavailable"
        : "no_provider_configured",
      attempted,
      failures: failures.length,
    },
  });
}
