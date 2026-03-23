import { NextResponse } from 'next/server';
import { createId } from '@/lib/fancut/id';
import { defaultCutCount } from '@/lib/fancut/plot';
import { GeminiRequestError, geminiJson } from '@/lib/fancut/gemini';
import { readProviderKeyOverrides } from '@/lib/fancut/provider-keys';
import {
  buildImagePrompt,
  buildIpResearchPrompt,
  buildPlotFormattingPrompt,
  buildPlotSystemPrompt,
  buildPlotUserPrompt,
  buildVideoPrompt,
} from '@/lib/fancut/prompts';
import type {
  AspectRatio,
  FanCutCut,
  FanCutProject,
  ProjectConsistency,
  ResolutionPreset,
  StylePreset,
  TargetDuration,
} from '@/types/fancut';

export const runtime = 'nodejs';

type PlotRequest = {
  projectId: string;
  title: string;
  ideaText: string;
  genre?: string;
  tone?: string;
  ipTag?: string;
  stylePreset: StylePreset;
  targetDuration: TargetDuration;
  aspectRatio: AspectRatio;
  resolution: ResolutionPreset;
  referenceImageDataUrl?: string;
};

type PlotCompletionResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
    blockReasonMessage?: string;
  };
};

function extractGeminiText(completion: PlotCompletionResponse, emptyMessage: string) {
  const refusal = completion.promptFeedback?.blockReasonMessage ?? completion.promptFeedback?.blockReason;
  if (refusal) {
    throw new GeminiRequestError(`플롯 생성이 거절되었습니다: ${refusal}`, 400);
  }

  const rawContent = completion.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text;
  if (!rawContent) {
    throw new GeminiRequestError(emptyMessage, 502);
  }

  return rawContent;
}

async function requestPlotText(params: {
  model: string;
  userText: string;
  responseMimeType?: 'application/json';
  temperature: number;
  apiKeyOverride?: string;
}) {
  const completion = await geminiJson<PlotCompletionResponse>(`/models/${params.model}:generateContent`, {
    method: 'POST',
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildPlotSystemPrompt() }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: params.userText }],
        },
      ],
      generationConfig: {
        temperature: params.temperature,
        ...(params.responseMimeType ? { responseMimeType: params.responseMimeType } : {}),
      },
    }),
  }, 0, params.apiKeyOverride);

  return extractGeminiText(
    completion,
    params.responseMimeType ? '플롯 JSON 응답이 비어 있습니다.' : '플롯 기획 초안 응답이 비어 있습니다.'
  );
}

async function researchIpContext(model: string, body: PlotRequest, apiKeyOverride?: string) {
  try {
    const completion = await geminiJson<PlotCompletionResponse>(`/models/${model}:generateContent`, {
      method: 'POST',
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: buildIpResearchPrompt({
                  title: body.title,
                  ideaText: body.ideaText,
                  genre: body.genre,
                  tone: body.tone,
                  ipTag: body.ipTag,
                }),
              },
            ],
          },
        ],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.1,
        },
      }),
    }, 0, apiKeyOverride);

    const note = extractGeminiText(completion, 'IP 리서치 응답이 비어 있습니다.').trim();
    if (!note || note.toUpperCase() === 'NONE') {
      return null;
    }

    return note;
  } catch {
    return null;
  }
}

type PlotCharacterDraft = {
  name?: unknown;
  role?: unknown;
  appearance?: unknown;
  wardrobe?: unknown;
  color_palette?: unknown;
  must_keep?: unknown;
};

type PlotCutDraft = {
  scene_summary?: unknown;
  characters?: unknown;
  action?: unknown;
  composition?: unknown;
  background?: unknown;
  lighting?: unknown;
  mood?: unknown;
  story_point?: unknown;
  image_prompt?: unknown;
  video_prompt?: unknown;
  duration_sec?: unknown;
  policy_adaptation_note?: unknown;
};

type PlotDraft = {
  title?: unknown;
  story_summary?: unknown;
  style_core?: unknown;
  visual_rules?: unknown;
  policy_adaptation_note?: unknown;
  character_bible?: unknown;
  cuts?: unknown;
};

type IpResearchData = {
  note: string | null;
  characterNames: string[];
  appearanceByName: Record<string, string>;
  wardrobeByName: Record<string, string>;
};

function normalizeString(value: unknown, fallback: string) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function normalizeStringArray(value: unknown, fallback: string[], maxItems: number) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => normalizeString(item, ''))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
  return items.length > 0 ? items : fallback;
}

