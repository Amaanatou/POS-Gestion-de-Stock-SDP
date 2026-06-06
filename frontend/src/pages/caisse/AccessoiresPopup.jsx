// src/pages/caisse/AccessoiresPopup.jsx
// Pop-up de suggestion d'accessoires au scan/ajout d'un produit principal
import { Plus, Sparkles, X } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');

export default function AccessoiresPopup({ produitNom, accessoires, onAjouter, onFermer }) {
  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md'>

        {/* En-tête */}
        <div className='flex items-center justify-between p-4 border-b'>
          <div className='flex items-center gap-2'>
            <Sparkles size={18} className='text-[#FF6B35]' />
            <h2 className='font-bold text-gray-800'>Suggestions</h2>
          </div>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={20} />
          </button>
        </div>

        <p className='px-4 pt-3 text-sm text-gray-500'>
          Avec <span className='font-semibold text-gray-700'>{produitNom}</span>, proposez :
        </p>

        {/* Liste des accessoires */}
        <div className='p-4 space-y-2 max-h-80 overflow-y-auto'>
          {accessoires.map((acc) => {
            const aRemise   = acc.remise_pack > 0;
            const prixFinal = aRemise
              ? Math.round(acc.prix_vente * (1 - acc.remise_pack / 100))
              : acc.prix_vente;
            const rupture = acc.quantite === 0;

            return (
              <div key={acc.id}
                className='flex items-center gap-3 p-2 rounded-xl border border-gray-100
                           hover:border-[#2196F3] hover:bg-blue-50/40 transition-colors'>
                {/* Image */}
                {acc.image_url ? (
                  <img src={acc.image_url} alt={acc.nom}
                    className='w-12 h-12 object-cover rounded-lg flex-shrink-0'
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className='w-12 h-12 bg-gray-100 rounded-lg flex items-center
                                  justify-center text-gray-300 text-lg flex-shrink-0'>📦</div>
                )}

                {/* Infos */}
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-gray-800 truncate'>{acc.nom}</p>
                  <div className='flex items-center gap-2'>
                    {aRemise ? (
                      <>
                        <span className='text-xs text-gray-400 line-through'>
                          {fmt(acc.prix_vente)}
                        </span>
                        <span className='text-sm font-bold text-[#FF6B35]'>
                          {fmt(prixFinal)} FCFA
                        </span>
                        <span className='text-[10px] bg-[#FF6B35] text-white px-1.5 py-0.5
                                         rounded-full font-bold'>
                          -{acc.remise_pack}%
                        </span>
                      </>
                    ) : (
                      <span className='text-sm font-bold text-[#FF6B35]'>
                        {fmt(prixFinal)} FCFA
                      </span>
                    )}
                  </div>
                </div>

                {/* Bouton ajouter */}
                <button
                  disabled={rupture}
                  onClick={() => onAjouter(acc, prixFinal)}
                  className='flex items-center gap-1 bg-[#1E3A5F] hover:bg-blue-900
                             disabled:opacity-40 text-white text-xs font-medium
                             px-3 py-2 rounded-lg transition-colors flex-shrink-0'>
                  {rupture ? 'Rupture' : <><Plus size={14} /> Ajouter</>}
                </button>
              </div>
            );
          })}
        </div>

        {/* Pied */}
        <div className='p-4 border-t'>
          <button onClick={onFermer}
            className='w-full bg-gray-100 hover:bg-gray-200 text-gray-700
                       font-medium py-2.5 rounded-xl transition-colors'>
            Continuer sans ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
