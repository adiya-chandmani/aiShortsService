import { NextResponse } from 'next/server';
import {
  dataUrlToBase64,
  togetherJson,
  togetherVideoDimensions,
  togetherVideoFallbackModel,
  togetherVideoFps,
  togetherVideoModel,
  togetherVideoSeconds,
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

    const createVideo = (model: string) => {
      const dimensions = togetherVideoDimensions(model, body.project.aspectRatio);
      const seconds = togetherVideoSeconds(model, body.durationSec);
      const fps = togetherVideoFps(model);

      return {
        model,
        prompt: buildVideoPrompt({
          project: body.project,
          cut: body.cut,
          motionType: body.motionType,
          durationSec: body.durationSec,
        }),
        width: dimensions.width,
        height: dimensions.height,
        seconds,
        steps: 16,
        ...(fps ? { fps } : {}),
        frame_images: frameImages,
      };
    };

    const requestedModel = togetherVideoModel();
    const fallbackModel = togetherVideoFallbackModel(requestedModel);

    let created: TogetherVideoResponse;
    let usedModel = requestedModel;

    try {
      created = await togetherJson<TogetherVideoResponse>('/videos', {
        method: 'POST',
        body: JSON.stringify(createVideo(requestedModel)),
      });
    } catch (error) {
      if (!(error instanceof TogetherRequestError) || error.status !== 404 || !fallbackModel) {
        throw error;
      }

      usedModel = fallbackModel;
      created = await togetherJson<TogetherVideoResponse>('/videos', {
        method: 'POST',
        body: JSON.stringify(createVideo(fallbackModel)),
      });
    }

    return NextResponse.json({
      id: created.id,
      status: created.status,
      progress: created.status === 'completed' ? 100 : 0,
      model: created.model || usedModel,
      seconds: created.seconds ?? togetherVideoSeconds(usedModel, body.durationSec),
    });
  } catch (error) {
    const status = error instanceof TogetherRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '영상 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
