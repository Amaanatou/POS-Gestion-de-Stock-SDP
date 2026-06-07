// src/pages/utilisateurs/Utilisateurs.jsx
// Back-office — gestion du personnel (admin uniquement)
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Search, X, UserCog, Power, Shield, Crown, ShoppingCart } from 'lucide-react';
import {
  getUtilisateurs, creerUtilisateur, modifierUtilisateur, basculerUtilisateur,
} from '../../config/api';
import { useAuth } from '../../context/AuthContext';

// Badge de rôle
function RoleBadge({ role }) {
  const cfg = {
    admin:    { label: 'Administrateur', classes: 'bg-purple-100 text-purple-700', icon: Crown },
    manager:  { label: 'Manager',        classes: 'bg-blue-100 text-blue-700',     icon: Shield },
    caissier: { label: 'Caissier',       classes: 'bg-green-100 text-green-700',   icon: ShoppingCart },
  };
  const { label, classes, icon: Icon } = cfg[role] ?? cfg.caissier;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
      <Icon size={11} /> {label}
    </span>
  );
}

// ── Modal Ajout / Modification ────────────────────────────────
function UtilisateurModal({ utilisateur, onFermer, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const estModif = !!utilisateur;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: utilisateur ?? { role: 'caissier' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const res = estModif
      ? await modifierUtilisateur(utilisateur.id, data)
      : await creerUtilisateur(data);
    setLoading(false);
    if (res.success) {
      toast.success(estModif ? 'Compte modifié !' : 'Compte créé !');
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
            <UserCog size={18} className='text-[#1E3A5F]' />
            <h2 className='text-lg font-bold text-gray-800'>
              {estModif ? 'Modifier le compte' : 'Nouveau compte'}
            </h2>
          </div>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className='p-5 space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Prénom <span className='text-red-500'>*</span>
              </label>
              <input type='text' placeholder='Ex : Fatou'
                {...register('prenom', { required: 'Requis' })}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
              {errors.prenom && <p className='text-red-500 text-xs mt-1'>{errors.prenom.message}</p>}
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Nom <span className='text-red-500'>*</span>
              </label>
              <input type='text' placeholder='Ex : Diop'
                {...register('nom', { required: 'Requis' })}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
              {errors.nom && <p className='text-red-500 text-xs mt-1'>{errors.nom.message}</p>}
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Email <span className='text-red-500'>*</span>
            </label>
            <input type='email' placeholder='prenom@sunustock.sn'
              {...register('email', { required: 'Email requis' })}
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
            {errors.email && <p className='text-red-500 text-xs mt-1'>{errors.email.message}</p>}
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Rôle</label>
            <select {...register('role')}
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800'>
              <option value='caissier'>Caissier</option>
              <option value='manager'>Manager</option>
              <option value='admin'>Administrateur</option>
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Mot de passe {estModif
                ? <span className='text-gray-400 font-normal'>(laisser vide pour ne pas changer)</span>
                : <span className='text-red-500'>*</span>}
            </label>
            <input type='password' placeholder='••••••••'
              {...register('mot_de_passe', estModif ? {} : { required: 'Mot de passe requis', minLength: { value: 6, message: 'Min 6 caractères' } })}
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
            {errors.mot_de_passe && <p className='text-red-500 text-xs mt-1'>{errors.mot_de_passe.message}</p>}
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
                : estModif ? 'Enregistrer' : 'Créer le compte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page Utilisateurs ─────────────────────────────────────────
export default function Utilisateurs() {
  const { utilisateur: moi } = useAuth();
  const [users, setUsers]       = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche]   = useState('');
  const [modal, setModal]           = useState(null);

  const charger = async () => {
    setChargement(true);
    const res = await getUtilisateurs();
    if (res.success) setUsers(res.data);
    setChargement(false);
  };

  useEffect(() => { charger(); }, []);

  const basculer = async (u) => {
    const res = await basculerUtilisateur(u.id);
    if (res.success) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, actif: x.actif ? 0 : 1 } : x));
      toast.success(u.actif ? 'Compte désactivé' : 'Compte activé');
    } else {
      toast.error(res.message || 'Erreur');
    }
  };

  const filtres = users.filter(u =>
    `${u.prenom} ${u.nom}`.toLowerCase().includes(recherche.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(recherche.toLowerCase())
  );

  if (chargement) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]' />
    </div>
  );

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold text-gray-800'>Gestion du personnel</h1>
        <button onClick={() => setModal('ajout')}
          className='flex items-center gap-2 bg-[#FF6B35] hover:bg-orange-600
                     text-white font-bold px-4 py-2.5 rounded-lg transition-colors'>
          <Plus size={18} /> Nouveau compte
        </button>
      </div>

      <div className='relative mb-5 max-w-md'>
        <Search size={15} className='absolute left-3 top-3 text-gray-400' />
        <input type='text' placeholder='Rechercher (nom, email)...'
          value={recherche} onChange={e => setRecherche(e.target.value)}
          className='w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-[#2196F3]' />
      </div>

      <div className='bg-white rounded-xl shadow overflow-hidden'>
        <table className='w-full'>
          <thead className='bg-[#1E3A5F] text-white text-sm'>
            <tr>
              {['Nom', 'Email', 'Rôle', 'Dernière connexion', 'Statut', 'Actions'].map(h => (
                <th key={h} className='px-4 py-3 text-left font-medium'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {filtres.map((u, i) => (
              <tr key={u.id}
                  className={`hover:bg-gray-50 transition-colors ${i % 2 ? 'bg-gray-50/40' : ''}
                              ${!u.actif ? 'opacity-50' : ''}`}>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center
                                    justify-center text-white text-xs font-bold'>
                      {u.prenom?.[0]?.toUpperCase()}{u.nom?.[0]?.toUpperCase()}
                    </div>
                    <span className='font-medium text-gray-800'>
                      {u.prenom} {u.nom}
                      {u.id === moi?.id && <span className='text-xs text-gray-400 ml-1'>(vous)</span>}
                    </span>
                  </div>
                </td>
                <td className='px-4 py-3 text-sm text-gray-600'>{u.email}</td>
                <td className='px-4 py-3'><RoleBadge role={u.role} /></td>
                <td className='px-4 py-3 text-sm text-gray-500'>
                  {u.derniere_connexion
                    ? new Date(u.derniere_connexion).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Jamais'}
                </td>
                <td className='px-4 py-3'>
                  {u.actif
                    ? <span className='px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700'>Actif</span>
                    : <span className='px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-500'>Inactif</span>}
                </td>
                <td className='px-4 py-3'>
                  <div className='flex gap-1'>
                    <button onClick={() => setModal(u)}
                      className='p-1.5 text-[#2196F3] hover:bg-blue-50 rounded-lg transition-colors'
                      title='Modifier'>
                      <Pencil size={15} />
                    </button>
                    {u.id !== moi?.id && (
                      <button onClick={() => basculer(u)}
                        className={`p-1.5 rounded-lg transition-colors
                          ${u.actif ? 'text-gray-400 hover:bg-gray-100' : 'text-green-500 hover:bg-green-50'}`}
                        title={u.actif ? 'Désactiver' : 'Activer'}>
                        <Power size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtres.length === 0 && (
          <div className='text-center py-12 text-gray-400'>Aucun compte trouvé</div>
        )}
      </div>

      <p className='text-xs text-gray-400 mt-3 text-right'>
        {filtres.length} compte{filtres.length > 1 ? 's' : ''}
      </p>

      {modal && (
        <UtilisateurModal
          utilisateur={modal === 'ajout' ? null : modal}
          onFermer={() => setModal(null)}
          onSuccess={() => { setModal(null); charger(); }}
        />
      )}
    </div>
  );
}
