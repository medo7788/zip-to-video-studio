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

// Video/Audio sync mode
export type SyncMode = 'trim' | 'speed';

// Subtitle position
export type SubtitlePosition = 'top' | 'center' | 'bottom';

// Subtitle settings
export interface SubtitleSettings {
  position: SubtitlePosition;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'default' | 'arabic' | 'modern';
  timingOffset: number; // seconds (positive = delay, negative = advance)
}

export interface VideoSettings {
  resolution: '720p' | '1080p';
  engine: ProcessingEngine;
  syncMode: SyncMode;
  subtitleSettings: SubtitleSettings;
}

export const RESOLUTION_SETTINGS: Record<'720p' | '1080p', { outputWidth: number; outputHeight: number }> = {
  '720p': { outputWidth: 1280, outputHeight: 720 },
  '1080p': { outputWidth: 1920, outputHeight: 1080 },
};

export const SUBTITLE_FONT_SIZES: Record<'720p' | '1080p', Record<'small' | 'medium' | 'large', number>> = {
  '720p': { small: 24, medium: 32, large: 48 },
  '1080p': { small: 36, medium: 48, large: 72 },
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
  // New translations
  syncMode: string;
  trimVideo: string;
  trimVideoDesc: string;
  speedVideo: string;
  speedVideoDesc: string;
  subtitleSettings: string;
  subtitlePosition: string;
  positionTop: string;
  positionCenter: string;
  positionBottom: string;
  fontSize: string;
  fontSmall: string;
  fontMedium: string;
  fontLarge: string;
  fontFamily: string;
  fontDefault: string;
  fontArabic: string;
  fontModern: string;
  previewFinal: string;
  watchVideo: string;
  editSettings: string;
  timingOffset: string;
  timingAdvance: string;
  timingDelay: string;
  seconds: string;
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
    // New translations
    syncMode: 'Video/Audio Sync',
    trimVideo: 'Trim Video',
    trimVideoDesc: 'Cut video to match audio length',
    speedVideo: 'Speed Video',
    speedVideoDesc: 'Speed up video to match audio',
    subtitleSettings: 'Subtitle Settings',
    subtitlePosition: 'Position',
    positionTop: 'Top',
    positionCenter: 'Center',
    positionBottom: 'Bottom',
    fontSize: 'Font Size',
    fontSmall: 'Small',
    fontMedium: 'Medium',
    fontLarge: 'Large',
    fontFamily: 'Font Style',
    fontDefault: 'Default',
    fontArabic: 'Arabic',
    fontModern: 'Modern',
    previewFinal: 'Preview Final Video',
    watchVideo: 'Watch Video',
    editSettings: 'Edit Settings',
    timingOffset: 'Timing Offset',
    timingAdvance: 'Advance',
    timingDelay: 'Delay',
    seconds: 'sec',
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
    // New translations
    syncMode: 'تزامن الفيديو/الصوت',
    trimVideo: 'قص الفيديو',
    trimVideoDesc: 'قص الفيديو ليتناسب مع طول الصوت',
    speedVideo: 'تسريع الفيديو',
    speedVideoDesc: 'تسريع الفيديو ليتناسب مع الصوت',
    subtitleSettings: 'إعدادات الترجمة',
    subtitlePosition: 'موقع الترجمة',
    positionTop: 'أعلى',
    positionCenter: 'وسط',
    positionBottom: 'أسفل',
    fontSize: 'حجم الخط',
    fontSmall: 'صغير',
    fontMedium: 'متوسط',
    fontLarge: 'كبير',
    fontFamily: 'نوع الخط',
    fontDefault: 'افتراضي',
    fontArabic: 'عربي',
    fontModern: 'عصري',
    previewFinal: 'معاينة الفيديو النهائي',
    watchVideo: 'مشاهدة الفيديو',
    editSettings: 'تعديل الإعدادات',
    timingOffset: 'ضبط التوقيت',
    timingAdvance: 'تقديم',
    timingDelay: 'تأخير',
    seconds: 'ث',
  },
};
