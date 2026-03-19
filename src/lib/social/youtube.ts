import type { NextRequest } from 'next/server';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3/videos';

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

export class YouTubeApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'YouTubeApiError';
    this.status = status;
  }
}

export type YouTubeSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope?: string;
  channelId?: string;
  channelTitle?: string;
  avatarUrl?: string;
};

export type YouTubeChannelProfile = {
  channelId?: string;
  channelTitle?: string;
  avatarUrl?: string;
};

function parseGoogleErrorPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  if ('error' in payload && typeof payload.error === 'string') {
    return payload.error;
  }
  const errorObject = (payload as { error?: { message?: string } }).error;
  return errorObject?.message ?? null;
}

async function parseGoogleError(response: Response) {
  try {
    const payload = await response.json();
    return parseGoogleErrorPayload(payload) ?? `Google API 요청에 실패했습니다. (${response.status})`;
  } catch {
    return `Google API 요청에 실패했습니다. (${response.status})`;
  }
}

function resolveSiteUrl(request?: Request | NextRequest) {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (request) {
    return new URL(request.url).origin;
  }
  throw new Error('NEXT_PUBLIC_SITE_URL이 설정되지 않았습니다. 루트 .env.local에 NEXT_PUBLIC_SITE_URL=http://localhost:3000 을 추가하세요.');
}

export function getYouTubeConfig(request?: Request | NextRequest) {
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new YouTubeApiError(
      'YOUTUBE_CLIENT_ID 또는 YOUTUBE_CLIENT_SECRET이 설정되지 않았습니다. 루트 .env.local에 Google OAuth 웹 클라이언트 값을 추가하세요.',
      500,
    );
  }

  const redirectUri =
    process.env.YOUTUBE_REDIRECT_URI?.trim() || `${resolveSiteUrl(request)}/api/social/youtube/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function isYouTubeConfigured() {
  return Boolean(process.env.YOUTUBE_CLIENT_ID?.trim() && process.env.YOUTUBE_CLIENT_SECRET?.trim() && process.env.SOCIAL_SESSION_SECRET?.trim());
}

export function buildYouTubeAuthUrl({
  request,
  state,
}: {
  request: Request | NextRequest;
  state: string;
}) {
  const { clientId, redirectUri } = getYouTubeConfig(request);
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent select_account');
  url.searchParams.set('scope', YOUTUBE_SCOPES.join(' '));
  url.searchParams.set('state', state);
  return url.toString();
}

async function tokenRequest(body: URLSearchParams) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new YouTubeApiError(await parseGoogleError(response), response.status);
  }

  return (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
    token_type: 'Bearer';
  };
}

export async function exchangeCodeForYouTubeSession({
  request,
  code,
}: {
  request: Request | NextRequest;
  code: string;
}) {
  const { clientId, clientSecret, redirectUri } = getYouTubeConfig(request);
  const tokens = await tokenRequest(
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  );

  if (!tokens.refresh_token) {
    throw new YouTubeApiError('Google이 refresh token을 돌려주지 않았습니다. 동의 화면을 다시 진행해 주세요.', 400);
  }

  const channel = await fetchYouTubeChannelProfile(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    scope: tokens.scope,
    ...channel,
  } satisfies YouTubeSession;
}

export async function refreshYouTubeSession({
  request,
  session,
}: {
  request?: Request | NextRequest;
  session: YouTubeSession;
}) {
  if (session.expiresAt > Date.now() + 60_000) {
    return session;
  }

  const { clientId, clientSecret } = getYouTubeConfig(request);
  const tokens = await tokenRequest(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: session.refreshToken,
      grant_type: 'refresh_token',
    }),
  );

  return {
    ...session,
    accessToken: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    scope: tokens.scope ?? session.scope,
  } satisfies YouTubeSession;
}

export async function revokeYouTubeSession(session: YouTubeSession) {
  const url = new URL(GOOGLE_REVOKE_URL);
  url.searchParams.set('token', session.refreshToken || session.accessToken);
  await fetch(url, {
    method: 'POST',
    cache: 'no-store',
  }).catch(() => undefined);
}

export async function fetchYouTubeChannelProfile(accessToken: string) {
  const response = await fetch(`${YOUTUBE_API_BASE}/channels?part=snippet&mine=true`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new YouTubeApiError(await parseGoogleError(response), response.status);
  }

  const payload = (await response.json()) as {
    items?: Array<{
      id: string;
      snippet?: {
        title?: string;
        thumbnails?: {
          default?: { url?: string };
          medium?: { url?: string };
        };
      };
    }>;
  };
  const channel = payload.items?.[0];
  return {
    channelId: channel?.id,
    channelTitle: channel?.snippet?.title,
    avatarUrl: channel?.snippet?.thumbnails?.medium?.url ?? channel?.snippet?.thumbnails?.default?.url,
  } satisfies YouTubeChannelProfile;
}

export async function createYouTubeUploadSession({
  accessToken,
  title,
  description,
  tags,
  privacyStatus,
  fileSize,
  mimeType,
}: {
  accessToken: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: 'private' | 'unlisted' | 'public';
  fileSize: number;
  mimeType: string;
}) {
  const url = new URL(YOUTUBE_UPLOAD_BASE);
  url.searchParams.set('uploadType', 'resumable');
  url.searchParams.set('part', 'snippet,status');
  url.searchParams.set('notifySubscribers', 'false');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(fileSize),
      'X-Upload-Content-Type': mimeType,
    },
    body: JSON.stringify({
      snippet: {
        title,
        description,
        tags,
        categoryId: '22',
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new YouTubeApiError(await parseGoogleError(response), response.status);
  }

  const location = response.headers.get('location');
  if (!location) {
    throw new YouTubeApiError('YouTube 업로드 세션 URL을 받지 못했습니다.', 502);
  }
  return location;
}

export async function uploadBinaryToYouTube({
  accessToken,
  uploadUrl,
  mimeType,
  videoBuffer,
}: {
  accessToken: string;
  uploadUrl: string;
  mimeType: string;
  videoBuffer: Buffer;
}) {
  const body = new Uint8Array(videoBuffer);
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': mimeType,
      'Content-Length': String(videoBuffer.length),
    },
    body,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new YouTubeApiError(await parseGoogleError(response), response.status);
  }

  return (await response.json()) as {
    id: string;
    snippet?: {
      title?: string;
    };
    status?: {
      uploadStatus?: string;
      privacyStatus?: string;
    };
  };
}