function extractJsonText(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function parsePlotDraft(raw: string) {
  const jsonText = extractJsonText(raw);
  try {
    return JSON.parse(jsonText) as PlotDraft;
  } catch {
    throw new GeminiRequestError('플롯 JSON을 해석하지 못했습니다. 다시 시도해 주세요.', 502);
  }
}

function normalizeDurationSec(value: unknown): 3 | 5 {
  return value === 5 || value === '5' ? 5 : 3;
}

function desiredCutCount(targetDuration: TargetDuration) {
  return Math.min(10, Math.max(5, defaultCutCount(targetDuration)));
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function splitResearchValues(raw: string) {
  return raw
    .split(/[,\n/|·・]/)
    .map((item) => item.replace(/\([^)]*\)/g, '').trim())
    .map((item) => item.replace(/^[-•\s]+/, '').trim())
    .filter(Boolean);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDescriptorMap(raw: string, names: string[]) {
  const map: Record<string, string> = {};
  const normalizedRaw = raw.replace(/\s+/g, ' ').trim();
  if (!normalizedRaw) return map;

  if (names.length > 0) {
    const sortedNames = [...names].sort((left, right) => right.length - left.length);
    const pattern = new RegExp(`(${sortedNames.map(escapeRegExp).join('|')})\\s*:`, 'g');
    const matches = [...normalizedRaw.matchAll(pattern)];

    for (const [index, match] of matches.entries()) {
      const matchedName = match[1]?.trim();
      if (!matchedName || typeof match.index !== 'number') continue;

      const start = match.index + match[0].length;
      const end = matches[index + 1]?.index ?? normalizedRaw.length;
      const value = normalizedRaw.slice(start, end).replace(/^[;,\s]+|[;,\s]+$/g, '').trim();
      if (!value) continue;

      const canonicalName = names.find((name) => name === matchedName || name.includes(matchedName) || matchedName.includes(name));
      if (canonicalName) {
        map[canonicalName] = value;
      }
    }

    if (Object.keys(map).length > 0) {
      return map;
    }
  }

  const entries = normalizedRaw
    .split(/\s*;\s*|\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const separatorIndex = entry.indexOf(':');
    if (separatorIndex < 0) continue;

    const key = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1).trim();
    if (!key || !value) continue;

    const matchedName = names.find((name) => key.includes(name) || name.includes(key));
    if (matchedName) {
      map[matchedName] = value;
    }
  }

  return map;
}

function looksLikeGenericCharacterLabel(value: string) {
  return /(붉은머리|검은머리|하얀머리|금발|선수|주인공|라이벌|남학생|여학생|남자|여자|소년|소녀|학생|인물|센터|가드|포워드|캐릭터)/.test(
    value
  );
}

function looksLikeTeamOrPlace(value: string) {
  return /(고교|고등학교|학교|팀|부|클럽|동아리|고등부|중학|중학교|시합장|체육관|거리|도시|마을|역|공원|경기장)/.test(value);
}

function parseIpResearchData(note: string | null): IpResearchData {
  if (!note) {
    return { note: null, characterNames: [], appearanceByName: {}, wardrobeByName: {} };
  }

  const lines = note.split('\n').map((line) => line.trim());
  const characterLine = lines.find((line) => line.startsWith('- 핵심 인물:'));
  const appearanceLine = lines.find((line) => line.startsWith('- 핵심 인물 외형 시그니처:'));
  const wardrobeLine = lines.find((line) => line.startsWith('- 핵심 인물 의상/유니폼 시그니처:'));
  const requiredTermsLine = lines.find((line) => line.startsWith('- 플롯에 반드시 반영할 고유명사:'));

  const primaryNames = splitResearchValues(characterLine?.split(':').slice(1).join(':') ?? '').filter(
    (item) => !looksLikeGenericCharacterLabel(item) && !looksLikeTeamOrPlace(item)
  );
  const backupNames = splitResearchValues(requiredTermsLine?.split(':').slice(1).join(':') ?? '').filter(
    (item) => !looksLikeGenericCharacterLabel(item) && !looksLikeTeamOrPlace(item)
  );

  const names = uniqueStrings(primaryNames.length > 0 ? primaryNames : backupNames).slice(0, 8);

  return {
    note,
    characterNames: names,
    appearanceByName: parseDescriptorMap(appearanceLine?.split(':').slice(1).join(':') ?? '', names),
    wardrobeByName: parseDescriptorMap(wardrobeLine?.split(':').slice(1).join(':') ?? '', names),
  };
}

function canonicalCharactersForCut(index: number, names: string[]) {
  if (names.length === 0) return '주인공';
  if (names.length === 1) return names[0];
  const primary = names[index % names.length];
  const secondary = names[(index + 1) % names.length];
  return primary === secondary ? primary : `${primary} / ${secondary}`;
}

function hasKnownCanonicalName(value: string, names: string[]) {
  return names.some((name) => value.includes(name));
}

function normalizeCharactersField(value: unknown, index: number, names: string[]) {
  const fallback = canonicalCharactersForCut(index, names);
  const normalized = normalizeString(value, fallback);
  if (names.length === 0) {
    return normalized;
  }
  if (hasKnownCanonicalName(normalized, names)) {
    return normalized;
  }
  if (looksLikeGenericCharacterLabel(normalized)) {
    return fallback;
  }
  return normalized;
}

function looksLikeGenericAppearance(value: string) {
  return /(일관된 외형|선명한 인상|대표 외형|스타일에 맞는 외형|매력적인 외모|주인공다운 외모|캐릭터다운 외형)/.test(value);
}

function looksLikeGenericWardrobe(value: string) {
  return /(대표 의상|이야기 전체에서 유지되는 대표 의상|톤에 맞는 대표 의상|일관된 의상|기본 복장)/.test(value);
}

function shouldPreserveCanonicalDesign(body: Pick<PlotRequest, 'ipTag'>, names: string[]) {
  return Boolean(body.ipTag?.trim()) || names.length > 0;
}

function fallbackAppearanceText(name: string, body: PlotRequest, preserveCanonicalDesign: boolean) {
  if (preserveCanonicalDesign) {
    return `${name}의 원작 기준 대표 외형을 유지한 모습: 헤어스타일, 머리색, 눈매, 얼굴 인상, 체형, 대표 액세서리`;
  }

  return `${body.stylePreset} 스타일에 맞는 선명한 인상과 일관된 얼굴 비율`;
}

function fallbackWardrobeText(name: string, body: PlotRequest, preserveCanonicalDesign: boolean) {
  if (preserveCanonicalDesign) {
    return `${name}의 원작 기준 대표 의상 또는 유니폼, 실루엣, 메인 컬러 조합 유지`;
  }

  return body.tone ? `${body.tone} 톤에 맞는 대표 의상` : '이야기 전체에서 유지되는 대표 의상';
}

function fallbackMustKeep(preserveCanonicalDesign: boolean) {
  return preserveCanonicalDesign
    ? ['원작 헤어스타일 유지', '얼굴 인상 유지', '대표 의상 실루엣 유지', '메인 컬러 유지']
    : ['헤어스타일 유지', '의상 실루엣 유지', '메인 컬러 유지'];
}

function defaultPolicyAdaptationNote(body: Pick<PlotRequest, 'ipTag'>, names: string[]) {
  return shouldPreserveCanonicalDesign(body, names)
    ? '원작 고유명사와 시각 시그니처를 유지하되 컷 연출과 구도는 숏폼에 맞게 새롭게 구성'
    : '없음';
}

function fallbackCharacter(
  body: PlotRequest,
  names: string[],
  appearanceByName: Record<string, string>,
  wardrobeByName: Record<string, string>
): ProjectConsistency['characterBible'][number] {
  const name = names[0] ?? '주인공';
  const preserveCanonicalDesign = shouldPreserveCanonicalDesign(body, names);
  return {
    name,
    role: body.genre ? `${body.genre} 장르의 중심 인물` : '이야기의 중심 인물',
    appearance: appearanceByName[name] ?? fallbackAppearanceText(name, body, preserveCanonicalDesign),
    wardrobe: wardrobeByName[name] ?? fallbackWardrobeText(name, body, preserveCanonicalDesign),
    colorPalette: '핵심 포인트 컬러 2~3개를 고정',
    mustKeep: fallbackMustKeep(preserveCanonicalDesign),
  };
}

function fallbackCut(order: number, body: PlotRequest, names: string[]): PlotCutDraft {
  const total = desiredCutCount(body.targetDuration);
  const stage =
    order === 1
      ? '도입'
      : order === total
        ? '엔딩'
        : order >= Math.ceil(total * 0.7)
          ? '클라이맥스 직전'
          : '전개';

  return {
    scene_summary: order === 1 ? `오프닝 장면. ${body.ideaText}` : `${stage} 컷. ${body.ideaText}`,
    characters: canonicalCharactersForCut(order - 1, names),
    action:
      order === 1
        ? '주인공이 배경이 보이는 구도에서 핵심 행동을 시작한다.'
        : order === total
          ? '여운을 남기며 마무리한다.'
          : '감정과 동작이 이어진다.',
    composition: order === 1 ? '미디엄 풀샷' : order % 3 === 2 ? '미디엄 샷' : '와이드 샷',
    background: body.genre ? `${body.genre} 분위기의 배경` : '장면 분위기를 받쳐주는 배경',
    lighting: body.tone ? `${body.tone} 감정에 맞는 조명` : '장면 감정을 살리는 조명',
    mood: body.tone ?? '몰입감 있는 분위기',
    story_point: stage,
    duration_sec: 3,
    policy_adaptation_note: defaultPolicyAdaptationNote(body, names),
  };
}

function normalizeCharacterBible(
  value: unknown,
  body: PlotRequest,
  names: string[],
  appearanceByName: Record<string, string>,
  wardrobeByName: Record<string, string>
) {
  const preserveCanonicalDesign = shouldPreserveCanonicalDesign(body, names);
  const normalized = Array.isArray(value)
    ? value
        .slice(0, 5)
        .map((entry, index) => {
          const character = (entry ?? {}) as PlotCharacterDraft;
          const name = normalizeCharactersField(character.name, index, names);
          const appearance = normalizeString(character.appearance, '');
          const wardrobe = normalizeString(character.wardrobe, '');
          return {
            name,
            role: normalizeString(character.role, `${name}의 역할`),
            appearance:
              appearance && !looksLikeGenericAppearance(appearance)
                ? appearance
                : appearanceByName[name] ?? fallbackAppearanceText(name, body, preserveCanonicalDesign),
            wardrobe:
              wardrobe && !looksLikeGenericWardrobe(wardrobe)
                ? wardrobe
                : wardrobeByName[name] ?? fallbackWardrobeText(name, body, preserveCanonicalDesign),
            colorPalette: normalizeString(character.color_palette, '대표 포인트 컬러 2~3개'),
            mustKeep: normalizeStringArray(character.must_keep, fallbackMustKeep(preserveCanonicalDesign), 6),
          };
        })
    : [];

  return normalized.length > 0 ? normalized : [fallbackCharacter(body, names, appearanceByName, wardrobeByName)];
}

function normalizeCuts(value: unknown, body: PlotRequest, names: string[]) {
  const drafts = Array.isArray(value) ? value.slice(0, 10) : [];
  const normalized = drafts.map((entry, index) => {
    const cut = (entry ?? {}) as PlotCutDraft;
    return {
      sceneSummary: normalizeString(cut.scene_summary, `${body.ideaText}의 핵심 장면 ${index + 1}`),
      characters: normalizeCharactersField(cut.characters, index, names),
      action: normalizeString(cut.action, '감정과 동작이 자연스럽게 이어진다.'),
      composition: normalizeString(cut.composition, '미디엄 샷'),
      background: normalizeString(cut.background, '장면 분위기를 살리는 배경'),
      lighting: normalizeString(cut.lighting, '감정을 강조하는 조명'),
      mood: normalizeString(cut.mood, body.tone ?? '몰입감 있는 분위기'),
      storyPoint: normalizeString(cut.story_point, `스토리 진행 ${index + 1}`),
      imagePrompt: normalizeString(cut.image_prompt, ''),
      videoPrompt: normalizeString(cut.video_prompt, ''),
      durationSec: normalizeDurationSec(cut.duration_sec),
      policyAdaptationNote: normalizeString(cut.policy_adaptation_note, defaultPolicyAdaptationNote(body, names)),
    };
  });

  const minimumCount = Math.max(5, Math.min(10, normalized.length || desiredCutCount(body.targetDuration)));
  while (normalized.length < minimumCount) {
    const fallback = fallbackCut(normalized.length + 1, body, names);
    normalized.push({
      sceneSummary: normalizeString(fallback.scene_summary, `${body.ideaText}의 보완 장면`),
      characters: normalizeCharactersField(fallback.characters, normalized.length, names),
      action: normalizeString(fallback.action, '감정과 동작이 이어진다.'),
      composition: normalizeString(fallback.composition, '미디엄 샷'),
      background: normalizeString(fallback.background, '배경'),
      lighting: normalizeString(fallback.lighting, '조명'),
      mood: normalizeString(fallback.mood, body.tone ?? '몰입감 있는 분위기'),
      storyPoint: normalizeString(fallback.story_point, `스토리 진행 ${normalized.length + 1}`),
      imagePrompt: '',
      videoPrompt: '',
      durationSec: normalizeDurationSec(fallback.duration_sec),
      policyAdaptationNote: normalizeString(fallback.policy_adaptation_note, defaultPolicyAdaptationNote(body, names)),
    });
  }

  return normalized.slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PlotRequest;
    const providerKeys = readProviderKeyOverrides(request);
    const model = process.env.GEMINI_PLOT_MODEL ?? 'gemini-2.5-flash';
    const researchModel = process.env.GEMINI_IP_RESEARCH_MODEL ?? 'gemini-2.5-flash-lite';
    const formatModel = process.env.GEMINI_PLOT_FORMAT_MODEL ?? 'gemini-2.5-flash-lite';
    const ipResearch = parseIpResearchData(await researchIpContext(researchModel, body, providerKeys.geminiApiKey));

    const brief = await requestPlotText({
      model,
      userText: [
        buildPlotUserPrompt({
          title: body.title,
          ideaText: body.ideaText,
          genre: body.genre,
          tone: body.tone,
          ipTag: body.ipTag,
          stylePreset: body.stylePreset,
          targetDuration: body.targetDuration,
        }),
        ipResearch.note ? `IP 리서치 참고자료:\n${ipResearch.note}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      temperature: 0.85,
      apiKeyOverride: providerKeys.geminiApiKey,
    });

    const rawContent = await requestPlotText({
      model: formatModel,
      userText: buildPlotFormattingPrompt({
        brief,
        targetDuration: body.targetDuration,
      }),
      responseMimeType: 'application/json',
      temperature: 0.35,
      apiKeyOverride: providerKeys.geminiApiKey,
    });

    const parsed = parsePlotDraft(rawContent);

    const consistency: ProjectConsistency = {
      storySummary: normalizeString(parsed.story_summary, body.ideaText),
      styleCore: normalizeString(parsed.style_core, `${body.stylePreset} 스타일을 모든 컷에서 일관되게 유지`),
      visualRules: normalizeStringArray(
        parsed.visual_rules,
        ['캐릭터 외형 유지', '의상과 색상 팔레트 유지', '컷 간 분위기 연결'],
        8
      ),
      characterBible: normalizeCharacterBible(
        parsed.character_bible,
        body,
        ipResearch.characterNames,
        ipResearch.appearanceByName,
        ipResearch.wardrobeByName
      ),
    };

    const projectPatch: Partial<FanCutProject> = {
      title: normalizeString(parsed.title, body.title),
      consistency,
      policyAdaptationNote: normalizeString(parsed.policy_adaptation_note, defaultPolicyAdaptationNote(body, ipResearch.characterNames)),
    };

    const projectForPrompts: FanCutProject = {
      projectId: body.projectId,
      createdAt: new Date().toISOString(),
      title: projectPatch.title ?? body.title,
      ideaText: body.ideaText,
      genre: body.genre,
      tone: body.tone,
      ipTag: body.ipTag,
      stylePreset: body.stylePreset,
      targetDuration: body.targetDuration,
      aspectRatio: body.aspectRatio,
      resolution: body.resolution,
      referenceImageDataUrl: body.referenceImageDataUrl,
      consistency,
      policyAdaptationNote: projectPatch.policyAdaptationNote,
    };

    const cuts: FanCutCut[] = normalizeCuts(parsed.cuts, body, ipResearch.characterNames).map((cut, index) => {
      const baseCut: FanCutCut = {
        cutId: createId('cut'),
        projectId: body.projectId,
        order: index + 1,
        sceneSummary: cut.sceneSummary,
        characters: cut.characters,
        action: cut.action,
        composition: cut.composition,
        background: cut.background,
        lighting: cut.lighting,
        mood: cut.mood,
        storyPoint: cut.storyPoint,
        durationSec: cut.durationSec,
        policyAdaptationNote: cut.policyAdaptationNote,
      };

      return {
        ...baseCut,
        imagePrompt: cut.imagePrompt || buildImagePrompt({ project: projectForPrompts, cut: baseCut, candidateIndex: 0 }),
        videoPrompt:
          cut.videoPrompt
          || buildVideoPrompt({
            project: projectForPrompts,
            cut: baseCut,
            motionType: 'static',
            durationSec: baseCut.durationSec,
          }),
      };
    });

    return NextResponse.json({ projectPatch, cuts });
  } catch (error) {
    const status = error instanceof GeminiRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : '플롯 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
