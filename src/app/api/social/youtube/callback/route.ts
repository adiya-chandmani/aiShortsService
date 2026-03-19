import { NextResponse } from 'next/server';
import {
  baseCookieOptions,
  sealCookieValue,
  unsealCookieValue,
  YOUTUBE_OAUTH_STATE_COOKIE,
  YOUTUBE_SESSION_COOKIE,
} from '@/lib/social/session';
import {
  exchangeCodeForYouTubeSession,
  isYouTubeConfigured,
  type YouTubeSession,
  YouTubeApiError,
} from '@/lib/social/youtube';

export const runtime = 'nodejs';

type OAuthStateCookie = {
  state: string;
  returnTo: string;
  createdAt: number;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');
  const baseUrl = requestUrl.origin;
  const secure = requestUrl.protocol === 'https:' || process.env.NODE_ENV === 'production';

  const redirectWithMessage = (path: string, message: string) => {
    const redirectUrl = new URL(path, baseUrl);
    redirectUrl.searchParams.set('social_error', message);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(YOUTUBE_OAUTH_STATE_COOKIE);
    return response;
  };

  if (!isYouTubeConfigured()) {
    return redirectWithMessage('/studio', 'YouTube 업로드 설정이 비어 있습니다.');
  }

  const cookieStore = request.headers.get('cookie');
  const stateCookieValue =
    cookieStore
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${YOUTUBE_OAUTH_STATE_COOKIE}=`))
      ?.slice(`${YOUTUBE_OAUTH_STATE_COOKIE}=`.length) ?? '';
  const oauthState = unsealCookieValue<OAuthStateCookie>(decodeURIComponent(stateCookieValue));

  if (error) {
    return redirectWithMessage(oauthState?.returnTo || '/studio', `Google OAuth가 거절되었습니다: ${error}`);
  }

  if (!code || !state || !oauthState || oauthState.state !== state) {
    return redirectWithMessage('/studio', 'OAuth state 검증에 실패했습니다. 다시 연결해 주세요.');
  }

  try {
    const session = await exchangeCodeForYouTubeSession({ request, code });
    const response = NextResponse.redirect(new URL(oauthState.returnTo, baseUrl));
    response.cookies.delete(YOUTUBE_OAUTH_STATE_COOKIE);
    response.cookies.set(
      YOUTUBE_SESSION_COOKIE,
      sealCookieValue<YouTubeSession>(session),
      {
        ...baseCookieOptions({ secure }),
        maxAge: 60 * 60 * 24 * 30,
      },
    );
    return response;
  } catch (err) {
    const message = err instanceof YouTubeApiError || err instanceof Error ? err.message : 'YouTube 연결에 실패했습니다.';
    return redirectWithMessage(oauthState.returnTo || '/studio', message);
  }
}
