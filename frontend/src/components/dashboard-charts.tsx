'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLocale } from '@/contexts/locale-context';


type DifficultyChartProps = {
  data?: { easy: number; medium: number; hard: number };
};

export function DifficultyChart({ data }: DifficultyChartProps) {
  const { t } = useLocale();
  const chartData = [
    { name: t('dashboard.difficultyEasy'), value: data?.easy ?? 0 },
    { name: t('dashboard.difficultyMedium'), value: data?.medium ?? 0 },
    { name: t('dashboard.difficultyHard'), value: data?.hard ?? 0 },
  ];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProgressChart() {
  const { t } = useLocale();
  const progressData = [
    { name: t('dashboard.progressMon'), value: 20 },
    { name: t('dashboard.progressTue'), value: 35 },
    { name: t('dashboard.progressWed'), value: 15 },
    { name: t('dashboard.progressThu'), value: 40 },
    { name: t('dashboard.progressFri'), value: 30 },
    { name: t('dashboard.progressSat'), value: 25 },
    { name: t('dashboard.progressSun'), value: 45 },
  ];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={progressData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>
  );
}
