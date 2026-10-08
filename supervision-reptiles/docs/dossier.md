# Supervision du centre reptiles
**Dossier technique — version vérifiée du 8 octobre 2026**

## 1. Périmètre et architecture

Le site comporte **28 nodes** : 19 enclos intérieurs (DES 6, TRO 6, QUA 4, SOI 3), deux enclos extérieurs, quatre salles et trois portes du bâtiment. Le modèle fourni est conservé ; les choix matériels décrivent une réalisation proposée, pas un montage physique déjà testé.

| Zone | Contraintes | Proposition |
|---|---|---|
| DES | 12 m ; éclairage intense | ESP32-C3, Wi-Fi 2,4 GHz, alimentation secteur |
| TRO | 18 m ; humidité jusqu'à 85 % | Même node ; boîtier et passages de câbles étanches |
| QUA | 42 m ; deux murs de béton de 30 cm | AP local relié au réseau par Ethernet à installer ; étude radio préalable |
| SOI | 9 m ; stabilité des patients | Node secteur ; surveillance de température plus stricte |
| EXT | 65 m ; pas de secteur | STM32WL/RAK3172, LoRa point à point, pile lithium |
| Portes bâtiment | Trois accès, événements rares | Même radio basse consommation ; réveil sur contact |

**Chaîne intérieure :** sondes → ESP32-C3 → AP Wi-Fi → Ethernet → Mosquitto. **Chaîne extérieure :** sondes/contact → RAK3172 → liaison LoRa avec ACK → passerelle → MQTT. Le navigateur se connecte directement au broker par WebSocket ; aucun backend applicatif ne sert d'intermédiaire. Le serveur et le réseau sont proposés sur onduleur. La passerelle radio physique reste à réaliser.

| Exigence | Réponse et preuve disponible |
|---|---|
| Température 5–55 °C, ±0,5 °C | DS18B20 : spécification constructeur compatible ; calibration du montage à faire |
| Lumière 0–100 000 lx | BH1750 avec MTreg=31 ; adaptation de gamme et vérification au luxmètre à faire |
| Porte visible en moins de 2 s | Interruption, anti-rebond 30 ms, événement immédiat ; TCP→WS mesuré à 1 ms localement, chaîne physique à chronométrer |
| 30 € par enclos intérieur | Prévision 24,16 € avec réserve ; livraison et devis à confirmer |
| EXT autonome six mois | Calcul avec marge : environ 16,5 mois ; mesures de courant et essais hivernaux nécessaires |
| Coupure réseau <10 min | Journal durable sans éviction et sessions MQTT ; 74 462 messages rejoués sans perte au banc |

## État du livrable

Adaptateur, interface, authentification, ACL et tests sont inclus. Les captures sont des **rejeux déterministes du front réel**, explicitement identifiés. Docker n'était pas disponible dans l'environnement de contrôle. Le lien public Wokwi, la vidéo et l'historique Git réel ne sont pas fournis par cette archive. Aucun de ces éléments n'est présenté comme validé.


<!-- page -->

# 2. Choix des composants : calcul pondéré

Les notes de 1 à 5 sont des appréciations de conception, pas des mesures de laboratoire. Les poids totalisent 100 %. Score = somme(note × poids) / 100. Un critère obligatoire non satisfait élimine un candidat même si son score est élevé.

## Microcontrôleur intérieur
| Candidat | Prix (25 %) | E/S (20 %) | Wi-Fi (25 %) | Énergie (10 %) | Disponibilité (20 %) | Score / 5 |
|---|---|---|---|---|---|---|
| ESP32-C3 SuperMini | 5 | 4 | 5 | 3 | 5 | 4,60 |
| ESP8266-12F | 4 | 2 | 4 | 3 | 4 | 3,50 |
| Nano + radio Wi-Fi | 2 | 4 | 2 | 2 | 4 | 2,80 |

