'use client';

import { useState } from 'react';

/** Modal Bootstrap tanpa bootstrap.js — tampil via state React. */
export function Modal({ show, title, onClose, children }) {
  if (!show) return null;
  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Tutup" />
            </div>
            <div className="modal-body">{children}</div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

export function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

export function Alert({ type = 'danger', children, onClose }) {
  return (
    <div className={`alert alert-${type} alert-dismissible fade show`} role="alert">
      {children}
      {onClose && (
        <button type="button" className="btn-close" onClick={onClose} aria-label="Tutup" />
      )}
    </div>
  );
}

export function Loading({ text = 'Memuat…' }) {
  return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">{text}</span>
      </div>
      <p className="text-muted mt-2 mb-0">{text}</p>
    </div>
  );
}

export function Empty({ text = 'Belum ada data.' }) {
  return <p className="text-muted text-center py-4 mb-0">{text}</p>;
}

/**
 * Tombol hapus dua-tahap: klik pertama -> konfirmasi inline,
 * klik "Ya, hapus" -> eksekusi.
 */
export function DeleteButton({ onDelete, label = 'Hapus', busy = false }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        onClick={() => setConfirming(true)}
      >
        {label}
      </button>
    );
  }
  return (
    <span className="d-inline-flex gap-1 align-items-center">
      <small className="text-muted">Yakin?</small>
      <button
        type="button"
        className="btn btn-sm btn-danger"
        disabled={busy}
        onClick={() => {
          onDelete();
          setConfirming(false);
        }}
      >
        Ya
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setConfirming(false)}
      >
        Batal
      </button>
    </span>
  );
}
