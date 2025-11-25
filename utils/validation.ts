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
    // Remove all non-numeric characters except leading +
    let cleanPhone = phone.replace(/[^0-9+]/g, '');

    // Handle leading +
    if (cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.substring(1);
    }

    // Check for UK prefix variations
    if (cleanPhone.startsWith('44')) {
        cleanPhone = '0' + cleanPhone.substring(2);
    }

    // Now cleanPhone should start with 0
    // UK mobile numbers start with 07 and are 11 digits long
    if (/^07[0-9]{9}$/.test(cleanPhone)) {
        // Format to +44
        return '+44' + cleanPhone.substring(1);
    }

    return null;
};
