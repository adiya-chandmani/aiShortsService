import type { FanCutCut, FanCutProject } from '@/types/fancut';
import { createId } from './id';

function pick<T>(arr: T[], seed: number) {
  const idx = Math.abs(seed) % arr.length;
  return arr[idx];
}

function hashString(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return h;
}

export function defaultCutCount(targetDuration: FanCutProject['targetDuration']) {
  // PRD 현실안: 6컷(18초 내외) 기본
  return targetDuration === 30 ? 10 : 6;
}

export function generateCuts(project: FanCutProject): FanCutCut[] {
  const cutCount = defaultCutCount(project.targetDuration);
  const seed = hashString(`${project.ideaText}|${project.genre ?? ''}|${project.tone ?? ''}|${project.ipTag ?? ''}|${project.stylePreset}`);

  const baseCharacters = [
    '주인공(팬이 사랑하는 캐릭터)',
    '라이벌',
    '조력자',
    '군중/배경 인물',
  ];
  const moods = ['뜨거운', '유쾌한', '긴장감 있는', '감동적인', '몽환적인', '통쾌한'];
  const compositions = ['클로즈업', '미디엄 샷', '와이드 샷', '오버숄더', '로우 앵글', '하이 앵글'];
  const lightings = ['골든아워', '실내 형광등', '네온 조명', '역광', '부드러운 확산광', '강한 하이라이트'];
  const backgrounds = ['경기장', '골목길', '학교 복도', '옥상', '무대 뒤', '도시 야경'];
  const beats = [
    '도입: 아이디어의 톤을 한 컷에 압축',
    '상황 제시: 목표/갈등이 보이기 시작',
    '전개: 텐션 상승(행동/대사 암시)',
    '클라이맥스: 가장 강한 감정/액션',
    '반전/여운: 짧은 전환',
    '엔딩: 공유하고 싶은 한 문장',
  ];

  const storyBeats: string[] = Array.from({ length: cutCount }).map((_, i) => {
    if (cutCount <= 6) return beats[i] ?? beats[beats.length - 1];
    // 10컷은 중간 전개 비중을 늘림
    if (i === 0) return beats[0];
    if (i === 1) return beats[1];
    if (i >= 2 && i <= 6) return '전개: 사건이 이어지며 분위기/액션 누적';
    if (i === 7) return beats[3];
    if (i === 8) return beats[4];
    return beats[5];
  });

  return Array.from({ length: cutCount }).map((_, i) => {
    const s = seed + i * 97;
    const mood = pick(moods, s);
    const composition = pick(compositions, s >> 1);
    const lighting = pick(lightings, s >> 2);
    const background = pick(backgrounds, s >> 3);
    const chars = `${pick(baseCharacters, s >> 4)} / ${pick(baseCharacters, s >> 5)}`;

    const sceneSummary = `${mood} 분위기의 한 컷. ${project.ipTag ? `[${project.ipTag}] ` : ''}${project.ideaText}`.trim();

    return {
      cutId: createId('cut'),
      projectId: project.projectId,
      order: i + 1,
      sceneSummary,
      characters: chars,
      action: i === 0 ? '시선이 카메라를 스치며 시작' : i === cutCount - 1 ? '미소와 함께 마무리 포즈' : '순간적인 동작과 감정 변화',
      composition,
      background,
      lighting,
      mood,
      storyPoint: storyBeats[i] ?? '전개',
      durationSec: 3,
    };
  });
}

