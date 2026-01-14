-- SQL para insertar datos del día 13, hora 1 (01:00)
-- Datos del archivo local-storage-data.json (líneas 10-14)

INSERT INTO btc_hourly_data (date, hour, price, price_change_percent, timestamp) VALUES
('2026-01-13', 1, 93950.47, 3.2200, 1768266000000)
ON CONFLICT (date, hour) DO UPDATE SET
  price = EXCLUDED.price,
  price_change_percent = EXCLUDED.price_change_percent,
  timestamp = EXCLUDED.timestamp;
