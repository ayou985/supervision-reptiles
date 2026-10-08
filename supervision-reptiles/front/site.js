'use strict';
(function(root){const site={
  "zones": {
    "DES": {
      "label": "Salle desertique",
      "nodes": [
        "N-ROOM-DES",
        "N-DES-01",
        "N-DES-02",
        "N-DES-03",
        "N-DES-04",
        "N-DES-05",
        "N-DES-06"
      ]
    },
    "TRO": {
      "label": "Salle tropicale",
      "nodes": [
        "N-ROOM-TRO",
        "N-TRO-01",
        "N-TRO-02",
        "N-TRO-03",
        "N-TRO-04",
        "N-TRO-05",
        "N-TRO-06"
      ]
    },
    "QUA": {
      "label": "Quarantaine (batiment annexe)",
      "nodes": [
        "N-ROOM-QUA",
        "N-QUA-01",
        "N-QUA-02",
        "N-QUA-03",
        "N-QUA-04"
      ]
    },
    "SOI": {
      "label": "Soins intensifs",
      "nodes": [
        "N-ROOM-SOI",
        "N-SOI-01",
        "N-SOI-02",
        "N-SOI-03"
      ]
    },
    "EXT": {
      "label": "Enclos exterieurs",
      "nodes": [
        "N-EXT-01",
        "N-EXT-02"
      ]
    },
    "BAT": {
      "label": "Portes batiment",
      "nodes": [
        "N-DOOR-MAIN",
        "N-DOOR-SAS",
        "N-DOOR-FEED"
      ]
    }
  },
  "nodes": {
    "N-ROOM-DES": {
      "zone": "des",
      "sensors": [
        "temp_ambient"
      ],
      "period": 60,
      "heartbeat": 300
    },
    "N-ROOM-TRO": {
      "zone": "tro",
      "sensors": [
        "temp_ambient"
      ],
      "period": 60,
      "heartbeat": 300
    },
    "N-ROOM-QUA": {
      "zone": "qua",
      "sensors": [
        "temp_ambient"
      ],
      "period": 60,
      "heartbeat": 300
    },
    "N-ROOM-SOI": {
      "zone": "soi",
      "sensors": [
        "temp_ambient"
      ],
      "period": 60,
      "heartbeat": 300
    },
    "N-DES-01": {
      "zone": "des",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "pogona",
        "label": "Agame barbu (Pogona vitticeps)",
        "hotDay": 40,
        "coldDay": [
          24,
          29
        ],
        "night": [
          18,
          23
        ],
        "photo": [
          7,
          20
        ],
        "luxDay": 32000
      }
    },
    "N-DES-02": {
      "zone": "des",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "pogona",
        "label": "Agame barbu (Pogona vitticeps)",
        "hotDay": 40,
        "coldDay": [
          24,
          29
        ],
        "night": [
          18,
          23
        ],
        "photo": [
          7,
          20
        ],
        "luxDay": 32000
      }
    },
    "N-DES-03": {
      "zone": "des",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "pogona",
        "label": "Agame barbu (Pogona vitticeps)",
        "hotDay": 40,
        "coldDay": [
          24,
          29
        ],
        "night": [
          18,
          23
        ],
        "photo": [
          7,
          20
        ],
        "luxDay": 32000
      }
    },
    "N-DES-04": {
      "zone": "des",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "uromastyx",
        "label": "Fouette-queue (Uromastyx geyri)",
        "hotDay": 45,
        "coldDay": [
          26,
          31
        ],
        "night": [
          20,
          24
        ],
        "photo": [
          7,
          20
        ],
        "luxDay": 45000
      }
    },
    "N-DES-05": {
      "zone": "des",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "eublepharis",
        "label": "Gecko leopard (Eublepharis macularius)",
        "hotDay": 32,
        "coldDay": [
          23,
          27
        ],
        "night": [
          19,
          23
        ],
        "photo": [
          8,
          20
        ],
        "luxDay": 3500
      }
    },
    "N-DES-06": {
      "zone": "des",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "eublepharis",
        "label": "Gecko leopard (Eublepharis macularius)",
        "hotDay": 32,
        "coldDay": [
          23,
          27
        ],
        "night": [
          19,
          23
        ],
        "photo": [
          8,
          20
        ],
        "luxDay": 3500
      }
    },
    "N-TRO-01": {
      "zone": "tro",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "python",
        "label": "Python royal (Python regius)",
        "hotDay": 32,
        "coldDay": [
          25,
          28
        ],
        "night": [
          23,
          26
        ],
        "photo": [
          7,
          19
        ],
        "luxDay": 2500
      }
    },
    "N-TRO-02": {
      "zone": "tro",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "python",
        "label": "Python royal (Python regius)",
        "hotDay": 32,
        "coldDay": [
          25,
          28
        ],
        "night": [
          23,
          26
        ],
        "photo": [
          7,
          19
        ],
        "luxDay": 2500
      }
    },
    "N-TRO-03": {
      "zone": "tro",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "boa",
        "label": "Boa constricteur (Boa imperator)",
        "hotDay": 33,
        "coldDay": [
          25,
          28
        ],
        "night": [
          22,
          25
        ],
        "photo": [
          7,
          19
        ],
        "luxDay": 3000
      }
    },
    "N-TRO-04": {
      "zone": "tro",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "chameleon",
        "label": "Cameleon casque (Chamaeleo calyptratus)",
        "hotDay": 33,
        "coldDay": [
          22,
          27
        ],
        "night": [
          16,
          21
        ],
        "photo": [
          7,
          19
        ],
        "luxDay": 18000
      }
    },
    "N-TRO-05": {
      "zone": "tro",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "iguana",
        "label": "Iguane vert (Iguana iguana)",
        "hotDay": 37,
        "coldDay": [
          26,
          30
        ],
        "night": [
          22,
          26
        ],
        "photo": [
          7,
          19
        ],
        "luxDay": 22000
      }
    },
    "N-TRO-06": {
      "zone": "tro",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "phelsuma",
        "label": "Gecko diurne (Phelsuma grandis)",
        "hotDay": 34,
        "coldDay": [
          24,
          28
        ],
        "night": [
          19,
          23
        ],
        "photo": [
          7,
          19
        ],
        "luxDay": 15000
      }
    },
    "N-QUA-01": {
      "zone": "qua",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "quarantine",
        "label": "Arrivant non identifie (profil conservateur)",
        "hotDay": 32,
        "coldDay": [
          24,
          28
        ],
        "night": [
          21,
          25
        ],
        "photo": [
          8,
          19
        ],
        "luxDay": 6000
      }
    },
    "N-QUA-02": {
      "zone": "qua",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "quarantine",
        "label": "Arrivant non identifie (profil conservateur)",
        "hotDay": 32,
        "coldDay": [
          24,
          28
        ],
        "night": [
          21,
          25
        ],
        "photo": [
          8,
          19
        ],
        "luxDay": 6000
      }
    },
    "N-QUA-03": {
      "zone": "qua",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "quarantine",
        "label": "Arrivant non identifie (profil conservateur)",
        "hotDay": 32,
        "coldDay": [
          24,
          28
        ],
        "night": [
          21,
          25
        ],
        "photo": [
          8,
          19
        ],
        "luxDay": 6000
      }
    },
    "N-QUA-04": {
      "zone": "qua",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "quarantine",
        "label": "Arrivant non identifie (profil conservateur)",
        "hotDay": 32,
        "coldDay": [
          24,
          28
        ],
        "night": [
          21,
          25
        ],
        "photo": [
          8,
          19
        ],
        "luxDay": 6000
      }
    },
    "N-SOI-01": {
      "zone": "soi",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "hospital",
        "label": "Bac hospitalier (temperature stable)",
        "hotDay": 29,
        "coldDay": [
          27,
          29.5
        ],
        "night": [
          26,
          29
        ],
        "photo": [
          8,
          18
        ],
        "luxDay": 1200
      }
    },
    "N-SOI-02": {
      "zone": "soi",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "hospital",
        "label": "Bac hospitalier (temperature stable)",
        "hotDay": 29,
        "coldDay": [
          27,
          29.5
        ],
        "night": [
          26,
          29
        ],
        "photo": [
          8,
          18
        ],
        "luxDay": 1200
      }
    },
    "N-SOI-03": {
      "zone": "soi",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 30,
      "heartbeat": 300,
      "profile": {
        "name": "hospital",
        "label": "Bac hospitalier (temperature stable)",
        "hotDay": 29,
        "coldDay": [
          27,
          29.5
        ],
        "night": [
          26,
          29
        ],
        "photo": [
          8,
          18
        ],
        "luxDay": 1200
      }
    },
    "N-EXT-01": {
      "zone": "ext",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 300,
      "heartbeat": 1800,
      "profile": {
        "name": "tortoise",
        "label": "Tortue d'Hermann (Testudo hermanni), enclos exterieur",
        "hotDay": null,
        "coldDay": null,
        "night": null,
        "photo": null,
        "luxDay": null
      }
    },
    "N-EXT-02": {
      "zone": "ext",
      "sensors": [
        "temp_hot",
        "temp_cold",
        "light"
      ],
      "period": 300,
      "heartbeat": 1800,
      "profile": {
        "name": "tortoise",
        "label": "Tortue d'Hermann (Testudo hermanni), enclos exterieur",
        "hotDay": null,
        "coldDay": null,
        "night": null,
        "photo": null,
        "luxDay": null
      }
    },
    "N-DOOR-MAIN": {
      "zone": "bat",
      "sensors": [],
      "period": 0,
      "heartbeat": 1800
    },
    "N-DOOR-SAS": {
      "zone": "bat",
      "sensors": [],
      "period": 0,
      "heartbeat": 1800
    },
    "N-DOOR-FEED": {
      "zone": "bat",
      "sensors": [],
      "period": 0,
      "heartbeat": 1800
    }
  }
}; if(typeof module==='object'&&module.exports) module.exports=site; else root.ReptileSite=site;})(globalThis);
