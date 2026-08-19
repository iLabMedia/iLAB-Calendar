# Supabase 앱 연결 가이드 — I.LAB Calendar

Supabase DB 생성과 `schema.sql` 실행이 끝난 뒤 진행하는 단계입니다.

---

## 1. 이번에 코드에 추가된 내용

앱에 Supabase 연결 구조를 추가했습니다.

추가/수정 파일:

```text
src/lib/supabase.ts
src/App.tsx
package.json
package-lock.json
.env.example
```

앱은 이제 환경변수가 있으면 Supabase DB에서 데이터를 불러오고, 없으면 기존처럼 로컬 저장 모드로 동작합니다.

---

## 2. Supabase에서 확인할 값

Supabase 프로젝트 화면에서:

```text
Project Settings → API
```

으로 들어갑니다.

확인할 값은 2개입니다.

```text
Project URL
anon public key
```

주의:

```text
service_role key는 절대 브라우저 앱 / GitHub / Discord에 넣지 마세요.
```

---

## 3. 로컬 테스트용 .env.local 만들기

프로젝트 폴더:

```text
C:\Users\user\ilab-media-scheduler
```

여기에 새 파일을 만듭니다.

```text
.env.local
```

내용은 아래 형식입니다.

```text
VITE_SUPABASE_URL=Supabase Project URL
VITE_SUPABASE_ANON_KEY=Supabase anon public key
```

실제 값은 Poppy님만 넣으세요.

---

## 4. Vercel 환경변수 등록

Vercel 접속:

```text
https://vercel.com
```

프로젝트 선택:

```text
iLAB-Calendar
```

이동:

```text
Settings → Environment Variables
```

추가할 이름:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

환경은 보통 모두 체크합니다.

```text
Production
Preview
Development
```

저장 후 반드시 다시 배포해야 합니다.

```text
Deployments → 최신 배포 오른쪽 ... → Redeploy
```

또는 GitHub에 새 커밋을 올리면 자동 배포됩니다.

---

## 5. GitHub에 올릴 파일

이번 변경분 중 GitHub에 올려야 하는 파일:

```text
src/lib/supabase.ts
src/App.tsx
package.json
package-lock.json
.env.example
SUPABASE_APP_CONNECT_GUIDE.md
supabase/schema.sql
```

절대 올리면 안 되는 파일:

```text
.env.local
.env
```

---

## 6. 연결 성공 확인 방법

Vercel 배포 후 웹앱에 로그인하면 오른쪽 상단 사용자 정보에 아래 문구가 보이면 됩니다.

```text
Supabase DB 연결됨
```

환경변수가 없으면:

```text
로컬 저장 모드
```

환경변수나 RLS 정책에 문제가 있으면:

```text
Supabase 연결 실패 - 로컬 저장 모드
```

로 표시됩니다.

---

## 7. 현재 저장되는 데이터

Supabase에 연결되면 아래 데이터가 DB로 저장됩니다.

```text
팀 생성 / 수정 / 삭제
직원 생성 / 수정 / 삭제
일정 등록 / 수정 / 삭제
프로젝트 등록 / 수정 / 삭제
```

아직 Slack Bot 연동은 다음 단계입니다.

---

## 8. 다음 단계

Supabase 연결 배포까지 완료되면 다음은 Slack입니다.

```text
1. Slack App 생성
2. Bot Token / Signing Secret 설정
3. Vercel API로 Slack 알림 발송
4. 오전 일정 브리핑 자동화
5. Slack 명령어로 일정 등록/수정
```
