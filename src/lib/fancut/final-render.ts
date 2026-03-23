import { promises as fs } from 'node:fs';
import path from 'node:path';
import { concatMp4Clips, trimAndNormalizeClip, withTempDir } from '@/lib/fancut/ffmpeg';
import {
  deapiJson,
  deapiResultUrl,
  DeapiRequestError,
  type DeapiStatusPayload,
} from '@/lib/fancut/deapi';
import type { VideoSize } from '@/lib/fancut/prompts';

const UPSTREAM_VIDEO_RETRY_LIMIT = 4;
const UPSTREAM_VIDEO_RETRY_DELAY_MS = 4_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUpstreamVideo(videoUri: string) {
  for (let attempt = 0; attempt <= UPSTREAM_VIDEO_RETRY_LIMIT; attempt += 1) {
    const upstream = await fetch(videoUri, {
      method: 'GET',
      cache: 'no-store',
    });

    if (upstream.ok) {
      return upstream;
    }

    if (![502, 503, 504].includes(upstream.status) || attempt === UPSTREAM_VIDEO_RETRY_LIMIT) {
      throw new DeapiRequestError(`deAPI 영상 다운로드에 실패했습니다. (${upstream.status})`, upstream.status);
    }

    await sleep(UPSTREAM_VIDEO_RETRY_DELAY_MS);
  }

  throw new DeapiRequestError('deAPI 영상 다운로드에 실패했습니다.', 504);
}

export type RenderClipRequest = {
  videoId: string;
  durationSec: number;
};

export async function buildFinalRenderBuffer(params: {
  clips: RenderClipRequest[];
  size: VideoSize;
  deapiApiKey?: string;
}) {
  if (!params.clips.length) {
    throw new DeapiRequestError('병합할 컷 영상이 없습니다.', 400);
  }

  return await withTempDir('fancut-render-', async (dir) => {
    const normalizedPaths: string[] = [];

    for (let index = 0; index < params.clips.length; index += 1) {
      const clip = params.clips[index];
      const payload = await deapiJson<DeapiStatusPayload>(`/request-status/${clip.videoId}`, {
        method: 'GET',
      }, 0, params.deapiApiKey);
      const videoUri = deapiResultUrl(payload);
      if (!videoUri) {
        throw new DeapiRequestError(`CUT ${index + 1}의 deAPI 영상 URL을 찾지 못했습니다.`, 502);
      }

      const upstream = await fetchUpstreamVideo(videoUri);
      const sourceBuffer = Buffer.from(await upstream.arrayBuffer());

      const rawPath = path.join(dir, `clip-${index}-raw.mp4`);
      const normalizedPath = path.join(dir, `clip-${index}.mp4`);

      await fs.writeFile(rawPath, sourceBuffer);
      await trimAndNormalizeClip({
        inputPath: rawPath,
        outputPath: normalizedPath,
        size: params.size,
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

    return await fs.readFile(outputPath);
  });
}
