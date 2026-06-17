/**
 * FIELD REPORT PRO - MANEJADOR DE FORMULARIOS
 * Validación, captura y procesamiento de eventos del formulario
 */

class FormHandler {
  static init() {
    this.bindProjectSection();
    this.bindGeneralSection();
    this.bindCrewSection();
    this.bindTasksSection();
    this.bindPhotosSection();
    this.bindSafetySection();
    this.bindFormActions();

    CONFIG.log('info', 'FormHandler initialized');
  }

  /**
   * Vincula eventos de sección de proyecto
   */
  static bindProjectSection() {
    const form = document.getElementById('project-form');
    if (!form) return;

    form.addEventListener('change', (e) => {
      if (e.target.name === 'projectName') {
        DataManager.currentReport.projectData.name = Validator.sanitize(e.target.value, 'string');
      } else if (e.target.name === 'projectLocation') {
        DataManager.currentReport.projectData.location = Validator.sanitize(e.target.value, 'string');
      } else if (e.target.name === 'projectAddress') {
        DataManager.currentReport.projectData.address = Validator.sanitize(e.target.value, 'string');
      } else if (e.target.name === 'contractorName') {
        DataManager.currentReport.projectData.contractorName = Validator.sanitize(e.target.value, 'string');
      } else if (e.target.name === 'projectNumber') {
        DataManager.currentReport.projectData.projectNumber = Validator.sanitize(e.target.value, 'string');
      }

      DataManager.currentReport.metadata.changes++;
      Validator.clearErrors();
    });
  }

  /**
   * Vincula eventos de sección general
   */
  static bindGeneralSection() {
    const form = document.getElementById('general-form');
    if (!form) return;

    form.addEventListener('change', (e) => {
      if (e.target.name === 'reportDate') {
        DataManager.currentReport.generalData.reportDate = e.target.value;
      } else if (e.target.name === 'supervisor') {
        DataManager.currentReport.generalData.supervisor = Validator.sanitize(e.target.value, 'string');
      } else if (e.target.name === 'weather') {
        DataManager.currentReport.generalData.weather = e.target.value;
      } else if (e.target.name === 'temperature') {
        DataManager.currentReport.generalData.temperature = Validator.sanitize(e.target.value, 'number');
      } else if (e.target.name === 'notes') {
        DataManager.currentReport.generalData.notes = Validator.sanitize(e.target.value, 'string');
      }

      DataManager.currentReport.metadata.changes++;
      Validator.clearErrors();
    });
  }

