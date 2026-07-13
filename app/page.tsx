'use client';

/**
 * @file app/page.tsx
 * @description v2 메인 페이지 — Claude Design 기반.
 * 키보드 SVG 시각화로 Target Key / Shortcut Key를 선택합니다.
 */

import { useState } from 'react';
import { NumericFormat } from 'react-number-format';
import * as Popover from '@radix-ui/react-popover';
import { toast } from 'sonner';
import { useMacro } from '@/app/hooks/useMacro';
import { MacroMode } from '@/app/types/macro';
import { getKeyLabel, isMouseKeyCode } from '@/app/constants/keys';
import { INTERVAL_INPUT_MIN, INTERVAL_INPUT_MAX } from '@/electron/constants';
import { KeyboardLayout } from '@/app/components/KeyboardLayout';
import { SettingsPanel } from '@/app/components/SettingsPanel';

/** 인터벌 안내 문구용 ms 값 #,### 포맷 (예: 3600000 → "3,600,000") */
const formatMs = (ms: number) => ms.toLocaleString('ko-KR');

/**
 * 인터벌 값 기준 랜덤 편차(jitter) 최대 허용치.
 * interval - jitter ≥ 최소 인터벌, interval + jitter ≤ 최대 인터벌을 보장한다.
 */
const getJitterMax = (interval: number) =>
    Math.max(0, Math.min(interval - INTERVAL_INPUT_MIN, INTERVAL_INPUT_MAX - interval));

/** 랜덤 편차 값을 현재 인터벌 기준 허용 범위 [0, jitterMax]로 보정 */
const clampJitter = (jitter: number, interval: number) =>
    Math.min(Math.max(0, jitter), getJitterMax(interval));

/** HOLD + 좌클릭 드래그 위험 toast를 표시합니다. */
function warnHoldLeftClick() {
    toast.warning('HOLD 모드 + 좌클릭 조합 주의', {
        description: '좌클릭을 누른 상태로 마우스를 움직이면 의도치 않은 드래그가 발생할 수 있습니다.',
    });
}

