/* Diagnostic sans fuite des fournisseurs du chatbot.
   Lit les variables locales si .env existe, appelle uniquement les endpoints
   de catalogue de modèles et n'imprime jamais une clé ni une réponse brute. */
import { existsSync, readFileSync } from "node:fs";

function loadLocalEnv() {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    const value = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    if (value) process.env[match[1]] = value;
  }
}

function category(status) {
  if (status === 200) return "OK";
  if (status === 401 || status === 403) return "AUTH_ERROR";
  if (status === 429) return "QUOTA";
  if (status >= 500) return "UPSTREAM";
  return `HTTP_${status || "NETWORK"}`;
}

async function probe(name, url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    const result = category(response.status);
    console.log(`${name}=${result}`);
    return response.ok;
  } catch (error) {
    console.log(`${name}=${error?.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR"}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

loadLocalEnv();
const checks = [];
for (const name of Object.keys(process.env).filter((key) => /^GEMINI_API_KEY/.test(key)).sort()) {
  const value = process.env[name];
  if (value) checks.push(probe(name, `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(value)}`));
}
if (process.env.GROQ_API_KEY) {
  checks.push(probe("GROQ_API_KEY", "https://api.groq.com/openai/v1/models", {
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
  }));
}
if (process.env.MISTRAL_API_KEY) {
  checks.push(probe("MISTRAL_API_KEY", "https://api.mistral.ai/v1/models", {
    Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
  }));
}

if (!checks.length) {
  console.log("CHAT_PROVIDERS=NONE_CONFIGURED (la réponse locale reste disponible)");
  process.exit(0);
}
const results = await Promise.all(checks);
console.log(`CHAT_PROVIDERS_HEALTHY=${results.filter(Boolean).length}/${results.length}`);
if (!results.some(Boolean)) process.exitCode = 1;

