'use client';

import { useEffect, useState } from 'react';
import { gas, me, ROLE_LABEL } from '@/lib/client-api';
import { Modal, Field, Alert, Loading, Empty, DeleteButton } from '@/components/ui';
import { DataList } from '@/components/DataList';

const EMPTY_FORM = { nama: '', username: '', password: '', role: 'kasir' };

/** CRUD Pengguna — khusus admin (middleware + server menegakkan). */
export default function PenggunaPage() {
  const [rows, setRows] = useState([]);
  const [selfId, setSelfId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [data, user] = await Promise.all([gas('pengguna.list'), me()]);
      setRows(data);
      setSelfId(user.id_user);
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
    setForm({ nama: row.nama || '', username: row.username || '', password: '', role: row.role });
    setShowForm(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.nama.trim() || !form.username.trim()) {
      setError('Nama dan username wajib diisi.');
      return;
    }
    if (!editing && form.password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await gas('pengguna.update', {
          id_user: editing.id_user,
          nama: form.nama.trim(),
          role: form.role,
        });
      } else {
        await gas('pengguna.create', {
          nama: form.nama.trim(),
          username: form.username.trim(),
          password: form.password,
          role: form.role,
        });
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
      await gas('pengguna.delete', { id_user: row.id_user });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function doResetPassword(e) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await gas('pengguna.resetPassword', {
        id_user: resetTarget.id_user,
        password: newPassword,
      });
      setResetTarget(null);
      setNewPassword('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">Pengguna</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Tambah
        </button>
      </div>

      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty text="Belum ada pengguna." />
      ) : (
        <DataList
          rows={rows}
          keyOf={(r) => r.id_user}
          columns={[
            {
              header: 'ID',
              render: (r) => <span className="text-muted small">{r.id_user}</span>,
            },
            {
              header: 'Nama',
              render: (r) => (
                <span className="fw-medium">
                  {r.nama}
                  {r.id_user === selfId && (
                    <span className="badge text-bg-info ms-2">Anda</span>
                  )}
                </span>
              ),
            },
            { header: 'Username', render: (r) => r.username },
            {
              header: 'Peran',
              render: (r) => (
                <span className="badge text-bg-secondary">{ROLE_LABEL[r.role] || r.role}</span>
              ),
            },
            {
              header: 'Aksi',
              render: (r) => (
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => openEdit(r)}
                  >
                    Ubah
                  </button>
                  <button
                    className="btn btn-sm btn-outline-warning"
                    onClick={() => {
                      setResetTarget(r);
                      setNewPassword('');
                    }}
                  >
                    Reset PW
                  </button>
                  {r.id_user !== selfId && (
                    <DeleteButton busy={deleting} onDelete={() => remove(r)} />
                  )}
                </div>
              ),
            },
          ]}
          renderCard={(r) => (
            <>
              <div className="fw-medium">
                {r.nama}
                {r.id_user === selfId && (
                  <span className="badge text-bg-info ms-2">Anda</span>
                )}
              </div>
              <div className="text-muted small mb-1">
                {r.username} • {r.id_user}
              </div>
              <div className="mb-1">
                <span className="badge text-bg-secondary">{ROLE_LABEL[r.role] || r.role}</span>
              </div>
              <div className="d-flex gap-2 flex-wrap mt-2">
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => openEdit(r)}
                >
                  Ubah
                </button>
                <button
                  className="btn btn-sm btn-outline-warning"
                  onClick={() => {
                    setResetTarget(r);
                    setNewPassword('');
                  }}
                >
                  Reset PW
                </button>
                {r.id_user !== selfId && (
                  <DeleteButton busy={deleting} onDelete={() => remove(r)} />
                )}
              </div>
            </>
          )}
        />
      )}

      <Modal
        show={showForm}
        title={editing ? 'Ubah Pengguna' : 'Tambah Pengguna'}
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
          <Field label="Username *">
            <input
              className="form-control"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              maxLength={50}
              disabled={!!editing}
            />
          </Field>
          {!editing && (
            <Field label="Password * (min. 8 karakter)">
              <input
                type="password"
                className="form-control"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
              />
            </Field>
          )}
          <Field label="Peran">
            <select
              className="form-select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="kasir">Kasir</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
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
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        show={!!resetTarget}
        title={`Reset password — ${resetTarget?.nama || ''}`}
        onClose={() => setResetTarget(null)}
      >
        <form onSubmit={doResetPassword}>
          <p className="text-muted small">
            Pengguna akan dipaksa login ulang di semua perangkat setelah password diganti.
          </p>
          <Field label="Password baru * (min. 8 karakter)">
            <input
              type="password"
              className="form-control"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setResetTarget(null)}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-warning" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
