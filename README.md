# SIDABUD Bimas Kristen Jawa Tengah

Vue 3 (Netlify) + Google Apps Script + Google Spreadsheet. Login Google; PIC hanya melihat/mengubah data kab/kotanya, admin (`theo.hasiholan@gmail.com`) melihat semua. Hak akses dicek di Apps Script (server), bukan hanya di tampilan.

## 1. Spreadsheet & Apps Script
1. Pastikan file berformat **Google Sheets** (jika masih .xlsx: File > Save as Google Sheets).
2. Extensions > Apps Script, tempel isi `apps-script/Code.gs`.
3. Jalankan fungsi `setup` sekali (membuat sheet `Objek_Keagamaan_Kristen` dan `Users` berisi 35 kab/kota).
4. Isi sheet `Users`: kolom **Email** dan **Nama PIC** tiap kab/kota (kolom Aktif = `YA`). Satu kab/kota boleh lebih dari satu baris/email (tambahkan baris).
5. Project Settings > Script Properties: `GOOGLE_CLIENT_ID` = OAuth Client ID (langkah 2).
6. Deploy > New deployment > Web app (Execute as: Me, Access: Anyone). Salin URL `/exec`.

## 2. Google OAuth Client ID
Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web application). Authorized JavaScript origins: `http://localhost:5173` dan URL Netlify Anda.

## 3. Netlify
Environment variables: `VITE_GOOGLE_CLIENT_ID`, `VITE_API_URL` (URL /exec). Build: `npm run build`, publish: `dist` (sudah di `netlify.toml`).

## Lokal
```
copy .env.example .env   # isi nilainya
npm install
npm run dev
```
Setelah mengubah `Code.gs`, deploy ulang (Manage deployments > New version).
