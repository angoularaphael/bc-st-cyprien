import test from "node:test";
import assert from "node:assert/strict";
import chatHandler, { providerTimeoutMs } from "../api/chat.js";

const providerPattern = /^(GEMINI_API_KEY|GROQ_API_KEY|MISTRAL_API_KEY)/;
const originalProviderEnv = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => providerPattern.test(name))
);
const originalFetch = global.fetch;
const originalWarn = console.warn;

function clearProviders() {
  for (const name of Object.keys(process.env)) {
    if (providerPattern.test(name)) delete process.env[name];
  }
}

function mockResponse() {
  const state = { statusCode: 200, headers: {}, payload: undefined };
  return {
    state,
    setHeader(name, value) { state.headers[name.toLowerCase()] = value; },
    status(code) { state.statusCode = code; return this; },
    json(payload) { state.payload = payload; return this; },
    end() { return this; },
  };
}

function request(body, method = "POST") {
  return { method, body, headers: {}, socket: { remoteAddress: "127.0.0.1" } };
}

test.beforeEach(() => {
  clearProviders();
  global.fetch = originalFetch;
  console.warn = originalWarn;
});

test.after(() => {
  clearProviders();
  Object.assign(process.env, originalProviderEnv);
  global.fetch = originalFetch;
  console.warn = originalWarn;
});

test("retourne une réponse locale HTTP 200 lorsqu'aucune clé n'est configurée", async () => {
  const res = mockResponse();
  await chatHandler(request({ message: "Bonjour, quels sont vos horaires ?", history: [] }), res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.payload.via, "local");
  assert.equal(res.state.payload.degraded, true);
  assert.equal(res.state.payload.diagnostic.reason, "no_provider_configured");
  assert.equal(res.state.payload.diagnostic.attempted, 0);
  assert.match(res.state.payload.reply, /lundi au samedi/i);
});

test("une clé expirée est diagnostiquée sans secret et bascule en local", async () => {
  const secret = "expired-test-secret-never-log";
  process.env.GEMINI_API_KEY = secret;
  const warnings = [];
  console.warn = (...parts) => warnings.push(parts.join(" "));
  global.fetch = async () => new Response(JSON.stringify({ error: "expired" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });

  const res = mockResponse();
  await chatHandler(request({ message: "Où se trouve la salle ?", history: [] }), res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.payload.via, "local");
  assert.equal(res.state.payload.diagnostic.reason, "providers_unavailable");
  assert.equal(res.state.payload.diagnostic.attempted, 1);
  assert.equal(res.state.payload.diagnostic.failures, 1);
  assert.match(warnings.join("\n"), /"category":"auth"/);
  assert.doesNotMatch(JSON.stringify(res.state.payload) + warnings.join("\n"), new RegExp(secret));
});

test("utilise un fournisseur sain et conserve le contrat de réponse", async () => {
  process.env.MISTRAL_API_KEY = "valid-test-secret-never-log";
  global.fetch = async () => new Response(JSON.stringify({
    choices: [{ message: { content: "La salle est ouverte du lundi au samedi. [boutons: planning]" } }],
  }), { status: 200, headers: { "content-type": "application/json" } });

  const res = mockResponse();
  await chatHandler(request({ message: "Quels sont les horaires ?", history: [] }), res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.payload.via, "mistral");
  assert.equal(res.state.payload.degraded, false);
  assert.match(res.state.payload.reply, /lundi au samedi/i);
});

test("refuse proprement un message vide", async () => {
  const res = mockResponse();
  await chatHandler(request({ message: "   " }), res);
  assert.equal(res.state.statusCode, 400);
  assert.equal(res.state.payload.error, "Message vide.");
});

test("borne le délai fournisseur et neutralise une valeur invalide", () => {
  assert.equal(providerTimeoutMs("invalid"), 6500);
  assert.equal(providerTimeoutMs("500"), 2000);
  assert.equal(providerTimeoutMs("6500"), 6500);
  assert.equal(providerTimeoutMs("999999"), 20000);
});

