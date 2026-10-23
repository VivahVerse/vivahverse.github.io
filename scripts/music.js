// Original music, synthesised in the browser with the Web Audio API.
// These short pieces were composed for Shubh Vivah Studio and are free to use in your invitations.
// Uploaded audio is decoded locally and never leaves the device.

export const TRACKS = [
  { id: 'none', name: 'No music' },
  { id: 'shehnai', name: 'Shehnai Dawn', desc: 'Reed melody over a tanpura drone — gentle & auspicious' },
  { id: 'mehendi', name: 'Mehendi Bells', desc: 'Bright plucked strings and bells — playful' },
  { id: 'baraat', name: 'Royal Procession', desc: 'Dhol rhythm with festive brass — energetic' },
  { id: 'upload', name: 'My own audio file', desc: 'Upload a track you have the rights to use' },
];

const SR = 44100;
const hz = (semi, base = 220) => base * Math.pow(2, semi / 12); // base Sa = A3

let ctxShared = null;
export function audioCtx() {
  if (!ctxShared) ctxShared = new (window.AudioContext || window.webkitAudioContext)();
  return ctxShared;
}

const cache = new Map();
export async function renderTrack(id, seconds) {
  const dur = Math.max(6, Math.min(90, Math.ceil(seconds)));
  const key = `${id}:${dur}`;
  if (cache.has(key)) return cache.get(key);
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new OAC(2, SR * dur, SR);
  const master = ctx.createGain(); master.gain.value = 0.9;
  // gentle master fade in/out
  master.gain.setValueAtTime(0, 0); master.gain.linearRampToValueAtTime(0.9, 1.2);
  master.gain.setValueAtTime(0.9, dur - 2); master.gain.linearRampToValueAtTime(0, dur);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
  master.connect(comp); comp.connect(ctx.destination);
  const verb = makeReverb(ctx, 2.2); const wet = ctx.createGain(); wet.gain.value = 0.28; verb.connect(wet); wet.connect(master);
  const bus = { dry: master, verb };
  if (id === 'shehnai') shehnai(ctx, bus, dur);
  else if (id === 'mehendi') mehendi(ctx, bus, dur);
  else baraat(ctx, bus, dur);
  const buf = await ctx.startRendering();
  // normalise to a consistent, comfortable loudness (peak ≈ -1 dBFS)
  let peak = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; } }
  if (peak > 0) { const k = 0.89 / peak; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; } }
  cache.set(key, buf);
  return buf;
}

function makeReverb(ctx, secs) {
  const len = Math.floor(SR * secs);
  const ir = ctx.createBuffer(2, len, SR);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = rnd() * Math.pow(1 - i / len, 3); }
  const conv = ctx.createConvolver(); conv.buffer = ir; return conv;
}

function send(ctx, node, bus, dry = 1, wet = 0.6) {
  const g1 = ctx.createGain(); g1.gain.value = dry; node.connect(g1); g1.connect(bus.dry);
  const g2 = ctx.createGain(); g2.gain.value = wet; node.connect(g2); g2.connect(bus.verb);
}

function env(ctx, g, t, a, peak, d, sus, r, end) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + d);
  g.gain.setValueAtTime(Math.max(0.0001, sus), end);
  g.gain.exponentialRampToValueAtTime(0.0001, end + r);
}

