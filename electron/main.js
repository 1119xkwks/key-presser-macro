/**
 * @file electron/main.js
 * @description 게임 호환성 및 성능 최적화 버전
 */

const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;
app.isQuitting = false;

// 오버레이 가시성 및 성능을 위한 커맨드 라인 스위치 추가
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

// 개발 중에 발생하는 보안 경고(Insecure CSP 등) 로그를 숨깁니다.
// 이 경고는 Next.js 개발 서버의 Fast Refresh 기능 때문에 발생하는 것으로 배포 시에는 나타나지 않습니다.
if (isDev) {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}

// 하드웨어 가속 관련 설정: 오버레이 투명도 문제를 방지하기 위해 필요한 경우만 주석 해제하세요.
// app.disableHardwareAcceleration();

// 싱글 인스턴스 락: 앱이 두 번 실행되는 것을 방지
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

let mainWindow;
let overlayWindow;
let macroInterval = null;
let topMostReinforcer = null; // 오버레이를 강제로 최상단에 유지하기 위한 타이머
let isMacroRunning = false;
let currentConfig = null;
let psProcess = null; // PowerShell 프로세스 관리

/**
 * @function killZombies
 * @description 앱 실행 시 혹은 강제 종료되지 않은 기존 좀비 프로세스를 정리합니다.
 */
function killZombies() {
    if (process.platform !== 'win32') return;
    try {
        const { execSync } = require('child_process');
        const currentPid = process.pid;
        const exeName = path.basename(process.execPath);

        // 1. 동일한 이름의 다른 프로세스 종료 (내 PID 제외)
        // 개발 중일 때는 'electron.exe'일 수 있으므로 주의가 필요하지만, 
        // 보통 배포된 환경에서의 좀비 제거가 주 목적입니다.
        if (!isDev) {
            execSync(`taskkill /f /fi "pid ne ${currentPid}" /im "${exeName}"`, { stdio: 'ignore' });
        }

        // 2. 혹시 남아있을 수 있는 PowerShell 엔진 좀비 제거 
        // (단, 모든 powershell을 죽이면 다른 작업에 방해가 되므로 주의가 필요함)
        // 여기서는 매크로에서 사용한 특정한 형태의 PowerShell만 찾아 죽이는 것은 복잡하므로 
        // 일단 메인 앱 프로세스 정리에 집중합니다.
    } catch (e) {
        // 프로세스가 없거나 권한이 없는 경우 조용히 넘어감
    }
}

// 초기 실행 시 좀비 제거
killZombies();

/**
 * @function cleanupResources
 * @description 모든 백그라운드 자원을 안전하게 정리합니다.
 */
function cleanupResources() {
    console.log('[CLEANUP] Cleaning up all resources...');
    stopMacro();

    if (psProcess) {
        try {
            const { execSync } = require('child_process');
            // Windows에서 프로세스 트리 전체를 강제 종료 (/T: 트리 종료, /F: 강제 종료)
            execSync(`taskkill /pid ${psProcess.pid} /t /f`, { stdio: 'ignore' });
            console.log('[CLEANUP] PowerShell process tree terminated.');
        } catch (e) {
            try { psProcess.kill('SIGKILL'); } catch (err) { }
        }
        psProcess = null;
    }

    // 모든 단축키 해제
    globalShortcut.unregisterAll();
}


/**
 * @function initOverlayWindow
 * @description 앱 시작 시 오버레이 창을 미리 생성하여 메모리에 유지합니다.
 */
function initOverlayWindow() {
    if (overlayWindow) return;

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const overlayWidth = 400;
    const overlayHeight = 240; // 영역을 넉넉하게 확장

    overlayWindow = new BrowserWindow({
        width: overlayWidth,
        height: overlayHeight,
        x: 20, // 화면 왼쪽에서 20px
        y: 20, // 화면 상단에서 20px
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        focusable: false,
        skipTaskbar: true,
        resizable: false,
        fullscreenable: false,
        focusable: true, // 버튼 클릭을 위해 우선 true로 설정
        type: 'toolbar',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false,
        },
        show: false,
        backgroundColor: '#00000000',
        hasShadow: false,
    });

    // 가장 높은 고정 순위 설정 (화면 보호기 수준)
    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // 마우스 이벤트를 허용하여 STOP 버튼을 클릭할 수 있도록 설정
    overlayWindow.setIgnoreMouseEvents(false);

    const overlayUrl = isDev
        ? 'http://localhost:3000/overlay'
        : `file://${path.join(__dirname, '../out/overlay.html')}`;

    console.log(`[OVERLAY] Initializing with URL: ${overlayUrl}`);
    overlayWindow.loadURL(overlayUrl);

    overlayWindow.webContents.on('did-finish-load', () => {
        console.log('[OVERLAY] did-finish-load');
        // 로딩 완료 후 마우스 이벤트 활성화 재확인
        if (overlayWindow) {
            overlayWindow.setIgnoreMouseEvents(false);
        }
    });

    overlayWindow.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            overlayWindow.hide();
        }
    });

    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });
}

