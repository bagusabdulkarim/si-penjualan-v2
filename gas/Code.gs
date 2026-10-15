/**
 * ============================================================================
 * SI Penjualan v2 — JSON API (Google Apps Script)
 * ----------------------------------------------------------------------------
 * Arsitektur : Next.js (Vercel) -> Route Handler proxy -> Web App ini -> Google Sheets
 * Database   : Spreadsheet "SI Penjualan v2 — Database" (7 tab, lihat SETUP.md)
 * Auth       : apiToken (Script Properties) + token sesi per pengguna (CacheService)
 * Password   : SHA-256 + salt acak per pengguna (format "salt$hash"). MD5 DILARANG.
 * Kunci      : operasi kritis (generate ID, finalisasi, kuitansi) memakai LockService.
 * Error      : pesan generik ke klien; detail hanya di log server (Stackdriver).
 * ============================================================================
 * WAJIB diisi di Script Properties (Project Settings > Script Properties):
 *   SPREADSHEET_ID : id spreadsheet database
 *   API_TOKEN      : token rahasia bersama (min. 32 karakter acak)
 * Deploy sebagai Web App: Execute as = Me, Who has access = Anyone.
 * Jalankan sekali: bootstrapAdmin()  (lihat SETUP.md)
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// Konfigurasi & konstanta
// ---------------------------------------------------------------------------
var TABS = {
  pengguna: 'Pengguna',
  pelanggan: 'Pelanggan',
  produk: 'Produk',
  pesan: 'Pesan',
  detil: 'DetilPesan',
  faktur: 'Faktur',
  kuitansi: 'Kuitansi'
};

var ROLE = { ADMIN: 'admin', KASIR: 'kasir', OWNER: 'owner' };
var SESSION_TTL = 21600; // 6 jam (maksimum CacheService)

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------
function doGet(e) {
  return json_({ ok: true, service: 'si-penjualan-v2', time: now_() });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // Token rahasia bersama — pertahanan lapis pertama (dipegang server Next.js).
    var props = PropertiesService.getScriptProperties();
    var apiToken = String(props.getProperty('API_TOKEN') || '');
    if (!apiToken || body.apiToken !== apiToken) {
      return json_({ ok: false, message: 'Akses ditolak.' });
    }

    var action = String(body.action || '');
    var handler = ROUTES[action];
    if (!handler) return json_({ ok: false, message: 'Aksi tidak dikenal.' });

    // Autentikasi sesi (kecuali login).
    var user = null;
    if (action !== 'auth.login') {
      user = getSession_(body.token);
      if (!user) return json_({ ok: false, message: 'Sesi berakhir. Silakan login kembali.' });
    }

    return json_({ ok: true, data: handler(body, user) });
  } catch (err) {
    // Jangan bocorkan detail internal/database ke klien (temuan review v1).
    console.error('[SI-Penjualan] ' + (err && err.stack || err));
    var msg = (err && err.isUser) ? err.message : 'Terjadi kesalahan pada server.';
    return json_({ ok: false, message: msg });
  }
}

// ---------------------------------------------------------------------------
// Util umum
// ---------------------------------------------------------------------------
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function now_() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
}

function err_(message) {
  var e = new Error(message);
  e.isUser = true;
  throw e;
}

/** Validasi field wajib ada & tidak kosong. */
function need_(body, fields) {
  fields.forEach(function (f) {
    if (body[f] === undefined || body[f] === null || String(body[f]).trim() === '') {
      err_('Field wajib diisi: ' + f);
    }
  });
}

function needRole_(user, roles) {
  if (roles.indexOf(user.role) === -1) err_('Akses ditolak untuk peran Anda.');
}

// ---------------------------------------------------------------------------
// Akses spreadsheet
// ---------------------------------------------------------------------------
function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) err_('SPREADSHEET_ID belum diisi di Script Properties.');
  return SpreadsheetApp.openById(id);
}

function headers_(tab) {
  return ss_().getSheetByName(TABS[tab]).getRange(1, 1, 1,
    ss_().getSheetByName(TABS[tab]).getLastColumn()).getValues()[0];
}

