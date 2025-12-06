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
        mediaRecorder.stop();
        return;
      }

      const scene = validScenes[currentSceneIndex];
      const sceneProgress = Math.round(10 + ((currentSceneIndex + 1) / validScenes.length) * 80);

      onProgress({
        stage: 'processing',
        progress: sceneProgress,
        message: `Processing scene ${currentSceneIndex + 1} of ${validScenes.length}...`,
        currentScene: currentSceneIndex + 1,
        totalScenes: validScenes.length,
      });

      try {
        await renderSceneToCanvas(scene, canvas, ctx, audioContext, destination);
        currentSceneIndex++;
        await processNextScene();
      } catch (error) {
        reject(error);
      }
    };

    mediaRecorder.onstop = () => {
      onProgress({
        stage: 'encoding',
        progress: 95,
        message: 'Finalizing output...',
      });

      const blob = new Blob(chunks, { type: 'video/webm' });
      
      onProgress({
        stage: 'complete',
        progress: 100,
        message: 'Processing complete!',
      });

      resolve(blob);
    };

    mediaRecorder.onerror = (e) => {
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
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = scene.videoUrl!;
    video.muted = true;
    video.crossOrigin = 'anonymous';

    let audioSource: AudioBufferSourceNode | null = null;
    let audioLoaded = false;

    // Load audio if exists
    if (scene.audioUrl) {
      fetch(scene.audioUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => audioContext.decodeAudioData(buffer))
        .then(audioBuffer => {
          audioSource = audioContext.createBufferSource();
          audioSource.buffer = audioBuffer;
          audioSource.connect(destination);
          audioLoaded = true;
          
          // Start audio when video plays
          if (!video.paused) {
            audioSource.start(0);
          }
        })
        .catch(console.error);
    }

    video.onloadeddata = () => {
      video.play();
      if (audioSource && audioLoaded) {
        audioSource.start(0);
      }
    };

    const drawFrame = () => {
      if (video.ended) {
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

      // Draw subtitles
      if (scene.subtitles) {
        const currentTime = video.currentTime;
        const currentSub = scene.subtitles.find(
          sub => currentTime >= sub.startTime && currentTime <= sub.endTime
        );

        if (currentSub) {
          const fontSize = Math.round(canvas.height * 0.04);
          ctx.font = `${fontSize}px ${currentSub.isRTL ? 'Cairo' : 'Inter'}, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          
          // Draw text background
          const textWidth = ctx.measureText(currentSub.text).width;
          const padding = 20;
          const bgHeight = fontSize + 20;
          const bgX = (canvas.width - textWidth) / 2 - padding;
          const bgY = canvas.height - 80 - bgHeight;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(bgX, bgY, textWidth + padding * 2, bgHeight);

          // Draw text
          ctx.fillStyle = '#ffffff';
          if (currentSub.isRTL) {
            ctx.direction = 'rtl';
          }
          ctx.fillText(currentSub.text, canvas.width / 2, canvas.height - 80);
          ctx.direction = 'ltr';
        }
      }

      requestAnimationFrame(drawFrame);
    };

    video.onplay = () => {
      drawFrame();
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    video.onended = () => {
      resolve();
    };

    video.load();
  });
}
