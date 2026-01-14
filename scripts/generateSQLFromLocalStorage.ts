/**
 * Script para generar SQL desde local-storage-data.json
 * Uso: npx tsx scripts/generateSQLFromLocalStorage.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function generateSQL() {
  try {
    // Leer el archivo JSON
    const filePath = resolve(__dirname, '..', 'local-storage-data.json')
    const jsonData = readFileSync(filePath, 'utf-8')
    const data: Array<{
      timestamp: number
      hour: number
      priceChangePercent: number
      price: number
      date: string
    }> = JSON.parse(jsonData)

    console.log(`📊 Total de registros en el archivo: ${data.length}\n`)

    // Filtrar datos del día 14
    const day14Data = data.filter(item => {
      const date = new Date(item.date)
      return date.getFullYear() === 2026 && date.getMonth() === 0 && date.getDate() === 14
    })

    console.log(`📅 Datos del día 14: ${day14Data.length} registros\n`)

    if (day14Data.length === 0) {
      console.log('⚠️ No hay datos del día 14 en el archivo')
      return
    }

    // Generar SQL
    const sqlStatements: string[] = []
    sqlStatements.push('-- SQL para insertar todos los datos del día 14 desde local-storage-data.json')
    sqlStatements.push('-- Generado automáticamente')
    sqlStatements.push('')
    sqlStatements.push('-- Eliminar datos existentes del día 14 si los hay')
    sqlStatements.push("DELETE FROM btc_hourly_data WHERE date = '2026-01-14';")
    sqlStatements.push('')
    sqlStatements.push('-- Insertar nuevos datos')
    sqlStatements.push('INSERT INTO btc_hourly_data (date, hour, price, price_change_percent, timestamp) VALUES')

    const values: string[] = []

    day14Data.forEach((item, index) => {
      // Extraer la fecha correcta del timestamp o del campo date
      const date = new Date(item.timestamp)
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`
      const hour = date.getUTCHours()

      const value = `('${dateString}', ${hour}, ${item.price.toFixed(2)}, ${item.priceChangePercent.toFixed(4)}, ${item.timestamp})`
      values.push(value)

      console.log(`   Hora ${hour.toString().padStart(2, '0')}:00 - Precio: $${item.price.toFixed(2)}, Cambio: ${item.priceChangePercent.toFixed(2)}%`)
    })

    sqlStatements.push(values.join(',\n'))
    sqlStatements.push('ON CONFLICT (date, hour) DO UPDATE SET')
    sqlStatements.push('  price = EXCLUDED.price,')
    sqlStatements.push('  price_change_percent = EXCLUDED.price_change_percent,')
    sqlStatements.push('  timestamp = EXCLUDED.timestamp;')
    sqlStatements.push('')

    const sql = sqlStatements.join('\n')

    // Guardar en archivo
    const outputFile = 'supabase/insert_day14_all.sql'
    writeFileSync(outputFile, sql, 'utf-8')

    console.log(`\n✅ SQL generado exitosamente`)
    console.log(`📄 Archivo guardado en: ${outputFile}`)
    console.log(`\n💡 Ejecuta este SQL en Supabase SQL Editor`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

generateSQL()
