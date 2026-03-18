import { NextResponse } from 'next/server';
import { falVideoResult, falVideoStatus, FalRequestError } from '@/lib/fancut/fal';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await context.params;
    const status = await falVideoStatus(videoId);

    if (status.status === 'COMPLETED') {
      const result = await falVideoResult(videoId);
      return NextResponse.json({
        id: videoId,
        status: 'completed',
        progress: 100,
        downloadUri: result.video?.url,
      });
    }

    return NextResponse.json({
      id: videoId,
      status: status.status === 'IN_QUEUE' ? 'queued' : 'in_progress',
      progress: status.status === 'IN_PROGRESS' ? 50 : 0,
    });
  } catch (error) {
    const status = error instanceof FalRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '영상 상태 조회에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
