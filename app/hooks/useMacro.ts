/**
 * @file hooks/useMacro.ts
 * @description 매크로 성능 제어 및 상태 관리를 위한 커스텀 훅입니다.
 */

import { useState, useEffect, useCallback } from 'react';
import { MacroConfig } from '../types/macro';

/**
 * @hook useMacro
 * @description Electron 메인 프로세스와 통신하여 매크로 상태를 동기화하고 설정을 업데이트합니다.
 */
export const useMacro = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 초기 설정값
    const [config, setConfig] = useState<MacroConfig>({
        targetKey: 'a',
        mode: 'PERIODIC',
        interval: 100,
        repeatCount: 0,
        startStopShortcut: 'F1',
    });

    /**
     * @function updateConfig
     * @description 설정을 업데이트하고 메인 프로세스에 알립니다.
     */
    const updateConfig = useCallback(async (newConfig: Partial<MacroConfig>) => {
        const updated = { ...config, ...newConfig };
        setConfig(updated);

        if (window.electronAPI) {
            const result = await window.electronAPI.updateMacroConfig(updated);
            if (!result.success) {
                setError(result.error || '설정 업데이트 실패');
            } else {
                setError(null);
            }
        }
    }, [config]);

    // 메인 프로세스로부터 상태 변경 이벤트 수신
    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.onMacroStatusChanged((status: boolean) => {
                setIsRunning(status);
            });
        }
    }, []);

    return {
        config,
        isRunning,
        error,
        updateConfig,
    };
};
