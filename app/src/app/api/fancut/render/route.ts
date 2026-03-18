import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { concatMp4Clips, trimAndNormalizeClip, withTempDir } from '@/lib/fancut/ffmpeg';
import { decodeOperationToken, geminiBinaryUrl, GeminiRequestError, geminiJson } from '@/lib/fancut/gemini';
import type { VideoSize } from '@/lib/fancut/prompts';

export const runtime = 'nodejs';

type RenderRequest = {
  clips: Array<{
    videoId: string;
    durationSec: number;
  }>;
  size: VideoSize;
};

type GeminiVideoOperation = {
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{
        video?: {
          uri?: string;
        };
      }>;
    };
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RenderRequest;

    if (!body.clips?.length) {
      throw new GeminiRequestError('병합할 컷 영상이 없습니다.', 400);
    }

    return await withTempDir('fancut-render-', async (dir) => {
      const normalizedPaths: string[] = [];

      for (let index = 0; index < body.clips.length; index += 1) {
        const clip = body.clips[index];
        const operationName = decodeOperationToken(clip.videoId);
        const operation = await geminiJson<GeminiVideoOperation>(`/${operationName}`, {
          method: 'GET',
        });
        const videoUri = operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        if (!videoUri) {
          throw new GeminiRequestError(`CUT ${index + 1}의 Gemini 영상 URI를 찾지 못했습니다.`, 502);
        }

        const upstream = await geminiBinaryUrl(videoUri, { method: 'GET' });
        const sourceBuffer = Buffer.from(await upstream.arrayBuffer());

        const rawPath = path.join(dir, `clip-${index}-raw.mp4`);
        const normalizedPath = path.join(dir, `clip-${index}.mp4`);

        await fs.writeFile(rawPath, sourceBuffer);
        await trimAndNormalizeClip({
          inputPath: rawPath,
          outputPath: normalizedPath,
          size: body.size,
          durationSec: clip.durationSec,
        });
        normalizedPaths.push(normalizedPath);
      }

      const outputPath = path.join(dir, 'final.mp4');
      await concatMp4Clips({
        inputPaths: normalizedPaths,
        outputPath,
        workDir: dir,
      });

      const outputBuffer = await fs.readFile(outputPath);
      return new NextResponse(outputBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Cache-Control': 'no-store',
          'Content-Disposition': 'attachment; filename="fancut-final.mp4"',
        },
      });
    });
  } catch (error) {
    const status = error instanceof GeminiRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '최종 렌더에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
