/**
 * FIELD REPORT PRO - APLICACIÓN PRINCIPAL
 * Punto de entrada y orquestación de módulos
 */

class FieldReportApp {
  static async init() {
    CONFIG.log('info', '=== FIELD REPORT PRO INICIANDO ===');

    try {
      // Verificar soporte del navegador
      this.checkBrowserSupport();

      // Inicializar módulos
      NotificationSystem.init();
      DataManager.init();
      FormHandler.init();

      // Cargar datos persistentes
      this.loadPersistedState();

      // Configurar listeners de red
      this.setupNetworkListeners();

      // Sincronizar reportes pendientes
      if (navigator.onLine) {
        setTimeout(() => {
          const syncStatus = WebhookSender.getSyncStatus();
          if (syncStatus.pendingReports > 0) {
            NotificationSystem.info(`${syncStatus.pendingReports} reporte(s) pendiente(s) de enviar`);
          }
        }, 1000);
      } else {
        NotificationSystem.showOfflineMode();
      }

      // Cargar interfaz
      this.setupUI();

      // Setup eventos globales
      this.setupGlobalEvents();

      CONFIG.log('info', '✓ Aplicación iniciada correctamente');
    } catch (error) {
      CONFIG.log('error', 'Error iniciando aplicación', error);
      NotificationSystem.error('Error al iniciar la aplicación');
    }
  }

  /**
   * Verifica soporte del navegador
   */
  static checkBrowserSupport() {
    const support = {
      localStorage: typeof localStorage !== 'undefined',
      fetch: typeof fetch !== 'undefined',
      formData: typeof FormData !== 'undefined',
      blob: typeof Blob !== 'undefined',
      canvas: document.createElement('canvas').getContext('2d') !== null,
    };

    if (!support.localStorage || !support.fetch || !support.formData) {
      throw new Error('Tu navegador no soporta las características requeridas');
    }

    CONFIG.log('info', 'Browser support OK', support);
  }

  /**
   * Carga estado persistente
   */
  static loadPersistedState() {
    // Crear nuevo reporte
    DataManager.currentReport = DataManager.createNewReport();

    // Cargar configuración de usuario
    const userSettings = StorageUtils.getUserSettings();
    CONFIG.log('info', 'User settings loaded', userSettings);

    // Limpiar reportes antiguos
    DataManager.cleanup();
  }

  /**
   * Configura listeners de red
   */
  static setupNetworkListeners() {
    window.addEventListener('online', async () => {
      CONFIG.log('info', 'Network: ONLINE');
      NotificationSystem.showOnlineMode();

      // Intentar sincronizar
      const syncStatus = WebhookSender.getSyncStatus();
      if (syncStatus.pendingReports > 0) {
        const confirmed = await NotificationSystem.confirm(
          'Sincronización Disponible',
          `Tienes ${syncStatus.pendingReports} reporte(s) pendiente(s). ¿Deseas sincronizar ahora?`,
          { confirm: 'Sincronizar', cancel: 'Después' }
        );

        if (confirmed) {
          await DataManager.syncPendingReports();
        }
      }
    });

    window.addEventListener('offline', () => {
      CONFIG.log('warn', 'Network: OFFLINE');
      NotificationSystem.showOfflineMode();
    });
  }

  /**
   * Configura la interfaz de usuario
   */
  static setupUI() {
    // Establecer fecha actual
    const dateInputs = document.querySelectorAll('input[name="reportDate"]');
    dateInputs.forEach((input) => {
      input.value = DateUtils.today();
    });

    // Renderizar secciones
    FormHandler.renderCrewList();
    FormHandler.renderTasksList();
    FormHandler.renderPhotosList();

    // Cargar configuración guardada
    const settings = StorageUtils.getUserSettings();
    const supervisorInput = document.querySelector('input[name="supervisor"]');
    if (supervisorInput && settings.defaultSupervisor) {
      supervisorInput.value = settings.defaultSupervisor;
    }

    const contractorInput = document.querySelector('input[name="contractorName"]');
    if (contractorInput && settings.defaultContractor) {
      contractorInput.value = settings.defaultContractor;
    }
  }

