/** Stateless performance motion: arrival is at the MIDI onset, never delayed after it. */
export type Activation = {
  time: number;
  x: number;
  y: number;
  staff: number;
  pitch: number;
  velocity: number;
  duration: number;
  scoreId: string;
  kind: string;
  system: number;
  eventId: string;
};
import {FPS, INTRO_FRAMES, SCORE_SCALE} from './config';
export {INTRO_FRAMES, SCORE_SCALE};
export const INTRO_SECONDS = INTRO_FRAMES / FPS;
// Repeated noteheads keep the latest triggered ring, regardless of input order.
// Equal-time ties keep the later entry, matching the original sorted-data behavior.
export const activeRingsAt = (notes: Activation[], t: number) =>
  notes.filter((note, i, all) =>
    t >= note.time && t - note.time <= 3.6 &&
    !all.some((other, j) => other.scoreId === note.scoreId && other.time <= t &&
      (other.time > note.time || (other.time === note.time && j > i))),
  );
export const groupLandings = (notes: Activation[], staff: number) => {
  const groups: Activation[][] = [];
  // The dataset defines the requested musical range; no piece-specific cutoff.
  for (const note of notes
    .filter((n) => n.staff === staff)
    .sort((a, b) => a.time - b.time)) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(last[0].time - note.time) < 1e-6) last.push(note);
    else groups.push([note]);
  }
  return groups.map(
    (group) =>
      [...group].sort(
        (a, b) =>
          (a.kind === 'attack' ? 0 : 1) - (b.kind === 'attack' ? 0 : 1) ||
          (staff === 1 ? b.pitch - a.pitch : a.pitch - b.pitch),
      )[0],
  );
};
export const arcPoint = (
  a: Activation,
  b: Activation,
  u: number,
): [number, number, number] => {
  const phase = Math.max(0, Math.min(1, u));
  const p = phase; // Constant lateral flight: no braking / rushing between contacts.
  const distance = Math.hypot(b.x - a.x, b.y - a.y) * SCORE_SCALE;
  // Every interval is one complete flight, including repeated identical positions.
  const interval = Math.max(0, b.time - a.time);
  const hopHeight = (0.27 + Math.min(0.13, distance * 0.045)) * Math.min(1, Math.max(0.18, interval / 0.22));
  return [
    (a.x + (b.x - a.x) * p) * SCORE_SCALE,
    0.097 + 4 * phase * (1 - phase) * hopHeight,
    (a.y + (b.y - a.y) * p) * SCORE_SCALE,
  ];
};
export const performanceAt = (targets: Activation[], t: number) => {
  let i = 0;
  while (i + 1 < targets.length && targets[i + 1].time <= t) i++;
  const current = targets[i], next = targets[i + 1];
  const age = t-current.time;
  const landed = age >= 0;
  const resting = !!next && (next.system !== current.system || next.time-current.time-current.duration > 0.65);
  const enteringNext = resting && t >= next.time-INTRO_SECONDS;
  const entryTarget = enteringNext ? next : current;
  const entryPhase = Math.max(0,Math.min(1,(t-entryTarget.time+INTRO_SECONDS)/INTRO_SECONDS));
  const departing = !!next && landed && !resting;
  const u = departing ? Math.max(0,Math.min(1,age/(next.time-current.time))) : 1;
  const position = departing ? arcPoint(current,next,u) : arcPoint(entryTarget,entryTarget,1);
  let opacity = 1;
  if (!landed || enteringNext) {
    opacity = Math.min(1,entryPhase*2.5);
    position[1] = .097+.18*(1-entryPhase*entryPhase);
  } else if (resting || !next) {
    opacity = Math.max(0,Math.min(1,(current.time+current.duration+.18-t)/.18));
  }
  const pulse = landed && !enteringNext ? Math.exp(-Math.max(0,age)/.1) : 0;
  const from = departing ? current : targets[Math.max(0,i-1)];
  const to = departing ? next : current;
  const trailOpacity = departing ? .68 : (from.system===to.system && i>0 ? .48*Math.max(0,1-age/.3) : 0);
  return {position,pulse,landed,opacity,from,to,u,trailOpacity,departing};
};
