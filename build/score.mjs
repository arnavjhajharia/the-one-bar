// Procedural score + SFX for "The One Bar" (original). node score.mjs out.wav total
import fs from "node:fs"; import { execFileSync } from "node:child_process";
const [out, totalS] = process.argv.slice(2); const SR = 44100, T = +totalS, N = Math.round(T * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const add = (i, l, r = l) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };
// Karplus-Strong pluck
function pluck(t, freq, amp, pan = 0) {
  const p = Math.round(SR / freq), buf = new Float32Array(p); for (let i = 0; i < p; i++) buf[i] = Math.random() * 2 - 1;
  const s0 = Math.round(t * SR), len = SR * 3.2; let idx = 0;
  for (let n = 0; n < len; n++) { const j = idx % p, k = (idx + 1) % p; const v = buf[j]; buf[j] = 0.996 * 0.5 * (buf[j] + buf[k]); idx++;
    const env = Math.min(1, n / 40); add(s0 + n, v * amp * env * (1 - pan) * 0.9, v * amp * env * (1 + pan) * 0.9); }
}
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
// G major, gentle fingerpicked progression: G  D/F#  Em  C  (x2) then lift C D G
const prog = [[55, 62, 67, 71], [54, 62, 66, 69], [52, 59, 64, 67], [48, 55, 64, 67]];
const bpm = 84, beat = 60 / bpm, bar = beat * 4;
const pattern = [0, 2, 1, 3, 2, 1, 3, 2]; // eighth-note arpeggio indices
let t = 1.2, barN = 0;
while (t < T - 4) {
  const ch = prog[barN % 4];
  // the arrangement thins for the rain/snow section and swells at the phone ringing / gate laugh
  const swell = (t > 32.5 && t < 45) ? 1.35 : 1;
  pattern.forEach((pi, i) => pluck(t + i * beat / 2 + (Math.random() - 0.5) * 0.012, midi(ch[pi]), (i === 0 ? 0.32 : 0.2) * swell, (pi - 1.5) * 0.25));
  if (t > 27) pluck(t, midi(ch[0] - 12), 0.28, 0); // bass enters once the light arrives
  if (t > 33 && t < 45) [0, 3].forEach(k => pluck(t + beat * 2 + k * 0.03, midi(ch[3] + 12), 0.12, 0.4)); // high bell answer
  t += bar; barN++;
}
// final resolve on G
[43, 55, 62, 67, 71, 74].forEach((m, i) => pluck(T - 6.5 + i * 0.06, midi(m), 0.22, (i - 2.5) * 0.15));
// soft pad (detuned saws through a slow lowpass), follows the chord roots
let lp = 0, lpR = 0;
for (let n = 0; n < N; n++) {
  const tt = n / SR; const ch = prog[Math.floor(Math.max(0, tt - 1.2) / bar) % 4];
  let v = 0; for (const m of [ch[0], ch[2]]) { const f = midi(m); v += ((tt * f) % 1) - 0.5 + ((tt * f * 1.004) % 1) - 0.5; }
  const env = Math.min(1, tt / 6) * Math.min(1, Math.max(0, (T - tt) / 4)) * (tt > 33 && tt < 45 ? 1.4 : 1);
  lp += 0.02 * (v - lp); add(n, lp * 0.035 * env);
}
// wind (low noise), rain (shot 4: 15.5-18.3), phone ring (27.6-29.2)
let w = 0;
for (let n = 0; n < N; n++) { const tt = n / SR; w += 0.004 * ((Math.random() * 2 - 1) - w);
  const g = 0.5 * (0.6 + 0.4 * Math.sin(tt * 0.7)) * (tt < 45 ? 1 : Math.max(0, 1 - (tt - 45) / 4)); add(n, w * g * 1.6, w * g * 1.4);
  if (tt > 15.3 && tt < 18.6) { const rg = Math.min(1, (tt - 15.3) * 3, (18.6 - tt) * 3) * 0.05; add(n, (Math.random() * 2 - 1) * rg, (Math.random() * 2 - 1) * rg); }
  if (tt > 27.6 && tt < 29.4) { const c = (tt - 27.6) % 0.9; if (c < 0.5) { const f = (Math.floor(tt * 25) % 2) ? 1320 : 1760; add(n, Math.sin(2 * Math.PI * f * tt) * 0.06); } }
}
// gentle reverb-ish echo
const d = Math.round(0.23 * SR); for (let n = d; n < N; n++) { L[n] += R[n - d] * 0.18; R[n] += L[n - d] * 0.18; }
let pk = 0; for (let n = 0; n < N; n++) pk = Math.max(pk, Math.abs(L[n]), Math.abs(R[n]));
const inter = new Float32Array(N * 2); for (let n = 0; n < N; n++) { inter[2 * n] = L[n] / pk * 0.8; inter[2 * n + 1] = R[n] / pk * 0.8; }
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "f32le", "-ar", String(SR), "-ac", "2", "-i", "-", out], { input: Buffer.from(inter.buffer), maxBuffer: 1 << 28 });
console.log("score", out);
