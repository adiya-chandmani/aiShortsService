'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type {
  AspectRatio,
  CutImageState,
  FanCutCut,
  FanCutProject,
  FinalRender,
  ImageCandidate,
  MotionType,
  ResolutionPreset,
  StylePreset,
  TargetDuration,
  VideoAsset,
} from '@/types/fancut';
import { createId } from '@/lib/fancut/id';
import { createThumbnailDataUrl, optimizeVideoReferenceDataUrl } from '@/lib/fancut/video';
import { normalizeAspectRatio, normalizeResolutionPreset, videoSizeForProject } from '@/lib/fancut/prompts';

type State = {
  projects: Record<string, FanCutProject>;
  cutsByProject: Record<string, FanCutCut[]>;
  imagesByCut: Record<string, CutImageState>;
  imageJobsByCut: Record<string, { status: 'generating' }>;
  videosByCut: Record<string, VideoAsset>;
  rendersByProject: Record<string, FinalRender>;
};

type Action =
  | { type: 'LOAD'; payload: State }
  | { type: 'UPSERT_PROJECT'; project: FanCutProject }
  | { type: 'DELETE_PROJECT'; projectId: string }
  | { type: 'CLEAR_PROJECT_MEDIA'; projectId: string }
  | { type: 'SET_CUTS'; projectId: string; cuts: FanCutCut[] }
  | { type: 'UPDATE_CUT'; cutId: string; patch: Partial<FanCutCut> }
  | { type: 'REORDER_CUTS'; projectId: string; cutId: string; direction: 'up' | 'down' }
  | { type: 'SET_CUTS_ORDER'; projectId: string; cuts: FanCutCut[] }
  | { type: 'SET_IMAGE_CANDIDATES'; cutId: string; candidates: ImageCandidate[] }
  | { type: 'START_IMAGE_JOB'; cutId: string }
  | { type: 'STOP_IMAGE_JOB'; cutId: string }
  | { type: 'SELECT_IMAGE'; cutId: string; imageId: string }
  | { type: 'SET_VIDEO'; cutId: string; video: VideoAsset }
  | { type: 'SET_RENDER'; projectId: string; render: FinalRender };

const STORAGE_KEY = 'fancut_studio_v2';

const initialState: State = {
  projects: {},
  cutsByProject: {},
  imagesByCut: {},
  imageJobsByCut: {},
  videosByCut: {},
  rendersByProject: {},
};

function deleteProjectState(state: State, projectId: string): State {
  const cutIds = new Set((state.cutsByProject[projectId] ?? []).map((cut) => cut.cutId));
  const projects = { ...state.projects };
  const cutsByProject = { ...state.cutsByProject };
  const imagesByCut = { ...state.imagesByCut };
  const imageJobsByCut = { ...state.imageJobsByCut };
  const videosByCut = { ...state.videosByCut };
  const rendersByProject = { ...state.rendersByProject };

  delete projects[projectId];
  delete cutsByProject[projectId];
  delete rendersByProject[projectId];

  for (const cutId of cutIds) {
    delete imagesByCut[cutId];
    delete imageJobsByCut[cutId];
    delete videosByCut[cutId];
  }

  return {
    ...state,
    projects,
    cutsByProject,
    imagesByCut,
    imageJobsByCut,
    videosByCut,
    rendersByProject,
  };
}

