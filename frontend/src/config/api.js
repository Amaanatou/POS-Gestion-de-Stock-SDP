// src/config/api.js
// Toutes les fonctions d'appel à l'API PHP sont ici
// JAMAIS faire des fetch directement dans les composants

// Adresse du serveur PHP (backend)
const BASE = import.meta.env.VITE_API_URL || 'http://localhost/sunustock_api';

// Récupérer le token JWT stocké dans le navigateur
const token = () => localStorage.getItem('sunu_token');

// En-têtes envoyés avec chaque requête
const headers = (avecToken = true) => ({
  'Content-Type': 'application/json',
  ...(avecToken && token() ? { Authorization: `Bearer ${token()}` } : {}),
});

// Fonction générique pour gérer les erreurs réseau
async function request(url, options = {}) {
  try {
    const res = await fetch(`${BASE}${url}`, options);
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, message: 'Impossible de contacter le serveur' };
  }
}

// ─── AUTHENTIFICATION ────────────────────────────────────────
export const login = (email, mot_de_passe) =>
  request('/auth/login', {
    method: 'POST',
    headers: headers(false),
    body: JSON.stringify({ email, mot_de_passe }),
  });

export const getProfil = () =>
  request('/auth/profil', { headers: headers() });

// ─── PRODUITS ────────────────────────────────────────────────
export const getProduits = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/produits${qs ? '?' + qs : ''}`, { headers: headers() });
};

export const getProduitParBarre = (code) =>
  request(`/produits/barre/${code}`, { headers: headers() });

// Crée un FormData depuis les données + fichier image optionnel
function toFormData(data, imageFile) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v !== null && v !== undefined) fd.append(k, v);
  });
  if (imageFile) fd.append('image', imageFile);
  return fd;
}

// Headers sans Content-Type pour FormData (le navigateur le gère tout seul)
const headersFormData = () =>
  token() ? { Authorization: `Bearer ${token()}` } : {};

export const creerProduit = (data, imageFile = null) =>
  fetch(`${BASE}/produits`, {
    method: 'POST',
    headers: headersFormData(),
    body: toFormData(data, imageFile),
  }).then(r => r.json()).catch(() => ({ success: false, message: 'Erreur réseau' }));

export const modifierProduit = (id, data, imageFile = null) =>
  fetch(`${BASE}/produits/${id}`, {
    method: 'POST', // PHP ne supporte pas PUT avec $_FILES → on passe par POST
    headers: headersFormData(),
    body: toFormData({ ...data, _method: 'PUT' }, imageFile),
  }).then(r => r.json()).catch(() => ({ success: false, message: 'Erreur réseau' }));

// ─── ACCESSOIRES / PRODUITS LIÉS ─────────────────────────────
export const getAccessoires = (produitId) =>
  request(`/produits/${produitId}/accessoires`, { headers: headers() });

export const lierAccessoire = (produitId, accessoireId, remisePack = 0) =>
  request(`/produits/${produitId}/accessoires`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ accessoire_id: accessoireId, remise_pack: remisePack }),
  });

export const delierAccessoire = (produitId, accessoireId) =>
  request(`/produits/${produitId}/accessoires/${accessoireId}`, {
    method: 'DELETE', headers: headers(),
  });

// ─── GALERIE D'IMAGES SECONDAIRES ────────────────────────────
export const getImagesProduit = (produitId) =>
  request(`/produits/${produitId}/images`, { headers: headers() });

export const ajouterImageProduit = (produitId, imageFile) => {
  const fd = new FormData();
  fd.append('image', imageFile);
  return fetch(`${BASE}/produits/${produitId}/images`, {
    method: 'POST',
    headers: headersFormData(),
    body: fd,
  }).then(r => r.json()).catch(() => ({ success: false, message: 'Erreur réseau' }));
};

export const supprimerImageProduit = (produitId, imageId) =>
  request(`/produits/${produitId}/images/${imageId}`, {
    method: 'DELETE', headers: headers(),
  });

// ─── STOCKS ──────────────────────────────────────────────────
export const getStocks = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/stocks${qs ? '?' + qs : ''}`, { headers: headers() });
};

export const entreeStock = (produit_id, quantite, motif) =>
  request('/stocks/entree', {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ produit_id, quantite, motif }),
  });