/** Baca seluruh baris sebagai array of object (kunci = nama kolom). */
function readAll_(tab) {
  var sh = ss_().getSheetByName(TABS[tab]);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var values = sh.getRange(1, 1, lastRow, sh.getLastColumn()).getValues();
  var head = values[0];
  return values.slice(1).map(function (row) {
    var obj = {};
    head.forEach(function (h, i) { obj[String(h)] = row[i]; });
    return obj;
  });
}

function findById_(tab, idCol, id) {
  var rows = readAll_(tab);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(id)) return rows[i];
  }
  return null;
}

/** Nomor baris sheet (1-based) untuk id tertentu; -1 bila tidak ada. */
function rowIndex_(tab, idCol, id) {
  var sh = ss_().getSheetByName(TABS[tab]);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  var col = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    .map(String).indexOf(String(idCol)) + 1;
  var ids = sh.getRange(2, col, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function appendObj_(tab, obj) {
  var sh = ss_().getSheetByName(TABS[tab]);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.appendRow(head.map(function (h) {
    return obj.hasOwnProperty(h) ? obj[h] : '';
  }));
}

function updateById_(tab, idCol, id, updates) {
  var r = rowIndex_(tab, idCol, id);
  if (r === -1) err_('Data tidak ditemukan.');
  var sh = ss_().getSheetByName(TABS[tab]);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  Object.keys(updates).forEach(function (k) {
    var c = head.indexOf(String(k)) + 1;
    if (c > 0) sh.getRange(r, c).setValue(updates[k]);
  });
}

function deleteById_(tab, idCol, id) {
  var r = rowIndex_(tab, idCol, id);
  if (r === -1) err_('Data tidak ditemukan.');
  ss_().getSheetByName(TABS[tab]).deleteRow(r);
}

/**
 * Generate ID berurutan yang aman dari race condition.
 * HARUS dipanggil di dalam LockService (oleh pemanggil).
 */
function nextId_(prefix, seqKey) {
  var props = PropertiesService.getScriptProperties();
  var n = parseInt(props.getProperty(seqKey) || '0', 10) + 1;
  props.setProperty(seqKey, String(n));
  return prefix + '-' + ('0000' + n).slice(-4);
}

// ---------------------------------------------------------------------------
// Password & sesi
// ---------------------------------------------------------------------------
function hashPassword_(plain) {
  var salt = Utilities.getUuid().replace(/-/g, '');
  var hex = bytesToHex_(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, salt + String(plain)));
  return salt + '$' + hex;
}

function verifyPassword_(plain, stored) {
  var parts = String(stored || '').split('$');
  if (parts.length !== 2) return false;
  var hex = bytesToHex_(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, parts[0] + String(plain)));
  return hex === parts[1];
}

function bytesToHex_(bytes) {
  return bytes.map(function (b) {
    return ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2);
  }).join('');
}

function createSession_(userRow) {
  var cache = CacheService.getScriptCache();
  // Satu sesi aktif per pengguna: login baru menggugurkan token lama
  // (mencegah session fixation — temuan review v1).
  var oldToken = cache.get('sess:' + userRow.id_user);
  if (oldToken) cache.remove('tok:' + oldToken);
  var token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  var payload = JSON.stringify({
    id_user: String(userRow.id_user),
    nama: String(userRow.nama),
    username: String(userRow.username),
    role: String(userRow.role)
  });
  cache.put('tok:' + token, payload, SESSION_TTL);
  cache.put('sess:' + userRow.id_user, token, SESSION_TTL);
  return token;
}

function getSession_(token) {
  if (!token) return null;
  var raw = CacheService.getScriptCache().get('tok:' + String(token));
  return raw ? JSON.parse(raw) : null;
}

function destroySession_(token) {
  if (!token) return;
  var cache = CacheService.getScriptCache();
  var raw = cache.get('tok:' + String(token));
  cache.remove('tok:' + String(token));
  if (raw) {
    try { cache.remove('sess:' + JSON.parse(raw).id_user); } catch (e) { /* abaikan */ }
  }
}

// ---------------------------------------------------------------------------
// Modul 1 — Autentikasi
// ---------------------------------------------------------------------------
var AuthApi = {
  login: function (body) {
    need_(body, ['username', 'password']);
    var rows = readAll_('pengguna');
    var user = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].username) === String(body.username)) { user = rows[i]; break; }
    }
    if (!user || !verifyPassword_(body.password, user.password)) {
      err_('Username atau password salah.');
    }
    var token = createSession_(user);
    return { token: token, user: {
      id_user: String(user.id_user), nama: String(user.nama),
      username: String(user.username), role: String(user.role) } };
  },

  logout: function (body, user) {
    destroySession_(body.token);
    return { ok: true };
  },

  me: function (body, user) { return user; }
};

