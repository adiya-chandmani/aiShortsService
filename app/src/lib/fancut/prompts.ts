import type {
  AspectRatio,
  FanCutCut,
  FanCutProject,
  MotionType,
  ResolutionPreset,
  StylePreset,
} from '@/types/fancut';
import { defaultCutCount } from './plot';

export type ImageSize = '1024x1024' | '1024x1536' | '1536x1024';
export type VideoSize = '720x1280' | '1280x720' | '1024x1792' | '1792x1024';

const STYLE_DESCRIPTIONS: Record<StylePreset, string> = {
  anime: 'animated film keyframe, clean cel shading, expressive faces, cinematic motion energy',
  webtoon: 'Korean animation keyframe inspired by web illustration, clean linework, soft cel shading, no comic panel layout',
  cinematic: 'cinematic frame, dramatic contrast, filmic lighting, premium short-form trailer energy',
  realistic: 'photorealistic illustration, believable materials, natural light falloff, grounded details',
  pixel: 'carefully composed pixel art, readable silhouettes, limited but intentional palette',
  minimal: 'graphic minimalist illustration, restrained palette, strong silhouettes, poster-like framing',
};

export function imageSizeForAspectRatio(aspectRatio: AspectRatio): ImageSize {
  return aspectRatio === '16:9' ? '1536x1024' : '1024x1536';
}

export function videoSizeForProject(project: Pick<FanCutProject, 'aspectRatio' | 'resolution'>): VideoSize {
  if (project.aspectRatio === '16:9') {
    return project.resolution === '1080p' ? '1792x1024' : '1280x720';
  }
  return project.resolution === '1080p' ? '1024x1792' : '720x1280';
}

export function requestedCutCount(targetDuration: FanCutProject['targetDuration']) {
  return defaultCutCount(targetDuration);
}

export function geminiVideoSecondsForDuration(durationSec: 3 | 5): '4' | '6' {
  return durationSec === 5 ? '6' : '4';
}

export function trimDurationForGeneratedVideo(durationSec: 3 | 5) {
  return durationSec;
}

export function buildPlotSystemPrompt() {
  return [
    'You are a senior storyboard planner for a short-form video production tool.',
    'Turn free-form user ideas into a visually specific, emotionally escalating storyboard with 5 to 10 cuts.',
    'The output must feel like one complete short-form piece with a hook, setup, escalation, climax, and ending beat.',
    'Every cut must feel meaningfully different from the previous cut. Do not paraphrase the same moment.',
    'Every cut must include: scene summary, characters, action, composition, background, lighting, mood, story point, image prompt, video prompt.',
    'Use concrete nouns and verbs. Prefer specific props, gestures, locations, and visual changes over vague phrases.',
    'Optimize for continuity across cuts: keep character appearance, wardrobe, palette, props, and art direction stable unless the story explicitly changes them.',
    'Make cut 1 instantly attention-grabbing, but keep it as a concrete opening scene from the story rather than a title card, abstract montage, or poster shot.',
    'The first cut should be readable for video generation: clear subject, readable body pose, grounded environment, and no extreme distortion.',
    'Make the last cut emotionally satisfying or highly shareable.',
    'If the user references a known fictional IP, preserve canonical character, team, and location names in planning fields so the storyboard stays recognizable.',
    'In character_bible.name and cuts.characters, always use canonical proper names when they are known.',
    'For character_bible.appearance, write specific visible traits such as hair color, hairstyle, eye shape, face impression, build, age impression, skin tone, facial marks, and signature accessories.',
    'For character_bible.wardrobe, write specific visible outfit details such as top, bottom, outerwear, uniform number, shoes, gloves, headbands, jewelry, and the main color combination.',
    'Never replace known characters with generic labels such as red-haired player, black-haired player, main character, rival, male student, or female student.',
    'However, for image_prompt and video_prompt, if direct depiction could be risky, convert the visual description into an inspired-by version that keeps tone, role, and visual cues without requiring exact copyrighted likeness.',
    'Do not invent random replacement names when a known fictional IP is clearly identified.',
    'Keep prompts concise but production-usable. Avoid empty phrases, generic filler, and camera jargon overload.',
    'Return Korean output.',
  ].join(' ');
}

