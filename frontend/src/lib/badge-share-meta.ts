/** Textos para la página de compartir medalla (cortos) y descripción larga solo para Open Graph (LinkedIn ≥ ~100 caracteres). */
export type BadgeShareMeta = {
  title: string;
  description: string;
  ogDescription: string;
};

const OG_PAD =
  ' Practica con flashcards y lecturas en LixyLearning; crea cuenta gratis, comparte tu logro y sigue sumando racha con seguimiento de progreso.';

function ogDescriptionFrom(short: string): string {
  const s = short.trim();
  const combined = `${s}${OG_PAD}`;
  return combined.length >= 100 ? combined : `${combined} Aprende idiomas con constancia.`;
}

export function badgeShareMeta(badgeKey: string): BadgeShareMeta {
  const map: Record<string, { title: string; description: string }> = {
    streak_3: {
      title: 'Primeros pasos — LixyLearning',
      description: 'Medalla por 3 días consecutivos de práctica en LixyLearning.',
    },
    streak_7: {
      title: 'Semana constante — LixyLearning',
      description: 'Medalla por 7 días consecutivos de práctica en LixyLearning.',
    },
    streak_14: {
      title: 'Dos semanas — LixyLearning',
      description: 'Medalla por 14 días consecutivos de práctica en LixyLearning.',
    },
    streak_30: {
      title: 'Mes dedicado — LixyLearning',
      description: 'Medalla por 30 días consecutivos de práctica en LixyLearning.',
    },
    streak_60: {
      title: 'Dos meses — LixyLearning',
      description: 'Medalla por 60 días consecutivos de práctica en LixyLearning.',
    },
    streak_100: {
      title: 'Centenario — LixyLearning',
      description: 'Medalla por 100 días consecutivos de práctica en LixyLearning.',
    },
  };

  const row =
    map[badgeKey] ?? {
      title: 'Medalla — LixyLearning',
      description: 'Un logro conseguido en LixyLearning.',
    };

  return {
    title: row.title,
    description: row.description,
    ogDescription: ogDescriptionFrom(row.description),
  };
}
