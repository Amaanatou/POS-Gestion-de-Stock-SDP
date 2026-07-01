// src/pages/stocks/VirtuelStockModal.jsx
// Édition du stock virtuel d'un produit (§2.1)
// Stock virtuel = stock réel − réservé + en commande
import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Layers } from 'lucide-react';
import { ajusterStockVirtuel } from '../../config/api';

export default function VirtuelStockModal({ produit, onFermer, onSuccess }) {
  const [reserve, setReserve]   = useState(produit.reserve ?? 0);
  const [commande, setCommande] = useState(produit.commande ?? 0);
  const [loading, setLoading]   = useState(false);

  const reel    = produit.quantite ?? 0;
  const virtuel = reel - Number(reserve || 0) + Number(commande || 0);

  const enregistrer = async () => {
    setLoading(true);
    const res = await ajusterStockVirtuel(produit.produit_id, Number(reserve), Number(commande));
    setLoading(false);
    if (res.success) { toast.success('Stock virtuel mis à jour'); onSuccess(); }
    else toast.error(res.message || 'Erreur');
  };

  const champ = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2196F3]';

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-sm'>
        <div className='flex items-center justify-between p-5 border-b'>
          <div className='flex items-center gap-2'>
            <Layers size={18} className='text-[#1E3A5F]' />
            <div>
              <h2 className='text-lg font-bold text-gray-800'>Stock virtuel</h2>
              <p className='text-xs text-gray-500'>{produit.nom}</p>
            </div>
          </div>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'><X size={20} /></button>
        </div>

        <div className='p-5 space-y-4'>
          <div className='bg-gray-50 rounded-xl p-3 flex items-center justify-between'>
            <span className='text-sm text-gray-500'>Stock réel (physique)</span>
            <span className='text-lg font-bold text-[#1E3A5F]'>{reel}</span>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Réservé <span className='text-gray-400 font-normal'>(commandes clients en attente)</span>
            </label>
            <input type='number' min='0' value={reserve}
              onChange={e => setReserve(e.target.value)} className={champ} />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              En commande <span className='text-gray-400 font-normal'>(réappro à venir)</span>
            </label>
            <input type='number' min='0' value={commande}
              onChange={e => setCommande(e.target.value)} className={champ} />
          </div>

          <div className='bg-blue-50 rounded-xl p-3 flex items-center justify-between'>
            <span className='text-xs text-gray-600'>Stock virtuel = réel − réservé + commande</span>
            <span className='text-2xl font-bold text-[#2196F3]'>{virtuel}</span>
          </div>
        </div>

        <div className='flex gap-3 p-5 border-t'>
          <button onClick={onFermer}
            className='flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors'>
            Annuler
          </button>
          <button onClick={enregistrer} disabled={loading}
            className='flex-1 bg-[#FF6B35] hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-colors'>
            {loading ? '...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
