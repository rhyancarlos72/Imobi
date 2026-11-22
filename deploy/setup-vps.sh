#!/usr/bin/env bash
# Configura uma VPS Ubuntu (22.04/24.04) para rodar o Imobi Studio.
# Uso (dentro da pasta do app, como root):
#   bash deploy/setup-vps.sh seudominio.com.br seu@email.com
set -euo pipefail

DOMAIN="${1:?Informe o domínio. Ex.: bash deploy/setup-vps.sh imobi.com.br voce@email.com}"
EMAIL="${2:?Informe um e-mail (usado no certificado SSL)}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT=3000

echo "==> Pasta do app: $APP_DIR"
[ -f "$APP_DIR/package.json" ] || { echo "package.json não encontrado"; exit 1; }
[ -f "$APP_DIR/.env.local" ] || { echo "Crie o arquivo $APP_DIR/.env.local antes (veja .env.example)"; exit 1; }

echo "==> Atualizando o sistema e instalando pacotes"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx ufw certbot python3-certbot-nginx ca-certificates

echo "==> Instalando Node.js 22"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v
command -v pm2 >/dev/null || npm install -g pm2

echo "==> Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Instalando dependências e gerando o build"
cd "$APP_DIR"
npm ci
npm run build

echo "==> Iniciando o app com PM2"
pm2 delete imobi >/dev/null 2>&1 || true
PORT=$PORT pm2 start npm --name imobi -- start
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null

echo "==> Configurando o Nginx"
cat > /etc/nginx/sites-available/imobi <<NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/imobi /etc/nginx/sites-enabled/imobi
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Certificado SSL (HTTPS)"
if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" -m "$EMAIL" --agree-tos -n --redirect; then
  echo "HTTPS ativo."
else
  echo "AVISO: o SSL falhou. Confira se o DNS de $DOMAIN e www.$DOMAIN aponta para o IP desta VPS e rode:"
  echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN -m $EMAIL --agree-tos --redirect"
fi

echo
echo "Pronto! Acesse https://$DOMAIN"
echo "Logs do app: pm2 logs imobi"
