import React, { useState, useCallback, useRef } from 'react';

// ─── helpers ───────────────────────────────────────────────────────────────

/**
 * Injects text into the currently focused input / textarea using the native
 * value setter so React controlled components pick up the change.
 */
function insertAtCursor(text: string) {
    const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const newValue = before + text + after;

    // Use React's internal setter so the synthetic onChange fires
    const nativeSetter = Object.getOwnPropertyDescriptor(
        el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
    )?.set;
    nativeSetter?.call(el, newValue);
    el.dispatchEvent(new Event('input', { bubbles: true }));

    // Restore caret position after the inserted text
    const newPos = start + text.length;
    requestAnimationFrame(() => el.setSelectionRange(newPos, newPos));
}

function backspace() {
    const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;

    let newValue: string;
    let newPos: number;

    if (start !== end) {
        // Delete selection
        newValue = el.value.slice(0, start) + el.value.slice(end);
        newPos = start;
    } else if (start > 0) {
        // Delete character before caret
        newValue = el.value.slice(0, start - 1) + el.value.slice(start);
        newPos = start - 1;
    } else {
        return;
    }

    const nativeSetter = Object.getOwnPropertyDescriptor(
        el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
    )?.set;
    nativeSetter?.call(el, newValue);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    requestAnimationFrame(() => el.setSelectionRange(newPos, newPos));
}

// ─── Key layouts ────────────────────────────────────────────────────────────

const ROWS_LOWER = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', ',', '?'],
];

const ROWS_UPPER = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', ',', '?'],
];

const NUMPAD_ROWS = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['.', '0', '-'],
];

// ─── Component ──────────────────────────────────────────────────────────────

