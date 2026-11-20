/* =====================================================================
   POST /api/lead — la capture de contacts de l’assistant.
   Trois voies, toutes optionnelles, toutes cumulables :
     1. STOCKAGE   Upstash Redis REST (UPSTASH_REDIS_REST_URL + _TOKEN) —
                   c’est ce que le vestiaire relit dans « Les contacts ».
     2. E-MAIL     Brevo (BREVO_API_KEY + LEAD_EMAIL_TO, defaut
                   boxingcenter31@gmail.com) — une notification par lead.
     3. WEBHOOK    LEAD_WEBHOOK_URL — POST JSON brut (Zapier, Make, CRM…).
   Rien de configuré ⇒ 200 + journal serveur. Le parcours visiteur ne
   plante JAMAIS à cause de la capture : elle est silencieuse par nature.
   ===================================================================== */
import { allowCors, readBody, kv, kvReady, LEADS_KEY } from "./_lib/util.js";

const clean = (v, max = 120) =>
  String(v ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

/* Copie vers la base COMMUNE du réseau (gestion-manager) — la règle du boss :
   tout formulaire, tout chatbot, UNE seule base. Côté serveur : pas de CORS,
   jamais bloquant. */
async function forwardToNetwork(lead) {
  try {
    await fetch("https://gestion-manager.vercel.app/api/chatbot/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, salle: lead.salle || "Saint-Cyprien", source: "bc-st-cyprien" }),
    });
    return true;
  } catch { return false; }
}

async function notifyEmail(lead) {
  const key = String(process.env.BREVO_API_KEY || "").trim();
  if (!key.startsWith("xkeysib-")) return false;
  const to = process.env.LEAD_EMAIL_TO || process.env.LEAD_TO || "boxingcenter31@gmail.com";
  const name = process.env.BREVO_SENDER_NAME || "Boxing Center";
  const email = process.env.BREVO_SENDER_EMAIL || "contact@boxingcenter.fr";
  const lignes = [
    ["Prenom", lead.prenom], ["Nom", lead.nom], ["Email", lead.email],
    ["Telephone", lead.phone], ["Salle", lead.salle], ["Origine", lead.event],
    ["Session", lead.sessionId], ["Recu le", lead.at],
  ].filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0"><b>${k}</b></td><td>${v}</td></tr>`).join("");
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name, email },
      to: [{ email: to }],
      replyTo: { email: "boxingcenter31@gmail.com", name },
      subject: `Nouveau contact — ${lead.prenom || "visiteur"}${lead.phone ? ` · ${lead.phone}` : ""}`,
      htmlContent: `<p>Un visiteur a laisse ses coordonnees a l assistant du site Saint-Cyprien.</p><table>${lignes}</table>`,
    }),
  });
  return r.ok;
}

async function notifyWebhook(lead) {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return false;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  });
  return r.ok;
}

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const b = readBody(req);
  const email = clean(b.email, 160);
  const lead = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    source: "st-cyprien",
    event: clean(b.event, 40) || "lead_collected",
    prenom: clean(b.prenom, 60),
    nom: clean(b.nom, 60),
    email: EMAIL_RE.test(email) ? email : "",
    phone: clean(b.phone, 30),
    salle: clean(b.salle, 60),
    message: clean(b.message, 400),
    sessionId: clean(b.sessionId, 60),
  };

  // Un contact sans moyen de rappel n’est pas un contact.
  if (!lead.email && !lead.phone) return res.status(200).json({ ok: true, stored: false, reason: "incomplet" });

  const stored = { kv: false, email: false, webhook: false };
  if (kvReady()) {
    try { await kv(["LPUSH", LEADS_KEY, JSON.stringify(lead)]); await kv(["LTRIM", LEADS_KEY, 0, 999]); stored.kv = true; }
    catch (e) { console.error("[lead] stockage KV échoué :", e.message); }
  }
  try { stored.network = await forwardToNetwork(lead); } catch (e) { console.error("[lead] réseau échoué :", e.message); }
  try { stored.email = await notifyEmail(lead); } catch (e) { console.error("[lead] e-mail échoué :", e.message); }
  try { stored.webhook = await notifyWebhook(lead); } catch (e) { console.error("[lead] webhook échoué :", e.message); }

  if (!stored.kv && !stored.email && !stored.webhook) {
    // Aucune voie configurée : on journalise, et le visiteur ne voit rien casser.
    console.log("[lead] aucune voie de persistance configurée — lead reçu :", JSON.stringify(lead));
  }
  return res.status(200).json({ ok: true, id: lead.id, stored });
}
