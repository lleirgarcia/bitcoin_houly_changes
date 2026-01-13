/**
 * Script para crear la tabla en Supabase automáticamente
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '..', '.env') })

const SQL = `
-- Tabla para almacenar los datos horarios de BTC
CREATE TABLE IF NOT EXISTS btc_hourly_data (
  id BIGSERIAL PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  hour INTEGER NOT NULL,
  price NUMERIC(20, 2) NOT NULL,
  price_change_percent NUMERIC(10, 4) NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(timestamp, hour)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_btc_hourly_timestamp ON btc_hourly_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_btc_hourly_hour ON btc_hourly_data(hour);
CREATE INDEX IF NOT EXISTS idx_btc_hourly_date ON btc_hourly_data(date DESC);

-- Habilitar RLS
ALTER TABLE btc_hourly_data ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública
CREATE POLICY IF NOT EXISTS "Allow public read access" ON btc_hourly_data
  FOR SELECT
  USING (true);
`

async function createTable() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Faltan credenciales de Supabase en .env')
      return
    }

    console.log('🔄 Creando tabla en Supabase...')
    console.log('   URL:', supabaseUrl)

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Intentar ejecutar el SQL usando rpc (si está disponible)
    // Nota: Esto puede no funcionar porque crear tablas requiere permisos de administrador
    // La forma correcta es ejecutarlo manualmente en el SQL Editor
    
    // Alternativa: Intentar usar la API REST de Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ sql: SQL })
    })

    if (response.ok) {
      console.log('✅ Tabla creada exitosamente')
    } else {
      console.log('⚠️  No se pudo crear la tabla automáticamente')
      console.log('   Esto es normal - crear tablas requiere permisos de administrador')
      console.log('')
      console.log('📋 Por favor, ejecuta este SQL manualmente en Supabase:')
      console.log('   1. Ve a: https://supabase.com/dashboard/project/gfqzaccvmsybuesbxvdy/sql/new')
      console.log('   2. Copia y pega el SQL de: supabase/schema.sql')
      console.log('   3. Ejecuta el script')
    }

    // Verificar si la tabla existe
    const { data, error } = await supabase
      .from('btc_hourly_data')
      .select('id')
      .limit(1)

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('')
        console.log('❌ La tabla aún no existe')
        console.log('💡 Necesitas ejecutar el SQL manualmente en Supabase SQL Editor')
      } else {
        console.log('✅ La tabla existe!', error.message)
      }
    } else {
      console.log('✅ La tabla existe y está accesible')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    console.log('')
    console.log('💡 Por favor, ejecuta el SQL manualmente:')
    console.log('   1. Ve a: https://supabase.com/dashboard/project/gfqzaccvmsybuesbxvdy/sql/new')
    console.log('   2. Copia el contenido de: supabase/schema.sql')
    console.log('   3. Pega y ejecuta')
  }
}

createTable()