export const sortieStock = (produit_id, quantite, motif, type = 'sortie') =>
  request('/stocks/sortie', {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ produit_id, quantite, motif, type }),
  });

export const getMouvements = () =>
  request('/mouvements', { headers: headers() });

// ─── ALERTES ─────────────────────────────────────────────────
export const getAlertes = () =>
  request('/alertes', { headers: headers() });

export const marquerAlerteLue = (id) =>
  request(`/alertes/${id}/lue`, {
    method: 'PUT', headers: headers(),
  });

// ─── VENTES (CAISSE POS) ─────────────────────────────────────
export const creerVente = (lignes, modePaiement, clientId = null, remiseManuelle = 0) =>
  request('/ventes', {
    method: 'POST', headers: headers(),
    body: JSON.stringify({
      lignes, mode_paiement: modePaiement, client_id: clientId,
      remise_manuelle: remiseManuelle,
    }),
  });

// Historique des ventes (manager/admin)
export const getVentes = () =>
  request('/ventes', { headers: headers() });

// Détails d'une vente (en-tête + lignes)
export const getVenteDetails = (id) =>
  request(`/ventes/${id}`, { headers: headers() });

// Annuler une vente (restaure le stock)
export const annulerVente = (id) =>
  request(`/ventes/${id}/annuler`, {
    method: 'POST', headers: headers(),
  });

// Retour de marchandises (restaure le stock des articles retournés)
export const retournerVente = (id, articles) =>
  request(`/ventes/${id}/retour`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ articles }),
  });

// ─── CLIENTS (FIDÉLITÉ) ──────────────────────────────────────
export const getClients = () =>
  request('/clients', { headers: headers() });

export const rechercherClient = (telephone) =>
  request(`/clients/recherche/${telephone}`, { headers: headers() });

export const creerClient = (data) =>
  request('/clients', {
    method: 'POST', headers: headers(),
    body: JSON.stringify(data),
  });

export const modifierClient = (id, data) =>
  request(`/clients/${id}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify(data),
  });

export const convertirPoints = (id, points) =>
  request(`/clients/${id}/convertir`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ points }),
  });

// ─── FOURNISSEURS ────────────────────────────────────────────
export const getFournisseurs = () =>
  request('/fournisseurs', { headers: headers() });

export const creerFournisseur = (data) =>
  request('/fournisseurs', {
    method: 'POST', headers: headers(),
    body: JSON.stringify(data),
  });

export const modifierFournisseur = (id, data) =>
  request(`/fournisseurs/${id}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify(data),
  });

export const basculerFournisseur = (id) =>
  request(`/fournisseurs/${id}/actif`, {
    method: 'PATCH', headers: headers(),
  });

// ─── UTILISATEURS (PERSONNEL — ADMIN) ────────────────────────
export const getUtilisateurs = () =>
  request('/utilisateurs', { headers: headers() });

export const creerUtilisateur = (data) =>
  request('/utilisateurs', {
    method: 'POST', headers: headers(),
    body: JSON.stringify(data),
  });

export const modifierUtilisateur = (id, data) =>
  request(`/utilisateurs/${id}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify(data),
  });

export const basculerUtilisateur = (id) =>
  request(`/utilisateurs/${id}/actif`, {
    method: 'PATCH', headers: headers(),
  });

// ─── JOURNAL D'AUDIT (ADMIN) ─────────────────────────────────
export const getJournal = (action = '') =>
  request(`/journal${action ? '?action=' + action : ''}`, { headers: headers() });

// ─── SESSIONS DE CAISSE (écarts) ─────────────────────────────
export const getSessionCourante = () =>
  request('/caisse-sessions/courante', { headers: headers() });

export const getSessionsCaisse = () =>
  request('/caisse-sessions', { headers: headers() });

export const ouvrirCaisse = (fondInitial) =>
  request('/caisse-sessions/ouvrir', {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ fond_initial: fondInitial }),
  });

export const fermerCaisse = (id, montantCompte, note = '') =>
  request(`/caisse-sessions/${id}/fermer`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ montant_compte: montantCompte, note }),
  });

// ─── DASHBOARD ───────────────────────────────────────────────
export const getDashboardStats = () =>
  request('/dashboard/stats', { headers: headers() });
