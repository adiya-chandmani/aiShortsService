import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { unsealCookieValue, YOUTUBE_SESSION_COOKIE } from '@/lib/social/session';
import { revokeYouTubeSession, type YouTubeSession } from '@/lib/social/youtube';

export const runtime = 'nodejs';

export async function POST() {
  const cookieStore = await cookies();
  const session = unsealCookieValue<YouTubeSession>(cookieStore.get(YOUTUBE_SESSION_COOKIE)?.value);

  if (session) {
    await revokeYouTubeSession(session);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(YOUTUBE_SESSION_COOKIE);
  return response;
}
