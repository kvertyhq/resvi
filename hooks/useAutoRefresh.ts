import { useState, useEffect, useRef } from 'react';

const useAutoRefresh = (callback: () => void, interval = 15000) => {
    const [timeLeft, setTimeLeft] = useState(interval / 1000);
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const timerChange = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    callbackRef.current();
                    return interval / 1000;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerChange);
    }, [interval]);

    return { timeLeft };
};

export default useAutoRefresh;
