'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import type { CharacterConsistency, StylePreset, TargetDuration } from '@/types/fancut';
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

type CharacterPhoto = {
  id: string;
  name: string;
  imageUrl: string;
};

type JikanCharacter = {
  mal_id: number;
  name: string;
  images?: {
    jpg?: { image_url?: string };
    webp?: { image_url?: string };
  };
};

type IpResearchPreview = {
  note: string | null;
  workTitle: string | null;
  originalTitle: string | null;
  media: string | null;
  characterNames: string[];
  characters: CharacterConsistency[];
};

const CHARACTER_FEED_URLS = [
  'https://api.jikan.moe/v4/top/characters?limit=25&page=1',
  'https://api.jikan.moe/v4/top/characters?limit=25&page=2',
  'https://api.jikan.moe/v4/top/characters?limit=25&page=3',
  'https://api.jikan.moe/v4/top/characters?limit=25&page=4',
] as const;
const BACKDROP_TILE_COUNT = 120;
const BACKDROP_LAYOUT_CLASSES = [
  'row-span-2',
  '',
  '',
  'row-span-2',
  '',
  'col-span-2 row-span-2',
  '',
  '',
  'row-span-2',
  '',
  '',
  'col-span-2',
  'row-span-2',
  '',
  '',
  'row-span-2',
  '',
  'col-span-2 row-span-2',
  '',
  'row-span-2',
  '',
  '',
  'row-span-2',
  'col-span-2',
  '',
  'row-span-2',
  '',
  '',
  'col-span-2 row-span-2',
  '',
  'row-span-2',
  '',
  '',
  'row-span-2',
  '',
  'col-span-2',
  'row-span-2',
  '',
  '',
  'row-span-2',
  '',
  'col-span-2 row-span-2',
  '',
  'row-span-2',
  '',
  '',
] as const;

