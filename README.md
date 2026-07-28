# MANDALA — Monitoring Pelaksanaan Tindak Lanjut

PWA untuk monitoring tindak lanjut evaluasi SAKIP, Setda Kabupaten Indragiri Hulu.

## Menjalankan di komputer sendiri (opsional, buat cek dulu sebelum deploy)

```
npm install
npm run dev
```

Buka `http://localhost:5173`.

## Deploy ke Vercel

**Cara paling gampang — tanpa GitHub:**

1. Buka [vercel.com](https://vercel.com), login/daftar (bisa pakai akun Google)
2. Klik **Add New → Project**
3. Pilih tab **"Deploy without Git"** / drag-and-drop folder ini (`mandala-app`)
   - Kalau diminta framework preset, pilih **Vite**
4. Klik **Deploy**, tunggu sampai selesai
5. Setelah selesai, kamu dapat URL publik (contoh: `mandala-inhu.vercel.app`)

**Cara via GitHub (lebih enak buat update berkelanjutan):**

1. Upload folder ini ke repo GitHub baru
2. Di Vercel: **Add New → Project → Import Git Repository**, pilih repo tadi
3. Framework preset otomatis kedetect **Vite**, klik Deploy

## Setelah deploy

Buka URL Vercel-nya, nanti muncul layar minta **URL Web App Apps Script** (yang berakhiran `/exec`). Tempel URL itu, klik **Simpan & Muat Data**. URL ini tersimpan di browser (localStorage) masing-masing perangkat — jadi tiap operator yang buka aplikasi ini di device baru perlu isi URL itu sekali di awal.

## Struktur project

- `src/App.jsx` — seluruh logika dan tampilan aplikasi (Dashboard, Input OPD, Verifikasi APIP)
- `src/api.js` — helper untuk komunikasi ke backend Apps Script
- `src/logo.png` — logo MANDALA
- `public/manifest.json` — konfigurasi PWA (biar bisa "Add to Home Screen")
