/**
 * @file hooks/useMacro.ts
 * @description 매크로 상태 관리 및 설정 영속성 훅 (v2)
 */

import { useState, useEffect, useCallback, useEffectEvent } from 'react';
import { MacroConfig } from '@/app/types/macro';
import { useSettings } from '@/app/hooks/useSettings';

const DEFAULT_CONFIG: MacroConfig = {
    targetKey: 'KeyW',
    mode: 'HOLD',
    interval: 100,
    jitter: 0,
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

    // useEffect 내부 setter 직접 호출 금지 컨벤션 — useEffectEvent로 우회 (CLAUDE.md 참고)
    const updateConfigState = useEffectEvent((_v: MacroConfig) => setConfig(_v));
    const updateIsRunning = useEffectEvent((_v: boolean) => setIsRunning(_v));

    // 클라이언트 마운트 후 저장된 설정 복원 및 IPC 초기화
    useEffect(() => {
        // ① localStorage / cookie에서 저장된 설정 복원
        // 이전 버전 저장분에는 jitter 등 신규 필드가 없을 수 있으므로 기본값과 병합
        const restored = { ...DEFAULT_CONFIG, ...loadBestConfig(DEFAULT_CONFIG) };
        updateConfigState(restored);

        if (!window.electronAPI) return;

        // ② 파일 설정(가장 높은 우선순위) — Electron이 did-finish-load 후 전달
        window.electronAPI.onInitialConfig((saved: MacroConfig) => {
            // 파일 설정 역시 구버전일 수 있으므로 기본값과 병합하여 신규 필드를 채운다
            const merged = { ...DEFAULT_CONFIG, ...saved };
            updateConfigState(merged);
            window.electronAPI!.updateMacroConfig(merged);
        });

        // ③ 매크로 실행 상태 변경 수신
        window.electronAPI.onMacroStatusChanged((status: boolean) => {
            updateIsRunning(status);
        });

        // ④ 복원된 설정으로 단축키 등록
        window.electronAPI.updateMacroConfig(restored);
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
