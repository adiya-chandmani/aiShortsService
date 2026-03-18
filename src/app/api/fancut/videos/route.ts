import { NextResponse } from 'next/server';
import {
  dataUrlToBase64,
  togetherJson,
  togetherVideoDimensions,
  togetherVideoModel,
  TogetherRequestError,
  type TogetherVideoResponse,
} from '@/lib/fancut/together';
import { buildVideoPrompt } from '@/lib/fancut/prompts';
import type { FanCutCut, FanCutProject, MotionType } from '@/types/fancut';

export const runtime = 'nodejs';

type CreateVideoRequest = {
  project: FanCutProject;
  cut: FanCutCut;
  motionType: MotionType;
  durationSec: 3 | 5;
  imageDataUrl: string;
  endImageDataUrl?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateVideoRequest;
    const model = togetherVideoModel();
    const dimensions = togetherVideoDimensions(body.project.aspectRatio);
    const frameImages: Array<Record<string, unknown>> = [
      {
        frame: 0,
        input_image: dataUrlToBase64(body.imageDataUrl),
      },
    ];

    if (body.endImageDataUrl) {
      frameImages.push({
        frame: 'last',
        input_image: dataUrlToBase64(body.endImageDataUrl),
      });
    }

    const created = await togetherJson<TogetherVideoResponse>('/videos', {
      method: 'POST',
      body: JSON.stringify({
        model,
        prompt: buildVideoPrompt({
          project: body.project,
          cut: body.cut,
          motionType: body.motionType,
          durationSec: body.durationSec,
        }),
        width: dimensions.width,
        height: dimensions.height,
        seconds: String(body.durationSec),
        steps: 16,
        frame_images: frameImages,
      }),
    });

    return NextResponse.json({
      id: created.id,
      status: created.status,
      progress: created.status === 'completed' ? 100 : 0,
      seconds: body.durationSec,
    });
  } catch (error) {
    const status = error instanceof TogetherRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '영상 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
