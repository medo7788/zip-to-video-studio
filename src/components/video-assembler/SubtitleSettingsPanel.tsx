import { SubtitleSettings, SubtitlePosition } from '@/types/project';
import { Type, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Slider } from '@/components/ui/slider';

interface SubtitleSettingsPanelProps {
  settings: SubtitleSettings;
  onChange: (settings: SubtitleSettings) => void;
  disabled?: boolean;
}

export function SubtitleSettingsPanel({ settings, onChange, disabled }: SubtitleSettingsPanelProps) {
  const { t } = useLanguage();

  const positions: { value: SubtitlePosition; icon: typeof AlignVerticalJustifyStart; label: string }[] = [
    { value: 'top', icon: AlignVerticalJustifyStart, label: t.positionTop },
    { value: 'center', icon: AlignVerticalJustifyCenter, label: t.positionCenter },
    { value: 'bottom', icon: AlignVerticalJustifyEnd, label: t.positionBottom },
  ];

  const fontSizes: { value: 'small' | 'medium' | 'large'; label: string }[] = [
    { value: 'small', label: t.fontSmall },
    { value: 'medium', label: t.fontMedium },
    { value: 'large', label: t.fontLarge },
  ];

  const fontFamilies: { value: 'default' | 'arabic' | 'modern'; label: string }[] = [
    { value: 'default', label: t.fontDefault },
    { value: 'arabic', label: t.fontArabic },
    { value: 'modern', label: t.fontModern },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
        <Type className="w-4 h-4 text-primary" />
        {t.subtitleSettings}
      </h3>

      {/* Position */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">{t.subtitlePosition}</label>
        <div className="flex gap-2">
          {positions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => onChange({ ...settings, position: value })}
              disabled={disabled}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1',
                settings.position === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">{t.fontSize}</label>
        <div className="flex gap-2">
          {fontSizes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChange({ ...settings, fontSize: value })}
              disabled={disabled}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                settings.fontSize === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">{t.fontFamily}</label>
        <div className="flex gap-2">
          {fontFamilies.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChange({ ...settings, fontFamily: value })}
              disabled={disabled}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                settings.fontFamily === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                value === 'arabic' && 'font-arabic',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Timing Offset */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">{t.timingOffset}</label>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onChange({ ...settings, timingOffset: Math.max(-5, (settings.timingOffset || 0) - 0.1) })}
              disabled={disabled}
              className={cn(
                'p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Minus className="w-4 h-4" />
            </button>
            
            <div className="flex-1">
              <Slider
                value={[(settings.timingOffset || 0) * 10 + 50]}
                onValueChange={(value) => onChange({ ...settings, timingOffset: (value[0] - 50) / 10 })}
                max={100}
                min={0}
                step={1}
                disabled={disabled}
                className="w-full"
              />
            </div>
            
            <button
              onClick={() => onChange({ ...settings, timingOffset: Math.min(5, (settings.timingOffset || 0) + 0.1) })}
              disabled={disabled}
              className={cn(
                'p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span className={cn(
              'px-2 py-1 rounded',
              (settings.timingOffset || 0) < 0 ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
            )}>
              {t.timingAdvance}
            </span>
            <span className={cn(
              'font-mono text-sm font-bold',
              (settings.timingOffset || 0) !== 0 ? 'text-primary' : 'text-muted-foreground'
            )}>
              {(settings.timingOffset || 0) >= 0 ? '+' : ''}{(settings.timingOffset || 0).toFixed(1)} {t.seconds}
            </span>
            <span className={cn(
              'px-2 py-1 rounded',
              (settings.timingOffset || 0) > 0 ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
            )}>
              {t.timingDelay}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
