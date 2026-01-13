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

-- Paso 2: Limpiar duplicados después de convertir date
-- Eliminar duplicados, manteniendo solo el registro más reciente (mayor timestamp)
-- Esto funciona tanto si date es DATE como si es TIMESTAMPTZ (se convierte automáticamente)
DELETE FROM btc_hourly_data
WHERE id IN (
  SELECT id 
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY date::DATE, hour 
        ORDER BY timestamp DESC, created_at DESC
      ) as rn
    FROM btc_hourly_data
  ) ranked
  WHERE rn > 1
);

-- Paso 3: Eliminar el constraint único antiguo si existe
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'btc_hourly_data_timestamp_hour_key'
  ) THEN
    ALTER TABLE btc_hourly_data DROP CONSTRAINT btc_hourly_data_timestamp_hour_key;
  END IF;
END $$;

-- Paso 4: Agregar el nuevo constraint único (date, hour)
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

-- Paso 5: Agregar constraint CHECK para hour si no existe
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

-- Paso 6: Actualizar índices
DROP INDEX IF EXISTS idx_btc_hourly_date;
CREATE INDEX IF NOT EXISTS idx_btc_hourly_date ON btc_hourly_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_btc_hourly_date_hour ON btc_hourly_data(date DESC, hour);

-- Nota: El script ahora limpia automáticamente los duplicados antes de crear el constraint.
-- Si aún obtienes errores, verifica que la columna 'date' esté correctamente convertida a DATE.
