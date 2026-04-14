# Configuración de AWS Cognito - LixyLearning

Esta guía describe cómo integrar AWS Cognito para autenticación en LixyLearning.

**Cognito en Free Tier:** Los User Pools de Cognito son gratuitos para los primeros 50.000 usuarios activos al mes (MAU). Suficiente para proyectos pequeños y medianos.

---

## Guía paso a paso para EC2 (Free Tier)

Si ya tienes LixyLearning corriendo en EC2 y quieres añadir Cognito, sigue estos pasos en orden.

**Checklist:**
- [ ] **A** Crear User Pool en AWS Console (desde tu PC)
- [ ] **B** Conectarte por SSH a EC2
- [ ] **C** Actualizar código (`git pull`)
- [ ] **D** Ejecutar migración SQL en PostgreSQL
- [ ] **E** Añadir variables de Cognito al `.env`
- [ ] **F** Reconstruir y reiniciar (`docker-compose up -d --build`)
- [ ] **G** Probar registro y login

### PARTE A: Crear el User Pool en la consola AWS (desde tu computadora)

#### A.1 Entrar a Cognito

1. Abre el navegador y ve a **https://console.aws.amazon.com**
2. Inicia sesión con tu cuenta AWS
3. En la barra de búsqueda, escribe **Cognito** y haz clic en **Amazon Cognito**
4. Verifica la **región** (esquina superior derecha). La que uses aquí debe coincidir con la que pongas en el `.env` (ej: `us-east-1`, `mx-central-1`).

#### A.2 Crear el User Pool (asistente rápido)

AWS ofrece un asistente rápido ("Get started for free in less than five minutes"). Los pasos se condensan; esto es lo que debes configurar:

1. Haz clic en **Create user pool** o en el botón naranja **Get started for free in less than five minutes**

2. En **Set up resources for your application:**
   - **Application type:** Elige **Single-page application (SPA)** (React, Angular, JavaScript)
   - **Name your application:** Escribe `LixyLearning`

