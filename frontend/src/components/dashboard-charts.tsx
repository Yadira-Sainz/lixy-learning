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

type ProgressChartProps = {
  data?: { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number };
};

export function ProgressChart({ data }: ProgressChartProps) {
  const { t } = useLocale();
  const progressData = [
    { name: t('dashboard.progressMon'), value: data?.mon ?? 0 },
    { name: t('dashboard.progressTue'), value: data?.tue ?? 0 },
    { name: t('dashboard.progressWed'), value: data?.wed ?? 0 },
    { name: t('dashboard.progressThu'), value: data?.thu ?? 0 },
    { name: t('dashboard.progressFri'), value: data?.fri ?? 0 },
    { name: t('dashboard.progressSat'), value: data?.sat ?? 0 },
    { name: t('dashboard.progressSun'), value: data?.sun ?? 0 },
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
