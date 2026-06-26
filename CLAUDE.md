# CLAUDE.md — key-presser-macro 프로젝트 규칙

## 언어 및 커뮤니케이션

- **언어**: 모든 대화와 설명은 항상 **한국어**로 진행한다.
- **문서화**: 프로젝트 내의 주요 문서화 작업이나 주석(필요 시)은 한국어를 우선한다.
- **경로 별칭**: 파일을 임포트할 때 상대 경로(`../`, `./`) 대신 `@/` 경로 별칭을 우선적으로 사용한다. (예: `@/app/components/...`)

## 스타일링 및 프레임워크

- **주요 스타일링**: **Vanilla CSS**와 **Tailwind CSS**를 함께 사용한다. (SCSS 지양)
- **관심사 분리 (Separation of Concerns)**:
  - `.tsx` 파일의 `className` 속성에는 유틸리티 클래스를 나열하는 대신, 의미 있는 **태그 영역 이름(Semantic Class Name)**을 부여한다. (예: `className="status-card"`)
  - 모든 구체적인 스타일 지정은 `app/globals.css` 파일 내에서 해당 클래스 명칭을 선택자로 사용하고, 그 안에서 `@apply` 지시어를 사용하여 Tailwind 유틸리티를 적용한다.
- **Tailwind 구성**:
  - `app/globals.css` 상단에 `@import "tailwindcss";`를 포함한다. (v4 기준)
  - 복잡한 CSS 속성(예: 다중 파라미터 shadow, filter 등)은 `@apply` 대신 표준 CSS 속성을 사용하여 호환성을 확보한다.

## 코드 품질 및 정리

- 새로운 기능이나 페이지를 설정할 때, 기본 Next.js 보일러플레이트 코드(샘플 이미지, 기본 CSS 등)는 즉시 정리한다.
- 모든 커스텀 애니메이션은 재사용성을 위해 전역 CSS 파일의 `@layer base` 등에 정의한다.
- 코드 작성 시 JSDoc과 라인 주석을 상세히 작성하여 가독성을 높인다.

## 에셋 및 리소스

- **아이콘/Favicon**: 프로그램 아이콘, favicon, 윈도우 타이틀 아이콘은 모두 `docs/icons/icon.png`를 사용한다.
- **폰트 — 전체 페이지**: **Noto Sans KR**을 사용한다. 폰트 파일은 `public/fonts/Noto_Sans_KR/`에 위치한다.
- **폰트 — 키보드 SVG**: **JetBrains Mono** (우선) + **Noto Sans KR** (한글 fallback) 조합을 사용한다. 폰트 파일은 `public/fonts/JetBrains_Mono/`에 위치한다. 두 폰트 모두 `font-weight: 500`을 기본으로 한다.

## v2 디자인 개편

- **디자인 시안**: v2 UI 개편은 Claude Code Design으로 작업 및 export된 `docs/claude-code-design/key-presser-mecro-v2/`의 디자인 시안을 기반으로 구현한다.

### 키보드 SVG 시각화

- **SVG 소스**: `docs/inline_svgs/keyboard-korean.svg`를 기반으로 inline SVG로 렌더링한다.
- **키 선택 방식**: v1의 AutoSelect 검색 드롭다운을 **완전히 제거**하고, SVG 키보드 클릭으로만 키를 선택한다.
- **인터랙티브 동작**: 키 상태에 따라 SVG 위에서 하이라이트(음영 처리)를 적용한다.
  - 기본: 회색 키 배경
  - hover: 밝아짐 + pointer 커서
  - Target Key 선택: 오렌지(`#D97757`) 채움 + 흰 라벨
  - Shortcut Key 선택: 파란 채움
  - Shift 활성: Shift 키에 오렌지 하이라이트 추가
  - 매크로 실행 중: Target Key에 pulse 애니메이션

### 오버레이 (개편 대상 아님)

- `app/overlay/page.tsx` 및 관련 Electron 오버레이 창 로직은 **v2 개편 대상이 아니다.**
- 현재 v1의 상태, 기능, 디자인을 그대로 유지한다. 손대지 않는다.

### 윈도우 타이틀바

- **커스텀 타이틀바를 사용하지 않는다.** Windows 기본 타이틀바를 그대로 유지한다 (`frame: true`).
- 앱 아이콘(`BrowserWindow`의 `icon` 옵션)과 윈도우 제목(`title` 옵션)만 설정한다.
