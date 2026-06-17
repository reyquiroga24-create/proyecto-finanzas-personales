/**
 * FIELD REPORT PRO - GESTOR DE FOTOS
 * Captura, compresión, almacenamiento y visualización de imágenes
 */

class PhotoManager {
  constructor() {
    this.photos = [];
    this.maxPhotos = CONFIG.FORM_CONFIG.PHOTOS_MAX;
    this.maxFileSize = CONFIG.FORM_CONFIG.PHOTO_MAX_SIZE;
    this.compressionQuality = CONFIG.FORM_CONFIG.PHOTO_COMPRESSION_QUALITY;
  }

  /**
   * Abre diálogo de selección de archivo
   * @returns {Promise<File>}
   */
  static async openFileDialog() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp,image/gif';
      input.multiple = false;

      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          resolve(file);
        }
      });

      input.addEventListener('cancel', () => {
        resolve(null);
      });

      input.click();
    });
  }

  /**
   * Valida un archivo de foto
   * @param {File} file
   * @returns {Object}
   */
  static validateFile(file) {
    if (!file) {
      return { valid: false, error: 'Archivo requerido' };
    }

    // Validar tamaño
    if (file.size > CONFIG.FORM_CONFIG.PHOTO_MAX_SIZE) {
      const maxMB = (CONFIG.FORM_CONFIG.PHOTO_MAX_SIZE / 1024 / 1024).toFixed(1);
      return { valid: false, error: `Archivo debe ser menor a ${maxMB}MB (actual: ${(file.size / 1024 / 1024).toFixed(1)}MB)` };
    }

    // Validar tipo MIME
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Solo JPEG, PNG, WebP o GIF permitidos' };
    }

    return { valid: true, error: null };
  }

  /**
   * Convierte una imagen a base64 con compresión
   * @param {File} file
   * @returns {Promise<string>}
   */
  static async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (file.type === 'image/jpeg' || file.type === 'image/png') {
          // Comprimir imagen
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const ratio = CONFIG.FORM_CONFIG.PHOTO_COMPRESSION_QUALITY;

            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressed = canvas.toDataURL('image/jpeg', 0.8);
            resolve(compressed);
          };
          img.onerror = () => resolve(reader.result); // Si falla, usar sin comprimir
          img.src = reader.result;
        } else {
          resolve(reader.result);
        }
      };

      reader.onerror = () => {
        reject(new Error('Error leyendo archivo'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Agrega una foto al reporte
   * @param {File} file
   * @param {string} description
   * @param {string} phase
   * @returns {Promise<Object>}
   */
  static async addPhoto(file, description, phase = '') {
    // Validar archivo
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Validar descripción
    if (!description || description.trim() === '') {
      throw new Error('La descripción de la foto es requerida');
    }

    // Convertir a base64
    const base64 = await this.fileToBase64(file);

    const photoObject = {
      id: `photo_${Date.now()}`,
      file: file.name,
      base64,
      description: description.trim(),
      phase: phase || '',
      uploadedAt: DateUtils.nowISO(),
      fileSize: file.size,
      fileType: file.type,
    };

    CONFIG.log('info', 'Photo added', { photoId: photoObject.id });
    return photoObject;
  }

  /**
   * Captura imagen de la cámara web
   * @returns {Promise<Blob>}
   */
  static async captureFromCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        // Mostrar modal de cámara
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black z-50 flex flex-col';
        modal.innerHTML = `
          <div class="flex-1 flex items-center justify-center">
            <video id="camera-video" autoplay style="max-width: 100%; max-height: 80vh;" class="transform -scale-x-100"></video>
          </div>
          <div class="bg-gray-900 p-4 flex gap-4 justify-center">
            <button id="capture-btn" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
              Capturar
            </button>
            <button id="cancel-btn" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold">
              Cancelar
            </button>
          </div>
        `;

        document.body.appendChild(modal);
        const videoEl = modal.querySelector('#camera-video');
        videoEl.srcObject = stream;

        const captureBtn = modal.querySelector('#capture-btn');
        const cancelBtn = modal.querySelector('#cancel-btn');

        captureBtn.onclick = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0);

          stream.getTracks().forEach((track) => track.stop());
          modal.remove();

          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.8);
        };

        cancelBtn.onclick = () => {
          stream.getTracks().forEach((track) => track.stop());
          modal.remove();
          reject(new Error('Captura cancelada'));
        };
      });
    } catch (error) {
      CONFIG.log('error', 'Camera capture failed', error);
      throw new Error('No se puede acceder a la cámara');
    }
  }

  /**
   * Genera miniatura de una imagen
   * @param {string} base64
   * @returns {string}
   */
  static generateThumbnail(base64, width = 150, height = 150) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const ratio = Math.max(width / img.width, height / img.height);
        const x = (width / 2) - (img.width / 2) * ratio;
        const y = (height / 2) - (img.height / 2) * ratio;

        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, x, y, img.width * ratio, img.height * ratio);

        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = base64;
    });
  }

  /**
   * Obtiene información EXIF de una imagen
   * @param {File} file
   * @returns {Promise<Object>}
   */
  static async getExifData(file) {
    // Esta función requeriría una librería EXIF adicional
    // Por ahora retorna datos básicos
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: DateUtils.nowISO(),
    };
  }

  /**
   * Crea una vista previa HTML de foto
   * @param {Object} photo
   * @returns {HTMLElement}
   */
  static createPhotoPreview(photo) {
    const container = document.createElement('div');
    container.className = 'photo-preview bg-gray-100 rounded-lg overflow-hidden shadow-md';
    container.dataset.photoId = photo.id;

    container.innerHTML = `
      <div class="relative">
        <img src="${photo.base64}" alt="${photo.description}" class="w-full h-48 object-cover">
        <button class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center" data-action="delete">
          ✕
        </button>
      </div>
      <div class="p-3">
        <p class="text-sm font-semibold text-gray-700 line-clamp-2">${photo.description}</p>
        <p class="text-xs text-gray-500 mt-1">${photo.phase ? `Fase: ${photo.phase}` : ''}</p>
        <p class="text-xs text-gray-500">${DateUtils.formatDateTime(photo.uploadedAt)}</p>
        <p class="text-xs text-gray-400 mt-1">${(photo.fileSize / 1024).toFixed(1)} KB</p>
      </div>
    `;

    return container;
  }

  /**
   * Exporta fotos a un archivo ZIP (requiere librería adicional)
   * @param {Array} photos
   * @param {string} reportName
   * @returns {Promise<Blob>}
   */
  static async exportPhotosAsZip(photos, reportName) {
    // Esta función requeriría JSZip
    // Por ahora solo loga
    CONFIG.log('info', `Export photos: ${photos.length} items`);
    throw new Error('Requiere librería JSZip');
  }

  /**
   * Comprime un conjunto de fotos
   * @param {Array} photos
   * @returns {Promise<Array>}
   */
  static async compressPhotos(photos) {
    const compressed = [];

    for (const photo of photos) {
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ratio = 0.8;
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          compressed.push({
            ...photo,
            base64: compressedBase64,
            compressed: true,
          });

          resolve();
        };
        img.src = photo.base64;
      });
    }

    return compressed;
  }

  /**
   * Calcula el tamaño total de todas las fotos
   * @param {Array} photos
   * @returns {number} - Bytes
   */
  static getTotalSize(photos) {
    return photos.reduce((total, photo) => total + photo.fileSize, 0);
  }

  /**
   * Formatea el tamaño en bytes a unidad legible
   * @param {number} bytes
   * @returns {string}
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Descarga una foto
   * @param {Object} photo
   */
  static downloadPhoto(photo) {
    const link = document.createElement('a');
    link.href = photo.base64;
    link.download = `${DateUtils.today()}_${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Crea galería de fotos
   * @param {Array} photos
   * @returns {HTMLElement}
   */
  static createPhotosGallery(photos) {
    const gallery = document.createElement('div');
    gallery.className = 'photos-gallery grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';

    photos.forEach((photo) => {
      const preview = this.createPhotoPreview(photo);
      gallery.appendChild(preview);
    });

    return gallery;
  }

  /**
   * Limpia todas las fotos de memoria
   */
  static clearPhotos() {
    // Las fotos se almacenan en el objeto del reporte
    // Esta función es para referencia
    CONFIG.log('info', 'Photos cleared');
  }
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhotoManager;
}
