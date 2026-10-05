/**
 * Upload Security Validator & Filename Sanitizer
 * Prevents malicious file uploads, unvalidated extensions, path traversal and storage exhaustion.
 */

export interface UploadValidationOptions {
  maxSizeMB?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

const DEFAULT_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export function validateFileForUpload(
  file: File,
  options: UploadValidationOptions = {}
): ValidationResult {
  const maxSizeMB = options.maxSizeMB || 10;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const allowedExtensions = (options.allowedExtensions || DEFAULT_ALLOWED_EXTENSIONS).map(e => e.toLowerCase().replace(/^\./, ''));
  const allowedMimeTypes = options.allowedMimeTypes || DEFAULT_ALLOWED_MIME_TYPES;

  // 1. Check file existence
  if (!file || !file.name) {
    return { valid: false, error: 'Ficheiro inválido ou não fornecido.' };
  }

  // 2. Validate file size
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `O ficheiro excede o tamanho máximo permitido de ${maxSizeMB}MB (tamanho atual: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'O ficheiro está vazio (0 bytes).' };
  }

  // 3. Extract and validate extension
  const rawParts = file.name.split('.');
  if (rawParts.length < 2) {
    return { valid: false, error: 'O ficheiro não possui uma extensão válida.' };
  }
  const ext = rawParts.pop()?.toLowerCase() || '';

  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Formato de ficheiro .${ext} não suportado. Extensões permitidas: ${allowedExtensions.map(e => '.' + e).join(', ')}.`,
    };
  }

  // 4. Validate MIME Type
  if (file.type && allowedMimeTypes.length > 0) {
    const isMimeAllowed = allowedMimeTypes.some(allowed => {
      if (allowed.endsWith('/*')) {
        const prefix = allowed.replace('/*', '');
        return file.type.startsWith(prefix);
      }
      return file.type === allowed;
    });

    if (!isMimeAllowed) {
      return {
        valid: false,
        error: `Tipo de conteúdo (${file.type}) não autorizado.`,
      };
    }
  }

  // 5. Generate secure, sanitized storage filename (eliminates path traversal and special characters)
  const safeBaseName = rawParts
    .join('_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);

  const timestamp = Date.now();
  const randomSalt = Math.random().toString(36).substring(2, 8);
  const sanitizedName = `${timestamp}_${safeBaseName}_${randomSalt}.${ext}`;

  return {
    valid: true,
    sanitizedName,
  };
}
