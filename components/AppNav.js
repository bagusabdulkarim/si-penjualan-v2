'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { me, logout, ROLE_LABEL } from '@/lib/client-api';

/**
 * Navbar aplikasi. Disembunyikan di halaman /login dan saat belum login.
 * Menu disesuaikan peran (server tetap menegakkan ulang setiap aksi).
 */
export default function AppNav() {
  // usePathname() butuh Suspense agar prerender build tidak gagal (Next 16).
  return (
    <Suspense fallback={null}>
      <NavInner />
    </Suspense>
  );
}

function NavInner() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [trxOpen, setTrxOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/login') {
      setUser(null);
      return;
    }
    let alive = true;
    me()
      .then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null));
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    setDropOpen(false);
    setTrxOpen(false);
  }, [pathname]);

  if (pathname === '/login' || !user) return null;

  const isAdmin = user.role === 'admin';
  const canSeeLaporan = user.role === 'admin' || user.role === 'owner';

  const linkCls = (href) =>
    `nav-link${pathname === href || (href !== '/' && pathname.startsWith(href)) ? ' active' : ''}`;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold" href="/">
          SI Penjualan
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Menu navigasi"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`collapse navbar-collapse${open ? ' show' : ''}`}>
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className={linkCls('/')} href="/">
                Beranda
              </Link>
            </li>
            <li className={`nav-item dropdown${dropOpen ? ' show' : ''}`}>
              <span
                className="nav-link dropdown-toggle"
                role="button"
                onClick={() => setDropOpen(!dropOpen)}
                style={{ cursor: 'pointer' }}
              >
                Master Data
              </span>
              <ul className={`dropdown-menu${dropOpen ? ' show' : ''}`}>
                <li>
                  <Link className="dropdown-item" href="/master/pelanggan">
                    Pelanggan
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" href="/master/produk">
                    Produk
                  </Link>
                </li>
                {isAdmin && (
                  <li>
                    <Link className="dropdown-item" href="/master/pengguna">
                      Pengguna
                    </Link>
                  </li>
                )}
              </ul>
            </li>
            <li className={`nav-item dropdown${trxOpen ? ' show' : ''}`}>
              <span
                className="nav-link dropdown-toggle"
                role="button"
                onClick={() => setTrxOpen(!trxOpen)}
                style={{ cursor: 'pointer' }}
              >
                Transaksi
              </span>
              <ul className={`dropdown-menu${trxOpen ? ' show' : ''}`}>
                <li>
                  <Link className="dropdown-item" href="/transaksi/pesanan">
                    Pesanan
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" href="/transaksi/faktur">
                    Faktur & Kuitansi
                  </Link>
                </li>
              </ul>
            </li>
            {canSeeLaporan && (
              <>
                <li className="nav-item">
                  <Link className={linkCls('/dashboard')} href="/dashboard">
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={linkCls('/laporan')} href="/laporan">
                    Laporan
                  </Link>
                </li>
              </>
            )}
          </ul>
          <span className="navbar-text me-3">
            {user.nama} <span className="badge text-bg-light">{ROLE_LABEL[user.role]}</span>
          </span>
          <button className="btn btn-outline-light btn-sm" onClick={logout}>
            Keluar
          </button>
        </div>
      </div>
    </nav>
  );
}
