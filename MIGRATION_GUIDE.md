# Guía de Migración - Estructura de Base de Datos

## Cambios Realizados

La estructura de la base de datos ha sido reorganizada para agrupar los datos por **día** y **hora**. Ahora cada día tiene sus 24 horas (0-23) almacenadas de forma organizada.

### Estructura Anterior
- `timestamp` + `hour` como constraint único
- `date` como TIMESTAMPTZ (incluía hora)

### Estructura Nueva
- `date` como DATE (solo fecha, sin hora) + `hour` (0-23) como constraint único
- Cada día puede tener hasta 24 entradas (una por hora)
- Más fácil de consultar y comparar días

## Pasos para Migrar

### 1. Ejecutar el Script de Migración

Ve a tu proyecto de Supabase y ejecuta el script de migración en el SQL Editor:

```sql
-- El script está en: supabase/migration.sql
```

Este script:
- Convierte la columna `date` de TIMESTAMPTZ a DATE
- Elimina el constraint único antiguo (`timestamp, hour`)
- Crea el nuevo constraint único (`date, hour`)
- Actualiza los índices

### 2. Verificar la Migración

Después de ejecutar el script, verifica que la estructura sea correcta:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'btc_hourly_data';
```

Deberías ver:
- `date` como tipo `date`
- `hour` como tipo `integer`
- `timestamp` como tipo `bigint`

### 3. Verificar Constraints

```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'btc_hourly_data';
```

Deberías ver un constraint único en `(date, hour)`.

## Cómo Funciona Ahora

### Guardado de Datos

Cuando se ejecuta el cron job (cada hora):
1. Se obtiene la fecha actual (solo fecha, sin hora): `YYYY-MM-DD`
2. Se obtiene la hora actual: `0-23`
3. Se guarda/actualiza el registro para esa fecha y hora específica

**Ejemplo:**
- Si el cron se ejecuta el 2024-01-15 a las 14:00
- Se guarda: `date = '2024-01-15'`, `hour = 14`

### Lectura de Datos

El grid de 24 horas ahora:
1. Obtiene los datos del día actual
2. Obtiene los datos del día anterior
3. Para cada hora (0-23), compara:
   - Precio de hoy a esa hora
   - Precio de ayer a esa hora
   - Calcula el cambio porcentual

## Archivos Actualizados

- ✅ `supabase/schema.sql` - Nuevo esquema
- ✅ `supabase/migration.sql` - Script de migración
- ✅ `api/cron.ts` - Actualizado para usar `date` + `hour`
- ✅ `src/services/binanceService.ts` - Actualizado para leer por día
- ✅ `scripts/runCron.ts` - Actualizado para nuevo formato
- ✅ `scripts/populateToday.ts` - Actualizado para nuevo formato

## Notas Importantes

⚠️ **Si ya tienes datos en la base de datos:**
- El script de migración convertirá automáticamente los datos existentes
- Los timestamps se usarán para extraer la fecha correcta
- Si hay duplicados (misma fecha y hora), el script puede fallar
  - En ese caso, limpia los duplicados manualmente antes de migrar

✅ **Después de la migración:**
- El cron job seguirá funcionando normalmente
- Los datos se guardarán automáticamente con el nuevo formato
- El grid mostrará correctamente las comparaciones día a día
