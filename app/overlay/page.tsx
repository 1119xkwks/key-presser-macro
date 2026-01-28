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
                setConfig(newConfig);
            });
        }
    }, []);

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
                            <span className="highlight"> {config.interval.toLocaleString()}ms</span> 마다
                            주기적으로 입력 중
                        </p>
                    ) : (
                        <p>
                            <span className="highlight">'{targetLabel}'</span> 키를
                            지속 누름 중
                        </p>
                    )}
                    <p className="sub-text">
                        멈추려면 <span className="key-hint">{shortcutLabel}</span> 키를 누르세요
                    </p>
                </div>
            </div>
        </div>
    );
}
