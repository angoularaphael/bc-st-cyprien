/* =====================================================================
   IndexNow — à lancer APRÈS chaque déploiement : `npm run indexnow`.
   Signale à Bing (et aux moteurs qui lisent son index : Copilot, ChatGPT
   search, DuckDuckGo…) toutes les URL du plan du site EN LIGNE, avec la
   clé publiée à la racine (/<clé>.txt). Ne touche ni au build ni au site.
   ===================================================================== */
import fs from "node:fs";
const KEY = fs.readdirSync("public").find((f) => /^[a-f0-9]{32}\.txt$/.test(f))?.replace(".txt", "");
const SITE = JSON.parse(fs.readFileSync("package.json", "utf8")).indexnowSite;
if (!KEY || !SITE) { console.error("indexnow : clé ou indexnowSite manquant"); process.exit(1); }
const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => !/\.(webp|jpg|png|avif)$/.test(u));
const r = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
});
console.log(`indexnow : ${urls.length} URL envoyées pour ${SITE} → HTTP ${r.status} (200/202 = accepté)`);
