<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class DashboardController {
    public function __construct(private PDO $pdo) {}

    public function stats(): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);

        // ── KPIs ─────────────────────────────────────────────
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

        // Le Chiffre d'Affaires se calcule HORS TAXES (HT) — norme comptable.
        // La TVA collectée appartient à l'État, pas à l'entreprise.
        $caJour = $this->pdo->query(
            'SELECT COALESCE(SUM(total_ht), 0) FROM ventes
             WHERE DATE(created_at) = CURDATE() AND statut = "validee"'
        )->fetchColumn();

        $caSemaine = $this->pdo->query(
            'SELECT COALESCE(SUM(total_ht), 0) FROM ventes
             WHERE YEARWEEK(created_at, 1) = YEARWEEK(NOW(), 1)
               AND statut = "validee"'
        )->fetchColumn();

        $caMois = $this->pdo->query(
            'SELECT COALESCE(SUM(total_ht), 0) FROM ventes
             WHERE YEAR(created_at) = YEAR(NOW())
               AND MONTH(created_at) = MONTH(NOW())
               AND statut = "validee"'
        )->fetchColumn();

        // TVA collectée (à reverser à l'État) par période
        $tvaJour = $this->pdo->query(
            'SELECT COALESCE(SUM(total_tva), 0) FROM ventes
             WHERE DATE(created_at) = CURDATE() AND statut = "validee"'
        )->fetchColumn();

        $tvaSemaine = $this->pdo->query(
            'SELECT COALESCE(SUM(total_tva), 0) FROM ventes
             WHERE YEARWEEK(created_at, 1) = YEARWEEK(NOW(), 1) AND statut = "validee"'
        )->fetchColumn();

        $tvaMois = $this->pdo->query(
            'SELECT COALESCE(SUM(total_tva), 0) FROM ventes
             WHERE YEAR(created_at) = YEAR(NOW())
               AND MONTH(created_at) = MONTH(NOW()) AND statut = "validee"'
        )->fetchColumn();

        // ── Ventes des 7 derniers jours ───────────────────────
        $ventesSemaine = $this->pdo->query(
            'SELECT DATE_FORMAT(created_at, "%a") AS jour,
                    COUNT(*) AS ventes,
                    COALESCE(SUM(total_ht), 0) AS ca
             FROM ventes
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
               AND statut = "validee"
             GROUP BY DATE(created_at), jour
             ORDER BY DATE(created_at) ASC'
        )->fetchAll();

        // ── Répartition du stock ──────────────────────────────
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

        // ── Top 10 produits les plus vendus ───────────────────
        $top10 = $this->pdo->query(
            'SELECT p.nom, p.image_url,
                    SUM(lv.quantite)   AS total_vendu,
                    SUM(lv.sous_total) AS ca_total
             FROM lignes_ventes lv
             JOIN produits p ON p.id = lv.produit_id
             JOIN ventes    v ON v.id = lv.vente_id
             WHERE v.statut = "validee"
             GROUP BY lv.produit_id, p.nom, p.image_url
             ORDER BY total_vendu DESC
             LIMIT 10'
        )->fetchAll();

        // ── Dernières transactions ────────────────────────────
        $dernieres = $this->pdo->query(
            'SELECT v.id, v.numero, v.total_ttc, v.mode_paiement,
                    v.created_at, v.statut,
                    CONCAT(u.prenom, " ", u.nom) AS caissier,
                    COUNT(lv.id) AS nb_articles
             FROM ventes v
             JOIN utilisateurs  u  ON u.id       = v.utilisateur_id
             JOIN lignes_ventes lv ON lv.vente_id = v.id
             GROUP BY v.id, v.numero, v.total_ttc, v.mode_paiement,
                      v.created_at, v.statut, caissier
             ORDER BY v.created_at DESC
             LIMIT 8'
        )->fetchAll();

        echo json_encode([
            'success' => true,
            'data'    => [
                'total_produits'    => (int)$totalProduits,
                'total_alertes'     => (int)$totalAlertes,
                'ventes_jour'       => (int)$ventesJour,
                'ca_jour'           => (float)$caJour,
                'ca_semaine'        => (float)$caSemaine,
                'ca_mois'           => (float)$caMois,
                'tva_jour'          => (float)$tvaJour,
                'tva_semaine'       => (float)$tvaSemaine,
                'tva_mois'          => (float)$tvaMois,
                'ventes_semaine'    => array_map(fn($r) => [
                    'jour'   => $r['jour'],
                    'ventes' => (int)$r['ventes'],
                    'ca'     => (float)$r['ca'],
                ], $ventesSemaine),
                'repartition_stock' => [
                    ['name' => 'Normal',   'value' => (int)$rep['normal']],
                    ['name' => 'Critique', 'value' => (int)$rep['critique']],
                    ['name' => 'Rupture',  'value' => (int)$rep['rupture']],
                ],
                'top10_produits'   => array_map(fn($r) => [
                    'nom'         => $r['nom'],
                    'image_url'   => $r['image_url'],
                    'total_vendu' => (int)$r['total_vendu'],
                    'ca_total'    => (float)$r['ca_total'],
                ], $top10),
                'dernieres_ventes' => array_map(fn($r) => [
                    'id'            => (int)$r['id'],
                    'numero'        => $r['numero'],
                    'total_ttc'     => (float)$r['total_ttc'],
                    'mode_paiement' => $r['mode_paiement'],
                    'created_at'    => $r['created_at'],
                    'caissier'      => $r['caissier'],
                    'nb_articles'   => (int)$r['nb_articles'],
                    'statut'        => $r['statut'],
                ], $dernieres),
            ],
        ]);
    }
}
