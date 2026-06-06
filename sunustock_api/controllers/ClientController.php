<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class ClientController {
    public function __construct(private PDO $pdo) {}

    // Liste de tous les clients (manager/admin)
    public function lister(): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $rows = $this->pdo->query(
            'SELECT id, nom, telephone, statut, points, created_at
             FROM clients ORDER BY nom ASC'
        )->fetchAll();
        echo json_encode(['success' => true, 'data' => $rows]);
    }

    // Recherche d'un client par téléphone (utilisé à la caisse)
    public function rechercher(string $tel): void {
        auth();
        $s = $this->pdo->prepare(
            'SELECT id, nom, telephone, statut, points
             FROM clients WHERE telephone = ? LIMIT 1'
        );
        $s->execute([$tel]);
        $client = $s->fetch();
        if (!$client) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Aucun client avec ce numéro']);
            return;
        }
        echo json_encode(['success' => true, 'data' => $client]);
    }

    // Créer un nouveau client (à la caisse ou au back-office)
    public function creer(): void {
        auth();
        $d   = json_decode(file_get_contents('php://input'), true);
        $nom = trim($d['nom'] ?? '');
        $tel = trim($d['telephone'] ?? '');

        if (!$nom || !$tel) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nom et téléphone requis']);
            return;
        }

        // Vérifier que le téléphone n'existe pas déjà
        $check = $this->pdo->prepare('SELECT id FROM clients WHERE telephone = ?');
        $check->execute([$tel]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Ce numéro existe déjà']);
            return;
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO clients (nom, telephone, statut, points)
             VALUES (?, ?, ?, 0)'
        );
        $stmt->execute([$nom, $tel, $d['statut'] ?? 'standard']);
        $newId = $this->pdo->lastInsertId();

        echo json_encode([
            'success' => true,
            'message' => 'Client créé',
            'data'    => [
                'id'        => (int)$newId,
                'nom'       => $nom,
                'telephone' => $tel,
                'statut'    => $d['statut'] ?? 'standard',
                'points'    => 0,
            ],
        ]);
    }
}
