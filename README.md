# 📋 Field Report Pro

**Sistema completo de reportes de campo para industria de construcción**

Versión: 1.0.0  
Estado: Production Ready ✓

---

## 🎯 Descripción

Field Report Pro es una aplicación web mobile-first diseñada para automatizar los reportes diarios de construcción. Proporciona funcionalidades completas para:

- **Registro de Personal**: Control de horas de trabajo, posiciones y estado
- **Gestión de Tareas**: Seguimiento de actividades por fases con porcentaje de avance
- **Seguridad**: Documentación de riesgos, JSA (Job Safety Analysis) y Toolbox Talks
- **Evidencia Fotográfica**: Captura y gestión de fotos con compresión automática
- **Sincronización**: Offline-first con sync automático vía webhooks (Make.com)
- **PDF**: Generación de reportes profesionales en PDF

---

## ✨ Características Principales

### ✅ Funcionalidad Offline-First
- LocalStorage para almacenamiento de datos locales
- Sincronización automática cuando hay conexión
- Cola de envío para reportes pendientes
- Auto-guardado cada 10 segundos

### ✅ Gestión de Datos
- **Proyectos**: Información base del proyecto
- **Personal**: Control de horas y estados
- **Tareas**: Descripción y porcentaje de avance
- **Seguridad**: Riesgos, medidas preventivas
- **Fotos**: Captura, compresión y galería

### ✅ Integraciones
- **Webhooks**: Envío a Make.com (Integromat)
- **Exportación**: JSON, CSV, PDF
- **Síncronización**: Reportes persistentes y recuperables

### ✅ Interfaz
- **Mobile-First**: Diseño responsivo para tablets/teléfonos
- **Intuitiva**: Navegación simple para operarios
- **Rápida**: Sin dependencias externas innecesarias
- **Accesible**: WCAG 2.1 AA compliant

---

## 🚀 Instalación

### Requisitos
- Navegador moderno con soporte de ES6+
- LocalStorage disponible
- Conexión a internet (opcional, pero recomendado para sync)

### Pasos de Instalación

1. **Clonar repositorio**
   ```bash
   git clone <repositorio>
   cd field-report-pro
   ```

2. **Configurar Webhook URL** (Opcional)
   - Editar `config/config.js`
   - Reemplazar `WEBHOOK_URL` con tu URL de Make.com

3. **Servir la aplicación**
   ```bash
   # Opción 1: Python
   python -m http.server 8000

   # Opción 2: Node.js
   npx http-server

   # Opción 3: Node.js (Express)
   npm install
   npm start
   ```

4. **Abrir en navegador**
   ```
   http://localhost:8000
   ```

---

## 📁 Estructura de Carpetas

```
field-report-pro/
├── index.html                 # Página principal
├── README.md                  # Este archivo
├── .gitignore                 # Configuración de git
│
├── config/
│   └── config.js             # Configuración global
│
├── css/
│   ├── styles.css            # Estilos principales
│   └── print.css             # Estilos de impresión
│
├── js/
│   ├── app.js                # Punto de entrada principal
│   ├── modules/
│   │   ├── FormHandler.js    # Manejo de formularios
│   │   ├── DataManager.js    # Gestión de datos
│   │   ├── PhotoManager.js   # Gestión de fotos
│   │   ├── ReportGenerator.js # Generación de reportes
│   │   ├── WebhookSender.js  # Envío de webhooks
│   │   └── Validator.js      # Validaciones
│   └── utils/
│       ├── StorageUtils.js   # Abstracción de LocalStorage
│       ├── DateUtils.js      # Utilidades de fecha
│       └── NotificationSystem.js # Sistema de notificaciones
│
└── assets/
    └── icons/                # Iconos (placeholder)
```

---

## 🎮 Uso de la Aplicación

### Crear un Nuevo Reporte

