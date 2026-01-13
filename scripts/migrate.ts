/**
 * Script para ejecutar la migración de la base de datos
 * Uso: npx tsx scripts/migrate.ts
 * 
 * Este script ejecuta la migración SQL para actualizar la estructura
 * de la tabla btc_hourly_data al nuevo formato (date + hour)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar .env desde la raíz del proyecto
dotenv.config({ path: resolve(__dirname, '..', '.env') })

const MIGRATION_SQL = `
-- Script de migración para actualizar la estructura de btc_hourly_data
-- Este script convierte la tabla existente al nuevo formato: date + hour

-- Paso 1: Crear una nueva columna 'date' como DATE (si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'btc_hourly_data' AND column_name = 'date' AND data_type = 'date'
  ) THEN
    -- Si la columna date existe pero es TIMESTAMPTZ, necesitamos convertirla
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'btc_hourly_data' AND column_name = 'date' AND data_type = 'timestamp with time zone'
    ) THEN
      -- Convertir la columna date de TIMESTAMPTZ a DATE
      ALTER TABLE btc_hourly_data 
      ALTER COLUMN date TYPE DATE USING date::DATE;
    ELSE
      -- Agregar nueva columna date
      ALTER TABLE btc_hourly_data ADD COLUMN date DATE;
      
      -- Rellenar la columna date basándose en el timestamp existente
      UPDATE btc_hourly_data 
      SET date = DATE(timestamp::bigint / 1000)::DATE
      WHERE date IS NULL;
      
      -- Hacer la columna NOT NULL
      ALTER TABLE btc_hourly_data ALTER COLUMN date SET NOT NULL;
    END IF;
  END IF;
END $$;

-- Paso 2: Eliminar el constraint único antiguo si existe
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'btc_hourly_data_timestamp_hour_key'
  ) THEN
    ALTER TABLE btc_hourly_data DROP CONSTRAINT btc_hourly_data_timestamp_hour_key;
  END IF;
END $$;

-- Paso 3: Agregar el nuevo constraint único (date, hour)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'btc_hourly_data_date_hour_key'
  ) THEN
    ALTER TABLE btc_hourly_data 
    ADD CONSTRAINT btc_hourly_data_date_hour_key UNIQUE (date, hour);
  END IF;
END $$;

-- Paso 4: Agregar constraint CHECK para hour si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'btc_hourly_data_hour_check'
  ) THEN
    ALTER TABLE btc_hourly_data 
    ADD CONSTRAINT btc_hourly_data_hour_check CHECK (hour >= 0 AND hour <= 23);
  END IF;
END $$;

-- Paso 5: Actualizar índices
DROP INDEX IF EXISTS idx_btc_hourly_date;
CREATE INDEX IF NOT EXISTS idx_btc_hourly_date ON btc_hourly_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_btc_hourly_date_hour ON btc_hourly_data(date DESC, hour);
`

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración de base de datos...\n')
    
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Error: Faltan variables de entorno')
      console.log('   Necesitas configurar:')
      console.log('   - SUPABASE_URL')
      console.log('   - SUPABASE_SERVICE_ROLE_KEY')
      console.log('\n   Estos valores están en tu archivo .env')
      process.exit(1)
    }

    console.log('✅ Variables de entorno configuradas')
    console.log('   URL:', supabaseUrl.substring(0, 30) + '...')
    console.log('   Service Role Key:', supabaseServiceKey.substring(0, 20) + '...\n')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Ejecutar la migración SQL
    console.log('📝 Ejecutando script de migración SQL...')
    
    // Dividir el SQL en statements individuales (PostgreSQL no permite ejecutar múltiples DO blocks en una sola query)
    // Vamos a ejecutar cada paso por separado
    
    const steps = [
      {
        name: 'Paso 1: Convertir/crear columna date',
        sql: `
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'btc_hourly_data' AND column_name = 'date' AND data_type = 'date'
            ) THEN
              IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'btc_hourly_data' AND column_name = 'date' AND data_type = 'timestamp with time zone'
              ) THEN
                ALTER TABLE btc_hourly_data 
                ALTER COLUMN date TYPE DATE USING date::DATE;
              ELSE
                ALTER TABLE btc_hourly_data ADD COLUMN date DATE;
                UPDATE btc_hourly_data 
                SET date = DATE(timestamp::bigint / 1000)::DATE
                WHERE date IS NULL;
                ALTER TABLE btc_hourly_data ALTER COLUMN date SET NOT NULL;
              END IF;
            END IF;
          END $$;
        `
      },
      {
        name: 'Paso 2: Eliminar constraint antiguo',
        sql: `
          DO $$ 
          BEGIN
            IF EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'btc_hourly_data_timestamp_hour_key'
            ) THEN
              ALTER TABLE btc_hourly_data DROP CONSTRAINT btc_hourly_data_timestamp_hour_key;
            END IF;
          END $$;
        `
      },
      {
        name: 'Paso 3: Crear nuevo constraint único',
        sql: `
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'btc_hourly_data_date_hour_key'
            ) THEN
              ALTER TABLE btc_hourly_data 
              ADD CONSTRAINT btc_hourly_data_date_hour_key UNIQUE (date, hour);
            END IF;
          END $$;
        `
      },
      {
        name: 'Paso 4: Agregar constraint CHECK para hour',
        sql: `
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'btc_hourly_data_hour_check'
            ) THEN
              ALTER TABLE btc_hourly_data 
              ADD CONSTRAINT btc_hourly_data_hour_check CHECK (hour >= 0 AND hour <= 23);
            END IF;
          END $$;
        `
      },
      {
        name: 'Paso 5: Actualizar índices',
        sql: `
          DROP INDEX IF EXISTS idx_btc_hourly_date;
          CREATE INDEX IF NOT EXISTS idx_btc_hourly_date ON btc_hourly_data(date DESC);
          CREATE INDEX IF NOT EXISTS idx_btc_hourly_date_hour ON btc_hourly_data(date DESC, hour);
        `
      }
    ]

    for (const step of steps) {
      try {
        console.log(`   ⏳ ${step.name}...`)
        const { error } = await supabase.rpc('exec_sql', { sql: step.sql })
        
        // El RPC puede no estar disponible, intentar método alternativo
        if (error) {
          // Intentar ejecutar directamente usando query
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ sql: step.sql })
          })
          
          if (!response.ok) {
            console.log(`   ⚠️  No se pudo ejecutar automáticamente. Este paso debe ejecutarse manualmente en Supabase.`)
            console.log(`   SQL a ejecutar:`)
            console.log(`   ${step.sql}\n`)
            continue
          }
        }
        
        console.log(`   ✅ ${step.name} completado`)
      } catch (err) {
        console.log(`   ⚠️  Error en ${step.name}:`, err instanceof Error ? err.message : err)
        console.log(`   💡 Este paso debe ejecutarse manualmente en Supabase SQL Editor`)
        console.log(`   SQL:`)
        console.log(`   ${step.sql}\n`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📋 RESUMEN DE MIGRACIÓN')
    console.log('='.repeat(60))
    console.log('\n⚠️  IMPORTANTE:')
    console.log('   La migración SQL con DO blocks no se puede ejecutar')
    console.log('   directamente desde el cliente de Supabase.')
    console.log('\n✅ DEBES EJECUTAR LA MIGRACIÓN MANUALMENTE:')
    console.log('\n   1. Ve a tu proyecto de Supabase')
    console.log('   2. Abre el SQL Editor')
    console.log('   3. Copia y pega el contenido de: supabase/migration.sql')
    console.log('   4. Ejecuta el script')
    console.log('\n📄 El archivo está en: supabase/migration.sql')
    console.log('\n✨ Después de ejecutar la migración, el cron job funcionará')
    console.log('   automáticamente con la nueva estructura.\n')
    
  } catch (error) {
    console.error('❌ Error en la migración:', error)
    console.log('\n💡 La migración debe ejecutarse manualmente en Supabase SQL Editor')
    console.log('   Archivo: supabase/migration.sql\n')
    process.exit(1)
  }
}

runMigration()
