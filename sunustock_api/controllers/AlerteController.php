<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class AlerteController {
    public function __construct(private PDO $pdo) {}

    public function lister(): void {
        auth();
        $rows = $this->pdo->query(
            'SELECT a.id,
                    a.lue,
                    a.type_alerte       AS niveau,
                    a.quantite_actuelle AS quantite,
                    a.seuil             AS seuil_alerte,
                    a.created_at        AS date_alerte,
                    p.nom               AS nom_produit
             FROM alertes_stock a
             JOIN produits p ON p.id = a.produit_id
             ORDER BY a.lue ASC, a.created_at DESC'
        )->fetchAll();
        echo json_encode(['success' => true, 'data' => $rows]);
    }

    public function marquerLue(int $id): void {
        auth();
        $this->pdo->prepare('UPDATE alertes_stock SET lue = 1 WHERE id = ?')->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Alerte marquée comme lue']);
    }
}
