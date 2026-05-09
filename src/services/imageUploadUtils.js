import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const getFileExtension = (value) => {
  const rawValue = String(value ?? '')
    .split('?')[0]
    .split('#')[0];

  const extensionMatch = rawValue.match(/\.([a-z0-9]+)$/i);
  return extensionMatch ? extensionMatch[1].toLowerCase() : '';
};

export const inferImageMimeType = (source, fallbackMimeType = 'image/jpeg') => {
  if (source && typeof source === 'object' && typeof source.mimeType === 'string' && source.mimeType.trim()) {
    return source.mimeType;
  }

  const candidate = typeof source === 'string' ? source : source?.uri ?? source?.fileName ?? '';
  const extension = getFileExtension(candidate);

  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return fallbackMimeType;
  }
};

export const inferImageFileName = (source, fallbackFileName = 'upload.jpg') => {
  if (source && typeof source === 'object' && typeof source.fileName === 'string' && source.fileName.trim()) {
    return source.fileName;
  }

  if (typeof source === 'string') {
    const path = source.split('?')[0].split('#')[0];
    const lastSegment = path.split('/').filter(Boolean).pop();
    if (lastSegment) {
      return lastSegment;
    }
  }

  return fallbackFileName;
};

export const resolveImageUploadBlob = async (source, options = {}) => {
  const fallbackMimeType = options.fallbackMimeType ?? 'image/jpeg';
  const fallbackFileName = options.fallbackFileName ?? 'upload.jpg';
  const mimeType = inferImageMimeType(source, fallbackMimeType);
  const fileName = inferImageFileName(source, fallbackFileName);

  // 1. SCENARIO: We already have base64 data
  if (source && typeof source === 'object' && typeof source.base64 === 'string' && source.base64.trim()) {
    const buffer = decode(source.base64); // 🚨 THE FIX: Convert to pure ArrayBuffer
    return {
      arrayBuffer: buffer,
      blob: buffer, // Keeping 'blob' key so we don't break your existing codebase!
      mimeType,
      fileName,
    };
  }

  const uri = typeof source === 'string' ? source : source?.uri ?? '';

  if (!uri) {
    throw new Error('Missing image URI.');
  }

  // 2. SCENARIO: We have a data URI string
  if (/^data:/i.test(uri)) {
    const commaIndex = uri.indexOf(',');
    const meta = commaIndex >= 0 ? uri.slice(0, commaIndex) : '';
    const payload = commaIndex >= 0 ? uri.slice(commaIndex + 1) : '';
    const dataMimeType = meta.match(/^data:([^;]+);base64/i)?.[1] ?? mimeType;

    if (!payload) {
      throw new Error('Invalid data URI.');
    }

    const buffer = decode(payload); // 🚨 THE FIX
    return {
      arrayBuffer: buffer,
      blob: buffer,
      mimeType: dataMimeType,
      fileName,
    };
  }

  // 3. SCENARIO: We have an external HTTP link
  if (/^https?:\/\//i.test(uri)) {
    const response = await fetch(uri);

    if (!response.ok) {
      throw new Error(`Failed to fetch remote image: ${response.status}`);
    }

    // fetch() arrayBuffer works perfectly fine, no decode needed
    const buffer = await response.arrayBuffer(); 
    return {
      arrayBuffer: buffer,
      blob: buffer, 
      mimeType,
      fileName,
    };
  }

  // 4. SCENARIO: We only have a local file path (No base64 attached)
  const normalizedUri = String(uri).replace(/^file:\/\//i, '');
  
  // Ask the OS to read the local file and give us the base64 string
  const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
    encoding: 'base64',
  });

  const buffer = decode(base64); // 🚨 THE FIX

  return {
    arrayBuffer: buffer,
    blob: buffer, 
    mimeType,
    fileName,
  };
};