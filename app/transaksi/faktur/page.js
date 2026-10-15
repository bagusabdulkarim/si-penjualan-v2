'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gas, me, rupiah } from '@/lib/client-api';
import { Alert, Loading, Empty, DeleteButton } from '@/components/ui';

/** Daftar faktur + status lunas. */
export default function FakturPage() {
  const [rows, setRows] = useState([]);
  const [lunasSet, setLunasSet] = useState(new Set());
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [fakturs, kwts, user] = await Promise.all([
        gas('faktur.list'),
        gas('kuitansi.list'),
        me(),
      ]);
      setRows(fakturs);
      setLunasSet(new Set(kwts.map((k) => k.id_faktur)));
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

  async function remove(row) {
    setDeleting(true);
    setError('');
    try {
      await gas('faktur.delete', { id_faktur: row.id_faktur });
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
      <h1 className="h4 mb-3">Faktur</h1>

      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty text="Belum ada faktur. Finalisasi pesanan untuk menerbitkan faktur." />
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead>
              <tr>
                <th>ID Faktur</th>
                <th>ID Pesanan</th>
                <th>Tanggal</th>
                <th className="text-end">Total</th>
                <th>Status Bayar</th>
                <th style={{ width: 170 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const lunas = lunasSet.has(r.id_faktur);
                return (
                  <tr key={r.id_faktur}>
                    <td>
                      <Link href={`/transaksi/faktur/${r.id_faktur}`}>{r.id_faktur}</Link>
                    </td>
                    <td className="text-muted small">{r.id_pesan}</td>
                    <td className="text-muted small">{String(r.tgl_faktur).slice(0, 16)}</td>
                    <td className="text-end fw-medium">{rupiah(r.total)}</td>
                    <td>
                      <span className={`badge ${lunas ? 'text-bg-success' : 'text-bg-warning'}`}>
                        {lunas ? 'Lunas' : 'Belum bayar'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Link
                          className="btn btn-sm btn-outline-primary"
                          href={`/transaksi/faktur/${r.id_faktur}`}
                        >
                          {lunas ? 'Kuitansi' : 'Bayar'}
                        </Link>
                        {canDelete && !lunas && (
                          <DeleteButton busy={deleting} onDelete={() => remove(r)} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
