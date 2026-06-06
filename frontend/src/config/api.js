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

// ─── STOCKS ──────────────────────────────────────────────────
export const getStocks = () =>
  request('/stocks', { headers: headers() });

export const entreeStock = (produit_id, quantite, motif) =>
  request('/stocks/entree', {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ produit_id, quantite, motif }),
  });

export const sortieStock = (produit_id, quantite, motif) =>
  request('/stocks/sortie', {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ produit_id, quantite, motif }),
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
export const creerVente = (lignes, modePaiement, clientId = null) =>
  request('/ventes', {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ lignes, mode_paiement: modePaiement, client_id: clientId }),
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

// ─── DASHBOARD ───────────────────────────────────────────────
export const getDashboardStats = () =>
  request('/dashboard/stats', { headers: headers() });
