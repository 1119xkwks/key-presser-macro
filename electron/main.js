/**
 * @file electron/main.js
 * @description Electron 메인 프로세스 — v2 키 체계(Web code) 기반
 */

const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;
app.isQuitting = false;

app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

if (isDev) {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}

// 싱글 인스턴스 락
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
let loopTimeout = null;
let topMostReinforcer = null;
let isMacroRunning = false;
let currentConfig = null;
let psProcess = null;

// ──────────────────────────────────────────────
// 설정 파일 경로
// ──────────────────────────────────────────────

/**
 * @description 실행파일 기준 설정 파일 경로.
 * 개발 시에는 프로젝트 루트에, 빌드 후에는 exe와 같은 폴더에 저장합니다.
 */
function getConfigFilePath() {
    if (isDev) {
        return path.join(__dirname, '..', 'key-presser-macro.json');
    }
    return path.join(path.dirname(process.execPath), 'key-presser-macro.json');
}

/** 파일에서 설정을 읽어 반환합니다. 실패 시 null을 반환합니다. */
function readConfigFile() {
    try {
        const raw = fs.readFileSync(getConfigFilePath(), 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

// ──────────────────────────────────────────────
// Web code → Win32 VK Code 변환
// ──────────────────────────────────────────────

const WEB_CODE_TO_VK = {
    // 알파벳
    KeyA:0x41,KeyB:0x42,KeyC:0x43,KeyD:0x44,KeyE:0x45,KeyF:0x46,KeyG:0x47,
    KeyH:0x48,KeyI:0x49,KeyJ:0x4A,KeyK:0x4B,KeyL:0x4C,KeyM:0x4D,KeyN:0x4E,
    KeyO:0x4F,KeyP:0x50,KeyQ:0x51,KeyR:0x52,KeyS:0x53,KeyT:0x54,KeyU:0x55,
    KeyV:0x56,KeyW:0x57,KeyX:0x58,KeyY:0x59,KeyZ:0x5A,
    // 숫자
    Digit0:0x30,Digit1:0x31,Digit2:0x32,Digit3:0x33,Digit4:0x34,
    Digit5:0x35,Digit6:0x36,Digit7:0x37,Digit8:0x38,Digit9:0x39,
    // 기능키
    F1:0x70,F2:0x71,F3:0x72,F4:0x73,F5:0x74,F6:0x75,
    F7:0x76,F8:0x77,F9:0x78,F10:0x79,F11:0x7A,F12:0x7B,
    // 특수키
    Enter:0x0D, Space:0x20, Escape:0x1B, Backspace:0x08, Tab:0x09,
    Insert:0x2D, Delete:0x2E, Home:0x24, End:0x23, PageUp:0x21, PageDown:0x22,
    // 방향키
    ArrowUp:0x26, ArrowDown:0x28, ArrowLeft:0x25, ArrowRight:0x27,
    // 제어키
    CapsLock:0x14, NumLock:0x90, ScrollLock:0x91, PrintScreen:0x2C, Pause:0x13,
    // Modifier (Shift 조합 시 단독 VK)
    ShiftLeft:0x10, ShiftRight:0x10,
    ControlLeft:0x11, ControlRight:0x11,
    AltLeft:0x12, AltRight:0x12,
    MetaLeft:0x5B, MetaRight:0x5C,
    // 기호
    Minus:0xBD, Equal:0xBB, BracketLeft:0xDB, BracketRight:0xDD,
    Backslash:0xDC, Semicolon:0xBA, Quote:0xDE, Comma:0xBC, Period:0xBE,
    Slash:0xBF, Backquote:0xC0,
    // 넘패드
    Numpad0:0x60,Numpad1:0x61,Numpad2:0x62,Numpad3:0x63,Numpad4:0x64,
    Numpad5:0x65,Numpad6:0x66,Numpad7:0x67,Numpad8:0x68,Numpad9:0x69,
    NumpadAdd:0x6B, NumpadSubtract:0x6D, NumpadMultiply:0x6A,
    NumpadDivide:0x6F, NumpadDecimal:0x6E, NumpadEnter:0x0D,
};

/**
 * @function getVirtualKeyCode
 * @description Web KeyboardEvent.code 를 Win32 Virtual Key Code 로 변환합니다.
 */
function getVirtualKeyCode(webCode) {
    return WEB_CODE_TO_VK[webCode] ?? 0x41;
}

// ──────────────────────────────────────────────
// 마우스 코드 → mouse_event 플래그 변환
// ──────────────────────────────────────────────

/** MOUSEEVENTF_* 플래그 (user32 mouse_event) */
const MOUSE_CODE_TO_FLAGS = {
    MouseLeft:   { down: 0x0002, up: 0x0004 }, // LEFTDOWN / LEFTUP
    MouseRight:  { down: 0x0008, up: 0x0010 }, // RIGHTDOWN / RIGHTUP
    MouseMiddle: { down: 0x0020, up: 0x0040 }, // MIDDLEDOWN / MIDDLEUP
};

/**
 * @function isMouseCode
 * @description 해당 코드가 마우스 버튼 코드인지 여부를 반환합니다.
 */
function isMouseCode(code) {
    return Object.prototype.hasOwnProperty.call(MOUSE_CODE_TO_FLAGS, code);
}

// ──────────────────────────────────────────────
// Web code → Electron Accelerator 변환
// ──────────────────────────────────────────────

const WEB_CODE_TO_ACCEL = {
    Space:'Space', Enter:'Return', Escape:'Escape', Backspace:'Backspace', Tab:'Tab',
    Insert:'Insert', Delete:'Delete', Home:'Home', End:'End',
    PageUp:'PageUp', PageDown:'PageDown',
    ArrowUp:'Up', ArrowDown:'Down', ArrowLeft:'Left', ArrowRight:'Right',
    CapsLock:'CapsLock', NumLock:'Numlock', ScrollLock:'Scrolllock',
    PrintScreen:'PrintScreen', Pause:'Pause',
    Minus:'-', Equal:'=', BracketLeft:'[', BracketRight:']',
    Backslash:'\\', Semicolon:';', Quote:"'", Comma:',', Period:'.', Slash:'/', Backquote:'`',
    NumpadAdd:'numadd', NumpadSubtract:'numsub', NumpadMultiply:'nummult',
    NumpadDivide:'numdiv', NumpadDecimal:'numdec', NumpadEnter:'Return',
};

/**
 * @function webCodeToAccelerator
 * @description Web code 를 Electron globalShortcut Accelerator 문자열로 변환합니다.
 */
function webCodeToAccelerator(code) {
    if (WEB_CODE_TO_ACCEL[code]) return WEB_CODE_TO_ACCEL[code];
    if (code.startsWith('Key')) return code.slice(3);      // KeyW → W
    if (code.startsWith('Digit')) return code.slice(5);    // Digit1 → 1
    if (code.startsWith('Numpad')) return `num${code.slice(6).toLowerCase()}`;
    if (/^F\d+$/.test(code)) return code;                  // F1 → F1
    return code;
}

// ──────────────────────────────────────────────
// 키 입력 전송
// ──────────────────────────────────────────────

function sendKeyLowLevel(webCode, type = 'press') {
    if (!psProcess) initPowerShell();
    const vk = getVirtualKeyCode(webCode);
    if (type === 'down') {
        psProcess.stdin.write(`[Win32Input]::KeyDown(@(${vk}))\n`);
    } else if (type === 'up') {
        psProcess.stdin.write(`[Win32Input]::KeyUp(@(${vk}))\n`);
    } else {
        psProcess.stdin.write(`[Win32Input]::SendKeys(@(${vk}))\n`);
    }
}

function sendKeyWithShift(targetCode, type = 'press') {
    const vkShift = 0x10;
    const vkTarget = getVirtualKeyCode(targetCode);
    if (type === 'down') {
        psProcess.stdin.write(`[Win32Input]::KeyDown(@(${vkShift},${vkTarget}))\n`);
    } else if (type === 'up') {
        psProcess.stdin.write(`[Win32Input]::KeyUp(@(${vkShift},${vkTarget}))\n`);
    } else {
        psProcess.stdin.write(`[Win32Input]::KeyDown(@(${vkShift},${vkTarget}))\n`);
        psProcess.stdin.write(`[Win32Input]::KeyUp(@(${vkShift},${vkTarget}))\n`);
    }
}

// ──────────────────────────────────────────────
// 마우스 클릭 전송 (현재 커서 위치에서 클릭)
// ──────────────────────────────────────────────

/**
 * @function sendMouseLowLevel
 * @description 마우스 버튼 이벤트를 전송합니다. 클릭은 현재 커서 위치에서 발생합니다.
 * @param {string} mouseCode - 'MouseLeft' | 'MouseMiddle' | 'MouseRight'
 * @param {string} type - 'down' | 'up' | 'press'
 */
function sendMouseLowLevel(mouseCode, type = 'press') {
    if (!psProcess) initPowerShell();
    const flags = MOUSE_CODE_TO_FLAGS[mouseCode];
    if (!flags) return;
    if (type === 'down') {
        psProcess.stdin.write(`[Win32Input]::MouseDown(${flags.down})\n`);
    } else if (type === 'up') {
        psProcess.stdin.write(`[Win32Input]::MouseUp(${flags.up})\n`);
    } else {
        psProcess.stdin.write(`[Win32Input]::MouseClick(${flags.down},${flags.up})\n`);
    }
}

/**
 * @function sendMouseWithShift
 * @description Shift를 누른 채 마우스 버튼 이벤트를 전송합니다 (Shift down → 마우스 → Shift up).
 */
function sendMouseWithShift(mouseCode, type = 'press') {
    if (!psProcess) initPowerShell();
    const vkShift = 0x10;
    const flags = MOUSE_CODE_TO_FLAGS[mouseCode];
    if (!flags) return;
    if (type === 'down') {
        psProcess.stdin.write(`[Win32Input]::KeyDown(@(${vkShift}))\n`);
        psProcess.stdin.write(`[Win32Input]::MouseDown(${flags.down})\n`);
    } else if (type === 'up') {
        psProcess.stdin.write(`[Win32Input]::MouseUp(${flags.up})\n`);
        psProcess.stdin.write(`[Win32Input]::KeyUp(@(${vkShift}))\n`);
    } else {
        psProcess.stdin.write(`[Win32Input]::KeyDown(@(${vkShift}))\n`);
        psProcess.stdin.write(`[Win32Input]::MouseClick(${flags.down},${flags.up})\n`);
        psProcess.stdin.write(`[Win32Input]::KeyUp(@(${vkShift}))\n`);
    }
}

// ──────────────────────────────────────────────
// 좀비 프로세스 정리
// ──────────────────────────────────────────────

function killZombies() {
    if (process.platform !== 'win32') return;
    try {
        const { execSync } = require('child_process');
        if (!isDev) {
            const currentPid = process.pid;
            const exeName = path.basename(process.execPath);
            execSync(`taskkill /f /fi "pid ne ${currentPid}" /im "${exeName}"`, { stdio: 'ignore' });
        }
    } catch (e) { }
}

killZombies();

// ──────────────────────────────────────────────
// 리소스 정리
// ──────────────────────────────────────────────

function cleanupResources() {
    console.log('[CLEANUP] Cleaning up all resources...');
    stopMacro();

    if (psProcess) {
        try {
            const { execSync } = require('child_process');
            execSync(`taskkill /pid ${psProcess.pid} /t /f`, { stdio: 'ignore' });
        } catch (e) {
            try { psProcess.kill('SIGKILL'); } catch (err) { }
        }
        psProcess = null;
    }

    globalShortcut.unregisterAll();
}

// ──────────────────────────────────────────────
// 오버레이 창
// ──────────────────────────────────────────────

function initOverlayWindow() {
    if (overlayWindow) return;

    const overlayWidth = 400;
    const overlayHeight = 204;

    overlayWindow = new BrowserWindow({
        width: overlayWidth,
        height: overlayHeight,
        x: 20,
        y: 20,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        focusable: true,
        skipTaskbar: true,
        resizable: false,
        fullscreenable: false,
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

    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    overlayWindow.setIgnoreMouseEvents(false);

    const overlayUrl = isDev
        ? 'http://localhost:3000/overlay'
        : `file://${path.join(__dirname, '../out/overlay.html')}`;

    overlayWindow.loadURL(overlayUrl);

    overlayWindow.webContents.on('did-finish-load', () => {
        if (overlayWindow) overlayWindow.setIgnoreMouseEvents(false);
    });

    overlayWindow.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            overlayWindow.hide();
        }
    });

    overlayWindow.on('closed', () => { overlayWindow = null; });
}

// ──────────────────────────────────────────────
// PowerShell 초기화
// ──────────────────────────────────────────────

function initPowerShell() {
    if (psProcess) return;

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

            [DllImport("user32.dll")]
            public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

            // 마우스 버튼 down (현재 커서 위치)
            public static void MouseDown(uint downFlag) {
                mouse_event(downFlag, 0, 0, 0, 0);
            }

            // 마우스 버튼 up (현재 커서 위치)
            public static void MouseUp(uint upFlag) {
                mouse_event(upFlag, 0, 0, 0, 0);
            }

            // 마우스 클릭 (down → 15ms → up, 키보드 SendKeys와 동일 타이밍)
            public static void MouseClick(uint downFlag, uint upFlag) {
                mouse_event(downFlag, 0, 0, 0, 0);
                Thread.Sleep(15);
                mouse_event(upFlag, 0, 0, 0, 0);
            }

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
                    uint dwFlags = 2;
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
        windowsHide: true,
    });

    psProcess.stdin.write(bootstrapUtils + '\n');
}

