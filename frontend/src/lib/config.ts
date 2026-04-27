const CONFIG_STORAGE_KEY = 'lixy-config'

export const DEFAULT_DAILY_GOAL = 10
export const DEFAULT_CARDS_PER_SESSION = 20

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
  return config?.includeTranslation ?? true
}

/** Writes default daily streak goal and cards per session; keeps includeTranslation if already set. */
export function applyLearningDefaultsForNewAccount(): void {
  if (typeof window === 'undefined') return
  let includeTranslation = true
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as StoredConfig
      if (typeof parsed?.includeTranslation === 'boolean') {
        includeTranslation = parsed.includeTranslation
      }
    }
  } catch {
    /* ignore */
  }
  localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify({
      dailyGoal: String(DEFAULT_DAILY_GOAL),
      cardsPerSession: String(DEFAULT_CARDS_PER_SESSION),
      includeTranslation,
    })
  )
}
