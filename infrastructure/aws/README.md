# Infraestructura AWS - LixyLearning

Plantillas y referencias para desplegar LixyLearning en AWS.

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `ec2-staging-cloudformation.yaml` | Plantilla CloudFormation para EC2 staging (t3.micro + Security Group) |
| `cognito-user-pool.yaml` | Plantilla CloudFormation para Cognito User Pool (autenticación) |
| `update-microsoft-oidc-provider.sh` | Reaplica el IdP OIDC **Microsoft** (client id, secreto, issuer, scopes) por CLI |
| `diagnose-cognito-oauth.sh` | Muestra callbacks, OAuth flows y proveedor Microsoft del User Pool (sin secretos) |

Ver [docs/COGNITO_SETUP.md](../../docs/COGNITO_SETUP.md) para la guía de integración con Cognito.

## Recursos creados por la plantilla

- **Security Group** `launch-wizard-1`: Puertos 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (Frontend), 5001 (Backend)
- **EC2 Instance** `lixylearning-staging`: t3.micro, Amazon Linux, 20 GB gp3, par de claves `lixy-key`

## Requisitos previos

- Par de claves `lixy-key` creado en AWS (EC2 → Key Pairs)
- AMI y SnapshotId pueden variar por región; ajustar si despliegas en otra región

## Despliegue

### Opción 1: AWS CLI

```bash
aws cloudformation create-stack \
  --stack-name lixylearning-staging \
  --template-body file://ec2-staging-cloudformation.yaml
```

### Opción 2: Consola AWS

1. CloudFormation → Create stack → With new resources
2. Upload a template file → Seleccionar `ec2-staging-cloudformation.yaml`
3. Siguiente → Revisar parámetros → Create stack

## Notas

- **VpcId:** El valor por defecto (`vpc-090dcea1681694dd1`) es específico de la cuenta/región donde se creó originalmente. En otra cuenta, usa el parámetro o tu VPC por defecto.
- **ImageId / SnapshotId:** Pueden cambiar según la región. Para us-east-1 (N. Virginia), verifica el AMI actual de Amazon Linux 2023.
- **CreditSpecification:** `unlimited` evita que la instancia se pause cuando se agotan los créditos de CPU (t3.micro).
