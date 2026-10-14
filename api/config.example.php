<?php
// Cegah akses langsung via URL browser
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'config.example.php') {
    http_response_code(403);
    exit('Akses ditolak.');
}

/**
 * Template Konfigurasi Database Kas RT
 * 
 * Petunjuk:
 * 1. Salin file ini menjadi `config.php` di folder `api/`
 * 2. Sesuaikan kredensial database (host, user, pass, name) di bawah ini
 * 3. File `config.php` sudah masuk .gitignore sehingga aman dari GitHub
 */

$httpHost = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isLocal = ($httpHost === 'localhost' || strpos($httpHost, '127.0.0.1') !== false || $httpHost === '');

if (!$isLocal) {
    // Pengaturan Database Live Hosting (cPanel / InfinityFree / VPS)
    return [
        'host' => getenv('KAS_DB_HOST') ?: 'sqlxxx.yourhosting.com',
        'port' => getenv('KAS_DB_PORT') ?: '3306',
        'name' => getenv('KAS_DB_NAME') ?: 'nama_database_hosting',
        'user' => getenv('KAS_DB_USER') ?: 'username_database_hosting',
        'pass' => getenv('KAS_DB_PASS') ?: 'password_database_hosting',
    ];
}

// Konfigurasi koneksi database default XAMPP Lokal (user root, tanpa password)
return [
    'host' => getenv('KAS_DB_HOST') ?: '127.0.0.1',
    'port' => getenv('KAS_DB_PORT') ?: '3306',
    'name' => getenv('KAS_DB_NAME') ?: 'kas_rt',
    'user' => getenv('KAS_DB_USER') ?: 'root',
    'pass' => getenv('KAS_DB_PASS') !== false ? getenv('KAS_DB_PASS') : '',
];
