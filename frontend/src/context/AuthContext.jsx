// src/context/AuthContext.jsx
// Partage l'utilisateur connecté et le token dans toute l'application

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement]   = useState(true);

  useEffect(() => {
    // Au démarrage : vérifier si un token est déjà stocké
    const token = localStorage.getItem('sunu_token');
    const user  = localStorage.getItem('sunu_user');
    if (token && user) {
      setUtilisateur(JSON.parse(user));
    }
    setChargement(false);
  }, []);

  const connecter = (token, user) => {
    localStorage.setItem('sunu_token', token);
    localStorage.setItem('sunu_user', JSON.stringify(user));
    setUtilisateur(user);
  };

  const deconnecter = () => {
    localStorage.removeItem('sunu_token');
    localStorage.removeItem('sunu_user');
    setUtilisateur(null);
  };

  return (
    <AuthContext.Provider value={{ utilisateur, connecter, deconnecter, chargement }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personnalisé pour utiliser le contexte facilement
export const useAuth = () => useContext(AuthContext);
