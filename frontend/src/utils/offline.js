// src/utils/offline.js
// Mode hors-ligne (§3.3) : file d'attente locale des ventes + synchronisation.
// Si la connexion tombe pendant une vente, on la stocke dans le navigateur
// (localStorage), puis on la renvoie automatiquement au retour du réseau.

const CLE = 'sunu_ventes_hors_ligne';

export const lireFile = () => {
  try { return JSON.parse(localStorage.getItem(CLE)) || []; }
  catch { return []; }
};

const ecrireFile = (arr) => localStorage.setItem(CLE, JSON.stringify(arr));

export const nbEnAttente = () => lireFile().length;

// Mettre une vente en file d'attente (réseau indisponible)
export const mettreEnAttente = (payload) => {
  const file = lireFile();
  file.push({ ...payload, _ref: Date.now(), _date: new Date().toISOString() });
  ecrireFile(file);
  return file.length;
};

// Renvoyer toutes les ventes en attente. fnEnvoi = creerVente(lignes, mode, clientId, remise).
// Les ventes renvoyées avec succès sont retirées de la file ; les autres y restent.
export const synchroniser = async (fnEnvoi) => {
  const file = lireFile();
  if (file.length === 0) return { envoyees: 0, restantes: 0 };

  const restantes = [];
  let envoyees = 0;
  for (const v of file) {
    const res = await fnEnvoi(v.lignes, v.modePaiement, v.clientId, v.remiseManuelle);
    if (res && res.success) envoyees++;
    else restantes.push(v); // échec → on garde pour réessayer plus tard
  }
  ecrireFile(restantes);
  return { envoyees, restantes: restantes.length };
};
