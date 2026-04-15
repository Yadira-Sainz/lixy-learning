# Solución de problemas - Migración AWS LixyLearning

Problemas frecuentes y sus soluciones durante el despliegue en AWS.

---

## Conexión SSH

### Error: "Permission denied (publickey)"

**Causa:** Clave incorrecta o permisos del archivo .pem.

**Solución:**
```bash
chmod 400 lixy-key.pem
ssh -i lixy-key.pem ec2-user@<IP>
```

Si usas Windows con PuTTY, convierte el .pem a .ppk con PuTTYgen.

### Error: "Connection timed out"

**Causa:** Security Group no permite SSH desde tu IP, o la instancia está detenida.

**Solución:**
1. EC2 → Security Groups → Verificar que el puerto 22 esté abierto para "My IP"
2. Si tu IP cambió (internet dinámico), actualiza la regla con la nueva IP
3. Verifica que la instancia esté en estado "running"

---

## Docker

### Error: "permission denied" al ejecutar docker

**Causa:** El usuario no está en el grupo docker.

**Solución:**
```bash
sudo usermod -aG docker ec2-user
# Cerrar sesión y volver a conectar
```

### Los contenedores se detienen o fallan

**Causa:** t3.micro/t2.micro tiene solo 1GB RAM; puede ser insuficiente para 3 contenedores.

**Solución:**
1. Verificar logs: `docker-compose logs`
2. Reiniciar uno por uno: `docker-compose up -d postgres` (esperar), luego backend, luego frontend
3. Si persiste, considerar reducir memoria en docker-compose con límites

### Error: "Cannot connect to the Docker daemon"

**Solución:**
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Build del frontend termina con "Killed" (OOM)

**Causa:** La instancia t3.micro tiene solo 1GB RAM. El build de Next.js consume más memoria y el kernel mata el proceso (OOM Killer).

**Solución:** Crear un archivo swap en EC2 para dar memoria virtual durante el build:

```bash
# Crear swap de 2GB
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Hacerlo persistente tras reinicio
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verificar
free -h
```

Luego reconstruir: `docker-compose build --no-cache frontend`. El build será más lento pero debería completarse.

### Error: "Could not find a production build in the '.next' directory"

**Causa:** Next.js necesita `output: 'standalone'` para Docker. Sin ello, el directorio `.next` no se copia correctamente a la imagen final.

**Solución:**
1. En `frontend/next.config.mjs`, añadir `output: 'standalone'`
2. El `frontend/Dockerfile` debe usar el build standalone (multi-stage): copiar `.next/standalone`, `.next/static` y ejecutar `node server.js`
3. Reconstruir sin caché: `docker-compose build --no-cache frontend && docker-compose up -d`

### Los JS/CSS de `/_next/static` devuelven 404 o HTML; imágenes: "received text/html"

**Causa:** Con `output: 'standalone'`, el `server.js` hace `chdir` al directorio standalone y sirve los estáticos desde `.next/standalone/.next/static`. Tras `next build`, esa carpeta debe copiarse explícitamente (el proyecto ejecuta `node scripts/copy-standalone-assets.cjs` al final del `npm run build`).

**Solución:** Reconstruir el frontend (`docker compose up -d --build`). Si compilas en el host y `.next` quedó con permisos de root (p. ej. por Docker), ajusta: `sudo chown -R "$USER:$USER" frontend/.next` y vuelve a `npm run build` en `frontend/`.

---

## Base de datos

### Error: "connection refused" al conectar a PostgreSQL

**Causa:** El contenedor postgres no está listo o DATABASE_URL usa el host incorrecto.

**Solución:**
1. En Docker Compose, el host debe ser `postgres` (nombre del servicio), no `localhost`
2. Verificar: `DATABASE_URL=postgresql://postgres:PASSWORD@postgres:5432/lixylearning_db`
3. Esperar 30-60 segundos tras `docker-compose up` para que PostgreSQL inicialice

### Error: "relation does not exist"

**Causa:** La base de datos no se inicializó correctamente o los scripts SQL fallaron.

**Solución:**
```bash
docker-compose down -v  # Elimina volúmenes
docker-compose up -d
# Revisar logs: docker-compose logs postgres
```

### Error: "duplicate key value violates unique constraint vocabulary_pkey" en init

**Causa:** `init-db.sh` ejecutaba `db_ddl.sql` y `load-data.sh`, y el entrypoint de PostgreSQL también ejecutaba `load-data.sh`, cargando el vocabulario dos veces.

