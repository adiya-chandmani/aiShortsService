# Vercel 배포 설정 가이드

현재 저장소는 **루트 디렉토리 자체가 Next.js 앱**입니다. `app`을 Root Directory로 지정할 필요가 없습니다.

## Vercel 대시보드 설정

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard

2. **프로젝트 선택**
   - `aiShortsService` 프로젝트 선택

3. **Settings → General**
   - **Root Directory**가 비어 있거나 저장소 루트(`/`)를 가리키는지 확인
   - 예전에 `app`, `app/src`, `app/src/app` 같은 값이 저장돼 있으면 제거

4. **Build & Output Settings**
   - Framework Preset: `Next.js`
   - Build Command: 비워두기 또는 `npm run build`
   - Install Command: 비워두기 또는 `npm install`
   - Output Directory: 비워두기

5. **Clear Build Cache**
   - Settings → General → **Clear Build Cache**

6. **재배포**
   - Deployments에서 최신 배포를 다시 실행

## vercel.json 설정

루트 [vercel.json](/Users/chandmani/Desktop/AISHORT/vercel.json)은 루트 앱 기준으로 맞춰져 있습니다.

## 확인 방법

배포 후 다음을 확인하세요:
- ✅ 빌드 로그에서 루트 `package.json`을 사용했는지
- ✅ `next@16.0.10` 감지가 되는지
- ✅ `/` 경로가 정상적으로 열리는지

## 문제 해결

같은 에러가 계속 나오면 대부분 이전 프로젝트 설정이 남아 있는 경우입니다.

1. **Root Directory 재확인**
   - 반드시 비워두거나 저장소 루트로 설정

2. **Build & Output Settings 초기화**
   - 예전 `cd app && npm run build`
   - 예전 `app/.next`
   - 예전 `app` Root Directory
   - 전부 제거

3. **기존 Vercel 프로젝트 재생성**
   - 가장 빠른 해결책은 이 저장소를 새 프로젝트로 다시 Import 하는 것입니다
   - Import 시 Root Directory는 건드리지 말고 기본값으로 둡니다
