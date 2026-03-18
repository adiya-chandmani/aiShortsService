import { NextResponse } from 'next/server';
import { dataUrlToInlineData, encodeOperationToken, GeminiRequestError, geminiJson } from '@/lib/fancut/gemini';
import { buildVideoPrompt, geminiVideoSecondsForDuration } from '@/lib/fancut/prompts';
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

type GeminiVideoOperation = {
  name: string;
  done?: boolean;
  error?: {
    message?: string;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateVideoRequest;
    const model = process.env.GEMINI_VIDEO_MODEL ?? 'veo-3.1-fast-generate-preview';
    const seconds = geminiVideoSecondsForDuration(body.durationSec);

    const instance: Record<string, unknown> = {
      prompt: buildVideoPrompt({
        project: body.project,
        cut: body.cut,
        motionType: body.motionType,
        durationSec: body.durationSec,
      }),
      image: {
        inlineData: dataUrlToInlineData(body.imageDataUrl),
      },
    };

    if (body.endImageDataUrl) {
      instance.lastFrame = {
        inlineData: dataUrlToInlineData(body.endImageDataUrl),
      };
    }

    const operation = await geminiJson<GeminiVideoOperation>(`/models/${model}:predictLongRunning`, {
      method: 'POST',
      body: JSON.stringify({
        instances: [instance],
        parameters: {
          aspectRatio: body.project.aspectRatio,
          resolution: '720p',
          durationSeconds: seconds,
        },
      }),
    });

    return NextResponse.json({
      id: encodeOperationToken(operation.name),
      status: operation.done ? 'completed' : 'queued',
      progress: 0,
      seconds,
    });
  } catch (error) {
    const status = error instanceof GeminiRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '영상 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