export default function Home() {
    const { config, isRunning, error, updateConfig, resetConfig } = useMacro();
    const [warning, setWarning] = useState<string | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    /** 인터벌 인풋 포커스 여부 — 포커스 중에만 범위 안내 popover를 표시 */
    const [intervalFocused, setIntervalFocused] = useState(false);
    /** 랜덤 편차 인풋 포커스 여부 — 포커스 중에만 범위 안내 popover를 표시 */
    const [jitterFocused, setJitterFocused] = useState(false);

    const isConflict = config.targetKey === config.startStopShortcut;
    /** HOLD 모드 + 좌클릭 Target 조합 여부 — 드래그 오동작 위험 */
    const isHoldLeftClickRisk = config.mode === 'HOLD' && config.targetKey === 'MouseLeft';

    /** Target Key 선택 (SVG 클릭) */
    const handleTargetKeySelect = (code: string) => {
        if (code === config.startStopShortcut) {
            setWarning(`Target Key와 단축키가 동일합니다. 서로 다른 키를 지정하세요.`);
            return;
        }
        setWarning(null);
        updateConfig({ targetKey: code });
        // HOLD 모드에서 좌클릭을 선택하는 순간 드래그 위험 toast 표시
        if (config.mode === 'HOLD' && code === 'MouseLeft') warnHoldLeftClick();
    };

    /** Shortcut Key 선택 (SVG 클릭) */
    const handleShortcutKeySelect = (code: string) => {
        // 마우스 키는 단축키로 사용 불가 (Electron globalShortcut은 키보드 전용) — 방어 가드
        if (isMouseKeyCode(code)) {
            setWarning('마우스 버튼은 시작/중지 단축키로 사용할 수 없습니다. 키보드 키를 지정하세요.');
            return;
        }
        if (code === config.targetKey) {
            setWarning(`단축키와 Target Key가 동일합니다. 서로 다른 키를 지정하세요.`);
            return;
        }
        setWarning(null);
        updateConfig({ startStopShortcut: code });
    };

    /** 시작/중지 토글 */
    const handleToggleRun = () => {
        if (!isRunning && isConflict) return;
        if (window.electronAPI) {
            if (isRunning) window.electronAPI.stopMacro();
            else window.electronAPI.startMacro(config);
        }
    };

    return (
        <div className="v2-app">
            {/* ─── 상단 컨트롤 헤더 ─── */}
            <header className="v2-header">
                <div className="v2-header-controls">
                    {/* 시작/중지 버튼 */}
                    <button
                        className={`v2-run-btn ${isRunning ? 'running' : ''} ${isConflict && !isRunning ? 'disabled' : ''}`}
                        onClick={handleToggleRun}
                        disabled={isConflict && !isRunning}
                    >
                        {isRunning ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="5" width="4" height="14" rx="1" />
                                <rect x="14" y="5" width="4" height="14" rx="1" />
                            </svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7 5l12 7-12 7V5z" />
                            </svg>
                        )}
                        {isRunning ? '중지' : '시작'}
                    </button>

                    <div className="v2-divider" />

                    {/* 상태 뱃지 */}
                    <div className={`v2-status-badge ${isRunning ? 'running' : ''}`}>
                        <span className="v2-status-dot" />
                        <span className="v2-status-text">{isRunning ? 'RUNNING' : 'STOPPED'}</span>
                    </div>

                    <div className="v2-divider" />

                    {/* 입력 모드 */}
                    <span className="v2-label">입력 모드</span>
                    <div className="v2-mode-toggle">
                        {(['HOLD', 'PERIODIC'] as MacroMode[]).map((m) => (
                            <button
                                key={m}
                                className={`v2-mode-btn ${config.mode === m ? 'active' : ''} ${isRunning ? 'locked' : ''}`}
                                onClick={() => {
                                    if (isRunning) return;
                                    updateConfig({ mode: m });
                                    // 좌클릭 Target 상태에서 HOLD로 전환하는 순간 드래그 위험 toast 표시
                                    if (m === 'HOLD' && config.targetKey === 'MouseLeft') warnHoldLeftClick();
                                }}
                            >
                                {m}
                            </button>
                        ))}
                    </div>

                    {/* 인터벌 (PERIODIC 모드) */}
                    {config.mode === 'PERIODIC' && (
                        <>
                            <div className="v2-divider" />
                            <span className="v2-label">인터벌</span>
                            {/* 포커스 중에만 열리는 범위 안내 popover — 포커스 상태로 직접 제어 */}
                            <Popover.Root open={intervalFocused && !isRunning}>
                                <Popover.Anchor asChild>
                                    <span className="v2-interval-anchor">
                                        <NumericFormat
                                            className="v2-interval-input"
                                            value={config.interval}
                                            thousandSeparator=","
                                            allowNegative={false}
                                            decimalScale={0}
                                            disabled={isRunning}
                                            // 최대값 초과는 타이핑 단계에서 차단 (입력 중간값은 항상 최종값 이하이므로 실시간 검사 가능)
                                            isAllowed={({ floatValue }) => floatValue === undefined || floatValue <= INTERVAL_INPUT_MAX}
                                            // 입력 중에는 그대로 반영 — 최소값을 여기서 클램프하면 '3600' 입력 중 '3'이 보정되는 문제가 생긴다
                                            onValueChange={({ floatValue }) => updateConfig({ interval: floatValue ?? 0 })}
                                            onFocus={() => setIntervalFocused(true)}
                                            // 최소값 보정은 포커스가 빠질 때 한 번만 수행 (빈 값도 최소값으로 채워짐)
                                            // 인터벌이 바뀌면 랜덤 편차 허용 범위도 달라지므로 jitter도 함께 보정
                                            onBlur={() => {
                                                setIntervalFocused(false);
                                                const fixed = Math.max(INTERVAL_INPUT_MIN, config.interval);
                                                updateConfig({ interval: fixed, jitter: clampJitter(config.jitter, fixed) });
                                            }}
                                        />
                                    </span>
                                </Popover.Anchor>
                                <Popover.Portal>
                                    <Popover.Content
                                        className={`v2-interval-popover ${config.interval < INTERVAL_INPUT_MIN ? 'below-min' : ''}`}
                                        side="top"
                                        sideOffset={8}
                                        // popover가 인풋의 포커스를 빼앗지 않도록 자동 포커스 차단
                                        onOpenAutoFocus={(e) => e.preventDefault()}
                                        onCloseAutoFocus={(e) => e.preventDefault()}
                                    >
                                        {config.interval < INTERVAL_INPUT_MIN
                                            ? `최소 ${formatMs(INTERVAL_INPUT_MIN)}ms — 포커스 해제 시 자동 보정됩니다`
                                            : `입력 범위: ${formatMs(INTERVAL_INPUT_MIN)} ~ ${formatMs(INTERVAL_INPUT_MAX)} ms`}
                                        <Popover.Arrow className="v2-interval-popover-arrow" />
                                    </Popover.Content>
                                </Popover.Portal>
                            </Popover.Root>
                            <span className="v2-unit">ms</span>

                            <div className="v2-divider" />
                            {/* 랜덤 편차 (jitter) — 매 입력마다 인터벌에 ±jitter 범위의 랜덤 오프셋을 적용 */}
                            <span className="v2-label">랜덤 편차</span>
                            <Popover.Root open={jitterFocused && !isRunning}>
                                <Popover.Anchor asChild>
                                    <span className="v2-interval-anchor">
                                        <NumericFormat
                                            className="v2-jitter-input"
                                            value={config.jitter}
                                            prefix="±"
                                            thousandSeparator=","
                                            allowNegative={false}
                                            decimalScale={0}
                                            disabled={isRunning}
                                            // 허용 최대치(인터벌 기준) 초과는 타이핑 단계에서 차단
                                            isAllowed={({ floatValue }) => floatValue === undefined || floatValue <= getJitterMax(config.interval)}
                                            onValueChange={({ floatValue }) => updateConfig({ jitter: floatValue ?? 0 })}
                                            onFocus={() => setJitterFocused(true)}
                                            // 포커스 해제 시 허용 범위로 최종 보정 (빈 값은 0)
                                            onBlur={() => {
                                                setJitterFocused(false);
                                                updateConfig({ jitter: clampJitter(config.jitter, config.interval) });
                                            }}
                                        />
                                    </span>
                                </Popover.Anchor>
                                <Popover.Portal>
                                    <Popover.Content
                                        className="v2-interval-popover"
                                        side="top"
                                        sideOffset={8}
                                        // popover가 인풋의 포커스를 빼앗지 않도록 자동 포커스 차단
                                        onOpenAutoFocus={(e) => e.preventDefault()}
                                        onCloseAutoFocus={(e) => e.preventDefault()}
                                    >
                                        {`입력 범위: 0 ~ ${formatMs(getJitterMax(config.interval))} ms — 매 입력마다 인터벌에 ±편차 랜덤 적용`}
                                        <Popover.Arrow className="v2-interval-popover-arrow" />
                                    </Popover.Content>
                                </Popover.Portal>
                            </Popover.Root>
                            <span className="v2-unit">ms</span>
                        </>
                    )}

                    <div className="v2-divider" />

                    {/* Shift 조합 */}
                    <label className="v2-shift-toggle" onClick={() => updateConfig({ useShift: !config.useShift })}>
                        <span className={`v2-shift-box ${config.useShift ? 'checked' : ''}`}>
                            {config.useShift && (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 12l5 5 9-11" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </span>
                        <span className="v2-shift-label">Shift 조합</span>
                    </label>
                </div>

                {/* 설정 버튼 */}
                <button className="v2-settings-btn" onClick={() => setSettingsOpen(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M19.4 13a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H11a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V11a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                    설정
                </button>
            </header>

            {/* ─── 메인 스크롤 영역 ─── */}
            <main className="v2-main">
                {/* 충돌 경고 */}
                {(isConflict || warning || error) && (
                    <div className="v2-warning">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke="#dc2626" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{isConflict ? 'Target Key와 단축키가 동일합니다. 서로 다른 키를 지정하세요.' : warning || error}</span>
                    </div>
                )}

                {/* Target Key 카드 */}
                <div className="v2-keyboard-card">
                    <div className="v2-keyboard-card-header">
                        <span className="v2-card-label target">TARGET KEY · 매크로가 누를 키</span>
                        <span className="v2-key-badge target">
                            {getKeyLabel(config.targetKey)}
                            {config.useShift && <span className="v2-shift-hint"> + Shift</span>}
                        </span>
                        {/* HOLD + 좌클릭 조합 상시 위험 안내 */}
                        {isHoldLeftClickRisk && (
                            <span className="v2-hold-mouse-warning">
                                ⚠ HOLD + 좌클릭: 마우스 이동 시 드래그 오동작 위험
                            </span>
                        )}
                        <span className="v2-card-hint">
                            {isRunning ? 'STOP 후 키 변경이 가능합니다' : '마우스로 클릭해 키를 지정'}
                        </span>
                    </div>
                    <KeyboardLayout
                        role="target"
                        targetKey={config.targetKey}
                        shortcutKey={config.startStopShortcut}
                        useShift={config.useShift}
                        isRunning={isRunning}
                        onKeySelect={handleTargetKeySelect}
                    />
                </div>

                {/* Shortcut Key 카드 */}
                <div className="v2-keyboard-card">
                    <div className="v2-keyboard-card-header">
                        <span className="v2-card-label shortcut">START / STOP SHORTCUT · 시작·중지 단축키</span>
                        <span className="v2-key-badge shortcut">{getKeyLabel(config.startStopShortcut)}</span>
                        <span className="v2-card-hint">
                            {isRunning ? 'STOP 후 키 변경이 가능합니다' : '이 키를 누르면 매크로가 토글됩니다'}
                        </span>
                    </div>
                    <KeyboardLayout
                        role="shortcut"
                        targetKey={config.targetKey}
                        shortcutKey={config.startStopShortcut}
                        useShift={config.useShift}
                        isRunning={isRunning}
                        onKeySelect={handleShortcutKeySelect}
                    />
                </div>
            </main>

            {/* ─── 설정 사이드패널 ─── */}
            <SettingsPanel
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                currentConfig={config}
                isRunning={isRunning}
                onApplyConfig={(newConfig) => updateConfig(newConfig)}
                onReset={resetConfig}
            />
        </div>
    );
}
