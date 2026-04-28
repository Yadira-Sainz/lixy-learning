'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  clearUnifiedOnboarding,
  getUnifiedOnboarding,
  setUnifiedOnboardingStep,
  setUnifiedOnboardingTourStart,
  type UnifiedOnboardingState,
} from '@/lib/unified-onboarding-storage'

const TOUR_STEP_COUNT = 8

const PORTAL_Z = 10050

const TOOLTIP_MAX_W = 420
const TOOLTIP_EST_H = 300

type SpotlightBox = { top: number; left: number; right: number; bottom: number }

type TourStepDef = {
  titleKey: string
  bodyKey: string
  route: string
  scrollTablero?: boolean
  scrollTop?: boolean
  highlight?: string | null
  allowPointerThroughHighlight?: boolean
  /** No dimming layer so the user can use the underlying page (e.g. settings). */
  bareOverlay?: boolean
  /** No pulsing dot (e.g. large “Recientes” blocks where it sits awkwardly above the tooltip). */
  hideHotspot?: boolean
}

const TOUR_STEPS: TourStepDef[] = [
  {
    titleKey: 'onboardingTour.tour0Title',
    bodyKey: 'onboardingTour.tour0Body',
    route: '/tablero',
    scrollTablero: true,
  },
  {
    titleKey: 'onboardingTour.tour1Title',
    bodyKey: 'onboardingTour.tour1Body',
    route: '/ajustes',
    scrollTop: true,
    bareOverlay: true,
  },
  {
    titleKey: 'onboardingTour.tour2Title',
    bodyKey: 'onboardingTour.tour2Body',
    route: '/centro-de-flashcards',
  },
  {
    titleKey: 'onboardingTour.tour3Title',
    bodyKey: 'onboardingTour.tour3Body',
    route: '/centro-de-flashcards',
    highlight: '[data-tour="fc-categories"]',
    allowPointerThroughHighlight: true,
    hideHotspot: true,
  },
  {
    titleKey: 'onboardingTour.tour4Title',
    bodyKey: 'onboardingTour.tour4Body',
    route: '/centro-de-flashcards',
    highlight: '[data-tour="fc-recent"]',
    allowPointerThroughHighlight: true,
    hideHotspot: true,
  },
  {
    titleKey: 'onboardingTour.tour5Title',
    bodyKey: 'onboardingTour.tour5Body',
    route: '/centro-de-lectura',
  },
  {
    titleKey: 'onboardingTour.tour6Title',
    bodyKey: 'onboardingTour.tour6Body',
    route: '/centro-de-lectura',
    highlight: '[data-tour="rc-categories"]',
    allowPointerThroughHighlight: true,
    hideHotspot: true,
  },
  {
    titleKey: 'onboardingTour.tour7Title',
    bodyKey: 'onboardingTour.tour7Body',
    route: '/centro-de-lectura',
    highlight: '[data-tour="rc-recent"]',
    allowPointerThroughHighlight: true,
    hideHotspot: true,
  },
]

function removeHighlight(ref: MutableRefObject<HTMLElement | null>) {
  ref.current = null
}

/**
 * User left the tour "home" route to try the product — do not router.push them back.
 */
function isAllowedPracticeDetour(tourStep: number, pathname: string | null): boolean {
  if (!pathname) return false
  if (tourStep === 1) {
    return pathname === '/perfil'
  }
  if (tourStep === 3 || tourStep === 4) {
    return pathname === '/flashcard' || pathname.startsWith('/flashcard/')
  }
  if (tourStep >= 5 && tourStep <= 7) {
    return (
      pathname.startsWith('/coleccion') ||
      pathname === '/leer' ||
      pathname.startsWith('/leer/')
    )
  }
  return false
}

type PopoverPos = { left: number; top: number; cardW: number }

function bottomCenterCard(): PopoverPos {
  const vw = typeof window === 'undefined' ? 400 : window.innerWidth
  const vh = typeof window === 'undefined' ? 800 : window.innerHeight
  const cardW = Math.min(TOOLTIP_MAX_W, vw - 16)
  return {
    left: (vw - cardW) / 2,
    top: Math.max(12, vh - TOOLTIP_EST_H - 20),
    cardW,
  }
}