// ---------------------------------------------------------------------------
// Modul 2 — Master Data
// ---------------------------------------------------------------------------
var PenggunaApi = {
  list: function (body, user) {
    needRole_(user, [ROLE.ADMIN]);
    return readAll_('pengguna').map(function (u) {
      return { id_user: String(u.id_user), nama: String(u.nama),
               username: String(u.username), role: String(u.role) }; // password tidak dikirim
    });
  },
  create: function (body, user) {
    needRole_(user, [ROLE.ADMIN]);
    need_(body, ['nama', 'username', 'password', 'role']);
    if (['admin', 'kasir', 'owner'].indexOf(body.role) === -1) err_('Role tidak valid.');
    if (String(body.password).length < 6) err_('Password minimal 6 karakter.');
    var dupe = readAll_('pengguna').some(function (u) {
      return String(u.username) === String(body.username);
    });
    if (dupe) err_('Username sudah dipakai.');
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var id = nextId_('USR', 'seq_user');
      appendObj_('pengguna', { id_user: id, nama: body.nama, username: body.username,
        password: hashPassword_(body.password), role: body.role });
      return { id_user: id };
    } finally { lock.releaseLock(); }
  },
  update: function (body, user) {
    needRole_(user, [ROLE.ADMIN]);
    need_(body, ['id_user', 'nama', 'role']);
    var target = findById_('pengguna', 'id_user', body.id_user);
    if (!target) err_('Data tidak ditemukan.');
    if (['admin', 'kasir', 'owner'].indexOf(body.role) === -1) err_('Role tidak valid.');
    if (String(target.id_user) === String(user.id_user) && body.role !== 'admin') {
      err_('Anda tidak dapat mencabut peran admin diri sendiri.');
    }
    updateById_('pengguna', 'id_user', body.id_user, { nama: body.nama, role: body.role });
    return { id_user: String(body.id_user) };
  },
  delete: function (body, user) {
    needRole_(user, [ROLE.ADMIN]);
    need_(body, ['id_user']);
    if (String(body.id_user) === String(user.id_user)) err_('Tidak dapat menghapus akun sendiri.');
    var admins = readAll_('pengguna').filter(function (u) { return u.role === 'admin'; });
    var target = findById_('pengguna', 'id_user', body.id_user);
    if (target && target.role === 'admin' && admins.length <= 1) {
      err_('Tidak dapat menghapus admin terakhir.');
    }
    deleteById_('pengguna', 'id_user', body.id_user);
    return { id_user: String(body.id_user) };
  },
  resetPassword: function (body, user) {
    needRole_(user, [ROLE.ADMIN]);
    need_(body, ['id_user', 'password']);
    if (String(body.password).length < 6) err_('Password minimal 6 karakter.');
    updateById_('pengguna', 'id_user', body.id_user, { password: hashPassword_(body.password) });
    destroySessionForUser_(body.id_user); // paksa login ulang di semua perangkat
    return { id_user: String(body.id_user) };
  }
};

function destroySessionForUser_(idUser) {
  var cache = CacheService.getScriptCache();
  var tok = cache.get('sess:' + idUser);
  if (tok) cache.remove('tok:' + tok);
  cache.remove('sess:' + idUser);
}

var PelangganApi = {
  list: function (body, user) { return readAll_('pelanggan'); },
  create: function (body, user) {
    needRole_(user, [ROLE.ADMIN, ROLE.KASIR]);
    need_(body, ['nama']);
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var id = nextId_('PLG', 'seq_pelanggan');
      appendObj_('pelanggan', { id_pelanggan: id, nama: body.nama,
        alamat: body.alamat || '', telepon: body.telepon || '', email: body.email || '' });
      return { id_pelanggan: id };
    } finally { lock.releaseLock(); }
  },
  update: function (body, user) {
    needRole_(user, [ROLE.ADMIN, ROLE.KASIR]);
    need_(body, ['id_pelanggan', 'nama']);
    updateById_('pelanggan', 'id_pelanggan', body.id_pelanggan,
      { nama: body.nama, alamat: body.alamat || '',
        telepon: body.telepon || '', email: body.email || '' });
    return { id_pelanggan: String(body.id_pelanggan) };
  },
  delete: function (body, user) {
    needRole_(user, [ROLE.ADMIN]);
    need_(body, ['id_pelanggan']);
    var dipakai = readAll_('pesan').some(function (p) {
      return String(p.id_pelanggan) === String(body.id_pelanggan);
    });
    if (dipakai) err_('Pelanggan sudah memiliki pesanan, tidak dapat dihapus.');
    deleteById_('pelanggan', 'id_pelanggan', body.id_pelanggan);
    return { id_pelanggan: String(body.id_pelanggan) };
  }
};

