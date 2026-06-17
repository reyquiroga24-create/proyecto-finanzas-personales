/**
 * FIELD REPORT PRO - SISTEMA DE NOTIFICACIONES
 * Toasts, alertas y notificaciones para el usuario
 */

class NotificationSystem {
  static init() {
    this.createNotificationContainer();
    window.addEventListener('storage-full', () => this.handleStorageFull());
    window.addEventListener('offline', () => this.showOfflineMode());
    window.addEventListener('online', () => this.showOnlineMode());
  }

  static createNotificationContainer() {
    if (document.getElementById('notification-container')) return;

    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'fixed top-0 right-0 z-50 p-4 max-w-md';
    document.body.appendChild(container);
  }

  /**
   * Muestra un toast de éxito
   * @param {string} message
   * @param {number} duration
   */
  static success(message, duration = CONFIG.UI_CONFIG.TOAST_DURATION) {
    this.showToast(message, 'success', duration);
  }

  /**
   * Muestra un toast de error
   * @param {string} message
   * @param {number} duration
   */
  static error(message, duration = CONFIG.UI_CONFIG.TOAST_DURATION) {
    this.showToast(message, 'error', duration);
    CONFIG.log('error', message);
  }

  /**
   * Muestra un toast de advertencia
   * @param {string} message
   * @param {number} duration
   */
  static warning(message, duration = CONFIG.UI_CONFIG.TOAST_DURATION) {
    this.showToast(message, 'warning', duration);
  }

  /**
   * Muestra un toast de información
   * @param {string} message
   * @param {number} duration
   */
  static info(message, duration = CONFIG.UI_CONFIG.TOAST_DURATION) {
    this.showToast(message, 'info', duration);
  }

