// src/pages/ventes/Ventes.jsx
// Historique des ventes + annulation (manager/admin)
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Search, Eye, XCircle, Receipt, Ban, CheckCircle2, Undo2 } from 'lucide-react';
import { getVentes, getVenteDetails, annulerVente, retournerVente } from '../../config/api';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');

// Badge mode de paiement
function BadgePaiement({ mode }) {
  const cfg = {
    especes:      { label: 'Espèces',      classes: 'bg-green-100 text-green-700' },
    carte:        { label: 'Carte',        classes: 'bg-blue-100 text-blue-700' },
    mobile_money: { label: 'Mobile Money', classes: 'bg-orange-100 text-orange-700' },
  };
  const { label, classes } = cfg[mode] ?? { label: mode, classes: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>{label}</span>;
}

// ── Modal de détails + annulation ─────────────────────────────
function DetailsModal({ venteId, onFermer, onAnnulee }) {
  const [data, setData]         = useState(null);
  const [chargement, setChargement] = useState(true);
  const [annulation, setAnnulation] = useState(false);
  const [confirme, setConfirme]     = useState(false);
  const [modeRetour, setModeRetour] = useState(false);
  const [retours, setRetours]       = useState({}); // produit_id -> quantité à retourner
  const [retourEnCours, setRetourEnCours] = useState(false);

  useEffect(() => {
    getVenteDetails(venteId).then(res => {
      if (res.success) setData(res.data);
      setChargement(false);
    });
  }, [venteId]);

  const traiterRetour = async () => {
    const articles = Object.entries(retours)
      .filter(([, q]) => q > 0)
      .map(([produit_id, quantite]) => ({ produit_id: Number(produit_id), quantite }));
    if (articles.length === 0) { toast.error('Sélectionne au moins un article'); return; }
    setRetourEnCours(true);
    const res = await retournerVente(venteId, articles);
    setRetourEnCours(false);
    if (res.success) {
      toast.success(`Retour enregistré — ${fmt(res.total_rembourse)} FCFA HT à rembourser`);
      onAnnulee(); // recharge la liste + ferme
    } else {
      toast.error(res.message || 'Erreur lors du retour');
    }
  };

  const annuler = async () => {
    setAnnulation(true);
    const res = await annulerVente(venteId);
    setAnnulation(false);
    if (res.success) {
      toast.success('Vente annulée — stock restauré');
      onAnnulee();
    } else {
      toast.error(res.message || 'Erreur lors de l\'annulation');
    }
  };

  const vente   = data?.vente;
  const lignes  = data?.lignes || [];
  const annulee = vente?.statut === 'annulee';

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto'>

        <div className='flex items-center justify-between p-5 border-b sticky top-0 bg-white'>
          <div className='flex items-center gap-2'>
            <Receipt size={18} className='text-[#1E3A5F]' />
            <h2 className='text-lg font-bold text-gray-800'>Détails de la vente</h2>
          </div>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <XCircle size={22} />
          </button>
        </div>

        {chargement ? (
          <div className='flex justify-center py-12'>
            <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-[#1E3A5F]' />
          </div>
        ) : !vente ? (
          <p className='p-8 text-center text-gray-400'>Vente introuvable</p>
        ) : (
          <div className='p-5 space-y-4'>
            {/* En-tête vente */}
            <div className='bg-gray-50 rounded-xl p-3 space-y-1 text-sm'>
              <div className='flex justify-between'>
                <span className='text-gray-500'>N°</span>
                <span className='font-mono font-medium'>{vente.numero}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Date</span>
                <span>{new Date(vente.created_at).toLocaleString('fr-FR')}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Caissier</span>
                <span>{vente.caissier}</span>
              </div>
              {vente.client_nom && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Client</span>
                  <span>{vente.client_nom}</span>
                </div>
              )}
              <div className='flex justify-between items-center'>
                <span className='text-gray-500'>Statut</span>
                {annulee
                  ? <span className='flex items-center gap-1 text-red-600 font-medium text-xs'><Ban size={13} /> Annulée</span>
                  : <span className='flex items-center gap-1 text-green-600 font-medium text-xs'><CheckCircle2 size={13} /> Validée</span>}
              </div>
            </div>

            {/* Lignes */}
            <div className='border rounded-xl overflow-hidden'>
              <table className='w-full text-sm'>
                <thead className='bg-gray-50 text-gray-500 text-xs'>
                  <tr>
                    <th className='px-3 py-2 text-left'>Article</th>
                    <th className='px-3 py-2 text-center'>Qté</th>
                    {modeRetour
                      ? <th className='px-3 py-2 text-center'>À retourner</th>
                      : <th className='px-3 py-2 text-right'>Total</th>}
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {lignes.map(l => (
                    <tr key={l.id}>
                      <td className='px-3 py-2 text-gray-700'>{l.nom_produit}</td>
                      <td className='px-3 py-2 text-center text-gray-500'>{l.quantite}</td>
                      {modeRetour ? (
                        <td className='px-3 py-2 text-center'>
                          <input type='number' min='0' max={l.quantite}
                            value={retours[l.produit_id] || 0}
                            onChange={e => setRetours(r => ({
                              ...r,
                              [l.produit_id]: Math.min(l.quantite, Math.max(0, Number(e.target.value))),
                            }))}
                            className='w-16 border border-gray-300 rounded px-2 py-1 text-center
                                       focus:outline-none focus:ring-2 focus:ring-[#2196F3]' />
                        </td>
                      ) : (
                        <td className='px-3 py-2 text-right font-medium'>{fmt(l.sous_total)} F</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totaux */}
            <div className='space-y-1 text-sm'>
              <div className='flex justify-between text-gray-500'>
                <span>Total HT</span><span>{fmt(vente.total_ht)} FCFA</span>
              </div>
              <div className='flex justify-between text-gray-500'>
                <span>TVA</span><span>{fmt(vente.total_tva)} FCFA</span>
              </div>
              <div className='flex justify-between font-bold text-gray-900 pt-1 border-t'>
                <span>Total TTC</span><span>{fmt(vente.total_ttc)} FCFA</span>
              </div>
              <div className='flex justify-between items-center pt-1'>
                <span className='text-gray-500'>Règlement</span>
                <BadgePaiement mode={vente.mode_paiement} />
              </div>
            </div>

            {/* Actions (vente non annulée) */}
            {!annulee && !confirme && !modeRetour && (
              <div className='flex gap-2'>
                <button onClick={() => setModeRetour(true)}
                  className='flex-1 flex items-center justify-center gap-2 border border-[#FF6B35]
                             text-[#FF6B35] font-medium py-2.5 rounded-xl hover:bg-orange-50 transition-colors'>
                  <Undo2 size={16} /> Retour articles
                </button>
                <button onClick={() => setConfirme(true)}
                  className='flex-1 flex items-center justify-center gap-2 border border-red-300
                             text-red-600 font-medium py-2.5 rounded-xl hover:bg-red-50 transition-colors'>
                  <Ban size={16} /> Annuler
                </button>
              </div>
            )}

            {/* Mode retour : confirmation */}
            {modeRetour && (
              <div className='bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2'>
                <p className='text-sm text-orange-700 font-medium text-center'>
                  Indique les quantités retournées ci-dessus, puis confirme.
                </p>
                <div className='flex gap-2'>
                  <button onClick={() => { setModeRetour(false); setRetours({}); }}
                    className='flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-white'>
                    Annuler
                  </button>
                  <button onClick={traiterRetour} disabled={retourEnCours}
                    className='flex-1 bg-[#FF6B35] hover:bg-orange-600 disabled:opacity-50
                               text-white font-medium py-2 rounded-lg text-sm'>
                    {retourEnCours ? '...' : 'Valider le retour'}
                  </button>
                </div>
              </div>
            )}

            {/* Confirmation annulation */}
            {!annulee && confirme && (
              <div className='bg-red-50 border border-red-200 rounded-xl p-3 space-y-2'>
                <p className='text-sm text-red-700 font-medium text-center'>
                  Confirmer l'annulation ? Le stock sera restauré.
                </p>
                <div className='flex gap-2'>
                  <button onClick={() => setConfirme(false)}
                    className='flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-white'>
                    Non
                  </button>
                  <button onClick={annuler} disabled={annulation}
                    className='flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50
                               text-white font-medium py-2 rounded-lg text-sm'>
                    {annulation ? '...' : 'Oui, annuler'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page Historique des ventes ────────────────────────────────
export default function Ventes() {
  const [ventes, setVentes]         = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche]   = useState('');
  const [filtre, setFiltre]         = useState('toutes'); // toutes | validees | annulees
  const [detailsId, setDetailsId]   = useState(null);

  const charger = async () => {
    setChargement(true);
    const res = await getVentes();
    if (res.success) setVentes(res.data);
    setChargement(false);
  };

  useEffect(() => { charger(); }, []);

  const affichees = ventes.filter(v => {
    const okRecherche = v.numero.toLowerCase().includes(recherche.toLowerCase()) ||
                        (v.client || '').toLowerCase().includes(recherche.toLowerCase()) ||
                        (v.caissier || '').toLowerCase().includes(recherche.toLowerCase());
    const okFiltre = filtre === 'toutes' ||
                     (filtre === 'validees' && v.statut === 'validee') ||
                     (filtre === 'annulees' && v.statut === 'annulee');
    return okRecherche && okFiltre;
  });

  // Total encaissé (ventes validées uniquement)
  const totalEncaisse = ventes
    .filter(v => v.statut === 'validee')
    .reduce((s, v) => s + Number(v.total_ttc), 0);

  if (chargement) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]' />
    </div>
  );

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold text-gray-800'>Historique des ventes</h1>
        <div className='text-right'>
          <p className='text-xs text-gray-400'>Total encaissé (validées)</p>
          <p className='text-lg font-bold text-[#1E3A5F]'>{fmt(totalEncaisse)} FCFA</p>
        </div>
      </div>

      {/* Filtres */}
      <div className='flex flex-wrap gap-3 mb-5'>
        <div className='relative flex-1 min-w-48'>
          <Search size={15} className='absolute left-3 top-3 text-gray-400' />
          <input type='text' placeholder='Rechercher (n°, client, caissier)...'
            value={recherche} onChange={e => setRecherche(e.target.value)}
            className='w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#2196F3]' />
        </div>
        {[
          { key: 'toutes',   label: 'Toutes' },
          { key: 'validees', label: 'Validées' },
          { key: 'annulees', label: 'Annulées' },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltre(f.key)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${filtre === f.key ? 'bg-[#1E3A5F] text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className='bg-white rounded-xl shadow overflow-hidden'>
        <table className='w-full'>
          <thead className='bg-[#1E3A5F] text-white text-sm'>
            <tr>
              {['N°','Date','Caissier','Client','Articles','Total TTC','Règlement','Statut',''].map(h => (
                <th key={h} className='px-4 py-3 text-left font-medium'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {affichees.map((v, i) => (
              <tr key={v.id}
                  className={`hover:bg-gray-50 transition-colors ${i % 2 ? 'bg-gray-50/40' : ''}
                              ${v.statut === 'annulee' ? 'opacity-60' : ''}`}>
                <td className='px-4 py-3 text-xs font-mono text-gray-600'>{v.numero}</td>
                <td className='px-4 py-3 text-sm text-gray-500 whitespace-nowrap'>
                  {new Date(v.created_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className='px-4 py-3 text-sm text-gray-700'>{v.caissier}</td>
                <td className='px-4 py-3 text-sm text-gray-500'>{v.client || '—'}</td>
                <td className='px-4 py-3 text-sm text-center text-gray-500'>{v.nb_articles}</td>
                <td className='px-4 py-3 text-sm font-bold text-gray-800'>{fmt(v.total_ttc)} F</td>
                <td className='px-4 py-3'><BadgePaiement mode={v.mode_paiement} /></td>
                <td className='px-4 py-3'>
                  {v.statut === 'annulee'
                    ? <span className='flex items-center gap-1 text-red-600 text-xs font-medium'><Ban size={12} /> Annulée</span>
                    : <span className='flex items-center gap-1 text-green-600 text-xs font-medium'><CheckCircle2 size={12} /> Validée</span>}
                </td>
                <td className='px-4 py-3'>
                  <button onClick={() => setDetailsId(v.id)}
                    className='p-1.5 text-[#2196F3] hover:bg-blue-50 rounded-lg transition-colors'
                    title='Voir les détails'>
                    <Eye size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {affichees.length === 0 && (
          <div className='text-center py-12 text-gray-400'>Aucune vente trouvée</div>
        )}
      </div>

      <p className='text-xs text-gray-400 mt-3 text-right'>
        {affichees.length} vente{affichees.length > 1 ? 's' : ''} affichée{affichees.length > 1 ? 's' : ''}
      </p>

      {detailsId && (
        <DetailsModal
          venteId={detailsId}
          onFermer={() => setDetailsId(null)}
          onAnnulee={() => { setDetailsId(null); charger(); }}
        />
      )}
    </div>
  );
}
