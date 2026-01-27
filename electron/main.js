/**
 * @file electron/main.js
 * @description Electron 메인 프로세스 설정 및 매크로 로직을 담당합니다.
 */

const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { exec } = require('child_process');

let mainWindow;
let macroInterval = null;
let isMacroRunning = false;

/**
 * @function createWindow
 * @description 메인 윈도우를 생성하고 설정을 초기화합니다.
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        title: "Key Presser Macro",
        autoHideMenuBar: true,
    });

    // 개발 환경에서는 localhost:3000으로, 배포 환경에서는 빌드된 파일로 로드
    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../out/index.html')}`;

    mainWindow.loadURL(startUrl);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => (mainWindow = null));
}

/**
 * @function sendKeyViaPowerShell
 * @description PowerShell을 사용하여 키 입력을 시뮬레이션합니다.
 * @param {string} key - 전송할 키 이름
 */
function sendKeyViaPowerShell(key) {
    // PowerShell의 SendKeys 형식을 따릅니다.
    // 특수 키 처리가 필요할 수 있습니다 (예: {ENTER}, {ESC})
    const psCommand = `powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys('${key}')"`;
    exec(psCommand, (error) => {
        if (error) {
            console.error(`키 전송 오류: ${error}`);
        }
    });
}

/**
 * @function startMacro
 * @description 설정된 구성에 따라 매크로를 시작합니다.
 * @param {Object} config - 매크로 구성 객체
 */
function startMacro(config) {
    if (isMacroRunning) return;

    isMacroRunning = true;
    mainWindow.webContents.send('macro-status-changed', true);

    if (config.mode === 'PERIODIC') {
        // 주기적 입력 모드
        macroInterval = setInterval(() => {
            sendKeyViaPowerShell(config.targetKey);
        }, config.interval);
    } else if (config.mode === 'HOLD') {
        // 지속 누름 모드 (PowerShell SendKeys는 누름 유지가 어려우므로 짧은 주기로 반복 입력)
        macroInterval = setInterval(() => {
            sendKeyViaPowerShell(config.targetKey);
        }, 50); // 50ms 간격으로 반복 전송하여 유지 효과
    }
}

/**
 * @function stopMacro
 * @description 실행 중인 매크로를 중지합니다.
 */
function stopMacro() {
    if (!isMacroRunning) return;

    if (macroInterval) {
        clearInterval(macroInterval);
        macroInterval = null;
    }

    isMacroRunning = false;
    mainWindow.webContents.send('macro-status-changed', false);
}

// IPC 통신 설정
ipcMain.handle('update-macro-config', (event, config) => {
    // 기존 단축키 해제 후 새 단축키 등록
    globalShortcut.unregisterAll();

    try {
        globalShortcut.register(config.startStopShortcut, () => {
            if (isMacroRunning) {
                stopMacro();
            } else {
                startMacro(config);
            }
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('will-quit', () => {
    // 앱 종료 시 모든 단축키 해제
    globalShortcut.unregisterAll();
});
