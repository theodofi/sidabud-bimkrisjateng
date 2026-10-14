/**
 * Backend SIDABUD - Google Apps Script (bound ke Spreadsheet).
 * Deploy: Deploy > New deployment > Web app
 *   Execute as: Me | Who has access: Anyone
 * Isi Script Properties: GOOGLE_CLIENT_ID
 */
var ADMIN_EMAIL = 'theo.hasiholan@gmail.com';
var SHEET_DATA = 'Objek_Keagamaan_Kristen';
var SHEET_USERS = 'Users';

var FIELDS = [
  'nama_objek', 'alamat', 'jenis_perizinan', 'instansi_penerbit',
  'nomor_tanggal_perizinan', 'tahun_berdiri', 'nama_pengelola',
  'telp_pengelola', 'email_pengelola', 'sejarah_singkat'
];
var HEADERS = ['ID', 'Kab/Kota'].concat([
  'Nama Objek Budaya', 'Alamat Objek Budaya (Lengkap)', 'Jenis Perizinan',
  'Instansi Yang Mengeluarkan', 'Nomor dan Tanggal Perizinan', 'Tahun Berdiri',
  'Nama Pengelola Objek Budaya', 'Telp Pengelola', 'Email Pengelola', 'Sejarah Singkat'
]).concat(['Dibuat Oleh', 'Dibuat Pada', 'Diubah Oleh', 'Diubah Pada']);

var KABKOTA = [
  'Kab. Banjarnegara', 'Kab. Banyumas', 'Kab. Batang', 'Kab. Blora', 'Kab. Boyolali',
  'Kab. Brebes', 'Kab. Cilacap', 'Kab. Demak', 'Kab. Grobogan', 'Kab. Jepara',
  'Kab. Karanganyar', 'Kab. Kebumen', 'Kab. Kendal', 'Kab. Klaten', 'Kab. Kudus',
  'Kab. Magelang', 'Kab. Pati', 'Kab. Pekalongan', 'Kab. Pemalang', 'Kab. Purbalingga',
  'Kab. Purworejo', 'Kab. Rembang', 'Kab. Semarang', 'Kab. Sragen', 'Kab. Sukoharjo',
  'Kab. Tegal', 'Kab. Temanggung', 'Kab. Wonogiri', 'Kab. Wonosobo',
  'Kota Magelang', 'Kota Pekalongan', 'Kota Salatiga', 'Kota Semarang',
  'Kota Surakarta', 'Kota Tegal'
];

/** Jalankan sekali dari editor untuk membuat sheet & header. */
function setup() {
  var ss = SpreadsheetApp.getActive();
  var data = ss.getSheetByName(SHEET_DATA) || ss.insertSheet(SHEET_DATA);
  data.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  data.setFrozenRows(1);
  // Kolom tahun & telp sebagai teks agar angka 0 di depan tidak hilang
  data.getRange(2, 7, data.getMaxRows() - 1, 3).setNumberFormat('@');

  var users = ss.getSheetByName(SHEET_USERS) || ss.insertSheet(SHEET_USERS);
  if (users.getLastRow() === 0) {
    users.getRange(1, 1, 1, 4).setValues([['Email', 'Nama PIC', 'Kab/Kota', 'Aktif']]).setFontWeight('bold');
    users.setFrozenRows(1);
    var rows = KABKOTA.map(function (k) { return ['', '', k, 'YA']; });
    users.getRange(2, 1, rows.length, 4).setValues(rows);
  }
}

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var user = authenticate_(req.idToken);
    switch (req.action) {
      case 'me': return json_({ ok: true, user: user, kabkotaList: user.role === 'admin' ? KABKOTA : [user.kabkota] });
      case 'list': return json_({ ok: true, rows: list_(user) });
      case 'save': return json_({ ok: true, row: save_(user, req.row) });
      case 'delete': remove_(user, req.id); return json_({ ok: true });
      default: throw new Error('Aksi tidak dikenal');
    }
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function authenticate_(idToken) {
  if (!idToken) throw new Error('UNAUTHENTICATED');
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('UNAUTHENTICATED');
  var info = JSON.parse(res.getContentText());
  var clientId = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID');
  if (info.aud !== clientId || String(info.email_verified) !== 'true') throw new Error('UNAUTHENTICATED');

  var email = String(info.email).toLowerCase();
  if (email === ADMIN_EMAIL) return { email: email, nama: info.name || email, role: 'admin', kabkota: '*' };

  var values = SpreadsheetApp.getActive().getSheetByName(SHEET_USERS).getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === email && String(values[i][3]).toUpperCase() === 'YA') {
      return { email: email, nama: values[i][1] || info.name || email, role: 'pic', kabkota: String(values[i][2]).trim() };
    }
  }
  throw new Error('FORBIDDEN: akun ' + email + ' tidak terdaftar sebagai PIC');
}

