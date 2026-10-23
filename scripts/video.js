import { loadScript } from './ui.js';
// Video invitation engine: scene timeline drawn with the card renderer, plus
// particles and transitions. Recording uses MediaRecorder (MP4 where supported, else WebM).
import { renderPage, ensureFonts, preloadImages, paletteFor, templateById } from './render/card.js';
import { FORMATS } from './state.js';
import { rng } from './render/motifs.js';
import { renderTrack, decodeFile, audioCtx } from './music.js';
import { ReelTimeline } from './render/reel.js';
export const makeTimeline = (design, W, H) => (design.video.reel && design.video.reel !== 'cards' ? new ReelTimeline(design, W, H) : new Timeline(design, W, H));

export const VIDEO_FORMATS = {
  story: { label: '9:16 · WhatsApp Status / Reels', w: 1080, h: 1920 },
  portrait: { label: '4:5 · Instagram post', w: 1080, h: 1350 },
  square: { label: '1:1 · Square post', w: 1080, h: 1080 },
  wide: { label: '16:9 · Widescreen / YouTube', w: 1920, h: 1080 },
};

export function buildScenes(design) {
  const v = design.video;
  const long = v.length === 'long';
  const scenes = [];
  const inv = design.wording?.invocation;
  if (v.verseIntro !== false && inv && inv !== 'none' && design.show?.invocation !== false) scenes.push({ page: { kind: 'verse' }, dur: long ? 6 : 4.5 });
  scenes.push({ page: { kind: 'cover' }, dur: long ? 8 : 6.5 });
  if (v.timeline !== false && design.events.length) {
    if (long) design.events.forEach((e, i) => scenes.push({ page: { kind: 'event', index: i }, dur: 4.5 }));
    else {
      const per = 4;
      for (let i = 0; i < design.events.length; i += per) scenes.push({ page: { kind: 'events', from: i, to: Math.min(design.events.length, i + per) }, dur: 5.5 });
    }
  }
  scenes.push({ page: { kind: 'closing' }, dur: long ? 6 : 4.5 });
  let t = 0;
  scenes.forEach(s => { s.start = t; t += s.dur; });
  return { scenes, total: t };
}