**Retenu : ESP32-C3.** Le Wi-Fi et les interfaces sont intégrés. Deux bus 1-Wire évitent de confondre la sonde chaude avec la sonde froide ; I²C et une entrée d'interruption restent disponibles. Le modèle Wokwi utilise la carte C3 DevKitM prise en charge par le simulateur, dont le brochage doit être adapté si une carte SuperMini différente est achetée. Le choix d'une carte compacte impose de vérifier sa qualité, son régulateur et ses cotes avant commande [S1].

L'ESP8266 offre moins de marge pour les entrées et les fonctions futures. Le Nano exige un deuxième composant radio et augmente le câblage. L'alimentation permanente permet de privilégier la simplicité et le prix à la consommation de veille.

## Température
| Candidat | Précision (30 %) | Plage (20 %) | Prix (20 %) | Bus (15 %) | Robustesse (15 %) | Score / 5 |
|---|---|---|---|---|---|---|
| DS18B20 en tube | 4 | 5 | 4 | 5 | 5 | 4,50 |
| DHT22 | 2 | 4 | 4 | 3 | 2 | 2,95 |
| TMP117 | 5 | 5 | 2 | 4 | 3 | 3,95 |

**Retenu : deux DS18B20 par enclos, une par salle.** La fiche Analog Devices annonce ±0,5 °C entre −10 et +85 °C, ce qui couvre la plage exigée [S2]. La version en tube protège le composant ; l'étanchéité de l'assemblage et l'authenticité des sondes bon marché restent à contrôler. Deux résistances de rappel de 4,7 kΩ sont prévues.

Le TMP117 offre une précision supérieure (±0,1 °C de −20 à +50 °C et une spécification plus large ailleurs) [S3], mais exige un assemblage adapté à l'humidité et coûte plus cher. Il constitue une amélioration possible en soins après validation du budget. Le DHT22 n'est pas retenu pour un point chaud exigeant une précision garantie et une installation humide.

**Traitement des défauts :** −127 °C signifie sonde déconnectée ; 85 °C est traité comme valeur de démarrage anormale dans cette application limitée à 55 °C. Ces valeurs déclenchent une alerte technique et sont exclues des courbes et des alertes thermiques. Une conversion valide doit remplacer la valeur de démarrage avant exploitation.


<!-- page -->

# 3. Lumière, porte et réseau

## Capteur de lumière
| Candidat | Gamme (35 %) | Interface (20 %) | Prix (20 %) | Calibration (25 %) | Score / 5 |
|---|---|---|---|---|---|
| BH1750, MTreg=31 | 5 | 5 | 5 | 3 | 4,50 |
| OPT4001, boîtier SOT-5X3 | 5 | 5 | 2 | 5 | 4,40 |
| LDR + ADC | 2 | 3 | 5 | 2 | 2,80 |

**Retenu : BH1750 pour tous les enclos.** Au réglage par défaut, les comptes numériques ne sont pas directement des lux : en mode haute résolution, lux = compte / 1,2 × 69 / MTreg. Avec MTreg=31, la pleine échelle nominale vaut environ 121 558 lx ; 100 000 lx reste dans la gamme même en tenant compte d'une réponse jusqu'à 20 % supérieure. Le firmware règle explicitement MTreg à 31 [S4]. La précision optique exige une comparaison au luxmètre, une fenêtre propre et une géométrie reproductible. Le montage simule 0–100 000 lx ; il ne prouve pas une mesure physique exacte.

L'OPT4001 en SOT-5X3 atteint environ 117 441 lx ; sa variante PicoStar n'a pas la même pleine échelle [S5]. Une LDR demande une calibration non linéaire et dérive fortement. Un capteur plafonnant à 88 000 lx ne satisfait pas la gamme maximale demandée.

## Contact de porte
| Candidat | Latence (30 %) | Prix (25 %) | Fiabilité (30 %) | Énergie (15 %) | Score / 5 |
|---|---|---|---|---|---|
| ILS + aimant | 5 | 5 | 4 | 5 | 4,70 |
| Fin de course mécanique | 5 | 4 | 3 | 5 | 4,15 |
| Capteur Hall numérique | 5 | 3 | 4 | 4 | 4,05 |