1. **Inicia la aplicación** → Se crea automáticamente un nuevo reporte
2. **Completa cada sección**:
   - 🏗️ **Proyecto**: Información base
   - 📅 **General**: Fecha, supervisor, clima
   - 👥 **Personal**: Trabajadores y horas
   - ✅ **Tareas**: Actividades realizadas
   - 🛡️ **Seguridad**: Riesgos y medidas
   - 📸 **Fotos**: Evidencia visual

3. **Acciones disponibles**:
   - 💾 **Guardar Borrador**: Almacena localmente
   - ✅ **Enviar Reporte**: Valida y envía vía webhook
   - 📥 **Exportar**: Descarga como JSON/CSV/PDF
   - 📝 **Nuevo Reporte**: Crea nuevo, guarda actual como borrador

### Sincronización

- **Automática**: Cada 5 minutos si hay conexión
- **Manual**: Botón "Sincronizar" en encabezado
- **Offline**: Los reportes se guardan localmente
- **Cola**: Los pendientes se sincronizan cuando hay internet

### Gestión de Fotos

- **Cargar**: 📤 Seleccionar archivo desde dispositivo
- **Capturar**: 📷 Usar cámara del dispositivo (requiere permisos)
- **Descripción**: Se solicita automáticamente
- **Compresión**: Se aplica automáticamente (80%)
- **Máximo**: 20 fotos por reporte

---

## ⚙️ Configuración

### config/config.js

```javascript
// URL del webhook (Make.com)
WEBHOOK_URL: 'https://hook.make.com/your-webhook-id'

// Límites
CREW_MAX: 50              // Máximo de trabajadores
PHOTOS_MAX: 20            // Máximo de fotos
PHOTO_MAX_SIZE: 5242880  // 5MB en bytes

// Sincronización
RETRY_ATTEMPTS: 3         // Reintentos de envío
RETRY_DELAY: 2000        // Retardo entre reintentos (ms)

// UI
AUTOSAVE_INTERVAL: 10000 // Auto-guardar cada 10s
TOAST_DURATION: 3000     // Duración de notificaciones
```

### Variables de Entorno

Puede usar variables de entorno:
```javascript
// En tu servidor/host
WEBHOOK_URL = process.env.WEBHOOK_URL
```

---

## 📱 API de Webhooks

### Payload Enviado

```json
{
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "reportId": "report_1234567890",
    "appVersion": "1.0.0",
    "platform": "mobile"
  },
  "project": {
    "name": "Edificio Centro",
    "location": "Zona Centro",
    "address": "Calle Principal 123",
    "contractorName": "Constructora XYZ"
  },
  "general": {
    "reportDate": "2024-01-15",
    "supervisor": "Juan Pérez",
    "weather": "Soleado",
    "temperature": 28
  },
  "crew": [
    {
      "id": "worker_123",
      "name": "Carlos López",
      "position": "Maestro",
      "hoursWorked": 8,
      "status": "Presente"
    }
  ],
  "tasks": [
    {
      "id": "task_456",
      "description": "Excavación de fundaciones",
      "phase": "Excavación",
      "percentage": 75
    }
  ],
  "safety": {
    "hazardsIdentified": "Ninguno",
    "safetyIncidents": [],
    "jsa": true,
    "toolboxTalk": true
  },
  "photos": [
    {
      "id": "photo_789",
      "description": "Vista general del sitio",
      "phase": "Excavación",
      "uploadedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "summary": {
    "totalWorkers": 1,
    "totalHours": 8,
    "tasksCompleted": 1,
    "photosAttached": 1
  }
}
```

### Respuesta Esperada

```json
{
  "success": true,
  "reportId": "report_1234567890",
  "message": "Reporte procesado exitosamente"
}
```

---

## 🔒 Almacenamiento y Privacidad

### LocalStorage
- **Borradores**: Almacenan datos incompletos
- **Reportes Completados**: Almacenan reportes enviados
- **Cola de Sincronización**: Reportes pendientes
- **Configuración**: Preferencias de usuario

