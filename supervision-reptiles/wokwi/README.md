# Simulation du node intérieur

Créer un projet ESP32-C3 : https://wokwi.com/projects/new/esp32-c3

1. Copier `enclosure.ino` dans l'onglet `sketch.ino` du nouveau projet.
2. Remplacer `diagram.json`, ajouter `libraries.txt`.
3. Ajouter le custom chip `bh1750` avec les fichiers `bh1750.chip.c` et `bh1750.chip.json`.
4. Lancer. Deux DS18B20 sont lus sur deux bus distincts (GPIO 4 et 3) ; le BH1750 est en I2C GPIO 6/7, MTreg=31 ; le contact est sur GPIO 5.
5. Basculer le switch : gauche = contact fermé à la masse = porte fermée ; droite = porte ouverte. L'événement est traité après 30 ms d'anti-rebond sans attendre la prochaine mesure. Modifier aussi les deux températures et le curseur lux de 0 à 100 000.
6. Enregistrer votre projet et copier son lien public dans le dossier technique.

Le slide switch représente l'ILS. Le BH1750 utilise une émulation I2C fournie : les identifiants `wokwi-bh1750` et `wokwi-reed-switch` du projet initial ne sont pas des composants natifs listés. L'émulation ne modélise ni le bruit, ni l'erreur optique, ni les temps de conversion du capteur réel.

Ce dossier prépare le prototype demandé, mais sa compilation et son fonctionnement sur Wokwi restent à vérifier. Aucun lien de projet publié n'est fourni.