**Retenu : ILS et aimant.** Interruption sur les deux fronts, anti-rebond non bloquant de 30 ms ; aucune attente de la période de température. Sur secteur, rappel interne ; sur pile, résistance de forte valeur et entrée de réveil pour limiter le courant. Tester l'alignement de l'aimant, l'arrachement d'un câble et les ouvertures rapides. Wokwi remplace ce contact par un interrupteur à glissière documenté [S6].

## Connectivité
| Candidat | Portée/murs (30 %) | Latence (25 %) | Prix (20 %) | Énergie (15 %) | Exploitation (10 %) | Score / 5 |
|---|---|---|---|---|---|---|
| Wi-Fi avec AP de zone | 3 | 5 | 5 | 2 | 5 | 3,95 |
| LoRa point à point | 5 | 4 | 3 | 5 | 4 | 4,25 |
| Zigbee maillé | 4 | 4 | 3 | 4 | 3 | 3,70 |

Le choix dépend de la zone : **Wi-Fi pour l'intérieur ; LoRa avec ACK pour EXT et les accès sur pile.** Pour QUA, un AP local et sa liaison Ethernet sont des postes à installer et à budgéter. La traversée des deux murs, le débit et la latence ne sont pas déduits de la distance seule : une mesure sur site est nécessaire. Pour LoRa, choisir le débit et le facteur d'étalement après essais ; la compatibilité avec une porte visible en deux secondes doit être mesurée, y compris les retransmissions et les contraintes réglementaires radio.


<!-- page -->

# 4. Alimentation et autonomie

## Énergie intérieure
| Candidat | Prix (30 %) | Fiabilité (30 %) | Maintenance (20 %) | Sécurité (20 %) | Score / 5 |
|---|---|---|---|---|---|
| Rail 5 V de salle + protection | 5 | 4 | 5 | 4 | 4,50 |
| Adaptateur certifié par enclos | 3 | 5 | 4 | 5 | 4,20 |
| Pile ou batterie par enclos | 2 | 2 | 1 | 3 | 2,00 |

Rail secteur de salle retenu avec fusible/protection par départ, câbles courts et alimentation certifiée. Le budget prévoit une alimentation de salle et la connectique de chaque node. Une coupure physique d'un node provoque son silence ; elle ne doit pas être confondue avec une interruption réseau. Onduleur prévu sur serveur, broker et infrastructure réseau.

## Microcontrôleur extérieur
| Candidat | Énergie (40 %) | Radio intégrée (25 %) | Prix (20 %) | Facilité (15 %) | Score / 5 |
|---|---|---|---|---|---|
| STM32WL / RAK3172 | 5 | 5 | 4 | 4 | 4,65 |
| nRF52840 + SX1262 | 5 | 3 | 2 | 3 | 3,60 |
| ESP32-C3 + SX1262 | 3 | 3 | 4 | 3 | 3,20 |

**RAK3172 retenu :** STM32WLE5 et radio LoRa réunis ; fabricant : veille du module à partir de 1,69 µA [S7]. Cette valeur ne représente pas le courant du montage complet. L'autonomie ci-dessous réserve 10 µA en veille pour module, entrée de porte, régulation et fuite ; capteurs alimentés seulement pendant la mesure.

## Source d'énergie extérieure
| Candidat | Capacité/froid (35 %) | Autodécharge (25 %) | Prix (20 %) | Maintenance (20 %) | Score / 5 |
|---|---|---|---|---|---|
| Li-SOCl₂ ER14500 + tampon | 5 | 5 | 3 | 5 | 4,60 |
| Piles alcalines | 2 | 3 | 5 | 3 | 3,05 |
| Li-ion rechargeable + solaire | 4 | 3 | 2 | 2 | 2,95 |

Pile ER14500, capacité de calcul **2 400 mAh**, à confirmer sur la référence choisie. Prévoir un tampon adapté aux impulsions radio : 80 mA pendant 0,3 s et chute autorisée de 0,4 V donnent C ≥ 0,06 F ; provision de 100 mF et vérification de sa fuite/résistance. Ne pas raccorder une cellule à bobine sans vérifier son courant admissible.

