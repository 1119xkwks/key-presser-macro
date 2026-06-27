'use client';

/**
 * @file app/components/SettingsPanel.tsx
 * @description 설정 사이드패널 — 파일 불러오기 · 내려받기 · 초기화 (v2)
 */

import { useState, useRef } from 'react';
import { MacroConfig } from '@/app/types/macro';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentConfig: MacroConfig;
    /** 현재 매크로 실행 중 여부 — 버튼 문구 및 중지 동작에 사용 */
    isRunning: boolean;
    onApplyConfig: (config: MacroConfig) => void;
    onReset: () => void;
}

interface FileState {
    hasFile: boolean;
    fileName: string;
    isValid: boolean;
    errorMsg: string;
}

const REQUIRED_KEYS: (keyof MacroConfig)[] = [
    'targetKey', 'startStopShortcut', 'mode', 'interval', 'useShift',
];

function validateConfig(obj: Record<string, unknown>): MacroConfig | null {
    for (const key of REQUIRED_KEYS) {
        if (!(key in obj)) return null;
    }
    if (obj.mode !== 'HOLD' && obj.mode !== 'PERIODIC') return null;
    if (typeof obj.targetKey !== 'string') return null;
    if (typeof obj.startStopShortcut !== 'string') return null;
    return obj as unknown as MacroConfig;
}

export function SettingsPanel({ isOpen, onClose, currentConfig, isRunning, onApplyConfig, onReset }: Props) {
    const [fileState, setFileState] = useState<FileState>({
        hasFile: false, fileName: '', isValid: false, errorMsg: '',
    });
    const pendingConfig = useRef<MacroConfig | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * @function handleFileChange
     * @description 파일 선택 시 JSON 유효성을 검사합니다.
     */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        pendingConfig.current = null;

        if (!files || files.length !== 1) {
            setFileState({ hasFile: true, fileName: '', isValid: false, errorMsg: '파일을 정확히 1개 선택하세요.' });
            return;
        }

        const file = files[0];
        if (!file.name.toLowerCase().endsWith('.json')) {
            setFileState({ hasFile: true, fileName: file.name, isValid: false, errorMsg: 'JSON(.json) 파일이 아닙니다.' });
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result as string);
                const validated = validateConfig(parsed);
                if (!validated) throw new Error('필수 설정 항목이 누락되었습니다.');
                pendingConfig.current = validated;
                setFileState({ hasFile: true, fileName: file.name, isValid: true, errorMsg: '' });
            } catch (err) {
                setFileState({
                    hasFile: true, fileName: file.name, isValid: false,
                    errorMsg: err instanceof Error ? err.message : 'JSON 파싱 오류',
                });
            }
        };
        reader.readAsText(file);
    };

    /**
     * @function handleApply
     * @description 유효한 설정 파일을 적용합니다.
     * 매크로가 실행 중이면 먼저 중지한 뒤 적용합니다.
     */
    const handleApply = async () => {
        if (!fileState.isValid || !pendingConfig.current) return;
        if (isRunning && window.electronAPI?.stopMacro) {
            await window.electronAPI.stopMacro();
        }
        onApplyConfig(pendingConfig.current);
    };

    /**
     * @function handleDownload
     * @description 현재 설정을 JSON 파일로 내려받습니다.
     */
    const handleDownload = () => {
        const blob = new Blob([JSON.stringify(currentConfig, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'key-presser-macro.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const handleReset = () => {
        pendingConfig.current = null;
        setFileState({ hasFile: false, fileName: '', isValid: false, errorMsg: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
        onReset();
        onClose();
    };

    return (
        <>
            {/* 백드롭 */}
            <div
                className={`settings-backdrop ${isOpen ? 'visible' : ''}`}
                onClick={onClose}
            />

            {/* 사이드패널 */}
            <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
                {/* 헤더 */}
                <div className="settings-panel-header">
                    <span className="settings-panel-title">설정</span>
                    <button className="settings-close-btn" onClick={onClose} aria-label="닫기">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div className="settings-panel-body">
                    {/* 설정 파일 불러오기 */}
                    <section className="settings-section">
                        <span className="settings-section-label">설정 파일 불러오기</span>
                        <p className="settings-section-desc">
                            JSON 설정 파일 <strong>1개</strong>를 선택하세요.
                            파일 형식과 JSON 구문이 유효하면 아래 버튼이 활성화됩니다.
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <button
                            className="settings-file-btn"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 16V4M7 9l5-5 5 5M5 20h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            .json 파일 선택
                        </button>

                        {fileState.hasFile && (
                            <div className={`settings-file-status ${fileState.isValid ? 'valid' : 'invalid'}`}>
                                <span className="settings-file-name">
                                    {fileState.isValid ? '✓' : '✕'} {fileState.fileName}
                                </span>
                                <span className="settings-file-msg">
                                    {fileState.isValid ? '유효한 설정 파일입니다. 적용할 수 있습니다.' : fileState.errorMsg}
                                </span>
                            </div>
                        )}

                        <button
                            className={`settings-apply-btn ${fileState.isValid ? 'active' : ''}`}
                            onClick={handleApply}
                            disabled={!fileState.isValid}
                        >
                            {isRunning ? '중단 후 적용' : '적용'}
                        </button>
                    </section>

                    <div className="settings-divider" />

                    {/* 설정 내보내기 */}
                    <section className="settings-section">
                        <span className="settings-section-label">현재 설정 내보내기</span>
                        <p className="settings-section-desc">
                            현재 설정값을 <strong>key-presser-macro.json</strong> 파일로 저장합니다.
                        </p>
                        <button className="settings-export-btn" onClick={handleDownload}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 4v12M7 11l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            현재 설정 내려받기
                        </button>
                    </section>

                    <div className="settings-divider" />

                    {/* 초기화 */}
                    <section className="settings-section">
                        <span className="settings-section-label">초기화</span>
                        <p className="settings-section-desc">
                            모든 설정을 기본값으로 되돌립니다.
                        </p>
                        <button className="settings-reset-btn" onClick={handleReset}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.7L3 8M3 4v4h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            기본값으로 초기화
                        </button>
                    </section>
                </div>
            </div>
        </>
    );
}
