import { useRef, useState, useEffect, useCallback } from 'react';
import { ProcessedScene, SubtitleCue } from '@/types/project';
import { getCurrentSubtitle } from '@/utils/subtitleParser';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/contexts/LanguageContext';

interface VideoPreviewProps {
  scenes: ProcessedScene[];
  activeScene: number;
  onSceneChange: (index: number) => void;
}

export function VideoPreview({ scenes, activeScene, onSceneChange }: VideoPreviewProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleCue | null>(null);

  const scene = scenes[activeScene];

  useEffect(() => {
    if (scene?.subtitles) {
      const sub = getCurrentSubtitle(scene.subtitles, currentTime);
      setCurrentSubtitle(sub);
    } else {
      setCurrentSubtitle(null);
    }
  }, [currentTime, scene?.subtitles]);

  useEffect(() => {
    // Reset when scene changes
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [activeScene]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        audioRef.current?.pause();
      } else {
        videoRef.current.play();
        audioRef.current?.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    const time = value[0];
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    const vol = value[0];
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
    setIsMuted(vol === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) {
      audioRef.current.volume = newMuted ? 0 : volume;
    }
    if (videoRef.current) {
      videoRef.current.volume = newMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoEnd = useCallback(() => {
    if (activeScene < scenes.length - 1) {
      onSceneChange(activeScene + 1);
    } else {
      setIsPlaying(false);
    }
  }, [activeScene, scenes.length, onSceneChange]);

  if (!scene?.videoUrl) {
    return (
      <div className="video-player-container aspect-video flex items-center justify-center">
        <p className="text-muted-foreground">{t.noVideoScene}</p>
      </div>
    );
  }

  return (
    <div className="video-player-container">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={scene.videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleVideoEnd}
          muted={!!scene.audioUrl}
        />
        
        {scene.audioUrl && (
          <audio
            ref={audioRef}
            src={scene.audioUrl}
            preload="auto"
          />
        )}
        
        {/* Subtitle Overlay */}
        {currentSubtitle && (
          <div className="subtitle-overlay">
            <span className={cn(
              'subtitle-text text-lg md:text-2xl font-medium text-foreground',
              currentSubtitle.isRTL && 'rtl font-arabic'
            )}>
              {currentSubtitle.text}
            </span>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="p-4 bg-card/90 backdrop-blur-sm">
        {/* Progress bar */}
        <div className="mb-4">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Play className="w-5 h-5 text-primary-foreground ms-0.5" />
              )}
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Volume2 className="w-5 h-5 text-foreground" />
                )}
              </button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-24"
              />
            </div>
          </div>
          
          {/* Scene navigation */}
          <div className="flex items-center gap-2">
            {scenes.map((_, index) => (
              <button
                key={index}
                onClick={() => onSceneChange(index)}
                className={cn(
                  'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                  index === activeScene
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                )}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
