const FAL_QUEUE_BASE_URL = process.env.FAL_QUEUE_BASE_URL ?? 'https://queue.fal.run';

export class FalRequestError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'FalRequestError';
    this.status = status;
  }
}

function getApiKey() {
  const apiKey = process.env.FAL_KEY ?? process.env.FAL_API_KEY;
  if (!apiKey) {
    throw new FalRequestError(
      'FAL_KEY 또는 FAL_API_KEY가 설정되지 않았습니다. 루트 .env.local에 FAL_KEY=... 를 추가한 뒤 개발 서버를 다시 시작하세요.',
      500
    );
  }
  return apiKey;
}

function makeHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set('Authorization', `Key ${getApiKey()}`);
  return headers;
}

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as {
      detail?: string | Array<{ msg?: string }>;
      error?: string;
      message?: string;
    };

    if (typeof data.detail === 'string' && data.detail.trim()) return data.detail;
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail.map((item) => item.msg).filter(Boolean).join(', ');
    }
    return data.error ?? data.message ?? `fal API 호출 실패 (${response.status})`;
  } catch {
    return `fal API 호출 실패 (${response.status})`;
  }
}

function buildUrl(path: string) {
  return path.startsWith('http://') || path.startsWith('https://') ? path : `${FAL_QUEUE_BASE_URL}${path}`;
}

export async function falJson<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers: makeHeaders(headers),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new FalRequestError(await parseErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

export async function falBinary(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new FalRequestError(await parseErrorMessage(response), response.status);
  }

  return response;
}

export type FalQueueSubmitResponse = {
  request_id: string;
  response_url: string;
  status_url: string;
  cancel_url: string;
};

export type FalQueueStatusResponse = {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED';
  request_id: string;
  queue_position?: number;
  response_url?: string;
  status_url?: string;
  cancel_url?: string;
};

export type FalVideoResult = {
  video?: {
    url?: string;
  };
  seed?: number;
};

export function falVideoModel() {
  return process.env.FAL_VIDEO_MODEL ?? 'fal-ai/bytedance/seedance/v1/lite/image-to-video';
}

export async function falSubmitVideo(input: Record<string, unknown>) {
  return await falJson<FalQueueSubmitResponse>(`/${falVideoModel()}`, {
    method: 'POST',
    headers: {
      'X-Fal-Object-Lifecycle-Preference': JSON.stringify({
        expiration_duration_seconds: 3600,
      }),
    },
    body: JSON.stringify(input),
  });
}

export async function falVideoStatus(requestId: string) {
  return await falJson<FalQueueStatusResponse>(`/${falVideoModel()}/requests/${requestId}/status`, {
    method: 'GET',
  });
}

export async function falVideoResult(requestId: string) {
  return await falJson<FalVideoResult>(`/${falVideoModel()}/requests/${requestId}`, {
    method: 'GET',
  });
}
