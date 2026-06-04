// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import Produits   from './pages/produits/Produits';
import Stocks     from './pages/stocks/Stocks';
import Alertes    from './pages/alertes/Alertes';
import Caisse     from './pages/caisse/Caisse';
import Mouvements from './pages/stocks/Mouvements';
import Layout     from './components/layout/Layout';

// Route protégée : redirige vers /login si non connecté
function RoutePrivee({ children }) {
  const { utilisateur, chargement } = useAuth();
  if (chargement) return (
    <div className='flex items-center justify-center h-screen'>
      Chargement...
    </div>
  );
  return utilisateur ? children : <Navigate to='/login' replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position='top-right' />
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
      </BrowserRouter>
    </AuthProvider>
  );
}
