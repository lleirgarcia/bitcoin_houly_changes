-- Script de migración CORREGIDO para actualizar la estructura de btc_hourly_data
-- Este script convierte la tabla existente al nuevo formato: date + hour
-- IMPORTANTE: Si obtienes un error de duplicados, ejecuta primero cleanup_duplicates.sql

-- ============================================
-- PASO 0: Limpiar duplicados (si es necesario)
-- ============================================
-- Si obtienes un error de constraint único, ejecuta primero:
-- DELETE FROM btc_hourly_data
-- WHERE id IN (
--   SELECT id 
--   FROM (
--     SELECT 
--       id,
--       ROW_NUMBER() OVER (
--         PARTITION BY date, hour 
--         ORDER BY timestamp DESC, created_at DESC
--       ) as rn
--     FROM btc_hourly_data
--   ) ranked
--   WHERE rn > 1
-- );

-- ============================================
-- PASO 1: Convertir/crear columna date
-- ============================================
DO $$ 
BEGIN
  -- Si la columna date no existe o es TIMESTAMPTZ, convertirla
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'btc_hourly_data' 
    AND column_name = 'date' 
    AND data_type = 'timestamp with time zone'
  ) THEN
    -- Convertir la columna date de TIMESTAMPTZ a DATE
    ALTER TABLE btc_hourly_data 
    ALTER COLUMN date TYPE DATE USING date::DATE;
    
    RAISE NOTICE 'Columna date convertida de TIMESTAMPTZ a DATE';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'btc_hourly_data' 
    AND column_name = 'date'
  ) THEN
    -- Agregar nueva columna date
    ALTER TABLE btc_hourly_data ADD COLUMN date DATE;
    
    -- Rellenar la columna date basándose en el timestamp existente
    UPDATE btc_hourly_data 
    SET date = TO_DATE(to_timestamp(timestamp / 1000)::text, 'YYYY-MM-DD')::DATE
    WHERE date IS NULL;
    
    -- Hacer la columna NOT NULL
    ALTER TABLE btc_hourly_data ALTER COLUMN date SET NOT NULL;
    
    RAISE NOTICE 'Columna date creada y rellenada';
  ELSE
    RAISE NOTICE 'Columna date ya existe como DATE';
  END IF;
END $$;

-- ============================================
-- PASO 2: Limpiar duplicados antes de crear constraint
-- ============================================
-- Eliminar duplicados, manteniendo solo el más reciente
DELETE FROM btc_hourly_data
WHERE id IN (
  SELECT id 
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY date, hour 
        ORDER BY timestamp DESC, created_at DESC
      ) as rn
    FROM btc_hourly_data
  ) ranked
  WHERE rn > 1
);

-- ============================================
-- PASO 3: Eliminar constraint único antiguo
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'btc_hourly_data_timestamp_hour_key'
  ) THEN
    ALTER TABLE btc_hourly_data DROP CONSTRAINT btc_hourly_data_timestamp_hour_key;
    RAISE NOTICE 'Constraint antiguo (timestamp, hour) eliminado';
  END IF;
END $$;

-- ============================================
-- PASO 4: Crear nuevo constraint único (date, hour)
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'btc_hourly_data_date_hour_key'
  ) THEN
    ALTER TABLE btc_hourly_data 
    ADD CONSTRAINT btc_hourly_data_date_hour_key UNIQUE (date, hour);
    RAISE NOTICE 'Nuevo constraint único (date, hour) creado';
  ELSE
    RAISE NOTICE 'Constraint único (date, hour) ya existe';
  END IF;
END $$;

-- ============================================
-- PASO 5: Agregar constraint CHECK para hour
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'btc_hourly_data_hour_check'
  ) THEN
    ALTER TABLE btc_hourly_data 
    ADD CONSTRAINT btc_hourly_data_hour_check CHECK (hour >= 0 AND hour <= 23);
    RAISE NOTICE 'Constraint CHECK para hour creado';
  ELSE
    RAISE NOTICE 'Constraint CHECK para hour ya existe';
  END IF;
END $$;

-- ============================================
-- PASO 6: Actualizar índices
-- ============================================
DROP INDEX IF EXISTS idx_btc_hourly_date;
CREATE INDEX IF NOT EXISTS idx_btc_hourly_date ON btc_hourly_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_btc_hourly_date_hour ON btc_hourly_data(date DESC, hour);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
-- Verificar que no hay duplicados
SELECT 
  'Verificando duplicados...' as status,
  COUNT(*) as total_duplicados
FROM (
  SELECT date, hour, COUNT(*) as cnt
  FROM btc_hourly_data
  GROUP BY date, hour
  HAVING COUNT(*) > 1
) duplicates;

-- Si la query anterior devuelve 0, la migración fue exitosa
