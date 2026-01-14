# Configuración de Cron Job Local para Supabase

Esta guía te muestra cómo ejecutar el cron job para Supabase **sin usar Vercel**, ejecutándolo directamente desde tu máquina local o servidor.

**Importante**: Este script captura los datos de la hora actual cada vez que se ejecuta. Debe configurarse para ejecutarse cada hora para capturar todas las horas del día.

## 📋 Requisitos Previos

1. **Variables de entorno configuradas** en un archivo `.env` en la raíz del proyecto:
   ```env
   SUPABASE_URL=tu_url_de_supabase
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   # O alternativamente:
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```

2. **Node.js y npm instalados**

3. **Dependencias instaladas**: `npm install`

## 🚀 Opción 1: Ejecución Manual

Para probar el script manualmente (capturará los datos de la hora actual):

```bash
npx tsx scripts/runCronLocal.ts
```

O usando el script de npm:

```bash
npm run cron:local
```

**Nota**: Cada ejecución captura solo los datos de la hora que acaba de cerrar. Para capturar todas las horas del día, debes ejecutarlo cada hora.

## ⏰ Opción 2: Usar Crontab del Sistema (Recomendado)

### macOS / Linux

1. **Abrir el editor de crontab**:
   ```bash
   crontab -e
   ```

2. **Agregar una línea para ejecutar cada hora** (en el minuto 0):
   
   **IMPORTANTE**: Debe ejecutarse cada hora para capturar los datos de cada hora del día.
   
   ```cron
   0 * * * * cd /Users/lleirgarcia/github_projects/trading_X && /usr/local/bin/node $(which tsx) scripts/runCronLocal.ts >> /tmp/cron-trading-x.log 2>&1
   ```

   O si prefieres usar npm:
   ```cron
   0 * * * * cd /Users/lleirgarcia/github_projects/trading_X && npm run cron:local >> /tmp/cron-trading-x.log 2>&1
   ```
   
   Esto ejecutará el script cada hora (00:00, 01:00, 02:00, etc.) y capturará los datos de esa hora específica.

3. **Guardar y salir** del editor (en vim: `:wq`, en nano: `Ctrl+X` luego `Y`)

4. **Verificar que se agregó correctamente**:
   ```bash
   crontab -l
   ```

### Explicación del formato crontab

```
0 * * * *
│ │ │ │ │
│ │ │ │ └─── Día de la semana (0-7, donde 0 y 7 = domingo)
│ │ │ └───── Mes (1-12)
│ │ └─────── Día del mes (1-31)
│ └───────── Hora (0-23)
└─────────── Minuto (0-59)
```

**Ejemplos de schedules**:
- `0 * * * *` - Cada hora en el minuto 0 (00:00, 01:00, 02:00, etc.)
- `0 */2 * * *` - Cada 2 horas
- `0 0 * * *` - Una vez al día a medianoche
- `*/30 * * * *` - Cada 30 minutos
- `0 9,17 * * *` - A las 9:00 AM y 5:00 PM todos los días

### Encontrar la ruta de Node.js

Si no estás seguro de dónde está Node.js:

```bash
which node
which tsx
```

O si usas nvm:
```bash
which node  # Ejemplo: /Users/tu_usuario/.nvm/versions/node/v20.10.0/bin/node
```

### Usar la ruta completa de Node.js en crontab

Si crontab no encuentra Node.js, usa la ruta completa:

```cron
0 * * * * cd /Users/lleirgarcia/github_projects/trading_X && /ruta/completa/a/node $(which tsx) scripts/runCronLocal.ts >> /tmp/cron-trading-x.log 2>&1
```

## 📝 Opción 3: Script Wrapper para Crontab

Crea un script shell que maneje mejor las variables de entorno:

1. **Crear el script** `scripts/runCronLocal.sh`:
   ```bash
   #!/bin/bash
   cd /Users/lleirgarcia/github_projects/trading_X
   export PATH="/usr/local/bin:$PATH"
   source ~/.zshrc  # o ~/.bashrc según tu shell
   npx tsx scripts/runCronLocal.ts >> /tmp/cron-trading-x.log 2>&1
   ```

2. **Hacerlo ejecutable**:
   ```bash
   chmod +x scripts/runCronLocal.sh
   ```

3. **Agregar a crontab**:
   ```cron
   0 * * * * /Users/lleirgarcia/github_projects/trading_X/scripts/runCronLocal.sh
   ```

## 🔍 Verificar que Funciona

### Ver los logs

Los logs se guardan en `/tmp/cron-trading-x.log`:

```bash
tail -f /tmp/cron-trading-x.log
```

### Verificar en Supabase

1. Ve a tu proyecto en Supabase
2. Ve a **Table Editor** → `btc_hourly_data`
3. Deberías ver los datos guardados con la fecha y hora actuales

### Probar manualmente antes de configurar crontab

```bash
# Ejecutar el script manualmente
npx tsx scripts/runCronLocal.ts

# Verificar que los datos se guardaron en Supabase
```

## 🐛 Solución de Problemas

### El cron no se ejecuta

1. **Verificar que crontab está activo**:
   ```bash
   crontab -l
   ```

2. **Verificar permisos del archivo**:
   ```bash
   ls -la scripts/runCronLocal.ts
   ```

3. **Verificar logs del sistema** (macOS):
   ```bash
   log show --predicate 'process == "cron"' --last 1h
   ```

### Error: "command not found: node"

Usa la ruta completa de Node.js en el crontab. Encuéntrala con:
```bash
which node
```

### Error: "Missing Supabase environment variables"

Asegúrate de que el archivo `.env` existe y tiene las variables correctas. Si usas un script wrapper, asegúrate de que carga el `.env` correctamente.

### El cron se ejecuta pero no guarda datos

1. Verifica los logs: `tail -f /tmp/cron-trading-x.log`
2. Verifica que las variables de entorno están configuradas
3. Verifica que tienes permisos de escritura en Supabase (usa `SUPABASE_SERVICE_ROLE_KEY`)

## 🔄 Alternativas a Crontab

### Usar PM2 (Process Manager)

PM2 es útil si quieres más control y monitoreo:

```bash
# Instalar PM2
npm install -g pm2

# Crear un archivo de configuración pm2.config.js
```

### Usar launchd en macOS

Para más control en macOS, puedes usar `launchd` en lugar de crontab.

## 📚 Recursos Adicionales

- [Crontab Guru](https://crontab.guru/) - Para crear y validar expresiones cron
- [PM2 Documentation](https://pm2.keymetrics.io/) - Para gestión avanzada de procesos
- [Supabase Documentation](https://supabase.com/docs) - Para más información sobre Supabase
