# Guide d'utilisation au quotidien

Tout se gère à deux endroits :

- **le tableur Google** `SOFTLINEBY.CLA — Réservations` : demandes, indisponibilités, messages et réglages (fonctionne aussi dans l'application **Google Sheets** sur téléphone) ;
- **GitHub** : le portfolio et les informations du site (fichiers `content/portfolio.json` et `content/site.json`).

Il n'y a pas d'espace administrateur sur le site lui-même.

---

## 1. Votre calendrier (ouvert par défaut)

**Tout votre calendrier est ouvert** : chaque jour, de 11:00 à 20:00, les clients choisissent librement leur créneau sur le site, jusqu'à 120 jours à l'avance (réglable) et au plus tôt 24 h à l'avance (réglable). Vous n'avez rien à ouvrir.

Ce que voit un client = tous les créneaux de 11:00 à 20:00, **moins** :

- les demandes en attente et les rendez-vous confirmés ;
- les périodes de l'onglet **Indisponibilités** ;
- les événements de votre **Google Agenda**.

Une demande de 3 h n'est proposée que si 3 heures consécutives sont libres, et jamais au-delà de 20:00.

**Bloquer un moment (vacances, journée off, rendez-vous perso)**, au choix :

- onglet **Indisponibilités** : une ligne par période (date et heure de début, date et heure de fin, motif privé) ;
- ou un événement dans Google Agenda : l'agenda `SOFTLINEBY.CLA — Rendez-vous`, ou votre agenda principal si le réglage **Mon agenda Google principal bloque aussi des créneaux** est sur `oui`. Un événement marqué « Disponible » dans Google Agenda ne bloque rien.

> Bloquer un moment n'annule jamais un rendez-vous existant.

**Préférer ouvrir vos heures vous-même** : dans **Paramètres**, mettez **Calendrier entièrement ouvert** sur `non`, puis lancez **✦ SOFTLINEBY.CLA → 1. Installer / réparer**. L'onglet **Disponibilités** réapparaît : une ligne par jour, une case par heure, et seules les heures cochées sont proposées (menu **✦ → Ouvrir toute la plage / Fermer les jours sélectionnés** pour aller plus vite).

---

## 2. Traiter une demande (onglet Réservations)

Chaque nouvelle demande vous arrive par e-mail avec un bouton **Ouvrir le tableur**, et apparaît comme une nouvelle ligne au statut **En attente**.
Tant que vous n'avez pas répondu, le créneau est **bloqué provisoirement** (gris dans Google Agenda). Sans décision dans le délai prévu (72 h par défaut, réglable), la demande **expire** : le créneau est libéré et le client est prévenu.

Les colonnes sur fond beige sont les vôtres. Pour décider :

1. *(facultatif)* remplissez **Message au client** : il sera ajouté à l'e-mail envoyé ;
2. *(facultatif)* choisissez une **Durée finale (h)** si le rendez-vous doit être plus long ou plus court que prévu ;
3. choisissez votre action dans la colonne **➜ Décision**. Elle s'exécute aussitôt, et un message de confirmation s'affiche en bas à droite.

| Décision | Ce qui se passe |
|---|---|
| **Accepter** | Le client reçoit l'e-mail de **confirmation** avec un fichier à ajouter à son agenda. L'événement Google Agenda devient **orange (confirmé)**. Si vous avez changé la durée, le moteur vérifie d'abord qu'il n'y a pas de conflit. |
| **Refuser** | Le créneau est libéré. Le client reçoit un e-mail poli, avec votre message éventuel. |
| **Proposer le nouveau créneau** | Remplissez d'abord **Nouvelle date** et **Nouvelle heure**. Le client reçoit un e-mail avec les boutons **Accepter** et **Refuser**. Le rendez-vous n'est **confirmé que s'il accepte** ; vous êtes prévenue de sa réponse par e-mail. |
| **Annuler le rendez-vous** | Pour une demande ou un rendez-vous confirmé. Le client est prévenu par e-mail et le créneau est libéré. |
| **Marquer terminé** | Après le rendez-vous. C'est aussi fait automatiquement 24 h après. |

Si une décision est impossible (par exemple accepter une demande déjà refusée, ou un créneau qui chevauche un autre rendez-vous), la case se vide et la raison est notée dans la colonne **Historique**.

- **Notes** : vos notes privées, jamais envoyées au client.
- **Images de référence** : liens vers le dossier Google Drive privé. Elles sont supprimées automatiquement après le délai défini dans **Paramètres**.
- **Historique** : tout ce qui est arrivé à la demande, avec la date.

**Statuts possibles :** En attente, Proposition envoyée, Confirmé, Refusé, Annulé, Expiré, Terminé.

> ⚠️ Ne modifiez pas à la main les colonnes **Statut**, **Début**, **Fin** ou **Date demandée** : utilisez toujours la colonne **➜ Décision**. Ne supprimez pas de lignes et ne réaffichez pas les colonnes masquées « tech ».

---

## 3. Messages (onglet Messages)

Les messages du formulaire de contact arrivent dans l'onglet **Messages** et dans votre boîte e-mail. Si vous **répondez directement à cet e-mail**, la réponse part vers le client.
Cochez **Traité** quand c'est fait.

---

## 4. Réglages (onglet Paramètres)

Modifiez uniquement la colonne **Valeur** :

- e-mail qui reçoit les demandes et messages ;
- adresse du site (utilisée dans les liens des e-mails) ;
- délais : blocage d'une demande en attente, délai de réponse à une proposition, délai minimum avant un rendez-vous, réservation possible jusqu'à X jours, durée maximale ;
- durées de conservation (RGPD) : images de référence et données clients. Si vous les changez, changez aussi les mêmes valeurs dans `content/site.json` (rubrique `conservation`), car elles sont affichées dans la politique de confidentialité ;
- calendrier entièrement ouvert (`oui` / `non`, voir section 1) ;
- votre agenda principal bloque aussi des créneaux (`oui` / `non`) ;
- accusé de réception automatique pour les messages de contact (`oui` / `non`).

---

## 5. Journal et vérifications

L'onglet **Journal** liste chaque e-mail envoyé (ou en échec). Les e-mails en échec sont réessayés automatiquement toutes les heures.

Menu **✦ SOFTLINEBY.CLA** :

- **Tester l'envoi d'un e-mail** : à utiliser après chaque changement ;
- **Lancer la maintenance maintenant** : expirations, nouvel essai des e-mails, nettoyage RGPD (normalement automatique toutes les heures) ;
- **1. Installer / réparer** : sans risque pour vos données, à relancer si une décision ne réagit plus.

---

## 6. Gérer le portfolio (sur GitHub)

Le portfolio se trouve dans `content/portfolio.json` et les photos dans `content/photos/`. Chaque modification sur GitHub met le site à jour tout seul en 2 à 4 minutes (onglet **Actions**).

**Masquer une réalisation** sans la supprimer :

1. ouvrez <https://github.com/RayaneVanOsselt/Softlinebycla-tatouages/edit/main/content/portfolio.json> ;
2. trouvez le bloc de la réalisation (par exemple `"id": "ohana"`) et remplacez `"publie": true` par `"publie": false` ;
3. **Commit changes…**, puis **Commit changes**.

**Mettre à la une** : `"aLaUne": true` fait apparaître la réalisation sur la page d'accueil (la première avec une vidéo sert de vidéo d'accueil).

