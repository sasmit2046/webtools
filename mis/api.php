<?php
require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$action = $_GET['action'] ?? '';

function read_json_body() {
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

try {
    switch ($action) {

        case 'status': {
            // Tells frontend if DB has been initialised (has users seeded).
            $row = $pdo->query("SELECT v FROM kv WHERE k='users'")->fetch(PDO::FETCH_ASSOC);
            $hasUsers = false;
            if ($row) {
                $u = json_decode($row['v'], true);
                $hasUsers = is_array($u) && count($u) > 0;
            }
            $name = $pdo->query("SELECT v FROM meta WHERE k='db_name'")->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['ok' => true, 'initialized' => $hasUsers, 'name' => $name['v'] ?? 'pms.sqlite']);
            break;
        }

        case 'load': {
            $rows = $pdo->query("SELECT k, v FROM kv")->fetchAll(PDO::FETCH_ASSOC);
            $out = new stdClass();
            foreach ($rows as $r) {
                $decoded = json_decode($r['v'], true);
                $out->{$r['k']} = $decoded === null ? [] : $decoded;
            }
            echo json_encode(['ok' => true, 'cache' => $out]);
            break;
        }

        case 'save': {
            // Body: { cache: { tableName: [...rows], ... } }
            $body = read_json_body();
            $cache = $body['cache'] ?? null;
            if (!is_array($cache) && !is_object($cache)) {
                throw new Exception('cache missing');
            }
            $cache = (array)$cache;

            $pdo->beginTransaction();
            $ins = $pdo->prepare('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v');
            foreach ($cache as $table => $rows) {
                if (!is_string($table) || $table === '') continue;
                // Skip the in-memory derived view financials_nested; we persist financials + expenses flat.
                if ($table === 'financials_nested') continue;
                $ins->execute([$table, json_encode($rows, JSON_UNESCAPED_UNICODE)]);
            }
            $pdo->commit();
            echo json_encode(['ok' => true]);
            break;
        }

        case 'reset': {
            // Wipe everything; called from "Create New Database" button.
            $pdo->exec('DELETE FROM kv');
            $pdo->exec("INSERT OR REPLACE INTO meta (k,v) VALUES ('db_name','pms.sqlite')");
            echo json_encode(['ok' => true]);
            break;
        }

        default:
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Unknown action']);
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
