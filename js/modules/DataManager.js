/**
 * FIELD REPORT PRO - GESTOR DE DATOS
 * Gestión centralizada de datos, caché y sincronización
 */

class DataManager {
  static currentReport = null;
  static autoSaveTimer = null;

  /**
   * Inicializa el gestor de datos
   */
  static init() {
    // Auto-save cada 10 segundos
    if (CONFIG.UI_CONFIG.AUTOSAVE_INTERVAL > 0) {
      this.startAutoSave();
    }

    // Sincronizar reportes pendientes al iniciar
    if (navigator.onLine) {
      setTimeout(() => this.syncPendingReports(), 2000);
    }

    CONFIG.log('info', 'DataManager initialized');
  }

  /**
   * Crea un nuevo reporte vacío
   * @returns {Object}
   */
  static createNewReport() {
    const report = {
      id: `report_${Date.now()}`,
      createdAt: DateUtils.nowISO(),
      updatedAt: DateUtils.nowISO(),
      status: CONFIG.ENUMS.REPORT_STATUS.DRAFT,

      projectData: {
        name: '',
        location: '',
        address: '',
        contractorName: '',
        projectNumber: '',
      },

      generalData: {
        reportDate: DateUtils.today(),
        supervisor: '',
        weather: '',
        temperature: CONFIG.DEFAULT_TEMPERATURE,
        notes: '',
      },

      crew: [],
      tasks: [],
      photos: [],
      materials: [],

      safetyData: {
        hazardsIdentified: '',
        incidents: [],
        jsa: false,
        toolboxTalk: false,
        preventiveMeasures: '',
      },

      metadata: {
        autoSaved: false,
        lastAutoSave: null,
        changes: 0,
      },
    };

    this.currentReport = report;
    return report;
  }

  /**
   * Carga un reporte desde almacenamiento
   * @param {string} reportId
   * @returns {Object|null}
   */
  static loadReport(reportId) {
    // Intentar borrador primero
    let report = StorageUtils.getDraft(reportId);

    // Si no hay borrador, intentar reportes completados
    if (!report) {
      const completed = StorageUtils.getReport(reportId);
      if (completed) {
        report = completed.data;
      }
    }

    if (report) {
      this.currentReport = report;
      CONFIG.log('info', 'Report loaded', { reportId });
    } else {
      CONFIG.log('warn', 'Report not found', { reportId });
    }

    return report;
  }

  /**
   * Guarda el reporte actual como borrador
   * @returns {string} - ID del borrador
   */
  static saveDraft() {
    if (!this.currentReport) {
      throw new Error('No hay reporte para guardar');
    }

    this.currentReport.updatedAt = DateUtils.nowISO();
    this.currentReport.metadata.lastAutoSave = DateUtils.nowISO();
    this.currentReport.metadata.autoSaved = true;

    const draftId = StorageUtils.saveDraft(this.currentReport);
    NotificationSystem.success(CONFIG.MESSAGES.SUCCESS.DATA_SAVED);

    return draftId;
  }

