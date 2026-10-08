# Supervision temps réel du centre reptiles

## Démarrer

Dans ce dossier, avec Docker Desktop et Docker Compose installés :

```bash
docker compose up
```

Ouvrir **http://localhost:8080**. Compose construit automatiquement le simulateur au premier démarrage. Ports : MQTT TCP 1883, WebSocket 9001, front 8080. Arrêt : `docker compose down`.

Comptes de laboratoire : `sim` / `sim-pass`, `front` / `front-pass`, `admin` / `admin-pass`. Chaque node possède aussi son propre utilisateur (ex. `N-DES-01`) / `node-pass` et une ACL limitée à ses topics. Le compte `sim` représente le pont du simulateur, distinct des vrais comptes node.

Le modèle fourni est conservé octet pour octet : `sim/src/simulator.js`, `scenarios.js`, `facility.js`, `species.js`. Empreintes : `docs/validation/source-hashes.json`.

## Vérification effectuée

- 12 tests automatisés : `cd sim`, `npm ci`, `npm test`.
- Scénario incidents : depuis la racine, `node scripts/validate-incidents.js` ; résultats mesurés et captures dans `docs/validation/`.
- Broker Mosquitto natif : authentification, ACL front/node, MQTT TCP + WebSocket, session persistante, ACK, expiration, doublons, Last Will et tampon/rejeu. 74 462 messages rejoués sans perte. Le test génère dix minutes de trafic à SPEED=60 pendant une coupure réelle plus courte ; il ne représente pas une attente chronométrée de dix minutes.
- Front contrôlé dans Chromium : aucune erreur JavaScript et aucun débordement horizontal à 390 px. Les captures du dossier sont explicitement issues d'un rejeu déterministe des messages du simulateur.
- **Compose n'a pas été exécuté dans l'environnement de vérification : Docker y est absent.** Le broker natif ne remplace pas ce contrôle final sur votre ordinateur.

## Fonctionnement

Adaptateur : `sim/src/outputs/mqtt.js`. Lectures, portes, états et ACK en QoS 1. Journal d'attente persistant dans le volume `sim-data` : aucune éviction de lecture. Le journal est vidé après PUBACK ; une reprise peut produire des doublons, filtrés par `streamId`/`seq` dans le front. L'arrêt tente une publication d'état hors ligne avant de fermer la connexion.

`simTs` fournit l'heure simulée canonique ; `recvTs` indique l'heure réelle du pont et `ts` reste l'horloge du device. Le front utilise l'heure du site Europe/Paris. Le navigateur conserve son clientId pendant les reconnexions et le rechargement du même onglet, ainsi que son historique et ses acquittements localement. Les acquittements d'alertes ne sont pas partagés entre postes.

Commandes : `createdAt`, `expiresAt` (8 s), `id`, `target`, `action`, `value`, `v:1`. Les commandes expirées ou retenues sont refusées. Une répétition du même identifiant et contenu retourne l'ACK sans réexécuter l'action. Aucun renvoi automatique après timeout.

Variables : `OUTPUT` (console/mqtt/both), `SCENARIO`, `SPEED`, `SEED`, `START`, `MQTT_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_CLIENT_ID`, `MQTT_TOPIC_ROOT`, `MQTT_KEEPALIVE`, `MQTT_SPOOL_DIR`, `MQTT_BUFFER_MAX` (seuil d'avertissement, pas un seuil d'éviction). Les valeurs CLI priment sur l'environnement. La console et les commandes stdin restent utilisables en mode `both`.

Pour refaire les tests réseau contre Compose :

```bash
node scripts/validate-mqtt.js
```

Le dossier technique est `docs/dossier.pdf` ; sa source modifiable est `docs/dossier.md`.

## Avant le rendu

1. Exécuter `docker compose up` et vérifier le front sur votre machine.
2. Importer et lancer les fichiers du dossier `wokwi/`, puis renseigner le **lien public de votre simulation**. Compilation et exécution Wokwi non vérifiées ici.
3. Joindre une vidéo de démonstration de moins de quatre minutes (guide : `docs/demo.md`).
4. Fournir votre dépôt Git et son historique réel sur les quatre jours. L'archive fournie ne contient aucun historique Git ; aucun historique n'a été inventé.
5. Confirmer les devis, la livraison et les essais physiques (radio, autonomie, précision). La BOM distingue les prix relevés des provisions estimées.