// PowerShell 프로세스가 이미 상단에서 선언되었으므로 중복 선언을 제거합니다.


/**
 * @function initPowerShell
 * @description 저수준 입력을 위해 PowerShell 프로세스를 미리 실행하고 유지합니다.
 */
function initPowerShell() {
    if (psProcess) return;

    // keybd_event API를 사용하는 C# 코드를 포함한 PowerShell 세션 시작
    const bootstrapUtils = `
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        using System.Threading;

        public class Win32Input {
            [DllImport("user32.dll")]
            public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);

            [DllImport("user32.dll")]
            public static extern uint MapVirtualKey(uint uCode, uint uMapType);

            public static void SendKeys(byte[] vKeys) {
                KeyDown(vKeys);
                Thread.Sleep(15);
                KeyUp(vKeys);
            }

            public static void KeyDown(byte[] vKeys) {
                if (vKeys == null || vKeys.Length == 0) return;
                for (int i = 0; i < vKeys.Length; i++) {
                    byte vKey = vKeys[i];
                    uint dwFlags = 0;
                    if ((vKey >= 0x21 && vKey <= 0x2E)) dwFlags |= 1;
                    byte scanCode = (byte)MapVirtualKey(vKey, 0);
                    keybd_event(vKey, scanCode, dwFlags, 0);
                }
            }

            public static void KeyUp(byte[] vKeys) {
                if (vKeys == null || vKeys.Length == 0) return;
                for (int i = vKeys.Length - 1; i >= 0; i--) {
                    byte vKey = vKeys[i];
                    uint dwFlags = 2; // KEYEVENTF_KEYUP
                    if ((vKey >= 0x21 && vKey <= 0x2E)) dwFlags |= 1;
                    byte scanCode = (byte)MapVirtualKey(vKey, 0);
                    keybd_event(vKey, scanCode, dwFlags, 0);
                }
            }
        }
"@
    `;

    psProcess = spawn('powershell', ['-NoProfile', '-Command', '-'], {
        stdio: ['pipe', 'inherit', 'inherit'],
        windowsHide: true // 이 설정을 통해 팝업되는 PowerShell 창을 숨깁니다.
    });

    psProcess.stdin.write(bootstrapUtils + "\n");
}

/**
 * @function getVirtualKeyCode
 * @description PowerShell SendKeys 형식을 Virtual Key Code로 변환합니다.
 */
function getVirtualKeyCode(key) {
    const mapping = {
        'a': 0x41, 'b': 0x42, 'c': 0x43, 'd': 0x44, 'e': 0x45, 'f': 0x46, 'g': 0x47, 'h': 0x48, 'i': 0x49, 'j': 0x4A, 'k': 0x4B, 'l': 0x4C, 'm': 0x4D, 'n': 0x4E, 'o': 0x4F, 'p': 0x50, 'q': 0x51, 'r': 0x52, 's': 0x53, 't': 0x54, 'u': 0x55, 'v': 0x56, 'w': 0x57, 'x': 0x58, 'y': 0x59, 'z': 0x5A,
        '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34, '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
        '{enter}': 0x0D, ' ': 0x20, '{esc}': 0x1B, '{bs}': 0x08, '{tab}': 0x09, '{ins}': 0x2D, '{del}': 0x2E,
        '{home}': 0x24, '{end}': 0x23, '{pgup}': 0x21, '{pgdn}': 0x22,
        '{up}': 0x26, '{down}': 0x28, '{left}': 0x25, '{right}': 0x27,
        '{f1}': 0x70, '{f2}': 0x71, '{f3}': 0x72, '{f4}': 0x73, '{f5}': 0x74, '{f6}': 0x75, '{f7}': 0x76, '{f8}': 0x77, '{f9}': 0x78, '{f10}': 0x79, '{f11}': 0x7A, '{f12}': 0x7B,
        'shift': 0x10, 'ctrl': 0x11, 'alt': 0x12, '.': 0xBE, 'plus': 0xBB
    };
    const k = key.toLowerCase();
    return mapping[k] || 0x41; // 기본값 A
}

function sendKeyLowLevel(keyString, type = 'press') {
    if (!psProcess) initPowerShell();
    const keys = keyString.split('+').filter(k => k);
    const vKeys = keys.map(k => getVirtualKeyCode(k));

    if (vKeys.length > 0) {
        if (type === 'down') {
            psProcess.stdin.write(`[Win32Input]::KeyDown(@(${vKeys.join(',')}))\n`);
        } else if (type === 'up') {
            psProcess.stdin.write(`[Win32Input]::KeyUp(@(${vKeys.join(',')}))\n`);
        } else {
            psProcess.stdin.write(`[Win32Input]::SendKeys(@(${vKeys.join(',')}))\n`);
        }
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        title: "Key Presser Macro (키 프레서 매크로)",
        icon: path.join(__dirname, 'icon.png'),
        autoHideMenuBar: true,
    });

    if (process.platform === 'win32') {
        app.setAppUserModelId('com.macro.keypresser');
    }

    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../out/index.html')}`;

    mainWindow.loadURL(startUrl);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        console.log('[MAIN] Window closed');
        app.isQuitting = true;
        cleanupResources();
        app.quit();
        mainWindow = null;
    });
}

