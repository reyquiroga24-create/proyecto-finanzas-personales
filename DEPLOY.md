# 🚀 GUÍA DE DEPLOYMENT EN HETZNER

## Opción 1: Docker (RECOMENDADO)

### Requisitos
- Servidor Hetzner con Ubuntu 20.04 LTS o superior
- SSH acceso
- Docker instalado

### Pasos

#### 1. Conectarse al servidor
```bash
ssh root@your-server-ip
```

#### 2. Actualizar sistema
```bash
apt update && apt upgrade -y
apt install -y curl git
```

#### 3. Instalar Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker root

# Verificar instalación
docker --version
docker-compose --version
```

#### 4. Clonar repositorio
```bash
cd /opt
git clone https://github.com/tu-usuario/proyecto-finanzas-personales.git
cd proyecto-finanzas-personales
```

#### 5. Configurar variables de entorno
```bash
cp .env.example .env
nano .env

# Editar:
WEBHOOK_URL=tu_webhook_url_aqui
APP_URL=https://tu-dominio.com
```

#### 6. Crear carpeta de datos
```bash
mkdir -p data
chmod 755 data
```

#### 7. Iniciar aplicación con Docker Compose
```bash
docker-compose up -d

# Verificar estado
docker-compose ps
docker-compose logs -f
```

#### 8. Verificar que funciona
```bash
curl http://localhost:3000/health
```

---

## Opción 2: Node.js Directo

### Requisitos
- Node.js 18+ instalado
- npm 9+

### Pasos

#### 1. Instalar Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Verificar
node --version
npm --version
```

#### 2. Clonar y configurar
```bash
cd /opt
git clone https://github.com/tu-usuario/proyecto-finanzas-personales.git
cd proyecto-finanzas-personales

cp .env.example .env
nano .env
```

#### 3. Instalar dependencias
```bash
npm install --production
```

#### 4. Instalar PM2 para supervisión
```bash
npm install -g pm2

# Iniciar aplicación
pm2 start server.js --name "field-report-pro"
pm2 save
pm2 startup
```

#### 5. Verificar
```bash
pm2 logs field-report-pro
curl http://localhost:3000/health
```

---

## Opción 3: Nginx + Systemd

### Pasos

#### 1. Instalar Nginx
```bash
apt install -y nginx

# Habilitar en boot
systemctl enable nginx
```

#### 2. Crear configuración Nginx
```bash
cat > /etc/nginx/sites-available/field-report-pro << 'EOF'
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    
    # Redirect HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    # Compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    gzip_min_length 1000;

    # Seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy hacia Node.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache para archivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
```

#### 3. Habilitar sitio
```bash
ln -s /etc/nginx/sites-available/field-report-pro /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### 4. SSL con Let's Encrypt
```bash
apt install -y certbot python3-certbot-nginx
certbot certonly --nginx -d tu-dominio.com -d www.tu-dominio.com
```

#### 5. Crear servicio Systemd
```bash
cat > /etc/systemd/system/field-report-pro.service << 'EOF'
[Unit]
Description=Field Report Pro Application
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/proyecto-finanzas-personales
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

#### 6. Iniciar servicio
```bash
systemctl daemon-reload
systemctl enable field-report-pro
systemctl start field-report-pro
systemctl status field-report-pro
```

---

## 🔒 Configuración de Seguridad

### Firewall
```bash
apt install -y ufw

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### Certificado SSL Auto-renew
```bash
# Let's Encrypt
certbot renew --dry-run
# Automático cada día via cron
```

### Monitoreo
```bash
# Instalar Prometheus + Grafana (opcional)
docker run -d --name prometheus prom/prometheus
```

---

## 📊 Monitoreo y Logs

### Docker
```bash
# Ver logs
docker-compose logs -f app

# Ver recursos
docker stats
```

### PM2
```bash
# Ver estado
pm2 list
pm2 logs field-report-pro

# Monitorear
pm2 monit
```

### Systemd
```bash
# Ver logs
journalctl -u field-report-pro -f

# Ver estado
systemctl status field-report-pro
```

---

## 🔄 Actualizar Aplicación

### Docker
```bash
cd /opt/proyecto-finanzas-personales
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Node.js
```bash
cd /opt/proyecto-finanzas-personales
git pull origin main
npm install
pm2 restart field-report-pro
```

### Systemd
```bash
cd /opt/proyecto-finanzas-personales
git pull origin main
npm install
systemctl restart field-report-pro
```

---

## 🆘 Troubleshooting

### Puerto en uso
```bash
# Ver qué está usando el puerto
lsof -i :3000

# Matar proceso
kill -9 <PID>
```

### Permisos
```bash
# Ajustar permisos
chmod -R 755 /opt/proyecto-finanzas-personales
chown -R nodejs:nodejs /opt/proyecto-finanzas-personales
```

### Memoria
```bash
# Ver consumo
free -h
ps aux --sort=-%mem | head -10
```

### Logs de error
```bash
# Docker
docker-compose logs --tail=100 app

# PM2
pm2 logs --lines=100

# Systemd
journalctl -u field-report-pro --no-pager -n 100
```

---

## ✅ Checklist Post-Deploy

- [ ] Servidor accesible desde internet
- [ ] HTTPS funcionando
- [ ] Health check `/health` retorna 200
- [ ] API `/api/info` responde
- [ ] App carga en navegador
- [ ] Puede crear reportes
- [ ] LocalStorage funciona
- [ ] Offline mode funciona
- [ ] Webhooks se envían correctamente
- [ ] Logs se guardan correctamente
- [ ] Auto-renew SSL configurado
- [ ] Backups configurados (opcional)

---

## 📞 Soporte

Para problemas o preguntas:
1. Revisar logs
2. Verificar configuración en `.env`
3. Consultar documentación oficial de Hetzner
4. Abrir issue en GitHub

---

**Versión**: 1.0.0  
**Última actualización**: 2024-01-15  
**Autor**: Field Report Pro Team
