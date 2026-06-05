-- ============================================================
-- BASE DE DONNÉES : SunuStock — Gestion de Stock PME v1.0
-- Auteur  : Ndeye Maty Gaye
-- Projet  : SunuStock — Application Web POS & Gestion de Stock
-- Date    : Juin 2026
-- UTILISATION : Ouvrir dans MySQL Workbench > cliquer ⚡
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

-- ── DONNÉES DE TEST ──────────────────────────────────────────
INSERT INTO categories (nom) VALUES
  ('Alimentation'),('Hygiène'),('Électronique'),('Textile'),('Boissons');

INSERT INTO fournisseurs (nom, telephone, email) VALUES
  ('CFAO Retail Sénégal','338392000','contact@cfao.sn'),
  ('Niger-SN Distribution','778001122','info@niger-sn.com'),
  ('Diallo & Frères','775566778', NULL);

INSERT INTO produits (nom,code_barre,sku,marque,categorie_id,prix_achat,prix_vente,seuil_alerte,emplacement) VALUES
  ('Riz parfumé 25kg',   '6223001234567','RIZ-25KG-001','Tilda',    1,12500,15000,10,'Allée A - Rayon 3'),
  ('Huile végétale 5L',  '6223007654321','HUI-5L-002',  'Lesieur',  1, 3200, 4000,15,'Allée A - Rayon 4'),
  ('Savon Palmolive x6', '6223009876543','SAV-P6-003',  'Palmolive',2, 1800, 2500,20,'Allée B - Rayon 1'),
  ('Eau minérale 1.5L',  '7613034626844','EAU-15L-004', 'Kirène',   5,  400,  600,30,'Allée C - Rayon 5'),
  ('T-shirt blanc L',    '3700123456789','TSH-BL-005',  'Basic',    4, 1500, 2500, 5,'Allée D - Rayon 2'),
  ('Tomate concentrée',  '6001062987620','TOM-70G-006', 'Heinz',    1,  250,  400,25,'Allée A - Rayon 2'),
  ('Lait en poudre 400g','6194003613993','LAI-400G-007','Nido',     1, 2800, 3500,10,'Allée A - Rayon 5');

INSERT INTO stocks (produit_id, quantite) VALUES
  (1,45),(2,28),(3,3),(4,120),(5,0),(6,50),(7,18);

INSERT INTO alertes_stock (produit_id, type_alerte, quantite_actuelle, seuil) VALUES
  (3,'critique',3,20),(5,'rupture',0,5);

-- Comptes de test — mot de passe pour tous : password
INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES
  ('Gaye',   'Ndeye Maty','ndeye@sunustock.sn',   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin'),
  ('Drame',   'Manetou',   'manetou@sunustock.sn',  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','manager'),
  ('Caissier','Test',      'caissier@sunustock.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','caissier');
-- ⚠️ Changer les mots de passe en production avec password_hash()
