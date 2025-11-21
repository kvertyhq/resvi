
export const formatOpeningHours = (openingHours: Record<string, string[]> | undefined): string[] => {
    if (!openingHours) return [];

    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const dayNames: Record<string, string> = {
        mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun'
    };

    const groups: { start: string; end: string; time: string }[] = [];
    let currentGroup: { start: string; end: string; time: string } | null = null;

    days.forEach((day) => {
        const hours = openingHours[day]?.[0] || 'Closed';

        if (currentGroup) {
            if (currentGroup.time === hours) {
                currentGroup.end = day;
            } else {
                groups.push(currentGroup);
                currentGroup = { start: day, end: day, time: hours };
            }
        } else {
            currentGroup = { start: day, end: day, time: hours };
        }
    });

    if (currentGroup) {
        groups.push(currentGroup);
    }

    return groups.map(group => {
        const startName = dayNames[group.start];
        const endName = dayNames[group.end];

        if (group.start === group.end) {
            return `${startName}: ${group.time}`;
        } else {
            return `${startName} - ${endName}: ${group.time}`;
        }
    });
};
