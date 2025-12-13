# CLIMATE SWITCH 개발 가이드라인

## 프로젝트 개요

### 프로젝트 정보
- **프로젝트명**: CLIMATE SWITCH - 경기도 기후 시뮬레이터
- **기술 스택**: Next.js 16 (App Router), React 19, TypeScript, MapLibre GL JS, Tailwind CSS 4, Recharts, Turf.js
- **배포 환경**: Vercel
- **데이터 소스**: 경기기후플랫폼 API (WMS/WFS/WMTS)

### 핵심 기능
- 지도 기반 폭염/침수 시뮬레이션
- 실시간 위험도 계산 및 시각화
- Before/After 비교 기능
- 결과 리포트 생성

---

## 프로젝트 아키텍처

### 디렉토리 구조

```
app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes (서버 사이드)
│   │   │   └── [endpoint]/
│   │   │       └── route.ts
│   │   ├── simulator/         # 시뮬레이터 페이지
│   │   ├── report/            # 리포트 페이지
│   │   ├── layout.tsx         # 루트 레이아웃
│   │   └── page.tsx           # 메인 페이지
│   ├── components/            # 재사용 가능한 컴포넌트
│   │   ├── map/              # 지도 관련 컴포넌트
│   │   ├── simulation/        # 시뮬레이션 컨트롤 컴포넌트
│   │   └── ui/               # UI 컴포넌트
│   ├── lib/                   # 유틸리티 및 로직
│   │   ├── map/              # 지도 관련 로직
│   │   ├── simulation/        # 시뮬레이션 계산 로직
│   │   └── api/              # API 클라이언트
│   └── types/                 # TypeScript 타입 정의
├── public/                    # 정적 파일
└── prd.md                     # 제품 요구사항 문서
```

### 파일 생성 규칙

- **API Routes**: `/app/src/app/api/[endpoint]/route.ts` 형식으로 생성
- **페이지**: `/app/src/app/[page-name]/page.tsx` 형식으로 생성
- **컴포넌트**: `/app/src/components/[category]/[ComponentName].tsx` 형식으로 생성
- **유틸리티**: `/app/src/lib/[category]/[functionName].ts` 형식으로 생성
- **타입**: `/app/src/types/[domain].ts` 형식으로 생성

---

## 코드 표준

### TypeScript 규칙

- **strict 모드 필수**: `tsconfig.json`에서 `strict: true` 유지
- **타입 명시**: 함수 파라미터와 반환값에 타입 명시 필수
- **any 금지**: `any` 타입 사용 금지, `unknown` 사용 권장
- **인터페이스 우선**: 타입 별칭보다 인터페이스 사용 권장

**예시 (올바른 방법)**:
```typescript
interface SimulationParams {
  greenReduction: number;
  imperviousIncrease: number;
  shelterEnabled: boolean;
}

function calculateHeatRisk(params: SimulationParams): number {
  // ...
}
```

**예시 (금지)**:
```typescript
function calculateHeatRisk(params: any): any {
  // ...
}
```

### 네이밍 규칙

- **컴포넌트**: PascalCase (예: `MapViewer.tsx`)
- **함수/변수**: camelCase (예: `calculateHeatRisk`)
- **상수**: UPPER_SNAKE_CASE (예: `MAX_RISK_VALUE`)
- **타입/인터페이스**: PascalCase (예: `HeatRiskData`)
- **파일명**: 컴포넌트는 PascalCase, 유틸리티는 camelCase

### React 컴포넌트 규칙

- **클라이언트 컴포넌트**: MapLibre GL JS 사용 시 반드시 `'use client'` 선언
- **서버 컴포넌트 기본**: 클라이언트 기능 불필요 시 서버 컴포넌트로 유지
- **Props 타입 정의**: 모든 컴포넌트 Props에 인터페이스 정의 필수

**예시 (올바른 방법)**:
```typescript
'use client';

import { Map } from 'maplibre-gl';

interface MapViewerProps {
  center: [number, number];
  zoom: number;
}

export function MapViewer({ center, zoom }: MapViewerProps) {
  // ...
}
```

---

## 기능 구현 표준

### 지도 시각화 구현

- **MapLibre GL JS 사용**: `maplibre-gl` 패키지 사용
- **지도 인스턴스 관리**: Context API로 전역 관리 (`/app/src/contexts/MapContext.tsx`)
- **레이어 추가 순서**: 베이스맵 → 데이터 레이어 → 오버레이 순서 유지
- **성능 최적화**: 레이어는 필요 시에만 로드, 불필요한 레이어 즉시 제거

**필수 구현 패턴**:
```typescript
'use client';

import { useEffect, useRef } from 'react';
import { Map } from 'maplibre-gl';

export function MapViewer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    map.current = new Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [127.5, 37.5],
      zoom: 10
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return <div ref={mapContainer} className="w-full h-screen" />;
}
```

### 시뮬레이션 로직 구현

- **폭염 위험도 계산**: `/app/src/lib/simulation/heatRisk.ts`에 구현
- **침수 위험도 계산**: `/app/src/lib/simulation/floodRisk.ts`에 구현
- **계산 결과 정규화**: 모든 위험도 값은 0~1 범위로 정규화 필수
- **서버 사이드 계산**: 시뮬레이션 계산은 API Route에서 수행

