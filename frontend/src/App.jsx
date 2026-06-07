// src/App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Chargement à la demande
const Login      = lazy(() => import('./pages/Login'));
const Dashboard  = lazy(() => import('./pages/Dashboard'));
const Produits   = lazy(() => import('./pages/produits/Produits'));
const Stocks     = lazy(() => import('./pages/stocks/Stocks'));
const Alertes    = lazy(() => import('./pages/alertes/Alertes'));
const Caisse     = lazy(() => import('./pages/caisse/Caisse'));
const Mouvements = lazy(() => import('./pages/stocks/Mouvements'));
const Ventes       = lazy(() => import('./pages/ventes/Ventes'));
const Fournisseurs = lazy(() => import('./pages/fournisseurs/Fournisseurs'));
const Clients      = lazy(() => import('./pages/clients/Clients'));
const Utilisateurs = lazy(() => import('./pages/utilisateurs/Utilisateurs'));
const Journal      = lazy(() => import('./pages/journal/Journal'));
const Layout       = lazy(() => import('./components/layout/Layout'));

// Permissions par rôle
const PERMISSIONS = {
  caissier: ['/caisse'],
  manager:  ['/dashboard', '/produits', '/stocks', '/mouvements', '/alertes', '/caisse', '/ventes', '/fournisseurs', '/clients'],
  admin:    ['/dashboard', '/produits', '/stocks', '/mouvements', '/alertes', '/caisse', '/ventes', '/fournisseurs', '/clients', '/utilisateurs', '/journal'],
};

// Page d'accès refusé
function AccesRefuse() {
  const { utilisateur, deconnecter } = useAuth();
  return (
    <div className='flex flex-col items-center justify-center h-screen bg-gray-50 gap-4'>
      <div className='text-6xl'>🚫</div>
      <h1 className='text-2xl font-bold text-gray-800'>Accès refusé</h1>
      <p className='text-gray-500'>
        Votre rôle <span className='font-semibold capitalize'>{utilisateur?.role}</span> ne permet pas d'accéder à cette page.
      </p>
      <button
        onClick={deconnecter}
        className='mt-2 bg-[#1E3A5F] text-white px-6 py-2 rounded-lg hover:bg-blue-900'
      >
        Se déconnecter
      </button>
    </div>
  );
}

// Écran de chargement
function PageChargement() {
  return (
    <div className='flex items-center justify-center h-screen bg-gray-50'>
      <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-[#1E3A5F]' />
    </div>
  );
}

// Route protégée : vérifie connexion + rôle
function RoutePrivee({ children, page }) {
  const { utilisateur, chargement } = useAuth();
  if (chargement) return <PageChargement />;
  if (!utilisateur) return <Navigate to='/login' replace />;

  // Si une page est spécifiée, vérifier la permission
  if (page) {
    const permis = PERMISSIONS[utilisateur.role] ?? [];
    if (!permis.includes(page)) return <AccesRefuse />;
  }
  return children;
}

// Redirection intelligente selon le rôle après login
function RedirectionParRole() {
  const { utilisateur } = useAuth();
  if (utilisateur?.role === 'caissier') return <Navigate to='/caisse' replace />;
  return <Navigate to='/dashboard' replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position='top-right' />
        <Suspense fallback={<PageChargement />}>
          <Routes>
            <Route path='/login' element={<Login />} />
            <Route path='/' element={<RoutePrivee><Layout /></RoutePrivee>}>
              <Route index element={<RoutePrivee><RedirectionParRole /></RoutePrivee>} />
              <Route path='dashboard'  element={<RoutePrivee page='/dashboard'><Dashboard /></RoutePrivee>} />
              <Route path='produits'   element={<RoutePrivee page='/produits'><Produits /></RoutePrivee>} />
              <Route path='stocks'     element={<RoutePrivee page='/stocks'><Stocks /></RoutePrivee>} />
              <Route path='mouvements' element={<RoutePrivee page='/mouvements'><Mouvements /></RoutePrivee>} />
              <Route path='alertes'    element={<RoutePrivee page='/alertes'><Alertes /></RoutePrivee>} />
              <Route path='caisse'     element={<RoutePrivee page='/caisse'><Caisse /></RoutePrivee>} />
              <Route path='ventes'      element={<RoutePrivee page='/ventes'><Ventes /></RoutePrivee>} />
              <Route path='fournisseurs' element={<RoutePrivee page='/fournisseurs'><Fournisseurs /></RoutePrivee>} />
              <Route path='clients'      element={<RoutePrivee page='/clients'><Clients /></RoutePrivee>} />
              <Route path='utilisateurs' element={<RoutePrivee page='/utilisateurs'><Utilisateurs /></RoutePrivee>} />
              <Route path='journal'      element={<RoutePrivee page='/journal'><Journal /></RoutePrivee>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
