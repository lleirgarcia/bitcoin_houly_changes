-- SQL para ver TODOS los datos de btc_hourly_data
-- Ejecuta esto en Supabase SQL Editor

SELECT 
  date,
  hour,
  price,
  price_change_percent,
  timestamp,
  to_timestamp(timestamp / 1000) AT TIME ZONE 'UTC' as timestamp_utc,
  to_timestamp(timestamp / 1000) AT TIME ZONE 'Europe/Madrid' as timestamp_local
FROM btc_hourly_data 
ORDER BY date DESC, hour ASC;

-- También puedes ver un resumen por día:
SELECT 
  date,
  COUNT(*) as total_hours,
  MIN(hour) as min_hour,
  MAX(hour) as max_hour,
  MIN(price) as min_price,
  MAX(price) as max_price,
  AVG(price) as avg_price
FROM btc_hourly_data 
GROUP BY date
ORDER BY date DESC;
