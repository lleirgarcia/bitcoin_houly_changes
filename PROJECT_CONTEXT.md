# Trading X - Contexto Completo del Proyecto

## 📋 Resumen del Proyecto

**Trading X** es una aplicación web avanzada para análisis y visualización de datos históricos de Bitcoin (BTC/USDT) con actualización automática cada hora. El proyecto permite a los traders analizar patrones horarios, comparar rendimientos entre días, y tomar decisiones basadas en datos históricos.

## 🎯 Objetivo Principal

Crear una herramienta de análisis técnico que permita:
- Visualizar datos históricos de BTC por hora
- Comparar rendimientos entre diferentes períodos
- Identificar patrones horarios y tendencias
- Analizar estadísticas mensuales y semanales
- Excluir fines de semana del análisis (días laborables)

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: Tailwind CSS (tema oscuro cyberpunk)
- **Base de Datos**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **API Externa**: Binance API (pública, sin autenticación)
- **Cron Jobs**: Vercel Cron (cada hora)

### Estructura de Datos

#### Tabla `btc_hourly_data`
```sql
- date: DATE (YYYY-MM-DD)
- hour: INTEGER (0-23)
- price: NUMERIC(20, 2)
- price_change_percent: NUMERIC(10, 4)
- timestamp: BIGINT (milisegundos)
- UNIQUE(date, hour)
```

Cada día tiene 24 registros (uno por hora), facilitando comparaciones y análisis.

## 📊 Funcionalidades Implementadas

### 1. Vista Principal (24H Grid)
- **Grid de 24 horas**: Muestra el cambio porcentual de cada hora
- **Dos modos de comparación**:
  - `compare with hour yesterday`: Compara con la misma hora del día anterior
  - `compare with previous hour`: Compara con la hora anterior del mismo día
- **Vista de comparación**: Muestra cambios porcentuales con colores (verde/rojo)
- **Vista horaria**: Muestra precios actuales y datos en tiempo real

### 2. Vista Histórica
- **Agrupación por mes**: Datos organizados por mes y semana
- **Acordeón de meses**: Solo un mes abierto a la vez
- **Exclusión de fines de semana**: Los cálculos estadísticos excluyen sábados y domingos
- **Estadísticas diarias**:
  - Porcentaje de horas positivas/negativas
  - Hora de máxima ganancia
  - Rachas consecutivas (positivas/negativas)
  - Total positivo y negativo del día
  - **Porcentaje total del día** (mostrado junto a la fecha)

### 3. Estadísticas Mensuales (High Stats)
- **Solo disponible en modo "compare with previous hour"**
- **Top 3 horas seguidas más positivas**: Basadas en promedio mensual
- **Top 3 horas seguidas más negativas**: Basadas en promedio mensual
- **Cálculo de promedios**: Para cada hora (0-23) se calcula el promedio de todos los días laborables del mes
- **Grupos de 3 horas consecutivas**: Identifica las mejores y peores rachas de 3 horas

### 4. Datos Históricos
- **Datos disponibles**: Noviembre 2025, Diciembre 2025, Enero 2026
- **Obtención de datos**: Scripts para obtener datos históricos de Binance API
- **Almacenamiento**: SQL files en `supabase/` para inserción masiva

## 🔄 Flujo de Datos

### Recolección Automática
1. **Cron Job** (cada hora en Vercel):
   - Llama a `api/cron.ts`
   - Obtiene datos de Binance API (klines de 1 hora)
   - Procesa las últimas 24 horas
   - Guarda en Supabase usando `upsert` (actualiza si existe)

### Visualización
1. **Frontend carga datos**:
   - Obtiene datos de hoy y ayer para el grid
   - Obtiene todos los datos históricos para la vista histórica
   - Agrupa por mes, semana y día
   - Calcula comparaciones según el modo seleccionado

## 📈 Modos de Comparación

### `hour_yesterday` (Por defecto)
Compara cada hora con la misma hora del día anterior.
- **Ejemplo**: Hora 15:00 de hoy vs hora 15:00 de ayer
- **Útil para**: Identificar patrones diarios recurrentes

### `previous_hour`
Compara cada hora con la hora anterior del mismo día.
- **Ejemplo**: Hora 15:00 vs hora 14:00 del mismo día
- **Útil para**: Identificar momentum y tendencias intradía

## 🎨 Características de UI/UX

