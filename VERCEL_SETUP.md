# Vercel 배포 설정 가이드

## ⚠️ 중요: Vercel 대시보드에서 Root Directory 설정 필수

프로젝트 구조가 다음과 같기 때문에 **반드시** Vercel 대시보드에서 Root Directory를 설정해야 합니다:

```
ClimateProject/
├── app/          ← Next.js 프로젝트 (여기가 실제 루트)
│   ├── src/
│   ├── package.json
│   └── next.config.ts
├── prd.md
├── skills/
└── ...
```

## Vercel 대시보드 설정 방법 (필수)

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard

2. **프로젝트 선택**
   - `climate-switch` 프로젝트 선택

3. **Settings → General**
   - **Root Directory** 섹션 찾기
   - **"Edit"** 클릭
   - `app` 입력 (또는 `app/` 선택)
   - **"Save"** 클릭

4. **재배포**
   - 자동으로 재배포되거나
   - 수동으로 "Deployments" 탭에서 최신 배포의 "..." 메뉴 → "Redeploy" 클릭

## vercel.json 설정

현재 `vercel.json`은 Root Directory가 `app`으로 설정된 상태를 가정하고 작성되었습니다.

**참고**: `vercel.json`에는 `rootDirectory` 속성을 사용할 수 없습니다. 반드시 Vercel 대시보드에서 설정해야 합니다.

## 확인 방법

배포 후 다음을 확인하세요:
- ✅ 루트 경로(`/`)가 404 에러 없이 로드되는지
- ✅ 빌드 로그에서 `app/` 디렉토리에서 빌드가 실행되는지
- ✅ 배포 로그에 "Building in directory: app" 메시지가 있는지

## 문제 해결

만약 여전히 404 에러가 발생한다면:

1. **Root Directory 설정 확인**
   - Settings → General → Root Directory가 `app`으로 설정되어 있는지 확인

2. **빌드 로그 확인**
   - Deployments → 최신 배포 → Build Logs 확인
   - `app/` 디렉토리에서 빌드가 실행되는지 확인

3. **캐시 클리어**
   - Settings → General → Clear Build Cache 클릭
   - 재배포

4. **수동 재배포**
   - Deployments → 최신 배포 → "..." 메뉴 → "Redeploy"