| Phase d'un cycle de 300 s | Courant | Durée | Charge |
|---|---:|---:|---:|
| Veille | 0,010 mA | 297,5 s | 2,975 mA·s |
| Mesure | 5 mA | 2 s | 10 mA·s |
| Émission | 80 mA | 0,3 s | 24 mA·s |
| Réception ACK | 12 mA | 0,2 s | 2,4 mA·s |
| **Total** | | **300 s** | **39,375 mA·s** |

Moyenne 0,13125 mA. Avec 70 % de capacité utile : 1 680 / 0,13125 = 12 800 h, soit environ **17,5 mois**. Vingt événements supplémentaires par jour ajoutent environ 0,202 mAh/jour : autonomie proche de **16,5 mois**, supérieure à six mois dans ces hypothèses. Ce bilan est une estimation à vérifier sur montage complet ; froid, portée, fuites, capteurs et répétitions peuvent réduire la marge.


<!-- page -->

# 5. Nomenclature et budget du site

Relevés du 8 octobre 2026. Prix en euros TTC lorsque le vendeur les affiche ainsi. Pour la carte C3, prix HT 2,839 € majoré par hypothèse de 20 % : 3,41 €. Les lignes « provision » sont des estimations de conception, pas des devis. Transport, TVA applicable, disponibilité des quantités et qualité doivent être confirmés.

| Composant | Prix unitaire | Origine et hypothèse |
|---|---:|---|
| ESP32-C3 SuperMini | 3,41 € | HESTORE [S1], hypothèse TVA 20 % |
| DS18B20 étanche, câble 1 m | 2,70 € | BerryBase [S8] |
| BH1750 GY-302 | 2,40 € | BerryBase [S9] |
| ILS avec aimant | 1,15 € | BerryBase [S10] |
| Boîtier intérieur IP65 | 3,80 € | Gotronic, IP207, réf. 11861 [S11] |
| Presse-étoupes, câbles, résistances | 3,00 € | Provision par node intérieur |
| Départ 5 V/connectique | 2,00 € | Provision par node intérieur |
| RAK3172, approvisionnement | 12,00 € | Provision ; catalogue fabricant 5,99–6,99 USD hors transport [S7] |
| Pile + support | 6,50 € | Provision, capacité de calcul 2,4 Ah |
| Régulation, tampon, PCB extérieur | 8,00 € | Provision ; prototype à chiffrer |
| Antenne extérieure | 2,50 € | Provision, modèle radio à valider |
| Boîtier extérieur | 5,50 € | Provision avec passage de câbles étanche |

| Type de node | Composition | Qté | Unitaire | Sous-total |
|---|---|---:|---:|---:|
| Enclos intérieur | C3 + 2 sondes + lux + ILS + boîtier + accessoires + 5 V | 19 | 21,16 € | 402,04 € |
| Salle | C3 + 1 sonde + ILS + boîtier + accessoires + 5 V | 4 | 16,76 € | 67,04 € |
| Enclos EXT | RAK + 2 sondes + lux + ILS + pile + PCB + antenne + boîtier | 2 | 43,45 € | 86,90 € |
| Porte bâtiment | RAK + ILS + pile + PCB + antenne + boîtier intérieur | 3 | 33,95 € | 101,85 € |
| **Nodes seuls** | | **28** | | **657,83 €** |

Réserve transport/écarts : 3 € × 28 = **84 €**. Node intérieur avec réserve : **24,16 €**, donc marge prévisionnelle de 5,84 € sous le plafond de 30 €. L'extérieur n'est pas soumis à ce plafond.

| Infrastructure : postes provisoires | Montant |
|---|---:|
| AP local QUA | 35 € |
| Passerelle LoRa point à point vers MQTT | 50 € |
| Câble Ethernet et pose légère | 30 € |
| Commutateur réseau | 20 € |
| Quatre alimentations de salle | 60 € |
| Serveur local à acheter si nécessaire | 150 € |
| Onduleur serveur/réseau | 80 € |
| **Infrastructure** | **425 €** |

