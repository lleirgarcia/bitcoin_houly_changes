/**
 * Script para obtener datos históricos de junio 2025
 * Uso: npx tsx scripts/fetchNovemberDecember2025.ts
 * 
 * Este script obtiene los datos de cada día de junio 2025
 * y genera archivos SQL para insertarlos en Supabase
 */

import { writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

interface KlineData {
  date: string
  hour: number
  price: number
  priceChangePercent: number
  timestamp: number
}

async function fetchDayData(year: number, month: number, day: number): Promise<KlineData[]> {
  // Calcular timestamps para el día específico (inicio y fin del día en UTC)
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
  const startTime = startOfDay.getTime()
  const endTime = endOfDay.getTime()

  // URL de Binance API
  const klinesUrl = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=${startTime}&endTime=${endTime}&limit=24`
  
  console.log(`   🔗 URL: ${klinesUrl}`)

  const res = await fetch(klinesUrl)
  if (!res.ok) {
    throw new Error(`Error al obtener datos: ${res.statusText}`)
  }

  const klines: any[][] = await res.json()

  if (klines.length === 0) {
    return []
  }

  // Procesar cada vela
  const data: KlineData[] = []
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

    data.push({
      date: dateString,
      hour,
      price: closePrice,
      priceChangePercent,
      timestamp: closeTime
    })
  }

  return data
}

function generateSQLForMonth(monthData: Map<string, KlineData[]>, monthName: string): string {
  const sqlStatements: string[] = []
  
  sqlStatements.push(`-- SQL para insertar datos históricos de ${monthName} 2025`)
  sqlStatements.push('-- Generado automáticamente desde datos de Binance klines')
  sqlStatements.push('-- Los datos se asignan a la fecha real según su timestamp')
  sqlStatements.push('')

  // Obtener todas las fechas únicas para el DELETE
  const dates = Array.from(monthData.keys()).sort()
  
  sqlStatements.push('-- Eliminar datos existentes de las fechas que se van a insertar')
  dates.forEach(date => {
    sqlStatements.push(`DELETE FROM btc_hourly_data WHERE date = '${date}';`)
  })
  sqlStatements.push('')

  // Generar valores INSERT
  const values: string[] = []
  dates.forEach(date => {
    const dayData = monthData.get(date) || []
    dayData.forEach(item => {
      const value = `('${item.date}', ${item.hour}, ${item.price.toFixed(2)}, ${item.priceChangePercent.toFixed(4)}, ${item.timestamp})`
      values.push(value)
    })
  })

  if (values.length > 0) {
    sqlStatements.push('-- Insertar nuevos datos')
    sqlStatements.push('INSERT INTO btc_hourly_data (date, hour, price, price_change_percent, timestamp) VALUES')
    sqlStatements.push(values.join(',\n'))
    sqlStatements.push('ON CONFLICT (date, hour) DO UPDATE SET')
    sqlStatements.push('  price = EXCLUDED.price,')
    sqlStatements.push('  price_change_percent = EXCLUDED.price_change_percent,')
    sqlStatements.push('  timestamp = EXCLUDED.timestamp;')
    sqlStatements.push('')
  }

  return sqlStatements.join('\n')
}

async function fetchNovemberDecember2025() {
  try {
    console.log('📡 Obteniendo datos históricos de junio 2025...\n')

    const year = 2025
    const juneData = new Map<string, KlineData[]>()

    // Procesar junio (días 1-30)
    console.log('📅 Procesando JUNIO 2025...')
    console.log('='.repeat(60))
    
    for (let day = 1; day <= 30; day++) {
      const dateString = `${year}-06-${String(day).padStart(2, '0')}`
      console.log(`\n📆 Día ${day}/06/2025 (${dateString})`)
      
      try {
        const dayData = await fetchDayData(year, 6, day)
        
        if (dayData.length > 0) {
          console.log(`   ✅ Obtenidas ${dayData.length} horas`)
          
          // Agrupar por fecha
          dayData.forEach(item => {
            if (!juneData.has(item.date)) {
              juneData.set(item.date, [])
            }
            juneData.get(item.date)!.push(item)
          })
        } else {
          console.log(`   ⚠️  No hay datos disponibles`)
        }
        
        // Pausa para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`   ❌ Error: ${error}`)
      }
    }

    // Generar archivos SQL
    console.log('\n\n💾 Generando archivos SQL...')
    console.log('='.repeat(60))

    // Asegurar que existe el directorio supabase
    const supabaseDir = resolve(process.cwd(), 'supabase')
    try {
      mkdirSync(supabaseDir, { recursive: true })
    } catch (error) {
      // El directorio ya existe, no hay problema
    }

    // Generar SQL para junio
    if (juneData.size > 0) {
      const juneSQL = generateSQLForMonth(juneData, 'Junio')
      const juneFile = resolve(supabaseDir, 'insert_june_2025.sql')
      writeFileSync(juneFile, juneSQL, 'utf-8')
      console.log(`\n✅ Archivo SQL de junio generado: ${juneFile}`)
      console.log(`   - Fechas: ${juneData.size}`)
      const totalHours = Array.from(juneData.values()).reduce((sum, arr) => sum + arr.length, 0)
      console.log(`   - Total horas: ${totalHours}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✨ Proceso completado')
    console.log('='.repeat(60))
    console.log('\n💡 Para ejecutar los SQL:')
    console.log('   1. Ve a Supabase SQL Editor')
    console.log('   2. Copia y pega el contenido de los archivos generados')
    console.log('   3. Ejecuta el script\n')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fetchNovemberDecember2025()
