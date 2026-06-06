<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class ProduitController {
    private string $uploadDir;
    private string $uploadUrl;

    public function __construct(private PDO $pdo) {
        $this->uploadDir = __DIR__ . '/../uploads/produits/';
        // URL absolue pour que React (port 5173) puisse charger les images depuis Apache (port 80)
        $protocole       = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $hote            = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $this->uploadUrl = "$protocole://$hote/sunustock_api/uploads/produits/";
    }

    public function lister(): void {
        auth();
        $search = $_GET['search']    ?? '';
        $cat    = $_GET['categorie'] ?? '';
        $statut = $_GET['statut']    ?? '';

        $sql    = 'SELECT p.id, p.nom, p.code_barre, p.sku, p.marque,
                          p.prix_achat, p.prix_vente, p.tva,
                          p.seuil_alerte, p.image_url, p.emplacement,
                          c.nom AS categorie,
                          s.quantite,
                          CASE WHEN s.quantite = 0              THEN "rupture"
                               WHEN s.quantite <= p.seuil_alerte THEN "critique"
                               ELSE "normal" END AS statut_stock
                   FROM produits p
                   LEFT JOIN categories c ON c.id = p.categorie_id
                   LEFT JOIN stocks     s ON s.produit_id = p.id
                   WHERE p.actif = 1';
        $params = [];

        if ($search) { $sql .= ' AND p.nom LIKE ?';      $params[] = "%$search%"; }
        if ($cat)    { $sql .= ' AND c.nom = ?';          $params[] = $cat; }
        if ($statut === 'rupture')  $sql .= ' AND s.quantite = 0';
        if ($statut === 'critique') $sql .= ' AND s.quantite > 0 AND s.quantite <= p.seuil_alerte';
        if ($statut === 'normal')   $sql .= ' AND s.quantite > p.seuil_alerte';

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
                    p.image_url, c.nom AS categorie, s.quantite
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

        // Récupérer les données (FormData ou JSON)
        $d = $this->getDonnees();

        if (empty($d['nom']) || !isset($d['prix_vente'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nom et prix de vente requis']);
            return;
        }

        $catId    = $this->resoudreCategorieId($d['categorie'] ?? '');
        $imageUrl = $this->uploadImage();

        $stmt = $this->pdo->prepare(
            'INSERT INTO produits
             (nom, code_barre, sku, marque, categorie_id,
              prix_achat, prix_vente, tva, seuil_alerte, emplacement, image_url)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $d['nom'],
            $d['code_barre']   ?? null,
            $d['sku']          ?? null,
            $d['marque']       ?? null,
            $catId,
            $d['prix_achat']   ?? 0,
            $d['prix_vente'],
            $d['tva']          ?? 18,
            $d['seuil_alerte'] ?? 5,
            $d['emplacement']  ?? null,
            $imageUrl,
        ]);
        $newId = $this->pdo->lastInsertId();
        $this->pdo->prepare('INSERT INTO stocks (produit_id, quantite) VALUES (?, 0)')
                  ->execute([$newId]);

        echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Produit créé avec succès']);
    }

    public function modifier(int $id): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);

        $d     = $this->getDonnees();
        $catId = $this->resoudreCategorieId($d['categorie'] ?? '');

        // Gérer l'image : nouvelle image ou conserver l'ancienne
        $imageUrl = $this->uploadImage();
        if (!$imageUrl) {
            // Pas de nouvelle image → garder l'existante
            $s = $this->pdo->prepare('SELECT image_url FROM produits WHERE id=?');
            $s->execute([$id]);
            $imageUrl = $s->fetchColumn();
        }

        $this->pdo->prepare(
            'UPDATE produits
             SET nom=?, code_barre=?, marque=?, categorie_id=?,
                 prix_achat=?, prix_vente=?, seuil_alerte=?, emplacement=?, image_url=?
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
            $imageUrl,
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

    // ── Helpers ─────────────────────────────────────────────

    // Récupère les données depuis FormData ou JSON
    private function getDonnees(): array {
        if (!empty($_POST)) return $_POST;
        return json_decode(file_get_contents('php://input'), true) ?? [];
    }

    // Upload image et retourne l'URL ou null
    private function uploadImage(): ?string {
        if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            return null;
        }
        $file = $_FILES['image'];

        // Vérifier le type
        $typesAutorisés = ['image/jpeg','image/png','image/webp','image/gif'];
        if (!in_array($file['type'], $typesAutorisés)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Format image non autorisé (jpg, png, webp)']);
            exit;
        }

        // Vérifier la taille (max 5 Mo)
        if ($file['size'] > 5 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Image trop grande (max 5 Mo)']);
            exit;
        }

        // Générer un nom unique
        $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
        $nomFich  = uniqid('prod_', true) . '.' . strtolower($ext);
        $chemin   = $this->uploadDir . $nomFich;

        if (!move_uploaded_file($file['tmp_name'], $chemin)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'enregistrement de l\'image']);
            exit;
        }

        // Redimensionner si GD disponible (max 800px)
        $this->redimensionner($chemin, $file['type']);

        return $this->uploadUrl . $nomFich;
    }

    // Redimensionner l'image si elle dépasse 800px
    private function redimensionner(string $chemin, string $type): void {
        if (!function_exists('imagecreatefromjpeg')) return;
        [$largeur, $hauteur] = getimagesize($chemin);
        $max = 800;
        if ($largeur <= $max && $hauteur <= $max) return;

        $ratio   = min($max / $largeur, $max / $hauteur);
        $newL    = (int)($largeur * $ratio);
        $newH    = (int)($hauteur * $ratio);
        $src     = match($type) {
            'image/png'  => imagecreatefrompng($chemin),
            'image/webp' => imagecreatefromwebp($chemin),
            default      => imagecreatefromjpeg($chemin),
        };
        $dst = imagecreatetruecolor($newL, $newH);
        imagecopyresampled($dst, $src, 0,0,0,0, $newL, $newH, $largeur, $hauteur);
        match($type) {
            'image/png'  => imagepng($dst, $chemin),
            'image/webp' => imagewebp($dst, $chemin),
            default      => imagejpeg($dst, $chemin, 85),
        };
        imagedestroy($src);
        imagedestroy($dst);
    }

    private function resoudreCategorieId(string $nom): ?int {
        if (!$nom) return null;
        $sc = $this->pdo->prepare('SELECT id FROM categories WHERE nom = ? LIMIT 1');
        $sc->execute([$nom]);
        return $sc->fetchColumn() ?: null;
    }

    // ── ACCESSOIRES / PRODUITS LIÉS ─────────────────────────

    // Liste des accessoires suggérés pour un produit
    public function accessoires(int $id): void {
        auth();
        $s = $this->pdo->prepare(
            'SELECT p.id, p.nom, p.prix_vente, p.image_url,
                    c.nom AS categorie,
                    ap.remise_pack,
                    s.quantite
             FROM accessoires_produits ap
             JOIN produits p   ON p.id = ap.accessoire_id
             LEFT JOIN categories c ON c.id = p.categorie_id
             LEFT JOIN stocks     s ON s.produit_id = p.id
             WHERE ap.produit_id = ? AND p.actif = 1'
        );
        $s->execute([$id]);
        echo json_encode(['success' => true, 'data' => $s->fetchAll()]);
    }

    // Lier un accessoire à un produit (manager/admin)
    public function lierAccessoire(int $id): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $d      = json_decode(file_get_contents('php://input'), true);
        $accId  = (int)($d['accessoire_id'] ?? 0);
        $remise = (float)($d['remise_pack'] ?? 0);

        if (!$accId || $accId === $id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Accessoire invalide']);
            return;
        }
        $this->pdo->prepare(
            'INSERT INTO accessoires_produits (produit_id, accessoire_id, remise_pack)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE remise_pack = VALUES(remise_pack)'
        )->execute([$id, $accId, $remise]);
        echo json_encode(['success' => true, 'message' => 'Accessoire lié']);
    }

    // Délier un accessoire (manager/admin)
    public function delierAccessoire(int $id, int $accId): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $this->pdo->prepare(
            'DELETE FROM accessoires_produits WHERE produit_id = ? AND accessoire_id = ?'
        )->execute([$id, $accId]);
        echo json_encode(['success' => true, 'message' => 'Accessoire retiré']);
    }
}
