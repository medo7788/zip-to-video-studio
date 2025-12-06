import { unzipSync } from 'fflate';
import { ExtractedFile } from '@/types/project';
import { getFileType, getFileName } from './fileDetection';

export async function extractZipFile(file: File): Promise<ExtractedFile[]> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  try {
    const unzipped = unzipSync(uint8Array);
    const files: ExtractedFile[] = [];
    
    for (const [path, data] of Object.entries(unzipped)) {
      // Skip directories and hidden files
      if (path.endsWith('/') || path.startsWith('__MACOSX') || path.includes('/.')) {
        continue;
      }
      
      const fileName = getFileName(path);
      const type = getFileType(fileName);
      
      // Only include recognized file types
      if (type !== 'unknown') {
        files.push({
          name: fileName,
          path: path,
          data: data,
          type: type,
        });
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error extracting ZIP:', error);
    throw new Error('Failed to extract ZIP file. Please ensure it is a valid ZIP archive.');
  }
}

export function createObjectURL(data: Uint8Array, mimeType: string): string {
  const buffer = new Uint8Array(data).buffer;
  const blob = new Blob([buffer], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.srt': 'text/plain',
    '.vtt': 'text/vtt',
    '.json': 'application/json',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url);
}
