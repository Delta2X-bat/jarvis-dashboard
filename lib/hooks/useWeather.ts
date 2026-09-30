'use client'
import { useApiQuery } from './useApiQuery'

export interface WeatherCurrent {
  temp: number; feels_like: number; temp_min: number; temp_max: number
  description: string; icon: string
  humidity: number; pressure: number; visibility: number
  wind_speed: number; wind_deg: number; wind_direction: string
  uv_index: number | null; uv_label: string; uv_unavailable?: boolean; dew_point: number
  sunrise: string; sunset: string; city: string
}

export interface WeatherForecastItem {
  dt: number; date: string
  temp_min: number; temp_max: number
  description: string; icon: string
  humidity: number; wind_speed: number
  pop: number // precipitation probability 0-100
}

export interface WeatherData {
  current:  WeatherCurrent
  forecast: WeatherForecastItem[]
}

export function useWeather() {
  return useApiQuery<WeatherData>('/api/weather')
}
