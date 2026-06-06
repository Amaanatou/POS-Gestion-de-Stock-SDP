// src/pages/caisse/Caisse.jsx
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, X, CheckCircle, Printer, ScanLine, FileText,
} from 'lucide-react';
import { genererFacturePDF } from '../../utils/facturePDF';
import { getProduits, getProduitParBarre, creerVente, getAccessoires } from '../../config/api';
import BarcodeScanner from '../../components/ui/BarcodeScanner';
import ClientZone from './ClientZone';
import AccessoiresPopup from './AccessoiresPopup';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/ui/Logo';

// ─────────────────────────────────────────────────────────────
//  Modal Paiement
// ─────────────────────────────────────────────────────────────
function ModalPaiement({ total, onFermer, onConfirmer }) {
  const [mode, setMode]       = useState('especes'); // especes | carte
  const [montant, setMontant] = useState('');
  const monnaie = mode === 'especes' ? Math.max(0, Number(montant) - total) : 0;
  const peutPayer = mode === 'carte' || Number(montant) >= total;

  return (
    <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-sm'>

        <div className='flex items-center justify-between p-5 border-b'>
          <h2 className='text-lg font-bold text-gray-800'>Paiement</h2>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={20} />
          </button>
        </div>

        <div className='p-5 space-y-4'>
          {/* Total */}
          <div className='bg-[#1E3A5F] text-white rounded-xl p-4 text-center'>
            <p className='text-sm opacity-70'>Total à payer</p>
            <p className='text-3xl font-bold mt-1'>
              {total.toLocaleString('fr-FR')} <span className='text-lg'>FCFA</span>
            </p>
          </div>

          {/* Mode de paiement */}
          <div className='grid grid-cols-2 gap-3'>
            <button
              onClick={() => setMode('especes')}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg
                          border-2 font-medium text-sm transition-all
                          ${mode === 'especes'
                            ? 'border-[#1E3A5F] bg-blue-50 text-[#1E3A5F]'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              <Banknote size={18} /> Espèces
            </button>
            <button
              onClick={() => { setMode('carte'); setMontant(''); }}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg
                          border-2 font-medium text-sm transition-all
                          ${mode === 'carte'
                            ? 'border-[#1E3A5F] bg-blue-50 text-[#1E3A5F]'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              <CreditCard size={18} /> Carte / Mobile
            </button>
          </div>

          {/* Montant reçu (espèces seulement) */}
          {mode === 'especes' && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Montant reçu (FCFA)
              </label>
              <input
                type='number'
                min={total}
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder={`Min. ${total.toLocaleString('fr-FR')}`}
                autoFocus
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3]
                           text-gray-800 text-lg font-bold'
              />
              {/* Monnaie à rendre */}
              {Number(montant) >= total && (
                <div className='mt-2 bg-green-50 border border-green-200
                                rounded-lg p-3 flex justify-between items-center'>
                  <span className='text-sm text-green-700 font-medium'>Monnaie à rendre</span>
                  <span className='text-lg font-bold text-green-700'>
                    {monnaie.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bouton confirmer */}
          <button
            disabled={!peutPayer}
            onClick={() => onConfirmer(mode, Number(montant))}
            className='w-full bg-[#FF6B35] hover:bg-orange-600 disabled:opacity-40
                       text-white font-bold py-3 rounded-lg transition-colors
                       flex items-center justify-center gap-2 text-base'
          >
            <CheckCircle size={20} /> Confirmer la vente
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Reçu (après vente)
// ─────────────────────────────────────────────────────────────
function Recu({ vente, onFermer }) {
  const dateStr = (vente.date || new Date()).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // Méthode B : prix HT, TVA ajoutée par-dessus
  const TAUX_TVA   = 18;
  const totalHTBrut  = vente.totalHTBrut ?? vente.totalHT;
  const remiseClient = vente.remiseClient ?? 0;
  const tauxRemise   = vente.tauxRemise ?? 0;
  const totalHT    = vente.totalHT;
  const montantTVA = vente.totalTVA;
  const totalTTC   = vente.totalTTC;

  const modeLabel = {
    especes:      'Espèces',
    carte:        'Carte bancaire',
    mobile_money: 'Mobile Money',
  }[vente.modePaiement] || vente.modePaiement;

  const fmt = (n) => Number(n).toLocaleString('fr-FR');
  const nbArticles = vente.lignes.reduce((s, l) => s + l.quantite, 0);

  return (
    <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 print:bg-white print:p-0'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto print:shadow-none print:max-h-none print:rounded-none'>

        {/* En-tête (caché à l'impression) */}
        <div className='p-4 border-b flex items-center justify-between print:hidden'>
          <h2 className='text-lg font-bold text-gray-800'>Vente enregistrée ✅</h2>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={20} />
          </button>
        </div>

        {/* ════ TICKET IMPRIMABLE ════ */}
        <div id='recu-imprimable' className='p-5 font-mono text-sm text-gray-800'>

          {/* Logo + en-tête entreprise */}
          <div className='text-center mb-3'>
            <div className='flex justify-center mb-2'>
              <Logo size={34} variant='dark' />
            </div>
            <p className='text-xs text-gray-500'>Gestion de Stock PME</p>
            <p className='text-xs text-gray-500'>Dakar, Sénégal — Tél : 33 800 00 00</p>
            <p className='text-[10px] text-gray-400'>NINEA : 0000000 2A2 — RC : SN-DKR-2026</p>
          </div>

          {/* Infos transaction */}
          <div className='border-t border-dashed pt-2 mb-2 text-xs space-y-0.5'>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Reçu N°</span>
              <span className='font-bold'>{vente.numero}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Date</span>
              <span>{dateStr}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Caissier</span>
              <span>{vente.caissier || '—'}</span>
            </div>
          </div>

          {/* Détail des articles */}
          <div className='border-t border-dashed pt-2 space-y-1.5 mb-2'>
            {vente.lignes.map((l, i) => (
              <div key={i}>
                <p className='text-gray-800 leading-tight'>{l.nom}</p>
                <div className='flex justify-between text-xs text-gray-500'>
                  <span>{l.quantite} x {fmt(l.prix_vente)}</span>
                  <span className='font-medium text-gray-700'>
                    {fmt(l.prix_vente * l.quantite)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Totaux */}
          <div className='border-t border-dashed pt-2 space-y-0.5 text-xs'>
            <div className='flex justify-between text-gray-500'>
              <span>Total HT</span>
              <span>{fmt(totalHTBrut)} FCFA</span>
            </div>
            {remiseClient > 0 && (
              <div className='flex justify-between text-gray-700 font-medium'>
                <span>Remise fidélité (-{tauxRemise}%)</span>
                <span>-{fmt(remiseClient)} FCFA</span>
              </div>
            )}
            <div className='flex justify-between text-gray-500'>
              <span>TVA ({TAUX_TVA}%)</span>
              <span>{fmt(montantTVA)} FCFA</span>
            </div>
            <div className='flex justify-between font-bold text-base text-gray-900 pt-1'>
              <span>TOTAL TTC</span>
              <span>{fmt(totalTTC)} FCFA</span>
            </div>
          </div>

          {/* Paiement */}
          <div className='border-t border-dashed pt-2 mt-2 space-y-0.5 text-xs'>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Mode de règlement</span>
              <span className='font-medium'>{modeLabel}</span>
            </div>
            {vente.modePaiement === 'especes' && (
              <>
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Montant reçu</span>
                  <span>{fmt(vente.montantRecu)} FCFA</span>
                </div>
                <div className='flex justify-between text-green-600 font-medium'>
                  <span>Monnaie rendue</span>
                  <span>{fmt(vente.monnaie)} FCFA</span>
                </div>
              </>
            )}
          </div>

          {/* Client fidélité */}
          {vente.client && (
            <div className='border-t border-dashed pt-2 mt-2 text-xs'>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Client</span>
                <span className='font-medium'>{vente.client.nom}</span>
              </div>
              {vente.client.points_gagnes > 0 && (
                <div className='flex justify-between text-[#FF6B35] font-medium'>
                  <span>Points gagnés</span>
                  <span>+{vente.client.points_gagnes}</span>
                </div>
              )}
            </div>
          )}

          {/* Pied de ticket — marketing */}
          <div className='border-t border-dashed pt-3 mt-2 text-center'>
            <p className='text-xs font-medium text-gray-700'>
              {nbArticles} article{nbArticles > 1 ? 's' : ''} — Merci de votre visite !
            </p>
            <p className='text-[10px] text-gray-400 mt-1'>
              Échange sous 7 jours sur présentation de ce reçu.
            </p>
            <p className='text-[10px] text-gray-400 mt-2'>
              SunuStock — Le confort par le digital
            </p>
          </div>
        </div>

        {/* Boutons (cachés à l'impression) */}
        <div className='p-4 border-t print:hidden space-y-2'>
          <div className='flex gap-2'>
            <button
              onClick={() => window.print()}
              className='flex-1 flex items-center justify-center gap-2 border
                         border-gray-300 text-gray-700 py-2.5 rounded-lg
                         hover:bg-gray-50 transition-colors text-sm font-medium'
            >
              <Printer size={16} /> Reçu
            </button>
            <button
              onClick={() => genererFacturePDF(vente)}
              className='flex-1 flex items-center justify-center gap-2 border
                         border-[#FF6B35] text-[#FF6B35] py-2.5 rounded-lg
                         hover:bg-orange-50 transition-colors text-sm font-medium'
            >
              <FileText size={16} /> Facture PDF
            </button>
          </div>
          <button
            onClick={onFermer}
            className='w-full bg-[#1E3A5F] text-white py-2.5 rounded-lg
                       hover:bg-blue-900 transition-colors text-sm font-bold'
          >
            Nouvelle vente
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Page Caisse POS principale
// ─────────────────────────────────────────────────────────────
export default function Caisse() {
  const { utilisateur } = useAuth();
  const [produits, setProduits]       = useState([]);
  const [panier, setPanier]           = useState([]);  // { produit, quantite }
  const [recherche, setRecherche]     = useState('');
  const [chargement, setChargement]   = useState(true);
  const [modalPaiement, setModalPaiement] = useState(false);
  const [recu, setRecu]               = useState(null);
  const [scannerOuvert, setScannerOuvert] = useState(false);
  const [client, setClient]           = useState(null);  // client fidélité sélectionné
  const [accessoires, setAccessoires] = useState(null);  // { produitNom, liste } | null
  const rechercheRef = useRef(null);

  useEffect(() => {
    getProduits().then(res => {
      if (res.success) setProduits(res.data);
      setChargement(false);
    });
    rechercheRef.current?.focus();
  }, []);

  // ── Recherche scan code-barres ────────────────────────────
  const scannerCodeBarre = async (code) => {
    if (!code || code.length < 6) return;
    const res = await getProduitParBarre(code);
    if (res.success && res.data) {
      ajouterAuPanier(res.data);
      setRecherche('');
    } else {
      toast.error(`Aucun produit avec le code ${code}`);
    }
  };

  // Appelé à CHAQUE scan — la caméra reste ouverte (mode continu)
  const onCodeScanne = async (code) => {
    const res = await getProduitParBarre(code);
    if (res.success && res.data) {
      ajouterAuPanier(res.data);
      toast.success(`${res.data.nom} ajouté`, { duration: 1500 });
    } else {
      toast.error(`Produit introuvable (${code})`, { duration: 1500 });
    }
  };

  const handleRechercheKeyDown = (e) => {
    if (e.key === 'Enter') {
      const val = recherche.trim();
      if (/^\d{6,}$/.test(val)) scannerCodeBarre(val);
    }
  };

  // ── Gestion du panier ─────────────────────────────────────
  // suggererAccessoires : true pour un produit principal, false pour un accessoire
  const ajouterAuPanier = (produit, suggererAccessoires = true) => {
    setPanier(prev => {
      const existe = prev.find(l => l.produit.id === produit.id);
      if (existe) {
        return prev.map(l =>
          l.produit.id === produit.id
            ? { ...l, quantite: l.quantite + 1 }
            : l
        );
      }
      return [...prev, { produit, quantite: 1 }];
    });

    // Proposer les accessoires (sauf pendant le scan continu pour ne pas gêner)
    if (suggererAccessoires && !scannerOuvert) {
      getAccessoires(produit.id).then(res => {
        if (res.success && res.data.length > 0) {
          setAccessoires({ produitNom: produit.nom, liste: res.data });
        }
      });
    }
  };

  // Ajouter un accessoire depuis la pop-up (avec son prix remisé)
  const ajouterAccessoire = (acc, prixFinal) => {
    ajouterAuPanier({ ...acc, prix_vente: prixFinal }, false);
    toast.success(`${acc.nom} ajouté`, { duration: 1200 });
  };

  const modifierQuantite = (id, delta) => {
    setPanier(prev =>
      prev
        .map(l => l.produit.id === id ? { ...l, quantite: l.quantite + delta } : l)
        .filter(l => l.quantite > 0)
    );
  };

  const retirerDuPanier = (id) => {
    setPanier(prev => prev.filter(l => l.produit.id !== id));
  };

  const viderPanier = () => setPanier([]);

  // Méthode B : prix affichés HT, TVA ajoutée au paiement
  const TAUX_TVA   = 18;
  // Remise fidélité automatique selon le niveau du client
  const REMISES_NIVEAU = { standard: 0, vip: 5, or: 10 };
  const tauxRemise = REMISES_NIVEAU[client?.statut] ?? 0;

  const totalHTBrut  = panier.reduce(
    (sum, l) => sum + (l.produit.prix_vente || 0) * l.quantite, 0
  );
  const remiseClient = Math.round(totalHTBrut * tauxRemise / 100);
  const totalHT      = totalHTBrut - remiseClient;       // HT après remise
  const totalTVA     = Math.round(totalHT * TAUX_TVA / 100);
  const totalTTC     = totalHT + totalTVA;

  // ── Finaliser la vente ────────────────────────────────────
  const confirmerVente = async (modePaiement, montantRecu) => {
    const lignes = panier.map(l => ({
      produit_id: l.produit.id,
      nom:        l.produit.nom,
      quantite:   l.quantite,
      prix_vente: l.produit.prix_vente,
    }));

    const res = await creerVente(lignes, modePaiement, client?.id || null);
    setModalPaiement(false);

    if (res.success) {
      setRecu({
        lignes,
        totalHTBrut,
        remiseClient,
        tauxRemise,
        totalHT,
        totalTVA,
        totalTTC,
        modePaiement,
        montantRecu,
        monnaie:   modePaiement === 'especes' ? Math.max(0, montantRecu - totalTTC) : 0,
        numero:    res.numero || '—',
        caissier:  `${utilisateur?.prenom || ''} ${utilisateur?.nom || ''}`.trim(),
        client:    client ? { nom: client.nom, statut: client.statut, points_gagnes: res.points_gagnes || 0 } : null,
        date:      new Date(),
      });
      viderPanier();
      setClient(null);   // réinitialiser le client pour la prochaine vente
      toast.success(
        res.points_gagnes
          ? `Vente enregistrée ! +${res.points_gagnes} points`
          : 'Vente enregistrée !'
      );
    } else {
      toast.error(res.message || 'Erreur lors de la vente');
    }
  };

  // ── Produits filtrés ──────────────────────────────────────
  const produitsFiltres = produits.filter(p =>
    p.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    (p.code_barre || '').includes(recherche)
  );

  return (
    <div className='flex flex-col lg:flex-row gap-4 h-[calc(100vh-140px)]'>

      {/* ══════════════ ZONE PRODUITS (gauche) ══════════════ */}
      <div className='flex-1 flex flex-col min-w-0'>

        {/* Barre de recherche + bouton scanner */}
        <div className='flex gap-2 mb-4'>
          <div className='relative flex-1'>
            <Search size={16} className='absolute left-3 top-3.5 text-gray-400' />
            <input
              ref={rechercheRef}
              type='text'
              placeholder='Chercher un produit ou taper un code-barres...'
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              onKeyDown={handleRechercheKeyDown}
              className='w-full pl-9 pr-4 py-3 border border-gray-300 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3]
                         text-gray-800 bg-white shadow-sm'
            />
          </div>
          {/* Bouton ouvrir la caméra */}
          <button
            onClick={() => setScannerOuvert(true)}
            title='Scanner avec la caméra'
            className='flex items-center gap-2 bg-[#1E3A5F] hover:bg-blue-900
                       text-white px-4 rounded-xl shadow-sm transition-colors
                       font-medium whitespace-nowrap'
          >
            <ScanLine size={20} />
            <span className='hidden sm:inline'>Scanner</span>
          </button>
        </div>

        {/* Grille produits */}
        {chargement ? (
          <div className='flex items-center justify-center flex-1'>
            <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-[#1E3A5F]' />
          </div>
        ) : (
          <div className='overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3
                          xl:grid-cols-4 gap-3 content-start'>
            {produitsFiltres.map(p => (
              <button
                key={p.id}
                onClick={() => ajouterAuPanier(p)}
                className='bg-white rounded-xl shadow p-3 text-left
                           hover:shadow-md hover:border-[#2196F3] border border-transparent
                           transition-all active:scale-95'
              >
                {/* Image — uniquement si elle existe */}
                {p.image_url && (
                  <img src={p.image_url} alt={p.nom}
                    className='w-full h-20 object-cover rounded-lg mb-2'
                    onError={e => { e.target.style.display='none'; }} />
                )}
                <p className='font-semibold text-gray-800 text-sm leading-tight
                              line-clamp-2 mb-1'>{p.nom}</p>
                <p className='text-xs text-gray-400 mb-2'>{p.categorie || '—'}</p>
                <p className='text-[#FF6B35] font-bold text-sm'>
                  {p.prix_vente
                    ? `${Number(p.prix_vente).toLocaleString('fr-FR')} FCFA`
                    : 'Prix N/D'}
                </p>
              </button>
            ))}
            {produitsFiltres.length === 0 && (
              <div className='col-span-full text-center py-12 text-gray-400'>
                Aucun produit trouvé
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════ PANIER (droite) ══════════════ */}
      <div className='w-full lg:w-80 xl:w-96 bg-white rounded-2xl shadow
                      flex flex-col flex-shrink-0'>

        {/* En-tête panier */}
        <div className='flex items-center justify-between p-4 border-b'>
          <div className='flex items-center gap-2'>
            <ShoppingCart size={18} className='text-[#1E3A5F]' />
            <h2 className='font-bold text-gray-800'>Panier</h2>
            {panier.length > 0 && (
              <span className='bg-[#1E3A5F] text-white text-xs font-bold
                               px-2 py-0.5 rounded-full'>
                {panier.reduce((s, l) => s + l.quantite, 0)}
              </span>
            )}
          </div>
          {panier.length > 0 && (
            <button
              onClick={viderPanier}
              className='text-xs text-red-400 hover:text-red-600 transition-colors'
            >
              Vider
            </button>
          )}
        </div>

        {/* Zone client fidélité */}
        <div className='p-3 border-b'>
          <ClientZone client={client} onClientChange={setClient} />
        </div>

        {/* Lignes du panier */}
        <div className='flex-1 overflow-y-auto p-3 space-y-2'>
          {panier.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full
                            text-gray-300 py-12'>
              <ShoppingCart size={40} className='mb-3' />
              <p className='text-sm'>Cliquez sur un produit</p>
              <p className='text-sm'>pour l'ajouter</p>
            </div>
          ) : (
            panier.map(ligne => (
              <div key={ligne.produit.id}
                   className='flex items-center gap-2 p-2 rounded-lg
                              hover:bg-gray-50 group'>
                {/* Nom + prix unitaire */}
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-gray-800 truncate'>
                    {ligne.produit.nom}
                  </p>
                  <p className='text-xs text-gray-400'>
                    {Number(ligne.produit.prix_vente || 0).toLocaleString('fr-FR')} FCFA / u
                  </p>
                </div>

                {/* Contrôle quantité */}
                <div className='flex items-center gap-1'>
                  <button
                    onClick={() => modifierQuantite(ligne.produit.id, -1)}
                    className='w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100
                               hover:text-red-600 flex items-center justify-center
                               transition-colors'
                  >
                    <Minus size={12} />
                  </button>
                  <span className='w-6 text-center text-sm font-bold text-gray-800'>
                    {ligne.quantite}
                  </span>
                  <button
                    onClick={() => modifierQuantite(ligne.produit.id, +1)}
                    className='w-6 h-6 rounded-full bg-gray-100 hover:bg-green-100
                               hover:text-green-600 flex items-center justify-center
                               transition-colors'
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Sous-total */}
                <p className='text-sm font-bold text-gray-700 w-20 text-right'>
                  {((ligne.produit.prix_vente || 0) * ligne.quantite)
                    .toLocaleString('fr-FR')}
                </p>

                {/* Supprimer */}
                <button
                  onClick={() => retirerDuPanier(ligne.produit.id)}
                  className='text-gray-300 hover:text-red-500 transition-colors
                             opacity-0 group-hover:opacity-100'
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totaux + bouton payer */}
        <div className='p-4 border-t space-y-2'>
          <div className='flex justify-between text-sm text-gray-500'>
            <span>Sous-total HT</span>
            <span>{totalHTBrut.toLocaleString('fr-FR')} FCFA</span>
          </div>
          {/* Remise fidélité (seulement si client VIP/Or) */}
          {tauxRemise > 0 && (
            <div className='flex justify-between text-sm text-[#FF6B35] font-medium'>
              <span>Remise {client.statut === 'or' ? 'Or' : 'VIP'} (-{tauxRemise}%)</span>
              <span>-{remiseClient.toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
          <div className='flex justify-between text-sm text-gray-500'>
            <span>TVA ({TAUX_TVA}%)</span>
            <span>{totalTVA.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className='flex justify-between items-center pt-1 border-t'>
            <span className='text-gray-700 font-semibold'>Total à payer</span>
            <span className='text-xl font-bold text-[#1E3A5F]'>
              {totalTTC.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <button
            disabled={panier.length === 0}
            onClick={() => setModalPaiement(true)}
            className='w-full bg-[#FF6B35] hover:bg-orange-600 disabled:opacity-40
                       text-white font-bold py-3.5 rounded-xl transition-colors
                       flex items-center justify-center gap-2 text-base mt-1'
          >
            <CreditCard size={20} /> Encaisser
          </button>
        </div>
      </div>

      {/* ── Modals ── */}
      {modalPaiement && (
        <ModalPaiement
          total={totalTTC}
          onFermer={() => setModalPaiement(false)}
          onConfirmer={confirmerVente}
        />
      )}
      {recu && (
        <Recu
          vente={recu}
          onFermer={() => setRecu(null)}
        />
      )}
      {scannerOuvert && (
        <BarcodeScanner
          onDetecte={onCodeScanne}
          onFermer={() => setScannerOuvert(false)}
        />
      )}
      {accessoires && (
        <AccessoiresPopup
          produitNom={accessoires.produitNom}
          accessoires={accessoires.liste}
          onAjouter={ajouterAccessoire}
          onFermer={() => setAccessoires(null)}
        />
      )}
    </div>
  );
}
