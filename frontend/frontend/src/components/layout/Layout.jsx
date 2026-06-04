// src/components/layout/Layout.jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar  from './Topbar';

export default function Layout() {
  return (
    <div className='flex h-screen bg-gray-100 overflow-hidden'>
      {/* Menu latéral gauche fixe */}
      <Sidebar />
      {/* Zone principale */}
      <div className='flex flex-col flex-1 overflow-hidden'>
        <Topbar />
        <main className='flex-1 overflow-y-auto p-6'>
          <Outlet /> {/* Les pages s'affichent ici */}
        </main>
      </div>
    </div>
  );
}
