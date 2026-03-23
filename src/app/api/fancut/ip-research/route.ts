import { NextResponse } from 'next/server';
import { GeminiRequestError, geminiJson } from '@/lib/fancut/gemini';
import { readProviderKeyOverrides } from '@/lib/fancut/provider-keys';
import { buildIpResearchPrompt } from '@/lib/fancut/prompts';
import type { CharacterConsistency } from '@/types/fancut';

export const runtime = 'nodejs';

type IpResearchRequest = {
  title?: string;
  ideaText?: string;
  genre?: string;
  tone?: string;
  ipTag?: string;
};

type ResearchCompletionResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
    blockReasonMessage?: string;
  };
};

type ParsedIpResearch = {
  note: string | null;
  workTitle: string | null;
  originalTitle: string | null;
  media: string | null;
  characterNames: string[];
  appearanceByName: Record<string, string>;
  wardrobeByName: Record<string, string>;
};

function extractGeminiText(completion: ResearchCompletionResponse, emptyMessage: string) {
  const refusal = completion.promptFeedback?.blockReasonMessage ?? completion.promptFeedback?.blockReason;
  if (refusal) {
    throw new GeminiRequestError(`IP 리서치가 거절되었습니다: ${refusal}`, 400);
  }

  const rawContent = completion.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text;
  if (!rawContent) {
    throw new GeminiRequestError(emptyMessage, 502);
  }

  return rawContent;
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

function lineValue(lines: string[], prefix: string) {
  return lines.find((line) => line.startsWith(prefix))?.split(':').slice(1).join(':').trim() ?? null;
}

function parseIpResearchData(note: string | null): ParsedIpResearch {
  if (!note) {
    return {
      note: null,
      workTitle: null,
      originalTitle: null,
      media: null,
      characterNames: [],
      appearanceByName: {},
      wardrobeByName: {},
    };
  }

  const lines = note.split('\n').map((line) => line.trim());
  const workTitle = lineValue(lines, '- 작품명:');
  const originalTitle = lineValue(lines, '- 원제/영문명:');
  const media = lineValue(lines, '- 매체:');
  const characterLine = lineValue(lines, '- 핵심 인물:');
  const appearanceLine = lineValue(lines, '- 핵심 인물 외형 시그니처:');
  const wardrobeLine = lineValue(lines, '- 핵심 인물 의상/유니폼 시그니처:');
  const requiredTermsLine = lineValue(lines, '- 플롯에 반드시 반영할 고유명사:');

  const primaryNames = splitResearchValues(characterLine ?? '').filter(
    (item) => !looksLikeGenericCharacterLabel(item) && !looksLikeTeamOrPlace(item)
  );
  const backupNames = splitResearchValues(requiredTermsLine ?? '').filter(
    (item) => !looksLikeGenericCharacterLabel(item) && !looksLikeTeamOrPlace(item)
  );

  const characterNames = uniqueStrings(primaryNames.length > 0 ? primaryNames : backupNames).slice(0, 8);

  return {
    note,
    workTitle,
    originalTitle,
    media,
    characterNames,
    appearanceByName: parseDescriptorMap(appearanceLine ?? '', characterNames),
    wardrobeByName: parseDescriptorMap(wardrobeLine ?? '', characterNames),
  };
}

function buildCharacterPreviewCharacters(data: ParsedIpResearch): CharacterConsistency[] {
  return data.characterNames.slice(0, 6).map((name) => ({
    name,
    role: data.workTitle ? `${data.workTitle}의 핵심 인물` : '원작 기준 핵심 인물',
    appearance:
      data.appearanceByName[name]
      ?? `${name}의 원작 대표 외형: 헤어스타일, 머리색, 눈매, 얼굴 인상, 체형, 대표 액세서리`,
    wardrobe:
      data.wardrobeByName[name]
      ?? `${name}의 원작 대표 의상 또는 유니폼, 실루엣, 메인 컬러 조합`,
    colorPalette: '원작 메인 컬러 유지',
    mustKeep: ['원작 헤어스타일 유지', '얼굴 인상 유지', '대표 의상 실루엣 유지', '메인 컬러 유지'],
  }));
}

async function researchIpContext(
  model: string,
  body: Required<Pick<IpResearchRequest, 'title' | 'ideaText'>> & IpResearchRequest,
  apiKeyOverride?: string
) {
  const completion = await geminiJson<ResearchCompletionResponse>(`/models/${model}:generateContent`, {
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
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as IpResearchRequest;
    const providerKeys = readProviderKeyOverrides(request);
    const ideaText = body.ideaText?.trim() ?? '';
    const ipTag = body.ipTag?.trim() ?? '';

    if (!ideaText && !ipTag) {
      throw new GeminiRequestError('아이디어 또는 IP 태그를 입력한 뒤 캐릭터를 검색해 주세요.', 400);
    }

    const model = process.env.GEMINI_IP_RESEARCH_MODEL ?? 'gemini-2.5-flash-lite';
    const note = await researchIpContext(model, {
      title: body.title?.trim() || 'untitled project',
      ideaText: ideaText || ipTag,
      genre: body.genre?.trim() || undefined,
      tone: body.tone?.trim() || undefined,
      ipTag: ipTag || undefined,
    }, providerKeys.geminiApiKey);
    const parsed = parseIpResearchData(note);

    return NextResponse.json({
      note: parsed.note,
      workTitle: parsed.workTitle,
      originalTitle: parsed.originalTitle,
      media: parsed.media,
      characterNames: parsed.characterNames,
      characters: buildCharacterPreviewCharacters(parsed),
    });
  } catch (error) {
    const status = error instanceof GeminiRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'IP 캐릭터 검색에 실패했습니다.';
    return NextResponse.json({ error: message }, { status });
  }
}
