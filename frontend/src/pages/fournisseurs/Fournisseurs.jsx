// src/pages/fournisseurs/Fournisseurs.jsx
// Back-office — gestion des fournisseurs (manager/admin)
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Search, X, Truck, Phone, Mail, MapPin, Power } from 'lucide-react';
import {
  getFournisseurs, creerFournisseur, modifierFournisseur, basculerFournisseur,
} from '../../config/api';

// ── Modal Ajout / Modification ────────────────────────────────
function FournisseurModal({ fournisseur, onFermer, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const estModif = !!fournisseur;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: fournisseur ?? {},
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const res = estModif
      ? await modifierFournisseur(fournisseur.id, data)
      : await creerFournisseur(data);
    setLoading(false);
    if (res.success) {
      toast.success(estModif ? 'Fournisseur modifié !' : 'Fournisseur ajouté !');
      onSuccess();
    } else {
      toast.error(res.message || 'Une erreur est survenue');
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md'>
        <div className='flex items-center justify-between p-5 border-b'>
          <div className='flex items-center gap-2'>
            <Truck size={18} className='text-[#1E3A5F]' />
            <h2 className='text-lg font-bold text-gray-800'>
              {estModif ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
            </h2>
          </div>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className='p-5 space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Nom <span className='text-red-500'>*</span>
            </label>
            <input type='text' placeholder='Ex : CFAO Retail Sénégal'
              {...register('nom', { required: 'Nom requis' })}
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
            {errors.nom && <p className='text-red-500 text-xs mt-1'>{errors.nom.message}</p>}
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Téléphone</label>
              <input type='tel' placeholder='Ex : 338392000'
                {...register('telephone')}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
              <input type='email' placeholder='contact@...'
                {...register('email')}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Adresse</label>
            <textarea rows='2' placeholder='Ex : Dakar Plateau, Rue du Thiong'
              {...register('adresse')}
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800 resize-none' />
          </div>

          <div className='flex gap-3 pt-2'>
            <button type='button' onClick={onFermer}
              className='flex-1 border border-gray-300 text-gray-700 font-medium
                         py-2.5 rounded-lg hover:bg-gray-50 transition-colors'>
              Annuler
            </button>
            <button type='submit' disabled={loading}
              className='flex-1 bg-[#FF6B35] hover:bg-orange-600 disabled:opacity-50
                         text-white font-bold py-2.5 rounded-lg transition-colors
                         flex items-center justify-center gap-2'>
              {loading
                ? <span className='animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4' />
                : estModif ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page Fournisseurs ─────────────────────────────────────────
export default function Fournisseurs() {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [chargement, setChargement]     = useState(true);
  const [recherche, setRecherche]       = useState('');
  const [modal, setModal]               = useState(null); // 'ajout' | fournisseur

  const charger = async () => {
    setChargement(true);
    const res = await getFournisseurs();
    if (res.success) setFournisseurs(res.data);
    setChargement(false);
  };

  useEffect(() => { charger(); }, []);

  const basculer = async (f) => {
    const res = await basculerFournisseur(f.id);
    if (res.success) {
      setFournisseurs(prev => prev.map(x =>
        x.id === f.id ? { ...x, actif: x.actif ? 0 : 1 } : x
      ));
      toast.success(f.actif ? 'Fournisseur désactivé' : 'Fournisseur activé');
    } else {
      toast.error('Erreur');
    }
  };

  const filtres = fournisseurs.filter(f =>
    f.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    (f.email || '').toLowerCase().includes(recherche.toLowerCase())
  );

  if (chargement) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]' />
    </div>
  );

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold text-gray-800'>Fournisseurs</h1>
        <button onClick={() => setModal('ajout')}
          className='flex items-center gap-2 bg-[#FF6B35] hover:bg-orange-600
                     text-white font-bold px-4 py-2.5 rounded-lg transition-colors'>
          <Plus size={18} /> Ajouter un fournisseur
        </button>
      </div>

      {/* Recherche */}
      <div className='relative mb-5 max-w-md'>
        <Search size={15} className='absolute left-3 top-3 text-gray-400' />
        <input type='text' placeholder='Rechercher (nom, email)...'
          value={recherche} onChange={e => setRecherche(e.target.value)}
          className='w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-[#2196F3]' />
      </div>

      {/* Tableau */}
      <div className='bg-white rounded-xl shadow overflow-hidden'>
        <table className='w-full'>
          <thead className='bg-[#1E3A5F] text-white text-sm'>
            <tr>
              {['Fournisseur', 'Téléphone', 'Email', 'Adresse', 'Statut', 'Actions'].map(h => (
                <th key={h} className='px-4 py-3 text-left font-medium'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {filtres.map((f, i) => (
              <tr key={f.id}
                  className={`hover:bg-gray-50 transition-colors ${i % 2 ? 'bg-gray-50/40' : ''}
                              ${!f.actif ? 'opacity-50' : ''}`}>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center
                                    justify-center text-[#1E3A5F]'>
                      <Truck size={15} />
                    </div>
                    <span className='font-medium text-gray-800'>{f.nom}</span>
                  </div>
                </td>
                <td className='px-4 py-3 text-sm text-gray-600'>
                  {f.telephone ? (
                    <span className='flex items-center gap-1'><Phone size={12} /> {f.telephone}</span>
                  ) : '—'}
                </td>
                <td className='px-4 py-3 text-sm text-gray-600'>
                  {f.email ? (
                    <span className='flex items-center gap-1'><Mail size={12} /> {f.email}</span>
                  ) : '—'}
                </td>
                <td className='px-4 py-3 text-sm text-gray-500'>
                  {f.adresse ? (
                    <span className='flex items-center gap-1'><MapPin size={12} /> {f.adresse}</span>
                  ) : '—'}
                </td>
                <td className='px-4 py-3'>
                  {f.actif
                    ? <span className='px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700'>Actif</span>
                    : <span className='px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-500'>Inactif</span>}
                </td>
                <td className='px-4 py-3'>
                  <div className='flex gap-1'>
                    <button onClick={() => setModal(f)}
                      className='p-1.5 text-[#2196F3] hover:bg-blue-50 rounded-lg transition-colors'
                      title='Modifier'>
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => basculer(f)}
                      className={`p-1.5 rounded-lg transition-colors
                        ${f.actif ? 'text-gray-400 hover:bg-gray-100' : 'text-green-500 hover:bg-green-50'}`}
                      title={f.actif ? 'Désactiver' : 'Activer'}>
                      <Power size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtres.length === 0 && (
          <div className='text-center py-12 text-gray-400'>Aucun fournisseur trouvé</div>
        )}
      </div>

      <p className='text-xs text-gray-400 mt-3 text-right'>
        {filtres.length} fournisseur{filtres.length > 1 ? 's' : ''}
      </p>

      {modal && (
        <FournisseurModal
          fournisseur={modal === 'ajout' ? null : modal}
          onFermer={() => setModal(null)}
          onSuccess={() => { setModal(null); charger(); }}
        />
      )}
    </div>
  );
}
