# Solución para Cron Job Cada Hora

## ⚠️ Limitación de Vercel Hobby

El plan Hobby de Vercel solo permite cron jobs **una vez al día**. Para ejecutar el cron cada hora, necesitas una de estas soluciones:

## Opción 1: Usar un Servicio Externo de Cron (Recomendado - Gratis)

### Usar cron-job.org (Gratis)

1. Ve a https://cron-job.org y crea una cuenta gratuita
2. Crea un nuevo cron job:
   - **URL**: `https://trading-x.vercel.app/api/cron`
   - **Schedule**: Cada hora (`0 * * * *`)
   - **Método**: GET
   - **Headers**: 
     - `Authorization: Bearer mi_secreto_123`
3. El servicio llamará a tu endpoint cada hora automáticamente

### Usar EasyCron (Gratis)

1. Ve a https://www.easycron.com
2. Crea un cron job similar con la misma configuración

## Opción 2: Actualizar a Vercel Pro

Si actualizas a Vercel Pro, puedes usar el schedule `0 * * * *` directamente en `vercel.json`.

## Opción 3: Usar un Script Local con setInterval

Puedes ejecutar un script local que llame al endpoint cada hora:

```bash
# Ejecutar en un servidor siempre activo
while true; do
  curl -X GET "https://trading-x.vercel.app/api/cron" \
    -H "Authorization: Bearer mi_secreto_123"
  sleep 3600  # Esperar 1 hora
done
```

## Estado Actual

✅ El código del cron job está correcto:
- Obtiene datos de Binance: `GET https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT`
- Guarda en Supabase con fecha y hora
- Maneja errores correctamente

❌ El schedule en Vercel está limitado por el plan Hobby

## Recomendación

Usa **cron-job.org** (gratis) para llamar a tu endpoint cada hora. Es la solución más simple y no requiere cambios en el código.
