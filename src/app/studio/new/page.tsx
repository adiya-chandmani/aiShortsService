'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import type { StylePreset, TargetDuration } from '@/types/fancut';
import { useFanCutStudio } from '@/contexts/FanCutStudioContext';
import { StudioShell } from '@/components/studio/StudioShell';

const STYLE_PRESETS: Array<{ value: StylePreset; label: string; desc: string }> = [
  { value: 'anime', label: '애니', desc: '영상용 애니 키프레임, 선명한 색감' },
  { value: 'webtoon', label: '웹툰풍', desc: '패널이 아닌 웹애니 느낌의 또렷한 라인' },
  { value: 'cinematic', label: '시네마틱', desc: '영화적 톤, 대비감 있는 조명' },
  { value: 'realistic', label: '실사', desc: '현실감 있는 질감과 조명' },
  { value: 'pixel', label: '픽셀', desc: '레트로 감성, 실험적 스타일' },
  { value: 'minimal', label: '미니멀', desc: '단순한 형태, 강한 메시지' },
];

const GALLERY_TILES = Array.from({ length: 18 }).map((_, i) => {
  const palettes = [
    ['#0ea5e9', '#22c55e', '#111827'],
    ['#f97316', '#fb7185', '#111827'],
    ['#a78bfa', '#38bdf8', '#0b0b0d'],
    ['#10b981', '#06b6d4', '#0b0b0d'],
  ];
  const p = palettes[i % palettes.length];
  return {
    id: i,
    title: 'Video',
    gradient: `linear-gradient(135deg, ${p[0]} 0%, ${p[1]} 55%, ${p[2]} 100%)`,
  };
});

function Tile({ gradient }: { gradient: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg ring-1 ring-white/10">
      <div className="aspect-[4/3] w-full" style={{ backgroundImage: gradient }} />
      <div className="absolute left-3 top-3 rounded-lg bg-black/40 px-2 py-1 text-[10px] font-semibold text-white/90 ring-1 ring-white/15">
        Video
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
    </div>
  );
}

function PromptBar({
  value,
  onChange,
  onSubmit,
  submitting,
  disabled,
  expanded,
  setExpanded,
  controls,
  errorTitle,
  errorDetail,
  errorHint,
  basicSettings,
  advancedSettings,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  disabled: boolean;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  controls: React.ReactNode;
  errorTitle?: string | null;
  errorDetail?: string | null;
  errorHint?: string | null;
  basicSettings: React.ReactNode;
  advancedSettings: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/95 p-3 shadow-2xl ring-1 ring-slate-200 backdrop-blur dark:bg-[#121218]/95 dark:ring-white/10">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-2xl bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white/90 dark:placeholder:text-white/35"
            placeholder="만들고 싶은 숏폼을 한 줄로 설명해줘"
          />
        </div>

        {controls}

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-white/5 dark:text-white/85 dark:ring-white/10 dark:hover:bg-white/10"
          aria-label={expanded ? '세부 설정 닫기' : '세부 설정 열기'}
          title={expanded ? '세부 설정 닫기' : '세부 설정 열기'}
        >
          <svg
            className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          disabled={disabled || submitting}
          onClick={onSubmit}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-500/20 transition hover:scale-[1.02] disabled:opacity-50 dark:bg-white dark:text-[#0b0b0d] dark:shadow-white/15"
          aria-label="생성"
          title="생성"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h12" strokeLinecap="round" />
            <path d="M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {errorDetail && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-100">
          <div className="font-semibold">{errorTitle ?? '생성 요청이 실패했습니다.'}</div>
          <div className="mt-1 break-words text-red-800/90 dark:text-red-100/90">{errorDetail}</div>
          {errorHint && (
            <div className="mt-2 text-xs text-red-700 dark:text-red-200/80">{errorHint}</div>
          )}
        </div>
      )}

      <div className="mt-3 border-t border-white/10 pt-3">{basicSettings}</div>
      {expanded && <div className="mt-3 border-t border-white/10 pt-3">{advancedSettings}</div>}
    </div>
  );
}

