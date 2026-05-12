'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/locale-context';
import { useAdminAccess } from '@/hooks/use-admin-access';
import { authFetch } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, PlusCircle, ShieldAlert, Upload } from 'lucide-react';

type Category = { category_id: number; category_name: string };

type ImportResult = {
  inserted: number;
  skippedDuplicates: number;
  errors: { line: number; message: string }[];
};

function backendUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL;
  return typeof raw === 'string' ? raw.replace(/\/$/, '') : '';
}

export function AdminVocabularyImport() {
  const { t } = useLocale();
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('manual');

  const [manualWord, setManualWord] = useState('');
  const [manualType, setManualType] = useState('');
  const [manualCefr, setManualCefr] = useState('');
  const [manualDefinition, setManualDefinition] = useState('');
  const [manualExample, setManualExample] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualFeedback, setManualFeedback] = useState<'idle' | 'ok' | 'duplicate' | 'error'>('idle');
  const [manualErrorText, setManualErrorText] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const clearManualStatus = useCallback(() => {
    setManualFeedback('idle');
    setManualErrorText(null);
  }, []);

  useEffect(() => {
    clearManualStatus();
  }, [categoryId, clearManualStatus]);

  const loadCategories = useCallback(async () => {
    const base = backendUrl();
    if (!base) return;
    setCategoriesError(false);
    try {
      const res = await authFetch(`${base}/api/categories`);
      if (!res.ok) {
        setCategoriesError(true);
        return;
      }
      const data = (await res.json()) as Category[];
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategoriesError(true);
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.replace('/auth?tab=login');
      return;
    }
    if (adminLoading) return;
    if (!isAdmin) return;
    void loadCategories();
  }, [adminLoading, isAdmin, loadCategories, router]);

  const onSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = backendUrl();
    if (!base || !categoryId) return;
    const word = manualWord.trim();
    if (!word) return;
    setManualSubmitting(true);
    clearManualStatus();
    try {
      const payload: Record<string, unknown> = {
        category_id: Number(categoryId),
        word,
      };
      const ty = manualType.trim();
      if (ty) payload.type = ty;
      const ce = manualCefr.trim();
      if (ce) payload.cefr = ce;
      const def = manualDefinition.trim();
      if (def) payload.definition = def;
      const ex = manualExample.trim();
      if (ex) payload.example = ex;

      const res = await authFetch(`${base}/api/admin/vocabulary/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 403) {
        setManualFeedback('error');
        setManualErrorText('forbidden');
        return;
      }
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { detail?: unknown };
          if (typeof body.detail === 'string') msg = body.detail;
        } catch {
          /* ignore */
        }
        setManualFeedback('error');
        setManualErrorText(msg);
        return;
      }
      const data = (await res.json()) as { status?: string };
      if (data.status === 'skipped_duplicate') {
        setManualFeedback('duplicate');
      } else {
        setManualFeedback('ok');
        setManualWord('');
        setManualType('');
        setManualCefr('');
        setManualDefinition('');
        setManualExample('');
      }
    } catch {
      setManualFeedback('error');
      setManualErrorText('network');
    } finally {
      setManualSubmitting(false);
    }
  };

  const onSubmitCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = backendUrl();
    if (!base || !file || !categoryId) return;
    setCsvSubmitting(true);
    setCsvError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category_id', categoryId);
      const res = await authFetch(`${base}/api/admin/vocabulary/import-csv`, {
        method: 'POST',
        body: fd,
      });
      if (res.status === 403) {
        setCsvError('forbidden');
        return;
      }
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { detail?: unknown };
          if (typeof body.detail === 'string') msg = body.detail;
        } catch {
          /* ignore */
        }
        setCsvError(msg);
        return;
      }
      const data = (await res.json()) as ImportResult;
      setResult({
        inserted: data.inserted ?? 0,
        skippedDuplicates: data.skippedDuplicates ?? 0,
        errors: Array.isArray(data.errors) ? data.errors : [],
      });
    } catch {
      setCsvError('network');
    } finally {
      setCsvSubmitting(false);
    }
  };

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

  const categorySelectDisabled = !categories.length || adminLoading;
  const exampleCsv = t('admin.vocabCsvExampleBlock');

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin.vocabImportTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.vocabImportSubtitle')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('admin.vocabImportBackToAdmin')}
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.vocabSharedCategoryTitle')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('admin.vocabSharedCategoryHint')}</p>
        </CardHeader>
        <CardContent>
          {categoriesError && (
            <p className="text-sm text-destructive mb-4">{t('admin.vocabImportCategoriesError')}</p>
          )}
          <div className="space-y-2 max-w-md">
            <Label htmlFor="vocab-category">{t('admin.vocabImportCategory')}</Label>
            <Select
              value={categoryId || undefined}
              onValueChange={setCategoryId}
              disabled={categorySelectDisabled}
            >
              <SelectTrigger id="vocab-category">
                <SelectValue placeholder={t('admin.vocabImportCategoryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.category_id} value={String(c.category_id)}>
                    {c.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="manual" className="gap-1.5">
            <PlusCircle className="h-4 w-4 shrink-0" />
            {t('admin.vocabTabManual')}
          </TabsTrigger>
          <TabsTrigger value="csv" className="gap-1.5">
            <Upload className="h-4 w-4 shrink-0" />
            {t('admin.vocabTabCsv')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.vocabManualTitle')}</CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">{t('admin.vocabManualIntro')}</p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => void onSubmitManual(e)}>
                <div className="space-y-2">
                  <Label htmlFor="v-manual-word">{t('admin.vocabManualWord')}</Label>
                  <Input
                    id="v-manual-word"
                    value={manualWord}
                    onChange={(e) => {
                      clearManualStatus();
                      setManualWord(e.target.value);
                    }}
                    maxLength={255}
                    disabled={manualSubmitting}
                    placeholder={t('admin.vocabManualWordPh')}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="v-manual-type">{t('admin.vocabManualType')}</Label>
                    <Input
                      id="v-manual-type"
                      value={manualType}
                      onChange={(e) => {
                        clearManualStatus();
                        setManualType(e.target.value);
                      }}
                      maxLength={255}
                      disabled={manualSubmitting}
                      placeholder={t('admin.vocabManualTypePh')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="v-manual-cefr">{t('admin.vocabManualCefr')}</Label>
                    <Input
                      id="v-manual-cefr"
                      value={manualCefr}
                      onChange={(e) => {
                        clearManualStatus();
                        setManualCefr(e.target.value);
                      }}
                      maxLength={10}
                      disabled={manualSubmitting}
                      placeholder={t('admin.vocabManualCefrPh')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="v-manual-def">{t('admin.vocabManualDefinition')}</Label>
                  <Textarea
                    id="v-manual-def"
                    value={manualDefinition}
                    onChange={(e) => {
                      clearManualStatus();
                      setManualDefinition(e.target.value);
                    }}
                    disabled={manualSubmitting}
                    placeholder={t('admin.vocabManualDefinitionPh')}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="v-manual-ex">{t('admin.vocabManualExample')}</Label>
                  <Textarea
                    id="v-manual-ex"
                    value={manualExample}
                    onChange={(e) => {
                      clearManualStatus();
                      setManualExample(e.target.value);
                    }}
                    disabled={manualSubmitting}
                    placeholder={t('admin.vocabManualExamplePh')}
                    rows={2}
                  />
                </div>

                <Button type="submit" disabled={manualSubmitting || !categoryId || !manualWord.trim()}>
                  {manualSubmitting ? t('admin.vocabManualSaving') : t('admin.vocabManualSubmit')}
                </Button>

                {manualFeedback === 'ok' && (
                  <p className="text-sm text-green-700 dark:text-green-400">{t('admin.vocabManualSuccess')}</p>
                )}
                {manualFeedback === 'duplicate' && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">{t('admin.vocabManualDuplicate')}</p>
                )}
                {manualFeedback === 'error' && (
                  <p className="text-sm text-destructive">
                    {manualErrorText === 'forbidden'
                      ? t('admin.forbiddenReload')
                      : manualErrorText === 'network'
                        ? t('admin.vocabImportNetworkError')
                        : (manualErrorText ?? t('admin.vocabImportNetworkError'))}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.vocabCsvHowTitle')}</CardTitle>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {t('admin.vocabCsvHowBody')}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">{t('admin.vocabCsvExampleTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('admin.vocabCsvExampleCaption')}</p>
              <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 text-xs leading-relaxed font-mono">
                {exampleCsv}
              </pre>
              <p className="text-sm text-muted-foreground leading-relaxed">{t('admin.vocabCsvNoImageNote')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('admin.vocabImportFormTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={(e) => void onSubmitCsv(e)}>
                <div className="space-y-2">
                  <Label htmlFor="vocab-csv">{t('admin.vocabImportFile')}</Label>
                  <Input
                    id="vocab-csv"
                    type="file"
                    accept=".csv,text/csv"
                    disabled={csvSubmitting}
                    onChange={(ev) => {
                      const f = ev.target.files?.[0];
                      setFile(f ?? null);
                      setResult(null);
                      setCsvError(null);
                    }}
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">{t('admin.vocabCsvFileHint')}</p>
                </div>

                <Button type="submit" disabled={csvSubmitting || !file || !categoryId}>
                  <Upload className="h-4 w-4 mr-2" />
                  {csvSubmitting ? t('admin.vocabImportUploading') : t('admin.vocabImportSubmit')}
                </Button>
              </form>

              {csvError === 'forbidden' && (
                <p className="text-sm text-destructive mt-4">{t('admin.forbiddenReload')}</p>
              )}
              {csvError === 'network' && (
                <p className="text-sm text-destructive mt-4">{t('admin.vocabImportNetworkError')}</p>
              )}
              {csvError && csvError !== 'forbidden' && csvError !== 'network' && (
                <p className="text-sm text-destructive mt-4">{csvError}</p>
              )}

              {result && (
                <div className="mt-6 space-y-2 rounded-md border p-4 text-sm">
                  <p>
                    <span className="font-medium">{t('admin.vocabImportInserted')}</span> {result.inserted}
                  </p>
                  <p>
                    <span className="font-medium">{t('admin.vocabImportSkipped')}</span> {result.skippedDuplicates}
                  </p>
                  {result.errors.length > 0 && (
                    <div className="pt-2">
                      <p className="font-medium text-destructive mb-1">{t('admin.vocabImportErrorsTitle')}</p>
                      <ul className="list-disc pl-5 space-y-1 font-mono text-xs max-h-48 overflow-y-auto">
                        {result.errors.map((err, i) => (
                          <li key={`${err.line}-${i}`}>
                            {t('admin.vocabImportErrorLine')} {err.line}: {err.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
