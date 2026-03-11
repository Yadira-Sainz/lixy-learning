'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

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

export function DashboardComponent() {
  const { t } = useLocale()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [currentWord, setCurrentWord] = useState(0)
  const [streakDates, setStreakDates] = useState<string[]>([]); // Cambiado a string[]

  const fetchStreakDates = async () => {
    const token = localStorage.getItem('token'); // Obtener el token almacenado
  
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/streaks/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`, // Incluir el token en el encabezado
      },
    });
  
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  
    const streakDates = await response.json();
    return streakDates.map((dateStr: string) => dateStr); // Mantener como string
  };

  useEffect(() => {   
    fetchStreakDates()
      .then(data => {
        setStreakDates(data); // Guardar las fechas de racha como strings
      })
      .catch(err => console.error("Error fetching streaks:", err));
  }, []);
  
  return (
    <section id="tablero">
      <div className="p-4">
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
