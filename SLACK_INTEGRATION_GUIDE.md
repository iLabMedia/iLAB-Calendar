# Slack 연동 설정 가이드 — I.LAB MEDIA Scheduler

## 연결 대상

- Slack workspace: `ilabmediahq.slack.com`
- 채널명: `#아이랩일정`
- 채널 ID: `C0BL9PMAA2E`

## 현재 구현 범위

### Phase 1. 앱 → Slack 알림

앱에서 일정/프로젝트 등록, 수정, 삭제, 완료 시 Slack 알림을 보냅니다.

단, 등록/수정창의 체크박스가 켜져 있을 때만 전송됩니다.

```text
#아이랩일정 Slack 알림 보내기
```

현재 기본값은 체크 해제입니다.

### Phase 2. 매일 오전 9시 일정 브리핑

Vercel Cron이 매일 한국시간 오전 9시에 실행됩니다.

```text
/api/slack/daily-brief
```

Vercel Cron 설정:

```json
{
  "crons": [
    {
      "path": "/api/slack/daily-brief",
      "schedule": "0 0 * * *"
    }
  ]
}
```

`0 0 * * *`는 UTC 00:00이고, 한국시간으로 오전 9시입니다.

### Phase 2. Slack에서 일정 조회

Slack Slash Command 예시:

```text
/일정 오늘
/일정 내일
/일정 이번주
/일정 프로젝트
/일정 2026-09-10
```

### Phase 3. Slack에서 쉬운 문장으로 일정 등록/수정

직원들이 복잡한 `ID`, `제목=`, `날짜=` 형식을 외우지 않아도 되도록 자연어형 명령을 지원합니다.

등록:

```text
/일정등록 오늘 박찬우 일정 외근으로 등록해줘
/일정등록 내일 박찬우 일정 휴가로 등록해줘
/일정등록 이번 주 박찬우 일정 사무실로 등록해줘
/일정등록 이번 주 수요일 박찬우 일정 휴가로 등록해줘
```

수정:

```text
/일정수정 오늘 박찬우 일정 사무실로 수정해줘
/일정수정 내일 박찬우 일정 오전반차로 수정해줘
```

오타 보정:

```text
냉리 → 내일
낼 → 내일
```

규칙:

```text
오늘 = 오늘 하루
내일 = 내일 하루
이번 주 = 이번 주 평일 월~금 전체
이번 주 수요일 = 이번 주 수요일 하루
```

고급 사용자는 기존 ID 방식도 계속 사용할 수 있습니다.

```text
/일정 수정 일정ID 제목=출장 날짜=2026-09-11 시간=13:00-15:00
/일정 삭제 일정ID
```

## Slack 메시지 양식

## 앱 일정 수정/삭제 운영 규칙

- 일정 삭제 시에는 먼저 삭제 확인창이 뜬 뒤, Slack 삭제 알림을 보낼지 한 번 더 선택합니다.
- 일주일치처럼 기간으로 등록된 일반 일정은 캘린더의 특정 날짜 일정을 수정하면 해당 날짜만 분리되어 수정됩니다. 기존 앞/뒤 날짜 일정은 보존됩니다.
- 특정 날짜만 삭제할 때도 전체 기간이 삭제되지 않도록 앞/뒤 날짜 일정이 자동 분리됩니다.
- 같은 사람의 같은 날짜 일정은 저장 순서대로 `사무실>외근`, `외근>사무실`, `사무실>외근>연차`처럼 표시됩니다.
- 일정 등록/수정 폼의 `일정 추가 위치`에서 `기존 일정 앞에 추가` 또는 `기존 일정 뒤에 추가`를 선택해 표시 순서를 조정할 수 있습니다.
- 관리자 계정은 일정 등록/수정 시 `담당자 선택`으로 다른 직원 일정을 대신 등록하거나 수정할 수 있습니다.

### 일정/프로젝트 등록·수정 알림

앱 또는 Slack에서 일정이 변경되면 아래처럼 전송됩니다.

```text
✏️ [I.LAB Scheduler] 일정 신규 등록
9월 8일 일정 신규 등록 - [미디어] 박찬우  외근
```