function clearProjectMediaState(state: State, projectId: string): State {
  const cutIds = new Set((state.cutsByProject[projectId] ?? []).map((cut) => cut.cutId));
  const imagesByCut = { ...state.imagesByCut };
  const imageJobsByCut = { ...state.imageJobsByCut };
  const videosByCut = { ...state.videosByCut };
  const rendersByProject = { ...state.rendersByProject };

  delete rendersByProject[projectId];

  for (const cutId of cutIds) {
    delete imagesByCut[cutId];
    delete imageJobsByCut[cutId];
    delete videosByCut[cutId];
  }

  return {
    ...state,
    imagesByCut,
    imageJobsByCut,
    videosByCut,
    rendersByProject,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return action.payload;
    case 'UPSERT_PROJECT':
      return {
        ...state,
        projects: { ...state.projects, [action.project.projectId]: action.project },
      };
    case 'DELETE_PROJECT':
      return deleteProjectState(state, action.projectId);
    case 'CLEAR_PROJECT_MEDIA':
      return clearProjectMediaState(state, action.projectId);
    case 'SET_CUTS':
      return {
        ...state,
        cutsByProject: { ...state.cutsByProject, [action.projectId]: action.cuts },
      };
    case 'UPDATE_CUT': {
      let projectId: string | undefined;
      for (const [pid, cuts] of Object.entries(state.cutsByProject)) {
        if (cuts.some((cut) => cut.cutId === action.cutId)) {
          projectId = pid;
          break;
        }
      }
      if (!projectId) return state;
      const nextCuts = (state.cutsByProject[projectId] ?? []).map((cut) =>
        cut.cutId === action.cutId ? { ...cut, ...action.patch } : cut
      );
      return {
        ...state,
        cutsByProject: {
          ...state.cutsByProject,
          [projectId]: nextCuts,
        },
      };
    }
    case 'REORDER_CUTS': {
      const cuts = [...(state.cutsByProject[action.projectId] ?? [])];
      const index = cuts.findIndex((cut) => cut.cutId === action.cutId);
      if (index < 0) return state;
      const swapWith = action.direction === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= cuts.length) return state;
      const temp = cuts[index];
      cuts[index] = cuts[swapWith];
      cuts[swapWith] = temp;
      const normalized = cuts.map((cut, idx) => ({ ...cut, order: idx + 1 }));
      return {
        ...state,
        cutsByProject: {
          ...state.cutsByProject,
          [action.projectId]: normalized,
        },
      };
    }
    case 'SET_CUTS_ORDER': {
      const normalized = action.cuts.map((cut, index) => ({ ...cut, order: index + 1 }));
      return {
        ...state,
        cutsByProject: {
          ...state.cutsByProject,
          [action.projectId]: normalized,
        },
      };
    }
    case 'SET_IMAGE_CANDIDATES': {
      const previous = state.imagesByCut[action.cutId];
      return {
        ...state,
        imagesByCut: {
          ...state.imagesByCut,
          [action.cutId]: {
            cutId: action.cutId,
            candidates: action.candidates,
            selectedImageId:
              previous?.selectedImageId && action.candidates.some((candidate) => candidate.imageId === previous.selectedImageId)
                ? previous.selectedImageId
                : action.candidates[0]?.imageId,
          },
        },
      };
    }
    case 'START_IMAGE_JOB':
      return {
        ...state,
        imageJobsByCut: {
          ...state.imageJobsByCut,
          [action.cutId]: { status: 'generating' },
        },
      };
    case 'STOP_IMAGE_JOB': {
      const imageJobsByCut = { ...state.imageJobsByCut };
      delete imageJobsByCut[action.cutId];
      return {
        ...state,
        imageJobsByCut,
      };
    }
    case 'SELECT_IMAGE':
      return {
        ...state,
        imagesByCut: {
          ...state.imagesByCut,
          [action.cutId]: {
            cutId: action.cutId,
            candidates: state.imagesByCut[action.cutId]?.candidates ?? [],
            selectedImageId: action.imageId,
          },
        },
      };
    case 'SET_VIDEO':
      return {
        ...state,
        videosByCut: {
          ...state.videosByCut,
          [action.cutId]: action.video,
        },
      };
    case 'SET_RENDER':
      return {
        ...state,
        rendersByProject: {
          ...state.rendersByProject,
          [action.projectId]: action.render,
        },
      };
    default:
      return state;
  }
}

function normalizeProject(project: FanCutProject): FanCutProject {
  return {
    ...project,
    aspectRatio: project.aspectRatio ?? '9:16',
    resolution: project.resolution ?? '1080p',
  };
}

