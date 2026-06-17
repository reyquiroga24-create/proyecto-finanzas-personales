/**
 * FIELD REPORT PRO - VALIDADOR DE DATOS
 * Validaciones de campos y lógica de negocio
 */

class Validator {
  /**
   * Valida un campo según las reglas configuradas
   * @param {string} fieldName - Nombre del campo
   * @param {*} value - Valor a validar
   * @returns {Object} - { valid: boolean, error: string|null }
   */
  static validateField(fieldName, value) {
    const rules = CONFIG.VALIDATION_RULES[fieldName];

    if (!rules) {
      CONFIG.log('warn', `No validation rules for field: ${fieldName}`);
      return { valid: true, error: null };
    }

    // Validar requerido
    if (rules.required && (value === '' || value === null || value === undefined)) {
      return { valid: false, error: `${fieldName} es requerido` };
    }

    if (!value && !rules.required) {
      return { valid: true, error: null };
    }

    // Validar longitud mínima
    if (rules.min && value.toString().length < rules.min) {
      return { valid: false, error: `${fieldName} debe tener al menos ${rules.min} caracteres` };
    }

    // Validar longitud máxima
    if (rules.max && value.toString().length > rules.max) {
      return { valid: false, error: `${fieldName} no puede exceder ${rules.max} caracteres` };
    }

    // Validar patrón regex
    if (rules.pattern && !rules.pattern.test(value.toString())) {
      return { valid: false, error: `${fieldName} tiene un formato inválido` };
    }

    // Validar opciones
    if (rules.options && !rules.options.includes(value)) {
      return { valid: false, error: `${fieldName} no es una opción válida` };
    }

    return { valid: true, error: null };
  }

  /**
   * Valida un reporte completo
   * @param {Object} reportData
   * @returns {Object} - { valid: boolean, errors: Object }
   */
  static validateReport(reportData) {
    const errors = {};

    // Sección Proyecto
    if (reportData.projectData) {
      const projectErrors = this.validateProjectSection(reportData.projectData);
      Object.assign(errors, projectErrors);
    }

    // Sección General
    if (reportData.generalData) {
      const generalErrors = this.validateGeneralSection(reportData.generalData);
      Object.assign(errors, generalErrors);
    }

    // Sección Crew
    if (reportData.crew && Array.isArray(reportData.crew)) {
      const crewErrors = this.validateCrewSection(reportData.crew);
      Object.assign(errors, crewErrors);
    }

    // Sección Tareas
    if (reportData.tasks && Array.isArray(reportData.tasks)) {
      const tasksErrors = this.validateTasksSection(reportData.tasks);
      Object.assign(errors, tasksErrors);
    }

    const valid = Object.keys(errors).length === 0;

    if (!valid) {
      CONFIG.log('warn', 'Report validation failed', errors);
    }

    return { valid, errors };
  }

  /**
   * Valida sección de proyecto
   * @param {Object} projectData
   * @returns {Object}
   */
  static validateProjectSection(projectData) {
    const errors = {};

    if (!projectData.name || projectData.name.trim() === '') {
      errors['projectName'] = 'El nombre del proyecto es requerido';
    } else if (projectData.name.length < 3) {
      errors['projectName'] = 'El nombre del proyecto debe tener al menos 3 caracteres';
    }

    if (projectData.location && projectData.location.length > 100) {
      errors['projectLocation'] = 'La ubicación no puede exceder 100 caracteres';
    }

    if (projectData.contractorName && projectData.contractorName.length < 2) {
      errors['contractorName'] = 'El nombre del contratista debe tener al menos 2 caracteres';
    }

    return errors;
  }

