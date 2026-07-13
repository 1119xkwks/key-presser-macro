'use client';

/**
 * @file app/overlay/page.tsx
 * @description 매크로 실행 상태를 보여주는 항상 위에 있는 투명 오버레이 페이지입니다.
 */

import { useState, useEffect } from 'react';
import { MacroConfig } from '@/app/types/macro';
import { TARGET_KEYS, SHORTCUT_KEYS } from '@/app/constants/keys';

/**
 * 남은 초를 카운트다운 문자열로 변환합니다.
 * 1분 미만은 "#s", 1분 이상은 "mm:ss", 1시간 이상이면 "HH:mm:ss"로 확장합니다.
 * @param totalSec 남은 시간 (초)
 */
function formatCountdown(totalSec: number): string {
    if (totalSec < 60) return `${totalSec}s`;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return h > 0 ? `${String(h).padStart(2, '0')}:${mmss}` : mmss;
}

export default function OverlayPage() {
    const [config, setConfig] = useState<MacroConfig | null>(null);
    /** 다음 키 입력 예정 시각 (epoch ms). 메인 프로세스의 macro-tick으로 갱신되며, null이면 뱃지를 숨긴다. */
    const [nextAt, setNextAt] = useState<number | null>(null);
    /** 다음 입력까지 남은 시간 (초, 올림) */
    const [remainingSec, setRemainingSec] = useState(0);

    useEffect(() => {
        // Electron transparent 창에서 html/body 배경이 흰색으로 보이는 것을 방지
        document.documentElement.style.background = 'transparent';
        document.body.style.background = 'transparent';
    }, []);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.onUpdateOverlayConfig((newConfig: MacroConfig) => {
                console.log('[OVERLAY] Received config:', newConfig);
                setConfig(newConfig);
                // 새 실행이 시작되면 이전 실행의 카운트다운 잔상을 제거
                // (인터벌이 짧아 tick이 오지 않는 실행에서도 뱃지가 남지 않도록)
                setNextAt(null);
            });
            window.electronAPI.onMacroTick(({ nextAt: at }) => setNextAt(at));
        }
    }, []);

    // macro-tick으로 받은 기준 시각(nextAt)까지 남은 초를 주기적으로 재계산.
    // 1초보다 촘촘한 250ms 주기로 돌려 초 경계에서 표시가 늦게 바뀌는 현상을 방지한다.
    useEffect(() => {
        if (nextAt === null) return;
        const update = () => setRemainingSec(Math.max(0, Math.ceil((nextAt - Date.now()) / 1000)));
        update();
        const timer = setInterval(update, 250);
        return () => clearInterval(timer);
    }, [nextAt]);

    const handleStopClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[OVERLAY] STOP button clicked');
        if (window.electronAPI) {
            await window.electronAPI.stopMacro();
        }
    };

    if (!config) return null;

    const targetLabel = TARGET_KEYS.find(k => k.value === config.targetKey)?.label || config.targetKey;
    const shortcutLabel = SHORTCUT_KEYS.find(k => k.value === config.startStopShortcut)?.label || config.startStopShortcut;

    return (
        <div className="overlay-container">
            <div className="overlay-content">
                <div className="overlay-status">
                    <div className="overlay-spinner" />
                    <span className="overlay-dot active" />
                    <span className="overlay-title">MACRO RUNNING</span>
                </div>

                <div className="overlay-message">
                    {config.mode === 'PERIODIC' ? (
                        <p>
                            {config.useShift && <><span className="highlight">'Shift'</span> + </>}
                            <span className="highlight">'{targetLabel}'</span> 키를
                            <span className="highlight"> {config.interval.toLocaleString()}ms</span> 마다 입력 중
                            {/* 다음 입력까지 남은 시간 뱃지 — 인터벌 4초 이상일 때만 메인 프로세스가 tick을 보내므로 nextAt 유무로 판단 */}
                            {nextAt !== null && (
                                <span className="overlay-countdown-badge">in {formatCountdown(remainingSec)}</span>
                            )}
                        </p>
                    ) : (
                        <p>
                            {config.useShift && <><span className="highlight">'Shift'</span> + </>}
                            <span className="highlight">'{targetLabel}'</span> 키를
                            지속 누름 중
                        </p>
                    )}
                </div>

                <div className="overlay-footer">
                    <p className="sub-text">
                        <span className="key-hint">{shortcutLabel}</span> 키 또는 아래 버튼을 눌러 중단하세요
                    </p>
                    <button
                        className="overlay-stop-btn"
                        onMouseDown={handleStopClick}
                        onClick={handleStopClick}
                    >
                        STOP (매크로 중단)
                    </button>
                </div>
            </div>
        </div>
    );
}
