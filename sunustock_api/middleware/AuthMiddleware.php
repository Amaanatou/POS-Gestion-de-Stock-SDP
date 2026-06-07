<?php
require_once __DIR__ . '/../config/jwt.php';

// Vérifie le token JWT et retourne le payload (infos utilisateur)
function auth(): array {
    $headers = getallheaders();
    $h = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!str_starts_with($h, 'Bearer ')) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'Token manquant']));
    }
    $payload = verifierToken(substr($h, 7));
    if (!$payload) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'Token invalide ou expiré']));
    }
    return $payload;
}

// Vérifie que l'utilisateur a le bon rôle
function autoriser(array $roles, array $user): void {
    if (!in_array($user['role'], $roles)) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'Accès refusé — rôle insuffisant']));
    }
}

// Journalise une action critique (annulation, modif prix, retrait caisse...)
function journaliser(PDO $pdo, int $userId, string $action, string $cible = '', string $details = ''): void {
    try {
        $pdo->prepare(
            'INSERT INTO journal_actions (utilisateur_id, action, cible, details)
             VALUES (?, ?, ?, ?)'
        )->execute([$userId, $action, $cible, $details]);
    } catch (Exception $e) {
        // Ne jamais bloquer l'action principale si le journal échoue
    }
}
