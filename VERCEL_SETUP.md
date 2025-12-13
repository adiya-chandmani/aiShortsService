# Vercel 배포 설정 가이드

## 중요: Vercel 대시보드에서 Root Directory 설정 필요

프로젝트 구조가 다음과 같기 때문에 Vercel 대시보드에서 Root Directory를 설정해야 합니다:

```
ClimateProject/
├── app/          ← Next.js 프로젝트 (여기가 실제 루트)
├── prd.md
├── skills/
└── ...
```

## Vercel 대시보드 설정 방법

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard

2. **프로젝트 선택**
   - `climate-switch` 프로젝트 선택

3. **Settings → General**
   - **Root Directory** 섹션 찾기
   - `app` 입력 (또는 `app/` 선택)
   - **Save** 클릭

4. **재배포**
   - 자동으로 재배포되거나
   - 수동으로 "Redeploy" 클릭

## vercel.json 설정

현재 `vercel.json`은 Root Directory가 `app`으로 설정된 상태를 가정하고 작성되었습니다.

만약 Vercel 대시보드에서 Root Directory를 `app`으로 설정하면:
- Build Command: `npm run build` (자동 감지)
- Output Directory: `.next` (자동 감지)
- Install Command: `npm install` (자동 감지)

## 대안: vercel.json 제거

Vercel이 Next.js를 자동으로 감지하도록 하려면 `vercel.json`을 제거하고:
- Vercel 대시보드에서 Root Directory만 `app`으로 설정
- 나머지는 자동 감지