  /**
   * Valida sección general
   * @param {Object} generalData
   * @returns {Object}
   */
  static validateGeneralSection(generalData) {
    const errors = {};

    if (!generalData.reportDate || !DateUtils.isValidDate(generalData.reportDate)) {
      errors['reportDate'] = 'La fecha del reporte es inválida';
    }

    if (!generalData.supervisor || generalData.supervisor.trim() === '') {
      errors['supervisor'] = 'El nombre del supervisor es requerido';
    }

    if (generalData.temperature !== undefined && generalData.temperature !== null) {
      const temp = parseFloat(generalData.temperature);
      if (isNaN(temp) || temp < -50 || temp > 60) {
        errors['temperature'] = 'La temperatura debe estar entre -50°C y 60°C';
      }
    }

    return errors;
  }

  /**
   * Valida sección de personal
   * @param {Array} crew
   * @returns {Object}
   */
  static validateCrewSection(crew) {
    const errors = {};

    if (crew.length === 0) {
      errors['crew'] = 'Debe agregar al menos un trabajador';
      return errors;
    }

    if (crew.length > CONFIG.FORM_CONFIG.CREW_MAX) {
      errors['crew'] = `No puede exceder ${CONFIG.FORM_CONFIG.CREW_MAX} trabajadores`;
      return errors;
    }

    let totalHours = 0;

    crew.forEach((worker, index) => {
      if (!worker.workerName || worker.workerName.trim() === '') {
        errors[`crew_${index}_name`] = 'El nombre del trabajador es requerido';
      }

      if (!worker.hoursWorked || isNaN(parseFloat(worker.hoursWorked))) {
        errors[`crew_${index}_hours`] = 'Las horas deben ser un número válido';
      } else {
        const hours = parseFloat(worker.hoursWorked);
        if (hours < 0 || hours > 24) {
          errors[`crew_${index}_hours`] = 'Las horas deben estar entre 0 y 24';
        }
        totalHours += hours;
      }
    });

    if (totalHours > crew.length * 24) {
      errors['totalHours'] = 'Las horas totales exceden lo posible';
    }

    return errors;
  }

  /**
   * Valida sección de tareas
   * @param {Array} tasks
   * @returns {Object}
   */
  static validateTasksSection(tasks) {
    const errors = {};

    if (tasks.length === 0) {
      errors['tasks'] = 'Debe agregar al menos una tarea';
      return errors;
    }

    tasks.forEach((task, index) => {
      if (!task.description || task.description.trim() === '') {
        errors[`task_${index}_description`] = 'La descripción de la tarea es requerida';
      } else if (task.description.length < 5) {
        errors[`task_${index}_description`] = 'La descripción debe tener al menos 5 caracteres';
      }

      if (task.percentage !== undefined && task.percentage !== null) {
        const percent = parseFloat(task.percentage);
        if (isNaN(percent) || percent < 0 || percent > 100) {
          errors[`task_${index}_percentage`] = 'El porcentaje debe estar entre 0 y 100';
        }
      }
    });

    return errors;
  }

  /**
   * Valida fotos
   * @param {Array} photos
   * @returns {Object}
   */
  static validatePhotos(photos) {
    const errors = {};

    if (photos.length > CONFIG.FORM_CONFIG.PHOTOS_MAX) {
      errors['photos'] = `Máximo ${CONFIG.FORM_CONFIG.PHOTOS_MAX} fotos permitidas`;
      return errors;
    }

    photos.forEach((photo, index) => {
      if (!photo.description || photo.description.trim() === '') {
        errors[`photo_${index}_description`] = 'La descripción de la foto es requerida';
      }

      if (!photo.file && !photo.base64) {
        errors[`photo_${index}_file`] = 'La foto es requerida';
      }
    });

    return errors;
  }

