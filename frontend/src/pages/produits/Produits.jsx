// src/pages/produits/Produits.jsx
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Search, ImagePlus, X, Archive } from 'lucide-react';
import { getProduits, creerProduit, modifierProduit } from '../../config/api';
import StockBadge from '../../components/ui/StockBadge';

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

// ── Modal Ajout / Modification ────────────────────────────────
function ProduitModal({ produit, onFermer, onSuccess }) {
  const [loading, setLoading]         = useState(false);
  const [apercu, setApercu]           = useState(produit?.image_url || null);
  const [fichierImage, setFichierImage] = useState(null);
  const inputImageRef                 = useRef();
  const estModification               = !!produit;

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: produit ?? {},
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

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto'>

        <div className='flex items-center justify-between p-6 border-b sticky top-0 bg-white'>
          <h2 className='text-lg font-bold text-gray-800'>
            {estModification ? 'Modifier le produit' : 'Ajouter un produit'}
          </h2>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className='p-6 space-y-4'>

          {/* Zone image */}
          <div
            onClick={() => inputImageRef.current?.click()}
            className='border-2 border-dashed border-gray-300 rounded-xl p-4
                       flex flex-col items-center cursor-pointer hover:border-[#2196F3]
                       hover:bg-blue-50 transition-colors'
          >
            {apercu ? (
              <img src={apercu} alt='aperçu'
                className='h-32 object-contain rounded-lg mb-2' />
            ) : (
              <ImagePlus size={32} className='text-gray-300 mb-2' />
            )}
            <p className='text-sm text-gray-500'>
              {apercu ? 'Cliquer pour changer l\'image' : 'Cliquer pour ajouter une image'}
            </p>
            <p className='text-xs text-gray-400 mt-1'>JPG, PNG, WEBP — max 5 Mo</p>
            <input
              ref={inputImageRef}
              type='file'
              accept='image/*'
              onChange={onImageChange}
              className='hidden'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            {/* Nom */}
            <div className='col-span-2'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Nom du produit <span className='text-red-500'>*</span>
              </label>
              <input type='text' placeholder='Ex : Riz Tilda 5kg'
                {...register('nom', { required: 'Nom requis' })}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
              {errors.nom && <p className='text-red-500 text-xs mt-1'>{errors.nom.message}</p>}
            </div>

            {/* Catégorie */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Catégorie</label>
              <select {...register('categorie')}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800 bg-white'>
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

            {/* Marque */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Marque</label>
              <input type='text' placeholder='Ex : Tilda'
                {...register('marque')}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
            </div>

            {/* Code-barres */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Code-barres</label>
              <input type='text' placeholder='Ex : 6001234567890'
                {...register('code_barre')}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800 font-mono' />
            </div>

            {/* Prix vente */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Prix de vente (FCFA) <span className='text-red-500'>*</span>
              </label>
              <input type='number' min='0' placeholder='Ex : 2500'
                {...register('prix_vente', { required: 'Prix requis', min: 0 })}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
              {errors.prix_vente && <p className='text-red-500 text-xs mt-1'>{errors.prix_vente.message}</p>}
            </div>

            {/* Prix achat */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Prix d'achat (FCFA)</label>
              <input type='number' min='0' placeholder='Ex : 1800'
                {...register('prix_achat')}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
            </div>

            {/* Seuil alerte */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Seuil d'alerte</label>
              <input type='number' min='0' placeholder='Ex : 10'
                {...register('seuil_alerte')}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
            </div>

            {/* Emplacement */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Emplacement</label>
              <input type='text' placeholder='Ex : Allée A - Rayon 3'
                {...register('emplacement')}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
            </div>
          </div>

          <div className='flex gap-3 pt-2'>
            <button type='button' onClick={onFermer}
              className='flex-1 border border-gray-300 text-gray-700 font-medium
                         py-2.5 rounded-lg hover:bg-gray-50 transition-colors'>
              Annuler
            </button>
            <button type='submit' disabled={loading}
              className='flex-1 bg-[#FF6B35] hover:bg-orange-600 disabled:opacity-50
                         text-white font-bold py-2.5 rounded-lg transition-colors
                         flex items-center justify-center gap-2'>
              {loading
                ? <span className='animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4' />
                : estModification ? 'Enregistrer' : 'Ajouter le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page Produits ─────────────────────────────────────────────
export default function Produits() {
  const [produits, setProduits]     = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche]   = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState('');
  const [filtreStatut, setFiltreStatut]       = useState('');
  const [modal, setModal]           = useState(null);

  const charger = async () => {
    setChargement(true);
    const params = {};
    if (recherche)      params.search    = recherche;
    if (filtreCategorie) params.categorie = filtreCategorie;
    if (filtreStatut)    params.statut    = filtreStatut;
    const res = await getProduits(params);
    if (res.success) setProduits(res.data);
    setChargement(false);
  };

  useEffect(() => { charger(); }, [recherche, filtreCategorie, filtreStatut]);

  return (
    <div>
      {/* En-tête */}
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold text-gray-800'>Catalogue Produits</h1>
        <button onClick={() => setModal('ajout')}
          className='flex items-center gap-2 bg-[#FF6B35] hover:bg-orange-600
                     text-white font-bold px-4 py-2.5 rounded-lg transition-colors'>
          <Plus size={18} /> Ajouter un produit
        </button>
      </div>

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
                    <div className='flex gap-2'>
                      <button onClick={() => setModal(p)}
                        className='p-1.5 text-[#2196F3] hover:bg-blue-50 rounded-lg transition-colors'
                        title='Modifier'>
                        <Pencil size={15} />
                      </button>
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

      <p className='text-xs text-gray-400 mt-3 text-right'>
        {produits.length} produit{produits.length > 1 ? 's' : ''} affiché{produits.length > 1 ? 's' : ''}
      </p>

      {modal && (
        <ProduitModal
          produit={modal === 'ajout' ? null : modal}
          onFermer={() => setModal(null)}
          onSuccess={() => { setModal(null); charger(); }}
        />
      )}
    </div>
  );
}