**필수 구현 패턴**:
```typescript
// /app/src/lib/simulation/heatRisk.ts
export interface HeatRiskParams {
  heatIndex: number;        // 0~1
  impervious: number;       // 0~1
  green: number;            // 0~1
  greenReduction?: number;  // 0~1 (시뮬레이션)
  imperviousIncrease?: number; // 0~1 (시뮬레이션)
  shelterEnabled?: boolean;
}

export function calculateHeatRisk(params: HeatRiskParams): number {
  const adjustedGreen = params.green - (params.greenReduction || 0);
  const adjustedImpervious = params.impervious + (params.imperviousIncrease || 0);
  
  let risk = 0.55 * params.heatIndex 
           + 0.25 * adjustedImpervious 
           - 0.20 * Math.max(0, adjustedGreen);
  
  if (!params.shelterEnabled) {
    risk += 0.1; // 쉼터 없을 시 취약도 증가
  }
  
  return Math.max(0, Math.min(1, risk)); // 0~1 정규화
}
```

### API Routes 구현

- **경로 규칙**: `/app/src/app/api/[endpoint]/route.ts`
- **API Key 보호**: 환경변수에서만 읽기, 클라이언트에 노출 금지
- **에러 처리**: 모든 API Route에 try-catch 및 적절한 HTTP 상태 코드 반환
- **응답 형식**: JSON 형식으로 일관성 유지

**필수 구현 패턴**:
```typescript
// /app/src/app/api/simulation/heat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { calculateHeatRisk } from '@/lib/simulation/heatRisk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const risk = calculateHeatRisk(body);
    
    return NextResponse.json({ risk }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Calculation failed' },
      { status: 500 }
    );
  }
}
```

### Before/After 비교 구현

- **상태 관리**: React Context 또는 Zustand 사용
- **메모이제이션**: `useMemo`, `useCallback`으로 리렌더링 최소화
- **비교 데이터 저장**: Before 상태는 시뮬레이션 실행 전에 저장

**필수 구현 패턴**:
```typescript
'use client';

import { createContext, useContext, useState, useMemo } from 'react';

interface ComparisonData {
  before: number;
  after: number;
  change: number;
}

const ComparisonContext = createContext<ComparisonData | null>(null);

export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  const [before, setBefore] = useState<number | null>(null);
  const [after, setAfter] = useState<number | null>(null);
  
  const comparison = useMemo(() => {
    if (before === null || after === null) return null;
    return {
      before,
      after,
      change: after - before,
      changePercent: ((after - before) / before) * 100
    };
  }, [before, after]);
  
  return (
    <ComparisonContext.Provider value={comparison}>
      {children}
    </ComparisonContext.Provider>
  );
}
```

---

## 프레임워크/라이브러리 사용 표준

### Next.js App Router

- **서버 컴포넌트 기본**: 클라이언트 기능 불필요 시 서버 컴포넌트 유지
- **동적 라우팅**: `[param]` 형식 사용
- **메타데이터**: 각 페이지에 `metadata` export 필수

**예시**:
```typescript
// /app/src/app/simulator/page.tsx
export const metadata = {
  title: '기후 시뮬레이터 - CLIMATE SWITCH',
  description: '경기도 기후 위험도 시뮬레이션'
};

export default function SimulatorPage() {
  // ...
}
```

### MapLibre GL JS

- **클라이언트 전용**: 반드시 `'use client'` 선언
- **레이어 관리**: 레이어 ID는 고유하게 명명
- **스타일 로딩**: 외부 스타일 URL 사용 시 CORS 확인

**필수 패턴**:
```typescript
'use client';

import { Map, Layer, Source } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// 지도 인스턴스는 useEffect 내에서만 생성
// 레이어는 map.on('load') 후에 추가
```

### Tailwind CSS

- **다크모드 필수**: 모든 UI 컴포넌트에 `dark:` 클래스 추가
- **반응형 디자인**: mobile-first 접근 (`sm:`, `md:`, `lg:` 사용)
- **커스텀 색상**: 위험도 색상은 `tailwind.config.ts`에 정의

**필수 패턴**:
```typescript
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  {/* 다크모드 지원 필수 */}
</div>
```

### Recharts

- **차트 컴포넌트**: `/app/src/components/charts/`에 분리
- **데이터 형식**: Recharts 요구 형식에 맞춰 변환 함수 작성

### Turf.js

- **지리공간 계산**: 거리 계산, 영역 계산 등에 사용
- **성능 고려**: 대용량 데이터 처리 시 적절한 샘플링

---

## 워크플로우 표준

### 데이터 흐름

```
사용자 입력 (슬라이더/스위치)
  ↓
클라이언트 상태 업데이트
  ↓
API Route 호출 (/api/simulation/heat)
  ↓
서버 사이드 시뮬레이션 계산
  ↓
결과 반환 (JSON)
  ↓
지도 레이어 업데이트
  ↓
Before/After 비교 UI 업데이트
```

