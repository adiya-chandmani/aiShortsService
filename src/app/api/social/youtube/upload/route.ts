import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { baseCookieOptions, sealCookieValue, unsealCookieValue, YOUTUBE_SESSION_COOKIE } from '@/lib/social/session';
import {
  createYouTubeUploadSession,
  isYouTubeConfigured,
  refreshYouTubeSession,
  type YouTubeSession,
  uploadBinaryToYouTube,
  YouTubeApiError,
} from '@/lib/social/youtube';
import type { UploadResult, YouTubePrivacyStatus } from '@/types/social';

export const runtime = 'nodejs';

function parseHashtags(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(/\s+/)
        .map((token) => token.replace(/^#+/, '').trim())
        .filter(Boolean)
    )
  ).slice(0, 8);
}

export async function POST(request: Request) {
  if (!isYouTubeConfigured()) {
    return NextResponse.json(
      {
        error: 'YouTube 업로드 설정이 비어 있습니다. YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, SOCIAL_SESSION_SECRET을 먼저 설정하세요.',
      },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const session = unsealCookieValue<YouTubeSession>(cookieStore.get(YOUTUBE_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: '연결된 YouTube 채널이 없습니다. 먼저 OAuth 연결을 완료하세요.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const video = formData.get('video');
    const title = String(formData.get('title') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const hashtags = parseHashtags(String(formData.get('hashtags') ?? ''));
    const privacyStatus = (String(formData.get('privacyStatus') ?? 'private') as YouTubePrivacyStatus) || 'private';

    if (!(video instanceof File)) {
      throw new YouTubeApiError('업로드할 MP4 파일을 찾지 못했습니다.', 400);
    }
    if (!title) {
      throw new YouTubeApiError('업로드 제목을 입력해 주세요.', 400);
    }

    const refreshed = await refreshYouTubeSession({ request, session });
    const mimeType = video.type || 'video/mp4';
    const videoBuffer = Buffer.from(await video.arrayBuffer());
    const descriptionWithHashtags = [description, hashtags.map((tag) => `#${tag}`).join(' ')].filter(Boolean).join('\n\n');

    const uploadUrl = await createYouTubeUploadSession({
      accessToken: refreshed.accessToken,
      title,
      description: descriptionWithHashtags,
      tags: hashtags,
      privacyStatus,
      fileSize: videoBuffer.length,
      mimeType,
    });

    const uploadResponse = await uploadBinaryToYouTube({
      accessToken: refreshed.accessToken,
      uploadUrl,
      mimeType,
      videoBuffer,
    });

    const result: UploadResult = {
      platform: 'youtube',
      success: true,
      message: 'YouTube Shorts 업로드가 완료되었습니다.',
      uploadedAt: new Date().toISOString(),
      videoId: uploadResponse.id,
      videoUrl: uploadResponse.id ? `https://www.youtube.com/watch?v=${uploadResponse.id}` : undefined,
    };

    const response = NextResponse.json(result);
    response.cookies.set(YOUTUBE_SESSION_COOKIE, sealCookieValue<YouTubeSession>(refreshed), {
      ...baseCookieOptions({ secure: request.url.startsWith('https://') || process.env.NODE_ENV === 'production' }),
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (err) {
    const status = err instanceof YouTubeApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'YouTube 업로드에 실패했습니다.';
    const response = NextResponse.json({ error: message }, { status });
    if (status === 401 || status === 403) {
      response.cookies.delete(YOUTUBE_SESSION_COOKIE);
    }
    return response;
  }
}
