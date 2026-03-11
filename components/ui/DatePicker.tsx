import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay,
    isBefore, startOfDay, parse, isValid
} from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
    value: string; // 'yyyy-MM-dd'
    onChange: (val: string) => void;
    min?: string;  // 'yyyy-MM-dd' — locks dates before this
    placeholder?: string;
    className?: string;
}

const CALENDAR_W = 288; // w-72

const DatePicker: React.FC<DatePickerProps> = ({
    value, onChange, min, placeholder = 'Select date', className = ''
}) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, openUp: false });
    const [viewDate, setViewDate] = useState<Date>(() => {
        if (value) {
            const d = parse(value, 'yyyy-MM-dd', new Date());
            return isValid(d) ? d : new Date();
        }
        return new Date();
    });

    const triggerRef = useRef<HTMLButtonElement>(null);
    const calRef = useRef<HTMLDivElement>(null);

    const minDate = min ? startOfDay(parse(min, 'yyyy-MM-dd', new Date())) : null;
    const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : null;

    // Compute fixed position from the trigger button's bounding rect
    const openCalendar = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const CALENDAR_H = 360; // approx height
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < CALENDAR_H && rect.top > CALENDAR_H;

        let left = rect.left;
        // don't overflow right edge
        if (left + CALENDAR_W > window.innerWidth - 8) {
            left = window.innerWidth - CALENDAR_W - 8;
        }

        setPos({
            top: openUp ? rect.top - CALENDAR_H - 4 : rect.bottom + 4,
            left,
            openUp,
        });
        setOpen(o => !o);
    }, []);

    // Close on outside click or scroll
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                triggerRef.current?.contains(e.target as Node) ||
                calRef.current?.contains(e.target as Node)
            ) return;
            setOpen(false);
        };
        const scrollHandler = () => setOpen(false);
        document.addEventListener('mousedown', handler);
        window.addEventListener('scroll', scrollHandler, true);
        return () => {
            document.removeEventListener('mousedown', handler);
            window.removeEventListener('scroll', scrollHandler, true);
        };
    }, [open]);

    const handleSelect = (day: Date) => {
        if (minDate && isBefore(day, minDate)) return;
        onChange(format(day, 'yyyy-MM-dd'));
        setOpen(false);
    };

    const isDisabled = (day: Date) =>
        !!(minDate && isBefore(startOfDay(day), minDate));

    // Build calendar grid
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let cur = calStart;
    while (cur <= calEnd) { days.push(cur); cur = addDays(cur, 1); }

    const displayValue = selectedDate && isValid(selectedDate)
        ? format(selectedDate, 'dd/MM/yyyy') : '';

    const calendar = (
        <div
            ref={calRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: CALENDAR_W, zIndex: 9999 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3"
        >
            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
                <button
                    type="button"
                    onClick={() => setViewDate(v => subMonths(v, 1))}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {format(viewDate, 'MMMM yyyy')}
                </span>
                <button
                    type="button"
                    onClick={() => setViewDate(v => addMonths(v, 1))}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-0.5">
                {days.map((day, i) => {
                    const isSelected = selectedDate && isValid(selectedDate) && isSameDay(day, selectedDate);
                    const disabled = isDisabled(day);
                    const isOtherMonth = !isSameMonth(day, viewDate);
                    const isToday = isSameDay(day, new Date());
                    return (
                        <button
                            key={i}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleSelect(day)}
                            className={`
                                relative h-8 w-full text-xs rounded-lg font-medium transition-all
                                ${isSelected
                                    ? 'bg-[var(--theme-color)] text-white shadow-sm'
                                    : disabled
                                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                        : isOtherMonth
                                            ? 'text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            : 'text-gray-800 dark:text-gray-200 hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)]'
                                }
                            `}
                        >
                            {format(day, 'd')}
                            {isToday && !isSelected && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--theme-color)]" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Today shortcut */}
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                    type="button"
                    onClick={() => handleSelect(new Date())}
                    disabled={!!minDate && isBefore(startOfDay(new Date()), minDate)}
                    className="w-full text-xs text-center text-[var(--theme-color)] font-semibold py-1 hover:bg-[var(--theme-color)]/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Today
                </button>
            </div>
        </div>
    );

    return (
        <div className={`relative ${className}`}>
            {/* Trigger button */}
            <button
                ref={triggerRef}
                type="button"
                onClick={openCalendar}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-left focus:ring-2 focus:ring-[var(--theme-color)] outline-none transition-all hover:border-[var(--theme-color)]/50"
            >
                <Calendar size={15} className="text-gray-400 flex-shrink-0" />
                <span className={displayValue ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
                    {displayValue || placeholder}
                </span>
            </button>

            {/* Portal calendar — escapes any overflow container */}
            {open && createPortal(calendar, document.body)}
        </div>
    );
};

export default DatePicker;
