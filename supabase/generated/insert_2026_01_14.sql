-- SQL para insertar datos del 2026-01-14
-- Generado automáticamente por runCronForAllDays.ts
-- Total de horas: 1

INSERT INTO btc_hourly_data (date, hour, price, price_change_percent, timestamp) VALUES
('2026-01-14', 0, 95466.43, 0.0550, 1768352399999)
ON CONFLICT (date, hour) DO UPDATE SET
  price = EXCLUDED.price,
  price_change_percent = EXCLUDED.price_change_percent,
  timestamp = EXCLUDED.timestamp;