var ProdukApi = {
  list: function (body, user) { return readAll_('produk'); },
  create: function (body, user) {
    needRole_(user, [ROLE.ADMIN]);
    need_(body, ['nm_produk', 'harga']);
    var harga = Number(body.harga), stock = Number(body.stock || 0);
    if (!(harga >= 0)) err_('Harga tidak valid.');
    if (!(stock >= 0 && Math.floor(stock) === stock)) err_('Stok harus bilangan bulat >= 0.');
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var id = nextId_('PRD', 'seq_produk');
      appendObj_('produk', { id_produk: id, nm_produk: body.nm_produk,
        satuan: body.satuan || 'pcs', harga: harga, stock: stock });
      return { id_produk: id };
    } finally { lock.releaseLock(); }
  },
  update: function (body, user) {
    needRole_(user, [ROLE.ADMIN]);
    need_(body, ['id_produk', 'nm_produk', 'harga', 'stock']);
    var harga = Number(body.harga), stock = Number(body.stock);
    if (!(harga >= 0)) err_('Harga tidak valid.');
    if (!(stock >= 0 && Math.floor(stock) === stock)) err_('Stok harus bilangan bulat >= 0.');
    updateById_('produk', 'id_produk', body.id_produk,
      { nm_produk: body.nm_produk, satuan: body.satuan || 'pcs', harga: harga, stock: stock });
    return { id_produk: String(body.id_produk) };
  },
  delete: function (body, user) {
    needRole_(user, [ROLE.ADMIN]);
    need_(body, ['id_produk']);
    var dipakai = readAll_('detil').some(function (d) {
      return String(d.id_produk) === String(body.id_produk);
    });
    if (dipakai) err_('Produk sudah pernah ditransaksikan, tidak dapat dihapus.');
    deleteById_('produk', 'id_produk', body.id_produk);
    return { id_produk: String(body.id_produk) };
  }
};

