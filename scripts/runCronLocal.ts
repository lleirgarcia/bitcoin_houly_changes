/**
 * Script para ejecutar el cron job localmente (sin Vercel)
 * Cada vez que se ejecuta, obtiene los datos de la hora actual y los guarda en Supabase
 * 
 * Uso:
 *   - Manual: npx tsx scripts/runCronLocal.ts
 *   - Con crontab: configurar para ejecutar cada hora (0 * * * *)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar .env desde la raíz del proyecto
dotenv.config({ path: resolve(__dirname, '..', '.env') })

// Endpoint de Binance para obtener la última vela cerrada de 1 hora
// limit=1 obtiene solo la última vela cerrada (la hora que acaba de terminar)
const KLINES_URL = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=1'

async function runCronLocal() {
  try {
    const now = new Date()
    console.log(`🔄 Ejecutando cron job local - ${now.toISOString()}`)
    console.log(`   Hora local: ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`)
    console.log(`   Hora UTC: ${now.getUTCHours()}:${String(now.getUTCMinutes()).padStart(2, '0')}`)
    
    // Verificar configuración de Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
    const supabaseKey = supabaseServiceKey || supabaseAnonKey

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('❌ Faltan variables de entorno de Supabase. Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env')
    }

    console.log('🔍 Configuración de Supabase:')
    console.log('   URL:', supabaseUrl ? '✅ Configurada' : '❌ No configurada')
    console.log('   Service Role Key:', supabaseServiceKey ? '✅ Configurada' : '❌ No configurada')
    
    // Obtener la última vela cerrada de Binance (la hora que acaba de terminar)
    console.log('📡 Obteniendo datos de Binance para la hora actual...')
    const res = await fetch(KLINES_URL)
    if (!res.ok) {
      throw new Error(`Error al obtener datos de Binance: ${res.status} ${res.statusText}`)
    }
    
    const klines: any[][] = await res.json()
    
    if (!klines || klines.length === 0) {
      throw new Error('No se obtuvieron datos de Binance')
    }
    
    // Obtener la última vela (la única que devuelve limit=1)
    const kline = klines[0]
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
    
    console.log(`✅ Datos obtenidos de Binance:`)
    console.log(`   Fecha: ${dateString}`)
    console.log(`   Hora UTC: ${hour.toString().padStart(2, '0')}:00`)
    console.log(`   Precio de cierre: $${closePrice.toFixed(2)}`)
    console.log(`   Cambio %: ${priceChangePercent.toFixed(2)}%`)
    
    // Guardar en Supabase
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log(`🔑 Usando ${supabaseServiceKey ? 'service_role' : 'anon'} key para Supabase`)
    
    const hourlyData = {
      date: dateString,
      hour,
      price: closePrice,
      price_change_percent: priceChangePercent,
      timestamp: closeTime
    }
    
    console.log('💾 Guardando datos en Supabase...')
    const { error: supabaseError, data } = await supabase
      .from('btc_hourly_data')
      .upsert(hourlyData, {
        onConflict: 'date,hour',
        ignoreDuplicates: false
      })
    
    if (supabaseError) {
      console.error(`❌ Error guardando en Supabase:`, supabaseError.message)
      if (supabaseError.message.includes('permission') || supabaseError.message.includes('policy')) {
        console.log('💡 Necesitas usar la service_role key para escribir datos.')
        console.log('   Ve a Settings > API en Supabase y copia la service_role key')
      }
      throw supabaseError
    }
    
    console.log(`✅ Hora ${hour.toString().padStart(2, '0')}:00 guardada exitosamente`)
    console.log(`   📅 Fecha: ${dateString}`)
    console.log(`   💰 Precio: $${closePrice.toFixed(2)}`)
    console.log(`   📈 Cambio %: ${priceChangePercent.toFixed(2)}%`)
    console.log(`   ⏰ Timestamp: ${closeTime}`)
    
    console.log('\n✨ Cron job completado exitosamente')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error en cron job:', error)
    if (error instanceof Error) {
      console.error('   Mensaje:', error.message)
    }
    process.exit(1)
  }
}

runCronLocal()
