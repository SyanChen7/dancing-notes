import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import ts from 'typescript';
import {projectPath} from './paths.mjs';

// Load the actual motion module using the already-declared TypeScript dependency.
const module = {exports: {}};
const compiled = ts.transpileModule(fs.readFileSync(projectPath('src/performance.ts'), 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;
new Function('require', 'exports', compiled)(() => ({FPS: 30, INTRO_FRAMES: 5, SCORE_SCALE: 0.01}), module.exports);
const {activeRingsAt} = module.exports;
const note = (eventId, time, scoreId = 'head') => ({
  eventId, time, scoreId, duration: 0.4, pitch: 60, velocity: 80,
  staff: 1, system: 0, x: 100, y: 100, kind: 'attack',
});

test('unsorted repeated noteheads select the latest actual trigger', () => {
  const old = note('old', 0), recent = note('recent', 1), future = note('future', 2);
  for (const notes of [[old, recent, future], [recent, future, old], [future, old, recent]]) {
    assert.deepEqual(activeRingsAt(notes, 1.2).map(n => n.eventId), ['recent']);
    assert.deepEqual(activeRingsAt(notes, 0.5).map(n => n.eventId), ['old']);
  }
});

test('ties, independent noteheads and ring lifetime preserve V7 behavior', () => {
  const notes = [note('a', 0), note('b', 0), note('other', 0, 'other-head')];
  assert.deepEqual(activeRingsAt(notes, 0).map(n => n.eventId), ['b', 'other']);
  assert.equal(activeRingsAt(notes, -0.01).length, 0);
  assert.equal(activeRingsAt(notes, 3.6).length, 2);
  assert.equal(activeRingsAt(notes, 3.6001).length, 0);
});

test('chronologically ordered inputs match the original V7 filter at every frame', () => {
  const notes = [note('a', 0), note('b', 0.5, 'second'), note('c', 1), note('d', 1), note('e', 2)];
  for (let frame = -5; frame <= 180; frame++) {
    const t = frame / 30;
    const original = notes.filter((n, i, all) => t >= n.time && t - n.time <= 3.6 &&
      !all.some((other, j) => j > i && other.scoreId === n.scoreId && other.time <= t));
    assert.deepEqual(activeRingsAt(notes, t), original);
  }
});

function fixture() {
  const attack = note('e0', 0);
  return {
    musicDuration: 4, width: 1000, height: 1000,
    events: [{...attack}], activations: [{...attack}, {...note('tie0', 1, 'tie-head'), kind: 'sustain'}],
    camera: [{time: -0.2, x: 100, y: 100}, {time: 4, x: 200, y: 100}],
    svgPath: 'score/score.svg', audioPath: 'score/piano.wav',
  };
}

function validate(data) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dancing-notes-regression-'));
  try {
    fs.mkdirSync(path.join(dir, 'scripts'));
    fs.mkdirSync(path.join(dir, 'src'));
    fs.mkdirSync(path.join(dir, 'public/score'), {recursive: true});
    for (const file of ['paths.mjs', 'validate.mjs']) fs.copyFileSync(projectPath('scripts', file), path.join(dir, 'scripts', file));
    // The validator checks structure and asset existence, not media decoding.
    for (const file of ['score.svg', 'piano.wav']) fs.writeFileSync(path.join(dir, 'public/score', file), 'fixture');
    fs.writeFileSync(path.join(dir, 'src/score-data.json'), JSON.stringify(data));
    return spawnSync(process.execPath, [path.join(dir, 'scripts/validate.mjs')], {cwd: os.tmpdir(), encoding: 'utf8'});
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

test('valid attacks and extra sustain feedback pass, including rounding tolerance', () => {
  const data = fixture();
  data.events[0].time += 1e-8;
  // A note may ring past the selected music range; it must not be rejected.
  data.events[0].duration = data.activations[0].duration = 5;
  const result = validate(data);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS/);
});

const invalid = [
  ['negative event time', d => d.events[0].time = -1, /events\[0\]: time/],
  ['missing event time', d => delete d.events[0].time, /invalid time/],
  ['non-finite event time', d => d.events[0].time = Infinity, /invalid time/],
  ['event outside music range', d => d.events[0].time = 4, /time outside/],
  ['negative duration', d => d.events[0].duration = -1, /negative duration/],
  ['activation invalid time', d => d.activations[0].time = -1, /activations\[0\]: time/],
  ['duplicate events', d => d.events.push({...d.events[0]}), /duplicate eventId/],
  ['duplicate activations', d => d.activations.push({...d.activations[0]}), /duplicate eventId/],
  ['missing activation', d => d.activations.shift(), /missing activation/],
  ['orphan attack', d => d.activations.push(note('orphan', 2)), /missing MIDI event/],
  ['sustain instead of attack', d => d.activations[0].kind = 'sustain', /must match an attack/],
  ['invalid kind', d => d.activations[0].kind = 'unknown', /invalid kind/],
  ...['time', 'duration', 'velocity', 'x', 'y', 'pitch', 'staff', 'system'].map(key =>
    [`mismatched ${key}`, d => d.events[0][key] += 1, /activation mismatch/]),
  ['mismatched scoreId', d => d.events[0].scoreId = 'wrong-head', /activation mismatch/],
];
for (const [label, mutate, message] of invalid) test(`validator rejects ${label}`, () => {
  const data = fixture();
  mutate(data);
  const result = validate(data);
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /PASS/);
  assert.match(result.stderr, message);
});
