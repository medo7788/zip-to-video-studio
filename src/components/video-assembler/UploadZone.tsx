import { useCallback, useState } from 'react';
import { Upload, FileArchive, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export function UploadZone({ onFileSelect, isLoading }: UploadZoneProps) {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      className={cn(
        'upload-zone relative flex flex-col items-center justify-center min-h-[400px] p-12 cursor-pointer transition-all duration-300',
        isDragging && 'drag-active'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".zip"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isLoading}
      />
      
      {isLoading ? (
        <div className="flex flex-col items-center gap-6 animate-fade-up">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse-glow">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">{t.extracting}</p>
            <p className="text-muted-foreground mt-2">{t.extractingDesc}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 animate-fade-up">
          <div className="relative">
            <div className={cn(
              'w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-300',
              isDragging ? 'bg-primary/20 scale-110' : 'bg-secondary/50'
            )}>
              {isDragging ? (
                <FileArchive className="w-12 h-12 text-primary" />
              ) : (
                <Upload className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            {isDragging && (
              <div className="absolute inset-0 rounded-2xl animate-pulse-glow" />
            )}
          </div>
          
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">
              {isDragging ? t.dropHere : t.uploadTitle}
            </p>
            <p className="text-muted-foreground mt-2">
              {t.uploadDrag}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            <span className="px-3 py-1.5 rounded-full bg-secondary/50 text-xs text-muted-foreground">
              {t.videos}: .mp4, .mov, .webm
            </span>
            <span className="px-3 py-1.5 rounded-full bg-secondary/50 text-xs text-muted-foreground">
              {t.audio}: .mp3, .wav, .aac
            </span>
            <span className="px-3 py-1.5 rounded-full bg-secondary/50 text-xs text-muted-foreground">
              {t.subtitles}: .srt, .vtt
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
