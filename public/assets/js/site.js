/* =====================================================================
   SAINT-CYPRIEN · site.js — chrome + motion engine (light edition)
   window.BC = { reveal, magnetic, refresh, media, split, scramble, lenis }
   Same proven engine as the other salles, with the showroom’s restraint:
   no custom cursor, no grain — precision instead of texture.
   ===================================================================== */
import { NAV, LINKS, SALLE, NETWORK, picture, pictureEl } from "./data.js?v=30";

import { initPlaces } from "./places.js?v=22";
import { mountRoulette } from "./roulette.js?v=24";
/* ------------------------- MAILLAGE DE MARQUE ---------------------- *
 * Le réseau propriétaire est un maillage VOULU : les liens sortants vers
 * boxingcenter.fr, la boutique et les salles sœurs partent en target=_blank
 * + rel="noopener" — et SURTOUT PAS en nofollow (c’est du jus de marque
 * qu’on donne exprès). L’icône dit au lecteur qu’il change de site.
 * Un seul endroit produit ces liens : nav, menu et pied s’y branchent. */
const svgExt = `<svg class="ext" width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5 11L11 5M11 5H6M11 5V10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ext = (href, label, title) =>
  `<a href="${href}" target="_blank" rel="noopener"${title ? ` title="${title}"` : ""}>${label} ${svgExt}</a>`;

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
if (!gsap) document.documentElement.classList.remove("fx");

let lenis = null;
let velocity = 0;

/* ----------------------------- NAV / MENU ------------------------- */
function currentPath() {
  let p = location.pathname.replace(/index\.html$/, "");
  if (!p.endsWith("/")) p += "/";
  return p;
}
function mountNav() {
  const path = currentPath();
  const principales = NAV.filter((n) => n.top !== false);
  const links = principales.map(
    (n) => `<a href="${n.href}"${n.href === path ? ' aria-current="page"' : ""}>${n.label}</a>`
  ).join("");
  document.getElementById("nav").innerHTML = `
    <nav class="nav" id="site-nav" aria-label="Navigation principale">
      <a class="nav__brand" href="/" aria-label="Boxing Center Saint-Cyprien — accueil">
        ${picture("/assets/img/logo-white.webp", `class="nav__logo" alt="Boxing Center" width="384" height="179"`)}
        <span class="nav__salle">Saint-Cyprien</span>
      </a>
      <div class="nav__links">${links}</div>
      <div class="nav__right">
        <div class="nav__ext">
          ${ext(LINKS.groupe, "Le réseau", "Boxing Center — le site du groupe")}
          ${ext(LINKS.boutique, "Boutique", "La boutique Boxing Center")}
        </div>
        <a class="btn btn--primary nav__cta" data-magnetic href="${LINKS.rentree}"><span>Ma place · 29€</span></a>
        <button class="burger" id="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
      </div>
    </nav>`;

  const menuLinks = principales.map(
    (n, i) => `<a class="menu__link" href="${n.href}"><span class="n">${String(i + 1).padStart(2, "0")}</span>${n.label}</a>`
  ).join("");
  document.getElementById("drawer").innerHTML = `
    <div class="menu" id="menu" aria-hidden="true">
      <div class="menu__top">
        <a class="nav__brand" href="/" aria-label="Boxing Center Saint-Cyprien — accueil">
          ${picture("/assets/img/logo-white.webp", `class="nav__logo" alt="Boxing Center" width="384" height="179"`)}
          <span class="nav__salle">Saint-Cyprien</span>
        </a>
        <button class="menu__close" id="menu-close">Fermer <span aria-hidden="true">✕</span></button>
      </div>
      <nav class="menu__nav" aria-label="Menu">${menuLinks}</nav>
      <div class="menu__foot">
        <a class="btn btn--primary" data-magnetic href="${LINKS.essai}"><span>Réserver l’essai · 10€</span></a>
        <div class="menu__ext">
          ${ext(LINKS.groupe, "Le réseau Boxing Center")}
          ${ext(LINKS.boutique, "Boutique")}
          ${ext(LINKS.instagram, "Instagram")}
          <a href="tel:${SALLE.phoneHref}">${SALLE.phone}</a>
        </div>
      </div>
    </div>`;

  const nav = document.getElementById("site-nav");
  const burger = document.getElementById("burger");
  const menu = document.getElementById("menu");
  const items = menu.querySelectorAll(".menu__link");
  const setOpen = (open) => {
    document.documentElement.classList.toggle("is-menu-open", open);
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    burger.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("is-locked", open);
    if (lenis) open ? lenis.stop() : lenis.start();
    if (gsap && !reduce && open) {
      gsap.fromTo(items, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.65, ease: "power4.out", stagger: 0.05, delay: 0.16 });
    }
  };
  burger.addEventListener("click", () => setOpen(!menu.classList.contains("is-open")));
  document.getElementById("menu-close").addEventListener("click", () => setOpen(false));
  menu.querySelectorAll(".menu__link, .menu__foot a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

  /* PASSER EN DESKTOP FERME LE MENU.
     Le burger disparaît à 1120px (voir base.css) : si le menu plein écran
     était ouvert au moment où l'on élargit la fenêtre — ou où l'on bascule
     une tablette en paysage — il resterait ouvert SANS bouton pour le
     fermer, et le défilement resterait verrouillé. Le seuil est lu une
     fois, pas à chaque pixel de redimensionnement. */
  const grandEcran = matchMedia("(min-width: 1120px)");
  const surGrandEcran = (e) => { if (e.matches) setOpen(false); };
  grandEcran.addEventListener?.("change", surGrandEcran);

  let last = 0;
  ScrollTrigger?.create({
    start: 0, end: "max",
    onUpdate: (self) => {
      const y = self.scroll();
      nav.classList.toggle("is-scrolled", y > 60);
      if (y > last && y > 380 && !menu.classList.contains("is-open")) nav.classList.add("is-hidden");
      else nav.classList.remove("is-hidden");
      last = y;
    },
  });
}

/* --------------------- FOOTER — la fiche technique ----------------- */
function mountFooter() {
  const cols = [{ h: "La salle", links: NAV.slice(1, 7) }];
  const fields = [
    { k: "Établissement", v: "Boxing Center — Saint-Cyprien", wide: true },
    { k: "Réseau", v: "5 clubs Boxing Center" },
    { k: "Ouverte en", v: "Janvier 2022" },
    { k: "Adresse", v: SALLE.address.full, wide: true },
    { k: "Horaires", v: SALLE.hours },
    { k: "Téléphone", v: `<a href="tel:${SALLE.phoneHref}">${SALLE.phone}</a>` },
    { k: "Accès", v: "Tram T1 · Fer à Cheval" },
    { k: "Fédérations", v: SALLE.federations.join(" · ") },
  ];
  document.getElementById("footer").innerHTML = `
    <footer class="footer">
      <div class="wrap">
        <div class="footer__head">
          <div>
            <span class="eyebrow">À toi de jouer</span>
            <h2 class="display footer__cut">Rive gauche.<br><span class="tint">Tout est prêt.</span></h2>
          </div>
          <a class="btn btn--primary" data-magnetic href="${LINKS.essai}"><span>Réserver l’essai · 10€</span></a>
        </div>
        <div class="fiche" aria-label="Fiche technique de la salle">
          ${fields.map((f) => `<div class="fiche__cell${f.wide ? " fiche__cell--wide" : ""}"><span class="fk">${f.k}</span><span class="fv">${f.v}</span></div>`).join("")}
        </div>
        <div class="footer__links">
          ${cols.map((c) => `<div class="footer__col"><h4>${c.h}</h4>${c.links.map((l) => `<a href="${l.href}">${l.label}</a>`).join("")}</div>`).join("")}
          <div class="footer__col">
            <h4>Le réseau</h4>
            ${ext(LINKS.groupe, "Boxing Center — le groupe")}
            ${ext(LINKS.boutique, "Boutique")}
          </div>
          <div class="footer__col">
            <h4>Suivre</h4>
            ${ext(LINKS.instagram, "Instagram")}
            ${ext(LINKS.facebook, "Facebook")}
          </div>
        </div>

        <!-- LE MAILLAGE INTER-SALLES — rendu depuis NETWORK (données réelles),
             sur les 8 pages. Volontairement une simple ligne de liens : la
             vitrine des salles sœurs vit sur /la-salle/ et n’a pas à être
             rejouée ici. Ce qui compte en pied de page, c’est le lien. -->
        <nav class="netmesh" aria-label="Les autres salles du réseau Boxing Center">
          <span class="netmesh__k">Ton abonnement ouvre aussi</span>
          <ul class="netmesh__list">
            ${NETWORK.map((s) => `<li>${ext(s.url, s.name, `${s.name} — ${s.feat}`)}</li>`).join("")}
          </ul>
        </nav>
        <div class="footer__bottom">
          <span>© ${new Date().getFullYear()} SAS Boxing Center · Boxing Center Saint-Cyprien · <a href="/mentions-legales/">Mentions légales</a></span>
          <span class="footer__stamp">Rive gauche · garde haute</span>
        </div>
      </div>
    </footer>`;
}

/* ------------------------------ LENIS ----------------------------- */
function initSmooth() {
  // gsap porte le ticker qui pilote lenis : sans lui, on ne touche à rien
  // (le scroll natif reste parfaitement utilisable).
  if (reduce || !window.Lenis || !gsap) return;
  lenis = new window.Lenis({ duration: 1.05, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on("scroll", (e) => { velocity = e.velocity; ScrollTrigger?.update(); });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ----------------------------- MAGNETIC --------------------------- */
/* LES BOUTONS AIMANTÉS SONT RETIRÉS — volontairement.
   Ils déclenchaient un gsap.to() à CHAQUE mousemove sur chaque CTA, puis
   un rebond `elastic.out` au relâchement. Trois raisons de les enlever :
   un CTA qui fuit sous le curseur est plus dur à cliquer qu'un bouton
   immobile ; le rebond élastique lit « gadget », pas « premium » ; et
   c'était une animation qui attirait l'attention sans rien servir.
   Le survol reste — .btn:hover fait sa translation de 2px et son halo en
   CSS, sans une ligne de JavaScript.

   La fonction reste exportée et ne fait plus rien : six pages appellent
   BC.magnetic(), elles continuent de fonctionner sans être touchées, et
   `data-magnetic` reste un marqueur inoffensif dans le markup. */
function magnetic() { /* volontairement vide — voir ci-dessus */ }

/* ----------------------------- SPLIT / SCRAMBLE -------------------- */
function split(el) {
  if (el.dataset.splitDone) return [...el.querySelectorAll(".char")];
  el.dataset.splitDone = "1";
  const text = el.textContent; el.textContent = "";
  const chars = [];
  [...text].forEach((ch) => { const s = document.createElement("span"); s.className = "char"; s.style.display = "inline-block"; s.textContent = ch === " " ? " " : ch; el.appendChild(s); chars.push(s); });
  return chars;
}
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function scramble(el, opts = {}) {
  if (reduce) return;
  const final = el.dataset.text || el.textContent;
  el.dataset.text = final;
  const dur = opts.dur || 650;
  let start = null;
  const step = (ts) => {
    if (!start) start = ts;
    const p = Math.min(1, (ts - start) / dur);
    const rev = Math.floor(p * final.length);
    let out = "";
    for (let i = 0; i < final.length; i++) out += i < rev || final[i] === " " ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    el.textContent = out;
    if (p < 1) requestAnimationFrame(step); else el.textContent = final;
  };
  requestAnimationFrame(step);
}

/* ----------------------------- REVEAL ----------------------------- */
function reveal(scope = document) {
  // Dead-man n°0 : sans gsap (CDN coupé/lent), on NE lance rien et on retire
  // `fx` — tout est déjà peint en clair par le CSS. Avant, gsap.set() levait
  // une TypeError ICI, ce qui tuait la fin du boot de chaque page : le
  // count-up des « preuves du titre » ne s’exécutait jamais et les stats
  // restaient à 0 pour de bon. La lisibilité ne dépend d’aucune lib.
  if (reduce || !gsap) { document.documentElement.classList.remove("fx"); return; }
  scope.querySelectorAll(".reveal-mask").forEach((m) => {
    const kids = [...m.children];
    if (m.dataset.revBound || !kids.length) return; m.dataset.revBound = "1";
    gsap.set(kids, { yPercent: 110, opacity: 0 });
    gsap.to(kids, { yPercent: 0, opacity: 1, duration: 1, ease: "power4.out", stagger: 0.08, scrollTrigger: { trigger: m, start: "top 90%" } });
  });
  scope.querySelectorAll("[data-reveal]").forEach((el) => {
    if (el.dataset.revBound) return; el.dataset.revBound = "1";
    gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%" } });
  });
  scope.querySelectorAll("[data-reveal-group]").forEach((g) => {
    const kids = [...g.children];
    if (g.dataset.revBound || !kids.length) return; g.dataset.revBound = "1";
    gsap.set(kids, { opacity: 0, y: 32 });
    gsap.to(kids, { opacity: 1, y: 0, duration: 0.85, ease: "power3.out", stagger: 0.07, scrollTrigger: { trigger: g, start: "top 88%" } });
  });

  // Dead-man net (legibility law): if the ticker froze, force everything readable.
  if (!reveal._net && gsap) {
    reveal._net = true;
    const f0 = gsap.ticker.frame;
    setTimeout(() => {
      if (gsap.ticker.frame !== f0) return;
      document.documentElement.classList.remove("fx");
      document.querySelectorAll(".reveal-mask > span, [data-reveal], [data-reveal-group] > *").forEach((el) => {
        // transition coupée AVANT de repeindre : si le ticker est gelé, le
        // compositeur l’est aussi, et une transition d’opacité déclenchée ici
        // reste bloquée à sa valeur de départ — l’élément affiche opacity 1 en
        // inline mais calcule 0, donc reste invisible (constaté sur .wsheet).
        el.style.transition = "none";
        el.style.opacity = "1"; el.style.transform = "none";
      });
      // …and if the count-up never fired (ScrollTrigger present but the ticker froze),
      // paint the real numbers so the hero stats never stay stuck on "0".
      const nf = new Intl.NumberFormat("fr-FR");
      document.querySelectorAll("[data-count]").forEach((el) => {
        if (!el.hasAttribute("data-raw") && el.dataset.count && el.textContent.trim() === "0") {
          el.textContent = nf.format(+el.dataset.count);
        }
      });
    }, 3500);
  }
}

/* --------------------------- MEDIA HYDRATE ------------------------ */
function hydrateMedia(scope = document) {
  scope.querySelectorAll(".media[data-img]").forEach((el) => {
    if (el.dataset.mediaBound) return; el.dataset.mediaBound = "1";
    const img = new Image();
    img.src = el.dataset.img;
    // alt: prefer an explicit data-alt (real image described) over the mono pill label (data-label)
    img.alt = el.dataset.alt || el.dataset.label || ""; img.loading = el.hasAttribute("data-eager") ? "eager" : "lazy"; img.decoding = "async";
    if (el.hasAttribute("data-eager")) img.fetchPriority = "high"; // LCP (le préload du head porte déjà fetchpriority=high)
    // pictureEl n’enveloppe que les clichés dont l’AVIF est MESURÉ plus léger ;
    // partout ailleurs il rend le <img> tel quel, sans nœud en plus.
    el.prepend(pictureEl(img));
  });
}

/* --------------------- VELOCITY: ticker drift --------------------- */
let kineticsOn = false;
/* LE BANDEAU DÉFILANT PASSE EN CSS.
   Il tournait dans un gsap.ticker : une fonction rappelée À CHAQUE FRAME,
   indéfiniment, tant que la page était ouverte — y compris quand le
   bandeau était à dix écrans de là. Elle écrivait un style inline par
   piste et par frame. C'était, de loin, le coût permanent le plus lourd
   du site, pour une bande décorative.

   Une animation CSS fait exactement la même chose : le compositeur la
   joue sans repasser par le fil principal, le navigateur la met en pause
   tout seul quand l'onglet passe en arrière-plan, et
   `prefers-reduced-motion` la coupe sans une ligne de JavaScript.

   Ce qui est perdu : la vitesse ne réagit plus à celle du scroll. C'était
   joli sur le papier ; à l'usage, personne ne regarde un bandeau pendant
   qu'il fait défiler la page.

   La durée est proportionnelle à la LARGEUR du contenu — sinon une piste
   longue défile vite et une courte rampe. On la mesure une fois. */
function initKinetics() {
  if (kineticsOn) return; kineticsOn = true;
  for (const t of document.querySelectorAll(".marquee__track")) {
    /* le contenu est écrit deux fois : la boucle translate de -50 % et
       doit retomber sur une copie identique. */
    const demi = t.scrollWidth / 2;
    if (!demi) continue;
    const vitesse = parseFloat(t.dataset.speed || "0.6") * 60;   // px/seconde
    t.style.setProperty("--marquee-duree", (demi / vitesse).toFixed(1) + "s");
  }
}

/* Toutes les pages rendent leur contenu en JS APRÈS le boot de Lenis :
   Lenis garde donc une hauteur périmée (mesuré sur /la-salle/ : limite
   5 626 pour un document de 9 438). Conséquence, tout scrollTo au-delà de
   l’ancienne limite se faisait écrêter et s’arrêtait en chemin. On
   remesure Lenis en même temps que ScrollTrigger — chaque page appelle
   déjà BC.refresh() au load et à +500 ms. */
/* ------------------------- UN SEUL NUMÉRO ------------------------- *
 * Plusieurs pages portent le téléphone EN DUR dans leur markup (héros,
 * gong final, cartes tarifs). Tant que le numéro ne bougeait pas, c’était
 * invisible. Depuis que le vestiaire peut le changer, ça ne l’est plus :
 * mesuré après une modification, la fiche affichait « 05 62 24 46 99 »
 * pendant que deux boutons composaient encore tel:+33562244682. Un bouton
 * d’appel qui compose l’ancien numéro est pire qu’un bouton mort.
 * On réaligne donc TOUS les liens tel: et leurs libellés sur SALLE — en un
 * seul endroit, rejoué à chaque refresh (donc après les rendus tardifs). */
function syncPhone(scope = document) {
  const href = `tel:${SALLE.phoneHref}`;
  scope.querySelectorAll('a[href^="tel:"]').forEach((a) => {
    if (a.getAttribute("href") !== href) a.setAttribute("href", href);
    // le libellé n’est réécrit QUE s’il est lui-même un numéro : on ne touche
    // pas à « Savoir qui encadre · … » ni à aucune phrase.
    const cible = a.querySelector("span") || a;
    if (/^[\d\s.+-]{10,}$/.test(cible.textContent.trim()) && cible.textContent.trim() !== SALLE.phone) {
      cible.textContent = SALLE.phone;
    }
  });
}

const refresh = () => { lenis?.resize(); ScrollTrigger?.refresh(); syncPhone(); };

/* Le rattrapage ci-dessus dépendait d’un CALENDRIER : syncPhone tournait au
 * boot, au load et à +500 ms, et chaque page rend son contenu en JS quelque
 * part là-dedans. Mesuré sur /tarifs/ après un changement de numéro au
 * vestiaire : un bouton d’appel bien visible affichait encore « 05 62 24 46 82 »
 * et le composait, parce que tarifs.js l’avait posé APRÈS le dernier passage.
 * Un BC.refresh() à la main le corrigeait — donc ce n’était pas la logique, mais
 * l’instant. On ne parie plus sur l’horloge : tout lien tel: ajouté au document,
 * quand que ce soit, est réaligné à la frame suivante. */
function watchPhone() {
  if (!("MutationObserver" in window)) return;
  let prevu = false;
  new MutationObserver((lots) => {
    if (prevu) return;
    if (!lots.some((l) => [...l.addedNodes].some((n) => n.nodeType === 1))) return;
    prevu = true;
    // surtout PAS requestAnimationFrame : mesuré, l’onglet en arrière-plan ne
    // rend plus de frame, la relance restait en attente et le drapeau bloquait
    // l’observateur pour de bon. setTimeout tourne, lui, onglet caché compris.
    setTimeout(() => { prevu = false; syncPhone(); }, 0);
  }).observe(document.body, { childList: true, subtree: true });
}

/* ------------------------- SCROLL TO ELEMENT ---------------------- *
 * Lenis pilote le scroll via son propre rAF : un scrollIntoView natif en
 * "smooth" se fait écraser à chaque frame et s’arrête en chemin (mesuré :
 * 1 099 px parcourus pour une cible à 2 648). Tout saut d’ancre passe donc
 * par ICI — Lenis quand il est là, natif sinon, et instantané en
 * reduced-motion. `offset` compense les barres collantes (plan, index). */
function scrollToEl(target, { offset = 0, block = "center" } = {}) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  const y = () => Math.round(el.getBoundingClientRect().top + window.scrollY + offset);

  // Sans Lenis (ou en reduced-motion) : chemin natif, point.
  if (!lenis || reduce) {
    if (reduce) { window.scrollTo(0, y()); return; }
    if (offset) window.scrollTo({ top: y(), behavior: "smooth" });
    else el.scrollIntoView({ behavior: "smooth", block });
    return;
  }

  // Avec Lenis : on remesure (le contenu est rendu en JS après son boot),
  // puis on vise.
  lenis.resize();
  const from = window.scrollY;
  lenis.scrollTo(el, { offset, duration: 1.05 });

  // Dead-man net (loi n°3, appliquée au DÉPLACEMENT) : Lenis n’avance que
  // si le ticker gsap tourne. Ticker gelé = onglet en arrière-plan, rAF
  // suspendu, lib CDN à moitié chargée… et l’utilisateur clique un index
  // qui ne l’emmène nulle part. Si rien n’a bougé au bout de 260 ms, on
  // reprend la main en natif. Un index qui ne scrolle pas est un bouton
  // mort — ça ne peut jamais dépendre d’une lib.
  setTimeout(() => {
    if (Math.abs(window.scrollY - from) > 4) return; // Lenis a démarré, on le laisse finir
    const dest = y();
    if (Math.abs(window.scrollY - dest) < 8) return; // déjà à destination
    // SEC, pas "smooth" : si le ticker est gelé, l’animation de scroll natif
    // l’est en général aussi (mesuré : elle s’arrête à mi-course). Arriver
    // d’un coup est moche une demi-seconde ; ne pas arriver est cassé.
    window.scrollTo(0, dest);
  }, 260);
}

/* ------------------------- ANCRES INTERNES ------------------------ *
 * Tout lien #ancre passe par le même chemin de scroll que les index de
 * page. Sinon la home saute sec sur "Choisir ma discipline" pendant que
 * le plan de la visite glisse : deux gestes pour la même intention. */
function wireAnchors() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    scrollToEl(target, { offset: -90, block: "start" });
    history.replaceState(null, "", `#${id}`);
  });
}

