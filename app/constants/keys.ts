/**
 * @file constants/keys.ts
 * @description 매크로에서 사용할 수 있는 모든 키보드 키 옵션들을 정의합니다.
 */

/**
 * @interface KeyOption
 * @description 셀렉트 박스에서 사용할 키 옵션 구조
 */
export interface KeyOption {
    label: string;
    value: string;
}

/**
 * @description PowerShell SendKeys 형식을 따르는 대상 키 목록입니다.
 */
export const TARGET_KEYS: KeyOption[] = [
    // 알파벳
    ...Array.from({ length: 26 }, (_, i) => ({
        label: String.fromCharCode(65 + i),
        value: String.fromCharCode(97 + i),
    })),
    // 숫자
    ...Array.from({ length: 10 }, (_, i) => ({
        label: `Number ${i}`,
        value: `${i}`,
    })),
    // 기능키 (F1 ~ F12)
    ...Array.from({ length: 12 }, (_, i) => ({
        label: `F${i + 1}`,
        value: `{F${i + 1}}`,
    })),
    // 특수 키
    { label: 'Enter', value: '{ENTER}' },
    { label: 'Space', value: ' ' },
    { label: 'Escape', value: '{ESC}' },
    { label: 'Backspace', value: '{BS}' },
    { label: 'Tab', value: '{TAB}' },
    { label: 'Insert', value: '{INS}' },
    { label: 'Delete', value: '{DEL}' },
    { label: 'Home', value: '{HOME}' },
    { label: 'End', value: '{END}' },
    { label: 'Page Up', value: '{PGUP}' },
    { label: 'Page Down', value: '{PGDN}' },
    // 방향키
    { label: 'Arrow Up', value: '{UP}' },
    { label: 'Arrow Down', value: '{DOWN}' },
    { label: 'Arrow Left', value: '{LEFT}' },
    { label: 'Arrow Right', value: '{RIGHT}' },
    // 기타 제어
    { label: 'Caps Lock', value: '{CAPSLOCK}' },
    { label: 'Num Lock', value: '{NUMLOCK}' },
    { label: 'Scroll Lock', value: '{SCROLLLOCK}' },
    { label: 'Print Screen', value: '{PRTSC}' },
    // Shift 및 Shift 복합키
    { label: 'Shift', value: 'shift' },
    { label: 'Shift + W', value: 'shift+w' },
    { label: 'Shift + W + A', value: 'shift+w+a' },
    { label: 'Shift + W + S', value: 'shift+w+s' },
    { label: 'Shift + W + S + A', value: 'shift+w+s+a' },
    { label: 'Shift + W + S + D', value: 'shift+w+s+d' },
    { label: 'Shift + W + D', value: 'shift+w+d' },
    { label: 'Shift + A', value: 'shift+a' },
    { label: 'Shift + A + S', value: 'shift+a+s' },
    { label: 'Shift + A + D', value: 'shift+a+d' },
    { label: 'Shift + D', value: 'shift+d' },
    { label: 'Shift + D + S', value: 'shift+d+s' },
    { label: 'Shift + D + A', value: 'shift+d+a' },
    // 기호
    { label: '+', value: 'Plus' },
];

/**
 * @description Electron Accelerator 형식을 따르는 시작/중지 단축키 목록입니다.
 * TARGET_KEYS와 동일한 키 목록을 제공하며, 추가적인 조합키를 포함합니다.
 */
export const SHORTCUT_KEYS: KeyOption[] = [
    // TARGET_KEYS의 기본 키들을 Electron Accelerator 형식에 맞게 변환하여 포함
    ...TARGET_KEYS.map(key => ({
        label: key.label,
        // PowerShell 형식({F1})을 Electron 형식(F1)으로 변환하고,
        // shift+w 같은 소문자 조합을 Shift+W와 같은 표준 Accelerator 형식으로 변환
        value: key.value
            .replace(/[{}]/g, '')
            .replace('shift+', 'Shift+')
            .replace('ctrl+', 'Control+')
            .replace('alt+', 'Alt+')
            .replace('BS', 'Backspace')
            .replace('INS', 'Insert')
            .replace('DEL', 'Delete')
            .replace('PGUP', 'PageUp')
            .replace('PGDN', 'PageDown')
            .replace('PRTSC', 'PrintScreen')
            .replace('UP', 'Up')
            .replace('DOWN', 'Down')
            .replace('LEFT', 'Left')
            .replace('RIGHT', 'Right')
            .split('+')
            .map(part => part.length === 1 ? part.toUpperCase() : part)
            .join('+')
    })),
    // 조합키 (Ctrl+)
    { label: 'Ctrl+S', value: 'CommandOrControl+S' },
    { label: 'Ctrl+Q', value: 'CommandOrControl+Q' },
    { label: 'Ctrl+E', value: 'CommandOrControl+E' },
    { label: 'Ctrl+R', value: 'CommandOrControl+R' },
    { label: 'Ctrl+Space', value: 'CommandOrControl+Space' },
    // 조합키 (Alt+)
    { label: 'Alt+A', value: 'Alt+A' },
    { label: 'Alt+S', value: 'Alt+S' },
    { label: 'Alt+D', value: 'Alt+D' },
    { label: 'Alt+F', value: 'Alt+F' },
    { label: 'Alt+X', value: 'Alt+X' },
    { label: 'Alt+Z', value: 'Alt+Z' },
    // 방향키 조합
    { label: 'Ctrl+Up', value: 'CommandOrControl+Up' },
    { label: 'Ctrl+Down', value: 'CommandOrControl+Down' },
];
