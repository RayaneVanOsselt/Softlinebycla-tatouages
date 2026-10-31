# SOFTLINEBY.CLA — direction artistique et architecture

## 1. Analyse des ressources fournies

| Ressource | Usage |
|---|---|
| `Logo Officiel .jpg` (624×621, monogramme SC + mot-symbole) | Détouré sans redessin. Versions encre et crème (fonds sombres), monogramme seul, favicon, image Open Graph. Animation d'introduction. |
| `Charte Graphique .JPG` | 5 couleurs exactes : Light Brown `#98755B`, Cream `#E2D1C2`, Dark Chocolate `#442913`, Sand `#D4BBAC`, Nut Brown `#5C3422`. |
| `Idée de logo .PNG` | Pistes non retenues comme logo officiel : non utilisé. |
| 25 photos (878–1170 × 1560) + 2 vidéos H.264 | Bandes noires retirées (sans toucher au tatouage), 1800 px max, servies en AVIF/WebP. Classées en 26 projets et 5 catégories **réellement présentes** : Floral & nature, Lettrage, Minimaliste, Illustration, Études & flash (peaux d'entraînement). |
| 4 maquettes d'inspiration + « Choose a time » + rufixbarber.com | Voir §2. |

Points d'attention :

- Certaines photos montrent des **prénoms et des dates** (Ohana, Prénoms entrelacés, Bouquet & prénom, Une date). Elles sont publiées mais pas mises en avant. À vous de confirmer l'accord des clients, ou de les masquer.
- Aucune typographie n'était fournie. Le mot-symbole du logo est une linéale humaniste fine (proche d'Avenir). D'où **Nunito Sans**, que vous pouvez remplacer si vous avez une police officielle.

## 2. Synthèse des références

- **Maquettes tatouage sombres** (T-art, Midnight Moon, Ethan Carter, Bowwe) : forte hiérarchie typographique, sections pleine largeur, galerie dense, processus numéroté. Repris : la **numérotation éditoriale**, les **titres très grands** et les sections sombres comme respiration. Écartés : les couleurs vives, l'esthétique « studio rock » et les cartes répétitives.
- **« Choose a time »** : étapes en haut, grand titre calligraphié, calendrier **mensuel** à gauche, créneaux du jour au centre (en-tête coloré, boutons ronds), **ticket dentelé** récapitulatif à droite et bouton « Suivant ». Reproduit dans les couleurs de la charte.
- **rufixbarber.com** : la demande n'est jamais une réservation ferme, la confirmation est manuelle par e-mail, et la légende *Disponible / En attente / Indisponible* est visible. Repris, avec une **vue mensuelle** au lieu de la vue hebdomadaire.
- **21st.dev / styles.refero.design** : bibliothèques de composants et de « DESIGN.md ». Elles ont servi de niveau d'exigence (micro-interactions, tokens documentés), sans copier de code.

## 3. Direction artistique : « La ligne douce »

Le site doit évoquer une **galerie d'artiste sur papier** plutôt qu'un studio de tatouage classique.

- **Papier ivoire** (celui du logo) + encre chocolat. Les sections chocolat servent de respiration (sélection, pied de page).
- **Le trait d'aiguille** du monogramme est la signature graphique : filets fins, ligne verticale du hero, soulignés animés, eyebrows précédés d'un trait.
- **L'arche** est le cadre récurrent des médias (hero, cartes, galerie). Elle renvoie aux courbes du monogramme.
- **Typographie** : *Cormorant Garamond* light et italique pour les titres (finesse du trait), *Nunito Sans* pour le texte.
- **Mouvement** : intro avec le logo officiel (trait qui se dessine, monogramme, rideau qui se lève), titres révélés par masque, manifeste qui se révèle mot à mot au défilement, sélection en défilement horizontal épinglé, boutons à remplissage montant. `prefers-reduced-motion` supprime tout mouvement non essentiel ; l'intro n'est jouée qu'une fois par session, sur l'accueil, et peut être passée.

