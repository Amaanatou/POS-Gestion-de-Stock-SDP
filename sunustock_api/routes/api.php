<?php
require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/ProduitController.php';
require_once __DIR__ . '/../controllers/StockController.php';
require_once __DIR__ . '/../controllers/AlerteController.php';
require_once __DIR__ . '/../controllers/VenteController.php';
require_once __DIR__ . '/../controllers/DashboardController.php';
require_once __DIR__ . '/../controllers/ClientController.php';
require_once __DIR__ . '/../controllers/FournisseurController.php';
require_once __DIR__ . '/../controllers/UtilisateurController.php';
require_once __DIR__ . '/../controllers/JournalController.php';

$method   = $_SERVER['REQUEST_METHOD'];
$uri      = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$segments = explode('/', trim($uri, '/'));

// Support method override : POST avec _method=PUT (pour upload image)
if ($method === 'POST' && !empty($_POST['_method'])) {
    $method = strtoupper($_POST['_method']);
}

// segments[0] = 'sunustock_api', [1] = base, [2] = sub, [3] = subsub
$base   = $segments[1] ?? '';
$sub    = $segments[2] ?? '';
$subsub = $segments[3] ?? '';

// ── AUTH ─────────────────────────────────────────────────────
if ($base === 'auth') {
    $c = new AuthController($pdo);
    match ("$method $sub") {
        'POST login'  => $c->login(),
        'POST logout' => $c->logout(),
        'GET profil'  => $c->profil(),
        default       => notFound(),
    };
    exit;
}

// ── PRODUITS ─────────────────────────────────────────────────
if ($base === 'produits') {
    $c = new ProduitController($pdo);
    // Accessoires (produit/{id}/accessoires) — placé avant les routes génériques
    if (is_numeric($sub) && $subsub === 'accessoires') {
        $accId = (int)($segments[4] ?? 0);
        if ($method === 'GET')    { $c->accessoires($sub);             exit; }
        if ($method === 'POST')   { $c->lierAccessoire($sub);          exit; }
        if ($method === 'DELETE') { $c->delierAccessoire($sub, $accId); exit; }
    }
    // Galerie d'images (produit/{id}/images)
    if (is_numeric($sub) && $subsub === 'images') {
        $imgId = (int)($segments[4] ?? 0);
        if ($method === 'GET')    { $c->listerImages($sub);           exit; }
        if ($method === 'POST')   { $c->ajouterImage($sub);           exit; }
        if ($method === 'DELETE') { $c->supprimerImage($sub, $imgId); exit; }
    }
    if ($method === 'GET'    && !$sub)            { $c->lister();          exit; }
    if ($method === 'GET'    && $sub === 'barre') { $c->parBarre($subsub); exit; }
    if ($method === 'GET'    && is_numeric($sub)) { $c->obtenir($sub);     exit; }
    if ($method === 'POST'   && !$sub)            { $c->creer();           exit; }
    if ($method === 'PUT'    && is_numeric($sub)) { $c->modifier($sub);    exit; }
    if ($method === 'DELETE' && is_numeric($sub)) { $c->archiver($sub);    exit; }
}

// ── STOCKS ───────────────────────────────────────────────────
if ($base === 'stocks') {
    $c = new StockController($pdo);
    if ($method === 'GET'  && !$sub)              { $c->lister();      exit; }
    if ($method === 'GET'  && is_numeric($sub))   { $c->obtenir($sub); exit; }
    if ($method === 'POST' && $sub === 'entree')  { $c->entree();      exit; }
    if ($method === 'POST' && $sub === 'sortie')  { $c->sortie();      exit; }
    if ($method === 'POST' && $sub === 'ajust')   { $c->ajustement();  exit; }
}

// ── MOUVEMENTS ───────────────────────────────────────────────
if ($base === 'mouvements' && $method === 'GET') {
    (new StockController($pdo))->mouvements();
    exit;
}

// ── ALERTES ──────────────────────────────────────────────────
if ($base === 'alertes') {
    $c = new AlerteController($pdo);
    if ($method === 'GET' && !$sub)                                    { $c->lister();         exit; }
    if (in_array($method, ['PUT','PATCH']) && is_numeric($sub)
        && $subsub === 'lue')                                          { $c->marquerLue($sub); exit; }
}

// ── VENTES ───────────────────────────────────────────────────
if ($base === 'ventes') {
    $c = new VenteController($pdo);
    if ($method === 'POST' && !$sub)                                     { $c->creer();        exit; }
    if ($method === 'GET'  && !$sub)                                     { $c->lister();       exit; }
    if ($method === 'GET'  && is_numeric($sub) && $subsub === 'recu')    { $c->recu($sub);     exit; }
    if ($method === 'GET'  && is_numeric($sub) && !$subsub)              { $c->details($sub);  exit; }
    if ($method === 'POST' && is_numeric($sub) && $subsub === 'annuler') { $c->annuler($sub);  exit; }
}

// ── DASHBOARD ────────────────────────────────────────────────
if ($base === 'dashboard' && $sub === 'stats' && $method === 'GET') {
    (new DashboardController($pdo))->stats();
    exit;
}

// ── CLIENTS ──────────────────────────────────────────────────
if ($base === 'clients') {
    $c = new ClientController($pdo);
    if ($method === 'GET'  && !$sub)                 { $c->lister();           exit; }
    if ($method === 'GET'  && $sub === 'recherche')  { $c->rechercher($subsub); exit; }
    if ($method === 'POST' && !$sub)                 { $c->creer();            exit; }
    if ($method === 'PUT'  && is_numeric($sub))      { $c->modifier($sub);     exit; }
}

// ── JOURNAL D'AUDIT (admin) ──────────────────────────────────
if ($base === 'journal' && $method === 'GET') {
    (new JournalController($pdo))->lister();
    exit;
}

// ── UTILISATEURS (gestion du personnel — admin) ──────────────
if ($base === 'utilisateurs') {
    $c = new UtilisateurController($pdo);
    if ($method === 'GET'    && !$sub)            { $c->lister();           exit; }
    if ($method === 'POST'   && !$sub)            { $c->creer();            exit; }
    if ($method === 'PUT'    && is_numeric($sub)) { $c->modifier($sub);     exit; }
    if ($method === 'PATCH'  && is_numeric($sub)
        && $subsub === 'actif')                   { $c->basculerActif($sub); exit; }
}

// ── FOURNISSEURS ─────────────────────────────────────────────
if ($base === 'fournisseurs') {
    $c = new FournisseurController($pdo);
    if ($method === 'GET'    && !$sub)            { $c->lister();           exit; }
    if ($method === 'POST'   && !$sub)            { $c->creer();            exit; }
    if ($method === 'PUT'    && is_numeric($sub)) { $c->modifier($sub);     exit; }
    if ($method === 'PATCH'  && is_numeric($sub)
        && $subsub === 'actif')                   { $c->basculerActif($sub); exit; }
}

// ── CATÉGORIES ───────────────────────────────────────────────
if ($base === 'categories' && $method === 'GET') {
    $rows = $pdo->query('SELECT * FROM categories ORDER BY nom')->fetchAll();
    echo json_encode(['success' => true, 'data' => $rows]);
    exit;
}

notFound();

function notFound(): void {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Route introuvable']);
}
