# Despliegue en Vercel

## Pasos para desplegar

### Opción 1: Desde la terminal (recomendado)

1. **Instala Vercel CLI** (si no lo tienes):
   ```bash
   npm i -g vercel
   ```

2. **Inicia sesión en Vercel**:
   ```bash
   vercel login
   ```

3. **Despliega el proyecto**:
   ```bash
   vercel
   ```
   
   Sigue las instrucciones:
   - ¿Set up and deploy? → **Y**
   - ¿Which scope? → Selecciona tu cuenta
   - ¿Link to existing project? → **N** (primera vez)
   - ¿What's your project's name? → `trading-x` (o el que prefieras)
   - ¿In which directory is your code located? → **./** (Enter)

4. **Configura las variables de entorno**:
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add CRON_SECRET
   ```
   
   Para cada una, ingresa el valor correspondiente.

5. **Despliega a producción**:
   ```bash
   vercel --prod
   ```

### Opción 2: Desde GitHub (recomendado para CI/CD)

1. **Sube tu código a GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <tu-repo-url>
   git push -u origin main
   ```

2. **Conecta con Vercel**:
   - Ve a [vercel.com](https://vercel.com)
   - Clic en "Add New Project"
   - Importa tu repositorio de GitHub
   - Vercel detectará automáticamente la configuración

3. **Configura las variables de entorno**:
   - En el proyecto de Vercel, ve a **Settings** → **Environment Variables**
   - Agrega las siguientes variables:

   **Para Build (Frontend):**
   - `VITE_SUPABASE_URL` = `https://gfqzaccvmsybuesbxvdy.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_6YU_GBY_KkzqU09ZLDpfeg_SiQoJADm`

   **Para Runtime (Cron Job):**
   - `SUPABASE_URL` = `https://gfqzaccvmsybuesbxvdy.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmcXphY2N2bXN5YnVlc2J4dmR5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMzMzA5OCwiZXhwIjoyMDgzOTA5MDk4fQ.uF8LEHELBf87kmTbRrMC5poV7GhwNZzSdmBNEtOaLyQ`
   - `CRON_SECRET` = `mi_secreto_123` (o cualquier string secreto)

4. **Despliega**:
   - Clic en "Deploy"
   - Vercel construirá y desplegará automáticamente

## Verificación después del despliegue

1. **Verifica que la app funciona**: Visita la URL que Vercel te proporciona
2. **Verifica el cron job**: 
   - Ve a tu proyecto en Vercel
   - **Settings** → **Cron Jobs**
   - Deberías ver el cron job configurado para ejecutarse cada hora

## Notas importantes

- El cron job se ejecutará automáticamente cada hora en Vercel
- Los datos se guardarán en Supabase
- La aplicación leerá los datos desde Supabase automáticamente
- El `.env` NO se sube a GitHub (está en `.gitignore`)

## Troubleshooting

### El cron job no se ejecuta
- Verifica que `vercel.json` esté en la raíz del proyecto
- Verifica que las variables de entorno estén configuradas
- Revisa los logs en Vercel → Deployments → Functions

### Error de build
- Verifica que todas las dependencias estén en `package.json`
- Revisa los logs de build en Vercel

### Error de conexión a Supabase
- Verifica que las variables de entorno estén configuradas correctamente
- Verifica que la tabla exista en Supabase
