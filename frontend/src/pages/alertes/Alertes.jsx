// src/pages/alertes/Alertes.jsx
import { useState, useEffect } from 'react';
import { getAlertes, marquerAlerteLue } from '../../config/api';
import { AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Badge statut alerte ───────────────────────────────────────
function NiveauBadge({ niveau }) {
  const cfg = {
    rupture:  { label: 'Rupture',  classes: 'bg-red-100 text-red-700 border border-red-200' },
    critique: { label: 'Critique', classes: 'bg-orange-100 text-orange-700 border border-orange-200' },
  };
  const { label, classes } = cfg[niveau] ?? cfg.critique;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

export default function Alertes() {
  const [alertes, setAlertes]       = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre]         = useState('toutes'); // toutes | actives | lues

  const charger = async () => {
    setChargement(true);
    const res = await getAlertes();
    if (res.success) setAlertes(res.data);
    setChargement(false);
  };

  useEffect(() => { charger(); }, []);

  const marquerLue = async (alerte) => {
    // Optimistic update : on met à jour l'UI immédiatement
    setAlertes(prev =>
      prev.map(a => a.id === alerte.id ? { ...a, lue: true } : a)
    );
    const res = await marquerAlerteLue(alerte.id);
    if (!res.success) {
      // En cas d'erreur API : on annule le changement local
      setAlertes(prev =>
        prev.map(a => a.id === alerte.id ? { ...a, lue: false } : a)
      );
      toast.error('Impossible de marquer l\'alerte');
    }
  };

  const marquerToutesLues = async () => {
    const nonLues = alertes.filter(a => !a.lue);
    for (const a of nonLues) await marquerAlerteLue(a.id);
    setAlertes(prev => prev.map(a => ({ ...a, lue: true })));
    toast.success('Toutes les alertes marquées comme lues');
  };

  const affichees = alertes.filter(a => {
    if (filtre === 'actives') return !a.lue;
    if (filtre === 'lues')    return  a.lue;
    return true;
  });

  const nbNonLues = alertes.filter(a => !a.lue).length;

  if (chargement) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]' />
    </div>
  );

  return (
    <div>
      {/* ── En-tête ── */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3'>
          <h1 className='text-2xl font-bold text-gray-800'>Alertes de stock</h1>
          {nbNonLues > 0 && (
            <span className='bg-red-500 text-white text-xs font-bold
                             px-2 py-0.5 rounded-full'>
              {nbNonLues}
            </span>
          )}
        </div>
        {nbNonLues > 0 && (
          <button
            onClick={marquerToutesLues}
            className='flex items-center gap-2 text-sm text-gray-500
                       hover:text-[#1E3A5F] transition-colors border border-gray-200
                       hover:border-[#1E3A5F] px-3 py-2 rounded-lg'
          >
            <CheckCircle size={15} /> Tout marquer comme lu
          </button>
        )}
      </div>

      {/* ── Filtres ── */}
      <div className='flex gap-2 mb-5'>
        {[
          { key: 'toutes',  label: 'Toutes' },
          { key: 'actives', label: 'Non lues' },
          { key: 'lues',    label: 'Lues' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltre(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filtre === f.key
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Liste des alertes ── */}
      {affichees.length === 0 ? (
        <div className='bg-white rounded-xl shadow p-12 text-center'>
          <Bell size={40} className='mx-auto text-gray-300 mb-3' />
          <p className='text-gray-500 font-medium'>
            {filtre === 'actives' ? 'Aucune alerte active 🎉' : 'Aucune alerte'}
          </p>
          <p className='text-gray-400 text-sm mt-1'>
            {filtre === 'actives' && 'Tous vos stocks sont au-dessus du seuil d\'alerte.'}
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          {affichees.map(alerte => (
            <div
              key={alerte.id}
              className={`bg-white rounded-xl shadow p-4 flex items-center
                          justify-between gap-4 transition-opacity
                          ${alerte.lue ? 'opacity-60' : ''}`}
            >
              {/* Icône */}
              <div className={`w-10 h-10 rounded-full flex items-center
                               justify-center flex-shrink-0
                               ${alerte.niveau === 'rupture'
                                 ? 'bg-red-100'
                                 : 'bg-orange-100'}`}>
                <AlertTriangle
                  size={18}
                  className={alerte.niveau === 'rupture'
                    ? 'text-red-600'
                    : 'text-orange-500'}
                />
              </div>

              {/* Infos produit */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <p className='font-semibold text-gray-800 truncate'>{alerte.nom_produit}</p>
                  <NiveauBadge niveau={alerte.niveau} />
                </div>
                <p className='text-sm text-gray-500 mt-0.5'>
                  Stock actuel :&nbsp;
                  <span className='font-bold text-gray-700'>{alerte.quantite}</span>
                  &nbsp;— Seuil :&nbsp;
                  <span className='font-bold text-gray-700'>{alerte.seuil_alerte}</span>
                </p>
              </div>

              {/* Date */}
              <p className='text-xs text-gray-400 flex-shrink-0 hidden sm:block'>
                {alerte.date_alerte
                  ? new Date(alerte.date_alerte).toLocaleDateString('fr-FR')
                  : ''}
              </p>

              {/* Action */}
              {!alerte.lue ? (
                <button
                  onClick={() => marquerLue(alerte)}
                  className='flex items-center gap-1.5 text-xs font-medium
                             bg-gray-100 hover:bg-green-100 hover:text-green-700
                             text-gray-600 px-3 py-1.5 rounded-lg transition-colors
                             flex-shrink-0'
                >
                  <CheckCircle size={14} /> Marquer lu
                </button>
              ) : (
                <span className='flex items-center gap-1 text-xs text-green-600 flex-shrink-0'>
                  <CheckCircle size={14} /> Lu
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
