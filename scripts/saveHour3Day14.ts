/**
 * Script para obtener datos de la hora 3 del día 14 y subirlos a Supabase
 * Uso: npx tsx scripts/saveHour3Day14.ts [YYYY-MM-DD]
 * Si no se especifica fecha, usa el día 14 del mes actual
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '..', '.env') })

// Obtener fecha desde argumentos o usar día 14 del mes actual
const args = process.argv.slice(2)
let targetDate: Date

if (args.length > 0 && args[0].includes('-')) {
  // Formato: YYYY-MM-DD
  const [year, month, day] = args[0].split('-').map(Number)
  targetDate = new Date(Date.UTC(year, month - 1, day))
} else {
  // Usar día 14 del mes actual
  const now = new Date()
  const day = args.length > 0 ? parseInt(args[0]) : 14
  targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day))
}

const year = targetDate.getUTCFullYear()
const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0')
const day = String(targetDate.getUTCDate()).padStart(2, '0')
const dateString = `${year}-${month}-${day}`
const hour = 3 // Hora 3 (03:00 UTC)

async function saveHour3Day14() {
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

    // Calcular timestamps para la hora 3 del día específico
    const hourStart = new Date(Date.UTC(year, targetDate.getUTCMonth(), day, hour, 0, 0, 0))
    const hourEnd = new Date(Date.UTC(year, targetDate.getUTCMonth(), day, hour, 59, 59, 999))
    const startTime = hourStart.getTime()
    const endTime = hourEnd.getTime()

    console.log('📅 Obteniendo datos de la hora 3 del día 14')
    console.log('   Fecha:', dateString)
    console.log('   Hora:', hour.toString().padStart(2, '0') + ':00 UTC')
    console.log('   Desde:', hourStart.toUTCString())
    console.log('   Hasta:', hourEnd.toUTCString())
    console.log('')

    // Obtener datos de klines para la hora específica
    const klinesUrl = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=${startTime}&endTime=${endTime}&limit=1`
    
    console.log('🔗 URL:', klinesUrl)
    console.log('')

    const res = await fetch(klinesUrl)
    if (!res.ok) {
      throw new Error(`Error al obtener datos de Binance: ${res.statusText}`)
    }

    const klines: any[][] = await res.json()
    
    if (klines.length === 0) {
      console.log('⚠️ No se encontraron datos para esta fecha/hora')
      console.log('   Esto puede ser porque:')
      console.log('   - La fecha es futura')
      console.log('   - La fecha es muy antigua (Binance tiene límites)')
      console.log('   - No hay datos disponibles para esa hora')
      return
    }

    const kline = klines[0]
    const closeTime = kline[6] as number // Timestamp de cierre en milisegundos
    const openPrice = parseFloat(kline[1] as string)
    const closePrice = parseFloat(kline[4] as string)

    // Calcular el cambio porcentual desde apertura a cierre
    const priceChangePercent = ((closePrice - openPrice) / openPrice) * 100

    // Verificar que la fecha del kline corresponde al día objetivo
    const date = new Date(closeTime)
    const klineYear = date.getUTCFullYear()
    const klineMonth = String(date.getUTCMonth() + 1).padStart(2, '0')
    const klineDay = String(date.getUTCDate()).padStart(2, '0')
    const klineDateString = `${klineYear}-${klineMonth}-${klineDay}`
    const klineHour = date.getUTCHours()

    console.log(`✅ Datos obtenidos de Binance`)
    console.log(`   Fecha del kline: ${klineDateString}`)
    console.log(`   Hora del kline: ${klineHour.toString().padStart(2, '0')}:00`)
    console.log(`   Precio apertura: $${openPrice.toFixed(2)}`)
    console.log(`   Precio cierre: $${closePrice.toFixed(2)}`)
    console.log(`   Cambio %: ${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%`)
    console.log('')

    // Preparar datos para guardar
    const hourlyData = {
      date: klineDateString,
      hour: klineHour,
      price: closePrice,
      price_change_percent: priceChangePercent,
      timestamp: closeTime
    }

    console.log('💾 Guardando datos en Supabase...')
    console.log('   Fecha:', hourlyData.date)
    console.log('   Hora:', hourlyData.hour.toString().padStart(2, '0') + ':00')
    console.log('   Precio:', hourlyData.price)
    console.log('   Cambio %:', hourlyData.price_change_percent)
    console.log('   Timestamp:', hourlyData.timestamp)
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

    console.log('✅ Datos guardados correctamente en Supabase')
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

saveHour3Day14()
