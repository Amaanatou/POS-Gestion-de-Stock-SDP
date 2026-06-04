// src/App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Chargement à la demande (réduit le bundle initial)
const Login      = lazy(() => import('./pages/Login'));
const Dashboard  = lazy(() => import('./pages/Dashboard'));
const Produits   = lazy(() => import('./pages/produits/Produits'));
const Stocks     = lazy(() => import('./pages/stocks/Stocks'));
const Alertes    = lazy(() => import('./pages/alertes/Alertes'));
const Caisse     = lazy(() => import('./pages/caisse/Caisse'));
const Mouvements = lazy(() => import('./pages/stocks/Mouvements'));
const Layout     = lazy(() => import('./components/layout/Layout'));

// Écran de chargement entre les pages
function PageChargement() {
  return (
    <div className='flex items-center justify-center h-screen bg-gray-50'>
      <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-[#1E3A5F]' />
    </div>
  );
}

// Route protégée : redirige vers /login si non connecté
function RoutePrivee({ children }) {
  const { utilisateur, chargement } = useAuth();
  if (chargement) return <PageChargement />;
  return utilisateur ? children : <Navigate to='/login' replace />;
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
              <Route index element={<Navigate to='/dashboard' replace />} />
              <Route path='dashboard'  element={<Dashboard />} />
              <Route path='produits'   element={<Produits />} />
              <Route path='stocks'     element={<Stocks />} />
              <Route path='mouvements' element={<Mouvements />} />
              <Route path='alertes'    element={<Alertes />} />
              <Route path='caisse'     element={<Caisse />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
