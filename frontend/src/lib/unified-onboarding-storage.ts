import { ensureIncludeTranslationDefaultAfterPlacement } from '@/lib/config'

const KEY = 'lixy-unified-onboarding'

export type UnifiedOnboardingState = {
  phase: 'intro' | 'tour'
  step: number
}

export function getUnifiedOnboarding(): UnifiedOnboardingState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UnifiedOnboardingState
    if (!parsed || typeof parsed.phase !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export function markUnifiedOnboardingAfterPlacement(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify({ phase: 'intro', step: 0 } satisfies UnifiedOnboardingState))
    ensureIncludeTranslationDefaultAfterPlacement()
  } catch {
    /* ignore */
  }
}

export function setUnifiedOnboardingTourStart(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify({ phase: 'tour', step: 0 } satisfies UnifiedOnboardingState))
  } catch {
    /* ignore */
  }
}

export function setUnifiedOnboardingStep(step: number): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify({ phase: 'tour', step } satisfies UnifiedOnboardingState))
  } catch {
    /* ignore */
  }
}

export function clearUnifiedOnboarding(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
