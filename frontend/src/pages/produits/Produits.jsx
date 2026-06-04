// src/pages/produits/Produits.jsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { getProduits, creerProduit, modifierProduit } from '../../config/api';

// ── Modal Ajout / Modification ───────────────────────────────
function ProduitModal({ produit, onFermer, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const estModification = !!produit;

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: produit ?? {},
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const res = estModification
      ? await modifierProduit(produit.id, data)
      : await creerProduit(data);
    setLoading(false);
    if (res.success) {
      toast.success(estModification ? 'Produit modifié !' : 'Produit ajouté !');
      onSuccess();
    } else {
      toast.error(res.message || 'Une erreur est survenue');
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg'>

        <div className='flex items-center justify-between p-6 border-b'>
          <h2 className='text-lg font-bold text-gray-800'>
            {estModification ? 'Modifier le produit' : 'Ajouter un produit'}
          </h2>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className='p-6 space-y-4'>
          <div className='grid grid-cols-2 gap-4'>

            {/* Nom */}
            <div className='col-span-2'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Nom du produit <span className='text-red-500'>*</span>
              </label>
              <input
                type='text'
                placeholder='Ex : Riz Tilda 5kg'
                {...register('nom', { required: 'Nom requis' })}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3]
                           focus:border-transparent text-gray-800'
              />
              {errors.nom && <p className='text-red-500 text-xs mt-1'>{errors.nom.message}</p>}
            </div>

            {/* Catégorie */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Catégorie</label>
              <select
                {...register('categorie')}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3]
                           focus:border-transparent text-gray-800 bg-white'
              >
                <option value=''>— Choisir —</option>
                <option>Alimentation</option>
                <option>Boissons</option>
                <option>Hygiène</option>
                <option>Électronique</option>
                <option>Fournitures</option>
                <option>Autre</option>
              </select>
            </div>

            {/* Code-barres */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Code-barres</label>
              <input
                type='text'
                placeholder='Ex : 6001234567890'
                {...register('code_barre')}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3]
                           focus:border-transparent text-gray-800 font-mono'
              />
            </div>

            {/* Prix */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Prix de vente (FCFA) <span className='text-red-500'>*</span>
              </label>
              <input
                type='number' min='0' step='1'
                placeholder='Ex : 2500'
                {...register('prix_vente', { required: 'Prix requis', min: 0 })}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3]
                           focus:border-transparent text-gray-800'
              />
              {errors.prix_vente && (
                <p className='text-red-500 text-xs mt-1'>{errors.prix_vente.message}</p>
              )}
            </div>

            {/* Seuil alerte */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Seuil d'alerte stock
              </label>
              <input
                type='number' min='0'
                placeholder='Ex : 10'
                {...register('seuil_alerte', { min: 0 })}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3]
                           focus:border-transparent text-gray-800'
              />
            </div>

          </div>

          <div className='flex gap-3 pt-2'>
            <button
              type='button' onClick={onFermer}
              className='flex-1 border border-gray-300 text-gray-700 font-medium
                         py-2.5 rounded-lg hover:bg-gray-50 transition-colors'
            >
              Annuler
            </button>
            <button
              type='submit' disabled={loading}
              className='flex-1 bg-[#FF6B35] hover:bg-orange-600 disabled:opacity-50
                         text-white font-bold py-2.5 rounded-lg transition-colors
                         flex items-center justify-center gap-2'
            >
              {loading
                ? <span className='animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4' />
                : (estModification ? 'Enregistrer' : 'Ajouter le produit')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page Produits ─────────────────────────────────────────────
export default function Produits() {
  const [produits, setProduits]     = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche]   = useState('');
  const [modal, setModal]           = useState(null); // null | 'ajout' | produit (modif)

  const charger = async () => {
    setChargement(true);
    const res = await getProduits();
    if (res.success) setProduits(res.data);
    setChargement(false);
  };

  useEffect(() => { charger(); }, []);

  const filtres = produits.filter(p =>
    p.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    (p.categorie || '').toLowerCase().includes(recherche.toLowerCase())
  );

  if (chargement) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]' />
    </div>
  );

  return (
    <div>
      {/* ── En-tête ── */}
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold text-gray-800'>Catalogue Produits</h1>
        <button
          onClick={() => setModal('ajout')}
          className='flex items-center gap-2 bg-[#FF6B35] hover:bg-orange-600
                     text-white font-bold px-4 py-2.5 rounded-lg transition-colors'
        >
          <Plus size={18} /> Ajouter un produit
        </button>
      </div>

      {/* ── Barre de recherche ── */}
      <div className='relative mb-5'>
        <Search size={16} className='absolute left-3 top-3 text-gray-400' />
        <input
          type='text'
          placeholder='Rechercher par nom ou catégorie...'
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          className='w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-[#2196F3]
                     focus:border-transparent text-gray-800'
        />
      </div>

      {/* ── Tableau ── */}
      <div className='bg-white rounded-xl shadow overflow-hidden'>
        <table className='w-full'>
          <thead className='bg-[#1E3A5F] text-white text-sm'>
            <tr>
              {['Nom', 'Catégorie', 'Code-barres', 'Prix de vente', 'Seuil alerte', 'Actions'].map(h => (
                <th key={h} className='px-4 py-3 text-left font-medium'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {filtres.map((p, i) => (
              <tr
                key={p.id}
                className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}
              >
                <td className='px-4 py-3 font-medium text-gray-800'>{p.nom}</td>
                <td className='px-4 py-3 text-sm text-gray-500'>{p.categorie || '—'}</td>
                <td className='px-4 py-3 text-sm text-gray-500 font-mono'>{p.code_barre || '—'}</td>
                <td className='px-4 py-3 text-sm font-semibold text-gray-700'>
                  {p.prix_vente ? `${Number(p.prix_vente).toLocaleString('fr-FR')} FCFA` : '—'}
                </td>
                <td className='px-4 py-3 text-sm text-gray-500'>{p.seuil_alerte ?? '—'}</td>
                <td className='px-4 py-3'>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => setModal(p)}
                      className='p-1.5 text-[#2196F3] hover:bg-blue-50 rounded-lg transition-colors'
                      title='Modifier'
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtres.length === 0 && (
          <div className='text-center py-12 text-gray-400'>
            {recherche ? 'Aucun produit trouvé pour cette recherche.' : 'Aucun produit enregistré.'}
          </div>
        )}
      </div>

      <p className='text-xs text-gray-400 mt-3 text-right'>
        {filtres.length} produit{filtres.length > 1 ? 's' : ''} affiché{filtres.length > 1 ? 's' : ''}
      </p>

      {/* ── Modals ── */}
      {modal && (
        <ProduitModal
          produit={modal === 'ajout' ? null : modal}
          onFermer={() => setModal(null)}
          onSuccess={() => { setModal(null); charger(); }}
        />
      )}
    </div>
  );
}
