// src/pages/stocks/SortieStockModal.jsx
// Déclaration d'une sortie / perte / casse de stock (justificatif interne §2.3)
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { X, PackageMinus, AlertTriangle } from 'lucide-react';
import { sortieStock } from '../../config/api';

// Motifs prédéfinis → type de mouvement
const MOTIFS = [
  { value: 'Casse',           type: 'perte' },
  { value: 'Vol',             type: 'perte' },
  { value: 'Péremption',      type: 'perte' },
  { value: 'Produit abîmé',   type: 'perte' },
  { value: 'Sortie diverse',  type: 'sortie' },
];

export default function SortieStockModal({ produit, onFermer, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { motif: 'Casse' },
  });

  const motifChoisi = watch('motif');
  const typeMouvement = MOTIFS.find(m => m.value === motifChoisi)?.type ?? 'sortie';

  const onSubmit = async (data) => {
    const qte = Number(data.quantite);
    if (qte > produit.quantite) {
      toast.error(`Maximum ${produit.quantite} disponible(s)`);
      return;
    }
    setLoading(true);
    const motifComplet = data.precision
      ? `${data.motif} — ${data.precision}`
      : data.motif;
    const res = await sortieStock(produit.produit_id, qte, motifComplet, typeMouvement);
    setLoading(false);
    if (res.success) {
      toast.success(`-${qte} retiré(s) du stock de ${produit.nom}`);
      onSuccess();
    } else {
      toast.error(res.message || 'Erreur lors de la sortie');
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md'>

        <div className='flex items-center justify-between p-6 border-b'>
          <div className='flex items-center gap-2'>
            <PackageMinus size={20} className='text-red-500' />
            <div>
              <h2 className='text-lg font-bold text-gray-800'>Sortie / Perte de stock</h2>
              <p className='text-sm text-gray-500'>{produit.nom}</p>
            </div>
          </div>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className='p-6 space-y-4'>
          {/* Stock actuel */}
          <div className='bg-gray-50 rounded-lg p-3 flex justify-between text-sm'>
            <span className='text-gray-500'>Stock actuel</span>
            <span className='font-bold text-gray-800'>{produit.quantite} unités</span>
          </div>

          {/* Motif */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Motif <span className='text-red-500'>*</span>
            </label>
            <select {...register('motif')}
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800'>
              {MOTIFS.map(m => <option key={m.value} value={m.value}>{m.value}</option>)}
            </select>
            {typeMouvement === 'perte' && (
              <p className='text-xs text-orange-600 mt-1 flex items-center gap-1'>
                <AlertTriangle size={12} /> Sera enregistré comme perte (tracé dans le journal)
              </p>
            )}
          </div>

          {/* Précision */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Précision (optionnel)
            </label>
            <input type='text' placeholder='Ex : carton tombé, dégât des eaux...'
              {...register('precision')}
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
          </div>

          {/* Quantité */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Quantité à retirer <span className='text-red-500'>*</span>
            </label>
            <input type='number' min='1' max={produit.quantite} placeholder='Ex : 3'
              {...register('quantite', {
                required: 'Quantité requise',
                min: { value: 1, message: 'Minimum 1' },
              })}
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
            {errors.quantite && <p className='text-red-500 text-xs mt-1'>{errors.quantite.message}</p>}
          </div>

          <div className='flex gap-3 pt-2'>
            <button type='button' onClick={onFermer}
              className='flex-1 border border-gray-300 text-gray-700 font-medium
                         py-2.5 rounded-lg hover:bg-gray-50 transition-colors'>
              Annuler
            </button>
            <button type='submit' disabled={loading}
              className='flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50
                         text-white font-bold py-2.5 rounded-lg transition-colors
                         flex items-center justify-center gap-2'>
              {loading
                ? <span className='animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4' />
                : 'Confirmer la sortie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
