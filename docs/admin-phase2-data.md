# Fase 2: datos para soporte, analítica y monetización

Este documento acompaña el script opcional [`db/sql_scripts/admin_phase2_future.sql`](../db/sql_scripts/admin_phase2_future.sql).

## Objetivos

1. **Soporte**: historial de mensajes de contacto y tickets con estado (nuevo, en curso, cerrado).
2. **Analítica de producto**: eventos append-only (registro, login, inicio/fin de sesión, abandono de flujo) para embudos y cohortes.
3. **Monetización** (si aplica): planes, suscripciones y pagos enlazados a `users`.

## Orden sugerido de implementación

1. Crear tablas con el script SQL (en ventana de mantenimiento si hay tráfico).
2. Persistir envíos del endpoint de contacto en `support_contact_messages` (además de Resend).
3. Instrumentar el frontend/backend con inserciones en `product_events` (batch o async).
4. Integrar proveedor de pagos y poblar `subscriptions` / `payment_transactions`.

## Retención de datos

- `product_events`: particionar o purgar por antigüedad (p. ej. > 13 meses) según política.
- Mensajes de soporte: conservar según normativa local.
