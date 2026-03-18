import type { MotionType } from '@/types/fancut';

async function loadImage(dataUrl: string) {
  const img = new Image();
  img.decoding = 'async';
  img.src = dataUrl;
  await img.decode();
  return img;
}

function constrainedSize(width: number, height: number, maxLongEdge: number) {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) {
    return { width, height };
  }

  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export async function generateCutVideoWebm(params: {
  imageDataUrl: string;
  motionType: MotionType;
  durationSec: 3 | 5;
  size?: { width: number; height: number };
}) {
  const { imageDataUrl, motionType, durationSec } = params;
  const width = params.size?.width ?? 720;
  const height = params.size?.height ?? 1280;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  const img = await loadImage(imageDataUrl);

  const fps = 30;
  const totalFrames = Math.max(1, Math.round(durationSec * fps));
  const stream = canvas.captureStream(fps);

  // Prefer vp9 if available; fall back gracefully.
  const preferredTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const mimeType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';

  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const started = new Promise<void>((resolve) => {
    recorder.onstart = () => resolve();
  });
  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error('MediaRecorder failed'));
  });

  recorder.start();
  await started;

  // Draw loop
  for (let f = 0; f < totalFrames; f++) {
    const t = easeInOut(f / (totalFrames - 1 || 1));
    ctx.clearRect(0, 0, width, height);

    // Contain-cover behavior
    const imgRatio = img.width / img.height;
    const canvasRatio = width / height;
    let drawW = width;
    let drawH = height;
    if (imgRatio > canvasRatio) {
      drawH = height;
      drawW = height * imgRatio;
    } else {
      drawW = width;
      drawH = width / imgRatio;
    }

    // Base center crop
    const baseX = (width - drawW) / 2;
    const baseY = (height - drawH) / 2;

    let x = baseX;
    let y = baseY;
    let scale = 1;

    if (motionType === 'zoom_in') {
      scale = lerp(1, 1.08, t);
      x = baseX - (drawW * (scale - 1)) / 2;
      y = baseY - (drawH * (scale - 1)) / 2;
    } else if (motionType === 'pan_left') {
      const dx = lerp(0, -Math.min(60, drawW * 0.06), t);
      x = baseX + dx;
    } else if (motionType === 'pan_right') {
      const dx = lerp(0, Math.min(60, drawW * 0.06), t);
      x = baseX + dx;
    }

    ctx.drawImage(img, x, y, drawW * scale, drawH * scale);

    // subtle vignette
    const g = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, height * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // frame pacing
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  }

  recorder.stop();
  return await stopped;
}

export async function createThumbnailDataUrl(imageDataUrl: string) {
  const img = await loadImage(imageDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  const imgRatio = img.width / img.height;
  const canvasRatio = canvas.width / canvas.height;
  let drawW = canvas.width;
  let drawH = canvas.height;
  if (imgRatio > canvasRatio) {
    drawH = canvas.height;
    drawW = canvas.height * imgRatio;
  } else {
    drawW = canvas.width;
    drawH = canvas.width / imgRatio;
  }
  const x = (canvas.width - drawW) / 2;
  const y = (canvas.height - drawH) / 2;

  ctx.drawImage(img, x, y, drawW, drawH);
  return canvas.toDataURL('image/png');
}

export async function optimizeVideoReferenceDataUrl(
  imageDataUrl: string,
  options?: { maxLongEdge?: number; quality?: number }
) {
  const img = await loadImage(imageDataUrl);
  const maxLongEdge = options?.maxLongEdge ?? 960;
  const quality = options?.quality ?? 0.78;
  const size = constrainedSize(img.width, img.height, maxLongEdge);

  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.drawImage(img, 0, 0, size.width, size.height);
  return canvas.toDataURL('image/jpeg', quality);
}
