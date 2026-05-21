#!/bin/bash
set -e

# --- Configurations ---
IMAGE_NAME="asia-southeast1-docker.pkg.dev/juara-luxtrace/luxtrace/web"
REGION="asia-southeast1"
SERVICE_NAME="luxtrace-web"
WEB_DIR="/home/beta/Desktop/juaravibecoding-luxtrace/luxtrace-web"

echo "=== STEP 1: Reading configuration from luxtrace-web/.env ==="
if [ -f "$WEB_DIR/.env" ]; then
    # Load .env file variables
    export $(grep -v '^#' "$WEB_DIR/.env" | xargs)
    echo "✓ Loaded environment variables successfully."
else
    echo "✗ Error: .env file not found at $WEB_DIR/.env"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
    echo "✗ Error: NEXT_PUBLIC_APP_URL is not defined in .env"
    exit 1
fi

echo "=== STEP 2: Building Docker Image ==="
echo "Building with NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL"
cd "$WEB_DIR"

docker build \
  --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  -t "$IMAGE_NAME:latest" .

echo "=== STEP 3: Pushing Docker Image ==="
docker push "$IMAGE_NAME:latest"

echo "=== STEP 4: Deploying to Google Cloud Run ==="
# We update the image. Cloud Run automatically retains all existing environment variables
# that were previously set on the service.
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE_NAME:latest" \
  --region="$REGION" \
  --platform="managed"

echo "=== DEPLOYMENT COMPLETE! ==="
echo "Live URL: $NEXT_PUBLIC_APP_URL"
