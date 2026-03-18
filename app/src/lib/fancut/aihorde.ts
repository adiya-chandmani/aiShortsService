import type { StylePreset } from '@/types/fancut';

const AIHORDE_BASE_URL = process.env.AIHORDE_BASE_URL ?? 'https://stablehorde.net/api/v2';
const ANON_API_KEY = '0000000000';
const MAX_RETRIES = 2;
const MODEL_CACHE_TTL_MS = 60_000;

let cachedModelNames: { names: string[]; fetchedAt: number } | null = null;

export class AIHordeRequestError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'AIHordeRequestError';
    this.status = status;
  }
}

function getApiKey() {
  return process.env.AIHORDE_API_KEY?.trim() || ANON_API_KEY;
}

function getClientAgent() {
  return process.env.AIHORDE_CLIENT_AGENT?.trim() || 'AISHORT:0.1.0:https://localhost:3000';
}

function makeHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set('apikey', getApiKey());
  headers.set('Client-Agent', getClientAgent());
  headers.set('Accept', 'application/json');
  return headers;
}

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as {
      message?: string;
      error?: string;
      errors?: string[];
    };
    return data.message ?? data.error ?? data.errors?.[0] ?? `AI Horde 호출 실패 (${response.status})`;
  } catch {
    return `AI Horde 호출 실패 (${response.status})`;
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

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve(undefined);
    }, ms);

    function onAbort() {
      clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function aiHordeJson<T>(path: string, init: RequestInit, attempt = 0): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${AIHORDE_BASE_URL}${path}`, {
    ...init,
    headers: makeHeaders(headers),
    cache: 'no-store',
  });

  if ((response.status === 429 || response.status === 502 || response.status === 503) && attempt < MAX_RETRIES) {
    await sleep(getRetryDelayMs(response, attempt), init.signal ?? undefined);
    return aiHordeJson<T>(path, init, attempt + 1);
  }

  if (!response.ok) {
    throw new AIHordeRequestError(await parseErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

type AIHordeActiveModel = {
  name?: string;
};

export function aiHordeImageSize(aspectRatio: '9:16' | '16:9') {
  return aspectRatio === '16:9'
    ? { width: 768, height: 512 }
    : { width: 512, height: 768 };
}

export function dataUrlToAihordeBase64(dataUrl?: string) {
  if (!dataUrl) return undefined;
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  return match?.[2];
}

async function getActiveModelNames() {
  if (cachedModelNames && Date.now() - cachedModelNames.fetchedAt < MODEL_CACHE_TTL_MS) {
    return cachedModelNames.names;
  }

  const models = await aiHordeJson<AIHordeActiveModel[]>('/status/models', {
    method: 'GET',
  });

  const names = models
    .map((model) => model.name?.trim())
    .filter((name): name is string => Boolean(name));

  cachedModelNames = { names, fetchedAt: Date.now() };
  return names;
}

function scoreModelName(stylePreset: StylePreset, modelName: string) {
  const lower = modelName.toLowerCase();
  const scoreFragments: Array<[string, number]> =
    stylePreset === 'anime' || stylePreset === 'webtoon'
      ? [
          ['animagine', 120],
          ['anime', 110],
          ['anything', 95],
          ['meina', 95],
          ['cetus', 90],
          ['aam', 85],
          ['illustrious', 75],
        ]
      : stylePreset === 'realistic'
        ? [
            ['juggernaut', 120],
            ['realistic', 110],
            ['dreamshaper', 95],
            ['albedo', 85],
            ['icbinp', 80],
          ]
        : stylePreset === 'cinematic'
          ? [
              ['dreamshaper', 120],
              ['juggernaut', 110],
              ['cinematic', 100],
              ['albedo', 85],
              ['icbinp', 80],
            ]
          : stylePreset === 'pixel'
            ? [
                ['pixel', 130],
                ['retro', 85],
                ['dreamshaper', 60],
              ]
            : [
                ['dreamshaper', 95],
                ['albedo', 80],
                ['juggernaut', 75],
                ['illustration', 65],
              ];

  let score = 0;
  for (const [fragment, weight] of scoreFragments) {
    if (lower.includes(fragment)) {
      score += weight;
    }
  }

  if (lower.includes('xl')) score += 12;
  if (lower.includes('turbo')) score -= 10;

  return score;
}

export async function pickAIHordeModels(stylePreset: StylePreset) {
  try {
    const names = await getActiveModelNames();
    return names
      .map((name) => ({ name, score: scoreModelName(stylePreset, name) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}
