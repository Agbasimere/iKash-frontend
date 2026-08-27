import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export interface PaymentProviderFieldRequirement {
    db_field: string;
    label: string;
    type: string;
    placeholder?: string;
    required: boolean;
    /**
     * Optional regex (as a string) describing a valid value for this field,
     * e.g. a Costa Rican phone number or an IBAN. Backed by IKSH-12's
     * dependency, "Implement Payment Method Validation Engine" - until the
     * backend returns this, we fall back to generic type-based validation.
     */
    pattern?: string;
    /** Message shown when `pattern` fails to match. */
    errorMessage?: string;
}

export interface PaymentProvider {
    provider_id: string;
    name: string;
    type: 'MOBILE' | 'PLATFORM' | 'BANK';
    country_code: string | null;
    metadata: {
        ui_requirements: PaymentProviderFieldRequirement[];
    };
}

export function usePaymentProviders() {
    const { data: providers = [], isLoading: loading, error } = useQuery<PaymentProvider[], Error>({
        queryKey: queryKeys.paymentMethods.providers,
        queryFn: () => apiFetch<PaymentProvider[]>('/payment-providers')
    });

    return { providers, loading, error: error?.message || null };
}
