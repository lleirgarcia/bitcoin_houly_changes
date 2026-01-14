/**
 * Script para extraer datos del día 14 desde localStorage del navegador
 * 
 * INSTRUCCIONES:
 * 1. Abre la aplicación en el navegador (http://localhost:3000)
 * 2. Abre las DevTools (F12)
 * 3. Ve a la pestaña "Console"
 * 4. Copia y pega TODO este código
 * 5. Presiona Enter
 * 6. Copia el SQL generado y úsalo en Supabase
 */

(function() {
  try {
    const STORAGE_KEY = 'btc_hourly_data'
    const stored = localStorage.getItem(STORAGE_KEY)
    
    if (!stored || stored === '[]' || stored === 'null') {
      console.log('❌ No hay datos en localStorage')
      return
    }
    
    const data = JSON.parse(stored)
    console.log(`📊 Total de registros en localStorage: ${data.length}`)
    
    // Filtrar datos del día 14 (UTC)
    const day14 = data.filter(item => {
      const date = new Date(item.timestamp)
      return date.getUTCFullYear() === 2026 && 
             date.getUTCMonth() === 0 && 
             date.getUTCDate() === 14
    }).sort((a, b) => {
      const dateA = new Date(a.timestamp)
      const dateB = new Date(b.timestamp)
      return dateA.getUTCHours() - dateB.getUTCHours()
    })
    
    console.log(`\n📅 Datos del día 14 encontrados: ${day14.length} horas\n`)
    
    if (day14.length === 0) {
      console.log('⚠️ No hay datos del día 14 en localStorage')
      console.log('\n💡 Verifica que:')
      console.log('   1. El cron job se haya ejecutado')
      console.log('   2. Los datos se hayan guardado correctamente')
      return
    }
    
    // Mostrar los datos encontrados
    day14.forEach(item => {
      const d = new Date(item.timestamp)
      const hour = d.getUTCHours()
      console.log(`   Hora ${hour.toString().padStart(2, '0')}:00 - Precio: $${item.price.toFixed(2)}, Cambio: ${item.priceChangePercent.toFixed(2)}%`)
    })
    
    // Generar SQL
    console.log('\n' + '='.repeat(80))
    console.log('SQL GENERADO PARA EL DÍA 14:')
    console.log('='.repeat(80))
    console.log('\n-- Insertar datos del día 14 desde localStorage')
    console.log('INSERT INTO btc_hourly_data (date, hour, price, price_change_percent, timestamp) VALUES')
    
    const values = day14.map(item => {
      const d = new Date(item.timestamp)
      const hour = d.getUTCHours()
      return `('2026-01-14', ${hour}, ${item.price.toFixed(2)}, ${item.priceChangePercent.toFixed(4)}, ${item.timestamp})`
    })
    
    console.log(values.join(',\n'))
    console.log('ON CONFLICT (date, hour) DO UPDATE SET')
    console.log('  price = EXCLUDED.price,')
    console.log('  price_change_percent = EXCLUDED.price_change_percent,')
    console.log('  timestamp = EXCLUDED.timestamp;')
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ Copia el SQL de arriba y ejecútalo en Supabase SQL Editor')
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
})()
