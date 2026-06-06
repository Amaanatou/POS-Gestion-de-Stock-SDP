// src/components/ui/BarcodeScanner.jsx
// Scanner code-barres en MODE CONTINU (comme une caisse de supermarché)
// — La caméra reste ouverte, bip à chaque scan, ajout automatique au panier

import { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';
import { X, Camera, Loader, CheckCircle2 } from 'lucide-react';

export default function BarcodeScanner({ onDetecte, onFermer }) {
  const [statut, setStatut]       = useState('init');   // init | actif | erreur
  const [message, setMessage]     = useState('');
  const [dernierCode, setDernierCode] = useState('');
  const [nbScans, setNbScans]     = useState(0);
  const [flash, setFlash]         = useState(false);    // éclair vert visuel

  // Mémorise le dernier code + l'heure pour éviter les doublons rapprochés
  const dernierScanRef = useRef({ code: '', temps: 0 });
  const compteurRef    = useRef({});

  // ── Bip sonore (généré, pas besoin de fichier audio) ──────────
  const jouerBip = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.value = 1800;            // fréquence aiguë type caisse
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (_) { /* audio non dispo, on ignore */ }
  };

  useEffect(() => {
    let actif = true;

    Quagga.init(
      {
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: '#scanner-zone',
          constraints: {
            width:  { min: 640, ideal: 1280 },   // + de résolution = + précis
            height: { min: 480, ideal: 720 },
            facingMode: 'environment',
          },
        },
        locator: {
          patchSize: 'large',     // zone d'analyse plus grande = lecture plus facile
          halfSample: true,
        },
        numOfWorkers: navigator.hardwareConcurrency || 4,
        frequency: 15,            // analyse 15×/seconde (plus réactif)
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'upc_reader',
            'code_128_reader',
            'code_39_reader',
          ],
        },
        locate: true,
      },
      (err) => {
        if (!actif) return;
        if (err) {
          console.error('Quagga init error:', err);
          setStatut('erreur');
          setMessage(
            err.name === 'NotAllowedError'
              ? 'Accès à la caméra refusé. Autorise la caméra dans ton navigateur.'
              : 'Impossible d\'accéder à la caméra. Vérifie qu\'elle est bien connectée.'
          );
          return;
        }
        Quagga.start();
        setStatut('actif');
      }
    );

    // ── Détection ─────────────────────────────────────────────
    Quagga.onDetected((result) => {
      if (!actif) return;
      const code = result?.codeResult?.code;
      if (!code || code.length < 8) return;

      // CONTRÔLE DE FIABILITÉ : rejette les lectures incertaines
      // Quagga donne un taux d'erreur par segment du code-barres.
      // Si l'erreur moyenne est trop élevée, c'est un faux positif → on ignore.
      const codes = result?.codeResult?.decodedCodes || [];
      const erreurs = codes.filter(c => c.error !== undefined).map(c => c.error);
      if (erreurs.length) {
        const erreurMoyenne = erreurs.reduce((a, b) => a + b, 0) / erreurs.length;
        const erreurMax     = Math.max(...erreurs);
        // Seuils stricts : moyenne < 0,12 et aucun segment au-dessus de 0,25
        if (erreurMoyenne > 0.12 || erreurMax > 0.25) return;
      }

      // Validation : même code vu 3 fois de suite (anti faux positif)
      compteurRef.current[code] = (compteurRef.current[code] || 0) + 1;
      if (compteurRef.current[code] < 3) return;
      compteurRef.current[code] = 0;

      // Anti-doublon : ignore le MÊME code si scanné il y a moins de 1,5 s
      const maintenant = Date.now();
      const { code: codePrec, temps } = dernierScanRef.current;
      if (code === codePrec && maintenant - temps < 1500) return;
      dernierScanRef.current = { code, temps: maintenant };

      // ✅ Scan validé : bip + éclair + ajout panier (la caméra reste ouverte !)
      jouerBip();
      setDernierCode(code);
      setNbScans(n => n + 1);
      setFlash(true);
      setTimeout(() => setFlash(false), 200);

      onDetecte(code);   // ← ajoute au panier mais NE FERME PAS le scanner
    });

    // ── Cadre visuel de détection ─────────────────────────────
    Quagga.onProcessed((result) => {
      const ctx    = Quagga.canvas?.ctx?.overlay;
      const canvas = Quagga.canvas?.dom?.overlay;
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (result?.box) {
        Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, ctx, {
          color: '#22c55e', lineWidth: 3,
        });
      }
    });

    return () => {
      actif = false;
      try { Quagga.stop(); } catch (_) {}
    };
  }, []);

  const fermer = () => { try { Quagga.stop(); } catch (_) {} onFermer(); };

  return (
    <div className='fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden'>

        {/* En-tête */}
        <div className='flex items-center justify-between p-4 border-b'>
          <div className='flex items-center gap-2'>
            <Camera size={20} className='text-[#1E3A5F]' />
            <h2 className='font-bold text-gray-800'>Scan continu</h2>
            {nbScans > 0 && (
              <span className='bg-green-500 text-white text-xs font-bold
                               px-2 py-0.5 rounded-full'>
                {nbScans} scanné{nbScans > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button onClick={fermer}
            className='text-gray-400 hover:text-gray-600 transition-colors'>
            <X size={22} />
          </button>
        </div>

        {/* Zone caméra */}
        <div className='relative bg-black' style={{ aspectRatio: '4/3' }}>
          {statut === 'init' && (
            <div className='absolute inset-0 flex flex-col items-center justify-center
                            text-white gap-3'>
              <Loader size={32} className='animate-spin text-[#FF6B35]' />
              <p className='text-sm'>Activation de la caméra...</p>
            </div>
          )}

          {statut === 'erreur' && (
            <div className='absolute inset-0 flex flex-col items-center justify-center
                            text-white gap-3 p-6'>
              <Camera size={40} className='text-red-400' />
              <p className='text-center text-sm text-red-300'>{message}</p>
            </div>
          )}

          <div id='scanner-zone' className='w-full h-full' />

          {/* Éclair vert au scan */}
          {flash && (
            <div className='absolute inset-0 bg-green-400/40 flex items-center justify-center'>
              <CheckCircle2 size={80} className='text-white drop-shadow-lg' />
            </div>
          )}

          {/* Viseur central */}
          {statut === 'actif' && (
            <div className='absolute inset-0 flex items-center justify-center
                            pointer-events-none'>
              <div className='w-64 h-40 border-2 border-[#FF6B35] rounded-lg
                              shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]'>
                <div className='absolute top-0 left-0 w-5 h-5
                                border-t-4 border-l-4 border-[#FF6B35] rounded-tl-lg' />
                <div className='absolute top-0 right-0 w-5 h-5
                                border-t-4 border-r-4 border-[#FF6B35] rounded-tr-lg' />
                <div className='absolute bottom-0 left-0 w-5 h-5
                                border-b-4 border-l-4 border-[#FF6B35] rounded-bl-lg' />
                <div className='absolute bottom-0 right-0 w-5 h-5
                                border-b-4 border-r-4 border-[#FF6B35] rounded-br-lg' />
                <div className='absolute left-0 right-0 h-0.5 bg-[#FF6B35]/70
                                animate-[scan_2s_ease-in-out_infinite]'
                     style={{ top: '50%' }} />
              </div>
            </div>
          )}

          {/* Dernier code scanné */}
          {dernierCode && (
            <div className='absolute bottom-3 left-0 right-0 flex justify-center'>
              <div className='bg-green-500 text-white px-4 py-1.5 rounded-full
                              font-mono font-bold text-xs'>
                ✓ {dernierCode}
              </div>
            </div>
          )}
        </div>

        {/* Bas : instructions + bouton Terminer */}
        <div className='p-4'>
          <p className='text-sm text-gray-500 text-center mb-3'>
            {statut === 'actif'
              ? 'Présente les produits un par un devant la caméra'
              : statut === 'erreur'
              ? '' : 'Préparation...'}
          </p>
          <button
            onClick={fermer}
            className='w-full bg-[#1E3A5F] hover:bg-blue-900 text-white
                       font-bold py-3 rounded-xl transition-colors'
          >
            Terminer le scan
          </button>
        </div>
      </div>
    </div>
  );
}
