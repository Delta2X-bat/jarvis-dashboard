'use client'
import { useApiQuery } from './useApiQuery'

export interface AirQualityData {
  aqi:           number
  pm25:          number
  pm10:          number
  no2:           number
  status:        'Good' | 'Moderate' | 'Unhealthy for Sensitive' | 'Unhealthy' | 'Hazardous'
  location_name: string
}

export function useAirQuality() {
  return useApiQuery<AirQualityData>('/api/airquality')
}
