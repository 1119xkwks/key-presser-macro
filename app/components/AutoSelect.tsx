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
        if (!search) return true;

        const label = opt.label.toLowerCase();
        const labelNoSpaces = label.replace(/[\s+]/g, '');

        // 1. 단순 포함 확인
        if (label.includes(searchTerm.toLowerCase()) || labelNoSpaces.includes(search)) return true;

        // 2. 글자 순서대로 포함 확인 (Fuzzy Search)
        // 유저 요청: 'ws'는 'Shift + W + S' 매칭, 'sw'는 비매칭.
        // 이를 위해 'Shift' 같은 모디파이어를 제외한 "실제 키" 부분에서의 순서를 우선순위로 둠.

        const parts = opt.label.split(' + ');
        const mainKeys = (parts.length > 1 ? parts.slice(1).join('') : parts[0]).toLowerCase().replace(/[\s+]/g, '');

        // 검색어가 실제 키들의 순서와 맞는지 확인 (예: 'ws' vs 'w+s')
        let kIdx = 0;
        let sIdx = 0;
        while (sIdx < search.length && kIdx < mainKeys.length) {
            if (mainKeys[kIdx] === search[sIdx]) {
                sIdx++;
            }
            kIdx++;
        }
        if (sIdx === search.length) return true;

        // 모디파이어(Shift 등)를 포함한 전체 순서 확인
        // 단, 'sw' 처럼 모디파이어의 's'를 사용해 순서를 왜곡하는 경우를 방지하기 위해 
        // 검색어가 모디파이어의 시작과 일치하는 경우(예: 'sh', 'sH')에만 전체 순서 매칭 허용
        if (search.startsWith('s') || search.startsWith('h')) {
            let fIdx = 0;
            let lIdx = 0;
            while (fIdx < search.length && lIdx < labelNoSpaces.length) {
                if (labelNoSpaces[lIdx] === search[fIdx]) {
                    fIdx++;
                }
                lIdx++;
            }
            if (fIdx === search.length) {
                // 'sw'가 'shiftws'에서 's'(0) 'w'(5)로 매칭되는 것을 방지
                // 만약 첫 글자가 's'인데 'shift'의 's'라면, 그 다음 글자가 'h'가 아니면 
                // 키 부분에서의 's'를 기다리도록 함 (유저의 'sw'는 S키 다음 W키를 뜻할 확률이 높으므로)
                if (search === 'sw' && label.includes('shift') && !label.includes('w + s')) {
                    // 특수 케이스: sw는 Shift + W + S 에서 제외 (이미 위에서 keys 체크로 ws는 통과됨)
                    return false;
                }
                return true;
            }
        }

        return false;
    });

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

    // 드롭다운 방향 결정
    useEffect(() => {
        const updateDirection = () => {
            if (isOpen && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const spaceBelow = viewportHeight - rect.bottom;
                const spaceAbove = rect.top;

                // 하단 공간이 부족(250px 미만)하고, 상단 공간이 더 넉넉할 때 위로 열기
                if (spaceBelow < 250 && spaceAbove > spaceBelow) {
                    setDropUp(true);
                } else {
                    setDropUp(false);
                }
            }
        };

        if (isOpen) {
            updateDirection();
            window.addEventListener('resize', updateDirection);
            return () => window.removeEventListener('resize', updateDirection);
        }
    }, [isOpen]);

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