// ---------------------------------------------------------------------------
// Modul 3 — Transaksi Pemesanan
// ---------------------------------------------------------------------------
var PesanApi = {
  create: function (body, user) {
    needRole_(user, [ROLE.ADMIN, ROLE.KASIR]);
    need_(body, ['id_pelanggan']);
    if (!findById_('pelanggan', 'id_pelanggan', body.id_pelanggan)) {
      err_('Pelanggan tidak ditemukan.');
    }
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var id = nextId_('PSN', 'seq_pesan');
      appendObj_('pesan', { id_pesan: id, id_pelanggan: body.id_pelanggan,
        id_user: user.id_user, tgl_pesan: now_(), status: 'draft' });
      return { id_pesan: id };
    } finally { lock.releaseLock(); }
  },

  list: function (body, user) {
    var rows = readAll_('pesan').sort(function (a, b) {
      return String(b.tgl_pesan).localeCompare(String(a.tgl_pesan));
    });
    if (body.status) rows = rows.filter(function (p) { return p.status === body.status; });
    return rows;
  },

  get: function (body, user) {
    need_(body, ['id_pesan']);
    var pesan = findById_('pesan', 'id_pesan', body.id_pesan);
    if (!pesan) err_('Pesanan tidak ditemukan.');
    var detil = readAll_('detil').filter(function (d) {
      return String(d.id_pesan) === String(body.id_pesan);
    });
    var faktur = readAll_('faktur').filter(function (f) {
      return String(f.id_pesan) === String(body.id_pesan);
    })[0] || null;
    return { pesan: pesan, detil: detil, faktur: faktur };
  },

  addDetil: function (body, user) {
    needRole_(user, [ROLE.ADMIN, ROLE.KASIR]);
    need_(body, ['id_pesan', 'id_produk', 'jumlah']);
    var jumlah = Number(body.jumlah);
    if (!(jumlah > 0 && Math.floor(jumlah) === jumlah)) err_('Jumlah harus bilangan bulat > 0.');
    var pesan = findById_('pesan', 'id_pesan', body.id_pesan);
    if (!pesan) err_('Pesanan tidak ditemukan.');
    if (pesan.status !== 'draft') err_('Pesanan sudah difinalisasi, tidak dapat diubah.');
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      // Semua dibaca/ditulis DI DALAM lock: penggabungan baris + validasi stok
      // konsisten walau dua kasir menambah produk yang sama persis bersamaan.
      var produk = findById_('produk', 'id_produk', body.id_produk);
      if (!produk) err_('Produk tidak ditemukan.');
      // Validasi stok di muka (aturan bisnis #5); validasi final tetap di finalize().
      var detilLama = readAll_('detil').filter(function (d) {
        return String(d.id_pesan) === String(body.id_pesan) &&
               String(d.id_produk) === String(body.id_produk);
      })[0];
      var totalMinta = jumlah + (detilLama ? Number(detilLama.jumlah) : 0);
      if (totalMinta > Number(produk.stock)) {
        err_('Stok tidak mencukupi. Tersedia: ' + produk.stock + ' ' + produk.satuan + '.');
      }
      if (detilLama) {
        updateById_('detil', 'id_detil', detilLama.id_detil, { jumlah: totalMinta });
        return { id_detil: String(detilLama.id_detil), merged: true };
      }
      var id = nextId_('DTL', 'seq_detil');
      // Snapshot harga: salin harga produk SAAT INI (aturan bisnis #1).
      appendObj_('detil', { id_detil: id, id_pesan: body.id_pesan,
        id_produk: body.id_produk, jumlah: jumlah, harga: Number(produk.harga) });
      return { id_detil: id, merged: false };
    } finally { lock.releaseLock(); }
  },

  removeDetil: function (body, user) {
    needRole_(user, [ROLE.ADMIN, ROLE.KASIR]);
    need_(body, ['id_detil']);
    var detil = findById_('detil', 'id_detil', body.id_detil);
    if (!detil) err_('Detil tidak ditemukan.');
    var pesan = findById_('pesan', 'id_pesan', detil.id_pesan);
    if (!pesan || pesan.status !== 'draft') err_('Pesanan sudah difinalisasi, tidak dapat diubah.');
    deleteById_('detil', 'id_detil', body.id_detil);
    return { id_detil: String(body.id_detil) };
  },

  /**
   * Finalisasi: ubah draft -> faktur. STOK BERKURANG TEPAT SATU KALI DI SINI
   * (aturan bisnis #2), di dalam LockService agar konsisten saat akses bersamaan.
   */
  finalize: function (body, user) {
    needRole_(user, [ROLE.ADMIN, ROLE.KASIR]);
    need_(body, ['id_pesan']);
    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var pesan = findById_('pesan', 'id_pesan', body.id_pesan);
      if (!pesan) err_('Pesanan tidak ditemukan.');
      if (pesan.status !== 'draft') err_('Pesanan sudah difinalisasi sebelumnya.');
      var detils = readAll_('detil').filter(function (d) {
        return String(d.id_pesan) === String(body.id_pesan);
      });
      if (!detils.length) err_('Pesanan kosong, tambahkan barang terlebih dahulu.');
      // Agregasi jumlah per produk dulu: satu produk bisa muncul di >1 baris
      // detil (mis. dua kasir menambah bersamaan). Validasi & pengurangan
      // dilakukan SEKALI per produk agar stok tidak pernah minus.
      var butuh = {};
      detils.forEach(function (d) {
        var k = String(d.id_produk);
        butuh[k] = (butuh[k] || 0) + Number(d.jumlah);
      });
      // Validasi ulang stok untuk SEMUA produk sebelum ada yang dikurangi.
      var prods = {};
      Object.keys(butuh).forEach(function (idProduk) {
        var p = findById_('produk', 'id_produk', idProduk);
        if (!p) err_('Produk tidak ditemukan: ' + idProduk);
        if (Number(p.stock) < butuh[idProduk]) {
          err_('Stok tidak mencukupi untuk "' + p.nm_produk +
               '". Tersedia: ' + p.stock + ', diminta: ' + butuh[idProduk] + '.');
        }
        prods[idProduk] = p;
      });
      // Kurangi stok sekali per produk.
      Object.keys(butuh).forEach(function (idProduk) {
        var p = prods[idProduk];
        updateById_('produk', 'id_produk', idProduk,
          { stock: Number(p.stock) - butuh[idProduk] });
      });
      var total = detils.reduce(function (s, d) {
        return s + Number(d.jumlah) * Number(d.harga);
      }, 0);
      var idFaktur = nextId_('FKT', 'seq_faktur');
      appendObj_('faktur', { id_faktur: idFaktur, id_pesan: body.id_pesan,
        tgl_faktur: now_(), total: total });
      updateById_('pesan', 'id_pesan', body.id_pesan, { status: 'final' });
      return { id_faktur: idFaktur, total: total };
    } finally { lock.releaseLock(); }
  },

  delete: function (body, user) {
    needRole_(user, [ROLE.ADMIN]);
    need_(body, ['id_pesan']);
    var pesan = findById_('pesan', 'id_pesan', body.id_pesan);
    if (!pesan) err_('Pesanan tidak ditemukan.');
    // Integritas relasi berantai (aturan bisnis #3).
    if (pesan.status !== 'draft') err_('Pesanan sudah memiliki faktur, tidak dapat dihapus.');
    readAll_('detil').filter(function (d) {
      return String(d.id_pesan) === String(body.id_pesan);
    }).forEach(function (d) { deleteById_('detil', 'id_detil', d.id_detil); });
    deleteById_('pesan', 'id_pesan', body.id_pesan);
    return { id_pesan: String(body.id_pesan) };
  }
};