### Design system (`src/app/globals.css`)

| Token | Valeur | Rôle |
|---|---|---|
| `--color-ivory` | `#FBF8F3` | fond (papier du logo) |
| `--color-chocolate` | `#442913` | texte principal, sections sombres |
| `--color-nut` | `#5C3422` | accent, boutons, sélection, erreurs (avec icône) |
| `--color-light-brown` | `#98755B` | ornements, grands chiffres (≥ 18 px uniquement : contraste 3,9:1) |
| `--color-cream` / `--color-sand` | `#E2D1C2` / `#D4BBAC` | surfaces, filets, texte sur fond sombre |
| `--font-display` / `--font-sans` | Cormorant Garamond / Nunito Sans | auto-hébergées (aucune requête vers Google) |
| `--text-display-xl…s` | `clamp()` fluides | échelle responsive |
| `--ease-soft`, `--ease-silk` | courbes | animations |

Composants : `.btn-primary/.btn-ghost`, `.link-line/.link-reveal`, `.field-*` (soulignés éditoriaux, erreurs avec icône + texte), `.card`, `.arch`, `.ticket` (bord dentelé), `.reveal/.reveal-mask`, `Stepper`, `MonthCalendar`, `SlotList`, `SummaryTicket`, `Lightbox`, `Gallery`, `Header` (menu mobile plein écran, focus piégé).
Contrastes vérifiés : chocolat sur ivoire > 13:1, nut sur ivoire ≈ 10:1, crème sur chocolat ≈ 9:1.

## 4. Architecture

```
Next.js 16 (App Router, TypeScript strict) — Vercel
├─ /[locale] (fr | nl | en, URL localisées : /fr/reservation, /nl/afspraak, /en/booking…)
│   pages ISR (5 min) + revalidation immédiate après modification dans l'admin
├─ /admin (privé, noindex, lien magique)
├─ /api (route handlers : disponibilités, demandes, contact, réponse client, cron, upload, export RGPD)
└─ src/lib
   ├─ booking/slots.ts      moteur de disponibilités (fonctions pures, testées)
   ├─ booking/service.ts    transactions, statuts, décisions, expiration
   ├─ jobs/                 file de tâches idempotente (e-mails, Google) + reprise
   ├─ email/                Nodemailer (Gmail SMTP), modèles HTML FR/NL/EN, .ics
   ├─ google/               JWT compte de service (crypto Node), Calendar v3, Sheets v4
   ├─ auth/                 lien magique, sessions hachées en base
   └─ db/                   Drizzle ORM + PostgreSQL (Neon) / PGlite en local et en tests
```

### Fiabilité des réservations

