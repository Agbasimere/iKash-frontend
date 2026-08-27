import type { PaymentProviderFieldRequirement } from '../hooks/usePaymentProviders';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Generic phone check (6-20 digits, optional leading + and separators). This is a
// deliberately loose fallback - real per-country rules (e.g. SINPE Movil requiring
// a Costa Rican number) should come from `req.pattern` once the backend validation
// engine (IKSH-12 dependency) exposes it.
const PHONE_PATTERN = /^\+?[0-9\s-]{6,20}$/;

/**
 * Validates a single dynamic field value against its provider requirement.
 * Returns an error message, or null when the value is valid.
 */
export function validateField(
    req: PaymentProviderFieldRequirement,
    rawValue: string
): string | null {
    const value = (rawValue ?? '').trim();

    if (req.required && value.length === 0) {
        return `${req.label} is required`;
    }

    if (value.length === 0) {
        // Optional and empty - nothing further to validate.
        return null;
    }

    if (req.pattern) {
        try {
            const regex = new RegExp(req.pattern);
            if (!regex.test(value)) {
                return req.errorMessage || `${req.label} is not valid`;
            }
            return null;
        } catch {
            // Malformed pattern from the backend - fall through to generic checks
            // rather than blocking the user with a broken rule.
        }
    }

    switch (req.type) {
        case 'email':
            return EMAIL_PATTERN.test(value) ? null : 'Enter a valid email address';
        case 'tel':
            return PHONE_PATTERN.test(value) ? null : 'Enter a valid phone number';
        default:
            return null;
    }
}

/**
 * Validates every required field for the currently selected provider.
 * Returns a map of db_field -> error message for only the invalid fields.
 */
export function validateFields(
    requirements: PaymentProviderFieldRequirement[],
    values: Record<string, string>
): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const req of requirements) {
        const error = validateField(req, values[req.db_field] || '');
        if (error) errors[req.db_field] = error;
    }
    return errors;
}

/** Trims every string value in a dynamic-fields map before submission. */
export function trimFieldValues(values: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, (value ?? '').trim()])
    );
}
