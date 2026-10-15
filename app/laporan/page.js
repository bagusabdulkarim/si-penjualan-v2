'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gas, rupiah, ROLE_LABEL } from '@/lib/client-api';
import { Alert, Loading, Empty } from '@/components/ui';
import { DataList } from '@/components/DataList';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function firstOfMonth() {
  return todayStr().slice(0, 7) + '-01';
}

/** Laporan penjualan: filter rentang tanggal + kasir, bisa dicetak. Khusus admin/owner. */
export default function LaporanPage() {
  // new Date() tidak boleh dievaluasi saat prerender (Next 16) → isi di useEffect.
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [idUser, setIdUser] = useState('');
  const [penggunas, setPenggunas] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setDari(firstOfMonth());
    setSampai(todayStr());
  }, []);

  useEffect(() => {
    gas('pengguna.list')
      .then(setPenggunas)
      .catch(() => {});
  }, []);

  async function load() {
    if (!dari || !sampai) {
      setError('Rentang tanggal wajib diisi.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = { dari, sampai };
      if (idUser) params.id_user = idUser;
      setResult(await gas('laporan.penjualan', params));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!dari || !sampai) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dari, sampai]);

  const userMap = Object.fromEntries(penggunas.map((p) => [p.id_user, p]));

  return (
    <main className="container py-4">
      <div className="no-print">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h1 className="h4 mb-0">Laporan Penjualan</h1>
          {result && (
            <button className="btn btn-outline-primary btn-sm" onClick={() => window.print()}>
              🖨️ Cetak Laporan
            </button>
          )}
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-2 align-items-end">
              <div className="col-6 col-md-3">
                <label className="form-label small">Dari</label>
                <input
                  type="date"
                  className="form-control"
                  value={dari}
                  onChange={(e) => setDari(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small">Sampai</label>
                <input
                  type="date"
                  className="form-control"
                  value={sampai}
                  onChange={(e) => setSampai(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small">Kasir</label>
                <select
                  className="form-select"
                  value={idUser}
                  onChange={(e) => setIdUser(e.target.value)}
                >
                  <option value="">Semua kasir</option>
                  {penggunas.map((p) => (
                    <option key={p.id_user} value={p.id_user}>
                      {p.nama} ({ROLE_LABEL[p.role] || p.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-2">
                <button className="btn btn-primary w-100" onClick={load} disabled={loading}>
                  Tampilkan
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      </div>

      {loading || !result ? (
        <div className="no-print">
          <Loading />
        </div>
      ) : result.data.length === 0 ? (
        <div className="no-print">
          <Empty text="Tidak ada faktur pada rentang ini." />
        </div>
      ) : (
        <div className="laporan-print">
          <div className="d-none d-print-block text-center mb-3">
            <strong>LAPORAN PENJUALAN</strong>
            <br />
            <span className="small">
              Periode {result.dari} s/d {result.sampai}
              {idUser && userMap[idUser] ? ` • Kasir: ${userMap[idUser].nama}` : ''}
            </span>
          </div>
          <div className="row g-3 mb-3 no-print">
            <div className="col-4">
              <div className="card shadow-sm">
                <div className="card-body py-2">
                  <div className="small text-muted">Jumlah faktur</div>
                  <div className="h5 mb-0">{result.jumlah_faktur}</div>
                </div>
              </div>
            </div>
            <div className="col-8">
              <div className="card shadow-sm border-success">
                <div className="card-body py-2">
                  <div className="small text-muted">Total pendapatan (lunas)</div>
                  <div className="h5 mb-0 text-success">{rupiah(result.total_pendapatan_lunas)}</div>
                </div>
              </div>
            </div>
          </div>
          <DataList
            rows={result.data}
            keyOf={(r) => r.id_faktur}
            pageSize={15}
            columns={[
              {
                header: 'ID Faktur',
                render: (r) => (
                  <>
                    <Link
                      href={`/transaksi/faktur/${r.id_faktur}`}
                      className="no-print-link"
                    >
                      {r.id_faktur}
                    </Link>
                    <span className="d-none d-print-inline">{r.id_faktur}</span>
                  </>
                ),
              },
              {
                header: 'Tanggal',
                render: (r) => (
                  <span className="text-muted">{String(r.tgl_faktur).slice(0, 10)}</span>
                ),
              },
              {
                header: 'Kasir',
                render: (r) => userMap[r.id_user]?.nama || r.id_user || '—',
              },
              {
                header: 'Total',
                thClassName: 'text-end',
                tdClassName: 'text-end',
                render: (r) => rupiah(r.total),
              },
              {
                header: 'Status',
                render: (r) => (
                  <span className={`badge ${r.lunas ? 'text-bg-success' : 'text-bg-warning'}`}>
                    {r.lunas ? 'Lunas' : 'Belum bayar'}
                  </span>
                ),
              },
            ]}
            renderCard={(r) => (
              <>
                <div className="d-flex justify-content-between align-items-center">
                  <Link href={`/transaksi/faktur/${r.id_faktur}`} className="fw-medium">
                    {r.id_faktur}
                  </Link>
                  <span className={`badge ${r.lunas ? 'text-bg-success' : 'text-bg-warning'}`}>
                    {r.lunas ? 'Lunas' : 'Belum bayar'}
                  </span>
                </div>
                <div className="text-muted small">
                  {String(r.tgl_faktur).slice(0, 10)} • {userMap[r.id_user]?.nama || '—'}
                </div>
                <div className="fw-medium mt-1">{rupiah(r.total)}</div>
              </>
            )}
          />
          <p className="text-muted small no-print">
            Periode {result.dari} s/d {result.sampai} • {result.jumlah_faktur} faktur • pendapatan
            lunas {rupiah(result.total_pendapatan_lunas)}
          </p>
        </div>
      )}
    </main>
  );
}
