/* =====================================================================
   LES FONCTIONS api/ EN DÉVELOPPEMENT — `npm run dev` répond enfin au bot.

   En production, Vercel exécute api/*.js (le bot, les leads, le MCP).
   `astro dev`, lui, ne connaît que src/pages : POST /api/chat répondait 404,
   le widget retombait sur sa petite base locale, et le bot paraissait
   « très mauvais » en local alors que les clés du .env étaient bonnes
   (constaté le 08/10/2026 sur les trois sites).

   Cette intégration n’existe QU’EN DÉVELOPPEMENT (hook astro:server:setup,
   jamais appelé par le build) : elle charge .env sans écraser l’environnement
   déjà posé, retrouve le fichier api/ qui correspond à l’URL, et ajoute la
   fine couche que Vercel fournit en production — req.body parsé, req.query,
   res.status().json() / .send(). Les handlers sont ceux qui partent en ligne,
   rechargés à chaque modification du fichier.
   ===================================================================== */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function chargerEnv(racine) {
  for (const nom of [".env", ".env.local"]) {
    const f = path.join(racine, nom);
    if (!fs.existsSync(f)) continue;
    for (const ligne of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = ligne.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || process.env[m[1]] !== undefined) continue;
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
}

function trouverHandler(racine, urlPath) {
  const rel = urlPath.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const base = path.join(racine, "api", ...rel.split("/").filter(Boolean));
  for (const f of [`${base}.js`, `${base}.mjs`, path.join(base, "index.js")]) {
    if (fs.existsSync(f) && !path.basename(f).startsWith("_")) return f;
  }
  return null;
}

function lireCorps(req) {
  return new Promise((resolve) => {
    let brut = "";
    req.on("data", (c) => { brut += c; if (brut.length > 1e6) req.destroy(); });
    req.on("end", () => {
      const type = String(req.headers["content-type"] || "");
      if (!brut) return resolve(undefined);
      if (type.includes("application/json")) { try { return resolve(JSON.parse(brut)); } catch { return resolve(brut); } }
      if (type.includes("application/x-www-form-urlencoded")) return resolve(Object.fromEntries(new URLSearchParams(brut)));
      resolve(brut);
    });
  });
}

export function apiDev() {
  /* Un plugin Vite (et non le hook astro:server:setup) : son middleware passe
     AVANT celui d’Astro, qui sinon répond 404 à toute URL hors src/pages. */
  const plugin = {
    name: "bc-api-dev",
    apply: "serve",
    enforce: "pre",
    configureServer(server) {
      const racine = server.config.root;
      chargerEnv(racine);
      server.config.logger.info("[bc-api-dev] api/ servie en développement (.env chargé) — le bot répond comme en production");
      const apiHandler = async (req, res, next) => {
        const url = new URL(req.url || "/", "http://localhost");
        if (!url.pathname.startsWith("/api/")) return next();
        const fichier = trouverHandler(racine, url.pathname);
        if (!fichier) return next();
        try {
          const version = fs.statSync(fichier).mtimeMs;
          const mod = await import(`${pathToFileURL(fichier).href}?v=${version}`);
          const handler = mod.default;
          if (typeof handler !== "function") return next();
          req.query = Object.fromEntries(url.searchParams);
          if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) req.body = await lireCorps(req);
          res.status = (code) => { res.statusCode = code; return res; };
          res.json = (o) => { if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(o)); return res; };
          res.send = (o) => { if (typeof o === "object" && !Buffer.isBuffer(o)) return res.json(o); res.end(o); return res; };
          await handler(req, res);
        } catch (e) {
          server.config.logger.error(`[bc-api-dev] ${url.pathname} : ${e?.message || e}`);
          if (!res.headersSent) { res.statusCode = 500; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify({ error: "Erreur locale de la fonction api." })); }
        }
      };
      /* EN TÊTE de la pile : le garde « barre oblique finale » d’Astro
         (trailingSlash: 'always') répond 404 à /api/chat avant tout autre
         middleware, quel que soit l’ordre des plugins. */
      server.middlewares.stack.unshift({ route: "", handle: apiHandler });
    },
  };
  return {
    name: "bc-api-dev",
    hooks: {
      "astro:config:setup": ({ command, updateConfig }) => {
        /* En dev seulement : le garde trailingSlash: 'always' d’Astro répond 404
           à /api/chat (sans barre finale, l’URL qu’appelle le widget) AVANT tout
           middleware. Le build garde 'always' : la production ne change pas. */
        if (command === "dev") updateConfig({ trailingSlash: "ignore", vite: { plugins: [plugin] } });
      },
    },
  };
}
