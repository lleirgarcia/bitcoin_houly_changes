/**
 * Script para obtener datos históricos por hora de Binance
 * Uso: npx tsx scripts/fetchHistoricalHourly.ts
 * 
 * Este script obtiene los datos de las últimas 24 horas usando el endpoint de klines
 * y los guarda en Supabase (una entrada por hora)
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

// Endpoint de Binance para obtener velas (klines) históricos
// Parámetros:
// - symbol: BTCUSDT
// - interval: 1h (velas de 1 hora)
// - limit: 24 (últimas 24 horas)
const BINANCE_KLINES_URL = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24'

interface KlineData {
  openTime: number        // Timestamp de apertura
  open: string           // Precio de apertura
  high: string           // Precio máximo
  low: string            // Precio mínimo
  close: string          // Precio de cierre
  volume: string          // Volumen
  closeTime: number      // Timestamp de cierre
  quoteVolume: string     // Volumen en quote asset
  trades: number         // Número de trades
  takerBuyBaseVolume: string
  takerBuyQuoteVolume: string
  ignore: string
}

async function fetchHistoricalHourly() {
  try {
    console.log('📡 Obteniendo datos históricos de Binance (últimas 24 horas)...\n')

    // Obtener datos de klines (velas de 1 hora)
    const response = await fetch(BINANCE_KLINES_URL)
    if (!response.ok) {
      throw new Error(`Error al obtener datos de Binance: ${response.statusText}`)
    }

    const klines: any[][] = await response.json()
    
    console.log(`✅ Obtenidas ${klines.length} velas de 1 hora\n`)

    // Configurar Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Error: Faltan variables de entorno de Supabase')
      console.log('   Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env')
      process.exit(1)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    let successCount = 0
    let errorCount = 0

    // Procesar cada vela
    for (const kline of klines) {
      // Formato de kline: [timestamp, open, high, low, close, volume, ...]
      const openTime = kline[0] as number
      const openPrice = parseFloat(kline[1] as string)
      const highPrice = parseFloat(kline[2] as string)
      const lowPrice = parseFloat(kline[3] as string)
      const closePrice = parseFloat(kline[4] as string)
      const closeTime = kline[6] as number

      // Crear fecha a partir del timestamp de cierre
      const date = new Date(closeTime)
      const hour = date.getUTCHours() // Usar UTC para consistencia
      
      // Obtener solo la fecha (sin hora) en formato YYYY-MM-DD
      const dateString = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        .toISOString().split('T')[0]

      // Calcular el cambio porcentual desde el precio de apertura
      const priceChangePercent = ((closePrice - openPrice) / openPrice) * 100

      const hourlyData = {
        date: dateString,
        hour: hour,
        price: closePrice, // Usar precio de cierre como precio de la hora
        price_change_percent: priceChangePercent,
        timestamp: closeTime
      }

      try {
        const { error } = await supabase
          .from('btc_hourly_data')
          .upsert(hourlyData, {
            onConflict: 'date,hour',
            ignoreDuplicates: false
          })

        if (error) {
          console.error(`❌ Error en ${dateString} ${hour}:00 -`, error.message)
          errorCount++
        } else {
          console.log(`✅ ${dateString} ${hour.toString().padStart(2, '0')}:00 - Precio: $${closePrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%)`)
          successCount++
        }
      } catch (err) {
        console.error(`❌ Error en ${dateString} ${hour}:00 -`, err)
        errorCount++
      }

      // Pequeña pausa para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n' + '='.repeat(60))
    console.log(`✨ Proceso completado:`)
    console.log(`   ✅ Exitosos: ${successCount}`)
    console.log(`   ❌ Errores: ${errorCount}`)
    console.log(`   📊 Total: ${successCount + errorCount} horas`)
    console.log('='.repeat(60))
    console.log('\n💡 Los datos están guardados en Supabase')
    console.log('   Recarga la aplicación para ver los datos en el grid\n')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fetchHistoricalHourly()
