# Key Presser Macro — 기능 명세

> **버전**: v1 (완성) / v2 (개편 진행 중 — 아래 [Version 2 개편](#version-2-개편) 참조)

## 기술 스택

- **프레임워크**: Electron + Next.js (TypeScript)
- **렌더러**: React (Next.js App Router)
- **키 입력 엔진**: PowerShell + Win32 `keybd_event` API (C# interop)
- **스타일링**: Tailwind CSS v4 + Vanilla CSS (`globals.css` 중앙 관리)

## 에셋

| 에셋 | 경로 | 용도 |
|------|------|------|
| 앱 아이콘 | `docs/icons/icon.png` | Electron 창 아이콘 (`BrowserWindow.icon`), 태스크바 아이콘, 브라우저 favicon, 빌드 시 프로그램 아이콘 |
| 키보드 SVG 템플릿 | `docs/inline_svgs/` | v2 키보드 시각화 구현 참고용 (풀사이즈 레이아웃 SVG 파일 포함) |
| 한국어 폰트 | `docs/fonts/Noto_Sans_KR/` | UI 한국어 텍스트 렌더링 |

> `docs/icons/icon.png`는 `electron/icon.png`와 동일한 파일이다. 빌드 설정 및 `app/layout.tsx` favicon 경로 모두 이 파일을 단일 소스로 참조한다.

---

## 주요 기능

### 1. 매크로 키 입력

**파일**: `electron/main.js` — `sendKeyLowLevel()`, `initPowerShell()`

앱 시작 시 PowerShell 프로세스를 미리 spawn하여 상주시킨다. C# `Add-Type`으로 `Win32Input` 클래스를 로드하고, `keybd_event` WinAPI를 직접 호출하여 OS 수준의 저수준 키 입력을 전송한다. `MapVirtualKey`로 스캔 코드를 계산하여 확장 키(방향키, Insert/Delete 등)도 정확히 처리한다.

**지원 키 범위** (`app/constants/keys.ts`):

| 분류 | 키 목록 |
|------|---------|
| 알파벳 | A–Z |
| 숫자 | 0–9 |
| 기능키 | F1–F12 |
| 특수키 | Enter, Space, Escape, Backspace, Tab, Insert, Delete, Home, End, Page Up, Page Down |
| 방향키 | Arrow Up/Down/Left/Right |
| 제어키 | Caps Lock, Num Lock, Scroll Lock, Print Screen |
| 기호 | `+` (Plus) |
| 마우스 | 좌클릭(MouseLeft), 휠클릭(MouseMiddle), 우클릭(MouseRight) — Target 전용 |

**마우스 클릭 지원**: `mouse_event` WinAPI로 좌·휠·우클릭을 Target Key로 전송할 수 있다 (`sendMouseLowLevel()`, `sendMouseWithShift()`). 클릭은 현재 커서 위치에서 발생하며 HOLD/PERIODIC/Shift 조합 모두 지원한다. 단, `globalShortcut`이 키보드 전용이므로 마우스 버튼은 Start/Stop 단축키로 사용할 수 없다 (Shortcut 키보드 SVG에서는 disabled 표시). HOLD+좌클릭 조합은 드래그 오동작 위험이 있어 UI에 상시 경고와 toast를 표시한다.

---

### 2. 입력 모드

**파일**: `electron/main.js` — `startMacro()` / `app/page.tsx` — 모드 토글 UI

#### PERIODIC (주기적 입력)
- 설정한 인터벌(ms)마다 `SendKeys`(KeyDown → 15ms → KeyUp) 사이클을 반복한다.
- 최소 인터벌: 20ms (하드 클램프).
- UI에서 인터벌(ms) 직접 입력 가능.

#### HOLD (지속 누름)
- `KeyDown` 신호만 계속 전송하여 키를 누른 상태를 유지한다.
- 메모장, 게임 등에서 키 반복 입력이 필요한 경우에 사용.
- 중지 시 `KeyUp` 신호를 전송하여 키를 확실히 뗀다.

---

### 3. Shift 조합 옵션

**파일**: `electron/main.js` — `startMacro()`, `stopMacro()` / `app/page.tsx` — 체크박스 UI

`useShift` 옵션 활성화 시 대상 키와 함께 Shift를 누른다(`shift+<targetKey>`). 중지 시 Shift를 개별로도 추가 해제하여 Shift 고착 현상을 방지한다.

단축키가 Shift 조합과 충돌할 경우 `Shift+<단축키>`도 폴백으로 함께 등록한다.

---

### 4. Start / Stop 단축키

**파일**: `electron/main.js` — `ipcMain.handle('update-macro-config')` / `app/constants/keys.ts` — `SHORTCUT_KEYS`

Electron `globalShortcut`으로 시스템 전역 단축키를 등록한다. 단축키를 누를 때마다 실행 중이면 중지, 중지 상태면 시작하는 토글 동작을 한다.

**지원 단축키 형식**: 단일 키(F1–F12, Delete 등), `Ctrl+`, `Alt+`, `CommandOrControl+` 조합키.

**충돌 방지**: 대상 키와 단축키가 동일하면 UI에서 경고를 표시하고 적용을 막는다 (`app/page.tsx` — `handleConfigChange()`).

---

### 5. 실행 중 오버레이

**파일**: `electron/main.js` — `initOverlayWindow()`, `startMacro()`, `stopMacro()` / `app/overlay/page.tsx`

매크로가 시작되면 화면 좌상단에 투명 프레임리스 오버레이 창을 표시한다.

**오버레이 특성**:
- `alwaysOnTop: true` + `setAlwaysOnTop('screen-saver', level 1)` — 풀스크린 앱 위에도 표시된다.
- `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` — 모든 가상 데스크탑에 표시.
- 1초마다 `setAlwaysOnTop` 재호출하여 다른 앱에 의해 덮이지 않도록 강화 (`topMostReinforcer`).
- 매크로 중지 시 자동으로 숨긴다.

**오버레이 표시 정보**:
- `PERIODIC` 모드: `'Shift' + '<키>' 키를 <N>ms 마다 입력 중`
- `HOLD` 모드: `'Shift' + '<키>' 키를 지속 누름 중`
- 중지 방법(단축키 힌트) 안내 텍스트

---

### 6. 오버레이 STOP 버튼 클릭으로 중지

**파일**: `app/overlay/page.tsx` — `handleStopClick()` / `electron/preload.js` — `stopMacro` IPC

오버레이에 `STOP (매크로 중단)` 버튼이 표시되며, 클릭 시 IPC(`stop-macro`)를 통해 메인 프로세스에 중지 명령을 전송한다. `onMouseDown` + `onClick` 양쪽에 핸들러를 등록하여 클릭 인식률을 높인다.

---

### 7. 키 검색 AutoSelect 컴포넌트 *(v1 전용 — v2에서 제거)*

**파일**: `app/components/AutoSelect.tsx`

대상 키와 단축키 선택을 위한 퍼지 검색 기반 커스텀 드롭다운 컴포넌트. **v2에서 완전히 제거되며 키보드 inline SVG 시각화로 대체된다.**

- 입력창에 텍스트를 입력하면 라벨 기준으로 필터링된 목록만 표시.
- 검색어가 비어있으면 목록을 열지 않는다.
- 특수키(F1–F12, 방향키, Delete 등)는 실제 키 입력으로도 검색 가능 (`onKeyDown` 처리).
- 퍼지 매칭 알고리즘으로 부분 일치도 검색 가능.

---

### 8. 싱글 인스턴스 보장

**파일**: `electron/main.js` — `app.requestSingleInstanceLock()`

앱 중복 실행 방지. 이미 실행 중이면 두 번째 인스턴스를 즉시 종료하고, 기존 창을 포커스한다.

---

### 9. 좀비 프로세스 완전 제거 보장

**파일**: `electron/main.js` — `killZombies()`, `cleanupResources()`

#### 시작 시 (`killZombies()`)
- 앱 실행 시점에 `taskkill /f /fi "pid ne <현재PID>" /im "<앱이름>"` 명령으로 이전에 비정상 종료된 동명 프로세스를 강제 제거한다.
- 배포 환경(`!isDev`)에서만 동작하여 개발 중 오작동을 방지한다.

#### 종료 시 (`cleanupResources()`)
- `stopMacro()` 호출 → 진행 중인 매크로 루프(`setTimeout`) 취소 및 키 UP 신호 전송.
- PowerShell 프로세스를 `taskkill /pid <PID> /t /f`로 **프로세스 트리 전체** 강제 종료.
- `globalShortcut.unregisterAll()`로 전역 단축키 모두 해제.

#### 종료 이벤트 삼중 보장
- `window.on('closed')` → 창 닫힘 시 정리
- `app.on('before-quit')` → 앱 종료 전 정리
- `app.on('will-quit')` → 최종 정리

---

## 아키텍처 흐름

```
[React UI] ──IPC──► [Electron Main]
                         │
                         ├── globalShortcut (Start/Stop 단축키)
                         ├── BrowserWindow (오버레이 창 제어)
                         └── PowerShell stdin ──► keybd_event (Win32 API)
```

- UI 설정 변경 → `window.electronAPI.updateMacroConfig()` (IPC) → 단축키 재등록
- 단축키 또는 오버레이 STOP 클릭 → `startMacro()` / `stopMacro()` → 상태를 React UI와 오버레이 양쪽에 동기화

---

---

## Version 2 개편

> v1의 기능을 모두 유지하면서 아래 세 가지를 새로 추가·교체한다.

---

### V2-1. 디자인 시스템 개편: Antigravity → Claude Design

**대상 파일**: `app/globals.css`, `app/page.tsx`, `app/overlay/page.tsx`, `app/layout.tsx`

v1은 어두운 배경 위 글로우 효과 중심의 "Antigravity" 스타일이었다면, v2는 **Claude Design** 기반으로 전면 교체한다.

**Claude Design 특성**:

| 항목 | 방향 |
|------|------|
| 색상 팔레트 | Claude 브랜드 컬러 (`#D97757` 오렌지, `#F5F0EB` 아이보리, `#1A1A1A` 다크) 중심 |
| 타이포그래피 | 기하학적 산세리프. 헤더는 높은 폰트 웨이트, 본문은 가독성 우선 |
| 레이아웃 | 여백 충분히. 카드 기반 섹션 구분. 둥근 모서리(`border-radius`) |
| 상태 표시 | 글로우 제거 → 명확한 색상 전환(STOPPED: 중성, RUNNING: 오렌지 강조) |
| 오버레이 | 반투명 블러 패널(`backdrop-filter: blur`) + 오렌지 STOP 버튼 |
| 애니메이션 | 파티클·글로우 제거 → 간결한 fade/scale 트랜지션만 유지 |

**CLAUDE.md 규칙 준수**:
- `.tsx`에는 시맨틱 클래스명만 (`status-card`, `keyboard-layout` 등)
- 모든 스타일 구현은 `globals.css` 내 `@apply` 또는 표준 CSS 속성으로

---

### V2-2. 풀사이즈 키보드 SVG 시각화

**신규 파일**: `app/components/KeyboardLayout.tsx`  
**대상 파일**: `app/page.tsx`, `app/globals.css`

v1의 AutoSelect(텍스트 드롭다운) 및 관련 input UI를 **완전히 제거**하고 **인터랙티브 키보드 레이아웃**으로 대체한다. 키 선택은 오직 SVG 키보드 클릭으로만 이루어지며, 선택된 키는 SVG 위에서 시각적으로 강조 표시된다.

#### 레이아웃 구성

풀사이즈(104키) 키보드를 inline SVG로 렌더링한다. 행(row) 기반 배열을 데이터로 정의하여 SVG `<rect>` + `<text>`로 각 키를 그린다.

```
┌─────────────────────────────────────────────────────────┐
│ [Esc]  [F1][F2][F3][F4]  [F5][F6][F7][F8]  [F9]...    │  ← 기능키 행
├─────────────────────────────────────────────────────────┤
│ [`][1][2]...[0][-][=][Backspace]   [Ins][Home][PgUp]   │  ← 숫자 행
│ [Tab][Q][W]...[P][[][]][\]         [Del][End][PgDn]    │  ← Q 행
│ [CapsLk][A][S]...[;]['][Enter]                          │  ← A 행
│ [Shift][Z][X]...[/][Shift]              [Up]            │  ← Z 행
│ [Ctrl][Win][Alt][______Space______][Alt][Fn][Ctrl] ←↓→  │  ← 스페이스 행
└─────────────────────────────────────────────────────────┘
```

#### 인터랙션 동작

| 상태 | 시각 효과 |
|------|-----------|
| 기본 | 회색 키 배경 |
| hover | 밝아짐 + 커서 pointer |
| **선택됨 (Target Key)** | 오렌지(`#D97757`) 채움 + 흰 라벨 |
| **선택됨 (Shortcut Key)** | 파란 채움 (Claude accent) |
| **Shift 활성** | Shift 키에 오렌지 하이라이트 추가 |
| **매크로 실행 중** | Target Key가 펄스(pulse) 애니메이션 |

- 키를 클릭하면 Target Key로 선택된다.
- 클릭한 키가 곧 선택값. 별도 input/드롭다운 없음.
- SVG `viewBox`로 반응형 처리. 창 너비에 따라 키보드가 스케일된다.

#### 데이터 구조 (예시)

```ts
// app/components/KeyboardLayout.tsx
interface KeyDef {
  label: string;       // 표시 텍스트
  value: string;       // MacroConfig.targetKey 값
  x: number;           // SVG x 좌표 (단위: key-unit)
  w: number;           // 키 너비 (기본 1 = 1u)
}
type KeyRow = KeyDef[];
```

---

### V2-3. 설정 저장 및 불러오기 시스템

**신규 파일**: `app/hooks/useSettings.ts`, `app/components/SettingsPanel.tsx`, `electron/ipc/settings.js`  
**대상 파일**: `electron/main.js`, `electron/preload.js`, `app/hooks/useMacro.ts`

앱을 재시작해도 마지막 설정이 유지되며, 설정 파일을 내보내고 불러올 수 있는 관리 시스템.

---

#### 설정 파일 스펙

파일명은 `key-presser-macro.json`으로 고정한다.

```jsonc
// key-presser-macro.json 구조
{
  "targetKey": " ",
  "mode": "HOLD",
  "interval": 100,
  "repeatCount": 0,
  "startStopShortcut": "Delete",
  "useShift": false
}
```

---

#### 기능 1 — 설정 변경 시 즉각 저장 (3중 저장)

사용자가 UI에서 설정을 변경할 때마다 debounce 300ms 후 아래 세 곳에 동시 저장한다.

| 저장소 | 방법 | 비고 |
|--------|------|------|
| `localStorage` | `localStorage.setItem('kpm-config', JSON.stringify(config))` | 렌더러 프로세스에서 직접 |
| `cookie` | `document.cookie = 'kpm-config=...; path=/; max-age=...'` | JSON을 URL 인코딩하여 저장 |
| 프로그램 디렉터리 설정파일 | IPC → `main.js` → `fs.writeFileSync(<exeDir>/key-presser-macro.json)` | 실행파일(.exe) 위치 기준 |

**저장 실패 처리**:
- 파일 저장(`fs.writeFileSync`) 실패 시 IPC로 렌더러에 에러를 전달한다.
- 렌더러는 모달 팝업으로 저장 실패를 안내한다.
- 매크로가 실행 중(`isRunning === true`)이면 저장 실패와 동시에 매크로를 자동 중지한다.

---

#### 기능 2 — 설정 파일 불러오기 (파일 선택 → 적용)

UI에 "설정 파일 불러오기" 영역을 제공한다.

**흐름**:

```
① 파일 선택 버튼 클릭
      └─► <input type="file" accept=".json"> 트리거
② 파일 선택됨
      └─► 파일 수 유효성 검사: 파일이 정확히 1개인지 확인
          ├─ 실패 → "파일을 1개만 선택해 주세요" 안내, 적용 버튼 비활성 유지
          └─ 성공 → JSON 파싱 & 필드 유효성 검사
                  ├─ 실패 → "올바른 설정 파일이 아닙니다" 안내, 적용 버튼 비활성 유지
                  └─ 성공 → "설정 적용" 버튼 활성화
③ "설정 적용" 버튼 클릭
      └─► 파싱된 config를 현재 설정으로 적용 (3중 저장 실행)
          └─► 프로그램 재실행 (app.relaunch() + app.quit() — IPC 경유)
```

- 파일 선택 후 다시 다른 파일로 바꾸면 유효성 재검사를 처음부터 수행한다.
- 재실행 전 현재 매크로 실행 중이면 자동 중지 후 재실행한다.

---

#### 기능 3 — 현재 설정 파일 다운로드

"설정 내려받기" 버튼 클릭 시 현재 `config`를 `key-presser-macro.json`으로 브라우저 다운로드한다.

```ts
// 렌더러에서 직접 처리 (IPC 불필요)
const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'key-presser-macro.json';
a.click();
URL.revokeObjectURL(url);
```

---

#### 기능 4 — 프로그램 로드 시 설정 우선순위

앱 초기화 시 아래 순서로 설정을 탐색하여, **가장 먼저 발견된 유효한 설정**을 적용한다.

```
① 프로그램 디렉터리의 key-presser-macro.json  (main.js — fs.existsSync)
      ↓ 없거나 파싱 실패
② localStorage['kpm-config']                   (렌더러 — 앱 마운트 시점)
      ↓ 없거나 파싱 실패
③ cookie['kpm-config']                         (렌더러 — 앱 마운트 시점)
      ↓ 없거나 파싱 실패
④ 코드 기본값                                   (useMacro.ts 초기 config 상수)
```

- `①`은 main.js 기동 시점에 읽어 IPC로 렌더러에 전달한다.
- `②③④`는 렌더러(`useSettings.ts`) 마운트 시점에 결정한다. `①`에서 값을 받았으면 `②③`을 건너뛴다.
- 각 단계에서 JSON 파싱 오류가 나면 조용히 다음 단계로 넘어간다 (사용자에게 알리지 않음).

---

#### UI 구성 (SettingsPanel 컴포넌트)

설정 패널 하단에 별도 섹션으로 배치한다.

```
┌─────────────────────────────────────┐
│  설정 파일                           │
│                                     │
│  [📁 설정 파일 선택]  선택된 파일 없음  │
│                                     │
│  [✅ 설정 적용 후 재실행] ← 유효성 통과 시 활성화 │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [⬇ 현재 설정 내려받기]              │
│                                     │
│  [↺ 기본값으로 초기화]               │
└─────────────────────────────────────┘
```

- "기본값으로 초기화": 코드 기본값으로 리셋 후 3중 저장.

---

## v1 → v2 변경 요약

| 항목 | v1 | v2 |
|------|----|----|
| 디자인 시스템 | Antigravity (글로우, 다크) | Claude Design (오렌지, 아이보리, 블러) |
| 키 선택 UI | AutoSelect 드롭다운 | 키보드 inline SVG 시각화로 완전 대체 (AutoSelect 제거) |
| 설정 지속성 | 앱 재시작 시 초기화 | `key-presser-macro.json` + localStorage + cookie 3중 저장·복원 |
| 설정 파일 관리 | 없음 | 파일 선택→유효성→적용 후 재실행 / 현재 설정 다운로드 |
| 마우스 클릭 | 없음 | 좌·휠·우클릭 Target Key 지원 (현재 커서 위치, 단축키로는 불가) |
| 나머지 기능 | — | v1과 동일 유지 |
