// src/pages/caisse/ClientZone.jsx
// Zone client fidélité à la caisse — recherche par téléphone OU scan QR, statut, points
import { useState } from 'react';
import toast from 'react-hot-toast';
import { User, UserPlus, X, Search, Star, Crown, QrCode } from 'lucide-react';
import { rechercherClient, creerClient } from '../../config/api';
import QRScannerClient from '../../components/ui/QRScannerClient';
import { QR_PREFIXE } from '../clients/Clients';

// Badge de statut fidélité
function StatutBadge({ statut }) {
  const cfg = {
    standard: { label: 'Standard', classes: 'bg-gray-100 text-gray-600',   icon: User },
    vip:      { label: 'VIP',      classes: 'bg-blue-100 text-blue-700',    icon: Star },
    or:       { label: 'Or',       classes: 'bg-amber-100 text-amber-700',  icon: Crown },
  };
  const { label, classes, icon: Icon } = cfg[statut] ?? cfg.standard;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
      <Icon size={11} /> {label}
    </span>
  );
}

// Mini-formulaire de création rapide
function NouveauClient({ telephone, onCree, onAnnuler }) {
  const [nom, setNom]       = useState('');
  const [tel, setTel]       = useState(telephone || '');
  const [statut, setStatut] = useState('standard');
  const [loading, setLoading] = useState(false);

  const creer = async () => {
    if (!nom.trim() || !tel.trim()) {
      toast.error('Nom et téléphone requis');
      return;
    }
    setLoading(true);
    const res = await creerClient({ nom, telephone: tel, statut });
    setLoading(false);
    if (res.success) {
      toast.success('Client créé');
      onCree(res.data);
    } else {
      toast.error(res.message || 'Erreur');
    }
  };

  return (
    <div className='space-y-2'>
      <input
        type='text' placeholder='Nom du client'
        value={nom} onChange={e => setNom(e.target.value)}
        className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-[#2196F3]'
      />
      <input
        type='tel' placeholder='Téléphone'
        value={tel} onChange={e => setTel(e.target.value)}
        className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-[#2196F3]'
      />
      <select
        value={statut} onChange={e => setStatut(e.target.value)}
        className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white
                   focus:outline-none focus:ring-2 focus:ring-[#2196F3]'
      >
        <option value='standard'>Standard</option>
        <option value='vip'>VIP</option>
        <option value='or'>Or</option>
      </select>
      <div className='flex gap-2'>
        <button onClick={onAnnuler}
          className='flex-1 border border-gray-300 text-gray-600 rounded-lg py-1.5 text-sm hover:bg-gray-50'>
          Annuler
        </button>
        <button onClick={creer} disabled={loading}
          className='flex-1 bg-[#1E3A5F] text-white rounded-lg py-1.5 text-sm font-medium
                     hover:bg-blue-900 disabled:opacity-50'>
          {loading ? '...' : 'Créer'}
        </button>
      </div>
    </div>
  );
}

export default function ClientZone({ client, onClientChange }) {
  const [recherche, setRecherche]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [modeCreation, setModeCreation] = useState(false);
  const [scannerQR, setScannerQR]   = useState(false);

  // Appelé quand le QR est scanné : extrait le téléphone et cherche le client
  const onQRScanne = async (texte) => {
    setScannerQR(false);
    // Le QR contient "SUNUCLIENT:771234567"
    const tel = texte.startsWith(QR_PREFIXE) ? texte.slice(QR_PREFIXE.length) : texte;
    const res = await rechercherClient(tel.trim());
    if (res.success) {
      onClientChange(res.data);
      toast.success(`Client : ${res.data.nom}`);
    } else {
      toast.error('Client introuvable pour ce QR');
    }
  };

  const chercher = async () => {
    const tel = recherche.trim();
    if (!tel) return;
    setLoading(true);
    const res = await rechercherClient(tel);
    setLoading(false);
    if (res.success) {
      onClientChange(res.data);
      setRecherche('');
      toast.success(`Client : ${res.data.nom}`);
    } else {
      // Pas trouvé → proposer la création
      toast('Client introuvable — créez-le', { icon: '👤' });
      setModeCreation(true);
    }
  };

  // ── Client déjà sélectionné ──
  if (client) {
    return (
      <div className='bg-blue-50 border border-blue-100 rounded-xl p-3'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-2'>
            <div className='w-9 h-9 rounded-full bg-[#1E3A5F] flex items-center
                            justify-center text-white font-bold text-sm'>
              {client.nom?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <p className='font-semibold text-gray-800 text-sm leading-tight'>{client.nom}</p>
              <p className='text-xs text-gray-500'>{client.telephone}</p>
            </div>
          </div>
          <button onClick={() => onClientChange(null)}
            className='text-gray-400 hover:text-red-500'>
            <X size={16} />
          </button>
        </div>
        <div className='flex items-center justify-between mt-2 pt-2 border-t border-blue-100'>
          <StatutBadge statut={client.statut} />
          <span className='text-xs text-gray-600'>
            <span className='font-bold text-[#FF6B35]'>{client.points}</span> points
          </span>
        </div>
      </div>
    );
  }

  // ── Mode création ──
  if (modeCreation) {
    return (
      <div className='bg-gray-50 border border-gray-200 rounded-xl p-3'>
        <div className='flex items-center justify-between mb-2'>
          <p className='text-sm font-semibold text-gray-700'>Nouveau client</p>
          <button onClick={() => setModeCreation(false)}
            className='text-gray-400 hover:text-gray-600'>
            <X size={16} />
          </button>
        </div>
        <NouveauClient
          telephone={recherche}
          onCree={(c) => { onClientChange(c); setModeCreation(false); setRecherche(''); }}
          onAnnuler={() => setModeCreation(false)}
        />
      </div>
    );
  }

  // ── Recherche ──
  return (
    <>
      <div className='flex gap-2'>
        <div className='relative flex-1'>
          <Search size={14} className='absolute left-2.5 top-2.5 text-gray-400' />
          <input
            type='tel'
            placeholder='Téléphone client (fidélité)'
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && chercher()}
            className='w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#2196F3]'
          />
        </div>
        <button onClick={chercher} disabled={loading}
          title='Rechercher le client'
          className='bg-[#1E3A5F] text-white px-3 rounded-lg hover:bg-blue-900
                     disabled:opacity-50 transition-colors'>
          {loading ? '...' : <Search size={16} />}
        </button>
        <button onClick={() => setScannerQR(true)}
          title='Scanner le QR fidélité'
          className='bg-[#FF6B35] text-white px-3 rounded-lg hover:bg-orange-600
                     transition-colors'>
          <QrCode size={16} />
        </button>
        <button onClick={() => setModeCreation(true)}
          title='Nouveau client'
          className='border border-gray-300 text-gray-600 px-3 rounded-lg
                     hover:bg-gray-50 transition-colors'>
          <UserPlus size={16} />
        </button>
      </div>

      {scannerQR && (
        <QRScannerClient onScan={onQRScanne} onFermer={() => setScannerQR(false)} />
      )}
    </>
  );
}
