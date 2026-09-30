'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { ChessData } from '@/lib/chess'
import { supabase } from '@/lib/supabase'
import { calcStreak } from '@/lib/utils/streak'
import { localIsoDate, amsterdamIsoDate } from '@/lib/utils/date'
import { createTimeoutSignal } from '@/lib/fetchWithTimeout'
import Clock from '@/components/Clock'
import { useCountdown } from '@/components/CountdownDisplay'
import { useWeather } from '@/lib/hooks/useWeather'
import { useNews } from '@/lib/hooks/useNews'
import { useExchange } from '@/lib/hooks/useExchange'
import { useAirQuality } from '@/lib/hooks/useAirQuality'
import { useNinja } from '@/lib/hooks/useNinja'
import { TrainingPanel, TRAINING, DAY_NAMES } from '@/components/panels/TrainingPanel'
import { DutchWordPanel, DUTCH_WORDS, getDailyWordIndex, speakDutch } from '@/components/panels/DutchWordPanel'
import { FoodPanel, CALORIE_GOAL, PROTEIN_GOAL } from '@/components/panels/FoodPanel'
import { SupplementPanel, SuppWindow, SUPP_WINDOWS, getWindowState } from '@/components/panels/SupplementPanel'
import { ExpandIcon, CardSkeleton, CardError } from '@/components/ui/DashboardPrimitives'
import { ContributionGrid } from '@/components/ContributionGrid'
import { TodayDetail, CountdownDetail } from '@/components/details/ScheduleDetails'
import { HealthDetail, MoodDetail, WaterDetail, KneeDetail, StreakDetail } from '@/components/details/HealthDetails'
import { WeatherDetail, AirQualityDetail } from '@/components/details/WeatherDetails'
import { InboxDetail } from '@/components/details/InboxDetail'
import { FinanceDetail } from '@/components/details/FinanceDetail'
import { ChessDetail } from '@/components/details/ChessDetail'
import { NewsDetail, ExchangeDetail, QuoteDetail } from '@/components/details/NewsDetails'
import { HistoricalDayDetail } from '@/components/details/HistoricalDayDetail'
import {
  buildSparkPath, ringColors, computeStatuses, fmtMins,
  kneeColor, moodColor, aqiColor, timeAgo, weatherIcon,
} from './helpers'
import type { InitialHealthData, FoodLog, CalendarEventRaw, BitcoinData, HistDayData } from './types'
import { READINESS, RING_R, circ, WATER_GOAL_ML, FALLBACK_RAW } from './types'

/* Re-export types consumed by page.tsx */
export type { InitialHealthData, FoodLog }

function fmtUpdated(fetchedAt: number | null): string {
  if (fetchedAt === null) return ''
  const mins = Math.floor((Date.now() - fetchedAt) / 60_000)
  return mins < 1 ? 'Updated just now' : `Updated ${mins} min ago`
}

