// src/components/ui/Logo.jsx
// Logo SunuStock — Wordmark pur (texte stylisé uniquement)
//
// Variantes :
//   variant="light"  → "Sunu" blanc + "Stock" orange  (Sidebar fond sombre)
//   variant="dark"   → "Sunu" bleu  + "Stock" orange  (Topbar / Login fond blanc)

export default function Logo({ size = 40, variant = 'light' }) {
  const isLight = variant === 'light';

  const sunuColor  = isLight ? '#FFFFFF' : '#1E3A5F';
  const stockColor = '#FF6B35';
  const fontSize   = `${size * 0.5}px`;

  return (
    <span style={{
      fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
      fontWeight: 800,
      fontSize,
      letterSpacing: '-0.03em',
      lineHeight: 1,
      userSelect: 'none',
    }}>
      <span style={{ color: sunuColor }}>Sunu</span>
      <span style={{ color: stockColor }}>Stock</span>
    </span>
  );
}
