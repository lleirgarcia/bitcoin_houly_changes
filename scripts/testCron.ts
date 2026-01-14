/**
 * Script para probar el cron job manualmente
 * Uso: npx tsx scripts/testCron.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '..', '.env') })

const API_URL = 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'

async function testCron() {
  try {
    console.log('🔄 Probando cron job...\n')
    
    // 1. Verificar variables de entorno
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('📋 Variables de entorno:')
    console.log('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
    console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
    console.log('')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Faltan variables de entorno')
      process.exit(1)
    }
    
    // 2. Obtener datos de Binance
    console.log('📡 Obteniendo datos de Binance...')
    const res = await fetch(API_URL)
    if (!res.ok) {
      throw new Error(`Error al obtener datos: ${res.statusText}`)
    }
    const data = await res.json()
    console.log('✅ Datos obtenidos:', {
      precio: data.lastPrice,
      cambio: data.priceChangePercent + '%'
    })
    console.log('')
    
    // 3. Preparar datos
    const now = new Date()
    const hour = now.getHours()
    const timestamp = now.getTime()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dateString = today.toISOString().split('T')[0]
    
    const hourlyData = {
      date: dateString,
      hour,
      price: parseFloat(data.lastPrice),
      price_change_percent: parseFloat(data.priceChangePercent),
      timestamp
    }
    
    console.log('💾 Datos a guardar:')
    console.log('   Fecha:', dateString)
    console.log('   Hora:', hour)
    console.log('   Precio:', hourlyData.price)
    console.log('   Cambio %:', hourlyData.price_change_percent)
    console.log('')
    
    // 4. Guardar en Supabase
    console.log('💾 Guardando en Supabase...')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: insertedData, error } = await supabase
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
    console.log('   ID:', insertedData?.[0]?.id)
    console.log('   Fecha:', insertedData?.[0]?.date)
    console.log('   Hora:', insertedData?.[0]?.hour)
    console.log('')
    console.log('✨ Cron job ejecutado exitosamente')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

testCron()
