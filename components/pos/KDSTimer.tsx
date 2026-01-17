import React, { useState, useEffect } from 'react';

interface KDSTimerProps {
    startTime: string;
}

const KDSTimer: React.FC<KDSTimerProps> = ({ startTime }) => {
    const [elapsed, setElapsed] = useState(0);

    const calculateElapsed = () => {
        const start = new Date(startTime).getTime();
        const now = new Date().getTime();
        return Math.floor((now - start) / 1000); // seconds
    };

    useEffect(() => {
        // Initial set
        setElapsed(calculateElapsed());

        const interval = setInterval(() => {
            setElapsed(calculateElapsed());
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime]);

    const formatTime = (totalSeconds: number) => {
        if (totalSeconds < 0) return "00:00"; // Should not happen ideally
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerColor = (totalSeconds: number) => {
        if (totalSeconds < 600) return 'text-green-600 dark:text-green-400'; // < 10 mins
        if (totalSeconds < 1200) return 'text-yellow-600 dark:text-yellow-400'; // 10-20 mins
        return 'text-red-600 dark:text-red-400 animate-pulse font-bold'; // > 20 mins
    };

    return (
        <div className={`text-sm font-mono whitespace-nowrap ${getTimerColor(elapsed)}`}>
            ⏱ {formatTime(elapsed)}
        </div>
    );
};

export default KDSTimer;
