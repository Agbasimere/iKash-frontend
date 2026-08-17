import { useState, useEffect } from 'react';

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
    const [providers, setProviders] = useState<PaymentProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let ignore = false;

        const fetchProviders = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payment-providers`);
                if (!response.ok) throw new Error('Failed to fetch providers');
                const data = await response.json();
                if (!ignore) setProviders(data);
            } catch (err: unknown) {
                if (!ignore) setError(err instanceof Error ? err.message : String(err));
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchProviders();

        return () => {
            ignore = true;
        };
    }, []);

    return { providers, loading, error };
}
