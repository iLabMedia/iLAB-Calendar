# I.LAB MEDIA Scheduler

I.LAB MEDIA 내부 팀 일정 관리를 위한 로컬 PWA 프로토타입입니다.

## 현재 구현 기능

- 직원 로그인 / 자동 로그인
- 월간 캘린더 메인 화면
- 프로젝트 탭: 월간 캘린더 형태에서 프로젝트 기간을 가로 막대바로 표시
- 월간 캘린더에서는 프로젝트 일정 제외
- 일정 등록/수정 탭: 팀 / 일정 / 프로젝트
- 일정 등록의 팀선택: 미디어팀 / 경영팀 / 기획팀 / 테크팀 아이콘 카드 선택 방식
- `개인` 구분 삭제
- 팀 선택 시 해당 팀에 설정된 컬러로 일정 색상 고정
- 일정 탭/프로젝트 탭에서는 첨부 이미지 스타일의 클릭형 컬러 팔레트 사용
- 하루종일 일정: 캘린더에서 컬러가 채워진 막대 형태로 표시
- 시간 선택 일정: 캘린더에서 왼쪽 컬러 점 + 시간 + 일정명 형태로 표시
- 일정 수정 하단 버튼: `[휴지통][저장]` 왼쪽 정렬
- 오늘/주간/팀별/내 일정 보기: 한 줄형 리스트 레이아웃
- 직원 등록/직원 리스트 컬러바 삭제
- 직원 리스트 3열 미니 카드 레이아웃
- 팀 생성/추가 및 팀 리스트에서 팀 컬러 선택 가능
- 직원 포지션: 관리자 / 임직원 / 프리
- 팀 생성 / 팀 리스트 수정 / 팀 삭제
- 직원 등록 / 직원 리스트 수정 / 직원 삭제
- 상단 로고 이미지 업로드 및 제목 수정
- 공휴일/명절 표시: 2026~2027 주요 대한민국 공휴일 샘플 내장
- Slack 알림 설정 UI
- 모바일 홈화면 추가 안내
- PWA manifest / service worker / 아이콘

## 로컬 실행

```bash
cd C:/Users/user/ilab-media-scheduler
npm install
npm run dev
```

브라우저에서 접속:

```text
http://127.0.0.1:5173/
```

## 샘플 계정

- 관리자 / 0000
- 미디어 / 1111
- 개발 / 1111
- 기획 / 1111

## 캘린더 폰트 변경 방법

파일 위치:

```text
src/App.css
```

맨 위쪽의 이 줄을 수정하면 됩니다.

```css
:root {
  --calendar-font: Pretendard, Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

예를 들어 캘린더만 `Noto Sans KR` 느낌으로 바꾸려면:

```css
:root {
  --calendar-font: 'Noto Sans KR', Pretendard, system-ui, sans-serif;
}
```

캘린더 폰트가 적용되는 위치는 아래 줄입니다.

```css
.calendarPanel {
  font-family: var(--calendar-font);
}
```

캘린더 일정 글자 굵기만 바꾸고 싶으면 아래 부분을 수정하면 됩니다.

```css
.eventChip {
  font-weight: 600;
}
```

현재는 기존보다 조금 얇은 `600`으로 설정했습니다. 더 얇게는 `500`, 더 두껍게는 `700`을 사용하면 됩니다.

전체 앱 폰트를 바꾸고 싶으면 `src/index.css`의 `body` 또는 `:root` 폰트를 수정하면 됩니다.

## 빌드 확인

```bash
npm run lint
npm run build
```

## 주의

현재는 로컬 프로토타입이라 일정/직원/팀 데이터가 브라우저 localStorage에 저장됩니다. 여러 직원이 동시에 쓰려면 다음 단계에서 Supabase DB와 Vercel 서버 함수로 이전해야 합니다.
