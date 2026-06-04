// src/pages/stocks/EntreeStockModal.jsx
// Modal pour enregistrer une entrée de stock sur un produit
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { entreeStock } from '../../config/api';

export default function EntreeStockModal({ produit, onFermer, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    const res = await entreeStock(produit.produit_id, Number(data.quantite), data.motif);
    setLoading(false);
    if (res.success) {
      toast.success(`+${data.quantite} unités ajoutées pour ${produit.nom}`);
      onSuccess();
    } else {
      toast.error(res.message || 'Erreur lors de l\'entrée stock');
    }
  };

  return (
    // Fond sombre semi-transparent
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md'>

        {/* ── En-tête ── */}
        <div className='flex items-center justify-between p-6 border-b'>
          <div>
            <h2 className='text-lg font-bold text-gray-800'>Entrée de stock</h2>
            <p className='text-sm text-gray-500 mt-0.5'>{produit.nom}</p>
          </div>
          <button
            onClick={onFermer}
            className='text-gray-400 hover:text-gray-600 transition-colors'
          >
            <X size={22} />
          </button>
        </div>

        {/* ── Formulaire ── */}
        <form onSubmit={handleSubmit(onSubmit)} className='p-6 space-y-4'>

          {/* Stock actuel (informatif) */}
          <div className='bg-gray-50 rounded-lg p-3 flex justify-between text-sm'>
            <span className='text-gray-500'>Stock actuel</span>
            <span className='font-bold text-gray-800'>{produit.quantite} unités</span>
          </div>

          {/* Quantité à ajouter */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Quantité à ajouter <span className='text-red-500'>*</span>
            </label>
            <input
              type='number'
              min='1'
              placeholder='Ex : 50'
              {...register('quantite', {
                required: 'Quantité requise',
                min: { value: 1, message: 'Minimum 1 unité' },
              })}
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3]
                         focus:border-transparent text-gray-800'
            />
            {errors.quantite && (
              <p className='text-red-500 text-xs mt-1'>{errors.quantite.message}</p>
            )}
          </div>

          {/* Motif */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Motif / Référence livraison
            </label>
            <input
              type='text'
              placeholder='Ex : Livraison fournisseur ABC'
              {...register('motif')}
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3]
                         focus:border-transparent text-gray-800'
            />
          </div>

          {/* Boutons */}
          <div className='flex gap-3 pt-2'>
            <button
              type='button'
              onClick={onFermer}
              className='flex-1 border border-gray-300 text-gray-700 font-medium
                         py-2.5 rounded-lg hover:bg-gray-50 transition-colors'
            >
              Annuler
            </button>
            <button
              type='submit'
              disabled={loading}
              className='flex-1 bg-[#1E3A5F] hover:bg-blue-900 disabled:opacity-50
                         text-white font-bold py-2.5 rounded-lg transition-colors
                         flex items-center justify-center gap-2'
            >
              {loading ? (
                <span className='animate-spin border-2 border-white border-t-transparent
                                 rounded-full w-4 h-4 inline-block' />
              ) : '+ Confirmer l\'entrée'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
