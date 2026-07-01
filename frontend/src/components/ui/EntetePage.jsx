// src/components/ui/EntetePage.jsx
// En-tête de page réutilisable et « parlant » : pastille d'icône colorée,
// titre, courte description du rôle de la page, badge optionnel et zone
// d'actions à droite. Objectif : comprendre chaque page d'un seul coup d'œil.

const TEINTES = {
  navy:   'bg-slate-100 text-[#1E3A5F]',
  orange: 'bg-orange-50 text-[#FF6B35]',
  blue:   'bg-blue-50 text-[#2196F3]',
  green:  'bg-green-50 text-green-600',
  red:    'bg-red-50 text-red-600',
};

export default function EntetePage({
  icone: Icone,
  titre,
  description,
  accent = 'navy',
  badge = null,
  actions = null,
}) {
  return (
    <div className='flex items-start justify-between gap-4 mb-6'>
      <div className='flex items-center gap-3 min-w-0'>
        {Icone && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                           ${TEINTES[accent] || TEINTES.navy}`}>
            <Icone size={22} />
          </div>
        )}
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <h1 className='text-2xl font-bold text-gray-800 truncate'>{titre}</h1>
            {badge != null && badge !== 0 && (
              <span className='bg-red-500 text-white text-xs font-bold px-2 py-0.5
                               rounded-full flex-shrink-0'>
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className='text-sm text-gray-400 mt-0.5'>{description}</p>
          )}
        </div>
      </div>
      {actions && <div className='flex-shrink-0'>{actions}</div>}
    </div>
  );
}