**Solución:** Ya corregido: `init-db.sh` fue removido del Dockerfile. Solo se ejecutan `db_ddl.sql` y `load-data.sh` una vez cada uno. Si usas una imagen antigua, reconstruir: `docker-compose build --no-cache postgres && docker-compose down -v && docker-compose up -d`.

### Error: PostgreSQL 18+ "pg_ctlcluster" / "unused mount/volume"

**Causa:** La imagen `postgres:latest` (PostgreSQL 18+) cambió el formato de datos. El volumen debe montarse en `/var/lib/postgresql` en lugar de `/var/lib/postgresql/data`.

**Solución:** En `docker-compose.yml`, cambiar:
```yaml
volumes:
  - postgres-data:/var/lib/postgresql  # no /data
```
Luego: `docker-compose down -v` y `docker-compose up -d`.

---

## Frontend / Backend

### El frontend no conecta al backend (CORS o 404)

**Causa:** `NEXT_PUBLIC_BACKEND_URL` incorrecto o no incluido en el build.

**Solución:**
1. La variable debe estar en .env **antes** del build
2. Debe incluir protocolo: `https://tu-dominio.duckdns.org` (sin barra final)
3. Reconstruir: `docker-compose build --no-cache frontend && docker-compose up -d`

### Error 502 Bad Gateway en Nginx

**Causa:** Los contenedores no están corriendo o Nginx apunta a puertos incorrectos.

**Solución:**
```bash
docker-compose ps  # Verificar que frontend (3000) y backend (5001) estén up
curl http://127.0.0.1:3000  # Probar localmente en EC2
```

---

## Web: "This site can't be reached" / ERR_CONNECTION_REFUSED

**Causa:** Nada escucha en el puerto 80/443, nginx está detenido, o el firewall bloquea la conexión.

**Diagnóstico (ejecutar en la EC2):**

```bash
# 1. ¿Nginx está corriendo?
sudo systemctl status nginx

# 2. ¿Algo escucha en el puerto 80?
sudo ss -tlnp | grep :80

# 3. ¿Nginx tiene errores de config?
sudo nginx -t
```

**Soluciones:**

1. **Si nginx no está corriendo:**
   ```bash
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

2. **Si nginx falla al iniciar:** Revisar logs y config:
   ```bash
   sudo journalctl -u nginx -n 30
   sudo nginx -t
   ```

3. **Si nginx está bien pero no conecta:** Verificar AWS Security Group:
   - EC2 → Instancia → Security → Security group
   - Inbound rules: debe haber reglas para puerto **80** (HTTP) y **443** (HTTPS) desde `0.0.0.0/0` o tu IP

4. **Verificar DNS:** `dig lixylearning.zapto.org +short` debe devolver la Elastic IP de tu EC2.

---

## SSL / Certbot

### Error: "amazon-linux-extras: command not found" o "No module named pip"

**Causa:** Amazon Linux 2023 no incluye `amazon-linux-extras` ni pip por defecto.

**Solución:** Instalar Certbot con pip:

```bash
sudo dnf install -y python3-pip
sudo python3 -m pip install certbot certbot-nginx
```

### Error: "Could not find a valid ACME account"

**Solución:**
```bash
sudo certbot register --agree-tos -m tu@email.com
```

### Error: "Challenge failed" o "Domain not found"

**Causa:** El dominio no apunta a la IP de tu EC2.

**Solución:**
1. Verificar en DuckDNS/No-IP que el registro A tenga la Elastic IP correcta
2. Esperar propagación DNS (hasta 5-10 minutos)
3. Probar: `dig tu-dominio.duckdns.org +short` o `dig lixylearning.zapto.org +short` debe devolver tu Elastic IP

### Certificado expirado

**Solución:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## APIs externas

### Error al generar oraciones/audio/imágenes

**Causa:** API keys faltantes, incorrectas o límites excedidos.

**Solución:**
1. Verificar que todas las variables estén en .env: GEMINI_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, PIXABAY_API_KEY
2. Revisar cuotas en las consolas de OpenAI, Google Cloud
3. Ver logs del backend: `docker-compose logs backend`

---

## Costos inesperados

### Recibir facturación de AWS

**Prevención:**
1. Configurar AWS Budgets con alerta
2. Apagar la instancia EC2 cuando no uses el demo: EC2 → Instance state → Stop
3. Las Elastic IPs no asociadas generan cargo; asociar siempre a una instancia