**Changer l'ordre** : l'ordre des blocs dans le fichier est l'ordre d'affichage. Déplacez un bloc entier (de `{` à `},`).

**Ajouter une réalisation** :

1. ouvrez <https://github.com/RayaneVanOsselt/Softlinebycla-tatouages/tree/main/content/photos>, cliquez sur **Add file → Upload files**, déposez la photo (JPG, PNG ou WebP ; vidéo en MP4), puis **Commit changes** ;
2. dans `content/portfolio.json`, copiez un bloc existant et adaptez-le :

   ```json
   {
     "id": "nouvelle-rose",
     "categorie": "floral-nature",
     "publie": true,
     "aLaUne": false,
     "medias": ["IMG_6001.jpg"],
     "titre": { "fr": "Nouvelle rose", "nl": "Nieuwe roos", "en": "New rose" },
     "description": { "fr": "…", "nl": "…", "en": "…" },
     "texteAlternatif": { "fr": "Tatouage fine line d'une rose sur le poignet", "nl": "…", "en": "…" }
   },
   ```

   - `id` : un nom court, sans espaces ni accents, unique (il sert d'adresse de la page) ;
   - `categorie` : `floral-nature`, `lettering`, `minimal`, `illustration` ou `studies` ;
   - `medias` : le nom **exact** du fichier déposé (majuscules comprises) ;
   - `texteAlternatif` : une description de l'image pour les personnes malvoyantes et pour Google ;
   - pour une vidéo, déposez aussi une image de couverture nommée comme la vidéo avec `.poster.jpg` (ex. `video-rose.mp4` et `video-rose.poster.jpg`).

Vos photos ne sont jamais retouchées : seules les bandes noires éventuelles (captures de stories) sont retirées, et des versions plus légères sont créées automatiquement.

> Ne mettez aucune information personnelle sur un client dans les titres ou les descriptions.

---

## 7. Informations du site (sur GitHub)

E-mail affiché, réseaux sociaux, mentions légales et adresse du moteur de réservation : `content/site.json` (voir l'étape 5 de [GUIDE-DEMARRAGE.md](GUIDE-DEMARRAGE.md)).

---

## 8. Sauvegarde et restauration

- **Le tableur est la référence** : toutes les demandes, disponibilités et messages s'y trouvent.
- Google Sheets garde un historique : **Fichier → Historique des versions → Afficher l'historique des versions** permet de revenir à un état passé.
- **Sauvegarde mensuelle recommandée** : **Fichier → Télécharger → Microsoft Excel (.xlsx)**, à ranger dans un endroit sûr.
- Le site, le portfolio et les photos d'origine sont sauvegardés sur GitHub (avec tout leur historique).
- Le code du moteur est dans le dépôt (`apps-script/Code.gs`) : en cas de problème, recollez-le dans Apps Script et créez une nouvelle version du déploiement.
