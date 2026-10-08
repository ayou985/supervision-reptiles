'use strict';
const fs=require('node:fs'),path=require('node:path');
const {Simulator}=require('../sim/src/simulator');
const {Monitor}=require('../front/monitor');
const site=structuredClone(require('../front/site'));
const start=Date.parse('2026-10-08T07:45:00+02:00');
const rows=[
 {id:'porte',label:'Porte DES-02 bloquee ouverte',offset:25,key:'door:N-DES-02',node:'N-DES-02'},
 {id:'sonde',label:'Sonde chaude TRO-03 debranchee',offset:40,key:'disc:N-TRO-03:temp_hot',node:'N-TRO-03'},
 {id:'lampe',label:'Lampe DES-04 : lumiere insuffisante',offset:60,key:'light:N-DES-04',node:'N-DES-04'},
 {id:'lampe-thermique',label:'Lampe DES-04 : point chaud bas',offset:60,key:'hotlow:N-DES-04',node:'N-DES-04'},
 {id:'thermostat',label:'Thermostat TRO-05 colle',offset:90,key:'hothigh:N-TRO-05',node:'N-TRO-05'},
 {id:'node',label:'N-QUA-03 hors ligne',offset:105,key:'mute:N-QUA-03',node:'N-QUA-03'},
 {id:'por',label:'Sonde froide SOI-02 : POR 85 C',offset:120,key:'por:N-SOI-02:temp_cold',node:'N-SOI-02'},
 {id:'secteur',label:'Coupure secteur QUA',offset:160,key:'mute:N-QUA-01',node:'N-QUA-01'},
 {id:'horloge',label:'Horloge TRO-06 en derive',offset:0,key:'clock:N-TRO-06',node:'N-TRO-06'},
 {id:'pile',label:'Pile EXT-02 initialement faible',offset:0,key:'batt:N-EXT-02',node:'N-EXT-02'},
 {id:'extinction',label:'EXT-02 eteint apres vidage de la pile',offset:200,key:'mute:N-EXT-02',node:'N-EXT-02'},
 {id:'intrusion',label:'Ouverture nocturne local nourriture',offset:1132.2,key:'night:N-DOOR-FEED:',prefix:true,node:'N-DOOR-FEED'}
];
const output=path.resolve(__dirname,'../docs/validation');fs.mkdirSync(output,{recursive:true});
const sim=new Simulator({scenario:'incidents',seed:42,start,speed:60});
const monitor=new Monitor(site,{clock:()=>start+(sim.now-start)/60});
monitor.feed('reptile/v1/bridge/status',{v:1,type:'bridge',online:true,streamId:'validation-seed-42',startSim:start,simTs:start});
let count=0,death=null;
sim.on('message',m=>{count++;monitor.feed(`reptile/v1/${site.nodes[m.node].zone}/${m.node}/${m.type}`,{v:1,streamId:'validation-seed-42',simTs:sim.now,recvTs:start+(sim.now-start)/60,...m});});
sim.emitAllBoots();
for(let seconds=1;seconds<=19*3600;seconds++) {
  sim.advance(1);monitor.scan(sim.now);
  if(!death&&!sim.nodes.get('N-EXT-02').online)death=sim.now;
  for(const row of rows) {
    if(row.detectedAt)continue;
    const at=start+row.offset*60000;
    const alert=monitor.alerts.find(a=>(row.prefix?a.key.startsWith(row.key):a.key===row.key)&&a.simTs>=at);
    if(alert){row.startedAt=at;row.detectedAt=alert.simTs;row.delayS=(alert.simTs-at)/1000;row.alert=alert.text;
      fs.writeFileSync(path.join(output,row.id+'.json'),JSON.stringify(monitor.export()));}
  }
}
const dead=rows.find(r=>r.id==='extinction');if(death){dead.physicalDeathAt=death;dead.delaySincePhysicalDeathS=(dead.detectedAt-death)/1000;}
const result={scenario:'incidents',seed:42,start:new Date(start).toISOString(),stepS:1,messages:count,method:'Rejeu deterministe des messages du modele original dans le moteur utilise par le front ; delais en secondes simulees.',rows};
fs.writeFileSync(path.join(output,'incidents.json'),JSON.stringify(result,null,2));
for(const r of rows) console.log(r.id,r.detectedAt?new Date(r.detectedAt).toISOString():'NON DETECTE',r.delayS);
console.log('Messages:',count,'| All detected:',rows.every(r=>r.detectedAt));
if(rows.some(r=>!r.detectedAt))process.exitCode=1;
