/**
 * Script para guardar datos de una hora específica en Supabase
 * Uso: npx tsx scripts/saveHourData.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '..', '.env') })

// Datos proporcionados por el usuario
const binanceData = {
  "symbol": "BTCUSDT",
  "priceChange": "4040.62000000",
  "priceChangePercent": "4.423",
  "weightedAvgPrice": "93388.72390252",
  "prevClosePrice": "91351.26000000",
  "lastPrice": "95391.88000000",
  "lastQty": "0.00153000",
  "bidPrice": "95391.87000000",
  "bidQty": "1.86520000",
  "askPrice": "95391.88000000",
  "askQty": "4.29444000",
  "openPrice": "91351.26000000",
  "highPrice": "96495.00000000",
  "lowPrice": "91042.66000000",
  "volume": "23052.42151000",
  "quoteVolume": "2152836227.68180170",
  "openTime": 1768262659004,
  "closeTime": 1768349059004,
  "firstId": 5764136114,
  "lastId": 5769178466,
  "count": 5042353
}

async function saveHourData() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Error: Faltan variables de entorno')
      console.log('   Necesitas configurar:')
      console.log('   - SUPABASE_URL o VITE_SUPABASE_URL')
      console.log('   - SUPABASE_SERVICE_ROLE_KEY o VITE_SUPABASE_ANON_KEY')
      process.exit(1)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Obtener fecha actual en UTC
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const dateString = today.toISOString().split('T')[0] // YYYY-MM-DD
    
    // Hora 1 de la mañana (01:00) en UTC
    const hour = 1
    
    // Crear timestamp para la hora 1:00 UTC del día actual
    const hourDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0, 0))
    const timestamp = hourDate.getTime()
    
    console.log('📅 Información de fecha/hora:')
    console.log('   Hora local:', now.getHours())
    console.log('   Hora UTC:', now.getUTCHours())
    console.log('   Fecha UTC:', dateString)
    console.log('   Hora a guardar (UTC):', hour)
    console.log('   Timestamp:', timestamp)
    console.log('')

    // Preparar datos para guardar
    const hourlyData = {
      date: dateString,
      hour: hour,
      price: parseFloat(binanceData.lastPrice),
      price_change_percent: parseFloat(binanceData.priceChangePercent),
      timestamp: timestamp
    }

    console.log('💾 Guardando datos en Supabase...')
    console.log('   Fecha:', dateString)
    console.log('   Hora:', hour.toString().padStart(2, '0') + ':00')
    console.log('   Precio:', hourlyData.price)
    console.log('   Cambio %:', hourlyData.price_change_percent)
    console.log('   Timestamp:', timestamp)
    console.log('')

    const { data, error } = await supabase
      .from('btc_hourly_data')
      .upsert(hourlyData, {
        onConflict: 'date,hour',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('❌ Error guardando en Supabase:', error.message)
      console.error('   Código:', error.code)
      console.error('   Detalles:', error.details)
      process.exit(1)
    }

    console.log('✅ Datos guardados correctamente')
    console.log('   ID:', data?.[0]?.id)
    console.log('   Fecha:', data?.[0]?.date)
    console.log('   Hora:', data?.[0]?.hour)
    console.log('   Precio:', data?.[0]?.price)
    console.log('   Cambio %:', data?.[0]?.price_change_percent)
    console.log('')
    console.log('✨ Proceso completado exitosamente')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

saveHourData()
