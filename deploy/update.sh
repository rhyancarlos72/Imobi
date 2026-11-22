#!/usr/bin/env bash
# Atualiza o app com a última versão do GitHub, sem derrubar o site.
# Uso: bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
npm ci
npm run build
pm2 reload imobi
echo "Atualizado: $(git log -1 --format='%h %s')"
