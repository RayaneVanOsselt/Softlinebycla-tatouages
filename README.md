# SOFTLINEBY.CLA

Site officiel de SOFTLINEBY.CLA, artiste tatoueuse fine line : portfolio, réservation mensuelle validée manuellement, e-mails automatiques, Google Agenda, Google Sheets et administration privée. Disponible en français, néerlandais et anglais.

| Document | Pour qui |
|---|---|
| **[docs/GUIDE-DEMARRAGE.md](docs/GUIDE-DEMARRAGE.md)** | Mise en ligne pas à pas (Vercel, Neon, Gmail, Google). **À lire en premier.** |
| [docs/GUIDE-ADMIN.md](docs/GUIDE-ADMIN.md) | Utilisation quotidienne de l'administration, sauvegarde et restauration |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Direction artistique, design system, architecture, sécurité, tests |

## Lancer le site en local

Prérequis : Node.js 20.9 ou plus.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Dans `.env.local`, mettez votre adresse dans `ADMIN_EMAILS`. Lancez ensuite :

```bash
npm run dev
```

Le site s'ouvre sur <http://localhost:3000>. Sans `DATABASE_URL`, une base PostgreSQL embarquée est créée dans `.data/` et le portfolio y est importé automatiquement : il n'y a rien à installer.
Sans SMTP configuré, aucun e-mail n'est envoyé : leur contenu s'affiche dans le terminal et ils sont marqués « non envoyé » dans l'admin. Le lien de connexion admin s'affiche lui aussi dans le terminal.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | développement |
| `npm run build` | migrations de la base, puis build de production (utilisé par Vercel) |
| `npm test` | tests unitaires et d'intégration (base embarquée) |
| `npm run typecheck` | vérification TypeScript stricte |
| `npm run db:generate` | génère une migration après modification de `src/lib/db/schema.ts` |
| `npm run db:migrate` | applique les migrations sur `DATABASE_URL` |
| `npm run jobs:run` | exécute la file de tâches (e-mails, Google) manuellement |
| `npm run assets:prepare` | régénère logos, favicons et images du portfolio depuis `ressources/` |

## Stack

Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, Motion, next-intl, Drizzle ORM, PostgreSQL (Neon) / PGlite, Zod, Nodemailer (Gmail SMTP), Google Calendar et Sheets en REST, Vercel Blob, Vitest.

## Structure

```
messages/            textes FR / NL / EN
ressources/          fichiers d'origine fournis (logo, charte, photos, vidéos)
public/brand         logo officiel détouré, icônes, image de partage
public/portfolio     photos et vidéos optimisées
drizzle/             migrations SQL versionnées
scripts/             migrations, préparation des médias, file de tâches
src/app/[locale]     pages publiques
src/app/admin        administration privée
src/app/api          routes serveur
src/components       interface (site, accueil, portfolio, réservation, admin)
src/lib              métier : réservation, e-mails, Google, sécurité, base de données
tests/               tests Vitest
```
