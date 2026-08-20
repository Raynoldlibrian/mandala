export const STORAGE_KEY = "mandala_api_url";

export async function apiGet(apiUrl, action, params = {}) {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${apiUrl}?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Gagal memuat data");
  return json.data;
}

export async function apiPost(apiUrl, action, payload) {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Gagal menyimpan data");
  return json.data;
}

export function toRecordMap(arr) {
  const map = {};
  (arr || []).forEach((r) => { map[r.kode] = r; });
  return map;
}

// Penyimpanan URL API di browser (menggantikan window.storage yang hanya ada di preview Claude)
export const localConfig = {
  get() {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
  },
  set(url) {
    try { localStorage.setItem(STORAGE_KEY, url); } catch {}
  },
  clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  },
};

// Status OPD yang sudah berhasil memasukkan kode akses — tersimpan di sessionStorage,
// jadi otomatis terhapus begitu browser/tab ditutup.
const UNLOCK_KEY = "mandala_unlocked_opds";
export const unlockStore = {
  getAll() {
    try { return JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || "[]"); } catch { return []; }
  },
  isUnlocked(opd) {
    return this.getAll().includes(opd);
  },
  unlock(opd) {
    const list = this.getAll();
    if (!list.includes(opd)) list.push(opd);
    try { sessionStorage.setItem(UNLOCK_KEY, JSON.stringify(list)); } catch {}
  },
};

// Sama seperti unlockStore, tapi khusus untuk verifikator APIP yang sudah
// memasukkan PIN mereka — disimpan terpisah biar tidak campur dengan nama OPD.
const UNLOCK_KEY_APIP = "mandala_unlocked_apip";
export const unlockStoreApip = {
  getAll() {
    try { return JSON.parse(sessionStorage.getItem(UNLOCK_KEY_APIP) || "[]"); } catch { return []; }
  },
  isUnlocked(nama) {
    return this.getAll().includes(nama);
  },
  unlock(nama) {
    const list = this.getAll();
    if (!list.includes(nama)) list.push(nama);
    try { sessionStorage.setItem(UNLOCK_KEY_APIP, JSON.stringify(list)); } catch {}
  },
};
