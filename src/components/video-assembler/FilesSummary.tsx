import { ExtractedFile } from '@/types/project';
import { categorizeFiles } from '@/utils/fileDetection';
import { Film, Volume2, Subtitles, Sparkles, FileJson } from 'lucide-react';

interface FilesSummaryProps {
  files: ExtractedFile[];
}

export function FilesSummary({ files }: FilesSummaryProps) {
  const { videos, audios, subtitleFiles, jsonFiles, sfx } = categorizeFiles(files);

  const categories = [
    { icon: Film, label: 'Videos', count: videos.length, color: 'text-primary' },
    { icon: Volume2, label: 'Audio', count: audios.length, color: 'text-glow-secondary' },
    { icon: Subtitles, label: 'Subtitles', count: subtitleFiles.length, color: 'text-warning' },
    { icon: Sparkles, label: 'SFX', count: sfx.length, color: 'text-purple-400' },
    { icon: FileJson, label: 'Config', count: jsonFiles.length, color: 'text-success' },
  ];

  return (
    <div className="glass-panel p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Detected Files</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {categories.map(({ icon: Icon, label, count, color }) => (
          <div 
            key={label}
            className="flex flex-col items-center p-4 rounded-xl bg-secondary/30"
          >
            <Icon className={`w-6 h-6 ${color} mb-2`} />
            <span className="text-2xl font-bold text-foreground">{count}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
