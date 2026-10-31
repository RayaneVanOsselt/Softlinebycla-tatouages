# Mise en ligne de SOFTLINEBY.CLA, étape par étape

Ce guide vous mène du code jusqu'au site en ligne, avec les réservations, les e-mails, Google Agenda et Google Sheets.
Suivez les étapes **dans l'ordre**. Comptez environ 1 h 30 la première fois.

> 💡 Tous les services utilisés ont une offre gratuite. Lisez quand même l'encadré « Coûts » en bas de page avant de choisir votre hébergeur.

---

## Avant de commencer : ce qu'il vous faut

- [ ] Un compte **GitHub** (vous l'avez déjà : c'est là qu'est le code).
- [ ] Un compte **Google** (Gmail). Il sert pour l'envoi des e-mails, l'agenda et le tableur.
- [ ] Un compte **Vercel** (gratuit) : <https://vercel.com/signup>. Choisissez « Continue with GitHub ».

---

## Étape 1 — Mettre le code sur la branche principale

Le site se trouve sur la branche `claude/softlineby-tattoo-site-8892ff`. Pour le mettre en ligne :

1. Ouvrez le dépôt sur GitHub.
2. Créez une *Pull Request* de cette branche vers `main`, puis cliquez sur **Merge**.

(Claude peut le faire pour vous si vous le lui demandez.)

---

## Étape 2 — Créer le site sur Vercel

1. Sur <https://vercel.com/new>, cliquez sur **Import** en face de votre dépôt `Softlinebycla`.
2. Ne changez rien, puis cliquez sur **Deploy**.
3. ⚠️ **Le premier déploiement va échouer**, et c'est normal : la base de données n'existe pas encore. On s'en occupe à l'étape 3.

---

## Étape 3 — Ajouter la base de données (Neon, gratuite)

1. Dans votre projet Vercel, ouvrez l'onglet **Storage**.
2. Cliquez sur **Create Database**, choisissez **Neon (Serverless Postgres)**, puis **Continue**.
3. Région : choisissez **Frankfurt (eu-central-1)**, en Europe (RGPD).
4. Plan : **Free**. Cochez les 3 environnements (*Production, Preview, Development*), puis **Connect**.

✅ La variable `DATABASE_URL` est ajoutée automatiquement.

---

## Étape 4 — Ajouter le stockage des nouvelles photos et vidéos (Vercel Blob)

1. Toujours dans **Storage**, cliquez sur **Create Database**, choisissez **Blob**, puis **Continue**.
2. Donnez-lui un nom (ex. `softlineby-media`) et cliquez sur **Create**, puis **Connect** au projet.

✅ La variable `BLOB_READ_WRITE_TOKEN` est ajoutée automatiquement.

---

## Étape 5 — Préparer l'envoi d'e-mails avec Gmail (gratuit, sans EmailJS)

Le site envoie ses e-mails depuis **votre adresse Gmail**, via un « mot de passe d'application ».
Votre vrai mot de passe n'est jamais utilisé.

1. Allez sur <https://myaccount.google.com/security>.
2. Activez la **Validation en deux étapes** si ce n'est pas déjà fait (obligatoire pour l'étape suivante).
3. Allez sur <https://myaccount.google.com/apppasswords>.
4. Nom de l'application : `Site SOFTLINEBY.CLA`, puis **Créer**.
5. Google affiche un code de **16 lettres** (ex. `abcd efgh ijkl mnop`). **Copiez-le** dans un endroit sûr, il ne sera plus affiché.

Vous aurez besoin de :

- `SMTP_USER` = votre adresse Gmail complète
- `SMTP_PASSWORD` = le code de 16 lettres (les espaces ne gênent pas)

> Limite Gmail : environ 500 e-mails par jour, largement suffisant pour un studio.

---

## Étape 6 — Créer deux codes secrets

Le site a besoin de deux longues chaînes aléatoires. Sur Mac, ouvrez l'application **Terminal** et collez cette commande :

```bash
openssl rand -base64 32
```

Appuyez sur Entrée et copiez le résultat : c'est votre `AUTH_SECRET`. Relancez la même commande et copiez ce second résultat : c'est votre `CRON_SECRET`.

---

## Étape 7 — Créer l'accès Google (Agenda et Sheets) avec un « compte de service »

Un compte de service est un petit robot Google, autorisé uniquement sur l'agenda et le tableur que vous partagerez avec lui. C'est gratuit et aucune carte bancaire n'est demandée.

1. Allez sur <https://console.cloud.google.com/projectcreate>.
   - Nom du projet : `softlineby-site`, puis **Créer**.
2. Activez les deux API (vérifiez que le projet `softlineby-site` est sélectionné en haut de la page) :
   - <https://console.cloud.google.com/apis/library/calendar-json.googleapis.com>, puis **Activer**
   - <https://console.cloud.google.com/apis/library/sheets.googleapis.com>, puis **Activer**
3. Créez le compte de service : <https://console.cloud.google.com/iam-admin/serviceaccounts/create>
   - Nom : `site-reservations`, puis **Créer et continuer**.
   - Ne mettez **aucun rôle**, puis cliquez sur **Continuer** et **OK**.
