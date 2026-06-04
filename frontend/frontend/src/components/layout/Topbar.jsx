// src/components/layout/Topbar.jsx
import { useAuth } from '../../context/AuthContext';

export default function Topbar() {
  const { utilisateur } = useAuth();
  return (
    <header className='bg-white shadow-sm px-6 py-4 flex items-center justify-between'>
      <h2 className='text-lg font-semibold text-gray-700'>Sen Digital Pulse</h2>
      <div className='flex items-center gap-3'>
        <div className='w-8 h-8 bg-[#1E3A5F] rounded-full flex items-center justify-center'>
          <span className='text-white text-sm font-bold'>
            {utilisateur?.prenom?.[0]?.toUpperCase() || 'U'}
          </span>
        </div>
        <span className='text-sm text-gray-600'>{utilisateur?.prenom} {utilisateur?.nom}</span>
      </div>
    </header>
  );
}
