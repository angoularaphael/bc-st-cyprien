/* =====================================================================
   SAINT-CYPRIEN · LE CADRAN DES OFFRES — la roulette promo.
   ---------------------------------------------------------------------
   PRINCIPE. Une roulette qui n’a qu’une case n’est pas une roulette,
   c’est une affiche. Celle-ci tourne entre TOUTES les offres du cadran
   (voir ROULETTE dans data.js) et, à chaque arrêt, tout suit la case
   gagnante : le prix au centre, le nom, le détail — et SURTOUT la
   destination du lien. Un visiteur qui clique pendant que « la saison »
   est affichée doit arriver sur la saison, jamais sur la rentrée.

   DEUX FORMES, UN SEUL CODE :
   · flottante  — pastille fixe, rappel permanent sur toute la page ;
   · intégrée   — posée dans le flux sur `[data-roulette]`, là où la page
                  vient de donner une raison et où le prix devient la
                  question suivante.

   CE QUE ÇA NE COÛTE PAS. Le cadran s’arrête dès qu’il sort de l’écran
   ou que l’onglet passe en arrière-plan : une animation que personne ne
   regarde ne doit pas faire tourner un GPU. Et en `prefers-reduced-motion`
   il n’y a plus de tour du tout — l’offre est échangée, point.
   ===================================================================== */
import { ROULETTE } from "./data.js?v=30";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Le contenu vient du vestiaire : il traverse content.json avant
   d’arriver ici. On l’échappe — une apostrophe mal placée ne doit pas
   pouvoir écrire du HTML dans la page. */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Les offres réellement affichables : un prix et un nom, sinon la case
   est vide et une case vide sur une roulette, ça se voit. */
function offers() {
  return (Array.isArray(ROULETTE) ? ROULETTE : [])
    .filter((o) => o && o.price && o.name)
    .map((o) => ({
      price: String(o.price),
      name: String(o.name),
      detail: String(o.detail || ""),
      was: o.was ? String(o.was) : "",
      cut: o.cut ? String(o.cut) : "",
      href: String(o.href || "#"),
      cta: String(o.cta || "Voir l’offre"),
    }));
}

/* LE RUBAN. Il porte les faits de TOUTES les offres : même arrêté sur
   l’une, le cadran dit qu’il en existe d’autres. Une remise n’y est
   écrite que si elle est réelle (`was`) — jamais un faux prix barré. */