export function buildPlotUserPrompt(project: Pick<FanCutProject, 'title' | 'ideaText' | 'genre' | 'tone' | 'ipTag' | 'stylePreset' | 'targetDuration'>) {
  return [
    `프로젝트 제목: ${project.title}`,
    `아이디어: ${project.ideaText}`,
    `장르: ${project.genre ?? '자동 추론'}`,
    `톤: ${project.tone ?? '자동 추론'}`,
    `IP 태그: ${project.ipTag ?? '없음'}`,
    `스타일 프리셋: ${project.stylePreset} (${STYLE_DESCRIPTIONS[project.stylePreset]})`,
    `목표 길이: ${project.targetDuration}초`,
    `목표 컷 수: ${requestedCutCount(project.targetDuration)}컷 내외`,
    '요구사항:',
    '1. 숏폼 영상으로 바로 이어질 만큼 컷 간 감정선과 액션이 자연스럽게 연결되어야 한다.',
    '2. 첫 컷은 1초 안에 시선을 잡는 훅이어야 하지만, 제목 카드나 포스터처럼 뜬 이미지가 아니라 실제 장면의 오프닝 샷이어야 한다.',
    '3. 첫 컷은 인물과 배경, 동작이 읽히는 미디엄샷 또는 풀샷 위주로 설계하고, 과한 초광각 왜곡이나 얼굴만 꽉 찬 극단적 클로즈업은 피한다.',
    '4. 최종 이미지는 영상 생성의 시작 프레임으로 쓸 예정이므로, 컷 설명과 프롬프트는 웹툰 패널보다 애니메이션 키프레임에 가깝게 써야 한다.',
    '5. 중간 컷들은 갈등, 긴장, 기대, 감정 변화가 실제로 누적되도록 설계한다.',
    '6. 각 컷은 storyboard 카드처럼 바로 이미지/영상 생성에 사용할 수 있어야 한다.',
    '7. 스타일 바이블과 캐릭터 바이블을 먼저 정리하고, 모든 컷이 이를 따르게 한다.',
    '8. 캐릭터 바이블의 외형과 의상은 "주황 옷" 같은 수준이 아니라 헤어스타일, 머리색, 눈매, 체형, 얼굴 특징, 대표 의상과 신발까지 구체적으로 적는다.',
    '9. 장면 요약에는 누가, 어디서, 무엇을 하는지가 분명히 드러나야 한다.',
    '10. vague한 표현 대신 시각적으로 그릴 수 있는 명사와 동사를 사용한다.',
    '11. 사용자가 직접 프롬프트를 쓰지 않아도 되도록 각 컷용 image_prompt, video_prompt를 자동 작성한다.',
    '12. Gemini 정책상 직접 생성이 어려운 고유 IP/실존인물 요소는 inspired-by 형태의 오리지널 표현으로 완화한다.',
    '13. 마크다운 없이 결과 생성에 필요한 기획 초안만 작성한다.',
  ].join('\n');
}

export function buildPlotFormattingPrompt(params: {
  brief: string;
  targetDuration: FanCutProject['targetDuration'];
}) {
  return [
    `다음 기획 초안을 JSON 객체 하나로 정리하라. 목표 컷 수는 ${requestedCutCount(params.targetDuration)}컷 내외다.`,
    '출력 규칙:',
    '1. 마크다운 금지. 코드펜스 금지. JSON 객체 하나만 출력.',
    '2. 최상위 키는 title, story_summary, style_core, visual_rules, policy_adaptation_note, character_bible, cuts 만 사용.',
    '3. character_bible의 각 원소는 name, role, appearance, wardrobe, color_palette, must_keep 만 사용.',
    '4. cuts의 각 원소는 scene_summary, characters, action, composition, background, lighting, mood, story_point, image_prompt, video_prompt, duration_sec, policy_adaptation_note 만 사용.',
    '5. duration_sec은 3 또는 5만 사용.',
    '6. visual_rules와 must_keep은 배열로 작성.',
    '7. cuts는 5개 이상 10개 이하.',
    '8. 빈 문자열이나 추상적 반복 표현을 피하고, 각 컷은 이전 컷과 다른 사건/표정/동작/배경 변화를 가져야 한다.',
    '9. character_bible.name과 cuts.characters에는 generic 묘사 대신 실제 인물명을 사용한다.',
    '10. character_bible.appearance와 wardrobe는 구체적인 보이는 특징으로 작성한다. 예: 헤어스타일, 머리색, 눈매, 얼굴 인상, 체형, 상의, 하의, 신발, 대표 소품, 메인 컬러.',
    '기획 초안:',
    params.brief,
  ].join('\n');
}

