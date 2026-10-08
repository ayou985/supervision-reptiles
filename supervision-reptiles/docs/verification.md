# Vérification et corrections — 8 octobre 2026

Corrections principales : heure canonique et horaires Europe/Paris ; valeurs de sonde invalides exclues des courbes ; seuils et silence adaptés aux périodes ; acquittement stable et récurrence ; commandes validées, expirables et idempotentes pendant la session ; clientId navigateur stable ; journal QoS 1 persistant sans éviction ; authentification et ACL individuelles ; alimentation extérieure et budgets recalculés ; matériel Wokwi pris en charge avec composant lumière personnalisé.

Preuves : 12 tests unitaires réussis ; 140 194 messages du scénario incidents rejoués ; 74 462 messages en tampon rejoués sans perte contre Mosquitto natif ; ACL, authentification, session, ACK et Last Will vérifiés ; Chromium sans erreur JavaScript et sans débordement mobile. Résultats bruts dans `docs/validation/`. Les délais d'incidents sont simulés ; les captures portent une étiquette de rejeu.

À terminer : contrôle Docker réel, compilation et publication Wokwi, vidéo <4 min, historique Git réel, devis complets et essais matériels. Le dossier PDF distingue ces points des contrôles effectués. Aucun historique, lien public ni essai physique n'a été inventé.
