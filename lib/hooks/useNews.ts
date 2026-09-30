'use client'
import { useMemo } from 'react'
import { useApiQuery } from './useApiQuery'

export interface NewsArticle {
  title:       string
  description: string
  url:         string
  source:      string
  publishedAt: string
  image:       string | null
  category?:   string
}

export interface NewsData {
  articles: NewsArticle[]
}

export function useNews(topics: string = 'technology') {
  const url = useMemo(
    () => `/api/news?topics=${encodeURIComponent(topics)}`,
    [topics]
  )
  return useApiQuery<NewsData>(url)
}
