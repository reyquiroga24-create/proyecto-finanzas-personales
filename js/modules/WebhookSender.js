/**
 * FIELD REPORT PRO - ENVIADOR DE WEBHOOKS
 * Envío de reportes a Make.com o API externa con reintentos
 */

class WebhookSender {
  /**
   * Envía un reporte vía webhook
   * @param {Object} reportData
   * @param {string} webhookUrl
   * @returns {Promise<Object>}
   */
  static async sendReport(reportData, webhookUrl = CONFIG.getWebhookUrl()) {
    // Validar URL
    const validation = Validator.validateWebhookURL(webhookUrl);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Preparar payload
    const payload = this.preparePayload(reportData);

    // Validar payload
    if (!this.validatePayload(payload)) {
      throw new Error('El payload del reporte no es válido');
    }

    // Intentar envío con reintentos
    return this.sendWithRetry(payload, webhookUrl, CONFIG.RETRY_ATTEMPTS);
  }

  /**
   * Prepara el payload del reporte
   * @param {Object} reportData
   * @returns {Object}
   */
  static preparePayload(reportData) {
    const payload = {
      // Metadatos
      metadata: {
        timestamp: DateUtils.nowISO(),
        reportId: reportData.id || `report_${Date.now()}`,
        appVersion: '1.0.0',
        platform: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      },

      // Datos del proyecto
      project: {
        name: Validator.sanitize(reportData.projectData?.name, 'string'),
        location: Validator.sanitize(reportData.projectData?.location, 'string'),
        address: Validator.sanitize(reportData.projectData?.address, 'string'),
        contractorName: Validator.sanitize(reportData.projectData?.contractorName, 'string'),
        projectNumber: Validator.sanitize(reportData.projectData?.projectNumber, 'string'),
      },

      // Datos generales
      general: {
        reportDate: reportData.generalData?.reportDate || DateUtils.today(),
        supervisor: Validator.sanitize(reportData.generalData?.supervisor, 'string'),
        weather: reportData.generalData?.weather || '',
        temperature: Validator.sanitize(reportData.generalData?.temperature, 'number'),
        notes: Validator.sanitize(reportData.generalData?.notes, 'string'),
      },

      // Personal / Crew
      crew: this.formatCrewData(reportData.crew || []),

      // Tareas
      tasks: this.formatTasksData(reportData.tasks || []),

      // Seguridad
      safety: {
        hazardsIdentified: reportData.safetyData?.hazardsIdentified || '',
        safetyIncidents: reportData.safetyData?.incidents || [],
        jsa: reportData.safetyData?.jsa || false,
        toolboxTalk: reportData.safetyData?.toolboxTalk || false,
        preventiveMeasures: reportData.safetyData?.preventiveMeasures || '',
      },

      // Materiales
      materials: this.formatMaterialsData(reportData.materials || []),

      // Fotos
      photos: this.formatPhotosData(reportData.photos || []),

      // Resumen
      summary: {
        totalWorkers: (reportData.crew || []).length,
        totalHours: this.calculateTotalHours(reportData.crew || []),
        tasksCompleted: (reportData.tasks || []).length,
        photosAttached: (reportData.photos || []).length,
      },
    };

    return payload;
  }

  /**
   * Formatea datos del personal
   * @param {Array} crew
   * @returns {Array}
   */
  static formatCrewData(crew) {
    return crew.map((worker) => ({
      id: worker.id || `worker_${Date.now()}`,
      name: Validator.sanitize(worker.workerName, 'string'),
      position: worker.position || '',
      hoursWorked: Validator.sanitize(worker.hoursWorked, 'number'),
      status: worker.status || CONFIG.ENUMS.WORKER_STATUS.PRESENT,
      notes: worker.notes || '',
    }));
  }

  /**
   * Formatea datos de tareas
   * @param {Array} tasks
   * @returns {Array}
   */
  static formatTasksData(tasks) {
    return tasks.map((task) => ({
      id: task.id || `task_${Date.now()}`,
      description: Validator.sanitize(task.description, 'string'),
      phase: task.phase || CONFIG.ENUMS.TASK_PHASE.OTHER,
      percentage: Validator.sanitize(task.percentage, 'percentage'),
      startTime: task.startTime || '',
      endTime: task.endTime || '',
      notes: task.notes || '',
    }));
  }