1. La **base PostgreSQL est la source de vérité.** Google Agenda et Google Sheets sont des copies synchronisées.
2. **Contrainte d'exclusion** `EXCLUDE USING gist (tstzrange(start_at, end_at) WITH &&) WHERE status IN (PENDING, RESCHEDULE_PROPOSED, CONFIRMED)` : Postgres rend physiquement impossibles deux réservations bloquantes qui se chevauchent, même avec des requêtes simultanées.
3. Chaque demande est créée dans **une seule transaction** : expiration des demandes échues, vérification des heures ouvertes, des périodes bloquées et de Google, insertion, historique, mise en file des e-mails et des synchronisations.
4. **File de tâches** (outbox) : réclamation atomique (`FOR UPDATE SKIP LOCKED`), délai exponentiel, clés de déduplication (un e-mail n'est jamais envoyé deux fois), statuts *Fait / En file / Échec / Non configuré*. Exécution juste après la réponse (`after()`), à chaque visite du tableau de bord, via la tâche Vercel quotidienne et à la demande.
5. **Google Agenda** : identifiant d'événement déterministe (`slc` + id de réservation), donc création idempotente. Statut *tentative/transparent* avant validation, *confirmed/opaque* après. Les événements créés par le site sont exclus du calcul des occupations.
6. **Google Sheets** : mise à jour par ID réservation (jamais de doublon), écriture `RAW` (aucune formule injectable), reconstruction complète possible.
7. **Fuseau Europe/Brussels** : toutes les heures sont stockées en UTC et converties avec `@date-fns/tz`. Les changements d'heure été/hiver sont testés.

### Statuts

```
PENDING ──accepter──▶ CONFIRMED ──▶ COMPLETED
   │  ├─refuser──▶ DECLINED            │
   │  ├─délai──▶ EXPIRED               ├─annuler──▶ CANCELLED
   │  └─proposer──▶ RESCHEDULE_PROPOSED ◀─proposer─┘
   │                 ├─client accepte──▶ CONFIRMED
   │                 ├─client refuse──▶ CANCELLED
   │                 └─délai──▶ EXPIRED
   └─annuler──▶ CANCELLED
```

Chaque transition est validée (`booking/status.ts`) et historisée dans `booking_events`.

### Modèle de données (`src/lib/db/schema.ts`)

`bookings`, `booking_events` (historique), `booking_attachments` (images de référence privées, en base), `availability_slots` (un enregistrement = une heure ouverte), `blocked_periods`, `projects`, `media`, `categories`, `contact_messages`, `jobs`, `settings` (contenus et paramètres administrables), `admin_login_tokens`, `admin_sessions`, `rate_limits`. Migrations versionnées dans `drizzle/`.

## 5. Sécurité et RGPD

- Secrets uniquement côté serveur. Aucune variable sensible n'est préfixée `NEXT_PUBLIC_`.
- Validation Zod côté serveur sur toutes les entrées, et HTML des e-mails échappé.
- CSRF : vérification de l'en-tête `Origin` sur les routes API ; protection native des Server Actions.
- Limitation de fréquence stockée en base (empreinte HMAC de l'IP), champ piège anti-robots et délai minimum de remplissage.
- En-têtes de sécurité : CSP stricte (aucun domaine tiers), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Images de référence : type vérifié par signature binaire, ré-encodées (suppression EXIF/GPS), 3 maximum, servies uniquement à l'admin connectée, supprimées automatiquement après le délai défini.
- Anonymisation automatique des anciennes demandes, export et effacement à la demande, contenu des e-mails purgé du journal après 30 jours.
- Cookies strictement nécessaires uniquement (langue et session admin) : pas de bannière de consentement.
- Les journaux masquent les adresses e-mail.

## 6. Tests

`npm test` lance 29 tests (Vitest, avec une vraie base Postgres embarquée) :

- moteur de créneaux : fermé par défaut, plage 11–20 h, dernier créneau terminant à 20 h, heures consécutives, délai de prévenance, été/hiver ;
- réservations : statut `PENDING`, file d'e-mails et de synchronisation, **concurrence** (3 demandes simultanées, 1 seule acceptée), contrainte d'exclusion, périodes bloquées ;
- décisions : confirmation avec `.ics` (jamais avant validation), refus qui libère le créneau, durée modifiée qui recalcule les conflits, proposition acceptée par le client, jeton invalide ;
- robustesse : expiration, panne SMTP avec reprise sans doublon, Google non configuré qui n'est jamais présenté comme « envoyé » ;
- e-mails : échappement HTML, langue du client, heure de Bruxelles ;
- contact : validation, `reply-to` vers le client, accusé de réception ;
- traductions : mêmes clés en FR, NL et EN.

Vérifié dans le navigateur (développement) : toutes les pages dans les 3 langues, hreflang, sitemap, intro, hero vidéo, sélection horizontale, galerie, filtres, visionneuse (clavier, focus), parcours complet de réservation (mensuel, durée 2 h, ticket, formulaire, succès), connexion admin, ouverture de 12 jours, acceptation avec durée allongée, affichage mobile 375 px.

**Non vérifié faute d'accès :** l'envoi réel par Gmail, la connexion réelle à Google Agenda et Sheets, et le déploiement Vercel/Neon. Ces trois points se testent en 2 clics après configuration (Admin, page Synchronisation).