  /**
   * Inicia auto-guardado automático
   */
  static startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      if (this.currentReport && this.currentReport.metadata.changes > 0) {
        this.saveDraft();
        this.currentReport.metadata.changes = 0;
      }
    }, CONFIG.UI_CONFIG.AUTOSAVE_INTERVAL);
  }

  /**
   * Detiene el auto-guardado
   */
  static stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Submite el reporte
   * @returns {Promise<Object>}
   */
  static async submitReport() {
    if (!this.currentReport) {
      throw new Error('No hay reporte para enviar');
    }

    // Validar reporte
    const validation = Validator.validateReport(this.currentReport);
    if (!validation.valid) {
      Validator.highlightErrors(validation.errors);
      const errorSummary = Validator.getErrorSummary(validation.errors);
      throw new Error(errorSummary);
    }

    // Marcar como enviado
    this.currentReport.status = CONFIG.ENUMS.REPORT_STATUS.SUBMITTED;
    this.currentReport.updatedAt = DateUtils.nowISO();

    // Guardar en reportes completados
    const reportId = StorageUtils.saveCompletedReport(this.currentReport);

    // Intentar enviar vía webhook
    try {
      await WebhookSender.sendReport(this.currentReport);
      StorageUtils.markReportAsSynced(reportId);
      this.currentReport.status = CONFIG.ENUMS.REPORT_STATUS.SYNCED;
      NotificationSystem.success(CONFIG.MESSAGES.SUCCESS.REPORT_SENT);
    } catch (error) {
      NotificationSystem.warning(CONFIG.MESSAGES.ERROR.NETWORK_ERROR);
      CONFIG.log('error', 'Report submission error', error);
    }

    return { reportId, data: this.currentReport };
  }

  /**
   * Agrega un trabajador al reporte
   * @param {Object} worker
   */
  static addWorker(worker) {
    if (!this.currentReport) {
      throw new Error('No hay reporte activo');
    }

    const normalized = {
      id: `worker_${Date.now()}`,
      workerName: Validator.sanitize(worker.workerName, 'string'),
      position: worker.position || '',
      hoursWorked: Validator.sanitize(worker.hoursWorked, 'number'),
      status: worker.status || CONFIG.ENUMS.WORKER_STATUS.PRESENT,
      notes: worker.notes || '',
    };

    // Validar
    const validation = Validator.validateField('WORKER_NAME', normalized.workerName);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    this.currentReport.crew.push(normalized);
    this.currentReport.metadata.changes++;
    this.currentReport.updatedAt = DateUtils.nowISO();

    CONFIG.log('info', 'Worker added', { workerId: normalized.id });
    return normalized.id;
  }

  /**
   * Actualiza un trabajador
   * @param {string} workerId
   * @param {Object} updates
   */
  static updateWorker(workerId, updates) {
    if (!this.currentReport) {
      throw new Error('No hay reporte activo');
    }

    const worker = this.currentReport.crew.find((w) => w.id === workerId);
    if (!worker) {
      throw new Error('Trabajador no encontrado');
    }

    Object.assign(worker, updates);
    this.currentReport.metadata.changes++;
    this.currentReport.updatedAt = DateUtils.nowISO();

    CONFIG.log('info', 'Worker updated', { workerId });
  }

  /**
   * Elimina un trabajador
   * @param {string} workerId
   */
  static removeWorker(workerId) {
    if (!this.currentReport) {
      throw new Error('No hay reporte activo');
    }

    const index = this.currentReport.crew.findIndex((w) => w.id === workerId);
    if (index === -1) {
      throw new Error('Trabajador no encontrado');
    }

    this.currentReport.crew.splice(index, 1);
    this.currentReport.metadata.changes++;
    this.currentReport.updatedAt = DateUtils.nowISO();

    CONFIG.log('info', 'Worker removed', { workerId });
  }

  /**
   * Agrega una tarea
   * @param {Object} task
   */
  static addTask(task) {
    if (!this.currentReport) {
      throw new Error('No hay reporte activo');
    }

    const normalized = {
      id: `task_${Date.now()}`,
      description: Validator.sanitize(task.description, 'string'),
      phase: task.phase || CONFIG.ENUMS.TASK_PHASE.OTHER,
      percentage: Validator.sanitize(task.percentage, 'percentage'),
      startTime: task.startTime || '',
      endTime: task.endTime || '',
      notes: task.notes || '',
    };

    // Validar
    if (!normalized.description || normalized.description.length < 5) {
      throw new Error('La descripción de la tarea debe tener al menos 5 caracteres');
    }

    this.currentReport.tasks.push(normalized);
    this.currentReport.metadata.changes++;
    this.currentReport.updatedAt = DateUtils.nowISO();

    CONFIG.log('info', 'Task added', { taskId: normalized.id });
    return normalized.id;
  }

  /**
   * Actualiza una tarea
   * @param {string} taskId
   * @param {Object} updates
   */
  static updateTask(taskId, updates) {
    if (!this.currentReport) {
      throw new Error('No hay reporte activo');
    }

    const task = this.currentReport.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error('Tarea no encontrada');
    }

    Object.assign(task, updates);
    this.currentReport.metadata.changes++;
    this.currentReport.updatedAt = DateUtils.nowISO();

    CONFIG.log('info', 'Task updated', { taskId });
  }

  /**
   * Elimina una tarea
   * @param {string} taskId
   */
  static removeTask(taskId) {
    if (!this.currentReport) {
      throw new Error('No hay reporte activo');
    }

    const index = this.currentReport.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) {
      throw new Error('Tarea no encontrada');
    }

    this.currentReport.tasks.splice(index, 1);
    this.currentReport.metadata.changes++;
    this.currentReport.updatedAt = DateUtils.nowISO();

    CONFIG.log('info', 'Task removed', { taskId });
  }

  /**
   * Agrega una foto
   * @param {Object} photo
   */
  static addPhoto(photo) {
    if (!this.currentReport) {
      throw new Error('No hay reporte activo');
    }

    if (this.currentReport.photos.length >= CONFIG.FORM_CONFIG.PHOTOS_MAX) {
      throw new Error(`No puede exceder ${CONFIG.FORM_CONFIG.PHOTOS_MAX} fotos`);
    }

    this.currentReport.photos.push(photo);
    this.currentReport.metadata.changes++;
    this.currentReport.updatedAt = DateUtils.nowISO();

    CONFIG.log('info', 'Photo added', { photoId: photo.id });
    NotificationSystem.success(CONFIG.MESSAGES.SUCCESS.PHOTO_ADDED);
  }

  /**
   * Elimina una foto
   * @param {string} photoId
   */
  static removePhoto(photoId) {
    if (!this.currentReport) {
      throw new Error('No hay reporte activo');
    }

    const index = this.currentReport.photos.findIndex((p) => p.id === photoId);
    if (index === -1) {
      throw new Error('Foto no encontrada');
    }

    this.currentReport.photos.splice(index, 1);
    this.currentReport.metadata.changes++;
    this.currentReport.updatedAt = DateUtils.nowISO();

    CONFIG.log('info', 'Photo removed', { photoId });
  }

  /**
   * Obtiene estadísticas del reporte actual
   * @returns {Object}
   */
  static getReportStats() {
    if (!this.currentReport) {
      return null;
    }

    const crew = this.currentReport.crew || [];
    const totalHours = crew.reduce((sum, w) => sum + parseFloat(w.hoursWorked || 0), 0);

    return {
      reportId: this.currentReport.id,
      status: this.currentReport.status,
      createdAt: this.currentReport.createdAt,
      updatedAt: this.currentReport.updatedAt,
      workerCount: crew.length,
      totalHours: totalHours.toFixed(2),
      taskCount: (this.currentReport.tasks || []).length,
      photoCount: (this.currentReport.photos || []).length,
      hasUnsavedChanges: this.currentReport.metadata.changes > 0,
    };
  }

  /**
   * Sincroniza reportes pendientes
   * @returns {Promise<Object>}
   */
  static async syncPendingReports() {
    return WebhookSender.syncPendingReports();
  }

  /**
   * Descarga todos los datos
   * @returns {Object}
   */
  static getAllData() {
    return StorageUtils.exportAllData();
  }

  /**
   * Limpia datos antiguos
   */
  static cleanup() {
    StorageUtils.cleanupOldReports();
    CONFIG.log('info', 'Data cleanup completed');
  }

  /**
   * Obtiene información de almacenamiento
   * @returns {Object}
   */
  static getStorageInfo() {
    return StorageUtils.getStorageStats();
  }
}

// Inicializar automáticamente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DataManager.init());
} else {
  DataManager.init();
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataManager;
}