function CharacterBackdropTile({
  character,
}: {
  character?: CharacterPhoto;
}) {
  return (
    <div className="relative h-full min-h-[88px] overflow-hidden rounded-[22px] ring-1 ring-black/5 dark:ring-white/10">
      <div className="absolute inset-0">
        {character ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.imageUrl}
            alt={character.name}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-gradient-to-br from-slate-300 via-slate-200 to-slate-100 dark:from-white/15 dark:via-white/8 dark:to-white/5" />
        )}
      </div>
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
          aria-label={submitting ? '생성 중' : '생성'}
          aria-busy={submitting}
          title={submitting ? '생성 중' : '생성'}
        >
          {submitting ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h12" strokeLinecap="round" />
              <path d="M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {submitting && (
        <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500 dark:bg-sky-300" />
            <span>플롯을 생성하는 중입니다. 잠시만 기다려 주세요.</span>
          </div>
        </div>
      )}

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
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [characterPhotos, setCharacterPhotos] = useState<CharacterPhoto[]>([]);
  const [ipResearch, setIpResearch] = useState<IpResearchPreview | null>(null);
  const [isResearchingIp, setIsResearchingIp] = useState(false);
  const [ipResearchError, setIpResearchError] = useState<string | null>(null);
  const [lastIpResearchSignature, setLastIpResearchSignature] = useState('');
  const errorMeta = useMemo(() => getSubmitErrorMeta(submitError), [submitError]);
  const trimmedTitle = title.trim();
  const trimmedIdeaText = ideaText.trim();
  const trimmedGenre = genre.trim();
  const trimmedTone = tone.trim();
  const trimmedIpTag = ipTag.trim();
  const canResearchIp = Boolean(trimmedIpTag) || trimmedIdeaText.length >= 4;
  const ipResearchPayload = useMemo(
    () => ({
      title: trimmedTitle || 'untitled project',
      ideaText: trimmedIdeaText,
      genre: trimmedGenre || undefined,
      tone: trimmedTone || undefined,
      ipTag: trimmedIpTag || undefined,
    }),
    [trimmedGenre, trimmedIdeaText, trimmedIpTag, trimmedTitle, trimmedTone]
  );
  const ipResearchSignature = useMemo(() => JSON.stringify(ipResearchPayload), [ipResearchPayload]);
  const isIpResearchStale = Boolean(ipResearch) && lastIpResearchSignature !== ipResearchSignature;

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

  useEffect(() => {
    const controller = new AbortController();

    const loadPopularCharacterPhotos = async () => {
      try {
        const responses = await Promise.allSettled(
          CHARACTER_FEED_URLS.map(async (url) => {
            const response = await fetch(url, {
              signal: controller.signal,
            });
            if (!response.ok) {
              throw new Error(`character feed request failed: ${response.status}`);
            }
            return (await response.json()) as { data?: JikanCharacter[] };
          }),
        );

        const nextCharacters = responses
          .filter((result): result is PromiseFulfilledResult<{ data?: JikanCharacter[] }> => result.status === 'fulfilled')
          .flatMap((result) => result.value.data ?? [])
          .map((item) => ({
            id: String(item.mal_id),
            name: item.name,
            imageUrl: item.images?.webp?.image_url ?? item.images?.jpg?.image_url ?? '',
          }))
          .filter((item) => item.imageUrl)
          .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index)
          .slice(0, 100);

        if (nextCharacters.length === 0) {
          throw new Error('character feed request returned no images');
        }

        setCharacterPhotos(nextCharacters);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load character feed', error);
          setCharacterPhotos([]);
        }
      }
    };

    void loadPopularCharacterPhotos();

    return () => controller.abort();
  }, []);

  const backdropCharacters = useMemo(() => {
    if (characterPhotos.length === 0) {
      return Array.from({ length: BACKDROP_TILE_COUNT }, () => undefined);
    }

    return Array.from({ length: BACKDROP_TILE_COUNT }, (_, index) => {
      return characterPhotos[index % characterPhotos.length];
    });
  }, [characterPhotos]);

  const handleResearchIp = async () => {
    if (!canResearchIp || isResearchingIp) return;

    setIsResearchingIp(true);
    setIpResearchError(null);

    try {
      const response = await fetch('/api/fancut/ip-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ipResearchPayload),
      });

      const data = (await response.json()) as IpResearchPreview & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'IP 캐릭터 검색에 실패했습니다.');
      }

      setIpResearch({
        note: data.note,
        workTitle: data.workTitle,
        originalTitle: data.originalTitle,
        media: data.media,
        characterNames: data.characterNames ?? [],
        characters: data.characters ?? [],
      });
      setLastIpResearchSignature(ipResearchSignature);
    } catch (error) {
      setIpResearchError(error instanceof Error ? error.message : 'IP 캐릭터 검색에 실패했습니다.');
    } finally {
      setIsResearchingIp(false);
    }
  };

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
      contentClassName="w-full px-0 py-0"
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
          basicSettings={
            <div className="rounded-2xl bg-slate-50/90 p-3 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 sm:w-28">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-white/70">IP 태그</label>
                </div>
                <input
                  value={ipTag}
                  onChange={(e) => setIpTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleResearchIp();
                    }
                  }}
                  className="min-w-0 flex-1 rounded-xl bg-white px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none placeholder:text-slate-400 focus:ring-slate-300 dark:bg-[#101015] dark:text-white/90 dark:ring-white/10 dark:placeholder:text-white/35 dark:focus:ring-white/20"
                  placeholder="예: 슬램덩크, 하이큐, 원피스"
                />
                <button
                  type="button"
                  onClick={() => void handleResearchIp()}
                  disabled={!canResearchIp || isResearchingIp}
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-[#0b0b0d]"
                >
                  {isResearchingIp ? '검색 중...' : '검색'}
                </button>
              </div>

              <div className="mt-2 text-[11px] text-slate-500 dark:text-white/45">
                {trimmedIpTag
                  ? `현재 "${trimmedIpTag}" 기준으로 작품과 캐릭터를 찾습니다.`
                  : '비워두면 메인 프롬프트 문장으로만 작품을 추론합니다.'}
              </div>

              {ipResearchError && (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-100/90">
                  {ipResearchError}
                </div>
              )}

              {ipResearch && (
                <div className="mt-3 rounded-xl bg-white/85 px-3 py-3 ring-1 ring-slate-200 dark:bg-[#0f1014]/85 dark:ring-white/10">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-white/90">
                        {ipResearch.workTitle ?? ipResearch.originalTitle ?? '감지된 작품 정보'}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-white/45">
                        {[
                          ipResearch.media,
                          ipResearch.characterNames.length > 0 ? `${ipResearch.characterNames.length}명 감지` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '캐릭터 정보만 추론됨'}
                      </div>
                    </div>

                    {isIpResearchStale && (
                      <div className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-400/20">
                        입력 변경됨
                      </div>
                    )}
                  </div>

                  {ipResearch.characters.length > 0 ? (
                    <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1 text-xs text-slate-700 dark:text-white/72">
                      {ipResearch.characters.slice(0, 4).map((character) => (
                        <div
                          key={`${character.name}-${character.role}`}
                          className="rounded-lg bg-slate-50 px-3 py-2 leading-5 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10"
                        >
                          <span className="font-semibold text-slate-900 dark:text-white/88">{character.name}</span>
                          {`: ${character.appearance}`}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-600 dark:text-white/58">
                      고정된 원작 캐릭터를 찾지 못했습니다.
                    </div>
                  )}
                </div>
              )}
            </div>
          }
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
                <label className="text-[11px] font-semibold text-slate-600 dark:text-white/70">첫 컷 레퍼런스 이미지(선택)</label>
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
                    <li>실존 인물은 안전상 완화될 수 있지만, fictional IP는 캐릭터 검색과 플롯 리서치를 통해 외형 시그니처를 최대한 보존합니다.</li>
                    <li>업로드한 레퍼런스 이미지는 현재 첫 컷 기준으로 우선 활용되고, 이후 컷은 character/style bible과 인접 컷 문맥으로 일관성을 관리합니다.</li>
                    <li>업로드 이미지는 저작권/초상권을 확인해주세요.</li>
                    <li>영상은 deAPI의 LTX-Video 13B 기준으로 생성되며, 현재는 9:16 / 16:9 중심으로 최적화되어 있습니다.</li>
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
      <div className="relative px-2 pb-36 pt-2 sm:px-3 sm:pb-40 sm:pt-3">
        <div className="grid grid-flow-dense auto-rows-[82px] grid-cols-3 gap-2 sm:auto-rows-[96px] sm:grid-cols-4 sm:gap-3 lg:auto-rows-[104px] lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
          {backdropCharacters.map((character, idx) => {
            const layoutClass = BACKDROP_LAYOUT_CLASSES[idx % BACKDROP_LAYOUT_CLASSES.length];

            return (
              <div
                key={`${character?.id ?? 'placeholder'}-${idx}`}
                className={layoutClass}
              >
                <CharacterBackdropTile character={character} />
              </div>
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-[18%] flex justify-center px-4">
          <div className="w-full max-w-3xl rounded-[30px] bg-black/46 px-6 py-7 text-center ring-1 ring-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-[22px] sm:px-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65 ring-1 ring-white/10">
              Gen Space
            </div>
            <div className="mt-4 text-2xl font-semibold tracking-tight text-white/92 sm:text-3xl">
              캐릭터 무드 보드로 바로 시작
            </div>
            <div className="mt-2 text-sm text-white/58">
              무드 보드로 톤과 에너지를 빠르게 잡고, 필요하면 첫 컷 레퍼런스를 더해 바로 숏폼 플롯으로 연결하세요.
            </div>

            <div className="mt-6 text-xs text-white/42">
              아래 프롬프트에 아이디어를 입력하면 바로 플롯 생성으로 이어집니다.
            </div>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
