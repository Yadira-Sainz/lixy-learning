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
- Acceso a las API keys: Gemini, OpenAI, Google (TTS y Custom Search)
- Cliente SSH en tu computadora (Terminal en Mac/Linux, PuTTY en Windows)

---

## 2. Opciones de dominio y DNS gratuitos

Para tener HTTPS con Let's Encrypt necesitas un nombre de dominio. Opciones sin costo:

| Servicio | URL ejemplo | Notas |
|----------|-------------|-------|
| **DuckDNS** | `lixylearning.duckdns.org` | Subdominio gratis, actualización automática de IP |
| **No-IP** | `lixylearning.ddns.net` | Similar a DuckDNS, ya lo conoces |
| **nip.io** | `52.1.2.3.nip.io` | Usa tu IP directamente, sin registro. No recomendado para SSL |

**Recomendación:** Usa DuckDNS o No-IP. Ambos permiten obtener certificados SSL gratuitos con Let's Encrypt.

### Configurar DuckDNS (ejemplo)

1. Ve a [duckdns.org](https://www.duckdns.org)
2. Inicia sesión con tu cuenta (Google/GitHub)
3. Crea un subdominio (ej: `lixylearning`)
4. Anota tu token para actualización automática
5. Una vez tengas la Elastic IP de EC2, actualiza el registro con esa IP

---

## 3. Fase 1: Crear instancia EC2

### 3.1 Acceder a la consola AWS

1. Inicia sesión en [console.aws.amazon.com](https://console.aws.amazon.com)
2. Selecciona la región más cercana (ej: `us-east-1` - N. Virginia)

### 3.2 Lanzar la instancia

1. Ve a **EC2** → **Instances** → **Launch instance**
2. Configura:
   - **Name:** `lixylearning-prod`
   - **AMI:** Amazon Linux 2023
   - **Instance type:** t2.micro (Free tier eligible)
   - **Key pair:** Create new → nombre `lixy-key` → Descargar y guardar el archivo `.pem`
   - **Network settings:** Edit → Create security group:
     - SSH (22): My IP
     - HTTP (80): Anywhere (0.0.0.0/0)
     - HTTPS (443): Anywhere (0.0.0.0/0)
     - Custom TCP 3000: Anywhere (para pruebas sin Nginx)
     - Custom TCP 5001: Anywhere (para pruebas sin Nginx)
   - **Storage:** 20 GB gp2
3. Click **Launch instance**

### 3.3 Obtener la IP pública

En la lista de instancias, anota la **Public IPv4 address** (cambiará al reiniciar hasta que asignes Elastic IP).

---

## 4. Fase 2: Conectar y preparar la instancia

### 4.1 Conectar por SSH

```bash
# Dar permisos al archivo de clave
chmod 400 ~/Downloads/lixy-key.pem

# Conectar (reemplaza con tu IP pública)
ssh -i ~/Downloads/lixy-key.pem ec2-user@<TU-IP-PUBLICA>
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

### 4.3 Instalar Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version  # Verificar instalación
```

---

## 5. Fase 3: Configurar Elastic IP y DNS

### 5.1 Asignar Elastic IP

1. EC2 → **Elastic IPs** → **Allocate Elastic IP address** → Allocate
2. Selecciona la IP → **Actions** → **Associate Elastic IP address**
3. Elige tu instancia `lixylearning-prod` → Associate

La IP ya no cambiará al reiniciar la instancia.

### 5.2 Actualizar DNS (DuckDNS/No-IP)

Actualiza tu subdominio con la nueva Elastic IP en el panel de DuckDNS o No-IP.

---

## 6. Fase 4: Desplegar la aplicación

### 6.1 Clonar el repositorio

```bash
cd ~
git clone https://github.com/Yadira-Sainz/lixy-learning.git
cd lixy-learning
```

### 6.2 Crear archivo .env

```bash
cp .env.production.example .env
nano .env  # o vi .env
```

Edita y reemplaza todos los valores con tus credenciales reales. **No uses valores de ejemplo en producción.**

Variables críticas:
- `NEXT_PUBLIC_BACKEND_URL`: `https://tu-dominio.duckdns.org` (o tu subdominio)
- `DATABASE_URL`: `postgresql://postgres:TU_PASSWORD@postgres:5432/lixylearning_db`
- Todas las API keys

### 6.3 Construir y ejecutar

```bash
docker-compose up -d --build
```

### 6.4 Verificar

- Frontend: `http://<TU-IP>:3000`
- Backend: `http://<TU-IP>:5001`

Si todo funciona, continúa con Nginx para HTTPS.

---

## 7. Fase 5: Configurar Nginx y SSL (HTTPS)

### 7.1 Instalar Nginx y Certbot

```bash
sudo yum install nginx -y
sudo amazon-linux-extras install epel -y
sudo yum install certbot python3-certbot-nginx -y
```

### 7.2 Configurar Nginx como reverse proxy

Crea el archivo de configuración:

```bash
sudo nano /etc/nginx/conf.d/lixylearning.conf
```

Contenido (reemplaza `tu-dominio.duckdns.org`):

```nginx
server {
    listen 80;
    server_name tu-dominio.duckdns.org;

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

### 7.3 Obtener certificado SSL

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo certbot --nginx -d tu-dominio.duckdns.org
```

Sigue las instrucciones (email, aceptar términos). Certbot configurará HTTPS automáticamente.

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
