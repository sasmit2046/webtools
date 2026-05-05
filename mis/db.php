<?php
// SQLite connection. DB file lives next to this script.
// XAMPP needs the "sqlite3" + "pdo_sqlite" extensions enabled (they are by default on Windows XAMPP).
$DB_FILE = __DIR__ . DIRECTORY_SEPARATOR . 'pms.sqlite';

try {
    $pdo = new PDO('sqlite:' . $DB_FILE);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA journal_mode=WAL');
    // Single key/value store. Each "table" the JS app uses is one row whose value is a JSON array.
    $pdo->exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'DB init failed: ' . $e->getMessage()]);
    exit;
}