4. Cliquez sur le compte créé, ouvrez l'onglet **Clés**, puis **Ajouter une clé**, **Créer une clé**, format **JSON**, et **Créer**.
   Un fichier `.json` se télécharge. Ouvrez-le avec TextEdit. Vous y trouverez :
   - `"client_email"` : c'est votre `GOOGLE_SERVICE_ACCOUNT_EMAIL` (il ressemble à `site-reservations@softlineby-site.iam.gserviceaccount.com`)
   - `"private_key"` : c'est votre `GOOGLE_PRIVATE_KEY`. Copiez **tout** ce qui est entre les guillemets, de `-----BEGIN PRIVATE KEY-----` jusqu'à `-----END PRIVATE KEY-----\n`.

> 🔒 Ce fichier est confidentiel : ne l'envoyez à personne et ne le mettez pas sur GitHub. Supprimez-le une fois l'étape 10 terminée.

---

## Étape 8 — Créer l'agenda des rendez-vous

1. Ouvrez <https://calendar.google.com>.
2. À gauche, à côté de « Autres agendas », cliquez sur **+**, puis **Créer un agenda**.
   Nom : `SOFTLINEBY.CLA — Rendez-vous`, fuseau horaire **(GMT+01:00) Bruxelles**, puis **Créer l'agenda**.
3. Ouvrez les paramètres de ce nouvel agenda.
4. Dans **Partager avec des personnes en particulier**, cliquez sur **Ajouter des personnes**, collez le `client_email` du compte de service et choisissez l'autorisation **Apporter des modifications aux événements**.
5. Plus bas, section **Intégrer l'agenda**, copiez l'**ID de l'agenda** (il se termine par `@group.calendar.google.com`) : c'est votre `GOOGLE_CALENDAR_ID`.

Ce que le site fera avec cet agenda :

- une demande reçue apparaît en **provisoire** (« ⏳ Demande… »), sans bloquer votre agenda ;
- quand vous acceptez, l'événement devient **confirmé** ;
- quand vous refusez ou annulez, l'événement est retiré ;
- si vous ajoutez vous-même un événement « occupé » dans cet agenda, ce créneau disparaît automatiquement des disponibilités du site.

> Facultatif : pour que votre agenda personnel bloque aussi des créneaux, partagez-le avec le compte de service (« Voir uniquement les disponibilités ») et mettez son adresse dans `GOOGLE_BUSY_CALENDAR_IDS`.

---

## Étape 9 — Créer le tableur de suivi

1. Ouvrez <https://sheets.new> et nommez le fichier `SOFTLINEBY.CLA — Réservations`.
2. Cliquez sur **Partager**, collez le `client_email` du compte de service, choisissez le rôle **Éditeur**, décochez « Envoyer une notification », puis **Partager**.
3. Copiez l'ID dans l'adresse de la page : c'est la partie entre `/d/` et `/edit`.
   Exemple : `https://docs.google.com/spreadsheets/d/`**`1AbC…xyz`**`/edit`, l'ID est `1AbC…xyz`. C'est votre `GOOGLE_SHEETS_ID`.

Le site crée tout seul l'onglet « Réservations » et les colonnes : ID réservation, date de création, prénom, nom, e-mail, date demandée, début, fin, durée, projet, emplacement, taille, statut, référence Calendar, notes.

---

## Étape 10 — Saisir les variables dans Vercel

Dans Vercel, ouvrez votre projet, puis **Settings** et **Environment Variables**. Ajoutez chaque ligne (Key / Value) en cochant les 3 environnements :

