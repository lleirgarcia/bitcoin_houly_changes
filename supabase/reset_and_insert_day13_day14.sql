-- SQL para borrar todos los datos e insertar datos del día 13 y día 14
-- Ejecuta esto en Supabase SQL Editor
-- 
-- NOTA: Este SQL inserta:
-- - Todos los datos del día 13 (23 horas: 0-22)
-- - Datos del día 14 para las horas 0 y 1 (las primeras 2 horas del día)
-- 
-- Si el cron job ya se ejecutó hoy, estos datos deberían coincidir con lo que está guardado.
-- Si necesitas más horas del día 14, ejecuta el cron manualmente o añádelas aquí.

-- 1. BORRAR TODOS LOS DATOS
DELETE FROM btc_hourly_data;

-- 2. INSERTAR TODOS LOS DATOS DEL DÍA 13 (23 horas: 0-22, falta la hora 23)
INSERT INTO btc_hourly_data (date, hour, price, price_change_percent, timestamp) VALUES
('2026-01-13', 0, 93950.47, 3.2200, 1768262400000),
('2026-01-13', 1, 94004.07, 3.1700, 1768266000000),
('2026-01-13', 2, 93412.77, 2.9600, 1768269600000),
('2026-01-13', 3, 93935.74, 3.1500, 1768273200000),
('2026-01-13', 4, 94771.61, 2.9800, 1768276800000),
('2026-01-13', 5, 94082.79, 3.2000, 1768280400000),
('2026-01-13', 6, 93994.97, 3.0700, 1768284000000),
('2026-01-13', 7, 93914.86, 3.3500, 1768287600000),
('2026-01-13', 8, 93721.04, 3.0700, 1768291200000),
('2026-01-13', 9, 94741.08, 3.3400, 1768294800000),
('2026-01-13', 10, 94568.79, 3.2400, 1768298400000),
('2026-01-13', 11, 94758.17, 3.3400, 1768302000000),
('2026-01-13', 12, 94101.51, 3.3700, 1768305600000),
('2026-01-13', 13, 93314.65, 3.2500, 1768309200000),
('2026-01-13', 14, 94564.66, 3.2600, 1768312800000),
('2026-01-13', 15, 93961.26, 3.0300, 1768316400000),
('2026-01-13', 16, 93500.12, 3.1600, 1768320000000),
('2026-01-13', 17, 93371.85, 3.0600, 1768323600000),
('2026-01-13', 18, 94263.70, 2.9800, 1768327200000),
('2026-01-13', 19, 94242.31, 3.0100, 1768330800000),
('2026-01-13', 20, 94328.08, 3.2800, 1768334400000),
('2026-01-13', 21, 93603.78, 3.3700, 1768338000000),
('2026-01-13', 22, 94936.14, 3.1600, 1768341600000)
ON CONFLICT (date, hour) DO UPDATE SET
  price = EXCLUDED.price,
  price_change_percent = EXCLUDED.price_change_percent,
  timestamp = EXCLUDED.timestamp;

-- 3. INSERTAR DATOS DEL DÍA 14 (horas 0 y 1 - las primeras 2 horas del día)
-- NOTA: Si el cron job ya se ejecutó, estos valores deberían coincidir con los datos reales.
-- Si tienes datos diferentes del cron, reemplázalos aquí.
INSERT INTO btc_hourly_data (date, hour, price, price_change_percent, timestamp) VALUES
('2026-01-14', 0, 95391.88, 4.4230, 1768348800000),
('2026-01-14', 1, 95391.88, 4.4230, 1768352400000)
ON CONFLICT (date, hour) DO UPDATE SET
  price = EXCLUDED.price,
  price_change_percent = EXCLUDED.price_change_percent,
  timestamp = EXCLUDED.timestamp;