// ──────────────────────────────────────────────
// 매크로 시작 / 중지
// ──────────────────────────────────────────────

function startMacro(config) {
    if (isMacroRunning) return;
    console.log(`[MACRO] start. targetKey=${config.targetKey}, useShift=${config.useShift}`);
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

    const isMouse = isMouseCode(config.targetKey);

    const macroLoop = () => {
        if (!isMacroRunning) return;
        if (!psProcess) initPowerShell();

        const type = config.mode === 'HOLD' ? 'down' : 'press';

        if (isMouse) {
            // 마우스 버튼: 현재 커서 위치에서 클릭/누름
            if (config.useShift) sendMouseWithShift(config.targetKey, type);
            else sendMouseLowLevel(config.targetKey, type);
        } else {
            // 키보드 키
            if (config.useShift) sendKeyWithShift(config.targetKey, type);
            else sendKeyLowLevel(config.targetKey, type);
        }

        loopTimeout = setTimeout(macroLoop, interval);
    };

    macroLoop();
}

function stopMacro() {
    console.log('[MACRO] stop');
    if (!isMacroRunning) return;

    isMacroRunning = false;
    if (loopTimeout) { clearTimeout(loopTimeout); loopTimeout = null; }
    if (topMostReinforcer) { clearInterval(topMostReinforcer); topMostReinforcer = null; }

    if (currentConfig) {
        if (isMouseCode(currentConfig.targetKey)) {
            // 마우스 버튼 고착 방지: up 전송 (+ Shift 사용 시 Shift도 해제)
            sendMouseLowLevel(currentConfig.targetKey, 'up');
            if (currentConfig.useShift) sendKeyLowLevel('ShiftLeft', 'up');
        } else if (currentConfig.useShift) {
            sendKeyWithShift(currentConfig.targetKey, 'up');
            sendKeyLowLevel('ShiftLeft', 'up'); // Shift 고착 방지
        } else {
            sendKeyLowLevel(currentConfig.targetKey, 'up');
        }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
        try { mainWindow.webContents.send('macro-status-changed', false); } catch (e) { }
    }

    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.hide();
    }
}

