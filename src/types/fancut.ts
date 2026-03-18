export type TargetDuration = 15 | 30;
export type AspectRatio = '9:16' | '16:9';
export type ResolutionPreset = '720p' | '1080p';

export type StylePreset =
  | 'anime'
  | 'webtoon'
  | 'cinematic'
  | 'realistic'
  | 'pixel'
  | 'minimal';

export type MotionType = 'static' | 'zoom_in' | 'pan_left' | 'pan_right';

export interface CharacterConsistency {
  name: string;
  role: string;
  appearance: string;
  wardrobe: string;
  colorPalette: string;
  mustKeep: string[];
}

export interface ProjectConsistency {
  storySummary: string;
  styleCore: string;
  visualRules: string[];
  characterBible: CharacterConsistency[];
}

export interface FanCutProject {
  projectId: string;
  createdAt: string;
  title: string;
  ideaText: string;
  genre?: string;
  tone?: string;
  ipTag?: string;
  stylePreset: StylePreset;
  targetDuration: TargetDuration;
  aspectRatio: AspectRatio;
  resolution: ResolutionPreset;
  referenceImageDataUrl?: string;
  consistency?: ProjectConsistency;
  policyAdaptationNote?: string;
}

export interface FanCutCut {
  cutId: string;
  projectId: string;
  order: number;
  sceneSummary: string;
  characters: string;
  action: string;
  composition: string;
  background: string;
  lighting: string;
  mood: string;
  storyPoint: string;
  durationSec: 3 | 5;
  imagePrompt?: string;
  videoPrompt?: string;
  policyAdaptationNote?: string;
}

export interface ImageCandidate {
  imageId: string;
  cutId: string;
  createdAt: string;
  promptSummary: string;
  imageDataUrl: string;
  source: 'gemini' | 'aihorde' | 'together';
}

export interface CutImageState {
  cutId: string;
  candidates: ImageCandidate[];
  selectedImageId?: string;
}

export interface VideoAsset {
  videoId: string;
  cutId: string;
  createdAt: string;
  sourceImageId: string;
  motionType: MotionType;
  durationSec: 3 | 5;
  videoObjectUrl: string; // browser-only URL.createObjectURL(blob)
  providerVideoId?: string;
  actualDurationSec?: number;
  status?: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  errorMessage?: string;
}

export interface FinalRender {
  renderId: string;
  projectId: string;
  createdAt: string;
  outputObjectUrl: string;
  thumbnailDataUrl: string;
  totalDurationSec: number;
  format: 'mp4';
}
