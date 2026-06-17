/**
 * FIELD REPORT PRO - GENERADOR DE REPORTES
 * Generación de PDF, HTML y otros formatos de reporte
 */

class ReportGenerator {
  /**
   * Genera un PDF del reporte
   * @param {Object} reportData
   */
  static generatePDF(reportData) {
    const html = this.generateHTML(reportData);
    const filename = `Reporte_${reportData.projectData.name}_${DateUtils.today()}.pdf`;

    // Usar html2pdf si está disponible
    if (typeof html2pdf !== 'undefined') {
      const element = document.createElement('div');
      element.innerHTML = html;

      const options = {
        margin: [10, 10, 10, 10],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'letter' },
      };

      html2pdf().set(options).from(element).save();
      NotificationSystem.success('PDF generado exitosamente');
    } else {
      // Fallback: usar print
      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
      NotificationSystem.info('Usa tu navegador para guardar como PDF');
    }
  }

  /**
   * Genera HTML del reporte
   * @param {Object} reportData
   * @returns {string}
   */
  static generateHTML(reportData) {
    const project = reportData.projectData || {};
    const general = reportData.generalData || {};
    const crew = reportData.crew || [];
    const tasks = reportData.tasks || [];
    const photos = reportData.photos || [];
    const safety = reportData.safetyData || {};

    const totalHours = crew.reduce((sum, w) => sum + parseFloat(w.hoursWorked || 0), 0);
    const avgHours = crew.length > 0 ? (totalHours / crew.length).toFixed(1) : 0;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Campo - ${project.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333;
      line-height: 1.6;
      background: white;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      margin-bottom: 30px;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #2563eb;
      font-size: 28px;
      margin-bottom: 5px;
    }
    .header p {
      color: #666;
      font-size: 14px;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      background: #f3f4f6;
      border-left: 4px solid #2563eb;
      padding: 12px 15px;
      margin-bottom: 15px;
      font-weight: bold;
      font-size: 16px;
      color: #1f2937;
    }
    .section-content {
      background: #fafafa;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 10px;
    }
    .row.full {
      grid-template-columns: 1fr;
    }
    .field {
      margin-bottom: 10px;
    }
    .field-label {
      font-weight: bold;
      color: #1f2937;
      font-size: 13px;
      margin-bottom: 3px;
    }
    .field-value {
      color: #4b5563;
      font-size: 14px;
      padding-left: 10px;
      border-left: 2px solid #e5e7eb;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    table th {
      background: #2563eb;
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: bold;
      font-size: 13px;
    }
    table td {
      border: 1px solid #d1d5db;
      padding: 10px;
      font-size: 13px;
    }
    table tr:nth-child(even) {
      background: #f9fafb;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-top: 10px;
    }
    .summary-card {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 4px;
      padding: 10px;
      text-align: center;
    }
    .summary-card-value {
      font-size: 20px;
      font-weight: bold;
      color: #2563eb;
    }
    .summary-card-label {
      font-size: 11px;
      color: #6b7280;
      margin-top: 5px;
    }
    .photos-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 15px;
    }
    .photo-item {
      border: 1px solid #d1d5db;
      border-radius: 4px;
      overflow: hidden;
      background: white;
    }
    .photo-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      background: #f3f4f6;
    }
    .photo-caption {
      padding: 10px;
      font-size: 12px;
      color: #4b5563;
      border-top: 1px solid #e5e7eb;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      color: #6b7280;
      font-size: 11px;
      text-align: center;
    }
    .signature-block {
      margin-top: 30px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    .signature-line {
      border-top: 1px solid #333;
      padding-top: 5px;
      text-align: center;
      font-size: 12px;
      color: #333;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
      margin: 2px;
    }
    .badge-info {
      background: #dbeafe;
      color: #1e40af;
    }
    .badge-success {
      background: #dcfce7;
      color: #15803d;
    }
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    .badge-danger {
      background: #fee2e2;
      color: #991b1b;
    }
    @media print {
      body {
        padding: 0;
      }
      .page-break {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- ENCABEZADO -->
    <div class="header">
      <h1>📋 FIELD REPORT PRO</h1>
      <p>Reporte de Campo - Construcción</p>
      <p>Generado: ${DateUtils.formatDateTime(new Date())}</p>
    </div>

    <!-- PROYECTO -->
    <div class="section">
      <div class="section-title">🏗️ INFORMACIÓN DEL PROYECTO</div>
      <div class="section-content">
        <div class="row">
          <div class="field">
            <div class="field-label">Nombre del Proyecto</div>
            <div class="field-value">${this.escapeHTML(project.name)}</div>
          </div>
          <div class="field">
            <div class="field-label">Ubicación</div>
            <div class="field-value">${this.escapeHTML(project.location)}</div>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <div class="field-label">Dirección</div>
            <div class="field-value">${this.escapeHTML(project.address)}</div>
          </div>
          <div class="field">
            <div class="field-label">Contratista</div>
            <div class="field-value">${this.escapeHTML(project.contractorName)}</div>
          </div>
        </div>
        ${project.projectNumber ? `
        <div class="row">
          <div class="field">
            <div class="field-label">Número de Proyecto</div>
            <div class="field-value">${this.escapeHTML(project.projectNumber)}</div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- INFORMACIÓN GENERAL -->
    <div class="section">
      <div class="section-title">📅 INFORMACIÓN GENERAL</div>
      <div class="section-content">
        <div class="row">
          <div class="field">
            <div class="field-label">Fecha del Reporte</div>
            <div class="field-value">${DateUtils.formatDateES(general.reportDate)}</div>
          </div>
          <div class="field">
            <div class="field-label">Supervisor</div>
            <div class="field-value">${this.escapeHTML(general.supervisor)}</div>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <div class="field-label">Clima</div>
            <div class="field-value">${general.weather || 'No especificado'}</div>
          </div>
          <div class="field">
            <div class="field-label">Temperatura</div>
            <div class="field-value">${general.temperature}°C</div>
          </div>
        </div>
        ${general.notes ? `
        <div class="row full">
          <div class="field">
            <div class="field-label">Notas Generales</div>
            <div class="field-value">${this.escapeHTML(general.notes)}</div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- PERSONAL / CREW -->
    <div class="section">
      <div class="section-title">👥 PERSONAL PRESENTE</div>
      <div class="section-content">
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-card-value">${crew.length}</div>
            <div class="summary-card-label">Trabajadores</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-value">${totalHours.toFixed(1)}</div>
            <div class="summary-card-label">Total Horas</div>
          </div>
          <div class="summary-card">
            <div class="summary-card-value">${avgHours}</div>
            <div class="summary-card-label">Promedio/Persona</div>
          </div>
        </div>

        ${crew.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Posición</th>
              <th>Horas</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${crew.map((w) => `
            <tr>
              <td>${this.escapeHTML(w.workerName)}</td>
              <td>${w.position || '-'}</td>
              <td>${w.hoursWorked}</td>
              <td><span class="badge badge-info">${w.status}</span></td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p style="color: #999;">No hay trabajadores registrados</p>'}
      </div>
    </div>

    <!-- TAREAS REALIZADAS -->
    <div class="section">
      <div class="section-title">✅ TAREAS REALIZADAS</div>
      <div class="section-content">
        ${tasks.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Fase</th>
              <th>Avance</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.map((t) => `
            <tr>
              <td>${this.escapeHTML(t.description)}</td>
              <td>${t.phase}</td>
              <td>
                <div style="background: #e5e7eb; border-radius: 3px; overflow: hidden; height: 20px;">
                  <div style="background: #10b981; width: ${t.percentage}%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: white; font-weight: bold;">
                    ${t.percentage}%
                  </div>
                </div>
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p style="color: #999;">No hay tareas registradas</p>'}
      </div>
    </div>

    <!-- SEGURIDAD -->
    <div class="section">
      <div class="section-title">🛡️ INFORMACIÓN DE SEGURIDAD</div>
      <div class="section-content">
        <div class="row full">
          <div class="field">
            <div class="field-label">Riesgos Identificados</div>
            <div class="field-value">${this.escapeHTML(safety.hazardsIdentified || 'Ninguno identificado')}</div>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <div class="field-label">JSA (Job Safety Analysis)</div>
            <div class="field-value">
              <span class="badge ${safety.jsa ? 'badge-success' : 'badge-danger'}">
                ${safety.jsa ? '✓ Sí' : '✗ No'}
              </span>
            </div>
          </div>
          <div class="field">
            <div class="field-label">Toolbox Talk</div>
            <div class="field-value">
              <span class="badge ${safety.toolboxTalk ? 'badge-success' : 'badge-danger'}">
                ${safety.toolboxTalk ? '✓ Sí' : '✗ No'}
              </span>
            </div>
          </div>
        </div>
        ${safety.preventiveMeasures ? `
        <div class="row full">
          <div class="field">
            <div class="field-label">Medidas Preventivas</div>
            <div class="field-value">${this.escapeHTML(safety.preventiveMeasures)}</div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- FOTOS -->
    ${photos.length > 0 ? `
    <div class="section page-break">
      <div class="section-title">📸 EVIDENCIA FOTOGRÁFICA</div>
      <div class="section-content">
        <div class="photos-container">
          ${photos.map((p) => `
          <div class="photo-item">
            <img src="${p.base64}" alt="${this.escapeHTML(p.description)}" class="photo-image">
            <div class="photo-caption">
              <strong>${this.escapeHTML(p.description)}</strong>
              <br>
              <span style="color: #999; font-size: 11px;">
                ${p.phase ? `Fase: ${p.phase} | ` : ''}
                ${DateUtils.formatDateTime(p.uploadedAt)}
              </span>
            </div>
          </div>
          `).join('')}
        </div>
      </div>
    </div>
    ` : ''}

    <!-- FIRMAS -->
    <div class="section">
      <div class="section-title">✍️ FIRMAS Y APROBACIÓN</div>
      <div class="section-content">
        <div class="signature-block">
          <div>
            <div class="signature-line">
              Firma del Supervisor<br>
              <span style="font-size: 11px; color: #666;">Nombre y Fecha</span>
            </div>
          </div>
          <div>
            <div class="signature-line">
              Firma del Contratista<br>
              <span style="font-size: 11px; color: #666;">Nombre y Fecha</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <p>Este reporte fue generado automáticamente por Field Report Pro</p>
      <p>Reporte ID: ${reportData.id} | ${DateUtils.formatDateTime(new Date())}</p>
      <p style="margin-top: 10px; font-size: 10px;">© 2024 Field Report Pro. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Escapa caracteres HTML
   * @param {string} text
   * @returns {string}
   */
  static escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  /**
   * Genera un resumen de texto del reporte
   * @param {Object} reportData
   * @returns {string}
   */
  static generateTextSummary(reportData) {
    const project = reportData.projectData || {};
    const general = reportData.generalData || {};
    const crew = reportData.crew || [];
    const tasks = reportData.tasks || [];

    const totalHours = crew.reduce((sum, w) => sum + parseFloat(w.hoursWorked || 0), 0);

    let summary = '';
    summary += `REPORTE DE CAMPO - ${project.name}\n`;
    summary += `Fecha: ${DateUtils.formatDateES(general.reportDate)}\n`;
    summary += `Supervisor: ${general.supervisor}\n`;
    summary += `\nRESUMEN:\n`;
    summary += `- ${crew.length} trabajadores\n`;
    summary += `- ${totalHours.toFixed(1)} horas totales\n`;
    summary += `- ${tasks.length} tareas completadas\n`;

    return summary;
  }
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportGenerator;
}
