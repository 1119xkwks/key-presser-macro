/**
 * @file electron/preload.js
 * @description 웹 페이지와 메인 프로세스 간의 안전한 통신을 위한 Preload 스크립트입니다.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * @function updateMacroConfig
     * @description 메인 프로세스에 매크로 설정을 전달합니다.
     */
    updateMacroConfig: (config) => ipcRenderer.invoke('update-macro-config', config),

    /**
     * @function onMacroStatusChanged
     * @description 매크로 실행 상태 변경 이벤트를 수신합니다.
     */
    onMacroStatusChanged: (callback) => ipcRenderer.on('macro-status-changed', (event, value) => callback(value)),
});