**Prévision site complet : 657,83 + 84 + 425 = 1 166,83 €**, hors main-d'œuvre de fabrication, étalonnage et pose lourde. Aucun équipement existant n'est présumé. Les stocks relevés ne garantissent pas toutes les quantités ; les prix d'infrastructure et d'énergie doivent encore être sourcés par devis pour figer la BOM.


<!-- page -->

# 6. Protocole MQTT et robustesse

Version dans le préfixe **reptile/v1** et dans le JSON `v:1`. Les zones sont `des`, `tro`, `qua`, `soi`, `ext`, `bat` ; les identifiants suivent le modèle fourni. Le pont utilise `sim-adapter`, le front un identifiant stable par onglet ; les nodes physiques disposent de comptes individuels limités par ACL.

| Suffixe de topic | Exemple / contenu | QoS | Retain |
|---|---|---:|---|
| `{zone}/{node}/reading` | Mesure périodique | 1 | Non |
| `{zone}/{node}/event` | Porte ou boot | 1 | Oui pour l'état de porte |
| `{zone}/{node}/status` | Heartbeat du node | 1 | Oui |
| `{zone}/{node}/cmd` | Commande | 1 | Non |
| `{zone}/{node}/ack` | Résultat corrélé | 1 | Non |
| `bridge/status` | Online ou Last Will offline | 1 | Oui |
| `bridge/clock` | Heure courante du simulateur | 0 | Oui |

Les messages du modèle restent intacts dans leur contenu utile. L'enveloppe ajoute `streamId` (UUID de session), `simTs` (heure canonique de simulation), `recvTs` (heure réelle du pont) et `periodS` (période effective du capteur). `ts` est conservé comme horloge du device ; il peut dériver et ne pilote jamais les durées d'alerte. En réel, l'équivalent canonique doit être une horloge de passerelle synchronisée. Le front affiche Europe/Paris, y compris les horaires d'intrusion.

## Perte de liaison et reprise

Avant publication, le pont ajoute les messages QoS 1 au journal durable `outbox.ndjson` du volume `sim-data`. Suppression après PUBACK ; aucune éviction quand le seuil d'avertissement est atteint. Jusqu'à 32 messages en vol, retransmission MQTT et reprise du journal après redémarrage. Une reprise peut fournir des doublons : filtrage `(streamId, seq)` dans le navigateur. Mosquitto conserve les sessions et ses files ; la limite configurée est 250 000 messages et 100 Mo par file, à surveiller avec le disque [S12].

Le front se reconnecte automatiquement avec son clientId stable. Un nouvel onglet reçoit les états retenus ; une session déjà abonnée récupère ses événements en file. La persistance broker lors d'un arrêt brutal dépend aussi de la dernière sauvegarde. Un disque plein ou un node sans alimentation n'est pas couvert par une garantie absolue : le journal protège ce que l'adaptateur a effectivement reçu, pas un événement qui n'a jamais été émis.

## Commandes et authentification

Format : `v`, `id` UUID, `target`, `action`, `value`, `createdAt`, `expiresAt` (8 s maximum). Validation de la cible et du topic, de la valeur, de l'expiration et du caractère non retenu. Résultat sur `ack` avec le même `id`. Le front affiche attente, succès, rejet ou timeout ; aucune répétition automatique après timeout. Un doublon de même contenu renvoie l'ACK en cache sans nouvelle exécution ; même id avec contenu différent : rejet. Ce cache est en mémoire une heure, donc l'idempotence n'est pas garantie à travers un redémarrage du pont.

ACL : front lit télémétrie et ACK, écrit seulement les commandes ; un node écrit uniquement ses propres mesures et lit ses propres commandes ; le pont simule les 28 nodes ; admin dispose de l'exploitation globale. Un faux mot de passe est refusé. Les identifiants par défaut sont ceux du laboratoire ; avant exposition, remplacer les secrets et ajouter TLS/WSS et des règles réseau.


