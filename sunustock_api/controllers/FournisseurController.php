<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class FournisseurController {
    public function __construct(private PDO $pdo) {}

    // Liste des fournisseurs (manager/admin)
    public function lister(): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $rows = $this->pdo->query(
            'SELECT id, nom, telephone, email, adresse, actif, created_at
             FROM fournisseurs ORDER BY nom ASC'
        )->fetchAll();
        echo json_encode(['success' => true, 'data' => $rows]);
    }

    // Créer un fournisseur
    public function creer(): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $d   = json_decode(file_get_contents('php://input'), true);
        $nom = trim($d['nom'] ?? '');

        if (!$nom) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Le nom est requis']);
            return;
        }
        $stmt = $this->pdo->prepare(
            'INSERT INTO fournisseurs (nom, telephone, email, adresse)
             VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([
            $nom,
            $d['telephone'] ?? null,
            $d['email']     ?? null,
            $d['adresse']   ?? null,
        ]);
        echo json_encode([
            'success' => true,
            'id'      => $this->pdo->lastInsertId(),
            'message' => 'Fournisseur créé',
        ]);
    }

    // Modifier un fournisseur
    public function modifier(int $id): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $d   = json_decode(file_get_contents('php://input'), true);
        $nom = trim($d['nom'] ?? '');

        if (!$nom) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Le nom est requis']);
            return;
        }
        $this->pdo->prepare(
            'UPDATE fournisseurs SET nom = ?, telephone = ?, email = ?, adresse = ?
             WHERE id = ?'
        )->execute([
            $nom,
            $d['telephone'] ?? null,
            $d['email']     ?? null,
            $d['adresse']   ?? null,
            $id,
        ]);
        echo json_encode(['success' => true, 'message' => 'Fournisseur modifié']);
    }

    // Activer / désactiver un fournisseur (bascule)
    public function basculerActif(int $id): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $this->pdo->prepare(
            'UPDATE fournisseurs SET actif = 1 - actif WHERE id = ?'
        )->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Statut mis à jour']);
    }
}
