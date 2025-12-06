import { SubtitleCue } from '@/types/project';

// Arabic character range detection
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function isArabicText(text: string): boolean {
  return ARABIC_REGEX.test(text);
}

function parseTimestamp(timestamp: string): number {
  // Handle both SRT (00:00:00,000) and VTT (00:00:00.000) formats
  const normalized = timestamp.replace(',', '.').trim();
  const parts = normalized.split(':');
  
  if (parts.length === 3) {
    const [hours, minutes, rest] = parts;
    const [seconds, ms] = rest.split('.');
    return (
      parseInt(hours, 10) * 3600 +
      parseInt(minutes, 10) * 60 +
      parseInt(seconds, 10) +
      (ms ? parseInt(ms.padEnd(3, '0').slice(0, 3), 10) / 1000 : 0)
    );
  }
  
  return 0;
}

export function parseSRT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = content.trim().split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;
    
    // Find the timestamp line (contains -->)
    let timestampIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timestampIndex = i;
        break;
      }
    }
    
    if (timestampIndex === -1) continue;
    
    const timestampLine = lines[timestampIndex];
    const [startStr, endStr] = timestampLine.split('-->').map(s => s.trim());
    
    const startTime = parseTimestamp(startStr);
    const endTime = parseTimestamp(endStr);
    
    // Get text lines (everything after timestamp)
    const textLines = lines.slice(timestampIndex + 1);
    const text = textLines.join('\n').trim();
    
    if (text) {
      cues.push({
        startTime,
        endTime,
        text,
        isRTL: isArabicText(text),
      });
    }
  }
  
  return cues;
}

export function parseVTT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  
  // Remove WEBVTT header and any metadata
  const lines = content.split('\n');
  let startIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('-->')) {
      startIndex = i;
      break;
    }
  }
  
  const contentWithoutHeader = lines.slice(startIndex > 0 ? startIndex - 1 : 0).join('\n');
  const blocks = contentWithoutHeader.trim().split(/\n\s*\n/);
  
  for (const block of blocks) {
    const blockLines = block.trim().split('\n');
    if (blockLines.length < 2) continue;
    
    // Find timestamp line
    let timestampIndex = -1;
    for (let i = 0; i < blockLines.length; i++) {
      if (blockLines[i].includes('-->')) {
        timestampIndex = i;
        break;
      }
    }
    
    if (timestampIndex === -1) continue;
    
    const timestampLine = blockLines[timestampIndex];
    const [startStr, endStr] = timestampLine.split('-->').map(s => s.trim().split(' ')[0]);
    
    const startTime = parseTimestamp(startStr);
    const endTime = parseTimestamp(endStr);
    
    const textLines = blockLines.slice(timestampIndex + 1);
    const text = textLines.join('\n').trim();
    
    if (text) {
      cues.push({
        startTime,
        endTime,
        text,
        isRTL: isArabicText(text),
      });
    }
  }
  
  return cues;
}

export function parseSubtitles(content: string, filename: string): SubtitleCue[] {
  const ext = filename.toLowerCase();
  
  if (ext.endsWith('.vtt')) {
    return parseVTT(content);
  }
  
  return parseSRT(content);
}

export function getCurrentSubtitle(cues: SubtitleCue[], currentTime: number): SubtitleCue | null {
  for (const cue of cues) {
    if (currentTime >= cue.startTime && currentTime <= cue.endTime) {
      return cue;
    }
  }
  return null;
}
