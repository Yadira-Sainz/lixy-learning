const CONFIG_STORAGE_KEY = 'lixy-config'

export const DEFAULT_DAILY_GOAL = 10
export const DEFAULT_CARDS_PER_SESSION = 20
export const DEFAULT_INCLUDE_TRANSLATION = false

export interface StoredConfig {
  dailyGoal?: string
  cardsPerSession?: string
  includeTranslation?: boolean
}

export function getStoredConfig(): StoredConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/** Old saves omitted includeTranslation; persist explicit default so UI and flashcards stay aligned. */
export function normalizeStoredConfigIncludeTranslation(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as StoredConfig
    if (typeof parsed.includeTranslation === 'boolean') return
    const next: StoredConfig = {
      ...parsed,
      includeTranslation: DEFAULT_INCLUDE_TRANSLATION,
    }
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function getDailyGoal(): number {
  const config = getStoredConfig()
  const value = config?.dailyGoal
  if (value != null) {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num > 0) return Math.min(num, 365)
  }
  return DEFAULT_DAILY_GOAL
}

export function getCardsPerSession(): number {
  const config = getStoredConfig()
  const value = config?.cardsPerSession
  if (value != null) {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num > 0) return Math.min(num, 100)
  }
  return DEFAULT_CARDS_PER_SESSION
}

export function getIncludeTranslation(): boolean {
  const config = getStoredConfig()
  return config?.includeTranslation ?? DEFAULT_INCLUDE_TRANSLATION
}

/**
 * Initializes learning-related localStorage for a newly created account.
 * Always uses app defaults (including translation off); does not reuse any
 * previous `lixy-config` from the same browser (e.g. another user or session).
 */
export function applyLearningDefaultsForNewAccount(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify({
      dailyGoal: String(DEFAULT_DAILY_GOAL),
      cardsPerSession: String(DEFAULT_CARDS_PER_SESSION),
      includeTranslation: DEFAULT_INCLUDE_TRANSLATION,
    })
  )
}

/**
 * Runs when the placement quiz finishes and the unified tour is queued.
 * DB-only resets (SQL) never clear browser `lixy-config`, so we persist
 * “include translation” off here so it matches a fresh learner UX.
 * Preserves daily goal / cards if already stored.
 */
export function ensureIncludeTranslationDefaultAfterPlacement(): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getStoredConfig()
    const next: StoredConfig = {
      dailyGoal:
        existing?.dailyGoal != null && String(existing.dailyGoal).trim() !== ''
          ? String(existing.dailyGoal)
          : String(DEFAULT_DAILY_GOAL),
      cardsPerSession:
        existing?.cardsPerSession != null && String(existing.cardsPerSession).trim() !== ''
          ? String(existing.cardsPerSession)
          : String(DEFAULT_CARDS_PER_SESSION),
      includeTranslation: DEFAULT_INCLUDE_TRANSLATION,
    }
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}
