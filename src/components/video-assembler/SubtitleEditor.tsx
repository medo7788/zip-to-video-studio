import { useState, useCallback } from 'react';
import { SubtitleCue, ProcessedScene } from '@/types/project';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Edit3, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X,
  Type,
  Film
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubtitleEditorProps {
  scenes: ProcessedScene[];
  onScenesUpdate: (scenes: ProcessedScene[]) => void;
}

export function SubtitleEditor({ scenes, onScenesUpdate }: SubtitleEditorProps) {
  const { t, isRTL } = useLanguage();
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [editingCueIndex, setEditingCueIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingStartTime, setEditingStartTime] = useState(0);
  const [editingEndTime, setEditingEndTime] = useState(0);

  const activeScene = scenes[activeSceneIndex];
  const cues = activeScene?.subtitleCues || [];

  // Calculate total subtitles count
  const totalSubtitles = scenes.reduce((acc, scene) => acc + (scene.subtitleCues?.length || 0), 0);

  const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const parseTimeInput = (value: string): number => {
    const parts = value.split(':');
    if (parts.length === 2) {
      const [mins, rest] = parts;
      const [secs, ms] = rest.split('.');
      return parseInt(mins, 10) * 60 + parseFloat(`${secs}.${ms || '0'}`);
    }
    return parseFloat(value) || 0;
  };

  const startEditing = useCallback((cueIndex: number) => {
    const cue = cues[cueIndex];
    if (cue) {
      setEditingCueIndex(cueIndex);
      setEditingText(cue.text);
      setEditingStartTime(cue.startTime);
      setEditingEndTime(cue.endTime);
    }
  }, [cues]);

  const cancelEditing = useCallback(() => {
    setEditingCueIndex(null);
    setEditingText('');
  }, []);

  const saveEditing = useCallback(() => {
    if (editingCueIndex === null) return;

    const updatedScenes = scenes.map((scene, sceneIndex) => {
      if (sceneIndex !== activeSceneIndex) return scene;
      
      const updatedCues = scene.subtitleCues?.map((cue, cueIndex) => {
        if (cueIndex !== editingCueIndex) return cue;
        return {
          ...cue,
          text: editingText,
          startTime: editingStartTime,
          endTime: editingEndTime,
        };
      });

      return { ...scene, subtitleCues: updatedCues };
    });

    onScenesUpdate(updatedScenes);
    setEditingCueIndex(null);
    setEditingText('');
  }, [editingCueIndex, editingText, editingStartTime, editingEndTime, activeSceneIndex, scenes, onScenesUpdate]);

  const adjustCueTiming = useCallback((cueIndex: number, offsetSeconds: number) => {
    const updatedScenes = scenes.map((scene, sceneIndex) => {
      if (sceneIndex !== activeSceneIndex) return scene;
      
      const updatedCues = scene.subtitleCues?.map((cue, idx) => {
        if (idx !== cueIndex) return cue;
        return {
          ...cue,
          startTime: Math.max(0, cue.startTime + offsetSeconds),
          endTime: Math.max(0, cue.endTime + offsetSeconds),
        };
      });

      return { ...scene, subtitleCues: updatedCues };
    });

    onScenesUpdate(updatedScenes);
  }, [activeSceneIndex, scenes, onScenesUpdate]);

  const adjustAllCuesTiming = useCallback((offsetSeconds: number) => {
    const updatedScenes = scenes.map((scene, sceneIndex) => {
      if (sceneIndex !== activeSceneIndex) return scene;
      
      const updatedCues = scene.subtitleCues?.map((cue) => ({
        ...cue,
        startTime: Math.max(0, cue.startTime + offsetSeconds),
        endTime: Math.max(0, cue.endTime + offsetSeconds),
      }));

      return { ...scene, subtitleCues: updatedCues };
    });

    onScenesUpdate(updatedScenes);
  }, [activeSceneIndex, scenes, onScenesUpdate]);

  if (totalSubtitles === 0) {
    return (
      <div className="glass-panel p-6">
        <div className="text-center text-muted-foreground py-8">
          <Type className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t.noSubs}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" />
            {t.subtitleEditor}
          </h2>
          <span className="text-sm text-muted-foreground">
            {totalSubtitles} {t.cues}
          </span>
        </div>
      </div>

      {/* Scene Tabs */}
      <div className="p-3 border-b border-border/30 bg-card/30">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveSceneIndex(Math.max(0, activeSceneIndex - 1))}
            disabled={activeSceneIndex === 0}
            className="h-8 w-8"
          >
            {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
          
          <div className="flex-1 flex items-center justify-center gap-2 overflow-x-auto">
            {scenes.map((scene, index) => (
              <button
                key={scene.id}
                onClick={() => setActiveSceneIndex(index)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-fit",
                  activeSceneIndex === index
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
                )}
              >
                <Film className="w-3.5 h-3.5" />
                {t.scene} {scene.id}
                {scene.subtitleCues && scene.subtitleCues.length > 0 && (
                  <span className="text-xs opacity-70">({scene.subtitleCues.length})</span>
                )}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveSceneIndex(Math.min(scenes.length - 1, activeSceneIndex + 1))}
            disabled={activeSceneIndex === scenes.length - 1}
            className="h-8 w-8"
          >
            {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Bulk Timing Adjustment */}
      {cues.length > 0 && (
        <div className="p-3 border-b border-border/30 bg-card/20">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t.adjustAllTiming}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustAllCuesTiming(-0.5)}
                className="h-7 px-2"
              >
                -0.5s
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustAllCuesTiming(-0.1)}
                className="h-7 px-2"
              >
                -0.1s
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustAllCuesTiming(0.1)}
                className="h-7 px-2"
              >
                +0.1s
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => adjustAllCuesTiming(0.5)}
                className="h-7 px-2"
              >
                +0.5s
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Subtitle Timeline */}
      <ScrollArea className="h-[300px]">
        <div className="p-3 space-y-2">
          {cues.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>{t.noSubsScene}</p>
            </div>
          ) : (
            cues.map((cue, index) => (
              <div
                key={index}
                className={cn(
                  "rounded-lg border transition-all",
                  editingCueIndex === index
                    ? "bg-primary/10 border-primary/50"
                    : "bg-card/50 border-border/30 hover:border-border/60"
                )}
              >
                {editingCueIndex === index ? (
                  /* Editing Mode */
                  <div className="p-3 space-y-3">
                    {/* Text Input */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t.subtitleText}</label>
                      <Input
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className={cn("bg-background", cue.isRTL && "text-right")}
                        dir={cue.isRTL ? 'rtl' : 'ltr'}
                      />
                    </div>
                    
                    {/* Timing Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{t.startTime}</label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={formatTime(editingStartTime)}
                            onChange={(e) => setEditingStartTime(parseTimeInput(e.target.value))}
                            className="bg-background text-sm font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{t.endTime}</label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={formatTime(editingEndTime)}
                            onChange={(e) => setEditingEndTime(parseTimeInput(e.target.value))}
                            className="bg-background text-sm font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save/Cancel Buttons */}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditing}
                        className="h-8"
                      >
                        <X className="w-4 h-4 me-1" />
                        {t.cancel}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={saveEditing}
                        className="h-8"
                      >
                        <Check className="w-4 h-4 me-1" />
                        {t.save}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Timing Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 text-xs font-mono bg-secondary/50 text-muted-foreground px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" />
                            {formatTime(cue.startTime)} → {formatTime(cue.endTime)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({(cue.endTime - cue.startTime).toFixed(1)}s)
                          </span>
                        </div>
                        
                        {/* Subtitle Text */}
                        <p 
                          className={cn(
                            "text-foreground leading-relaxed",
                            cue.isRTL && "text-right font-arabic"
                          )}
                          dir={cue.isRTL ? 'rtl' : 'ltr'}
                        >
                          {cue.text}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => adjustCueTiming(index, -0.1)}
                          className="h-7 w-7"
                          title={t.timingAdvance}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => adjustCueTiming(index, 0.1)}
                          className="h-7 w-7"
                          title={t.timingDelay}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(index)}
                          className="h-7 w-7"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
