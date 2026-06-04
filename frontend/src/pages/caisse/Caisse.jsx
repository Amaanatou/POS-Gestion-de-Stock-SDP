// src/pages/caisse/Caisse.jsx
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  CreditCard, Banknote, X, CheckCircle, Printer,
} from 'lucide-react';
import { getProduits, getProduitParBarre, creerVente } from '../../config/api';

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
  const date = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-sm'>

        <div className='p-5 border-b flex items-center justify-between'>
          <h2 className='text-lg font-bold text-gray-800'>Vente enregistrée ✅</h2>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={20} />
          </button>
        </div>

        {/* Corps du reçu */}
        <div className='p-5 font-mono text-sm'>
          <div className='text-center mb-4'>
            <p className='font-bold text-lg text-[#1E3A5F]'>SunuStock</p>
            <p className='text-gray-500 text-xs'>Gestion de Stock PME</p>
            <p className='text-gray-400 text-xs mt-1'>{date}</p>
          </div>

          <div className='border-t border-dashed pt-3 space-y-1 mb-3'>
            {vente.lignes.map((l, i) => (
              <div key={i} className='flex justify-between'>
                <span className='text-gray-700 truncate flex-1'>{l.nom}</span>
                <span className='text-gray-500 mx-2'>x{l.quantite}</span>
                <span className='font-medium'>
                  {(l.prix_vente * l.quantite).toLocaleString('fr-FR')}
                </span>
              </div>
            ))}
          </div>

          <div className='border-t border-dashed pt-3'>
            <div className='flex justify-between font-bold text-base'>
              <span>TOTAL</span>
              <span>{vente.total.toLocaleString('fr-FR')} FCFA</span>
            </div>
            {vente.monnaie > 0 && (
              <div className='flex justify-between text-green-600 text-xs mt-1'>
                <span>Monnaie rendue</span>
                <span>{vente.monnaie.toLocaleString('fr-FR')} FCFA</span>
              </div>
            )}
            <p className='text-center text-gray-400 text-xs mt-3'>
              Mode : {vente.modePaiement === 'especes' ? 'Espèces' : 'Carte / Mobile Money'}
            </p>
          </div>
        </div>

        <div className='p-4 flex gap-3 border-t'>
          <button
            onClick={() => window.print()}
            className='flex-1 flex items-center justify-center gap-2 border
                       border-gray-300 text-gray-700 py-2.5 rounded-lg
                       hover:bg-gray-50 transition-colors text-sm font-medium'
          >
            <Printer size={16} /> Imprimer
          </button>
          <button
            onClick={onFermer}
            className='flex-1 bg-[#1E3A5F] text-white py-2.5 rounded-lg
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
  const [produits, setProduits]       = useState([]);
  const [panier, setPanier]           = useState([]);  // { produit, quantite }
  const [recherche, setRecherche]     = useState('');
  const [chargement, setChargement]   = useState(true);
  const [modalPaiement, setModalPaiement] = useState(false);
  const [recu, setRecu]               = useState(null);
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
    }
  };

  const handleRechercheKeyDown = (e) => {
    if (e.key === 'Enter') {
      const val = recherche.trim();
      if (/^\d{6,}$/.test(val)) scannerCodeBarre(val);
    }
  };

  // ── Gestion du panier ─────────────────────────────────────
  const ajouterAuPanier = (produit) => {
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

  const total = panier.reduce(
    (sum, l) => sum + (l.produit.prix_vente || 0) * l.quantite, 0
  );

  // ── Finaliser la vente ────────────────────────────────────
  const confirmerVente = async (modePaiement, montantRecu) => {
    const lignes = panier.map(l => ({
      produit_id: l.produit.id,
      nom:        l.produit.nom,
      quantite:   l.quantite,
      prix_vente: l.produit.prix_vente,
    }));

    const res = await creerVente(lignes, modePaiement);
    setModalPaiement(false);

    if (res.success) {
      setRecu({
        lignes,
        total,
        modePaiement,
        monnaie: modePaiement === 'especes' ? Math.max(0, montantRecu - total) : 0,
      });
      viderPanier();
      toast.success('Vente enregistrée !');
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

        {/* Barre de recherche / scan */}
        <div className='relative mb-4'>
          <Search size={16} className='absolute left-3 top-3.5 text-gray-400' />
          <input
            ref={rechercheRef}
            type='text'
            placeholder='Chercher un produit ou scanner un code-barres...'
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            onKeyDown={handleRechercheKeyDown}
            className='w-full pl-9 pr-4 py-3 border border-gray-300 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-[#2196F3]
                       text-gray-800 bg-white shadow-sm'
          />
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

        {/* Total + bouton payer */}
        <div className='p-4 border-t space-y-3'>
          <div className='flex justify-between items-center'>
            <span className='text-gray-600 font-medium'>Total</span>
            <span className='text-xl font-bold text-[#1E3A5F]'>
              {total.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <button
            disabled={panier.length === 0}
            onClick={() => setModalPaiement(true)}
            className='w-full bg-[#FF6B35] hover:bg-orange-600 disabled:opacity-40
                       text-white font-bold py-3.5 rounded-xl transition-colors
                       flex items-center justify-center gap-2 text-base'
          >
            <CreditCard size={20} /> Encaisser
          </button>
        </div>
      </div>

      {/* ── Modals ── */}
      {modalPaiement && (
        <ModalPaiement
          total={total}
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
    </div>
  );
}
