import { describe, it, expect } from 'vitest';
import { validateField, validateFields, trimFieldValues } from '../paymentMethodValidation';
import type { PaymentProviderFieldRequirement } from '../../hooks/usePaymentProviders';

const emailReq: PaymentProviderFieldRequirement = {
    db_field: 'email',
    label: 'Email address',
    type: 'email',
    required: true,
};

const phoneReq: PaymentProviderFieldRequirement = {
    db_field: 'phoneNumber',
    label: 'Phone number',
    type: 'tel',
    required: true,
};

const optionalTextReq: PaymentProviderFieldRequirement = {
    db_field: 'description',
    label: 'Description',
    type: 'text',
    required: false,
};

const patternReq: PaymentProviderFieldRequirement = {
    db_field: 'pixKey',
    label: 'Pix key',
    type: 'text',
    required: true,
    pattern: '^[0-9]{11}$',
    errorMessage: 'Enter an 11-digit Pix key',
};

describe('validateField', () => {
    it('flags a missing required field', () => {
        expect(validateField(emailReq, '')).toBe('Email address is required');
    });

    it('flags whitespace-only values as missing', () => {
        expect(validateField(emailReq, '   ')).toBe('Email address is required');
    });

    it('allows an empty optional field', () => {
        expect(validateField(optionalTextReq, '')).toBeNull();
    });

    it('rejects a malformed email', () => {
        expect(validateField(emailReq, 'not-an-email')).toBe('Enter a valid email address');
    });

    it('accepts a valid email', () => {
        expect(validateField(emailReq, 'user@example.com')).toBeNull();
    });

    it('rejects a too-short phone number', () => {
        expect(validateField(phoneReq, '123')).toBe('Enter a valid phone number');
    });

    it('accepts a plausible phone number', () => {
        expect(validateField(phoneReq, '+506 8888 8888')).toBeNull();
    });

    it('uses a backend-provided pattern when present', () => {
        expect(validateField(patternReq, '123')).toBe('Enter an 11-digit Pix key');
        expect(validateField(patternReq, '12345678901')).toBeNull();
    });
});

describe('validateFields', () => {
    it('only returns entries for invalid fields', () => {
        const errors = validateFields([emailReq, phoneReq, optionalTextReq], {
            email: 'user@example.com',
            phoneNumber: '',
            description: '',
        });

        expect(errors).toEqual({ phoneNumber: 'Phone number is required' });
    });

    it('returns an empty object when everything is valid', () => {
        const errors = validateFields([emailReq, optionalTextReq], {
            email: 'user@example.com',
            description: 'note',
        });

        expect(errors).toEqual({});
    });
});

describe('trimFieldValues', () => {
    it('trims every value in the map', () => {
        expect(trimFieldValues({ a: '  hi  ', b: 'ok' })).toEqual({ a: 'hi', b: 'ok' });
    });
});
