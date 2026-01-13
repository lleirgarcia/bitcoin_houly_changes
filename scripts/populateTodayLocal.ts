/**
 * Script para poblar todas las horas del día actual en localStorage
 * Uso: npx tsx scripts/populateTodayLocal.ts
 * 
 * Este script obtiene los datos actuales de Binance y los guarda
 * en localStorage para cada hora del día (desde 00:00 hasta la hora actual)
 */

import dotenv from 'dotenv'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

dotenv.config()

const API_URL = 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'

// Simular localStorage usando un archivo JSON
const STORAGE_FILE = join(process.cwd(), 'local-storage-data.json')

function getStoredData(): any[] {
  try {
    const data = readFileSync(STORAGE_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function saveStoredData(data: any[]): void {
  writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

async function populateTodayLocal() {
  try {
    console.log('🔄 Poblando datos para todas las horas de hoy (localStorage)...\n')
    
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

    // Obtener fecha actual
    const now = new Date()
    const currentHour = now.getHours()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    console.log(`📅 Fecha: ${today.toLocaleDateString()}`)
    console.log(`⏰ Hora actual: ${currentHour}:00`)
    console.log(`📊 Procesando horas desde 00:00 hasta ${currentHour}:00\n`)

    const stored = getStoredData()
    let addedCount = 0

    // Procesar cada hora desde 00:00 hasta la hora actual
    for (let hour = 0; hour <= currentHour; hour++) {
      // Crear timestamp para esta hora del día
      const hourDate = new Date(today)
      hourDate.setHours(hour, 0, 0, 0)
      const timestamp = hourDate.getTime()
      
      // Verificar si ya existe un dato para esta hora
      const exists = stored.some(item => item.timestamp === timestamp && item.hour === hour)
      
      if (exists) {
        console.log(`⏭️  Hora ${hour.toString().padStart(2, '0')}:00 - Ya existe, omitiendo`)
        continue
      }
      
      // Simular un precio ligeramente diferente para cada hora (variación pequeña)
      const variation = (Math.random() - 0.5) * 0.02 // ±1% de variación
      const hourPrice = currentPrice * (1 + variation)
      const hourChange = currentChange + (Math.random() - 0.5) * 0.5
      
      const hourlyData = {
        timestamp,
        hour,
        priceChangePercent: Math.round(hourChange * 100) / 100,
        price: Math.round(hourPrice * 100) / 100,
        date: hourDate.toISOString()
      }

      stored.push(hourlyData)
      console.log(`✅ Hora ${hour.toString().padStart(2, '0')}:00 - Precio: $${hourlyData.price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      addedCount++
    }

    // Mantener solo los últimos 48 registros
    const recent = stored.slice(-48)
    saveStoredData(recent)

    console.log('\n' + '='.repeat(50))
    console.log(`✨ Proceso completado:`)
    console.log(`   ✅ Nuevos registros: ${addedCount}`)
    console.log(`   📊 Total en almacenamiento: ${recent.length}`)
    console.log(`   💾 Guardado en: ${STORAGE_FILE}`)
    console.log('='.repeat(50))
    console.log('\n💡 Para usar estos datos en la app:')
    console.log('   1. Abre las DevTools del navegador (F12)')
    console.log('   2. Ve a la pestaña "Application" (o "Almacenamiento")')
    console.log('   3. Local Storage → http://localhost:3000')
    console.log('   4. Busca la clave "btc_hourly_data"')
    console.log('   5. Copia el contenido del archivo local-storage-data.json')
    console.log('   6. Pega el contenido en el valor de "btc_hourly_data"')
    console.log('   7. Recarga la página\n')
    
  } catch (error) {
    console.error('❌ Error en el script:', error)
    process.exit(1)
  }
}

populateTodayLocal()
