import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { baseCookieOptions, sealCookieValue, YOUTUBE_OAUTH_STATE_COOKIE } from '@/lib/social/session';
import { buildYouTubeAuthUrl, isYouTubeConfigured } from '@/lib/social/youtube';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!isYouTubeConfigured()) {
    return NextResponse.json(
      {
        error:
          'YouTube 업로드 설정이 비어 있습니다. YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, SOCIAL_SESSION_SECRET을 먼저 설정하세요.',
      },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get('returnTo') || '/studio';
  const state = randomUUID();
  const authUrl = buildYouTubeAuthUrl({ request, state });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(
    YOUTUBE_OAUTH_STATE_COOKIE,
    sealCookieValue({
      state,
      returnTo,
      createdAt: Date.now(),
    }),
    {
      ...baseCookieOptions({ secure: process.env.NODE_ENV === 'production' }),
      maxAge: 60 * 10,
    },
  );
  return response;
}
