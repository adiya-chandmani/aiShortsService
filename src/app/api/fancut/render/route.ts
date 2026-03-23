import { NextResponse } from 'next/server';
import { DeapiRequestError } from '@/lib/fancut/deapi';
import { buildFinalRenderBuffer } from '@/lib/fancut/final-render';
import { readProviderKeyOverrides } from '@/lib/fancut/provider-keys';
import type { VideoSize } from '@/lib/fancut/prompts';

export const runtime = 'nodejs';

type RenderRequest = {
  clips: Array<{
    videoId: string;
    durationSec: number;
  }>;
  size: VideoSize;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RenderRequest;
    const providerKeys = readProviderKeyOverrides(request);

    if (!body.clips?.length) {
      throw new DeapiRequestError('병합할 컷 영상이 없습니다.', 400);
    }
    const outputBuffer = await buildFinalRenderBuffer({
      clips: body.clips,
      size: body.size,
      deapiApiKey: providerKeys.deapiApiKey,
    });

    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-store',
        'Content-Disposition': 'attachment; filename="fancut-final.mp4"',
      },
    });
  } catch (error) {
    const status = error instanceof DeapiRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '최종 렌더에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
