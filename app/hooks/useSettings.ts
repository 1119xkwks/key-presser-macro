/**
 * @file hooks/useSettings.ts
 * @description 설정 영속성 관리 훅 — 3중 저장(파일 · localStorage · cookie) 및 우선순위 로드.
 */

import { useCallback, useRef } from 'react';
import { MacroConfig } from '@/app/types/macro';

const STORAGE_KEY = 'kpm-config';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1년

// ──────────────────────────────────────────────
// 직렬화 / 역직렬화
// ──────────────────────────────────────────────

function serialize(config: MacroConfig): string {
    return JSON.stringify(config);
}

function deserialize(raw: string | null | undefined): MacroConfig | null {
    if (!raw) return null;
    try {
        const o = JSON.parse(raw);
        if (typeof o.targetKey !== 'string') return null;
        if (typeof o.startStopShortcut !== 'string') return null;
        return o as MacroConfig;
    } catch {
        return null;
    }
}

// ──────────────────────────────────────────────
// 저장 헬퍼
// ──────────────────────────────────────────────

function saveToLocalStorage(config: MacroConfig) {
    try { localStorage.setItem(STORAGE_KEY, serialize(config)); } catch { }
}

function saveToCookie(config: MacroConfig) {
    try {
        const encoded = encodeURIComponent(serialize(config));
        document.cookie = `${STORAGE_KEY}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}`;
    } catch { }
}

async function saveToFile(config: MacroConfig): Promise<{ success: boolean; error?: string }> {
    if (!window.electronAPI?.saveConfigToFile) return { success: true };
    try {
        return await window.electronAPI.saveConfigToFile(config);
    } catch {
        return { success: false, error: '파일 저장 중 오류가 발생했습니다.' };
    }
}

// ──────────────────────────────────────────────
// 로드 헬퍼
// ──────────────────────────────────────────────

function loadFromLocalStorage(): MacroConfig | null {
    try { return deserialize(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

function loadFromCookie(): MacroConfig | null {
    try {
        const match = document.cookie.match(new RegExp(`(?:^|; )${STORAGE_KEY}=([^;]*)`));
        return match ? deserialize(decodeURIComponent(match[1])) : null;
    } catch { return null; }
}

// ──────────────────────────────────────────────
// 훅
// ──────────────────────────────────────────────

/**
 * @hook useSettings
 * @description 설정 저장/로드 유틸리티를 반환합니다.
 */
export function useSettings() {
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * @function saveAll
     * @description 설정을 localStorage · cookie · 파일 세 곳에 저장합니다.
     * 파일 저장 실패 시 에러 문자열을 반환합니다.
     */
    const saveAll = useCallback(async (config: MacroConfig): Promise<string | null> => {
        saveToLocalStorage(config);
        saveToCookie(config);
        const result = await saveToFile(config);
        return result.success ? null : (result.error ?? '파일 저장 실패');
    }, []);

    /**
     * @function debouncedSave
     * @description 300ms debounce 후 saveAll을 호출합니다.
     * 파일 저장 실패 콜백을 받습니다.
     */
    const debouncedSave = useCallback((
        config: MacroConfig,
        onFileError?: (err: string) => void,
    ) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            const err = await saveAll(config);
            if (err && onFileError) onFileError(err);
        }, 300);
    }, [saveAll]);

    /**
     * @function loadBestConfig
     * @description localStorage → cookie → 기본값 순으로 가장 먼저 찾은 설정을 반환합니다.
     * 파일 설정은 Electron IPC(initial-config 이벤트)로 별도 수신합니다.
     */
    const loadBestConfig = useCallback((defaults: MacroConfig): MacroConfig => {
        return loadFromLocalStorage() ?? loadFromCookie() ?? defaults;
    }, []);

    return { saveAll, debouncedSave, loadBestConfig };
}
