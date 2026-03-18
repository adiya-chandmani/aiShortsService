const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta';
const MAX_RETRIES = 2;

export class GeminiRequestError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'GeminiRequestError';
    this.status = status;
  }
}

function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiRequestError(
      'GEMINI_API_KEY가 설정되지 않았습니다. app/.env.local에 GEMINI_API_KEY=... 를 추가한 뒤 개발 서버를 다시 시작하세요.',
      500
    );
  }
  return apiKey;
}

function makeHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set('x-goog-api-key', getApiKey());
  return headers;
}

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as {
      error?: { message?: string };
    };
    return data.error?.message ?? `Gemini API 호출 실패 (${response.status})`;
  } catch {
    return `Gemini API 호출 실패 (${response.status})`;
  }
}

function getRetryDelayMs(response: Response, attempt: number, message?: string) {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  }

  const retryInMatch = message?.match(/retry in\s+([\d.]+)s/i);
  if (retryInMatch) {
    const seconds = Number(retryInMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  return 1500 * (attempt + 1);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function geminiJson<T>(path: string, init: RequestInit, attempt = 0): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${GEMINI_BASE_URL}${path}`, {
    ...init,
    headers: makeHeaders(headers),
    cache: 'no-store',
  });

  if (response.status === 429) {
    const message = await parseErrorMessage(response);

    if (attempt < MAX_RETRIES) {
      await sleep(getRetryDelayMs(response, attempt, message));
      return geminiJson<T>(path, init, attempt + 1);
    }

    throw new GeminiRequestError(message, response.status);
  }

  if (!response.ok) {
    throw new GeminiRequestError(await parseErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

export async function geminiBinaryUrl(url: string, init?: RequestInit, attempt = 0): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: makeHeaders(init?.headers),
    cache: 'no-store',
  });

  if (response.status === 429 && attempt < MAX_RETRIES) {
    await sleep(getRetryDelayMs(response, attempt));
    return geminiBinaryUrl(url, init, attempt + 1);
  }

  if (!response.ok) {
    throw new GeminiRequestError(await parseErrorMessage(response), response.status);
  }

  return response;
}

export function dataUrlToInlineData(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    throw new GeminiRequestError('레퍼런스 이미지 형식을 읽을 수 없습니다. base64 data URL이 필요합니다.', 400);
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
}

export function encodeOperationToken(operationName: string) {
  return Buffer.from(operationName, 'utf8').toString('base64url');
}

export function decodeOperationToken(token: string) {
  try {
    return Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    throw new GeminiRequestError('잘못된 Gemini 작업 토큰입니다.', 400);
  }
}
