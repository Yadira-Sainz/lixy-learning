# Variables de entorno - LixyLearning

Documentación de todas las variables de entorno requeridas para el proyecto. **Nunca** subas archivos `.env` con valores reales a Git.

## Resumen rápido

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| NEXT_PUBLIC_BACKEND_URL | Sí | URL pública del backend (frontend) |
| NEXT_PUBLIC_FRONTEND_URL | Sí | URL pública del frontend |
| NEXT_PUBLIC_CONTACT_EMAIL | Opcional | Reservada; la sección Contacto no muestra correo en pantalla |
| CONTACT_TO_EMAIL | Recomendada | Destino de los mensajes del formulario |
| RESEND_API_KEY | Recomendada | API key de [Resend](https://resend.com) para el formulario de contacto |
| RESEND_FROM_EMAIL | Recomendada | Remitente verificado en Resend (ej. `LixyLearning <onboarding@resend.dev>` en pruebas) |
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

## Docker Compose

El proyecto corre en contenedores. Después de editar `.env`, aplica los cambios reiniciando los servicios:

```bash
docker-compose restart
```

Para reiniciar solo algunos servicios (por ejemplo backend y frontend):

```bash
docker-compose restart backend frontend
```

Las variables `NEXT_PUBLIC_*` se fijan en el **build** del frontend. Si cambias una de ellas (por ejemplo `NEXT_PUBLIC_CONTACT_EMAIL`) y no ves el valor nuevo tras el reinicio, reconstruye la imagen del frontend:

```bash
docker-compose up -d --build frontend
```

Si solo cambias variables del **backend** (por ejemplo Resend), basta con `docker-compose restart backend` (o `docker-compose up -d --build backend` si añadiste dependencias).

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

#### NEXT_PUBLIC_CONTACT_EMAIL
- **Uso:** Opcional; el frontend **no** la muestra actualmente en la página de contacto. **El envío del formulario** lo hace el backend con la **API de Resend**.
- **Formato:** Dirección válida, sin comillas (ej: `contacto@tudominio.org`).
- **Nota:** Variable `NEXT_PUBLIC_*` (build del frontend). Puedes omitirla.

#### Formulario de contacto (backend, [Resend](https://resend.com))

El visitante envía el formulario y el backend llama a la **API HTTP de Resend** ([guía Python](https://resend.com/docs/send-with-python)). **No usa SMTP**, Cognito ni SES.

1. Crea cuenta en Resend y una **API key** ([api-keys](https://resend.com/api-keys)).
2. **Remitente:** verifica un dominio o usa el remitente de prueba que indique Resend (p. ej. `onboarding@resend.dev` para pruebas).
3. Configura en `.env`:

| Variable | Descripción |
|----------|-------------|
| `RESEND_API_KEY` | API key (secreto; solo en el servidor) |
| `RESEND_FROM_EMAIL` | Remitente: `Nombre <correo@dominio-verificado.com>` o el que Resend permita en pruebas |
| `CONTACT_TO_EMAIL` | Correo donde recibes los mensajes del formulario |

Tras configurar: `docker-compose up -d --build backend` (para instalar el paquete `resend`) y luego `docker-compose restart backend` si solo cambias el `.env`.

**Límite de prueba de Resend:** con la cuenta gratuita y **sin dominio verificado**, Resend solo deja enviar correos **al mismo email con el que abriste la cuenta** (aparece en el error del backend). Para que funcione el formulario sin tocar DNS:

- Pon `CONTACT_TO_EMAIL` **igual** a ese correo (ej. tu Gmail de la cuenta Resend).

Para recibir los mensajes en **otro** buzón (ej. Outlook) o en `contacto@tudominio.com`:

1. En [resend.com/domains](https://resend.com/domains) pulsa **Add domain** y sigue los registros **DNS** (TXT/CNAME) que te indiquen en tu proveedor de dominio (DuckDNS no sirve como dominio de correo; hace falta un dominio propio o uno que permita DNS).
2. Cuando el dominio quede **verificado**, cambia `RESEND_FROM_EMAIL` a algo como `LixyLearning <contacto@tudominio.com>`.
3. Entonces `CONTACT_TO_EMAIL` puede ser cualquier dirección permitida por tu plan (revisa límites en el panel de Resend).

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
- **Uso:** Firma y verificación de tokens JWT (autenticación tradicional)
- **Generar:** `openssl rand -base64 32`
- **Seguridad:** Usar un valor largo y aleatorio; nunca el valor por defecto en producción

#### AWS Cognito (opcional)
Si usas Cognito para autenticación, configura estas variables en **backend** y **frontend**:

| Variable (Backend) | Variable (Frontend) | Descripción |
|-------------------|---------------------|-------------|
| COGNITO_REGION | NEXT_PUBLIC_COGNITO_REGION | Región AWS (ej: us-east-1) |
| COGNITO_USER_POOL_ID | NEXT_PUBLIC_COGNITO_USER_POOL_ID | ID del User Pool |
| COGNITO_CLIENT_ID | NEXT_PUBLIC_COGNITO_CLIENT_ID | Client ID de la app |
| - | NEXT_PUBLIC_USE_COGNITO | `true` para activar Cognito en frontend |

Ver [docs/COGNITO_SETUP.md](COGNITO_SETUP.md) para la guía completa.

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
