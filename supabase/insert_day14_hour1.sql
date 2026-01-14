-- SQL para insertar datos del día 14, hora 1 (01:00 UTC)
-- Datos obtenidos de Binance API
-- Timestamp corregido: 1768352400000 = 14 Jan 2026 01:00:00 UTC

INSERT INTO btc_hourly_data (date, hour, price, price_change_percent, timestamp) VALUES
('2026-01-14', 1, 95391.88, 4.4230, 1768352400000)
ON CONFLICT (date, hour) DO UPDATE SET
  price = EXCLUDED.price,
  price_change_percent = EXCLUDED.price_change_percent,
  timestamp = EXCLUDED.timestamp;
