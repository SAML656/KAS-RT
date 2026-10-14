<?php
// Pasang database otomatis:  php api/install.php
// (membuat database kas_rt + semua tabel + pengurus awal dari schema.sql)
if (PHP_SAPI !== 'cli') { http_response_code(403); exit("Jalankan lewat terminal: php api/install.php\n"); }

$cfgFile = __DIR__ . '/config.php';
if (!file_exists($cfgFile)) {
    $cfgFile = __DIR__ . '/config.example.php';
}
$cfg = require $cfgFile;
try {
    $pdo = new PDO("mysql:host={$cfg['host']};port={$cfg['port']};charset=utf8mb4", $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (Throwable $e) {
    fwrite(STDERR, "Gagal konek MySQL: " . $e->getMessage() . "\nPastikan MySQL XAMPP sudah berjalan.\n");
    exit(1);
}

$pdo->exec("CREATE DATABASE IF NOT EXISTS `{$cfg['name']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$pdo->exec("USE `{$cfg['name']}`");

$sql = file_get_contents(__DIR__ . '/schema.sql');
// buang komentar baris, lalu pecah per statement
$sql = preg_replace('/^\s*--.*$/m', '', $sql);
foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) {
    $pdo->exec($stmt);
}

// Migrasi: tambah kolom password pada tabel admins yang dibuat versi sebelumnya
$pdo->exec("USE `{$cfg['name']}`");
foreach (['password_hash' => 'VARCHAR(255) NULL', 'recovery_hash' => 'VARCHAR(255) NULL'] as $col => $def) {
    $has = $pdo->query("SHOW COLUMNS FROM `admins` LIKE '$col'")->fetch();
    if (!$has) $pdo->exec("ALTER TABLE `admins` ADD COLUMN `$col` $def");
}

// Migrasi Soft Delete: tambah kolom deleted_at di semua tabel kas
foreach (['folders', 'catatan', 'transaksi', 'usulan'] as $table) {
    $has = $pdo->query("SHOW COLUMNS FROM `$table` LIKE 'deleted_at'")->fetch();
    if (!$has) {
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL, ADD INDEX (`deleted_at`)");
    }
}
echo "OK: database '{$cfg['name']}' dan tabel siap dipakai (soft delete aktif).\n";

