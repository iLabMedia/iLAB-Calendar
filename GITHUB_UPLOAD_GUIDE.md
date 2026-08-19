# GitHub 업로드 가이드 — iLAB-Calendar

GitHub 저장소:

```text
https://github.com/iLabMedia/iLAB-Calendar
```

프로젝트 폴더:

```text
C:\Users\user\ilab-media-scheduler
```

현재 제가 해둔 것:

- 로컬 Git 저장소 생성 완료
- `main` 브랜치 설정 완료
- GitHub remote 연결 완료
- 첫 커밋 생성 완료
- `.gitignore` 설정 완료

현재 로컬 커밋:

```text
Initial upload: I.LAB MEDIA Scheduler
```

주의: GitHub 인증은 계정 보안 때문에 Poppy님이 직접 승인해야 합니다.

---

## 방법 A. GitHub 웹에서 직접 업로드 — 가장 쉬움

### 1. GitHub 저장소 열기

```text
https://github.com/iLabMedia/iLAB-Calendar
```

### 2. 업로드 버튼 클릭

저장소가 비어 있으면 화면에 아래 문구가 보입니다.

```text
uploading an existing file
```

또는 상단에서:

```text
Add file → Upload files
```

### 3. 프로젝트 폴더 열기

탐색기에서:

```text
C:\Users\user\ilab-media-scheduler
```

### 4. 아래 항목을 업로드

```text
.vscode
public
src
.gitignore
.oxlintrc.json
README.md
GITHUB_UPLOAD_GUIDE.md
VS_CODE_사용법.md
eslint.config.js
index.html
package.json
package-lock.json
run-local.bat
tsconfig.app.json
tsconfig.json
tsconfig.node.json
vite.config.ts
```

### 5. 절대 올리지 말 것

```text
node_modules
dist
.env
*.bak
.git
```

### 6. Commit 메시지

```text
Initial upload: I.LAB MEDIA Scheduler
```

그 다음:

```text
Commit changes
```

---

## 방법 B. VS Code에서 Push — 권장

이미 제가 로컬 Git 커밋과 remote 연결까지 해뒀기 때문에, VS Code에서 로그인만 하면 바로 Push할 수 있습니다.

### 1. VS Code에서 폴더 열기

```text
C:\Users\user\ilab-media-scheduler
```

### 2. 왼쪽 메뉴에서 Source Control 클릭

아이콘 모양:

```text
가지가 갈라진 아이콘
```

### 3. `Publish Branch` 또는 `Sync Changes` 클릭

보이는 버튼은 둘 중 하나일 수 있습니다.

```text
Publish Branch
```

또는

```text
Sync Changes
```

### 4. GitHub 로그인 창이 뜨면 승인

브라우저에서 GitHub 로그인이 뜨면 `Authorize` / `Continue`를 눌러 승인하세요.

### 5. 업로드 완료 확인

다시 저장소로 가서 파일이 보이면 완료입니다.

```text
https://github.com/iLabMedia/iLAB-Calendar
```

---

## 방법 C. 터미널로 Push — 개발자 방식

VS Code 터미널에서:

```bash
cd C:/Users/user/ilab-media-scheduler
git push -u origin main
```

GitHub 로그인/인증 창이 뜨면 승인하면 됩니다.

---

## 업로드 완료 후 다음 단계

업로드가 완료되면 다음은 Vercel입니다.

```text
1. Vercel 접속
2. Add New Project
3. GitHub iLabMedia/iLAB-Calendar Import
4. Deploy
5. 배포 주소 확인
```
