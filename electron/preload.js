/**
 * @file electron/preload.js
 * @description 렌더러와 메인 프로세스 간 안전한 통신을 위한 Preload 스크립트 (v2)
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    /** 매크로 설정을 메인 프로세스에 전달하고 단축키를 등록합니다. */
    updateMacroConfig: (config) => ipcRenderer.invoke('update-macro-config', config),

    /** 매크로를 시작합니다. */
    startMacro: (config) => ipcRenderer.invoke('start-macro', config),
    /** 매크로를 강제 중지합니다. */
    stopMacro: () => ipcRenderer.invoke('stop-macro'),

    /** 설정을 실행파일 옆 JSON 파일에 저장합니다. */
    saveConfigToFile: (config) => ipcRenderer.invoke('save-config-to-file', config),

    /** 앱을 재실행합니다. */
    relaunchApp: () => ipcRenderer.invoke('relaunch-app'),

    /** keyboard-korean.svg 내용을 요청합니다. */
    getKeyboardSvg: () => ipcRenderer.invoke('get-keyboard-svg'),

    /** 매크로 실행 상태 변경 이벤트를 수신합니다. */
    onMacroStatusChanged: (callback) =>
        ipcRenderer.on('macro-status-changed', (_event, value) => callback(value)),

    /** 파일에서 읽어 온 초기 설정을 수신합니다. */
    onInitialConfig: (callback) =>
        ipcRenderer.on('initial-config', (_event, config) => callback(config)),

    /** 오버레이 창 전용 설정 업데이트 이벤트를 수신합니다. */
    onUpdateOverlayConfig: (callback) =>
        ipcRenderer.on('update-overlay-config', (_event, config) => callback(config)),

    /** PERIODIC 모드에서 다음 입력 예정 시각을 수신합니다. (오버레이 카운트다운 뱃지용) */
    onMacroTick: (callback) =>
        ipcRenderer.on('macro-tick', (_event, tick) => callback(tick)),
});
