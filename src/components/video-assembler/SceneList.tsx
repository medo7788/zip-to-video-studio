import { ProcessedScene } from '@/types/project';
import { Film, Volume2, Subtitles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface SceneListProps {
  scenes: ProcessedScene[];
  activeScene?: number;
  onSceneClick?: (sceneIndex: number) => void;
}

export function SceneList({ scenes, activeScene, onSceneClick }: SceneListProps) {
  const { t } = useLanguage();

  return (
    <div className="glass-panel p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Film className="w-5 h-5 text-primary" />
        {t.scenes} ({scenes.length})
      </h2>
      
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {scenes.map((scene, index) => {
          const hasVideo = !!scene.videoFile;
          const hasAudio = !!scene.audioFile;
          const hasSubtitles = !!scene.subtitleFile;
          const isComplete = hasVideo;
          const isActive = activeScene === index;
          
          return (
            <button
              key={scene.id}
              onClick={() => onSceneClick?.(index)}
              className={cn(
                'scene-card w-full text-start cursor-pointer',
                isActive && 'border-primary bg-primary/10'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-foreground">{t.scene} {scene.id}</span>
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-warning" />
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <div className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                  hasVideo ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                )}>
                  <Film className="w-3 h-3" />
                  <span>{hasVideo ? scene.videoFile?.name.slice(0, 15) : t.noVideo}</span>
                </div>
                
                <div className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                  hasAudio ? 'bg-glow-secondary/20 text-glow-secondary' : 'bg-secondary text-muted-foreground'
                )}>
                  <Volume2 className="w-3 h-3" />
                  <span>{hasAudio ? t.audio : t.noAudio}</span>
                </div>
                
                <div className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                  hasSubtitles ? 'bg-warning/20 text-warning' : 'bg-secondary text-muted-foreground'
                )}>
                  <Subtitles className="w-3 h-3" />
                  <span>{hasSubtitles ? `${scene.subtitles?.length} ${t.cues}` : t.noSubs}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
