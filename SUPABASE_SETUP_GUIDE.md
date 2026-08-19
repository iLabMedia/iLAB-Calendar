# Supabase DB 생성 가이드 — I.LAB Calendar

Vercel 배포 URL:

```text
https://ilab-calendar.vercel.app/
```

GitHub 저장소:

```text
https://github.com/iLabMedia/iLAB-Calendar
```

이제 목표는 현재 브라우저 `localStorage` 저장 방식을 Supabase DB 저장 방식으로 바꾸는 것입니다.

---

## 0. 먼저 알아둘 점

현재 웹앱은 접속은 되지만, 일정 데이터가 아직 각 브라우저에 따로 저장됩니다.

```text
현재: 내 브라우저 안에만 저장
목표: Supabase DB에 저장해서 모두 같은 일정 공유
```

Supabase에서 먼저 DB를 만들고, 그 다음 앱 코드를 DB에 연결합니다.

---

## 1. Supabase 접속

브라우저에서 접속하세요.

```text
https://supabase.com
```

오른쪽 위에서 로그인합니다.

추천:

```text
Continue with GitHub
```

---

## 2. 새 프로젝트 만들기

Supabase 대시보드에서:

```text
New project
```

클릭합니다.

---

## 3. Organization 선택

기존 조직이 있으면 선택하고, 없으면 새로 만듭니다.

예:

```text
iLabMedia
```

---

## 4. Project name 입력

추천 이름:

```text
ilab-calendar
```

또는:

```text
ilab-media-scheduler
```

---

## 5. Database Password 설정

Supabase가 DB 비밀번호를 만들라고 합니다.

중요:

```text
이 비밀번호는 절대 Discord / GitHub / 코드에 올리지 마세요.
```

따로 메모장이나 비밀번호 관리자에 저장하세요.

---

## 6. Region 선택

한국에서 쓸 예정이면 가까운 지역을 고르면 됩니다.

추천 우선순위:

```text
Northeast Asia / Seoul 계열이 있으면 선택
없으면 Tokyo / Singapore 계열 선택
```

정확한 지역명은 Supabase 화면 시점에 따라 조금 다를 수 있습니다.

---

## 7. Create new project 클릭

```text
Create new project
```

클릭합니다.

프로젝트 생성까지 보통 1~3분 정도 걸립니다.

---

## 8. SQL Editor 열기

프로젝트가 생성되면 왼쪽 메뉴에서:

```text
SQL Editor
```

클릭합니다.

그 다음:

```text
New query
```

클릭합니다.

---

## 9. SQL 붙여넣기

제가 만들어둔 SQL 파일 위치:

```text
C:\Users\user\ilab-media-scheduler\supabase\schema.sql
```

VS Code 또는 메모장으로 열어서 전체 복사합니다.

```text
Ctrl + A
Ctrl + C
```

Supabase SQL Editor에 붙여넣습니다.

```text
Ctrl + V
```

그리고 오른쪽 아래 또는 상단의:

```text
Run
```

클릭합니다.

---

## 10. 만들어지는 테이블

SQL을 실행하면 아래 테이블이 생성됩니다.

```text
teams
staff
schedules
slack_channels
slack_logs
```

역할:

```text
teams           팀 정보 / 팀 컬러 / Slack 채널
staff           직원 정보 / 권한 / 소속팀
schedules       팀 일정 / 일반 일정 / 프로젝트 일정
slack_channels  팀별 Slack 채널 매핑
slack_logs      Slack 알림 발송 기록
```

---

## 11. 기본 데이터도 자동 생성됨

아래 팀이 자동 생성됩니다.

```text
미디어팀
경영팀
기획팀
테크팀
```

기본 직원도 생성됩니다.

```text
관리자
미디어
기획
테크
```

주의: 기본 비밀번호는 테스트용입니다. 운영 전에 반드시 바꿔야 합니다.

---

## 12. Table Editor에서 확인

왼쪽 메뉴에서:

```text
Table Editor
```

클릭합니다.

아래 테이블들이 보이면 성공입니다.

```text
teams
staff
schedules
slack_channels
slack_logs
```

먼저 `teams` 테이블을 눌러보세요.

아래 4개가 보이면 정상입니다.

```text
미디어팀
경영팀
기획팀
테크팀
```

---

## 13. Project URL / anon key 확인

다음 코드 연결 단계에서 필요합니다.

왼쪽 하단 또는 상단의:

```text
Project Settings
```

클릭합니다.

그 다음:

```text
API
```

메뉴로 들어갑니다.

확인할 값:

```text
Project URL
anon public key
```

주의:

```text
service_role key는 절대 공개하지 마세요.
```

Vercel 환경변수에는 우선 아래 2개만 넣습니다.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## 14. Vercel 환경변수 등록 위치

Vercel에서 프로젝트로 들어갑니다.

```text
https://vercel.com
```

프로젝트 선택:

```text
iLAB-Calendar
```

메뉴:

```text
Settings → Environment Variables
```

아래 2개를 추가합니다.

```text
VITE_SUPABASE_URL = Supabase Project URL
VITE_SUPABASE_ANON_KEY = Supabase anon public key
```

추가할 때 환경은 보통 전부 체크합니다.

```text
Production
Preview
Development
```

---

## 15. 다음 단계

Supabase DB 생성과 SQL 실행이 끝나면 저에게 이렇게 말해주세요.

```text
Supabase DB 생성 완료
```

그 다음 제가 할 일:

```text
1. React 앱에 @supabase/supabase-js 설치
2. src/lib/supabase.ts 생성
3. localStorage 저장 로직을 Supabase CRUD로 변경
4. Vercel 환경변수 기준으로 빌드되게 수정
5. GitHub에 업로드할 파일 안내
6. Vercel 재배포 확인
```

---

## 보안 메모

현재 SQL에는 빠른 MVP 테스트를 위해 RLS 정책을 넓게 열어둔 부분이 있습니다.

```text
mvp read / mvp write 정책
```

운영 전에 Slack Bot과 Vercel API 구조로 바꾸면서 더 안전하게 잠글 예정입니다.

최종 운영 구조는 이렇게 가는 게 좋습니다.

```text
브라우저 앱
→ Vercel API
→ Supabase DB
→ Slack API
```

Slack Bot Token, service_role key, Webhook URL은 절대 브라우저 코드에 넣지 않습니다.
