import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Stage3 from '../Stage3';
import { usePaymentProviders } from '../../../../../features/paymentMethod/hooks/usePaymentProviders';

vi.mock('../../../../../features/paymentMethod/hooks/usePaymentProviders', async () => {
    const actual = await vi.importActual
        typeof import('../../../../../features/paymentMethod/hooks/usePaymentProviders')
    >('../../../../../features/paymentMethod/hooks/usePaymentProviders');
    return {
        ...actual,
        usePaymentProviders: vi.fn(),
    };
});

const mockedUsePaymentProviders = vi.mocked(usePaymentProviders);

const bankProvider = {
    provider_id: 'bank-1',
    name: 'IBAN Bank',
    type: 'BANK' as const,
    country_code: 'CR',
    metadata: {
        ui_requirements: [
            { db_field: 'account_identifier', label: 'IBAN', type: 'text', required: true },
            { db_field: 'beneficiary_name', label: 'Account holder name', type: 'text', required: true },
        ],
    },
};

const platformProvider = {
    provider_id: 'platform-1',
    name: 'PayPal',
    type: 'PLATFORM' as const,
    country_code: null,
    metadata: {
        ui_requirements: [
            { db_field: 'account_identifier', label: 'Email address', type: 'email', required: true },
        ],
    },
};

describe('Stage3', () => {
    beforeEach(() => {
        mockedUsePaymentProviders.mockReset();
    });

    it('shows a loading state while providers are being fetched', () => {
        mockedUsePaymentProviders.mockReturnValue({ providers: [], loading: true, error: null });
        render(<Stage3 onFinish={vi.fn()} />);
        expect(screen.getByText(/loading payment providers/i)).toBeTruthy();
    });

    it('shows an empty state when no providers are available', () => {
        mockedUsePaymentProviders.mockReturnValue({ providers: [], loading: false, error: null });
        render(<Stage3 onFinish={vi.fn()} />);
        expect(screen.getByText(/no payment methods are currently available/i)).toBeTruthy();
    });

    it('shows an error state when providers fail to load', () => {
        mockedUsePaymentProviders.mockReturnValue({ providers: [], loading: false, error: 'network error' });
        render(<Stage3 onFinish={vi.fn()} />);
        expect(screen.getByRole('alert')).toBeTruthy();
    });

    it('renders provider-specific fields after selecting a provider', () => {
        mockedUsePaymentProviders.mockReturnValue({ providers: [bankProvider], loading: false, error: null });
        render(<Stage3 onFinish={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: /select provider/i }));
        fireEvent.click(screen.getByRole('option', { name: 'IBAN Bank' }));

        expect(screen.getByLabelText(/IBAN/)).toBeTruthy();
        expect(screen.getByLabelText(/Account holder name/)).toBeTruthy();
    });

    it('clears field values when switching to a different provider', () => {
        mockedUsePaymentProviders.mockReturnValue({
            providers: [bankProvider, platformProvider],
            loading: false,
            error: null,
        });
        render(<Stage3 onFinish={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: /select provider/i }));
        fireEvent.click(screen.getByRole('option', { name: 'IBAN Bank' }));
        fireEvent.change(screen.getByLabelText(/IBAN/), { target: { value: 'CR1234' } });
        expect((screen.getByLabelText(/IBAN/) as HTMLInputElement).value).toBe('CR1234');

        fireEvent.click(screen.getByRole('button', { name: 'PLATFORM' }));
        fireEvent.click(screen.getByRole('button', { name: /select provider/i }));
        fireEvent.click(screen.getByRole('option', { name: 'PayPal' }));

        expect((screen.getByLabelText(/Email address/) as HTMLInputElement).value).toBe('');
    });

    it('shows a validation error for an invalid email and blocks submission', () => {
        const onFinish = vi.fn();
        mockedUsePaymentProviders.mockReturnValue({ providers: [platformProvider], loading: false, error: null });
        render(<Stage3 onFinish={onFinish} />);

        fireEvent.click(screen.getByRole('button', { name: 'PLATFORM' }));
        fireEvent.click(screen.getByRole('button', { name: /select provider/i }));
        fireEvent.click(screen.getByRole('option', { name: 'PayPal' }));

        fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: 'not-an-email' } });
        expect(screen.getByText(/enter a valid email address/i)).toBeTruthy();

        const submitButton = screen.getByRole('button', { name: /complete setup/i }) as HTMLButtonElement;
        expect(submitButton.disabled).toBe(true);
        expect(onFinish).not.toHaveBeenCalled();
    });

    it('submits trimmed values once the form is valid', () => {
        const onFinish = vi.fn();
        mockedUsePaymentProviders.mockReturnValue({ providers: [platformProvider], loading: false, error: null });
        render(<Stage3 onFinish={onFinish} />);

        fireEvent.click(screen.getByRole('button', { name: 'PLATFORM' }));
        fireEvent.click(screen.getByRole('button', { name: /select provider/i }));
        fireEvent.click(screen.getByRole('option', { name: 'PayPal' }));

        fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: '  user@example.com  ' } });

        const submitButton = screen.getByRole('button', { name: /complete setup/i }) as HTMLButtonElement;
        expect(submitButton.disabled).toBe(false);

        fireEvent.click(submitButton);
        expect(onFinish).toHaveBeenCalledWith(
            expect.objectContaining({
                providerId: 'platform-1',
                accountIdentifier: 'user@example.com',
            })
        );
    });

    it('disables the submit button and shows a saving label while submitting', () => {
        mockedUsePaymentProviders.mockReturnValue({ providers: [platformProvider], loading: false, error: null });
        render(<Stage3 onFinish={vi.fn()} isSubmitting />);

        fireEvent.click(screen.getByRole('button', { name: 'PLATFORM' }));
        fireEvent.click(screen.getByRole('button', { name: /select provider/i }));
        fireEvent.click(screen.getByRole('option', { name: 'PayPal' }));
        fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: 'user@example.com' } });

        const submitButton = screen.getByRole('button', { name: /saving/i }) as HTMLButtonElement;
        expect(submitButton.disabled).toBe(true);
    });

    it('renders a backend submission error', () => {
        mockedUsePaymentProviders.mockReturnValue({ providers: [platformProvider], loading: false, error: null });
        render(<Stage3 onFinish={vi.fn()} submitError="Duplicate payment method" />);

        expect(screen.getByText('Duplicate payment method')).toBeTruthy();
    });
});
