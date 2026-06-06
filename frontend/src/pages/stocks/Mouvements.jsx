// src/pages/stocks/Mouvements.jsx
import { useState, useEffect } from 'react';
import { getMouvements } from '../../config/api';
import { ArrowDownCircle, ArrowUpCircle, Filter } from 'lucide-react';

export default function Mouvements() {
  const [mouvements, setMouvements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre]         = useState('tous'); // tous | entree | sortie
  const [recherche, setRecherche]   = useState('');

  useEffect(() => {
    getMouvements().then(res => {
      if (res.success) setMouvements(res.data);
      setChargement(false);
    });
  }, []);

  const affichees = mouvements.filter(m => {
    const okType     = filtre === 'tous' || m.type === filtre;
    const okRecherche = m.nom_produit?.toLowerCase().includes(recherche.toLowerCase());
    return okType && okRecherche;
  });

  if (chargement) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]' />
    </div>
  );

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-6'>
        Historique des mouvements
      </h1>

      {/* ── Filtres ── */}
      <div className='flex flex-wrap gap-3 mb-5'>
        <input
          type='text'
          placeholder='Rechercher un produit...'
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          className='border rounded-lg px-4 py-2 flex-1 min-w-48
                     focus:outline-none focus:ring-2 focus:ring-[#2196F3]'
        />
        {[
          { key: 'tous',    label: 'Tous' },
          { key: 'entree',  label: '↑ Entrées' },
          { key: 'sortie',  label: '↓ Sorties' },
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

      {/* ── Tableau ── */}
      <div className='bg-white rounded-xl shadow overflow-hidden'>
        <table className='w-full'>
          <thead className='bg-[#1E3A5F] text-white text-sm'>
            <tr>
              {['Date', 'Produit', 'Type', 'Quantité', 'Motif', 'Utilisateur'].map(h => (
                <th key={h} className='px-4 py-3 text-left font-medium'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {affichees.map((m, i) => (
              <tr
                key={m.id}
                className={`hover:bg-gray-50 transition-colors
                  ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}
              >
                {/* Date */}
                <td className='px-4 py-3 text-sm text-gray-500 whitespace-nowrap'>
                  {m.created_at
                    ? new Date(m.created_at).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : '—'}
                </td>

                {/* Produit */}
                <td className='px-4 py-3 font-medium text-gray-800'>
                  {m.nom_produit}
                </td>

                {/* Type */}
                <td className='px-4 py-3'>
                  {m.type === 'entree' ? (
                    <span className='flex items-center gap-1.5 text-green-600 font-medium text-sm'>
                      <ArrowDownCircle size={15} /> Entrée
                    </span>
                  ) : (
                    <span className='flex items-center gap-1.5 text-red-500 font-medium text-sm'>
                      <ArrowUpCircle size={15} /> Sortie
                    </span>
                  )}
                </td>

                {/* Quantité */}
                <td className='px-4 py-3'>
                  <span className={`font-bold text-base
                    ${m.type === 'entree' ? 'text-green-600' : 'text-red-500'}`}>
                    {m.type === 'entree' ? '+' : '-'}{m.quantite}
                  </span>
                </td>

                {/* Motif */}
                <td className='px-4 py-3 text-sm text-gray-500'>
                  {m.motif || '—'}
                </td>

                {/* Utilisateur */}
                <td className='px-4 py-3 text-sm text-gray-500'>
                  {m.utilisateur || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {affichees.length === 0 && (
          <div className='text-center py-12 text-gray-400'>
            <Filter size={32} className='mx-auto mb-2 opacity-40' />
            <p>Aucun mouvement trouvé</p>
          </div>
        )}
      </div>

      <p className='text-xs text-gray-400 mt-3 text-right'>
        {affichees.length} mouvement{affichees.length > 1 ? 's' : ''} affiché{affichees.length > 1 ? 's' : ''}
      </p>
    </div>
  );
}
