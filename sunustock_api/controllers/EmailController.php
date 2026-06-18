<?php
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../config/mail.php';
require_once __DIR__ . '/../lib/PHPMailer/Exception.php';
require_once __DIR__ . '/../lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../lib/PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

class EmailController {
    public function __construct(private PDO $pdo) {}

    // Envoyer le reçu d'une vente par e-mail — reçu dématérialisé (§2.3)
    public function envoyerRecu(): void {
        auth();
        $d       = json_decode(file_get_contents('php://input'), true);
        $venteId = (int)($d['vente_id'] ?? 0);
        $email   = trim($d['email'] ?? '');
        $image   = $d['image'] ?? '';

        if (!$venteId || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Vente ou adresse e-mail invalide']);
            return;
        }

        // La configuration SMTP est-elle bien renseignée ?
        if (!defined('MAIL_USER') || strpos(MAIL_USER, 'TON_EMAIL') !== false) {
            http_response_code(500);
            echo json_encode(['success' => false,
                'message' => "E-mail non configuré : renseigne config/mail.php (adresse Gmail + mot de passe d'application)."]);
            return;
        }

        // Récupérer la vente + ses lignes
        $sv = $this->pdo->prepare(
            'SELECT v.*, CONCAT(u.prenom," ",u.nom) AS caissier, c.nom AS client_nom
             FROM ventes v
             JOIN utilisateurs u ON u.id = v.utilisateur_id
             LEFT JOIN clients  c ON c.id = v.client_id
             WHERE v.id = ?'
        );
        $sv->execute([$venteId]);
        $vente = $sv->fetch();
        if (!$vente) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Vente introuvable']);
            return;
        }
        $sl = $this->pdo->prepare('SELECT * FROM lignes_ventes WHERE vente_id = ?');
        $sl->execute([$venteId]);
        $lignes = $sl->fetchAll();

        try {
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = MAIL_HOST;
            $mail->SMTPAuth   = true;
            $mail->Username   = MAIL_USER;
            $mail->Password   = MAIL_PASS;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = (int) MAIL_PORT;
            $mail->CharSet    = 'UTF-8';

            $mail->setFrom(MAIL_USER, defined('MAIL_FROM_NAME') ? MAIL_FROM_NAME : 'SunuStock');
            $mail->addAddress($email);
            $mail->isHTML(true);
            $mail->Subject = 'Votre reçu SunuStock — ' . $vente['numero'];
            $mail->Body    = $this->html($vente, $lignes);
            $mail->AltBody = 'Reçu ' . $vente['numero'] . ' — Total : ' . $this->f($vente['total_ttc']) . ' FCFA';

            // Pièce jointe : le ticket en image PNG (téléchargeable par le client)
            if ($image) {
                if (strpos($image, 'base64,') !== false) {
                    $image = explode('base64,', $image, 2)[1];
                }
                $raw = base64_decode($image, true);
                if ($raw) {
                    $mail->addStringAttachment($raw, 'recu-' . $vente['numero'] . '.png', 'base64', 'image/png');
                }
            }

            $mail->send();
            echo json_encode(['success' => true, 'message' => 'Reçu envoyé à ' . $email]);
        } catch (MailException $e) {
            http_response_code(500);
            echo json_encode(['success' => false,
                'message' => "Échec de l'envoi : " . ($mail->ErrorInfo ?: $e->getMessage())]);
        }
    }

    private function f($n): string {
        return number_format((float) $n, 0, ',', ' ');
    }

    // Construit le reçu HTML (aux couleurs SunuStock)
    private function html(array $v, array $lignes): string {
        $rows = '';
        foreach ($lignes as $l) {
            $rows .= '<tr>'
                . '<td style="padding:8px 0;border-bottom:1px solid #eee;color:#333">' . htmlspecialchars($l['nom_produit']) . '</td>'
                . '<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;color:#777">' . (int) $l['quantite'] . ' × ' . $this->f($l['prix_unitaire']) . '</td>'
                . '<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;color:#333;font-weight:600">' . $this->f($l['sous_total']) . ' F</td>'
                . '</tr>';
        }
        $date  = date('d/m/Y \à H:i', strtotime($v['created_at']));
        $modes = ['especes' => 'Espèces', 'carte' => 'Carte bancaire', 'mobile_money' => 'Mobile Money'];
        $mode  = $modes[$v['mode_paiement']] ?? $v['mode_paiement'];
        $client = $v['client_nom']
            ? '<p style="margin:2px 0;color:#777;font-size:13px">Client : ' . htmlspecialchars($v['client_nom']) . '</p>'
            : '';

        return '
<div style="max-width:480px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:24px">
  <div style="background:#1E3A5F;border-radius:14px 14px 0 0;padding:24px;text-align:center">
    <span style="font-size:26px;font-weight:800;color:#fff">Sunu</span><span style="font-size:26px;font-weight:800;color:#FF6B35">Stock</span>
    <p style="margin:6px 0 0;color:rgba(255,255,255,.7);font-size:12px">Reçu de caisse</p>
  </div>
  <div style="background:#fff;padding:24px;border-radius:0 0 14px 14px">
    <div style="border-bottom:1px dashed #ddd;padding-bottom:12px;margin-bottom:12px">
      <p style="margin:2px 0;color:#333;font-weight:700">Reçu N° ' . htmlspecialchars($v['numero']) . '</p>
      <p style="margin:2px 0;color:#777;font-size:13px">' . $date . '</p>
      <p style="margin:2px 0;color:#777;font-size:13px">Caissier : ' . htmlspecialchars($v['caissier']) . '</p>
      ' . $client . '
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">' . $rows . '</table>
    <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:14px">
      <tr><td style="color:#777;padding:3px 0">Total HT</td><td style="text-align:right;color:#555">' . $this->f($v['total_ht']) . ' FCFA</td></tr>
      <tr><td style="color:#777;padding:3px 0">TVA (18%)</td><td style="text-align:right;color:#555">' . $this->f($v['total_tva']) . ' FCFA</td></tr>
      <tr><td style="font-weight:800;color:#1E3A5F;padding:6px 0;font-size:16px;border-top:1px solid #eee">TOTAL TTC</td><td style="text-align:right;font-weight:800;color:#1E3A5F;font-size:16px;border-top:1px solid #eee">' . $this->f($v['total_ttc']) . ' FCFA</td></tr>
    </table>
    <p style="margin:14px 0 0;color:#777;font-size:13px">Mode de règlement : <strong style="color:#333">' . $mode . '</strong></p>
    <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px dashed #ddd">
      <p style="margin:0;color:#333;font-weight:600;font-size:14px">Merci de votre visite !</p>
      <p style="margin:4px 0 0;color:#aaa;font-size:11px">Échange sous 7 jours sur présentation de ce reçu.</p>
      <p style="margin:8px 0 0;color:#aaa;font-size:11px">SunuStock — Le confort par le digital</p>
    </div>
  </div>
</div>';
    }
}
