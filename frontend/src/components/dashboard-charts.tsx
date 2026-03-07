'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const difficultyData = [
  { name: 'Fácil', value: 30 },
  { name: 'Medio', value: 45 },
  { name: 'Difícil', value: 25 },
];

const progressData = [
  { name: 'Lun', value: 20 },
  { name: 'Mar', value: 35 },
  { name: 'Mié', value: 15 },
  { name: 'Jue', value: 40 },
  { name: 'Vie', value: 30 },
  { name: 'Sáb', value: 25 },
  { name: 'Dom', value: 45 },
];

export function DifficultyChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={difficultyData}>
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
