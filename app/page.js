'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { me, ROLE_LABEL } from '@/lib/client-api';
import { Loading } from '@/components/ui';

/** Beranda: sapaan + kartu menu sesuai peran. */
export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    me()
      .then(setUser)
      .catch(() => {});
  }, []);

  if (!user) return <Loading text="Memuat…" />;

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
          <div className="card shadow-sm h-100 opacity-75">
            <div className="card-body">
              <h3 className="h6 card-title">
                🧾 Pesanan <span className="badge text-bg-secondary ms-1">Fase 4</span>
              </h3>
              <p className="card-text text-muted small mb-0">Segera hadir</p>
            </div>
          </div>
        </div>
      </div>

      {canSeeLaporan && (
        <>
          <h2 className="h6 text-muted text-uppercase mb-3">Pemantauan</h2>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <div className="card shadow-sm h-100 opacity-75">
                <div className="card-body">
                  <h3 className="h6 card-title">
                    📊 Dashboard <span className="badge text-bg-secondary ms-1">Fase 5</span>
                  </h3>
                  <p className="card-text text-muted small mb-0">Segera hadir</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
