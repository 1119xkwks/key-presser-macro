/**
 * @file electron/main.js
 * @description Electron 메인 프로세스 설정 및 매크로 로직을 담당합니다.
 */

const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const { exec } = require('child_process');

const isDev = !app.isPackaged;
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

    // 배포 환경에서 정적 파일 로드 시 경로 문제 해결을 위해 file:// 프로토콜 사용
    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../out/index.html')}`;

    console.log(`Loading URL: ${startUrl}`);
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
        macroInterval = setInterval(() => {
            sendKeyViaPowerShell(config.targetKey);
        }, config.interval);
    } else if (config.mode === 'HOLD') {
        macroInterval = setInterval(() => {
            sendKeyViaPowerShell(config.targetKey);
        }, 50);
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
    globalShortcut.unregisterAll();
});
