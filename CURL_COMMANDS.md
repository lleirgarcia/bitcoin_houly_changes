# Comandos cURL Usados en el Proyecto

Este documento contiene todos los comandos `curl` que se han utilizado en el proyecto Trading X.

## 📡 API de Binance

### Obtener datos de klines (velas de 1 hora)
```bash
# Obtener las últimas 24 horas de datos de BTC/USDT
curl -s "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24" > /tmp/binance_klines.json
```

**Uso**: Este comando se usa en `scripts/generateSQLFromKlines.ts` para obtener datos históricos y generar archivos SQL.

**Parámetros**:
- `symbol=BTCUSDT`: Par de trading (Bitcoin/USDT)
- `interval=1h`: Intervalo de tiempo (1 hora)
- `limit=24`: Número de velas a obtener (24 horas)

### Obtener datos de klines para un rango de fechas específico
```bash
# Obtener datos para un día específico (ejemplo: 13 de enero de 2026)
# startTime y endTime deben ser timestamps en milisegundos
curl -s "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=1736726400000&endTime=1736812799999&limit=24"
```

**Ejemplo con fechas calculadas**:
```bash
# Para el 13 de enero de 2026 (UTC)
# Inicio del día: 2026-01-13 00:00:00 UTC = 1736726400000 ms
# Fin del día: 2026-01-13 23:59:59 UTC = 1736812799999 ms
curl -s "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=1736726400000&endTime=1736812799999&limit=24"
```

### Obtener ticker de 24 horas (precio actual)
```bash
# Obtener el precio actual y estadísticas de 24h de BTC/USDT
curl -s "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"
```

**Uso**: Este endpoint se usa en varios scripts para obtener el precio actual de Bitcoin.

**Respuesta incluye**:
- `lastPrice`: Precio actual
- `priceChangePercent`: Cambio porcentual en 24h
- `highPrice`: Precio máximo en 24h
- `lowPrice`: Precio mínimo en 24h
- Y más estadísticas

## 🚀 API de Vercel (Cron Job)

### Llamar al endpoint del cron job manualmente
```bash
# Llamar al cron job con autenticación
curl -X GET "https://trading-x.vercel.app/api/cron" \
  -H "Authorization: Bearer mi_secreto_123"
```

**Uso**: Este comando se usa para probar manualmente el cron job o ejecutarlo desde un servicio externo.

**Headers requeridos**:
- `Authorization: Bearer <CRON_SECRET>`: Token de autenticación configurado en las variables de entorno de Vercel

**Nota**: Reemplaza `mi_secreto_123` con el valor real de `CRON_SECRET` configurado en Vercel.

### Script para ejecutar el cron cada hora (local)
```bash
# Ejecutar en un servidor siempre activo
while true; do
  curl -X GET "https://trading-x.vercel.app/api/cron" \
    -H "Authorization: Bearer mi_secreto_123"
  sleep 3600  # Esperar 1 hora
done
```

**Uso**: Alternativa a usar un servicio externo de cron jobs si tienes un servidor siempre activo.

## 📝 Ejemplos de Uso

### 1. Obtener datos de Binance y guardarlos en un archivo
```bash
curl -s "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24" > binance_data.json
```

### 2. Ver datos de Binance en formato legible (con jq)
```bash
curl -s "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT" | jq '.'
```

### 3. Probar el cron job y ver la respuesta
```bash
curl -X GET "https://trading-x.vercel.app/api/cron" \
  -H "Authorization: Bearer mi_secreto_123" \
  -v
```

### 4. Obtener datos de klines y procesarlos
```bash
# Guardar en archivo temporal
curl -s "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24" > /tmp/binance_klines.json

# Ver el contenido
cat /tmp/binance_klines.json | jq '.'
```

## 🔧 Parámetros Comunes de Binance API

### Símbolos disponibles
- `BTCUSDT`: Bitcoin/USDT
- `ETHUSDT`: Ethereum/USDT
- `BNBUSDT`: Binance Coin/USDT
- Y muchos más...

### Intervalos disponibles
- `1m`: 1 minuto
- `5m`: 5 minutos
- `15m`: 15 minutos
- `1h`: 1 hora
- `4h`: 4 horas
- `1d`: 1 día
- Y más...

### Límites
- `limit`: Número máximo de velas a obtener (máximo 1000 para klines)

## 📚 Referencias

- **Binance API Docs**: https://binance-docs.github.io/apidocs/spot/en/
- **Klines Endpoint**: https://binance-docs.github.io/apidocs/spot/en/#kline-candlestick-data
- **24hr Ticker**: https://binance-docs.github.io/apidocs/spot/en/#24hr-ticker-price-change-statistics

## 🔐 Notas de Seguridad

- ⚠️ **Nunca** compartas tus tokens de autenticación públicamente
- ⚠️ **Nunca** subas archivos `.env` a repositorios públicos
- ⚠️ Usa variables de entorno para todos los secretos
- ✅ Los endpoints de Binance son públicos y no requieren autenticación para datos básicos

## 📅 Fechas de Referencia (Timestamps en milisegundos)

Para facilitar el cálculo de timestamps para rangos de fechas:

```bash
# Convertir fecha a timestamp (ejemplo: 2026-01-13 00:00:00 UTC)
date -u -j -f "%Y-%m-%d %H:%M:%S" "2026-01-13 00:00:00" "+%s000"

# O usar Node.js
node -e "console.log(new Date('2026-01-13T00:00:00Z').getTime())"
```

---

**Última actualización**: Enero 2026
**Proyecto**: Trading X