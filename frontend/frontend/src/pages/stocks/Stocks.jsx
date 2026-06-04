// src/pages/stocks/Stocks.jsx
import { useState, useEffect } from 'react';
import { getStocks } from '../../config/api';
import StockBadge from '../../components/ui/StockBadge';

export default function Stocks() {
  const [stocks, setStocks]         = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche]   = useState('');
  const [filtre, setFiltre]         = useState('tous');

  const charger = async () => {
    setChargement(true);
    const res = await getStocks();
    if (res.success) setStocks(res.data);
    setChargement(false);
  };

  useEffect(() => { charger(); }, []);

  const filtres = stocks.filter(s => {
    const ok1 = s.nom.toLowerCase().includes(recherche.toLowerCase());
    const ok2 = filtre === 'tous' || s.statut === filtre;
    return ok1 && ok2;
  });

  if (chargement) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]'></div>
    </div>
  );

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-6'>Gestion des Stocks</h1>

      {/* Filtres */}
      <div className='flex flex-wrap gap-3 mb-6'>
        <input
          type='text' placeholder='Rechercher un produit...'
          value={recherche} onChange={e => setRecherche(e.target.value)}
          className='border rounded-lg px-4 py-2 flex-1 min-w-48 focus:outline-none
                     focus:ring-2 focus:ring-[#2196F3]'
        />
        {['tous', 'normal', 'critique', 'rupture'].map(f => (
          <button key={f} onClick={() => setFiltre(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors
              ${filtre === f
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Tableau des stocks */}
      <div className='bg-white rounded-xl shadow overflow-hidden'>
        <table className='w-full'>
          <thead className='bg-[#1E3A5F] text-white'>
            <tr>
              {['Produit', 'Code-barres', 'Quantité', 'Seuil alerte', 'Statut', 'Actions'].map(h => (
                <th key={h} className='px-4 py-3 text-left text-sm font-medium'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {filtres.map((s, i) => (
              <tr key={s.produit_id}
                  className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                <td className='px-4 py-3'>
                  <p className='font-medium text-gray-800'>{s.nom}</p>
                  <p className='text-xs text-gray-500'>{s.categorie}</p>
                </td>
                <td className='px-4 py-3 text-sm text-gray-600 font-mono'>{s.code_barre || '—'}</td>
                <td className='px-4 py-3'>
                  <span className={`text-lg font-bold
                    ${s.statut === 'rupture' ? 'text-red-600'
                      : s.statut === 'critique' ? 'text-orange-600'
                      : 'text-green-600'}`}>
                    {s.quantite}
                  </span>
                </td>
                <td className='px-4 py-3 text-sm text-gray-600'>{s.seuil_alerte}</td>
                <td className='px-4 py-3'><StockBadge statut={s.statut} /></td>
                <td className='px-4 py-3'>
                  <button
                    className='bg-[#2196F3] hover:bg-blue-700 text-white text-xs
                               px-3 py-1.5 rounded-lg transition-colors'>
                    + Entrée stock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtres.length === 0 && (
          <div className='text-center py-12 text-gray-500'>Aucun produit trouvé</div>
        )}
      </div>
    </div>
  );
}