// ──────────────────────────────────────────────
// 메인 창
// ──────────────────────────────────────────────

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 960,
        height: 760,
        minWidth: 600,
        minHeight: 100,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        title: 'KeyPresserMacro',
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

    // 앱 준비 후 초기 설정을 파일에서 읽어 렌더러로 전달
    mainWindow.webContents.on('did-finish-load', () => {
        const savedConfig = readConfigFile();
        if (savedConfig) {
            mainWindow.webContents.send('initial-config', savedConfig);
        }
    });

    mainWindow.on('closed', () => {
        console.log('[MAIN] Window closed');
        app.isQuitting = true;
        cleanupResources();
        app.quit();
        mainWindow = null;
    });
}

// ──────────────────────────────────────────────
// IPC 핸들러
// ──────────────────────────────────────────────

let lastRegisteredShortcut = null;
let lastRegisteredUseShift = null;

ipcMain.handle('update-macro-config', async (event, config) => {
    try {
        console.log(`[IPC] update-macro-config. shortcut=${config.startStopShortcut}, shift=${config.useShift}`);

        // 마우스 버튼은 시작/중지 단축키로 등록 불가 (globalShortcut은 키보드 전용)
        if (isMouseCode(config.startStopShortcut)) {
            return { success: false, error: '마우스 버튼은 시작/중지 단축키로 사용할 수 없습니다.' };
        }

        if (lastRegisteredShortcut === config.startStopShortcut && lastRegisteredUseShift === config.useShift) {
            currentConfig = config;
            return { success: true };
        }

        if (isMacroRunning) stopMacro();
        globalShortcut.unregisterAll();

        currentConfig = config;
        lastRegisteredShortcut = config.startStopShortcut;
        lastRegisteredUseShift = config.useShift;

        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('update-overlay-config', config);
        }

        const triggerMacro = () => {
            const activeConfig = currentConfig || config;
            if (isMacroRunning) stopMacro();
            else startMacro(activeConfig);
        };

        const accelerator = webCodeToAccelerator(config.startStopShortcut);
        const fallbacks = [accelerator];

        // Shift 조합 시 Shift+<단축키> 도 폴백 등록
        if (config.useShift && !accelerator.startsWith('Shift+')) {
            fallbacks.push(`Shift+${accelerator}`);
        }

        let registered = false;
        for (const fb of fallbacks) {
            try {
                if (globalShortcut.register(fb, triggerMacro)) {
                    console.log(`[SHORTCUT] Registered: ${fb}`);
                    registered = true;
                }
            } catch (e) { }
        }

        if (!registered) return { success: false, error: '단축키 등록 실패' };
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-macro', () => {
    stopMacro();
    return { success: true };
});

