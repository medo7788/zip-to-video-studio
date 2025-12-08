export interface SceneConfig {
  id: number;
  video?: string;
  audio?: string;
  subtitle?: string;
}

export interface ProjectConfig {
  scenes: SceneConfig[];
}

export interface ExtractedFile {
  name: string;
  path: string;
  data: Uint8Array;
  type: 'video' | 'audio' | 'subtitle' | 'sfx' | 'json' | 'unknown';
}

export interface ProcessedScene {
  id: number;
  videoFile?: ExtractedFile;
  audioFile?: ExtractedFile;
  subtitleFile?: ExtractedFile;
  subtitleCues?: SubtitleCue[];
  videoUrl?: string;
  audioUrl?: string;
  duration?: number;
}

export interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
  isRTL: boolean;
}

export interface ProcessingStatus {
  stage: 'idle' | 'extracting' | 'parsing' | 'processing' | 'encoding' | 'complete' | 'error';
  progress: number;
  message: string;
  currentScene?: number;
  totalScenes?: number;
}

export type ProcessingEngine = 'ffmpeg' | 'canvas';

export interface VideoSettings {
  resolution: '720p' | '1080p';
  engine: ProcessingEngine;
}

export const RESOLUTION_SETTINGS: Record<'720p' | '1080p', { outputWidth: number; outputHeight: number }> = {
  '720p': { outputWidth: 1280, outputHeight: 720 },
  '1080p': { outputWidth: 1920, outputHeight: 1080 },
};

// Translations
export type Language = 'en' | 'ar';

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  startOver: string;
  uploadTitle: string;
  uploadDrag: string;
  extracting: string;
  extractingDesc: string;
  dropHere: string;
  videos: string;
  audio: string;
  subtitles: string;
  scenes: string;
  scene: string;
  noVideo: string;
  noAudio: string;
  noSubs: string;
  cues: string;
  exportSettings: string;
  outputResolution: string;
  processingEngine: string;
  ffmpegDesc: string;
  canvasDesc: string;
  generateVideo: string;
  processing: string;
  downloadMp4: string;
  processingComplete: string;
  readyToDownload: string;
  noVideoScene: string;
  poweredBy: string;
  allProcessing: string;
  filesSummary: string;
  switchLang: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appTitle: 'Video Assembler',
    appSubtitle: 'Browser-based video processing',
    startOver: 'Start Over',
    uploadTitle: 'Upload your project ZIP',
    uploadDrag: 'Drag and drop or click to select a ZIP file',
    extracting: 'Extracting files...',
    extractingDesc: 'Please wait while we process your ZIP file',
    dropHere: 'Drop your ZIP file here',
    videos: 'Videos',
    audio: 'Audio',
    subtitles: 'Subtitles',
    scenes: 'Scenes',
    scene: 'Scene',
    noVideo: 'No video',
    noAudio: 'No audio',
    noSubs: 'No subs',
    cues: 'cues',
    exportSettings: 'Export Settings',
    outputResolution: 'Output Resolution',
    processingEngine: 'Processing Engine',
    ffmpegDesc: 'FFmpeg (High Quality)',
    canvasDesc: 'Canvas API (Faster)',
    generateVideo: 'Generate Video',
    processing: 'Processing...',
    downloadMp4: 'Download MP4',
    processingComplete: 'Processing complete!',
    readyToDownload: 'Your video is ready to download',
    noVideoScene: 'No video available for this scene',
    poweredBy: 'Powered by',
    allProcessing: 'All processing happens in your browser',
    filesSummary: 'Files Summary',
    switchLang: 'عربي',
  },
  ar: {
    appTitle: 'مُجمّع الفيديو',
    appSubtitle: 'معالجة الفيديو في المتصفح',
    startOver: 'البدء من جديد',
    uploadTitle: 'ارفع ملف ZIP الخاص بمشروعك',
    uploadDrag: 'اسحب وأفلت أو انقر لاختيار ملف ZIP',
    extracting: 'جاري استخراج الملفات...',
    extractingDesc: 'يرجى الانتظار أثناء معالجة ملف ZIP',
    dropHere: 'أفلت ملف ZIP هنا',
    videos: 'فيديوهات',
    audio: 'صوت',
    subtitles: 'ترجمات',
    scenes: 'المشاهد',
    scene: 'مشهد',
    noVideo: 'لا يوجد فيديو',
    noAudio: 'لا يوجد صوت',
    noSubs: 'لا توجد ترجمات',
    cues: 'نص',
    exportSettings: 'إعدادات التصدير',
    outputResolution: 'دقة الإخراج',
    processingEngine: 'محرك المعالجة',
    ffmpegDesc: 'FFmpeg (جودة عالية)',
    canvasDesc: 'Canvas API (أسرع)',
    generateVideo: 'إنشاء الفيديو',
    processing: 'جاري المعالجة...',
    downloadMp4: 'تحميل MP4',
    processingComplete: 'اكتملت المعالجة!',
    readyToDownload: 'الفيديو جاهز للتحميل',
    noVideoScene: 'لا يوجد فيديو لهذا المشهد',
    poweredBy: 'مدعوم بواسطة',
    allProcessing: 'تتم جميع المعالجة في متصفحك',
    filesSummary: 'ملخص الملفات',
    switchLang: 'English',
  },
};
