import type { AspectRatio } from '@/types/fancut';

const TOGETHER_BASE_URL = process.env.TOGETHER_BASE_URL ?? 'https://api.together.xyz/v1';
const MAX_RETRIES = 2;
const DEFAULT_IMAGE_MODEL = 'black-forest-labs/FLUX.1-schnell';
const DEFAULT_REFERENCE_IMAGE_MODEL = 'black-forest-labs/FLUX.1-kontext-pro';

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
    const data = (await response.json()) as {
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