function startMacro(config) {
    if (isMacroRunning) return;
    console.log(`[MACRO] startMacro called. Key: ${config.targetKey}, useShift: ${config.useShift}`);
    isMacroRunning = true;
    currentConfig = config;

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('macro-status-changed', true);
    }

    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('update-overlay-config', config);
        overlayWindow.showInactive();
        if (topMostReinforcer) clearInterval(topMostReinforcer);
        topMostReinforcer = setInterval(() => {
            if (overlayWindow && !overlayWindow.isDestroyed()) {
                overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
            }
        }, 1000);
    }

    const interval = Math.max(20, config.interval);

    const macroLoop = () => {
        if (!isMacroRunning) return;

        // Shift 옵션 처리
        const finalKey = config.useShift ? `shift+${config.targetKey}` : config.targetKey;

        if (config.mode === 'HOLD') {
            // HOLD 모드는 KeyDown을 지속적으로 보내 메모장 등에서 반복 입력이 가능하게 함
            sendKeyLowLevel(finalKey, 'down');
        } else {
            sendKeyLowLevel(finalKey, 'press');
        }

        loopTimeout = setTimeout(macroLoop, interval);
    };

    macroLoop();
}

function stopMacro() {
    console.log('[MACRO] stopMacro called');
    if (!isMacroRunning) return;

    isMacroRunning = false;
    if (loopTimeout) {
        clearTimeout(loopTimeout);
        loopTimeout = null;
    }

    if (topMostReinforcer) {
        clearInterval(topMostReinforcer);
        topMostReinforcer = null;
    }

    // HOLD 모드였거나 Shift를 누르고 있었다면 키 떼기
    if (currentConfig) {
        const finalKey = currentConfig.useShift ? `shift+${currentConfig.targetKey}` : currentConfig.targetKey;
        sendKeyLowLevel(finalKey, 'up');
        // 안전을 위해 Shift 개별 해제 신호도 추가 전송
        if (currentConfig.useShift) sendKeyLowLevel('shift', 'up');
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
        try {
            mainWindow.webContents.send('macro-status-changed', false);
        } catch (e) {
            console.error('[STOP_MACRO] Failed to send status:', e.message);
        }
    }

    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.hide();
    }
}

let lastRegisteredShortcut = null;
let lastRegisteredUseShift = null;

ipcMain.handle('update-macro-config', async (event, config) => {
    try {
        console.log(`[IPC] update-macro-config. Shortcut: ${config.startStopShortcut}, ShiftMode: ${config.useShift}`);

        // 단축키와 Shift 모드 둘 다 변경되지 않았다면 재등록 스킵
        if (lastRegisteredShortcut === config.startStopShortcut && lastRegisteredUseShift === config.useShift) {
            currentConfig = config;
            return { success: true };
        }

        if (isMacroRunning) stopMacro();
        globalShortcut.unregisterAll();

        currentConfig = config;
        lastRegisteredShortcut = config.startStopShortcut;
        lastRegisteredUseShift = config.useShift;

        // 오버레이 업데이트
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('update-overlay-config', config);
        }

        const triggerMacro = () => {
            const activeConfig = currentConfig || config;
            if (isMacroRunning) stopMacro();
            else startMacro(activeConfig);
        };

        // [근본 해결] 단축키 등록 로직
        const fallbacks = [config.startStopShortcut];

        // 매크로가 Shift를 누를 예정이거나 대상 키에 Shift가 포함된 경우 폴백 등록
        const targetLow = config.targetKey.toLowerCase();
        if (config.useShift || targetLow.includes('shift')) {
            if (!config.startStopShortcut.startsWith('Shift+')) {
                fallbacks.push(`Shift+${config.startStopShortcut}`);
            }
        }

        let isRegistered = false;
        for (const fb of fallbacks) {
            try {
                if (globalShortcut.register(fb, triggerMacro)) {
                    console.log(`[SHORTCUT] Registered: ${fb}`);
                    isRegistered = true;
                }
            } catch (e) { }
        }

        if (!isRegistered) {
            return { success: false, error: "단축키 등록 실패" };
        }
        return { success: true };
    } catch (error) {
        console.error(`[SHORTCUT] Error: ${error.message}`);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-macro', () => {
    console.log('[IPC] stop-macro requested from renderer');
    stopMacro();
    return { success: true };
});

app.on('ready', () => {
    initPowerShell();
    initOverlayWindow();
    createWindow();
});

app.on('window-all-closed', () => {
    cleanupResources();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;
    cleanupResources();
});

app.on('will-quit', () => {
    app.isQuitting = true;
    cleanupResources();
});
