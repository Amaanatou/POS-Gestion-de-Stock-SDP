// src/pages/produits/Produits.jsx
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Search, ImagePlus, X, Archive, Link2, Images, Boxes, Copy, History, Info, Tag } from 'lucide-react';
import { getProduits, creerProduit, modifierProduit, archiverProduit, getVentesProduit, getFournisseurs } from '../../config/api';
import StockBadge from '../../components/ui/StockBadge';
import EntetePage from '../../components/ui/EntetePage';
import { useAuth } from '../../context/AuthContext';
import AccessoiresPanel from './AccessoiresModal';
import GaleriePanel from './GalerieModal';

// ── Placeholder image ─────────────────────────────────────────
function ImgProduit({ src, nom, size = 10 }) {
  const [erreur, setErreur] = useState(false);
  if (src && !erreur) {
    return (
      <img
        src={src} alt={nom}
        onError={() => setErreur(true)}
        className={`w-${size} h-${size} object-cover rounded-lg border border-gray-100`}
      />
    );
  }
  return (
    <div className={`w-${size} h-${size} bg-gray-100 rounded-lg border border-gray-200
                     flex items-center justify-center text-gray-300 text-xs`}>
      <ImagePlus size={16} />
    </div>
  );
}

// ── Modal produit à onglets (Informations / Prix / Stock / Images / Accessoires) ──
function ProduitModal({ produit, donneesInitiales, fournisseurs = [], onFermer, onSuccess }) {
  const [loading, setLoading]           = useState(false);
  const [apercu, setApercu]             = useState(produit?.image_url || null);
  const [fichierImage, setFichierImage] = useState(null);
  const [onglet, setOnglet]             = useState('infos');
  const inputImageRef                   = useRef();
  const estModification                 = !!produit;
  const estDuplication                  = !produit && !!donneesInitiales;

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: produit ?? donneesInitiales ?? {},
  });

  const onImageChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFichierImage(f);
    setApercu(URL.createObjectURL(f));
  };

  const onSubmit = async (data) => {
    setLoading(true);
    const res = estModification
      ? await modifierProduit(produit.id, data, fichierImage)
      : await creerProduit(data, fichierImage);
    setLoading(false);
    if (res.success) {
      toast.success(estModification ? 'Produit modifié !' : 'Produit ajouté !');
      onSuccess();
    } else {
      toast.error(res.message || 'Une erreur est survenue');
    }
  };

  // Si la validation échoue sur un onglet masqué, basculer dessus pour montrer l'erreur
  const onInvalid = (errs) => {
    if (errs.nom) setOnglet('infos');
    else if (errs.prix_vente) setOnglet('prix');
  };

  const onglets = [
    { id: 'infos',       label: 'Informations', icone: Info },
    { id: 'prix',        label: 'Prix',         icone: Tag },
    { id: 'stock',       label: 'Stock',        icone: Boxes },
    { id: 'images',      label: 'Images',       icone: Images },
    { id: 'accessoires', label: 'Accessoires',  icone: Link2 },
  ];

  const champ = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800';
  const lab   = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col'>

        {/* En-tête */}
        <div className='flex items-center justify-between px-6 py-4 border-b'>
          <h2 className='text-lg font-bold text-gray-800'>
            {estModification ? 'Modifier le produit'
              : estDuplication ? 'Dupliquer le produit'
              : 'Ajouter un produit'}
          </h2>
          <button type='button' onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={22} />
          </button>
        </div>

        {/* Onglets */}
        <div className='flex gap-1 px-4 border-b overflow-x-auto'>
          {onglets.map(o => {
            const Icone = o.icone;
            const actif = onglet === o.id;
            return (
              <button key={o.id} type='button' onClick={() => setOnglet(o.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap
                            border-b-2 -mb-px transition-colors
                  ${actif ? 'text-[#1E3A5F] border-[#FF6B35]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                <Icone size={15} /> {o.label}
              </button>
            );
          })}
        </div>

        {/* Contenu */}
        <div className='p-6 overflow-y-auto flex-1'>
          {/* Champs du formulaire — toujours montés, masqués si onglet inactif */}
          <form id='produit-form' onSubmit={handleSubmit(onSubmit, onInvalid)}>

            {/* INFORMATIONS */}
            <div className={onglet === 'infos' ? 'space-y-4' : 'hidden'}>
              <div>
                <label className={lab}>Nom du produit <span className='text-red-500'>*</span></label>
                <input type='text' placeholder='Ex : Riz Tilda 5kg'
                  {...register('nom', { required: 'Nom requis' })} className={champ} />
                {errors.nom && <p className='text-red-500 text-xs mt-1'>{errors.nom.message}</p>}
              </div>
              <div>
                <label className={lab}>Description</label>
                <textarea rows='2' placeholder='Description détaillée du produit…'
                  {...register('description')} className={champ} />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className={lab}>Catégorie</label>
                  <select {...register('categorie')} className={champ + ' bg-white'}>
                    <option value=''>— Choisir —</option>
                    <option>Alimentation</option>
                    <option>Boissons</option>
                    <option>Hygiène</option>
                    <option>Électronique</option>
                    <option>Textile</option>
                    <option>Cosmétiques</option>
                    <option>Boulangerie</option>
                  </select>
                </div>
                <div>
                  <label className={lab}>Fournisseur</label>
                  <select {...register('fournisseur_id')} className={champ + ' bg-white'}>
                    <option value=''>— Aucun —</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lab}>Marque</label>
                  <input type='text' placeholder='Ex : Tilda' {...register('marque')} className={champ} />
                </div>
                <div>
                  <label className={lab}>Code-barres</label>
                  <input type='text' placeholder='Ex : 6001234567890'
                    {...register('code_barre')} className={champ + ' font-mono'} />
                </div>
                <div>
                  <label className={lab}>Emplacement</label>
                  <input type='text' placeholder='Ex : Allée A - Rayon 3'
                    {...register('emplacement')} className={champ} />
                </div>
              </div>
            </div>

            {/* PRIX */}
            <div className={onglet === 'prix' ? 'space-y-4' : 'hidden'}>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className={lab}>Prix de vente (FCFA) <span className='text-red-500'>*</span></label>
                  <input type='number' min='0' placeholder='Ex : 2500'
                    {...register('prix_vente', { required: 'Prix requis', min: 0 })} className={champ} />
                  {errors.prix_vente && <p className='text-red-500 text-xs mt-1'>{errors.prix_vente.message}</p>}
                </div>
                <div>
                  <label className={lab}>Prix d'achat (FCFA)</label>
                  <input type='number' min='0' placeholder='Ex : 1800'
                    {...register('prix_achat')} className={champ} />
                </div>
              </div>
              <p className='text-xs text-gray-400'>
                Les prix sont affichés Hors Taxe ; la TVA (18 %) est ajoutée à l'encaissement.
              </p>
            </div>

            {/* STOCK */}
            <div className={onglet === 'stock' ? 'space-y-4' : 'hidden'}>
              {estModification && (
                <div className='bg-gray-50 rounded-xl p-4 flex items-center justify-between'>
                  <span className='text-sm text-gray-500'>Quantité actuelle en stock</span>
                  <span className='text-xl font-bold text-[#1E3A5F]'>{produit?.quantite ?? '—'}</span>
                </div>
              )}
              <div>
                <label className={lab}>Seuil d'alerte (stock minimum)</label>
                <input type='number' min='0' placeholder='Ex : 10'
                  {...register('seuil_alerte')} className={champ} />
                <p className='text-xs text-gray-400 mt-1'>
                  En dessous de ce seuil, une alerte de réapprovisionnement est déclenchée.
                </p>
              </div>
              <p className='text-xs text-gray-400'>
                Les entrées et sorties de stock se gèrent dans le menu « Stocks ».
              </p>
            </div>

            {/* IMAGES — image principale */}
            <div className={onglet === 'images' ? '' : 'hidden'}>
              <p className={lab}>Image principale</p>
              <div onClick={() => inputImageRef.current?.click()}
                className='border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center
                           cursor-pointer hover:border-[#2196F3] hover:bg-blue-50 transition-colors'>
                {apercu
                  ? <img src={apercu} alt='aperçu' className='h-32 object-contain rounded-lg mb-2' />
                  : <ImagePlus size={32} className='text-gray-300 mb-2' />}
                <p className='text-sm text-gray-500'>
                  {apercu ? 'Cliquer pour changer l\'image' : 'Cliquer pour ajouter une image'}
                </p>
                <p className='text-xs text-gray-400 mt-1'>JPG, PNG, WEBP — max 5 Mo</p>
                <input ref={inputImageRef} type='file' accept='image/*' onChange={onImageChange} className='hidden' />
              </div>
            </div>
          </form>

          {/* IMAGES — galerie secondaire (hors formulaire) */}
          {onglet === 'images' && (
            <div className='mt-5 pt-5 border-t'>
              {estModification
                ? <GaleriePanel produit={produit} />
                : <p className='text-xs text-gray-400'>
                    La galerie d'images secondaires sera disponible après l'enregistrement du produit.
                  </p>}
            </div>
          )}

          {/* ACCESSOIRES (hors formulaire) */}
          {onglet === 'accessoires' && (
            estModification
              ? <AccessoiresPanel produit={produit} />
              : <div className='text-center py-10 text-gray-400'>
                  <Link2 size={28} className='mx-auto mb-2 opacity-40' />
                  <p className='text-sm'>Enregistre d'abord le produit pour lui lier des accessoires.</p>
                </div>
          )}
        </div>

        {/* Pied : actions */}
        <div className='flex gap-3 px-6 py-4 border-t'>
          <button type='button' onClick={onFermer}
            className='flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors'>
            Fermer
          </button>
          <button type='submit' form='produit-form' disabled={loading}
            className='flex-1 bg-[#FF6B35] hover:bg-orange-600 disabled:opacity-50 text-white font-bold
                       py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2'>
            {loading
              ? <span className='animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4' />
              : estModification ? 'Enregistrer' : 'Ajouter le produit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Historique des ventes d'un produit ──────────────────
function HistoriqueVentesModal({ produit, onFermer }) {
  const [data, setData]             = useState([]);
  const [resume, setResume]         = useState(null);
  const [chargement, setChargement] = useState(true);
  const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');

  useEffect(() => {
    getVentesProduit(produit.id).then(res => {
      if (res.success) { setData(res.data || []); setResume(res.resume); }
      setChargement(false);
    });
  }, [produit.id]);

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between p-5 border-b sticky top-0 bg-white'>
          <div className='flex items-center gap-2'>
            <History size={18} className='text-[#1E3A5F]' />
            <h2 className='text-lg font-bold text-gray-800'>Historique des ventes</h2>
          </div>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'><X size={22} /></button>
        </div>
        <div className='p-5'>
          <p className='text-sm text-gray-500 mb-4'>{produit.nom}</p>
          {chargement ? (
            <div className='flex justify-center py-10'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]' />
            </div>
          ) : (
            <>
              <div className='grid grid-cols-2 gap-3 mb-4'>
                <div className='bg-blue-50 rounded-xl p-3'>
                  <p className='text-xs text-gray-500'>Quantité vendue</p>
                  <p className='text-xl font-bold text-[#1E3A5F]'>{fmt(resume?.total_qte)}</p>
                </div>
                <div className='bg-green-50 rounded-xl p-3'>
                  <p className='text-xs text-gray-500'>CA généré (HT)</p>
                  <p className='text-xl font-bold text-green-700'>{fmt(resume?.total_ca)} F</p>
                </div>
              </div>
              {data.length === 0 ? (
                <p className='text-center text-gray-400 py-8 text-sm'>Aucune vente pour ce produit</p>
              ) : (
                <div className='border rounded-xl overflow-hidden'>
                  <table className='w-full text-sm'>
                    <thead className='bg-gray-50 text-gray-500 text-xs'>
                      <tr>
                        <th className='px-3 py-2 text-left'>Date</th>
                        <th className='px-3 py-2 text-left'>Reçu</th>
                        <th className='px-3 py-2 text-center'>Qté</th>
                        <th className='px-3 py-2 text-right'>Total</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y'>
                      {data.map((l, i) => (
                        <tr key={i} className={l.statut === 'annulee' ? 'opacity-50 line-through' : ''}>
                          <td className='px-3 py-2 text-gray-500 whitespace-nowrap'>
                            {new Date(l.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </td>
                          <td className='px-3 py-2 font-mono text-xs text-gray-600'>{l.numero}</td>
                          <td className='px-3 py-2 text-center'>{l.quantite}</td>
                          <td className='px-3 py-2 text-right font-medium'>{fmt(l.sous_total)} F</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page Produits ─────────────────────────────────────────────
export default function Produits() {
  const { utilisateur } = useAuth();
  const estAdmin = utilisateur?.role === 'admin';

  const [produits, setProduits]     = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche]   = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState('');
  const [filtreMarque, setFiltreMarque]       = useState('');
  const [filtreFournisseur, setFiltreFournisseur] = useState('');
  const [filtreStatut, setFiltreStatut]       = useState('');
  const [fournisseurs, setFournisseurs]       = useState([]);
  const [modal, setModal]           = useState(null);
  const [modalDupliquer, setModalDupliquer]   = useState(null); // données pré-remplies pour dupliquer
  const [modalHistorique, setModalHistorique] = useState(null); // produit dont on voit l'historique ventes
  const [modalArchive, setModalArchive]       = useState(null); // produit à archiver (confirmation)
  const [archivageEnCours, setArchivageEnCours] = useState(false);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const PER_PAGE = 15;

  const charger = async () => {
    setChargement(true);
    const params = { page, per_page: PER_PAGE };
    if (recherche)       params.search    = recherche;
    if (filtreCategorie) params.categorie = filtreCategorie;
    if (filtreMarque)    params.marque    = filtreMarque;
    if (filtreFournisseur) params.fournisseur = filtreFournisseur;
    if (filtreStatut)    params.statut    = filtreStatut;
    const res = await getProduits(params);
    if (res.success) {
      setProduits(res.data);
      setTotalPages(res.total_pages || 1);
      setTotal(res.total || res.data.length);
    }
    setChargement(false);
  };

  // Recharger quand la page change
  useEffect(() => { charger(); }, [page]);

  // Charger la liste des fournisseurs (filtre + formulaire) — une seule fois
  useEffect(() => {
    getFournisseurs().then(res => { if (res.success) setFournisseurs(res.data); });
  }, []);

  // Revenir à la page 1 quand un filtre change (et recharger)
  useEffect(() => {
    if (page === 1) charger();
    else setPage(1);
  }, [recherche, filtreCategorie, filtreMarque, filtreFournisseur, filtreStatut]);

  const confirmerArchive = async () => {
    setArchivageEnCours(true);
    const res = await archiverProduit(modalArchive.id);
    setArchivageEnCours(false);
    if (res.success) { toast.success('Produit archivé'); setModalArchive(null); charger(); }
    else toast.error(res.message || 'Erreur');
  };

  // Marques connues (suggestions du filtre) — issues de la page courante
  const marquesConnues = [...new Set(produits.map(p => p.marque).filter(Boolean))].sort();

  return (
    <div>
      {/* En-tête */}
      <EntetePage
        icone={Boxes}
        titre='Catalogue Produits'
        description='Gérez vos articles : prix, photos, accessoires et codes-barres.'
        actions={
          <button onClick={() => setModal('ajout')}
            className='flex items-center gap-2 bg-[#FF6B35] hover:bg-orange-600
                       text-white font-bold px-4 py-2.5 rounded-lg transition-colors'>
            <Plus size={18} /> Ajouter un produit
          </button>
        }
      />

      {/* Filtres */}
      <div className='flex flex-wrap gap-3 mb-5'>
        <div className='relative flex-1 min-w-48'>
          <Search size={15} className='absolute left-3 top-3 text-gray-400' />
          <input type='text' placeholder='Rechercher...'
            value={recherche} onChange={e => setRecherche(e.target.value)}
            className='w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#2196F3]' />
        </div>

        <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}
          className='border border-gray-300 rounded-lg px-3 py-2.5 bg-white
                     focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-700'>
          <option value=''>Toutes catégories</option>
          <option>Alimentation</option>
          <option>Boissons</option>
          <option>Hygiène</option>
          <option>Électronique</option>
          <option>Textile</option>
          <option>Cosmétiques</option>
          <option>Boulangerie</option>
        </select>

        <input list='marques-suggestions' type='text' placeholder='Marque…'
          value={filtreMarque} onChange={e => setFiltreMarque(e.target.value)}
          className='border border-gray-300 rounded-lg px-3 py-2.5 bg-white w-40
                     focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-700' />
        <datalist id='marques-suggestions'>
          {marquesConnues.map(m => <option key={m} value={m} />)}
        </datalist>

        <select value={filtreFournisseur} onChange={e => setFiltreFournisseur(e.target.value)}
          className='border border-gray-300 rounded-lg px-3 py-2.5 bg-white
                     focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-700'>
          <option value=''>Tous fournisseurs</option>
          {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
        </select>

        <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
          className='border border-gray-300 rounded-lg px-3 py-2.5 bg-white
                     focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-700'>
          <option value=''>Tous les stocks</option>
          <option value='normal'>Normal</option>
          <option value='critique'>Critique</option>
          <option value='rupture'>Rupture</option>
        </select>
      </div>

      {/* Tableau */}
      {chargement ? (
        <div className='flex items-center justify-center h-64'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]' />
        </div>
      ) : (
        <div className='bg-white rounded-xl shadow overflow-hidden'>
          <table className='w-full'>
            <thead className='bg-[#1E3A5F] text-white text-sm'>
              <tr>
                {['Image','Produit','Catégorie','Code-barres','Prix','Stock','Statut','Actions'].map(h => (
                  <th key={h} className='px-4 py-3 text-left font-medium'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {produits.map((p, i) => (
                <tr key={p.id}
                    className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                  <td className='px-4 py-3'>
                    <ImgProduit src={p.image_url} nom={p.nom} size={10} />
                  </td>
                  <td className='px-4 py-3'>
                    <p className='font-medium text-gray-800'>{p.nom}</p>
                    <p className='text-xs text-gray-400'>{p.marque || '—'}</p>
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-500'>{p.categorie || '—'}</td>
                  <td className='px-4 py-3 text-sm text-gray-500 font-mono'>{p.code_barre || '—'}</td>
                  <td className='px-4 py-3 text-sm font-semibold text-gray-700'>
                    {p.prix_vente ? `${Number(p.prix_vente).toLocaleString('fr-FR')} F` : '—'}
                  </td>
                  <td className='px-4 py-3 text-sm font-bold text-gray-700'>
                    {p.quantite ?? '—'}
                  </td>
                  <td className='px-4 py-3'>
                    <StockBadge statut={p.statut_stock || 'normal'} />
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex gap-1'>
                      <button onClick={() => setModal(p)}
                        className='p-1.5 text-[#2196F3] hover:bg-blue-50 rounded-lg transition-colors'
                        title='Modifier'>
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setModalDupliquer({
                        nom: `${p.nom} (copie)`,
                        description: p.description || '',
                        marque: p.marque || '',
                        categorie: p.categorie || '',
                        fournisseur_id: p.fournisseur_id || '',
                        prix_vente: p.prix_vente,
                        prix_achat: p.prix_achat,
                        seuil_alerte: p.seuil_alerte,
                        emplacement: p.emplacement || '',
                      })}
                        className='p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors'
                        title='Dupliquer le produit'>
                        <Copy size={15} />
                      </button>
                      <button onClick={() => setModalHistorique(p)}
                        className='p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors'
                        title='Voir historique ventes'>
                        <History size={15} />
                      </button>
                      {estAdmin && (
                        <button onClick={() => setModalArchive(p)}
                          className='p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors'
                          title='Archiver le produit'>
                          <Archive size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {produits.length === 0 && (
            <div className='text-center py-12 text-gray-400'>
              Aucun produit trouvé
            </div>
          )}
        </div>
      )}

      {/* Pagination serveur */}
      <div className='flex items-center justify-between mt-4'>
        <p className='text-xs text-gray-400'>
          {total} produit{total > 1 ? 's' : ''} au total — page {page} / {totalPages}
        </p>
        {totalPages > 1 && (
          <div className='flex items-center gap-1'>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className='px-3 py-1.5 rounded-lg border text-sm text-gray-600
                         hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'>
              ← Précédent
            </button>
            <span className='px-3 py-1.5 text-sm font-medium text-gray-700'>{page}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className='px-3 py-1.5 rounded-lg border text-sm text-gray-600
                         hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'>
              Suivant →
            </button>
          </div>
        )}
      </div>

      {modal && (
        <ProduitModal
          produit={modal === 'ajout' ? null : modal}
          fournisseurs={fournisseurs}
          onFermer={() => setModal(null)}
          onSuccess={() => { setModal(null); charger(); }}
        />
      )}

      {modalDupliquer && (
        <ProduitModal
          produit={null}
          donneesInitiales={modalDupliquer}
          fournisseurs={fournisseurs}
          onFermer={() => setModalDupliquer(null)}
          onSuccess={() => { setModalDupliquer(null); charger(); }}
        />
      )}

      {modalHistorique && (
        <HistoriqueVentesModal
          produit={modalHistorique}
          onFermer={() => setModalHistorique(null)}
        />
      )}

      {modalArchive && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6'>
            <div className='flex items-center gap-2 mb-3'>
              <Archive size={20} className='text-red-500' />
              <h2 className='text-lg font-bold text-gray-800'>Archiver le produit</h2>
            </div>
            <p className='text-sm text-gray-500 mb-5'>
              « {modalArchive.nom} » n'apparaîtra plus dans le catalogue ni à la caisse.
            </p>
            <div className='flex gap-3'>
              <button onClick={() => setModalArchive(null)}
                className='flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50'>
                Annuler
              </button>
              <button onClick={confirmerArchive} disabled={archivageEnCours}
                className='flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg'>
                {archivageEnCours ? '...' : 'Archiver'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
