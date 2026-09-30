/**
 * ── Run ALL of the following SQL once in your Supabase SQL editor ──────────
 *
 * -- 0. water_logs — ensure DELETE is covered by RLS.
 *    Run this if water entry deletion silently does nothing:
 * drop policy if exists "self_delete" on water_logs;
 * create policy "self_delete" on water_logs for delete
 *   using (auth.uid() = user_id);
 *
 * -- 1. dutch_learned (create if missing)
 * create table if not exists dutch_learned (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid references auth.users not null,
 *   word_index integer not null,
 *   learned_at timestamptz default now(),
 *   unique(user_id, word_index)
 * );
 * alter table dutch_learned enable row level security;
 * create policy "self" on dutch_learned
 *   using (auth.uid() = user_id) with check (auth.uid() = user_id);
 *
 * -- 2. food_logs (create if missing)
 * create table if not exists food_logs (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid references auth.users not null,
 *   logged_date date not null default current_date,
 *   meal_name text not null,
 *   calories integer not null default 0,
 *   protein_g numeric(6,1) not null default 0,
 *   carbs_g numeric(6,1) not null default 0,
 *   fat_g numeric(6,1) not null default 0,
 *   logged_at timestamptz default now()
 * );
 * alter table food_logs enable row level security;
 * create policy "self" on food_logs
 *   using (auth.uid() = user_id) with check (auth.uid() = user_id);
 *
 * -- 3. training_logs (create if missing)
 * create table if not exists training_logs (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid references auth.users not null,
 *   logged_date date not null default current_date,
 *   session_key text not null,
 *   unique(user_id, logged_date, session_key)
 * );
 * alter table training_logs enable row level security;
 * create policy "self" on training_logs
 *   using (auth.uid() = user_id) with check (auth.uid() = user_id);
 *
 * -- 4. Migrate mood_logs → date-keyed (same pattern as supplement_logs)
 * --    This makes upsert idempotent and removes the need for a DELETE policy.
 * alter table mood_logs add column if not exists logged_date date;
 * update mood_logs set logged_date = logged_at::date where logged_date is null;
 * alter table mood_logs alter column logged_date set default current_date;
 * alter table mood_logs alter column logged_date set not null;
 * -- Remove duplicate dates, keeping the row with the latest logged_at per day:
 * delete from mood_logs a using mood_logs b
 *   where a.logged_at < b.logged_at
 *     and a.user_id = b.user_id
 *     and a.logged_date = b.logged_date;
 * alter table mood_logs drop constraint if exists mood_logs_user_date_key;
 * alter table mood_logs add constraint mood_logs_user_date_key unique (user_id, logged_date);
 *
 * -- 5. Migrate knee_logs → date-keyed (same pattern)
 * alter table knee_logs add column if not exists logged_date date;
 * update knee_logs set logged_date = logged_at::date where logged_date is null;
 * alter table knee_logs alter column logged_date set default current_date;
 * alter table knee_logs alter column logged_date set not null;
 * delete from knee_logs a using knee_logs b
 *   where a.logged_at < b.logged_at
 *     and a.user_id = b.user_id
 *     and a.logged_date = b.logged_date;
 * alter table knee_logs drop constraint if exists knee_logs_user_date_key;
 * alter table knee_logs add constraint knee_logs_user_date_key unique (user_id, logged_date);
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import { fetchChessData } from '@/lib/chess'
import type { InitialHealthData } from './types'
import { calcStreak } from '@/lib/utils/streak'
import { amsterdamIsoDate } from '@/lib/utils/date'

export default async function Dashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const uid = user.id
  const now    = Date.now()
  const today  = amsterdamIsoDate(new Date(now))
  const ago7d  = amsterdamIsoDate(new Date(now -  7 * 86_400_000))
  const ago91d = amsterdamIsoDate(new Date(now - 91 * 86_400_000))

  // Consolidated queries — was 16 queries, now 8
  // Each table is fetched once with the widest required date range; narrower views are derived in JS.
  const [
    chessRes,
    moodAllRes,    // mood_logs 91d (covers chart 7d, streak 30d, contribution 91d)
    waterAllRes,   // water_logs 91d (covers today totals + contribution 91d)
    kneeAllRes,    // knee_logs 91d (covers chart 7d, streak 30d, contribution 91d)
    suppAllRes,    // supplement_logs 91d (covers streak 30d + contribution 91d)
    dutchAllRes,   // dutch_learned all-time (covers streak + contribution + word indices)
    foodAllRes,    // food_logs 91d (covers today's logs + contribution 91d)
    trainingTodayRes,
  ] = await Promise.allSettled([
    fetchChessData('MrkOxford'),
    supabase.from('mood_logs').select('score, logged_date, logged_at')
      .eq('user_id', uid).gte('logged_at', `${ago91d}T00:00:00Z`)
      .order('logged_date', { ascending: true }),
    supabase.from('water_logs').select('id, amount_ml, logged_at')
      .eq('user_id', uid).gte('logged_at', `${ago91d}T00:00:00Z`)
      .order('logged_at', { ascending: true }),
    supabase.from('knee_logs').select('pain_score, note, logged_date, logged_at')
      .eq('user_id', uid).gte('logged_at', `${ago91d}T00:00:00Z`)
      .order('logged_date', { ascending: true }),
    supabase.from('supplement_logs').select('logged_date')
      .eq('user_id', uid).gte('logged_date', ago91d),
    supabase.from('dutch_learned').select('word_index, learned_at')
      .eq('user_id', uid).order('learned_at', { ascending: true }),
    supabase.from('food_logs')
      .select('id, meal_name, calories, protein_g, carbs_g, fat_g, logged_date')
      .eq('user_id', uid).gte('logged_date', ago91d)
      .order('logged_date', { ascending: true }),
    supabase.from('training_logs').select('session_key')
      .eq('user_id', uid).eq('logged_date', today),
  ])

  const chess = chessRes.status === 'fulfilled' ? chessRes.value : null

  const moodAll  = moodAllRes.status  === 'fulfilled' ? moodAllRes.value.data  ?? [] : []
  const waterAll = waterAllRes.status === 'fulfilled' ? waterAllRes.value.data ?? [] : []
  const kneeAll  = kneeAllRes.status  === 'fulfilled' ? kneeAllRes.value.data  ?? [] : []
  const suppAll  = suppAllRes.status  === 'fulfilled' ? suppAllRes.value.data  ?? [] : []
  const dutchAll = dutchAllRes.status === 'fulfilled' ? dutchAllRes.value.data ?? [] : []
  const foodAll  = foodAllRes.status  === 'fulfilled' ? foodAllRes.value.data  ?? [] : []
  const trainingRows = trainingTodayRes.status === 'fulfilled' ? trainingTodayRes.value.data ?? [] : []

  // Derived narrow views (no extra DB round-trips)
  const moodRows  = moodAll.filter(r => r.logged_date >= ago7d)
  const waterRows = waterAll.filter(r => amsterdamIsoDate(new Date(r.logged_at as string)) === today)
  const kneeRows  = kneeAll.filter(r => r.logged_date >= ago7d)
  const foodRows  = foodAll.filter(r => r.logged_date === today)

  // Today's mood — now date-keyed, at most one row per day
  const moodToday  = moodRows.find(r => r.logged_date === today)?.score ?? null
  const moodHistory = moodRows
    .map(r => ({ date: r.logged_date as string, value: r.score as number }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const waterTotal = waterRows.reduce((s, r) => s + (r.amount_ml ?? 0), 0)
  const waterLogs  = waterRows.map(r => ({ id: r.id as string, amount_ml: r.amount_ml as number }))

  // Today's knee — now date-keyed
  const todayKnee  = kneeRows.find(r => r.logged_date === today) ?? null
  const kneeToday  = todayKnee ? { pain_score: todayKnee.pain_score, note: todayKnee.note ?? null } : null
  const kneeHistory = kneeRows
    .map(r => ({ date: r.logged_date as string, value: r.pain_score as number }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const suppLoggedToday = suppAll.some(r => r.logged_date === today)

  // Dutch streak — consecutive days a word was marked as learned
  const dutchDates = dutchAll.filter(r => r.learned_at).map(r => amsterdamIsoDate(new Date(r.learned_at as string)))

  // Contribution data — derived from the already-fetched 91d rows
  const moodDatesSet  = new Set(moodAll.map(r => r.logged_date as string))
  const waterDatesSet = new Set(waterAll.map(r => amsterdamIsoDate(new Date(r.logged_at as string))))
  const kneeDatesSet  = new Set(kneeAll.map(r => r.logged_date as string))
  const suppDatesSet  = new Set(suppAll.map(r => r.logged_date as string))
  const dutchDatesSet = new Set(dutchAll.filter(r => r.learned_at >= `${ago91d}T00:00:00Z`).map(r => amsterdamIsoDate(new Date(r.learned_at as string))))
  const foodDatesSet  = new Set(foodAll.map(r => r.logged_date as string))

  const contributionData: { date: string; count: number }[] = []
  for (let i = 90; i >= 0; i--) {
    const d    = new Date(now - i * 86_400_000)
    const date = amsterdamIsoDate(d)
    let count  = 0
    if (moodDatesSet.has(date))  count++
    if (waterDatesSet.has(date)) count++
    if (kneeDatesSet.has(date))  count++
    if (suppDatesSet.has(date))  count++
    if (dutchDatesSet.has(date)) count++
    if (foodDatesSet.has(date))  count++
    contributionData.push({ date, count })
  }

  const initialHealth: InitialHealthData = {
    moodToday,
    moodHistory,
    waterTotal,
    waterLogs,
    kneeToday,
    kneeHistory,
    suppLoggedToday,
    streaks: {
      supplements: calcStreak(suppAll.map(r => r.logged_date as string)),
      mood:        calcStreak(moodAll.map(r => r.logged_date as string)),
      knee:        calcStreak(kneeAll.map(r => r.logged_date as string)),
      dutch:       calcStreak(dutchDates),
    },
    // Raw logged dates for client-side live streak recomputation (wider 91d window)
    suppDates: suppAll.map(r => r.logged_date as string),
    moodDates: moodAll.map(r => r.logged_date as string),
    kneeDates: kneeAll.map(r => r.logged_date as string),
    learnedWordIndices: dutchAll.map(r => r.word_index as number),
    contributionData,
    foodLogs: foodRows.map(r => ({
      id:        r.id        as string,
      meal_name: r.meal_name as string,
      calories:  r.calories  as number,
      protein_g: r.protein_g as number,
      carbs_g:   r.carbs_g   as number,
      fat_g:     r.fat_g     as number,
    })),
    trainingDoneToday: trainingRows.map(r => r.session_key as string),
  }

  return (
    <DashboardClient
      userId={uid}
      chess={chess}
      initialHealth={initialHealth}
    />
  )
}
