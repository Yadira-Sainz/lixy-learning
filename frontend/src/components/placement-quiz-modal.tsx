'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { useLocale } from '@/contexts/locale-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export type PlacementQuestion = {
  vocabularyId: number
  word: string
  options: string[]
}

type Props = {
  open: boolean
  onCompleted: () => void
}

export function PlacementQuizModal({ open, onCompleted }: Props) {
  const { t } = useLocale()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<PlacementQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<{ vocabulary_id: number; selected_option: string }[]>([])

  const loadQuiz = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setError(t('placement.needLogin'))
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get<{ questions: PlacementQuestion[] }>(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/placement/quiz`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const q = res.data?.questions ?? []
      setQuestions(q)
      setIndex(0)
      setAnswers([])
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 400) {
        onCompleted()
        return
      }
      setError(
        axios.isAxiosError(e)
          ? e.response?.data?.detail ?? e.message
          : t('placement.loadError')
      )
    } finally {
      setLoading(false)
    }
  }, [onCompleted, t])

  useEffect(() => {
    if (!open) return
    void loadQuiz()
  }, [open, loadQuiz])

  const pickOption = async (option: string) => {
    const q = questions[index]
    if (!q) return
    const next = [...answers, { vocabulary_id: q.vocabularyId, selected_option: option }]
    if (index + 1 >= questions.length) {
      setSubmitting(true)
      setError(null)
      try {
        const token = localStorage.getItem('token')
        await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/placement/submit`,
          { answers: next },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        onCompleted()
      } catch (e: unknown) {
        setError(
          axios.isAxiosError(e)
            ? String(e.response?.data?.detail ?? e.message)
            : t('placement.submitError')
        )
      } finally {
        setSubmitting(false)
      }
      return
    }
    setAnswers(next)
    setIndex((i) => i + 1)
  }

  const current = questions[index]

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t('placement.title')}</DialogTitle>
          <DialogDescription>{t('placement.intro')}</DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="text-sm text-muted-foreground py-6">{t('placement.loading')}</p>
        )}

        {!loading && error && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadQuiz()}>
              {t('placement.retry')}
            </Button>
          </div>
        )}

        {!loading && !error && current && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t('placement.progress')
                .replace('{current}', String(index + 1))
                .replace('{total}', String(questions.length))}
            </p>
            <p className="text-2xl font-semibold text-center">{current.word}</p>
            <p className="text-sm text-muted-foreground text-center">{t('placement.pickMeaning')}</p>
            <div className="grid gap-2">
              {current.options.map((opt, optIdx) => (
                <Button
                  key={`${index}-${optIdx}`}
                  type="button"
                  variant="secondary"
                  className="h-auto min-h-[2.5rem] whitespace-normal text-left justify-start py-3 px-3"
                  disabled={submitting}
                  onClick={() => void pickOption(opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {submitting && (
          <p className="text-sm text-muted-foreground">{t('placement.saving')}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
