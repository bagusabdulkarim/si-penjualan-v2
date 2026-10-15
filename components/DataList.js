'use client';

import { useEffect, useState } from 'react';

/**
 * Daftar data responsif + pagination client-side.
 *
 * - Layar md ke atas: tabel biasa.
 * - Layar kecil (HP): tiap baris jadi kartu.
 * - Pagination muncul otomatis bila baris > pageSize.
 *
 * Props:
 * - columns: [{ header, thClassName?, tdClassName?, render(row) }]
 * - rows: array data
 * - keyOf: (row) => key unik
 * - renderCard: (row) => isi kartu untuk tampilan HP
 * - tfoot: <tr> opsional untuk tabel desktop (mis. baris total)
 * - cardFooter: node opsional untuk bawah daftar kartu (mis. total)
 * - pageSize: default 10
 */
export function DataList({
  columns,
  rows,
  keyOf,
  renderCard,
  tfoot = null,
  cardFooter = null,
  pageSize = 10,
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  // Kembali ke halaman 1 setiap data berubah (filter/refresh).
  useEffect(() => {
    setPage(1);
  }, [rows]);

  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  // Nomor halaman ringkas: 1 … 4 5 [6] 7 … 12
  function pageItems() {
    const set = new Set([1, totalPages]);
    for (let p = safePage - 1; p <= safePage + 1; p++) {
      if (p > 1 && p < totalPages) set.add(p);
    }
    const nums = [...set].sort((a, b) => a - b);
    const out = [];
    let prev = 0;
    for (const n of nums) {
      if (n - prev > 1) out.push('…');
      out.push(n);
      prev = n;
    }
    return out;
  }

  const btn = (p, label, opts = {}) => (
    <li key={label + p} className={`page-item ${opts.active ? 'active' : ''} ${opts.disabled ? 'disabled' : ''}`}>
      <button
        type="button"
        className="page-link"
        disabled={opts.disabled}
        aria-label={opts.ariaLabel || `Halaman ${p}`}
        aria-current={opts.active ? 'page' : undefined}
        onClick={() => setPage(p)}
      >
        {label}
      </button>
    </li>
  );

  return (
    <>
      {/* Desktop / tablet: tabel */}
      <div className="d-none d-md-block">
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th key={i} className={c.thClassName || ''}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={keyOf(r)}>
                  {columns.map((c, i) => (
                    <td key={i} className={c.tdClassName || ''}>
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {tfoot}
          </table>
        </div>
      </div>

      {/* HP: kartu */}
      <div className="d-md-none">
        {pageRows.map((r) => (
          <div className="card shadow-sm mb-2" key={keyOf(r)}>
            <div className="card-body py-2 px-3">{renderCard(r)}</div>
          </div>
        ))}
        {cardFooter && (
          <div className="card border-primary mb-2">
            <div className="card-body py-2 px-3">{cardFooter}</div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Navigasi halaman data">
          <ul className="pagination pagination-sm justify-content-center mt-3 mb-1">
            {btn(1, '«', { disabled: safePage === 1, ariaLabel: 'Halaman pertama' })}
            {btn(safePage - 1, '‹', { disabled: safePage === 1, ariaLabel: 'Halaman sebelumnya' })}
            {pageItems().map((p, i) =>
              p === '…' ? (
                <li key={`e${i}`} className="page-item disabled">
                  <span className="page-link">…</span>
                </li>
              ) : (
                btn(p, String(p), { active: p === safePage })
              )
            )}
            {btn(safePage + 1, '›', { disabled: safePage === totalPages, ariaLabel: 'Halaman berikutnya' })}
            {btn(totalPages, '»', { disabled: safePage === totalPages, ariaLabel: 'Halaman terakhir' })}
          </ul>
          <p className="text-center text-muted small mb-0">
            Menampilkan {start + 1}–{start + pageRows.length} dari {rows.length} data
          </p>
        </nav>
      )}
    </>
  );
}