/* --------------------------- SPOTLIGHT ---------------------------- *
 * THE concept made literal : a soft light that follows the cursor across a
 * hero, brightening whatever it passes. Reusable on every page header
 * (home hero + page heros). rAF-throttled; first contact positions it
 * synchronously so the light never glows at a stale default. */
/* LE SPOTLIGHT AU CURSEUR EST RETIRÉ — il appartenait à l'autre DA.
   Il venait du concept « la salle de nuit, la lumière comme objet » : une
   tache de lumière qui suivait la souris sur un fond presque noir. Le site
   est clair maintenant, et une tache claire sur du clair ne dit plus rien
   — elle ne fait que salir la photo qu'elle traverse.

   Il coûtait aussi un pointermove + un requestAnimationFrame par page, pour
   un effet que personne ne remarque et que le tactile ne voit jamais.

   La fonction reste exportée et vide : six pages appellent BC.spotlight(),
   elles continuent de fonctionner sans être touchées. Le `.hero__spot` et
   le `.phero__spot` restent dans le markup, inertes et invisibles. */
function spotlight() { /* volontairement vide — voir ci-dessus */ }

/* LE DÉVOILEMENT DES PHOTOS.
   Un observateur, une classe, et c'est le CSS qui joue (voir photos.css :
   le cadre s'ouvre pendant que l'image se pose). On n'observe qu'une fois
   par élément : une photo déjà dévoilée n'a plus rien à raconter, et la
   re-jouer au retour du scroll donnerait un site nerveux. */
