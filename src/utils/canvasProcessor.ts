import { ProcessedScene, ProcessingStatus, VideoSettings, RESOLUTION_SETTINGS } from '@/types/project';

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
  validScenes.forEach((s, i) => {
    console.log(`[Scene ${i + 1}] Video: ${s.videoUrl ? 'YES' : 'NO'}, Audio: ${s.audioUrl ? 'YES' : 'NO'}, Subtitles: ${s.subtitleCues?.length || 0} cues`);
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
        await renderSceneToCanvas(scene, canvas, ctx, audioContext, destination);
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
  destination: MediaStreamAudioDestinationNode
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const video = document.createElement('video');
    video.src = scene.videoUrl!;
    video.muted = true; // Mute video's own audio
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';

    let audioSource: AudioBufferSourceNode | null = null;

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
        console.log(`[renderScene] Audio loaded, duration: ${audioBuffer.duration.toFixed(2)}s`);
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

    // Start playback
    video.play();
    if (audioSource) {
      audioSource.start(0);
      console.log('[renderScene] Audio playback started');
    }

    let animationId: number;

    const drawFrame = () => {
      if (video.ended || video.paused) {
        cancelAnimationFrame(animationId);
        console.log('[renderScene] Video ended/paused, stopping frame render');
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
          const fontSize = Math.round(canvas.height * 0.045);
          ctx.font = `bold ${fontSize}px ${currentSub.isRTL ? '"Cairo", "Amiri", "Noto Kufi Arabic"' : '"Inter", "Arial"'}, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          
          // Draw text shadow/outline for better visibility
          const textY = canvas.height - 60;
          
          // Background bar
          const textWidth = ctx.measureText(currentSub.text).width;
          const padding = 24;
          const bgHeight = fontSize + 24;
          const bgX = (canvas.width - textWidth) / 2 - padding;
          const bgY = textY - bgHeight + 10;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, textWidth + padding * 2, bgHeight, 8);
          ctx.fill();

          // Text with stroke for better visibility
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          
          if (currentSub.isRTL) {
            ctx.direction = 'rtl';
          }
          
          ctx.strokeText(currentSub.text, canvas.width / 2, textY);
          ctx.fillText(currentSub.text, canvas.width / 2, textY);
          ctx.direction = 'ltr';
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
      console.log('[renderScene] Scene rendering complete');
      resolve();
    };

    video.onerror = () => {
      cancelAnimationFrame(animationId);
      reject(new Error('Video playback error'));
    };
  });
}
