/**
 * Script para ejecutar el cron job manualmente en desarrollo
 * Uso: npx tsx scripts/runCron.ts
 */

import { createClient } from '@supabase/supabase-js'

const API_URL = 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'

// Cargar variables de entorno desde .env
import dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar .env desde la raíz del proyecto (un nivel arriba de scripts/)
dotenv.config({ path: resolve(__dirname, '..', '.env') })

async function runCron() {
  try {
    console.log('🔄 Ejecutando cron job...')
    
    // Fetch datos de Binance
    console.log('📡 Obteniendo datos de Binance...')
    const res = await fetch(API_URL)
    if (!res.ok) {
      throw new Error('Error al obtener datos de Binance')
    }
    
    const data = await res.json()
    console.log('✅ Datos obtenidos:', {
      precio: data.lastPrice,
      cambio: data.priceChangePercent + '%'
    })
    
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

    console.log('💾 Guardando datos...')
    console.log('   Hora:', hour)
    console.log('   Timestamp:', timestamp)
    console.log('   Precio:', hourlyData.price)
    console.log('   Cambio %:', hourlyData.price_change_percent)

    // Guardar en Supabase si está configurado
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
    const supabaseKey = supabaseServiceKey || supabaseAnonKey

    console.log('🔍 Verificando configuración de Supabase...')
    console.log('   URL:', supabaseUrl ? '✅ Configurada' : '❌ No configurada')
    console.log('   Service Role Key:', supabaseServiceKey ? '✅ Configurada' : '❌ No configurada')
    console.log('   Anon Key:', supabaseAnonKey ? '✅ Configurada' : '❌ No configurada')

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      console.log(`🔑 Usando ${supabaseServiceKey ? 'service_role' : 'anon'} key para Supabase`)
      
      const { error: supabaseError, data } = await supabase
        .from('btc_hourly_data')
        .upsert(hourlyData, {
          onConflict: 'date,hour',
          ignoreDuplicates: false
        })

      if (supabaseError) {
        console.error('❌ Error guardando en Supabase:', supabaseError.message)
        if (supabaseError.message.includes('permission') || supabaseError.message.includes('policy')) {
          console.log('💡 Necesitas usar la service_role key para escribir datos.')
          console.log('   Ve a Settings > API en Supabase y copia la service_role key')
        }
        console.log('⚠️  Los datos NO se guardaron en Supabase')
        return
      }
      
      console.log('✅ Datos guardados correctamente en Supabase')
      console.log('   📊 Hora:', hour, ':00')
      console.log('   💰 Precio:', hourlyData.price)
      console.log('   📈 Cambio:', hourlyData.price_change_percent + '%')
    } else {
      console.log('⚠️  Supabase no está configurado. Configura SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env')
      console.log('   Los datos se guardarán en localStorage cuando visites la página')
    }
    
    console.log('✨ Cron job completado exitosamente')
  } catch (error) {
    console.error('❌ Error en cron job:', error)
    process.exit(1)
  }
}

runCron()