  /**
   * Muestra un toast genérico
   * @param {string} message
   * @param {string} type - 'success', 'error', 'warning', 'info'
   * @param {number} duration
   */
  static showToast(message, type = 'info', duration = CONFIG.UI_CONFIG.TOAST_DURATION) {
    const container = document.getElementById('notification-container');
    if (!container) {
      this.createNotificationContainer();
      return this.showToast(message, type, duration);
    }

    const toast = document.createElement('div');
    const toastId = `toast_${Date.now()}`;
    toast.id = toastId;
    toast.className = `toast toast-${type} mb-3 p-4 rounded-lg shadow-lg animate-slideIn`;

    // Estilos según tipo
    const styles = {
      success: 'bg-green-500 text-white',
      error: 'bg-red-500 text-white',
      warning: 'bg-yellow-500 text-white',
      info: 'bg-blue-500 text-white',
    };

    toast.className += ` ${styles[type] || styles.info}`;

    // Contenido
    const content = document.createElement('div');
    content.className = 'flex items-center justify-between';

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    content.appendChild(messageSpan);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.className = 'ml-4 font-bold cursor-pointer hover:opacity-80';
    closeBtn.onclick = () => {
      toast.remove();
      clearTimeout(timeoutId);
    };
    content.appendChild(closeBtn);

    toast.appendChild(content);
    container.appendChild(toast);

    // Auto-remove
    const timeoutId = setTimeout(() => {
      toast.classList.add('animate-slideOut');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    // Retornar ID para control manual
    return toastId;
  }

  /**
   * Muestra un modal de confirmación
   * @param {string} title
   * @param {string} message
   * @param {Object} buttons - { confirm: string, cancel: string }
   * @returns {Promise<boolean>}
   */
  static async confirm(title, message, buttons = {}) {
    const confirmBtnText = buttons.confirm || 'Aceptar';
    const cancelBtnText = buttons.cancel || 'Cancelar';

    return new Promise((resolve) => {
      const modal = this.createModal('confirm');

      const titleEl = modal.querySelector('.modal-title');
      titleEl.textContent = title;

      const contentEl = modal.querySelector('.modal-content');
      contentEl.innerHTML = `<p class="text-gray-700">${message}</p>`;

      const buttonsEl = modal.querySelector('.modal-buttons');
      buttonsEl.innerHTML = '';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800';
      cancelBtn.textContent = cancelBtnText;
      cancelBtn.onclick = () => {
        modal.remove();
        resolve(false);
      };

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white';
      confirmBtn.textContent = confirmBtnText;
      confirmBtn.onclick = () => {
        modal.remove();
        resolve(true);
      };

      buttonsEl.appendChild(cancelBtn);
      buttonsEl.appendChild(confirmBtn);
    });
  }

  /**
   * Muestra un modal de alerta
   * @param {string} title
   * @param {string} message
   * @returns {Promise<void>}
   */
  static async alert(title, message) {
    return new Promise((resolve) => {
      const modal = this.createModal('alert');

      const titleEl = modal.querySelector('.modal-title');
      titleEl.textContent = title;

      const contentEl = modal.querySelector('.modal-content');
      contentEl.innerHTML = `<p class="text-gray-700">${message}</p>`;

      const buttonsEl = modal.querySelector('.modal-buttons');
      buttonsEl.innerHTML = '';

      const okBtn = document.createElement('button');
      okBtn.className = 'px-6 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white';
      okBtn.textContent = 'OK';
      okBtn.onclick = () => {
        modal.remove();
        resolve();
      };

      buttonsEl.appendChild(okBtn);

      // Enter para cerrar
      const handler = (e) => {
        if (e.key === 'Enter') {
          okBtn.click();
          document.removeEventListener('keydown', handler);
        }
      };
      document.addEventListener('keydown', handler);
    });
  }

  /**
   * Muestra un modal prompt para input de usuario
   * @param {string} title
   * @param {string} message
   * @param {string} defaultValue
   * @returns {Promise<string|null>}
   */
  static async prompt(title, message, defaultValue = '') {
    return new Promise((resolve) => {
      const modal = this.createModal('prompt');

      const titleEl = modal.querySelector('.modal-title');
      titleEl.textContent = title;

      const contentEl = modal.querySelector('.modal-content');
      contentEl.innerHTML = `
        <p class="text-gray-700 mb-3">${message}</p>
        <input
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          id="prompt-input"
          value="${defaultValue}"
          autofocus
        />
      `;

      const inputEl = contentEl.querySelector('#prompt-input');

      const buttonsEl = modal.querySelector('.modal-buttons');
      buttonsEl.innerHTML = '';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.onclick = () => {
        modal.remove();
        resolve(null);
      };

      const okBtn = document.createElement('button');
      okBtn.className = 'px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white';
      okBtn.textContent = 'OK';
      okBtn.onclick = () => {
        const value = inputEl.value;
        modal.remove();
        resolve(value);
      };

      inputEl.onkeypress = (e) => {
        if (e.key === 'Enter') okBtn.click();
      };

      buttonsEl.appendChild(cancelBtn);
      buttonsEl.appendChild(okBtn);

      setTimeout(() => inputEl.focus(), 100);
    });
  }

  /**
   * Crea un modal base
   * @param {string} type
   * @returns {HTMLElement}
   */
  static createModal(type) {
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn';

    const modal = document.createElement('div');
    modal.className = 'bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-scaleIn';
    modal.innerHTML = `
      <div class="p-6">
        <h2 class="modal-title text-xl font-bold text-gray-800 mb-4"></h2>
        <div class="modal-content mb-6"></div>
        <div class="modal-buttons flex gap-3 justify-end"></div>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Click en backdrop para cerrar (solo para algunos modales)
    backdrop.onclick = (e) => {
      if (e.target === backdrop && type !== 'confirm') {
        backdrop.remove();
      }
    };

    return modal;
  }

  /**
   * Muestra indicador de carga
   * @param {string} message
   * @returns {Function} - Función para remover el loader
   */
  static showLoader(message = 'Procesando...') {
    const loaderId = `loader_${Date.now()}`;
    const container = document.getElementById('notification-container') || this.createNotificationContainer();

    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'loader p-4 bg-blue-500 text-white rounded-lg shadow-lg flex items-center gap-3';
    loader.innerHTML = `
      <div class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
      <span>${message}</span>
    `;

    container.appendChild(loader);

    return () => {
      const el = document.getElementById(loaderId);
      if (el) el.remove();
    };
  }

  /**
   * Muestra modo offline
   */
  static showOfflineMode() {
    this.warning(CONFIG.MESSAGES.WARNING.OFFLINE_MODE, 5000);
    document.body.classList.add('offline-mode');
    CONFIG.setOfflineMode(true);
  }

  /**
   * Muestra modo online
   */
  static showOnlineMode() {
    this.success('✓ Conexión restaurada', 3000);
    document.body.classList.remove('offline-mode');
    CONFIG.setOfflineMode(false);
  }

  /**
   * Maneja evento de almacenamiento lleno
   */
  static handleStorageFull() {
    this.error(CONFIG.MESSAGES.ERROR.STORAGE_FULL, 5000);
  }

  /**
   * Muestra notificación de progreso
   * @param {number} percent - 0 a 100
   * @param {string} message
   * @returns {Function} - Función para actualizar
   */
  static showProgress(message = 'Procesando...') {
    const progressId = `progress_${Date.now()}`;
    const container = document.getElementById('notification-container') || this.createNotificationContainer();

    const progress = document.createElement('div');
    progress.id = progressId;
    progress.className = 'progress p-4 bg-gray-100 rounded-lg shadow-lg';
    progress.innerHTML = `
      <div class="mb-2 font-semibold text-gray-700">${message}</div>
      <div class="w-full bg-gray-300 rounded-full h-2">
        <div class="progress-bar bg-blue-500 h-2 rounded-full transition-all" style="width: 0%"></div>
      </div>
      <div class="progress-text text-sm text-gray-600 mt-1">0%</div>
    `;

    container.appendChild(progress);

    return (percent) => {
      const el = document.getElementById(progressId);
      if (el) {
        const bar = el.querySelector('.progress-bar');
        const text = el.querySelector('.progress-text');
        bar.style.width = `${percent}%`;
        text.textContent = `${percent}%`;

        if (percent >= 100) {
          setTimeout(() => el.remove(), 500);
        }
      }
    };
  }

  /**
   * Limpia todas las notificaciones
   */
  static clearAll() {
    const container = document.getElementById('notification-container');
    if (container) {
      container.innerHTML = '';
    }
  }
}

// Inicializar automáticamente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NotificationSystem.init());
} else {
  NotificationSystem.init();
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationSystem;
}