<!-- page -->

# 7. Interface et mesures d'incidents

Vue des 28 nodes, détail par node et courbes sur les 30 dernières minutes simulées. Alertes de température chaude/froide, lumière, porte >3 min, ouverture hors horaires, pile, défaut de sonde, silence capteur/node et dérive d'horloge. Le silence d'un capteur suit trois périodes effectives ; celui d'un node deux heartbeats. Les périodes modifiées par commande sont prises en compte.

Une alerte peut être acquittée pendant que sa cause reste active ; le retour à la normale est distinct. Une nouvelle occurrence après rétablissement crée une nouvelle alerte. Historique et acquittements sont conservés localement et exportables ; ils ne sont pas partagés entre postes. La température SOI utilise une tolérance de ±0,5 °C autour de la cible froide stable et de nuit ; les espèces tropicales/désertiques utilisent leurs profils et leurs transitions jour/nuit.

## Partie F — scénario réellement rejoué

Modèle original, seed=42, départ **08/10/2026 à 07:45 Europe/Paris**, pas de 1 s simulée, durée 19 h, 140 194 messages. Le même moteur d'alertes est utilisé dans le navigateur et le validateur. Les délais ci-dessous sont **simulés**, depuis le début de la panne jusqu'à l'alerte ; ils ne mesurent pas le transport MQTT.

| Incident / alerte | Début local | Détection locale | Délai simulé |
|---|---|---|---:|
| Porte DES-02 ouverte >3 min | 08/10 08:10:00 | 08/10 08:13:00 | 180 s |
| Sonde TRO-03 déconnectée | 08/10 08:25:00 | 08/10 08:25:01 | 1 s |
| Lampe DES-04 : lux faibles | 08/10 08:45:00 | 08/10 08:45:03 | 3 s |
| Lampe DES-04 : température basse | 08/10 08:45:00 | 08/10 08:47:03 | 123 s |
| TRO-05 : surchauffe | 08/10 09:15:00 | 08/10 09:23:48 | 528 s |
| QUA-03 muet | 08/10 09:30:00 | 08/10 09:39:40 | 580 s |
| SOI-02 : valeur de démarrage 85 | 08/10 09:45:00 | 08/10 09:46:17 | 77 s |
| QUA : nodes muets | 08/10 10:25:00 | 08/10 10:34:51 | 591 s |
| TRO-06 : dérive >2 min | 08/10 07:45:00 | 08/10 08:15:14 | 1814 s |
| EXT-02 : pile <20 % | 08/10 07:45:00 | 08/10 07:45:15 | 15 s |
| EXT-02 : extinction | 08/10 11:05:00 | 08/10 12:15:16 | 4216 s |
| Porte nourriture hors horaires | 09/10 02:37:12 | 09/10 02:37:12 | 0 s |

Le seuil de porte est une durée métier de trois minutes, distincte de l'affichage immédiat d'une ouverture. L'extinction est datée ici depuis le début du vidage accéléré ; la mort physique survient à 11:15:51 et le silence est détecté **3 565 s** plus tard. Ce délai provient des heartbeats batterie de 30 min, pas d'une perte MQTT. La panne de lampe produit une alerte lux rapidement puis thermique après inertie ; le thermostat ne devient hors limite qu'après montée en température.

## Banc MQTT et navigateur

**12 tests automatisés réussis.** Mosquitto natif 2.0.18 : mauvais mot de passe, ACL lecture/écriture, TCP→WS, session durable, ACK corrélé, doublon, expiration et Last Will contrôlés. Trafic équivalent à 10 min réelles à SPEED=60 : **74 462 messages**, **0 manquant**, coupure et rejeu en **3 601 ms**. Ce banc accélère la génération ; il n'attend pas dix minutes chronométrées. Chromium 153 : 12 captures, aucune erreur JavaScript, aucun débordement horizontal à 390 px. Compose n'a pas été exécuté.


<!-- page -->

# 8. Sources et contrôles restants

## Sources techniques et prix

Les références suivantes sont des liens cliquables. Les prix relevés ne constituent pas une offre ferme pour les quantités du site.

