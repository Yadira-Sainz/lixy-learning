'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useLocale } from '@/contexts/locale-context'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  DEFAULT_CARDS_PER_SESSION,
  DEFAULT_DAILY_GOAL,
  DEFAULT_INCLUDE_TRANSLATION,
  normalizeStoredConfigIncludeTranslation,
} from '@/lib/config'

const sections = [
  { id: 'general', titleKey: 'config.general' },
  { id: 'flashcards', titleKey: 'config.flashcards' },
  // Add more sections here in the future
]

interface SectionRefs {
  [key: string]: React.RefObject<HTMLElement>;
}

const CONFIG_STORAGE_KEY = 'lixy-config'

function loadStoredConfig() {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export default function ConfigurationPageComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { locale, setLocale, t } = useLocale()
  const [activeSection, setActiveSection] = useState(sections[0].id)
  const sectionRefs = useRef<SectionRefs>({})
  const [mounted, setMounted] = useState(false)

  // Pending state - only applied when user clicks "Guardar cambios"
  const [pendingTheme, setPendingTheme] = useState<string>('system')
  const [pendingLocale, setPendingLocale] = useState<string>('es')
  const [pendingDailyGoal, setPendingDailyGoal] = useState(String(DEFAULT_DAILY_GOAL))
  const [pendingCardsPerSession, setPendingCardsPerSession] = useState(String(DEFAULT_CARDS_PER_SESSION))
  const [pendingIncludeTranslation, setPendingIncludeTranslation] = useState(
    DEFAULT_INCLUDE_TRANSLATION
  )
  const [saveFeedback, setSaveFeedback] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize pending state from actual values when mounted
  useEffect(() => {
    if (!mounted) return
    setPendingTheme(theme ?? 'system')
    setPendingLocale(locale)
    normalizeStoredConfigIncludeTranslation()
    const stored = loadStoredConfig()
    if (stored) {
      if (stored.dailyGoal != null) setPendingDailyGoal(String(stored.dailyGoal))
      if (stored.cardsPerSession != null) setPendingCardsPerSession(String(stored.cardsPerSession))
      setPendingIncludeTranslation(
        typeof stored.includeTranslation === 'boolean'
          ? stored.includeTranslation
          : DEFAULT_INCLUDE_TRANSLATION
      )
    }
  }, [mounted, theme, locale])

  useEffect(() => {
    sections.forEach(section => {
      if (!sectionRefs.current[section.id]) {
        sectionRefs.current[section.id] = React.createRef<HTMLElement>()
      }
    })
  }, [])

  const handleSaveChanges = () => {
    setTheme(pendingTheme as 'light' | 'dark' | 'system')
    setLocale(pendingLocale as 'es' | 'en' | 'fr')
    const config = {
      dailyGoal: pendingDailyGoal,
      cardsPerSession: pendingCardsPerSession,
      includeTranslation: pendingIncludeTranslation,
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
    }
    setSaveFeedback(true)
    setTimeout(() => setSaveFeedback(false), 3000)
  }

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    sectionRefs.current[sectionId]?.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background p-6 flex" data-tour="settings-content">
      {/* Navigation sidebar */}
      <nav className="w-64 pr-6 hidden md:block">
        <ul className="space-y-2 fixed">
          {sections.map((section) => (
            <li key={section.id}>
              <Button
                variant="ghost"
                className={`w-full justify-start ${activeSection === section.id ? 'bg-accent' : ''}`}
                onClick={() => scrollToSection(section.id)}
              >
                {t(section.titleKey)}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content */}
      <div className="flex-grow max-w-2xl mx-auto space-y-8">
        <section ref={sectionRefs.current.general as React.RefObject<HTMLElement>} id="general">
          <h1 className="text-3xl font-bold mb-6">{t('config.general')}</h1>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="theme">{t('config.theme')}</Label>
              <Select
                value={mounted ? pendingTheme : 'system'}
                onValueChange={(value) => setPendingTheme(value)}
              >
                <SelectTrigger id="theme">
                  <SelectValue placeholder={t('config.themePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t('config.themeLight')}</SelectItem>
                  <SelectItem value="dark">{t('config.themeDark')}</SelectItem>
                  <SelectItem value="system">{t('config.themeSystem')}</SelectItem>
                </SelectContent>
              </Select>
              {mounted && (
                <p className="text-sm text-muted-foreground mt-1">
                  {resolvedTheme === 'dark' ? t('config.themeActiveDark') : t('config.themeActiveLight')}
                  {pendingTheme === 'system' && ` ${t('config.themeSystemNote')}`}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="language">{t('config.language')}</Label>
              <Select
                value={mounted ? pendingLocale : 'es'}
                onValueChange={(value) => setPendingLocale(value)}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder={t('config.languagePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">{t('config.languageEs')}</SelectItem>
                  <SelectItem value="en">{t('config.languageEn')}</SelectItem>
                  <SelectItem value="fr">{t('config.languageFr')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="daily-goal">{t('config.dailyGoal')}</Label>
              <Input 
                id="daily-goal" 
                type="number" 
                min={1}
                max={365}
                value={pendingDailyGoal}
                onChange={(e) => setPendingDailyGoal(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section ref={sectionRefs.current.flashcards as React.RefObject<HTMLElement>} id="flashcards">
          <h2 className="text-2xl font-bold mb-6">{t('config.flashcards')}</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="cards-per-session">{t('config.cardsPerSession')}</Label>
              <Input 
                id="cards-per-session" 
                type="number"
                value={pendingCardsPerSession}
                onChange={(e) => setPendingCardsPerSession(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="include-translation"
                checked={pendingIncludeTranslation}
                onCheckedChange={setPendingIncludeTranslation}
              />
              <Label htmlFor="include-translation">{t('config.includeTranslation')}</Label>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-4 mt-8">
          {saveFeedback && (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium animate-in fade-in duration-200">
              {t('config.changesSaved')}
            </span>
          )}
          <Button onClick={handleSaveChanges}>{t('config.saveChanges')}</Button>
        </div>
      </div>
    </div>
  )
}