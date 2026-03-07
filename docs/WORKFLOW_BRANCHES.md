# Flujo de trabajo con ramas - LixyLearning

## Estructura de ramas

```
main (producción)
  ↑ merge cuando todo está validado
develop (integración / testing)
  ↑ merge después de probar
feature/* (trabajo en progreso)
```

## Ramas actuales

| Rama | Propósito |
|------|-----------|
| **main** | Código en producción. Solo recibe merges desde develop. |
| **develop** | Integración y pruebas. Recibe merges de feature branches. |
| **feature/aws-migration** | Cambios para migración a AWS (docker-compose, docs). |

## Flujo para la migración AWS

### Estado actual

- Los cambios de migración están en `feature/aws-migration`
- Rama subida a GitHub: `origin/feature/aws-migration`

### Pasos siguientes

1. **Merge a develop** (para probar):
   ```bash
   git checkout develop
   git merge feature/aws-migration
   git push origin develop
   ```

2. **Probar en develop**:
   - Ejecutar `docker-compose up --build` localmente
   - Verificar que frontend, backend y base de datos funcionen
   - Revisar que la documentación sea correcta

3. **Merge a main** (cuando todo funcione):
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

### Alternativa: Pull Request en GitHub

1. Crear PR: `feature/aws-migration` → `develop`
2. Revisar y aprobar
3. Merge en GitHub
4. Probar en develop
5. Crear PR: `develop` → `main` (según restricciones del CI/CD)
6. Merge a main cuando esté validado

## Comandos útiles

```bash
# Ver ramas
git branch -a

# Cambiar de rama
git checkout develop
git checkout feature/aws-migration

# Crear nueva feature branch desde develop
git checkout develop
git pull origin develop
git checkout -b feature/nombre-descriptivo

# Ver diferencias entre ramas
git diff develop..feature/aws-migration
```
