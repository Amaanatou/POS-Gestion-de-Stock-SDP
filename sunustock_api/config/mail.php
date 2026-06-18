<?php
// config/mail.php — Configuration SMTP pour l'envoi des reçus par e-mail (§2.3)
//
// ⚠️ À REMPLIR avec une adresse Gmail + un "mot de passe d'application" (16 lettres).
//    Ce N'EST PAS ton mot de passe Gmail habituel. Pour l'obtenir :
//    Compte Google → Sécurité → activer la "Validation en 2 étapes"
//    → "Mots de passe des applications" → générer un mot de passe → coller ci-dessous.

define('MAIL_HOST', 'smtp.gmail.com');
define('MAIL_PORT', 587);
define('MAIL_USER', 'TON_EMAIL@gmail.com');     // ← remplace par ton adresse Gmail
define('MAIL_PASS', 'xxxxxxxxxxxxxxxx');        // ← mot de passe d'application (16 lettres, sans espaces)
define('MAIL_FROM_NAME', 'SunuStock');
