import { ExtractedFile } from '@/types/project';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.aac', '.ogg', '.m4a'];
const SUBTITLE_EXTENSIONS = ['.srt', '.vtt'];
const JSON_EXTENSION = '.json';

export function getFileType(filename: string): ExtractedFile['type'] {
  const ext = getExtension(filename).toLowerCase();
  
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (SUBTITLE_EXTENSIONS.includes(ext)) return 'subtitle';
  if (ext === JSON_EXTENSION) return 'json';
  
  return 'unknown';
}

export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot) : '';
}

export function getBaseName(filename: string): string {
  const lastSlash = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
  const name = lastSlash !== -1 ? filename.slice(lastSlash + 1) : filename;
  const lastDot = name.lastIndexOf('.');
  return lastDot !== -1 ? name.slice(0, lastDot) : name;
}

export function getFileName(filepath: string): string {
  const lastSlash = Math.max(filepath.lastIndexOf('/'), filepath.lastIndexOf('\\'));
  return lastSlash !== -1 ? filepath.slice(lastSlash + 1) : filepath;
}

export function findFileByName(files: ExtractedFile[], targetName: string): ExtractedFile | undefined {
  if (!targetName) return undefined;
  
  const targetBase = getBaseName(targetName).toLowerCase();
  const targetFull = getFileName(targetName).toLowerCase();
  
  // Try exact filename match first
  let found = files.find(f => {
    const fileName = getFileName(f.path).toLowerCase();
    return fileName === targetFull;
  });
  
  if (found) return found;
  
  // Try base name match (without extension)
  found = files.find(f => {
    const baseName = getBaseName(f.path).toLowerCase();
    return baseName === targetBase;
  });
  
  if (found) return found;
  
  // Try partial match (target contains or is contained in filename)
  found = files.find(f => {
    const fileName = getFileName(f.path).toLowerCase();
    const baseName = getBaseName(f.path).toLowerCase();
    return fileName.includes(targetBase) || targetBase.includes(baseName);
  });
  
  console.log(`[findFileByName] Looking for: "${targetName}" (base: "${targetBase}"), Found: ${found?.name || 'NOT FOUND'}`);
  console.log(`[findFileByName] Available files:`, files.map(f => getFileName(f.path)));
  
  return found;
}

export function categorizeFiles(files: ExtractedFile[]): {
  videos: ExtractedFile[];
  audios: ExtractedFile[];
  subtitles: ExtractedFile[];
  jsonFiles: ExtractedFile[];
  sfx: ExtractedFile[];
} {
  const videos: ExtractedFile[] = [];
  const audios: ExtractedFile[] = [];
  const subtitles: ExtractedFile[] = [];
  const jsonFiles: ExtractedFile[] = [];
  const sfx: ExtractedFile[] = [];

  for (const file of files) {
    switch (file.type) {
      case 'video':
        videos.push(file);
        break;
      case 'audio':
        // Check if it's in a sfx-related folder (case insensitive)
        if (file.path.toLowerCase().includes('sfx') || file.path.toLowerCase().includes('effect')) {
          sfx.push(file);
        } else {
          audios.push(file);
        }
        break;
      case 'subtitle':
        subtitles.push(file);
        break;
      case 'json':
        jsonFiles.push(file);
        break;
    }
  }

  return { videos, audios, subtitles, jsonFiles, sfx };
}

export function getMimeType(filename: string): string {
  const ext = getExtension(filename).toLowerCase();
  
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
