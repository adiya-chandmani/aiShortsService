export const GEMINI_API_KEY_HEADER = 'x-fancut-gemini-api-key';
export const DEAPI_API_KEY_HEADER = 'x-fancut-deapi-api-key';

export type ProviderKeyOverrides = {
  geminiApiKey?: string;
  deapiApiKey?: string;
};

function normalizeKey(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function readProviderKeyOverrides(request: Pick<Request, 'headers'>): ProviderKeyOverrides {
  return {
    geminiApiKey: normalizeKey(request.headers.get(GEMINI_API_KEY_HEADER)),
    deapiApiKey: normalizeKey(request.headers.get(DEAPI_API_KEY_HEADER)),
  };
}

export function mergeProviderKeyHeaders(params: {
  headers?: HeadersInit;
  includeGemini?: boolean;
  includeDeapi?: boolean;
  geminiApiKey?: string;
  deapiApiKey?: string;
}) {
  const headers = new Headers(params.headers);

  if (params.includeGemini) {
    const geminiApiKey = normalizeKey(params.geminiApiKey);
    if (geminiApiKey) {
      headers.set(GEMINI_API_KEY_HEADER, geminiApiKey);
    }
  }

  if (params.includeDeapi) {
    const deapiApiKey = normalizeKey(params.deapiApiKey);
    if (deapiApiKey) {
      headers.set(DEAPI_API_KEY_HEADER, deapiApiKey);
    }
  }

  return headers;
}
