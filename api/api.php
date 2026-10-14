<?php
// API Kas RT 01 / RW 02 Desa Sladi  (PHP + MySQL)
// Semua aksi lewat:  api/api.php?a=<aksi>
//   GET  state            -> semua data + status admin
//   POST login            -> {email,password}  (jika belum punya password: need_setup=true)
//   POST set_password     -> {email,password}  (pertama kali; mengembalikan kode pemulihan)
//   POST change_password  -> {current,password} (admin login)
//   POST reset_password   -> {email,code,password} (lupa password, pakai kode pemulihan)
//   POST logout
//   POST save_kas         -> {catatan:[], transaksi:[]}   (admin)
//   POST folder_save      -> {id?,nama,pic,pagu,icon}     (admin)
//   POST folder_delete    -> {id}                         (admin)
//   POST usulan_add       -> {judul,nama,rincian}         (publik)
//   POST usulan_update    -> {id,status?,tanggapan?}      (admin)
//   POST usulan_delete    -> {id}                         (admin)

declare(strict_types=1);

session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $cfgFile = __DIR__ . '/config.php';
    if (!file_exists($cfgFile)) {
        $cfgFile = __DIR__ . '/config.example.php';
    }
    $c = require $cfgFile;
    try {
        $pdo = new PDO("mysql:host={$c['host']};port={$c['port']};dbname={$c['name']};charset=utf8mb4", $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (Throwable $e) {
        out(['error' => 'Database tidak terhubung. Pastikan MySQL XAMPP berjalan dan database sudah dipasang (php api/install.php).'], 500);
    }
    return $pdo;
}

function isAdmin(): bool { return ($_SESSION['admin'] ?? false) === true; }
function requireAdmin(): void { if (!isAdmin()) out(['error' => 'Khusus admin. Silakan masuk sebagai pengurus.'], 403); }

function body(): array {
    $raw = file_get_contents('php://input');
    $j = json_decode($raw ?: '[]', true);
    return is_array($j) ? $j : [];
}

function str($v, int $max): string {
    $s = trim((string)($v ?? ''));
    return mb_substr($s, 0, $max);
}

function validDate($v): string {
    $s = (string)$v;
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) ? $s : date('Y-m-d');
}

// ---- Helper autentikasi admin ----
function emailHash(string $email): string { return hash('sha256', strtolower(trim($email))); }

function throttle(): void {
    $_SESSION['tries'] = array_values(array_filter($_SESSION['tries'] ?? [], fn($t) => $t > time() - 600));
    if (count($_SESSION['tries']) >= 10) out(['ok' => false, 'error' => 'Terlalu banyak percobaan. Coba lagi dalam 10 menit.'], 429);
}
function failTry(): void { $_SESSION['tries'][] = time(); }

function findAdmin(string $email): ?array {
    $st = db()->prepare('SELECT * FROM admins WHERE email_hash = ?');
    $st->execute([emailHash($email)]);
    return $st->fetch() ?: null;
}

function checkNewPassword(string $p): void {
    if (mb_strlen($p) < 8) out(['ok' => false, 'error' => 'Password minimal 8 karakter.'], 400);
}

function newRecoveryCode(): string {
    return strtoupper(implode('-', str_split(bin2hex(random_bytes(8)), 4)));   // contoh: 1A2B-3C4D-5E6F-7A8B
}

function loginAs(string $hash): void {
    session_regenerate_id(true);
    $_SESSION['admin'] = true;
    $_SESSION['admin_hash'] = $hash;
}

$a = $_GET['a'] ?? 'state';
$method = $_SERVER['REQUEST_METHOD'];

if ($a !== 'state' && $method !== 'POST') out(['error' => 'Metode harus POST'], 405);