function computeNearTarget(rect: DOMRect): PopoverPos {
  const pad = 14
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cardW = Math.min(TOOLTIP_MAX_W, vw - 16)
  let left = rect.left + rect.width / 2 - cardW / 2
  left = Math.max(10, Math.min(left, vw - cardW - 10))
  const spaceBelow = vh - rect.bottom - pad
  const preferBelow = spaceBelow >= TOOLTIP_EST_H || spaceBelow >= rect.top - pad
  if (preferBelow) {
    return { left, top: Math.min(rect.bottom + pad, vh - TOOLTIP_EST_H - 12), cardW }
  }
  return { left, top: Math.max(12, rect.top - TOOLTIP_EST_H - pad), cardW }
}

/**
 * Dimmed overlay with a rounded, softly feathered “window”.
 * Transparent HTML strips catch clicks only on dimmed regions; the SVG is
 * `pointer-events: none` so mask blur does not eat taps meant for the hole.
 */
function SpotlightShade({ box }: { box: SpotlightBox }) {
  const uid = useId().replace(/:/g, '')
  const maskId = `tour-mask-${uid}`
  const blurFid = `tour-hole-blur-${uid}`
  const vw = window.innerWidth
  const vh = window.innerHeight
  const { top, left, right, bottom } = box
  const w = Math.max(0, right - left)
  const h = Math.max(0, bottom - top)
  const rx = Math.min(28, Math.max(14, Math.min(w, h) * 0.04))
  const veil = 'rgba(0, 0, 0, 0.34)'
  const zHit = PORTAL_Z
  const zSvg = PORTAL_Z + 1
  const strip = 'fixed bg-transparent pointer-events-auto'

  return (
    <>
      <div className={strip} style={{ top: 0, left: 0, width: vw, height: top, zIndex: zHit }} aria-hidden />
      <div className={strip} style={{ top, left: 0, width: left, height: bottom - top, zIndex: zHit }} aria-hidden />
      <div
        className={strip}
        style={{ top, left: right, width: vw - right, height: bottom - top, zIndex: zHit }}
        aria-hidden
      />
      <div className={strip} style={{ top: bottom, left: 0, width: vw, height: vh - bottom, zIndex: zHit }} aria-hidden />

      <svg
        className="fixed left-0 top-0 touch-none"
        width={vw}
        height={vh}
        style={{ zIndex: zSvg, pointerEvents: 'none' }}
        aria-hidden
      >
        <defs>
          <filter id={blurFid} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b" />
          </filter>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <rect width={vw} height={vh} fill="white" />
            <rect
              x={left}
              y={top}
              width={w}
              height={h}
              rx={rx}
              ry={rx}
              fill="black"
              filter={`url(#${blurFid})`}
            />
          </mask>
        </defs>
        <rect width={vw} height={vh} fill={veil} mask={`url(#${maskId})`} />
        <rect
          x={left}
          y={top}
          width={w}
          height={h}
          rx={rx}
          ry={rx}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeOpacity={0.22}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      </svg>
    </>
  )
}

/** Small static marker only — no expanding ring (avoids clutter above the tooltip). */
function HotspotPulse({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="pointer-events-none fixed -translate-x-1/2"
      style={{ left: x, top: y, zIndex: PORTAL_Z + 2 }}
      aria-hidden
    >
      <span className="block h-2.5 w-2.5 rounded-full bg-primary shadow-sm ring-2 ring-primary/25 ring-offset-2 ring-offset-background/90" />
    </div>
  )
}

function TourStepDots({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex justify-center gap-1.5 px-1 pt-1" role="presentation" aria-hidden>
      {Array.from({ length: TOUR_STEP_COUNT }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-2 rounded-full transition-all duration-300 ease-out',
            i === activeIndex
              ? 'w-8 bg-primary motion-safe:shadow-[0_0_12px_hsl(var(--primary)/0.45)]'
              : i < activeIndex
                ? 'w-2 bg-primary/55'
                : 'w-2 bg-muted-foreground/20'
          )}
        />
      ))}
    </div>
  )
}