// ---- Shehnai Dawn: drone + reedy melody in a Yaman-like scale (Sa Re Ga Ma# Pa Dha Ni) ----
function shehnai(ctx, bus, dur) {
  // tanpura drone: Pa Sa Sa Sa(low) plucks repeating
  const pat = [7 - 12, 0, 0, -12];
  for (let t = 0, i = 0; t < dur; t += 1.1, i++) {
    const f = hz(pat[i % 4], 220);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 2;
    const g = ctx.createGain(); env(ctx, g, t, 0.02, 0.08, 1.2, 0.03, 1.5, t + 2.5);
    o.connect(lp); lp.connect(g); send(ctx, g, bus, 0.7, 0.5);
    o.start(t); o.stop(t + 4.2);
  }
  // melody (semitones from Sa): phrases
  const S = { S: 0, R: 2, G: 4, M: 6, P: 7, D: 9, N: 11, S2: 12, R2: 14, G2: 16 };
  const phrases = [
    [['N', -12, .6], ['R', 0, .6], ['G', 0, 1.2], ['R', 0, .6], ['G', 0, .6], ['M', 0, .6], ['G', 0, 1.8]],
    [['G', 0, .6], ['M', 0, .6], ['D', 0, 1.2], ['N', 0, .6], ['D', 0, .6], ['P', 0, 1.8], ['M', 0, .6], ['G', 0, 1.2]],
    [['P', 0, .6], ['D', 0, .6], ['N', 0, .6], ['S2', 0, 1.8], ['N', 0, .6], ['D', 0, .6], ['P', 0, 1.2], ['G', 0, 1.2]],
    [['R', 0, .6], ['G', 0, .6], ['R', 0, .6], ['S', 0, 2.4]],
  ];
  let t = 1.5;
  let pi = 0;
  while (t < dur - 3) {
    for (const [n, oct, len] of phrases[pi % phrases.length]) {
      if (t > dur - 2.5) break;
      const semi = (n === 'N' && oct < 0 ? S.N - 12 : S[n]);
      reed(ctx, bus, hz(semi, 440), t, len * 0.98);
      t += len;
    }
    t += 0.8; pi++;
  }
}
function reed(ctx, bus, f, t, len) {
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.08); // meend-like glide
  const vib = ctx.createOscillator(); vib.frequency.value = 5.2;
  const vg = ctx.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.5, len));
  vib.connect(vg); vg.connect(o.frequency);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2.2; bp.Q.value = 1.4;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
  const g = ctx.createGain(); env(ctx, g, t, 0.06, 0.16, 0.2, 0.12, 0.18, t + len);
  o.connect(bp); bp.connect(lp); lp.connect(g); send(ctx, g, bus, 0.9, 0.7);
  o.start(t); vib.start(t); o.stop(t + len + 0.4); vib.stop(t + len + 0.4);
}

// ---- Mehendi Bells: plucked pentatonic arpeggios + bells + shaker ----
function pluck(ctx, bus, f, t, vol = 0.18, bright = 4000) {
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.01;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(bright, t); lp.frequency.exponentialRampToValueAtTime(600, t + 0.6);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  const g2 = ctx.createGain(); g2.gain.value = 0.3;
  o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); send(ctx, g, bus, 1, 0.4);
  o.start(t); o2.start(t); o.stop(t + 1.2); o2.stop(t + 1.2);
}
function bellNote(ctx, bus, f, t, vol = 0.07) {
  [1, 2.76, 5.4].forEach((m, i) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol / (i + 1), t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5 / (i + 1));
    o.connect(g); send(ctx, g, bus, 0.8, 0.9); o.start(t); o.stop(t + 2.6);
  });
}
function noiseHit(ctx, bus, t, len, freq, vol, type = 'highpass') {
  const n = ctx.createBufferSource();
  const b = ctx.createBuffer(1, Math.floor(SR * len), SR); const d = b.getChannelData(0);
  let s = 11; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
  n.buffer = b;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  n.connect(f); f.connect(g); send(ctx, g, bus, 1, 0.15); n.start(t);
}
function mehendi(ctx, bus, dur) {
  const beat = 60 / 104;
  const scale = [0, 2, 4, 7, 9, 12, 14, 16];
  const chords = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]];
  let bar = 0;
  for (let t = 0.3; t < dur - 1.5; t += beat * 4, bar++) {
    const ch = chords[bar % 4];
    // bass
    pluck(ctx, bus, hz(ch[0] - 12, 220), t, 0.16, 1200); pluck(ctx, bus, hz(ch[0] - 12, 220), t + beat * 2, 0.12, 1200);
    // arpeggio
    for (let k = 0; k < 8; k++) pluck(ctx, bus, hz(ch[k % 3] + (k > 3 ? 12 : 0), 440), t + k * beat / 2, 0.08, 5000);
    // melody bells
    if (bar % 2 === 1) [0, 1.5, 2, 3].forEach((o, i) => bellNote(ctx, bus, hz(scale[(bar * 3 + i * 2) % scale.length], 880), t + o * beat));
    // shaker
    for (let k = 0; k < 8; k++) noiseHit(ctx, bus, t + k * beat / 2, 0.06, 6000, k % 2 ? 0.05 : 0.09);
  }
}

