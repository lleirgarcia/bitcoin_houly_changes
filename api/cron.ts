import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSupabaseClient } from './lib/supabaseServer'

// Endpoint de Binance para obtener velas históricas (klines) de 1 hora
const KLINES_URL = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24'

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
    console.log('🔄 Ejecutando cron job para recoger datos de todas las horas del día...')
    
    // Obtener datos históricos de las últimas 24 horas (klines)
    const res = await fetch(KLINES_URL)
    if (!res.ok) {
      throw new Error('Error al obtener datos de Binance')
    }
    
    const klines: any[][] = await res.json()
    console.log(`✅ Obtenidas ${klines.length} velas de 1 hora`)
    
    // Obtener fecha de hoy
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayString = today.toISOString().split('T')[0] // YYYY-MM-DD
    
    // Guardar en Supabase
    const supabase = createSupabaseClient()
    let successCount = 0
    let errorCount = 0
    
    // Procesar cada vela (cada hora)
    for (const kline of klines) {
      const closeTime = kline[6] as number // Timestamp de cierre en milisegundos
      const openPrice = parseFloat(kline[1] as string)
      const closePrice = parseFloat(kline[4] as string)
      
      // Calcular el cambio porcentual desde apertura a cierre
      const priceChangePercent = ((closePrice - openPrice) / openPrice) * 100
      
      // Usar el timestamp real para obtener la fecha y hora correctas en UTC
      const date = new Date(closeTime)
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}` // YYYY-MM-DD
      const hour = date.getUTCHours() // Hora en UTC
      
      // Solo guardar si es del día actual
      if (dateString === todayString) {
        const hourlyData = {
          date: dateString,
          hour,
          price: closePrice,
          price_change_percent: priceChangePercent,
          timestamp: closeTime
        }
        
        const { error: supabaseError } = await supabase
          .from('btc_hourly_data')
          .upsert(hourlyData, {
            onConflict: 'date,hour',
            ignoreDuplicates: false
          })
        
        if (supabaseError) {
          console.error(`❌ Error guardando hora ${hour}:00 -`, supabaseError.message)
          errorCount++
        } else {
          console.log(`✅ Hora ${hour.toString().padStart(2, '0')}:00 guardada - Precio: $${closePrice.toFixed(2)}`)
          successCount++
        }
      }
    }
    
    return response.status(200).json({ 
      success: true, 
      message: 'Datos del día guardados correctamente',
      data: {
        date: todayString,
        successCount,
        errorCount,
        total: successCount + errorCount
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
