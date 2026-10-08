'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {EventEmitter}=require('node:events');const {Simulator}=require('../src/simulator');const {createMqttOutput,zoneOf}=require('../src/outputs/mqtt');
function rig(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'reptile-test-'));const c=new EventEmitter();c.connected=false;c.sent=[];c.publish=(t,p,o,cb)=>{c.sent.push({t,m:JSON.parse(p),o});if(cb)queueMicrotask(()=>cb(null));};c.subscribe=(t,o,cb)=>cb(null,[{qos:1}]);c.end=(force,cb)=>cb?.();let now=1700000000000;const sim=new Simulator({scenario:'normal',seed:42,start:Date.parse('2026-10-08T07:45:00+02:00')});const out=createMqttOutput({MQTT_SPOOL_DIR:dir,MQTT_BUFFER_MAX:'4'},{connect:()=>c,clock:()=>now});out.start(sim);return{c,sim,out,dir,now,finish:async()=>{await out.stop();fs.rmSync(dir,{recursive:true,force:true});}};}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('routage des trois classes de nodes',()=>{assert.equal(zoneOf('N-ROOM-QUA'),'qua');assert.equal(zoneOf('N-DOOR-SAS'),'bat');assert.equal(zoneOf('N-DES-01'),'des');});
test('tampon journalise conserve lectures et evenements au dela du seuil puis vide apres PUBACK',async()=>{
  const r=rig();try{for(let i=0;i<20;i++)r.sim.emit('message',{node:'N-DES-01',seq:i,type:'reading',sensor:'temp_hot',value:i});
  assert.equal(r.out.diagnostics().buffered,20);assert.equal(fs.readFileSync(r.out.diagnostics().journal,'utf8').trim().split('\n').length,20);
  r.c.connected=true;r.c.emit('connect');await tick();assert.equal(r.out.diagnostics().buffered,0);
  assert.equal(r.c.sent.filter(p=>p.m.type==='reading').length,20);assert(r.c.sent.filter(p=>p.m.type==='reading').every(p=>p.o.qos===1));
  }finally{await r.finish();}
});
test('rejeu QoS1 commande identique execute une fois, commande expiree refusee',async()=>{
  const r=rig();try{r.c.connected=true;r.c.emit('connect');let count=0;const original=r.sim.handleCommand.bind(r.sim);r.sim.handleCommand=c=>{count++;return original(c);};
  const cmd={v:1,id:'c1',target:'N-DES-01',action:'identify',createdAt:r.now,expiresAt:r.now+8000};
  const send=x=>r.c.emit('message','reptile/v1/des/N-DES-01/cmd',Buffer.from(JSON.stringify(x)),{retain:false});send(cmd);send(cmd);
  send({...cmd,id:'old',createdAt:r.now-10000,expiresAt:r.now-2000});send({...cmd,id:'null',value:null,v:2});await tick();assert.equal(count,1);
  assert(r.c.sent.some(p=>p.m.detail==='expired'));assert.equal(r.c.sent.filter(p=>p.m.cmdId==='c1').length,2);
  }finally{await r.finish();}
});
test('JSON null, zone incorrecte, commande retenue et cible hors ligne ne font pas planter le pont',async()=>{
  const r=rig();try{r.c.connected=true;r.c.emit('connect');const t='reptile/v1/des/N-DES-01/cmd';
  r.c.emit('message',t,Buffer.from('null'),{});
  const cmd={v:1,id:'c2',target:'N-DES-01',action:'reboot',createdAt:r.now,expiresAt:r.now+8000};
  r.c.emit('message',t,Buffer.from(JSON.stringify(cmd)),{retain:true});
  r.sim.setOffline('N-DES-01',120);r.c.emit('message',t,Buffer.from(JSON.stringify({...cmd,id:'c3'})),{});
  await tick();assert(r.c.sent.some(p=>p.m.detail==='unreachable'));assert(r.c.sent.some(p=>p.m.detail==='retained_command'));
  }finally{await r.finish();}
});
