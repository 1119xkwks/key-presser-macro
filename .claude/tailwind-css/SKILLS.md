# Tailwind CSS @apply 작성 규칙

## 목적

`app/globals.css`의 `.클래스명` 블록 내 스타일을 가능한 한 모두 `@apply` 유틸리티로 작성한다.
Vanilla CSS 속성(`background: #fff;` 등)을 직접 쓰는 것을 지양하고, `@apply` 한 줄로 해결 가능한 것은 모두 `@apply`로 작성한다.

---

## 기본 원칙

1. **`@apply` 우선**: Tailwind 유틸리티로 표현 가능한 모든 속성은 `@apply` 안에 나열한다.
2. **커스텀 값은 arbitrary value**: 프레임워크 기본 스케일에 없는 수치·색상은 `[값]` 형식으로 표기한다.
   - 예: `bg-[#eceef1]`, `h-[38px]`, `rounded-[10px]`, `text-[13px]`
3. **Vanilla CSS는 예외 케이스만**: 아래 "변환 불가 패턴" 목록에 해당할 때만 표준 CSS 속성으로 작성한다.
4. **`@apply`와 표준 CSS 혼용 가능**: 같은 블록 안에서 `@apply` 다음에 변환 불가 속성을 표준 CSS로 추가해도 된다.

---

## 자주 쓰는 변환 매핑표 (Tailwind v4 기준)

| Vanilla CSS | @apply 유틸리티 |
|---|---|
| `background: #ffffff` | `bg-white` |
| `background: #eceef1` | `bg-[#eceef1]` |
| `color: #1c2024` | `text-[#1c2024]` |
| `border: none` | `border-0` |
| `border: 1px solid #e4e7eb` | `border border-[#e4e7eb]` |
| `border-bottom: 1px solid #e4e7eb` | `border-b border-[#e4e7eb]` |
| `border-left: 1px solid #e4e7eb` | `border-l border-[#e4e7eb]` |
| `border-radius: 8px` | `rounded-lg` (8px = lg) |
| `border-radius: 10px` | `rounded-[10px]` |
| `border-radius: 50%` | `rounded-full` |
| `padding: 8px 16px` | `py-2 px-4` |
| `padding: 0 16px` | `px-4 py-0` |
| `padding: 10px 13px` | `py-[10px] px-[13px]` |
| `margin: 0 auto` | `mx-auto` |
| `margin-left: auto` | `ml-auto` |
| `width: 100%` | `w-full` |
| `width: 1px` | `w-px` |
| `height: 38px` | `h-[38px]` |
| `min-width: 38px` | `min-w-[38px]` |
| `min-height: 54px` | `min-h-[54px]` |
| `max-width: 960px` | `max-w-[960px]` |
| `flex: 1` | `flex-1` |
| `flex-shrink: 0` | `shrink-0` |
| `flex-direction: column` | `flex-col` |
| `display: block` | `block` |
| `display: inline-block` | `inline-block` |
| `display: flex` | `flex` |
| `display: inline-flex` | `inline-flex` |
| `gap: 24px` | `gap-6` |
| `gap: 2px` | `gap-0.5` |
| `position: fixed` | `fixed` |
| `position: sticky` | `sticky` |
| `position: relative` | `relative` |
| `inset: 0` | `inset-0` |
| `top: 0` | `top-0` |
| `right: 0` | `right-0` |
| `bottom: 0` | `bottom-0` |
| `z-index: 10` | `z-10` |
| `z-index: 40` | `z-40` |
| `z-index: 50` | `z-50` |
| `overflow-y: auto` | `overflow-y-auto` |
| `overflow: hidden` | `overflow-hidden` |
| `font-size: 10px` | `text-[10px]` |
| `font-size: 12px` | `text-xs` (12px = xs) |
| `font-size: 13px` | `text-[13px]` |
| `font-size: 14px` | `text-sm` (14px = sm) |
| `font-size: 15px` | `text-[15px]` |
| `font-weight: 500` | `font-medium` |
| `font-weight: 600` | `font-semibold` |
| `font-weight: 700` | `font-bold` |
| `font-family: inherit` | `font-[inherit]` |
| `letter-spacing: 0.08em` | `tracking-[0.08em]` |
| `white-space: nowrap` | `whitespace-nowrap` |
| `word-break: break-all` | `break-all` |
| `text-transform: uppercase` | `uppercase` |
| `line-height: 1.6` | `leading-relaxed` |
| `cursor: pointer` | `cursor-pointer` |
| `cursor: not-allowed` | `cursor-not-allowed` |
| `user-select: none` | `select-none` |
| `pointer-events: none` | `pointer-events-none` |
| `pointer-events: auto` | `pointer-events-auto` |
| `opacity: 0` | `opacity-0` |
| `opacity: 1` | `opacity-100` |
| `transition: all 0.12s` | `transition-all duration-[120ms]` |
| `transition: opacity 0.28s` | `transition-opacity duration-[280ms]` |
| `transition: background 0.12s` | `transition-colors duration-[120ms]` |
| `background-clip: content-box` | `bg-clip-content` |

