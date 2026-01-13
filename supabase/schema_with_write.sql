-- Tabla para almacenar los datos horarios de BTC
CREATE TABLE IF NOT EXISTS btc_hourly_data (
  id BIGSERIAL PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  hour INTEGER NOT NULL,
  price NUMERIC(20, 2) NOT NULL,
  price_change_percent NUMERIC(10, 4) NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Índice para búsquedas por hora y timestamp
  UNIQUE(timestamp, hour)
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_btc_hourly_timestamp ON btc_hourly_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_btc_hourly_hour ON btc_hourly_data(hour);
CREATE INDEX IF NOT EXISTS idx_btc_hourly_date ON btc_hourly_data(date DESC);

-- Política RLS (Row Level Security) - Permitir lectura y escritura pública
ALTER TABLE btc_hourly_data ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura pública
CREATE POLICY "Allow public read access" ON btc_hourly_data
  FOR SELECT
  USING (true);

-- Política para permitir escritura pública (necesaria si usas anon key)
CREATE POLICY "Allow public insert access" ON btc_hourly_data
  FOR INSERT
  WITH CHECK (true);

-- Política para permitir actualización pública
CREATE POLICY "Allow public update access" ON btc_hourly_data
  FOR UPDATE
  USING (true);