### Límites
- **Máximo LocalStorage**: ~5-10MB (depende del navegador)
- **Auto-limpieza**: Reportes sincronizados se limpian cada 30 días
- **Manual**: Botón "Limpiar" en encabezado

### Privacidad
- ✓ Todos los datos se almacenan localmente primero
- ✓ Envío solo a webhook configurado
- ✓ No se envían a servidores de terceros
- ✓ Control total sobre cuándo sincronizar

---

## 🐛 Resolución de Problemas

### "Sin conexión a internet"
- ✓ La app funciona offline
- ✓ Los datos se sincronizan cuando hay internet
- ✓ Revisa tu conexión de red

### "Almacenamiento lleno"
- Haz clic en "Limpiar" para eliminar reportes antiguos
- O abre DevTools → Application → Clear All

### "Fotos no se cargan"
- Verifica permisos de cámara/archivos
- Comprueba tamaño de archivo (máx 5MB)
- Reinicia la aplicación

### "Reporte no se envía"
- Verifica que WEBHOOK_URL sea válida
- Revisa la consola (F12) para errores
- Intenta de nuevo con botón Sincronizar

---

## 📊 Estadísticas y Monitoreo

### Dashboard
- **Estadísticas**: Botón 📊 en encabezado
- **Estado de Sync**: Mostrado en pie de página
- **Uso de Almacenamiento**: Visualización de capacidad

### Logs
```javascript
// Ver logs en consola
CONFIG.DEBUG = true
CONFIG.LOG_LEVEL = 'debug' // 'debug', 'info', 'warn', 'error'
```

---

## 🔄 Exportación de Datos

### Formatos Soportados

1. **JSON** - Importable en otras aplicaciones
2. **CSV** - Compatible con Excel/Sheets
3. **PDF** - Formato profesional para impresión

### Descarga de Datos

```javascript
// Exportar todos los datos
const allData = StorageUtils.exportAllData()
console.log(allData)
```

---

## 🚀 Deployamiento

### Hosting Estático
- Vercel
- Netlify
- GitHub Pages
- AWS S3

### Node.js
```bash
npm install -g http-server
http-server .
```

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY . .
EXPOSE 8000
CMD ["npx", "http-server"]
```

---

## 📚 Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Tailwind CSS + Custom CSS
- **JavaScript ES6+**: Vanilla JS (sin frameworks)
- **LocalStorage API**: Almacenamiento local
- **Fetch API**: Comunicación HTTP
- **Canvas API**: Compresión de imágenes
- **html2pdf.js**: Generación de PDFs

### Sin Dependencias Externas Requeridas
- ✓ Funciona offline
- ✓ Carga rápida
- ✓ Bajo consumo de datos

---

## 📝 Licencia

© 2024 Field Report Pro. Todos los derechos reservados.

---

## 👥 Contribución

Para reportar bugs o sugerir mejoras:
1. Abre un issue en el repositorio
2. Describe el problema detalladamente
3. Incluye pasos para reproducir

---

## 📞 Soporte

Para soporte técnico o dudas:
- 📧 Email: support@fieldreportpro.com
- 📱 WhatsApp: +1-555-0123
- 🌐 Web: https://fieldreportpro.com

---

## 🎓 Tutorial Rápido

### 5 Minutos para tu Primer Reporte

1. **Abre la aplicación** → Verás sección "Proyecto"
2. **Completa datos básicos** → Nombre, ubicación, contratista
3. **Agrega trabajadores** → Botón "+ Agregar Trabajador"
4. **Agrega tareas** → Botón "+ Agregar Tarea"
5. **Sube fotos** → Botón "📤 Cargar Foto"
6. **Envía** → Botón "✅ Enviar Reporte"

¡Listo! Tu reporte está sincronizado.

---

**Última actualización**: 2024-01-15  
**Versión**: 1.0.0 Production Ready ✓
