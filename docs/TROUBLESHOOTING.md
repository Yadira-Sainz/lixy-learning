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

### Error: "Could not find a production build in the '.next' directory"

**Causa:** El build de Next.js no incluyó devDependencies o la imagen usó caché corrupta.

**Solución:**
1. En `frontend/Dockerfile`, usar `RUN npm install` (no `--production`) para que el build tenga TypeScript, etc.
2. Reconstruir sin caché: `docker-compose build --no-cache frontend`

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

## SSL / Certbot

### Error: "Could not find a valid ACME account"

**Solución:**
```bash
sudo certbot register --agree-tos -m tu@email.com
```

### Error: "Challenge failed" o "Domain not found"

**Causa:** El dominio no apunta a la IP de tu EC2.

**Solución:**
1. Verificar en DuckDNS/No-IP que el registro tenga la Elastic IP correcta
2. Esperar propagación DNS (hasta 5-10 minutos)
3. Probar: `nslookup tu-dominio.duckdns.org` debe devolver tu IP

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
1. Verificar que todas las variables estén en .env: GEMINI_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, SEARCH_ENGINE_ID
2. Revisar cuotas en las consolas de OpenAI, Google Cloud
3. Ver logs del backend: `docker-compose logs backend`

---

## Costos inesperados

### Recibir facturación de AWS

**Prevención:**
1. Configurar AWS Budgets con alerta
2. Apagar la instancia EC2 cuando no uses el demo: EC2 → Instance state → Stop
3. Las Elastic IPs no asociadas generan cargo; asociar siempre a una instancia
