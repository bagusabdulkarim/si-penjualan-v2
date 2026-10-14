# Setup Google Apps Script — SI Penjualan v2

Panduan ini dikerjakan di akun Google **bagusabdulkarim@gmail.com**
(pemilik spreadsheet database). Estimasi waktu: ±10 menit.

## 1. Buat project Apps Script

1. Buka <https://script.google.com> → **+ New project**.
2. Ganti nama project menjadi `SI Penjualan v2 — API`.
3. Hapus isi editor, lalu **paste seluruh isi `Code.gs`** dari folder ini.
4. **Save** (Ctrl/Cmd+S).

## 2. Isi Script Properties

Buka **Project Settings** (ikon roda gigi) → bagian **Script Properties** →
**Add script property**, isi dua baris ini:

| Property         | Value                                                        |
|------------------|--------------------------------------------------------------|
| `SPREADSHEET_ID` | `1hQQYnwj8JZ10itkl1vTd3_sxS3R-n2hrhOJ5Jyh_Lug`                |
| `API_TOKEN`      | token acak min. 32 karakter (contoh cara buat: jalankan `Utilities.getUuid()+Utilities.getUuid()` di editor, atau pakai password manager) |

> `API_TOKEN` adalah rahasia bersama antara GAS dan server Next.js.
> Jangan pernah menaruhnya di kode yang di-commit — hanya di Script Properties
> dan di environment variable Vercel (`GAS_TOKEN`).

## 3. Deploy sebagai Web App

1. Klik **Deploy → New deployment**.
2. Jenis: **Web app**.
3. **Execute as:** `Me (bagusabdulkarim@gmail.com)`.
4. **Who has access:** `Anyone`.
   - "Anyone" diperlukan karena Next.js memanggil tanpa OAuth Google.
   - Keamanannya dipegang `API_TOKEN` di body request + token sesi per pengguna.
5. Klik **Deploy** → **Authorize access** → pilih akun → **Advanced → Go to
   project (unsafe)** → **Allow**. (Peringatan "unsafe" muncul karena aplikasi
   belum diverifikasi Google; ini wajar untuk pemakaian internal.)
6. Salin **Web app URL** — inilah `GAS_URL` untuk `.env` / environment Vercel.

## 4. Tes cepat

Buka Web app URL di browser. Harus muncul:

```json
{"ok":true,"service":"si-penjualan-v2","time":"..."}
```

## 5. Buat akun admin pertama (sekali saja)

1. Di editor Apps Script, pilih fungsi **`bootstrapAdmin`** di dropdown
   sebelah tombol Run, lalu klik **Run**.
2. Buka **Executions** (ikon jam) → klik eksekusi terakhir → lihat **Logs**:
   tercatat username `admin` + password sementara.
3. **Segera** login ke aplikasi dan ganti password via menu Kelola Pengguna
   (atau fungsi `pengguna.resetPassword`).

> Password lama berformat MD5 **tidak dapat dimigrasi** (keputusan PRD) —
> seluruh pengguna v1 wajib dibuatkan akun baru / reset password.

## 6. (Opsional) Data demo untuk pengujian

Jalankan fungsi **`seedDemo`** dari editor → membuat 1 pelanggan + 3 produk
contoh (nama berawalan "Demo —"). Hapus manual dari Sheet bila sudah tidak
diperlukan.

## 7. Alur perubahan kode GAS

Source of truth = `gas/Code.gs` di repo GitHub. Setiap perubahan:

1. Edit `Code.gs` di repo → commit → push.
2. Paste ulang ke editor Apps Script → **Deploy → Manage deployments** →
   edit deployment → **Version: New version** → Deploy.

Jangan edit langsung di editor tanpa memindahkan kembali ke repo —
nanti versinya selisih.
