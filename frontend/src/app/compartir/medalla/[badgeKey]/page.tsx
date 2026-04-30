import type { Metadata } from 'next';
import Link from 'next/link';
import { badgeCelebrationGifUrl } from '@/lib/badge-media';
import { badgeShareMeta } from '@/lib/badge-share-meta';

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

export default function CompartirMedallaPage({ params }: Props) {
  const badgeKey = decodeURIComponent(params.badgeKey);
  const meta = badgeShareMeta(badgeKey);
  const imageUrl = badgeCelebrationGifUrl(badgeKey);

  return (
    <div className="w-full">
      <section id="medalla" className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-4 py-12 text-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{meta.title}</h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">{meta.description}</p>
        </div>
        <div className="mx-auto w-fit rounded-2xl border border-violet-200/60 bg-gradient-to-b from-violet-50 to-white px-3.5 py-3 shadow-md dark:border-violet-900/40 dark:from-violet-950/30 dark:to-black sm:px-4 sm:py-3.5">
          <img
            src={imageUrl}
            alt={meta.title}
            className="mx-auto h-[13.25rem] w-[13.25rem] object-contain drop-shadow-sm sm:h-[14.75rem] sm:w-[14.75rem]"
            width={224}
            height={224}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Esta es una vista pública para compartir tu logro. Para ver tu progreso completo, primero inicia sesión.
        </p>
        <div className="flex w-full max-w-2xl flex-col items-center gap-4">
          <div className="flex w-full justify-center">
            <Link
              href="/auth?tab=signup"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Crear cuenta
            </Link>
          </div>
          <div className="w-full pt-1">
            <h2 className="text-center text-3xl font-bold tracking-tight">Aprende con LixyLearning</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
              Practica todos los días con flashcards, lecturas y seguimiento de progreso para convertir el estudio en un hábito.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