  /**
   * Formatea datos de materiales
   * @param {Array} materials
   * @returns {Array}
   */
  static formatMaterialsData(materials) {
    return materials.map((material) => ({
      id: material.id || `material_${Date.now()}`,
      itemName: Validator.sanitize(material.itemName, 'string'),
      unit: material.unit || '',
      quantity: Validator.sanitize(material.quantity, 'number'),
      supplier: material.supplier || '',
      cost: Validator.sanitize(material.cost, 'currency'),
    }));
  }

  /**
   * Formatea datos de fotos (envía solo metadatos, no base64)
   * @param {Array} photos
   * @returns {Array}
   */
  static formatPhotosData(photos) {
    return photos.map((photo) => ({
      id: photo.id,
      description: Validator.sanitize(photo.description, 'string'),
      phase: photo.phase || '',
      uploadedAt: photo.uploadedAt,
      fileName: photo.file,
      fileSize: photo.fileSize,
      mimeType: photo.fileType,
      // NOTA: base64 se envía en payload separado si es requerido
    }));
  }

  /**
   * Calcula total de horas del personal
   * @param {Array} crew
   * @returns {number}
   */
  static calculateTotalHours(crew) {
    return crew.reduce((total, worker) => {
      const hours = parseFloat(worker.hoursWorked) || 0;
      return total + hours;
    }, 0);
  }

  /**
   * Valida la estructura del payload
   * @param {Object} payload
   * @returns {boolean}
   */
  static validatePayload(payload) {
    return (
      payload.metadata &&
      payload.metadata.timestamp &&
      payload.metadata.reportId &&
      payload.project &&
      payload.general &&
      payload.general.reportDate
    );
  }

