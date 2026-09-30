import 'server-only'
import { createTimeoutSignal } from '@/lib/fetchWithTimeout'

export interface ChessData {
  rapidRating: number
  peakRating: number
  wins: number
  losses: number
  draws: number
  winRate: number
  totalGames: number
  recentResults: ('w' | 'l' | 'd')[]
  eloHistory: number[]  // player's rating after each rapid game, chronological (last 3 months)
}

interface RawPlayer {
  username: string
  rating?: number
  result: string
}

interface RawGame {
  time_class: string
  white: RawPlayer
  black: RawPlayer
  end_time?: number
}

const DRAW_RESULTS = new Set([
  'draw', 'repetition', 'stalemate', 'insufficient',
  '50move', 'agreed', 'timevsinsufficient', 'bughousepartner',
])

function classifyResult(game: RawGame, username: string): 'w' | 'l' | 'd' {
  const isWhite = game.white.username.toLowerCase() === username.toLowerCase()
  const myResult = isWhite ? game.white.result : game.black.result
  if (myResult === 'win') return 'w'
  if (DRAW_RESULTS.has(myResult)) return 'd'
  return 'l'
}

export async function fetchChessData(username: string): Promise<ChessData | null> {
  // Runs during the /dashboard server render — without a timeout a hung
  // chess.com response would stall the whole page load.
  const { signal, clear } = createTimeoutSignal(8000)
  try {
    const now = new Date()
    const headers = { 'User-Agent': process.env.CHESS_USER_AGENT ?? 'JARVIS-Personal-Dashboard/1.0' }

    // Build last 3 months of year/month keys in chronological order
    const monthKeys: string[] = []
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthKeys.push(`${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    const [statsRes, ...gamesReses] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${username}/stats`, {
        next: { revalidate: 300 },
        headers,
        signal,
      }),
      ...monthKeys.map(mk =>
        fetch(`https://api.chess.com/pub/player/${username}/games/${mk}`, {
          next: { revalidate: 300 },
          headers,
          signal,
        })
      ),
    ])
    clear()

    if (!statsRes.ok) return null
    const stats = await statsRes.json()

    const rapid = stats.chess_rapid
    if (!rapid) return null

    const rapidRating: number = rapid.last?.rating  ?? 0
    const peakRating: number  = rapid.best?.rating  ?? rapidRating
    const wins: number        = rapid.record?.win   ?? 0
    const losses: number      = rapid.record?.loss  ?? 0
    const draws: number       = rapid.record?.draw  ?? 0
    const totalGames          = wins + losses + draws
    const winRate             = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0

    // Collect all rapid games across 3 months in chronological order
    const eloHistory: number[] = []
    const allRapidGames: RawGame[] = []

    // Parse all successful archive responses in parallel instead of sequentially
    const successReses = gamesReses.filter(res => {
      if (res.status === 429 || res.status >= 500) {
        console.warn(`[chess] archive fetch failed with ${res.status} — data may be incomplete`)
        return false
      }
      return res.ok // skip genuine 404s (no games that month)
    })
    const parsedArchives = await Promise.all(successReses.map(r => r.json()))

    for (const data of parsedArchives) {
      const rapidGames: RawGame[] = (data.games ?? []).filter((g: RawGame) => g.time_class === 'rapid')

      for (const g of rapidGames) {
        const isWhite = g.white.username.toLowerCase() === username.toLowerCase()
        const myRating = (isWhite ? g.white.rating : g.black.rating) as number | undefined
        if (typeof myRating === 'number') eloHistory.push(myRating)
        allRapidGames.push(g)
      }
    }

    // Recent 8 games from the collected set, newest-to-oldest
    allRapidGames.sort((a, b) => (a.end_time ?? 0) - (b.end_time ?? 0))
    const recentRapid = allRapidGames.slice(-8).reverse()
    const recentResults = recentRapid.map(g => classifyResult(g, username))

    return {
      rapidRating, peakRating, wins, losses, draws, winRate, totalGames,
      recentResults, eloHistory,
    }
  } catch (err) {
    clear()
    console.error('[chess] fetchChessData failed:', err)
    return null
  }
}
