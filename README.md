# Trading X

Aplicación web moderna construida con React, TypeScript y Vite para visualizar y gestionar datos financieros de Bitcoin.

## 🚀 Características

- ⚡ **Vite** - Build tool rápido y eficiente
- ⚛️ **React 18** - Framework de UI moderno
- 📘 **TypeScript** - Tipado estático para mayor seguridad
- 🎨 **Tailwind CSS** - Estilos modernos y responsivos
- 📊 **Visualización de datos** - Tablas y estadísticas interactivas
- 🤖 **Cron Jobs** - Actualización automática cada hora (Vercel)
- 🗄️ **Supabase** - Base de datos para almacenar datos históricos

## 📦 Instalación

1. Instala las dependencias:

```bash
npm install
```

## 🛠️ Desarrollo

Inicia el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🏗️ Build

Para crear una versión de producción:

```bash
npm run build
```

## 🌐 Despliegue en Vercel

### Configuración de Supabase

**IMPORTANTE**: Antes de desplegar, necesitas configurar Supabase. Ver instrucciones detalladas en [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

Resumen rápido:
1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script SQL en `supabase/schema.sql` para crear la tabla
3. Obtén tus credenciales de API desde Settings → API

### Variables de Entorno en Vercel

Configura las siguientes variables en **Settings → Environment Variables**:

**Para el Frontend (Build):**
- `VITE_SUPABASE_URL` = tu Project URL de Supabase
- `VITE_SUPABASE_ANON_KEY` = tu anon public key

**Para el Cron Job (Runtime):**
- `SUPABASE_URL` = tu Project URL de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` = tu service_role key
- `CRON_SECRET` = cualquier string secreto (opcional)

### Configuración del Cron Job

El cron job está configurado en `vercel.json` para ejecutarse cada hora (`0 * * * *`). Automáticamente:
- Consulta la API de Binance
- Guarda los datos en Supabase
- Los datos están disponibles para todos los usuarios

## 📁 Estructura del Proyecto

```
trading_X/
├── api/
│   ├── cron.ts          # Serverless function para cron job
│   └── lib/
│       └── supabaseServer.ts  # Cliente Supabase para servidor
├── supabase/
│   └── schema.sql       # Script SQL para crear la tabla
├── src/
│   ├── lib/
│   │   └── supabase.ts  # Cliente Supabase para cliente
│   ├── components/      # Componentes React
│   │   ├── BTCPriceCard.tsx
│   │   └── HourlyGrid.tsx
│   ├── hooks/          # Custom hooks
│   │   └── useBinanceHourly.ts
│   ├── services/       # Servicios y lógica de negocio
│   │   └── binanceService.ts
│   ├── types/          # Definiciones de tipos TypeScript
│   │   └── index.ts
│   ├── App.tsx         # Componente principal
│   ├── main.tsx        # Punto de entrada
│   └── index.css       # Estilos globales
├── index.html
├── vercel.json         # Configuración de Vercel (cron jobs)
├── package.json
└── vite.config.ts
```

## 🎯 Funcionalidades

- **Fetch automático**: Consulta la API de Binance cada hora
- **Cuadrícula 24h**: Muestra el cambio porcentual comparado con la misma hora del día anterior
- **Diseño cyberpunk**: Estilo oscuro, minimalista y moderno
- **Almacenamiento en Supabase**: Los datos se guardan en la base de datos y están disponibles para todos los usuarios
- **Fallback a localStorage**: Si Supabase no está disponible, usa localStorage como respaldo

## 📝 API

La aplicación usa la API pública de Binance:
- Endpoint: `https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT`
- No requiere autenticación
- Límite de rate: 1200 requests/minuto

## 🔒 Seguridad

El cron job está protegido con un secreto (`CRON_SECRET`) para evitar que cualquiera pueda ejecutarlo manualmente.

## 📝 Licencia

MIT
