/**
 * @file electron/main.js
 * @description 게임 호환성 및 성능 최적화 버전
 */

const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;

// 개발 중에 발생하는 보안 경고(Insecure CSP 등) 로그를 숨깁니다.
// 이 경고는 Next.js 개발 서버의 Fast Refresh 기능 때문에 발생하는 것으로 배포 시에는 나타나지 않습니다.
if (isDev) {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}

let mainWindow;
let macroInterval = null;
let isMacroRunning = false;

// PowerShell 프로세스 관리
let psProcess = null;

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

            public static void SendKey(byte vKey) {
                uint dwFlagsDown = 0;
                uint dwFlagsUp = 2; // KEYEVENTF_KEYUP

                // Insert, Delete, Home, End, PageUp, PageDown, 방향키는 Extended Key 플래그 필요
                if ((vKey >= 0x21 && vKey <= 0x2E)) {
                    dwFlagsDown |= 1; // KEYEVENTF_EXTENDEDKEY
                    dwFlagsUp |= 1;
                }

                byte scanCode = (byte)MapVirtualKey(vKey, 0);

                keybd_event(vKey, scanCode, dwFlagsDown, 0); // Down
                Thread.Sleep(15); // 다른 매크로 프로그램이 감지할 수 있도록 최소한의 누름 시간 유지
                keybd_event(vKey, scanCode, dwFlagsUp, 0);   // Up
            }
        }
"@
    `;

    psProcess = spawn('powershell', ['-NoProfile', '-Command', '-'], {
        stdio: ['pipe', 'inherit', 'inherit']
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
        '{ENTER}': 0x0D, ' ': 0x20, '{ESC}': 0x1B, '{BS}': 0x08, '{TAB}': 0x09, '{INS}': 0x2D, '{DEL}': 0x2E,
        '{HOME}': 0x24, '{END}': 0x23, '{PGUP}': 0x21, '{PGDN}': 0x22,
        '{UP}': 0x26, '{DOWN}': 0x28, '{LEFT}': 0x25, '{RIGHT}': 0x27,
        '{F1}': 0x70, '{F2}': 0x71, '{F3}': 0x72, '{F4}': 0x73, '{F5}': 0x74, '{F6}': 0x75, '{F7}': 0x76, '{F8}': 0x77, '{F9}': 0x78, '{F10}': 0x79, '{F11}': 0x7A, '{F12}': 0x7B
    };
    return mapping[key.toLowerCase()] || mapping[key] || 0x41; // 기본값 A
}

function sendKeyLowLevel(key) {
    if (!psProcess) initPowerShell();
    const vKey = getVirtualKeyCode(key);
    psProcess.stdin.write(`[Win32Input]::SendKey(${vKey})\n`);
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

    mainWindow.on('closed', () => (mainWindow = null));
}

function startMacro(config) {
    if (isMacroRunning) return;

    isMacroRunning = true;
    mainWindow.webContents.send('macro-status-changed', true);

    const interval = config.mode === 'HOLD' ? 50 : config.interval;

    macroInterval = setInterval(() => {
        sendKeyLowLevel(config.targetKey);
    }, interval);
}

function stopMacro() {
    if (!isMacroRunning) return;

    if (macroInterval) {
        clearInterval(macroInterval);
        macroInterval = null;
    }

    isMacroRunning = false;
    mainWindow.webContents.send('macro-status-changed', false);
}

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

app.on('ready', () => {
    initPowerShell();
    createWindow();
});

app.on('window-all-closed', () => {
    if (psProcess) psProcess.kill();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (psProcess) psProcess.kill();
    globalShortcut.unregisterAll();
});
