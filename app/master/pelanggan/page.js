'use client';

import { useEffect, useState } from 'react';
import { gas, me } from '@/lib/client-api';
import { Modal, Field, Alert, Loading, Empty, DeleteButton } from '@/components/ui';
import { DataList } from '@/components/DataList';

const EMPTY_FORM = { nama: '', alamat: '', telepon: '', email: '' };

/** CRUD Pelanggan. Kasir boleh tambah/ubah; hapus khusus admin (server menegakkan). */
export default function PelangganPage() {
  const [rows, setRows] = useState([]);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [data, user] = await Promise.all([gas('pelanggan.list'), me()]);
      setRows(data);
      setRole(user.role);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      nama: row.nama || '',
      alamat: row.alamat || '',
      telepon: row.telepon || '',
      email: row.email || '',
    });
    setShowForm(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.nama.trim()) {
      setError('Nama pelanggan wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await gas('pelanggan.update', { id_pelanggan: editing.id_pelanggan, ...form });
      } else {
        await gas('pelanggan.create', form);
      }
      setShowForm(false);
      await load();
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
      await gas('pelanggan.delete', { id_pelanggan: row.id_pelanggan });
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
        <h1 className="h4 mb-0">Pelanggan</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Tambah
        </button>
      </div>

      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty text="Belum ada pelanggan. Klik + Tambah untuk membuat yang pertama." />
      ) : (
        <DataList
          rows={rows}
          keyOf={(r) => r.id_pelanggan}
          columns={[
            {
              header: 'ID',
              render: (r) => <span className="text-muted small">{r.id_pelanggan}</span>,
            },
            { header: 'Nama', render: (r) => <span className="fw-medium">{r.nama}</span> },
            { header: 'Alamat', render: (r) => r.alamat || '—' },
            { header: 'Telepon', render: (r) => r.telepon || '—' },
            { header: 'Email', render: (r) => r.email || '—' },
            {
              header: 'Aksi',
              render: (r) => (
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => openEdit(r)}
                  >
                    Ubah
                  </button>
                  {canDelete && (
                    <DeleteButton busy={deleting} onDelete={() => remove(r)} />
                  )}
                </div>
              ),
            },
          ]}
          renderCard={(r) => (
            <>
              <div className="fw-medium">{r.nama}</div>
              <div className="text-muted small mb-1">{r.id_pelanggan}</div>
              {r.alamat && <div className="small">{r.alamat}</div>}
              {(r.telepon || r.email) && (
                <div className="small text-muted">
                  {[r.telepon, r.email].filter(Boolean).join(' • ')}
                </div>
              )}
              <div className="d-flex gap-2 mt-2">
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => openEdit(r)}
                >
                  Ubah
                </button>
                {canDelete && (
                  <DeleteButton busy={deleting} onDelete={() => remove(r)} />
                )}
              </div>
            </>
          )}
        />
      )}

      <Modal
        show={showForm}
        title={editing ? 'Ubah Pelanggan' : 'Tambah Pelanggan'}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={save}>
          <Field label="Nama *">
            <input
              className="form-control"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              maxLength={100}
            />
          </Field>
          <Field label="Alamat">
            <textarea
              className="form-control"
              rows={2}
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              maxLength={255}
            />
          </Field>
          <div className="row">
            <div className="col-6">
              <Field label="Telepon">
                <input
                  className="form-control"
                  value={form.telepon}
                  onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                  maxLength={20}
                />
              </Field>
            </div>
            <div className="col-6">
              <Field label="Email">
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={100}
                />
              </Field>
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowForm(false)}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
