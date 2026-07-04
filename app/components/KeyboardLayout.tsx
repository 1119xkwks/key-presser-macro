'use client';

/**
 * @file app/components/KeyboardLayout.tsx
 * @description 인터랙티브 한국어 키보드 SVG 컴포넌트 (v2).
 * SVG data-key 클릭으로 키를 선택하며, 선택 상태에 따라 키를 하이라이트합니다.
 */

import { useEffect, useRef, useCallback } from 'react';
import { MOUSE_KEY_CODES, isMouseKeyCode } from '@/app/constants/keys';

/** 하이라이트 색상 */
const TARGET_COLOR = '#ea580c';  // 오렌지
const SHORTCUT_COLOR = '#2563eb'; // 파란색

interface Props {
    /** 현재 Target Key (Web code) */
    targetKey: string;
    /** 현재 Shortcut Key (Web code) */
    shortcutKey: string;
    /** Shift 조합 활성 여부 */
    useShift: boolean;
    /** 매크로 실행 중 여부 */
    isRunning: boolean;
    /** 클릭 시 호출되는 콜백 */
    onKeySelect: (code: string) => void;
    /** 'target' | 'shortcut' — 이 키보드가 어느 역할 담당인지 */
    role: 'target' | 'shortcut';
}

/**
 * @description hex 색상을 rgba 문자열로 변환합니다.
 */
function hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * @description SVG 내부 텍스트 요소 중 특정 키 path 위에 위치하는 것들을 흰색으로 바꿉니다.
 */
function whitenTextsOverKey(
    svgEl: SVGSVGElement,
    keyPath: SVGPathElement,
    store: { el: SVGElement; origFill: string; origOpacity: string }[],
) {
    const kb = keyPath.getBoundingClientRect();
    svgEl.querySelectorAll<SVGElement>('text').forEach((t) => {
        const r = t.getBoundingClientRect();
        if (!r.width) return;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        if (cx >= kb.left && cx <= kb.right && cy >= kb.top && cy <= kb.bottom) {
            store.push({
                el: t,
                origFill: t.style.fill || '',
                origOpacity: t.style.fillOpacity || '',
            });
            t.style.fill = '#ffffff';
            t.style.fillOpacity = '1';
        }
    });
}

/**
 * @description 저장된 텍스트 색상을 원래대로 복원합니다.
 */
function restoreTexts(store: { el: SVGElement; origFill: string; origOpacity: string }[]) {
    store.forEach(({ el, origFill, origOpacity }) => {
        el.style.fill = origFill;
        el.style.fillOpacity = origOpacity;
    });
    store.length = 0;
}

