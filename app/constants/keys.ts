/**
 * @file constants/keys.ts
 * @description v2: Web KeyboardEvent.code 형식 기반 키 목록 정의.
 * SVG의 data-key 속성과 동일한 코드 체계를 사용합니다.
 */

/**
 * @interface KeyOption
 * @description 키보드 키 하나의 메타 정보
 */
export interface KeyOption {
    /** 사용자에게 표시할 이름 */
    label: string;
    /** Web KeyboardEvent.code — SVG data-key 와 일치 */
    value: string;
    /** Electron globalShortcut Accelerator 형식 */
    accelerator: string;
    /** Win32 Virtual Key Code */
    vkCode: number;
}

/** 모든 매크로 대상 키 목록 */
export const TARGET_KEYS: KeyOption[] = [
    // 알파벳 A–Z
    ...Array.from({ length: 26 }, (_, i) => {
        const ch = String.fromCharCode(65 + i);
        return { label: ch, value: `Key${ch}`, accelerator: ch, vkCode: 0x41 + i };
    }),
    // 숫자 0–9
    ...Array.from({ length: 10 }, (_, i) => ({
        label: `${i}`, value: `Digit${i}`, accelerator: `${i}`, vkCode: 0x30 + i,
    })),
    // 기능키 F1–F12
    ...Array.from({ length: 12 }, (_, i) => ({
        label: `F${i + 1}`, value: `F${i + 1}`, accelerator: `F${i + 1}`, vkCode: 0x70 + i,
    })),
    // 특수키
    { label: 'Enter',        value: 'Enter',       accelerator: 'Return',      vkCode: 0x0D },
    { label: 'Space',        value: 'Space',        accelerator: 'Space',       vkCode: 0x20 },
    { label: 'Escape',       value: 'Escape',       accelerator: 'Escape',      vkCode: 0x1B },
    { label: 'Backspace',    value: 'Backspace',    accelerator: 'Backspace',   vkCode: 0x08 },
    { label: 'Tab',          value: 'Tab',          accelerator: 'Tab',         vkCode: 0x09 },
    { label: 'Insert',       value: 'Insert',       accelerator: 'Insert',      vkCode: 0x2D },
    { label: 'Delete',       value: 'Delete',       accelerator: 'Delete',      vkCode: 0x2E },
    { label: 'Home',         value: 'Home',         accelerator: 'Home',        vkCode: 0x24 },
    { label: 'End',          value: 'End',          accelerator: 'End',         vkCode: 0x23 },
    { label: 'Page Up',      value: 'PageUp',       accelerator: 'PageUp',      vkCode: 0x21 },
    { label: 'Page Down',    value: 'PageDown',     accelerator: 'PageDown',    vkCode: 0x22 },
    // 방향키
    { label: '↑',            value: 'ArrowUp',      accelerator: 'Up',          vkCode: 0x26 },
    { label: '↓',            value: 'ArrowDown',    accelerator: 'Down',        vkCode: 0x28 },
    { label: '←',            value: 'ArrowLeft',    accelerator: 'Left',        vkCode: 0x25 },
    { label: '→',            value: 'ArrowRight',   accelerator: 'Right',       vkCode: 0x27 },
    // 제어키
    { label: 'Caps Lock',    value: 'CapsLock',     accelerator: 'CapsLock',    vkCode: 0x14 },
    { label: 'Num Lock',     value: 'NumLock',      accelerator: 'Numlock',     vkCode: 0x90 },
    { label: 'Scroll Lock',  value: 'ScrollLock',   accelerator: 'Scrolllock',  vkCode: 0x91 },
    { label: 'Print Screen', value: 'PrintScreen',  accelerator: 'PrintScreen', vkCode: 0x2C },
    { label: 'Pause',        value: 'Pause',        accelerator: 'Pause',       vkCode: 0x13 },
    // 기호
    { label: '-',  value: 'Minus',        accelerator: '-',   vkCode: 0xBD },
    { label: '=',  value: 'Equal',        accelerator: '=',   vkCode: 0xBB },
    { label: '[',  value: 'BracketLeft',  accelerator: '[',   vkCode: 0xDB },
    { label: ']',  value: 'BracketRight', accelerator: ']',   vkCode: 0xDD },
    { label: '\\', value: 'Backslash',    accelerator: '\\',  vkCode: 0xDC },
    { label: ';',  value: 'Semicolon',    accelerator: ';',   vkCode: 0xBA },
    { label: "'",  value: 'Quote',        accelerator: "'",   vkCode: 0xDE },
    { label: ',',  value: 'Comma',        accelerator: ',',   vkCode: 0xBC },
    { label: '.',  value: 'Period',       accelerator: '.',   vkCode: 0xBE },
    { label: '/',  value: 'Slash',        accelerator: '/',   vkCode: 0xBF },
    { label: '`',  value: 'Backquote',    accelerator: '`',   vkCode: 0xC0 },
    // 넘패드
    ...Array.from({ length: 10 }, (_, i) => ({
        label: `Num ${i}`, value: `Numpad${i}`, accelerator: `num${i}`, vkCode: 0x60 + i,
    })),
    { label: 'Num +',     value: 'NumpadAdd',      accelerator: 'numadd',  vkCode: 0x6B },
    { label: 'Num -',     value: 'NumpadSubtract', accelerator: 'numsub',  vkCode: 0x6D },
    { label: 'Num *',     value: 'NumpadMultiply', accelerator: 'nummult', vkCode: 0x6A },
    { label: 'Num /',     value: 'NumpadDivide',   accelerator: 'numdiv',  vkCode: 0x6F },
    { label: 'Num .',     value: 'NumpadDecimal',  accelerator: 'numdec',  vkCode: 0x6E },
    { label: 'Num Enter', value: 'NumpadEnter',    accelerator: 'Return',  vkCode: 0x0D },
];

/**
 * @description 단축키로 사용 가능한 키 목록 (Target Key 목록과 동일).
 * Modifier 단독키(Shift, Ctrl, Alt, Meta)는 globalShortcut에 단독 등록이 불가하므로 제외됩니다.
 */
export const SHORTCUT_KEYS: KeyOption[] = TARGET_KEYS;

/** Web code로 KeyOption을 찾습니다. */
export function findKeyByCode(code: string): KeyOption | undefined {
    return TARGET_KEYS.find(k => k.value === code);
}

/** Web code로 표시 이름을 반환합니다. */
export function getKeyLabel(code: string): string {
    return findKeyByCode(code)?.label ?? code;
}

/** Web code로 Electron Accelerator를 반환합니다. */
export function getKeyAccelerator(code: string): string {
    return findKeyByCode(code)?.accelerator ?? code;
}

/** Web code로 Win32 VK Code를 반환합니다. */
export function getKeyVkCode(code: string): number {
    return findKeyByCode(code)?.vkCode ?? 0x41;
}
