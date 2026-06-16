// src/components/ui/Logo.jsx
// Logo SunuStock — lockup « tuile-icône (cube = stock) + wordmark stylisé ».
//
// Props :
//   size      → hauteur de référence en px (le reste est calculé proportionnellement)
//   variant   → "light" : fond sombre (Sidebar)   → tuile orange, "Sunu" blanc
//               "dark"  : fond clair (Login/Topbar) → tuile bleu marine, "Sunu" bleu
//   showMark  → afficher/masquer la tuile-icône (true par défaut)

export default function Logo({ size = 40, variant = 'light', showMark = true }) {
  const isLight = variant === 'light';

  const sunuColor  = isLight ? '#FFFFFF' : '#1E3A5F';
  const stockColor = '#FF6B35';
  const tileBg     = isLight ? '#FF6B35' : '#1E3A5F'; // la tuile contraste avec le fond
  const fontSize   = `${size * 0.5}px`;

  const tile = Math.round(size);        // tuile carrée
  const mark = Math.round(size * 0.6);  // icône à l'intérieur

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: `${size * 0.24}px`,
      userSelect: 'none',
      lineHeight: 1,
    }}>
      {showMark && (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: tile,
          height: tile,
          background: tileBg,
          borderRadius: `${size * 0.26}px`,
          boxShadow: '0 2px 6px rgba(30,58,95,0.25)',
          flexShrink: 0,
        }}>
          {/* Cube / colis = gestion de stock */}
          <svg width={mark} height={mark} viewBox="0 0 24 24" fill="none"
               stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <path d="M3.27 6.96 12 12.01l8.73-5.05" />
            <path d="M12 22.08V12" />
          </svg>
        </span>
      )}

      <span style={{
        fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
        fontWeight: 800,
        fontSize,
        letterSpacing: '-0.03em',
        lineHeight: 1,
      }}>
        <span style={{ color: sunuColor }}>Sunu</span>
        <span style={{ color: stockColor }}>Stock</span>
      </span>
    </span>
  );
}
