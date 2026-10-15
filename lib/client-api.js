/**
 * Helper sisi klien untuk memanggil API.
 * - Token CSRF dibaca dari cookie sip_csrf, dikirim via header x-csrf-token.
 * - 401 (sesi berakhir) -> lempar ke /login.
 * - Respons {ok:false} -> throw Error dengan pesan server (sudah generik & aman).
 */

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

async function parseJson(res) {
  try {
    return await res.json();
  } catch {
    throw new Error('Respons server tidak valid.');
  }
}

/** Panggil aksi GAS lewat proxy /api/gas. */
export async function gas(action, params = {}) {
  const csrf = getCookie('sip_csrf');
  const res = await fetch('/api/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf || '' },
    body: JSON.stringify({ action, ...params }),
  });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Sesi berakhir. Silakan login kembali.');
  }
  const json = await parseJson(res);
  if (!json.ok) throw new Error(json.message || 'Terjadi kesalahan.');
  return json.data;
}

export async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const json = await parseJson(res);
  if (!json.ok) throw new Error(json.message || 'Login gagal.');
  return json.user;
}

export async function logout() {
  const csrf = getCookie('sip_csrf');
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'x-csrf-token': csrf || '' },
  });
  window.location.href = '/login';
}

/** Info user dari sesi aktif; melempar ke /login bila belum login. */
export async function me() {
  const res = await fetch('/api/auth/me');
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Belum login.');
  }
  const json = await parseJson(res);
  if (!json.ok) throw new Error(json.message || 'Gagal memuat profil.');
  return json.user;
}

export const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

export const ROLE_LABEL = { admin: 'Admin', kasir: 'Kasir', owner: 'Owner' };
