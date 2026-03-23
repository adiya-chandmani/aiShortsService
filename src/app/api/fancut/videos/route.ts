import { NextResponse } from 'next/server';
import {
  dataUrlToUpload,
  deapiJson,
  deapiVideoDimensions,
  deapiVideoFps,
  deapiVideoFrames,
  deapiVideoModel,
  DeapiRequestError,
  type DeapiQueueResponse,
} from '@/lib/fancut/deapi';
import { readProviderKeyOverrides } from '@/lib/fancut/provider-keys';
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
    const providerKeys = readProviderKeyOverrides(request);
    const model = deapiVideoModel();
    const dimensions = deapiVideoDimensions(body.project.aspectRatio);
    const frames = deapiVideoFrames(body.durationSec);
    const fps = deapiVideoFps();

    const form = new FormData();
    const firstFrame = dataUrlToUpload(body.imageDataUrl, 'first-frame');
    form.append('first_frame_image', firstFrame.blob, firstFrame.filename);
    form.append('prompt', buildVideoPrompt({
      project: body.project,
      cut: body.cut,
      motionType: body.motionType,
      durationSec: body.durationSec,
    }));
    form.append('model', model);
    form.append('width', String(dimensions.width));
    form.append('height', String(dimensions.height));
    form.append('frames', String(frames));
    form.append('fps', String(fps));
    form.append('steps', '1');
    form.append('guidance', '7.5');
    form.append('seed', String(Math.floor(Math.random() * 1_000_000_000)));
    form.append(
      'negative_prompt',
      'blurry, low detail, duplicate limbs, extra fingers, poster, comic panels, text, watermark, logo, deformed anatomy'
    );

    if (body.endImageDataUrl) {
      const lastFrame = dataUrlToUpload(body.endImageDataUrl, 'last-frame');
      form.append('last_frame_image', lastFrame.blob, lastFrame.filename);
    }

    const created = await deapiJson<DeapiQueueResponse>('/img2video', {
      method: 'POST',
      body: form,
    }, 0, providerKeys.deapiApiKey);

    const requestId = created.data?.request_id;
    if (!requestId) {
      throw new DeapiRequestError('deAPI에서 request_id를 반환하지 않았습니다.', 502);
    }

    return NextResponse.json({
      id: requestId,
      status: 'queued',
      progress: 0,
      model,
      seconds: String(body.durationSec),
    });
  } catch (error) {
    const status = error instanceof DeapiRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '영상 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