type MenuKey = 'duration' | 'resolution' | 'aspect';

function ControlPill({
  icon,
  label,
  open,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  open?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold ring-1 transition ${
        open
          ? 'bg-slate-900 text-white ring-slate-900/20 dark:bg-white/10 dark:text-white dark:ring-white/20'
          : 'bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200 dark:bg-white/5 dark:text-white/75 dark:ring-white/10 dark:hover:bg-white/10'
      }`}
    >
      <span className="text-slate-600 dark:text-white/70">{icon}</span>
      <span>{label}</span>
      <svg
        className={`h-4 w-4 text-slate-500 transition-transform dark:text-white/60 ${open ? 'rotate-180' : ''}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Dropdown({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: Array<{ value: string; label: string }>;
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="w-56 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-2xl dark:bg-[#141419] dark:ring-white/10">
      <div className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-white/70">
        {title.toUpperCase()}
      </div>
      <div className="border-t border-slate-200 dark:border-white/10">
        {items.map((it) => {
          const active = it.value === selected;
          return (
            <button
              key={it.value}
              type="button"
              onClick={() => onSelect(it.value)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-white/85 dark:hover:bg-white/5"
            >
              <span>{it.label}</span>
              {active && <span className="text-slate-700 dark:text-white/80">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getSubmitErrorMeta(message: string | null) {
  if (!message) {
    return { title: null, detail: null, hint: null };
  }

  if (message.includes('GEMINI_API_KEY')) {
    return {
      title: 'Gemini API 키가 설정되지 않았습니다.',
      detail: message,
      hint: 'app/.env.local에 GEMINI_API_KEY를 추가하고 개발 서버를 다시 시작하세요.',
    };
  }

  if (message.includes('거절') || message.toLowerCase().includes('refusal')) {
    return {
      title: 'Gemini 정책으로 플롯 생성이 거절되었습니다.',
      detail: message,
      hint: '특정 IP 이름 대신 분위기와 장르로 바꿔 입력해 보세요. 예: "슬램덩크 느낌" 대신 "농구 청춘 애니 감성".',
    };
  }

  if (message.includes('(400)')) {
    return {
      title: 'Gemini 요청이 유효하지 않다고 판단되었습니다.',
      detail: message,
      hint: '요청 형식 오류이거나 정책상 민감한 표현일 수 있습니다. 브라우저 Network 탭의 /api/fancut/plot 응답 본문도 함께 확인하세요.',
    };
  }

  return {
    title: '플롯 생성 중 오류가 발생했습니다.',
    detail: message,
    hint: '입력을 조금 단순하게 바꾸거나 잠시 후 다시 시도해 보세요.',
  };
}

export default function StudioNewPage() {
  const router = useRouter();
  const { createProjectAndPlot } = useFanCutStudio();

  const [title, setTitle] = useState('untitled project');
  const [ideaText, setIdeaText] = useState('');
  const [genre, setGenre] = useState('');
  const [tone, setTone] = useState('');
  const [ipTag, setIpTag] = useState('');
  const [stylePreset, setStylePreset] = useState<StylePreset>('anime');
  const [targetDuration, setTargetDuration] = useState<TargetDuration>(15);
  const [referenceImageDataUrl, setReferenceImageDataUrl] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isValid = useMemo(() => ideaText.trim().length >= 4, [ideaText]);

  // LTX 스타일 프롬프트 설정(데모 UI)
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [videoDurationSec, setVideoDurationSec] = useState<15 | 30>(15);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const errorMeta = useMemo(() => getSubmitErrorMeta(submitError), [submitError]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // /studio empty-state 예시 프롬프트로 진입 시 자동 채우기
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const p = url.searchParams.get('prompt');
    if (!p) return;
    setIdeaText((prev) => (prev.trim().length ? prev : p));
  }, []);

  const handleReferenceUpload = async (file: File) => {
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    setReferenceImageDataUrl(dataUrl);
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { projectId } = await createProjectAndPlot({
        title: title.trim() || 'untitled project',
        ideaText: ideaText.trim(),
        genre: genre.trim() || undefined,
        tone: tone.trim() || undefined,
        ipTag: ipTag.trim() || undefined,
        stylePreset,
        targetDuration,
        aspectRatio,
        resolution,
        referenceImageDataUrl,
      });
      router.push(`/studio/${projectId}/plot`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '프로젝트 생성에 실패했습니다.');
      setExpanded(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StudioShell
      title="Projects"
      subtitle="All Projects   ·   Shared Projects"
      bottomBar={
        <PromptBar
          value={ideaText}
          onChange={setIdeaText}
          onSubmit={() => void handleSubmit()}
          submitting={isSubmitting}
          disabled={!isValid}
          expanded={expanded}
          setExpanded={setExpanded}
          errorTitle={errorMeta.title}
          errorDetail={errorMeta.detail}
          errorHint={errorMeta.hint}
          controls={
            <div className="relative hidden items-center gap-2 lg:flex">
              <ControlPill
                icon={
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
                label={`${videoDurationSec} Sec`}
                open={openMenu === 'duration'}
                onClick={() => setOpenMenu((v) => (v === 'duration' ? null : 'duration'))}
              />
              <ControlPill
                icon={<span>▢</span>}
                label={resolution}
                open={openMenu === 'resolution'}
                onClick={() => setOpenMenu((v) => (v === 'resolution' ? null : 'resolution'))}
              />
              <ControlPill
                icon={<span>◫</span>}
                label={aspectRatio}
                open={openMenu === 'aspect'}
                onClick={() => setOpenMenu((v) => (v === 'aspect' ? null : 'aspect'))}
              />
              {openMenu && (
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setOpenMenu(null)}
                  aria-hidden
                />
              )}

              {openMenu === 'duration' && (
                <div className="absolute right-0 bottom-12 z-40">
                  <Dropdown
                    title="Video Duration"
                    selected={String(videoDurationSec)}
                    items={[
                      { value: '15', label: '15 Sec' },
                      { value: '30', label: '30 Sec' },
                    ]}
                    onSelect={(v) => {
                      const next = Number(v) as 15 | 30;
                      setVideoDurationSec(next);
                      setTargetDuration(next);
                      setOpenMenu(null);
                    }}
                  />
                </div>
              )}

              {openMenu === 'resolution' && (
                <div className="absolute right-0 bottom-12 z-40">
                  <Dropdown
                    title="Resolution"
                    selected={resolution}
                    items={[
                      { value: '720p', label: '720p' },
                      { value: '1080p', label: '1080p' },
                    ]}
                    onSelect={(v) => {
                      setResolution(v as '720p' | '1080p');
                      setOpenMenu(null);
                    }}
                  />
                </div>
              )}

              {openMenu === 'aspect' && (
                <div className="absolute right-0 bottom-12 z-40">
                  <Dropdown
                    title="Aspect Ratio"
                    selected={aspectRatio}
                    items={[
                      { value: '9:16', label: '9:16' },
                      { value: '16:9', label: '16:9' },
                    ]}
                    onSelect={(v) => {
                      setAspectRatio(v as '16:9' | '9:16');
                      setOpenMenu(null);
                    }}
                  />
                </div>
              )}
            </div>
          }
          basicSettings={null}
          advancedSettings={
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-white/70">프로젝트 제목</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2 w-full rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none placeholder:text-slate-400 focus:ring-slate-300 dark:bg-white/5 dark:text-white/90 dark:ring-white/10 dark:placeholder:text-white/35 dark:focus:ring-white/20"
                  placeholder="untitled project"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-white/70">장르(선택)</label>
                <input
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="mt-2 w-full rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none placeholder:text-slate-400 focus:ring-slate-300 dark:bg-white/5 dark:text-white/90 dark:ring-white/10 dark:placeholder:text-white/35 dark:focus:ring-white/20"
                  placeholder="(비워두면 기본값)"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-white/70">톤(선택)</label>
                <input
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="mt-2 w-full rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none placeholder:text-slate-400 focus:ring-slate-300 dark:bg-white/5 dark:text-white/90 dark:ring-white/10 dark:placeholder:text-white/35 dark:focus:ring-white/20"
                  placeholder="(비워두면 기본값)"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-white/70">IP 태그(선택)</label>
                <input
                  value={ipTag}
                  onChange={(e) => setIpTag(e.target.value)}
                  className="mt-2 w-full rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none placeholder:text-slate-400 focus:ring-slate-300 dark:bg-white/5 dark:text-white/90 dark:ring-white/10 dark:placeholder:text-white/35 dark:focus:ring-white/20"
                  placeholder="(비워두면 기본값)"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-white/70">스타일(전체)</label>
                <select
                  value={stylePreset}
                  onChange={(e) => setStylePreset(e.target.value as StylePreset)}
                  className="mt-2 w-full rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none focus:ring-slate-300 dark:bg-white/5 dark:text-white/90 dark:ring-white/10 dark:focus:ring-white/20"
                >
                  {STYLE_PRESETS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label} · {s.desc}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-white/70">레퍼런스 이미지(선택)</label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleReferenceUpload(f);
                    }}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-black dark:text-white/70 dark:file:bg-white dark:file:text-[#0b0b0d] dark:hover:file:bg-white/90"
                  />
                  {referenceImageDataUrl && (
                    <button
                      type="button"
                      onClick={() => setReferenceImageDataUrl(undefined)}
                      className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-white/5 dark:text-white/80 dark:ring-white/10 dark:hover:bg-white/10"
                    >
                      제거
                    </button>
                  )}
                </div>
                {referenceImageDataUrl && (
                  <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-slate-200 dark:ring-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={referenceImageDataUrl} alt="레퍼런스 미리보기" className="h-28 w-full object-cover" />
                  </div>
                )}
                <div className="mt-3 rounded-lg bg-slate-50 p-4 text-[11px] text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-white/60 dark:ring-white/10">
                  <div className="font-semibold text-slate-900 dark:text-white/80">안내</div>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    <li>Gemini 정책에 따라 고유 IP/실존인물은 inspired-by 형태로 완화될 수 있습니다.</li>
                    <li>업로드 이미지는 저작권/초상권을 확인해주세요.</li>
                    <li>영상은 PixVerse 기준으로 생성되며, 현재는 9:16 / 16:9 중심으로 최적화되어 있습니다.</li>
                  </ul>
                </div>
              </div>
            </div>
          }
        />
      }
      topRight={
        <div className="hidden items-center gap-2 text-xs text-white/50 sm:flex">
          <span className="rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/10">Date modified</span>
        </div>
      }
    >
      <div className="relative">
        {/* Gallery grid - Artlist-like */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GALLERY_TILES.map((t, idx) => (
            <div key={t.id} className={idx % 7 === 0 ? 'lg:row-span-2' : ''}>
              <Tile gradient={t.gradient} />
            </div>
          ))}
        </div>

        {/* Center empty-state overlay - LTX-like */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-[28px] bg-black/30 px-10 py-8 text-center ring-1 ring-white/10 backdrop-blur">
            <div className="mx-auto flex w-[240px] items-center justify-center">
              <div className="relative h-20 w-56">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute bottom-0 left-1/2 h-16 w-16 -translate-x-1/2 overflow-hidden rounded-2xl ring-1 ring-white/15"
                    style={{
                      transform: `translateX(${(i - 2) * 34}px) rotate(${(i - 2) * 8}deg)`,
                      backgroundImage: GALLERY_TILES[(i * 3) % GALLERY_TILES.length].gradient,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 text-sm font-semibold text-white/80">This space</div>
            <div className="text-sm text-white/60">is waiting for your</div>
            <div className="mt-2 text-sm font-semibold text-white/80">first commercial.</div>
            <div className="mt-4 text-xs text-white/45">아래 프롬프트에 아이디어를 입력하고 생성 버튼을 눌러 시작하세요.</div>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