export default function DashboardClient({
  userId, chess, initialHealth,
}: {
  userId: string
  chess: ChessData | null
  initialHealth: InitialHealthData
}) {
  /* ── Error banner ──────────────────────────────────────── */
  const [saveError, setSaveError] = useState<string | null>(null)
  useEffect(() => {
    if (!saveError) return
    const t = setTimeout(() => setSaveError(null), 8000)
    return () => clearTimeout(t)
  }, [saveError])

  function dbErr(label: string, error: { message: string } | null): boolean {
    if (!error) return false
    console.error(`[JARVIS] ${label}:`, error.message)
    setSaveError(`${label} — save failed`)
    return true
  }

  /* ── External data hooks ───────────────────────────────── */
  const { data: wxData, loading: wxLoading, error: wxError, refetch: refetchWx } = useWeather()
  const { data: newsData, loading: newsLoading, error: newsError } = useNews()
  const { data: exData, loading: exLoading, error: exError } = useExchange()
  const { data: aqData, loading: aqLoading, error: aqError, refetch: refetchAq } = useAirQuality()
  const { data: ninjaData, loading: ninjaLoading } = useNinja()

  /* ── Clock / countdown ─────────────────────────────────── */
  const [minuteOfDay, setMinuteOfDay] = useState(0)
  const [greeting,    setGreeting]    = useState('')
  const [dayLabel,    setDayLabel]    = useState('')
  // Minute-granular: the card shows no seconds, and a per-second countdown here
  // would re-render the whole dashboard tree every second (CountdownDetail owns
  // its own per-second useCountdown for the live seconds stat).
  const countdown = useCountdown(false)

  const handleMinuteChange = useCallback((min: number, g: string, dl: string) => {
    setMinuteOfDay(min)
    setGreeting(g)
    setDayLabel(dl)
  }, [])

  /* ── State ─────────────────────────────────────────────── */
  const [ringOffset, setRingOffset] = useState(circ)
  const [bitcoin,    setBitcoin]    = useState<BitcoinData | null>(null)
  const [rawEvents,  setRawEvents]  = useState<CalendarEventRaw[]>([])

  const [moodToday,   setMoodToday]   = useState<number | null>(initialHealth.moodToday)
  const [moodHistory, setMoodHistory] = useState(initialHealth.moodHistory)

  const [waterMl,   setWaterMl]   = useState(initialHealth.waterTotal)
  const [waterLogs, setWaterLogs] = useState<{ id: string; amount_ml: number }[]>(initialHealth.waterLogs)

  const [foodLogs,  setFoodLogs]  = useState<FoodLog[]>(initialHealth.foodLogs)

  const [kneeScore,   setKneeScore]   = useState<number | null>(initialHealth.kneeToday?.pain_score ?? null)
  const [kneeNote,    setKneeNote]    = useState(initialHealth.kneeToday?.note ?? '')
  const [kneeHistory, setKneeHistory] = useState(initialHealth.kneeHistory)

  const [suppWindowList,   setSuppWindowList]   = useState<SuppWindow[]>(SUPP_WINDOWS)
  const [checkedSupps,     setCheckedSupps]     = useState<Set<string>>(new Set())
  const [suppLoggedToday,  setSuppLoggedToday]  = useState(initialHealth.suppLoggedToday)

  const [suppDates, setSuppDates] = useState<string[]>(initialHealth.suppDates)
  const [moodDates, setMoodDates] = useState<string[]>(initialHealth.moodDates)
  const [kneeDates, setKneeDates] = useState<string[]>(initialHealth.kneeDates)
  const streaks = useMemo(() => ({
    supplements: calcStreak(suppDates),
    mood:        calcStreak(moodDates),
    knee:        calcStreak(kneeDates),
  }), [suppDates, moodDates, kneeDates])

  const [trainingDone, setTrainingDone] = useState<Set<string>>(new Set(initialHealth.trainingDoneToday))

  const [glassVol,     setGlassVol]    = useState(250)
  const [browsedDate,  setBrowsedDate] = useState<string | null>(null)
  const [histData,     setHistData]    = useState<HistDayData | null>(null)
  const [histLoading,  setHistLoading] = useState(false)
  const [overlayCard,  setOverlayCard] = useState<string | null>(null)

  const [calendarOpen,     setCalendarOpen]     = useState(false)
  const [calPickerYear,    setCalPickerYear]    = useState(0)
  const [calPickerMonth,   setCalPickerMonth]   = useState(0)
  const [calYearView,      setCalYearView]      = useState(false)
  const [calYearPageStart, setCalYearPageStart] = useState(0)

  /* ── Fetch timestamps for "Updated X min ago" labels ──── */
  const [weatherFetchedAt,  setWeatherFetchedAt]  = useState<number | null>(null)
  const [aqiFetchedAt,      setAqiFetchedAt]      = useState<number | null>(null)
  const [exchangeFetchedAt, setExchangeFetchedAt] = useState<number | null>(null)
  const [, setMinuteTick] = useState(0)

  /* ── Client-side date/time state ───────────────────────── */
  const [todayDayIdx, setTodayDayIdx] = useState(0)
  const [todayStr,    setTodayStr]    = useState('')
  const [dailyWord,   setDailyWord]   = useState<typeof DUTCH_WORDS[number]>(DUTCH_WORDS[0])

  /* ── Effects ───────────────────────────────────────────── */

  useEffect(() => { setTodayDayIdx(new Date().getDay()) }, [])
  useEffect(() => { setTodayStr(amsterdamIsoDate()) }, [])
  useEffect(() => { setDailyWord(DUTCH_WORDS[getDailyWordIndex()]) }, [])

  useEffect(() => {
    const t = setTimeout(() => setRingOffset(circ * (1 - READINESS / 100)), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const id = setInterval(refetchWx, 10 * 60 * 1_000)
    return () => clearInterval(id)
  }, [refetchWx])

  useEffect(() => {
    const id = setInterval(refetchAq, 10 * 60 * 1_000)
    return () => clearInterval(id)
  }, [refetchAq])

  useEffect(() => {
    const { signal, clear } = createTimeoutSignal(8000)
    let cancelled = false
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur&include_24hr_change=true', { signal })
      .then(r => r.json())
      .then(d => {
        if (!cancelled && d?.bitcoin?.eur != null) {
          setBitcoin({ price: Math.round(d.bitcoin.eur), change24h: Math.round(d.bitcoin.eur_24h_change * 100) / 100 })
        }
      })
      .catch(err => { if (!cancelled && !signal.aborted) console.error('[bitcoin]', err) })
      .finally(clear)
    return () => { cancelled = true; clear() }
  }, [])

  useEffect(() => {
    fetch('/api/calendar').then(r => r.json()).then(d => { if (d.events) setRawEvents(d.events) }).catch(() => {})
  }, [])

  const trainingDoneTodayLength = initialHealth.trainingDoneToday.length
  useEffect(() => {
    const today = amsterdamIsoDate()
    try {
      const suppList = localStorage.getItem('jarvis_supplements_list')
      if (suppList) {
        try {
          const parsed = JSON.parse(suppList)
          if (Array.isArray(parsed) && parsed.every((w: unknown) =>
            typeof (w as SuppWindow).id === 'string' &&
            Array.isArray((w as SuppWindow).items) &&
            (w as SuppWindow).items.every(i => typeof i?.id === 'string' && typeof i?.name === 'string')
          )) {
            setSuppWindowList(parsed as SuppWindow[])
          }
        } catch {}
      }

      const supps = localStorage.getItem(`jarvis_${today}_supps`)
      if (supps) {
        try {
          const arr = JSON.parse(supps)
          if (Array.isArray(arr) && arr.every((s: unknown) => typeof s === 'string')) {
            setCheckedSupps(new Set(arr as string[]))
          }
        } catch {}
      }

      if (trainingDoneTodayLength === 0) {
        const training = localStorage.getItem(`jarvis_${today}_training`)
        if (training) {
          try {
            const arr = JSON.parse(training)
            if (Array.isArray(arr) && arr.every((s: unknown) => typeof s === 'string')) {
              setTrainingDone(new Set(arr as string[]))
            }
          } catch {}
        }
      }

      const mood = localStorage.getItem(`jarvis_${today}_mood`)
      if (mood !== null) { const n = parseInt(mood, 10); if (n >= 1 && n <= 10) setMoodToday(n) }

      const knee = localStorage.getItem(`jarvis_${today}_knee`)
      if (knee) {
        const k = JSON.parse(knee) as { score?: number; note?: string }
        // Range-check: saveKneeNote writes kneeScore back to the DB, so an
        // out-of-range localStorage value must not become state.
        if (typeof k.score === 'number' && k.score >= 0 && k.score <= 10) setKneeScore(k.score)
        if (typeof k.note  === 'string') setKneeNote(k.note.slice(0, 500))
      }

      const vol = localStorage.getItem('jarvis_glass_volume')
      if (vol) { const n = parseInt(vol, 10); if (n > 0 && n <= 2000) setGlassVol(n) }

      // Prune stale per-day keys (jarvis_YYYY-MM-DD_*) — each is only ever read
      // on its own day, and without cleanup they accumulate forever (4/day).
      // Backward iteration keeps indices valid while removing.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        const m = key?.match(/^jarvis_(\d{4}-\d{2}-\d{2})_/)
        if (m && m[1] !== today) localStorage.removeItem(key!)
      }
    } catch {}
  }, [trainingDoneTodayLength])

  useEffect(() => {
    document.body.style.overflow = overlayCard ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [overlayCard])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOverlayCard(null) }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  const calendarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!calendarOpen) return
    function onOutside(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [calendarOpen])

  useEffect(() => { if (wxData)  setWeatherFetchedAt(Date.now()) }, [wxData])
  useEffect(() => { if (aqData)  setAqiFetchedAt(Date.now()) },    [aqData])
  useEffect(() => { if (exData)  setExchangeFetchedAt(Date.now()) }, [exData])
  useEffect(() => {
    const id = setInterval(() => setMinuteTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  /* ── Computed values ───────────────────────────────────── */

  const displayEvents = useMemo(
    () => computeStatuses(rawEvents.length > 0 ? rawEvents : FALLBACK_RAW, minuteOfDay),
    [rawEvents, minuteOfDay]
  )

  const nowEvent  = displayEvents.find(e => e.status === 'now')
  const nextEvent = nowEvent ?? displayEvents.find(e => e.status === 'next') ?? displayEvents.find(e => e.status === 'upcoming')

  const greetingContext = useMemo(() => {
    if (nowEvent) return `${nowEvent.title} is happening now${nowEvent.location ? ` · ${nowEvent.location}` : ''}.`
    if (!nextEvent) return 'All events done for today. Good work.'
    const [h, m] = nextEvent.time.split(':').map(Number)
    const diff = h * 60 + m - minuteOfDay
    if (diff <= 0) return `${nextEvent.title} starting now.`
    const diffStr = diff >= 60 ? `${Math.floor(diff/60)}h ${diff%60}m` : `${diff}m`
    return `${nextEvent.title} in ${diffStr}${nextEvent.location ? ` · ${nextEvent.location}` : ''}.`
  }, [nowEvent, nextEvent, minuteOfDay])

  const btcPrice = bitcoin ? `€${bitcoin.price.toLocaleString('en-GB')}` : '—'
  const btcChg   = bitcoin ? `${bitcoin.change24h >= 0 ? '+' : ''}${bitcoin.change24h.toFixed(2)}%` : '—'
  const btcUp    = bitcoin ? bitcoin.change24h >= 0 : true

  const chessHist  = chess?.eloHistory?.slice(-20) ?? []
  const chessSpark = chessHist.length >= 3 ? buildSparkPath(chessHist, 240, 60) : null

  const winState   = getWindowState(minuteOfDay, suppWindowList)
  const totalSupps = suppWindowList.reduce((s, w) => s + w.items.length, 0)
  const suppPct    = totalSupps > 0 ? Math.round((checkedSupps.size / totalSupps) * 100) : 0
  const winItems   = winState.window.items ?? []

  const rc          = ringColors(READINESS)
  const waterPct    = Math.min(100, Math.round((waterMl / WATER_GOAL_ML) * 100))
  const waterLiters = (waterMl / 1000).toFixed(1)

  const moodSpark = buildSparkPath(moodHistory.map(h => h.value), 200, 44)
  const kneeSpark = buildSparkPath(kneeHistory.map(h => h.value), 200, 44)

  const todayTraining = TRAINING[todayDayIdx]

  const foodTotals = useMemo(() => foodLogs.reduce(
    (a, f) => ({ calories: a.calories + f.calories, protein_g: a.protein_g + f.protein_g }),
    { calories: 0, protein_g: 0 }
  ), [foodLogs])
  const foodKcalPct    = Math.min(100, Math.round((foodTotals.calories  / CALORIE_GOAL) * 100))
  const foodProteinPct = Math.min(100, Math.round((foodTotals.protein_g / PROTEIN_GOAL) * 100))

  const browseCancelRef = useRef(0)
  // Session cache for browsed days — past days are immutable (writes only ever
  // target today), so a day fetched once needs no repeat round-trips.
  const histCacheRef = useRef<Map<string, HistDayData>>(new Map())

  // In-flight guards so rapid taps don't race the DB into a UI/DB mismatch.
  const trainingInFlightRef = useRef<Set<string>>(new Set())
  const suppDayInFlightRef  = useRef(false)
  // Mirrors the latest foodLogs synchronously so back-to-back food mutations
  // compute from fresh state (plain setState closures would otherwise be stale).
  const foodLogsRef = useRef<FoodLog[]>(foodLogs)

  const browseDayFnRef    = useRef<(d: string) => void>(() => {})
  const browsedDateRefNav = useRef<string | null>(null)
  const todayStrRefNav    = useRef('')

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'ArrowLeft') {
        const base = browsedDateRefNav.current ?? todayStrRefNav.current
        if (!base) return
        const d = new Date(base + 'T12:00:00')
        d.setDate(d.getDate() - 1)
        browseDayFnRef.current(localIsoDate(d))
      } else if (e.key === 'ArrowRight') {
        const base = browsedDateRefNav.current ?? todayStrRefNav.current
        if (!base) return
        const d = new Date(base + 'T12:00:00')
        d.setDate(d.getDate() + 1)
        const iso = localIsoDate(d)
        const today = todayStrRefNav.current
        if (today && iso > today) return
        browseDayFnRef.current(iso)
      } else if (e.key === 't' || e.key === 'T') {
        const today = todayStrRefNav.current
        if (today) browseDayFnRef.current(today)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Day rollover: if the tab is left open past local (Amsterdam) midnight, refresh
  // todayStr / day index and clear per-day state so toggles write to the new day's
  // key instead of yesterday's. todayStrRefNav holds the current todayStr value.
  useEffect(() => {
    const id = setInterval(() => {
      const nowStr = amsterdamIsoDate()
      if (todayStrRefNav.current && todayStrRefNav.current !== nowStr) {
        setTodayStr(nowStr)
        setTodayDayIdx(new Date().getDay())
        setCheckedSupps(new Set())
        setTrainingDone(new Set())
        setMoodToday(null)
        setKneeScore(null)
        setKneeNote('')
        setSuppLoggedToday(false)
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  if (!userId) { console.error('[JARVIS] missing userId — aborting render'); return null }

  const wxHours = wxData ? [
    { t: 'NOW', i: weatherIcon(wxData.current.description), v: `${wxData.current.temp}°` },
    ...wxData.forecast.slice(0, 4).map(f => ({
      t: String(new Date(f.dt * 1000).getHours()),
      i: weatherIcon(f.description),
      v: `${f.temp_max}°`,
    })),
  ] : [
    { t: 'NOW', i: 'partly', v: '—°' },
    { t: '—', i: 'partly', v: '—°' },
    { t: '—', i: 'partly', v: '—°' },
    { t: '—', i: 'partly', v: '—°' },
    { t: '—', i: 'partly', v: '—°' },
  ]

  /* ── Supabase write handlers ───────────────────────────── */

  async function logMood(score: number) {
    const today = amsterdamIsoDate()
    try { localStorage.setItem(`jarvis_${today}_mood`, String(score)) } catch {}
    setMoodToday(score)
    setMoodHistory(prev => {
      const rest = prev.filter(h => h.date !== today)
      return [...rest, { date: today, value: score }].sort((a, b) => a.date.localeCompare(b.date))
    })
    const { error } = await supabase.from('mood_logs').upsert(
      { user_id: userId, logged_date: today, score },
      { onConflict: 'user_id,logged_date' }
    )
    dbErr('mood_logs upsert', error)
    if (!error) setMoodDates(prev => prev.includes(today) ? prev : [...prev, today])
  }

  async function addWater() {
    const vol = glassVol
    setWaterMl(prev => prev + vol)
    const { data, error } = await supabase.from('water_logs')
      .insert({ user_id: userId, amount_ml: vol })
      .select('id')
      .single()
    if (error) {
      dbErr('water_logs insert', error)
      setWaterMl(prev => Math.max(0, prev - vol))
      return
    }
    if (data?.id) setWaterLogs(prev => [...prev, { id: data.id as string, amount_ml: vol }])
  }

  async function deleteWaterEntry(id: string) {
    const idx = waterLogs.findIndex(l => l.id === id)
    if (idx === -1) return
    const entry = waterLogs[idx]
    setWaterMl(prev => Math.max(0, prev - entry.amount_ml))
    setWaterLogs(prev => prev.filter(l => l.id !== id))
    const { data: deleted, error } = await supabase
      .from('water_logs').delete()
      .eq('id', id).eq('user_id', userId)
      .select('id')
    if (error || !deleted?.length) {
      dbErr('water_logs delete', error ?? { message: 'RLS blocked: 0 rows deleted — run the water_logs delete policy SQL in Supabase' })
      setWaterMl(prev => prev + entry.amount_ml)
      setWaterLogs(prev => prev.some(l => l.id === entry.id) ? prev : [...prev, entry])
    }
  }

  function changeGlassVol(ml: number) {
    const v = Math.min(2000, Math.max(1, Math.round(ml)))
    setGlassVol(v)
    try { localStorage.setItem('jarvis_glass_volume', String(v)) } catch {}
  }

  async function logKnee(score: number) {
    const today = amsterdamIsoDate()
    try { localStorage.setItem(`jarvis_${today}_knee`, JSON.stringify({ score, note: kneeNote })) } catch {}
    setKneeScore(score)
    setKneeHistory(prev => {
      const rest = prev.filter(h => h.date !== today)
      return [...rest, { date: today, value: score }].sort((a, b) => a.date.localeCompare(b.date))
    })
    const { error } = await supabase.from('knee_logs').upsert(
      { user_id: userId, logged_date: today, pain_score: score, note: kneeNote.slice(0, 500) || null },
      { onConflict: 'user_id,logged_date' }
    )
    dbErr('knee_logs upsert', error)
    if (!error) setKneeDates(prev => prev.includes(today) ? prev : [...prev, today])
  }

  async function saveKneeNote() {
    if (kneeScore === null) return
    const today = amsterdamIsoDate()
    try { localStorage.setItem(`jarvis_${today}_knee`, JSON.stringify({ score: kneeScore, note: kneeNote })) } catch {}
    const { error } = await supabase.from('knee_logs').upsert(
      { user_id: userId, logged_date: today, pain_score: kneeScore, note: kneeNote.slice(0, 500) || null },
      { onConflict: 'user_id,logged_date' }
    )
    dbErr('knee_logs note upsert', error)
  }

  async function logSuppComplete() {
    if (suppLoggedToday || suppDayInFlightRef.current) return
    suppDayInFlightRef.current = true
    setSuppLoggedToday(true)
    const today = amsterdamIsoDate()
    const { error } = await supabase.from('supplement_logs').upsert(
      { user_id: userId, logged_date: today },
      { onConflict: 'user_id,logged_date' }
    )
    suppDayInFlightRef.current = false
    if (error) { dbErr('supplement_logs upsert', error); setSuppLoggedToday(false); return }
    setSuppDates(prev => prev.includes(today) ? prev : [...prev, today])
  }

  async function unlogSuppDay() {
    if (!suppLoggedToday || suppDayInFlightRef.current) return
    suppDayInFlightRef.current = true
    setSuppLoggedToday(false)
    const today = amsterdamIsoDate()
    const { error } = await supabase.from('supplement_logs')
      .delete().eq('user_id', userId).eq('logged_date', today)
    suppDayInFlightRef.current = false
    if (error) { dbErr('supplement_logs delete', error); setSuppLoggedToday(true); return }
    setSuppDates(prev => prev.filter(d => d !== today))
  }

  function handleSuppWindowsChange(windows: SuppWindow[]) {
    setSuppWindowList(windows)
    try { localStorage.setItem('jarvis_supplements_list', JSON.stringify(windows)) } catch {}
  }

  function toggleSupp(id: string) {
    setCheckedSupps(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      const today = amsterdamIsoDate()
      try { localStorage.setItem(`jarvis_${today}_supps`, JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  async function toggleTraining(key: string) {
    if (trainingInFlightRef.current.has(key)) return
    trainingInFlightRef.current.add(key)
    const today    = amsterdamIsoDate()
    const isAdding = !trainingDone.has(key)
    setTrainingDone(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      try { localStorage.setItem(`jarvis_${today}_training`, JSON.stringify(Array.from(next))) } catch {}
      return next
    })
    try {
      if (isAdding) {
        const { error } = await supabase.from('training_logs').upsert({ user_id: userId, logged_date: today, session_key: key })
        if (error) { dbErr('training_logs upsert', error); setTrainingDone(prev => { const n = new Set(prev); n.delete(key); return n }) }
      } else {
        const { error } = await supabase.from('training_logs').delete()
          .eq('user_id', userId).eq('logged_date', today).eq('session_key', key)
        if (error) { dbErr('training_logs delete', error); setTrainingDone(prev => { const n = new Set(prev); n.add(key); return n }) }
      }
    } finally {
      trainingInFlightRef.current.delete(key)
    }
  }

  async function upsertNutritionTotals(logs: FoodLog[]) {
    const today = amsterdamIsoDate()
    if (logs.length === 0) {
      const { error } = await supabase.from('nutrition_logs')
        .delete().eq('user_id', userId).eq('date', today)
      dbErr('nutrition_logs delete', error)
      return
    }
    const totals = logs.reduce(
      (acc, f) => ({
        calories:  acc.calories  + (f.calories  ?? 0),
        protein_g: acc.protein_g + (f.protein_g ?? 0),
        carbs_g:   acc.carbs_g   + (f.carbs_g   ?? 0),
        fat_g:     acc.fat_g     + (f.fat_g     ?? 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    )
    const { error } = await supabase.from('nutrition_logs').upsert(
      { user_id: userId, date: today, ...totals },
      { onConflict: 'user_id,date' }
    )
    dbErr('nutrition_logs upsert', error)
  }

  async function addFood(entry: Omit<FoodLog, 'id'>) {
    const today = amsterdamIsoDate()
    const { data, error } = await supabase.from('food_logs')
      .insert({ user_id: userId, logged_date: today, ...entry })
      .select('id').single()
    if (error || !data?.id) {
      dbErr('food_logs insert', error ?? { message: 'no id returned' })
      return
    }
    const updatedLogs = [...foodLogsRef.current, { id: data.id as string, ...entry }]
    foodLogsRef.current = updatedLogs
    setFoodLogs(updatedLogs)
    upsertNutritionTotals(updatedLogs)
  }

  async function editFood(id: string, entry: Omit<FoodLog, 'id'>) {
    const { error } = await supabase.from('food_logs').update(entry).eq('id', id).eq('user_id', userId)
    if (error) { dbErr('food_logs update', error); return }
    const updatedLogs = foodLogsRef.current.map(f => f.id === id ? { ...f, ...entry } : f)
    foodLogsRef.current = updatedLogs
    setFoodLogs(updatedLogs)
    upsertNutritionTotals(updatedLogs)
  }

  async function deleteFood(id: string) {
    const current = foodLogsRef.current
    const idx = current.findIndex(f => f.id === id)
    if (idx === -1) return
    const entry = current[idx]
    const updatedLogs = current.filter(f => f.id !== id)
    foodLogsRef.current = updatedLogs
    setFoodLogs(updatedLogs)
    const { error } = await supabase.from('food_logs').delete().eq('id', id).eq('user_id', userId)
    if (error) {
      dbErr('food_logs delete', error)
      const restored = [...foodLogsRef.current]
      restored.splice(Math.min(idx, restored.length), 0, entry)
      foodLogsRef.current = restored
      setFoodLogs(restored)
      return
    }
    await upsertNutritionTotals(updatedLogs)
  }

  async function editWaterEntry(id: string, newAmount: number) {
    const old = waterLogs.find(l => l.id === id)
    if (!old) return
    setWaterMl(prev => Math.max(0, prev - old.amount_ml + newAmount))
    setWaterLogs(prev => prev.map(l => l.id === id ? { ...l, amount_ml: newAmount } : l))
    const { error } = await supabase.from('water_logs').update({ amount_ml: newAmount }).eq('id', id).eq('user_id', userId)
    if (error) {
      dbErr('water_logs update', error)
      setWaterMl(prev => Math.max(0, prev + old.amount_ml - newAmount))
      setWaterLogs(prev => prev.map(l => l.id === id ? { ...l, amount_ml: old.amount_ml } : l))
    }
  }

  /* ── Day browser ───────────────────────────────────────── */

  async function browseDay(dateStr: string) {
    const todayIso = amsterdamIsoDate()
    ++browseCancelRef.current
    if (dateStr >= todayIso) { setHistLoading(false); setBrowsedDate(null); setHistData(null); return }
    const cached = histCacheRef.current.get(dateStr)
    if (cached) {
      setBrowsedDate(dateStr)
      setHistLoading(false)
      setHistData(cached)
      setOverlayCard('histday')
      return
    }
    const myToken = browseCancelRef.current
    setBrowsedDate(dateStr)
    setHistLoading(true)
    setHistData(null)
    try {
      // Water is bucketed by Amsterdam local day (matching page.tsx). Fetch a UTC
      // window wide enough to contain the whole Amsterdam day, then filter by the
      // Amsterdam date so late-evening / early-morning glasses land on the right day.
      const noon    = new Date(dateStr + 'T12:00:00')
      const prevStr = localIsoDate(new Date(noon.getFullYear(), noon.getMonth(), noon.getDate() - 1))
      const nextStr = localIsoDate(new Date(noon.getFullYear(), noon.getMonth(), noon.getDate() + 1))
      const [moodRes, kneeRes, waterRes, suppRes, trainRes] = await Promise.all([
        supabase.from('mood_logs').select('score').eq('user_id', userId).eq('logged_date', dateStr).limit(1),
        supabase.from('knee_logs').select('pain_score, note').eq('user_id', userId).eq('logged_date', dateStr).limit(1),
        supabase.from('water_logs').select('amount_ml, logged_at').eq('user_id', userId)
          .gte('logged_at', `${prevStr}T00:00:00Z`).lt('logged_at', `${nextStr}T00:00:00Z`),
        supabase.from('supplement_logs').select('logged_date').eq('user_id', userId).eq('logged_date', dateStr),
        supabase.from('training_logs').select('session_key').eq('user_id', userId).eq('logged_date', dateStr),
      ])
      if (browseCancelRef.current !== myToken) return
      const dayData: HistDayData = {
        moodScore:    moodRes.data?.[0]?.score   ?? null,
        kneeScore:    kneeRes.data?.[0]?.pain_score ?? null,
        kneeNote:     kneeRes.data?.[0]?.note    ?? null,
        waterMl:      (waterRes.data ?? [])
                        .filter((r: { logged_at: string }) => amsterdamIsoDate(new Date(r.logged_at)) === dateStr)
                        .reduce((s: number, r: { amount_ml: number }) => s + (r.amount_ml ?? 0), 0),
        suppLogged:   (suppRes.data?.length  ?? 0) > 0,
        trainingDone: (trainRes.data ?? []).map((r: { session_key: string }) => r.session_key),
      }
      histCacheRef.current.set(dateStr, dayData)
      setHistData(dayData)
      setOverlayCard('histday')
    } catch (err) {
      console.error('[JARVIS] browseDay failed:', err)
    } finally {
      if (browseCancelRef.current === myToken) setHistLoading(false)
    }
  }

  browseDayFnRef.current    = browseDay
  browsedDateRefNav.current = browsedDate
  todayStrRefNav.current    = todayStr

  function navHistDay(delta: number) {
    const base = browsedDate ?? amsterdamIsoDate()
    const next = new Date(base + 'T12:00:00'); next.setDate(next.getDate() + delta)
    browseDay(localIsoDate(next))
  }

  /* ── Detail overlay views ─────────────────────────────── */

  const detailViews: Record<string, React.ReactNode> = {
    today:       <TodayDetail events={displayEvents} />,
    health:      <HealthDetail />,
    weather:     <WeatherDetail wxData={wxData} wxLoading={wxLoading} wxError={wxError} />,
    inbox:       <InboxDetail />,
    finance:     <FinanceDetail bitcoin={bitcoin} />,
    chess:       <ChessDetail data={chess} />,
    countdown:   <CountdownDetail />,
    supplements: <SupplementPanel checked={checkedSupps} onToggle={toggleSupp} minuteOfDay={minuteOfDay} suppLoggedToday={suppLoggedToday} onLogComplete={logSuppComplete} onUnlog={unlogSuppDay} suppWindows={suppWindowList} onSuppWindowsChange={handleSuppWindowsChange} />,
    dutch:       <DutchWordPanel dailyWord={dailyWord} />,
    mood:        <MoodDetail moodToday={moodToday} moodHistory={moodHistory} onLog={logMood} />,
    water:       <WaterDetail waterMl={waterMl} waterLogs={waterLogs} glassVol={glassVol} onAdd={addWater} onDeleteEntry={deleteWaterEntry} onEditEntry={editWaterEntry} onChangeVol={changeGlassVol} />,
    knee:        <KneeDetail kneeScore={kneeScore} kneeNote={kneeNote} kneeHistory={kneeHistory} onLog={logKnee} onNoteChange={setKneeNote} onSaveNote={saveKneeNote} />,
    training:    <TrainingPanel trainingDone={trainingDone} onToggle={toggleTraining} todayDayIdx={todayDayIdx} />,
    streaks:     <StreakDetail streaks={streaks} />,
    food:        <FoodPanel foodLogs={foodLogs} onAdd={addFood} onEdit={editFood} onDelete={deleteFood} />,
    news:        <NewsDetail newsData={newsData} newsLoading={newsLoading} newsError={newsError} />,
    exchange:    <ExchangeDetail exData={exData} exLoading={exLoading} exError={exError} />,
    airquality:  <AirQualityDetail aqData={aqData} aqLoading={aqLoading} aqError={aqError} />,
    quote:       <QuoteDetail ninjaData={ninjaData} ninjaLoading={ninjaLoading} />,
    histday:     <HistoricalDayDetail date={browsedDate ?? ''} data={histData} loading={histLoading} onNav={navHistDay} />,
  }

  /* ── Render ───────────────────────────────────────────── */

  return (
    <>
      {saveError && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'oklch(0.40 0.20 25)', color: '#fff',
          fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '0.04em',
          padding: '12px 20px', textAlign: 'center',
          borderBottom: '1px solid oklch(0.60 0.22 25)',
        }}>
          ⚠ DB ERROR — {saveError}
        </div>
      )}

      <div className="aurora" aria-hidden="true">
        <span className="blob b1" /><span className="blob b2" /><span className="blob b3" />
        <span className="blob b4" /><span className="blob b5" />
      </div>
      <div className="grain" aria-hidden="true" />

      <main className="dash">

        {/* Top bar */}
        <header className="topbar">
          <div className="col gap-2">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <div className="col">
                <span className="brand-name">JARVIS</span>
                <span className="brand-sub">PERSONAL OS · v0.5</span>
              </div>
            </div>
          </div>
          <div className="topbar-right">
            <span className="status-pill"><span className="dot" />ALL SYSTEMS NOMINAL</span>
            <div className="clock">
              <Clock onMinuteChange={handleMinuteChange} />
            </div>
            <form action="/auth/signout" method="POST">
              <button type="submit" className="signout-btn">SIGN OUT</button>
            </form>
          </div>
        </header>

        {/* Greeting */}
        <section className="greeting">
          <h1 className="greeting-hello">Good {greeting || 'day'}, Mark.{dayLabel && <> <em>{dayLabel}.</em></>}</h1>
          <p className="greeting-context">{greetingContext}</p>
        </section>

        {/* Day navigator */}
        {todayStr && (() => {
          const baseDate = new Date((browsedDate ?? todayStr) + 'T12:00:00')
          const prevDay  = new Date(baseDate); prevDay.setDate(prevDay.getDate() - 1)
          const nextDay  = new Date(baseDate); nextDay.setDate(nextDay.getDate() + 1)
          const nextStr  = localIsoDate(nextDay)
          const isToday  = !browsedDate
          const label    = isToday
            ? `${baseDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()} · TODAY`
            : baseDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()

          // Calendar helpers
          const todayDate  = new Date(todayStr + 'T12:00:00')
          const canCalNext = calPickerYear < todayDate.getFullYear() ||
            (calPickerYear === todayDate.getFullYear() && calPickerMonth < todayDate.getMonth())
          const calFirst    = new Date(calPickerYear, calPickerMonth, 1)
          const calLast     = new Date(calPickerYear, calPickerMonth + 1, 0)
          const calPad      = (calFirst.getDay() + 6) % 7
          const calDays: Array<Date | null> = []
          for (let i = 0; i < calPad; i++) calDays.push(null)
          for (let d = 1; d <= calLast.getDate(); d++) calDays.push(new Date(calPickerYear, calPickerMonth, d))
          const calMonthName  = calFirst.toLocaleDateString('en-GB', { month: 'long' }).toUpperCase()

          function navCalMonth(delta: number) {
            let y = calPickerYear, m = calPickerMonth + delta
            if (m < 0)  { m = 11; y-- }
            if (m > 11) { m = 0;  y++ }
            setCalPickerYear(y); setCalPickerMonth(m)
          }

          function selectCalDay(d: Date) {
            setCalendarOpen(false)
            browseDay(localIsoDate(d))
          }

          return (
            <div className="day-nav">
              <button className="day-nav-arrow" onClick={() => browseDay(localIsoDate(prevDay))}>←</button>
              <div ref={calendarRef} style={{ position: 'relative' }}>
                <button
                  className={`day-nav-date${isToday ? '' : ' browsing'}`}
                  style={{ cursor: 'pointer', background: 'none', border: 'none', font: 'inherit', color: 'inherit', padding: 0, letterSpacing: 'inherit', textTransform: 'inherit' }}
                  onClick={() => {
                    if (calendarOpen) { setCalendarOpen(false); return }
                    const base = browsedDate ?? todayStr
                    const d = new Date(base + 'T12:00:00')
                    setCalPickerYear(d.getFullYear())
                    setCalPickerMonth(d.getMonth())
                    setCalYearView(false)
                    setCalYearPageStart(d.getFullYear() - 5)
                    setCalendarOpen(true)
                  }}
                >
                  {label}
                </button>
                {calendarOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', left: '50%',
                    transform: 'translateX(-50%)', zIndex: 500, minWidth: 256,
                    background: 'rgba(4, 8, 18, 0.97)',
                    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14,
                    boxShadow: '0 16px 56px rgba(0,0,0,0.80)', padding: '14px 10px',
                    fontFamily: 'var(--mono)',
                  }}>
                    {calYearView ? (
                      <>
                        {/* Year view header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <button
                            onClick={() => setCalYearPageStart(s => s - 12)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '4px 8px', fontFamily: 'var(--mono)' }}
                          >←</button>
                          <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.82)', fontWeight: 600 }}>
                            {calYearPageStart} – {calYearPageStart + 11}
                          </span>
                          <button
                            onClick={() => setCalYearPageStart(s => s + 12)}
                            disabled={calYearPageStart + 12 > todayDate.getFullYear()}
                            style={{ background: 'none', border: 'none', color: calYearPageStart + 12 <= todayDate.getFullYear() ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.16)', cursor: calYearPageStart + 12 <= todayDate.getFullYear() ? 'pointer' : 'default', fontSize: 14, lineHeight: 1, padding: '4px 8px', fontFamily: 'var(--mono)' }}
                          >→</button>
                        </div>
                        {/* Year cells — 3×4 grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                          {Array.from({ length: 12 }, (_, i) => calYearPageStart + i).map(yr => {
                            const isFutYr = yr > todayDate.getFullYear()
                            const isSel   = yr === calPickerYear
                            const isTodYr = yr === todayDate.getFullYear()
                            let bg = 'transparent'
                            let fg = isFutYr ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.68)'
                            if (isTodYr && isSel)  { bg = 'oklch(0.38 0.20 165)'; fg = 'oklch(0.95 0.08 165)' }
                            else if (isTodYr)      { bg = 'oklch(0.28 0.20 145)'; fg = 'oklch(0.90 0.14 145)' }
                            else if (isSel)        { bg = 'oklch(0.26 0.20 220)'; fg = 'oklch(0.92 0.10 220)' }
                            return (
                              <button
                                key={yr}
                                disabled={isFutYr}
                                onClick={() => { setCalPickerYear(yr); setCalYearView(false) }}
                                className="cal-day-btn"
                                style={{ background: bg, color: fg, cursor: isFutYr ? 'default' : 'pointer', fontSize: 10, letterSpacing: '0.04em' }}
                              >
                                {yr}
                              </button>
                            )
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Month header — year label is clickable to enter year view */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <button
                            onClick={() => navCalMonth(-1)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '4px 8px', fontFamily: 'var(--mono)' }}
                          >←</button>
                          <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.82)', fontWeight: 600 }}>
                            {calMonthName}{' '}
                            <button
                              onClick={() => { setCalYearView(true); setCalYearPageStart(calPickerYear - 5) }}
                              style={{ background: 'none', border: 'none', font: 'inherit', color: 'rgba(255,255,255,0.82)', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.12em', fontSize: 10, padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px', fontFamily: 'var(--mono)' }}
                            >
                              {calPickerYear}
                            </button>
                          </span>
                          <button
                            onClick={() => canCalNext && navCalMonth(1)}
                            disabled={!canCalNext}
                            style={{ background: 'none', border: 'none', color: canCalNext ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.16)', cursor: canCalNext ? 'pointer' : 'default', fontSize: 14, lineHeight: 1, padding: '4px 8px', fontFamily: 'var(--mono)' }}
                          >→</button>
                        </div>
                        {/* Weekday labels */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
                          {['M','T','W','T','F','S','S'].map((wd, i) => (
                            <div key={i} style={{ textAlign: 'center', fontSize: 9, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.26)', paddingBottom: 4 }}>{wd}</div>
                          ))}
                        </div>
                        {/* Day cells */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                          {calDays.map((d, i) => {
                            if (!d) return <div key={`e${i}`} />
                            const iso  = localIsoDate(d)
                            const isT  = iso === todayStr
                            const isSel = browsedDate ? browsedDate === iso : iso === todayStr
                            const isFut = iso > todayStr
                            let bg = 'transparent'
                            let fg = isFut ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.68)'
                            if (isT && isSel)    { bg = 'oklch(0.38 0.20 165)'; fg = 'oklch(0.95 0.08 165)' }
                            else if (isT)        { bg = 'oklch(0.28 0.20 145)'; fg = 'oklch(0.90 0.14 145)' }
                            else if (isSel)      { bg = 'oklch(0.26 0.20 220)'; fg = 'oklch(0.92 0.10 220)' }
                            return (
                              <button
                                key={iso}
                                disabled={isFut}
                                onClick={() => selectCalDay(d)}
                                className="cal-day-btn"
                                style={{ background: bg, color: fg, cursor: isFut ? 'default' : 'pointer' }}
                              >
                                {d.getDate()}
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <button className="day-nav-arrow" disabled={isToday || nextStr > todayStr} onClick={() => browseDay(nextStr)}>→</button>
            </div>
          )
        })()}

        {/* Grid */}
        <section className="grid">

          {/* ROW 1 */}

          {/* TODAY */}
          <article id="card-today" className="glass card span-today" onClick={() => setOverlayCard('today')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-today" /><span className="card-title-text">Today</span><span className="demo-badge">Demo calendar</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            <div className="today-now">
              <span className="today-next-label">{nowEvent ? 'Happening now' : nextEvent ? `Up next · ${nextEvent.time}` : 'Up next'}</span>
              <h2 className="today-next-title">{nextEvent?.title ?? '—'}</h2>
              <div className="today-next-meta">
                <span><span className="metric">{nextEvent?.time ?? '—'}</span>{nextEvent?.location ? ` · ${nextEvent.location}` : ''}</span>
              </div>
            </div>
            <div className="today-rail">
              {displayEvents.map(ev => (
                <div key={ev.id} className={`event ${ev.status}`}>
                  <span className="event-time">{ev.time}</span>
                  <span className="event-marker" />
                  <div className="event-body">
                    {ev.status === 'now' && <span className="now-badge">NOW</span>}
                    <span className="event-title">{ev.title}</span>
                    {ev.location && <span className="event-loc">{ev.location}</span>}
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* HEALTH */}
          <article id="card-health" className="glass card span-health" onClick={() => setOverlayCard('health')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-health" /><span className="card-title-text">Health · Fitbit</span><span className="demo-badge">Demo data</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            <div className="health-grid">
              <div className="ring-wrap">
                <svg className="ring" viewBox="0 0 168 168" style={{ display: 'block', background: 'none', border: 'none', outline: 'none' }} overflow="visible">
                  <defs>
                    <linearGradient id="readinessGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={rc.from} />
                      <stop offset="100%" stopColor={rc.to} />
                    </linearGradient>
                    <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                      <feColorMatrix in="blur" type="matrix" values={`0 0 0 0 ${rc.glowR}  0 0 0 0 ${rc.glowG}  0 0 0 0 ${rc.glowB}  0 0 0 0.8 0`} result="glow" />
                      <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <circle className="ring-bg" cx="84" cy="84" r={RING_R} />
                  <circle className="ring-fg" cx="84" cy="84" r={RING_R} stroke="url(#readinessGrad)" filter="url(#arcGlow)" style={{ strokeDasharray: `${circ} ${circ}`, strokeDashoffset: ringOffset }} />
                </svg>
                <div className="ring-content">
                  <div className="ring-num">{READINESS}</div>
                  <div className="ring-label">{rc.label}</div>
                </div>
              </div>
              <div className="health-stack">
                <div className="health-stat"><span className="health-stat-label">Sleep</span><span className="health-stat-value">7:24<span className="unit">h</span></span><span className="health-stat-delta">+42m</span></div>
                <div className="health-stat"><span className="health-stat-label">HRV</span><span className="health-stat-value">58<span className="unit">ms</span></span><span className="health-stat-delta">+6 ms</span></div>
                <div className="health-stat"><span className="health-stat-label">Resting HR</span><span className="health-stat-value">52<span className="unit">bpm</span></span><span className="health-stat-delta down">+1</span></div>
              </div>
            </div>
          </article>

          {/* ROW 2 */}

          {/* WEATHER */}
          <article id="card-weather" className="glass card span-weather" onClick={() => setOverlayCard('weather')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-weather" /><span className="card-title-text">Weather</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            {wxLoading ? <CardSkeleton /> : wxError ? <CardError msg="Weather unavailable" /> : wxData ? (
              <>
                <div className="weather-main">
                  <div className="col">
                    <div className="weather-temp">{wxData.current.temp}<span className="deg">°C</span></div>
                    <div className="weather-cond">{wxData.current.description} · feels {wxData.current.feels_like}°</div>
                    <div className="weather-loc">ROTTERDAM</div>
                  </div>
                  <div className="weather-glyph" aria-hidden="true">
                    <svg viewBox="0 0 48 48" fill="none">
                      <circle cx="19" cy="20" r="9" fill="url(#sunGlowCard)" /><ellipse cx="30" cy="28" rx="14" ry="8" fill="rgba(255,255,255,0.6)" /><ellipse cx="22" cy="30" rx="10" ry="6" fill="rgba(255,255,255,0.35)" />
                      <defs><radialGradient id="sunGlowCard"><stop offset="0%" stopColor="oklch(0.88 0.18 80)" /><stop offset="80%" stopColor="oklch(0.70 0.20 60)" /></radialGradient></defs>
                    </svg>
                  </div>
                </div>
                <div className="weather-hours">
                  {wxHours.map(({t,i,v}, idx) => (
                    <div key={idx} className={`hour${t==='NOW'?' now':''}`}>
                      <span className="hour-t">{t}</span><span className={`hour-i ${i}`} /><span className="hour-v">{v}</span>
                    </div>
                  ))}
                </div>
                {weatherFetchedAt !== null && (
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>{fmtUpdated(weatherFetchedAt)}</p>
                )}
              </>
            ) : null}
          </article>

          {/* INBOX */}
          <article id="card-inbox" className="glass card span-inbox" onClick={() => setOverlayCard('inbox')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-inbox" /><span className="card-title-text">Inbox · Gmail</span><span className="demo-badge">Demo data</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            <div className="inbox-count"><span className="inbox-num">3</span><span className="inbox-num-label">unread · 11 today</span></div>
            <div className="mail-list">
              {[{av:'EU',cls:'eur',from:'Erasmus University',time:'07:14',subj:'Welcome Week — schedule & campus map',unread:true},{av:'DB',cls:'bnk',from:'Demo Bank',time:'06:02',subj:'May statement available',unread:true},{av:'CO',cls:'coa',from:'Marcus Schipper',time:'Mon',subj:'Re: Tutoring — confirmed 16:00',unread:true},{av:'GH',cls:'css',from:'GitHub',time:'Mon',subj:'Weekly digest · 4 stars on jarvis',unread:false}].map((m) => (
                <div key={m.from + m.time} className={`mail${m.unread?' unread':''}`}>
                  <span className={`mail-avatar ${m.cls}`}>{m.av}</span>
                  <div className="mail-body"><div className="mail-from"><span className="mail-from-name">{m.from}</span><span className="mail-time">{m.time}</span></div><span className="mail-subject">{m.subj}</span></div>
                </div>
              ))}
            </div>
          </article>

          {/* FINANCE */}
          <article id="card-finance" className="glass card span-finance" onClick={() => setOverlayCard('finance')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-finance" /><span className="card-title-text">Portfolio</span><span className="demo-badge">Demo data</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            <div className="fin-total"><span className="fin-amount">€4,827.40</span><span className="fin-delta">+€38.20 · +0.80%</span></div>
            <svg className="fin-spark" viewBox="0 0 240 56" preserveAspectRatio="none" width="100%">
              <defs><linearGradient id="finSparkGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="oklch(0.78 0.22 145)" /><stop offset="100%" stopColor="oklch(0.78 0.22 145 / 0)" /></linearGradient></defs>
              <path d="M0,42 L20,38 L40,40 L60,32 L80,34 L100,28 L120,30 L140,22 L160,26 L180,18 L200,20 L220,14 L240,10" fill="none" stroke="oklch(0.78 0.22 145)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M0,42 L20,38 L40,40 L60,32 L80,34 L100,28 L120,30 L140,22 L160,26 L180,18 L200,20 L220,14 L240,10 L240,56 L0,56 Z" fill="url(#finSparkGrad)" opacity="0.35" />
            </svg>
            <div className="fin-list">
              {[['VWCE','€2,940.10','down','−0.31%'],['BTC',btcPrice,btcUp?'':'down',btcChg],['ETH','€504.80','','+0.42%'],['CASH','€200.00','muted','—']].map(([sym,val,cls,pct]) => (
                <div key={sym as string} className="fin-row">
                  <span className="fin-sym">{sym}</span>
                  <span className="fin-row-val">{val}</span>
                  <span className={`fin-row-pct${cls==='down'?' down':''}`} style={cls==='muted'?{color:'var(--ink-40)'}:{}}>{pct}</span>
                </div>
              ))}
            </div>
          </article>

          {/* CHESS */}
          <article id="card-chess" className="glass card span-chess" onClick={() => setOverlayCard('chess')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-chess" /><span className="card-title-text">Chess · Rapid</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            <div className="chess-elo"><span className="chess-rating">{chess?.rapidRating ?? '—'}</span>{chess?.peakRating && <span className="chess-delta">Peak {chess.peakRating}</span>}</div>
            <span className="chess-sub">Win rate {chess?.winRate ?? '—'}%{chess ? ` · ${chess.totalGames.toLocaleString()} games` : ''}</span>
            {chessSpark ? (
              <svg className="chess-spark" viewBox="0 0 240 60" preserveAspectRatio="none" width="100%">
                <defs><linearGradient id="chessSparkGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="oklch(0.80 0.18 50)" /><stop offset="100%" stopColor="oklch(0.80 0.18 50 / 0)" /></linearGradient></defs>
                <path d={chessSpark.line} fill="none" stroke="oklch(0.80 0.18 50)" strokeWidth="1.5" strokeLinecap="round" />
                <path d={chessSpark.fill} fill="url(#chessSparkGrad)" opacity="0.35" />
              </svg>
            ) : (
              <div className="chess-no-data">{chess === null ? 'Data unavailable' : chess.totalGames < 3 ? 'Play 3+ rapid games' : 'No history'}</div>
            )}
            <div className="chess-recent">
              <div className="chess-recent-label">Last {chess?.recentResults?.length ?? 8}</div>
              <div className="result-row">
                {(chess?.recentResults?.length ? chess.recentResults : ['w','w','l','w','d','w','w','l']).map((r, i) => (
                  <span key={i} className={`result ${r}`}>{(r as string).toUpperCase()}</span>
                ))}
              </div>
            </div>
          </article>

          {/* ROW 3 */}

          {/* ROTTERDAM COUNTDOWN */}
          <article id="card-countdown" className="glass card span-countdown" onClick={() => setOverlayCard('countdown')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-countdown" /><span className="card-title-text">Rotterdam</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            {countdown.done ? (
              <div className="cdt-done"><div className="cdt-done-title">You made it!</div><div className="cdt-done-sub">Erasmus University</div></div>
            ) : (
              <div className="cdt-body">
                <div className="cdt-numbers">
                  <div className="cdt-unit"><span className="cdt-n">{countdown.days}</span><span className="cdt-l">days</span></div>
                  <span className="cdt-sep">:</span>
                  <div className="cdt-unit"><span className="cdt-n">{String(countdown.hours).padStart(2,'0')}</span><span className="cdt-l">hrs</span></div>
                  <span className="cdt-sep">:</span>
                  <div className="cdt-unit"><span className="cdt-n">{String(countdown.minutes).padStart(2,'0')}</span><span className="cdt-l">min</span></div>
                </div>
                <div className="cdt-sub">Erasmus University · Move-in</div>
              </div>
            )}
          </article>

          {/* SUPPLEMENTS */}
          <article id="card-supplements" className="glass card span-supplements" onClick={() => setOverlayCard('supplements')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-supplements" /><span className="card-title-text">Supplements</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            <div className="supp-header">
              {winState.type === 'active' ? (
                <><div className="supp-window-label">{winState.window.label}</div><div className="supp-window-time">{winState.window.timeLabel}</div></>
              ) : (
                <><div className="supp-next-label">Next window</div><div className="supp-next-title">{winState.window.label}</div><div className="supp-next-time">{winState.type === 'tomorrow' ? `Tomorrow · ${fmtMins(winState.minsUntil)}` : `in ${fmtMins(winState.minsUntil)} · ${winState.window.timeLabel}`}</div></>
              )}
            </div>
            <div className="supp-list">
              {winItems.map(item => (
                <div key={item.id} className={`supp-item${checkedSupps.has(item.id)?' done':''}`} onClick={e => { e.stopPropagation(); toggleSupp(item.id) }}>
                  <span className="supp-check">{checkedSupps.has(item.id) ? '✓' : ''}</span>
                  <span className="supp-name">{item.name}</span>
                </div>
              ))}
            </div>
            <div className="supp-progress">
              <div className="supp-progress-label">
                <span className="supp-progress-text">{checkedSupps.size} / {totalSupps} today</span>
                <span className="supp-progress-pct">{suppPct}%</span>
              </div>
              <div className="supp-bar-track"><div className="supp-bar-fill" style={{ width: `${suppPct}%` }} /></div>
            </div>
          </article>

          {/* DUTCH WORD */}
          <article id="card-dutch" className="glass card span-dutch" onClick={() => setOverlayCard('dutch')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-dutch" /><span className="card-title-text">Dutch · Daily</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            <div className="dutch-body">
              <div className="dutch-word">{dailyWord.word}</div>
              <div className="dutch-pronunciation">[{dailyWord.pronunciation}]</div>
              <div className="dutch-translation">{dailyWord.translation}</div>
              <div className="dutch-example">&ldquo;{dailyWord.example}&rdquo;</div>
              <button className="dutch-speak-btn" onClick={e => { e.stopPropagation(); speakDutch(dailyWord.word) }}>🔊 Pronounce</button>
            </div>
          </article>

          {/* ROW 4 */}

          {/* MOOD CHECK-IN */}
          <article id="card-mood" className="glass card span-mood" onClick={() => setOverlayCard('mood')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-mood" /><span className="card-title-text">Mood · Daily</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            {moodToday !== null ? (
              <div className="log-display">
                <span className="log-display-num" style={{ color: moodColor(moodToday) }}>{moodToday}</span>
                <span className="log-display-denom">/10</span>
                {moodHistory.length >= 2 && (
                  <svg className="mini-spark" viewBox="0 0 200 44" preserveAspectRatio="none" width="100%">
                    <defs><linearGradient id="moodMiniGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="oklch(0.78 0.18 165)" /><stop offset="100%" stopColor="oklch(0.78 0.18 165 / 0)" /></linearGradient></defs>
                    <path d={moodSpark.line} fill="none" stroke="oklch(0.78 0.18 165)" strokeWidth="1.5" strokeLinecap="round" />
                    <path d={moodSpark.fill} fill="url(#moodMiniGrad)" opacity="0.3" />
                  </svg>
                )}
                <span className="log-tap-hint">Tap to update</span>
              </div>
            ) : (
              <div className="log-prompt">
                <span className="log-prompt-label">How are you feeling?</span>
                <div className="rating-btns">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} className="rating-btn" onClick={e => { e.stopPropagation(); logMood(n) }}>{n}</button>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* WATER TRACKER */}
          <article id="card-water" className="glass card span-water" onClick={() => setOverlayCard('water')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-water" /><span className="card-title-text">Water · Today</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            <div className="water-display">
              <span className="water-amount">{waterLiters}<span className="water-unit">L</span></span>
              <span className="water-goal-text">{waterPct}% · {WATER_GOAL_ML/1000}L goal</span>
            </div>
            <div className="supp-bar-track" style={{ margin: '8px 0' }}>
              <div className="supp-bar-fill" style={{ width: `${waterPct}%`, background: 'linear-gradient(90deg, oklch(0.72 0.20 220), oklch(0.78 0.18 200))' }} />
            </div>
            <button className="water-add-btn" onClick={e => { e.stopPropagation(); addWater() }}>+ {glassVol} ml</button>
            {waterLogs.length > 0 ? (
              <div className="water-entry-list">
                {[...waterLogs].reverse().map(l => (
                  <div key={l.id} className="water-entry-row water-card-entry">
                    <span className="water-entry-amt">{l.amount_ml} ml</span>
                    <button
                      className="water-delete-btn"
                      onClick={e => { e.stopPropagation(); deleteWaterEntry(l.id) }}
                      aria-label="Remove entry"
                    >
                      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                        <path d="M1 1L6 6M6 1L1 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <span className="water-glasses">0 of {Math.ceil(WATER_GOAL_ML / glassVol)} glasses</span>
            )}
          </article>

          {/* KNEE PAIN LOG */}
          <article id="card-knee" className="glass card span-knee" onClick={() => setOverlayCard('knee')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-knee" /><span className="card-title-text">Knee · Log</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            {kneeScore !== null ? (
              <div className="log-display">
                <span className="log-display-num" style={{ color: kneeColor(kneeScore) }}>{kneeScore}</span>
                <span className="log-display-denom">/10 pain</span>
                {kneeHistory.length >= 2 && (
                  <svg className="mini-spark" viewBox="0 0 200 44" preserveAspectRatio="none" width="100%">
                    <defs><linearGradient id="kneeMiniGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="oklch(0.74 0.22 25)" /><stop offset="100%" stopColor="oklch(0.74 0.22 25 / 0)" /></linearGradient></defs>
                    <path d={kneeSpark.line} fill="none" stroke="oklch(0.74 0.22 25)" strokeWidth="1.5" strokeLinecap="round" />
                    <path d={kneeSpark.fill} fill="url(#kneeMiniGrad)" opacity="0.3" />
                  </svg>
                )}
                <span className="log-tap-hint">Tap to update</span>
              </div>
            ) : (
              <div className="log-prompt">
                <span className="log-prompt-label">Rate your pain (0–10)</span>
                <div className="rating-btns" style={{ gridTemplateColumns: 'repeat(11, 1fr)', gap: 3 }}>
                  {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} className="rating-btn" style={{ fontSize: 9.5 }} onClick={e => { e.stopPropagation(); logKnee(n) }}>{n}</button>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* TODAY'S TRAINING */}
          <article id="card-training" className="glass card span-training" onClick={() => setOverlayCard('training')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-training" /><span className="card-title-text">Training</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            <div className="training-day">{DAY_NAMES[todayDayIdx].toUpperCase()}</div>
            <div className="supp-list">
              {todayTraining.map(s => {
                const key = `${todayDayIdx}-${s.name}`
                return (
                  <div key={key} className={`supp-item${trainingDone.has(key)?' done':''}`} onClick={e => { e.stopPropagation(); toggleTraining(key) }}>
                    <span className="supp-check">{trainingDone.has(key) ? '✓' : ''}</span>
                    <div className="col" style={{ gap: 1 }}>
                      <span className="supp-name">{s.name}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-40)', letterSpacing: '0.06em' }}>{s.duration}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </article>

          {/* ROW 5 */}

          {/* STREAKS */}
          <article id="card-streaks" className="glass card span-streaks" onClick={() => setOverlayCard('streaks')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-streak" /><span className="card-title-text">Streaks</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            <div className="streak-row">
              {([
                { label: 'Supplements', value: streaks.supplements },
                { label: 'Knee log',    value: streaks.knee },
                { label: 'Mood',        value: streaks.mood },
              ] as const).map(({ label, value }) => (
                <div key={label} className="streak-tile">
                  <span className="streak-flame">{value > 0 ? '🔥' : '·'}</span>
                  <span className="streak-count">{value > 0 ? value : '0'}</span>
                  <span className="streak-label">{label.toUpperCase()}</span>
                  <span className="streak-sub">{value > 0 ? `${value}-day streak` : 'Start today!'}</span>
                </div>
              ))}
            </div>
          </article>

          {/* ROW 6 — FOOD */}

          <article id="card-food" className="glass card span-food" onClick={() => setOverlayCard('food')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-food" /><span className="card-title-text">Food · Calories &amp; Macros</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            <div className="food-card-body">
              <div className="food-card-totals">
                <div className="food-stat">
                  <span className="food-stat-v">{foodTotals.calories}<span className="food-stat-goal"> / {CALORIE_GOAL}</span></span>
                  <span className="food-stat-l">KCAL</span>
                </div>
                <div className="food-stat">
                  <span className="food-stat-v">{foodTotals.protein_g.toFixed(0)}<span className="food-stat-goal"> / {PROTEIN_GOAL}</span></span>
                  <span className="food-stat-l">PROTEIN · G</span>
                </div>
                <div className="food-stat">
                  <span className="food-stat-v">{foodLogs.length}</span>
                  <span className="food-stat-l">{foodLogs.length === 1 ? 'MEAL' : 'MEALS'}</span>
                </div>
              </div>
              <div className="food-bars">
                <div className="supp-progress" style={{ margin: 0 }}>
                  <div className="supp-progress-label"><span className="supp-progress-text">Calories</span><span className="supp-progress-pct">{foodKcalPct}%</span></div>
                  <div className="supp-bar-track"><div className="supp-bar-fill" style={{ width: `${foodKcalPct}%`, background: 'linear-gradient(90deg, oklch(0.78 0.18 55), oklch(0.80 0.20 35))' }} /></div>
                </div>
                <div className="supp-progress" style={{ margin: 0 }}>
                  <div className="supp-progress-label"><span className="supp-progress-text">Protein</span><span className="supp-progress-pct">{foodProteinPct}%</span></div>
                  <div className="supp-bar-track"><div className="supp-bar-fill" style={{ width: `${foodProteinPct}%`, background: 'linear-gradient(90deg, oklch(0.72 0.20 145), oklch(0.78 0.18 165))' }} /></div>
                </div>
              </div>
              <span className="food-card-hint">{foodLogs.length === 0 ? 'Tap to log your first meal' : 'Tap to add, edit or remove meals'}</span>
            </div>
          </article>

          {/* ROW 7 — API integrations */}

          {/* NEWS */}
          <article id="card-news" className="glass card span-news" onClick={() => setOverlayCard('news')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-news" /><span className="card-title-text">Tech News</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            {newsLoading ? <CardSkeleton /> : newsError ? <CardError msg="News unavailable" /> : newsData ? (
              <div className="news-list">
                {newsData.articles.slice(0, 3).map((a) => (
                  <div key={a.url} className="news-item">
                    <div className="news-item-source">{a.source} · {timeAgo(a.publishedAt)}</div>
                    <div className="news-item-title">{a.title}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </article>

          {/* AIR QUALITY */}
          <article id="card-airquality" className="glass card span-airquality" onClick={() => setOverlayCard('airquality')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-airquality" /><span className="card-title-text">Air Quality</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            {aqLoading ? <CardSkeleton /> : aqError ? <CardError msg="AQ unavailable" /> : aqData ? (
              <>
                <div className="aq-main">
                  <div className="aq-aqi" style={{ color: aqiColor(aqData.status) }}>{aqData.aqi}</div>
                  <div className="aq-status" style={{ color: aqiColor(aqData.status) }}>{aqData.status}</div>
                </div>
                <div className="aq-details">
                  <span>PM2.5 <strong>{aqData.pm25}</strong></span>
                  <span>PM10 <strong>{aqData.pm10}</strong></span>
                  <span>NO₂ <strong>{aqData.no2}</strong></span>
                </div>
                {aqiFetchedAt !== null && (
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>{fmtUpdated(aqiFetchedAt)}</p>
                )}
              </>
            ) : null}
          </article>

          {/* EXCHANGE RATES */}
          <article id="card-exchange" className="glass card span-exchange" onClick={() => setOverlayCard('exchange')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-exchange" /><span className="card-title-text">Exchange</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            {exLoading ? <CardSkeleton /> : exError ? <CardError msg="Rates unavailable" /> : exData ? (
              <>
                <div className="exchange-rates">
                  <div className="rate-row"><span className="rate-pair">EUR/PLN</span><span className="rate-val">{exData.eur_to_pln.toFixed(4)}</span></div>
                  <div className="rate-row"><span className="rate-pair">EUR/USD</span><span className="rate-val">{exData.eur_to_usd.toFixed(4)}</span></div>
                  <div className="rate-row"><span className="rate-pair">EUR/GBP</span><span className="rate-val">{exData.eur_to_gbp.toFixed(4)}</span></div>
                </div>
                {exchangeFetchedAt !== null && (
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>{fmtUpdated(exchangeFetchedAt)}</p>
                )}
              </>
            ) : null}
          </article>

          {/* QUOTE / FACT */}
          <article id="card-quote" className="glass card span-quote" onClick={() => setOverlayCard('quote')}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-quote" /><span className="card-title-text">Daily</span></div>
              <span className="expand-hint"><ExpandIcon /></span>
            </div>
            {ninjaLoading ? <CardSkeleton /> : ninjaData ? (
              <div className="quote-body">
                <p className="quote-text">&ldquo;{ninjaData.quote.text}&rdquo;</p>
                <p className="quote-author">— {ninjaData.quote.author}</p>
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontStyle: 'italic', padding: '8px 0' }}>
                Quote unavailable
              </p>
            )}
          </article>

          {/* ROW 8 — Contribution graph */}

          <article id="card-contributions" className="glass card span-contributions" style={{ cursor: 'default' }}>
            <div className="card-head">
              <div className="card-title"><span className="card-icon accent-contributions" /><span className="card-title-text">Activity · 13 Weeks</span></div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.10em', color: 'var(--ink-40)', textTransform: 'uppercase' }}>6 TRACKERS</span>
            </div>
            <ContributionGrid data={initialHealth.contributionData} />
          </article>

        </section>
      </main>

      {/* Mobile nav */}
      <nav className="mobile-nav" aria-label="Jump to card">
        {(['today','health','weather','mood','water','knee','supplements','news'] as const).map(key => (
          <button key={key} className="mobile-nav-item" onClick={() => document.getElementById(`card-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </nav>

      {/* Overlay */}
      {overlayCard && (
        <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) setOverlayCard(null) }}>
          <div className="glass detail" role="dialog" aria-modal="true">
            <button className="detail-close" aria-label="Close" onClick={() => setOverlayCard(null)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {detailViews[overlayCard]}
          </div>
        </div>
      )}
    </>
  )
}
