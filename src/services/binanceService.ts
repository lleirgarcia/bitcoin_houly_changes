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
  // Usar UTC para consistencia con el cron job y la base de datos
  const hour = now.getUTCHours()
  const timestamp = now.getTime()
  
  // Obtener solo la fecha (sin hora) en formato YYYY-MM-DD usando UTC
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const dateString = `${year}-${month}-${day}` // Formato: YYYY-MM-DD en UTC
  
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
      // Obtener datos de hoy y ayer usando UTC para consistencia
      const now = new Date()
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const year = todayUTC.getUTCFullYear()
      const month = String(todayUTC.getUTCMonth() + 1).padStart(2, '0')
      const day = String(todayUTC.getUTCDate()).padStart(2, '0')
      const todayString = `${year}-${month}-${day}`
      
      const yesterdayUTC = new Date(todayUTC)
      yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1)
      const yesterdayYear = yesterdayUTC.getUTCFullYear()
      const yesterdayMonth = String(yesterdayUTC.getUTCMonth() + 1).padStart(2, '0')
      const yesterdayDay = String(yesterdayUTC.getUTCDate()).padStart(2, '0')
      const yesterdayString = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`
      
      console.log('🔍 Buscando datos para:', { today: todayString, yesterday: yesterdayString })
      
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
        // Mostrar qué fechas se encontraron
        const datesFound = [...new Set(data.map(item => typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0]))]
        console.log('📅 Fechas encontradas:', datesFound)
        console.log('📊 Distribución por fecha:', datesFound.map(date => {
          const count = data.filter(item => {
            const itemDate = typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0]
            return itemDate === date
          }).length
          return `${date}: ${count} horas`
        }))
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

/**
 * Obtiene datos históricos agrupados por mes y semana
 * Retorna un array de meses, cada mes contiene semanas, cada semana contiene los días con sus horas
 */
export const getHistoricalDataByWeek = async (comparisonMode: ComparisonMode = 'hour_yesterday'): Promise<Array<{
  month: string // Mes en formato "YYYY-MM"
  monthLabel: string // Etiqueta del mes (ej: "Enero 2026")
  weeks: Array<{
    weekStart: string // Fecha de inicio de semana (YYYY-MM-DD)
    weekEnd: string   // Fecha de fin de semana (YYYY-MM-DD)
    days: Array<{
      date: string
      hours: Array<{
        hour: number
        price: number
        priceYesterday: number | null // Precio de ayer a la misma hora
        priceChangePercent: number
        changePercent: number | null // Cambio vs misma hora del día anterior
      }>
    }>
  }>
}>> => {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('⚠️ Supabase no configurado, no se pueden obtener datos históricos')
    return []
  }

  try {
    // Obtener TODOS los datos disponibles sin limitación de fecha
    console.log('📅 Obteniendo todos los datos históricos disponibles')

    const { data, error } = await supabase
      .from('btc_hourly_data')
      .select('*')
      .order('date', { ascending: false })
      .order('hour', { ascending: true })

    console.log('📊 Datos obtenidos de Supabase:', data?.length || 0, 'registros')

    if (error) {
      console.error('❌ Error obteniendo datos históricos:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Debug: verificar fechas únicas
    const uniqueDates = [...new Set(data.map(item => {
      const dateStr = typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0]
      return dateStr
    }))]
    console.log('📅 Fechas únicas encontradas:', uniqueDates.length)
    console.log('📅 Primeras 10 fechas:', uniqueDates.slice(0, 10))
    console.log('📅 Últimas 10 fechas:', uniqueDates.slice(-10))

    // Agrupar por fecha
    const dataByDate = new Map<string, Array<{
      hour: number
      price: number
      priceChangePercent: number
      timestamp: number
    }>>()

    data.forEach(item => {
      const dateStr = typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0]
      if (!dataByDate.has(dateStr)) {
        dataByDate.set(dateStr, [])
      }
      dataByDate.get(dateStr)!.push({
        hour: item.hour,
        price: parseFloat(item.price.toString()),
        priceChangePercent: parseFloat(item.price_change_percent.toString()),
        timestamp: item.timestamp
      })
    })

    // Agrupar por mes primero, luego por semana (lunes a domingo)
    const months: Map<string, Map<string, Array<{
      date: string
      hours: Array<{
        hour: number
        price: number
        priceYesterday: number | null
        priceChangePercent: number
        changePercent: number | null
      }>
    }>>> = new Map()

    // Ordenar fechas
    const sortedDates = Array.from(dataByDate.keys()).sort().reverse()

    sortedDates.forEach(dateStr => {
      const date = new Date(dateStr + 'T00:00:00Z')
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Fecha inválida encontrada:', dateStr)
        return
      }
      
      const dayOfWeek = date.getUTCDay() // 0 = domingo, 1 = lunes, ...
      
      // Calcular inicio de semana (lunes)
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const weekStart = new Date(date)
      weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday)
      
      const weekStartStr = `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, '0')}-${String(weekStart.getUTCDate()).padStart(2, '0')}`
      
      // Obtener horas del día
      const dayHours = dataByDate.get(dateStr) || []
      
      // Obtener mes de la fecha
      const monthStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      
      // Debug: verificar si es noviembre o diciembre
      if (monthStr.includes('2025-11') || monthStr.includes('2025-12')) {
        console.log('📅 Procesando fecha:', dateStr, '-> mes calculado:', monthStr, '-> año:', date.getUTCFullYear(), '-> mes (0-11):', date.getUTCMonth())
      }
      
      if (!months.has(monthStr)) {
        months.set(monthStr, new Map())
      }
      const monthWeeks = months.get(monthStr)!

      if (!monthWeeks.has(weekStartStr)) {
        monthWeeks.set(weekStartStr, [])
      }

      // Calcular cambio porcentual según el modo de comparación
      const hoursWithChange = dayHours.map(hourData => {
        let changePercent: number | null = null
        let priceYesterday: number | null = null
        
        if (comparisonMode === 'previous_hour') {
          // Comparar con la hora anterior del mismo día
          if (hourData.hour === 0) {
            // La hora 0 no tiene hora anterior, comparar con la hora 23 del día anterior
            const prevDate = new Date(date)
            prevDate.setUTCDate(prevDate.getUTCDate() - 1)
            const prevDateStr = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}-${String(prevDate.getUTCDate()).padStart(2, '0')}`
            const prevDayHours = dataByDate.get(prevDateStr) || []
            const prevHour23 = prevDayHours.find(h => h.hour === 23)
            if (prevHour23) {
              priceYesterday = prevHour23.price
              changePercent = ((hourData.price - prevHour23.price) / prevHour23.price) * 100
            }
          } else {
            // Comparar con la hora anterior (hour - 1) del mismo día
            const previousHourData = dayHours.find(h => h.hour === hourData.hour - 1)
            if (previousHourData) {
              priceYesterday = previousHourData.price
              changePercent = ((hourData.price - previousHourData.price) / previousHourData.price) * 100
            }
          }
        } else {
          // Modo por defecto: comparar con misma hora del día anterior
          const prevDate = new Date(date)
          prevDate.setUTCDate(prevDate.getUTCDate() - 1)
          const prevDateStr = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}-${String(prevDate.getUTCDate()).padStart(2, '0')}`
          const prevDayHours = dataByDate.get(prevDateStr) || []
          const prevHourData = prevDayHours.find(h => h.hour === hourData.hour)
          if (prevHourData) {
            priceYesterday = prevHourData.price
            changePercent = ((hourData.price - prevHourData.price) / prevHourData.price) * 100
          }
        }

        return {
          hour: hourData.hour,
          price: hourData.price,
          priceYesterday,
          priceChangePercent: hourData.priceChangePercent,
          changePercent
        }
      })

      monthWeeks.get(weekStartStr)!.push({
        date: dateStr,
        hours: hoursWithChange.sort((a, b) => a.hour - b.hour)
      })
    })

    // Debug: mostrar qué meses se encontraron antes de convertir
    console.log('📅 Meses únicos encontrados (antes de convertir):', Array.from(months.keys()))
    
    // Convertir a array agrupado por mes
    const monthsArray = Array.from(months.entries()).map(([monthStr, monthWeeks]) => {
      const [year, month] = monthStr.split('-')
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`
      
      // Debug: verificar noviembre y diciembre
      if (monthStr.includes('2025-11') || monthStr.includes('2025-12')) {
        console.log(`📅 Procesando mes ${monthStr} (${monthLabel}):`, {
          semanas: monthWeeks.size,
          totalDias: Array.from(monthWeeks.values()).reduce((sum, days) => sum + days.length, 0)
        })
      }

      // Convertir semanas del mes a array
      const weeksArray = Array.from(monthWeeks.entries()).map(([weekStart, days]) => {
        const weekStartDate = new Date(weekStart + 'T00:00:00Z')
        const weekEndDate = new Date(weekStartDate)
        weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6)
        const weekEndStr = `${weekEndDate.getUTCFullYear()}-${String(weekEndDate.getUTCMonth() + 1).padStart(2, '0')}-${String(weekEndDate.getUTCDate()).padStart(2, '0')}`
        
        // Debug: verificar semanas que cruzan meses
        if (monthStr.includes('2025-11') || monthStr.includes('2025-12')) {
          const weekStartMonth = weekStartDate.getUTCMonth() + 1
          const weekEndMonth = weekEndDate.getUTCMonth() + 1
          if (weekStartMonth !== weekEndMonth) {
            console.log(`⚠️ Semana cruza meses: ${weekStart} a ${weekEndStr} (mes inicio: ${weekStartMonth}, mes fin: ${weekEndMonth})`)
          }
        }
        
        return {
          weekStart,
          weekEnd: weekEndStr,
          days: days.sort((a, b) => b.date.localeCompare(a.date)) // Días más recientes primero
        }
      }).sort((a, b) => b.weekStart.localeCompare(a.weekStart)) // Semanas más recientes primero

      return {
        month: monthStr,
        monthLabel,
        weeks: weeksArray
      }
    }).sort((a, b) => b.month.localeCompare(a.month)) // Meses más recientes primero

    // Debug: mostrar meses encontrados
    console.log('📅 Meses encontrados:', monthsArray.map(m => `${m.monthLabel} (${m.month})`))
    console.log('📅 Total de meses:', monthsArray.length)
    
    // Debug: verificar días en cada mes
    monthsArray.forEach(m => {
      if (m.month.includes('2025-11') || m.month.includes('2025-12')) {
        const allDays = m.weeks.flatMap(w => w.days.map(d => d.date))
        const uniqueDays = [...new Set(allDays)]
        console.log(`📅 ${m.monthLabel}: ${uniqueDays.length} días únicos, fechas:`, uniqueDays.slice(0, 5), '...', uniqueDays.slice(-5))
      }
    })

    return monthsArray
  } catch (error) {
    console.error('❌ Error procesando datos históricos:', error)
    return []
  }
}

