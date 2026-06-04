// src/context/AuthContext.jsx
// Partage l'utilisateur connecté et le token dans toute l'application

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement]   = useState(true);

  useEffect(() => {
    // Au démarrage : vérifier si un token est déjà stocké
    const token = localStorage.getItem('sdp_token');
    const user  = localStorage.getItem('sdp_user');
    if (token && user) {
      setUtilisateur(JSON.parse(user));
    }
    setChargement(false);
  }, []);

  const connecter = (token, user) => {
    localStorage.setItem('sdp_token', token);
    localStorage.setItem('sdp_user', JSON.stringify(user));
    setUtilisateur(user);
  };

  const deconnecter = () => {
    localStorage.removeItem('sdp_token');
    localStorage.removeItem('sdp_user');
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
