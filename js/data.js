/**
 * Data Awal Bersih (Tanpa Dummy Data)
 * Kas RT 01 / RW 02 Desa Sladi
 */
const DEFAULT_DATA = {
  settings: {
    rt: "01",
    rw: "02",
    desa: "Desa Sladi",
    kecamatan: "Kejayan",
    kabupaten: "Pasuruan",
    ketuaRt: "Ketua RT 01",
    bendahara: "Bendahara RT 01",
    sekretaris: "Sekretaris RT 01",
    tahunAktif: "Semua",
    theme: "light"
  },
  
  // Kategori Folder Pokok RT
  folders: [
    { id: "iur", n: "Iuran Warga", ic: "📁", pic: "Bendahara RT 01", pagu: 0, desc: "Penerimaan iuran rutin kas warga bulanan" },
    { id: "ops", n: "Operasional RT", ic: "📁", pic: "Sekretaris RT", pagu: 0, desc: "Keperluan administrasi, ATK, dan konsumsi rapat warga" },
    { id: "keb", n: "Kebersihan & Keamanan", ic: "📁", pic: "Seksi Keamanan", pagu: 0, desc: "Pengangkutan sampah lingkungan dan pos ronda malam" },
    { id: "pem", n: "Pembangunan Fasilitas", ic: "📁", pic: "Seksi Pembangunan", pagu: 0, desc: "Perbaikan pos ronda, penerangan jalan, dan sarana umum" },
    { id: "sos", n: "Kegiatan Sosial", ic: "📁", pic: "Seksi Sosial", pagu: 0, desc: "Santunan duka, warga sakit, dan kepedulian sosial" },
    { id: "lib", n: "Liburan & Wisata", ic: "📁", pic: "Panitia Wisata", pagu: 0, desc: "Kegiatan rekreasi atau family gathering warga" },
    { id: "kar", n: "Karnaval & Acara", ic: "📁", pic: "Panitia Acara", pagu: 0, desc: "Peringatan hari kemerdekaan dan acara lingkungan" }
  ],

  // Berkas Rekapan Riwayat per Tanggal / Periode (Struktur File Explorer Bersih - Tanpa Dummy)
  catatan: [],

  // Bukti Transaksi Kosong (Tanpa Dummy)
  bukti: [],

  // Transaksi Kas Kosong (Tanpa Dummy)
  transactions: [],

  // Usulan Warga Kosong (Tanpa Dummy)
  usulan: []
};

// Global object attachment
window.DEFAULT_DATA = DEFAULT_DATA;
