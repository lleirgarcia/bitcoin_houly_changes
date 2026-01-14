-- SQL para verificar los datos de los días 13 y 14
-- Ejecuta esto en Supabase SQL Editor para ver qué hay guardado

-- Ver todos los registros del día 13
SELECT 
  date,
  hour,
  price,
  price_change_percent,
  timestamp,
  to_timestamp(timestamp / 1000) as timestamp_readable
FROM btc_hourly_data 
WHERE date = '2026-01-13'
ORDER BY hour;

-- Ver todos los registros del día 14
SELECT 
  date,
  hour,
  price,
  price_change_percent,
  timestamp,
  to_timestamp(timestamp / 1000) as timestamp_readable
FROM btc_hourly_data 
WHERE date = '2026-01-14'
ORDER BY hour;
