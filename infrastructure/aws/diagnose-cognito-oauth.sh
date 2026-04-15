#!/usr/bin/env bash
# Muestra app client + IdP Microsoft (sin secretos). Util si el navegador termina en
# https://PREFIJO.auth.REGION.amazoncognito.com/error?...
#
# Uso:
#   export AWS_REGION=mx-central-1
#   export COGNITO_USER_POOL_ID=mx-central-1_fxal08nex
#   export COGNITO_CLIENT_ID=3teposqpjab3g9i7k7n2maaee3
#   ./infrastructure/aws/diagnose-cognito-oauth.sh
#
# Credenciales: el CLI debe poder llamar a Cognito (perfil IAM, access keys, o SSO).
# En EC2 sin rol IAM suele fallar: ejecuta el script en tu PC con `aws configure`, o
# asocia a la instancia un rol con cognito-idp:DescribeUserPoolClient y DescribeIdentityProvider.

set -euo pipefail

POOL="${COGNITO_USER_POOL_ID:-}"
CID="${COGNITO_CLIENT_ID:-}"
REGION="${AWS_REGION:-${COGNITO_REGION:-}}"
PROVIDER="${COGNITO_MICROSOFT_PROVIDER_NAME:-Microsoft}"

if [[ -z "$POOL" || -z "$CID" || -z "$REGION" ]]; then
  echo "Faltan COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID y AWS_REGION (o COGNITO_REGION)" >&2
  exit 1
fi

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "No hay credenciales de AWS configuradas en esta máquina (mensaje típico: Unable to locate credentials)." >&2
  echo "" >&2
  echo "Opciones:" >&2
  echo "  1) Ejecuta este script en tu computadora donde ya uses la consola/CLI de AWS (aws configure o aws sso login)." >&2
  echo "  2) En EC2: IAM → tu instancia → Modificar rol de IAM → asigna un rol con permisos de lectura a Cognito en $REGION." >&2
  echo "  3) Sin CLI: revisa en la consola AWS → Cognito → User pool → App client e Identity provider (Microsoft)." >&2
  exit 1
fi

echo "=== User pool client: $CID ==="
aws cognito-idp describe-user-pool-client \
  --region "$REGION" \
  --user-pool-id "$POOL" \
  --client-id "$CID" \
  --query 'UserPoolClient.{CallbackURLs:CallbackURLs,LogoutURLs:LogoutURLs,AllowedOAuthFlows:AllowedOAuthFlows,AllowedOAuthScopes:AllowedOAuthScopes,AllowedOAuthFlowsUserPoolClient:AllowedOAuthFlowsUserPoolClient,SupportedIdentityProviders:SupportedIdentityProviders}' \
  --output json

echo ""
echo "=== Identity provider: $PROVIDER (sin client_secret) ==="
aws cognito-idp describe-identity-provider \
  --region "$REGION" \
  --user-pool-id "$POOL" \
  --provider-name "$PROVIDER" \
  --query 'IdentityProvider.{ProviderType:ProviderType,ProviderDetails:ProviderDetails,AttributeMapping:AttributeMapping}' \
  --output json 2>/dev/null || echo "(No existe el proveedor '$PROVIDER' o sin permisos describe-identity-provider)"

echo ""
echo "Comprueba:"
echo "  - SupportedIdentityProviders incluye \"$PROVIDER\" (y Cognito si usas usuario/contraseña)."
echo "  - CallbackURLs incluye exactamente tu NEXT_PUBLIC_COGNITO_OAUTH_REDIRECT_URI (ej. https://lixylearning.zapto.org/auth/callback)."
echo "  - AllowedOAuthFlows incluye code; AllowedOAuthScopes incluye openid (y email, profile)."
echo "  - En Entra: redirect Web = https://PREFIJO.auth.REGION.amazoncognito.com/oauth2/idpresponse"
echo "  - ProviderDetails.oidc_issuer y client_id coinciden con Azure."
