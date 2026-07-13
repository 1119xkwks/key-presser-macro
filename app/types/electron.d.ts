import { MacroConfig } from '@/app/types/macro';

declare global {
    interface Window {
        electronAPI?: {
            /** 매크로 설정을 메인 프로세스에 전달합니다. */
            updateMacroConfig: (config: MacroConfig) => Promise<{ success: boolean; error?: string }>;
            /** 매크로를 시작합니다. */
            startMacro: (config: MacroConfig) => Promise<{ success: boolean }>;
            /** 매크로를 강제 중지합니다. */
            stopMacro: () => Promise<{ success: boolean }>;
            /** 설정을 JSON 파일에 저장합니다. */
            saveConfigToFile: (config: MacroConfig) => Promise<{ success: boolean; error?: string }>;
            /** 앱을 재실행합니다. */
            relaunchApp: () => Promise<void>;
            /** keyboard-korean.svg 내용을 요청합니다. */
            getKeyboardSvg: () => Promise<string>;
            /** 매크로 실행 상태 변경 이벤트를 수신합니다. */
            onMacroStatusChanged: (callback: (isRunning: boolean) => void) => void;
            /** 파일에서 읽어온 초기 설정을 수신합니다. */
            onInitialConfig: (callback: (config: MacroConfig) => void) => void;
            /** 오버레이 전용 설정 업데이트 이벤트를 수신합니다. */
            onUpdateOverlayConfig: (callback: (config: MacroConfig) => void) => void;
            /** PERIODIC 모드에서 다음 입력 예정 시각을 수신합니다. (오버레이 카운트다운 뱃지용) */
            onMacroTick: (callback: (tick: { nextAt: number }) => void) => void;
        };
    }
}

export { };
