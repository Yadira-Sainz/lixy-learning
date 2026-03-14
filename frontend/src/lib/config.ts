const CONFIG_STORAGE_KEY = 'lixy-config'

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
  return 7
}

export function getCardsPerSession(): number {
  const config = getStoredConfig()
  const value = config?.cardsPerSession
  if (value != null) {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num > 0) return Math.min(num, 100)
  }
  return 20
}

export function getIncludeTranslation(): boolean {
  const config = getStoredConfig()
  return config?.includeTranslation ?? true
}
