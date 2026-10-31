# SOFTLINEBY.CLA

Site officiel de SOFTLINEBY.CLA, artiste tatoueuse fine line : portfolio, réservation mensuelle validée manuellement, e-mails automatiques, Google Agenda et suivi dans Google Sheets. Disponible en français, néerlandais et anglais.

- **Site** : <https://rayanevanosselt.github.io/Softlinebycla-tatouages/> (GitHub Pages, gratuit)
- **Réservations** : un Google Sheet avec le moteur `apps-script/Code.gs` (Google Apps Script, gratuit)

| Document | Pour qui |
|---|---|
| **[docs/GUIDE-DEMARRAGE.md](docs/GUIDE-DEMARRAGE.md)** | Mise en ligne pas à pas (GitHub Pages, Google Sheet). **À lire en premier.** |
| [docs/GUIDE-ADMIN.md](docs/GUIDE-ADMIN.md) | Utilisation au quotidien : disponibilités, demandes, portfolio, sauvegarde |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Direction artistique, design system, architecture, sécurité, tests |

## Modifier le site sans rien installer

- Informations (e-mail, réseaux sociaux, mentions légales, adresse du moteur) : `content/site.json`
- Portfolio : `content/portfolio.json` et les photos dans `content/photos/`

Modifiez-les directement sur GitHub (icône crayon) : le site se republie tout seul en 2 à 4 minutes.

## Lancer le site en local (développeurs)

Prérequis : Node.js 20.9 ou plus.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Dans un premier terminal, lancez le moteur de réservation de démonstration :

```bash
npm run mock-api
```

Dans un second terminal :

```bash
npm run dev
```

Le site s'ouvre sur <http://localhost:3000>.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | développement |
| `npm run build` | optimisation des médias, puis export statique dans `out/` (utilisé par GitHub Actions) |
| `npm run mock-api` | moteur de réservation de démonstration sur le port 8787 |
| `npm test` | tests du moteur de réservation et des traductions |
| `npm run typecheck` | vérification TypeScript stricte |
| `npm run media` | régénère les photos et vidéos optimisées depuis `content/photos/` |
| `npm run brand:build` | régénère logos, favicons et image de partage depuis `ressources/` |

## Stack

Next.js 16 (App Router, export statique), React 19, TypeScript strict, Tailwind CSS 4, Motion, next-intl, sharp, Vitest. Moteur de réservation : Google Apps Script (Sheets, Agenda, Drive, Gmail). Publication : GitHub Actions vers GitHub Pages.

## Structure

```
apps-script/         moteur de réservation (à coller dans le Google Sheet)
content/             site.json, portfolio.json, photos d'origine
messages/            textes FR / NL / EN
ressources/          fichiers d'origine fournis (logo, charte, photos, vidéos)
public/brand         logo officiel détouré, icônes, image de partage
scripts/             préparation des médias et du logo, moteur de démonstration
src/app/[locale]     pages publiques
src/components       interface (site, accueil, portfolio, réservation)
src/lib              configuration, client du moteur, SEO
tests/               tests Vitest (le moteur Apps Script est testé avec des doublures Google)
.github/workflows    publication automatique sur GitHub Pages
```
