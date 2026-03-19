import type { AspectRatio } from '@/types/fancut';

function normalizeDeapiBaseUrl(raw?: string) {
  const base = (raw ?? 'https://api.deapi.ai/api/v1/client').trim().replace(/\/+$/, '');

  if (base.endsWith('/api/v1/client')) return base;
  if (base.endsWith('/api/v1')) return `${base}/client`;
  if (base.endsWith('/api')) return `${base}/v1/client`;

  return `${base}/api/v1/client`;
}

const DEAPI_BASE_URL = normalizeDeapiBaseUrl(process.env.DEAPI_BASE_URL);
const DEFAULT_VIDEO_MODEL = 'Ltxv_13B_0_9_8_Distilled_FP8';

export class DeapiRequestError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'DeapiRequestError';
    this.status = status;
  }
}

function getApiKey() {
  const apiKey = process.env.DEAPI_API_KEY?.trim();
  if (!apiKey) {
    throw new DeapiRequestError(
      'DEAPI_API_KEY가 설정되지 않았습니다. 루트 .env.local에 DEAPI_API_KEY=... 를 추가한 뒤 서버를 다시 시작하세요.',
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
  const raw = await response.text();
  if (!raw.trim()) {
    return `deAPI 호출 실패 (${response.status})`;
  }

  try {
    const data = JSON.parse(raw) as {
      message?: string;
      error?: string | { message?: string };
      data?: { message?: string; error?: string | { message?: string } };
    };

    if (typeof data.error === 'string') return data.error;
    if (typeof data.data?.error === 'string') return data.data.error;
    return (
      data.error?.message ??
      data.data?.error?.message ??
      data.message ??
      data.data?.message ??
      raw.slice(0, 300)
    );
  } catch {
    return raw.slice(0, 300);
  }
}

export async function deapiJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${DEAPI_BASE_URL}${path}`, {
    ...init,
    headers: makeHeaders(init.headers),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new DeapiRequestError(await parseErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

export function deapiVideoModel() {
  return process.env.DEAPI_VIDEO_MODEL?.trim() || DEFAULT_VIDEO_MODEL;
}

export function deapiVideoDimensions(aspectRatio: AspectRatio) {
  return aspectRatio === '16:9'
    ? { width: 1024, height: 576 }
    : { width: 576, height: 1024 };
}

export function deapiVideoFps() {
  return 16;
}

export function deapiVideoFrames(durationSec: 3 | 5) {
  return durationSec * deapiVideoFps();
}

function mimeToExtension(mime: string) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/bmp') return 'bmp';
  return 'jpg';
}

export function dataUrlToUpload(dataUrl: string, filenamePrefix: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    throw new DeapiRequestError('이미지 형식을 읽을 수 없습니다. base64 data URL이 필요합니다.', 400);
  }

  const [, mime, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  const blob = new Blob([buffer], { type: mime });
  const filename = `${filenamePrefix}.${mimeToExtension(mime)}`;

  return { blob, filename };
}

export type DeapiQueueResponse = {
  data?: {
    request_id?: string;
  };
};

export type DeapiStatusPayload = {
  data?: {
    status?: string;
    progress?: number;
    preview?: string;
    result_url?: string;
    result?: string;
    message?: string;
    error?: string | { message?: string };
  };
};

export function normalizeDeapiVideoStatus(status?: string, hasResult = false) {
  if (hasResult || status === 'done' || status === 'completed') return 'completed' as const;
  if (status === 'processing' || status === 'running' || status === 'in_progress') return 'in_progress' as const;
  if (status === 'error' || status === 'failed') return 'failed' as const;
  return 'queued' as const;
}

export function deapiResultUrl(payload: DeapiStatusPayload) {
  return payload.data?.result_url ?? payload.data?.result;
}

export function deapiStatusErrorMessage(payload: DeapiStatusPayload) {
  if (typeof payload.data?.error === 'string') return payload.data.error;
  return payload.data?.error?.message ?? payload.data?.message;
}
