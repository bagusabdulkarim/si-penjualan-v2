'use client';

import { useEffect, useState } from 'react';
import { gas, rupiah } from '@/lib/client-api';
import { Modal, Field, Alert, Loading, Empty, DeleteButton } from '@/components/ui';
import { DataList } from '@/components/DataList';

const EMPTY_FORM = { nm_produk: '', satuan: 'pcs', harga: '', stock: '' };

/** Badge stok: merah bila habis. Dipakai di tabel desktop & kartu HP. */
function StockBadge({ stock }) {
  return (
    <span className={`badge ${Number(stock) <= 0 ? 'text-bg-danger' : 'text-bg-secondary'}`}>
      {stock}
    </span>
  );
}

/** CRUD Produk — khusus admin (middleware + server menegakkan). */
export default function ProdukPage() {
  const [rows, setRows] = useState([]);
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
      setRows(await gas('produk.list'));
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
      nm_produk: row.nm_produk || '',
      satuan: row.satuan || 'pcs',
      harga: String(row.harga ?? ''),
      stock: String(row.stock ?? ''),
    });
    setShowForm(true);
  }

  async function save(e) {
    e.preventDefault();
    const harga = Number(form.harga);
    const stock = Number(form.stock === '' ? 0 : form.stock);
    if (!form.nm_produk.trim()) {
      setError('Nama produk wajib diisi.');
      return;
    }
    if (!(harga >= 0)) {
      setError('Harga harus angka >= 0.');
      return;
    }
    if (!(stock >= 0 && Number.isInteger(stock))) {
      setError('Stok harus bilangan bulat >= 0.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await gas('produk.update', {
          id_produk: editing.id_produk,
          nm_produk: form.nm_produk.trim(),
          satuan: form.satuan.trim() || 'pcs',
          harga,
          stock,
        });
      } else {
        await gas('produk.create', {
          nm_produk: form.nm_produk.trim(),
          satuan: form.satuan.trim() || 'pcs',
          harga,
          stock,
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
      await gas('produk.delete', { id_produk: row.id_produk });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">Produk</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Tambah
        </button>
      </div>

      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty text="Belum ada produk. Klik + Tambah untuk membuat yang pertama." />
      ) : (
        <DataList
          rows={rows}
          keyOf={(r) => r.id_produk}
          columns={[
            {
              header: 'ID',
              render: (r) => <span className="text-muted small">{r.id_produk}</span>,
            },
            { header: 'Nama Produk', render: (r) => <span className="fw-medium">{r.nm_produk}</span> },
            { header: 'Satuan', render: (r) => r.satuan },
            {
              header: 'Harga',
              thClassName: 'text-end',
              tdClassName: 'text-end',
              render: (r) => rupiah(r.harga),
            },
            {
              header: 'Stok',
              thClassName: 'text-end',
              tdClassName: 'text-end',
              render: (r) => <StockBadge stock={r.stock} />,
            },
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
                  <DeleteButton busy={deleting} onDelete={() => remove(r)} />
                </div>
              ),
            },
          ]}
          renderCard={(r) => (
            <>
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-medium">{r.nm_produk}</span>
                <StockBadge stock={r.stock} />
              </div>
              <div className="text-muted small mb-1">
                {r.id_produk} • {r.satuan}
              </div>
              <div className="fw-medium">{rupiah(r.harga)}</div>
              <div className="d-flex gap-2 mt-2">
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => openEdit(r)}
                >
                  Ubah
                </button>
                <DeleteButton busy={deleting} onDelete={() => remove(r)} />
              </div>
            </>
          )}
        />
      )}

      <Modal
        show={showForm}
        title={editing ? 'Ubah Produk' : 'Tambah Produk'}
        onClose={() => setShowForm(false)}
      >
        <form onSubmit={save}>
          <Field label="Nama produk *">
            <input
              className="form-control"
              value={form.nm_produk}
              onChange={(e) => setForm({ ...form, nm_produk: e.target.value })}
              maxLength={100}
            />
          </Field>
          <div className="row">
            <div className="col-4">
              <Field label="Satuan">
                <input
                  className="form-control"
                  value={form.satuan}
                  onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                  maxLength={20}
                />
              </Field>
            </div>
            <div className="col-4">
              <Field label="Harga *">
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={form.harga}
                  onChange={(e) => setForm({ ...form, harga: e.target.value })}
                />
              </Field>
            </div>
            <div className="col-4">
              <Field label="Stok">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="form-control"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
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