### Diseño
- **Tema oscuro**: Fondo negro (#0a0a0a) con acentos de color
- **Tipografía**: Orbitron para títulos, mono para datos
- **Colores**:
  - Verde: Cambios positivos
  - Rojo: Cambios negativos
  - Amarillo: Fines de semana
  - Gris: Datos neutros/sin datos

### Interactividad
- **Sin recargas**: Todos los botones usan `preventDefault()`
- **Acordeón**: Solo un mes expandido a la vez
- **Tooltips**: Información adicional al hover
- **Responsive**: Adaptado a diferentes tamaños de pantalla

## 📁 Archivos Clave

### Componentes
- `src/components/HistoricalView.tsx`: Vista histórica con acordeón y estadísticas
- `src/components/HourlyGrid.tsx`: Grid de 24 horas con modos de comparación
- `src/components/BTCPriceCard.tsx`: Tarjeta de precio actual

### Servicios
- `src/services/binanceService.ts`: Lógica de obtención y procesamiento de datos
  - `getHistoricalDataByWeek()`: Agrupa datos por mes y semana
  - `get24HourGrid()`: Genera grid de comparación
  - `calculateMonthStats()`: Calcula estadísticas mensuales

### Scripts
- `scripts/fetchNovemberDecember2025.ts`: Obtiene datos históricos de Binance
- `scripts/generateSQLFromKlines.ts`: Genera SQL desde datos de Binance
- `api/cron.ts`: Endpoint del cron job

### SQL
- `supabase/insert_november_december_2025.sql`: Datos de noviembre y diciembre 2025
- `supabase/insert_all_days_january_2026.sql`: Datos de enero 2026

## 🔧 Configuración y Despliegue

### Variables de Entorno
- `VITE_SUPABASE_URL`: URL del proyecto Supabase
- `VITE_SUPABASE_ANON_KEY`: Clave pública de Supabase
- `SUPABASE_URL`: URL del proyecto (para servidor)
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio (para escritura)
- `CRON_SECRET`: Secreto para proteger el endpoint del cron

### Cron Job
- **Frecuencia**: Cada hora (`0 * * * *`)
- **Endpoint**: `/api/cron`
- **Autenticación**: Header `Authorization: Bearer <CRON_SECRET>`

## 📝 Documentación Adicional

- `CURL_COMMANDS.md`: Todos los comandos curl usados en el proyecto
- `SUPABASE_SETUP.md`: Guía de configuración de Supabase
- `VERCEL_DEPLOY.md`: Instrucciones de despliegue
- `CRON_HOURLY_SOLUTION.md`: Soluciones para cron jobs cada hora
- `MIGRATION_GUIDE.md`: Guía de migración de estructura de datos

## 🐛 Problemas Conocidos y Soluciones

### Noviembre no aparece como mes separado
- **Problema**: Los datos de noviembre pueden agruparse incorrectamente
- **Solución**: Se agregaron logs de depuración para identificar el problema
- **Estado**: En investigación

### Agrupación de semanas que cruzan meses
- **Problema**: Las semanas pueden empezar en un mes y terminar en otro
- **Solución**: Los días se agrupan por su fecha real, no por la semana

## 🚀 Próximas Mejoras Potenciales

1. **Alertas**: Notificaciones cuando se detectan patrones específicos
2. **Backtesting**: Simular estrategias con datos históricos
3. **Exportación**: Descargar datos en CSV/JSON
4. **Gráficos**: Visualización de tendencias con charts
5. **Análisis predictivo**: ML para predecir movimientos futuros
6. **Múltiples pares**: Extender a otros pares de trading (ETH, etc.)

## 📊 Métricas y Estadísticas Disponibles

### Por Día
- Porcentaje de horas positivas
- Hora de máxima ganancia
- Rachas consecutivas (positivas/negativas)
- Total positivo y negativo
- Porcentaje total del día

### Por Mes (solo días laborables)
- Total de días laborables
- Total de horas con datos
- Porcentaje de horas positivas
- Top 3 horas seguidas más positivas (promedio)
- Top 3 horas seguidas más negativas (promedio)
- Promedios de cambios positivos y negativos

## 🔐 Seguridad

- **RLS (Row Level Security)**: Habilitado en Supabase
- **Lectura pública**: Cualquiera puede leer datos
- **Escritura protegida**: Solo con service_role key
- **Cron protegido**: Requiere CRON_SECRET

## 📞 Soporte

Para problemas o preguntas, revisar:
1. Logs de la consola del navegador
2. Logs de Vercel (Deployments → Functions)
3. Logs de Supabase (Logs → API)

---

**Última actualización**: Enero 2026
**Versión**: 1.0.0
