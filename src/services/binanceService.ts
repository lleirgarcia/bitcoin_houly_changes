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
  
  const hourlyData = {
    timestamp,
    hour,
    price: parseFloat(data.lastPrice),
    price_change_percent: parseFloat(data.priceChangePercent),
    date: now.toISOString()
  }

  // Intentar guardar en Supabase si está configurado
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('btc_hourly_data')
        .upsert(hourlyData, {
          onConflict: 'timestamp,hour',
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

const saveToLocalStorage = async (hourlyData: { timestamp: number; hour: number; price: number; price_change_percent: number; date: string }): Promise<void> => {
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
      const { data, error } = await supabase
        .from('btc_hourly_data')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(48)

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
          date: item.date
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

  const now = new Date()
  const currentHour = now.getHours()
  
  // Crear array de 24 horas (últimas 24 horas desde la hora actual)
  const grid = Array.from({ length: 24 }, (_, i) => {
    const hour = (currentHour - 23 + i + 24) % 24
    return { hour, changePercent: null as number | null, price: null as number | null }
  })
  
  // Agrupar datos por hora
  const dataByHour = new Map<number, HourlyData[]>()
  stored.forEach((data) => {
    const hour = data.hour
    if (!dataByHour.has(hour)) {
      dataByHour.set(hour, [])
    }
    dataByHour.get(hour)!.push(data)
  })
  
  // Para cada hora en el grid, buscar el dato más reciente y comparar con el de hace ~24 horas
  grid.forEach((gridItem) => {
    const hour = gridItem.hour
    const hourData = dataByHour.get(hour) || []
    
    if (hourData.length === 0) return
    
    // Ordenar por timestamp (más reciente primero)
    hourData.sort((a, b) => b.timestamp - a.timestamp)
    
    // Tomar el dato más reciente para esta hora
    const latest = hourData[0]
    
    // Buscar el dato de la misma hora pero de hace aproximadamente 24 horas
    const oneDayAgo = latest.timestamp - (24 * 60 * 60 * 1000)
    const dayBefore = hourData.find((d) => {
      const timeDiff = Math.abs(d.timestamp - oneDayAgo)
      // Permitir un margen de ±2 horas para encontrar el dato más cercano
      return timeDiff <= 2 * 60 * 60 * 1000 && d.timestamp < latest.timestamp
    })
    
    if (dayBefore) {
      const changePercent = ((latest.price - dayBefore.price) / dayBefore.price) * 100
      gridItem.changePercent = changePercent
      gridItem.price = latest.price
    } else if (hourData.length > 0) {
      // Si no hay dato de hace 24h, al menos mostrar el precio actual
      gridItem.price = latest.price
    }
  })
  
  return grid
}