function safeParseState(raw: string | null): State | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as State;
    if (!parsed || typeof parsed !== 'object') return null;

    const projects = Object.fromEntries(
      Object.entries(parsed.projects ?? {}).map(([projectId, project]) => [projectId, normalizeProject(project)])
    );

    const imagesByCut = Object.fromEntries(
      Object.entries(parsed.imagesByCut ?? {}).map(([cutId, imageState]) => [
            cutId,
            {
              ...imageState,
              candidates: (imageState.candidates ?? []).map((candidate) => ({
                ...candidate,
                source: candidate.source ?? 'together',
              })),
            },
      ])
    );

    return {
      ...initialState,
      ...parsed,
      projects,
      imagesByCut,
      imageJobsByCut: {},
    };
  } catch {
    return null;
  }
}

function persistableState(state: State): State {
  const projects = Object.fromEntries(
    Object.entries(state.projects).map(([projectId, project]) => [
      projectId,
      {
        ...project,
        referenceImageDataUrl: undefined,
      },
    ])
  );

  const imagesByCut: Record<string, CutImageState> = {};
  const videosByCut: Record<string, VideoAsset> = {};
  for (const [cutId, video] of Object.entries(state.videosByCut)) {
    videosByCut[cutId] = { ...video, videoObjectUrl: '' };
  }

  const rendersByProject: Record<string, FinalRender> = {};
  for (const [projectId, render] of Object.entries(state.rendersByProject)) {
    rendersByProject[projectId] = { ...render, outputObjectUrl: '', thumbnailDataUrl: '' };
  }

  return {
    ...state,
    projects,
    imagesByCut,
    imageJobsByCut: {},
    videosByCut,
    rendersByProject,
  };
}

function fallbackPersistableState(state: State): State {
  const projects = Object.fromEntries(
    Object.entries(state.projects).map(([projectId, project]) => [
      projectId,
      {
        ...project,
        referenceImageDataUrl: undefined,
      },
    ])
  );

  const videosByCut: Record<string, VideoAsset> = {};
  for (const [cutId, video] of Object.entries(state.videosByCut)) {
    videosByCut[cutId] = {
      ...video,
      videoObjectUrl: '',
    };
  }

  return {
    ...initialState,
    projects,
    cutsByProject: state.cutsByProject,
    imageJobsByCut: {},
    videosByCut,
    rendersByProject: {},
  };
}

function isQuotaExceededError(error: unknown) {
  if (!(error instanceof DOMException)) return false;
  return error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014;
}

function persistState(state: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState(state)));
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      throw error;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackPersistableState(state)));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

