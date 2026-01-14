/**
 * Script para ejecutar el cron job para todos los días desde hoy hasta el 01 de enero
 * Genera archivos SQL para cada día
 * Uso: npx tsx scripts/runCronForAllDays.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '..', '.env') })

async function runCronForAllDays() {
  try {
    // Verificar variables de entorno
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Error: Faltan variables de entorno')
      process.exit(1)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Obtener fecha actual y fecha objetivo (01 de enero de 2026)
    const now = new Date()
    const currentDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const targetDate = new Date(Date.UTC(2026, 0, 1)) // 01 de enero de 2026

    console.log('📅 Ejecutando cron job para todos los días desde:')
    console.log(`   ${currentDate.toISOString().split('T')[0]} hasta ${targetDate.toISOString().split('T')[0]}`)
    console.log('')

    // Crear directorio para los archivos SQL si no existe
    const sqlDir = resolve(__dirname, '..', 'supabase', 'generated')
    try {
      mkdirSync(sqlDir, { recursive: true })
    } catch (error) {
      // El directorio ya existe, no hay problema
    }

    // Iterar sobre cada día desde hoy hasta el 01 de enero
    const current = new Date(currentDate)
    let dayCount = 0

    while (current >= targetDate) {
      const year = current.getUTCFullYear()
      const month = String(current.getUTCMonth() + 1).padStart(2, '0')
      const day = String(current.getUTCDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`

      console.log(`\n${'='.repeat(60)}`)
      console.log(`📅 Procesando día: ${dateString} (${dayCount + 1})`)
      console.log('='.repeat(60))

      try {
        // Calcular timestamps para el día específico
        const startOfDay = new Date(Date.UTC(year, current.getUTCMonth(), day, 0, 0, 0, 0))
        const endOfDay = new Date(Date.UTC(year, current.getUTCMonth(), day, 23, 59, 59, 999))
        const startTime = startOfDay.getTime()
        const endTime = endOfDay.getTime()

        // Obtener datos de Binance
        const klinesUrl = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=${startTime}&endTime=${endTime}&limit=24`
        
        const res = await fetch(klinesUrl)
        if (!res.ok) {
          console.log(`⚠️  Error al obtener datos para ${dateString}: ${res.statusText}`)
          // Continuar con el siguiente día
          current.setUTCDate(current.getUTCDate() - 1)
          dayCount++
          continue
        }

        const klines: any[][] = await res.json()

        if (klines.length === 0) {
          console.log(`⚠️  No hay datos disponibles para ${dateString}`)
          // Continuar con el siguiente día
          current.setUTCDate(current.getUTCDate() - 1)
          dayCount++
          continue
        }

        console.log(`✅ Obtenidas ${klines.length} velas de 1 hora`)

        // Procesar cada vela y generar SQL
        const sqlValues: string[] = []
        let successCount = 0
        let errorCount = 0

        for (const kline of klines) {
          const closeTime = kline[6] as number
          const openPrice = parseFloat(kline[1] as string)
          const closePrice = parseFloat(kline[4] as string)
          const priceChangePercent = ((closePrice - openPrice) / openPrice) * 100

          const date = new Date(closeTime)
          const klineYear = date.getUTCFullYear()
          const klineMonth = String(date.getUTCMonth() + 1).padStart(2, '0')
          const klineDay = String(date.getUTCDate()).padStart(2, '0')
          const klineDateString = `${klineYear}-${klineMonth}-${klineDay}`
          const hour = date.getUTCHours()

          // Solo procesar si es del día objetivo
          if (klineDateString === dateString) {
            const hourlyData = {
              date: klineDateString,
              hour,
              price: closePrice,
              price_change_percent: priceChangePercent,
              timestamp: closeTime
            }

            // Intentar guardar en Supabase
            const { error: supabaseError } = await supabase
              .from('btc_hourly_data')
              .upsert(hourlyData, {
                onConflict: 'date,hour',
                ignoreDuplicates: false
              })

            if (supabaseError) {
              console.error(`   ❌ Hora ${hour}:00 - Error: ${supabaseError.message}`)
              errorCount++
            } else {
              console.log(`   ✅ Hora ${hour.toString().padStart(2, '0')}:00 - Precio: $${closePrice.toFixed(2)}`)
              successCount++
            }

            // Agregar al SQL
            sqlValues.push(`('${klineDateString}', ${hour}, ${closePrice.toFixed(2)}, ${priceChangePercent.toFixed(4)}, ${closeTime})`)
          }
        }

        // Generar archivo SQL para este día
        if (sqlValues.length > 0) {
          const sqlContent = `-- SQL para insertar datos del ${dateString}
-- Generado automáticamente por runCronForAllDays.ts
-- Total de horas: ${sqlValues.length}

INSERT INTO btc_hourly_data (date, hour, price, price_change_percent, timestamp) VALUES
${sqlValues.join(',\n')}
ON CONFLICT (date, hour) DO UPDATE SET
  price = EXCLUDED.price,
  price_change_percent = EXCLUDED.price_change_percent,
  timestamp = EXCLUDED.timestamp;
`

          const sqlFileName = `insert_${dateString.replace(/-/g, '_')}.sql`
          const sqlFilePath = resolve(sqlDir, sqlFileName)
          writeFileSync(sqlFilePath, sqlContent, 'utf-8')
          console.log(`\n💾 Archivo SQL generado: supabase/generated/${sqlFileName}`)
        }

        console.log(`\n📊 Resumen para ${dateString}:`)
        console.log(`   ✅ Guardadas: ${successCount} horas`)
        console.log(`   ❌ Errores: ${errorCount} horas`)

        // Pequeña pausa para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ Error procesando ${dateString}:`, error)
      }

      // Ir al día anterior
      current.setUTCDate(current.getUTCDate() - 1)
      dayCount++
    }

    console.log('\n' + '='.repeat(60))
    console.log('✨ Proceso completado')
    console.log(`📊 Total de días procesados: ${dayCount}`)
    console.log(`📁 Archivos SQL generados en: supabase/generated/`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

runCronForAllDays()