export function KeyboardLayout({
    targetKey, shortcutKey, useShift, isRunning, onKeySelect, role,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    /** 현재 흰색으로 바꾼 텍스트 목록 */
    const whiteTexts = useRef<{ el: SVGElement; origFill: string; origOpacity: string }[]>([]);
    /** SVG 로드 완료 여부 */
    const svgLoaded = useRef(false);

    // ── SVG paint 함수 ──────────────────────────
    const paint = useCallback(() => {
        const host = containerRef.current;
        if (!host || !svgLoaded.current) return;
        const svgEl = host.querySelector<SVGSVGElement>('svg');
        if (!svgEl) return;

        // 모든 키 초기화 (isRunning이면 커서를 not-allowed로)
        svgEl.querySelectorAll<SVGPathElement>('path[data-key]').forEach((p) => {
            p.style.fill = 'none';
            p.style.stroke = '#231f20';
            p.style.animation = '';
            p.style.cursor = isRunning ? 'not-allowed' : 'pointer';
        });

        // Shortcut 역할에서는 마우스 키를 disabled 처리 (회색 채움 + not-allowed 커서)
        if (role === 'shortcut') {
            MOUSE_KEY_CODES.forEach((c) => {
                const p = svgEl.querySelector<SVGPathElement>(`path[data-key="${c}"]`);
                if (p) {
                    p.style.fill = 'rgba(0,0,0,0.07)';
                    p.style.cursor = 'not-allowed';
                }
            });
        }

        // 텍스트 복원
        restoreTexts(whiteTexts.current);

        const selectedCode = role === 'target' ? targetKey : shortcutKey;
        const color = role === 'target' ? TARGET_COLOR : SHORTCUT_COLOR;

        if (role === 'target' && useShift) {
            ['ShiftLeft', 'ShiftRight'].forEach((c) => {
                const p = svgEl.querySelector<SVGPathElement>(`path[data-key="${c}"]`);
                if (p) {
                    p.style.fill = hexToRgba(TARGET_COLOR, 0.28);
                    p.style.stroke = TARGET_COLOR;
                }
            });
        }

        // 선택된 키 하이라이트
        const keyPath = svgEl.querySelector<SVGPathElement>(`path[data-key="${CSS.escape(selectedCode)}"]`);
        if (keyPath) {
            keyPath.style.fill = color;
            keyPath.style.stroke = color;
            if (role === 'target' && isRunning) {
                keyPath.style.animation = 'kp-pulse 0.75s ease-in-out infinite';
            }
            whitenTextsOverKey(svgEl, keyPath, whiteTexts.current);
        }
    }, [role, targetKey, shortcutKey, useShift, isRunning]);

    // ── SVG 로드 ─────────────────────────────────
    useEffect(() => {
        const host = containerRef.current;
        if (!host) return;

        const loadSvg = async () => {
            let svgText = '';

            if (window.electronAPI?.getKeyboardSvg) {
                // Electron 환경: IPC로 가져오기
                svgText = await window.electronAPI.getKeyboardSvg();
            } else {
                // 브라우저 개발 환경 fallback
                try {
                    const res = await fetch('./keyboard-korean-with-mouse-key.svg');
                    svgText = await res.text();
                } catch { /* SVG 없이 빈 상태로 유지 */ }
            }

            if (!svgText) return;

            // metadata 태그 제거 (SVG 파일 불필요 메타)
            svgText = svgText.replace(/<metadata>[\s\S]*?<\/metadata>/, '');

            host.innerHTML = svgText;
            const svgEl = host.querySelector<SVGSVGElement>('svg');
            if (!svgEl) return;

            // SVG 반응형 설정
            svgEl.style.width = '100%';
            svgEl.style.height = 'auto';
            svgEl.style.display = 'block';
            svgEl.style.userSelect = 'none';

            // 키 pointer-events 및 스타일 설정
            svgEl.querySelectorAll<SVGPathElement>('path[data-key]').forEach((p) => {
                p.style.cursor = 'pointer';
                p.style.transition = 'fill 0.1s, stroke 0.1s';
                p.style.pointerEvents = 'all';
            });

            // 텍스트 스타일 덮어쓰기 — 인라인 font-family(Ubuntu 등) 무력화 + 클릭 차단
            const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            styleEl.textContent = [
                "text, tspan {",
                "  pointer-events: none;",
                "  font-family: 'JetBrains Mono', 'Noto Sans KR', 'Segoe UI', system-ui, sans-serif !important;",
                "  font-weight: 500 !important;",
                "}",
            ].join('\n');
            svgEl.appendChild(styleEl);

            svgLoaded.current = true;
            paint();
        };

        loadSvg();
    // paint는 의존성에 포함하면 무한루프 → 초기 로드 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── 상태 변경 시 repaint ──────────────────────
    useEffect(() => {
        paint();
    }, [paint]);

    // ── 마우스 이벤트 ─────────────────────────────
    useEffect(() => {
        const host = containerRef.current;
        if (!host) return;

        const color = role === 'target' ? TARGET_COLOR : SHORTCUT_COLOR;

        const handlePointerDown = (e: PointerEvent) => {
            // running 중에는 키 선택 차단
            if (isRunning) return;
            const el = (e.target as Element).closest<SVGPathElement>('path[data-key]');
            if (!el) return;
            const code = el.getAttribute('data-key') ?? '';
            // Shortcut 역할에서는 마우스 키 선택 불가 (globalShortcut은 키보드 전용)
            if (role === 'shortcut' && isMouseKeyCode(code)) return;
            onKeySelect(code);
        };

        const handlePointerOver = (e: PointerEvent) => {
            const el = (e.target as Element).closest<SVGPathElement>('path[data-key]');
            if (!el) return;
            const code = el.getAttribute('data-key') ?? '';
            // Shortcut 역할의 마우스 키는 disabled — hover 하이라이트 없음
            if (role === 'shortcut' && isMouseKeyCode(code)) {
                el.style.cursor = 'not-allowed';
                return;
            }
            // running 중에는 hover 하이라이트 없이 커서만 not-allowed
            if (isRunning) {
                el.style.cursor = 'not-allowed';
                return;
            }
            const selected = role === 'target' ? targetKey : shortcutKey;
            if (code === selected) return;
            el.dataset.hovered = '1';
            el.style.fill = hexToRgba(color, 0.16);
        };

        const handlePointerOut = (e: PointerEvent) => {
            const el = (e.target as Element).closest<SVGPathElement>('path[data-key]');
            if (!el || !el.dataset.hovered) return;
            delete el.dataset.hovered;
            paint();
        };

        host.addEventListener('pointerdown', handlePointerDown);
        host.addEventListener('pointerover', handlePointerOver);
        host.addEventListener('pointerout', handlePointerOut);

        return () => {
            host.removeEventListener('pointerdown', handlePointerDown);
            host.removeEventListener('pointerover', handlePointerOver);
            host.removeEventListener('pointerout', handlePointerOut);
        };
    }, [role, targetKey, shortcutKey, isRunning, onKeySelect, paint]);

    return <div ref={containerRef} className={`keyboard-svg-host role-${role}`} />;
}
