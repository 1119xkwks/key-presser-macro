/**
 * @file types/macro.ts
 * @description 매크로 동작에 필요한 타입을 정의합니다.
 */

export type MacroMode = 'HOLD' | 'PERIODIC';

export interface MacroConfig {
    /**
     * 매크로를 실행할 키 (Web KeyboardEvent.code, 예: 'KeyA', 'Enter').
     * 마우스 버튼도 허용: 'MouseLeft' | 'MouseMiddle' | 'MouseRight' (Target 전용)
     */
    targetKey: string;
    /** 매크로 모드: HOLD (계속 누름), PERIODIC (주기적 입력) */
    mode: MacroMode;
    /** PERIODIC 모드일 때 입력 주기 (ms) */
    interval: number;
    /**
     * PERIODIC 모드일 때 인터벌에 매번 더해지는 랜덤 편차 폭 (±ms, 0이면 비활성).
     * 매 입력마다 [-jitter, +jitter] 범위의 랜덤 오프셋이 인터벌에 적용된다.
     * interval - jitter ≥ INTERVAL_INPUT_MIN, interval + jitter ≤ INTERVAL_INPUT_MAX 를 만족해야 한다.
     */
    jitter: number;
    /** PERIODIC 모드일 때 반복 횟수 (0이면 무제한) */
    repeatCount: number;
    /** 시작/중지 단축키 (예: 'F5', 'CommandOrControl+S') */
    startStopShortcut: string;
    /** Shift 키를 함께 누를지 여부 */
    useShift: boolean;
}

export interface MacroStatus {
    /** 현재 실행 중인지 여부 */
    isRunning: boolean;
    /** 현재까지 실행된 횟수 (PERIODIC 모드 전용) */
    currentCount: number;
}
