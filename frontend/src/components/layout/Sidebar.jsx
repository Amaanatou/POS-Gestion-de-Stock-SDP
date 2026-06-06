// src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, BarChart3,
  Bell, ShoppingCart, ArrowLeftRight, LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../ui/Logo';

// Chaque menu indique quels rôles peuvent le voir
const TOUS_LES_MENUS = [
  { to: '/dashboard',  label: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin','manager'] },
  { to: '/produits',   label: 'Produits',         icon: Package,         roles: ['admin','manager'] },
  { to: '/stocks',     label: 'Stocks',           icon: BarChart3,       roles: ['admin','manager'] },
  { to: '/mouvements', label: 'Mouvements',       icon: ArrowLeftRight,  roles: ['admin','manager'] },
  { to: '/alertes',    label: 'Alertes',          icon: Bell,            roles: ['admin','manager'] },
  { to: '/caisse',     label: 'Caisse POS',       icon: ShoppingCart,    roles: ['admin','manager','caissier'] },
];

export default function Sidebar() {
  const { utilisateur, deconnecter } = useAuth();

  // Filtrer les menus selon le rôle de l'utilisateur connecté
  const nav = TOUS_LES_MENUS.filter(m => m.roles.includes(utilisateur?.role));

  return (
    <aside className='w-64 bg-[#1E3A5F] text-white flex flex-col shadow-xl'>
      <div className='p-6 border-b border-white/10'>
        <Logo size={36} variant='light' />
        <p className='text-xs text-white/50 mt-1'>Gestion de Stock PME</p>
      </div>
      <nav className='flex-1 p-4 space-y-1'>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all
               ${isActive
                 ? 'bg-white/20 text-white font-semibold'
                 : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className='p-4 border-t border-white/10'>
        <p className='text-sm font-medium'>{utilisateur?.prenom} {utilisateur?.nom}</p>
        <p className='text-xs text-white/50 capitalize mb-3'>{utilisateur?.role}</p>
        <button onClick={deconnecter}
          className='flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors'>
          <LogOut size={16} /> Déconnexion
        </button>
      </div>
    </aside>
  );
}