  /**
   * Configura eventos globales
   */
  static setupGlobalEvents() {
    // Detectar cambios sin guardar
    window.addEventListener('beforeunload', (e) => {
      if (DataManager.currentReport && DataManager.currentReport.metadata.changes > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Sincronizar cada 5 minutos si hay internet
    setInterval(() => {
      if (navigator.onLine) {
        DataManager.syncPendingReports();
      }
    }, 5 * 60 * 1000);

    // Limpiar datos viejos diariamente
    setInterval(() => {
      DataManager.cleanup();
    }, 24 * 60 * 60 * 1000);

    // Menu de navegación (si existe)
    this.setupNavigation();

    // Botones de utilidades
    this.setupUtilityButtons();
  }

  /**
   * Configura navegación
   */
  static setupNavigation() {
    const navButtons = document.querySelectorAll('[data-section]');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const section = btn.dataset.section;
        this.switchSection(section);
      });
    });
  }

  /**
   * Cambia de sección
   * @param {string} sectionName
   */
  static switchSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('[data-section-content]').forEach((el) => {
      el.classList.add('hidden');
    });

    // Mostrar sección seleccionada
    const section = document.querySelector(`[data-section-content="${sectionName}"]`);
    if (section) {
      section.classList.remove('hidden');
      section.scrollIntoView({ behavior: 'smooth' });

      // Actualizar botón activo
      document.querySelectorAll('[data-section]').forEach((btn) => {
        btn.classList.remove('active');
      });
      document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    }
  }

  /**
   * Configura botones de utilidad
   */
  static setupUtilityButtons() {
    // Botón de estadísticas
    const statsBtn = document.getElementById('stats-btn');
    if (statsBtn) {
      statsBtn.addEventListener('click', () => this.showStats());
    }

    // Botón de sincronización
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        const removeLoader = NotificationSystem.showLoader('Sincronizando...');
        try {
          const result = await DataManager.syncPendingReports();
          removeLoader();
          NotificationSystem.success(`${result.synced} reporte(s) sincronizado(s)`);
        } catch (error) {
          removeLoader();
          NotificationSystem.error(error.message);
        }
      });
    }

    // Botón de limpieza
    const cleanBtn = document.getElementById('clean-storage-btn');
    if (cleanBtn) {
      cleanBtn.addEventListener('click', async () => {
        const confirmed = await NotificationSystem.confirm(
          'Limpiar Datos',
          '¿Deseas eliminar reportes antiguos sincronizados?',
          { confirm: 'Limpiar', cancel: 'Cancelar' }
        );

        if (confirmed) {
          DataManager.cleanup();
          NotificationSystem.success('Datos limpiados');
        }
      });
    }

    // Botón de información
    const infoBtn = document.getElementById('info-btn');
    if (infoBtn) {
      infoBtn.addEventListener('click', () => this.showAbout());
    }
  }

  /**
   * Muestra estadísticas
   */
  static showStats() {
    const stats = DataManager.getReportStats();
    const storageInfo = DataManager.getStorageInfo();

    let html = '<div class="space-y-3">';

    if (stats) {
      html += `
        <div>
          <p class="text-sm font-semibold text-gray-700">REPORTE ACTUAL</p>
          <p class="text-xs text-gray-600">Estado: <strong>${stats.status}</strong></p>
          <p class="text-xs text-gray-600">Trabajadores: <strong>${stats.workerCount}</strong></p>
          <p class="text-xs text-gray-600">Horas: <strong>${stats.totalHours}</strong></p>
          <p class="text-xs text-gray-600">Tareas: <strong>${stats.taskCount}</strong></p>
          <p class="text-xs text-gray-600">Fotos: <strong>${stats.photoCount}</strong></p>
        </div>
      `;
    }

    if (storageInfo) {
      html += `
        <div>
          <p class="text-sm font-semibold text-gray-700">ALMACENAMIENTO</p>
          <p class="text-xs text-gray-600">Usado: <strong>${(storageInfo.totalSize / 1024).toFixed(1)} KB</strong></p>
          <p class="text-xs text-gray-600">Porcentaje: <strong>${storageInfo.usagePercentage}%</strong></p>
          <p class="text-xs text-gray-600">Borradores: <strong>${storageInfo.draftCount}</strong></p>
          <p class="text-xs text-gray-600">Reportes: <strong>${storageInfo.reportCount}</strong></p>
          <p class="text-xs text-gray-600">Pendientes de Envío: <strong>${storageInfo.pendingSyncCount}</strong></p>
        </div>
      `;
    }

    html += '</div>';

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">📊 Estadísticas</h2>
        <div id="stats-content">${html}</div>
        <div class="mt-6">
          <button id="close-stats" class="w-full px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white">Cerrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('close-stats').onclick = () => modal.remove();
  }

  /**
   * Muestra información sobre la app
   */
  static showAbout() {
    const html = `
      <div class="space-y-3 text-sm text-gray-700">
        <p><strong>Field Report Pro</strong></p>
        <p>Versión 1.0.0</p>
        <p>Sistema de reportes de campo para industria de construcción</p>
        <p style="margin-top: 15px; font-size: 11px; color: #999;">
          © 2024 Field Report Pro<br>
          Todos los derechos reservados
        </p>
        <p style="font-size: 11px; color: #999;">
          <strong>Características:</strong><br>
          ✓ Offline-first<br>
          ✓ Sincronización automática<br>
          ✓ Generación de PDF<br>
          ✓ Gestión de fotos<br>
          ✓ Webhooks a Make.com
        </p>
      </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">ℹ️ Acerca de</h2>
        <div id="about-content">${html}</div>
        <div class="mt-6">
          <button id="close-about" class="w-full px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white">Cerrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('close-about').onclick = () => modal.remove();
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => FieldReportApp.init());
} else {
  FieldReportApp.init();
}

// Exportar para testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FieldReportApp;
}