export type ComparisonMode = 'hour_yesterday' | 'previous_hour'

export const get24HourGrid = async (comparisonMode: ComparisonMode = 'hour_yesterday'): Promise<Array<{ hour: number; changePercent: number | null; price: number | null }>> => {
  const stored = await getStoredHourlyData()
  if (stored.length === 0) {
    // Si no hay datos, retornar grid vacío
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      changePercent: null,
      price: null
    }))
  }

  // Obtener fechas: hoy y ayer usando UTC para consistencia
  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const year = todayUTC.getUTCFullYear()
  const month = String(todayUTC.getUTCMonth() + 1).padStart(2, '0')
  const day = String(todayUTC.getUTCDate()).padStart(2, '0')
  const todayString = `${year}-${month}-${day}`
  
  const yesterdayUTC = new Date(todayUTC)
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1)
  const yesterdayYear = yesterdayUTC.getUTCFullYear()
  const yesterdayMonth = String(yesterdayUTC.getUTCMonth() + 1).padStart(2, '0')
  const yesterdayDay = String(yesterdayUTC.getUTCDate()).padStart(2, '0')
  const yesterdayString = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`
  
  console.log('🔍 Fechas calculadas para comparación:', { today: todayString, yesterday: yesterdayString })

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
    
    let changePercent: number | null = null
    let price: number | null = null
    
    if (comparisonMode === 'hour_before' || comparisonMode === 'previous_hour') {
      // Comparar con la hora anterior del mismo día
      if (hour === 0) {
        // La hora 0 no tiene hora anterior, comparar con la hora 23 del día anterior
        const prevDayKey = `${yesterdayString}-23`
        const prevDayHour23 = dataByDateAndHour.get(prevDayKey)
        if (todayData && prevDayHour23) {
          changePercent = ((todayData.price - prevDayHour23.price) / prevDayHour23.price) * 100
          price = todayData.price
        } else if (todayData) {
          price = todayData.price
        }
      } else {
        // Comparar con la hora anterior (hour - 1)
        const previousHourKey = `${todayString}-${hour - 1}`
        const previousHourData = dataByDateAndHour.get(previousHourKey)
        if (todayData && previousHourData) {
          changePercent = ((todayData.price - previousHourData.price) / previousHourData.price) * 100
          price = todayData.price
        } else if (todayData) {
          price = todayData.price
        }
      }
    } else {
      // Modo por defecto: comparar con misma hora del día anterior
      if (todayData && yesterdayData) {
        changePercent = ((todayData.price - yesterdayData.price) / yesterdayData.price) * 100
        price = todayData.price
      } else if (todayData) {
        price = todayData.price
      }
    }
    
    return {
      hour,
      changePercent,
      price
    }
  })
  
  // Resumen del procesamiento
  const withComparison = grid.filter(g => g.changePercent !== null).length
  const onlyToday = grid.filter(g => g.price !== null && g.changePercent === null).length
  const noData = grid.filter(g => g.price === null).length
  console.log('📊 Resumen del grid:', {
    conComparación: withComparison,
    soloHoy: onlyToday,
    sinDatos: noData,
    total: grid.length
  })
  
  return grid
}

export const getHourlyDataWithLatest = async (): Promise<Array<{ hour: number; price: number | null; priceYesterday: number | null; changePercent: number | null; latestPrice: number | null; latestTimestamp: number | null }>> => {
  const stored = await getStoredHourlyData()
  if (stored.length === 0) {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      price: null,
      priceYesterday: null,
      changePercent: null,
      latestPrice: null,
      latestTimestamp: null
    }))
  }

  // Obtener fechas: hoy y ayer usando UTC para consistencia
  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const year = todayUTC.getUTCFullYear()
  const month = String(todayUTC.getUTCMonth() + 1).padStart(2, '0')
  const day = String(todayUTC.getUTCDate()).padStart(2, '0')
  const todayString = `${year}-${month}-${day}`
  
  const yesterdayUTC = new Date(todayUTC)
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1)
  const yesterdayYear = yesterdayUTC.getUTCFullYear()
  const yesterdayMonth = String(yesterdayUTC.getUTCMonth() + 1).padStart(2, '0')
  const yesterdayDay = String(yesterdayUTC.getUTCDate()).padStart(2, '0')
  const yesterdayString = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`
  
  // Agrupar datos por fecha y hora
  const dataByDateAndHour = new Map<string, HourlyData[]>()
  stored.forEach((data) => {
    const dateStr = typeof data.date === 'string' ? data.date : new Date(data.date).toISOString().split('T')[0]
    const key = `${dateStr}-${data.hour}`
    if (!dataByDateAndHour.has(key)) {
      dataByDateAndHour.set(key, [])
    }
    dataByDateAndHour.get(key)!.push({ ...data, date: dateStr })
  })
  
  // Encontrar el dato más reciente de todos
  const allData = stored.sort((a, b) => b.timestamp - a.timestamp)
  const latestData = allData.length > 0 ? allData[0] : null
  
  // Crear grid de 24 horas (0-23)
  const grid = Array.from({ length: 24 }, (_, i) => {
    const hour = i
    const todayKey = `${todayString}-${hour}`
    const yesterdayKey = `${yesterdayString}-${hour}`
    
    const todayData = dataByDateAndHour.get(todayKey)
    const yesterdayData = dataByDateAndHour.get(yesterdayKey)
    
    let price: number | null = null
    let priceYesterday: number | null = null
    let changePercent: number | null = null
    
    if (todayData && yesterdayData) {
      // Calcular cambio porcentual comparando con el día anterior
      price = todayData[0].price
      priceYesterday = yesterdayData[0].price
      changePercent = ((price - priceYesterday) / priceYesterday) * 100
    } else if (todayData) {
      // Solo hay dato de hoy
      price = todayData[0].price
    } else if (yesterdayData) {
      // Solo hay dato de ayer
      priceYesterday = yesterdayData[0].price
    }
    
    return {
      hour,
      price,
      priceYesterday,
      changePercent,
      latestPrice: latestData?.price || null,
      latestTimestamp: latestData?.timestamp || null
    }
  })
  
  return grid
}
