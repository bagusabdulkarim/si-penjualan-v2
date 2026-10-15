'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { gas, rupiah } from '@/lib/client-api';
import { Alert, Loading, Empty, DeleteButton } from '@/components/ui';

/** Detail pesanan: kelola item (draft) + finalisasi menjadi faktur. */
export default function PesananDetailPage() {
  // useParams() butuh Suspense agar prerender build tidak gagal (Next 16).
  return (
    <Suspense fallback={<main className="container py-4"><Loading /></main>}>
      <DetailInner />
    </Suspense>
  );
}

function DetailInner() {
  const { id } = useParams();
  const router = useRouter();
  const [pesan, setPesan] = useState(null);
  const [detil, setDetil] = useState([]);
  const [produks, setProduks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [idProduk, setIdProduk] = useState('');
  const [jumlah, setJumlah] = useState('1');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [data, prd] = await Promise.all([gas('pesan.get', { id_pesan: id }), gas('produk.list')]);
      setPesan(data.pesan);
      setDetil(data.detil);
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

  const prodMap = Object.fromEntries(produks.map((p) => [p.id_produk, p]));
  const total = detil.reduce((s, d) => s + Number(d.jumlah) * Number(d.harga), 0);
  const isDraft = pesan?.status === 'draft';
  const stokDipilih = idProduk ? Number(prodMap[idProduk]?.stock ?? 0) : 0;

  async function addItem(e) {
    e.preventDefault();
    const jml = Number(jumlah);
    if (!idProduk) {
      setError('Pilih produk terlebih dahulu.');
      return;
    }
    if (!(jml > 0 && Number.isInteger(jml))) {
      setError('Jumlah harus bilangan bulat > 0.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await gas('pesan.addDetil', { id_pesan: id, id_produk: idProduk, jumlah: jml });
      setShowForm(false);
      setIdProduk('');
      setJumlah('1');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(d) {
    setBusy(true);
    setError('');
    try {
      await gas('pesan.removeDetil', { id_detil: d.id_detil });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (
      !window.confirm(
        'Finalisasi pesanan ini menjadi faktur?\n\nStok akan berkurang dan pesanan tidak dapat diubah lagi.'
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      const { id_faktur } = await gas('pesan.finalize', { id_pesan: id });
      router.push(`/transaksi/faktur/${id_faktur}`);
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

  if (!pesan) {
    return (
      <main className="container py-4">
        {error && <Alert>{error}</Alert>}
        <Link href="/transaksi/pesanan" className="btn btn-outline-secondary">
          ← Kembali ke daftar pesanan
        </Link>
      </main>
    );
  }

  return (
    <main className="container py-4">
      <Link href="/transaksi/pesanan" className="btn btn-sm btn-outline-secondary mb-3">
        ← Daftar pesanan
      </Link>

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h1 className="h4 mb-0">
          {pesan.id_pesan}{' '}
          <span className={`badge ${isDraft ? 'text-bg-warning' : 'text-bg-success'}`}>
            {isDraft ? 'Draft' : 'Final'}
          </span>
        </h1>
        {isDraft && (
          <button className="btn btn-success" onClick={finalize} disabled={busy || detil.length === 0}>
            {busy ? 'Memproses…' : 'Finalisasi → Faktur'}
          </button>
        )}
      </div>

      <p className="text-muted small">
        Tanggal: {String(pesan.tgl_pesan).slice(0, 16)}
      </p>

      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="h6 mb-0">Barang</h2>
        {isDraft && (
          <button className="btn btn-sm btn-primary" onClick={() => setShowForm(true)}>
            + Tambah Barang
          </button>
        )}
      </div>

      {detil.length === 0 ? (
        <Empty text="Belum ada barang di pesanan ini." />
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead>
              <tr>
                <th>Produk</th>
                <th className="text-end">Harga</th>
                <th className="text-end">Jumlah</th>
                <th className="text-end">Subtotal</th>
                {isDraft && <th style={{ width: 100 }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {detil.map((d) => (
                <tr key={d.id_detil}>
                  <td className="fw-medium">{prodMap[d.id_produk]?.nm_produk || d.id_produk}</td>
                  <td className="text-end">{rupiah(d.harga)}</td>
                  <td className="text-end">{d.jumlah}</td>
                  <td className="text-end">{rupiah(Number(d.jumlah) * Number(d.harga))}</td>
                  {isDraft && (
                    <td>
                      <DeleteButton busy={busy} onDelete={() => removeItem(d)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3} className="text-end">
                  Total
                </th>
                <th className="text-end">{rupiah(total)}</th>
                {isDraft && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Modal show={showForm} title="Tambah Barang" onClose={() => setShowForm(false)}>
        <form onSubmit={addItem}>
          <Field label="Produk *">
            <select
              className="form-select"
              value={idProduk}
              onChange={(e) => setIdProduk(e.target.value)}
            >
              <option value="">— Pilih produk —</option>
              {produks.map((p) => (
                <option key={p.id_produk} value={p.id_produk} disabled={Number(p.stock) <= 0}>
                  {p.nm_produk} — {rupiah(p.harga)} (stok: {p.stock})
                  {Number(p.stock) <= 0 ? ' — HABIS' : ''}
                </option>
              ))}
            </select>
          </Field>
          {idProduk && (
            <p className="text-muted small">
              Stok tersedia: <strong>{stokDipilih}</strong> {prodMap[idProduk]?.satuan}
            </p>
          )}
          <Field label="Jumlah *">
            <input
              type="number"
              min="1"
              step="1"
              className="form-control"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
            />
          </Field>
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowForm(false)}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menambah…' : 'Tambah'}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