function revealPhotos(scope = document) {
  const cibles = scope.querySelectorAll(".ph--reveal:not([data-vu]), .ph-band:not([data-vu])");
  if (!cibles.length) return;
  if (reduce || !("IntersectionObserver" in window)) {
    cibles.forEach((el) => { el.dataset.vu = "1"; el.classList.add("is-seen"); });
    return;
  }
  const io = new IntersectionObserver((entrees) => {
    for (const e of entrees) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("is-seen");
      io.unobserve(e.target);
    }
  }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
  cibles.forEach((el) => { el.dataset.vu = "1"; io.observe(el); });
}

/* --------------------------- TOUCH-LIFE --------------------------- *
 * De la vie sur TOUTE la page en mobile (hover:none), pas que le héros : les
 * cartes se soulèvent / s’allument quand elles traversent le cadre. Pur IO →
 * insensible au ticker gsap gelé. Chaque page l’appelle APRÈS son rendu.
 * (Le curseur-spotlight se désactive en hover:none — ceci le remplace.) */
/* .station (visite) + .gitem (galerie) s’animent déjà via leur propre IO sur
   tous les appareils → hors liste pour ne pas doubler l’observateur. */
const TOUCH_LIFE_SEL = ".promo, .sister, .codecard, .level, .pnote, .rostercard, .coachcard, .tarif, .review, .slot, .act, .coords li, .cfg, .route, .week, .pulse, .etape, .peur__item, .jamais__item, .suite__item";
function touchLife(scope = document) {
  if (!window.matchMedia("(hover: none)").matches || !("IntersectionObserver" in window)) return;
  const els = scope.querySelectorAll(TOUCH_LIFE_SEL);
  if (!els.length) return;
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => e.target.classList.toggle("is-inview", e.isIntersecting && e.intersectionRatio >= 0.5)),
    { threshold: [0, 0.5, 1] }
  );
  els.forEach((el) => { if (!el.dataset.tlBound) { el.dataset.tlBound = "1"; io.observe(el); } });
}

