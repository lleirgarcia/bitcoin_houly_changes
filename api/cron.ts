import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSupabaseClient } from './lib/supabaseServer'

const API_URL = 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Verificar que es una llamada del cron job de Vercel
  const cronSecret = request.headers['authorization']?.replace('Bearer ', '')
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return response.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Fetch datos de Binance
    const res = await fetch(API_URL)
    if (!res.ok) {
      throw new Error('Error al obtener datos de Binance')
    }
    
    const data = await res.json()
    
    // Preparar datos para guardar
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

    // Guardar en Supabase
    const supabase = createSupabaseClient()
    const { error: supabaseError } = await supabase
      .from('btc_hourly_data')
      .upsert(hourlyData, {
        onConflict: 'date,hour',
        ignoreDuplicates: false
      })

    if (supabaseError) {
      console.error('Error saving to Supabase:', supabaseError)
      return response.status(500).json({ 
        error: 'Error al guardar en Supabase',
        message: supabaseError.message
      })
    }
    
    return response.status(200).json({ 
      success: true, 
      message: 'Datos guardados correctamente',
      data: {
        timestamp: new Date().toISOString(),
        price: parseFloat(data.lastPrice),
        priceChangePercent: parseFloat(data.priceChangePercent),
      }
    })
  } catch (error) {
    console.error('Error en cron job:', error)
    return response.status(500).json({ 
      error: 'Error al procesar el cron job',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