| Réf. | Source primaire / fournisseur |
|---|---|
| S1 | [HESTORE — ESP32-C3 SuperMini](https://www.hestore.eu/fr/prod_10048018.html) |
| S2 | [Analog Devices — DS18B20, précision et plage](https://www.analog.com/en/products/DS18B20.html) |
| S3 | [Texas Instruments — TMP117](https://www.ti.com/product/TMP117) |
| S4 | [ROHM — fiche BH1750FVI, via DFRobot](https://dfimg.dfrobot.com/enshop/image/data/SEN0097/BH1750FVI.pdf) |
| S5 | [Texas Instruments — fiche OPT4001](https://www.ti.com/lit/ds/symlink/opt4001.pdf) |
| S6 | [Wokwi — matériels pris en charge](https://docs.wokwi.com/getting-started/supported-hardware) ; [interrupteur](https://docs.wokwi.com/parts/wokwi-slide-switch) ; [API I²C](https://docs.wokwi.com/chips-api/i2c) |
| S7 | [RAKwireless — RAK3172, module MCU/LoRa](https://store.rakwireless.com/products/wisduo-lpwan-module-rak3172?variant=44068554473670) |
| S8 | [BerryBase — DS18B20 étanche](https://www.berrybase.de/ds18b20-ic-digitaler-temperatursensor-wasserdicht/kabellaenge-1-00-m) |
| S9 | [BerryBase — BH1750 GY-302](https://www.berrybase.de/bh1750-digitaler-lichtsensor) |
| S10 | [BerryBase — contact porte/fenêtre](https://www.berrybase.de/universaler-tuer-und-fensterkontakt) |
| S11 | [Gotronic — boîtiers ABS étanches, IP207 réf. 11861](https://www.gotronic.fr/cat-boitiers-etanches-en-abs-2179.htm) |
| S12 | [Mosquitto — configuration, ACL, files et persistance](https://mosquitto.org/man/mosquitto-conf-5.html) |
| S13 | [Node.js — calendrier des versions ; runtime 24 LTS](https://github.com/nodejs/Release) |

## Wokwi : fichiers fournis, lien à publier

`wokwi/diagram.json`, `enclosure.ino`, `libraries.txt` et les fichiers du composant BH1750 personnalisé sont inclus. ESP32-C3 : GPIO4 chaud, GPIO3 froid, GPIO5 porte, GPIO6 SDA et GPIO7 SCL. Deux bus 1-Wire avec résistances de 4,7 kΩ ; conversions Dallas non bloquantes et interruption de porte avec anti-rebond. Le composant I²C reproduit les registres et la gamme utile, pas les effets optiques physiques.

Importer, compiler et lancer sur [Wokwi — nouveau projet ESP32-C3](https://wokwi.com/projects/new/esp32-c3), puis remplacer cette instruction par **le lien public de votre projet**. Compilation et fonctionnement de cette simulation ne sont pas attestés par les tests Node.js.

## Avant de remettre le travail

1. Lancer `docker compose up` sur la machine de rendu, ouvrir localhost:8080 et refaire une porte, une commande et une reconnexion.
2. Valider et publier Wokwi ; compléter le devis d'infrastructure/énergie, vérifier les quantités et mesurer radio, latence physique, température, lumière et courant.
3. Enregistrer la démonstration de moins de quatre minutes à l'aide de `docs/demo.md` ; l'archive ne contient pas de vidéo.
4. Fournir le dépôt Git avec votre historique réel de quatre jours. Le ZIP initial n'avait pas de répertoire Git ; aucun historique n'a été fabriqué.

Les résultats détaillés et les captures sont dans `docs/validation/`. Les pages suivantes présentent deux captures de rejeu par page. Les scripts et tests sont livrés pour rendre la vérification reproductible. Les fichiers imposés `simulator.js` et `scenarios.js`, ainsi que `facility.js` et `species.js`, restent identiques à ceux de l'archive reçue ; empreintes conservées dans `source-hashes.json`.

