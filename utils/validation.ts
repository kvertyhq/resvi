/**
 * Validates and formats a UK phone number.
 * 
 * Rules:
 * - Must be a valid UK mobile number (starts with 07, +447, or 447).
 * - Removes spaces, dashes, and parentheses.
 * - Returns the number in +447xxxxxxxxx format.
 * - Returns null if invalid.
 * 
 * @param phone The phone number string to validate.
 * @returns The formatted phone number or null.
 */
export const validateUKPhone = (phone: string): string | null => {
    // 1. Keep only digits
    let cleanPhone = phone.replace(/\D/g, '');

    // 2. Remove leading '00' (international)
    if (cleanPhone.startsWith('00')) {
        cleanPhone = cleanPhone.substring(2);
    }

    // 3. Remove leading '44' (country code) - handle potential double prefix e.g. +44+44
    // Using regex to remove one or more occurrences of 44 at start
    cleanPhone = cleanPhone.replace(/^(44)+/, '');

    // 4. Remove leading '0'
    if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.substring(1);
    }

    // 5. Check valid UK mobile format: should be 10 digits starting with 7
    // (Total 11 digits with leading 0, so 10 without)
    if (/^7[0-9]{9}$/.test(cleanPhone)) {
        return '+44' + cleanPhone;
    }

    return null;
};
