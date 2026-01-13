/**
 * Script para poblar todas las horas del día actual
 * Uso: npx tsx scripts/populateToday.ts
 * 
 * Este script obtiene los datos actuales de Binance y los guarda
 * para cada hora del día (desde 00:00 hasta la hora actual)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const API_URL = 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'

async function populateToday() {
  try {
    console.log('🔄 Poblando datos para todas las horas de hoy...\n')
    
    // Obtener datos actuales de Binance
    console.log('📡 Obteniendo datos de Binance...')
    const res = await fetch(API_URL)
    if (!res.ok) {
      throw new Error('Error al obtener datos de Binance')
    }
    
    const data = await res.json()
    const currentPrice = parseFloat(data.lastPrice)
    const currentChange = parseFloat(data.priceChangePercent)
    
    console.log('✅ Datos obtenidos:', {
      precio: currentPrice,
      cambio: currentChange + '%'
    })
    console.log('')

    // Configurar Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️  Supabase no está configurado. Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env')
      console.log('   Este script requiere Supabase para funcionar.')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Obtener fecha actual
    const now = new Date()
    const currentHour = now.getHours()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    console.log(`📅 Fecha: ${today.toLocaleDateString()}`)
    console.log(`⏰ Hora actual: ${currentHour}:00`)
    console.log(`📊 Procesando horas desde 00:00 hasta ${currentHour}:00\n`)

    let successCount = 0
    let errorCount = 0

    // Procesar cada hora desde 00:00 hasta la hora actual
    for (let hour = 0; hour <= currentHour; hour++) {
      // Crear timestamp para esta hora del día
      const hourDate = new Date(today)
      hourDate.setHours(hour, 0, 0, 0)
      const timestamp = hourDate.getTime()
      
      // Simular un precio ligeramente diferente para cada hora (variación pequeña)
      // Esto es solo para visualización, ya que no tenemos datos históricos reales
      const variation = (Math.random() - 0.5) * 0.02 // ±1% de variación
      const hourPrice = currentPrice * (1 + variation)
      const hourChange = currentChange + (Math.random() - 0.5) * 0.5 // Pequeña variación en el cambio
      
      const hourlyData = {
        timestamp,
        hour,
        price: Math.round(hourPrice * 100) / 100, // Redondear a 2 decimales
        price_change_percent: Math.round(hourChange * 100) / 100,
        date: hourDate.toISOString()
      }

      try {
        const { error } = await supabase
          .from('btc_hourly_data')
          .upsert(hourlyData, {
            onConflict: 'timestamp,hour',
            ignoreDuplicates: false
          })

        if (error) {
          console.error(`❌ Error en hora ${hour.toString().padStart(2, '0')}:00 -`, error.message)
          errorCount++
        } else {
          console.log(`✅ Hora ${hour.toString().padStart(2, '0')}:00 - Precio: $${hourlyData.price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          successCount++
        }
      } catch (err) {
        console.error(`❌ Error en hora ${hour.toString().padStart(2, '0')}:00 -`, err)
        errorCount++
      }
      
      // Pequeña pausa para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n' + '='.repeat(50))
    console.log(`✨ Proceso completado:`)
    console.log(`   ✅ Exitosos: ${successCount}`)
    console.log(`   ❌ Errores: ${errorCount}`)
    console.log(`   📊 Total: ${successCount + errorCount} horas`)
    console.log('='.repeat(50))
    console.log('\n💡 Recarga la página para ver los datos en el grid')
    
  } catch (error) {
    console.error('❌ Error en el script:', error)
    process.exit(1)
  }
}

populateToday()
