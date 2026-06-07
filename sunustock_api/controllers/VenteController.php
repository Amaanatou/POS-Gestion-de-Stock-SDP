<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class VenteController {
    public function __construct(private PDO $pdo) {}

    public function creer(): void {
        $user     = auth();
        $d        = json_decode(file_get_contents('php://input'), true);
        $lignes   = $d['lignes']        ?? [];
        $mode     = $d['mode_paiement'] ?? 'especes';
        $clientId = $d['client_id']     ?? null;   // client fidélité (optionnel)

        if (empty($lignes)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Le panier est vide']);
            return;
        }

        $this->pdo->beginTransaction();
        try {
            // Calculer le total HT brut (somme des lignes)
            $totalHTBrut = 0;
            foreach ($lignes as $l) {
                $totalHTBrut += $l['prix_vente'] * $l['quantite'];
            }

            // Remise fidélité automatique selon le niveau du client
            $tauxRemise = 0;
            if ($clientId) {
                $sc = $this->pdo->prepare('SELECT statut FROM clients WHERE id = ?');
                $sc->execute([$clientId]);
                $statut = $sc->fetchColumn();
                $tauxRemise = match ($statut) {
                    'or'  => 10,
                    'vip' => 5,
                    default => 0,
                };
            }
            $remiseClient = round($totalHTBrut * $tauxRemise / 100);

            // La TVA se calcule sur le HT APRÈS remise (comptabilité correcte)
            $totalHT  = $totalHTBrut - $remiseClient;
            $totalTVA = round($totalHT * 18 / 100);
            $totalTTC = $totalHT + $totalTVA;
            // Numéro unique : date + 8 caractères aléatoires (anti-collision)
            $numero   = 'VNT-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));

            // Créer l'en-tête de vente
            $sv = $this->pdo->prepare(
                'INSERT INTO ventes
                 (numero, client_id, utilisateur_id, total_ht, total_tva, total_ttc, mode_paiement)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $sv->execute([$numero, $clientId ?: null, $user['id'], $totalHT, $totalTVA, $totalTTC, $mode]);
            $venteId = $this->pdo->lastInsertId();

            // Insérer les lignes + décrémenter le stock
            foreach ($lignes as $l) {
                $sousTot = $l['prix_vente'] * $l['quantite'];

                // ── VÉRIFICATION DU STOCK (verrou FOR UPDATE) ──
                // Empêche de vendre plus que la quantité disponible.
                $sv2 = $this->pdo->prepare(
                    'SELECT s.quantite, p.nom
                     FROM stocks s JOIN produits p ON p.id = s.produit_id
                     WHERE s.produit_id = ? FOR UPDATE'
                );
                $sv2->execute([$l['produit_id']]);
                $stockActuel = $sv2->fetch();
                if (!$stockActuel) {
                    throw new Exception('Produit introuvable (ID ' . $l['produit_id'] . ')');
                }
                if ((int)$stockActuel['quantite'] < (int)$l['quantite']) {
                    throw new Exception(
                        'Stock insuffisant pour "' . $stockActuel['nom'] . '" : ' .
                        $stockActuel['quantite'] . ' disponible(s), ' . $l['quantite'] . ' demandé(s)'
                    );
                }

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

            // Cagnottage fidélité : 1 point par tranche de 1000 FCFA dépensés
            $pointsGagnes = 0;
            if ($clientId) {
                $pointsGagnes = (int)floor($totalTTC / 1000);
                if ($pointsGagnes > 0) {
                    $this->pdo->prepare(
                        'UPDATE clients SET points = points + ? WHERE id = ?'
                    )->execute([$pointsGagnes, $clientId]);
                }
            }

            $this->pdo->commit();
            echo json_encode([
                'success'       => true,
                'id'            => $venteId,
                'numero'        => $numero,
                'total'         => $totalTTC,
                'points_gagnes' => $pointsGagnes,
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

    // Liste de toutes les ventes (historique) — manager/admin
    public function lister(): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $rows = $this->pdo->query(
            'SELECT v.id, v.numero, v.total_ttc, v.mode_paiement,
                    v.statut, v.created_at,
                    CONCAT(u.prenom, " ", u.nom) AS caissier,
                    c.nom AS client,
                    (SELECT COUNT(*) FROM lignes_ventes lv WHERE lv.vente_id = v.id) AS nb_articles
             FROM ventes v
             JOIN utilisateurs u ON u.id = v.utilisateur_id
             LEFT JOIN clients  c ON c.id = v.client_id
             ORDER BY v.created_at DESC
             LIMIT 300'
        )->fetchAll();
        echo json_encode(['success' => true, 'data' => $rows]);
    }

    // Détails d'une vente (en-tête + lignes) — manager/admin
    public function details(int $id): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $sv = $this->pdo->prepare(
            'SELECT v.*, CONCAT(u.prenom," ",u.nom) AS caissier, c.nom AS client_nom
             FROM ventes v
             JOIN utilisateurs u ON u.id = v.utilisateur_id
             LEFT JOIN clients  c ON c.id = v.client_id
             WHERE v.id = ?'
        );
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

    // Annuler une vente : restaure le stock + trace un retour — manager/admin
    public function annuler(int $id): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);

        $this->pdo->beginTransaction();
        try {
            // Récupérer la vente (verrou)
            $sv = $this->pdo->prepare('SELECT * FROM ventes WHERE id = ? FOR UPDATE');
            $sv->execute([$id]);
            $vente = $sv->fetch();
            if (!$vente)                          throw new Exception('Vente introuvable');
            if ($vente['statut'] === 'annulee')   throw new Exception('Vente déjà annulée');

            // Restaurer le stock pour chaque ligne + tracer un mouvement "retour"
            $sl = $this->pdo->prepare('SELECT * FROM lignes_ventes WHERE vente_id = ?');
            $sl->execute([$id]);
            foreach ($sl->fetchAll() as $ligne) {
                $pid = $ligne['produit_id'];
                $qte = $ligne['quantite'];

                // Lire le stock actuel
                $sq = $this->pdo->prepare('SELECT quantite FROM stocks WHERE produit_id = ? FOR UPDATE');
                $sq->execute([$pid]);
                $avant = (int)$sq->fetchColumn();
                $apres = $avant + $qte;

                $this->pdo->prepare('UPDATE stocks SET quantite = ? WHERE produit_id = ?')
                          ->execute([$apres, $pid]);

                $this->pdo->prepare(
                    'INSERT INTO mouvements_stock
                     (produit_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif, utilisateur_id)
                     VALUES (?, "retour", ?, ?, ?, ?, ?)'
                )->execute([$pid, $qte, $avant, $apres,
                            'Annulation vente ' . $vente['numero'], $user['id']]);
            }

            // Retirer les points fidélité gagnés (si client)
            if ($vente['client_id']) {
                $points = (int)floor($vente['total_ttc'] / 1000);
                if ($points > 0) {
                    $this->pdo->prepare(
                        'UPDATE clients SET points = GREATEST(0, points - ?) WHERE id = ?'
                    )->execute([$points, $vente['client_id']]);
                }
            }

            // Marquer la vente comme annulée
            $this->pdo->prepare('UPDATE ventes SET statut = "annulee" WHERE id = ?')
                      ->execute([$id]);

            // Journaliser l'action critique
            journaliser($this->pdo, $user['id'], 'annulation_vente',
                'Vente ' . $vente['numero'],
                'Montant : ' . $vente['total_ttc'] . ' FCFA');

            $this->pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Vente annulée, stock restauré']);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}
