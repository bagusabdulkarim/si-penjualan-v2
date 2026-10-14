# Sistem Informasi Penjualan v2

Aplikasi web untuk mengelola alur penjualan barang: master data (pengguna, pelanggan, produk),
transaksi pemesanan, faktur, kuitansi, hingga dashboard & laporan. **Rewrite** dari aplikasi
PHP native + MySQL (v1) yang tidak dapat dijalankan di Vercel.

Spesifikasi lengkap: `prd-sistem-informasi-penjualan-v2.md` (PRD v2.1, status DRAF).

## Arsitektur

| Lapisan | Teknologi |
|---|---|
| Frontend + API proxy | Next.js (App Router, JavaScript), di-hosting di Vercel |
| JSON API | Google Apps Script (Web App, `doGet`/`doPost`) |
| Database | Google Sheets (7 tab: Pengguna, Pelanggan, Produk, Pesan, DetilPesan, Faktur, Kuitansi) |
| UI | Bootstrap 5 (mobile-first untuk pemakaian kasir di HP) |

Semua request tulis dari browser melewati **Route Handler proxy** di Next.js — token GAS
hanya hidup di environment variable server dan tidak terekspos ke browser. Hak akses
(role Admin/Kasir/Owner) ditegakkan di sisi server (GAS), bukan hanya disembunyikan di UI.

## Alur deploy

Repo GitHub ini adalah **source of truth**. Vercel terhubung via integrasi Git:

- Push ke branch `main` → deploy otomatis ke **production**.
- Pull request / branch lain → **preview deployment** otomatis.
- **Tanpa deploy manual / upload langsung ke Vercel.**

## Environment variables

Salin `.env.example` menjadi `.env` (lokal) dan isi nilai aslinya. Di Vercel, isi lewat
dashboard project (Settings → Environment Variables). Jangan pernah commit nilai asli.

| Key | Keterangan |
|---|---|
| `GAS_URL` | URL publik Web App GAS |
| `GAS_TOKEN` | Token rahasia bersama Next.js ↔ GAS |
| `SESSION_SECRET` | Kunci cookie sesi (acak, min. 32 karakter) |
| `CSRF_SECRET` | Kunci token CSRF (acak, min. 32 karakter) |

## Status fase

- [x] **Fase 0** — Fondasi repo: Next.js + Bootstrap 5, `.env.example`, README, alur GitHub → Vercel.
- [ ] **Fase 1** — Lapisan data: skema 7 tab Sheet + skrip GAS (auth, LockService, RBAC server).
- [ ] **Fase 2** — Route Handler proxy + sesi (cookie httpOnly) + proteksi CSRF.
- [ ] **Fase 3** — Modul auth UI + master data CRUD.
- [ ] **Fase 4** — Modul transaksi (pesanan, faktur, kuitansi, cetak struk).
- [ ] **Fase 5** — Modul dashboard & laporan.
- [ ] **Fase 6** — Hardening & uji terima (checklist temuan review v1).
- [ ] **Fase 7** — Go-live & migrasi data (reset password seluruh pengguna).
