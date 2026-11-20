<?php
// Stores a lead posted by index.html in PostgreSQL.
// Connection settings: config.php. Table: schema.sql (run once).
// ponytail: no rate limiting, anyone can POST rows. Add a throttle or CAPTCHA if spam shows up.

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }

$row = [];
foreach (['name', 'business', 'url', 'email'] as $key) {
    $v = $_POST[$key] ?? '';
    $row[] = is_string($v) ? mb_substr(trim($v), 0, 200) : '';
}
[, , , $email] = $row;

if (implode('', $row) === '') { http_response_code(204); exit; }   // nothing filled in: nothing to store
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) { http_response_code(422); exit; }

try {
    $c = require __DIR__ . '/config.php';
    $db = new PDO($c['dsn'], $c['user'], $c['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $db->prepare('INSERT INTO leads (name, business, url, email) VALUES (?, ?, ?, ?)')->execute($row);
    http_response_code(204);
} catch (Throwable $e) {
    error_log('lead.php: ' . $e->getMessage());
    http_response_code(500);
}
