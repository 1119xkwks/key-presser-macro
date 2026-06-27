'use client';

/**
 * @file app/page.tsx
 * @description v2 메인 페이지 — Claude Design 기반.
 * 키보드 SVG 시각화로 Target Key / Shortcut Key를 선택합니다.
 */

import { useState } from 'react';
import { useMacro } from '@/app/hooks/useMacro';
import { MacroMode } from '@/app/types/macro';
import { getKeyLabel } from '@/app/constants/keys';
import { KeyboardLayout } from '@/app/components/KeyboardLayout';
import { SettingsPanel } from '@/app/components/SettingsPanel';

export default function Home() {
    const { config, isRunning, error, updateConfig, resetConfig } = useMacro();
    const [warning, setWarning] = useState<string | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const isConflict = config.targetKey === config.startStopShortcut;

    /** Target Key 선택 (SVG 클릭) */
    const handleTargetKeySelect = (code: string) => {
        if (code === config.startStopShortcut) {
            setWarning(`Target Key와 단축키가 동일합니다. 서로 다른 키를 지정하세요.`);
            return;
        }
        setWarning(null);
        updateConfig({ targetKey: code });
    };

    /** Shortcut Key 선택 (SVG 클릭) */
    const handleShortcutKeySelect = (code: string) => {
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
                                onClick={() => { if (!isRunning) updateConfig({ mode: m }); }}
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
                            <input
                                className="v2-interval-input"
                                type="number"
                                min={20}
                                value={config.interval}
                                onChange={(e) => updateConfig({ interval: Math.max(20, Number(e.target.value)) })}
                            />
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
