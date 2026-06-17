/**
 * FIELD REPORT PRO - CONFIGURACIÓN GLOBAL
 * Variables de entorno, constantes y configuración de la aplicación
 */

const CONFIG = {
  // ==================== API & WEBHOOKS ====================
  WEBHOOK_URL: process.env.WEBHOOK_URL || 'https://hook.make.com/your-webhook-id',
  API_TIMEOUT: 15000, // 15 segundos
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000, // 2 segundos

  // ==================== ALMACENAMIENTO LOCAL ====================
  STORAGE_KEYS: {
    DRAFTS: 'frp_drafts',
    COMPLETED_REPORTS: 'frp_completed_reports',
    SYNC_QUEUE: 'frp_sync_queue',
    USER_SETTINGS: 'frp_user_settings',
    OFFLINE_MODE: 'frp_offline_mode',
    LAST_SYNC: 'frp_last_sync',
  },

  // ==================== VALIDACIONES ====================
  VALIDATION_RULES: {
    PROJECT_NAME: {
      min: 3,
      max: 100,
      required: true,
      pattern: /^[a-zA-Z0-9\s\-_áéíóúñ]+$/,
    },
    SUPERVISOR_NAME: {
      min: 3,
      max: 50,
      required: true,
      pattern: /^[a-zA-Z\s\-áéíóúñ]+$/,
    },
    WORKER_NAME: {
      min: 2,
      max: 50,
      required: true,
      pattern: /^[a-zA-Z\s\-áéíóúñ]+$/,
    },
    HOURS: {
      min: 0,
      max: 24,
      required: true,
      pattern: /^\d+(\.\d{1,2})?$/,
    },
    TASK_DESCRIPTION: {
      min: 5,
      max: 500,
      required: true,
    },
    SAFETY_NOTES: {
      min: 0,
      max: 1000,
      required: false,
    },
    WEATHER: {
      options: ['Soleado', 'Nublado', 'Lluvia', 'Nieve', 'Viento'],
      required: false,
    },
  },

  // ==================== CONFIGURACIÓN DE FORMULARIO ====================
  FORM_CONFIG: {
    CREW_MIN: 1,
    CREW_MAX: 50,
    PHOTOS_MAX: 20,
    PHOTO_MAX_SIZE: 5242880, // 5MB en bytes
    PHOTO_COMPRESSION_QUALITY: 0.8, // 80% para JPEG
    SECTION_DEFAULTS: {
      weather: '',
      safetyIncidents: false,
      hazardsIdentified: '',
      materialsDelivered: 0,
      wasteGenerated: 0,
      equipmentUsed: [],
    },
  },

  // ==================== INTERFAZ & NOTIFICACIONES ====================
  UI_CONFIG: {
    TOAST_DURATION: 3000, // 3 segundos
    MODAL_ANIMATION_DURATION: 300, // ms
    DEBOUNCE_DELAY: 500, // ms para búsquedas
    AUTOSAVE_INTERVAL: 10000, // Auto-guardar cada 10s
  },

  // ==================== CAMPOS DEL REPORTE ====================
  REPORT_FIELDS: {
    PROJECT: ['name', 'location', 'address', 'contractorName'],
    GENERAL: ['reportDate', 'supervisor', 'weather', 'temperature'],
    CREW: ['workerId', 'workerName', 'position', 'hoursWorked', 'status'],
    TASKS: ['taskDescription', 'phase', 'percentage', 'notes'],
    SAFETY: ['hazardsIdentified', 'safetyIncidents', 'jsa', 'toolboxTalk'],
    MATERIALS: ['itemName', 'unit', 'quantity', 'supplier'],
    PHOTOS: ['description', 'phase', 'file', 'timestamp'],
  },

  // ==================== ENUMERACIONES ====================
  ENUMS: {
    WEATHER: {
      SUNNY: 'Soleado',
      CLOUDY: 'Nublado',
      RAINY: 'Lluvia',
      SNOWY: 'Nieve',
      WINDY: 'Viento',
    },
    WORKER_STATUS: {
      PRESENT: 'Presente',
      ABSENT: 'Ausente',
      PARTIAL: 'Medio Día',
      SICK: 'Enfermo',
      VACATION: 'Vacaciones',
    },
    TASK_PHASE: {
      EXCAVATION: 'Excavación',
      FOUNDATION: 'Cimentación',
      STRUCTURE: 'Estructura',
      WALLS: 'Muros',
      FINISHING: 'Acabados',
      LANDSCAPING: 'Paisajismo',
      OTHER: 'Otro',
    },
    REPORT_STATUS: {
      DRAFT: 'Borrador',
      SUBMITTED: 'Enviado',
      SYNCED: 'Sincronizado',
      PENDING: 'Pendiente',
      FAILED: 'Error',
    },
  },

  // ==================== MENSAJES DEL SISTEMA ====================
  MESSAGES: {
    SUCCESS: {
      REPORT_CREATED: '✓ Reporte creado exitosamente',
      REPORT_UPDATED: '✓ Reporte actualizado',
      REPORT_SENT: '✓ Reporte enviado al servidor',
      PHOTO_ADDED: '✓ Foto agregada correctamente',
      DATA_SAVED: '✓ Datos guardados localmente',
      SYNC_COMPLETE: '✓ Sincronización completada',
    },
    ERROR: {
      VALIDATION_ERROR: '✗ Verifique los campos marcados en rojo',
      NETWORK_ERROR: '✗ Sin conexión a internet. Los datos se guardarán localmente',
      WEBHOOK_FAILURE: '✗ Error al enviar el reporte. Reintentando...',
      STORAGE_FULL: '✗ Almacenamiento local lleno. Limpie datos antiguos',
      FILE_TOO_LARGE: '✗ Archivo demasiado grande (máx 5MB)',
      INVALID_FORMAT: '✗ Formato de archivo no válido',
    },
    WARNING: {
      UNSAVED_CHANGES: '⚠ Tiene cambios sin guardar',
      OFFLINE_MODE: '⚠ Modo fuera de línea - Los datos se sincronizarán después',
    },
  },

  // ==================== UTILIDADES ====================
  DEFAULT_TEMPERATURE: 20,
  DATE_FORMAT: 'YYYY-MM-DD',
  TIME_FORMAT: 'HH:mm',
  TIMEZONE: 'America/New_York',
  LANGUAGE: 'es-ES',

  // ==================== DEBUG ====================
  DEBUG: true,
  LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'

  // ==================== MÉTODOS AUXILIARES ====================
  getWebhookUrl: () => CONFIG.WEBHOOK_URL,

  isProduction: () => CONFIG.WEBHOOK_URL !== '',

  isOfflineMode: () => {
    const mode = localStorage.getItem(CONFIG.STORAGE_KEYS.OFFLINE_MODE);
    return mode === 'true';
  },

  setOfflineMode: (value) => {
    localStorage.setItem(CONFIG.STORAGE_KEYS.OFFLINE_MODE, value.toString());
  },

  log: (level, message, data = null) => {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] >= levels[CONFIG.LOG_LEVEL]) {
      const timestamp = new Date().toISOString();
      if (data) {
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data);
      } else {
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
      }
    }
  },
};

// Exportar para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
