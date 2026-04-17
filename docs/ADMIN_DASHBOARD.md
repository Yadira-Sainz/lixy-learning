# Panel de administración

## Rutas

- **Frontend**: `/admin` (menú de usuario → «Administración» solo si el backend marca `isAdmin`).
- **API**: prefijo `/api/admin/` en el servicio FastAPI.

En `/admin`, el botón **Comprobar acceso admin** vuelve a llamar a `GET /api/admin/me` (mismo token); no renueva el JWT. **Recargar datos** actualiza las métricas (`/overview`, `/learning`, `/engagement`).

## Acceso (RBAC)

1. Configura en el **backend** (mismas variables en Docker/EC2 que en `main`):

   - `ADMIN_EMAILS`: lista separada por comas; se compara con `users.email` (sin distinguir mayúsculas/minúsculas).
   - `ADMIN_USER_IDS`: lista de `user_id` numéricos permitidos.

2. Si **ninguna** está definida, nadie es administrador (comportamiento seguro por defecto).

3. Los endpoints agregados (`/overview`, `/learning`, `/engagement`) exigen además JWT/Cognito válido (`get_current_user`).

## KPIs

Ver [admin-kpis.md](./admin-kpis.md).

## Evolución (fase 2)

Tablas opcionales y notas en [admin-phase2-data.md](./admin-phase2-data.md) y `db/sql_scripts/admin_phase2_future.sql`.
