// src/components/ui/QRScannerClient.jsx
// Scanner de QR code fidélité client (caméra) via html5-qrcode
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, QrCode, Loader } from 'lucide-react';

// Arrêt 100% sécurisé : html5-qrcode peut LANCER une erreur synchrone
// si le scanner n'est pas en cours → on enveloppe dans try/catch.
function arreterScanner(qr) {
  if (!qr) return;
  try {
    const etat = qr.getState ? qr.getState() : 0; // 2 = SCANNING, 3 = PAUSED
    if (etat === 2 || etat === 3) {
      const p = qr.stop();
      if (p && p.catch) p.catch(() => {});
    }
  } catch (_) {
    // erreur synchrone "scanner not running" → ignorée
  }
}

export default function QRScannerClient({ onScan, onFermer }) {
  const [statut, setStatut]   = useState('init'); // init | actif | erreur
  const [message, setMessage] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    let actif = true;
    const html5Qr = new Html5Qrcode('qr-reader-zone');
    scannerRef.current = html5Qr;

    html5Qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => {
        if (!actif) return;
        actif = false;
        arreterScanner(html5Qr);
        onScan(decodedText);
      },
      () => {} // erreurs par frame ignorées
    )
      .then(() => { if (actif) setStatut('actif'); })
      .catch((err) => {
        console.error('QR scanner error:', err);
        if (!actif) return;
        setStatut('erreur');
        setMessage(
          String(err).includes('NotAllowed')
            ? 'Accès caméra refusé. Autorise la caméra dans le navigateur.'
            : 'Impossible d\'accéder à la caméra.'
        );
      });

    return () => {
      actif = false;
      arreterScanner(scannerRef.current);
    };
  }, []);

  const fermer = () => {
    arreterScanner(scannerRef.current);
    onFermer();
  };

  return (
    <div className='fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b'>
          <div className='flex items-center gap-2'>
            <QrCode size={20} className='text-[#1E3A5F]' />
            <h2 className='font-bold text-gray-800'>Scanner la carte fidélité</h2>
          </div>
          <button onClick={fermer} className='text-gray-400 hover:text-gray-600'>
            <X size={22} />
          </button>
        </div>

        <div className='relative bg-black' style={{ aspectRatio: '1/1' }}>
          {statut === 'init' && (
            <div className='absolute inset-0 flex flex-col items-center justify-center text-white gap-3 z-10'>
              <Loader size={32} className='animate-spin text-[#FF6B35]' />
              <p className='text-sm'>Activation de la caméra...</p>
            </div>
          )}
          {statut === 'erreur' && (
            <div className='absolute inset-0 flex flex-col items-center justify-center text-white gap-3 p-6 z-10'>
              <QrCode size={40} className='text-red-400' />
              <p className='text-center text-sm text-red-300'>{message}</p>
            </div>
          )}
          <div id='qr-reader-zone' className='w-full h-full' />
        </div>

        <div className='p-4 text-center'>
          <p className='text-sm text-gray-500'>
            {statut === 'actif' ? 'Présente le QR code du client devant la caméra' : ''}
          </p>
          {statut === 'erreur' && (
            <button onClick={fermer} className='mt-2 bg-[#1E3A5F] text-white px-6 py-2 rounded-lg text-sm'>
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
