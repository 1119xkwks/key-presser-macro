/**
 * @file app/components/AutoSelect.tsx
 * @description 입력 필터링 기능이 포함된 자동 완성 셀렉트 컴포넌트입니다.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { KeyOption } from '@/app/constants/keys';

interface AutoSelectProps {
    label: string;
    options: KeyOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

/**
 * @component AutoSelect
 * @description 사용자가 입력함에 따라 옵션을 필터링하여 보여주는 커스텀 셀렉트 박스입니다.
 */
export const AutoSelect: React.FC<AutoSelectProps> = ({
    label,
    options,
    value,
    onChange,
    placeholder = '검색 또는 선택...',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropUp, setDropUp] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 현재 선택된 값의 라벨 찾기
    const selectedOption = options.find((opt) => opt.value === value);

    // 옵션 필터링 로직
    const filteredOptions = options.filter((opt) => {
        const search = searchTerm.toLowerCase().replace(/[\s+]/g, '');
        // 유저 요청: 검색어가 비어있으면 목록을 보여주지 않음
        if (!search) return false;

        const label = opt.label.toLowerCase();
        const labelNoSpaces = label.replace(/[\s+]/g, '');

        // 1. 단순 포함 확인
        if (label.includes(searchTerm.toLowerCase()) || labelNoSpaces.includes(search)) return true;

        // ... (생략된 기존 Fuzzy Search 로직)
        const parts = opt.label.split(' + ');
        const mainKeys = (parts.length > 1 ? parts.slice(1).join('') : parts[0]).toLowerCase().replace(/[\s+]/g, '');
        let kIdx = 0;
        let sIdx = 0;
        while (sIdx < search.length && kIdx < mainKeys.length) {
            if (mainKeys[kIdx] === search[sIdx]) {
                sIdx++;
            }
            kIdx++;
        }
        if (sIdx === search.length) return true;

        return false;
    });

    // 선택 시 처리
    const handleSelect = (option: KeyOption) => {
        onChange(option.value);
        setSearchTerm(option.label); // 선택한 라벨을 명시적으로 세팅
        setIsOpen(false);
    };

    return (
        <div className="auto-select-container" ref={containerRef}>
            <label className="auto-select-label">{label}</label>

            <div className="auto-select-input-wrapper">
                <input
                    type="text"
                    className="auto-select-input"
                    value={isOpen ? searchTerm : selectedOption?.label || ''}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                        const keyMap: Record<string, string> = {
                            'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4', 'F5': 'F5', 'F6': 'F6',
                            'F7': 'F7', 'F8': 'F8', 'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
                            'Shift': 'Shift', 'Control': 'Ctrl', 'Alt': 'Alt', 'Tab': 'Tab',
                            'CapsLock': 'Caps Lock', 'PrintScreen': 'Print Screen', 'ScrollLock': 'Scroll Lock',
                            'Pause': 'Pause', 'Insert': 'Insert', 'Delete': 'Delete', 'Home': 'Home',
                            'End': 'End', 'PageUp': 'Page Up', 'PageDown': 'Page Down',
                            'ArrowUp': 'Arrow Up', 'ArrowDown': 'Arrow Down', 'ArrowLeft': 'Arrow Left',
                            'ArrowRight': 'Arrow Right'
                        };

                        if (keyMap[e.key]) {
                            e.preventDefault();
                            setSearchTerm(keyMap[e.key]);
                            setIsOpen(true);
                        }
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        // 현재 선택된 라벨을 입력창에 보여주어 지우기/수정 가능하게 함
                        setSearchTerm(selectedOption?.label || '');
                    }}
                    placeholder={placeholder}
                />
                <div className={`auto-select-arrow ${isOpen ? 'open' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                />
            </div>

            {isOpen && (
                <ul className={`auto-select-dropdown ${dropUp ? 'up' : ''}`}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <li
                                key={option.value}
                                className={`auto-select-option ${option.value === value ? 'selected' : ''}`}
                                onClick={() => handleSelect(option)}
                            >
                                {option.label}
                            </li>
                        ))
                    ) : (
                        <li className="auto-select-no-results">결과가 없습니다.</li>
                    )}
                </ul>
            )}
        </div>
    );
};
