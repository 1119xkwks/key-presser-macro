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
    const containerRef = useRef<HTMLDivElement>(null);

    // 현재 선택된 값의 라벨 찾기
    const selectedOption = options.find((opt) => opt.value === value);

    // 옵션 필터링 로직
    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 선택 시 처리
    const handleSelect = (option: KeyOption) => {
        onChange(option.value);
        setSearchTerm('');
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
                    onFocus={() => {
                        setIsOpen(true);
                        setSearchTerm('');
                    }}
                    placeholder={placeholder}
                />
                <div className={`auto-select-arrow ${isOpen ? 'open' : ''}`} />
            </div>

            {isOpen && (
                <ul className="auto-select-dropdown">
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
