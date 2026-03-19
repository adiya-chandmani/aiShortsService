import { NextResponse } from 'next/server';
import type { UploadResult } from '@/types/social';

export const runtime = 'nodejs';

export async function POST() {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const result: UploadResult = {
    platform: 'tiktok',
    success: true,
    message: 'TikTok mock 업로드가 완료되었습니다.',
    uploadedAt: new Date().toISOString(),
    videoId: `mock-${Date.now()}`,
    videoUrl: 'https://www.tiktok.com/',
  };

  return NextResponse.json(result);
}
