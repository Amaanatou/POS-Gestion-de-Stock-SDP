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

require_once 'config/database.php';
require_once 'routes/api.php';
