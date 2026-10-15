'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gas, me } from '@/lib/client-api';
import { Modal, Field, Alert, Loading, Empty, DeleteButton } from '@/components/ui';
import { DataList } from '@/components/DataList';

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
        <DataList
          rows={rows}
          keyOf={(r) => r.id_pesan}
          columns={[
            {
              header: 'ID',
              render: (r) => (
                <Link href={`/transaksi/pesanan/${r.id_pesan}`}>{r.id_pesan}</Link>
              ),
            },
            {
              header: 'Tanggal',
              render: (r) => (
                <span className="text-muted small">{String(r.tgl_pesan).slice(0, 16)}</span>
              ),
            },
            {
              header: 'Status',
              render: (r) => (
                <span
                  className={`badge ${r.status === 'draft' ? 'text-bg-warning' : 'text-bg-success'}`}
                >
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              ),
            },
            {
              header: 'Aksi',
              render: (r) => (
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
              ),
            },
          ]}
          renderCard={(r) => (
            <>
              <div className="d-flex justify-content-between align-items-center">
                <Link href={`/transaksi/pesanan/${r.id_pesan}`} className="fw-medium">
                  {r.id_pesan}
                </Link>
                <span
                  className={`badge ${r.status === 'draft' ? 'text-bg-warning' : 'text-bg-success'}`}
                >
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </div>
              <div className="text-muted small mb-1">{String(r.tgl_pesan).slice(0, 16)}</div>
              <div className="d-flex gap-2 mt-1">
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
            </>
          )}
        />
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
