# Slack 연동 설정 가이드 — I.LAB MEDIA Scheduler

이 문서는 Phase 1 `캘린더 앱 → Slack #아이랩일정 알림` 설정 방법입니다.

## 연결 대상

- Slack workspace: `ilabmediahq.slack.com`
- 채널명: `#아이랩일정`
- 채널 ID: `C0BL9PMAA2E`

## 이번 Phase 1 기능

앱에서 아래 동작이 발생하면 Slack 채널로 알림을 보냅니다.

- 일정 등록
- 일정 수정
- 일정 삭제
- 프로젝트 등록
- 프로젝트 수정
- 프로젝트 삭제
- 프로젝트 완료

일정/프로젝트 등록창에서 아래 체크박스를 끄면 해당 저장 건은 Slack 알림을 보내지 않습니다.

```text
#아이랩일정 Slack 알림 보내기
```

## 중요한 보안 원칙

아래 값은 절대 `src/App.tsx`, `.env.example`, GitHub 파일, Discord 채팅에 넣지 않습니다.

```text
Slack Bot Token
Slack Signing Secret
Webhook URL
Supabase service_role key
```

Slack Bot Token은 Vercel 환경변수에만 넣습니다.

## Slack App 권한

기존 Slack AI Bot/App을 사용할 경우, 해당 Slack App에 아래 Bot Token Scope가 필요합니다.

```text
chat:write
```

비공개 채널이면 추가로 봇을 채널에 초대해야 합니다.

Slack에서 `#아이랩일정` 채널에 입력:

```text
/invite @봇이름
```

## Vercel 환경변수 설정

Vercel 프로젝트에서 아래로 이동합니다.

```text
Vercel → iLAB-Calendar 프로젝트 → Settings → Environment Variables
```

아래 2개를 추가합니다.

```text
SLACK_BOT_TOKEN = xoxb-... 형태의 Bot User OAuth Token
SLACK_CHANNEL_ID = C0BL9PMAA2E
```

주의:

```text
SLACK_BOT_TOKEN 앞에 VITE_를 붙이면 안 됩니다.
```

프론트에서 읽을 수 있으면 안 되는 값입니다.

## 재배포

환경변수를 넣은 뒤 Vercel에서 재배포합니다.

```text
Deployments → 최신 배포 선택 → Redeploy
```

## 성공 확인 방법

1. 앱 접속
2. 일정 등록 또는 프로젝트 등록
3. 등록창의 체크박스 확인

```text
#아이랩일정 Slack 알림 보내기
```

4. 저장
5. Slack `#아이랩일정` 채널에 메시지 도착 확인

예상 메시지:

```text
[I.LAB Scheduler] 일정 등록
• 제목: 사무실
• 팀: 미디어팀
• 담당: 박찬우
• 기간/시간: 2026-09-01 하루종일
```

## 토큰이 아직 없을 때 동작

`SLACK_BOT_TOKEN`이 없으면 앱 저장은 정상 처리되고, Slack 알림만 건너뜁니다.

앱에는 다음 안내가 표시됩니다.

```text
일정은 저장됐습니다. Slack 토큰 설정 후 알림이 전송됩니다.
```

## 다음 단계

### Phase 2. Slack에서 일정 조회

예정 기능:

```text
/오늘일정
/이번주일정
/프로젝트
/일정조회 2026-09-01
```

필요 값:

```text
SLACK_SIGNING_SECRET
SUPABASE_SERVICE_ROLE_KEY 또는 안전한 조회 전용 서버 키 설계
```

### Phase 3. Slack에서 일정 등록

예정 기능:

```text
/일정등록
/프로젝트등록
```

Slack Modal을 열어 날짜, 팀, 담당자, 제목, 시간, 메모를 입력하고 Supabase에 저장합니다.
