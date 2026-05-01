import type { Metadata } from 'next';

import { badgeShareMeta } from '@/lib/badge-share-meta';

import { CompartirMedallaView } from '../compartir-medalla-view';

const BADGE_KEY = 'streak_3';

export async function generateMetadata(): Promise<Metadata> {
  const meta = badgeShareMeta(BADGE_KEY);

  const base =
    process.env.NEXT_PUBLIC_FRONTEND_URL?.replace(/\/$/, '') ||
    process.env.VERCEL_URL?.replace(/\/$/, '') ||
    '';

  const path = `/compartir/medalla/${BADGE_KEY}`;
  const canonical = base ? (base.startsWith('http') ? `${base}${path}` : `https://${base}${path}`) : undefined;

  return {
    title: meta.title,
    description: meta.ogDescription,
    openGraph: {
      title: meta.title,
      description: meta.ogDescription,
      url: canonical,
      siteName: 'LixyLearning',
      locale: 'es_ES',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.ogDescription,
    },
  };
}

export default function CompartirMedallaStreak3Page() {
  return <CompartirMedallaView badgeKey={BADGE_KEY} />;
}
