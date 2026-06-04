// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Package, AlertTriangle, ShoppingCart, TrendingUp } from 'lucide-react';
import { getDashboardStats } from '../config/api';

// ── Couleurs graphiques ───────────────────────────────────────
const COULEURS_PIE = ['#22c55e', '#f97316', '#ef4444'];

// ── Données de démo (remplacées dès que l'API répond) ────────
const VENTES_DEMO = [
  { jour: 'Lun', ventes: 12 },
  { jour: 'Mar', ventes: 19 },
  { jour: 'Mer', ventes: 8  },
  { jour: 'Jeu', ventes: 24 },
  { jour: 'Ven', ventes: 31 },
  { jour: 'Sam', ventes: 27 },
  { jour: 'Dim', ventes: 15 },
];
const STOCK_DEMO = [
  { name: 'Normal',   value: 42 },
  { name: 'Critique', value: 11 },
  { name: 'Rupture',  value: 4  },
];

// ── Carte KPI ────────────────────────────────────────────────
function CarteKPI({ titre, valeur, sousTitre, icone: Icone, couleur }) {
  return (
    <div className='bg-white rounded-xl shadow p-5 flex items-center gap-4'>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${couleur}`}>
        <Icone size={22} className='text-white' />
      </div>
      <div>
        <p className='text-sm text-gray-500'>{titre}</p>
        <p className='text-2xl font-bold text-gray-800'>{valeur}</p>
        <p className='text-xs text-gray-400 mt-0.5'>{sousTitre}</p>
      </div>
    </div>
  );
}

// ── Page Dashboard ───────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats]       = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    getDashboardStats().then(res => {
      if (res.success) setStats(res.data);
      setChargement(false);
    });
  }, []);

  // Données réelles si l'API répond, sinon démo
  const ventesData = stats?.ventes_semaine || VENTES_DEMO;
  const stockData  = stats?.repartition_stock || STOCK_DEMO;

  const kpis = [
    {
      titre:    'Produits en catalogue',
      valeur:   stats?.total_produits  ?? '—',
      sousTitre:'articles référencés',
      icone:    Package,
      couleur:  'bg-[#1E3A5F]',
    },
    {
      titre:    'Alertes de stock',
      valeur:   stats?.total_alertes   ?? '—',
      sousTitre:'produits en dessous du seuil',
      icone:    AlertTriangle,
      couleur:  'bg-orange-500',
    },
    {
      titre:    'Ventes aujourd\'hui',
      valeur:   stats?.ventes_jour     ?? '—',
      sousTitre:'transactions enregistrées',
      icone:    ShoppingCart,
      couleur:  'bg-green-500',
    },
    {
      titre:    'Chiffre du jour',
      valeur:   stats?.ca_jour
                  ? `${Number(stats.ca_jour).toLocaleString('fr-FR')} FCFA`
                  : '—',
      sousTitre:'recettes journalières',
      icone:    TrendingUp,
      couleur:  'bg-[#2196F3]',
    },
  ];

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-6'>Tableau de bord</h1>

      {/* ── Cartes KPI ── */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8'>
        {kpis.map(k => <CarteKPI key={k.titre} {...k} />)}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>

        {/* ── Graphique ventes hebdo ── */}
        <div className='lg:col-span-2 bg-white rounded-xl shadow p-5'>
          <h2 className='text-base font-semibold text-gray-700 mb-4'>
            Ventes de la semaine
          </h2>
          {chargement ? (
            <div className='flex items-center justify-center h-48'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]' />
            </div>
          ) : (
            <ResponsiveContainer width='100%' height={220}>
              <BarChart data={ventesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
                <XAxis dataKey='jour' tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                  formatter={v => [`${v} ventes`, '']}
                />
                <Bar dataKey='ventes' fill='#1E3A5F' radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Répartition du stock ── */}
        <div className='bg-white rounded-xl shadow p-5'>
          <h2 className='text-base font-semibold text-gray-700 mb-4'>
            État du stock
          </h2>
          {chargement ? (
            <div className='flex items-center justify-center h-48'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]' />
            </div>
          ) : (
            <ResponsiveContainer width='100%' height={220}>
              <PieChart>
                <Pie
                  data={stockData}
                  cx='50%' cy='45%'
                  innerRadius={55} outerRadius={80}
                  paddingAngle={3}
                  dataKey='value'
                >
                  {stockData.map((_, i) => (
                    <Cell key={i} fill={COULEURS_PIE[i % COULEURS_PIE.length]} />
                  ))}
                </Pie>
                <Legend
                  iconType='circle'
                  iconSize={8}
                  formatter={v => <span style={{ fontSize: 12 }}>{v}</span>}
                />
                <Tooltip formatter={v => [`${v} produits`, '']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}
