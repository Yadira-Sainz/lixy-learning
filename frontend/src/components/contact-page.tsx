'use client'

import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { useLocale } from '@/contexts/locale-context'

const backendUrl =
  typeof process.env.NEXT_PUBLIC_BACKEND_URL === 'string'
    ? process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, '')
    : ''

export function ContactPageComponent() {
  const { t } = useLocale()
  const [smtpReady, setSmtpReady] = useState<boolean | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    asunto: '',
    mensaje: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<'ok' | 'err' | null>(null)

  useEffect(() => {
    if (!backendUrl) {
      setSmtpReady(false)
      return
    }
    let cancelled = false
    fetch(`${backendUrl}/api/contact/status`)
      .then((r) => r.json())
      .then((data: { configured?: boolean; smtpConfigured?: boolean }) => {
        if (!cancelled) {
          const ok = data.configured ?? data.smtpConfigured
          setSmtpReady(Boolean(ok))
        }
      })
      .catch(() => {
        if (!cancelled) setSmtpReady(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFeedback(null)
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!backendUrl || !smtpReady) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await fetch(`${backendUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.nombre,
          email: formData.email,
          subject: formData.asunto,
          message: formData.mensaje,
        }),
      })
      if (res.ok) {
        setFeedback('ok')
        setFormData({ nombre: '', email: '', asunto: '', mensaje: '' })
      } else if (res.status === 503) {
        setFeedback('err')
      } else {
        setFeedback('err')
      }
    } catch {
      setFeedback('err')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id='contacto' className="flex items-center justify-center min-h-screen">
      <div className="py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-4">{t('contact.title')}</h1>
          <p className="text-lg text-muted-foreground mb-4">
            {t('contact.subtitle')}
          </p>
          {smtpReady === null && (
            <p className="text-base text-muted-foreground mb-8">{t('contact.loading')}</p>
          )}
          {smtpReady === false && (
            <p className="text-base text-muted-foreground mb-8">{t('contact.unavailable')}</p>
          )}
          {smtpReady === true && (
            <>
              <Card>
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {feedback === 'ok' && (
                      <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
                        {t('contact.sendSuccess')}
                      </p>
                    )}
                    {feedback === 'err' && (
                      <p className="text-sm text-destructive" role="alert">
                        {t('contact.sendError')}
                      </p>
                    )}
                    <div>
                      <label htmlFor="nombre" className="block text-sm font-medium text-foreground">{t('contact.name')}</label>
                      <Input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        required
                        disabled={submitting}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-foreground">{t('contact.email')}</label>
                      <Input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={submitting}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="asunto" className="block text-sm font-medium text-foreground">{t('contact.subject')}</label>
                      <Input
                        type="text"
                        id="asunto"
                        name="asunto"
                        value={formData.asunto}
                        onChange={handleChange}
                        required
                        disabled={submitting}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="mensaje" className="block text-sm font-medium text-foreground">{t('contact.message')}</label>
                      <Textarea
                        id="mensaje"
                        name="mensaje"
                        value={formData.mensaje}
                        onChange={handleChange}
                        required
                        disabled={submitting}
                        className="mt-1"
                        rows={4}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? t('contact.sending') : t('contact.send')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default ContactPageComponent;
