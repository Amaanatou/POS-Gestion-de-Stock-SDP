// src/pages/caisse/SessionsCaisse.jsx
// Ouverture/fermeture de caisse + écarts (§2.2 validation des écarts)
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Wallet, LockOpen, Lock, TrendingUp, TrendingDown, Check } from 'lucide-react';
import {
  getSessionCourante, getSessionsCaisse, ouvrirCaisse, fermerCaisse,
} from '../../config/api';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');

// Badge d'écart coloré
function EcartBadge({ ecart }) {
  const e = Number(ecart);
  if (e === 0) return <span className='inline-flex items-center gap-1 text-green-600 font-medium text-sm'><Check size={13} /> Équilibrée</span>;
  if (e > 0)  return <span className='inline-flex items-center gap-1 text-blue-600 font-medium text-sm'><TrendingUp size={13} /> +{fmt(e)} (excédent)</span>;
  return <span className='inline-flex items-center gap-1 text-red-600 font-medium text-sm'><TrendingDown size={13} /> {fmt(e)} (manquant)</span>;
}

export default function SessionsCaisse() {
  const [courante, setCourante]   = useState(null);
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);

  // Champs formulaires
  const [fond, setFond]           = useState(0);
  const [compte, setCompte]       = useState(0);
  const [note, setNote]           = useState('');
  const [action, setAction]       = useState(false);

  const charger = async () => {
    setChargement(true);
    const [resC, resH] = await Promise.all([getSessionCourante(), getSessionsCaisse()]);
    if (resC.success) setCourante(resC.data);
    if (resH.success) setHistorique(resH.data);
    setChargement(false);
  };

  useEffect(() => { charger(); }, []);

  const ouvrir = async () => {
    setAction(true);
    const res = await ouvrirCaisse(Number(fond));
    setAction(false);
    if (res.success) { toast.success('Caisse ouverte'); setFond(0); charger(); }
    else toast.error(res.message || 'Erreur');
  };

  const fermer = async () => {
    setAction(true);
    const res = await fermerCaisse(courante.id, Number(compte), note);
    setAction(false);
    if (res.success) {
      const e = res.ecart;
      toast.success(e === 0 ? 'Caisse équilibrée !' : `Écart : ${fmt(e)} FCFA`);
      setCompte(0); setNote(''); charger();
    } else toast.error(res.message || 'Erreur');
  };

  if (chargement) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]' />
    </div>
  );

  return (
    <div>
      <div className='flex items-center gap-2 mb-6'>
        <Wallet size={22} className='text-[#1E3A5F]' />
        <h1 className='text-2xl font-bold text-gray-800'>Caisse — Ouverture / Fermeture</h1>
      </div>

      {/* État de la caisse */}
      {!courante ? (
        /* ── Caisse fermée : ouvrir ── */
        <div className='bg-white rounded-xl shadow p-6 max-w-md mb-8'>
          <div className='flex items-center gap-2 mb-4'>
            <Lock size={18} className='text-gray-400' />
            <h2 className='font-semibold text-gray-700'>Caisse fermée</h2>
          </div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Fond de caisse initial (FCFA)
          </label>
          <input type='number' min='0' value={fond}
            onChange={e => setFond(e.target.value)}
            placeholder='Ex : 20000'
            className='w-full border border-gray-300 rounded-lg px-4 py-2.5 mb-3
                       focus:outline-none focus:ring-2 focus:ring-[#2196F3]' />
          <button onClick={ouvrir} disabled={action}
            className='w-full flex items-center justify-center gap-2 bg-green-600
                       hover:bg-green-700 disabled:opacity-50 text-white font-bold
                       py-2.5 rounded-xl transition-colors'>
            <LockOpen size={18} /> Ouvrir la caisse
          </button>
        </div>
      ) : (
        /* ── Caisse ouverte : suivi + fermer ── */
        <div className='bg-white rounded-xl shadow p-6 max-w-md mb-8'>
          <div className='flex items-center gap-2 mb-4'>
            <LockOpen size={18} className='text-green-500' />
            <h2 className='font-semibold text-gray-700'>Caisse ouverte</h2>
            <span className='text-xs text-gray-400 ml-auto'>
              par {courante.ouvert_par} — {new Date(courante.opened_at).toLocaleString('fr-FR')}
            </span>
          </div>

          <div className='space-y-2 text-sm mb-4 bg-gray-50 rounded-lg p-3'>
            <div className='flex justify-between'><span className='text-gray-500'>Fond initial</span><span className='font-medium'>{fmt(courante.fond_initial)} FCFA</span></div>
            <div className='flex justify-between'><span className='text-gray-500'>Ventes espèces</span><span className='font-medium'>{fmt(courante.ventes_especes)} FCFA</span></div>
            <div className='flex justify-between pt-1 border-t font-bold text-[#1E3A5F]'>
              <span>Montant attendu</span><span>{fmt(courante.montant_attendu)} FCFA</span>
            </div>
          </div>

          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Montant compté en caisse (FCFA)
          </label>
          <input type='number' min='0' value={compte}
            onChange={e => setCompte(e.target.value)}
            placeholder='Compte physique du tiroir'
            className='w-full border border-gray-300 rounded-lg px-4 py-2.5 mb-2
                       focus:outline-none focus:ring-2 focus:ring-[#2196F3]' />

          {/* Écart en temps réel */}
          {compte > 0 && (
            <div className='mb-3 text-center text-sm'>
              Écart prévu : <EcartBadge ecart={Number(compte) - Number(courante.montant_attendu)} />
            </div>
          )}

          <input type='text' value={note} onChange={e => setNote(e.target.value)}
            placeholder='Note (optionnel) — ex : billet manquant'
            className='w-full border border-gray-300 rounded-lg px-4 py-2 mb-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#2196F3]' />

          <button onClick={fermer} disabled={action}
            className='w-full flex items-center justify-center gap-2 bg-[#1E3A5F]
                       hover:bg-blue-900 disabled:opacity-50 text-white font-bold
                       py-2.5 rounded-xl transition-colors'>
            <Lock size={18} /> Fermer & valider l'écart
          </button>
        </div>
      )}

      {/* Historique des sessions */}
      <h2 className='text-base font-semibold text-gray-700 mb-3'>Historique des caisses</h2>
      <div className='bg-white rounded-xl shadow overflow-hidden'>
        <table className='w-full'>
          <thead className='bg-[#1E3A5F] text-white text-sm'>
            <tr>
              {['Ouverture','Par','Fond','Attendu','Compté','Écart','Statut'].map(h => (
                <th key={h} className='px-4 py-3 text-left font-medium'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {historique.map((s, i) => (
              <tr key={s.id} className={`text-sm ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                <td className='px-4 py-3 text-gray-500 whitespace-nowrap'>
                  {new Date(s.opened_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                </td>
                <td className='px-4 py-3 text-gray-700'>{s.ouvert_par}</td>
                <td className='px-4 py-3 text-gray-600'>{fmt(s.fond_initial)}</td>
                <td className='px-4 py-3 text-gray-600'>{s.montant_attendu ? fmt(s.montant_attendu) : '—'}</td>
                <td className='px-4 py-3 text-gray-600'>{s.montant_compte ? fmt(s.montant_compte) : '—'}</td>
                <td className='px-4 py-3'>
                  {s.statut === 'fermee' ? <EcartBadge ecart={s.ecart} /> : <span className='text-gray-300'>—</span>}
                </td>
                <td className='px-4 py-3'>
                  {s.statut === 'ouverte'
                    ? <span className='px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700'>Ouverte</span>
                    : <span className='px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-500'>Fermée</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {historique.length === 0 && (
          <div className='text-center py-12 text-gray-400'>Aucune session enregistrée</div>
        )}
      </div>
    </div>
  );
}