// ---- Royal Procession: dhol pattern + brass chords ----
function dhol(ctx, bus, t, low = true) {
  const o = ctx.createOscillator(); o.type = 'sine';
  const f0 = low ? 120 : 260;
  o.frequency.setValueAtTime(f0 * 1.6, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.7, t + 0.18);
  const g = ctx.createGain(); g.gain.setValueAtTime(low ? 0.6 : 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (low ? 0.45 : 0.18));
  o.connect(g); send(ctx, g, bus, 1, 0.12); o.start(t); o.stop(t + 0.5);
  if (!low) noiseHit(ctx, bus, t, 0.08, 2500, 0.18, 'bandpass');
}
function brass(ctx, bus, notes, t, len) {
  notes.forEach(semi => {
    [0, 0.08].forEach(det => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(semi, 220) * (1 + det / 100);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
      lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2400, t + 0.08); lp.frequency.linearRampToValueAtTime(1300, t + len);
      const g = ctx.createGain(); env(ctx, g, t, 0.05, 0.05, 0.2, 0.035, 0.25, t + len);
      o.connect(lp); lp.connect(g); send(ctx, g, bus, 1, 0.5); o.start(t); o.stop(t + len + 0.3);
    });
  });
}
function baraat(ctx, bus, dur) {
  const beat = 60 / 96;
  // classic bhangra-ish 8-step pattern: L . H L . H L H
  const pat = ['L', '', 'H', 'L', '', 'H', 'L', 'H'];
  const prog = [[0, 4, 7, 12], [5, 9, 12, 17], [7, 11, 14, 19], [0, 4, 7, 12]];
  let bar = 0;
  for (let t = 0.2; t < dur - 1.5; t += beat * 4, bar++) {
    pat.forEach((p, i) => { if (p) dhol(ctx, bus, t + i * beat / 2, p === 'L'); });
    if (bar >= 1) {
      const ch = prog[bar % 4];
      brass(ctx, bus, ch, t, beat * 1.4);
      brass(ctx, bus, ch.map(x => x + (bar % 2 ? 2 : 0)), t + beat * 2.5, beat * 1.2);
    }
    for (let k = 0; k < 8; k++) noiseHit(ctx, bus, t + k * beat / 2 + beat / 4, 0.04, 8000, 0.04);
  }
}

// Decode an uploaded file into an AudioBuffer.
export async function decodeFile(blob) {
  const ab = await blob.arrayBuffer();
  const ctx = audioCtx();
  return await new Promise((res, rej) => {
    const p = ctx.decodeAudioData(ab, res, () => rej(new Error('This audio format cannot be decoded by your browser. Try MP3 or M4A.')));
    if (p && p.catch) p.catch(() => { });
  });
}

// Preview player
let player = null;
export function stopPreview() {
  if (player) { try { player.src.stop(); } catch { } player = null; }
}
export function playPreview(buffer, { volume = 0.8, start = 0, onEnd } = {}) {
  stopPreview();
  const ctx = audioCtx();
  ctx.resume?.();
  const src = ctx.createBufferSource(); src.buffer = buffer;
  const g = ctx.createGain(); g.gain.value = volume;
  src.connect(g); g.connect(ctx.destination);
  src.onended = () => { if (player?.src === src) { player = null; onEnd?.(); } };
  src.start(0, Math.min(start, Math.max(0, buffer.duration - 1)));
  player = { src, g };
  return player;
}
export const isPlaying = () => !!player;

// Encode an AudioBuffer as a 16-bit mono WAV (used for the microsite package).
export function bufferToWav(buf, targetRate = 22050, maxSeconds = 60) {
  const ratio = buf.sampleRate / targetRate;
  const len = Math.min(Math.floor(buf.length / ratio), targetRate * maxSeconds);
  const chs = buf.numberOfChannels;
  const data = new DataView(new ArrayBuffer(44 + len * 2));
  const W = (o, s) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
  W(0, 'RIFF'); data.setUint32(4, 36 + len * 2, true); W(8, 'WAVE'); W(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, 1, true);
  data.setUint32(24, targetRate, true); data.setUint32(28, targetRate * 2, true); data.setUint16(32, 2, true); data.setUint16(34, 16, true);
  W(36, 'data'); data.setUint32(40, len * 2, true);
  const cd = [...Array(chs)].map((_, c) => buf.getChannelData(c));
  for (let i = 0; i < len; i++) {
    let v = 0; const si = Math.floor(i * ratio);
    for (let c = 0; c < chs; c++) v += cd[c][si] || 0;
    v = Math.max(-1, Math.min(1, v / chs));
    data.setInt16(44 + i * 2, v * 0x7fff, true);
  }
  return new Blob([data], { type: 'audio/wav' });
}