ipcMain.handle('start-macro', async (event, config) => {
    startMacro(config || currentConfig);
    return { success: true };
});

/** 설정을 실행파일 옆 JSON 파일에 저장합니다. */
ipcMain.handle('save-config-to-file', async (event, config) => {
    try {
        fs.writeFileSync(getConfigFilePath(), JSON.stringify(config, null, 2), 'utf-8');
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

/** 앱을 재실행합니다. */
ipcMain.handle('relaunch-app', () => {
    app.relaunch();
    app.quit();
});

/** keyboard-korean-with-mouse-key.svg 내용을 렌더러에 전달합니다. */
ipcMain.handle('get-keyboard-svg', () => {
    const svgPath = path.join(__dirname, '../out/keyboard-korean-with-mouse-key.svg');
    try {
        return fs.readFileSync(svgPath, 'utf-8');
    } catch (e) {
        console.error('[SVG] Failed to read keyboard svg:', e.message);
        return '';
    }
});

// ──────────────────────────────────────────────
// 앱 생명주기
// ──────────────────────────────────────────────

app.on('ready', () => {
    initPowerShell();
    initOverlayWindow();
    createWindow();
});

app.on('window-all-closed', () => {
    cleanupResources();
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { app.isQuitting = true; cleanupResources(); });
app.on('will-quit', () => { app.isQuitting = true; cleanupResources(); });
