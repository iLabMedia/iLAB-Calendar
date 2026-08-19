# VS Code에서 I.LAB MEDIA Scheduler 테스트하기

## 1. VS Code로 프로젝트 열기

1. VS Code 실행
2. 상단 메뉴 `파일` 클릭
3. `폴더 열기...` 클릭
4. 아래 폴더 선택

```text
C:\Users\user\ilab-media-scheduler
```

## 2. 터미널 열기

VS Code 상단 메뉴에서:

```text
터미널 → 새 터미널
```

터미널 아래쪽에 현재 위치가 아래처럼 보이면 정상입니다.

```text
C:\Users\user\ilab-media-scheduler
```

## 3. 처음 한 번만 설치

```bash
npm install
```

## 4. 앱 실행

```bash
npm run dev
```

자동으로 브라우저가 열립니다. 안 열리면 아래 주소를 직접 입력하세요.

```text
http://127.0.0.1:5173/
```

## 5. 수정하면서 확인하기

주로 수정할 파일은 아래 2개입니다.

```text
src/App.tsx   → 화면 문구, 버튼, 기능
src/App.css   → 위치, 크기, 색상, 간격
```

파일을 저장하면 브라우저 화면이 자동으로 바뀝니다. 안 바뀌면 새로고침하세요.

## 6. 오류 검사

```bash
npm run lint
```

## 7. 배포용 빌드 확인

```bash
npm run build
```

## 8. 빌드 결과 미리보기

```bash
npm run preview
```

## 샘플 계정

```text
관리자 / 0000
미디어 / 1111
개발 / 1111
기획 / 1111
```

## VS Code 작업 메뉴로 실행하는 방법

터미널 명령어가 어렵다면:

1. `터미널` 메뉴 클릭
2. `작업 실행...` 클릭
3. `앱 실행: npm run dev` 선택

검사와 빌드도 같은 메뉴에서 실행할 수 있습니다.
