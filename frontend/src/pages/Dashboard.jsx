// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts';
import {
  Boxes, AlertTriangle, ShieldCheck, Receipt, Coins, Wallet,
  Landmark, BarChart3, Gauge, Trophy, History,
} from 'lucide-react';
import { getDashboardStats } from '../config/api';
import { useAuth } from '../context/AuthContext';

const COULEURS_PIE = ['#22c55e', '#f97316', '#ef4444']; // Normal / Critique / Rupture

// ── Formatage montant FCFA (0 affiché, null/undefined → tiret) ──
const fcfa = (n) => (n || n === 0) ? `${Number(n).toLocaleString('fr-FR')} FCFA` : '—';

// ── Mini-graphe de tendance (sparkline) sur 7 jours ───────────
function Sparkline({ data, color, id }) {
  const d = (data || []).map((v, i) => ({ i, v }));
  if (d.length < 2) return null;
  return (
    <ResponsiveContainer width='100%' height={34}>
      <AreaChart data={d} margin={{ top: 3, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor={color} stopOpacity={0.35} />
            <stop offset='100%' stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type='monotone' dataKey='v' stroke={color} strokeWidth={2}
              fill={`url(#${id})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Carte KPI : chip d'icône teintée + barre d'accent + grand chiffre ──
function CarteKPI({ titre, valeur, sousTitre, icone: Icone, accent, teinte, petit, hero, spark }) {
  // Variante « vedette » : carte pleine bleu marine + icône orange → casse l'uniformité
  if (hero) {
    return (
      <div className='relative rounded-2xl p-5 overflow-hidden shadow-sm bg-[#1E3A5F] text-white flex flex-col h-full'>
        <div className='absolute -right-6 -bottom-8 w-28 h-28 rounded-full bg-white/5' />
        <div className='relative flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <p className='text-sm text-white/70 truncate'>{titre}</p>
            <p className='text-2xl font-bold mt-1 truncate'>{valeur}</p>
            <p className='text-xs text-white/55 mt-1 truncate'>{sousTitre}</p>
          </div>
          <div className='w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0'>
            <Icone size={24} className='text-[#FF6B35]' />
          </div>
        </div>
        {spark && (
          <div className='relative mt-auto pt-3'>
            <Sparkline data={spark.data} color={spark.color} id={spark.id} />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className='relative bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5
                    overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full'>
      <span className={`absolute left-0 top-0 h-full w-1.5 ${accent}`} />
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-sm text-gray-500 truncate'>{titre}</p>
          <p className={`font-bold text-gray-900 mt-1 truncate ${petit ? 'text-xl' : 'text-3xl'}`}>{valeur}</p>
          <p className='text-xs text-gray-400 mt-1 truncate'>{sousTitre}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${teinte}`}>
          <Icone size={24} />
        </div>
      </div>
      {spark && (
        <div className='mt-auto pt-3'>
          <Sparkline data={spark.data} color={spark.color} id={spark.id} />
        </div>
      )}
    </div>
  );
}

// ── Titre de section : icône + titre + phrase explicative ──────
function SectionTitre({ icone: Icone, titre, desc, couleur = 'text-[#1E3A5F]' }) {
  return (
    <div className='mb-4'>
      <div className='flex items-center gap-2'>
        <Icone size={18} className={couleur} />
        <h2 className='text-base font-semibold text-gray-800'>{titre}</h2>
      </div>
      {desc && <p className='text-xs text-gray-400 mt-0.5 ml-7'>{desc}</p>}
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
  const { utilisateur }             = useAuth();
  const [stats, setStats]           = useState(null);
  const [chargement, setChargement] = useState(true);
  const [vueCA, setVueCA]           = useState('jour'); // jour | semaine | mois
  const [heureMaj, setHeureMaj]     = useState('');

  useEffect(() => {
    getDashboardStats().then(res => {
      if (res.success) setStats(res.data);
      setChargement(false);
      setHeureMaj(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    });
  }, []);

  const ventesData = stats?.ventes_semaine    || [];
  const stockData  = stats?.repartition_stock || [];
  const top10      = stats?.top10_produits    || [];
  const dernieres  = stats?.dernieres_ventes  || [];
  const totalStock = stockData.reduce((s, x) => s + (x.value || 0), 0);

  const caAffiche = vueCA === 'semaine' ? stats?.ca_semaine
                  : vueCA === 'mois'    ? stats?.ca_mois
                  : stats?.ca_jour;
  const tvaAffiche = vueCA === 'semaine' ? stats?.tva_semaine
                   : vueCA === 'mois'    ? stats?.tva_mois
                   : stats?.tva_jour;
  // Total encaissé (TTC) = CA HT + TVA collectée
  const ttcAffiche = (caAffiche ?? 0) + (tvaAffiche ?? 0);

  // Panier moyen du jour (réel, calculé à partir des données existantes)
  const panierMoyen = stats?.ventes_jour
    ? Math.round(((stats.ca_jour || 0) + (stats.tva_jour || 0)) / stats.ventes_jour)
    : 0;

  const aDesAlertes = (stats?.total_alertes ?? 0) > 0;

  // Résumé du jour piloté par les vraies données (anti-cliché : pas une phrase générique)
  const vj = stats?.ventes_jour  ?? 0;
  const aj = stats?.total_alertes ?? 0;
  let resumeJour;
  if (vj === 0 && aj > 0) {
    resumeJour = `Pas encore de vente · ${aj} produit${aj > 1 ? 's' : ''} à réapprovisionner aujourd'hui.`;
  } else if (vj === 0) {
    resumeJour = 'Aucune vente pour le moment — belle journée à vous !';
  } else {
    resumeJour = `${vj} vente${vj > 1 ? 's' : ''} aujourd'hui pour ${fcfa(stats?.ca_jour)} de chiffre d'affaires`;
    resumeJour += aj > 0 ? ` · ${aj} alerte${aj > 1 ? 's' : ''} de stock à traiter.` : ' · stock au vert.';
  }

  // En-tête personnalisé
  const heure      = new Date().getHours();
  const salut      = heure < 18 ? 'Bonjour' : 'Bonsoir';
  const dateLongue = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const kpis = [
    {
      titre:    'Produits en catalogue',
      valeur:   stats?.total_produits ?? '—',
      sousTitre:'articles actifs référencés',
      icone:    Boxes,
      accent:   'bg-[#1E3A5F]',
      teinte:   'bg-slate-100 text-[#1E3A5F]',
    },
    {
      // La carte change d'apparence selon l'état → lisible sans lire
      titre:    'Alertes de stock',
      valeur:   stats?.total_alertes ?? '—',
      sousTitre:aDesAlertes ? 'à réapprovisionner' : 'aucune alerte, tout va bien',
      icone:    aDesAlertes ? AlertTriangle : ShieldCheck,
      accent:   aDesAlertes ? 'bg-orange-500'              : 'bg-emerald-500',
      teinte:   aDesAlertes ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600',
    },
    {
      titre:    "Ventes aujourd'hui",
      valeur:   stats?.ventes_jour ?? '—',
      sousTitre:stats?.ventes_jour ? `panier moyen ${fcfa(panierMoyen)}` : "aucune vente pour l'instant",
      icone:    Receipt,
      accent:   'bg-green-500',
      teinte:   'bg-green-50 text-green-600',
      spark:    { data: ventesData.map(d => d.ventes), color: '#22c55e', id: 'spark-ventes' },
    },
    {
      titre:    vueCA === 'semaine' ? 'CA cette semaine (HT)'
              : vueCA === 'mois'    ? 'CA ce mois (HT)'
              : "CA aujourd'hui (HT)",
      valeur:   caAffiche !== undefined ? fcfa(caAffiche) : '—',
      sousTitre:tvaAffiche !== undefined ? `+ ${fcfa(tvaAffiche)} de TVA` : "chiffre d'affaires",
      icone:    Coins,
      accent:   'bg-[#2196F3]',
      teinte:   'bg-blue-50 text-[#2196F3]',
      hero:     true,
      spark:    { data: ventesData.map(d => d.ca), color: '#FF6B35', id: 'spark-ca' },
    },
  ];

  if (chargement) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]' />
    </div>
  );

  return (
    <div className='space-y-6'>
      {/* ── En-tête personnalisé ───────────────────────────── */}
      <header className='bg-gradient-to-r from-[#1E3A5F] to-[#2b5680] rounded-2xl p-5 sm:p-6 text-white
                         flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='min-w-0'>
          <p className='text-white/55 text-xs capitalize'>{dateLongue}</p>
          <h1 className='text-2xl font-bold mt-1'>{salut}, {utilisateur?.prenom || 'à vous'}</h1>
          <p className='text-white/85 text-sm mt-1'>{resumeJour}</p>
          {heureMaj && <p className='text-white/40 text-xs mt-1'>Données à jour · {heureMaj}</p>}
        </div>
        <div>
          <p className='text-white/60 text-xs mb-1 sm:text-right'>Période du chiffre d'affaires</p>
          <div className='flex gap-1 bg-white/10 rounded-xl p-1'>
            {[
              { key: 'jour',    label: 'Jour' },
              { key: 'semaine', label: 'Semaine' },
              { key: 'mois',    label: 'Mois' },
            ].map(p => (
              <button key={p.key} onClick={() => setVueCA(p.key)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${vueCA === p.key ? 'bg-white text-[#1E3A5F] shadow' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <p className='hidden sm:block text-white/35 text-[11px] italic text-right mt-2'>
            SunuStock — votre boutique, votre rythme
          </p>
        </div>
      </header>

      {/* ── KPIs ───────────────────────────────────────────── */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        {kpis.map(k => <CarteKPI key={k.titre} {...k} />)}
      </div>

      {/* ── Récapitulatif comptable ────────────────────────── */}
      <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5'>
        <SectionTitre
          icone={Wallet}
          titre={`Récapitulatif comptable — ${vueCA === 'semaine' ? 'cette semaine' : vueCA === 'mois' ? 'ce mois' : "aujourd'hui"}`}
          desc="Comment se répartit l'argent encaissé : votre revenu, la part de l'État, et le total reçu en caisse."
        />
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          {/* CA HT */}
          <div className='bg-blue-50/70 rounded-xl p-4 flex items-start gap-3'>
            <div className='w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0'>
              <Wallet size={18} className='text-[#1E3A5F]' />
            </div>
            <div className='min-w-0'>
              <p className='text-xs text-gray-500'>Chiffre d'affaires (HT)</p>
              <p className='text-xl font-bold text-[#1E3A5F] truncate'>{fcfa(caAffiche)}</p>
              <p className='text-[11px] text-gray-400 mt-0.5'>revenu de l'entreprise</p>
            </div>
          </div>
          {/* TVA */}
          <div className='bg-orange-50/70 rounded-xl p-4 flex items-start gap-3'>
            <div className='w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0'>
              <Landmark size={18} className='text-[#FF6B35]' />
            </div>
            <div className='min-w-0'>
              <p className='text-xs text-gray-500'>TVA collectée (18%)</p>
              <p className='text-xl font-bold text-[#FF6B35] truncate'>{fcfa(tvaAffiche)}</p>
              <p className='text-[11px] text-gray-400 mt-0.5'>à reverser à l'État</p>
            </div>
          </div>
          {/* TTC */}
          <div className='bg-green-50/70 rounded-xl p-4 flex items-start gap-3'>
            <div className='w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0'>
              <Coins size={18} className='text-green-600' />
            </div>
            <div className='min-w-0'>
              <p className='text-xs text-gray-500'>Total encaissé (TTC)</p>
              <p className='text-xl font-bold text-green-700 truncate'>{fcfa(ttcAffiche)}</p>
              <p className='text-[11px] text-gray-400 mt-0.5'>argent reçu en caisse</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Graphiques ─────────────────────────────────────── */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Ventes 7 jours */}
        <div className='lg:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5'>
          <SectionTitre icone={BarChart3} titre='Ventes des 7 derniers jours'
            desc='Nombre de ventes réalisées chaque jour sur la semaine écoulée.' />
          {ventesData.length === 0 ? (
            <div className='flex items-center justify-center h-48 text-gray-300 text-sm'>
              Aucune vente cette semaine
            </div>
          ) : (
            <ResponsiveContainer width='100%' height={220}>
              <BarChart data={ventesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
                <XAxis dataKey='jour' tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                  formatter={(v, name) => [
                    name === 'ventes' ? `${v} ventes` : fcfa(v),
                    name === 'ventes' ? 'Ventes' : 'CA',
                  ]}
                />
                <Bar dataKey='ventes' fill='#1E3A5F' radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* État du stock — donut avec total au centre */}
        <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5'>
          <SectionTitre icone={Gauge} titre='État du stock'
            desc='Produits sains, bientôt épuisés ou en rupture.' couleur='text-[#FF6B35]' />
          <div className='relative'>
            <ResponsiveContainer width='100%' height={200}>
              <PieChart>
                <Pie data={stockData} cx='50%' cy='50%'
                     innerRadius={58} outerRadius={82} paddingAngle={3} dataKey='value'>
                  {stockData.map((_, i) => (
                    <Cell key={i} fill={COULEURS_PIE[i % COULEURS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => [`${v} produits`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
              <span className='text-2xl font-bold text-gray-800'>{totalStock}</span>
              <span className='text-[11px] text-gray-400'>produits</span>
            </div>
          </div>
          {/* Légende lisible avec compteurs */}
          <div className='flex justify-center flex-wrap gap-x-4 gap-y-1 mt-3'>
            {stockData.map((s, i) => (
              <div key={s.name} className='flex items-center gap-1.5'>
                <span className='w-2.5 h-2.5 rounded-full' style={{ background: COULEURS_PIE[i % COULEURS_PIE.length] }} />
                <span className='text-xs text-gray-500'>{s.name}</span>
                <span className='text-xs font-bold text-gray-800'>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top 10 + Dernières transactions ────────────────── */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>

        {/* Top 10 produits */}
        <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5'>
          <SectionTitre icone={Trophy} titre='Top 10 produits vendus'
            desc='Vos meilleures ventes, classées par quantité écoulée.' couleur='text-[#FF6B35]' />
          {top10.length === 0 ? (
            <p className='text-gray-400 text-sm text-center py-8'>Aucune vente enregistrée</p>
          ) : (
            <div className='space-y-3'>
              {top10.map((p, i) => (
                <div key={i} className='flex items-center gap-3'>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center
                                    text-xs font-bold flex-shrink-0
                                    ${i === 0 ? 'bg-yellow-400 text-white'
                                    : i === 1 ? 'bg-gray-300 text-white'
                                    : i === 2 ? 'bg-orange-400 text-white'
                                    : 'bg-gray-100 text-gray-500'}`}>
                    {i + 1}
                  </span>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.nom}
                      className='w-8 h-8 object-cover rounded-md flex-shrink-0'
                      onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className='w-8 h-8 bg-gray-100 rounded-md flex-shrink-0 flex items-center justify-center'>
                      <span className='text-sm'>📦</span>
                    </div>
                  )}
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-gray-800 truncate'>{p.nom}</p>
                    <p className='text-xs text-gray-400'>{fcfa(p.ca_total)}</p>
                  </div>
                  <span className='text-sm font-bold text-[#1E3A5F] flex-shrink-0'>
                    {p.total_vendu} u.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dernières transactions */}
        <div className='bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5'>
          <div className='flex items-start justify-between'>
            <SectionTitre icone={History} titre='Dernières transactions'
              desc='Les 8 ventes les plus récentes, en temps réel.' couleur='text-[#2196F3]' />
            <span className='flex items-center gap-1.5 text-[11px] text-green-600 font-medium mt-1'>
              <span className='relative flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75' />
                <span className='relative inline-flex rounded-full h-2 w-2 bg-green-500' />
              </span>
              en direct
            </span>
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
