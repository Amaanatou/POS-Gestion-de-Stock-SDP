// src/config/api.js
// Toutes les fonctions d'appel à l'API PHP sont ici
// JAMAIS faire des fetch directement dans les composants

// Adresse du serveur PHP (backend)
// En développement : l'IP de la machine qui fait tourner PHP
const BASE = import.meta.env.VITE_API_URL || 'http://localhost/sdp_api';

// Récupérer le token JWT stocké dans le navigateur
const token = () => localStorage.getItem('sdp_token');

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

export const creerProduit = (data) =>
  request('/produits', {
    method: 'POST', headers: headers(),
    body: JSON.stringify(data),
  });

export const modifierProduit = (id, data) =>
  request(`/produits/${id}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify(data),
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

// ─── DASHBOARD ───────────────────────────────────────────────
export const getDashboardStats = () =>
  request('/dashboard/stats', { headers: headers() });
