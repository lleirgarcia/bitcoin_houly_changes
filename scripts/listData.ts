/**
 * Script para listar el contenido de la tabla btc_hourly_data en Supabase
 * Uso: npx tsx scripts/listData.ts
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

async function listData() {
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

    console.log('📊 Obteniendo datos de la tabla btc_hourly_data...\n')

    // Obtener todos los datos ordenados por fecha y hora
    const { data, error, count } = await supabase
      .from('btc_hourly_data')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .order('hour', { ascending: true })

    if (error) {
      console.error('❌ Error:', error.message)
      process.exit(1)
    }

    if (!data || data.length === 0) {
      console.log('ℹ️  No hay datos en la tabla')
      return
    }

    console.log(`✅ Total de registros: ${count}\n`)
    console.log('='.repeat(100))
    console.log('DATOS DE LA TABLA btc_hourly_data')
    console.log('='.repeat(100))
    console.log()

    // Agrupar por fecha para mejor visualización
    const dataByDate = new Map<string, typeof data>()
    data.forEach(item => {
      const dateStr = typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0]
      if (!dataByDate.has(dateStr)) {
        dataByDate.set(dateStr, [])
      }
      dataByDate.get(dateStr)!.push(item)
    })

    // Mostrar datos agrupados por fecha
    for (const [date, items] of Array.from(dataByDate.entries()).sort((a, b) => b[0].localeCompare(a[0]))) {
      console.log(`📅 FECHA: ${date}`)
      console.log('-'.repeat(100))
      console.log('Hora | Precio      | Cambio %   | Timestamp')
      console.log('-'.repeat(100))
      
      items.sort((a, b) => a.hour - b.hour).forEach(item => {
        const price = parseFloat(item.price.toString()).toLocaleString('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
        const change = parseFloat(item.price_change_percent.toString()).toFixed(2)
        const hour = item.hour.toString().padStart(2, '0')
        const timestamp = new Date(item.timestamp).toLocaleString('es-ES')
        
        console.log(`${hour}:00 | $${price.padStart(12)} | ${(change >= 0 ? '+' : '') + change.padStart(8)}% | ${timestamp}`)
      })
      console.log()
    }

    console.log('='.repeat(100))
    console.log(`\n📊 Resumen:`)
    console.log(`   - Total de registros: ${count}`)
    console.log(`   - Fechas únicas: ${dataByDate.size}`)
    console.log(`   - Promedio de horas por día: ${(count! / dataByDate.size).toFixed(1)}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

listData()