### 시뮬레이션 실행 워크플로우

1. 사용자가 슬라이더/스위치 조작
2. Before 상태 저장 (첫 실행 시)
3. API Route로 시뮬레이션 파라미터 전송
4. 서버에서 위험도 계산
5. 결과를 지도 레이어에 반영
6. Before/After 비교 UI 업데이트

### 에러 처리 워크플로우

1. API 호출 실패 시 사용자에게 알림 표시
2. 지도 로딩 실패 시 폴백 메시지 표시
3. 계산 오류 시 기본값 반환 및 로그 기록

---

## 주요 파일 상호작용 표준

### 시뮬레이션 관련 파일

- **수정 시 동시 업데이트 필요**:
  - `/app/src/lib/simulation/heatRisk.ts` 수정 시
  - `/app/src/app/api/simulation/heat/route.ts` 확인
  - `/app/src/types/simulation.ts` 타입 정의 확인
  - `/app/src/components/simulation/HeatSimulator.tsx` 컴포넌트 확인

### 지도 관련 파일

- **수정 시 동시 업데이트 필요**:
  - `/app/src/contexts/MapContext.tsx` 수정 시
  - 모든 지도 컴포넌트 (`/app/src/components/map/*`) 확인
  - 지도 사용 페이지 (`/app/src/app/simulator/page.tsx`) 확인

### 타입 정의 파일

- **수정 시 동시 업데이트 필요**:
  - `/app/src/types/simulation.ts` 수정 시
  - 모든 시뮬레이션 관련 파일 확인
  - API Route 타입 정의 확인

---

## AI 의사결정 표준

### 파일 생성 우선순위

1. **타입 정의 먼저**: 새 기능 추가 시 타입 정의부터 작성
2. **API Route 작성**: 서버 사이드 로직 먼저 구현
3. **유틸리티 함수**: 재사용 가능한 로직 분리
4. **컴포넌트 구현**: UI 컴포넌트 마지막 구현

### 모호한 요구사항 처리

- **PRD 참조**: `prd.md` 파일을 먼저 확인
- **기존 패턴 따르기**: 유사한 기능의 기존 구현 참조
- **타입 안정성 우선**: 타입 오류 발생 시 기능 구현 중단하고 타입 수정

### 성능 최적화 판단

- **지도 레이어**: 동시에 5개 이상 레이어 추가 금지
- **리렌더링**: 불필요한 리렌더링 발생 시 메모이제이션 적용
- **API 호출**: 동일한 파라미터로 반복 호출 시 캐싱 고려

---

## 금지 사항

### 보안 관련

- ❌ **API Key 하드코딩 금지**: 환경변수(`.env.local`)에만 저장
- ❌ **클라이언트에서 API Key 접근 금지**: 서버 사이드에서만 사용
- ❌ **민감한 데이터 클라이언트 전송 금지**: 계산 결과만 전송

### 성능 관련

- ❌ **무제한 지도 레이어 추가 금지**: 최대 5개 레이어
- ❌ **클라이언트에서 대용량 계산 금지**: 서버 사이드로 이동
- ❌ **불필요한 리렌더링 유발 금지**: 메모이제이션 필수

### 코드 품질 관련

- ❌ **any 타입 사용 금지**: 타입 안정성 유지
- ❌ **주석 없는 복잡한 로직 금지**: 이해하기 어려운 코드는 주석 필수
- ❌ **하드코딩된 값 금지**: 상수는 별도 파일로 분리

### 아키텍처 관련

- ❌ **서버 컴포넌트에서 클라이언트 전용 라이브러리 사용 금지**: MapLibre GL JS 등
- ❌ **API Route 없이 외부 API 직접 호출 금지**: CORS 및 보안 문제
- ❌ **컴포넌트에 비즈니스 로직 직접 작성 금지**: lib 폴더로 분리

---

## 환경 변수 관리

### 필수 환경 변수

- `NEXT_PUBLIC_MAP_STYLE_URL`: 지도 스타일 URL (선택)
- `CLIMATE_API_KEY`: 경기기후플랫폼 API Key (서버 전용)
- `CLIMATE_API_BASE_URL`: API 베이스 URL

### 환경 변수 파일

- `.env.local`: 로컬 개발용 (gitignore에 포함)
- `.env.example`: 예시 파일 (git에 포함, 실제 값 제외)

---

## 빌드 및 배포

### 빌드 명령어

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npm run lint`: ESLint 실행

### 배포 전 체크리스트

- [ ] TypeScript 컴파일 오류 없음
- [ ] ESLint 오류 없음
- [ ] 환경 변수 설정 확인
- [ ] API Route 동작 확인
- [ ] 지도 레이어 로딩 확인
- [ ] 시뮬레이션 계산 정확성 확인

---

## 참고 문서

- **PRD**: `/prd.md` - 제품 요구사항 상세 문서
- **Next.js 문서**: https://nextjs.org/docs
- **MapLibre GL JS**: https://maplibre.org/maplibre-gl-js-docs/
- **경기기후플랫폼 API**: API 문서 참조 필요