  /**
   * Valida un archivo de foto
   * @param {File} file
   * @returns {Object}
   */
  static validatePhotoFile(file) {
    const errors = {};

    if (!file) {
      return { valid: false, error: 'Archivo requerido' };
    }

    // Validar tamaño
    if (file.size > CONFIG.FORM_CONFIG.PHOTO_MAX_SIZE) {
      return {
        valid: false,
        error: `El archivo excede el tamaño máximo (${CONFIG.FORM_CONFIG.PHOTO_MAX_SIZE / 1024 / 1024}MB)`,
      };
    }

    // Validar tipo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Solo se permiten archivos JPEG, PNG, WebP o GIF',
      };
    }

    return { valid: true, error: null };
  }

  /**
   * Valida un URL de webhook
   * @param {string} url
   * @returns {Object}
   */
  static validateWebhookURL(url) {
    try {
      new URL(url);
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { valid: false, error: 'URL debe usar HTTP o HTTPS' };
      }
      return { valid: true, error: null };
    } catch (error) {
      return { valid: false, error: 'URL inválida' };
    }
  }

  /**
   * Valida horas de entrada/salida
   * @param {string} startTime - HH:mm
   * @param {string} endTime - HH:mm
   * @returns {Object}
   */
  static validateTimeRange(startTime, endTime) {
    if (!DateUtils.isValidTime(startTime)) {
      return { valid: false, error: 'Hora de inicio inválida' };
    }

    if (!DateUtils.isValidTime(endTime)) {
      return { valid: false, error: 'Hora de fin inválida' };
    }

    const start = DateUtils.timeToMinutes(startTime);
    const end = DateUtils.timeToMinutes(endTime);

    if (start >= end) {
      return { valid: false, error: 'La hora de fin debe ser posterior a la hora de inicio' };
    }

    return { valid: true, error: null };
  }

  /**
   * Limpia y normaliza datos de entrada
   * @param {*} value
   * @param {string} type
   * @returns {*}
   */
  static sanitize(value, type = 'string') {
    if (value === null || value === undefined) {
      return type === 'number' ? 0 : '';
    }

    switch (type) {
      case 'string':
        return value.toString().trim();

      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;

      case 'integer':
        const int = parseInt(value, 10);
        return isNaN(int) ? 0 : int;

      case 'email':
        return value.toString().trim().toLowerCase();

      case 'date':
        return DateUtils.formatDate(new Date(value));

      case 'time':
        const timeStr = value.toString().trim();
        if (!DateUtils.isValidTime(timeStr)) {
          return '00:00';
        }
        return timeStr;

      case 'percentage':
        const percent = parseFloat(value);
        return Math.max(0, Math.min(100, isNaN(percent) ? 0 : percent));

      case 'currency':
        const currency = parseFloat(value);
        return (isNaN(currency) ? 0 : currency).toFixed(2);

      default:
        return value;
    }
  }

  /**
   * Valida si un reporte tiene cambios significativos
   * @param {Object} original
   * @param {Object} modified
   * @returns {boolean}
   */
  static hasSignificantChanges(original, modified) {
    const keysToIgnore = ['savedAt', 'syncedAt', 'id'];
    const originalStr = JSON.stringify(original, (key, value) => {
      return keysToIgnore.includes(key) ? undefined : value;
    });
    const modifiedStr = JSON.stringify(modified, (key, value) => {
      return keysToIgnore.includes(key) ? undefined : value;
    });

    return originalStr !== modifiedStr;
  }

  /**
   * Obtiene todos los errores de validación en formato legible
   * @param {Object} errors
   * @returns {string}
   */
  static getErrorSummary(errors) {
    return Object.values(errors).join('\n');
  }

  /**
   * Marca campos con errores en el formulario
   * @param {Object} errors
   */
  static highlightErrors(errors) {
    // Limpiar previos
    document.querySelectorAll('.field-error').forEach((el) => {
      el.classList.remove('field-error');
    });

    // Marcar nuevos errores
    Object.keys(errors).forEach((fieldName) => {
      const field = document.querySelector(`[name="${fieldName}"], [data-field="${fieldName}"]`);
      if (field) {
        field.classList.add('field-error');
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  /**
   * Limpia marcas de error
   */
  static clearErrors() {
    document.querySelectorAll('.field-error').forEach((el) => {
      el.classList.remove('field-error');
    });
  }
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validator;
}
