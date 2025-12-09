import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  ExtractedFile, 
  ProcessedScene, 
  ProcessingStatus, 
  VideoSettings,
  SubtitleCue,
} from '@/types/project';
import { extractZipFile } from '@/utils/zipExtractor';
import { categorizeFiles } from '@/utils/fileDetection';
import { parseProjectConfig, matchFilesToScenes } from '@/utils/configParser';
import { processScenes, downloadBlob } from '@/utils/videoProcessor';
import { parseSubtitles } from '@/utils/subtitleParser';
import { UploadZone } from './UploadZone';
import { FilesSummary } from './FilesSummary';
import { SceneList } from './SceneList';
import { VideoPreview } from './VideoPreview';
import { ProcessingPanel } from './ProcessingPanel';
import { FinalVideoPreview } from './FinalVideoPreview';
import { RefreshCw, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export function VideoAssembler() {
  const { t, toggleLanguage, isRTL } = useLanguage();
  const [files, setFiles] = useState<ExtractedFile[]>([]);
  const [scenes, setScenes] = useState<ProcessedScene[]>([]);
  const [activeScene, setActiveScene] = useState(0);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [showFinalPreview, setShowFinalPreview] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    progress: 0,
    message: '',
  });
  const [settings, setSettings] = useState<VideoSettings>({
    resolution: '720p',
    engine: 'canvas',
    syncMode: 'trim',
    subtitleSettings: {
      position: 'bottom',
      fontSize: 'medium',
      fontFamily: 'default',
    },
  });

  const handleFileSelect = useCallback(async (file: File) => {
    try {
      setStatus({
        stage: 'extracting',
        progress: 10,
        message: t.extracting,
      });

      const extractedFiles = await extractZipFile(file);
      setFiles(extractedFiles);

      setStatus({
        stage: 'parsing',
        progress: 40,
        message: 'Parsing configuration...',
      });

      // Find JSON config
      const { jsonFiles } = categorizeFiles(extractedFiles);
      
      if (jsonFiles.length === 0) {
        throw new Error('No JSON configuration file found in the ZIP');
      }

      const config = parseProjectConfig(jsonFiles[0]);
      
      // Parse shared subtitle file if exists
      const { subtitleFiles } = categorizeFiles(extractedFiles);
      let allCues: SubtitleCue[] | undefined;
      if (subtitleFiles.length > 0) {
        const decoder = new TextDecoder('utf-8');
        const content = decoder.decode(subtitleFiles[0].data);
        allCues = parseSubtitles(content, subtitleFiles[0].name);
        console.log(`[VideoAssembler] Parsed shared subtitle file with ${allCues.length} cues`);
      }
      
      const processedScenes = await matchFilesToScenes(config, extractedFiles, allCues);
      
      setScenes(processedScenes);
      setActiveScene(0);

      setStatus({
        stage: 'idle',
        progress: 0,
        message: '',
      });

      toast.success(`${processedScenes.length} ${t.scenes}`);
    } catch (error) {
      console.error('Error processing ZIP:', error);
      setStatus({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      toast.error(error instanceof Error ? error.message : 'Failed to process ZIP file');
    }
  }, [t]);

  const handleProcess = useCallback(async () => {
    try {
      setOutputBlob(null);
      setShowFinalPreview(false);
      const blob = await processScenes(scenes, settings, setStatus);
      setOutputBlob(blob);
      setShowFinalPreview(true); // Show preview after processing
      toast.success(t.processingComplete);
    } catch (error) {
      console.error('Processing error:', error);
      setStatus({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Processing failed',
      });
      toast.error(error instanceof Error ? error.message : 'Video processing failed');
    }
  }, [scenes, settings, t]);

  const handleDownload = useCallback(() => {
    if (outputBlob) {
      const ext = settings.engine === 'canvas' ? 'webm' : 'mp4';
      downloadBlob(outputBlob, `assembled-video.${ext}`);
      toast.success('Download started!');
    }
  }, [outputBlob, settings.engine]);

  const handleEditSettings = useCallback(() => {
    setShowFinalPreview(false);
  }, []);

  const handleReset = useCallback(() => {
    setFiles([]);
    setScenes([]);
    setActiveScene(0);
    setOutputBlob(null);
    setShowFinalPreview(false);
    setStatus({ stage: 'idle', progress: 0, message: '' });
  }, []);

  const hasScenes = scenes.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <span className="text-xl">🎬</span>
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">{t.appTitle}</h1>
                <p className="text-xs text-muted-foreground">{t.appSubtitle}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleLanguage}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <Languages className="w-4 h-4" />
                {t.switchLang}
              </Button>
              
              {hasScenes && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t.startOver}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!hasScenes ? (
          <div className="max-w-2xl mx-auto">
            <UploadZone 
              onFileSelect={handleFileSelect}
              isLoading={status.stage === 'extracting' || status.stage === 'parsing'}
            />
          </div>
        ) : showFinalPreview && outputBlob ? (
          // Show final video preview
          <div className="max-w-4xl mx-auto space-y-6">
            <FinalVideoPreview
              videoBlob={outputBlob}
              onDownload={handleDownload}
              onEditSettings={handleEditSettings}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Files Summary */}
            <FilesSummary files={files} />
            
            {/* Main Grid */}
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${isRTL ? 'lg:grid-flow-dense' : ''}`}>
              {/* Scene List */}
              <div className="lg:col-span-1">
                <SceneList
                  scenes={scenes}
                  activeScene={activeScene}
                  onSceneClick={setActiveScene}
                />
              </div>
              
              {/* Preview */}
              <div className="lg:col-span-2 space-y-6">
                <VideoPreview
                  scenes={scenes}
                  activeScene={activeScene}
                  onSceneChange={setActiveScene}
                />
                
                <ProcessingPanel
                  status={status}
                  settings={settings}
                  onSettingsChange={setSettings}
                  onProcess={handleProcess}
                  onDownload={handleDownload}
                  hasScenes={hasScenes}
                />
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border/30 py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t.poweredBy} {settings.engine === 'ffmpeg' ? 'FFmpeg WASM' : 'Canvas API'} • {t.allProcessing}
          </p>
        </div>
      </footer>
    </div>
  );
}
