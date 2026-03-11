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

    // Track the element that was focused BEFORE the keyboard button was pressed
    const focusTarget = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

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
                    className="fixed bottom-0 left-0 right-0 z-[390] bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl p-2 pb-3"
                    onMouseDown={(e) => e.preventDefault()} // never steal focus
                >
                    {/* Mode switch tabs */}
                    <div className="flex items-center gap-2 mb-2 px-1">
                        <button
                            onMouseDown={(e) => { e.preventDefault(); setMode('qwerty'); }}
                            className={`text-xs px-3 py-1 rounded-md font-bold transition-all ${mode === 'qwerty' ? 'bg-[var(--theme-color)] text-white' : 'text-gray-500 dark:text-gray-400'}`}
                        >ABC</button>
                        <button
                            onMouseDown={(e) => { e.preventDefault(); setMode('numpad'); }}
                            className={`text-xs px-3 py-1 rounded-md font-bold transition-all ${mode === 'numpad' ? 'bg-[var(--theme-color)] text-white' : 'text-gray-500 dark:text-gray-400'}`}
                        >123</button>
                    </div>

                    {mode === 'qwerty' ? (
                        <div className="space-y-1.5">
                            {rows.map((row, ri) => (
                                <div key={ri} className="flex justify-center gap-1">
                                    {ri === 3 && (
                                        // Shift key
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); setShift(s => !s); }}
                                            className={`${keyAccent} text-xs w-10 h-9 ${shift ? 'ring-2 ring-[var(--theme-color)]' : ''}`}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill={shift ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                                <path d="M12 2L2 12h5v8h10v-8h5z" />
                                            </svg>
                                        </button>
                                    )}
                                    {row.map(key => (
                                        <button
                                            key={key}
                                            onMouseDown={(e) => { e.preventDefault(); handleKey(key); }}
                                            className={`${keyDefault} text-sm w-9 h-9`}
                                        >
                                            {key}
                                        </button>
                                    ))}
                                    {ri === 2 && (
                                        // Backspace at end of row 2
                                        <button
                                            onMouseDown={(e) => { e.preventDefault(); handleBackspace(); }}
                                            className={`${keyDanger} w-12 h-9`}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
                                                <line x1="12" y1="10" x2="16" y2="14" />
                                                <line x1="16" y1="10" x2="12" y2="14" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                            {/* Bottom row: Space + Enter */}
                            <div className="flex justify-center gap-1 mt-0.5">
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleKey('@'); }}
                                    className={`${keyDefault} text-xs w-10 h-9`}
                                >@</button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleKey('-'); }}
                                    className={`${keyDefault} text-xs w-10 h-9`}
                                >-</button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleSpace(); }}
                                    className={`${keyDefault} text-sm flex-1 max-w-[220px] h-9`}
                                >Space</button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleKey('/'); }}
                                    className={`${keyDefault} text-xs w-10 h-9`}
                                >/</button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleEnter(); }}
                                    className={`${keyAccent} text-xs w-14 h-9 font-bold`}
                                >↵</button>
                            </div>
                        </div>
                    ) : (
                        /* Numpad mode */
                        <div className="flex gap-2 justify-center">
                            <div className="space-y-1.5">
                                {NUMPAD_ROWS.map((row, ri) => (
                                    <div key={ri} className="flex gap-1.5">
                                        {row.map(key => (
                                            <button
                                                key={key}
                                                onMouseDown={(e) => { e.preventDefault(); handleKey(key); }}
                                                className={`${keyDefault} text-lg font-semibold w-16 h-12`}
                                            >
                                                {key}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleBackspace(); }}
                                    className={`${keyDanger} w-16 h-12`}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
                                        <line x1="12" y1="10" x2="16" y2="14" />
                                        <line x1="16" y1="10" x2="12" y2="14" />
                                    </svg>
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); handleEnter(); }}
                                    className={`${keyAccent} w-16 flex-1 font-bold text-lg`}
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
