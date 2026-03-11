'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import esTranslations from '@/locales/es.json'

export type Locale = 'es' | 'en' | 'fr'

const STORAGE_KEY = 'lixy-locale'

type Translations = Record<string, string | Record<string, unknown>>

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

const translationsCache: Record<Locale, Translations | null> = {
  es: esTranslations as Translations,
  en: null,
  fr: null,
}

async function loadTranslations(locale: Locale): Promise<Translations> {
  if (translationsCache[locale]) {
    return translationsCache[locale] as Translations
  }
  const mod = await import(`@/locales/${locale}.json`)
  translationsCache[locale] = mod.default as Translations
  return mod.default as Translations
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es')
  const [translations, setTranslations] = useState<Translations | null>(esTranslations as Translations)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored && (stored === 'es' || stored === 'en' || stored === 'fr')) {
      setLocaleState(stored)
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    loadTranslations(locale).then(setTranslations)
  }, [locale])

  useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'es' ? 'es' : locale === 'fr' ? 'fr' : 'en'
    }
  }, [locale, mounted])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale)
    }
  }, [])

  const t = useCallback(
    (key: string): string => {
      if (!translations) return key
      const value = getNested(translations as Record<string, unknown>, key)
      return value ?? key
    },
    [translations]
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return ctx
}
