'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gas, me, rupiah } from '@/lib/client-api';
import { Alert, Loading, Empty, DeleteButton } from '@/components/ui';
import { DataList } from '@/components/DataList';

/** Daftar faktur + status lunas. */
function BayarBadge({ lunas }) {
  return (
    <span className={`badge ${lunas ? 'text-bg-success' : 'text-bg-warning'}`}>
      {lunas ? 'Lunas' : 'Belum bayar'}
    </span>
  );
}

/** Tombol aksi per faktur. Dipakai di tabel desktop & kartu HP. */
function FakturActions({ row, lunas, canDelete, deleting, onDelete }) {
  return (
    <div className="d-flex gap-2">
      <Link
        className="btn btn-sm btn-outline-primary"
        href={`/transaksi/faktur/${row.id_faktur}`}
      >
        {lunas ? 'Kuitansi' : 'Bayar'}
      </Link>
      {canDelete && !lunas && (
        <DeleteButton busy={deleting} onDelete={onDelete} />
      )}
    </div>
  );
}
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
        <DataList
          rows={rows}
          keyOf={(r) => r.id_faktur}
          columns={[
            {
              header: 'ID Faktur',
              render: (r) => (
                <Link href={`/transaksi/faktur/${r.id_faktur}`}>{r.id_faktur}</Link>
              ),
            },
            {
              header: 'ID Pesanan',
              render: (r) => <span className="text-muted small">{r.id_pesan}</span>,
            },
            {
              header: 'Tanggal',
              render: (r) => (
                <span className="text-muted small">{String(r.tgl_faktur).slice(0, 16)}</span>
              ),
            },
            {
              header: 'Total',
              thClassName: 'text-end',
              tdClassName: 'text-end fw-medium',
              render: (r) => rupiah(r.total),
            },
            {
              header: 'Status Bayar',
              render: (r) => <BayarBadge lunas={lunasSet.has(r.id_faktur)} />,
            },
            {
              header: 'Aksi',
              render: (r) => <FakturActions row={r} lunas={lunasSet.has(r.id_faktur)} canDelete={canDelete} deleting={deleting} onDelete={() => remove(r)} />,
            },
          ]}
          renderCard={(r) => {
            const lunas = lunasSet.has(r.id_faktur);
            return (
              <>
                <div className="d-flex justify-content-between align-items-center">
                  <Link href={`/transaksi/faktur/${r.id_faktur}`} className="fw-medium">
                    {r.id_faktur}
                  </Link>
                  <BayarBadge lunas={lunas} />
                </div>
                <div className="text-muted small mb-1">
                  {r.id_pesan} • {String(r.tgl_faktur).slice(0, 16)}
                </div>
                <div className="fw-medium">{rupiah(r.total)}</div>
                <div className="mt-2">
                  <FakturActions row={r} lunas={lunas} canDelete={canDelete} deleting={deleting} onDelete={() => remove(r)} />
                </div>
              </>
            );
          }}
        />
      )}
    </main>
  );
}
