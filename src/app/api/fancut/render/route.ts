import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { concatMp4Clips, trimAndNormalizeClip, withTempDir } from '@/lib/fancut/ffmpeg';
import { falBinary, FalRequestError, falVideoResult } from '@/lib/fancut/fal';
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

    if (!body.clips?.length) {
      throw new FalRequestError('병합할 컷 영상이 없습니다.', 400);
    }

    return await withTempDir('fancut-render-', async (dir) => {
      const normalizedPaths: string[] = [];

      for (let index = 0; index < body.clips.length; index += 1) {
        const clip = body.clips[index];
        const result = await falVideoResult(clip.videoId);
        const videoUri = result.video?.url;
        if (!videoUri) {
          throw new FalRequestError(`CUT ${index + 1}의 Seedance 영상 URL을 찾지 못했습니다.`, 502);
        }

        const upstream = await falBinary(videoUri, { method: 'GET' });
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
    const status = error instanceof FalRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '최종 렌더에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
