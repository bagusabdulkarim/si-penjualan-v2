'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gas, rupiah } from '@/lib/client-api';
import { Alert, Loading, Empty } from '@/components/ui';
import { DataList } from '@/components/DataList';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Dashboard: ringkasan pendapatan (hanya transaksi lunas). Khusus admin/owner. */
export default function DashboardPage() {
  const [periode, setPeriode] = useState('hari');
  // new Date() tidak boleh dievaluasi saat prerender (Next 16) → isi di useEffect.
  const [tanggal, setTanggal] = useState('');
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setTanggal(todayStr());
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const s = await gas('laporan.dashboard', { periode, tanggal });
      setSummary(s);
      // Transaksi lunas terbaru pada periode yang sama.
      const dari = periode === 'bulan' ? tanggal.slice(0, 7) + '-01' : tanggal;
      const sampai = periode === 'bulan' ? tanggal.slice(0, 7) + '-31' : tanggal;
      const lap = await gas('laporan.penjualan', { dari, sampai });
      setRecent(lap.data.filter((r) => r.lunas).slice(0, 10));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!tanggal) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periode, tanggal]);

  const label = summary
    ? periode === 'bulan'
      ? `Bulan ${summary.tanggal.slice(0, 7)}`
      : `Tanggal ${summary.tanggal}`
    : '';

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h1 className="h4 mb-0">Dashboard</h1>
        <div className="d-flex gap-2 align-items-center">
          <div className="btn-group" role="group" aria-label="Periode">
            <button
              type="button"
              className={`btn btn-sm ${periode === 'hari' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setPeriode('hari')}
            >
              Harian
            </button>
            <button
              type="button"
              className={`btn btn-sm ${periode === 'bulan' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setPeriode('bulan')}
            >
              Bulanan
            </button>
          </div>
          <input
            type="date"
            className="form-control form-control-sm"
            style={{ width: 'auto' }}
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
      </div>

      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      {loading || !summary ? (
        <Loading />
      ) : (
        <>
          <p className="text-muted small">Periode: {label}</p>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <div className="card shadow-sm border-success">
                <div className="card-body">
                  <h2 className="h6 text-muted text-uppercase">Pendapatan Lunas</h2>
                  <p className="h4 mb-0 text-success">{rupiah(summary.total_pendapatan)}</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h2 className="h6 text-muted text-uppercase">Transaksi Lunas</h2>
                  <p className="h4 mb-0">{summary.jumlah_transaksi_lunas}</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <Link href="/transaksi/faktur" className="text-decoration-none">
                <div className="card shadow-sm border-warning h-100">
                  <div className="card-body">
                    <h2 className="h6 text-muted text-uppercase">Faktur Belum Bayar</h2>
                    <p className="h4 mb-0 text-warning">{summary.jumlah_faktur_belum_bayar}</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <h2 className="h6 text-muted text-uppercase mb-3">Transaksi Lunas Terbaru</h2>
          {recent.length === 0 ? (
            <Empty text="Belum ada transaksi lunas pada periode ini." />
          ) : (
            <DataList
              rows={recent}
              keyOf={(r) => r.id_faktur}
              pageSize={10}
              columns={[
                {
                  header: 'ID Faktur',
                  render: (r) => (
                    <Link href={`/transaksi/faktur/${r.id_faktur}`}>{r.id_faktur}</Link>
                  ),
                },
                {
                  header: 'Tanggal Bayar',
                  render: (r) => (
                    <span className="text-muted small">
                      {String(r.tgl_kuitansi).slice(0, 16)}
                    </span>
                  ),
                },
                {
                  header: 'Total',
                  thClassName: 'text-end',
                  tdClassName: 'text-end',
                  render: (r) => rupiah(r.total),
                },
              ]}
              renderCard={(r) => (
                <>
                  <Link href={`/transaksi/faktur/${r.id_faktur}`} className="fw-medium">
                    {r.id_faktur}
                  </Link>
                  <div className="text-muted small">
                    {String(r.tgl_kuitansi).slice(0, 16)}
                  </div>
                  <div className="fw-medium mt-1">{rupiah(r.total)}</div>
                </>
              )}
            />
          )}
        </>
      )}
    </main>
  );
}
