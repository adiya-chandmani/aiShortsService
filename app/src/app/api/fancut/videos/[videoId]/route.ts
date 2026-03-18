import { NextResponse } from 'next/server';
import { decodeOperationToken, GeminiRequestError, geminiJson } from '@/lib/fancut/gemini';

export const runtime = 'nodejs';

type GeminiVideoOperation = {
  name: string;
  done?: boolean;
  error?: {
    message?: string;
  };
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await context.params;
    const operationName = decodeOperationToken(videoId);
    const operation = await geminiJson<GeminiVideoOperation>(`/${operationName}`, {
      method: 'GET',
    });

    const downloadUri = operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

    return NextResponse.json({
      id: videoId,
      status: operation.done ? (operation.error?.message ? 'failed' : 'completed') : 'in_progress',
      progress: operation.done ? 100 : 0,
      error: operation.error,
      downloadUri,
    });
  } catch (error) {
    const status = error instanceof GeminiRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '영상 상태 조회에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
