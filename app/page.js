'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ROLE_LABEL } from '@/lib/client-api';
import { Loading } from '@/components/ui';
import LandingPage from '@/components/LandingPage';

/**
 * Halaman awal:
 * - Tamu (belum login) -> landing page publik.
 * - Sudah login -> beranda dengan kartu menu sesuai peran.
 *
 * Catatan: cek sesi di sini pakai fetch langsung, bukan helper me(),
 * karena me() me-redirect paksa ke /login saat 401.
 */
export default function Home() {
  const [user, setUser] = useState(undefined); // undefined: masih cek, null: tamu

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          if (alive) setUser(null);
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (alive) setUser(json.ok ? json.user : null);
      })
      .catch(() => {
        if (alive) setUser(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (user === undefined) return <Loading text="Memuat…" />;
  if (user === null) return <LandingPage />;

  return <Beranda user={user} />;
}

function Beranda({ user }) {
  const isAdmin = user.role === 'admin';
  const canSeeLaporan = user.role === 'admin' || user.role === 'owner';

  return (
    <main className="container py-4">
      <div className="mb-4">
        <h1 className="h4">Halo, {user.nama} 👋</h1>
        <p className="text-muted mb-0">
          Anda masuk sebagai <span className="badge text-bg-primary">{ROLE_LABEL[user.role]}</span>
        </p>
      </div>

      <h2 className="h6 text-muted text-uppercase mb-3">Master Data</h2>
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <Link href="/master/pelanggan" className="text-decoration-none">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h3 className="h6 card-title">👥 Pelanggan</h3>
                <p className="card-text text-muted small mb-0">Kelola data pelanggan</p>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-12 col-md-4">
          <Link href="/master/produk" className="text-decoration-none">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h3 className="h6 card-title">📦 Produk</h3>
                <p className="card-text text-muted small mb-0">Kelola produk, harga & stok</p>
              </div>
            </div>
          </Link>
        </div>
        {isAdmin && (
          <div className="col-12 col-md-4">
            <Link href="/master/pengguna" className="text-decoration-none">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h3 className="h6 card-title">🔑 Pengguna</h3>
                  <p className="card-text text-muted small mb-0">Kelola akun & peran</p>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>

      <h2 className="h6 text-muted text-uppercase mb-3">Transaksi</h2>
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <Link href="/transaksi/pesanan" className="text-decoration-none">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h3 className="h6 card-title">🧾 Pesanan</h3>
                <p className="card-text text-muted small mb-0">Buat & kelola pesanan</p>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-12 col-md-4">
          <Link href="/transaksi/faktur" className="text-decoration-none">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h3 className="h6 card-title">💳 Faktur & Kuitansi</h3>
                <p className="card-text text-muted small mb-0">Bayar & cetak kuitansi</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {canSeeLaporan && (
        <>
          <h2 className="h6 text-muted text-uppercase mb-3">Pemantauan</h2>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <Link href="/dashboard" className="text-decoration-none">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h3 className="h6 card-title">📊 Dashboard</h3>
                    <p className="card-text text-muted small mb-0">Ringkasan pendapatan</p>
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-12 col-md-4">
              <Link href="/laporan" className="text-decoration-none">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h3 className="h6 card-title">📑 Laporan</h3>
                    <p className="card-text text-muted small mb-0">Rekap penjualan per periode</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
