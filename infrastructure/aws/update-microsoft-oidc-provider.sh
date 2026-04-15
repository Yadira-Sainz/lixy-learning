#!/usr/bin/env bash
# Reaplica el proveedor OIDC "Microsoft" en Cognito (AWS CLI). Util si la consola muestra endpoints vacios o tras rotar el secreto en Entra ID.
#
# Requisitos: aws CLI, credenciales con cognito-idp:UpdateIdentityProvider, python3.
#
# Uso desde la raíz del repo (ajusta variables o exporta antes):
#   export AWS_REGION=mx-central-1
#   export COGNITO_USER_POOL_ID=mx-central-1_fxal08nex
#   export AZURE_APP_CLIENT_ID=f99003fd-...   # Application (client) ID de Entra
#   export AZURE_CLIENT_SECRET='...' # Value del secreto (cuidado con caracteres especiales)
#   export AZURE_OIDC_ISSUER='https://login.microsoftonline.com/common/v2.0'   # opcional (default)
#   ./infrastructure/aws/update-microsoft-oidc-provider.sh
#
# Inquilino único (solo tu directorio): prueba
#   export AZURE_OIDC_ISSUER='https://login.microsoftonline.com/TU_TENANT_ID/v2.0'

set -euo pipefail

POOL_ID="${COGNITO_USER_POOL_ID:-}"
REGION="${AWS_REGION:-${COGNITO_REGION:-}}"
CLIENT_ID="${AZURE_APP_CLIENT_ID:-}"
SECRET="${AZURE_CLIENT_SECRET:-}"
ISSUER="${AZURE_OIDC_ISSUER:-https://login.microsoftonline.com/common/v2.0}"
PROVIDER_NAME="${COGNITO_MICROSOFT_PROVIDER_NAME:-Microsoft}"

if [[ -z "$POOL_ID" || -z "$REGION" || -z "$CLIENT_ID" || -z "$SECRET" ]]; then
  echo "Faltan variables: COGNITO_USER_POOL_ID, AWS_REGION (o COGNITO_REGION), AZURE_APP_CLIENT_ID, AZURE_CLIENT_SECRET" >&2
  exit 1
fi

DETAILS_JSON="$(
  AZURE_APP_CLIENT_ID="$CLIENT_ID" \
  AZURE_CLIENT_SECRET="$SECRET" \
  AZURE_OIDC_ISSUER="$ISSUER" \
  python3 <<'PY'
import json, os
print(json.dumps({
    "client_id": os.environ["AZURE_APP_CLIENT_ID"],
    "client_secret": os.environ["AZURE_CLIENT_SECRET"],
    "attributes_request_method": "GET",
    "oidc_issuer": os.environ["AZURE_OIDC_ISSUER"],
    "authorize_scopes": "openid email profile",
}))
PY
)"

echo "Actualizando proveedor OIDC '$PROVIDER_NAME' en pool $POOL_ID ($REGION)..."
aws cognito-idp update-identity-provider \
  --region "$REGION" \
  --user-pool-id "$POOL_ID" \
  --provider-name "$PROVIDER_NAME" \
  --provider-details "$DETAILS_JSON" \
  --attribute-mapping "email=email,username=sub"

echo "Listo. En el app client (Hosted UI) debe seguir marcado el proveedor '$PROVIDER_NAME'."
