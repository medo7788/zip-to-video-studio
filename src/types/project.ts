export interface SceneConfig {
  id: number;
  video?: string;
  audio?: string;
  subtitle?: string;
}

export interface ProjectConfig {
  scenes: SceneConfig[];
}

export interface ExtractedFile {
  name: string;
  path: string;
  data: Uint8Array;
  type: 'video' | 'audio' | 'subtitle' | 'sfx' | 'json' | 'unknown';
}

export interface ProcessedScene {
  id: number;
  videoFile?: ExtractedFile;
  audioFile?: ExtractedFile;
  subtitleFile?: ExtractedFile;
  subtitles?: SubtitleCue[];
  videoUrl?: string;
  audioUrl?: string;
  duration?: number;
}

export interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
  isRTL: boolean;
}

export interface ProcessingStatus {
  stage: 'idle' | 'extracting' | 'parsing' | 'processing' | 'encoding' | 'complete' | 'error';
  progress: number;
  message: string;
  currentScene?: number;
  totalScenes?: number;
}

export interface VideoSettings {
  resolution: '720p' | '1080p';
}

export const RESOLUTION_SETTINGS: Record<VideoSettings['resolution'], { outputWidth: number; outputHeight: number }> = {
  '720p': { outputWidth: 1280, outputHeight: 720 },
  '1080p': { outputWidth: 1920, outputHeight: 1080 },
};
