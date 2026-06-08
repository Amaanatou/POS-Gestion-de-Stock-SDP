<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class SessionCaisseController {
    public function __construct(private PDO $pdo) {}

    // Session de caisse actuellement ouverte (+ montant attendu calculé)
    public function courante(): void {
        auth();
        $s = $this->pdo->query(
            'SELECT sc.*, CONCAT(u.prenom, " ", u.nom) AS ouvert_par
             FROM sessions_caisse sc
             JOIN utilisateurs u ON u.id = sc.utilisateur_id
             WHERE sc.statut = "ouverte"
             ORDER BY sc.opened_at DESC LIMIT 1'
        )->fetch();

        if (!$s) {
            echo json_encode(['success' => true, 'data' => null]);
            return;
        }
        // Montant attendu = fond + ventes espèces depuis l'ouverture
        $s['ventes_especes'] = (float)$this->ventesEspeces($s['opened_at']);
        $s['montant_attendu'] = (float)$s['fond_initial'] + $s['ventes_especes'];
        echo json_encode(['success' => true, 'data' => $s]);
    }

    // Ouvrir la caisse (fond initial) — tout rôle connecté
    public function ouvrir(): void {
        $user = auth();
        // Refuser si une session est déjà ouverte
        $ouverte = $this->pdo->query('SELECT id FROM sessions_caisse WHERE statut = "ouverte" LIMIT 1')->fetch();
        if ($ouverte) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Une caisse est déjà ouverte']);
            return;
        }
        $d    = json_decode(file_get_contents('php://input'), true);
        $fond = (float)($d['fond_initial'] ?? 0);

        $this->pdo->prepare(
            'INSERT INTO sessions_caisse (utilisateur_id, fond_initial) VALUES (?, ?)'
        )->execute([$user['id'], $fond]);

        journaliser($this->pdo, $user['id'], 'ouverture_caisse', 'Caisse',
            'Fond initial : ' . $fond . ' FCFA');

        echo json_encode(['success' => true, 'message' => 'Caisse ouverte']);
    }

    // Fermer la caisse : compter le réel, calculer l'écart — manager/admin
    public function fermer(int $id): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $d       = json_decode(file_get_contents('php://input'), true);
        $compte  = (float)($d['montant_compte'] ?? 0);
        $note    = $d['note'] ?? '';

        $s = $this->pdo->prepare('SELECT * FROM sessions_caisse WHERE id = ? FOR UPDATE');
        $this->pdo->beginTransaction();
        try {
            $s->execute([$id]);
            $session = $s->fetch();
            if (!$session)                         throw new Exception('Session introuvable');
            if ($session['statut'] === 'fermee')   throw new Exception('Caisse déjà fermée');

            $attendu = (float)$session['fond_initial'] + (float)$this->ventesEspeces($session['opened_at']);
            $ecart   = $compte - $attendu;

            $this->pdo->prepare(
                'UPDATE sessions_caisse
                 SET montant_attendu = ?, montant_compte = ?, ecart = ?, note = ?,
                     statut = "fermee", closed_at = NOW()
                 WHERE id = ?'
            )->execute([$attendu, $compte, $ecart, $note, $id]);

            journaliser($this->pdo, $user['id'], 'fermeture_caisse', 'Caisse',
                'Attendu : ' . round($attendu) . ' — Compté : ' . round($compte) .
                ' — Écart : ' . round($ecart) . ' FCFA');

            $this->pdo->commit();
            echo json_encode([
                'success'         => true,
                'message'         => 'Caisse fermée',
                'montant_attendu' => $attendu,
                'ecart'           => $ecart,
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // Historique des sessions — manager/admin
    public function lister(): void {
        $user = auth();
        autoriser(['manager', 'admin'], $user);
        $rows = $this->pdo->query(
            'SELECT sc.*, CONCAT(u.prenom, " ", u.nom) AS ouvert_par
             FROM sessions_caisse sc
             JOIN utilisateurs u ON u.id = sc.utilisateur_id
             ORDER BY sc.opened_at DESC LIMIT 100'
        )->fetchAll();
        echo json_encode(['success' => true, 'data' => $rows]);
    }

    // Somme des ventes espèces validées depuis une date
    private function ventesEspeces(string $depuis): float {
        $st = $this->pdo->prepare(
            'SELECT COALESCE(SUM(total_ttc), 0) FROM ventes
             WHERE mode_paiement = "especes" AND statut = "validee" AND created_at >= ?'
        );
        $st->execute([$depuis]);
        return (float)$st->fetchColumn();
    }
}