3. En **Configure options** (o siguiente pantalla):
   - **Sign-in identifiers:** Marca solo **Email**
   - **Self-registration:** Dejar **Enable self-registration** activado
   - **Required attributes:** Puedes dejarlo vacío (el email ya es el identificador)
   - **Add a return URL:** Si solo usarás email/contraseña, puedes dejarlo vacío. Para **Google/Microsoft** (Hosted UI) necesitas un dominio de Cognito y URLs de callback; ver la sección [OAuth con Google y Microsoft](#oauth-con-google-y-microsoft) más abajo.

4. Haz clic en **Create user directory**

El wizard aplica valores por defecto para MFA, recuperación por email, envío de correos, etc. Si quieres revisarlos, sigue A.3.

#### A.3 Verificar configuración (obligatorio para evitar errores)

Después de crear el pool, entra al User Pool y revisa estos puntos:

1. **Applications → App clients**
   - Haz clic en tu app client (ej: LixyLearning)
   - **Authentication flows:** Debe tener marcado **ALLOW_USER_PASSWORD_AUTH**. Si no está, haz **Edit** y actívalo. Sin esto el login con email/contraseña fallará.
   - No debe tener **Client secret** (debe ser Public client)

2. **Authentication → Sign-up experience** (o similar)
   - **Password policy:** Si la app pide mínimo 6 caracteres, en Cognito pon al menos 6. Si Cognito exige 8, los usuarios que pongan 6 fallarán.

3. **Authentication → Sign-in experience**
   - **MFA:** Debe estar en **No MFA** (o compatible con tu uso)

4. Si usas **Mexico (Central)** u otra región: anota la región (ej: `mx-central-1`) porque la necesitarás exacta en el `.env`.

**Qué puede fallar si no verificas:**
| Si falta... | Síntoma |
|-------------|---------|
| ALLOW_USER_PASSWORD_AUTH | Error al hacer login: "Auth flow not enabled" o similar |
| Password policy demasiado estricta | "Password does not conform to policy" al registrarse |
| Región incorrecta en .env | "Invalid token" o timeout al validar |
| Client ID / User Pool ID mal copiados | "Invalid token" o "ResourceNotFoundException" |

#### A.4 Anotar los datos necesarios

1. En la pantalla del User Pool (Overview) verás **User pool ID** (ej: `mx-central-1_AbCdEfGhI`)
2. Ve a **Applications** → **App clients** → haz clic en tu app
3. Copia el **Client ID**

**Guarda estos tres valores para el `.env` en EC2:**
- **Región:** `mx-central-1`, `us-east-1`, etc. (la que uses)
- **User Pool ID:** `mx-central-1_XXXXXXXXX`
- **Client ID:** `xxxxxxxxxxxxxxxxxxxxxxxxxx`

---

### PARTE B: Conectarte a tu EC2 por SSH

1. Abre la Terminal (Mac/Linux) o PowerShell (Windows)
2. Conéctate con tu clave y la IP de tu EC2:

```bash
ssh -i ~/.ssh/lixy-key.pem ec2-user@TU-ELASTIC-IP
```

(Reemplaza `TU-ELASTIC-IP` con la IP elástica de tu instancia)

---

### PARTE C: En EC2 — Actualizar el código del proyecto

Si los cambios de Cognito están en GitHub, actualiza el código:

```bash
cd ~/lixy-learning
git fetch origin
git checkout feature/aws-cognito   # o main, según dónde hayas hecho merge
git pull origin feature/aws-cognito
```

**Si trabajaste todo en EC2** y el código ya está ahí, puedes saltarte esta parte.

---

### PARTE D: En EC2 — Ejecutar la migración de base de datos

Esto añade la columna `cognito_sub` a la tabla `users`:

```bash
cd ~/lixy-learning
docker exec -i lixylearning-postgres psql -U postgres -d lixylearning_db < db/sql_scripts/cognito_migration.sql
```

**Qué hace este comando:**
- `docker exec` ejecuta un comando dentro del contenedor de PostgreSQL
- `-i` permite enviar el archivo SQL como entrada
- `psql` es el cliente de PostgreSQL; lee el SQL y lo ejecuta

**Si ves errores:** Si dice que la columna ya existe, no pasa nada. Puedes continuar.

---

### PARTE E: En EC2 — Editar el archivo .env

1. Abre el archivo `.env`:
   ```bash
   nano ~/lixy-learning/.env
   ```

2. Añade estas líneas con **tus valores reales** (obtén User Pool ID y Client ID en Cognito → Applications → App clients):

   ```
   # AWS Cognito
   COGNITO_REGION=TU_REGION
   COGNITO_USER_POOL_ID=TU_USER_POOL_ID
   COGNITO_CLIENT_ID=TU_CLIENT_ID
   NEXT_PUBLIC_USE_COGNITO=true
   NEXT_PUBLIC_COGNITO_REGION=TU_REGION
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=TU_USER_POOL_ID
   NEXT_PUBLIC_COGNITO_CLIENT_ID=TU_CLIENT_ID

   # Solo si usas Google/Microsoft (Hosted UI OAuth):
   # COGNITO_DOMAIN=TU_PREFIJO_DOMINIO
   # COGNITO_OAUTH_REDIRECT_URI=https://tu-dominio/auth/callback
   # NEXT_PUBLIC_COGNITO_DOMAIN=TU_PREFIJO_DOMINIO
   # NEXT_PUBLIC_COGNITO_OAUTH_REDIRECT_URI=https://tu-dominio/auth/callback
   ```

   Reemplaza:
   - `TU_REGION` por tu región (ej: `mx-central-1`, `us-east-1`)
   - `TU_USER_POOL_ID` por el **User Pool ID** (ej: `mx-central-1_AbCdEfGhI`)
   - `TU_CLIENT_ID` por el **Client ID** (cadena alfanumérica larga)

3. Guardar en nano: `Ctrl+O`, Enter, luego `Ctrl+X` para salir.

---

### PARTE F: En EC2 — Reconstruir y reiniciar los contenedores

Las variables `NEXT_PUBLIC_*` se incorporan al frontend en el build, así que hay que reconstruir:

```bash
cd ~/lixy-learning
docker-compose down
docker-compose up -d --build
```

**Qué hace:**
- `docker-compose down` detiene y elimina los contenedores actuales
- `docker-compose up -d --build` reconstruye las imágenes (incluyendo las nuevas variables) y levanta todo en segundo plano

**Tiempo aproximado:** 2–5 minutos. El frontend tarda más porque hace un build completo.

---

### PARTE G: Probar que funciona

1. Abre en el navegador: `https://tu-dominio.duckdns.org` (o tu URL)
2. Ve a **Iniciar Sesión** o **Registrarse**
3. **Registro:** Completa el formulario, revisa el correo y mete el código de verificación
4. **Login:** Usa el mismo email y contraseña

Si todo va bien, deberías entrar al tablero como con el login normal.

---

### Si algo falla

| Problema | Qué revisar |
|----------|-------------|
| "Cognito is not configured" | Las variables `NEXT_PUBLIC_USE_COGNITO` y `NEXT_PUBLIC_COGNITO_*` están en el `.env` y el frontend se reconstruyó (`--build`) |
| "Invalid token" al hacer login | Que el **Client ID** y **User Pool ID** coincidan exactamente con lo de la consola de Cognito |
| No llega el correo de verificación | Revisa spam; en Cognito usa "Send email with Cognito" (sin SES) |
| Error al ejecutar la migración | Verifica que el contenedor `lixylearning-postgres` esté corriendo: `docker ps` |
| "Password does not conform to policy" al registrarse | Cognito exige mayúscula por defecto. Usa una contraseña con mayúscula (ej: `Test159!`) o en Cognito: User pool → Sign-in experience → Password policy → Desmarca "Require uppercase" si prefieres |
| Los botones Google/Microsoft no aparecen | Faltan `NEXT_PUBLIC_COGNITO_DOMAIN` y `NEXT_PUBLIC_COGNITO_OAUTH_REDIRECT_URI` (y el mismo `COGNITO_OAUTH_REDIRECT_URI` en backend), o el frontend no se reconstruyó |
| `redirect_uri does not match` o error en el callback | La URL de callback en `.env` debe ser **idéntica** a la configurada en Cognito (App client → Hosted UI) y usar `https` en producción |
| `Invalid identity provider` | En Cognito, anota el nombre exacto del proveedor (p. ej. `Google`, `Microsoft`) y, si difiere, usa `NEXT_PUBLIC_COGNITO_IDP_GOOGLE` / `NEXT_PUBLIC_COGNITO_IDP_MICROSOFT` |
| HTTP **400** en `*.amazoncognito.com/error?code=...` | Fallo **después** de Microsoft: Cognito no puede completar el intercambio con Entra. No compartas esa URL (lleva datos sensibles). Revisa **secreto de cliente** en Azure (Value actual) y vuelve a aplicarlo en Cognito (`infrastructure/aws/update-microsoft-oidc-provider.sh`). Ejecuta `infrastructure/aws/diagnose-cognito-oauth.sh` y confirma que el app client tiene **Microsoft** en `SupportedIdentityProviders`, **Authorization code grant** y la **callback** exacta. En Entra: **Token configuration** → claim opcional **email** en el ID token. |

---

## OAuth con Google y Microsoft

La app usa **OAuth 2.0 con PKCE**: al pulsar Google o Microsoft en tu web, el navegador va a Cognito y de ahí al proveedor; al volver, la ruta `/auth/callback` intercambia el código por el Id token.

### ¿Basta con configurar solo Google?

**No.** Google y **Microsoft son proveedores distintos**. Cada uno hay que darlo de alta en Cognito por separado (credenciales distintas: Google Cloud vs Microsoft Azure). Si solo añades Google, el botón Microsoft de la app **no** funcionará hasta que completes la configuración de Microsoft (y lo marques en el app client).

---

### Antes de nada (una sola vez por pool)

1. **Dominio de Cognito**  
   User pool → **Branding** → **Domain**: anota la URL base `https://TU-PREFIJO.auth.REGION.amazoncognito.com` (ya la tienes si aparece “Active”).

2. **Callback de tu aplicación**  
   App client **LixyLearning** → pestaña **Login pages** → **Edit** (Managed login pages) → **Allowed callback URLs** debe incluir **exactamente** la misma URL que en tu `.env`, por ejemplo `https://tu-dominio/auth/callback`.  
   **Authorization code grant** activado; scopes recomendados: `openid`, `email`, `profile`.

---

### Google — paso a paso

1. **Google Cloud Console** (https://console.cloud.google.com) → crea o elige un proyecto.

2. **APIs y servicios** → **Pantalla de consentimiento OAuth**: configura tipo **Externo** (o interno si solo Workspace), usuario de prueba si hace falta.

3. **Credenciales** → **Crear credenciales** → **ID de cliente OAuth** → tipo **Aplicación web**.

4. En **URIs de redireccionamiento autorizados** añade **solo** la URL que Cognito usa para hablar con Google (no es la de LixyLearning). Cognito te la muestra al configurar el proveedor; suele ser:
   ```text
   https://TU-PREFIJO.auth.REGION.amazoncognito.com/oauth2/idpresponse
   ```
   Sustituye `TU-PREFIJO` y `REGION` por los de tu dominio de Cognito (ej. `mx-central-1fxal08nex` y `mx-central-1`).

5. Copia **ID de cliente** y **Secreto del cliente**.

6. **AWS Cognito** → tu User pool → **Authentication** → **Social and external providers** → **Add identity provider** → elige **Google** → pega **Client ID** y **Client secret** → **Save**.

7. **Atributos (recomendado):** en el proveedor Google, revisa el mapeo de atributos (email, nombre) para que el email llegue al token.

8. **Activar Google en tu app client:**  
   **Applications** → **App clients** → **LixyLearning** → **Login pages** → **Edit** → en **Identity providers** marca **Google** (además de “Cognito user pool” si quieres email/contraseña) → **Save changes**.

9. En el `.env`, el nombre por defecto del proveedor en la URL es `Google`. Si Cognito mostrara otro nombre, usa `NEXT_PUBLIC_COGNITO_IDP_GOOGLE`.

---

### Microsoft — paso a paso (es independiente de Google)

Debes repetir un flujo parecido en **Microsoft Entra ID (Azure AD)** y luego en Cognito.

1. **Portal Azure** (https://portal.azure.com) → **Microsoft Entra ID** → **Registros de aplicaciones** → **Nuevo registro**.  
   - Nombre: ej. `LixyLearning Cognito`.  
   - **URI de redirección** → **Web**: pon la URL de Cognito para el IdP (igual que con Google):
   ```text
   https://TU-PREFIJO.auth.REGION.amazoncognito.com/oauth2/idpresponse
   ```

2. Anota **Id. de aplicación (cliente)** y en **Certificados y secretos** crea un **secreto de cliente** y cópialo.

3. Anota también el **Id. de directorio (inquilino)** si el asistente de Cognito lo pide.

4. **AWS Cognito** → **Social and external providers** → **Add identity provider**:
   - Si tu consola muestra la tarjeta **Microsoft** o **Microsoft Entra ID**, ábrela y sigue el asistente con Client ID, secret y tenant.
   - Si **no** aparece Microsoft como tarjeta, usa **OpenID Connect (OIDC)** y configura el emisor (issuer) y endpoints según [la documentación de AWS para registrar OIDC con Azure AD](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-oidc-idp.html). En la práctica muchas cuentas ya tienen el asistente **Microsoft** integrado.

5. **Activar Microsoft en el app client:** igual que con Google: **LixyLearning** → **Login pages** → **Edit** → **Identity providers** → marca **Microsoft** → guardar.

6. Variable de entorno: por defecto la app usa el nombre `Microsoft` en la URL (`NEXT_PUBLIC_COGNITO_IDP_MICROSOFT`). Debe coincidir con el **nombre del proveedor** que veas en Cognito en la lista de proveedores federados.

7. **Si tras iniciar sesión en Microsoft ves HTTP 400 en** `*.amazoncognito.com/error` **(pero el correo de consentimiento de Microsoft sí llegó):** el fallo es en Cognito al intercambiar el código con Entra, no en tu app. Revisa **Client secret** (Value en Azure, no el Secret ID), que el **app client** tenga marcado **Microsoft**, y el issuer recomendado para cuentas varias: `https://login.microsoftonline.com/common/v2.0`. En la consola de Cognito a veces **Authorization / Token / JWKS** se muestran como vacíos aunque el servicio use el documento de descubrimiento; puedes **forzar la misma configuración por CLI** con `infrastructure/aws/update-microsoft-oidc-provider.sh` (ver `infrastructure/aws/README.md`).

8. **Opcional en Entra:** Registro de aplicaciones → **Token configuration** → **Add optional claim** → **ID** → marca **email** para que el claim `email` vaya más a menudo en el token (útil con el mapeo `email` → `email` en Cognito).

---

### Resumen rápido

| Pregunta | Respuesta |
|----------|-----------|
| ¿Solo elijo Google en la pantalla y ya sirve para Microsoft? | **No.** Microsoft requiere registro en Azure + proveedor en Cognito + marcarlo en el app client. |
| ¿Misma callback URL en `.env` para ambos? | **Sí** (`https://tu-dominio/auth/callback`); es la URL de **tu web**, no la de Google/Microsoft. |
| ¿Dónde va la URL `...amazoncognito.com/oauth2/idpresponse`? | En **Google Cloud** y en **Azure**, como URI de redirección de **su** aplicación OAuth. |

### Variables de entorno (además de las de Cognito ya usadas)

En el **backend** y el **frontend** la URL de callback debe coincidir **carácter por carácter**:

```
COGNITO_DOMAIN=TU_PREFIJO_DOMINIO
COGNITO_OAUTH_REDIRECT_URI=https://tu-dominio/auth/callback

NEXT_PUBLIC_COGNITO_DOMAIN=TU_PREFIJO_DOMINIO
NEXT_PUBLIC_COGNITO_OAUTH_REDIRECT_URI=https://tu-dominio/auth/callback
```

Opcional, si en Cognito los proveedores tienen otro nombre:

```
NEXT_PUBLIC_COGNITO_IDP_GOOGLE=Google
NEXT_PUBLIC_COGNITO_IDP_MICROSOFT=Microsoft
```

Tras cambiar variables `NEXT_PUBLIC_*`, reconstruye el frontend (`docker-compose up -d --build` o `npm run build`).

### Comportamiento en la app

- Tras el primer inicio con Google/Microsoft, el perfil se crea en PostgreSQL usando el **email y nombre** del Id token y los **dos primeros idiomas** de la tabla `languages` como idioma nativo y de aprendizaje por defecto. El usuario puede cambiarlos después en ajustes si la app lo permite.

---

## Resumen (referencia rápida)

Con Cognito integrado:
- **Login y Signup** se gestionan con AWS Cognito
- **Perfil de la app** (idiomas, puntos, etc.) sigue en PostgreSQL
- El Id Token de Cognito se usa como Bearer token en las llamadas API
- Compatibilidad con usuarios existentes (JWT tradicional) si no se activa Cognito

## Paso 1: Crear el User Pool en AWS

### Opción A: CloudFormation

```bash
aws cloudformation create-stack \
  --stack-name lixylearning-cognito \
  --template-body file://infrastructure/aws/cognito-user-pool.yaml
```

Obtén los valores de salida:
```bash
aws cloudformation describe-stacks --stack-name lixylearning-cognito --query 'Stacks[0].Outputs'
```

### Opción B: Consola AWS

1. Ve a **Cognito** → **Create user pool**
2. **Sign-in options:** Email
3. **Password policy:** Mínimo 6 caracteres (sin mayúsculas/números obligatorios si prefieres)
4. **MFA:** Off
5. **User account recovery:** Email only
6. **Required attributes:** email
7. **App integration:** Crea un app client
   - **Auth flows:** ALLOW_USER_PASSWORD_AUTH, ALLOW_REFRESH_TOKEN_AUTH, ALLOW_USER_SRP_AUTH
   - **Client secret:** No (Generate secret: false)

Anota: **User Pool ID**, **Client ID**, **Region**

## Paso 2: Ejecutar migración de base de datos

```bash
docker exec -i lixylearning-postgres psql -U postgres -d lixylearning_db < db/sql_scripts/cognito_migration.sql
```

## Paso 3: Variables de entorno

### Backend (.env)

```env
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Frontend (.env.local o .env)

```env
NEXT_PUBLIC_USE_COGNITO=true
NEXT_PUBLIC_COGNITO_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Importante:** Las variables `NEXT_PUBLIC_*` se embeben en el build. Tras cambiarlas, ejecuta `npm run build` de nuevo.

**Docker:** Si usas docker-compose, añade las variables Cognito al `env_file` y como build args del frontend en docker-compose:

```yaml
frontend:
  build:
    args:
      NEXT_PUBLIC_BACKEND_URL: ${NEXT_PUBLIC_BACKEND_URL}
      NEXT_PUBLIC_USE_COGNITO: ${NEXT_PUBLIC_USE_COGNITO:-false}
      NEXT_PUBLIC_COGNITO_REGION: ${NEXT_PUBLIC_COGNITO_REGION}
      NEXT_PUBLIC_COGNITO_USER_POOL_ID: ${NEXT_PUBLIC_COGNITO_USER_POOL_ID}
      NEXT_PUBLIC_COGNITO_CLIENT_ID: ${NEXT_PUBLIC_COGNITO_CLIENT_ID}
```

## Paso 4: Reiniciar servicios

```bash
docker-compose down && docker-compose up -d --build
```

## Flujo de usuario

### Registro (Cognito)
1. Usuario completa el formulario de signup
2. Cognito envía un código de verificación al email
3. Usuario ingresa el código
4. Se crea el usuario en Cognito y se sincroniza el perfil en PostgreSQL
5. Redirección al tablero

### Login (Cognito)
1. Usuario ingresa email y contraseña
2. Cognito autentica y devuelve Id Token
3. Token se guarda en localStorage
4. Todas las llamadas API usan `Authorization: Bearer <Id Token>`

## Migración de usuarios existentes

Los usuarios que ya tienen cuenta con JWT tradicional siguen funcionando. El backend acepta ambos tipos de token:
- **Legacy:** JWT firmado con JWT_SECRET (payload con `userId`)
- **Cognito:** Id Token de Cognito (payload con `sub`); se resuelve a `userId` vía `cognito_sub` en la base de datos

Para vincular un usuario existente a Cognito: que se registre en Cognito con el mismo email. El endpoint `/api/cognito/sync-profile` detectará el email existente y actualizará `cognito_sub`.

## Limitaciones conocidas

- **Cambio de contraseña:** Usuarios Cognito deben cambiar la contraseña desde la flujo de Cognito (Forgot password)
- **Cambio de email:** No soportado para usuarios solo-Cognito desde el formulario de perfil

## Desactivar Cognito

1. Quitar o vaciar `NEXT_PUBLIC_USE_COGNITO` en frontend
2. Reconstruir el frontend
3. La app volverá a usar `/login` y `/register` tradicionales
