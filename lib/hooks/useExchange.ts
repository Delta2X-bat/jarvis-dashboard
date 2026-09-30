'use client'
import { useApiQuery } from './useApiQuery'

export interface ExchangeData {
  base:       string
  eur_to_pln: number; pln_to_eur: number
  eur_to_usd: number; usd_to_eur: number
  eur_to_gbp: number; gbp_to_eur: number
  timestamp:  string
}

export function useExchange() {
  return useApiQuery<ExchangeData>('/api/exchange')
}
