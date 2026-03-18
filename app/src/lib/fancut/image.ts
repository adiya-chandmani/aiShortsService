import type { FanCutCut, ImageCandidate, StylePreset } from '@/types/fancut';
import { createId } from './id';

function escapeXml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function palette(style: StylePreset) {
  switch (style) {
    case 'anime':
      return { a: '#38bdf8', b: '#a78bfa', c: '#fb7185' };
    case 'webtoon':
      return { a: '#34d399', b: '#60a5fa', c: '#fbbf24' };
    case 'cinematic':
      return { a: '#111827', b: '#0ea5e9', c: '#f97316' };
    case 'realistic':
      return { a: '#0f172a', b: '#334155', c: '#e2e8f0' };
    case 'pixel':
      return { a: '#22c55e', b: '#06b6d4', c: '#f43f5e' };
    case 'minimal':
    default:
      return { a: '#0ea5e9', b: '#94a3b8', c: '#22c55e' };
  }
}

function svgDataUrl(svg: string) {
  const encoded = encodeURIComponent(svg)
    .replaceAll('%0A', '')
    .replaceAll('%20', ' ')
    .replaceAll('%3D', '=')
    .replaceAll('%3A', ':')
    .replaceAll('%2F', '/');
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

export function generateImageCandidates(params: {
  cut: FanCutCut;
  stylePreset: StylePreset;
  count: number;
}): ImageCandidate[] {
  const { cut, stylePreset, count } = params;
  const p = palette(stylePreset);
  const safeSummary = escapeXml(cut.sceneSummary);
  const safeChars = escapeXml(cut.characters);
  const safeMood = escapeXml(cut.mood);
  const safeComp = escapeXml(cut.composition);

  return Array.from({ length: Math.max(1, Math.min(count, 4)) }).map((_, idx) => {
    const imageId = createId('img');
    const label = `CUT ${cut.order} • v${idx + 1}`;
    const promptSummary = `${cut.mood} / ${cut.composition} / ${cut.background}`;
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.a}" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="${p.b}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${p.c}" stop-opacity="0.9"/>
    </linearGradient>
    <filter id="grain" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.14"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect width="720" height="1280" fill="url(#g)"/>
  <rect width="720" height="1280" filter="url(#grain)" opacity="0.35"/>
  <g opacity="0.22">
    <circle cx="${120 + idx * 30}" cy="${220 + idx * 40}" r="180" fill="#ffffff"/>
    <circle cx="${580 - idx * 25}" cy="${940 - idx * 35}" r="240" fill="#ffffff"/>
  </g>
  <rect x="40" y="60" width="640" height="120" rx="28" fill="rgba(15,23,42,0.55)"/>
  <text x="72" y="130" font-size="40" font-family="ui-sans-serif, system-ui, -apple-system" fill="#ffffff" font-weight="700">${escapeXml(label)}</text>
  <rect x="40" y="210" width="640" height="480" rx="28" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)"/>
  <text x="72" y="270" font-size="22" font-family="ui-sans-serif, system-ui, -apple-system" fill="rgba(255,255,255,0.92)">${escapeXml(safeMood)} · ${escapeXml(safeComp)}</text>
  <foreignObject x="72" y="300" width="576" height="360">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color: rgba(255,255,255,0.94); font-size: 20px; line-height: 1.45; font-family: ui-sans-serif, system-ui, -apple-system;">
      <div style="font-weight:700; font-size:22px; margin-bottom:10px;">장면</div>
      <div style="opacity:0.95;">${safeSummary}</div>
      <div style="height:14px;"></div>
      <div style="font-weight:700; font-size:22px; margin-bottom:10px;">등장인물</div>
      <div style="opacity:0.95;">${safeChars}</div>
    </div>
  </foreignObject>
  <rect x="40" y="730" width="640" height="410" rx="28" fill="rgba(15,23,42,0.35)" stroke="rgba(255,255,255,0.18)"/>
  <text x="72" y="800" font-size="22" font-family="ui-sans-serif, system-ui, -apple-system" fill="rgba(255,255,255,0.9)">스타일 프리셋: ${escapeXml(stylePreset)}</text>
  <text x="72" y="840" font-size="18" font-family="ui-sans-serif, system-ui, -apple-system" fill="rgba(255,255,255,0.75)">이 이미지는 데모용 플레이스홀더입니다.</text>
</svg>
`.trim();

    return {
      imageId,
      cutId: cut.cutId,
      createdAt: new Date().toISOString(),
      promptSummary,
      imageDataUrl: svgDataUrl(svg),
      source: 'together',
    };
  });
}
