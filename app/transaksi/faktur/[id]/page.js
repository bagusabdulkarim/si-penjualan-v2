'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { gas, rupiah } from '@/lib/client-api';
import { Alert, Loading } from '@/components/ui';
import { DataList } from '@/components/DataList';

/** Detail faktur: bayar lunas + kuitansi + cetak struk thermal. */
export default function FakturDetailPage() {
  // useParams() butuh Suspense agar prerender build tidak gagal (Next 16).
  return (
    <Suspense fallback={<main className="container py-4"><Loading /></main>}>
      <DetailInner />
    </Suspense>
  );
}

function DetailInner() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [produks, setProduks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [f, prd] = await Promise.all([
        gas('faktur.get', { id_faktur: id }),
        gas('produk.list'),
      ]);
      setData(f);
      setProduks(prd);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function bayar() {
    if (!window.confirm(`Terima pembayaran lunas sebesar ${rupiah(data.faktur.total)}?`)) return;
    setBusy(true);
    setError('');
    try {
      await gas('kuitansi.create', { id_faktur: id });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="container py-4">
        <Loading />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container py-4">
        {error && <Alert>{error}</Alert>}
        <Link href="/transaksi/faktur" className="btn btn-outline-secondary">
          ← Kembali ke daftar faktur
        </Link>
      </main>
    );
  }

  const { faktur, detil, kuitansi, lunas } = data;
  const prodMap = Object.fromEntries(produks.map((p) => [p.id_produk, p]));

  return (
    <main className="container py-4">
      <div className="no-print">
        <Link href="/transaksi/faktur" className="btn btn-sm btn-outline-secondary mb-3">
          ← Daftar faktur
        </Link>
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h1 className="h4 mb-0">
            {faktur.id_faktur}{' '}
            <span className={`badge ${lunas ? 'text-bg-success' : 'text-bg-warning'}`}>
              {lunas ? 'Lunas' : 'Belum bayar'}
            </span>
          </h1>
          {!lunas && (
            <button className="btn btn-success" onClick={bayar} disabled={busy}>
              {busy ? 'Memproses…' : `Bayar Lunas (${rupiah(faktur.total)})`}
            </button>
          )}
        </div>

        {error && <Alert onClose={() => setError('')}>{error}</Alert>}

        <p className="text-muted small">
          Pesanan: {faktur.id_pesan} • Tanggal: {String(faktur.tgl_faktur).slice(0, 16)}
        </p>

        <div className="mb-4">
          <DataList
            rows={detil}
            keyOf={(d) => d.id_detil}
            pageSize={8}
            columns={[
              {
                header: 'Produk',
                render: (d) => prodMap[d.id_produk]?.nm_produk || d.id_produk,
              },
              {
                header: 'Harga',
                thClassName: 'text-end',
                tdClassName: 'text-end',
                render: (d) => rupiah(d.harga),
              },
              {
                header: 'Jumlah',
                thClassName: 'text-end',
                tdClassName: 'text-end',
                render: (d) => d.jumlah,
              },
              {
                header: 'Subtotal',
                thClassName: 'text-end',
                tdClassName: 'text-end',
                render: (d) => rupiah(Number(d.jumlah) * Number(d.harga)),
              },
            ]}
            tfoot={
              <tfoot>
                <tr>
                  <th colSpan={3} className="text-end">
                    Total
                  </th>
                  <th className="text-end">{rupiah(faktur.total)}</th>
                </tr>
              </tfoot>
            }
            cardFooter={
              <div className="d-flex justify-content-between">
                <strong>Total</strong>
                <strong>{rupiah(faktur.total)}</strong>
              </div>
            }
            renderCard={(d) => (
              <>
                <div className="fw-medium">
                  {prodMap[d.id_produk]?.nm_produk || d.id_produk}
                </div>
                <div className="d-flex justify-content-between small text-muted mt-1">
                  <span>
                    {d.jumlah} × {rupiah(d.harga)}
                  </span>
                  <span className="fw-medium text-dark">
                    {rupiah(Number(d.jumlah) * Number(d.harga))}
                  </span>
                </div>
              </>
            )}
          />
        </div>
      </div>

      {lunas && kuitansi && (
        <>
          <div className="no-print d-flex justify-content-end mb-3">
            <button className="btn btn-outline-primary" onClick={() => window.print()}>
              🖨️ Cetak Kuitansi
            </button>
          </div>
          <div className="receipt mx-auto">
            <div className="text-center mb-2">
              <strong>KUITANSI PEMBAYARAN</strong>
              <br />
              <span className="small">{kuitansi.id_kuitansi}</span>
            </div>
            <div className="small mb-2">
              <div>Tanggal: {String(kuitansi.tgl_kuitansi).slice(0, 16)}</div>
              <div>Faktur: {faktur.id_faktur}</div>
            </div>
            <hr className="my-2" />
            {detil.map((d) => (
              <div key={d.id_detil} className="small">
                <div>{prodMap[d.id_produk]?.nm_produk || d.id_produk}</div>
                <div className="d-flex justify-content-between">
                  <span>
                    {d.jumlah} × {rupiah(d.harga)}
                  </span>
                  <span>{rupiah(Number(d.jumlah) * Number(d.harga))}</span>
                </div>
              </div>
            ))}
            <hr className="my-2" />
            <div className="d-flex justify-content-between">
              <strong>Total</strong>
              <strong>{rupiah(faktur.total)}</strong>
            </div>
            <div className="d-flex justify-content-between small">
              <span>Jumlah bayar</span>
              <span>{rupiah(kuitansi.jumlah_bayar)}</span>
            </div>
            <div className="text-center mt-3">
              <strong>*** LUNAS ***</strong>
              <br />
              <span className="small">Terima kasih atas pembayaran Anda.</span>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
