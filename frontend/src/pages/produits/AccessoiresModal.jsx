// src/pages/produits/AccessoiresModal.jsx
// Gestion des accessoires liés à un produit (back-office manager/admin)
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Plus, Trash2, Link2, Sparkles } from 'lucide-react';
import { getAccessoires, lierAccessoire, delierAccessoire, getProduits } from '../../config/api';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');

export default function AccessoiresModal({ produit, onFermer }) {
  const [accessoires, setAccessoires] = useState([]);
  const [tousProduits, setTousProduits] = useState([]);
  const [chargement, setChargement]   = useState(true);
  const [choix, setChoix]             = useState('');   // id du produit à lier
  const [remise, setRemise]           = useState(0);
  const [ajoutEnCours, setAjout]      = useState(false);

  const charger = async () => {
    setChargement(true);
    const res = await getAccessoires(produit.id);
    if (res.success) setAccessoires(res.data);
    // Charger TOUS les produits (sans pagination) pour la liste déroulante
    const resP = await getProduits();
    if (resP.success) setTousProduits(resP.data);
    setChargement(false);
  };

  useEffect(() => { charger(); }, []);

  // Produits disponibles : tous sauf lui-même et ceux déjà liés
  const idsLies = accessoires.map(a => a.id);
  const disponibles = tousProduits.filter(
    p => p.id !== produit.id && !idsLies.includes(p.id)
  );

  const ajouter = async () => {
    if (!choix) { toast.error('Choisissez un produit'); return; }
    setAjout(true);
    const res = await lierAccessoire(produit.id, Number(choix), Number(remise));
    setAjout(false);
    if (res.success) {
      toast.success('Accessoire lié');
      setChoix(''); setRemise(0);
      charger();
    } else {
      toast.error(res.message || 'Erreur');
    }
  };

  const retirer = async (accId) => {
    const res = await delierAccessoire(produit.id, accId);
    if (res.success) {
      toast.success('Accessoire retiré');
      setAccessoires(prev => prev.filter(a => a.id !== accId));
    } else {
      toast.error(res.message || 'Erreur');
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto'>

        {/* En-tête */}
        <div className='flex items-center justify-between p-5 border-b sticky top-0 bg-white'>
          <div className='flex items-center gap-2'>
            <Link2 size={18} className='text-[#1E3A5F]' />
            <div>
              <h2 className='text-lg font-bold text-gray-800'>Accessoires liés</h2>
              <p className='text-xs text-gray-500'>{produit.nom}</p>
            </div>
          </div>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={22} />
          </button>
        </div>

        {/* Ajout d'un accessoire */}
        <div className='p-5 border-b bg-gray-50'>
          <p className='text-sm font-medium text-gray-700 mb-2'>Ajouter un accessoire</p>
          <div className='flex gap-2'>
            <select value={choix} onChange={e => setChoix(e.target.value)}
              className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3]'>
              <option value=''>— Choisir un produit —</option>
              {disponibles.map(p => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
            <div className='relative w-24'>
              <input type='number' min='0' max='100' value={remise}
                onChange={e => setRemise(e.target.value)}
                className='w-full border border-gray-300 rounded-lg pl-3 pr-7 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3]' />
              <span className='absolute right-2 top-2 text-gray-400 text-sm'>%</span>
            </div>
            <button onClick={ajouter} disabled={ajoutEnCours}
              className='bg-[#1E3A5F] hover:bg-blue-900 disabled:opacity-50 text-white
                         px-3 rounded-lg transition-colors'>
              <Plus size={18} />
            </button>
          </div>
          <p className='text-xs text-gray-400 mt-1'>Remise du pack appliquée à l'accessoire (0 = pas de remise)</p>
        </div>

        {/* Liste des accessoires liés */}
        <div className='p-5'>
          {chargement ? (
            <div className='flex justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]' />
            </div>
          ) : accessoires.length === 0 ? (
            <div className='text-center py-8 text-gray-400'>
              <Sparkles size={32} className='mx-auto mb-2 opacity-40' />
              <p className='text-sm'>Aucun accessoire lié</p>
              <p className='text-xs mt-1'>Ajoutez-en ci-dessus pour les suggérer à la caisse.</p>
            </div>
          ) : (
            <div className='space-y-2'>
              {accessoires.map(acc => (
                <div key={acc.id}
                  className='flex items-center gap-3 p-2 rounded-xl border border-gray-100'>
                  {acc.image_url ? (
                    <img src={acc.image_url} alt={acc.nom}
                      className='w-10 h-10 object-cover rounded-lg flex-shrink-0'
                      onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className='w-10 h-10 bg-gray-100 rounded-lg flex items-center
                                    justify-center text-gray-300 flex-shrink-0'>📦</div>
                  )}
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-gray-800 truncate'>{acc.nom}</p>
                    <p className='text-xs text-gray-500'>
                      {fmt(acc.prix_vente)} FCFA
                      {acc.remise_pack > 0 && (
                        <span className='ml-2 text-[#FF6B35] font-semibold'>-{acc.remise_pack}%</span>
                      )}
                    </p>
                  </div>
                  <button onClick={() => retirer(acc.id)}
                    className='text-gray-300 hover:text-red-500 transition-colors p-1'
                    title='Retirer'>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pied */}
        <div className='p-4 border-t'>
          <button onClick={onFermer}
            className='w-full bg-[#1E3A5F] hover:bg-blue-900 text-white
                       font-bold py-2.5 rounded-xl transition-colors'>
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
}
