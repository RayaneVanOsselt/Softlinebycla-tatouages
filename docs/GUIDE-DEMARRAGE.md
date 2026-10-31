# Mise en ligne de SOFTLINEBY.CLA, étape par étape

Le site fonctionne avec deux services **gratuits** :

- **GitHub Pages** affiche le site (portfolio, pages, formulaire de réservation) ;
- **un Google Sheet** avec un petit programme (Google Apps Script) reçoit les demandes, envoie les e-mails depuis votre Gmail, remplit Google Agenda et range les images de référence dans un dossier Google Drive privé.

Il n'y a ni Vercel, ni base de données, ni mot de passe à configurer.
Suivez les étapes **dans l'ordre**. Comptez environ 45 minutes la première fois.

---

## Avant de commencer : ce qu'il vous faut

- [ ] Votre compte **GitHub** (le dépôt `RayaneVanOsselt/Softlinebycla-tatouages`).
- [ ] Le compte **Google** (Gmail) qui servira au site. Les e-mails partiront de cette adresse, et l'agenda et le tableur lui appartiendront. Utilisez-le pour **toutes** les étapes Google ci-dessous.

---

## Étape 1 — Activer GitHub Pages (2 minutes)

Tant que ce réglage n'est pas fait, l'adresse du site affiche seulement le texte du README au lieu du vrai site.

1. Ouvrez <https://github.com/RayaneVanOsselt/Softlinebycla-tatouages/settings/pages>.
2. Dans **Build and deployment**, à la ligne **Source**, choisissez **GitHub Actions** (au lieu de « Deploy from a branch »).
3. Ouvrez l'onglet **Actions** du dépôt, cliquez sur **Publier le site** dans la liste de gauche, puis sur **Run workflow** et encore **Run workflow** (branche `main`).
4. Attendez la coche verte (2 à 4 minutes).
5. Ouvrez <https://rayanevanosselt.github.io/Softlinebycla-tatouages/>. Le site s'affiche avec l'animation du logo.
   Si vous voyez encore l'ancienne page, attendez une minute et rechargez avec **Cmd + Maj + R**.

> Le dépôt doit rester **public** : GitHub Pages est gratuit uniquement pour les dépôts publics. Aucune information secrète ne se trouve dans le dépôt.

À partir de maintenant, **chaque modification sur la branche `main` met le site à jour toute seule** en 2 à 4 minutes.

À ce stade, le site est visible, mais le calendrier de réservation et le formulaire de contact affichent une erreur de connexion : c'est normal, le moteur de réservation n'est pas encore branché (étapes 2 à 5).

---

## Étape 2 — Créer le tableur et y coller le moteur (10 minutes)

1. Ouvrez <https://sheets.new> et nommez le fichier `SOFTLINEBY.CLA — Réservations`.
2. Dans le menu du tableur, cliquez sur **Extensions**, puis **Apps Script**. Un nouvel onglet s'ouvre.
3. En haut à gauche, cliquez sur « Projet sans titre » et renommez-le `SOFTLINEBY.CLA — moteur`.
4. Ouvrez le fichier du moteur sur GitHub : <https://github.com/RayaneVanOsselt/Softlinebycla-tatouages/blob/main/apps-script/Code.gs>.
   Cliquez sur l'icône **Copy raw file** (deux carrés superposés, en haut à droite du code).
5. Revenez dans Apps Script, dans le fichier **Code.gs** : sélectionnez tout ce qui s'y trouve (**Cmd + A**), puis collez (**Cmd + V**).
6. Réglage du fuseau horaire et de l'accès :
   - cliquez sur la roue dentée **Paramètres du projet** (barre de gauche) ;
   - cochez **Afficher le fichier manifeste « appsscript.json » dans l'éditeur** ;
   - revenez dans l'éditeur (icône `< >`), ouvrez **appsscript.json**, remplacez tout son contenu par celui de <https://github.com/RayaneVanOsselt/Softlinebycla-tatouages/blob/main/apps-script/appsscript.json>.
7. Cliquez sur l'icône **Enregistrer** (disquette) ou faites **Cmd + S**.

---

## Étape 3 — Installer (5 minutes)

