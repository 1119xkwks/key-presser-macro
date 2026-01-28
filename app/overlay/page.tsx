'use client';

/**
 * @file app/overlay/page.tsx
 * @description 매크로 실행 상태를 보여주는 항상 위에 있는 투명 오버레이 페이지입니다.
 */

import { useState, useEffect } from 'react';
import { MacroConfig } from '@/app/types/macro';
import { TARGET_KEYS, SHORTCUT_KEYS } from '@/app/constants/keys';

export default function OverlayPage() {
    const [config, setConfig] = useState<MacroConfig | null>(null);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.onUpdateOverlayConfig((newConfig: MacroConfig) => {
                console.log('[OVERLAY] Received config:', newConfig);
                setConfig(newConfig);
            });
        }
    }, []);

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
                            <span className="highlight">'{targetLabel}'</span> 키를
                            <span className="highlight"> {config.interval.toLocaleString()}ms</span> 마다 입력 중
                        </p>
                    ) : (
                        <p>
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
