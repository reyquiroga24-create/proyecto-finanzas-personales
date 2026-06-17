/**
 * FIELD REPORT PRO - SERVIDOR NODE.JS
 * Versión producción para Hetzner
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';

// ==================== MIDDLEWARE ====================
app.use(helmet()); // Seguridad HTTP headers
app.use(compression()); // Compresión gzip
app.use(cors()); // CORS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '.')));

// ==================== RUTAS ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Info de la API
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Field Report Pro',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Webhook para recibir reportes
app.post('/api/reports', (req, res) => {
  try {
    const report = req.body;

    // Validar reporte mínimo
    if (!report.metadata || !report.metadata.reportId) {
      return res.status(400).json({
        error: 'Invalid report structure',
        message: 'Missing metadata.reportId'
      });
    }

    // Log del reporte recibido
    console.log(`[${new Date().toISOString()}] Report received:`, {
      reportId: report.metadata.reportId,
      project: report.project?.name,
      workers: report.crew?.length,
      photos: report.photos?.length
    });

    // Aquí puedes guardar en base de datos
    // await saveReportToDatabase(report);

    // Respuesta exitosa
    res.json({
      success: true,
      reportId: report.metadata.reportId,
      message: 'Reporte procesado exitosamente',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing report:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Obtener reportes (ejemplo)
app.get('/api/reports', (req, res) => {
  res.json({
    reports: [],
    total: 0,
    message: 'No reports stored yet'
  });
});

// SPA fallback - Servir index.html para rutas desconocidas
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════╗
║    Field Report Pro - API Server       ║
╚════════════════════════════════════════╝

🚀 Server started successfully!
📍 URL: http://localhost:${PORT}
🔧 Environment: ${NODE_ENV}
⏰ Time: ${new Date().toISOString()}

Endpoints:
  GET  /health              - Health check
  GET  /api/info            - API info
  POST /api/reports         - Submit report
  GET  /api/reports         - Get reports

Static files:
  /                         - Main app
  /index-simple.html        - Simple version

Logs will appear here...
════════════════════════════════════════
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