---

## Tailwind v4 arbitrary value 특이사항

- **색상**: 반드시 `#` 포함. `bg-[#ea580c]`, `text-[#6b7480]`
- **RGBA**: `bg-[rgba(17,24,39,0.38)]` — 쉼표 없이 공백 대신 쉼표 사용 (v4는 쉼표 허용)
- **calc**: `w-[calc(100%-2rem)]`
- **CSS 변수**: `bg-[var(--color-brand)]`

---

## 변환 불가(표준 CSS 직접 작성) 패턴

아래 속성들은 `@apply`로 작성하기 어렵거나 가독성이 크게 떨어지므로 표준 CSS로 작성한다.

| 속성 | 이유 |
|---|---|
| `box-shadow: 0 1px 3px rgba(...), 0 ...` (다중 레이어) | arbitrary 문자열 내 쉼표가 유틸리티 구분자와 충돌 가능 |
| `transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)` | cubic-bezier 값 내 쉼표 문제 |
| `animation: name 0.75s ease-in-out infinite` | 커스텀 keyframe 참조 — `@apply animate-[...]` 가독성 저하 |
| `@keyframes ...` 정의 블록 | `@apply` 대상 아님 |
| `::-webkit-scrollbar` 블록 | 가상 요소 선택자 — `@apply` 미지원 |
| `background-clip: content-box` + `border: 2px solid transparent` 조합 | 조합 의미가 명확하지 않아 표준 CSS 선호 |
| `font-family: 'Noto Sans KR', 'Segoe UI', ...` (긴 fallback 체인) | 긴 arbitrary 값보다 직접 작성이 명확 |
| `line-height: 28px` (고정 px) | `leading-[28px]` 가능하나 숫자의 의미가 높이와 같을 때 표준 CSS 선호 |

> **단일 box-shadow** (레이어 1개)는 `shadow-[0_3px_10px_rgba(234,88,12,0.3)]` 형식으로 작성 가능하다.
> RGBA 내 쉼표는 유지하고, 공백만 `_`로 치환한다.

---

## 작성 예시

### 잘못된 예시 (vanilla CSS 혼용)
```css
.v2-header {
    @apply flex items-center justify-between flex-wrap gap-3;
    background: #ffffff;
    border-bottom: 1px solid #e4e7eb;
    padding: 8px 16px;
    min-height: 54px;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 10;
}
```

### 잘된 예시 (@apply 최대화)
```css
.v2-header {
    @apply flex items-center justify-between flex-wrap gap-3
           bg-white border-b border-[#e4e7eb]
           py-2 px-4 min-h-[54px]
           shrink-0 sticky top-0 z-10;
}
```

---

## 이 프로젝트 주요 브랜드 색상 (arbitrary value로 사용)

