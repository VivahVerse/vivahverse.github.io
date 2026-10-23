// IndexedDB persistence for designs (and uploaded audio blobs). Falls back to memory if unavailable.
const DB = 'shubh-vivah-studio', VER = 1;
let dbp = null;
const mem = { designs: new Map(), audio: new Map() };
let available = true;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    if (!('indexedDB' in window)) { available = false; return res(null); }
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('designs')) db.createObjectStore('designs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { available = false; res(null); };
    r.onblocked = () => { available = false; res(null); };
  });
  return dbp;
}
async function tx(store, mode, fn) {
  const db = await open();
  if (!db) return fn(null);
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then(v => (out = v));
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('Storage aborted (quota?)'));
  });
}
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const storage = {
  isPersistent: () => available,
  async saveDesign(d) {
    const copy = structuredClone(d);
    return tx('designs', 'readwrite', s => (s ? s.put(copy) : mem.designs.set(d.id, copy)));
  },
  async getDesign(id) {
    return tx('designs', 'readonly', s => (s ? req(s.get(id)) : mem.designs.get(id)));
  },
  async listDesigns() {
    const all = await tx('designs', 'readonly', s => (s ? req(s.getAll()) : [...mem.designs.values()]));
    return (all || []).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async deleteDesign(id) {
    await tx('audio', 'readwrite', s => (s ? s.delete(id) : mem.audio.delete(id)));
    return tx('designs', 'readwrite', s => (s ? s.delete(id) : mem.designs.delete(id)));
  },
  async saveAudio(id, blob) { return tx('audio', 'readwrite', s => (s ? s.put(blob, id) : mem.audio.set(id, blob))); },
  async getAudio(id) { return tx('audio', 'readonly', s => (s ? req(s.get(id)) : mem.audio.get(id))); },
  async deleteAudio(id) { return tx('audio', 'readwrite', s => (s ? s.delete(id) : mem.audio.delete(id))); },
  async resetAll() {
    const db = await open();
    if (db) db.close();
    dbp = null; mem.designs.clear(); mem.audio.clear();
    await new Promise(res => { const r = indexedDB.deleteDatabase(DB); r.onsuccess = r.onerror = r.onblocked = () => res(); });
    try { localStorage.removeItem('svs-last'); localStorage.removeItem('svs-theme'); } catch { }
  },
};

export const prefs = {
  get(k, d) { try { const v = localStorage.getItem('svs-' + k); return v == null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('svs-' + k, v); } catch { } },
};
