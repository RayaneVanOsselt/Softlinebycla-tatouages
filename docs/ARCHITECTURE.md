# SOFTLINEBY.CLA — direction artistique et architecture

## 1. Analyse des ressources fournies

| Ressource | Usage |
|---|---|
| `Logo Officiel .jpg` (624×621, monogramme SC + mot-symbole) | Détouré sans redessin. Versions encre et crème (fonds sombres), monogramme seul, favicon, image Open Graph. Animation d'introduction. |
| `Charte Graphique .JPG` | 5 couleurs exactes : Light Brown `#98755B`, Cream `#E2D1C2`, Dark Chocolate `#442913`, Sand `#D4BBAC`, Nut Brown `#5C3422`. |
| `Idée de logo .PNG` | Pistes non retenues comme logo officiel : non utilisé. |
| 25 photos (878–1170 × 1560) + 2 vidéos H.264 | Bandes noires retirées (sans toucher au tatouage), 1800 px max, servies en WebP. Classées en 26 projets et 5 catégories **réellement présentes** : Floral & nature, Lettrage, Minimaliste, Illustration, Études & flash (peaux d'entraînement). |
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
GitHub Pages — site 100 % statique (Next.js 16, output: "export", TypeScript strict)
├─ /[locale] (fr | nl | en : /fr/booking, /nl/portfolio, /en/contact…)
│   contenus lus au build depuis content/site.json et content/portfolio.json
├─ src/lib/api.ts        client du moteur (fetch en text/plain : requête « simple », sans pré-vérification CORS)
└─ .github/workflows/deploy.yml   tests + build + publication à chaque push sur main

Google Apps Script — apps-script/Code.gs, lié au Google Sheet (application Web, accès « Tout le monde »)
├─ doGet  : disponibilités d'un mois, lecture d'une proposition (jeton)
├─ doPost : demande de rendez-vous, message de contact, réponse du client à une proposition
├─ onEditDecision : décisions de l'artiste dans la colonne « ➜ Décision »
├─ hourlyMaintenance : expirations, fin automatique, purge RGPD, nouvel essai des e-mails, nouvelles journées
└─ services : SpreadsheetApp (données), CalendarApp (agenda), DriveApp (images privées), MailApp (e-mails), LockService, CacheService
```

Le moteur Apps Script ne dépend d'aucune bibliothèque : le même fichier est exécuté dans Node par les tests et par `npm run mock-api` (`tests/support/gas.ts`, doublures des services Google).

### Fiabilité des réservations

1. **Le Google Sheet est la source de vérité.** Google Agenda est une copie synchronisée.
2. **Verrou global** (`LockService`) : toute écriture (demande, décision, réponse client, expiration) relit l'état puis vérifie les conflits sous verrou. Deux demandes simultanées sur le même créneau ne peuvent donc jamais être enregistrées toutes les deux.
3. Chaque demande vérifie, dans l'ordre : expiration des demandes échues, heures ouvertes, indisponibilités, occupations Google Agenda, demandes et rendez-vous bloquants.
4. **E-mails** : chaque envoi est consigné dans l'onglet Journal ; un échec est réessayé par la maintenance horaire. Une panne Gmail ou Agenda ne fait jamais perdre la demande.
5. **Google Agenda** : événement gris (« ⏳ Demande ») à la réception, orange (confirmé) après acceptation, retiré en cas de refus, d'annulation ou d'expiration. Les événements créés par le moteur (étiquette `slcRef`) sont exclus du calcul des occupations.
6. **Fuseau Europe/Brussels** : les instants sont stockés en ISO UTC (colonnes techniques) et convertis avec `Utilities.formatDate`. Les changements d'heure été/hiver sont testés.

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

Chaque transition est validée (`canTransition`) et notée dans la colonne Historique.

### Modèle de données (onglets du Google Sheet)

`Réservations` (une ligne par demande ; colonnes de suivi, colonnes de décision, colonnes techniques masquées), `Disponibilités` (une ligne par jour, une case par heure), `Indisponibilités`, `Messages`, `Paramètres`, `Journal`. Identifiants techniques (feuille, agenda, dossier Drive, secret de hachage) dans les propriétés du script.

## 5. Sécurité et RGPD

- Aucun secret dans le dépôt ni dans le site : l'URL du moteur est publique par nature ; le secret de hachage reste dans les propriétés du script.
- Validation côté moteur de toutes les entrées, et HTML des e-mails échappé.
- Limitation de fréquence (`CacheService`, empreinte de l'adresse e-mail, une heure au maximum), champ piège anti-robots et délai minimum de remplissage.
- Jetons de proposition : seule leur empreinte SHA-256 (avec secret) est enregistrée ; un jeton est à usage unique et expire avec la proposition.
- Images de référence : 3 maximum, compressées dans le navigateur (suppression EXIF/GPS), type vérifié, rangées dans un dossier Google Drive privé, supprimées automatiquement après le délai défini.
- Anonymisation automatique des anciennes demandes et suppression des anciens messages.
- Aucun cookie : seuls la langue (`localStorage`) et l'intro déjà vue (`sessionStorage`) sont mémorisées, donc pas de bannière de consentement.
- L'API ne renvoie jamais de donnée client : les disponibilités ne contiennent que des états de créneaux.

## 6. Tests

`npm test` (Vitest) exécute le vrai `apps-script/Code.gs` avec des doublures des services Google :

- fuseau Europe/Brussels : heure d'hiver, d'été et jours de changement d'heure ;
- disponibilités : fermé par défaut, plage 11–20 h, heures consécutives, délai de prévenance, indisponibilités et Google Agenda, aucune donnée client exposée ;
- demandes : statut « En attente », blocage du créneau, deux e-mails sans confirmation, refus des chevauchements, validation et anti-robots, images privées, panne d'e-mail ou d'agenda sans perte ;
- décisions : acceptation avec durée allongée et `.ics`, refus, proposition confirmée seulement par le client, jeton invalide, message clair sans date ni heure, transitions cohérentes ;
- automatismes : expiration, purge RGPD ;
- contact : `reply-to` vers le client, accusé de réception ;
- e-mails : échappement HTML, langue du client ;
- traductions : mêmes clés en FR, NL et EN, aucun texte vide.

Les tests et le build tournent à chaque publication (GitHub Actions) : une erreur bloque la mise en ligne et l'ancienne version reste en place.

**À vérifier après installation** (impossible sans votre compte Google) : l'envoi réel par Gmail, l'agenda et le dossier Drive. Voir l'étape 8 de [GUIDE-DEMARRAGE.md](GUIDE-DEMARRAGE.md).
