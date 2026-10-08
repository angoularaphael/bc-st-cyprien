import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const routes = ["", "la-salle", "activites", "coachs", "galerie", "plannings", "tarifs", "contact"];
const htmlFor = (route) => readFileSync(join(root, "dist", route, "index.html"), "utf8");
const textOf = (html) => html
  .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&[a-z0-9#]+;/gi, " ")
  .replace(/\s+/g, " ")
  .trim();

test("les huit pages indexables ont un H1, une canonique et du JSON-LD valide", () => {
  for (const route of routes) {
    const html = htmlFor(route);
    const h1 = html.match(/<h1\b/gi) || [];
    assert.equal(h1.length, 1, `/${route}/ doit contenir exactement un H1`);
    const expected = `https://club-boxe-toulouse.com/${route ? `${route}/` : ""}`;
    assert.match(html, new RegExp(`<link[^>]+rel="canonical"[^>]+href="${expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "i"));

    const blocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(blocks.length >= 1, `/${route}/ doit exposer du JSON-LD`);
    for (const [, raw] of blocks) assert.doesNotThrow(() => JSON.parse(raw), `JSON-LD invalide sur /${route}/`);
  }
});

test("la FAQ visible de /contact/ et son FAQPage disent exactement la même chose", () => {
  /* aeo-geo : FAQ visible ⇔ FAQPage, même nombre d'items, même texte. Le
     balisage n'est jamais une promesse que la page ne tient pas. */
  const html = htmlFor("contact");
  const ld = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap(([, raw]) => JSON.parse(raw)["@graph"] || [JSON.parse(raw)]);
  const faq = ld.find((n) => n["@type"] === "FAQPage");
  assert.ok(faq, "/contact/ doit exposer un FAQPage");
  const visible = [...html.matchAll(/<summary>([\s\S]*?)<\/summary>/g)].map(([, q]) => textOf(q));
  const balise = faq.mainEntity.map((q) => textOf(q.name));
  assert.deepEqual(balise, visible, "FAQPage et FAQ visible divergent");
  const page = textOf(html);
  for (const q of faq.mainEntity) {
    assert.ok(page.includes(textOf(q.acceptedAnswer.text).slice(0, 60)), `réponse absente de la page : ${q.name}`);
  }
});

test("aucune SpeakableSpecification", () => {
  assert.doesNotMatch(routes.map(htmlFor).join("\n"), /SpeakableSpecification/);
});

test("la page Activités décrit chaque image informative", () => {
  const html = htmlFor("activites");
  const images = [...html.matchAll(/<img\b[^>]*\balt=(['"])(.*?)\1[^>]*>/gi)];
  assert.ok(images.length >= 13, "inventaire image Activités incomplet");
  const empty = images.filter(([, , alt]) => !alt.trim());
  assert.equal(empty.length, 0, `${empty.length} image(s) informative(s) sans alt`);
});

test("Coachs et Contact livrent une réponse utile dans le HTML initial", () => {
  const coaches = textOf(htmlFor("coachs"));
  const contact = textOf(htmlFor("contact"));
  assert.match(coaches, /Quel coach pour quelle discipline/i);
  assert.match(coaches, /aucun encadrant n’est nommé/i);
  assert.ok(coaches.split(/\s+/).length >= 180, "page Coachs encore trop mince");
  assert.match(contact, /Venir sans deviner/i);
  assert.match(contact, /Gants et matériel sont prêtés/i);
  assert.doesNotMatch(contact, /Confirme le créneau/i, "pas de vente négative sur la première séance");
  assert.ok(contact.split(/\s+/).length >= 230, "page Contact encore trop mince");
});

test("aucune note Google (ordre d’Eddy du 08/10/2026) — ni affichée, ni balisée, ni récitée", () => {
  const files = [
    ...routes.map((route) => join(root, "dist", route, "index.html")),
    join(root, "dist", "llms.txt"),
    join(root, "dist", "llms-full.txt"),
    join(root, "dist", "ai.txt"),
  ];
  const joined = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(joined, /aggregateRating|ratingValue|\b[1-5],[0-9] ?\/ ?5\b|\b\d+ avis\b|2026-08-06/i);
});

test("le sitemap contient huit URL et des images locales uniques qui existent", () => {
  const xml = readFileSync(join(root, "dist", "sitemap.xml"), "utf8");
  const pages = [...xml.matchAll(/<url>\s*<loc>/g)];
  const images = [...xml.matchAll(/<image:loc>https:\/\/club-boxe-toulouse\.com(\/[^<]+)<\/image:loc>/g)].map((m) => m[1]);
  assert.equal(pages.length, 8);
  assert.ok(images.length >= 20);
  assert.equal(new Set(images).size, images.length, "le sitemap répète encore des images entre pages");
  for (const image of images) {
    assert.ok(existsSync(join(root, "dist", image)), `image de sitemap absente : ${image}`);
  }
});

test("robots.txt autorise précisément MCP tout en gardant les autres API privées", () => {
  const robots = readFileSync(join(root, "dist", "robots.txt"), "utf8");
  assert.ok((robots.match(/^Allow: \/api\/mcp$/gm) || []).length >= 3);
  assert.ok((robots.match(/^Disallow: \/api\/$/gm) || []).length >= 3);
});

