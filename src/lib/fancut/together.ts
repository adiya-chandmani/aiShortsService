import type { AspectRatio } from '@/types/fancut';

function normalizeTogetherBaseUrl(raw?: string) {
  const base = (raw ?? 'https://api.together.xyz/v1').trim().replace(/\/+$/, '');
  return base.endsWith('/v1') ? base : `${base}/v1`;
}

const TOGETHER_BASE_URL = normalizeTogetherBaseUrl(process.env.TOGETHER_BASE_URL);
const MAX_RETRIES = 2;
const DEFAULT_IMAGE_MODEL = 'black-forest-labs/FLUX.1-schnell';
const DEFAULT_REFERENCE_IMAGE_MODEL = 'black-forest-labs/FLUX.1-kontext-pro';
const DEFAULT_VIDEO_MODEL = 'pixverse/pixverse-v5.6';
const PIXVERSE_FALLBACK_VIDEO_MODEL = 'pixverse/pixverse-v5';

export class TogetherRequestError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'TogetherRequestError';
    this.status = status;
  }
}

function getApiKey() {
  const apiKey = process.env.TOGETHER_API_KEY?.trim();
  if (!apiKey) {
    throw new TogetherRequestError(
      'TOGETHER_API_KEY가 설정되지 않았습니다. app/.env.local에 TOGETHER_API_KEY=... 를 추가한 뒤 개발 서버를 다시 시작하세요.',
      500
    );
  }
  return apiKey;
}

function makeHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set('Authorization', `Bearer ${getApiKey()}`);
  headers.set('Accept', 'application/json');
  return headers;
}

async function parseErrorMessage(response: Response) {
  try {
    const raw = await response.text();
    if (!raw.trim()) {
      return `Together AI 호출 실패 (${response.status})`;
    }

    const data = JSON.parse(raw) as {
      error?: string | { message?: string };
      message?: string;
      detail?: string;
    };

    if (typeof data.error === 'string') return data.error;
    return data.error?.message ?? data.message ?? data.detail ?? `Together AI 호출 실패 (${response.status})`;
  } catch {
    return `Together AI 호출 실패 (${response.status})`;
  }
}

function getRetryDelayMs(response: Response, attempt: number) {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  }
  return 1500 * (attempt + 1);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function togetherJson<T>(path: string, init: RequestInit, attempt = 0): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${TOGETHER_BASE_URL}${path}`, {
    ...init,
    headers: makeHeaders(headers),
    cache: 'no-store',
  });

  if ((response.status === 429 || response.status === 503 || response.status === 504) && attempt < MAX_RETRIES) {
    await sleep(getRetryDelayMs(response, attempt));
    return togetherJson<T>(path, init, attempt + 1);
  }

  if (!response.ok) {
    throw new TogetherRequestError(await parseErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

export function togetherImageSize(aspectRatio: AspectRatio) {
  return aspectRatio === '16:9'
    ? { width: 1344, height: 768 }
    : { width: 768, height: 1344 };
}

export function togetherDefaultImageModel() {
  return process.env.TOGETHER_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
}

export function togetherReferenceImageModel() {
  return process.env.TOGETHER_REFERENCE_IMAGE_MODEL?.trim() || DEFAULT_REFERENCE_IMAGE_MODEL;
}

export function resolveTogetherImageModel(hasReferenceImage: boolean) {
  if (hasReferenceImage && togetherReferenceImageModel()) {
    return togetherReferenceImageModel();
  }
  return togetherDefaultImageModel();
}

export type TogetherReferenceMode = 'none' | 'image_url' | 'reference_images';

export function togetherReferenceMode(model: string): TogetherReferenceMode {
  const lower = model.toLowerCase();

  if (lower.includes('kontext')) return 'image_url';
  if (lower.includes('flux.2')) return 'reference_images';
  if (lower.includes('google/gemini-3-pro-image')) return 'reference_images';
  if (lower.includes('google/flash-image-2.5')) return 'reference_images';

  return 'none';
}

export function togetherDefaultSteps(model: string) {
  const lower = model.toLowerCase();
  if (lower.includes('kontext')) return 28;
  if (lower.includes('schnell')) return 4;
  return 20;
}

export function togetherVideoModel() {
  return process.env.TOGETHER_VIDEO_MODEL?.trim() || DEFAULT_VIDEO_MODEL;
}

export function togetherVideoFallbackModel(model: string) {
  const lower = model.toLowerCase();

  if (lower === DEFAULT_VIDEO_MODEL.toLowerCase()) {
    return PIXVERSE_FALLBACK_VIDEO_MODEL;
  }

  return undefined;
}

export function togetherVideoDimensions(model: string, aspectRatio: AspectRatio) {
  const lower = model.toLowerCase();

  if (lower.includes('pixverse')) {
    return aspectRatio === '16:9'
      ? { width: 960, height: 540, size: '960x540' }
      : { width: 540, height: 960, size: '540x960' };
  }

  return aspectRatio === '16:9'
    ? { width: 1280, height: 720, size: '1280x720' }
    : { width: 720, height: 1280, size: '720x1280' };
}

export function togetherVideoSeconds(model: string, durationSec: 3 | 5) {
  const lower = model.toLowerCase();

  if (lower.includes('pixverse') || lower.includes('seedance')) {
    return '5';
  }

  return String(durationSec);
}

export function togetherVideoFps(model: string) {
  const lower = model.toLowerCase();

  if (lower.includes('pixverse')) {
    return 16;
  }

  return undefined;
}

export function dataUrlToBase64(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    throw new TogetherRequestError('이미지 형식을 읽을 수 없습니다. base64 data URL이 필요합니다.', 400);
  }

  return match[2];
}

export type TogetherVideoResponse = {
  id: string;
  model: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  created_at?: string | number;
  size?: string;
  seconds?: string;
  error?: {
    message?: string;
    code?: string;
  };
  info?: {
    errors?: string[] | null;
  };
  outputs?: {
    cost?: number;
    video_url?: string;
  };
};
