import { NextResponse } from 'next/server';
import { falSubmitVideo, FalRequestError } from '@/lib/fancut/fal';
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
    const input: Record<string, unknown> = {
      prompt: buildVideoPrompt({
        project: body.project,
        cut: body.cut,
        motionType: body.motionType,
        durationSec: body.durationSec,
      }),
      image_url: body.imageDataUrl,
      aspect_ratio: body.project.aspectRatio,
      duration: String(body.durationSec),
      resolution: '720p',
      camera_fixed: body.motionType === 'static',
    };

    if (body.endImageDataUrl) {
      input.end_image_url = body.endImageDataUrl;
    }

    const queued = await falSubmitVideo(input);

    return NextResponse.json({
      id: queued.request_id,
      status: 'queued',
      progress: 0,
      seconds: body.durationSec,
    });
  } catch (error) {
    const status = error instanceof FalRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '영상 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
