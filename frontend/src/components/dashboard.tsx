'use client';

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AlignLeft } from 'lucide-react';

const difficultyData = [
  { name: 'Fácil', value: 30 },
  { name: 'Medio', value: 45 },
  { name: 'Difícil', value: 25 },
]

const progressData = [
  { name: 'Lun', value: 20 },
  { name: 'Mar', value: 35 },
  { name: 'Mié', value: 15 },
  { name: 'Jue', value: 40 },
  { name: 'Vie', value: 30 },
  { name: 'Sáb', value: 25 },
  { name: 'Dom', value: 45 },
]

const weakWords = [
  { word: 'Abrumador', translation: 'Overwhelming' },
  { word: 'Efímero', translation: 'Ephemeral' },
  { word: 'Paradigma', translation: 'Paradigm' },
]

export function DashboardComponent() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [currentWord, setCurrentWord] = useState(0)
  const [streakDates, setStreakDates] = useState<string[]>([]); // Cambiado a string[]

  const fetchStreakDates = async (userId: number) => {
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
    const userId = 1; // Reemplazar con el ID de usuario real o dinámico
    
    fetchStreakDates(userId)
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
            <CardTitle>Racha Diaria   <span className='dias'>{streakDates.length}</span> </CardTitle>
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
            <CardTitle>Dificultad</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={difficultyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Próximas revisiones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Hoy</span>
                  <Progress value={80} className="w-2/3" />
                </div>
                <div className="flex justify-between items-center">
                  <span>Mañana</span>
                  <Progress value={50} className="w-2/3" />
                </div>
                <div className="flex justify-between items-center">
                  <span>Próxima semana</span>
                  <Progress value={30} className="w-2/3" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 h-full">
          <CardHeader>
            <CardTitle>Progreso</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Recomendado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Practica tus palabras más débiles</h3>
              <div className="bg-white p-4 rounded-md shadow">
                <p className="text-xl font-bold mb-2">{weakWords[currentWord].word}</p>
                <p className="text-gray-600">{weakWords[currentWord].translation}</p>
              </div>
              <Button 
                onClick={() => setCurrentWord((prev) => (prev + 1) % weakWords.length)}
                className="w-full"
              >
                Siguiente palabra
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
