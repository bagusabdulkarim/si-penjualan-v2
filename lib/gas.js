/**
 * Satu-satunya pintu keluar ke GAS Web App.
 *
 * Browser TIDAK PERNAH memanggil GAS langsung: URL dan API_TOKEN hanya ada
 * di environment server (Vercel), tidak pernah dikirim ke klien.
 */
export const SESSION_EXPIRED_MESSAGE = 'Sesi berakhir. Silakan login kembali.';

export async function callGas(action, params = {}, token = null) {
  const url = process.env.GAS_URL;
  const apiToken = process.env.GAS_TOKEN;
  if (!url || !apiToken) {
    return { ok: false, message: 'Konfigurasi server belum lengkap.', configError: true };
  }

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiToken, action, token, ...params }),
    });
  } catch {
    return { ok: false, message: 'Gagal menghubungi layanan.', networkError: true };
  }

  let json;
  try {
    json = await res.json();
  } catch {
    return { ok: false, message: 'Respons layanan tidak valid.', networkError: true };
  }

  if (json && json.ok === false && json.message === SESSION_EXPIRED_MESSAGE) {
    json.sessionExpired = true;
  }
  return json;
}
