#!/bin/bash

# Script wrapper para ejecutar el cron job local
# Este script maneja mejor las variables de entorno y rutas

# Cambiar al directorio del proyecto
cd "$(dirname "$0")/.." || exit 1

# Cargar variables de entorno si existe .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Asegurar que Node.js está en el PATH
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Ejecutar el script TypeScript
npx tsx scripts/runCronLocal.ts

# Guardar el código de salida
exit_code=$?

# Si hay un error, escribirlo en los logs
if [ $exit_code -ne 0 ]; then
    echo "$(date): Error ejecutando cron job (código: $exit_code)" >> /tmp/cron-trading-x-error.log
fi

exit $exit_code