function tickerHTML(list) {
  const strip = list.flatMap((o) => {
    const items = [{ t: o.price, d: o.name.replace(/^L[’']/, "").replace(/^La /, "") }];
    items.push(o.was
      ? { t: o.cut || "Promo", d: `au lieu de ${o.was}` }
      : { t: "·", d: o.detail || "toutes disciplines" });
    return items;
  });
  /* la piste est écrite DEUX FOIS : la boucle du marquee translate de
     -50%, elle doit donc retomber sur une copie identique. */
  const once = strip.map((s) => `<span><b>${esc(s.t)}</b>${esc(s.d)}</span>`).join("");
  return `<span class="rdial__ticker-track" aria-hidden="true">${once}${once}</span>`;
}

function build(list, inline) {
  const el = document.createElement(inline ? "div" : "aside");
  el.className = "rdial" + (inline ? " rdial--inline" : "");
  /* Le flottant est un <aside> : il a un rôle implicite, donc un nom
     accessible sert à quelque chose. Sur la forme intégrée (<div>), un
     aria-label serait purement décoratif — les lecteurs d’écran
     l’ignorent sur un conteneur générique. Le lien s’y décrit seul. */
  if (!inline) el.setAttribute("aria-label", "Les offres du moment");
  const first = list[0];
  el.innerHTML = `
    <a class="rdial__link" href="${esc(first.href)}">
      <span class="rdial__flag">Offre à saisir</span>
      <span class="rdial__stage" aria-hidden="true">
        <span class="rdial__bezel"></span>
        <span class="rdial__ticks"></span>
        <span class="rdial__beam"></span>
        <span class="rdial__index"></span>
        <span class="rdial__core"><b class="rdial__price">${esc(first.price)}</b></span>
      </span>
      <span class="rdial__copy">
        <!-- Le prix est peint dans le cadran, qui est aria-hidden (c’est
             de la chromerie décorative). Sans ce doublon, le nom
             accessible du lien annoncerait l’offre SANS son prix — le
             seul chiffre qui compte. .sr-only vient de base.css. -->
        <span class="sr-only rdial__sr">${esc(first.price)}</span>
        <b class="rdial__name">${esc(first.name)}</b>
        <span class="rdial__detail">${esc(first.detail)}</span>
        <span class="rdial__go">${esc(first.cta)} <i aria-hidden="true">→</i></span>
      </span>
      <span class="rdial__ticker">${tickerHTML(list)}</span>
    </a>`;
  return el;
}

/* Fait tourner le cadran et RECÂBLE le lien à chaque arrêt. */
function arm(el, list) {
  const link = el.querySelector(".rdial__link");
  const price = el.querySelector(".rdial__price");
  const priceSr = el.querySelector(".rdial__sr");
  const name = el.querySelector(".rdial__name");
  const detail = el.querySelector(".rdial__detail");
  const go = el.querySelector(".rdial__go");
  let i = 0, timer = null, visible = true;

  const land = (n) => {
    const o = list[n];
    price.textContent = o.price;
    priceSr.textContent = o.price;
    name.textContent = o.name;
    detail.textContent = o.detail;
    go.firstChild.nodeValue = o.cta + " ";
    link.setAttribute("href", o.href);
    el.dataset.offer = String(n);
  };

  const tour = () => {
    i = (i + 1) % list.length;
    if (reduce) { land(i); return; }        /* pas de tour : on échange, point */
    el.classList.add("is-spinning");
    /* La case change AU MILIEU du tour — quand la couronne va trop vite
       pour qu’on lise l’ancienne valeur. Changer avant ou après, c’est
       montrer la bascule au lieu de la faire. */
    setTimeout(() => land(i), 520);
    setTimeout(() => el.classList.remove("is-spinning"), 1150);
  };

  /* `!document.hidden` en plus de `visible` : l’observateur peut très bien
     signaler « à l’écran » alors que l’onglet est en arrière-plan (retour
     sur un onglet resté ouvert). Sans cette garde, le cadran tournerait
     pour personne. */
  const start = () => {
    if (!timer && visible && !document.hidden && list.length > 1) timer = setInterval(tour, 5200);
  };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

  land(0);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      visible ? start() : stop();
    }, { threshold: 0.25 }).observe(el);
  } else start();
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
}

export function mountRoulette() {
  const list = offers();
  if (!list.length) return;

  /* 1. LES CADRANS INTÉGRÉS — un par ancre `[data-roulette]`. */
  const ancres = document.querySelectorAll("[data-roulette]:not([data-roulette-mounted])");
  ancres.forEach((a) => {
    a.setAttribute("data-roulette-mounted", "1");
    const el = build(list, true);
    el.setAttribute("data-reveal", "");     /* même apparition que le reste du site */
    a.appendChild(el);
    arm(el, list);
    window.BC?.reveal?.(a);
  });

  /* 2. LE CADRAN FLOTTANT — le rappel permanent. Il s’efface quand un
        cadran intégré est à l’écran : deux fois la même offre au même
        moment, c’est une de trop. Il s’efface aussi sur le héros (on ne
        coupe pas une première impression) et sur le pied de page. */
  if (document.querySelector("aside.rdial")) return;
  const dial = build(list, false);
  document.body.appendChild(dial);
  arm(dial, list);

  /* `.hero` sur l’accueil, `.phero` sur les pages intérieures — les deux
     en-têtes du site ; `#footer` est monté par site.js (mountFooter). */
  const hero = document.querySelector(".hero, .phero");
  const foot = document.querySelector("#footer, .footer");
  let pastHero = !hero, atFoot = false, surInline = false;
  const sync = () => dial.classList.toggle("is-in", pastHero && !atFoot && !surInline);

  if ("IntersectionObserver" in window) {
    if (hero) new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); },
      { threshold: 0, rootMargin: "-48% 0px 0px 0px" }).observe(hero);
    if (foot) new IntersectionObserver(([e]) => { atFoot = e.isIntersecting; sync(); },
      { threshold: 0, rootMargin: "0px 0px -12% 0px" }).observe(foot);
    if (ancres.length) {
      const io = new IntersectionObserver((es) => {
        surInline = es.some((e) => e.isIntersecting);
        sync();
      }, { threshold: 0 });
      ancres.forEach((a) => io.observe(a));
    }
    sync();
  } else {
    pastHero = true; sync();
  }
}
