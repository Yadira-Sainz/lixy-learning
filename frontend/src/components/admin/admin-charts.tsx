'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export type DayCount = { day: string; count: number };

type AdminTimeseriesChartsProps = {
  signupsByDay: DayCount[];
  readingsByDay: DayCount[];
  signupsLabel: string;
  readingsLabel: string;
};

export function AdminTimeseriesCharts({
  signupsByDay,
  readingsByDay,
  signupsLabel,
  readingsLabel,
}: AdminTimeseriesChartsProps) {
  const byDay = new Map<string, { signups: number; readings: number }>();
  for (const s of signupsByDay) {
    byDay.set(s.day, { signups: s.count, readings: 0 });
  }
  for (const r of readingsByDay) {
    const ex = byDay.get(r.day) ?? { signups: 0, readings: 0 };
    ex.readings = r.count;
    byDay.set(r.day, ex);
  }
  const merged = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day: day.slice(5), signups: v.signups, readings: v.readings }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="h-[280px] w-full min-w-0">
        <p className="text-sm font-medium mb-2">{signupsLabel}</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={merged} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="signups" name={signupsLabel} fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-[280px] w-full min-w-0">
        <p className="text-sm font-medium mb-2">{readingsLabel}</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={merged} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="readings" name={readingsLabel} fill="#14b8a6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type FamiliarityBarProps = {
  data: { familiarity_name: string; count: number }[];
  title: string;
};

export function AdminFamiliarityBar({ data, title }: FamiliarityBarProps) {
  const chartData = data.map((row) => ({ name: row.familiarity_name, value: row.count }));
  return (
    <div className="h-[280px] w-full min-w-0">
      <p className="text-sm font-medium mb-2">{title}</p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type BadgesBarProps = {
  data: { badge_key: string; name_es: string; earned_count: number }[];
  title: string;
  nameLabel: string;
  countLabel: string;
};

export function AdminBadgesBar({ data, title, nameLabel, countLabel }: BadgesBarProps) {
  const chartData = data.map((row) => ({
    name: row.name_es || row.badge_key,
    earned: row.earned_count,
  }));
  return (
    <div className="h-[300px] w-full min-w-0">
      <p className="text-sm font-medium mb-2">{title}</p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => [v, countLabel]} labelFormatter={() => nameLabel} />
          <Legend />
          <Bar dataKey="earned" name={countLabel} fill="#f59e0b" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
