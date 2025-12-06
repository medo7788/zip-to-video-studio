import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  ExtractedFile, 
  ProcessedScene, 
  ProcessingStatus, 
  VideoSettings, 
  RESOLUTION_SETTINGS 
} from '@/types/project';
import { extractZipFile } from '@/utils/zipExtractor';
import { categorizeFiles } from '@/utils/fileDetection';
import { parseProjectConfig, matchFilesToScenes } from '@/utils/configParser';
import { processScenes, downloadBlob } from '@/utils/videoProcessor';
import { UploadZone } from './UploadZone';
import { FilesSummary } from './FilesSummary';
import { SceneList } from './SceneList';
import { VideoPreview } from './VideoPreview';
import { ProcessingPanel } from './ProcessingPanel';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VideoAssembler() {
  const [files, setFiles] = useState<ExtractedFile[]>([]);
  const [scenes, setScenes] = useState<ProcessedScene[]>([]);
  const [activeScene, setActiveScene] = useState(0);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    progress: 0,
    message: '',
  });
  const [settings, setSettings] = useState<VideoSettings>({
    resolution: '720p',
  });

  const handleFileSelect = useCallback(async (file: File) => {
    try {
      setStatus({
        stage: 'extracting',
        progress: 10,
        message: 'Extracting ZIP file...',
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
      const processedScenes = matchFilesToScenes(config, extractedFiles);
      
      setScenes(processedScenes);
      setActiveScene(0);

      setStatus({
        stage: 'idle',
        progress: 0,
        message: '',
      });

      toast.success(`Successfully loaded ${processedScenes.length} scenes`);
    } catch (error) {
      console.error('Error processing ZIP:', error);
      setStatus({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      toast.error(error instanceof Error ? error.message : 'Failed to process ZIP file');
    }
  }, []);

  const handleProcess = useCallback(async () => {
    try {
      setOutputBlob(null);
      const blob = await processScenes(scenes, settings, setStatus);
      setOutputBlob(blob);
      toast.success('Video processing complete!');
    } catch (error) {
      console.error('Processing error:', error);
      setStatus({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Processing failed',
      });
      toast.error(error instanceof Error ? error.message : 'Video processing failed');
    }
  }, [scenes, settings]);

  const handleDownload = useCallback(() => {
    if (outputBlob) {
      downloadBlob(outputBlob, 'assembled-video.mp4');
      toast.success('Download started!');
    }
  }, [outputBlob]);

  const handleReset = useCallback(() => {
    setFiles([]);
    setScenes([]);
    setActiveScene(0);
    setOutputBlob(null);
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
                <h1 className="text-xl font-bold gradient-text">Video Assembler</h1>
                <p className="text-xs text-muted-foreground">Browser-based video processing</p>
              </div>
            </div>
            
            {hasScenes && (
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Start Over
              </Button>
            )}
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
        ) : (
          <div className="space-y-6">
            {/* Files Summary */}
            <FilesSummary files={files} />
            
            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            Powered by FFmpeg WASM • All processing happens in your browser
          </p>
        </div>
      </footer>
    </div>
  );
}
