/**
 * Script para eliminar todos los registros de btc_hourly_data
 * Uso: npx tsx scripts/deleteAllData.ts
 * 
 * ⚠️ ADVERTENCIA: Esto eliminará TODOS los datos de la tabla
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import * as readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar .env desde la raíz del proyecto
dotenv.config({ path: resolve(__dirname, '..', '.env') })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve))
}

async function deleteAllData() {
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

    // Primero, contar cuántos registros hay
    console.log('📊 Contando registros...')
    const { count, error: countError } = await supabase
      .from('btc_hourly_data')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Error al contar registros:', countError.message)
      process.exit(1)
    }

    if (count === 0) {
      console.log('ℹ️  La tabla ya está vacía')
      rl.close()
      return
    }

    console.log(`⚠️  ADVERTENCIA: Se eliminarán ${count} registros de la tabla btc_hourly_data`)
    console.log('   Esta acción NO se puede deshacer.\n')

    const answer = await question('¿Estás seguro? Escribe "SI" para confirmar: ')

    if (answer !== 'SI') {
      console.log('❌ Operación cancelada')
      rl.close()
      return
    }

    console.log('\n🗑️  Eliminando registros...')

    // Eliminar todos los registros
    const { error: deleteError } = await supabase
      .from('btc_hourly_data')
      .delete()
      .neq('id', 0) // Esto elimina todos los registros (todos los IDs son != 0)

    if (deleteError) {
      console.error('❌ Error al eliminar:', deleteError.message)
      rl.close()
      process.exit(1)
    }

    // Verificar que se eliminaron
    const { count: newCount } = await supabase
      .from('btc_hourly_data')
      .select('*', { count: 'exact', head: true })

    console.log('✅ Registros eliminados exitosamente')
    console.log(`   Registros restantes: ${newCount}`)
    console.log('\n💡 La tabla está lista para recibir nuevos datos del cron job')

    rl.close()
  } catch (error) {
    console.error('❌ Error:', error)
    rl.close()
    process.exit(1)
  }
}

deleteAllData()
