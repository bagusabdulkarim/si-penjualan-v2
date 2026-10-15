'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gas, me } from '@/lib/client-api';
import { Modal, Field, Alert, Loading, Empty, DeleteButton } from '@/components/ui';

const STATUS_LABEL = { draft: 'Draft', final: 'Final' };

/** Daftar pesanan + buat pesanan baru. */
export default function PesananPage() {
  const [rows, setRows] = useState([]);
  const [pelanggans, setPelanggans] = useState([]);
  const [filter, setFilter] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [idPelanggan, setIdPelanggan] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [data, plg, user] = await Promise.all([
        gas('pesan.list', filter ? { status: filter } : {}),
        gas('pelanggan.list'),
        me(),
      ]);
      setRows(data);
      setPelanggans(plg);
      setRole(user.role);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function create(e) {
    e.preventDefault();
    if (!idPelanggan) {
      setError('Pilih pelanggan terlebih dahulu.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { id_pesan } = await gas('pesan.create', { id_pelanggan: idPelanggan });
      window.location.href = `/transaksi/pesanan/${id_pesan}`;
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(row) {
    setDeleting(true);
    setError('');
    try {
      await gas('pesan.delete', { id_pesan: row.id_pesanan || row.id_pesan });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  const canDelete = role === 'admin';

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">Pesanan</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Pesanan Baru
        </button>
      </div>

      <div className="btn-group mb-3" role="group" aria-label="Filter status">
        {[
          ['', 'Semua'],
          ['draft', 'Draft'],
          ['final', 'Final'],
        ].map(([val, label]) => (
          <button
            key={val}
            type="button"
            className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFilter(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty text="Belum ada pesanan. Klik + Pesanan Baru untuk mulai." />
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th style={{ width: 170 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id_pesan}>
                  <td>
                    <Link href={`/transaksi/pesanan/${r.id_pesan}`}>{r.id_pesan}</Link>
                  </td>
                  <td className="text-muted small">{String(r.tgl_pesan).slice(0, 16)}</td>
                  <td>
                    <span
                      className={`badge ${r.status === 'draft' ? 'text-bg-warning' : 'text-bg-success'}`}
                    >
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <Link
                        className="btn btn-sm btn-outline-primary"
                        href={`/transaksi/pesanan/${r.id_pesan}`}
                      >
                        {r.status === 'draft' ? 'Kelola' : 'Lihat'}
                      </Link>
                      {canDelete && r.status === 'draft' && (
                        <DeleteButton busy={deleting} onDelete={() => remove(r)} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        show={showForm}
        title="Pesanan Baru"
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={create}>
          {pelanggans.length === 0 ? (
            <Alert type="warning">
              Belum ada data pelanggan.{' '}
              <Link href="/master/pelanggan">Tambah pelanggan dulu</Link>.
            </Alert>
          ) : (
            <Field label="Pelanggan *">
              <select
                className="form-select"
                value={idPelanggan}
                onChange={(e) => setIdPelanggan(e.target.value)}
              >
                <option value="">— Pilih pelanggan —</option>
                {pelanggans.map((p) => (
                  <option key={p.id_pelanggan} value={p.id_pelanggan}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowForm(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || pelanggans.length === 0}
            >
              {saving ? 'Membuat…' : 'Buat Pesanan'}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
