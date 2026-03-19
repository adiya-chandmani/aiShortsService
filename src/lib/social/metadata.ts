import type { FanCutCut, FanCutProject } from '@/types/fancut';
import type { SocialPlatform, UploadDraft } from '@/types/social';

type BuildUploadDraftInput = {
  project: FanCutProject;
  cuts: FanCutCut[];
  platform: SocialPlatform;
};

const STYLE_LABELS: Record<FanCutProject['stylePreset'], string> = {
  anime: '애니',
  webtoon: '웹애니',
  cinematic: '시네마틱',
  realistic: '실사',
  pixel: '픽셀',
  minimal: '미니멀',
};

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function clipText(value: string, maxLength: number) {
  const normalized = compactWhitespace(value);
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}…` : normalized;
}

function tokenizeKeywords(value: string) {
  return Array.from(new Set((value.match(/[0-9A-Za-z\u3131-\uD79D]+/g) ?? []).map((token) => token.trim()).filter(Boolean)));
}

function toHashtag(token: string) {
  const normalized = token.replace(/^#+/, '');
  if (!normalized) return null;
  return `#${normalized}`;
}

export function buildUploadDraft({ project, cuts, platform }: BuildUploadDraftInput): UploadDraft {
  const orderedCuts = cuts.slice().sort((a, b) => a.order - b.order);
  const firstCut = orderedCuts[0];
  const highlightLines = orderedCuts
    .slice(0, 3)
    .map((cut) => clipText(cut.storyPoint || cut.sceneSummary, 44))
    .filter(Boolean);

  const titleBase = clipText(project.title === 'untitled project' ? firstCut?.sceneSummary ?? 'AI 숏폼' : project.title, 72);
  const styleLabel = STYLE_LABELS[project.stylePreset] ?? '숏폼';
  const title = clipText(
    platform === 'youtube'
      ? `${titleBase} | ${styleLabel} 하이라이트 #Shorts`
      : `${titleBase} | ${styleLabel} 숏폼`,
    platform === 'youtube' ? 95 : 90,
  );

  const keywordPool = [
    ...tokenizeKeywords(project.title),
    ...tokenizeKeywords(project.genre ?? ''),
    ...tokenizeKeywords(project.tone ?? ''),
    ...tokenizeKeywords(project.ipTag ?? ''),
    ...tokenizeKeywords(firstCut?.characters ?? ''),
    '숏폼',
    project.aspectRatio === '9:16' ? '세로영상' : '가로영상',
    styleLabel,
  ];

  const hashtags = Array.from(
    new Set(
      keywordPool
        .map(toHashtag)
        .filter((tag): tag is string => Boolean(tag))
    )
  )
    .slice(0, 6)
    .join(' ');

  const summary = clipText(project.ideaText, 140);
  const lines = [
    summary,
    highlightLines.length ? '' : null,
    ...highlightLines.map((line) => `- ${line}`),
    '',
    platform === 'youtube'
      ? 'AI로 제작한 세로형 숏폼입니다. 시청 후 좋아요와 구독으로 이어지는 제작을 응원해주세요.'
      : 'AI로 제작한 숏폼 데모입니다.',
    hashtags,
  ].filter((line): line is string => line !== null && line !== undefined && line !== '');

  return {
    title,
    description: lines.join('\n'),
    hashtags,
    privacyStatus: 'private',
  };
}
