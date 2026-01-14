/**
 * Script para verificar las fechas en la base de datos y agruparlas por mes
 * Uso: npx tsx scripts/verifyDates.ts
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

async function verifyDates() {
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

    console.log('🔍 Verificando fechas en la base de datos...\n')

    // Obtener todos los datos
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

    // Agrupar por mes
    const dataByMonth = new Map<string, {
      dates: Set<string>
      count: number
      dateRange: { min: string, max: string }
    }>()

    data.forEach(item => {
      const dateStr = typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0]
      const date = new Date(dateStr + 'T00:00:00Z')
      
      if (isNaN(date.getTime())) {
        console.warn(`⚠️  Fecha inválida encontrada: ${dateStr}`)
        return
      }

      const year = date.getUTCFullYear()
      const month = date.getUTCMonth() + 1
      const monthStr = `${year}-${String(month).padStart(2, '0')}`
      
      if (!dataByMonth.has(monthStr)) {
        dataByMonth.set(monthStr, {
          dates: new Set(),
          count: 0,
          dateRange: { min: dateStr, max: dateStr }
        })
      }

      const monthData = dataByMonth.get(monthStr)!
      monthData.dates.add(dateStr)
      monthData.count++
      
      if (dateStr < monthData.dateRange.min) {
        monthData.dateRange.min = dateStr
      }
      if (dateStr > monthData.dateRange.max) {
        monthData.dateRange.max = dateStr
      }
    })

    // Mostrar resumen por mes
    console.log('='.repeat(100))
    console.log('RESUMEN POR MES')
    console.log('='.repeat(100))
    console.log()

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

    const sortedMonths = Array.from(dataByMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]))

    for (const [monthStr, monthData] of sortedMonths) {
      const [year, month] = monthStr.split('-')
      const monthName = monthNames[parseInt(month) - 1]
      const datesArray = Array.from(monthData.dates).sort()
      
      console.log(`📅 ${monthName} ${year} (${monthStr})`)
      console.log(`   - Registros: ${monthData.count}`)
      console.log(`   - Fechas únicas: ${monthData.dates.size}`)
      console.log(`   - Rango: ${monthData.dateRange.min} a ${monthData.dateRange.max}`)
      
      // Verificar si hay fechas que no pertenecen al mes
      const wrongDates: string[] = []
      datesArray.forEach(dateStr => {
        const date = new Date(dateStr + 'T00:00:00Z')
        const dateYear = date.getUTCFullYear()
        const dateMonth = date.getUTCMonth() + 1
        const dateMonthStr = `${dateYear}-${String(dateMonth).padStart(2, '0')}`
        
        if (dateMonthStr !== monthStr) {
          wrongDates.push(dateStr)
        }
      })

      if (wrongDates.length > 0) {
        console.log(`   ❌ ERROR: ${wrongDates.length} fechas no pertenecen a este mes:`)
        wrongDates.forEach(d => console.log(`      - ${d}`))
      } else {
        console.log(`   ✅ Todas las fechas pertenecen al mes correcto`)
      }

      // Mostrar primeras y últimas fechas
      if (datesArray.length <= 10) {
        console.log(`   - Fechas: ${datesArray.join(', ')}`)
      } else {
        console.log(`   - Primeras 5 fechas: ${datesArray.slice(0, 5).join(', ')}`)
        console.log(`   - Últimas 5 fechas: ${datesArray.slice(-5).join(', ')}`)
      }
      
      console.log()
    }

    // Verificar fechas problemáticas específicas
    console.log('='.repeat(100))
    console.log('VERIFICACIÓN DE FECHAS ESPECÍFICAS')
    console.log('='.repeat(100))
    console.log()

    const problematicMonths = ['2025-06', '2025-11', '2025-12', '2026-01']
    
    for (const monthStr of problematicMonths) {
      const monthData = dataByMonth.get(monthStr)
      if (monthData) {
        console.log(`📅 ${monthStr}:`)
        const datesArray = Array.from(monthData.dates).sort()
        
        // Verificar cada fecha
        datesArray.forEach(dateStr => {
          const date = new Date(dateStr + 'T00:00:00Z')
          const dateYear = date.getUTCFullYear()
          const dateMonth = date.getUTCMonth() + 1
          const dateMonthStr = `${dateYear}-${String(dateMonth).padStart(2, '0')}`
          
          if (dateMonthStr !== monthStr) {
            console.log(`   ❌ ${dateStr} -> pertenece a ${dateMonthStr}, no a ${monthStr}`)
          }
        })
        
        console.log(`   Total fechas: ${datesArray.length}`)
        console.log()
      } else {
        console.log(`📅 ${monthStr}: No hay datos`)
        console.log()
      }
    }

    // Resumen final
    console.log('='.repeat(100))
    console.log('RESUMEN FINAL')
    console.log('='.repeat(100))
    console.log(`   - Total de meses con datos: ${dataByMonth.size}`)
    console.log(`   - Total de registros: ${count}`)
    console.log(`   - Total de fechas únicas: ${new Set(data.map(item => {
      const dateStr = typeof item.date === 'string' ? item.date : item.date.toISOString().split('T')[0]
      return dateStr
    })).size}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

verifyDates()
