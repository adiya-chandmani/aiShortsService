import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import type { VideoSize } from './prompts';

const execFileAsync = promisify(execFile);
const FFMPEG_PATH = process.env.FFMPEG_PATH?.trim() || ffmpegInstaller.path;

function dimensionsForSize(size: VideoSize) {
  const [width, height] = size.split('x').map(Number);
  return { width, height };
}

export async function withTempDir<T>(prefix: string, fn: (dir: string) => Promise<T>) {
  const dir = await fs.mkdtemp(path.join(tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export async function trimAndNormalizeClip(params: {
  inputPath: string;
  outputPath: string;
  size: VideoSize;
  durationSec: number;
}) {
  const { inputPath, outputPath, size, durationSec } = params;
  const { width, height } = dimensionsForSize(size);

  await execFileAsync(
    FFMPEG_PATH,
    [
      '-y',
      '-i',
      inputPath,
      '-t',
      String(durationSec),
      '-vf',
      `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},format=yuv420p`,
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-movflags',
      '+faststart',
      outputPath,
    ],
    { maxBuffer: 20 * 1024 * 1024 }
  );
}

function escapeConcatPath(inputPath: string) {
  return inputPath.replaceAll("'", "'\\''");
}

export async function concatMp4Clips(params: {
  inputPaths: string[];
  outputPath: string;
  workDir: string;
}) {
  const listPath = path.join(params.workDir, 'concat.txt');
  const content = params.inputPaths.map((inputPath) => `file '${escapeConcatPath(inputPath)}'`).join('\n');
  await fs.writeFile(listPath, content, 'utf8');

  await execFileAsync(
    FFMPEG_PATH,
    ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', params.outputPath],
    { maxBuffer: 20 * 1024 * 1024 }
  );
}
