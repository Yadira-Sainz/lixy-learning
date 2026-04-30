/** Textos para enlaces compartidos (Open Graph); alineados con las medallas de racha. */
export function badgeShareMeta(badgeKey: string): { title: string; description: string } {
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
  return (
    map[badgeKey] ?? {
      title: 'Medalla — LixyLearning',
      description: 'Un logro conseguido en LixyLearning.',
    }
  );
}
