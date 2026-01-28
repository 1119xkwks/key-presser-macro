import { MacroConfig } from '../types/macro';

declare global {
    interface Window {
        electronAPI: {
            updateMacroConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
            stopMacro: () => Promise<void>;
            onMacroStatusChanged: (callback: (isRunning: boolean) => void) => void;
            onUpdateOverlayConfig: (callback: (config: MacroConfig) => void) => void;
        };
    }
}

export { };
