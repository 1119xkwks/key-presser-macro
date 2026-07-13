/**
 * @file electron/constants.js
 * @description UI(렌더러)와 Electron 메인 프로세스가 공유하는 설정 상수.
 *              메인 프로세스(CommonJS)에서 require로 불러올 수 있도록 CJS 형식으로 작성한다.
 *              (electron-builder `files`에 `electron/**`가 포함되므로 패키징 시에도 함께 배포된다)
 */

/** 인터벌 입력 최소값 (ms) */
const INTERVAL_INPUT_MIN = 10;

/** 인터벌 입력 최대값 (ms) — 1시간 */
const INTERVAL_INPUT_MAX = 3_600_000;

module.exports = { INTERVAL_INPUT_MIN, INTERVAL_INPUT_MAX };