/* -------------------------- L’ASSISTANT (paresseux) ---------------- *
 * Le dialogue pèse ~21 Ko (chatbot.js + sa base locale) pour un visiteur sur
 * dix qui l’ouvre : il ne part donc PLUS au premier rendu. La pastille reste
 * le lien tel: du HTML ; on l’arme ici, et le module n’est téléchargé qu’au
 * moment où le visiteur montre son intention.
 *
 * Trois étages, du plus tôt au plus tard — aucun ne dégrade le précédent :
 *   1. survol / focus / doigt posé  -> on précharge (le clic paraît instantané) ;
 *   2. clic                          -> on attend le module puis on ouvre ;
 *   3. module injoignable            -> on suit le href, la salle sonne.
 * Sans JS du tout, l’étage 3 est le comportement natif du lien. */
function armChatbot() {
  const pill = document.querySelector("a.chatbot");
  if (!pill) return;
  let load = null;
  const warm = () => (load ||= import("./chatbot.js?v=24"));
  ["pointerenter", "focus", "touchstart"].forEach((ev) =>
    pill.addEventListener(ev, warm, { once: true, passive: true })
  );
  pill.addEventListener("click", async (e) => {
    // clic milieu / modificateur : on laisse le navigateur faire son travail
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    pill.dataset.loading = "1"; // la pastille respire tant que le module descend
    try {
      await warm();
      // le module a remplacé la pastille par son lanceur et publié __scchat
      window.__scchat?.open();
    } catch {
      window.location.href = pill.href; // filet dead-man : la salle décroche
    } finally {
      delete pill.dataset.loading;
    }
  });
}

