# Configuración de Supabase

## Paso 1: Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Espera a que se complete la configuración (2-3 minutos)

## Paso 2: Crear la tabla

1. Ve a tu proyecto en Supabase
2. Navega a **SQL Editor**
3. Copia y pega el contenido de `supabase/schema.sql`
4. Ejecuta el script SQL

Esto creará la tabla `btc_hourly_data` con los índices necesarios.

## Paso 3: Obtener las credenciales

1. Ve a **Settings** → **API**
2. Copia los siguientes valores:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (para el cron job)

## Paso 4: Configurar variables de entorno

### Para desarrollo local:

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### Para Vercel:

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega las siguientes variables:

**Para el frontend (Build):**
- `VITE_SUPABASE_URL` = tu Project URL
- `VITE_SUPABASE_ANON_KEY` = tu anon public key

**Para el cron job (Runtime):**
- `SUPABASE_URL` = tu Project URL
- `SUPABASE_SERVICE_ROLE_KEY` = tu service_role key
- `CRON_SECRET` = cualquier string secreto (opcional)

## Paso 5: Verificar la configuración

1. Ejecuta `npm install` para instalar las dependencias
2. Ejecuta `npm run dev` para iniciar el servidor de desarrollo
3. La aplicación debería conectarse a Supabase automáticamente

## Estructura de la tabla

La tabla `btc_hourly_data` tiene las siguientes columnas:

- `id`: ID único (auto-generado)
- `timestamp`: Timestamp en milisegundos
- `hour`: Hora del día (0-23)
- `price`: Precio de BTC
- `price_change_percent`: Porcentaje de cambio
- `date`: Fecha y hora ISO
- `created_at`: Fecha de creación (auto-generado)

## Seguridad

- La tabla tiene **Row Level Security (RLS)** habilitado
- Lectura pública permitida (para que el frontend pueda leer)
- Escritura solo con service_role key (desde el cron job)

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Verifica que las variables de entorno estén configuradas correctamente
- En desarrollo, asegúrate de tener un archivo `.env` en la raíz

### Error: "relation does not exist"
- Ejecuta el script SQL en Supabase SQL Editor
- Verifica que la tabla se haya creado correctamente

### El cron job no guarda datos
- Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté configurado en Vercel
- Revisa los logs del cron job en Vercel
