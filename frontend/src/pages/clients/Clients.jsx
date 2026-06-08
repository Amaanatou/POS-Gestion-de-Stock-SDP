// src/pages/clients/Clients.jsx
// Back-office — gestion des clients fidélité + QR codes (manager/admin)
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { Plus, Pencil, Search, X, QrCode, Printer, Star, Crown, User, Gift } from 'lucide-react';
import { getClients, creerClient, modifierClient, convertirPoints } from '../../config/api';

// Préfixe encodé dans le QR pour identifier un client SunuStock
export const QR_PREFIXE = 'SUNUCLIENT:';

// Badge statut
function StatutBadge({ statut }) {
  const cfg = {
    standard: { label: 'Standard', classes: 'bg-gray-100 text-gray-600',  icon: User },
    vip:      { label: 'VIP',      classes: 'bg-blue-100 text-blue-700',   icon: Star },
    or:       { label: 'Or',       classes: 'bg-amber-100 text-amber-700', icon: Crown },
  };
  const { label, classes, icon: Icon } = cfg[statut] ?? cfg.standard;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
      <Icon size={11} /> {label}
    </span>
  );
}

// ── Modal QR Code ─────────────────────────────────────────────
function QRModal({ client, onFermer }) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(QR_PREFIXE + client.telephone, { width: 260, margin: 1 })
      .then(setQrUrl)
      .catch(() => toast.error('Erreur génération QR'));
  }, [client]);

  const imprimer = () => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Carte fidélité — ${client.nom}</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2 style="color:#1E3A5F">SunuStock — Carte de fidélité</h2>
        <img src="${qrUrl}" style="width:260px"/>
        <h3>${client.nom}</h3>
        <p>${client.telephone} — Statut ${client.statut.toUpperCase()}</p>
        <p style="color:#888;font-size:12px">Présentez ce code en caisse pour cumuler vos points</p>
      </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-xs'>
        <div className='flex items-center justify-between p-4 border-b'>
          <div className='flex items-center gap-2'>
            <QrCode size={18} className='text-[#1E3A5F]' />
            <h2 className='font-bold text-gray-800'>Carte fidélité</h2>
          </div>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={20} />
          </button>
        </div>
        <div className='p-5 text-center'>
          {qrUrl
            ? <img src={qrUrl} alt='QR' className='mx-auto rounded-lg' />
            : <div className='h-64 flex items-center justify-center text-gray-300'>Génération...</div>}
          <h3 className='font-bold text-gray-800 mt-3'>{client.nom}</h3>
          <p className='text-sm text-gray-500'>{client.telephone}</p>
          <div className='mt-2'><StatutBadge statut={client.statut} /></div>
        </div>
        <div className='p-4 border-t'>
          <button onClick={imprimer}
            className='w-full flex items-center justify-center gap-2 bg-[#1E3A5F]
                       hover:bg-blue-900 text-white font-bold py-2.5 rounded-xl transition-colors'>
            <Printer size={16} /> Imprimer la carte
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Conversion points → bon d'achat ─────────────────────
function ConversionModal({ client, onFermer, onSuccess }) {
  const [points, setPoints]   = useState(Math.min(client.points, 100));
  const [loading, setLoading] = useState(false);
  const [bon, setBon]         = useState(null);  // bon généré

  const convertir = async () => {
    if (points < 100) { toast.error('Minimum 100 points'); return; }
    if (points > client.points) { toast.error('Solde insuffisant'); return; }
    setLoading(true);
    const res = await convertirPoints(client.id, Number(points));
    setLoading(false);
    if (res.success) {
      setBon(res.data);
      toast.success('Bon d\'achat généré !');
      onSuccess();
    } else {
      toast.error(res.message || 'Erreur');
    }
  };

  const imprimer = () => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Bon d'achat — ${bon.client}</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2 style="color:#1E3A5F">SunuStock — Bon d'achat</h2>
        <div style="border:2px dashed #FF6B35;border-radius:12px;padding:24px;max-width:340px;margin:20px auto">
          <p style="font-size:13px;color:#888">Code du bon</p>
          <p style="font-size:26px;font-weight:bold;letter-spacing:2px;color:#1E3A5F">${bon.code}</p>
          <p style="font-size:34px;font-weight:bold;color:#FF6B35;margin:14px 0">${bon.valeur.toLocaleString('fr-FR')} FCFA</p>
          <p style="font-size:13px">Client : <b>${bon.client}</b></p>
          <p style="font-size:12px;color:#888">${bon.points_utilises} points utilisés</p>
        </div>
        <p style="font-size:11px;color:#888">Valable en caisse — non remboursable en espèces</p>
      </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-sm'>
        <div className='flex items-center justify-between p-5 border-b'>
          <div className='flex items-center gap-2'>
            <Gift size={18} className='text-[#FF6B35]' />
            <h2 className='text-lg font-bold text-gray-800'>Bon d'achat fidélité</h2>
          </div>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={22} />
          </button>
        </div>

        {!bon ? (
          <div className='p-5 space-y-4'>
            <div className='bg-blue-50 rounded-lg p-3 text-sm flex justify-between'>
              <span className='text-gray-600'>Points de {client.nom}</span>
              <span className='font-bold text-[#FF6B35]'>{client.points} pts</span>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Points à convertir <span className='text-gray-400'>(1 point = 5 FCFA)</span>
              </label>
              <input type='number' min='100' max={client.points} step='50'
                value={points} onChange={e => setPoints(Number(e.target.value))}
                className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
              <p className='text-sm text-gray-500 mt-1'>
                = <span className='font-bold text-[#1E3A5F]'>{(points * 5).toLocaleString('fr-FR')} FCFA</span> de bon
              </p>
            </div>
            <button onClick={convertir} disabled={loading || points < 100}
              className='w-full bg-[#FF6B35] hover:bg-orange-600 disabled:opacity-50
                         text-white font-bold py-2.5 rounded-lg transition-colors'>
              {loading ? '...' : 'Générer le bon d\'achat'}
            </button>
          </div>
        ) : (
          <div className='p-5'>
            <div className='border-2 border-dashed border-[#FF6B35] rounded-xl p-5 text-center'>
              <p className='text-xs text-gray-400'>Code du bon</p>
              <p className='text-xl font-bold tracking-wider text-[#1E3A5F]'>{bon.code}</p>
              <p className='text-3xl font-bold text-[#FF6B35] my-2'>
                {bon.valeur.toLocaleString('fr-FR')} FCFA
              </p>
              <p className='text-xs text-gray-500'>
                {bon.points_utilises} points utilisés — reste {bon.points_restants} pts
              </p>
            </div>
            <button onClick={imprimer}
              className='w-full mt-4 flex items-center justify-center gap-2 bg-[#1E3A5F]
                         hover:bg-blue-900 text-white font-bold py-2.5 rounded-xl transition-colors'>
              <Printer size={16} /> Imprimer le bon
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal Ajout / Modification ────────────────────────────────
function ClientModal({ client, onFermer, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const estModif = !!client;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: client ?? { statut: 'standard' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const res = estModif
      ? await modifierClient(client.id, data)
      : await creerClient(data);
    setLoading(false);
    if (res.success) {
      toast.success(estModif ? 'Client modifié !' : 'Client ajouté !');
      onSuccess();
    } else {
      toast.error(res.message || 'Une erreur est survenue');
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md'>
        <div className='flex items-center justify-between p-5 border-b'>
          <h2 className='text-lg font-bold text-gray-800'>
            {estModif ? 'Modifier le client' : 'Nouveau client'}
          </h2>
          <button onClick={onFermer} className='text-gray-400 hover:text-gray-600'>
            <X size={22} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className='p-5 space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Nom <span className='text-red-500'>*</span>
            </label>
            <input type='text' placeholder='Ex : Mariama Diallo'
              {...register('nom', { required: 'Nom requis' })}
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
            {errors.nom && <p className='text-red-500 text-xs mt-1'>{errors.nom.message}</p>}
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Téléphone <span className='text-red-500'>*</span>
            </label>
            <input type='tel' placeholder='Ex : 771234567'
              {...register('telephone', { required: 'Téléphone requis' })}
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800' />
            {errors.telephone && <p className='text-red-500 text-xs mt-1'>{errors.telephone.message}</p>}
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Statut fidélité</label>
            <select {...register('statut')}
              className='w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3] text-gray-800'>
              <option value='standard'>Standard (0%)</option>
              <option value='vip'>VIP (-5%)</option>
              <option value='or'>Or (-10%)</option>
            </select>
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
                : estModif ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page Clients ──────────────────────────────────────────────
export default function Clients() {
  const [clients, setClients]       = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche]   = useState('');
  const [modal, setModal]           = useState(null);  // 'ajout' | client
  const [modalQR, setModalQR]       = useState(null);  // client pour QR
  const [modalBon, setModalBon]     = useState(null);  // client pour conversion points

  const charger = async () => {
    setChargement(true);
    const res = await getClients();
    if (res.success) setClients(res.data);
    setChargement(false);
  };

  useEffect(() => { charger(); }, []);

  const filtres = clients.filter(c =>
    c.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    (c.telephone || '').includes(recherche)
  );

  if (chargement) return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]' />
    </div>
  );

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold text-gray-800'>Clients fidélité</h1>
        <button onClick={() => setModal('ajout')}
          className='flex items-center gap-2 bg-[#FF6B35] hover:bg-orange-600
                     text-white font-bold px-4 py-2.5 rounded-lg transition-colors'>
          <Plus size={18} /> Nouveau client
        </button>
      </div>

      <div className='relative mb-5 max-w-md'>
        <Search size={15} className='absolute left-3 top-3 text-gray-400' />
        <input type='text' placeholder='Rechercher (nom, téléphone)...'
          value={recherche} onChange={e => setRecherche(e.target.value)}
          className='w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-[#2196F3]' />
      </div>

      <div className='bg-white rounded-xl shadow overflow-hidden'>
        <table className='w-full'>
          <thead className='bg-[#1E3A5F] text-white text-sm'>
            <tr>
              {['Client', 'Téléphone', 'Statut', 'Points', 'Actions'].map(h => (
                <th key={h} className='px-4 py-3 text-left font-medium'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {filtres.map((c, i) => (
              <tr key={c.id}
                  className={`hover:bg-gray-50 transition-colors ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center
                                    justify-center text-white text-xs font-bold'>
                      {c.nom?.[0]?.toUpperCase()}
                    </div>
                    <span className='font-medium text-gray-800'>{c.nom}</span>
                  </div>
                </td>
                <td className='px-4 py-3 text-sm text-gray-600 font-mono'>{c.telephone}</td>
                <td className='px-4 py-3'><StatutBadge statut={c.statut} /></td>
                <td className='px-4 py-3 text-sm font-bold text-[#FF6B35]'>{c.points} pts</td>
                <td className='px-4 py-3'>
                  <div className='flex gap-1'>
                    <button onClick={() => setModalQR(c)}
                      className='p-1.5 text-[#1E3A5F] hover:bg-blue-50 rounded-lg transition-colors'
                      title='Voir le QR code'>
                      <QrCode size={15} />
                    </button>
                    <button onClick={() => setModal(c)}
                      className='p-1.5 text-[#2196F3] hover:bg-blue-50 rounded-lg transition-colors'
                      title='Modifier'>
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setModalBon(c)} disabled={c.points < 100}
                      className='p-1.5 text-[#FF6B35] hover:bg-orange-50 rounded-lg transition-colors
                                 disabled:opacity-30 disabled:cursor-not-allowed'
                      title={c.points < 100 ? 'Min. 100 points' : 'Convertir en bon d\'achat'}>
                      <Gift size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtres.length === 0 && (
          <div className='text-center py-12 text-gray-400'>Aucun client trouvé</div>
        )}
      </div>

      <p className='text-xs text-gray-400 mt-3 text-right'>
        {filtres.length} client{filtres.length > 1 ? 's' : ''}
      </p>

      {modal && (
        <ClientModal
          client={modal === 'ajout' ? null : modal}
          onFermer={() => setModal(null)}
          onSuccess={() => { setModal(null); charger(); }}
        />
      )}
      {modalQR && <QRModal client={modalQR} onFermer={() => setModalQR(null)} />}
      {modalBon && (
        <ConversionModal
          client={modalBon}
          onFermer={() => setModalBon(null)}
          onSuccess={charger}
        />
      )}
    </div>
  );
}