/* ================================================================
   L'ASSISTANT SE PRESENTE TOUT SEUL — une fois, au bon moment.

   Une pastille muette dans un coin ne se remarque pas : personne ne
   clique sur ce qu'il n'a pas compris. Le bot se presente donc de
   lui-meme, mais seulement quand le visiteur a montre qu'il lisait
   (il a fait defiler). Jamais a l'arrivee : s'ouvrir sur le nez de
   quelqu'un qui vient d'atterrir, c'est le geste qui fait fermer
   l'onglet.

   POURQUOI UN CLIC SIMULE plutot qu'un appel de fonction : le module
   du bot ne descend qu'a l'intention de parler, et chaque salle a sa
   propre mecanique de chargement. Cliquer la pastille, c'est le chemin
   qu'emprunte un vrai visiteur — il marche partout, sans rien savoir
   de ce qu'il y a derriere.

   Trois garde-fous : une seule fois par session ; jamais si le panneau
   est deja la ; jamais sur /seance-offerte/, page de conversion ou le
   formulaire ne doit rien avoir devant lui.

   Sur telephone, le panneau couvre l'ecran : on y pose une BULLE avec
   la premiere phrase et un bouton. Le message est vu, la page reste au
   visiteur.
   ================================================================ */
function presentationAssistant() {
  const CLE = "bcs-chat-auto", SEUIL_PX = 900, SEUIL_PART = 0.28;
  const pastille = document.querySelector("a.chatbot, .chatbot");
  if (!pastille) return;
  try { if (sessionStorage.getItem(CLE)) return; } catch (e) { /* stockage indispo */ }
  if (location.pathname.indexOf("/seance-offerte") === 0) return;

  let fait = false, bulle = null;
  const dejaLa = () => !!document.querySelector('[class*="chat__panel"], [class*="chat-panel"], #bcr-panel, #scchat-panel');
  const congedier = () => { if (bulle) { bulle.remove(); bulle = null; } };
  const ouvrir = () => pastille.click();

  function poserBulle(texte) {
    if (bulle) return;
    bulle = document.createElement("div");
    bulle.className = "bc-amorce";
    bulle.setAttribute("role", "status");
    bulle.innerHTML =
      '<button type="button" class="bc-amorce__fermer" aria-label="Masquer le message de l’assistant">×</button>' +
      '<p class="bc-amorce__texte">' + texte + "</p>" +
      '<span class="bc-amorce__cta">Discuter →</span>';
    bulle.addEventListener("click", (e) => {
      const ferme = e.target.closest(".bc-amorce__fermer");
      congedier();
      if (!ferme) ouvrir();
    });
    document.body.appendChild(bulle);
  }

  function regarder() {
    if (fait || dejaLa()) return;
    const h = document.documentElement;
    const y = window.scrollY || h.scrollTop || 0;
    const total = Math.max(1, h.scrollHeight - h.clientHeight);
    if (y < SEUIL_PX && y / total < SEUIL_PART) return;
    fait = true;
    try { sessionStorage.setItem(CLE, "1"); } catch (e) { /* stockage indispo */ }
    setTimeout(() => {
      if (dejaLa()) return;
      if (window.matchMedia("(max-width: 480px)").matches) poserBulle("Une question sur les offres, les créneaux ou la salle ? Je réponds tout de suite.");
      else ouvrir();
    }, 650);
  }

  /* On LIT la position, on n'attend pas qu'on nous la signale : aucun
     evenement `scroll` n'est emis sur ce site (Lenis les absorbe — mesure
     faite au navigateur). Un intervalle plutot que requestAnimationFrame,
     parce que rAF est gele des que la page ne compose plus d'images
     (onglet d'arriere-plan) : la presentation ne partirait jamais pour
     quelqu'un qui ouvre le site dans un onglet et y revient. 300 ms coute
     cent fois moins qu'une image. On s'arrete pour de bon au premier
     declenchement, et on abandonne au bout de deux minutes. */
  const minuteur = setInterval(() => {
    regarder();
    if (fait) clearInterval(minuteur);
  }, 300);
  setTimeout(() => clearInterval(minuteur), 120000);
  regarder();   // page deja defilee (retour arriere, ancre) : on tranche tout de suite
}

/* ------------------------------ BOOT ------------------------------ */
window.BC = { reveal, revealPhotos, magnetic, refresh, syncPhone, media: hydrateMedia, split, scramble, spotlight, touchLife, initKinetics, scrollToEl, get lenis() { return lenis; }, get velocity() { return velocity; } };
mountNav();
mountFooter();
initSmooth();
hydrateMedia(document);
magnetic(document);
wireAnchors();
/* Le cadran des offres — APRÈS mountFooter() : le flottant observe
   #footer pour s’effacer en bas de page, et il faut donc que le pied
   existe. Le module rappelle reveal() lui-même sur ce qu’il pose. */
mountRoulette();
/* Le dévoilement des photos — APRÈS mountRoulette() : les cadrans posent
   eux aussi du markup, et l'observateur ne passe qu'une fois. Les pages
   qui injectent des images plus tard rappellent BC.revealPhotos(). */
revealPhotos();
syncPhone();
watchPhone();
armChatbot();

/* « Plus que N places » : le nombre vient des ventes reelles de la
   boutique. Sans reponse, aucun compteur ne s'affiche — voir places.js. */
void initPlaces();
presentationAssistant();

export const BC = window.BC;
