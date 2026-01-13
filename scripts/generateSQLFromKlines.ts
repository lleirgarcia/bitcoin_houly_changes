/**
 * Script para generar SQL INSERT a partir de los datos de klines de Binance
 * Uso: npx tsx scripts/generateSQLFromKlines.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

async function generateSQL() {
  try {
    console.log('📡 Obteniendo datos de Binance...\n')
    
    // Ejecutar curl y guardar en archivo temporal
    execSync('curl -s "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24" > /tmp/binance_klines.json')
    
    // Leer el archivo JSON
    const jsonData = readFileSync('/tmp/binance_klines.json', 'utf-8')
    const klines: any[][] = JSON.parse(jsonData)
    
    console.log(`✅ Obtenidas ${klines.length} velas de 1 hora\n`)

    // Generar SQL INSERT statements
    const sqlStatements: string[] = []
    
    sqlStatements.push('-- SQL para insertar datos históricos (últimas 24 horas de Binance)')
    sqlStatements.push('-- Generado automáticamente desde datos de Binance klines')
    sqlStatements.push('-- Los datos se asignan a la fecha real según su timestamp')
    sqlStatements.push('')

    // Obtener todas las fechas únicas para el DELETE
    const datesSet = new Set<string>()
    const values: string[] = []

    // Procesar cada vela (de más antigua a más reciente)
    // Las klines vienen ordenadas por tiempo ascendente
    klines.forEach((kline) => {
      const closeTime = kline[6] as number // Timestamp de cierre en milisegundos
      const openPrice = parseFloat(kline[1] as string)
      const closePrice = parseFloat(kline[4] as string)
      
      // Calcular el cambio porcentual desde apertura a cierre
      const priceChangePercent = ((closePrice - openPrice) / openPrice) * 100

      // Usar el timestamp real para obtener la fecha y hora correctas en UTC
      const date = new Date(closeTime)
      // Construir la fecha en UTC correctamente
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}` // YYYY-MM-DD
      const hour = date.getUTCHours() // Hora en UTC

      datesSet.add(dateString)

      const value = `('${dateString}', ${hour}, ${closePrice.toFixed(2)}, ${priceChangePercent.toFixed(4)}, ${closeTime})`
      values.push(value)
    })

    // Agregar DELETE statements para cada fecha encontrada
    const dates = Array.from(datesSet).sort()
    sqlStatements.push('-- Eliminar datos existentes de las fechas que se van a insertar')
    dates.forEach(date => {
      sqlStatements.push(`DELETE FROM btc_hourly_data WHERE date = '${date}';`)
    })
    sqlStatements.push('')
    sqlStatements.push('-- Insertar nuevos datos')
    sqlStatements.push('INSERT INTO btc_hourly_data (date, hour, price, price_change_percent, timestamp) VALUES')

    // Unir todos los valores con comas
    sqlStatements.push(values.join(',\n'))
    sqlStatements.push('ON CONFLICT (date, hour) DO UPDATE SET')
    sqlStatements.push('  price = EXCLUDED.price,')
    sqlStatements.push('  price_change_percent = EXCLUDED.price_change_percent,')
    sqlStatements.push('  timestamp = EXCLUDED.timestamp;')
    sqlStatements.push('')

    const sql = sqlStatements.join('\n')

    // Guardar en archivo
    const outputFile = 'supabase/insert_yesterday_data.sql'
    writeFileSync(outputFile, sql, 'utf-8')

    console.log('✅ SQL generado exitosamente\n')
    console.log('📄 Archivo guardado en:', outputFile)
    console.log('\n📊 Resumen:')
    console.log(`   - Fechas: ${dates.join(', ')}`)
    console.log(`   - Total de horas: ${klines.length}`)
    console.log(`   - Precio mínimo: $${Math.min(...klines.map(k => parseFloat(k[4]))).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    console.log(`   - Precio máximo: $${Math.max(...klines.map(k => parseFloat(k[4]))).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    console.log('\n💡 Para ejecutar el SQL:')
    console.log('   1. Ve a Supabase SQL Editor')
    console.log(`   2. Copia y pega el contenido de ${outputFile}`)
    console.log('   3. Ejecuta el script\n')

    // Mostrar una preview del SQL
    console.log('📋 Preview del SQL (primeras líneas):')
    console.log('='.repeat(60))
    const preview = sql.split('\n').slice(0, 15).join('\n')
    console.log(preview)
    console.log('   ...')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

generateSQL()
