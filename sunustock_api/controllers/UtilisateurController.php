<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class UtilisateurController {
    public function __construct(private PDO $pdo) {}

    // Liste du personnel (admin uniquement) — sans les mots de passe
    public function lister(): void {
        $user = auth();
        autoriser(['admin'], $user);
        $rows = $this->pdo->query(
            'SELECT id, nom, prenom, email, role, actif, derniere_connexion, created_at
             FROM utilisateurs ORDER BY role, nom'
        )->fetchAll();
        echo json_encode(['success' => true, 'data' => $rows]);
    }

    // Créer un compte (admin uniquement)
    public function creer(): void {
        $user = auth();
        autoriser(['admin'], $user);
        $d = json_decode(file_get_contents('php://input'), true);

        $nom    = trim($d['nom']    ?? '');
        $prenom = trim($d['prenom'] ?? '');
        $email  = trim($d['email']  ?? '');
        $mdp    = $d['mot_de_passe'] ?? '';
        $role   = $d['role'] ?? 'caissier';

        if (!$nom || !$prenom || !$email || !$mdp) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Tous les champs sont requis']);
            return;
        }
        if (!in_array($role, ['caissier', 'manager', 'admin'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Rôle invalide']);
            return;
        }
        if (strlen($mdp) < 6) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Mot de passe trop court (min 6 caractères)']);
            return;
        }

        // Email unique
        $check = $this->pdo->prepare('SELECT id FROM utilisateurs WHERE email = ?');
        $check->execute([$email]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Cet email existe déjà']);
            return;
        }

        // Hash bcrypt coût 12 (exigence sécurité du cahier des charges)
        $hash = password_hash($mdp, PASSWORD_BCRYPT, ['cost' => 12]);

        $this->pdo->prepare(
            'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([$nom, $prenom, $email, $hash, $role]);

        echo json_encode([
            'success' => true,
            'id'      => $this->pdo->lastInsertId(),
            'message' => 'Compte créé',
        ]);
    }

    // Modifier un compte (admin uniquement) — mot de passe optionnel
    public function modifier(int $id): void {
        $user = auth();
        autoriser(['admin'], $user);
        $d = json_decode(file_get_contents('php://input'), true);

        $nom    = trim($d['nom']    ?? '');
        $prenom = trim($d['prenom'] ?? '');
        $email  = trim($d['email']  ?? '');
        $role   = $d['role'] ?? 'caissier';

        if (!$nom || !$prenom || !$email) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nom, prénom et email requis']);
            return;
        }

        // Email unique (sauf lui-même)
        $check = $this->pdo->prepare('SELECT id FROM utilisateurs WHERE email = ? AND id <> ?');
        $check->execute([$email, $id]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Cet email est déjà utilisé']);
            return;
        }

        // Mise à jour des infos
        $this->pdo->prepare(
            'UPDATE utilisateurs SET nom = ?, prenom = ?, email = ?, role = ? WHERE id = ?'
        )->execute([$nom, $prenom, $email, $role, $id]);

        // Changement de mot de passe (seulement si fourni)
        if (!empty($d['mot_de_passe'])) {
            if (strlen($d['mot_de_passe']) < 6) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Mot de passe trop court']);
                return;
            }
            $hash = password_hash($d['mot_de_passe'], PASSWORD_BCRYPT, ['cost' => 12]);
            $this->pdo->prepare('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?')
                      ->execute([$hash, $id]);
        }

        echo json_encode(['success' => true, 'message' => 'Compte modifié']);
    }

    // Activer / désactiver un compte (admin) — on ne peut pas se désactiver soi-même
    public function basculerActif(int $id): void {
        $user = auth();
        autoriser(['admin'], $user);
        if ((int)$id === (int)$user['id']) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Vous ne pouvez pas désactiver votre propre compte']);
            return;
        }
        // Lire l'état avant bascule pour journaliser
        $su = $this->pdo->prepare('SELECT prenom, nom, actif FROM utilisateurs WHERE id = ?');
        $su->execute([$id]);
        $cible = $su->fetch();

        $this->pdo->prepare('UPDATE utilisateurs SET actif = 1 - actif WHERE id = ?')
                  ->execute([$id]);

        journaliser($this->pdo, $user['id'],
            $cible && $cible['actif'] ? 'desactivation_compte' : 'activation_compte',
            $cible ? $cible['prenom'] . ' ' . $cible['nom'] : 'Compte #' . $id);

        echo json_encode(['success' => true, 'message' => 'Statut mis à jour']);
    }
}
