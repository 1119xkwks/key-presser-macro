import { MacroConfig } from '../types/macro';

declare global {
    interface Window {
        electronAPI: {
            updateMacroConfig: (config: MacroConfig) => Promise<{ success: boolean; error?: string }>;
            onMacroStatusChanged: (callback: (isRunning: boolean) => void) => void;
            onUpdateOverlayConfig: (callback: (config: MacroConfig) => void) => void;
        };
    }
}

export { };
