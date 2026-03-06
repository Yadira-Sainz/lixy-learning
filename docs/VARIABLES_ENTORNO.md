# Variables de entorno - LixyLearning

Documentación de todas las variables de entorno requeridas para el proyecto. **Nunca** subas archivos `.env` con valores reales a Git.

## Resumen rápido

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| NEXT_PUBLIC_BACKEND_URL | Sí | URL pública del backend (frontend) |
| NEXT_PUBLIC_FRONTEND_URL | Sí | URL pública del frontend |
| DATABASE_URL | Sí | Cadena de conexión PostgreSQL |
| POSTGRES_USER | Sí | Usuario de PostgreSQL |
| POSTGRES_PASSWORD | Sí | Contraseña de PostgreSQL |
| POSTGRES_DB | Sí | Nombre de la base de datos |
| JWT_SECRET | Sí | Secreto para tokens JWT |
| GEMINI_API_KEY | Sí | API key de Google Gemini |
| OPENAI_API_KEY | Sí | API key de OpenAI |
| GOOGLE_API_KEY | Sí | API key de Google (Text-to-Speech) |
| PIXABAY_API_KEY | Sí | API key de Pixabay (imágenes para flashcards) |

---

## Detalle por variable

### Frontend (Next.js)

#### NEXT_PUBLIC_BACKEND_URL
- **Uso:** Todas las llamadas API desde el frontend
- **Formato:** URL completa con protocolo, sin barra final
- **Ejemplos:**
  - Local: `http://localhost:5001`
  - Producción: `https://lixylearning.duckdns.org`
- **Nota:** Se embebe en el build; cambiar requiere reconstruir el frontend

#### NEXT_PUBLIC_FRONTEND_URL
- **Uso:** URLs de redirección o referencias al frontend
- **Formato:** Misma que NEXT_PUBLIC_BACKEND_URL si usas reverse proxy

---

### Base de datos

#### DATABASE_URL
- **Uso:** Conexión desde el backend a PostgreSQL
- **Formato:** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
- **En Docker Compose:** El host es el nombre del servicio: `postgres`
- **Ejemplo:** `postgresql://postgres:mi_password@postgres:5432/lixylearning_db`

#### POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
- **Uso:** Inicialización del contenedor PostgreSQL y scripts
- **Deben coincidir** con los valores en DATABASE_URL

---

### Autenticación

#### JWT_SECRET
- **Uso:** Firma y verificación de tokens JWT
- **Generar:** `openssl rand -base64 32`
- **Seguridad:** Usar un valor largo y aleatorio; nunca el valor por defecto en producción

---

### APIs externas

#### GEMINI_API_KEY
- **Uso:** Google Gemini para generación de contenido
- **Obtener:** [Google AI Studio](https://makersuite.google.com/app/apikey)

#### OPENAI_API_KEY
- **Uso:** OpenAI GPT para oraciones, traducciones, historias
- **Obtener:** [OpenAI Platform](https://platform.openai.com/api-keys)

#### GOOGLE_API_KEY
- **Uso:** Google Text-to-Speech (síntesis de voz)
- **Obtener:** [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

#### PIXABAY_API_KEY
- **Uso:** Búsqueda de imágenes para flashcards de vocabulario (API gratuita)
- **Obtener:** [Pixabay API](https://pixabay.com/api/docs/) — Regístrate gratis y obtén tu API key

---

## Archivos de ejemplo

- **Desarrollo local:** Ver `.env` (no versionado)
- **Producción:** Copiar `.env.production.example` a `.env` y completar valores
