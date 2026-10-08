'use strict';
const $ = (id) => document.getElementById(id);
const state = { selected: 'N-DES-01', chart: 'temp_hot', pending: new Map(), client: null };
const monitor = new ReptileMonitor.Monitor(ReptileSite, { onAck });
const CACHE = 'reptile-monitor-v2';
try { monitor.restore(JSON.parse(localStorage.getItem(CACHE))); } catch (_) {}
let scheduled = false;
function requestRender() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; render(); });
}
function onAck(m) {
  const p = state.pending.get(m.cmdId);
  if (!p || p.target !== m.node) return;
  p.done = true;
  p.ok = m.ok;
  p.detail = m.detail;
  if (m.ok && p.action === 'interval') ReptileSite.nodes[p.target].period = p.value;
  if (m.ok && p.action === 'setpoint') ReptileSite.nodes[p.target].profile.hotDay = p.value;
  log(`${m.node} ACK ${m.action} : ${m.ok ? 'OK' : 'REFUS'} (${m.detail})`);
}
function feed(topic, m) {
  monitor.feed(topic, m);
  monitor.scan();
  requestRender();
}
function scan() {
  monitor.scan();
  for (const p of state.pending.values()) if (!p.done && Date.now() >= p.expiresAt) {
    p.done = true;
    log(`${p.target} ${p.action} : absence d'acquittement apres 8 s`);
  }
  requestRender();
  try { localStorage.setItem(CACHE, JSON.stringify(monitor.export())); } catch (_) {}
}
function time(t) { return t > 1.5e12 ? new Date(t).toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris'}) : 'non synchro'; }
function text(parent, tag, value, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = value;
  parent.appendChild(el);
  return el;
}
function render() {
  const nodes = Object.values(monitor.nodes);
  $('k-nodes').textContent = `${nodes.filter(n => n.online).length}/${nodes.length}`;
  $('k-alerts').textContent = monitor.alerts.filter(a => !a.acked && a.severity !== 'info').length;
  $('k-doors').textContent = nodes.filter(n => n.door === 'open').length;
  $('k-bridge').textContent = monitor.bridge;
  $('simclock').textContent = time(monitor.nowSim);
  $('plan').replaceChildren();
  for (const info of Object.values(ReptileSite.zones)) {
    const zone = document.createElement('div');
    zone.className = 'zone';
    text(zone, 'h2', info.label);
    const tiles = document.createElement('div');
    tiles.className = 'tiles';
    for (const id of info.nodes) {
      const n = monitor.nodes[id];
      const sp = ReptileSite.nodes[id].profile;
      const tile = document.createElement('button');
      tile.type = 'button'; tile.dataset.node = id;
      const hotReading=n.readings.temp_hot;
      const high = hotReading && monitor.validReading(hotReading) && monitor.conditions[`hothigh:${id}`];
      const low = hotReading && monitor.validReading(hotReading) && monitor.conditions[`hotlow:${id}`];
      tile.className = ['tile', id === state.selected ? 'selected' : '', !n.online ? 'down' : '',
        n.door === 'open' ? 'open' : '', high ? 'hot' : low ? 'cold' : ''].filter(Boolean).join(' ');
      text(tile, 'span', id, 'id');
      text(tile, 'span', sp?.name || (id.startsWith('N-ROOM-') ? 'ambiance' : 'batiment'), 'sp');
      const r = n.readings.temp_hot || n.readings.temp_ambient;
      text(tile, 'span', r ? (monitor.validReading(r) ? `${r.value}°` : 'sonde HS') : n.battery !== null ? `${n.battery}%` : '—', 'val');
      text(tile, 'span', `${n.online ? 'en ligne' : 'muet / inconnu'} · ${n.door === 'open' ? 'porte ouverte' : n.door === 'closed' ? 'porte fermee' : 'porte inconnue'}`, 'sub');
      tile.onclick = () => { state.selected = id; render(); };
      tiles.appendChild(tile);
    }
    zone.appendChild(tiles); $('plan').appendChild(zone);
  }
  const n = monitor.nodes[state.selected];
  const sp = ReptileSite.nodes[state.selected].profile;
  $('title').textContent = state.selected;
  $('species').textContent = sp ? `${sp.label} · consigne jour ${sp.hotDay ?? 'exterieur'} °C` : 'Ambiance / porte de salle ou de batiment';
  $('readings').replaceChildren();
  for (const [sensor, r] of Object.entries(n.readings)) {
    const tr = document.createElement('tr');
    for (const value of [sensor, `${r.value} ${r.unit}`, time(r.ts), time(r.recvTs)]) text(tr, 'td', value);
    $('readings').appendChild(tr);
  }
  if (n.battery !== null) {
    const tr = document.createElement('tr');
    for (const v of ['pile', `${n.battery} %`, '', '']) text(tr, 'td', v);
    $('readings').appendChild(tr);
  }
  document.querySelectorAll('[data-series]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.series === state.chart)));
  $('alerts').replaceChildren();
  const mode = $('alert-filter').value;
  const list = monitor.alerts.filter(a => mode === 'all' || (mode === 'active' ? a.active : !a.acked));
  if (!list.length) text($('alerts'), 'p', 'Aucune alerte dans cette vue.');
  for (const a of list.slice(0, 100)) {
    const div = document.createElement('div');
    div.className = `alert${a.acked ? ' acked' : ''}${!a.active ? ' resolved' : ''}`;
    div.dataset.key = a.key;
    text(div, 'strong', a.text);
    text(div, 'div', `${time(a.simTs)} simulee · ${a.active ? 'active' : 'resolue'}${a.acked ? ' · acquittee' : ''}`, 'when');
    if (!a.acked) {
      const b = text(div, 'button', 'Acquitter'); b.type = 'button';
      b.onclick = () => { monitor.acknowledge(a.id); scan(); };
    }
    $('alerts').appendChild(div);
  }
  draw();
}
function draw() {
  const canvas = $('chart'), ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, w, h);
  const pts = monitor.series[`${state.selected}:${state.chart}`] || [];
  ctx.fillStyle = '#6e675c'; ctx.font = '12px Segoe UI, sans-serif';
  if (pts.length < 2) { ctx.fillText('30 dernieres minutes simulees — attente de mesures valides', 12, 28); return; }
  const t1 = monitor.nowSim, t0 = t1 - 1800000;
  let min = Math.min(...pts.map(p => p.v)), max = Math.max(...pts.map(p => p.v));
  const sp = ReptileSite.nodes[state.selected].profile;
  const target = state.chart === 'temp_hot' ? sp?.hotDay : null;
  if (target) { min = Math.min(min, target - 1); max = Math.max(max, target + 1); }
  if (min === max) { min -= 1; max += 1; }
  const x = t => 50 + (t - t0) / (t1 - t0) * (w - 65);
  const y = v => 16 + (1 - (v - min) / (max - min)) * (h - 48);
  ctx.strokeStyle = '#e4ddd2'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) { ctx.beginPath();ctx.moveTo(50, 16 + i / 3 * (h - 48));ctx.lineTo(w - 12, 16 + i / 3 * (h - 48));ctx.stroke(); }
  if (target) { ctx.strokeStyle = '#c4a574';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(50,y(target));ctx.lineTo(w-12,y(target));ctx.stroke();ctx.setLineDash([]); }
  ctx.strokeStyle = '#a24b32';ctx.lineWidth = 1.8;ctx.beginPath();
  pts.forEach((p,i) => i ? ctx.lineTo(x(p.t),y(p.v)) : ctx.moveTo(x(p.t),y(p.v)));ctx.stroke();
  ctx.fillStyle = '#1b1916';ctx.fillText(max.toFixed(1),5,20);ctx.fillText(min.toFixed(1),5,h-28);
  ctx.fillText(`${state.chart} · ${time(t0)} – ${time(t1)}`,50,h-8);
}
function log(line) { $('log').textContent = `${time(Date.now())} ${line}\n${$('log').textContent}`.slice(0,6000); }
function connect() {
  if (state.client) state.client.end(true);
  let id = sessionStorage.getItem('reptile-front-clientId');
  if (!id) { id = `front-${crypto.randomUUID()}`;sessionStorage.setItem('reptile-front-clientId',id); }
  const host = $('host').value.trim() || location.hostname || '127.0.0.1';
  const url = /^(ws|wss):\/\//.test(host) ? host : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${host}:9001`;
  const client = mqtt.connect(url, { clientId:id, username:$('user').value, password:$('pass').value,
    reconnectPeriod:1000, clean:false, keepalive:15, connectTimeout:8000, protocolVersion:4 });
  state.client = client;
  const badge = $('conn');
  client.on('connect', () => {
    monitor.connected = true;badge.className='on';badge.textContent='broker connecte';
    client.subscribe('reptile/v1/#',{qos:1},(err,granted)=>{
      if(err || granted?.some(g=>g.qos===128)) log('Abonnement refuse par le broker');
    });
  });
  client.on('reconnect', () => { badge.className='wait';badge.textContent='reconnexion…'; });
  client.on('offline', () => { monitor.connected=false;badge.className='off';badge.textContent='broker hors ligne';requestRender(); });
  client.on('error', err => { badge.className='off';badge.textContent=err.message; });
  client.on('message',(topic,buf)=>{ try {feed(topic,JSON.parse(buf.toString()));} catch(err){log(`Message ignore : ${err.message}`);} });
}
function sendCmd() {
  if (!state.client?.connected) return log('Broker non connecte');
  const target=state.selected, action=$('action').value;
  let value=$('value').value.trim();
  if (action==='safety_cut') { if(!['true','false','on','off'].includes(value)) return log('safety_cut : true / false ou on / off');value=['true','on'].includes(value); }
  else if (['setpoint','interval'].includes(action)) {
    const v=Number(value), limits=action==='setpoint'?[20,50]:[5,3600];
    if(value==='' || !Number.isFinite(v) || v<limits[0] || v>limits[1]) return log(`${action} : valeur ${limits.join(' a ')}`);value=v;
  } else if (['lamp','light'].includes(action) && !['on','off','auto'].includes(value)) return log(`${action} : on, off ou auto`);
  const id=`c-${crypto.randomUUID()}`, createdAt=Date.now(), expiresAt=createdAt+8000;
  const cmd={v:1,id,target,action,value,createdAt,expiresAt};
  state.pending.set(id,{target,action,value,expiresAt,done:false});
  if(state.pending.size>200) state.pending.delete(state.pending.keys().next().value);
  state.client.publish(`reptile/v1/${ReptileSite.nodes[target].zone}/${target}/cmd`,JSON.stringify(cmd),{qos:1,retain:false},err=>{if(err) log(`Publication refusee : ${err.message}`);});
  log(`CMD ${id.slice(0,12)} ${target} ${action}=${value} (expiration 8 s)`);
}
$('export').onclick=()=>{
  const blob=new Blob([JSON.stringify(monitor.export(),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='releve-incidents.json';a.click();URL.revokeObjectURL(url);
};
$('alert-filter').onchange=render;
document.querySelectorAll('[data-series]').forEach(b=>{b.onclick=()=>{state.chart=b.dataset.series;draw();};});
$('send').onclick=sendCmd;$('reconnect').onclick=connect;$('host').value=location.hostname||'127.0.0.1';
window.reptileApp={monitor,state,feed,scan,render}; // Point d'inspection pour la validation reproductible.
connect();setInterval(scan,1000);render();
