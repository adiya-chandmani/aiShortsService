import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { baseCookieOptions, sealCookieValue, unsealCookieValue, YOUTUBE_SESSION_COOKIE } from '@/lib/social/session';
import { isYouTubeConfigured, refreshYouTubeSession, type YouTubeSession, YouTubeApiError } from '@/lib/social/youtube';
import type { PlatformConnectionStatus } from '@/types/social';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!isYouTubeConfigured()) {
    return NextResponse.json<PlatformConnectionStatus>({
      platform: 'youtube',
      configured: false,
      connected: false,
      message: 'YouTube OAuth 환경 변수가 아직 설정되지 않았습니다.',
    });
  }

  const cookieStore = await cookies();
  const sealed = cookieStore.get(YOUTUBE_SESSION_COOKIE)?.value;
  const session = unsealCookieValue<YouTubeSession>(sealed);

  if (!session) {
    return NextResponse.json<PlatformConnectionStatus>({
      platform: 'youtube',
      configured: true,
      connected: false,
      message: '연결된 YouTube 채널이 없습니다.',
    });
  }

  try {
    const refreshed = await refreshYouTubeSession({ request, session });
    const response = NextResponse.json<PlatformConnectionStatus>({
      platform: 'youtube',
      configured: true,
      connected: true,
      displayName: refreshed.channelTitle,
      avatarUrl: refreshed.avatarUrl,
      channelId: refreshed.channelId,
    });

    if (refreshed.accessToken !== session.accessToken || refreshed.expiresAt !== session.expiresAt) {
      response.cookies.set(YOUTUBE_SESSION_COOKIE, sealCookieValue<YouTubeSession>(refreshed), {
        ...baseCookieOptions({ secure: request.url.startsWith('https://') || process.env.NODE_ENV === 'production' }),
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (err) {
    const message = err instanceof YouTubeApiError || err instanceof Error ? err.message : 'YouTube 연결 상태를 확인하지 못했습니다.';
    const response = NextResponse.json<PlatformConnectionStatus>({
      platform: 'youtube',
      configured: true,
      connected: false,
      message,
    });
    response.cookies.delete(YOUTUBE_SESSION_COOKIE);
    return response;
  }
}
