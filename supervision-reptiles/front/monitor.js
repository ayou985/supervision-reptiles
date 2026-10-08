'use strict';

// Moteur partage par l'interface et les tests. Aucune dependance au DOM.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ReptileMonitor = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const hours = new Intl.DateTimeFormat('fr-FR', {timeZone:'Europe/Paris',hourCycle:'h23',hour:'numeric',minute:'numeric',second:'numeric'});
  function hourOf(t) { const values=Object.fromEntries(hours.formatToParts(t).map(p=>[p.type,p.value]));return Number(values.hour)+Number(values.minute)/60+Number(values.second)/3600; }
  class Monitor {
    constructor(site, { clock = Date.now, onAck = () => {} } = {}) {
      this.site = site;
      this.clock = clock;
      this.onAck = onAck;
      this.nodes = {};
      this.series = {};
      this.alerts = [];
      this.conditions = {};
      this.seen = new Set();
      this.nowSim = 0;
      this.streamId = null;
      this.bridge = 'inconnu';
      this.connected = false;
      this.resetNodes();
    }

    resetNodes() {
      for (const id of Object.keys(this.site.nodes)) {
        this.nodes[id] = { id, online: false, door: null, doorSince: null,
          readings: {}, battery: null, lastSim: 0, firstSim: 0, lastRecv: 0 };
      }
    }

    condition(key, active, text, simTs = this.nowSim, severity = 'critical') {
      if (active && !this.conditions[key]) {
        this.alerts.unshift({ id: `${key}:${simTs}`, key, text, simTs,
          at: this.clock(), active: true, acked: false, severity });
        this.alerts = this.alerts.slice(0, 2000);
      }
      if (!active && this.conditions[key]) {
        for (const a of this.alerts) if (a.key === key && a.active) {
          a.active = false;
          a.resolvedSim = simTs;
        }
      }
      this.conditions[key] = Boolean(active);
    }

    acknowledge(id) {
      const a = this.alerts.find((item) => item.id === id);
      if (a) a.acked = true;
    }

    feed(topic, m) {
      if (!m || m.v !== 1) return;
      if (topic.endsWith('/bridge/status') && m.type === 'bridge') {
        if (m.online && m.streamId && this.streamId !== m.streamId) {
          if (this.streamId) {
            this.resetNodes(); this.series = {}; this.conditions = {}; this.nowSim = 0;
            for (const a of this.alerts) a.active = false;
          }
          this.streamId = m.streamId;
          this.startSim = m.startSim || m.simTs;
        }
        this.bridge = m.online ? 'en ligne' : `hors ligne (${m.reason || 'lwt'})`;
        this.connected = Boolean(m.online);
      }
      if (Number.isFinite(m.simTs) && m.simTs > 1.5e12) this.nowSim = Math.max(this.nowSim, m.simTs);
      if (m.type === 'bridge' || m.type === 'clock') return;
      if (m.type === 'ack') { this.onAck(m); return; } // Un NACK du pont n'est pas un signe de vie du node.
      const n = this.nodes[m.node];
      if (!n || !['reading', 'heartbeat', 'boot', 'door'].includes(m.type) || !Number.isFinite(m.simTs)) return;
      const identity = m.streamId && Number.isInteger(m.seq) ? `${m.streamId}:${m.seq}` : null;
      if (identity && this.seen.has(identity)) return;
      if (identity) {
        this.seen.add(identity);
        if (this.seen.size > 150000) this.seen.delete(this.seen.values().next().value);
      }
      const t = m.simTs;
      n.lastSim = Math.max(n.lastSim, t);
      n.firstSim ||= t;
      n.lastRecv = m.recvTs || this.clock();
      n.online = true;
      this.condition(`mute:${n.id}`, false, '', t);
      if (m.fw) n.fw = m.fw;
      if (Number.isFinite(m.periodS) && m.periodS > 0) this.site.nodes[n.id].period = m.periodS;
      if (Number.isFinite(m.rssi)) n.rssi = m.rssi;
      if (Number.isFinite(m.battery)) {
        n.battery = m.battery;
        this.condition(`batt:${n.id}`, m.battery < 20, `${n.id} pile faible : ${m.battery} %`, t);
      }
      if (m.ts > 1.5e12) this.condition(`clock:${n.id}`, Math.abs(m.ts - t) > 120000,
        `${n.id} horloge device decalee de plus de 2 min`, t, 'warning');
      if (m.type === 'door' && ['open', 'closed'].includes(m.state)) {
        if (n.door !== m.state) n.doorSince = m.state === 'open' ? t : null;
        n.door = m.state;
        if (m.state === 'closed') this.condition(`door:${n.id}`, false, '', t);
        const h = hourOf(t);
        if (m.state === 'open' && (h >= 20 || h < 7)) {
          this.condition(`night:${n.id}:${t}`, true, `${n.id} ouverture hors horaires`, t);
        }
      }
      if (m.type === 'boot') {
        n.firstSim = t;
        n.readings = {};
        this.condition(`boot:${n.id}:${m.seq}`, true, `${n.id} redemarrage (${m.reason})`, t, 'info');
      }
      if (m.type === 'reading' && this.site.nodes[n.id].sensors.includes(m.sensor)) {
        const previous = n.readings[m.sensor];
        if (!previous || t >= previous.simTs) n.readings[m.sensor] = { ...m };
        this.condition(`sensor:${n.id}:${m.sensor}`, false, '', t);
        this.checkReading(n.id, m);
        if (this.validReading(m)) {
          const key = `${n.id}:${m.sensor}`;
          const points = this.series[key] ||= [];
          points.push({ t, v: m.value });
          this.series[key] = points.filter((p) => p.t >= this.nowSim - 1800000).sort((a, b) => a.t - b.t);
        }
      }
    }

    validReading(m) {
      return Number.isFinite(m.value) && (m.sensor === 'light'
        ? m.value >= 0 && m.value <= 100000 : m.value >= 5 && m.value <= 55);
    }

    checkReading(id, m) {
      const key = `${id}:${m.sensor}`;
      const v = m.value;
      this.condition(`disc:${key}`, v === -127, `${id} ${m.sensor} deconnectee (-127)`, m.simTs);
      this.condition(`por:${key}`, v === 85 && m.sensor !== 'light', `${id} ${m.sensor} valeur POR 85 C`, m.simTs);
      this.condition(`range:${key}`, !this.validReading(m) && v !== -127 && !(v === 85 && m.sensor !== 'light'),
        `${id} ${m.sensor} valeur aberrante : ${String(v)}`, m.simTs);
      // Ne jamais interpreter une sentinelle de panne comme une temperature physique.
      if (!this.validReading(m)) return;
      const sp = this.site.nodes[id].profile;
      if (!sp || sp.hotDay === null) return;
      const hour = hourOf(m.simTs);
      const day = hour >= sp.photo[0] && hour < sp.photo[1];
      if (m.sensor === 'temp_hot') {
        this.condition(`hotlow:${id}`, day && v < sp.hotDay - 6,
          `${id} point chaud ${v} C sous consigne ${sp.hotDay} C`, m.simTs);
        this.condition(`hothigh:${id}`, day && v > sp.hotDay + 5,
          `${id} point chaud ${v} C au-dessus de ${sp.hotDay} C`, m.simTs);
      }
      if (sp.name === 'hospital' && m.sensor.startsWith('temp_')) {
        const bounds = day ? sp.coldDay : sp.night;
        this.condition(`care:${key}`, v < bounds[0] - 0.5 || v > bounds[1] + 0.5,
          `${id} soins intensifs : ${m.sensor} ${v} C hors plage stable`, m.simTs);
      }
      if (m.sensor === 'temp_cold') this.condition(`cold:${id}`,
        day && (v < sp.coldDay[0] - 3 || v > sp.coldDay[1] + 3),
        `${id} point froid ${v} C hors plage jour`, m.simTs);
      if (m.sensor.startsWith('temp_')) this.condition(`nighttemp:${key}`,
        !day && (v < sp.night[0] - 3 || v > sp.night[1] + 3),
        `${id} ${m.sensor} ${v} C hors plage nuit`, m.simTs);
      if (m.sensor === 'light') this.condition(`light:${id}`,
        day && hour > sp.photo[0] + 0.25 && hour < sp.photo[1] - 0.25 && v < sp.luxDay * 0.25,
        `${id} lumiere insuffisante : ${v} lx`, m.simTs);
    }

    scan(nowSim = this.nowSim) {
      this.nowSim = Math.max(this.nowSim, nowSim);
      for (const [id, n] of Object.entries(this.nodes)) {
        const config = this.site.nodes[id];
        const last = n.lastSim || this.startSim || this.nowSim;
        const mute = this.nowSim - last > config.heartbeat * 2000;
        if (this.connected) {
          n.online = !mute && Boolean(n.lastSim);
          this.condition(`mute:${id}`, mute, `${id} node muet`, this.nowSim);
          for (const sensor of config.sensors) {
            const t = n.readings[sensor]?.simTs || n.firstSim;
            this.condition(`sensor:${id}:${sensor}`, !mute && Boolean(t) && this.nowSim - t > config.period * 3000,
              `${id} capteur ${sensor} muet`, this.nowSim);
          }
        }
        this.condition(`door:${id}`, n.door === 'open' && n.doorSince !== null && this.nowSim - n.doorSince >= 180000,
          `${id} porte ouverte depuis au moins 3 min`, this.nowSim);
      }
      for (const key of Object.keys(this.series)) this.series[key] = this.series[key].filter((p) => p.t >= this.nowSim - 1800000);
    }

    export() {
      return { nodes: this.nodes, series: this.series, alerts: this.alerts,
        conditions: this.conditions, nowSim: this.nowSim, streamId: this.streamId, bridge: this.bridge };
    }

    restore(data) {
      if (!data || !data.nodes || !Array.isArray(data.alerts)) return;
      for (const key of ['nodes', 'series', 'alerts', 'conditions', 'nowSim', 'streamId', 'bridge']) {
        if (data[key] !== undefined) this[key] = data[key];
      }
    }
  }
  return { Monitor };
});
