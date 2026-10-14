/**
 * Modul Ekspor, Impor, dan Cetak Laporan
 * Kas RT 01 / RW 02 Desa Sladi
 */
const KasExport = {
  // Download file helper dengan penanganan aman untuk browser (delay revoke untuk cegah Edge drop filename)
  downloadBlob(content, filename, mimeType = "text/csv;charset=utf-8;") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.style.display = "none";
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 2000);
  },

  // Helper: Unduh Workbook Excel dengan Ekstensi .xlsx & MIME Valid (Cegah nama file acak UUID dan cegah pembukaan paksa Office Viewer di browser)
  saveXLSXWorkbook(wb, filename) {
    if (!filename.toLowerCase().endsWith(".xlsx")) {
      filename += ".xlsx";
    }
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8"
    });

    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, filename);
      return;
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.setAttribute("download", filename);
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      if (a.parentNode) {
        document.body.removeChild(a);
      }
      window.URL.revokeObjectURL(url);
    }, 2000);
  },

  // Export transactions to CSV
  exportTransactionsToCSV(filter = {}, customFilename = null) {
    const list = window.store.getTransactions(filter);
    const settings = window.store.getSettings();
    const rtName = `RT_${settings.rt}_RW_${settings.rw}`;
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = customFilename || `Kas_${rtName}_${dateStr}.csv`;

    const headers = ["ID", "Tanggal", "Tipe", "Folder Kegiatan", "Catatan/Sub", "Keterangan", "Nominal (Rp)", "Pihak/Sumber"];
    
    const rows = list.map(t => {
      const typeStr = t.t === "i" ? "Pemasukan (Masuk)" : "Pengeluaran (Keluar)";
      const folderName = window.store.getFolderName(t.f);
      const catatanName = window.store.getCatatanTitle(t.c);
      const safeKeterangan = `"${(t.k || "").replace(/"/g, '""')}"`;
      const safePihak = `"${(t.s || "").replace(/"/g, '""')}"`;
      return [
        t.id,
        t.d,
        `"${typeStr}"`,
        `"${folderName}"`,
        `"${catatanName}"`,
        safeKeterangan,
        t.n,
        safePihak
      ].join(",");
    });

    // Add summary row at bottom
    const totals = window.store.calcTotals(list);
    rows.push("");
    rows.push(`"TOTAL PEMASUKAN",,,,,,"${totals.masuk}",`);
    rows.push(`"TOTAL PENGELUARAN",,,,,,"${totals.keluar}",`);
    rows.push(`"SALDO AKHIR",,,,,,"${totals.saldo}",`);

    // Prepend UTF-8 BOM so Excel opens with proper Indonesian accented characters
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    this.downloadBlob(csvContent, filename);
  },

  // Export Rekap per Kegiatan to CSV
  exportRekapKegiatanToCSV() {
    const settings = window.store.getSettings();
    const rtName = `RT_${settings.rt}_RW_${settings.rw}`;
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Rekap_Kegiatan_${rtName}_${dateStr}.csv`;

    const headers = ["Kode", "Nama Kegiatan / Folder", "Penanggung Jawab (PIC)", "Pagu Anggaran (Rp)", "Total Masuk (Rp)", "Total Keluar (Rp)", "Saldo (Rp)", "Persentase Realisasi (%)"];
    
    const folders = window.store.getFolders();
    const rows = folders.map(f => {
      const tot = window.store.calcFolderTotals(f.id);
      const persen = f.pagu ? Math.round((tot.keluar / f.pagu) * 100) : 0;
      return [
        f.id,
        `"${f.n.replace(/"/g, '""')}"`,
        `"${(f.pic || "").replace(/"/g, '""')}"`,
        f.pagu || 0,
        tot.masuk,
        tot.keluar,
        tot.saldo,
        `${persen}%`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    this.downloadBlob(csvContent, filename);
  },

  // Export full JSON backup
  exportBackupJSON() {
    const data = window.store.data;
    const jsonStr = JSON.stringify(data, null, 2);
    const dateStr = new Date().toISOString().split("T")[0];
    this.downloadBlob(jsonStr, `Backup_KasRT_${dateStr}.json`, "application/json");
  },

  // Download CSV Template for Import - Bersih Tanpa Data Dummy
  downloadCSVTemplate() {
    const templateContent = 
`\uFEFFTanggal,Tipe (i=Masuk / o=Keluar),Kode Folder,Keterangan,Nominal,Pihak atau Sumber
,,,,,
,,,,,
# Petunjuk Pengisian:
# 1. Kolom Tanggal: format YYYY-MM-DD (contoh: 2026-10-05)
# 2. Kolom Tipe: isi 'i' (Uang Masuk) atau 'o' (Uang Keluar)
# 3. Kolom Nominal: isi angka tanpa tanda titik/koma (contoh: 50000)
# Kode Folder yang tersedia:
# - iur: Iuran Warga Bulanan
# - lib: Liburan & Wisata
# - kar: Karnaval HUT RI
# - pem: Pembangunan Fasilitas
# - sos: Kegiatan Sosial & Duka
# - ops: Operasional & ATK RT
# - keb: Kebersihan & Keamanan`;

    this.downloadBlob(templateContent, "Template_Import_KasRT.csv");
  },

  // Import CSV text
  parseAndImportCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() && !line.startsWith("#"));
    if (lines.length < 2) {
      throw new Error("File CSV kosong atau tidak memiliki baris data.");
    }

    let successCount = 0;
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple CSV splitting with quotes
      const cols = [];
      let inQuotes = false;
      let buffer = "";
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cols.push(buffer.trim().replace(/^"|"$/g, ''));
          buffer = "";
        } else {
          buffer += char;
        }
      }
      cols.push(buffer.trim().replace(/^"|"$/g, ''));

      if (cols.length >= 5) {
        const [d, t, f, k, n, s] = cols;
        const validT = (t.toLowerCase() === "i" || t.toLowerCase().includes("masuk")) ? "i" : "o";
        const nominal = Number(n.replace(/[^0-9]/g, ''));
        
        if (d && nominal > 0 && k) {
          window.store.addTransaction({
            d,
            t: validT,
            f: f || "ops",
            c: f || "ops",
            k,
            n: nominal,
            s: s || "Umum"
          });
          successCount++;
        }
      }
    }
    return successCount;
  },

  // Print view handler
  printReport() {
    window.print();
  },

  // Export specific activity/folder to XLSX
  exportFolderToXLSX(folderId) {
    if (typeof XLSX === "undefined") {
      alert("Modul Excel (SheetJS) belum termuat.");
      return;
    }
    const folder = window.store.getFolder(folderId) || { id: folderId, n: "Kegiatan RT", pic: "Pengurus RT", pagu: 0 };
    const txs = window.store.getTransactions({ folder: folderId });
    const tot = window.store.calcFolderTotals(folderId);
    const dateStr = new Date().toISOString().split("T")[0];

    const wb = XLSX.utils.book_new();

    const wsData = [
      ["LAPORAN KAS RT 01 / RW 02 DESA SLADI"],
      [`Nama Kegiatan / Folder: ${folder.n}`],
      [`Penanggung Jawab (PIC): ${folder.pic}`],
      [`Pagu Anggaran: Rp ${(folder.pagu || 0).toLocaleString("id-ID")}`],
      [`Tanggal Ekspor: ${dateStr}`],
      [`Total Masuk: Rp ${tot.masuk.toLocaleString("id-ID")}   |   Total Keluar: Rp ${tot.keluar.toLocaleString("id-ID")}   |   Saldo: Rp ${tot.saldo.toLocaleString("id-ID")}`],
      [],
      ["No", "Tanggal", "Jenis", "Keterangan Transaksi", "Nominal (Rp)", "Pihak / Warga / Sumber"]
    ];

    txs.forEach((t, i) => {
      wsData.push([
        i + 1,
        t.d,
        t.t === "i" ? "Masuk" : "Keluar",
        t.k,
        t.n,
        t.s || "-"
      ]);
    });

    wsData.push([]);
    wsData.push(["", "", "", "TOTAL UANG MASUK", tot.masuk, ""]);
    wsData.push(["", "", "", "TOTAL UANG KELUAR", tot.keluar, ""]);
    wsData.push(["", "", "", "SALDO KEGIATAN", tot.saldo, ""]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 12 },
      { wch: 38 },
      { wch: 18 },
      { wch: 24 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Laporan Kas");
    const cleanName = folder.n.replace(/[^a-zA-Z0-9_\-]/g, "_");
    this.saveXLSXWorkbook(wb, `Laporan_${cleanName}_${dateStr}.xlsx`);
  },

  // Download blank XLSX template for activity - Bersih Tanpa Data Dummy
  downloadFolderTemplateXLSX(folderId) {
    if (typeof XLSX === "undefined") {
      alert("Modul Excel (SheetJS) belum termuat.");
      return;
    }
    const folder = window.store.getFolder(folderId) || { n: "Kegiatan RT" };
    const wb = XLSX.utils.book_new();

    const wsData = [
      ["Tanggal", "Jenis", "Keterangan Transaksi", "Nominal", "Pihak / Warga / Sumber"],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      [],
      ["# PETUNJUK PENGISIAN:", "", "", "", ""],
      ["# 1. Kolom Tanggal: format YYYY-MM-DD atau DD/MM/YYYY (contoh: 2026-10-05)", "", "", "", ""],
      ["# 2. Kolom Jenis: isi 'Masuk' (penerimaan) atau 'Keluar' (pengeluaran)", "", "", "", ""],
      ["# 3. Kolom Nominal: isi angka tanpa tanda titik atau koma (contoh: 50000)", "", "", "", ""]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 38 },
      { wch: 16 },
      { wch: 25 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Template Import");
    const cleanName = folder.n.replace(/[^a-zA-Z0-9_\-]/g, "_");
    this.saveXLSXWorkbook(wb, `Template_Import_${cleanName}.xlsx`);
  },

  // Parse XLSX ArrayBuffer into structured transaction rows
  parseXLSXBuffer(arrayBuffer) {
    if (typeof XLSX === "undefined") {
      throw new Error("Modul SheetJS belum dimuat.");
    }
    const data = new Uint8Array(arrayBuffer);
    const wb = XLSX.read(data, { type: "array", cellDates: true });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) throw new Error("File Excel tidak memiliki lembar kerja.");

    const ws = wb.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (!rawRows || rawRows.length === 0) throw new Error("Lembar kerja Excel kosong.");

    let headerIdx = -1;
    let colMap = { date: -1, type: -1, ket: -1, nom: -1, src: -1 };

    for (let r = 0; r < Math.min(15, rawRows.length); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      row.forEach((cell, c) => {
        const str = String(cell || "").toLowerCase().trim();
        if (str.includes("tanggal") || str === "tgl" || str === "date") colMap.date = c;
        else if (str.includes("jenis") || str.includes("tipe") || str === "type" || str === "arus") colMap.type = c;
        else if (str.includes("keterangan") || str.includes("uraian") || str.includes("deskripsi")) colMap.ket = c;
        else if (str.includes("nominal") || str.includes("jumlah") || str.includes("nilai") || str.includes("rp") || str === "amount") colMap.nom = c;
        else if (str.includes("pihak") || str.includes("warga") || str.includes("sumber") || str.includes("nama") || str === "pic") colMap.src = c;
      });

      if (colMap.ket !== -1 && colMap.nom !== -1) {
        headerIdx = r;
        break;
      }
    }

    if (headerIdx === -1) {
      headerIdx = 0;
      colMap = { date: 0, type: 1, ket: 2, nom: 3, src: 4 };
    }

    const result = [];
    for (let r = headerIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const firstCell = String(row[0] || "").trim();
      if (firstCell.startsWith("#") || firstCell.toLowerCase().includes("total") || firstCell.toLowerCase().includes("petunjuk")) {
        continue;
      }

      const rawDate = colMap.date !== -1 ? row[colMap.date] : "";
      const rawType = colMap.type !== -1 ? row[colMap.type] : "";
      const rawKet = colMap.ket !== -1 ? row[colMap.ket] : "";
      const rawNom = colMap.nom !== -1 ? row[colMap.nom] : "";
      const rawSrc = colMap.src !== -1 ? row[colMap.src] : "";

      const ket = String(rawKet || "").trim();
      let nom = 0;
      if (typeof rawNom === "number") nom = Math.abs(rawNom);
      else nom = Number(String(rawNom || "").replace(/[^0-9]/g, "")) || 0;

      let date = new Date().toISOString().split("T")[0];
      if (rawDate instanceof Date && !isNaN(rawDate)) {
        date = rawDate.toISOString().split("T")[0];
      } else if (typeof rawDate === "number") {
        const dInfo = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        if (!isNaN(dInfo.getTime())) date = dInfo.toISOString().split("T")[0];
      } else {
        const s = String(rawDate || "").trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) date = s;
        else {
          const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (m) date = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
        }
      }

      const typeStr = String(rawType || "").toLowerCase().trim();
      const type = (typeStr.includes("keluar") || typeStr.includes("pengeluaran") || typeStr === "o" || typeStr === "out" || typeStr === "debit") ? "o" : "i";
      const src = String(rawSrc || "").trim();

      if (ket || nom > 0) {
        result.push({
          d: date,
          t: type,
          k: ket || "Transaksi Kegiatan",
          n: nom,
          s: src
        });
      }
    }

    return result;
  }
};

window.KasExport = KasExport;
