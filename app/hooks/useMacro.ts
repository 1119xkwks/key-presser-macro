/**
 * @file hooks/useMacro.ts
 * @description 매크로 상태 관리 및 설정 영속성 훅 (v2)
 */

import { useState, useEffect, useCallback } from 'react';
import { MacroConfig } from '@/app/types/macro';
import { useSettings } from '@/app/hooks/useSettings';

const DEFAULT_CONFIG: MacroConfig = {
    targetKey: 'KeyW',
    mode: 'HOLD',
    interval: 100,
    repeatCount: 0,
    startStopShortcut: 'PageDown',
    useShift: false,
};

/**
 * @hook useMacro
 * @description Electron IPC와 통신하며 매크로 상태·설정을 관리합니다.
 * 설정 변경 시 3중 저장을 수행합니다.
 */
export const useMacro = () => {
    const { debouncedSave, loadBestConfig } = useSettings();
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // SSR/클라이언트 hydration mismatch 방지: 초기값은 항상 DEFAULT_CONFIG로 고정
    const [config, setConfig] = useState<MacroConfig>(DEFAULT_CONFIG);

    // 클라이언트 마운트 후 저장된 설정 복원 및 IPC 초기화
    useEffect(() => {
        // ① localStorage / cookie에서 저장된 설정 복원
        const restored = loadBestConfig(DEFAULT_CONFIG);
        setConfig(restored);

        if (!window.electronAPI) return;

        // ② 파일 설정(가장 높은 우선순위) — Electron이 did-finish-load 후 전달
        window.electronAPI.onInitialConfig((saved: MacroConfig) => {
            setConfig(saved);
            window.electronAPI!.updateMacroConfig(saved);
        });

        // ③ 매크로 실행 상태 변경 수신
        window.electronAPI.onMacroStatusChanged((status: boolean) => {
            setIsRunning(status);
        });

        // ④ 복원된 설정으로 단축키 등록
        window.electronAPI.updateMacroConfig(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * @function updateConfig
     * @description 설정을 업데이트하고, IPC 및 3중 저장을 수행합니다.
     */
    const updateConfig = useCallback(async (newPartial: Partial<MacroConfig>) => {
        const updated = { ...config, ...newPartial };
        setConfig(updated);

        if (window.electronAPI) {
            const result = await window.electronAPI.updateMacroConfig(updated);
            if (!result.success) {
                setError(result.error || '설정 업데이트 실패');
            } else {
                setError(null);
            }
        }

        debouncedSave(updated, (err) => setError(err));
    }, [config, debouncedSave]);

    /**
     * @function resetConfig
     * @description 설정을 기본값으로 초기화합니다.
     */
    const resetConfig = useCallback(async () => {
        await updateConfig(DEFAULT_CONFIG);
    }, [updateConfig]);

    return { config, isRunning, error, updateConfig, resetConfig, DEFAULT_CONFIG };
};
