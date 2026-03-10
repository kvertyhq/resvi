import React, { useState, useRef, useEffect } from 'react';
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
    label?: string;
    className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
    value, onChange, min, placeholder = 'Select date', className = ''
}) => {
    const [open, setOpen] = useState(false);
    const [viewDate, setViewDate] = useState<Date>(() => {
        if (value) {
            const d = parse(value, 'yyyy-MM-dd', new Date());
            return isValid(d) ? d : new Date();
        }
        return new Date();
    });
    const ref = useRef<HTMLDivElement>(null);

    const minDate = min ? startOfDay(parse(min, 'yyyy-MM-dd', new Date())) : null;
    const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : null;

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (day: Date) => {
        if (minDate && isBefore(day, minDate)) return;
        onChange(format(day, 'yyyy-MM-dd'));
        setOpen(false);
    };

    const isDisabled = (day: Date) => {
        if (minDate && isBefore(startOfDay(day), minDate)) return true;
        return false;
    };

    // Build calendar grid
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Mon start
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let cur = calStart;
    while (cur <= calEnd) {
        days.push(cur);
        cur = addDays(cur, 1);
    }

    const displayValue = selectedDate && isValid(selectedDate)
        ? format(selectedDate, 'dd/MM/yyyy')
        : '';

    return (
        <div className={`relative ${className}`} ref={ref}>
            {/* Input trigger */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-left focus:ring-2 focus:ring-[var(--theme-color)] outline-none transition-all hover:border-[var(--theme-color)]/50"
            >
                <Calendar size={15} className="text-gray-400 flex-shrink-0" />
                <span className={displayValue ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
                    {displayValue || placeholder}
                </span>
            </button>

            {/* Dropdown Calendar */}
            {open && (
                <div className="absolute z-50 bottom-full mb-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 w-72">
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
            )}
        </div>
    );
};

export default DatePicker;
