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
  
  console.log('[matchFilesToScenes] Config scenes:', config.scenes);
  console.log('[matchFilesToScenes] Available videos:', videos.map(v => v.name));
  console.log('[matchFilesToScenes] Available audios:', audios.map(a => a.name));
  console.log('[matchFilesToScenes] Available subtitles:', subtitles.map(s => s.name));
  
  for (const scene of config.scenes) {
    const processed: ProcessedScene = { id: scene.id };
    const sceneId = scene.id;
    
    // Try to find video by explicit name OR by scene number pattern
    let videoFile: ExtractedFile | undefined;
    if (scene.video) {
      videoFile = findFileByName(videos, scene.video);
    }
    if (!videoFile) {
      // Auto-match by scene number pattern: scene_1, scene1, scene-1, etc.
      videoFile = findFileBySceneNumber(videos, sceneId);
    }
    
    if (videoFile) {
      processed.videoFile = videoFile;
      processed.videoUrl = createObjectURL(videoFile.data, getMimeType(videoFile.name));
      console.log(`[Scene ${sceneId}] Found video: ${videoFile.name}`);
    }
    
    // Try to find audio by explicit name OR by scene number pattern
    let audioFile: ExtractedFile | undefined;
    if (scene.audio) {
      audioFile = findFileByName(audios, scene.audio);
    }
    if (!audioFile) {
      audioFile = findFileBySceneNumber(audios, sceneId);
    }
    
    if (audioFile) {
      processed.audioFile = audioFile;
      processed.audioUrl = createObjectURL(audioFile.data, getMimeType(audioFile.name));
      console.log(`[Scene ${sceneId}] Found audio: ${audioFile.name}`);
    }
    
    // Try to find subtitle by explicit name OR by scene number pattern
    let subtitleFile: ExtractedFile | undefined;
    if (scene.subtitle) {
      subtitleFile = findFileByName(subtitles, scene.subtitle);
    }
    if (!subtitleFile) {
      subtitleFile = findFileBySceneNumber(subtitles, sceneId);
    }
    
    if (subtitleFile) {
      processed.subtitleFile = subtitleFile;
      const decoder = new TextDecoder('utf-8');
      const content = decoder.decode(subtitleFile.data);
      processed.subtitles = parseSubtitles(content, subtitleFile.name);
      console.log(`[Scene ${sceneId}] Found subtitle: ${subtitleFile.name}`);
    }
    
    processedScenes.push(processed);
  }
  
  return processedScenes;
}

// Find file by scene number pattern (scene_1, scene1, scene-1, etc.)
function findFileBySceneNumber(files: ExtractedFile[], sceneNumber: number): ExtractedFile | undefined {
  const patterns = [
    new RegExp(`scene[_\\-\\s]?${sceneNumber}(?![0-9])`, 'i'),
    new RegExp(`^${sceneNumber}[_\\-\\s]`, 'i'),
    new RegExp(`[_\\-\\s]${sceneNumber}[_\\-\\s]`, 'i'),
  ];
  
  for (const file of files) {
    const fileName = file.name.toLowerCase();
    for (const pattern of patterns) {
      if (pattern.test(fileName)) {
        return file;
      }
    }
  }
  
  return undefined;
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
