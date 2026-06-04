<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class ProduitController {
    public function __construct(private PDO $pdo) {}

    public function lister(): void {
        auth();
        $search = $_GET['search']    ?? '';
        $cat    = $_GET['categorie'] ?? '';

        $sql    = 'SELECT p.id, p.nom, p.code_barre, p.sku, p.marque,
                          p.prix_achat, p.prix_vente, p.tva,
                          p.seuil_alerte, p.image_url, p.emplacement,
                          c.nom AS categorie
                   FROM produits p
                   LEFT JOIN categories c ON c.id = p.categorie_id
                   WHERE p.actif = 1';
        $params = [];

        if ($search) { $sql .= ' AND p.nom LIKE ?'; $params[] = "%$search%"; }
        if ($cat)    { $sql .= ' AND c.nom = ?';    $params[] = $cat; }
        $sql .= ' ORDER BY p.nom ASC';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $rows, 'total' => count($rows)]);
    }

    public function obtenir(int $id): void {
        auth();
        $s = $this->pdo->prepare(
            'SELECT p.*, c.nom AS categorie,
                    s.quantite,
                    CASE WHEN s.quantite = 0              THEN "rupture"
                         WHEN s.quantite <= p.seuil_alerte THEN "critique"
                         ELSE "normal" END AS statut
             FROM produits p
             LEFT JOIN categories c ON c.id = p.categorie_id
             LEFT JOIN stocks     s ON s.produit_id = p.id
             WHERE p.id = ? AND p.actif = 1'
        );
        $s->execute([$id]);
        $p = $s->fetch();
        if (!$p) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Produit introuvable']);
            return;
        }
        echo json_encode(['success' => true, 'data' => $p]);
    }

    public function parBarre(string $code): void {
        auth();
        $s = $this->pdo->prepare(
            'SELECT p.id, p.nom, p.code_barre, p.prix_vente, p.tva,
                    c.nom AS categorie, s.quantite
             FROM produits p
             LEFT JOIN categories c ON c.id = p.categorie_id
             LEFT JOIN stocks     s ON s.produit_id = p.id
             WHERE p.code_barre = ? AND p.actif = 1 LIMIT 1'
        );
        $s->execute([$code]);
        $p = $s->fetch();
        if (!$p) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Produit non trouvé']);
            return;
        }
        echo json_encode(['success' => true, 'data' => $p]);
    }

    public function creer(): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $d = json_decode(file_get_contents('php://input'), true);

        if (empty($d['nom']) || !isset($d['prix_vente'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nom et prix de vente requis']);
            return;
        }

        $catId = $this->resoudreCategorieId($d['categorie'] ?? '');

        $stmt = $this->pdo->prepare(
            'INSERT INTO produits
             (nom, code_barre, sku, marque, categorie_id,
              prix_achat, prix_vente, tva, seuil_alerte, emplacement)
             VALUES (?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $d['nom'],
            $d['code_barre']  ?? null,
            $d['sku']         ?? null,
            $d['marque']      ?? null,
            $catId,
            $d['prix_achat']  ?? 0,
            $d['prix_vente'],
            $d['tva']         ?? 18,
            $d['seuil_alerte'] ?? 5,
            $d['emplacement'] ?? null,
        ]);
        $newId = $this->pdo->lastInsertId();
        // Créer la ligne stock initiale à 0
        $this->pdo->prepare('INSERT INTO stocks (produit_id, quantite) VALUES (?, 0)')
                  ->execute([$newId]);

        echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Produit créé avec succès']);
    }

    public function modifier(int $id): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $d     = json_decode(file_get_contents('php://input'), true);
        $catId = $this->resoudreCategorieId($d['categorie'] ?? '');

        $this->pdo->prepare(
            'UPDATE produits
             SET nom=?, code_barre=?, marque=?, categorie_id=?,
                 prix_achat=?, prix_vente=?, seuil_alerte=?, emplacement=?
             WHERE id = ?'
        )->execute([
            $d['nom'],
            $d['code_barre']   ?? null,
            $d['marque']       ?? null,
            $catId,
            $d['prix_achat']   ?? 0,
            $d['prix_vente'],
            $d['seuil_alerte'] ?? 5,
            $d['emplacement']  ?? null,
            $id,
        ]);
        echo json_encode(['success' => true, 'message' => 'Produit modifié avec succès']);
    }

    public function archiver(int $id): void {
        $user = auth();
        autoriser(['admin'], $user);
        $this->pdo->prepare('UPDATE produits SET actif = 0 WHERE id = ?')->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Produit archivé']);
    }

    private function resoudreCategorieId(string $nom): ?int {
        if (!$nom) return null;
        $sc = $this->pdo->prepare('SELECT id FROM categories WHERE nom = ? LIMIT 1');
        $sc->execute([$nom]);
        return $sc->fetchColumn() ?: null;
    }
}
