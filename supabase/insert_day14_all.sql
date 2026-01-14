-- SQL para insertar todos los datos del día 14
-- Timestamps corregidos para UTC (no hora local)

-- Eliminar datos existentes del día 14 si los hay
DELETE FROM btc_hourly_data WHERE date = '2026-01-14';

-- Insertar datos del día 14
INSERT INTO btc_hourly_data (date, hour, price, price_change_percent, timestamp) VALUES
-- Hora 0 (00:00 UTC) - Si guardaste a la 1:00 local
('2026-01-14', 0, 95391.88, 4.4230, 1768348800000),
-- Hora 1 (01:00 UTC) - Si guardaste a la 2:00 local
('2026-01-14', 1, 95391.88, 4.4230, 1768352400000)
ON CONFLICT (date, hour) DO UPDATE SET
  price = EXCLUDED.price,
  price_change_percent = EXCLUDED.price_change_percent,
  timestamp = EXCLUDED.timestamp;
