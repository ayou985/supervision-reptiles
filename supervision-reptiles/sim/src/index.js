#!/usr/bin/env node
'use strict';

const { parseArgs } = require('node:util');
const { Simulator } = require('./simulator');
const { createConsoleOutput } = require('./outputs/console');
const { createMqttOutput } = require('./outputs/mqtt');

const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: process.env.SEED || '42' },
    speed: { type: 'string', default: process.env.SPEED || '60' },
    scenario: { type: 'string', default: process.env.SCENARIO || 'incidents' },
    output: { type: 'string', default: process.env.OUTPUT || 'console' },
    format: { type: 'string', default: 'pretty' },
    start: { type: 'string', default: process.env.START },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log(`Usage : node src/index.js [options]
  --seed <n>          graine aleatoire (defaut 42)
  --speed <n>         acceleration du temps (defaut 60 : 1 s reelle = 1 min simulee)
  --scenario <nom>    normal | incidents | chaos (defaut incidents)
  --output <nom>      console | mqtt | both (defaut console)
  --format <f>        pretty | json (sortie console)
  --start <iso>       date/heure de depart simulee (defaut : aujourd'hui 07:45)

Variables MQTT : MQTT_URL MQTT_USERNAME MQTT_PASSWORD MQTT_CLIENT_ID MQTT_TOPIC_ROOT`);
  process.exit(0);
}

if (!Number.isFinite(Number(values.speed)) || Number(values.speed) <= 0 || !Number.isFinite(Number(values.seed)) || !['normal','incidents','chaos'].includes(values.scenario) || (values.start && !Number.isFinite(Date.parse(values.start)))) {
  console.error('Parametres invalides : speed > 0, seed numerique, scenario valide, start ISO.');
  process.exit(1);
}

const sim = new Simulator({
  seed: Number(values.seed),
  speed: Number(values.speed),
  scenario: values.scenario,
  start: values.start ? Date.parse(values.start) : undefined,
});

const outputs = {
  console: () => createConsoleOutput({ format: values.format }),
  mqtt: () => createMqttOutput(),
};

const selected = values.output === 'both' ? ['console', 'mqtt'] : [values.output];
for (const name of selected) {
  if (!outputs[name]) {
    console.error(`Sortie inconnue : ${values.output}`);
    process.exit(1);
  }
}

const adapters = selected.map((name) => outputs[name]());
for (const out of adapters) out.start(sim);
sim.start(1000);

let shuttingDown = false;
const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  sim.stop();
  await Promise.all(adapters.map(out => out.stop()));
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
