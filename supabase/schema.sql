-- Tabla para almacenar los datos horarios de BTC
-- Estructura: cada día tiene 24 horas (0-23)
CREATE TABLE IF NOT EXISTS btc_hourly_data (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  price NUMERIC(20, 2) NOT NULL,
  price_change_percent NUMERIC(10, 4) NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Cada día solo puede tener una entrada por hora
  UNIQUE(date, hour)
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_btc_hourly_date ON btc_hourly_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_btc_hourly_hour ON btc_hourly_data(hour);
CREATE INDEX IF NOT EXISTS idx_btc_hourly_date_hour ON btc_hourly_data(date DESC, hour);
CREATE INDEX IF NOT EXISTS idx_btc_hourly_timestamp ON btc_hourly_data(timestamp DESC);

-- Política RLS (Row Level Security) - Permitir lectura pública, escritura solo con service role
ALTER TABLE btc_hourly_data ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura pública
CREATE POLICY "Allow public read access" ON btc_hourly_data
  FOR SELECT
  USING (true);

-- Política para permitir inserción solo desde el servidor (service role)
-- La inserción se hará desde el cron job con service role key, así que no necesitamos política de inserción pública
