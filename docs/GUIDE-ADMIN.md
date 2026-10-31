# Guide d'utilisation de l'administration

L'administration se trouve à l'adresse `https://VOTRE-SITE/admin`. Elle n'apparaît nulle part dans la navigation publique.
Pour vous connecter, entrez votre adresse : vous recevez un lien valable 15 minutes, utilisable une seule fois. Vous restez ensuite connectée 30 jours sur cet appareil.

Tout fonctionne aussi sur téléphone, avec la barre de navigation en bas de l'écran.

---

## 1. Ouvrir vos disponibilités (page Agenda)

Par défaut, **tout est fermé** : un client ne voit que ce que vous ouvrez.

- **Un seul jour** : touchez le jour, allumez les heures voulues (11:00 à 19:00, chaque bouton représente 1 h), puis **Enregistrer**.
- **Plusieurs jours d'un coup** : cochez **Sélection multiple**, puis touchez les jours.
  Astuce : en sélection multiple, toucher « Mar » sélectionne tous les mardis à venir du mois.
- Raccourcis : **Toute la plage** (11 h–20 h), **11 h–15 h**, **14 h–20 h**, **Tout fermer**.
- **Vacances ou journée bloquée** : utilisez le panneau **Périodes d'indisponibilité** (date et heure de début et de fin). Une période bloquée l'emporte toujours sur les heures ouvertes.

Ce que voit un client = vos heures ouvertes, moins les rendez-vous, les demandes en attente, les périodes bloquées et vos occupations dans Google Agenda.
Une demande de 3 h n'est proposée que si 3 heures consécutives sont libres, et jamais au-delà de 20 h.

> Fermer une heure n'annule jamais un rendez-vous existant.

---

## 2. Traiter une demande (page Réservations)

Chaque nouvelle demande vous arrive par e-mail avec un bouton **Ouvrir la demande**.
Tant que vous n'avez pas répondu, le créneau est **bloqué provisoirement**. Sans décision dans le délai prévu (72 h par défaut, réglable), la demande **expire** : le créneau est libéré et le client est prévenu.

Dans la fiche d'une demande, vous pouvez :

| Action | Ce qui se passe |
|---|---|
| **Accepter** | Vous pouvez ajuster la durée (le site vérifie qu'il n'y a pas de conflit). Le client reçoit l'e-mail de **confirmation** avec un fichier à ajouter à son agenda. Google Agenda passe de « provisoire » à « confirmé ». |
| **Refuser** | Le créneau est libéré. Le client reçoit un e-mail poli, avec votre message éventuel. |
| **Proposer un autre créneau** | Choisissez la date, l'heure et la durée. Le client reçoit un e-mail avec les boutons **Accepter** et **Refuser**. Le rendez-vous n'est **confirmé que s'il accepte**. |
| **Annuler** | Pour un rendez-vous déjà confirmé. Vous choisissez si le client est prévenu par e-mail. |
| **Marquer comme terminé** | Après le rendez-vous. C'est aussi fait automatiquement 24 h après. |
| **Notes privées** | Visibles uniquement par vous (et dans Google Sheets). |

En bas de la fiche, **E-mails & synchronisation** indique pour chaque e-mail s'il est *Fait*, *En file* ou *En échec*. Les images de référence envoyées par le client sont **privées** : elles ne s'affichent que lorsque vous êtes connectée.

**Statuts possibles :** En attente, Confirmé, Nouveau créneau proposé, Refusé, Annulé, Expiré, Terminé.

---

## 3. Gérer le portfolio (page Portfolio)

- **Réorganiser** avec les flèches ↑ ↓, puis cliquez sur **Enregistrer l'ordre**.
- **Publié** : décochez pour masquer un projet du site sans le supprimer.
- **À la une** : les projets cochés apparaissent sur la page d'accueil (le premier avec une vidéo sert de vidéo d'accueil).
- **+ Nouveau projet** : titre et description en FR, NL et EN, catégorie, année (facultative).
  Une fois le projet créé, ajoutez les photos ou vidéos. L'image de couverture d'une vidéo est générée automatiquement.
- Pour chaque média : un **texte alternatif** (description pour les personnes malvoyantes et pour Google) et un **cadrage** (le point important de la photo quand elle est affichée en vignette). Vos photos ne sont jamais retouchées.
- **Catégories** : seules les catégories qui contiennent des projets publiés apparaissent dans les filtres du site.

> Ne mettez aucune information personnelle sur un client dans les titres ou les descriptions.

---

## 4. Messages

Les messages du formulaire de contact arrivent aussi dans votre boîte e-mail. Si vous **répondez directement à cet e-mail**, la réponse part vers le client.
Dans l'admin, vous pouvez les lire, y répondre et les archiver.

---

## 5. Paramètres

- **Contact** : l'adresse affichée sur le site, l'adresse qui reçoit les demandes et l'accusé de réception automatique.
- **Réservation** : délais de blocage et d'expiration, délai minimum avant un rendez-vous, nombre de mois visibles, durée maximale, durées de conservation (RGPD).
- **Réseaux sociaux** : seuls les liens remplis s'affichent.
- **Textes du site** : modifiez les textes d'accueil et d'« À propos » dans chaque langue. Un champ vide garde le texte d'origine.
- **Mentions légales** : nom, forme juridique, numéro BCE, TVA, e-mail « données personnelles ».
- **Données personnelles (RGPD)** : à partir de l'adresse d'un client, **exportez** ses données (fichier JSON) ou **effacez-les**.

---

## 6. Synchronisation

La base de données du site est la **référence**. Google Agenda et Google Sheets en sont des copies tenues à jour automatiquement.
Si Google ou Gmail est momentanément indisponible, rien n'est perdu : les tâches sont relancées automatiquement.

Les boutons de cette page :

- **Tester l'envoi d'e-mail** et **Tester Google Agenda & Sheets** : à utiliser après chaque changement de configuration.
- **Relancer les tâches en échec**.
- **Resynchroniser l'agenda** : recrée ou met à jour tous les événements actifs.
- **Reconstruire Google Sheets** : réécrit tout le tableau depuis la base, sans doublon. À utiliser si quelqu'un a modifié le tableur à la main.

---

## 7. Sauvegarde et restauration

- **Neon** garde un historique qui permet de restaurer la base à un instant passé (console Neon, onglet *Restore*). La durée de cet historique dépend de votre plan Neon.
- **Google Sheets** contient une copie lisible de toutes les demandes.
- **Sauvegarde complète** (recommandée chaque mois), depuis un ordinateur où PostgreSQL est installé :

  ```bash
  pg_dump "VOTRE_DATABASE_URL" --no-owner --format=custom --file=softlineby-$(date +%F).dump
  ```

  Pour restaurer :

  ```bash
  pg_restore --clean --no-owner --dbname="VOTRE_DATABASE_URL" softlineby-AAAA-MM-JJ.dump
  ```

- Les photos du portfolio d'origine sont dans le dépôt GitHub (dossier `ressources/`). Les photos ajoutées ensuite sont dans Vercel Blob.