```text
✏️ [I.LAB Scheduler] 일정 수정 등록
9월 10일 일정 수정 등록 - [미디어] 박찬우  사무실
```

```text
✏️ [I.LAB Scheduler] 프로젝트 일정 신규 등록
9월 11일 프로젝트 일정 신규 등록 - 고령1산단 : 행사 내용
```

### 데일리 일정 브리핑

매일 브리핑은 미작성 팀도 함께 보여줍니다.

```text
✏️ [I.LAB Scheduler] 2026-09-04 I.LAB 일정 브리핑

📌 주간이슈
- [연차] 이름
- 미작성

👥 팀일정
- [CEO] 미작성
- [경영] 일정
- [기획] 일정
- [미디어] 일정
- [테크] 일정
- [운영해외사업] 일정

📚  프로젝트 주요 일정
- [주요] 비더비 통대관 : 내용
- [긴급] 고령1산단 공사 및 견적 협의
```

정렬 규칙:

```text
팀일정: 사무실보다 출장/외근/이벤트성 일정이 앞에 표시
이슈: 연차, 반차, 출장, 외근 등 특이 일정 별도 요약
프로젝트: 진행 중인 프로젝트만 표시
```

## Vercel 환경변수

Vercel 프로젝트에서 아래로 이동합니다.

```text
Vercel → iLAB-Calendar 프로젝트 → Settings → Environment Variables
```

필수:

```text
SLACK_BOT_TOKEN = xoxb-... 형태의 Bot User OAuth Token
SLACK_CHANNEL_ID = C0BL9PMAA2E
SUPABASE_URL = Supabase Project URL
SUPABASE_SERVICE_ROLE_KEY = Supabase service_role key
SLACK_SIGNING_SECRET = Slack App Signing Secret
```

선택:

```text
CRON_SECRET = 임의의 긴 비밀번호
```

주의:

```text
SLACK_BOT_TOKEN
SUPABASE_SERVICE_ROLE_KEY
SLACK_SIGNING_SECRET
CRON_SECRET
```

위 값들은 절대 `VITE_`를 붙이지 않습니다. GitHub에도 올리지 않습니다.

## Slack App 권한

Bot Token Scope:

```text
chat:write
commands
```

채널 초대:

```text
/invite @봇이름
```

## Slack Slash Command 설정

Slack API 사이트에서 App 설정으로 이동합니다.

```text
Features → Slash Commands → Create New Command
```

아래 3개 명령을 같은 Request URL로 추가합니다.

```text
Command: /일정
Request URL: https://ilab-calendar.vercel.app/api/slack/commands
Short Description: I.LAB 일정 조회
Usage Hint: 오늘 | 내일 | 이번주 | 프로젝트
```

```text
Command: /일정등록
Request URL: https://ilab-calendar.vercel.app/api/slack/commands
Short Description: I.LAB 일정 등록
Usage Hint: 오늘 박찬우 일정 외근으로 등록해줘
```

```text
Command: /일정수정
Request URL: https://ilab-calendar.vercel.app/api/slack/commands
Short Description: I.LAB 일정 수정
Usage Hint: 내일 박찬우 일정 오전반차로 수정해줘
```

저장 후 앱을 다시 설치 또는 권한 재승인해야 할 수 있습니다.

## 테스트 순서

1. Vercel에 환경변수 추가
2. GitHub 업로드 또는 push
3. Vercel 재배포
4. Slack `#아이랩일정`에서 테스트

```text
/일정 오늘
/일정 내일
/일정 프로젝트
/일정 등록 2026-09-10 박찬우 외근
```

## 운영 추천

처음에는 Slack 등록/수정 기능을 관리자나 운영자만 쓰는 것을 추천합니다.  
직원 전체 사용 전에 아래를 확인하세요.

```text
직원 이름 표기가 앱 DB와 정확히 일치하는지
수정/삭제용 일정 ID가 잘 보이는지
잘못 등록했을 때 앱에서 되돌리기 쉬운지
```

추후 고도화:

```text
Slack Modal 입력창
Slack 사용자 ID ↔ 직원 계정 매핑
등록/수정 승인 워크플로우
```