function sheet_() { return SpreadsheetApp.getActive().getSheetByName(SHEET_DATA); }

function toObj_(r) {
  var o = { id: r[0], kabkota: r[1] };
  FIELDS.forEach(function (f, i) { o[f] = r[2 + i]; });
  o.dibuat_oleh = r[12]; o.dibuat_pada = r[13]; o.diubah_oleh = r[14]; o.diubah_pada = r[15];
  return o;
}

function list_(user) {
  var s = sheet_();
  if (s.getLastRow() < 2) return [];
  return s.getRange(2, 1, s.getLastRow() - 1, HEADERS.length).getDisplayValues()
    .filter(function (r) { return r[0] && (user.role === 'admin' || r[1] === user.kabkota); })
    .map(toObj_);
}

function save_(user, row) {
  row = row || {};
  if (!String(row.nama_objek || '').trim()) throw new Error('Nama Objek Budaya wajib diisi');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var s = sheet_();
    var now = new Date();
    var kab = user.role === 'admin' ? row.kabkota : user.kabkota;
    if (KABKOTA.indexOf(kab) < 0) throw new Error('Kab/Kota tidak valid');
    var vals = FIELDS.map(function (f) { return String(row[f] == null ? '' : row[f]).trim(); });

    if (row.id) {
      var ids = s.getLastRow() > 1 ? s.getRange(2, 1, s.getLastRow() - 1, 2).getValues() : [];
      for (var i = 0; i < ids.length; i++) {
        if (ids[i][0] === row.id) {
          if (user.role !== 'admin' && ids[i][1] !== user.kabkota) throw new Error('FORBIDDEN');
          var line = i + 2;
          s.getRange(line, 2, 1, 1 + FIELDS.length).setNumberFormat('@').setValues([[kab].concat(vals)]);
          s.getRange(line, 15, 1, 2).setValues([[user.email, now]]);
          return toObj_(s.getRange(line, 1, 1, HEADERS.length).getDisplayValues()[0]);
        }
      }
      throw new Error('Data tidak ditemukan');
    }

    var id = Utilities.getUuid();
    var newRow = [id, kab].concat(vals).concat([user.email, now, '', '']);
    var target = s.getLastRow() + 1;
    s.getRange(target, 1, 1, newRow.length).setNumberFormat('@').setValues([newRow]);
    return toObj_(s.getRange(target, 1, 1, HEADERS.length).getDisplayValues()[0]);
  } finally {
    lock.releaseLock();
  }
}

function remove_(user, id) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var s = sheet_();
    var ids = s.getLastRow() > 1 ? s.getRange(2, 1, s.getLastRow() - 1, 2).getValues() : [];
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0] === id) {
        if (user.role !== 'admin' && ids[i][1] !== user.kabkota) throw new Error('FORBIDDEN');
        s.deleteRow(i + 2);
        return;
      }
    }
    throw new Error('Data tidak ditemukan');
  } finally {
    lock.releaseLock();
  }
}
