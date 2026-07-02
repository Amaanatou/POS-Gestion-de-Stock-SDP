<?php
// index.php — Point d'entrée unique de l'API SunuStock
// Tous les appels React passent par ce fichier

// En-têtes CORS — obligatoires pour que React puisse appeler l'API
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Répondre immédiatement aux pré-vérifications OPTIONS du navigateur
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Gestionnaire d'erreurs global ───────────────────────────────
// Au lieu d'un « 500 » muet, l'API renvoie le message réel en JSON.
// Très pratique pour déboguer ; à restreindre/masquer en production.
set_exception_handler(function (\Throwable $e) {
    if (!headers_sent()) http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'type'    => get_class($e),
    ], JSON_UNESCAPED_UNICODE);
});
register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        if (!headers_sent()) http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Erreur fatale : ' . $err['message'],
        ], JSON_UNESCAPED_UNICODE);
    }
});

require_once 'config/database.php';
require_once 'routes/api.php';
