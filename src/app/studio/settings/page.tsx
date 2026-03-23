'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { StudioShell } from '@/components/studio/StudioShell';
import { useProviderSettings } from '@/contexts/ProviderSettingsContext';
import type { PlatformConnectionStatus } from '@/types/social';

function SecretField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-600 dark:text-white/70">{label}</div>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-200/40 dark:border-white/10 dark:bg-white/5 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-sky-500 dark:focus:ring-sky-900/30"
      />
    </label>
  );
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = '요청에 실패했습니다.';
    try {
      const payload = (await response.json()) as { error?: string; message?: string };
      message = payload.error ?? payload.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export default function StudioSettingsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { geminiApiKey, deapiApiKey, saveSettings, clearSettings } = useProviderSettings();
  const [draftGeminiApiKey, setDraftGeminiApiKey] = useState(geminiApiKey);
  const [draftDeapiApiKey, setDraftDeapiApiKey] = useState(deapiApiKey);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [youtubeStatus, setYoutubeStatus] = useState<PlatformConnectionStatus | null>(null);
  const [youtubeMessage, setYoutubeMessage] = useState<string | null>(null);
  const [isCheckingYouTube, setIsCheckingYouTube] = useState(false);
  const [isDisconnectingYouTube, setIsDisconnectingYouTube] = useState(false);

  useEffect(() => {
    setDraftGeminiApiKey(geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    setDraftDeapiApiKey(deapiApiKey);
  }, [deapiApiKey]);

  const loadYouTubeStatus = async () => {
    setIsCheckingYouTube(true);
    try {
      const status = await readJsonOrThrow<PlatformConnectionStatus>(
        await fetch('/api/social/youtube/status', { cache: 'no-store' })
      );
      setYoutubeStatus(status);
    } catch (error) {
      setYoutubeStatus({
        platform: 'youtube',
        configured: false,
        connected: false,
        message: error instanceof Error ? error.message : 'YouTube 연결 상태를 확인하지 못했습니다.',
      });
    } finally {
      setIsCheckingYouTube(false);
    }
  };

  useEffect(() => {
    void loadYouTubeStatus();
  }, []);

  useEffect(() => {
    const socialError = new URLSearchParams(window.location.search).get('social_error');
    if (!socialError) {
      return;
    }

    setYoutubeMessage(socialError);
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const handleSave = () => {
    saveSettings({
      geminiApiKey: draftGeminiApiKey.trim(),
      deapiApiKey: draftDeapiApiKey.trim(),
    });
    setSaveMessage('브라우저 설정에 저장했습니다. 이후 생성 요청부터 바로 사용됩니다.');
  };

  const handleClear = () => {
    clearSettings();
    setDraftGeminiApiKey('');
    setDraftDeapiApiKey('');
    setSaveMessage('브라우저 설정에서 사용자 키를 지웠습니다. 다시 서버 env 값으로 동작합니다.');
  };

  const handleConnectYouTube = () => {
    window.location.href = `/api/social/youtube/auth?returnTo=${encodeURIComponent('/studio/settings')}`;
  };

  const handleDisconnectYouTube = async () => {
    setIsDisconnectingYouTube(true);
    try {
      await fetch('/api/social/youtube/disconnect', { method: 'POST' });
      setYoutubeMessage('YouTube 채널 연결을 해제했습니다.');
      await loadYouTubeStatus();
    } catch (error) {
      setYoutubeMessage(error instanceof Error ? error.message : 'YouTube 연결 해제에 실패했습니다.');
    } finally {
      setIsDisconnectingYouTube(false);
    }
  };

  return (
    <StudioShell
      title="Settings"
      subtitle="Provider Keys"
      contentClassName="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6"
    >
      <div className="grid gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#111218]">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">API 키 설정</div>
            <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/60">
              여기 넣은 키는 현재 브라우저에만 저장되고, 이후 `플롯`, `IP 검색`, `영상 생성`, `렌더` 요청에 우선 적용됩니다.
              비워두면 서버에 설정된 env 값을 사용합니다.
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <SecretField
              label="Gemini API Key"
              value={draftGeminiApiKey}
              onChange={setDraftGeminiApiKey}
              placeholder="AIza..."
            />
            <SecretField
              label="deAPI API Key"
              value={draftDeapiApiKey}
              onChange={setDraftDeapiApiKey}
              placeholder="deapi_..."
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700"
            >
              저장
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
            >
              사용자 키 지우기
            </button>
          </div>

          {saveMessage && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
              {saveMessage}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#111218]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">YouTube 채널 연결</div>
              <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/60">
                업로드 화면에 가지 않아도 여기서 미리 채널을 연결해 둘 수 있습니다. 연결된 채널은 YouTube Shorts 업로드에 바로 사용됩니다.
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadYouTubeStatus()}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
                disabled={isCheckingYouTube}
              >
                {isCheckingYouTube ? '확인 중…' : '상태 새로고침'}
              </button>
              {youtubeStatus?.connected ? (
                <button
                  type="button"
                  onClick={() => void handleDisconnectYouTube()}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/20"
                  disabled={isDisconnectingYouTube}
                >
                  {isDisconnectingYouTube ? '해제 중…' : '연결 해제'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectYouTube}
                  className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
                >
                  YouTube 연결
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">연결 상태</div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      youtubeStatus?.connected
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                        : youtubeStatus?.configured
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'
                          : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/70'
                    }`}
                  >
                    {youtubeStatus?.connected ? '연결됨' : youtubeStatus?.configured ? '미연결' : '미설정'}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-600 dark:text-white/60">
                  {youtubeStatus?.connected
                    ? youtubeStatus.displayName || '연결된 채널'
                    : youtubeStatus?.message || 'YouTube 연결 상태를 아직 불러오지 않았습니다.'}
                </div>
                {youtubeStatus?.channelId && (
                  <div className="mt-1 text-xs text-slate-500 dark:text-white/45">Channel ID: {youtubeStatus.channelId}</div>
                )}
              </div>

              {youtubeStatus?.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={youtubeStatus.avatarUrl}
                  alt=""
                  className="h-14 w-14 rounded-full border border-slate-200 object-cover dark:border-white/10"
                />
              )}
            </div>
          </div>

          {youtubeMessage && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              {youtubeMessage}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#111218]">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">현재 영상 설정</div>
          <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/60">
            deAPI 영상 생성은 현재 앱 기준으로 `30 fps`를 사용합니다. 생성 시간이 길어지거나 provider 과부하가 생기면
            상태 조회와 다운로드에서 자동 재시도를 수행합니다.
          </div>
        </section>
      </div>
    </StudioShell>
  );
}