switch ($a) {
    case 'state': {
        $pdo = db();
        $catatan = array_map(fn($r) => [
            'id' => $r['id'], 'f' => $r['folder_id'], 't' => $r['judul'], 'p' => $r['periode'],
            'd' => $r['tgl'], 's' => $r['status'], 'desc' => $r['deskripsi'] ?? '',
        ], $pdo->query('SELECT * FROM catatan WHERE deleted_at IS NULL ORDER BY seq ASC, created_at DESC')->fetchAll());

        $transaksi = array_map(fn($r) => [
            'id' => $r['id'], 'd' => $r['tgl'], 't' => $r['jenis'], 'f' => $r['folder_id'],
            'c' => $r['catatan_id'] ?? $r['folder_id'], 'k' => $r['keterangan'],
            'n' => (int)$r['nominal'], 's' => $r['sumber'],
        ], $pdo->query('SELECT * FROM transaksi WHERE deleted_at IS NULL ORDER BY seq ASC, created_at DESC')->fetchAll());

        $usulan = array_map(fn($r) => [
            'id' => $r['id'], 'j' => $r['judul'], 'o' => $r['nama'], 'd' => $r['tgl'],
            'q' => $r['rincian'], 'st' => $r['status'], 'r' => $r['tanggapan'] ?? '',
        ], $pdo->query('SELECT * FROM usulan WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC')->fetchAll());

        $folders = array_map(fn($r) => [
            'id' => $r['id'], 'n' => $r['nama'], 'pic' => $r['pic'] ?? '',
            'pagu' => (int)($r['pagu'] ?? 0), 'ic' => $r['icon'] ?: 'folder',
            'seq' => (int)($r['seq'] ?? 0),
        ], $pdo->query('SELECT * FROM folders WHERE deleted_at IS NULL ORDER BY seq ASC, id ASC')->fetchAll());

        $rev = (int)$pdo->query("SELECT v FROM meta WHERE k = 'kas_rev'")->fetchColumn();
        out(['admin' => isAdmin(), 'rev' => $rev, 'folders' => $folders, 'catatan' => $catatan, 'transaksi' => $transaksi, 'usulan' => $usulan]);
    }

    case 'login': {
        $b = body();
        $email = (string)($b['email'] ?? '');
        $pass = (string)($b['password'] ?? '');
        if (trim($email) === '') out(['ok' => false, 'error' => 'Email wajib diisi.'], 400);
        throttle();

        $adm = findAdmin($email);
        if (!$adm) { failTry(); out(['ok' => false, 'error' => 'Akses ditolak: Alamat email tidak terdaftar dalam hak akses pengurus RT.'], 401); }
        if (empty($adm['password_hash'])) {
            out(['ok' => false, 'need_setup' => true, 'error' => 'Akun ini belum punya password. Silakan buat password terlebih dahulu.'], 200);
        }
        if ($pass === '' || !password_verify($pass, $adm['password_hash'])) {
            failTry();
            out(['ok' => false, 'error' => 'Email atau password salah.'], 401);
        }
        loginAs($adm['email_hash']);
        out(['ok' => true]);
    }

    case 'set_password': {
        $b = body();
        throttle();
        $adm = findAdmin((string)($b['email'] ?? ''));
        if (!$adm) { failTry(); out(['ok' => false, 'error' => 'Email tidak terdaftar dalam hak akses pengurus RT.'], 401); }
        if (!empty($adm['password_hash'])) out(['ok' => false, 'error' => 'Password sudah dibuat. Gunakan masuk, atau "Lupa password" bila lupa.'], 409);
        $pass = (string)($b['password'] ?? '');
        checkNewPassword($pass);
        $code = newRecoveryCode();
        db()->prepare('UPDATE admins SET password_hash = ?, recovery_hash = ? WHERE email_hash = ?')
            ->execute([password_hash($pass, PASSWORD_DEFAULT), password_hash($code, PASSWORD_DEFAULT), $adm['email_hash']]);
        loginAs($adm['email_hash']);
        out(['ok' => true, 'recovery_code' => $code]);
    }

    case 'change_password': {
        requireAdmin();
        $b = body();
        throttle();
        $st = db()->prepare('SELECT * FROM admins WHERE email_hash = ?');
        $st->execute([$_SESSION['admin_hash'] ?? '']);
        $adm = $st->fetch();
        if (!$adm || !password_verify((string)($b['current'] ?? ''), (string)$adm['password_hash'])) {
            failTry();
            out(['ok' => false, 'error' => 'Password saat ini salah.'], 401);
        }
        $pass = (string)($b['password'] ?? '');
        checkNewPassword($pass);
        db()->prepare('UPDATE admins SET password_hash = ? WHERE email_hash = ?')
            ->execute([password_hash($pass, PASSWORD_DEFAULT), $adm['email_hash']]);
        out(['ok' => true]);
    }

    case 'reset_password': {
        $b = body();
        throttle();
        $adm = findAdmin((string)($b['email'] ?? ''));
        $code = strtoupper(trim((string)($b['code'] ?? '')));
        if (!$adm || empty($adm['recovery_hash']) || !password_verify($code, $adm['recovery_hash'])) {
            failTry();
            out(['ok' => false, 'error' => 'Email atau kode pemulihan salah.'], 401);
        }
        $pass = (string)($b['password'] ?? '');
        checkNewPassword($pass);
        $newCode = newRecoveryCode();   // kode lama hangus, kode baru ditampilkan sekali
        db()->prepare('UPDATE admins SET password_hash = ?, recovery_hash = ? WHERE email_hash = ?')
            ->execute([password_hash($pass, PASSWORD_DEFAULT), password_hash($newCode, PASSWORD_DEFAULT), $adm['email_hash']]);
        loginAs($adm['email_hash']);
        out(['ok' => true, 'recovery_code' => $newCode]);
    }

    case 'logout': {
        $_SESSION = [];
        session_destroy();
        out(['ok' => true]);
    }

    case 'save_kas': {
        requireAdmin();
        $b = body();
        $catatan = is_array($b['catatan'] ?? null) ? $b['catatan'] : [];
        $transaksi = is_array($b['transaksi'] ?? null) ? $b['transaksi'] : [];
        $pdo = db();
        $pdo->beginTransaction();
        try {
            // Cegah dua pengurus saling menimpa: revisi data di klien harus sama dengan di database
            $cur = (int)$pdo->query("SELECT v FROM meta WHERE k = 'kas_rev' FOR UPDATE")->fetchColumn();
            if (isset($b['rev']) && (int)$b['rev'] !== $cur) {
                $pdo->rollBack();
                out(['error' => 'Data sudah diubah pengurus lain. Halaman dimuat ulang; mohon ulangi perubahan Anda.', 'conflict' => true], 409);
            }
            // Soft delete catatan yang dihapus di web (tetap tersimpan di MySQL, hanya disembunyikan dari web)
            $catIds = array_filter(array_map(fn($c) => str($c['id'] ?? '', 64), $catatan));
            if (!empty($catIds)) {
                $inClause = implode(',', array_fill(0, count($catIds), '?'));
                $pdo->prepare("UPDATE catatan SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL AND id NOT IN ($inClause)")
                    ->execute(array_values($catIds));
            } else {
                $pdo->exec("UPDATE catatan SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL");
            }

            // Simpan / update catatan aktif (UPSERT, deleted_at di-reset ke NULL)
            $ic = $pdo->prepare('INSERT INTO catatan (id, folder_id, judul, periode, tgl, status, deskripsi, seq, deleted_at)
                                 VALUES (?,?,?,?,?,?,?,?, NULL)
                                 ON DUPLICATE KEY UPDATE
                                   folder_id = VALUES(folder_id),
                                   judul = VALUES(judul),
                                   periode = VALUES(periode),
                                   tgl = VALUES(tgl),
                                   status = VALUES(status),
                                   deskripsi = VALUES(deskripsi),
                                   seq = VALUES(seq),
                                   deleted_at = NULL');
            foreach (array_values($catatan) as $i => $c) {
                $ic->execute([
                    str($c['id'] ?? '', 64), str($c['f'] ?? '', 16), str($c['t'] ?? '', 255), str($c['p'] ?? '', 64),
                    validDate($c['d'] ?? ''), (($c['s'] ?? '') === 'Final') ? 'Final' : 'Draf', str($c['desc'] ?? '', 5000), $i,
                ]);
            }

            // Soft delete transaksi yang dihapus di web (tetap tersimpan di MySQL, hanya disembunyikan dari web)
            $trxIds = array_filter(array_map(fn($t) => str($t['id'] ?? '', 64), $transaksi));
            if (!empty($trxIds)) {
                $inClause = implode(',', array_fill(0, count($trxIds), '?'));
                $pdo->prepare("UPDATE transaksi SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL AND id NOT IN ($inClause)")
                    ->execute(array_values($trxIds));
            } else {
                $pdo->exec("UPDATE transaksi SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL");
            }

            // Simpan / update transaksi aktif (UPSERT, deleted_at di-reset ke NULL)
            $it = $pdo->prepare('INSERT INTO transaksi (id, tgl, jenis, folder_id, catatan_id, keterangan, nominal, sumber, seq, deleted_at)
                                 VALUES (?,?,?,?,?,?,?,?,?, NULL)
                                 ON DUPLICATE KEY UPDATE
                                   tgl = VALUES(tgl),
                                   jenis = VALUES(jenis),
                                   folder_id = VALUES(folder_id),
                                   catatan_id = VALUES(catatan_id),
                                   keterangan = VALUES(keterangan),
                                   nominal = VALUES(nominal),
                                   sumber = VALUES(sumber),
                                   seq = VALUES(seq),
                                   deleted_at = NULL');
            foreach (array_values($transaksi) as $i => $t) {
                $it->execute([
                    str($t['id'] ?? ('t_' . $i), 64), validDate($t['d'] ?? ''), (($t['t'] ?? '') === 'i') ? 'i' : 'o',
                    str($t['f'] ?? '', 16), str($t['c'] ?? '', 64) ?: null, str($t['k'] ?? '', 500),
                    max(0, (int)($t['n'] ?? 0)), str($t['s'] ?? '', 255), $i,
                ]);
            }
            $pdo->exec("UPDATE meta SET v = v + 1 WHERE k = 'kas_rev'");
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            out(['error' => 'Gagal menyimpan ke database: ' . $e->getMessage()], 500);
        }
        out(['ok' => true, 'rev' => $cur + 1, 'catatan' => count($catatan), 'transaksi' => count($transaksi)]);
    }

    case 'usulan_add': {
        $b = body();
        $judul = str($b['judul'] ?? '', 255);
        $nama = str($b['nama'] ?? '', 120);
        $rincian = str($b['rincian'] ?? '', 5000);
        if ($judul === '' || $nama === '' || $rincian === '') out(['error' => 'Mohon lengkapi semua kolom usulan.'], 400);
        $id = 'u_' . bin2hex(random_bytes(6));
        db()->prepare('INSERT INTO usulan (id, judul, nama, tgl, rincian) VALUES (?,?,?,?,?)')
            ->execute([$id, $judul, $nama, date('Y-m-d'), $rincian]);
        out(['ok' => true, 'item' => ['id' => $id, 'j' => $judul, 'o' => $nama, 'd' => date('Y-m-d'), 'q' => $rincian, 'st' => 'Sedang Ditinjau', 'r' => '']]);
    }

    case 'usulan_update': {
        requireAdmin();
        $b = body();
        $id = str($b['id'] ?? '', 64);
        $pdo = db();
        if (isset($b['status'])) {
            $ok = ['Sedang Ditinjau', 'Telah Dianggarkan', 'Ditolak'];
            if (!in_array($b['status'], $ok, true)) out(['error' => 'Status tidak valid'], 400);
            $pdo->prepare('UPDATE usulan SET status = ? WHERE id = ?')->execute([$b['status'], $id]);
        }
        if (isset($b['tanggapan'])) {
            $pdo->prepare('UPDATE usulan SET tanggapan = ? WHERE id = ?')->execute([str($b['tanggapan'], 5000), $id]);
        }
        out(['ok' => true]);
    }

    case 'usulan_delete': {
        requireAdmin();
        $id = str(body()['id'] ?? '', 64);
        db()->prepare('UPDATE usulan SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$id]);
        out(['ok' => true]);
    }

    case 'folder_save': {
        requireAdmin();
        $b = body();
        $id = strtolower(trim((string)($b['id'] ?? '')));
        $nama = str($b['nama'] ?? '', 120);
        $pic = str($b['pic'] ?? '', 120);
        $pagu = max(0, (int)($b['pagu'] ?? 0));
        $icon = str($b['icon'] ?? 'folder', 32);
        if ($nama === '') out(['error' => 'Nama kegiatan wajib diisi.'], 400);

        $pdo = db();
        if ($id !== '') {
            $st = $pdo->prepare('SELECT COUNT(*) FROM folders WHERE id = ?');
            $st->execute([$id]);
            if ((int)$st->fetchColumn() > 0) {
                $pdo->prepare('UPDATE folders SET nama = ?, pic = ?, pagu = ?, icon = ?, deleted_at = NULL WHERE id = ?')
                    ->execute([$nama, $pic, $pagu, $icon, $id]);
                $pdo->exec("UPDATE meta SET v = v + 1 WHERE k = 'kas_rev'");
                out(['ok' => true, 'action' => 'updated', 'item' => ['id' => $id, 'n' => $nama, 'pic' => $pic, 'pagu' => $pagu, 'ic' => $icon]]);
            }
        }

        if ($id === '') {
            $base = preg_replace('/[^a-z0-9]/', '', strtolower($nama));
            $base = substr($base, 0, 8);
            if ($base === '') $base = 'keg';
            $id = $base;
            $chk = $pdo->prepare('SELECT COUNT(*) FROM folders WHERE id = ?');
            $chk->execute([$id]);
            if ((int)$chk->fetchColumn() > 0) {
                $id = substr($base, 0, 5) . '_' . substr(bin2hex(random_bytes(3)), 0, 5);
            }
        }

        $maxSeq = (int)$pdo->query('SELECT COALESCE(MAX(seq), 0) FROM folders')->fetchColumn();
        $pdo->prepare('INSERT INTO folders (id, nama, pic, pagu, icon, seq, deleted_at) VALUES (?,?,?,?,?,?, NULL)')
            ->execute([$id, $nama, $pic, $pagu, $icon, $maxSeq + 1]);
        $pdo->exec("UPDATE meta SET v = v + 1 WHERE k = 'kas_rev'");
        out(['ok' => true, 'action' => 'created', 'item' => ['id' => $id, 'n' => $nama, 'pic' => $pic, 'pagu' => $pagu, 'ic' => $icon]]);
    }

    case 'folder_delete': {
        requireAdmin();
        $b = body();
        $id = strtolower(trim((string)($b['id'] ?? '')));
        if ($id === '') out(['error' => 'ID kegiatan tidak valid.'], 400);

        $pdo = db();
        $stTrx = $pdo->prepare('SELECT COUNT(*) FROM transaksi WHERE folder_id = ? AND deleted_at IS NULL');
        $stTrx->execute([$id]);
        $trxCount = (int)$stTrx->fetchColumn();

        $stCat = $pdo->prepare('SELECT COUNT(*) FROM catatan WHERE folder_id = ? AND deleted_at IS NULL');
        $stCat->execute([$id]);
        $catCount = (int)$stCat->fetchColumn();

        if ($trxCount > 0 || $catCount > 0) {
            out(['error' => "Folder tidak dapat dihapus karena masih digunakan oleh $trxCount transaksi dan $catCount berkas rekap. Pindahkan atau hapus transaksinya terlebih dahulu."], 400);
        }

        $pdo->prepare('UPDATE folders SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$id]);
        $pdo->exec("UPDATE meta SET v = v + 1 WHERE k = 'kas_rev'");
        out(['ok' => true]);
    }

    default:
        out(['error' => 'Aksi tidak dikenal'], 404);
}
