# Manual de Migración a AWS - LixyLearning

Este manual describe el proceso paso a paso para migrar LixyLearning desde un servidor local a la infraestructura en la nube de AWS, utilizando únicamente recursos del Free Tier para mantener el costo en $0.

## Tabla de contenidos

1. [Requisitos previos](#1-requisitos-previos)
2. [Opciones de dominio y DNS gratuitos](#2-opciones-de-dominio-y-dns-gratuitos)
3. [Fase 1: Crear instancia EC2](#3-fase-1-crear-instancia-ec2)
4. [Fase 2: Conectar y preparar la instancia](#4-fase-2-conectar-y-preparar-la-instancia)
5. [Fase 3: Configurar Elastic IP y DNS](#5-fase-3-configurar-elastic-ip-y-dns)
6. [Fase 4: Desplegar la aplicación](#6-fase-4-desplegar-la-aplicación)
7. [Fase 5: Configurar Nginx y SSL (HTTPS)](#7-fase-5-configurar-nginx-y-ssl-https)
8. [Fase 6: Migración de datos](#8-fase-6-migración-de-datos)
9. [Fase 7: Monitoreo de costos](#9-fase-7-monitoreo-de-costos)
10. [Solución de problemas](#10-solución-de-problemas)

---

## 1. Requisitos previos

- Cuenta de AWS (Free Tier con créditos)
- Par de claves SSH (se creará en el proceso)
- Acceso a las API keys: Gemini, OpenAI, Google (TTS), Pixabay (imágenes)
- Cliente SSH en tu computadora (Terminal en Mac/Linux, PuTTY en Windows)

---

## 2. Opciones de dominio y DNS gratuitos

Para tener HTTPS con Let's Encrypt necesitas un nombre de dominio. Opciones sin costo:

| Servicio | URL ejemplo | Notas |
|----------|-------------|-------|
| **DuckDNS** | `lixylearning.duckdns.org` | Subdominio gratis, actualización automática de IP |
| **No-IP** | `lixylearning.zapto.org` | Similar a DuckDNS, dominios como .zapto.org, .ddns.net |
| **nip.io** | `52.1.2.3.nip.io` | Usa tu IP directamente, sin registro. No recomendado para SSL |

**Recomendación:** Usa DuckDNS o No-IP. Ambos permiten obtener certificados SSL gratuitos con Let's Encrypt.

### Configurar DuckDNS (ejemplo)

1. Ve a [duckdns.org](https://www.duckdns.org)
2. Inicia sesión con tu cuenta (Google/GitHub)
3. Crea un subdominio (ej: `lixylearning`)
4. Anota tu token para actualización automática
5. Una vez tengas la Elastic IP de EC2, actualiza el registro con esa IP

### Configurar No-IP (ejemplo)

1. Ve a [my.noip.com](https://www.noip.com) e inicia sesión
2. Entra a **DDNS & Remote Access** → **DNS Records**
3. Haz clic en **Create Hostname** (o edita uno existente)
4. Configura:
   - **Type:** A
   - **Host:** `lixylearning` (o el nombre que prefieras)
   - **IPv4:** Tu Elastic IP de EC2
   - **Enable Dynamic DNS:** Actívalo solo si tu IP cambia (no necesario con Elastic IP)
5. Guarda. Tu dominio será `lixylearning.zapto.org` (o el subdominio que elijas)

---

## 3. Fase 1: Crear instancia EC2

Esta sección te guía paso a paso para crear tu primera instancia EC2 en AWS. Si es tu primer uso de AWS, sigue cada paso con cuidado.

---

### 3.1 Acceder a la consola AWS

1. Abre tu navegador y ve a: **https://console.aws.amazon.com**
2. Inicia sesión con tu cuenta de AWS (email y contraseña)
3. Una vez dentro, verás el panel principal. En la esquina superior derecha verás la **región** actual (ej: "N. Virginia", "Ohio"). Puedes dejarla o cambiarla haciendo clic ahí. Para México, **us-east-1 (N. Virginia)** suele dar buen rendimiento.

---

### 3.2 Ir al servicio EC2

1. En la barra de búsqueda superior (donde dice "Search for services, features, etc."), escribe: **EC2**
2. Haz clic en **EC2** (aparecerá como "Amazon Elastic Compute Cloud" o similar)
3. Llegarás al **Dashboard de EC2**. Verás un menú lateral izquierdo con opciones como "Instances", "Security Groups", etc.

---

### 3.3 Iniciar la creación de una instancia

1. En el panel central, busca el botón naranja **"Launch instance"** (o "Iniciar instancia") y haz clic
2. Se abrirá una pantalla con varios pasos de configuración. Sigue cada uno:

---

### 3.4 Paso 1: Nombre y etiquetas

1. En el campo **"Name and tags"** (Nombre y etiquetas), en la fila "Name", escribe:
   ```
   lixylearning-staging
   ```
   (Usa `-staging` para pruebas; para producción usarías `lixylearning-prod`)

---

### 3.5 Paso 2: Imagen de aplicación (AMI)

1. En **"Application and OS Images"** (Imágenes de aplicación y SO):
   - Deja **"Quick Start"** seleccionado
   - En la lista, selecciona **Amazon Linux**
   - En la versión, elige **Amazon Linux 2023** (AMI)
   - No cambies la arquitectura (64-bit x86)

---

### 3.6 Paso 3: Tipo de instancia

1. En **"Instance type"** (Tipo de instancia):
   - Haz clic en el desplegable
   - Busca y selecciona **t3.micro** (o **t2.micro** si aparece; en algunas regiones solo está t3.micro)
   - Debe aparecer la etiqueta **"Free tier eligible"** (elegible para capa gratuita)
   - **t3.micro** tiene 2 vCPU y 1 GB de RAM — suficiente y recomendado para tu proyecto

---

### 3.7 Paso 4: Par de claves (Key pair) — MUY IMPORTANTE

El par de claves te permite conectarte por SSH a tu servidor. **Guarda el archivo .pem en un lugar seguro; sin él no podrás acceder a la instancia.**

1. En **"Key pair (login)"**:
   - Haz clic en **"Create new key pair"** (Crear nuevo par de claves)
2. Se abrirá un cuadro de diálogo:
   - **Key pair name:** escribe `lixy-key`
   - **Key pair type:** deja **RSA**
   - **Private key format:** si usas **Mac o Linux**, elige **.pem**; si usas **Windows con PuTTY**, elige **.ppk**
3. Haz clic en **"Create key pair"**
4. Se descargará un archivo `lixy-key.pem` (o `lixy-key.ppk`). **Guárdalo en una carpeta segura** (ej: `~/Downloads` o `Documentos`). No lo compartas ni lo subas a internet.

---

### 3.8 Paso 5: Configuración de red (Security Group)

1. Haz clic en **"Edit"** (Editar) junto a "Network settings"
2. En **"Security group name"**, puedes dejar el nombre por defecto (`launch-wizard-1`) o cambiarlo a `lixy-sg` para identificarlo mejor
3. En **"Inbound security group rules"** (Reglas de entrada), verás una regla SSH por defecto:
   - **Regla 1 (SSH):** Por defecto viene con **Source type: Anywhere** (0.0.0.0/0). AWS mostrará una advertencia amarilla indicando que esto permite acceso desde cualquier IP.
   - **Importante:** Cambia **Source type** a **"My IP"** para que solo tu computadora pueda conectarse por SSH. Esto es más seguro.
   - Si usas "My IP", el campo **Source** se llenará automáticamente con tu IP actual
4. Haz clic en **"Add security group rule"** para añadir las reglas restantes. Configura:

   | Tipo        | Puerto | Source type | Source      | Descripción                    |
   |-------------|--------|-------------|-------------|--------------------------------|
   | SSH         | 22     | My IP       | (automático)| Para conectarte por SSH        |
   | HTTP        | 80     | Anywhere    | 0.0.0.0/0   | Tráfico web                    |
   | HTTPS       | 443    | Anywhere    | 0.0.0.0/0   | Tráfico web seguro             |
   | Custom TCP  | 3000   | Anywhere    | 0.0.0.0/0   | Frontend (pruebas sin Nginx)   |
   | Custom TCP  | 5001   | Anywhere    | 0.0.0.0/0   | Backend (pruebas sin Nginx)    |

5. Para cada regla nueva:
   - **Type:** elige HTTP, HTTPS o Custom TCP
   - **Port range:** para Custom TCP escribe `3000` o `5001`
   - **Source type:** "My IP" solo para SSH; "Anywhere" para el resto
   - **Source:** si eliges Anywhere, aparecerá `0.0.0.0/0`
6. **Nota:** Si tu IP de internet cambia (ej: reinicias el router), tendrás que actualizar la regla SSH o usar temporalmente "Anywhere" para poder conectarte

---

### 3.9 Paso 6: Almacenamiento

1. En **"Configure storage"** (Configurar almacenamiento):
   - **Size (GiB):** cambia a **20** (el mínimo suele ser 8, 20 da margen)
   - **Type:** deja **gp2** (General Purpose SSD)
   - No añadas más volúmenes

---

### 3.10 Paso 7: Resumen y lanzamiento

1. Revisa el **resumen** en el panel derecho (número de instancias: 1, tipo t3.micro, etc.)
2. Haz clic en el botón naranja **"Launch instance"** (Iniciar instancia)
3. Verás un mensaje de éxito: "Successfully initiated launch of instance"
4. Haz clic en **"Connect to instance"** o en el ID de la instancia (ej: `i-0abc123...`) para ir a la lista

---

### 3.11 Obtener la IP pública

1. En el menú lateral, haz clic en **"Instances"** (Instancias)
2. Verás tu instancia `lixylearning-staging`. Puede tardar 1-2 minutos en pasar de "Pending" a "Running"
3. Selecciona la instancia (marca la casilla)
4. En el panel inferior, en la pestaña **"Details"** (Detalles), busca:
   - **Public IPv4 address** — anótala (ej: `54.123.45.67`). Esta es la IP que usarás para conectarte por SSH
   - **Public IPv4 DNS** — opcional, es el nombre DNS que AWS asigna (ej: `ec2-54-123-45-67.compute-1.amazonaws.com`)

**Nota:** Esta IP cambiará cada vez que detengas y reinicies la instancia, hasta que asignes una Elastic IP (Fase 3).

---

### 3.12 Alternativa: Desplegar con CloudFormation

Si prefieres usar Infrastructure as Code, existe una plantilla CloudFormation en `infrastructure/aws/ec2-staging-cloudformation.yaml` que crea la misma configuración (EC2 t3.micro + Security Group). Ver `infrastructure/aws/README.md` para instrucciones.

---

### 3.13 Resumen de lo que creaste

- Una instancia EC2 con Amazon Linux 2023
- Tipo t3.micro (Free Tier, 2 vCPU, 1 GB RAM)
- 20 GB de almacenamiento
- Par de claves `lixy-key.pem` para SSH
- Reglas de firewall que permiten SSH, HTTP, HTTPS y los puertos 3000 y 5001

---

## 4. Fase 2: Conectar y preparar la instancia

### 4.1 Conectar por SSH

```bash
# Dar permisos al archivo de clave
chmod 400 ~/.ssh/lixy-key.pem

# Conectar (reemplaza con tu IP pública)
ssh -i ~/.ssh/lixy-key.pem ec2-user@<TU-IP-PUBLICA>
```

### 4.2 Instalar Docker

```bash
sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
```

**Importante:** Cierra la sesión SSH y vuelve a conectar para que el grupo `docker` se aplique.

### 4.3 Instalar Docker Compose y Buildx

```bash
# Docker Compose (standalone)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Buildx (requerido por docker-compose v5+ para builds)
mkdir -p ~/.docker/cli-plugins
curl -SL https://github.com/docker/buildx/releases/download/v0.19.3/buildx-v0.19.3.linux-amd64 -o ~/.docker/cli-plugins/docker-buildx
chmod +x ~/.docker/cli-plugins/docker-buildx

docker-compose --version  # Verificar
docker buildx version     # Debe ser 0.17.0 o superior
```

---

## 5. Fase 3: Configurar Elastic IP y DNS

### 5.1 Asignar Elastic IP

1. En el menú lateral de EC2, haz clic en **"Elastic IPs"** (debajo de "Network & Security")
2. Haz clic en **"Allocate Elastic IP address"** (Asignar dirección IP elástica)
3. En la ventana que aparece, haz clic en **"Allocate"**
4. Se creará una nueva IP. Selecciónala (marca la casilla)
5. Haz clic en **"Actions"** → **"Associate Elastic IP address"**
6. En el desplegable **"Instance"**, elige tu instancia (`lixylearning-staging` o `lixylearning-prod`)
7. Haz clic en **"Associate"**

La IP ya no cambiará al reiniciar la instancia. Usa esta IP para configurar DuckDNS o No-IP.

### 5.2 Actualizar DNS (DuckDNS/No-IP)

Actualiza tu subdominio con la nueva Elastic IP en el panel de DuckDNS o No-IP.

**Verificar que el DNS resuelve correctamente** (antes de ejecutar Certbot):

```bash
dig tu-dominio.duckdns.org +short   # o lixylearning.zapto.org
# Debe devolver tu Elastic IP
```

---

## 6. Fase 4: Desplegar la aplicación

### 6.1 Instalar Git

Amazon Linux no incluye Git por defecto. Instálalo antes de clonar:

```bash
sudo yum install git -y
git --version  # Verificar instalación (ej: git version 2.40.0)
```

### 6.2 Clonar el repositorio

```bash
cd ~
git clone https://github.com/Yadira-Sainz/lixy-learning.git
cd lixy-learning
```

**Si es ambiente de staging (pruebas):** cambia a la rama que quieres probar:
```bash
git checkout feature/aws-migration
# o, cuando hagas merge: git checkout develop
```

**Si es ambiente de producción:** la rama `main` es la predeterminada al clonar; no necesitas cambiar.

### 6.3 Crear archivo .env

```bash
cp .env.production.example .env
nano .env  # o vi .env
```

Edita y reemplaza todos los valores con tus credenciales reales. **No uses valores de ejemplo en producción.**

Variables críticas:
- `NEXT_PUBLIC_BACKEND_URL`: `https://tu-dominio.duckdns.org` o `https://lixylearning.zapto.org` (según tu proveedor DNS)
- `NEXT_PUBLIC_FRONTEND_URL`: misma URL que el backend si usas reverse proxy
- `DATABASE_URL`: `postgresql://postgres:TU_PASSWORD@postgres:5432/lixylearning_db`
- Todas las API keys

### 6.4 Construir y ejecutar

```bash
docker-compose up -d --build
```

### 6.5 Verificar

- Frontend: `http://<TU-IP>:3000`
- Backend: `http://<TU-IP>:5001`

Si todo funciona, continúa con Nginx para HTTPS.

---

## 7. Fase 5: Configurar Nginx y SSL (HTTPS)

### 7.1 Instalar Nginx y Certbot

**Nota:** En Amazon Linux 2023 no existe `amazon-linux-extras`. Usa pip para instalar Certbot:

```bash
sudo dnf install nginx -y
sudo dnf install -y python3-pip
sudo python3 -m pip install certbot certbot-nginx
```

### 7.2 Configurar Nginx como reverse proxy

Crea el archivo de configuración:

```bash
sudo nano /etc/nginx/conf.d/lixylearning.conf
```

O copia desde el repo:

```bash
sudo cp conf/nginx-lixylearning.conf /etc/nginx/conf.d/lixylearning.conf
# Ajusta server_name si usas otro dominio
```

Contenido (reemplaza con tu dominio: `lixylearning.duckdns.org`, `lixylearning.zapto.org`, etc.):

```nginx
server {
    listen 80;
    server_name lixylearning.zapto.org;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /audios {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location ~ ^/(register|login|languages|user-details) {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Verificar y reiniciar Nginx:**

```bash
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 7.3 Obtener certificado SSL

Let's Encrypt es **gratuito**. Certbot obtiene y renueva el certificado automáticamente:

```bash
sudo certbot --nginx -d lixylearning.zapto.org
```

(Reemplaza con tu dominio real)

Sigue las instrucciones (email, aceptar términos). Certbot configurará HTTPS automáticamente.

**Después del certificado:** Actualiza el `.env` con las URLs HTTPS y reinicia la aplicación:

```bash
# En .env: NEXT_PUBLIC_BACKEND_URL=https://tu-dominio
#          NEXT_PUBLIC_FRONTEND_URL=https://tu-dominio
cd ~/lixy-learning
docker-compose down && docker-compose up -d --build
```

### 7.4 Renovación automática

Certbot configura un cron para renovar. Verificar:

```bash
sudo certbot renew --dry-run
```

---

## 8. Fase 6: Migración de datos

Si tienes datos en tu base de datos local que deseas migrar:

### 8.1 Exportar desde local

```bash
# En tu máquina local (con Docker corriendo)
docker exec lixylearning-postgres pg_dump -U postgres lixylearning_db > backup.sql
```

### 8.2 Copiar a EC2

```bash
scp -i ~/Downloads/lixy-key.pem backup.sql ec2-user@<ELASTIC-IP>:/home/ec2-user/
```

### 8.3 Restaurar en EC2

```bash
# En EC2
cd ~/lixy-learning
docker exec -i lixylearning-postgres psql -U postgres -d lixylearning_db < ~/backup.sql
```

---

## 9. Fase 7: Monitoreo de costos

### 9.1 Crear presupuesto con alertas

1. AWS Console → **Billing** → **Budgets** → Create budget
2. Cost budget → $10 mensual
3. Configurar alerta al 80% de uso
4. Agregar tu email para notificaciones

### 9.2 Revisar uso

- **Cost Explorer:** Billing → Cost Explorer
- **Free Tier:** Billing → Free Tier para ver consumo

---

## 10. Solución de problemas

Consulta [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) para problemas comunes.
