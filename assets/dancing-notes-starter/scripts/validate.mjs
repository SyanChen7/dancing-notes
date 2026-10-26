import {projectPath, publicAsset} from './paths.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const d=JSON.parse(fs.readFileSync(projectPath('src/score-data.json')));
assert.ok(Array.isArray(d.events)&&Array.isArray(d.activations)&&d.events.length&&d.activations.length,'Empty template: first generate your own score-data.json.');
for(const k of ['musicDuration','width','height'])assert.ok(Number.isFinite(d[k])&&d[k]>0,'Invalid '+k);
function checkNotes(notes,label){
 const ids=new Map();
 for(const [i,n] of notes.entries()){
  const at=`${label}[${i}]`;
  assert.ok(n&&typeof n==='object',at+': expected note object');
  for(const k of ['time','duration','pitch','velocity','x','y','system'])assert.ok(Number.isFinite(n[k]),at+': invalid '+k);
  assert.ok(n.time>=0&&n.time<d.musicDuration,at+': time outside music duration');
  assert.ok(n.duration>=0,at+': negative duration');
  assert.ok([1,2].includes(n.staff),at+': staff must be 1 or 2');
  assert.ok(Number.isInteger(n.pitch)&&n.pitch>=0&&n.pitch<=127,at+': invalid MIDI pitch');
  assert.ok(n.velocity>0&&n.velocity<=127,at+': invalid MIDI velocity');
  assert.ok(Number.isInteger(n.system)&&n.system>=0,at+': invalid system');
  for(const k of ['scoreId','eventId'])assert.ok(typeof n[k]==='string'&&n[k].trim(),at+': missing '+k);
  assert.ok(!ids.has(n.eventId),at+': duplicate eventId '+n.eventId);
  assert.ok(['attack','sustain'].includes(n.kind),at+': invalid kind');
  assert.ok(n.x>=0&&n.x<=d.width&&n.y>=0&&n.y<=d.height,at+': note outside score bounds');
  ids.set(n.eventId,n);
 }
 return ids;
}
const activations=checkNotes(d.activations,'activations');
const events=checkNotes(d.events,'events');
for(const e of events.values()){
 const a=activations.get(e.eventId);
 assert.ok(a,'MIDI event missing activation: '+e.eventId);
 assert.ok(e.kind==='attack'&&a.kind==='attack','MIDI event must match an attack activation: '+e.eventId);
 for(const k of ['scoreId','staff','pitch','system'])assert.equal(a[k],e[k],e.eventId+': activation mismatch in '+k);
 for(const k of ['time','duration','velocity','x','y'])assert.ok(Math.abs(a[k]-e[k])<=1e-6,e.eventId+': activation mismatch in '+k);
}
// Sustain feedback may be extra; every attack must represent an actual event.
for(const a of activations.values())if(a.kind==='attack')assert.ok(events.has(a.eventId),'Attack activation missing MIDI event: '+a.eventId);
assert.ok(Array.isArray(d.camera)&&d.camera.length>0,'Camera path is required');
d.camera.forEach((k,i)=>{
 assert.ok([k.time,k.x,k.y].every(Number.isFinite));
 if(i)assert.ok(k.time>d.camera[i-1].time,'Camera times must strictly increase');
});
for(const field of ['svgPath','audioPath']){
 publicAsset(d[field], field);
}
console.log('PASS: data structure and required assets. Still audit MIDI/MXL mapping and render framing separately.');