function cleanLoadedState(state: State): State {
  const projects = Object.fromEntries(
    Object.entries(state.projects).map(([projectId, project]) => [
      projectId,
      {
        ...project,
        referenceImageDataUrl: undefined,
      },
    ])
  );

  const imagesByCut: Record<string, CutImageState> = {};
  const videosByCut: Record<string, VideoAsset> = {};
  for (const [cutId, video] of Object.entries(state.videosByCut)) {
    videosByCut[cutId] = {
      ...video,
      videoObjectUrl: '',
    };
  }

  const rendersByProject: Record<string, FinalRender> = {};
  for (const [projectId, render] of Object.entries(state.rendersByProject)) {
    rendersByProject[projectId] = {
      ...render,
      outputObjectUrl: '',
      thumbnailDataUrl: '',
    };
  }

  return {
    ...state,
    projects,
    imagesByCut,
    videosByCut,
    rendersByProject,
  };
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = '요청에 실패했습니다.';
    try {
      const data = (await response.json()) as { error?: string };
      message = data.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

async function parseBlobOrThrow(response: Response) {
  if (!response.ok) {
    let message = '파일 요청에 실패했습니다.';
    try {
      const data = (await response.json()) as { error?: string };
      message = data.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return await response.blob();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestPayloadBytes(payload: unknown) {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function selectedImageForCut(state: State, cutId: string) {
  const imageState = state.imagesByCut[cutId];
  return imageState?.candidates.find((candidate) => candidate.imageId === imageState.selectedImageId);
}

type CreateProjectInput = {
  title: string;
  ideaText: string;
  genre?: string;
  tone?: string;
  ipTag?: string;
  stylePreset: StylePreset;
  targetDuration: TargetDuration;
  aspectRatio: AspectRatio | '1:1';
  resolution: ResolutionPreset;
  referenceImageDataUrl?: string;
};

type Ctx = {
  state: State;
  createProjectAndPlot: (input: CreateProjectInput) => Promise<{ projectId: string }>;
  regenerateProjectPlot: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => void;
  cancelImageGeneration: (cutId: string) => void;
  getProject: (projectId: string) => FanCutProject | undefined;
  getCuts: (projectId: string) => FanCutCut[];
  updateCut: (cutId: string, patch: Partial<FanCutCut>) => void;
  reorderCut: (projectId: string, cutId: string, direction: 'up' | 'down') => void;
  setCutsOrder: (projectId: string, cuts: FanCutCut[]) => void;
  ensureImagesForProject: (projectId: string) => Promise<void>;
  regenerateImagesForCut: (cutId: string) => Promise<void>;
  selectImage: (cutId: string, imageId: string) => void;
  generateVideoForCut: (params: { cutId: string; motionType: MotionType; durationSec: 3 | 5 }) => Promise<void>;
  renderFinalVideo: (params: {
    projectId: string;
    motionTypeDefault: MotionType;
    bgmOn: boolean;
    subtitleTemplate: 'none' | 'basic';
  }) => Promise<void>;
};

const FanCutStudioContext = createContext<Ctx | null>(null);

export function FanCutStudioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const imageRequestControllersRef = useRef<Record<string, AbortController>>({});
  const imageProjectControllersRef = useRef<Record<string, AbortController>>({});

  useEffect(() => {
    const loaded = safeParseState(localStorage.getItem(STORAGE_KEY));
    if (loaded) dispatch({ type: 'LOAD', payload: cleanLoadedState(loaded) });
  }, []);

  useEffect(() => {
    persistState(state);
  }, [state]);

  const api = useMemo<Ctx>(() => {
    const getProject = (projectId: string) => state.projects[projectId];
    const getCuts = (projectId: string) => state.cutsByProject[projectId] ?? [];
    const findProjectIdForCut = (cutId: string) =>
      Object.entries(state.cutsByProject).find(([, cuts]) => cuts.some((cut) => cut.cutId === cutId))?.[0];

    const cancelImageGeneration: Ctx['cancelImageGeneration'] = (cutId) => {
      imageRequestControllersRef.current[cutId]?.abort();
      delete imageRequestControllersRef.current[cutId];

      const projectId = findProjectIdForCut(cutId);
      if (projectId) {
        imageProjectControllersRef.current[projectId]?.abort();
        delete imageProjectControllersRef.current[projectId];
      }

      dispatch({ type: 'STOP_IMAGE_JOB', cutId });
    };

    const createProjectAndPlot: Ctx['createProjectAndPlot'] = async (input) => {
      const projectId = createId('proj');
      const baseProject: FanCutProject = {
        projectId,
        createdAt: new Date().toISOString(),
        title: input.title,
        ideaText: input.ideaText,
        genre: input.genre,
        tone: input.tone,
        ipTag: input.ipTag,
        stylePreset: input.stylePreset,
        targetDuration: input.targetDuration,
        aspectRatio: normalizeAspectRatio(input.aspectRatio),
        resolution: normalizeResolutionPreset(input.resolution),
        referenceImageDataUrl: input.referenceImageDataUrl,
      };

      const response = await fetch('/api/fancut/plot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseProject),
      });

      const data = await parseJsonOrThrow<{
        projectPatch?: Partial<FanCutProject>;
        cuts: FanCutCut[];
      }>(response);

      const project = {
        ...baseProject,
        ...(data.projectPatch ?? {}),
      };

      dispatch({ type: 'UPSERT_PROJECT', project });
      dispatch({ type: 'SET_CUTS', projectId, cuts: data.cuts });

      return { projectId };
    };

    const regenerateProjectPlot: Ctx['regenerateProjectPlot'] = async (projectId) => {
      const project = getProject(projectId);
      if (!project) {
        throw new Error('프로젝트를 찾을 수 없습니다.');
      }

      imageProjectControllersRef.current[projectId]?.abort();
      delete imageProjectControllersRef.current[projectId];

      const existingCuts = getCuts(projectId);
      for (const cut of existingCuts) {
        imageRequestControllersRef.current[cut.cutId]?.abort();
        delete imageRequestControllersRef.current[cut.cutId];

        const videoObjectUrl = state.videosByCut[cut.cutId]?.videoObjectUrl;
        if (videoObjectUrl) {
          URL.revokeObjectURL(videoObjectUrl);
        }
      }

      const renderObjectUrl = state.rendersByProject[projectId]?.outputObjectUrl;
      if (renderObjectUrl) {
        URL.revokeObjectURL(renderObjectUrl);
      }

      const response = await fetch('/api/fancut/plot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });

      const data = await parseJsonOrThrow<{
        projectPatch?: Partial<FanCutProject>;
        cuts: FanCutCut[];
      }>(response);

      dispatch({ type: 'CLEAR_PROJECT_MEDIA', projectId });
      dispatch({
        type: 'UPSERT_PROJECT',
        project: {
          ...project,
          ...(data.projectPatch ?? {}),
        },
      });
      dispatch({ type: 'SET_CUTS', projectId, cuts: data.cuts });
    };

    const deleteProject: Ctx['deleteProject'] = (projectId) => {
      const cuts = getCuts(projectId);
      for (const cut of cuts) {
        const videoObjectUrl = state.videosByCut[cut.cutId]?.videoObjectUrl;
        if (videoObjectUrl) {
          URL.revokeObjectURL(videoObjectUrl);
        }
      }

      const renderObjectUrl = state.rendersByProject[projectId]?.outputObjectUrl;
      if (renderObjectUrl) {
        URL.revokeObjectURL(renderObjectUrl);
      }

      dispatch({ type: 'DELETE_PROJECT', projectId });
    };

    const updateCut: Ctx['updateCut'] = (cutId, patch) => {
      dispatch({ type: 'UPDATE_CUT', cutId, patch });
    };

    const reorderCut: Ctx['reorderCut'] = (projectId, cutId, direction) => {
      dispatch({ type: 'REORDER_CUTS', projectId, cutId, direction });
    };

    const setCutsOrder: Ctx['setCutsOrder'] = (projectId, cuts) => {
      dispatch({ type: 'SET_CUTS_ORDER', projectId, cuts });
    };

    const ensureImagesForProject: Ctx['ensureImagesForProject'] = async (projectId) => {
      const project = getProject(projectId);
      if (!project) return;
      const orderedCuts = getCuts(projectId).slice().sort((a, b) => a.order - b.order);
      const projectController = new AbortController();
      imageProjectControllersRef.current[projectId]?.abort();
      imageProjectControllersRef.current[projectId] = projectController;

      try {
        for (const [index, cut] of orderedCuts.entries()) {
          if (projectController.signal.aborted) {
            break;
          }

          const previousCut = index > 0 ? orderedCuts[index - 1] : undefined;
          const referenceImageDataUrl = cut.order === 1 ? project.referenceImageDataUrl : undefined;

          const existing = state.imagesByCut[cut.cutId];
          if (existing?.candidates?.length) {
            continue;
          }

          dispatch({ type: 'SET_IMAGE_CANDIDATES', cutId: cut.cutId, candidates: [] });
          dispatch({ type: 'START_IMAGE_JOB', cutId: cut.cutId });

          const requestController = new AbortController();
          const abortCurrentRequest = () => requestController.abort();
          projectController.signal.addEventListener('abort', abortCurrentRequest, { once: true });
          imageRequestControllersRef.current[cut.cutId] = requestController;

          try {
            const response = await fetch('/api/fancut/images', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: requestController.signal,
              body: JSON.stringify({
                project,
                cut,
                count: 1,
                previousImageDataUrl: referenceImageDataUrl,
                previousCutSummary: previousCut?.sceneSummary,
                previousCutCharacters: previousCut?.characters,
              }),
            });
            const data = await parseJsonOrThrow<{ candidates: ImageCandidate[] }>(response);
            dispatch({ type: 'SET_IMAGE_CANDIDATES', cutId: cut.cutId, candidates: data.candidates });
          } finally {
            projectController.signal.removeEventListener('abort', abortCurrentRequest);
            delete imageRequestControllersRef.current[cut.cutId];
            dispatch({ type: 'STOP_IMAGE_JOB', cutId: cut.cutId });
          }

          await sleep(400);
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      } finally {
        if (imageProjectControllersRef.current[projectId] === projectController) {
          delete imageProjectControllersRef.current[projectId];
        }
      }
    };

    const regenerateImagesForCut: Ctx['regenerateImagesForCut'] = async (cutId) => {
      const allCuts = Object.values(state.cutsByProject).flat();
      const cut = allCuts.find((entry) => entry.cutId === cutId);
      if (!cut) return;
      const project = getProject(cut.projectId);
      if (!project) return;

      const orderedCuts = getCuts(cut.projectId).slice().sort((a, b) => a.order - b.order);
      const cutIndex = orderedCuts.findIndex((entry) => entry.cutId === cutId);
      const previousCut = cutIndex > 0 ? orderedCuts[cutIndex - 1] : undefined;
      const previousImageDataUrl = cut.order === 1 ? project.referenceImageDataUrl : undefined;

      dispatch({ type: 'SET_IMAGE_CANDIDATES', cutId, candidates: [] });
      dispatch({ type: 'START_IMAGE_JOB', cutId });

      const requestController = new AbortController();
      imageRequestControllersRef.current[cutId]?.abort();
      imageRequestControllersRef.current[cutId] = requestController;

      try {
        const response = await fetch('/api/fancut/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: requestController.signal,
          body: JSON.stringify({
            project,
            cut,
            count: 3,
            previousImageDataUrl,
            previousCutSummary: previousCut?.sceneSummary,
            previousCutCharacters: previousCut?.characters,
          }),
        });
        const data = await parseJsonOrThrow<{ candidates: ImageCandidate[] }>(response);
        dispatch({ type: 'SET_IMAGE_CANDIDATES', cutId, candidates: data.candidates });
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      } finally {
        delete imageRequestControllersRef.current[cutId];
        dispatch({ type: 'STOP_IMAGE_JOB', cutId });
      }
    };

    const selectImage: Ctx['selectImage'] = (cutId, imageId) => {
      dispatch({ type: 'SELECT_IMAGE', cutId, imageId });
    };

    const generateVideoForCut: Ctx['generateVideoForCut'] = async ({ cutId, motionType, durationSec }) => {
      const cut = Object.values(state.cutsByProject).flat().find((entry) => entry.cutId === cutId);
      if (!cut) throw new Error('컷을 찾을 수 없습니다.');
      const project = getProject(cut.projectId);
      if (!project) throw new Error('프로젝트를 찾을 수 없습니다.');

      const selectedImage = selectedImageForCut(state, cutId);
      if (!selectedImage) throw new Error('선택된 이미지가 없습니다.');
      const orderedCuts = getCuts(cut.projectId).slice().sort((a, b) => a.order - b.order);
      const cutIndex = orderedCuts.findIndex((entry) => entry.cutId === cutId);
      const nextCut = cutIndex >= 0 ? orderedCuts[cutIndex + 1] : undefined;
      const nextSelectedImage = nextCut ? selectedImageForCut(state, nextCut.cutId) : undefined;

      const optimizedStartImage = await optimizeVideoReferenceDataUrl(selectedImage.imageDataUrl, {
        maxLongEdge: 960,
        quality: 0.78,
      });
      const optimizedEndImage = nextSelectedImage
        ? await optimizeVideoReferenceDataUrl(nextSelectedImage.imageDataUrl, {
            maxLongEdge: 960,
            quality: 0.74,
          })
        : undefined;

      const basePayload = {
        project,
        cut,
        motionType,
        durationSec,
        imageDataUrl: optimizedStartImage,
      };
      const withEndPayload = optimizedEndImage
        ? {
            ...basePayload,
            endImageDataUrl: optimizedEndImage,
          }
        : basePayload;
      const payload = requestPayloadBytes(withEndPayload) > 3_500_000 ? basePayload : withEndPayload;

      const createResponse = await fetch('/api/fancut/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let video = await parseJsonOrThrow<{
        id: string;
        status: 'queued' | 'in_progress' | 'completed' | 'failed';
        progress?: number;
        seconds?: string;
        downloadUri?: string;
        error?: { message?: string };
      }>(createResponse);

      while (video.status === 'queued' || video.status === 'in_progress') {
        await sleep(5000);
        const pollResponse = await fetch(`/api/fancut/videos/${video.id}`, {
          cache: 'no-store',
        });
        video = await parseJsonOrThrow<typeof video>(pollResponse);
      }

      if (video.status === 'failed') {
        throw new Error(video.error?.message ?? '영상 생성에 실패했습니다.');
      }

      const downloadResponse = await fetch(
        `/api/fancut/videos/${video.id}/content?durationSec=${durationSec}&size=${videoSizeForProject(project)}`,
        { cache: 'no-store' }
      );
      const blob = await parseBlobOrThrow(downloadResponse);
      const objectUrl = URL.createObjectURL(blob);

      const asset: VideoAsset = {
        videoId: createId('vid'),
        cutId,
        createdAt: new Date().toISOString(),
        sourceImageId: selectedImage.imageId,
        motionType,
        durationSec,
        videoObjectUrl: objectUrl,
        providerVideoId: video.id,
        actualDurationSec: Number(video.seconds ?? 0),
        status: video.status,
        progress: video.progress,
      };

      dispatch({ type: 'SET_VIDEO', cutId, video: asset });
    };

    const renderFinalVideo: Ctx['renderFinalVideo'] = async ({ projectId }) => {
      const project = getProject(projectId);
      if (!project) throw new Error('프로젝트를 찾을 수 없습니다.');

      const orderedCuts = getCuts(projectId).slice().sort((a, b) => a.order - b.order);
      if (orderedCuts.length === 0) throw new Error('컷이 없습니다.');

      const clips = orderedCuts.map((cut) => {
        const video = state.videosByCut[cut.cutId];
        if (!video?.providerVideoId) {
          throw new Error(`CUT ${cut.order} 영상이 아직 준비되지 않았습니다.`);
        }
        return {
          videoId: video.providerVideoId,
          durationSec: cut.durationSec,
        };
      });

      const response = await fetch('/api/fancut/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips,
          size: videoSizeForProject(project),
        }),
      });
      const blob = await parseBlobOrThrow(response);
      const outputObjectUrl = URL.createObjectURL(blob);

      const firstSelectedImage = selectedImageForCut(state, orderedCuts[0].cutId);
      const thumbnailDataUrl = firstSelectedImage
        ? await createThumbnailDataUrl(firstSelectedImage.imageDataUrl)
        : '';

      const render: FinalRender = {
        renderId: createId('render'),
        projectId,
        createdAt: new Date().toISOString(),
        outputObjectUrl,
        thumbnailDataUrl,
        totalDurationSec: orderedCuts.reduce((total, cut) => total + cut.durationSec, 0),
        format: 'mp4',
      };

      dispatch({ type: 'SET_RENDER', projectId, render });
    };

    return {
      state,
      createProjectAndPlot,
      regenerateProjectPlot,
      deleteProject,
      cancelImageGeneration,
      getProject,
      getCuts,
      updateCut,
      reorderCut,
      setCutsOrder,
      ensureImagesForProject,
      regenerateImagesForCut,
      selectImage,
      generateVideoForCut,
      renderFinalVideo,
    };
  }, [state]);

  return <FanCutStudioContext.Provider value={api}>{children}</FanCutStudioContext.Provider>;
}

export function useFanCutStudio() {
  const context = useContext(FanCutStudioContext);
  if (!context) {
    throw new Error('useFanCutStudio must be used within FanCutStudioProvider');
  }
  return context;
}
