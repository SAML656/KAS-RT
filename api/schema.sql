-- Kas RT 01 / RW 02 Desa Sladi - Skema Database (MySQL / MariaDB, XAMPP + phpMyAdmin + Hosting)
-- Bisa diimpor manual lewat phpMyAdmin, atau otomatis lewat: php api/install.php


-- Pengurus yang boleh masuk mode admin (email disimpan sebagai hash SHA-256, bukan teks asli)
CREATE TABLE IF NOT EXISTS `admins` (
  `email_hash` CHAR(64) NOT NULL,
  `password_hash` VARCHAR(255) NULL,
  `recovery_hash` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`email_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Folder kegiatan RT (dapat ditambah/diubah pengurus dari menu Kelola)
CREATE TABLE IF NOT EXISTS `folders` (
  `id` VARCHAR(16) NOT NULL,
  `nama` VARCHAR(120) NOT NULL,
  `pic` VARCHAR(120) NOT NULL DEFAULT '',
  `pagu` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `icon` VARCHAR(32) NOT NULL DEFAULT 'folder',
  `seq` INT NOT NULL DEFAULT 0,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_folders_del` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `folders` (`id`, `nama`, `pic`, `pagu`, `icon`, `seq`) VALUES
  ('iur', 'Iuran Warga', 'Bendahara RT', 0, 'iur', 1),
  ('ops', 'Operasional RT', 'Sekretaris RT', 0, 'ops', 2),
  ('keb', 'Kebersihan & Keamanan', 'Seksi Keamanan', 0, 'keb', 3),
  ('pem', 'Pembangunan Fasilitas', 'Seksi Pembangunan', 0, 'pem', 4),
  ('sos', 'Kegiatan Sosial', 'Seksi Sosial', 0, 'sos', 5),
  ('lib', 'Liburan & Wisata', 'Panitia Wisata', 0, 'lib', 6),
  ('kar', 'Karnaval & Acara', 'Panitia Acara', 0, 'kar', 7);


-- Berkas rekap per periode (isi folder explorer)
CREATE TABLE IF NOT EXISTS `catatan` (
  `id` VARCHAR(64) NOT NULL,
  `folder_id` VARCHAR(16) NOT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `periode` VARCHAR(64) NOT NULL DEFAULT '',
  `tgl` DATE NOT NULL,
  `status` ENUM('Draf','Final') NOT NULL DEFAULT 'Draf',
  `deskripsi` TEXT NULL,
  `seq` INT NOT NULL DEFAULT 0,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_catatan_folder` (`folder_id`),
  KEY `idx_catatan_del` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transaksi kas (jenis: i = masuk, o = keluar)
CREATE TABLE IF NOT EXISTS `transaksi` (
  `id` VARCHAR(64) NOT NULL,
  `tgl` DATE NOT NULL,
  `jenis` ENUM('i','o') NOT NULL,
  `folder_id` VARCHAR(16) NOT NULL,
  `catatan_id` VARCHAR(64) NULL,
  `keterangan` VARCHAR(500) NOT NULL DEFAULT '',
  `nominal` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `sumber` VARCHAR(255) NOT NULL DEFAULT '',
  `seq` INT NOT NULL DEFAULT 0,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_trx_folder` (`folder_id`),
  KEY `idx_trx_catatan` (`catatan_id`),
  KEY `idx_trx_tgl` (`tgl`),
  KEY `idx_trx_del` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Usulan / aspirasi warga
CREATE TABLE IF NOT EXISTS `usulan` (
  `id` VARCHAR(64) NOT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `nama` VARCHAR(120) NOT NULL,
  `tgl` DATE NOT NULL,
  `rincian` TEXT NOT NULL,
  `status` ENUM('Sedang Ditinjau','Telah Dianggarkan','Ditolak') NOT NULL DEFAULT 'Sedang Ditinjau',
  `tanggapan` TEXT NULL,
  `deleted_at` DATETIME NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_usulan_del` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Metadata: nomor revisi data kas (mencegah dua admin saling menimpa)
CREATE TABLE IF NOT EXISTS `meta` (
  `k` VARCHAR(32) NOT NULL,
  `v` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`k`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO `meta` (`k`, `v`) VALUES ('kas_rev', 0);

-- Pengurus awal (hash SHA-256 dari email terdaftar)
INSERT IGNORE INTO `admins` (`email_hash`) VALUES
  ('d8b06f8a2ee117d81a8b678957a1129dc4a5d814e89a7b60bfdb04b0128b7b15'),
  ('6669678838c5154a0920f339c431cac89f0b746e772ed3df3a0aafffa29f45f1');
