import Link from 'next/link';

/**
 * Halaman awal publik — tampil untuk pengunjung yang belum login.
 * Konsep visual: "buku kas & struk toko" — kertas hangat, tinta pekat,
 * dan cap LUNAS hijau sebagai aksen khas dunia kasir.
 */
export default function LandingPage() {
  return (
    <div className="landing">
      {/* Navigasi ringkas */}
      <header className="landing-nav">
        <div className="container d-flex align-items-center justify-content-between py-3">
          <span className="landing-brand">
            <span className="landing-brand-mark" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
                <path d="M8 7h8M8 11h8M8 15h5" />
              </svg>
            </span>
            SI Penjualan
          </span>
          <Link href="/login" className="btn btn-dark btn-sm px-4">
            Masuk
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="container">
        <div className="row align-items-center g-4 landing-hero">
          <div className="col-12 col-lg-6 landing-hero-copy">
            <h1 className="landing-title">
              Dari pesanan sampai lunas, tercatat rapi.
            </h1>
            <p className="landing-sub">
              SI Penjualan mencatat transaksi, stok, dan pendapatan toko
              dalam satu tempat — kasir menginput, owner memantau,
              semua dari HP.
            </p>
            <div className="d-flex gap-2 flex-wrap">
              <Link href="/login" className="btn btn-success btn-lg px-4">
                Masuk ke aplikasi
              </Link>
            </div>
            <p className="landing-note">
              Untuk kasir, admin, dan owner toko.
            </p>
          </div>

          {/* Visual: struk belanja */}
          <div className="col-12 col-lg-6 d-flex justify-content-center">
            <div className="receipt-wrap" aria-hidden="true">
              <div className="receipt-slot" />
              <div className="receipt-paper">
                <p className="rp-center rp-bold">TOKO BERKAH JAYA</p>
                <p className="rp-center">Jl. Merdeka No. 12, Bandung</p>
                <p className="rp-dash">- - - - - - - - - - - - - - -</p>
                <div className="rp-row"><span>2x Kopi Tubruk</span><span>20.000</span></div>
                <div className="rp-row"><span>1x Gula Pasir 1kg</span><span>17.500</span></div>
                <div className="rp-row"><span>3x Mie Instan</span><span>10.500</span></div>
                <p className="rp-dash">- - - - - - - - - - - - - - -</p>
                <div className="rp-row rp-bold"><span>Total</span><span>48.000</span></div>
                <div className="rp-row"><span>Tunai</span><span>50.000</span></div>
                <div className="rp-row"><span>Kembali</span><span>2.000</span></div>
                <p className="rp-dash">- - - - - - - - - - - - - - -</p>
                <p className="rp-center">Terima kasih & sampai jumpa</p>
                <div className="rp-stamp">LUNAS</div>
              </div>
            </div>
          </div>
        </div>

        {/* Alur kerja */}
        <section className="landing-section">
          <h2 className="landing-h2">Alur kerja sehari-hari</h2>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <div className="landing-step">
                <span className="landing-step-no">1</span>
                <h3>Catat pesanan</h3>
                <p>Kasir menginput pesanan pelanggan dari HP — cepat, tanpa antre.</p>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="landing-step">
                <span className="landing-step-no">2</span>
                <h3>Terbitkan faktur & terima bayar</h3>
                <p>Satu pesanan satu faktur. Status bayar terpantau sampai lunas.</p>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="landing-step">
                <span className="landing-step-no">3</span>
                <h3>Cetak kuitansi</h3>
                <p>Struk siap cetak 58mm, stok terpotong otomatis begitu lunas.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Fitur */}
        <section className="landing-section">
          <h2 className="landing-h2">Yang dijaga sistem</h2>
          <ul className="landing-feats">
            <li>
              <span className="landing-feat-ic" aria-hidden="true">🔑</span>
              <div>
                <strong>Peran & akses</strong>
                <span>Admin, kasir, dan owner — tiap peran hanya melihat menunya sendiri.</span>
              </div>
            </li>
            <li>
              <span className="landing-feat-ic" aria-hidden="true">🔒</span>
              <div>
                <strong>Stok terkunci</strong>
                <span>Dua kasir memfinalkan bersamaan pun stok tidak ganda dan tidak minus.</span>
              </div>
            </li>
            <li>
              <span className="landing-feat-ic" aria-hidden="true">📊</span>
              <div>
                <strong>Dashboard & laporan</strong>
                <span>Pendapatan harian sampai bulanan, bisa saring per kasir dan cetak.</span>
              </div>
            </li>
            <li>
              <span className="landing-feat-ic" aria-hidden="true">🧾</span>
              <div>
                <strong>Harga tercatat saat transaksi</strong>
                <span>Harga barang dikunci di nota — perubahan harga belakangan tidak merusak riwayat.</span>
              </div>
            </li>
          </ul>
        </section>
      </main>

      <footer className="landing-foot">
        <div className="container d-flex justify-content-between align-items-center py-4 flex-wrap gap-2">
          <span>SI Penjualan v2 — sistem informasi penjualan</span>
          <Link href="/login" className="landing-foot-link">Masuk ke aplikasi</Link>
        </div>
      </footer>
    </div>
  );
}
