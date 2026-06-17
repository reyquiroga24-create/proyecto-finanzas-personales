#!/bin/bash

# ============================================
# FIELD REPORT PRO - SCRIPT DE DEPLOYMENT
# Para Hetzner con Docker
# ============================================

set -e

echo "╔════════════════════════════════════════╗"
echo "║  Field Report Pro - Deploy Script      ║"
echo "╚════════════════════════════════════════╝"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# FUNCIONES
# ============================================

log_info() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

check_command() {
  if ! command -v $1 &> /dev/null; then
    log_error "$1 no está instalado"
    return 1
  fi
  log_info "$1 instalado"
}

# ============================================
# MAIN
# ============================================

echo ""
echo "Selecciona el método de deployment:"
echo "1) Docker Compose (RECOMENDADO)"
echo "2) Node.js + PM2"
echo "3) Node.js + Systemd"
echo ""
read -p "Opción (1-3): " OPTION

case $OPTION in
  1)
    log_info "Instalando con Docker Compose..."

    # Verificar Docker
    check_command "docker" || {
      log_warn "Instalando Docker..."
      curl -fsSL https://get.docker.com -o get-docker.sh
      sh get-docker.sh
      rm get-docker.sh
    }

    check_command "docker-compose" || {
      log_warn "Instalando Docker Compose..."
      curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
      chmod +x /usr/local/bin/docker-compose
    }

    # Configurar .env
    if [ ! -f .env ]; then
      log_warn ".env no encontrado, copiando de .env.example"
      cp .env.example .env
      log_warn "Por favor edita .env con tus valores: nano .env"
      read -p "Presiona Enter cuando hayas terminado..."
    fi

    # Crear directorio de datos
    mkdir -p data
    chmod 755 data
    log_info "Directorio de datos creado"

    # Iniciar con Docker
    log_info "Iniciando contenedores..."
    docker-compose up -d

    sleep 5

    # Health check
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
      log_info "Aplicación en funcionamiento ✓"
      echo ""
      echo "╔════════════════════════════════════════╗"
      echo "║        DEPLOYMENT COMPLETADO           ║"
      echo "╚════════════════════════════════════════╝"
      echo ""
      echo "URL: http://localhost:3000"
      echo ""
      echo "Comandos útiles:"
      echo "  docker-compose logs -f        Ver logs"
      echo "  docker-compose ps             Ver estado"
      echo "  docker-compose down           Detener"
      echo ""
    else
      log_error "La aplicación no responde. Revisa los logs:"
      docker-compose logs
    fi
    ;;

  2)
    log_info "Instalando con Node.js + PM2..."

    # Verificar Node.js
    check_command "node" || {
      log_warn "Instalando Node.js..."
      curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
      apt install -y nodejs
    }

    check_command "npm" || {
      log_error "npm no está disponible"
      exit 1
    }

    # Instalar dependencias
    log_info "Instalando dependencias..."
    npm install --production

    # Instalar PM2 globalmente
    log_info "Instalando PM2..."
    npm install -g pm2

    # Configurar .env
    if [ ! -f .env ]; then
      cp .env.example .env
      log_warn "Edita .env con tus valores: nano .env"
      read -p "Presiona Enter cuando hayas terminado..."
    fi

    # Iniciar con PM2
    log_info "Iniciando aplicación con PM2..."
    pm2 start server.js --name "field-report-pro"
    pm2 save
    pm2 startup

    sleep 3

    log_info "Aplicación iniciada ✓"
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║        DEPLOYMENT COMPLETADO           ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    echo "URL: http://localhost:3000"
    echo ""
    echo "Comandos útiles:"
    echo "  pm2 logs field-report-pro     Ver logs"
    echo "  pm2 list                      Ver estado"
    echo "  pm2 stop field-report-pro     Detener"
    echo ""
    ;;

  3)
    log_info "Instalando con Node.js + Systemd..."

    # Verificar Node.js
    check_command "node" || {
      log_warn "Instalando Node.js..."
      curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
      apt install -y nodejs
    }

    # Instalar dependencias
    log_info "Instalando dependencias..."
    npm install --production

    # Configurar .env
    if [ ! -f .env ]; then
      cp .env.example .env
      log_warn "Edita .env con tus valores: nano .env"
      read -p "Presiona Enter cuando hayas terminado..."
    fi

    # Crear servicio
    log_info "Creando servicio systemd..."
    sudo tee /etc/systemd/system/field-report-pro.service > /dev/null << EOF
[Unit]
Description=Field Report Pro Application
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Activar servicio
    log_info "Activando servicio..."
    sudo systemctl daemon-reload
    sudo systemctl enable field-report-pro
    sudo systemctl start field-report-pro

    sleep 3

    # Verificar
    if sudo systemctl is-active field-report-pro > /dev/null; then
      log_info "Servicio activo ✓"
      echo ""
      echo "╔════════════════════════════════════════╗"
      echo "║        DEPLOYMENT COMPLETADO           ║"
      echo "╚════════════════════════════════════════╝"
      echo ""
      echo "URL: http://localhost:3000"
      echo ""
      echo "Comandos útiles:"
      echo "  journalctl -u field-report-pro -f    Ver logs"
      echo "  systemctl status field-report-pro     Ver estado"
      echo "  systemctl stop field-report-pro       Detener"
      echo ""
    else
      log_error "Servicio no está activo"
      journalctl -u field-report-pro -n 20
    fi
    ;;

  *)
    log_error "Opción no válida"
    exit 1
    ;;
esac

echo ""
echo "✅ Deployment completado con éxito"
echo ""
echo "Próximos pasos:"
echo "1. Configura tu dominio en DNS"
echo "2. Configura SSL con Let's Encrypt"
echo "3. Configura el webhook URL en .env"
echo "4. Revisa DEPLOY.md para instrucciones detalladas"
echo ""
