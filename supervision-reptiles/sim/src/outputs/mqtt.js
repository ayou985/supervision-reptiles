'use strict';
const mqtt = require('mqtt');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function zoneOf(id) {
  if (id.startsWith('N-ROOM-')) return id.slice(7).toLowerCase();
  if (id.startsWith('N-DOOR-')) return 'bat';
  return id.startsWith('N-') ? id.slice(2).split('-')[0].toLowerCase() : 'unk';
}
function createMqttOutput(env = process.env, { connect = mqtt.connect, clock = Date.now } = {}) {
  const root = (env.MQTT_TOPIC_ROOT || 'reptile/v1').replace(/\/+$/, '');
  if (!root || /[+#]/.test(root)) throw new Error('MQTT_TOPIC_ROOT invalide');
  const clientId = env.MQTT_CLIENT_ID || 'sim-adapter';
  const bufferWarning = Number(env.MQTT_BUFFER_MAX || 150000);
  const keepalive = Number(env.MQTT_KEEPALIVE || 15);
  if (!Number.isFinite(bufferWarning) || bufferWarning < 1 || !Number.isFinite(keepalive) || keepalive < 1) throw new Error('Configuration MQTT invalide');
  const dir = env.MQTT_SPOOL_DIR || path.resolve(__dirname, '../../data');
  fs.mkdirSync(dir, { recursive: true });
  const journal = path.join(dir, 'outbox.ndjson');
  const streamId = randomUUID();
  let queue = [], head = 0, client, sim, handler, timer, stopping = false, warned = false;
  const inflight = new Set(), commands = new Map();
  if (fs.existsSync(journal)) queue = fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
  const topic = (id, kind) => `${root}/${zoneOf(id)}/${id}/${kind}`;
  const wrap = m => ({ v: 1, streamId, simTs: sim.now, recvTs: clock(), periodS: sim.nodes.get(m.node)?.period, ...m });
  const status = (online, reason) => ({ v: 1, type: 'bridge', online, reason,
    streamId, simTs: sim.now, startSim: sim.startedAt, recvTs: clock(), speed: sim.speed,
    buffered: queue.length - head });
  const stderr = s => process.stderr.write(`[mqtt] ${s}\n`);

  function pump() {
    if (!client?.connected || stopping) return;
    for (let i = head; i < queue.length && inflight.size < 32; i++) {
      const item = queue[i];
      if (item.acked || inflight.has(item.mid)) continue;
      inflight.add(item.mid);
      client.publish(item.topic, item.payload, { qos: 1, retain: item.retain }, err => {
        inflight.delete(item.mid);
        if (err) { stderr(`publication en attente : ${err.message}`); return; }
        item.acked = true;
        while (head < queue.length && queue[head].acked) head++;
        if (head === queue.length) {
          queue = []; head = 0;
          // Le journal reste intact tant que TOUTES les publications n'ont pas recu leur PUBACK.
          fs.writeFileSync(journal, ''); warned = false;
        } else if (head > 1024) { queue = queue.slice(head); head = 0; }
        pump();
      });
    }
  }
  function publishMessage(m, kind) {
    const body = wrap(m);
    const item = { mid: randomUUID(), topic: topic(m.node, kind), payload: JSON.stringify(body),
      retain: kind === 'status' || (kind === 'event' && m.type === 'door') };
    // Toutes les lectures sont conservees : une lecture perdue peut cacher une alerte thermique.
    fs.appendFileSync(journal, JSON.stringify(item) + '\n');
    queue.push(item);
    if (!warned && queue.length - head >= bufferWarning) { warned = true; stderr('seuil de tampon atteint ; journal conserve, aucun message evince'); }
    pump();
  }
  function nack(node, cmd, detail) {
    const ack = { node, type: 'ack', cmdId: cmd?.id || null, action: cmd?.action || null, ok: false, detail };
    publishMessage(ack, 'ack');
    return ack;
  }
  function command(t, buf, packet = {}) {
    let cmd;
    try { cmd = JSON.parse(buf.toString()); } catch (_) { stderr('commande JSON illisible'); return; }
    const parts = t.split('/'), node = parts.at(-2);
    if (parts.at(-1) !== 'cmd' || t !== topic(node, 'cmd')) return;
    if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) { nack(node, {}, 'bad_message'); return; }
    if (cmd.v !== 1 || typeof cmd.id !== 'string' || !cmd.id.length || cmd.id.length > 100 || cmd.target !== node) { nack(node, cmd, 'bad_message'); return; }
    if (packet.retain) { nack(node, cmd, 'retained_command'); return; }
    const fingerprint = JSON.stringify([cmd.target, cmd.action, cmd.value, cmd.createdAt, cmd.expiresAt]);
    const old = commands.get(cmd.id);
    if (old) {
      if (old.fingerprint !== fingerprint) nack(node, cmd, 'id_conflict');
      else if (old.ack) publishMessage(old.ack, 'ack');
      return;
    }
    const now = clock();
    if (!Number.isFinite(cmd.createdAt) || !Number.isFinite(cmd.expiresAt) || cmd.expiresAt <= cmd.createdAt || cmd.expiresAt - cmd.createdAt > 8000 || cmd.createdAt > now + 30000) { nack(node, cmd, 'bad_expiry'); return; }
    if (cmd.expiresAt <= now) { nack(node, cmd, 'expired'); return; }
    if (!['lamp', 'light', 'setpoint', 'safety_cut', 'interval', 'reboot', 'identify'].includes(cmd.action)) { nack(node, cmd, 'unknown_action'); return; }
    if (cmd.action === 'safety_cut' && typeof cmd.value !== 'boolean') { nack(node, cmd, 'bad_value'); return; }
    commands.set(cmd.id, { fingerprint, at: now, ack: null });
    for (const [id, entry] of commands) if (now - entry.at > 3600000) commands.delete(id);
    if (commands.size > 20000) commands.delete(commands.keys().next().value);
    const result = sim.handleCommand(cmd);
    if (result === null) commands.get(cmd.id).ack = nack(node, cmd, 'unreachable');
  }
  return {
    start(simulator) {
      sim = simulator;
      handler = m => {
        const kind = m.type === 'reading' ? 'reading' : m.type === 'ack' ? 'ack' : ['heartbeat', 'boot'].includes(m.type) ? 'status' : 'event';
        if (m.type === 'ack' && commands.has(m.cmdId)) commands.get(m.cmdId).ack = m;
        publishMessage(m, kind);
      };
      sim.on('message', handler);
      client = connect(env.MQTT_URL || 'mqtt://127.0.0.1:1883', {
        clientId, username: env.MQTT_USERNAME || 'sim', password: env.MQTT_PASSWORD || 'sim-pass',
        clean: false, protocolVersion: 4, keepalive, reconnectPeriod: 1000, connectTimeout: 8000,
        will: { topic: `${root}/bridge/status`, payload: JSON.stringify({v:1,type:'bridge',online:false,reason:'lwt'}), qos:1,retain:true }
      });
      client.on('connect', () => {
        stderr(`connecte clientId=${clientId}`);
        client.publish(`${root}/bridge/status`, JSON.stringify(status(true, 'connected')), {qos:1,retain:true});
        client.subscribe(`${root}/+/+/cmd`, {qos:1}, (err, granted) => {
          if (err || granted?.some(g => g.qos === 128)) stderr('abonnement aux commandes refuse');
        });
        pump();
      });
      client.on('message', command);
      client.on('offline', () => stderr('hors ligne ; conservation dans le journal'));
      client.on('error', err => stderr(err.message));
      timer = setInterval(() => {
        if (client.connected && !stopping) client.publish(`${root}/bridge/clock`, JSON.stringify({v:1,type:'clock',simTs:sim.now,recvTs:clock(),streamId}), {qos:0,retain:false});
        pump();
      }, 1000);
    },
    async stop() {
      stopping = true; clearInterval(timer);
      if (handler) sim.off('message', handler);
      if (!client) return;
      await new Promise(resolve => {
        const deadline = setTimeout(() => { client.end(true); resolve(); }, 3000);
        const finish = () => client.end(false, () => { clearTimeout(deadline); resolve(); });
        if (client.connected) client.publish(`${root}/bridge/status`, JSON.stringify(status(false, 'shutdown')), {qos:1,retain:true}, finish);
        else { client.end(true); clearTimeout(deadline); resolve(); }
      });
    },
    diagnostics() { return {buffered:queue.length-head, inflight:inflight.size, journal, streamId}; }
  };
}
module.exports = { createMqttOutput, zoneOf };
