import { NextResponse } from 'next/server';
import {
  deapiJson,
  deapiResultUrl,
  deapiStatusErrorMessage,
  normalizeDeapiVideoStatus,
  DeapiRequestError,
  type DeapiStatusPayload,
} from '@/lib/fancut/deapi';
import { readProviderKeyOverrides } from '@/lib/fancut/provider-keys';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await context.params;
    const providerKeys = readProviderKeyOverrides(request);
    const payload = await deapiJson<DeapiStatusPayload>(`/request-status/${videoId}`, {
      method: 'GET',
    }, 0, providerKeys.deapiApiKey);
    const downloadUri = deapiResultUrl(payload);
    const status = normalizeDeapiVideoStatus(payload.data?.status, Boolean(downloadUri));

    return NextResponse.json({
      id: videoId,
      status,
      progress:
        typeof payload.data?.progress === 'number'
          ? payload.data.progress
          : status === 'completed'
            ? 100
            : status === 'in_progress'
              ? 50
              : 0,
      downloadUri,
      error: deapiStatusErrorMessage(payload) ? { message: deapiStatusErrorMessage(payload) } : undefined,
    });
  } catch (error) {
    const status = error instanceof DeapiRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '영상 상태 조회에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
