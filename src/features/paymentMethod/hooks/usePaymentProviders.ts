import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export interface PaymentProvider {
    provider_id: string;
    name: string;
    type: 'MOBILE' | 'PLATFORM' | 'BANK';
    country_code: string | null;
    metadata: {
        ui_requirements: Array<{
            db_field: string;
            label: string;
            type: string;
            placeholder?: string;
            required: boolean;
        }>;
    };
}

export function usePaymentProviders() {
    const { apiFetch } = useApi();

    const { data: providers = [], isLoading: loading, error } = useQuery<PaymentProvider[], Error>({
        queryKey: queryKeys.paymentMethods.providers,
        queryFn: () => apiFetch('/payment-providers')
    });

    return { providers, loading, error: error?.message || null };
}
