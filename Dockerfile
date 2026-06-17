# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Instalar dumb-init para manejo de señales
RUN apk add --no-cache dumb-init

# Usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar dependencias desde builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules /app/node_modules

# Copiar aplicación
COPY --chown=nodejs:nodejs . .

# Cambiar a usuario nodejs
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Puerto
EXPOSE 3000

# Ejecutar con dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
