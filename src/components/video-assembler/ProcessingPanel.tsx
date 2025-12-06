import { ProcessingStatus, VideoSettings, RESOLUTION_SETTINGS } from '@/types/project';
import { Loader2, Download, Settings2, Film, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProcessingPanelProps {
  status: ProcessingStatus;
  settings: VideoSettings;
  onSettingsChange: (settings: VideoSettings) => void;
  onProcess: () => void;
  onDownload: () => void;
  hasScenes: boolean;
}

export function ProcessingPanel({
  status,
  settings,
  onSettingsChange,
  onProcess,
  onDownload,
  hasScenes,
}: ProcessingPanelProps) {
  const { t } = useLanguage();
  const isProcessing = ['extracting', 'parsing', 'processing', 'encoding'].includes(status.stage);
  const isComplete = status.stage === 'complete';

  return (
    <div className="glass-panel p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-primary" />
        {t.exportSettings}
      </h2>
      
      {/* Resolution selector */}
      <div className="mb-4">
        <label className="text-sm text-muted-foreground mb-2 block">{t.outputResolution}</label>
        <div className="flex gap-2">
          {(['720p', '1080p'] as const).map((res) => (
            <button
              key={res}
              onClick={() => onSettingsChange({ ...settings, resolution: res })}
              disabled={isProcessing}
              className={cn(
                'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
                settings.resolution === res
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {res}
              <span className="block text-xs opacity-70 mt-0.5">
                {RESOLUTION_SETTINGS[res].outputWidth}×{RESOLUTION_SETTINGS[res].outputHeight}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Processing Engine */}
      <div className="mb-6">
        <label className="text-sm text-muted-foreground mb-2 block">{t.processingEngine}</label>
        <div className="flex gap-2">
          <button
            onClick={() => onSettingsChange({ ...settings, engine: 'canvas' })}
            disabled={isProcessing}
            className={cn(
              'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
              settings.engine === 'canvas'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            {t.canvasDesc}
            <span className="block text-xs opacity-70 mt-0.5">WebM output</span>
          </button>
          <button
            onClick={() => onSettingsChange({ ...settings, engine: 'ffmpeg' })}
            disabled={isProcessing}
            className={cn(
              'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
              settings.engine === 'ffmpeg'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            {t.ffmpegDesc}
            <span className="block text-xs opacity-70 mt-0.5">MP4 output</span>
          </button>
        </div>
      </div>
      
      {/* Progress */}
      {isProcessing && (
        <div className="mb-6 animate-fade-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-foreground">{status.message}</span>
            <span className="text-sm text-primary font-medium">{status.progress}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${status.progress}%` }}
            />
          </div>
          {status.currentScene && status.totalScenes && (
            <p className="text-xs text-muted-foreground mt-2">
              {t.scene} {status.currentScene} / {status.totalScenes}
            </p>
          )}
        </div>
      )}
      
      {/* Complete status */}
      {isComplete && (
        <div className="mb-6 p-4 rounded-lg bg-success/10 border border-success/30 animate-fade-up">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">{t.processingComplete}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t.readyToDownload}
          </p>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex gap-3">
        {isComplete ? (
          <Button
            onClick={onDownload}
            className="flex-1 h-12 text-base"
            variant="default"
          >
            <Download className="w-5 h-5 me-2" />
            {t.downloadMp4}
          </Button>
        ) : (
          <Button
            onClick={onProcess}
            disabled={!hasScenes || isProcessing}
            className="flex-1 h-12 text-base"
            variant="default"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 me-2 animate-spin" />
                {t.processing}
              </>
            ) : (
              <>
                <Film className="w-5 h-5 me-2" />
                {t.generateVideo}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