export function buildIpResearchPrompt(params: {
  title: string;
  ideaText: string;
  genre?: string;
  tone?: string;
  ipTag?: string;
}) {
  return [
    '사용자 입력에 기존의 유명한 fictional IP가 포함되어 있는지 판단하라.',
    '포함되어 있으면 Google Search를 활용해 작품의 정식 명칭, 대표 인물명, 대표 팀/조직명, 대표 배경/무대, 장르 톤을 확인하라.',
    '포함되어 있지 않으면 정확히 NONE만 출력하라.',
    '포함되어 있으면 아래 형식의 짧은 한국어 참고 노트만 출력하라.',
    'IP 참고 노트:',
    '- 작품명:',
    '- 원제/영문명:',
    '- 매체:',
    '- 핵심 인물:',
    '- 핵심 인물 외형 시그니처:',
    '- 핵심 인물 의상/유니폼 시그니처:',
    '- 핵심 팀/조직/관계:',
    '- 대표 배경/무대:',
    '- 톤/장르 키워드:',
    '- 플롯에 반드시 반영할 고유명사:',
    '- 생성 프롬프트에서는 우회 설명이 필요한 요소:',
    `제목: ${params.title}`,
    `아이디어: ${params.ideaText}`,
    `장르: ${params.genre ?? '자동 추론'}`,
    `톤: ${params.tone ?? '자동 추론'}`,
    `별도 IP 태그: ${params.ipTag ?? '없음'}`,
  ].join('\n');
}

function characterBibleText(project: FanCutProject) {
  const bible = project.consistency?.characterBible ?? [];
  if (bible.length === 0) return '캐릭터 바이블 없음';
  return bible
    .map((character) =>
      [
        `이름: ${character.name}`,
        `역할: ${character.role}`,
        `외형: ${character.appearance}`,
        `의상: ${character.wardrobe}`,
        `색상 팔레트: ${character.colorPalette}`,
        `절대 유지 요소: ${character.mustKeep.join(', ')}`,
      ].join(' / ')
    )
    .join('\n');
}

function characterTokens(value: string) {
  return value
    .split(/[\/,|&·•\n]/)
    .map((item) => item.replace(/\([^)]*\)/g, '').trim())
    .filter(Boolean);
}

function relevantCharacterBibleText(project: FanCutProject, cut: FanCutCut) {
  const tokens = characterTokens(cut.characters);
  const bible = project.consistency?.characterBible ?? [];
  const relevant = bible.filter((character) => tokens.some((token) => character.name.includes(token) || token.includes(character.name)));
  const selected = relevant.length > 0 ? relevant : bible.slice(0, 3);

  if (selected.length === 0) return 'Relevant character look guide unavailable';

  return selected
    .map((character) =>
      [
        `${character.name}`,
        `appearance: ${character.appearance}`,
        `wardrobe: ${character.wardrobe}`,
        `palette: ${character.colorPalette}`,
        `must keep: ${character.mustKeep.join(', ')}`,
      ].join(' / ')
    )
    .join('\n');
}

export function buildImagePrompt(params: {
  project: FanCutProject;
  cut: FanCutCut;
  candidateIndex: number;
}) {
  const { project, cut, candidateIndex } = params;
  return [
    `Create one high-quality ${project.aspectRatio} frame for a short-form video.`,
    `Global style preset: ${project.stylePreset}. ${STYLE_DESCRIPTIONS[project.stylePreset]}.`,
    `Global style bible: ${project.consistency?.styleCore ?? 'Keep one coherent visual language.'}`,
    `Global visual rules: ${(project.consistency?.visualRules ?? []).join(', ') || 'No additional rules.'}`,
    `Character bible:\n${characterBibleText(project)}`,
    `Cut ${cut.order}: ${cut.sceneSummary}`,
    `Characters: ${cut.characters}`,
    `Action: ${cut.action}`,
    `Composition: ${cut.composition}`,
    `Background: ${cut.background}`,
    `Lighting: ${cut.lighting}`,
    `Mood: ${cut.mood}`,
    `Story beat: ${cut.storyPoint}`,
    `Variation note: candidate ${candidateIndex + 1} should slightly vary framing emphasis, micro-expression, or environmental detail while keeping the same character identity and style.`,
    'Deliver a polished single-frame key visual with strong subject clarity.',
    'Do not add text, logos, watermarks, subtitles, or split panels.',
    'Avoid direct copyrighted character likenesses or real-person likenesses.',
  ].join('\n');
}

