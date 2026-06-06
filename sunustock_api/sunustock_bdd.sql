-- ============================================================
-- BASE DE DONNÉES : SunuStock — Gestion de Stock PME v1.0
-- Auteur  : Ndeye Maty Gaye
-- Projet  : SunuStock — Application Web POS & Gestion de Stock
-- Date    : Juin 2026
-- UTILISATION : Supprimer la BDD existante, recréer, puis importer
-- ============================================================

CREATE DATABASE IF NOT EXISTS sunustock_gestion_stock
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sunustock_gestion_stock;

CREATE TABLE categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nom         VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fournisseurs (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    nom        VARCHAR(150) NOT NULL,
    telephone  VARCHAR(20),
    email      VARCHAR(100),
    adresse    TEXT,
    actif      TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE produits (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    nom          VARCHAR(200) NOT NULL,
    description  TEXT,
    code_barre   VARCHAR(50) UNIQUE,
    sku          VARCHAR(50) UNIQUE,
    marque       VARCHAR(100),
    categorie_id INT,
    prix_achat   DECIMAL(12,2) DEFAULT 0.00,
    prix_vente   DECIMAL(12,2) DEFAULT 0.00,
    tva          DECIMAL(5,2)  DEFAULT 18.00,
    image_url    VARCHAR(500),
    seuil_alerte INT DEFAULT 5,
    emplacement  VARCHAR(100),
    actif        TINYINT(1) DEFAULT 1,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_code_barre (code_barre),
    INDEX idx_nom        (nom)
);

CREATE TABLE stocks (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    produit_id INT NOT NULL UNIQUE,
    quantite   INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE
);

CREATE TABLE mouvements_stock (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    produit_id     INT NOT NULL,
    type_mouvement ENUM('entree','sortie','ajustement','perte','retour') NOT NULL,
    quantite       INT NOT NULL,
    quantite_avant INT NOT NULL,
    quantite_apres INT NOT NULL,
    motif          VARCHAR(255),
    utilisateur_id INT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
    INDEX idx_produit (produit_id),
    INDEX idx_date    (created_at)
);

CREATE TABLE alertes_stock (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    produit_id        INT NOT NULL,
    type_alerte       ENUM('critique','faible','rupture') NOT NULL,
    quantite_actuelle INT NOT NULL,
    seuil             INT NOT NULL,
    lue               TINYINT(1) DEFAULT 0,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE
);

CREATE TABLE utilisateurs (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    nom                VARCHAR(100) NOT NULL,
    prenom             VARCHAR(100) NOT NULL,
    email              VARCHAR(150) UNIQUE NOT NULL,
    mot_de_passe       VARCHAR(255) NOT NULL,
    role               ENUM('caissier','manager','admin') DEFAULT 'caissier',
    actif              TINYINT(1) DEFAULT 1,
    derniere_connexion TIMESTAMP NULL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clients (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    nom        VARCHAR(100) NOT NULL,
    telephone  VARCHAR(20) UNIQUE,
    statut     ENUM('standard','vip','or') DEFAULT 'standard',
    points     INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ventes (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    numero         VARCHAR(50) UNIQUE NOT NULL,
    client_id      INT,
    utilisateur_id INT NOT NULL,
    total_ht       DECIMAL(12,2) NOT NULL,
    total_tva      DECIMAL(12,2) NOT NULL,
    total_ttc      DECIMAL(12,2) NOT NULL,
    mode_paiement  ENUM('especes','carte','mobile_money') DEFAULT 'especes',
    montant_recu   DECIMAL(12,2),
    monnaie_rendue DECIMAL(12,2),
    statut         ENUM('validee','annulee') DEFAULT 'validee',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id)      REFERENCES clients(id)      ON DELETE SET NULL,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE RESTRICT
);

CREATE TABLE lignes_ventes (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    vente_id      INT NOT NULL,
    produit_id    INT NOT NULL,
    nom_produit   VARCHAR(200) NOT NULL,
    quantite      INT NOT NULL,
    prix_unitaire DECIMAL(12,2) NOT NULL,
    tva           DECIMAL(5,2)  NOT NULL,
    sous_total    DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (vente_id)   REFERENCES ventes(id)   ON DELETE CASCADE,
    FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE RESTRICT
);

-- Table de liaison produit ↔ accessoire (module Accessoires/Produits liés)
CREATE TABLE accessoires_produits (
    produit_id    INT NOT NULL,
    accessoire_id INT NOT NULL,
    remise_pack   DECIMAL(5,2) DEFAULT 0,    -- remise (%) appliquée au pack
    PRIMARY KEY (produit_id, accessoire_id),
    FOREIGN KEY (produit_id)    REFERENCES produits(id) ON DELETE CASCADE,
    FOREIGN KEY (accessoire_id) REFERENCES produits(id) ON DELETE CASCADE
);

-- ============================================================
-- DONNÉES ENRICHIES
-- ============================================================

-- CATÉGORIES
INSERT INTO categories (nom, description) VALUES
  ('Alimentation',  'Produits alimentaires de base et épicerie'),
  ('Hygiène',       'Produits d\'hygiène corporelle et ménagère'),
  ('Électronique',  'Appareils électroniques et accessoires'),
  ('Textile',       'Vêtements, accessoires et tissus'),
  ('Boissons',      'Eau, jus, sodas et boissons chaudes'),
  ('Boulangerie',   'Pain, pâtisseries et viennoiseries'),
  ('Cosmétiques',   'Soins du visage, cheveux et corps');

-- FOURNISSEURS
INSERT INTO fournisseurs (nom, telephone, email, adresse) VALUES
  ('CFAO Retail Sénégal',    '338392000','contact@cfao.sn',         'Dakar Plateau, Rue du Thiong'),
  ('Niger-SN Distribution',  '778001122','info@niger-sn.com',       'Pikine Industriel, Dakar'),
  ('Diallo & Frères SARL',   '775566778','diallo@freres.sn',        'Marché Sandaga, Dakar'),
  ('SOBOA Distribution',     '338496000','commandes@soboa.sn',      'Zone Industrielle, Dakar'),
  ('Importex Dakar',         '776543210','importex@orange.sn',      'Port de Dakar, Quai 12'),
  ('Nestlé Sénégal',         '338208500','nestle.sn@nestle.com',    'Almadies, Dakar'),
  ('Unilever West Africa',   '338695000','unilever@unilever.com',   'Liberté 6, Dakar');

-- PRODUITS (33 produits)
INSERT INTO produits (nom,code_barre,sku,marque,categorie_id,prix_achat,prix_vente,tva,seuil_alerte,emplacement) VALUES
  ('Riz parfumé Tilda 25kg',        '6223001234567','RIZ-25KG-001','Tilda',      1,12500,15000,18,10,'Allée A - Rayon 1'),
  ('Riz brisé local 50kg',          '6223001234568','RIZ-50KG-002','Local',       1,18000,22000,18, 8,'Allée A - Rayon 2'),
  ('Huile végétale Lesieur 5L',     '6223007654321','HUI-5L-003',  'Lesieur',    1, 3200, 4000,18,15,'Allée A - Rayon 3'),
  ('Huile de palme Dinor 1L',       '6223007654322','HUI-1L-004',  'Dinor',      1,  900, 1200,18,20,'Allée A - Rayon 4'),
  ('Farine de blé GMS 50kg',        '6223002345678','FAR-50KG-005','GMS',        1,14000,17000,18, 5,'Allée A - Rayon 5'),
  ('Sucre cristallisé CSS 50kg',    '6223003456789','SUC-50KG-006','CSS',        1,19000,23000,18, 5,'Allée B - Rayon 1'),
  ('Tomate concentrée Heinz 70g',   '6001062987620','TOM-70G-007', 'Heinz',      1,  250,  400,18,25,'Allée B - Rayon 2'),
  ('Pâtes alimentaires Rivoire 500g','6223004567890','PAT-500G-008','Rivoire',   1,  400,  600,18,20,'Allée B - Rayon 3'),
  ('Cube Maggi boîte x100',         '6223005678901','CUB-100-009', 'Maggi',      1,  900, 1300,18,15,'Allée B - Rayon 4'),
  ('Sardines Petit Navire 125g',    '6223006789012','SAR-125G-010','Petit Navire',1, 600,  900,18,20,'Allée B - Rayon 5'),
  ('Lait en poudre Nido 400g',      '6194003613993','LAI-400G-011','Nido',       1, 2800, 3500,18,10,'Allée C - Rayon 1'),
  ('Sel iodé Selaf 1kg',            '6223007890123','SEL-1KG-012', 'Selaf',      1,  150,  250,18,30,'Allée C - Rayon 2'),
  ('Biscuits Youki 250g',           '6223008901234','BIS-250G-013','Youki',      1,  400,  650,18,15,'Allée C - Rayon 3'),
  ('Mayonnaise Kraft 500g',         '6223009012345','MAY-500G-014','Kraft',      1,  900, 1300,18,10,'Allée C - Rayon 4'),
  ('Savon Palmolive x6',            '6223009876543','SAV-P6-015',  'Palmolive',  2, 1800, 2500,18,20,'Allée D - Rayon 1'),
  ('Dentifrice Colgate 75ml',       '6001012345678','DEN-75ML-016','Colgate',    2,  700, 1100,18,15,'Allée D - Rayon 2'),
  ('Shampoing Head & Shoulders 400ml','6001023456789','SHA-400ML-017','H&S',     2, 2200, 3000,18,10,'Allée D - Rayon 3'),
  ('Déodorant Rexona 150ml',        '6001034567890','DEO-150ML-018','Rexona',    2, 1500, 2200,18, 8,'Allée D - Rayon 4'),
  ('Papier hygiénique Confort x12', '6001045678901','PAP-12-019',  'Confort',    2, 1200, 1800,18,12,'Allée D - Rayon 5'),
  ('Lessive OMO 2kg',               '6001056789012','LES-2KG-020', 'OMO',        2, 2500, 3500,18,10,'Allée E - Rayon 1'),
  ('Javel Ajax 1L',                 '6001067890123','JAV-1L-021',  'Ajax',       2,  600,  950,18,15,'Allée E - Rayon 2'),
  ('Chargeur USB-C 65W',            '6009001234567','CHG-65W-022', 'Generic',    3, 3500, 6000,18, 5,'Allée F - Rayon 1'),
  ('Écouteurs Bluetooth JBL',       '6009002345678','ECO-BT-023',  'JBL',        3, 8000,14000,18, 3,'Allée F - Rayon 2'),
  ('Multiprise Philips 5 prises',   '6009003456789','MUL-5P-024',  'Philips',    3, 4000, 6500,18, 5,'Allée F - Rayon 3'),
  ('T-shirt coton blanc L',         '3700123456789','TSH-BL-025',  'Basic',      4, 1500, 2500,18, 5,'Allée G - Rayon 1'),
  ('Boubou basin riche taille M',   '3700234567890','BOU-M-026',   'Artisan SN', 4,12000,18000,18, 3,'Allée G - Rayon 2'),
  ('Chaussettes coton x3',          '3700345678901','CHA-3P-027',  'Basic',      4,  500,  900,18,10,'Allée G - Rayon 3'),
  ('Eau minérale Kirène 1.5L',      '7613034626844','EAU-15L-028', 'Kirène',     5,  400,  600,18,30,'Allée H - Rayon 1'),
  ('Jus de bissap Kirène 1L',       '7613034626845','JUS-BIS-029', 'Kirène',     5,  550,  850,18,20,'Allée H - Rayon 2'),
  ('Coca-Cola 1.5L',                '5000112628607','COC-15L-030', 'Coca-Cola',  5,  900, 1400,18,15,'Allée H - Rayon 3'),
  ('Café Nescafé Gold 200g',        '7613035095129','CAF-200G-031','Nescafé',    5, 3500, 5000,18, 8,'Allée H - Rayon 4'),
  ('Crème hydratante Nivea 250ml',  '4005808729951','CRE-250ML-032','Nivea',     7, 2000, 3200,18, 8,'Allée I - Rayon 1'),
  ('Huile de coco bio 200ml',       '6009004567890','HCO-200ML-033','Bio Sn',    7, 1200, 2000,18,10,'Allée I - Rayon 2');

-- STOCKS
INSERT INTO stocks (produit_id, quantite) VALUES
  (1,85),(2,12),(3,42),(4,18),(5,4),(6,3),(7,78),(8,55),
  (9,32),(10,45),(11,8),(12,120),(13,22),(14,14),(15,6),
  (16,0),(17,7),(18,5),(19,30),(20,2),(21,25),(22,4),
  (23,1),(24,8),(25,0),(26,5),(27,24),(28,200),(29,45),
  (30,60),(31,6),(32,18),(33,12);

-- ALERTES
INSERT INTO alertes_stock (produit_id,type_alerte,quantite_actuelle,seuil,lue) VALUES
  (5, 'critique',4, 5,0),
  (6, 'critique',3, 5,0),
  (15,'critique',6,20,0),
  (16,'rupture', 0,15,0),
  (20,'critique',2,10,0),
  (22,'critique',4, 5,0),
  (23,'critique',1, 3,0),
  (25,'rupture', 0, 5,0),
  (31,'critique',6, 8,1),
  (18,'critique',5, 8,1);

-- UTILISATEURS (mot de passe : password)
INSERT INTO utilisateurs (nom,prenom,email,mot_de_passe,role) VALUES
  ('Gaye',   'Ndeye Maty','ndeye@sunustock.sn',   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin'),
  ('Drame',  'Manetou',   'manetou@sunustock.sn',  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','manager'),
  ('Diop',   'Fatou',     'fatou@sunustock.sn',    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','caissier'),
  ('Dieng',  'Mouhamed',  'mouhamed@sunustock.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','caissier'),
  ('Ndiaye', 'Aminata',   'aminata@sunustock.sn',  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','manager');

-- CLIENTS
INSERT INTO clients (nom,telephone,statut,points) VALUES
  ('Mariama Diallo', '771234567','or',      850),
  ('Oumar Seck',     '772345678','vip',     420),
  ('Aissatou Ba',    '773456789','standard', 80),
  ('Moussa Traore',  '774567890','vip',     310),
  ('Khady Ndoye',    '775678901','standard', 50),
  ('Pape Sarr',      '776789012','standard',120),
  ('Rokhaya Faye',   '777890123','or',      920),
  ('Abdoulaye Kane', '778901234','standard', 30),
  ('Sokhna Mbaye',   '779012345','vip',     540),
  ('Lamine Diouf',   '770123456','standard', 15);

-- MOUVEMENTS HISTORIQUES
INSERT INTO mouvements_stock (produit_id,type_mouvement,quantite,quantite_avant,quantite_apres,motif,utilisateur_id,created_at) VALUES
  (1, 'entree',50, 35, 85,'Livraison CFAO semaine 23',      1,DATE_SUB(NOW(),INTERVAL 2 DAY)),
  (3, 'entree',20, 22, 42,'Livraison CFAO semaine 23',      1,DATE_SUB(NOW(),INTERVAL 2 DAY)),
  (28,'entree',100,100,200,'Livraison Kirène',               1,DATE_SUB(NOW(),INTERVAL 2 DAY)),
  (7, 'entree',48, 30, 78,'Réception Niger-SN',              1,DATE_SUB(NOW(),INTERVAL 2 DAY)),
  (1, 'sortie', 3, 88, 85,'Vente caisse',                   3,DATE_SUB(NOW(),INTERVAL 2 DAY)),
  (28,'sortie',12,212,200,'Vente caisse',                   3,DATE_SUB(NOW(),INTERVAL 2 DAY)),
  (30,'sortie', 5, 65, 60,'Vente caisse',                   4,DATE_SUB(NOW(),INTERVAL 2 DAY)),
  (3, 'sortie', 3, 45, 42,'Vente caisse',                   3,DATE_SUB(NOW(),INTERVAL 1 DAY)),
  (7, 'sortie', 8, 86, 78,'Vente caisse',                   4,DATE_SUB(NOW(),INTERVAL 1 DAY)),
  (10,'sortie', 5, 50, 45,'Vente caisse',                   3,DATE_SUB(NOW(),INTERVAL 1 DAY)),
  (11,'sortie', 2, 10,  8,'Vente caisse',                   4,DATE_SUB(NOW(),INTERVAL 1 DAY)),
  (29,'sortie',10, 55, 45,'Vente caisse',                   3,DATE_SUB(NOW(),INTERVAL 1 DAY)),
  (15,'sortie', 4, 10,  6,'Vente caisse',                   4,DATE_SUB(NOW(),INTERVAL 1 DAY)),
  (5, 'ajustement',1,3,4, 'Correction inventaire physique', 2,DATE_SUB(NOW(),INTERVAL 1 DAY)),
  (1, 'sortie', 2, 87, 85,'Vente caisse',                   3,NOW()),
  (28,'sortie', 5,205,200,'Vente caisse',                   4,NOW()),
  (9, 'sortie', 3, 35, 32,'Vente caisse',                   3,NOW()),
  (12,'sortie',10,130,120,'Vente caisse',                   4,NOW());

-- VENTES HISTORIQUES
INSERT INTO ventes (numero,client_id,utilisateur_id,total_ht,total_tva,total_ttc,mode_paiement,montant_recu,monnaie_rendue,statut,created_at) VALUES
  ('VNT-20260603-AA1B2C',1,3,21186,3813,25000,'especes',    25000,   0,'validee',DATE_SUB(NOW(),INTERVAL 2 DAY)),
  ('VNT-20260603-D4E5F6',2,4,12711,2288,15000,'mobile_money',15000,  0,'validee',DATE_SUB(NOW(),INTERVAL 2 DAY)),
  ('VNT-20260603-G7H8I9',3,3, 8474,1525,10000,'especes',    10000,   0,'validee',DATE_SUB(NOW(),INTERVAL 2 DAY)),
  ('VNT-20260604-J1K2L3',4,4,16949,3050,20000,'carte',      20000,   0,'validee',DATE_SUB(NOW(),INTERVAL 1 DAY)),
  ('VNT-20260604-M4N5O6',5,3,25423,4576,30000,'especes',    35000,5000,'validee',DATE_SUB(NOW(),INTERVAL 1 DAY)),
  ('VNT-20260604-P7Q8R9',1,4, 6779,1220, 8000,'mobile_money',8000,   0,'validee',DATE_SUB(NOW(),INTERVAL 1 DAY)),
  ('VNT-20260605-S1T2U3',7,3,12711,2288,15000,'especes',    20000,5000,'validee',NOW()),
  ('VNT-20260605-V4W5X6',2,4, 8474,1525,10000,'carte',      10000,   0,'validee',NOW());

INSERT INTO lignes_ventes (vente_id,produit_id,nom_produit,quantite,prix_unitaire,tva,sous_total) VALUES
  (1,1, 'Riz parfumé Tilda 25kg',        1,15000,18,15000),
  (1,28,'Eau minérale Kirène 1.5L',       5,  600,18, 3000),
  (1,30,'Coca-Cola 1.5L',                 3, 1400,18, 4200),
  (2,3, 'Huile végétale Lesieur 5L',      2, 4000,18, 8000),
  (2,7, 'Tomate concentrée Heinz 70g',    5,  400,18, 2000),
  (3,9, 'Cube Maggi boîte x100',          2, 1300,18, 2600),
  (3,10,'Sardines Petit Navire 125g',      5,  900,18, 4500),
  (4,11,'Lait en poudre Nido 400g',        2, 3500,18, 7000),
  (4,29,'Jus de bissap Kirène 1L',         5,  850,18, 4250),
  (5,1, 'Riz parfumé Tilda 25kg',         2,15000,18,30000),
  (6,15,'Savon Palmolive x6',             1, 2500,18, 2500),
  (6,21,'Javel Ajax 1L',                  2,  950,18, 1900),
  (7,28,'Eau minérale Kirène 1.5L',       10,  600,18, 6000),
  (7,30,'Coca-Cola 1.5L',                 3, 1400,18, 4200),
  (8,3, 'Huile végétale Lesieur 5L',      1, 4000,18, 4000),
  (8,12,'Sel iodé Selaf 1kg',             3,  250,18,  750);

-- ACCESSOIRES / PRODUITS LIÉS (produit principal → accessoire suggéré, remise %)
INSERT INTO accessoires_produits (produit_id, accessoire_id, remise_pack) VALUES
  (31, 11, 5),   -- Café Nescafé Gold  → Lait Nido (-5%)
  (31, 13, 0),   -- Café Nescafé Gold  → Biscuits Youki
  (1,  3, 10),   -- Riz Tilda 25kg     → Huile Lesieur (-10%)
  (1,  7, 0),    -- Riz Tilda 25kg     → Tomate concentrée
  (22, 23, 5),   -- Chargeur USB-C     → Écouteurs Bluetooth (-5%)
  (22, 24, 0),   -- Chargeur USB-C     → Multiprise
  (17, 15, 0),   -- Shampoing H&S      → Savon Palmolive
  (25, 27, 15),  -- T-shirt blanc      → Chaussettes (-15%)
  (30, 13, 0);   -- Coca-Cola          → Biscuits Youki
