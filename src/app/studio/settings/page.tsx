'use client';

import { useEffect, useState } from 'react';
import { StudioShell } from '@/components/studio/StudioShell';
import { useProviderSettings } from '@/contexts/ProviderSettingsContext';

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

export default function StudioSettingsPage() {
  const { geminiApiKey, deapiApiKey, saveSettings, clearSettings } = useProviderSettings();
  const [draftGeminiApiKey, setDraftGeminiApiKey] = useState(geminiApiKey);
  const [draftDeapiApiKey, setDraftDeapiApiKey] = useState(deapiApiKey);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftGeminiApiKey(geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    setDraftDeapiApiKey(deapiApiKey);
  }, [deapiApiKey]);

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
