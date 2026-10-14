/**
 * Store / State Management & LocalStorage Persistence
 * Kas RT 01 / RW 02 Desa Sladi
 */
const STORAGE_KEY = "kas_rt_clean_v2";

class KasStore {
  constructor() {
    this.subscribers = [];
    this.data = this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with DEFAULT_DATA to guarantee structure integrity
        return {
          settings: { ...window.DEFAULT_DATA.settings, ...(parsed.settings || {}) },
          folders: parsed.folders && parsed.folders.length ? parsed.folders : [...window.DEFAULT_DATA.folders],
          catatan: Array.isArray(parsed.catatan) ? parsed.catatan : [],
          bukti: Array.isArray(parsed.bukti) ? parsed.bukti : [],
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
          usulan: Array.isArray(parsed.usulan) ? parsed.usulan : []
        };
      }
    } catch (e) {
      console.warn("Gagal memuat dari localStorage, menggunakan default seed data:", e);
    }
    return JSON.parse(JSON.stringify(window.DEFAULT_DATA));
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error("Gagal menyimpan ke localStorage:", e);
    }
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    for (const callback of this.subscribers) {
      try {
        callback(this.data);
      } catch (err) {
        console.error("Subscriber notification error:", err);
      }
    }
  }

  resetToDefault() {
    this.data = JSON.parse(JSON.stringify(window.DEFAULT_DATA));
    this.save();
  }

  clearAllData() {
    this.data.transactions = [];
    this.save();
  }

  // --- Transactions ---
  getTransactions(filter = {}) {
    return this.data.transactions.filter(t => {
      if (filter.year && filter.year !== "Semua") {
        if (!t.d.startsWith(filter.year)) return false;
      }
      if (filter.type && filter.type !== "all") {
        if (t.t !== filter.type) return false;
      }
      if (filter.folderId && filter.folderId !== "") {
        if (t.f !== filter.folderId) return false;
      }
      if (filter.catatanId && filter.catatanId !== "") {
        if (t.c !== filter.catatanId) return false;
      }
      if (filter.query) {
        const q = filter.query.toLowerCase().trim();
        const haystack = `${t.k} ${t.s} ${this.getFolderName(t.f)} ${this.getCatatanTitle(t.c)}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  addTransaction(tx) {
    const newTx = {
      id: "t_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      d: tx.d || new Date().toISOString().split("T")[0],
      t: tx.t || "i",
      f: tx.f,
      c: tx.c,
      k: tx.k.trim(),
      n: Math.abs(Number(tx.n) || 0),
      s: (tx.s || "").trim()
    };
    this.data.transactions.unshift(newTx);
    this.save();
    return newTx;
  }

  updateTransaction(id, updated) {
    const idx = this.data.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.transactions[idx] = {
        ...this.data.transactions[idx],
        ...updated,
        n: Math.abs(Number(updated.n ?? this.data.transactions[idx].n))
      };
      this.save();
      return true;
    }
    return false;
  }

  deleteTransaction(id) {
    const before = this.data.transactions.length;
    this.data.transactions = this.data.transactions.filter(t => t.id !== id);
    if (this.data.transactions.length !== before) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Folders ---
  getFolders() {
    return this.data.folders;
  }

  getFolder(id) {
    return this.data.folders.find(f => f.id === id);
  }

  getFolderName(id) {
    const f = this.getFolder(id);
    return f ? f.n : "Kegiatan";
  }

  addFolder(folder) {
    const id = folder.id ? folder.id.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) : "f" + Date.now().toString().slice(-4);
    const newFolder = {
      id,
      n: folder.n.trim(),
      ic: folder.ic || "📁",
      pic: folder.pic ? folder.pic.trim() : "Pengurus RT",
      pagu: Math.abs(Number(folder.pagu) || 0),
      desc: (folder.desc || "").trim()
    };
    this.data.folders.push(newFolder);
    this.save();
    return newFolder;
  }

  updateFolder(id, updated) {
    const idx = this.data.folders.findIndex(f => f.id === id);
    if (idx !== -1) {
      this.data.folders[idx] = {
        ...this.data.folders[idx],
        ...updated,
        pagu: Math.abs(Number(updated.pagu ?? this.data.folders[idx].pagu))
      };
      this.save();
      return true;
    }
    return false;
  }

  // --- Catatan Keuangan ---
  getCatatan(folderId = null) {
    if (folderId) {
      return this.data.catatan.filter(c => c.f === folderId);
    }
    return this.data.catatan;
  }

  getCatatanById(id) {
    return this.data.catatan.find(c => c.id === id);
  }

  getCatatanTitle(id) {
    const c = this.getCatatanById(id);
    return c ? c.t : "";
  }

  addCatatan(cat) {
    const id = "c_" + Date.now().toString().slice(-5);
    const newCat = {
      id,
      f: cat.f,
      t: cat.t.trim(),
      p: cat.p ? cat.p.trim() : new Date().toLocaleDateString("id-ID", { month: "short", year: "numeric" }),
      s: cat.s || "Draf",
      desc: (cat.desc || "").trim()
    };
    this.data.catatan.push(newCat);
    this.save();
    return newCat;
  }

  toggleLockCatatan(id) {
    const c = this.getCatatanById(id);
    if (c) {
      c.s = c.s === "Final" ? "Draf" : "Final";
      this.save();
      return c.s;
    }
    return null;
  }

  // --- Bukti Dokumen ---
  getBukti(folderId = null) {
    if (folderId) {
      return this.data.bukti.filter(b => b.f === folderId);
    }
    return this.data.bukti;
  }

  addBukti(item) {
    const newBukti = {
      id: "b_" + Date.now(),
      f: item.f,
      n: item.n.trim(),
      ic: item.n.toLowerCase().endsWith(".pdf") ? "📊" : "🧾",
      d: item.d || new Date().toISOString().split("T")[0],
      size: item.size || "1.0 MB",
      url: item.url || "#"
    };
    this.data.bukti.unshift(newBukti);
    this.save();
    return newBukti;
  }

  deleteBukti(id) {
    this.data.bukti = this.data.bukti.filter(b => b.id !== id);
    this.save();
  }

  // --- Usulan Warga ---
  getUsulan() {
    return this.data.usulan;
  }

  addUsulan(u) {
    const item = {
      id: "u_" + Date.now(),
      j: u.j.trim(),
      o: u.o.trim(),
      d: new Date().toISOString().split("T")[0],
      q: u.q.trim(),
      st: "Sedang Ditinjau",
      r: ""
    };
    this.data.usulan.unshift(item);
    this.save();
    return item;
  }

  updateUsulanStatus(id, st) {
    const u = this.data.usulan.find(item => item.id === id);
    if (u) {
      u.st = st;
      this.save();
      return true;
    }
    return false;
  }

  updateUsulanResponse(id, r) {
    const u = this.data.usulan.find(item => item.id === id);
    if (u) {
      u.r = r.trim();
      this.save();
      return true;
    }
    return false;
  }

  deleteUsulan(id) {
    this.data.usulan = this.data.usulan.filter(u => u.id !== id);
    this.save();
  }

  // --- Settings ---
  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
  }

  // --- Calculators & Analytics ---
  calcTotals(transactions = null) {
    const list = transactions || this.data.transactions;
    let masuk = 0;
    let keluar = 0;
    for (const t of list) {
      if (t.t === "i") {
        masuk += Number(t.n) || 0;
      } else {
        keluar += Number(t.n) || 0;
      }
    }
    return {
      masuk,
      keluar,
      saldo: masuk - keluar,
      count: list.length
    };
  }

  calcFolderTotals(folderId) {
    const txs = this.data.transactions.filter(t => t.f === folderId);
    return this.calcTotals(txs);
  }

  calcCatatanTotals(catatanId) {
    const txs = this.data.transactions.filter(t => t.c === catatanId);
    return this.calcTotals(txs);
  }

  // Audit integrity: check if sum of all individual folders matches global cash balance
  getIntegrityAudit() {
    const globalTotal = this.calcTotals();
    let folderSumSaldo = 0;
    for (const f of this.data.folders) {
      folderSumSaldo += this.calcFolderTotals(f.id).saldo;
    }

    // Check duplicate candidates (same date, same nominal, same description, same type)
    const duplicates = [];
    const seen = new Map();
    for (const t of this.data.transactions) {
      const key = `${t.d}|${t.n}|${t.t}|${t.k.toLowerCase().trim()}`;
      if (seen.has(key)) {
        duplicates.push(t);
        const original = seen.get(key);
        if (!duplicates.includes(original)) {
          duplicates.push(original);
        }
      } else {
        seen.set(key, t);
      }
    }

    const isMatch = folderSumSaldo === globalTotal.saldo;
    return {
      isMatch,
      globalSaldo: globalTotal.saldo,
      folderSumSaldo,
      duplicates,
      duplicateCount: duplicates.length
    };
  }
}

// Formatting helpers
window.formatRupiah = function(nominal) {
  if (nominal === undefined || nominal === null || isNaN(nominal)) return "Rp 0";
  const num = Number(nominal);
  const formatted = Math.abs(num).toLocaleString("id-ID");
  return (num < 0 ? "-Rp " : "Rp ") + formatted;
};

window.formatDate = function(dateStr) {
  if (!dateStr) return "-";
  try {
    const [y, m, d] = dateStr.split("-");
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch (e) {
    return dateStr;
  }
};

// Instantiate singleton store
window.store = new KasStore();
