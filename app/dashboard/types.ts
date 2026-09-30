/* ── Shared data shapes ──────────────────────────────────── */

export interface FoodLog {
  id:        string
  meal_name: string
  calories:  number
  protein_g: number
  carbs_g:   number
  fat_g:     number
}

export interface InitialHealthData {
  moodToday:          number | null
  moodHistory:        { date: string; value: number }[]
  waterTotal:         number
  waterLogs:          { id: string; amount_ml: number }[]
  kneeToday:          { pain_score: number; note: string | null } | null
  kneeHistory:        { date: string; value: number }[]
  suppLoggedToday:    boolean
  streaks:            { supplements: number; mood: number; knee: number; dutch: number }
  suppDates:          string[]
  moodDates:          string[]
  kneeDates:          string[]
  learnedWordIndices: number[]
  contributionData:   { date: string; count: number }[]
  foodLogs:           FoodLog[]
  trainingDoneToday:  string[]
}

export interface CalendarEventRaw {
  id: string
  time: string
  title: string
  location?: string
  durationMin: number
}

export interface CalendarEvent extends CalendarEventRaw {
  status: 'past' | 'now' | 'next' | 'upcoming'
}

export interface BitcoinData {
  price: number
  change24h: number
}

export interface HistDayData {
  moodScore:    number | null
  kneeScore:    number | null
  kneeNote:     string | null
  waterMl:      number
  suppLogged:   boolean
  trainingDone: string[]
}

/* ── Dashboard constants ─────────────────────────────────── */

export const READINESS     = 84
export const RING_R        = 68
export const circ          = 2 * Math.PI * RING_R
export const WATER_GOAL_ML = 2500

export const FALLBACK_RAW: CalendarEventRaw[] = [
  { id: '1', time: '07:30', durationMin: 40,  title: 'Morning run · 4.2km',         location: 'Het Park loop' },
  { id: '2', time: '09:30', durationMin: 90,  title: 'Linear Algebra II — lecture', location: 'Polak Building, room 1.20' },
  { id: '3', time: '12:15', durationMin: 60,  title: 'Lunch with Lotte',            location: 'Spanjaardstraat' },
  { id: '4', time: '14:00', durationMin: 180, title: 'Deep work — problem set 4',   location: 'University Library, 3F' },
  { id: '5', time: '18:30', durationMin: 90,  title: 'Climbing · Monk Bouldering',  location: 'With Daan & Pim' },
  { id: '6', time: '21:30', durationMin: 60,  title: 'Wind-down · reading',         location: 'Home' },
]