// Particles (deterministic).
function makeParticles(kind, W, H, n = 36) {
  const R = rng('p' + kind);
  return [...Array(kind === 'none' ? 0 : n)].map(() => ({
    x: R() * W, y: R() * H, s: (0.6 + R() * 0.9), sp: 0.4 + R() * 0.8, rot: R() * 6.28, vr: (R() - 0.5) * 2, sway: R() * 6.28, hue: R(),
  }));
}
function drawParticles(ctx, parts, kind, W, H, t, pal) {
  const U = Math.min(W, H) / 100;
  for (const p of parts) {
    if (kind === 'petals') {
      const y = (p.y + t * p.sp * U * 9) % (H + U * 6) - U * 3;
      const x = p.x + Math.sin(t * 0.8 + p.sway) * U * 4;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + t * p.vr);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = p.hue > 0.6 ? '#f2a9a0' : p.hue > 0.3 ? '#e2584f' : '#f5a623';
      ctx.beginPath(); ctx.ellipse(0, 0, U * 0.7 * p.s, U * 1.25 * p.s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (kind === 'sparkles') {
      const a = Math.max(0, Math.sin(t * 2.2 * p.sp + p.sway));
      if (a < 0.05) continue;
      ctx.save(); ctx.translate(p.x, (p.y - t * U * 2 * p.sp + H) % H); ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = pal.accent || '#e2bf78';
      const r = U * 0.9 * p.s;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4; const rr = i % 2 ? r * 0.25 : r; ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
}

const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** A player that draws frame `t` (seconds) onto a canvas. */
export class Timeline {
  constructor(design, W, H) {
    this.design = design; this.W = W; this.H = H;
    const { scenes, total } = buildScenes(design);
    this.scenes = scenes; this.total = total;
    this.parts = makeParticles(design.video.particles || 'petals', W, H);
    this.cache = new Map();
    this.pal = paletteFor(design, templateById(design.templateId)).pal;
  }
  sceneCanvas(i, p) {
    // fully-revealed scenes are cached for speed; entrance frames are drawn live
    const key = p >= 1 ? `s${i}` : null;
    if (key && this.cache.has(key)) return this.cache.get(key);
    const c = document.createElement('canvas'); c.width = this.W; c.height = this.H;
    renderPage(c.getContext('2d'), this.W, this.H, this.design, this.scenes[i].page, p >= 1 ? {} : { anim: { p } });
    if (key) this.cache.set(key, c);
    return c;
  }
  draw(ctx, t) {
    const { W, H } = this;
    const tr = this.design.video.transition || 'fade';
    let i = this.scenes.findIndex(s => t < s.start + s.dur);
    if (i < 0) i = this.scenes.length - 1;
    const s = this.scenes[i];
    const local = t - s.start;
    const p = Math.min(1, local / 2.2);
    const cur = this.sceneCanvas(i, p);
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const k = tr === 'zoom' ? 1 + 0.05 * (local / s.dur) : 1;
    let dx = 0;
    if (tr === 'slide' && local < 0.7 && i > 0) dx = (1 - easeInOut(local / 0.7)) * W;
    ctx.translate(W / 2 + dx, H / 2); ctx.scale(k, k); ctx.drawImage(cur, -W / 2, -H / 2); ctx.restore();
    if (tr === 'slide' && dx > 0) {
      const prev = this.sceneCanvas(i - 1, 1);
      ctx.drawImage(prev, dx - W, 0);
    }
    // crossfade into the next scene
    const fade = 0.8;
    if (tr !== 'slide' && i < this.scenes.length - 1 && local > s.dur - fade) {
      const a = easeInOut((local - (s.dur - fade)) / fade);
      ctx.save(); ctx.globalAlpha = a;
      ctx.drawImage(this.sceneCanvas(i + 1, 0.0001), 0, 0);
      ctx.restore();
    }
    drawParticles(ctx, this.parts, this.design.video.particles || 'petals', W, H, t, this.pal);
    // fade from/to black at the ends
    const edge = Math.min(1, t / 0.6, (this.total - t) / 0.9);
    if (edge < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.max(0, edge)})`; ctx.fillRect(0, 0, W, H); }
  }
}

export function pickMime() {
  if (!window.MediaRecorder) return null;
  const opts = [
    ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'], ['video/mp4;codecs=avc1,mp4a.40.2', 'mp4'],
    ['video/mp4;codecs=avc1,opus', 'mp4'], ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'webm'], ['video/webm;codecs=vp8,opus', 'webm'], ['video/webm', 'webm'],
  ];
  for (const [m, ext] of opts) if (MediaRecorder.isTypeSupported?.(m)) return { mime: m, ext };
  return null;
}

export function videoSupport() {
  const c = document.createElement('canvas');
  return { recorder: !!window.MediaRecorder, capture: !!c.captureStream, mime: pickMime() };
}

/** Fetch the AudioBuffer for the design's music choice (or null). */
export async function getMusic(design, getUploadBlob, seconds) {
  const tr = design.video.track;
  if (!tr || tr === 'none') return null;
  if (tr === 'upload') { const blob = await getUploadBlob(); return blob ? decodeFile(blob) : null; }
  return renderTrack(tr, seconds);
}

/**
 * Record the timeline in real time. Returns { blob, ext, mime }.
 * onProgress(0..1); signal: { cancelled }
 */
export async function recordVideo(design, { audio, onProgress, signal }) {
  const fmt = VIDEO_FORMATS[design.video.format] || VIDEO_FORMATS.story;
  const sup = videoSupport();
  if (!sup.recorder || !sup.capture || !sup.mime) throw new Error('Your browser cannot record video. Please try a recent version of Chrome, Edge, Safari or Firefox on a computer or Android phone.');
  await ensureFonts(design); await preloadImages(design);
  const W = fmt.w, H = fmt.h;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const tl = makeTimeline(design, W, H);
  // pre-render cached scenes
  tl.scenes.forEach((_, i) => tl.sceneCanvas(i, 1));
  tl.draw(ctx, 0);

  const stream = canvas.captureStream(30);
  let src = null, actx = null;
  if (audio) {
    actx = audioCtx(); await actx.resume?.();
    const dest = actx.createMediaStreamDestination();
    src = actx.createBufferSource(); src.buffer = audio; src.loop = audio.duration < tl.total;
    const g = actx.createGain(); g.gain.value = design.video.volume ?? 0.8;
    const now = actx.currentTime;
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(design.video.volume ?? 0.8, now + 0.8);
    g.gain.setValueAtTime(design.video.volume ?? 0.8, now + tl.total - 1.5); g.gain.linearRampToValueAtTime(0, now + tl.total);
    src.connect(g); g.connect(dest);
    dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
  }
  const rec = new MediaRecorder(stream, { mimeType: sup.mime.mime, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 160_000 });
  const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const stopped = new Promise(res => (rec.onstop = res));
  rec.start(500);
  const startOffset = design.video.track === 'upload' ? Math.min(design.video.start || 0, Math.max(0, (audio?.duration || 1) - 1)) : 0;
  if (src) src.start(0, startOffset);
  const t0 = performance.now();
  await new Promise(resolve => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      if (signal?.cancelled || t >= tl.total) return resolve();
      tl.draw(ctx, t);
      onProgress?.(t / tl.total);
      if (document.hidden) setTimeout(tick, 33); else requestAnimationFrame(tick);
    };
    tick();
  });
  tl.draw(ctx, tl.total - 0.01);
  if (src) try { src.stop(); } catch { }
  rec.stop();
  await stopped;
  stream.getTracks().forEach(t => t.stop());
  if (signal?.cancelled) return null;
  const type = sup.mime.mime.split(';')[0];
  return { blob: new Blob(chunks, { type }), ext: sup.mime.ext, mime: type, codec: sup.mime.mime + ' ' + (rec.mimeType || ''), w: W, h: H, duration: tl.total };
}

// ===================== WebCodecs MP4 encoder (faster than real time) =====================

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pickVideoCodec(W, H) {
  if (!window.VideoEncoder) return null;
  for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640033', 'avc1.42001f']) {
    try {
      const cfg = { codec, width: W, height: H, bitrate: 6_000_000, framerate: 30 };
      const r = await VideoEncoder.isConfigSupported(cfg);
      if (r.supported) return cfg;
    } catch { }
  }
  return null;
}
async function pickAudioCodec() {
  if (!window.AudioEncoder) return null;
  for (const [codec, mux, sampleRate] of [['mp4a.40.2', 'aac', 48000], ['mp4a.40.2', 'aac', 44100], ['opus', 'opus', 48000]]) {
    try {
      const cfg = { codec, sampleRate, numberOfChannels: 2, bitrate: 160_000 };
      const r = await AudioEncoder.isConfigSupported(cfg);
      if (r.supported) return { cfg, mux };
    } catch { }
  }
  return null;
}

/** Mix the chosen music to the video length with volume, start offset, looping and fades. */
export async function mixAudio(buffer, total, { volume = 0.8, start = 0, sampleRate = 48000 } = {}) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new OAC(2, Math.ceil(total * sampleRate), sampleRate);
  const src = ctx.createBufferSource(); src.buffer = buffer;
  const off = Math.min(start, Math.max(0, buffer.duration - 1));
  if (buffer.duration - off < total) { src.loop = true; src.loopStart = off; src.loopEnd = buffer.duration; }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(volume, 0.8);
  g.gain.setValueAtTime(volume, Math.max(0.9, total - 1.6)); g.gain.linearRampToValueAtTime(0, total);
  src.connect(g); g.connect(ctx.destination); src.start(0, off);
  return ctx.startRendering();
}

export async function mp4Support(design) {
  const fmt = VIDEO_FORMATS[design.video.format] || VIDEO_FORMATS.story;
  const v = await pickVideoCodec(fmt.w, fmt.h);
  if (!v) return null;
  const a = await pickAudioCodec();
  return { video: v, audio: a };
}

/** Encode the video invitation to a real MP4 (H.264 + AAC/Opus) with WebCodecs. Returns null when unsupported. */
export async function encodeMP4(design, { audio, onProgress, signal }) {
  const fmt = VIDEO_FORMATS[design.video.format] || VIDEO_FORMATS.story;
  const vcfg = await pickVideoCodec(fmt.w, fmt.h);
  if (!vcfg) return null;
  const acodec = audio ? await pickAudioCodec() : null;
  const Mux = await loadScript('vendor/mp4-muxer.js', 'Mp4Muxer');
  await ensureFonts(design); await preloadImages(design);
  const W = fmt.w, H = fmt.h, FPS = 30;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const tl = makeTimeline(design, W, H);
  const total = tl.total;
  const muxer = new Mux.Muxer({
    target: new Mux.ArrayBufferTarget(),
    video: { codec: 'avc', width: W, height: H, frameRate: FPS },
    audio: acodec ? { codec: acodec.mux, numberOfChannels: 2, sampleRate: acodec.cfg.sampleRate } : undefined,
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });
  let failure = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => (failure = e) });
  venc.configure({ ...vcfg, avc: { format: 'avc' } });

  // audio first (fast), so a failure there falls back cleanly
  if (acodec) {
    const mixed = await mixAudio(audio, total, { volume: design.video.volume ?? 0.8, start: design.video.track === 'upload' ? (design.video.start || 0) : 0, sampleRate: acodec.cfg.sampleRate });
    const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => (failure = e) });
    aenc.configure(acodec.cfg);
    const L = mixed.getChannelData(0), Rch = mixed.getChannelData(1), N = 1024;
    for (let i = 0; i < mixed.length; i += N) {
      const n = Math.min(N, mixed.length - i);
      const data = new Float32Array(n * 2); data.set(L.subarray(i, i + n), 0); data.set(Rch.subarray(i, i + n), n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: mixed.sampleRate, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(i / mixed.sampleRate * 1e6), data });
      aenc.encode(ad); ad.close();
      if (aenc.encodeQueueSize > 50) await sleep(1);
    }
    await aenc.flush(); aenc.close();
  }
  tl.scenes.forEach((_, i) => tl.sceneCanvas(i, 1));
  const frames = Math.ceil(total * FPS);
  for (let i = 0; i < frames; i++) {
    if (signal?.cancelled) { try { venc.close(); } catch { } return { cancelled: true }; }
    if (failure) throw failure;
    tl.draw(ctx, i / FPS);
    const frame = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();
    while (venc.encodeQueueSize > 6) await sleep(2);
    if (i % 6 === 0) { onProgress?.(i / frames); await sleep(0); }
  }
  await venc.flush(); venc.close();
  if (failure) throw failure;
  muxer.finalize();
  const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
  return { blob, ext: 'mp4', mime: 'video/mp4', codec: `${vcfg.codec}${acodec ? ' + ' + acodec.cfg.codec : ''}`, aac: acodec?.mux === 'aac', w: W, h: H, duration: total, engine: 'webcodecs' };
}

/** Best available export: WebCodecs MP4 → MediaRecorder (MP4/WebM). */
export async function exportBestVideo(design, opts) {
  try {
    const r = await encodeMP4(design, opts);
    if (r?.cancelled) return null;
    if (r) return r;
  } catch (e) { console.warn('WebCodecs export failed, falling back to MediaRecorder', e); }
  const r = await recordVideo(design, opts);
  return r && { ...r, engine: 'recorder' };
}
