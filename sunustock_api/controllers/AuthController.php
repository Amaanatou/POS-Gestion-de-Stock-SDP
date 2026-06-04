<?php
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class AuthController {
    public function __construct(private PDO $pdo) {}

    public function login(): void {
        $d     = json_decode(file_get_contents('php://input'), true);
        $email = trim($d['email']        ?? '');
        $mdp   = trim($d['mot_de_passe'] ?? '');

        if (!$email || !$mdp) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Email et mot de passe requis']);
            return;
        }

        $stmt = $this->pdo->prepare(
            'SELECT id, nom, prenom, email, mot_de_passe, role, actif
             FROM utilisateurs WHERE email = ? LIMIT 1'
        );
        $stmt->execute([$email]);
        $u = $stmt->fetch();

        if (!$u || !$u['actif'] || !password_verify($mdp, $u['mot_de_passe'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Identifiants incorrects']);
            return;
        }

        $this->pdo->prepare(
            'UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = ?'
        )->execute([$u['id']]);

        $token = genererToken([
            'id'    => $u['id'],
            'email' => $u['email'],
            'role'  => $u['role'],
            'nom'   => $u['prenom'] . ' ' . $u['nom'],
        ]);

        echo json_encode([
            'success'      => true,
            'token'        => $token,
            'utilisateur'  => [
                'id'     => $u['id'],
                'nom'    => $u['nom'],
                'prenom' => $u['prenom'],
                'email'  => $u['email'],
                'role'   => $u['role'],
            ],
        ]);
    }

    public function profil(): void {
        $u = auth();
        $s = $this->pdo->prepare(
            'SELECT id, nom, prenom, email, role, derniere_connexion
             FROM utilisateurs WHERE id = ?'
        );
        $s->execute([$u['id']]);
        echo json_encode(['success' => true, 'data' => $s->fetch()]);
    }

    public function logout(): void {
        auth(); // Vérifie juste que le token est valide
        // JWT est stateless : le vrai logout se fait côté client (supprimer le token)
        echo json_encode(['success' => true, 'message' => 'Déconnexion effectuée']);
    }
}