  /**
   * Vincula eventos de sección de personal
   */
  static bindCrewSection() {
    const addBtn = document.getElementById('add-worker-btn');
    const crewList = document.getElementById('crew-list');

    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showAddWorkerModal();
      });
    }

    if (crewList) {
      crewList.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'delete') {
          const workerId = e.target.closest('[data-worker-id]').dataset.workerId;
          DataManager.removeWorker(workerId);
          this.renderCrewList();
        } else if (e.target.dataset.action === 'edit') {
          const workerId = e.target.closest('[data-worker-id]').dataset.workerId;
          const worker = DataManager.currentReport.crew.find((w) => w.id === workerId);
          this.showEditWorkerModal(workerId, worker);
        }
      });
    }
  }

  /**
   * Muestra modal para agregar trabajador
   */
  static async showAddWorkerModal() {
    const form = document.createElement('form');
    form.className = 'space-y-4';
    form.innerHTML = `
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
        <input type="text" name="workerName" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Posición</label>
        <input type="text" name="position" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ej: Maestro, Peón, etc">
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Horas Trabajadas *</label>
        <input type="number" name="hoursWorked" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" max="24" step="0.5" required>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
        <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="Presente">Presente</option>
          <option value="Ausente">Ausente</option>
          <option value="Medio Día">Medio Día</option>
          <option value="Enfermo">Enfermo</option>
          <option value="Vacaciones">Vacaciones</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Notas</label>
        <textarea name="notes" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" rows="2"></textarea>
      </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Agregar Trabajador</h2>
        <div id="worker-form-container"></div>
        <div class="flex gap-3 justify-end mt-6">
          <button id="cancel-btn" class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800">Cancelar</button>
          <button id="save-btn" class="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white">Guardar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#worker-form-container').appendChild(form);

    return new Promise((resolve) => {
      modal.querySelector('#cancel-btn').onclick = () => {
        modal.remove();
        resolve(false);
      };

      modal.querySelector('#save-btn').onclick = () => {
        const formData = new FormData(form);
        const worker = {
          workerName: formData.get('workerName'),
          position: formData.get('position'),
          hoursWorked: parseFloat(formData.get('hoursWorked')),
          status: formData.get('status'),
          notes: formData.get('notes'),
        };

        try {
          DataManager.addWorker(worker);
          this.renderCrewList();
          NotificationSystem.success(CONFIG.MESSAGES.SUCCESS.DATA_SAVED);
          modal.remove();
          resolve(true);
        } catch (error) {
          NotificationSystem.error(error.message);
        }
      };
    });
  }

  /**
   * Muestra modal para editar trabajador
   */
  static async showEditWorkerModal(workerId, worker) {
    const form = document.createElement('form');
    form.className = 'space-y-4';
    form.innerHTML = `
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
        <input type="text" name="workerName" value="${worker.workerName}" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Posición</label>
        <input type="text" name="position" value="${worker.position}" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Horas Trabajadas *</label>
        <input type="number" name="hoursWorked" value="${worker.hoursWorked}" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" max="24" step="0.5" required>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
        <select name="status" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="Presente" ${worker.status === 'Presente' ? 'selected' : ''}>Presente</option>
          <option value="Ausente" ${worker.status === 'Ausente' ? 'selected' : ''}>Ausente</option>
          <option value="Medio Día" ${worker.status === 'Medio Día' ? 'selected' : ''}>Medio Día</option>
          <option value="Enfermo" ${worker.status === 'Enfermo' ? 'selected' : ''}>Enfermo</option>
          <option value="Vacaciones" ${worker.status === 'Vacaciones' ? 'selected' : ''}>Vacaciones</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Notas</label>
        <textarea name="notes" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" rows="2">${worker.notes}</textarea>
      </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Editar Trabajador</h2>
        <div id="worker-form-container"></div>
        <div class="flex gap-3 justify-end mt-6">
          <button id="cancel-btn" class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800">Cancelar</button>
          <button id="save-btn" class="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white">Guardar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#worker-form-container').appendChild(form);

    return new Promise((resolve) => {
      modal.querySelector('#cancel-btn').onclick = () => {
        modal.remove();
        resolve(false);
      };

      modal.querySelector('#save-btn').onclick = () => {
        const formData = new FormData(form);
        const updates = {
          workerName: formData.get('workerName'),
          position: formData.get('position'),
          hoursWorked: parseFloat(formData.get('hoursWorked')),
          status: formData.get('status'),
          notes: formData.get('notes'),
        };

        try {
          DataManager.updateWorker(workerId, updates);
          this.renderCrewList();
          NotificationSystem.success(CONFIG.MESSAGES.SUCCESS.DATA_SAVED);
          modal.remove();
          resolve(true);
        } catch (error) {
          NotificationSystem.error(error.message);
        }
      };
    });
  }

  /**
   * Renderiza la lista de trabajadores
   */
  static renderCrewList() {
    const crewList = document.getElementById('crew-list');
    if (!crewList || !DataManager.currentReport) return;

    crewList.innerHTML = '';

    if (DataManager.currentReport.crew.length === 0) {
      crewList.innerHTML = '<p class="text-gray-500 text-center py-4">No hay trabajadores agregados</p>';
      return;
    }

    DataManager.currentReport.crew.forEach((worker) => {
      const item = document.createElement('div');
      item.className = 'crew-item p-3 bg-gray-50 rounded border border-gray-200 flex justify-between items-center';
      item.dataset.workerId = worker.id;
      item.innerHTML = `
        <div class="flex-1">
          <p class="font-semibold text-gray-800">${worker.workerName}</p>
          <p class="text-sm text-gray-600">${worker.position || 'Sin posición'} - ${worker.hoursWorked} hrs</p>
          <p class="text-xs text-gray-500">${worker.status}</p>
        </div>
        <div class="flex gap-2">
          <button data-action="edit" class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded">Editar</button>
          <button data-action="delete" class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded">Eliminar</button>
        </div>
      `;
      crewList.appendChild(item);
    });

    // Actualizar estadísticas
    this.updateCrewStats();
  }

  /**
   * Actualiza estadísticas de personal
   */
  static updateCrewStats() {
    const stats = DataManager.currentReport.crew;
    const totalHours = stats.reduce((sum, w) => sum + parseFloat(w.hoursWorked || 0), 0);

    const statsEl = document.getElementById('crew-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <p class="text-sm text-gray-700"><strong>Personal:</strong> ${stats.length} trabajadores</p>
        <p class="text-sm text-gray-700"><strong>Total Horas:</strong> ${totalHours.toFixed(1)} hrs</p>
        <p class="text-sm text-gray-700"><strong>Promedio:</strong> ${(totalHours / stats.length).toFixed(1)} hrs/persona</p>
      `;
    }
  }

  /**
   * Vincula eventos de sección de tareas
   */
  static bindTasksSection() {
    const addBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('tasks-list');

    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showAddTaskModal();
      });
    }

    if (taskList) {
      taskList.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'delete') {
          const taskId = e.target.closest('[data-task-id]').dataset.taskId;
          DataManager.removeTask(taskId);
          this.renderTasksList();
        }
      });
    }
  }

  /**
   * Muestra modal para agregar tarea
   */
  static async showAddTaskModal() {
    const form = document.createElement('form');
    form.className = 'space-y-4';
    form.innerHTML = `
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Descripción *</label>
        <textarea name="description" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3" required placeholder="Describe la tarea realizada..."></textarea>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Fase</label>
        <select name="phase" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
          ${Object.values(CONFIG.ENUMS.TASK_PHASE).map((phase) => `<option value="${phase}">${phase}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Porcentaje de Avance (%)</label>
        <input type="number" name="percentage" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" max="100" value="50">
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Hora Inicio</label>
          <input type="time" name="startTime" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Hora Fin</label>
          <input type="time" name="endTime" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">Notas</label>
        <textarea name="notes" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" rows="2"></textarea>
      </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 my-4 p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Agregar Tarea</h2>
        <div id="task-form-container"></div>
        <div class="flex gap-3 justify-end mt-6">
          <button id="cancel-btn" class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800">Cancelar</button>
          <button id="save-btn" class="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white">Guardar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#task-form-container').appendChild(form);

    return new Promise((resolve) => {
      modal.querySelector('#cancel-btn').onclick = () => {
        modal.remove();
        resolve(false);
      };

      modal.querySelector('#save-btn').onclick = () => {
        const formData = new FormData(form);
        const task = {
          description: formData.get('description'),
          phase: formData.get('phase'),
          percentage: parseInt(formData.get('percentage')),
          startTime: formData.get('startTime'),
          endTime: formData.get('endTime'),
          notes: formData.get('notes'),
        };

        try {
          DataManager.addTask(task);
          this.renderTasksList();
          NotificationSystem.success(CONFIG.MESSAGES.SUCCESS.DATA_SAVED);
          modal.remove();
          resolve(true);
        } catch (error) {
          NotificationSystem.error(error.message);
        }
      };
    });
  }

  /**
   * Renderiza lista de tareas
   */
  static renderTasksList() {
    const taskList = document.getElementById('tasks-list');
    if (!taskList || !DataManager.currentReport) return;

    taskList.innerHTML = '';

    if (DataManager.currentReport.tasks.length === 0) {
      taskList.innerHTML = '<p class="text-gray-500 text-center py-4">No hay tareas agregadas</p>';
      return;
    }

    DataManager.currentReport.tasks.forEach((task) => {
      const item = document.createElement('div');
      item.className = 'task-item p-3 bg-gray-50 rounded border border-gray-200';
      item.dataset.taskId = task.id;
      item.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="font-semibold text-gray-800">${task.description}</p>
            <p class="text-sm text-gray-600">Fase: ${task.phase} - ${task.percentage}% completado</p>
          </div>
          <button data-action="delete" class="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded">✕</button>
        </div>
        ${task.startTime ? `<p class="text-xs text-gray-500">⏰ ${task.startTime} - ${task.endTime}</p>` : ''}
      `;
      taskList.appendChild(item);
    });
  }

  /**
   * Vincula eventos de sección de fotos
   */
  static bindPhotosSection() {
    const uploadBtn = document.getElementById('upload-photo-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const photosList = document.getElementById('photos-list');

    if (uploadBtn) {
      uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handlePhotoUpload();
      });
    }

    if (cameraBtn) {
      cameraBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          const blob = await PhotoManager.captureFromCamera();
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          this.processPhotoFile(file);
        } catch (error) {
          NotificationSystem.error(error.message);
        }
      });
    }

    if (photosList) {
      photosList.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'delete') {
          const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
          DataManager.removePhoto(photoId);
          this.renderPhotosList();
        }
      });
    }
  }

  /**
   * Maneja carga de fotos
   */
  static async handlePhotoUpload() {
    try {
      const file = await PhotoManager.openFileDialog();
      if (file) {
        this.processPhotoFile(file);
      }
    } catch (error) {
      NotificationSystem.error(error.message);
    }
  }

  /**
   * Procesa archivo de foto
   */
  static async processPhotoFile(file) {
    try {
      // Validar
      const validation = PhotoManager.validateFile(file);
      if (!validation.valid) {
        NotificationSystem.error(validation.error);
        return;
      }

      // Pedir descripción
      const description = await NotificationSystem.prompt('Agregar Foto', 'Describe la foto (¿qué se ve, dónde, para qué?)', '');
      if (!description) return;

      // Pedir fase (opcional)
      const phase = await NotificationSystem.prompt('Fase del Proyecto', 'Selecciona la fase (opcional)', '');

      const removeLoader = NotificationSystem.showLoader('Procesando foto...');

      // Agregar foto
      const photo = await PhotoManager.addPhoto(file, description, phase);
      DataManager.addPhoto(photo);

      removeLoader();
      this.renderPhotosList();
    } catch (error) {
      NotificationSystem.error(error.message);
    }
  }

  /**
   * Renderiza lista de fotos
   */
  static renderPhotosList() {
    const photosList = document.getElementById('photos-list');
    if (!photosList || !DataManager.currentReport) return;

    photosList.innerHTML = '';

    if (DataManager.currentReport.photos.length === 0) {
      photosList.innerHTML = '<p class="text-gray-500 text-center py-4">No hay fotos agregadas</p>';
      return;
    }

    DataManager.currentReport.photos.forEach((photo) => {
      const preview = PhotoManager.createPhotoPreview(photo);
      preview.querySelector('[data-action="delete"]').onclick = () => {
        DataManager.removePhoto(photo.id);
        this.renderPhotosList();
      };
      photosList.appendChild(preview);
    });

    // Actualizar contador
    const photoCount = document.getElementById('photo-count');
    if (photoCount) {
      photoCount.textContent = `${DataManager.currentReport.photos.length}/${CONFIG.FORM_CONFIG.PHOTOS_MAX} fotos`;
    }
  }

  /**
   * Vincula eventos de sección de seguridad
   */
  static bindSafetySection() {
    const form = document.getElementById('safety-form');
    if (!form) return;

    form.addEventListener('change', (e) => {
      if (e.target.name === 'hazardsIdentified') {
        DataManager.currentReport.safetyData.hazardsIdentified = Validator.sanitize(e.target.value, 'string');
      } else if (e.target.name === 'jsa') {
        DataManager.currentReport.safetyData.jsa = e.target.checked;
      } else if (e.target.name === 'toolboxTalk') {
        DataManager.currentReport.safetyData.toolboxTalk = e.target.checked;
      } else if (e.target.name === 'preventiveMeasures') {
        DataManager.currentReport.safetyData.preventiveMeasures = Validator.sanitize(e.target.value, 'string');
      }

      DataManager.currentReport.metadata.changes++;
    });
  }

  /**
   * Vincula acciones del formulario (Guardar, Enviar, etc)
   */
  static bindFormActions() {
    const saveBtn = document.getElementById('save-report-btn');
    const submitBtn = document.getElementById('submit-report-btn');
    const exportBtn = document.getElementById('export-report-btn');
    const newBtn = document.getElementById('new-report-btn');

    if (saveBtn) {
      saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          DataManager.saveDraft();
        } catch (error) {
          NotificationSystem.error(error.message);
        }
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          const confirmed = await NotificationSystem.confirm(
            'Enviar Reporte',
            '¿Está seguro de que desea enviar este reporte? No podrá editarlo después.',
            { confirm: 'Enviar', cancel: 'Cancelar' }
          );

          if (confirmed) {
            const removeLoader = NotificationSystem.showLoader('Enviando reporte...');
            await DataManager.submitReport();
            removeLoader();
            this.reset();
          }
        } catch (error) {
          NotificationSystem.error(error.message);
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showExportOptions();
      });
    }

    if (newBtn) {
      newBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const confirmed = await NotificationSystem.confirm(
          'Nuevo Reporte',
          '¿Desea crear un nuevo reporte? Se perderán los cambios no guardados.',
          { confirm: 'Crear', cancel: 'Cancelar' }
        );

        if (confirmed) {
          this.reset();
          NotificationSystem.success('Nuevo reporte creado');
        }
      });
    }
  }

  /**
   * Muestra opciones de exportación
   */
  static async showExportOptions() {
    const html = `
      <div class="space-y-2">
        <p class="text-gray-700 text-sm mb-3">Selecciona el formato de exportación:</p>
        <button id="export-json" class="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">📄 JSON</button>
        <button id="export-csv" class="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded">📊 CSV</button>
        <button id="export-pdf" class="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded">📋 PDF</button>
      </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Exportar Reporte</h2>
        <div id="export-options">${html}</div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('export-json').onclick = () => {
      const blob = WebhookSender.exportAsJSON(DataManager.currentReport);
      this.downloadBlob(blob, `reporte_${DateUtils.today()}.json`);
      modal.remove();
    };

    document.getElementById('export-csv').onclick = () => {
      const csv = WebhookSender.exportAsCSV(DataManager.currentReport);
      const blob = new Blob([csv], { type: 'text/csv' });
      this.downloadBlob(blob, `reporte_${DateUtils.today()}.csv`);
      modal.remove();
    };

    document.getElementById('export-pdf').onclick = () => {
      ReportGenerator.generatePDF(DataManager.currentReport);
      modal.remove();
    };
  }

  /**
   * Descarga un blob
   */
  static downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Resetea el formulario
   */
  static reset() {
    DataManager.currentReport = DataManager.createNewReport();
    this.renderCrewList();
    this.renderTasksList();
    this.renderPhotosList();

    // Limpiar inputs del formulario
    document.querySelectorAll('input[type="text"], input[type="date"], input[type="number"], select, textarea').forEach((el) => {
      el.value = '';
    });

    // Establecer valores por defecto
    const reportDateInput = document.querySelector('input[name="reportDate"]');
    if (reportDateInput) {
      reportDateInput.value = DateUtils.today();
    }
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => FormHandler.init());
} else {
  FormHandler.init();
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormHandler;
}
