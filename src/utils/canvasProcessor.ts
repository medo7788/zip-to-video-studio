import { ProcessedScene, ProcessingStatus, VideoSettings, RESOLUTION_SETTINGS, SUBTITLE_FONT_SIZES } from '@/types/project';

/**
 * Canvas-based video processor - Alternative to FFmpeg
 * Uses MediaRecorder API to capture canvas and audio
 */

export async function processScenesWithCanvas(
  scenes: ProcessedScene[],
  settings: VideoSettings,
  onProgress: (status: ProcessingStatus) => void
): Promise<Blob> {
  const { outputWidth, outputHeight } = RESOLUTION_SETTINGS[settings.resolution];
  const validScenes = scenes.filter(s => s.videoUrl);

  console.log(`[Canvas Processor] Starting with ${validScenes.length} valid scenes out of ${scenes.length} total`);
  console.log(`[Canvas Processor] Sync mode: ${settings.syncMode}`);
  console.log(`[Canvas Processor] Subtitle settings:`, settings.subtitleSettings);
  
  validScenes.forEach((s, i) => {
    console.log(`[Scene ${i + 1}] Video: ${s.videoUrl ? 'YES' : 'NO'}, Audio: ${s.audioUrl ? 'YES' : 'NO'}, Subtitles: ${s.subtitleCues?.length || 0} cues, Duration: ${s.duration?.toFixed(2) || 'N/A'}s`);
  });

  if (validScenes.length === 0) {
    throw new Error('No valid scenes with video files found');
  }

  onProgress({
    stage: 'processing',
    progress: 5,
    message: 'Preparing canvas processor...',
    currentScene: 0,
    totalScenes: validScenes.length,
  });

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d')!;

  // Create audio context for mixing
  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();

  // Get canvas stream
  const canvasStream = canvas.captureStream(30); // 30 FPS
  const videoTrack = canvasStream.getVideoTracks()[0];

  // Combine video and audio tracks
  const combinedStream = new MediaStream([videoTrack, ...destination.stream.getAudioTracks()]);

  // Setup MediaRecorder
  const chunks: Blob[] = [];
  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType: 'video/webm;codecs=vp9,opus',
    videoBitsPerSecond: settings.resolution === '1080p' ? 8000000 : 5000000,
  });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    let currentSceneIndex = 0;

    const processNextScene = async () => {
      if (currentSceneIndex >= validScenes.length) {
        console.log(`[Canvas Processor] All ${validScenes.length} scenes processed, stopping recorder`);
        mediaRecorder.stop();
        return;
      }

      const scene = validScenes[currentSceneIndex];
      const sceneProgress = Math.round(10 + ((currentSceneIndex + 1) / validScenes.length) * 80);

      console.log(`[Canvas Processor] Processing scene ${currentSceneIndex + 1}/${validScenes.length}`);

      onProgress({
        stage: 'processing',
        progress: sceneProgress,
        message: `Processing scene ${currentSceneIndex + 1} of ${validScenes.length}...`,
        currentScene: currentSceneIndex + 1,
        totalScenes: validScenes.length,
      });

      try {
        await renderSceneToCanvas(scene, canvas, ctx, audioContext, destination, settings);
        console.log(`[Canvas Processor] Scene ${currentSceneIndex + 1} completed`);
        currentSceneIndex++;
        await processNextScene();
      } catch (error) {
        console.error(`[Canvas Processor] Error in scene ${currentSceneIndex + 1}:`, error);
        reject(error);
      }
    };

    mediaRecorder.onstop = () => {
      console.log(`[Canvas Processor] MediaRecorder stopped, creating blob from ${chunks.length} chunks`);
      
      onProgress({
        stage: 'encoding',
        progress: 95,
        message: 'Finalizing output...',
      });

      const blob = new Blob(chunks, { type: 'video/webm' });
      console.log(`[Canvas Processor] Final blob size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
      
      onProgress({
        stage: 'complete',
        progress: 100,
        message: 'Processing complete!',
      });

      resolve(blob);
    };

    mediaRecorder.onerror = (e) => {
      console.error('[Canvas Processor] MediaRecorder error:', e);
      reject(new Error('MediaRecorder error: ' + e));
    };

    mediaRecorder.start(100); // Collect data every 100ms
    processNextScene();
  });
}

async function renderSceneToCanvas(
  scene: ProcessedScene,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  audioContext: AudioContext,
  destination: MediaStreamAudioDestinationNode,
  settings: VideoSettings
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const video = document.createElement('video');
    video.src = scene.videoUrl!;
    video.muted = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';

    let audioSource: AudioBufferSourceNode | null = null;
    let audioDuration = 0;

    // Load audio first if exists
    if (scene.audioUrl) {
      console.log(`[renderScene] Loading audio: ${scene.audioUrl}`);
      try {
        const res = await fetch(scene.audioUrl);
        const buffer = await res.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(buffer);
        
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(destination);
        audioDuration = audioBuffer.duration;
        console.log(`[renderScene] Audio loaded, duration: ${audioDuration.toFixed(2)}s`);
      } catch (error) {
        console.error('[renderScene] Audio loading failed:', error);
      }
    }

    // Wait for video to be ready
    await new Promise<void>((res, rej) => {
      video.onloadeddata = () => {
        console.log(`[renderScene] Video loaded, duration: ${video.duration.toFixed(2)}s`);
        res();
      };
      video.onerror = () => rej(new Error('Failed to load video'));
      video.load();
    });

    const videoDuration = video.duration;
    
    // Calculate playback rate based on sync mode
    let playbackRate = 1.0;
    let effectiveDuration = videoDuration;
    
    if (audioDuration > 0 && videoDuration > audioDuration) {
      if (settings.syncMode === 'speed') {
        // Speed up video to match audio
        playbackRate = videoDuration / audioDuration;
        effectiveDuration = audioDuration;
        console.log(`[renderScene] Speed mode: playback rate = ${playbackRate.toFixed(2)}x`);
      } else {
        // Trim mode: video will stop when audio ends
        effectiveDuration = audioDuration;
        console.log(`[renderScene] Trim mode: will stop at ${audioDuration.toFixed(2)}s`);
      }
    }
    
    video.playbackRate = playbackRate;

    // Start playback
    video.play();
    if (audioSource) {
      audioSource.start(0);
      console.log('[renderScene] Audio playback started');
    }

    let animationId: number;
    const startTime = performance.now();

    const drawFrame = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      
      // Check if we should stop (based on audio duration in trim mode, or video end)
      const shouldStop = 
        video.ended || 
        video.paused || 
        (audioDuration > 0 && elapsed >= audioDuration);

      if (shouldStop) {
        cancelAnimationFrame(animationId);
        video.pause();
        if (audioSource) {
          try {
            audioSource.stop();
          } catch {
            // Already stopped
          }
        }
        console.log(`[renderScene] Scene complete, elapsed: ${elapsed.toFixed(2)}s`);
        resolve();
        return;
      }

      // Calculate scaling to fit canvas while maintaining aspect ratio
      const videoAspect = video.videoWidth / video.videoHeight;
      const canvasAspect = canvas.width / canvas.height;

      let drawWidth, drawHeight, drawX, drawY;

      if (videoAspect > canvasAspect) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / videoAspect;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
      } else {
        drawHeight = canvas.height;
        drawWidth = canvas.height * videoAspect;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
      }

      // Clear and draw video frame
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);

      // Draw subtitles if available
      if (scene.subtitleCues && scene.subtitleCues.length > 0) {
        const currentTime = video.currentTime;
        const currentSub = scene.subtitleCues.find(
          sub => currentTime >= sub.startTime && currentTime <= sub.endTime
        );

        if (currentSub) {
          drawSubtitle(ctx, canvas, currentSub.text, currentSub.isRTL, settings);
        }
      }

      animationId = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    video.onended = () => {
      cancelAnimationFrame(animationId);
      if (audioSource) {
        try {
          audioSource.stop();
        } catch {
          // Already stopped
        }
      }
      console.log('[renderScene] Video ended naturally');
      resolve();
    };

    video.onerror = () => {
      cancelAnimationFrame(animationId);
      reject(new Error('Video playback error'));
    };
  });
}

function drawSubtitle(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  isRTL: boolean,
  settings: VideoSettings
) {
  const { subtitleSettings, resolution } = settings;
  const fontSize = SUBTITLE_FONT_SIZES[resolution][subtitleSettings.fontSize];
  
  // Font selection
  let fontFamily: string;
  switch (subtitleSettings.fontFamily) {
    case 'arabic':
      fontFamily = '"Cairo", "Amiri", "Noto Kufi Arabic", sans-serif';
      break;
    case 'modern':
      fontFamily = '"Inter", "Helvetica Neue", Arial, sans-serif';
      break;
    default:
      fontFamily = isRTL 
        ? '"Cairo", "Amiri", "Noto Kufi Arabic", sans-serif'
        : '"Inter", Arial, sans-serif';
  }
  
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Calculate Y position based on setting
  let textY: number;
  const padding = 40;
  
  switch (subtitleSettings.position) {
    case 'top':
      textY = padding + fontSize / 2;
      break;
    case 'center':
      textY = canvas.height / 2;
      break;
    case 'bottom':
    default:
      textY = canvas.height - padding - fontSize / 2;
      break;
  }
  
  // Draw background
  const textWidth = ctx.measureText(text).width;
  const bgPadding = 16;
  const bgHeight = fontSize + bgPadding * 2;
  const bgX = (canvas.width - textWidth) / 2 - bgPadding;
  const bgY = textY - bgHeight / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.beginPath();
  ctx.roundRect(bgX, bgY, textWidth + bgPadding * 2, bgHeight, 8);
  ctx.fill();

  // Draw text with stroke for better visibility
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  
  if (isRTL) {
    ctx.direction = 'rtl';
  }
  
  ctx.strokeText(text, canvas.width / 2, textY);
  ctx.fillText(text, canvas.width / 2, textY);
  ctx.direction = 'ltr';
}
