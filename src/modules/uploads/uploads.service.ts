// ============================================
// Upload Service
// ============================================
// Поддержка: Local filesystem, S3-compatible
// ============================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ErrorCodes } from '../../types/api.types';

// ============================================
// TYPES
// ============================================

export class UploadError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface UploadOptions {
  maxSize?: number; // bytes
  allowedTypes?: string[];
}

// ============================================
// CONFIG
// ============================================

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ============================================
// LOCAL STORAGE
// ============================================

/**
 * Сохранение файла в локальное хранилище
 */
export async function saveFileLocal(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  companyId: string,
  options: UploadOptions = {}
): Promise<UploadedFile> {
  // Validate mime type
  const allowedTypes = options.allowedTypes || ALLOWED_MIME_TYPES;
  if (!allowedTypes.includes(mimeType)) {
    throw new UploadError(
      ErrorCodes.INVALID_INPUT,
      `Недопустимый тип файла. Разрешены: ${allowedTypes.join(', ')}`
    );
  }

  // Validate size
  const maxSize = options.maxSize || MAX_FILE_SIZE;
  if (buffer.length > maxSize) {
    throw new UploadError(
      ErrorCodes.INVALID_INPUT,
      `Файл слишком большой. Максимум: ${Math.round(maxSize / 1024 / 1024)}MB`
    );
  }

  // Generate unique filename
  const ext = getExtension(mimeType);
  const hash = crypto.randomBytes(16).toString('hex');
  const filename = `${companyId}/${hash}${ext}`;

  // Create company subdirectory
  const companyDir = path.join(UPLOAD_DIR, companyId);
  if (!fs.existsSync(companyDir)) {
    fs.mkdirSync(companyDir, { recursive: true });
  }

  // Save file
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filePath, buffer);

  const url = `${BASE_URL}/uploads/${filename}`;

  return {
    id: hash,
    filename,
    originalName,
    mimeType,
    size: buffer.length,
    url,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Удаление файла из локального хранилища
 */
export async function deleteFileLocal(filename: string): Promise<void> {
  const filePath = path.join(UPLOAD_DIR, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Проверка существования файла
 */
export function fileExists(filename: string): boolean {
  const filePath = path.join(UPLOAD_DIR, filename);
  return fs.existsSync(filePath);
}

// ============================================
// S3 STORAGE (Optional)
// ============================================

// S3 client будет инициализирован только если есть credentials
let s3Client: any = null;

async function initS3Client() {
  if (s3Client) return s3Client;

  const endpoint = process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;

  if (!endpoint || !accessKey || !secretKey) {
    return null;
  }

  try {
    // Dynamic import для опциональной зависимости
    // @ts-ignore: Optional dependency - @aws-sdk/client-s3
    const { S3Client } = await import('@aws-sdk/client-s3');

    s3Client = new S3Client({
      endpoint,
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // Для MinIO и других S3-compatible
    });

    return s3Client;
  } catch (e) {
    console.warn('S3 client not available, using local storage');
    return null;
  }
}

/**
 * Сохранение файла в S3
 */
export async function saveFileS3(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  companyId: string,
  options: UploadOptions = {}
): Promise<UploadedFile> {
  const client = await initS3Client();

  if (!client) {
    // Fallback to local storage
    return saveFileLocal(buffer, originalName, mimeType, companyId, options);
  }

  // Validate
  const allowedTypes = options.allowedTypes || ALLOWED_MIME_TYPES;
  if (!allowedTypes.includes(mimeType)) {
    throw new UploadError(
      ErrorCodes.INVALID_INPUT,
      `Недопустимый тип файла. Разрешены: ${allowedTypes.join(', ')}`
    );
  }

  const maxSize = options.maxSize || MAX_FILE_SIZE;
  if (buffer.length > maxSize) {
    throw new UploadError(
      ErrorCodes.INVALID_INPUT,
      `Файл слишком большой. Максимум: ${Math.round(maxSize / 1024 / 1024)}MB`
    );
  }

  // @ts-ignore: Optional dependency - @aws-sdk/client-s3
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');

  const ext = getExtension(mimeType);
  const hash = crypto.randomBytes(16).toString('hex');
  const key = `${companyId}/${hash}${ext}`;
  const bucket = process.env.S3_BUCKET || 'stroyuchet';

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const url = `${process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT}/${bucket}/${key}`;

  return {
    id: hash,
    filename: key,
    originalName,
    mimeType,
    size: buffer.length,
    url,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Удаление файла из S3
 */
export async function deleteFileS3(key: string): Promise<void> {
  const client = await initS3Client();

  if (!client) {
    return deleteFileLocal(key);
  }

  // @ts-ignore: Optional dependency - @aws-sdk/client-s3
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const bucket = process.env.S3_BUCKET || 'stroyuchet';

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

// ============================================
// UNIFIED API
// ============================================

/**
 * Сохранение файла (автоматически выбирает storage)
 */
export async function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  companyId: string,
  options: UploadOptions = {}
): Promise<UploadedFile> {
  const useS3 = process.env.STORAGE_TYPE === 's3';

  if (useS3) {
    return saveFileS3(buffer, originalName, mimeType, companyId, options);
  }

  return saveFileLocal(buffer, originalName, mimeType, companyId, options);
}

/**
 * Удаление файла
 */
export async function deleteFile(filename: string): Promise<void> {
  const useS3 = process.env.STORAGE_TYPE === 's3';

  if (useS3) {
    return deleteFileS3(filename);
  }

  return deleteFileLocal(filename);
}

// ============================================
// HELPERS
// ============================================

function getExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'application/pdf': '.pdf',
  };

  return extensions[mimeType] || '.bin';
}

/**
 * Получение размера файла в человекочитаемом формате
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
