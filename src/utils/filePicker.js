// utils/filePicker.js
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

// Check if running in Expo Go
const isExpoGo = Platform.OS === 'ios' && Constants.manifest?.extra?.expoGo !== undefined;

/**
 * Pick a file - works on both Android and iOS (with fallback)
 */
export const pickFile = async (options = {}) => {
  const { allowedTypes = '*/*', maxSizeMB = 10 } = options;
  
  // For Android or iOS development build - use DocumentPicker
  if (Platform.OS === 'android' || !isExpoGo) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return null;
      
      const file = result.assets[0];
      
      // Check file size
      if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`File exceeds ${maxSizeMB}MB limit`);
      }
      
      return {
        uri: file.uri,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType || getMimeType(file.name),
        type: 'document',
      };
    } catch (error) {
      console.error('[FilePicker] DocumentPicker error:', error);
      throw error;
    }
  }
  
  // For iOS Expo Go - use ImagePicker as fallback
  try {
    // Request permissions first
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Permission to access media library is required');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
      base64: false,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    
    // Check file size
    if (maxSizeMB && asset.fileSize && asset.fileSize > maxSizeMB * 1024 * 1024) {
      throw new Error(`File exceeds ${maxSizeMB}MB limit`);
    }

    const isVideo = asset.type === 'video';
    const isImage = asset.type === 'image';
    
    let fileName = asset.fileName || `file_${Date.now()}`;
    let mimeType = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
    
    // If no filename extension, add one
    if (!fileName.includes('.')) {
      const ext = mimeType.split('/')[1] || (isVideo ? 'mp4' : 'jpg');
      fileName = `${fileName}.${ext}`;
    }

    return {
      uri: asset.uri,
      name: fileName,
      size: asset.fileSize || 0,
      mimeType: mimeType,
      type: isVideo ? 'video' : 'image',
      width: asset.width,
      height: asset.height,
    };
  } catch (error) {
    console.error('[FilePicker] ImagePicker error:', error);
    throw error;
  }
};

/**
 * Get MIME type from file extension
 */
export const getMimeType = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'zip': 'application/zip',
    'rar': 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Check if file type is allowed
 */
export const isFileTypeAllowed = (fileName, allowedTypes) => {
  if (!allowedTypes || allowedTypes === '*/*') return true;
  
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeType = getMimeType(fileName);
  
  // Split by comma or semicolon
  const allowedList = allowedTypes.split(/[,;]/).map(t => t.trim().toLowerCase());
  
  return allowedList.some(allowed => {
    // Check by file extension
    if (allowed.startsWith('.')) {
      return `.${ext}` === allowed;
    }
    // Check by MIME type pattern
    if (allowed.includes('/')) {
      if (allowed.endsWith('/*')) {
        const prefix = allowed.split('/')[0];
        return mimeType.startsWith(prefix);
      }
      return mimeType === allowed;
    }
    // Check by plain extension without dot
    return allowed === ext;
  });
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (fileName) => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

/**
 * Check if file is an image
 */
export const isImageFile = (fileName) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  return imageExtensions.includes(getFileExtension(fileName));
};

/**
 * Check if file is a video
 */
export const isVideoFile = (fileName) => {
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm'];
  return videoExtensions.includes(getFileExtension(fileName));
};

/**
 * Check if file is a document
 */
export const isDocumentFile = (fileName) => {
  const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];
  return documentExtensions.includes(getFileExtension(fileName));
};

/**
 * Read file content as base64
 */
export const readFileAsBase64 = async (fileUri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('[FilePicker] Read file as base64 error:', error);
    throw error;
  }
};

/**
 * Get file info (size, modification date, etc.)
 */
export const getFileInfo = async (fileUri) => {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    return info;
  } catch (error) {
    console.error('[FilePicker] Get file info error:', error);
    throw error;
  }
};

/**
 * Delete file
 */
export const deleteFile = async (fileUri) => {
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    return true;
  } catch (error) {
    console.error('[FilePicker] Delete file error:', error);
    throw error;
  }
};