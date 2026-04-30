import { ImageResponse } from 'next/og';

import { badgeCelebrationGifUrl } from '@/lib/badge-media';

export const alt = 'Medalla LixyLearning';

export const size = { width: 1200, height: 630 };

export const contentType = 'image/png';

export default async function Image({ params }: { params: { badgeKey: string } }) {
  const raw = decodeURIComponent(params.badgeKey);
  const src = badgeCelebrationGifUrl(raw);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
        }}
      >
        <img src={src} alt="" width={560} height={560} style={{ objectFit: 'contain' }} />
      </div>
    ),
    { ...size },
  );
}