function compactCharacterBible(project: FanCutProject) {
  const bible = project.consistency?.characterBible ?? [];
  if (bible.length === 0) return '';
  return bible
    .slice(0, 3)
    .map((character) =>
      [
        character.name,
        character.appearance,
        character.wardrobe,
        character.colorPalette,
        character.mustKeep.join(' '),
      ]
        .filter(Boolean)
        .join(', ')
    )
    .join(' | ');
}

function openingCutGuidance(cut: FanCutCut) {
  if (cut.order !== 1) return '';

  return [
    'This is the opening shot.',
    'Make it feel like the first usable frame of a video, not a poster, title card, splash art, or abstract teaser image.',
    'Prefer a clean medium shot or full shot with readable body pose, subject placement, and environment.',
    'Avoid extreme fisheye distortion, face-only closeups, surreal symbolic composition, and empty background.',
  ].join(' ');
}

function multipleCharacterGuidance(cut: FanCutCut) {
  if (!/[\/,|&·•]/.test(cut.characters)) return '';

  return [
    'Multiple named characters must all be visible.',
    'Each character needs a clearly different silhouette, face shape, hairstyle, costume, and body language.',
    'Do not render them as recolored clones of the same character.',
  ].join(' ');
}

function requiredPropsGuidance(cut: FanCutCut) {
  const text = [cut.imagePrompt, cut.sceneSummary, cut.action, cut.background].filter(Boolean).join(' ');
  const props: string[] = [];

  if (/(농구공|basketball|드리블|덩크|슛|패스|리바운드)/i.test(text)) {
    props.push('basketball');
  } else if (/(축구공|soccer ball|football|킥오프|프리킥)/i.test(text)) {
    props.push('soccer ball');
  } else if (/(야구공|baseball|홈런|투구)/i.test(text)) {
    props.push('baseball');
  } else if (/\bball\b/i.test(text)) {
    props.push('ball');
  }

  if (/(검|sword)/i.test(text)) props.push('sword');
  if (/(총|gun|pistol|rifle)/i.test(text)) props.push('gun');
  if (/(마이크|microphone)/i.test(text)) props.push('microphone');
  if (/(우산|umbrella)/i.test(text)) props.push('umbrella');

  if (props.length === 0) return '';

  return `Mandatory visible props: ${[...new Set(props)].join(', ')}. These props must be clearly visible in the frame.`;
}

export function buildTogetherImagePrompt(params: {
  project: FanCutProject;
  cut: FanCutCut;
  count: number;
  hasReferenceImage: boolean;
  previousCutSummary?: string;
  previousCutCharacters?: string;
}) {
  const { project, cut, count, hasReferenceImage, previousCutSummary, previousCutCharacters } = params;
  const aspectText = project.aspectRatio === '16:9' ? 'horizontal 16:9 frame' : 'vertical 9:16 frame';
  const continuityText = hasReferenceImage
    ? 'Keep face shape, hairstyle, costume colors, body proportions, and overall art direction tightly aligned with the provided reference image.'
    : 'Keep face shape, hairstyle, costume colors, body proportions, and overall art direction tightly aligned with the character bible and neighboring cuts.';
  const primaryShot = cut.imagePrompt?.trim() || cut.sceneSummary;
  const previousCutGuard = previousCutSummary
    ? `This cut must be visually different from the previous cut (${previousCutCharacters ?? 'previous characters'}: ${previousCutSummary}). Change pose, camera framing, and moment of action. Do not repeat the same composition or create a recolored duplicate.`
    : '';

  return [
    `Create ${count} highly accurate animation keyframes for a short-form video.`,
    `Each image must be a ${aspectText}.`,
    `Mandatory shot description: ${primaryShot}`,
    `Mandatory characters that must visibly appear: ${cut.characters}`,
    `Mandatory action: ${cut.action}`,
    `Mandatory framing: ${cut.composition}`,
    `Mandatory background: ${cut.background}`,
    `Mandatory lighting: ${cut.lighting}`,
    `Mandatory mood: ${cut.mood}`,
    `Story beat: ${cut.storyPoint}`,
    `Style preset: ${project.stylePreset}. ${STYLE_DESCRIPTIONS[project.stylePreset]}.`,
    `Style bible: ${project.consistency?.styleCore ?? 'Maintain one coherent visual language across all cuts.'}`,
    `Visual rules: ${(project.consistency?.visualRules ?? []).join(', ') || 'No additional rules.'}`,
    `Relevant character look guide:\n${relevantCharacterBibleText(project, cut)}`,
    `Character bible:\n${characterBibleText(project)}`,
    continuityText,
    openingCutGuidance(cut),
    previousCutGuard,
    multipleCharacterGuidance(cut),
    requiredPropsGuidance(cut),
    'These images will be used as start frames for AI video generation, so they must look like natural animation frames rather than comics or illustrated posters.',
    'If the required characters or action are missing, the image is incorrect.',
    'When generating multiple candidates, vary only micro-expression, lens emphasis, or minor environmental detail. Do not change identity, wardrobe, or core composition.',
    'Deliver one natural cinematic frame, not a comic panel, manga page, storyboard sheet, collage, or split panel.',
    'Do not add text, logos, subtitles, speech bubbles, UI, watermark, panel borders, halftone dots, extra limbs, duplicate characters, or broken anatomy.',
  ].join('\n');
}

