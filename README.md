# FanCut AI

Gemini API와 Together AI를 조합해 아이디어 입력부터 플롯, 컷 이미지, 컷 영상, 최종 mp4 병합까지 이어지는 숏폼 제작 스튜디오입니다.

## 핵심 파이프라인

- 플롯 기획: `gemini-2.5-flash` + Google Search 기반 IP 리서치 + structured JSON output
- 이미지 생성: `Together AI` 이미지 생성 API
- 영상 생성: `deAPI` `LTX-Video 13B`
- 최종 병합: 번들된 `ffmpeg` 바이너리로 mp4 concat
- 원클릭 업로드: `YouTube Shorts` 실제 업로드 + `TikTok` mock 업로드

## Gemini 기준 설계 포인트

- 자유 입력을 5~10개 컷 storyboard JSON으로 강제 출력합니다.
- 프로젝트 단위 `style bible`과 `character bible`을 먼저 만들고, 이후 이미지/영상 생성에 재사용합니다.
- 컷 이미지는 Together AI의 `FLUX` 계열 이미지 모델을 사용합니다.
- 기본 모델은 `black-forest-labs/FLUX.1-schnell`이며, `TOGETHER_REFERENCE_IMAGE_MODEL`을 추가하면 reference-capable 모델로 올릴 수 있습니다.
- 업로드한 레퍼런스 이미지는 현재 첫 컷 이미지 생성의 기준으로 우선 활용되며, 이후 컷은 `character bible`, `style bible`, 이전 컷 문맥, 컷별 프롬프트로 일관성을 관리합니다.
- 영상은 `deAPI`의 `Ltxv_13B_0_9_8_Distilled_FP8` 모델로 생성합니다.
- Gemini 정책상 직접 생성이 어려운 고유 IP/실존인물은 inspired-by 형태로 완화되도록 설계했습니다.
- 렌더 결과 페이지에서 제목/설명/해시태그를 자동 생성하고, YouTube OAuth가 연결된 채널로 바로 업로드할 수 있습니다.

## 요구 사항

- Node.js 20+
- npm
- Gemini API 키
- Together API 키
- deAPI 키
- Google Cloud OAuth 웹 클라이언트

## 환경 변수

`.env.local`:

```env
GEMINI_API_KEY=AIza...
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_PLOT_MODEL=gemini-2.5-flash
GEMINI_IP_RESEARCH_MODEL=gemini-2.5-flash-lite
GEMINI_PLOT_FORMAT_MODEL=gemini-2.5-flash-lite
TOGETHER_API_KEY=together_...
TOGETHER_BASE_URL=https://api.together.ai/v1
TOGETHER_IMAGE_MODEL=black-forest-labs/FLUX.1-schnell
TOGETHER_REFERENCE_IMAGE_MODEL=black-forest-labs/FLUX.1-kontext-pro
DEAPI_API_KEY=deapi_...
DEAPI_BASE_URL=https://api.deapi.ai/api/v1/client
DEAPI_VIDEO_MODEL=Ltxv_13B_0_9_8_Distilled_FP8
SOCIAL_SESSION_SECRET=replace-with-a-long-random-string
YOUTUBE_CLIENT_ID=google-oauth-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=google-oauth-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/social/youtube/callback
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 구현된 API 라우트

- `POST /api/fancut/plot`
- `POST /api/fancut/images`
- `POST /api/fancut/videos`
- `GET /api/fancut/videos/:videoId`
- `GET /api/fancut/videos/:videoId/content`
- `POST /api/fancut/render`
- `GET /api/social/youtube/auth`
- `GET /api/social/youtube/callback`
- `GET /api/social/youtube/status`
- `POST /api/social/youtube/disconnect`
- `POST /api/social/youtube/upload`
- `POST /api/social/tiktok/mock-upload`

## 현재 제약

- 최종 병합은 번들된 `ffmpeg` 바이너리를 우선 사용하며, 필요하면 `FFMPEG_PATH`로 경로를 덮어쓸 수 있습니다.
- BGM/자막 합성은 현재 MVP 범위 밖입니다.
- `LTX-Video 13B`는 이미지 모델이 아니라 비디오 모델입니다. 현재 앱에서는 영상 생성 단계에 연결되어 있습니다.
- deAPI 비디오 모델은 `request_id` 기반 비동기 큐로 동작합니다.
- Together 이미지 모델은 계정 크레딧이 있어야 호출할 수 있고, 이미지 모델 접근은 Build Tier에 따라 제한될 수 있습니다.
- 기본 모델인 `FLUX.1-schnell`은 실제 크레딧을 사용하는 모델로 보는 편이 안전합니다.
- 레퍼런스 이미지를 실제로 활용하려면 `TOGETHER_REFERENCE_IMAGE_MODEL`에 `kontext` 계열처럼 image-guided를 지원하는 모델을 넣는 편이 좋습니다.
- 현재 일관성 유지는 `character/style bible + prompt lock + neighboring-cut context` 중심이며, 모든 컷에 동일 reference image를 직접 고정하는 방식은 아닙니다.
- 플롯 전 IP 리서치는 Gemini의 Google Search grounding을 사용하므로, 검색 도구 사용분이 추가 과금될 수 있습니다.
- YouTube 업로드는 Google Cloud Console에서 OAuth 웹 클라이언트와 `YOUTUBE_REDIRECT_URI`를 정확히 등록해야 합니다.
- Google의 검증 상태에 따라 업로드된 영상이 기본적으로 비공개 처리될 수 있습니다.
- TikTok은 아직 mock 업로드만 구현되어 있고 실제 게시 API는 연결하지 않았습니다.
