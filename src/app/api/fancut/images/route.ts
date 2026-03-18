import { NextResponse } from 'next/server';
import {
  TogetherRequestError,
  resolveTogetherImageModel,
  togetherDefaultSteps,
  togetherImageSize,
  togetherJson,
  togetherReferenceMode,
} from '@/lib/fancut/together';
import { createId } from '@/lib/fancut/id';
import { buildTogetherImagePrompt } from '@/lib/fancut/prompts';
import type { FanCutCut, FanCutProject, ImageCandidate } from '@/types/fancut';

export const runtime = 'nodejs';

type ImagesRequest = {
  project: FanCutProject;
  cut: FanCutCut;
  count: number;
  previousImageDataUrl?: string;
  previousCutSummary?: string;
  previousCutCharacters?: string;
};

type TogetherImagesResponse = {
  model?: string;
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

function buildPromptSummary(cut: FanCutCut) {
  return [
    `등장인물: ${cut.characters}`,
    `상황: ${cut.imagePrompt?.trim() || cut.sceneSummary}`,
    `행동: ${cut.action}`,
    `구도: ${cut.composition}`,
  ].join(' | ');
}

function buildNegativePrompt(project: FanCutProject) {
  const styleSpecific =
    project.stylePreset === 'pixel'
      ? 'blurry upscale, painterly texture, smooth gradients'
      : project.stylePreset === 'minimal'
        ? 'busy clutter, photoreal texture overload'
        : 'deformed anatomy, extra fingers, duplicate character, face drift';

  return [
    'text, logo, watermark, subtitle, speech bubble',
    'comic panel, manga screentone, panel border, webtoon page, storyboard sheet',
    'low quality, blurry, jpeg artifacts, washed colors',
    styleSpecific,
  ].join(', ');
}

async function requestImages(body: ImagesRequest, signal: AbortSignal) {
  const sourceImage = body.previousImageDataUrl ?? body.project.referenceImageDataUrl;
  const model = resolveTogetherImageModel(Boolean(sourceImage));
  const referenceMode = togetherReferenceMode(model);
  const canUseReferenceImage = Boolean(sourceImage) && referenceMode !== 'none';
  const { width, height } = togetherImageSize(body.project.aspectRatio);
  const prompt = buildTogetherImagePrompt({
    project: body.project,
    cut: body.cut,
    count: body.count,
    hasReferenceImage: canUseReferenceImage,
    previousCutSummary: body.previousCutSummary,
    previousCutCharacters: body.previousCutCharacters,
  });

  const response = await togetherJson<TogetherImagesResponse>('/images/generations', {
    method: 'POST',
    signal,
    body: JSON.stringify({
      prompt,
      model,
      n: body.count,
      width,
      height,
      steps: togetherDefaultSteps(model),
      guidance_scale: 4.5,
      negative_prompt: buildNegativePrompt(body.project),
      response_format: 'base64',
      output_format: 'png',
      ...(sourceImage && canUseReferenceImage && referenceMode === 'image_url'
        ? {
            image_url: sourceImage,
          }
        : {}),
      ...(sourceImage && canUseReferenceImage && referenceMode === 'reference_images'
        ? {
            reference_images: [sourceImage],
          }
        : {}),
    }),
  });

  const images = (response.data ?? [])
    .map((item) => item.b64_json)
    .filter((item): item is string => Boolean(item));

  if (images.length === 0) {
    throw new TogetherRequestError('Together AI 이미지 생성 결과를 찾지 못했습니다.', 502);
  }

  return images;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImagesRequest;
    const count = Math.max(1, Math.min(body.count, 4));
    const promptSummary = buildPromptSummary(body.cut);
    const base64Images = await requestImages({ ...body, count }, request.signal);
    const candidates: ImageCandidate[] = base64Images.slice(0, count).map((base64) => ({
        imageId: createId('img'),
        cutId: body.cut.cutId,
        createdAt: new Date().toISOString(),
        promptSummary,
        imageDataUrl: `data:image/png;base64,${base64}`,
        source: 'together',
      }));

    return NextResponse.json({ candidates });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return new NextResponse(null, { status: 499 });
    }
    const status = error instanceof TogetherRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '이미지 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
