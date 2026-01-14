/**
 * Script para combinar todos los archivos SQL generados en uno solo
 * Uso: npx tsx scripts/combineAllSQLFiles.ts
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function combineAllSQLFiles() {
  try {
    const generatedDir = resolve(__dirname, '..', 'supabase', 'generated')
    const files = readdirSync(generatedDir)
      .filter(file => file.startsWith('insert_2026_01_') && file.endsWith('.sql'))
      .sort() // Ordenar por fecha

    console.log(`📁 Encontrados ${files.length} archivos SQL\n`)

    const allValues: string[] = []
    let totalHours = 0

    // Leer cada archivo y extraer los valores
    for (const file of files) {
      const filePath = resolve(generatedDir, file)
      const content = readFileSync(filePath, 'utf-8')
      
      // Extraer las líneas que contienen los valores (formato: ('date', hour, price, change, timestamp))
      const lines = content.split('\n')
      let inValues = false
      
      for (const line of lines) {
        const trimmed = line.trim()
        
        if (trimmed.startsWith('INSERT INTO')) {
          inValues = true
          continue
        }
        
        if (trimmed.startsWith('ON CONFLICT')) {
          inValues = false
          break
        }
        
        if (inValues && trimmed.match(/^\('2026-01-\d{2}', \d+, \d+\.\d+, -?\d+\.\d+, \d+\)/)) {
          allValues.push(trimmed.replace(/,$/, '')) // Remover coma final si existe
          totalHours++
        }
      }
      
      console.log(`✅ ${file}: ${content.split('\n').filter(l => l.trim().match(/^\('2026-01-\d{2}', \d+, \d+\.\d+, -?\d+\.\d+, \d+\)/)).length} horas`)
    }

    // Generar SQL consolidado
    const sqlContent = `-- SQL consolidado para insertar todos los datos del 01 al 14 de enero de 2026
-- Generado automáticamente combinando todos los archivos SQL generados
-- Total de horas: ${totalHours}
-- Fechas: 2026-01-01 a 2026-01-14

-- Eliminar datos existentes de estas fechas (opcional, descomenta si quieres reemplazar)
-- DELETE FROM btc_hourly_data WHERE date >= '2026-01-01' AND date <= '2026-01-14';

-- Insertar todos los datos
INSERT INTO btc_hourly_data (date, hour, price, price_change_percent, timestamp) VALUES
${allValues.join(',\n')}
ON CONFLICT (date, hour) DO UPDATE SET
  price = EXCLUDED.price,
  price_change_percent = EXCLUDED.price_change_percent,
  timestamp = EXCLUDED.timestamp;
`

    const outputFile = resolve(__dirname, '..', 'supabase', 'insert_all_days_january_2026.sql')
    writeFileSync(outputFile, sqlContent, 'utf-8')

    console.log('\n' + '='.repeat(60))
    console.log('✨ SQL consolidado generado exitosamente')
    console.log(`📊 Total de horas: ${totalHours}`)
    console.log(`📁 Archivo: supabase/insert_all_days_january_2026.sql`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

combineAllSQLFiles()
