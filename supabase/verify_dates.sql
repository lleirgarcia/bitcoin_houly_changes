-- Script para verificar las fechas en la base de datos y agruparlas por mes
-- Ejecuta esto en Supabase SQL Editor

-- Resumen por mes
WITH month_data AS (
  SELECT 
    date,
    EXTRACT(YEAR FROM date::date) as year,
    EXTRACT(MONTH FROM date::date) as month,
    COUNT(*) as count
  FROM btc_hourly_data
  GROUP BY date
),
month_summary AS (
  SELECT 
    year,
    month,
    COUNT(DISTINCT date) as unique_dates,
    MIN(date) as min_date,
    MAX(date) as max_date,
    SUM(count) as total_records
  FROM month_data
  GROUP BY year, month
  ORDER BY year DESC, month DESC
)
SELECT 
  year,
  month,
  CASE month
    WHEN 1 THEN 'Enero'
    WHEN 2 THEN 'Febrero'
    WHEN 3 THEN 'Marzo'
    WHEN 4 THEN 'Abril'
    WHEN 5 THEN 'Mayo'
    WHEN 6 THEN 'Junio'
    WHEN 7 THEN 'Julio'
    WHEN 8 THEN 'Agosto'
    WHEN 9 THEN 'Septiembre'
    WHEN 10 THEN 'Octubre'
    WHEN 11 THEN 'Noviembre'
    WHEN 12 THEN 'Diciembre'
  END as month_name,
  unique_dates,
  total_records,
  min_date,
  max_date
FROM month_summary;

-- Verificar fechas que no pertenecen al mes correcto
-- (Esto no debería devolver ningún resultado si todo está correcto)
SELECT 
  date,
  EXTRACT(YEAR FROM date::date) as year,
  EXTRACT(MONTH FROM date::date) as month,
  COUNT(*) as count,
  'Fecha con formato incorrecto' as issue
FROM btc_hourly_data
WHERE date IS NULL 
   OR date::text !~ '^\d{4}-\d{2}-\d{2}$'
GROUP BY date, year, month
ORDER BY date DESC;

-- Verificar fechas específicas de los meses problemáticos
SELECT 
  date,
  EXTRACT(YEAR FROM date::date) as year,
  EXTRACT(MONTH FROM date::date) as month,
  COUNT(*) as records
FROM btc_hourly_data
WHERE date >= '2025-06-01' AND date < '2025-07-01'  -- Junio 2025
   OR date >= '2025-11-01' AND date < '2025-12-01'  -- Noviembre 2025
   OR date >= '2025-12-01' AND date < '2026-01-01'  -- Diciembre 2025
   OR date >= '2026-01-01' AND date < '2026-02-01'  -- Enero 2026
GROUP BY date, year, month
ORDER BY date;

-- Resumen de fechas únicas por mes (detallado)
SELECT 
  EXTRACT(YEAR FROM date::date) as year,
  EXTRACT(MONTH FROM date::date) as month,
  date,
  COUNT(*) as records,
  MIN(hour) as min_hour,
  MAX(hour) as max_hour
FROM btc_hourly_data
WHERE date >= '2025-06-01'
GROUP BY year, month, date
ORDER BY year DESC, month DESC, date DESC;

-- Verificar si hay fechas duplicadas o inconsistentes
SELECT 
  date,
  hour,
  COUNT(*) as duplicates
FROM btc_hourly_data
GROUP BY date, hour
HAVING COUNT(*) > 1
ORDER BY date DESC, hour;