| Key | Value |
|---|---|
| `ADMIN_EMAILS` | votre adresse e-mail (celle qui pourra se connecter à l'admin) |
| `AUTH_SECRET` | le 1er code de l'étape 6 |
| `CRON_SECRET` | le 2e code de l'étape 6 |
| `SMTP_USER` | votre adresse Gmail |
| `SMTP_PASSWORD` | le code de 16 lettres de l'étape 5 |
| `CONTACT_EMAIL` | l'adresse qui reçoit les messages (souvent la même) |
| `BOOKING_NOTIFICATION_EMAIL` | l'adresse qui reçoit les demandes de rendez-vous |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | le `client_email` de l'étape 7 |
| `GOOGLE_PRIVATE_KEY` | la `private_key` de l'étape 7 (collez-la telle quelle) |
| `GOOGLE_CALENDAR_ID` | l'ID de l'étape 8 |
| `GOOGLE_SHEETS_ID` | l'ID de l'étape 9 |

`DATABASE_URL` et `BLOB_READ_WRITE_TOKEN` sont déjà là grâce aux étapes 3 et 4.
L'adresse du site est détectée automatiquement. Vous ajouterez `NEXT_PUBLIC_SITE_URL` seulement si vous branchez un nom de domaine (étape 13).

---

## Étape 11 — Relancer le déploiement

1. Ouvrez l'onglet **Deployments**.
2. Sur le dernier déploiement, cliquez sur **⋯**, puis **Redeploy**, puis **Redeploy**.
3. Attendez le statut **Ready** (2 à 3 minutes). Le site crée tout seul ses tables et importe votre portfolio.

✅ Le site est en ligne à l'adresse affichée par Vercel (ex. `https://softlinebycla.vercel.app`).

---

## Étape 12 — Première connexion et réglages (10 minutes)

1. Allez sur `https://VOTRE-SITE/admin`.
2. Entrez l'adresse mise dans `ADMIN_EMAILS` : vous recevez un **lien de connexion** par e-mail (pensez à regarder dans les spams). Cliquez dessus, puis sur **Me connecter**.
3. Le **tableau de bord** affiche une check-list. Complétez-la :
   - **Synchronisation** : cliquez sur « Tester l'envoi d'e-mail » puis sur « Tester Google Agenda & Sheets ». Les deux doivent afficher ✓.
   - **Paramètres, section Contact** : vérifiez les adresses e-mail.
   - **Paramètres, section Mentions légales** : remplissez votre nom, votre forme juridique et votre **numéro d'entreprise (BCE)**. Ces informations sont obligatoires en Belgique ; faites relire les textes juridiques avant publication.
   - **Paramètres, section Réseaux sociaux** : collez vos liens Instagram, TikTok, etc. Ceux qui restent vides n'apparaissent pas sur le site.
   - **Agenda** : ouvrez vos premières disponibilités (voir le guide d'utilisation).
4. Faites une **réservation test** depuis le site public avec une autre adresse e-mail. Vérifiez :
   - [ ] l'e-mail « Demande reçue — en attente de confirmation » côté client ;
   - [ ] l'e-mail « Nouvelle demande » de votre côté ;
   - [ ] l'événement provisoire dans Google Agenda ;
   - [ ] la ligne dans Google Sheets.
5. Acceptez cette demande dans l'admin, vérifiez l'e-mail de confirmation, puis **annulez-la** pour libérer le créneau.

---

## Étape 13 (facultative) — Votre propre nom de domaine

1. Vercel : ouvrez **Settings**, puis **Domains**, puis **Add**, et saisissez votre domaine (ex. `softlinebycla.be`). Suivez les instructions DNS chez votre registraire.
2. Ajoutez la variable `NEXT_PUBLIC_SITE_URL` = `https://softlinebycla.be`, puis relancez le déploiement (étape 11).

---

## ✅ Check-list avant d'annoncer le site

- [ ] Les tests e-mail et Google affichent ✓ (Admin, page Synchronisation)
- [ ] Une réservation test a été faite, acceptée, puis annulée
- [ ] Les mentions légales sont complétées et relues
- [ ] Les disponibilités des prochaines semaines sont ouvertes
- [ ] Les réseaux sociaux sont renseignés (ou volontairement laissés vides)
- [ ] Les photos du portfolio sont vérifiées : publiez ou masquez chaque projet, notamment ceux qui montrent des prénoms ou des dates (Ohana, Prénoms entrelacés, Bouquet & prénom, Une date). Assurez-vous d'avoir l'accord des clients concernés.
- [ ] Le fichier JSON du compte de service est supprimé de votre ordinateur

---

## 💶 Coûts : à lire

| Service | Gratuit ? | Remarque |
|---|---|---|
| Gmail SMTP | ✅ 100 % | environ 500 e-mails/jour |
| Neon (base de données) | ✅ | 0,5 Go, largement suffisant |
| Google Agenda / Sheets / compte de service | ✅ | aucune carte bancaire |
| Vercel Blob | ✅ | quota gratuit inclus, suffisant pour un portfolio |
| **Vercel (hébergement)** | ⚠️ | Le plan **Hobby** est gratuit, mais ses conditions le réservent à un **usage personnel non commercial**. Pour un site professionnel, Vercel prévoit le plan **Pro** (environ 20 $/mois). |

Si vous voulez un hébergement gratuit autorisé pour un usage commercial, il faut adapter le site à un autre hébergeur (par exemple Netlify). C'est faisable, mais ce n'est pas inclus ici : demandez-le si besoin.

---

## En cas de problème

| Symptôme | Solution |
|---|---|
| Le déploiement échoue avec « DATABASE_URL » | Refaites l'étape 3, puis l'étape 11. |
| Pas d'e-mail de connexion admin | Vérifiez les spams, `ADMIN_EMAILS`, `SMTP_USER` et `SMTP_PASSWORD`, puis relancez le déploiement. |
| Test Google : « 403 » ou « 404 » | L'agenda ou le tableur n'est pas partagé avec le `client_email` (étapes 8 et 9), ou l'API n'est pas activée (étape 7.2). |
| Test Google : « invalid_grant » | `GOOGLE_PRIVATE_KEY` est mal copiée : recopiez-la en entier, `-----BEGIN` et `-----END` compris. |
| Le calendrier public est vide | Ouvrez des créneaux dans Admin, page Agenda. Par défaut, rien n'est ouvert. |
| Une tâche est « En échec » | Admin, page Synchronisation : cliquez sur « Relancer les tâches en échec ». |