1. Revenez sur l'onglet du **tableur** et rechargez la page.
   Après quelques secondes, un menu **✦ SOFTLINEBY.CLA** apparaît à droite de « Aide ».
2. Cliquez sur **✦ SOFTLINEBY.CLA**, puis **1. Installer / réparer**.
3. Google demande une autorisation. C'est normal : c'est votre propre programme, qui demande l'accès à votre tableur, votre agenda, votre Drive et l'envoi d'e-mails.
   - **Continuer**, puis choisissez votre compte ;
   - sur l'écran « Google n'a pas validé cette application », cliquez sur **Paramètres avancés**, puis **Accéder à SOFTLINEBY.CLA — moteur (non sécurisé)** ;
   - cliquez sur **Autoriser** (ou cochez tout, puis **Continuer**).
4. Si rien d'autre ne s'affiche, relancez **✦ SOFTLINEBY.CLA → 1. Installer / réparer**.
   Le message **✓ Installation terminée** confirme que tout est prêt.

Ce que l'installation a créé :

- dans le tableur, les onglets **Réservations**, **Indisponibilités**, **Messages**, **Paramètres** et **Journal** (plus un onglet **Disponibilités** masqué, qui ne sert que si vous choisissez d'ouvrir vos heures vous-même) ;
- dans Google Agenda, un agenda **SOFTLINEBY.CLA — Rendez-vous** ;
- dans Google Drive, un dossier privé **SOFTLINEBY.CLA — Images de référence (privé)** ;
- deux automatismes : la réaction à vos décisions dans le tableur, et une maintenance toutes les heures (expiration des demandes, nouvel essai des e-mails en échec, suppression des anciennes données).

---

## Étape 4 — Publier le moteur sur Internet (5 minutes)

1. Dans **Apps Script**, cliquez sur le bouton bleu **Déployer**, puis **Nouveau déploiement**.
2. À côté de « Sélectionner le type », cliquez sur la roue dentée, puis **Application Web**.
3. Remplissez :
   - **Description** : `Site`
   - **Exécuter en tant que** : **Moi** (votre adresse)
   - **Qui peut accéder** : **Tout le monde** (⚠️ pas « Tout le monde disposant d'un compte Google »)
4. Cliquez sur **Déployer**. Autorisez à nouveau si Google le demande.
5. Copiez l'**URL de l'application Web**. Elle ressemble à `https://script.google.com/macros/s/AKfy…/exec`.
6. Vérification : collez cette adresse dans un nouvel onglet. Vous devez voir :
   `{"ok":true,"service":"SOFTLINEBY.CLA","status":"en ligne"}`

> 🔁 **Si un jour vous modifiez le moteur** (nouveau Code.gs) : **Déployer → Gérer les déploiements →** crayon **→ Version : Nouvelle version → Déployer**. L'adresse reste la même.
> Ne refaites pas « Nouveau déploiement », sinon l'adresse change et il faut la recopier dans le site.

---

## Étape 5 — Brancher le site au moteur et remplir vos informations (10 minutes)

Toutes les informations du site se trouvent dans un seul fichier : `content/site.json`.

1. Ouvrez <https://github.com/RayaneVanOsselt/Softlinebycla-tatouages/edit/main/content/site.json>.
2. Remplissez les valeurs **entre les guillemets**, sans toucher au reste :

| Champ | À mettre |
|---|---|
| `adresseApiReservation` | l'URL copiée à l'étape 4 (obligatoire pour les réservations) |
| `emailContact` | l'adresse affichée sur le site |
| `reseauxSociaux` → `instagram`, `tiktok`… | le lien complet, qui commence par `https://`. Laissez vide ce que vous n'utilisez pas : rien ne s'affichera. |
| `mentionsLegales` → `nom` | votre nom ou le nom de votre entreprise |
| `mentionsLegales` → `formeJuridique` | par exemple `Personne physique (indépendante)` |
| `mentionsLegales` → `numeroEntreprise` | votre numéro BCE, par exemple `0123.456.789` (obligatoire en Belgique) |
| `mentionsLegales` → `tva` | votre numéro de TVA, ou vide si vous n'en avez pas |
| `mentionsLegales` → `emailDonneesPersonnelles` | l'adresse pour les questions RGPD (souvent la même) |
| `mentionsLegales` → `derniereMiseAJour` | la date du jour, par exemple `31 octobre 2026` |
| `conservation` | à laisser tel quel, sauf si vous changez les mêmes durées dans l'onglet **Paramètres** du tableur |

   Exemple pour la première ligne :

   ```json
   "adresseApiReservation": "https://script.google.com/macros/s/AKfy…/exec",
   ```

3. Cliquez sur **Commit changes…**, laissez **Commit directly to the main branch**, puis **Commit changes**.
4. Le site se met à jour tout seul (onglet **Actions** : attendez la coche verte).

> ⚠️ Si la coche devient une croix rouge, c'est presque toujours une virgule ou un guillemet effacé par erreur. Rouvrez le fichier, comparez avec l'exemple ci-dessus et corrigez.

---

## Étape 6 — Vérifier les réglages du tableur (2 minutes)

Dans l'onglet **Paramètres** du tableur, modifiez uniquement la colonne **Valeur** :

- **E-mail qui reçoit les demandes et messages** : votre adresse (déjà remplie).
- **Adresse du site** : `https://rayanevanosselt.github.io/Softlinebycla-tatouages` (sans `/` à la fin). À changer seulement si vous branchez un nom de domaine (étape 9).
- **Calendrier entièrement ouvert** : `oui` (réglage par défaut). Voir l'étape 7.
- **Mon agenda Google principal bloque aussi des créneaux** : `oui` si vos rendez-vous personnels (dans votre agenda Google habituel) doivent rendre ces heures indisponibles sur le site.
- Les délais (blocage d'une demande, délai minimum, durée maximale…) peuvent rester tels quels.

---

## Étape 7 — Votre calendrier est ouvert : rien à faire (2 minutes)

Par défaut, **tout votre calendrier est ouvert** : chaque jour, de 11:00 à 20:00, les clients choisissent librement leur créneau sur le site. Vous n'avez rien à ouvrir.

Un créneau disparaît automatiquement du site quand il est pris par :

- une demande en attente ou un rendez-vous confirmé ;
- une période de l'onglet **Indisponibilités** (vacances, journée off, formation…) ;
- un événement de votre **Google Agenda** (l'agenda `SOFTLINEBY.CLA — Rendez-vous`, et votre agenda principal si le réglage est sur `oui`).

Vérifiez simplement que vos rendez-vous personnels et vos congés à venir sont bien dans Google Agenda ou dans **Indisponibilités**.

> Vous préférez ouvrir vos heures vous-même ? Mettez **Calendrier entièrement ouvert** sur `non`, relancez **✦ SOFTLINEBY.CLA → 1. Installer / réparer** : l'onglet **Disponibilités** réapparaît, et seules les heures cochées sont proposées.

Le détail de l'utilisation quotidienne est dans [GUIDE-ADMIN.md](GUIDE-ADMIN.md).

---

## Étape 8 — Test complet (10 minutes)

1. **✦ SOFTLINEBY.CLA → Tester l'envoi d'un e-mail** : vous recevez un e-mail de test (regardez aussi dans les spams).
2. Sur le site en ligne, faites une **réservation test** avec une **autre adresse e-mail** que la vôtre, avec une image de référence. Vérifiez :
   - [ ] l'e-mail « Demande reçue » côté client ;
   - [ ] l'e-mail « Nouvelle demande » de votre côté ;
   - [ ] la ligne dans l'onglet **Réservations** ;
   - [ ] l'événement provisoire (gris) dans l'agenda **SOFTLINEBY.CLA — Rendez-vous** ;
   - [ ] l'image dans le dossier Drive privé.
3. Dans la ligne de la demande, colonne **➜ Décision**, choisissez **Accepter** : le client reçoit la confirmation et l'événement devient orange.
4. Choisissez ensuite **Annuler le rendez-vous** pour libérer le créneau.
5. Envoyez un message test depuis la page **Contact** : il apparaît dans l'onglet **Messages** et dans votre boîte e-mail.

---

## Étape 9 (facultative) — Votre propre nom de domaine

1. GitHub : **Settings → Pages → Custom domain**, saisissez votre domaine (ex. `www.softlinebycla.be`), puis **Save**.
2. Chez votre registraire (là où vous avez acheté le domaine), ajoutez :
   - pour `www` : un enregistrement **CNAME** vers `rayanevanosselt.github.io` ;
   - pour le domaine sans `www` : quatre enregistrements **A** vers `185.199.108.153`, `185.199.109.153`, `185.199.110.153` et `185.199.111.153`.
3. Quand GitHub l'indique, cochez **Enforce HTTPS**.
4. Relancez **Actions → Publier le site → Run workflow** : les adresses du site s'adaptent toutes seules au nouveau domaine.
5. Dans l'onglet **Paramètres** du tableur, remplacez l'**Adresse du site** par `https://www.softlinebycla.be` (sans `/` final), pour que les liens des e-mails soient corrects.

---

## ✅ Check-list avant d'annoncer le site

- [ ] <https://rayanevanosselt.github.io/Softlinebycla-tatouages/> affiche le site (pas le README)
- [ ] L'URL du moteur affiche `"status":"en ligne"` et est collée dans `content/site.json`
- [ ] L'e-mail de test est bien arrivé
- [ ] Une réservation test a été faite, acceptée, puis annulée
- [ ] Les mentions légales sont complétées et relues (numéro BCE obligatoire)
- [ ] Vos congés et rendez-vous personnels des prochaines semaines sont dans Google Agenda ou dans l'onglet **Indisponibilités**
- [ ] Les réseaux sociaux sont renseignés (ou volontairement laissés vides)
- [ ] Les photos du portfolio sont vérifiées, notamment celles qui montrent des prénoms ou des dates (Ohana, Prénoms entrelacés, Bouquet & prénom, Une date). Assurez-vous d'avoir l'accord des clients concernés, ou masquez-les (voir [GUIDE-ADMIN.md](GUIDE-ADMIN.md), section Portfolio).

---

## 💶 Coûts

| Service | Gratuit ? | Remarque |
|---|---|---|
| GitHub Pages | ✅ | Dépôt public. Les conditions de GitHub interdisent de l'utiliser comme boutique en ligne ; un site vitrine avec des demandes de rendez-vous, sans paiement en ligne, n'est pas dans ce cas. |
| Google Sheets, Agenda, Drive, Apps Script | ✅ | Aucune carte bancaire. |
| Envoi d'e-mails par Gmail | ✅ | Environ **100 e-mails par jour** avec un compte Gmail gratuit (une demande en envoie 2). Largement suffisant pour un studio. |

---

## En cas de problème

| Symptôme | Solution |
|---|---|
| L'adresse du site affiche le texte du README | Étape 1 : la **Source** doit être **GitHub Actions**, puis relancez **Run workflow**. |
| La coche du site est rouge dans **Actions** | Après une modification de `content/site.json` : une virgule ou un guillemet manque. Ouvrez l'échec pour voir la ligne concernée. |
| Le calendrier affiche « Connexion impossible » | `adresseApiReservation` est vide ou mal copiée (étape 5), ou l'accès du déploiement n'est pas « Tout le monde » (étape 4). |
| Le calendrier est vide (tout est fermé) | Dans l'onglet **Paramètres**, **Calendrier entièrement ouvert** doit être sur `oui` (étape 7). Après une mise à jour du moteur, vérifiez aussi que vous avez créé une **nouvelle version** du déploiement (encadré 🔁 de l'étape 4). |
| Un jour libre apparaît « complet » | Un événement de votre Google Agenda ou une ligne de **Indisponibilités** couvre ce moment. |
| Le menu ✦ SOFTLINEBY.CLA n'apparaît pas | Rechargez le tableur. Vérifiez que le code est bien enregistré dans Apps Script (étape 2). |
| Choisir une décision ne fait rien | Relancez **✦ SOFTLINEBY.CLA → 1. Installer / réparer** (cela réinstalle les automatismes). |
| Pas d'e-mail reçu | Regardez dans les spams, puis l'onglet **Journal** du tableur : il indique chaque e-mail envoyé ou en échec. Les échecs sont relancés automatiquement toutes les heures. |
| Une modification du moteur n'a aucun effet | Créez une **nouvelle version** du déploiement (encadré 🔁 de l'étape 4). |
