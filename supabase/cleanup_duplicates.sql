-- Script para limpiar duplicados antes de la migración
-- Ejecuta este script PRIMERO si obtienes un error de constraint único

-- Paso 1: Verificar si hay duplicados
SELECT 
  date, 
  hour, 
  COUNT(*) as count
FROM btc_hourly_data
GROUP BY date, hour
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Paso 2: Eliminar duplicados, manteniendo solo el registro más reciente (mayor timestamp)
-- Esto crea una tabla temporal con los IDs de los registros a mantener
WITH ranked_data AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY date, hour 
      ORDER BY timestamp DESC, created_at DESC
    ) as rn
  FROM btc_hourly_data
)
DELETE FROM btc_hourly_data
WHERE id IN (
  SELECT id 
  FROM ranked_data 
  WHERE rn > 1
);

-- Paso 3: Verificar que ya no hay duplicados
SELECT 
  date, 
  hour, 
  COUNT(*) as count
FROM btc_hourly_data
GROUP BY date, hour
HAVING COUNT(*) > 1;
-- Si esta query no devuelve resultados, significa que ya no hay duplicados
