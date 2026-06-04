<?php
// config/jwt.php — Génération et vérification des tokens JWT

define('JWT_SECRET',     'SUNUSTOCK_CLE_SECRETE_2026_CHANGER_EN_PROD');
define('JWT_EXPIRATION', 86400); // 24 heures

function genererToken(array $payload): string {
    $header  = base64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRATION;
    $p   = base64url(json_encode($payload));
    $sig = base64url(hash_hmac('sha256', "$header.$p", JWT_SECRET, true));
    return "$header.$p.$sig";
}

function verifierToken(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    $expected = base64url(hash_hmac('sha256', "$h.$p", JWT_SECRET, true));
    if (!hash_equals($expected, $s)) return null;
    $data = json_decode(base64_decode(strtr($p, '-_', '+/')), true);
    if (!$data || $data['exp'] < time()) return null;
    return $data;
}

function base64url(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
