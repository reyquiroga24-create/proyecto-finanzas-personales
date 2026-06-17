/**
 * FIELD REPORT PRO - UTILIDADES DE ALMACENAMIENTO
 * Abstracción completa de LocalStorage con validación y sincronización
 */

class StorageUtils {
  /**
   * Guarda un objeto en LocalStorage de forma segura
   * @param {string} key - Clave de almacenamiento
   * @param {*} value - Valor a guardar (se serializa a JSON)
   * @returns {boolean} - true si se guardó correctamente
   */
  static set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      CONFIG.log('debug', `Storage SET: ${key}`, { size: serialized.length });
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        CONFIG.log('error', 'LocalStorage full - quota exceeded', error);
        this.triggerStorageFull();
        return false;
      }
      CONFIG.log('error', `Storage SET failed for ${key}`, error);
      return false;
    }
  }

  /**
   * Obtiene un objeto de LocalStorage
   * @param {string} key - Clave de almacenamiento
   * @param {*} defaultValue - Valor por defecto si no existe
   * @returns {*} - Objeto deserializado o defaultValue
   */
  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return JSON.parse(item);
    } catch (error) {
      CONFIG.log('error', `Storage GET failed for ${key}`, error);
      return defaultValue;
    }
  }

  /**
   * Verifica si una clave existe en LocalStorage
   * @param {string} key - Clave a verificar
   * @returns {boolean}
   */
  static exists(key) {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Elimina una clave de LocalStorage
   * @param {string} key - Clave a eliminar
   * @returns {boolean}
   */
  static remove(key) {
    try {
      localStorage.removeItem(key);
      CONFIG.log('debug', `Storage REMOVED: ${key}`);
      return true;
    } catch (error) {
      CONFIG.log('error', `Storage REMOVE failed for ${key}`, error);
      return false;
    }
  }

  /**
   * Limpia completamente LocalStorage
   * @returns {boolean}
   */
  static clear() {
    try {
      localStorage.clear();
      CONFIG.log('info', 'LocalStorage cleared completely');
      return true;
    } catch (error) {
      CONFIG.log('error', 'Storage CLEAR failed', error);
      return false;
    }
  }

  /**
   * Obtiene todas las claves de almacenamiento
   * @returns {string[]}
   */
  static keys() {
    return Object.keys(localStorage);
  }

  /**
   * Obtiene el tamaño total del almacenamiento en bytes
   * @returns {number}
   */
  static getSize() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  /**
   * Obtiene el porcentaje de uso del almacenamiento
   * @returns {number} - Porcentaje de 0 a 100
   */
  static getUsagePercentage() {
    const maxStorage = 5 * 1024 * 1024; // 5MB típico
    const used = this.getSize();
    return Math.round((used / maxStorage) * 100);
  }

  /**
   * Guarda un reporte como borrador
   * @param {Object} reportData - Datos del reporte
   * @returns {string} - ID del borrador
   */
  static saveDraft(reportData) {
    const drafts = this.get(CONFIG.STORAGE_KEYS.DRAFTS, {});
    const draftId = `draft_${Date.now()}`;

    drafts[draftId] = {
      id: draftId,
      data: reportData,
      savedAt: new Date().toISOString(),
      status: CONFIG.ENUMS.REPORT_STATUS.DRAFT,
    };

    this.set(CONFIG.STORAGE_KEYS.DRAFTS, drafts);
    CONFIG.log('info', 'Draft saved', { draftId });
    return draftId;
  }

  /**
   * Obtiene todos los borradores
   * @returns {Object}
   */
  static getDrafts() {
    return this.get(CONFIG.STORAGE_KEYS.DRAFTS, {});
  }

  /**
   * Obtiene un borrador específico por ID
   * @param {string} draftId
   * @returns {Object|null}
   */
  static getDraft(draftId) {
    const drafts = this.getDrafts();
    return drafts[draftId] || null;
  }

  /**
   * Elimina un borrador
   * @param {string} draftId
   * @returns {boolean}
   */
  static deleteDraft(draftId) {
    const drafts = this.getDrafts();
    delete drafts[draftId];
    this.set(CONFIG.STORAGE_KEYS.DRAFTS, drafts);
    CONFIG.log('info', 'Draft deleted', { draftId });
    return true;
  }

  /**
   * Guarda un reporte completado
   * @param {Object} reportData - Datos del reporte
   * @returns {string} - ID del reporte
   */
  static saveCompletedReport(reportData) {
    const reports = this.get(CONFIG.STORAGE_KEYS.COMPLETED_REPORTS, {});
    const reportId = `report_${Date.now()}`;

    reports[reportId] = {
      id: reportId,
      data: reportData,
      createdAt: new Date().toISOString(),
      status: CONFIG.ENUMS.REPORT_STATUS.SUBMITTED,
      synced: false,
    };

    this.set(CONFIG.STORAGE_KEYS.COMPLETED_REPORTS, reports);
    this.addToSyncQueue(reportId);
    CONFIG.log('info', 'Report saved', { reportId });
    return reportId;
  }

  /**
   * Obtiene todos los reportes completados
   * @returns {Object}
   */
  static getCompletedReports() {
    return this.get(CONFIG.STORAGE_KEYS.COMPLETED_REPORTS, {});
  }

  /**
   * Obtiene un reporte específico por ID
   * @param {string} reportId
   * @returns {Object|null}
   */
  static getReport(reportId) {
    const reports = this.getCompletedReports();
    return reports[reportId] || null;
  }

  /**
   * Actualiza el estado de sincronización de un reporte
   * @param {string} reportId
   * @param {boolean} synced
   */
  static markReportAsSynced(reportId) {
    const reports = this.getCompletedReports();
    if (reports[reportId]) {
      reports[reportId].synced = true;
      reports[reportId].status = CONFIG.ENUMS.REPORT_STATUS.SYNCED;
      reports[reportId].syncedAt = new Date().toISOString();
      this.set(CONFIG.STORAGE_KEYS.COMPLETED_REPORTS, reports);
      this.removeFromSyncQueue(reportId);
      CONFIG.log('info', 'Report marked as synced', { reportId });
    }
  }

  /**
   * Agrega un reporte a la cola de sincronización
   * @param {string} reportId
   */
  static addToSyncQueue(reportId) {
    const queue = this.get(CONFIG.STORAGE_KEYS.SYNC_QUEUE, []);
    if (!queue.includes(reportId)) {
      queue.push(reportId);
      this.set(CONFIG.STORAGE_KEYS.SYNC_QUEUE, queue);
      CONFIG.log('debug', 'Report added to sync queue', { reportId });
    }
  }

  /**
   * Obtiene la cola de sincronización
   * @returns {string[]}
   */
  static getSyncQueue() {
    return this.get(CONFIG.STORAGE_KEYS.SYNC_QUEUE, []);
  }

  /**
   * Elimina un reporte de la cola de sincronización
   * @param {string} reportId
   */
  static removeFromSyncQueue(reportId) {
    const queue = this.getSyncQueue();
    const index = queue.indexOf(reportId);
    if (index > -1) {
      queue.splice(index, 1);
      this.set(CONFIG.STORAGE_KEYS.SYNC_QUEUE, queue);
      CONFIG.log('debug', 'Report removed from sync queue', { reportId });
    }
  }

  /**
   * Limpia reportes sincronizados más antiguos de 30 días
   */
  static cleanupOldReports() {
    const reports = this.getCompletedReports();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let cleaned = 0;

    for (const [reportId, report] of Object.entries(reports)) {
      if (report.synced && report.createdAt < thirtyDaysAgo) {
        delete reports[reportId];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.set(CONFIG.STORAGE_KEYS.COMPLETED_REPORTS, reports);
      CONFIG.log('info', `Cleaned up ${cleaned} old reports`);
    }
  }

  /**
   * Obtiene la fecha del último sincronización
   * @returns {string|null}
   */
  static getLastSyncTime() {
    return this.get(CONFIG.STORAGE_KEYS.LAST_SYNC, null);
  }

  /**
   * Actualiza la fecha del último sincronización
   */
  static updateLastSyncTime() {
    this.set(CONFIG.STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  /**
   * Obtiene las configuraciones de usuario
   * @returns {Object}
   */
  static getUserSettings() {
    return this.get(CONFIG.STORAGE_KEYS.USER_SETTINGS, {
      autoSync: true,
      compressionEnabled: true,
      defaultSupervisor: '',
      defaultContractor: '',
      notificationsEnabled: true,
    });
  }

  /**
   * Actualiza las configuraciones de usuario
   * @param {Object} settings
   */
  static updateUserSettings(settings) {
    const current = this.getUserSettings();
    const updated = { ...current, ...settings };
    this.set(CONFIG.STORAGE_KEYS.USER_SETTINGS, updated);
    CONFIG.log('info', 'User settings updated');
  }

  /**
   * Exporta todos los datos a JSON
   * @returns {Object}
   */
  static exportAllData() {
    return {
      drafts: this.getDrafts(),
      completedReports: this.getCompletedReports(),
      syncQueue: this.getSyncQueue(),
      userSettings: this.getUserSettings(),
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Importa datos desde un backup
   * @param {Object} data
   * @returns {boolean}
   */
  static importData(data) {
    try {
      if (data.drafts) {
        this.set(CONFIG.STORAGE_KEYS.DRAFTS, data.drafts);
      }
      if (data.completedReports) {
        this.set(CONFIG.STORAGE_KEYS.COMPLETED_REPORTS, data.completedReports);
      }
      if (data.syncQueue) {
        this.set(CONFIG.STORAGE_KEYS.SYNC_QUEUE, data.syncQueue);
      }
      if (data.userSettings) {
        this.updateUserSettings(data.userSettings);
      }
      CONFIG.log('info', 'Data imported successfully');
      return true;
    } catch (error) {
      CONFIG.log('error', 'Data import failed', error);
      return false;
    }
  }

  /**
   * Dispara evento cuando el almacenamiento está lleno
   */
  static triggerStorageFull() {
    const event = new CustomEvent('storage-full', {
      detail: {
        message: CONFIG.MESSAGES.ERROR.STORAGE_FULL,
        usage: this.getUsagePercentage(),
      },
    });
    window.dispatchEvent(event);
  }

  /**
   * Verifica conexión a internet
   * @returns {Promise<boolean>}
   */
  static async checkConnectivity() {
    try {
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene estadísticas de almacenamiento
   * @returns {Object}
   */
  static getStorageStats() {
    const drafts = this.getDrafts();
    const reports = this.getCompletedReports();
    const queue = this.getSyncQueue();

    return {
      totalSize: this.getSize(),
      usagePercentage: this.getUsagePercentage(),
      draftCount: Object.keys(drafts).length,
      reportCount: Object.keys(reports).length,
      pendingSyncCount: queue.length,
      lastSync: this.getLastSyncTime(),
    };
  }
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageUtils;
}
