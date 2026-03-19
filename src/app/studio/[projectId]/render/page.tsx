'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { MotionType } from '@/types/fancut';
import type { PlatformConnectionStatus, SocialPlatform, UploadDraft, UploadResult } from '@/types/social';
import { useFanCutStudio } from '@/contexts/FanCutStudioContext';
import { WorkflowStepper } from '@/components/studio/WorkflowStepper';
import { buildUploadDraft } from '@/lib/social/metadata';

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = '요청에 실패했습니다.';
    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; message: string }
  | { phase: 'success'; result: UploadResult }
  | { phase: 'error'; message: string };

export default function RenderPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = params.projectId;
  const { getProject, getCuts, state, renderFinalVideo } = useFanCutStudio();

  const project = getProject(projectId);
  const cuts = useMemo(
    () => getCuts(projectId).slice().sort((a, b) => a.order - b.order),
    [getCuts, projectId]
  );
  const render = state.rendersByProject[projectId];

  const [isRendering, setIsRendering] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('youtube');
  const [draft, setDraft] = useState<UploadDraft | null>(null);
  const [youtubeStatus, setYoutubeStatus] = useState<PlatformConnectionStatus | null>(null);
  const [isCheckingYouTube, setIsCheckingYouTube] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({ phase: 'idle' });

  const allVideosPresent = useMemo(
    () => cuts.length > 0 && cuts.every((c) => Boolean(state.videosByCut[c.cutId]?.providerVideoId)),
    [cuts, state.videosByCut]
  );

  useEffect(() => {
    if (!project) return;
    setDraft(buildUploadDraft({ project, cuts, platform: selectedPlatform }));
  }, [project, cuts, selectedPlatform]);

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
    if (isUploadOpen && selectedPlatform === 'youtube') {
      void loadYouTubeStatus();
    }
  }, [isUploadOpen, selectedPlatform]);

  useEffect(() => {
    const uploadQuery = searchParams.get('upload');
    const socialError = searchParams.get('social_error');
    if (uploadQuery === 'youtube') {
      setSelectedPlatform('youtube');
      setIsUploadOpen(true);
      setUploadState({ phase: 'idle' });
      router.replace(pathname, { scroll: false });
      return;
    }
    if (socialError) {
      setSelectedPlatform('youtube');
      setIsUploadOpen(true);
      setUploadState({ phase: 'error', message: socialError });
      router.replace(pathname, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  if (!project) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">프로젝트를 찾을 수 없어요</h1>
          <Link href="/studio/new" className="mt-6 inline-flex rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white">
            프로젝트 시작하기
          </Link>
        </div>
      </div>
    );
  }

  const totalDurationSec = cuts.reduce((sum, cut) => sum + (cut.durationSec ?? 0), 0);
  const aspectRatioLabel = project.aspectRatio ?? '9:16';
  const resolutionLabel = project.resolution ?? '1080p';
  const motionTypeDefault: MotionType = 'zoom_in';
  const bgmOn = false;
  const subtitleTemplate: 'none' | 'basic' = 'none';

  const handleRender = async () => {
    setIsRendering(true);
    try {
      await renderFinalVideo({ projectId, motionTypeDefault, bgmOn, subtitleTemplate });
    } finally {
      setIsRendering(false);
    }
  };

  const handleOpenUpload = (platform: SocialPlatform = 'youtube') => {
    setSelectedPlatform(platform);
    setDraft(buildUploadDraft({ project, cuts, platform }));
    setUploadState({ phase: 'idle' });
    setIsUploadOpen(true);
  };

  const handleConnectYouTube = () => {
    window.location.href = `/api/social/youtube/auth?returnTo=${encodeURIComponent(`${pathname}?upload=youtube`)}`;
  };

  const handleDisconnectYouTube = async () => {
    await fetch('/api/social/youtube/disconnect', { method: 'POST' });
    setYoutubeStatus({
      platform: 'youtube',
      configured: true,
      connected: false,
      message: '연결된 YouTube 채널이 없습니다.',
    });
  };

  const handleUpload = async () => {
    if (!render?.outputObjectUrl || !draft) {
      setUploadState({ phase: 'error', message: '먼저 최종 렌더를 생성해 주세요.' });
      return;
    }

    try {
      const renderBlob = await fetch(render.outputObjectUrl, { cache: 'no-store' }).then(async (response) => {
        if (!response.ok) {
          throw new Error('최종 렌더 파일을 불러오지 못했습니다.');
        }
        return await response.blob();
      });

      if (selectedPlatform === 'youtube') {
        if (!youtubeStatus?.connected) {
          throw new Error('먼저 YouTube 채널을 연결해 주세요.');
        }

        setUploadState({ phase: 'uploading', message: 'YouTube Shorts로 업로드 중입니다…' });

        const formData = new FormData();
        formData.append(
          'video',
          new File([renderBlob], `${project.title.replace(/\s+/g, '-').toLowerCase() || 'fancut'}.mp4`, {
            type: renderBlob.type || 'video/mp4',
          })
        );
        formData.append('title', draft.title);
        formData.append('description', draft.description);
        formData.append('hashtags', draft.hashtags);
        formData.append('privacyStatus', draft.privacyStatus);

        const result = await readJsonOrThrow<UploadResult>(
          await fetch('/api/social/youtube/upload', {
            method: 'POST',
            body: formData,
          })
        );
        setUploadState({ phase: 'success', result });
        await loadYouTubeStatus();
        return;
      }

      setUploadState({ phase: 'uploading', message: 'TikTok mock 업로드를 실행 중입니다…' });
      const result = await readJsonOrThrow<UploadResult>(
        await fetch('/api/social/tiktok/mock-upload', {
          method: 'POST',
        })
      );
      setUploadState({ phase: 'success', result });
    } catch (error) {
      setUploadState({
        phase: 'error',
        message: error instanceof Error ? error.message : '업로드에 실패했습니다.',
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 transition-theme dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="mb-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                <span aria-hidden="true">✨</span> 최종 결과
              </div>
              <h1 className="mt-2 truncate text-xl font-bold text-slate-900 dark:text-white">{project.title}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                선택한 컷 영상을 병합해 최종 MP4를 생성하고, 바로 Shorts 플랫폼에 업로드할 수 있습니다.
              </p>
              <div className="mt-3">
                <WorkflowStepper projectId={projectId} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/studio/${projectId}/videos`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                ← 영상으로
              </Link>
              <button
                type="button"
                disabled={!render?.outputObjectUrl}
                onClick={() => handleOpenUpload('youtube')}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-300"
              >
                원클릭 업로드
              </button>
              <button
                type="button"
                disabled={!allVideosPresent || isRendering}
                onClick={() => void handleRender()}
                className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
              >
                {isRendering ? '렌더 중…' : render?.outputObjectUrl ? '다시 렌더' : '렌더 생성'}
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-12">
          <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50 lg:col-span-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">출력 정보</h2>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-400">컷 수</span>
                <span className="font-semibold text-slate-900 dark:text-white">{cuts.length}개</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-400">예상 길이</span>
                <span className="font-semibold text-slate-900 dark:text-white">{totalDurationSec}초</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-400">비율</span>
                <span className="font-semibold text-slate-900 dark:text-white">{aspectRatioLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-400">해상도</span>
                <span className="font-semibold text-slate-900 dark:text-white">{resolutionLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-400">포맷</span>
                <span className="font-semibold text-slate-900 dark:text-white">MP4</span>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">배포 상태</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    YouTube Shorts는 실제 업로드, TikTok은 mock 업로드로 연결됩니다.
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  MVP
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenUpload('youtube')}
                  disabled={!render?.outputObjectUrl}
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  YouTube Shorts 업로드
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenUpload('tiktok')}
                  disabled={!render?.outputObjectUrl}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  TikTok mock 테스트
                </button>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">추가 편집(준비 중)</h3>
              <div className="mt-3 grid gap-2">
                {[
                  {
                    title: '배경음악(BGM)',
                    desc: '현재 MVP에서는 오디오 합성을 지원하지 않습니다.',
                  },
                  {
                    title: '자막/캡션',
                    desc: '현재 MVP에서는 자막 템플릿을 지원하지 않습니다.',
                  },
                  {
                    title: '트랜지션/템포',
                    desc: '현재 MVP에서는 컷 병합 중심으로 렌더합니다.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-3 opacity-80 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{item.desc}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        준비 중
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/studio/new"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                새 프로젝트
              </Link>
            </div>
          </section>

          <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/50 lg:col-span-8">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">최종 결과</h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">렌더가 완료되면 바로 재생/다운로드/업로드할 수 있어요.</p>
              </div>
              {render?.createdAt && (
                <div className="text-xs text-slate-500 dark:text-slate-400">생성: {new Date(render.createdAt).toLocaleString()}</div>
              )}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-9">
                <div className="overflow-hidden rounded-lg ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                  <div className="relative bg-[radial-gradient(1200px_circle_at_30%_0%,rgba(14,165,233,0.18),transparent_45%),radial-gradient(900px_circle_at_70%_10%,rgba(16,185,129,0.16),transparent_45%),linear-gradient(180deg,rgba(2,6,23,0.78),rgba(2,6,23,0.92))] p-4">
                    <div className="mx-auto w-full max-w-[420px]">
                      <div className="overflow-hidden rounded-lg bg-black ring-1 ring-white/10">
                        {render?.outputObjectUrl ? (
                          <video
                            src={render.outputObjectUrl}
                            controls
                            className="aspect-[9/16] w-full bg-black object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[9/16] items-center justify-center bg-black/60 px-6 text-center text-sm text-slate-200">
                            {allVideosPresent ? (
                              <div>
                                <div className="font-semibold">렌더 준비 완료</div>
                                <div className="mt-1 text-xs text-slate-300">오른쪽 상단의 “렌더 생성”을 눌러 최종 결과를 만들어요.</div>
                              </div>
                            ) : (
                              <div>
                                <div className="font-semibold">아직 컷 영상이 부족해요</div>
                                <div className="mt-1 text-xs text-slate-300">이전 단계에서 모든 컷 영상을 생성해 주세요.</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {render?.outputObjectUrl && (
                    <a
                      href={render.outputObjectUrl}
                      download={`${project.title.replaceAll(' ', '-')}.mp4`}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      MP4 다운로드
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={!render?.outputObjectUrl}
                    onClick={() => handleOpenUpload('youtube')}
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300"
                  >
                    YouTube Shorts 업로드
                  </button>
                  <button
                    type="button"
                    disabled={!allVideosPresent || isRendering}
                    onClick={() => void handleRender()}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {isRendering ? '렌더 중…' : '다시 렌더'}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">썸네일</div>
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      보조 정보
                    </span>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={render?.thumbnailDataUrl ?? state.imagesByCut[cuts[0]?.cutId ?? '']?.candidates?.[0]?.imageDataUrl ?? ''}
                      alt=""
                      className="aspect-video w-full bg-slate-200 object-cover dark:bg-slate-700"
                    />
                  </div>
                  <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                    첫 컷 이미지를 기반으로 생성됩니다.
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">업로드 상태</div>
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-xs dark:bg-slate-800">
                    {uploadState.phase === 'success' ? (
                      <div className="space-y-2">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-300">{uploadState.result.message}</div>
                        {uploadState.result.videoUrl && (
                          <a
                            href={uploadState.result.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-sky-600 hover:underline dark:text-sky-400"
                          >
                            업로드 결과 열기
                          </a>
                        )}
                      </div>
                    ) : uploadState.phase === 'error' ? (
                      <div className="font-medium text-red-600 dark:text-red-300">{uploadState.message}</div>
                    ) : uploadState.phase === 'uploading' ? (
                      <div className="font-medium text-slate-700 dark:text-slate-200">{uploadState.message}</div>
                    ) : (
                      <div className="text-slate-500 dark:text-slate-400">아직 업로드를 시작하지 않았습니다.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {isUploadOpen && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">One-click upload</div>
                <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">숏폼 업로드</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  플랫폼을 고르고 제목, 설명, 해시태그를 확인한 뒤 바로 업로드할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                닫기
              </button>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.3fr_0.9fr]">
              <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700 lg:border-b-0 lg:border-r">
                <div className="flex flex-wrap gap-2">
                  {(['youtube', 'tiktok'] as SocialPlatform[]).map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => {
                        setSelectedPlatform(platform);
                        setUploadState({ phase: 'idle' });
                      }}
                      className={classNames(
                        'rounded-full px-4 py-2 text-sm font-semibold ring-1 transition',
                        selectedPlatform === platform
                          ? platform === 'youtube'
                            ? 'bg-red-600 text-white ring-red-600'
                            : 'bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white'
                          : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800'
                      )}
                    >
                      {platform === 'youtube' ? 'YouTube Shorts' : 'TikTok mock'}
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                  {selectedPlatform === 'youtube' ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">OAuth 연결 상태</div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            YouTube Data API `videos.insert` 업로드에 필요한 채널 연결입니다.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void loadYouTubeStatus()}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          새로고침
                        </button>
                      </div>

                      <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                        {youtubeStatus?.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={youtubeStatus.avatarUrl}
                            alt=""
                            className="h-11 w-11 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                            YT
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {isCheckingYouTube
                              ? '연결 상태 확인 중…'
                              : youtubeStatus?.connected
                                ? youtubeStatus.displayName || '연결된 채널'
                                : '연결된 채널 없음'}
                          </div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {youtubeStatus?.message ||
                              (youtubeStatus?.connected
                                ? `채널 ID: ${youtubeStatus.channelId ?? '확인됨'}`
                                : 'Google OAuth로 채널을 연결하면 바로 업로드할 수 있습니다.')}
                          </div>
                        </div>

                        {youtubeStatus?.connected ? (
                          <button
                            type="button"
                            onClick={() => void handleDisconnectYouTube()}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            연결 해제
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleConnectYouTube}
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            YouTube 연결
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">TikTok mock 업로드</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        TikTok은 아직 실제 OAuth와 게시 API를 연결하지 않았고, 업로드 결과만 mock으로 확인합니다.
                      </div>
                      <div className="inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
                        mock only
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 grid gap-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-900 dark:text-white">제목</label>
                      <button
                        type="button"
                        onClick={() => setDraft(buildUploadDraft({ project, cuts, platform: selectedPlatform }))}
                        className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
                      >
                        자동 생성 다시 채우기
                      </button>
                    </div>
                    <input
                      value={draft.title}
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500"
                      placeholder="업로드 제목"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">설명</label>
                    <textarea
                      value={draft.description}
                      onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                      rows={6}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500"
                      placeholder="영상 설명"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-slate-900 dark:text-white">해시태그</label>
                      <input
                        value={draft.hashtags}
                        onChange={(event) => setDraft({ ...draft, hashtags: event.target.value })}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500"
                        placeholder="#Shorts #애니숏폼"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-900 dark:text-white">공개 범위</label>
                      <select
                        value={draft.privacyStatus}
                        onChange={(event) => setDraft({ ...draft, privacyStatus: event.target.value as UploadDraft['privacyStatus'] })}
                        disabled={selectedPlatform !== 'youtube'}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500"
                      >
                        <option value="private">비공개</option>
                        <option value="unlisted">일부 공개</option>
                        <option value="public">공개</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">업로드 가이드</div>
                  <ul className="mt-2 space-y-1">
                    <li>YouTube Shorts는 일반 영상 업로드와 같은 `videos.insert` 엔드포인트를 사용합니다.</li>
                    <li>세로형 60초 이하 영상과 `#Shorts` 해시태그를 유지하는 편이 유리합니다.</li>
                    <li>검증되지 않은 Google 앱은 업로드 후 비공개 상태로 제한될 수 있습니다.</li>
                  </ul>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">업로드 미리보기</div>
                  <div className="mt-3 overflow-hidden rounded-2xl bg-black ring-1 ring-slate-200 dark:ring-slate-700">
                    {render?.outputObjectUrl ? (
                      <video src={render.outputObjectUrl} controls className="aspect-[9/16] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[9/16] items-center justify-center px-6 text-center text-sm text-slate-300">
                        업로드 전에 먼저 최종 렌더를 만들어 주세요.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                      <span>플랫폼</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedPlatform === 'youtube' ? 'YouTube Shorts' : 'TikTok mock'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                      <span>예상 길이</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{totalDurationSec}초</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                      <span>비율</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{aspectRatioLabel}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                      <span>해상도</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{resolutionLabel}</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    {uploadState.phase === 'success' ? (
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{uploadState.result.message}</div>
                        {uploadState.result.videoUrl && (
                          <a
                            href={uploadState.result.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            업로드 결과 열기
                          </a>
                        )}
                      </div>
                    ) : uploadState.phase === 'error' ? (
                      <div className="text-sm font-medium text-red-600 dark:text-red-300">{uploadState.message}</div>
                    ) : uploadState.phase === 'uploading' ? (
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{uploadState.message}</div>
                    ) : (
                      <div className="text-sm text-slate-500 dark:text-slate-400">메타데이터를 확인하고 업로드 버튼을 누르세요.</div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleUpload()}
                      disabled={
                        !render?.outputObjectUrl ||
                        uploadState.phase === 'uploading' ||
                        (selectedPlatform === 'youtube' && !youtubeStatus?.connected)
                      }
                      className={classNames(
                        'inline-flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50',
                        selectedPlatform === 'youtube' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-700 dark:bg-white dark:text-slate-900'
                      )}
                    >
                      {uploadState.phase === 'uploading'
                        ? '업로드 중…'
                        : selectedPlatform === 'youtube'
                          ? 'YouTube Shorts 업로드'
                          : 'TikTok mock 업로드'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUploadOpen(false)}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
