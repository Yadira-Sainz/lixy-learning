'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Trophy, Flame, Star, Award, Zap, BookOpen } from 'lucide-react'
import { getDailyGoal } from '@/lib/config'
import { badgeCelebrationGifUrl } from '@/lib/badge-media'
import { Skeleton } from "@/components/ui/skeleton"
import { PlacementQuizModal } from '@/components/placement-quiz-modal'

const DifficultyChart = dynamic(
  () => import('./dashboard-charts').then((m) => m.DifficultyChart),
  { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center text-muted-foreground"><DashboardLoadingPlaceholder /></div> }
);

const ProgressChart = dynamic(
  () => import('./dashboard-charts').then((m) => m.ProgressChart),
  { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center text-muted-foreground"><DashboardLoadingPlaceholder /></div> }
);

function DashboardLoadingPlaceholder() {
  const { t } = useLocale();
  return <>{t('dashboard.loading')}</>;
}

type Badge = {
  badge_id: number;
  badge_key: string;
  name_es: string;
  description_es: string;
  required_streak: number;
  icon_name: string;
  earned_at: string;
};

type GamificationData = {
  points: number;
  readingsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  badges: Badge[];
};

const BADGE_ICONS: Record<string, React.ElementType> = {
  flame: Flame,
  star: Star,
  medal: Award,
  trophy: Trophy,
  crown: Trophy,
  gem: Zap,
};

export function DashboardComponent() {
  const { t, locale } = useLocale()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [streakDates, setStreakDates] = useState<string[]>([]);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [difficulty, setDifficulty] = useState<{ easy: number; medium: number; hard: number } | null>(null);
  const [upcomingReviews, setUpcomingReviews] = useState<{
    today: { count: number; percent: number };
    tomorrow: { count: number; percent: number };
    nextWeek: { count: number; percent: number };
  } | null>(null);
  const [progress, setProgress] = useState<{
    mon: number;
    tue: number;
    wed: number;
    thu: number;
    fri: number;
    sat: number;
    sun: number;
  } | null>(null);
  const [weakWords, setWeakWords] = useState<{ word: string; translation: string }[]>([]);
  const [dashboardVersion, setDashboardVersion] = useState(0);
  const [placementOpen, setPlacementOpen] = useState(false);

  const fetchStreakDates = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/streaks/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.map((d: string) => d);
  };

  const fetchGamification = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/gamification`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return response.json();
  };

  const fetchDifficulty = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dashboard/difficulty`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return response.json();
  };

  const fetchUpcomingReviews = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dashboard/upcoming-reviews`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return response.json();
  };

  const fetchProgress = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dashboard/progress`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return response.json();
  };

  const fetchWeakWords = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dashboard/weak-words`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) return [];
    return response.json();
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';
    (async () => {
      try {
        const statusRes = await fetch(`${base}/api/placement/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (statusRes.ok) {
          const statusJson = (await statusRes.json()) as { needsPlacement?: boolean };
          setPlacementOpen(!!statusJson.needsPlacement);
        }
      } catch {
        setPlacementOpen(false);
      }
    })();

    Promise.all([
      fetchStreakDates().catch(err => { console.error("Error fetching streaks:", err); return []; }),
      fetchGamification().catch(() => null),
      fetchDifficulty().catch(() => null),
      fetchUpcomingReviews().catch(() => null),
      fetchProgress().catch(() => null),
      fetchWeakWords().catch(() => []),
    ]).then(([streaks, gam, diff, upcoming, prog, weak]) => {
      setStreakDates(streaks);
      setGamification(gam);
      setDifficulty(diff);
      setUpcomingReviews(upcoming);
      setProgress(prog);
      setWeakWords(weak);
    }).finally(() => setIsLoading(false));
  }, [dashboardVersion]);

  const latestEarnedBadge = useMemo(() => {
    const list = gamification?.badges;
    if (!list?.length) return null;
    return [...list].sort((a, b) => {
      const ta = new Date(a.earned_at).getTime();
      const tb = new Date(b.earned_at).getTime();
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return tb - ta;
    })[0];
  }, [gamification?.badges]);

  return (
    <>
    <PlacementQuizModal
      open={placementOpen}
      onCompleted={() => {
        setPlacementOpen(false);
        setDashboardVersion((v) => v + 1);
      }}
    />
    {isLoading ? (
      <section id="tablero">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-[280px]" />
            <Skeleton className="h-[280px]" />
            <Skeleton className="h-[280px]" />
          </div>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {t('dashboard.loading')}
          </div>
        </div>
      </section>
    ) : (
    <section id="tablero">
      <div className="p-4">
      {/* Gamificación: puntos y medallas */}
      {gamification && (
        <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-3 md:items-stretch gap-4 mb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="h-full flex flex-col bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 cursor-help">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    {t('dashboard.gamification.points')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{gamification.points}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('dashboard.gamification.pointsDesc')}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>{t('dashboard.gamification.pointsHowTo')}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="h-full flex flex-col bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200/50 cursor-help">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-emerald-500" />
                    {t('dashboard.gamification.readingsCompleted')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{gamification.readingsCompleted ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('dashboard.gamification.readingsCompletedDesc')}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>{t('dashboard.gamification.readingsCompletedHowTo')}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="h-full flex flex-col bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200/50 cursor-help">
                <CardHeader className="flex flex-col space-y-1.5 pb-2 pl-6 pr-0 pt-6">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-violet-500" />
                    {t('dashboard.gamification.medals')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col px-6 pb-6 pl-6 pr-0 pt-0">
                  {gamification.badges.length === 0 ? (
                    <p className="pr-6 text-sm text-muted-foreground">{t('dashboard.gamification.medalsEmpty')}</p>
                  ) : (
                    <div
                      className={`flex min-h-0 flex-1 flex-col gap-3 sm:relative sm:gap-0 ${
                        latestEarnedBadge ? 'sm:min-h-[9.5rem]' : ''
                      }`}
                    >
                      <div
                        className={`medals-scroll flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-y-contain max-h-36 sm:max-h-[9.5rem] ${
                          latestEarnedBadge ? 'sm:pr-[11.25rem]' : ''
                        }`}
                      >
                        {gamification.badges.map((b) => {
                          const Icon = BADGE_ICONS[b.icon_name] || Trophy;
                          return (
                            <div
                              key={b.badge_id}
                              className="flex w-fit max-w-full shrink-0 items-center gap-1 rounded-full bg-white/60 px-2 py-1 dark:bg-black/20"
                              title={b.description_es}
                            >
                              <Icon className="h-4 w-4 shrink-0 text-violet-600" />
                              <span className="text-xs font-medium">{b.name_es}</span>
                            </div>
                          );
                        })}
                      </div>
                      {latestEarnedBadge && (
                        <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 self-center rounded-xl border border-violet-200/60 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm dark:bg-black/40 sm:absolute sm:right-4 sm:top-1/2 sm:w-[min(9.25rem,calc(100%-1.75rem))] sm:-translate-y-1/2 sm:px-4">
                          <span className="text-center text-[10px] font-medium uppercase leading-tight tracking-wide text-muted-foreground">
                            {t('dashboard.gamification.latestMedal')}
                          </span>
                          <img
                            key={`${latestEarnedBadge.badge_id}-${latestEarnedBadge.earned_at}`}
                            src={badgeCelebrationGifUrl(latestEarnedBadge.badge_key)}
                            alt={latestEarnedBadge.name_es}
                            className="h-[5rem] w-[5rem] object-contain sm:h-[5.25rem] sm:w-[5.25rem]"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                          <span className="max-w-[10rem] text-center text-xs font-medium leading-snug text-foreground">
                            {latestEarnedBadge.name_es}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
          </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>{t('dashboard.gamification.medalsHowTo')}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        </TooltipProvider>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="col-span-1 md:col-span-2 lg:col-span-1 h-full">
          <CardHeader className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <CardTitle className="col-start-1">{t('dashboard.dailyStreak')}</CardTitle>
            <span className="col-start-2 text-2xl font-semibold text-green-600 text-center">
              {streakDates.length}
            </span>
            {(() => {
              const goal = getDailyGoal()
              const current = streakDates.length
              const reached = goal > 0 && current >= goal
              return reached ? (
                <div className="col-start-3 flex justify-end">
                  <div className="trophy-goal-badge relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-700 ring-2 ring-amber-500/60 ring-offset-2 ring-offset-background animate-in fade-in zoom-in-95 duration-500 p-2.5">
                    <img src="/trophy-goal.svg" alt="" className="h-9 w-9 object-contain drop-shadow-md" aria-hidden />
                  </div>
                </div>
              ) : null
            })()}
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const goal = getDailyGoal()
              const current = streakDates.length
              const reached = current >= goal
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.streakProgress')}</span>
                    <span className={reached ? 'font-semibold text-green-600' : ''}>
                      {current} / {goal}
                    </span>
                  </div>
                  <Progress value={Math.min(100, goal > 0 ? (current / goal) * 100 : 0)} className="h-2" />
                  {reached && goal > 0 && (
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      {t('dashboard.streakGoalReached')}
                    </p>
                  )}
                </div>
              )
            })()}
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              streakDates={streakDates}
              localeCode={locale}
              className="rounded-md border w-full"
              modifiersClassNames={{
                streak:
                  'streak-day !bg-green-500 !text-white rounded-full dark:!bg-green-500 dark:!text-white',
              }}
            />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>{t('dashboard.difficulty')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <DifficultyChart data={difficulty ?? undefined} />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>{t('dashboard.upcomingReviews')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="min-w-[7rem]">{t('dashboard.today')}</span>
                  <Progress
                    value={upcomingReviews?.today.percent ?? 0}
                    className="flex-1"
                  />
                  {upcomingReviews && (
                    <span className="text-sm text-muted-foreground w-6 text-right">
                      {upcomingReviews.today.count}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="min-w-[7rem]">{t('dashboard.tomorrow')}</span>
                  <Progress
                    value={upcomingReviews?.tomorrow.percent ?? 0}
                    className="flex-1"
                  />
                  {upcomingReviews && (
                    <span className="text-sm text-muted-foreground w-6 text-right">
                      {upcomingReviews.tomorrow.count}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="min-w-[7rem]">{t('dashboard.nextWeek')}</span>
                  <Progress
                    value={upcomingReviews?.nextWeek.percent ?? 0}
                    className="flex-1"
                  />
                  {upcomingReviews && (
                    <span className="text-sm text-muted-foreground w-6 text-right">
                      {upcomingReviews.nextWeek.count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 h-full">
          <CardHeader>
            <CardTitle>{t('dashboard.progress')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ProgressChart data={progress ?? undefined} />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>{t('dashboard.recommended')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">{t('dashboard.practiceWeak')}</h3>
              {weakWords.length > 0 ? (
                <>
                  <div className="bg-white dark:bg-card p-4 rounded-md shadow border">
                    <p className="text-xl font-bold mb-2">{weakWords[currentWordIndex].word}</p>
                    <p className="text-muted-foreground">{weakWords[currentWordIndex].translation}</p>
                  </div>
                  <Button
                    onClick={() => setCurrentWordIndex((prev) => (prev + 1) % weakWords.length)}
                    className="w-full"
                  >
                    {t('dashboard.nextWord')}
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground py-4">{t('dashboard.recommendedEmpty')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </section>
    )}
    </>
  )
}

export default DashboardComponent;