type ExploringBannerProps = {
  tourStep: number
  resumeRoute: string
  onResume: () => void
  onDismiss: () => void
  t: (key: string) => string
}

function ExploringBanner({ tourStep, resumeRoute, onResume, onDismiss, t }: ExploringBannerProps) {
  const resumeLabel =
    resumeRoute === '/centro-de-flashcards'
      ? t('onboardingTour.exploringResumeFlashcards')
      : resumeRoute === '/centro-de-lectura'
        ? t('onboardingTour.exploringResumeReading')
        : resumeRoute === '/ajustes'
          ? t('onboardingTour.exploringResumeSettings')
          : t('onboardingTour.exploringResumeDashboard')
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      style={{ zIndex: PORTAL_Z }}
    >
      <div
        className="pointer-events-auto w-full max-w-lg rounded-2xl border border-primary/25 bg-card/95 p-4 shadow-2xl backdrop-blur-md motion-safe:animate-tour-card-in motion-reduce:animate-none"
        role="status"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {t('onboardingTour.exploringBannerKicker')}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{t('onboardingTour.exploringBannerTitle')}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {t('onboardingTour.exploringBannerBody')
            .replace('{current}', String(tourStep + 1))
            .replace('{total}', String(TOUR_STEP_COUNT))}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
            {t('onboardingTour.skip')}
          </Button>
          <Button type="button" size="sm" onClick={onResume}>
            {resumeLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function UnifiedOnboardingTour() {
  const { t } = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [state, setState] = useState<UnifiedOnboardingState | null>(null)
  const highlightRef = useRef<HTMLElement | null>(null)
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null)
  const [hotspot, setHotspot] = useState<{ x: number; y: number } | null>(null)
  const [spotlightBox, setSpotlightBox] = useState<SpotlightBox | null>(null)

  const refresh = useCallback(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('token')
    if (!token || pathname?.startsWith('/auth')) {
      setState(null)
      return
    }
    setState(getUnifiedOnboarding())
  }, [pathname])

  useEffect(() => {
    refresh()
    const onEvt = () => refresh()
    window.addEventListener('lixy-unified-onboarding', onEvt)
    window.addEventListener('auth-change', onEvt as EventListener)
    return () => {
      window.removeEventListener('lixy-unified-onboarding', onEvt)
      window.removeEventListener('auth-change', onEvt as EventListener)
    }
  }, [refresh])

  const dismissAll = useCallback(() => {
    removeHighlight(highlightRef)
    setHotspot(null)
    setPopoverPos(null)
    setSpotlightBox(null)
    clearUnifiedOnboarding()
    setState(null)
  }, [])

  const startTour = useCallback(() => {
    setUnifiedOnboardingTourStart()
    setState({ phase: 'tour', step: 0 })
  }, [])

  const tourStep = state?.phase === 'tour' ? state.step : -1
  const def = tourStep >= 0 && tourStep < TOUR_STEP_COUNT ? TOUR_STEPS[tourStep] : null

  useEffect(() => {
    if (state?.phase !== 'tour') return
    if (state.step >= 0 && state.step < TOUR_STEP_COUNT) return
    const clamped = Math.max(0, TOUR_STEP_COUNT - 1)
    setUnifiedOnboardingStep(clamped)
    setState({ phase: 'tour', step: clamped })
  }, [state])

  const onPracticeDetour =
    Boolean(state?.phase === 'tour' && def && isAllowedPracticeDetour(tourStep, pathname))

  const syncAnchorFromDom = useCallback(() => {
    if (!def || pathname !== def.route) return
    if (!def.highlight) {
      removeHighlight(highlightRef)
      setHotspot(null)
      setSpotlightBox(null)
      setPopoverPos(bottomCenterCard())
      return
    }
    const el = document.querySelector(def.highlight) as HTMLElement | null
    if (!el) {
      removeHighlight(highlightRef)
      setHotspot(null)
      setSpotlightBox(null)
      setPopoverPos(bottomCenterCard())
      return
    }
    removeHighlight(highlightRef)
    highlightRef.current = el
    const rect = el.getBoundingClientRect()
    setPopoverPos(computeNearTarget(rect))
    if (def.hideHotspot) {
      setHotspot(null)
    } else {
      setHotspot({ x: rect.left + rect.width / 2, y: rect.bottom + 10 })
    }
    if (def.allowPointerThroughHighlight) {
      const pad = 8
      setSpotlightBox({
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        right: Math.min(window.innerWidth, rect.right + pad),
        bottom: Math.min(window.innerHeight, rect.bottom + pad),
      })
    } else {
      setSpotlightBox(null)
    }
  }, [def, pathname])

  useEffect(() => {
    if (state?.phase !== 'tour' || !def?.highlight) return
    const onResync = () => {
      syncAnchorFromDom()
      requestAnimationFrame(syncAnchorFromDom)
    }
    window.addEventListener('lixy-tour-resync-anchor', onResync)
    return () => window.removeEventListener('lixy-tour-resync-anchor', onResync)
  }, [state, def, syncAnchorFromDom])

  useLayoutEffect(() => {
    if (!state || state.phase !== 'tour' || !def) return

    if (isAllowedPracticeDetour(tourStep, pathname)) {
      removeHighlight(highlightRef)
      setHotspot(null)
      setSpotlightBox(null)
      setPopoverPos(null)
      return
    }

    if (pathname !== def.route) {
      removeHighlight(highlightRef)
      setHotspot(null)
      setSpotlightBox(null)
      setPopoverPos(null)
      router.push(def.route)
      return
    }

    if (def.scrollTablero) {
      document.getElementById('tablero')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    if (def.scrollTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const delay = !def.highlight ? 0 : pathname.startsWith('/centro') ? 80 : 140
    const tid = window.setTimeout(() => {
      syncAnchorFromDom()
      requestAnimationFrame(syncAnchorFromDom)
    }, delay)

    const onScrollOrResize = () => {
      syncAnchorFromDom()
    }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      window.clearTimeout(tid)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      removeHighlight(highlightRef)
    }
  }, [state, def, pathname, router, syncAnchorFromDom, tourStep])

  const goNext = useCallback(() => {
    if (!state || state.phase !== 'tour') return
    if (tourStep >= TOUR_STEP_COUNT - 1) {
      dismissAll()
      if (pathname !== '/tablero') {
        router.push('/tablero')
      }
      return
    }
    const next = tourStep + 1
    setUnifiedOnboardingStep(next)
    setState({ phase: 'tour', step: next })
  }, [state, tourStep, dismissAll, pathname, router])

  const goPrev = useCallback(() => {
    if (!state || state.phase !== 'tour' || tourStep <= 0) return
    const prev = tourStep - 1
    setUnifiedOnboardingStep(prev)
    setState({ phase: 'tour', step: prev })
  }, [state, tourStep])

  if (!state || typeof document === 'undefined') return null

  const isIntro = state.phase === 'intro'
  const isLast = state.phase === 'tour' && tourStep >= TOUR_STEP_COUNT - 1
  const tourPopoverReady = state.phase === 'tour' && def && popoverPos && !onPracticeDetour
  const interactiveSpotlight = Boolean(def?.allowPointerThroughHighlight && spotlightBox)
  const showDimBackdrop = Boolean(def && !def.bareOverlay)

  if (onPracticeDetour && def) {
    return createPortal(
      <ExploringBanner
        tourStep={tourStep}
        resumeRoute={def.route}
        onResume={() => router.push(def.route)}
        onDismiss={dismissAll}
        t={t}
      />,
      document.body
    )
  }

  const portalTree = (
    <div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: PORTAL_Z }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-tour-title"
    >
      {showDimBackdrop ? (
        interactiveSpotlight && spotlightBox ? (
          <SpotlightShade box={spotlightBox} />
        ) : (
          <div
            className="pointer-events-auto absolute inset-0 bg-black/35"
            style={{ zIndex: PORTAL_Z }}
            aria-hidden
          />
        )
      ) : null}

      {isIntro ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
          <Card
            key="intro"
            className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border-2 border-primary/35 bg-gradient-to-b from-card via-card to-primary/[0.07] shadow-2xl motion-safe:animate-tour-intro-in motion-reduce:animate-none"
            style={{ zIndex: PORTAL_Z + 5 }}
          >
            <div className="h-1 w-full bg-gradient-to-r from-primary/0 via-primary to-primary/0" aria-hidden />
            <CardHeader className="space-y-2 pb-2 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {t('onboardingTour.introBadge')}
              </p>
              <CardTitle id="onboarding-tour-title" className="text-2xl font-bold leading-tight tracking-tight sm:text-[1.65rem]">
                {t('onboardingTour.introTitle')}
              </CardTitle>
              <p className="text-xs font-medium text-muted-foreground">{t('onboardingTour.introStepsHint')}</p>
            </CardHeader>
            <CardContent className="text-[15px] leading-relaxed text-muted-foreground">
              {t('onboardingTour.introBody')}
            </CardContent>
            <CardFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={dismissAll}>
                {t('onboardingTour.notNow')}
              </Button>
              <Button type="button" size="lg" className="sm:min-w-[11rem]" onClick={startTour}>
                {t('onboardingTour.startTour')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : tourPopoverReady ? (
        <>
          {hotspot ? <HotspotPulse x={hotspot.x} y={hotspot.y} /> : null}
          <Card
            key={`step-${tourStep}`}
            className="pointer-events-auto max-h-[min(56vh,440px)] overflow-hidden rounded-2xl border-2 border-primary/35 bg-gradient-to-b from-card via-card to-primary/[0.06] shadow-2xl motion-safe:animate-tour-card-in motion-reduce:animate-none"
            style={{
              position: 'fixed',
              left: popoverPos.left,
              top: popoverPos.top,
              width: popoverPos.cardW,
              zIndex: PORTAL_Z + 5,
            }}
          >
            <div className="h-0.5 w-full bg-gradient-to-r from-primary/0 via-primary/80 to-primary/0" aria-hidden />
            <TourStepDots activeIndex={tourStep} />
            <CardHeader className="space-y-1.5 px-5 pb-2 pt-3 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                {t('onboardingTour.tourBadge')}
              </p>
              <CardTitle id="onboarding-tour-title" className="text-lg font-semibold leading-snug sm:text-xl">
                {t(def.titleKey)}
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[min(30vh,220px)] space-y-2 overflow-y-auto px-5 pb-2">
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line sm:text-[15px]">
                {t(def.bodyKey)}
              </p>
              {def.allowPointerThroughHighlight ? (
                <p className="rounded-lg border border-dashed border-primary/25 bg-primary/5 px-3 py-2 text-xs font-medium leading-snug text-primary">
                  {t('onboardingTour.exploreHint')}
                </p>
              ) : null}
              <p className="text-[11px] font-medium text-muted-foreground">
                {t('onboardingTour.stepCounter')
                  .replace('{current}', String(tourStep + 1))
                  .replace('{total}', String(TOUR_STEP_COUNT))}
              </p>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/10 bg-muted/20 px-5 py-3">
              <div className="flex gap-2">
                {tourStep > 0 ? (
                  <Button type="button" variant="outline" size="sm" onClick={goPrev}>
                    {t('onboardingTour.prev')}
                  </Button>
                ) : (
                  <span />
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={dismissAll}>
                  {t('onboardingTour.skip')}
                </Button>
                <Button type="button" size="sm" className="min-w-[6.75rem]" onClick={goNext}>
                  {isLast ? t('onboardingTour.done') : t('onboardingTour.next')}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </>
      ) : state.phase === 'tour' && def ? (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-4 pb-8">
          <Card
            className="pointer-events-auto w-full max-w-sm rounded-2xl border-2 border-primary/25 shadow-lg motion-safe:animate-tour-card-in motion-reduce:animate-none"
            style={{ zIndex: PORTAL_Z + 5 }}
          >
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              {t('onboardingTour.loadingStep')}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )

  return createPortal(portalTree, document.body)
}
