import { BinanceTickerResponse, HourlyData } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const STORAGE_KEY = 'btc_hourly_data'
const API_URL = 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'

export const fetchBinanceData = async (): Promise<BinanceTickerResponse> => {
  const response = await fetch(API_URL)
  if (!response.ok) {
    throw new Error('Error al obtener datos de Binance')
  }
  return response.json()
}

export const saveHourlyData = async (data: BinanceTickerResponse): Promise<void> => {
  const now = new Date()
  const hour = now.getHours()
  const timestamp = now.getTime()
  
  // Obtener solo la fecha (sin hora) en formato YYYY-MM-DD
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateString = today.toISOString().split('T')[0] // Formato: YYYY-MM-DD
  
  const hourlyData = {
    date: dateString,
    hour,
    price: parseFloat(data.lastPrice),
    price_change_percent: parseFloat(data.priceChangePercent),
    timestamp
  }

  // Intentar guardar en Supabase si está configurado
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('btc_hourly_data')
        .upsert(hourlyData, {
          onConflict: 'date,hour',
          ignoreDuplicates: false
        })

      if (error) {
        console.warn('Error saving to Supabase, using localStorage:', error)
        await saveToLocalStorage(hourlyData)
      }
    } catch (error) {
      console.warn('Error in saveHourlyData, using localStorage:', error)
      await saveToLocalStorage(hourlyData)
    }
  } else {
    // Si Supabase no está configurado, usar localStorage
    await saveToLocalStorage(hourlyData)
  }
}

const saveToLocalStorage = async (hourlyData: { date: string; hour: number; price: number; price_change_percent: number; timestamp: number }): Promise<void> => {
  const stored = await getStoredHourlyData()
  const data: HourlyData = {
    timestamp: hourlyData.timestamp,
    hour: hourlyData.hour,
    priceChangePercent: hourlyData.price_change_percent,
    price: hourlyData.price,
    date: hourlyData.date
  }
  
  stored.push(data)
  const recent = stored.slice(-48)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
}

export const getStoredHourlyData = async (): Promise<HourlyData[]> => {
  // Intentar obtener de Supabase si está configurado
  if (isSupabaseConfigured() && supabase) {
    try {
      console.log('📡 Intentando obtener datos de Supabase...')
      // Obtener datos de hoy y ayer
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayString = today.toISOString().split('T')[0]
      
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = yesterday.toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('btc_hourly_data')
        .select('*')
        .in('date', [todayString, yesterdayString])
        .order('date', { ascending: false })
        .order('hour', { ascending: true })

      if (error) {
        console.warn('⚠️ Error de Supabase:', error.message)
      } else if (data && data.length > 0) {
        console.log('✅ Datos obtenidos de Supabase:', data.length, 'registros')
        // Convertir datos de Supabase al formato local
        return data.map(item => ({
          timestamp: item.timestamp,
          hour: item.hour,
          priceChangePercent: parseFloat(item.price_change_percent.toString()),
          price: parseFloat(item.price.toString()),
          date: typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0]
        }))
      } else {
        console.log('ℹ️ No hay datos en Supabase aún')
      }
    } catch (error) {
      console.warn('⚠️ Error fetching from Supabase, using localStorage:', error)
    }
  } else {
    console.log('ℹ️ Supabase no está configurado, usando localStorage')
  }

  // Fallback a localStorage
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored || stored === '[]' || stored === 'null') {
    // Si no hay datos, intentar cargar datos de ejemplo en desarrollo
    if (import.meta.env.DEV) {
      const { loadSampleDataIfNeeded } = await import('../utils/loadSampleData')
      loadSampleDataIfNeeded()
      // Intentar de nuevo después de cargar
      const retry = localStorage.getItem(STORAGE_KEY)
      if (retry) {
        try {
          const parsed = JSON.parse(retry)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      }
    }
    return []
  }
  
  try {
    const parsed = JSON.parse(stored)
    // Asegurarse de que sea un array
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const get24HourGrid = async (): Promise<Array<{ hour: number; changePercent: number | null; price: number | null }>> => {
  const stored = await getStoredHourlyData()
  if (stored.length === 0) {
    // Si no hay datos, retornar grid vacío
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      changePercent: null,
      price: null
    }))
  }

  // Obtener fechas: hoy y ayer
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayString = today.toISOString().split('T')[0]
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = yesterday.toISOString().split('T')[0]
  
  // Agrupar datos por fecha y hora
  const dataByDateAndHour = new Map<string, HourlyData>()
  stored.forEach((data) => {
    const dateStr = typeof data.date === 'string' ? data.date : new Date(data.date).toISOString().split('T')[0]
    const key = `${dateStr}-${data.hour}`
    // Si ya existe, mantener el más reciente (mayor timestamp)
    const existing = dataByDateAndHour.get(key)
    if (!existing || data.timestamp > existing.timestamp) {
      dataByDateAndHour.set(key, { ...data, date: dateStr })
    }
  })
  
  // Crear grid de 24 horas (0-23)
  const grid = Array.from({ length: 24 }, (_, i) => {
    const hour = i
    const todayKey = `${todayString}-${hour}`
    const yesterdayKey = `${yesterdayString}-${hour}`
    
    const todayData = dataByDateAndHour.get(todayKey)
    const yesterdayData = dataByDateAndHour.get(yesterdayKey)
    
    if (todayData && yesterdayData) {
      // Calcular cambio porcentual comparando con el día anterior
      const changePercent = ((todayData.price - yesterdayData.price) / yesterdayData.price) * 100
      return {
        hour,
        changePercent,
        price: todayData.price
      }
    } else if (todayData) {
      // Solo hay dato de hoy, mostrar precio sin cambio
      return {
        hour,
        changePercent: null,
        price: todayData.price
      }
    } else {
      // No hay datos para esta hora
      return {
        hour,
        changePercent: null,
        price: null
      }
    }
  })
  
  return grid
}
