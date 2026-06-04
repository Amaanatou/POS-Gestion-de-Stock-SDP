// src/components/ui/StockBadge.jsx
// Badge coloré qui indique le statut du stock d'un produit

export default function StockBadge({ statut }) {
  const config = {
    normal:   { label: 'Normal',   classes: 'bg-green-100 text-green-800' },
    critique: { label: 'Critique', classes: 'bg-orange-100 text-orange-800' },
    rupture:  { label: 'Rupture',  classes: 'bg-red-100 text-red-800' },
  };
  const { label, classes } = config[statut] ?? config.normal;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}
