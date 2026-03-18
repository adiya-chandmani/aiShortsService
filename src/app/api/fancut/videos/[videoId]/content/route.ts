import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { trimAndNormalizeClip, withTempDir } from '@/lib/fancut/ffmpeg';
import { togetherJson, TogetherRequestError, type TogetherVideoResponse } from '@/lib/fancut/together';
import type { VideoSize } from '@/lib/fancut/prompts';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await context.params;
    const url = new URL(request.url);
    const durationSec = Number(url.searchParams.get('durationSec') ?? '0');
    const size = url.searchParams.get('size') as VideoSize | null;

    const video = await togetherJson<TogetherVideoResponse>(`/videos/${videoId}`, {
      method: 'GET',
    });
    const videoUri = video.outputs?.video_url;
    if (!videoUri) {
      throw new TogetherRequestError('Together 영상 다운로드 URL을 찾지 못했습니다.', 502);
    }

    const upstream = await fetch(videoUri, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!upstream.ok) {
      throw new TogetherRequestError(`Together 영상 다운로드에 실패했습니다. (${upstream.status})`, upstream.status);
    }
    const sourceBuffer = Buffer.from(await upstream.arrayBuffer());

    if (!durationSec || !size) {
      return new NextResponse(sourceBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Cache-Control': 'no-store',
        },
      });
    }

    return await withTempDir('fancut-video-', async (dir) => {
      const inputPath = path.join(dir, 'input.mp4');
      const outputPath = path.join(dir, 'trimmed.mp4');

      await fs.writeFile(inputPath, sourceBuffer);
      await trimAndNormalizeClip({
        inputPath,
        outputPath,
        size,
        durationSec,
      });

      const outputBuffer = await fs.readFile(outputPath);
      return new NextResponse(outputBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Cache-Control': 'no-store',
        },
      });
    });
  } catch (error) {
    const status = error instanceof TogetherRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '영상 다운로드에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
