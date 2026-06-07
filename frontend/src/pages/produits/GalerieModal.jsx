// src/pages/produits/GalerieModal.jsx
// Gestion de la galerie d'images secondaires d'un produit (§2.1)
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { X, ImagePlus, Trash2, Images, Star } from 'lucide-react';
import { getImagesProduit, ajouterImageProduit, supprimerImageProduit } from '../../config/api';

export default function GalerieModal({ produit, onFermer }) {
  const [images, setImages]       = useState([]);
  const [chargement, setChargement] = useState(true);
  const [upload, setUpload]       = useState(false);
  const inputRef = useRef();

  const charger = async () => {
    setChargement(true);
    const res = await getImagesProduit(produit.id);
    if (res.success) setImages(res.data);
    setChargement(false);
  };

  useEffect(() => { charger(); }, []);

  const onFichier = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUpload(true);
    const res = await ajouterImageProduit(produit.id, file);
    setUpload(false);
    if (res.success) {
      toast.success('Image ajoutée');
      setImages(prev => [...prev, res.data]);
    } else {
      toast.error(res.message || 'Erreur upload');
    }
    e.target.value = ''; // réinitialiser pour ré-uploader le même fichier
  };

  const supprimer = async (imgId) => {
    const res = await supprimerImageProduit(produit.id, imgId);
    if (res.success) {
      toast.success('Image supprimée');
      setImages(prev => prev.filter(i => i.id !== imgId));
    } else {
      toast.error('Erreur');
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto'>

        {/* En-tête */}
        <div className='flex items-center justify-between p-5 border-b sticky top-0 bg-white'>
          <div className='flex items-center gap-2'>
            <Images size={18} className='text-[#1E3A5F]' />
            <div>
              <h2 className='text-lg font-bold text-gray-800'>Galerie d'images</h2>
              <p className='text-xs text-gray-500'>{produit.nom}</p>
            </div>
          </div>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={22} />
          </button>
        </div>

        <div className='p-5'>
          {/* Image principale (rappel) */}
          <p className='text-sm font-medium text-gray-700 mb-2'>Image principale</p>
          <div className='mb-5'>
            {produit.image_url ? (
              <div className='relative inline-block'>
                <img src={produit.image_url} alt='principale'
                  className='h-28 rounded-lg border border-gray-200 object-cover' />
                <span className='absolute top-1 left-1 bg-[#FF6B35] text-white text-[10px]
                                 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5'>
                  <Star size={9} /> Principale
                </span>
              </div>
            ) : (
              <p className='text-sm text-gray-400'>Aucune image principale (à définir dans "Modifier")</p>
            )}
          </div>

          {/* Galerie secondaire */}
          <div className='flex items-center justify-between mb-2'>
            <p className='text-sm font-medium text-gray-700'>Images secondaires</p>
            <button onClick={() => inputRef.current?.click()} disabled={upload}
              className='flex items-center gap-1 text-sm bg-[#1E3A5F] hover:bg-blue-900
                         disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors'>
              {upload
                ? <span className='animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4' />
                : <><ImagePlus size={15} /> Ajouter</>}
            </button>
            <input ref={inputRef} type='file' accept='image/*' onChange={onFichier} className='hidden' />
          </div>

          {chargement ? (
            <div className='flex justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]' />
            </div>
          ) : images.length === 0 ? (
            <div className='text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl'>
              <Images size={32} className='mx-auto mb-2 opacity-40' />
              <p className='text-sm'>Aucune image secondaire</p>
              <p className='text-xs mt-1'>Ajoutez des photos sous différents angles.</p>
            </div>
          ) : (
            <div className='grid grid-cols-3 gap-3'>
              {images.map(img => (
                <div key={img.id} className='relative group'>
                  <img src={img.image_url} alt='secondaire'
                    className='w-full h-24 object-cover rounded-lg border border-gray-200' />
                  <button onClick={() => supprimer(img.id)}
                    className='absolute top-1 right-1 bg-red-500 text-white rounded-full p-1
                               opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600'
                    title='Supprimer'>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='p-4 border-t'>
          <button onClick={onFermer}
            className='w-full bg-[#1E3A5F] hover:bg-blue-900 text-white
                       font-bold py-2.5 rounded-xl transition-colors'>
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
}
