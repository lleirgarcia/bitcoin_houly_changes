/**
 * Script para ejecutar el cron job para un día específico
 * Uso: npx tsx scripts/runCronForDate.ts 2026-01-14
 * O: npx tsx scripts/runCronForDate.ts 14 (para el día 14 del mes actual)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '..', '.env') })

// Obtener fecha desde argumentos de línea de comandos
const args = process.argv.slice(2)
let targetDate: Date

if (args.length === 0) {
  console.error('❌ Error: Debes especificar una fecha')
  console.log('\nUso:')
  console.log('  npx tsx scripts/runCronForDate.ts 2026-01-14')
  console.log('  npx tsx scripts/runCronForDate.ts 14 (día 14 del mes actual)')
  process.exit(1)
}

const dateArg = args[0]

// Parsear la fecha
if (dateArg.includes('-')) {
  // Formato: YYYY-MM-DD
  const [year, month, day] = dateArg.split('-').map(Number)
  targetDate = new Date(Date.UTC(year, month - 1, day))
} else {
  // Solo el día, usar mes y año actual
  const now = new Date()
  const day = parseInt(dateArg)
  targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day))
}

// Validar fecha
if (isNaN(targetDate.getTime())) {
  console.error('❌ Error: Fecha inválida')
  process.exit(1)
}

const year = targetDate.getUTCFullYear()
const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0')
const day = String(targetDate.getUTCDate()).padStart(2, '0')
const dateString = `${year}-${month}-${day}`

console.log('📅 Ejecutando cron job para la fecha:', dateString)
console.log('')

async function runCronForDate() {
  try {
    // Verificar variables de entorno
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

    // Calcular timestamps para el día específico (inicio y fin del día en UTC)
    const startOfDay = new Date(Date.UTC(year, targetDate.getUTCMonth(), day, 0, 0, 0, 0))
    const endOfDay = new Date(Date.UTC(year, targetDate.getUTCMonth(), day, 23, 59, 59, 999))
    const startTime = startOfDay.getTime()
    const endTime = endOfDay.getTime()

    console.log('📡 Obteniendo datos de Binance para el día:', dateString)
    console.log('   Desde:', startOfDay.toUTCString())
    console.log('   Hasta:', endOfDay.toUTCString())
    console.log('')

    // Obtener datos de klines para el día específico
    // Binance klines API: necesitamos obtener las 24 horas del día
    // Usamos startTime y endTime para obtener solo ese día
    const klinesUrl = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=${startTime}&endTime=${endTime}&limit=24`
    
    console.log('🔗 URL:', klinesUrl)
    console.log('')

    const res = await fetch(klinesUrl)
    if (!res.ok) {
      throw new Error(`Error al obtener datos de Binance: ${res.statusText}`)
    }

    const klines: any[][] = await res.json()
    console.log(`✅ Obtenidas ${klines.length} velas de 1 hora\n`)

    if (klines.length === 0) {
      console.log('⚠️ No se encontraron datos para esta fecha')
      console.log('   Esto puede ser porque:')
      console.log('   - La fecha es futura')
      console.log('   - La fecha es muy antigua (Binance tiene límites)')
      console.log('   - No hay datos disponibles para ese día')
      return
    }

    let successCount = 0
    let errorCount = 0

    // Procesar cada vela (cada hora)
    for (const kline of klines) {
      const closeTime = kline[6] as number // Timestamp de cierre en milisegundos
      const openPrice = parseFloat(kline[1] as string)
      const closePrice = parseFloat(kline[4] as string)

      // Calcular el cambio porcentual desde apertura a cierre
      const priceChangePercent = ((closePrice - openPrice) / openPrice) * 100

      // Usar el timestamp real para obtener la fecha y hora correctas en UTC
      const date = new Date(closeTime)
      const klineYear = date.getUTCFullYear()
      const klineMonth = String(date.getUTCMonth() + 1).padStart(2, '0')
      const klineDay = String(date.getUTCDate()).padStart(2, '0')
      const klineDateString = `${klineYear}-${klineMonth}-${klineDay}`
      const hour = date.getUTCHours() // Hora en UTC

      // Solo guardar si es del día objetivo
      if (klineDateString === dateString) {
        const hourlyData = {
          date: klineDateString,
          hour,
          price: closePrice,
          price_change_percent: priceChangePercent,
          timestamp: closeTime
        }

        const { error: supabaseError } = await supabase
          .from('btc_hourly_data')
          .upsert(hourlyData, {
            onConflict: 'date,hour',
            ignoreDuplicates: false
          })

        if (supabaseError) {
          console.error(`❌ Error guardando hora ${hour}:00 -`, supabaseError.message)
          errorCount++
        } else {
          console.log(`✅ Hora ${hour.toString().padStart(2, '0')}:00 guardada - Precio: $${closePrice.toFixed(2)} (${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%)`)
          successCount++
        }
      } else {
        console.log(`⏭️  Hora ${hour}:00 omitida - pertenece a ${klineDateString} (no a ${dateString})`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Resumen:')
    console.log(`   ✅ Guardadas: ${successCount} horas`)
    console.log(`   ❌ Errores: ${errorCount} horas`)
    console.log(`   📅 Fecha: ${dateString}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

runCronForDate()