export function buildAihordeImagePrompt(params: {
  project: FanCutProject;
  cut: FanCutCut;
  candidateIndex: number;
}) {
  const { project, cut, candidateIndex } = params;
  return [
    'masterpiece',
    'best quality',
    project.aspectRatio === '9:16' ? 'vertical composition' : 'cinematic widescreen composition',
    STYLE_DESCRIPTIONS[project.stylePreset],
    cut.imagePrompt ?? cut.sceneSummary,
    `characters ${cut.characters}`,
    `action ${cut.action}`,
    `composition ${cut.composition}`,
    `background ${cut.background}`,
    `lighting ${cut.lighting}`,
    `mood ${cut.mood}`,
    project.consistency?.styleCore ?? '',
    (project.consistency?.visualRules ?? []).join(', '),
    compactCharacterBible(project),
    `variation ${candidateIndex + 1}`,
    'consistent character design',
    'single frame',
    'no text',
    'no watermark',
  ]
    .filter(Boolean)
    .join(', ');
}

export function buildVideoPrompt(params: {
  project: FanCutProject;
  cut: FanCutCut;
  motionType: MotionType;
  durationSec: 3 | 5;
}) {
  const { project, cut, motionType, durationSec } = params;
  const motionText =
    motionType === 'zoom_in'
      ? 'slow cinematic push-in'
      : motionType === 'pan_left'
        ? 'gentle leftward pan'
        : motionType === 'pan_right'
          ? 'gentle rightward pan'
          : 'mostly locked frame with subtle natural motion';

  return [
    `Short-form vertical video shot, target duration about ${durationSec} seconds after trim.`,
    `Keep the first frame visually aligned to the provided reference image.`,
    `Style: ${project.stylePreset}. ${STYLE_DESCRIPTIONS[project.stylePreset]}.`,
    `Style bible: ${project.consistency?.styleCore ?? 'Maintain visual continuity.'}`,
    `Cut ${cut.order}: ${cut.sceneSummary}`,
    `Characters: ${cut.characters}`,
    `Action progression: ${cut.action}`,
    `Composition: ${cut.composition}`,
    `Background: ${cut.background}`,
    `Lighting: ${cut.lighting}`,
    `Mood: ${cut.mood}`,
    `Camera movement: ${motionText}.`,
    'Generate natural motion, subtle secondary movement, and a clean ending frame suitable for stitching with neighboring cuts.',
    'Avoid text overlays, abrupt morphing, identity drift, or major costume changes.',
    'Avoid direct copyrighted character likenesses or real-person likenesses.',
  ].join('\n');
}

export function normalizeTargetDuration(input: 15 | 20 | 30): FanCutProject['targetDuration'] {
  return input === 30 ? 30 : 15;
}

export function normalizeAspectRatio(input: AspectRatio | '1:1'): AspectRatio {
  return input === '16:9' ? '16:9' : '9:16';
}

export function normalizeResolutionPreset(input: ResolutionPreset) {
  return input;
}
