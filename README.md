# Boxing Center Saint-Cyprien

Site vitrine de la salle Boxing Center Saint-Cyprien (11 rue Sainte-Lucie, 31300 Toulouse — rive gauche), construit avec [Astro](https://astro.build). Les pages reprennent la maquette validée : HTML, CSS et JavaScript sont servis tels quels.

## Commandes

```bash
npm install      # installer les dépendances
npm run dev      # serveur de développement (http://localhost:4321)
npm run build    # pré-build du contenu + build de production dans dist/
npm run preview  # prévisualiser le build
```

Pour vérifier le site **avec les fonctions serverless** (assistant, capture de contacts, backoffice) sans déployer :

```bash
npm run build
ADMIN_TOKEN="un-mot-de-passe" node scripts/serve-with-api.mjs 6901 .
```

Ce serveur sert `dist/` et exécute les **vrais** handlers de `api/` — il n'ajoute que la fine couche que Vercel fournit en production (`req.body` parsé, `res.status().json()`).

## Structure

- `src/pages/` — les pages (accueil, la salle, activités, coachs, galerie, planning, tarifs, contact, 404)
- `public/assets/` — CSS, JavaScript et images
- `public/assets/js/data.js` — **la source de vérité du contenu** (adresse, disciplines, planning, coachs, offres)
- `public/admin/` — le backoffice « Le vestiaire » (hors routage Astro)
- `api/` — les fonctions serverless Vercel
- `scripts/apply-content.mjs` — pré-build : injecte le contenu publié au vestiaire dans le site

---

## L'assistant (chatbot)

La pastille en bas à droite est un vrai dialogue. Elle reste un lien `tel:` dans le HTML ; le module `public/assets/js/chatbot.js` la **remplace** par un bouton qui ouvre le panneau. Script bloqué ⇒ la pastille appelle la salle : rien ne régresse.

**Ce qu'il fait**

1. Il se présente et demande le prénom.
2. Il répond via `POST /api/chat` — prompt système **ancré** sur les faits réels de la salle (`api/_lib/salle.js`), avec consigne explicite de ne jamais inventer un prix, un horaire ou un nom de coach.
3. Il capte **au fil de la conversation** le prénom (« je m'appelle X », « moi c'est X », ou un mot simple juste après avoir demandé le prénom), l'e-mail et le téléphone français.
4. Dès qu'il a un moyen de rappel, il envoie le contact à `POST /api/lead`. Une signature anti-doublon empêche d'envoyer deux fois le même état.
5. Une seule relance douce, après deux échanges sans coordonnées. Puis plus rien.

**Sans clé IA, avec une clé expirée ou pendant une panne fournisseur**, `/api/chat` répond désormais lui-même en HTTP 200 depuis une base locale ancrée sur les faits du club. Le widget conserve aussi son propre repli (`chatbot-kb.js`) : deux étages de sécurité, jamais une bulle vide.

`npm run check:chat-providers` contrôle les clés configurées sans en afficher la valeur. Le diagnostic ne sort que `OK`, `AUTH_ERROR`, `QUOTA`, `UPSTREAM`, `TIMEOUT` ou `NETWORK_ERROR`. `npm run test:chat` vérifie le contrat HTTP, le repli après une erreur 401 et l’absence de secret dans les réponses et les logs.

**Accessibilité** : `role="dialog"` + `aria-modal`, focus piégé, Échap ferme et rend le focus à la pastille, `aria-live="polite"` sur le fil, `prefers-reduced-motion` respecté.

## Où vont les contacts ?

`api/lead.js` a trois voies, toutes optionnelles et cumulables. **Aucune configurée ⇒ la fonction répond quand même 200 et journalise le contact** : le parcours visiteur ne casse jamais.

| Voie | Variables d'environnement | Effet |
|---|---|---|
| **Carnet** (recommandé) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Les contacts sont stockés et **relus dans le vestiaire** (section « Les contacts »). Upstash a un palier gratuit et s'appelle en REST — aucune dépendance npm. |
| **E-mail** | `RESEND_API_KEY`, `LEAD_EMAIL_TO` (défaut `boxingcenter31@gmail.com`), `LEAD_EMAIL_FROM` | Une notification par contact. |
| **Webhook** | `LEAD_WEBHOOK_URL` | POST JSON brut (Zapier, Make, CRM…). |

## La galerie participative — « Le mur du club »

Sur `/galerie/`, le mur du haut est celui du club (nos photos, inchangé). Dessous, **Le mur du club** : les membres y déposent leurs photos et leurs vidéos. **Rien ne se publie tout seul.**

### Le trajet d'un dépôt

1. Le visiteur donne **son prénom** et **un e-mail *ou* un téléphone** — c'est obligatoire, et c'est aussi la capture de lead.
2. Le navigateur vérifie sur place : type réel du fichier (une image doit se *décoder*, pas seulement s'appeler `.jpg`), poids, et **durée ≤ 15 s** lue dans les métadonnées de la vidéo.
3. `POST /api/community/sign` **rejoue toutes ces règles côté serveur** puis renvoie une signature Cloudinary. Le dossier, le tag `pending` et la coupe `du_15` sont **dans la signature** : les retirer côté navigateur casse la signature et Cloudinary refuse l'envoi.
4. Le fichier part **directement chez Cloudinary** — il ne traverse jamais Vercel (les fonctions plafonnent à 4,5 Mo, une vidéo de club en fait dix fois plus).
5. Les coordonnées rejoignent **le carnet existant** via `POST /api/lead` avec `event="upload_contributor"`. Pas un second système : le même que l'assistant, relu au même endroit dans le vestiaire.
6. Le média attend en `pending`. **Seul le staff le publie.**

### Le stockage

Le même que le site de Portet : **Cloudinary**, qui sert à la fois de stockage, de transcodage (`q_auto` / `f_auto`), de base de données (les tags `pending` / `approved`) et d'outil de modération. Une seule variable à copier depuis le tableau de bord Cloudinary :

| Variable | Rôle | Défaut |
|---|---|---|
| `CLOUDINARY_URL` | `cloudinary://clé:secret@cloud` — **la seule obligatoire** | — |
| `COMMUNITY_FOLDER` | le dossier de **cette** salle : une salle, un dossier, jamais de mélange | `bc-st-cyprien-community` |
| `COMMUNITY_MAX_IMAGE_MO` | poids max d'une photo | `12` |
| `COMMUNITY_MAX_VIDEO_MO` | poids max d'une vidéo | `80` |
| `COMMUNITY_MAX_DUREE_SEC` | durée max d'une vidéo, **scellée dans la signature** | `15` |
| `COMMUNITY_RATE_WINDOW_MIN` / `COMMUNITY_RATE_MAX` | le garde-fou anti-spam, par IP | `15` min / `4` envois |

### Sans clé — ce qui se passe vraiment

| Ce qui manque | Ce que ça change |
|---|---|
| `CLOUDINARY_URL` | La section reste visible et annonce honnêtement que le mur ouvre bientôt. Le formulaire refuse poliment. **Rien ne casse, aucune page blanche.** |
| Le pool `GEMINI_API_KEY*` | Le pré-tri automatique des images s'éteint. **Tout part en file de modération humaine** — et le vestiaire le dit en clair. Moins d'aide, jamais moins de sécurité : rien n'était publiable sans clic humain de toute façon. |

Le coup d'œil automatique **ne supprime jamais rien** : il pose un avertissement sur la vignette (« ce cliché n'a probablement rien à voir avec la salle »). C'est un indice pour le staff, pas une sentence — on ne détruit pas le souvenir de quelqu'un sur l'avis d'une machine.

### Comment le staff modère

Dans le vestiaire (`/admin/`), section **« La galerie du club »** — le menu porte un compteur de ce qui attend.

- **Publier** → le média passe `approved` et rejoint le mur public.
- **Refuser** → le fichier est **supprimé définitivement** chez Cloudinary. Une confirmation est demandée : on ne détruit pas sur un clic distrait.

Chaque vignette affiche le prénom, la légende, le format, la durée, et **le moyen de rappel du déposant** (cliquable) — c'est ce qu'on lui a promis : le prévenir quand sa photo passe. Ce contact ne sort du serveur **que** par `/api/community/pending`, qui exige le mot de passe staff ; le mur public, lui, n'affiche qu'un prénom.

### Ce que ça coûte au premier rendu : rien

`community.js`, `community-form.js` et `community.css` **ne descendent pas** avec la page. Le mur et sa feuille de style se chargent quand la section approche du cadre ; le formulaire, seulement au clic sur « Déposer ». Un visiteur qui vient regarder les photos ne télécharge rien de tout ça. Côté mur, les vignettes sont en `loading="lazy"` et les vidéos en `preload="none"`.

## Le backoffice « Le vestiaire » — `/admin/`

Protégé par `ADMIN_TOKEN` **côté serveur uniquement** : le mot de passe voyage dans l'en-tête `x-admin-token` et n'est gardé que le temps de l'onglet. Aucun secret dans le front.

Le staff y règle les coordonnées, les tarifs, les coachs et le planning, et consulte les contacts. Une visite guidée se lance au premier login, et six assistants pas à pas couvrent les tâches courantes.

**Comment le contenu arrive sur le site** — sans jamais ralentir le rendu :

1. « Publier » envoie le contenu à `POST /api/admin/content`, qui **commit `public/content.json`** sur GitHub.
2. Le hook de déploiement relance Vercel.
3. Au build, `scripts/apply-content.mjs` transforme ce JSON en module ES statique (`content-overrides.js`).
4. `data.js` le fusionne à la fin de son évaluation. Coût à l'exécution : **nul** — pas de `fetch` au démarrage, donc pas un millième de seconde de retard au premier rendu.

Deux champs sont **recalculés** si le staff les oublie : l'adresse complète et le lien `tel:`. Un numéro affiché qui ne correspond pas au numéro composé est un piège — `site.js` réaligne d'ailleurs *tous* les liens `tel:` de la page sur `SALLE`.

### Variables d'environnement (Vercel)

| Variable | Rôle | Sans elle |
|---|---|---|
| `ADMIN_TOKEN` | mot de passe du vestiaire | le backoffice refuse tout le monde |
| `GITHUB_TOKEN`, `GITHUB_REPO` | écriture de `public/content.json` | on peut tout préparer, pas publier (le vestiaire le dit en clair) |
| `GITHUB_BRANCH` | branche cible (défaut `main`) | — |
| `VERCEL_DEPLOY_HOOK` | relance le déploiement après publication | la publication attend le prochain déploiement |
| `GEMINI_API_KEY*`, `GROQ_API_KEY`, `MISTRAL_API_KEY` | les fournisseurs IA, essayés dans cet ordre | l'assistant répond depuis sa base locale |
| `UPSTASH_REDIS_REST_*` | le carnet de contacts | les contacts partent par e-mail / webhook, ou sont journalisés |
| `RESEND_API_KEY`, `LEAD_EMAIL_TO` | notification par e-mail | — |
| `LEAD_WEBHOOK_URL` | relais vers un CRM | — |
| `CLOUDINARY_URL` | le stockage du mur du club | la section annonce honnêtement que le mur ouvre bientôt |
| `COMMUNITY_FOLDER` | le dossier de cette salle | `bc-st-cyprien-community` |

Plusieurs clés Gemini sont acceptées (`GEMINI_API_KEY`, `GEMINI_API_KEY_2`, …) : elles sont mélangées à chaque appel et les clés mortes sont sautées.

## Maillage de marque (SEO)

Les liens vers le réseau propriétaire sont **volontairement en `follow`** (`target="_blank" rel="noopener"`, sans `nofollow`) : c'est du jus de marque qu'on donne exprès.

- **Nav** (≥1180px) et **menu** : le groupe + la boutique.
- **Pied de page**, sur les 8 pages : colonne « Le réseau », colonne « Suivre », et la ligne des quatre salles sœurs rendue depuis `NETWORK`.
- **JSON-LD** : `subOrganization` (les quatre sœurs) sur l'`Organization`, `isPartOf` + `parentOrganization` sur la salle. Les `@id` existants n'ont pas bougé.

## Déploiement

Importer le repo dans Vercel — Astro est détecté automatiquement, et le dossier `api/` est servi comme fonctions serverless à côté du build statique.

`vercel.json` porte les en-têtes de sécurité (HSTS, CSP, X-Frame-Options…), le `Cache-Control` par type d'asset (polices immuables un an, images 30 jours avec `stale-while-revalidate`, CSS/JS une semaine) et le `X-Robots-Tag: noindex` sur `/admin/` et `/api/`.

---

## Mise en ligne (Vercel)

1. **Importer** — Vercel → *Add New Project* → importe `Bc-st-cyprien`. Le framework (Astro) est détecté tout seul : rien à configurer.
2. **Variables d'environnement** — copie celles de [`.env.example`](.env.example) dans *Settings → Environment Variables*. Toutes sont facultatives : sans elles le site tourne, en mode dégradé honnête (l'assistant répond depuis sa base locale, les contacts partent dans les logs, le vestiaire explique ce qui lui manque au lieu de casser).
3. **Domaine** — branche `st-cyprien.boxingcenter.fr` dans *Settings → Domains*.
4. **Vérifier les en-têtes** — une fois en ligne : `curl -I https://club-boxe-toulouse.com` doit montrer `strict-transport-security`, `x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy` et `content-security-policy`. Ils ne s'activent que sur Vercel, jamais en local.

### La boutique
Les liens boutique pointent vers **`https://boutique.boxingcenter.fr/`** (la nouvelle boutique Box-Plus).
Le jour où le domaine payant est en place, il n'y a qu'UN endroit à changer : `LINKS.boutique`
dans `public/assets/js/data.js` — tout le site, le maillage et le JSON-LD suivent.

### Sécurité
`.env` est ignoré par git ; aucun secret n'est présent dans le dépôt (vérifié). Les clés vivent
uniquement dans les variables d'environnement Vercel, jamais dans le front : l'admin s'authentifie
côté serverless, en comparaison à temps constant.
