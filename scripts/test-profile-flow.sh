#!/bin/bash
# Test profile flow: register, login, get profile, upload image
# Usage: ./scripts/test-profile-flow.sh [BASE_URL]
# Default BASE_URL: http://localhost:5001

BASE_URL="${1:-http://localhost:5001}"
EMAIL="test_e2e_$(date +%s)@test.local"
PASS="TestPass123!"

echo "=== 1. Register ==="
REG=$(curl -s -X POST "$BASE_URL/register" -H "Content-Type: application/json" \
  -d "{\"first_name\":\"Test\",\"last_name\":\"User\",\"username\":\"testuser_e2e\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"age\":25,\"gender\":\"other\",\"country\":\"MX\",\"native_language\":2,\"learning_language\":1}")
TOKEN=$(echo "$REG" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
[ -z "$TOKEN" ] && { echo "Register failed: $REG"; exit 1; }
echo "OK - User: $EMAIL"

echo "=== 2. Login ==="
LOGIN=$(curl -s -X POST "$BASE_URL/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
[ -z "$TOKEN" ] && { echo "Login failed: $LOGIN"; exit 1; }
echo "OK"

echo "=== 3. Get profile ==="
PROFILE=$(curl -s "$BASE_URL/api/user/profile" -H "Authorization: Bearer $TOKEN")
echo "$PROFILE" | head -c 200
echo "..."

echo "=== 4. Upload profile image ==="
# Minimal 1x1 PNG
echo 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 -d > /tmp/test_avatar.png
UPLOAD=$(curl -s -X POST "$BASE_URL/api/upload-profile-image" -H "Authorization: Bearer $TOKEN" -F "image=@/tmp/test_avatar.png")
echo "$UPLOAD"
[[ "$UPLOAD" == *"profile_image_url"* ]] && echo "OK" || { echo "Upload failed"; exit 1; }

echo "=== 5. Verify image served ==="
URL=$(echo "$UPLOAD" | grep -o '"profile_image_url":"[^"]*"' | cut -d'"' -f4)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/uploads/$URL")
[ "$STATUS" = "200" ] && echo "OK - $BASE_URL/uploads/$URL returns 200" || echo "FAIL - status $STATUS"

echo ""
echo "=== Test credentials (for manual testing) ==="
echo "Email: $EMAIL"
echo "Password: $PASS"
