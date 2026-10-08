/* =====================================================================
   Le balisage FAQPage de /contact/ est une PROJECTION de la FAQ visible
   (FAQ dans public/assets/js/data.js) : mêmes questions, même ordre, même
   texte. Lancé en prebuild, il réécrit le bloc « mainEntity » du LD-JSON
   de src/pages/contact/index.astro. Une réponse modifiée dans data.js ne
   peut donc plus diverger de ce que lisent les moteurs de réponse.
   S'arrête en erreur si le bloc attendu a disparu, plutôt que d'écrire à
   côté.
   ===================================================================== */
import fs from "node:fs";
import { FAQ } from "../public/assets/js/data.js";

const PAGE = new URL("../src/pages/contact/index.astro", import.meta.url);
const src = fs.readFileSync(PAGE, "utf8");
const nl = src.includes("\r\n") ? "\r\n" : "\n";

const re = /("@type": "FAQPage",\s*"@id": "[^"]+#faq",\s*"mainEntity": )\[[\s\S]*?\n(\s*)\](\s*\n\s*\})/;
const m = src.match(re);
if (!m) {
  console.error("faq-ld : bloc FAQPage introuvable dans contact/index.astro");
  process.exit(1);
}
const pad = m[2];
const items = FAQ.map((f) =>
  JSON.stringify({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }, null, 2)
    .split("\n").map((l) => pad + "  " + l).join(nl)
).join("," + nl);
const out = src.replace(re, (_, head, p, tail) => `${head}[${nl}${items}${nl}${p}]${tail}`);
if (out !== src) {
  fs.writeFileSync(PAGE, out);
  console.log(`faq-ld : ${FAQ.length} questions projetées dans le FAQPage de /contact/`);
} else {
  console.log("faq-ld : FAQPage déjà à jour");
}
