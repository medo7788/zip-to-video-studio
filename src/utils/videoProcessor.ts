import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { ProcessedScene, ProcessingStatus, VideoSettings, RESOLUTION_SETTINGS, SubtitleCue } from '@/types/project';
import { processScenesWithCanvas } from './canvasProcessor';

// Helper to convert cues to SRT format
function cuesToSRT(cues: SubtitleCue[]): string {
  return cues
    .map((cue, index) => {
      const formatTime = (time: number) => {
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);
        const milliseconds = Math.round((time - Math.floor(time)) * 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
      };
      return `${index + 1}\n${formatTime(cue.startTime)} --> ${formatTime(cue.endTime)}\n${cue.text}\n`;
    })
    .join('\n');
}

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;
let ffmpegLoading = false;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegLoaded) {
    return ffmpegInstance;
  }
  
  if (ffmpegLoading) {
    // Wait for existing load
    while (ffmpegLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (ffmpegInstance && ffmpegLoaded) {
      return ffmpegInstance;
    }
  }
  
  ffmpegLoading = true;
  
  try {
    ffmpegInstance = new FFmpeg();
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    ffmpegLoaded = true;
    return ffmpegInstance;
  } finally {
    ffmpegLoading = false;
  }
}

export async function processScenes(
  scenes: ProcessedScene[],
  settings: VideoSettings,
  onProgress: (status: ProcessingStatus) => void
): Promise<Blob> {
  // Use Canvas processor if selected
  if (settings.engine === 'canvas') {
    return processScenesWithCanvas(scenes, settings, onProgress);
  }
  
  // FFmpeg processing
  const ffmpeg = await getFFmpeg();
  const { outputWidth, outputHeight } = RESOLUTION_SETTINGS[settings.resolution];
  
  const validScenes = scenes.filter(s => s.videoFile);
  
  if (validScenes.length === 0) {
    throw new Error('No valid scenes with video files found');
  }
  
  onProgress({
    stage: 'processing',
    progress: 5,
    message: 'Loading FFmpeg...',
    currentScene: 0,
    totalScenes: validScenes.length,
  });
  
  const outputFiles: string[] = [];
  
  // Process each scene
  for (let i = 0; i < validScenes.length; i++) {
    const scene = validScenes[i];
    const sceneProgress = Math.round(10 + (i / validScenes.length) * 60);
    
    onProgress({
      stage: 'processing',
      progress: sceneProgress,
      message: `Processing scene ${i + 1} of ${validScenes.length}...`,
      currentScene: i + 1,
      totalScenes: validScenes.length,
    });
    
    const videoInputName = `scene${i}_video.mp4`;
    const sceneOutputName = `scene${i}_output.mp4`;
    
    // Write video file
    if (scene.videoFile?.data) {
      await ffmpeg.writeFile(videoInputName, scene.videoFile.data);
    } else {
      continue;
    }
    
    let ffmpegArgs: string[] = [];
    const videoFilters: string[] = [`scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease,pad=${outputWidth}:${outputHeight}:(ow-iw)/2:(oh-ih)/2`];
    const inputs: string[] = ['-i', videoInputName];
    const maps: string[] = [];

    // Handle audio
    if (scene.audioFile?.data) {
      const audioInputName = `scene${i}_audio.mp3`;
      await ffmpeg.writeFile(audioInputName, scene.audioFile.data);
      inputs.push('-i', audioInputName);
      maps.push('-map', '0:v:0', '-map', '1:a:0');
    } else {
      maps.push('-map', '0:v:0');
    }

    // Handle subtitles
    const hasSubtitles = scene.subtitleCues && scene.subtitleCues.length > 0;
    let subtitleFilename = '';
    if (hasSubtitles) {
        subtitleFilename = `scene${i}_subs.srt`;
        const srtContent = cuesToSRT(scene.subtitleCues!);
        await ffmpeg.writeFile(subtitleFilename, srtContent);
        videoFilters.push(`subtitles=${subtitleFilename}`);
    }

    if (scene.audioFile?.data) {
      ffmpegArgs = [
        ...inputs,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        ...maps,
        '-vf', videoFilters.join(','),
        '-shortest',
        '-y',
        sceneOutputName,
      ];
    } else {
      ffmpegArgs = [
        ...inputs,
        '-c:v', 'libx264',
        ...maps,
        '-vf', videoFilters.join(','),
        '-an',
        '-y',
        sceneOutputName,
      ];
    }
    
    await ffmpeg.exec(ffmpegArgs);
    outputFiles.push(sceneOutputName);

    // Clean up subtitle file
    if (hasSubtitles) {
        await ffmpeg.deleteFile(subtitleFilename);
    }
  }
  
  if (outputFiles.length === 0) {
    throw new Error('No scenes were processed successfully');
  }
  
  onProgress({
    stage: 'encoding',
    progress: 75,
    message: 'Concatenating scenes...',
  });
  
  // Create concat file
  if (outputFiles.length > 1) {
    const concatContent = outputFiles.map(f => `file '${f}'`).join('\n');
    await ffmpeg.writeFile('concat.txt', concatContent);
    
    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      '-c', 'copy',
      '-y',
      'final_output.mp4',
    ]);
  } else {
    // Single scene, just rename
    const data = await ffmpeg.readFile(outputFiles[0]);
    await ffmpeg.writeFile('final_output.mp4', data);
  }
  
  onProgress({
    stage: 'encoding',
    progress: 95,
    message: 'Finalizing output...',
  });
  
  // Read final output
  const outputData = await ffmpeg.readFile('final_output.mp4');
  const outputBuffer = new Uint8Array(outputData as Uint8Array).buffer;
  const outputBlob = new Blob([outputBuffer], { type: 'video/mp4' });
  
  // Cleanup
  for (const file of outputFiles) {
    try {
      await ffmpeg.deleteFile(file);
    } catch {
      // Ignore cleanup errors
    }
  }
  
  onProgress({
    stage: 'complete',
    progress: 100,
    message: 'Processing complete!',
  });
  
  return outputBlob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