| 의미 | 색상 코드 | 예시 |
|---|---|---|
| 앱 배경 | `#eceef1` | `bg-[#eceef1]` |
| Target (오렌지) | `#ea580c` | `bg-[#ea580c]`, `text-[#ea580c]`, `border-[#ea580c]` |
| Shortcut (파랑) | `#2563eb` | `bg-[#2563eb]` |
| 기본 텍스트 | `#1c2024` | `text-[#1c2024]` |
| 서브 텍스트 | `#6b7480` | `text-[#6b7480]` |
| 흐린 텍스트 | `#9aa1ab` | `text-[#9aa1ab]` |
| 흰 배경 | `#ffffff` | `bg-white` |
| 패널 배경 | `#fafbfc` | `bg-[#fafbfc]` |
| 기본 테두리 | `#e4e7eb` | `border-[#e4e7eb]` |

---

## 허용 픽셀 단위 규칙

폰트 크기와 버튼·레이아웃 높이는 아래 단위로만 사용한다. **소수점·홀수 값은 사용하지 않는다.**

| 범위 | 허용 단위 |
|---|---|
| 폰트 크기 | 10px, 12px, 14px, 16px, 20px, 24px |
| 버튼·뱃지 높이 | 28px, 32px, 36px, 40px, 44px, 48px |
| 패널·헤더 높이 | 52px, 56px, 60px, 64px … (짝수) |

### 변환 기준
- 중간값은 **디자인 의도에 맞는 가까운 허용값**으로 선택한다.
- 12.5px, 10.5px → 소수점이므로 내림: 12px, 10px
- 13px → 12px(text-xs) 또는 14px(text-sm) 중 선택. 일반 버튼·UI 텍스트는 14px 우선.
- 15px → 16px (text-base)
- 38px, 39px → 36px 또는 40px (가까운 쪽)
- 42px, 43px → 40px 또는 44px (가까운 쪽)
- 54px → 56px (min-h-14)

### Tailwind 단위 매핑 (규칙 기준)
| px | Tailwind 클래스 |
|---|---|
| 10px | `text-[10px]` |
| 12px | `text-xs` / `h-3` |
| 14px | `text-sm` |
| 16px | `text-base` / `h-4` |
| 20px | `text-xl` / `h-5` / `w-5` |
| 24px | `text-2xl` / `h-6` / `w-6` / `gap-6` |
| 28px | `h-[28px]` / `w-[28px]` |
| 32px | `h-8` / `w-8` |
| 36px | `h-9` / `w-9` |
| 40px | `h-10` / `w-10` |
| 44px | `h-11` / `w-11` |
| 48px | `h-12` / `w-12` |
| 52px | `h-[52px]` |
| 56px | `h-14` / `min-h-14` |

---

## border-radius 짝수 우선 규칙

`border-radius`(rounded-*)도 짝수 px 값으로만 사용한다.

| 허용 값 | Tailwind 클래스 |
|---|---|
| 4px | `rounded` |
| 6px | `rounded-md` |
| 8px | `rounded-lg` |
| 10px | `rounded-[10px]` |
| 12px | `rounded-xl` |
| 14px | `rounded-[14px]` |
| 16px | `rounded-2xl` |
| 9999px (원형) | `rounded-full` |

- 홀수 값(7px, 9px, 11px 등)은 가까운 짝수로 올림 또는 내림.
  - 7px → `rounded-lg` (8px)
  - 9px → `rounded-[10px]` (10px)

---

## 작업 절차 (globals.css 수정 시)

1. 수정 대상 클래스 블록을 읽는다.
2. 각 속성을 위 매핑표에서 찾아 `@apply` 유틸리티로 변환한다.
3. 변환 불가 패턴만 표준 CSS로 남긴다.
4. `@apply` 한 줄이 너무 길면 줄 바꿈(`\n           `)으로 정렬해 가독성을 확보한다.
5. hover / 상태 클래스(`.active`, `.running` 등)도 동일하게 변환한다.
