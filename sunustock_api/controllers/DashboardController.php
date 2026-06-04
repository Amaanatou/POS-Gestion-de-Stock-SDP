<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class DashboardController {
    public function __construct(private PDO $pdo) {}

    public function stats(): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);

        $totalProduits = $this->pdo->query(
            'SELECT COUNT(*) FROM produits WHERE actif = 1'
        )->fetchColumn();

        $totalAlertes = $this->pdo->query(
            'SELECT COUNT(*) FROM alertes_stock WHERE lue = 0'
        )->fetchColumn();

        $ventesJour = $this->pdo->query(
            'SELECT COUNT(*) FROM ventes
             WHERE DATE(created_at) = CURDATE() AND statut = "validee"'
        )->fetchColumn();

        $caJour = $this->pdo->query(
            'SELECT COALESCE(SUM(total_ttc), 0) FROM ventes
             WHERE DATE(created_at) = CURDATE() AND statut = "validee"'
        )->fetchColumn();

        // Ventes des 7 derniers jours
        $rows = $this->pdo->query(
            'SELECT DATE_FORMAT(created_at, "%a") AS jour,
                    COUNT(*) AS ventes
             FROM ventes
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
               AND statut = "validee"
             GROUP BY DATE(created_at), jour
             ORDER BY DATE(created_at) ASC'
        )->fetchAll();

        // Répartition du stock
        $rep = $this->pdo->query(
            'SELECT
               SUM(CASE WHEN s.quantite  >  p.seuil_alerte THEN 1 ELSE 0 END) AS normal,
               SUM(CASE WHEN s.quantite <= p.seuil_alerte
                         AND s.quantite  >  0              THEN 1 ELSE 0 END) AS critique,
               SUM(CASE WHEN s.quantite  =  0              THEN 1 ELSE 0 END) AS rupture
             FROM stocks s
             JOIN produits p ON p.id = s.produit_id
             WHERE p.actif = 1'
        )->fetch();

        echo json_encode([
            'success' => true,
            'data'    => [
                'total_produits'    => (int)$totalProduits,
                'total_alertes'     => (int)$totalAlertes,
                'ventes_jour'       => (int)$ventesJour,
                'ca_jour'           => (float)$caJour,
                'ventes_semaine'    => array_map(fn($r) => [
                    'jour'   => $r['jour'],
                    'ventes' => (int)$r['ventes'],
                ], $rows),
                'repartition_stock' => [
                    ['name' => 'Normal',   'value' => (int)$rep['normal']],
                    ['name' => 'Critique', 'value' => (int)$rep['critique']],
                    ['name' => 'Rupture',  'value' => (int)$rep['rupture']],
                ],
            ],
        ]);
    }
}