// ---------------------------------------------------------------------------
// Modul 4 — Faktur & Kuitansi
// ---------------------------------------------------------------------------
var FakturApi = {
  list: function (body, user) {
    return readAll_('faktur').sort(function (a, b) {
      return String(b.tgl_faktur).localeCompare(String(a.tgl_faktur));
    });
  },
  get: function (body, user) {
    need_(body, ['id_faktur']);
    var faktur = findById_('faktur', 'id_faktur', body.id_faktur);
    if (!faktur) err_('Faktur tidak ditemukan.');
    var pesan = findById_('pesan', 'id_pesan', faktur.id_pesan);
    var detil = readAll_('detil').filter(function (d) {
      return String(d.id_pesan) === String(faktur.id_pesan);
    });
    var kuitansi = readAll_('kuitansi').filter(function (k) {
      return String(k.id_faktur) === String(body.id_faktur);
    })[0] || null;
    return { faktur: faktur, pesan: pesan, detil: detil, kuitansi: kuitansi,
             lunas: !!kuitansi };
  },
  delete: function (body, user) {
    needRole_(user, [ROLE.ADMIN]);
    need_(body, ['id_faktur']);
    var lunas = readAll_('kuitansi').some(function (k) {
      return String(k.id_faktur) === String(body.id_faktur);
    });
    if (lunas) err_('Faktur sudah memiliki kuitansi, tidak dapat dihapus.');
    var faktur = findById_('faktur', 'id_faktur', body.id_faktur);
    if (!faktur) err_('Faktur tidak ditemukan.');
    deleteById_('faktur', 'id_faktur', body.id_faktur);
    // Kembalikan pesanan ke draft agar bisa diperbaiki/difinalisasi ulang.
    updateById_('pesan', 'id_pesan', faktur.id_pesan, { status: 'draft' });
    // Kembalikan stok yang sudah dikurangi saat finalisasi.
    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      readAll_('detil').filter(function (d) {
        return String(d.id_pesan) === String(faktur.id_pesan);
      }).forEach(function (d) {
        var p = findById_('produk', 'id_produk', d.id_produk);
        if (p) updateById_('produk', 'id_produk', d.id_produk,
          { stock: Number(p.stock) + Number(d.jumlah) });
      });
    } finally { lock.releaseLock(); }
    return { id_faktur: String(body.id_faktur) };
  }
};

