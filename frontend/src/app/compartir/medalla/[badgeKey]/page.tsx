import type { Metadata } from 'next';

import { badgeCelebrationGifUrl } from '@/lib/badge-media';
import { badgeShareMeta } from '@/lib/badge-share-meta';

import { CompartirMedallaView } from '../compartir-medalla-view';

type Props = { params: { badgeKey: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const raw = decodeURIComponent(params.badgeKey);
  const meta = badgeShareMeta(raw);

  const base =
    process.env.NEXT_PUBLIC_FRONTEND_URL?.replace(/\/$/, '') ||
    process.env.VERCEL_URL?.replace(/\/$/, '') ||
    '';

  const path = `/compartir/medalla/${encodeURIComponent(raw)}`;
  const canonical = base ? (base.startsWith('http') ? `${base}${path}` : `https://${base}${path}`) : undefined;

  const mediaSrc = badgeCelebrationGifUrl(raw);
  const ogImageUrl =
    canonical && mediaSrc
      ? mediaSrc.startsWith('http')
        ? mediaSrc
        : new URL(mediaSrc, canonical).href
      : undefined;

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
      ...(ogImageUrl
        ? {
            images: [
              {
                url: ogImageUrl,
                width: 512,
                height: 512,
                type: 'image/gif',
                alt: meta.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.ogDescription,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

export default function CompartirMedallaPage({ params }: Props) {
  const badgeKey = decodeURIComponent(params.badgeKey);
  return <CompartirMedallaView badgeKey={badgeKey} />;
}
