import { ExtractedFile, ProjectConfig, SceneConfig, ProcessedScene } from '@/types/project';
import { findFileByName, categorizeFiles } from './fileDetection';
import { createObjectURL, getMimeType } from './zipExtractor';
import { parseSubtitles } from './subtitleParser';

export function parseProjectConfig(jsonFile: ExtractedFile): ProjectConfig {
  try {
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(jsonFile.data);
    const parsed = JSON.parse(jsonString);
    
    // Validate structure
    if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
      throw new Error('Invalid config: missing "scenes" array');
    }
    
    const scenes: SceneConfig[] = parsed.scenes.map((scene: any, index: number) => ({
      id: scene.id ?? index + 1,
      video: scene.video,
      audio: scene.audio,
      subtitle: scene.subtitle,
    }));
    
    return { scenes };
  } catch (error) {
    console.error('Error parsing config:', error);
    throw new Error('Failed to parse JSON configuration file.');
  }
}

export function matchFilesToScenes(
  config: ProjectConfig,
  files: ExtractedFile[]
): ProcessedScene[] {
  const { videos, audios, subtitles } = categorizeFiles(files);
  const processedScenes: ProcessedScene[] = [];
  
  for (const scene of config.scenes) {
    const processed: ProcessedScene = { id: scene.id };
    
    // Match video file
    if (scene.video) {
      const videoFile = findFileByName(videos, scene.video);
      if (videoFile) {
        processed.videoFile = videoFile;
        processed.videoUrl = createObjectURL(videoFile.data, getMimeType(videoFile.name));
      }
    }
    
    // Match audio file
    if (scene.audio) {
      const audioFile = findFileByName(audios, scene.audio);
      if (audioFile) {
        processed.audioFile = audioFile;
        processed.audioUrl = createObjectURL(audioFile.data, getMimeType(audioFile.name));
      }
    }
    
    // Match subtitle file
    if (scene.subtitle) {
      const subtitleFile = findFileByName(subtitles, scene.subtitle);
      if (subtitleFile) {
        processed.subtitleFile = subtitleFile;
        const decoder = new TextDecoder('utf-8');
        const content = decoder.decode(subtitleFile.data);
        processed.subtitles = parseSubtitles(content, subtitleFile.name);
      }
    }
    
    processedScenes.push(processed);
  }
  
  return processedScenes;
}

export function getVideoDuration(videoUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      resolve(video.duration);
      video.src = '';
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = videoUrl;
  });
}
