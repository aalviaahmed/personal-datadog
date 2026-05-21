#!/usr/bin/env bash
# Builds the Next.js standalone bundle and packages it for Azure App Service.
# Output: dist/stock-summary-deploy.zip — ready to upload via Azure portal,
# `az webapp deploy`, or zip deploy.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Cleaning previous build"
rm -rf .next dist
mkdir -p dist

echo "==> Installing dependencies"
npm ci --no-audit --no-fund

echo "==> Building Next.js (standalone output)"
npm run build

echo "==> Staging static/ and public/ into standalone"
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "==> Zipping"
( cd .next/standalone && zip -r -q "$OLDPWD/dist/stock-summary-deploy.zip" . )

ls -lh dist/stock-summary-deploy.zip
echo "==> Done. Upload dist/stock-summary-deploy.zip to your Azure Web App."
