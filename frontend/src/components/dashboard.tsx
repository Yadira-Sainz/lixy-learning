'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Trophy, Flame, Star, Award, Zap } from 'lucide-react'

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

const weakWords = [
  { word: 'Abrumador', translation: 'Overwhelming' },
  { word: 'Efímero', translation: 'Ephemeral' },
  { word: 'Paradigma', translation: 'Paradigm' },
]

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
  wordsLearned: number;
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
  const { t } = useLocale()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [currentWord, setCurrentWord] = useState(0)
  const [streakDates, setStreakDates] = useState<string[]>([]);
  const [gamification, setGamification] = useState<GamificationData | null>(null);

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetchStreakDates()
      .then(setStreakDates)
      .catch(err => console.error("Error fetching streaks:", err));
    fetchGamification()
      .then(setGamification)
      .catch(err => console.error("Error fetching gamification:", err));
  }, []);
  
  return (
    <section id="tablero">
      <div className="p-4">
      {/* Gamificación: puntos y medallas */}
      {gamification && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                {t('dashboard.gamification.points')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{gamification.points}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('dashboard.gamification.pointsDesc')}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-5 w-5 text-emerald-500" />
                {t('dashboard.gamification.wordsLearned')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{gamification.wordsLearned}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('dashboard.gamification.wordsLearnedDesc')}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-5 w-5 text-violet-500" />
                {t('dashboard.gamification.medals')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 items-center">
                {gamification.badges.length > 0 ? (
                  gamification.badges.map((b) => {
                    const Icon = BADGE_ICONS[b.icon_name] || Trophy;
                    return (
                      <div
                        key={b.badge_id}
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/60 dark:bg-black/20"
                        title={b.description_es}
                      >
                        <Icon className="h-4 w-4 text-violet-600" />
                        <span className="text-xs font-medium">{b.name_es}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">{t('dashboard.gamification.medalsEmpty')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="col-span-1 md:col-span-2 lg:col-span-1 h-full">
          <CardHeader>
            <CardTitle>{t('dashboard.dailyStreak')}   <span className='dias'>{streakDates.length}</span> </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              streakDates={streakDates} // Ahora son strings
              className="rounded-md border w-full"
              modifiersClassNames={{
                streak: 'bg-green-500 text-white rounded-full', // Cambia 'streakDay' a 'streak'
              }}
            />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>{t('dashboard.difficulty')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <DifficultyChart />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>{t('dashboard.upcomingReviews')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>{t('dashboard.today')}</span>
                  <Progress value={80} className="w-2/3" />
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('dashboard.tomorrow')}</span>
                  <Progress value={50} className="w-2/3" />
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('dashboard.nextWeek')}</span>
                  <Progress value={30} className="w-2/3" />
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
            <ProgressChart />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>{t('dashboard.recommended')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">{t('dashboard.practiceWeak')}</h3>
              <div className="bg-white p-4 rounded-md shadow">
                <p className="text-xl font-bold mb-2">{weakWords[currentWord].word}</p>
                <p className="text-gray-600">{weakWords[currentWord].translation}</p>
              </div>
              <Button 
                onClick={() => setCurrentWord((prev) => (prev + 1) % weakWords.length)}
                className="w-full"
              >
                {t('dashboard.nextWord')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </section>
  )
}

export default DashboardComponent;