var KuitansiApi = {
  create: function (body, user) {
    needRole_(user, [ROLE.ADMIN, ROLE.KASIR]);
    need_(body, ['id_faktur']);
    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var faktur = findById_('faktur', 'id_faktur', body.id_faktur);
      if (!faktur) err_('Faktur tidak ditemukan.');
      var sudah = readAll_('kuitansi').some(function (k) {
        return String(k.id_faktur) === String(body.id_faktur);
      });
      if (sudah) err_('Faktur ini sudah dibayar (kuitansi sudah terbit).');
      var id = nextId_('KWT', 'seq_kuitansi');
      appendObj_('kuitansi', { id_kuitansi: id, id_faktur: body.id_faktur,
        tgl_kuitansi: now_(), jumlah_bayar: Number(faktur.total) });
      return { id_kuitansi: id, jumlah_bayar: Number(faktur.total) };
    } finally { lock.releaseLock(); }
  },
  list: function (body, user) {
    return readAll_('kuitansi').sort(function (a, b) {
      return String(b.tgl_kuitansi).localeCompare(String(a.tgl_kuitansi));
    });
  },
  delete: function (body, user) {
    needRole_(user, [ROLE.ADMIN]);
    need_(body, ['id_kuitansi']);
    deleteById_('kuitansi', 'id_kuitansi', body.id_kuitansi);
    return { id_kuitansi: String(body.id_kuitansi) };
  }
};

// ---------------------------------------------------------------------------
// Modul 5 — Dashboard & Laporan (BARU — menutup celah PRD v1)
// ---------------------------------------------------------------------------
var LaporanApi = {
  /** Ringkasan: hanya transaksi LUNAS (berkuitansi) dihitung sebagai pendapatan. */
  dashboard: function (body, user) {
    needRole_(user, [ROLE.ADMIN, ROLE.OWNER]);
    var periode = body.periode === 'bulan' ? 'bulan' : 'hari';
    var ref = body.tanggal || now_().slice(0, 10); // yyyy-MM-dd
    var prefix = periode === 'bulan' ? ref.slice(0, 7) : ref;
    var kuitansis = readAll_('kuitansi').filter(function (k) {
      return String(k.tgl_kuitansi).indexOf(prefix) === 0;
    });
    var pendapatan = kuitansis.reduce(function (s, k) {
      return s + Number(k.jumlah_bayar);
    }, 0);
    var semuaKuitansi = readAll_('kuitansi');
    var fakturLunas = {};
    semuaKuitansi.forEach(function (k) { fakturLunas[String(k.id_faktur)] = true; });
    var belumBayar = readAll_('faktur').filter(function (f) {
      return !fakturLunas[String(f.id_faktur)];
    }).length;
    return {
      periode: periode, tanggal: ref,
      total_pendapatan: pendapatan,
      jumlah_transaksi_lunas: kuitansis.length,
      jumlah_faktur_belum_bayar: belumBayar
    };
  },

  /** Rekap penjualan per periode; filter opsional per kasir / per produk. */
  penjualan: function (body, user) {
    needRole_(user, [ROLE.ADMIN, ROLE.OWNER]);
    var dari = String(body.dari || '0000'), sampai = String(body.sampai || '9999');
    var fakturs = readAll_('faktur').filter(function (f) {
      var t = String(f.tgl_faktur).slice(0, 10);
      return t >= dari && t <= sampai;
    });
    if (body.id_produk) {
      var pesanIds = {};
      readAll_('detil').forEach(function (d) {
        if (String(d.id_produk) === String(body.id_produk)) pesanIds[String(d.id_pesan)] = true;
      });
      fakturs = fakturs.filter(function (f) { return pesanIds[String(f.id_pesan)]; });
    }
    var pesans = {};
    readAll_('pesan').forEach(function (p) { pesans[String(p.id_pesan)] = p; });
    if (body.id_user) {
      fakturs = fakturs.filter(function (f) {
        var p = pesans[String(f.id_pesan)];
        return p && String(p.id_user) === String(body.id_user);
      });
    }
    var kuitansiOlehFaktur = {};
    readAll_('kuitansi').forEach(function (k) {
      kuitansiOlehFaktur[String(k.id_faktur)] = k;
    });
    var rows = fakturs.map(function (f) {
      var p = pesans[String(f.id_pesan)] || {};
      var k = kuitansiOlehFaktur[String(f.id_faktur)];
      return { id_faktur: String(f.id_faktur), tgl_faktur: String(f.tgl_faktur),
        id_pesan: String(f.id_pesan), id_user: String(p.id_user || ''),
        id_pelanggan: String(p.id_pelanggan || ''), total: Number(f.total),
        lunas: !!k, tgl_kuitansi: k ? String(k.tgl_kuitansi) : '' };
    }).sort(function (a, b) { return String(b.tgl_faktur).localeCompare(String(a.tgl_faktur)); });
    var totalPendapatan = rows.filter(function (r) { return r.lunas; })
      .reduce(function (s, r) { return s + r.total; }, 0);
    return { dari: dari, sampai: sampai, jumlah_faktur: rows.length,
             total_pendapatan_lunas: totalPendapatan, data: rows };
  }
};

