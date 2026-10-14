/**
 * UI Controller & Rendering Engine
 * Kas RT 01 / RW 02 Desa Sladi
 */

const KasUI = {
  currentView: "home", // home | kas | arsip | usul | kelola
  currentMode: "w",    // w = Warga, a = Admin
  currentYear: "Semua",
  
  // State for Buku Kas view
  kasTab: "all",       // all | i | o
  kasFolder: "",
  kasQuery: "",
  kasSort: "newest",   // newest | oldest | highest

  // State for Arsip view
  arsipFolderId: null,
  arsipCatatanId: null,
  arsipViewMode: "grid", // grid | list

  // State for Usulan view
  usulFilter: "all",   // all | Telah Dianggarkan | Sedang Ditinjau | Ditolak

  // State for Kelola view
  kelolaTab: "anggaran", // anggaran | import | settings | danger

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Navigation items
    document.querySelectorAll("[data-nav]").forEach(el => {
      el.addEventListener("click", e => {
        e.preventDefault();
        const target = el.getAttribute("data-nav");
        this.navigateTo(target);
      });
    });

    // Segmented Mode Control (Warga / Admin)
    document.querySelectorAll(".segment-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-mode");
        this.setMode(mode);
      });
    });

    // Theme Toggle
    const themeBtn = document.getElementById("themeToggleBtn");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => this.toggleTheme());
    }

    // Export Dropdown
    const exportBtn = document.getElementById("exportDropdownBtn");
    const exportMenu = document.getElementById("exportDropdownMenu");
    if (exportBtn && exportMenu) {
      exportBtn.addEventListener("click", e => {
        e.stopPropagation();
        exportMenu.classList.toggle("show");
      });
      document.addEventListener("click", () => {
        exportMenu.classList.remove("show");
      });
    }

    // Year Filter in sidebar
    const yearSelect = document.getElementById("sidebarYearSelect");
    if (yearSelect) {
      yearSelect.addEventListener("change", e => {
        this.currentYear = e.target.value;
        this.render();
      });
    }

    // Close modal on escape key
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        this.closeModal();
      }
    });

    // Subscribe to store updates
    window.store.subscribe(() => {
      this.render();
    });
  },

  navigateTo(view, params = {}) {
    this.currentView = view;
    if (params.folderId !== undefined) this.arsipFolderId = params.folderId;
    if (params.catatanId !== undefined) this.arsipCatatanId = params.catatanId;
    
    // Auto-scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
    this.render();
  },

  sha256(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';
    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;
    let hash = [];
    const k = [];
    let primeCounter = 0;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);
    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return;
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength);
    for (j = 0; j < words[lengthProperty];) {
      const w = words.slice(j, j += 16);
      const oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        const i2 = i + j;
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0
          );
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? 0 : '') + b.toString(16);
      }
    }
    return result;
  },

  authorizedAdminHashes: [
    "d8b06f8a2ee117d81a8b678957a1129dc4a5d814e89a7b60bfdb04b0128b7b15",
    "6669678838c5154a0920f339c431cac89f0b746e772ed3df3a0aafffa29f45f1"
  ],

  isAdminAuth() {
    return sessionStorage.getItem("kas_rt_admin_auth") === "true";
  },

  openAdminAuthModal() {
    const body = `
      <form id="adminAuthForm" onsubmit="KasUI.handleAdminAuthSubmit(event)">
        <p style="font-size:13.5px; color:var(--text-muted); margin-bottom:14px; line-height:1.5;">
          Akses <strong>Mode Admin</strong> dilindungi verifikasi kredensial resmi pengurus RT 01 / RW 02.
        </p>
        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Email Pengurus</label>
          <input type="email" id="adminAuthEmail" placeholder="Masukkan email pengurus RT..." required style="width:100%;">
          <span class="form-help">Masukkan alamat email resmi pengurus RT yang telah didaftarkan.</span>
        </div>
        <div id="adminAuthError" style="display:none; background:var(--out-bg); color:var(--out); border:1px solid var(--out-border); padding:8px 12px; border-radius:var(--radius-sm); font-size:12.5px; margin-bottom:14px;"></div>
      </form>
    `;
    const footer = `
      <button type="button" class="btn btn-secondary" onclick="KasUI.closeModal()">Batal</button>
      <button type="submit" form="adminAuthForm" class="btn btn-primary">Verifikasi & Masuk</button>
    `;
    this.showModal("🔐 Autentikasi Pengurus RT", body, footer);
  },

  handleAdminAuthSubmit(e) {
    e.preventDefault();
    const rawEmail = (document.getElementById("adminAuthEmail").value || "").trim().toLowerCase();
    const errEl = document.getElementById("adminAuthError");
    const hash = this.sha256(rawEmail);

    if (this.authorizedAdminHashes.includes(hash)) {
      sessionStorage.setItem("kas_rt_admin_auth", "true");
      this.currentMode = "a";
      this.closeModal();
      this.showToast("Autentikasi Berhasil: Mode Pengurus (Admin) Aktif");
      this.render();
    } else {
      errEl.textContent = "Akses ditolak: Alamat email tidak terdaftar dalam hak akses pengurus RT.";
      errEl.style.display = "block";
    }
  },

  logoutAdmin() {
    sessionStorage.removeItem("kas_rt_admin_auth");
    this.currentMode = "w";
    if (this.currentView === "kelola") {
      this.currentView = "home";
    }
    this.showToast("Berhasil keluar dari Mode Admin");
    this.render();
  },

  setMode(mode) {
    if (mode === "a") {
      if (!this.isAdminAuth()) {
        this.openAdminAuthModal();
        return;
      }
      this.currentMode = "a";
      this.showToast("Mode Pengurus (Admin) Aktif");
    } else {
      this.currentMode = "w";
      if (this.currentView === "kelola") {
        this.currentView = "home";
      }
      this.showToast("Mode Warga aktif");
    }
    this.render();
  },

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    const themeBtn = document.getElementById("themeToggleBtn");
    if (themeBtn) {
      themeBtn.textContent = newTheme === "dark" ? "☀️" : "🌙";
      themeBtn.setAttribute("title", `Ganti ke tema ${newTheme === "dark" ? "terang" : "gelap"}`);
    }
    window.store.updateSettings({ theme: newTheme });
  },

  showToast(message, icon = "ℹ️") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 250);
    }, 2400);
  },

  // Modal Manager
  showModal(title, bodyHTML, footerHTML = "", isLarge = false) {
    let overlay = document.getElementById("mainModalOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "mainModalOverlay";
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
        <div class="modal-dialog" id="mainModalDialog">
          <div class="modal-header">
            <h3 class="modal-title" id="modalTitle"></h3>
            <button class="modal-close-btn" onclick="KasUI.closeModal()">&times;</button>
          </div>
          <div class="modal-body" id="modalBody"></div>
          <div class="modal-footer" id="modalFooter"></div>
        </div>
      `;
      overlay.addEventListener("click", e => {
        if (e.target === overlay) this.closeModal();
      });
      document.body.appendChild(overlay);
    }

    const dialog = document.getElementById("mainModalDialog");
    if (isLarge) {
      dialog.classList.add("modal-lg");
    } else {
      dialog.classList.remove("modal-lg");
    }

    document.getElementById("modalTitle").innerHTML = title;
    document.getElementById("modalBody").innerHTML = bodyHTML;
    const footerEl = document.getElementById("modalFooter");
    if (footerHTML) {
      footerEl.innerHTML = footerHTML;
      footerEl.style.display = "flex";
    } else {
      footerEl.style.display = "none";
    }

    overlay.classList.add("show");
  },

  closeModal() {
    const overlay = document.getElementById("mainModalOverlay");
    if (overlay) {
      overlay.classList.remove("show");
    }
  },

  // Core Render Dispatcher
  render() {
    this.updateHeaderAndNav();
    const container = document.getElementById("viewContainer");
    if (!container) return;

    switch (this.currentView) {
      case "home":
        container.innerHTML = this.renderHomeView();
        break;
      case "kas":
        container.innerHTML = this.renderKasView();
        this.bindKasEvents();
        break;
      case "arsip":
        container.innerHTML = this.renderArsipView();
        break;
      case "usul":
        container.innerHTML = this.renderUsulView();
        break;
      case "kelola":
        if (this.currentMode !== "a") {
          this.currentView = "home";
          this.render();
          return;
        }
        container.innerHTML = this.renderKelolaView();
        break;
      default:
        container.innerHTML = this.renderHomeView();
    }
  },

  updateHeaderAndNav() {
    const titles = {
      home: ["Beranda Kas", "Ringkasan keuangan, kesehatan saldo & arus kas RT"],
      kas: ["Buku Kas Umum", "Pencatatan seluruh uang masuk dan keluar secara terperinci"],
      arsip: ["Arsip Digital", "Struktur folder kegiatan, dokumen kwitansi & pertanggungjawaban"],
      usul: ["Aspirasi & Usulan Warga", "Penyampaian ide pengadaan warga dan transparansi respon pengurus"],
      kelola: ["Pusat Pengelolaan RT", "Pagu anggaran, impor/ekspor data dan konfigurasi sistem"]
    };

    const currentTitle = titles[this.currentView] || titles.home;
    const titleEl = document.getElementById("pageTitle");
    const subEl = document.getElementById("pageSubtitle");
    if (titleEl) titleEl.textContent = currentTitle[0];
    if (subEl) {
      const modeText = this.currentMode === "a" ? " • Mode Pengurus (Admin)" : " • Mode Warga";
      const yearText = this.currentYear !== "Semua" ? ` [Tahun ${this.currentYear}]` : "";
      subEl.textContent = currentTitle[1] + modeText + yearText;
    }

    // Update Sidebar Navigation
    document.querySelectorAll(".nav-item").forEach(item => {
      const target = item.getAttribute("data-nav");
      item.classList.toggle("active", target === this.currentView);
    });

    // Update Bottom Navigation (Mobile)
    document.querySelectorAll(".bottom-nav-item").forEach(item => {
      const target = item.getAttribute("data-nav");
      item.classList.toggle("active", target === this.currentView);
    });

    // Show/Hide Kelola in sidebar & bottom nav
    const kelolaNav = document.querySelectorAll("[data-nav='kelola']");
    kelolaNav.forEach(el => {
      el.style.display = this.currentMode === "a" ? "flex" : "none";
    });

    // Update Segmented Buttons
    document.querySelectorAll(".segment-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-mode") === this.currentMode);
    });

    // Update Export Dropdown Items based on mode & current view
    this.updateExportDropdownMenu();
  },

  updateExportDropdownMenu() {
    const menu = document.getElementById("exportDropdownMenu");
    if (!menu) return;

    let items = `
      <div class="dropdown-header">Ekspor Data (${this.currentView.toUpperCase()})</div>
      <button class="dropdown-item" onclick="KasExport.exportTransactionsToCSV({ year: '${this.currentYear}' })">
        📊 Unduh CSV Buku Kas
      </button>
      <button class="dropdown-item" onclick="KasExport.exportRekapKegiatanToCSV()">
        📁 Unduh CSV Rekap Kegiatan
      </button>
      <button class="dropdown-item" onclick="KasExport.printReport()">
        📑 Cetak Laporan / PDF Siap Rapat
      </button>
    `;

    if (this.currentMode === "a") {
      items += `
        <div class="dropdown-divider"></div>
        <div class="dropdown-header">Khusus Pengurus / Admin</div>
        <button class="dropdown-item" onclick="KasUI.openImportModal()">
          ⬆ Impor Data dari CSV
        </button>
        <button class="dropdown-item" onclick="KasExport.downloadCSVTemplate()">
          📄 Unduh Template CSV Impor
        </button>
        <button class="dropdown-item" onclick="KasExport.exportBackupJSON()">
          💾 Unduh Cadangan Lengkap (JSON)
        </button>
      `;
    }

    items += `
      <div class="dropdown-divider"></div>
      <button class="dropdown-item" onclick="document.documentElement.requestFullscreen ? document.documentElement.requestFullscreen() : null">
        ⛶ Mode Layar Penuh
      </button>
    `;

    menu.innerHTML = items;
  },

  // ==========================================
  // VIEW 1: BERANDA (HOME)
  // ==========================================
  renderHomeView() {
    const transactions = window.store.getTransactions({ year: this.currentYear });
    const totals = window.store.calcTotals(transactions);
    const folders = window.store.getFolders();

    // 5 Most recent transactions
    const recent = [...transactions].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 5);

    // Max expense across folders for progress bar relative calculation
    const expenses = folders.map(f => {
      const fTxs = transactions.filter(t => t.f === f.id);
      return {
        folder: f,
        totKeluar: window.store.calcTotals(fTxs).keluar
      };
    });
    const maxExp = Math.max(...expenses.map(e => e.totKeluar), 1);

    // Income vs Expense ratio calculation
    const inTotal = totals.masuk;
    const outTotal = totals.keluar;
    const ratioOutPercent = inTotal > 0 ? Math.min(100, Math.round((outTotal / inTotal) * 100)) : 0;

    return `
      <!-- 4 Stat Cards -->
      <div class="stats-grid">
        <div class="stat-card card-saldo">
          <div class="stat-head">
            <span class="stat-label">Saldo Kas Bersih</span>
            <div class="stat-icon icon-saldo">💰</div>
          </div>
          <div class="stat-value ${totals.saldo >= 0 ? '' : 'text-out'}">${window.formatRupiah(totals.saldo)}</div>
          <div class="stat-foot">Akumulasi per ${this.currentYear === "Semua" ? "semua periode" : "tahun " + this.currentYear}</div>
        </div>

        <div class="stat-card card-masuk">
          <div class="stat-head">
            <span class="stat-label">Total Uang Masuk</span>
            <div class="stat-icon icon-masuk">📈</div>
          </div>
          <div class="stat-value text-in">${window.formatRupiah(totals.masuk)}</div>
          <div class="stat-foot">Iuran, donatur & sumbangan</div>
        </div>

        <div class="stat-card card-keluar">
          <div class="stat-head">
            <span class="stat-label">Total Uang Keluar</span>
            <div class="stat-icon icon-keluar">📉</div>
          </div>
          <div class="stat-value text-out">${window.formatRupiah(totals.keluar)}</div>
          <div class="stat-foot">Operasional & kegiatan warga</div>
        </div>

        <div class="stat-card card-transaksi">
          <div class="stat-head">
            <span class="stat-label">Jumlah Transaksi</span>
            <div class="stat-icon icon-transaksi">📋</div>
          </div>
          <div class="stat-value">${totals.count}</div>
          <div class="stat-foot">Pencatatan tercatat di sistem</div>
        </div>
      </div>

      <!-- Dashboard Two Column Breakdown -->
      <div class="dashboard-grid">
        <!-- Pengeluaran per Kegiatan -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Pengeluaran per Kegiatan</div>
              <div class="card-subtitle">Realisasi pengeluaran kas berdasarkan folder kegiatan</div>
            </div>
          </div>
          <div class="progress-list">
            ${expenses.map(e => {
              const pct = maxExp > 0 ? Math.round((e.totKeluar / maxExp) * 100) : 0;
              return `
                <div class="progress-row">
                  <span class="progress-name" title="${e.folder.n}">${e.folder.ic} ${e.folder.n}</span>
                  <div class="progress-track">
                    <div class="progress-fill" style="width: ${pct}%; background: var(--out);"></div>
                  </div>
                  <span class="progress-amount text-out">${window.formatRupiah(e.totKeluar)}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Perbandingan Masuk vs Keluar & Quick Actions -->
        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div class="card-header">
              <div>
                <div class="card-title">Arus Kas Masuk vs Keluar</div>
                <div class="card-subtitle">Keseimbangan pengeluaran terhadap penerimaan</div>
              </div>
            </div>
            
            <div class="cashflow-ratio-box">
              <div class="ratio-row">
                <div class="ratio-label-group">
                  <span>Penerimaan (100%)</span>
                  <span class="text-in">${window.formatRupiah(inTotal)}</span>
                </div>
                <div class="progress-track" style="height:12px;">
                  <div class="progress-fill" style="width: 100%; background: var(--in);"></div>
                </div>
              </div>

              <div class="ratio-row">
                <div class="ratio-label-group">
                  <span>Pengeluaran (${ratioOutPercent}%)</span>
                  <span class="text-out">${window.formatRupiah(outTotal)}</span>
                </div>
                <div class="progress-track" style="height:12px;">
                  <div class="progress-fill" style="width: ${ratioOutPercent}%; background: var(--out);"></div>
                </div>
              </div>
            </div>

            <p style="font-size:13px; color:var(--text-muted); margin-top:16px; line-height:1.5;">
              Seluruh transaksi tercatat otomatis ke dalam buku besar dan terdistribusi ke masing-masing folder kegiatan.
            </p>
          </div>

          <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="KasUI.openUsulModal()">
              💡 Sampaikan Usulan
            </button>
            ${this.currentMode === "a" ? `
              <button class="btn btn-secondary" onclick="KasUI.openAddTransactionModal()">
                + Catat Transaksi
              </button>
            ` : `
              <button class="btn btn-secondary" onclick="KasUI.navigateTo('kas')">
                Lihat Buku Kas ➔
              </button>
            `}
          </div>
        </div>
      </div>

      <!-- 5 Transaksi Terbaru -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">5 Transaksi Terkini</div>
            <div class="card-subtitle">Pencatatan kas teranyar yang masuk ke sistem</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="KasUI.navigateTo('kas')">
            Lihat Semua Transaksi ➔
          </button>
        </div>
        ${this.renderTransactionTable(recent, false)}
      </div>
    `;
  },

  filterDuplicatesInKas() {
    this.navigateTo("kas");
  },

  // ==========================================
  // VIEW 2: BUKU KAS (TRANSACTIONS)
  // ==========================================
  renderKasView() {
    const filter = {
      year: this.currentYear,
      type: this.kasTab,
      folderId: this.kasFolder,
      query: this.kasQuery
    };

    let list = window.store.getTransactions(filter);

    // Sorting
    if (this.kasSort === "newest") {
      list.sort((a, b) => b.d.localeCompare(a.d));
    } else if (this.kasSort === "oldest") {
      list.sort((a, b) => a.d.localeCompare(b.d));
    } else if (this.kasSort === "highest") {
      list.sort((a, b) => b.n - a.n);
    }

    const totals = window.store.calcTotals(list);
    const folders = window.store.getFolders();

    return `
      <!-- Filter Tabs and Action Buttons -->
      <div class="filter-wrapper">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div class="filter-tabs">
            <button class="tab-btn ${this.kasTab === 'all' ? 'active' : ''}" data-kas-tab="all">Semua Transaksi</button>
            <button class="tab-btn ${this.kasTab === 'i' ? 'active' : ''}" data-kas-tab="i">📈 Uang Masuk</button>
            <button class="tab-btn ${this.kasTab === 'o' ? 'active' : ''}" data-kas-tab="o">📉 Uang Keluar</button>
          </div>

          ${this.currentMode === "a" ? `
            <div style="display:flex; gap:8px;">
              <button class="btn btn-primary" onclick="KasUI.openAddTransactionModal()">
                + Catat Transaksi
              </button>
              <button class="btn btn-secondary" onclick="KasUI.openSpreadsheetModal()">
                ⚡ Edit Cepat (Spreadsheet)
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Filter Inputs -->
        <div class="filter-inputs">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="kasSearchInput" placeholder="Cari keterangan, pihak/sumber, atau kegiatan..." value="${this.escapeHTML(this.kasQuery)}">
          </div>

          <div style="width:220px;">
            <select id="kasFolderSelect">
              <option value="">Semua Folder Kegiatan</option>
              ${folders.map(f => `
                <option value="${f.id}" ${this.kasFolder === f.id ? 'selected' : ''}>${f.ic} ${f.n}</option>
              `).join("")}
            </select>
          </div>

          <div style="width:180px;">
            <select id="kasSortSelect">
              <option value="newest" ${this.kasSort === 'newest' ? 'selected' : ''}>Tanggal: Terbaru</option>
              <option value="oldest" ${this.kasSort === 'oldest' ? 'selected' : ''}>Tanggal: Terlama</option>
              <option value="highest" ${this.kasSort === 'highest' ? 'selected' : ''}>Nominal: Terbesar</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Summary Bar Strip -->
      <div class="summary-strip">
        <div class="summary-item">
          <span>Masuk:</span>
          <b class="text-in">${window.formatRupiah(totals.masuk)}</b>
        </div>
        <div class="summary-item">
          <span>Keluar:</span>
          <b class="text-out">${window.formatRupiah(totals.keluar)}</b>
        </div>
        <div class="summary-item">
          <span>Saldo Periode:</span>
          <b class="${totals.saldo >= 0 ? '' : 'text-out'}">${window.formatRupiah(totals.saldo)}</b>
        </div>
        <div class="summary-item" style="margin-left:auto; color:var(--text-muted);">
          <span>Ditemukan: <b>${list.length}</b> transaksi</span>
        </div>
      </div>

      <!-- Table Component -->
      <div class="card" style="padding:0; overflow:hidden;">
        ${this.renderTransactionTable(list, this.currentMode === "a")}
      </div>
    `;
  },

  bindKasEvents() {
    // Tab buttons
    document.querySelectorAll("[data-kas-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.kasTab = btn.getAttribute("data-kas-tab");
        this.render();
      });
    });

    // Search input
    const searchInput = document.getElementById("kasSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", e => {
        this.kasQuery = e.target.value;
        this.renderKasViewOnly();
      });
    }

    // Folder select
    const folderSelect = document.getElementById("kasFolderSelect");
    if (folderSelect) {
      folderSelect.addEventListener("change", e => {
        this.kasFolder = e.target.value;
        this.render();
      });
    }

    // Sort select
    const sortSelect = document.getElementById("kasSortSelect");
    if (sortSelect) {
      sortSelect.addEventListener("change", e => {
        this.kasSort = e.target.value;
        this.render();
      });
    }
  },

  renderKasViewOnly() {
    const container = document.getElementById("viewContainer");
    if (container && this.currentView === "kas") {
      container.innerHTML = this.renderKasView();
      this.bindKasEvents();
      const input = document.getElementById("kasSearchInput");
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  },

  resetKasFilters() {
    this.kasTab = "all";
    this.kasFolder = "";
    this.kasQuery = "";
    this.kasSort = "newest";
    this.render();
  },

  // Helper Table Renderer
  renderTransactionTable(transactions, showActions = false) {
    const colSpan = showActions ? 8 : 7;
    const hasData = transactions && transactions.length > 0;

    return `
      <div class="table-container">
        <table class="table-responsive-mobile">
          <thead>
            <tr>
              <th style="width:45px; text-align:center;">#</th>
              <th style="width:115px;">Tanggal</th>
              <th style="width:100px;">Jenis</th>
              <th style="width:170px;">Folder / Kegiatan</th>
              <th>Uraian / Keterangan</th>
              <th class="text-right" style="width:140px;">Jumlah (Rp)</th>
              <th style="width:150px;">Pihak / Nama Warga</th>
              ${showActions ? '<th class="text-right" style="width:90px;">Aksi</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${hasData ? transactions.map((t, idx) => {
              const folder = window.store.getFolder(t.f);
              const catatan = window.store.getCatatanById(t.c);

              return `
                <tr>
                  <td data-label="#" style="text-align:center; font-weight:700; color:var(--text-muted);">
                    ${idx + 1}
                  </td>
                  <td data-label="Tanggal" style="white-space:nowrap; font-weight:600;">
                    ${window.formatDate(t.d)}
                  </td>
                  <td data-label="Jenis">
                    <span class="badge ${t.t === 'i' ? 'badge-in' : 'badge-out'}">
                      ${t.t === 'i' ? '⬆ Masuk' : '⬇ Keluar'}
                    </span>
                  </td>
                  <td data-label="Folder / Kegiatan">
                    <a style="color:var(--primary); font-weight:700; cursor:pointer;" onclick="KasUI.navigateTo('arsip', { folderId: '${t.f}', catatanId: '${t.c}' })">
                      ${folder ? folder.ic + ' ' + folder.n : 'Umum'}
                    </a>
                    ${catatan ? `<div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${catatan.t}</div>` : ''}
                  </td>
                  <td data-label="Uraian / Keterangan">
                    <div style="font-weight:600; color:var(--text-main); line-height:1.4;">
                      ${this.escapeHTML(t.k)}
                    </div>
                  </td>
                  <td data-label="Jumlah (Rp)" class="text-right mono ${t.t === 'i' ? 'text-in' : 'text-out'}" style="font-weight:700;">
                    ${t.t === 'i' ? '+' : '−'} ${window.formatRupiah(t.n)}
                  </td>
                  <td data-label="Pihak / Nama Warga" style="font-weight:600;">
                    ${this.escapeHTML(t.s || '—')}
                  </td>
                  ${showActions ? `
                    <td data-label="Aksi" class="text-right">
                      <div style="display:inline-flex; gap:4px;">
                        <button class="btn btn-ghost btn-sm" title="Edit Transaksi" onclick="KasUI.openEditTransactionModal('${t.id}')">✏️</button>
                        <button class="btn btn-danger btn-sm" title="Hapus Transaksi" onclick="KasUI.confirmDeleteTransaction('${t.id}')">🗑</button>
                      </div>
                    </td>
                  ` : ''}
                </tr>
              `;
            }).join("") : `
              <tr>
                <td colspan="${colSpan}" style="text-align:center; padding:24px 16px; color:var(--text-muted); font-size:13px;">
                  Belum ada data transaksi
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `;
  },

  // ==========================================
  // VIEW 3: ARSIP (FOLDER EXPLORER)
  // ==========================================
  renderArsipView() {
    const folders = window.store.getFolders();
    const currentFolder = this.arsipFolderId ? window.store.getFolder(this.arsipFolderId) : null;
    const currentCatatan = this.arsipCatatanId ? window.store.getCatatanById(this.arsipCatatanId) : null;

    // Breadcrumbs trail
    const breadcrumbs = `
      <div class="breadcrumb-trail">
        <a onclick="KasUI.arsipFolderId=null; KasUI.arsipCatatanId=null; KasUI.render();">📁 Arsip Utama</a>
        ${currentFolder ? `
          <span class="breadcrumb-sep">›</span>
          <a onclick="KasUI.arsipCatatanId=null; KasUI.render();">${currentFolder.ic} ${currentFolder.n}</a>
        ` : ''}
        ${currentCatatan ? `
          <span class="breadcrumb-sep">›</span>
          <strong>📄 ${currentCatatan.t}</strong>
        ` : ''}
      </div>
    `;

    this.openFolders = this.openFolders || { iur: true };

    // Explorer Tree Column (Desktop left side)
    const treeColumn = `
      <div class="card" style="padding:12px 10px;">
        <div style="font-size:11px; font-weight:700; color:var(--text-light); text-transform:uppercase; margin-bottom:8px; padding:0 6px 8px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border-subtle);">
          <span>🗂️ Struktur Explorer</span>
          <a onclick="KasUI.arsipFolderId=null; KasUI.arsipCatatanId=null; KasUI.render();" style="cursor:pointer; font-size:11px; color:var(--primary); font-weight:600;">Semua</a>
        </div>
        <div class="folder-tree">
          ${folders.map(f => {
            const fCatatan = window.store.getCatatan(f.id);
            const isOpen = (this.arsipFolderId === f.id) || (this.openFolders && this.openFolders[f.id]);
            const isFoldActive = (this.arsipFolderId === f.id && !this.arsipCatatanId);

            return `
              <div class="tree-folder-group">
                <div class="tree-folder-row ${isFoldActive ? 'active' : ''}">
                  <button type="button" class="tree-toggle-btn" onclick="KasUI.toggleTreeFolder('${f.id}')" title="${isOpen ? 'Tutup sub-berkas' : 'Buka sub-berkas'}">
                    ${isOpen ? '▼' : '▶'}
                  </button>
                  <button type="button" class="folder-tree-btn" style="padding:6px 6px 6px 0;" onclick="KasUI.selectTreeFolder('${f.id}')" title="Buka folder ${f.n}">
                    <span>${f.ic}</span>
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${f.n}</span>
                    <span class="badge" style="font-size:10px; padding:1px 5px; margin-left:auto; background:var(--surface-alt); color:var(--text-muted);">${fCatatan.length}</span>
                  </button>
                </div>

                ${isOpen ? `
                  <div class="tree-sub-files">
                    ${fCatatan.length > 0 ? fCatatan.map(c => `
                      <button type="button" class="tree-file-btn ${this.arsipCatatanId === c.id ? 'active' : ''}" onclick="KasUI.selectTreeFile('${f.id}', '${c.id}')" title="${this.escapeHTML(c.t)}">
                        <svg class="feather-icon" style="width:13px; height:13px; flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        <div style="flex:1; min-width:0; overflow:hidden;">
                          <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:600; font-size:11.5px;">${this.escapeHTML(c.t.replace(/Rekap\s+(Iuran\s+Warga|Operasional\s+RT|Kebersihan\s*&\s*Keamanan|Pembangunan\s+Pos\s+Ronda|Santunan\s*&\s*Kepedulian|Kas\s+Family\s+Gathering|Kas\s+Peringatan\s+HUT\s+RI)\s*[–-]\s*/i, ''))}</div>
                          <small style="font-size:10px; color:inherit; opacity:0.8; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📅 ${this.escapeHTML(c.p || window.formatDate(c.d))}</small>
                        </div>
                        <span class="badge ${c.s === 'Final' ? 'badge-in' : 'badge-warn'}" style="font-size:9px; padding:1px 4px; flex-shrink:0;">${c.s}</span>
                      </button>
                    `).join("") : `
                      <div style="font-size:11px; color:var(--text-muted); padding:4px 8px; font-style:italic;">Belum ada berkas</div>
                    `}
                    ${this.currentMode === "a" ? `
                      <button type="button" onclick="KasUI.openAddCatatanModal('${f.id}')" style="display:flex; align-items:center; gap:4px; border:0; background:none; color:var(--primary); font-size:11px; font-weight:600; padding:3px 6px; cursor:pointer; border-radius:4px; margin-top:2px;">
                        + Rekap Baru
                      </button>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    let centerColumn = "";
    let detailColumn = "";

    // LEVEL 1: Root Folder List
    if (!currentFolder) {
      centerColumn = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div class="filter-tabs">
            <button class="tab-btn ${this.arsipViewMode === 'grid' ? 'active' : ''}" onclick="KasUI.arsipViewMode='grid'; KasUI.render();">▦ Tampilan Kotak</button>
            <button class="tab-btn ${this.arsipViewMode === 'list' ? 'active' : ''}" onclick="KasUI.arsipViewMode='list'; KasUI.render();">☰ Tampilan Daftar</button>
          </div>

          ${this.currentMode === "a" ? `
            <button class="btn btn-primary btn-sm" onclick="KasUI.openAddFolderModal()">
              + Tambah Folder
            </button>
          ` : ''}
        </div>

        ${this.arsipViewMode === 'grid' ? `
          <div class="folders-grid">
            ${folders.map(f => {
              const fTotals = window.store.calcFolderTotals(f.id);
              const fileCount = window.store.getCatatan(f.id).length + window.store.getBukti(f.id).length;
              return `
                <div class="folder-card" onclick="KasUI.arsipFolderId='${f.id}'; KasUI.render();">
                  <div class="folder-icon">${f.ic}</div>
                  <div class="folder-title">${f.n}</div>
                  <div class="folder-meta">${fileCount} berkas tercatat</div>
                  <div class="folder-balance">
                    <span style="font-size:12px; color:var(--text-muted);">Saldo:</span>
                    <strong class="${fTotals.saldo >= 0 ? 'text-in' : 'text-out'}">${window.formatRupiah(fTotals.saldo)}</strong>
                  </div>
                  ${fTotals.saldo < 0 ? '<span class="badge badge-out" style="align-self:flex-start;">⚠️ Saldo Minus</span>' : ''}
                </div>
              `;
            }).join("")}
          </div>
        ` : `
          <div>
            ${folders.map(f => {
              const fTotals = window.store.calcFolderTotals(f.id);
              const fileCount = window.store.getCatatan(f.id).length + window.store.getBukti(f.id).length;
              return `
                <div class="file-item" onclick="KasUI.arsipFolderId='${f.id}'; KasUI.render();">
                  <div class="file-icon">${f.ic}</div>
                  <div>
                    <div class="file-name">${f.n}</div>
                    <div class="file-desc">${f.pic} • ${fileCount} berkas arsip</div>
                  </div>
                  <div style="text-align:right;">
                    <div class="mono ${fTotals.saldo >= 0 ? 'text-in' : 'text-out'}">${window.formatRupiah(fTotals.saldo)}</div>
                    ${fTotals.saldo < 0 ? '<span class="badge badge-out">Minus</span>' : ''}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `}
      `;

      detailColumn = `
        <div class="card explorer-detail-col">
          <div class="card-title">Direktori Arsip RT</div>
          <p style="font-size:13.5px; color:var(--text-muted); margin-top:8px; line-height:1.5;">
            Pilih salah satu folder kegiatan di sebelah kiri untuk melihat rincian catatan keuangan sub-kegiatan, bukti nota kwitansi, dan pertanggungjawaban fisik.
          </p>
          <div style="margin-top:16px; padding:12px; background:var(--surface-alt); border-radius:var(--radius-md); font-size:13px;">
            <strong>Status Folder:</strong><br>
            Semua transaksi secara transparan dikelompokkan per kegiatan agar akuntabel saat musyawarah warga.
          </div>
        </div>
      `;
    } 
    // LEVEL 2: Inside Folder (Catatan + Bukti Dokumen)
    else if (!currentCatatan) {
      const fCatatan = window.store.getCatatan(currentFolder.id);
      const fBukti = window.store.getBukti(currentFolder.id);
      const fTotals = window.store.calcFolderTotals(currentFolder.id);
      const fTransactions = window.store.getTransactions({ folderId: currentFolder.id });

      centerColumn = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">${currentFolder.ic} ${currentFolder.n}</h2>
            <p style="font-size:13.5px; color:var(--text-muted);">${currentFolder.desc || 'Arsip kegiatan warga RT 01'}</p>
          </div>

          ${this.currentMode === "a" ? `
            <div style="display:flex; gap:8px;">
              <button class="btn btn-primary btn-sm" onclick="KasUI.openAddCatatanModal('${currentFolder.id}')">
                + Catatan Baru
              </button>
              <button class="btn btn-secondary btn-sm" onclick="KasUI.openUploadBuktiModal('${currentFolder.id}')">
                ⬆ Upload Bukti Dokumen
              </button>
            </div>
          ` : ''}
        </div>

        <div style="margin-bottom:20px;">
          <div style="font-size:13px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px; letter-spacing:0.04em;">
            Sub-Catatan Keuangan (${fCatatan.length})
          </div>
          ${fCatatan.length > 0 ? fCatatan.map(c => {
            const cTotals = window.store.calcCatatanTotals(c.id);
            return `
              <div class="file-item" onclick="KasUI.arsipCatatanId='${c.id}'; KasUI.render();">
                <div class="file-icon">📄</div>
                <div>
                  <div class="file-name">Catatan: ${c.t}</div>
                  <div class="file-desc">Periode ${c.p} • Masuk ${window.formatRupiah(cTotals.masuk)} • Keluar ${window.formatRupiah(cTotals.keluar)}</div>
                </div>
                <div style="text-align:right;">
                  <div class="mono" style="font-weight:700;">${window.formatRupiah(cTotals.saldo)}</div>
                  <span class="badge ${c.s === 'Final' ? 'badge-in' : 'badge-warn'}" style="margin-top:4px;">
                    ${c.s === 'Final' ? '🔒 Final' : '✎ Draf'}
                  </span>
                </div>
              </div>
            `;
          }).join("") : `
            <div style="padding:16px; background:var(--surface); border:1px dashed var(--border); border-radius:var(--radius-md); font-size:13.5px; color:var(--text-muted);">
              Belum ada catatan keuangan di folder ini.
            </div>
          `}
        </div>

        <div>
          <div style="font-size:13px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px; letter-spacing:0.04em;">
            Bukti Fisik & Kwitansi Pendukung (${fBukti.length})
          </div>
          ${fBukti.length > 0 ? fBukti.map(b => `
            <div class="file-item" onclick="KasUI.previewBukti('${b.id}')">
              <div class="file-icon">${b.ic}</div>
              <div>
                <div class="file-name">${b.n}</div>
                <div class="file-desc">Diunggah: ${window.formatDate(b.d)} • Ukuran: ${b.size}</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); KasUI.previewBukti('${b.id}')">
                Lihat Berkas 👁️
              </button>
            </div>
          `).join("") : `
            <div style="padding:16px; background:var(--surface); border:1px dashed var(--border); border-radius:var(--radius-md); font-size:13.5px; color:var(--text-muted);">
              Belum ada berkas kwitansi yang diunggah untuk folder ini.
            </div>
          `}
        </div>

        <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:16px;">
          <div style="font-size:13px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px; letter-spacing:0.04em;">
            Pratinjau Tabel Template / Seluruh Transaksi Kegiatan (${fTransactions.length})
          </div>
          <div class="card" style="padding:0; overflow:hidden;">
            ${this.renderTransactionTable(fTransactions, this.currentMode === "a")}
          </div>
        </div>
      `;

      detailColumn = `
        <div class="card explorer-detail-col">
          <div class="card-title">${currentFolder.ic} Informasi Folder</div>
          <div style="margin-top:12px; font-size:13.5px; display:flex; flex-direction:column; gap:10px;">
            <div>
              <span style="color:var(--text-muted); font-size:12px;">Penanggung Jawab (PIC):</span><br>
              <strong>${currentFolder.pic}</strong>
            </div>
            ${currentFolder.pagu ? `
              <div>
                <span style="color:var(--text-muted); font-size:12px;">Pagu Anggaran Disetujui:</span><br>
                <strong>${window.formatRupiah(currentFolder.pagu)}</strong>
              </div>
            ` : ''}
            <div>
              <span style="color:var(--text-muted); font-size:12px;">Total Masuk:</span><br>
              <strong class="text-in">${window.formatRupiah(fTotals.masuk)}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); font-size:12px;">Total Keluar:</span><br>
              <strong class="text-out">${window.formatRupiah(fTotals.keluar)}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); font-size:12px;">Saldo Folder:</span><br>
              <strong class="${fTotals.saldo >= 0 ? 'text-in' : 'text-out'}">${window.formatRupiah(fTotals.saldo)}</strong>
            </div>
          </div>
        </div>
      `;
    } 
    // LEVEL 3: Inside Catatan (Sub-catatan Transactions Table)
    else {
      const cTransactions = window.store.getTransactions({ catatanId: currentCatatan.id });
      const cTotals = window.store.calcTotals(cTransactions);

      centerColumn = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-main);">Catatan: ${currentCatatan.t}</h2>
            <div style="font-size:13px; color:var(--text-muted); margin-top:2px;">
              Folder: <strong>${currentFolder.n}</strong> • Periode: ${currentCatatan.p} • 
              Status: <span class="badge ${currentCatatan.s === 'Final' ? 'badge-in' : 'badge-warn'}">${currentCatatan.s === 'Final' ? '🔒 Final' : '✎ Draf'}</span>
            </div>
          </div>

          ${this.currentMode === "a" ? `
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary btn-sm" onclick="KasUI.toggleCatatanLock('${currentCatatan.id}')">
                ${currentCatatan.s === 'Final' ? '🔓 Buka Kunci Draf' : '🔒 Kunci Sebagai Final'}
              </button>
              <button class="btn btn-secondary btn-sm" onclick="KasExport.exportFolderToXLSX('${currentFolder.id}')" title="Unduh laporan Excel kegiatan ini (.xlsx)">
                <svg class="feather-icon" style="width:14px;height:14px;margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Ekspor XLSX
              </button>
              <button class="btn btn-secondary btn-sm" onclick="KasUI.openImportXLSXModal('${currentFolder.id}')" title="Impor transaksi kegiatan ini dari file Excel (.xlsx)">
                <svg class="feather-icon" style="width:14px;height:14px;margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Impor XLSX
              </button>
              ${currentCatatan.s !== 'Final' ? `
                <button class="btn btn-secondary btn-sm" onclick="KasUI.openSpreadsheetModal('${currentFolder.id}')">
                  ⚡ Input Spreadsheet
                </button>
                <button class="btn btn-primary btn-sm" onclick="KasUI.openAddTransactionModal('${currentFolder.id}', '${currentCatatan.id}')">
                  + Catat Transaksi
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <div class="summary-strip">
          <div class="summary-item">
            <span>Masuk:</span>
            <b class="text-in">${window.formatRupiah(cTotals.masuk)}</b>
          </div>
          <div class="summary-item">
            <span>Keluar:</span>
            <b class="text-out">${window.formatRupiah(cTotals.keluar)}</b>
          </div>
          <div class="summary-item">
            <span>Saldo:</span>
            <b class="${cTotals.saldo >= 0 ? '' : 'text-out'}">${window.formatRupiah(cTotals.saldo)}</b>
          </div>
        </div>

        <div class="card" style="padding:0; overflow:hidden;">
          ${this.renderTransactionTable(cTransactions, this.currentMode === "a" && currentCatatan.s !== "Final")}
        </div>
      `;

      detailColumn = `
        <div class="card explorer-detail-col">
          <div class="card-title">Status Catatan</div>
          <div style="margin-top:12px; font-size:13.5px; line-height:1.5;">
            <p><strong>${currentCatatan.t}</strong></p>
            <p style="color:var(--text-muted); margin-top:4px;">${currentCatatan.desc || 'Tidak ada catatan tambahan.'}</p>
            <div style="margin-top:12px; padding:10px; background:var(--surface-alt); border-radius:var(--radius-sm); font-size:12.5px;">
              ${currentCatatan.s === 'Final' 
                ? '🔒 Status <strong>Final</strong>: Catatan telah dikunci dan disahkan bendahara.' 
                : '✎ Status <strong>Draf</strong>: Masih dapat ditambah atau disunting oleh pengurus.'}
            </div>
          </div>
        </div>
      `;
    }

    return `
      ${breadcrumbs}
      <div class="explorer-layout">
        ${treeColumn}
        <div>${centerColumn}</div>
        ${detailColumn}
      </div>
    `;
  },

  toggleTreeFolder(fId) {
    this.openFolders = this.openFolders || {};
    this.openFolders[fId] = !this.openFolders[fId];
    this.render();
  },

  selectTreeFolder(fId) {
    this.openFolders = this.openFolders || {};
    this.openFolders[fId] = true;
    this.arsipFolderId = fId;
    this.arsipCatatanId = null;
    this.render();
  },

  selectTreeFile(fId, cId) {
    this.openFolders = this.openFolders || {};
    this.openFolders[fId] = true;
    this.arsipFolderId = fId;
    this.arsipCatatanId = cId;
    this.render();
  },

  toggleCatatanLock(id) {
    const newStatus = window.store.toggleLockCatatan(id);
    this.showToast(`Status catatan diubah menjadi: ${newStatus}`);
    this.render();
  },

  previewBukti(id) {
    const b = window.store.data.bukti.find(item => item.id === id);
    if (!b) return;

    this.showModal(
      `Berkas: ${b.n}`,
      `
        <div style="text-align:center; padding:10px;">
          <div style="font-size:60px; margin-bottom:12px;">${b.ic}</div>
          <h4 style="font-size:16px; margin-bottom:6px;">${b.n}</h4>
          <p style="color:var(--text-muted); font-size:13px; margin-bottom:16px;">
            Ukuran: ${b.size} • Diunggah pada: ${window.formatDate(b.d)}
          </p>
          <div style="padding:20px; background:var(--surface-alt); border-radius:var(--radius-md); border:1px dashed var(--border); font-size:13px; color:var(--text-muted);">
            📄 Pratinjau Dokumen Kwitansi Fisik Digital RT 01.<br>
            Dokumen ini tersimpan secara aman sebagai lampiran pertanggungjawaban kegiatan.
          </div>
        </div>
      `,
      `
        <button class="btn btn-secondary btn-sm" onclick="KasUI.closeModal()">Tutup</button>
        <button class="btn btn-primary btn-sm" onclick="KasUI.showToast('Mengunduh berkas kwitansi...'); KasUI.closeModal();">Unduh Berkas ⬇</button>
      `
    );
  },

  // ==========================================
  // VIEW 4: USULAN WARGA (ASPIRASI)
  // ==========================================
  renderUsulView() {
    const list = window.store.getUsulan();
    const filtered = this.usulFilter === "all" ? list : list.filter(u => u.st === this.usulFilter);

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div class="filter-tabs">
          <button class="tab-btn ${this.usulFilter === 'all' ? 'active' : ''}" onclick="KasUI.usulFilter='all'; KasUI.render();">Semua Usulan (${list.length})</button>
          <button class="tab-btn ${this.usulFilter === 'Sedang Ditinjau' ? 'active' : ''}" onclick="KasUI.usulFilter='Sedang Ditinjau'; KasUI.render();">⏳ Sedang Ditinjau</button>
          <button class="tab-btn ${this.usulFilter === 'Telah Dianggarkan' ? 'active' : ''}" onclick="KasUI.usulFilter='Telah Dianggarkan'; KasUI.render();">✅ Telah Dianggarkan</button>
          <button class="tab-btn ${this.usulFilter === 'Ditolak' ? 'active' : ''}" onclick="KasUI.usulFilter='Ditolak'; KasUI.render();">❌ Ditolak</button>
        </div>

        <button class="btn btn-primary" onclick="KasUI.openUsulModal()">
          💡 Sampaikan Usulan Warga
        </button>
      </div>

      <div class="usulan-list">
        ${filtered.length > 0 ? filtered.map(u => `
          <div class="usulan-card">
            <div class="usulan-header">
              <div>
                <div class="usulan-title">${this.escapeHTML(u.j)}</div>
                <div class="usulan-author">Diajukan oleh <strong>${this.escapeHTML(u.o)}</strong> pada ${window.formatDate(u.d)}</div>
              </div>

              ${this.currentMode === "a" ? `
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:12px; color:var(--text-muted);">Status:</span>
                  <select style="width:170px; height:34px; font-size:12.5px;" onchange="KasUI.updateUsulanStatus('${u.id}', this.value)">
                    <option value="Sedang Ditinjau" ${u.st === 'Sedang Ditinjau' ? 'selected' : ''}>⏳ Sedang Ditinjau</option>
                    <option value="Telah Dianggarkan" ${u.st === 'Telah Dianggarkan' ? 'selected' : ''}>✅ Telah Dianggarkan</option>
                    <option value="Ditolak" ${u.st === 'Ditolak' ? 'selected' : ''}>❌ Ditolak</option>
                  </select>
                  <button class="btn btn-danger btn-sm" onclick="KasUI.deleteUsulan('${u.id}')" title="Hapus Usulan">🗑</button>
                </div>
              ` : `
                <span class="badge ${u.st === 'Telah Dianggarkan' ? 'badge-in' : (u.st === 'Sedang Ditinjau' ? 'badge-warn' : 'badge-out')}">
                  ${u.st === 'Telah Dianggarkan' ? '✅' : (u.st === 'Sedang Ditinjau' ? '⏳' : '❌')} ${u.st}
                </span>
              `}
            </div>

            <div class="usulan-body">
              “${this.escapeHTML(u.q)}”
            </div>

            <div class="usulan-response">
              <div class="usulan-response-title">
                <span>💬</span> <span>Tanggapan Pengurus RT</span>
              </div>
              ${this.currentMode === "a" ? `
                <div style="display:flex; flex-direction:column; gap:8px; margin-top:6px;">
                  <textarea id="resp_${u.id}" placeholder="Tulis tanggapan atau keputusan pengurus RT...">${this.escapeHTML(u.r || '')}</textarea>
                  <div style="align-self:flex-end;">
                    <button class="btn btn-primary btn-sm" onclick="KasUI.saveUsulanResponse('${u.id}')">Simpan Tanggapan</button>
                  </div>
                </div>
              ` : `
                <div style="color:var(--text-main); font-size:13.5px; line-height:1.5;">
                  ${u.r ? this.escapeHTML(u.r) : '<em style="color:var(--text-muted);">Belum ada tanggapan resmi dari pengurus RT.</em>'}
                </div>
              `}
            </div>
          </div>
        `).join("") : `
          <div class="card" style="text-align:center; padding:48px; color:var(--text-muted);">
            <div style="font-size:36px; margin-bottom:12px;">💬</div>
            <div style="font-size:16px; font-weight:700; color:var(--text-main);">Belum Ada Usulan Warga</div>
            <p style="font-size:13.5px; margin-top:4px;">Jadilah warga pertama yang menyampaikan aspirasi atau ide pembangunan fasilitas RT.</p>
            <button class="btn btn-primary btn-sm" style="margin-top:14px;" onclick="KasUI.openUsulModal()">Sampaikan Usulan</button>
          </div>
        `}
      </div>
    `;
  },

  updateUsulanStatus(id, st) {
    window.store.updateUsulanStatus(id, st);
    this.showToast(`Status usulan diperbarui: ${st}`);
    this.render();
  },

  saveUsulanResponse(id) {
    const el = document.getElementById(`resp_${id}`);
    if (el) {
      window.store.updateUsulanResponse(id, el.value);
      this.showToast("Tanggapan pengurus berhasil disimpan!");
      this.render();
    }
  },

  deleteUsulan(id) {
    if (confirm("Hapus usulan warga ini?")) {
      window.store.deleteUsulan(id);
      this.showToast("Usulan dihapus");
      this.render();
    }
  },

  // ==========================================
  // VIEW 5: KELOLA (ADMIN / PENGURUS ONLY)
  // ==========================================
  renderKelolaView() {
    const folders = window.store.getFolders();
    const settings = window.store.getSettings();

    return `
      <!-- Kelola Tabs -->
      <div class="filter-tabs" style="margin-bottom:20px;">
        <button class="tab-btn ${this.kelolaTab === 'anggaran' ? 'active' : ''}" onclick="KasUI.kelolaTab='anggaran'; KasUI.render();">📊 Pagu & Realisasi Anggaran</button>
        <button class="tab-btn ${this.kelolaTab === 'import' ? 'active' : ''}" onclick="KasUI.kelolaTab='import'; KasUI.render();">📥 Impor & Ekspor Data</button>
        <button class="tab-btn ${this.kelolaTab === 'settings' ? 'active' : ''}" onclick="KasUI.kelolaTab='settings'; KasUI.render();">⚙️ Identitas & SOP RT</button>
      </div>

      ${this.kelolaTab === 'anggaran' ? `
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header">
            <div>
              <div class="card-title">Monitoring Pagu vs Realisasi Anggaran</div>
              <div class="card-subtitle">Angka realisasi pengeluaran dihitung otomatis dari transaksi riil</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="KasUI.openAddFolderModal()">+ Tambah Kegiatan</button>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Kegiatan / Bidang</th>
                  <th>Penanggung Jawab</th>
                  <th class="text-right">Pagu Target</th>
                  <th class="text-right">Realisasi Keluar</th>
                  <th class="text-right">Sisa Anggaran</th>
                  <th style="width:160px;">Progress (%)</th>
                  <th class="text-right" style="width:70px;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${folders.map(f => {
                  const fTotals = window.store.calcFolderTotals(f.id);
                  const keluar = fTotals.keluar;
                  const pagu = f.pagu || 0;
                  const sisa = pagu - keluar;
                  const persen = pagu > 0 ? Math.min(100, Math.round((keluar / pagu) * 100)) : 0;
                  const isOver = pagu > 0 && keluar > pagu;

                  return `
                    <tr>
                      <td style="font-weight:700;">${f.ic} ${f.n}</td>
                      <td style="color:var(--text-muted);">${f.pic}</td>
                      <td class="text-right mono">${pagu > 0 ? window.formatRupiah(pagu) : '<span style="color:var(--text-muted); font-size:12px;">Rp 0 (Belum diatur)</span>'}</td>
                      <td class="text-right mono text-out">${window.formatRupiah(keluar)}</td>
                      <td class="text-right mono ${sisa >= 0 ? '' : 'text-out'}">${pagu > 0 ? window.formatRupiah(sisa) : '<span style="color:var(--text-muted); font-size:12px;">Rp 0</span>'}</td>
                      <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                          <div class="progress-track" style="flex:1;">
                            <div class="progress-fill" style="width:${persen}%; background:${isOver ? 'var(--out)' : 'var(--primary)'};"></div>
                          </div>
                          <span style="font-size:12px; font-weight:700; width:38px;">${persen}%</span>
                        </div>
                      </td>
                      <td class="text-right">
                        <button class="btn btn-ghost btn-sm" onclick="KasUI.openEditPaguModal('${f.id}')" title="Atur Pagu Anggaran">✏️</button>
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      ${this.kelolaTab === 'import' ? `
        <div class="card" style="margin-bottom:20px;">
          <div class="card-title" style="margin-bottom:14px;">Impor Transaksi dari Berkas Excel / CSV</div>
          <p style="font-size:13.5px; color:var(--text-muted); line-height:1.6; margin-bottom:16px;">
            Anda dapat memasukkan data kas dalam jumlah banyak sekaligus menggunakan format CSV standar.
          </p>

          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="KasUI.openImportModal()">
              ⬆ Buka Form Impor CSV
            </button>
            <button class="btn btn-secondary" onclick="KasExport.downloadCSVTemplate()">
              📄 Unduh Template CSV Contoh
            </button>
            <button class="btn btn-secondary" onclick="KasExport.exportBackupJSON()">
              💾 Cadangkan Seluruh Basis Data (JSON)
            </button>
          </div>
        </div>
      ` : ''}

      ${this.kelolaTab === 'settings' ? `
        <div class="card" style="margin-bottom:20px;">
          <div class="card-title" style="margin-bottom:14px;">Konfigurasi Identitas RT / RW</div>
          <form id="settingsForm" onsubmit="KasUI.saveSettings(event)" style="display:flex; flex-direction:column; gap:14px;">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nomor RT</label>
                <input type="text" name="rt" value="${this.escapeHTML(settings.rt || '01')}">
              </div>
              <div class="form-group">
                <label class="form-label">Nomor RW</label>
                <input type="text" name="rw" value="${this.escapeHTML(settings.rw || '02')}">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Desa / Kelurahan</label>
                <input type="text" name="desa" value="${this.escapeHTML(settings.desa || 'Desa Sladi')}">
              </div>
              <div class="form-group">
                <label class="form-label">Kecamatan</label>
                <input type="text" name="kecamatan" value="${this.escapeHTML(settings.kecamatan || 'Kejayan')}">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nama Ketua RT</label>
                <input type="text" name="ketuaRt" value="${this.escapeHTML(settings.ketuaRt || '')}">
              </div>
              <div class="form-group">
                <label class="form-label">Nama Bendahara</label>
                <input type="text" name="bendahara" value="${this.escapeHTML(settings.bendahara || '')}">
              </div>
            </div>

            <div style="align-self:flex-end; margin-top:8px;">
              <button type="submit" class="btn btn-primary">Simpan Pengaturan</button>
            </div>
          </form>
        </div>

        <div class="card">
          <div class="card-title">Alur & Standar Operasional Prosedur (SOP) Kas RT</div>
          <p style="font-size:13.5px; color:var(--text-muted); margin:8px 0 16px;">
            Lihat diagram flowchart transparansi kas RT dari pembayaran iuran warga hingga pelaporan bulanan.
          </p>
          <button class="btn btn-secondary" onclick="KasUI.openAlurRTModal()">
            📖 Tampilkan Diagram Alur Transparansi RT
          </button>
        </div>
      ` : ''}
    `;
  },

  saveSettings(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const newSettings = {
      rt: formData.get("rt"),
      rw: formData.get("rw"),
      desa: formData.get("desa"),
      kecamatan: formData.get("kecamatan"),
      ketuaRt: formData.get("ketuaRt"),
      bendahara: formData.get("bendahara")
    };
    window.store.updateSettings(newSettings);
    this.showToast("Pengaturan identitas RT berhasil disimpan!");
    this.render();
  },

  confirmResetDefault() {
    if (confirm("Pulihkan seluruh data ke default awal (demo)? Transaksi baru yang belum diekspor akan hilang.")) {
      window.store.resetToDefault();
      this.showToast("Data berhasil dipulihkan ke default bawaan!");
      this.render();
    }
  },

  confirmWipeAll() {
    const input = prompt("PERINGATAN: Ketik 'HAPUS' (huruf besar) untuk mengosongkan seluruh riwayat kas:");
    if (input === "HAPUS") {
      window.store.clearAllData();
      this.showToast("Seluruh transaksi telah dibersihkan.");
      this.render();
    } else {
      this.showToast("Tindakan dibatalkan.");
    }
  },

  // ==========================================
  // MODAL DIALOGS & FORMS
  // ==========================================

  // Modal: Tambah Transaksi
  openAddTransactionModal(defaultFolderId = null, defaultCatatanId = null) {
    const folders = window.store.getFolders();
    const activeFolder = defaultFolderId || (folders.length ? folders[0].id : "");
    const catatanList = window.store.getCatatan(activeFolder);

    const body = `
      <form id="addTxForm" onsubmit="KasUI.handleAddTransaction(event)">
        <div class="form-row" style="margin-bottom:14px;">
          <div class="form-group">
            <label class="form-label">Tanggal Transaksi</label>
            <input type="date" name="d" required value="${new Date().toISOString().split("T")[0]}">
          </div>
          <div class="form-group">
            <label class="form-label">Jenis Arus Kas</label>
            <select name="t" required>
              <option value="i">📈 Uang Masuk (Penerimaan)</option>
              <option value="o">📉 Uang Keluar (Pengeluaran)</option>
            </select>
          </div>
        </div>

        <div class="form-row" style="margin-bottom:14px;">
          <div class="form-group">
            <label class="form-label">Folder Kegiatan</label>
            <select name="f" id="txFolderSelect" required onchange="KasUI.updateCatatanDropdown(this.value)">
              ${folders.map(f => `
                <option value="${f.id}" ${f.id === activeFolder ? 'selected' : ''}>${f.ic} ${f.n}</option>
              `).join("")}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Sub-Catatan / Kegiatan</label>
            <select name="c" id="txCatatanSelect" required>
              ${catatanList.map(c => `
                <option value="${c.id}" ${c.id === defaultCatatanId ? 'selected' : ''}>${c.t}</option>
              `).join("")}
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Keterangan / Uraian Transaksi</label>
          <input type="text" name="k" placeholder="Contoh: Iuran rutin bulan Maret dari 60 KK" required>
        </div>

        <div class="form-row" style="margin-bottom:14px;">
          <div class="form-group">
            <label class="form-label">Nominal Transaksi (Rp)</label>
            <input type="number" name="n" placeholder="100000" min="1" step="1" required id="txNominalInput" oninput="KasUI.previewNominal(this.value)">
            <span class="form-help" id="txNominalHelp">Rp 0</span>
          </div>
          <div class="form-group">
            <label class="form-label">Pihak / Sumber / Toko</label>
            <input type="text" name="s" placeholder="Contoh: Toko Bangunan / Warga Blok A" required>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="KasUI.closeModal()">Batal</button>
      <button type="submit" form="addTxForm" class="btn btn-primary">Simpan Transaksi</button>
    `;

    this.showModal("Catat Transaksi Kas Baru", body, footer);
  },

  updateCatatanDropdown(folderId) {
    const catatanSelect = document.getElementById("txCatatanSelect");
    if (!catatanSelect) return;
    const list = window.store.getCatatan(folderId);
    if (list.length > 0) {
      catatanSelect.innerHTML = list.map(c => `<option value="${c.id}">${c.t}</option>`).join("");
    } else {
      catatanSelect.innerHTML = `<option value="${folderId}">Umum</option>`;
    }
  },

  previewNominal(val) {
    const el = document.getElementById("txNominalHelp");
    if (el) {
      el.textContent = window.formatRupiah(Number(val) || 0);
    }
  },

  handleAddTransaction(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    window.store.addTransaction({
      d: formData.get("d"),
      t: formData.get("t"),
      f: formData.get("f"),
      c: formData.get("c"),
      k: formData.get("k"),
      n: formData.get("n"),
      s: formData.get("s")
    });

    this.showToast("Transaksi berhasil dicatat ke buku kas!");
    this.closeModal();
    this.render();
  },

  // Modal: Edit Transaksi
  openEditTransactionModal(id) {
    const tx = window.store.data.transactions.find(t => t.id === id);
    if (!tx) return;

    const folders = window.store.getFolders();
    const catatanList = window.store.getCatatan(tx.f);

    const body = `
      <form id="editTxForm" onsubmit="KasUI.handleEditTransaction(event, '${id}')">
        <div class="form-row" style="margin-bottom:14px;">
          <div class="form-group">
            <label class="form-label">Tanggal Transaksi</label>
            <input type="date" name="d" required value="${tx.d}">
          </div>
          <div class="form-group">
            <label class="form-label">Jenis Arus Kas</label>
            <select name="t" required>
              <option value="i" ${tx.t === 'i' ? 'selected' : ''}>📈 Uang Masuk (Penerimaan)</option>
              <option value="o" ${tx.t === 'o' ? 'selected' : ''}>📉 Uang Keluar (Pengeluaran)</option>
            </select>
          </div>
        </div>

        <div class="form-row" style="margin-bottom:14px;">
          <div class="form-group">
            <label class="form-label">Folder Kegiatan</label>
            <select name="f" id="txFolderSelect" required onchange="KasUI.updateCatatanDropdown(this.value)">
              ${folders.map(f => `
                <option value="${f.id}" ${f.id === tx.f ? 'selected' : ''}>${f.ic} ${f.n}</option>
              `).join("")}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Sub-Catatan / Kegiatan</label>
            <select name="c" id="txCatatanSelect" required>
              ${catatanList.map(c => `
                <option value="${c.id}" ${c.id === tx.c ? 'selected' : ''}>${c.t}</option>
              `).join("")}
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Keterangan / Uraian Transaksi</label>
          <input type="text" name="k" value="${this.escapeHTML(tx.k)}" required>
        </div>

        <div class="form-row" style="margin-bottom:14px;">
          <div class="form-group">
            <label class="form-label">Nominal Transaksi (Rp)</label>
            <input type="number" name="n" value="${tx.n}" min="1" step="1" required id="txNominalInput" oninput="KasUI.previewNominal(this.value)">
            <span class="form-help" id="txNominalHelp">${window.formatRupiah(tx.n)}</span>
          </div>
          <div class="form-group">
            <label class="form-label">Pihak / Sumber / Toko</label>
            <input type="text" name="s" value="${this.escapeHTML(tx.s || '')}" required>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="KasUI.closeModal()">Batal</button>
      <button type="submit" form="editTxForm" class="btn btn-primary">Simpan Perubahan</button>
    `;

    this.showModal("Sunting Transaksi", body, footer);
  },

  handleEditTransaction(e, id) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    window.store.updateTransaction(id, {
      d: formData.get("d"),
      t: formData.get("t"),
      f: formData.get("f"),
      c: formData.get("c"),
      k: formData.get("k"),
      n: formData.get("n"),
      s: formData.get("s")
    });

    this.showToast("Perubahan transaksi disimpan!");
    this.closeModal();
    this.render();
  },

  confirmDeleteTransaction(id) {
    if (confirm("Hapus transaksi ini dari buku kas?")) {
      window.store.deleteTransaction(id);
      this.showToast("Transaksi berhasil dihapus");
      this.render();
    }
  },

  // Modal: Sampaikan Usulan Warga
  openUsulModal() {
    const body = `
      <form id="usulForm" onsubmit="KasUI.handleSubmitUsulan(event)">
        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Judul Usulan / Aspirasi</label>
          <input type="text" name="j" placeholder="Contoh: Pengadaan Alat Fogging Nyamuk" required>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Nama Lengkap & No. Rumah / Blok</label>
          <input type="text" name="o" placeholder="Contoh: Bpk. Santoso (Blok B-12)" required>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Rincian Usulan / Alasan Kebutuhan</label>
          <textarea name="q" placeholder="Jelaskan kebutuhan pengadaan atau ide kegiatan untuk kemaslahatan warga RT 01..." required></textarea>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="KasUI.closeModal()">Batal</button>
      <button type="submit" form="usulForm" class="btn btn-primary">Kirimkan Usulan</button>
    `;

    this.showModal("💡 Sampaikan Usulan & Aspirasi Warga", body, footer);
  },

  handleSubmitUsulan(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    window.store.addUsulan({
      j: formData.get("j"),
      o: formData.get("o"),
      q: formData.get("q")
    });

    this.showToast("Usulan berhasil dikirim! Pengurus akan meninjau.");
    this.closeModal();
    this.navigateTo("usul");
  },

  // Modal: Tambah Folder Kegiatan
  openAddFolderModal() {
    const body = `
      <form id="addFolderForm" onsubmit="KasUI.handleAddFolder(event)">
        <div class="form-row" style="margin-bottom:14px;">
          <div class="form-group">
            <label class="form-label">Nama Kegiatan / Bidang</label>
            <input type="text" name="n" placeholder="Contoh: Bazar Ramadhan" required>
          </div>
          <div class="form-group">
            <label class="form-label">Ikon / Emoji</label>
            <input type="text" name="ic" placeholder="🎪" value="📁" required style="width:70px;">
          </div>
        </div>

        <div class="form-row" style="margin-bottom:14px;">
          <div class="form-group">
            <label class="form-label">Penanggung Jawab (PIC)</label>
            <input type="text" name="pic" placeholder="Contoh: Seksi Pemuda & Olahraga" required>
          </div>
          <div class="form-group">
            <label class="form-label">Pagu Anggaran Target (Rp)</label>
            <input type="number" name="pagu" placeholder="2000000" min="0">
          </div>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Deskripsi Singkat</label>
          <input type="text" name="desc" placeholder="Tujuan kegiatan atau lingkup kerja...">
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="KasUI.closeModal()">Batal</button>
      <button type="submit" form="addFolderForm" class="btn btn-primary">Buat Folder Kegiatan</button>
    `;

    this.showModal("Tambah Folder Kegiatan Baru", body, footer);
  },

  handleAddFolder(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const newFolder = window.store.addFolder({
      n: formData.get("n"),
      ic: formData.get("ic"),
      pic: formData.get("pic"),
      pagu: formData.get("pagu"),
      desc: formData.get("desc")
    });

    this.showToast(`Folder "${newFolder.n}" berhasil dibuat!`);
    this.closeModal();
    this.navigateTo("arsip", { folderId: newFolder.id });
  },

  // Modal: Tambah Catatan Keuangan Baru
  openAddCatatanModal(folderId) {
    const folder = window.store.getFolder(folderId);
    if (!folder) return;

    const body = `
      <form id="addCatForm" onsubmit="KasUI.handleAddCatatan(event, '${folderId}')">
        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Judul Catatan Keuangan</label>
          <input type="text" name="t" placeholder="Contoh: Pengeluaran Tahap I" required>
        </div>

        <div class="form-row" style="margin-bottom:14px;">
          <div class="form-group">
            <label class="form-label">Periode</label>
            <input type="text" name="p" placeholder="Contoh: Mei 2026" required value="${new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}">
          </div>
          <div class="form-group">
            <label class="form-label">Status Awal</label>
            <select name="s">
              <option value="Draf">✎ Draf (Dapat Diedit)</option>
              <option value="Final">🔒 Final (Terkunci)</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Keterangan / Catatan Tambahan</label>
          <input type="text" name="desc" placeholder="Rincian sub-program atau pertanggungjawaban...">
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="KasUI.closeModal()">Batal</button>
      <button type="submit" form="addCatForm" class="btn btn-primary">Buat Catatan</button>
    `;

    this.showModal(`Tambah Catatan Keuangan: ${folder.n}`, body, footer);
  },

  handleAddCatatan(e, folderId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const newCat = window.store.addCatatan({
      f: folderId,
      t: formData.get("t"),
      p: formData.get("p"),
      s: formData.get("s"),
      desc: formData.get("desc")
    });

    this.showToast(`Catatan "${newCat.t}" dibuat!`);
    this.closeModal();
    this.navigateTo("arsip", { folderId: folderId, catatanId: newCat.id });
  },

  // Modal: Upload Bukti Dokumen
  openUploadBuktiModal(folderId) {
    const folder = window.store.getFolder(folderId);
    if (!folder) return;

    const body = `
      <form id="uploadBuktiForm" onsubmit="KasUI.handleUploadBukti(event, '${folderId}')">
        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Nama Berkas Kwitansi / Laporan</label>
          <input type="text" name="n" placeholder="Contoh: Nota Pembelian Cat Toko Sumber Makmur.jpg" required>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Pilih Dokumen / Foto Bukti (JPG, PNG, PDF)</label>
          <input type="file" id="buktiFileInput" accept="image/*,application/pdf" style="padding:8px 0; height:auto;">
          <span class="form-help">Mendukung berkas tanda terima, kwitansi toko, atau berkas laporan PDF.</span>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="KasUI.closeModal()">Batal</button>
      <button type="submit" form="uploadBuktiForm" class="btn btn-primary">Simpan Berkas</button>
    `;

    this.showModal(`Unggah Bukti Fisik: ${folder.n}`, body, footer);
  },

  handleUploadBukti(e, folderId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const fileInput = document.getElementById("buktiFileInput");
    let fileName = formData.get("n");
    let size = "850 KB";

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (!fileName.includes(".")) {
        fileName += file.name.slice(file.name.lastIndexOf("."));
      }
      size = (file.size / 1024 > 1024) 
        ? (file.size / (1024 * 1024)).toFixed(1) + " MB" 
        : Math.round(file.size / 1024) + " KB";
    }

    window.store.addBukti({
      f: folderId,
      n: fileName,
      size: size
    });

    this.showToast("Bukti dokumen berhasil diunggah ke arsip!");
    this.closeModal();
    this.render();
  },

  // Modal: Edit Pagu Anggaran
  openEditPaguModal(folderId) {
    const f = window.store.getFolder(folderId);
    if (!f) return;

    const body = `
      <form id="editPaguForm" onsubmit="KasUI.handleEditPagu(event, '${folderId}')">
        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Kegiatan</label>
          <input type="text" value="${f.ic} ${f.n}" disabled style="background:var(--surface-alt);">
        </div>
        <div class="form-group" style="margin-bottom:14px;">
          <label class="form-label">Pagu Anggaran Disetujui (Rp)</label>
          <input type="number" name="pagu" value="${f.pagu}" required min="0" step="50000">
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="KasUI.closeModal()">Batal</button>
      <button type="submit" form="editPaguForm" class="btn btn-primary">Simpan Pagu</button>
    `;

    this.showModal(`Sunting Pagu: ${f.n}`, body, footer);
  },

  handleEditPagu(e, folderId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    window.store.updateFolder(folderId, {
      pagu: formData.get("pagu")
    });
    this.showToast("Pagu anggaran berhasil diperbarui!");
    this.closeModal();
    this.render();
  },

  // Modal: Spreadsheet Batch Input (Multi-Baris untuk satu kegiatan yang sama)
  openSpreadsheetModal(defaultFolderId = null) {
    if (!this.isAdmin()) {
      this.openAuthModal();
      return;
    }

    const folders = window.store.getFolders();
    const today = new Date().toISOString().split("T")[0];
    const initialFolder = defaultFolderId || (folders[0] ? folders[0].id : "");

    this.spRowsData = [
      { date: today, type: "i", keterangan: "", nominal: "", sumber: "" },
      { date: today, type: "i", keterangan: "", nominal: "", sumber: "" },
      { date: today, type: "i", keterangan: "", nominal: "", sumber: "" }
    ];

    const body = `
      <div style="margin-bottom:14px;">
        <p style="font-size:13px; color:var(--text-muted); margin:0 0 12px; line-height:1.5;">
          Pilih satu kegiatan di bawah, lalu masukkan banyak transaksi secara bersamaan tanpa perlu upload satu per satu.
        </p>

        <!-- Header Defaults -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; background:var(--primary-subtle); padding:12px 14px; border-radius:10px; margin-bottom:14px; border:1px solid var(--border-color);">
          <div>
            <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px; color:var(--text-main);">Kegiatan / Folder Kas:</label>
            <select id="spFolderSelect" style="width:100%; height:36px; font-size:13px; background:var(--card-bg); border:1px solid var(--border-color); border-radius:6px; padding:0 8px;">
              ${folders.map(f => `<option value="${f.id}" ${f.id === initialFolder ? "selected" : ""}>${this.escapeHTML(f.n)} (${f.pic})</option>`).join("")}
            </select>
          </div>
          <div>
            <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px; color:var(--text-main);">Tanggal Bawaan:</label>
            <input type="date" id="spDefaultDate" value="${today}" style="width:100%; height:36px; font-size:13px; background:var(--card-bg); border:1px solid var(--border-color); border-radius:6px; padding:0 8px;" onchange="KasUI.applyDefaultDateToRows(this.value)">
          </div>
          <div>
            <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px; color:var(--text-main);">Jenis Arus Kas Bawaan:</label>
            <select id="spDefaultType" style="width:100%; height:36px; font-size:13px; background:var(--card-bg); border:1px solid var(--border-color); border-radius:6px; padding:0 8px;" onchange="KasUI.applyDefaultTypeToRows(this.value)">
              <option value="i">📈 Uang Masuk (Penerimaan)</option>
              <option value="o">📉 Uang Keluar (Pengeluaran)</option>
            </select>
          </div>
        </div>

        <!-- Quick Excel Paste toggle -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:13px; font-weight:700; color:var(--text-main);">Daftar Baris Input:</span>
          <button type="button" class="btn btn-secondary btn-sm" onclick="KasUI.toggleExcelPasteBox()">
            <svg class="feather-icon" style="width:14px; height:14px; margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
            Tempel dari Excel / Teks
          </button>
        </div>

        <!-- Excel Paste Box -->
        <div id="excelPasteBox" style="display:none; background:var(--card-bg); border:1px dashed var(--primary); border-radius:8px; padding:12px; margin-bottom:12px;">
          <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--primary);">Salin beberapa baris dari Excel/Sheets dan tempel di sini (Kolom: Keterangan - Nominal - Pihak):</label>
          <textarea id="excelPasteArea" placeholder="Contoh:&#10;Iuran Bpk Joko RT 01&#9;30000&#9;Joko (Blok A-1)&#10;Iuran Ibu Maya RT 01&#9;30000&#9;Maya (Blok A-2)" style="width:100%; height:75px; font-size:12px; font-family:monospace; padding:8px; border:1px solid var(--border-color); border-radius:6px; outline:none; background:var(--bg-main);"></textarea>
          <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:6px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="KasUI.toggleExcelPasteBox()">Batal</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="KasUI.parseAndAppendExcelPaste()">Masukkan ke Tabel</button>
          </div>
        </div>

        <!-- Grid Container -->
        <div style="max-height:42vh; overflow-y:auto; border:1px solid var(--border-color); border-radius:8px; margin-bottom:12px; background:var(--card-bg);">
          <table style="width:100%; border-collapse:collapse; font-size:13px;" id="spGridTable">
            <thead style="position:sticky; top:0; background:var(--bg-main); z-index:2; border-bottom:1px solid var(--border-color);">
              <tr>
                <th style="width:36px; text-align:center; padding:8px 4px;">#</th>
                <th style="width:130px; padding:8px;">Tanggal</th>
                <th style="width:100px; padding:8px;">Jenis</th>
                <th style="padding:8px;">Uraian / Keterangan Transaksi</th>
                <th style="width:140px; padding:8px; text-align:right;">Nominal (Rp)</th>
                <th style="width:150px; padding:8px;">Pihak / Warga</th>
                <th style="width:36px; text-align:center; padding:8px 4px;"></th>
              </tr>
            </thead>
            <tbody id="spTableBody">
              <!-- Rendered by JS -->
            </tbody>
          </table>
        </div>

        <!-- Row Controls and Summary -->
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-top:8px;">
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="KasUI.addSpRows(1)">+ 1 Baris</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="KasUI.addSpRows(5)">+ 5 Baris</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="KasUI.clearEmptySpRows()" style="color:var(--text-muted);">Hapus Baris Kosong</button>
          </div>

          <div style="display:flex; align-items:center; gap:12px; font-size:13px; background:var(--card-bg); border:1px solid var(--border-color); padding:6px 12px; border-radius:6px;">
            <span>Baris: <b id="spCount">0</b></span>
            <span>Masuk: <b style="color:var(--success);" id="spTotalMasuk">Rp 0</b></span>
            <span>Keluar: <b style="color:var(--danger);" id="spTotalKeluar">Rp 0</b></span>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="KasUI.closeModal()">Batal</button>
      <button type="button" class="btn btn-primary" onclick="KasUI.saveSpreadsheetBatch()" id="btnSaveBatch">
        💾 Simpan Transaksi
      </button>
    `;

    this.showModal("⚡ Input Transaksi Cepat (Mode Spreadsheet)", body, footer, true);
    this.renderSpTable();
  },

  renderSpTable() {
    const tbody = document.getElementById("spTableBody");
    if (!tbody || !this.spRowsData) return;

    tbody.innerHTML = this.spRowsData.map((row, idx) => `
      <tr style="border-bottom:1px solid var(--border-color);">
        <td style="text-align:center; color:var(--text-muted); font-size:12px; font-weight:600;">${idx + 1}</td>
        <td>
          <input type="date" value="${row.date}" onchange="KasUI.updateSpRow(${idx}, 'date', this.value)" style="width:100%; height:32px; font-size:12px; padding:2px 6px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-main);">
        </td>
        <td>
          <select onchange="KasUI.updateSpRow(${idx}, 'type', this.value)" style="width:100%; height:32px; font-size:12px; padding:2px 4px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-main);">
            <option value="i" ${row.type === "i" ? "selected" : ""}>Masuk</option>
            <option value="o" ${row.type === "o" ? "selected" : ""}>Keluar</option>
          </select>
        </td>
        <td>
          <input type="text" placeholder="Contoh: Iuran kas warga..." value="${this.escapeHTML(row.keterangan)}" oninput="KasUI.updateSpRow(${idx}, 'keterangan', this.value)" onkeydown="KasUI.handleSpKeyDown(event, ${idx})" style="width:100%; height:32px; font-size:12.5px; padding:2px 8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-main);">
        </td>
        <td>
          <input type="number" placeholder="0" min="0" value="${row.nominal}" oninput="KasUI.updateSpRow(${idx}, 'nominal', this.value)" style="width:100%; height:32px; font-size:12.5px; text-align:right; padding:2px 8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-main);">
        </td>
        <td>
          <input type="text" placeholder="Nama warga / pihak..." value="${this.escapeHTML(row.sumber)}" oninput="KasUI.updateSpRow(${idx}, 'sumber', this.value)" onkeydown="KasUI.handleSpKeyDown(event, ${idx})" style="width:100%; height:32px; font-size:12.5px; padding:2px 8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-main);">
        </td>
        <td style="text-align:center;">
          <button type="button" onclick="KasUI.removeSpRow(${idx})" style="border:0; background:none; color:var(--danger); cursor:pointer; font-size:18px; font-weight:700; line-height:1;">&times;</button>
        </td>
      </tr>
    `).join("");

    this.calcSpTotals();
  },

  addSpRows(count = 1) {
    if (!this.spRowsData) this.spRowsData = [];
    const defDate = document.getElementById("spDefaultDate") ? document.getElementById("spDefaultDate").value : new Date().toISOString().split("T")[0];
    const defType = document.getElementById("spDefaultType") ? document.getElementById("spDefaultType").value : "i";

    for (let i = 0; i < count; i++) {
      this.spRowsData.push({
        date: defDate,
        type: defType,
        keterangan: "",
        nominal: "",
        sumber: ""
      });
    }
    this.renderSpTable();
  },

  updateSpRow(idx, field, value) {
    if (this.spRowsData && this.spRowsData[idx]) {
      this.spRowsData[idx][field] = value;
      this.calcSpTotals();
    }
  },

  removeSpRow(idx) {
    if (!this.spRowsData) return;
    this.spRowsData.splice(idx, 1);
    if (this.spRowsData.length === 0) {
      this.addSpRows(1);
    } else {
      this.renderSpTable();
    }
  },

  clearEmptySpRows() {
    if (!this.spRowsData) return;
    this.spRowsData = this.spRowsData.filter(r => r.keterangan.trim() !== "" || Number(r.nominal) > 0);
    if (this.spRowsData.length === 0) this.addSpRows(1);
    this.renderSpTable();
  },

  handleSpKeyDown(e, idx) {
    if (e.key === "Enter" && idx === this.spRowsData.length - 1) {
      e.preventDefault();
      this.addSpRows(1);
      setTimeout(() => {
        const rows = document.querySelectorAll("#spTableBody tr");
        if (rows.length) {
          const inputs = rows[rows.length - 1].querySelectorAll("input[type='text']");
          if (inputs.length) inputs[0].focus();
        }
      }, 30);
    }
  },

  calcSpTotals() {
    if (!this.spRowsData) return;
    let masuk = 0;
    let keluar = 0;
    let filledCount = 0;

    for (const r of this.spRowsData) {
      const nom = Math.abs(Number(r.nominal) || 0);
      if (r.keterangan.trim() !== "" || nom > 0) {
        filledCount++;
        if (r.type === "i") masuk += nom;
        else keluar += nom;
      }
    }

    const countEl = document.getElementById("spCount");
    const masukEl = document.getElementById("spTotalMasuk");
    const keluarEl = document.getElementById("spTotalKeluar");
    const btnSave = document.getElementById("btnSaveBatch");

    if (countEl) countEl.textContent = `${filledCount} baris terisi`;
    if (masukEl) masukEl.textContent = this.formatCurrency(masuk);
    if (keluarEl) keluarEl.textContent = this.formatCurrency(keluar);
    if (btnSave) btnSave.textContent = `💾 Simpan (${filledCount}) Transaksi`;
  },

  applyDefaultDateToRows(newDate) {
    if (!this.spRowsData) return;
    for (const r of this.spRowsData) {
      r.date = newDate;
    }
    this.renderSpTable();
  },

  applyDefaultTypeToRows(newType) {
    if (!this.spRowsData) return;
    for (const r of this.spRowsData) {
      r.type = newType;
    }
    this.renderSpTable();
  },

  toggleExcelPasteBox() {
    const box = document.getElementById("excelPasteBox");
    if (!box) return;
    box.style.display = box.style.display === "none" ? "block" : "none";
    if (box.style.display === "block") {
      const ta = document.getElementById("excelPasteArea");
      if (ta) ta.focus();
    }
  },

  parseAndAppendExcelPaste() {
    const ta = document.getElementById("excelPasteArea");
    if (!ta) return;
    const text = ta.value.trim();
    if (!text) return;

    const lines = text.split(/\r?\n/);
    const defDate = document.getElementById("spDefaultDate") ? document.getElementById("spDefaultDate").value : new Date().toISOString().split("T")[0];
    const defType = document.getElementById("spDefaultType") ? document.getElementById("spDefaultType").value : "i";

    let added = 0;
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(/\t|,/);
      if (parts.length >= 2) {
        let date = defDate;
        let keterangan = "";
        let nominal = 0;
        let sumber = "";

        if (parts[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
          date = parts[0].trim();
          keterangan = parts[1] ? parts[1].trim() : "";
          nominal = parts[2] ? parts[2].replace(/[^0-9]/g, "") : "";
          sumber = parts[3] ? parts[3].trim() : "";
        } else {
          keterangan = parts[0].trim();
          nominal = parts[1] ? parts[1].replace(/[^0-9]/g, "") : "";
          sumber = parts[2] ? parts[2].trim() : "";
        }

        if (keterangan || nominal) {
          this.spRowsData.push({
            date: date,
            type: defType,
            keterangan: keterangan,
            nominal: nominal,
            sumber: sumber
          });
          added++;
        }
      }
    }

    ta.value = "";
    const box = document.getElementById("excelPasteBox");
    if (box) box.style.display = "none";
    this.renderSpTable();
    this.showToast(`Berhasil memasukkan ${added} baris dari Excel`);
  },

  saveSpreadsheetBatch() {
    const folderSelect = document.getElementById("spFolderSelect");
    if (!folderSelect) return;
    const folderId = folderSelect.value;
    const folder = window.store.getFolder(folderId) || { n: "Kegiatan RT", pic: "Pengurus RT" };

    const validRows = (this.spRowsData || []).filter(r => r.keterangan.trim() !== "" || Number(r.nominal) > 0);
    if (validRows.length === 0) {
      alert("Tidak ada baris transaksi yang terisi untuk disimpan.");
      return;
    }

    for (const r of validRows) {
      const nom = Math.abs(Number(r.nominal) || 0);
      window.store.addTransaction({
        d: r.date,
        t: r.type,
        f: folderId,
        c: folderId,
        k: r.keterangan.trim() || ("Transaksi " + folder.n),
        n: nom,
        s: r.sumber.trim() || folder.pic
      });
    }

    this.closeModal();
    this.showToast(`Sukses menyimpan ${validRows.length} transaksi ke: ${folder.n}`);
    this.render();
  },

  // Modal: Import XLSX per Kegiatan
  openImportXLSXModal(folderId) {
    if (!this.isAdmin()) {
      this.openAuthModal();
      return;
    }
    const folder = window.store.getFolder(folderId) || { id: folderId, n: "Kegiatan RT", pic: "Pengurus RT" };
    this.importTargetFolderId = folderId;
    this.parsedXlsxRows = [];

    const body = `
      <div style="font-size:13.5px; line-height:1.5; color:var(--text-muted); margin-bottom:14px;">
        Unggah berkas Excel (<strong>.xlsx</strong>) untuk memasukkan data kas kegiatan ini secara otomatis.
      </div>

      <div style="background:var(--primary-subtle); padding:12px 14px; border-radius:10px; margin-bottom:14px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <span style="font-size:12px; font-weight:700; color:var(--text-main); display:block;">Target Kegiatan / Folder:</span>
          <b style="font-size:14px; color:var(--primary);">${this.escapeHTML(folder.n)} (PIC: ${this.escapeHTML(folder.pic)})</b>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="KasExport.downloadFolderTemplateXLSX('${folder.id}')">
          <svg class="feather-icon" style="width:14px; height:14px; margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Unduh Template XLSX
        </button>
      </div>

      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">Pilih Berkas Excel (.xlsx / .xls)</label>
        <input type="file" id="xlsxImportInput" accept=".xlsx,.xls" onchange="KasUI.handleXLSXFileSelected(event)" style="width:100%; padding:8px; border:1px dashed var(--border-color); border-radius:8px; background:var(--card-bg);">
        <small style="color:var(--text-muted); display:block; margin-top:4px;">
          Format kolom: Tanggal, Jenis (Masuk/Keluar), Keterangan, Nominal, Pihak/Sumber.
        </small>
      </div>

      <div id="xlsxPreviewBox" style="display:none; margin-top:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:13px; font-weight:700;">Pratinjau Data Excel:</span>
          <div style="display:flex; gap:12px; font-size:12.5px;">
            <span>Baris: <b id="xlsxPrevCount">0</b></span>
            <span>Masuk: <b style="color:var(--success);" id="xlsxPrevMasuk">Rp 0</b></span>
            <span>Keluar: <b style="color:var(--danger);" id="xlsxPrevKeluar">Rp 0</b></span>
          </div>
        </div>
        <div style="max-height:220px; overflow-y:auto; border:1px solid var(--border-color); border-radius:8px; background:var(--card-bg);">
          <table style="width:100%; border-collapse:collapse; font-size:12.5px;">
            <thead style="position:sticky; top:0; background:var(--bg-main); z-index:2; border-bottom:1px solid var(--border-color);">
              <tr>
                <th style="padding:6px 8px; width:30px; text-align:center;">#</th>
                <th style="padding:6px 8px; width:95px;">Tanggal</th>
                <th style="padding:6px 8px; width:75px;">Jenis</th>
                <th style="padding:6px 8px;">Keterangan</th>
                <th style="padding:6px 8px; width:110px; text-align:right;">Nominal</th>
                <th style="padding:6px 8px; width:120px;">Pihak</th>
              </tr>
            </thead>
            <tbody id="xlsxPrevBody"></tbody>
          </table>
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="KasUI.closeModal()">Batal</button>
      <button type="button" class="btn btn-primary" id="btnConfirmXLSX" onclick="KasUI.confirmImportXLSX()" disabled>
        💾 Simpan Transaksi ke Kegiatan
      </button>
    `;

    this.showModal(`📥 Impor Data Laporan: ${folder.n}`, body, footer, true);
  },

  handleXLSXFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        this.parsedXlsxRows = KasExport.parseXLSXBuffer(evt.target.result);
        if (!this.parsedXlsxRows || this.parsedXlsxRows.length === 0) {
          alert("Tidak ditemukan baris transaksi yang valid dalam file Excel.");
          return;
        }

        let masuk = 0;
        let keluar = 0;
        this.parsedXlsxRows.forEach(r => {
          if (r.t === "i") masuk += r.n;
          else keluar += r.n;
        });

        document.getElementById("xlsxPrevCount").textContent = `${this.parsedXlsxRows.length} baris`;
        document.getElementById("xlsxPrevMasuk").textContent = this.formatCurrency(masuk);
        document.getElementById("xlsxPrevKeluar").textContent = this.formatCurrency(keluar);

        const tbody = document.getElementById("xlsxPrevBody");
        tbody.innerHTML = this.parsedXlsxRows.slice(0, 50).map((r, i) => `
          <tr style="border-bottom:1px solid var(--border-color);">
            <td style="padding:5px 8px; text-align:center; color:var(--text-muted);">${i + 1}</td>
            <td style="padding:5px 8px;">${r.d}</td>
            <td style="padding:5px 8px;">
              <span class="badge ${r.t === 'i' ? 'badge-in' : 'badge-out'}" style="font-size:11px; padding:1px 6px;">
                ${r.t === 'i' ? 'Masuk' : 'Keluar'}
              </span>
            </td>
            <td style="padding:5px 8px;">${this.escapeHTML(r.k)}</td>
            <td style="padding:5px 8px; text-align:right; font-weight:600;" class="${r.t === 'i' ? 'text-in' : 'text-out'}">
              ${this.formatCurrency(r.n)}
            </td>
            <td style="padding:5px 8px; color:var(--text-muted);">${this.escapeHTML(r.s || '-')}</td>
          </tr>
        `).join("");

        document.getElementById("xlsxPreviewBox").style.display = "block";
        const btn = document.getElementById("btnConfirmXLSX");
        btn.disabled = false;
        btn.textContent = `💾 Simpan (${this.parsedXlsxRows.length}) Transaksi ke Kegiatan`;
      } catch (err) {
        alert("Gagal membaca file Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  },

  confirmImportXLSX() {
    if (!this.importTargetFolderId || !this.parsedXlsxRows || this.parsedXlsxRows.length === 0) return;
    const folder = window.store.getFolder(this.importTargetFolderId) || { n: "Kegiatan RT", pic: "Pengurus RT" };

    for (const r of this.parsedXlsxRows) {
      window.store.addTransaction({
        d: r.d,
        t: r.t,
        f: this.importTargetFolderId,
        c: this.importTargetFolderId,
        k: r.k,
        n: r.n,
        s: r.s || folder.pic
      });
    }

    this.closeModal();
    this.showToast(`Berhasil mengimpor ${this.parsedXlsxRows.length} transaksi ke: ${folder.n}`);
    this.render();
  },

  // Modal: Import CSV
  openImportModal() {
    const body = `
      <div style="font-size:13.5px; line-height:1.5; color:var(--text-muted); margin-bottom:14px;">
        Pilih berkas CSV dari komputer Anda atau tempelkan teks CSV langsung di bawah:
      </div>
      <div class="form-group" style="margin-bottom:14px;">
        <label class="form-label">Berkas CSV</label>
        <input type="file" id="csvFileInput" accept=".csv,text/csv" onchange="KasUI.handleCSVFileSelected(event)">
      </div>
      <div class="form-group">
        <label class="form-label">Atau Tempel Teks CSV</label>
        <textarea id="csvTextInput" placeholder="Tanggal,Tipe,Kode Folder,Keterangan,Nominal,Pihak\n2026-03-01,i,iur,Iuran kas 60 KK,1800000,Warga RT 01"></textarea>
      </div>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" onclick="KasUI.closeModal()">Batal</button>
      <button type="button" class="btn btn-primary" onclick="KasUI.processCSVImport()">Mulai Impor</button>
    `;

    this.showModal("📥 Impor Transaksi CSV", body, footer);
  },

  handleCSVFileSelected(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = evt => {
        document.getElementById("csvTextInput").value = evt.target.result;
      };
      reader.readAsText(file);
    }
  },

  processCSVImport() {
    const text = document.getElementById("csvTextInput").value;
    try {
      const count = KasExport.parseAndImportCSV(text);
      this.showToast(`Berhasil mengimpor ${count} transaksi!`);
      this.closeModal();
      this.render();
    } catch (err) {
      alert("Gagal mengimpor: " + err.message);
    }
  },

  // Modal: Alur & SOP Kas RT
  openAlurRTModal() {
    const body = `
      <div style="display:flex; flex-direction:column; gap:16px; font-size:13.5px; line-height:1.6;">
        <div style="padding:14px; background:var(--primary-light); border-left:4px solid var(--primary); border-radius:var(--radius-sm);">
          <strong style="color:var(--primary); font-size:15px;">Prinsip Transparansi Kas RT 01 / RW 02</strong><br>
          "Setiap rupiah dari warga, dicatat untuk warga, dan dapat diaudit oleh warga."
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <div style="padding:14px; background:var(--surface-alt); border-radius:var(--radius-md); border:1px solid var(--border);">
            <div style="font-size:22px; margin-bottom:6px;">1️⃣ Pengumpulan Iuran</div>
            <p style="color:var(--text-muted); font-size:12.5px;">
              Bendahara mencatat iuran bulanan warga per KK ke dalam sistem dan menyetor ke rekening/kas fisik RT.
            </p>
          </div>

          <div style="padding:14px; background:var(--surface-alt); border-radius:var(--radius-md); border:1px solid var(--border);">
            <div style="font-size:22px; margin-bottom:6px;">2️⃣ Alokasi Kegiatan</div>
            <p style="color:var(--text-muted); font-size:12.5px;">
              Pengeluaran disesuaikan dengan pagu kegiatan (wisata, kebersihan, ronda, fasilitas).
            </p>
          </div>

          <div style="padding:14px; background:var(--surface-alt); border-radius:var(--radius-md); border:1px solid var(--border);">
            <div style="font-size:22px; margin-bottom:6px;">3️⃣ Verifikasi Kwitansi</div>
            <p style="color:var(--text-muted); font-size:12.5px;">
              Setiap uang keluar wajib melampirkan nota/kwitansi sah yang diunggah ke arsip digital.
            </p>
          </div>

          <div style="padding:14px; background:var(--surface-alt); border-radius:var(--radius-md); border:1px solid var(--border);">
            <div style="font-size:22px; margin-bottom:6px;">4️⃣ Musyawarah Warga</div>
            <p style="color:var(--text-muted); font-size:12.5px;">
              Laporan dicetak dan dipresentasikan pada rapat RT bulanan secara terbuka.
            </p>
          </div>
        </div>
      </div>
    `;

    this.showModal("📖 Alur & Standar Transparansi Kas RT", body, `<button class="btn btn-primary" onclick="KasUI.closeModal()">Tutup</button>`, true);
  },

  // Helper Sanitizer
  escapeHTML(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};

window.KasUI = KasUI;