  /**
   * Envía con reintentos automáticos
   * @param {Object} payload
   * @param {string} webhookUrl
   * @param {number} retriesLeft
   * @returns {Promise<Object>}
   */
  static async sendWithRetry(payload, webhookUrl, retriesLeft = CONFIG.RETRY_ATTEMPTS) {
    try {
      CONFIG.log('info', `Sending report to webhook (attempt ${CONFIG.RETRY_ATTEMPTS - retriesLeft + 1})`);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FieldReportPro/1.0',
        },
        body: JSON.stringify(payload),
        timeout: CONFIG.API_TIMEOUT,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      CONFIG.log('info', 'Report sent successfully', { reportId: payload.metadata.reportId });

      return {
        success: true,
        reportId: payload.metadata.reportId,
        timestamp: DateUtils.nowISO(),
        response: result,
      };
    } catch (error) {
      CONFIG.log('error', `Webhook send failed: ${error.message}`);

      if (retriesLeft > 1) {
        const delay = CONFIG.RETRY_DELAY * (CONFIG.RETRY_ATTEMPTS - retriesLeft + 1);
        CONFIG.log('info', `Retrying in ${delay}ms...`);

        // Esperar antes de reintentar
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWithRetry(payload, webhookUrl, retriesLeft - 1);
      }

      // Si hay internet, agregar a cola de sincronización
      if (navigator.onLine) {
        StorageUtils.addToSyncQueue(payload.metadata.reportId);
      }

      throw new Error(CONFIG.MESSAGES.ERROR.WEBHOOK_FAILURE);
    }
  }

  /**
   * Envía fotos en lote (opcional, para webhooks que requieren upload de archivos)
   * @param {Array} photos
   * @param {string} uploadUrl
   * @returns {Promise<Array>}
   */
  static async uploadPhotos(photos, uploadUrl) {
    const results = [];

    for (const photo of photos) {
      try {
        const formData = new FormData();
        formData.append('file', this.dataURItoBlob(photo.base64), photo.file);
        formData.append('description', photo.description);
        formData.append('phase', photo.phase);
        formData.append('photoId', photo.id);

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
          timeout: CONFIG.API_TIMEOUT,
        });

        if (response.ok) {
          results.push({ photoId: photo.id, success: true });
        } else {
          results.push({ photoId: photo.id, success: false, error: response.statusText });
        }
      } catch (error) {
        results.push({ photoId: photo.id, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Convierte Data URI a Blob
   * @param {string} dataURI
   * @returns {Blob}
   */
  static dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].match(/:(.*?);/)[1];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeString });
  }

  /**
   * Sincroniza reportes pendientes
   * @returns {Promise<Object>}
   */
  static async syncPendingReports() {
    const queue = StorageUtils.getSyncQueue();

    if (queue.length === 0) {
      CONFIG.log('info', 'No pending reports to sync');
      return { synced: 0, failed: 0 };
    }

    const removeLoader = NotificationSystem.showLoader(`Sincronizando ${queue.length} reporte(s)...`);
    const updateProgress = NotificationSystem.showProgress(`Sincronizando reportes`);

    let synced = 0;
    let failed = 0;

    for (let i = 0; i < queue.length; i++) {
      const reportId = queue[i];
      const report = StorageUtils.getReport(reportId);

      if (!report) continue;

      try {
        await this.sendReport(report.data);
        StorageUtils.markReportAsSynced(reportId);
        synced++;
        CONFIG.log('info', 'Report synced', { reportId });
      } catch (error) {
        failed++;
        CONFIG.log('error', 'Failed to sync report', { reportId, error: error.message });
      }

      updateProgress(Math.round(((i + 1) / queue.length) * 100));
    }

    removeLoader();
    StorageUtils.updateLastSyncTime();

    return { synced, failed };
  }

  /**
   * Obtiene estado de sincronización
   * @returns {Object}
   */
  static getSyncStatus() {
    const queue = StorageUtils.getSyncQueue();
    const lastSync = StorageUtils.getLastSyncTime();

    return {
      pendingReports: queue.length,
      lastSync,
      isOnline: navigator.onLine,
      hasInternet: navigator.onLine,
    };
  }

  /**
   * Genera un reporte en formato JSON para descargar
   * @param {Object} reportData
   * @returns {Blob}
   */
  static exportAsJSON(reportData) {
    const payload = this.preparePayload(reportData);
    const json = JSON.stringify(payload, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Exporta reporte como CSV (metadatos sin fotos base64)
   * @param {Object} reportData
   * @returns {string}
   */
  static exportAsCSV(reportData) {
    const lines = [];

    // Encabezado
    lines.push('FIELD REPORT PRO - EXPORT CSV');
    lines.push('');

    // Datos del proyecto
    lines.push('--- PROYECTO ---');
    lines.push(`Nombre,${reportData.projectData?.name}`);
    lines.push(`Ubicación,${reportData.projectData?.location}`);
    lines.push(`Dirección,${reportData.projectData?.address}`);
    lines.push(`Contratista,${reportData.projectData?.contractorName}`);
    lines.push('');

    // Datos generales
    lines.push('--- GENERAL ---');
    lines.push(`Fecha,${reportData.generalData?.reportDate}`);
    lines.push(`Supervisor,${reportData.generalData?.supervisor}`);
    lines.push(`Clima,${reportData.generalData?.weather}`);
    lines.push(`Temperatura,${reportData.generalData?.temperature}`);
    lines.push('');

    // Personal
    lines.push('--- PERSONAL ---');
    lines.push('Nombre,Posición,Horas,Estado');
    (reportData.crew || []).forEach((worker) => {
      lines.push(`"${worker.workerName}","${worker.position}","${worker.hoursWorked}","${worker.status}"`);
    });
    lines.push('');

    // Tareas
    lines.push('--- TAREAS ---');
    lines.push('Descripción,Fase,Porcentaje');
    (reportData.tasks || []).forEach((task) => {
      lines.push(`"${task.description}","${task.phase}","${task.percentage}"`);
    });
    lines.push('');

    // Seguridad
    lines.push('--- SEGURIDAD ---');
    lines.push(`Riesgos Identificados,${reportData.safetyData?.hazardsIdentified}`);
    lines.push(`JSA,${reportData.safetyData?.jsa ? 'Sí' : 'No'}`);
    lines.push(`Toolbox Talk,${reportData.safetyData?.toolboxTalk ? 'Sí' : 'No'}`);

    return lines.join('\n');
  }
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebhookSender;
}
