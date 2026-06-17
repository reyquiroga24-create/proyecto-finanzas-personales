/**
 * FIELD REPORT PRO - UTILIDADES DE FECHA Y HORA
 * Formateo, cálculo y conversión de fechas para reportes
 */

class DateUtils {
  /**
   * Formatea una fecha a formato YYYY-MM-DD
   * @param {Date|string} date
   * @returns {string}
   */
  static formatDate(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formatea una fecha a formato DD/MM/YYYY (para mostrar)
   * @param {Date|string} date
   * @returns {string}
   */
  static formatDateES(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  /**
   * Formatea una hora a formato HH:mm
   * @param {Date|string} time
   * @returns {string}
   */
  static formatTime(time) {
    if (typeof time === 'string') {
      time = new Date(`2000-01-01T${time}`);
    }
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Formatea una fecha completa con hora (DD/MM/YYYY HH:mm)
   * @param {Date|string} datetime
   * @returns {string}
   */
  static formatDateTime(datetime) {
    if (typeof datetime === 'string') {
      datetime = new Date(datetime);
    }
    return `${this.formatDateES(datetime)} ${this.formatTime(datetime)}`;
  }

  /**
   * Formatea una fecha completa ISO (YYYY-MM-DDTHH:mm:ss)
   * @param {Date|string} datetime
   * @returns {string}
   */
  static formatISO(datetime) {
    if (typeof datetime === 'string') {
      datetime = new Date(datetime);
    }
    return datetime.toISOString();
  }

  /**
   * Obtiene la fecha actual en formato YYYY-MM-DD
   * @returns {string}
   */
  static today() {
    return this.formatDate(new Date());
  }

  /**
   * Obtiene la hora actual en formato HH:mm
   * @returns {string}
   */
  static now() {
    return this.formatTime(new Date());
  }

  /**
   * Obtiene la fecha y hora actual en formato ISO
   * @returns {string}
   */
  static nowISO() {
    return this.formatISO(new Date());
  }

  /**
   * Calcula la diferencia en horas entre dos fechas/horas
   * @param {string} startTime - HH:mm
   * @param {string} endTime - HH:mm
   * @returns {number} - Horas (puede incluir decimales)
   */
  static calculateHoursDifference(startTime, endTime) {
    try {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const startTotalMins = startHour * 60 + startMin;
      const endTotalMins = endHour * 60 + endMin;

      let diffMins = endTotalMins - startTotalMins;

      // Si es negativo, asume que pasó a la siguiente medianoche
      if (diffMins < 0) {
        diffMins += 24 * 60;
      }

      return diffMins / 60;
    } catch (error) {
      CONFIG.log('error', 'Error calculating hours difference', error);
      return 0;
    }
  }

  /**
   * Suma horas a una hora base
   * @param {string} baseTime - HH:mm
   * @param {number} hoursToAdd
   * @returns {string} - HH:mm
   */
  static addHoursToTime(baseTime, hoursToAdd) {
    try {
      const [hours, minutes] = baseTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + hoursToAdd * 60;
      const newHours = Math.floor(totalMinutes / 60) % 24;
      const newMinutes = totalMinutes % 60;

      return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    } catch (error) {
      CONFIG.log('error', 'Error adding hours to time', error);
      return baseTime;
    }
  }

  /**
   * Obtiene el nombre del día de la semana
   * @param {Date|string} date
   * @returns {string}
   */
  static getDayName(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  }

  /**
   * Obtiene el nombre del mes
   * @param {Date|string} date
   * @returns {string}
   */
  static getMonthName(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[date.getMonth()];
  }

  /**
   * Obtiene el número de semana del año
   * @param {Date|string} date
   * @returns {number}
   */
  static getWeekNumber(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * Verifica si una fecha es hoy
   * @param {Date|string} date
   * @returns {boolean}
   */
  static isToday(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return this.formatDate(date) === this.today();
  }

  /**
   * Verifica si una fecha es en el pasado
   * @param {Date|string} date
   * @returns {boolean}
   */
  static isPast(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date < new Date();
  }

  /**
   * Verifica si una fecha es en el futuro
   * @param {Date|string} date
   * @returns {boolean}
   */
  static isFuture(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date > new Date();
  }

  /**
   * Calcula los días entre dos fechas
   * @param {Date|string} startDate
   * @param {Date|string} endDate
   * @returns {number}
   */
  static daysBetween(startDate, endDate) {
    if (typeof startDate === 'string') {
      startDate = new Date(startDate);
    }
    if (typeof endDate === 'string') {
      endDate = new Date(endDate);
    }
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((endDate - startDate) / msPerDay);
  }

  /**
   * Obtiene la fecha de hace N días
   * @param {number} daysAgo
   * @returns {string} - YYYY-MM-DD
   */
  static daysAgo(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return this.formatDate(date);
  }

  /**
   * Obtiene la fecha de dentro de N días
   * @param {number} daysAhead
   * @returns {string} - YYYY-MM-DD
   */
  static daysAhead(daysAhead) {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return this.formatDate(date);
  }

  /**
   * Obtiene el inicio de la semana (lunes)
   * @param {Date|string} date
   * @returns {string} - YYYY-MM-DD
   */
  static getWeekStart(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return this.formatDate(new Date(date.setDate(diff)));
  }

  /**
   * Obtiene el fin de la semana (domingo)
   * @param {Date|string} date
   * @returns {string} - YYYY-MM-DD
   */
  static getWeekEnd(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    const start = this.getWeekStart(date);
    return this.daysAhead(6);
  }

  /**
   * Obtiene el inicio del mes
   * @param {Date|string} date
   * @returns {string} - YYYY-MM-DD
   */
  static getMonthStart(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return this.formatDate(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  /**
   * Obtiene el fin del mes
   * @param {Date|string} date
   * @returns {string} - YYYY-MM-DD
   */
  static getMonthEnd(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return this.formatDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  }

  /**
   * Convierte un timestamp en milisegundos a fecha legible
   * @param {number} timestamp
   * @returns {string}
   */
  static fromTimestamp(timestamp) {
    return this.formatDateTime(new Date(timestamp));
  }

  /**
   * Obtiene el timestamp actual en milisegundos
   * @returns {number}
   */
  static getCurrentTimestamp() {
    return Date.now();
  }

  /**
   * Convierte tiempo HH:mm a minutos totales
   * @param {string} time - HH:mm
   * @returns {number}
   */
  static timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convierte minutos totales a tiempo HH:mm
   * @param {number} minutes
   * @returns {string}
   */
  static minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Formatea horas decimales como HH:mm
   * @param {number} decimalHours
   * @returns {string}
   */
  static decimalHoursToTime(decimalHours) {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * Formatea un string de tiempo como HH:mm a horas decimales
   * @param {string} time - HH:mm
   * @returns {number}
   */
  static timeToDecimalHours(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  }

  /**
   * Obtiene rango de fechas para el reporte semanal
   * @param {Date|string} date - Fecha dentro de la semana
   * @returns {Object} - { start: YYYY-MM-DD, end: YYYY-MM-DD, weekNumber: number }
   */
  static getWeekRange(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    const start = this.getWeekStart(date);
    const end = this.getWeekEnd(date);
    return {
      start,
      end,
      weekNumber: this.getWeekNumber(date),
      year: date.getFullYear(),
    };
  }

  /**
   * Obtiene rango de fechas para el reporte mensual
   * @param {Date|string} date - Fecha dentro del mes
   * @returns {Object} - { start: YYYY-MM-DD, end: YYYY-MM-DD, month: string }
   */
  static getMonthRange(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    const start = this.getMonthStart(date);
    const end = this.getMonthEnd(date);
    return {
      start,
      end,
      month: this.getMonthName(date),
      year: date.getFullYear(),
    };
  }

  /**
   * Valida que una cadena sea una fecha válida en formato YYYY-MM-DD
   * @param {string} dateString
   * @returns {boolean}
   */
  static isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Valida que una cadena sea una hora válida en formato HH:mm
   * @param {string} timeString
   * @returns {boolean}
   */
  static isValidTime(timeString) {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(timeString);
  }

  /**
   * Convierte cualquier formato de fecha a YYYY-MM-DD
   * @param {string} dateString
   * @returns {string|null}
   */
  static parseToISO(dateString) {
    try {
      // Intenta múltiples formatos
      const date = new Date(dateString);
      if (isNaN(date)) {
        // Intenta DD/MM/YYYY
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const parsed = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          if (!isNaN(parsed)) {
            return this.formatDate(parsed);
          }
        }
        return null;
      }
      return this.formatDate(date);
    } catch (error) {
      CONFIG.log('error', 'Error parsing date', error);
      return null;
    }
  }
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DateUtils;
}
