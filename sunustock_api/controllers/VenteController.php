<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class VenteController {
    public function __construct(private PDO $pdo) {}

    public function creer(): void {
        $user   = auth();
        $d      = json_decode(file_get_contents('php://input'), true);
        $lignes = $d['lignes']        ?? [];
        $mode   = $d['mode_paiement'] ?? 'especes';

        if (empty($lignes)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Le panier est vide']);
            return;
        }

        $this->pdo->beginTransaction();
        try {
            // Calculer les totaux
            $totalHT = $totalTVA = 0;
            foreach ($lignes as $l) {
                $ht        = $l['prix_vente'] * $l['quantite'];
                $tva       = $ht * (($l['tva'] ?? 18) / 100);
                $totalHT  += $ht;
                $totalTVA += $tva;
            }
            $totalTTC = $totalHT + $totalTVA;
            $numero   = 'VNT-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), 0, 6));

            // Créer l'en-tête de vente
            $sv = $this->pdo->prepare(
                'INSERT INTO ventes
                 (numero, utilisateur_id, total_ht, total_tva, total_ttc, mode_paiement)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $sv->execute([$numero, $user['id'], $totalHT, $totalTVA, $totalTTC, $mode]);
            $venteId = $this->pdo->lastInsertId();

            // Insérer les lignes + décrémenter le stock
            foreach ($lignes as $l) {
                $sousTot = $l['prix_vente'] * $l['quantite'];

                $this->pdo->prepare(
                    'INSERT INTO lignes_ventes
                     (vente_id, produit_id, nom_produit, quantite, prix_unitaire, tva, sous_total)
                     VALUES (?, ?, ?, ?, ?, ?, ?)'
                )->execute([
                    $venteId, $l['produit_id'], $l['nom'],
                    $l['quantite'], $l['prix_vente'], $l['tva'] ?? 18, $sousTot,
                ]);

                // Décrémenter le stock
                $this->pdo->prepare(
                    'UPDATE stocks SET quantite = quantite - ? WHERE produit_id = ?'
                )->execute([$l['quantite'], $l['produit_id']]);

                // Enregistrer le mouvement de sortie
                $sq = $this->pdo->prepare('SELECT quantite FROM stocks WHERE produit_id = ?');
                $sq->execute([$l['produit_id']]);
                $apres = (int)$sq->fetchColumn();
                $avant = $apres + $l['quantite'];

                $this->pdo->prepare(
                    'INSERT INTO mouvements_stock
                     (produit_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif, utilisateur_id)
                     VALUES (?, "sortie", ?, ?, ?, "Vente caisse", ?)'
                )->execute([$l['produit_id'], $l['quantite'], $avant, $apres, $user['id']]);

                // Générer une alerte si besoin
                $sp = $this->pdo->prepare('SELECT seuil_alerte FROM produits WHERE id = ?');
                $sp->execute([$l['produit_id']]);
                $seuil = (int)$sp->fetchColumn();
                if ($apres === 0) {
                    $this->pdo->prepare(
                        'INSERT INTO alertes_stock (produit_id, type_alerte, quantite_actuelle, seuil)
                         VALUES (?, "rupture", 0, ?)'
                    )->execute([$l['produit_id'], $seuil]);
                } elseif ($apres <= $seuil) {
                    $this->pdo->prepare(
                        'INSERT INTO alertes_stock (produit_id, type_alerte, quantite_actuelle, seuil)
                         VALUES (?, "critique", ?, ?)'
                    )->execute([$l['produit_id'], $apres, $seuil]);
                }
            }

            $this->pdo->commit();
            echo json_encode([
                'success' => true,
                'id'      => $venteId,
                'numero'  => $numero,
                'total'   => $totalTTC,
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function recu(int $id): void {
        auth();
        $sv = $this->pdo->prepare('SELECT * FROM ventes WHERE id = ?');
        $sv->execute([$id]);
        $vente = $sv->fetch();
        if (!$vente) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Vente introuvable']);
            return;
        }
        $sl = $this->pdo->prepare('SELECT * FROM lignes_ventes WHERE vente_id = ?');
        $sl->execute([$id]);
        echo json_encode([
            'success' => true,
            'data'    => ['vente' => $vente, 'lignes' => $sl->fetchAll()],
        ]);
    }
}
