'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Monitor}=require('../../front/monitor');
const site=require('../../front/site');
const start=Date.parse('2026-10-08T07:45:00+02:00');
function fresh(){const m=new Monitor(structuredClone(site));m.feed('reptile/v1/bridge/status',{v:1,type:'bridge',online:true,streamId:'test',startSim:start,simTs:start});return m;}
function message(m,data){m.feed('reptile/v1/tro/N-TRO-03/reading',{v:1,node:'N-TRO-03',type:'reading',sensor:'temp_hot',value:33,unit:'C',ts:start,simTs:start,recvTs:Date.now(),...data});}
test('les sentinelles DS18B20 ne declenchent pas une alerte thermique',()=>{
  const m=fresh();message(m,{value:-127});message(m,{value:85});
  assert(m.alerts.some(a=>a.key.startsWith('disc:')));assert(m.alerts.some(a=>a.key.startsWith('por:')));
  assert(!m.alerts.some(a=>a.key.startsWith('hotlow:')||a.key.startsWith('hothigh:')));
});
test('acquittement stable, resolution distincte et nouvelle occurrence apres retour normal',()=>{
  const m=fresh();message(m,{value:45});const id=m.alerts[0].id;m.acknowledge(id);
  message(m,{value:45,simTs:start+30000});assert.equal(m.alerts.length,1);assert(m.alerts[0].acked);
  message(m,{value:33,simTs:start+60000});assert.equal(m.alerts[0].active,false);
  message(m,{value:45,simTs:start+90000});assert.equal(m.alerts.length,2);assert.equal(m.alerts[0].acked,false);
});
test('horloge canonique protege les courbes apres reboot et derive device',()=>{
  const m=fresh();message(m,{ts:4000,value:33,simTs:start+60000});message(m,{ts:start+1200000,simTs:start+90000,value:34});
  assert.deepEqual(m.series['N-TRO-03:temp_hot'].map(p=>p.t),[start+60000,start+90000]);
  m.scan(start+2000000);assert.equal(m.series['N-TRO-03:temp_hot'].length,0);
});
test('porte dupliquee ne remet pas son compteur a zero et toutes les portes sont surveillees',()=>{
  const m=fresh(),base={v:1,node:'N-DOOR-MAIN',type:'door',state:'open',simTs:start,streamId:'test',seq:1};
  m.feed('reptile/v1/bat/N-DOOR-MAIN/event',base);m.feed('reptile/v1/bat/N-DOOR-MAIN/event',{...base,simTs:start+170000});
  m.scan(start+180000);assert(m.alerts.some(a=>a.key==='door:N-DOOR-MAIN'));
});
test('capteur muet distingue d un node vivant et bornes de lumiere controlees',()=>{
  const m=fresh();message(m,{});message(m,{type:'heartbeat',simTs:start+95000});m.scan();
  assert(m.alerts.some(a=>a.key==='sensor:N-TRO-03:temp_hot'));
  assert(!m.alerts.some(a=>a.key==='mute:N-TRO-03'));
  message(m,{sensor:'light',value:100001,simTs:start+96000});assert(m.alerts.some(a=>a.key==='range:N-TRO-03:light'));
});
test('un NACK du pont ne remet pas en ligne un node muet',()=>{
  const m=fresh();m.nodes['N-TRO-03'].online=false;message(m,{type:'ack',ok:false,detail:'unreachable'});assert.equal(m.nodes['N-TRO-03'].online,false);
});
test('un node jamais observe est declare muet apres la periode de grace',()=>{
  const m=fresh();m.scan(start+600001);assert(m.alerts.some(a=>a.key==='mute:N-DES-01'));
});

test('soins intensifs : controle de stabilite plus strict que les autres enclos',()=>{
 const m=fresh();message(m,{node:'N-SOI-01',sensor:'temp_hot',value:31});assert(m.alerts.some(a=>a.key==='care:N-SOI-01:temp_hot'));
});
