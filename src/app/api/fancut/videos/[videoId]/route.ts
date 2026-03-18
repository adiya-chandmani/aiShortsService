import { NextResponse } from 'next/server';
import { togetherJson, TogetherRequestError, type TogetherVideoResponse } from '@/lib/fancut/together';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await context.params;
    const video = await togetherJson<TogetherVideoResponse>(`/videos/${videoId}`, {
      method: 'GET',
    });

    return NextResponse.json({
      id: videoId,
      status: video.status,
      progress: video.status === 'completed' ? 100 : video.status === 'in_progress' ? 50 : 0,
      seconds: video.seconds,
      downloadUri: video.outputs?.video_url,
      error: video.error ?? (video.info?.errors?.[0] ? { message: video.info.errors[0] } : undefined),
    });
  } catch (error) {
    const status = error instanceof TogetherRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '영상 상태 조회에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