const VirtualKeyboard: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [shift, setShift] = useState(false);
    const [mode, setMode] = useState<'qwerty' | 'numpad'>('qwerty');
    const [position, setPosition] = useState({ x: window.innerWidth - 740, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Track the element that was focused BEFORE the keyboard button was pressed
    const focusTarget = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

    // Auto-open on input focus
    React.useEffect(() => {
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                // Ignore special inputs that might not need the keyboard, e.g., checkboxes, radio buttons
                if (target.tagName === 'INPUT' && ['checkbox', 'radio', 'range', 'color', 'file'].includes((target as HTMLInputElement).type)) {
                    return;
                }

                // Don't auto-open if it's already open, but DO update the focus target
                focusTarget.current = target as HTMLInputElement | HTMLTextAreaElement;

                // Small delay to ensure the focus event has fully resolved
                setTimeout(() => setOpen(true), 50);
            }
        };

        // Listen for focusin on the document (captures focus events bubbled up)
        document.addEventListener('focusin', handleFocusIn);

        return () => {
            document.removeEventListener('focusin', handleFocusIn);
        };
    }, []);

    const handleToggle = () => {
        if (!open) {
            // Record current focus target before it blurs
            const el = document.activeElement;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                focusTarget.current = el as HTMLInputElement | HTMLTextAreaElement;
            }
        }
        setOpen(o => !o);
    };

    // Drag handlers
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        // Prevent background scrolling/interactions
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setIsDragging(true);
        dragOffset.current = {
            x: clientX - position.x,
            y: clientY - position.y
        };
    };

    React.useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging) return;

            // Block browser default touch behavior (scrolling) during drag
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();

            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

            // Constrain to viewport
            const newX = Math.max(10, Math.min(window.innerWidth - 700, clientX - dragOffset.current.x));
            const newY = Math.max(10, Math.min(window.innerHeight - 350, clientY - dragOffset.current.y));

            setPosition({ x: newX, y: newY });
        };
        const handleEnd = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, position]);

    /** Restore focus to the target field before typing */
    const ensureFocus = useCallback(() => {
        const el = document.activeElement;
        // If already focused on an input that's not the KB button — use it
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
            focusTarget.current = el as HTMLInputElement | HTMLTextAreaElement;
            return;
        }
        focusTarget.current?.focus();
    }, []);

    const handleKey = useCallback((char: string) => {
        ensureFocus();
        insertAtCursor(char);
        if (shift && char.match(/[a-zA-Z]/)) setShift(false);
    }, [shift, ensureFocus]);

    const handleBackspace = useCallback(() => {
        ensureFocus();
        backspace();
    }, [ensureFocus]);

    const handleEnter = useCallback(() => {
        ensureFocus();
        insertAtCursor('\n');
    }, [ensureFocus]);

    const handleSpace = useCallback(() => {
        ensureFocus();
        insertAtCursor(' ');
    }, [ensureFocus]);

    const rows = shift ? ROWS_UPPER : ROWS_LOWER;

    // Common key style
    const keyBase =
        'flex items-center justify-center rounded-lg font-medium select-none cursor-pointer active:scale-95 transition-all';
    const keyDefault =
        `${keyBase} bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600`;
    const keyAccent =
        `${keyBase} bg-[var(--theme-color)]/10 dark:bg-[var(--theme-color)]/20 text-[var(--theme-color)] border border-[var(--theme-color)]/30 hover:bg-[var(--theme-color)]/20`;
    const keyDanger =
        `${keyBase} bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500`;

    return (
        <>
            {/* Floating toggle button */}
            <button
                onMouseDown={(e) => {
                    // Prevent focus loss from the target input
                    e.preventDefault();
                    handleToggle();
                }}
                title="Virtual keyboard"
                className={`fixed bottom-5 right-5 z-[400] w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all
                    ${open
                        ? 'bg-[var(--theme-color)] text-white rotate-0 scale-110'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-[var(--theme-color)] hover:text-[var(--theme-color)]'
                    }`}
            >
                {open ? (
                    // X icon when open
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                ) : (
                    // Keyboard icon
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="2" y="6" width="20" height="13" rx="2" />
                        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M10 14h4" strokeLinecap="round" />
                    </svg>
                )}
            </button>

            {/* Keyboard panel */}
            {open && (
                <div
                    className="fixed z-[390] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl p-3 pb-4 rounded-2xl overflow-hidden w-[720px]"
                    style={{ left: position.x, top: position.y }}
                    onMouseDown={(e) => e.preventDefault()} // never steal focus
                >
                    {/* Drag Handle & Header */}
                    <div
                        className="flex items-center justify-between mb-2 cursor-move bg-gray-200/50 dark:bg-gray-700/50 -mx-3 -mt-3 p-1.5 px-4 border-b border-gray-300 dark:border-gray-600 active:bg-gray-300 dark:active:bg-gray-600 transition-colors"
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-1 bg-gray-400 dark:bg-gray-500 rounded-full" />
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Drag to Move</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onMouseDown={(e) => { e.preventDefault(); setMode('qwerty'); }}
                                className={`text-sm px-5 py-1.5 rounded-md font-bold transition-all ${mode === 'qwerty' ? 'bg-[var(--theme-color)] text-white' : 'text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'}`}
                            >ABC</button>
                            <button
                                onMouseDown={(e) => { e.preventDefault(); setMode('numpad'); }}
                                className={`text-sm px-5 py-1.5 rounded-md font-bold transition-all ${mode === 'numpad' ? 'bg-[var(--theme-color)] text-white' : 'text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'}`}
                            >123</button>
                        </div>
                    </div>

                    {mode === 'qwerty' ? (
                        <div className="space-y-1.5">
                            {rows.map((row, ri) => (
                                <div key={ri} className="flex justify-center gap-1.5">
                                    {ri === 3 && (
                                        // Shift key
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); setShift(s => !s); }}
                                            className={`${keyAccent} text-sm w-16 h-12 ${shift ? 'ring-2 ring-[var(--theme-color)]' : ''}`}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill={shift ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                                                <path d="M12 2L2 12h5v8h10v-8h5z" />
                                            </svg>
                                        </button>
                                    )}
                                    {row.map(key => (
                                        <button
                                            key={key}
                                            onMouseDown={(e) => { e.preventDefault(); handleKey(key); }}
                                            className={`${keyDefault} text-2xl font-bold w-14 h-12`}
                                        >
                                            {key}
                                        </button>
                                    ))}
                                    {ri === 2 && (
                                        // Backspace at end of row 2
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); handleBackspace(); }}
                                            className={`${keyDanger} w-16 h-12`}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
                                                <line x1="12" y1="10" x2="16" y2="14" />
                                                <line x1="16" y1="10" x2="12" y2="14" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                            {/* Bottom row: Space + Enter */}
                            <div className="flex justify-center gap-1.5 mt-0.5">
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleKey('@'); }}
                                    className={`${keyDefault} text-sm w-16 h-12`}
                                >@</button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleKey('-'); }}
                                    className={`${keyDefault} text-sm w-16 h-12`}
                                >-</button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleSpace(); }}
                                    className={`${keyDefault} text-lg flex-1 max-w-[320px] h-12`}
                                >Space</button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleKey('/'); }}
                                    className={`${keyDefault} text-sm w-16 h-12`}
                                >/</button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleEnter(); }}
                                    className={`${keyAccent} text-lg w-20 h-12 font-bold`}
                                >↵</button>
                            </div>
                        </div>
                    ) : (
                        /* Numpad mode */
                        <div className="flex gap-4 justify-center">
                            <div className="space-y-1.5">
                                {NUMPAD_ROWS.map((row, ri) => (
                                    <div key={ri} className="flex gap-2">
                                        {row.map(key => (
                                            <button
                                                key={key}
                                                onMouseDown={(e) => { e.preventDefault(); handleKey(key); }}
                                                className={`${keyDefault} text-2xl font-semibold w-20 h-14`}
                                            >
                                                {key}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col gap-2">
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleBackspace(); }}
                                    className={`${keyDanger} w-20 h-14 flex items-center justify-center`}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
                                        <line x1="12" y1="10" x2="16" y2="14" />
                                        <line x1="16" y1="10" x2="12" y2="14" />
                                    </svg>
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleEnter(); }}
                                    className={`${keyAccent} w-20 flex-1 font-bold text-2xl`}
                                >↵</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default VirtualKeyboard;
