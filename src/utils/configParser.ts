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
  const { videos, audios, subtitleFiles } = categorizeFiles(files);
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
        subtitleFile = findFileByName(subtitleFiles, scene.subtitle);
      }
      if (!subtitleFile) {
        subtitleFile = findFileBySceneNumber(subtitleFiles, sceneId);
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

  // Second pass: get video and audio durations
  const videoDurationPromises = processedScenes.map(scene =>
    scene.videoUrl ? getVideoDuration(scene.videoUrl) : Promise.resolve(0)
  );
  const audioDurationPromises = processedScenes.map(scene =>
    scene.audioUrl ? getAudioDuration(scene.audioUrl) : Promise.resolve(0)
  );
  
  const [videoDurations, audioDurations] = await Promise.all([
    Promise.all(videoDurationPromises),
    Promise.all(audioDurationPromises)
  ]);
  
  processedScenes.forEach((scene, index) => {
    scene.duration = videoDurations[index];
    scene.audioDuration = audioDurations[index];
  });

  // Third pass: distribute cues from a single subtitle file
  // IMPORTANT: Subtitles are synced with AUDIO, not video!
  if (allCues && allCues.length > 0) {
    console.log(`[configParser] Distributing ${allCues.length} subtitle cues across ${processedScenes.length} scenes`);
    let audioTimelineCursor = 0;
    
    for (const scene of processedScenes) {
      // Use audio duration for subtitle timing (subtitles sync with audio, not video)
      const sceneAudioDuration = scene.audioDuration ?? scene.duration ?? 0;
      console.log(`[Scene ${scene.id}] Video: ${scene.duration?.toFixed(2)}s, Audio: ${sceneAudioDuration.toFixed(2)}s, Audio cursor: ${audioTimelineCursor.toFixed(2)}s`);
      
      if (sceneAudioDuration > 0) {
        const sceneAudioEndTime = audioTimelineCursor + sceneAudioDuration;

        // Find cues that fall within this scene's AUDIO timeline
        const sceneCues = allCues
          .filter(cue => cue.startTime >= audioTimelineCursor && cue.startTime < sceneAudioEndTime)
          .map(cue => ({
            ...cue,
            // Adjust timing to be relative to scene start
            startTime: cue.startTime - audioTimelineCursor,
            endTime: cue.endTime - audioTimelineCursor,
          }));

        scene.subtitleCues = sceneCues;
        console.log(`[Scene ${scene.id}] Assigned ${sceneCues.length} cues (audio timeline ${audioTimelineCursor.toFixed(2)}s - ${sceneAudioEndTime.toFixed(2)}s)`);
        
        if (sceneCues.length > 0) {
          console.log(`[Scene ${scene.id}] First cue: "${sceneCues[0].text.substring(0, 30)}..." at ${sceneCues[0].startTime.toFixed(2)}s`);
        }

        audioTimelineCursor = sceneAudioEndTime;
      }
    }
  }
  
  // Final logging for verification
  console.log('=== Final Scene Summary ===');
  for (const scene of processedScenes) {
    console.log(`[Scene ${scene.id}] Video: ${scene.videoFile?.name || 'NONE'}, Audio: ${scene.audioFile?.name || 'NONE'}, Duration: ${scene.duration?.toFixed(2) || 'N/A'}s, Subtitles: ${scene.subtitleCues?.length || 0} cues`);
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

export function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      audio.src = '';
    };
    
    audio.onerror = () => {
      reject(new Error('Failed to load audio metadata'));
    };
    
    audio.src = audioUrl;
  });
}
