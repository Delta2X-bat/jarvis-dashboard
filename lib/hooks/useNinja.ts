'use client'
import { useApiQuery } from './useApiQuery'

export interface NinjaData {
  quote: { text: string; author: string }
  fact:  string
}

export function useNinja() {
  return useApiQuery<NinjaData>('/api/ninja')
}
