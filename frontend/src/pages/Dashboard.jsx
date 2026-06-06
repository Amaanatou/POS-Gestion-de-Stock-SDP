// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Package, AlertTriangle, ShoppingCart, TrendingUp, Calendar, Award } from 'lucide-react';
import { getDashboardStats } from '../config/api';

const COULEURS_PIE = ['#22c55e', '#f97316', '#ef4444'];

// ── Formatage montant FCFA ────────────────────────────────────
const fcfa = (n) => n ? `${Number(n).toLocaleString('fr-FR')} FCFA` : '—';

// ── Carte KPI ─────────────────────────────────────────────────
function CarteKPI({ titre, valeur, sousTitre, icone: Icone, couleur, petit }) {
  return (
    <div className='bg-white rounded-xl shadow p-5 flex items-center gap-4'>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${couleur}`}>
        <Icone size={22} className='text-white' />
      </div>
      <div className='min-w-0'>
        <p className='text-sm text-gray-500 truncate'>{titre}</p>
        <p className={`font-bold text-gray-800 truncate ${petit ? 'text-lg' : 'text-2xl'}`}>{valeur}</p>
        <p className='text-xs text-gray-400 mt-0.5 truncate'>{sousTitre}</p>
      </div>
    </div>
  );
}

// ── Badge mode paiement ───────────────────────────────────────
function BadgePaiement({ mode }) {
  const cfg = {
    especes:      { label: 'Espèces',      classes: 'bg-green-100 text-green-700' },
    carte:        { label: 'Carte',        classes: 'bg-blue-100 text-blue-700' },
    mobile_money: { label: 'Mobile Money', classes: 'bg-orange-100 text-orange-700' },
  };
  const { label, classes } = cfg[mode] ?? { label: mode, classes: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>{label}</span>;
}

export default function Dashboard() {
  const [stats, setStats]           = useState(null);
  const [chargement, setChargement] = useState(true);
  const [vueCA, setVueCA]           = useState('jour'); // jour | semaine | mois

  useEffect(() => {
    getDashboardStats().then(res => {
      if (res.success) setStats(res.data);
      setChargement(false);
    });
  }, []);

  const ventesData = stats?.ventes_semaine    || [];
  const stockData  = stats?.repartition_stock || [];
  const top10      = stats?.top10_produits    || [];
  const dernieres  = stats?.dernieres_ventes  || [];

  const caAffiche = vueCA === 'semaine'
    ? stats?.ca_semaine
    : vueCA === 'mois'
    ? stats?.ca_mois
    : stats?.ca_jour;

  const kpis = [
    {
      titre:    'Produits en catalogue',
      valeur:   stats?.total_produits ?? '—',
      sousTitre:'articles référencés',
      icone:    Package,
      couleur:  'bg-[#1E3A5F]',
    },
    {
      titre:    'Alertes de stock',
      valeur:   stats?.total_alertes ?? '—',
      sousTitre:'produits sous le seuil',
      icone:    AlertTriangle,
      couleur:  'bg-orange-500',
    },
    {
      titre:    'Ventes aujourd\'hui',
      valeur:   stats?.ventes_jour ?? '—',
      sousTitre:'transactions enregistrées',
      icone:    ShoppingCart,
      couleur:  'bg-green-500',
    },
    {
      titre:    vueCA === 'semaine' ? 'CA cette semaine'
                : vueCA === 'mois' ? 'CA ce mois'
                : 'CA aujourd\'hui',
      valeur:   caAffiche !== undefined ? fcfa(caAffiche) : '—',
      sousTitre:'chiffre d\'affaires',
      icone:    TrendingUp,
      couleur:  'bg-[#2196F3]',
      petit:    true,
    },
  ];

  if (chargement) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]' />
    </div>
  );

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-gray-800'>Tableau de bord</h1>
        {/* Sélecteur période CA */}
        <div className='flex gap-1 bg-gray-100 rounded-lg p-1'>
          {[
            { key: 'jour',    label: 'Jour' },
            { key: 'semaine', label: 'Semaine' },
            { key: 'mois',    label: 'Mois' },
          ].map(p => (
            <button key={p.key} onClick={() => setVueCA(p.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${vueCA === p.key ? 'bg-white shadow text-[#1E3A5F]' : 'text-gray-500 hover:text-gray-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        {kpis.map(k => <CarteKPI key={k.titre} {...k} />)}
      </div>

      {/* Graphiques */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Ventes semaine */}
        <div className='lg:col-span-2 bg-white rounded-xl shadow p-5'>
          <h2 className='text-base font-semibold text-gray-700 mb-4'>Ventes des 7 derniers jours</h2>
          {ventesData.length === 0 ? (
            <div className='flex items-center justify-center h-48 text-gray-300 text-sm'>
              Aucune vente cette semaine
            </div>
          ) : (
            <ResponsiveContainer width='100%' height={220}>
              <BarChart data={ventesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
                <XAxis dataKey='jour' tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                  formatter={(v, name) => [
                    name === 'ventes' ? `${v} ventes` : fcfa(v),
                    name === 'ventes' ? 'Ventes' : 'CA',
                  ]}
                />
                <Bar dataKey='ventes' fill='#1E3A5F' radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* État du stock */}
        <div className='bg-white rounded-xl shadow p-5'>
          <h2 className='text-base font-semibold text-gray-700 mb-4'>État du stock</h2>
          <ResponsiveContainer width='100%' height={220}>
            <PieChart>
              <Pie data={stockData} cx='50%' cy='45%'
                   innerRadius={55} outerRadius={80} paddingAngle={3} dataKey='value'>
                {stockData.map((_, i) => (
                  <Cell key={i} fill={COULEURS_PIE[i % COULEURS_PIE.length]} />
                ))}
              </Pie>
              <Legend iconType='circle' iconSize={8}
                formatter={v => <span style={{ fontSize: 12 }}>{v}</span>} />
              <Tooltip formatter={v => [`${v} produits`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 + Dernières ventes */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>

        {/* Top 10 produits */}
        <div className='bg-white rounded-xl shadow p-5'>
          <div className='flex items-center gap-2 mb-4'>
            <Award size={18} className='text-[#FF6B35]' />
            <h2 className='text-base font-semibold text-gray-700'>Top 10 produits vendus</h2>
          </div>
          {top10.length === 0 ? (
            <p className='text-gray-400 text-sm text-center py-8'>Aucune vente enregistrée</p>
          ) : (
            <div className='space-y-3'>
              {top10.map((p, i) => (
                <div key={i} className='flex items-center gap-3'>
                  {/* Rang */}
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center
                                    text-xs font-bold flex-shrink-0
                                    ${i === 0 ? 'bg-yellow-400 text-white'
                                    : i === 1 ? 'bg-gray-300 text-white'
                                    : i === 2 ? 'bg-orange-400 text-white'
                                    : 'bg-gray-100 text-gray-500'}`}>
                    {i + 1}
                  </span>
                  {/* Image */}
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.nom}
                      className='w-8 h-8 object-cover rounded-md flex-shrink-0'
                      onError={e => { e.target.style.display='none'; }} />
                  ) : (
                    <div className='w-8 h-8 bg-gray-100 rounded-md flex-shrink-0 flex items-center justify-center'>
                      <span className='text-sm'>📦</span>
                    </div>
                  )}
                  {/* Nom + stats */}
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-gray-800 truncate'>{p.nom}</p>
                    <p className='text-xs text-gray-400'>{fcfa(p.ca_total)}</p>
                  </div>
                  {/* Quantité vendue */}
                  <span className='text-sm font-bold text-[#1E3A5F] flex-shrink-0'>
                    {p.total_vendu} u.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dernières transactions */}
        <div className='bg-white rounded-xl shadow p-5'>
          <div className='flex items-center gap-2 mb-4'>
            <Calendar size={18} className='text-[#2196F3]' />
            <h2 className='text-base font-semibold text-gray-700'>Dernières transactions</h2>
          </div>
          {dernieres.length === 0 ? (
            <p className='text-gray-400 text-sm text-center py-8'>Aucune transaction</p>
          ) : (
            <div className='space-y-2'>
              {dernieres.map(v => (
                <div key={v.id}
                     className='flex items-center justify-between p-3 rounded-lg
                                bg-gray-50 hover:bg-gray-100 transition-colors'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <p className='text-sm font-mono font-medium text-gray-700'>{v.numero}</p>
                      <BadgePaiement mode={v.mode_paiement} />
                    </div>
                    <p className='text-xs text-gray-400 mt-0.5'>
                      {v.caissier} · {v.nb_articles} article{v.nb_articles > 1 ? 's' : ''} ·{' '}
                      {new Date(v.created_at).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className='font-bold text-[#1E3A5F] ml-3 flex-shrink-0'>
                    {Number(v.total_ttc).toLocaleString('fr-FR')} F
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
