# CLIMATE SWITCH - 경기도 기후 시뮬레이터

경기 기후위성 데이터와 공간정보를 활용하여, 도시 요소(녹지·불투수면·쉼터 등)를 ON/OFF 했을 때 폭염·침수 위험이 어떻게 변하는지 즉시 시각화하고 정량화하는 체험형 지도 서비스입니다.

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.17 이상
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수를 설정하세요:

```env
CLIMATE_API_KEY=your_api_key_here
CLIMATE_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_MAP_STYLE_URL=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
```

## 📁 프로젝트 구조

```
app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   └── simulation/   # 시뮬레이션 API
│   │   ├── simulator/         # 시뮬레이터 페이지
│   │   ├── about/            # 서비스 소개 페이지
│   │   ├── layout.tsx        # 루트 레이아웃
│   │   └── page.tsx          # 메인 페이지
│   ├── components/           # 재사용 가능한 컴포넌트
│   ├── lib/                  # 유틸리티 및 로직
│   │   └── simulation/      # 시뮬레이션 계산 로직
│   └── types/               # TypeScript 타입 정의
├── public/                   # 정적 파일
└── prd.md                   # 제품 요구사항 문서
```

## 🛠️ 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS 4
- **지도**: MapLibre GL JS
- **차트**: Recharts
- **지리공간 계산**: Turf.js
- **배포**: Vercel

## 📊 주요 기능

### 폭염 시뮬레이션
- 녹지 감소가 폭염 위험에 미치는 영향 분석
- 불투수면 증가 효과 시각화
- 무더위쉼터 효과 계산

### 침수 시뮬레이션
- 도시 구조 변화가 침수에 미치는 영향 분석
- 극한호우 위험도 계산
- 하천 근접도 고려

### Before/After 비교
- 시뮬레이션 전후 위험도 변화 비교
- 수치 및 그래프로 시각화
- 변화율(%) 계산

## 🔧 개발

### 빌드

```bash
npm run build
```

### 린트

```bash
npm run lint
```

### 타입 체크

```bash
npx tsc --noEmit
```

## 📝 API 엔드포인트

### POST /api/simulation/heat
폭염 위험도 시뮬레이션 계산

**요청 본문**:
```json
{
  "heatIndex": 0.7,
  "impervious": 0.5,
  "green": 0.3,
  "greenReduction": 0.1,
  "imperviousIncrease": 0.2,
  "shelterEnabled": true
}
```

**응답**:
```json
{
  "risk": 0.65,
  "riskLevel": "high"
}
```

### POST /api/simulation/flood
침수 위험도 시뮬레이션 계산

**요청 본문**:
```json
{
  "rainRisk": 0.6,
  "floodTrace": 0.4,
  "impervious": 0.5,
  "riverProximity": 0.3,
  "imperviousIncrease": 0.2,
  "floodDefenseEnabled": false
}
```

**응답**:
```json
{
  "risk": 0.55,
  "riskLevel": "high"
}
```

## 📚 참고 문서

- [프로젝트 규칙](./shrimp-rules.md) - 개발 가이드라인
- [PRD](../prd.md) - 제품 요구사항 문서
- [Next.js 문서](https://nextjs.org/docs)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js-docs/)

## 📄 라이선스

이 프로젝트는 해커톤 프로젝트입니다.
