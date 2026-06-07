<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class JournalController {
    public function __construct(private PDO $pdo) {}

    // Liste du journal d'audit (admin uniquement)
    public function lister(): void {
        $user = auth();
        autoriser(['admin'], $user);

        $filtre = $_GET['action'] ?? '';
        $sql = 'SELECT j.id, j.action, j.cible, j.details, j.created_at,
                       CONCAT(u.prenom, " ", u.nom) AS utilisateur,
                       u.role AS role
                FROM journal_actions j
                LEFT JOIN utilisateurs u ON u.id = j.utilisateur_id';
        $params = [];
        if ($filtre) { $sql .= ' WHERE j.action = ?'; $params[] = $filtre; }
        $sql .= ' ORDER BY j.created_at DESC LIMIT 200';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    }
}
