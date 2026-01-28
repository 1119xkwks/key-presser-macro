'use client';

/**
 * @file app/page.tsx
 * @description 매크로 설정을 위한 메인 GUI 페이지입니다.
 * 모든 스타일은 globals.css에서 관리하며, TSX에는 구조를 나타내는 클래스명만 사용합니다.
 */

import { useState } from 'react';
import { useMacro } from '@/app/hooks/useMacro';
import { MacroMode } from '@/app/types/macro';
import { TARGET_KEYS, SHORTCUT_KEYS } from '@/app/constants/keys';
import { AutoSelect } from '@/app/components/AutoSelect';

export default function Home() {
  const { config, isRunning, error, updateConfig } = useMacro();
  const [warning, setWarning] = useState<string | null>(null);

  /**
   * @function handleConfigChange
   * @description 설정을 변경하기 전 동일한 키가 선택되었는지 확인합니다.
   * @param {Partial<typeof config>} newPartialConfig 
   */
  const handleConfigChange = (newPartialConfig: Partial<typeof config>) => {
    // 업데이트될 전체 설정 시뮬레이션
    const nextConfig = { ...config, ...newPartialConfig };

    // 대상 키와 단축키의 레이블을 비교하여 충돌 확인
    const targetLabel = TARGET_KEYS.find(k => k.value === nextConfig.targetKey)?.label;
    const shortcutLabel = SHORTCUT_KEYS.find(k => k.value === nextConfig.startStopShortcut)?.label;

    if (targetLabel === shortcutLabel) {
      setWarning(`실행 대상 키(${targetLabel})와 단축키가 동일할 수 없습니다.`);
      return;
    }

    setWarning(null);
    updateConfig(newPartialConfig);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>KEY PRESSER</h1>
        <p>데스크탑 키보드 매크로 시스템</p>
      </header>

      <main className="main-content">
        {/* 상태 표시 카드 */}
        <div className={`status-card ${isRunning ? 'running' : ''}`}>
          <div className="status-info">
            <span className="label">Status</span>
            <div className="indicator-group">
              <div className={`dot ${isRunning ? 'active' : ''}`} />
              <span className={`text ${isRunning ? 'active' : ''}`}>
                {isRunning ? 'RUNNING' : 'STOPPED'}
              </span>
            </div>
          </div>
        </div>

        {/* 에러 또는 경고 메시지 */}
        {(error || warning) && (
          <div className="error-box">
            ⚠️ {error || warning}
          </div>
        )}

        {/* 설정 구역 */}
        <section className="config-section">
          <AutoSelect
            label="Target Key (매크로 실행 키)"
            options={TARGET_KEYS}
            value={config.targetKey}
            onChange={(val) => handleConfigChange({ targetKey: val })}
            placeholder="키 검색 (예: A, Enter...)"
          />

          {/* Shift 옵션 */}
          <div className="input-group">
            <label className="checkbox-group">
              <input
                type="checkbox"
                checked={config.useShift}
                onChange={(e) => updateConfig({ useShift: e.target.checked })}
              />
              <div className="checkbox-custom" />
              <span className="checkbox-label">Shift 누르고 있기</span>
            </label>
          </div>

          {/* 모드 선택 */}
          <div className="input-group">
            <label>Input Mode</label>
            <div className="mode-toggle">
              {(['PERIODIC', 'HOLD'] as MacroMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateConfig({ mode })}
                  className={config.mode === mode ? 'active' : ''}
                >
                  {mode === 'PERIODIC' ? '주기적 입력' : '지속 누름'}
                </button>
              ))}
            </div>
          </div>

          {/* 주기 설정 (PERIODIC 모드일 때만) */}
          {config.mode === 'PERIODIC' && (
            <div className="input-group">
              <label>Interval (ms)</label>
              <input
                type="number"
                value={config.interval}
                onChange={(e) => updateConfig({ interval: Number(e.target.value) })}
              />
            </div>
          )}

          {/* 단축키 설정 */}
          <AutoSelect
            label="Start/Stop Shortcut (단축키)"
            options={SHORTCUT_KEYS}
            value={config.startStopShortcut}
            onChange={(val) => handleConfigChange({ startStopShortcut: val })}
            placeholder="단축키 검색 (예: F1, Ctrl...)"
          />
        </section>

        <footer className="footer-info">
          Hotkey: {config.startStopShortcut} to toggle
        </footer>
      </main>
    </div>
  );
}