// ---------------------------------------------------------------------------
// Tabel routing aksi -> handler
// ---------------------------------------------------------------------------
var ROUTES = {
  'auth.login': AuthApi.login,
  'auth.logout': AuthApi.logout,
  'auth.me': AuthApi.me,
  'pengguna.list': PenggunaApi.list,
  'pengguna.create': PenggunaApi.create,
  'pengguna.update': PenggunaApi.update,
  'pengguna.delete': PenggunaApi.delete,
  'pengguna.resetPassword': PenggunaApi.resetPassword,
  'pelanggan.list': PelangganApi.list,
  'pelanggan.create': PelangganApi.create,
  'pelanggan.update': PelangganApi.update,
  'pelanggan.delete': PelangganApi.delete,
  'produk.list': ProdukApi.list,
  'produk.create': ProdukApi.create,
  'produk.update': ProdukApi.update,
  'produk.delete': ProdukApi.delete,
  'pesan.create': PesanApi.create,
  'pesan.list': PesanApi.list,
  'pesan.get': PesanApi.get,
  'pesan.addDetil': PesanApi.addDetil,
  'pesan.removeDetil': PesanApi.removeDetil,
  'pesan.finalize': PesanApi.finalize,
  'pesan.delete': PesanApi.delete,
  'faktur.list': FakturApi.list,
  'faktur.get': FakturApi.get,
  'faktur.delete': FakturApi.delete,
  'kuitansi.create': KuitansiApi.create,
  'kuitansi.list': KuitansiApi.list,
  'kuitansi.delete': KuitansiApi.delete,
  'laporan.dashboard': LaporanApi.dashboard,
  'laporan.penjualan': LaporanApi.penjualan
};

// ---------------------------------------------------------------------------
// Utilitas sekali jalan (dijalankan manual dari editor Apps Script)
// ---------------------------------------------------------------------------

/** Buat akun admin pertama. Jalankan sekali setelah deploy (lihat SETUP.md). */
function bootstrapAdmin() {
  var rows = readAll_('pengguna');
  if (rows.length > 0) {
    Logger.log('Tab Pengguna sudah terisi (%s baris). Bootstrap dibatalkan.', rows.length);
    return;
  }
  var tempPass = 'Admin#' + Math.floor(1000 + Math.random() * 9000);
  appendObj_('pengguna', { id_user: 'USR-0001', nama: 'Administrator',
    username: 'admin', password: hashPassword_(tempPass), role: 'admin' });
  PropertiesService.getScriptProperties().setProperty('seq_user', '1');
  Logger.log('=== AKUN ADMIN DIBUAT ===');
  Logger.log('Username : admin');
  Logger.log('Password sementara : %s', tempPass);
  Logger.log('SEGERA login dan ganti password via menu Kelola Pengguna.');
}

/** Data contoh untuk pengujian (opsional, jelas-jelas data demo). */
function seedDemo() {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var pid = nextId_('PLG', 'seq_pelanggan');
    appendObj_('pelanggan', { id_pelanggan: pid, nama: 'Demo — Toko Maju',
      alamat: 'Jl. Contoh No. 1', telepon: '081200000001', email: 'demo@example.com' });
    [['Demo — Pensil 2B', 'pcs', 2500, 100],
     ['Demo — Buku Tulis', 'pcs', 8000, 50],
     ['Demo — Penghapus', 'pcs', 1500, 200]].forEach(function (p) {
      var id = nextId_('PRD', 'seq_produk');
      appendObj_('produk', { id_produk: id, nm_produk: p[0], satuan: p[1],
        harga: p[2], stock: p[3] });
    });
    Logger.log('Data demo dibuat: 1 pelanggan + 3 produk.');
  } finally { lock.releaseLock(); }
}
