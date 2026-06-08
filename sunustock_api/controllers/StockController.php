<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class StockController {
    public function __construct(private PDO $pdo) {}

    public function lister(): void {
        auth();
        $search = $_GET['search'] ?? '';
        $statut = $_GET['statut'] ?? '';

        $where  = 'WHERE p.actif = 1';
        $params = [];
        if ($search) {
            $where .= ' AND (p.nom LIKE ? OR p.code_barre LIKE ?)';
            $params[] = "%$search%";
            $params[] = "$search%";
        }
        if ($statut === 'rupture')  $where .= ' AND s.quantite = 0';
        if ($statut === 'critique') $where .= ' AND s.quantite > 0 AND s.quantite <= p.seuil_alerte';
        if ($statut === 'normal')   $where .= ' AND s.quantite > p.seuil_alerte';

        $base = "FROM stocks s
                 JOIN produits p ON p.id = s.produit_id
                 LEFT JOIN categories c ON c.id = p.categorie_id
                 $where";

        $select = "SELECT s.produit_id, s.quantite, s.updated_at,
                          p.nom, p.code_barre, p.seuil_alerte, p.prix_vente,
                          c.nom AS categorie,
                          CASE WHEN s.quantite = 0               THEN 'rupture'
                               WHEN s.quantite <= p.seuil_alerte THEN 'critique'
                               ELSE 'normal' END AS statut
                   $base
                   ORDER BY statut ASC, p.nom ASC";

        // Pagination si demandée
        if (isset($_GET['page'])) {
            $page    = max(1, (int)$_GET['page']);
            $perPage = min(100, max(5, (int)($_GET['per_page'] ?? 15)));
            $stc = $this->pdo->prepare("SELECT COUNT(*) $base");
            $stc->execute($params);
            $total  = (int)$stc->fetchColumn();
            $offset = ($page - 1) * $perPage;
            $stmt = $this->pdo->prepare("$select LIMIT $perPage OFFSET $offset");
            $stmt->execute($params);
            echo json_encode([
                'success'     => true,
                'data'        => $stmt->fetchAll(),
                'total'       => $total,
                'page'        => $page,
                'per_page'    => $perPage,
                'total_pages' => (int)ceil($total / $perPage),
            ]);
            return;
        }

        $stmt = $this->pdo->prepare($select);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $rows, 'total' => count($rows)]);
    }

    public function obtenir(int $id): void {
        auth();
        $s = $this->pdo->prepare(
            'SELECT s.*, p.nom, p.seuil_alerte
             FROM stocks s JOIN produits p ON p.id = s.produit_id
             WHERE s.produit_id = ?'
        );
        $s->execute([$id]);
        echo json_encode(['success' => true, 'data' => $s->fetch()]);
    }

    public function entree(): void {
        $user  = auth();
        autoriser(['manager', 'admin'], $user);
        $d     = json_decode(file_get_contents('php://input'), true);
        $pid   = (int)($d['produit_id'] ?? 0);
        $qte   = (int)($d['quantite']   ?? 0);
        $motif = $d['motif'] ?? 'Réception marchandises';

        if (!$pid || $qte <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'produit_id et quantite requis']);
            return;
        }

        $this->pdo->beginTransaction();
        try {
            $s = $this->pdo->prepare(
                'SELECT quantite FROM stocks WHERE produit_id = ? FOR UPDATE'
            );
            $s->execute([$pid]);
            $stock = $s->fetch();
            if (!$stock) throw new Exception('Produit non trouvé dans le stock');

            $avant = $stock['quantite'];
            $apres = $avant + $qte;

            $this->pdo->prepare('UPDATE stocks SET quantite = ? WHERE produit_id = ?')
                      ->execute([$apres, $pid]);

            $this->pdo->prepare(
                'INSERT INTO mouvements_stock
                 (produit_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif, utilisateur_id)
                 VALUES (?, "entree", ?, ?, ?, ?, ?)'
            )->execute([$pid, $qte, $avant, $apres, $motif, $user['id']]);

            // Récupérer le nom pour le journal
            $sn = $this->pdo->prepare('SELECT nom FROM produits WHERE id = ?');
            $sn->execute([$pid]);
            journaliser($this->pdo, $user['id'], 'entree_stock',
                $sn->fetchColumn() ?: ('Produit #' . $pid),
                "+$qte unités ($motif) — stock : $avant → $apres");

            $this->pdo->commit();
            echo json_encode([
                'success'         => true,
                'quantite_avant'  => $avant,
                'quantite_apres'  => $apres,
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function sortie(): void {
        $user  = auth();
        $d     = json_decode(file_get_contents('php://input'), true);
        $pid   = (int)($d['produit_id'] ?? 0);
        $qte   = (int)($d['quantite']   ?? 0);
        $motif = $d['motif'] ?? 'Vente';
        // Type de sortie : sortie (défaut), perte (casse/vol/péremption), retour
        $type  = in_array($d['type'] ?? '', ['sortie', 'perte', 'retour']) ? $d['type'] : 'sortie';

        if (!$pid || $qte <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Données invalides']);
            return;
        }

        $this->pdo->beginTransaction();
        try {
            $s = $this->pdo->prepare(
                'SELECT s.quantite, p.nom FROM stocks s
                 JOIN produits p ON p.id = s.produit_id
                 WHERE s.produit_id = ? FOR UPDATE'
            );
            $s->execute([$pid]);
            $stock = $s->fetch();
            if (!$stock) throw new Exception('Produit introuvable');
            if ($stock['quantite'] < $qte)
                throw new Exception('Stock insuffisant (' . $stock['quantite'] . ' disponible)');

            $avant = $stock['quantite'];
            $apres = $avant - $qte;

            $this->pdo->prepare('UPDATE stocks SET quantite = ? WHERE produit_id = ?')
                      ->execute([$apres, $pid]);

            $this->pdo->prepare(
                'INSERT INTO mouvements_stock
                 (produit_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif, utilisateur_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            )->execute([$pid, $type, $qte, $avant, $apres, $motif, $user['id']]);

            // Journaliser les pertes/casses (action sensible)
            if ($type === 'perte') {
                journaliser($this->pdo, $user['id'], 'perte_casse',
                    $stock['nom'], "-$qte unités ($motif) — stock : $avant → $apres");
            }

            // Générer une alerte si le stock passe sous le seuil
            $prod = $this->pdo->prepare('SELECT seuil_alerte FROM produits WHERE id = ?');
            $prod->execute([$pid]);
            $seuil = (int)$prod->fetchColumn();

            if ($apres === 0) {
                $this->pdo->prepare(
                    'INSERT INTO alertes_stock (produit_id, type_alerte, quantite_actuelle, seuil)
                     VALUES (?, "rupture", 0, ?)'
                )->execute([$pid, $seuil]);
            } elseif ($apres <= $seuil) {
                $this->pdo->prepare(
                    'INSERT INTO alertes_stock (produit_id, type_alerte, quantite_actuelle, seuil)
                     VALUES (?, "critique", ?, ?)'
                )->execute([$pid, $apres, $seuil]);
            }

            $this->pdo->commit();
            echo json_encode([
                'success'        => true,
                'quantite_avant' => $avant,
                'quantite_apres' => $apres,
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function ajustement(): void {
        $user   = auth();
        autoriser(['admin'], $user);
        $d      = json_decode(file_get_contents('php://input'), true);
        $pid    = (int)($d['produit_id']   ?? 0);
        $newQt  = (int)($d['nouvelle_qte'] ?? -1);
        $motif  = $d['motif'] ?? 'Ajustement manuel';

        if (!$pid || $newQt < 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Données invalides']);
            return;
        }

        $s = $this->pdo->prepare('SELECT quantite FROM stocks WHERE produit_id = ?');
        $s->execute([$pid]);
        $avant = (int)$s->fetchColumn();

        $this->pdo->prepare('UPDATE stocks SET quantite = ? WHERE produit_id = ?')
                  ->execute([$newQt, $pid]);

        $this->pdo->prepare(
            'INSERT INTO mouvements_stock
             (produit_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif, utilisateur_id)
             VALUES (?, "ajustement", ?, ?, ?, ?, ?)'
        )->execute([$pid, abs($newQt - $avant), $avant, $newQt, $motif, $user['id']]);

        journaliser($this->pdo, $user['id'], 'ajustement_stock',
            'Produit #' . $pid, "Stock : $avant → $newQt ($motif)");

        echo json_encode([
            'success'        => true,
            'quantite_avant' => $avant,
            'quantite_apres' => $newQt,
        ]);
    }

    public function mouvements(): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $rows = $this->pdo->query(
            'SELECT m.id,
                    m.type_mouvement            AS type,
                    m.quantite,
                    m.motif,
                    m.created_at,
                    p.nom                       AS nom_produit,
                    CONCAT(u.prenom," ",u.nom)  AS utilisateur
             FROM mouvements_stock m
             JOIN produits     p ON p.id = m.produit_id
             LEFT JOIN utilisateurs u ON u.id = m.utilisateur_id
             ORDER BY m.created_at DESC
             LIMIT 200'
        )->fetchAll();
        echo json_encode(['success' => true, 'data' => $rows]);
    }
}
