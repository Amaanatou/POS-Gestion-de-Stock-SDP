// src/pages/journal/Journal.jsx
// Journal d'audit — traçabilité des actions critiques (admin uniquement)
import { useState, useEffect } from 'react';
import { getJournal } from '../../config/api';
import {
  ShieldAlert, XCircle, TrendingUp, SlidersHorizontal,
  UserX, UserCheck, FileClock, PackagePlus, PackageMinus,
} from 'lucide-react';

// Config visuelle par type d'action
const ACTIONS = {
  annulation_vente:     { label: 'Annulation vente',    icon: XCircle,          classes: 'bg-red-100 text-red-700' },
  modification_prix:    { label: 'Modification prix',   icon: TrendingUp,       classes: 'bg-orange-100 text-orange-700' },
  entree_stock:         { label: 'Entrée stock',        icon: PackagePlus,      classes: 'bg-green-100 text-green-700' },
  perte_casse:          { label: 'Perte / Casse',       icon: PackageMinus,     classes: 'bg-red-100 text-red-700' },
  ajustement_stock:     { label: 'Ajustement stock',    icon: SlidersHorizontal,classes: 'bg-blue-100 text-blue-700' },
  desactivation_compte: { label: 'Désactivation compte',icon: UserX,            classes: 'bg-gray-200 text-gray-700' },
  activation_compte:    { label: 'Activation compte',   icon: UserCheck,        classes: 'bg-green-100 text-green-700' },
};

function ActionBadge({ action }) {
  const cfg = ACTIONS[action] ?? { label: action, icon: FileClock, classes: 'bg-gray-100 text-gray-600' };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.classes}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

export default function Journal() {
  const [logs, setLogs]             = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre]         = useState('');

  const charger = async (action = '') => {
    setChargement(true);
    const res = await getJournal(action);
    if (res.success) setLogs(res.data);
    setChargement(false);
  };

  useEffect(() => { charger(filtre); }, [filtre]);

  return (
    <div>
      <div className='flex items-center gap-2 mb-2'>
        <ShieldAlert size={22} className='text-[#1E3A5F]' />
        <h1 className='text-2xl font-bold text-gray-800'>Journal d'audit</h1>
      </div>
      <p className='text-sm text-gray-500 mb-6'>
        Traçabilité de toutes les actions sensibles (sécurité)
      </p>

      {/* Filtre par type d'action — menu déroulant */}
      <div className='flex items-center gap-3 mb-5'>
        <label className='text-sm font-medium text-gray-600'>Filtrer par action :</label>
        <select
          value={filtre}
          onChange={e => setFiltre(e.target.value)}
          className='border border-gray-300 rounded-lg px-4 py-2 bg-white text-sm min-w-56
                     focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-700'
        >
          <option value=''>Toutes les actions</option>
          {Object.entries(ACTIONS).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {chargement ? (
        <div className='flex items-center justify-center h-64'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]' />
        </div>
      ) : (
        <div className='bg-white rounded-xl shadow overflow-hidden'>
          <table className='w-full'>
            <thead className='bg-[#1E3A5F] text-white text-sm'>
              <tr>
                {['Date & heure', 'Action', 'Cible', 'Détails', 'Effectué par'].map(h => (
                  <th key={h} className='px-4 py-3 text-left font-medium'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {logs.map((l, i) => (
                <tr key={l.id}
                    className={`hover:bg-gray-50 transition-colors ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                  <td className='px-4 py-3 text-sm text-gray-500 whitespace-nowrap'>
                    {new Date(l.created_at).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className='px-4 py-3'><ActionBadge action={l.action} /></td>
                  <td className='px-4 py-3 text-sm font-medium text-gray-800'>{l.cible || '—'}</td>
                  <td className='px-4 py-3 text-sm text-gray-500'>{l.details || '—'}</td>
                  <td className='px-4 py-3 text-sm text-gray-600'>
                    {l.utilisateur || 'Système'}
                    {l.role && <span className='text-xs text-gray-400 ml-1 capitalize'>({l.role})</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div className='text-center py-12 text-gray-400'>
              Aucune action enregistrée pour ce filtre
            </div>
          )}
        </div>
      )}

      <p className='text-xs text-gray-400 mt-3 text-right'>
        {logs.length} entrée{logs.length > 1 ? 's' : ''} — 200 dernières actions
      </p>
    </div>
  );
}
