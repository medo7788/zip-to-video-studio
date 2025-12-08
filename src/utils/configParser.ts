import { ExtractedFile, ProjectConfig, SceneConfig, ProcessedScene, SubtitleCue } from '@/types/project';
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

export async function matchFilesToScenes(
  config: ProjectConfig,
  files: ExtractedFile[],
  allCues?: SubtitleCue[]
): Promise<ProcessedScene[]> {
  const { videos, audios, subtitles } = categorizeFiles(files);
  const processedScenes: ProcessedScene[] = [];

  // First pass: match files and create URLs
  for (const scene of config.scenes) {
    const processed: ProcessedScene = { id: scene.id };
    const sceneId = scene.id;

    // Match video
    let videoFile: ExtractedFile | undefined;
    if (scene.video) {
      videoFile = findFileByName(videos, scene.video);
    }
    if (!videoFile) {
      videoFile = findFileBySceneNumber(videos, sceneId);
    }
    if (videoFile) {
      processed.videoFile = videoFile;
      processed.videoUrl = createObjectURL(videoFile.data, getMimeType(videoFile.name));
    }

    // Match audio
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
    }

    // Handle per-scene subtitle files if no global cues are provided
    if (!allCues) {
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
        processed.subtitleCues = parseSubtitles(content, subtitleFile.name);
      }
    }

    processedScenes.push(processed);
  }

  // Second pass: get video durations
  const durationPromises = processedScenes.map(scene =>
    scene.videoUrl ? getVideoDuration(scene.videoUrl) : Promise.resolve(0)
  );
  const durations = await Promise.all(durationPromises);
  processedScenes.forEach((scene, index) => {
    scene.duration = durations[index];
  });

  // Third pass: distribute cues from a single subtitle file
  if (allCues && allCues.length > 0) {
    let timelineCursor = 0;
    for (const scene of processedScenes) {
      const sceneDuration = scene.duration ?? 0;
      if (sceneDuration > 0) {
        const sceneEndTime = timelineCursor + sceneDuration;

        scene.subtitleCues = allCues
          .filter(cue => cue.startTime >= timelineCursor && cue.startTime < sceneEndTime)
          .map(cue => ({
            ...cue,
            startTime: cue.startTime - timelineCursor,
            endTime: cue.endTime - timelineCursor,
          }));

        timelineCursor = sceneEndTime;
      }
    }
  }
  
  // Final logging for verification
  for (const scene of processedScenes) {
      console.log(`[Scene ${scene.id}] Matched video: ${scene.videoFile?.name}, audio: ${scene.audioFile?.name}, duration: ${scene.duration}`);
      if (scene.subtitleCues) {
          console.log(`[Scene ${scene.id}] Assigned ${scene.subtitleCues.length} subtitle cues.`);
      }
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
