'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/locale-context';
import { useAdminAccess } from '@/hooks/use-admin-access';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Activity, BookOpen, ShieldAlert, RefreshCw, ArrowLeft, Clock, MousePointerClick } from 'lucide-react';
import Link from 'next/link';
import type { DayCount } from './admin-charts';

const AdminTimeseriesCharts = dynamic(
  () => import('./admin-charts').then((m) => m.AdminTimeseriesCharts),
  { ssr: false, loading: () => <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">…</div> },
);
const AdminFamiliarityBar = dynamic(
  () => import('./admin-charts').then((m) => m.AdminFamiliarityBar),
  { ssr: false, loading: () => <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">…</div> },
);
const AdminBadgesBar = dynamic(
  () => import('./admin-charts').then((m) => m.AdminBadgesBar),
  { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">…</div> },
);

type PopularPageRow = { pageKey: string; hits: number };

type Overview = {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  activeUsers7d: number;
  activeUsersPrev7d: number;
  activityWeekOverWeekChange: number;
  returningUsers7d: number;
  activeUsers24h: number;
  interactionCount7d: number;
  popularPages: PopularPageRow[];
  signupsByDay: DayCount[];
  readingsByDay: DayCount[];
};

type Learning = {
  avgFamiliarityLevel: number;
  familiarityByLevel: { familiarity_level_id: number; familiarity_name: string; count: number }[];
  weakWordsTop: { word: string; total_incorrect: number; users_affected: number }[];
  readingsByCategory: {
    category_id: number;
    category_name: string;
    readings_completed: number;
    avg_quiz_score: string | number | null;
  }[];
};

type Engagement = {
  avgLongestStreak: number;
  maxLongestStreak: number;
  avgUserPoints: number;
  badgesEarnedByType: { badge_key: string; name_es: string; earned_count: number }[];
  totalReadingsCompleted: number;
};

function backendUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL;
  return typeof raw === 'string' ? raw.replace(/\/$/, '') : '';
}

export function AdminDashboard() {
  const { t } = useLocale();
  const router = useRouter();
  const { isAdmin, loading: adminLoading, refresh: refreshAdmin } = useAdminAccess();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [learning, setLearning] = useState<Learning | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const base = backendUrl();
    const token = localStorage.getItem('token');
    if (!base || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [o, l, e] = await Promise.all([
        fetch(`${base}/api/admin/overview`, { headers }),
        fetch(`${base}/api/admin/learning`, { headers }),
        fetch(`${base}/api/admin/engagement`, { headers }),
      ]);
      if (o.status === 403 || l.status === 403) {
        setError('forbidden');
        setOverview(null);
        setLearning(null);
        setEngagement(null);
        return;
      }
      if (!o.ok || !l.ok || !e.ok) {
        setError('fetch');
        return;
      }
      setOverview(await o.json());
      setLearning(await l.json());
      setEngagement(await e.json());
    } catch {
      setError('fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/auth?tab=login');
      return;
    }
    if (adminLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    void loadData();
  }, [adminLoading, isAdmin, loadData, router]);

  if (!adminLoading && !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              {t('admin.accessDeniedTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('admin.accessDeniedBody')}</p>
            <Button variant="outline" asChild>
              <Link href="/tablero">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('admin.backToDashboard')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refreshAdmin()} disabled={adminLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${adminLoading ? 'animate-spin' : ''}`} />
            {t('admin.recheckAdminAccess')}
          </Button>
          <Button variant="default" size="sm" onClick={() => void loadData()} disabled={loading || !isAdmin}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('admin.reloadData')}
          </Button>
        </div>
      </div>

      {error === 'forbidden' && (
        <p className="text-sm text-destructive">{t('admin.forbiddenReload')}</p>
      )}
      {error === 'fetch' && (
        <p className="text-sm text-destructive">{t('admin.loadError')}</p>
      )}

      {(adminLoading || (loading && isAdmin)) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {!loading && overview && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {t('admin.kpiTotalUsers')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overview.totalUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  +{overview.newUsers7d} {t('admin.kpiNew7d')} · +{overview.newUsers30d} {t('admin.kpiNew30d')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  {t('admin.kpiActive7d')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overview.activeUsers7d}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('admin.kpiWow')}: {(overview.activityWeekOverWeekChange * 100).toFixed(1)}% ·{' '}
                  {t('admin.kpiReturning')}: {overview.returningUsers7d}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {t('admin.kpiLastAccess')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overview.activeUsers24h ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('admin.kpiLastAccessHint')}</p>
                <div className="mt-3 flex items-start gap-2 text-sm border-t pt-3">
                  <MousePointerClick className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-semibold">{overview.interactionCount7d ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{t('admin.kpiVisitsHint')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  {t('admin.kpiPrevWindow')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overview.activeUsersPrev7d}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('admin.kpiPrevWindowHint')}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('admin.sectionTrends')}</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminTimeseriesCharts
                signupsByDay={overview.signupsByDay}
                readingsByDay={overview.readingsByDay}
                signupsLabel={t('admin.chartSignups')}
                readingsLabel={t('admin.chartReadings')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('admin.popularPagesTitle')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('admin.popularPagesHint')}</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.popularPageColumn')}</TableHead>
                    <TableHead className="text-right">{t('admin.popularPageHits')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(overview.popularPages ?? []).map((row) => (
                    <TableRow key={row.pageKey}>
                      <TableCell>{t(`admin.page_${row.pageKey}`)}</TableCell>
                      <TableCell className="text-right font-medium">{row.hits}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && learning && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.sectionLearning')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('admin.avgFamiliarity')}: <span className="font-mono font-medium">{learning.avgFamiliarityLevel}</span>
              </p>
            </CardHeader>
            <CardContent>
              <AdminFamiliarityBar data={learning.familiarityByLevel} title={t('admin.familiarityDistribution')} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.weakWordsTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.tableWord')}</TableHead>
                    <TableHead className="text-right">{t('admin.tableIncorrect')}</TableHead>
                    <TableHead className="text-right">{t('admin.tableUsers')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {learning.weakWordsTop.map((row) => (
                    <TableRow key={row.word}>
                      <TableCell className="font-medium">{row.word}</TableCell>
                      <TableCell className="text-right">{row.total_incorrect}</TableCell>
                      <TableCell className="text-right">{row.users_affected}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('admin.readingsByCategory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.tableCategory')}</TableHead>
                    <TableHead className="text-right">{t('admin.tableReadings')}</TableHead>
                    <TableHead className="text-right">{t('admin.tableAvgQuiz')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {learning.readingsByCategory.map((row) => (
                    <TableRow key={row.category_id}>
                      <TableCell>{row.category_name}</TableCell>
                      <TableCell className="text-right">{row.readings_completed}</TableCell>
                      <TableCell className="text-right">
                        {row.avg_quiz_score != null ? String(row.avg_quiz_score) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && engagement && (
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.sectionEngagement')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('admin.streakAvg')}: {engagement.avgLongestStreak} · {t('admin.streakMax')}: {engagement.maxLongestStreak} ·{' '}
              {t('admin.avgPoints')}: {engagement.avgUserPoints} · {t('admin.totalReadings')}: {engagement.totalReadingsCompleted}
            </p>
          </CardHeader>
          <CardContent>
            <AdminBadgesBar
              data={engagement.badgesEarnedByType}
              title={t('admin.badgesEarned')}
              nameLabel={t('admin.badgeName')}
              countLabel={t('admin.badgeCount')}
            />
          </CardContent>
        </Card>
      )}

    </div>
  );
}
